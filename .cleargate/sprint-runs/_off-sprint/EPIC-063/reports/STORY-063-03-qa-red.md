# STORY-063-03 QA-Red report (role: qa, Mode: RED)

QA-RED: WRITTEN
Branch `story/STORY-063-03` (cleargate-cli, from main 10b37dd). Nothing committed, no production/scaffold edits, no build.

## New files (failing at baseline)
| File | Tier | Red | Failure reason at baseline |
|---|---|---|---|
| `test/hooks/shell-ingest.red.node.test.ts` | unit | 17 / 17 | `src/hooks/shell-ingest.ts` missing (ERR_MODULE_NOT_FOUND, caught into an explicit "not yet implemented" assert); `hookShellIngestHandler` not exported from `hook.ts` |
| `test/hooks/post-shell-ingest.red.integration.node.test.ts` | hook-contract | 21 / 21 | `post-shell-ingest.sh` does not exist (explicit existence guard in `runHook`) |
| `test/hooks/post-shell-ingest-wiring.red.node.test.ts` | unit | 10 / 10 | script, settings Bash group, codex copy, manifest pin-aware rows, surgery name all absent |

Not red (by design): `test/hooks/hook-emit-context-fallback.node.test.ts` (2 pass). Decision 10(b): covers the already-merged `|| cat "$CTX"` fallback in stamp-and-gate.sh, which no test covered. Non-red name, passes at baseline.

## Amended files
| File | Baseline | Change |
|---|---|---|
| `test/docs/ingest-docs-match-code.red.node.test.ts` | 23 pass / 2 fail | (1) vacuous "wiki lint is invoked by sprint close…" renamed; now asserts `wikiLintHandler(` is called inside `sprintArchiveHandler`, exactly once in sprint.ts, never in `sprintCloseHandler`, and protocol §10.8 says sprint close does not run it. **Passes today, as intended.** (2) RED: §10.9 item 2 must name `post-shell-ingest.sh`. (3) RED: ingest agent doc must not say "via Task" anywhere (and must still name `cleargate-wiki-contradict`). |
| `test/scaffold/codex-payload.red.node.test.ts` | 11 / 3 | Pin updates, below |
| `test/e2e/clean-room-claude-baseline.red.integration.node.test.ts` | 12 / 1 | Pin updates |
| `test/e2e/codex-loop.red.integration.node.test.ts` | 1 / 1 | Pin update |
| `test/hooks/scaffold-cli-resolution.node.test.ts` | 1 / 2 | Pin update |
| `test/hooks/harness-shim.red.node.test.ts` | 18 / 1 | Pin update (found by census) |
| `test/scripts/codex-loop-harness.red.node.test.ts` | 20 / 1 | Pin update (found by census) |
| `test/commands/init-codex.red.node.test.ts` | 5 / 1 | Pin update (found by census) |
| `test/commands/init.node.test.ts` | 2 / 1 (filtered run) | New snapshot-lock + init-render byte test |

Totals of newly-red at baseline (before amendment 12/13; see "Amendment" below for the final count): 17 + 21 + 10 + 2 (docs) + 3 (codex-payload) + 1 (baseline) + 1 (codex-loop) + 2 (scaffold-cli-resolution) + 1 (harness-shim) + 1 (loop-harness 21i) + 1 (init-codex) + 1 (init snapshot) = **61 red**. Typecheck (`npm run typecheck`) clean.

