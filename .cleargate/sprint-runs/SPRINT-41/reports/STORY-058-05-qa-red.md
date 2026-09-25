# STORY-058-05 — QA-Red

role: qa

**Commit:** cli `story/STORY-058-05` @ `764f06380ee7d33d9f2dc769c3277f44d0a8f321`
("qa-red(STORY-058-05): write failing tests"), cut from cli `main` @ `6b5ee5c` (STORY-058-06 merged). Test files and fixtures only — no `src/**` touched.

## Files written

- `cleargate-cli/test/hosts/host-lifecycle.red.node.test.ts` (845 lines, 13 tests) — scenarios 1-8, 11.
- `cleargate-cli/test/commands/host-cli.red.integration.node.test.ts` (154 lines, 3 tests) — scenarios 9-10.

No `test/helpers/*` changes were needed — `runInitScenario`, `ExitSignal`, `composeCanonicalPayload`, `entryOwner`, `installedHosts`, `hashNormalized` etc. were all reused as-is from the already-merged -03/-04/-06 helpers.

## Per-scenario table

`host-lifecycle.red.node.test.ts` — every call into `src/hosts/lifecycle.ts` / `src/commands/host.ts` is a per-test dynamic `import()`; neither file exists yet, so every test fails on `ERR_MODULE_NOT_FOUND` for the specific not-yet-existing module it needs, never a whole-file collapse.

