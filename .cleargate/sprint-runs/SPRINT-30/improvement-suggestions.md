# Improvement Suggestions — SPRINT-30


## Trends

Trends: 18 closed sprints visible — full analysis deferred to CR-027.

## Skill Creation Candidates

<!-- generated-by: suggest_improvements.mjs --skill-candidates -->

### CAND-SPRINT-30-S01: SPRINT-28 × reporter
<!-- hash:39edb3 -->

**Pattern detected:** SPRINT-28 × reporter repeated ≥3× across ≥2 distinct sprints (SPRINT-28, SPRINT-30)
**Proposed skill:** `.claude/skills/<slug>/SKILL.md`

---

## FLASHCARD Cleanup Candidates

<!-- generated-by: suggest_improvements.mjs --flashcard-cleanup -->

### CAND-SPRINT-30-F01: close_sprint Step 2.6c walks EVERY Draft EPIC/SPRINT in pend
<!-- hash:6fe83f -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-05-29 · #close-pipeline #parent-rollup #test-seam · close_sprint Step 2.6c walks EVERY Draft EPIC/SPRINT in pending-sync and HALTs on any non-auto-flippable — forward-planning drafts structurally block any close (even the closing sprint reads halt-zero-children since its children are already archived). Verify the closing sprint's real parent is terminal, then pass CLEARGATE_SKIP_PARENT_ROLLUP=1. [SPRINT-30 close]`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-30-F02: close_sprint Step 2.6 drift-check (block mode) runs BEFORE 2
<!-- hash:2d98ed -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-05-29 · #close-pipeline #reconciler · close_sprint Step 2.6 drift-check (block mode) runs BEFORE 2.6d backsync, so a sprint whose Done stories were never archived per-story hard-blocks at 2.6. Run reconcileCurrentSprintStories({sprintId,retroactive:false}) from dist/lib/lifecycle-reconcile.js first to flip→Completed+archive, then re-run close. [SPRINT-30 close]`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-30-F03: EPIC-032 §0 + STORY-032-01 cite cleargate-cli/src/wiki/synth
<!-- hash:ca4115 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 2 sprint dir(s)
**Original entry:** `2026-05-29 · #wiki #code-map #stale-path · EPIC-032 §0 + STORY-032-01 cite cleargate-cli/src/wiki/synthesis/index.ts which does NOT exist — the index is built by buildIndex() inside commands/wiki-build.ts:173 via synthesis/render.ts renderTemplate. Cite wiki-build.ts not synthesis/index.ts. [SPRINT-32 SDR]`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-30-F04: Gate criteria reuse-audit-recorded / simplest-form-justified
<!-- hash:7f49a3 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-05-29 · #readiness-gate #template #decomposition · Gate criteria reuse-audit-recorded / simplest-form-justified do a LITERAL substring match for `## Existing Surfaces` / `## Why not simpler?`. The epic/story/CR templates' numbered headings (`### 1.6`, `## 3.5`) FAIL the gate — emit UNNUMBERED `##` headings; in stories place them AFTER `## 4. Quality Gates` so the `## `-counted section(3)=impl-files / section(4)=DoD don't shift. Bit EPIC-031/32/33 + STORY-033-01.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-30-F05: full-suite failure count can vary ~15 across runs (env/test-
<!-- hash:4ff9a2 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 2 sprint dir(s)
**Original entry:** `2026-05-22 · #qa #regression #baseline-variance · full-suite failure count can vary ~15 across runs (env/test-isolation flakes); always stash-baseline before attributing a delta to the story under test, never trust raw count diff.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-30-F06: `getMembershipState` requires `{projectRoot}` param + per-re
<!-- hash:435f3e -->

**Category:** stale
**Reason:** stale: zero grep hits across last 2 sprint dir(s)
**Original entry:** `2026-05-20 · #membership #per-repo #cr-011 · `getMembershipState` requires `{projectRoot}` param + per-repo `.cleargate/.join.json` to return `member`. Global `~/.cleargate/auth.json` alone is insufficient. `join.ts` MUST write the marker on success (otherwise doctor always shows pre-member).`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-30-F07: dist/cli.js references co-located chunk-*.js files. When run
<!-- hash:bff572 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 2 sprint dir(s)
**Original entry:** `2026-05-20 · #worktree #build #dist · dist/cli.js references co-located chunk-*.js files. When running tests via `process.execPath + DIST_CLI_PATH` from a worktree, the full dist/ (cli.js + all chunks) must be present, not just cli.js. Build inside the worktree (after node_modules symlink) or copy the entire dist/ tree.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-30-F08: `reconcileCurrentSprintStories` (Step 2.6d) needs no SKIP se
<!-- hash:c0afee -->

**Category:** stale
**Reason:** stale: zero grep hits across last 2 sprint dir(s)
**Original entry:** `2026-05-19 · #close-pipeline #test-seam · `reconcileCurrentSprintStories` (Step 2.6d) needs no SKIP seam — pure FS (no git, no network); `import().catch` handles stale-dist gracefully.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-30-F09: `reconcileCrossSprintOrphans` prefix-split silently drops no
<!-- hash:5ee3ad -->

**Category:** stale
**Reason:** stale: zero grep hits across last 2 sprint dir(s)
**Original entry:** `2026-05-19 · #close-pipeline #id-lookup · `reconcileCrossSprintOrphans` prefix-split silently drops non-standard IDs (e.g. `STORY-TEST-01` → `idType()` returns null → entry dropped). Use `findArtifactFile()` for cross-format coverage when test fixtures use non-numeric segments.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-30-F10: Red file's inline regex/const copy goes stale when Dev appli
<!-- hash:a2de11 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-05-19 · #qa-red #spec-gap · Red file's inline regex/const copy goes stale when Dev applies spec-gap fix; delete `.red.` file at merge, do not patch in place — its tests duplicate the plain `.node.test.ts`.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-30-F11: When tightening a path-extraction regex, pre-existing test f
<!-- hash:7d812e -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-05-19 · #regex #test-fixture · When tightening a path-extraction regex, pre-existing test fixtures citing bare filenames (e.g. `package.json`) break — update to slash-required form (`./package.json`); behavioral change is intentional.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-30-F12: EPIC-028 complete — single test runner across mcp/, cleargat
<!-- hash:d371bc -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-05-18 · #node-test #testing · EPIC-028 complete — single test runner across mcp/, cleargate-cli/, admin/. __overrides__ pattern (mutable shared state in __mocks__/ + 2 prod seams) is the workaround for static-ESM-import un-interceptability.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-30-F13: parent-rollup.ts extractId() checks story_id only; Epic file
<!-- hash:3950c5 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 2 sprint dir(s)
**Original entry:** `2026-05-18 · #parent-rollup #reconciler · parent-rollup.ts extractId() checks story_id only; Epic files use epic_id — add epic_id/sprint_id key checks before filename-stem fallback.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-30-F14: node:test on DB-integration suites needs `--test-concurrency
<!-- hash:93f678 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 2 sprint dir(s)
**Original entry:** `2026-05-18 · #node-test #migration · node:test on DB-integration suites needs `--test-concurrency=1` (matches vitest singleFork:true); default parallel breaks FK constraints.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-30-F15: @hono/node-server calls `socket.destroySoon()` ~500ms after 
<!-- hash:4a9eb5 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 2 sprint dir(s)
**Original entry:** `2026-05-18 · #node-test #hono · @hono/node-server calls `socket.destroySoon()` ~500ms after Fastify `inject()` fake-socket request — node:test treats it as hard fail (vitest tolerated); patch via onRequest hook no-op or uncaughtException handler.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-30-F16: `mock.module()` mock-class instances must use the same prope
<!-- hash:c5a2b9 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 2 sprint dir(s)
**Original entry:** `2026-05-18 · #node-test #mock · `mock.module()` mock-class instances must use the same property names as the real class (`AdminApiError.kind` not `.errorType`) — node:test's stricter equality exposes vitest-passing mock-shape bugs.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-30-F17: `mcp/` is a gitignored nested git repo — QA tests must resol
<!-- hash:d48798 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-05-18 · #mcp #nested-repo · `mcp/` is a gitignored nested git repo — QA tests must resolve its path via `git rev-parse --git-common-dir` + `path.dirname()` (worktree-relative breaks). DevOps must verify INNER commit SHA, not outer (outer carries only the dev report on EPIC-028 conversion stories).`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-30-F18: close_sprint.mjs `import()` of reconciler module must be `__
<!-- hash:8a053d -->

**Category:** stale
**Reason:** stale: zero grep hits across last 2 sprint dir(s)
**Original entry:** `2026-05-18 · #close-pipeline #test-seam · close_sprint.mjs `import()` of reconciler module must be `__dirname`-relative (SCRIPTS_DIR), NOT REPO_ROOT-relative — CLEARGATE_REPO_ROOT test seam overrides REPO_ROOT to a tmpdir without dist; only the static script dir reliably finds the built bundle.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-30-F19: `cleargate-cli/templates/cleargate-planning/` (npm payload) 
<!-- hash:83554b -->

