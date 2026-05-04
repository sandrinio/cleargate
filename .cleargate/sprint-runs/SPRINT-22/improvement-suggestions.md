# Improvement Suggestions — SPRINT-22


## Trends

Trends: 11 closed sprints visible — full analysis deferred to CR-027.

## Skill Creation Candidates

<!-- generated-by: suggest_improvements.mjs --skill-candidates -->

### CAND-SPRINT-22-S01: STORY-020-02 × architect
<!-- hash:f55a32 -->

**Pattern detected:** STORY-020-02 × architect repeated ≥3× in token-ledger
**Proposed skill:** `.claude/skills/<slug>/SKILL.md`

---

## FLASHCARD Cleanup Candidates

<!-- generated-by: suggest_improvements.mjs --flashcard-cleanup -->

### CAND-SPRINT-22-F01: token-ledger.sh snapshot-lock supersede pattern: cr-NNN.sh b
<!-- hash:b7290d -->

**Category:** stale
**Reason:** stale: zero grep hits across last 3 sprint dir(s)
**Original entry:** `2026-05-04 · #snapshot #hooks · token-ledger.sh snapshot-lock supersede pattern: cr-NNN.sh becomes new authoritative baseline; hooks-snapshots.test.ts byte-equality assertion flips to new lock; prior cr-N-1 demoted to historical (existence-only check).`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-22-F02: token-ledger.sh primary dispatch-marker path (L121-141) alre
<!-- hash:dd3120 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 3 sprint dir(s)
**Original entry:** `2026-05-04 · #token-ledger #devops · token-ledger.sh primary dispatch-marker path (L121-141) already accepts arbitrary agent_type strings — L227 legacy fallback list edit only affects no-sentinel transcript-grep path; not blocking for new agent types.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-22-F03: Sample/example test fixtures live in `cleargate-cli/examples
<!-- hash:559ed8 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 3 sprint dir(s)
**Original entry:** `2026-05-04 · #fixtures #sprint-22 · Sample/example test fixtures live in `cleargate-cli/examples/` NOT `cleargate-cli/test/fixtures/` — avoid the `test/**/*.node.test.ts` glob so `npm test` doesn't auto-run intentionally-failing Red examples.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-22-F04: Red+node combined naming: `*.red.node.test.ts` (red BEFORE n
<!-- hash:8a39c1 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 3 sprint dir(s)
**Original entry:** `2026-05-04 · #naming #red-green · Red+node combined naming: `*.red.node.test.ts` (red BEFORE node infix). Wrong: `*.node.red.test.ts`, `*.red.ts` — those won't be picked up by the npm test glob OR won't be marked immutable.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-22-F05: SKILL.md §C insert + renumber: forward-only handoff (§C.N fo
<!-- hash:ad69f2 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 3 sprint dir(s)
**Original entry:** `2026-05-04 · #skill-md #renumbering · SKILL.md §C insert + renumber: forward-only handoff (§C.N footer hands off to §C.N+1) is idiomatic; no need for backward "see §C.N-1" pointers. Update cross-refs by literal string match (line numbers shift).`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-22-F06: `.claude/hooks/pre-commit-surface-gate.sh` is an 11-line stu
<!-- hash:828c81 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 3 sprint dir(s)
**Original entry:** `2026-05-04 · #pre-commit #stub-extension · `.claude/hooks/pre-commit-surface-gate.sh` is an 11-line stub that delegates to file_surface_diff.sh — extensions (Red-immutability check, etc.) go IN the stub BEFORE the exec line, not in the delegated script.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-22-F07: NODE_TEST_CONTEXT=child-v8 causes nested tsx --test invocati
<!-- hash:871c6a -->

**Category:** stale
**Reason:** stale: zero grep hits across last 3 sprint dir(s)
**Original entry:** `2026-05-04 · #node-test #child-process · NODE_TEST_CONTEXT=child-v8 causes nested tsx --test invocations to skip silently (exit 0); delete env var in child process env (`delete env.NODE_TEST_CONTEXT`) before spawning child tsx test processes to get real pass/fail.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-22-F08: reporter.md L108 claim "Task tool creates new conversation p
<!-- hash:92fe0a -->

