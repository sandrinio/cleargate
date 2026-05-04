# CR-046 Architect Post-Flight Review

role: architect

**CR:** CR-046 — run_script.sh wrapper + script-incidents reporting
**Dev commit:** 0540f9d
**QA verdict:** PASS (7/7, 31 tests)
**Worktree:** `.worktrees/CR-046/`
**Review date:** 2026-05-04

---

## 1. Architectural Drift From M1

**Verdict: NONE on the wrapper-rewrite axis. Drift exists on the call-graph axis.**

M1 plan §CR-046 explicitly anticipated a NEW interface (`bash .cleargate/scripts/run_script.sh <cmd> [args...]`, see plan L86, L132, L142). Dev rewrote the existing 123-line wrapper from STORY-013-03 (commit `adaacbe`, OLD interface `run_script.sh <script-name.mjs|.sh>` with extension-routing) to the NEW arbitrary-cmd interface. The rewrite itself matches §CR-046 verbatim — same hash filename pattern, same self-exemption guard, same JSON schema, same 4KB truncation.

What M1 did **not** anticipate and Dev did **not** address: the OLD wrapper interface is hard-coded into `cleargate-cli/src/commands/{sprint.ts:237, state.ts:87+130, gate.ts:420+anchor}` as production callers. Those four production paths (`cleargate sprint init`, `cleargate sprint close`, `cleargate state update`, `cleargate state validate`, `cleargate gate qa`, `cleargate gate arch`) all build `args = [runScript, '<script-name>.{mjs,sh}', ...rest]` and call `spawnSync('bash', args)`. Under the new wrapper, `<script-name>.mjs` is exec'd as a PATH command and fails with `command not found` (exit 127). See §2 for proof.

CR §0.5 Q4 declared the wrapper "mandatory for all bash scripts dispatched FROM agents (Dev/QA/Architect/Reporter/DevOps). Optional for orchestrator-direct invocation" — which I read as scoped, but the production CLI call-sites bypass that scope distinction entirely. They were already wired to the OLD wrapper, and the silent interface flip orphans them without any compensating call-site update.

---

## 2. Old-Interface Caller Orphan Check

**Verdict: ORPHANS PRESENT. Hard breakage at runtime under `execution_mode: v2`.**

Grep across the worktree for `run_script.sh` finds three classes of caller:

### 2a. Production CLI commands (BROKEN under v2)

| File | Line | Invocation |
|---|---|---|
| `cleargate-cli/src/commands/sprint.ts` | 237 | `spawnFn('bash', [runScript, 'init_sprint.mjs', opts.sprintId, '--stories', opts.stories], ...)` |
| `cleargate-cli/src/commands/sprint.ts` | 284 | `spawnFn('bash', [runScript, 'close_sprint.mjs', opts.sprintId, ...maybeAck], ...)` |
| `cleargate-cli/src/commands/state.ts` | 87 | `spawnFn('bash', [runScript, 'update_state.mjs', opts.storyId, opts.newState], ...)` |
| `cleargate-cli/src/commands/state.ts` | 130 | `spawnFn('bash', [runScript, 'validate_state.mjs', opts.sprintId], ...)` |
| `cleargate-cli/src/commands/gate.ts` | 418–422 | `spawnFn('bash', [runScript, 'pre_gate_runner.sh', 'qa', worktree, branch], ...)` |
| `cleargate-cli/src/commands/gate.ts` (gateArch handler) | analogous | `[runScript, 'pre_gate_runner.sh', 'arch', worktree, branch]` |

All six call-sites pass a bare script-name (`.mjs` or `.sh`) as the first wrapper arg. The OLD wrapper resolved that to `node <SCRIPT_DIR>/<name>` or `bash <SCRIPT_DIR>/<name>` via extension-routing (verified at `git show adaacbe:.cleargate/scripts/run_script.sh` L40–55). The NEW wrapper executes whatever first arg is on PATH:

