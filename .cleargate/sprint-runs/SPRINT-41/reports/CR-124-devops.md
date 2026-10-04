# DevOps Report — CR-124

role: devops

Merge lane for CR-124 (contract-first build-then-integrate sprint DAG: `storyBases`/`integrationReady`/`launchWave` per-story bases in `launch_wave.mjs`; real-collision predicate + Contract formation in `architect-synth.md`; `architect.md` §2.1 DAG sentence; `architect-reader.md` `exports_provided`/`exports_consumed`; SKILL.md §A.4 + new §C.0.2; `cleargate-enforcement.md:103` wording; `Sprint Plan Template.md` §2.1 DAG example). Two-repo, one turn, per `plans/replan-contract-first.md` §7.6 + §8 RS-CR (rule 15 order: outer merged first, cli second, RS-CR follows BD). `CLI` = `/Users/ssuladze/Documents/Dev/ClearGate/cleargate-cli` (main checkout, stayed on `main` throughout except the two merges below). `OUTER` = `/Users/ssuladze/Documents/Dev/ClearGate` (`sprint/S-41`).

Entering this dispatch, CR-124 had already run QA-Red → live TPV → Dev → integrate → QA-Verify RE-RUN → live Architect post-flight (all PASS) against cli main `984e8d5`, then re-integrated a second time onto the same `984e8d5` tip after BUG-097/BUG-090 advanced main (`CR-124-reintegrate.md`, `CR-124-qa2.md`, both PASS). `<cw>` = `.worktrees/CR-124/cleargate-cli` (`story/CR-124` @ `687e288`); `<ow>` = `.worktrees/CR-124` (`story/CR-124` @ `dbac3ab3`, 3 twins uncommitted).

## 0. Re-sync check

