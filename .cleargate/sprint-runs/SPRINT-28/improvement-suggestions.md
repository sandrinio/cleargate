# Improvement Suggestions — SPRINT-28


## Trends

Trends: 17 closed sprints visible — full analysis deferred to CR-027.

## Skill Creation Candidates

<!-- generated-by: suggest_improvements.mjs --skill-candidates -->

_No candidates detected this sprint._

## FLASHCARD Cleanup Candidates

<!-- generated-by: suggest_improvements.mjs --flashcard-cleanup -->

### CAND-SPRINT-28-F01: parent-rollup.ts extractId() checks story_id only; Epic file
<!-- hash:3950c5 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 3 sprint dir(s)
**Original entry:** `2026-05-18 · #parent-rollup #reconciler · parent-rollup.ts extractId() checks story_id only; Epic files use epic_id — add epic_id/sprint_id key checks before filename-stem fallback.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-28-F02: node:test on DB-integration suites needs `--test-concurrency
<!-- hash:93f678 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 3 sprint dir(s)
**Original entry:** `2026-05-18 · #node-test #migration · node:test on DB-integration suites needs `--test-concurrency=1` (matches vitest singleFork:true); default parallel breaks FK constraints.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-28-F03: @hono/node-server calls `socket.destroySoon()` ~500ms after 
<!-- hash:4a9eb5 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 3 sprint dir(s)
**Original entry:** `2026-05-18 · #node-test #hono · @hono/node-server calls `socket.destroySoon()` ~500ms after Fastify `inject()` fake-socket request — node:test treats it as hard fail (vitest tolerated); patch via onRequest hook no-op or uncaughtException handler.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-28-F04: `mock.module()` mock-class instances must use the same prope
<!-- hash:c5a2b9 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 3 sprint dir(s)
**Original entry:** `2026-05-18 · #node-test #mock · `mock.module()` mock-class instances must use the same property names as the real class (`AdminApiError.kind` not `.errorType`) — node:test's stricter equality exposes vitest-passing mock-shape bugs.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-28-F05: close_sprint.mjs `import()` of reconciler module must be `__
<!-- hash:8a053d -->

**Category:** stale
**Reason:** stale: zero grep hits across last 3 sprint dir(s)
**Original entry:** `2026-05-18 · #close-pipeline #test-seam · close_sprint.mjs `import()` of reconciler module must be `__dirname`-relative (SCRIPTS_DIR), NOT REPO_ROOT-relative — CLEARGATE_REPO_ROOT test seam overrides REPO_ROOT to a tmpdir without dist; only the static script dir reliably finds the built bundle.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-28-F06: `cleargate-cli/templates/cleargate-planning/` (npm payload) 
<!-- hash:83554b -->

**Category:** stale
**Reason:** stale: zero grep hits across last 3 sprint dir(s)
**Original entry:** `2026-05-18 · #migration #prebuild #gitignore · `cleargate-cli/templates/cleargate-planning/` (npm payload) is gitignored — verify byte-equality via `diff -rq` after `npm run prebuild`, never `git add` it.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-28-F07: MANIFEST.json conflicts between concurrent story branches ar
<!-- hash:ccdd57 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 3 sprint dir(s)
**Original entry:** `2026-05-18 · #orchestration #merge-conflict · MANIFEST.json conflicts between concurrent story branches are deterministically resolvable: `git rebase sprint/S-NN` + `cd cleargate-cli && npm run prebuild` regenerates the SHA table — no manual merge needed.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-28-F08: Dev/QA/Architect dispatch prompts MUST tell agents to write 
<!-- hash:67ad8e -->

**Category:** stale
**Reason:** stale: zero grep hits across last 3 sprint dir(s)
**Original entry:** `2026-05-18 · #orchestration #report-files · Dev/QA/Architect dispatch prompts MUST tell agents to write their report to .cleargate/sprint-runs/<id>/reports/<id>-{dev,qa,arch}.md before returning; text-only return blocks DevOps at Step 1.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-28-F09: run_script.sh does NOT inject env vars; prefix CLEARGATE_STA
<!-- hash:b2058c -->

**Category:** stale
**Reason:** stale: zero grep hits across last 3 sprint dir(s)
**Original entry:** `2026-05-18 · #orchestration #env-vars · run_script.sh does NOT inject env vars; prefix CLEARGATE_STATE_FILE=... BEFORE `bash run_script.sh ...` or invoke `node update_state.mjs` directly without the wrapper.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-28-F10: agent `description:` values with backticks must be double-qu
<!-- hash:2fdf84 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-05-18 · #scaffold #yaml #agent-def · agent `description:` values with backticks must be double-quoted in YAML frontmatter — unquoted backtick triggers js-yaml CORE_SCHEMA YAMLException on subagent dispatch (BUG-004).`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-28-F11: ts-morph v28 `replaceWithText()` re-indents multi-line text 
<!-- hash:28d3eb -->

