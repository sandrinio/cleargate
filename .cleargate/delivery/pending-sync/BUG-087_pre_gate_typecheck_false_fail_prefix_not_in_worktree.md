---
bug_id: BUG-087
parent_cleargate_id: null
sprint_cleargate_id: SPRINT-43
carry_over: false
status: Draft
severity: P2-Medium
ambiguity: 🟡 Medium
approved: false
context_source: "Differential scan run 2026-09-06: main checkout EXIT=0 / 4 passed vs detached probe worktree of the same commit EXIT=1 / [FAIL] typecheck exit 254; corroborated by SPRINT-40/orchestrator-log.jsonl:2"
area: sprint-execution,pre-gate,worktree,multi-repo
created_at: 2026-09-06T00:00:00Z
updated_at: 2026-09-06T00:00:00Z
created_at_version: cleargate@0.26.1
updated_at_version: cleargate@0.26.1
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-09-06T16:36:45Z
  transition: ready-for-fix
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id BUG-087
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-09-06T16:36:45Z
  sessions: []
---

# BUG-087: The Pre-Gate Typecheck Always FAILs in a Worktree Because `--prefix` Points Outside It

### Open Questions

- **Question:** Should the live `gate-checks.json` be blanked to match canonical's empty strings?
- **Recommended:** No. Commit `dfc1afa6` (2026-09-02) records the live/canonical divergence as deliberate — the live copy carries meta-repo typecheck/test commands, canonical ships empty strings. cleargate-cli stories run on a branch in the MAIN checkout, not a worktree, where the command genuinely runs and is the only automated typecheck+test standing over CLI source while BUG-053 is open. The existence guard alone gives `[INFO] typecheck: skipped` in worktrees and a real PASS/FAIL in the main checkout.
- **Human decision:** {populated during Brief review}

## 1. The Anomaly (Expected vs. Actual)

**Expected Behavior:** `pre_gate_runner.sh arch` returns a scan result whose exit code reflects whether the story's code actually typechecks. An unresolvable check reports `[INFO] <check>: skipped` and leaves `OVERALL_EXIT` alone.

**Actual Behavior:** Every outer-repo story in a worktree records `[FAIL] typecheck: exit code 254` and sets `OVERALL_EXIT=1`, regardless of the diff. `cleargate-cli/` is gitignored (`.gitignore:63`; `git ls-files cleargate-cli` returns 0), so it materialises in no worktree — but the guard only tests `-f "${WORKTREE}/package.json"`, which the repo root satisfies. npm then fails to find `cleargate-cli/package.json` and exits 254 before any compiler spawns.

The second-order effect is the real harm: a permanently-false FAIL trains the orchestrator to hand-wave scanner output as environmental. SPRINT-40's log shows exactly that, three times, plus a five-line prose explanation hand-written into §Test Stack to make the false FAIL self-documenting. A genuine typecheck failure would be waved through the same way.

## 2. Reproduction Protocol

- From a clean main checkout, run `bash .cleargate/scripts/pre_gate_runner.sh arch . <base-branch>`. Observe `EXIT=0`, 4 checks passed.
- Create a detached probe worktree of the same commit: `git worktree add --detach /tmp/probe HEAD`.
- Run `bash .cleargate/scripts/pre_gate_runner.sh arch /tmp/probe <base-branch>`.
- Observe `EXIT=1` and `[FAIL] typecheck: exit code 254`.
- Confirm the cause: `ls /tmp/probe/cleargate-cli/package.json` → no such file; `ls /tmp/probe/package.json` → exists (this is what the guard passes on).
- Confirm 254 is npm's failed-command code, emitted before any compiler runs (`tsc` itself only exits 0, 1 or 2).

## 3. Evidence & Context

```
--- differential scan, 2026-09-06
main checkout      : EXIT=0, 4 passed
detached worktree  : EXIT=1, [FAIL] typecheck: exit code 254

--- .cleargate/sprint-runs/SPRINT-40/orchestrator-log.jsonl:2
"pre_gate_runner.sh arch: 3 PASS / 1 FAIL. Sole FAIL = typecheck, exit 254,
 cause ENOENT cleargate-cli/package.json — the nested independent repo is
 gitignored in the meta-repo and is materialised in no worktree. Structural,
 diff-independent (story diff = 1 new .sh file, zero TypeScript). Resolved as
 environmental per sprint-context.md Test Stack backstop rule rather than by
 Architect TPV dispatch."

--- init_gate_config.sh:24,29 emits `npm run typecheck` unconditionally into
    every fresh install. Run at this repo root: npm error Missing script: "typecheck"
```

**Explicit non-claim.** This bug does NOT cause the sprint's TPV/post-flight dispatch count. That was measured and refuted: SPRINT-39 never invoked `pre_gate_runner` at all (0 Bash calls across a 17.8 MB orchestrator transcript) yet fired 13 TPVs, and SPRINT-40 ran the scan, got the 254 FAIL, and dispatched Developer next with zero TPVs. The orchestrator dispatches TPV by judgment and waives the scan by hand. **The measured wall-clock saving of this fix is zero.** Its value is that the scan's exit code starts meaning something, which is the precondition for ever making §C.3.5/§C.6 conditional on evidence instead of judgment.

