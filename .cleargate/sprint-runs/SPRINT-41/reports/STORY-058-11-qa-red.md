# STORY-058-11 — QA-Red report

role: qa

```
QA-RED: WRITTEN
RED_TESTS:
  - test/scripts/codex-agents-codegen.red.node.test.ts
  - test/scaffold/portable-skills.red.node.test.ts
  - test/hooks/harness-shim.red.node.test.ts
  - test/docs/codex-enforcement-delta.red.node.test.ts
  - test/scripts/codex-hooks-harness.red.node.test.ts (Test 15, appended to the -10 file)
  - test/commands/init.node.test.ts (3 new STORY-058-11 active snapshot assertions, appended)
  - test/snapshots/hooks-snapshots.node.test.ts (1 new STORY-058-11 active snapshot assertion, appended)
  - test/helpers/init-fixture.ts (SANCTIONED_BASELINE_DELTAS x4 + shared row, SANCTIONED_BASELINE_ADDITIONS mechanism)
BASELINE_FAIL: 27+3+5+13+4+3+1 = 56 red assertions across the amended/new files (see per-file table); both M2 parity files 0/5 and 0/15 green (all rows red-by-design on the new harness.sh addition)
flashcards_flagged:
  - "2026-09-26 · #qa-red #test-harness · copyPayload picks created/skipped by real dest-exists+byte-diff, not overwrite_policy tiers — derive stdoutLine from the code, not the tier."
  - "2026-09-26 · #qa-red #test-harness #recipe · A byte-neutral parity lock (frozen vs canonical, same minimal payload) is a real anchor when both sides are still identical — it becomes the regression detector, not a vacuous pass."
```

Commit: `f4234f2` on cli `story/STORY-058-11` in `<cw>` = `/Users/ssuladze/Documents/Dev/ClearGate/.worktrees/STORY-058-11/cleargate-cli`, base `contract/S-41-codex` = STORY-058-10 Developer pass-B commit `d0f0d95`.

## Per-file red/anchor table

| File | Tests | Pass (anchor) | Fail (red) | Red reason |
|---|---|---|---|---|
| `test/scripts/codex-agents-codegen.red.node.test.ts` | 27 | 0 | 27 | `scaffold/hosts/codex/.codex/agents/**` does not exist; `planCodexPayload` does not yet plan agent/skill entries |
| `test/scaffold/portable-skills.red.node.test.ts` | 6 | 3 | 3 | `scaffold/core/.agents/skills/{flashcard,sprint-dashboard}/SKILL.md` and `.codex/agents/*.toml` do not exist yet. The 3 anchors (`payloadFilter` unit, no-flag flat view, `sprint-execution` absence) already hold because STORY-058-10 already wired `codexAdapter.sharedRoots() === ['.agents']` |
| `test/hooks/harness-shim.red.node.test.ts` | 5 | 0 | 5 | `scaffold/hosts/claude/.claude/hooks/lib/harness.sh` does not exist — every test fails at `source` time (missing file), never inside a function call |
| `test/hooks/hooks-claude-parity.red.integration.node.test.ts` | 19 | 19 | 0 | **ANCHOR file.** At this commit the frozen fixture (`test/fixtures/hooks-pre-058-11/`) is byte-identical to canonical (verified `cmp -s`, all 9 files) — the comparison is trivially satisfied. Becomes the regression lock once the shim lands: any observable divergence (exit code, stdout, stderr, or fixture-root file census) under a Claude-shaped payload fails it. |
| `test/docs/codex-enforcement-delta.red.node.test.ts` | 14 | 1 | 13 | §16 heading/section/11 required substrings absent (current max heading is §15). The 1 anchor is "canonical twin is byte-identical to outer live copy," true today for the whole file (both sides currently end at §15). |
| `test/scripts/codex-hooks-harness.red.node.test.ts` (Test 15 appended) | 71 (67 pre-existing + 4 new) | 67 | 4 | `codexHookVerdicts` does not know about `codex.live.roles`/`codex.live.skills` yet — every new assertion reads `undefined` off the verdicts map. Pre-existing 67 STORY-058-10 tests unaffected. |
| `test/snapshots/hooks-snapshots.node.test.ts` (amended) | 16 (15 anchor incl. 1 new historical-existence test + 1 new red) | 15 | 1 | `test/snapshots/hooks/token-ledger.story-058-11.sh` does not exist yet (not captured) |
| `test/commands/init.node.test.ts` (amended) | 34 (31 anchor + 3 new red) | 31 | 3 | `test/snapshots/hooks/{session-start,stamp-and-gate,pre-edit-gate}.story-058-11.sh` do not exist yet |
| `test/helpers/init-fixture.ts` (rows + mechanism; exercised via the M2 parity files below, no standalone test file) | — | — | — | See M2 parity section |

