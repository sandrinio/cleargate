# Dogfood Observation Log — new_app SPRINT-66 (v2-parallel)

> Live observation of the `new_app` (Chyro) sprint orchestrator running SPRINT-66 under
> `execution_mode: v2-parallel` — the first real parallel-wave run on a polyglot target.
> Observer: ClearGate meta-repo session. Purpose: record framework bugs/improvements for
> later triage (route to EPIC-043 framework hygiene unless noted). NOT yet filed as CRs.
>
> Target: `/Users/ssuladze/Documents/Dev/new_app` · branch `sprint/S-66`
> Framework: new_app on cleargate 0.14.0 scaffold (upgraded from 0.11.4, commit 87d16881).
> Watch started: 2026-06-02T23:35Z (≈30 min window).

## Baseline @ 23:35Z

- `.active` = `SPRINT-66` (already corrected by orchestrator — see F1)
- HEAD `10458adc chore(SPRINT-66): switch execution_mode to v2-parallel`; 0 commits since main (no story merged yet)
- Worktrees: only the main checkout + an unrelated `new_app-deckproto`. No story worktrees pre-created yet.
- Reports: none. Stories: 15 total — `13 standard / 2 fast` (fast lanes already applied — see F2).
- Ledger: SPRINT-66 has **no** rows yet; SPRINT-65 has 292 (last 03:20). No misattribution has occurred — F1 fixed before any dispatch.
- waves.json: 11 waves. wave1 parallel = `[114-01, 114-03, 115-05, 117-01, 117-02]`; waves 2–11 each serial (dep/DB/surface-gated). DB-touchers `117-03` + `CR-063` pulled to trailing serial waves.

---

## Findings

### F1 — `init_sprint.mjs` never sets the `.active` sentinel at kickoff  ⟶ EPIC-043 (correctness)

**Observed.** After SPRINT-66 kickoff the `.active` sentinel still read `SPRINT-65`. Orchestrator caught it and manually wrote `SPRINT-66`.

**Root cause (grounded).**
- `.cleargate/scripts/init_sprint.mjs` contains **zero** references to `.active` — it writes `state.json` only.
- The `cleargate sprint` CLI (`cleargate-cli/src/commands/sprint.ts:810-812`) only ever **truncates** `.active` to `""` at sprint *close* (Step 6, `atomicWriteStr(activePath, '')`).
- No production code writes a non-empty sprint-id into `.active`. Only test fixtures do (`test/test_cross_project_routing.sh`, `test/test_file_surface.sh`).

**Contract violation.** Sprint-execution SKILL §A.3 (`.claude/skills/sprint-execution/SKILL.md:152`) explicitly states: *"This writes …state.json and **flips `.active` to SPRINT-NN**."* — that flip is not implemented anywhere.

**Consequence.** `write_dispatch.sh:64-74` reads `.active` as the routing key for the token-ledger hook; `session-start.sh` reads it for the "Active sprint" banner. With a stale value, all dispatch markers + ledger rows for the new sprint append to the **previous** sprint's `sprint-runs/<old>/` dir → cost misattribution; banner reports the wrong sprint. Blast radius = any orchestrator who doesn't manually fix it.

**Fix.** `init_sprint.mjs` should atomically write `SPRINT-NN` to `.cleargate/sprint-runs/.active` as its final step (honor the SKILL §A.3 contract). Cheap, isolated.

### F2 — Lane audit (SDR §2.4) not applied by init; all lanes default to `standard`  ⟶ EPIC-043 (waste)

**Observed.** All 15 stories came out `lane: standard` despite SDR §2.4 marking `STORY-114-03` + `STORY-117-04` as `fast`. Orchestrator manually reclassified (now 13/2).

**Root cause (grounded).** `init_sprint.mjs:160` → `lane: carry.lane ?? 'standard'`. It only carries a lane forward for carry-over stories; every fresh story gets `standard`. It does not read the SDR §2.4 Lane Audit or `plans/waves.json` lane assignments.

**Consequence.** SDR-designated fast-lane stories run the full standard loop (QA-Red + TPV + Architect post-flight) unless manually reclassified → wasted dispatches/tokens. Not incorrect, just expensive.

**Fix.** Either (a) `init_sprint.mjs` ingests lane assignments from the SDR/`waves.json`, or (b) SKILL §A documents a mandatory post-init lane-set step (`cleargate story lane …`). Prefer (a).

### F3 — Shipped agents hardcode ClearGate's own node:test/vitest-forbidden policy; breaks polyglot targets  ⟶ portability defect (bigger than hygiene)

**Observed.** Chyro is **pytest backend + vitest frontend**. The ClearGate agents installed in new_app hardcode node:test and *forbid* vitest, so Developer/QA would write wrong-runner test files and refuse the runner the target actually uses. `sprint-context.md` has no structured test-stack field — its Cross-Cutting Rules + FLASHCARD tags are unpopulated template stubs (`(rule 1)`, `#tag1`), and Locked Versions only lists Node/TS. Orchestrator must hand-populate the correct stack into the freeform Cross-Cutting Rules or agents fail.

**Root cause (grounded).**
- `.claude/agents/developer.md:81-93` — *"All tests use `node:test` + `node:assert/strict` — the single, **mandatory** runner across all ClearGate packages (EPIC-028). vitest is fully eliminated; adding it back is **forbidden** and blocked by `check:no-vitest`."* Hardcoded `tsx --test` commands for `mcp/`+`cleargate-cli/`; naming `*.node.test.ts`.
- `.claude/agents/qa.md:43,52` — red tests hardcoded `*.red.node.test.ts`; `qa.md:103,109` — `cleargate gate test`.
- `.claude/agents/architect.md:110,116` — TPV gate checks `*.red.node.test.ts` naming.
- `.cleargate/templates/sprint_context.md` — no test-stack section; Cross-Cutting Rules are freeform; Locked Versions only Node/TS.
- These agent files ship verbatim to every target via `cleargate init` payload.

**The vitest paradox.** ClearGate eliminated vitest from *its own* repo (EPIC-028, 2026-05-18) and baked "vitest forbidden / node:test mandatory" into the **shipped** agents. That is ClearGate-internal policy leaking into target installs. Chyro's frontend *uses* vitest — the agents conflate framework-internal convention with universal law.

**Consequence.** On any non-node / polyglot target the Developer writes wrong-extension test files, runs node:test against a Python backend, and actively refuses vitest. The orchestrator's mitigation (populate sprint-context Cross-Cutting Rules with the real stack) is fragile: agent `.md` instructions are more authoritative/persistent than a context file the agent merely "reads first."

**Fix (candidate — likely a dedicated CR or small Epic, not just hygiene).**
- (a) `cleargate init` detects the target stack (pytest/vitest/go test/…) and templatizes the runner block + red-test naming in the shipped agents; OR
- (b) add a structured authoritative `test_stack` block to `sprint_context.md` (backend runner, frontend runner, red-test naming convention) that agents treat as an override of their defaults; AND
- (c) strip ClearGate-internal "vitest forbidden / node:test mandatory (EPIC-028)" rules from the shipped agent payload — keep those only in the meta-repo's own agent copies.
- Contradicts ClearGate's stated "general-purpose, ships to many repos" goal (cf. memory `project_codemap_general_purpose`). Highest-impact of the three.

---

## Observation Timeline
<!-- poller appends timestamped snapshots + diffs below -->

> Watch extended to 60 min @ 2026-06-02T23:43:03Z. Autonomous poller v2 (5-min cadence).

### t+5m @ 2026-06-02T23:48:04Z
- .active=`SPRINT-66` | HEAD=`2e7e3e40 chore(SPRINT-66): activate sprint plan (status→Active)` | commits(main..S66)=1 | reports=0 | worktrees=1 | ledger66=1 ledger65=292

### t+10m @ 2026-06-02T23:53:05Z
- .active=`SPRINT-66` | HEAD=`2e7e3e40 chore(SPRINT-66): activate sprint plan (status→Active)` | commits(main..S66)=1 | reports=0 | worktrees=1 | ledger66=1 ledger65=292

### t+15m @ 2026-06-02T23:58:06Z
- .active=`SPRINT-66` | HEAD=`2e7e3e40 chore(SPRINT-66): activate sprint plan (status→Active)` | commits(main..S66)=1 | reports=0 | worktrees=1 | ledger66=1 ledger65=292

