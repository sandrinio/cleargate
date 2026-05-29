# Improvement Suggestions — SPRINT-32


## Trends

Trends: 19 closed sprints visible — full analysis deferred to CR-027.

## Skill Creation Candidates

<!-- generated-by: suggest_improvements.mjs --skill-candidates -->

_No candidates detected this sprint._

## FLASHCARD Cleanup Candidates

<!-- generated-by: suggest_improvements.mjs --flashcard-cleanup -->

### CAND-SPRINT-32-F01: close Step 2.6 reconciler reads sprint `start_date` as `--si
<!-- hash:619f19 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-05-29 · #close-pipeline #reconciler #frontmatter · close Step 2.6 reconciler reads sprint `start_date` as `--since`; a literal `TBD` placeholder → `new Date("TBD")` = Invalid Date (the `typeof==='string'` guard passes it through) → crashes with "Invalid time value", MASKING all real drift. Fix the plan's start_date to a real date before close; ideally guard the parse in reconcileLifecycleCliHandler. [SPRINT-32 close]`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-32-F02: QA-Red skipping a Gherkin scenario because it "passes on bas
<!-- hash:1c1d96 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-05-29 · #qa #tdd #scenario-coverage · QA-Red skipping a Gherkin scenario because it "passes on baseline" (e.g. a feature-OFF default path) is NOT acceptable — QA-Verify still requires a GREEN-phase test for EVERY §5 scenario. Write the flag-off/default-path test in QA-Red, or it bounces. (Caused 032-03 qa_bounce #1.) [SPRINT-32 032-03]`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-32-F03: EPIC-033 wave seam (033-04): launch_wave.launchWave({wave}) 
<!-- hash:6b06e8 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 1 sprint dir(s)
**Original entry:** `2026-05-29 · #workflow #parallel #integration #run_id · EPIC-033 wave seam (033-04): launch_wave.launchWave({wave}) reads waves.json `waves[].stories[]` (033-03 architect-synth shape); mints runId; verdict.{runId,tokens} → barrier sets RUN_ID env → write_dispatch.sh stamps run_id → token-ledger.sh keys session-totals+ledger by run_id, idempotent dedup, ESCALATED(0 tokens)→no row. launch_wave writes NO ledger itself. [SPRINT-32 033-04]`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-32-F04: CodeMapPage does NOT carry a RepoTag — `compilePage({package
<!-- hash:0b2165 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 1 sprint dir(s)
**Original entry:** `2026-05-29 · #code-map #admin #deriveRepo · CodeMapPage does NOT carry a RepoTag — `compilePage({packageName})` takes the package name directly and NEVER calls deriveRepo (which throws on admin/). 032-03 must pass packageName, not derive a repo tag. [SPRINT-32 032-02]`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-32-F05: compilePage (032-02, compile-page.ts:73) returns ONLY string
<!-- hash:c63477 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 1 sprint dir(s)
**Original entry:** `2026-05-29 · #code-map #wiki · compilePage (032-02, compile-page.ts:73) returns ONLY string — symbolCount is private BodySection state, NOT exposed. 032-03 index `## Code Map` needs per-page symbol count → derive it 032-03-side via parseCodeMapPage(body) + count `- ` lines, or sum skeleton.exports.length. Don't expect a {package,symbolCount} return. [SPRINT-32 M2]`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-32-F06: cleargate-planning/MANIFEST.json `generated_at` + new-entry 
<!-- hash:d51f4a -->

**Category:** stale
**Reason:** stale: zero grep hits across last 1 sprint dir(s)
**Original entry:** `2026-05-29 · #devops #manifest #merge-conflict · cleargate-planning/MANIFEST.json `generated_at` + new-entry churn conflicts when sprint & story branches both ran prebuild. Generated file, not source — resolve `git checkout --theirs MANIFEST.json` (step-4 prebuild regenerates it). Orchestrator may authorize DevOps to resolve THIS one file; any other conflict still halts. [SPRINT-32 033-03]`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-32-F07: QA/Dev agents sometimes write TEST FILES to the MAIN repo an
<!-- hash:ad5b9f -->

**Category:** stale
**Reason:** stale: zero grep hits across last 1 sprint dir(s)
**Original entry:** `2026-05-29 · #worktree #isolation #agent-cwd · QA/Dev agents sometimes write TEST FILES to the MAIN repo and REPORTS to the worktree reports/ (they resolve repo-relative paths against cwd) — exactly inverted from what's needed. Verify after each dispatch: relocate stray test files INTO the worktree, copy stray reports TO main reports/. Dispatch prompts must say "cd into the worktree; all paths under it." [SPRINT-32 033-03]`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-32-F08: `assert.ok(field in (fm, 'string'))` — the JS comma operator
<!-- hash:5e48db -->

**Category:** stale
**Reason:** stale: zero grep hits across last 1 sprint dir(s)
**Original entry:** `2026-05-29 · #test #node-test · `assert.ok(field in (fm, 'string'))` — the JS comma operator silently reduces to `assert.ok(field in 'string')` → TypeError; put `in` on the intended object directly. [SPRINT-32 033-03]`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-32-F09: New `.claude/agents/*.md` agent files (gitignored live tree)
<!-- hash:6376f1 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-05-29 · #qa #worktree #mirror #agents · New `.claude/agents/*.md` agent files (gitignored live tree) authored in the worktree's own `/.claude/agents/` satisfy live-path test assertions; the tracked copy lives in canonical `cleargate-planning/.claude/agents/`. Live `/.claude/` re-sync via `cleargate init` is a Gate-4 step, not a per-story blocker — main-repo live tree lacking the file post-commit is EXPECTED. [SPRINT-32 STORY-033-03]`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-32-F10: live↔canonical architect.md DIVERGE pre-edit: canonical has 
<!-- hash:28bd1f -->

**Category:** stale
**Reason:** stale: zero grep hits across last 1 sprint dir(s)
**Original entry:** `2026-05-29 · #mirror #parity #architect-md · live↔canonical architect.md DIVERGE pre-edit: canonical has a `## Autonomy Contract` block (canonical :10-17) live lacks → all canonical line numbers shift +8 (SDR live :74/canonical :82; Inspect-step live :23/canonical :31). Edit by anchor text, never line number; do NOT reconcile the divergence (per-edit parity). [SPRINT-32 M2]`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-32-F11: ts.createProgram/getSourceFile NEVER throw on syntax-broken 
<!-- hash:662754 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 1 sprint dir(s)
**Original entry:** `2026-05-29 · #typescript-compiler-api #error-isolation · ts.createProgram/getSourceFile NEVER throw on syntax-broken source — they return the file with diagnostics. Use `program.getSyntacticDiagnostics(sf)` to detect+skip broken files (log to stderr, exit 0). [SPRINT-32 STORY-032-01]`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-32-F12: RED tests for not-yet-existing modules: use `import type {…}
<!-- hash:39141e -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-05-29 · #qa-red #type-import · RED tests for not-yet-existing modules: use `import type {…}` (erased at runtime) + dynamic `await import(MODULE_PATH)` inside the describe callback, so the absent module yields ERR_MODULE_NOT_FOUND at describe-eval rather than a top-level static-import crash. [SPRINT-32 STORY-032-01]`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-32-F13: Bash-hook node:test pattern: sed-patch the hook's `REPO_ROOT
<!-- hash:3f4934 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 1 sprint dir(s)
**Original entry:** `2026-05-29 · #qa-red #bash-hook #env-injection · Bash-hook node:test pattern: sed-patch the hook's `REPO_ROOT=` line to a tmp sprint dir, drive the script via execFileSync/spawnSync('bash',[hook]) with extraEnv; inject RUN_ID/CLAUDE_SESSION_ID; sentinel needs SKIP_FLASHCARD_GATE=1; write_dispatch needs ORCHESTRATOR_PROJECT_DIR. [SPRINT-32 STORY-033-02]`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-32-F14: A serial/back-compat test that PASSES on the unmodified base
<!-- hash:cb4129 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-05-29 · #qa-red #regression-guard · A serial/back-compat test that PASSES on the unmodified baseline is a legit post-impl regression guard — keep it, but exclude it from the BASELINE_FAIL count reported to the orchestrator (report only the genuinely-red scenarios). [SPRINT-32 STORY-033-02]`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-32-F15: pre_gate_runner.sh (line-77 bug, recurred SPRINT-32): pass a
<!-- hash:d69c5f -->

