# STORY-058-11 — Architect TPV

role: architect

```
TPV: REJECTED — re-seal required
RESEAL_PATCH: .cleargate/sprint-runs/SPRINT-41/reports/STORY-058-11-tpv-reseal.patch
RESEAL_SHA256: 8b474df3fb3633beafb9b7934905246e9a7f7382803c8a11dedda98ce3f89046
APPLIES_ON: cli story/STORY-058-11 @ f4234f2 (git apply --check clean; 16 files, +468/-101; staged list == patch list)
NEW_COUNTS: 86 default-tier red (was 56) + parity lock 19 anchors + M2 pair 0/5, 0/15 (same reason)
BLUEPRINT: plans/M5.md M5-A49..M5-A54 (appended; M5-A48 was already taken)
```

What was checked: cli `f4234f2`, which is C1 `d0f0d95` plus QA-Red. How it was checked:

- **Scratch root.** `/private/tmp/cg-s41-tpv-058-11`. The outer tree came from `git archive story/STORY-058-11`. The cli was cloned from the worktree, and `node_modules` was symlinked.
- **Simulation.** A plan-conformant simulation was built on top of that. It covers:
  - codegen, and the portable skills;
  - `TIER_RULES`;
  - `lib/harness.sh`, adopted by 8 hooks, with the codex copies regenerated;
  - §16 in both twins;
  - the verdicts;
  - the 4 locks.
- **Integrated tree.** The simulation was also merged with the current cli `main` `c5a311e`, which already holds -10 and BUG-096.
- **Codex binary.** The pinned codex was run offline only, with a scratch `CODEX_HOME` and `HOME`: `--version`, `app-server generate-ts`, `debug prompt-input`. There was no harness run, no login, and no credential path.

## 1. Reproduced sealed counts (solo, cli `f4234f2`, scratch)

Every count matches QA-Red's report.

| File | Measured | QA-Red | Red reason (confirmed) |
|---|---|---|---|
| codex-agents-codegen | 27 red / 0 | 27 | `.codex/agents/*.toml` absent; `planCodexPayload` plans no agent entries |
| portable-skills | 3 red / 3 anchors | 3/3 | `scaffold/core/.agents/skills/*` absent |
| harness-shim | 5 red | 5 | `lib/harness.sh` missing (assert before `source`) |
| hooks-claude-parity (integration) | 19 anchors | 19 | frozen == canonical (all 9 `cmp`-equal) |
| codex-enforcement-delta | 13 red / 1 anchor | 13/1 | §16 absent (the twin anchor holds) |
| codex-hooks-harness | 4 red / 67 anchors | +4/67 | `codex.live.roles` and `codex.live.skills` are `undefined` |
| init.node / hooks-snapshots | 3 red / 31 anchors; 1 red / 15 anchors | same | `*.story-058-11.sh` locks: ENOENT |
| M2 parity pair (compare mode) | 0/5, 0/15 | same | `sanctioned addition ".claude/hooks/lib/harness.sh" … missing from the current record` |

- The `-11` hook baseline hashes and the shared-row baseline equal the canonical at C1, measured with the `FIXED_PIN` substitution.
- The post-(-10) sentinel hash is `edb7df4d…0673` when pin-substituted, and `43a3cb26…1b30` raw.

## 2. Why REJECTED

The simulation is conformant, yet it cannot turn every red green, and several mutants survive. Those gaps fall into seven groups.