**Category:** stale
**Reason:** stale: zero grep hits across last 3 sprint dir(s)
**Original entry:** `2026-05-18 · #ts-morph #codemod · ts-morph v28 `replaceWithText()` re-indents multi-line text by the node's column offset; use raw `applyEdits()` on character ranges for multi-line replacements.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-28-F12: ts-morph as new devDep needs `npm install` at workspace root
<!-- hash:5d5580 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 3 sprint dir(s)
**Original entry:** `2026-05-18 · #ts-morph #npm-install · ts-morph as new devDep needs `npm install` at workspace root before tests run; package-lock.json update alone leaves node_modules empty.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-28-F13: `*.node.test.ts` fixture files with vitest imports get picke
<!-- hash:55c895 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 3 sprint dir(s)
**Original entry:** `2026-05-18 · #fixtures #test-glob · `*.node.test.ts` fixture files with vitest imports get picked up by `test/**/*.node.test.ts` glob and fail — exclude `test/fixtures/**` from runner glob or rename fixtures (.snap/.txt).`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-28-F14: parent-rollup recursion needs `visited-Set` snapshot per sib
<!-- hash:2288d1 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 3 sprint dir(s)
**Original entry:** `2026-05-18 · #sub-epic #recursion · parent-rollup recursion needs `visited-Set` snapshot per sibling branch; shared mutable Set falsely flags sibling sub-epics as cycles.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-28-F15: ERR_MODULE_NOT_FOUND collapses all `it()` blocks to 1 report
<!-- hash:d86656 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 3 sprint dir(s)
**Original entry:** `2026-05-18 · #qa-red #red-test · ERR_MODULE_NOT_FOUND collapses all `it()` blocks to 1 reported failure in `tsx --test`; count failing scenarios from test-inventory comment, not from runner output.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-28-F16: Non-mutation assertions (bytes unchanged) pass vacuously whe
<!-- hash:5636c4 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 3 sprint dir(s)
**Original entry:** `2026-05-18 · #qa #red-test #vacuous-pass · Non-mutation assertions (bytes unchanged) pass vacuously when script absent — verify they flip fail→pass after impl lands.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-28-F17: Exit-code assertions on absent scripts can false-pass via MO
<!-- hash:c7cb41 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 3 sprint dir(s)
**Original entry:** `2026-05-18 · #qa #red-test #exit-code · Exit-code assertions on absent scripts can false-pass via MODULE_NOT_FOUND coincidence; add `assertScriptExists()` guard first in every test.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-28-F18: QA-Red on codemod stories must assert each §2.1 Gherkin scen
<!-- hash:b8c937 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-05-18 · #qa #codemod #fixture-gap · QA-Red on codemod stories must assert each §2.1 Gherkin scenario 1:1 — `.spec.ts` rename + target collision are easily overlooked without explicit fixture pairs.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-28-F19: vi.mock('$env/dynamic/public') needs a vitest.config alias +
<!-- hash:3a186b -->

**Category:** stale
**Reason:** stale: zero grep hits across last 3 sprint dir(s)
**Original entry:** `2026-05-15 · #svelte #vitest · vi.mock('$env/dynamic/public') needs a vitest.config alias + stub file — without it vite import-analysis errors before mock intercepts. Pattern: $app/navigation alias precedent.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-28-F20: direct commits to sprint branch bypass story worktree — smal
<!-- hash:9f934a -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-05-15 · #worktree #procedural · direct commits to sprint branch bypass story worktree — small additive changes may ACCEPT but flag: enforce worktree branch for all story commits.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-28-F21: before deleting an exported symbol, grep ALL importers (e.g.
<!-- hash:da50ec -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-05-15 · #mcp #scope-bleed-guard · before deleting an exported symbol, grep ALL importers (e.g. ITEM_TYPES export chain: push-item.ts, list-items.ts, register-tools.ts, cleargate-sync-work-items.ts) — undocumented dependents cause typecheck breaks.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-28-F22: cleargate-cli/templates/cleargate-planning/ is gitignored; v
<!-- hash:388a81 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 3 sprint dir(s)
**Original entry:** `2026-05-15 · #mirror #parity #prebuild · cleargate-cli/templates/cleargate-planning/ is gitignored; verify scaffold mirror parity via diff after npm run prebuild, do NOT git add it.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-28-F23: cleargate-planning/.cleargate/knowledge/ is mirrored by preb
<!-- hash:dc67b9 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 3 sprint dir(s)
**Original entry:** `2026-05-15 · #scaffold #prebuild #knowledge-mirror · cleargate-planning/.cleargate/knowledge/ is mirrored by prebuild; canonical-live-parity Red test diffs live vs canonical — update both files or parity test fails.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-28-F24: Story §Existing Surfaces bullets are advisory — SDR must gre
<!-- hash:09de71 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-05-14 · #architect #sdr #anti-speculation · Story §Existing Surfaces bullets are advisory — SDR must grep codebase to verify cross-story coupling claims (069-09 mishap).`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-28-F25: QA agent sometimes writes report to worktree-relative `.clea
<!-- hash:ec4b10 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-05-04 · #qa #report #worktree-vs-main · QA agent sometimes writes report to worktree-relative `.cleargate/sprint-runs/<id>/reports/` path; orchestrator must copy to main-repo path before merge for audit trail (DevOps fallback).`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-28-F26: Red scenarios for .mjs scripts: invoke via spawnSync(node, [
<!-- hash:00922c -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-05-04 · #red-test #scripts #env · Red scenarios for .mjs scripts: invoke via spawnSync(node, [scriptPath]), NOT wrapScript (wrapScript is run_script.sh-only); use CLEARGATE_SPRINT_DIR + CLEARGATE_SPRINT_RUNS_DIR env overrides for fixture isolation.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-28-F27: pre_gate_runner.sh exits 1 with empty record output (header 
<!-- hash:b13d67 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 3 sprint dir(s)
**Original entry:** `2026-05-04 · #pre-gate #scanner #dogfood · pre_gate_runner.sh exits 1 with empty record output (header only); suspect pre_gate_common.sh:53 redirect path bug — surfaced during CR-053 post-flight; investigate at SPRINT-26 kickoff.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-28-F28: devops subagent type may not register in long Claude Code se
<!-- hash:e00468 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-05-04 · #devops #agent-registry · devops subagent type may not register in long Claude Code sessions even when .claude/agents/devops.md exists; orchestrator-fallback inline DevOps execution preserves merge pipeline.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-28-F29: run_script.sh interface flip orphaned 6 cleargate-cli/src/co
<!-- hash:db788d -->

**Category:** stale
**Reason:** stale: zero grep hits across last 3 sprint dir(s)
**Original entry:** `2026-05-04 · #cr-046 #wrapper #breaking-change · run_script.sh interface flip orphaned 6 cleargate-cli/src/commands callers under v2; spawnMock-only tests masked breakage. Always pair wrapper-interface changes with one production-path integration test.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-28-F30: For wrapper-interface changes, copy the wrapper into os.tmpd
<!-- hash:bca14e -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-05-04 · #wrapper #e2e-test-pattern · For wrapper-interface changes, copy the wrapper into os.tmpdir() alongside fixture scripts and spawnSync the real wrapper; catches drift that spawnMock-style command tests cannot.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-28-F31: SPRINT-24 orchestrator must explicitly invoke `node update_s
<!-- hash:5588ed -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-05-04 · #tpv #self-validation · SPRINT-24 orchestrator must explicitly invoke `node update_state.mjs <id> --arch-bounce` on Mode:TPV BLOCKED-WIRING-GAP — no auto-increment from Mode:TPV return.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-28-F32: SDR HIGH-risk flag on SKILL.md §C anchor proved accurate for
<!-- hash:d03448 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-05-04 · #merge-conflict #skill-md · SDR HIGH-risk flag on SKILL.md §C anchor proved accurate for SPRINT-23 W1; "keep both" resolution was correct when both inserts target same anchor with distinct concerns.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-28-F33: `cleargate init --force` overwrites .gitignore + live `.clea
<!-- hash:1a844e -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-05-04 · #cleargate-init #clobber · `cleargate init --force` overwrites .gitignore + live `.cleargate/scripts/` from npm payload — reverts mid-sprint canonical edits that never propagated to canonical. Verify canonical = live before init.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-28-F34: wiki/log.md and open-gates.md auto-generated; merge conflict
<!-- hash:8eb505 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 3 sprint dir(s)
**Original entry:** `2026-05-04 · #wiki #merge-conflict · wiki/log.md and open-gates.md auto-generated; merge conflicts resolve cleanly via `cleargate wiki build` (no manual conflict-marker editing).`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-28-F35: [R] → superseded-by 2026-05-04/#preflight-doc · preflight St
<!-- hash:dccd72 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-05-04 · #preflight #sprint-kickoff #gate-stamp · [R] → superseded-by 2026-05-04/#preflight-doc · preflight Step 0 always re-stamps last_gate_check → self-induced dirty-main on same run; commit refresh, proceed without re-running.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-28-F36: [S] · token-ledger.sh snapshot-lock supersede pattern: cr-NN
<!-- hash:9c99e0 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-05-04 · #snapshot #hooks · [S] · token-ledger.sh snapshot-lock supersede pattern: cr-NNN.sh becomes new authoritative baseline; hooks-snapshots.test.ts byte-equality assertion flips to new lock; prior cr-N-1 demoted to historical (existence-only check).`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-28-F37: token-ledger.sh primary dispatch-marker path (L121-141) alre
<!-- hash:dd3120 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 3 sprint dir(s)
**Original entry:** `2026-05-04 · #token-ledger #devops · token-ledger.sh primary dispatch-marker path (L121-141) already accepts arbitrary agent_type strings — L227 legacy fallback list edit only affects no-sentinel transcript-grep path; not blocking for new agent types.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-28-F38: Sample/example test fixtures live in `cleargate-cli/examples
<!-- hash:559ed8 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 3 sprint dir(s)
**Original entry:** `2026-05-04 · #fixtures #sprint-22 · Sample/example test fixtures live in `cleargate-cli/examples/` NOT `cleargate-cli/test/fixtures/` — avoid the `test/**/*.node.test.ts` glob so `npm test` doesn't auto-run intentionally-failing Red examples.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-28-F39: Red+node combined naming: `*.red.node.test.ts` (red BEFORE n
<!-- hash:8a39c1 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 3 sprint dir(s)
**Original entry:** `2026-05-04 · #naming #red-green · Red+node combined naming: `*.red.node.test.ts` (red BEFORE node infix). Wrong: `*.node.red.test.ts`, `*.red.ts` — those won't be picked up by the npm test glob OR won't be marked immutable.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-28-F40: SKILL.md §C insert + renumber: forward-only handoff (§C.N fo
<!-- hash:ad69f2 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 3 sprint dir(s)
**Original entry:** `2026-05-04 · #skill-md #renumbering · SKILL.md §C insert + renumber: forward-only handoff (§C.N footer hands off to §C.N+1) is idiomatic; no need for backward "see §C.N-1" pointers. Update cross-refs by literal string match (line numbers shift).`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-28-F41: `.claude/hooks/pre-commit-surface-gate.sh` is an 11-line stu
<!-- hash:828c81 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 3 sprint dir(s)
**Original entry:** `2026-05-04 · #pre-commit #stub-extension · `.claude/hooks/pre-commit-surface-gate.sh` is an 11-line stub that delegates to file_surface_diff.sh — extensions (Red-immutability check, etc.) go IN the stub BEFORE the exec line, not in the delegated script.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-28-F42: NODE_TEST_CONTEXT=child-v8 causes nested tsx --test invocati
<!-- hash:871c6a -->

**Category:** stale
**Reason:** stale: zero grep hits across last 3 sprint dir(s)
**Original entry:** `2026-05-04 · #node-test #child-process · NODE_TEST_CONTEXT=child-v8 causes nested tsx --test invocations to skip silently (exit 0); delete env var in child process env (`delete env.NODE_TEST_CONTEXT`) before spawning child tsx test processes to get real pass/fail.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-28-F43: reporter.md L108 claim "Task tool creates new conversation p
<!-- hash:92fe0a -->