**Category:** stale
**Reason:** stale: zero grep hits across last 1 sprint dir(s)
**Original entry:** `2026-05-29 · #pre-gate #scanner · pre_gate_runner.sh (line-77 bug, recurred SPRINT-32): pass an ABSOLUTE worktree path AND `mkdir -p <worktree>/.cleargate/reports` first — the runner never mkdirs REPORT_DIR and a relative path breaks under its internal `cd`. Header-only/empty output = this. Still unfixed in the script. [SPRINT-32 STORY-033-02]`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-32-F16: cleargate-cli `npm test` glob is `test/**/*.node.test.ts` — 
<!-- hash:e28a11 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-05-29 · #test-glob #cli #wiki · cleargate-cli `npm test` glob is `test/**/*.node.test.ts` — `*.node.test.ts` under `src/` is NOT run (orphan exists at src/auth/identity-flow.node.test.ts). New wiki/code-map tests MUST live at cleargate-cli/test/wiki/code-map/, not co-located in src/ as STORY-032-01 §3.1 states. [SPRINT-32 M1]`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-32-F17: `.active` sentinel is NOT auto-set on kickoff: init_sprint.m
<!-- hash:c26a1a -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-05-29 · #kickoff #sentinel #skill-drift · `.active` sentinel is NOT auto-set on kickoff: init_sprint.mjs never writes it (skill §A.3 wrongly claims it does), and close_sprint.mjs --assume-ack never truncates it (that's `cleargate sprint archive`, a separate command). After init, `printf 'SPRINT-NN\n' > .cleargate/sprint-runs/.active` manually or every dispatch mis-attributes to the prior sprint. [SPRINT-32 kickoff]`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-32-F18: init_sprint.mjs blocks on UNAPPROVED unless every ID in the 
<!-- hash:90be55 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 1 sprint dir(s)
**Original entry:** `2026-05-29 · #kickoff #init-sprint #gate · init_sprint.mjs blocks on UNAPPROVED unless every ID in the sprint's §1 Consolidated Deliverables has `approved: true` in frontmatter (assert_story_files.mjs) — gate-green (cached_gate_result.pass) is NOT enough, and it scans §1 PROSE too (pulled in a Completed spike + an epic). Stamp approved:true on the whole in-scope set first; "start sprint NN" is the approval event. [SPRINT-32 kickoff]`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-32-F19: Gate criteria reuse-audit-recorded / simplest-form-justified
<!-- hash:7f49a3 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-05-29 · #readiness-gate #template #decomposition · Gate criteria reuse-audit-recorded / simplest-form-justified do a LITERAL substring match for `## Existing Surfaces` / `## Why not simpler?`. The epic/story/CR templates' numbered headings (`### 1.6`, `## 3.5`) FAIL the gate — emit UNNUMBERED `##` headings; in stories place them AFTER `## 4. Quality Gates` so the `## `-counted section(3)=impl-files / section(4)=DoD don't shift. Bit EPIC-031/32/33 + STORY-033-01.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-32-F20: git worktrees share source but NOT `node_modules`. Symlink `
<!-- hash:cb10b5 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-05-20 · #worktree #build #node_modules · git worktrees share source but NOT `node_modules`. Symlink `ln -s <main-repo>/cleargate-cli/node_modules <worktree>/cleargate-cli/node_modules` before any `npm run build` step in a fresh worktree.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-32-F21: dist/cli.js references co-located chunk-*.js files. When run
<!-- hash:bff572 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 1 sprint dir(s)
**Original entry:** `2026-05-20 · #worktree #build #dist · dist/cli.js references co-located chunk-*.js files. When running tests via `process.execPath + DIST_CLI_PATH` from a worktree, the full dist/ (cli.js + all chunks) must be present, not just cli.js. Build inside the worktree (after node_modules symlink) or copy the entire dist/ tree.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-32-F22: `git check-ignore -v` exits 0 for negation `!` rules (false 
<!-- hash:e0e36d -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-05-19 · #test-harness #gitignore · `git check-ignore -v` exits 0 for negation `!` rules (false positive). Omit `-v` to get exit 1 for not-ignored files with `!` allowlists.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-32-F23: Red file's inline regex/const copy goes stale when Dev appli
<!-- hash:a2de11 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-05-19 · #qa-red #spec-gap · Red file's inline regex/const copy goes stale when Dev applies spec-gap fix; delete `.red.` file at merge, do not patch in place — its tests duplicate the plain `.node.test.ts`.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-32-F24: `git stash` + failed `stash pop` + `stash drop` lost in-flig
<!-- hash:3029ec -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-05-19 · #git #stash · `git stash` + failed `stash pop` + `stash drop` lost in-flight Dev edits; never stash for baseline comparison — use a throwaway branch or committed fixup instead.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-32-F25: parent-rollup.ts extractId() checks story_id only; Epic file
<!-- hash:3950c5 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 1 sprint dir(s)
**Original entry:** `2026-05-18 · #parent-rollup #reconciler · parent-rollup.ts extractId() checks story_id only; Epic files use epic_id — add epic_id/sprint_id key checks before filename-stem fallback.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-32-F26: node:test on DB-integration suites needs `--test-concurrency
<!-- hash:93f678 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 1 sprint dir(s)
**Original entry:** `2026-05-18 · #node-test #migration · node:test on DB-integration suites needs `--test-concurrency=1` (matches vitest singleFork:true); default parallel breaks FK constraints.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-32-F27: @hono/node-server calls `socket.destroySoon()` ~500ms after 
<!-- hash:4a9eb5 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 1 sprint dir(s)
**Original entry:** `2026-05-18 · #node-test #hono · @hono/node-server calls `socket.destroySoon()` ~500ms after Fastify `inject()` fake-socket request — node:test treats it as hard fail (vitest tolerated); patch via onRequest hook no-op or uncaughtException handler.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-32-F28: `mock.module()` mock-class instances must use the same prope
<!-- hash:c5a2b9 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 1 sprint dir(s)
**Original entry:** `2026-05-18 · #node-test #mock · `mock.module()` mock-class instances must use the same property names as the real class (`AdminApiError.kind` not `.errorType`) — node:test's stricter equality exposes vitest-passing mock-shape bugs.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-32-F29: close_sprint.mjs `import()` of reconciler module must be `__
<!-- hash:8a053d -->

**Category:** stale
**Reason:** stale: zero grep hits across last 1 sprint dir(s)
**Original entry:** `2026-05-18 · #close-pipeline #test-seam · close_sprint.mjs `import()` of reconciler module must be `__dirname`-relative (SCRIPTS_DIR), NOT REPO_ROOT-relative — CLEARGATE_REPO_ROOT test seam overrides REPO_ROOT to a tmpdir without dist; only the static script dir reliably finds the built bundle.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-32-F30: `cleargate-cli/templates/cleargate-planning/` (npm payload) 
<!-- hash:83554b -->

**Category:** stale
**Reason:** stale: zero grep hits across last 1 sprint dir(s)
**Original entry:** `2026-05-18 · #migration #prebuild #gitignore · `cleargate-cli/templates/cleargate-planning/` (npm payload) is gitignored — verify byte-equality via `diff -rq` after `npm run prebuild`, never `git add` it.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-32-F31: MANIFEST.json conflicts between concurrent story branches ar
<!-- hash:ccdd57 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 1 sprint dir(s)
**Original entry:** `2026-05-18 · #orchestration #merge-conflict · MANIFEST.json conflicts between concurrent story branches are deterministically resolvable: `git rebase sprint/S-NN` + `cd cleargate-cli && npm run prebuild` regenerates the SHA table — no manual merge needed.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-32-F32: Dev/QA/Architect dispatch prompts MUST tell agents to write 
<!-- hash:67ad8e -->

**Category:** stale
**Reason:** stale: zero grep hits across last 1 sprint dir(s)
**Original entry:** `2026-05-18 · #orchestration #report-files · Dev/QA/Architect dispatch prompts MUST tell agents to write their report to .cleargate/sprint-runs/<id>/reports/<id>-{dev,qa,arch}.md before returning; text-only return blocks DevOps at Step 1.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-32-F33: run_script.sh does NOT inject env vars; prefix CLEARGATE_STA
<!-- hash:b2058c -->

