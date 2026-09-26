role: architect

# STORY-058-09 — Architect post-flight

**ARCH: PASS.** Merge now. There is no pre-merge remediation.
- **Latent defects.** Every defect found is latent until codex registers. None of them touches Run 1's validity, the e2e subset, or the close gate.
- **Where the fixes land.** They are binding forward amendments M5-A1..A14 in `plans/M5.md`. They land in -10 pass B, before RS-4.
- **M4 closure.** `plans/M4.md` §"As-built resolution after STORY-058-09" closes M4 once DevOps completes the plan below.

## Subject and what I measured

- **cli:** `story/STORY-058-09` @ `7ce56a2` on `main` `1b742b3`.
  - The Dev commit adds `scripts/clean-room/{probe-items,evidence,claude-baseline}.mjs` (1426 lines).
  - The branch also carries QA-Red's `eed511c` and `6c5a4c5` (unit 60, e2e 13).
  - Tree `a81db427d91a2b5776df407d1aa79a42fbd4895e`.
- **outer:** `.worktrees/STORY-058-09` @ `22c1e557`.
  - `clean-room-evidence.md`: blob `18eb790d…`, sha256 `854aa7c9827c2effdf4cb72dd767fd0cce64b9ece41eaaddb9b104216cb35df8`, 49 lines.
  - Doc §5/§6: blob `fde7af58…`.
- **Run 1 container:** `/Users/ssuladze/Documents/Dev/cg-cleanroom-20260926T064145Z-claude`. I audited it read-only:
  - all four stream files;
  - both `_off-sprint/token-ledger.jsonl` (one `agent_type: qa` row each);
  - both `gate-check.log` tails (`stamp=0 gate=0 ingest=0 …EPIC-001_cleanroom_probe.md`);
  - both snapshots (`hosts ["claude"]`);
  - `summary.json`.
- **Close gate:** read `close_sprint.mjs:1015-1231`. I extracted its two frontmatter parsers and ran them on the -09 story file (results under "Step 2.9 contract").
- **Writes:** nothing ran against either repo except this report and the two plan appends. Scratch work lives under the session scratchpad `arch09/`.

## A. Conformance review