**Category:** stale
**Reason:** stale: zero grep hits across last 3 sprint dir(s)
**Original entry:** `2026-05-04 · #docs #agent-defs · reporter.md L108 claim "Task tool creates new conversation per dispatch" is INACCURATE per ledger evidence (1 session_id per sprint). CR-042 fixes this in SPRINT-22.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-28-F44: Claude Code Agent/Task tool shares orchestrator session_id —
<!-- hash:b0c159 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-05-04 · #session-reset #agent-tool · Claude Code Agent/Task tool shares orchestrator session_id — no per-dispatch session isolation; SubagentStop won't fire for `claude -p` subprocess dispatches.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-28-F45: close_sprint.mjs Step 3.5 is v2-fatal post-CR-036 — bundle ≥
<!-- hash:0e38f8 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 3 sprint dir(s)
**Original entry:** `2026-05-04 · #close-pipeline #step-3.5 · close_sprint.mjs Step 3.5 is v2-fatal post-CR-036 — bundle ≥2KB or close exits 1; v1 advisory preserved. Use CLEARGATE_SKIP_BUNDLE_CHECK=1 in tests.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-28-F46: Reporter token budget: 200k soft warn / 500k hard advisory +
<!-- hash:3b2855 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-05-04 · #reporter #budget · Reporter token budget: 200k soft warn / 500k hard advisory + auto-flashcard. token-ledger.sh hook emits via stdout (CR-032 chat-injection).`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-28-F47: Reporter dispatched in fresh session via write_dispatch.sh s
<!-- hash:506e66 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-05-04 · #reporter #fresh-session · Reporter dispatched in fresh session via write_dispatch.sh shell child — Agent tool path requires no --resume flag. Verified post-CR-036.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-28-F48: Architect plan said close_sprint.mjs is live-only; canonical
<!-- hash:a8602c -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-05-04 · #mirror #parity · Architect plan said close_sprint.mjs is live-only; canonical mirror EXISTS at cleargate-planning/.cleargate/scripts/close_sprint.mjs — both updated for parity.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-28-F49: gate.ts or_group?: optional field on GateCriterion — criteri
<!-- hash:e27323 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 3 sprint dir(s)
**Original entry:** `2026-05-04 · #gate #or-group · gate.ts or_group?: optional field on GateCriterion — criteria sharing same or_group value pass-as-group when ≥1 member passes; backward-compat: criteria without or_group still required-AND.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-28-F50: stamp-tokens.ts L194 idKeys array + work-item-type.ts L14 FM
<!-- hash:e33e80 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 3 sprint dir(s)
**Original entry:** `2026-05-04 · #stamp-tokens #fm-key-map · stamp-tokens.ts L194 idKeys array + work-item-type.ts L14 FM_KEY_MAP are DUAL sources of truth for work-item key mapping — must update both when adding work-item types.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-28-F51: .session-totals.json is UUID-keyed map not flat — sum Object
<!-- hash:941303 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 3 sprint dir(s)
**Original entry:** `2026-05-04 · #reporting #session-totals · .session-totals.json is UUID-keyed map not flat — sum Object.values; spec quoted flat shape but live shape is `Record<sessionUuid, {input, output, ...}>`.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-28-F52: cleargate-planning/.cleargate/scripts/ does NOT mirror prep_
<!-- hash:12203d -->

**Category:** stale
**Reason:** stale: zero grep hits across last 3 sprint dir(s)
**Original entry:** `2026-05-04 · #mirror #parity · cleargate-planning/.cleargate/scripts/ does NOT mirror prep_reporter_context.mjs — live-only by design; do NOT create the canonical mirror.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-28-F53: Live `.claude/agents/` is gitignored — canonical edits to ag
<!-- hash:7deaf6 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-05-04 · #mirror #dogfood-split · Live `.claude/agents/` is gitignored — canonical edits to agent prompts require `cleargate init` re-sync post-merge; QA cannot verify live parity via tracked-file diff.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-28-F54: Step 0 output format must be unconditional: always emit `, N
<!-- hash:76b204 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-05-03 · #preflight #gate-cache #cr-038 · Step 0 output format must be unconditional: always emit `, N errors` even when N=0 — spec scenario text overrides sketch conditional.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-28-F55: stamp-and-gate snapshot locks (cr-008 + cr-009) must be upda
<!-- hash:2a604b -->

