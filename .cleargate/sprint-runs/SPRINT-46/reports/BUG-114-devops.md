# DevOps Report — BUG-114

(No separate dev report file exists for this item; Developer commit 9954d54, QA-Verify PASS in reports/BUG-114-qa.md, Architect post-flight PASS.)

## Merge Result
- cli main merge SHA: bf21e96 `merge(story/BUG-114): BUG-114 close_sprint.mjs finds a globally installed CLI` (local only)
- Integration SHA: 1d3f9d2 (main e5b32d6 merged into story/BUG-114, no conflicts; gen:codex no diff, prebuild + typecheck clean)
- Diff stat of story merge: 10 files changed, 323 insertions(+), 16 deletions(-)

## Targeted tests (integrated tree, ambient PATH, dist built in story wt)
- 8 close_sprint test files: 69 tests, 68 pass, 0 fail, 1 skip (pre-existing: EPIC-FXTRA, superseded by BUG-083)
- bug076_077_close_path.red.sh: 8/8

## Post-merge suite (tip tree at bf21e96) — evidence/suite-after-BUG-114.txt
- Unit: 5633/5635 pass, 0 fail
- Integration: 770/908 pass, 96 fail (reference suite-after-STORY-066-14: 93)
- New failing leaf tests (3, all rule-18 known reds, rule-11 parity from the canonical close_sprint.mjs edit):
  - close-sprint-step-2-6c.live: "live and canonical close_sprint.mjs are byte-identical"
  - close-sprint-step-7-4.live: "diff between live and canonical close_sprint.mjs is empty (mirror parity)"
  - wiki-ingest-sprint-report.live: "diff between .cleargate/scripts/close_sprint.mjs and cleargate-planning/... is empty"
- Their three parent suite names also appear as new (CR-063 Scenario 14, CR-064 Scenario 3, STORY-066-02 Scenario 5); same tests, not additional failures.
- No failure dropped out versus the reference. No regressions.
- close-sprint-reconcile.integration residue: none. Outer `git status .cleargate/delivery/` shows only the orchestrator's own bookkeeping (BUG-114, SPRINT-46, STORY-066-13/14/15 files); EPIC-058/061 remain in pending-sync, archive has none. Nothing restored. Tip tree clean.

## Mirror Parity
Canonical edit only (rule 11); live close_sprint.mjs and scripts/test/bug076_077_close_path.red.sh differ until Gate 4 re-sync + OD-4 byte-copy.

## State
BUG-114 Done (confirmed in state.json).

## Cleanup
- cli worktree and outer host removed (both porcelain empty; .claude symlink removed); branch story/BUG-114 deleted (-d).
- dist in cli main not rebuilt.

## Proof
Unit tests + scratch global-layout run: evidence/BUG-114/proof-global-layout.txt. E2E leg (Goal check (d) run 2 reaching Gate-4 prompt without workaround) is pending, owned by the orchestrator.