**Category:** stale
**Reason:** stale: zero grep hits across last 2 sprint dir(s)
**Original entry:** `2026-05-18 · #migration #prebuild #gitignore · `cleargate-cli/templates/cleargate-planning/` (npm payload) is gitignored — verify byte-equality via `diff -rq` after `npm run prebuild`, never `git add` it.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-30-F20: MANIFEST.json conflicts between concurrent story branches ar
<!-- hash:ccdd57 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 2 sprint dir(s)
**Original entry:** `2026-05-18 · #orchestration #merge-conflict · MANIFEST.json conflicts between concurrent story branches are deterministically resolvable: `git rebase sprint/S-NN` + `cd cleargate-cli && npm run prebuild` regenerates the SHA table — no manual merge needed.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-30-F21: Dev/QA/Architect dispatch prompts MUST tell agents to write 
<!-- hash:67ad8e -->

**Category:** stale
**Reason:** stale: zero grep hits across last 2 sprint dir(s)
**Original entry:** `2026-05-18 · #orchestration #report-files · Dev/QA/Architect dispatch prompts MUST tell agents to write their report to .cleargate/sprint-runs/<id>/reports/<id>-{dev,qa,arch}.md before returning; text-only return blocks DevOps at Step 1.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-30-F22: run_script.sh does NOT inject env vars; prefix CLEARGATE_STA
<!-- hash:b2058c -->

**Category:** stale
**Reason:** stale: zero grep hits across last 2 sprint dir(s)
**Original entry:** `2026-05-18 · #orchestration #env-vars · run_script.sh does NOT inject env vars; prefix CLEARGATE_STATE_FILE=... BEFORE `bash run_script.sh ...` or invoke `node update_state.mjs` directly without the wrapper.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-30-F23: agent `description:` values with backticks must be double-qu
<!-- hash:2fdf84 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-05-18 · #scaffold #yaml #agent-def · agent `description:` values with backticks must be double-quoted in YAML frontmatter — unquoted backtick triggers js-yaml CORE_SCHEMA YAMLException on subagent dispatch (BUG-004).`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-30-F24: ts-morph v28 `replaceWithText()` re-indents multi-line text 
<!-- hash:28d3eb -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-05-18 · #ts-morph #codemod · ts-morph v28 `replaceWithText()` re-indents multi-line text by the node's column offset; use raw `applyEdits()` on character ranges for multi-line replacements.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-30-F25: ts-morph as new devDep needs `npm install` at workspace root
<!-- hash:5d5580 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-05-18 · #ts-morph #npm-install · ts-morph as new devDep needs `npm install` at workspace root before tests run; package-lock.json update alone leaves node_modules empty.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-30-F26: `*.node.test.ts` fixture files with vitest imports get picke
<!-- hash:55c895 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 2 sprint dir(s)
**Original entry:** `2026-05-18 · #fixtures #test-glob · `*.node.test.ts` fixture files with vitest imports get picked up by `test/**/*.node.test.ts` glob and fail — exclude `test/fixtures/**` from runner glob or rename fixtures (.snap/.txt).`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-30-F27: QA-Red on codemod stories must assert each §2.1 Gherkin scen
<!-- hash:b8c937 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-05-18 · #qa #codemod #fixture-gap · QA-Red on codemod stories must assert each §2.1 Gherkin scenario 1:1 — `.spec.ts` rename + target collision are easily overlooked without explicit fixture pairs.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-30-F28: vi.mock('$env/dynamic/public') needs a vitest.config alias +
<!-- hash:3a186b -->

**Category:** stale
**Reason:** stale: zero grep hits across last 2 sprint dir(s)
**Original entry:** `2026-05-15 · #svelte #vitest · vi.mock('$env/dynamic/public') needs a vitest.config alias + stub file — without it vite import-analysis errors before mock intercepts. Pattern: $app/navigation alias precedent.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-30-F29: before deleting an exported symbol, grep ALL importers (e.g.
<!-- hash:da50ec -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-05-15 · #mcp #scope-bleed-guard · before deleting an exported symbol, grep ALL importers (e.g. ITEM_TYPES export chain: push-item.ts, list-items.ts, register-tools.ts, cleargate-sync-work-items.ts) — undocumented dependents cause typecheck breaks.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-30-F30: cleargate-cli/templates/cleargate-planning/ is gitignored; v
<!-- hash:388a81 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 2 sprint dir(s)
**Original entry:** `2026-05-15 · #mirror #parity #prebuild · cleargate-cli/templates/cleargate-planning/ is gitignored; verify scaffold mirror parity via diff after npm run prebuild, do NOT git add it.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-30-F31: cleargate-planning/.cleargate/knowledge/ is mirrored by preb
<!-- hash:dc67b9 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 2 sprint dir(s)
**Original entry:** `2026-05-15 · #scaffold #prebuild #knowledge-mirror · cleargate-planning/.cleargate/knowledge/ is mirrored by prebuild; canonical-live-parity Red test diffs live vs canonical — update both files or parity test fails.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-30-F32: Story §Existing Surfaces bullets are advisory — SDR must gre
<!-- hash:09de71 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-05-14 · #architect #sdr #anti-speculation · Story §Existing Surfaces bullets are advisory — SDR must grep codebase to verify cross-story coupling claims (069-09 mishap).`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-30-F33: QA agent sometimes writes report to worktree-relative `.clea
<!-- hash:ec4b10 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-05-04 · #qa #report #worktree-vs-main · QA agent sometimes writes report to worktree-relative `.cleargate/sprint-runs/<id>/reports/` path; orchestrator must copy to main-repo path before merge for audit trail (DevOps fallback).`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-30-F34: isSessionShared: distinct-session-count==1 (NOT "≥2 of ≥3 sh
<!-- hash:74c76d -->

**Category:** stale
**Reason:** stale: zero grep hits across last 2 sprint dir(s)
**Original entry:** `2026-05-04 · #heuristic #session-shared · isSessionShared: distinct-session-count==1 (NOT "≥2 of ≥3 share same session") — looser rule false-flags real 2+1 split-sprint patterns.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-30-F35: Red scenarios for .mjs scripts: invoke via spawnSync(node, [
<!-- hash:00922c -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-05-04 · #red-test #scripts #env · Red scenarios for .mjs scripts: invoke via spawnSync(node, [scriptPath]), NOT wrapScript (wrapScript is run_script.sh-only); use CLEARGATE_SPRINT_DIR + CLEARGATE_SPRINT_RUNS_DIR env overrides for fixture isolation.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-30-F36: pre_gate_runner.sh exits 1 with empty record output (header 
<!-- hash:b13d67 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 2 sprint dir(s)
**Original entry:** `2026-05-04 · #pre-gate #scanner #dogfood · pre_gate_runner.sh exits 1 with empty record output (header only); suspect pre_gate_common.sh:53 redirect path bug — surfaced during CR-053 post-flight; investigate at SPRINT-26 kickoff.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-30-F37: run_script.sh interface flip orphaned 6 cleargate-cli/src/co
<!-- hash:db788d -->

**Category:** stale
**Reason:** stale: zero grep hits across last 2 sprint dir(s)
**Original entry:** `2026-05-04 · #cr-046 #wrapper #breaking-change · run_script.sh interface flip orphaned 6 cleargate-cli/src/commands callers under v2; spawnMock-only tests masked breakage. Always pair wrapper-interface changes with one production-path integration test.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-30-F38: For wrapper-interface changes, copy the wrapper into os.tmpd
<!-- hash:bca14e -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-05-04 · #wrapper #e2e-test-pattern · For wrapper-interface changes, copy the wrapper into os.tmpdir() alongside fixture scripts and spawnSync the real wrapper; catches drift that spawnMock-style command tests cannot.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-30-F39: SDR HIGH-risk flag on SKILL.md §C anchor proved accurate for
<!-- hash:d03448 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-05-04 · #merge-conflict #skill-md · SDR HIGH-risk flag on SKILL.md §C anchor proved accurate for SPRINT-23 W1; "keep both" resolution was correct when both inserts target same anchor with distinct concerns.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-30-F40: `cleargate init --force` overwrites .gitignore + live `.clea
<!-- hash:1a844e -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-05-04 · #cleargate-init #clobber · `cleargate init --force` overwrites .gitignore + live `.cleargate/scripts/` from npm payload — reverts mid-sprint canonical edits that never propagated to canonical. Verify canonical = live before init.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-30-F41: wiki/log.md and open-gates.md auto-generated; merge conflict
<!-- hash:8eb505 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 2 sprint dir(s)
**Original entry:** `2026-05-04 · #wiki #merge-conflict · wiki/log.md and open-gates.md auto-generated; merge conflicts resolve cleanly via `cleargate wiki build` (no manual conflict-marker editing).`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-30-F42: [R] → superseded-by 2026-05-04/#preflight-doc · preflight St
<!-- hash:dccd72 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-05-04 · #preflight #sprint-kickoff #gate-stamp · [R] → superseded-by 2026-05-04/#preflight-doc · preflight Step 0 always re-stamps last_gate_check → self-induced dirty-main on same run; commit refresh, proceed without re-running.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-30-F43: [S] · token-ledger.sh snapshot-lock supersede pattern: cr-NN
<!-- hash:9c99e0 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-05-04 · #snapshot #hooks · [S] · token-ledger.sh snapshot-lock supersede pattern: cr-NNN.sh becomes new authoritative baseline; hooks-snapshots.test.ts byte-equality assertion flips to new lock; prior cr-N-1 demoted to historical (existence-only check).`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-30-F44: token-ledger.sh primary dispatch-marker path (L121-141) alre
<!-- hash:dd3120 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 2 sprint dir(s)
**Original entry:** `2026-05-04 · #token-ledger #devops · token-ledger.sh primary dispatch-marker path (L121-141) already accepts arbitrary agent_type strings — L227 legacy fallback list edit only affects no-sentinel transcript-grep path; not blocking for new agent types.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-30-F45: Sample/example test fixtures live in `cleargate-cli/examples
<!-- hash:559ed8 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 2 sprint dir(s)
**Original entry:** `2026-05-04 · #fixtures #sprint-22 · Sample/example test fixtures live in `cleargate-cli/examples/` NOT `cleargate-cli/test/fixtures/` — avoid the `test/**/*.node.test.ts` glob so `npm test` doesn't auto-run intentionally-failing Red examples.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-30-F46: Red+node combined naming: `*.red.node.test.ts` (red BEFORE n
<!-- hash:8a39c1 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 2 sprint dir(s)
**Original entry:** `2026-05-04 · #naming #red-green · Red+node combined naming: `*.red.node.test.ts` (red BEFORE node infix). Wrong: `*.node.red.test.ts`, `*.red.ts` — those won't be picked up by the npm test glob OR won't be marked immutable.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-30-F47: SKILL.md §C insert + renumber: forward-only handoff (§C.N fo
<!-- hash:ad69f2 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 2 sprint dir(s)
**Original entry:** `2026-05-04 · #skill-md #renumbering · SKILL.md §C insert + renumber: forward-only handoff (§C.N footer hands off to §C.N+1) is idiomatic; no need for backward "see §C.N-1" pointers. Update cross-refs by literal string match (line numbers shift).`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-30-F48: `.claude/hooks/pre-commit-surface-gate.sh` is an 11-line stu
<!-- hash:828c81 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 2 sprint dir(s)
**Original entry:** `2026-05-04 · #pre-commit #stub-extension · `.claude/hooks/pre-commit-surface-gate.sh` is an 11-line stub that delegates to file_surface_diff.sh — extensions (Red-immutability check, etc.) go IN the stub BEFORE the exec line, not in the delegated script.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-30-F49: NODE_TEST_CONTEXT=child-v8 causes nested tsx --test invocati
<!-- hash:871c6a -->

**Category:** stale
**Reason:** stale: zero grep hits across last 2 sprint dir(s)
**Original entry:** `2026-05-04 · #node-test #child-process · NODE_TEST_CONTEXT=child-v8 causes nested tsx --test invocations to skip silently (exit 0); delete env var in child process env (`delete env.NODE_TEST_CONTEXT`) before spawning child tsx test processes to get real pass/fail.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-30-F50: reporter.md L108 claim "Task tool creates new conversation p
<!-- hash:92fe0a -->