### t+20m @ 2026-06-03T00:03:06Z
- .active=`SPRINT-66` | HEAD=`2e7e3e40 chore(SPRINT-66): activate sprint plan (status→Active)` | commits(main..S66)=1 | reports=0 | worktrees=1 | ledger66=2 ledger65=292

### t+25m @ 2026-06-03T00:08:07Z
- .active=`SPRINT-66` | HEAD=`899f7e87 merge(story/STORY-114-01): per-component health probe registry` | commits(main..S66)=4 | reports=2 | worktrees=0 | ledger66=3 ledger65=292
- 🔁 status change: {"Ready to Bounce":15} → {"Done":1,"Ready to Bounce":14}
- ✅ NEW COMMITS on sprint/S-66:
    899f7e87 merge(story/STORY-114-01): per-component health probe registry
    644902af feat(epic-114): STORY-114-01 per-component health probe registry
    4147daff qa-red(STORY-114-01): write failing probe-registry tests
- 🍂 worktree removed: .worktrees/STORY-114-01
- 📄 NEW REPORT: STORY-114-01-dev.md
    | ---
    | story: STORY-114-01
    | agent: developer
    | sprint: SPRINT-66
    | commit: 644902af
    | ---
    | 
    | STORY: STORY-114-01
    | STATUS: done
    | COMMIT: 644902af
    | TYPECHECK: pass (python — pytest is the gate; no mypy/pyright configured)
    | TESTS: 40 passed, 1 failed (pre-existing test_cors_middleware_present — confirmed via git stash to predate this story)
    | FILES_CHANGED:
    |   - backend/app/core/health_probes.py (new — ProbeResult dataclass + 14 probe coroutines + run_all_probes())
- 📄 NEW REPORT: STORY-114-01-qa.md
    | ---
    | story: STORY-114-01
    | agent: qa
    | mode: VERIFY
    | sprint: SPRINT-66
    | verifies_commit: 644902af
    | ---
    | 
    | STORY: 114-01
    | QA: PASS
    | TYPECHECK: pass (python — no mypy/pyright; imports resolved at collection)
    | TESTS: 40 passed, 1 failed, 0 skipped (scoped: tests/core/test_health_probes.py + tests/test_main.py; the 1 failure test_cors_middleware_present is pre-existing on main 10458adc, confirmed independently)
    | ACCEPTANCE_COVERAGE: 7 of 7 Gherkin scenarios have matching tests
    | MISSING: none

### t+30m @ 2026-06-03T00:13:08Z
- .active=`SPRINT-66` | HEAD=`77c53cf2 chore(SPRINT-66): flashcards from STORY-114-01` | commits(main..S66)=5 | reports=3 | worktrees=4 | ledger66=4 ledger65=292
- ✅ NEW COMMITS on sprint/S-66:
    77c53cf2 chore(SPRINT-66): flashcards from STORY-114-01
- 🌿 worktree created: .worktrees/STORY-114-03
- 🌿 worktree created: .worktrees/STORY-115-05
- 🌿 worktree created: .worktrees/STORY-117-01
- 🌿 worktree created: .worktrees/STORY-117-02
- 📄 NEW REPORT: STORY-114-01-devops.md
    | # DevOps Report — STORY-114-01
    | 
    | ## Merge Result
    | 
    | - Sprint branch: sprint/S-66
    | - Story branch: story/STORY-114-01
    | - Merge commit SHA: 899f7e87
    | - Diff stat: 4 files changed, 1313 insertions(+), 18 deletions(-)
    |   - `backend/app/core/health_probes.py` — created (504 lines)
    |   - `backend/app/api/routes/health.py` — refactored
    |   - `backend/tests/core/conftest.py` — fixture additions
    |   - `backend/tests/core/test_health_probes.py` — created (743 lines)
    | - Strategy: ort (no-ff), clean merge, no conflicts
    | 
- 🃏 4 new FLASHCARD line(s):
    # ClearGate Flashcards
    
    One-liner gotcha log. Newest first. Grep by tag (e.g. `grep '#schema'`).
    Active cards have no marker; `[S]` = stale, `[R]` = resolved (see `.claude/skills/flashcard/SKILL.md` Rules 7–8).

### t+35m @ 2026-06-03T00:18:09Z
- .active=`SPRINT-66` | HEAD=`77c53cf2 chore(SPRINT-66): flashcards from STORY-114-01` | commits(main..S66)=5 | reports=3 | worktrees=4 | ledger66=4 ledger65=292

### t+40m @ 2026-06-03T00:23:10Z
- .active=`SPRINT-66` | HEAD=`77c53cf2 chore(SPRINT-66): flashcards from STORY-114-01` | commits(main..S66)=5 | reports=3 | worktrees=4 | ledger66=6 ledger65=292

### t+45m @ 2026-06-03T00:28:11Z
- .active=`SPRINT-66` | HEAD=`77c53cf2 chore(SPRINT-66): flashcards from STORY-114-01` | commits(main..S66)=5 | reports=3 | worktrees=4 | ledger66=7 ledger65=292

### t+50m @ 2026-06-03T00:33:13Z
- .active=`SPRINT-66` | HEAD=`77c53cf2 chore(SPRINT-66): flashcards from STORY-114-01` | commits(main..S66)=5 | reports=3 | worktrees=4 | ledger66=9 ledger65=292

### t+55m @ 2026-06-03T00:38:14Z
- .active=`SPRINT-66` | HEAD=`77c53cf2 chore(SPRINT-66): flashcards from STORY-114-01` | commits(main..S66)=5 | reports=3 | worktrees=4 | ledger66=11 ledger65=292

### t+60m @ 2026-06-03T00:43:16Z
- .active=`SPRINT-66` | HEAD=`77c53cf2 chore(SPRINT-66): flashcards from STORY-114-01` | commits(main..S66)=5 | reports=11 | worktrees=4 | ledger66=15 ledger65=292
- 🔁 status change: {"Done":1,"Ready to Bounce":14} → {"Done":1,"Ready to Bounce":10,"QA Passed":4}
- 📄 NEW REPORT: STORY-114-03-dev.md
    | ---
    | story: STORY-114-03
    | agent: developer
    | sprint: SPRINT-66
    | commit: 8b808865
    | lane: fast
    | ---
    | STORY: STORY-114-03
    | STATUS: done
    | COMMIT: 8b808865
    | TYPECHECK: pass (python/pytest)
    | TESTS: 7 passed (test_worker_heartbeats.py, real Redis DB9); 3 pre-existing fanout failures confirmed pre-existing
    | FILES_CHANGED: backend/app/workers/cron.py, backend/app/workers/tasks.py, docker-compose.prod.yml, backend/tests/workers/test_worker_heartbeats.py
    | NOTES: Per-queue heartbeat writer chyro:worker:<queue>:heartbeat (4 deployed queues) + legacy key retained; compose:608 healthcheck now Python-native. Rule18 reuse get_redis/_WORKER_HEARTBEAT_TTL/cron_safe. Rule15 N/A. Rule17 class-a no migration. Key contract matches 114-01 reader.
- 📄 NEW REPORT: STORY-114-03-qa.md
    | ---
    | story: STORY-114-03
    | agent: qa
    | mode: VERIFY
    | sprint: SPRINT-66
    | verifies_commit: 8b808865
    | ---
    | STORY: STORY-114-03
    | QA: PASS
    | TESTS: 7 passed, 0 failed (real Redis DB9)
    | ACCEPTANCE_COVERAGE: 7 of 7 Gherkin scenarios
    | REGRESSIONS: none (3 fanout failures reproduced on main independently — pre-existing; heartbeat key contract compatible with 114-01 reader; sibling boundary respected — health_probes.py untouched)
    | VERDICT: Ship it. Writer key/format matches 114-01 reader; compose healthcheck Python-native; strictly additive; Rule15 N/A.
- 📄 NEW REPORT: STORY-115-05-dev.md
    | ---
    | story: STORY-115-05
    | agent: developer
    | sprint: SPRINT-66
    | commit: 37a51997
    | ---
    | STORY: STORY-115-05
    | STATUS: done
    | COMMIT: 37a51997
    | TYPECHECK: pass
    | TESTS: 11 passed (static gate test_115_05_export_deps_baked.py)
    | FILES_CHANGED: backend/pyproject.toml, backend/Dockerfile, backend/uv.lock
    | NOTES: python-pptx>=1.0.2,<1.1 + playwright>=1.49,<2 declared; Dockerfile runtime stage ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright + RUN playwright install --with-deps chromium (chromium-only); header size note → ~500-700MB (R5 release callout). uv.lock resolves playwright 1.60.0 (x86_64+aarch64 wheels — multi-arch R7). R4 full docker build+offline-Chromium smoke = ORCHESTRATOR-run (deferred). new_deps EXPECTED.
    | flashcards_flagged:
