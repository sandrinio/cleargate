---
bug_id: BUG-066
parent_ref: EPIC-043
parent_cleargate_id: EPIC-043
sprint_cleargate_id: null
carry_over: false
status: Draft
severity: P2-Medium
reporter: orchestrator
approved: false
area: planning-layer
context_source: verified codebase grounding — quantified by the CR-107 TPV mutation gate during SPRINT-39 wave 11 and independently surfaced by CR-107's QA-Red; routed to the orchestrator by TPV ruling T8 with the explicit instruction to file it rather than hand it to CR-107; no prior approval, filed for triage
created_at: 2026-08-29T00:00:00Z
updated_at: 2026-08-29T00:00:00Z
created_at_version: cleargate@0.24.2
updated_at_version: 8746a8d4-dirty
server_pushed_at_version: null
draft_tokens:
  input: null
  output: null
  cache_read: null
  cache_creation: null
  model: null
  sessions: []
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-08-29T12:10:10Z
  transition: ready-for-fix
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
---

# BUG-066: `test_close_pipeline.sh` reports PASS for scenarios that never execute `close_sprint.mjs`

## 1. The Anomaly (Expected vs. Actual)

Several scenarios in `.cleargate/scripts/test/test_close_pipeline.sh` invoke the script under
test by passing a **bare filename** to `run_script.sh` instead of `node <path>`. The bare name
does not resolve, the shell reports "command not found", and the invocation exits non-zero
**without ever running `close_sprint.mjs`**.

Because those scenarios assert *"exits non-zero"*, **a missing command trivially satisfies the
assertion** and the scenario reports **PASS**.

**Expected:** a scenario that reports PASS has exercised the code path it names.

**Actual:** it reports PASS for a script that never ran. The harness is green about behaviour it
has not observed.

Quantified by the CR-107 TPV gate against the pre-CR-107 file — of **12** pre-existing passes:

| Class | Count | Which |
|---|---|---|
| **Vacuous pass** — assertion satisfied by "command not found" | **4** | scenario 1a, 1d, CR-036 A, CR-036 C |
| **Non-executing self-assertion** — asserts on fixture state, never invokes the script | **4** | 3a, 3b, 3c, 3d |
| Genuine | 4 | — |

**Zero of the twelve exercise `close_sprint.mjs`.** Eight of the file's ten pre-existing
*failures* trace to the same line-level defect.

## 2. Reproduction Protocol

1. **Run the harness and record the baseline pair.** It is deterministic across runs.

```bash
bash .cleargate/scripts/test/test_close_pipeline.sh; echo "exit=$?"
#   18 passed, 22 failed   (pre-CR-107 file; exit 1)
```

2. **Show the defective invocation style.** Compare a scenario that passes a bare filename with
   one that routes through `node "${SCRIPTS_DIR}/close_sprint.mjs"`.

```bash
command grep -n 'run_script.sh' .cleargate/scripts/test/test_close_pipeline.sh | head -20
command grep -n 'node "\${SCRIPTS_DIR}/close_sprint.mjs"' .cleargate/scripts/test/test_close_pipeline.sh | head
```

3. **Demonstrate the vacuity directly** — a non-existent command satisfies an "exits non-zero"
   assertion just as a real failure does.

```bash
bash -c 'definitely_not_a_real_script.mjs' 2>/dev/null; echo "exit=$? (non-zero => assertion satisfied)"
```

4. **Prove the scenarios never reach the script**, by instrumenting rather than reasoning: add a
   temporary `process.stderr.write('REACHED\n')` as the first line of `close_sprint.mjs`, re-run
   the harness, and count `REACHED` occurrences against the number of scenarios that claim to
   invoke it. Revert the instrumentation afterwards.

5. **Show the repair changes the result with zero production change.** Correcting only the
   invocation style moves the file from `18 passed / 22 failed` to `27 passed / 17 failed` — and
   exposes a **real latent failure in CR-036 Scenario C** that the vacuous pass had been hiding.

## 3. Evidence & Context

- **This is the failure mode the harness exists to prevent, occurring in the harness itself.** A
  green check for a script that never ran is strictly worse than a red one: it consumes the
  reviewer's trust budget and reports coverage that does not exist.
- **It has persisted for many sprints.** The file has been in this state since before commit
  `2deaf216`, so scenarios 1, 2, 4, 5, 6 and CR-036 B have not exercised `close_sprint.mjs` across
  every sprint close in that window.
