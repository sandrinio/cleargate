role: qa

# STORY-058-10 — QA-Verify RE-RUN report (mode: VERIFY, narrow, after Developer pass D)

STORY: STORY-058-10
QA: PASS-PENDING-SMOKE

**M5-A6 blocker from the prior QA-Verify (`393c286`) is resolved.** Pass D (`b12240b`)
wired `claude-baseline.mjs` for M5-A1/A4/A5/A7/A8/A9(b); the independent witness run below
confirms `decideRun` now computes `host-set` and `claude.live.agents-skills-parity` and the
run exits 0 with `findings: []`. Every check in this narrow dispatch is green.

**Why not a bare PASS (CR-082 step a):** STORY-058-10's own frontmatter carries one
`deferred_verification` entry — "Goal check 4: codex-hooks-evidence.md has a PASS scripted
run against the final cli artifact inputs and at least one PASS live-model run" — `blocks:
close`. The scripted half is green (prior QA report §7a/7b, unchanged by pass D). The live-model
half has NOT been run in this pass or the prior one (owner-gated: OD1/Codex login pending,
tracked sprint-wide as RS-4L). Per the verdict decision order, an unrun declared-deferred
scenario shadows a full PASS while every other static scenario passes — hence
`PASS-PENDING-SMOKE`. The story may proceed to merge; the close gate enforces the deferred
check before sprint-close.

TYPECHECK: pass
TESTS: 170 passed, 0 failed, 0 skipped (this pass's narrow re-run) + 3309 total carried over
  unchanged from `STORY-058-10-qa.md` (2 pre-existing named failures, both re-verified
  pre-existing there; not re-run here per dispatch step 6, diff scoped to 2 driver files only)
ACCEPTANCE_COVERAGE: 7 of 7 Gherkin scenarios have matching passing tests (unchanged from prior
  QA pass); M5-A6 (§2.2 manual verification step, story-required, not itself one of the 7) now
  also passes
MISSING: none
REGRESSIONS: none

## 1. Diff scope (`git -C <cw> diff 393c286 b12240b`)

```
 scripts/clean-room/claude-baseline.mjs | 127 +++++++++++++++++++++++++++------
 scripts/clean-room/evidence.mjs        |   8 ++-
 2 files changed, 112 insertions(+), 23 deletions(-)
```

`git diff 393c286 b12240b -- scaffold src test`: **empty**. Exactly the 2 files claimed by
the Developer's pass-D report — no hook, scaffold, src or test file changed. This is why step
6 (carry-over) applies: every prior verdict outside M5-A6 stands unchanged.

## 2. Typecheck + codegen

| Check | Result |
|---|---|
| `npm run typecheck` (in `<cw>`) | pass (exit 0) |
| `node scripts/build-codex-payload.mjs --check` | exit 0 |

## 3. Targeted solo re-runs

| File | Result |
|---|---|
| `test/scripts/clean-room-baseline-coexistence.red.node.test.ts` | 24/0/24 |
| `test/scripts/clean-room-evidence.red.node.test.ts` | 60/0/60 |
| `test/commands/init-codex.red.node.test.ts` | 6/0/6 |
| `test/e2e/clean-room-claude-baseline.red.integration.node.test.ts` | 13/0/13 |
| `test/scripts/codex-hooks-harness.red.node.test.ts` | 67/0/67 |

`command grep -rl "clean-room/evidence" test` → `clean-room-baseline-coexistence.red.node.test.ts`,
`codex-hooks-harness.red.node.test.ts`, `init-codex.red.node.test.ts` — all already in the list
above (`clean-room-evidence.red.node.test.ts` itself resolves the path via `path.join`, not a
literal string match, but is named explicitly in the dispatch and is included above). No
additional importer files exist beyond the five named.

## 4. Harness lane — independent witness, M5-A6, no `--evidence` (RESULT: PASS)

Command (from a literal `mktemp -d`, per the danger-flashcard rule):
```
(cd /private/tmp/claude-501/qa2-058-10-nfSkQw && \
  node /Users/ssuladze/Documents/Dev/ClearGate/.worktrees/STORY-058-10/cleargate-cli/scripts/clean-room/claude-baseline.mjs run \
    --ref story/STORY-058-10 \
    --container /Users/ssuladze/Documents/Dev/cg-cleanroom-20260926T144417Z-10qa \
    --label "QA2 STORY-058-10" \
    --known-fail sprint-init=BUG-090)
