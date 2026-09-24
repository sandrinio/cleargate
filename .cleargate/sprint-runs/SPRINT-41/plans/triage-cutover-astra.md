role: architect

**Decision 1: approve one changed-approach repair/verification cycle; the current patch is not acceptable yet.**

The repair materially changes the failed approach: it appends missing segments to the resolved ancestor, so nonexistent `.worktrees/STORY…` descendants no longer collapse to their parent. That supports a bounded retry, without resetting breaker history or claiming a pass. [worktrees.ts:145–158](/Users/ssuladze/Documents/Dev/CG_TEST/sprint-41-D2QMC1/stories/STORY-058-12/cleargate-cli/src/workflow/worktrees.ts:145)

Required corrections:

- **Containment:** retain lexical rejection of equality, exact `..`, `../…` and absolute escapes. Validate literal `..` components before normalization erases them. Add physical equality rejection: the physical guard currently omits `!relative`, allowing aliases to the container itself. [worktrees.ts:119–165](/Users/ssuladze/Documents/Dev/CG_TEST/sprint-41-D2QMC1/stories/STORY-058-12/cleargate-cli/src/workflow/worktrees.ts:119)
- **Missing paths:** use `lstat` to distinguish absent entries from dangling symlinks; reject unresolved symlinks and unexpected filesystem errors. Physical validation must not use `normalizedPath`’s catch-all lexical fallback. Resolve the existing ancestor strictly, require directory ancestry, then append genuinely missing segments. Complete these checks before `mkdir` or `git worktree add`. [worktrees.ts:106–112](/Users/ssuladze/Documents/Dev/CG_TEST/sprint-41-D2QMC1/stories/STORY-058-12/cleargate-cli/src/workflow/worktrees.ts:106), [431–461](/Users/ssuladze/Documents/Dev/CG_TEST/sprint-41-D2QMC1/stories/STORY-058-12/cleargate-cli/src/workflow/worktrees.ts:431)
- **Stale lease:** ESRCH-only death proof, exclusive recovery guard and repeated owner comparison are appropriate. However, cleanup compares two potentially undefined tokens: failure to acquire an empty/malformed `.recovery` guard can delete another contender’s guard. Cleanup requires successful acquisition, a defined ownership token and an exact current match. Uncertain ownership remains blocked. [worktrees.ts:638–648](/Users/ssuladze/Documents/Dev/CG_TEST/sprint-41-D2QMC1/stories/STORY-058-12/cleargate-cli/src/workflow/worktrees.ts:638), [701–727](/Users/ssuladze/Documents/Dev/CG_TEST/sprint-41-D2QMC1/stories/STORY-058-12/cleargate-cli/src/workflow/worktrees.ts:701)
- **QA reconciliation:** `merge()` correctly checks the canonical QA head before duplicate return or unreceipted-merge reconciliation. Retain this ordering. `hasMerge()` checks receipts without QA; any completion shortcut using it must independently require persisted QA evidence. Its caller was outside this inspection. [worktrees.ts:777–847](/Users/ssuladze/Documents/Dev/CG_TEST/sprint-41-D2QMC1/stories/STORY-058-12/cleargate-cli/src/workflow/worktrees.ts:777)

The verification cycle must cover:

1. Completely absent `.worktrees`, multiple missing descendants, existing valid descendants and idempotent reuse.
2. Literal traversal, root aliases, existing symlink escapes with nonexistent children, dangling symlinks and resolution errors; assert unchanged branches, registry and outside bytes, with no mutating Git invocation.
3. Dead/live/malformed lease owners, competing recoverers, empty recovery guards and ownership changes; rejected recovery preserves another owner’s files.
4. Missing/mismatched QA for both duplicate receipts and crash reconciliation; correct QA produces exactly one receipt and no second DevOps dispatch.

The current containment test creates `.worktrees` before its positive case, masking the original absent-root condition; lease coverage has only a dead-owner happy path. [integration test:89–165](/Users/ssuladze/Documents/Dev/CG_TEST/sprint-41-D2QMC1/stories/STORY-058-12/cleargate-cli/test/workflow/workflow.integration.node.test.ts:89), [244–294](/Users/ssuladze/Documents/Dev/CG_TEST/sprint-41-D2QMC1/stories/STORY-058-12/cleargate-cli/test/workflow/workflow.integration.node.test.ts:244)