**Category:** stale
**Reason:** stale: zero grep hits across last 1 sprint dir(s)
**Original entry:** `2026-05-18 · #orchestration #env-vars · run_script.sh does NOT inject env vars; prefix CLEARGATE_STATE_FILE=... BEFORE `bash run_script.sh ...` or invoke `node update_state.mjs` directly without the wrapper.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-32-F34: agent `description:` values with backticks must be double-qu
<!-- hash:2fdf84 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-05-18 · #scaffold #yaml #agent-def · agent `description:` values with backticks must be double-quoted in YAML frontmatter — unquoted backtick triggers js-yaml CORE_SCHEMA YAMLException on subagent dispatch (BUG-004).`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-32-F35: `*.node.test.ts` fixture files with vitest imports get picke
<!-- hash:55c895 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 1 sprint dir(s)
**Original entry:** `2026-05-18 · #fixtures #test-glob · `*.node.test.ts` fixture files with vitest imports get picked up by `test/**/*.node.test.ts` glob and fail — exclude `test/fixtures/**` from runner glob or rename fixtures (.snap/.txt).`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-32-F36: ERR_MODULE_NOT_FOUND collapses all `it()` blocks to 1 report
<!-- hash:d86656 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 1 sprint dir(s)
**Original entry:** `2026-05-18 · #qa-red #red-test · ERR_MODULE_NOT_FOUND collapses all `it()` blocks to 1 reported failure in `tsx --test`; count failing scenarios from test-inventory comment, not from runner output.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-32-F37: Non-mutation assertions (bytes unchanged) pass vacuously whe
<!-- hash:5636c4 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 1 sprint dir(s)
**Original entry:** `2026-05-18 · #qa #red-test #vacuous-pass · Non-mutation assertions (bytes unchanged) pass vacuously when script absent — verify they flip fail→pass after impl lands.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-32-F38: Exit-code assertions on absent scripts can false-pass via MO
<!-- hash:c7cb41 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 1 sprint dir(s)
**Original entry:** `2026-05-18 · #qa #red-test #exit-code · Exit-code assertions on absent scripts can false-pass via MODULE_NOT_FOUND coincidence; add `assertScriptExists()` guard first in every test.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-32-F39: QA-Red on codemod stories must assert each §2.1 Gherkin scen
<!-- hash:b8c937 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-05-18 · #qa #codemod #fixture-gap · QA-Red on codemod stories must assert each §2.1 Gherkin scenario 1:1 — `.spec.ts` rename + target collision are easily overlooked without explicit fixture pairs.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-32-F40: path-validator must run BEFORE readFile/parseFrontmatter to 
<!-- hash:da4ae7 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 1 sprint dir(s)
**Original entry:** `2026-05-15 · #path-validator · path-validator must run BEFORE readFile/parseFrontmatter to guarantee exit 2 (not 1) for non-allowlisted paths; parseFrontmatter exits 1 for non-markdown.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-32-F41: vi.mock('$env/dynamic/public') needs a vitest.config alias +
<!-- hash:3a186b -->

**Category:** stale
**Reason:** stale: zero grep hits across last 1 sprint dir(s)
**Original entry:** `2026-05-15 · #svelte #vitest · vi.mock('$env/dynamic/public') needs a vitest.config alias + stub file — without it vite import-analysis errors before mock intercepts. Pattern: $app/navigation alias precedent.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-32-F42: sprint-critical scripts need three-way parity check: live + 
<!-- hash:0a2637 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 1 sprint dir(s)
**Original entry:** `2026-05-15 · #mirror #parity #three-way · sprint-critical scripts need three-way parity check: live + canonical + npm-payload; verify all three pairs diff empty post-prebuild.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-32-F43: per-warning audit_log rows written OUTSIDE the DB transactio
<!-- hash:08978c -->

**Category:** stale
**Reason:** stale: zero grep hits across last 1 sprint dir(s)
**Original entry:** `2026-05-15 · #audit-log #transaction · per-warning audit_log rows written OUTSIDE the DB transaction in pushItem (best-effort) — decouples item persistence from telemetry; runTool success-row still fires via MCP transport.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-32-F44: pushItem-direct-call tests that assert zero audit rows fail 
<!-- hash:8d849f -->

**Category:** stale
**Reason:** stale: zero grep hits across last 1 sprint dir(s)
**Original entry:** `2026-05-15 · #audit-log #test-isolation · pushItem-direct-call tests that assert zero audit rows fail when new logic emits warnings — provide complete payload (title + status + known type + valid id) to suppress.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-32-F45: direct commits to sprint branch bypass story worktree — smal
<!-- hash:9f934a -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-05-15 · #worktree #procedural · direct commits to sprint branch bypass story worktree — small additive changes may ACCEPT but flag: enforce worktree branch for all story commits.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-32-F46: before deleting an exported symbol, grep ALL importers (e.g.
<!-- hash:da50ec -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-05-15 · #mcp #scope-bleed-guard · before deleting an exported symbol, grep ALL importers (e.g. ITEM_TYPES export chain: push-item.ts, list-items.ts, register-tools.ts, cleargate-sync-work-items.ts) — undocumented dependents cause typecheck breaks.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-32-F47: cleargate-cli/templates/cleargate-planning/ is gitignored; v
<!-- hash:388a81 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 1 sprint dir(s)
**Original entry:** `2026-05-15 · #mirror #parity #prebuild · cleargate-cli/templates/cleargate-planning/ is gitignored; verify scaffold mirror parity via diff after npm run prebuild, do NOT git add it.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-32-F48: drizzle-kit-generated migrations include a full schema snaps
<!-- hash:ec993e -->

**Category:** stale
**Reason:** stale: zero grep hits across last 1 sprint dir(s)
**Original entry:** `2026-05-15 · #migration #drizzle #snapshot · drizzle-kit-generated migrations include a full schema snapshot (.json); hand-rolling breaks the hash chain — always use drizzle-kit generate for drizzle-managed schemas.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-32-F49: cleargate-planning/.cleargate/knowledge/ is mirrored by preb
<!-- hash:dc67b9 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 1 sprint dir(s)
**Original entry:** `2026-05-15 · #scaffold #prebuild #knowledge-mirror · cleargate-planning/.cleargate/knowledge/ is mirrored by prebuild; canonical-live-parity Red test diffs live vs canonical — update both files or parity test fails.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-32-F50: Story §Existing Surfaces bullets are advisory — SDR must gre
<!-- hash:09de71 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-05-14 · #architect #sdr #anti-speculation · Story §Existing Surfaces bullets are advisory — SDR must grep codebase to verify cross-story coupling claims (069-09 mishap).`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-32-F51: scratch/ is gitignored — Dev cannot update from worktree pat
<!-- hash:eec340 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 1 sprint dir(s)
**Original entry:** `2026-05-04 · #qa #scratch #gitignore · scratch/ is gitignored — Dev cannot update from worktree path; QA must verify on main-repo disk, not worktree path.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-32-F52: QA agent sometimes writes report to worktree-relative `.clea
<!-- hash:ec4b10 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-05-04 · #qa #report #worktree-vs-main · QA agent sometimes writes report to worktree-relative `.cleargate/sprint-runs/<id>/reports/` path; orchestrator must copy to main-repo path before merge for audit trail (DevOps fallback).`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-32-F53: Red scenarios for .mjs scripts: invoke via spawnSync(node, [
<!-- hash:00922c -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-05-04 · #red-test #scripts #env · Red scenarios for .mjs scripts: invoke via spawnSync(node, [scriptPath]), NOT wrapScript (wrapScript is run_script.sh-only); use CLEARGATE_SPRINT_DIR + CLEARGATE_SPRINT_RUNS_DIR env overrides for fixture isolation.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-32-F54: pre_gate_runner.sh exits 1 with empty record output (header 
<!-- hash:b13d67 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 1 sprint dir(s)
**Original entry:** `2026-05-04 · #pre-gate #scanner #dogfood · pre_gate_runner.sh exits 1 with empty record output (header only); suspect pre_gate_common.sh:53 redirect path bug — surfaced during CR-053 post-flight; investigate at SPRINT-26 kickoff.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-32-F55: CR-049 named 4 divergent canonical scripts but only 3 actual
<!-- hash:fe9b26 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 1 sprint dir(s)
**Original entry:** `2026-05-04 · #cr-049 #mirror #parity · CR-049 named 4 divergent canonical scripts but only 3 actually drift (write_dispatch.sh, validate_state.mjs, test_flashcard_gate.sh); test_test_ratchet.sh diff returns empty. Architects: verify drift count via diff before authoring sync M-plan.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-32-F56: run_script.sh interface flip orphaned 6 cleargate-cli/src/co
<!-- hash:db788d -->

**Category:** stale
**Reason:** stale: zero grep hits across last 1 sprint dir(s)
**Original entry:** `2026-05-04 · #cr-046 #wrapper #breaking-change · run_script.sh interface flip orphaned 6 cleargate-cli/src/commands callers under v2; spawnMock-only tests masked breakage. Always pair wrapper-interface changes with one production-path integration test.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-32-F57: For wrapper-interface changes, copy the wrapper into os.tmpd
<!-- hash:bca14e -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-05-04 · #wrapper #e2e-test-pattern · For wrapper-interface changes, copy the wrapper into os.tmpdir() alongside fixture scripts and spawnSync the real wrapper; catches drift that spawnMock-style command tests cannot.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-32-F58: SPRINT-24 orchestrator must explicitly invoke `node update_s
<!-- hash:5588ed -->

**Category:** stale
**Reason:** stale: zero grep hits across last 1 sprint dir(s)
**Original entry:** `2026-05-04 · #tpv #self-validation · SPRINT-24 orchestrator must explicitly invoke `node update_state.mjs <id> --arch-bounce` on Mode:TPV BLOCKED-WIRING-GAP — no auto-increment from Mode:TPV return.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-32-F59: SDR HIGH-risk flag on SKILL.md §C anchor proved accurate for
<!-- hash:d03448 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-05-04 · #merge-conflict #skill-md · SDR HIGH-risk flag on SKILL.md §C anchor proved accurate for SPRINT-23 W1; "keep both" resolution was correct when both inserts target same anchor with distinct concerns.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-32-F60: `cleargate init --force` overwrites .gitignore + live `.clea
<!-- hash:1a844e -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-05-04 · #cleargate-init #clobber · `cleargate init --force` overwrites .gitignore + live `.cleargate/scripts/` from npm payload — reverts mid-sprint canonical edits that never propagated to canonical. Verify canonical = live before init.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-32-F61: wiki/log.md and open-gates.md auto-generated; merge conflict
<!-- hash:8eb505 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 1 sprint dir(s)
**Original entry:** `2026-05-04 · #wiki #merge-conflict · wiki/log.md and open-gates.md auto-generated; merge conflicts resolve cleanly via `cleargate wiki build` (no manual conflict-marker editing).`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-32-F62: [R] → superseded-by 2026-05-04/#preflight-doc · preflight St
<!-- hash:dccd72 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-05-04 · #preflight #sprint-kickoff #gate-stamp · [R] → superseded-by 2026-05-04/#preflight-doc · preflight Step 0 always re-stamps last_gate_check → self-induced dirty-main on same run; commit refresh, proceed without re-running.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-32-F63: [S] · token-ledger.sh snapshot-lock supersede pattern: cr-NN
<!-- hash:9c99e0 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-05-04 · #snapshot #hooks · [S] · token-ledger.sh snapshot-lock supersede pattern: cr-NNN.sh becomes new authoritative baseline; hooks-snapshots.test.ts byte-equality assertion flips to new lock; prior cr-N-1 demoted to historical (existence-only check).`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-32-F64: token-ledger.sh primary dispatch-marker path (L121-141) alre
<!-- hash:dd3120 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 1 sprint dir(s)
**Original entry:** `2026-05-04 · #token-ledger #devops · token-ledger.sh primary dispatch-marker path (L121-141) already accepts arbitrary agent_type strings — L227 legacy fallback list edit only affects no-sentinel transcript-grep path; not blocking for new agent types.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-32-F65: Sample/example test fixtures live in `cleargate-cli/examples
<!-- hash:559ed8 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 1 sprint dir(s)
**Original entry:** `2026-05-04 · #fixtures #sprint-22 · Sample/example test fixtures live in `cleargate-cli/examples/` NOT `cleargate-cli/test/fixtures/` — avoid the `test/**/*.node.test.ts` glob so `npm test` doesn't auto-run intentionally-failing Red examples.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-32-F66: Red+node combined naming: `*.red.node.test.ts` (red BEFORE n
<!-- hash:8a39c1 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 1 sprint dir(s)
**Original entry:** `2026-05-04 · #naming #red-green · Red+node combined naming: `*.red.node.test.ts` (red BEFORE node infix). Wrong: `*.node.red.test.ts`, `*.red.ts` — those won't be picked up by the npm test glob OR won't be marked immutable.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-32-F67: SKILL.md §C insert + renumber: forward-only handoff (§C.N fo
<!-- hash:ad69f2 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 1 sprint dir(s)
**Original entry:** `2026-05-04 · #skill-md #renumbering · SKILL.md §C insert + renumber: forward-only handoff (§C.N footer hands off to §C.N+1) is idiomatic; no need for backward "see §C.N-1" pointers. Update cross-refs by literal string match (line numbers shift).`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-32-F68: `.claude/hooks/pre-commit-surface-gate.sh` is an 11-line stu
<!-- hash:828c81 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 1 sprint dir(s)
**Original entry:** `2026-05-04 · #pre-commit #stub-extension · `.claude/hooks/pre-commit-surface-gate.sh` is an 11-line stub that delegates to file_surface_diff.sh — extensions (Red-immutability check, etc.) go IN the stub BEFORE the exec line, not in the delegated script.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-32-F69: NODE_TEST_CONTEXT=child-v8 causes nested tsx --test invocati
<!-- hash:871c6a -->

**Category:** stale
**Reason:** stale: zero grep hits across last 1 sprint dir(s)
**Original entry:** `2026-05-04 · #node-test #child-process · NODE_TEST_CONTEXT=child-v8 causes nested tsx --test invocations to skip silently (exit 0); delete env var in child process env (`delete env.NODE_TEST_CONTEXT`) before spawning child tsx test processes to get real pass/fail.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-32-F70: CR-039 spike: session_id is shared across orchestrator+subag
<!-- hash:7f971d -->

