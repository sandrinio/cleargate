role: developer

# STORY-058-09 — Dev report

## Both SHAs and their files

- **cli** `story/STORY-058-09` @ `7ce56a23a5a37ed948ba26641f219ac6cfffff5f` (`feat(EPIC-058): STORY-058-09 clean-room Claude baseline harness`, on cli `main` `1b742b3`):
  - `scripts/clean-room/probe-items.mjs` (new)
  - `scripts/clean-room/evidence.mjs` (new)
  - `scripts/clean-room/claude-baseline.mjs` (new)
- **outer** `.worktrees/STORY-058-09` `story/STORY-058-09` @ `22c1e557c7546363ac73bbec3c6dedadbac62940` (`feat(EPIC-058): STORY-058-09 clean-room Claude baseline Run 1 + harness pointer`, on `dffb117d`):
  - `.cleargate/knowledge/clean-room-verification.md` (modified — §5/§6, 18 insertions / 6 deletions)
  - `.cleargate/sprint-runs/SPRINT-41/clean-room-evidence.md` (new — Run 1)
  - `.cleargate/wiki/log.md` not touched (correctly excluded from the commit).

## Count table

| File | Result |
|---|---|
| `test/scripts/clean-room-evidence.red.node.test.ts` (unit) | 60/60 pass |
| `test/e2e/clean-room-claude-baseline.red.integration.node.test.ts` (e2e, real packed artifact, no live `claude -p`) | 13/13 pass |
| `npm run typecheck` | exit 0 (before and after the cli commit) |

## Rule-16 (`CLEARGATE_META_ROOT`) sweep