**Category:** stale
**Reason:** stale: zero grep hits across last 3 sprint dir(s)
**Original entry:** `2026-05-04 · #docs #agent-defs · reporter.md L108 claim "Task tool creates new conversation per dispatch" is INACCURATE per ledger evidence (1 session_id per sprint). CR-042 fixes this in SPRINT-22.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-22-F09: Claude Code Agent/Task tool shares orchestrator session_id —
<!-- hash:b0c159 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-05-04 · #session-reset #agent-tool · Claude Code Agent/Task tool shares orchestrator session_id — no per-dispatch session isolation; SubagentStop won't fire for `claude -p` subprocess dispatches.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-22-F10: close_sprint.mjs Step 3.5 is v2-fatal post-CR-036 — bundle ≥
<!-- hash:0e38f8 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 3 sprint dir(s)
**Original entry:** `2026-05-04 · #close-pipeline #step-3.5 · close_sprint.mjs Step 3.5 is v2-fatal post-CR-036 — bundle ≥2KB or close exits 1; v1 advisory preserved. Use CLEARGATE_SKIP_BUNDLE_CHECK=1 in tests.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-22-F11: Reporter token budget: 200k soft warn / 500k hard advisory +
<!-- hash:3b2855 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-05-04 · #reporter #budget · Reporter token budget: 200k soft warn / 500k hard advisory + auto-flashcard. token-ledger.sh hook emits via stdout (CR-032 chat-injection).`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-22-F12: Reporter dispatched in fresh session via write_dispatch.sh s
<!-- hash:506e66 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-05-04 · #reporter #fresh-session · Reporter dispatched in fresh session via write_dispatch.sh shell child — Agent tool path requires no --resume flag. Verified post-CR-036.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-22-F13: Architect plan said close_sprint.mjs is live-only; canonical
<!-- hash:a8602c -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-05-04 · #mirror #parity · Architect plan said close_sprint.mjs is live-only; canonical mirror EXISTS at cleargate-planning/.cleargate/scripts/close_sprint.mjs — both updated for parity.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-22-F14: Dev's "pre-existing failure count" can be FILE count not TES
<!-- hash:905de2 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-05-04 · #qa #test-count · Dev's "pre-existing failure count" can be FILE count not TEST count — QA must distinguish; spot-check by running one to confirm the actual scope.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-22-F15: gate.ts or_group?: optional field on GateCriterion — criteri
<!-- hash:e27323 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 3 sprint dir(s)
**Original entry:** `2026-05-04 · #gate #or-group · gate.ts or_group?: optional field on GateCriterion — criteria sharing same or_group value pass-as-group when ≥1 member passes; backward-compat: criteria without or_group still required-AND.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-22-F16: stamp-tokens.ts L194 idKeys array + work-item-type.ts L14 FM
<!-- hash:e33e80 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 3 sprint dir(s)
**Original entry:** `2026-05-04 · #stamp-tokens #fm-key-map · stamp-tokens.ts L194 idKeys array + work-item-type.ts L14 FM_KEY_MAP are DUAL sources of truth for work-item key mapping — must update both when adding work-item types.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-22-F17: .session-totals.json is UUID-keyed map not flat — sum Object
<!-- hash:941303 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 3 sprint dir(s)
**Original entry:** `2026-05-04 · #reporting #session-totals · .session-totals.json is UUID-keyed map not flat — sum Object.values; spec quoted flat shape but live shape is `Record<sessionUuid, {input, output, ...}>`.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-22-F18: cleargate-planning/.cleargate/scripts/ does NOT mirror prep_
<!-- hash:12203d -->

**Category:** stale
**Reason:** stale: zero grep hits across last 3 sprint dir(s)
**Original entry:** `2026-05-04 · #mirror #parity · cleargate-planning/.cleargate/scripts/ does NOT mirror prep_reporter_context.mjs — live-only by design; do NOT create the canonical mirror.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-22-F19: Live `.claude/agents/` is gitignored — canonical edits to ag
<!-- hash:7deaf6 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-05-04 · #mirror #dogfood-split · Live `.claude/agents/` is gitignored — canonical edits to agent prompts require `cleargate init` re-sync post-merge; QA cannot verify live parity via tracked-file diff.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-22-F20: BUG filed against npm-published version may already be fixed
<!-- hash:7364f9 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-05-03 · #bug #git-log · BUG filed against npm-published version may already be fixed in dev repo — `git log -G <symbol>` before implementing avoids duplicate fix commits.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-22-F21: CR-034: spec §4.2 ≤2 listed-item count contradicted §3 6-cri
<!-- hash:e82929 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-05-03 · #qa #spec #acceptance-metric · CR-034: spec §4.2 ≤2 listed-item count contradicted §3 6-criteria migration. Always cross-check aggregate acceptance metrics against explicit item lists.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-22-F22: SPRINT-21 cached_gate_result.pass hand-set true (engine can'
<!-- hash:269aeb -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-05-03 · #protocol #gate #bypass · SPRINT-21 cached_gate_result.pass hand-set true (engine can't type-detect SPRINT files); CR-030 in this sprint fixes — bypass rescinds post-CR-030.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-22-F23: Tests that grep CLAUDE.md must be updated in the same commit
<!-- hash:97b920 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-05-02 · #test-harness #vitest #worktree · Tests that grep CLAUDE.md must be updated in the same commit as the CLAUDE.md prune; old assertions become instantly-failing post-merge.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-22-F24: CR-028: template numbered headings (## 3.5, ### 1.6) don't m
<!-- hash:d22224 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-05-02 · #qa #templates #readiness · CR-028: template numbered headings (## 3.5, ### 1.6) don't match predicates (body contains '## Existing Surfaces'). File in CR-029.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-22-F25: CR-028 SPRINT-20 anchor backfill = 6 anchors get sections (E
<!-- hash:c720c5 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-05-02 · #templates #mirror · CR-028 SPRINT-20 anchor backfill = 6 anchors get sections (EPIC-026 + STORY-026-01 + STORY-026-02 + CR-026 + CR-027 + CR-028 self); BUG-025 exempt. Generalize: when adding a new readiness criterion, audit pending-sync anchors in the same commit.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-22-F26: CR-028 inserted unnumbered "Code-Truth Principle" preamble B
<!-- hash:42a713 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-05-02 · #protocol #section-numbering · CR-028 inserted unnumbered "Code-Truth Principle" preamble BEFORE existing §0 to avoid renumbering 16 numbered headings (161 ref sites). Path (a) renumber would cascade-break; path (b) preamble preserves stability.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-22-F27: CR-028: code-truth principle stack — wiki/memory/context_sou
<!-- hash:96b1dd -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-05-02 · #protocol #templates #readiness #code-truth · CR-028: code-truth principle stack — wiki/memory/context_source are caches; code is canonical. Drafts cite ## Existing Surfaces + answer ## Why not simpler? (Story+Epic both; CR Existing-Surfaces only; Bug exempt).`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-22-F28: CR-027 §4.7: Scenario 14 tests null-gate-result, not risk-ta
<!-- hash:e434b0 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-05-02 · #qa #gherkin #coverage · CR-027 §4.7: Scenario 14 tests null-gate-result, not risk-table-populated criterion ID in stderr — partial gap; follow up in SPRINT-21 test.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-22-F29: CR-027: sprint preflight gained check #5 (per-item cached_ga
<!-- hash:7bd308 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-05-02 · #preflight #gate3 #readiness · CR-027: sprint preflight gained check #5 (per-item cached_gate_result.pass=true + freshness; v2 hard-block, v1 warn). Pre-existing drafts with cached_gate_result.pass:null fail under v2 — backfill via cleargate gate check or downgrade to v1 for one cycle.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-22-F30: assert_story_files.mjs gained --emit-json flag (CR-027 path-
<!-- hash:5c8281 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 3 sprint dir(s)
**Original entry:** `2026-05-02 · #scripts #shell-out · assert_story_files.mjs gained --emit-json flag (CR-027 path-a). Wraps the existing extractWorkItemIds export. sprint.ts shells out via execFn; tests inject canned JSON via execFn seam.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-22-F31: SDR may name wrong suspect if grep-based; dev bisection can 
<!-- hash:2ab149 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-05-02 · #qa #sdr · SDR may name wrong suspect if grep-based; dev bisection can override — verify by checking whether src/ files were actually modified.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-22-F32: backfill_hierarchy.mjs spliceKeys inserted NEW line for exis
<!-- hash:c18ec7 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 3 sprint dir(s)
**Original entry:** `2026-05-02 · #frontmatter #idempotent #backfill · backfill_hierarchy.mjs spliceKeys inserted NEW line for existing-null keys; fix: Phase 1 in-place replace, Phase 2 insert-absent-only.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-22-F33: M-plan-spec'd integration test files are REQUIRED, not optio
<!-- hash:0df16d -->

