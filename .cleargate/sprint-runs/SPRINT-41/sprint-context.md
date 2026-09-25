---
sprint_id: "SPRINT-41"
created_at: "2026-09-04T12:08:02.222Z"
last_updated: "2026-09-24T23:34:00Z"
---

# Sprint Context

Per-sprint audit artefact. Populated at sprint init (M1 planning) and re-touched after each story merges. Referenced from every Developer/QA/Architect task brief so all agents start from the same baseline.

## Sprint Goal

Make the frontmatter locator position-independent so freshly scaffolded work items stop corrupting and start gating, and land the first slice of multi-host adapter support with Claude Code proven intact by clean-room verification.

## Goal Acceptance Check

In a clean-room install created per `.cleargate/knowledge/clean-room-verification.md`, all five hold:

1. `cleargate new epic <slug>` followed by one PostToolUse stamp-and-gate cycle leaves the item with a single frontmatter block and a passing gate — `gate-check.log` records `stamp=0 gate=0`, not today's `stamp=0 gate=1`.
2. `cleargate init` with no host flag reproduces the recorded Claude baseline (SessionStart banner, PreToolUse and PostToolUse hooks firing, agents and skills discoverable, `cleargate doctor` exit 0).
3. `cleargate init --host all` reproduces that same Claude baseline unchanged, and `.claude/settings.json` carries no Codex-owned hook entries.
4. `cleargate init --host codex` produces an install whose hooks fire in a real Codex CLI session.

5. A real story completes four role dispatches plus a DevOps merge under the pinned standalone Codex, with required hook firing, actual edit/dispatch denials under negative controls, and positive controls. Both loop transport and enforcement parity pass; missing required enforcement is not waived by disclosure. Token metering is either verified or explicitly unavailable.

Condition 1 is [[BUG-067]]. Conditions 2–3 are [[STORY-058-09]]. Condition 4 is [[STORY-058-10]] and [[STORY-058-11]]. Condition 5 is [[STORY-058-12]] and [[STORY-058-13]]. Disk checks are automated; live host behavior requires recorded session evidence.

## Locked Versions

Frozen dependency versions for this sprint. Orchestrator populates from `package.json` snapshots at sprint init; Developers must not upgrade these mid-sprint without an explicit CR.

| Package | Version |
|---------|---------|
| Node    | `>=24.0.0` |
| TypeScript | `^5.8.0` |
| (add rows per workspace below) |  |

## Test Stack

Repo-derived test conventions. Written best-effort by `cleargate init` (detector); the
orchestrator may correct any field per-sprint. Agents read this block as OVERRIDING their
built-in defaults — Developer/QA/Architect use these values, not any hardcoded runner.

| Field | Value |
|-------|-------|
| Backend runner    | `cleargate-cli`: `npm test` (node:test via tsx); single file `npm run test:file -- <path>`; shell suites `bash <file>.sh` |
| Frontend runner   | — (single-stack) |
| Typecheck command | `cleargate-cli`: `npm run typecheck` |
| Red-test naming   | `*.red.node.test.ts`; integration layer `*.red.integration.node.test.ts`; shell `*.red.sh` |

_If unresolved at init: leave the table stubbed. The pre-gate scan emits a one-line
"test_stack unresolved — populate sprint_context.md §Test Stack" advisory and treats the
typecheck/test gate as advisory (not FAIL) until populated. (§0.5 backstop decision.)_

## Cross-Cutting Rules

Sprint-wide architecture rules and UI/API tokens that every story must honour. Populated from the parent Epic's `<architecture_rules>` block.

From [[EPIC-058]] `<architecture_rules>` plus the SPRINT-41 execution rulings (R1–R4, 2026-09-24):

