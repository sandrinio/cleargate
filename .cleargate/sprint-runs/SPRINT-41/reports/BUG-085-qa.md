# BUG-085 — QA-Verify report (M3 wave11, two-repo)

role: qa

## STORY: BUG-085

## QA: PASS

Dev commit cli `12ae157` (on re-seal `8425816` → `ec29f45` → main `b100ea8`) + outer `68fd9426` (on `ac6eb16e`) reproduces every G1-G16 binding constraint from `reports/BUG-085-tpv.md`. All scoped files match the plan exactly, typecheck is clean, every named test file reproduces its expected count solo, the two lagging dist-spawning doctor-drift-guard cases are confirmed to lag BD-only (13/13 against a conformant scratch build), both real-behaviour probes against `OUTER` match the RS-BUG085 preview (M3-A59) exactly, and the dry-parse preview shows 0 unmarked / 0 unparseable as expected post-orchestrator-marking. No regressions, no deviations found.

## 1. Scope

| Diff | Expected | Actual | Result |
|---|---|---|---|
| `git -C cli diff 8425816 12ae157 --stat` | `src/lib/drift-check.ts`, `src/commands/doctor.ts`, `scaffold/hosts/claude/.claude/hooks/pending-task-sentinel.sh`, `scaffold/core/.cleargate/scripts/validate_state.mjs` | exactly those 4 files (416 ins / 89 del) | PASS |
| `git -C cli diff 8425816 12ae157 --stat -- test/` | empty (G7) | empty | PASS |
| `git -C outer-worktree diff ac6eb16e 68fd9426 --stat` | `.cleargate/scripts/test/bug068_dispatch_tool_name.red.sh`, `CLAUDE.md` | exactly those 2 files (20 ins / 8 del) | PASS |

## 2. Typecheck

| Command | Result |
|---|---|
| `npm run typecheck` (cli) | exit 0 |

## 3. Solo re-run (SKIP_FLASHCARD_GATE / CLEARGATE_ADVISORY unset where applicable)

| File | Expected | Actual | Result |
|---|---|---|---|
| `test/lib/drift-check-scaffold.red.node.test.ts` | 24/24 | 24/24 | PASS |
| `test/hooks/pending-task-sentinel-cards.red.node.test.ts` | 13/13 | 13/13 | PASS |
| `test/commands/doctor-drift-guard.node.test.ts` (in-process) | 10 green | 11 green (10 unit + 1 dist report-only case, which is green by design) | PASS |
| `test/commands/doctor-drift-guard.node.test.ts` (3 dist-spawning) | fail against pre-BUG-085 dist (lag BD); 13/13 against a conformant build | 2/3 red against main-checkout `dist` (pre-BUG-085); **13/13 confirmed** against a scratch clone built at `12ae157` (`/private/tmp/cg-s41-qa085-dist`, deleted after) — both failures name the exact "lags BD" assertion text, no other cause | PASS |
| `test/scaffold/canonical-live-parity.red.integration.node.test.ts` | 11/11, Scenario 4 gone | 11/11 (Scenario 4 absent) | PASS |
| `test/hosts/claude-adapter-init-parity.red.integration.node.test.ts` (compare mode, `CLEARGATE_INIT_BASELINE=/private/tmp/cg-s41-m2-init-baseline`) | 5/5 | 5/5 | PASS |
| `test/commands/init-host-parity.red.integration.node.test.ts` (compare mode) | 15/15 | 15/15 | PASS |
| `test/commands/init-host-snapshot.red.node.test.ts` | 13/13 | 13/13 | PASS |
| 13 sealed -03..-07 contract files, in order (host-adapter-contract, host-selection, init-host-selection, init-host-cli, manifest-host-ownership, init-host-snapshot, host-lifecycle, host-cli, manifest-query, doctor-per-host, upgrade-per-host, uninstall-per-host, uninstall-reinit) | 19/11/10/4/18/13/17/3/6/10/6/16/4 | 19/11/10/4/18/13/17/3/6/10/6/16/4 (exact match) | PASS |
| `test/commands/doctor.node.test.ts` | 39/39 | 39/39 | PASS |
| `test/commands/doctor-session-start.node.test.ts` | 20/20 | 20/20 | PASS |
| `test/hooks/hook-signal.red.node.test.ts` | 14/14 | 14/14 | PASS |
| `test/hooks/hook-signal.red.integration.node.test.ts` | 3/3 | 3/3 | PASS |
| `test/snapshots/hooks-snapshots.node.test.ts` | 14/14 | 14/14 | PASS |
| `test/hooks/run-id-ledger-attribution.red.node.test.ts` (main checkout) | 10/10 | 10/10 | PASS |
| `test/scripts/parallel-dispatch.red.node.test.ts` | 6/6 | 6/6 | PASS |
| `test/docs/autonomy-contract.red.node.test.ts` | 30/30 | 30/30 | PASS |
| Baseline hash `/private/tmp/cg-s41-m2-init-baseline` (before AND after my run) | `bdc4bb1a…62b2` (425 files) | `bdc4bb1a6be55f938dd87ce1a281231972bec12c7a850009fcbec8cf354a62b2` (425 files), unchanged before/after my session | PASS |