| # | Test | R/G | Reason (verified against source) |
|---|------|-----|-----------------------------------|
| 1 (Gherkin 1) | `host add codex onto a claude-only install creates codex files and leaves every other file byte-identical` | Red | `ERR_MODULE_NOT_FOUND` on `import('.../src/commands/host.ts')` — file does not exist (`ls` confirms). |
| 2a (Gherkin 2) | `host add claude twice onto a codex-only install: one hook occurrence, one CLEARGATE:START, one mcp entry, hosts=[claude,codex]` | Red | same — `host.ts` missing. |
| 2b (Gherkin 2) | `host add codex twice leaves .codex/hooks.json with one ClearGate entry` | Red | same — `host.ts` missing. |
| 3 (Gherkin 3) | `planHostRemoval.deletes equals the copilot-owned/non-surgery/non-preserved set; hostRemoveHandler deletes exactly those and preserves the rest` | Red | `ERR_MODULE_NOT_FOUND` on `import('.../src/hosts/lifecycle.ts')` — this test calls `planHostRemoval` directly, so it is the one test in the file that fails on `lifecycle.ts` rather than `host.ts` (confirmed by isolating the stack trace — see "Verification" below). |
| 4 (Gherkin 4) | `removing copilot keeps the core-owned shared skill...; removing codex next deletes it as orphaned` | Red | `host.ts` missing. |
| 5 (Gherkin 5) | `host remove claude on a claude-only install exits 1, names cleargate uninstall, and writes nothing` | Red | `host.ts` missing. |
| 6a (Gherkin 6) | `stdout line 1 names the installed hosts; rows are core, claude, codex in order with correct counts; exit 0 when healthy` | Red | `host.ts` missing. |
| 6b (Gherkin 6, plan's own extension) | `a missing codex-owned file reports missing=1 healthy=no for that row and exits 1` | Red | `host.ts` missing. |
| 7a (plan's own extension) | `host add bogus: exit 2, message names "bogus", nothing written` | Red | `host.ts` missing. |
| 7b | `host remove codex on a claude-only install: exit 2, message says "is not installed", nothing written` | Red | `host.ts` missing. |
| 7c | `any subcommand with no snapshot: exit 2, message names "cleargate init"` | Red | `host.ts` missing. |
| 8 (plan's own extension) | `host remove claude on a user-content install preserves the user hook, CLAUDE.md prose, and .mcp.json bytes` | Red | `host.ts` missing. |
| 11 (E2E) | `install R3 all, remove copilot, then hostListHandler exits 0 with core/claude/codex all healthy` | Red | `host.ts` missing. |

`host-cli.red.integration.node.test.ts` — spawns the real `src/cli.ts` via tsx (M2/flashcard P4 recipe); `host` is not yet a registered command group.

| # | Test | R/G | Reason (verified against source) |
|---|------|-----|-----------------------------------|
| 9 | `host list on the real legacy 0.10.0 snapshot prints "installed: claude" with core/claude rows` | Red | Commander rejects `host` as unknown: stderr = `error: unknown command 'host'\n(Did you mean hook?)...`; exit code 1 (not the eventual command's own contract) — confirmed by direct grep on `src/cli.ts` showing no `.command('host')` registration. |
| 10a | `host add bogus exits 2 and leaves the fixture unchanged` | Red | same "unknown command 'host'"; observed exit code 1, test asserts 2 (`1 !== 2` in the failure output). |
| 10b | `on a claude-only install, host remove claude exits 1 with the uninstall pointer and leaves the fixture unchanged` | Red | same "unknown command 'host'"; stderr lacks "cleargate uninstall" (assertion fails as intended). |

## Per-file counts (2 solo runs each, `npm run test:file -- <file>`)

| File | Run 1 | Run 2 |
|---|---|---|
| `test/hosts/host-lifecycle.red.node.test.ts` | 13 tests, 0 pass, 13 fail | 13 tests, 0 pass, 13 fail |
| `test/commands/host-cli.red.integration.node.test.ts` | 3 tests, 0 pass, 3 fail | 3 tests, 0 pass, 3 fail |

**BASELINE_FAIL: 16** (13 + 3), stable across both solo runs — no flakiness observed.

## Sealed re-run counts (2 solo runs each — must stay green)

| File | Expected | Run 1 | Run 2 |
|---|---|---|---|
| `test/hosts/host-adapter-contract.red.node.test.ts` | 19 | 19/19 pass | 19/19 pass |
| `test/hosts/host-selection.red.node.test.ts` | 11 | 11/11 pass | 11/11 pass |
| `test/commands/init-host-selection.red.node.test.ts` | 10 | 10/10 pass | 10/10 pass |
| `test/commands/init-host-cli.red.integration.node.test.ts` | 4 | 4/4 pass | 4/4 pass |
| `test/lib/manifest-host-ownership.red.node.test.ts` | 18 | 18/18 pass | 18/18 pass |
| `test/commands/init-host-snapshot.red.node.test.ts` | 13 | 13/13 pass | 13/13 pass |

## Parity files (compare mode, `CLEARGATE_INIT_BASELINE=/private/tmp/cg-s41-m2-init-baseline`, never a capture flag)

| File | Expected | Run 1 | Run 2 |
|---|---|---|---|
| `test/hosts/claude-adapter-init-parity.red.integration.node.test.ts` | 5/5 | 5/5 pass | 5/5 pass |
| `test/commands/init-host-parity.red.integration.node.test.ts` | 15/15 | 15/15 pass | 15/15 pass |

`logPrefix` does not exist on this branch yet (it is Dev's addition to `types.ts`/`claude.ts`), so these parity runs exercise the CURRENT (pre-`logPrefix`) byte-neutral behavior — a true baseline for Dev's change to be measured against.

## `npm run typecheck`

Exit 0 (both new test files are excluded from `tsconfig.json`'s `include`/`exclude` set — `**/*.test.ts` — so they are never type-checked; confirmed by reading `tsconfig.json` directly).

## Baseline hash (before and after every run above)

```
find /private/tmp/cg-s41-m2-init-baseline -type f -print0 | sort -z | xargs -0 shasum -a 256 | shasum -a 256
```

- Before: `bdc4bb1a6be55f938dd87ce1a281231972bec12c7a850009fcbec8cf354a62b2`
- After: `bdc4bb1a6be55f938dd87ce1a281231972bec12c7a850009fcbec8cf354a62b2`

Unchanged — matches the required hash both times.

## Hard rules honored

- No `npm run build` invoked.
- No `git stash`/amend/rebase/`--no-verify`.
- No bare `cleargate` invoked.
- `cleargate-0.25.0.tgz` (pre-existing untracked file) left untouched — confirmed still untracked, not staged, not read.
- Only `test/hosts/host-lifecycle.red.node.test.ts` and `test/commands/host-cli.red.integration.node.test.ts` were added/committed; `git show --stat` on the commit confirms exactly these two files. No `src/**` edit. No sealed -03/-04/-06 test file touched (`git status` shows nothing else modified).
- Scripts invoked: `npm run test:file`, `npm run typecheck`, `find`/`shasum` for the baseline hash, `git` (status/add/commit/log/rev-parse). All were run directly via the Bash tool per the dispatch's own "Verify" section (which specifies `npm run test:file -- <file>` directly) — no `.cleargate/scripts/*` script was invoked, so `run_script.sh` wrapping does not apply here.

## Plan ambiguities (orchestrator_confirmed: false)

1. **`hostListHandler`'s exit-0 semantics on the healthy path.** The M3 plan's `host.ts` spec says only "Exit 0 if every row is healthy, otherwise 1" — it does not say whether the handler calls `exit(0)` explicitly, or simply returns and lets the CLI action fall through to Node's default exit-0. Scenario 6a and Scenario 11 accept EITHER shape (`code === undefined || code === 0`); only the unhealthy branch (Scenario 6b, `exit(1)`) is asserted strictly, since that is the one behavior no implementation can satisfy implicitly. If TPV wants the explicit-`exit(0)`-call shape pinned, that needs an amendment before Dev's re-seal is graded against it, since my red currently can't distinguish the two.
2. **Scenario 1's "nothing to stderr" assertion.** I added `assert.equal(stderrChunks.join(''), '')` for a clean additive add (Gherkin 1) — this is not literally pinned by the M3 plan's scenario-1 bullet list, which only requires the file-creation and byte-identity witnesses. It's a reasonable extrapolation (nothing in `addHost`'s spec calls for a warning on a clean path), but if Dev's `addHost` legitimately emits an informational or WARNING line on this path for some reason I haven't anticipated, this assertion would kick back a correct implementation. Flagging for Architect confirmation rather than silently dropping it, since a silent stderr regression is exactly the kind of thing this story's own "Existing Surfaces" section (merge-settings.ts precedent) cares about.

## flashcards_flagged

Checked `.cleargate/FLASHCARD.md` (Rule 1, grep-before-append) before proposing anything: the one lesson this dispatch surfaced firsthand — "an owner-less fixture manifest entry reads by the legacy rule and passes the ownership gate vacuously" — is already recorded verbatim (`2026-09-25 · #manifest #test-harness #danger · A fixture manifest entry without owner reads by the legacy rule (.codex/** => core); always stamp owner explicitly.`). No new card needed.

```yaml
flashcards_flagged: []
```

STATUS=done
