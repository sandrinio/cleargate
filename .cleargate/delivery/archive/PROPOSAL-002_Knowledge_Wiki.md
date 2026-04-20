---
proposal_id: PROP-002
status: Approved
author: AI Agent (cleargate planning)
approved: true
approved_at: 2026-04-17T00:00:00Z
approved_by: Vibe Coder (ssuladze@exadel.com)
created_at: 2026-04-17T00:00:00Z
updated_at: 2026-04-18T00:00:00Z
codebase_version: strategy-phase-pre-init
depends_on:
  - PROP-001
pushed_by: sandrinio@github.local
pushed_at: 2026-04-20T19:43:10.500Z
push_version: 3
---

# PROPOSAL-002: Work Item Awareness via Karpathy-Style LLM Wiki

## 1. Initiative & Context

### 1.1 Objective
Add a compiled `.cleargate/wiki/` layer that Claude Code reads first at every triage, so the agent stays aware of project state across sessions without re-scanning the raw filesystem. The wiki covers four planes — **work items, sprints, product state, roadmap** — and is derived from raw state (`delivery/`, `plans/`) and maintained automatically by dedicated subagents following the Karpathy LLM-Wiki pattern. Scope expanded 2026-04-18 from work-items-only to the full four-plane view (see §4 Q6 amendment).

### 1.2 The "Why"

- **No more duplicate proposals.** Claude sees `[[PROPOSAL-stripe-webhooks]] → LIN-987, archived` on read — tells the Vibe Coder "this shipped last month, are you extending it?" instead of drafting a conflicting duplicate.
- **Cross-session continuity.** Today, every new session starts blind to prior work. With the wiki's `index.md`, any session starts with full situational awareness in ~3k tokens.
- **Explicit blast-radius tracking.** When a CR invalidates Epics/Stories, the wiki captures the edge (`[[CR-007]] → invalidates [[EPIC-035]]`), so the invalidation is visible to future triage decisions — not buried inside a CR document.
- **Gate enforcement.** Lint pass before Gate 1 (Proposal approval) and Gate 3 (Push) refuses transitions when wiki drift is detected — enforces that the compiled view stays consistent with raw state.
- **Token economy.** Instead of grepping `delivery/` + `archive/` + `plans/` at triage, Claude reads one `index.md` (~1-3k tokens depending on project size).

### 1.3 Pattern Source
Based on Andrej Karpathy's "LLM Wiki" pattern ([gist](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f)): three-layer architecture (raw → wiki → schema) with three operations (ingest / query / lint). Plain markdown, no vector DB, no RAG pipeline, no external service.

---

## 2. Technical Architecture & Constraints

### 2.1 Directory Layout

```
.cleargate/
├── knowledge/                      # protocol (unchanged, not in wiki)
├── templates/                      # blueprints (unchanged, not in wiki)
├── delivery/
│   ├── pending-sync/               # raw: hot drafts
│   └── archive/                    # raw: shipped items w/ remote IDs
├── plans/                          # raw: pulled PM context
└── wiki/                           # 🆕 compiled awareness layer (four planes)
    ├── index.md                    # primary: read at every triage
    ├── log.md                      # append-only YAML event log
    │
    ├── # Plane 1 — work items
    ├── initiatives/                # one page per pulled initiative
    ├── epics/                      # one page per epic (parent/child backlinks)
    ├── stories/                    # one page per story
    ├── bugs/                       # one page per bug
    ├── proposals/                  # one page per proposal
    ├── crs/                        # one page per CR (tracks invalidation edges)
    │
    ├── # Plane 2 — sprints
    ├── sprints/                    # one page per sprint (DoD status + story list + progress %)
    │
    ├── # Plane 3 — product state & roadmap (synthesis)
    ├── product-state.md            # shipped ✓ / in-flight 🟡 / planned ⬜
    ├── roadmap.md                  # upcoming sprints + their epic/story composition
    ├── active-sprint.md            # current sprint status + open gates + next story
    ├── open-gates.md               # items blocking on human action
    │
    └── # Plane 4 — topics (Karpathy compounding loop)
        topics/                     # filed-back synthesis from `wiki query --persist`
```

### 2.2 Subagents