**Category:** stale
**Reason:** stale: zero grep hits across last 3 sprint dir(s)
**Original entry:** `2026-05-03 · #snapshot #hooks #test-harness · stamp-and-gate snapshot locks (cr-008 + cr-009) must be updated when the hook body changes or the init snapshot test fails.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-28-F56: BUG filed against npm-published version may already be fixed
<!-- hash:7364f9 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-05-03 · #bug #git-log · BUG filed against npm-published version may already be fixed in dev repo — `git log -G <symbol>` before implementing avoids duplicate fix commits.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-28-F57: CR-034: spec §4.2 ≤2 listed-item count contradicted §3 6-cri
<!-- hash:e82929 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 3 sprint dir(s)
**Original entry:** `2026-05-03 · #qa #spec #acceptance-metric · CR-034: spec §4.2 ≤2 listed-item count contradicted §3 6-criteria migration. Always cross-check aggregate acceptance metrics against explicit item lists.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-28-F58: Tests that grep CLAUDE.md must be updated in the same commit
<!-- hash:97b920 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-05-02 · #test-harness #vitest #worktree · Tests that grep CLAUDE.md must be updated in the same commit as the CLAUDE.md prune; old assertions become instantly-failing post-merge.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-28-F59: readCachedGate is async; sprint preflight is sync — CR-027 i
<!-- hash:8ca144 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 3 sprint dir(s)
**Original entry:** `2026-05-02 · #frontmatter #cached-gate · readCachedGate is async; sprint preflight is sync — CR-027 inlined a 25-LOC sync mirror. Future async refactor: handler → async cascades into 8 vitest scenarios.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-28-F60: assert_story_files.mjs gained --emit-json flag (CR-027 path-
<!-- hash:5c8281 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 3 sprint dir(s)
**Original entry:** `2026-05-02 · #scripts #shell-out · assert_story_files.mjs gained --emit-json flag (CR-027 path-a). Wraps the existing extractWorkItemIds export. sprint.ts shells out via execFn; tests inject canned JSON via execFn seam.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-28-F61: SDR may name wrong suspect if grep-based; dev bisection can 
<!-- hash:2ab149 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-05-02 · #qa #sdr · SDR may name wrong suspect if grep-based; dev bisection can override — verify by checking whether src/ files were actually modified.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-28-F62: backfill_hierarchy.mjs spliceKeys inserted NEW line for exis
<!-- hash:c18ec7 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 3 sprint dir(s)
**Original entry:** `2026-05-02 · #frontmatter #idempotent #backfill · backfill_hierarchy.mjs spliceKeys inserted NEW line for existing-null keys; fix: Phase 1 in-place replace, Phase 2 insert-absent-only.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-28-F63: M-plan-spec'd integration test files are REQUIRED, not optio
<!-- hash:0df16d -->

**Category:** stale
**Reason:** stale: zero grep hits across last 3 sprint dir(s)
**Original entry:** `2026-05-02 · #qa #test-coverage #integration · M-plan-spec'd integration test files are REQUIRED, not optional — Dev must deliver them; per-hook unit tests don't cover cross-hook end-to-end flow.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-28-F64: token-ledger.sh has a copy-on-fix snapshot lock in test/snap
<!-- hash:f04670 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 3 sprint dir(s)
**Original entry:** `2026-05-02 · #snapshot #hooks · token-ledger.sh has a copy-on-fix snapshot lock in test/snapshots/ — update token-ledger.cr-NNN.sh + supersede byte-equality assertion every time the hook changes.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-28-F65: token-ledger.sh transcript-grep fallback skips ^[0-9]+ items
<!-- hash:adfa5e -->

**Category:** stale
**Reason:** stale: zero grep hits across last 3 sprint dir(s)
**Original entry:** `2026-05-02 · #hooks #ledger #banner-skip · token-ledger.sh transcript-grep fallback skips ^[0-9]+ items? blocked: prefix via BANNER_SKIP_RE — SessionStart banner stops poisoning work_item_id attribution.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-28-F66: PreToolUse:Task hook auto-writes dispatch marker by grepping
<!-- hash:21d78b -->

