STORY: BUG-047
role: qa
Mode: VERIFY
QA: PASS
TYPECHECK: pass (actual exit 0)
TESTS: 119 passed, 0 failed, 0 skipped (7 scoped files; not full suite)
ACCEPTANCE_COVERAGE: 6 of 6 requirements; all 5 raw numbered verification scenarios covered
MISSING: none
REGRESSIONS: none in the independently executed scope
VERDICT: The integrated implementation satisfies M7 §3 and TPV047-A1..A5. An unchanged stale verdict advances its stamp; fresh caches retain CR-038 byte identity, including equality and failing verdicts. Both Check 5 sites share the same freshness predicate. Step 0 judges the original bytes and retains stale advances while restoring fresh timestamp-only rewrites. Ready for the assigned post-flight and merge gates.
flashcards_flagged: []

## Reviewed tree and authority

- Work root: `/Users/ssuladze/Documents/Dev/ClearGate/.worktrees/BUG-047/cleargate-cli`, branch `story/BUG-047`, HEAD `7079954f3e20e4f8e3cce864ee76077e6558fdad`.
- Authoritative CLI baseline: `79fc180d56d899385bcdf30b6e20dd138bc05c05`; independently confirmed CLI main still at that SHA at completion.
- Detached outer host: `/Users/ssuladze/Documents/Dev/ClearGate/.worktrees/BUG-047`, supplied integration SHA `6a9cbcc707d658beeb1e8aa537fca98fbea17ba3`.
- Read sprint context and prepared `.qa-context-BUG-047.md`, raw bug, binding M7 BUG-047 blueprint and TPV047 amendments, QA-Red/reseal, TPV, Developer and September 30 integration reports/JSON. Applied the canonical QA profile and flashcard entry/canonical policy.
- Full baseline diff reviewed: `CHANGELOG.md`, `src/commands/sprint.ts`, `src/lib/frontmatter-cache.ts`, and all 624 lines of the sealed test. No other baseline-diff paths. `git diff --check 79fc180 HEAD` exit 0.
- Independently confirmed source byte-equal to `8b7daf3` and sealed acceptance test byte-equal to `9a44e4b` using `git diff --quiet` (exit 0). No implementation or test edits.
- Pack handoff `files_changed` describes the incoming mechanical BUG-100 merge; the pack's touched-file set and actual baseline diff correctly identify BUG-047's four-file scope. This is an integration-list distinction, not a missing implementation surface.
- No `Active CRs` heading exists in sprint context; its append-only amendments supply the binding resume/contract-first decisions.

## Independent checks

Every npm invocation ran in the assigned CLI worktree with `ORCHESTRATOR_PROJECT_DIR`, `CLAUDE_PROJECT_DIR`, and `CLEARGATE_REPO_ROOT` unset. Each file used its own package `npm run test:file -- <path>` invocation. Every reported result below reached actual process completion with exit 0; no running-session summary was treated as completion.

| Command / file | Passed | Failed | Skipped | Actual exit |
|---|---:|---:|---:|---:|
| `test/lib/gate-cache-staleness.red.node.test.ts` | 5 | 0 | 0 | 0 |
| `test/commands/sprint-preflight.node.test.ts` | 27 | 0 | 0 | 0 |
| `test/lib/frontmatter-cache.node.test.ts` | 11 | 0 | 0 | 0 |
| `test/lib/frontmatter-writers.red.node.test.ts` | 30 | 0 | 0 | 0 |
| `test/commands/gate-unit.node.test.ts` | 30 | 0 | 0 | 0 |
| `test/commands/stamp.node.test.ts` | 10 | 0 | 0 | 0 |
| `test/wiki/lint-checks-gate.node.test.ts` | 6 | 0 | 0 | 0 |
| `npm run typecheck` | — | — | — | 0 |

Acceptance command session `35180`, preflight `6839`, and typecheck `9546` were retained and polled to actual exit 0. Complete per-command output is in this QA tool transcript. Frontmatter-cache first ran while preflight was still completing; a second isolated run after every other test completed reconfirmed 11/11, exit 0. Totals above count that file once. This procedural repeat was not a flake retry; neither run failed.

Additional independent boundary probe: wrapped `node --import tsx --input-type=module -e` imported the worktree's `isGateCacheFresh` and asserted 8 matrix rows: null cache, empty stamp with empty/present updated timestamp, absent updated timestamp, exact equality, strict staleness, and both equality/staleness with `pass:false`. **8/8 assertions, actual exit 0.** It created no scratch files and mutated no work item. Wrapper invocation used inline `ORCHESTRATOR_PROJECT_DIR=/Users/ssuladze/Documents/Dev/ClearGate bash /Users/ssuladze/Documents/Dev/ClearGate/.cleargate/scripts/run_script.sh`.

## Acceptance trace