## 4. Execution Sandbox (Suspected Blast Radius)

**Investigate / Modify:**
- `.cleargate/scripts/pre_gate_common.sh` — add `resolve_check_command <worktree> <cmd>`
- `.cleargate/scripts/pre_gate_runner.sh` — call sites at `:82`, `:188`, `:208`; route unresolvable to the existing `INFO skipped` branches at `:93`, `:198`, `:218`
- `.cleargate/scripts/init_gate_config.sh:24,29`
- Canonical mirrors of all three

**Do NOT modify:**
- `gate-checks.json` in either tree — the divergence is deliberate per `dfc1afa6`.
- `run_qa()` — `pre_gate_runner.sh` is only ever invoked in `arch` mode by the sprint loop (SKILL.md:364, :465); `qa` mode is reachable only from `cleargate gate qa`, which no dispatch path uses.

**Ship with:** a `STORY_ID` refusal on `pre_gate_runner.sh:397`. Making the scan capable of returning 0 ARMS a currently-dormant write: `:397` calls `update_state.mjs <ID> "Architect Passed"` on `lane=fast` + `OVERALL_EXIT=0` — a scanner authoring a lifecycle transition with no agent verdict. It has never fired because `OVERALL_EXIT` has never been 0 in a worktree. Fixing the scan without this guard is a regression, not a fix.

## Task Breakdown

- [ ] Add `resolve_check_command` to `pre_gate_common.sh`: if the command carries `--prefix <dir>`, require `<worktree>/<dir>/package.json`; else require `<worktree>/package.json`
- [ ] For `npm ... run <script>` forms, additionally require that script key to exist
- [ ] Wire the three call sites (`:82`, `:188`, `:208`) to route unresolvable commands to `INFO skipped`
- [ ] Add the `STORY_ID` refusal at `:397` so a now-reachable `OVERALL_EXIT=0` cannot author "Architect Passed" from a non-story branch
- [ ] Fix `init_gate_config.sh:24,29` to stop emitting an unconditional `npm run typecheck`
- [ ] Write the red test (main-checkout PASS vs worktree SKIPPED)
- [ ] Mirror all three scripts to canonical

## 5. Verification Protocol (The Failing Test)

**Command:** `bash .cleargate/scripts/test/bug087_prefix_resolution.red.sh`

The harness builds a `mktemp -d` git fixture containing a root `package.json` and a gitignored subdirectory, adds a worktree, and asserts: (a) pre-fix, a `--prefix <gitignored-dir>` check reports FAIL and sets `OVERALL_EXIT=1`; (b) post-fix it reports `INFO skipped` and leaves `OVERALL_EXIT` at 0; (c) the same command in the main checkout still reports a real PASS/FAIL; (d) `:397` refuses to write a state transition when `STORY_ID` did not come from a story branch.

**Test layers.** Declare all three below.

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 3 | `resolve_check_command`: `--prefix` present and resolvable, `--prefix` present and missing, no `--prefix` |
| Integration tests | 0 | No Postgres/Redis surface; the bash harness below covers the real worktree behaviour |
| E2E / acceptance tests | 4 | The four assertions above |

---

## Prior work

- [[EPIC-057]] — "Multi-repo story execution — routing, not just detection". Same root domain: gate and execution surfaces that assume a single-repo worktree. This bug is one concrete instance; it is filed standalone because the fix is a ~25-line guard, not a routing redesign.
- [[BUG-053]] — Draft. Overlaps on gate-environment cleanliness: `cleargate-cli` commits are ungated because that repo has no hook chain. BUG-053 is why the live `gate-checks.json` must NOT be blanked — the main-checkout run is currently the only automated typecheck standing over CLI source.
- [[SPRINT-41]] — covers fresh-install verification where worktree assumptions fail; adjacent, not the same defect.

## Context Source

**context_source:** Differential scan run 2026-09-06 (main checkout EXIT=0 / 4 passed; detached probe worktree of the same commit EXIT=1 / typecheck 254), corroborated by `SPRINT-40/orchestrator-log.jsonl:2`. Dispatch-count causation explicitly measured and refuted — see §3.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟡 Medium Ambiguity**

*Evaluate each criterion against its literal text. If you substituted an interpretation, leave the box unchecked and surface the substitution in the Brief.*

Requirements to pass to Green (Ready for Fix):
- [x] Reproduction steps are 100% deterministic.
- [x] Actual vs. Expected behavior is explicitly defined.
- [x] Raw error logs/evidence are attached.
- [x] Verification command (failing test) is provided.
- [ ] `approved: true` is set in the YAML frontmatter.

> The single unchecked box is the Gate-1 human decision. Note this item's saving is explicitly zero minutes — approve it for correctness and to unblock a later §C.6 decision, not for speed.
