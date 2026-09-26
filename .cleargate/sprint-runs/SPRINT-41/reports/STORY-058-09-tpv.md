# STORY-058-09 — TPV report (Test Pattern Validation)
role: architect

TPV: REJECTED — sealed B4 is unsatisfiable, sealed E5-5 rejects the plan-literal epics regex, and 44 of 66 measured mutants survive the sealed files (re-seal below)

- **Sealed B4 is unsatisfiable.** A4/A4b write 11 files into the no-flag room before B4 byte-compares it against the `--host all` room.
- **Sealed E5-5 rejects the plan-literal `epics:` regex.**
- **The survivors include** every weakened gating-verdict condition, the `--known-fail` scope, the evidence render, and three `validateContainer` and `computeArtifactInputs` contract points.
- **The fix** is a re-seal: R-E1..R-E8 and R-X1..R-X5 (patch below). After it, a plan-conformant build scores unit 60/60 and e2e 13/13, and the red baseline is 63.

## Subject

- **Cli:** `story/STORY-058-09` @ `eed511c` (main `1b742b3`).
  - `test/scripts/clean-room-evidence.red.node.test.ts`: 39 tests, all red.
  - `test/e2e/clean-room-claude-baseline.red.integration.node.test.ts`: 12 tests, 3 red (A3, A4, B4) and 9 anchors.
- **Scratch root:** `/private/tmp/cg-s41-tpv-058-09`, deleted at the end.
  - Main scratch clone: `cleargate-cli/`, cloned at `eed511c`, `node_modules` symlinked. Its parent holds a `git archive sprint/S-41` copy of the meta-root.
  - A second clone, `sealed/cleargate-cli`, stays at `eed511c` with its own archive parent and serves as the sealed witness side.
- **Neither real checkout was touched.** This covers the cli main checkout and the outer tree, and I wrote nothing to `.worktrees/STORY-058-09`.
- **No live `claude -p` was run.**

## Simulation (plan-conformant -09 harness, written in the scratch clone only)

**`scripts/clean-room/probe-items.mjs`**
- `authorProbeEpic` applies the five F7 edits.
- `approveProbeStory` and `declareProbeSprint`: the latter replaces the whole `epics:` line (see M4-A28).
- `PROBE_EDIT`.
- Every anchor throws `probe-items: anchor not found: <name>`.

