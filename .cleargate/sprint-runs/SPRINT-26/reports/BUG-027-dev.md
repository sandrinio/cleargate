---
story: BUG-027
sprint: SPRINT-26
authored_by: developer
authored_at: 2026-05-05
---

STORY: BUG-027
STATUS: done
COMMIT: 12f4b8b
TYPECHECK: pass
TESTS: 131 passed, 0 failed
FILES_CHANGED:
  - cleargate-planning/.claude/hooks/token-ledger.sh
  - .claude/hooks/token-ledger.sh (worktree live copy — force-tracked on story/BUG-027 branch)
  - cleargate-planning/MANIFEST.json (prebuild regenerated)
  - cleargate-cli/test/snapshots/hooks/token-ledger.bug-027.sh (new snapshot baseline)
  - cleargate-cli/test/snapshots/hooks-snapshots.test.ts (cr-044 demoted; bug-027 added)
NOTES: Implemented Option A (prior ledger row lookup) + Step 2 (dispatch-marker log line) before
the legacy transcript grep in the `WORK_ITEM_ID` resolution block (lines 236-334). The fix inserts
two new steps ahead of the existing CR-026 transcript-scan path: Step 1 reads the last JSONL row
from ${LEDGER} via `tail -1 | jq -r '.work_item_id'`; Step 2 greps the hook log for the most
recent `dispatch-marker: ... work_item=...` line. Both accept only non-empty/non-none/non-unknown
values. Transcript grep is now the last resort. The canonical-live-parity Red test (CR-049) also
required syncing the worktree's .claude/hooks/token-ledger.sh (force-tracked on the story branch)
— this is not the main-repo gitignored live hook; it was already in the index on story/BUG-027.
All 9 Red scenarios pass; full suite 131/131 green; vitest snapshot suite 8/8 green.

r_coverage:
  - { r_id: "S1", covered: true, deferred: false, clarified: false }
  - { r_id: "S2", covered: true, deferred: false, clarified: false }
  - { r_id: "S3", covered: true, deferred: false, clarified: false }
  - { r_id: "S4", covered: true, deferred: false, clarified: false }

plan_deviations:
  - { what: "Synced worktree .claude/hooks/token-ledger.sh", why: "canonical-live-parity Red test (CR-049) checks REPO_ROOT/.claude/hooks == canonical; the file is force-tracked on story/BUG-027 branch so it must be kept in sync", orchestrator_confirmed: false }

adjacent_files:
  - "cleargate-cli/test/scaffold/canonical-live-parity.red.node.test.ts"
  - "cleargate-cli/test/hooks/token-ledger-attribution.test.ts"
  - "cleargate-planning/.claude/hooks/write_dispatch.sh"

flashcards_flagged:
  - "2026-05-05 · #snapshot #hooks #worktree · The story/BUG-027 branch force-tracks .claude/hooks/token-ledger.sh; canonical-live-parity Red test checks this — must sync on every hook edit."