| Subagent | Model | Trigger | Responsibility |
|---|---|---|---|
| `cleargate-wiki-ingest` | Haiku | PostToolUse hook on Write/Edit in `delivery/**`, `plans/**` | Update affected per-item page, append one `log.md` entry, refresh `index.md`, recompile affected synthesis pages (`product-state.md` / `roadmap.md` / `active-sprint.md` / `open-gates.md`) |
| `cleargate-wiki-query` | Haiku | Auto-invoked at triage (read-only). Also invoked on user request with `--persist` flag to file synthesis back | Read-only mode: read `wiki/index.md` + relevant pages, surface existing related items. Persist mode: file the synthesized answer as `wiki/topics/<slug>.md` with frontmatter `cites: [...]` — the Karpathy compounding loop |
| `cleargate-wiki-lint` | Sonnet | Before Gate 1 (Proposal approval) and Gate 3 (Push). On-demand via `/cleargate:lint`. Advisory mode via `--suggest` | Enforcement: detect contradictions, orphans, stale claims, broken backlinks, invalidated topic citations. Refuse gate transition if drift found. Advisory (`--suggest`): surface candidate cross-references ingest missed — non-blocking Karpathy discovery pass |

### 2.3 Conventions

**Backlinks:** Obsidian-style `[[WORK-ITEM-ID]]` syntax. Every page links to its parent and children. Lint pass verifies bidirectional integrity.

**`index.md` structure (canonical sections):**
- **Synthesis pointers** (top of file, one-line each) → `[product-state.md]`, `[roadmap.md]`, `[active-sprint.md]`, `[open-gates.md]`
- **Open Gates** (items blocking on human action)
- **Active** (in `pending-sync/`)
- **In Flight** (pushed, remote ID assigned, not yet Done)
- **Sprints** (active + next planned — each links to `sprints/SPRINT-NN.md`)
- **Archived** (shipped)
- **CRs in effect** (with invalidation edges)
- **Topics** (filed-back synthesis in `topics/`; listed newest-first)

**Pagination:** When any status bucket exceeds 50 items, split into paginated files (`index-active.md`, `index-archive.md`, etc.) and keep `index.md` as the master TOC linking to them.

**`log.md` format (structured YAML event stream):**
```yaml
- timestamp: "2026-04-17T15:32:00Z"
  actor: "cleargate-draft-proposal"
  action: "create"
  target: "PROPOSAL-stripe-webhooks"
  path: ".cleargate/delivery/pending-sync/PROPOSAL-stripe-webhooks.md"
- timestamp: "2026-04-17T15:45:12Z"
  actor: "vibe-coder"
  action: "approve"
  target: "PROPOSAL-stripe-webhooks"
```
Structured format lets `lint` and `query` reason over history without NLP parsing.

### 2.4 Wiki Page Template (canonical)

Every wiki page has minimal YAML frontmatter + short body. Example (`wiki/epics/EPIC-042-webhooks.md`):

```markdown
---
type: epic
id: "EPIC-042-webhooks"
parent: "[[PROPOSAL-stripe-webhooks]]"
children: ["[[STORY-042-001]]", "[[STORY-042-002]]", "[[STORY-042-003]]"]
status: "🟢 ready-to-push"
remote_id: null
raw_path: ".cleargate/delivery/pending-sync/EPIC-042-webhooks.md"
last_ingest: "2026-04-17T15:32:00Z"
---

# EPIC-042: Stripe Webhook Cancellation

1-2 sentence summary compiled from the raw file.

## Blast radius
Affects: [[auth-service]], [[billing-service]], [[email-service]]

## Open questions (from §6)
None — all resolved 2026-04-17.
```

Page body stays small — full content lives in the raw file. Wiki page is a **pointer + summary + edges**, not a copy.

### 2.5 System Constraints

| Constraint | Detail |
|---|---|
| Source of truth | Raw files (`delivery/`, `plans/`) always win. Wiki is derived. On conflict: `lint` rebuilds from raw. |
| Idempotency | Ingest must be safe to re-run. Re-ingesting the same source produces byte-identical wiki pages. |
| Hook failure mode | If PostToolUse hook fails, protocol rule mandates "call wiki-ingest after every delivery write" as fallback. Lint pass catches any missed ingest. |
| Version control | The `wiki/` directory is committed to git alongside `delivery/`. Multi-developer conflicts resolve via `lint --rebuild`. |
| Token budget | `index.md` capped at ~3k tokens before auto-pagination kicks in. |
| Race conditions | Ingest subagent serializes writes to `index.md` via atomic file swap (write temp → rename). Individual wiki pages are per-item, no contention. |

### 2.6 Bootstrap

`cleargate wiki build` — one-shot command to scan existing `delivery/` and `plans/` and seed the wiki. Run automatically at the end of `npx cleargate init` when any raw items already exist; run on-demand after corruption.

---

## 3. Scope Impact (Touched Files & Data)