**Category:** stale
**Reason:** stale: zero grep hits across last 3 sprint dir(s)
**Original entry:** `2026-05-02 · #hooks #attribution #pre-tool-use-task · PreToolUse:Task hook auto-writes dispatch marker by grepping tool_input.prompt for first work-item ID; banner-immune (no transcript); uniquified filename avoids parallel-spawn collision.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-28-F67: token-ledger.sh uses newest-file lookup (ls -t .dispatch-*.j
<!-- hash:39def5 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 3 sprint dir(s)
**Original entry:** `2026-05-02 · #hooks #ledger #dispatch · token-ledger.sh uses newest-file lookup (ls -t .dispatch-*.json | head -1), not session-id-keyed — orchestrator CLAUDE_SESSION_ID never matches subagent's SubagentStop payload session_id.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-28-F68: session-start.sh snapshot locks (cr-008/cr-009) must be upda
<!-- hash:746039 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 3 sprint dir(s)
**Original entry:** `2026-05-02 · #snapshot #init-test · session-start.sh snapshot locks (cr-008/cr-009) must be updated when canonical hook content changes — init test byte-compares rendered output against lock files.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-28-F69: Dev agent's `git commit` landed on `main` instead of `story/
<!-- hash:8c121a -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-05-02 · #worktree #git #commit · Dev agent's `git commit` landed on `main` instead of `story/<id>` branch — verify post-dispatch with `git log story/<id>` not just commit-success-claim.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-28-F70: Cap forks pool via vitest.config.ts `poolOptions.forks.maxFo
<!-- hash:8c1f83 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-05-02 · #vitest #ram #pool · Cap forks pool via vitest.config.ts `poolOptions.forks.maxForks=2` — CLI flag `--pool-options.forks.maxForks=N` collides with tinypool minThreads validation when pool=forks.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-28-F71: `cleargate story start <id>` requires CLEARGATE_STATE_FILE e
<!-- hash:f33efe -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-05-01 · #cli #sprint #scripts · `cleargate story start <id>` requires CLEARGATE_STATE_FILE env — run_script.sh omits it; without it step 2 fails.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-28-F72: cleargate-cli/templates/cleargate-planning/ is DERIVED — cop
<!-- hash:c25e90 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 3 sprint dir(s)
**Original entry:** `2026-05-01 · #scaffold #mirror #prebuild · cleargate-cli/templates/cleargate-planning/ is DERIVED — copy-planning-payload.mjs rmSync+rebuilds it from cleargate-planning/ on every prebuild. Never hand-edit the cli-bundled tree; edit canonical mirror then run npm run prebuild.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-28-F73: CLAUDE.md live↔canonical pre-divergent by 4 canonical-only b
<!-- hash:d42a68 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 3 sprint dir(s)
**Original entry:** `2026-05-01 · #mirror #parity · CLAUDE.md live↔canonical pre-divergent by 4 canonical-only bullets since pre-EPIC-024. Edit-parity invariant applies per-edit, not whole-file — never reconcile pre-existing divergence as a side effect.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-28-F74: `cleargate-planning/MANIFEST.json` SHAs change after every p
<!-- hash:0f1e04 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 3 sprint dir(s)
**Original entry:** `2026-05-01 · #manifest #prebuild · `cleargate-planning/MANIFEST.json` SHAs change after every protocol/template edit; regenerate via `npm run build` (or doctor's auto-regen path) in the SAME commit or doctor flags drift on next session.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-28-F75: Sprint frontmatter `start_date` is the *planned* date — for 
<!-- hash:c070f1 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-05-01 · #closeout #script #fallback · Sprint frontmatter `start_date` is the *planned* date — for closed sprints whose commits pre-date the planned start, use Strategy 3 `git log --grep "<sprint-id>"` as the reliable fallback in changed-file discovery.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-28-F76: `protocol-section-N.test.ts` files reference numeric §-IDs t
<!-- hash:efb34c -->

**Category:** stale
**Reason:** stale: zero grep hits across last 3 sprint dir(s)
**Original entry:** `2026-05-01 · #test #protocol-section #stale · `protocol-section-N.test.ts` files reference numeric §-IDs that go stale when EPIC-024-style slimming moves sections to enforcement.md. Update or archive these tests in the same wave that moves the §.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-28-F77: `cleargate wiki lint` exits 1 even for pre-existing findings
<!-- hash:f59c44 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-05-01 · #wiki-lint #baseline · `cleargate wiki lint` exits 1 even for pre-existing findings; "no regression" gates need a pre/post baseline diff so the gate fails only on NEW findings.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-28-F78: M2 citation-rewrite surface omitted `.cleargate/templates/` 
<!-- hash:201390 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-05-01 · #citation-rewrite #scope-gap · M2 citation-rewrite surface omitted `.cleargate/templates/` — surfaced post-CR-020 as `Sprint Plan Template.md` / `sprint_report.md` / `story.md` line 32+120 stale `§24`/`§20`. Always include `.cleargate/templates/` in §-grep surfaces.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-28-F79: import.meta.url in vitest source-mode resolves to src/comman
<!-- hash:17b1b6 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 3 sprint dir(s)
**Original entry:** `2026-04-30 · #cli #vitest #import-meta · import.meta.url in vitest source-mode resolves to src/commands/*.ts not dist/; try ../package.json AND ../../package.json candidates for worktree-safe version reads.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-28-F80: CLEARGATE_NO_UPDATE_CHECK=1 suppresses all checkLatestVersio
<!-- hash:afbb1f -->

**Category:** stale
**Reason:** stale: zero grep hits across last 3 sprint dir(s)
**Original entry:** `2026-04-30 · #cli #registry-check #env · CLEARGATE_NO_UPDATE_CHECK=1 suppresses all checkLatestVersion network + cache paths; hard contract once 016-01 ships.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-28-F81: Story bodies authored at SPRINT-N draft time freeze the pack
<!-- hash:67e7b6 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-04-30 · #cli #stories #version-drift · Story bodies authored at SPRINT-N draft time freeze the package.json version literal (e.g. STORY-016-* says `cleargate@0.8.2` but live is 0.9.0 by SPRINT-16 activation). Always read live version from package.json — story-body literals are illustrative.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-28-F82: cleargate-cli/CHANGELOG.md exists pre-EPIC-016 in non-Common
<!-- hash:02c34b -->

