# SPRINT-33 Execution Log

Run-time events, CRs, edge cases, and orchestrator decisions. Append-only, newest at bottom of each section. Reporter reads this at close.

## Decisions

- **2026-06-01 — execution_mode: v2 (enforce).** Sprint frontmatter omitted `execution_mode`; owner confirmed v2 at kickoff. Stamped into frontmatter (commit f62f21dc). Loop runs serial (v2 → serial per SKILL §C.0; not v2-parallel).
- **2026-06-01 — CR-070 disposition: verified paperwork close (owner: "thin closure").** SDR found CR-070's substance already shipped as STORY-070-01 (commit b87f6ac0: schema v3, `gate-mode.ts`, enforcement §15, unconditional init/close scripts, `check:no-execution-mode-vocabulary`). The only "missing" deliverable (`gate-mode.test.ts`) is in fact already present as the sealed `cleargate-cli/test/util/gate-mode.red.node.test.ts` — it matches the `test/**/*.node.test.ts` suite glob and runs GREEN (6/6, all four `isAdvisory()` cases). No code change, no worktree, no redundant owned test. CR-070 → Done. File archives at close (status Approved→Completed via reconciler).
- **2026-06-01 — cleargate-cli stories execute on a feature branch in the MAIN cleargate-cli checkout (REVISED — initial worktree model was broken).** `cleargate-cli/` is a separate gitignored repo (`sandrinio/cleargate-cli`), NOT in outer-repo worktrees. Stories editing `cleargate-cli/src/**` (043-02 readiness-predicates, 043-04 work-item-type, 043-07 wiki-ingest, 043-09 cli.ts) run on a branch IN the main checkout: `git -C cleargate-cli checkout -b story/STORY-XXX main`. The QA-Red→Dev→QA-Verify→Architect loop runs there; DevOps merges story→cleargate-cli `main` **(--no-ff, LOCAL ONLY — no `git push`, no `npm publish`; release is the owner's separate action)**, then checkout main. Dispatch markers + ledger + reports stay in the OUTER repo's sprint-runs (agents given absolute paths). Sprint state.json (outer) tracks completion. TPV is satisfied EMPIRICALLY when QA-Red runs the red test against real code with the expected baseline (no separate Architect TPV dispatch).
  - **FIRST ATTEMPT (043-02) used a worktree at `cleargate-cli/.worktrees/STORY-XXX` — BROKEN.** cleargate-cli's tests reference `../.cleargate/scripts/*.mjs` (the OUTER repo's scripts) via package-root-relative paths that ONLY resolve when cleargate-cli sits at `<outer>/cleargate-cli/` (its canonical location). From a `.worktrees/…` depth, `../.cleargate` → `cleargate-cli/.worktrees/.cleargate` (absent) → `ERR_MODULE_NOT_FOUND` at tsx path-alias resolution, failing ~738 tests at LOAD. The dev's "738 pre-existing / 4 canonical pass" was this artifact (the canonical test file didn't even load in the worktree). Verified: same suite from the MAIN checkout = readiness-predicates 102/102 green, red 5/5. Switched 043-02 to the main-checkout branch and re-verified. **FINDING (scaffold debt, split fallout):** cleargate-cli's test suite is cross-repo-coupled to the outer `../.cleargate/scripts/` — not standalone-runnable from an arbitrary location. Candidate follow-up (relates to STORY-043-09 / a config-cleanup CR).
- **2026-06-01 — topology axis deferred → CR-074 (owner: "log as follow-up CR").** `execution_mode` was overloaded: STORY-070-01 retired the ENFORCEMENT axis but the TOPOLOGY axis (`v2-serial`/`v2-parallel`) still lives in sprint frontmatter and is read by `shouldRunParallel()` (`launch_wave.mjs:137-140`). Filed CR-074 (Draft, parent EPIC-044) to split it (`wave_mode`/env-only). Out of SPRINT-33 scope — topology is dormant (serial run). Flashcard recorded.