Reconcile command fixtures with the finished runtime: they currently use implicit initial-branch naming, empty gates and a fake server returning invented SHAs. Those cannot establish successful Git-backed execution. [command.node.test.ts:36–96](/Users/ssuladze/Documents/Dev/CG_TEST/sprint-41-D2QMC1/stories/STORY-058-12/cleargate-cli/test/workflow/command.node.test.ts:36), [role-server.mjs:6–9](/Users/ssuladze/Documents/Dev/CG_TEST/sprint-41-D2QMC1/stories/STORY-058-12/cleargate-cli/test/fixtures/workflow/role-server.mjs:6)

Run augmented integration/command tests explicitly through `test:file` and the assigned wrapper, with fixtures beneath CG_TEST, then typecheck. Preserve subsequent regression, QA, Architect and DevOps gates. Freeze the candidate first; concurrent `command.ts`/`cli.ts` edits are not accepted evidence. Another same-cause failure returns BLOCKED for parent routing.

**Decision 2: approve a development-only sequencing clarification, conditional on demonstrated executor gates and transport.**

The cycle is explicit: ordinary implementation waits for M0-B, while installed Codex payload arrives in M5 and bootstrap qualification requires enforcement. [M0.md:18–22](/Users/ssuladze/Documents/Dev/CG_TEST/sprint-41-D2QMC1/workspace/.cleargate/sprint-runs/SPRINT-41/plans/M0.md:18), [bootstrap-decision.md:51–56](/Users/ssuladze/Documents/Dev/CG_TEST/sprint-41-D2QMC1/workspace/.cleargate/sprint-runs/SPRINT-41/bootstrap-decision.md:51), [sprint plan:96–100](/Users/ssuladze/Documents/Dev/CG_TEST/sprint-41-D2QMC1/workspace/.cleargate/delivery/pending-sync/SPRINT-41_multi_host_adapters_and_frontmatter_locator.md:96)

Append one `CR:approach-change` to the sprint execution log and context, with matching append-only clarifications in bootstrap decision/plan, M0 and affected BUG-067/-12 raws:

> For isolated CG_TEST implementation, development executor admission requires verified containment/recovery, explicit fail-closed admission and role/test gates, deterministic transport/Git evidence and real transport qualification. M0-B live Claude proof and installed Codex enforcement are final-acceptance dependencies; they do not prevent building their prerequisites. Preserve source dependencies, standard QA, conditional Architect review, flashcard barriers and serialized DevOps integration. Cut over only after draining and reconciliation, with binary/executor/profile/config hashes and resume boundary recorded. Preserve existing state-command ownership; no direct cache writes or serial fallback.

This follows the existing distinction between executor admission and host denial. [bootstrap-implementation.md:89–95](/Users/ssuladze/Documents/Dev/CG_TEST/sprint-41-D2QMC1/workspace/.cleargate/sprint-runs/SPRINT-41/plans/bootstrap-implementation.md:89)

The parent-reported Terra/Sol overlap, Astra availability, restart/read and interrupt support only those transport facts. Complete actual Astra-turn and persisted-resume evidence before declaring developmental qualification. They prove no hooks.

BUG-067’s locator/writer implementation logically requires no live Claude behavior when Claude is unused; deterministic command and repaired hook fixtures suffice for development. Its real installed PostToolUse acceptance remains mandatory. [M0.md:139–151](/Users/ssuladze/Documents/Dev/CG_TEST/sprint-41-D2QMC1/workspace/.cleargate/sprint-runs/SPRINT-41/plans/M0.md:139)

Final acceptance still requires the pinned standalone installation, legitimate authentication, human trust of exact hooks, actual denial/allow controls, Claude baselines and independent story-loop evidence. Evidence-incomplete items remain open; no coupled completion command may mark them Done. No user-ready claim until transport **and** enforcement pass. No credential copying, trust bypass, original live writes or software-scope expansion. If authorized authenticated transport is unavailable, model-driven cutover blocks; offline development continues.

Read-only triage only: no tests, edits, state changes or acceptance claimed.