- **A real defect was hiding behind it.** CR-036 Scenario C's vacuous pass conceals an actual
  failure, which surfaces the moment the invocation is corrected. That is the concrete cost, not a
  hypothetical one.
- **The blast radius is the sprint close gate.** `close_sprint.mjs` runs the lifecycle reconciler,
  the Step 2.7 worktree check and the Step 2.8 merge check — the terminal boundary protecting
  `main`. Its regression harness reporting unearned green is a Gate-4-class exposure.
- **Not [[CR-107]]'s to fix.** TPV ruling T8 routed this here explicitly: CR-107's Developer must
  not touch those scenario functions and must not be judged on their reds. CR-107's own new
  scenarios were **verified free of the defect** — all route through
  `node "${SCRIPTS_DIR}/close_sprint.mjs"`, proven twice, including by all 12 flipping green under
  a reference implementation.
- Failure-mode family: a check that is **wrong rather than absent**, so nothing raises — the same
  shape as [[BUG-042]], [[BUG-063]], [[BUG-064]].

## 4. Execution Sandbox (Suspected Blast Radius)

- `.cleargate/scripts/test/test_close_pipeline.sh` — the invocation style in the affected
  scenario functions, and the assertion strength behind them.

**Do NOT modify:** `.cleargate/scripts/close_sprint.mjs`. This bug is entirely in the harness;
the script under test is not implicated. Any production change here would be a scope error.

**Interaction:** this file is **live-only** — it has no counterpart in `cleargate-planning`, whose
`scripts/test` directory ships 10 of the live 23 test scripts. So the repair improves this repo's
own gate and ships to nobody, which is a separate gap worth its own decision.

## 5. Verification Protocol (The Failing Test)

**Command:** `bash .cleargate/scripts/test/test_close_pipeline.sh`

1. **The failing case.** A meta-assertion that every scenario claiming to invoke `close_sprint.mjs`
   actually reaches it — e.g. via a sentinel env var the script echoes, counted per scenario.
   **Must fail against the current tree**, naming the non-executing scenarios.
2. **"Exits non-zero" is never the sole assertion for a failure case.** Each such scenario must
   also assert the step's own verdict line, so a missing command cannot satisfy it. This is the
   generalisation of TPV ruling T1, which found the identical defect in a *new* scenario.
3. After the repair the pair reads **`27 passed / 17 failed`** with zero production change, and the
   newly-exposed CR-036 Scenario C failure is either fixed or explicitly recorded as known.
4. Regression: the 4 genuine pre-existing passes stay green, and no scenario's assertion is
   weakened to reach the target number.

**Note on acceptance:** the number pair improving is **not** sufficient. Criterion 1 is what makes
the improvement mean something — without it, the same vacuity can reappear in the next scenario
anyone adds.

## Prior work

- `cleargate wiki query "close pipeline test harness vacuous pass"` → **none found**.
- [[CR-107]] — surfaced this; TPV ruling T8 routed it here rather than folding it in.
- [[BUG-042]], [[BUG-063]], [[BUG-064]], [[BUG-065]] — the wrong-rather-than-absent family.
- [[BUG-059]] — the surface gate going inert on non-story waves; same class of "a gate that reports
  success while not running".
- No prior item covers `test_close_pipeline.sh`.

## Context Source

**context_source:** Quantified on 2026-08-29 by the CR-107 TPV mutation gate during SPRINT-39
wave 11, after CR-107's QA-Red independently reported that 10 of the file's 22 original checks were
already failing on bare-filename invocations. TPV measured the pass side as well and found 4 vacuous
passes and 4 non-executing self-assertions among the 12. Filed under [[EPIC-043]] as framework
hygiene, per the standing routing for tech-debt findings.

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟡 Medium Ambiguity**

*Evaluate each criterion against its literal text. If you substituted an interpretation, leave the box unchecked and surface the substitution in the Brief.*

Requirements to pass to Green (Ready for Fix):
- [x] Reproduction steps are 100% deterministic.
- [x] Actual vs. Expected behavior is explicitly defined.
- [x] Raw error logs/evidence are attached.
- [x] Verification command (failing test) is provided.
- [ ] Decided whether the newly-exposed CR-036 Scenario C failure is fixed here or split to its own item.
- [ ] `approved: true` is set in the YAML frontmatter.
