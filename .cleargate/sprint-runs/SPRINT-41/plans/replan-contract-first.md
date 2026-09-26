# Milestone: SPRINT-41 remainder, re-planned contract-first (build, then integrate by DAG)
## Stories: STORY-058-10 (tail), BUG-096, BUG-097, BUG-090, BUG-098, CR-124, STORY-058-11, STORY-058-12, STORY-058-13
## Wave: contract-first DAG. Derived integration layers cf-L0..cf-L3; 4 build lanes, 1 serial merge lane, 1 harness lane

role: architect

This file is authoritative over `plans/M5.md`, `plans/M5-fixwave.md` and `plans/M6.md` on four things: execution topology, bases, integration order and merge order. Those plans stay authoritative for each item's blueprint, tests, loop depth and DevOps witnesses, except where an RP-A amendment below changes them. The orchestrator applies RP-A1..RP-A24; this plan edits nothing else.

**Sprint goal (unchanged, verbatim):** "Make the frontmatter locator position-independent so freshly scaffolded work items stop corrupting and start gating, and land the first slice of multi-host adapter support with Claude Code proven intact by clean-room verification."

**GOAL_RELATION:** advances. The re-plan does not change what ships; it shortens the path to it.
- BUG-090 and BUG-098 finish "stop corrupting / start gating".
- STORY-058-10, -11, -12 and -13 finish the Codex slice (Goal checks 4 and 5).
- RS-4, RS-5 and RS-CLOSE keep "Claude Code proven intact" (Goal checks 2 and 3).
- CR-124 is scope added by the owner. This re-plan is its dogfood.

Path legend:
- `OUTER` = `/Users/ssuladze/Documents/Dev/ClearGate`
- `CLI` = `OUTER/cleargate-cli`, the cli main checkout
- `<ow>` = `OUTER/.worktrees/<ID>`, an item's outer worktree
- `<cw>` = `OUTER/.worktrees/<ID>/cleargate-cli`, an item's cli worktree

---

## 0. Measured state (verified 2026-09-26, 17:05–17:40 +0400)

**Repos, read-only** (`git -C … log/show/diff/status`):

| Fact | Value |
|---|---|
| cli `main` | `35580b0` (merge of -09) |
| `story/STORY-058-10` | `d0f0d95`: pass A `560a4f1`, then pass B, committed 17:13. The pass-B report (outer `55ec1af8`) says **test 46 (scripted codex session C2–C6) is NOT green, so pass C follows**. |
| cli main checkout | on `story/STORY-058-10`, clean except the untracked `cleargate-0.25.0.tgz`. A foreign `test/e2e/codex-hooks.red.integration.node.test.ts` run was live there at 17:18; nothing here touched it. |
| outer HEAD | `55ec1af8` on `sprint/S-41` |
| outer and cli branches | no `story/*` branches exist for -11, -12, -13, BUG-09x or CR-124; no worktrees in either repo |

**What -10 does and does not touch** (`git diff 35580b0 d0f0d95`). -10 does NOT touch:
- any CR-124 file (the 7 rels in §7);
- BUG-097's four `src` files;
- BUG-090's five core files (`assert_story_files.mjs`, `close_sprint.mjs`, `epic.md`, `story.md`, `hotfix.md`) or `push.ts`;
- BUG-098's two scripts or any of its TS sites;
- `approveProbeStory`;
- the three `doctor.ts` sniff lines.

What -10 does touch:
- `test/helpers/init-fixture.ts`, but only at `:467` (the G16 function) and `:526+` (rows). BUG-096's `:55-85` region is untouched.
- The fix-wave entry-gate expectations (`plans/M5-fixwave.md` Order 1) therefore already hold at `d0f0d95`.

**Hashes.** At `35580b0` = `d0f0d95`, the canonical bytes equal the outer live twin and the live `.claude/` copy for every CR-124 file. The sha256 values are in the §7 row table.

**Gates and hooks:**
- The cli repo has **no git hooks** (`.git/hooks` has samples only, and no `core.hooksPath`).
- The outer pre-commit chain (`.claude/hooks/pre-commit.sh` → `pre-commit-surface-gate.sh`) runs:
  1. the red-gate on `story/STORY-*|CR-*|BUG-*` branches;
  2. `check:no-vitest` for every existing `mcp|cleargate-cli|admin` dir under the worktree root;
  3. `file_surface_diff.sh`.
- **There is no test ratchet in any pre-commit** (retired).
- `file_surface_diff.sh:122-160` picks the "active" item from the **main checkout's** `state.json` by maximum `updated_at`. It resolves only `STORY-*` ids to a file; a `BUG-*` or `CR-*` id resolves nothing and the check skips.

**Environment:**
- The Bash tool env carries no `CLAUDE_PROJECT_DIR`, no `ORCHESTRATOR_PROJECT_DIR` and no `CLEARGATE_*`.
- `run_script.sh:64-76` therefore falls back to `git rev-parse --show-toplevel`.

**Machine:**
- 10 CPUs, 32 GB, 52 GiB free (89% used). Node on PATH is 25.9 (engines `>=24`).
- `/private/tmp` holds 1,851 leaked `cg-s41-fix-*`/`cg-s41-payload-*` dirs.
- It also holds **160 `cg-s41-contract-payload-*` dirs, from a second leak source**: `test/hosts/host-adapter-contract.red.node.test.ts:91`. That file is outside BUG-096's scope.

**Probe log.** Scratch clone `/private/tmp/cg-s41-replan`: an outer clone at `sprint/S-41`, with a cli clone at `<outer>/cleargate-cli`. It was deleted at the end. The M2 baseline and `/private/tmp/cg-s41-fresh-journey` were never touched.

| # | Measured | Result |
|---|---|---|
| P1 | Outer worktree `.worktrees/PROBE` (detached) plus cli worktree nested at `.worktrees/PROBE/cleargate-cli` (`story/PROBE` from `d0f0d95`) | 1 s. The outer worktree shows `!! cleargate-cli/` (ignored by the root `/cleargate-cli/` rule). The cli main checkout status stays clean, because the worktree is outside it. |
| P2 | `node_modules` symlinked to the real `CLI/node_modules` (which holds `toml-eslint-parser`) | Solo, from `<cw>`: install-view 12/12; gate-section-index-pinning 14/14 (its `META_ROOT = CLI_ROOT/..` resolved to the outer worktree); codex-hooks-harness 67/67; codex-payload 14/14; codex-hook-scripts 18/18 (32 s); dogfood-split-integrity 4/4; autonomy-contract 30/30; wave-execution-barrier 23/23; parallel-dispatch 6/6; skill-md-consolidation-d5 18/18; devops-agent-registration 12/12; init-host-snapshot 13/13 |
| P3 | Worktree-only failures, and their fixes | `collision-surface-planning-workflow` went 5/15 → 15/15 and `run-id-ledger-attribution` went 4/10 → 10/10. Both read or execute live `<META_ROOT>/.claude/**`, which is gitignored and absent from an outer worktree; a `<ow>/.claude → OUTER/.claude` symlink fixes them. `readme-qa-doc-truth-043-06` went 15/18 → 18/18: it reads `<cw>/templates/cleargate-planning/**`, which `npm run prebuild` in the worktree fixes. `test_version_bump_alignment.integration` stays 1/3: it needs a sibling `mcp/`. That is the integration tier only, and it is a named failure. |
| P4 | The `.claude` symlink under git | It shows `??`, because the `/.claude/` rule matches directories only. Adding `/.claude` to `.git/info/exclude` turns it into `!!`. |
| P5 | `npm run prebuild` / `npm run build` inside `<cw>` | 1 s and 4 s. They write only `<cw>/templates/**` and `<cw>/dist/`. The outer, outer-worktree and cli-main statuses stay clean. |
| P6 | `npm ci --offline --ignore-scripts` in `<cw>` (lockfile copied; `package-lock.json` is gitignored in cli) | **Fails**: `ENOTCACHED toml-eslint-parser-1.0.3.tgz`. Rejected. |
| P7 | 3 test files at once across 2 worktrees (init-host-selection ×2, codex-hook-scripts) | All green; 39 s wall (codex-hook-scripts alone takes 32 s). +30 leaked fixture dirs (15 per init-host-selection run). No git status change anywhere. A foreign e2e was running at the same time. |
| P8 | Teardown | `git worktree remove` of the cli worktree first, then the outer: exit 0, no `--force`. Ignored `dist/`, `templates/` and the symlinks do not block removal, and the symlink targets survive. |
| P9 | `npm run check:no-vitest --prefix <cw>` (the outer pre-commit runs it once a nested `cleargate-cli/` exists) | 2 s, exit 0 |
| P10 | `git clone` of a linked-worktree path | With `--branch` and plain: both work. A plain clone checks out the worktree's own branch. |

---

## 1. Real-collision analysis

The rule, from CR-124: only three kinds of surface serialize — ordered journals, single-writer generated artifacts, and shared files whose edits must land in order. `parallel_eligible` and DB writes are hints. No remaining item has a DB axis, and every remaining item can **build** in parallel. The table below lists what forces **merge** order.

### 1.1 Written surfaces per item (cli unless marked)

| Item | Written files | Live-mirror pairs (outer, tracked) | Live `/.claude` (gitignored) |
|---|---|---|---|
| STORY-058-10 (pass C) | `scripts/clean-room/{codex-hooks,mock-responses,codex-appserver,artifact}.mjs` scripted-session internals only (pass-B report). Everything else is frozen at `d0f0d95` (§2 C1). | none | 4 hooks at RS-4a |
| BUG-096 | `test/helpers/init-fixture.ts` `:55-85`, plus a new `test/helpers/init-fixture-cleanup.red.node.test.ts` | none | none |
| BUG-097 | `src/commands/{gate,stamp,wiki-query,scaffold-lint}.ts`; appends to 4 existing test files | none | none |
| BUG-090 | `scaffold/core/.cleargate/scripts/{assert_story_files,close_sprint}.mjs`, `templates/{epic,story,hotfix}.md`, `scripts/clean-room/probe-items.mjs` (`approveProbeStory`), `src/commands/{push,doctor}.ts`, init-fixture (+5 rows), 5 new tests and 3 amended | the same 5 files, in **one** commit (ESM import pair) | none |
| BUG-098 | `src/lib/frontmatter-locator.ts` (+2 exports), `src/commands/{sprint,doctor,wiki-audit-status}.ts`, `src/lib/{lifecycle-reconcile,readiness-predicates,frontmatter-merge,slug,intake}.ts`, `src/lib/wiki/contradict.ts`, `scaffold/core/.cleargate/scripts/{prep_reporter_context,dedupe_frontmatter}.mjs`, init-fixture (+2 rows), tests | the 2 scripts in one commit. They import BUG-090's live export. | none |
| CR-124 | `scaffold/hosts/claude/.claude/agents/{architect,architect-synth,architect-reader}.md`, `…/skills/sprint-execution/SKILL.md`, `scaffold/core/.cleargate/knowledge/cleargate-enforcement.md`, `scaffold/core/.cleargate/scripts/launch_wave.mjs`, `scaffold/core/.cleargate/templates/Sprint Plan Template.md`, init-fixture (+7 rows, one of them shared), `CHANGELOG.md`, 3 new tests. **Only if -11 merged first:** regenerate `scaffold/hosts/codex/.codex/agents/architect{,-synth,-reader}.toml`. | `cleargate-enforcement.md`, `launch_wave.mjs`, `Sprint Plan Template.md` | 3 agents + SKILL.md at RS-CR |
| STORY-058-11 | `scripts/build-codex-payload.mjs`, `src/lib/manifest-builder.ts` `TIER_RULES`, 8 hooks + `lib/harness.sh` (+ generated codex copies), 11 generated `.codex/agents/*.toml`, `scaffold/core/.agents/skills/{flashcard,sprint-dashboard}/SKILL.md`, enforcement §16, `scripts/clean-room/{codex-hooks,evidence}.mjs`, init-fixture (4 hook rows, the shared enforcement row, the additions mechanism, the sentinel refusal), hook snapshots, `CHANGELOG.md`, tests | `cleargate-enforcement.md` | 9 hooks + lib at RS-4 |
| STORY-058-12 | `launch_wave.mjs` (header verdict-schema block + `validateVerdicts`), new `lib/flashcard-gate.mjs` and `dispatch_serial.mjs`, SKILL.md P1/P2, new `dispatch-serial.md`, protocol §23/§23.5, enforcement §17/§16 b10/index, init-fixture (protocol row + 3 additions), `src/hosts/{types,claude,codex,registry}.ts`, new `scripts/codex-sprint-execution.mjs`, `build-codex-payload.mjs`, generated `core/.agents/skills/sprint-execution/*`, clean-room codex-hooks/evidence, `CHANGELOG.md`, tests | `launch_wave.mjs`, `dispatch_serial.mjs`, `lib/flashcard-gate.mjs`, `cleargate-protocol.md`, `cleargate-enforcement.md` | SKILL.md + dispatch-serial.md at RS-5 |
| STORY-058-13 | `src/commands/verify-install.ts`, clean-room `{mock-responses,codex-appserver,probe-items}.mjs` + the new loop harness, `fixtures/codex-loop/`, `CHANGELOG.md`, tests | `codex-loop-evidence.md` (create), `clean-room-verification.md` (live-only, authored) | none |

### 1.2 Ordered artifacts and shared files: must-merge-order edges