**Category:** stale
**Reason:** stale: zero grep hits across last 3 sprint dir(s)
**Original entry:** `2026-05-02 · #qa #test-coverage #integration · M-plan-spec'd integration test files are REQUIRED, not optional — Dev must deliver them; per-hook unit tests don't cover cross-hook end-to-end flow.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-22-F34: token-ledger.sh has a copy-on-fix snapshot lock in test/snap
<!-- hash:f04670 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 3 sprint dir(s)
**Original entry:** `2026-05-02 · #snapshot #hooks · token-ledger.sh has a copy-on-fix snapshot lock in test/snapshots/ — update token-ledger.cr-NNN.sh + supersede byte-equality assertion every time the hook changes.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-22-F35: token-ledger.sh transcript-grep fallback skips ^[0-9]+ items
<!-- hash:adfa5e -->

**Category:** stale
**Reason:** stale: zero grep hits across last 3 sprint dir(s)
**Original entry:** `2026-05-02 · #hooks #ledger #banner-skip · token-ledger.sh transcript-grep fallback skips ^[0-9]+ items? blocked: prefix via BANNER_SKIP_RE — SessionStart banner stops poisoning work_item_id attribution.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-22-F36: PreToolUse:Task hook auto-writes dispatch marker by grepping
<!-- hash:21d78b -->

**Category:** stale
**Reason:** stale: zero grep hits across last 3 sprint dir(s)
**Original entry:** `2026-05-02 · #hooks #attribution #pre-tool-use-task · PreToolUse:Task hook auto-writes dispatch marker by grepping tool_input.prompt for first work-item ID; banner-immune (no transcript); uniquified filename avoids parallel-spawn collision.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-22-F37: token-ledger.sh uses newest-file lookup (ls -t .dispatch-*.j
<!-- hash:39def5 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 3 sprint dir(s)
**Original entry:** `2026-05-02 · #hooks #ledger #dispatch · token-ledger.sh uses newest-file lookup (ls -t .dispatch-*.json | head -1), not session-id-keyed — orchestrator CLAUDE_SESSION_ID never matches subagent's SubagentStop payload session_id.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-22-F38: session-start.sh snapshot locks (cr-008/cr-009) must be upda
<!-- hash:746039 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 3 sprint dir(s)
**Original entry:** `2026-05-02 · #snapshot #init-test · session-start.sh snapshot locks (cr-008/cr-009) must be updated when canonical hook content changes — init test byte-compares rendered output against lock files.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-22-F39: Dev agent's `git commit` landed on `main` instead of `story/
<!-- hash:8c121a -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-05-02 · #worktree #git #commit · Dev agent's `git commit` landed on `main` instead of `story/<id>` branch — verify post-dispatch with `git log story/<id>` not just commit-success-claim.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-22-F40: vitest maxForks cap is PER-PROCESS — N parallel agents × max
<!-- hash:560649 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-05-02 · #vitest #ram #parallel-agents · vitest maxForks cap is PER-PROCESS — N parallel agents × maxForks = total forks (e.g. cap=2 + 3-agent wave = 6 forks ≈ 2.4GB). Lower VITEST_MAX_FORKS=1 or serialize agents on tight-RAM laptops.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-22-F41: Cap forks pool via vitest.config.ts `poolOptions.forks.maxFo
<!-- hash:8c1f83 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-05-02 · #vitest #ram #pool · Cap forks pool via vitest.config.ts `poolOptions.forks.maxForks=2` — CLI flag `--pool-options.forks.maxForks=N` collides with tinypool minThreads validation when pool=forks.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-22-F42: `cleargate story start <id>` requires CLEARGATE_STATE_FILE e
<!-- hash:f33efe -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-05-01 · #cli #sprint #scripts · `cleargate story start <id>` requires CLEARGATE_STATE_FILE env — run_script.sh omits it; without it step 2 fails.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-22-F43: cleargate-cli/templates/cleargate-planning/ is DERIVED — cop
<!-- hash:c25e90 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 3 sprint dir(s)
**Original entry:** `2026-05-01 · #scaffold #mirror #prebuild · cleargate-cli/templates/cleargate-planning/ is DERIVED — copy-planning-payload.mjs rmSync+rebuilds it from cleargate-planning/ on every prebuild. Never hand-edit the cli-bundled tree; edit canonical mirror then run npm run prebuild.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-22-F44: vitest spawns 5–9 tinypool workers (~4GB each) that survive 
<!-- hash:69c9b7 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-05-01 · #vitest #leak #posttest · vitest spawns 5–9 tinypool workers (~4GB each) that survive the parent if not explicitly closed. Run `pkill -f vitest || true` after every test invocation; observed ~30GB orphan RAM after a single uncleaned run.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-22-F45: CLAUDE.md live↔canonical pre-divergent by 4 canonical-only b
<!-- hash:d42a68 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 3 sprint dir(s)
**Original entry:** `2026-05-01 · #mirror #parity · CLAUDE.md live↔canonical pre-divergent by 4 canonical-only bullets since pre-EPIC-024. Edit-parity invariant applies per-edit, not whole-file — never reconcile pre-existing divergence as a side effect.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-22-F46: `cleargate-planning/MANIFEST.json` SHAs change after every p
<!-- hash:0f1e04 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 3 sprint dir(s)
**Original entry:** `2026-05-01 · #manifest #prebuild · `cleargate-planning/MANIFEST.json` SHAs change after every protocol/template edit; regenerate via `npm run build` (or doctor's auto-regen path) in the SAME commit or doctor flags drift on next session.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-22-F47: Sprint frontmatter `start_date` is the *planned* date — for 
<!-- hash:c070f1 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-05-01 · #closeout #script #fallback · Sprint frontmatter `start_date` is the *planned* date — for closed sprints whose commits pre-date the planned start, use Strategy 3 `git log --grep "<sprint-id>"` as the reliable fallback in changed-file discovery.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-22-F48: `protocol-section-N.test.ts` files reference numeric §-IDs t
<!-- hash:efb34c -->

**Category:** stale
**Reason:** stale: zero grep hits across last 3 sprint dir(s)
**Original entry:** `2026-05-01 · #test #protocol-section #stale · `protocol-section-N.test.ts` files reference numeric §-IDs that go stale when EPIC-024-style slimming moves sections to enforcement.md. Update or archive these tests in the same wave that moves the §.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-22-F49: `cleargate wiki lint` exits 1 even for pre-existing findings
<!-- hash:f59c44 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-05-01 · #wiki-lint #baseline · `cleargate wiki lint` exits 1 even for pre-existing findings; "no regression" gates need a pre/post baseline diff so the gate fails only on NEW findings.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-22-F50: M2 citation-rewrite surface omitted `.cleargate/templates/` 
<!-- hash:201390 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-05-01 · #citation-rewrite #scope-gap · M2 citation-rewrite surface omitted `.cleargate/templates/` — surfaced post-CR-020 as `Sprint Plan Template.md` / `sprint_report.md` / `story.md` line 32+120 stale `§24`/`§20`. Always include `.cleargate/templates/` in §-grep surfaces.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-22-F51: `git worktree remove --force --force` does NOT kill detached
<!-- hash:0752a2 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-05-01 · #worktree #vitest #cleanup · `git worktree remove --force --force` does NOT kill detached vitest worker pools — they persist as orphan node processes pointing at deleted dirs (~3GB each). Run `pkill -9 -f "node.*vitest"` BEFORE removing worktrees that ran `npm test`.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-22-F52: import.meta.url in vitest source-mode resolves to src/comman
<!-- hash:17b1b6 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 3 sprint dir(s)
**Original entry:** `2026-04-30 · #cli #vitest #import-meta · import.meta.url in vitest source-mode resolves to src/commands/*.ts not dist/; try ../package.json AND ../../package.json candidates for worktree-safe version reads.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-22-F53: CLEARGATE_NO_UPDATE_CHECK=1 suppresses all checkLatestVersio
<!-- hash:afbb1f -->

**Category:** stale
**Reason:** stale: zero grep hits across last 3 sprint dir(s)
**Original entry:** `2026-04-30 · #cli #registry-check #env · CLEARGATE_NO_UPDATE_CHECK=1 suppresses all checkLatestVersion network + cache paths; hard contract once 016-01 ships.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-22-F54: worktrees share no node_modules with parent; run `npm ci --w
<!-- hash:cb754b -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-04-30 · #worktree #npm · worktrees share no node_modules with parent; run `npm ci --workspace <pkg>` before first typecheck/test in a new worktree.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-22-F55: Story bodies authored at SPRINT-N draft time freeze the pack
<!-- hash:67e7b6 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-04-30 · #cli #stories #version-drift · Story bodies authored at SPRINT-N draft time freeze the package.json version literal (e.g. STORY-016-* says `cleargate@0.8.2` but live is 0.9.0 by SPRINT-16 activation). Always read live version from package.json — story-body literals are illustrative.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-22-F56: cleargate-cli/CHANGELOG.md exists pre-EPIC-016 in non-Common
<!-- hash:02c34b -->