**Category:** stale
**Reason:** stale: zero grep hits across last 1 sprint dir(s)
**Original entry:** `2026-05-04 · #spike #recommendation · CR-039 spike: session_id is shared across orchestrator+subagents (no SDK override). Token-count savings (~16M/sprint) is real but dollar-net is ~-$1.58/sprint at current pricing. PARTIAL/NO-GO; CR-041+CR-042 deferred to SPRINT-22.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-32-F71: reporter.md L108 claim "Task tool creates new conversation p
<!-- hash:92fe0a -->

**Category:** stale
**Reason:** stale: zero grep hits across last 1 sprint dir(s)
**Original entry:** `2026-05-04 · #docs #agent-defs · reporter.md L108 claim "Task tool creates new conversation per dispatch" is INACCURATE per ledger evidence (1 session_id per sprint). CR-042 fixes this in SPRINT-22.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-32-F72: close_sprint.mjs Step 3.5 is v2-fatal post-CR-036 — bundle ≥
<!-- hash:0e38f8 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 1 sprint dir(s)
**Original entry:** `2026-05-04 · #close-pipeline #step-3.5 · close_sprint.mjs Step 3.5 is v2-fatal post-CR-036 — bundle ≥2KB or close exits 1; v1 advisory preserved. Use CLEARGATE_SKIP_BUNDLE_CHECK=1 in tests.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-32-F73: Reporter token budget: 200k soft warn / 500k hard advisory +
<!-- hash:3b2855 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-05-04 · #reporter #budget · Reporter token budget: 200k soft warn / 500k hard advisory + auto-flashcard. token-ledger.sh hook emits via stdout (CR-032 chat-injection).`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-32-F74: Reporter dispatched in fresh session via write_dispatch.sh s
<!-- hash:506e66 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-05-04 · #reporter #fresh-session · Reporter dispatched in fresh session via write_dispatch.sh shell child — Agent tool path requires no --resume flag. Verified post-CR-036.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-32-F75: Architect plan said close_sprint.mjs is live-only; canonical
<!-- hash:a8602c -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-05-04 · #mirror #parity · Architect plan said close_sprint.mjs is live-only; canonical mirror EXISTS at cleargate-planning/.cleargate/scripts/close_sprint.mjs — both updated for parity.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-32-F76: Dev's "pre-existing failure count" can be FILE count not TES
<!-- hash:905de2 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 1 sprint dir(s)
**Original entry:** `2026-05-04 · #qa #test-count · Dev's "pre-existing failure count" can be FILE count not TEST count — QA must distinguish; spot-check by running one to confirm the actual scope.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-32-F77: gate.ts or_group?: optional field on GateCriterion — criteri
<!-- hash:e27323 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 1 sprint dir(s)
**Original entry:** `2026-05-04 · #gate #or-group · gate.ts or_group?: optional field on GateCriterion — criteria sharing same or_group value pass-as-group when ≥1 member passes; backward-compat: criteria without or_group still required-AND.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-32-F78: stamp-tokens.ts L194 idKeys array + work-item-type.ts L14 FM
<!-- hash:e33e80 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 1 sprint dir(s)
**Original entry:** `2026-05-04 · #stamp-tokens #fm-key-map · stamp-tokens.ts L194 idKeys array + work-item-type.ts L14 FM_KEY_MAP are DUAL sources of truth for work-item key mapping — must update both when adding work-item types.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-32-F79: .session-totals.json is UUID-keyed map not flat — sum Object
<!-- hash:941303 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 1 sprint dir(s)
**Original entry:** `2026-05-04 · #reporting #session-totals · .session-totals.json is UUID-keyed map not flat — sum Object.values; spec quoted flat shape but live shape is `Record<sessionUuid, {input, output, ...}>`.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-32-F80: cleargate-planning/.cleargate/scripts/ does NOT mirror prep_
<!-- hash:12203d -->

