# STORY-058-11 Architect post-flight (integrated tree)

role: architect

```
VERDICT: PASS
REVIEWED: cli story/STORY-058-11 @ 76dee8c (44ba381 Dev, 2941d83 merge main 984e8d5, 1e7f0e6 collection, 6cdce4e re-seal #2, 76dee8c fix)
          outer .worktrees/STORY-058-11 @ abb3a991 + uncommitted enforcement twin
BLUEPRINT: plans/M5.md "STORY-058-11" blueprint, F1-F9, M5-A49..A55
BLOCKING FINDINGS: none
RE-INTEGRATION: forecast measured against the REAL cli main 6fc13d2 (CR-124 already merged) and outer sprint/S-41 01fd3bbc
```

Timing note: at review time CR-124 had already landed (cli `main` 6fc13d2, outer `01fd3bbc` + `f45be142`). The re-integration forecast below is therefore measured against those real commits, in a scratch clone, not predicted.

Method: read-only on every real checkout. Solo test runs in `<cw>` only. The re-integration was simulated in a throwaway clone under the session scratchpad (merge, row-level resolution, `gen:codex`, prebuild, build, verify-pack, targeted tests), then deleted. No clean-room harness run, no codex binary run, no CODEX_HOME touched. The M2 baseline was read via env only, and `find -newer` showed 0 files written, after both runs.

## 1. Codegen contract (M5-A49): PASS

- **Builtins only.** The only imports are `node:fs`, `node:path` and `node:url` (`scripts/build-codex-payload.mjs:50-52`).
- **Frontmatter reader.**
  - Line 1 and the close are exact `---` lines (`:160-176`).
  - Only `name` and `description` are read (`:180`).
  - A double-quoted value goes through `JSON.parse` (`:126-135`).
  - A single-quoted value maps `''` to `'` (`:136-141`).
  - Plain values are refused when empty, when they contain ` #`, or when they start with one of the refused characters (`:121`, `:142-144`).
  - Anything else throws `UnsupportedFrontmatterError`, which exits 1 (`:99-104`, `:391-395`).