19 sealed files (M4-A14/-08/BUG-085/-09's own contract files) — exact match, zero regressions, each run SOLO:

`host-adapter-contract` 19/19 · `host-selection` 11/11 · `init-host-selection` 10/10 · `init-host-cli` 4/4 · `manifest-host-ownership` 18/18 · `init-host-snapshot` 13/13 · `host-lifecycle` 17/17 · `host-cli` 3/3 · `manifest-query` 6/6 · `doctor-per-host` 10/10 · `upgrade-per-host` 6/6 · `uninstall-per-host` 16/16 · `uninstall-reinit` 4/4 · `drift-check-scaffold` 24/24 · `pending-task-sentinel-cards` 13/13 · `doctor-drift-guard` 13/13 · `verify-install` 42/42 · `verify-install-cli` 5/5 · `clean-room-verification-doc` 9/9.

Parity (compare mode, `CLEARGATE_INIT_BASELINE=/private/tmp/cg-s41-m2-init-baseline`): `claude-adapter-init-parity` 5/5, `init-host-parity` 15/15.

Baseline hash before and after (425 files, absolute paths): `bdc4bb1a6be55f938dd87ce1a281231972bec12c7a850009fcbec8cf354a62b2` — unchanged.

`command grep -rl CLEARGATE_META_ROOT cleargate-cli/test` → 21 matches (20 test files + `test/helpers/scaffold-roots.ts`). Ran the 20 test files with `CLEARGATE_META_ROOT=/Users/ssuladze/Documents/Dev/ClearGate/.worktrees/STORY-058-09` (after the outer commit, against the doc-edited worktree):

- 19/20 files fully green (bucket-registry-parity 11/11, clean-room-verification-doc 9/9, claude-md-block-leads-relocation 4/4, test-layers-declared-doctrine 11/11, token-ledger-attribution 9/9, pre-tool-use-task 13/13, hook-signal.red.integration 3/3, token-ledger-regression 14/14, hook-signal.red.node 14/14, scaffold-relocation 15/15, readiness-predicates-test-layers-declared 17/17, readiness-predicates-spidr-coverage 32/32, new-command 57/57, no-exec-mode-vocab 4/4, enforcement-doc-coherence 26/26, ratchet-retired 8/8, pre-commit-downstream-safe 12/12, file-surface-gate-e2e 21/21, frontmatter-authoring 9/9, spidr-coverage 1/1).
- **1 file, 2 pre-existing expected failures — named per Rule 16:** `test/scripts/close-sprint-assume-ack-guard.node.test.ts` (18/20 pass; the "AD#3: cli.ts + sprint.ts strings mention CLEARGATE_CI_ACK" sub-tests fail with `ENOENT` on `<META_ROOT>/cleargate-cli/src/{cli.ts,commands/sprint.ts}`). Root cause: `.worktrees/STORY-058-09` has no `cleargate-cli/` directory at all — it is a separate gitignored repo, never present inside any outer worktree — so any test that reads `<META_ROOT>/cleargate-cli/**` ENOENTs there by construction, independent of this story's changes. This is the exact case flashcard `2026-09-26 · #test-harness #worktree · An outer worktree has no gitignored cleargate-cli/; META_ROOT tests needing it ENOENT there.` already documents. Confirmed unrelated to my changes: the SAME file scores 20/20 without the `CLEARGATE_META_ROOT` override (default = the real outer main checkout, which does have `cleargate-cli/`).

## V12 re-check

- `claude --version` → `2.1.283 (Claude Code)` (matches the TPV/M4-A21 measurement).
- `claude-haiku-4-5-20251001` accepted: a scratch `claude -p` call with `--model claude-haiku-4-5-20251001` echoed `"model":"claude-haiku-4-5-20251001"` in `system/init` and replied `OK` ($0.024).
- `jq`, `git`, `npm`, `tar` all on PATH (`/usr/bin/jq`, `/usr/bin/git`, `/opt/homebrew/bin/npm`, `/usr/bin/tar`).

## Byte-neutral `artifact_inputs` proof

```
(cd /Users/ssuladze/Documents/Dev/ClearGate/cleargate-cli && node -e 'import("./scripts/clean-room/evidence.mjs").then(m=>{const a=m.computeArtifactInputs(process.cwd(),"main"),b=m.computeArtifactInputs(process.cwd(),"story/STORY-058-09");console.log(a,b,a===b);process.exit(a===b?0:1)})')
```
Printed `a7e231b9a535f39d163c99f25bd538c53c4c856a2f4d36b25bc0daf5ecd10d12 a7e231b9a535f39d163c99f25bd538c53c4c856a2f4d36b25bc0daf5ecd10d12 true` — measured before the cli commit against `main`/`eed511c`/`story/STORY-058-09` (all three equal) and again after the cli commit against `main`/`story/STORY-058-09` (still equal). Matches TPV's measured `a7e231b9…0d12` exactly.

## Run 1 — result

Container: `/Users/ssuladze/Documents/Dev/cg-cleanroom-20260926T064145Z-claude` (left in place, per J10.7 — never cleaned up).
`claude`: `2.1.283 (Claude Code)` · model `claude-haiku-4-5-20251001`.
`session_dirs`:
- `/Users/ssuladze/.claude/projects/-Users-ssuladze-Documents-Dev-cg-cleanroom-20260926T064145Z-claude-repo-noflag`
- `/Users/ssuladze/.claude/projects/-Users-ssuladze-Documents-Dev-cg-cleanroom-20260926T064145Z-claude-repo-all`

Result: **PASS**, exit 0, first attempt (no Run 2 needed).

| Check | no flag | --host all |
|---|---|---|
| room-isolation | PASS | PASS |
| verify-install | PASS | PASS |
| doctor | PASS | PASS |
| tree-comparison | PASS | PASS |
| claude.live.session-start | PASS | PASS |
| claude.live.pre-tool-use | PASS | PASS |
| claude.live.post-tool-use | PASS | PASS |
| claude.live.dispatch | PASS | PASS |
| claude.live.agents-skills | PASS | PASS |
| claude.live.agents-md-exposure | N/A | N/A |
| claude.live.hook-identity | PASS | PASS |
| claude.live.mcp-connect (INFO) | INFO (status=connected source=project; non-project: 4) | INFO (same) |
| **sprint-init** | **FAIL-KNOWN (BUG-090)** | **FAIL-KNOWN (BUG-090)** |
| check-scaffold (INFO) | INFO (exit 0, F8 pre-existing false positive) | INFO (exit 0) |
| active-sprint (INFO) | INFO (sentinel drive ok) | INFO (sentinel drive ok) |
| verify-install-all-plain | N/A | PASS |

Finding recorded (non-fatal): "--host all resolved to [claude]: coexistence is vacuous until another host registers; the RS-4 re-run is the witness" (registered hosts = `[claude]` this wave, per plan).

Confirmed live, on disk, before the driver's own verdicts were even computed: `gate-check.log` last line `stamp=0 gate=0 ingest=0 file=…/EPIC-001_cleanroom_probe.md`; `.cleargate/wiki/epics/EPIC-001.md` created; `.cleargate/sprint-runs/_off-sprint/token-ledger.jsonl` carries `"agent_type":"qa"` (dispatch lands in `_off-sprint` because `sprint init` never gets far enough to write `.active` — see Flashcards).

## `check` — both outputs (J10.6, no `--write-result`)

```
$ node .../claude-baseline.mjs check --evidence .cleargate/sprint-runs/SPRINT-41/clean-room-evidence.md
claude-baseline check: PASS (ref=main, last run #1, artifact_inputs a7e231b9a535f39d163c99f25bd538c53c4c856a2f4d36b25bc0daf5ecd10d12)
exit=0

$ node .../claude-baseline.mjs check --evidence .cleargate/sprint-runs/SPRINT-41/clean-room-evidence.md --ref story/STORY-058-09
claude-baseline check: PASS (ref=story/STORY-058-09, last run #1, artifact_inputs a7e231b9a535f39d163c99f25bd538c53c4c856a2f4d36b25bc0daf5ecd10d12)
exit=0
```

## Doc diff summary (`.cleargate/knowledge/clean-room-verification.md`, worktree only)

18 insertions / 6 deletions, all inside §5 and §6, no new `##` heading, no new `npm publish` mention:
- §5: "Two session prompts drive the checks (verbatim wording lives in STORY-058-09's harness once it lands)" → names `authorProbeEpic` in `scripts/clean-room/probe-items.mjs` and states the F7 edits are applied programmatically before either session.
- §5 S1/S2 bullets: appended the exact S1 and S2 prompt strings verbatim (copied from the blueprint / `claude-baseline.mjs`'s own prompt constants).
- §5 end: appended "Automated by `cleargate-cli/scripts/clean-room/claude-baseline.mjs run` (STORY-058-09); `check` verifies the recorded evidence."
- §6 end: dropped "once it lands" from the existing automation sentence.
- Re-ran `test/docs/clean-room-verification-doc.red.node.test.ts` with `CLEARGATE_META_ROOT` pointed at the (now genuinely edited) worktree copy: 9/9 pass (D1 pinned-section + D2 npm-publish checks both hold).

## Outer status

- **At start:** worktree clean (`## story/STORY-058-09`, no diffs); outer main checkout (`sprint/S-41`) carried only the four pre-existing ledger diffs (`.session-totals.json`, `events.jsonl`, `state.json`, `token-ledger.jsonl`).
- **At end:** worktree clean after the `22c1e557` commit (`git status --porcelain` empty); outer main checkout unchanged — still only the same four pre-existing ledger diffs (verified after reverting the mis-targeted edit described below).

## New anchors (RS-4, RS-CLOSE, -13)

- **The harness CLI:** `node <cli>/scripts/clean-room/claude-baseline.mjs run [--container <abs>] [--ref main] [--model <id>] [--evidence <path>] [--label <text>] [--known-fail <id>=<BUG-id>]` and `... check --evidence <path> [--cli <dir>] [--ref main] [--write-result <path>] [--story STORY-058-09]`. Exit 0/1/2 as specified. `run`'s per-room helper is `runRoomProbeAndSessions` in `claude-baseline.mjs`; RS-4/-13 can extend it by adding an `S3` branch keyed on `fs.existsSync(path.join(room,'AGENTS.md'))` (currently always false — `hasAgentsMd` is wired through but never exercised this wave).
- **Evidence header and run format:** `renderRunSection`/`checkEvidence` in `scripts/clean-room/evidence.mjs`. Parser anchors: `^## Run (\d+) — `, `^- result: (PASS|FAIL)$`, `^- artifact_inputs: ([0-9a-f]{64})$` (em-dash `—`, U+2014, not a hyphen). `checkEvidence` reads the LAST `## Run` heading in document order.
- **`evidence.mjs` exports** (for RS-4/-13/-12 reuse, per M4 plan Open decision 5): `DEFAULT_VOLATILE`, `NOFLAG_TOP_LEVEL`, `CLAUDE_OBSERVABLE`, `CLAUDE_AGENTS`, `CLAUDE_SKILLS`, `ARTIFACT_INPUT_PATHS`, `GATING_CHECKS`, `NON_GATING_CHECKS` (new, not in the original blueprint list — added for the driver's own row bookkeeping; safe to import), `compareInstallTrees`, `frontmatterIntact`, `parseClaudeStream`, `claudeLiveVerdicts`, `identityVerdict`, `decideRun`, `renderRunSection`, `checkEvidence`, `validateContainer`, `defaultContainerProbes`, `computeArtifactInputs`.
- **`probe-items.mjs` exports:** `authorProbeEpic`, `approveProbeStory`, `declareProbeSprint`, `PROBE_EDIT`.

## Deviations from J1–J13, with reasons

- **Self-corrected mid-flight mistake (not a plan deviation, but load-bearing to disclose):** the first attempt at the J11 doc edit wrote to the outer **main checkout**'s copy of `.cleargate/knowledge/clean-room-verification.md` (`/Users/ssuladze/Documents/Dev/ClearGate/.cleargate/knowledge/...`) instead of the **worktree**'s copy (`.worktrees/STORY-058-09/.cleargate/knowledge/...`) — both paths exist independently because the worktree is a separate working tree of the same repo. Caught before committing anything: reverted the main checkout with `git checkout -- .cleargate/knowledge/clean-room-verification.md` (confirmed `git status`/`git diff` empty there afterward), then re-applied the identical edit to the worktree copy and re-ran the doc test against it (9/9). The outer main checkout ended the dispatch with zero uncommitted diff beyond the four pre-existing ledger files.
- **`active-sprint` / `check-scaffold` / `verify-install-all-plain` row computation (`orchestrator_confirmed: false`):** M4-A26 names these as recorded, non-gating rows but does not pin the driver's exact algorithm (only `evidence.mjs`'s pure functions and the e2e test's `A4b` sentinel drive are pinned). I implemented `active-sprint` in the driver by mirroring `A4b`'s pattern per room (write `.active` + an empty sprint dir, drive `pending-task-sentinel.sh` with a synthetic `PreToolUse:Agent` input, assert no "unbound variable" and a `.pending-task-*.json` sentinel, then restore whatever `.active` state existed before), `check-scaffold` by recording `doctor --check-scaffold`'s exit code per room as INFO (per F8), and `verify-install-all-plain` as the plain (no `--host`) `verify-install --json` result in the all room (informational, forward-compat for -10). All three measured PASS-shaped in Run 1.
- **No deviation on scope, tool invocation shape, defaults, or commit messages** — J1–J13 followed verbatim otherwise (literal `--ref main` default, literal container naming pattern, `--known-fail sprint-init=BUG-090`, no `--write-result` on either `check` call, no Red-test edits, no `src/`/`scaffold/`/`package.json` touches in the cli).

## Script Incidents

None. Every script invocation went through `node <path>` directly (the harness scripts themselves), never through `.cleargate/scripts/run_script.sh` — none of J1–J13's steps invoke a wrapped script from that directory.

## Flashcards

```yaml
flashcards_flagged:
  - "2026-09-26 · #worktree #danger · A tracked file lives at the same relative path in the main checkout and every sibling worktree; edit by the worktree's own absolute path, then diff-verify, never assume."
  - "2026-09-26 · #clean-room #hooks · pending-task-sentinel.sh + token-ledger.sh write into _off-sprint/ even with no .active; the dispatch verdict does not need sprint-init to succeed first."
```

STATUS=done