```
$ bash .cleargate/scripts/run_script.sh init_sprint.mjs SPRINT-DOES-NOT-EXIST
.cleargate/scripts/run_script.sh: line 87: init_sprint.mjs: command not found
EXIT: 127
```

These commands will fail in any v2 sprint the moment the user runs `cleargate sprint init`, `cleargate sprint close`, `cleargate state update`, `cleargate state validate`, `cleargate gate qa`, or `cleargate gate arch`. The breakage is invisible to the QA suite because every command-test injects `spawnFn: spawnMock as never` and asserts on `args[0..2]` — they never invoke the real wrapper.

### 2b. Documentation prose still in OLD form

| File | Line | OLD-form reference |
|---|---|---|
| `cleargate-planning/.claude/agents/architect.md` | 60 | `invoke `run_script.sh pre_gate_runner.sh` to verify environment health` |
| `cleargate-planning/.claude/agents/architect.md` | 62 | `invoke `run_script.sh update_state.mjs <story-id> Escalated`` |

These are agent-prompt instructions to Architect describing how to invoke pre-gate and state-update scripts. Under the NEW interface they would also fail — Architect would read the prompt, run `bash run_script.sh update_state.mjs ...`, get exit 127.

Mirrored in `cleargate-cli/templates/cleargate-planning/.claude/agents/architect.md` (npm payload). Both copies still carry the OLD form.

### 2c. Test files (consistent — pass spawnMock, untouched by interface flip)

`cleargate-cli/test/commands/{sprint,state,gate-v2}.test.ts` all use `spawnMock as never` to assert on `args` shape. They confirm the OLD-form `args[1] === 'init_sprint.mjs'` etc. — meaning the tests themselves CODIFY the old interface. They do not exercise the wrapper. They will continue passing even though the production code is broken.

---

## 3. Self-Exemption Correctness

**Verdict: SOUND for the documented use-case; one nested-invocation caveat.**

The guard at `run_script.sh:29–32`:
```bash
if [[ "${RUN_SCRIPT_ACTIVE:-}" == "1" ]]; then
  exec "$@"
fi
```

…fires before the env var is set at L84 (`export RUN_SCRIPT_ACTIVE=1`). If a wrapper-invoked command itself calls `bash run_script.sh ...`, the inner invocation sees `RUN_SCRIPT_ACTIVE=1` and bypasses the wrapper entirely via `exec "$@"`. This is correct — it prevents recursive incident-JSON generation and double-truncation.