| Surface | Items | Edge | Why it is real |
|---|---|---|---|
| `SANCTIONED_BASELINE_DELTAS` in `test/helpers/init-fixture.ts` | all cli items except BUG-097 | none by itself | Tail appends: an integration conflict keeps the upstream rows first, and resolution is mechanical. **One row per rel** (measured by code: `captureOrCompare` neutralizes the first matching row, so a second row's baseline assert fails). |
| the shared `cleargate-enforcement.md` row | -11, CR-124 (-12 reuses it) | first merger owns it | Both QA-Reds write the **byte-identical** block pinned in §7.5. The second merger deletes its identical duplicate (mechanical). |
| `SanctionedAddition` mechanism | -11 creates it; -12 uses it | -11 → -12 | -12 declares 3 additions |
| `cleargate-enforcement.md` (+ twin) | -11 (§16 append), CR-124 (`:103` wording), -12 (§17, §16 b10, index) | -11 → -12, CR-124 → -12 | -12 rewrites -11's bullet 10 and appends after §16. -11 and CR-124 touch disjoint regions, so there is no edge between them. |
| `sprint-execution/SKILL.md` | CR-124 (§A.4, the §C.0 intro paragraph, new §C.0.2), -12 (P1/P2 insertions; renderer anchors A1–A5) | CR-124 → -12 | -12's generated `core/.agents/skills/sprint-execution/SKILL.md` renders the canonical file, and its banned-token check covers text outside A1–A4 |
| `launch_wave.mjs` (+ twin) | CR-124 (new exports + `launchWave` body/JSDoc `:245-303` + `worktreeAddCommand` JSDoc), -12 (`:1-41` header block, `:129-224` validator) | CR-124 → -12 | Disjoint regions, but -12's twin copy and the shared rows need CR-124's bytes first |
| canonical agents → generated `.codex/agents/*.toml` | CR-124, -11 | none; second merger regenerates | `build-codex-payload.mjs --check` in prebuild fails BD on staleness |
| `build-codex-payload.mjs` `planCodexPayload` | -10 → -11 → -12 | chain | Ordered edits of one function |
| `scripts/clean-room/{codex-hooks,evidence}.mjs` | -10 (pass C) → -11 → -12 → -13 | chain | Each extends the verdict set and the scripted driver |
| `scripts/clean-room/probe-items.mjs` | -10 → BUG-090 → -13 | chain | `approveProbeStory` flip (FW-A10); -13 adds `authorLoopStory` |
| live `assert_story_files.mjs` ↔ `prep_reporter_context.mjs`/`dedupe_frontmatter.mjs` | BUG-090 → BUG-098 | BUG-090 → BUG-098, in **both repos** | The ESM static import fails at link time without BUG-090's export |
| `src/hosts/*` | -10 → -12 | chain | `dispatchMode` on `codexAdapter` |
| `src/commands/verify-install.ts` | -10 → -13 | chain | `HOST_VERIFIERS.codex` |
| `src/commands/doctor.ts` | -10 (`runCheckScaffold`), BUG-090 (`:738`, `:1022`), BUG-098 (`:257`, `:854`) | covered by BUG-090 → BUG-098 | Disjoint lines |
| `CHANGELOG.md` `## Unreleased` | every cli item | none | Mechanical: keep both entries |
| `templates/**` and `dist/` of `CLI` | BD only | serial by construction | Live hooks and `node cleargate-cli/dist/cli.js init` read them |
| live `/.claude/**` | RS-4a, RS-4, RS-CR, RS-5 | merge-lane order | `b0-live-resync.mjs` dry-run lists must be exact |
| `package.json` / deps | none remaining | — | No remaining item adds a dependency. That is also why no lockfile or `node_modules` collision exists. |

**Can build in parallel:** every pair, once its base exists (§3). **Must merge in order:** only the edges above.

**Upstream sets (integration edges):**
- -10: none
- BUG-096: none
- BUG-097: none
- CR-124: none
- BUG-090: -10
- -11: -10
- BUG-098: BUG-090
- -12: -10, -11, CR-124
- -13: -12, BUG-090

---

## 2. Contracts

A contract freezes exported names and types for downstream builds. Here every contract except C2 points at the **owner's real Developer commit**, which is stronger than a skeleton. This is the mediafi pattern: `contract/S-03-web` was the sprint branch plus an upstream story branch.

The Architect writes no code:
- C1, C3 and C4 are branch refs the orchestrator creates.
- C2 is two merge commits plus a regeneration commit, written by a DevOps dispatch.

| Id | Branch (cli) | Base | Owner | Created | Frozen (names and types) | Consumers |
|---|---|---|---|---|---|---|
| **C1** | `contract/S-41-codex` | `d0f0d95` | STORY-058-10 | **now**, by the orchestrator: `git -C CLI branch contract/S-41-codex d0f0d95` | the M5 "Orchestrator actions 4" row: `codexAdapter`, `createCodexAdapter`, `CODEX_HOOKS_JSON`, `CODEX_CONFIG_TOML`, `HostAdapter.preflight`, `rootLevelSurgeryTargets`, `openInstallView(opts): InstallView`, `InstallViewError`, `composePayload(…, { skipRootFiles })`, the inject-codex-config exports, `editTargets`/`applyPatchTargets` + `hook edit-targets`, `HOST_SIGNAL_MAP.codex`, `HOST_VERIFIERS.codex`, `CODEX_HOOK_SCRIPTS`, `planCodexPayload` (rel relative to `<cliRoot>/scaffold`), the harness **signatures** of M5-A36..A38, `stripInstructionsBlock`, `S3_PROMPT`, `plantAgentsMdCanary`, the three -10 init-fixture rows and the `BUG085_SENTINEL_POST` refusal, and **the bytes of the 4 canonical hooks** | STORY-058-11, BUG-090, C4, C2 |
| **C4** | `contract/S-41-fence` | `story/BUG-090` at its Developer commit (stacks on C1) | BUG-090 | when BUG-090's Developer report is green on its make-green set | `assert_story_files.mjs`: `locateFrontmatterFence(raw) → {start,end,yamlStart,yamlEnd,eol} \| null`, throwing the 3 pinned messages (M5-fixwave (a)); `assertWorkItemApproved(filePath)`; the 5 BUG-090 rows | BUG-098 |
| **C2** | `contract/S-41-dispatch` | C1, then `merge --no-ff story/STORY-058-11@<Dev>`, then `merge --no-ff story/CR-124@<Dev>` | STORY-058-11 + CR-124 | when both Developer reports are green. A DevOps dispatch writes it in `OUTER/.worktrees/contract-S-41-dispatch/cleargate-cli` (detached outer host). | -11: `PORTABLE_SKILLS`, `planCodexPayload` core entries, `TIER_RULES` rows, `cg_repo_root`, `SanctionedAddition`/`SANCTIONED_BASELINE_ADDITIONS` + addition-aware compare, `codex.live.roles`/`codex.live.skills`, §16 text. CR-124: `storyBases`, `integrationReady`, `launchWave({…, bases})`, SKILL.md §A.4/§C.0.2 with -12's anchors intact, the 7 rows. | STORY-058-12 |
| **C3** | `contract/S-41-loop` | `story/STORY-058-12` at its pass-B Developer commit (stacks on C2) | STORY-058-12 | when -12's pass-B report is green | `dispatch_serial.mjs` exports + CLI (AD-M6-4), `validateVerdicts(v, { mode })`, `CODEX_SKILL_BANNED`/`CODEX_SKILL_REPLACEMENTS`/`renderCodexSprintExecution`, `DispatchMode`, `HostAdapter.dispatchMode`, `SERIAL_DISPATCH_SURFACE` | STORY-058-13 |

**What C1 does not freeze.** C1 does **not** freeze -10's scripted-session internals (`driveScriptedTurn`/`runTurn`, the mock Responses item shapes): pass C owns them.

**Change rule, for every contract:**
1. If an owner's later commit (a QA or post-flight bounce, or -10's pass C) changes a frozen name, type or hook byte, the orchestrator records the new SHA in sprint §4.
2. Each consumer then picks the change up at integration. Test fallout is re-scoped by QA-Red, never the Developer.
3. Nobody cherry-picks.

**C2 build rules (DevOps, mechanical only):**
- Resolve only these conflicts:
  - `CHANGELOG.md`: keep both entries.
  - init-fixture tail: keep -11's rows, then CR-124's, and delete one copy of the byte-identical shared enforcement row.
- Run `npm run gen:codex`, then commit the regenerated `.codex/agents/architect*.toml`.
- Run `npm run typecheck` and `node scripts/build-codex-payload.mjs --check`, then each owner's make-green set, solo.
- Any other conflict halts C2, and -12 then waits for both merges and cuts from cli `main`.
- Tear down the C2 worktree after it hands off.

**Interface contract with no branch.** BUG-098's two scripts consume C4's `locateFrontmatterFence`. Because BUG-098 builds from C4 itself, no skeleton is needed.

---

## 3. The DAG: base, upstream and start condition per item

| Item | cli base | outer worktree | upstream (integrate after) | Build starts | Merge-lane follow-up |
|---|---|---|---|---|---|
| STORY-058-10 | `35580b0` (its branch exists) | detached host | none | **now** (pass C), after migrating out of the main checkout (step 0 below) | BD, then RS-4a |
| CR-124 | `35580b0` | `story/CR-124` from `sprint/S-41` | none | **now** | BD, then RS-CR |
| STORY-058-11 | `contract/S-41-codex` | `story/STORY-058-11` from `sprint/S-41` | -10 | **now** | BD, then RS-4 |
| BUG-090 | `contract/S-41-codex` | `story/BUG-090` from `sprint/S-41` | -10 | **now** | BD |
| BUG-096 | `35580b0` | detached host | none | first free lane | BD |
| BUG-097 | `main` tip at cut | detached host | none | after BUG-096 takes a lane | BD |
| BUG-098 | `contract/S-41-fence` | `story/BUG-098` from `sprint/S-41` | BUG-090 | C4 exists and a lane is free | BD |
| STORY-058-12 | `contract/S-41-dispatch` | `story/STORY-058-12` from `sprint/S-41` | -10, -11, CR-124 | C2 exists (top lane priority) | BD, then RS-5 |
| STORY-058-13 | `contract/S-41-loop` | `story/STORY-058-13` from `sprint/S-41` | -12, BUG-090 | C3 exists (top lane priority) | step L (owner), then DevOps, BD, RS-CLOSE |

**Lane priority** (longest downstream chain first; contracts permitting): -13 > -12 > -10 > -11 > CR-124 > BUG-090 > BUG-098 > BUG-096 > BUG-097.

A lane is occupied only while an agent works in the worktree. A built item waiting on its upstream holds no lane.

### What starts NOW

Pass B is committed and pass C is not dispatched yet, so this is a safe window to touch the cli main checkout. The orchestrator runs these steps serially:

0. **Free the main checkout.**
   ```
   git -C CLI status --porcelain          # must print only: ?? cleargate-0.25.0.tgz
   git -C CLI checkout main
   git -C OUTER worktree add --detach .worktrees/STORY-058-10 sprint/S-41
   git -C CLI worktree add OUTER/.worktrees/STORY-058-10/cleargate-cli story/STORY-058-10
   ```
   Then run the rule-19 setup (symlinks, prebuild). Pass C, -10's QA-Verify and its post-flight run in `<cw>`. From here on, `CLI` stays on `main` for good.

1. Create C1: `git -C CLI branch contract/S-41-codex d0f0d95`.

2. Exclude the `.claude` symlink: `printf '/.claude\n' >> OUTER/.git/info/exclude`. This is per-machine and untracked. Verify it later: `git -C <ow> status --porcelain` must show no `.claude`.

3. Apply RP-A1..A8, RP-A15, RP-A18 and RP-A22, commit them on `sprint/S-41` (chore, `SKIP_SURFACE_GATE=1`, rule 17), then re-gate STORY-058-11 and CR-124 with `node OUTER/cleargate-cli/dist/cli.js gate check <file>`. Every amendment must be committed **before** its worktree is cut (flashcard 2026-08-27 `#worktree #planning`).

4. Cut the worktree pairs serially (never two `git worktree add` at once), in this order:
   - CR-124: `35580b0`
   - STORY-058-11: `contract/S-41-codex`
   - BUG-090: `contract/S-41-codex`

   Run the rule-19 setup in each.

5. Dispatch in parallel:
   - -10 Developer pass C;
   - QA-Red for CR-124, STORY-058-11 and BUG-090.

   That is 4 lanes. Briefs carry absolute `<cw>`/`<ow>` paths, and the work item id on line 1.

6. Ask the owner for OD1 (the Codex login), once. It is non-blocking and needed only by RS-4L or -13 step L (§8).

The next free lane goes to BUG-096, then BUG-097. A lane goes to BUG-098, -12 or -13 as soon as C4, C2 or C3 exists.

---

## 4. Worktree mechanics for cleargate-cli (decision + measurements)

**Layout (decided): nest the cli worktree inside the item's outer worktree.** For each item, `<ow>` is:
- `story/<ID>` from `sprint/S-41` for two-repo items;
- `--detach sprint/S-41` for cli-only items: a host with no commits.

`<cw>` = `<ow>/cleargate-cli` on `story/<ID>`, from the base in §3.

Why:
- **P1/P2:** every test that hardcodes `META_ROOT = <cli>/..` reads the item's **own** outer tree, including its uncommitted live-mirror edits. Rule 15's class of "pre-merge red because the test reads the MAIN checkout" disappears, and so does rule 16's `CLEARGATE_META_ROOT` override.
- `<ow>/cleargate-cli` resolves the flashcard-73 ENOENT class (an outer worktree has no `cleargate-cli/`).
- The cli repo's missing `.worktrees/` ignore is irrelevant: nothing is created inside `CLI`.

The **naming** is fixed:
- `.worktrees/<ID>` (e.g. `.worktrees/STORY-058-11`, `.worktrees/CR-124`, `.worktrees/BUG-090`)
- `.worktrees/contract-S-41-dispatch` for C2
- The cli directory is always named `cleargate-cli`.