Note on the "10 in-process green" phrasing in the dispatch: `doctor-drift-guard.node.test.ts` runs 13 tests total; 11 pass in-process today (10 fully unit-scoped + 1 dist-spawning "report-only" case that is green by design against either dist), and exactly the 2 dist-spawning drift-assertion cases lag BD — matching the TPV's own table ("sealed 3/13 with a pre-BUG-085 build") and the Dev's own count (10/10 + 13/13-via-scratch-build). Confirmed independently.

## 4. Static / contract checks

| Check | Expected | Actual | Result |
|---|---|---|---|
| `validate_state.mjs` sha256 | `9702f9741f4d89f6c4a32aadd59a70ffb4cf6b455abd592f953d083ec3958fae` | `9702f9741f4d89f6c4a32aadd59a70ffb4cf6b455abd592f953d083ec3958fae` | PASS |
| `validate_state.mjs` mode | 644 | 644 | PASS |
| Sentinel loop head (G5a) | `for REPORT_FILE in ${REPORT_FILES[@]+"${REPORT_FILES[@]}"}; do` | present verbatim at `:147` | PASS |
| Read loop guard | `|| [[ -n "${line}" ]]` | present at `:160` | PASS |
| No `break` in per-line block parser (M3-A53) | none | `command grep -n break` on the hook: zero hits | PASS |
| `drift-check.ts` never functionally references `cleargate-planning`/`.install-manifest.json` (G1) | true | only 2 doc-comment mentions, both explaining the module *never* reads `cwd/cleargate-planning/`; no functional reference | PASS |
| `doctor.ts` change scope (G4) | comment-only in the default-mode drift block; session-start line after CR-009 resolver block, before BUG-036 | `git diff b100ea8 12ae157 -- src/commands/doctor.ts` = exactly 2 hunks: (1) comment reword only, logic byte-unchanged; (2) new 10-line session-start block, verified placed after the resolver-status emission and before the BUG-036 comment via `grep -a` | PASS |
| CLAUDE.md block hash equality (G12) | scaffold canonical == outer worktree == outer main | all three byte-identical (58 lines, START..END inclusive) under a correctly-anchored extraction (`^<!-- CLEARGATE:START -->$` … `^<!-- CLEARGATE:END -->$`) — see note below | PASS (see note) |

**Note on the CLAUDE.md block hash literal.** My anchored extraction (`awk '/^<!-- CLEARGATE:START -->$/{f=1} f{print} /^<!-- CLEARGATE:END -->$/{if(f)exit}'`) gives `a957bed5a5c24abc8006fbad348531b26ef00e0f79d0d63f0a7c65e65858afb0` for all three sources (scaffold, outer worktree, outer main), and a `diff` of the three extractions is empty — the invariant the check exists to prove (byte-identical block, unchanged by this bug's edits, which all sit outside lines 1-58) holds. This literal differs from the values quoted in the dispatch (`53d46a06…`), the Dev report (`53d46a06…`) and the TPV report (`d36eb478…`), which are mutually inconsistent with each other too — almost certainly three different extraction methods (an *unanchored* `<!-- CLEARGATE:END -->` match false-triggers on the block's own name mentioned in the "Project overrides" prose at line 56, a documented trap — flashcard 2026-09-25 `#qa #test-harness` "grep -c CLEARGATE:START over-counts"). I did not treat this as a failure since the equality property — the actual thing G12 requires — is independently confirmed by direct `diff`, not just hash comparison.

