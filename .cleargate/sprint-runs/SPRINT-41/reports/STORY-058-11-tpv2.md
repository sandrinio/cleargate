# TPV2 report: STORY-058-11, codex.live.roles check (a)

role: architect

```
TPV2: re-seal required
RESEAL_PATCH: .cleargate/sprint-runs/SPRINT-41/reports/STORY-058-11-tpv2-reseal.patch
RESEAL_SHA256: 5d7241c2cd5d6de9e03899a51e8653ef3ff311797d2857b56055f50581d4df43
APPLIES_ON: cli story/STORY-058-11 @ 1e7f0e6 (git apply --check clean on a pristine clone; 1 file, +118/-5; staged list == patch list)
NEW_COUNTS: codex-hooks-harness.red 84 -> 90; at the re-seal commit 89 pass / 1 fail (the measured-layout positive, test 46's exact detail)
BLUEPRINT: plans/M5.md M5-A55 (appended as the last entry of "Amendments from TPV (STORY-058-11, 2026-09-26)")
```

## 1. Ruling

Check (a) walks the `properties.agent_type` schema value deeply and tests each **parsed string value**, never `JSON.stringify` output, with the unchanged whole-token regex. The binding text is plan M5-A55.

**One addition to the rule suggested in the dispatch: the body of each role entry is removed before matching** (`str.replace(/ \{\n[\s\S]*?\n\}(?=\n|$)/g, '')`).

- **Why.** On the captured description, the plain parsed-string rule PASSes when the `architect-reader` entry or the `architect-synth` entry is missing. architect-synth's description says "AFTER all architect-reader agents", and architect-reader's says "for architect-synth to consume" and "architect-synth's job".
- **What the addition changes.** With bodies removed, all 11 single-role omissions on the captured data FAIL. The plain rule catches 9/11. The comma-layout fixtures have no ` {` bodies, so they behave exactly as before.

The other decisions:

- **Keys are excluded.**
  - The measured keys of the agent_type value are `type` and `description`, which are JSON-Schema keywords.
  - codex's built-in role `default` has the same name as the `default` keyword, so counting keys could turn a structural keyword into a listed role.
  - `codexDeepStrings` already excludes keys.
- **The scope is exactly the `properties.agent_type` value.** The `additional_tools` item carries `role: "developer"`, and so does every developer message. Measured: the whole item minus `agent_type` matches `developer`, so any wider walk falsely passes an unlisted `developer`.
- **Unchanged from M5-A52:**
  - one single schema must list every role; a union across schemas does not count;
  - the `additional_tools` source;
  - `body.tools` never counts;
  - (b), (c), the identity line, the live branch, N/A and gating;
  - the FAIL detail format.

## 2. Per-step evidence

### 2.1 Captured data

Source: `/private/tmp/cg-s41-int11-evidence/`. Read-only.

- **Shape.**
  - `test46/inputs.json` has provider `scripted` and 3 C6 requests. The requests are `/root`, `/root` (follow-up) and `/root/cg_probe` (child).
  - `spawn_agent` sits at `input[0].tools[1].tools[4]` of the `additional_tools` item. Its `parameters.properties` keys are `agent_type`, `fork_turns`, `message`, `model`, `reasoning_effort` and `task_name`.
  - `properties.agent_type` is `{ type: 'string', description }`.
  - The description is 6029 chars and 57 lines, sha256 `f14f7bbbfd4112449244bf14f39d2a7d8c801897df762ebdd2a8c9637916accb`.
  - Layout: a header line, `Available roles:`, then 14 entries of the form `<name>: {`, the description, `}`. The 11 ClearGate roles come first, then `default`, `explorer` and `worker`. There are exactly 14 lines equal to `}`. There is no CR, no tab and no `${`.
- **Byte stability.** The description hashes identically in all 3 requests of test 46 and all 3 requests of driver a1.
- **Rules on the real schema.**
  - The stringify rule matches 2/11: `architect-reader` and `architect-synth`.
  - Parsed strings match 11/11.
  - The rest of the spawn_agent tool, minus agent_type, matches 0 names.
  - The whole additional_tools item minus agent_type matches `developer`.
