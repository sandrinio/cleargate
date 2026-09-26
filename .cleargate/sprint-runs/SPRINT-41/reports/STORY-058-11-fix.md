# Developer fix report: STORY-058-11, codex.live.roles check (a) per M5-A55

role: developer

```
STORY: STORY-058-11
STATUS: done
COMMIT: 76dee8c955ced28cd7032d45d4b9bfc4aecc34df (cli story/STORY-058-11, on qa-red re-seal 6cdce4e)
TYPECHECK: pass (npm run typecheck exit 0; node --check scripts/clean-room/evidence.mjs OK)
TESTS: 6 files, 196 passed, 0 failed (harness 90/90/0 plus 5 importers, table below)
TEST46: 1/1/0, result PASS, every gating row PASS incl. codex.live.roles and codex.live.skills (cliSha 76dee8c)
```

## 1. Diff summary

One file, `scripts/clean-room/evidence.mjs`, +12/-4. It matches TPV2 section 2.4's reference diff size and the M5-A55 contract.

- `:954-955`: new constant `CODEX_ROLE_ENTRY_BODY = / \{\n[\s\S]*?\n\}(?=\n|$)/g`. It matches one role entry's description body in the measured layout, lazily, from ` {` at a line end to the next line that is exactly `}`.
- `:957-960`: new helper `codexRoleListingTexts(schema)`. It returns `codexDeepStrings(schema)` (object keys excluded) with every role-entry body removed. It sits directly after `codexHasWholeToken` (`:950-952`).
- `:1026-1033` in `codexRolesVerdict`, the `listsAll` / `missing` block:
  - `listsAll`: some single schema has every `names[i]` as a whole token (unchanged `codexHasWholeToken`, case-sensitive `(?<![\w-])name(?![\w-])`) in at least one of that schema's listing texts. There is no union across schemas.
  - `missing`: computed over the listing texts of all schemas (`flatMap`). The FAIL detail string is unchanged.
- Removed: both `JSON.stringify(schema)` tokenizations.
- Unchanged:
  - `codexSpawnAgentTypeSchemas`, which scopes to `properties.agent_type` inside `additional_tools` items (`body.tools` never counts);
  - (b), (c), the identity line, the live branch, N/A;
  - `CODEX_GATING_IDS`, `codex-hooks.mjs` and every test file.

## 2. Make-green

All runs were solo and one file at a time in `<cw>` (`npm run test:file -- <f>`). Counts come from `command grep -aE "^ℹ (tests|pass|fail|skipped|cancelled) "`.

| Check | Result | TPV2 expected |
|---|---|---|
| `node --check scripts/clean-room/evidence.mjs` | OK | OK |
| `npm run typecheck` | exit 0 | exit 0 |
| test/scripts/codex-hooks-harness.red.node.test.ts | 90/90/0, cancelled 0 | 90/90/0 (89/1 at 6cdce4e without the fix) |
| test/scripts/clean-room-evidence.red.node.test.ts | 60/60/0 | 60/60/0 |
| test/scripts/clean-room-baseline-coexistence.red.node.test.ts | 24/24/0 | 24/24/0 |
| test/commands/init-codex.red.node.test.ts | 6/6/0 | 6/6/0 |
| test/docs/clean-room-verification-doc.red.node.test.ts | 9/9/0 | 9/9/0 |
| test/scripts/template-approved-key.red.node.test.ts (extra: default-tier file that names evidence.mjs) | 7/7/0 | not listed |

About the file list:
- `command grep -rl "clean-room/evidence" test/` lists 3 importers: baseline-coexistence, codex-hooks-harness and init-codex. All 3 are in the table above.
- The integration-tier files that name `evidence.mjs` were not run, per TPV2 section 4: the -09 e2e and sprint-init-fresh-install. Test 46 was run, and section 3 covers it.

Other notes:
- **Red-without-fix witness.** QA-Red's re-seal commit 6cdce4e measured 89/1 on the unfixed `evidence.mjs`. The only failure was the measured-layout positive (reports/STORY-058-11-qa-red-reseal2.md section 3). I did not stash (dispatch rule). The 89/1 to 90/90 flip is the before/after pair.
- **No rebuild.** The fix is under `scripts/`, which `dist` does not bundle, and the brief did not require a rebuild. Test 46 clones the committed HEAD and packs its own artifact.

## 3. Test 46 (harness lane, one run)

**Pre-run checks.**
- Pinned binary sha256 `1d8b80de0a27f69b152bfb9b7b3b4fd3b8c589e4e76213db27219eab9ae53afa`: match.
- Version `0.154.0-alpha.6.2`, read from `codex-runtime-X33IWV/codex-package.json` without running the binary. The test's own `--version` probe then passed; it emitted no NOT RUN diagnostic.
- `claude` on PATH: `/Users/ssuladze/.local/bin/claude`.
- No `cg-s41-10-codexhooks-e2e-*` roots and no pinned-binary process before the run.

**Command.** In `<cw>` at HEAD 76dee8c: `CLEARGATE_CODEX_BIN=/Users/ssuladze/Documents/Dev/CG_TEST/sprint-41-D2QMC1/codex-runtime-X33IWV/bin/codex npm run test:file -- test/e2e/codex-hooks.red.integration.node.test.ts`