| # | Defect | Evidence (conformant simulation) |
|---|---|---|
| D1 | **Parity-lock `pre-commit.sh` case is unsatisfiable.** It stages its private hooks dir *inside* the census root, so the census compares the hook sources themselves. That dir also lacks `lib/`. | 17/19; `pre-commit.sh: exit code diverged (frozen=0, current=1)` ×2 |
| D2 | **§16 test is unsatisfiable, for two reasons.** First, the heading regex ends in `$` right after `Codex`, but the blueprint pins `… Codex (source: STORY-058-11)`. Second, the section regex uses `\Z`, which JS reads as a literal `Z`. §16 is the last section and has no `Z`, so the section never matches. | 2/14 with the plan's heading |
| D3 | **Portable-skills test 7b is unsatisfiable.** A composed core+claude flat *view* necessarily carries core `.agents/**` (M3 amendment: a shared root is gated at install). Rule 2 is about the install. | 5/6 |
| D4 | **The sealed commit lacks the RP-A15 item-4 sentinel refusal.** The QA-Red report claims it, but `bug085SentinelCurrentHash()` has no `edb7df4d…` branch. An unshimmed sentinel therefore passes the parity pair. | mutant M28 survives |
| D5 | **Test 15's invented input shape** is inconsistent with M5-A36, with pass C's `runCodexSessions` seams, and with the measured `prompt-input` format. | §4 ruling |
| D6 | **Sealed tests of other items go red on a conformant -11, and QA-Red missed them.** They are:<ul><li>`lifecycle-codex` test 33 (-10);</li><li>`codex-payload` test 19 (-10);</li><li>`init-host-snapshot` scenario 11 (-06);</li><li>`pre-tool-use-task.node` (11 red);</li><li>`stamp-and-gate.node` (4 red);</li><li>`file-surface-gate-e2e` (8 red);</li><li>`pre-commit-downstream-safe` (11 red).</li></ul>Two more fail after RS-4, once the live hooks are shimmed: `session-start.node` (4 red) and `cr-026-integration` (1 red). | sweep: 119 default files, simulation vs `f4234f2`, plus a simulated shimmed live `.claude` |
| D7 | **The plan contradicts the sealed tests in two places.** First, "`js-yaml` for the frontmatter" breaks 4 scratch-copy tests. Second, "every byte after the fence line" is not `parseFrontmatter`'s body. | mutants M34 and M31 |

12 mutants survive the sealed suite: M1, M3, M7, M8, M10, M23, M24, M26, M27, M28, M30 and M35 (§5). So does Test 15's whole verdict family, by construction.

## 3. Red→green (re-sealed)

- Red counts are for `f4234f2` plus the patch.
- Green counts are for the conformant simulation plus the patch.
- The integrated column is the simulation merged with `main` `c5a311e`.

| File | Red commit (red / anchor) | Simulation | Integrated |
|---|---|---|---|
| test/scripts/codex-agents-codegen.red (+3: 4c) | 30 / 0 | 30/30 | 30/30 |
| test/scaffold/portable-skills.red (7b → install; test 8 tier rows) | 3 / 3 | 6/6 | 6/6 |
| test/hooks/harness-shim.red (+9a both modes, 10b ×2, 11 empty payload, 11b ×9, 11c) | 17 / 1 | 18/18 | 18/18 |
| test/docs/codex-enforcement-delta.red (heading, `(?![\s\S])`, +index row) | 14 / 1 | 15/15 | — |
| test/scripts/codex-hooks-harness.red (Test 15 re-pinned, 17 tests) | 17 / 67 | 84/84 | 84/84 |
| test/commands/init.node | 3 / 31 | 34/34 | — |
| test/snapshots/hooks-snapshots.node | 1 / 15 | 16/16 | — |
| test/commands/lifecycle-codex.red (test 33 flip) | 1 / 5 | 6/6 | 6/6 |
| test/commands/init-host-snapshot.red (scenario 11 filter) | 0 / 13 | 13/13 | 13/13 |
| test/scaffold/codex-payload.red (test 19 hook-only; lib compared by path) | 0 / 14 | 14/14 | 14/14 |
| test/hooks/pre-tool-use-task.node, stamp-and-gate.node, session-start.node | 0 / 13, 7, 9 | green | — |
| test/scaffold/file-surface-gate-e2e, pre-commit-downstream-safe | 0 / 21, 12 | green | — |
| test/hooks/cr-026-integration (reads live `.claude`) | 0 / 1 in a worktree | 1/1 with simulated shimmed live | — |
| hooks-claude-parity (integration) | 19 anchors | 19/19 | 19/19 |
| M2 parity pair (`CLEARGATE_INIT_BASELINE`, compare) | 0/5, 0/15 | **5/5, 15/15** | **5/5, 15/15** |

