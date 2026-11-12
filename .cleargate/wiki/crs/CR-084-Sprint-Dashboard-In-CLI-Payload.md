---
type: cr
id: "CR-084-Sprint-Dashboard-In-CLI-Payload"
parent: "[[EPIC-026]]"
children: []
cites: 
  - "[[PROPOSAL-009]]"
  - "[[STORY-006-03]]"
cited_by: 
  - "[[CR-097]]"
  - "[[CR-101]]"
  - "[[CR-102]]"
  - "[[EPIC-062]]"
  - "[[STORY-062-01]]"
  - "[[STORY-062-03]]"
  - "[[STORY-062-05]]"
  - "[[STORY-063-05]]"
status: "Completed"
remote_id: ""
raw_path: ".cleargate/delivery/archive/CR-084-Sprint-Dashboard-In-CLI-Payload.md"
last_ingest: "2026-11-12T19:31:58.580Z"
last_ingest_commit: "c5ef4013065ba78f372bac93c7fd4419d0e326f8"
repo: "planning"
parent_cleargate_id: "EPIC-026"
---

# CR-084-Sprint-Dashboard-In-CLI-Payload: CR-084: Ship a Branded Sprint-Progress Dashboard as a `cleargate` CLI Subcommand

**Status:** Completed · **Sprint:** none · **Gate:** not run

## Context override
**Obsolete Logic (What to Remove / Forget):**
- None — this CR is **additive**. No existing behavior is evicted. The only change to a shipped code path is that `cleargate sprint init` gains one best-effort trailing step (New Logic #4), a no-op when suppressed or when the render fails.
- (Supersedes the earlier draft of this CR: **no Python, no `.cleargate/tools/` file, no payload-sync of a tool.** The generator is TypeScript inside the CLI package.)

**New Logic (The New Truth):**

1. **New subcommand — `cleargate sprint dashboard [--open] [--serve] [--port <n>]`.** TypeScript in `cleargate-cli/src/`. Auto-detects the active sprint from `.cleargate/sprint-runs/.active` (reusing/extending the active-sprint reader in `src/wiki/synthesis/active-sprint.ts`), then collects — each source degrades gracefully; a missing/malformed input renders an empty or placeholder panel, never throws:
   - `sprint-runs/<id>/state.json` — story states, done/queued counts.
   - the sprint plan pipe-table, keyed to the Sprint Plan Template column order `Story ID | Title | Lane | Milestone | Parallel? | Bounce Exposure` — source of story titles + milestone grouping.
   - `sprint-runs/<id>/token-ledger.jsonl` — token spend by agent (empty panel if the SubagentStop hook never ran).

[+2,314 bytes not shown — read .cleargate/delivery/archive/CR-084-Sprint-Dashboard-In-CLI-Payload.md]

## Blast radius
- [ ] Database schema impacts? **No.**
- [ ] Downstream Stories/Epics invalidated? **None.** Related admin-console work — [[STORY-006-03]] (Admin projects-list dashboard) and [[PROPOSAL-009]] (Planning Visibility UX) — is a **different surface** (server-rendered stakeholder UI) and is **not** invalidated.
- **Behavioral change:** `cleargate sprint init` gains a best-effort trailing step. Gated + graceful → no existing caller breaks.
- **New CLI surface:** `cleargate sprint dashboard` subcommand — additive; must be registered in `src/cli.ts` alongside the other `sprint` subcommands.
- **First-install gitignore gap:** scaffold `.gitignore` is `FIRST_INSTALL_ONLY` (`copy-payload.ts:71`), so repos that already ran `cleargate init` won't auto-receive the `dashboard.html` ignore line. Acceptable; new installs get it, and the file is a harmless regenerated cache.

<!-- BEGIN relations -->
## Relations
- Parent: [[EPIC-026]]
- Cites (2): [[PROPOSAL-009]], [[STORY-006-03]]
- Cited by (8): [[CR-097]], [[CR-101]], [[CR-102]], [[EPIC-062]], [[STORY-062-01]], [[STORY-062-03]], [[STORY-062-05]], [[STORY-063-05]]
<!-- END relations -->