**Category:** stale
**Reason:** stale: zero grep hits across last 3 sprint dir(s)
**Original entry:** `2026-04-30 · #cli #changelog #format · cleargate-cli/CHANGELOG.md exists pre-EPIC-016 in non-Common-Changelog form (## 0.9.0 (date)). STORY-016-03 reformats to ## [0.9.0] — date AND backfills priors; format-test regex /^## \[(\d+\.\d+\.\d+)\] — \d{4}-\d{2}-\d{2}/m fails the existing file as-is.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-22-F57: MCP tool requests must NOT carry project_id in the body — JW
<!-- hash:a2932f -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-04-30 · #mcp #cli #wire-format · MCP tool requests must NOT carry project_id in the body — JWT claims supply ctx.project_id (transport.ts:48); spec drift in EPIC-023 §2.3 flagged. Both sides drop the field.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-22-F58: CLI sha = sha256(body + serializeFrontmatter(fm)) where seri
<!-- hash:aa1c13 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-04-30 · #mcp #frontmatter #serialization · CLI sha = sha256(body + serializeFrontmatter(fm)) where serializer uses CORE_SCHEMA + lineWidth -1 + ---/--- framing (frontmatter-yaml.ts:17). Server reimplementation MUST be byte-identical — yaml.dump default options (sortKeys, no schema, no framing) produce different bytes; sha mismatch makes every sync dirty.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-22-F59: cleargate-cli/src/commands/sync.ts already exists (718 LOC, 
<!-- hash:0fcb8f -->

**Category:** stale
**Reason:** stale: zero grep hits across last 3 sprint dir(s)
**Original entry:** `2026-04-30 · #cli #commander #naming-collision · cleargate-cli/src/commands/sync.ts already exists (718 LOC, STORY-010-04 pull/merge/push driver) and cleargate sync is registered. New work-item sync command MUST be a subcommand or scoped flag — never a same-file rewrite. Architect must grep commands/ before approving any story that names a new command file.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-22-F60: wiki build reads children: from raw EPIC/SPRINT files (not i
<!-- hash:4d93b6 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-04-30 · #wiki #backlink #children · wiki build reads children: from raw EPIC/SPRINT files (not inferred from child parent_epic_ref) — broken-backlinks require adding children: arrays to every raw EPIC file, not just EPIC-013/-014.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-22-F61: BUG-018 missed the no-force-skip branch; every skip branch t
<!-- hash:95a4c1 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-04-30 · #init #hooks #exec-bit · BUG-018 missed the no-force-skip branch; every skip branch that may encounter an existing file must also re-assert chmodSync(0o755) if needsExec — not just the identical-content branch.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-22-F62: token-ledger.sh role-grep loop is hard-coded at line 172; ne
<!-- hash:076cff -->