Other witnesses on the simulation:

- `npm run typecheck` is clean on the red commit, on the simulation and on the integrated tree.
- `node scripts/build-codex-payload.mjs --check` exits 0.
- `node scripts/verify-pack.mjs` reports OK (222 files).
- Rule-16 `CLEARGATE_META_ROOT` sweep: 23 files, 325/326. The one failure is `scaffold-relocation` scenario 4c. It needs the outer git index, and it fails identically at `f4234f2`.
- The 119-file default sweep and 19 integration files show no delta against `f4234f2` other than the table above. The environment failures are identical on both sides: they come from the missing outer `.claude` or `.git` in scratch.
- The M2 baseline is untouched: 425 files, 0 modified during this dispatch.

## 4. Rulings

**R-1: the Test 15 input shape — re-pinned (M5-A52).** QA-Red's invented shape is **not** consistent with M5-A36 or with pass C's seams:

- It feeds pre-digested fields to the pure verdict: `spawnAgentSchemaDescription`, `childRequestBodyContains`, `subagentStartAgentType`, `promptInputLines`, and `roomLocalSprintExecutionListed: boolean`. The real checks therefore run in untested driver code. A `body.tools` reader, which the -10 post-flight seam 2 explicitly supersedes, would pass.
- Its prompt-input line format is invented. I measured the real format offline with the pinned 0.154.0-alpha.6.2. The output is a JSON list. The developer message holds `<skills_instructions>`, with a roots table and short-path entries:

  ```
  ### Skill roots
  - `r0` = `/…/codex-home/skills/.system`
  - `r1` = `/…/room/.agents/skills`
  ### Available skills
  - flashcard: … (file: r1/flashcard/SKILL.md)
  ```

- SubagentStart is unobservable here. ClearGate registers no SubagentStart hook. The generated `v2/ThreadItem.ts` gives `subAgentActivity` only `{id, kind, agentThreadId, agentPath}`.

The pinned shape (raw) and its verdict rules are:

```ts
inputs.provider: 'scripted' | 'live'
inputs.roles?:  { names: string[]; qaFirstLine: string }      // repo-codex .codex/agents/*.toml basenames (sorted); qa.toml developer_instructions first non-empty line
inputs.c6.requests: object[]                                  // scripted: mockServer.requests.slice(before-C6); live: []
inputs.skills?: { root: string; promptInput: string }         // realpath(repo-codex/.agents/skills); stdout of `codex debug prompt-input` (cwd roomReal, env codexEnv, after trustRoom)
```

- **`codex.live.roles`:**
  - It is N/A when there are no roles, `names: []` included.
  - Otherwise it requires exactly one `codex-identity … agent_type=qa ` line (the SubagentStop identity).
  - Scripted runs also require three things:
    - the `additional_tools` item's `spawn_agent` `agent_type` schema lists every name as a whole token;
    - a `function_call` `spawn_agent` has `agent_type:"qa"`;
    - the `/root/cg_probe` request holds `qaFirstLine`.
- **`codex.live.skills`:**
  - It is N/A when `skills` is absent, and FAIL when the input is not JSON.
  - It requires `flashcard` and `sprint-dashboard` to be room-local, and `sprint-execution` not to be room-local. Room-local means the entry's root maps to `skills.root` and its file is `<name>/SKILL.md`.
- **Gating:** both ids join `CODEX_GATING_IDS`, so a real-run N/A fails the run.
- **Where the code goes:** the build phase edits `evidence.mjs` only. INTEGRATE adds the collection into pass C's `runCodexSessions`.

