# STORY-058-03 — Developer

role: developer

STORY: STORY-058-03

Implementation on `cleargate-cli` branch `story/STORY-058-03`, on top of the QA-Red commit `11fe514`. Mechanical per the TPV's simulation (`reports/STORY-058-03-tpv.md`, D1–D8) and M2-A1..A8/M2-A14/A15. Cli-only — no outer tracked path edited except this report.

## Files changed and why

- **`cleargate-cli/src/hosts/types.ts` (new).** The `HostAdapter` contract (`HostName`, `InstallCtx`, `RemoveCtx`, `RemoveReport`, `HostAdapter`) verbatim per story §3.3 / M2-A4.
- **`cleargate-cli/src/hosts/registry.ts` (new).** `UnknownHostError`, Map-backed `createHostRegistry` (duplicate-name, root-shape, owned/shared-overlap invariants — shared-vs-shared may overlap), `pathUnderRoots`, `defaultHostRegistry = createHostRegistry([claudeAdapter])`.
- **`cleargate-cli/src/hosts/claude.ts` (new).** `CLAUDE_HOOK_ADDITION` (moved verbatim from `init.ts:35-71`, renamed), a private sync `writeAtomic` copy (`init.ts:228-232` verbatim), `createClaudeAdapter(deps: Partial<ClaudeAdapterDeps> = {})` with `const d = { ...DEFAULT_DEPS, ...deps }` and every helper call routed through `d.<helper>`, `claudeAdapter = createClaudeAdapter()`. `install()` is `init.ts:461-557` moved verbatim minus the three `.mcp.json` capture lines (M2-A1/A3), with the only textual substitutions being `payloadDir`→`ctx.payloadDir`, `pinVersion ?? 'latest'`→`ctx.pinVersion`, `HOOK_ADDITION`→`CLAUDE_HOOK_ADDITION`, helper calls→`d.*`, and D1's fallback substitution (`` `${CLEARGATE_START}\n${CLEARGATE_END}` `` in place of the `init.ts:497` string literal — runtime byte-identical, confirmed by the parity run). `remove()` mirrors `uninstall.ts:434-456` exactly, including the verbatim warning strings at `:441`/`:455`; `.mcp.json` is untouched (STORY-058-07's decision, per plan). Plain object, own enumerable closures, no class, no `this`, not frozen (D3).
- **`cleargate-cli/src/commands/init.ts` (modified).** Deleted the four now-dead imports (`mergeSettings`/`SettingsJson`, `injectClaudeMd`/`extractBlock`, `CLEARGATE_START`/`CLEARGATE_END`, `injectMcpJson`) and the `HOOK_ADDITION` const block; added `defaultHostRegistry, type HostRegistry` and `type InstallCtx` imports. Added `hostRegistry?: HostRegistry` to `InitOptions` after `fromSource`. Added `const registry = opts.hostRegistry ?? defaultHostRegistry;` right after the `spawnSyncFn` seam, before Step 1. Replaced the `:461-557` Steps 4/5/5b block with the M2-A1 adapter loop (`.mcp.json` pre-capture hoisted, not moved; `adapters = [registry.resolve('claude')]`; `installCtx` built from `ctx`; `for (const adapter of adapters) await adapter.install(installCtx)`; post-capture) — inside the existing Steps-3–7 `try`, no re-indentation, no `exit()` added inside it (M2-A2). Updated the header step-list comment (`4. mergeSettings` / `5. injectClaudeMd` → `4–5b. host adapter surgery`).
- **Unchanged, verified via `git diff main -- <path>` (empty for all):** `src/init/inject-claude-md.ts`, `src/init/merge-settings.ts`, `src/init/inject-mcp-json.ts`, `src/lib/claude-md-surgery.ts`, `src/lib/settings-json-surgery.ts`, `src/commands/uninstall.ts`, `src/commands/upgrade.ts`, `src/init/copy-payload.ts`.
- No `scaffold/**` touched (`git diff main..HEAD --stat -- scaffold` empty) — no D1 twin, no live re-sync needed.

## Test commands and counts

All run solo from `cleargate-cli/`.

| Command | Result |
|---|---|
| `npm run typecheck` | exit 0, no output |
| `npm run test:file -- test/hosts/host-adapter-contract.red.node.test.ts` | 19 tests / 19 pass / 0 fail |
| `CLEARGATE_INIT_BASELINE=/private/tmp/cg-s41-m2-init-baseline npm run test:file -- test/hosts/claude-adapter-init-parity.red.integration.node.test.ts` (compare mode) | 5 tests / 5 pass / 0 fail |
| `npm run test:file -- test/commands/init.node.test.ts` | 29/29 pass |
| `npm run test:file -- test/commands/init-from-source.node.test.ts` | 14/14 pass |
| `npm run test:file -- test/commands/init-gitignore-expansion.node.test.ts` | 5/5 pass |
| `npm run test:file -- test/commands/init-participant.node.test.ts` | 3/3 pass |
| `npm run test:file -- test/commands/init-root-gitignore.node.test.ts` | 9/9 pass |
| `npm run test:file -- test/init/claude-md-block-leads.red.node.test.ts` | 15/15 pass |
| `npm run test:file -- test/init/inject-mcp-json.node.test.ts` | 12/12 pass |
| `npm run test:file -- test/init/init-test-stack-detect.red.node.test.ts` | 14/14 pass |
| `npm run test:file -- test/lib/claude-md-surgery.node.test.ts` | 10/10 pass |
| `npm run test:file -- test/lib/settings-json-surgery.node.test.ts` | 13/13 pass |
| `npm run test:file -- test/commands/uninstall.node.test.ts` | 20/20 pass |
| `npm run test:file -- test/commands/upgrade-claude-md.red.node.test.ts` | 4/4 pass |
| `npm run test:file -- test/commands/upgrade-preserves-gate-commands.node.test.ts` | 4/4 pass |
| `npm run test:file -- test/integration/foreign-repo.integration.node.test.ts` | 6 tests / 4 pass / **2 fail** — pre-existing at red commit `11fe514` (verified by `git stash` + re-run: identical failing test names/assertions with `src/hosts/` absent), unrelated to the refactor |
| `npm run test:file -- test/e2e/dogfood-install.integration.node.test.ts` | 1 test / **1 fail** — pre-existing at red commit `11fe514` (verified by `git stash` + re-run: identical assertion failure), unrelated to the refactor |
| `npm run test:file -- test/commands/init-from-source-dist.integration.node.test.ts` (M2-A7, run after commit per D8) | 1/1 pass |
| (outer) `npm run check:no-vitest --prefix cleargate-cli` | "no vitest residue" |
| (outer) `npm run --silent check:no-inline-id-regex --prefix cleargate-cli` | "no inline work-item-id regexes" |
| `npm test` (full default suite, once, after commit) | **2829 tests, 2827 pass, 0 fail, 2 skipped** — matches the expected `2810 + 19 = 2829` exactly |