- 📄 NEW REPORT: STORY-115-05-qa.md
    | ---
    | story: STORY-115-05
    | agent: qa
    | mode: VERIFY
    | sprint: SPRINT-66
    | verifies_commit: 37a51997
    | ---
    | STORY: STORY-115-05
    | QA: PASS (static-gate scope)
    | TESTS: 11 passed (static gate)
    | ACCEPTANCE_COVERAGE: 7 of 8 (Scenario 5 build+boot = orchestrator R4 smoke, out of static scope)
    | REGRESSIONS: none (docker-compose.prod.yml untouched R6; migrations top at 133, no DDL Rule17; diff = pyproject+Dockerfile+uv.lock only)
    | VERDICT: Ship pending orchestrator R4 docker build+offline-Chromium smoke. Deps declared w/ bounded pins; chromium-only + PLAYWRIGHT_BROWSERS_PATH in runtime stage; arch-agnostic; uv.lock multi-arch wheels.
- 📄 NEW REPORT: STORY-117-01-dev.md
    | ---
    | story: STORY-117-01
    | agent: developer
    | sprint: SPRINT-66
    | commit: 7168a44a
    | ---
    | STORY: STORY-117-01
    | STATUS: done
    | COMMIT: 7168a44a
    | TYPECHECK: pass (story files clean; pre-existing unrelated TS errors elsewhere)
    | TESTS: 23 passed (GuidedGcpSetup.red.node.test.tsx)
    | FILES_CHANGED: frontend/src/components/integrations/GcpSetupChecklist.tsx (new), frontend/src/components/integrations/GoogleWorkspaceWizard.tsx (modified +5)
    | NOTES: Guided GCP setup in wizard Step 1 — checklist, API-enable deep links (base REST ids), scope <code> blocks, testing-mode + redirect_uri_mismatch hints. BYOClientForm unchanged (R3 reuse, one copy button). Rule15/17 N/A.
    | flashcards_flagged: []
- 📄 NEW REPORT: STORY-117-01-qa.md
    | ---
    | story: STORY-117-01
    | agent: qa
    | mode: VERIFY
    | sprint: SPRINT-66
    | verifies_commit: 7168a44a
    | ---
    | STORY: STORY-117-01
    | QA: PASS
    | TESTS: 23 passed
    | ACCEPTANCE_COVERAGE: 7 of 7 Gherkin scenarios
    | REGRESSIONS: none (azure-devops-fields pre-existing; Sc6/Sc7 wizard nav intact)
    | VERDICT: Ship it. Surface confined to §3.1; exactly one Copy-redirect-URI button; testing-mode + mismatch hints render; tsc clean for story files.
- 📄 NEW REPORT: STORY-117-02-dev.md
    | ---
    | story: STORY-117-02
    | agent: developer
    | sprint: SPRINT-66
    | commit: ba14257b
    | ---
    | STORY: STORY-117-02
    | STATUS: done
    | COMMIT: ba14257b
    | TYPECHECK: pass (pre-existing errors == main baseline)
    | TESTS: FE 12 passed + BE 12 passed + BE-existing 4 passed
    | FILES_CHANGED: backend/app/core/oauth_overrides.py, backend/app/services/scope_catalog.py, frontend/src/api/oauth.ts, frontend/src/components/settings/mcp/ScopePicker.tsx
    | NOTES: Scope-tier badges (non-sensitive/sensitive/restricted, semantic tokens) + verification-burden hint + prefer drive.file; BE scope_tiers metadata on OAuthOverride + ScopeCatalogResponse (to_dict/from_dict/cache) + get_scope_catalog propagation. detectPreset reordered readwrite-first (justified R5 tie-break). Rule15 N/A. Rule18 pure extension.
    | flashcards_flagged:
- 📄 NEW REPORT: STORY-117-02-qa.md
    | ---
    | story: STORY-117-02
    | agent: qa
    | mode: VERIFY
    | sprint: SPRINT-66
    | verifies_commit: ba14257b
    | ---
    | STORY: STORY-117-02
    | QA: PASS
    | TESTS: FE 12 passed + BE 12 passed
    | ACCEPTANCE_COVERAGE: 8 of 8 Gherkin scenarios
    | REGRESSIONS: none (097-10 + sibling mcp red tests fail on main baseline too — pre-existing QueryClientProvider gap; detectPreset reorder no regression)
    | VERDICT: Ship it. FE badges+hint+least-scope; BE scope_tiers round-trips incl degraded/None; ADR-013 (no hex); Rule15 N/A.

### watch complete @ 2026-06-03T00:43:17Z — 60 min elapsed

---

## Hour-1 Synthesis @ 00:45Z

**Sprint progress in the hour:** kickoff → wave1 executed. `STORY-114-01` (standard, dependency root) ran the full loop and merged at t+25 (`899f7e87`). At t+30 the remaining 4 wave1 stories (`114-03` fast, `115-05`, `117-01`, `117-02`) launched **concurrently** in 4 worktrees; by t+60 all 4 were QA-Passed. Post-watch the serial merge barrier began consolidating (`115-05` merged → `1c5906db`; commits 5→10; Done:2, QA-Passed:3, Ready-to-Bounce:10).