**R-2: codegen.** `build-codex-payload.mjs` stays dependency-free. `developer_instructions` is `parseFrontmatter`'s body. Control characters are escaped in both string forms. Hook copies are mode 0755; TOML and skill files are 0644 (M5-A49).

**R-3: the adopted hook form is pinned (M5-A50).** The stdin payload is fed to `cg_repo_root` in the 6 stdin hooks. `session-start` and `pre-commit-surface-gate` pass `""`. The shim never reads stdin, even when its payload argument is empty (mutant M26).

**R-4: §16.** The heading keeps the blueprint suffix `(source: STORY-058-11)`. -11 adds the §16 index row (M5-A51, which resolves M6.md:316).

**R-5: the story-table gap.** QA-Red's note is right about `test/commands/init.node.test.ts`, per M5-A20. It belongs in §3.1 as a QA-Red file, not on the Developer allow-list. Story-text amendment F9 (M5-A53) adds it, plus the 9 other test files this re-seal edits.

**R-6: the shared enforcement row.** `f4234f2`'s 13-line block is byte-identical to `replan-contract-first.md` §7.5 and to `story/CR-124`'s block. All three hash to sha256 `2203a6405406444013cfacd4312f92f6f977a16fe6a3f54df1e075c257be5fe8`. The re-seal does not touch it.

## 5. Mutant sampling (36, on the conformant simulation plus the re-seal)

"Sealed" means the mutant run against `f4234f2`'s own test files. A † marks a kill that only a D1/D3/test-19 defect produced, so it is spurious.

| # | Mutant | Result with re-seal (killer) | Sealed suite |
|---|---|---|---|
| M1 | `token-ledger` precedence swap (orchestrator-first → claude-first) | killed (11b) | **survived** (parity is blind: ORCH=CLAUDE=root)† |
| M2 | sentinel sources shim from cwd | killed (11b) | killed by parity (integration only) |
| M3 | `pre-tool-use-task` passes `""` not `${INPUT}` | killed (11b) | **survived** |
| M4 | TOML emits `model =` | killed (codegen T3/T2) | killed |
| M5 | codegen drops `reporter` | killed (T1, T8) | killed |
| M6 | hand-edited committed `qa.toml` | killed (`--check exits 0`) | killed |
| M7 | `--check` ignores `.codex/agents` extras | killed (4c) | **survived** |
| M8 | `--check` skips skill bytes | killed (4c) | **survived** |
| M9 | skill copied non-verbatim | killed (T6, test 33) | killed |
| M10 | `.codex/agents/**` tier `skill` | killed (T8 tier) | **survived**† |
| M11 | `.agents/skills/**` rule missing | killed (T8) | killed |
| M12 | §16 lacks `trusted_hash` | killed | n/a (D2) |
| M13 | §16 heading without suffix | killed | n/a (D2) |
| M14 | index row missing | killed | — (new) |
| M15 | roles PASS with 0 roles | killed | by construction** |
| M16 | roles reads `body.tools` too | killed (7 cases) | by construction** |
| M17 | substring, not whole-token | killed | by construction** |
| M18 | roles skips child check | killed | by construction** |
| M19 | any request taken as the child | killed | by construction** |
| M20 | skills ignores root mapping | killed | by construction** |
| M21 | skills drops `sprint-execution` rule | killed | killed |
| M22 | `CODEX_GATING_IDS` lacks the ids | killed | by construction** |
| M23 | git mode uses payload cwd | killed (10b) | **survived** |
| M24 | shim skips payload cwd (env → pwd) | killed (9a: cwd elsewhere) | **survived** |
| M25 | claude-first honours ORCH first | killed (T10) | killed |
| M26 | shim reads stdin on empty payload | killed (T11 empty) | **survived** |
| M27 | `lib/harness.sh` not in codex copy set | killed (11c) | **survived**† |
| M28 | sentinel left unshimmed | killed (11b + R5 refusal → parity 5 red) | **survived** (D4) |
| M29 | token-ledger lock from pre-shim bytes | killed | killed |
| M30 | `pre-commit.sh` sources shim | killed (11b) | **survived** |
| M31 | body keeps blank line | killed (T2) | killed |
| M32 | CR unescaped in body | killed (T5) | killed |
| M33 | `"""` unescaped | killed (T5) | killed |
| M34 | `import yaml from 'js-yaml'` (plan-literal) | killed (4b/4c/5 + -10 scratch ×2) | killed (plan conflict, D7) |
| M35 | `lib/harness.sh` mode 0644 | killed (11c; M2 addition mode) | **survived** |
| M36 | hook edited, codex copies not regenerated | killed (`--check`) | killed |