**Category:** stale
**Reason:** stale: zero grep hits across last 2 sprint dir(s)
**Original entry:** `2026-05-04 · #docs #agent-defs · reporter.md L108 claim "Task tool creates new conversation per dispatch" is INACCURATE per ledger evidence (1 session_id per sprint). CR-042 fixes this in SPRINT-22.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-30-F51: test_close_pipeline reporter.md mirror check fails in worktr
<!-- hash:35e6da -->

**Category:** stale
**Reason:** stale: zero grep hits across last 2 sprint dir(s)
**Original entry:** `2026-05-04 · #qa #worktree #mirror · test_close_pipeline reporter.md mirror check fails in worktrees — live `.claude/agents/` is gitignored at `/.claude/`; suppress or skip this check in worktree context.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-30-F52: close_sprint.mjs Step 3.5 is v2-fatal post-CR-036 — bundle ≥
<!-- hash:0e38f8 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 2 sprint dir(s)
**Original entry:** `2026-05-04 · #close-pipeline #step-3.5 · close_sprint.mjs Step 3.5 is v2-fatal post-CR-036 — bundle ≥2KB or close exits 1; v1 advisory preserved. Use CLEARGATE_SKIP_BUNDLE_CHECK=1 in tests.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-30-F53: Reporter token budget: 200k soft warn / 500k hard advisory +
<!-- hash:3b2855 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-05-04 · #reporter #budget · Reporter token budget: 200k soft warn / 500k hard advisory + auto-flashcard. token-ledger.sh hook emits via stdout (CR-032 chat-injection).`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-30-F54: Reporter dispatched in fresh session via write_dispatch.sh s
<!-- hash:506e66 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-05-04 · #reporter #fresh-session · Reporter dispatched in fresh session via write_dispatch.sh shell child — Agent tool path requires no --resume flag. Verified post-CR-036.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-30-F55: Architect plan said close_sprint.mjs is live-only; canonical
<!-- hash:a8602c -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-05-04 · #mirror #parity · Architect plan said close_sprint.mjs is live-only; canonical mirror EXISTS at cleargate-planning/.cleargate/scripts/close_sprint.mjs — both updated for parity.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-30-F56: sprint-v1-legacy fixture had execution_mode:v2 + schema_vers
<!-- hash:baad6b -->