Solo-run totals (per-file `npm run test:file`, summed): **56 red**, **136 anchor** (19+3+67+15+31+1) across the touched/new files. Per rule 20 ("The full `npm test` runs only in the merge lane"), I did not run the full suite from this build lane; the flashcard-73/"sum the solo counts" cross-check is deferred to the merge lane's full-suite run.

## Integration-only exclusions

None of this story's tests need code that lands after STORY-058-10 (its base, C1, already merged/frozen the hook bytes and the harness contract this story implements against). All 56 red assertions are in the Developer's make-green set for THIS story.

The one caveat: `test/hooks/hooks-claude-parity.red.integration.node.test.ts`'s frozen fixture (`test/fixtures/hooks-pre-058-11/`) is pinned to C1 (`d0f0d95`). Per RP-A15 item 1 / the story's own §3.2 note: "if STORY-058-10 later changes a hook, QA-Red re-freezes them at integration." If -10's Developer report or a later bounce changes any of the 9 hooks before this story integrates, the fixture must be re-frozen (re-copied + re-hashed) at integration time — this is explicitly QA-Red's job, not the Developer's, per the contract-first re-plan.

## Frozen-hook sha256 list (`test/fixtures/hooks-pre-058-11/`, = canonical at C1 `d0f0d95`)

```
9803bce60f59548dc683599278f8b9ecf5a0c3ec2258056c1672f1f3aabc0bbb  session-start.sh
da609645ec2dbfbdbb0868def31a6ed4ecd38e8bc5d488ef0799414dc8455ec4  stamp-and-gate.sh
10092444c4221a81943d3476bea2029bc42bc39a97cae447a03cdaf9f4d45474  pre-edit-gate.sh
43a3cb26408109e7974f08db2dc38cf2cc2c4ea9e2fd6d5f23b556a6abfc1b30  pending-task-sentinel.sh
d0e5fb16cc83f96cc7dde0ffa58e7db1ad5fcd76893997a6fe3b7683cc372906  pre-tool-use-task.sh
b7c637c1bd24047da1943bca81942be980f6f1a2a52627e406b3048b155ad132  pre-tool-use-autonomy.sh
009f20b61d60c57848b0927bd06c9666f74f6fed1d4ec164f9cd5b6000a198d2  pre-commit-surface-gate.sh
314d545389e23b1e67136f3eb86643e952264dbe9b8cb3e4df61cf6ff17c3588  pre-commit.sh
f4d832bacff0f6d3f8fbccf5083dbee99690cbf369873fa2b7a72c47e37dee9e  token-ledger.sh
```

All 9 are raw (no pin-substitution — this is the *disk* sha256, matching how the fixture is compared byte-for-byte against `scaffold/hosts/claude/.claude/hooks/**` in the parity test). Verified `cmp -s` against the live canonical files before writing the fixture (all 9 identical, since HEAD = C1 = `d0f0d95` and nothing has touched hooks since).

`pending-task-sentinel.sh`'s raw sha256 above (`43a3cb26…b30`) matches the M5 plan's own pinned value (RP-A15 item 4 / M5.md "Superseded by…" note) exactly.

## Shared enforcement row sha256

`.cleargate/knowledge/cleargate-enforcement.md` M2-baseline hash (used by both the new `SANCTIONED_BASELINE_DELTAS` row and its `baselineHash`):

