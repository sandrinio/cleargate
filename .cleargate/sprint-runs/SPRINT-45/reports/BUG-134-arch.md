# BUG-134 · Architect post-flight

role: architect · SPRINT-45 · worktree `.worktrees/BUG-134/cleargate-cli` at `e4a4094` (Developer `4e6631a` plus the cli main `cd54e93` integration)

## Verdict: ARCH: FAIL

| # | Deviation | Verdict |
|---|---|---|
| 1 | Event placement: three-way rule (no shared predecessor → leading; no shared successor → trailing; otherwise immediately before the first later shared event) | **ACCEPT** |
| 2 | Group folding: every ours group with the matcher key folds its non-ClearGate hooks into the matched upstream group | **REJECT** |
| + | The dedup step drops command-less hooks. This was found in review; the fault is in the plan's wording, not a Developer deviation. | **REJECT** (fix required) |

## Pre-gate

`run_script.sh bash pre_gate_runner.sh arch .worktrees/BUG-134 sprint/S-45`: exit 0. typecheck, new_deps, stray_env_files and qa_red_lint all PASS; 0 failed, 0 warnings.

Calling it as `run_script.sh pre_gate_runner.sh …` fails with `command not found`, because the wrapper runs `"$@"` as given. Add `bash <abs path>` before the script.

Tests at `e4a4094`: the 2 reds plus the 5 guard files give 69 passed, 0 failed.

## Deviation 1: event placement (ACCEPT)

- **Spec:** C-4 says "an event only the user has stays before the ClearGate event it preceded; an event upstream adds takes upstream's position". The Developer's rule meets it in all three branches:
  - A leading event sits before every ClearGate event.
  - A middle event sits immediately before its first shared successor.
  - A trailing event has no successor, so the clause does not apply.
- **Difference from the plan:** the rule differs from the plan's only for leading events. The plan anchored a leading event to its first shared successor, so red 4 (oldLayout, user `Stop` first, shared events in a different order from upstream's) moved `Stop` to fourth place.
  - Reds 5 and 5b give the same result under both rules.
  - The plan's own integration assertion (`Stop` first) needs the Developer's rule whenever ours' shared order differs from theirs.
- **Idempotence:** the output puts shared events in T order. On a second merge, each ours-only event lands in the same branch (leading, before the same event, or trailing). This was checked on every probe and on red 11.
- **Goal check 2:** I simulated the merge on dispenser_adapter's real settings (read-only `git show`, scratch copies):
  - (A) at HEAD: zero diff.
  - (B) at `234e09f^` (0.28.0): the diff is exactly the added ClearGate `PostToolUse` `Bash` group, and `Stop` stays first.
  - Both are idempotent.

## Deviation 2: group folding (REJECT)

- **Spec:** the bug's decision text is "the user's own groups kept after upstream's groups in their original relative order" and "each of the user's hooks kept right after the ClearGate hooks of the group it was in". Folding moves a hook out of the user's own group into ClearGate's group, a group it was never in.
- **Probes against `e4a4094`** (all three are idempotent, which is not the issue):
  - (a) `SessionStart: [{session-start}], [{notify}]` (a user's separate group) → one group `[session-start, notify]`.
  - (b) The same with the user group first → same fold.
  - (c) The dispenser-B variant where the user already has their own `PostToolUse` `Bash` group and upstream adds ClearGate's → `Bash[post-shell-ingest, lint]`. The user's group disappears.
- **Effect on the diff:** each of these shows the user's group deleted and their hook moved. That is the review cost BUG-134 exists to remove, and it breaks Goal check 2's general claim that "`git diff` shows only hooks ClearGate added, removed or changed". It is reachable on any upgrade whose ClearGate side changes, because that change sends settings.json down the take path.
- **Dispenser proof:** the proof does not catch this. dispenser has no user groups sharing a ClearGate matcher.
- **Plan defect (Architect-owned):** the plan's original bullet, "first unconsumed ours group with the same key", also fails (c). It pairs upstream's new `Bash` group with the user's own `Bash` group. So the correction replaces both the fold and the plan's bullet.
- **Why the red forced this:** red 3's `cmds()` helper uses `.find`, which returns only the first matcher-less `SessionStart` group, so the red can pass only if the groups are folded. The Gherkin asks only that "every user hook is present with its matcher". This is a test-pattern over-specification, so QA-Red re-scopes it, not the Developer.

### Required behaviour (M1 BUG-134, "Post-flight amendments" PF-2/PF-3)

- **PF-2:** a theirs group pairs with exactly one ours group. That is the first unconsumed group with the same matcher key and a non-empty `hooks` array that holds at least one hook whose `command` passes `isClearGateCommand` or equals a command in that theirs group.
  - With no candidate, the theirs group is emitted alone.
  - All other ours groups, same-key user-only groups included, go to the unconsumed tail unchanged.
  - The "or equals a theirs command" clause keeps pairing safe if a future upstream hook name is missing from `CLEARGATE_HOOK_SCRIPT_NAMES`. Today every claude and codex upstream command passes `isClearGateCommand` (checked).
- **PF-3:** dedup only when `typeof h.command === 'string'`. Probe (d): two `type: "prompt"` hooks in ClearGate's `Edit|Write` group became one at `e4a4094`, because `undefined === undefined`. That breaks the bug's edge condition "User hooks are never dropped (BUG-093)". The fault is in the plan's dedup wording.

In a scratch copy of `merge-settings.ts` with PF-2/PF-3 applied:
- Every unit red except red 3 passes.
- Probes (a) to (e) keep user groups separate and keep both prompt hooks, and all are idempotent.
- The integration red's fixture (user hook inside ClearGate's `Edit|Write`, a user `PreToolUse` `Bash` group, `Stop` first) is unaffected by PF-2.