**`scripts/clean-room/evidence.mjs`**
- Every blueprint export, plus `identityVerdict` (M4-A16), `GATING_CHECKS`, `decideRun` and `defaultContainerProbes`.
- `compareInstallTrees`: raw sha256 plus `mode & 0o777`, `.git` skipped, rules (a), (b) and (c).
- `frontmatterIntact`: the first two `---` lines bound the block, which is quote-tolerant; no `<idKey>:` may appear after it.
- `parseClaudeStream`: builds `hooks` from `hook_response` events only, plus `toolErrors` and `result`.
- `claudeLiveVerdicts`: ruling #1 rules, `hook-identity` (M4-A16) and the name-filtered `mcp-connect` (M4-A17).
- `checkEvidence` (last run in document order), `validateContainer` (ruling #2) and `computeArtifactInputs` (`git rev-parse <ref>:<path>`, else `absent`).

**`scripts/clean-room/claude-baseline.mjs`**
- `check` is real. Paths resolve against cwd; `--cli` defaults to the script's root and `--ref` to `main`; `--write-result` writes the CR-082 shape.
- `run` is a skeleton: argument parsing, `validateContainer`, and the PATH preconditions.

**Probes on a scratch-packed artifact** (built in the scratch clone: `npm run build`, `npm pack`, extract, PATH shim, scrubbed env). Each writing call was a single literal `cd` into `/private/tmp/cg-s41-tpv-058-09/rooms/*`, guarded by a `pwd -P` prefix check.
- `cleargate new epic cleanroom-probe` writes `epic_id: "EPIC-001"`, quoted. After `authorProbeEpic` and one `stamp-and-gate.sh` run, the log reads `stamp=0 gate=0 ingest=0 file=…/EPIC-001_cleanroom_probe.md`, and the file has `epic_id: EPIC-001` (unquoted) with 3 fences.
- The artifact inputs digest is **`a7e231b9…0d12`** at `1b742b3` (main), at `eed511c` and at the conformant simulation HEAD, so -09 is byte-neutral for the artifact. `check --ref eed511c` against a synthetic Run 1 exits 0 and writes `{status:"green", exit_code:0}`.
- `npm run typecheck` exits 0 on the conformant clone.

## Red→green table

### Sealed files vs the plan-conformant simulation

| File | At `eed511c` (QA-Red) | Conformant simulation | Notes |
|---|---|---|---|
| unit (39) | 39 red, `ERR_MODULE_NOT_FOUND` | **39/39** | This required reading QA-Red's `ledgerHasQaRow` and a whole-line `epics:` replacement. The canary case E2f passes only vacuously ("canary not recorded"), because the inputs carry no canary |
| e2e (12) | 3 red (A3, A4, B4) + 9 anchors | **11/12**, and **B4 stays red** | B4 violations, measured: `missing in other:` `.cleargate/.sync-marker.json`, `.cleargate/delivery/pending-sync/EPIC-001_cleanroom_probe.md`, `.cleargate/hook-log/gate-check.log`, `.cleargate/hook-log/pending-task-sentinel.log`, and `.cleargate/wiki/{active-sprint,epics/EPIC-001,index,log,open-gates,product-state,roadmap}.md`. A4 and A4b wrote them into `noflag`, and B4 then compares `noflag` against `all`. No correct comparator can pass this |

### Re-sealed files (patch below)

| File | Red baseline (`eed511c` + patch, no implementation) | Conformant simulation (ruled shapes) |
|---|---|---|
| unit (60) | 60/60 red, `ERR_MODULE_NOT_FOUND` | **60/60** |
| e2e (13) | 3 red (A3, A4, B4); 10 anchors green (A1, A1b, A2, A4b, A5, B1, B2, B3, B5, B6) | **13/13** |

The combined red baseline after the re-seal is **63**.

Per-scenario count after the re-seal:

| Group | Tests |
|---|---|
| E1 | 1 |
| E2 | 17 (10 sealed + E2f-2 and E2i..E2n) |
| E3 | 7 (+E3-6, E3-7) |
| E4 | 9 (+E4-2b, E4-8) |
| E5 | 6 (+E5-6) |
| E6 | 10 (+E6-6, E6-7) |
| E7 | 5 (+E7-4, E7-5) |
| E8 | 5 (new: `decideRun`) |
| E2E | 13 (+A1b) |

## Mutant table (66 mutants, measured by rebuilding each one out-of-tree)

"Sealed" is the `eed511c` files. "Re-seal" is the patched files. `—` means the mutant survives every test in that file set. Unit runs were scoped with `--test-skip-pattern=E7`, except for the A-series, which ran `--test-name-pattern=E7`. The e2e ran for every mutant it can observe.

| # | Mutant | Sealed killer | Re-seal killer | Matters |
|---|---|---|---|---|
| C1 | `compareInstallTrees` uses a hashNormalized-style hash (BOM/CRLF/trailing-newline stripped) | — | E4-2b | yes: a CRLF hook breaks bash |
| C2 | mode ignored | E4-3 | E4-3 | — |
| C3 | rule (b): Claude-observable extras not flagged | E4-4 | E4-4 | — |
| C4 | rule (c): top level not checked | E4-7 | E4-7 | — |
| C5 | rule (a): "missing in other" not flagged | — | E4-8 | yes: the RS-4 host-removal witness |
| C6 | rule (b) over-broad | E4-5 | E4-5 | — |
| C7 | volatile list ignored | E4-6 | E4-6, e2e B4 | — |
| C8 | `.git/` walked | — | — | no: two fresh `git init` trees are byte-identical, so the mutant is equivalent in every current call |
| C9 | rule (c) does not exclude `.git` | none valid (sealed B4 unsatisfiable) | e2e B4 | yes |
| F1 | `frontmatterIntact` checks only the first fence (id anywhere after it) | E2e | E2e | — |
| F2 | `frontmatterIntact` drops the "no id after the block" rule | — | — | low: BUG-067's phantom block never carries the id, so E2e already covers the real signature |
| F3 | `frontmatterIntact` always ok | E2e | E2e | — |
| F4 | `frontmatterIntact` quote-intolerant | — | — | neutral: the post-stamp id is unquoted. M4-A29 binds tolerance anyway |
| P1 | `parseClaudeStream` throws on non-JSON | E1 | E1 | — |
| P2 | `hook_started` events counted as hooks | — | E1 | yes |
| P3 | `toolErrors` never collected | — | E1 | yes |
| V1 | session-start: regex dropped | — | E2i | yes |
| V2 | session-start: last SessionStart by position | — | E2i | yes (M4-A16: "never by position") |
| V3 | session-start: exit_code ignored | — | E2i | yes |
| V4 | pre-tool-use: needs fewer than 2 Agent responses | — | E2j | yes |
| V5 | pre-tool-use: S1 PreToolUse:Edit ignored | — | E2j | yes |
| V6 | post-tool-use: log check reduced to `gate=0` | — | E2k | yes |
| V7 | post-tool-use: log file name ignored | — | E2k | yes |
| V8 | post-tool-use: wiki page ignored | — | E2k | yes |
| V9 | post-tool-use: PostToolUse:Edit exit ignored | — | E2k | yes |
| V10 | dispatch: ledger row ignored | — | E2l | yes: this is exactly F6 |
| V11 | dispatch: any ledger row counts (`agent_type` ignored) | — | E2l | yes: F6's `unattributed` row |
| V12 | dispatch: SubagentStop ignored | — | E2l | yes |
| V13 | dispatch: S2 tool error ignored | — | E2l | yes |
| V14 | agents-skills: skills ignored | — | E2m | yes |
| V15 | agents-skills: equality instead of superset | E2a | E2a | — |
| V16 | hook-identity: substring match | — | E2n | yes |
| V17 | hook-identity: PASS without an expected path | — | E2n | yes |
| V18 | hook-identity: any `CG_IDENTITY` line | E2h | E2h, E2n | — |
| V19 | mcp-connect: first entry, not name-filtered | — | E2-mcp | yes (M4-A17) |
| V20 | mcp-connect: total count only | E2-mcp | E2-mcp | — |
| V21 | agents-md-exposure: always FAIL with AGENTS.md | — | E2f-2 | yes: it would false-FAIL RS-4 |
| V22 | agents-md-exposure: always N/A | E2f | E2f, E2f-2 | — |
| K1 | `checkEvidence` accepts stale inputs | E3-5 | E3-5, E3-7 | — |
| K2 | `checkEvidence` accepts a FAIL last run | E3-3 | E3-3, E3-6, E3-7 | — |
| K3 | `checkEvidence` reads the first run | E3-4 | E3-4, E3-6, E3-7 | — |
| K4 | `checkEvidence`: any PASS run with matching inputs | — | E3-6, E3-7 | yes: a failed RS-CLOSE would pass close |
| R1 | `renderRunSection` always writes `result: PASS` | — | E3-7 | yes: silent green at close |
| VC1 | `validateContainer`: tmp-root check off | E6-3 ×4 | E6-3 ×4 | — |
| VC2 | `validateContainer`: git check off | E6-4 | E6-4, E6-7 | — |
| VC3 | `validateContainer`: no realpath (literal path compared) | — | E6-6 | yes: a symlinked parent into `/var/folders` |
| VC4 | `insideGitWorkTree(container)` instead of the parent | — | E6-7 | yes: the real probe returns false on a missing dir |
| VC5 | `validateContainer`: exists check off | E6-2 | E6-2 | — |
| A1 | `ARTIFACT_INPUT_PATHS` misses `scaffold` | — | E7-4 | yes: -11's hook rewrite would keep stale evidence green |
| A2 | `ARTIFACT_INPUT_PATHS` misses `tsup.config.ts` | — | E7-4 | yes |
| A3 | digest of the commit SHA | E7-2 | E7-2, E7-3 | — |
| A4 | digest of the working tree, not `<ref>` | — | E7-5 | yes: `check --ref main` from a story branch |
| KF1 | `--known-fail` relabels or excuses any id | — (no testable surface) | E8-2, E8-3 | yes: a gating FAIL written as PASS |
| KF2 | `sprint-init` counted as gating | — | E8-1, E8-2 | yes: Run 1 could never PASS (BUG-090) |
| KF3 | N/A allowed on any gating id | — | E8-4 | yes |
| KF4 | a missing gating row is tolerated | — | E8-4 | yes |
| PI1 | Human Answer anchor silently skipped | — | E5-6 | yes |
| PI2 | Unresolved-note anchor silently skipped | — | E5-6 | yes |
| PI3 | bare path-citation anchor silently skipped | — | E5-6 | yes |
| PI4 | Prior-work anchor silently skipped | E5-3 | E5-3 | — |
| PI5 | story status anchor silently skipped | — | E5-6 | yes |
| PI6 | sprint story-row anchor silently skipped | — | E5-6 | yes |
| PI7 | sprint fast-lane-row anchor silently skipped | — | E5-6 | yes |
| PI8 | plan-literal `epics:` prefix replacement (keeps the trailing comment) | E5-5 | E5-5 | **plan/test conflict.** The sealed test rejects the blueprint's literal regex; M4-A28 binds the whole-line form |
| Kc1 | `CLAUDE_AGENTS` missing `reporter` | e2e A3 | e2e A3 | — |
| Kc2 | `DEFAULT_VOLATILE` missing `.participant.json` | none valid (sealed B4 unsatisfiable) | e2e B4 | yes |

**Totals**

| File set | Killed | Survive | Other |
|---|---|---|---|
| Sealed | 21 | 44 (41 matter; C8, F2 and F4 are equivalent or low) | PI8 is the plan/test conflict |
| Re-seal | 63 | 3 (C8, F2, F4) | — |

**Follow-up measurements**

| Probe | Result | Killer |
|---|---|---|
| **M4-A1 — the `cleargate-cli` entry allowed** | I added a `cleargate-cli` directory, then a `cleargate-cli` symlink, to an otherwise identical "other" tree. `compareInstallTrees` returned `{ok:true, violations:[]}` both times. In the sealed files only A3 catches such an entry, and only in the no-flag room | A1b (lstat, all three rooms) and the gating `room-isolation` row (M4-A26) |
| **M4-A2 — the active-sprint sentinel drive absent** | I reverted the payload sentinel's guard to `for REPORT_FILE in "${REPORT_FILES[@]}"`, with `.active` present and no reports. Result: `line 294: REPORT_FILES[@]: unbound variable`, exit 1, no `.pending-task-*`. The scrubbed PATH resolves `bash` to `/bin/bash` 3.2.57. **A4b is the sole -09 killer, so keep it.** On a PATH where bash ≥ 4.4 comes first, A4b cannot see the revert | A4b |
| `room-isolation` removed from `GATING_CHECKS` | killed | E8-1 |
| An extra gating id added to `GATING_CHECKS` | E8 stays 5/5, by design: fixture rows are built from the module's own list, and E8-1 pins the plan set as a subset. This avoids the hidden-equality pin my first draft had | — |

## Regression witnesses (solo, each file in its own process; failing-NAME diff sealed vs conformant)

The two sides:
- **Sealed:** the `sealed/cleargate-cli` clone at `eed511c`, after `npm run prebuild` and `npm run build`, both run in scratch only.
- **Conformant:** the scratch HEAD, with the simulation plus the re-seal.
- **Environment, both sides:** `CLAUDE*`, `ORCHESTRATOR_PROJECT_DIR` and `CLEARGATE_META_ROOT` removed, and `CLEARGATE_INIT_BASELINE=/private/tmp/cg-s41-m2-init-baseline` set.

| File | Sealed | Conformant | Failing-name diff |
|---|---|---|---|
| `test/cli.node.test.ts` | 23/23 | 23/23 | none |
| `test/commands/verify-install.red.node.test.ts` | 42/42 | 42/42 | none |
| `test/commands/verify-install-cli.red.integration.node.test.ts` | 5/5 | 5/5 | none |
| `test/docs/clean-room-verification-doc.red.node.test.ts` | 9/9 | 9/9 | none |
| `test/commands/init.node.test.ts` | 29/29 | 29/29 | none |
| `test/commands/init-from-source.node.test.ts` | 11/11 | 11/11 | none |
| `test/commands/init-from-source-dist.integration.node.test.ts` | 2/2 | 2/2 | none |
| `test/commands/init-gitignore-expansion.node.test.ts` | 5/5 | 5/5 | none |
| `test/commands/init-no-dep0190.node.test.ts` | 2/2 | 2/2 | none |
| `test/commands/init-participant.node.test.ts` | 3/3 | 3/3 | none |
| `test/commands/init-restart-banner.node.test.ts` | 3/3 | 3/3 | none |
| `test/commands/init-root-gitignore.node.test.ts` | 9/9 | 9/9 | none |
| `test/commands/init-host-selection.red.node.test.ts` | 10/10 | 10/10 | none |
| `test/commands/init-host-cli.red.integration.node.test.ts` | 4/4 | 4/4 | none |
| `test/commands/init-host-snapshot.red.node.test.ts` | 13/13 | 13/13 | none |
| `test/hosts/host-adapter-contract.red.node.test.ts` | 19/19 | 19/19 | none |
| `test/hosts/host-selection.red.node.test.ts` | 11/11 | 11/11 | none |
| `test/lib/manifest-host-ownership.red.node.test.ts` | 18/18 | 18/18 | none |
| `test/hosts/host-lifecycle.red.node.test.ts` | 17/17 | 17/17 | none |
| `test/commands/host-cli.red.integration.node.test.ts` | 3/3 | 3/3 | none |
| `test/hosts/manifest-query.red.node.test.ts` | 6/6 | 6/6 | none |
| `test/commands/doctor-per-host.red.node.test.ts` | 10/10 | 10/10 | none |
| `test/commands/upgrade-per-host.red.node.test.ts` | 6/6 | 6/6 | none |
| `test/commands/uninstall-per-host.red.node.test.ts` | 16/16 | 16/16 | none |
| `test/commands/uninstall-reinit.red.node.test.ts` | 4/4 | 4/4 | none |
| BUG-085 `test/lib/drift-check-scaffold.red.node.test.ts` | 24/24 | 24/24 | none |
| BUG-085 `test/hooks/pending-task-sentinel-cards.red.node.test.ts` | 13/13 | 13/13 | none |
| BUG-085 `test/commands/doctor-drift-guard.node.test.ts` | 13/13 | 13/13 | none |
| Parity `test/hosts/claude-adapter-init-parity.red.integration.node.test.ts` (compare) | 5/5 | 5/5 | none |
| Parity `test/commands/init-host-parity.red.integration.node.test.ts` (compare) | 15/15 | 15/15 | none |

- **A measurement trap, recorded so nobody repeats it.** The sealed clone's first pass ran before `dist/` existed. It showed `cli.node` 20 failing, `doctor-drift-guard` 3 cancelled, `init-no-dep0190` 2 cancelled and `init-restart-banner` 3 cancelled, all because those files spawn `dist/cli.js`. After a scratch `npm run build` all four are green, as they are in the main checkout, which has `dist` from BD.
- **Baseline hash** (`find … -print0 | sort -z | xargs -0 shasum -a 256 | shasum -a 256`, absolute paths): before and after are both `bdc4bb1a6be55f938dd87ce1a281231972bec12c7a850009fcbec8cf354a62b2`, 425 files.
- **Typecheck:** `npm run typecheck` exits 0.
  - Informational: the cli `tsconfig.json` includes only `src/**`, so the check never sees test files.
  - An ad-hoc `tsc` over the two -09 files shows 5 TS2559 errors, all in QA-Red's e2e and all present already at `eed511c`. They come from the `test(name, fn, { timeout })` argument order, whose options object is ignored at runtime, so the tests carry no per-test timeout.
  - This is harmless (the default is no timeout) and it is not re-sealed.

## Rulings on QA-Red ambiguities (binding; plan M4-A24, M4-A25, M4-A27)

**#1 — the `claudeLiveVerdicts(inputs)` shape.** I bind QA-Red's shape with three changes. The rules for each verdict are in M4-A24.
```ts
interface ClaudeLiveVerdictInputs {
  s1: ParsedStream;                  // parseClaudeStream(<room>.S1.stream.jsonl)
  s2: ParsedStream;                  // parseClaudeStream(<room>.S2.stream.jsonl)
  s3?: ParsedStream | null;          // null/absent when the room has no AGENTS.md
  hasAgentsMd: boolean;
  canary?: string | null;            // NEW — the S3 canary word; required when hasAgentsMd
  gateCheckLine: string | null;      // last gate-check.log line matching /file=.*EPIC-001_cleanroom_probe\.md$/, or null
  epicWikiPageExists: boolean;       // <room>/.cleargate/wiki/epics/EPIC-001.md after S1
  epicRaw: string;                   // epic bytes after S1
  ledgerRows: ReadonlyArray<{ agent_type?: string }>;  // REPLACES ledgerHasQaRow — rows appended during S2
  identity?: { expectedCleargatePath: string };        // <C>/tools/bin/cleargate; absent → hook-identity FAIL
}
// returns exactly: session-start, pre-tool-use, post-tool-use, dispatch, agents-skills,
// mcp-connect, agents-md-exposure, hook-identity  (short keys; the harness renders claude.live.<key>)
```

Why the three changes:
- **`ledgerRows` replaces `ledgerHasQaRow`.** A boolean moves F6's `agent_type` check into the untested harness, and V10/V11 survive. With rows, the pure function decides.
- **`canary` is added.** Without the canary value, "the S3 result contains the canary" cannot be computed. The sealed E2f FAIL case then passes only for an unrelated reason: the canary is missing, which is flashcard 2026-08-30 `#tpv #danger`.
- **Short keys.** The tests index `verdicts['session-start']`. A key of `claude.live.session-start`, read from the blueprint's `Record<claude.live.* id, …>`, would fail every E2 test.

**#2 — the `validateContainer` probes DI shape.**
```ts
interface ContainerProbes {
  exists(absPath: string): boolean;          // called with the container path
  realpath(absPath: string): string;         // called with path.dirname(container) only; a throw → refuse
  tmpRoots(): string[];                      // default /tmp, /private/tmp, /var/folders, /private/var/folders, realpath(os.tmpdir())
  insideGitWorkTree(absDir: string): boolean; // called with the realpathed parent
}
// validateContainer(dir, probes = defaultContainerProbes()) → { ok, reason }; export defaultContainerProbes()
```

The checks run in this order:
1. The path is absolute.
2. The container does not exist.
3. Compute `resolved = join(realpath(parent), basename)`, and refuse it if it lies under any tmp root: `resolved === root`, or it starts with `root + '/'`.
4. Refuse it if `insideGitWorkTree(realpath(parent))` is true.

This shape is QA-Red's, with the argument each probe receives now pinned. E6-6 and E6-7 enforce it: without them, VC3 and VC4 survive.

**#3 — the `mcp-connect` detail.** It is pinned exactly:
- with the entry present: `cleargate: status=<status> source=<source>; non-project entries: <n>`;
- with the entry absent: `cleargate: absent; non-project entries: <n>`.

The entry is selected by `name === 'cleargate'`, and `<n>` counts the entries whose `source !== 'project'`. The status is always INFO. With a loose `includes('cleargate')` check, V19 survives: the fixture listed cleargate first, so taking the first entry passed.

**#4 and #5** were confirmed by the orchestrator (the BUG-085 trio; the count of 42). Both witness sides above match.

## Binding Dev constraints

- **J1 — scope.**
  - In the cli: create `scripts/clean-room/{probe-items,evidence,claude-baseline}.mjs` only. Touch nothing under `src/`, `scaffold/` or `package.json`, and no build config: the artifact inputs must stay `a7e231b9…0d12`.
  - In the outer repo: the evidence file, the doc edit and the dev report.
  - The scripts are plain Node ESM with the CLI root per M4-A18. They never import `src/**/*.ts`, and they use literal ids (`'EPIC-001'`, `'STORY-001-01'`, `'SPRINT-01'`), never an id regex.
- **J2 — exports.**
  - `evidence.mjs`: the blueprint list, plus `identityVerdict`, `GATING_CHECKS`, `decideRun` and `defaultContainerProbes`.
  - The constants are exactly as in the blueprint (confirmed by V9).
  - `probe-items.mjs`: the blueprint list, per M4-A28.
- **J3.** `claudeLiveVerdicts` and `parseClaudeStream` follow M4-A24; `validateContainer` follows M4-A25; `mcp-connect` follows M4-A27; `frontmatterIntact` follows M4-A29.
- **J4 — `compareInstallTrees`.**
  - Compare raw sha256 and `mode & 0o777`, and skip `.git` at every depth.
  - Use these violation strings verbatim: `missing in other: <rel>`, `differs (sha): <rel>`, `differs (mode): <rel>`, `Claude-observable extra: <rel>`, `unexpected top-level in no-flag install: <name>`.
- **J5 — `claude-baseline.mjs run`.** Follow blueprint steps 0–8, plus:
  - **Scrub (M4-A15):** every child process gets the scrubbed env and PATH `<C>/tools/bin:$PATH`.
  - **Order:** step 4 (`verify-install` ×2, `doctor` ×2, `compareInstallTrees`, the check-scaffold INFO) completes before the first probe item.
  - **Isolation:** the M4-A16 identity probe, the M4-A1 `lstat`, and the `room-isolation` row.
  - **Sessions and container:** M4-A20 (no `--no-session-persistence`; `session_dirs` goes into `summary.json`) and the M4-A21 container name.
  - **Rows:** feed every row through `decideRun`, and exit 0 iff its result is PASS. The rows include the INFO rows `claude.live.mcp-connect`, `sprint-init`, `check-scaffold`, `active-sprint` (whether `.cleargate/sprint-runs/.active` exists after `sprint init`) and `verify-install-all-plain`.
  - **Working directories:** every child process gets an explicit `cwd`, either a room or the container. The harness resolves only `--evidence` and `--write-result` against `process.cwd()`.
  - **Evidence file:** it is append-only. When absent, create it with the pinned header, then append `renderRunSection(run)`. Never rewrite an earlier run.
- **J6 — `check`.** Follow the blueprint and M4-A18.
  - Exit 0 or 1; exit 2 on a usage error.
  - `--write-result` writes `{ story, command, ran_at, exit_code, status, reason }` and creates the directory.
- **J7 — tests.** Never edit either -09 test file; QA-Red applies the re-seal first. The target after the Dev: unit 60/60 and e2e 13/13, with the e2e graded on committed HEAD.
- **J8 — verification before QA.**
  - `npm run typecheck`.
  - Both -09 files, each run solo.
  - The 19 sealed files, plus both parity files in compare mode. The baseline hash must stay `bdc4bb1a…62b2`.
  - The rule-16 sweep: every cli test that honours `CLEARGATE_META_ROOT` (21 test files at `eed511c`, plus the helper `test/helpers/scaffold-roots.ts`; list them with `command grep -rl CLEARGATE_META_ROOT cleargate-cli/test`), run with `CLEARGATE_META_ROOT=/Users/ssuladze/Documents/Dev/ClearGate/.worktrees/STORY-058-09`, because the item edits the knowledge doc.
  - Never run `npm run build` or `prebuild` in the cli main checkout; the e2e builds in its own clone.
- **J9 — SMOKE RULE.** Nothing that writes runs against `/Users/ssuladze/Documents/Dev/ClearGate`. Every writing call is one literal `(cd <path> && …)`, never backgrounded.
- **J10 — Run 1 procedure.**
  1. Commit the harness on cli `story/STORY-058-09` after QA-Red's re-seal lands, once both files are green solo.
  2. V12 re-check: record `claude --version`, confirm that `claude-haiku-4-5-20251001` is accepted, and check that `jq`, `git`, `npm` and `tar` are on PATH.
  3. Byte-neutral proof: `(cd /Users/ssuladze/Documents/Dev/ClearGate/cleargate-cli && node -e 'import("./scripts/clean-room/evidence.mjs").then(m=>{const a=m.computeArtifactInputs(process.cwd(),"main"),b=m.computeArtifactInputs(process.cwd(),"story/STORY-058-09");console.log(a,b,a===b);process.exit(a===b?0:1)})')` must print `true`. It measured `a7e231b9…0d12` for both `main` and `eed511c`.
  4. Run 1, as one call:
     `(cd /Users/ssuladze/Documents/Dev/ClearGate/.worktrees/STORY-058-09 && node /Users/ssuladze/Documents/Dev/ClearGate/cleargate-cli/scripts/clean-room/claude-baseline.mjs run --evidence .cleargate/sprint-runs/SPRINT-41/clean-room-evidence.md --label "wave13 STORY-058-09" --known-fail sprint-init=BUG-090)`
     - Leave the defaults: the container `~/Documents/Dev/cg-cleanroom-<YYYYMMDDTHHMMSSZ>-claude`, `--ref main`, and the haiku model.
     - The run must exit 0, with the `sprint-init` row reading `FAIL-KNOWN (BUG-090)` in both columns.
  5. On exit 1:
     - The FAIL run stays in the file.
     - Triage it per *Cross-story risks*: a `dispatch` FAIL is a BUG-085 follow-up and never a known-fail; a verdict change under a different Claude Code version is host drift before it is a regression.
     - Fix the cause and append Run 2. Never delete or edit a run section.
     - If `npm install` hits EACCES on `~/.npm`, the harness passes `--cache <C>/npm-cache`, and the fix is folded into doc §2 in the same edit.
  6. Check the evidence: `(cd /Users/ssuladze/Documents/Dev/ClearGate/.worktrees/STORY-058-09 && node /Users/ssuladze/Documents/Dev/ClearGate/cleargate-cli/scripts/clean-room/claude-baseline.mjs check --evidence .cleargate/sprint-runs/SPRINT-41/clean-room-evidence.md)` must exit 0. Repeat with `--ref story/STORY-058-09`, which must also exit 0. Do **not** pass `--write-result`: that file belongs to RS-CLOSE (M4-A18).
  7. Leave the container in place, and name it and its `session_dirs` in the dev report. Never commit transcripts or `summary.json`.
- **J11 — the outer doc pointer** (outer worktree, `.cleargate/knowledge/clean-room-verification.md`).
  - In §5, replace "(verbatim wording lives in STORY-058-09's harness once it lands)" with the S1 and S2 prompts copied verbatim from the blueprint, plus a pointer to `authorProbeEpic` in `cleargate-cli/scripts/clean-room/probe-items.mjs`.
  - Append this paragraph at the end of §5: "Automated by `cleargate-cli/scripts/clean-room/claude-baseline.mjs run` (STORY-058-09); `check` verifies the recorded evidence."
  - In §6, drop "once it lands" from the existing automation sentence.
  - Add no new `## ` heading and no new line that mentions `npm publish`, and keep every phrase D1–D10 pins.
  - Fold any procedure gap that Run 1 exposes into the same edit.
- **J12 — the evidence commit in the outer worktree.**
  - Location: `/Users/ssuladze/Documents/Dev/ClearGate/.worktrees/STORY-058-09`, branch `story/STORY-058-09`.
  - Stage `.cleargate/sprint-runs/SPRINT-41/clean-room-evidence.md`, `.cleargate/knowledge/clean-room-verification.md` and `reports/STORY-058-09-dev.md` (plus `.cleargate/wiki/log.md` if it was touched). Every one is a literal §3.1 row.
  - Message: `feat(EPIC-058): STORY-058-09 clean-room Claude baseline Run 1 + harness pointer`.
  - Never use `--no-verify`, and never set `SKIP_SURFACE_GATE` on the story branch.
  - Afterwards the outer `git status` shows only the pre-existing ledger files.
- **J13 — the cli commit.**
  - Message: `feat(EPIC-058): STORY-058-09 clean-room Claude baseline harness`.
  - Scope: the three scripts only.
  - Before committing: `npm run typecheck`, then both files run solo.

## Re-seal diff (QA-Red applies on cli `story/STORY-058-09` @ `eed511c`)

- **Patch identity.** SHA-256 `8d43e853e852864072f54eea2d870e65ceca558b07bc419abae7722637776708`, 826 lines. `git apply --check` is clean on `eed511c`, measured in the `sealed/` scratch clone.
- **Extract it** byte-exactly with:
  `awk '/^```diff$/{f=1;next} /^```$/{if(f)exit} f' reports/STORY-058-09-tpv.md > /tmp/reseal.patch && shasum -a 256 /tmp/reseal.patch`
  The hash must match.
- **Then:** `git apply --check`, then `git apply`, then commit `qa-red(STORY-058-09): TPV re-seal R-E1..R-E8, R-X1..R-X5`.
- **Re-measure the red baseline** twice. Expect unit 60/60 red and e2e 3 red (A3, A4, B4) with 10 anchors green: **63** in total.

What the re-seal changes:
- **R-E1:** E1 now covers `hook_started` (not counted) and `toolErrors`.
- **R-E2:** the ruled input shape; E2f supplies a canary; E2f-2 (a PASS twin, plus S3 missing); E2-mcp exact, with connectors listed first; E2i–E2n, one negative case per gating condition.
- **R-E3:** E3-6 (an earlier PASS does not rescue a last FAIL); E3-7 (`renderRunSection` round trip).
- **R-E4:** E4-2b (CRLF only); E4-8 (missing in other).
- **R-E5:** E5-6 (every anchor throws).
- **R-E6:** E6-6 (the parent is realpathed); E6-7 (the probe receives the parent).
- **R-E7:** E7-4 (each plan path listed and hashed, as a superset); E7-5 (reads the ref, never the working tree).
- **R-E8:** E8-1..E8-5 (`decideRun`).
- **R-X1:** a probe room for A4 and A4b.
- **R-X2:** the A3 settings triples.
- **R-X3:** A4 uses Claude-shaped stdin, applies `PROBE_EDIT`, and checks preamble identity and `locateFrontmatter`.
- **R-X4:** A1b (M4-A1 `lstat`); A5 derived from the driver, plus `hook-identity`.
- **R-X5:** B5 compares the claude-visible subset.

```diff
diff --git a/test/e2e/clean-room-claude-baseline.red.integration.node.test.ts b/test/e2e/clean-room-claude-baseline.red.integration.node.test.ts
index 82f0fc6..3b52f43 100644
--- a/test/e2e/clean-room-claude-baseline.red.integration.node.test.ts
+++ b/test/e2e/clean-room-claude-baseline.red.integration.node.test.ts
@@ -56,6 +56,10 @@ import * as os from 'node:os';
 import { execFileSync, execSync, spawnSync } from 'node:child_process';
 import { fileURLToPath, pathToFileURL } from 'node:url';
 
+import { selectEntriesForHosts } from '../../src/hosts/manifest-query.js';
+import { entryOwner, type ManifestEntry } from '../../src/lib/manifest.js';
+import { locateFrontmatter } from '../../src/lib/frontmatter-locator.js';
+
 const __dirname = path.dirname(fileURLToPath(import.meta.url));
 // test/e2e/ -> test/ -> cleargate-cli/
 const CLI_ROOT = path.resolve(__dirname, '..', '..');
@@ -116,6 +120,10 @@ let binDir: string; // <T>/bin, holds the `cleargate` shim
 let env: NodeJS.ProcessEnv;
 let noflagDir: string;
 let allDir: string;
+// TPV R-X1: A4/A4b write hook logs, wiki pages and a work item. They run in a
+// THIRD fresh no-flag room so noflag/all stay pristine for B4's byte
+// comparison (plan Gotcha "Order inside a room").
+let probeDir: string;
 let noflagArgv: string[];
 let allArgv: string[];
 let mainStatusBefore: string;
@@ -147,6 +155,11 @@ function verifyInstall(cwd: string, extra: string[] = []): VerifyInstallReport {
   return parsed;
 }
 
+/** Claude Code's hook stdin shape (session_id, transcript_path, cwd, hook_event_name, …) — plan A4. */
+function hookInput(room: string, event: string, extra: Record<string, unknown>): string {
+  return JSON.stringify({ session_id: 'cr-test', transcript_path: '', cwd: room, hook_event_name: event, ...extra });
+}
+
 function readSnapshot(dir: string): { cleargate_version: string; hosts?: string[]; files: Array<{ path: string; sha256?: string; owner?: string; tier?: string }> } {
   const p = path.join(dir, '.cleargate', '.install-manifest.json');
   return JSON.parse(fs.readFileSync(p, 'utf8'));
@@ -219,6 +232,12 @@ before(
     assert.strictEqual(rNoflag.code, 0, `noflag init failed: ${rNoflag.stdout} ${rNoflag.stderr}`);
     const rAll = runCli(allDir, allArgv);
     assert.strictEqual(rAll.code, 0, `--host all init failed: ${rAll.stdout} ${rAll.stderr}`);
+
+    probeDir = path.join(tmpRoot, 'probe');
+    fs.mkdirSync(probeDir);
+    execFileSync('git', ['init', '-q'], { cwd: probeDir });
+    const rProbe = runCli(probeDir, ['init', '--yes']);
+    assert.strictEqual(rProbe.code, 0, `probe-room init failed: ${rProbe.stdout} ${rProbe.stderr}`);
   },
   { timeout: TIMEOUT_MS },
 );
@@ -247,6 +266,12 @@ describe('Scenario A — no-flag subset', () => {
     { timeout: TIMEOUT_MS },
   );
 
+  test('A1b (M4-A1): no room contains a cleargate-cli entry — neither a directory nor a symlink (lstat) [REGRESSION ANCHOR]', () => {
+    for (const room of [noflagDir, allDir, probeDir]) {
+      assert.throws(() => fs.lstatSync(path.join(room, 'cleargate-cli')), { code: 'ENOENT' }, `${room}/cleargate-cli must not exist`);
+    }
+  });
+
   test(
     'A2: machine checks — verify-install and doctor exit 0 in both rooms [REGRESSION ANCHOR — byte-neutral]',
     () => {
@@ -305,6 +330,37 @@ describe('Scenario A — no-flag subset', () => {
         const mode = fs.statSync(path.join(hooksDir, h)).mode;
         assert.ok((mode & 0o111) !== 0, `${h} must be executable`);
       }
+
+      // TPV R-X2: the 7 (event, matcher, command) triples (plan F10 / V9).
+      const BASELINE_MSG =
+        'Claude-observable baseline change: update the recorded baseline in the same commit, with the reason';
+      const settings = JSON.parse(fs.readFileSync(path.join(noflagDir, '.claude', 'settings.json'), 'utf8')) as {
+        hooks: Record<string, Array<{ matcher?: string; hooks: Array<{ type: string; command: string }> }>>;
+      };
+      assert.deepStrictEqual(Object.keys(settings), ['hooks'], BASELINE_MSG);
+      const PREFIX = '${CLAUDE_PROJECT_DIR}/.claude/hooks/';
+      const triples: string[] = [];
+      for (const [event, groups] of Object.entries(settings.hooks)) {
+        for (const g of groups) {
+          for (const h of g.hooks) {
+            assert.ok(h.command.startsWith(PREFIX), `${BASELINE_MSG}: ${h.command}`);
+            triples.push(`${event} | ${g.matcher ?? '-'} | ${h.command.slice(PREFIX.length)}`);
+          }
+        }
+      }
+      assert.deepStrictEqual(
+        triples.sort(),
+        [
+          'PostToolUse | Edit|Write | stamp-and-gate.sh',
+          'PreToolUse | AskUserQuestion | pre-tool-use-autonomy.sh',
+          'PreToolUse | Edit|Write | pre-edit-gate.sh --host claude',
+          'PreToolUse | Task|Agent | pending-task-sentinel.sh --host claude',
+          'PreToolUse | Task|Agent | pre-tool-use-task.sh',
+          'SessionStart | - | session-start.sh',
+          'SubagentStop | - | token-ledger.sh',
+        ].sort(),
+        BASELINE_MSG,
+      );
     },
     { timeout: TIMEOUT_MS },
   );
@@ -312,47 +368,54 @@ describe('Scenario A — no-flag subset', () => {
   test(
     'A4: the SessionStart -> new epic -> PreToolUse:Edit -> PostToolUse:Edit cycle (Goal check 1, minus the host)',
     async () => {
-      const { authorProbeEpic } = await loadProbeItems();
+      const { authorProbeEpic, PROBE_EDIT } = await loadProbeItems();
       const { frontmatterIntact } = await loadEvidence();
+      const room = probeDir;
 
       // session-start.sh — exit 0, ClearGate banner.
-      const startResult = spawnSync('bash', [path.join(noflagDir, '.claude', 'hooks', 'session-start.sh')], {
-        env: { ...env, CLAUDE_PROJECT_DIR: noflagDir },
-        input: '',
+      const startResult = spawnSync('bash', [path.join(room, '.claude', 'hooks', 'session-start.sh')], {
+        env: { ...env, CLAUDE_PROJECT_DIR: room },
+        input: hookInput(room, 'SessionStart', { source: 'startup' }),
         encoding: 'utf8',
       });
       assert.strictEqual(startResult.status, 0, startResult.stderr);
       assert.match(startResult.stdout, /^ClearGate state: /m, startResult.stdout);
 
       // `cleargate new epic`, then apply the F7 edits via authorProbeEpic.
-      const newResult = runCli(noflagDir, ['new', 'epic', 'cleanroom-probe']);
+      const newResult = runCli(room, ['new', 'epic', 'cleanroom-probe']);
       assert.strictEqual(newResult.code, 0, `${newResult.stdout} ${newResult.stderr}`);
       const epicGlob = fs
-        .readdirSync(path.join(noflagDir, '.cleargate', 'delivery', 'pending-sync'))
+        .readdirSync(path.join(room, '.cleargate', 'delivery', 'pending-sync'))
         .find((f) => f.startsWith('EPIC-001'));
       assert.ok(epicGlob, `expected an EPIC-001_*.md scaffold: ${newResult.stdout}`);
-      const epicPath = path.join(noflagDir, '.cleargate', 'delivery', 'pending-sync', epicGlob!);
+      const epicPath = path.join(room, '.cleargate', 'delivery', 'pending-sync', epicGlob!);
       const raw = fs.readFileSync(epicPath, 'utf8');
       fs.writeFileSync(epicPath, authorProbeEpic(raw));
 
       // pre-edit-gate.sh — PreToolUse:Edit — exit 0.
-      const editInput = JSON.stringify({ tool_name: 'Edit', tool_input: { file_path: epicPath } });
-      const preEdit = spawnSync('bash', [path.join(noflagDir, '.claude', 'hooks', 'pre-edit-gate.sh'), '--host', 'claude'], {
-        env: { ...env, CLAUDE_PROJECT_DIR: noflagDir },
-        input: editInput,
+      const toolInput = { file_path: epicPath, old_string: PROBE_EDIT.from, new_string: PROBE_EDIT.to };
+      const preEdit = spawnSync('bash', [path.join(room, '.claude', 'hooks', 'pre-edit-gate.sh'), '--host', 'claude'], {
+        env: { ...env, CLAUDE_PROJECT_DIR: room },
+        input: hookInput(room, 'PreToolUse', { tool_name: 'Edit', tool_input: toolInput }),
         encoding: 'utf8',
       });
       assert.strictEqual(preEdit.status, 0, preEdit.stderr);
 
+      // The Edit itself (what Claude does between PreToolUse and PostToolUse).
+      const authored = fs.readFileSync(epicPath, 'utf8');
+      assert.ok(authored.includes(PROBE_EDIT.from), 'fixture sanity: PROBE_EDIT.from must be in the authored epic');
+      const beforeHook = authored.replace(PROBE_EDIT.from, PROBE_EDIT.to);
+      fs.writeFileSync(epicPath, beforeHook);
+
       // stamp-and-gate.sh — PostToolUse:Edit — exit 0, log line, frontmatter intact.
-      const postEdit = spawnSync('bash', [path.join(noflagDir, '.claude', 'hooks', 'stamp-and-gate.sh')], {
-        env: { ...env, CLAUDE_PROJECT_DIR: noflagDir },
-        input: editInput,
+      const postEdit = spawnSync('bash', [path.join(room, '.claude', 'hooks', 'stamp-and-gate.sh')], {
+        env: { ...env, CLAUDE_PROJECT_DIR: room },
+        input: hookInput(room, 'PostToolUse', { tool_name: 'Edit', tool_input: toolInput, tool_response: { filePath: epicPath } }),
         encoding: 'utf8',
       });
       assert.strictEqual(postEdit.status, 0, postEdit.stderr);
 
-      const logPath = path.join(noflagDir, '.cleargate', 'hook-log', 'gate-check.log');
+      const logPath = path.join(room, '.cleargate', 'hook-log', 'gate-check.log');
       const logLines = fs.readFileSync(logPath, 'utf8').trim().split('\n');
       const lastLine = logLines[logLines.length - 1]!;
       assert.match(lastLine, /stamp=0 gate=0 ingest=0/, lastLine);
@@ -361,6 +424,16 @@ describe('Scenario A — no-flag subset', () => {
       const afterRaw = fs.readFileSync(epicPath, 'utf8');
       const check = frontmatterIntact(afterRaw, 'epic_id', 'EPIC-001');
       assert.strictEqual(check.ok, true, JSON.stringify(check));
+
+      // TPV R-X3: the <instructions> preamble survives the hook byte-for-byte,
+      // and the shared locator (BUG-067) finds the real header.
+      const preamble = (text: string): string => text.slice(0, text.indexOf('\n---\n') + 1);
+      assert.ok(preamble(beforeHook).startsWith('<instructions>'), 'fixture sanity: the scaffold is <instructions>-led');
+      assert.strictEqual(preamble(afterRaw), preamble(beforeHook), 'the <instructions> preamble changed under stamp-and-gate');
+      const span = locateFrontmatter(afterRaw);
+      assert.ok(span, 'locateFrontmatter found no frontmatter');
+      assert.match(afterRaw.slice(span!.yamlStart, span!.yamlEnd), /^epic_id: "?EPIC-001"?$/m);
+      assert.ok(afterRaw.includes(PROBE_EDIT.to), 'the Edit must survive the hook');
     },
     { timeout: TIMEOUT_MS },
   );
@@ -372,20 +445,20 @@ describe('Scenario A — no-flag subset', () => {
       // block is skipped entirely (SPRINT_ID = "_off-sprint") — the empty
       // REPORT_FILES[@] guard this drives is unreachable by construction, so
       // a fresh room's dispatch verdict alone never witnesses V8 (M4-A2).
-      const sprintDir = path.join(noflagDir, '.cleargate', 'sprint-runs', 'SPRINT-01');
+      const room = probeDir;
+      const sprintDir = path.join(room, '.cleargate', 'sprint-runs', 'SPRINT-01');
       fs.mkdirSync(sprintDir, { recursive: true });
-      fs.writeFileSync(path.join(noflagDir, '.cleargate', 'sprint-runs', '.active'), 'SPRINT-01\n');
+      fs.writeFileSync(path.join(room, '.cleargate', 'sprint-runs', '.active'), 'SPRINT-01\n');
       // Deliberately no *-dev.md/*-qa.md report files in sprintDir, so
       // `ls -t "${SPRINT_DIR}"/*-dev.md ... 2>/dev/null` glob-matches nothing
       // and REPORT_FILES stays empty — exactly the bash-3.2 "unbound
       // variable" trap BUG-085(a) fixed with the `+` alternate-value form.
-      const agentInput = JSON.stringify({
+      const agentInput = hookInput(room, 'PreToolUse', {
         tool_name: 'Agent',
-        transcript_path: '',
         tool_input: { subagent_type: 'qa', description: 'probe', prompt: 'Reply with exactly OK.' },
       });
-      const result = spawnSync('bash', [path.join(noflagDir, '.claude', 'hooks', 'pending-task-sentinel.sh'), '--host', 'claude'], {
-        env: { ...env, CLAUDE_PROJECT_DIR: noflagDir },
+      const result = spawnSync('bash', [path.join(room, '.claude', 'hooks', 'pending-task-sentinel.sh'), '--host', 'claude'], {
+        env: { ...env, CLAUDE_PROJECT_DIR: room },
         input: agentInput,
         encoding: 'utf8',
       });
@@ -394,22 +467,15 @@ describe('Scenario A — no-flag subset', () => {
       const pendingFiles = fs.readdirSync(sprintDir).filter((f) => f.startsWith('.pending-task-'));
       assert.ok(pendingFiles.length >= 1, `expected a .pending-task-*.json sentinel: ${fs.readdirSync(sprintDir)}`);
       fs.rmSync(sprintDir, { recursive: true, force: true });
-      fs.rmSync(path.join(noflagDir, '.cleargate', 'sprint-runs', '.active'), { force: true });
+      fs.rmSync(path.join(room, '.cleargate', 'sprint-runs', '.active'), { force: true });
     },
     { timeout: TIMEOUT_MS },
   );
 
   test('A5: this file states, in its own diagnostic output, the checks it cannot make without a live session', () => {
-    const ids = [
-      'claude.live.session-start',
-      'claude.live.pre-tool-use',
-      'claude.live.post-tool-use',
-      'claude.live.dispatch',
-      'claude.live.agents-skills',
-      'claude.live.mcp-connect',
-      'claude.live.agents-md-exposure',
-    ];
-    assert.ok(ids.length > 0, 'the NOT COVERED list must be non-empty');
+    const live = verifyInstall(noflagDir).live.map((l) => l.id);
+    const ids = [...new Set([...live, 'claude.live.agents-md-exposure', 'claude.live.hook-identity'])];
+    assert.ok(live.length >= 6, `the driver's live list must be non-empty: ${JSON.stringify(live)}`);
     // eslint-disable-next-line no-console
     console.log(`NOT COVERED (requires a live Claude Code session): ${ids.join(', ')}`);
   });
@@ -452,14 +518,17 @@ describe('Scenario B — --host all equivalence', () => {
     assert.strictEqual(result.ok, true, JSON.stringify(result.violations));
   });
 
-  test('B5: core/claude-owned snapshot entries are identical (path, sha256, tier, owner) [REGRESSION ANCHOR]', () => {
+  test('B5: claude-visible snapshot entries are identical (path, sha256, tier, entryOwner) [REGRESSION ANCHOR]', () => {
+    // Story §3.2 / M3-A23: the claude-visible subset is what
+    // selectEntriesForHosts(files, ['claude']) admits — from RS-4 the all room
+    // also holds core-owned .agents/** entries the no-flag room never has.
     const noflagSnapshot = readSnapshot(noflagDir);
     const allSnapshot = readSnapshot(allDir);
-    const key = (e: { path: string; sha256?: string; tier?: string; owner?: string }) =>
-      `${e.path}\u0000${e.sha256}\u0000${e.tier}\u0000${e.owner}`;
-    const relevant = (files: typeof noflagSnapshot.files) =>
-      files.filter((e) => e.owner === 'core' || e.owner === 'claude').map(key).sort();
-    assert.deepStrictEqual(relevant(noflagSnapshot.files), relevant(allSnapshot.files));
+    const key = (e: ManifestEntry) => `${e.path}\u0000${e.sha256}\u0000${e.tier}\u0000${entryOwner(e)}`;
+    const visible = (files: unknown) => selectEntriesForHosts(files as ManifestEntry[], ['claude']).map(key).sort();
+    const a = visible(noflagSnapshot.files);
+    assert.ok(a.length > 0, 'the no-flag snapshot must carry claude-visible entries');
+    assert.deepStrictEqual(a, visible(allSnapshot.files));
   });
 
   test('B6: an explicit foreign-command scan of the all room\'s settings.json [REGRESSION ANCHOR]', () => {
diff --git a/test/scripts/clean-room-evidence.red.node.test.ts b/test/scripts/clean-room-evidence.red.node.test.ts
index 3b81766..5417cb5 100644
--- a/test/scripts/clean-room-evidence.red.node.test.ts
+++ b/test/scripts/clean-room-evidence.red.node.test.ts
@@ -24,13 +24,11 @@
  * never re-declared locally — so these tests stay correct against whatever
  * F10 list the Developer ships, rather than pinning a second, driftable copy.
  *
- * `claudeLiveVerdicts`'s `inputs` parameter shape is prose-only in the plan
- * (bullets, not a type). The shape used below (`ClaudeLiveVerdictInputs`) is
- * this file's own invention, built strictly from the bullets' vocabulary —
- * flagged as a plan ambiguity in the QA-Red report, `orchestrator_confirmed:
- * false`. `validateContainer`'s `probes` shape is the plan's own prose
- * ("probes = { exists, realpath, tmpRoots, insideGitWorkTree }"), followed
- * verbatim.
+ * `claudeLiveVerdicts`'s `inputs` shape, `validateContainer`'s `probes`
+ * signatures and the `mcp-connect` detail are bound by the STORY-058-09 TPV
+ * rulings #1-#3 (reports/STORY-058-09-tpv.md; plan M4-A24, M4-A25, M4-A27).
+ * The TPV re-seal (R-E1..R-E8) adds one negative case per gating verdict
+ * condition, and E8 for decideRun (plan M4-A26).
  *
  * Naming: *.red.node.test.ts (CR-111; not integration-layer — no subprocess,
  * no packed artifact).
@@ -73,19 +71,29 @@ interface ParsedStream {
 }
 type Verdict = { status: 'PASS' | 'FAIL' | 'N/A' | 'INFO'; detail?: string };
 
-// This file's own invented shape for claudeLiveVerdicts' `inputs` param —
-// see file header. Every field name is drawn from the plan's own prose.
+// claudeLiveVerdicts' `inputs` — the BINDING shape (TPV ruling #1,
+// reports/STORY-058-09-tpv.md; plan M4-A24). `ledgerRows` are the ledger rows
+// appended during S2 (the verdict evaluates agent_type itself); `canary` is
+// the S3 canary word (required when hasAgentsMd); `identity` is required —
+// hook-identity FAILs without it.
 interface ClaudeLiveVerdictInputs {
   s1: ParsedStream;
   s2: ParsedStream;
   s3?: ParsedStream | null;
   hasAgentsMd: boolean;
-  gateCheckLine: string;
+  canary?: string | null;
+  gateCheckLine: string | null;
   epicWikiPageExists: boolean;
   epicRaw: string;
-  ledgerHasQaRow: boolean;
+  ledgerRows: ReadonlyArray<{ agent_type?: string }>;
   identity?: { expectedCleargatePath: string };
 }
+interface RunRow {
+  id: string;
+  noflag: string;
+  all: string;
+  evidence?: string;
+}
 interface ContainerProbes {
   exists: (p: string) => boolean;
   realpath: (p: string) => string;
@@ -107,6 +115,12 @@ interface EvidenceModule {
   frontmatterIntact(raw: string, idKey: string, idValue: string): { ok: boolean; reason?: string };
   parseClaudeStream(jsonlText: string): ParsedStream;
   claudeLiveVerdicts(inputs: ClaudeLiveVerdictInputs): Record<string, Verdict>;
+  GATING_CHECKS: readonly string[];
+  identityVerdict(parsedS1: ParsedStream, expectedPath: string): Verdict;
+  decideRun(
+    rows: ReadonlyArray<RunRow>,
+    opts?: { knownFail?: Record<string, string> },
+  ): { result: 'PASS' | 'FAIL'; rows: Array<RunRow & { gating: boolean }>; reasons: string[] };
   renderRunSection(run: unknown): string;
   checkEvidence(
     markdown: string,
@@ -257,7 +271,8 @@ function passingInputs(agents: readonly string[], skills: readonly string[]): Cl
     gateCheckLine: PASSING_GATE_LINE,
     epicWikiPageExists: true,
     epicRaw: HEALTHY_EPIC_RAW,
-    ledgerHasQaRow: true,
+    ledgerRows: [{ agent_type: 'qa' }],
+    canary: null,
     identity: { expectedCleargatePath: '/room/tools/bin/cleargate' },
   };
 }
@@ -287,6 +302,8 @@ describe('E1 — parseClaudeStream', () => {
         outcome: 'success',
         output: 'ClearGate state: pre-member — local planning enabled, sync requires join.',
       }),
+      // A hook_started event is NOT a hook response (TPV R-E1).
+      jsonLine({ type: 'system', subtype: 'hook_started', hook_name: 'PreToolUse:Edit', hook_event: 'PreToolUse' }),
       jsonLine({
         type: 'system',
         subtype: 'hook_response',
@@ -306,6 +323,9 @@ describe('E1 — parseClaudeStream', () => {
         output: '',
       }),
       'not-json-at-all{{{',
+      // toolErrors = tool_result blocks with is_error: true in user messages (TPV R-E1).
+      jsonLine({ type: 'user', message: { role: 'user', content: [{ type: 'tool_result', tool_use_id: 't1', is_error: true, content: 'boom' }] } }),
+      jsonLine({ type: 'user', message: { role: 'user', content: [{ type: 'tool_result', tool_use_id: 't2', content: 'fine' }] } }),
       jsonLine({ type: 'result', subtype: 'success', result: 'DONE' }),
     ];
     const parsed = parseClaudeStream(lines.join('\n'));
@@ -325,6 +345,7 @@ describe('E1 — parseClaudeStream', () => {
       assert.strictEqual(h.outcome, 'success', JSON.stringify(h));
     }
 
+    assert.strictEqual(parsed.toolErrors.length, 1, JSON.stringify(parsed.toolErrors));
     assert.strictEqual(parsed.result, 'DONE');
   });
 });
@@ -391,11 +412,23 @@ describe('E2 — claudeLiveVerdicts', () => {
     const { claudeLiveVerdicts, CLAUDE_AGENTS, CLAUDE_SKILLS } = await loadEvidence();
     const inputs = passingInputs(CLAUDE_AGENTS, CLAUDE_SKILLS);
     inputs.hasAgentsMd = true;
+    inputs.canary = 'deadbeefcafe01';
     inputs.s3 = { init: null, hooks: [], toolErrors: [], result: 'the canary word is deadbeefcafe01' };
     const verdicts = claudeLiveVerdicts(inputs);
     assert.strictEqual(verdicts['agents-md-exposure']?.status, 'FAIL', JSON.stringify(verdicts['agents-md-exposure']));
   });
 
+  test('E2f-2 (TPV R-E2): agents-md-exposure PASSes when S3 does not echo the canary, FAILs when S3 did not run', async () => {
+    const { claudeLiveVerdicts, CLAUDE_AGENTS, CLAUDE_SKILLS } = await loadEvidence();
+    const inputs = passingInputs(CLAUDE_AGENTS, CLAUDE_SKILLS);
+    inputs.hasAgentsMd = true;
+    inputs.canary = 'deadbeefcafe01';
+    inputs.s3 = { init: null, hooks: [], toolErrors: [], result: 'NONE' };
+    assert.strictEqual(claudeLiveVerdicts(inputs)['agents-md-exposure']?.status, 'PASS');
+    inputs.s3 = null;
+    assert.strictEqual(claudeLiveVerdicts(inputs)['agents-md-exposure']?.status, 'FAIL');
+  });
+
   test('E2g (M4-A16): hook-identity PASSes only by matching the CG_IDENTITY line, never by position/count', async () => {
     const { claudeLiveVerdicts, CLAUDE_AGENTS, CLAUDE_SKILLS } = await loadEvidence();
     const verdicts = claudeLiveVerdicts(passingInputs(CLAUDE_AGENTS, CLAUDE_SKILLS));
@@ -423,17 +456,127 @@ describe('E2 — claudeLiveVerdicts', () => {
     assert.strictEqual(verdicts['session-start']?.status, 'PASS', JSON.stringify(verdicts['session-start']));
   });
 
-  test('E2-mcp (M4-A17): mcp-connect is INFO, selects the entry named "cleargate", and counts non-project sources', async () => {
+  test('E2-mcp (M4-A17, TPV ruling #3): mcp-connect is INFO, selects the entry named "cleargate" by name, and counts non-project sources', async () => {
     const { claudeLiveVerdicts, CLAUDE_AGENTS, CLAUDE_SKILLS } = await loadEvidence();
     const inputs = passingInputs(CLAUDE_AGENTS, CLAUDE_SKILLS);
+    // Connectors FIRST: selecting by position or count must not find cleargate.
+    inputs.s1 = {
+      ...inputs.s1,
+      init: {
+        ...inputs.s1.init!,
+        mcp_servers: [
+          { name: 'some-claudeai-connector', status: 'connected', source: 'claudeai' },
+          { name: 'another-claudeai-connector', status: 'failed', source: 'claudeai' },
+          { name: 'cleargate', status: 'connected', source: 'project' },
+        ],
+      },
+    };
     const verdict = claudeLiveVerdicts(inputs)['mcp-connect'];
     assert.strictEqual(verdict?.status, 'INFO', JSON.stringify(verdict));
-    // The two claude.ai connectors (source !== 'project') must not make this
-    // FAIL or hide the named 'cleargate' entry's own status/source — the
-    // detail is expected to name both (loose substring check: the exact
-    // rendering is the Developer's, the *content* — 'cleargate', 'project',
-    // and a count of 2 — is what M4-A17 pins).
-    assert.ok(verdict!.detail?.includes('cleargate'), `detail must record the named entry: ${verdict!.detail}`);
+    assert.strictEqual(verdict!.detail, 'cleargate: status=connected source=project; non-project entries: 2');
+
+    inputs.s1 = {
+      ...inputs.s1,
+      init: { ...inputs.s1.init!, mcp_servers: inputs.s1.init!.mcp_servers.filter((m) => m.name !== 'cleargate') },
+    };
+    const absent = claudeLiveVerdicts(inputs)['mcp-connect'];
+    assert.strictEqual(absent?.status, 'INFO', JSON.stringify(absent));
+    assert.strictEqual(absent!.detail, 'cleargate: absent; non-project entries: 2');
+  });
+
+  // ── TPV R-E2: one negative case per gating PASS condition ──────────────────
+  const ssBanner = 'ClearGate state: pre-member — local planning enabled, sync requires join.';
+  const idLine = 'CG_IDENTITY cleargate=/room/tools/bin/cleargate';
+  const withS1Hooks = (inputs: ClaudeLiveVerdictInputs, hooks: ParsedHookEvent[]): void => {
+    inputs.s1 = { ...inputs.s1, hooks };
+  };
+  const withS2Hooks = (inputs: ClaudeLiveVerdictInputs, hooks: ParsedHookEvent[]): void => {
+    inputs.s2 = { ...inputs.s2, hooks };
+  };
+
+  test('E2i: session-start selects the ClearGate response by regex, independent of order, and requires exit 0', async () => {
+    const { claudeLiveVerdicts, CLAUDE_AGENTS, CLAUDE_SKILLS } = await loadEvidence();
+    const inputs = passingInputs(CLAUDE_AGENTS, CLAUDE_SKILLS);
+    withS1Hooks(inputs, [sessionStartHook(ssBanner), sessionStartHook(idLine), preToolUseHook('Edit', 0), postToolUseHook(0)]);
+    let v = claudeLiveVerdicts(inputs);
+    assert.strictEqual(v['session-start']?.status, 'PASS', 'reversed order: session-start');
+    assert.strictEqual(v['hook-identity']?.status, 'PASS', 'reversed order: hook-identity');
+
+    withS1Hooks(inputs, [sessionStartHook(idLine), preToolUseHook('Edit', 0), postToolUseHook(0)]);
+    v = claudeLiveVerdicts(inputs);
+    assert.strictEqual(v['session-start']?.status, 'FAIL', 'banner absent must FAIL session-start');
+    assert.strictEqual(v['hook-identity']?.status, 'PASS', 'banner absent: hook-identity unaffected');
+
+    withS1Hooks(inputs, [sessionStartHook(idLine), { ...sessionStartHook(ssBanner), exit_code: 1 }, preToolUseHook('Edit', 0), postToolUseHook(0)]);
+    assert.strictEqual(claudeLiveVerdicts(inputs)['session-start']?.status, 'FAIL', 'banner exit 1 must FAIL');
+  });
+
+  test('E2j: pre-tool-use needs S1 PreToolUse:Edit exit 0 and at least two S2 PreToolUse:Agent responses', async () => {
+    const { claudeLiveVerdicts, CLAUDE_AGENTS, CLAUDE_SKILLS } = await loadEvidence();
+    const inputs = passingInputs(CLAUDE_AGENTS, CLAUDE_SKILLS);
+    withS2Hooks(inputs, [preToolUseHook('Agent', 0), subagentStopHook(0)]);
+    assert.strictEqual(claudeLiveVerdicts(inputs)['pre-tool-use']?.status, 'FAIL', 'one Agent response must FAIL');
+
+    const inputs2 = passingInputs(CLAUDE_AGENTS, CLAUDE_SKILLS);
+    withS1Hooks(inputs2, [sessionStartHook(idLine), sessionStartHook(ssBanner), postToolUseHook(0)]);
+    assert.strictEqual(claudeLiveVerdicts(inputs2)['pre-tool-use']?.status, 'FAIL', 'no PreToolUse:Edit must FAIL');
+
+    withS1Hooks(inputs2, [sessionStartHook(idLine), sessionStartHook(ssBanner), preToolUseHook('Edit', 2), postToolUseHook(0)]);
+    assert.strictEqual(claudeLiveVerdicts(inputs2)['pre-tool-use']?.status, 'FAIL', 'PreToolUse:Edit exit 2 must FAIL');
+  });
+
+  test('E2k: post-tool-use needs stamp=0 gate=0 ingest=0 for the probe epic, the wiki page, and PostToolUse:Edit exit 0', async () => {
+    const { claudeLiveVerdicts, CLAUDE_AGENTS, CLAUDE_SKILLS } = await loadEvidence();
+    const cases: Array<[string, (i: ClaudeLiveVerdictInputs) => void]> = [
+      ['ingest=1', (i) => { i.gateCheckLine = PASSING_GATE_LINE.replace('ingest=0', 'ingest=1'); }],
+      ['stamp=1', (i) => { i.gateCheckLine = PASSING_GATE_LINE.replace('stamp=0', 'stamp=1'); }],
+      ['another file', (i) => { i.gateCheckLine = PASSING_GATE_LINE.replace('EPIC-001_cleanroom_probe.md', 'STORY-001-01_cleanroom_probe_story.md'); }],
+      ['no log line', (i) => { i.gateCheckLine = null; }],
+      ['wiki page absent', (i) => { i.epicWikiPageExists = false; }],
+      ['PostToolUse:Edit exit 1', (i) => withS1Hooks(i, [sessionStartHook(idLine), sessionStartHook(ssBanner), preToolUseHook('Edit', 0), postToolUseHook(1)])],
+      ['no PostToolUse:Edit', (i) => withS1Hooks(i, [sessionStartHook(idLine), sessionStartHook(ssBanner), preToolUseHook('Edit', 0)])],
+    ];
+    for (const [name, mutate] of cases) {
+      const inputs = passingInputs(CLAUDE_AGENTS, CLAUDE_SKILLS);
+      mutate(inputs);
+      assert.strictEqual(claudeLiveVerdicts(inputs)['post-tool-use']?.status, 'FAIL', `${name} must FAIL post-tool-use`);
+    }
+  });
+
+  test('E2l: dispatch needs a new ledger row with agent_type "qa", SubagentStop exit 0, and no S2 tool error', async () => {
+    const { claudeLiveVerdicts, CLAUDE_AGENTS, CLAUDE_SKILLS } = await loadEvidence();
+    const cases: Array<[string, (i: ClaudeLiveVerdictInputs) => void]> = [
+      ['F6 unattributed row', (i) => { i.ledgerRows = [{ agent_type: 'unattributed' }]; }],
+      ['no ledger rows', (i) => { i.ledgerRows = []; }],
+      ['SubagentStop exit 1', (i) => withS2Hooks(i, [preToolUseHook('Agent', 0), preToolUseHook('Agent', 0), subagentStopHook(1)])],
+      ['no SubagentStop', (i) => withS2Hooks(i, [preToolUseHook('Agent', 0), preToolUseHook('Agent', 0)])],
+      ['S2 tool error', (i) => { i.s2 = { ...i.s2, toolErrors: [{ type: 'tool_result', is_error: true }] }; }],
+    ];
+    for (const [name, mutate] of cases) {
+      const inputs = passingInputs(CLAUDE_AGENTS, CLAUDE_SKILLS);
+      mutate(inputs);
+      assert.strictEqual(claudeLiveVerdicts(inputs)['dispatch']?.status, 'FAIL', `${name} must FAIL dispatch`);
+    }
+  });
+
+  test('E2m: agents-skills needs every CLAUDE_SKILLS entry too, and a parsed init', async () => {
+    const { claudeLiveVerdicts, CLAUDE_AGENTS, CLAUDE_SKILLS } = await loadEvidence();
+    const inputs = passingInputs(CLAUDE_AGENTS, CLAUDE_SKILLS.filter((s) => s !== 'sprint-execution'));
+    assert.strictEqual(claudeLiveVerdicts(inputs)['agents-skills']?.status, 'FAIL', 'missing skill must FAIL');
+    const inputs2 = passingInputs(CLAUDE_AGENTS, CLAUDE_SKILLS);
+    inputs2.s1 = { ...inputs2.s1, init: null };
+    assert.strictEqual(claudeLiveVerdicts(inputs2)['agents-skills']?.status, 'FAIL', 'no init must FAIL');
+  });
+
+  test('E2n: hook-identity needs the expected path and an exact line match', async () => {
+    const { claudeLiveVerdicts, identityVerdict, CLAUDE_AGENTS, CLAUDE_SKILLS } = await loadEvidence();
+    const inputs = passingInputs(CLAUDE_AGENTS, CLAUDE_SKILLS);
+    delete inputs.identity;
+    assert.strictEqual(claudeLiveVerdicts(inputs)['hook-identity']?.status, 'FAIL', 'no expected path must FAIL');
+    const inputs2 = passingInputs(CLAUDE_AGENTS, CLAUDE_SKILLS);
+    withS1Hooks(inputs2, [sessionStartHook(idLine + '-shadow'), sessionStartHook(ssBanner), preToolUseHook('Edit', 0), postToolUseHook(0)]);
+    assert.strictEqual(claudeLiveVerdicts(inputs2)['hook-identity']?.status, 'FAIL', 'a longer path must not match');
+    assert.strictEqual(identityVerdict(passingS1(CLAUDE_AGENTS, CLAUDE_SKILLS), '/room/tools/bin/cleargate').status, 'PASS');
   });
 });
 
@@ -489,6 +632,53 @@ describe('E3 — checkEvidence', () => {
     assert.strictEqual(result.ok, false, JSON.stringify(result));
     assert.ok(result.reason?.includes('stale'), `reason must name staleness: ${result.reason}`);
   });
+
+  test('E3-6 (TPV R-E3): an earlier PASS with matching inputs does not rescue a last FAIL', async () => {
+    const { checkEvidence } = await loadEvidence();
+    const md = '# header\n\n' + runSection(1, 'PASS', ARTIFACT_INPUTS_A) + '\n' + runSection(2, 'FAIL', ARTIFACT_INPUTS_A);
+    const result = checkEvidence(md, { artifactInputs: ARTIFACT_INPUTS_A });
+    assert.strictEqual(result.ok, false, JSON.stringify(result));
+    assert.strictEqual(result.lastRun?.index, 2, JSON.stringify(result.lastRun));
+  });
+
+  test('E3-7 (TPV R-E3): renderRunSection round-trips through checkEvidence', async () => {
+    const { checkEvidence, renderRunSection } = await loadEvidence();
+    const record = (result: 'PASS' | 'FAIL', artifactInputs: string, index: number) => ({
+      index,
+      startedAt: '2026-09-26T00:00:00Z',
+      label: 'tpv',
+      result,
+      cliSha: 'c'.repeat(40),
+      artifactInputs,
+      artifact: { file: 'cleargate-0.26.1.tgz', sha256: 'd'.repeat(64) },
+      container: '/abs/cg-cleanroom-20260926T000000Z-claude',
+      claude: { version: '2.1.283 (Claude Code)', model: 'claude-haiku-4-5-20251001' },
+      cleargateResolved: '/abs/cg-cleanroom-20260926T000000Z-claude/tools/bin/cleargate',
+      registeredHosts: ['claude'],
+      allResolvedHosts: ['claude'],
+      rows: [{ id: 'claude.live.session-start', noflag: 'PASS', all: 'PASS', evidence: 'S1 SessionStart' }],
+      findings: [],
+    });
+    const header = '# Clean-room evidence — SPRINT-41 (Claude baseline, STORY-058-09)\n\n';
+    const pass = renderRunSection(record('PASS', ARTIFACT_INPUTS_A, 3));
+    assert.match(pass, /^## Run 3 — 2026-09-26T00:00:00Z — tpv$/m, pass);
+    assert.match(pass, /^- result: PASS$/m, pass);
+    assert.match(pass, new RegExp(`^- artifact_inputs: ${ARTIFACT_INPUTS_A}$`, 'm'), pass);
+    assert.match(pass, new RegExp(`^- cli_sha: ${'c'.repeat(40)}$`, 'm'), pass);
+
+    const ok = checkEvidence(header + pass, { artifactInputs: ARTIFACT_INPUTS_A });
+    assert.strictEqual(ok.ok, true, JSON.stringify(ok));
+    assert.strictEqual(ok.lastRun?.index, 3);
+
+    const stale = checkEvidence(header + pass, { artifactInputs: ARTIFACT_INPUTS_B });
+    assert.strictEqual(stale.ok, false, JSON.stringify(stale));
+
+    const failed = renderRunSection(record('FAIL', ARTIFACT_INPUTS_A, 4));
+    assert.match(failed, /^- result: FAIL$/m, failed);
+    const last = checkEvidence(header + pass + '\n' + failed, { artifactInputs: ARTIFACT_INPUTS_A });
+    assert.strictEqual(last.ok, false, JSON.stringify(last));
+    assert.strictEqual(last.lastRun?.index, 4);
+  });
 });
 
 // ── E4 — compareInstallTrees ─────────────────────────────────────────────────
@@ -535,6 +725,37 @@ describe('E4 — compareInstallTrees', () => {
     );
   });
 
+  test('E4-2b (TPV R-E4): a CRLF-only difference is "differs (sha)" — raw bytes, never hashNormalized', async () => {
+    const { compareInstallTrees } = await loadEvidence();
+    const a = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-cit-a-'));
+    const b = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-cit-b-'));
+    baseTree(a);
+    baseTree(b);
+    writeFile(a, '.claude/hooks/h.sh', '#!/usr/bin/env bash\necho hi\n', 0o755);
+    writeFile(b, '.claude/hooks/h.sh', '#!/usr/bin/env bash\r\necho hi\r\n', 0o755);
+    const result = compareInstallTrees(a, b);
+    assert.strictEqual(result.ok, false);
+    assert.ok(
+      result.violations.some((v) => /differs \(sha\)/.test(v) && v.includes('.claude/hooks/h.sh')),
+      JSON.stringify(result.violations),
+    );
+  });
+
+  test('E4-8 (TPV R-E4): a no-flag file absent from "other" is a "missing in other" violation', async () => {
+    const { compareInstallTrees } = await loadEvidence();
+    const a = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-cit-a-'));
+    const b = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-cit-b-'));
+    baseTree(a);
+    baseTree(b);
+    fs.rmSync(path.join(b, '.claude', 'x.md'));
+    const result = compareInstallTrees(a, b);
+    assert.strictEqual(result.ok, false);
+    assert.ok(
+      result.violations.some((v) => v.includes('missing in other') && v.includes('.claude/x.md')),
+      JSON.stringify(result.violations),
+    );
+  });
+
   test('E4-3: a mode change is a "differs (mode)" violation', async () => {
     const { compareInstallTrees } = await loadEvidence();
     const a = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-cit-a-'));
@@ -637,6 +858,35 @@ describe('E5 — probe items', () => {
     assert.throws(() => authorProbeEpic(withoutPlaceholder), /anchor not found/);
   });
 
+  test('E5-6 (TPV R-E5): removing any single anchor throws "anchor not found"', async () => {
+    const { authorProbeEpic, approveProbeStory, declareProbeSprint } = await loadProbeItems();
+    const epic = fs.readFileSync(canonicalPath('.cleargate/templates/epic.md'), 'utf8');
+    const story = fs.readFileSync(canonicalPath('.cleargate/templates/story.md'), 'utf8');
+    const sprint = fs.readFileSync(canonicalPath('.cleargate/templates/Sprint Plan Template.md'), 'utf8');
+    const cut = (s: string, needle: string): string => {
+      assert.ok(s.includes(needle), `fixture sanity: template lacks ${needle}`);
+      return s.split(needle).join('');
+    };
+    const epicCases: Array<[string, string]> = [
+      ['human answer', "- **Human Answer:** Unresolved — replace this entire line with the human's decision."],
+      ['unresolved note', '> The literal token `Unresolved`'],
+      ['path:NN citation', '`path/to/file.ext:NN`'],
+      ['bare path citation', '`path/to/file.ext`'],
+    ];
+    for (const [name, needle] of epicCases) {
+      assert.throws(() => authorProbeEpic(cut(epic, needle)), /probe-items: anchor not found: /, name);
+    }
+    assert.throws(() => approveProbeStory(story.replace(/^status: .*$/gm, '')), /probe-items: anchor not found: /, 'story status');
+    const sprintCases: Array<[string, (s: string) => string]> = [
+      ['epics', (s) => s.replace(/^epics: \[\].*$/m, 'epics_removed: true')],
+      ['story row', (s) => cut(s, '| `{STORY-NNN-NN}` | {Title} |')],
+      ['fast-lane row', (s) => cut(s, '| `STORY-NNN-NN` | fast | <one-line rationale> |')],
+    ];
+    for (const [name, mutate] of sprintCases) {
+      assert.throws(() => declareProbeSprint(mutate(sprint), { epic: 'EPIC-001', story: 'STORY-001-01' }), /probe-items: anchor not found: /, name);
+    }
+  });
+
   test('E5-4: approveProbeStory inserts approved: true after status: and keeps <instructions> byte-identical', async () => {
     const { approveProbeStory } = await loadProbeItems();
     const raw = fs.readFileSync(canonicalPath('.cleargate/templates/story.md'), 'utf8');
@@ -702,6 +952,38 @@ describe('E6 — validateContainer', () => {
     assert.strictEqual(result.ok, false, JSON.stringify(result));
   });
 
+  test('E6-6 (TPV ruling #2): the parent is realpathed before the temp-root check', async () => {
+    const { validateContainer } = await loadEvidence();
+    const seen: string[] = [];
+    const result = validateContainer(
+      '/Users/me/link/cg-room',
+      fixedProbes({
+        realpath: (p) => {
+          seen.push(p);
+          return p === '/Users/me/link' ? '/private/var/folders/xy/T/link' : p;
+        },
+      }),
+    );
+    assert.strictEqual(result.ok, false, JSON.stringify(result));
+    assert.ok(seen.includes('/Users/me/link'), `realpath must receive the parent: ${JSON.stringify(seen)}`);
+  });
+
+  test('E6-7 (TPV ruling #2): insideGitWorkTree receives the resolved parent, not the container', async () => {
+    const { validateContainer } = await loadEvidence();
+    const seen: string[] = [];
+    const result = validateContainer(
+      '/abs/inside-repo/cg-room',
+      fixedProbes({
+        insideGitWorkTree: (p) => {
+          seen.push(p);
+          return p === '/abs/inside-repo';
+        },
+      }),
+    );
+    assert.strictEqual(result.ok, false, JSON.stringify(result));
+    assert.ok(!seen.includes('/abs/inside-repo/cg-room'), `must not probe the container itself: ${JSON.stringify(seen)}`);
+  });
+
   test('E6-5: a non-existing sibling path under a non-git parent is accepted', async () => {
     const { validateContainer } = await loadEvidence();
     const result = validateContainer('/abs/Documents/Dev/cg-cleanroom-x', fixedProbes());
@@ -771,4 +1053,125 @@ describe('E7 — computeArtifactInputs', () => {
     const digestB = computeArtifactInputs(dirB, 'HEAD');
     assert.strictEqual(digestA, digestB, 'two structurally identical repos, both missing tsup.config.ts, must hash equal');
   });
+
+  // The plan's seven paths (M4 §STORY-058-09). A superset check, not equality:
+  // M4-A22 grows the list when a build script is added.
+  const PLAN_INPUT_PATHS: Array<[string, string]> = [
+    ['src', 'src/a.ts'],
+    ['scaffold', 'scaffold/core/x.md'],
+    ['package.json', 'package.json'],
+    ['tsup.config.ts', 'tsup.config.ts'],
+    ['tsconfig.json', 'tsconfig.json'],
+    ['scripts/copy-planning-payload.mjs', 'scripts/copy-planning-payload.mjs'],
+    ['scripts/build-manifest.ts', 'scripts/build-manifest.ts'],
+  ];
+
+  test('E7-4 (TPV R-E7): every plan input path is listed and changing it changes the digest', async () => {
+    const { computeArtifactInputs, ARTIFACT_INPUT_PATHS } = await loadEvidence();
+    for (const [listed] of PLAN_INPUT_PATHS) {
+      assert.ok(ARTIFACT_INPUT_PATHS.includes(listed), `ARTIFACT_INPUT_PATHS must include ${listed}`);
+    }
+    for (const [listed, file] of PLAN_INPUT_PATHS) {
+      const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-cai-p-'));
+      initGitRepo(dir);
+      for (const [, f] of PLAN_INPUT_PATHS) writeFile(dir, f, `v1 ${f}\n`);
+      commitAll(dir, 'init');
+      const before = computeArtifactInputs(dir, 'HEAD');
+      writeFile(dir, file, `v2 ${file}\n`);
+      commitAll(dir, `change ${listed}`);
+      assert.notStrictEqual(computeArtifactInputs(dir, 'HEAD'), before, `a change under ${listed} must change the digest`);
+    }
+  });
+
+  test('E7-5 (TPV R-E7): the digest reads the named ref, never the working tree', async () => {
+    const { computeArtifactInputs } = await loadEvidence();
+    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-cai-ref-'));
+    initGitRepo(dir);
+    writeFile(dir, 'src/a.ts', 'export const a = 1;\n');
+    writeFile(dir, 'package.json', '{"name":"fixture"}\n');
+    commitAll(dir, 'one');
+    const d1 = computeArtifactInputs(dir, 'HEAD');
+    writeFile(dir, 'src/a.ts', 'export const a = 2;\n');
+    commitAll(dir, 'two');
+    const d2 = computeArtifactInputs(dir, 'HEAD');
+    assert.strictEqual(computeArtifactInputs(dir, 'HEAD~1'), d1, 'HEAD~1 must hash as it did when it was HEAD');
+    writeFile(dir, 'src/a.ts', 'export const a = 3; // uncommitted\n');
+    assert.strictEqual(computeArtifactInputs(dir, 'HEAD'), d2, 'an uncommitted edit must not change the digest');
+  });
+});
+
+// ── E8 — decideRun (TPV R-E8, plan M4-A26) ───────────────────────────────────
+
+const PLAN_GATING = [
+  'room-isolation',
+  'verify-install',
+  'doctor',
+  'tree-comparison',
+  'claude.live.hook-identity',
+  'claude.live.session-start',
+  'claude.live.pre-tool-use',
+  'claude.live.post-tool-use',
+  'claude.live.dispatch',
+  'claude.live.agents-skills',
+  'claude.live.agents-md-exposure',
+];
+
+// Built from the MODULE's GATING_CHECKS (E8-1 pins the plan set as a subset),
+// so a later story may add a gating id without re-sealing this file.
+function greenRowsFor(gating: readonly string[]): RunRow[] {
+  return [
+    ...gating.map((id) =>
+      id === 'claude.live.agents-md-exposure' ? { id, noflag: 'N/A', all: 'N/A' } : { id, noflag: 'PASS', all: 'PASS' },
+    ),
+    { id: 'claude.live.mcp-connect', noflag: 'INFO', all: 'INFO' },
+    { id: 'sprint-init', noflag: 'FAIL', all: 'FAIL' },
+  ];
+}
+const setRow = (rows: RunRow[], id: string, noflag: string, all: string): RunRow[] =>
+  rows.map((r) => (r.id === id ? { ...r, noflag, all } : r));
+
+describe('E8 — decideRun', () => {
+  test('E8-1: GATING_CHECKS covers the plan gating set; sprint-init and mcp-connect are not gating', async () => {
+    const { GATING_CHECKS } = await loadEvidence();
+    for (const id of PLAN_GATING) assert.ok(GATING_CHECKS.includes(id), `GATING_CHECKS must include ${id}`);
+    assert.ok(!GATING_CHECKS.includes('sprint-init'));
+    assert.ok(!GATING_CHECKS.includes('claude.live.mcp-connect'));
+  });
+
+  test('E8-2: all gating PASS → PASS; --known-fail sprint-init relabels only that row', async () => {
+    const { decideRun, GATING_CHECKS } = await loadEvidence();
+    const greenRows = (): RunRow[] => greenRowsFor(GATING_CHECKS);
+    const out = decideRun(greenRows(), { knownFail: { 'sprint-init': 'BUG-090' } });
+    assert.strictEqual(out.result, 'PASS', JSON.stringify(out.reasons));
+    const si = out.rows.find((r) => r.id === 'sprint-init');
+    assert.strictEqual(si?.noflag, 'FAIL-KNOWN (BUG-090)');
+    assert.strictEqual(si?.all, 'FAIL-KNOWN (BUG-090)');
+    assert.strictEqual(si?.gating, false);
+    assert.strictEqual(decideRun(greenRows()).result, 'PASS', 'sprint-init is non-gating even without --known-fail');
+  });
+
+  test('E8-3: --known-fail on any other id is ignored — a gating FAIL still FAILs the run', async () => {
+    const { decideRun, GATING_CHECKS } = await loadEvidence();
+    const greenRows = (): RunRow[] => greenRowsFor(GATING_CHECKS);
+    const rows = setRow(greenRows(), 'claude.live.dispatch', 'FAIL', 'FAIL');
+    const out = decideRun(rows, { knownFail: { 'claude.live.dispatch': 'BUG-1', 'sprint-init': 'BUG-090' } });
+    assert.strictEqual(out.result, 'FAIL');
+    assert.strictEqual(out.rows.find((r) => r.id === 'claude.live.dispatch')?.noflag, 'FAIL');
+    assert.ok(out.reasons.some((r) => r.includes('claude.live.dispatch')), JSON.stringify(out.reasons));
+  });
+
+  test('E8-4: one failing column, a non-PASS column, or a missing gating row FAILs the run', async () => {
+    const { decideRun, GATING_CHECKS } = await loadEvidence();
+    const greenRows = (): RunRow[] => greenRowsFor(GATING_CHECKS);
+    assert.strictEqual(decideRun(setRow(greenRows(), 'tree-comparison', 'PASS', 'FAIL')).result, 'FAIL');
+    assert.strictEqual(decideRun(setRow(greenRows(), 'claude.live.session-start', 'PASS', 'N/A')).result, 'FAIL');
+    assert.strictEqual(decideRun(greenRows().filter((r) => r.id !== 'claude.live.hook-identity')).result, 'FAIL');
+  });
+
+  test('E8-5: agents-md-exposure may be N/A per column (RS-4: no AGENTS.md in the no-flag room), never FAIL', async () => {
+    const { decideRun, GATING_CHECKS } = await loadEvidence();
+    const greenRows = (): RunRow[] => greenRowsFor(GATING_CHECKS);
+    assert.strictEqual(decideRun(setRow(greenRows(), 'claude.live.agents-md-exposure', 'N/A', 'PASS')).result, 'PASS');
+    assert.strictEqual(decideRun(setRow(greenRows(), 'claude.live.agents-md-exposure', 'N/A', 'FAIL')).result, 'FAIL');
+  });
 });
```

## Expected counts after the re-seal

| File | Red (after QA-Red re-seal) | Green (after the Dev) |
|---|---|---|
| `test/scripts/clean-room-evidence.red.node.test.ts` | 60/60 fail | 60/60 pass |
| `test/e2e/clean-room-claude-baseline.red.integration.node.test.ts` | 3 fail (A3, A4, B4), 10 pass | 13/13 pass |
| **BASELINE_FAIL** | **63** | 0 |

- The sealed sets are unchanged:
  - -03..-07: 13 files, all green;
  - BUG-085's trio: 24/13/13;
  - -08: 42/5/9;
  - parity: 5/5 and 15/15 in compare mode.
- The baseline hash stays `bdc4bb1a…62b2` with 425 files.
- There is no new test file, and the story's §3.1 is unchanged.

## Plan amendments

I appended M4-A24..A32 to `plans/M4.md` under `### Amendments from TPV (STORY-058-09, 2026-09-26)`:

| Amendment | Content |
|---|---|
| M4-A24 | ruling #1: the `claudeLiveVerdicts` inputs, keys and rules; `parseClaudeStream` |
| M4-A25 | ruling #2: `validateContainer` probes |
| M4-A26 | `decideRun`, `GATING_CHECKS` with `room-isolation`, the known-fail semantics, the run record, and `checkEvidence` parsing |
| M4-A27 | ruling #3: the `mcp-connect` detail |
| M4-A28 | the whole-line `epics:` replacement; every anchor throws |
| M4-A29 | a quote-tolerant `frontmatterIntact` |
| M4-A30 | the e2e amendments |
| M4-A31 | the counts |
| M4-A32 | Run 1, the doc edit and the commits, pointing at J10–J13 |

## Script incidents

None. No wrapped script was invoked. Every probe ran in scratch under `/private/tmp/cg-s41-tpv-058-09`, and I deleted that root with a literal `rm -rf -- /private/tmp/cg-s41-tpv-058-09`.

## Outer status

- **At start:** ` M .cleargate/sprint-runs/SPRINT-41/{.session-totals.json,events.jsonl,state.json,token-ledger.jsonl}` (the orchestration ledgers) and `?? .cleargate/sprint-runs/SPRINT-41/.pending-task-2441-63600-24114.json`.
- **At end:**
  - The same four ledger files are modified.
  - The `.pending-task-*.json` is gone. It was consumed by the orchestrator's hooks, not by this dispatch; I never touched it.
  - This dispatch's own writes are `M .cleargate/sprint-runs/SPRINT-41/plans/M4.md` (the appended amendments) and `?? .cleargate/sprint-runs/SPRINT-41/reports/STORY-058-09-tpv.md`.
  - The cli main checkout is still at `eed511c`, with only its pre-existing untracked `cleargate-0.25.0.tgz`.
  - I did not commit anything.

## Flashcards

```yaml
flashcards_flagged:
  - "2026-09-26 · #test-harness #tpv #clean-room · A test that runs hooks in a room it later byte-compares can never pass; probes need their own room."
  - "2026-09-26 · #test-harness #tpv · A boolean verdict input (ledgerHasQaRow) moves the check into untested code; pass raw rows to the pure function."
  - "2026-09-26 · #test-harness #tpv · Positive-only verdict fixtures let 18 of 22 weakened PASS conditions survive; write one negative case per condition."
  - "2026-09-26 · #test-harness #tpv · Fixture rows built from a plan-list constant hide an equality pin; build them from the module's own exported list."
  - "2026-09-26 · #typecheck #test-harness · cleargate-cli npm run typecheck covers src/** only; TS errors in test files never surface there."
  - "2026-09-26 · #frontmatter #clean-room · cleargate new epic writes epic_id with double quotes; stamp re-serializes it bare. Id matchers must accept both."
  - "2026-09-26 · #test-harness #tpv · In a scratch clone without dist/, tests that spawn dist/cli.js report cancelled, not failed. Build dist there first."
```

STATUS=done