- **`developer_instructions`.** The body starts after the fence EOL, and at most one following EOL is dropped (`:192-194`).
- **Escaping.**
  - Basic strings escape `\`, `"` and every control character (`:217-227`).
  - Multiline strings escape `\` first, then control characters except LF/TAB (CR included), then `"""` becomes `""\"` (`:234-239`).
- **Output.** There is no `model` and no `tools`. The `# GENERATED …` header is line 1 (`:242-252`).
- **Modes.**
  - Hooks, `lib/harness.sh` included, are 0755. TOMLs and SKILL copies are 0644 (`:84-85`).
  - The files on disk and in the git index match: `100755` hooks and both `lib/harness.sh`; `100644` for the 11 TOMLs and 2 SKILL.md.
- **`--check`.** It walks the 3 `GENERATED_DIRS` recursively (`:78-82`, `:351-356`). Problem lines are relative to `scaffold/`.
  - Measured in a scratch copy, the output was:
    - `mode drifted: hosts/codex/.codex/hooks/lib/harness.sh (expected 755, got 644)`
    - `stale: core/.agents/skills/flashcard/SKILL.md`
    - `extra: hosts/codex/.codex/hooks/lib/zz.sh`
    - `extra: hosts/codex/.codex/agents/zz-extra.toml`
  - It exited 1. An unknown flag exits 2.
- **Live results.** `node scripts/build-codex-payload.mjs --check` in `<cw>` exits 0.
- **TOML spot-parse** (`toml-eslint-parser`, `getStaticTOMLValue`) of `qa`, `architect`, `cleargate-wiki-lint` and `reporter`:
  - The keys are exactly `name, description, developer_instructions`.
  - Each value equals js-yaml (CORE_SCHEMA) `name`/`description` and the `parseFrontmatter` body.
  - The source keys `tools`/`model` are dropped.
  - The header is correct.

## 2. Hook form (M5-A50) and Claude no-op: PASS

- **Each of the 8 hooks.** Each has exactly one source line and exactly one `REPO_ROOT="$(cg_repo_root …)"`, with the pinned mode and argument:

| Hook | Line | Mode | Arg |
|---|---|---|---|
| `token-ledger.sh` | :83-84 | orchestrator-first | `"${INPUT}"` |
| `pending-task-sentinel.sh` | :43-44 | orchestrator-first | `"${INPUT}"` |
| `pre-tool-use-task.sh` | :44-45 | orchestrator-first | `"${INPUT}"` |
| `session-start.sh` | :5-6 | claude-first | `""` |
| `stamp-and-gate.sh` | :7-8 | claude-first | `"${INPUT}"` |
| `pre-edit-gate.sh` | :19-20 | claude-first | `"${INPUT}"` |
| `pre-tool-use-autonomy.sh` | :34-35 (after the jq guard :28-30) | claude-first | `"${PAYLOAD}"` |
| `pre-commit-surface-gate.sh` | :6-7 | git | `""` |

- **Stdin.** Every stdin read moved above the source line, and each later read was deleted. `token-ledger.sh`'s `INPUT="$(cat)"` left the `{ … }` block (full diff `984e8d5..76dee8c`).
- **Autonomy hook.** Its four `${CLAUDE_PROJECT_DIR:-.}` became `${REPO_ROOT}`.
- **No residual forms.** Grep across all 9 hooks finds zero `CLAUDE_PROJECT_DIR` / `ORCHESTRATOR_PROJECT_DIR` references outside comments.
- **`pre-commit.sh`.** It is byte-unchanged against `main` and against `test/fixtures/hooks-pre-058-11/pre-commit.sh`.
- **The shim** (`lib/harness.sh:30-64`) is ordered as pinned:
  1. `git` mode first, `:36-39`.
  2. Orchestrator only in orchestrator-first mode, `:41-44`.
  3. `CLAUDE_PROJECT_DIR`, `:46-49`.
  4. The payload cwd's git top level, only when the payload is non-empty, `:51-60`.
  5. `pwd`.

  It never reads stdin. The Codex copy is byte-identical (`cmp` 0).
- **Solo runs in `<cw>`:**
  - `hooks-claude-parity.red.integration`: 19/19.
  - `claude-adapter-init-parity.red.integration`: 5/5.
  - `init-host-parity.red.integration`: 15/15.

  The last two ran with `CLEARGATE_INIT_BASELINE=/private/tmp/cg-s41-m2-init-baseline`, capture unset, and the baseline was untouched.

## 3. §16 heading and index row (M5-A51): PASS

- **Canonical file.** In `scaffold/core/.cleargate/knowledge/cleargate-enforcement.md`:
  - `:22` is the index row `| §16 | — | Host Enforcement Deltas — Codex (STORY-058-11) |`, directly after the §15 row at `:21`.
  - `:590` is the heading, byte-exact, appended after §15 at `:569`.
- **Content.** Ten bullets carry the 11 required terms (`codex-enforcement-delta.red` 15/15). The claims were spot-checked against source: `qa.md`'s tools are `Read, Grep, Glob, Bash`.
- **Outer twin.** `<ow>/.cleargate/knowledge/cleargate-enforcement.md` has `cmp` 0 against the canonical. It is +18 lines, uncommitted, per rule 21.

## 4. Evidence (M5-A52 and M5-A55) and the collection: PASS

**`CODEX_GATING_IDS`** gains `codex.live.roles` and `codex.live.skills` (`scripts/clean-room/evidence.mjs:719-720`), and both are wired into `codexHookVerdicts`.

**`codexRolesVerdict`** (`:1007-1045`):
- N/A when there are no roles or `names` is empty.
- Exactly one ` codex-identity ` line, containing `agent_type=qa `, for both providers.
- `live` stops there.
- For scripted runs:
  - **(a)** The source is the `additional_tools` input items → `spawn_agent` → `properties.agent_type` (`:962-980`); `body.tools` is never read.
    - The listing texts are `codexDeepStrings` (keys excluded) with `CODEX_ROLE_ENTRY_BODY = / \{\n[\s\S]*?\n\}(?=\n|$)/g` removed (`:955-960`). This is verbatim M5-A55.
    - (a) holds only when some single schema lists every role (`:1026-1029`).
    - `missing` is computed over all schemas (`:1031-1033`).
    - Both `JSON.stringify` tokenizations are gone at 76dee8c.
  - **(b)** A `function_call spawn_agent` carries `agent_type === 'qa'`.
  - **(c)** The `/root/cg_probe` child request (`client_metadata['x-codex-turn-metadata']`) holds `qaFirstLine` in a deep string value.

**`codexSkillsVerdict`** (`:1047-1075`):
- N/A when absent; FAIL when the input is not JSON.
- It parses the `` - `rN` = `<abs>` `` roots and `- <name>: … (file: rN/<path>)` entries.
- Room-local means the root maps to `inputs.skills.root` and the path is `<name>/SKILL.md`.
- PASS iff `flashcard` and `sprint-dashboard` are room-local and `sprint-execution` is not.

**The collection** (`scripts/clean-room/codex-hooks.mjs`) covers seams 1-7:
- It lives in `runCodexSessions` (`:254`).
- Roles and skills are collected after `trustRoom` (`:303`) and `hooksListAfter` (`:306`), and before C2 (`:369`), at `:309-320`.
  - `promptInput = execFileSync(codexBin, ['debug','prompt-input'], { cwd: roomReal, env: codexEnv })`.
  - `skills.root = realpathSync(<room>/.agents/skills)`.
  - Each key is absent when the room has nothing to report.
- `c6RequestsBefore` is taken immediately before `turn('C6', …)` (`:419-421`), and is `[]` under live.
- `provider` is in `inputs` (`:431`), and `inputs.c6.requests` is set (`:448`).
- `scriptedResponder` and the `childSettled` settle predicate are unchanged.
- Test 46 (1/1, cliSha 76dee8c) shows `codex.live.dispatch-identity` PASS with `expectedAgentType` qa, which is the seam-4 witness.

**Solo re-runs in `<cw>`:** `codex-hooks-harness.red` 90/90. Test 46 is not re-run here (harness lane; the fix report shows every gating row PASS).

**`toml-eslint-parser` loading** uses `createRequire(anchor).resolve` plus `import()` (`:690-708`, called at `:736`). The ruling is in §6.

## 5. TIER_RULES, manifest classification, payload identity: PASS

**TIER_RULES** (`src/lib/manifest-builder.ts`, +25): `.codex/agents/**` is agent/always/preserve false, and `.agents/skills/**` is skill/always/preserve false. Both sit after `.codex/hooks.json` and before `.claude/skills/**`.

**Built manifests** in `<cw>` `templates/`:

| Paths | Classification | Owner | Manifest |
|---|---|---|---|
| `.agents/skills/{flashcard,sprint-dashboard}/SKILL.md` | skill | `core` | core |
| 11 `.codex/agents/*.toml` | agent | `codex` | hosts/codex |
| `.codex/hooks/lib/harness.sh` | hook | `codex` | hosts/codex |
| `.claude/hooks/lib/harness.sh` | hook | `claude` | hosts/claude |

The compat manifest carries both `.agents` rows and `.claude/hooks/lib/harness.sh`, 77 entries in all. A Claude-only install drops `.agents/**` (`payloadFilter`, portable-skills test 7), and the M2 pair proves the no-flag install changed only by the sanctioned rows.

**DevOps payload identity (M5-A54): exact.** I measured it on the simulated re-integrated tree against a scratch prebuild of cli `main` 6fc13d2. `diff -rq` of `templates/cleargate-planning` lists exactly:
- `.agents/`: the 2 `SKILL.md`;
- `.claude/hooks/lib/`: `harness.sh`, mode 0755;
- the 8 shimmed hooks;
- `.cleargate/knowledge/cleargate-enforcement.md`;
- `MANIFEST.json`.

Build counts on the simulated tree:
- prebuild: payload 83, split view 102, manifest 77;
- `node scripts/verify-pack.mjs`: `OK — 222 files, payload 83, version 0.26.1`.

## 6. Deviation rulings

| # | Source | Deviation | Where | Ruling |
|---|---|---|---|---|
| 1 | dev | The frontmatter reader also refuses a missing key, a repeated key, and an indented continuation line. | `build-codex-payload.mjs:180-190` | **ACCEPT.** This is M5-A49's "anything else throws", and it only narrows the subset. All 11 agents pass, and test 2 cross-checks js-yaml. |
| 2 | dev | Roles (a) stringified the `properties.agent_type` value. | `evidence.mjs:1026-1033` (as shipped) | **ACCEPT the scope, the stringify is superseded.** "That value = the agent_type schema" is exactly M5-A55's "never widen past `properties.agent_type`". The `JSON.stringify` tokenization was the TPV2 defect, and 76dee8c removed it. |
| 3 | dev | Extra named exports: `PORTABLE_SKILLS`, `GENERATED_DIRS`, `parseAgentMarkdown`, `renderAgentToml`, `tomlBasicString`, `tomlMultilineContent`, `UnsupportedFrontmatterError`. | `build-codex-payload.mjs:61-264` | **ACCEPT.** They are additive, and now load-bearing: C2 `frozen_exports` names `PORTABLE_SKILLS`, and -12's M6 E6 catches `UnsupportedFrontmatterError` (`:391`) and keeps `PORTABLE_SKILLS`/`GENERATED_DIRS`. Do not rename any of them at re-integration. |
| 4 | dev | `cg_repo_root` treats an unknown mode like claude-first. | `lib/harness.sh:36-49` | **ACCEPT.** It never yields an empty root (measured with `bogus` and `''`). Shipped hooks cannot reach it, because test 11b pins every hook's mode. |
| 5 | integrate | `toml-eslint-parser` is loaded via `createRequire(anchor).resolve` plus `import()`. | `codex-hooks.mjs:690-708`, `:736` | **ACCEPT.** Test 46 imports the module from a clone with no `node_modules`, so a static import throws. The load is lazy (only when `qa.toml` exists). The installed-artifact fallback anchor was witnessed in test 46. |
| 6 | integrate | A pre-commit scratch driver ran in the harness lane, with `claude` stripped from the control PATH. | process | **ACCEPT.** There is no product change, it held the harness lane, and it surfaced the roles defect before test 46. |
| 7 | integrate | The Developer finished steps 3-5 and the witnesses after the driver showed roles red, then stopped. | process | **ACCEPT.** The red was in the sealed verdict, independent of the merge and the collection. |
| 8 | integrate | Test 46 ran once, not a third time. | process | **ACCEPT.** The failure was deterministic, and the fix run at 76dee8c is the second run. |
| 9 | fix | The codex version was read from `codex-package.json` instead of `codex --version`. | process | **ACCEPT.** This follows the credential rule, and the test's own `--version` probe then confirmed it. |
| 10 | fix | `template-approved-key.red` was also run (7/7). | process | **ACCEPT.** Additive coverage. |
| 11 | undeclared | A `(split across schemas)` suffix is added when `missing` is empty. | `evidence.mjs:1033` | **ACCEPT.** It affects the detail only and has been present since 44ba381. It is untested (TPV2 M18 survivor, harmless). |
| 12 | undeclared | An empty `qaFirstLine` FAILs. | `evidence.mjs:1039` | **ACCEPT.** This is stricter than M5-A52: an empty needle would match any child request. |
| 13 | undeclared | `pre-edit-gate.sh` reads stdin and sources the shim before the `MODE=off` early exit. | `pre-edit-gate.sh:18-20` vs `:51-53` | **ACCEPT.** M5-A50 moves the read above the source line. Exit codes, streams and logs are unchanged (parity 19/19). Off mode now costs one `cat` and one source. |

## 7. RS-4 readiness (M5-A54 correction): READY

- **Live state.** The live pin is `0.20.0`, from the live `stamp-and-gate.sh` pin line. All 9 live hooks equal cli `main` canonical plus pin (RS-4a is complete), and there are no live-only entries.
- **Comparison.** Comparing `<cw>/scaffold/hosts/claude/.claude/hooks/` with `OUTER/.claude/hooks/` (read-only `cmp`, pin substituted) gives exactly `ADD lib/harness.sh` plus `DIFF` for the 8 shimmed hooks. `pre-commit.sh` is `same`.
- **The dry-run list.** The `b0-live-resync.mjs` dry-run `changes` list after -11's merge and BD must be exactly these 9 entries. Any extra entry halts the step.
- **Hashes after `--apply`.** The before value is the current live file. The after value is the canonical with pin `0.20.0`, and is unchanged by the re-integration, because CR-124 touches no hook.

| Live file | Placeholders | Before | After |
|---|---|---|---|
| `hooks/lib/harness.sh` (0755) | 0 | absent | `5bca083fe82c8355307a3ba108fbf0d018ff077c579279ebbf467b998ec220b1` |
| `hooks/pending-task-sentinel.sh` | 1 | `fe597ef0…0766` | `ca2fa2ba368ac38dd28450f44153935b521f3f711eb743c93a5c193d945d1b6d` |
| `hooks/pre-commit-surface-gate.sh` | 0 | `009f20b6…98d2` | `c3acda8ab83f076b4973fceec61cdee9ea98e0407b1f2f2ce81ec5b633a507dd` |
| `hooks/pre-edit-gate.sh` | 1 | `4e401831…3e0a` | `5675e153b7a4eaeedaed72c822ec72b406999195c0bbd8edc1255d811151be44` |
| `hooks/pre-tool-use-autonomy.sh` | 0 | `b7c637c1…b132` | `e69d4eb9406e8a08974e0e551f476a1a0275b1976cc02559de31bf5c7f3ce645` |
| `hooks/pre-tool-use-task.sh` | 0 | `d0e5fb16…2906` | `a2ab42c952f50217ca03b77ec642498fc03116ca0ff9999b71bb4e470d444ff1` |
| `hooks/session-start.sh` | 2 | `14d73e83…4cb4` | `6e7c3fda5640cf015283004d1d6b707d983dda29e6756d79a8e384c8e7ee9bec` |
| `hooks/stamp-and-gate.sh` | 2 | `f1c4eaf9…3b79` | `d117a699ddfa1f3837c78e1f70ac8e0d2d68c73ae46a9a6cf77be5758d9f8027` |
| `hooks/token-ledger.sh` | 0 | `f4d832ba…ee9e` | `540bf9fa58a784fa5967c251683671b4824e907c5148d055c96e485a0d0c7b72` |

- **Order is load-bearing, and it holds.**
  - The outer `.git/hooks/pre-commit` is the live `pre-commit.sh` dispatcher. It chains the live `pre-commit-surface-gate.sh`, and so does every outer worktree commit, because hooks are shared via the common git dir.
  - A shimmed surface gate without `lib/` **exits 1** (measured, `set -euo pipefail` plus a failed `.`), which would block every outer commit.
  - `b0-live-resync.mjs` plans files in `readdirSync` order, and the canonical hooks dir lists `lib` first (measured). So `hooks/lib/harness.sh` is written before any shimmed hook. The dry run must show it as the first change entry.
- **Tests after RS-4.** `session-start.node` and `cr-026-integration` stay green only with re-seal R13/R14. Both are present at 76dee8c:
  - `test/hooks/session-start.node.test.ts:181-189`;
  - `test/hooks/cr-026-integration.node.test.ts:250-258`, `:297-300`.

  Each replaces `/^REPO_ROOT=.*$/m` and copies `lib/` beside the patched copy.
- **Named expected reds between merge and RS-4 are unchanged:** `canonical-live-parity` 5d, and doctor/banner drift for the 8 hooks plus `.claude/hooks/lib/harness.sh`.

## 8. Re-integration forecast onto cli main 6fc13d2 (CR-124 merged)

This was measured in a scratch clone: `76dee8c` + `git merge --no-ff 6fc13d2`, the row-level resolution below, `npm run gen:codex`, typecheck, and targeted tests.

**Must change: cli.**
1. **The merge.**
   - `CHANGELOG.md` auto-merges and keeps both entries: -11 at `:9`, CR-124 at `:23`.
   - `scaffold/core/.cleargate/knowledge/cleargate-enforcement.md` auto-merges: CR-124's 2-line edit plus §16. The result sha256 is `477b404f51058f0ff97439248b2caef53e345d4367e320adb3c80a85717650cc`, byte-equal to C2 `8c8c5ff`'s canonical.
   - There is one conflict, the `test/helpers/init-fixture.ts` tail (5 hunks). No `*.red.*` or sealed test conflicts.
2. **The resolution (rule 21).**
   - Take main's tail verbatim: …BUG-090 ×5, CR-124 ×6, CR-124's lead comment, then the one shared `item: 'STORY-058-11+CR-124'` row.
   - Git kept that row once as common text. Only the two items' lead comments conflict.
   - Delete -11's 5-line shared-row comment and -11's copy of the row. Keep CR-124's comment.
   - Append -11's 4 hook rows (with their `STORY-058-11 (M5 plan test 17 …)` header) after the shared row, then `]);`.
   - Then add -11's `SanctionedAddition` interface plus the `SANCTIONED_BASELINE_ADDITIONS` block, verbatim.
   - -11's non-tail edits auto-merge untouched: the `bug085SentinelCurrentHash` refusal and the addition-aware `captureOrCompare`.
3. **Regeneration.** Run `npm run gen:codex`. Before it, `--check` prints exactly 3 `stale:` lines. After it, exactly 3 files change, `--check` exits 0, and each is byte-equal to C2 `8c8c5ff`:
   - `architect.toml` → `71d1c56b2089a90120cd442942a2cbcbe6ae294945a371c3591a6711c88483ea`;
   - `architect-synth.toml` → `8bdd01387a4336dbc0ce3483140a0c4fb64f55d775bd4d363e70ae1bb5547522`;
   - `architect-reader.toml` → `64ba7730bb2a3620d708d142e8320f225da6a0cc8b9ef84ecf25a9a6fedc3f55`.

   Commit them separately from the merge commit, so the regeneration commit's diff is exactly those 3 files (mirrors C2 `8c8c5ff`).
4. **Rebuild the worktree.** `npm run prebuild && npm run build` in `<cw>` gives payload 83, split view 102, manifest 77, and verify-pack 222/83.

**Must change: outer** (`<ow>`, rule 21).
1. `git -C <ow> checkout -- .cleargate/knowledge/cleargate-enforcement.md`.
2. `git -C <ow> merge --no-ff sprint/S-41`. `git merge-tree abb3a991 sprint/S-41` is clean, and sprint/S-41's twin equals main's canonical (`8d8c8e98…`).
3. `cp <cw>/scaffold/core/.cleargate/knowledge/cleargate-enforcement.md <ow>/.cleargate/knowledge/`, then `cmp`. The expected sha256 is `477b404f…50cc`: sprint/S-41's twin plus exactly 18 inserted lines.

**Must NOT change.** On the simulated tree each of these was identical to 76dee8c:
- every file under `src/` and `scripts/`, including `build-codex-payload.mjs`, `evidence.mjs` and `codex-hooks.mjs`;
- all 9 Claude hooks, the 5 Codex hook copies and both `lib/harness.sh`;
- the 2 `.agents/skills` copies and the 8 non-architect TOMLs;
- every -11 test file, the 4 snapshot locks, and `test/fixtures/hooks-pre-058-11/`.

No re-freeze is needed: all 9 hooks at 6fc13d2 hash equal to the frozen fixtures.

**Invariants QA can check mechanically** (each measured true on the simulation):
- **I1.** The -11 delta is unchanged. The `+`/`-` line sets of these two diffs are identical (2722 lines):
  - `git diff <main> HEAD -- scaffold src scripts ':!scaffold/hosts/codex/.codex/agents/architect*.toml'`
  - `git diff 984e8d5 76dee8c` over the same paths
- **I2.** `git diff 76dee8c HEAD --stat` is CR-124's 12-file set plus the 3 architect TOMLs, with `init-fixture.ts` at +109/−18. That is 15 files, +1189/−85.
- **I3.** At main = 6fc13d2, `git diff 8c8c5ff HEAD -- scaffold` equals `git diff d0f0d95 984e8d5 -- scaffold`: BUG-090's 5 files, +157/−19. So the scaffold equals C2 plus main-since-C1.
- **I4.** In `init-fixture.ts` there is one row per `rel`, exactly one `item: 'STORY-058-11+CR-124'`, and one `SANCTIONED_BASELINE_ADDITIONS` row.

**Expected verification on the re-integrated tree.**

Measured on the simulation:

| Check | Result |
|---|---|
| `npm run typecheck` | exit 0 |
| M2 pair (compare only) | 5/5 and 15/15 |
| codegen | 30/30 |
| `init-fixture-cleanup.red` | 3/3 |
| `contract-first-dag-text.red`, with META_ROOT holding the re-derived twin plus sprint/S-41's Sprint Plan Template | 10/10 |
| `codex-enforcement-delta.red`, same META_ROOT | 15/15 |

Still to run, by the re-integration Developer and QA:
- **Rule-16 set.** It grows from 22 to **23 files** (helper excluded) by adding CR-124's `test/docs/contract-first-dag-text.red.node.test.ts`. Expected **335/335**: 325 plus 10, with default META_ROOT = `<ow>`, after step 3 of the outer half.
- **K3 set.** Unchanged, with `codex-hooks-harness` at 90.
- **`hooks-claude-parity`.** 19/19.
- **Harness lane, one scripted run** (QA-Verify, or test 46) on the re-integrated HEAD:
  - all 12 gating rows PASS;
  - `codex.live.roles` detail `11 roles listed; qa spawned with its instructions`.
  - The captured `agent_type.description` sha256 will **differ** from `f14f7bbb…` because CR-124 rewrote the `architect-reader` and `architect-synth` descriptions. That is expected and is not a failure. They are single-line with no ` {`/`}` lines, and the pinned fixture stays as is.

**DevOps suite count, a correction to M5-A54.** Previous merge's recorded total plus **96** default-tier tests, not 90. M5-A55 added 6 to `codex-hooks-harness`. The breakdown, measured main → -11:

| File | Tests |
|---|---|
| 4 new files | 30 + 6 + 18 + 15 |
| `codex-hooks-harness` | 67 → 90 |
| `init.node` | 31 → 34 |
| `hooks-snapshots` | 15 → 16 |

The integration tier adds 19 (the parity lock). `npm test` excludes that tier (`run-default-tests.mjs '!test/**/*.integration.node.test.ts'`), so the 19 show up only in `npm run test:integration`.

With CR-124's recorded merge total of `3390 / 3388 / 0 / 2` (`reports/CR-124-devops.md` §5), the -11 merge full suite is **3486 / 3484 / 0 / 2**, provided no other item merges first.

If a default-tier payload-parity test fails on the first pass because the merged canonical is ahead of the pre-merge `templates/` payload (`npm test` does not prebuild), follow the CR-124 DevOps precedent:
- re-run that file solo after the suite;
- name it in the report;
- never prebuild in the main checkout outside BD.

**If BUG-098 merges to main first.**
- The same init-fixture tail conflict recurs. BUG-098's 2 rows are part of main's tail, and the same recipe applies.
- BUG-098 overlaps no other -11 file (its list: `src/commands/{doctor,sprint,wiki-audit-status}.ts`, `src/lib/*`, 2 `scaffold/core` scripts, its own tests).
- I3's right-hand side then gains BUG-098's 2 scaffold scripts.
- Payload identity and verify-pack are unchanged: BUG-098 adds no payload file.

**The -12 coupling (M6 E4).**
- **Merge order.** -11 must merge before -12 integrates. -12 leaves `codex-hooks.mjs` unedited and relies on the collection landed here (`codex-hooks.mjs:309-320`, `:419-421`, `:431-433`, `:448`, `:690-749`).
- **Anchor shift.** `codexSkillsVerdict` is at `evidence.mjs:1047-1075` on this tree, versus the `:1035-1063` that M6 E4 cites at C2. The shift is +4 from pass D and +8 from the M5-A55 fix. -12 re-derives at integration.
- **The verdict inversion** (`sprint-execution` required) replaces the FAIL branch at `:1072`. The `not listed room-local: <names>` FAIL format already matches E4.
- **§16 bullet 10** is rewritten, and no index row is added.
- **Test 39.** TPV2 §2.6 forecast its edits to merge with the re-seal with 0 conflicts.
- **Names to keep stable.** -12 extends `build-codex-payload.mjs` through `UnsupportedFrontmatterError`, `PORTABLE_SKILLS`, `GENERATED_DIRS` and the `planCodexPayload` rel convention.
- **Hook edits.** Any -12 hook edit needs `npm run gen:codex`, and `session-start.sh`'s `Load skill: sprint-execution` directive under Codex stays -12's to host-gate.

## 9. Security and robustness: PASS

- **`cg_repo_root` never yields an empty root.** I measured 5 cases in a scratch repo, with env unset and under `set -u`:
  - inside `.git`: `git rev-parse` fails and `pwd` is used;
  - a subdirectory;
  - a non-git directory;
  - `bogus` and empty modes with a non-JSON payload;
  - a payload `cwd` of `--help`.

  Every case printed a non-empty path.
  - In `git` mode, `|| pwd` covers a failed `git`.
  - The payload branch prints only a non-empty top level.
  - The final `pwd` always prints.
  - The function always returns 0.
- **Behavior when both env vars are unset.** Before -11, orchestrator-first yielded an **empty** `REPO_ROOT`. Now it yields the payload top level or `pwd`. That is an improvement, and it is unreachable under Claude, where `CLAUDE_PROJECT_DIR` is always set.
- **Unknown mode resolves as claude-first** (row 4): accepted, and never empty.
- **No command injection through the payload cwd.**
  - The payload reaches `jq` only through `printf '%s' | jq -r '.cwd // empty'`.
  - The cwd is used only quoted, as `git -C "<cwd>"`, after `[ -d ]`. `-C` consumes the next argument verbatim, and there is no `eval`.
  - A payload cwd of `$(touch /tmp/cg-pwn-probe)` created nothing (measured).
  - The branch never runs under either registered host: Claude sets `CLAUDE_PROJECT_DIR`, and Codex commands export it (AD-2).
- **The harness side** uses `execFileSync(opts.codexBin, […])` with no shell and cwd `roomReal`. Under live, `c6.requests` is `[]`, and `inputs.json` stays in the container.
- **Missing `lib/` is a hard dependency** (measured):
  - the shimmed surface gate exits 1;
  - `session-start.sh` loses `REPO_ROOT` even with `CLAUDE_PROJECT_DIR` set, and writes toward `/.cleargate`.

  Mitigations are in place:
  - `init` copies `lib/` (M2 addition row);
  - upgrade installs new upstream files, and the sorted path `.claude/hooks/lib/…` precedes every shimmed hook;
  - the BUG-085 drift check reports a missing live `lib/harness.sh`;
  - RS-4 writes it first (§7).

  Follow-up FU-4 covers the manual hand-port path.

## Non-blocking follow-ups (file at close under EPIC-058)

- **FU-1.** The `codex debug prompt-input` call has no `timeout` (`codex-hooks.mjs:317`). Every turn and request is bounded (M5-A46); this child is not. Add `timeout: 60_000`.
- **FU-2.** `--write` never prunes extras (`build-codex-payload.mjs:295-304`). If a canonical agent is renamed or removed, its stale TOML fails prebuild's `--check` until it is deleted by hand. Add pruning or a message.
- **FU-3.** The plain-scalar reader accepts a value containing `: ` (`build-codex-payload.mjs:142`), which js-yaml rejects. It only diverges on invalid YAML, and the canonical agents are unaffected. Refuse `: ` in plain values.
- **FU-4.** The meta-repo `CLAUDE.md` "Dogfood split" still offers "hand-port the specific block". Since -11, a hook hand-ported without `.claude/hooks/lib/` breaks: the surface gate exits 1 and the other hooks lose their root. Reword it to "hooks and `lib/` together".
- **FU-5.** `codexSkillsVerdict` keeps the last `rN` mapping when several roots tables appear (`evidence.mjs:1058-1066`). Only one table was measured, so this is harmless today.
- **FU-6.** Update M5-A54's "+90" to "+96" in the plan, for the Reporter's arithmetic. §8 above is authoritative for DevOps.

## Script Incidents

None. `run_script.sh` was not invoked. While the review was running, OUTER `git status` briefly showed an untracked `.cleargate/sprint-runs/_off-sprint/.script-incidents/20260926T181123Z-3aa2c1355dbb.json`. It was gone at the re-check. This dispatch did not produce it: nothing here used `run_script.sh`, and no test ran with OUTER as its META_ROOT. The likely source is the concurrent merge lane.

## Scratchpad cleanup disclosure

My cleanup ran `rm -rf <scratchpad>/*.txt <scratchpad>/*.log <scratchpad>/*.patch <scratchpad>/*.tmp` at the top level of the **shared** session scratchpad, plus named files of my own.
- Any other agent's top-level files with those extensions are gone, and they cannot be recovered.
- Five older SPRINT-41 reports cite top-level scratch names of that shape: `bug089-npm-test.log`, `cr123-npm-test.log`, `reseal-058-07.patch`, `reseal-085.patch` and `tpv-058-06-reseal.patch`. All five items are merged.
- Subdirectories and every other extension were untouched.

## Git status at the end (read-only throughout)

- `<cw>`: clean, HEAD 76dee8c.
- `<ow>`: ` M .cleargate/knowledge/cleargate-enforcement.md`, the pre-existing twin, untouched.
- OUTER: the orchestrator's pre-existing `.session-totals.json`, `events.jsonl`, `state.json` and `token-ledger.jsonl` edits, plus this report.
- cli main checkout: on `main` @ 6fc13d2, untouched (pre-existing untracked `cleargate-0.25.0.tgz`).

```yaml
flashcards_flagged:
  - "2026-09-26 · #merge #init-fixture · A row both items added byte-identically merges as common text; only lead comments conflict. Keep upstream's."
  - "2026-09-26 · #hooks #dogfood-split · A hook sourcing lib/harness.sh breaks without lib/ (surface gate exits 1); sync lib/ first, never hand-port one."
  - "2026-09-26 · #integration #contract · Re-integration proof: diff main..HEAD over scaffold/src/scripts equals the item's own delta, minus regen files."
  - "2026-09-26 · #agents #scratchpad · The session scratchpad is shared by every agent; delete only files you created, by exact name, never by glob."
```