**Category:** stale
**Reason:** stale: zero grep hits across last 2 sprint dir(s)
**Original entry:** `2026-05-04 · #test-harness #fixtures · sprint-v1-legacy fixture had execution_mode:v2 + schema_version:1 — inconsistent; fixed to v1. v1-era sprints should have execution_mode:v1.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-30-F57: Dev's "pre-existing failure count" can be FILE count not TES
<!-- hash:905de2 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 2 sprint dir(s)
**Original entry:** `2026-05-04 · #qa #test-count · Dev's "pre-existing failure count" can be FILE count not TEST count — QA must distinguish; spot-check by running one to confirm the actual scope.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-30-F58: AND-semantics in an enforcing gate means any new required cr
<!-- hash:ae5268 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 2 sprint dir(s)
**Original entry:** `2026-05-04 · #qa #gates #regression · AND-semantics in an enforcing gate means any new required criterion breaks ALL existing items of that type — test FULL gate runs against real parent files on disk, not isolated predicates.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-30-F59: gate.ts or_group?: optional field on GateCriterion — criteri
<!-- hash:e27323 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 2 sprint dir(s)
**Original entry:** `2026-05-04 · #gate #or-group · gate.ts or_group?: optional field on GateCriterion — criteria sharing same or_group value pass-as-group when ≥1 member passes; backward-compat: criteria without or_group still required-AND.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-30-F60: stamp-tokens.ts L194 idKeys array + work-item-type.ts L14 FM
<!-- hash:e33e80 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 2 sprint dir(s)
**Original entry:** `2026-05-04 · #stamp-tokens #fm-key-map · stamp-tokens.ts L194 idKeys array + work-item-type.ts L14 FM_KEY_MAP are DUAL sources of truth for work-item key mapping — must update both when adding work-item types.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-30-F61: existing-surfaces-verified permissive regex requires file ex
<!-- hash:8fe580 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 2 sprint dir(s)
**Original entry:** `2026-05-04 · #predicates #existing-surfaces · existing-surfaces-verified permissive regex requires file extension — extension-less paths (`etc/passwd`) are silently dropped via sentinel-missing branch, not sandbox-rejection. Test with `.conf`/`.md`/etc.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-30-F62: existing-surfaces-verified pass/fail: section absent → pass 
<!-- hash:93868e -->

**Category:** stale
**Reason:** stale: zero grep hits across last 2 sprint dir(s)
**Original entry:** `2026-05-04 · #predicates #existing-surfaces · existing-surfaces-verified pass/fail: section absent → pass (not-applicable); zero paths + no sentinel → fail; zero paths + sentinel → pass; missing paths → fail with list.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-30-F63: .session-totals.json is UUID-keyed map not flat — sum Object
<!-- hash:941303 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 2 sprint dir(s)
**Original entry:** `2026-05-04 · #reporting #session-totals · .session-totals.json is UUID-keyed map not flat — sum Object.values; spec quoted flat shape but live shape is `Record<sessionUuid, {input, output, ...}>`.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-30-F64: cleargate-planning/.cleargate/scripts/ does NOT mirror prep_
<!-- hash:12203d -->

**Category:** stale
**Reason:** stale: zero grep hits across last 2 sprint dir(s)
**Original entry:** `2026-05-04 · #mirror #parity · cleargate-planning/.cleargate/scripts/ does NOT mirror prep_reporter_context.mjs — live-only by design; do NOT create the canonical mirror.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-30-F65: Live `.claude/agents/` is gitignored — canonical edits to ag
<!-- hash:7deaf6 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-05-04 · #mirror #dogfood-split · Live `.claude/agents/` is gitignored — canonical edits to agent prompts require `cleargate init` re-sync post-merge; QA cannot verify live parity via tracked-file diff.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-30-F66: Step 0 output format must be unconditional: always emit `, N
<!-- hash:76b204 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-05-03 · #preflight #gate-cache #cr-038 · Step 0 output format must be unconditional: always emit `, N errors` even when N=0 — spec scenario text overrides sketch conditional.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-30-F67: BUG filed against npm-published version may already be fixed
<!-- hash:7364f9 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-05-03 · #bug #git-log · BUG filed against npm-published version may already be fixed in dev repo — `git log -G <symbol>` before implementing avoids duplicate fix commits.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-30-F68: sandbox-paths-declared was duplicate section(2) with blast-r
<!-- hash:a44dce -->

