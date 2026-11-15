# SPRINT-46 merge lane — DevOps procedure (nested-cli layout)

Read by every DevOps dispatch in SPRINT-46. Rules 12–21 of `sprint-context.md` govern; this file is the step list.

Paths: `OUTER=/Users/ssuladze/Documents/Dev/ClearGate`, `CLI=$OUTER/cleargate-cli` (cli main checkout),
story cli worktree `$OUTER/.worktrees/<ID>/cleargate-cli`, outer host `$OUTER/.worktrees/<ID>`,
throwaway tip tree `$OUTER/.worktrees/S46-tip/cleargate-cli` (detached; reused by every merge).
State file: `$OUTER/.cleargate/sprint-runs/SPRINT-46/state.json`.

1. **Preconditions.** `git -C $CLI status --porcelain` is empty and `$CLI` is on `main`. The story worktree's
   `git status --porcelain` is empty. The dispatch names the Developer commit and confirms QA-Verify PASS. If any fails → STATUS=blocked.
2. **Integrate if main moved.** If `git -C <story wt> merge-base --is-ancestor main HEAD` is false, run
   `git -C <story wt> merge --no-ff main -m "merge(main): integrate into story/<ID>"`. On a conflict:
   `git merge --abort`, STATUS=blocked, list the files. Never hand-merge a generated file. After a clean
   integration: in the story wt run `npm run gen:codex` (must leave no diff), `npm run prebuild`, `npm run typecheck`,
   and the targeted test files the dispatch lists (`npm run test:file -- <files>`). Any failure → STATUS=blocked.
3. **Merge.** `git -C $CLI merge --no-ff story/<ID> -m "merge(story/<ID>): <ID> <title>"` (local only: never push,
   never publish). Never run `npm run build` / `prebuild` in `$CLI` (rule 17: live hooks run `$CLI/dist`).
4. **Post-merge full suite (tip tree).** In the tip tree: `git checkout -q --detach main`, then `npm run prebuild && npm run build`,
   then with a short private TMPDIR (`TMPDIR=$(mktemp -d /tmp/s46m.XXXX)`) and `CLEARGATE_NO_UPDATE_CHECK=1`:
   `npm test` and `npm run test:integration`, output to `$OUTER/.cleargate/sprint-runs/SPRINT-46/evidence/suite-after-<ID>.txt`
   (unit then integration, with the `ℹ tests/pass/fail` summary lines). Never run two full suites at once.
   Compare every failing test name (`✖` lines) against `evidence/baseline-failures-f846d9a.txt`,
   `evidence/baseline-integration-failures-f846d9a.txt` and the rule-18 known reds in `sprint-context.md`.
   A unit failure outside those lists: re-run that file alone in the tip tree (`npm run test:file -- <file>`); if it passes alone, record it as a load flake in the report (rule 18 note), not a regression.
   A failure in none of those is a regression → STATUS=blocked (leave the merge in place; report it). If the tip
   tree's `git status --porcelain` shows test residue (e.g. moved delivery files), `git -C <tip> checkout -- . && git -C <tip> clean -fdq`
   (tip tree only — never the main checkout or a story tree).
5. **Teardown.** Both `git status --porcelain` empty (story cli wt and outer host). `git -C $CLI worktree remove <story cli wt>`,
   then `rm <outer host>/.claude` (symlink) and `git -C $OUTER worktree remove <outer host>`, then `git -C $CLI branch -d story/<ID>`.
   If a remove refuses, report the porcelain lines; do not use `--force` unless every entry is test residue.
6. **State.** `CLEARGATE_STATE_FILE=$OUTER/.cleargate/sprint-runs/SPRINT-46/state.json node $OUTER/.cleargate/scripts/update_state.mjs <ID> Done`.
7. **Report** `$OUTER/.cleargate/sprint-runs/SPRINT-46/reports/<ID>-devops.md`: merge SHA, integration SHA (if any),
   targeted results, suite summary (unit + integration counts), each failure classified (baseline / known red / regression),
   teardown result, and the Proof evidence the sprint plan §1 names for the item (where it is recorded).

Return:
```
STORY: <ID>
STATUS: done | blocked
MERGE: <sha on cli main> | none
INTEGRATION: <sha> | not needed
SUITE: unit <pass>/<total>, integration <pass>/<total>; new failures: <list or none>
flashcards_flagged: [ ... ]
```