**Category:** stale
**Reason:** stale: zero grep hits across last 1 sprint dir(s)
**Original entry:** `2026-05-04 · #mirror #parity · cleargate-planning/.cleargate/scripts/ does NOT mirror prep_reporter_context.mjs — live-only by design; do NOT create the canonical mirror.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-32-F81: stamp-and-gate snapshot locks (cr-008 + cr-009) must be upda
<!-- hash:2a604b -->

**Category:** stale
**Reason:** stale: zero grep hits across last 1 sprint dir(s)
**Original entry:** `2026-05-03 · #snapshot #hooks #test-harness · stamp-and-gate snapshot locks (cr-008 + cr-009) must be updated when the hook body changes or the init snapshot test fails.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-32-F82: BUG filed against npm-published version may already be fixed
<!-- hash:7364f9 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-05-03 · #bug #git-log · BUG filed against npm-published version may already be fixed in dev repo — `git log -G <symbol>` before implementing avoids duplicate fix commits.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-32-F83: CR-034: spec §4.2 ≤2 listed-item count contradicted §3 6-cri
<!-- hash:e82929 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 1 sprint dir(s)
**Original entry:** `2026-05-03 · #qa #spec #acceptance-metric · CR-034: spec §4.2 ≤2 listed-item count contradicted §3 6-criteria migration. Always cross-check aggregate acceptance metrics against explicit item lists.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-32-F84: SPRINT-21 cached_gate_result.pass hand-set true (engine can'
<!-- hash:269aeb -->

**Category:** stale
**Reason:** stale: zero grep hits across last 1 sprint dir(s)
**Original entry:** `2026-05-03 · #protocol #gate #bypass · SPRINT-21 cached_gate_result.pass hand-set true (engine can't type-detect SPRINT files); CR-030 in this sprint fixes — bypass rescinds post-CR-030.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-32-F85: Tests that grep CLAUDE.md must be updated in the same commit
<!-- hash:97b920 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-05-02 · #test-harness #vitest #worktree · Tests that grep CLAUDE.md must be updated in the same commit as the CLAUDE.md prune; old assertions become instantly-failing post-merge.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-32-F86: STORY-026-02 R7 ≥60-line target became unreachable after Wav
<!-- hash:a80635 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 1 sprint dir(s)
**Original entry:** `2026-05-02 · #claude-md #prune #numeric-target · STORY-026-02 R7 ≥60-line target became unreachable after Wave 1+2 collapsed the prune surface (live 161, canonical 70 pre-prune). Mid-sprint metric on a stale pre-prune SHA estimate must be flagged + waived in Architect plan, not silently widened.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-32-F87: readCachedGate is async; sprint preflight is sync — CR-027 i
<!-- hash:8ca144 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 1 sprint dir(s)
**Original entry:** `2026-05-02 · #frontmatter #cached-gate · readCachedGate is async; sprint preflight is sync — CR-027 inlined a 25-LOC sync mirror. Future async refactor: handler → async cascades into 8 vitest scenarios.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-32-F88: assert_story_files.mjs gained --emit-json flag (CR-027 path-
<!-- hash:5c8281 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 1 sprint dir(s)
**Original entry:** `2026-05-02 · #scripts #shell-out · assert_story_files.mjs gained --emit-json flag (CR-027 path-a). Wraps the existing extractWorkItemIds export. sprint.ts shells out via execFn; tests inject canned JSON via execFn seam.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-32-F89: SDR may name wrong suspect if grep-based; dev bisection can 
<!-- hash:2ab149 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-05-02 · #qa #sdr · SDR may name wrong suspect if grep-based; dev bisection can override — verify by checking whether src/ files were actually modified.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-32-F90: backfill_hierarchy.mjs spliceKeys inserted NEW line for exis
<!-- hash:c18ec7 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 1 sprint dir(s)
**Original entry:** `2026-05-02 · #frontmatter #idempotent #backfill · backfill_hierarchy.mjs spliceKeys inserted NEW line for existing-null keys; fix: Phase 1 in-place replace, Phase 2 insert-absent-only.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-32-F91: M-plan-spec'd integration test files are REQUIRED, not optio
<!-- hash:0df16d -->

**Category:** stale
**Reason:** stale: zero grep hits across last 1 sprint dir(s)
**Original entry:** `2026-05-02 · #qa #test-coverage #integration · M-plan-spec'd integration test files are REQUIRED, not optional — Dev must deliver them; per-hook unit tests don't cover cross-hook end-to-end flow.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-32-F92: token-ledger.sh has a copy-on-fix snapshot lock in test/snap
<!-- hash:f04670 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 1 sprint dir(s)
**Original entry:** `2026-05-02 · #snapshot #hooks · token-ledger.sh has a copy-on-fix snapshot lock in test/snapshots/ — update token-ledger.cr-NNN.sh + supersede byte-equality assertion every time the hook changes.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-32-F93: token-ledger.sh transcript-grep fallback skips ^[0-9]+ items
<!-- hash:adfa5e -->

**Category:** stale
**Reason:** stale: zero grep hits across last 1 sprint dir(s)
**Original entry:** `2026-05-02 · #hooks #ledger #banner-skip · token-ledger.sh transcript-grep fallback skips ^[0-9]+ items? blocked: prefix via BANNER_SKIP_RE — SessionStart banner stops poisoning work_item_id attribution.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-32-F94: PreToolUse:Task hook auto-writes dispatch marker by grepping
<!-- hash:21d78b -->

**Category:** stale
**Reason:** stale: zero grep hits across last 1 sprint dir(s)
**Original entry:** `2026-05-02 · #hooks #attribution #pre-tool-use-task · PreToolUse:Task hook auto-writes dispatch marker by grepping tool_input.prompt for first work-item ID; banner-immune (no transcript); uniquified filename avoids parallel-spawn collision.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-32-F95: token-ledger.sh uses newest-file lookup (ls -t .dispatch-*.j
<!-- hash:39def5 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 1 sprint dir(s)
**Original entry:** `2026-05-02 · #hooks #ledger #dispatch · token-ledger.sh uses newest-file lookup (ls -t .dispatch-*.json | head -1), not session-id-keyed — orchestrator CLAUDE_SESSION_ID never matches subagent's SubagentStop payload session_id.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-32-F96: session-start.sh snapshot locks (cr-008/cr-009) must be upda
<!-- hash:746039 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 1 sprint dir(s)
**Original entry:** `2026-05-02 · #snapshot #init-test · session-start.sh snapshot locks (cr-008/cr-009) must be updated when canonical hook content changes — init test byte-compares rendered output against lock files.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-32-F97: Dev agent's `git commit` landed on `main` instead of `story/
<!-- hash:8c121a -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-05-02 · #worktree #git #commit · Dev agent's `git commit` landed on `main` instead of `story/<id>` branch — verify post-dispatch with `git log story/<id>` not just commit-success-claim.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-32-F98: Cap forks pool via vitest.config.ts `poolOptions.forks.maxFo
<!-- hash:8c1f83 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-05-02 · #vitest #ram #pool · Cap forks pool via vitest.config.ts `poolOptions.forks.maxForks=2` — CLI flag `--pool-options.forks.maxForks=N` collides with tinypool minThreads validation when pool=forks.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-32-F99: `cleargate story start <id>` requires CLEARGATE_STATE_FILE e
<!-- hash:f33efe -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-05-01 · #cli #sprint #scripts · `cleargate story start <id>` requires CLEARGATE_STATE_FILE env — run_script.sh omits it; without it step 2 fails.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-32-F100: cleargate-cli/templates/cleargate-planning/ is DERIVED — cop
<!-- hash:c25e90 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 1 sprint dir(s)
**Original entry:** `2026-05-01 · #scaffold #mirror #prebuild · cleargate-cli/templates/cleargate-planning/ is DERIVED — copy-planning-payload.mjs rmSync+rebuilds it from cleargate-planning/ on every prebuild. Never hand-edit the cli-bundled tree; edit canonical mirror then run npm run prebuild.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-32-F101: `proposal_gate_waiver` field never lived in any template — o
<!-- hash:9f4b9a -->

**Category:** stale
**Reason:** stale: zero grep hits across last 1 sprint dir(s)
**Original entry:** `2026-05-01 · #templates #frontmatter #proposal_gate_waiver · `proposal_gate_waiver` field never lived in any template — only in in-flight artifacts. CR-020's "drop from templates" was a no-op verify, not a removal.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-32-F102: CLAUDE.md live↔canonical pre-divergent by 4 canonical-only b
<!-- hash:d42a68 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 1 sprint dir(s)
**Original entry:** `2026-05-01 · #mirror #parity · CLAUDE.md live↔canonical pre-divergent by 4 canonical-only bullets since pre-EPIC-024. Edit-parity invariant applies per-edit, not whole-file — never reconcile pre-existing divergence as a side effect.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-32-F103: `cleargate-planning/MANIFEST.json` SHAs change after every p
<!-- hash:0f1e04 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 1 sprint dir(s)
**Original entry:** `2026-05-01 · #manifest #prebuild · `cleargate-planning/MANIFEST.json` SHAs change after every protocol/template edit; regenerate via `npm run build` (or doctor's auto-regen path) in the SAME commit or doctor flags drift on next session.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-32-F104: Sprint frontmatter `start_date` is the *planned* date — for 
<!-- hash:c070f1 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-05-01 · #closeout #script #fallback · Sprint frontmatter `start_date` is the *planned* date — for closed sprints whose commits pre-date the planned start, use Strategy 3 `git log --grep "<sprint-id>"` as the reliable fallback in changed-file discovery.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-32-F105: `protocol-section-N.test.ts` files reference numeric §-IDs t
<!-- hash:efb34c -->