**Category:** stale
**Reason:** stale: zero grep hits across last 2 sprint dir(s)
**Original entry:** `2026-05-03 · #readiness-gates #cr · sandbox-paths-declared was duplicate section(2) with blast-radius-populated; correct target is section(3) per CR template (Execution Sandbox = §3).`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-30-F69: declared-item counts table data rows only after a |---| sepa
<!-- hash:94c5b0 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 2 sprint dir(s)
**Original entry:** `2026-05-03 · #predicates #declared-item #tables · declared-item counts table data rows only after a |---| separator; header row alone yields 0 — correct behavior per template semantics.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-30-F70: CLEARGATE-block awk-diff is the reliable mirror-parity gate 
<!-- hash:29e6d0 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 2 sprint dir(s)
**Original entry:** `2026-05-02 · #claude-md #mirror #prune · CLEARGATE-block awk-diff is the reliable mirror-parity gate — pipe both blocks to files and diff; empty = pass. Add to QA recipe template.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-30-F71: Tests that grep CLAUDE.md must be updated in the same commit
<!-- hash:97b920 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-05-02 · #test-harness #vitest #worktree · Tests that grep CLAUDE.md must be updated in the same commit as the CLAUDE.md prune; old assertions become instantly-failing post-merge.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-30-F72: assert_story_files.mjs gained --emit-json flag (CR-027 path-
<!-- hash:5c8281 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 2 sprint dir(s)
**Original entry:** `2026-05-02 · #scripts #shell-out · assert_story_files.mjs gained --emit-json flag (CR-027 path-a). Wraps the existing extractWorkItemIds export. sprint.ts shells out via execFn; tests inject canned JSON via execFn seam.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-30-F73: SDR may name wrong suspect if grep-based; dev bisection can 
<!-- hash:2ab149 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-05-02 · #qa #sdr · SDR may name wrong suspect if grep-based; dev bisection can override — verify by checking whether src/ files were actually modified.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-30-F74: backfill_hierarchy.mjs spliceKeys inserted NEW line for exis
<!-- hash:c18ec7 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 2 sprint dir(s)
**Original entry:** `2026-05-02 · #frontmatter #idempotent #backfill · backfill_hierarchy.mjs spliceKeys inserted NEW line for existing-null keys; fix: Phase 1 in-place replace, Phase 2 insert-absent-only.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-30-F75: M-plan-spec'd integration test files are REQUIRED, not optio
<!-- hash:0df16d -->

**Category:** stale
**Reason:** stale: zero grep hits across last 2 sprint dir(s)
**Original entry:** `2026-05-02 · #qa #test-coverage #integration · M-plan-spec'd integration test files are REQUIRED, not optional — Dev must deliver them; per-hook unit tests don't cover cross-hook end-to-end flow.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-30-F76: token-ledger.sh has a copy-on-fix snapshot lock in test/snap
<!-- hash:f04670 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 2 sprint dir(s)
**Original entry:** `2026-05-02 · #snapshot #hooks · token-ledger.sh has a copy-on-fix snapshot lock in test/snapshots/ — update token-ledger.cr-NNN.sh + supersede byte-equality assertion every time the hook changes.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-30-F77: token-ledger.sh transcript-grep fallback skips ^[0-9]+ items
<!-- hash:adfa5e -->

**Category:** stale
**Reason:** stale: zero grep hits across last 2 sprint dir(s)
**Original entry:** `2026-05-02 · #hooks #ledger #banner-skip · token-ledger.sh transcript-grep fallback skips ^[0-9]+ items? blocked: prefix via BANNER_SKIP_RE — SessionStart banner stops poisoning work_item_id attribution.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-30-F78: PreToolUse:Task hook auto-writes dispatch marker by grepping
<!-- hash:21d78b -->

**Category:** stale
**Reason:** stale: zero grep hits across last 2 sprint dir(s)
**Original entry:** `2026-05-02 · #hooks #attribution #pre-tool-use-task · PreToolUse:Task hook auto-writes dispatch marker by grepping tool_input.prompt for first work-item ID; banner-immune (no transcript); uniquified filename avoids parallel-spawn collision.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-30-F79: token-ledger.sh uses newest-file lookup (ls -t .dispatch-*.j
<!-- hash:39def5 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 2 sprint dir(s)
**Original entry:** `2026-05-02 · #hooks #ledger #dispatch · token-ledger.sh uses newest-file lookup (ls -t .dispatch-*.json | head -1), not session-id-keyed — orchestrator CLAUDE_SESSION_ID never matches subagent's SubagentStop payload session_id.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-30-F80: session-start.sh snapshot locks (cr-008/cr-009) must be upda
<!-- hash:746039 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 2 sprint dir(s)
**Original entry:** `2026-05-02 · #snapshot #init-test · session-start.sh snapshot locks (cr-008/cr-009) must be updated when canonical hook content changes — init test byte-compares rendered output against lock files.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-30-F81: Dev agent's `git commit` landed on `main` instead of `story/
<!-- hash:8c121a -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-05-02 · #worktree #git #commit · Dev agent's `git commit` landed on `main` instead of `story/<id>` branch — verify post-dispatch with `git log story/<id>` not just commit-success-claim.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-30-F82: Cap forks pool via vitest.config.ts `poolOptions.forks.maxFo
<!-- hash:8c1f83 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-05-02 · #vitest #ram #pool · Cap forks pool via vitest.config.ts `poolOptions.forks.maxForks=2` — CLI flag `--pool-options.forks.maxForks=N` collides with tinypool minThreads validation when pool=forks.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-30-F83: `cleargate story start <id>` requires CLEARGATE_STATE_FILE e
<!-- hash:f33efe -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-05-01 · #cli #sprint #scripts · `cleargate story start <id>` requires CLEARGATE_STATE_FILE env — run_script.sh omits it; without it step 2 fails.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-30-F84: cleargate-cli/templates/cleargate-planning/ is DERIVED — cop
<!-- hash:c25e90 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 2 sprint dir(s)
**Original entry:** `2026-05-01 · #scaffold #mirror #prebuild · cleargate-cli/templates/cleargate-planning/ is DERIVED — copy-planning-payload.mjs rmSync+rebuilds it from cleargate-planning/ on every prebuild. Never hand-edit the cli-bundled tree; edit canonical mirror then run npm run prebuild.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-30-F85: CLAUDE.md live↔canonical pre-divergent by 4 canonical-only b
<!-- hash:d42a68 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 2 sprint dir(s)
**Original entry:** `2026-05-01 · #mirror #parity · CLAUDE.md live↔canonical pre-divergent by 4 canonical-only bullets since pre-EPIC-024. Edit-parity invariant applies per-edit, not whole-file — never reconcile pre-existing divergence as a side effect.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-30-F86: `cleargate-planning/MANIFEST.json` SHAs change after every p
<!-- hash:0f1e04 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 2 sprint dir(s)
**Original entry:** `2026-05-01 · #manifest #prebuild · `cleargate-planning/MANIFEST.json` SHAs change after every protocol/template edit; regenerate via `npm run build` (or doctor's auto-regen path) in the SAME commit or doctor flags drift on next session.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-30-F87: Multi-phase doc-migration scripts MUST read all source conte
<!-- hash:5abc87 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 2 sprint dir(s)
**Original entry:** `2026-05-01 · #migration #script #ordering · Multi-phase doc-migration scripts MUST read all source content into memory before any writes — partial-write race observed during the 127-citation rewrite when intermediate state was re-read mid-pass.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-30-F88: Sprint frontmatter `start_date` is the *planned* date — for 
<!-- hash:c070f1 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-05-01 · #closeout #script #fallback · Sprint frontmatter `start_date` is the *planned* date — for closed sprints whose commits pre-date the planned start, use Strategy 3 `git log --grep "<sprint-id>"` as the reliable fallback in changed-file discovery.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-30-F89: `protocol-section-N.test.ts` files reference numeric §-IDs t
<!-- hash:efb34c -->