```
4c3e8083c9ae4d3adcf968a75b454135c1d51cc0b0f0bf412e3d7ea71f9a4fdb
```

Independently re-measured (`shasum -a 256` on the current canonical file, which is byte-identical to the outer live copy today) and cross-checked against the M2 baseline's `meta.json` in all 5 `INIT_SCENARIOS` (`fresh`, `user-content`, `reinit`, `malformed`, `force`), read-only, at `/private/tmp/cg-s41-m2-init-baseline/<scenario>/meta.json` — exact match in all 5. The plan §7.5 block was inserted **byte-for-byte** as pinned (verbatim `item: 'STORY-058-11+CR-124'` string, same comment, same refuse-baseline body).

The 4 new hook rows' `baselineHash` literals were independently re-measured the same way (pin-substituted where the hook carries `__CLEARGATE_VERSION__`, raw otherwise) and match the M5.md-pinned values and the M2 baseline `meta.json` exactly in all 5 scenarios:

| rel | measured hash (matches M5.md + M2 baseline) |
|---|---|
| `.claude/hooks/session-start.sh` | `2df579d102264bb25a3bd70aaf6c67b17b2af9375851d430157990cf3d208087` |
| `.claude/hooks/pre-tool-use-task.sh` | `d0e5fb16cc83f96cc7dde0ffa58e7db1ad5fcd76893997a6fe3b7683cc372906` |
| `.claude/hooks/pre-tool-use-autonomy.sh` | `b7c637c1bd24047da1943bca81942be980f6f1a2a52627e406b3048b155ad132` |
| `.claude/hooks/pre-commit-surface-gate.sh` | `009f20b61d60c57848b0927bd06c9666f74f6fed1d4ec164f9cd5b6000a198d2` |

## `bug085SentinelCurrentHash()` — post-(-10) refusal (RP-A15 item 4)

Added a third refusal to the existing function (in addition to `BUG085_SENTINEL_BASELINE` and `BUG085_SENTINEL_POST`): the pin-substituted hash of the CURRENT canonical `pending-task-sentinel.sh` (post-STORY-058-10, at C1), measured directly:

```
edb7df4d03a3844d44d0fac8bb7495478529e4dff1dd39ed628b73733abf0673
```

Note on the M5.md-cited value: the plan's "Superseded by…" note gives `43a3cb26408109e7974f08db2dc38cf2cc2c4ea9e2fd6d5f23b556a6abfc1b30` as "the raw canonical sha256 at d0f0d95" — that is the RAW (non-pin-substituted) hash, which I independently confirmed matches the fixture file exactly (see the frozen-hook sha256 list above). `bug085SentinelCurrentHash()` operates on `currentPinSubstitutedHash()` output, so the value that must actually be refused is the PIN-SUBSTITUTED hash (`edb7df4d…0673`), which I measured myself as instructed ("QA-Red measures the post-(-10) hash… with pin substitution"). Both values are recorded here for cross-reference.

## M2 parity (compare mode, read-only, `CLEARGATE_INIT_BASELINE=/private/tmp/cg-s41-m2-init-baseline`)

- `test/hosts/claude-adapter-init-parity.red.integration.node.test.ts` (5 scenarios): **0/5 green** — all 5 fail on `sanctioned addition ".claude/hooks/lib/harness.sh" (STORY-058-11): missing from the current record`. Red by design (new file not yet created).
- `test/commands/init-host-parity.red.integration.node.test.ts` (15 = 5 scenarios × 3 host selectors): **0/15 green** — same reason, all 15.
- **Verification of the delta rows underneath** (scratch-only, never committed): I temporarily created `scaffold/hosts/claude/.claude/hooks/lib/harness.sh` (dummy content, mode 0755) to get past the new addition row and observe the next failure. All 4 scenarios (`user-content`/`reinit`/`malformed`/`force` — `fresh` too, confirmed separately) then failed on the **`.claude/hooks/session-start.sh` STORY-058-11 delta row** with the expected refuse-baseline message (`current hash mismatch … equal to the baseline hash means the delta has not landed`), proving (a) my `stdoutLine` derivation for the addition is correct for every scenario (it did NOT fail on the stdout-line check), and (b) the pre-existing STORY-058-10 delta rows (`pre-edit-gate.sh`, `stamp-and-gate.sh`, `token-ledger.sh`) are currently GREEN, since the loop reached my new row without throwing on theirs first. The scratch file was deleted immediately after (`git status --porcelain scaffold/` confirmed clean) — no `scaffold/**` edit is part of this commit.

