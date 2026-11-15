# STORY-066-16 Architect post-flight review (role: architect, runtime lane)

VERDICT: PASS
Reviewed: seal e88d31b, Developer e5c8dd6 (`git diff bf21e96..e5c8dd6`), integration a8dc6a3 (main 4da4927 merged in). Plan: `plans/STORY-066-16.md` D-1..D-11 plus orchestrator amendment D-12.

## Plan conformance (the code does what the plan says and nothing else)
- **Surface.** e5c8dd6 touches only these five files: `init_sprint.mjs`, `assign_lane.mjs`, `src/lib/lifecycle-reconcile.ts` and the two SKILL copies. It changes no test file. The seal e88d31b holds exactly the three red files, and they are byte-identical at a8dc6a3. `git diff-tree --cc a8dc6a3` is empty, so the integration merge has no resolution edits.
- **R1 (`init_sprint.mjs`).**
  - Every hunk matches plan R1 §1–6 verbatim: header, the two static imports `:38-39`, `findItemFile` `:113-130`, the comment `:220-221`, the compute block `:266-285`, and the `Lanes:` line `:449-451`.
  - The compute block sits after the §2.4 fallback and before `if (!laneSourceFound)`. It is gated on `!fs.existsSync(wavesJsonPath)` (D-1).
  - Items are looked up in `pending-sync` then `archive`, using sorted names and `matchesId`. The state key is the requested id (D-2).
  - A throw prints `WARN: could not compute the lane of <ID>: …` and init continues (D-3).
  - The raise-never-lower block (`:291-321`) and the `carry.lane ?? resolvedLane` line have no hunk (D-4, D-10).
- **R2 (`assign_lane.mjs`).**
  - `assignLaneForFile` returns null on an unreadable file and on a file name with no id. Its only exit path is `usage()`, which `assign()`/`main()` alone reach (`:143-146`, `:183-185`). Calls to `process.exit` remain only in CLI paths.
  - `assign()` keeps `cannot read …` / `no work-item id …`, exit 2, and empty stdout. `assign-lane.red` passes 5/5 (I re-ran it).
  - `computeSignals`, `laneFor` and `surfaceOf` have no hunk.
  - `isMainModule()` keeps `main()` from running when init imports the module.
- **R4 / D-7 (`lifecycle-reconcile.ts`).**
  - `LANE_NAMES`, `readFrontmatterLane` and the guarded rewrite match the plan (`:772-793`, `:950-959`).
  - The rewrite runs only when the state lane is a lane name, an existing `lane:` key's unquoted value is a lane name, and the two differ. The value is written quoted.
  - The key is never added: the guard runs before `setFrontmatterFieldAtomic`, which would append it.
  - Only the cast at the `:905` site is widened.
  - The same loop serves `--retroactive`, and it touches only files still in `pending-sync`.
  - `lifecycle-reconcile-lane.red` passes 2/2 (re-run).
- **R3 + D-12 (SKILL).**
  - The four plan strings (A.3 `:160`/`:163`/`:165` and the A.4 tail) appear verbatim in both the Claude and Codex copies, checked by exact substring match.
  - The D-12 replacement is verbatim, and `silently falls back` no longer appears in either copy.
  - The `.active` paragraph, the OWNER line and the rest of `:166-:218` have no hunk.
  - The A.4 tail is the last paragraph before `### A.5`.
  - `sprint-skill-a3-a4-lanes.red` passes 2/2 (re-run).
- **Codex regenerated, not hand-edited.** `node scripts/build-codex-payload.mjs --check` (read-only) exits 0 at a8dc6a3, so the generated `scaffold/core/.agents/.../SKILL.md` equals the render of canonical byte for byte.

## Checks QA would not run
- **Hangs and writes at kickoff.**
  - Each item spawns `collision_surface.sh` (`assign_lane.mjs:147-153`), which runs only read-only git (`rev-parse`, `ls-files --error-unmatch`, `check-ignore`). Nothing in it prompts or takes a lock.
  - A missing `bash` or `git` degrades to an empty surface, which gives `standard`. It never makes init exit.
  - In a scratch git repo, `git status` after init shows only `.cleargate/sprint-runs/`, so no write lands outside the existing sprint-runs tree.
  - Cost: about 1.0–1.35 s per item on the sandbox items (paths untracked in the scratch repo), against the plan's estimate of 0.1–0.3 s. Init took 4.86 s against 0.23 s at bf21e96 for four items. See F2.
- **Items outside `pending-sync`/`archive`.**
  - The lookup uses the same two directories as `seal_red.mjs:56-65` and `assert_story_files.mjs:115-120`.
  - When the sprint file exists, init's assert step already blocks an item missing from both, unless `CLEARGATE_ADVISORY=1`.
  - With advisory set, the item takes the §2.4 lane or `standard`, and the `Lanes:` line shows `standard (migration-default)`, so the fallback is visible at kickoff.
  - Nothing else writes `plans/waves.json` before A.4: `src/` has no writer, and the script writers are `assign_lane --write`, the synth and the runners. An early stub therefore cannot suppress the computation (D-1).