**Setup per item** (orchestrator, serial, after the item's amendments are committed):
```
git -C OUTER worktree add .worktrees/<ID> -b story/<ID> sprint/S-41        # cli-only items: --detach .worktrees/<ID> sprint/S-41
git -C CLI worktree add OUTER/.worktrees/<ID>/cleargate-cli -b story/<ID> <base>
ln -s OUTER/cleargate-cli/node_modules OUTER/.worktrees/<ID>/cleargate-cli/node_modules
ln -s OUTER/.claude OUTER/.worktrees/<ID>/.claude
(cd OUTER/.worktrees/<ID>/cleargate-cli && npm run prebuild)
```

**`node_modules` (decided): symlink.**
- `npm ci --offline` fails (P6): `toml-eslint-parser` is not in `~/.npm`, and the lockfile is gitignored.
- The symlinked tree carries every remaining item's dependencies. -10 already installed `toml-eslint-parser`, and no remaining item adds one.
- Nothing resolves through `node_modules` in a way the symlink breaks:
  - package-root walks (`findCleargatePackageRoot`, `scripts/*` `path.resolve(__dirname,'..')`) start at the worktree's own files;
  - e2e tests clone `CLI_ROOT` and symlink `CLI_ROOT/node_modules`, which is a symlink to a symlink (fine, P2);
  - `dist/` self-reference resolves `<cw>/package.json`, so it needs a worktree build first.
- **Never run `npm install` or `npm ci` in a worktree.** The target is shared by every lane and by BD.

**`/.claude` (decided): symlink to the live tree.**
- This gives the worktree the main checkout's semantics for the legacy tests that read or execute live hooks and agents (P3).
- The symlink is invisible to git only through `.git/info/exclude` (P4).
- It is read-mostly. A test writing there wrote into live `.claude` before this change too; the exposure is unchanged.

**Where tests run:**
- Targeted runs happen in `<cw>`: `npm run test:file -- <file>`.
- Harness runs from `<cw>` take the harness lane (§5).
- The full suite runs only in the merge lane, in `CLI`.

**Rule 11 in worktrees.**
- `npm run prebuild` and `npm run build` inside `<cw>` are allowed and required before payload-reading or dist-spawning tests (P5). They never touch `CLI/dist`, which the live hooks run.
- `CLI` itself is built only by BD.
- M5-A41 (no prebuild or build in the main checkout) stands, and now applies only to `CLI`.

**The main checkout (`CLI`), from step 0 on:**
- It stays on `main`.
- It is the merge checkout: DevOps `git merge --no-ff story/<ID>`, the full suite, and the BD build.
- It is the source of the live re-syncs (`b0-live-resync.mjs` reads `CLI/scaffold/hosts/claude/.claude`) and the working dir for RS-* harness runs, whose default container is a sibling of `OUTER`.
- No agent edits files there.

**Teardown (after that item's DevOps merge and boundary step):**
```
git -C OUTER/.worktrees/<ID>/cleargate-cli status --porcelain   # must be empty (ignored files are fine)
git -C OUTER/.worktrees/<ID> status --porcelain                 # must be empty; rescue untracked files first (flashcard 2026-08-27)
git -C CLI worktree remove OUTER/.worktrees/<ID>/cleargate-cli  # cli FIRST: removing the outer dir first orphans the cli registration
git -C OUTER worktree remove .worktrees/<ID>
```
Branches are kept. Contract branches stay until close; the Reporter lists them.

---

## 5. Concurrency hazards: measured, and the rules that make N builds safe

| Hazard | Measured / read | Rule |
|---|---|---|
| **Rule 14 back-sync** (writes into `<cli>/../.cleargate/delivery/**`) | `<cli>/..` = the item's outer worktree (P1). A worktree run writes there, not into the main checkout. Concurrent builds write into distinct trees. The specific writer (a close-pipeline fixture without `CLEARGATE_REPO_ROOT`, flashcard 2026-09-02) was not isolated in this time box. | Worktree runs: `git -C <ow> checkout -- .cleargate/delivery` after committing any intended edit. The merge lane's full suite writes into the outer MAIN checkout (as today): DevOps reverts only the paths `git diff --name-only` lists, and the orchestrator never leaves a delivery amendment uncommitted while a DevOps dispatch runs. |
| Fixed `/tmp` names | grep of `test/`, `src/`, `scripts/`: the only fixed paths are string literals that are never written (`/tmp/fake/…`, `/tmp/x`). Not exhaustive. | Named on failure |
| M2 baseline `/private/tmp/cg-s41-m2-init-baseline` | Compare mode reads only. P7 ran concurrent init tests clean (without the baseline). | Compare mode only; capture mode (`CLEARGATE_INIT_BASELINE_CAPTURE=1`) is forbidden. Keep the baseline until RS-CLOSE. |
| Fixed ports | `test/dashboard/cr097.node.test.ts:296` (4731), `cr101.node.test.ts` (43811–43813, a squatter on the base port). These are in the default suite; no remaining item's targeted set contains them. | Exactly one full suite at a time (merge lane) |
| `CLAUDE_PROJECT_DIR` / `ORCHESTRATOR_PROJECT_DIR` / `CLEARGATE_REPO_ROOT` | Unset in the agent Bash env (§0). Tests that spread `process.env` inherit nothing. | Never export them in a build lane |
| `run_script.sh` incident dir | Resolves `ORCHESTRATOR_PROJECT_DIR`, then `CLAUDE_PROJECT_DIR`, then git toplevel. From `<cw>` that would land in `<cw>/.cleargate/…` (untracked, which blocks teardown). | Always `ORCHESTRATOR_PROJECT_DIR=/Users/ssuladze/Documents/Dev/ClearGate bash /Users/ssuladze/Documents/Dev/ClearGate/.cleargate/scripts/run_script.sh …` |
| BUG-096 leak multiplying | +15 dirs per init-host-selection run, per lane (P7). A second, unscoped leak: `host-adapter-contract.red.node.test.ts:91`. | BUG-096 takes the first free lane. The merge lane's BUG-096 hygiene step removes both prefixes plus `cg-s41-contract-payload-*`, `-mmin +60`. |
| Ratchet baseline | None: no test ratchet runs in either repo's pre-commit (§0) | none |
| Outer pre-commit in `<ow>` | Runs `check:no-vitest` on `<ow>/cleargate-cli` (2 s, P9). The surface gate resolves the max-`updated_at` STORY from the **main** `state.json`. | Rule 17 addition (RP-A5): outer commits on a STORY branch happen right after that item's own state transition |
| Ledger attribution with parallel dispatches | `token-ledger.sh:223-293` tuple-matches `work_item_id` (BUG-029); ids fall back to the newest file on a miss | Every brief names the work item id on its first line |
| `git worktree add` racing the index | EPIC-055 / spike | The orchestrator creates worktrees serially |
| Harness runs | The default container is `CLI_ROOT/../..` (`claude-baseline.mjs:420-423`, `codex-hooks.mjs:188-189`). From `<cw>` that is `OUTER/.worktrees/…`, which `validateContainer` refuses as "inside a git work tree" (`evidence.mjs:661-663`). -09/-10/-13 probe items share the names `EPIC-001`/`STORY-001-01`/`SPRINT-01`, and -13's `codex.loop.meta-repo-untouched` is time-windowed. The live codex runs share `DEDICATED_CODEX_HOME` state. | **One harness run machine-wide at a time.** From `<cw>`, pass `--ref story/<ID>` and `--container /Users/ssuladze/Documents/Dev/cg-cleanroom-<utc>-<id>` |
| Full-suite load flakes | The full suite runs while builds run (P7: contention tolerable) | DevOps re-runs any failing file solo before calling a regression |

**Concurrency cap: 4 build lanes, 1 merge lane, 1 harness lane.**
- 4, because 10 CPUs and P7 (3 concurrent heavy files plus a foreign e2e, all clean) leave headroom for the merge lane's full suite.
- The only independent items at any moment are at most 4: now that is -10, CR-124, -11 and BUG-090.
- A 5th lane would only compete with the full suite and the serialized harness lane.

---

## 6. Integration protocol (cli + outer), re-verification, and loop depth

**Integrate item X** when `integrationReady`, i.e. every `upstream` item has merged in both repos and its merge-lane follow-up (BD, RS-x) has run. Integration runs in X's worktrees, as one Developer dispatch named "INTEGRATE":

1. **cli merge.** `git -C <cw> merge --no-ff main -m "integrate(X): merge cli main <sha>"`
2. **cli conflicts:**
   - The owner's file wins, and X re-applies only its own insertions.
   - init-fixture tail: upstream rows first, then X's.
   - An identical duplicate of the shared enforcement row is deleted (mechanical).
   - `CHANGELOG.md` keeps both.
   - **A conflict in a `*.red.*` test, or in a non-identical sanctioned row, stops the Developer.** The orchestrator dispatches QA-Red to re-scope it (CR-124 rule 6), then resumes the Developer.
3. **Regenerate** when canonical agents or hooks changed on either side: `npm run gen:codex`, then `node scripts/build-codex-payload.mjs --check` must exit 0. Then `npm run prebuild && npm run build` in `<cw>`.
4. **Outer side.** Twins are re-derived, never merged:
   - `git -C <ow> checkout -- <twin paths>`, discarding the build-phase copies;
   - `git -C <ow> merge --no-ff sprint/S-41` (cli-only hosts: `git -C <ow> checkout --detach sprint/S-41`);
   - `cp` each twin from `<cw>/scaffold/**`, then `cmp`.
   - Authored outer files (-13's `clean-room-verification.md`) merge normally, and the owner's text wins.
5. **Full re-verification**, all targeted and solo, in `<cw>`:
   - the item's own new and amended files, and its named anchors (lists: M5 / M5-fixwave / M6 / §7);
   - `npm run typecheck`;
   - `node scripts/build-codex-payload.mjs --check` (once -10 is in the tree);
   - the M2 parity pair with `CLEARGATE_INIT_BASELINE=/private/tmp/cg-s41-m2-init-baseline` (5/5, 15/15);
   - for two-repo items: every `CLEARGATE_META_ROOT`-honouring file, **without** the override (the default now resolves to `<ow>`);
   - the item's named integration files.
6. **Then QA-Verify on the integrated tree** (plus the harness run, in the harness lane, from `<cw>`), then the post-flight.
7. **Outer-half commit**, in the merge lane:
   - First, the orchestrator runs `update_state.mjs X <state>` and makes no other STORY transition until the commit is reported.
   - Then the INTEGRATE Developer, or DevOps in its merge turn, commits the twins plus X's item-file ticks on outer `story/X`.
8. **DevOps**, in the merge lane:
   - Re-sync check. The merge proceeds only if both pass:
     - `git -C CLI merge-base --is-ancestor main story/X`;
     - `git -C OUTER merge-base --is-ancestor sprint/S-41 story/X`.
   - If either fails, main moved: redo steps 1–5 (re-sync). Re-run QA-Verify only if the re-sync had conflicts or touched X's surface.
   - Then:
     1. outer → `sprint/S-41` first (rule 15);
     2. cli → `main`;
     3. the full suite once;
     4. the Rule-14 path revert;
     5. BD;
     6. the item's witnesses;
     7. the §4 Contract-first ledger row;
     8. teardown after the boundary step.
   - **Expected full-suite count** = the previous merge's recorded total + X's own default-tier delta (± any QA-Red re-scope, recorded). The fix-wave's cumulative `T10+…` numbers are void.
   - **Payload-identity baseline** = a copy of `CLI/templates/cleargate-planning` taken immediately before X's merge.

**Build phase.** Before integration, each item runs QA-Red → (TPV) → Developer on its base. The Developer's make-green set on a contract base excludes tests that need unmerged upstream code; each exclusion is named in the dev report. Twins are written into `<ow>` during the build and left uncommitted (step 4 re-derives them).

**Loop depth** (kept from the item plans):

| Item | Loop |
|---|---|
| STORY-058-10 | pass C → integrate → QA-Verify (test 46 scripted; harness lane) in parallel with post-flight → DevOps (M5) |
| BUG-096 | QA-Red → Dev → QA-Verify → DevOps; TPV and post-flight only on a pre-gate flag (M5-fixwave) |
| BUG-097 | same as BUG-096 |
| BUG-090 | QA-Red → live TPV → Dev → QA-Verify (one `claude-baseline.mjs run --ref story/BUG-090 --container …`, harness lane) → live post-flight → DevOps |
| BUG-098 | QA-Red → live TPV → Dev → QA-Verify → live post-flight → DevOps; no harness |
| CR-124 | QA-Red → live TPV → Dev → QA-Verify → live post-flight → DevOps (§7) |
| STORY-058-11 | QA-Red → TPV → Dev → QA-Verify (codex-hooks scripted, `--container`, harness lane) → post-flight → DevOps |
| STORY-058-12 | QA-Red → TPV → Dev A → Dev B → QA-Verify → post-flight → DevOps (M6) |
| STORY-058-13 | QA-Red → TPV → Dev A → Dev B → QA-Verify → post-flight → step L (owner) → DevOps (M6) |

---

## 7. CR-124 blueprint

### 7.1 Coupling and order

- **Builds now**, from `35580b0`. No upstream. Its merge must precede -12's integration: -12 builds from C2, which contains CR-124's Developer commit.
- **With -11:** no edge. Whichever merges second regenerates `.codex/agents/architect{,-synth,-reader}.toml` at integration. The shared enforcement row is byte-identical (§7.5).
- **With -12:** CR-124 keeps every -12 anchor byte-identical:
  - the line starting `There is one and only one way a sprint executes` (`SKILL.md:104`), unchanged in full;
  - `` ### C.0 Execution — run each wave via `/workflows` ``;
  - the line starting `A single-story wave is one segment`;
  - `### C.1 Pre-execution check`;
  - the line starting `**Serial barrier merge.**`;
  - the A4 lines.

  Everything CR-124 adds to §C.0 lies inside -12's A2 range (C.0 heading up to C.1), which the Codex rendering replaces with R2. Text CR-124 adds **outside** A2 (§A.4) contains none of `-12`'s banned tokens: `/workflows`, `Workflow tool`, `parallel()`, `launch_wave`, `resumeFromRunId`, `RUN_ID`, `mintRunId`, `SKIP_FLASHCARD_GATE=1`, `Between-wave relocation`.
- **Vocabulary.** `scripts/check-no-exec-mode-vocab.mjs:41-43` bans these in `scaffold/` and `src/`, except in files the checker excludes (`launch_wave.mjs` and `cleargate-enforcement.md` among them): `under v1`, `under v2`, `v2-only`, `v2 only`, `v2 block`, `v1 advisory`, `block in v2`, `v2-fatal`, and similar. Write "`schema_version: 2`" or "a `schema_version: 2` plan", never "v2 only" or "under v2".
- **`init_sprint.mjs` is NOT modified.** It reads only `lane_assignments` (`init_sprint.mjs:195-211`, measured), so a `schema_version: 2` file already works. CR-124 §3's listing is corrected by RP-A18. `architect.md` is **added**: its §2.1 Phase Plan instruction is the N ≤ 2 SDR path.
- **No new payload file.** A new file needs -11's `SANCTIONED_BASELINE_ADDITIONS`, which CR-124 does not have. The v2 helpers therefore go into `launch_wave.mjs`.

### 7.2 Files and change shape (pinned)

**cli (`<cw>` = `OUTER/.worktrees/CR-124/cleargate-cli`, `story/CR-124`):**

1. **`scaffold/core/.cleargate/scripts/launch_wave.mjs`**. Add after `worktreeAddCommand` (`:112-115`); do not touch `:1-41` or `:129-224`:
   ```js
   /** CR-124: per-story worktree bases from a plan. No schema_version → {} (no per-story bases). */
   export function storyBases(plan) {
     if (!plan || plan.schema_version === undefined) return {};
     if (plan.schema_version !== 2) throw new TypeError(`storyBases: unsupported schema_version ${plan.schema_version}`);
     const contractBranches = new Set((plan.contracts ?? []).map((c) => c && c.branch));
     const out = {};
     for (const [id, entry] of Object.entries(plan.stories ?? {})) {
       if (!entry || typeof entry.base !== 'string' || entry.base === '') continue;
       if (!/^[A-Za-z0-9._\/-]+$/.test(entry.base)) throw new TypeError(`storyBases: ${id} has an unsafe base '${entry.base}'`);
       if (entry.base.startsWith('contract/') && !contractBranches.has(entry.base)) throw new TypeError(`storyBases: ${id} names undeclared contract '${entry.base}'`);
       out[id] = entry.base;
     }
     return out;
   }
   /** CR-124: true iff every `upstream` story of storyId is in mergedIds. No schema_version → true (no edges). */
   export function integrationReady(plan, storyId, mergedIds) {
     if (!plan || plan.schema_version === undefined) return true;
     const entry = plan.stories?.[storyId];
     if (!entry) throw new Error(`integrationReady: unknown story ${storyId}`);
     const merged = new Set(mergedIds ?? []);
     return (entry.upstream ?? []).every((u) => merged.has(u));
   }
   ```
   - `launchWave` gains the last destructured parameter `bases = {}`, plus a helper `baseFor(story)`. It returns `bases[story]` if that is a non-empty string, otherwise `sprintBranch`.
   - Both `worktreeAddCommand(...)` call sites in `launchWave` (`:269` and the plan-only map) pass `baseFor(story)`.
   - JSDoc: add `@param {Record<string,string>} [args.bases]`, and describe `worktreeAddCommand`'s second parameter as "the base ref (the sprint branch, or a contract branch from a `schema_version: 2` plan)".
   - No inline work-item-id regex (`check-no-inline-id-regex.mjs` scans this directory).
2. **`scaffold/hosts/claude/.claude/agents/architect-reader.md`.**
   - The digest JSON (both the frontmatter description and `## Digest shape`) gains `"exports_provided": ["<path>: <name>(<signature>)", ...]` and `"exports_consumed": ["<path>: <name>", ...]`.
   - Field sources:
     - `exports_provided`: the exported names and signatures the story's §3 / §3.3 creates or changes;
     - `exports_consumed`: names it imports from files that another story in the milestone creates or changes.
     - Default for both: `[]`.
   - Keep `file_surface: []` and the faithful-empty text (BUG-033 anchor).
3. **`scaffold/hosts/claude/.claude/agents/architect-synth.md`:**
   - The frontmatter `description` drops "five-clause" in favour of "real-collision predicate".
   - `## Five-clause wave-compatibility predicate` becomes **`## Real-collision predicate`**. It names the three serializing kinds (`ordered schema or migration journals`, `lockfiles` and other `single-writer generated artifacts`, `shared files whose edits must be applied in order`). It states that `parallel_eligible` and `db_write_set` are integration-order **hints**, and that an unmet `dep_predecessors` edge is an **integration** edge (`upstream`), not a build separator.
   - New `## Contract formation`: for each edge whose consumer needs code the upstream has not written, name a contract. Fields: `id`, `branch` = `contract/S-<NN>-<slug>`, `base`, `owner_story`, `frozen_exports` (exact names and types). The body is a type-exact skeleton (bodies throw) written by a Developer dispatch, or the upstream's Developer commit. Exports are frozen; the owner replaces the bodies.
   - `## Wave packing algorithm` becomes build set + integration layers: layer(x) = 0 without upstream, else 1 + the max over its upstream.
   - `## waves.json shape` shows `"schema_version": 2`, `"contracts": [...]`, `"stories": {"<ID>": {"base": ..., "upstream": [...]}}`, the derived `"waves"` (keys `wave`, `stories`, `parallel`, `rationale`) and `"lane_assignments"`. It states that a file without `schema_version` stays valid.
   - Keep verbatim: `Empty-surface guard`, `fail-safe-serialize`, `unknown collision metadata`, the `## Reachability refusal (BUG-046)` section and the tiny-sprint floor.
4. **`scaffold/hosts/claude/.claude/agents/architect.md`.** In `## Sprint Design Review` §2.1, append one sentence: "Express the phase plan as a contract-first DAG — build set, contracts (`contract/S-<NN>-<slug>`, frozen exports), per-story `base` and `upstream`, serial merges — per `architect-synth.md` "Contract formation"; for N ≤ 2 the DAG degenerates to the merge order."
5. **`scaffold/hosts/claude/.claude/skills/sprint-execution/SKILL.md`:**
   - **§A.4** (`:171-209`): in both synth sentences (`:195` and the `:199` task-instruction block), replace "five-clause wave-compatibility predicate" with "real-collision predicate".
   - **§A.4**: after the synth block, add one paragraph. It says the synth emits contracts plus per-story `base`/`upstream` in a `schema_version: 2` `waves.json` (`contracts[]`, `stories`, derived `waves`), and that readers report `exports_provided`/`exports_consumed`. No banned token.
   - **§C.0 intro paragraph** (the one starting "Execution has no modes"): append one sentence. It says a `schema_version: 2` plan's layers that build from contract branches follow §C.0.2.
   - **New `#### C.0.2 Contract-first build and integration (CR-124)`**, after C.0.1's "Idempotent segments" paragraph and before `### C.1`. It holds six numbered rules:
     1. The plan fields.
     2. The contract step: create each `contracts[]` branch from its `base`; skeleton or upstream Developer commit; frozen exports.
     3. Parallel build: every story whose base exists builds in its own worktree cut from its `base` (`storyBases`, `launchWave({…, bases})`), through QA-Red → TPV → Developer, within the plan's build lanes.
     4. Integration by DAG: only when `integrationReady`; merge `sprint/S-NN` into `story/<ID>`; the owner's file wins and the story re-applies its insertions; regenerate generated artifacts; full re-verification; QA-Verify and the Architect post-flight on the integrated tree.
     5. Serial merges: one merge at a time (§C.7); re-sync if the sprint branch moved after integration.
     6. Red tests over-constrained by another story's additions, or whose casts become redundant once a real type lands, are re-scoped by QA-Red, **never by the Developer**.

     Close the section with: "Until EPIC-055's scheduler lands, the Orchestrator runs this protocol by hand."
6. **`scaffold/core/.cleargate/knowledge/cleargate-enforcement.md` `:103`.** Change "(STORY-033-03's five-clause predicate)" to "(the real-collision predicate, CR-124 — only ordered journals, single-writer generated artifacts and shared files needing ordered edits serialize)". No other byte changes.
7. **`scaffold/core/.cleargate/templates/Sprint Plan Template.md`.** Replace the `### 2.1 Phase Plan` body (`:95-98`) with a DAG example:
   ```
   {Contract-first DAG. Build set: every story whose base exists builds at once. Contracts: `contract/S-NN-<slug>` (base, owner story, frozen exports). Per story: base (sprint/S-NN or a contract branch) and upstream (integration edges). Merges: one at a time, in upstream order; re-sync if the sprint branch moved.}
   Example:
   - Contract C1 `contract/S-NN-api` (base sprint/S-NN; owner STORY-NNN-01; frozen: `src/api.ts: getThing(id: string): Promise<Thing>`)
   - Build now: STORY-NNN-01 (base sprint/S-NN) ‖ STORY-NNN-02 (base contract/S-NN-api)
   - Integrate: STORY-NNN-02 after STORY-NNN-01 merges
   ```
   Keep the heading, every other section and the three `declareProbeSprint` anchors (`probe-items.mjs:81-91`): the `epics: []` line, the `{STORY-NNN-NN}` row and the fast-lane row.
8. **`test/helpers/init-fixture.ts`**: the 7 rows of §7.5. **`CHANGELOG.md`**: `### Added` "Contract-first sprint planning: SDR emits contracts and per-story base/upstream (`waves.json` `schema_version: 2`); `launch_wave.mjs` gains `storyBases`, `integrationReady` and per-story worktree bases (CR-124)."
9. **Only if -11 merged first:** `npm run gen:codex` and commit the regenerated `scaffold/hosts/codex/.codex/agents/architect{,-synth,-reader}.toml`.

**Outer (`<ow>` = `OUTER/.worktrees/CR-124`, `story/CR-124`):**
- Byte copies of the canonical `.cleargate/knowledge/cleargate-enforcement.md`, `.cleargate/scripts/launch_wave.mjs` and `.cleargate/templates/Sprint Plan Template.md`, in one commit (§6 step 7).
- Live `/.claude/agents/architect{,-synth,-reader}.md` and `skills/sprint-execution/SKILL.md` are never edited in a story. RS-CR re-syncs them.

### 7.3 QA-Red: one red commit on cli `story/CR-124`

1. **`test/scripts/waves-json-v2.red.node.test.ts`** (default tier, 7 tests).
   - Spawn the canonical `init_sprint.mjs` in a fixture repo. The pattern is `scaffold/core/.cleargate/scripts/test/cr078_init.test.sh` assertion 3: a `---`-led approved story, `--stories`, and `cwd` = the fixture.
   - Import `canonicalPath('.cleargate/scripts/launch_wave.mjs')`.

   | # | State | Assertion |
   |---|---|---|
   | W1 | anchor | A waves.json with no `schema_version`, `lane_assignments {STORY-99-01: fast}` → state.json `STORY-99-01.lane === 'fast'`, `lane_assigned_by === 'sdr-lane-audit'` |
   | W2 | anchor | The same with a `schema_version: 2` fixture (`contracts`, `stories` base/upstream, derived `waves`, same `lane_assignments`) → lane fields deep-equal W1's |
   | W3 | red | `storyBases(v1) → {}`. `storyBases(v2)` → `{STORY-99-01:'sprint/S-99', STORY-99-02:'contract/S-99-api'}`. An undeclared `contract/S-99-x` base throws TypeError naming the story. A base containing a space throws TypeError. |
   | W4 | red | `launchWave({sprintId:'SPRINT-99', sprintBranch:'sprint/S-99', wave:{stories:['STORY-99-01','STORY-99-02']}, bases:{'STORY-99-02':'contract/S-99-api'}})` (plan-only) → worktree commands end with `sprint/S-99` and `contract/S-99-api` respectively |
   | W4b | anchor | The same without `bases` → both end with `sprint/S-99` |
   | W5 | red | `integrationReady`: B `upstream ['A']`; `[]` → false, `['A']` → true; a plan without `schema_version` → true; an unknown story throws |
   | W6 | anchor | `VERDICT_KINDS`, `BLOCKER_TYPES`, `validateVerdicts`, `mintRunId`, `worktreeAddCommand`, `launchWave` are still exported (the -12 collision guard) |

2. **`test/docs/contract-first-dag-text.red.node.test.ts`** (default tier, 10 tests).
   - Canonical files via `canonicalPath`.
   - Live twins via `const META_ROOT = process.env.CLEARGATE_META_ROOT ?? path.resolve(CLI_ROOT, '..')`.

   | # | State | Assertion |
   |---|---|---|
   | T1 | red | reader: `"exports_provided"` and `"exports_consumed"` in the digest block and in field sources |
   | T2 | red | synth: the `## Real-collision predicate` and `## Contract formation` headings; `contract/S-`, `frozen_exports`, `owner_story`; the waves shape holds `"schema_version": 2`, `"contracts"`, `"base"`, `"upstream"`, `"lane_assignments"`; `parallel_eligible` near "hint"; still contains `Empty-surface guard`, `fail-safe-serialize`, `unknown collision metadata`, `Reachability refusal`; no `five-clause` anywhere |
   | T3a | red | SKILL: `#### C.0.2 Contract-first build and integration (CR-124)` sits after `#### C.0.1` and before `### C.1 Pre-execution check`. The section contains `schema_version: 2`, `contracts[]`, `base`, `upstream`, `contract/S-`, `skeleton`, `frozen`, `storyBases`, `integrationReady`, `owner's file wins`, `re-applies`, `integrated tree`, `one merge at a time`, `re-sync`, `QA-Red`, `never by the Developer`, `EPIC-055`. The §C.0 intro paragraph mentions `§C.0.2`. |
   | T3b | anchor | SKILL: each -12 anchor line (§7.1) occurs exactly once; §A.4 (from `### A.4` to `### A.5`) contains none of the 9 banned tokens |
   | T3c | red | SKILL §A.4 contains `real-collision predicate`, `exports_provided`, `exports_consumed`, `schema_version: 2`; no `five-clause` |
   | T4 | red | canonical and live enforcement are byte-identical, contain `real-collision predicate`, and contain no `five-clause predicate` |
   | T5 | red | canonical and live Sprint Plan Template are byte-identical; the `### 2.1 Phase Plan` body contains `contract/S-`, `base`, `upstream`, `Build`, `Integrate` |
   | T5b | anchor | the template still holds the three `declareProbeSprint` anchors (`/^epics: \[\].*$/m`, `` | `{STORY-NNN-NN}` | {Title} | ``, `` | `STORY-NNN-NN` | fast | <one-line rationale> | ``) |
   | T6 | anchor | none of the 7 CR-124 files matches `INCLUDE_PATTERN` imported from `scripts/check-no-exec-mode-vocab.mjs` |
   | T7 | red | `architect.md` §2.1 contains `contract-first DAG` and `upstream` |

3. **`test/scripts/init-sprint-waves-v2.red.integration.node.test.ts`** (integration, 1 red):
   - `runInitScenario('fresh')` room;
   - seed `.cleargate/sprint-runs/SPRINT-01/plans/waves.json` (`schema_version: 2`, 2 stories, `lane_assignments` one fast);
   - seed a `---`-led approved sprint plan and 2 `---`-led approved stories with non-empty `## 1.` sections. This keeps BUG-090 off the path;
   - spawn `<room>/.cleargate/scripts/init_sprint.mjs SPRINT-01 --stories …` with `cwd` = room → exit 0, and the lanes match;
   - then `import(<room>/.cleargate/scripts/launch_wave.mjs)`, and `storyBases(plan)` returns both bases. This is red at the red commit: the export is absent.
4. **init-fixture rows** (§7.5). Red on all 20 M2 parity runs at the red commit, green after Dev.

**Totals:**
- Default tier +17: **10 red** (W3, W4, W5, T1, T2, T3a, T3c, T4, T5, T7), 7 anchors.
- Integration +1 red.
- The parity pair flips, with no count change.

### 7.4 Anchors (solo, from `<cw>`) and loop

**Anchors (solo, from `<cw>`):**
- the existing files `bug-033-collision-surface-failsafe`, `collision-surface-planning-workflow` (15/15, needs the `.claude` symlink), `wave-execution-barrier` (23/23), `bug-034-flashcard-gate-restore`, `parallel-dispatch`, `skill-md-consolidation-d5`, `skill-md-conditional-architect`, `autonomy-contract`, `test-layers-declared-doctrine`, `enforcement-doc-coherence`, `enforcement-section-13`, `gate-section-index-pinning` (14/14), `new-command`, `clean-room-evidence` (60/60), `no-execution-mode-vocabulary`, `no-exec-mode-vocab`, `no-inline-id-regex`;
- `bash scaffold/core/.cleargate/scripts/test/cr078_init.test.sh` (its trailing SAFETY check hardcodes SPRINT-34, flashcard 2026-08-29; named);
- `npm run typecheck`;
- `node scripts/build-codex-payload.mjs --check`, once -10 has merged into CR-124's tree.

**Loop:** QA-Red → **live TPV** → Developer → QA-Verify → **live post-flight** → DevOps.

TPV checks:
- the 7 refuse-baseline rows;
- the twin reads resolve to `<ow>`;
- W1/W2 spawn the canonical script with `cwd` = the fixture;
- the integration file spawns the room's copy.

Post-flight checks:
- the -12 anchors and banned tokens;
- the vocabulary check;
- `launchWave` shell-safety;
- the template probe anchors;
- that no `init_sprint.mjs` byte changed.

### 7.5 Sanctioned rows (append at the init-fixture tail; `scenarios: 'all'`, refuse-baseline pattern)

`baselineHash` literals = the sha256 of the canonical bytes at `35580b0`. None carries a pin placeholder, and each equals the live copy. QA-Red confirms each against the M2 baseline `meta.json` in all 5 scenarios, **read-only**, before sealing. The M6 plan already measured SKILL.md, launch_wave.mjs and enforcement equal to the baseline.

| rel | baselineHash |
|---|---|
| `.claude/agents/architect.md` | `17c2c14afeec3e6706e26b5104d63d4513394323d0a9b70ae2fbf6da81dc7299` |
| `.claude/agents/architect-synth.md` | `78a5f4f05517bdefc382df72f9821ee1891f1087ef8146d90be935be93ca2365` |
| `.claude/agents/architect-reader.md` | `bd4986f3e1c06448e0a191447ffcfa8b559f7ba726c501999d91889f0cf8a50b` |
| `.claude/skills/sprint-execution/SKILL.md` | `c5affd1b4b8fc5f78942fbc9b71455ca516164eb14d1472289518a43ed6f2bd1` |
| `.cleargate/scripts/launch_wave.mjs` | `aa04cd43184cd035d8a659649bdfc0587cbfbdfe41922463c5a4ce5ba9b83c8d` |
| `.cleargate/templates/Sprint Plan Template.md` | `864e16594ce6cc2e8ccb423a7cf82c4f5b7a536a9e8a273968f8df0f749b244d` |
| `.cleargate/knowledge/cleargate-enforcement.md` | the shared row, verbatim below |

For the six CR-124-only rows: `item: 'CR-124'`, and `currentHash` = `currentPinSubstitutedHash(rel)`, refused when it equals the baseline. The refusal returns `'<CR-124 <basename> delta not landed: canonical still ' + h + '>'`.

**The shared enforcement row.** STORY-058-11's QA-Red and CR-124's QA-Red insert exactly this block, byte for byte:
```ts
  {
    item: 'STORY-058-11+CR-124',
    rel: '.cleargate/knowledge/cleargate-enforcement.md',
    scenarios: 'all',
    // Shared by STORY-058-11 (§16), CR-124 (:103) and STORY-058-12 (§17); one row per rel.
    baselineHash: () => '4c3e8083c9ae4d3adcf968a75b454135c1d51cc0b0f0bf412e3d7ea71f9a4fdb',
    currentHash: () => {
      const h = currentPinSubstitutedHash('.cleargate/knowledge/cleargate-enforcement.md');
      return h === '4c3e8083c9ae4d3adcf968a75b454135c1d51cc0b0f0bf412e3d7ea71f9a4fdb'
        ? '<cleargate-enforcement.md delta not landed: canonical still ' + h + '>'
        : h;
    },
  },
```
- The second merger deletes its identical copy at integration.
- STORY-058-12 adds no row for enforcement, SKILL.md or launch_wave.mjs: it reuses these.

### 7.6 DevOps (CR-124, one turn, rule 15)

1. Copy `CLI/templates/cleargate-planning` to `/private/tmp/cg-s41-payload-pre-cr124`.
2. Merge outer `story/CR-124` → `sprint/S-41` (one commit, 3 twins). Then `node OUTER/.cleargate/scripts/launch_wave.mjs` prints its usage note.
3. Merge cli `story/CR-124` → `main`. Full suite: previous total + 17, 0 fail, 2 skipped. Rule-14 path revert.
4. BD.
5. `diff -r` lists exactly the 7 rels plus `MANIFEST.json`, and the matching `templates/scaffold/{core,hosts/claude}` split-view files plus their `MANIFEST.json`. Add the 3 codex TOMLs only if -11 merged first.
6. `node scripts/verify-pack.mjs` OK, with the entry count unchanged. `node scripts/build-codex-payload.mjs --check` exits 0.
7. Witnesses:
   - `cmp` for the 3 twins;
   - `node OUTER/cleargate-cli/dist/cli.js doctor` prints exactly 4 `scaffold drift:` lines (live `.claude/agents/architect{,-synth,-reader}.md` and `skills/sprint-execution/SKILL.md`) until RS-CR, and 0 after;
   - the M2 parity pair 5/5, 15/15;
   - `init-sprint-waves-v2` 1/1;
   - `canonical-live-parity` agent/skill cases are named-red until RS-CR.
8. **RS-CR** (§8). Then add the Adjacent-Implementations row (RP-A23) and the §4 ledger row.

### 7.7 v2 compatibility (measured)

| Reader | What it reads | Behaviour on a `schema_version: 2` file |
|---|---|---|
| `init_sprint.mjs:195-211` | `lane_assignments` only | Unchanged; W2 proves it |
| `launch_wave.mjs` | takes a `wave` object; reads no file | `storyBases(plan)` / `bases` are additive |
| -12 `dispatch_serial.mjs next` | `waves[].{wave,stories}` by wave id | v2 keeps those keys; RP-A16 adds a test |
| `src/dashboard/collect.ts:262-320` | the sprint plan's first table with `Story ID` and `Title` columns, grouped by `Milestone`, else `Wave`. It never reads waves.json. | Grouping depends on sprint plan §1 keeping its `Milestone` column (RP-A9 keeps it) |
| `collision-surface-planning-workflow.red` validator | `sprint`, `generated_at` strings; `waves` array | v2 keeps all three |

**Schema (additive):**
- `schema_version: 2`
- `contracts[]` (`id`, `branch`, `base`, `owner_story`, `frozen_exports` required; `consumers`, `created_by`, `create_when` optional)
- `stories: {<ID>: {base, upstream}}`
- derived `waves[]` (v1 keys, plus optional `derived` and `after`)
- `lane_assignments`

**Dogfood evidence.**
- The §10 file is a real `schema_version: 2` plan: `storyBases` accepts every base, and every `upstream` resolves (checked by script at authoring).
- The §4 "Contract-first ledger" (RP-A14) gets one row per remaining item at merge.
- The Reporter cites it for CR-124's E2E row at close.


### 7.8 TPV amendments (CR-124 live TPV, 2026-09-26; `reports/CR-124-tpv.md`)

Appended by the TPV. Nothing above is rewritten; where these differ from §7.2–§7.6, these win.

- **RP-A25 (§7.3, re-seal).** Before the Developer dispatch, apply `reports/CR-124-tpv-reseal.patch` (sha256 `66bc35a994e6d6195482f513b410bde613a35a9c5e471e5315b662fe25705077`) on cli `story/CR-124` at `dbd002f` as one re-seal commit. It touches only the 3 CR-124 test files (no `init-fixture.ts` row changes) and adds assertions to existing tests, so the counts stay the same: default tier 17 (10 red, 7 anchors), integration 1 red, parity pair 0/5 and 0/15 until the Developer commit. What it adds:
  - W3: shell-metacharacter bases throw; `schema_version: 3` throws; entries with no base or an empty base are skipped.
  - W4: an empty-string entry in `bases` falls back to the sprint branch.
  - W5: every upstream must be merged; a root story is ready.
  - T1: the fields are inside `## Digest shape`; canonical `file_surface: []` is kept.
  - T2: the three serializing kinds, the `dep_predecessors` → `upstream` / not-a-build-separator rule, `1 + the max`, and the kept `## Reachability refusal (BUG-046)`, `## Tiny-sprint floor (N ≤ 2)` headings and both fail-safe rationale literals.
  - T3a: §C.0.2 comes after the `**Idempotent segments.**` paragraph.
  - T6: `findExecModeVocabHits` stays. It gains a bare `INCLUDE_PATTERN` check over `launch_wave.mjs` (0 hits) and over the enforcement lines that name the real-collision predicate.
  - Integration: the spawn pins `CLEARGATE_REPO_ROOT` to the room.
- **RP-A26 (§7.3 T6 wording).** T6 reads: "`findExecModeVocabHits(CR124_FILES)` returns `[]`, and no line of `launch_wave.mjs`, nor any enforcement line naming the real-collision predicate, matches the bare `INCLUDE_PATTERN`." A bare `INCLUDE_PATTERN` over the whole enforcement file cannot be satisfied: 3 retired-behaviour lines already match it at `35580b0`, and §7.2 item 6 forbids other byte changes.
- **RP-A27 (§7.4/§7.6 named reds; §7.2 item 3/5 clarifications).**
  - Until RS-CR, integration-tier runs have two named reds, in the worktree (whose `.claude` symlinks to live) and in the merge lane alike:
    - `test/scaffold/sprint-execution-mirror.integration.node.test.ts` "diff command on live vs canonical" (3/4). Live SKILL.md ≠ canonical.
    - `canonical-live-parity` 5c (agents).
  - `test/integration/foreign-repo.integration.node.test.ts` is 4/6 regardless of CR-124: its `:215` `strictEqual` has its arguments swapped. This is pre-existing and named.
  - None of these three is in `npm test`, which excludes `*.integration.node.test.ts`.
  - In architect-synth, the Empty-surface guard keeps its heading phrase and its rule, but drops "Clause 2" / "clause-2" (no numbered clauses remain). The DB-axis paragraph drops "clause 4".
  - The Fail-safe-serialize section stays verbatim. Its "own trailing serial wave" is read as the trailing integration layer.
  - The synth's "Reader digest shape" block gains the same two export fields as the reader.
  - T3a's tokens are case-sensitive; write them exactly as listed (`one merge at a time`, `owner's file wins`, `never by the Developer`).

---

## 8. Boundary steps and owner actions in the DAG

| Step | After | Blocks | Action |
|---|---|---|---|
| BD | every cli merge | the next merge | `npm run build` on `main` in `CLI` |
| RS-4a | -10 BD | the next merge | M5 RS-4a plus step 3b (`canonical-live-parity` 5d PASS) |
| RS-4 | -11 BD | the next merge | M5 RS-4 steps 1–4, then the claude-baseline half of step 6, then step 7. FW-A8 applies: no `--known-fail`; `sprint-init` PASS ×2. The live step 5 moves to RS-4L. |
| **RS-4L** | RS-4 **and** OD1 | RS-CLOSE only | `codex-hooks.mjs run --codex-bin <PINNED_CODEX> --provider live --codex-home <DEDICATED_CODEX_HOME> --evidence …/codex-hooks-evidence.md --label "RS-4L live"` → PASS; then `codex-hooks.mjs check` exits 0. Harness lane, from `CLI`, any time before RS-CLOSE. |
| **RS-CR** | CR-124 BD | RS-5 | Run `node OUTER/.cleargate/sprint-runs/SPRINT-41/b0-live-resync.mjs` as a dry run. Its drift list must be exactly `agents/architect.md`, `agents/architect-synth.md`, `agents/architect-reader.md` and `skills/sprint-execution/SKILL.md`; anything else halts. Then run it with `--apply`, check `shasum` live == canonical, and check that `doctor` shows no drift. No restart: the agent registry picks up the new SDR agents at the next session start, and the skill at its next load. |
| RS-5 | -12 BD | the next merge | M6 RS-5 with FW-A10 (no `--known-fail`). The dry-run list must be exactly SKILL.md (changed) and dispatch-serial.md (new); this holds because RS-CR ran first. |
| STEP-L (owner) | -13 post-flight PASS | -13 DevOps | M6 step L: human TUI trust in the prepared room |
| RS-CLOSE | -13 BD | close | v1 RS-CLOSE text without `--known-fail`, plus the M6 codex-loop close run and check. The three harnesses run serially in the harness lane. Then the owner walkthrough, the Reporter, and `close_sprint.mjs` (Gate 4). |

**Owner actions, placed to block least:**
- **OD1**: ask now. It is needed by the earlier of RS-4L and -13 step L.
- **STEP-L**: only -13's merge waits on it.
- **Gate 4**: at the end.

No owner action blocks any build, and none blocks a merge other than -13's.

---

## 9. Per-story blueprint (deltas against the existing plans)

### STORY-058-10
- **Cross-story coupling:** C1 freezes everything except the pass-C harness internals. -11 and -13 extend `codex-hooks.mjs`/`evidence.mjs`, so their integration re-applies insertions over pass C.
- **Schema changes:** none new.
- **Test scenarios:** M5 plus M5-A44. Test 46 must be green (scripted, `CLEARGATE_CODEX_BIN`) before QA-Verify.
- **Reuse:** unchanged.
- **Gotchas:**
  - Test 46 run from `<cw>` clones `CLI_ROOT`, which is the worktree (P10 works).
  - `packArtifact` falls back to `npm install` with a scratch cache (pass-B report). That fetches from the network, so it runs in the harness lane.
  - DevOps (M5-A30): the full-suite baseline is the previous merge's total, not 3098, if CR-124 or BUG-096 merged first.

### BUG-096 / BUG-097
- Plans unchanged: `plans/M5-fixwave.md`. Bases `35580b0` and `main`; no upstream.
- DevOps counts follow §6 (previous total + 3, + 13).
- BUG-096's hygiene step adds `-name 'cg-s41-contract-payload-*'` and uses `-mmin +60`.

### BUG-090
- **Base C1** (was "cli main after the BUG-097 merge"). The M5-fixwave entry gate is already satisfied at `d0f0d95` (§0).
- Its 5 rows append after -10's rows at the C1 tail.
- QA-Verify's harness run happens after integration (-10 merged): `(cd <literal mktemp dir> && node OUTER/.worktrees/BUG-090/cleargate-cli/scripts/clean-room/claude-baseline.mjs run --ref story/BUG-090 --container /Users/ssuladze/Documents/Dev/cg-cleanroom-<utc>-bug090 --label "QA BUG-090")`, in the harness lane.
- The outer twin commit is one commit of 5 files (ESM pair).
- D4 count = previous total + 38.

### BUG-098
- **Base C4** (BUG-090's Developer commit).
- The M5-fixwave "cut after BUG-090 merges" entry gate greps move to integration time.
- Its two live scripts import BUG-090's live export, so the outer merge order is BUG-090 → BUG-098, which holds by upstream.
- D4 count = previous total + 27.

### STORY-058-11
- **Base C1.**
- The frozen pre-shim hooks `test/fixtures/hooks-pre-058-11/` are the canonical hooks at C1. If -10's pass C, or a -10 bounce, edits a hook, QA-Red re-freezes them at integration.
- The shared enforcement row is §7.5 verbatim.
- QA-Verify: `codex-hooks.mjs run --provider scripted --ref story/STORY-058-11 --container …`, from `<cw>`, harness lane, after integration.

### CR-124
- §7.

### STORY-058-12
- **Base C2.**
- Before QA-Red, re-dispatch the Architect for the M6 entry: re-derive every `[verify after -10/-11]` tag against C2, apply H1–H11 and RP-A16, and re-measure "every banned token lies inside A1–A4" on C2's SKILL.md.
- The stale-report relocation (M6 Order 1) stays.
- It adds no SKILL.md, launch_wave.mjs or enforcement row. Its own rows are the protocol row (refuse-baseline pattern) and the 3 additions.

### STORY-058-13
- **Base C3.**
- M6 entry re-derivation against C3, plus G1–G10 and FW-A10: `approveProbeStory` flips.
- Integration waits for -12 and BUG-090.
- Step L comes after post-flight.

---

## 10. Amendments for the orchestrator (RP-A1..RP-A24)

Apply each on `sprint/S-41` before the affected worktree is cut. Commit each one, then re-gate every touched work item with `node OUTER/cleargate-cli/dist/cli.js gate check <file>` (rule 18).

**RP-A1 — sprint-context, Mid-Sprint Amendments (append):**
`2026-09-26T14:00:00Z · CR-124 re-plan · plans/replan-contract-first.md accepted: remainder runs contract-first — contracts C1 contract/S-41-codex (=STORY-058-10 d0f0d95), C4 contract/S-41-fence (BUG-090 Dev), C2 contract/S-41-dispatch (STORY-058-11 + CR-124 Dev), C3 contract/S-41-loop (STORY-058-12 Dev); nested worktrees OUTER/.worktrees/<ID>/cleargate-cli; 4 build lanes, 1 merge lane, 1 harness lane; waves.json schema_version 2; rules 9 and 11 superseded, 19–21 added; the cli main checkout stays on main; RS-4's live run becomes RS-4L (owner OD1, before RS-CLOSE); RS-CR added after CR-124.`

**RP-A2 — rule 9.** Append: ` *Superseded 2026-09-26 by rule 19 (CR-124 re-plan, owner: "the sprint also runs the same way from now on"): cli items build in nested worktrees; the cli main checkout stays on main and serves DevOps merges, the full suite, BD and boundary steps only.*`

**RP-A3 — rule 11.** Replace the rule text with:
`11. **`dist` is live enforcement.** Live gate hooks run `OUTER/cleargate-cli/dist/cli.js` — the cli main checkout's build. Never run `npm run build` or `npm run prebuild` in the cli main checkout except boundary BD (DevOps, on `main`, after a merge). Inside a cli worktree (rule 19) `npm run prebuild` and `npm run build` are allowed and required before payload-reading or dist-spawning tests; they write only that worktree's gitignored `templates/**` and `dist/`. (Reworded 2026-09-26, CR-124 re-plan.)`

**RP-A4 — rules 14, 15, 16.** Append these notes:
- **Rule 14:** ` *2026-09-26: the full suite runs only in the merge lane (cli main checkout), so its outer writes land in the outer MAIN checkout only there; DevOps reverts exactly the paths `git diff --name-only` lists. A targeted run inside a nested cli worktree writes into that item's outer worktree (`<cli wt>/..`); revert there. The cli-main baseline numbers above are stale — use the previous merge's recorded total.*`
- **Rule 15:** ` *2026-09-26: in a nested worktree `META_ROOT = <cli wt>/..` is the item's own outer worktree, so these tests read the item's live-mirror edits before merge. The remaining pre-merge-red class is tests that read gitignored outer paths other than the symlinked `.claude` (e.g. `mcp/` in test_version_bump_alignment, integration tier).*`
- **Rule 16:** ` *2026-09-26: in a nested worktree the default META_ROOT already is the item's outer worktree — run the same file list without the override.*`

**RP-A5 — rule 17.** Append: ` *2026-09-26: `file_surface_diff.sh` picks the active item from the MAIN checkout's `state.json` by max `updated_at` (`:122-160`) and resolves only STORY ids. With parallel items, an outer commit on a STORY branch is made in the merge lane right after the orchestrator's own `update_state.mjs <ID>` transition, with no other STORY transition in between. During the build, twin edits stay uncommitted in the outer worktree and are re-derived at integration.*`

**RP-A6 — new rule 19** (append after rule 18):
`19. **Execution (contract-first; supersedes R1/rule 9).** Every unmerged cli item builds in a cli worktree nested in its outer worktree: outer `OUTER/.worktrees/<ID>` (`story/<ID>` from `sprint/S-41` for two-repo items; `--detach sprint/S-41` for cli-only items) and cli `OUTER/.worktrees/<ID>/cleargate-cli` (`story/<ID>` from the item's `base` in `plans/waves.json`). The orchestrator creates them serially, after committing the item's amendments: `git -C OUTER worktree add …`; `git -C OUTER/cleargate-cli worktree add OUTER/.worktrees/<ID>/cleargate-cli -b story/<ID> <base>`; `ln -s OUTER/cleargate-cli/node_modules <cli wt>/node_modules`; `ln -s OUTER/.claude <outer wt>/.claude` (`/.claude` is in `OUTER/.git/info/exclude`); `(cd <cli wt> && npm run prebuild)`. Never `npm install`/`npm ci` in a worktree — `node_modules` is shared. No agent edits files in the cli main checkout. Teardown after merge: both `git status --porcelain` empty, then `git -C OUTER/cleargate-cli worktree remove <cli wt>` first and `git -C OUTER worktree remove .worktrees/<ID>` second.`

**RP-A7 — new rule 20:**
`20. **Concurrency.** At most 4 build lanes (an agent working in a worktree), one merge lane (integration check, outer then cli merge, full suite, BD, boundary step — one item at a time, in the main checkouts) and one harness lane (exactly one clean-room harness run machine-wide, including QA-Verify runs from worktrees). The full `npm test` runs only in the merge lane. A harness run from a worktree passes `--ref story/<ID>` and `--container /Users/ssuladze/Documents/Dev/cg-cleanroom-<utc>-<id>` (the default container sits under `OUTER/.worktrees/` and is refused). Invoke `run_script.sh` as `ORCHESTRATOR_PROJECT_DIR=/Users/ssuladze/Documents/Dev/ClearGate bash /Users/ssuladze/Documents/Dev/ClearGate/.cleargate/scripts/run_script.sh …`. Dispatch briefs name the work item id on line 1 (token-ledger tuple match). The orchestrator commits every delivery-item amendment immediately and never leaves one uncommitted while a DevOps dispatch runs.`

**RP-A8 — new rule 21:**
`21. **Integration (CR-124).** An item integrates only after every `upstream` item has merged in both repos and its boundary step ran. In the item's worktrees: `git merge --no-ff main` (cli); twins are re-derived — discard the build copies, `git merge --no-ff sprint/S-41` (outer; cli-only hosts `git checkout --detach sprint/S-41`), `cp` from the integrated canonical, `cmp`. The owner's file wins and the item re-applies its insertions; `SANCTIONED_BASELINE_DELTAS` keep upstream rows first; an identical duplicate row is deleted; any other red-test or row conflict goes to QA-Red, never the Developer. Regenerate (`npm run gen:codex`, `--check`), rebuild the worktree, re-run the item's full verification (plan replan-contract-first.md §6), then QA-Verify and post-flight on the integrated tree. If cli `main` or `sprint/S-41` moves before the merge, re-integrate first.`

**RP-A9 — sprint plan §1.**
- Set `Parallel?` to `y` for BUG-090, BUG-096, BUG-097, BUG-098, CR-124, STORY-058-10, STORY-058-11, STORY-058-12 and STORY-058-13.
- Append under the table:
  `> **Amendment 2026-09-26T14:00Z (contract-first re-plan):** for unmerged items, Parallel? reads "builds in a parallel lane" (CR-124). Milestone values are unchanged: the dashboard groups by this table's Milestone column and never reads waves.json.`

**RP-A10 — sprint plan §2.1.** Insert at the top of §2.1:
```
> **Contract-first re-plan (2026-09-26, owner: "that's how i want cleargate to be planning sprints" / "the sprint also runs the same way from now on") — authoritative over the wave list below for every unmerged item.** Plan: `sprint-runs/SPRINT-41/plans/replan-contract-first.md`; machine plan: `plans/waves.json` (`schema_version: 2`).
> - **Contracts (cli):** C1 `contract/S-41-codex` = STORY-058-10 Developer commit `d0f0d95`; C4 `contract/S-41-fence` = BUG-090's Developer commit; C2 `contract/S-41-dispatch` = C1 + STORY-058-11 and CR-124 Developer commits; C3 `contract/S-41-loop` = STORY-058-12's pass-B commit. Frozen exports per the plan §2.
> - **Build now (4 lanes):** STORY-058-10 pass C, CR-124, STORY-058-11 (C1), BUG-090 (C1); then BUG-096, BUG-097; BUG-098 on C4; STORY-058-12 on C2; STORY-058-13 on C3.
> - **Integration edges:** BUG-090 and STORY-058-11 after STORY-058-10; BUG-098 after BUG-090; STORY-058-12 after STORY-058-10, STORY-058-11 and CR-124; STORY-058-13 after STORY-058-12 and BUG-090. BUG-096, BUG-097, CR-124 and STORY-058-10 have none.
> - **Merges** one at a time in the cli main checkout (now permanently on `main`) and on `sprint/S-41`; re-integrate if either moved. QA-Verify and post-flight run on the integrated tree; over-constrained reds are re-scoped by QA-Red.
> - **Boundaries:** BD after every cli merge; RS-4a after STORY-058-10; RS-4 after STORY-058-11 (live run → RS-4L, needs owner OD1, before RS-CLOSE); RS-CR after CR-124; RS-5 after STORY-058-12; step L (owner) before STORY-058-13's merge; RS-CLOSE last.
```

**RP-A11 — sprint plan §2.2.** Append these rows:
```
| `cleargate-cli/test/helpers/init-fixture.ts` | all remaining cli items except BUG-097 | tail order = merge order | One row per rel; shared enforcement row byte-identical (plan §7.5) |
| `…/.cleargate/knowledge/cleargate-enforcement.md` (+ twin) | STORY-058-11, CR-124, STORY-058-12 | 11 ∥ CR-124 → 12 | disjoint regions; 12 rewrites §16 b10 and appends §17 |
| `…/skills/sprint-execution/SKILL.md` | CR-124, STORY-058-12 | CR-124 → 12 | 12's renderer anchors and banned tokens; CR-124 edits only inside A2 plus §A.4 |
| `…/.cleargate/scripts/launch_wave.mjs` (+ twin) | CR-124, STORY-058-12 | CR-124 → 12 | disjoint regions (CR-124 new exports + launchWave; 12 header + validator) |
| `…/.codex/agents/*.toml` (generated) | STORY-058-11, CR-124 | second merger regenerates | prebuild `--check` |
| `…/scripts/clean-room/{codex-hooks,evidence}.mjs` | STORY-058-10, -11, -12, -13 | 10 → 11 → 12 → 13 | chained extensions |
| live `assert_story_files.mjs` ↔ `prep_reporter_context.mjs` / `dedupe_frontmatter.mjs` | BUG-090, BUG-098 | BUG-090 → BUG-098 (both repos) | ESM import link |
```

**RP-A12 — sprint plan §2.3.** Append these bullets:
- Parallel outer commits and the surface gate: rule 17 note (RP-A5).
- Harness runs are serialized, and from a worktree they need an explicit `--container` (rule 20).
- -12 renderer anchors and banned tokens constrain CR-124's SKILL.md text (plan §7.1).
- `check-no-exec-mode-vocab` bans "under v2", "v2 only" and similar in agent and skill text.

**RP-A13 — sprint plan §2.6.** Append:
```
**Remainder (contract-first, derived integration layers — `waves.json` `schema_version: 2`):**

| Layer | Items | Base | Integrates after |
|---|---|---|---|
| wave14 | STORY-058-10 | 35580b0 (pass C in its worktree) | — |
| cf-L0 | BUG-096, BUG-097, CR-124 | cli main | — |
| cf-L1 | BUG-090, STORY-058-11 | C1 | STORY-058-10 |
| cf-L2 | BUG-098, STORY-058-12 | C4, C2 | BUG-090; STORY-058-10 + STORY-058-11 + CR-124 |
| cf-L3 | STORY-058-13 | C3 | STORY-058-12, BUG-090 |
```

**RP-A14 — sprint plan §4.** Append the log line (same text as RP-A1), then this table, which the orchestrator fills at each merge (CR-124's dogfood evidence):
```
**Contract-first ledger (CR-124 dogfood):**

| Item | Base (sha) | Contract | Build start | Dev sha | Integrated on cli main | Re-syncs | QA-Red re-scopes | Merge (outer / cli) |
|---|---|---|---|---|---|---|---|---|
```

**RP-A15 — STORY-058-11.**
1. **§3.2**, append:
   > "Contract-first execution (CR-124; SPRINT-41 re-plan `plans/replan-contract-first.md`): built in `OUTER/.worktrees/STORY-058-11/cleargate-cli` on `story/STORY-058-11`, cut from `contract/S-41-codex` (STORY-058-10 Developer commit `d0f0d95`); integrates after STORY-058-10 merges. CR-124 edits `architect.md`, `architect-synth.md` and `architect-reader.md`; whichever of this story and CR-124 merges second runs `npm run gen:codex` after merging cli `main` and commits the regenerated `.codex/agents/architect*.toml`. The frozen pre-shim hooks (`test/fixtures/hooks-pre-058-11/`) are the canonical hooks at `contract/S-41-codex`; if STORY-058-10 later changes a hook, QA-Red re-freezes them at integration."
2. **§1.5 Risks**, append:
   > "The `cleargate-enforcement.md` M2 parity row is shared with CR-124 and STORY-058-12 (one row per rel); this story's QA-Red writes the byte-identical block pinned in `plans/replan-contract-first.md` §7.5, and the second of this story and CR-124 to merge deletes its identical copy."
3. **Task Breakdown**, append:
   `- [ ] Integrate: merge cli main after STORY-058-10 merges; regenerate codex copies; re-verify; QA-Verify (scripted harness, --container) and post-flight on the integrated tree`
4. **`plans/M5.md` -11 test 17** (append-only note there, RP-A19):
   - The enforcement row is the §7.5 shared block.
   - `bug085SentinelCurrentHash()` additionally refuses the post-(-10) hash, which QA-Red measures at `contract/S-41-codex` with pin substitution. The raw canonical sha256 at `d0f0d95` is `43a3cb26408109e7974f08db2dc38cf2cc2c4ea9e2fd6d5f23b556a6abfc1b30`.
5. **Ambiguity Gate status line:** `**Current Status: 🟢 Low** — restored 2026-09-26 by the SPRINT-41 contract-first re-plan (RP-A15): CR-124's agent-text change is handled by the regenerate-on-second-merge rule; sprint-execution stays out of this story's scope.`

**RP-A16 — STORY-058-12.**
1. **§1.2, bullet 2:** replace "Every other line, heading, and cross-reference stays byte-identical." with:
   > "Every other line, heading, and cross-reference stays byte-identical to the canonical `SKILL.md` at this story's integration base, which already carries CR-124's §A.4 edits and its new §C.0.2 (inside the A2 range, so the Codex rendering replaces it with R2)."
2. **§1.2**, append a bullet:
   > "Contract-first plans (CR-124): `dispatch-serial.md` §2 gains the paragraph pinned in the SPRINT-41 re-plan (RP-A16) — a serial host runs a `schema_version: 2` plan's derived `waves` in order, never cuts a story from a `contracts[]` branch, and cuts each story from `sprint/S-NN` after its `upstream` has merged."
3. **M6 appendix, `dispatch-serial.md`:** insert after §2's first paragraph (RP-A21 records it):
   > "**Contract-first plans.** A `waves.json` with `schema_version: 2` adds contracts and per-story `base` and `upstream`. A serial host ignores `contracts[]` and `base`: it runs the derived `waves` exactly as above, and it never starts a story before every story in its `upstream` has merged, so each story is cut from `sprint/S-NN` and the playbook's integration step (§C.0.2) is already satisfied."
4. **Test addition (M6 -12 test list):** `dispatch_serial.mjs next` over a `schema_version: 2` `waves.json` names stories in `waves` order and ignores `contracts`/`base`.
5. **M6 -12 init-fixture bullet:** no rows for `SKILL.md`, `launch_wave.mjs` or `cleargate-enforcement.md` (reuse CR-124's and the shared row). The `cleargate-protocol.md` row uses the refuse-baseline pattern. The 3 additions are unchanged.
6. **§3.2**, append:
   > "Contract-first execution: built in `OUTER/.worktrees/STORY-058-12/cleargate-cli` from `contract/S-41-dispatch` (C1 + STORY-058-11 and CR-124 Developer commits); integrates after STORY-058-10, STORY-058-11 and CR-124 merge. `launch_wave.mjs` edits stay within the header verdict-schema block and `validateVerdicts`; CR-124's `storyBases`, `integrationReady` and `launchWave({…, bases})` are untouched."
7. **§1.3 Out of Scope**, amend the EPIC-055 bullet:
   > "[[EPIC-055]]'s scheduler automation — Claude-path concurrency, unaffected; CR-124's contract-first protocol applies to wave-parallel hosts, and serial hosts read a `schema_version: 2` plan's derived waves in order (dispatch-serial.md §2)."
8. **Ambiguity Gate status line:** `**Current Status: 🟢 Low Ambiguity** — restored 2026-09-26 by the SPRINT-41 contract-first re-plan (RP-A16): the dispatch contract carries the build/integrate phases for serial hosts (dispatch-serial.md §2 paragraph) and the SKILL.md baseline is post-CR-124. Owner decisions are recorded in §1.4. Readiness is not implementation or runtime evidence; verification and DoD remain unchecked.`
9. **Task Breakdown**, append:
   `- [ ] Integrate: merge cli main after STORY-058-10, STORY-058-11 and CR-124 merge; re-verify renderer anchors on the integrated SKILL.md; QA-Verify and post-flight on the integrated tree`

**RP-A17 — EPIC-055.**
1. **§2 OUT-OF-SCOPE:** replace the two lines "Full per-story DAG scheduling (dropping waves entirely)…" and "Any change to the five-clause compatibility predicate or to `collision_surface.sh`." with:
   > "- *(Moved to [[CR-124]], delivered in SPRINT-41: the per-story contract-first DAG, `waves.json` `schema_version: 2` with per-story `upstream`, and the real-collision predicate. Derived `waves` remain the legible view.)*"
2. **§2 IN-SCOPE bullet 1:** replace the `depends_on` wording with:
   > "The ready-set scheduler consumes CR-124's per-story `upstream` edges and `contracts[]` from `waves.json` `schema_version: 2`."
3. **`<agent_context>` rule 1:** replace with:
   > "Must use the real-collision predicate and contract model from CR-124 (architect-synth.md) — do NOT redesign collision detection."
4. **Ambiguity Gate status line:** `**Current Status: 🟢 Ready for Decomposition** — re-scoped 2026-09-26 after [[CR-124]] (DAG + predicate moved to CR-124; this epic keeps scheduler automation: ready-set admission, segment budget, refcounted flashcard gate, worktree-add mutex, merge queue). Still sequenced behind [[CR-106]] and the SPIKE charter.`

**RP-A18 — CR-124.**
1. **§3 Execution Sandbox:** replace the Modify list with plan §7.2 items 1–9 plus the outer twins.
   - **Remove** `init_sprint.mjs` (it reads only `lane_assignments`, `:195-211`; `schema_version: 2` needs no change).
   - **Add** `cleargate-cli/scaffold/hosts/claude/.claude/agents/architect.md`, `cleargate-cli/test/helpers/init-fixture.ts`, `cleargate-cli/CHANGELOG.md`, the three new test files, and the conditional `.codex/agents/architect{,-synth,-reader}.toml` regeneration.
   - List the outer twins: `.cleargate/knowledge/cleargate-enforcement.md`, `.cleargate/scripts/launch_wave.mjs`, `.cleargate/templates/Sprint Plan Template.md`.
2. **§4:** the test table becomes:
   - Unit 17 (10 red, 7 anchors);
   - Integration 1;
   - E2E: the §4 Contract-first ledger;
   - the command list = the 3 new files plus the §7.4 anchors.
3. **Task Breakdown:** replace the rows with:
   - `- [ ] QA-Red: waves-json-v2 (init_sprint v1/v2, storyBases, launchWave bases, integrationReady, export guard), contract-first-dag-text (reader, synth, SKILL §A.4/§C.0.2 + -12 anchors, enforcement, template, architect.md, vocab), init-sprint-waves-v2 integration, 7 M2 rows incl. the shared enforcement row`
   - `- [ ] launch_wave.mjs: storyBases, integrationReady, launchWave bases (no header/validator change)`
   - `- [ ] architect-reader digest exports_provided / exports_consumed; architect-synth real-collision predicate, contract formation, schema_version 2 shape; architect.md §2.1 sentence`
   - `- [ ] SKILL.md §A.4 + §C.0 intro sentence + §C.0.2 (inside A2; -12 anchors byte-identical; no banned tokens outside A2)`
   - `- [ ] enforcement :103 wording; Sprint Plan Template §2.1 body; byte-copy the 3 twins`
   - `- [ ] Integrate: merge cli main; regenerate codex agent TOMLs if STORY-058-11 merged first; re-verify; QA-Verify + post-flight on the integrated tree`
   - `- [ ] RS-CR live re-sync of 3 agents + SKILL.md; dogfood ledger rows through close`
4. The gate stays 🟢: re-gate after the edit.

**RP-A19 — `plans/M5.md`.** Append `## Superseded by plans/replan-contract-first.md (2026-09-26)`:
- Order steps 2–5 and "No pair is parallelizable" are replaced by re-plan §3 and §6.
- -10 pass C runs in `OUTER/.worktrees/STORY-058-10/cleargate-cli`.
- -11 base is `contract/S-41-codex`.
- RS-4 step 5 becomes RS-4L.
- -11 test 17 uses the §7.5 shared row plus the post-(-10) sentinel refusal (RP-A15 item 4).

**RP-A20 — `plans/M5-fixwave.md`.** Append the same heading:
- Order items 1–5 ("strictly serial") and the bases "cut from cli main after the BUG-097 merge" and "after BUG-090 merges" are replaced: BUG-096 at `35580b0`, BUG-097 at `main`, BUG-090 at C1, BUG-098 at C4.
- The entry-gate greps run at integration.
- DevOps counts are the previous merge's total plus the item's own delta.
- The payload-identity baseline copy is taken immediately before each merge.
- Harness runs pass `--container`.

**RP-A21 — `plans/M6.md`.** Append the same heading:
- Entry: -12 builds from C2 and -13 from C3.
- The `[verify after …]` re-derivation runs against the contract branch.
- M5 is not required to be complete. RS-4's live run is RS-4L, and the close check still needs one live PASS.
- -12 init-fixture rows per RP-A16 item 5.
- The dispatch-serial.md paragraph per RP-A16 item 3.
- The v2 `next` test.
- RS-5 runs after RS-CR, and its dry-run list is unchanged.

**RP-A22 — `plans/waves.json`.** Replace it with §11 verbatim. `init_sprint.mjs` reads `lane_assignments`, which holds all 22 items.

**RP-A23 — sprint-context Adjacent Implementations.** After CR-124 merges, add:
`| CR-124 | `storyBases(plan)` → `{[id]: base}` (schema_version 2; unsafe or undeclared-contract base throws), `integrationReady(plan, storyId, mergedIds)`, `launchWave({…, bases})`; architect-reader `exports_provided`/`exports_consumed`; architect-synth real-collision predicate + contract formation + `schema_version: 2` shape | `cleargate-cli/scaffold/core/.cleargate/scripts/launch_wave.mjs`, `scaffold/hosts/claude/.claude/agents/architect-{reader,synth}.md` |`

**RP-A24 — owner ask, now, once:** OD1 (`plans/M5.md` OD1 command). It is needed before RS-4L or -13 step L, and it blocks nothing earlier.

---

## 11. Proposed `plans/waves.json` (schema_version 2)

```json
{
  "schema_version": 2,
  "sprint": "SPRINT-41",
  "generated_at": "2026-09-26T14:00:00Z",
  "generated_by": "architect",
  "role": "architect",
  "supersedes": "waves.json v1 (architect-synth 2026-09-24T22:53:37Z, fix-wave inserts at c8a42afe). The 13 merged items keep their v1 waves; every unmerged item is re-planned contract-first (CR-124; plans/replan-contract-first.md).",
  "story_count_in_milestone": 22,
  "story_count_planned": 22,
  "complete": true,
  "execution": {
    "mode": "contract-first-dag",
    "launch_wave_compatible": false,
    "note": "Built in parallel lanes, integrated in upstream order, merged one at a time. The orchestrator runs the protocol by hand (CR-124 §0.5) until EPIC-055's scheduler lands. launch_wave.mjs is not used for SPRINT-41: it cuts only outer-repo worktrees. Contract and story bases are cli refs, because the cli half is the one that builds; each outer story branch is cut from sprint/S-41.",
    "build_lanes": 4,
    "merge_lane": "One item at a time: integration check, outer half onto sprint/S-41, cli half onto cli main, full suite, BD, then the boundary step. Runs in the two main checkouts; the cli main checkout stays on main once STORY-058-10 merges.",
    "harness_lanes": 1,
    "lane_priority": [
      "STORY-058-13",
      "STORY-058-12",
      "STORY-058-10",
      "STORY-058-11",
      "CR-124",
      "BUG-090",
      "BUG-098",
      "BUG-096",
      "BUG-097"
    ],
    "worktree_layout": {
      "outer": "/Users/ssuladze/Documents/Dev/ClearGate/.worktrees/<ID>. Two-repo items: story/<ID> from sprint/S-41. Cli-only items: a detached host at sprint/S-41.",
      "cli": "/Users/ssuladze/Documents/Dev/ClearGate/.worktrees/<ID>/cleargate-cli, story/<ID> from stories.<ID>.base. <cli>/.. resolves to the item's own outer worktree.",
      "node_modules": "Symlink to /Users/ssuladze/Documents/Dev/ClearGate/cleargate-cli/node_modules. Never npm install or npm ci in a worktree.",
      "live_claude": "Symlink <outer wt>/.claude to /Users/ssuladze/Documents/Dev/ClearGate/.claude, with '/.claude' in OUTER/.git/info/exclude.",
      "prebuild": "Run (cd <cli wt> && npm run prebuild) once after the cut and again after every integration merge."
    },
    "owner_rulings": {
      "R1": "LIFTED 2026-09-26. Owner: 'i want this delivered in the sprint. so the sprint also runs the same way from now on'. Cli items build in nested worktrees (sprint-context rules 19-21). Merges stay local to cli main: no push, no publish.",
      "R2": "Carried. Live gitignored /.claude/** is re-synced only at boundary steps.",
      "R3": "Done (barrier B0).",
      "R4": "Carried."
    },
    "repo_field": "cli = cli worktree, then the cli main checkout at merge. outer = outer worktree, then sprint/S-41 at merge. both = outer half merges first, then the cli half (rule 15), then BD."
  },
  "contracts": [
    {
      "id": "C1",
      "branch": "contract/S-41-codex",
      "repo": "cli",
      "base": "d0f0d95",
      "owner_story": "STORY-058-10",
      "skeleton_commit": "None. The branch points at the owner's Developer commit.",
      "created_by": "orchestrator: git -C /Users/ssuladze/Documents/Dev/ClearGate/cleargate-cli branch contract/S-41-codex d0f0d95",
      "create_when": "now",
      "frozen_exports": [
        "src/hosts/codex.ts: codexAdapter, createCodexAdapter, CODEX_HOOKS_JSON, CODEX_CONFIG_TOML",
        "src/hosts/types.ts: HostAdapter.preflight, rootLevelSurgeryTargets",
        "src/lib/install-view.ts: openInstallView(opts: OpenInstallViewOpts): InstallView, InstallViewError",
        "src/lib/scaffold-layout.mjs: composePayload(roots, dst, { ensureRequiredEmptyDirs, skipRootFiles })",
        "src/init/inject-codex-config.ts: planCodexConfig, injectCodexConfig, assertCodexConfigParsable, removeCodexMcpServer, readCodexFeaturesHooks, CodexConfigError",
        "src/hooks/normalized-event.ts: editTargets, applyPatchTargets, plus the 'cleargate hook edit-targets' verb",
        "src/hooks/hook-signal.ts: HOST_SIGNAL_MAP.codex",
        "src/commands/verify-install.ts: HOST_VERIFIERS.codex",
        "scripts/build-codex-payload.mjs: CODEX_HOOK_SCRIPTS, planCodexPayload (rel relative to <cliRoot>/scaffold), --write/--check",
        "scripts/clean-room/*: the signatures pinned by M5-A36..A38: runCodexHooks(options) -> { exitCode, result, verdicts, summaryPath }; codexHookVerdicts(inputs); renderCodexRunSection(run); checkCodexEvidence; startMockResponses({ script }); CodexAppServer.start({ bin, cwd, env }); stripInstructionsBlock(raw); S3_PROMPT and plantAgentsMdCanary. NOT frozen: driveScriptedTurn/runTurn internals and the mock item shapes (-10 pass C owns them).",
        "test/helpers/init-fixture.ts: the 3 STORY-058-10 rows and the BUG085_SENTINEL_POST refusal",
        "scaffold/hosts/claude/.claude/hooks/{pre-edit-gate,stamp-and-gate,pending-task-sentinel,token-ledger}.sh: bytes at d0f0d95"
      ],
      "change_rule": "If the STORY-058-10 QA-Verify or post-flight bounce changes a frozen export or a hook byte, record the new SHA in sprint §4. Each consumer re-scopes at integration (QA-Red for tests). Never cherry-pick.",
      "consumers": [
        "STORY-058-11",
        "BUG-090",
        "C4",
        "C2"
      ],
      "base_note": "story/STORY-058-10 after Developer passes A and B (pass-B report: outer 55ec1af8). Pass C changes only the clean-room scripted-session internals, which are not frozen."
    },
    {
      "id": "C4",
      "branch": "contract/S-41-fence",
      "repo": "cli",
      "base": "story/BUG-090",
      "owner_story": "BUG-090",
      "skeleton_commit": "None. The branch points at the owner's Developer commit.",
      "created_by": "orchestrator: git -C .../cleargate-cli branch contract/S-41-fence <BUG-090 Dev SHA>",
      "create_when": "BUG-090's Developer report is green on its make-green set",
      "frozen_exports": [
        "scaffold/core/.cleargate/scripts/assert_story_files.mjs: locateFrontmatterFence(raw) -> {start,end,yamlStart,yamlEnd,eol} | null. Throws 'locateFrontmatter: missing closing ---' | 'locateFrontmatter: unterminated <instructions> block' | 'locateFrontmatter: unterminated Markdown fence'.",
        "scaffold/core/.cleargate/scripts/assert_story_files.mjs: assertWorkItemApproved(filePath)",
        "test/helpers/init-fixture.ts: the 5 BUG-090 rows"
      ],
      "change_rule": "Same as C1.",
      "consumers": [
        "BUG-098"
      ],
      "base_at": "<BUG-090 Developer SHA, recorded in sprint §4>"
    },
    {
      "id": "C2",
      "branch": "contract/S-41-dispatch",
      "repo": "cli",
      "base": "contract/S-41-codex",
      "owner_story": [
        "STORY-058-11",
        "CR-124"
      ],
      "skeleton_commit": "Two merge commits plus one 'npm run gen:codex' regeneration commit. Written by a DevOps dispatch in OUTER/.worktrees/contract-S-41-dispatch/cleargate-cli, which is torn down after the branch is pushed locally.",
      "created_by": "DevOps dispatch (mechanical resolution only: CHANGELOG keeps both entries; init-fixture tail keeps both item row sets and drops one copy of the identical shared cleargate-enforcement.md row; regenerate the .codex/agents TOMLs; any other conflict halts)",
      "create_when": "STORY-058-11 and CR-124 Developer reports are both green",
      "frozen_exports": [
        "STORY-058-11: PORTABLE_SKILLS and the core/.agents/skills planCodexPayload entries; the TIER_RULES .codex/agents/** and .agents/skills/** rows; cg_repo_root in scaffold/hosts/claude/.claude/hooks/lib/harness.sh; SanctionedAddition and SANCTIONED_BASELINE_ADDITIONS with the addition-aware captureOrCompare; the codex.live.roles and codex.live.skills verdicts; cleargate-enforcement.md §16 (10 bullets, M5 text)",
        "CR-124: launch_wave.mjs storyBases(plan), integrationReady(plan, storyId, mergedIds), launchWave({ ..., bases }); SKILL.md §A.4 and §C.0.2 with the -12 anchors preserved; the 7 CR-124 init-fixture rows, including the shared cleargate-enforcement.md row"
      ],
      "check_before_handoff": "npm run typecheck; node scripts/build-codex-payload.mjs --check; each owner's make-green set, targeted",
      "change_rule": "Same as C1.",
      "consumers": [
        "STORY-058-12"
      ],
      "merges": [
        "story/STORY-058-11@<Dev SHA>",
        "story/CR-124@<Dev SHA>"
      ]
    },
    {
      "id": "C3",
      "branch": "contract/S-41-loop",
      "repo": "cli",
      "base": "story/STORY-058-12",
      "owner_story": "STORY-058-12",
      "skeleton_commit": "None. The branch points at the owner's Developer commit.",
      "created_by": "orchestrator: git -C .../cleargate-cli branch contract/S-41-loop <-12 pass-B SHA>",
      "create_when": "STORY-058-12 pass-B Developer report is green",
      "frozen_exports": [
        "scaffold/core/.cleargate/scripts/dispatch_serial.mjs: SERIAL_EXIT, sprintBranchFor, serialLogPath, readVerdictLog, nextAction, dispatchSerial, plus the next/record CLI (M6 AD-M6-4)",
        "scaffold/core/.cleargate/scripts/launch_wave.mjs: validateVerdicts(verdicts, { mode: 'wave' | 'serial' })",
        "scripts/codex-sprint-execution.mjs: CODEX_SKILL_BANNED, CODEX_SKILL_REPLACEMENTS, renderCodexSprintExecution",
        "src/hosts/types.ts: DispatchMode and HostAdapter.dispatchMode; src/hosts/registry.ts: SERIAL_DISPATCH_SURFACE"
      ],
      "change_rule": "Same as C1.",
      "consumers": [
        "STORY-058-13"
      ],
      "base_at": "<-12 pass-B Developer SHA, recorded in sprint §4>"
    }
  ],
  "stories": {
    "BUG-089": {
      "state": "merged",
      "wave": "wave1"
    },
    "BUG-067": {
      "state": "merged",
      "wave": "wave2"
    },
    "CR-123": {
      "state": "merged",
      "wave": "wave3"
    },
    "STORY-058-01": {
      "state": "merged",
      "wave": "wave4"
    },
    "STORY-058-02": {
      "state": "merged",
      "wave": "wave5"
    },
    "STORY-058-03": {
      "state": "merged",
      "wave": "wave6"
    },
    "STORY-058-04": {
      "state": "merged",
      "wave": "wave7"
    },
    "STORY-058-06": {
      "state": "merged",
      "wave": "wave8"
    },
    "STORY-058-05": {
      "state": "merged",
      "wave": "wave9"
    },
    "STORY-058-07": {
      "state": "merged",
      "wave": "wave10"
    },
    "BUG-085": {
      "state": "merged",
      "wave": "wave11"
    },
    "STORY-058-08": {
      "state": "merged",
      "wave": "wave12"
    },
    "STORY-058-09": {
      "state": "merged",
      "wave": "wave13"
    },
    "STORY-058-10": {
      "state": "building (pass C)",
      "base": "35580b0",
      "upstream": [],
      "repo": "cli",
      "outer_worktree": "detached host",
      "worktree": "Migrated before pass C: git -C cleargate-cli checkout main, then git -C cleargate-cli worktree add OUTER/.worktrees/STORY-058-10/cleargate-cli story/STORY-058-10 (existing branch, no -b)",
      "loop": "Developer pass C (test 46 scripted session C2-C6) -> integrate -> QA-Verify (harness lane) in parallel with post-flight -> DevOps",
      "plan": "plans/M5.md STORY-058-10",
      "boundary_after": [
        "BD",
        "RS-4a"
      ]
    },
    "BUG-096": {
      "state": "build-now",
      "base": "35580b0",
      "upstream": [],
      "repo": "cli",
      "outer_worktree": "detached host",
      "loop": "QA-Red -> Developer -> QA-Verify -> DevOps (TPV and post-flight only on a pre-gate flag)",
      "plan": "plans/M5-fixwave.md BUG-096",
      "boundary_after": [
        "BD"
      ]
    },
    "BUG-097": {
      "state": "queued",
      "base": "main",
      "upstream": [],
      "repo": "cli",
      "outer_worktree": "detached host",
      "loop": "QA-Red -> Developer -> QA-Verify -> DevOps (TPV and post-flight only on a pre-gate flag)",
      "plan": "plans/M5-fixwave.md BUG-097",
      "boundary_after": [
        "BD"
      ],
      "base_note": "cli main tip when its lane opens"
    },
    "CR-124": {
      "state": "build-now",
      "base": "35580b0",
      "upstream": [],
      "repo": "both",
      "repo_order": [
        "outer",
        "cli",
        "dist-rebuild"
      ],
      "loop": "QA-Red -> live TPV -> Developer -> QA-Verify -> live post-flight -> DevOps",
      "plan": "plans/replan-contract-first.md §7",
      "boundary_after": [
        "BD",
        "RS-CR"
      ]
    },
    "BUG-090": {
      "state": "build-now",
      "base": "contract/S-41-codex",
      "upstream": [
        "STORY-058-10"
      ],
      "repo": "both",
      "repo_order": [
        "outer",
        "cli",
        "dist-rebuild"
      ],
      "loop": "QA-Red -> live TPV -> Developer -> QA-Verify (one harness run, harness lane) -> live post-flight -> DevOps",
      "plan": "plans/M5-fixwave.md BUG-090",
      "boundary_after": [
        "BD"
      ]
    },
    "STORY-058-11": {
      "state": "build-now",
      "base": "contract/S-41-codex",
      "upstream": [
        "STORY-058-10"
      ],
      "repo": "both",
      "repo_order": [
        "outer",
        "cli",
        "dist-rebuild"
      ],
      "loop": "QA-Red -> TPV -> Developer -> QA-Verify (scripted harness, harness lane) -> post-flight -> DevOps",
      "plan": "plans/M5.md STORY-058-11 + RP-A15",
      "boundary_after": [
        "BD",
        "RS-4"
      ]
    },
    "BUG-098": {
      "state": "waits-for-contract C4",
      "base": "contract/S-41-fence",
      "upstream": [
        "BUG-090"
      ],
      "repo": "both",
      "repo_order": [
        "outer",
        "cli",
        "dist-rebuild"
      ],
      "loop": "QA-Red -> live TPV -> Developer -> QA-Verify -> live post-flight -> DevOps",
      "plan": "plans/M5-fixwave.md BUG-098",
      "boundary_after": [
        "BD"
      ]
    },
    "STORY-058-12": {
      "state": "waits-for-contract C2",
      "base": "contract/S-41-dispatch",
      "upstream": [
        "STORY-058-10",
        "STORY-058-11",
        "CR-124"
      ],
      "repo": "both",
      "repo_order": [
        "outer",
        "cli",
        "dist-rebuild"
      ],
      "loop": "QA-Red -> TPV -> Developer pass A -> Developer pass B -> QA-Verify (scripted harness, harness lane) -> post-flight -> DevOps",
      "plan": "plans/M6.md STORY-058-12 + RP-A16 + RP-A21",
      "boundary_after": [
        "BD",
        "RS-5"
      ]
    },
    "STORY-058-13": {
      "state": "waits-for-contract C3",
      "base": "contract/S-41-loop",
      "upstream": [
        "STORY-058-12",
        "BUG-090"
      ],
      "repo": "both",
      "repo_order": [
        "outer",
        "cli",
        "dist-rebuild"
      ],
      "loop": "QA-Red -> TPV -> Developer pass A -> Developer pass B -> QA-Verify (harness lane) -> post-flight -> step L (owner) -> DevOps",
      "plan": "plans/M6.md STORY-058-13 + RP-A21",
      "owner_actions": [
        "STEP-L"
      ],
      "boundary_after": [
        "BD",
        "RS-CLOSE"
      ]
    }
  },
  "waves": [
    {
      "wave": "wave1",
      "stories": [
        "BUG-089"
      ],
      "parallel": false,
      "status": "merged",
      "rationale": "v1 M0"
    },
    {
      "wave": "wave2",
      "stories": [
        "BUG-067"
      ],
      "parallel": false,
      "status": "merged",
      "rationale": "v1 M0"
    },
    {
      "wave": "wave3",
      "stories": [
        "CR-123"
      ],
      "parallel": false,
      "status": "merged",
      "rationale": "v1 M0->M1"
    },
    {
      "wave": "wave4",
      "stories": [
        "STORY-058-01"
      ],
      "parallel": false,
      "status": "merged",
      "rationale": "v1 M1"
    },
    {
      "wave": "wave5",
      "stories": [
        "STORY-058-02"
      ],
      "parallel": false,
      "status": "merged",
      "rationale": "v1 M1"
    },
    {
      "wave": "wave6",
      "stories": [
        "STORY-058-03"
      ],
      "parallel": false,
      "status": "merged",
      "rationale": "v1 M2"
    },
    {
      "wave": "wave7",
      "stories": [
        "STORY-058-04"
      ],
      "parallel": false,
      "status": "merged",
      "rationale": "v1 M2"
    },
    {
      "wave": "wave8",
      "stories": [
        "STORY-058-06"
      ],
      "parallel": false,
      "status": "merged",
      "rationale": "v1 M3"
    },
    {
      "wave": "wave9",
      "stories": [
        "STORY-058-05"
      ],
      "parallel": false,
      "status": "merged",
      "rationale": "v1 M3"
    },
    {
      "wave": "wave10",
      "stories": [
        "STORY-058-07"
      ],
      "parallel": false,
      "status": "merged",
      "rationale": "v1 M3"
    },
    {
      "wave": "wave11",
      "stories": [
        "BUG-085"
      ],
      "parallel": false,
      "status": "merged",
      "rationale": "v1 M3"
    },
    {
      "wave": "wave12",
      "stories": [
        "STORY-058-08"
      ],
      "parallel": false,
      "status": "merged",
      "rationale": "v1 M4"
    },
    {
      "wave": "wave13",
      "stories": [
        "STORY-058-09"
      ],
      "parallel": false,
      "status": "merged",
      "rationale": "v1 M4"
    },
    {
      "wave": "wave14",
      "stories": [
        "STORY-058-10"
      ],
      "parallel": false,
      "status": "building",
      "milestone": "M5",
      "rationale": "v1 wave14. Developer passes A and B are at d0f0d95 (contract C1). Pass C (test 46) runs in its nested worktree. It has no upstream, so it merges when ready."
    },
    {
      "wave": "cf-L0",
      "stories": [
        "BUG-096",
        "BUG-097",
        "CR-124"
      ],
      "parallel": true,
      "derived": true,
      "milestone": "M5",
      "after": [],
      "rationale": "Derived integration layer 0: no unmerged upstream. All three build now (BUG-097 when a lane frees). Merges are serial, in ready order."
    },
    {
      "wave": "cf-L1",
      "stories": [
        "BUG-090",
        "STORY-058-11"
      ],
      "parallel": true,
      "derived": true,
      "milestone": "M5",
      "after": [
        "wave14"
      ],
      "rationale": "Derived layer 1: upstream STORY-058-10. Both build now from C1 and integrate after STORY-058-10 merges."
    },
    {
      "wave": "cf-L2",
      "stories": [
        "BUG-098",
        "STORY-058-12"
      ],
      "parallel": true,
      "derived": true,
      "milestone": "M5/M6",
      "after": [
        "cf-L0",
        "cf-L1"
      ],
      "rationale": "Derived layer 2. BUG-098 builds from C4 and integrates after BUG-090. STORY-058-12 builds from C2 and integrates after STORY-058-11 and CR-124."
    },
    {
      "wave": "cf-L3",
      "stories": [
        "STORY-058-13"
      ],
      "parallel": false,
      "derived": true,
      "milestone": "M6",
      "after": [
        "cf-L1",
        "cf-L2"
      ],
      "rationale": "Derived layer 3. Builds from C3 and integrates after STORY-058-12 and BUG-090. Owner step L comes before its merge."
    }
  ],
  "merge_queue": {
    "rule": "One merge at a time. An item enters the queue once integrationReady holds (all upstream merged) and its QA-Verify and post-flight have passed on the integrated tree. Ties go to lane_priority order. Every cli merge is followed by BD, then by the item's boundary step, before the next merge.",
    "expected_order": [
      "CR-124 | BUG-096 | STORY-058-10 (ready order; none has an upstream)",
      "STORY-058-11 | BUG-090 (after STORY-058-10)",
      "BUG-097",
      "BUG-098 (after BUG-090)",
      "STORY-058-12 (after STORY-058-11 and CR-124)",
      "STORY-058-13 (after STORY-058-12 and BUG-090)"
    ]
  },
  "barrier_steps": [
    {
      "id": "B0",
      "item": "BUG-085",
      "kind": "operational-step",
      "status": "done"
    }
  ],
  "boundary_steps": [
    {
      "id": "BD",
      "when": "after every cli merge, in the merge lane",
      "action": "npm run build from cli main in the cli main checkout (OUTER/cleargate-cli). Live hooks run OUTER/cleargate-cli/dist/cli.js. Worktree builds never touch it."
    },
    {
      "id": "RS-1",
      "status": "done"
    },
    {
      "id": "RS-2",
      "status": "done"
    },
    {
      "id": "RS-3",
      "status": "done"
    },
    {
      "id": "RS-4a",
      "after": "STORY-058-10 BD",
      "blocks": "the next cli merge",
      "action": "Procedure: plans/M5.md RS-4a, plus step 3b (canonical-live-parity 5d PASS)."
    },
    {
      "id": "RS-4",
      "after": "STORY-058-11 BD",
      "blocks": "the next cli merge",
      "action": "plans/M5.md RS-4 steps 1-4, then the scripted half of step 6 (claude-baseline check), then step 7. FW-A8 applies: no --known-fail; sprint-init PASS x2. The live codex run (step 5) moves to RS-4L."
    },
    {
      "id": "RS-4L",
      "after": "RS-4 and owner action OD1",
      "blocks": "RS-CLOSE only",
      "action": "codex-hooks.mjs run --provider live --codex-home <DEDICATED_CODEX_HOME> --label 'RS-4L live' -> PASS, then codex-hooks.mjs check exit 0. Run it in the harness lane, from the cli main checkout, at any point before RS-CLOSE."
    },
    {
      "id": "RS-CR",
      "after": "CR-124 BD",
      "blocks": "RS-5",
      "action": "Run node OUTER/.cleargate/sprint-runs/SPRINT-41/b0-live-resync.mjs (dry run). The drift list must be exactly agents/architect.md, agents/architect-synth.md, agents/architect-reader.md and skills/sprint-execution/SKILL.md. Then run it with --apply, check shasum live == canonical, and check that node OUTER/cleargate-cli/dist/cli.js doctor shows no drift. No restart: agents take effect at the next session start, the skill at its next load."
    },
    {
      "id": "RS-5",
      "after": "STORY-058-12 BD",
      "blocks": "the next cli merge",
      "action": "Procedure: plans/M6.md RS-5 with FW-A10 applied (no --known-fail). The dry-run list must be exactly skills/sprint-execution/SKILL.md (changed) and skills/sprint-execution/dispatch-serial.md (new)."
    },
    {
      "id": "RS-CLOSE",
      "after": "STORY-058-13 BD",
      "action": "Run the v1 RS-CLOSE text without --known-fail, plus the M6 codex-loop close run and check, then the owner walkthrough, the Reporter, and close_sprint.mjs (Gate 4). The claude-baseline, codex-hooks and codex-loop runs are serial in the harness lane."
    }
  ],
  "owner_actions": [
    {
      "id": "OD1",
      "what": "Log in DEDICATED_CODEX_HOME (plans/M5.md OD1 command). No agent reads, copies or writes credential material.",
      "ask": "now, non-blocking",
      "needed_by": "RS-4L or STORY-058-13 step L, whichever comes first"
    },
    {
      "id": "STEP-L",
      "what": "Trust the workspace and exact hooks in the Codex TUI for STORY-058-13's prepared room (plans/M6.md step L)",
      "needed_by": "STORY-058-13 DevOps"
    },
    {
      "id": "GATE-4",
      "what": "Explicit close authorization",
      "needed_by": "close_sprint.mjs --assume-ack"
    }
  ],
  "refused": [],
  "blocked": [],
  "lane_assignments": {
    "BUG-096": "standard",
    "BUG-097": "standard",
    "BUG-090": "standard",
    "BUG-098": "standard",
    "BUG-089": "standard",
    "BUG-067": "standard",
    "CR-123": "standard",
    "CR-124": "standard",
    "STORY-058-01": "standard",
    "STORY-058-02": "standard",
    "STORY-058-03": "standard",
    "STORY-058-04": "standard",
    "STORY-058-06": "standard",
    "STORY-058-05": "standard",
    "STORY-058-07": "standard",
    "BUG-085": "standard",
    "STORY-058-08": "standard",
    "STORY-058-09": "standard",
    "STORY-058-10": "standard",
    "STORY-058-11": "standard",
    "STORY-058-12": "standard",
    "STORY-058-13": "standard"
  },
  "lane_changes": [
    {
      "storyId": "BUG-067",
      "from": "fast",
      "to": "standard",
      "failing_checks": [
        1,
        2,
        6
      ],
      "note": "applied (D2)"
    },
    {
      "storyId": "BUG-085",
      "from": "fast",
      "to": "standard",
      "failing_checks": [
        1,
        2,
        7
      ],
      "note": "applied (D2)"
    }
  ],
  "rulings": {
    "real_collisions_only": "parallel_eligible and db_write_set are hints (CR-124). The only serializing surfaces in the remainder are the ordered artifacts in plans/replan-contract-first.md §1.",
    "shared_sanctioned_rows": "One SANCTIONED_BASELINE_DELTAS row per rel. The shared cleargate-enforcement.md row is byte-identical in STORY-058-11 and CR-124 (RP-A15, §7). SKILL.md and launch_wave.mjs rows belong to CR-124; STORY-058-12 reuses them.",
    "codex_agent_regen": "Whichever of STORY-058-11 and CR-124 merges second runs npm run gen:codex after merging main.",
    "fix_wave_placement": "Superseded. BUG-096/BUG-097 are in cf-L0, BUG-090 in cf-L1, BUG-098 in cf-L2.",
    "BUG-085_placement": "carried (merged)",
    "CR-123_placement": "carried (merged)",
    "STORY-058-05_reorder": "carried (merged)"
  },
  "dispatch_blockers": [],
  "dispatch_blockers_v1": "D1-D5 resolved. See waves.json v1 at outer commit c8a42afe.",
  "predicate_notes": {
    "v1": "See waves.json v1 at c8a42afe. The five-clause predicate governed waves 1-14.",
    "remainder": "Real-collision predicate (CR-124): ordered journals, single-writer generated artifacts, and shared files needing ordered edits. See plans/replan-contract-first.md §1 for the per-item analysis."
  }
}
```

---

## Cross-story risks

- **-10's pass C and the codex harness chain.**
  - -11, -12 and -13 extend `codex-hooks.mjs`/`evidence.mjs`, and pass C rewrites the scripted-session internals of those files.
  - Integration conflicts land there, and the pass-C code wins.
  - -11's `codex.live.roles` scripted verdict needs a working C6 spawn, so -11's QA-Verify harness run can only go green on a tree that contains pass C. That is why it runs after integration.
- **Shared enforcement row.** If either QA-Red deviates from §7.5 by one byte, the duplicate stops being mechanical: the second item's QA-Red must re-scope, and C2 halts.
- **C2 stacks two unmerged branches.** A later bounce in -11 or CR-124 reaches -12 only at integration. The orchestrator records every owner SHA change in §4.
- **Surface gate.** Parallel STORY outer commits get cross-judged unless RP-A5's discipline holds. BUG and CR commits skip the check (fail-open, logged follow-up).
- **Live drift windows.**
  - After -10 merges and before RS-4a: 4 hooks.
  - After CR-124 merges and before RS-CR: 3 agents and SKILL.md.

  The session-start banner shows drift during these windows, and each is closed immediately in the merge lane.
- **The agent registry caches at session start.** The live SDR agents change only at the next session. This sprint's remaining execution follows this file by hand, so nothing waits on it.
- **The M2 baseline is a single point of evidence.** Compare mode only, kept until RS-CLOSE. If it is lost, the parity pair skips; record the loss and rely on RS-4, RS-5 and RS-CLOSE.

## Open decisions for orchestrator

None need the owner's sign-off.
- The R1 lift, the lane cap, the nested layout, the contracts and RS-4L are within the owner's 2026-09-26 directive and the sprint autonomy mandate.
- OD1 and step L are owner **actions**: ask for OD1 now.
- The one judgement call to surface in the next status line: the cli main checkout switches to `main` now (step 0), between -10's pass B and pass C, so the merge lane can take BUG-096 or CR-124 before -10 merges.

## Flashcards

- `2026-09-26 · #worktree #cross-repo #test-harness · Nest the cli worktree at .worktrees/<ID>/cleargate-cli: every <cli>/.. META_ROOT read hits the item's own outer tree.`
- `2026-09-26 · #worktree #test-harness · Outer worktrees lack gitignored /.claude; symlink it to live and add '/.claude' to .git/info/exclude (dir rule misses links).`
- `2026-09-26 · #worktree #npm · cli package-lock.json is gitignored and ~/.npm lacks toml-eslint-parser: npm ci --offline fails; symlink node_modules.`
- `2026-09-26 · #worktree #build · prebuild+build inside a cli worktree take ~4s and write only its templates/ and dist/; safe there, never in CLI main.`
- `2026-09-26 · #clean-room #worktree · Harness default container is CLI_ROOT/../..; from a nested worktree that is inside OUTER — refused. Pass --container.`
- `2026-09-26 · #test-harness #tmp · host-adapter-contract.red.node.test.ts:91 leaks cg-s41-contract-payload-* dirs; BUG-096 covers init-fixture only.`
- `2026-09-26 · #surface-gate #worktree · Commit a STORY outer half right after its own update_state: the gate judges MAIN state.json's max updated_at.`
- `2026-09-26 · #scripts #vocab · check-no-exec-mode-vocab bans 'under v2', 'v2 only', 'v2-only', 'v2 block' in scaffold/src text; write 'schema_version: 2'.`
- `2026-09-26 · #test-harness #init · One SANCTIONED_BASELINE_DELTAS row per rel: a second row fails its baseline assert. Share a byte-identical row.`
- `2026-09-26 · #codex #skill · -12's renderer throws on banned tokens outside its anchored ranges; new SKILL.md text outside §C.0 must avoid them.`
- `2026-09-26 · #dashboard · The dashboard groups by the sprint plan's first Story ID+Title table (Milestone column); it never reads waves.json.`
- `2026-09-26 · #test-harness #ports · cr097/cr101 dashboard tests bind fixed ports (4731, 43811-3): never run two full suites at once.`
- `2026-09-26 · #scripts #env · Agent Bash has no CLAUDE_PROJECT_DIR: run_script.sh falls to git toplevel; set ORCHESTRATOR_PROJECT_DIR explicitly.`
- `2026-09-26 · #scripts #init-sprint · init_sprint.mjs reads only waves.json lane_assignments (:195-211); additive schema fields need no code change.`
- `2026-09-26 · #git #worktree · git clone of a linked-worktree path works; a plain clone checks out that worktree's branch, so pass --branch.`

## Script Incidents

None. `run_script.sh` was not invoked.

Everything written went into:
- the scratch clone `/private/tmp/cg-s41-replan`, deleted at the end;
- the session scratchpad.

Side effects outside those:
- About 45 fixture temp dirs from the probe's targeted runs remain in `/private/tmp`, under the BUG-096 leak prefixes. The fixture itself creates them. Other agents were writing the same prefixes at the same time, so they are left for BUG-096's hygiene step (`-mmin +60`).
- `npm ci --offline` wrote one debug log to `~/.npm/_logs/`.
- The real cli main checkout, the outer checkout, the M2 baseline and `/private/tmp/cg-s41-fresh-journey` were not touched: every read was `git -C … show/log/diff/status`.

Version check skipped: no remaining item adds or changes a dependency.

STATUS=done