**✅ Positive signals (record these — the framework worked):**
- **v2-parallel is sound.** 4 simultaneous worktrees, zero merge conflicts, clean serial-barrier consolidation. First real parallel-wave run succeeded.
- **F1 fix held end-to-end.** `.active` stayed `SPRINT-66` all hour; `ledger66` 1→15 while `ledger65` flat at 292 — **no cost misattribution** once the sentinel was hand-fixed. (Reinforces F1: automate the flip so the hand-fix isn't required.)
- **Polyglot execution worked** despite F3 — pytest (backend: 114-01 40pass, 114-03 real-Redis 7pass, 115-05 static gate) and vitest (frontend) both ran.
- **QA discipline strong.** Every story distinguished pre-existing failures (cors_middleware, fanout, azure-devops-fields, QueryClientProvider) from regressions via git-stash / main-baseline reproduction.
- **Deferred-verification pattern.** `115-05` punted the heavy docker-build + offline-Chromium smoke (R4, ~500-700MB) to the orchestrator; QA passed "static-gate scope" 7/8. ⚠ no visible tracking that the orchestrator actually runs the deferred smoke before close — possible gap.

**F3 confirmed with evidence.** Chyro `frontend/package.json` test script = vitest, 0 node:test refs, no vitest.config (inline). Agents still wrote `*.red.node.test.tsx` (node:test naming) — run through vitest `vi.mock()`. Outcome: tests pass but the repo now carries vitest tests with misleading `.node.test.tsx` names + agents whose instructions say "vitest forbidden." Exactly the leak F3 predicted; the orchestrator's sprint-context override made it *work*, not *clean*.

---

## New findings (surfaced via SPRINT-66 flashcards — real framework bugs)

> The orchestrator logged these as it hit them. All are ClearGate-framework (not Chyro-product) issues.
> (Chyro-product flashcards seen but NOT logged here: config-sync silent-skip, ci.yml pre-push suite, jsdom/queryByText test-authoring gotchas — those are new_app's own tooling.)

### F4 — Worktree-isolated stories can't load the repo's gitignored `.env`  ⟶ EPIC-043 (worktree mechanics)
Flashcard `#worktree #test-harness`: *"Backend pytest in a git worktree can't load settings — config.py resolves `_ENV_FILE` via `parents[3]` and a fresh worktree has no `.env`. Symlink worktree-root/.env → repo-root/.env before running pytest in any backend worktree."* ClearGate creates story worktrees but never provisions gitignored config the build/tests need → any target whose tooling reads a gitignored `.env` (or similar) breaks in-worktree until hand-symlinked. Fix: worktree setup should optionally symlink/copy declared gitignored config roots into each story worktree.

### F5 — `pre_gate_runner.sh` doubles a relative worktree path → REPORT_FILE ENOENT  ⟶ EPIC-043 (correctness)
Flashcard `#cleargate`: *"pass an ABSOLUTE worktree path — a relative path + the non-subshell `cd "$WORKTREE"` makes REPORT_FILE writes ENOENT (doubled path)."* After `cd "$WORKTREE"`, a relative path is re-resolved against the new cwd → doubled → write fails. Fix: `realpath` the worktree arg at entry, or `cd` in a subshell.

### F6 — `gate-checks.json` ships ClearGate-CLI-specific typecheck cmd; always FAILs in target repos  ⟶ portability (F3 family)
Flashcard `#cleargate`: *"gate-checks.json arch/qa.typecheck=`cd cleargate-cli && npm run typecheck` is ClearGate-CLI-specific → ALWAYS FAILs in the Chyro product repo; treat that FAIL as NOISE."* Same root defect as F3: the shipped gate config hardcodes the meta-repo's own paths/commands. A target's gate runs a command for a directory that doesn't exist → permanent false-FAIL the orchestrator must learn to ignore. Fix: gate-checks.json typecheck/test commands must be repo-derived at `init`, not shipped as ClearGate-CLI literals.

### F7 — `stray_env_files` gate flags the F4 `.env` symlink workaround  ⟶ EPIC-043 (minor, interaction)
Flashcard `#cleargate`: *"stray_env_files flags the worktree .env symlink (gitignored, harmless)."* The pre-gate surface scan flags the symlink F4 requires. Fix folds into F4 (whitelist provisioned config) — if F4 provisions `.env` officially, the scan should exempt it.

### F8 — `run_script.sh` doesn't forward ambient env to its node child  ⟶ EPIC-043 (correctness)
Flashcard `#cleargate`: *"run_script.sh does NOT forward ambient env vars to its node child — `CLEARGATE_STATE_FILE` set via `export` is invisible to update_state.mjs / validate_*.mjs through the wrapper. Pass it inline or call the script directly."* The wrapper drops exported env → state-file overrides (and any env-based config) silently don't reach the wrapped node scripts. Fix: `run_script.sh` should exec the child with the inherited environment.

**Tally:** F1, F2 (init_sprint gaps — orchestrator-fixed), F3 + F6 (portability: framework's own conventions/paths shipped as law), F4 + F7 (worktree config provisioning), F5 + F8 (script-wrapper correctness bugs). F3/F6 are the highest-impact (block any non-node target out of the box).

---

### Watch continuing @ 00:45Z — sprint mid-flight (2/15 done, wave1 consolidating, waves 2–11 ahead). Relaunched 60-min poller for the next window.

## Observation Timeline — window 2 (autonomous continuation @ 2026-06-03T00:46:46Z)

### t+5m @ 2026-06-03T00:51:47Z
- .active=`SPRINT-66` | HEAD=`462a8366 chore(SPRINT-66): flashcards from wave 1` | commits(main..S66)=17 | reports=12 | worktrees=3 | ledger66=16 ledger65=292
- ✅ NEW COMMITS on sprint/S-66:
    462a8366 chore(SPRINT-66): flashcards from wave 1
- 🌿 worktree created: .worktrees/STORY-114-02
- 🌿 worktree created: .worktrees/STORY-115-01
- 🌿 worktree created: .worktrees/STORY-117-04
- 📄 NEW REPORT: wave1-remainder-devops.md
    | # DevOps Report — Wave-1 Remainder (SPRINT-66)
    | 
    | Merged: STORY-114-03 · STORY-115-05 · STORY-117-01 · STORY-117-02
    | Serial single-writer axis — no concurrent merges.
    | 
    | ---
    | 
    | ## STORY-114-03 — per-queue worker heartbeats + healthcheck fix
    | 
    | ### Merge Result
    | - Sprint branch: sprint/S-66
    | - Story branch: story/STORY-114-03 (fast lane — dev commit only; no arch.md required)
    | - Merge commit SHA: ee8d93f0c169a5af8c1a2f4a4bbe194af2fdf965
    | - Diff stat: 4 files changed, 499 insertions(+), 4 deletions(-)
- 🃏 6 new FLASHCARD line(s):
    # ClearGate Flashcards
    
    One-liner gotcha log. Newest first. Grep by tag (e.g. `grep '#schema'`).
    Active cards have no marker; `[S]` = stale, `[R]` = resolved (see `.claude/skills/flashcard/SKILL.md` Rules 7–8).
    Format: `YYYY-MM-DD · #tags · [marker]? lesson`
    

### t+10m @ 2026-06-03T00:56:48Z
- .active=`SPRINT-66` | HEAD=`462a8366 chore(SPRINT-66): flashcards from wave 1` | commits(main..S66)=17 | reports=12 | worktrees=3 | ledger66=19 ledger65=292

### t+15m @ 2026-06-03T01:01:50Z
- .active=`SPRINT-66` | HEAD=`462a8366 chore(SPRINT-66): flashcards from wave 1` | commits(main..S66)=17 | reports=12 | worktrees=3 | ledger66=20 ledger65=292

### t+20m @ 2026-06-03T01:06:51Z
- .active=`SPRINT-66` | HEAD=`462a8366 chore(SPRINT-66): flashcards from wave 1` | commits(main..S66)=17 | reports=12 | worktrees=3 | ledger66=20 ledger65=292

### t+25m @ 2026-06-03T01:11:53Z
- .active=`SPRINT-66` | HEAD=`462a8366 chore(SPRINT-66): flashcards from wave 1` | commits(main..S66)=17 | reports=12 | worktrees=3 | ledger66=24 ledger65=292

### t+30m @ 2026-06-03T01:16:54Z
- .active=`SPRINT-66` | HEAD=`6cbeab18 merge(story/STORY-117-04): align BYO setup doc with in-wizard checklist` | commits(main..S66)=25 | reports=19 | worktrees=0 | ledger66=25 ledger65=292
- 🔁 status change: {"Done":5,"Ready to Bounce":10} → {"Done":8,"Ready to Bounce":7}
- ✅ NEW COMMITS on sprint/S-66:
    6cbeab18 merge(story/STORY-117-04): align BYO setup doc with in-wizard checklist
    e958cce8 merge(story/STORY-115-01): deck render service (headless Chromium)
    98b76bb6 merge(story/STORY-114-02): admin system-status endpoint
    ee35fdae feat(epic-115): STORY-115-01 deck render service (headless Chromium)
    c5c851c5 feat(epic-114): STORY-114-02 admin system-status endpoint
    5a27c57f qa-red(STORY-115-01): write failing deck-render tests
    c71e1fe2 qa-red(STORY-114-02): write failing admin-status tests
    3895a6d9 docs(epic-117): STORY-117-04 align BYO setup doc with in-wizard checklist
- 🍂 worktree removed: .worktrees/STORY-114-02
- 🍂 worktree removed: .worktrees/STORY-115-01
- 🍂 worktree removed: .worktrees/STORY-117-04
- 📄 NEW REPORT: STORY-114-02-dev.md
    | ---
    | story: STORY-114-02
    | agent: developer
    | commit: c5c851c5
    | ---
    | STORY: STORY-114-02
    | STATUS: done
    | COMMIT: c5c851c5
    | TESTS: 19 passed
    | FILES_CHANGED: backend/app/api/routes/admin_system_status.py (new), backend/app/main.py (router import+include)
    | NOTES: Admin-gated GET /api/admin/system-status consuming run_all_probes(); overall synthesis; whitelisted fields (R7). Module-attr import (`import app.core.health_probes as health_probes; health_probes.run_all_probes()`) for patch compatibility. Rule15 N/A. Rule18 reuse get_current_admin_user + run_all_probes.
    | flashcards_flagged:
    |   - "2026-06-03 · #pytest #mock · from-import binds a local name; patch('module.symbol') only intercepts module-attribute lookups — use 'import module as m; m.fn()' in routes for patchability"
- 📄 NEW REPORT: STORY-114-02-qa.md
    | ---
    | story: STORY-114-02
    | agent: qa
    | mode: VERIFY
    | verifies_commit: c5c851c5
    | ---
    | STORY: STORY-114-02
    | QA: PASS
    | TESTS: 19 passed (45 in neighborhood incl health_probes)
    | ACCEPTANCE_COVERAGE: 7 of 7
    | REGRESSIONS: none
    | VERDICT: Ship it. Mock discipline correct; router registered main.py:40/:616; whitelisted keys (set equality); secret-leak grep passes; Rule15 N/A; /health guards green.
- 📄 NEW REPORT: STORY-115-01-dev.md
    | ---
    | story: STORY-115-01
    | agent: developer
    | commit: ee35fdae
    | ---
    | STORY: STORY-115-01
    | STATUS: done
    | COMMIT: ee35fdae
    | TESTS: 7 passed (real Chromium)
    | FILES_CHANGED: backend/app/services/widgets/structured/export/deck_renderer.py (new), export/__init__.py (new)
    | NOTES: Lazy-singleton warm Chromium per design-lock; CSS-first freeze (!important on .slide). DEVIATIONS (QA-accepted, semantically equivalent): (1) per-slide PNG via viewport-clip screenshot (one slide at fixed 1920x1080) vs handle.screenshot() — flex container shrinks simultaneous slides; (2) print CSS (page-break-after:always + @page size) for per-slide PDF pagination. Rule15 N/A (no DB/authz/migration). ENV: `uv sync --all-extras` + `python -m playwright install chromium` in worktree.
    | flashcards_flagged:
    |   - "2026-06-03 · #playwright #chromium · viewport-clip screenshot (position:fixed top:0 left:0 + clip 1920x1080) safer than handle.screenshot() for deck slides"
    |   - "2026-06-03 · #playwright #chromium · page.pdf prefer_css_page_size needs injected print CSS (page-break-after:always + @page size) for per-slide pagination; else all slides flow onto one page"
- 📄 NEW REPORT: STORY-115-01-qa.md
    | ---
    | story: STORY-115-01
    | agent: qa
    | mode: VERIFY
    | verifies_commit: ee35fdae
    | ---
    | STORY: STORY-115-01
    | QA: PASS (high-scrutiny)
    | TESTS: 7 passed (real Chromium)
    | ACCEPTANCE_COVERAGE: 7 of 7 (6 Gherkin + dep precheck)
    | REGRESSIONS: none
    | VERDICT: Ship it. Both deviations semantically sound (viewport-clip = safer than element capture; print CSS required for prefer_css_page_size pagination). Freeze correct (!important on bare .slide; nav script can't undo). PNG≈16:9 (PIL ±2%), PDF page N↔png[N-1], no blank slides (stdev check). DeckRenderError on failure. Surface = deck_renderer.py + __init__.py only. Heads-up: PIL Image.getdata() deprecated in Pillow 14.
- 📄 NEW REPORT: STORY-117-04-dev.md
    | ---
    | story: STORY-117-04
    | agent: developer
    | commit: 3895a6d9
    | lane: fast
    | ---
    | STORY: STORY-117-04
    | STATUS: done
    | COMMIT: 3895a6d9
    | TESTS: n/a (docs)
    | FILES_CHANGED: docs/operations/oauth-byo-client-setup.md
    | NOTES: Aligned BYO setup doc with in-wizard GcpSetupChecklist (117-01); doc = deep-reference, wizard = primary path. Canonical redirect URI unchanged. Rule 19 (MCP Servers section) preserved.
    | flashcards_flagged: []
- 📄 NEW REPORT: STORY-117-04-qa.md
    | ---
    | story: STORY-117-04
    | agent: qa
    | mode: VERIFY
    | verifies_commit: 3895a6d9
    | ---
    | STORY: STORY-117-04
    | QA: PASS
    | TESTS: n/a (docs; 7 of 7 reviewer-verifiable doc assertions)
    | ACCEPTANCE_COVERAGE: 7 of 7
    | REGRESSIONS: none (single-file doc commit)
    | VERDICT: Ship it. Deep-reference callout + 6-step checklist w/ anchors; Testing-mode promoted to §8; redirect_uri_mismatch warning at paste step; scope-tier/least-scope note; See-Also names wizard; Rule 19 intact. Step-label divergence is complementary (doc = GCP-console actions; wizard step6 = UI credential entry), no contradiction.
- 📄 NEW REPORT: batch2-devops.md
    | # DevOps Report — Batch 2 (SPRINT-66)
    | 
    | Stories: STORY-114-02, STORY-115-01, STORY-117-04
    | Sprint branch: sprint/S-66
    | Executed: 2026-06-03T01:15:19Z
    | 
    | ---
    | 
    | ## STORY-114-02 — admin system-status endpoint
    | 
    | ### Merge Result
    | - Sprint branch: sprint/S-66
    | - Story branch: story/STORY-114-02
    | - Dev SHA: c5c851c5

### t+35m @ 2026-06-03T01:21:55Z
- .active=`SPRINT-66` | HEAD=`b69f013a chore(SPRINT-66): flashcards from batch 2 (114-02/115-01/117-04)` | commits(main..S66)=26 | reports=19 | worktrees=3 | ledger66=27 ledger65=292
- ✅ NEW COMMITS on sprint/S-66:
    b69f013a chore(SPRINT-66): flashcards from batch 2 (114-02/115-01/117-04)
- 🌿 worktree created: .worktrees/STORY-114-04
- 🌿 worktree created: .worktrees/STORY-115-02
- 🌿 worktree created: .worktrees/STORY-117-03
- 🃏 5 new FLASHCARD line(s):
    # ClearGate Flashcards
    
    One-liner gotcha log. Newest first. Grep by tag (e.g. `grep '#schema'`).
    Active cards have no marker; `[S]` = stale, `[R]` = resolved (see `.claude/skills/flashcard/SKILL.md` Rules 7–8).
    Format: `YYYY-MM-DD · #tags · [marker]? lesson`

### t+40m @ 2026-06-03T01:26:57Z
- .active=`SPRINT-66` | HEAD=`b69f013a chore(SPRINT-66): flashcards from batch 2 (114-02/115-01/117-04)` | commits(main..S66)=26 | reports=19 | worktrees=3 | ledger66=27 ledger65=292

### t+45m @ 2026-06-03T01:31:58Z
- .active=`SPRINT-66` | HEAD=`b69f013a chore(SPRINT-66): flashcards from batch 2 (114-02/115-01/117-04)` | commits(main..S66)=26 | reports=19 | worktrees=3 | ledger66=27 ledger65=292

### t+50m @ 2026-06-03T01:37:00Z
- .active=`SPRINT-66` | HEAD=`b69f013a chore(SPRINT-66): flashcards from batch 2 (114-02/115-01/117-04)` | commits(main..S66)=26 | reports=20 | worktrees=3 | ledger66=29 ledger65=292
- 📄 NEW REPORT: STORY-115-02-dev-blockers.md
    | ## Test-Pattern
    | `test_html_export_spec_fallback` fails because its `_make_spec()` fixture constructs `DeckSpec(theme="dark", ...)` but the `DeckSpec.theme` field is `ThemeName = Literal["technical-dark", "business-warm", "minimal-light"]` — "dark" is not a valid value, so `Pydantic` raises `ValidationError` before `html_export` is ever called.
    | 
    | ## Spec-Gap
    | The Red test's internal fixture uses an invalid theme literal (`"dark"`) — the correct value is `"technical-dark"` (or `"business-warm"` / `"minimal-light"`); the `DeckSpec` Pydantic model rejects `"dark"` at construction, so the test never reaches the `html_export` assertion.
    | 
    | ## Environment
    | N/A — all 9 other tests pass; the failure is a data error in the Red test fixture, not an environment issue.

### t+55m @ 2026-06-03T01:42:02Z
- .active=`SPRINT-66` | HEAD=`b69f013a chore(SPRINT-66): flashcards from batch 2 (114-02/115-01/117-04)` | commits(main..S66)=26 | reports=21 | worktrees=3 | ledger66=29 ledger65=292
- 📄 NEW REPORT: STORY-114-04-dev-blockers.md
    | ## Test-Pattern
    | Two tests call `screen.queryByText('Connected')` (lines 229, 426 of the Red test) but the healthy fixture has BOTH postgres and redis with `detail: 'Connected'`, causing `@testing-library/dom` 10.4.1 `queryByText` to throw "Found multiple elements with the text: Connected" on every render — the assertion can never pass or return null, it always throws.
    | 
    | ## Spec-Gap
    | The `healthyComponents` fixture in `SystemStatusSection.red.node.test.tsx` (lines 43-47) intentionally assigns `detail: 'Connected'` to both the postgres and redis rows; `queryByText('Connected')` expects exactly one matching element but the fixture forces two — the two tests (S1 "renders detail text for at least one component" and S5 "section renders with shared query key") are structurally unfixable without changing the assertion to `queryAllByText('Connected')[0]` or deduplifying the fixture.
    | 
    | ## Environment
    | N/A — 34 of 36 tests pass; only these 2 fixture-vs-assertion conflicts remain; typecheck is clean; button disabled-while-fetching and all other scenarios are green.

### t+60m @ 2026-06-03T01:47:03Z
- .active=`SPRINT-66` | HEAD=`b69f013a chore(SPRINT-66): flashcards from batch 2 (114-02/115-01/117-04)` | commits(main..S66)=26 | reports=21 | worktrees=3 | ledger66=30 ledger65=292

### watch complete @ 2026-06-03T01:47:05Z — 60 min elapsed

---

## Hour-2 Synthesis @ 01:48Z

**Progress:** wave1 fully consolidated (114-03/115-05/117-01/117-02 merged serially — `wave1-remainder-devops.md`), then batch 114-02 + 115-01 + 117-04 ran in parallel and merged (`batch2-devops.md`). **8/15 Done** at window end (commits 5→26). Next batch (114-04, 115-02, 117-03) launched in 3 parallel worktrees at t+35.

**✅ Still healthy:** `.active`=SPRINT-66 throughout; ledger66 15→30, ledger65 flat 292 (no misattribution); no `.active` drift; no hook errors; serial merge barrier clean across two batches; QA continues to accept semantically-equivalent deviations with justification (115-01 deck renderer: viewport-clip screenshot + print-CSS pagination). DevOps batches merges into one report but executes serially (single-writer axis honored).

**🟥 Two blockers — both QA-Red fixture bugs (not Dev/product):**
- `STORY-115-02-dev-blockers.md`: Red test `_make_spec()` builds `DeckSpec(theme="dark")` but the field is `Literal["technical-dark","business-warm","minimal-light"]` → Pydantic `ValidationError` at construction, before `html_export` is reached. Invalid enum literal in the QA-authored fixture.
- `STORY-114-04-dev-blockers.md`: healthy fixture sets `detail:'Connected'` on BOTH postgres+redis → `queryByText('Connected')` throws "Found multiple elements"; 34/36 pass, these 2 structurally unfixable without `queryAllByText`/dedup. **This is a repeat of a SPRINT-63 flashcarded hazard** (`queryByText` multi-match family).

### F9 — TPV (wiring-only) lets semantic QA-Red fixture bugs through → wasted Developer dispatch  ⟶ EPIC-043 (loop efficiency)
Both blockers are QA-Red **fixture** defects: an invalid Pydantic enum literal and a duplicate-text multi-match. The §C.3.5 TPV gate is explicitly wiring-only ("does NOT evaluate test logic correctness"), so neither was caught before the Developer was dispatched against an unsatisfiable Red test → a full Dev cycle burned, blocker filed, route-back to QA-Red required.
- new_app already carries a local mitigation — the SUG-SPRINT-52-03 **QA-Red Lint Gate** (`qa_red_lint.mjs`, rules R1–R5) — but its coverage misses (a) enum/Literal-validity in constructed fixtures and (b) `queryByText` single-match. The multi-match repeat despite a SPRINT-63 flashcard shows flashcards alone don't prevent recurrence.
- NB `qa_red_lint.mjs` is **new_app-local** (not in the ClearGate manifest) — these are exactly the SUG-SPRINT-52 sprint-execution customizations flagged earlier as at-risk on a blind `cleargate upgrade`. Seeing them run live argues for **upstreaming** a stock QA-Red semantic-fixture lint into ClearGate (extend TPV or ship a `qa_red_lint` with enum + query-match rules), rather than each target reinventing it.

**Watching note:** 114-04 + 115-02 expected to route back to QA-Red for fixture fixes; 117-03 (DB-touching, wave9) in flight. Remaining: export chain 115-02→03→04, OAuth 117-03→05, CR-063 (DB). Sprint ~53% done in ~2h.

### Watch continuing @ 01:48Z — relaunched 60-min poller (window 3). Will capture blocker resolution + DB-wave serialization + (if reached) sprint close.

## Observation Timeline — window 3 (autonomous continuation @ 2026-06-03T01:49:07Z)

### t+5m @ 2026-06-03T01:54:07Z
- .active=`SPRINT-66` | HEAD=`b69f013a chore(SPRINT-66): flashcards from batch 2 (114-02/115-01/117-04)` | commits(main..S66)=26 | reports=21 | worktrees=3 | ledger66=31 ledger65=292

### t+10m @ 2026-06-03T01:59:09Z
- .active=`SPRINT-66` | HEAD=`b69f013a chore(SPRINT-66): flashcards from batch 2 (114-02/115-01/117-04)` | commits(main..S66)=26 | reports=21 | worktrees=3 | ledger66=32 ledger65=292

### t+15m @ 2026-06-03T02:04:10Z
- .active=`SPRINT-66` | HEAD=`b69f013a chore(SPRINT-66): flashcards from batch 2 (114-02/115-01/117-04)` | commits(main..S66)=26 | reports=23 | worktrees=3 | ledger66=34 ledger65=292
- 🔁 status change: {"Done":8,"Ready to Bounce":7} → {"Done":8,"Ready to Bounce":6,"QA Passed":1}
- 📄 NEW REPORT: STORY-117-03-dev.md
    | ---
    | story: STORY-117-03
    | agent: developer
    | commit: ed30e874
    | ---
    | STORY: STORY-117-03
    | STATUS: done
    | COMMIT: ed30e874
    | TESTS: BE 13 passed + FE 7 passed
    | FILES_CHANGED: backend/app/api/routes/oauth_connections.py, backend/app/services/google_adapter/error_hints.py, backend/app/services/oauth_grant_service.py, frontend/src/components/chat/MCPReconsentCard.tsx, frontend/src/test-setup.ts
    | NOTES: Step-up route (owner pre-check + step_up() + 404 map); revoke route (owner pre-check + revoke_grant() delegation, row deleted on ok/fail); error_hints _hint_insufficient_scope→None only; MCPReconsentCard popup + origin-checked listener (event.origin===window.location.origin verbatim from AddMCPWizard:1199); phase=granted only on {status:'ok'}. DEVIATIONS (QA-accepted): (1) oauth_grant_service.step_up() fixed real schema bug mcp_url→server_url + inline orchestration (never-built async wrapper) — only 1 caller, not broken; (2) test-setup.ts window.location.assign polyfill for jsdom. Rule15 owner pre-check on both routes (security).
    | flashcards_flagged:
    |   - "2026-06-03 · #auth #oauth #schema · oauth_grant_service.step_up() queried non-existent 'mcp_url' column (real: 'server_url') → DB 400 → caught as APIError → false 404. Verify column names against live schema before wiring service calls."
    |   - "2026-06-03 · #test-harness #vitest · vi.spyOn(window.location,'assign') throws TypeError in jsdom (non-configurable) — delete window.location then redefine as configurable own property in test-setup.ts."
- 📄 NEW REPORT: STORY-117-03-qa.md
    | ---
    | story: STORY-117-03
    | agent: qa
    | mode: VERIFY
    | verifies_commit: ed30e874
    | ---
    | STORY: STORY-117-03
    | QA: PASS (auth-critical, high-scrutiny)
    | TESTS: BE 13 passed + FE 7 passed
    | ACCEPTANCE_COVERAGE: 8 of 8
    | REGRESSIONS: none (azure-devops-fields pre-existing on main)
    | VERDICT: Ship it. Deviation 1 (step_up rewrite) = correct minimal bug-fix, only 1 caller (the new route), no breakage, scope union + no-downgrade intact. Deviation 2 (test-setup.ts polyfill) additive, no FE regression. SECURITY: owner pre-check on BOTH routes (oauth_connections.py:1129/:1188); origin check verbatim (MCPReconsentCard.tsx:128 ← AddMCPWizard:1199); error_hints only _hint_insufficient_scope→None (117-05 boundary preserved). No migration. 1 FE test flaky cold-start (granted-on-ok) — warm runs stable, non-blocking.

### t+20m @ 2026-06-03T02:09:12Z
- .active=`SPRINT-66` | HEAD=`126ae8cb merge(story/STORY-115-02): pptx + html deck exporters` | commits(main..S66)=32 | reports=27 | worktrees=1 | ledger66=36 ledger65=292
- 🔁 status change: {"Done":8,"Ready to Bounce":6,"QA Passed":1} → {"Done":9,"QA Passed":2,"Ready to Bounce":4}
- ✅ NEW COMMITS on sprint/S-66:
    126ae8cb merge(story/STORY-115-02): pptx + html deck exporters
    190cf0c5 merge(story/STORY-114-04): system status admin section + useSystemStatus hook
    9678e8e4 feat(epic-114): STORY-114-04 system status admin section + useSystemStatus hook
    4d684824 feat(epic-115): STORY-115-02 pptx + html deck exporters
    3398b2cf qa-red(STORY-114-04): write failing system-status UI tests
    ef1583fe qa-red(STORY-115-02): write failing exporter tests
- 🍂 worktree removed: .worktrees/STORY-114-04
- 🍂 worktree removed: .worktrees/STORY-115-02
- 📄 NEW REPORT: STORY-114-04-dev.md
    | ---
    | story: STORY-114-04
    | agent: developer
    | commit: 9678e8e4
    | ---
    | STORY: STORY-114-04
    | STATUS: done
    | COMMIT: 9678e8e4
    | TESTS: 36 passed (vitest)
    | FILES_CHANGED: frontend/src/hooks/useSystemStatus.ts (new), frontend/src/components/admin/sections/SystemStatusSection.tsx (new), frontend/src/routes/admin.tsx (modified)
    | NOTES: useSystemStatus (TanStack refetchInterval 20s + manual re-test disabled in-flight); SystemStatusSection in ADMIN_SECTIONS grouped by category w/ section-local pill (ADR-013, no hex); sidebar warning dot when overall!=healthy. Reuse: useEmbeddingRebuildStatus pattern; StatusBadge NOT forked. Rule15 N/A. (Re-dispatch after QA-Red fixture fix: redis detail 'Ping OK'.)
    | flashcards_flagged: []
- 📄 NEW REPORT: STORY-114-04-qa.md
    | ---
    | story: STORY-114-04
    | agent: qa
    | mode: VERIFY
    | verifies_commit: 9678e8e4
    | ---
    | STORY: STORY-114-04
    | QA: PASS (orchestrator override of a DoD-literal FAIL)
    | TESTS: 36 passed (all 6 §2.1 scenarios green); azure-devops-fields failure pre-existing on main
    | ACCEPTANCE_COVERAGE: 6 of 6 Gherkin scenarios
    | REGRESSIONS: none
    | VERDICT: QA returned FAIL on a §4.1/§4.2 literalism — a SEPARATE green-path `SystemStatusSection.test.tsx` file (distinct from the red-now-green file). ORCHESTRATOR OVERRIDE: the red-now-green file covers all 6 scenarios + passes = acceptance met; a duplicate green file is redundant (Rule 18), consistent with the STORY-117-01 precedent (QA there accepted red-now-green). Impl verified solid: refetchInterval 20s, in-flight guard, ADMIN_SECTIONS registration, category grouping, sidebar dot, StatusBadge reused (not forked), ADR-013 clean, Rule 15 N/A. Accepted.
- 📄 NEW REPORT: STORY-115-02-dev.md
    | ---
    | story: STORY-115-02
    | agent: developer
    | commit: 4d684824
    | ---
    | STORY: STORY-115-02
    | STATUS: done
    | COMMIT: 4d684824
    | TESTS: 10 passed (17 in export neighborhood)
    | FILES_CHANGED: backend/app/services/widgets/structured/export/pptx_exporter.py (new), html_exporter.py (new), export/__init__.py (modified)
    | NOTES: pngs_to_pptx → 16:9 deck (Inches 13.333x7.5), one full-bleed PNG/slide, ValueError on empty + corrupt; html_export → widget_body verbatim, falls back to render_deck_spec. Reuse python-pptx (115-01 dep) + render_deck_spec. Rule15/16 N/A (pure transforms). (Re-dispatch after QA-Red fixture fix: theme technical-dark.)
    | flashcards_flagged: []
- 📄 NEW REPORT: STORY-115-02-qa.md
    | ---
    | story: STORY-115-02
    | agent: qa
    | mode: VERIFY
    | verifies_commit: 4d684824
    | ---
    | STORY: STORY-115-02
    | QA: PASS
    | TESTS: 10 passed (17 export neighborhood, no regression to 115-01 deck_renderer)
    | ACCEPTANCE_COVERAGE: 8 of 8
    | REGRESSIONS: none
    | VERDICT: Ship it. 16:9 deck via Inches(13.333x7.5), full-bleed PNG/slide, order preserved (blob round-trip), ValueError on empty/corrupt; html_export verbatim + render_deck_spec fallback. Surface = pptx_exporter + html_exporter + __init__.py only. Rule 15/16 N/A.

### t+25m @ 2026-06-03T02:14:14Z
- .active=`SPRINT-66` | HEAD=`d9abcf76 chore(SPRINT-66): flashcards from batch 3 (114-04/115-02/117-03)` | commits(main..S66)=36 | reports=28 | worktrees=2 | ledger66=37 ledger65=292
- 🔁 status change: {"Done":9,"QA Passed":2,"Ready to Bounce":4} → {"Done":11,"Ready to Bounce":4}
- ✅ NEW COMMITS on sprint/S-66:
    d9abcf76 chore(SPRINT-66): flashcards from batch 3 (114-04/115-02/117-03)
    abf70d5f merge(story/STORY-117-03): step-up reconsent + revoke wiring
    ed30e874 feat(epic-117): STORY-117-03 step-up reconsent + revoke wiring
    09f23378 qa-red(STORY-117-03): write failing step-up/revoke tests
- 🌿 worktree created: .worktrees/STORY-115-03
- 🌿 worktree created: .worktrees/STORY-117-05
- 🍂 worktree removed: .worktrees/STORY-117-03
- 📄 NEW REPORT: batch3-devops.md
    | # DevOps Report — SPRINT-66 Batch 3 (STORY-114-04, STORY-115-02, STORY-117-03)
    | 
    | Generated: 2026-06-03T02:10:17Z
    | Sprint branch: sprint/S-66
    | 
    | ---
    | 
    | ## STORY-114-04 — system status admin section + useSystemStatus hook
    | 
    | ### Merge Result
    | - Sprint branch: sprint/S-66
    | - Story branch: story/STORY-114-04 (dev SHA: 9678e8e4)
    | - Merge commit SHA: 190cf0c5
    | - Diff stat: 4 files changed, 854 insertions(+)
- 🃏 5 new FLASHCARD line(s):
    # ClearGate Flashcards
    
    One-liner gotcha log. Newest first. Grep by tag (e.g. `grep '#schema'`).
    Active cards have no marker; `[S]` = stale, `[R]` = resolved (see `.claude/skills/flashcard/SKILL.md` Rules 7–8).
    Format: `YYYY-MM-DD · #tags · [marker]? lesson`

### t+30m @ 2026-06-03T02:19:17Z
- .active=`SPRINT-66` | HEAD=`d9abcf76 chore(SPRINT-66): flashcards from batch 3 (114-04/115-02/117-03)` | commits(main..S66)=36 | reports=28 | worktrees=2 | ledger66=39 ledger65=292

### t+35m @ 2026-06-03T02:24:18Z
- .active=`SPRINT-66` | HEAD=`d9abcf76 chore(SPRINT-66): flashcards from batch 3 (114-04/115-02/117-03)` | commits(main..S66)=36 | reports=28 | worktrees=2 | ledger66=40 ledger65=292

### t+40m @ 2026-06-03T02:29:19Z
- .active=`SPRINT-66` | HEAD=`d9abcf76 chore(SPRINT-66): flashcards from batch 3 (114-04/115-02/117-03)` | commits(main..S66)=36 | reports=28 | worktrees=2 | ledger66=41 ledger65=292

### t+45m @ 2026-06-03T02:34:21Z
- .active=`SPRINT-66` | HEAD=`d9abcf76 chore(SPRINT-66): flashcards from batch 3 (114-04/115-02/117-03)` | commits(main..S66)=36 | reports=28 | worktrees=2 | ledger66=42 ledger65=292

### t+50m @ 2026-06-03T02:39:23Z
- .active=`SPRINT-66` | HEAD=`d9abcf76 chore(SPRINT-66): flashcards from batch 3 (114-04/115-02/117-03)` | commits(main..S66)=36 | reports=28 | worktrees=2 | ledger66=42 ledger65=292

### t+55m @ 2026-06-03T02:44:24Z
- .active=`SPRINT-66` | HEAD=`d9abcf76 chore(SPRINT-66): flashcards from batch 3 (114-04/115-02/117-03)` | commits(main..S66)=36 | reports=28 | worktrees=2 | ledger66=42 ledger65=292

### t+60m @ 2026-06-03T02:49:27Z
- .active=`SPRINT-66` | HEAD=`d9abcf76 chore(SPRINT-66): flashcards from batch 3 (114-04/115-02/117-03)` | commits(main..S66)=36 | reports=28 | worktrees=2 | ledger66=42 ledger65=292

### watch complete @ 2026-06-03T02:49:29Z — 60 min elapsed

---

## Hour-3 Synthesis @ 02:50Z

**Progress:** the two F9 blockers RESOLVED via route-back → QA-Red fixture fix → re-dispatch → merge (114-04: redis detail `Connected`→`Ping OK` dedup; 115-02: theme `dark`→`technical-dark`). DB-touching auth wave 117-03 passed high-scrutiny QA (and fixed a *real* schema bug live: `mcp_url`→`server_url`). **11/15 Done** (commits 26→36). 115-03 + 117-05 launched in worktrees.

**✅ Still healthy:** F1 fix held a 3rd hour — `.active`=SPRINT-66 unbroken, ledger65 flat 292 the whole time, ledger66 30→42. No drift, no misattribution. The execution loop's blocker-recovery path works end-to-end.

### F10 — QA-Verify DoD-literalism: "red-now-green" file rejected for lack of a *separate* green file → repeated false-FAIL  ⟶ EPIC-043 (loop friction)
On 114-04 QA-Verify returned FAIL on a §4.1/§4.2 literal reading — it expected a SEPARATE green-path test file distinct from the (now-passing) red file. Orchestrator OVERRODE: the red-now-green file covers all scenarios + passes = acceptance met; a duplicate green file violates Rule 18. **Same override was needed on 117-01** → recurring. The QA agent treats "a green test exists" as "a file other than the red file," forcing an orchestrator override each time. Fix: clarify in `qa.md` / DoD that a red-test-turned-green satisfies the green-test requirement (no duplicate file; Rule 18). Positive: the orchestrator-override mechanism worked with cited precedent — but it shouldn't be needed repeatedly.

### ⚠ STALL detected @ ~02:50Z — orchestrator session appears idle (not a framework bug)
- ledger66 flat at 42 since t+45 (02:34Z); newest ledger/hook write 02:29Z (~21 min stale); **0 files modified in either in-flight worktree (115-03, 117-05) in the last 40 min**; 115-03 holds an uncommitted `backend/app/api/routes/documents.py` edit, untouched.
- Conclusion: the new_app orchestrator (separate Claude session) is idle/paused — consistent with the user driving the observer session instead. NOT a ClearGate defect; flagged for the user to resume that session.
- Remaining when it resumes: 115-03 (export endpoint), 117-05 (reconsent card), 115-04 (FE export menu, dep on 115-03), CR-063 (DB migration 134) — then sprint close (the untested-this-run path: F1's `.active` truncate + close gate).

### Watch PAUSED @ 02:50Z pending user — orchestrator idle, nothing to poll. Findings F1–F10 recorded. Resume on request.

## Observation Timeline — window 4 (closure watch @ 2026-06-03T05:03:41Z; exits on close/close-gate/idle-45m/5h-cap)

### t=5m @ 2026-06-03T05:08:42Z
- .active=`SPRINT-66` sprint_status=Active | done=15/15 | HEAD=`6b393353 chore(SPRINT-66): consolidation /simplify` | commits=54 reports=39 wt=0 | ledger66=59 l65=292 | wt_fresh6m=0

### 🛎 CLOSE GATE REACHED @ 2026-06-03T05:08:42Z — reporter wrote SPRINT-66_REPORT.md; close likely awaiting human ack

---

## Final Synthesis @ 05:10Z — sprint at close-ack gate

**Outcome (from `SPRINT-66_REPORT.md`):** Status **Shipped**, goal verdict **MET**. 15 planned / 15 shipped / 0 carried over, ~4h11m wall. Report pushed to MCP store 04:03Z. `sprint_status` still `Active`, `.active` still `SPRINT-66` → halted at the Gate-4 close-ack (close_sprint.mjs not yet run; no `.doc-refresh-checklist.md`). **F1's close-path (`.active` truncate) is the one mechanic this run hasn't exercised — pending the human ack.**

**Gap stories (completed 02:50→05:08, unobserved live; reconstructed from reports):** 115-03 (qa-bounce ×1 → pass), 117-05 (pass), 115-04 (pass), CR-063 (DB migration 134, high-scrutiny pass). No new blockers. Bounces across the sprint were low (mostly first-pass; 2 arch-bounces = the F9 fixture bugs, ~2 qa-bounces).

**No new FRAMEWORK findings in the gap** — all ~29 sprint flashcards beyond F1–F11 are Chyro-product gotchas (playwright/chromium Dockerfile, vitest `vi.mock` virtual-arg, pytest schema seeds, migration `$pd$` parity). Recorded for completeness, not ClearGate defects.

### F11 — Static-scope QA can pass a story whose deferred heavy verification fails; caught only post-merge  ⟶ EPIC-043 (loop integrity)
STORY-115-05 QA passed on **static-gate scope** (deps declared in pyproject + Dockerfile), but the real acceptance — a `docker build` + offline-Chromium smoke (R4, ~500-700MB) — was **deferred to the orchestrator** and only run AFTER merge. The merged Dockerfile used `RUN playwright install` → exit 127 (`playwright` CLI absent from the `python:3.12-slim` runtime stage); **the build failed**, fixed in follow-up `b249b8a1` (merge `1e8073e4`). So a story reached **Done/merged** with its real gate unrun; the broken artifact sat on the sprint branch until the orchestrator's manual post-merge smoke caught it.
- Root gap: ClearGate has no mechanism to (a) record that a story owes a deferred verification, or (b) block merge / flag "Done" until it runs. The "Done" status overstated readiness for one story.
- This is the materialized form of the hour-1 deferred-verification concern. Fix: a `deferred_verification:` field the close gate enforces (must run + green before close), or a QA status `PASS-PENDING-SMOKE` that blocks merge.

### Observation (not a defect) — parallel automation still unexercised
The report states `launch_wave.mjs parallel()` was **deliberately not used**; the orchestrator hand-rolled parallelism via manual stage barriers (3–4 concurrent agents/stage). So the shipped parallel-wave codepath remains unexercised in production (as in SPRINT-32). The capability keeps shipping but the human orchestrator parallelizes by hand — worth asking whether `launch_wave.mjs` is the right abstraction or whether the manual stage-barrier pattern should be the documented one.

---

## FINAL TALLY — 11 framework findings (F1–F11), all routed EPIC-043 unless noted
- **Init gaps (orchestrator-fixed live):** F1 `.active` not set at kickoff · F2 lane audit not applied.
- **Portability (ship-our-own-conventions-as-law):** F3 agents hardcode node:test/vitest-forbidden · F6 `gate-checks.json` hardcodes `cd cleargate-cli` → always-FAIL in targets. ← highest impact.
- **Worktree provisioning:** F4 no `.env` in story worktrees · F7 `stray_env_files` flags the F4 workaround.
- **Script-wrapper correctness:** F5 `pre_gate_runner.sh` doubles relative paths · F8 `run_script.sh` drops ambient env.
- **Loop integrity / friction:** F9 TPV can't catch semantic QA-Red fixture bugs · F10 QA false-FAILs "red-now-green" (needs separate green file) · F11 static-scope PASS hides a failing deferred verification until post-merge.

**Positive verdict on the framework:** v2-parallel produced a clean, goal-MET sprint (15/15) with zero data loss, **zero ledger misattribution** (F1 hand-fix held all run), and a working blocker-recovery loop. The findings are sharp edges, not blockers — every one was absorbed by a competent orchestrator. The portability pair (F3/F6) is the only class that would hard-block a *less* careful operator on a fresh non-node install.

### Watch ENDED @ 05:10Z — sprint at close-ack gate (human action). F1–F11 recorded. Final `.active`-truncate verification offered on request.