| Surface | Contract | As built | Status |
|---|---|---|---|
| `decideRun` | M4-A26 | PASS iff every `GATING_CHECKS` id has a row with both columns PASS. Only `agents-md-exposure` may be N/A. A missing row fails the run. `knownFail` relabels only a FAIL column of `sprint-init`, and records `known-fail ignored for <id>` for any other id, so `dispatch` can never be known-fail. `result` is never changed by `knownFail` (`evidence.mjs:364-399`). | conformant |
| `parseClaudeStream` | M4-A24 | `hooks` holds `hook_response` events only. `toolErrors` holds `tool_result` blocks with `is_error: true` inside `user` messages. Non-JSON lines are skipped. The last `result` wins (`:210-254`). | conformant |
| `claudeLiveVerdicts` | M4-A24 | 8 short keys. Each rule matches the ruling: session-start by regex plus exit 0; ≥1 Edit and ≥2 Agent; post-tool-use needs 4 conditions; dispatch needs rows with `agent_type === 'qa'`; agents-skills is a superset check; agents-md-exposure is N/A/FAIL/FAIL/FAIL/PASS in order; identity is an exact trimmed line (`:258-353`). | conformant |
| `validateContainer` | M4-A25 | Checks run in order: absolute → not existing → realpath of the parent → tmp roots → git check on the realpathed parent. `defaultContainerProbes` is exported (`:495-552`). | conformant |
| mcp-connect detail | M4-A27 | The detail string matches the ruling byte for byte. The entry is selected by name; entries without `source` count (`:320-328`). Run 1 shows `status=connected source=project; non-project entries: 4`. | conformant |
| `frontmatterIntact` | M4-A29 | The first two `---` lines bound the block. The id line may carry double quotes and a `# comment`. No `<idKey>:` line may follow the block (`:177-199`). | conformant |
| `compareInstallTrees` | J4 | Raw sha256 plus `mode & 0o777`. `.git` is skipped at every depth. The five violation strings are verbatim. **Symlinks are skipped silently** (`:112`). `CLAUDE_OBSERVABLE` is exported but unused, and rule (b) re-states it as a literal (`:148`). | conformant; F7 |
| Scrubbed env and explicit cwd on every child | J5, M4-A15 | Room children (init, verify-install, doctor, new, sprint init, hooks, `claude -p`) are conformant. **9 other spawns lack an explicit `cwd`, a scrubbed env, or both:** `git clone` `:449`; `npm run build` and `npm pack` (env) `:451-455`; `git -C … rev-parse` `:460`; `npm install` `:464`; `command -v cleargate` `:468`; `verify-install --help` `:472`; `claude --version` `:476`; `git init` (env) `:483-484`. QA's statement that "none relies on an inherited cwd" is inaccurate. The effect I measured is none: no prebuild or tsup script reads `process.env`, the package has no install lifecycle script, and neither cwd has an `.npmrc`. | F5 → M5-A7 |
| Step order and isolation | J5 | Step 4 (verify ×3, doctor ×2, tree comparison, check-scaffold) runs before any probe item, and check-scaffold runs after the comparison, so its `.drift-state.json` write cannot pollute it. `lstat` of `cleargate-cli` runs before, after S1 and after both rooms. The identity probe is written and removed with a `.claude/` listing invariant. | conformant |
| Sessions and container | M4-A20, A21 | `--no-session-persistence` is never passed. `session_dirs` is in `summary.json`. The container is `cg-cleanroom-<stamp>-claude`, a sibling of the repo. | conformant |
| Blueprint step 6, S3 | J5 "steps 0–8" | **Not implemented.** `claude-baseline.mjs:339-350` hard-codes `s3: null, canary: null` while `hasAgentsMd` is read from disk. The first `--host all` room that has `AGENTS.md` (from -10's merge on) FAILs `agents-md-exposure`. The Dev report frames this as an "extension point" rather than a deviation. | F1 → M5-A1 |
| Host lines | blueprint output | `allResolvedHosts = verifyAllClaude.parsed?.registered` (`:503`) records the registry, not the all room's snapshot (`installed`, `verify-install.ts:603,656`). Run 1 is correct only by coincidence: the snapshot really is `["claude"]`, which I read from the file. | F2 → M5-A4 |
| Evidence file | J5 | Append-only: existing bytes are kept, the next index is max + 1, and the pinned header is written when absent. The crash path appends a FAIL run with all-zero inputs. | conformant |
| `renderRunSection` | M4-A26 | It writes `result` verbatim and round-trips (E3-7). **Cells, findings and label are not sanitised** (O1), and the Condition-3 line is hard-coded "vacuous" (`:435-437`). | F3, F4 → M5-A2, A3 |
| `check` | M4-A18, J6 | `--evidence` and `--write-result` resolve against cwd. `--cli` defaults to the script root, `--ref` to `main`. Exit 0/1, and 2 on usage errors. It writes `{story, command, ran_at, exit_code, status, reason}` and creates the directory. | conformant |

### Step 2.9 contract (task A, measured)

- **Declaration read.** `close_sprint.mjs` Step 2.9 scans `OUTER/.cleargate/delivery/{pending-sync,archive}/*.md`. My simulation of its parsers on the -09 file returns:
  - `sprint_cleargate_id="SPRINT-41"` (unquoted; this matches);
  - `story_id=STORY-058-09`;
  - one entry: `{command: "node cleargate-cli/scripts/clean-room/claude-baseline.mjs check --evidence .cleargate/sprint-runs/SPRINT-41/clean-room-evidence.md --write-result .cleargate/sprint-runs/SPRINT-41/deferred-verify/STORY-058-09.json", blocks: "close"}`.

  The file is byte-identical on `sprint/S-41` and the story branch.
- **What Step 2.9 reads.** It never runs the command. It reads **`/Users/ssuladze/Documents/Dev/ClearGate/.cleargate/sprint-runs/SPRINT-41/deferred-verify/STORY-058-09.json`** and requires both `status === "green"` and `exit_code === 0`. Every other field is ignored.
- **What RS-CLOSE writes.** RS-CLOSE's B1 call, run from the OUTER root, writes exactly that path. In scratch it wrote `{"exit_code":0,"status":"green","reason":null}` for green and `{"exit_code":1,"status":"red","reason":"last run (#2) result is FAIL"}` for red.
- **Verdict: the contract matches.** -09's `deferred_verification` entry matches it. The `command` field inside the JSON is a synthetic string rather than the invoked argv; Step 2.9 ignores it (FU-2).
- **Residual hazard.** Step 2.9 cannot detect a stale green file. Only RS-CLOSE, after the last cli merge, may pass `--write-result` (M4-A18, restated in M5-A12).

## B. Binding rulings

- **D1 — the `active-sprint` synthetic drive: ACCEPT. No remediation, and Run 1 stays.**
  - J5's parenthetical ("whether `.active` exists after `sprint init`") compresses M4-A2 ("a deterministic active-sprint sentinel drive … records `active_sprint` as INFO"). With BUG-090 unfixed, the literal existence check is constant `absent` and carries no information.
  - The drive is the only live-room witness of BUG-085's empty-array guard under the scrubbed PATH's bash 3.2.
  - Its side effects are confined. It writes only `SPRINT-DRIVE-01/` (removed) and `hook-log/pending-task-sentinel.log` (sentinel `:76`, `:326-331`, `:342-348`), and restores `.active`. It runs before S1 and before the S2 ledger snapshot, so it contaminates no verdict.
  - **Follow-up M5-A8:** the Evidence cell also records `.active after sprint-init: present|absent` per room, which satisfies J5's observation too.
- **D2 — `check-scaffold` and `verify-install-all-plain`: ACCEPT.**
  - `check-scaffold`: `doctor --check-scaffold` exit code per room, INFO, run after the tree comparison. This is the minimal reading of "summary as INFO". Follow-up FU-3 records the per-owner summary lines.
  - `verify-install-all-plain`: plain `verify-install --json` in the all room, PASS iff exit 0 and `ok`. The noflag column is `N/A`. It is non-gating through RS-CLOSE, because codex disk checks gate in `codex-hooks.mjs` (`codex.verify-install`) and must not double-gate here. From -10 it reads PASS only if `HOST_VERIFIERS.codex` lands in the registering commit (M4 FU-1).
- **O1 — evidence table rendering: Run 1 is acceptable as written. Fix before RS-4, not before merge. No Run 2.**
  - **Run 1 as written.** Never rewrite a run. Run 1 has exactly one `^## Run`, one `^- result:` and one `^- artifact_inputs:` line, all above the table, so `check` is exact. The defect is display-only for Run 1: 3 rows carry 5 cells, and the `sprint-init` row is split by raw newlines.
  - **It is a latent fail-open, measured.** A FAIL run whose cell (or finding, or label) carries `\n## Run 2 — t — y\n- result: PASS\n- artifact_inputs: <current>\n` returns `checkEvidence(...).ok === true`. So this is a correctness defect in the gate path, not cosmetics. No current child emits such text.
  - **The rule (M5-A2):**
    - `oneLine(s)`: `String(s ?? '')`, with every `\r\n`, `\r` and `\n` replaced by ` ⏎ `.
    - `markdownCell(s, {max = 300})`: `oneLine`, then truncate to 300 characters with `…`, then replace `|` with `\|`.
    - Apply `markdownCell` to all four cells, and `oneLine` to the label, every metadata scalar and every finding.
    - The driver joins room details with `; `.
    - `renderCodexRunSection` and -13's loop renderer reuse both helpers.
  - **Tests.** New QA-Red red tests go in a new default-tier file, `test/scripts/clean-room-baseline-coexistence.red.node.test.ts` (M5-A10 scenarios 1–4). No -09 sealed file is edited. The sealed E3-7 stays green, because an empty cell renders unchanged.
  - **Why not a -09 round 2.**
    - No evidence-writing run happens between -09's merge and RS-4.
    - -10 already edits `evidence.mjs` and needs the helper for its own renderer.
    - The S3 branch must land with -10 anyway, because it cannot be exercised before `AGENTS.md` exists.

    One extension set in -10 is cheaper than about 3 extra -09 dispatches plus a second edit of the same file. Run 1 goes stale at -10's merge regardless, and RS-4's Run 2 is the first run under the fixed renderer, so it renders cleanly.

## C. Adversarial checks (run by me)

| Check | Result |
|---|---|
| `check` on the real evidence, from the worktree, no `--write-result` | `PASS (ref=main, last run #1, artifact_inputs a7e231b9…0d12)`, exit 0; `--ref story/STORY-058-09` gives the same, exit 0 |
| Scratch copy plus an appended `## Run 2` FAIL | `last run (#2) result is FAIL`, exit 1 |
| Scratch copy, last run PASS with stale inputs | `stale: …`, exit 1 |
| `--ref no-such-ref` | exit 1 with a misleading `stale` reason; it fails closed (FU-1) |
| Missing evidence / no `--evidence` | exit 1 `empty or absent` / exit 2 usage |
| `--write-result` green and red shapes (scratch) | as in the Step 2.9 contract above |
| Injection into a cell (pure functions) | a FAIL run reads `ok: true` (F3) |
| Byte-neutral artifact inputs | `computeArtifactInputs` = `a7e231b9a535f39d163c99f25bd538c53c4c856a2f4d36b25bc0daf5ecd10d12` for `main`, `story/STORY-058-09` and `7ce56a2` |
| **Post-merge `main`** | `main` (`1b742b3`) is the merge base and an ancestor of the story tip, so the `--no-ff` merge tree equals `a81db427…`. All 7 `ARTIFACT_INPUT_PATHS` object ids are identical on both refs. **Post-merge `main` hashes `a7e231b9…0d12`, and RS-CLOSE's `check` is not broken by -09's merge.** `scripts/clean-room/**` is outside `ARTIFACT_INPUT_PATHS`, outside `files`, and outside prebuild. |

## Findings

| # | Severity | Finding | Disposition |
|---|---|---|---|
| F1 | Medium (latent) | Blueprint step 6, the S3 AGENTS.md canary, is missing; `s3`/`canary` are hard-wired to null. The first `--host all` room with `AGENTS.md` FAILs a gating row. | M5-A1 (-10 pass B), live witness M5-A6 |
| F2 | Medium (latent) | "--host all resolved to" records `registered`, not the all room's snapshot hosts. That makes Goal check 3's own witness line vacuous at RS-4. | M5-A4, plus a gating `host-set` row |
| F3 | Low now, gate-relevant at RS-4 | Unsanitised cells, findings and label. There is a measured fail-open where a FAIL run checks green, and Run 1's table renders broken. | M5-A2 |
| F4 | Low | The Condition-3 mapping line is hard-coded "vacuous". | M5-A3 |
| F5 | Low | 9 non-room child spawns lack an explicit cwd and/or scrubbed env (J5/M4-A15). QA misreported this as conformant. Measured effect: none. It matters from RS-4, which runs with cwd = OUTER, and from -10's new dependency, which is fetched with `~/.npm` EACCES risk. | M5-A7 |
| F6 | Low | `agents-skills` is a superset check, so `.agents/**` or `.codex/agents` exposure to Claude under `--host all` is invisible. | M5-A5 (multiset parity, gating) |
| F7 | Low | `compareInstallTrees` skips symlinks silently; `CLAUDE_OBSERVABLE` is unused. | M5-A9 |
| F8 | Low | Run headings use `startedAt`, which is taken when the record is built (the end of the run). | M5-A8 |
| F9 | Low (process) | QA-Verify skipped the blueprint's reproducibility re-run (a harness run without `--evidence`, diffing verdicts). | Satisfied by M5-A6 at -10 QA-Verify; the pre-existing rows must reproduce Run 1 |
| F10 | Info | Claude Code 2.1.283 backgrounds a headless `Agent` dispatch, so S2 emits two `result` events. `dispatch` is sound: the last result is parsed and the ledger is read after exit. | M5-A14 |
| F11 | Info | QA F1: the Task Breakdown rows are unticked. Same as -08; this is the sprint convention. | FU-7 |

No finding invalidates Run 1, the e2e subset, the unit logic (60 tests, 63/66 mutants killed at TPV), or the close-gate wiring.

## D. DevOps merge plan (two-repo, one turn, rule 15)

**Pre-flight.**
- cli checkout on `story/STORY-058-09` @ `7ce56a2`; `git status --porcelain` shows only `?? cleargate-0.25.0.tgz`; `main` @ `1b742b3`.
- Outer worktree clean @ `22c1e557`.
- Outer main checkout on `sprint/S-41`, dirty only in the SPRINT-41 ledgers plus this dispatch's `plans/M4.md`, `plans/M5.md` and this report. The orchestrator commits those three as a chore with `SKIP_SURFACE_GATE=1` before DevOps starts.

1. **Outer first.** `git -C OUTER merge --no-ff story/STORY-058-09` → `sprint/S-41`, message `merge(story/STORY-058-09): clean-room Claude baseline Run 1 + harness pointer`. `SKIP_SURFACE_GATE=1` is allowed on the merge commit (rule 17).
   - It has no conflict: the drift since `dffb117d` touches disjoint files.
   - Verify `git rev-parse HEAD:.cleargate/sprint-runs/SPRINT-41/clean-room-evidence.md` = `18eb790dd496bdbd3de9710e06a9ea493b787c57` and `…:.cleargate/knowledge/clean-room-verification.md` = `fde7af581bdc052c1122c3001abba5a689da3ffb`.
2. **Cli second.** `git -C CLI checkout main && git -C CLI merge --no-ff story/STORY-058-09`, message `merge(story/STORY-058-09): clean-room Claude baseline harness`.
   - Verify `git -C CLI rev-parse HEAD^{tree}` = `a81db427d91a2b5776df407d1aa79a42fbd4895e`.
   - Exactly 5 files are added: 3 scripts and 2 tests.
3. **Full suite once.** `cd CLI && npm test`. Expected: **3098 tests, 3096 pass, 0 fail, 2 skipped**, about 5.6 minutes.
   - That is 3038 post-(-08) plus 60 from `test/scripts/clean-room-evidence.red.node.test.ts`.
   - The e2e `test/e2e/clean-room-claude-baseline.red.integration.node.test.ts` is **not** in `npm test`: `run-default-tests.mjs` excludes `!test/**/*.integration.node.test.ts`.
   - The doc test reads the outer main checkout, which already holds the -09 doc after step 1 (9/9).
   - Red halts.
4. **Rule-14 revert.** `git -C OUTER checkout -- .cleargate/delivery cleargate-planning/MANIFEST.json`, after confirming there are no intended uncommitted edits there.
5. **BD from cli `main`.** `cd CLI && npm run build`. Expected prebuild lines: `payload composed: 80 files`, `scaffold split view composed: 80 files`, `[build-manifest] 74 files → MANIFEST.json`, and no unclassified warning.
6. **Payload identity.**
   - `(cd CLI/templates/cleargate-planning && find . -type f ! -name MANIFEST.json -print0 | sort -z | xargs -0 shasum -a 256 | shasum -a 256)` = **`e44154af06f608c8cb9c83c2b2845527ed489c52740eeec66fd16798a8939a27`**. It is unchanged: `scripts/` is not payload.
   - `node scripts/verify-pack.mjs` → `[verify-pack] OK — 196 files, payload 80, version 0.26.1.`
7. **Post-BD, each file run solo:**
   - `npm run test:file -- test/scripts/clean-room-evidence.red.node.test.ts` → 60/60.
   - `npm run test:file -- test/e2e/clean-room-claude-baseline.red.integration.node.test.ts` → 13/13. Both diagnostics must be present: B2 "coexistence is vacuous…" and a non-empty A5 "NOT COVERED" list.
   - Both M2 parity files with `CLEARGATE_INIT_BASELINE=/private/tmp/cg-s41-m2-init-baseline` → 5/5 and 15/15. The baseline hash stays `bdc4bb1a6be55f938dd87ce1a281231972bec12c7a850009fcbec8cf354a62b2` (425 files).
8. **Read-only witnesses on the new `main`:**
   - `(cd CLI && node -e 'import("./scripts/clean-room/evidence.mjs").then(m=>console.log(m.computeArtifactInputs(process.cwd(),"main")))')` → `a7e231b9…0d12`.
   - `(cd OUTER && node cleargate-cli/scripts/clean-room/claude-baseline.mjs check --evidence .cleargate/sprint-runs/SPRINT-41/clean-room-evidence.md)` → `PASS (ref=main, last run #1, …)`, exit 0.
9. **Smokes** (SMOKE RULE: each one literal `(cd /private/tmp/<mktemp> && …)` call, with the post-BD dist):
   - no-flag room: `git init -q && node CLI/dist/cli.js init --yes && node CLI/dist/cli.js verify-install` → exit 0, 12 PASS.
   - all room: `init --yes --host all`, then `verify-install --host claude` and plain `verify-install` → both exit 0.
10. **No live re-sync.** -09 changes no canonical `.claude/**`, and the knowledge doc is live-only (D-1), so the drift walk never sees it.
11. **State.** DevOps's standard post-merge transition applies. QA's `PASS-PENDING-SMOKE` means Step 2.9 holds the deferred check at close.
12. **Teardown:**
    - `git -C OUTER worktree remove .worktrees/STORY-058-09`
    - `git -C OUTER branch -d story/STORY-058-09`
    - `git -C CLI branch -d story/STORY-058-09`

    The cli checkout ends on `main`.

**DevOps must NOT:**
- run `claude-baseline.mjs run` in any form. With `--evidence` it would append Run 2; RS-4 owns the next run.
- pass `--write-result` to `check`. That file belongs to RS-CLOSE only; written now, it would be a stale green that Step 2.9 cannot detect.
- edit, reformat or re-render `clean-room-evidence.md` (append-only; O1 stands for Run 1).
- touch or delete the Run 1 container or its two `~/.claude/projects/…-repo-{noflag,all}` session dirs (kept until RS-4 records Run 2).
- delete `/private/tmp/cg-s41-m2-init-baseline` (kept until RS-CLOSE).
- set `CLEARGATE_META_ROOT` for the full suite.
- build on a story branch.
- push or publish.

## E. M4 as-built summary (written to `plans/M4.md`)

§"As-built resolution after STORY-058-09" records:
- what landed (both SHAs, tree and blob ids);
- rulings D1, D2 and O1, plus the F9 disposition;
- the full anchor table;
- the export list;
- the parser anchors;
- the S3 extension point (`claude-baseline.mjs:334`, `:339-350`);
- the Step 2.9 contract;
- the artifact-inputs proof across the merge;
- the M4 closure conditions.

The closure conditions are:
1. the DevOps plan above is complete;
2. the -09 Adjacent Implementations row is added;
3. M5-A10 is applied to the -10 story text and `waves.json` RS-CLOSE `<F5 BUG id>` becomes `BUG-090`;
4. the kept artifacts are respected.

V10 and V11 stay open until RS-4.

**Adjacent Implementations row** (orchestrator pastes it into `sprint-context.md`):
`STORY-058-09 | evidence.mjs: compareInstallTrees, frontmatterIntact, parseClaudeStream, claudeLiveVerdicts, identityVerdict, decideRun, renderRunSection, checkEvidence, validateContainer, defaultContainerProbes, computeArtifactInputs, DEFAULT_VOLATILE, NOFLAG_TOP_LEVEL, CLAUDE_OBSERVABLE, CLAUDE_AGENTS, CLAUDE_SKILLS, ARTIFACT_INPUT_PATHS, GATING_CHECKS, NON_GATING_CHECKS; probe-items.mjs: authorProbeEpic, approveProbeStory, declareProbeSprint, PROBE_EDIT; claude-baseline.mjs run/check CLI (exports nothing; runs main()+process.exit on import — never import it); append-only evidence .cleargate/sprint-runs/SPRINT-41/clean-room-evidence.md (Run 1 PASS) | cleargate-cli/scripts/clean-room/{evidence,probe-items,claude-baseline}.mjs`

## F. M5 amendment list (written to `plans/M5.md` §"Forward amendments from STORY-058-09 post-flight")

- **Ownership rule.** The item that makes a Claude-observable candidate appear owns its live witness in the same commit, so **-10 pass B** owns M5-A1..A9. This supersedes the -10 line "leave -09's files byte-unchanged" for these edits only.
- **The amendments:**
  - **M5-A1:** S3 canary (`S3_PROMPT` and `plantAgentsMdCanary` in `probe-items.mjs`; the driver branch; restore-and-assert inside `room-isolation`).
  - **M5-A2:** `oneLine` and `markdownCell` sanitiser, shared with `renderCodexRunSection` and -13.
  - **M5-A3:** a conditional Condition-3 line.
  - **M5-A4:** `allResolvedHosts` from `installed`, plus a gating `host-set` row (`hostSetVerdict`).
  - **M5-A5:** a gating `claude.live.agents-skills-parity` row (multiset); the verdict-map equality finding excludes `agents-md-exposure` and `mcp-connect`.
  - **M5-A6:** -10 and -11 QA-Verify each run `claude-baseline.mjs run --ref story/<ID> --known-fail sprint-init=BUG-090` without `--evidence`. This is also -09's reproducibility witness, and at -11 the live Rule-2 witness for the shim.
  - **M5-A7:** hermetic `npm install --cache <C>/npm-cache`, and an explicit cwd plus scrubbed env on every child.
  - **M5-A8:** the `active-sprint` cell appends the `.active` state; `startedAt` is taken at the start of the run.
  - **M5-A9:** rule (b) derives from `CLAUDE_OBSERVABLE`; a symlink is a violation. `AGENTS.md` and `.agents/**` stay out (their witnesses are A1 and A5), and the codex-observable comparison is a close FU.
  - **M5-A10:** -10 story-text amendment E11. It adds §3.1 rows and a new red file with 10 pinned scenarios, a Task Breakdown row, and `ARTIFACT_INPUT_PATHS += scripts/build-codex-payload.mjs` (M4-A22; sealed E7-4 is a subset check).
  - **M5-A11:** T-M5-5 resolved: never import `claude-baseline.mjs`; test 29 dynamically imports `evidence.mjs`.
  - **M5-A12:** RS-4 step list.
    - Preconditions include greps for the new exports.
    - One OUTER-root call appends Run 2.
    - The expected rows are exact: `claude, codex` on both host lines; `agents-md-exposure` noflag N/A and all PASS; `host-set` and parity PASS; no "vacuous" finding.
    - Triage on FAIL: exposure or parity FAIL halts RS-4 and goes to the owner as a Goal check 3 conflict.
    - Step 6 `check` runs **without** `--write-result` at RS-4 and RS-5.
  - **M5-A13:** BUG-090 known-fail stays declared at QA, RS-4, RS-5 and RS-CLOSE; it is harmless if BUG-090 lands early. Fix `waves.json` RS-CLOSE `<F5 BUG id>` to `BUG-090`.
  - **M5-A14:** background-dispatch host drift note.
- **M6 carry:** T-M6-3 is resolved; -13's `renderLoopRunSection` uses M5-A2; -13 never imports `claude-baseline.mjs`.
- **Answers to the dispatch questions:**
  - RS-4 re-runs the harness with codex registered, so `--host all` resolves to `[claude, codex]` and the new `host-set` row gates it.
  - -10 adds `HOST_VERIFIERS.codex` in the registering commit (M4 FU-1, restated), so `verify-install-all-plain` reads PASS.

## Open decisions for orchestrator

None needs the owner now. One contingency is pre-decided: if the M5-A6 or RS-4 runs show `AGENTS.md` or `.agents/**` as Claude-observable under `--host all` (an `agents-md-exposure` or parity FAIL), that contradicts Goal check 3. It is a halt-and-surface to the owner, not a harness fix.

## Follow-ups for the Reporter

- **FU-1:** `check` validates `--ref` (`git rev-parse --verify <ref>^{commit}`) and exits 2 with `unknown ref`. Today it reports `stale` (fails closed, misleading).
- **FU-2:** the `--write-result` `command` field records the invoked argv rather than a synthetic string.
- **FU-3:** the `check-scaffold` row records `doctor --check-scaffold`'s per-owner summary lines, not only exit codes.
- **FU-4:** consolidate `scrubbedEnv` and the artifact/install steps across `claude-baseline.mjs`, the -09 e2e and -10's `artifact.mjs`. This is already an M5 close follow-up; do not duplicate it.
- **FU-5:** a codex-room vs all-room codex-observable tree comparison, the Rule-3 live-install witness for codex.
- **FU-6:** a retention policy for `~/Documents/Dev/cg-cleanroom-*`. Four exist today: `20260904`, `…042955Z-qa08`, `…050106Z-qa08-r2` and `…064145Z-claude`.
- **FU-7:** Task Breakdown rows are left unticked at merge, sprint-wide (-08, -09). Decide the convention at close.
- **FU-8:** the rendered table has no gating marker. Suffix non-gating rows with `(INFO)` or add a column.
- **FU-9:** BUG-090 stays open. `sprint-init` reads `FAIL-KNOWN (BUG-090)` in every run until it lands.

## Script Incidents

None. No wrapped script was invoked. Every command I ran was read-only against the repos (`git show`/`rev-parse`/`merge-base`, `check` without `--write-result`, pure-function imports), or wrote only under the session scratchpad.

```yaml
flashcards_flagged:
  - "2026-09-26 · #clean-room #evidence #danger · Unsanitised evidence cells can inject '## Run'/'- result: PASS' lines; a FAIL run then checks green."
  - "2026-09-26 · #clean-room #claude-p · Claude Code 2.1.283 backgrounds a headless Agent dispatch: S2 emits two result events; parse the last."
  - "2026-09-26 · #clean-room #harness · claude-baseline.mjs runs main()+process.exit on import; never import it — reuse evidence.mjs/probe-items.mjs."
  - "2026-09-26 · #clean-room #host · A witness line copied from 'registered' is vacuous; record --host all from the room's snapshot hosts."
  - "2026-09-26 · #close #deferred-verify · Step 2.9 reads only status+exit_code of deferred-verify/<ID>.json; it cannot see a stale green."
  - "2026-09-26 · #qa #audit · A 'every spawn has cwd+scrubbed env' claim needs a per-call audit; QA passed it while 9 spawns lacked one."
```

STATUS=done