Caveat: nested invocation passes through ALL captures, including stdout/stderr split and incident JSON write. If a wrapped command itself orchestrates several sub-scripts and one fails, only the OUTER wrapper records the failure (with the outer command's args). The inner failure is lost from the incident record. This matches §6 of CR §0.5 reasoning ("scope out for v1") and is acceptable, but worth noting for CR-049 future work on nested-context capture.

The `exec "$@"` path correctly inherits exit code from the inner command (no wrapper-imposed exit-code mangling). Tested implicitly by Scenario 3 propagation.

---

## 4. Mirror Parity

**Verdict: OK at the file-level for run_script.sh + 5 agent prompts + SKILL.md.**

Verified:
- `diff .cleargate/scripts/run_script.sh cleargate-planning/.cleargate/scripts/run_script.sh` → empty (byte-identical, both 201 lines).
- `diff -r cleargate-planning/.claude cleargate-cli/templates/cleargate-planning/.claude` → empty (npm-payload mirror clean).
- MANIFEST.json regenerated with updated SHAs for the 5 agent files + SKILL.md (visible in commit stat).

Caveat (not parity-blocking but worth flagging): the OLD-interface prose at `architect.md:60+62` is identical in canonical and npm payload — i.e. the bug is mirrored faithfully. Mirror-parity passes; correctness fails. This is the same class of bug as BUG-024 / CR-026 (canonical bug ships through to live) — just much smaller blast radius.

---

## 5. Sprint-Goal Advancement

**Goal clause:** *"script failures become structured incident reports instead of raw bash output"*

**Verdict: PARTIALLY DELIVERED.**

What works:
- Wrapper captures stdout + stderr + exit-code + cwd + cmd + args into JSON when invoked with the NEW interface AND the wrapped command exits non-zero.
- JSON schema is typed (`script-incident.ts`), validated by 31-test suite, written to per-sprint or `_off-sprint` bucket.
- Reporter prompt extension (workflow step 7) wires aggregation into REPORT.md §Risks Materialized.
- 5 agent prompts mandate the wrapper for new-style invocations.

What does NOT work:
- The pre-existing v2 production paths (`cleargate sprint init`, `cleargate state update`, `cleargate gate qa`, etc.) are now BROKEN, not better-instrumented. A user invoking `cleargate sprint init SPRINT-24 --stories CR-050` gets `command not found` from the wrapper instead of either (a) the NEW captured incident JSON or (b) the OLD passthrough behavior.
- Net behavior change for existing users: degradation. CR-046 advances the goal for FUTURE agent dispatches but actively regresses six production CLI surfaces.

The goal clause is delivered for the green-field surface (agent dispatches) but breaks the brown-field surface (CLI commands). Net: incomplete advancement.

---

## 6. Hot-File Risk

**Verdict: MED. SKILL.md §C dispatch contract was edited; CR-045 already merged; CR-047 still inbound and needs the post-CR-046 line numbers re-pinned.**

SKILL.md edits in this CR (commit 0540f9d):
- §C.3 QA-Red — added one-line wrapper-mandatory rule (~L223)
- §C.4 Developer — added one-line wrapper-mandatory rule (~L250)
- §C.5 QA-Verify — added one-line wrapper-mandatory rule (~L280)
- §C.6 Architect Pass — added one-line wrapper-mandatory rule (~L302)
- §C.11 Script Invocation Contract — NEW section appended (~L423–436)

Drift impact for CR-047:
- M1 plan CR-047 (L222) anticipates inserting NEW `### C.10 Mid-Sprint Triage` and renumbering existing §C.10 → §C.11. With CR-046 already inserting a NEW §C.11 (Script Invocation Contract), CR-047 must now renumber existing §C.10 → §C.11 → §C.12 (i.e. existing §C.10 ends up as §C.12, and CR-046's new §C.11 ends up as either §C.11 stays or becomes §C.12; either way collision risk).
- M1 plan §Cross-CR Open Decision Resolutions item 4 anticipated this: *"When CR-047 inserts NEW §C.10 + renumbers existing §C.10 → §C.11, CR-046's appended section renumbers from §C.11 → §C.12. Dev for CR-047 MUST update CR-046's appended section header in same commit."* This is documented but not yet executed.
- L43 forward-reference to "(§C.10)" in SKILL.md is still pointed at the old §C.10. CR-047 must rewrite that.

CR-045 / CR-047 / CR-048 downstream re-pinning protocol per M1 plan §Cross-CR Re-Pin Protocol is intact; CR-046 added work to CR-047 (one extra renumber step) but did not break the protocol.

5 agent prompts received the IDENTICAL `## Script Invocation` block. Spot-check confirms byte-equality of the 5 inserted blocks (QA verified at §SPOT-CHECKS). Future CRs editing these prompts must respect the verbatim-identical convention.

Bash truncation note: `${var:0:N}` is char-index, not byte-count. M1 plan §CR-046 §Risks #4 flagged this and prescribed ASCII-only Scenario 5; QA verified ASCII used. Acceptable for v1 but is a future CR-049 concern. Document this in flashcards (see below).

---

## 7. Verdict

**ARCH: KICKBACK**

Rationale: the wrapper rewrite is correctly implemented in isolation and QA-Verify's 7/7 acceptance + 31-test PASS is technically valid against the CR's own scenarios. But the rewrite silently broke six production CLI command surfaces (`sprint init`, `sprint close`, `state update`, `state validate`, `gate qa`, `gate arch`) by flipping the wrapper interface from `run_script.sh <script-name.{mjs,sh}>` (extension-routed) to `run_script.sh <executable>` (PATH-resolved). All six call-sites were untouched by this CR. Their tests pass via `spawnMock` injection — nothing exercises the wrapper end-to-end against them.

This breakage is reachable by any user running `cleargate sprint init` / `cleargate state update` / `cleargate gate qa` under `execution_mode: v2`. Reproducer:

```bash
$ bash .cleargate/scripts/run_script.sh init_sprint.mjs SPRINT-X
.cleargate/scripts/run_script.sh: line 87: init_sprint.mjs: command not found
EXIT: 127
```

Two fix paths, both viable, neither in scope for this CR's already-shipped commit. Pick one and dispatch follow-up:

**Path A — preserve OLD interface as a back-compat sugar.** Wrapper detects when first arg ends in `.mjs` / `.sh` and routes via extension (matching OLD behavior). Add explicit "if you want raw exec, prefix with `--`" or use bare command form. Cost: ~15 lines of bash; preserves every existing call-site without code change. Compatible with the new agent-prompt verbatim block (because `node ./close_sprint.mjs` and `bash ./pre_gate_runner.sh` both still work as the explicit form).

**Path B — update all six call-sites + 2 doc lines to the new explicit form.** `args = [runScript, 'node', '.cleargate/scripts/init_sprint.mjs', ...]`. Cost: 6 src/commands files + 2 architect.md lines + mirror-sync, plus the corresponding test fixtures. ~50 LOC.

Path A is faster and lower-risk for SPRINT-23 in-flight; Path B is cleaner long-term. Recommend a follow-up CR (CR-046b or BUG-NNN, your call) before this rewrite ships to a release tag. Until then, the M1 plan goal-clause delivery is "future agent dispatches gain structured incident reports; existing CLI commands silently break under v2."

---

```
ARCH: KICKBACK
DRIFT_FROM_M1: orphaned production callers in cleargate-cli/src/commands/{sprint.ts:237,sprint.ts:284,state.ts:87,state.ts:130,gate.ts:420,gate.ts gateArch}; 2 OLD-form prose lines at architect.md:60+62
OLD_INTERFACE_CALLERS: 6 production CLI call-sites (sprint init/close, state update/validate, gate qa/arch) + 2 agent-prompt prose lines
SELF_EXEMPTION_SOUND: yes (one nested-capture caveat — inner failures lost from outer incident JSON; acceptable for v1)
MIRROR_PARITY: ok (run_script.sh + 5 agents + SKILL.md byte-identical canonical↔npm-payload; the OLD-form prose bug at architect.md:60+62 is mirrored faithfully)
GOAL_ADVANCEMENT: partial — clause delivered for new agent dispatches; CLI surface regresses (exit 127 instead of structured-incident OR passthrough)
HOT_FILE_RISK: med (SKILL.md §C.11 added; CR-047 still inbound and must re-pin its renumber against CR-046's new §C.11; documented in M1 §Cross-CR Open Decision Resolutions item 4 but unexecuted)
flashcards_flagged:
  - #cr-046 #wrapper #breaking-change · run_script.sh interface flip from <script-name.{mjs,sh}> to <executable> orphaned 6 cleargate-cli/src/commands callers under v2; spawnMock-only tests masked breakage. Always run an integration sanity-pass after wrapper-interface rewrites.
  - #wrapper #char-vs-byte · ${var:0:N} is char-index not byte-count; ASCII-safe but may split UTF-8 multi-byte chars at truncation boundary. Document or fix in CR-049.
  - #ci #spawn-mock-blindspot · Test patterns that pass spawnFn: spawnMock as never never exercise the wrapped script and cannot detect interface drift in run_script.sh. Pair every wrapper change with at least one e2e integration test that invokes the production CLI command path.
  - #self-exemption #nested-capture · RUN_SCRIPT_ACTIVE=1 + exec "$@" silently drops inner-script failure capture. Acceptable for v1; flag for nested-incident scope in CR-049.
```

---

## Re-Review After Path A Fix

**Re-review date:** 2026-05-04
**Fix commit:** `763e7f7` (on top of `0540f9d`)
**Stat:** +387 / -4 across 4 files (`run_script.sh` canonical+nested-mirror +26 each; `architect.md` canonical +2/-2; new `run-script-wrapper-backcompat.node.test.ts` +335).
**Review scope:** Delta only. Only the four touched files were re-inspected; §1–§7 above remain accurate for the pre-fix state.

### A1. Path A back-compat shim — does it resolve the 6 orphaned call-sites?

**Verdict: YES. The shim is correctly placed and uses the right routing predicate.**

Shim location: `.cleargate/scripts/run_script.sh:50–63` (after self-exemption guard at L36–39, after usage guard at L44–47, before project-root resolution at L67). This is the right insertion point — self-exemption still wins (avoids double-shimming when the routed `node`/`bash` invocation re-enters via PATH lookup, which it doesn't but the guard order is defensive), and the shim runs before `mktemp` / `RUN_SCRIPT_ACTIVE=1` export so the captured `command`/`args` JSON fields reflect the routed invocation (`command="node"`, `args=["<abs-path>/init_sprint.mjs", ...]`) rather than the original bare name. That is the correct semantics — incident JSON shows what was actually exec'd.

Routing logic (L55–63):
```bash
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
_ARG1="${1}"
if [[ "${_ARG1}" == *.mjs && -f "${SCRIPT_DIR}/${_ARG1}" ]]; then
  set -- node "${SCRIPT_DIR}/${_ARG1}" "${@:2}"
elif [[ "${_ARG1}" == *.sh && -f "${SCRIPT_DIR}/${_ARG1}" ]]; then
  set -- bash "${SCRIPT_DIR}/${_ARG1}" "${@:2}"
fi
```

Critique:
- `*.mjs && -f "${SCRIPT_DIR}/${_ARG1}"` predicate is conservative — only routes if the file actually exists in the wrapper's own directory. A bare `.mjs` name not present in `SCRIPT_DIR` falls through to arbitrary-cmd path and fails on PATH lookup (exit 127). This is documented in Scenario C.3 of the new test and is correct behaviour: the shim does not silently catch typos; it only revives the OLD interface for files that were always meant to be there.
- `BASH_SOURCE[0]` resolution uses `cd "$(dirname ...)" && pwd`, which canonicalizes through symlinks. Matches the pattern at L84 (fallback project-root). Sound.
- `"${@:2}"` correctly forwards remaining args; quoting preserves whitespace + special chars in args. Matches the original wrapper's pattern.
- Smoke-tested live: `bash .cleargate/scripts/run_script.sh assert_story_files.mjs CR-NONEXISTENT` reaches the script (gets a sane "ENOENT: no such file or directory" error from assert_story_files.mjs itself), proving the routing fired. Pre-fix this exited 127 with `command not found`.

All 6 production call-sites listed in §2a now reach their target script:
- `init_sprint.mjs` → `node SCRIPT_DIR/init_sprint.mjs` ✓
- `close_sprint.mjs` → `node SCRIPT_DIR/close_sprint.mjs` ✓
- `update_state.mjs` → `node SCRIPT_DIR/update_state.mjs` ✓
- `validate_state.mjs` → `node SCRIPT_DIR/validate_state.mjs` ✓
- `pre_gate_runner.sh` (qa branch) → `bash SCRIPT_DIR/pre_gate_runner.sh` ✓
- `pre_gate_runner.sh` (arch branch) → `bash SCRIPT_DIR/pre_gate_runner.sh` ✓

Dev's smoke claim (`cleargate sprint preflight SPRINT-23` no longer 127s) is consistent with the routing logic; I did not re-run the CLI command itself but the shim semantics align with the claim.

### A2. Architect.md prose update — verified

**Verdict: YES on canonical. NO on npm payload mirror — drift introduced by this fix commit.**

`cleargate-planning/.claude/agents/architect.md`:
- L60: `invoke `bash .cleargate/scripts/run_script.sh pre_gate_runner.sh` to verify environment health` ✓ (was: `invoke `run_script.sh pre_gate_runner.sh`...`)
- L62: `invoke `bash .cleargate/scripts/run_script.sh update_state.mjs <story-id> Escalated`` ✓ (was: `invoke `run_script.sh update_state.mjs ...``)

Both lines use the full explicit form. With the back-compat shim in place these would both work via either form, but the explicit form is what the new §C.11 dispatch contract documents — agents should learn one canonical form. Correct choice.

**Mirror gap:** `diff cleargate-planning/.claude/agents/architect.md cleargate-cli/templates/cleargate-planning/.claude/agents/architect.md` returns the same two-line diff Dev just removed from canonical. The npm-payload mirror was NOT updated by `763e7f7`. Same applies to `cleargate-cli/templates/cleargate-planning/.cleargate/scripts/run_script.sh` — still has the pre-shim wrapper.

This is **not a release blocker**: `cleargate-cli/scripts/copy-planning-payload.mjs` runs in `npm run prebuild` and rsyncs canonical → npm payload before any `npm publish`. So the next `cleargate init` on a freshly-built CLI will pick up the fix. But the working-tree state shows mirror drift, which violates the CLAUDE.md "canonical edit + manual re-sync, every time" rule and is the same class of latent bug as BUG-024. DevOps will cure it on close-out via prebuild; the human/Reporter should be aware.

### A3. Companion test exercises the regression path end-to-end

**Verdict: YES. The new test invokes the real wrapper via `spawnSync('bash', [WRAPPER_SCRIPT, ...])` with no spawn mocking — exactly the gap that caused the original kickback.**

`cleargate-cli/test/scripts/run-script-wrapper-backcompat.node.test.ts` (335 LOC, 7 assertions across 3 scenarios):

- **Scenario A (.mjs routing):** Copies the real `run_script.sh` into a tmp dir alongside a fixture `.mjs` that prints `mjs-routed`. Invokes `bash <wrapper-copy> fixture_backcompat.mjs`, asserts exit 0 + stdout contains `mjs-routed`. This proves node was actually exec'd against the file in `SCRIPT_DIR` (where SCRIPT_DIR resolves to the tmp dir because the wrapper was copied there). Plus a second assertion: no incident JSON written on success.
- **Scenario B (.sh routing):** Same pattern with a fixture `.sh` printing `sh-routed`. Asserts exit 0 + stdout match + no incident JSON.
- **Scenario C (arbitrary-cmd unchanged):** Invokes `true` (exit 0), `sh -c 'exit 5'` (exit 5 propagation), and `nonexistent_script_xyz.mjs` (exit non-zero — proves the shim does NOT swallow typos by routing through node when the file is absent).

Critique:
- The test does NOT use `spawnMock`. It exec's the actual wrapper. This is exactly the test pattern the original §2c critique called for ("Pair every wrapper change with at least one e2e integration test").
- Tmp-dir isolation: both scenarios A + B copy the wrapper into a fresh `os.tmpdir()` subdir per test — so SCRIPT_DIR resolves to the tmp location and the fixture file is found there. This is the right approach (avoids polluting the real `.cleargate/scripts/`) and proves the `BASH_SOURCE[0]`/`SCRIPT_DIR` resolution is correct under arbitrary install paths.
- Scenario C.3 is a particularly good edge case — it locks in the conservative-routing behaviour (no false-positive routing when the named file is missing). Future Devs cannot accidentally widen the predicate.
- Exit-code propagation tested in C.2 (`sh -c 'exit 5'` → status 5).
- Re-ran the suite locally: `npx tsx --test test/scripts/run-script-wrapper-backcompat.node.test.ts` → 7/7 pass, 4.5s wall-clock.

What's NOT tested (acceptable, scope-bounded):
- No assertion on the `command`/`args` shape inside the failure-incident JSON when the routed `.mjs`/`.sh` script itself fails. The test only covers success paths. A future CR could lock in `command: "node"` + `args: ["<abs-path>", ...rest]` after extension routing fires — would catch a bug where someone accidentally moves the shim AFTER the command-capture block. Not blocking.

### A4. Self-exemption + failure capture preservation

**Verdict: PRESERVED. No regression in original CR-046 scenarios.**

Spot-check:
- Self-exemption guard (L36–39) is still ABOVE the back-compat shim (L50–63). When `RUN_SCRIPT_ACTIVE=1`, `exec "$@"` fires before any extension routing. So a nested invocation with a bare `.mjs` name still executes `exec init_sprint.mjs` — which would fail with command-not-found, but that's the documented nested-skip behaviour: the inner invocation is supposed to be a direct exec, not a fresh wrapper run. The original 31-test suite covers this and Dev reports 38/38 pass post-fix.
- Failure-capture block (L122+) is unchanged — same 4KB truncation, same JSON schema, same `${var:0:N}` char-index limitation. Path A added 14 lines of routing logic and 12 lines of header comments; the capture pipeline is byte-identical.
- `RUN_SCRIPT_ACTIVE=1` export (L108) still fires AFTER the shim's `set --` rewrite. So when the routed `node`/`bash` child re-enters the wrapper for any reason, it correctly self-exempts. (This shouldn't happen in practice, but the ordering is defensive.)
- 31-test original suite + 7-test new back-compat suite = 38 tests pass per Dev's report.

### A5. Verdict

**ARCH_RE_REVIEW: APPROVED**

Path A correctly resolves the six orphaned call-sites without disturbing the new arbitrary-cmd interface. The companion test exercises the regression path end-to-end (no spawnMock), addressing the §2c root-cause of the original kickback. The architect.md prose is updated to the canonical explicit form. Self-exemption + failure capture are byte-preserved.

One outstanding issue: **npm-payload mirror drift** (`cleargate-cli/templates/cleargate-planning/.cleargate/scripts/run_script.sh` and `.../architect.md` were not updated in `763e7f7`). This is auto-cured by `npm run prebuild` (which the build pipeline runs before any publish) so it does NOT block this kickback resolution. But it should be mentioned in the close-out: either Dev manually mirror-syncs in a follow-up commit, or DevOps/Reporter relies on prebuild before the next release. Adding a flashcard for this.

The story can proceed to merge.

```
ARCH_RE_REVIEW: APPROVED
KICKBACK_RESOLVED: yes
NEW_REGRESSIONS: none in code paths; npm-payload mirror drift in working tree (auto-cured by prebuild before publish, not release-blocking)
flashcards_flagged:
  - #cr-046 #back-compat-shim · run_script.sh extension-routing shim with -f SCRIPT_DIR/* predicate revives OLD interface for production callers without breaking the new arbitrary-cmd surface; conservative predicate avoids typo false-positives.
  - #wrapper #e2e-test-pattern · For wrapper-interface changes, write a node:test that copies the wrapper into os.tmpdir() alongside fixture scripts and spawnSync's the real wrapper; this catches interface drift that spawnMock-style command tests cannot.
  - #mirror-drift #prebuild-cure · Mid-fix commits that touch only canonical (cleargate-planning/) leave the npm-payload mirror stale; prebuild script auto-cures before publish so it's not a release blocker, but report on close-out so reviewers don't mistake working-tree drift for an unfixed bug.
```