| Requirement | Independent passing evidence | Implementation trace |
|---|---|---|
| R1 / raw §5.1: gate → stamp → gate advances unchanged stale cache | T1 passing and failing halves | `writeCachedGate` only skips equal verdicts when the existing cache is fresh; full new result is otherwise serialized |
| R2 / §5.2: Check 5 passes after re-gate | T2 equality-boundary item and plan; phase 2 plan stale exit 1 → re-gate → exit 0 | Item and plan sites both call `!isGateCacheFresh`, preserving null/pass=false/stale reason order |
| R3 / §5.3: unedited rechecks are byte-identical | T3 strict-fresh, equality-fresh, and fresh-failing; writers final case | Inclusive `>=`, pass-independent helper, unchanged verdict comparison includes transition and criteria |
| R4 / §5.4: changed verdict and stamp both persist | T4 fresh pass→fail and stale fail→pass, clearing criteria; writers final case independently changes criteria/transition | Existing write path writes full `newResult`; freshness is only an additional early-return condition |
| R5 / §5.5: archived/terminal skips persist | Preflight scenarios 13 and 18, stamp archive case | Status and archive skips and Step 0 iteration unchanged in baseline diff |
| R6 / M7: restore guard keeps stale stamp, restores already-fresh original | T5 A–D (stale/fresh/equal/stale-failing); preflight scenario 20 verdict-change witness | Parses ORIGINAL bytes, normalizes missing stamp/updated timestamp, requires timestamp-only equality and original freshness, retains best-effort catch |

No deferred-verification entry applies to BUG-047. Five numbered raw verification steps are covered by red-now-green tests plus explicitly retained existing skip witnesses; the plan adds R6. The three unchecked Task Breakdown rows are acknowledged merge-time orchestrator bookkeeping for this CLI-only item, with actual QA-Red/source/check evidence present; they are advisory, not an implementation gap.

## Blindspot assessment

- T2 intentionally stubs Step 0's gate invocation, isolating Check 5. T1 drives real gate/stamp handlers; T5 drives the real preflight/restore path with a timestamp-only write seam. These cover different responsibilities rather than treating the mock as a real gate execution.
- T5 does not assert preflight exit 0 for a stale Step-0 refresh: keeping the repaired stamp legitimately dirties the file once and Check 4 blocks until commit. That is explicitly M7's contract. Fresh originals restore byte-for-byte; scenario 20 also proves genuine verdict changes are retained.
- Sealed tests do not directly pin the new helper export, shared call-site wiring, or empty-stamp case. Independent source review confirms the exact required expression at all four consumers; the 8-row helper probe closes the empty/null timestamp boundary. Check 5 empty-stamp normalization is directly visible in `readCachedGateSync` plus each shared-helper call. This is not a claim of a new end-to-end missing-stamp fixture.
- The writer test with identical supplied timestamps alone cannot detect churn. T3 varies time and checks bytes, including the equality boundary and failing verdict. Existing writers coverage pins absent `updated_at`, transition/criteria differences, Unicode/instructions/CRLF/mixed-EOL preservation, and malformed input failures.
- T5's stale-failing mock returns successfully. Source inspection additionally confirms the unchanged throwing-gate branch calls the same restore guard, which itself never inspects `pass`; preflight error-path scenarios remain green.
- `gate.ts`, `stamp-frontmatter.ts`, readiness predicates, wiki staleness logic, and refresh iteration are absent from the baseline diff. ISO-second lexical timestamp semantics are the binding contract; alternate formats/clock-skew behavior are outside this item.
- TPV's old six unrelated integration failures were not reused as exemptions. None of this dispatch's requested checks failed. No claim is made about their current status.

## Flags, boundaries and Script Incidents

No product findings or new flashcards. Relevant existing lessons applied: freshness equality, red-now-green witnesses, canonical source relocation, own npm selector, ambient-env isolation, retained process handles, and namespaced scratch discipline.

No wrapped script failed and no script incident was created. A read-only search used a nonexistent sprint-directory glob and zsh reported `no matches found`; it was corrected to the actual raw `pending-sync` sprint path. This was not a check result or a wrapped script failure.

CLI and detached outer worktree `git status --porcelain` remained empty. No cleanup/restoration was needed. Outer-main existing state/events modifications and prepared/integration artifacts were preserved; concurrent `BUG-102-qa-red.md` appeared and was left untouched. This report is the only file authored by this QA dispatch.

M7 assigns no M2/harness obligation to BUG-047. Current worktree dist is evidenced by the September 30 integration's successful worktree prebuild/build/verify-pack; no rebuild was warranted. No full suite, live/auth probe, user-repository gate/stamp, main build, install, commit, state change, push, publication, or close was performed. Merge-lane suite and BD remain subsequent gates; +5 test delta is unchanged, projected full-suite total 3674/3672/0/2 is not independently executed evidence.

Usage telemetry: unavailable. Checks were manually executed; no claim of host-fired enforcement or synthetic token attribution.