- With the re-seal, 36 of 36 mutants are killed. M26 needed the added empty-payload case.
- Against the sealed tests, 12 mutants survive, and the Test 15 family survives by construction (\*\*): a pure function fed pre-digested fields never sees `additional_tools`, the request list, or the prompt-input text.

## 6. Integration forecast

- **Integration-only (excluded from the build-phase make-green set).** QA-Red's "none" holds only for its own files. The story's verification also needs these:
  - `test/e2e/codex-hooks.red.integration` with `CLEARGATE_CODEX_BIN`. It needs pass C plus the M5-A52 collection, because roles and skills are gating.
  - The QA-Verify scripted `codex-hooks.mjs run --ref story/STORY-058-11 --container …`, with roles and skills PASS.
  - The M5-A6 `claude-baseline.mjs run`, which needs pass D.
  - The -09 e2e.
- **Merging `main` (`c5a311e`, -10 and BUG-096 merged) into -11 is clean.** It was simulated on the conformant tree plus the re-seal:
  - `codex-hooks.mjs`: the build phase does not touch it (INTEGRATE adds the collection).
  - `evidence.mjs`: auto-merges, because pass D's `compareInstallTrees` is disjoint from the verdicts.
  - init-fixture tail: pass C/D do not touch it; BUG-096's `:55-85` auto-merges.
  - `hooks-snapshots` and `init.node`: no conflicts.
- **If CR-124 or BUG-090 merge first:**
  - `init-fixture.ts` tail conflict (measured). It is mechanical: upstream rows first, then delete the identical shared row (the CR-124 case).
  - After CR-124, `npm run gen:codex` refreshes `architect*.toml`, and `--check` must exit 0.
  - `CHANGELOG`: keep both entries.
- **The frozen fixtures need no re-freeze.** All 9 hooks at `main` `c5a311e` hash equal to `test/fixtures/hooks-pre-058-11/`, and pass C/D touched no hook.
- **RS-4.** The `b0-live-resync.mjs` change list is the 8 shimmed hooks plus `lib/harness.sh`, not "9 hooks" (`pre-commit.sh` is unchanged; M5-A54). `session-start.node` and `cr-026` need R13/R14 to stay green after it.
- **DevOps.**
  - Full-suite count: the previous recorded total plus **90** default-tier tests, plus 19 integration tests.
  - Payload diff: `.agents/` (2 `SKILL.md`), `.claude/hooks/lib/`, the 8 hooks, `cleargate-enforcement.md` and `MANIFEST.json`.
  - `canonical-live-parity` 5d and the doctor drift are named reds until RS-4.

## 7. Developer brief (K-gates)

**K0 — order.**
1. The orchestrator applies F9 and commits it.
2. QA-Red applies `STORY-058-11-tpv-reseal.patch` on `f4234f2` and commits. The 3-point gate: the sha256 above, `git apply --check`, and staged list == 16 files.
3. The Developer builds on that commit in `<cw>` = `OUTER/.worktrees/STORY-058-11/cleargate-cli`.

**K1 — file allow-list.**

