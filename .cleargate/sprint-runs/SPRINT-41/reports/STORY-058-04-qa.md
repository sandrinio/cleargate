# STORY-058-04 — QA-Verify

role: qa

QA: PASS

Subject: cli repo `cleargate-cli`, branch `story/STORY-058-04`, Dev commit `128bad6`
(parent `4785032`, sealed re-seal, on cli `main` `55f5d95`). Read-only verification;
no build, no stash/checkout, no writes into `src/`/`test/`, no bare `cleargate`, no
full `npm test`.

## 1. Sealed-test integrity

| Check | Result |
|---|---|
| `git diff 4785032 128bad6 --stat -- test/` | **empty** — no test file touched |
| `test/helpers/init-fixture.ts` | untouched (not in the diff) |
| Full Dev diff `--name-only` | exactly `src/cli.ts`, `src/commands/init.ts`, `src/hosts/registry.ts`, `src/init/copy-payload.ts` — matches the dispatch's expected set exactly |

## 2. Typecheck

`npm run typecheck` → `tsc --noEmit`, **exit 0**, no output.

## 3. Solo re-runs (one file per command)

| File | Tests | Result | Required |
|---|---|---|---|
| `test/hosts/host-selection.red.node.test.ts` | 11 | **11/11 pass** | 11/11 |
| `test/commands/init-host-selection.red.node.test.ts` | 10 | **10/10 pass** | 10/10 |
| `test/commands/init-host-cli.red.integration.node.test.ts` | 4 | **4/4 pass** | 4/4 |
| `test/hosts/host-adapter-contract.red.node.test.ts` (-03) | 19 | **19/19 pass** | 19/19 |
| `test/commands/init-host-parity.red.integration.node.test.ts` (compare, `CLEARGATE_INIT_BASELINE=/private/tmp/cg-s41-m2-init-baseline`) | 15 | **15/15 pass** | 15/15 |
| `test/hosts/claude-adapter-init-parity.red.integration.node.test.ts` (-03, compare) | 5 | **5/5 pass** | 5/5 |

All six files reproduce the Dev/TPV counts exactly. `CLEARGATE_INIT_BASELINE` directory
exists at the pinned path (never a capture flag used).

### Regression witnesses (3 spot-checked, solo)

| File | Tests | Result | Matches Dev report |
|---|---|---|---|
| `test/commands/init.node.test.ts` | 29 | **29/29 pass** | yes |
| `test/commands/uninstall.node.test.ts` | 20 | **20/20 pass** | yes |
| `test/commands/upgrade.node.test.ts` | 14 | **14/14 pass** | yes |

No `npm test` full-suite run performed (rule 14; DevOps owns that at merge).

## 4. Static checks (TPV "QA-Verify additions")

| Check | Result |
|---|---|
| `command grep -nE "^export (const (HOST_PROFILES\|DEFAULT_HOSTS)\|class HostSelectionError\|function (collectHostOption\|normalizeHostSelectors\|payloadFilter))" src/hosts/registry.ts` | 6 lines: `HOST_PROFILES` (`:43`), `DEFAULT_HOSTS` (`:47`), `HostSelectionError` (`:50`), `collectHostOption` (`:65`), `normalizeHostSelectors` (`:82`), `payloadFilter` (`:139`) — matches |
| `command grep -nE '\b(mergeSettings\|injectClaudeMd\|extractBlock\|injectMcpJson)\(' src/commands/init.ts` | **no output** — matches |
| `git diff main -- src/init/copy-payload.ts` | shows only the additive `include?` field on `CopyPayloadOptions` plus the second `.filter((r) => (opts.include ? opts.include(r) : true))` — matches |

## 5. D1–D8 conformance (read from `git diff 4785032 128bad6`)