**Category:** stale
**Reason:** stale: zero grep hits across last 2 sprint dir(s)
**Original entry:** `2026-05-01 · #test #protocol-section #stale · `protocol-section-N.test.ts` files reference numeric §-IDs that go stale when EPIC-024-style slimming moves sections to enforcement.md. Update or archive these tests in the same wave that moves the §.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-30-F90: `cleargate wiki lint` exits 1 even for pre-existing findings
<!-- hash:f59c44 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-05-01 · #wiki-lint #baseline · `cleargate wiki lint` exits 1 even for pre-existing findings; "no regression" gates need a pre/post baseline diff so the gate fails only on NEW findings.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-30-F91: M2 citation-rewrite surface omitted `.cleargate/templates/` 
<!-- hash:201390 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-05-01 · #citation-rewrite #scope-gap · M2 citation-rewrite surface omitted `.cleargate/templates/` — surfaced post-CR-020 as `Sprint Plan Template.md` / `sprint_report.md` / `story.md` line 32+120 stale `§24`/`§20`. Always include `.cleargate/templates/` in §-grep surfaces.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-30-F92: import.meta.url in vitest source-mode resolves to src/comman
<!-- hash:17b1b6 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 2 sprint dir(s)
**Original entry:** `2026-04-30 · #cli #vitest #import-meta · import.meta.url in vitest source-mode resolves to src/commands/*.ts not dist/; try ../package.json AND ../../package.json candidates for worktree-safe version reads.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-30-F93: CLEARGATE_NO_UPDATE_CHECK=1 suppresses all checkLatestVersio
<!-- hash:afbb1f -->

**Category:** stale
**Reason:** stale: zero grep hits across last 2 sprint dir(s)
**Original entry:** `2026-04-30 · #cli #registry-check #env · CLEARGATE_NO_UPDATE_CHECK=1 suppresses all checkLatestVersion network + cache paths; hard contract once 016-01 ships.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-30-F94: Story bodies authored at SPRINT-N draft time freeze the pack
<!-- hash:67e7b6 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-04-30 · #cli #stories #version-drift · Story bodies authored at SPRINT-N draft time freeze the package.json version literal (e.g. STORY-016-* says `cleargate@0.8.2` but live is 0.9.0 by SPRINT-16 activation). Always read live version from package.json — story-body literals are illustrative.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-30-F95: cleargate-cli/CHANGELOG.md exists pre-EPIC-016 in non-Common
<!-- hash:02c34b -->

**Category:** stale
**Reason:** stale: zero grep hits across last 2 sprint dir(s)
**Original entry:** `2026-04-30 · #cli #changelog #format · cleargate-cli/CHANGELOG.md exists pre-EPIC-016 in non-Common-Changelog form (## 0.9.0 (date)). STORY-016-03 reformats to ## [0.9.0] — date AND backfills priors; format-test regex /^## \[(\d+\.\d+\.\d+)\] — \d{4}-\d{2}-\d{2}/m fails the existing file as-is.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-30-F96: MCP tool requests must NOT carry project_id in the body — JW
<!-- hash:a2932f -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-04-30 · #mcp #cli #wire-format · MCP tool requests must NOT carry project_id in the body — JWT claims supply ctx.project_id (transport.ts:48); spec drift in EPIC-023 §2.3 flagged. Both sides drop the field.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-30-F97: cleargate-cli/src/commands/sync.ts already exists (718 LOC, 
<!-- hash:0fcb8f -->

**Category:** stale
**Reason:** stale: zero grep hits across last 2 sprint dir(s)
**Original entry:** `2026-04-30 · #cli #commander #naming-collision · cleargate-cli/src/commands/sync.ts already exists (718 LOC, STORY-010-04 pull/merge/push driver) and cleargate sync is registered. New work-item sync command MUST be a subcommand or scoped flag — never a same-file rewrite. Architect must grep commands/ before approving any story that names a new command file.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-30-F98: wiki build reads children: from raw EPIC/SPRINT files (not i
<!-- hash:4d93b6 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-04-30 · #wiki #backlink #children · wiki build reads children: from raw EPIC/SPRINT files (not inferred from child parent_epic_ref) — broken-backlinks require adding children: arrays to every raw EPIC file, not just EPIC-013/-014.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-30-F99: token-ledger.sh role-grep loop is hard-coded at line 172; ne
<!-- hash:076cff -->

**Category:** stale
**Reason:** stale: zero grep hits across last 2 sprint dir(s)
**Original entry:** `2026-04-30 · #wiki #ledger #role-attribution · token-ledger.sh role-grep loop is hard-coded at line 172; new subagent roles (e.g. cleargate-wiki-contradict) must be added there or tokens land as "unknown".`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-30-F100: Phase 4 split: TS = deterministic prep (status filter, SHA i
<!-- hash:8b243c -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-04-30 · #wiki #ingest #phase4-split · Phase 4 split: TS = deterministic prep (status filter, SHA idem, neighborhood, prompt) + commit (log append, sha stamp); agent .md = LLM spawn via Task; no Node-side Task API.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-30-F101: assert_story_files.mjs covers all six id shapes (STORY/CR/BU
<!-- hash:949850 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 2 sprint dir(s)
**Original entry:** `2026-04-27 · #sprint-init #regex #v2-gate · assert_story_files.mjs covers all six id shapes (STORY/CR/BUG/EPIC/PROPOSAL/PROP/HOTFIX); v2 hard-blocks on missing|unapproved|stub-empty; v1 warns-only.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-30-F102: update_state.mjs has no module guard — `import { fn } from '
<!-- hash:6a8af4 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 2 sprint dir(s)
**Original entry:** `2026-04-27 · #mjs #module-guard #import · update_state.mjs has no module guard — `import { fn } from './update_state.mjs'` triggers its main() at import time; inline the fn instead of importing.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-30-F103: In bash hook, `DOCTOR_EXIT=$?` after `$(cmd || true)` always
<!-- hash:5af18e -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-04-26 · #hooks #bash #exit-capture · In bash hook, `DOCTOR_EXIT=$?` after `$(cmd || true)` always returns 0 — use a tmpfile: `cmd > tmpfile; EXIT=$?; OUT=$(cat tmpfile); rm tmpfile` to capture both output and exit code independently.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-30-F104: readline.createInterface buffers ahead — when two readline i
<!-- hash:2c1efc -->

**Category:** stale
**Reason:** stale: zero grep hits across last 2 sprint dir(s)
**Original entry:** `2026-04-25 · #cli #readline #vitest · readline.createInterface buffers ahead — when two readline interfaces read sequentially from the same Readable, the first consumes more data than the first line; use PassThrough with lazy writes (setTimeout 5ms on resume) or a shared single interface for multi-prompt flows.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-30-F105: `identity_proofs.challenge_payload` jsonb is provider-privat
<!-- hash:6cc59b -->