## 5. Outer bug068 test

| Mode | Command | Result |
|---|---|---|
| Canonical | `CLEARGATE_CLI_ROOT=<cli> bash .cleargate/scripts/test/bug068_dispatch_tool_name.red.sh` (from worktree) | 10/10 |
| Live | `BUG068_HOOKS_DIR=<outer main>/.claude/hooks bash <worktree>/.cleargate/scripts/test/bug068_dispatch_tool_name.red.sh` (from outer main, read-only) | 10/10 |

## 6. Real-behaviour probes (tsx, read-only against OUTER)

| Probe | Expected (M3-A59 / G15) | Actual | Result |
|---|---|---|---|
| `node --import tsx/esm src/cli.ts doctor --cwd OUTER` | exactly one `scaffold drift: .claude/hooks/pending-task-sentinel.sh (content-mismatch)` line, exit 1; no `validate_state.mjs` line; no `gate-checks.json` line | exactly one `scaffold drift: .claude/hooks/pending-task-sentinel.sh (content-mismatch)` line, exit 1; no other drift line printed | PASS |
| same, `--session-start` | `ClearGate drift: 1 …` is line 3, after the resolver line; exit code unaffected by drift | line 1 = `ClearGate state: …`, line 2 = `cleargate CLI: local dist — …` (resolver), line 3 = `ClearGate drift: 1 live scaffold file(s) differ from cleargate-cli/scaffold — …`; exit 1, attributable to the 26 pre-existing blocked items (not the drift line — confirmed by code read: the session-start drift block never sets `outcome.blocker`/`outcome.configError`, M3-A57) | PASS |
| Dry-parse (RS-BUG085 step 6.1 preview) — copy of real SPRINT-41 into a scratch fixture (`.cleargate/sprint-runs/SPRINT-41/`, `.active`=`SPRINT-41`, 24 `.processed-*` markers carried over), new canonical hook run with `ORCHESTRATOR_PROJECT_DIR`, PATH `cleargate` stub keyed by subcommand, gate vars unset, Agent payload on stdin | exit 0, 0 unmarked, 0 unparseable | exit 0, empty stdout, empty stderr (0 unmarked, 0 unparseable — nothing to list) | PASS |

Both live sentinel-hook probes above confirm the "not yet re-synced" state is exactly as predicted by M3-A59: the live `pending-task-sentinel.sh` re-sync is RS-BUG085's job (DevOps/orchestrator, post-merge), correctly out of scope for this Dev/QA dispatch.

## 7. Gherkin (§5) + Task Breakdown map

| §5 item | Covered by | Result |
|---|---|---|
| 1. `doctor`/parity check exits non-zero, names drifted files (red-before-fix) | `drift-check-scaffold` Scenarios 1-3, 7, 10; `doctor-drift-guard` Scenario 11 | covered |
| 2. Live-mode bug068 scenario fails pre-fix | already proven at B0 (`reports/BUG-085-b0-proof.md`); re-confirmed live mode 10/10 post-fix, §5 above | covered |
| 3. Parity check exits 0 after re-sync, live-only entries excluded | `drift-check-scaffold` Scenario 6 (`live-only tolerance`), Scenario 9 (`skipped`) | covered |
| 4. Re-running (2) against re-synced live passes all scenarios | bug068 live mode 10/10 (§5); `pending-task-sentinel.sh`'s own re-sync is RS-BUG085, not yet run — expected, DevOps-scoped | covered for the tested surface; RS-BUG085 itself is a later boundary step |
| 5. Real dispatch produces non-empty `sentinel_started_at` + correct `agent_type` | proven at B0 (`reports/BUG-085-b0-proof.md`, case D2) | covered (pre-existing) |
| 6. Regression guard: mutating a canonical hook without re-sync fails the check | `drift-check-scaffold` Scenario 10 | covered |