### Other edge cases (pass at `e4a4094` and under PF-2)

- **User hook in a group upstream removed** (old `Task` matcher): the ClearGate hook is stripped and the user hook is kept in its own `Task` group after upstream's groups.
- **Upstream removes a whole event:** groups that held only ClearGate hooks are dropped, user hooks are kept, and an emptied event is dropped.
- **Codex parity:** both `mergeSurgeryTarget` branches (`claude.ts:362-370`, `codex.ts:313-319`) call the same `mergeUpstreamSettings`. Install paths and `mergeSettings` are unchanged (GUARD case green). Reds 10 and 11 cover codex.
- **Deps:** `removeClearGateHooks` remains a dependency in both adapters for the remove paths (`claude.ts:244`, `codex.ts:232`). No test injects the old surgery-path dependencies.

## Routing

1. **QA-Red** re-scopes red 3 and adds 3b, 3c and 9b, per M1 BUG-134 "Post-flight amendments" → Reds. No other red changes.
2. **Developer** re-launches against the amended M1 (PF-1 kept, PF-2 and PF-3 applied). The change is limited to the pairing predicate and the dedup guard in `mergeUpstreamSettings`.
3. The orchestrator increments `arch_bounces` for BUG-134.

No change to the bug's spec text is needed: PF-2 implements its decision text word for word. The orchestrator may log PF-1 to PF-3 under sprint-context `## Mid-Sprint Amendments` as a CR:approach-change on BUG-134. I edited only M1 and this report.

## Script Incidents

`/Users/ssuladze/Documents/Dev/ClearGate/.cleargate/sprint-runs/SPRINT-45/.script-incidents/20261114T085951Z-4567a33bc5f0.json`: the first wrapper call failed with exit 127, `pre_gate_runner.sh: command not found`. The call was wrong (it left out `bash <abs path>`). No action is needed beyond the flashcard below. The corrected call exited 0.

## flashcards_flagged

- `2026-11-14 · #upgrade #settings · Pair an upstream hook group only with an ours group holding a ClearGate hook; matcher-only pairing folds the user's own groups.`
- `2026-11-14 · #upgrade #settings · Dedupe hooks on string commands only: prompt/agent hooks have no command; undefined===undefined drops the second.`
- `2026-11-14 · #qa-red #settings · A cmds() helper using .find() reads only the first group per matcher; a red built on it forces group folding.`
- `2026-11-14 · #scripts #wrapper · run_script.sh execs "$@" verbatim: pass 'bash <abs path>/pre_gate_runner.sh', not the bare script name.`

## Re-check (2026-11-14, `f72138f`)

**Verdict: ARCH: PASS.** I checked this on scratch copies only.

**Diff attribution.** `git diff 4e6631a 26384c7` also shows `src/lib/pricing.ts` and its test. Both come from the BUG-117 integration `e4a4094`, which landed after `4e6631a`, not from the rework.
- The rework itself is `git diff e4a4094 26384c7`: `src/init/merge-settings.ts` (Developer `26384c7`) and the red file (QA-Red `ab0ffa6`).
- The integration `f72138f` (cli main `169480e`) does not touch `merge-settings.ts`, `hosts/claude.ts` or `hosts/codex.ts`.

**Checks against the amendments:**
- **PF-1:** the event-order block is unchanged.
- **PF-2:** a single `findIndex` picks the first unconsumed group with the same key and a non-empty `hooks` array that holds an `isClearGateCommand` hook or a command from the upstream group.
  - With no match, upstream's group is emitted alone.
  - Unmatched groups go to the tail unchanged.
  - The loop that merged every same-key group is gone, so nothing is folded any more.
- **PF-3:** a hook is treated as a duplicate only when its `command` is a string. The `isCg` guard is also applied when stripping ClearGate hooks from unmatched groups, which changes nothing in behaviour.

**Reds.** `ab0ffa6` matches the amendments.
- Red 3 now reads every matching group through `groupCmds` (a `filter`, not `.find`) and expects `[[START],[NOTIFY]]`.
- 3b, 3c and 9b were added as specified.
- No other red changed.
- A scratch-rewritten copy of the unit red file run against `f72138f`'s `merge-settings.ts`: 19 pass, 0 fail.

**Probes on `f72138f`** (all five idempotent):
- (a) `SessionStart` `[[session-start],[notify]]` is unchanged.
- (b) A user group placed first moves after ClearGate's group and is not merged into it.
- (c) `PostToolUse` becomes `Edit|Write, Bash[post-shell-ingest], Bash[lint]`.
- (d) Both prompt hooks survive.
- (e) A user hook in a group that upstream dropped stays in its own `Task` group after upstream's groups.

**Dispenser simulation** (read-only `git show` into scratch):
- (A) at HEAD: no diff.
- (B) at `234e09f^`: the only change is the added ClearGate `PostToolUse` `Bash` group. `Stop` stays first.
- Both are idempotent.

flashcards_flagged (re-check): none new. The four above still stand.