## Spec-internal contradictions resolved

- **2026-06-01 — STORY-043-01 live-loop test targeting (owner decision: retarget-canonical, defer live).** The sealed red test + existing `test_flashcard_enforcement.sh` resolve the hook via `${GIT_ROOT}/.claude/hooks/…`, which walks past the worktree to the MAIN-repo LIVE (gitignored) hook the orchestrator runs on. Story §3.1 + M1.md line 71 said edit live mid-sprint; binding SDR §2.3 + worktree isolation + gitignore say don't. Resolution: canonical (`cleargate-planning/.claude/hooks/pending-task-sentinel.sh`) is the test target + deliverable; tests retarget to the in-worktree canonical hook; LIVE re-sync deferred to Gate-4 `cleargate init`. Architect re-dispatched to amend M1.md line 71 (supersede with SDR §2.3); QA-Red re-dispatched to retarget the sealed red test. FINDING (scaffold debt): the flashcard-enforcement tests target the live/gitignored hook via GIT_ROOT — wrong for a self-hosting hook change; candidate follow-up.

## Findings (non-blocking, logged inline)

- **2026-06-01 — pre_gate_runner typecheck is a structural false-positive in worktrees post-split.** `.cleargate/config.yml` `qa.typecheck`/`precommit` = `npm run typecheck --workspace=cleargate-cli`, but `cleargate-cli/` is a separate gitignored repo absent from every worktree → pre-gate `typecheck` FAILs (exit 1) for EVERY story, independent of the diff. For STORY-043-01 (shell-only, 0 TS) this is a guaranteed false-positive; the substantive pre-gate checks (new_deps, stray_env_files) PASS. Orchestrator override: proceed to Architect post-flight; do NOT route to Developer (not caused by the work). CANDIDATE FOLLOW-UP: scope-correct the config typecheck/test commands for the planning-only repo (or have pre_gate skip when the workspace is absent). Possibly belongs with STORY-043-09 (CLI surface hygiene) or a config-cleanup CR.

## Edge Cases (§C.7 / contract deviations)

- **2026-06-01 — orchestrator ran `update_state.mjs CR-070 Done` directly.** §C.7 lists `update_state.mjs` as a DevOps-owned (forbidden-for-orchestrator) pattern, scoped to the code-merge flow. CR-070 is a no-code/no-merge verified paperwork close with no story branch or worktree for DevOps to merge, so the merge-flow rationale does not apply. Documented here per the §C.7 "classify as edge case" clause.
- **2026-06-01 — `.active` sentinel set by orchestrator.** `init_sprint.mjs` does not write `.cleargate/sprint-runs/.active` (the SKILL §A.3 text attributing the flip to it is stale — itself hygiene debt); SPRINT-32 close truncated it. Orchestrator wrote `SPRINT-33` to it at kickoff. (`.active` is gitignored / machine-local.)

## Gate-4 deferred actions (live re-sync / dist rebuild — order-sensitive)

> All scaffold/tool changes that would mutate the orchestrator's OWN running loop are deferred here. At Gate-4 doc-refresh, apply in order.

- **STORY-043-01 (flashcard sentinel):** live `.claude/hooks/pending-task-sentinel.sh` re-sync. ORDER: `npm run prebuild` (regenerate payload from canonical) → `cleargate init` (rewrite live from payload). prebuild MUST precede init or live re-syncs from a stale payload and reinstates the inert hook (BUG-024 class).
- **STORY-043-02 (readiness predicate):** `npm run build` in cleargate-cli to rebuild `dist/cli.js` (the binary the orchestrator's `gate check` uses), THEN confirm §2.2 gate-parity: an Epic authored from the numbered template passes `cleargate gate check` with no hand-fix → retire FLASHCARD entry 41. (CR-074's own `## 2.5 Existing Surfaces` numbered heading is a live demonstration — its gate should flip to pass after the rebuild.)

## CR / Mid-sprint input

- (none yet)

## Walkthrough events (UR:*)

- (none yet)