```

**Exit 0.** stdout: `claude-baseline run: PASS`.

`summary.json`:
- `startedAt`: 2026-09-26T14:44:35.149Z
- `cliSha`: `b12240bd5915566290bc8b1752776c33416a6ef0`
- `artifactInputs`: `19c521c81af8725d57be55c63dcd38c688a4a36b9513a1e84e40f8a8fbb83b23` — **matches** the
  Developer's own pass-D witness and the prior QA pass's test-46/harness-CLI runs exactly
  (same code inputs; the tarball's own sha256 differs run-to-run, `2f08919f…` here vs
  `28045b1f…` in the Dev report, which is expected `npm pack` build-metadata noise, not a
  content difference)
- `registeredHosts` / `allResolvedHosts`: `[claude, codex]` both
- `findings`: **[]** (empty — no vacuous or verdict-map-mismatch finding)

Every `summary.json` row:

| id | noflag | all | evidence |
|---|---|---|---|
| room-isolation | PASS | PASS | |
| verify-install | PASS | PASS | |
| doctor | PASS | PASS | |
| tree-comparison | PASS | PASS | |
| host-set | PASS | PASS | noflag=[claude]; all=[claude, codex]; registered=[claude, codex] |
| claude.live.session-start | PASS | PASS | |
| claude.live.pre-tool-use | PASS | PASS | |
| claude.live.post-tool-use | PASS | PASS | |
| claude.live.dispatch | PASS | PASS | |
| claude.live.agents-skills | PASS | PASS | |
| claude.live.agents-md-exposure | N/A | PASS | |
| claude.live.hook-identity | PASS | PASS | |
| claude.live.agents-skills-parity | PASS | PASS | |
| claude.live.mcp-connect | INFO | INFO | non-gating |
| sprint-init | FAIL-KNOWN (BUG-090) | FAIL-KNOWN (BUG-090) | UNAPPROVED (1): STORY-001-01, both columns |
| check-scaffold | INFO | INFO | non-gating |
| active-sprint | INFO | INFO | non-gating |
| verify-install-all-plain | N/A | PASS | |

Against M5-A47's required outcome: exit 0 (yes) · agents-md-exposure N/A/PASS (yes) ·
host-set PASS (yes) · agents-skills-parity PASS (yes) · verify-install-all-plain PASS in all
(yes) · sprint-init FAIL-KNOWN (BUG-090) both columns (yes) · every other gating row PASS
(yes — room-isolation, verify-install, doctor, tree-comparison, session-start,
pre-tool-use, post-tool-use, dispatch, agents-skills, hook-identity all PASS).

Cleanup: `ps aux | grep cg-cleanroom-20260926T144417Z-10qa` → no match (no leftover processes).
Container `/Users/ssuladze/Documents/Dev/cg-cleanroom-20260926T144417Z-10qa` and the scratch
`mktemp` dir deleted. Pre-existing, not-mine containers (`cg-cleanroom-20260904`,
`…qa08`, `…qa08-r2`, `…claude`) left untouched. No `~/.codex`, `CG_TEST` or auth files were
touched (only Claude sessions ran — same as the Dev pass-D witness).

## 5. RS-4 precondition greps (retargeted, M5-A47), all hit

| Symbol | Location |
|---|---|
| `plantAgentsMdCanary(` | `claude-baseline.mjs:364` |
| `hostSetVerdict(` | `claude-baseline.mjs:558` |
| `agentsSkillsParityVerdict(` | `claude-baseline.mjs:610` |

Matches the Developer's own citations exactly.

## 6. Carry-over (unchanged)

Diff scope (§1) is 2 files, neither touching `scaffold`, `src` or `test`. Per dispatch step 6,
the following from `STORY-058-10-qa.md` (`393c286`) are re-affirmed without re-running:
14 re-sealed files exact, parity 5/5 15/15, typecheck/codegen pass, test 46 (1/1), scripted
codex-hooks.mjs harness (10/10 gating verdicts PASS), the full touched-file regression net
(36 files 0-fail + 2 pre-existing-verified failures: `dogfood-install.integration`,
`foreign-repo.integration`), the 3 lock-file diffs (IDENTICAL), and all 7 Gherkin scenario
mappings.

## Git statuses (after cleanup)

- `<ow>` (`/Users/ssuladze/Documents/Dev/ClearGate/.worktrees/STORY-058-10`): empty (clean).
- `<cw>` (`/Users/ssuladze/Documents/Dev/ClearGate/.worktrees/STORY-058-10/cleargate-cli`): empty, HEAD `b12240b`.
- `/Users/ssuladze/Documents/Dev/ClearGate` (outer meta-repo main checkout, `sprint/S-41`):
  only the 4 whitelisted ledger files (`.session-totals.json`, `events.jsonl`, `state.json`,
  `token-ledger.jsonl`) plus an untracked `reports/BUG-096-dev.md` from a concurrent build
  lane (not mine, not touched, no `.cleargate/delivery` back-sync from this dispatch).
- `/Users/ssuladze/Documents/Dev/ClearGate/cleargate-cli` (cli main checkout, `main`): only
  the pre-existing untracked `cleargate-0.25.0.tgz` (predates this pass, not touched).

## Script Incidents

None. No `run_script.sh`-wrapped script was invoked in this dispatch.

flashcards_flagged:
  - "2026-09-26 · #qa #clean-room #tpv · A driver-wiring gap (helpers unit-tested, driver byte-unchanged) only surfaces on a live GATING_CHECKS witness run."