**Category:** stale
**Reason:** stale: zero grep hits across last 3 sprint dir(s)
**Original entry:** `2026-04-30 · #cli #changelog #format · cleargate-cli/CHANGELOG.md exists pre-EPIC-016 in non-Common-Changelog form (## 0.9.0 (date)). STORY-016-03 reformats to ## [0.9.0] — date AND backfills priors; format-test regex /^## \[(\d+\.\d+\.\d+)\] — \d{4}-\d{2}-\d{2}/m fails the existing file as-is.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-28-F83: cleargate-cli/src/commands/sync.ts already exists (718 LOC, 
<!-- hash:0fcb8f -->

**Category:** stale
**Reason:** stale: zero grep hits across last 3 sprint dir(s)
**Original entry:** `2026-04-30 · #cli #commander #naming-collision · cleargate-cli/src/commands/sync.ts already exists (718 LOC, STORY-010-04 pull/merge/push driver) and cleargate sync is registered. New work-item sync command MUST be a subcommand or scoped flag — never a same-file rewrite. Architect must grep commands/ before approving any story that names a new command file.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-28-F84: checkPaginationNeeded MAX_BUCKET_ENTRIES=50 is hardcoded; fi
<!-- hash:088f12 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 3 sprint dir(s)
**Original entry:** `2026-04-30 · #wiki #lint #pagination · checkPaginationNeeded MAX_BUCKET_ENTRIES=50 is hardcoded; fix via wiki.bucket_pagination_ceiling in config.yml + pass ceiling param to check function — not a code-change-free fix.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-28-F85: wiki build reads children: from raw EPIC/SPRINT files (not i
<!-- hash:4d93b6 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-04-30 · #wiki #backlink #children · wiki build reads children: from raw EPIC/SPRINT files (not inferred from child parent_epic_ref) — broken-backlinks require adding children: arrays to every raw EPIC file, not just EPIC-013/-014.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-28-F86: BUG-018 missed the no-force-skip branch; every skip branch t
<!-- hash:95a4c1 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-04-30 · #init #hooks #exec-bit · BUG-018 missed the no-force-skip branch; every skip branch that may encounter an existing file must also re-assert chmodSync(0o755) if needsExec — not just the identical-content branch.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-28-F87: token-ledger.sh role-grep loop is hard-coded at line 172; ne
<!-- hash:076cff -->

**Category:** stale
**Reason:** stale: zero grep hits across last 3 sprint dir(s)
**Original entry:** `2026-04-30 · #wiki #ledger #role-attribution · token-ledger.sh role-grep loop is hard-coded at line 172; new subagent roles (e.g. cleargate-wiki-contradict) must be added there or tokens land as "unknown".`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-28-F88: Phase 4 split: TS = deterministic prep (status filter, SHA i
<!-- hash:8b243c -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-04-30 · #wiki #ingest #phase4-split · Phase 4 split: TS = deterministic prep (status filter, SHA idem, neighborhood, prompt) + commit (log append, sha stamp); agent .md = LLM spawn via Task; no Node-side Task API.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-28-F89: assert_story_files.mjs covers all six id shapes (STORY/CR/BU
<!-- hash:949850 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 3 sprint dir(s)
**Original entry:** `2026-04-27 · #sprint-init #regex #v2-gate · assert_story_files.mjs covers all six id shapes (STORY/CR/BUG/EPIC/PROPOSAL/PROP/HOTFIX); v2 hard-blocks on missing|unapproved|stub-empty; v1 warns-only.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-28-F90: update_state.mjs has no module guard — `import { fn } from '
<!-- hash:6a8af4 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 3 sprint dir(s)
**Original entry:** `2026-04-27 · #mjs #module-guard #import · update_state.mjs has no module guard — `import { fn } from './update_state.mjs'` triggers its main() at import time; inline the fn instead of importing.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-28-F91: In bash hook, `DOCTOR_EXIT=$?` after `$(cmd || true)` always
<!-- hash:5af18e -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-04-26 · #hooks #bash #exit-capture · In bash hook, `DOCTOR_EXIT=$?` after `$(cmd || true)` always returns 0 — use a tmpfile: `cmd > tmpfile; EXIT=$?; OUT=$(cat tmpfile); rm tmpfile` to capture both output and exit code independently.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-28-F92: Hook resolver tail-branch must never be `exit 0` — use `npx 
<!-- hash:330eae -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-04-26 · #hooks #resolver #cr-009 · Hook resolver tail-branch must never be `exit 0` — use `npx -y "@cleargate/cli@<PIN>"` as the working fallback; silent no-op = invisible failure.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-28-F93: readline.createInterface buffers ahead — when two readline i
<!-- hash:2c1efc -->

**Category:** stale
**Reason:** stale: zero grep hits across last 3 sprint dir(s)
**Original entry:** `2026-04-25 · #cli #readline #vitest · readline.createInterface buffers ahead — when two readline interfaces read sequentially from the same Readable, the first consumes more data than the first line; use PassThrough with lazy writes (setTimeout 5ms on resume) or a shared single interface for multi-prompt flows.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-28-F94: `identity_proofs.challenge_payload` jsonb is provider-privat
<!-- hash:6cc59b -->

**Category:** stale
**Reason:** stale: zero grep hits across last 3 sprint dir(s)
**Original entry:** `2026-04-25 · #identity-provider #plaintext-redact · `identity_proofs.challenge_payload` jsonb is provider-private (per provider.ts:7-8 doc); storing the GitHub device_code OR Resend OTP plaintext in payload is allowed and necessary. The plaintext-redact rule covers logs, clientHints, and route response bodies — NOT the jsonb payload column. Don't double-hash device_code thinking the column is logged.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-28-F95: mcp/.env.example documents env vars (e.g. CLEARGATE_RESEND_*
<!-- hash:98add2 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 3 sprint dir(s)
**Original entry:** `2026-04-25 · #config #env-schema #drift · mcp/.env.example documents env vars (e.g. CLEARGATE_RESEND_*) but mcp/src/config.ts envSchema is the actual contract — vars not in the Zod schema are silently dropped by loadConfig(). Always grep both files when adding a new env var; the .env.example alone is dead documentation.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-28-F96: skip wiki build+lint in sprintArchiveHandler when `.cleargat
<!-- hash:f34f08 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-04-24 · #wiki-gate #sprint-archive · skip wiki build+lint in sprintArchiveHandler when `.cleargate/wiki/` dir is absent (wikiInitialised guard) — otherwise existing test suites without wiki fixture break after the stamp logic lands.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-28-F97: Rule C fix (sprint→Completed) on pending-sync sprints create
<!-- hash:511450 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-04-24 · #audit-status #convergence · Rule C fix (sprint→Completed) on pending-sync sprints creates a new Rule B violation; E2E convergence tests must use only Rule A items or archive-resident sprints to guarantee exit-0 second run.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-28-F98: wiki command tests live at `cleargate-cli/test/wiki/<cmd>.te
<!-- hash:61fc66 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-04-24 · #test-location #wiki #cli · wiki command tests live at `cleargate-cli/test/wiki/<cmd>.test.ts` (per-capability dir), NOT `test/commands/wiki-<cmd>.test.ts` — story bodies citing the commands/ path are wrong; co-locate new wiki tests alongside `build.test.ts` + `_fixture.ts`.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-28-F99: sprint/epic/proposal discrimination is via filename prefix t
<!-- hash:6a5501 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 3 sprint dir(s)
**Original entry:** `2026-04-24 · #wiki #bucket-inference · sprint/epic/proposal discrimination is via filename prefix through deriveBucket() (scan.ts:60), NOT frontmatter keys; existing fixture helpers use `story_id` even for sprint/epic files (test/wiki/_fixture.ts:55-100) — classify via `item.bucket`.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-28-F100: `cleargate sprint close` CLI handler doesn't pass through `-
<!-- hash:893004 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-04-21 · #cli #sprint-close #assume-ack · `cleargate sprint close` CLI handler doesn't pass through `--assume-ack` to `close_sprint.mjs` — the flag exists on the script (flips state to Completed + runs suggest_improvements), but the CLI wrapper exits at Step 4 "waiting for Reporter". Orchestrator must invoke `run_script.sh close_sprint.mjs <id> --assume-ack` directly post-Reporter. Wire the flag through the CLI option in commands/sprint.ts.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-28-F101: `cleargate state update <STORY> <state>` with no --sprint co
<!-- hash:9b3934 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-04-21 · #cli #state-update #execution-mode · `cleargate state update <STORY> <state>` with no --sprint context defaults to v1-inert (handler uses SPRINT-UNKNOWN fallback). Add a --sprint flag or read .active sentinel; orchestrator must invoke via `run_script.sh update_state.mjs` directly in v2 runs until fixed.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-28-F102: close_sprint/suggest_improvements/prefill_report resolve spr
<!-- hash:bb43b2 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 3 sprint dir(s)
**Original entry:** `2026-04-21 · #test-harness #scripts #env · close_sprint/suggest_improvements/prefill_report resolve sprint dir from REPO_ROOT by default; add CLEARGATE_SPRINT_DIR env override for test isolation.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-28-F103: stories drafted before a prior sprint's protocol edits go st
<!-- hash:27a248 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-04-21 · #protocol #section-numbering · stories drafted before a prior sprint's protocol edits go stale — §§ they cite (e.g. 'append §10') may already be occupied. Architect MUST audit actual current numbering before planning; use next free § after last-shipped section.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-28-F104: exit seam throws in tests; if the throw propagates into `cat
<!-- hash:ece82a -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-04-20 · #cli #test-seam #exit · exit seam throws in tests; if the throw propagates into `catch(err)`, the error-path fires — extract SQL into a value-returning fn, call exitFn only at handler top-level after cleanup.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-28-F105: Svelte 5 `$state`/`$derived`/`$effect` don't work in plain `
<!-- hash:6ab1c8 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-04-20 · #svelte5 #runes #production-build · Svelte 5 `$state`/`$derived`/`$effect` don't work in plain `.ts` files — only `.svelte`/`.svelte.ts`/`.svelte.js`. Dev server (Vite preprocessor) silently works; adapter-node production build crashes with `ReferenceError: $state is not defined`. Unit tests that mock the store hide it. Always build the prod image + smoke `/` before shipping.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-28-F106: `npm ci --workspace X` skips sibling workspace symlinks; use
<!-- hash:c18ddf -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-04-20 · #docker #workspace · `npm ci --workspace X` skips sibling workspace symlinks; use plain `npm ci` in builder so peer workspaces resolve (e.g. cleargate/admin-api).`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-28-F107: status-of([[ID]]) requires a literal ID — cannot dynamically
<!-- hash:549fdc -->