## Deliberate pin updates (each carries a STORY-063-03 reason comment/message in the file)
1. `codex-payload.red` Test 18: 5 -> 6 groups; AD-3 exact shape gains `PostToolUse: [stamp-and-gate (Edit|Write|apply_patch), post-shell-ingest (Bash)]` (matcher `Bash`, `--host codex`); Test 19 `CODEX_HOOK_SCRIPTS` must include `post-shell-ingest.sh`. Reason: parity for shell-written items; Codex shell tool name unverified (G13).
2. `clean-room-claude-baseline.red.integration`: 9 -> 10 hook files; triples gain `PostToolUse | Bash | post-shell-ingest.sh`. Reason: BASELINE_MSG convention.
3. `codex-loop.red.integration`: 5 -> 6 codex hook files.
4. `scaffold-cli-resolution`: `HOOKS_THAT_INVOKE_CLI` += `post-shell-ingest.sh` (three-branch resolver contract).
5. `init.node.test.ts`: new test requires `test/snapshots/hooks/post-shell-ingest.story-063-03.sh` (Developer creates it from the rendered install at pin 0.5.0) and byte-equals the init-rendered hook. First lock for a new hook, so nothing to demote.
6. Census finds beyond the plan list: `harness-shim.red` ADOPTION row `['post-shell-ingest.sh','claude-first','INPUT']` (title 8 -> 9 hooks); `codex-loop-harness.red` 21i (5 -> 6 registrations, event names gain a second `postToolUse`); `init-codex.red` (hook-file list + title 5 -> 6).
7. New in wiring file: manifest pin-aware rows for both hosts, `isClearGateCommand` for both commands, `removeClearGateHooks` strips the Bash group, settings.json PostToolUse exact two groups.

Census checked and left alone (no change needed): `pin-placeholder-coverage` (goes red by itself if the Developer forgets the manifest rows; the wiring file also pins them), `verify-install` (compares payload triples to installed, dynamic), `scaffold-relocation` (`>= 9` hooks), `hooks-claude-parity` (frozen pre-058-11 comparison), `codex-hooks-harness`/`codex-loop-evidence` (synthetic registrations), `init.node.test.ts` scenarios 2/5/6 and CR-059 s5/s6 (unchanged; see ambiguity A3).

