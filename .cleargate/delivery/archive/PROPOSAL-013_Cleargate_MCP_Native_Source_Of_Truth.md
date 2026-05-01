---
proposal_id: PROP-013
status: Approved
author: Claude (Opus 4.7) + sandrinio
approved: true
approved_at: 2026-04-28T00:00:00Z
approved_by: sandrinio
created_at: 2026-04-28T00:00:00Z
updated_at: 2026-04-28T00:00:00Z
created_at_version: cleargate@0.8.2
updated_at_version: cleargate@0.8.2
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-04-28T12:59:43Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
context_source: |
  Surfaced 2026-04-28 by user during Hakathon clean-folder onboarding test
  follow-up. Sync (`cleargate_detect_new_items`) refused to run with
  "no PM adapter wired" — but the user's mental model is that ClearGate MCP
  itself IS the destination. There is no Linear / Jira / GitHub-Projects in
  the loop on the CLI side. Forwarding to external PM tools is an admin-panel
  concern (separate, not yet implemented). User also wants sprint plans,
  sprint reports, and the wiki to ride the same sync path so a stakeholder
  with admin-panel access can see the full project state without git access.
stamp_error: no ledger rows for work_item_id PROP-013
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-04-28T12:59:43Z
  sessions: []
sprint_cleargate_id: "SPRINT-001"
---

# PROPOSAL-013: ClearGate MCP as the native source of truth (sync everything that matters)

## 1. Initiative & Context

### 1.1 Objective

Treat the ClearGate MCP server as the **native source of truth** for a project's planning state — work items, sprint plans, sprint reports, and the compiled wiki — and ship a single `cleargate sync` command that the CLI uses to keep the local repo and the MCP server in lockstep. External PM forwarding (Linear / Jira / GitHub-Projects) is no longer the CLI's concern; it becomes an admin-panel feature on top of the MCP DB.

### 1.2 The "Why"