**Category:** stale
**Reason:** stale: zero grep hits across last 3 sprint dir(s)
**Original entry:** `2026-04-19 · #gates #predicate · status-of([[ID]]) requires a literal ID — cannot dynamically ref story's parent_epic_ref; use frontmatter(.).parent_epic_ref != null as a proxy for "parent set" in story gate; 008-02 evaluator must handle this constraint.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-28-F108: Rate-limit integration tests for public routes must use a de
<!-- hash:6bdfd6 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 3 sprint dir(s)
**Original entry:** `2026-04-19 · #device-flow #rate-limit #test-harness · Rate-limit integration tests for public routes must use a dedicated mini-app with mocked fetch; the shared `app` accumulates real GitHub 502s against the same rl:anon bucket across test cases, causing spurious 429s in the later rate-limit scenario.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-28-F109: [R] superseded-by BUG-001-fix · parseFrontmatter must use js
<!-- hash:dc7a29 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-04-19 · #yaml #frontmatter · [R] superseded-by BUG-001-fix · parseFrontmatter must use js-yaml CORE_SCHEMA — hand-rolled parser flattened indented maps to top-level keys and stringified null/bool; roundtrip is now lossless and draft_tokens/cached_gate_result are native nested objects on disk.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-28-F110: parallel Developer agents on main share a working tree — one
<!-- hash:dc0a3c -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-04-19 · #concurrency #agents #shared-main · parallel Developer agents on main share a working tree — one's uncommitted edits are transiently visible to another's `npm test` (001-05 only passed because 008-02's parse-frontmatter change landed first). Bias worktree isolation or serialize shared-file stories.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-28-F111: [R] superseded-by BUG-001-fix · parseFrontmatter stores nest
<!-- hash:5d3cad -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-04-19 · #wiki #lint #yaml · [R] superseded-by BUG-001-fix · parseFrontmatter stores nested YAML as opaque string when value starts with `{`; lint checks reading cached_gate_result must call yaml.load() on that string — block-YAML form in test fixtures will NOT parse correctly.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-28-F112: init.ts has its own HOOK_ADDITION constant (SPRINT-04 legacy
<!-- hash:5771d2 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 3 sprint dir(s)
**Original entry:** `2026-04-19 · #hooks #init #settings · init.ts has its own HOOK_ADDITION constant (SPRINT-04 legacy); when scaffold settings.json is updated, init.ts must also be updated or tests fail with 2 PostToolUse inner-hooks.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-28-F113: ManifestEntry.overwrite_policy uses 'skip' not 'never'; stor
<!-- hash:4a7b7d -->

**Category:** stale
**Reason:** stale: zero grep hits across last 3 sprint dir(s)
**Original entry:** `2026-04-19 · #schema #manifest #upgrade · ManifestEntry.overwrite_policy uses 'skip' not 'never'; story/plan prose says "never-policy" but the TS type is 'always'|'merge-3way'|'skip'|'preserve'.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-28-F114: gate check infers transition from cached_gate_result.pass: n
<!-- hash:92b4d1 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-04-19 · #cli #gate #transition-inference · gate check infers transition from cached_gate_result.pass: no cache or fail → first transition; pass + multi-transition (Epic) → next. Single-transition types always return their only transition regardless of pass state.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-28-F115: readiness-gates.md fenced yaml blocks are YAML lists (- work
<!-- hash:c45bf0 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 3 sprint dir(s)
**Original entry:** `2026-04-19 · #gates #predicate #yaml · readiness-gates.md fenced yaml blocks are YAML lists (- work_item_type: ...); yaml.load() returns array — unwrap [0] to get the gate object.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-28-F116: section evaluator split on /^(?=## )/m: if body starts with 
<!-- hash:70a9e2 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-04-19 · #gates #predicate #section · section evaluator split on /^(?=## )/m: if body starts with ##, rawParts[0]=section-1 (no preamble offset); detect hasPreamble before indexing.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-28-F117: token-ledger.sh routes via `ls -td sprint-runs/*/` and tags 
<!-- hash:f25585 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 3 sprint dir(s)
**Original entry:** `2026-04-19 · #reporting #hooks #ledger · token-ledger.sh routes via `ls -td sprint-runs/*/` and tags `story_id` from the FIRST `STORY-NNN-NN` it greps in the orchestrator transcript — SPRINT-04 rows landed in `SPRINT-03/token-ledger.jsonl` tagged `STORY-006-01`. Reporter cannot compute per-agent / per-story cost. Fix before next sprint (sentinel file or per-prompt header).`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-28-F118: CLAUDE.md bounded-block regex must be GREEDY (`[\s\S]*` not 
<!-- hash:c5c953 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 3 sprint dir(s)
**Original entry:** `2026-04-19 · #init #inject-claude-md #regex · CLAUDE.md bounded-block regex must be GREEDY (`[\s\S]*` not `[\s\S]*?`): the block body itself references both markers in prose (line 37 says "OUTSIDE this <!-- CLEARGATE:START -->...<!-- CLEARGATE:END --> block"), so non-greedy stops at the inline END before the real one.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-28-F119: tsup single-bundle: all source modules' `import.meta.url` co
<!-- hash:f2b099 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 3 sprint dir(s)
**Original entry:** `2026-04-19 · #tsup #bundle #import-meta · tsup single-bundle: all source modules' `import.meta.url` collapse to the bundle file (dist/cli.js); `resolveDefaultTemplateDir` must go 1 level UP from dist/ not 3 levels from src/wiki/synthesis/; always thread a `templateDir` test seam so tests bypass default resolution.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-28-F120: open-gates.ts filter `status.includes('🔴')` matches zero it
<!-- hash:5677bc -->

**Category:** stale
**Reason:** stale: zero grep hits across last 3 sprint dir(s)
**Original entry:** `2026-04-19 · #wiki #synthesis #corpus-shape · open-gates.ts filter `status.includes('🔴')` matches zero items in real corpus (statuses are textual `Draft`/`Ready`/`Active`); always validate synthesis filters against actual delivery/ data, not synthetic fixtures.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-28-F121: tsup does NOT copy non-TS assets to dist/ by default; bundle
<!-- hash:75ee03 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 3 sprint dir(s)
**Original entry:** `2026-04-19 · #tsup #npm-publish #assets · tsup does NOT copy non-TS assets to dist/ by default; bundle via `prebuild` script + add asset dir to package.json `files[]`. `import.meta.url` resolution must thread a `templateDir` test seam to work in dev (src/) and published (dist/) layouts.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-28-F122: When story body and subagent def disagree on a CLI flag (e.g
<!-- hash:5092e6 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-04-19 · #wiki #cli #subagent-contract · When story body and subagent def disagree on a CLI flag (e.g. STORY-002-08's `--rebuild` vs read-only cleargate-wiki-lint def), the subagent contract wins; flag the story-body conflict as an open decision rather than implementing both.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-28-F123: Wiki commands (build/ingest) need a `now` test seam to freez
<!-- hash:32caf7 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-04-19 · #cli #determinism #test-seam · Wiki commands (build/ingest) need a `now` test seam to freeze `last_ingest:` ISO timestamps; without it the byte-identical-rerun idempotency proof is flaky.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-28-F124: Wiki subagent defs MUST embed exact YAML page-schema templat
<!-- hash:706237 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-04-19 · #wiki #cost #subagent · Wiki subagent defs MUST embed exact YAML page-schema template inline; haiku/sonnet drift on field names if §10.4 is referenced by prose only — paste the literal frontmatter block in the def.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-28-F125: Subagent .md files ship in BOTH cleargate-planning/.claude/a
<!-- hash:3af748 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-04-19 · #wiki #protocol #mirror · Subagent .md files ship in BOTH cleargate-planning/.claude/agents/ (canonical, sealed by `cleargate init`) AND .claude/agents/ (live dogfood); post-edit `diff` must return empty or live and shipped diverge silently.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-28-F126: Claude Code hooks schema: PostToolUse uses nested `hooks[]` 
<!-- hash:4eb224 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-04-19 · #hooks #protocol · Claude Code hooks schema: PostToolUse uses nested `hooks[]` with `type:"command"` + `if:"Edit(<glob>)"`; no `pathPattern` field and no `$CLAUDE_TOOL_FILE_PATH` env — file path is on stdin at `.tool_input.file_path`.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-28-F127: `cleargate join` UUID-first-check pattern: test UUID_V4_RE b
<!-- hash:edbc2e -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-04-18 · #cli #url-parsing #join · `cleargate join` UUID-first-check pattern: test UUID_V4_RE before `new URL()` — bare UUID triggers `new URL()` ERR_INVALID_URL; full-URL base is url.origin not config (but don't persist it).`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-28-F128: For malformed-UUID path params, validate with regex before D
<!-- hash:f85168 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-04-18 · #fastify #postgres #uuid · For malformed-UUID path params, validate with regex before DB call; catching pg error 22P02 from drizzle execute is brittle — the code property may be nested and cause a 500 instead of 404.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-28-F129: vi.mock() is hoisted to top of file; variables used in facto
<!-- hash:b1fd68 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 3 sprint dir(s)
**Original entry:** `2026-04-18 · #cli #vitest #vi-mock-hoisting · vi.mock() is hoisted to top of file; variables used in factory must be declared via vi.hoisted() or you get "Cannot access before initialization" at runtime.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-28-F130: When vendoring response schemas in a CLI from a server's han
<!-- hash:4d4efa -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-04-18 · #zod #drift-detection · When vendoring response schemas in a CLI from a server's hand-authored OpenAPI snapshot, add a snapshot-drift unit test that reads the snapshot file at runtime and asserts schema field-set equality. Vitest snapshot files use JS syntax with trailing commas — strip before JSON.parse.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-28-F131: vi.mock('@napi-rs/keyring') replaces module before native bi
<!-- hash:92a0bf -->

**Category:** stale
**Reason:** stale: zero grep hits across last 3 sprint dir(s)
**Original entry:** `2026-04-18 · #vitest #vi-mock #native-modules · vi.mock('@napi-rs/keyring') replaces module before native binary loads; required for testing native deps on libsecret-less CI.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-28-F132: @napi-rs/keyring Entry.getPassword() returns string | null (
<!-- hash:683f9f -->

**Category:** stale
**Reason:** stale: zero grep hits across last 3 sprint dir(s)
**Original entry:** `2026-04-18 · #keyring #napi #api-mismatch · @napi-rs/keyring Entry.getPassword() returns string | null (not throws NoEntry); handle both null return AND catch for robustness.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-28-F133: fs.writeFile(path, data, {mode}) only sets mode on creation;
<!-- hash:183c0d -->

**Category:** stale
**Reason:** stale: zero grep hits across last 3 sprint dir(s)
**Original entry:** `2026-04-18 · #keyring #napi #posix-modes · fs.writeFile(path, data, {mode}) only sets mode on creation; call fs.chmod explicitly after every security-sensitive write.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---