| # | Constraint | Verified |
|---|---|---|
| D1 | Step 0 sits between `const registry = opts.hostRegistry ?? defaultHostRegistry;` and `// Step 1: Validate cwd`, outside the Steps 3–7 `try`. Body is exactly `stderr(...); exit(2); return;`; a non-`HostSelectionError` is rethrown. | **yes**, verbatim |
| D2 | `include` applied as a second `.filter` on the file list at `copy-payload.ts:131`-area, chained after the `SKIP_FILES` filter, before the copy loop (never after `mkdirSync`). | **yes** |
| D3 | `payloadFilter` uses `pathUnderRoots(roots, relPath)` for both the owned-root and shared-root checks — no bare `startsWith`. | **yes** |
| D4 | `all` = `names`; `portable` = `names.filter(n => n !== 'claude')`, computed from `registry.names()` inside the function body at call time. | **yes** |
| D5 | Accumulates into `const wanted = new Set<HostName>();`, returns `names.filter((n) => wanted.has(n));`. | **yes** |
| D6 | `const frozenOrder: readonly HostName[] = Object.freeze([...order]);` serves both `names: () => frozenOrder` and `throw new UnknownHostError(name, frozenOrder)`. `src/hosts/claude.ts` is untouched by this diff (`git diff main -- src/hosts/claude.ts` empty) — `claudeAdapter` stays unfrozen, consistent with the M2-A15 witness passing (`t.mock.method` needs a writable object). | **yes** |
| D7 | `.option('--host <value>', help, collectHostOption)` — not variadic (`<value>`, not `<value...>`); action passes `hosts: opts.host`. | **yes** |
| D8 | No new `stdout(...)` call added anywhere in the diff; both parity files (15/15, 5/5) assert byte-identical stdout and stay green. | **yes** |

## 6. Real-CLI smokes (tsx, per flashcard #34 recipe: spawn with `cwd=CLI_ROOT`, `chdir` to a fresh `mktemp -d` fixture inside `-e`, then import `src/cli.ts`)

| # | Command | Result |
|---|---|---|
| (a) | `init --help` | Lists `--host <value>` — `"host adapter(s) to install: claude, or profile portable\|all; repeatable and comma-separated (default: claude)"` — registry-derived |
| (b) | `init --yes --host cursor` | Exit **2**. stderr: `[cleargate init] ERROR: --host: unknown host "cursor". Valid hosts: claude. Profiles: portable, all.` Fixture dir empty after (`ls -la` shows only `.`/`..`) |
| (c) | `init --yes --host ""` | Exit **2**. stderr: `[cleargate init] ERROR: --host: empty host value in "". Valid hosts: claude. Profiles: portable, all.` |

Fixtures cleaned up (`rm -rf`) after each run.

## 7. Gherkin / requirement coverage map

| §2.1 Scenario | Test(s) | File |
|---|---|---|
| No flag preserves the Claude-only install | `Scenario 1 — default (no flag) resolves to claude`; `Scenario 8 — no flag installs only claude (Gherkin 1)` → `claude installs once, codex 0 times; no .codex/** or .agents/** land; .claude/** and CLAUDE.md present`; `M2-A15 — default (no-seam) init routes through the production claudeAdapter.install`; parity scenario 14 (15/15) + `claude-adapter-init-parity` (5/5) prove byte-identity | host-selection, init-host-selection, init-host-parity, claude-adapter-init-parity |
| Repeated and comma-separated flags normalize to one set | `Scenario 2 — repeated flags, comma-joined values and mixed case all collapse to registry order`; `Scenario 9 — hosts: ["claude","codex,claude"] installs claude and codex once each` | host-selection, init-host-selection |
| Profiles expand from the registry | `Scenario 3 — portable/all expand per-registry; portable on a claude-only registry throws; production "all" tracks names()`; `TPV M2-A18 — profiles follow the registry for a host no hard-coded list names` | host-selection |
| Unknown host is rejected | `Scenario 4 — "cursor" throws HostSelectionError naming cursor, every R3 name, portable and all`; `Scenario 12 — hosts: ["cursor"] -> ExitSignal(2), stderr names "cursor", fixture stays empty`; CLI `scenario 15` / `scenario 15b` | host-selection, init-host-selection, init-host-cli |
| Empty selector is rejected | `Scenario 5 — "", "claude,", and "  " all throw HostSelectionError`; `Scenario 12 — hosts: [""] -> ExitSignal(2)...`; CLI `scenario 16` | host-selection, init-host-selection, init-host-cli |