## Spec-Gap

**Test 15 (`codexHookVerdicts` roles/skills) input DI shape.** The M5 plan describes the `codex.live.roles`/`codex.live.skills` verdicts in prose only (spawn_agent schema description, C6's spawn, the child's request body, SubagentStart's `agent_type`; `codex debug prompt-input` skill listing) — there is no typed input shape the way `allPassInputs()`'s other namespaced fields (`c6`, `sharedHooks`, `claudeControl`, …) already have. I invented `inputs.roles` / `inputs.skills` (field names below), modeled on the existing namespacing convention, and flagged this in the test file's own header comment (flashcard 2026-09-26 "a prose-only DI shape … must be invented and flagged as an ambiguity, not pinned silently"). I did **not** assert which named export array (`CODEX_GATING_IDS` vs a new one) these two ids belong to — only their observable three-state behavior (PASS / N/A / FAIL), since the plan doesn't specify that either. The Developer may reshape the input field names; the four test cases (all-pass, both-absent→N/A, one-role-missing→FAIL, sprint-execution-room-local→FAIL) are the load-bearing contract.

Invented shape:
```ts
inputs.roles = {
  present: boolean,
  spawnAgentSchemaDescription: string,   // must mention all 11 role names
  spawnedAgentType: string,              // C6's actual spawn ('qa')
  childRequestBodyContains: string,      // first non-empty body line of the spawned role's .md
  subagentStartAgentType: string,
};
inputs.skills = {
  present: boolean,
  promptInputLines: string[],            // `codex debug prompt-input` lines naming flashcard/sprint-dashboard + file:
  roomLocalSprintExecutionListed: boolean,
};
```

**Story file table omission.** `test/commands/init.node.test.ts` is not listed in the story's `Related Files`/`New Files Needed` table, but M5 plan test 16 explicitly names the `session-start`/`stamp-and-gate`/`pre-edit-gate` snapshot locks, whose existing active assertions live in that file (not `hooks-snapshots.node.test.ts`, which only holds `token-ledger`'s). Edited it anyway per the explicit, unambiguous test-16 instruction; noting the table gap here rather than silently working around it.

## Git status

```
$ git -C /Users/ssuladze/Documents/Dev/ClearGate/.worktrees/STORY-058-11/cleargate-cli status --porcelain
(clean — committed as f4234f2)

$ git -C /Users/ssuladze/Documents/Dev/ClearGate/.worktrees/STORY-058-11 status --porcelain
(clean)

$ git -C /Users/ssuladze/Documents/Dev/ClearGate status --porcelain
 M .cleargate/sprint-runs/SPRINT-41/.session-totals.json
 M .cleargate/sprint-runs/SPRINT-41/events.jsonl
 M .cleargate/sprint-runs/SPRINT-41/state.json
 M .cleargate/sprint-runs/SPRINT-41/token-ledger.jsonl
```
(the 4 outer main-checkout ledger/state files are orchestrator/hook-owned, whitelisted under rule 17 — not touched by this dispatch)

## flashcards_flagged

```yaml
flashcards_flagged:
  - "2026-09-26 · #qa-red #test-harness · copyPayload picks created/skipped by real dest-exists+byte-diff, not overwrite_policy tiers — derive stdoutLine from the code, not the tier."
  - "2026-09-26 · #qa-red #test-harness #recipe · A byte-neutral parity lock (frozen vs canonical, same minimal payload) is a real anchor when both sides are still identical — it becomes the regression detector, not a vacuous pass."
```
