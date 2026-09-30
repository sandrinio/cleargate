# BUG-105 — Test Pattern Validation

role: architect

TPV: APPROVED

## Scope and provenance

Read-only wiring review of QA seal `23a8e86a299b1b7e16e7a7a6545298fa5cf701fd`, parent production base `c6d665656d886810faf31b8feb11f8ce2600ae79`, in `/Users/ssuladze/Documents/Dev/ClearGate/.worktrees/BUG-105/cleargate-cli`. Git root, parent, changed-file list and clean CLI status verified. Only this report is authored by this dispatch.

Binding inputs: raw BUG-105, M7 §3 BUG-105 / E2 / OD-M7-8, sprint context and append-only amendments, QA RED report, Architect profile's TPV mode. State is standard lane / Bouncing. The context has no `Active CRs` heading; its existing amendments supply the approved decisions. M7 explicitly requires live TPV and supersedes the raw prohibition on modifying the canonical Claude hook: the missing-target skip is Codex-only inside that shared source.

Flashcard check applied: canonical Codex hooks are generated from Claude sources; copied hooks require sibling `lib/harness.sh`; independently recompute seal hashes; append refusal hashes rather than replacing earlier witnesses; keep test environment sanitized. No new lesson or scope amendment required.

## Wiring findings

| TPV check | Result and evidence (paths relative to CLI worktree) |
|---|---|
| Imports | PASS. New test imports resolve to existing exports: `src/lib/session-load-delta.ts:77`, `src/commands/new.ts:202`, `test/helpers/init-fixture.ts:304`, and `test/helpers/scaffold-roots.ts:21,36,88`. The helper's dynamic import resolves to `src/lib/manifest-builder.ts:805`. Node built-ins are valid. |
| Calls / constructors | PASS. `extractSessionLoadDelta` accepts three strings; `newHandler` accepts `{type,slug}` plus the supplied cwd/output/exit/time seams (`new.ts:38–46,202–210`); `runInitScenario('fresh', {payloadDir,extra})` matches its options and override spread (`init-fixture.ts:209–228,269–305`). The only new constructor is standard `Error`. |
| Mock targets | PASS. The sole new `t.mock.method` targets existing `process.stderr.write` and restores it in `finally` (`codex-install-papercuts.red.node.test.ts:22–38`). This is the actual banner sink (`src/lib/banners.ts:15–21`), reached from init (`src/commands/init.ts:784–785`). |
| Setup / teardown | PASS. New fixture roots are nested under one scratch parent with `after` removal (`new red:14–19`); copied hook and harness are colocated (`:57–60`), PATH forwards edit-targets to this worktree's real CLI (`:65–76`), and hook subprocesses are synchronous and bounded. `runInitScenario` restores its temporary env override in `finally` and registers its own temporary roots for exit cleanup (`init-fixture.ts:65–86,309–337`). Snapshot tests retain per-case cleanup and composed-payload cleanup (`init.node.test.ts:148–150,190–195`); Test37 writes stay beneath its already-cleaned fixture parent (`codex-hook-scripts.red.node.test.ts:33–42,232–239`). |
| Naming / discovery | PASS. New file is `test/commands/codex-install-papercuts.red.node.test.ts`, matching sprint `*.red.node.test.ts`. Existing `init.node.test.ts` and `codex-hook-scripts.red.node.test.ts` retain their names; the M7-authorized historical snapshot amendment belongs in the existing init suite. |

The init helper's `extra.cwd` deliberately points installation at the explicit git fixture; the new test returns that root rather than consuming the helper's separately enumerated file record. Host-specific composition uses `composeCanonicalView`, so Codex receives a Codex payload. No live install is invoked.

The snapshot amendment preserves the old lock as an existence assertion and adds a new rendered-byte comparison at `init.node.test.ts:850–878`, with fixed pin `0.5.0`. Missing `stamp-and-gate.bug-105.sh` is the specified future Developer artifact, not an unresolved import or TPV wiring gap. Capture it only after the implementation; retain the old lock.

The authorized Test37 amendment adds only the two delivery files advertised by its successful Add File payload. The original payload, filter assertions and test count are unchanged. The fixture now represents post-tool filesystem state; no acceptance assertion was removed.

## Requirements and counters

The six registered scenarios map to M7's six-case blueprint: absent MCP/Codex banner; malformed MCP/plain Claude banner; deleted Codex target plus added sibling and Claude negative control; prose slug; valid slug; empty normalized slug. One additional snapshot test makes the default-suite delta **+7**. The sealed refusal extension retains the prior M2 refusal and adds the measured pre-fix hash. This is a wiring verdict, not semantic test certification or production acceptance; no mutation or test execution was performed by this dispatch.

QA's recorded execution remains the evidence: six new tests **3 pass / 3 intended fail**, init **34 pass / 1 expected missing-lock fail**. No new suite total is inferred. Existing `qa_bounces=0`, `arch_bounces=0`; this approval requires no bounce increment. Breaker counter not present in the inspected item record; no breaker event introduced. Usage telemetry unavailable.

Developer requirements remain unchanged: canonical Codex-gated hook fix and regeneration, rendered lock capture, absent-to-absent MCP fix, prescribed slug normalization; then required targeted/typecheck/M2 parity checks. QA-Verify retains test 46 and allocated harness work. RS-M7c remains a later boundary obligation. Additional normalization-edge tests are outside this wiring-only review; no scope expansion is requested.

## Independently checked seal hashes

| File | SHA-256 |
|---|---|
| `test/commands/codex-install-papercuts.red.node.test.ts` | `2b308af2958b4615a181606d0feeb933f5794f4047c44da07f9f7020946e425e` |
| `test/commands/init.node.test.ts` | `c4f1b72d65fc1512ab3a0a72c55d7179becf73513cd297c08a0eb2f5292a9efb` |
| `test/helpers/init-fixture.ts` | `0e6cc45c15fd8b55a44736c8a70281cdfc3eb96b11354cccc6375d63a084f1a7` |
| `test/hooks/codex-hook-scripts.red.node.test.ts` | `d5962b0f2435e65a94c5be74173bc77dca7771f48007508c97f5907736db6c10` |

## Script Incidents

None in this dispatch. Only read-only shell inspection, Git inspection, and `shasum` were used; no standalone bash/node scripts, suite, harness, build, install, state mutation, seal edit, merge or commit ran. Checks were manual, not host-fired enforcement.