**Category:** stale
**Reason:** stale: zero grep hits across last 1 sprint dir(s)
**Original entry:** `2026-05-01 · #test #protocol-section #stale · `protocol-section-N.test.ts` files reference numeric §-IDs that go stale when EPIC-024-style slimming moves sections to enforcement.md. Update or archive these tests in the same wave that moves the §.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-32-F106: `cleargate wiki lint` exits 1 even for pre-existing findings
<!-- hash:f59c44 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-05-01 · #wiki-lint #baseline · `cleargate wiki lint` exits 1 even for pre-existing findings; "no regression" gates need a pre/post baseline diff so the gate fails only on NEW findings.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-32-F107: `npx ETIMEDOUT` in QA shells when registry is blocked — invo
<!-- hash:141b44 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-05-01 · #qa #vitest #npx · `npx ETIMEDOUT` in QA shells when registry is blocked — invoke repo-local `node_modules/.bin/vitest` directly instead.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-32-F108: M2 citation-rewrite surface omitted `.cleargate/templates/` 
<!-- hash:201390 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-05-01 · #citation-rewrite #scope-gap · M2 citation-rewrite surface omitted `.cleargate/templates/` — surfaced post-CR-020 as `Sprint Plan Template.md` / `sprint_report.md` / `story.md` line 32+120 stale `§24`/`§20`. Always include `.cleargate/templates/` in §-grep surfaces.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-32-F109: `git worktree remove --force --force` does NOT kill detached
<!-- hash:0752a2 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-05-01 · #worktree #vitest #cleanup · `git worktree remove --force --force` does NOT kill detached vitest worker pools — they persist as orphan node processes pointing at deleted dirs (~3GB each). Run `pkill -9 -f "node.*vitest"` BEFORE removing worktrees that ran `npm test`.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-32-F110: import.meta.url in vitest source-mode resolves to src/comman
<!-- hash:17b1b6 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 1 sprint dir(s)
**Original entry:** `2026-04-30 · #cli #vitest #import-meta · import.meta.url in vitest source-mode resolves to src/commands/*.ts not dist/; try ../package.json AND ../../package.json candidates for worktree-safe version reads.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-32-F111: CLEARGATE_NO_UPDATE_CHECK=1 suppresses all checkLatestVersio
<!-- hash:afbb1f -->

**Category:** stale
**Reason:** stale: zero grep hits across last 1 sprint dir(s)
**Original entry:** `2026-04-30 · #cli #registry-check #env · CLEARGATE_NO_UPDATE_CHECK=1 suppresses all checkLatestVersion network + cache paths; hard contract once 016-01 ships.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-32-F112: Story bodies authored at SPRINT-N draft time freeze the pack
<!-- hash:67e7b6 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-04-30 · #cli #stories #version-drift · Story bodies authored at SPRINT-N draft time freeze the package.json version literal (e.g. STORY-016-* says `cleargate@0.8.2` but live is 0.9.0 by SPRINT-16 activation). Always read live version from package.json — story-body literals are illustrative.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-32-F113: cleargate-cli/CHANGELOG.md exists pre-EPIC-016 in non-Common
<!-- hash:02c34b -->

**Category:** stale
**Reason:** stale: zero grep hits across last 1 sprint dir(s)
**Original entry:** `2026-04-30 · #cli #changelog #format · cleargate-cli/CHANGELOG.md exists pre-EPIC-016 in non-Common-Changelog form (## 0.9.0 (date)). STORY-016-03 reformats to ## [0.9.0] — date AND backfills priors; format-test regex /^## \[(\d+\.\d+\.\d+)\] — \d{4}-\d{2}-\d{2}/m fails the existing file as-is.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-32-F114: CLI sha = sha256(body + serializeFrontmatter(fm)) where seri
<!-- hash:aa1c13 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-04-30 · #mcp #frontmatter #serialization · CLI sha = sha256(body + serializeFrontmatter(fm)) where serializer uses CORE_SCHEMA + lineWidth -1 + ---/--- framing (frontmatter-yaml.ts:17). Server reimplementation MUST be byte-identical — yaml.dump default options (sortKeys, no schema, no framing) produce different bytes; sha mismatch makes every sync dirty.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-32-F115: cleargate-cli/src/commands/sync.ts already exists (718 LOC, 
<!-- hash:0fcb8f -->

**Category:** stale
**Reason:** stale: zero grep hits across last 1 sprint dir(s)
**Original entry:** `2026-04-30 · #cli #commander #naming-collision · cleargate-cli/src/commands/sync.ts already exists (718 LOC, STORY-010-04 pull/merge/push driver) and cleargate sync is registered. New work-item sync command MUST be a subcommand or scoped flag — never a same-file rewrite. Architect must grep commands/ before approving any story that names a new command file.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-32-F116: checkPaginationNeeded MAX_BUCKET_ENTRIES=50 is hardcoded; fi
<!-- hash:088f12 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 1 sprint dir(s)
**Original entry:** `2026-04-30 · #wiki #lint #pagination · checkPaginationNeeded MAX_BUCKET_ENTRIES=50 is hardcoded; fix via wiki.bucket_pagination_ceiling in config.yml + pass ceiling param to check function — not a code-change-free fix.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-32-F117: wiki build reads children: from raw EPIC/SPRINT files (not i
<!-- hash:4d93b6 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-04-30 · #wiki #backlink #children · wiki build reads children: from raw EPIC/SPRINT files (not inferred from child parent_epic_ref) — broken-backlinks require adding children: arrays to every raw EPIC file, not just EPIC-013/-014.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-32-F118: token-ledger.sh role-grep loop is hard-coded at line 172; ne
<!-- hash:076cff -->