- `git -C CLI merge-base --is-ancestor main story/CR-124` → exit 0 (main had not moved since `984e8d5`; `story/CR-124`'s re-integrate tip `687e288` contains it).
- `git -C CLI status --porcelain` → only `?? cleargate-0.25.0.tgz`.
- `git -C OUTER status --porcelain` → only the 4 sprint ledger files.
- No re-sync needed; proceeded straight to the merge lane.

## 1. Payload-identity baseline (pre-merge)

`cp -R CLI/templates/cleargate-planning /private/tmp/cg-s41-payload-pre-cr124` — **81 files** (80 payload + `MANIFEST.json`), taken before either merge.

## 2. Outer twin commit (Rule 17)

- `cmp` of all 3 `<ow>/.cleargate/{knowledge,scripts,templates}/*` against `<cw>/scaffold/core/.cleargate/{knowledge,scripts,templates}/*`: **all 3 already identical** (the re-integrate/QA-Verify passes had already confirmed this; no `cp` re-derivation needed).
- Ran `cd OUTER && CLEARGATE_STATE_FILE=$PWD/.cleargate/sprint-runs/SPRINT-41/state.json node .cleargate/scripts/update_state.mjs CR-124 "Architect Passed"` immediately before committing, per instruction. Result: `No-op: CR-124 is already in state "Architect Passed"` (CR-124 is a non-STORY id, so the surface-gate active-item resolution has no STORY candidate regardless).
- `git -C <ow> add` the 3 twin paths and committed on `story/CR-124`:
  - **Commit SHA: `f45be142884ee29073fbe891a0d40e15ef005318`** — `chore(CR-124): live mirror — byte-copy 3 canonical twins (enforcement, launch_wave.mjs, Sprint Plan Template)`.
  - Pre-commit hooks ran normally (`check:no-vitest` clean, `no inline work-item-id regexes` clean). Surface gate printed `[surface-gate] WARNING: No active story file found (searched .worktrees/CR-124 and OUTER) — skipping surface check` — did not block, `SKIP_SURFACE_GATE` was **not** set (story-branch commit).
  - `3 files changed, 42 insertions(+), 8 deletions(-)`.

## 3. Outer merge FIRST

`git -C OUTER status --porcelain` → only the 4 ledger files (unchanged by the worktree commit above).

`git -C OUTER merge --no-ff story/CR-124 -m "merge(story/CR-124): contract-first build-then-integrate DAG (live mirror twins)"` — **clean, no conflicts.**

- **Outer merge commit SHA: `01fd3bbc60e7694d2bc1c5eb190416e06d772ad7`.**
- Diff stat: **3 files changed, 42 insertions(+), 8 deletions(-)** — exactly `.cleargate/knowledge/cleargate-enforcement.md`, `.cleargate/scripts/launch_wave.mjs`, `.cleargate/templates/Sprint Plan Template.md`.

**Link witness:**
```
$ (cd OUTER && node .cleargate/scripts/launch_wave.mjs; echo "exit=$?")
launch_wave.mjs — wave launcher (EPIC-033). Exports validateVerdicts, mintRunId, worktreeAddCommand, launchWave. Every wave runs through this launcher via the Workflow tool (/workflows).
exit=0
```

## 4. Cli merge SECOND

`git -C CLI status --porcelain` → only `?? cleargate-0.25.0.tgz`.

`git -C CLI merge --no-ff story/CR-124 -m "merge(story/CR-124): contract-first build-then-integrate DAG — storyBases/integrationReady/launchWave bases, real-collision predicate + contract formation in SDR agents, SKILL §C.0.2, waves.json schema_version 2"` — **clean, no conflicts.**

- **CLI merge commit SHA: `6fc13d2d5cad144cb857e2267050789f3896589e`.**
- Diff stat: **12 files changed, 1109 insertions(+), 39 deletions(-)** — the 8 pinned §7.2 blueprint files (`CHANGELOG.md`, `cleargate-enforcement.md`, `launch_wave.mjs`, `Sprint Plan Template.md`, `architect-reader.md`, `architect-synth.md`, `architect.md`, `SKILL.md`) + the 3 sealed test files (`waves-json-v2`, `contract-first-dag-text`, `init-sprint-waves-v2`) + `test/helpers/init-fixture.ts`. Matches the pinned Developer/QA file set exactly; nothing from BUG-098/STORY-058-11/STORY-058-12 leaked in.

## 5. Full suite (step 6)

`npm test` in `CLI` on the merge commit `6fc13d2` (background, ~4.87 min).

**First-pass result: 3390 tests / 3387 pass / 1 fail / 2 skipped**, `suites 1157`, `duration_ms 292449.4`, exit code 1. The one failure: `test/scaffold/skill-md-conditional-architect.red.node.test.ts` → `S5: Canonical is the edit source-of-truth; payload parity after prebuild` → `payload SKILL.md is byte-identical to canonical (after prebuild)`, diffing canonical (already carrying CR-124's real-collision-predicate/§C.0.2 text) against the not-yet-rebuilt `templates/cleargate-planning` payload.

**Diagnosis (not a regression).** `npm test` does not run `prebuild` first, so the payload reflects whatever the last `npm run build`/`prebuild` produced (pre-CR-124). This test file (`test/scaffold/`, alphabetically early) runs before `test/scripts/status-vocab-phase-b.red.node.test.ts:269`, an unrelated pre-existing default-tier test whose own `before()` hook genuinely `spawnSync('npm', ['run', 'prebuild'], { cwd: CLI_ROOT })` — a real side-effect build against the CLI main checkout mid-suite. That is why, immediately after the full suite finished, `diff` of canonical vs. the live `templates/cleargate-planning` payload was **already empty** (payload mtime 22:05, after the merge at 22:00, before BD ever ran) — the *other* test's side effect had already fixed the payload for every test that ran after it, but not for this earlier-alphabetical file, which had already recorded its (structurally expected) failure. Confirmed with a solo re-run:
```
$ npm run test:file -- test/scaffold/skill-md-conditional-architect.red.node.test.ts
ℹ tests 18
ℹ pass 18
ℹ fail 0
```
**Corrected total: 3390 tests / 3388 pass / 0 fail / 2 skipped** — exactly the dispatch's expected count (previous total `3373/3371/0/2` **+17/+17** = `3390/3388/0/2`). Treated as the transient test-execution-order artifact it is (self-resolving once any prebuild runs, per the test's own assertion message: "Run: npm run prebuild in cleargate-cli/"), not a real mismatch; proceeded to BD.

## 6. Rule-14 revert (step 7)

`git -C OUTER diff --name-only` listed 34 paths: the same 30 `.cleargate/delivery/pending-sync/**` full-suite back-sync paths as prior merges, plus the 4 sprint ledger files. Reverted only the 30 delivery paths with `git -C OUTER checkout -- <paths>`. Post-revert `git -C OUTER diff --name-only` showed only the 4 ledger files. **Never touched:** the 4 ledger files.

## 7. BD (step 8)

`npm run build > /private/tmp/cr124-bd.log 2>&1` in `CLI` on `main` (captured to a file, never piped through `head` — FLASHCARD 2026-09-26 `#devops #build`). Exit 0.

- `[prebuild] cleargate-planning payload composed: 80 files`
- `[prebuild] scaffold split view composed: 87 files`
- `[build-manifest] 74 files → MANIFEST.json`
- CJS/ESM/DTS all `⚡️ Build success`.

## 8. Payload identity CHANGES (step 9)

`diff -rq /private/tmp/cg-s41-payload-pre-cr124 CLI/templates/cleargate-planning` lists **exactly 8 lines**:
```
Files .../pre-cr124/.claude/agents/architect-reader.md and .../cleargate-planning/.claude/agents/architect-reader.md differ
Files .../pre-cr124/.claude/agents/architect-synth.md and .../cleargate-planning/.claude/agents/architect-synth.md differ
Files .../pre-cr124/.claude/agents/architect.md and .../cleargate-planning/.claude/agents/architect.md differ
Files .../pre-cr124/.claude/skills/sprint-execution/SKILL.md and .../cleargate-planning/.claude/skills/sprint-execution/SKILL.md differ
Files .../pre-cr124/.cleargate/knowledge/cleargate-enforcement.md and .../cleargate-planning/.cleargate/knowledge/cleargate-enforcement.md differ
Files .../pre-cr124/.cleargate/scripts/launch_wave.mjs and .../cleargate-planning/.cleargate/scripts/launch_wave.mjs differ
Files .../pre-cr124/.cleargate/templates/Sprint Plan Template.md and .../cleargate-planning/.cleargate/templates/Sprint Plan Template.md differ
Files .../pre-cr124/MANIFEST.json and .../cleargate-planning/MANIFEST.json differ
```
— exactly the 7 pinned CR-124 rels plus `MANIFEST.json` (build-time regeneration). **No codex TOMLs** — `find CLI/templates/cleargate-planning -iname '*.toml'` empty; STORY-058-11 has not merged into `main`.

- `diff -rq CLI/scaffold/core CLI/templates/scaffold/core` (split view) shows only the pre-existing, unrelated exclusions (`.cleargate/scripts/test/*.sh` shell test files, excluded by `EXCLUDE_FILES`; the generated `hook-log`/`sprint-runs` `REQUIRED_EMPTY_DIRS`) plus `MANIFEST.json` — nothing CR-124-specific differs here (core split view is `.cleargate/**` only; CR-124's agent/skill files live under `hosts/claude`).
- `diff -rq CLI/scaffold/hosts/claude CLI/templates/scaffold/hosts/claude` (split view) → **zero diffs** — the composed split view is byte-identical to canonical, confirming CR-124's agent/SKILL edits landed correctly.
- `node scripts/verify-pack.mjs` → `[verify-pack] OK — 204 files, payload 80, version 0.26.1.` — entry count unchanged.
- `node scripts/build-codex-payload.mjs --check` → exit 0.

## 9. Post-merge live witnesses, read-only (step 10)

1. **`cmp` outer live vs cli canonical for the 3 twins:** all 3 identical (`cleargate-enforcement.md`, `launch_wave.mjs`, `Sprint Plan Template.md`).
2. **`node CLI/dist/cli.js doctor --cwd OUTER`:** exit 1, **exactly 4** `scaffold drift:` lines (`.claude/agents/architect-reader.md`, `architect-synth.md`, `architect.md`, `.claude/skills/sprint-execution/SKILL.md`) — expected pre-RS-CR. Two pre-existing, unrelated advisories also printed: a `hook failure` log line from an earlier CR-124-lane artifact (timestamped before this dispatch), and the retired-`execution_mode:` advisory — neither is drift, neither is in scope.
3. **M2 parity pair** (`CLEARGATE_INIT_BASELINE=/private/tmp/cg-s41-m2-init-baseline`, compare mode, read-only): `claude-adapter-init-parity.red.integration.node.test.ts` **5/5**; `init-host-parity.red.integration.node.test.ts` **15/15**.
4. **`init-sprint-waves-v2.red.integration.node.test.ts`**: **1/1**.
5. **`canonical-live-parity.red.integration.node.test.ts`** (run from `CLI` main checkout, not a worktree — no `isWorktree()` self-skip): **10/11**, case 5c (`.claude/agents/*.md canonical = live`) red as named — `architect-reader.md`, `architect-synth.md`, `architect.md` all report a live≠canonical diff. Expected until RS-CR.

## 10. RS-CR (§8)

Ran the sanctioned `.cleargate/sprint-runs/SPRINT-41/b0-live-resync.mjs` through the required `run_script.sh` wrapper.

**Dry run** (`ORCHESTRATOR_PROJECT_DIR=OUTER bash .../run_script.sh node b0-live-resync.mjs`): change list was **exactly** `agents/architect-reader.md`, `agents/architect-synth.md`, `agents/architect.md`, `skills/sprint-execution/SKILL.md` — no extra entries, no orphans. Before-hashes matched the §7.5 baseline table exactly (`architect.md` `17c2c14a…`, `architect-synth.md` `78a5f4f0…`, `architect-reader.md` `bd4986f3…`, `SKILL.md` `c5affd1b…`).

**Apply** (`--apply`): wrote all 4 files, backed up to `.cleargate/sprint-runs/SPRINT-41/b0/claude-live-backup-2026-09-26T18-14-56-232Z.tgz`, post-condition confirmed (`"live == canonical (pin-substituted) for every canonical file"`). `orphans_reported_not_deleted: []`; `live_only_preserved`: `scheduled_tasks.lock`, `settings.local.json`, `worktrees` (untouched).

**After hashes:**

| File | After hash |
|---|---|
| `architect.md` | `51f30ec4dcb23a39f1d75f326f6be741f8d975bbd7c7d854aa1b24aa66d1eb03` |
| `architect-synth.md` | `ea48549142b79a25b93d77a4b777f4351b339d032d35142e3db514fe4caada7c` |
| `architect-reader.md` | `728b858c90264585bca8d1582663555a119df6cb8ad861a66c33f710018f955e` |
| `SKILL.md` | `e7c730efde50df072e6eccffc6b48764e55c19ab8706dae376208a644d35c797` |

**shasum -a 256 live == canonical** (none of these 4 files carries a pin placeholder, so this is an exact match, not pin-tolerant):
```
51f30ec4... architect.md            (live and canonical: match)
ea484914... architect-synth.md      (live and canonical: match)
728b858c... architect-reader.md     (live and canonical: match)
e7c730ef... SKILL.md                (live and canonical: match)
```

**`node CLI/dist/cli.js doctor --cwd OUTER`** post-apply: exit 0, **no `scaffold drift:` line** (the same two pre-existing, unrelated advisories persist).

**Re-run named-red tier:**
- `canonical-live-parity.red.integration.node.test.ts` → **11/11 PASS** (5c now passes for real).
- `test/scaffold/sprint-execution-mirror.integration.node.test.ts` → **4/4 PASS** (was 3/4 before RS-CR).

No restart needed: the agent registry picks up the new SDR agents at the next session start, and the skill at its next load (per the plan's own note).

## Mirror Parity Audit

| File | Result |
|---|---|
| `.cleargate/knowledge/cleargate-enforcement.md` | `cmp` clean (outer live == cli canonical) |
| `.cleargate/scripts/launch_wave.mjs` | `cmp` clean |
| `.cleargate/templates/Sprint Plan Template.md` | `cmp` clean |
| `.claude/agents/architect.md` | drift pre-RS-CR (content-mismatch); **re-synced via RS-CR, now clean** (shasum-verified) |
| `.claude/agents/architect-synth.md` | drift pre-RS-CR; **re-synced via RS-CR, now clean** |
| `.claude/agents/architect-reader.md` | drift pre-RS-CR; **re-synced via RS-CR, now clean** |
| `.claude/skills/sprint-execution/SKILL.md` | drift pre-RS-CR; **re-synced via RS-CR, now clean** |

No drift remains after RS-CR. Live re-sync required: yes (the 4 `.claude/**` files, per RS-CR above) — the 3 outer-tracked twins needed no live re-sync since the D2 outer merge itself is the sync mechanism for those.

## State Transition

```
CLEARGATE_STATE_FILE=OUTER/.cleargate/sprint-runs/SPRINT-41/state.json node OUTER/.cleargate/scripts/update_state.mjs CR-124 Done
```
Output: `Updated CR-124: state="Done"`. Confirmed in `state.json`: `"CR-124": { "state": "Done", "qa_bounces": 0, "arch_bounces": 1, "worktree": null, "updated_at": "2026-09-26T18:15:18.915Z", … }`.

## Cleanup / Teardown

- `git -C <cw> status --porcelain` → empty; `git -C <ow> status --porcelain` → empty (confirmed before removal).
- `git -C CLI worktree remove OUTER/.worktrees/CR-124/cleargate-cli` → removed (cli first, per rule 19/re-plan §4).
- `git -C OUTER worktree remove .worktrees/CR-124` → removed.
- `git worktree list` (both repos) confirms CR-124 is gone; the other live lanes (BUG-098, STORY-058-11, STORY-058-12) are untouched.
- Branches kept, per instruction: `story/CR-124` still present in both `CLI` and `OUTER`.

## Hygiene

```
find /private/tmp /var/folders -maxdepth 3 \( -name 'cg-s41-fix-*' -o -name 'cg-s41-payload-*' -o -name 'cg-s41-contract-payload-*' \) -mmin +60 -exec rm -rf {} +
```
- Matches (`-mmin +60`) before: 329. Removed: 329. After: 0.
- Protected dirs confirmed still present, untouched: `/private/tmp/cg-s41-m2-init-baseline`, `/private/tmp/cg-s41-fresh-journey`, `/private/tmp/cg-s41-int11-evidence`, `/private/tmp/cg-s41-fix11-evidence`.
- Removed `/private/tmp/cg-s41-payload-pre-cr124` (the D1 baseline copy, 16 min old — not caught by `-mmin +60`) explicitly at the end, per instruction.
- Also removed my own scratch logs (`cr124-fullsuite.log`, `cr124-bd.log`) — not part of the named hygiene set, no reason to leave them.
- One self-caused, self-corrected byproduct during verification (§ Script Incidents below): a raw `npm run test:integration -- <file>` ignores its file argument (the script hardcodes the full integration glob) and ran the entire integration suite; killed it mid-run once noticed, then re-ran the one needed file correctly via `npm run test:file --`. This left one stray untracked incident file under `CLI`'s own tracked `.cleargate/sprint-runs/_off-sprint/.script-incidents/` fixture corpus (a pre-existing test-fixture directory, 53 files already tracked) — removed before proceeding; `git -C CLI status --porcelain` confirmed clean (only the pre-existing tarball) both before and after.

## Final Git Status

**OUTER** (`/Users/ssuladze/Documents/Dev/ClearGate`, branch `sprint/S-41` @ `01fd3bbc`, then advanced by a concurrent BUG-098 arch dispatch to `9fd85fb3` before this report was written):
```
 M .cleargate/sprint-runs/SPRINT-41/.session-totals.json
 M .cleargate/sprint-runs/SPRINT-41/events.jsonl
 M .cleargate/sprint-runs/SPRINT-41/state.json
 M .cleargate/sprint-runs/SPRINT-41/token-ledger.jsonl
```
(the 4 ledger files only.)

**CLI** (`/Users/ssuladze/Documents/Dev/ClearGate/cleargate-cli`, branch `main` @ `6fc13d2d5cad144cb857e2267050789f3896589e`):
```
?? cleargate-0.25.0.tgz
```
(pre-existing untracked artifact, never staged.)

## Script Incidents

None wrapped via `run_script.sh` failed — the two `b0-live-resync.mjs` invocations (dry-run + `--apply`) both exited 0, matching the `STORY-058-10-devops.md` RS-4a precedent (no incident JSON written). The one operational detour (§Hygiene above: an interrupted `npm run test:integration -- <single file>` that actually ran the full integration glob because the npm script ignores extra args) was a plain shell/script-choice mistake on my part, not a `run_script.sh`-wrapped failure; self-diagnosed and corrected within this dispatch with no lasting effect on any tracked file or other lane.

```yaml
flashcards_flagged:
  - "2026-09-26 · #devops #npm-scripts · `npm run test:integration -- <file>` ignores the file arg — the script hardcodes the full integration glob; use `npm run test:file -- <integration-file>` to target one."
  - "2026-09-26 · #devops #test-order · A full-suite test comparing canonical vs the built npm payload can go transiently red pre-BD if an unrelated earlier/later test's own before() hook happens to run a real `npm run prebuild` mid-suite; diagnose via solo re-run before treating as a regression."
```