The current MCP server was designed as a **router to external PM tools**. Its `PmAdapter` interface, the `noop "no-adapter-configured"` stub, and the pre-flight error in the CLI sync driver all assume the destination is somewhere else. Reality during the SPRINT-001 (Hakathon) onboarding test: a clean-folder user who has never wired Linear or Jira can push items (it works — items land in MCP's own Postgres), but cannot detect updates, list remote changes, or pull items, because every read path routes through the noop adapter.

Two distinct products were tangled into one:

- **ClearGate-as-router** (router from local files to external PM tool — adapter required).
- **ClearGate-as-backlog** (MCP DB IS the backlog; admin panel reads it; no external PM in the loop).

The user's stated vision (project memory `project_vision.md`, sales pitch flashcard, full SDLC bridge) is the second one. This proposal removes the router framing from the CLI surface and ships the four artifact types the user actually plans against:

- **Work items** — Proposals, Epics, Stories, CRs, Bugs, Hotfixes.
- **Sprint plans** — `delivery/{pending-sync,archive}/SPRINT-NNN_*.md`.
- **Sprint reports** — `sprint-runs/<id>/REPORT.md` (write-once at sprint close).
- **Wiki** — server-side **recompute** from work-items + sprints + reports; no push.

### 1.3 What it ships

A single user-facing command:

```
cleargate sync   # walks the four artifact types, pushes/pulls only what's changed
```

Plus four EPICs of supporting work, sequenced. See §2.5.

### 1.4 What it does NOT ship

- External PM forwarding (Linear / Jira / GitHub-Projects). The `PmAdapter` interface stays in the codebase for the admin-panel program; CLI no longer goes through it.
- Real-time push (every-keystroke). Sync remains explicit / batch.
- Wiki edits. Wiki is **derived**, server recomputes on each push event; clients never write the wiki.
- Per-page wiki conflict resolution (irrelevant since wiki is derived).
- **Status-gated push.** Pushing requires no status (Drafts sync). Approval still matters — but it moves into the admin-panel layer where "forward this to external PM" lives, and into the orchestrator's sprint-plan rules where "include this in the sprint" lives. CLI's `sync` is intentionally agnostic.

## 2. Technical Architecture & Constraints

### 2.1 Architectural decisions (locked by user 2026-04-28)

1. **Wiki is server-recomputed, not synced.** MCP rebuilds the wiki from its own DB after each work-item / sprint-plan / sprint-report push. Local `cleargate wiki build` stays as an offline-readable cache; it is never the source of truth, never pushed.
2. **Sprint reports follow the work-item pattern**: Reporter writes `REPORT.md` locally first; `close_sprint` fires a `cleargate_push_sprint_report` MCP call as the final step. Atomic mirror, not direct write.
3. **One unified `cleargate sync`**: walks all four artifact types, computes per-artifact deltas vs MCP (sha256 of body, frontmatter `pushed_at` vs `last_remote_update`), pushes only what's changed, pulls anything new. `--scope work-items|sprints|reports|all` (default `all`) for fine control.
4. **Sync is status-blind for work items.** `cleargate sync` pushes Drafts, In-Review, Triaged, Approved, Done, Verified, Abandoned — every status, every type. Rationale: drafts and unapproved items ARE the in-progress thinking; they belong in the source of truth so an admin-panel viewer sees the project as it actually is. The `approved: true` gate moves up the stack: it gates *external-PM forwarding* (admin-panel's job, not CLI's) and it gates *sprint inclusion* (orchestrator's job at sprint plan time). It is no longer a gate on persistence to MCP.

### 2.2 Per-artifact sync semantics

| artifact | direction | status filter | conflict | when | where it lives on server |
|---|---|---|---|---|---|
| Work items | bidirectional | **none — every status syncs** (Draft, In-Review, Triaged, Approved, Done, Verified, Abandoned) | per-item, EPIC-010 detector | on `cleargate sync` and on `push_item` | `items` table |
| Sprint plans | bidirectional | none | rare; orchestrator owns; last-writer-wins for now | on `cleargate sync` | new `sprint_plans` table |
| Sprint reports | push-only (immutable post-close) | n/a | none | on `close_sprint` | new `sprint_reports` table |
| Wiki | server-recompute | n/a | none | server-side, triggered by any push | new `wiki_pages` table |

**What "sync everything" means on the wire — two dimensions:**

1. **Across artifact types.** `cleargate sync` (no flags) walks all four. `--scope work-items|sprints|reports|all` narrows. Wiki is never on the CLI wire — server recomputes locally to itself.
2. **Within a type — only changed artifacts ship; per-artifact, the FULL body ships (not a diff).** Each local file's body `sha256` is compared against frontmatter `last_synced_body_sha`. Match → skip. Mismatch (edited / new) → the **entire markdown body** goes over the wire as the request body. No prose-patch math. Rationale: markdown artifacts are small (≤50 KB typical), full-body push is idempotent, and conflict resolution is simpler when both sides have whole versions to compare. This mirrors today's `cleargate_push_item` semantics; the proposal generalises it across the other three artifact types.

| local state vs. server | what sync does |
|---|---|
| local body sha matches `last_synced_body_sha` | skipped |
| local body sha differs (edited) | full body pushed |
| local file present, no `last_synced_body_sha` (new) | full body pushed |
| server has newer `last_remote_update` than local `last_synced_at` | full body pulled (conflict-detector arbitrates if local also dirty) |
| local file deleted, server has it | tombstone push (sets `status: "Abandoned"` on server unless overridden) — defer to EPIC-024 spec |

### 2.3 The CLI ↔ MCP boundary

Removed from the CLI's sync surface:

- `cleargate_adapter_info` — no longer queried by sync (adapter info is admin-panel's concern).
- The pre-flight "no adapter wired" error — gone for the four artifact types above.
- `PmAdapter` interface (kept in `mcp/src/adapters/` for admin-panel future work, but the CLI sync driver never touches it).

Added to the CLI ↔ MCP surface:

| MCP tool | replaces | purpose |
|---|---|---|
| `cleargate_detect_new_items` (rewritten) | adapter-routed version | reads items table directly, returns delta-since-last-pull |
| `cleargate_pull_item` (rewritten) | adapter-routed version | reads items table directly |
| `cleargate_list_remote_updates` (rewritten) | adapter-routed version | reads items table directly |
| `cleargate_push_sprint_plan` | new | push sprint-plan markdown |
| `cleargate_pull_sprint_plan` | new | pull a sprint plan by sprint_id |
| `cleargate_push_sprint_report` | new | push a finalized sprint report |
| (none) | n/a | wiki — server-internal recompute, no client tool |

### 2.4 Wiki recompute pipeline

After ANY of {`push_item`, `push_sprint_plan`, `push_sprint_report`}:

1. MCP server enqueues a `wiki_recompute` job (Redis queue; existing infra).
2. Worker reads the items + sprint_plans + sprint_reports tables for the project.
3. Worker runs the same wiki-build logic the CLI runs (port `cleargate-cli/src/lib/wiki/*` to `mcp/src/wiki/`).
4. Worker writes wiki pages to `wiki_pages` table.
5. Admin panel reads `wiki_pages` directly. CLI never reads server wiki — it has its own local copy.

Wiki-build logic is currently in TypeScript in cleargate-cli. Porting to mcp/ is a copy with import-path shifts; no algorithmic change. Both sides keep the same output shape.

### 2.5 EPIC decomposition

The umbrella decomposes into four EPICs, sequenced. Each gets its own proposal-to-epic decomposition before SPRINT-15 kickoff (or whichever sprint runs them).

| # | EPIC | Stories | Order |
|---|---|---|---|
| 1 | **EPIC-023: Drop adapter from CLI sync paths** | rewrite `cleargate_detect_new_items` / `pull_item` / `list_remote_updates` to query items table directly; remove adapter pre-flight error from CLI sync driver | First — unblocks current pain |
| 2 | **EPIC-024: Sprint plan + report sync** | new `sprint_plans` + `sprint_reports` tables; new MCP tools; CLI wiring; `close_sprint` push hook | Second |
| 3 | **EPIC-025: Wiki recompute on the server** | port wiki-build into mcp/; `wiki_recompute` worker; `wiki_pages` table; remove "must run `wiki build` locally" instruction from CLAUDE.md | Third |
| 4 | **EPIC-026: Unified `cleargate sync`** | one command, walks all four artifact types, `--scope` flag, replaces the current fragmented `push` / `pull` subcommands (or wraps them) | Last — depends on 023 + 024 |

Estimated: 11 stories total, ~2 sprints of work.

### 2.6 Migration / backwards compatibility

- **CLI-MCP wire**: protocol-version field in MCP responses lets a 0.x CLI talk to an updated MCP. No flag-day cutover.
- **Existing items table**: no schema change for work items in EPIC-023; only the read paths are rewritten (adapter→DB). Push path already writes there.
- **PmAdapter interface**: stays in `mcp/src/adapters/` for the admin-panel program. Marked `@deprecated_for_cli_use` in JSDoc; admin-panel code-path eventually consumes it.
- **The `noop "no-adapter-configured"` stub**: stays in place for any code that still wants a stub adapter; the CLI just stops reaching for it.

### 2.7 Risks (top 5)

| # | Risk | Mitigation |
|---|---|---|
| R-1 | Server-side wiki recompute drifts from CLI-side `cleargate wiki build` | Single shared logic in a published package consumed by both, OR golden-file test that both implementations produce byte-identical pages on the same fixture. |
| R-2 | `sprint_plans` table grows unbounded over project lifetime | Same retention as items table. Sprint plans are small markdown blobs (≤50 KB typical). Defer pruning to admin-panel. |
| R-3 | Two sources of truth for wiki (server DB + local file) drift visibly | Local wiki gets a `# generated locally; admin-panel may show different content` banner if `last_synced_at` is stale. Or: stop generating local wiki at all, run `wiki query` against MCP. Decide in EPIC-025. |
| R-4 | Sprint plan conflict if two orchestrators edit | First version: last-writer-wins, log to a conflicts table. EPIC-024 §X scopes a proper resolver if it bites in practice. |
| R-5 | Wiki recompute job stalls under heavy push traffic | Redis queue + idempotent recompute (no harm in re-running). Workers horizontal-scale. SLA: wiki up-to-date within 60s of last push. |
| R-6 | Status-blind sync surfaces half-baked Drafts to stakeholders | Admin panel filters by status at read time. Default view excludes Draft / Abandoned unless toggled. CLI sync stays unconditional; the gate moves to the read surface, not the write surface. Document this contract clearly in CLAUDE.md so contributors know "saving a draft = visible to admin-panel by default" and isn't a surprise. |

### 2.8 Out of scope

- External PM forwarding (Linear/Jira/GitHub-Projects) — admin-panel concern.
- Real-time push (web-socket / SSE).
- Wiki search / full-text indexing — server has the data, but query surface is admin-panel's.
- Per-user RBAC on sprint plans / reports — assume project-wide access for now; tightening is admin-panel's problem.

## 3. Touched Files

### Server (mcp/)

- `mcp/src/tools/cleargate-detect-new-items.ts` — rewrite to query `items` table directly (drop `adapter` injection).
- `mcp/src/tools/cleargate-pull-item.ts` — same.
- `mcp/src/tools/cleargate-list-remote-updates.ts` — same.
- `mcp/src/tools/cleargate-push-sprint-plan.ts` — **new**.
- `mcp/src/tools/cleargate-pull-sprint-plan.ts` — **new**.
- `mcp/src/tools/cleargate-push-sprint-report.ts` — **new**.
- `mcp/src/db/schema/sprint_plans.ts` — **new** (Drizzle schema).
- `mcp/src/db/schema/sprint_reports.ts` — **new**.
- `mcp/src/db/schema/wiki_pages.ts` — **new**.
- `mcp/src/wiki/build.ts` — **new** (port from cleargate-cli).
- `mcp/src/wiki/recompute-worker.ts` — **new** (Redis queue consumer).
- `mcp/src/mcp/register-tools.ts` — register the new tools.
- `mcp/migrations/NNNN_sprint_plans.sql` — **new** (+ companions for sprint_reports, wiki_pages).

### Client (cleargate-cli/)

- `cleargate-cli/src/commands/sync.ts` — **new** (the unified entry point).
- `cleargate-cli/src/commands/sprint.ts` — `close_sprint` fires `cleargate_push_sprint_report`.
- `cleargate-cli/src/lib/sync/{work-items,sprints,reports}.ts` — **new** (per-scope drivers behind one orchestrator).
- `cleargate-cli/src/cli.ts` — wire `cleargate sync [--scope ...]`.
- `cleargate-planning/CLAUDE.md` — update §Sync section: remove "wire an adapter" mention; document the new sync model.
- `cleargate-cli/test/commands/sync.test.ts` — **new**.
- `cleargate-cli/test/lib/sync/*.test.ts` — **new** per scope.

### Documentation / protocol

- `.cleargate/knowledge/cleargate-enforcement.md` — add §12 "Sync model: native MCP, no external PM in CLI loop".
- `.cleargate/FLASHCARD.md` — file lessons from each EPIC's QA bounces here when they happen.

---

**Halt at Gate 1.** This proposal is `approved: false`. Manual approval (flip to `true`) required before drafting EPIC-023 / EPIC-024 / EPIC-025 / EPIC-026.