### 3.1 Known Files — must be modified

**Protocol:**
- `.cleargate/knowledge/cleargate-protocol.md` — add §10 "Knowledge Wiki Protocol" covering ingest/query/lint, gate enforcement, and backlink conventions.

**None of the templates need to change.** Raw files keep their current YAML frontmatter (per PROPOSAL-001); the wiki derives from them.

### 3.2 Expected New Entities

Once the npm package exists:

**CLI commands:**
- `packages/cleargate/src/commands/wiki-build.ts` — bootstrap / full rebuild
- `packages/cleargate/src/commands/wiki-ingest.ts` — single-file ingest (called by subagent + hook)
- `packages/cleargate/src/commands/wiki-lint.ts` — consistency check

**Subagent definitions (ship with init):**
- `.claude/agents/cleargate-wiki-ingest.md` (model: haiku)
- `.claude/agents/cleargate-wiki-query.md` (model: haiku)
- `.claude/agents/cleargate-wiki-lint.md` (model: sonnet)

**Hook configuration (written by `cleargate init` into `.claude/settings.json`):**
```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "pathPattern": ".cleargate/(delivery|plans)/**",
        "command": "npx cleargate wiki-ingest \"$CLAUDE_TOOL_FILE_PATH\""
      }
    ]
  }
}
```

### 3.3 MCP Adapter Impact
- `cleargate_push_item` — after successful push, emit an ingest event (so the wiki page is updated with the new `remote_id`).
- `cleargate_sync_status` — same: emit ingest event on status change.
- `cleargate_pull_initiative` — emit ingest event on successful pull (new entry in `wiki/initiatives/`).

---

## 4. AI Interrogation Loop — RESOLVED

Q1–Q8 resolved by Vibe Coder 2026-04-17 (accepting AI recommendations). Q9–Q10 added 2026-04-18 during scope expansion to the full Karpathy pattern; Q6 and Q7 amended at the same time.

1. **Wiki page content depth** — **Resolved:** metadata + summary + edges only. Raw content stays in the raw file. Keeps pages ~200 tokens each.
2. **Git policy for `wiki/`** — **Resolved:** commit to git. Multi-dev coherence wins; `lint --rebuild` resolves conflicts.
3. **Lint auto-refuse on drift** — **Resolved:** block Gate 1 and Gate 3 on drift. Silent drift defeats the purpose.
4. **`query` auto-invocation** — **Resolved:** always auto-run at triage. Haiku + tiny context = negligible cost.
5. **Hook vs. protocol-only** — **Resolved:** ship both. Hook is primary (deterministic); protocol rule is the fallback.
6. **Wiki for `knowledge/` and `templates/`?** — **Resolved (2026-04-17) / Amended (2026-04-18):** Wiki covers four planes — work items + sprints + product state + roadmap. Still excludes static protocol (`knowledge/`) and `templates/` — those are loaded via CLAUDE.md and don't change often enough to justify compile overhead. The amendment expands scope beyond work-items-only to match Karpathy's full pattern (the wiki IS the knowledge base, not just a TOC of one artifact type).
7. **Synthesis pages** — **Resolved (2026-04-17) / Amended (2026-04-18):** Ship four auto-maintained synthesis pages at the wiki root (not under `synthesis/`): `active-sprint.md`, `open-gates.md`, `product-state.md`, `roadmap.md`. Per-sprint pages live at `sprints/SPRINT-NN.md`. User-added custom synthesis pages are v1.1.
8. **Interaction with PROPOSAL-001 metadata** — **Resolved:** separate `last_ingest` field on wiki pages. Coexists with PROPOSAL-001's `updated_at`/`codebase_version` on raw files.
9. **Query file-back loop** — **Resolved 2026-04-18:** `wiki query --persist` files synthesis into `wiki/topics/<slug>.md` with `cites: [[ID]]` frontmatter. Explicit `--persist` flag required in v1; implicit auto-persist deferred to v1.1. Reason: avoid low-value topic spam; learn which topics get re-queried before automating.
10. **Lint discovery mode** — **Resolved 2026-04-18:** Ship `wiki lint --suggest` alongside enforcement mode. Advisory: exit 0, surfaces candidate cross-refs ingest missed. Enforcement (no flag): exit non-zero on drift, blocks gates. Karpathy's lint discovers; ours must too — but discovery can't block transitions, only inform the next ingest pass.

---

## Approval Gate — PASSED

Approved by Vibe Coder on 2026-04-17. AI authorized to proceed with Epic/Story decomposition for this feature once PROPOSAL-001 is also approved (hard dependency).