1. Production implementation and npm payload sources live in the standalone `cleargate-cli` repo; the outer meta-repo and `cleargate-planning/` must not become build-time dependencies.
2. `cleargate init` with no host flag stays byte-compatible Claude installation behavior. Claude Code is the regression baseline: any Claude-observable change is a release blocker.
3. `--host claude|copilot|codex` are additive selectors; `portable` = copilot+codex, `all` = all three; repeated/comma values normalize to a de-duplicated set; installing a host never removes or rewrites another host's owned files.
4. One shared `.cleargate/**` surface serves every host; only instructions, agents, skills, hooks, permissions and host MCP config vary.
5. Host hook files are thin adapters into normalized `cleargate hook` CLI handlers — never reimplement gates, ingest, attribution or ledger policy per host.
6. Token usage is recorded only from verifiable host telemetry; unavailable usage is explicit, never synthesized as zero.
7. Upgrade/doctor/uninstall operate per installed-host ownership in the install manifest, preserving user-authored files.
8. No install/upgrade/doctor/uninstall change is Done without a clean-room install from the packed artifact (`.cleargate/knowledge/clean-room-verification.md` once STORY-058-08 lands).
9. **Execution (R1):** `cleargate-cli/**` work happens on branch `story/<ID>` in the cli main checkout (`/Users/ssuladze/Documents/Dev/ClearGate/cleargate-cli`), never a worktree; one item in flight. Merges go to cli `main` locally — no push, no publish.
10. **Execution (R2)** — *canonical path superseded after STORY-058-01: canonical is `cleargate-cli/scaffold/{core,hosts/claude}/**`, edited on the cli branch; see Mid-Sprint Amendment 2026-09-25T09:50Z.* Outer tracked edits (`.cleargate/**`, `cleargate-planning/**`, `CLAUDE.md`) happen in outer worktree `.worktrees/<ID>` on `story/<ID>` cut from `sprint/S-41`. Edit canonical `cleargate-planning/.claude/**`, never the live gitignored `/.claude/**`; live re-sync happens only at boundary steps.
11. **`dist` is live enforcement.** Live gate hooks run `cleargate-cli/dist/cli.js`. Build `dist` only from cli `main` after a merge (boundary BD). If you build on a story branch for e2e, say so in your report so the orchestrator rebuilds from `main`.
12. `cleargate-cli` has no pre-commit hook: run `npm run typecheck` and the affected tests yourself before every cli commit. The outer repo's pre-commit (surface gate + checks) does run — never `--no-verify` in either repo.
14. **Full `npm test` in `cleargate-cli` writes into the outer MAIN checkout** (`../.cleargate/delivery/**` back-sync and `../cleargate-planning/MANIFEST.json`). Cli main baseline 2026-09-24 at 3364802: 2683 tests, 2680 pass, 0 fail, 3 skipped, ~6.5 min. After any full run, revert with `git -C /Users/ssuladze/Documents/Dev/ClearGate checkout -- .cleargate/delivery cleargate-planning/MANIFEST.json`, but first make sure you have no intended uncommitted edits there. Any failure against this baseline is a regression until proven otherwise.
15. **Two-repo verification order.** Some cli tests hardcode `META_ROOT = <cli>/..` (e.g. `test/commands/init.node.test.ts:131`) and so read the outer MAIN checkout (`sprint/S-41`), never the item's worktree. Developer and QA-Verify therefore run targeted tests with `CLEARGATE_META_ROOT=<outer worktree>` where the test supports it, and treat a failing full-suite test that reads the main checkout's unmerged canonical as expected only if they name it and show why. DevOps then merges **outer half → `sprint/S-41` first, cli half → cli `main` second, in one turn**, runs the full cli suite once (it must match the baseline), then rebuilds `dist` from cli `main` (BD). A red post-merge suite halts DevOps.
16. **Pre-merge doc/template coverage.** When an item edits outer canonical docs, templates, knowledge or agents, the Developer and QA-Verify must also run EVERY cli test that honours `CLEARGATE_META_ROOT` (`command grep -rl CLEARGATE_META_ROOT cleargate-cli/test`) with `CLEARGATE_META_ROOT=<outer worktree>` — not just the item's own reds. Two post-merge regressions (BUG-089 pin-placeholder, CR-123 Brief anchor) were invisible pre-merge only because nobody pointed those tests at the worktree. Never set the override for the full suite (flashcard 2026-08-27).
17. **Surface gate (outer pre-commit) policy.** `file_surface_diff.sh` picks the "active" story as the first STORY in `In Progress/Ready/In Review`, else the most recently updated item, matches §3.1 by exact string, and whitelists only ledgers/state/hook logs. Story-branch commits in `.worktrees/STORY-*` must pass it honestly: every outer path the story commits (its reports, its item file, `.cleargate/wiki/log.md`) is a literal §3.1 row. Orchestrator and DevOps chore/merge commits on `sprint/S-41` (sprint plan, FLASHCARD, events, other items' reports, merge-conflict commits) may set `SKIP_SURFACE_GATE=1` — standing bypass logged once in sprint §4. Never bypass on a story branch.
18. **Never run a bare `cleargate` for gate/stamp work.** `cleargate` on PATH is the global npm install (0.26.1), which lacks everything this sprint adds (e.g. `spidr-coverage`, `hook signal`); a bare `cleargate gate check` on a story/CR/bug now caches `predicate error` / `pass: false` into the item (it happened once, 2026-09-25, repaired). Use `node /Users/ssuladze/Documents/Dev/ClearGate/cleargate-cli/dist/cli.js <cmd>` — the same binary the live hooks run.
13. Prior Codex-session work for some items exists in `/Users/ssuladze/Documents/Dev/CG_TEST/sprint-41-D2QMC1/` and is fetched as refs `refs/cgtest/<ID>` (cli) / `refs/cgtest/<ID>-outer` (outer). It is a starting point, not evidence: re-verify everything in this repo.

## Active FLASHCARD Tags

FLASHCARD tags that appear in any story's `<agent_context>` for this sprint. Auto-populated by grepping `.cleargate/FLASHCARD.md` at sprint init. Agents: grep the flashcard file for each tag listed here before starting work.

- `#tag1` — one-line summary of the most recent card
- `#tag2` — one-line summary

## Adjacent Implementations (Reuse First)

Exported helpers and modules from already-merged stories in this sprint. The Architect updates this section after each story merges. Developers check here before writing new helpers — if the module already exists, import it; duplication is a kick-back criterion.

| Story | Module / Export | Path |
|-------|----------------|------|
| BUG-089 | `resolveHookSignal({ host, decision })` → `HookSignal` (host-correct block/allow exit + stream); `cleargate hook signal <block\|allow> --host <h>` (`hookSignalHandler`) | `cleargate-cli/src/hooks/hook-signal.ts`, `cleargate-cli/src/commands/hook.ts` |
| BUG-067 | `locateFrontmatter(raw)` → `FrontmatterSpan \| null`; `replaceFrontmatter(raw, span, block)` — position-independent fence locator (finds fences behind `<instructions>`); never re-sniff offset 0 | `cleargate-cli/src/lib/frontmatter-locator.ts` |
| CR-123 | `spidr-coverage` predicate (`evalSpidrCoverage`, internal) + `computeGenericFenceMask(lines)` (internal; code-fence-aware line mask) | `cleargate-cli/src/lib/readiness-predicates.ts` |
| STORY-058-01 | `composePayload(roots, dst)` (flat, collision-rejecting, creates `REQUIRED_EMPTY_DIRS` on every call), `EXCLUDE_DIRS`, `EXCLUDE_FILES`, `REQUIRED_EMPTY_DIRS` | `cleargate-cli/src/lib/scaffold-layout.mjs` (+ `.d.mts`) |
| STORY-058-02 | `REQUIRED_ITEMS` (exported `ReadonlyArray<{path; type: 'dir'\|'file'}>`, core/host layout); `enumerateScaffoldRoots(scaffoldRoot)` → `{name, key, kind, dir}[]` (core first, hosts sorted, a symlinked host throws); `composePayload(roots, dst, { ensureRequiredEmptyDirs = true })` (descriptive symlink and dir/file collision errors); `buildManifest({ scaffoldRoot })` → `{ perRoot, compat, unclassified }` (a per-root `MANIFEST.json` in each split root, compat at `templates/cleargate-planning/MANIFEST.json`; read M2-A13 FU-1 before classifying a non-Claude path); `resolveCliPackageRoot(startDir)` (structural cli-root walk, retired by -06); prebuild split view `templates/scaffold/{core,hosts/<h>}/` (gitignored, packed); test helpers `CLI_ROOT`, `SCAFFOLD_ROOT`, `canonicalPath(rel)`, `await composeCanonicalPayload(dst)` (flat core+claude plus `MANIFEST.json`) | `cleargate-cli/src/lib/scaffold-source.ts`, `cleargate-cli/src/lib/scaffold-layout.mjs` (+ `.d.mts`), `cleargate-cli/scripts/build-manifest.ts`, `cleargate-cli/scripts/copy-planning-payload.mjs`, `cleargate-cli/src/commands/init.ts`, `cleargate-cli/test/helpers/scaffold-roots.ts` |
| STORY-058-03 | `HostAdapter`/`InstallCtx`/`RemoveCtx`/`HostName` (InstallCtx sinks raw — callee writes `\n`; RemoveCtx sinks are line sinks); `createHostRegistry`, `defaultHostRegistry`, `UnknownHostError`, `pathUnderRoots`; `createClaudeAdapter(deps?)`, `claudeAdapter` (plain object, not frozen), `CLAUDE_HOOK_ADDITION`; `InitOptions.hostRegistry` | `cleargate-cli/src/hosts/{types,registry,claude}.ts` |
| STORY-058-03 (test) | `runInitScenario`, `INIT_SCENARIOS`, `captureOrCompare` (frozen clock/pin, probe stub; raw sha256), `seedUserContentFixture`; parity baseline `/private/tmp/cg-s41-m2-init-baseline` (compare-only, keep until M3 closes) | `cleargate-cli/test/helpers/init-fixture.ts` |

## Mid-Sprint Amendments

_(populated by Architect on CR:scope-change or CR:approach-change; never rewrite, only append. Format: '<ISO-ts> · <ID> · <one-line note>')_

- 2026-09-11T22:19:09Z · CR:scope-change · Owner “continue please” approves BUG-085, STORY-058-12, STORY-058-13, and BUG-089 for append-only roster registration; preserve the original 12 entries and event prefix.
- 2026-09-11T22:19:09Z · BUG-089 / BUG-085 · M0 shared Claude block-signal repair → backed-up targeted live re-sync → new Claude session with denials and dispatch-identity proof → BUG-067. BUG-085 durable detect-and-warn remains M3 after canonical relocation; meta-repo only, no silent auto-overwrite. Architect review still required.
- 2026-09-11T22:19:09Z · STORY-058-12 / STORY-058-13 · M6 after M5; common verdict schema, serial synchronous halt, two skill files. Primary evidence uses pinned standalone Codex 0.154.0-alpha.6.2 with recorded artifact SHA-256 and human trust of exact hooks; embedded same-version smoke is secondary. Transport and enforcement must both pass; metering may be unavailable.
- 2026-09-11T22:19:09Z · STORY-058-10 · AGENTS.md with host-correct content, live Agent-matcher proof with no hook-ordering assumption; command rules deferred under EPIC-058. No missing mandatory gate may silently pass the final Codex evidence.
- 2026-09-11T22:19:09Z · Execution route · Current Codex task has no Workflow tool; installed sprint-execution §2/§C.0 requires a halt. This amendment approves planning scope, not a dispatch bypass. Continue implementation on a Workflow-capable host or obtain an explicit bootstrap exception.
- 2026-09-11T23:30:09Z · CR:approach-change · Owner directs autonomous decisions and delivery tested in new Dev/CG_TEST. The bounded exception and clean isolated baseline are approved as recorded in bootstrap-decision.md; this supersedes the prior execution-route halt and serial-only target. Build and qualify a distributable Codex wave executor with native roles before drained-wave cutover; keep normal gates, truthful evidence, Claude compatibility, and separate installed-host acceptance.
- 2026-09-24T21:53:44Z · CR-123 · CR:scope-change — owner directs CR-123 (SPIDR scenario coverage) into the sprint and a re-plan; one append-only genesis event, 16 existing records preserved. Off critical path; not M0. Seeded order: after M0, before STORY-058-01 (which copies the templates CR-123 edits into scaffold/core). Architect SDR confirms.
- 2026-09-24T22:30:23Z · CR:approach-change · Owner rulings after the SDR halt (BUG-046 reachability): cli items run on story branches in the cleargate-cli main checkout, orchestrated serially by hand without /workflows (extends the 09-11 bootstrap exception); local-only cli merges; dist rebuild and live .claude/ re-sync at boundaries. BUG-085's M0 step uses this repo's real live .claude/ with backup + restart + denial proof. All .cleargate/ changes committed to main. Full SDR output: plans/sdr-halt-2026-09-24.md.
- 2026-09-24T23:34:00Z · Plan confirmed · Owner goal directive 2026-09-25 (local) confirms the SDR v2 plan and authorises kickoff with autonomous in-sprint decisions. end_date → 2026-10-09. BUG-067/BUG-085 demoted fast→standard (D2).
- 2026-09-25T09:50:00Z · STORY-058-01 merged (outer `9837329c`, cli `464e1e4b`) · **Rule 10 reworded:** the canonical scaffold source is now `cleargate-cli/scaffold/core/**` (the harness-neutral `.cleargate/**` plus payload `.gitignore`) and `cleargate-cli/scaffold/hosts/claude/**` (`.claude/**` plus the CLAUDE.md block source). Both are edited on the cli story branch (R1, rule 9), never under `cleargate-planning/**`, which is now a deprecated frozen snapshot (`cleargate-planning/DEPRECATED.md`, freeze `e911c38e`) that nobody edits. A canonical `.cleargate/{templates,knowledge,scripts}` edit is a cli `scaffold/core` edit plus the outer live-mirror edit in the same item (the D1 twin rule spans both repos). Outer worktrees still carry the tracked outer edits (live `.cleargate/**` mirrors, `CLAUDE.md`, delivery items). Rule 14's MANIFEST revert is now a no-op: nothing regenerates `cleargate-planning/MANIFEST.json`. Re-sync of the live instance uses `node cleargate-cli/dist/cli.js init` after BD, never a bare `cleargate init` (rule 18).
- 2026-09-25T10:25:00Z · STORY-058-03/-04 (M2 plan) · **Rule 3 applied through the host registry:** the accepted `--host` values are the registered hosts plus `portable`/`all`. `all` means every registered host; `portable` means every registered host except claude. Copilot is deferred out of SPRINT-41 (sprint plan §1), so at close `all` = {claude, codex}, `portable` = {codex}, and `--host copilot` is rejected as unknown (exit 2, before any write) until the Copilot adapter lands. Goal check 3 ("no Codex-owned hook entries") is witnessed by the RS-4 re-run of -09 after -10/-11 register codex, not by wave 13. Sealed tests never pin the production registry's exact membership.
- 2026-09-25T15:05:00Z · M3 plan · Shared portable assets live in scaffold/core under an adapter-declared sharedRoot (owner core), gated by payloadFilter + the -06 snapshot filter + -07 selectEntriesForHosts; supersedes M2-A10's "never scaffold/core" for declared paths (flashcard P2 reworded). Rule-2 parity for M3 runs through SANCTIONED_BASELINE_DELTAS (hash-anchored on both sides); the M2 baseline /private/tmp/cg-s41-m2-init-baseline is kept until M3 closes.