**Category:** stale
**Reason:** stale: zero grep hits across last 1 sprint dir(s)
**Original entry:** `2026-04-30 · #wiki #ledger #role-attribution · token-ledger.sh role-grep loop is hard-coded at line 172; new subagent roles (e.g. cleargate-wiki-contradict) must be added there or tokens land as "unknown".`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-32-F119: Phase 4 split: TS = deterministic prep (status filter, SHA i
<!-- hash:8b243c -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-04-30 · #wiki #ingest #phase4-split · Phase 4 split: TS = deterministic prep (status filter, SHA idem, neighborhood, prompt) + commit (log append, sha stamp); agent .md = LLM spawn via Task; no Node-side Task API.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-32-F120: assert_story_files.mjs covers all six id shapes (STORY/CR/BU
<!-- hash:949850 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 1 sprint dir(s)
**Original entry:** `2026-04-27 · #sprint-init #regex #v2-gate · assert_story_files.mjs covers all six id shapes (STORY/CR/BUG/EPIC/PROPOSAL/PROP/HOTFIX); v2 hard-blocks on missing|unapproved|stub-empty; v1 warns-only.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-32-F121: update_state.mjs has no module guard — `import { fn } from '
<!-- hash:6a8af4 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 1 sprint dir(s)
**Original entry:** `2026-04-27 · #mjs #module-guard #import · update_state.mjs has no module guard — `import { fn } from './update_state.mjs'` triggers its main() at import time; inline the fn instead of importing.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-32-F122: In bash hook, `DOCTOR_EXIT=$?` after `$(cmd || true)` always
<!-- hash:5af18e -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-04-26 · #hooks #bash #exit-capture · In bash hook, `DOCTOR_EXIT=$?` after `$(cmd || true)` always returns 0 — use a tmpfile: `cmd > tmpfile; EXIT=$?; OUT=$(cat tmpfile); rm tmpfile` to capture both output and exit code independently.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-32-F123: readline.createInterface buffers ahead — when two readline i
<!-- hash:2c1efc -->

**Category:** stale
**Reason:** stale: zero grep hits across last 1 sprint dir(s)
**Original entry:** `2026-04-25 · #cli #readline #vitest · readline.createInterface buffers ahead — when two readline interfaces read sequentially from the same Readable, the first consumes more data than the first line; use PassThrough with lazy writes (setTimeout 5ms on resume) or a shared single interface for multi-prompt flows.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-32-F124: Device-flow terminal payload is access_token, NOT authorizat
<!-- hash:3b4838 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 1 sprint dir(s)
**Original entry:** `2026-04-25 · #github-oauth #device-flow #identity-provider · Device-flow terminal payload is access_token, NOT authorization-code; re-exchanging via grant_type=authorization_code at /login/oauth/access_token returns error. Member-side providers must skip the re-exchange when proof originates from device-flow.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-32-F125: TS6133 fires when Config is in constructor destructure but n
<!-- hash:27f371 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 1 sprint dir(s)
**Original entry:** `2026-04-25 · #typescript #config #unused-field · TS6133 fires when Config is in constructor destructure but not stored on instance; make the param optional (`config?: Config`) or remove it if the class truly doesn't need it — keep it in the interface signature for server.ts callsites.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-32-F126: IdentityProvider interface (mcp/src/auth/identity/provider.t
<!-- hash:e330de -->

**Category:** stale
**Reason:** stale: zero grep hits across last 1 sprint dir(s)
**Original entry:** `2026-04-25 · #identity-provider #oauth-device-flow · IdentityProvider interface (mcp/src/auth/identity/provider.ts) returns binary {success | throw} — there is no `pending` result type. GitHub device-flow `authorization_pending` MUST be modeled as a thrown error and the route maps to 502; CLI loops on 502 to keep polling. If you want true pending semantics you must widen the interface — that's an M1-substrate diff, not an M2 provider change.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-32-F127: `identity_proofs.challenge_payload` jsonb is provider-privat
<!-- hash:6cc59b -->

**Category:** stale
**Reason:** stale: zero grep hits across last 1 sprint dir(s)
**Original entry:** `2026-04-25 · #identity-provider #plaintext-redact · `identity_proofs.challenge_payload` jsonb is provider-private (per provider.ts:7-8 doc); storing the GitHub device_code OR Resend OTP plaintext in payload is allowed and necessary. The plaintext-redact rule covers logs, clientHints, and route response bodies — NOT the jsonb payload column. Don't double-hash device_code thinking the column is logged.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-32-F128: mcp/.env.example documents env vars (e.g. CLEARGATE_RESEND_*
<!-- hash:98add2 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 1 sprint dir(s)
**Original entry:** `2026-04-25 · #config #env-schema #drift · mcp/.env.example documents env vars (e.g. CLEARGATE_RESEND_*) but mcp/src/config.ts envSchema is the actual contract — vars not in the Zod schema are silently dropped by loadConfig(). Always grep both files when adding a new env var; the .env.example alone is dead documentation.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-32-F129: wikiBuildHandler returns on success (no exit(0) call); wikiL
<!-- hash:85f301 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 1 sprint dir(s)
**Original entry:** `2026-04-24 · #wiki-build #async-exit-pattern · wikiBuildHandler returns on success (no exit(0) call); wikiLintHandler explicitly calls exit(0) on success — default wrappers in sprintArchiveHandler must use try/catch on a fakeExit-throw pattern, not Promise resolve/reject.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-32-F130: worktree npm ci needed for typecheck — node_modules not shar
<!-- hash:20ab4e -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-04-24 · #wiki #index #worktree · worktree npm ci needed for typecheck — node_modules not shared with parent worktree; run `npm ci --workspace <pkg>` from worktree root before first typecheck.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-32-F131: wiki command tests live at `cleargate-cli/test/wiki/<cmd>.te
<!-- hash:61fc66 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-04-24 · #test-location #wiki #cli · wiki command tests live at `cleargate-cli/test/wiki/<cmd>.test.ts` (per-capability dir), NOT `test/commands/wiki-<cmd>.test.ts` — story bodies citing the commands/ path are wrong; co-locate new wiki tests alongside `build.test.ts` + `_fixture.ts`.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-32-F132: sprint/epic/proposal discrimination is via filename prefix t
<!-- hash:6a5501 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 1 sprint dir(s)
**Original entry:** `2026-04-24 · #wiki #bucket-inference · sprint/epic/proposal discrimination is via filename prefix through deriveBucket() (scan.ts:60), NOT frontmatter keys; existing fixture helpers use `story_id` even for sprint/epic files (test/wiki/_fixture.ts:55-100) — classify via `item.bucket`.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-32-F133: `cleargate sprint close` CLI handler doesn't pass through `-
<!-- hash:893004 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-04-21 · #cli #sprint-close #assume-ack · `cleargate sprint close` CLI handler doesn't pass through `--assume-ack` to `close_sprint.mjs` — the flag exists on the script (flips state to Completed + runs suggest_improvements), but the CLI wrapper exits at Step 4 "waiting for Reporter". Orchestrator must invoke `run_script.sh close_sprint.mjs <id> --assume-ack` directly post-Reporter. Wire the flag through the CLI option in commands/sprint.ts.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-32-F134: `cleargate state update <STORY> <state>` with no --sprint co
<!-- hash:9b3934 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-04-21 · #cli #state-update #execution-mode · `cleargate state update <STORY> <state>` with no --sprint context defaults to v1-inert (handler uses SPRINT-UNKNOWN fallback). Add a --sprint flag or read .active sentinel; orchestrator must invoke via `run_script.sh update_state.mjs` directly in v2 runs until fixed.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-32-F135: close_sprint/suggest_improvements/prefill_report resolve spr
<!-- hash:bb43b2 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 1 sprint dir(s)
**Original entry:** `2026-04-21 · #test-harness #scripts #env · close_sprint/suggest_improvements/prefill_report resolve sprint dir from REPO_ROOT by default; add CLEARGATE_SPRINT_DIR env override for test isolation.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-32-F136: stories drafted before a prior sprint's protocol edits go st
<!-- hash:27a248 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-04-21 · #protocol #section-numbering · stories drafted before a prior sprint's protocol edits go stale — §§ they cite (e.g. 'append §10') may already be occupied. Architect MUST audit actual current numbering before planning; use next free § after last-shipped section.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-32-F137: exit seam throws in tests; if the throw propagates into `cat
<!-- hash:ece82a -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-04-20 · #cli #test-seam #exit · exit seam throws in tests; if the throw propagates into `catch(err)`, the error-path fires — extract SQL into a value-returning fn, call exitFn only at handler top-level after cleanup.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-32-F138: `npm ci --workspace X` skips sibling workspace symlinks; use
<!-- hash:c18ddf -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-04-20 · #docker #workspace · `npm ci --workspace X` skips sibling workspace symlinks; use plain `npm ci` in builder so peer workspaces resolve (e.g. cleargate/admin-api).`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-32-F139: SvelteKit endpoints forbid non-HTTP-method named exports; ex
<!-- hash:14cd1e -->

**Category:** stale
**Reason:** stale: zero grep hits across last 1 sprint dir(s)
**Original entry:** `2026-04-19 · #vitest #vi-mock #sveltekit-endpoint · SvelteKit endpoints forbid non-HTTP-method named exports; extract test-seam functions to $lib/server/*.ts and mock ioredis with vi.hoisted() + vi.mock() pattern.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-32-F140: status-of([[ID]]) requires a literal ID — cannot dynamically
<!-- hash:549fdc -->

**Category:** stale
**Reason:** stale: zero grep hits across last 1 sprint dir(s)
**Original entry:** `2026-04-19 · #gates #predicate · status-of([[ID]]) requires a literal ID — cannot dynamically ref story's parent_epic_ref; use frontmatter(.).parent_epic_ref != null as a proxy for "parent set" in story gate; 008-02 evaluator must handle this constraint.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-32-F141: Rate-limit integration tests for public routes must use a de
<!-- hash:6bdfd6 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 1 sprint dir(s)
**Original entry:** `2026-04-19 · #device-flow #rate-limit #test-harness · Rate-limit integration tests for public routes must use a dedicated mini-app with mocked fetch; the shared `app` accumulates real GitHub 502s against the same rl:anon bucket across test cases, causing spurious 429s in the later rate-limit scenario.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-32-F142: [R] superseded-by BUG-001-fix · parseFrontmatter must use js
<!-- hash:dc7a29 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-04-19 · #yaml #frontmatter · [R] superseded-by BUG-001-fix · parseFrontmatter must use js-yaml CORE_SCHEMA — hand-rolled parser flattened indented maps to top-level keys and stringified null/bool; roundtrip is now lossless and draft_tokens/cached_gate_result are native nested objects on disk.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-32-F143: [R] superseded-by BUG-001-fix · parseFrontmatter stores nest
<!-- hash:5d3cad -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-04-19 · #wiki #lint #yaml · [R] superseded-by BUG-001-fix · parseFrontmatter stores nested YAML as opaque string when value starts with `{`; lint checks reading cached_gate_result must call yaml.load() on that string — block-YAML form in test fixtures will NOT parse correctly.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-32-F144: init.ts has its own HOOK_ADDITION constant (SPRINT-04 legacy
<!-- hash:5771d2 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 1 sprint dir(s)
**Original entry:** `2026-04-19 · #hooks #init #settings · init.ts has its own HOOK_ADDITION constant (SPRINT-04 legacy); when scaffold settings.json is updated, init.ts must also be updated or tests fail with 2 PostToolUse inner-hooks.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-32-F145: ManifestEntry.overwrite_policy uses 'skip' not 'never'; stor
<!-- hash:4a7b7d -->

**Category:** stale
**Reason:** stale: zero grep hits across last 1 sprint dir(s)
**Original entry:** `2026-04-19 · #schema #manifest #upgrade · ManifestEntry.overwrite_policy uses 'skip' not 'never'; story/plan prose says "never-policy" but the TS type is 'always'|'merge-3way'|'skip'|'preserve'.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-32-F146: gate check infers transition from cached_gate_result.pass: n
<!-- hash:92b4d1 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-04-19 · #cli #gate #transition-inference · gate check infers transition from cached_gate_result.pass: no cache or fail → first transition; pass + multi-transition (Epic) → next. Single-transition types always return their only transition regardless of pass state.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-32-F147: readiness-gates.md fenced yaml blocks are YAML lists (- work
<!-- hash:c45bf0 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 1 sprint dir(s)
**Original entry:** `2026-04-19 · #gates #predicate #yaml · readiness-gates.md fenced yaml blocks are YAML lists (- work_item_type: ...); yaml.load() returns array — unwrap [0] to get the gate object.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-32-F148: token-ledger.sh routes via `ls -td sprint-runs/*/` and tags 
<!-- hash:f25585 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 1 sprint dir(s)
**Original entry:** `2026-04-19 · #reporting #hooks #ledger · token-ledger.sh routes via `ls -td sprint-runs/*/` and tags `story_id` from the FIRST `STORY-NNN-NN` it greps in the orchestrator transcript — SPRINT-04 rows landed in `SPRINT-03/token-ledger.jsonl` tagged `STORY-006-01`. Reporter cannot compute per-agent / per-story cost. Fix before next sprint (sentinel file or per-prompt header).`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-32-F149: CLAUDE.md bounded-block regex must be GREEDY (`[\s\S]*` not 
<!-- hash:c5c953 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 1 sprint dir(s)
**Original entry:** `2026-04-19 · #init #inject-claude-md #regex · CLAUDE.md bounded-block regex must be GREEDY (`[\s\S]*` not `[\s\S]*?`): the block body itself references both markers in prose (line 37 says "OUTSIDE this <!-- CLEARGATE:START -->...<!-- CLEARGATE:END --> block"), so non-greedy stops at the inline END before the real one.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-32-F150: tsup single-bundle: all source modules' `import.meta.url` co
<!-- hash:f2b099 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 1 sprint dir(s)
**Original entry:** `2026-04-19 · #tsup #bundle #import-meta · tsup single-bundle: all source modules' `import.meta.url` collapse to the bundle file (dist/cli.js); `resolveDefaultTemplateDir` must go 1 level UP from dist/ not 3 levels from src/wiki/synthesis/; always thread a `templateDir` test seam so tests bypass default resolution.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-32-F151: open-gates.ts filter `status.includes('🔴')` matches zero it
<!-- hash:5677bc -->

**Category:** stale
**Reason:** stale: zero grep hits across last 1 sprint dir(s)
**Original entry:** `2026-04-19 · #wiki #synthesis #corpus-shape · open-gates.ts filter `status.includes('🔴')` matches zero items in real corpus (statuses are textual `Draft`/`Ready`/`Active`); always validate synthesis filters against actual delivery/ data, not synthetic fixtures.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-32-F152: tsup does NOT copy non-TS assets to dist/ by default; bundle
<!-- hash:75ee03 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 1 sprint dir(s)
**Original entry:** `2026-04-19 · #tsup #npm-publish #assets · tsup does NOT copy non-TS assets to dist/ by default; bundle via `prebuild` script + add asset dir to package.json `files[]`. `import.meta.url` resolution must thread a `templateDir` test seam to work in dev (src/) and published (dist/) layouts.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-32-F153: WikiPage schema lacks `cites` field (topic-page custom field
<!-- hash:bbed2a -->

**Category:** stale
**Reason:** stale: zero grep hits across last 1 sprint dir(s)
**Original entry:** `2026-04-19 · #wiki #schema #lint · WikiPage schema lacks `cites` field (topic-page custom field); lint-checks re-parses raw frontmatter via parseFrontmatter to read `cites` — don't add to WikiPage or lint's schema check fires.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-32-F154: Wiki commands (build/ingest) need a `now` test seam to freez
<!-- hash:32caf7 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-04-19 · #cli #determinism #test-seam · Wiki commands (build/ingest) need a `now` test seam to freeze `last_ingest:` ISO timestamps; without it the byte-identical-rerun idempotency proof is flaky.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-32-F155: Wiki subagent defs MUST embed exact YAML page-schema templat
<!-- hash:706237 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-04-19 · #wiki #cost #subagent · Wiki subagent defs MUST embed exact YAML page-schema template inline; haiku/sonnet drift on field names if §10.4 is referenced by prose only — paste the literal frontmatter block in the def.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-32-F156: `cleargate join` UUID-first-check pattern: test UUID_V4_RE b
<!-- hash:edbc2e -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-04-18 · #cli #url-parsing #join · `cleargate join` UUID-first-check pattern: test UUID_V4_RE before `new URL()` — bare UUID triggers `new URL()` ERR_INVALID_URL; full-URL base is url.origin not config (but don't persist it).`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-32-F157: For malformed-UUID path params, validate with regex before D
<!-- hash:f85168 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-04-18 · #fastify #postgres #uuid · For malformed-UUID path params, validate with regex before DB call; catching pg error 22P02 from drizzle execute is brittle — the code property may be nested and cause a 500 instead of 404.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-32-F158: vi.mock() is hoisted to top of file; variables used in facto
<!-- hash:b1fd68 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 1 sprint dir(s)
**Original entry:** `2026-04-18 · #cli #vitest #vi-mock-hoisting · vi.mock() is hoisted to top of file; variables used in factory must be declared via vi.hoisted() or you get "Cannot access before initialization" at runtime.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-32-F159: Adopt npm workspaces only when first cross-package import la
<!-- hash:eaef61 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 1 sprint dir(s)
**Original entry:** `2026-04-18 · #monorepo #npm-workspaces · Adopt npm workspaces only when first cross-package import lands; root-package.json adoption forces sibling reinstall and may break working test suites — verify with npm test --workspace=<pkg> immediately after npm install.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-32-F160: vi.mock('@napi-rs/keyring') replaces module before native bi
<!-- hash:92a0bf -->

**Category:** stale
**Reason:** stale: zero grep hits across last 1 sprint dir(s)
**Original entry:** `2026-04-18 · #vitest #vi-mock #native-modules · vi.mock('@napi-rs/keyring') replaces module before native binary loads; required for testing native deps on libsecret-less CI.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-32-F161: @napi-rs/keyring Entry.getPassword() returns string | null (
<!-- hash:683f9f -->

**Category:** stale
**Reason:** stale: zero grep hits across last 1 sprint dir(s)
**Original entry:** `2026-04-18 · #keyring #napi #api-mismatch · @napi-rs/keyring Entry.getPassword() returns string | null (not throws NoEntry); handle both null return AND catch for robustness.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-32-F162: fs.writeFile(path, data, {mode}) only sets mode on creation;
<!-- hash:183c0d -->

**Category:** stale
**Reason:** stale: zero grep hits across last 1 sprint dir(s)
**Original entry:** `2026-04-18 · #keyring #napi #posix-modes · fs.writeFile(path, data, {mode}) only sets mode on creation; call fs.chmod explicitly after every security-sensitive write.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---