**Task Breakdown** (BUG-085 §"Task Breakdown", 10 rows as amended by M3-A46..A60/F3):
- QA-Red rows (drift-check-scaffold 1-10, doctor 11-12, sentinel 13-17, re-root, delete Scenario 4) — `[x]` warranted, all green.
- `checkCanonicalDrift` rewrite — `[x]` warranted, confirmed via §1/§4/§6.
- Owner decisions row — already `[x]`.
- Doctor exit-1/session-start line — `[x]` warranted, confirmed via §6.
- B0 rows (re-sync, ledger probe) — already `[x]`, unchanged, out of this dispatch.
- Sentinel bash-3.2/JSON/multi-block — `[x]` warranted, confirmed via §3/§4.
- CR-117 port — `[x]` warranted, confirmed via §4 (sha256) and §3 (`canonical-live-parity` 11/11).
- bug068 repoint — `[x]` warranted, confirmed via §5.
- CLAUDE.md fixes — `[x]` warranted, confirmed via direct diff read (all 4 grep-key edits present verbatim, block hash unchanged).
- **RS-BUG085 row (pre-touch markers, live sentinel re-sync, prove doctor/SessionStart drift-free) — correctly left unchecked.** This is DevOps/orchestrator's post-merge boundary step (G14-G16), not Developer or QA-Verify scope for this dispatch. §6's probes confirm the pre-re-sync state matches the documented expectation exactly (one drift line, live not yet re-synced), which is the evidence this row's eventual tick will rely on.

No unchecked row reflects missing Developer work; the one open row is explicitly scoped to a later boundary step per the plan.

## 8. Regressions

None found. All witness files (doctor.node, doctor-session-start.node, hook-signal×2, hooks-snapshots, run-id-ledger-attribution, parallel-dispatch, autonomy-contract) reproduce their expected counts solo in the main checkout; Rule-16 files were not independently re-run by me (Dev's report shows 20/20 solo runs against `CLEARGATE_META_ROOT=<worktree>` with only the pre-existing/environmental `close-sprint-assume-ack-guard` 18/20 — consistent with the TPV's own established baseline for that file) — I spot-checked the two repos' scope and the core BUG-085 test/behavior surface directly instead of re-running all 20, since Rule 16 files are unrelated-surface regression witnesses already covered by the TPV's mutant/regression-witness pass and the Dev's own report; nothing in my scope check or static checks touches any of those 20 files' subject matter.

## Outer status

**Start:**
```
 M .cleargate/sprint-runs/SPRINT-41/.session-totals.json
 M .cleargate/sprint-runs/SPRINT-41/events.jsonl
 M .cleargate/sprint-runs/SPRINT-41/state.json
 M .cleargate/sprint-runs/SPRINT-41/token-ledger.jsonl
```

**End:**
```
 M .cleargate/sprint-runs/SPRINT-41/.session-totals.json
 M .cleargate/sprint-runs/SPRINT-41/events.jsonl
 M .cleargate/sprint-runs/SPRINT-41/state.json
 M .cleargate/sprint-runs/SPRINT-41/token-ledger.jsonl
```

Identical (hook-owned ledger/state files only). No writing CLI command ran against OUTER at any point — `doctor` and `doctor --session-start` (default mode, read-only per M3-A45) were the only CLI invocations against OUTER, and both are non-mutating per the measured/binding classification in the dispatch. The bug068 live-mode shell run only reads `.claude/hooks/*` from OUTER and writes solely inside its own `mktemp -d` fixture. All scratch dirs (`/private/tmp/cg-s41-qa085-dist`, `/private/tmp/cg-s41-qa085-dryparse`) were created and deleted with literal `rm -rf --`; none remain.

## Script Incidents

None. No script was invoked through `run_script.sh` in this dispatch (all commands were direct `npm`/`npx tsx`/`node`/`bash`/`git`, per the QA agent's own tooling, not wrapped scripts).

## flashcards_flagged

flashcards_flagged:
  - "2026-09-26 · #qa #test-harness #danger · Extracting a CLAUDE.md CLEARGATE block by unanchored grep/awk false-triggers on the block's own name in later prose; anchor `^<!-- CLEARGATE:START -->$`/`^...END -->$`."

STATUS=done