**Result.** Tests 1, pass 1, fail 0, cancelled 0, skipped 0; 102.8 s; exit 0. The log has no diagnostic and no `not ok`.

**Run facts** (from the test's own `summary.json`, kept by hard links):

| Field | Value |
|---|---|
| result | PASS |
| provider | scripted |
| cliSha | 76dee8c955ced28cd7032d45d4b9bfc4aecc34df |
| artifactInputs | c15db73e9a8d47f77539fdd43667d11f0dfe67f17ef9b5b67aa497d79b5be513 (same as the INTEGRATE run: `scripts/` is not an artifact input) |
| artifact | cleargate-0.26.1.tgz, sha256 7360144a283ccd7d662be757d08b033dd71af47c9f2edc26ad08764496f22ee6 |
| codex | codex-cli 0.154.0-alpha.6.2, sha256 1d8b80de…3afa, model gpt-5.6-terra |
| trust posture | harness-exact-hash |
| findings | none |

**Verdict rows** (all 14):

| Check | Result | Detail |
|---|---|---|
| codex.live.discovery | PASS | |
| codex.live.session-start | PASS | |
| codex.live.post-tool-use | PASS | |
| codex.live.edit-deny | PASS | |
| codex.live.edit-allow | PASS | |
| codex.live.dispatch-deny | PASS | |
| codex.live.dispatch-identity | PASS | |
| codex.live.shared-hooks | PASS | |
| claude.control.edit-deny | PASS | |
| codex.verify-install | PASS | |
| **codex.live.roles** | **PASS** | 11 roles listed; qa spawned with its instructions (was FAIL at 1e7f0e6) |
| **codex.live.skills** | **PASS** | flashcard, sprint-dashboard room-local; no room-local sprint-execution |
| codex.live.metering | INFO | unavailable |
| codex.live.trust-posture | INFO | harness-exact-hash: 5 hooks |

**Compared with the INTEGRATE run.** The only status change is `codex.live.roles`, FAIL to PASS. The other 13 rows are identical. This matches TPV2 section 2.4's scratch forecast exactly.

**Schema byte stability.** The new `inputs.json` holds 3 `properties.agent_type` schemas, one per C6 request. All 3 descriptions hash to `f14f7bbbfd4112449244bf14f39d2a7d8c801897df762ebdd2a8c9637916accb`, the value M5-A55 measured and the re-seal fixture pins. Only the description string was hashed; nothing else in the file was printed.

**Evidence kept** in `/private/tmp/cg-s41-fix11-evidence/`:
- `test46/{inputs,summary,turns}.json` and `test46/codex-hooks-evidence.md`, hard-linked by the INTEGRATE watcher method (a copy of `watch46.mjs`) before the test's `finally` removed the container;
- `test46/root.txt` and `test46/captured.txt` (4/4 captured);
- `test46.log` and `watch.log`.

**After the run.**
- No `cg-s41-10-codexhooks-e2e-*` root remains in `os.tmpdir()`.
- No pinned-binary (`codex-runtime-X33IWV`) process is running. The codex processes on the machine are the owner's ChatGPT desktop app and were not touched.
- `git -C <cw> status --porcelain` is empty.
- The test's own `mainStatusAfter === mainStatusBefore` assertion held.

## 4. Git status at the end

| Checkout | State |
|---|---|
| `<cw>` | clean; HEAD 76dee8c, then 6cdce4e, 1e7f0e6, 2941d83, 44ba381 |
| `<ow>` | ` M .cleargate/knowledge/cleargate-enforcement.md`: the pre-existing uncommitted twin, untouched |
| OUTER | only the orchestrator's pre-existing `.session-totals.json`, `events.jsonl`, `state.json` and `token-ledger.jsonl` edits, plus this report (untracked) |
| cli main checkout | on `main`, untouched; the pre-existing untracked `cleargate-0.25.0.tgz` |

## 5. Rules observed

- No stash, no reset, no push, no full `npm test`.
- No prebuild or build anywhere. None was needed.
- No writing CLI smoke.
- No bare `cleargate`.
- No CODEX_HOME, `~/.codex` or auth file was read, and `codex login status` was never run. The test ran the pinned binary with its own mock-server configuration.
- `/private/tmp/cg-s41-m2-init-baseline`, `/private/tmp/cg-s41-fresh-journey` and other worktrees were not touched.
- The story file's Task Breakdown was not ticked, because the file allow-list is `evidence.mjs` only. Row 8's tick belongs to the merge-lane outer commit (rule 17), as in the INTEGRATE report.

## Script Incidents

None. `run_script.sh` was not used: every command was `git`, `node --check`, `npm run typecheck` or `npm run test:file` in `<cw>`, plus the read-only watcher.

```yaml
plan_deviations:
  - { what: "codex version read from codex-package.json instead of running codex --version", why: "credential rule: avoid running the pinned binary outside the test; the test's own --version probe then confirmed it", orchestrator_confirmed: false }
  - { what: "also ran test/scripts/template-approved-key.red.node.test.ts (7/7/0)", why: "a default-tier file that names evidence.mjs; additive coverage only", orchestrator_confirmed: false }
flashcards_flagged: []
```