**Category:** stale
**Reason:** stale: zero grep hits across last 3 sprint dir(s)
**Original entry:** `2026-04-30 · #wiki #ledger #role-attribution · token-ledger.sh role-grep loop is hard-coded at line 172; new subagent roles (e.g. cleargate-wiki-contradict) must be added there or tokens land as "unknown".`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-22-F63: Phase 4 split: TS = deterministic prep (status filter, SHA i
<!-- hash:8b243c -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-04-30 · #wiki #ingest #phase4-split · Phase 4 split: TS = deterministic prep (status filter, SHA idem, neighborhood, prompt) + commit (log append, sha stamp); agent .md = LLM spawn via Task; no Node-side Task API.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-22-F64: assert_story_files.mjs covers all six id shapes (STORY/CR/BU
<!-- hash:949850 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 3 sprint dir(s)
**Original entry:** `2026-04-27 · #sprint-init #regex #v2-gate · assert_story_files.mjs covers all six id shapes (STORY/CR/BUG/EPIC/PROPOSAL/PROP/HOTFIX); v2 hard-blocks on missing|unapproved|stub-empty; v1 warns-only.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-22-F65: update_state.mjs has no module guard — `import { fn } from '
<!-- hash:6a8af4 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 3 sprint dir(s)
**Original entry:** `2026-04-27 · #mjs #module-guard #import · update_state.mjs has no module guard — `import { fn } from './update_state.mjs'` triggers its main() at import time; inline the fn instead of importing.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-22-F66: In bash hook, `DOCTOR_EXIT=$?` after `$(cmd || true)` always
<!-- hash:5af18e -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-04-26 · #hooks #bash #exit-capture · In bash hook, `DOCTOR_EXIT=$?` after `$(cmd || true)` always returns 0 — use a tmpfile: `cmd > tmpfile; EXIT=$?; OUT=$(cat tmpfile); rm tmpfile` to capture both output and exit code independently.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-22-F67: Hook resolver tail-branch must never be `exit 0` — use `npx 
<!-- hash:330eae -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-04-26 · #hooks #resolver #cr-009 · Hook resolver tail-branch must never be `exit 0` — use `npx -y "@cleargate/cli@<PIN>"` as the working fallback; silent no-op = invisible failure.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-22-F68: readline.createInterface buffers ahead — when two readline i
<!-- hash:2c1efc -->

**Category:** stale
**Reason:** stale: zero grep hits across last 3 sprint dir(s)
**Original entry:** `2026-04-25 · #cli #readline #vitest · readline.createInterface buffers ahead — when two readline interfaces read sequentially from the same Readable, the first consumes more data than the first line; use PassThrough with lazy writes (setTimeout 5ms on resume) or a shared single interface for multi-prompt flows.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-22-F69: `identity_proofs.challenge_payload` jsonb is provider-privat
<!-- hash:6cc59b -->

**Category:** stale
**Reason:** stale: zero grep hits across last 3 sprint dir(s)
**Original entry:** `2026-04-25 · #identity-provider #plaintext-redact · `identity_proofs.challenge_payload` jsonb is provider-private (per provider.ts:7-8 doc); storing the GitHub device_code OR Resend OTP plaintext in payload is allowed and necessary. The plaintext-redact rule covers logs, clientHints, and route response bodies — NOT the jsonb payload column. Don't double-hash device_code thinking the column is logged.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-22-F70: mcp/.env.example documents env vars (e.g. CLEARGATE_RESEND_*
<!-- hash:98add2 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 3 sprint dir(s)
**Original entry:** `2026-04-25 · #config #env-schema #drift · mcp/.env.example documents env vars (e.g. CLEARGATE_RESEND_*) but mcp/src/config.ts envSchema is the actual contract — vars not in the Zod schema are silently dropped by loadConfig(). Always grep both files when adding a new env var; the .env.example alone is dead documentation.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-22-F71: worktree npm ci needed for typecheck — node_modules not shar
<!-- hash:20ab4e -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-04-24 · #wiki #index #worktree · worktree npm ci needed for typecheck — node_modules not shared with parent worktree; run `npm ci --workspace <pkg>` from worktree root before first typecheck.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-22-F72: Rule C fix (sprint→Completed) on pending-sync sprints create
<!-- hash:511450 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-04-24 · #audit-status #convergence · Rule C fix (sprint→Completed) on pending-sync sprints creates a new Rule B violation; E2E convergence tests must use only Rule A items or archive-resident sprints to guarantee exit-0 second run.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-22-F73: wiki command tests live at `cleargate-cli/test/wiki/<cmd>.te
<!-- hash:61fc66 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-04-24 · #test-location #wiki #cli · wiki command tests live at `cleargate-cli/test/wiki/<cmd>.test.ts` (per-capability dir), NOT `test/commands/wiki-<cmd>.test.ts` — story bodies citing the commands/ path are wrong; co-locate new wiki tests alongside `build.test.ts` + `_fixture.ts`.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-22-F74: sprint/epic/proposal discrimination is via filename prefix t
<!-- hash:6a5501 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 3 sprint dir(s)
**Original entry:** `2026-04-24 · #wiki #bucket-inference · sprint/epic/proposal discrimination is via filename prefix through deriveBucket() (scan.ts:60), NOT frontmatter keys; existing fixture helpers use `story_id` even for sprint/epic files (test/wiki/_fixture.ts:55-100) — classify via `item.bucket`.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-22-F75: vitest JSON via --outputFile beats stdout parsing — subproce
<!-- hash:32006b -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-04-21 · #vitest #json #ci · vitest JSON via --outputFile beats stdout parsing — subprocess tests contaminate stdout; write to file then read atomically.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-22-F76: `cleargate sprint close` CLI handler doesn't pass through `-
<!-- hash:893004 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-04-21 · #cli #sprint-close #assume-ack · `cleargate sprint close` CLI handler doesn't pass through `--assume-ack` to `close_sprint.mjs` — the flag exists on the script (flips state to Completed + runs suggest_improvements), but the CLI wrapper exits at Step 4 "waiting for Reporter". Orchestrator must invoke `run_script.sh close_sprint.mjs <id> --assume-ack` directly post-Reporter. Wire the flag through the CLI option in commands/sprint.ts.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-22-F77: `cleargate state update <STORY> <state>` with no --sprint co
<!-- hash:9b3934 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-04-21 · #cli #state-update #execution-mode · `cleargate state update <STORY> <state>` with no --sprint context defaults to v1-inert (handler uses SPRINT-UNKNOWN fallback). Add a --sprint flag or read .active sentinel; orchestrator must invoke via `run_script.sh update_state.mjs` directly in v2 runs until fixed.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-22-F78: close_sprint/suggest_improvements/prefill_report resolve spr
<!-- hash:bb43b2 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 3 sprint dir(s)
**Original entry:** `2026-04-21 · #test-harness #scripts #env · close_sprint/suggest_improvements/prefill_report resolve sprint dir from REPO_ROOT by default; add CLEARGATE_SPRINT_DIR env override for test isolation.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-22-F79: stories drafted before a prior sprint's protocol edits go st
<!-- hash:27a248 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-04-21 · #protocol #section-numbering · stories drafted before a prior sprint's protocol edits go stale — §§ they cite (e.g. 'append §10') may already be occupied. Architect MUST audit actual current numbering before planning; use next free § after last-shipped section.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-22-F80: Admin Dockerfile must force ENV NODE_ENV=development in buil
<!-- hash:74cbf0 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-04-19 · #dockerfile #coolify #monorepo · Admin Dockerfile must force ENV NODE_ENV=development in builder stage; Coolify injects NODE_ENV=production at build time, silently stripping devDeps and breaking vite build.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-22-F81: status-of([[ID]]) requires a literal ID — cannot dynamically
<!-- hash:549fdc -->

**Category:** stale
**Reason:** stale: zero grep hits across last 3 sprint dir(s)
**Original entry:** `2026-04-19 · #gates #predicate · status-of([[ID]]) requires a literal ID — cannot dynamically ref story's parent_epic_ref; use frontmatter(.).parent_epic_ref != null as a proxy for "parent set" in story gate; 008-02 evaluator must handle this constraint.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-22-F82: [R] superseded-by BUG-001-fix · parseFrontmatter must use js
<!-- hash:dc7a29 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-04-19 · #yaml #frontmatter · [R] superseded-by BUG-001-fix · parseFrontmatter must use js-yaml CORE_SCHEMA — hand-rolled parser flattened indented maps to top-level keys and stringified null/bool; roundtrip is now lossless and draft_tokens/cached_gate_result are native nested objects on disk.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-22-F83: parallel Developer agents on main share a working tree — one
<!-- hash:dc0a3c -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-04-19 · #concurrency #agents #shared-main · parallel Developer agents on main share a working tree — one's uncommitted edits are transiently visible to another's `npm test` (001-05 only passed because 008-02's parse-frontmatter change landed first). Bias worktree isolation or serialize shared-file stories.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-22-F84: [R] superseded-by BUG-001-fix · parseFrontmatter stores nest
<!-- hash:5d3cad -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-04-19 · #wiki #lint #yaml · [R] superseded-by BUG-001-fix · parseFrontmatter stores nested YAML as opaque string when value starts with `{`; lint checks reading cached_gate_result must call yaml.load() on that string — block-YAML form in test fixtures will NOT parse correctly.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-22-F85: init.ts has its own HOOK_ADDITION constant (SPRINT-04 legacy
<!-- hash:5771d2 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 3 sprint dir(s)
**Original entry:** `2026-04-19 · #hooks #init #settings · init.ts has its own HOOK_ADDITION constant (SPRINT-04 legacy); when scaffold settings.json is updated, init.ts must also be updated or tests fail with 2 PostToolUse inner-hooks.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-22-F86: ManifestEntry.overwrite_policy uses 'skip' not 'never'; stor
<!-- hash:4a7b7d -->

**Category:** stale
**Reason:** stale: zero grep hits across last 3 sprint dir(s)
**Original entry:** `2026-04-19 · #schema #manifest #upgrade · ManifestEntry.overwrite_policy uses 'skip' not 'never'; story/plan prose says "never-policy" but the TS type is 'always'|'merge-3way'|'skip'|'preserve'.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-22-F87: gate check infers transition from cached_gate_result.pass: n
<!-- hash:92b4d1 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-04-19 · #cli #gate #transition-inference · gate check infers transition from cached_gate_result.pass: no cache or fail → first transition; pass + multi-transition (Epic) → next. Single-transition types always return their only transition regardless of pass state.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-22-F88: readiness-gates.md fenced yaml blocks are YAML lists (- work
<!-- hash:c45bf0 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 3 sprint dir(s)
**Original entry:** `2026-04-19 · #gates #predicate #yaml · readiness-gates.md fenced yaml blocks are YAML lists (- work_item_type: ...); yaml.load() returns array — unwrap [0] to get the gate object.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-22-F89: section evaluator split on /^(?=## )/m: if body starts with 
<!-- hash:70a9e2 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-04-19 · #gates #predicate #section · section evaluator split on /^(?=## )/m: if body starts with ##, rawParts[0]=section-1 (no preamble offset); detect hasPreamble before indexing.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-22-F90: token-ledger.sh routes via `ls -td sprint-runs/*/` and tags 
<!-- hash:f25585 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 3 sprint dir(s)
**Original entry:** `2026-04-19 · #reporting #hooks #ledger · token-ledger.sh routes via `ls -td sprint-runs/*/` and tags `story_id` from the FIRST `STORY-NNN-NN` it greps in the orchestrator transcript — SPRINT-04 rows landed in `SPRINT-03/token-ledger.jsonl` tagged `STORY-006-01`. Reporter cannot compute per-agent / per-story cost. Fix before next sprint (sentinel file or per-prompt header).`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-22-F91: CLAUDE.md bounded-block regex must be GREEDY (`[\s\S]*` not 
<!-- hash:c5c953 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 3 sprint dir(s)
**Original entry:** `2026-04-19 · #init #inject-claude-md #regex · CLAUDE.md bounded-block regex must be GREEDY (`[\s\S]*` not `[\s\S]*?`): the block body itself references both markers in prose (line 37 says "OUTSIDE this <!-- CLEARGATE:START -->...<!-- CLEARGATE:END --> block"), so non-greedy stops at the inline END before the real one.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-22-F92: tsup single-bundle: all source modules' `import.meta.url` co
<!-- hash:f2b099 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 3 sprint dir(s)
**Original entry:** `2026-04-19 · #tsup #bundle #import-meta · tsup single-bundle: all source modules' `import.meta.url` collapse to the bundle file (dist/cli.js); `resolveDefaultTemplateDir` must go 1 level UP from dist/ not 3 levels from src/wiki/synthesis/; always thread a `templateDir` test seam so tests bypass default resolution.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-22-F93: open-gates.ts filter `status.includes('🔴')` matches zero it
<!-- hash:5677bc -->

**Category:** stale
**Reason:** stale: zero grep hits across last 3 sprint dir(s)
**Original entry:** `2026-04-19 · #wiki #synthesis #corpus-shape · open-gates.ts filter `status.includes('🔴')` matches zero items in real corpus (statuses are textual `Draft`/`Ready`/`Active`); always validate synthesis filters against actual delivery/ data, not synthetic fixtures.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-22-F94: tsup does NOT copy non-TS assets to dist/ by default; bundle
<!-- hash:75ee03 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 3 sprint dir(s)
**Original entry:** `2026-04-19 · #tsup #npm-publish #assets · tsup does NOT copy non-TS assets to dist/ by default; bundle via `prebuild` script + add asset dir to package.json `files[]`. `import.meta.url` resolution must thread a `templateDir` test seam to work in dev (src/) and published (dist/) layouts.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-22-F95: When story body and subagent def disagree on a CLI flag (e.g
<!-- hash:5092e6 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-04-19 · #wiki #cli #subagent-contract · When story body and subagent def disagree on a CLI flag (e.g. STORY-002-08's `--rebuild` vs read-only cleargate-wiki-lint def), the subagent contract wins; flag the story-body conflict as an open decision rather than implementing both.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-22-F96: Wiki commands (build/ingest) need a `now` test seam to freez
<!-- hash:32caf7 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-04-19 · #cli #determinism #test-seam · Wiki commands (build/ingest) need a `now` test seam to freeze `last_ingest:` ISO timestamps; without it the byte-identical-rerun idempotency proof is flaky.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-22-F97: Wiki subagent defs MUST embed exact YAML page-schema templat
<!-- hash:706237 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-04-19 · #wiki #cost #subagent · Wiki subagent defs MUST embed exact YAML page-schema template inline; haiku/sonnet drift on field names if §10.4 is referenced by prose only — paste the literal frontmatter block in the def.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-22-F98: Claude Code hooks schema: PostToolUse uses nested `hooks[]` 
<!-- hash:4eb224 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-04-19 · #hooks #protocol · Claude Code hooks schema: PostToolUse uses nested `hooks[]` with `type:"command"` + `if:"Edit(<glob>)"`; no `pathPattern` field and no `$CLAUDE_TOOL_FILE_PATH` env — file path is on stdin at `.tool_input.file_path`.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-22-F99: `cleargate join` UUID-first-check pattern: test UUID_V4_RE b
<!-- hash:edbc2e -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-04-18 · #cli #url-parsing #join · `cleargate join` UUID-first-check pattern: test UUID_V4_RE before `new URL()` — bare UUID triggers `new URL()` ERR_INVALID_URL; full-URL base is url.origin not config (but don't persist it).`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-22-F100: For malformed-UUID path params, validate with regex before D
<!-- hash:f85168 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-04-18 · #fastify #postgres #uuid · For malformed-UUID path params, validate with regex before DB call; catching pg error 22P02 from drizzle execute is brittle — the code property may be nested and cause a 500 instead of 404.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-22-F101: vi.mock() is hoisted to top of file; variables used in facto
<!-- hash:b1fd68 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 3 sprint dir(s)
**Original entry:** `2026-04-18 · #cli #vitest #vi-mock-hoisting · vi.mock() is hoisted to top of file; variables used in factory must be declared via vi.hoisted() or you get "Cannot access before initialization" at runtime.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-22-F102: When vendoring response schemas in a CLI from a server's han
<!-- hash:4d4efa -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-04-18 · #zod #drift-detection · When vendoring response schemas in a CLI from a server's hand-authored OpenAPI snapshot, add a snapshot-drift unit test that reads the snapshot file at runtime and asserts schema field-set equality. Vitest snapshot files use JS syntax with trailing commas — strip before JSON.parse.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-22-F103: Admin JWT file ~/.cleargate/admin-auth.json is a single-toke
<!-- hash:3be8f5 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-04-18 · #admin-jwt #file-shape · Admin JWT file ~/.cleargate/admin-auth.json is a single-token shape {version,token}, NOT a profile-map TokenStore — distinct security/UX domains.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-22-F104: vi.mock('@napi-rs/keyring') replaces module before native bi
<!-- hash:92a0bf -->

**Category:** stale
**Reason:** stale: zero grep hits across last 3 sprint dir(s)
**Original entry:** `2026-04-18 · #vitest #vi-mock #native-modules · vi.mock('@napi-rs/keyring') replaces module before native binary loads; required for testing native deps on libsecret-less CI.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-22-F105: @napi-rs/keyring Entry.getPassword() returns string | null (
<!-- hash:683f9f -->

**Category:** stale
**Reason:** stale: zero grep hits across last 3 sprint dir(s)
**Original entry:** `2026-04-18 · #keyring #napi #api-mismatch · @napi-rs/keyring Entry.getPassword() returns string | null (not throws NoEntry); handle both null return AND catch for robustness.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-22-F106: fs.writeFile(path, data, {mode}) only sets mode on creation;
<!-- hash:183c0d -->

**Category:** stale
**Reason:** stale: zero grep hits across last 3 sprint dir(s)
**Original entry:** `2026-04-18 · #keyring #napi #posix-modes · fs.writeFile(path, data, {mode}) only sets mode on creation; call fs.chmod explicitly after every security-sensitive write.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---