- **Credentials.**
  - A pattern scan (authorization, api key, access/refresh/id token, Bearer, `sk-…`, password, secret) found no hits in either `inputs.json`.
  - Only the agent_type description string was copied into the fixture. It holds ClearGate agent descriptions and codex's built-in role texts.
  - Request `client_metadata`, which includes an `installation_id`, was not copied.

### 2.2 Pre-screen: which one-missing negative kills which weak rule

This was measured on the captured description. P means the weak rule wrongly PASSes on that negative, so the negative kills that rule.

| captured description minus | substring | case-insens. | `\b` | lookbehind-only | whole-item scope | plain parsed-string (no body removal) |
|---|---|---|---|---|---|---|
| architect | P | P | P | P | F | F |
| architect-reader | P | P | P | P | P | **P** |
| architect-synth | P | P | P | P | P | **P** |
| developer | F | P | F | F | **P** | F |
| qa | F | P | F | F | F | F |
| reporter, devops, 4× cleargate-wiki-* | F | F | F | F | F | F |

The re-seal therefore drops `architect`, `architect-reader` and `developer`. The existing sealed negative drops `reporter`, which kills only `names.some`.

### 2.3 The re-seal

File `test/scripts/codex-hooks-harness.red.node.test.ts`, +6 tests. Existing cases are unchanged.

- **Fixtures and helpers:**
  - `import { createHash } from 'node:crypto'`.
  - An M5-A55 paragraph in the Test 15 comment block.
  - `spawnSchemaTools(roles, agentType?)` and `c6Requests({ agentType? })`: an optional override of the whole agent_type schema value. The comma layout stays the default.
  - `MEASURED_AGENT_TYPE_DESCRIPTION`: the verbatim capture as a `[...lines].join('\n')` constant, plus `MEASURED_AGENT_TYPE_DESCRIPTION_SHA256`.
  - `measuredAgentType({ drop })`: removes whole `<name>: {` … `}` entries, and asserts that the entry exists.
- **New Test 15 cases:**
  - "M5-A55: the measured one-per-line agent_type layout … verdicts codex.live.roles PASS". It asserts the fixture sha256 first, then roles PASS, then every gating id PASS.
  - "M5-A55: roles listed only as string values deeper in the schema (an enum array) count". This pins the deep walk.
- **New RS_MUTATIONS single faults.** They are inserted after the comma "architect missing" row, away from -12's skills rows. Each must FAIL roles while skills and every -10 gating id stay PASS:
  - the measured layout minus `architect`;
  - the measured layout minus `architect-reader`;
  - the measured layout minus `developer`;
  - a comma listing with `Architect` in place of `architect`.

### 2.4 Satisfiability scratch

**Root.** `/private/tmp/claude-501/-Users-ssuladze-Documents-Dev-ClearGate/75d958ba-2473-408d-b4db-e15b774ad28f/scratchpad/tpv2`. Refs were resolved to SHAs before cloning.