## Spec ambiguities resolved
- **A1: `computeShellChanges(...)` had no signature in C3.3.** Pinned a pure shape in the unit file header: input `{ since: ShellSnapshot|null, head, dirty: [{blob,path}], headDiff: [{status,path}]|null, exists(rel) }` returning `string[]` (order free, no duplicates); `parseShellSnapshot(text)` returns `{ head, dirty: [{blob,path}] } | null`. HEAD-diff entries carry the post-image path (R100 gives the NEW path). The Developer must conform or ask to amend.
- **A2: real ingest cannot run from `src/` under tsx.** `tsx src/cli.ts wiki ingest` throws ENOENT on `src/wiki/templates/synthesis/*.md` (default template dir only resolves from dist). Harness workaround: the PATH `cleargate` stub preloads a `readFileSync` redirect to `<CLI_ROOT>/templates/synthesis/`. Production code untouched. If the handler runs ingest in-process, the same preload covers it. The stub does NOT `cd` into the CLI root (02's stub did), because ingest's `getGitSha` and `resolveProjectRootForFile` depend on cwd; the hook runs with cwd = the temp repo as Claude does.
- **A3 (not tested, flag for Dev/orchestrator): `src/hosts/claude.ts` `CLAUDE_HOOK_ADDITION`** merges only the Edit|Write PostToolUse group into an existing settings.json. The plan edits only the payload settings.json, so a plain re-init/upgrade over an existing install will not add the Bash group (fresh init and `init --force` do). If the Developer also adds it to `CLAUDE_HOOK_ADDITION`, `init.node.test.ts` CR-059 scenario 5 ("unchanged") would need a deliberate pin update. I did not pin either way.
- **A4: scenario 3 "sed -i ''"**: used portable `sed -i.bak … && rm` (BSD and GNU). Same-size change (`Draft` -> `Ready`) with a prior dirty edit, to hit the "second sed on an already-dirty file" case.
- **A5: scenario 4 (CLI rewrite)** uses the real `cleargate stamp-tokens` (rewrites the frontmatter, asserted as a precondition) and checks the page `last_ingest` advanced. `sprint add` was rejected as the probe: it ingests in-process itself, so the hook's freshness dedup would (correctly) print nothing and the Gherkin's "✅" line could not be asserted.
- **A6: G11** pinned as the plan says: the detecting run does the full re-check over every dirty delivery .md with dedup (a fresh dirty file is not re-ingested, `log.md` line count unchanged), then writes a valid snapshot listing all dirty files.
- Added beyond the 12: stale-lock (>2 min) clearing and own-lock release; `rebase-merge` guard; not-a-git-repo exit 0; `hook shell-ingest` failing exits 0; Codex plain-line shape; decision 10(a) fallback (emit-context exits non-zero without reading stdin, so the hook must buffer the lines in a file, not a pipe).

## Budget test (scenario 7): split in two, not loosened
- Deterministic half: 20 runs on an `ls` payload, unchanged tree: stdout empty, exit 0, stub log empty (no `node`, no `cleargate` started).
- Timing half, exactly as the plan states: in-test baseline of 20 `/bin/bash -c 'cat >/dev/null'`, p95(hook) - p95(baseline) <= 150 ms.
- **Flaky on this machine under load.** Load average is ~10 here; a bare `git --version` costs 150-200 ms wall (Apple git shim). Any fast path needs at least one git spawn, so p95 delta lands far over 150 ms regardless of implementation. I validated the whole integration file against a scratch reference hook plus handler (not committed): 20 of 21 pass, and only the timing half fails (reference p95 delta ~560 ms, hook p95 ~700 ms vs baseline ~140 ms). It should pass on an idle machine. Developer hint: use at most one or two git spawns on the no-op path (a single `git status --porcelain=v2 --branch` gives HEAD and the dirty list together). Recommend QA-Verify judges the timing half at low load or records the load average with the result.
- The same reference run validates that the other 20 tests are mechanically sound (right setup, right assertions), so reds fail for the missing-implementation reason, not a harness bug.

## Notes for the Developer
- New hook must source `lib/harness.sh` with the exact line `. "$(dirname "${BASH_SOURCE[0]}")/lib/harness.sh"` and `REPO_ROOT="$(cg_repo_root claude-first "${INPUT}")"` (harness-shim row), carry `__CLEARGATE_VERSION__` in the npx branch, `unset GIT_DIR GIT_WORK_TREE GIT_INDEX_FILE`, use `--no-optional-locks`, no `mapfile`, and have no non-comment `exit N` with N != 0.
- Live-run gotcha for `scripts/clean-room/evidence.mjs` `codexDiscoveryVerdict`: it requires every registration (now incl. the Bash group) to appear in `hooks/list`; no default-tier test covers it, so check at the live Codex run.
- `.live`/doctor drift lines will list the new hook until the release re-sync (expected, §R step 3).

## Flashcard candidates
- `2026-11-12 · #test-harness #hooks · tsx src/cli.ts wiki ingest crashes ENOENT on src/wiki/templates/synthesis (dist-only path); preload a readFileSync redirect to templates/synthesis.`
- `2026-11-12 · #hooks #test-harness #macos · Under load ~10 a git spawn costs 150-200 ms wall; a hook p95 budget with a bare-bash baseline needs <=1-2 git calls or an idle machine.`
- `2026-11-12 · #qa-red #test-harness · Validate a hook red file against a scratch reference impl (not committed) before handing off; an existence-guard failure proves nothing about the other assertions.`
- `2026-11-12 · #qa-red #hooks · A PATH cleargate stub must not cd to the CLI root: ingest's getGitSha and project-root resolution use cwd; run the CLI from the room.`

## Amendment (orchestrator decisions 12 and 13)

**Decision 12 (budget).** The timing half in `post-shell-ingest.red.integration.node.test.ts` now runs only with `CLEARGATE_PERF=1`; otherwise `t.skip('timing half runs only with CLEARGATE_PERF=1 — run at release §R on a quiet machine')`. The assertion is unchanged (in-test baseline, 20 runs, p95 delta <= 150 ms). The deterministic half always runs. File now: 20 red, 1 skipped.

**Decision 13 (existing installs get the Bash hook).** Ambiguity A3 is resolved: the Developer adds the Bash group to `CLAUDE_HOOK_ADDITION` (`src/hosts/claude.ts`), command byte-equal to canonical settings.json.
- New `test/hosts/claude-hook-addition-bash.red.node.test.ts`: 6 red. `CLAUDE_HOOK_ADDITION` has exactly one Bash group; the command byte-matches canonical; init over an old install (Edit|Write groups plus user hooks) ends with exactly one Bash group and the user hooks survive; a second run adds no duplicate (bytes identical, "unchanged"); a user Bash group takes the ClearGate command beside its own; `removeClearGateHooks` on the merged result strips it (precondition-asserted).
- Census of tests pinning `CLAUDE_HOOK_ADDITION` / merged-hooks counts:
  - `init.node.test.ts` CR-059 scenario 5: **pin update**, the "already current" fixture gains the Bash group (stays green before and after). Scenario 6: new assertion that the command merges into the user's Bash group (1 red).
  - `uninstall.node.test.ts`: the merged settings gets a Bash group (ClearGate hook beside a user hook); asserts the ClearGate one is stripped, the user one stays (1 red; confirms uninstall coverage).
  - `uninstall-per-host.red` scenario 12: precondition that init wired the Bash hook, plus an explicit post-uninstall absence assertion (1 red).
  - `uninstall-reinit.red`: only count text changes (7 -> 8 hooks, 2 -> 3 additions); assertions compare to canonical bytes and self-adjust. 4 pass.
  - `host-lifecycle.red` (17 pass), `host-adapter-contract.red` (19 pass): derive from the constant itself, self-adjusting; no change needed. Contract Scenario 9 guards the byte-match.
  - `test/helpers/init-fixture.ts`: `userContentSettingsCurrentHash` gains the pushed Bash group, and a `SANCTIONED_BASELINE_ADDITIONS` row for `.claude/hooks/post-shell-ingest.sh` (0755, pin-substituted). These rows only run in the opt-in recorded-baseline compare mode (`captureOrCompare`), which is already stale versus earlier items (e.g. CR-126 template bytes). Not added: sanctioned rows for the `fresh`/`reinit`/`force`/`malformed` settings.json bytes, because I cannot verify the recorded baseline here. Flagged, not chased.
- Codex: no change, as stated.

**Final counts, red at baseline: 69** = unit 17 + hook-contract 20 (+1 skipped timing) + wiring 10 + claude-hook-addition 6 + docs 2 + codex-payload 3 + clean-room baseline 1 + codex-loop 1 + scaffold-cli-resolution 2 + harness-shim 1 + codex-loop-harness 1 + init-codex 1 + init snapshot lock 1 + init scenario 6 + uninstall.node 1 + uninstall-per-host 1 (1 + 1 + 1 for the last three amended files counted once each). Passing pins and fallback: `hook-emit-context-fallback` 2, init scenario 5 (updated), uninstall-reinit 4, host-lifecycle 17, host-adapter-contract 19. Typecheck clean.

## Amendment 2 (TPV bounce; uncommitted on top of 11f49fa)

`post-shell-ingest.red.integration.node.test.ts`:
- **E1.1** `runHook` gains `opts.cwd` (default `b.root`), used for both the spawn cwd and the payload `cwd`.
- **E1.2** New "hook run from a sibling git repo (cwd ≠ REPO_ROOT)": establish, `git mv` in the room, run from a foreign git repo. It expects the ✅ line, `raw_path` under archive, ARCH_X in the snapshot, then a second run with empty stdout and an empty stub log.
- **E1.3** New "MERGE_HEAD guard from a subdirectory cwd": run from `<root>/.cleargate/delivery`. It expects no `shell-ingest` in the log, page bytes unchanged, snapshot unchanged.
- **E2** (decision 14) The existing CLI-failure test now also asserts one line starting `⚠️ wiki ingest failed` that names `hook shell-ingest`, exit 0, and a valid snapshot still written.
- Nit: the stale "Measured equal to 123d7bc7…" comment in `test/helpers/init-fixture.ts` is corrected.

Re-run: the integration file is 22 fail (all on "not yet implemented: …/post-shell-ingest.sh", the missing hook), 0 pass, 1 skipped (timing half). Typecheck clean. The new tests are red for the right reason; the cwd-sensitive logic is not yet exercised, since the hook is missing.

**Final red count: 71** (69 + 2 new). The skipped timing half is unchanged.