- **cli, build phase:**
  - `scripts/build-codex-payload.mjs`
  - `src/lib/manifest-builder.ts` (`TIER_RULES` only: `.codex/agents/**` agent/always/false, `.agents/skills/**` skill/always/false, placed before `.claude/skills/**`)
  - `scaffold/hosts/claude/.claude/hooks/lib/harness.sh` (new, 0755)
  - the 8 hooks: `token-ledger`, `pending-task-sentinel`, `pre-tool-use-task`, `session-start`, `stamp-and-gate`, `pre-edit-gate`, `pre-tool-use-autonomy`, `pre-commit-surface-gate`
  - generated files, written only by `npm run gen:codex`: `scaffold/hosts/codex/.codex/hooks/{5 scripts, lib/harness.sh}`, `scaffold/hosts/codex/.codex/agents/*.toml` (11), `scaffold/core/.agents/skills/{flashcard,sprint-dashboard}/SKILL.md`
  - `scaffold/core/.cleargate/knowledge/cleargate-enforcement.md` (§16 plus the index row)
  - `scripts/clean-room/evidence.mjs` (the M5-A52 verdicts and ids only)
  - `test/snapshots/hooks/{session-start,stamp-and-gate,pre-edit-gate}.story-058-11.sh` (canonical with `__CLEARGATE_VERSION__` → `0.5.0`) and `token-ledger.story-058-11.sh` (raw)
  - `CHANGELOG.md` (the blueprint's `### Added` line)
- **INTEGRATE only:** `scripts/clean-room/codex-hooks.mjs` (the `runCodexSessions` collection, M5-A52).
- **Outer:** `.cleargate/knowledge/cleargate-enforcement.md`, a `cp` of the canonical twin. It stays uncommitted during the build, and rule 21 re-derives it.
- **Forbidden:**
  - every `*.test.ts`, including `init.node.test.ts` and the 10 re-sealed files;
  - `test/helpers/init-fixture.ts`;
  - `package.json`;
  - `pre-commit.sh`;
  - any npm import in `build-codex-payload.mjs`.

**K2 — contracts.** Build to M5-A49 through M5-A52 verbatim: the codegen reader, body and escaping; the exact hook lines; the §16 heading and index row; the roles/skills rules.

**K3 — make-green on C1, solo, in `<cw>`.**

*Must go green (86 reds):*
- codegen 30/30
- portable-skills 6/6
- harness-shim 18/18
- codex-enforcement-delta 15/15
- codex-hooks-harness 84/84
- init.node 34/34
- hooks-snapshots 16/16
- lifecycle-codex 6/6

*Anchors that must stay green:*
- init-host-snapshot 13/13
- codex-payload 14/14
- pre-tool-use-task 13/13
- stamp-and-gate 7/7
- session-start 9/9
- file-surface-gate-e2e 21/21
- pre-commit-downstream-safe 12/12
- cr-026-integration 1/1
- the rule-16 `CLEARGATE_META_ROOT` files, run without the override (default = `<ow>`)

*Integration:*
- hooks-claude-parity 19/19
- the M2 pair with `CLEARGATE_INIT_BASELINE=/private/tmp/cg-s41-m2-init-baseline`, compare only, never capture: **5/5 and 15/15**

*Named integration-only exclusions (§6):* test 46 e2e, the QA-Verify scripted codex run, the M5-A6 Claude run, and the -09 e2e.

**K4 — `--check`.** `node scripts/build-codex-payload.mjs --check` exits 0. Run `npm run gen:codex` after every canonical hook or agent edit. `npm run prebuild && npm run build` runs in `<cw>` only.

**K5 — twin cmp.** `cmp OUTER/.worktrees/STORY-058-11/.cleargate/knowledge/cleargate-enforcement.md <cw>/scaffold/core/.cleargate/knowledge/cleargate-enforcement.md` exits 0.

**K6 — pin-substituted sentinel refusal.**
- The re-seal (R5) makes `bug085SentinelCurrentHash()` refuse `edb7df4d03a3844d44d0fac8bb7495478529e4dff1dd39ed628b73733abf0673`. That is the `FIXED_PIN`-substituted canonical at `d0f0d95`; raw it is `43a3cb26…1b30`.
- The shimmed sentinel must hash to something else. The parity pair proves it.
- The Developer never edits the function.

**K7 — before commit.**
- `npm run typecheck` is clean.
- `git diff f4234f2 -- test/` shows only the 4 lock files, on top of the re-seal commit.
- Stage explicit paths.

## 8. Real-checkout git status (read-only throughout; no commits, no git state changes)

```
$ git -C /Users/ssuladze/Documents/Dev/ClearGate status --porcelain
 M .cleargate/sprint-runs/SPRINT-41/.session-totals.json
 M .cleargate/sprint-runs/SPRINT-41/events.jsonl
 M .cleargate/sprint-runs/SPRINT-41/state.json
 M .cleargate/sprint-runs/SPRINT-41/token-ledger.jsonl
 M .cleargate/sprint-runs/SPRINT-41/plans/M5.md                  (this dispatch: M5-A49..A54, append-only)
?? .cleargate/sprint-runs/SPRINT-41/reports/STORY-058-11-tpv.md    (this report)
?? .cleargate/sprint-runs/SPRINT-41/reports/STORY-058-11-tpv-reseal.patch
?? .cleargate/sprint-runs/SPRINT-41/.pending-task-*.json          (hook-owned)
$ git -C /Users/ssuladze/Documents/Dev/ClearGate/.worktrees/STORY-058-11 status --porcelain        → (clean)
$ git -C /Users/ssuladze/Documents/Dev/ClearGate/.worktrees/STORY-058-11/cleargate-cli status --porcelain → (clean)
```

- The final status is re-listed in the orchestrator reply.
- The scratch root `/private/tmp/cg-s41-tpv-058-11` is deleted.
- The M2 baseline, `/private/tmp/cg-s41-fresh-journey`, `mediafi`, `~/.codex` and the dedicated codex home were not touched.
- Side effect: the pre-BUG-096 fixture code at `f4234f2` leaves `cg-s41-fix-*` and `cg-s41-payload-*` dirs under `/private/tmp`. BUG-096's hygiene step (`-mmin +60`) removes them. The `cg-s41-11-*` dirs under `$TMPDIR` are removed.

## Script Incidents

None. `run_script.sh` was not invoked. Every probe was a scratch clone, a read-only `git show`, `diff` or `fetch` from the real repos, or an offline pinned-codex command with a scratch `CODEX_HOME` and `HOME`.

## flashcards_flagged

```yaml
flashcards_flagged:
  - "2026-09-26 · #test-harness #hooks #tpv · 11 hook tests regex-patch REPO_ROOT= into tmp copies; a hook that sources lib/ needs lib/ copied beside it."
  - "2026-09-26 · #tpv #regex · JS regex has no \\Z: without /u it is a literal Z. End of input is (?![\\s\\S])."
  - "2026-09-26 · #codex #skill · codex debug prompt-input is a JSON list; skills use a '- `rN` = `<root>`' table and '(file: rN/<name>/SKILL.md)' entries."
  - "2026-09-26 · #test-harness #tpv · A test that runs a copied script from os.tmpdir (no node_modules) forbids npm imports in that script."
  - "2026-09-26 · #scaffold #host #tpv · A core shared root (.agents/**) rides in the flat Claude view; assert Rule 2 on the install, not the view."
  - "2026-09-26 · #qa-red #tpv · A QA-Red report can claim a hunk the commit lacks (sentinel refusal); grep the sealed tree, not the report."
  - "2026-09-26 · #codex #skill · Codex parses SKILL.md frontmatter as YAML: flashcard's description is cut at ' #' in the listing."
```
