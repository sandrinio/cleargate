---
proposal_id: PROP-008
status: Draft
author: AI Agent (cleargate planning)
approved: true
created_at: 2026-04-20T00:00:00Z
updated_at: 2026-04-20T00:00:00Z
codebase_version: post-SPRINT-05
depends_on:
  - PROP-003
  - PROP-007
related:
  - PROP-001
  - PROP-004
  - PROP-006
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-04-19T20:20:28Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
stamp_error: no ledger rows for work_item_id PROP-008
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-04-19T20:20:28Z
  sessions: []
---

# PROPOSAL-008: Project Config as MCP-Authoritative, UI-Editable, Pulled to Local

## 1. Initiative & Context

### 1.1 Objective

Make **project configuration** — the set of non-work-item settings that govern how a ClearGate project runs (participant roster, remote PM tool mapping, invite/gate/sync policies, feature flags, theme/brand metadata) — **authoritative on the MCP server**, **editable via the Admin UI**, and **synced down to every participant's local scaffold** as a read-only snapshot (`.cleargate/.project-config.json`). Local agents consult the snapshot for policy decisions; changes happen in the UI (or via an admin CLI), not by hand-editing local files.

### 1.2 The "Why"

- **Consolidate the config surface.** Today project config is scattered: the Admin API / MCP Postgres owns `projects`, `members`, `tokens`, `admin_users`; local files own protocol text, templates, theme, and ad-hoc policy in `CLAUDE.md`. Agents have no single place to ask "what are the rules for this project right now?"
- **Stakeholders are already in the Admin UI.** EPIC-006 ships a web UI (SPRINT-06) for project/member/token admin. Extending it to own the *rest* of shared config (gate policy, sync cadence, invite defaults, template overrides) costs little and keeps non-developer participants in one tool.
- **Agents need fresh policy without network calls.** Every triage / gate check / push would otherwise either call MCP or read stale local files. A versioned snapshot pulled at sync time gives local-speed reads with a known-age bound.
- **PROP-007 sync covers work items, not config.** PROP-007 defines how Proposals/Epics/Stories sync. It is silent on project-level settings. This proposal is the config-plane counterpart to PROP-007's work-item plane.
- **Multi-participant coherence.** If Developer A and Developer B have diverged local policies (one has strict gates, the other doesn't), gate decisions are inconsistent. A single MCP-authoritative config collapses that to one truth.

### 1.3 Non-Goals

- **Not moving work items to MCP.** Proposals, Epics, Stories, Bugs, CRs stay git-authoritative per PROP-007. This proposal is strictly about *config*.
- **Not moving the protocol / templates / knowledge base to MCP.** `.cleargate/knowledge/cleargate-protocol.md`, `templates/`, and `FLASHCARD.md` stay local and git-versioned. They are engineering artifacts, not per-project config.
- **Not replacing `CLAUDE.md`.** The injection spec stays in the repo. Config values that need to reach the model may be interpolated into `CLAUDE.md` at render time, but the file itself is not moved.
- **Not real-time.** Same eventual-consistency stance as PROP-007. Snapshot pulled on demand + SessionStart.
- **Not a secret store.** Tokens remain in `admin_users.token_hash` / `tokens` (server-side only). Pulled snapshot contains no secrets.

### 1.4 Scope: What Counts as "Project Config"

| Category | Today's home | Proposed authority |
|---|---|---|
| Participant roster (emails, roles) | MCP Postgres `members` | **MCP (no change)** |
| Admin users | MCP Postgres `admin_users` | **MCP (no change)** |
| Remote PM tool mapping (Linear team ID, Jira project key, default issue type per work-item type) | *not stored* | **MCP (new)** |
| Gate policy (which readiness gates enforced, per-type overrides) | hardcoded in CLI | **MCP (new)** — per-project override of defaults |
| Sync cadence policy (auto-pull on SessionStart yes/no; staleness threshold) | hardcoded in protocol §13 | **MCP (new)** |
| Invite policy (expiry hours, role restrictions) | hardcoded in admin CLI | **MCP (new)** |
| Theme / brand metadata (project display name, color, logo URL) | *not stored* | **MCP (new)** |
| Feature flags (enable wiki-ingest, enable ledger hook, enable gate enforcement) | per-repo `.claude/settings.json` | **MCP (new)** — shared defaults; local override allowed |
| Protocol text | `.cleargate/knowledge/cleargate-protocol.md` | **Local (no change)** |
| Templates | `.cleargate/templates/*.md` | **Local (no change)** |
| FLASHCARD.md | local file | **Local (no change)** — per PROP-007 Q5 |
| Work items | `.cleargate/delivery/**` | **Local, synced by PROP-007** |

The dividing line: **config = who/where/how-strict for this project**. Engineering artifacts (templates, protocol, knowledge) stay local because they are versioned code, not tunable settings.

---

## 2. Technical Architecture & Constraints

### 2.1 Dependencies

- **PROP-003** (hard) — extends the existing MCP adapter and Admin API surface.
- **PROP-007** (hard) — reuses the identity/sync-log/SessionStart-pull machinery introduced in EPIC-010. No point building a second pull pipeline.
- **PROP-004** (soft) — public discoverability already exposes project display metadata; this proposal formalizes the storage.
- **PROP-001** (soft) — frontmatter metadata lifecycle patterns (stamping, versioning) are reused for the config snapshot file.

### 2.2 Data Model (MCP)

New Postgres tables (Drizzle migrations):

```sql
-- One row per project; supersedes hardcoded defaults.
CREATE TABLE project_config (
  project_id UUID PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
  remote_mapping JSONB NOT NULL DEFAULT '{}'::jsonb,     -- { "tool": "linear", "team_id": "...", "type_map": { "story": "Feature", ... } }
  gate_policy JSONB NOT NULL DEFAULT '{}'::jsonb,        -- { "proposal": ["gate-1"], "story": ["gate-2","granularity"] }
  sync_policy JSONB NOT NULL DEFAULT '{}'::jsonb,        -- { "session_start_pull": true, "stale_after_minutes": 60 }
  invite_policy JSONB NOT NULL DEFAULT '{}'::jsonb,      -- { "expiry_hours": 72, "default_role": "member" }
  brand JSONB NOT NULL DEFAULT '{}'::jsonb,              -- { "display_name": "...", "color": "#...", "logo_url": "..." }
  feature_flags JSONB NOT NULL DEFAULT '{}'::jsonb,      -- { "wiki_ingest": true, "ledger_hook": true, "gate_enforcement": true }
  version INTEGER NOT NULL DEFAULT 1,                    -- monotonic; bumped on every UPDATE
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by TEXT                                        -- admin_user email
);

-- Audit trail; append-only.
CREATE TABLE project_config_audit (
  id BIGSERIAL PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  patch JSONB NOT NULL,      -- JSON-patch of what changed
  actor TEXT NOT NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

Flat JSONB columns (not a normalized per-setting table) because (a) config is read-mostly, (b) the UI edits one domain at a time, (c) schema-migrated validation happens in the Admin API layer via Zod, not Postgres.

### 2.3 MCP / Admin API Endpoints

| Endpoint | Method | Purpose |
|---|---|---|
| `/admin-api/v1/projects/:id/config` | GET | Return current config (all categories). Admin auth required. |
| `/admin-api/v1/projects/:id/config` | PATCH | Update one or more categories; bumps `version`; appends to audit. Admin auth required. |
| `/admin-api/v1/projects/:id/config/audit` | GET | Paginated audit trail. Admin auth. |
| `cleargate_pull_project_config` (MCP tool) | — | Member-auth pull; returns `{ version, config, fetched_at }`. |
| `cleargate_get_config_version` (MCP tool) | — | Cheap poll; returns `{ version, updated_at }` only. Used by SessionStart. |

Read side is member-scoped (any project member can pull config). Write side is admin-scoped (only admins can PATCH — UI gates on admin JWT, same pattern as EPIC-004).

### 2.4 Local Snapshot File

Path: `.cleargate/.project-config.json` (gitignored — per-participant snapshot, not shared via git).

Shape:

```json
{
  "version": 42,
  "fetched_at": "2026-04-20T12:00:00Z",
  "project_id": "01JH...",
  "remote_mapping": { "tool": "linear", "team_id": "...", "type_map": {"story": "Feature"} },
  "gate_policy":    { "story": ["gate-2", "granularity"] },
  "sync_policy":    { "session_start_pull": true, "stale_after_minutes": 60 },
  "invite_policy":  { "expiry_hours": 72, "default_role": "member" },
  "brand":          { "display_name": "ClearGate Dogfood", "color": "#E85C2F" },
  "feature_flags":  { "wiki_ingest": true, "ledger_hook": true, "gate_enforcement": true }
}
```

Read API: new `cleargate-cli/src/lib/project-config.ts` exports `readConfig(): Config` (synchronous JSON read, cached in-process).

Staleness: if `Date.now() - fetched_at > sync_policy.stale_after_minutes`, callers get a warning log line but the read still returns the cached value. Agents decide whether to proceed or suggest `cleargate config pull`.

### 2.5 CLI Surface

| Command | Purpose |
|---|---|
| `cleargate config pull` | Fetch current config from MCP; write snapshot; print diff vs previous. |
| `cleargate config show [--path <dotted>]` | Print current snapshot (or a subpath); offline. |
| `cleargate config version` | Print `{version, fetched_at}`; cheap poll against MCP if `--remote` given. |
| `cleargate config diff` | Show local snapshot vs remote head (dry-run of `pull`). |

Write commands intentionally absent — UI and Admin API own writes. CLI never mutates project config.

### 2.6 Admin UI Impact (EPIC-006 extension)

Adds a single **Settings → Project** sub-page (distinct from the existing `admin_users` settings page) with one section per category:

- Remote Mapping (tool picker + IDs)
- Gate Policy (checkbox matrix: gate × work-item type)
- Sync Policy (toggles + number inputs)
- Invite Policy (number inputs + role picker)
- Brand (name + color picker + logo URL)
- Feature Flags (toggle list)

Each section has its own Save button → PATCH that category only. Version + last-updated-by shown at the top. Audit trail linked from the page header.

### 2.7 Local Override Semantics

Feature flags and sync policy may be **overridden locally** via `.cleargate/config.local.json` (gitignored). Priority: `local override > pulled snapshot > hardcoded default`. Use cases: developer disables `ledger_hook` on a laptop to avoid noise; CI sets `gate_enforcement: true` regardless of project default. Remote-authoritative categories (roster, admin_users, invite_policy) have **no local override path** — those are privileged.

Override resolution happens in `project-config.ts`'s `readConfig()`. Overrides are logged to `sync-log.jsonl` on first read so audits can detect "developer bypassed gate X locally."

### 2.8 Conflict / Concurrency Model

The UI uses **optimistic concurrency**: PATCH includes the `version` the editor started from. If server version has advanced, PATCH returns 409 with current state; UI merges or prompts. CLI pulls are always read-only — no conflict path.

### 2.9 System Constraints

| Constraint | Detail |
|---|---|
| Consistency | Eventual. Snapshot staleness bounded by `sync_policy.stale_after_minutes` (default 60). |
| Security | Admin JWT required for PATCH. Member JWT sufficient for GET (config is not secret — roster names and gate rules are internal but not sensitive). Tokens never stored in config. |
| Privacy | Audit rows include actor email. No PII beyond that. |
| Availability | On MCP outage, local snapshot serves stale config; agents warn but continue. No auto-retry loops. |
| Backwards compat | Pre-existing projects get a row inserted with defaults on first GET (lazy backfill). No breaking migration. |
| Size | Config JSONB capped at 64 KB per project (sanity). Larger items (logos) stored by URL reference, not embedded. |
| Secrets | Anything secret-flavored (API keys, webhook secrets) stays in the existing `tokens`/env-var layer. If future work needs per-project secrets, use a separate `project_secrets` table with admin-only GET. |

### 2.10 Relationship to PROP-007

PROP-007 and PROP-008 share the pull machinery (identity, sync-log, SessionStart hook) but handle different data shapes:

| Aspect | PROP-007 (work items) | PROP-008 (config) |
|---|---|---|
| Storage | Markdown in git | JSONB in Postgres |
| Authority | Local (content) + Remote (status) | Remote always |
| Edit path | Markdown edit → push | UI / Admin API PATCH |
| Local file | One per item in `delivery/**` | Single `.project-config.json` (gitignored) |
| Conflict model | Three-way merge on content | Optimistic concurrency on version |
| Write from CLI | Yes (`cleargate push`) | No (read-only CLI) |

The shared infrastructure is: identity (`CLEARGATE_USER` / `git config` / `.participant.json`), sync-log, SessionStart hook (which adds a config-version check alongside the work-item staleness check).

---

## 3. Scope Impact (Touched Files & Data)

### 3.1 Known Files — must be modified

**MCP server:**
- `mcp/src/db/migrations/<N>_project_config.sql` — new tables.
- `mcp/src/db/schema.ts` — Drizzle table definitions.
- `mcp/src/endpoints/admin/project-config.ts` — GET / PATCH handlers.
- `mcp/src/endpoints/admin/project-config-audit.ts` — audit GET.
- `mcp/src/mcp-tools/pull-project-config.ts` — new MCP tool.
- `mcp/src/mcp-tools/get-config-version.ts` — new MCP tool.
- `mcp/src/lib/config-schema.ts` — Zod schemas for each category.
- `mcp/test/fixtures/project-config/*.json` — golden configs for tests.

**CLI:**
- `cleargate-cli/src/commands/config.ts` — new (`pull`, `show`, `version`, `diff`).
- `cleargate-cli/src/lib/project-config.ts` — read + override + staleness helpers.
- `cleargate-cli/src/lib/identity.ts` — reused from EPIC-010.

**Admin UI:**
- `admin/src/routes/projects/[id]/settings/+page.svelte` — new Settings → Project page.
- `admin/src/lib/api/project-config.ts` — client wrappers for GET/PATCH.

**Protocol:**
- `.cleargate/knowledge/cleargate-protocol.md` — add §14 "Project Config" describing the authority model, override rules, and snapshot semantics.

**Hook:**
- `.claude/hooks/session-start.sh` — extend with `cleargate config version --remote` staleness check; print suggestion if `version` diverges.

**CLAUDE.md injection:**
- `cleargate-planning/CLAUDE.md` — add a single line pointing at `.cleargate/.project-config.json` as the project-policy source for agents.

### 3.2 Expected New Entities

- `.cleargate/.project-config.json` — gitignored per-participant snapshot.
- `.cleargate/config.local.json` — gitignored local overrides.
- MCP tables: `project_config`, `project_config_audit`.
- Admin UI route: `/projects/:id/settings` (project-scoped settings distinct from existing root `admin_users` settings).

### 3.3 Migration Plan

1. Ship tables + PATCH + GET endpoints behind a feature flag (`project_config_v1`). Defaults seeded lazily.
2. Ship CLI `config pull` + `show` + `version`. Agents pick up snapshot file if present; fall back to hardcoded defaults otherwise.
3. Ship Admin UI Settings page. Dogfood on the ClearGate meta-repo project first.
4. Flip `gate_enforcement` / `sync_policy` / etc. from hardcoded to config-driven across CLI + hooks (one category per story).

---

## 4. AI Interrogation Loop (Human Input Required)

*(The AI's open questions on this Proposal. The Proposal stays at Draft until all are answered.)*

1. **Q — Sequencing vs PROP-007.** PROP-007 (EPIC-010) is queued as SPRINT-07, ahead of SPRINT-06 (Admin UI). Does PROP-008 go (a) in SPRINT-07 alongside EPIC-010, (b) in SPRINT-06 alongside Admin UI (since the UI is its editor), or (c) in its own sprint after both? Recommendation: **(b) SPRINT-06, scoped to the Admin UI sprint**, *if* EPIC-010 identity/sync-log machinery from SPRINT-07 can be landed first. If not, push to SPRINT-08. The UI is the write path; shipping config-PATCH without the UI means admin-only JSON editing, which defeats the point.
   - **Human Answer:** _____

2. **Q — Single `project_config` row or per-category rows?** Proposed flat-JSONB single-row approach. Alternative: one row per category (`project_config_entries(project_id, category, json)`). Single-row is simpler to read and patch; per-category scales better if categories grow beyond ~10 and need independent versioning. Recommendation: **single-row for v1**; split if category count crosses ~8 or if independent version bumps become useful.
   - **Human Answer:** _____

3. **Q — Local override scope.** §2.7 proposes overrides for feature flags + sync policy only; roster/admin/invite/gate are remote-only. Alternative: allow local override of gate policy too (so a developer can tighten gates on their own machine). Recommendation: **allow local gate-policy tightening (strict only), never loosening.** Rationale: "stricter than team default" is a legitimate personal workflow; "looser" undermines the gate's purpose. Implementation: resolver rejects override sets that reduce the gate set.
   - **Human Answer:** _____

4. **Q — Feature-flag granularity.** Proposed flags: `wiki_ingest`, `ledger_hook`, `gate_enforcement`. Risk: as features multiply, the flag list becomes a dumping ground. Alternative: no feature flags in v1; hardcoded behavior. Recommendation: **ship the three flags above; add via PATCH-only for subsequent features.** Flags gated on a naming convention (`<feature>_enabled`) so enumeration in UI stays mechanical.
   - **Human Answer:** _____

5. **Q — Snapshot file: gitignored or git-tracked?** Proposed gitignored (per-participant, fetched_at differs per machine). Alternative: git-tracked under a canonical path so agents on fresh clones have a config without running `pull`. Recommendation: **gitignored**, with `cleargate init` running `config pull` as part of bootstrap. Reason: tracked files drift between participants and produce merge-conflict noise on every sync (same failure mode PROP-007 calls out for dynamic frontmatter).
   - **Human Answer:** _____

6. **Q — What happens offline / on MCP outage?** §2.9 says "agents warn but continue" with stale snapshot. Alternative: hard-fail on staleness > N hours. Recommendation: **warn + continue**. ClearGate must degrade gracefully offline; the cost of hard-failing config reads is that the whole local workflow halts on every MCP blip.
   - **Human Answer:** _____

7. **Q — Audit retention.** `project_config_audit` grows forever. Retention: (a) keep forever, (b) 1-year TTL, (c) 90-day TTL with monthly snapshots. Recommendation: **(a) keep forever for v1**; revisit once row count crosses ~100k per project. Config changes are infrequent (hundreds per year, not millions), so growth is manageable.
   - **Human Answer:** _____

8. **Q — Zod schema migrations.** As config categories gain fields over time, older snapshots on old machines become stale-shape. Plan: (a) every PATCH validates against latest schema, older snapshots tolerated by agents (extra/missing fields → defaults); (b) strict validation with a migrate step on read. Recommendation: **(a) lenient read, strict write**. Matches the rest of ClearGate (frontmatter is lenient on read per PROP-001).
   - **Human Answer:** _____

9. **Q — Brand / display metadata scope.** §1.4 includes `brand` (display name, color, logo). Does this overlap with PROP-004 (public discoverability) which already exposes display metadata for the public server? Recommendation: **PROP-004 metadata becomes a read-through of `project_config.brand`** so there's one source of truth. Backfill PROP-004's existing storage into `project_config.brand` on migration.
   - **Human Answer:** _____

10. **Q — Sprint placement / decomposition deferral.** Same wait-and-observe question as PROP-007 Q10: should this decompose now into an EPIC, or sit as an answered-but-undecomposed architecture document until real Admin UI usage surfaces the actual pain? Recommendation: **decompose only after EPIC-006 (Admin UI) ships and EPIC-010 (MCP sync) lands**, so we can scope PROP-008's stories against the real editor + pull pipeline rather than speculation. Target: 2026-Q3 reassessment.
   - **Human Answer:** _____

---

## Approval Gate

(Vibe Coder: Review this proposal. It defines the config-plane counterpart to PROP-007's work-item-plane. Confirm scope against §1.4 — especially the **stays local** column — before approving. If the architecture is correct, answer the questions in §4 and set `approved: true` in the YAML frontmatter. Only then is the AI authorized to decompose into Epics/Stories.)