## Baseline integrity

`/private/tmp/cg-s41-m2-init-baseline`: 425 files before and after, sha256-of-sorted-listing unchanged at `bdc4bb1a6be55f938dd87ce1a281231972bec12c7a850009fcbec8cf354a62b2` (matches QA-Red's recorded value). Never recaptured, never written to.

## Empty-grep evidence

```
$ command grep -nE '\b(mergeSettings|injectClaudeMd|extractBlock|injectMcpJson)\(' src/commands/init.ts
(no output, exit 1)
```
No inline Step 4/5/5b surgery survives in `init.ts`; every call now routes through the resolved adapter.

## Full-suite counts

`npm test` (cli default suite, run once after committing): **2829 tests / 2827 pass / 0 fail / 2 skipped**, duration ~7.5 min. Matches sprint-context's V7 baseline (2810) plus this story's 19 new unit tests.

This run wrote back-sync noise into the OUTER main checkout (rule 14): `git status --short .cleargate/delivery` shows 29 modified `pending-sync/*.md` files (stamp/timestamp churn from the test harness's own item-file fixtures). `cleargate-planning/MANIFEST.json` was **not** touched (M2-A12: nothing regenerates it post STORY-058-01). Per instruction, left as-is for the orchestrator to handle — not reverted.

## Plan deviations

None. The implementation follows M2-A1..A8/M2-A14/A15 and the TPV's D1–D8 mechanically; every anchor (`init.ts:35-71`, `:73-143`, `:228-232`, `:461-557`) matched the plan's V4 table exactly on the actual `story/STORY-058-03` tree.

One dispatch-level note, not a plan deviation: the dispatch's "Where" section says "cli-only: edit nothing in the outer repo except your report." The story file's `## Task Breakdown` checkboxes therefore remain unticked by this dispatch — ticking them would require editing `.cleargate/delivery/pending-sync/STORY-058-03_hostadapter_contract_and_registry.md` in the outer repo, which this dispatch explicitly forbids. Flagging for the orchestrator to tick (or explicitly waive) at the boundary step.

## Script Incidents

None. Every command was `npm run typecheck` / `npm run test:file` / `npm test` inside the cli checkout, or the two outer `npm run check:*` scripts — no `.cleargate/scripts/run_script.sh`-wrapped script was invoked, per the dispatch's "Where" instructions.

STORY: STORY-058-03
STATUS: done
COMMIT: 0fb61b145b311a5721d2381105f5a8a7b04c3ff5
TYPECHECK: pass
TESTS: 2827 passed, 0 failed, 2 skipped (full default suite); story-scoped: 19/19 unit + 5/5 parity + all regression witnesses green except two pre-existing integration failures verified identical at the red commit
FILES_CHANGED: cleargate-cli/src/hosts/types.ts (new), cleargate-cli/src/hosts/registry.ts (new), cleargate-cli/src/hosts/claude.ts (new), cleargate-cli/src/commands/init.ts (modified)
NOTES: Mechanical move per the TPV's pre-simulated implementation and D1-D8; no deviations from the plan. The two integration-witness failures (foreign-repo.integration, dogfood-install.integration) are pre-existing at the red commit (11fe514), confirmed via git stash + re-run producing identical failing test names/assertions with src/hosts/ absent — not caused by this refactor. Full npm test back-synced 29 pending-sync item files into the outer main checkout (rule 14 noise); left unreverted per instruction for the orchestrator.

r_coverage:
  - { r_id: "R1", covered: true, deferred: false, clarified: false }
  - { r_id: "R2", covered: true, deferred: false, clarified: false }
  - { r_id: "R3", covered: true, deferred: false, clarified: false }
  - { r_id: "R4", covered: true, deferred: false, clarified: false }

plan_deviations: []

adjacent_files:
  - "cleargate-cli/test/init/claude-md-block-leads.red.node.test.ts"
  - "cleargate-cli/test/integration/foreign-repo.integration.node.test.ts"
  - "cleargate-cli/test/scripts/scaffold-relocation.red.integration.node.test.ts"
  - "cleargate-cli/test/scripts/scaffold-standalone.red.integration.node.test.ts"
  - "cleargate-cli/test/commands/upgrade-payload-root.node.test.ts"
  - "cleargate-cli/test/e2e/dogfood-install.integration.node.test.ts"

flashcards_flagged: []

STATUS=done