**Layout** (so `META_ROOT = <cli>/..` stays inside the scratch):
- outer: `git clone` of OUTER at `abb3a991e4a4ff6adefa3d0747895f3a978332e4` (the `<ow>` HEAD);
- `.cleargate/knowledge/cleargate-enforcement.md` = `cp` from the scratch cli canonical (`cmp` 0 against `<ow>`'s uncommitted twin);
- `.claude` = a copy of OUTER/.claude (a copy, not a symlink, so no test can write live files);
- cli: `git clone` of OUTER/cleargate-cli at `1e7f0e6e052aea6d4a79a5f3646bf583f62c946e`, nested at `outer/cleargate-cli`, with `node_modules` symlinked to OUTER/cleargate-cli/node_modules;
- `npm run prebuild` exit 0 (manifest 77) and `npm run build` exit 0, in the scratch only.

**Red on the current `evidence.mjs`** (re-seal applied, no fix). `npm run typecheck` exits 0. `npm run test:file -- test/scripts/codex-hooks-harness.red.node.test.ts` → tests 90, pass 89, fail 1:
- The only failure is the measured-layout positive.
- Its detail is byte-equal to test 46's: `{"status":"FAIL","detail":"spawn_agent agent_type schema does not list every role; missing: architect, cleargate-wiki-contradict, cleargate-wiki-ingest, cleargate-wiki-lint, cleargate-wiki-query, developer, devops, qa, reporter"}`.
- The fixture sha256 assertion ahead of it passed.

**Conformant fix, check (a) only** (reference; the Developer writes it):

```js
/** One role entry's description body in the measured `agent_type.description` layout: ` {\n<description>\n}` (M5-A55). */
const CODEX_ROLE_ENTRY_BODY = / \{\n[\s\S]*?\n\}(?=\n|$)/g;

/** The texts an agent_type schema lists roles in: every deep string value (keys excluded), role-entry bodies removed (M5-A55). */
function codexRoleListingTexts(schema) {
  return codexDeepStrings(schema).map((str) => str.replace(CODEX_ROLE_ENTRY_BODY, ''));
}
// in codexRolesVerdict:
  const listsAll = schemas.some((schema) => {
    const texts = codexRoleListingTexts(schema);
    return names.every((name) => texts.some((text) => codexHasWholeToken(text, name)));
  });
  if (!listsAll) {
    const texts = schemas.flatMap((schema) => codexRoleListingTexts(schema));
    const missing = names.filter((name) => !texts.some((text) => codexHasWholeToken(text, name)));
```

The helper sits right after `codexHasWholeToken` (`evidence.mjs:950-952`). The `listsAll`/`missing` replacement is at `:1018-1024` of `1e7f0e6`. The diff is 12 insertions and 4 deletions. `node --check` is OK and `npm run typecheck` exits 0.

**Green with the fix.** The re-sealed file gives 90/90/0.

**The rest of the K3 set and every `evidence.mjs` importer** (one file at a time, `npm run test:file`, in scratch with the fix; `cancelled` was 0 on every file):

| File | tests/pass/fail |
|---|---|
| test/scripts/codex-agents-codegen.red | 30/30/0 |
| test/scaffold/portable-skills.red | 6/6/0 |
| test/hooks/harness-shim.red | 18/18/0 |
| test/docs/codex-enforcement-delta.red | 15/15/0 |
| test/scripts/codex-hooks-harness.red | **90/90/0** (84 before the re-seal) |
| test/commands/init.node | 34/34/0 |
| test/snapshots/hooks-snapshots.node | 16/16/0 |
| test/commands/lifecycle-codex.red | 6/6/0 |
| test/commands/init-host-snapshot.red | 13/13/0 |
| test/scaffold/codex-payload.red | 14/14/0 |
| test/hooks/pre-tool-use-task.node | 13/13/0 |
| test/hooks/stamp-and-gate.node | 7/7/0 |
| test/hooks/session-start.node | 9/9/0 |
| test/scaffold/file-surface-gate-e2e.node | 21/21/0 |
| test/scaffold/pre-commit-downstream-safe.node | 12/12/0 |
| test/hooks/cr-026-integration.node | 1/1/0 |
| test/hooks/hooks-claude-parity.red.integration | 19/19/0 |
| test/scripts/clean-room-evidence.red | 60/60/0 |
| test/scripts/clean-room-baseline-coexistence.red | 24/24/0 |
| test/commands/init-codex.red | 6/6/0 |
| test/docs/clean-room-verification-doc.red | 9/9/0 |

Every count except the harness file matches the INTEGRATE report. The M2 pair was not run, because it reads `/private/tmp/cg-s41-m2-init-baseline`, which this dispatch was not to touch; `evidence.mjs` does not reach it. Neither test 46 nor the -09 e2e was run.

**Captured test-46 inputs through the fixed `codexHookVerdicts`:**
- `codex.live.roles` PASS, with detail "11 roles listed; qa spawned with its instructions".
- Compared with test 46's `summary.json` rows (14 compared), the only status change is `codex.live.roles`: summary FAIL, fixed PASS. Every gating id is PASS, and metering and trust-posture are INFO.
- Driver a1's inputs give the same result, except `claude.control.edit-deny` FAIL "not run: claude not on PATH", which is by design there.
- Each of the 11 single-role omissions applied to the captured description, in all 3 requests, gives FAIL (11/11).

### 2.5 Patch integrity (the 3-point gate)

1. The sha256 is `5d7241c2cd5d6de9e03899a51e8653ef3ff311797d2857b56055f50581d4df43`.
2. In a fresh pristine clone at `1e7f0e6`, `git apply --check` is clean. After `git apply`, the file is byte-equal (`cmp`) to the scratch re-sealed file.
3. `git add -A && git diff --cached --name-only` lists exactly `test/scripts/codex-hooks-harness.red.node.test.ts`. The patch has 1 file, +118/−5, and 0 CR bytes.

### 2.6 -12 merge forecast

- Setup: a simulated -12 test-39 edit on `1e7f0e6`'s file. The all-pass gains `sprint-execution` r1, and the "listed → FAIL" row is replaced by "not listed → FAIL".
- `git merge-file` of the re-sealed file, that base and the -12 edit gives **0 conflicts**. The re-seal's hunks sit at the imports, the Test 15 comment, `spawnSchemaTools`/`c6Requests`, after `c6Requests`, after RS row 2, and after the first Test 15 case.
- Under -12's inverted skills rule, the new cases still hold. They mutate only `c6.requests` and assert that skills stays PASS on the all-pass input, which -12 updates.

## 3. Mutants

There were 22 mutants of check (a), each applied to the scratch fix and run against the re-sealed harness file. The fixed file was restored afterwards (`git diff --stat -- scripts` = the fix only).

| # | Mutant | Result | Killed by |
|---|---|---|---|
| M1 | `JSON.stringify` kept (sealed M5-A52 text) | killed (1) | measured-layout positive |
| M2 | first line of each string only | killed (1) | measured-layout positive |
| M3 | substring match, no token boundaries | killed (3) | comma minus architect; measured minus architect; `Architect` case row |
| M4 | case-insensitive token match | killed (1) | `Architect` case row |
| M5 | no body removal (the dispatch's plain parsed-string rule) | killed (1) | measured minus architect-reader |
| M6 | scope widened to the `additional_tools` item | killed (1) | measured minus developer |
| M7 | scope widened to the whole request | killed (1) | measured minus developer |
| M8 | scope widened to the `spawn_agent` tool object | **survives** | none |
| M9 | `description` string only, no deep walk | killed (1) | enum-array positive |
| M10 | object keys also count | **survives** | none |
| M11 | `names.some` instead of `every` | killed (6) | all six roles-listing negatives |
| M12 | `\b` word boundaries | killed (3) | the architect rows and the case row |
| M13 | lookbehind only | killed (3) | the architect rows and the case row |
| M14 | lookahead only | **survives** | none |
| M15 | greedy body removal | killed (1) | measured-layout positive |
| M16 | body removal also deletes the `<name>: {` line | killed (1) | measured-layout positive |
| M17 | body removal without the `(?=\n|$)` guard | **survives** | none |
| M18 | union across schemas (a split listing accepted) | **survives** | none |
| M19 | `body.tools` also counted | killed (1) | existing body.tools row |
| M20 | stringify with the `\n` escape undone, no body removal | killed (1) | measured minus architect-reader |
| M21 | listing texts joined with no separator | killed (1) | enum-array positive |
| M22 | check (a) removed | killed (6) | all six roles-listing negatives |

The five survivors behave identically to the ruled rule on every measured shape. None is pinned, by design:

- **M8.** The rest of the spawn_agent tool names no role (measured 0/11).
- **M10.** The schema keys are only `type` and `description`.
- **M14.** No roster name is a proper suffix of another token in the listing texts.
- **M17.** No description holds a line that is exactly `}` followed by more text.
- **M18.** codex sends one identical schema in every request (measured, 3/3 in both captures).

## 4. Developer brief (INTEGRATE fix dispatch)

**Order.**
1. QA-Red applies the patch on cli `story/STORY-058-11` in `<cw>` = `OUTER/.worktrees/STORY-058-11/cleargate-cli`. The tip must still be `1e7f0e6`; if it moved, re-run `git apply --check` first.
   - Run the 3-point gate: sha256 as above; `git apply --check`; staged list == the one file.
   - Expected red: `npm run test:file -- test/scripts/codex-hooks-harness.red.node.test.ts` → 90 tests, 89 pass, 1 fail. The failure is the measured-layout positive, with the detail in 2.4.
   - Commit, for example `qa-red(STORY-058-11): TPV2 re-seal, codex.live.roles measured one-per-line layout (M5-A55)`.
2. The Developer builds on that commit in `<cw>`.

**File allow-list.**
- `scripts/clean-room/evidence.mjs` only, and only check (a):
  - the `CODEX_ROLE_ENTRY_BODY` constant and the `codexRoleListingTexts` helper beside `codexHasWholeToken`;
  - the `listsAll`/`missing` block in `codexRolesVerdict`.
- Build to plan M5-A55 verbatim. The reference in 2.4 is scratch-verified.
- **Forbidden:** every test file, `codex-hooks.mjs` (`scriptedResponder` is unchanged, and seam 4 is proven), every other verdict, `CODEX_GATING_IDS`, and the outer twin (it stays uncommitted in `<ow>` for the merge lane).

**Make-green set.** Solo, one file at a time, in `<cw>`, never the full suite:
- `node --check scripts/clean-room/evidence.mjs` and `npm run typecheck`.
- `test/scripts/codex-hooks-harness.red.node.test.ts` → **90/90/0**.
- `test/scripts/clean-room-evidence.red.node.test.ts` → 60/60/0.
- `test/scripts/clean-room-baseline-coexistence.red.node.test.ts` → 24/24/0.
- `test/commands/init-codex.red.node.test.ts` → 6/6/0.
- `test/docs/clean-room-verification-doc.red.node.test.ts` → 9/9/0.
- `git -C <ow> status --porcelain` shows only the twin.

Then commit, for example `feat(EPIC-058): STORY-058-11 integrate, codex.live.roles check (a) over parsed strings with role-entry bodies removed (M5-A55)`. Test 46 clones the committed HEAD (`test/e2e/codex-hooks.red.integration.node.test.ts:10-11`, `:61`), so the commit comes before test 46.

**The single test-46 re-run.** Harness lane, one run:
- Command: `CLEARGATE_CODEX_BIN=/Users/ssuladze/Documents/Dev/CG_TEST/sprint-41-D2QMC1/codex-runtime-X33IWV/bin/codex npm run test:file -- test/e2e/codex-hooks.red.integration.node.test.ts`
- Before: verify the binary's sha256 is `1d8b80de0a27f69b152bfb9b7b3b4fd3b8c589e4e76213db27219eab9ae53afa` and its version is `codex-cli 0.154.0-alpha.6.2`. Keep `claude` on PATH (1 haiku control session).
- Expected: 1/1/0. In `summary.json`, `codex.live.roles` is PASS with detail "11 roles listed; qa spawned with its instructions", every gating id is PASS, and `result` is PASS.
- After:
  - no `cg-s41-10-codexhooks-e2e-*` roots remain;
  - no codex app-server is running;
  - `git -C <cw> status --porcelain` is empty.
- Keep `summary.json` with the INTEGRATE hard-link watcher method.
- If roles still FAILs, stop and report the detail. Do not re-run.

**Not re-run by the Developer.** The rest of K3, the rule-16 list and the M2 pair. The delta is one function plus one test file, all measured green in 2.4. QA-Verify owns the integrated-tree verification (rule 21).

## 5. Effect on -12 and -13

- **Contract.** Unchanged: the input shape, the verdict shape `{ status, detail }`, the ids and gating are all the same.
- **-12.** The M6 test-39 skills edits merge cleanly (2.6). The new roles cases assert that skills stays PASS on the all-pass input, which -12 updates when it inverts the `sprint-execution` rule.
- **-13 (M6).**
  - `ENFORCEMENT_IDS` (`M6.md:737`) exclude `codex.live.roles`.
  - The control-verdict reuse (`M6.md:744`) feeds only S1–S4 into the C2–C6 ids.
  - T-M6-4's "`codexHookVerdicts` input shape" tag stays valid.
  - Note for the -13 re-derivation: any -13 fixture that models codex's `spawn_agent` schema uses the measured one-per-line layout, and any roles-listing check it adds follows M5-A55.

## 6. Orchestrator actions, in order

1. Commit `plans/M5.md` (M5-A55), this report and the patch on `sprint/S-41`. This is an orchestrator chore commit under the standing `SKIP_SURFACE_GATE=1` bypass (rule 17).
2. Dispatch QA-Red to apply the patch on cli `story/STORY-058-11` @ `1e7f0e6`, with the 3-point gate and the expected 89/1 red. Then commit.
3. Dispatch the Developer with section 4: `evidence.mjs` check (a) only, the make-green set, the commit, then the single test-46 re-run in the harness lane.
4. Continue rule 21: QA-Verify with the scripted `codex-hooks.mjs run --ref story/STORY-058-11 --container …` (harness lane) and the M5-A6 Claude baseline, then post-flight, then DevOps.

No story-text amendment is needed: §3.1 already lists `evidence.mjs` and the harness test, and Task Breakdown row 8 covers the fix. `arch_bounces` was already raised to 2 when INTEGRATE routed this finding, and this ruling resolves that same finding.

## 7. Git status and cleanup

- OUTER: the orchestrator's pre-existing ledger/state/events/session-totals edits, plus `plans/M5.md` (M5-A55 appended), plus this report and the patch (untracked).
- `<ow>` `abb3a991`: only the pre-existing uncommitted twin.
- `<cw>` `1e7f0e6`: clean.
- cli main checkout: on `main` @ `984e8d5`, untouched (the pre-existing untracked `cleargate-0.25.0.tgz`).
- No commit, stash, build or prebuild ran in any real checkout. Nothing was written to `/private/tmp/cg-s41-m2-init-baseline` or `/private/tmp/cg-s41-fresh-journey`.
- No CODEX_HOME, `~/.codex` or auth file was read, and no codex binary was run.
- The scratch root was deleted at the end of the dispatch.
- **Cleanup disclosure.** The session scratchpad is shared, and my cleanup ran `rm -rf <scratchpad>/*.mjs` to remove my own helper scripts. That glob also removes any top-level `.mjs` another agent left there, and nothing can be recovered. What I checked afterwards:
  - no SPRINT-41 report, plan or root doc cites a top-level scratchpad `.mjs` path;
  - the INTEGRATE driver scripts survive as copies in `/private/tmp/cg-s41-int11-evidence/` (`iterate.mjs`, `watch46.mjs`);
  - subdirectories and every other extension were untouched.

## Script Incidents

None. `run_script.sh` was not used. Every command was a read-only `git` operation on real checkouts, a scratch clone, or `npm run …`/`node` inside the scratch.

```yaml
flashcards_flagged:
  - "2026-09-26 · #tpv #codex · Whole-token role check over codex's listing false-passes: role descriptions name other roles. Strip {…} bodies first."
  - "2026-09-26 · #tpv #test-harness · Pick each one-missing negative by what else names that role; dropping 'reporter' kills only some()."
  - "2026-09-26 · #codex #test-harness · additional_tools items carry role:'developer'; a role check wider than properties.agent_type counts it."
```