**Category:** stale
**Reason:** stale: zero grep hits across last 2 sprint dir(s)
**Original entry:** `2026-04-25 · #identity-provider #plaintext-redact · `identity_proofs.challenge_payload` jsonb is provider-private (per provider.ts:7-8 doc); storing the GitHub device_code OR Resend OTP plaintext in payload is allowed and necessary. The plaintext-redact rule covers logs, clientHints, and route response bodies — NOT the jsonb payload column. Don't double-hash device_code thinking the column is logged.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-30-F106: mcp/.env.example documents env vars (e.g. CLEARGATE_RESEND_*
<!-- hash:98add2 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 2 sprint dir(s)
**Original entry:** `2026-04-25 · #config #env-schema #drift · mcp/.env.example documents env vars (e.g. CLEARGATE_RESEND_*) but mcp/src/config.ts envSchema is the actual contract — vars not in the Zod schema are silently dropped by loadConfig(). Always grep both files when adding a new env var; the .env.example alone is dead documentation.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-30-F107: skip wiki build+lint in sprintArchiveHandler when `.cleargat
<!-- hash:f34f08 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-04-24 · #wiki-gate #sprint-archive · skip wiki build+lint in sprintArchiveHandler when `.cleargate/wiki/` dir is absent (wikiInitialised guard) — otherwise existing test suites without wiki fixture break after the stamp logic lands.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-30-F108: Rule C fix (sprint→Completed) on pending-sync sprints create
<!-- hash:511450 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-04-24 · #audit-status #convergence · Rule C fix (sprint→Completed) on pending-sync sprints creates a new Rule B violation; E2E convergence tests must use only Rule A items or archive-resident sprints to guarantee exit-0 second run.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-30-F109: wiki command tests live at `cleargate-cli/test/wiki/<cmd>.te
<!-- hash:61fc66 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-04-24 · #test-location #wiki #cli · wiki command tests live at `cleargate-cli/test/wiki/<cmd>.test.ts` (per-capability dir), NOT `test/commands/wiki-<cmd>.test.ts` — story bodies citing the commands/ path are wrong; co-locate new wiki tests alongside `build.test.ts` + `_fixture.ts`.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-30-F110: sprint/epic/proposal discrimination is via filename prefix t
<!-- hash:6a5501 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 2 sprint dir(s)
**Original entry:** `2026-04-24 · #wiki #bucket-inference · sprint/epic/proposal discrimination is via filename prefix through deriveBucket() (scan.ts:60), NOT frontmatter keys; existing fixture helpers use `story_id` even for sprint/epic files (test/wiki/_fixture.ts:55-100) — classify via `item.bucket`.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-30-F111: `cleargate sprint close` CLI handler doesn't pass through `-
<!-- hash:893004 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-04-21 · #cli #sprint-close #assume-ack · `cleargate sprint close` CLI handler doesn't pass through `--assume-ack` to `close_sprint.mjs` — the flag exists on the script (flips state to Completed + runs suggest_improvements), but the CLI wrapper exits at Step 4 "waiting for Reporter". Orchestrator must invoke `run_script.sh close_sprint.mjs <id> --assume-ack` directly post-Reporter. Wire the flag through the CLI option in commands/sprint.ts.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-30-F112: `cleargate state update <STORY> <state>` with no --sprint co
<!-- hash:9b3934 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-04-21 · #cli #state-update #execution-mode · `cleargate state update <STORY> <state>` with no --sprint context defaults to v1-inert (handler uses SPRINT-UNKNOWN fallback). Add a --sprint flag or read .active sentinel; orchestrator must invoke via `run_script.sh update_state.mjs` directly in v2 runs until fixed.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-30-F113: close_sprint/suggest_improvements/prefill_report resolve spr
<!-- hash:bb43b2 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 2 sprint dir(s)
**Original entry:** `2026-04-21 · #test-harness #scripts #env · close_sprint/suggest_improvements/prefill_report resolve sprint dir from REPO_ROOT by default; add CLEARGATE_SPRINT_DIR env override for test isolation.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-30-F114: stories drafted before a prior sprint's protocol edits go st
<!-- hash:27a248 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-04-21 · #protocol #section-numbering · stories drafted before a prior sprint's protocol edits go stale — §§ they cite (e.g. 'append §10') may already be occupied. Architect MUST audit actual current numbering before planning; use next free § after last-shipped section.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-30-F115: macOS ships bash 3.2 as `/usr/bin/env bash`; `mapfile`/`read
<!-- hash:a5b07c -->

**Category:** stale
**Reason:** stale: zero grep hits across last 2 sprint dir(s)
**Original entry:** `2026-04-21 · #bash #macos #portability · macOS ships bash 3.2 as `/usr/bin/env bash`; `mapfile`/`readarray` are bash 4+ only. Under `set -u` the unbound array trips. Use portable `arr=(); while IFS= read -r x; do arr+=("$x"); done < <(cmd)` instead.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-30-F116: glob pattern `foo/*/bar` inside a JSDoc block comment in .mj
<!-- hash:9415af -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-04-21 · #mjs #jsdoc #syntax · glob pattern `foo/*/bar` inside a JSDoc block comment in .mjs causes SyntaxError at module load (Node parses `*` as multiply); use `<id>` placeholder instead.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-30-F117: Svelte 5 `$state`/`$derived`/`$effect` don't work in plain `
<!-- hash:6ab1c8 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-04-20 · #svelte5 #runes #production-build · Svelte 5 `$state`/`$derived`/`$effect` don't work in plain `.ts` files — only `.svelte`/`.svelte.ts`/`.svelte.js`. Dev server (Vite preprocessor) silently works; adapter-node production build crashes with `ReferenceError: $state is not defined`. Unit tests that mock the store hide it. Always build the prod image + smoke `/` before shipping.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-30-F118: status-of([[ID]]) requires a literal ID — cannot dynamically
<!-- hash:549fdc -->