§1.2 requirements not already covered above:
- Repeatable `--host` option registered alongside `--force/--yes/--pin/--from-source` → D7, `--help` smoke (a).
- Profile expanding to no registered host is an error → `Scenario 3` (R1 `portable` throws).
- Resolved set computed once in `initHandler`, registry order → D1/D5, Step 0 `selected` binding reused by both `copyPayload`'s `include` and the adapter loop.
- `--host all` (§4.1 acceptance) installs every adapter's owned roots → `Scenario 11 — all 3 adapters in R3 install exactly once; every owned-root payload file lands`.
- Case/comma/dedupe equivalence (no baseline needed) → `Scenario 13`.

No gap found — every §2.1 scenario and every §1.2 requirement maps to at least one passing test. `MISSING: none`.

## 8. DoD §4 check

| Item | Status |
|---|---|
| §4.1 minimum test expectations (6 unit / 1 integration / 1 E2E) met | **yes** — 11 unit-level scenarios in `host-selection` alone (exceeds 6: default, repeated, comma, dedupe, profile expansion, unknown+empty), integration parity (15/15 + 5/5), E2E `--host all` (`Scenario 11`) |
| All §2.1 Gherkin scenarios covered | **yes** — see §7 map above |
| Peer/Architect Review passed | **pending, not a QA gate** — TPV round 1 (test-plan review) was REJECTED-then-re-sealed (E1–E8); QA independently reproduced the TPV's exact "Expected counts after re-seal" table (11/11 · 10/10 · 4/4 · 15/15), so the test-plan review's own re-verification condition ("if the orchestrator reproduces the red-commit counts, Dev proceeds without a second TPV") is satisfied. A code-level Architect post-flight (`STORY-058-04-arch.md`) has not been dispatched yet as of this QA-Verify pass — this checkbox is for the orchestrator to close after that dispatch, not a QA finding |
| No-flag path proven byte-identical, not assumed | **yes** — `init-host-parity` (15/15) and `claude-adapter-init-parity` (5/5) both re-run in compare mode against `/private/tmp/cg-s41-m2-init-baseline`, plus the 3 spot-checked regression witnesses (init.node 29/29, uninstall 20/20, upgrade 14/14) stayed green |

## Script Incidents

None. Every command was `npm run typecheck`, `npm run test:file -- <file>`, `git diff`,
`command grep`, plain `ls`/`mktemp -d`/`rm -rf`, and direct `node --import tsx/esm`
invocations of `src/cli.ts` per the flashcard recipe — none of these are wrapped
scripts under `.cleargate/scripts/`, so `run_script.sh` does not apply.

## VERDICT

Ship it. All four changed files (`src/cli.ts`, `src/commands/init.ts`,
`src/hosts/registry.ts`, `src/init/copy-payload.ts`) match the TPV's binding D1–D8
constraints exactly, byte-verified against the diff, not assumed from the Dev's
narrative. All six required test files reproduce their exact required counts solo
(11/11, 10/10, 4/4, 19/19, 15/15, 5/5), typecheck is clean, the three static greps
match, three spot-checked regression witnesses are green, and three independent
real-CLI smokes via tsx confirm `--help`, the unknown-host rejection, and the
empty-selector rejection all behave per the story's §3.3 API contract. No gap in
Gherkin/requirement coverage. The only open DoD item is the Architect's code-level
post-flight review, which is outside QA's gate and is the orchestrator's next step
in the pipeline, not a defect found here.

```
flashcards_flagged: []
```

STATUS=done