- **Interplay with STORY-066-17.**
  - I ran `git merge-file` on the two SKILL copies with base bf21e96, ours a8dc6a3 and theirs `story/STORY-066-17`. Both merge cleanly.
  - 066-17 touches none of `init_sprint.mjs`, `assign_lane.mjs` or `lifecycle-reconcile.ts`.
  - Its `close_sprint.mjs` still loads `reconcileCurrentSprintStories` from dist at 2.6d (`story/STORY-066-17:scaffold/core/.cleargate/scripts/close_sprint.mjs:880-893`), so the B11 lane rewrite carries over into its reordered close.
  - 066-17 must still run `gen:codex` at its own merge (rule 15).
  - 066-18 shares no hunk with this story: its A.1/A.5 SKILL edits and its `sprint.ts` preflight edits are separate from `sprintInitHandler`.
- **Goal check (d) run 3.**
  - I ran this worktree's `init_sprint.mjs` in a scratch git repo holding the real `sandbox-fixture/` items (STORY-001-01..04, SPRINT-01, EPIC-001), with no `waves.json` and no `--force`. It exited 0 and printed `Lanes: STORY-001-01 fast (assign-lane-script), STORY-001-02 standard (assign-lane-script), STORY-001-03 runtime (assign-lane-script), STORY-001-04 standard (assign-lane-script)`. That is the bar's fast/standard/runtime/standard. `.active` = SPRINT-01, and `events.jsonl` has 4 lines.
  - The fixture's §1 table puts Lane in column 3. The §2.4 regex (`init_sprint.mjs:253`) needs the lane in column 2, so §1 rows are not read as §2.4 lanes. The template §2.4 placeholder row `STORY-NNN-NN | fast` keys an id that does not exist.
  - The runner takes the `state.json` lane first (`segment_stages.mjs:95-101`).
  - `cleargate sprint init` passes `--stories` through `run_script.sh`, which passes stdout through on exit 0 (`src/commands/sprint.ts:531-536`).
  - The composed payload ships `assign_lane.mjs`, `collision_surface.sh` and `lib/work-item-id.mjs`, and `sprint-init-fresh-install.red.integration` passes 2/2 against it (re-run).
  - Expected side effect at the sandbox close: the fixture items carry `lane: standard`, so B11 rewrites 001-01 to `lane: "fast"` and 001-03 to `lane: "runtime"` in the archived copies. No pass criterion reads those bytes.

## Findings (none blocks the merge)
- **F1: low, non-blocking. The D-3 guarantee covers call-time throws only.** `init_sprint.mjs:38-39` imports `assign_lane.mjs` statically. A tree with the new `init_sprint.mjs` and a missing or older `assign_lane.mjs` fails at module link with exit 1 and writes nothing; it does not take the WARN fallback. The payload ships the files together, so only a hand-port hits this. The meta-repo live `.cleargate/scripts/` has no `assign_lane.mjs` today; its `lib/work-item-id.mjs` matches canonical. The Gate 4 re-sync must carry `init_sprint.mjs` and `assign_lane.mjs` together.
- **F2: low, non-blocking. Kickoff is slower than the plan says.** Measured about 1 s per item, against the plan's 0.1–0.3 s (Risks bullet 4). `surfaceOf`'s `spawnSync` has no timeout (`assign_lane.mjs:148`; this predates the story, from 066-05). No path hangs. A large sprint with many surface paths adds tens of seconds to kickoff.
- **F3: info, follow-up to intake. Other docs still describe init as the place an Architect raise lands.**
  - `scaffold/hosts/claude/.claude/agents/architect.md:174` and `scaffold/core/.cleargate/knowledge/cleargate-enforcement.md:405` describe init as the step that applies an Architect raise from `waves.json`.
  - Init now runs before A.4, so a raise reaches `state.json` only through the A.4-tail `update_state.mjs --lane`. Both statements stay literally true, but they are incomplete.
  - Both files are outside this story's §3.1 surface. The SKILL A.4 tail is the operative instruction.
- **F4: info. The A.3 summary leaves out a gate.** The A.3 line `cleargate sprint init` runs the decomposition gate, then `init_sprint.mjs`…" omits the CR-017 lifecycle gate and the plan-file check that `sprintInitHandler` runs first (`src/commands/sprint.ts:319-361`). The text is the plan's verbatim; it is incomplete, not wrong.
- **F5: info. The lane rewrite is silent.** The B11 rewrite does not appear in close 2.6d stdout, by plan: those lines stay unchanged.

## Commands run (read-only; short private TMPDIR; single files)
- `git diff`, `git show`, `git diff-tree --cc`, and `git merge-file` on extracted blobs in the scratchpad.
- `node scripts/build-codex-payload.mjs --check`: exit 0.
- `npx tsx --test`, one file at a time:
  - `lifecycle-reconcile-lane.red`: 2/2
  - `sprint-skill-a3-a4-lanes.red`: 2/2
  - `init-sprint-lanes-from-items.red.integration`: 4/4
  - `assign-lane.red`: 5/5
  - `sprint-init-fresh-install.red.integration`: 2/2
- Worktree `init_sprint.mjs`, and the bf21e96 version, on scratch copies of `sandbox-fixture/`. The scratch copies were removed afterwards.
- The worktree is unchanged (`git status --short` is empty).

## Script Incidents
none

flashcards_flagged:
  - "2026-11-15 · #init #lanes #dogfood · init_sprint.mjs imports assign_lane.mjs statically: porting init alone fails at module link (exit 1). Sync both."
  - "2026-11-15 · #lanes #sdr · Kickoff lanes come from assign_lane at A.3; an SDR raise reaches state.json only via update_state --lane, never waves.json."