**Category:** stale
**Reason:** stale: zero grep hits across last 2 sprint dir(s)
**Original entry:** `2026-04-19 · #gates #predicate · status-of([[ID]]) requires a literal ID — cannot dynamically ref story's parent_epic_ref; use frontmatter(.).parent_epic_ref != null as a proxy for "parent set" in story gate; 008-02 evaluator must handle this constraint.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-30-F119: jq `scan("(A|B)[-=]?([0-9]+(-[0-9]+)?)")` returns an array p
<!-- hash:e55599 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 2 sprint dir(s)
**Original entry:** `2026-04-19 · #hooks #ledger #jq · jq `scan("(A|B)[-=]?([0-9]+(-[0-9]+)?)")` returns an array per match (all capture groups); use `.[0:2] | join("-")` to reconstruct TYPE-NUMBER from groups; plain `scan("regex")` with no groups returns the full match string directly — pick pattern based on whether you need subgroups.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-30-F120: [R] superseded-by BUG-001-fix · parseFrontmatter must use js
<!-- hash:dc7a29 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-04-19 · #yaml #frontmatter · [R] superseded-by BUG-001-fix · parseFrontmatter must use js-yaml CORE_SCHEMA — hand-rolled parser flattened indented maps to top-level keys and stringified null/bool; roundtrip is now lossless and draft_tokens/cached_gate_result are native nested objects on disk.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-30-F121: SubagentStop hook fires on orchestrator session not subagent
<!-- hash:46e9af -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-04-19 · #reporting #hooks #ledger #subagent-attribution · SubagentStop hook fires on orchestrator session not subagents; all 25 SPRINT-05 rows tagged against orchestrator (EPIC-002 from session init). Reporter can't compute per-story cost until hook reaches subagent transcripts OR per-Task sentinel is written.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-30-F122: [R] superseded-by BUG-001-fix · parseFrontmatter stores nest
<!-- hash:5d3cad -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-04-19 · #wiki #lint #yaml · [R] superseded-by BUG-001-fix · parseFrontmatter stores nested YAML as opaque string when value starts with `{`; lint checks reading cached_gate_result must call yaml.load() on that string — block-YAML form in test fixtures will NOT parse correctly.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-30-F123: init.ts has its own HOOK_ADDITION constant (SPRINT-04 legacy
<!-- hash:5771d2 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 2 sprint dir(s)
**Original entry:** `2026-04-19 · #hooks #init #settings · init.ts has its own HOOK_ADDITION constant (SPRINT-04 legacy); when scaffold settings.json is updated, init.ts must also be updated or tests fail with 2 PostToolUse inner-hooks.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-30-F124: ManifestEntry.overwrite_policy uses 'skip' not 'never'; stor
<!-- hash:4a7b7d -->

**Category:** stale
**Reason:** stale: zero grep hits across last 2 sprint dir(s)
**Original entry:** `2026-04-19 · #schema #manifest #upgrade · ManifestEntry.overwrite_policy uses 'skip' not 'never'; story/plan prose says "never-policy" but the TS type is 'always'|'merge-3way'|'skip'|'preserve'.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-30-F125: gate check infers transition from cached_gate_result.pass: n
<!-- hash:92b4d1 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-04-19 · #cli #gate #transition-inference · gate check infers transition from cached_gate_result.pass: no cache or fail → first transition; pass + multi-transition (Epic) → next. Single-transition types always return their only transition regardless of pass state.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-30-F126: readiness-gates.md fenced yaml blocks are YAML lists (- work
<!-- hash:c45bf0 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 2 sprint dir(s)
**Original entry:** `2026-04-19 · #gates #predicate #yaml · readiness-gates.md fenced yaml blocks are YAML lists (- work_item_type: ...); yaml.load() returns array — unwrap [0] to get the gate object.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-30-F127: section evaluator split on /^(?=## )/m: if body starts with 
<!-- hash:70a9e2 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-04-19 · #gates #predicate #section · section evaluator split on /^(?=## )/m: if body starts with ##, rawParts[0]=section-1 (no preamble offset); detect hasPreamble before indexing.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-30-F128: token-ledger.sh routes via `ls -td sprint-runs/*/` and tags 
<!-- hash:f25585 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 2 sprint dir(s)
**Original entry:** `2026-04-19 · #reporting #hooks #ledger · token-ledger.sh routes via `ls -td sprint-runs/*/` and tags `story_id` from the FIRST `STORY-NNN-NN` it greps in the orchestrator transcript — SPRINT-04 rows landed in `SPRINT-03/token-ledger.jsonl` tagged `STORY-006-01`. Reporter cannot compute per-agent / per-story cost. Fix before next sprint (sentinel file or per-prompt header).`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-30-F129: CLAUDE.md bounded-block regex must be GREEDY (`[\s\S]*` not 
<!-- hash:c5c953 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 2 sprint dir(s)
**Original entry:** `2026-04-19 · #init #inject-claude-md #regex · CLAUDE.md bounded-block regex must be GREEDY (`[\s\S]*` not `[\s\S]*?`): the block body itself references both markers in prose (line 37 says "OUTSIDE this <!-- CLEARGATE:START -->...<!-- CLEARGATE:END --> block"), so non-greedy stops at the inline END before the real one.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-30-F130: open-gates.ts filter `status.includes('🔴')` matches zero it
<!-- hash:5677bc -->

**Category:** stale
**Reason:** stale: zero grep hits across last 2 sprint dir(s)
**Original entry:** `2026-04-19 · #wiki #synthesis #corpus-shape · open-gates.ts filter `status.includes('🔴')` matches zero items in real corpus (statuses are textual `Draft`/`Ready`/`Active`); always validate synthesis filters against actual delivery/ data, not synthetic fixtures.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-30-F131: When story body and subagent def disagree on a CLI flag (e.g
<!-- hash:5092e6 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-04-19 · #wiki #cli #subagent-contract · When story body and subagent def disagree on a CLI flag (e.g. STORY-002-08's `--rebuild` vs read-only cleargate-wiki-lint def), the subagent contract wins; flag the story-body conflict as an open decision rather than implementing both.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-30-F132: Wiki commands (build/ingest) need a `now` test seam to freez
<!-- hash:32caf7 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-04-19 · #cli #determinism #test-seam · Wiki commands (build/ingest) need a `now` test seam to freeze `last_ingest:` ISO timestamps; without it the byte-identical-rerun idempotency proof is flaky.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-30-F133: Wiki subagent defs MUST embed exact YAML page-schema templat
<!-- hash:706237 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-04-19 · #wiki #cost #subagent · Wiki subagent defs MUST embed exact YAML page-schema template inline; haiku/sonnet drift on field names if §10.4 is referenced by prose only — paste the literal frontmatter block in the def.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-30-F134: Subagent .md files ship in BOTH cleargate-planning/.claude/a
<!-- hash:3af748 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-04-19 · #wiki #protocol #mirror · Subagent .md files ship in BOTH cleargate-planning/.claude/agents/ (canonical, sealed by `cleargate init`) AND .claude/agents/ (live dogfood); post-edit `diff` must return empty or live and shipped diverge silently.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-30-F135: `cleargate join` UUID-first-check pattern: test UUID_V4_RE b
<!-- hash:edbc2e -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-04-18 · #cli #url-parsing #join · `cleargate join` UUID-first-check pattern: test UUID_V4_RE before `new URL()` — bare UUID triggers `new URL()` ERR_INVALID_URL; full-URL base is url.origin not config (but don't persist it).`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-30-F136: For malformed-UUID path params, validate with regex before D
<!-- hash:f85168 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-04-18 · #fastify #postgres #uuid · For malformed-UUID path params, validate with regex before DB call; catching pg error 22P02 from drizzle execute is brittle — the code property may be nested and cause a 500 instead of 404.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-30-F137: vi.mock() is hoisted to top of file; variables used in facto
<!-- hash:b1fd68 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 2 sprint dir(s)
**Original entry:** `2026-04-18 · #cli #vitest #vi-mock-hoisting · vi.mock() is hoisted to top of file; variables used in factory must be declared via vi.hoisted() or you get "Cannot access before initialization" at runtime.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-30-F138: When vendoring response schemas in a CLI from a server's han
<!-- hash:4d4efa -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-04-18 · #zod #drift-detection · When vendoring response schemas in a CLI from a server's hand-authored OpenAPI snapshot, add a snapshot-drift unit test that reads the snapshot file at runtime and asserts schema field-set equality. Vitest snapshot files use JS syntax with trailing commas — strip before JSON.parse.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-30-F139: vi.mock('@napi-rs/keyring') replaces module before native bi
<!-- hash:92a0bf -->

**Category:** stale
**Reason:** stale: zero grep hits across last 2 sprint dir(s)
**Original entry:** `2026-04-18 · #vitest #vi-mock #native-modules · vi.mock('@napi-rs/keyring') replaces module before native binary loads; required for testing native deps on libsecret-less CI.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-30-F140: @napi-rs/keyring Entry.getPassword() returns string | null (
<!-- hash:683f9f -->

**Category:** stale
**Reason:** stale: zero grep hits across last 2 sprint dir(s)
**Original entry:** `2026-04-18 · #keyring #napi #api-mismatch · @napi-rs/keyring Entry.getPassword() returns string | null (not throws NoEntry); handle both null return AND catch for robustness.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-30-F141: fs.writeFile(path, data, {mode}) only sets mode on creation;
<!-- hash:183c0d -->

**Category:** stale
**Reason:** stale: zero grep hits across last 2 sprint dir(s)
**Original entry:** `2026-04-18 · #keyring #napi #posix-modes · fs.writeFile(path, data, {mode}) only sets mode on creation; call fs.chmod explicitly after every security-sensitive write.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---
