# Improvement Suggestions — SPRINT-33


## Trends

Trends: 20 closed sprints visible — full analysis deferred to CR-027.

## Skill Creation Candidates

<!-- generated-by: suggest_improvements.mjs --skill-candidates -->

### CAND-SPRINT-33-S01: M3 × architect
<!-- hash:665dd2 -->

**Pattern detected:** M3 × architect repeated ≥3× across ≥2 distinct sprints (SPRINT-21, SPRINT-27, SPRINT-33)
**Proposed skill:** `.claude/skills/<slug>/SKILL.md`

---

## FLASHCARD Cleanup Candidates

<!-- generated-by: suggest_improvements.mjs --flashcard-cleanup -->

### CAND-SPRINT-33-F01: write_dispatch.sh guard FIXED (043-09 re-verify): skip requi
<!-- hash:52d742 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 2 sprint dir(s)
**Original entry:** `2026-06-01 · #dispatch #marker #write_dispatch · write_dispatch.sh guard FIXED (043-09 re-verify): skip requires exact tuple work_item_id==$1 AND agent_type==$2 AND session_id==CLAUDE_SESSION_ID AND writer prefix pre-tool-use-task.sh*; else WRITE. Fails toward writing on jq-fail/malformed/empty/non-auto-writer. Same work_item+agent re-dispatch still de-dups (tuple-keyed ledger attribution preserved). [SPRINT-33 043-09 PASS]`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-33-F02: write_dispatch.sh fallback guard (043-09) matches ANY uncons
<!-- hash:035df6 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 2 sprint dir(s)
**Original entry:** `2026-06-01 · #dispatch #marker #write_dispatch · write_dispatch.sh fallback guard (043-09) matches ANY unconsumed same-session pre-tool-use-task.sh marker — NOT the current spawn; a stale prior-spawn auto-marker (Stop hook not yet fired / parallel-wave / mv-race leftover) false-skips, leaving the CURRENT manual-fallback spawn with NO marker. session_id is stable per orchestrator session so it cannot disambiguate spawns. [SPRINT-33 043-09 postflight FAIL]`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-33-F03: tsx-run tests stay GREEN on a stale dist/cli.js — a synthesi
<!-- hash:1db46f -->

**Category:** stale
**Reason:** stale: zero grep hits across last 2 sprint dir(s)
**Original entry:** `2026-06-01 · #wiki #synthesis #dist · tsx-run tests stay GREEN on a stale dist/cli.js — a synthesis-map (or any wiki-CLI runtime) fix is NOT live until `npm run build` refreshes dist; verify dist mtime ≥ source mtime at Gate 4. [SPRINT-33 043-07 re-verify]`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-33-F04: pre-tool-use-task.sh auto-marker and write_dispatch.sh both 
<!-- hash:19d5fe -->

**Category:** stale
**Reason:** stale: zero grep hits across last 2 sprint dir(s)
**Original entry:** `2026-06-01 · #dispatch #marker #write_dispatch · pre-tool-use-task.sh auto-marker and write_dispatch.sh both write `.dispatch-<ts>-<pid>-<rand>.json` but are distinguishable by the `writer` field (`pre-tool-use-task.sh@...` vs `write_dispatch.sh@...`); a fallback-only guard detects the auto-marker by `writer` prefix + same session_id, NOT by filename. [SPRINT-33 043-09 SDR]`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-33-F05: architect.md has NO standalone post-flight section — the pos
<!-- hash:d6cde3 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 2 sprint dir(s)
**Original entry:** `2026-06-01 · #architect-md #post-flight · architect.md has NO standalone post-flight section — the post-flight contract lives ONLY in SKILL.md §C.6; the sole architect.md reference is the "What you are NOT" line ("post-flight is QA's job", :218). 043-08 must ADD a post-flight block, not edit one. [SPRINT-33 043-08 SDR]`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-33-F06: close_sprint.mjs Step 2.5 'Check required §5 sections' comme
<!-- hash:f36399 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 2 sprint dir(s)
**Original entry:** `2026-06-01 · #close-pipeline #section-numbering · close_sprint.mjs Step 2.5 'Check required §5 sections' comment + '§5 missing' error label are STALE — Lane/Hotfix-Audit moved to §6 (Framework Self-Assessment) in sprint_report v2; validation regexes are content-based (/Lane Audit/ etc) so they still match anywhere, label-only drift. [SPRINT-33 043-05]`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-33-F07: canonical→live propagation is canonical→(npm run prebuild re
<!-- hash:2c0dd2 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 2 sprint dir(s)
**Original entry:** `2026-06-01 · #dogfood #scaffold #sync-order · canonical→live propagation is canonical→(npm run prebuild regenerates payload)→(cleargate init rewrites live from PAYLOAD); init before prebuild re-syncs live from STALE payload (BUG-024 class). Always prebuild THEN init. [SPRINT-33 043-01 postflight]`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-33-F08: A reverse bucket→synthesis-page map MUST derive from EVERY f
<!-- hash:ef262b -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-06-01 · #wiki #synthesis #parity · A reverse bucket→synthesis-page map MUST derive from EVERY filter branch of each compiler, not the first — bucket-UNFILTERED branches (open-gates Gate 3 `status==Ready`; product-state shippedItems) make EVERY bucket map-eligible. Under-mapping → stale synthesis page on that bucket's edit. [SPRINT-33 043-07]`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-33-F09: A byte-parity-vs-full-rebuild test only proves parity for th
<!-- hash:f3493a -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-06-01 · #wiki #test-design #parity · A byte-parity-vs-full-rebuild test only proves parity for the buckets/statuses its fixtures exercise — use STEADY-STATE edits (full build, then edit an existing item) that trigger EACH gate of every multi-filter compiler; initial-ingest fixtures hit the bootstrap-write-all path and mask under-map bugs. [SPRINT-33 043-07]`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-33-F10: cleargate-cli test glob is `test/**/*.node.test.ts` — a red/
<!-- hash:a583a7 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-06-01 · #test-glob #cli · cleargate-cli test glob is `test/**/*.node.test.ts` — a red/unit test placed under `src/` is silently SKIPPED (never runs). Author tests under `test/`. [SPRINT-33 043-07]`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-33-F11: evalSection is POSITIONAL (1-indexed, ignores numeric headin
<!-- hash:cbae26 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 2 sprint dir(s)
**Original entry:** `2026-06-01 · #gates #predicate #section · evalSection is POSITIONAL (1-indexed, ignores numeric heading prefixes). A leading `## 0.5 Open Questions` shifts every `section(N)` by one — verify gate-block indices against the template's H2 ORDER, not its printed numbers. (hotfix gate needed section(2/3/4), not 1/2/3.) [SPRINT-33 043-04]`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-33-F12: readiness-gates.md block count is hardcoded in TWO test file
<!-- hash:ec1b7d -->

**Category:** stale
**Reason:** stale: zero grep hits across last 2 sprint dir(s)
**Original entry:** `2026-06-01 · #gates #test #regression · readiness-gates.md block count is hardcoded in TWO test files (gate-unit.node.test.ts + readiness-predicates.node.test.ts), both reading the LIVE repo-root file; a SEPARATE transitions-count guard (==N types) lives in work-item-type.node.test.ts. Adding a gate block bumps the TWO block guards; adding a type bumps the transitions guard. grep ALL test/ for the count, not the first hit. [SPRINT-33 043-04]`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-33-F13: For a count assertion that goes stale on expansion, prefer `
<!-- hash:cb17bc -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-06-01 · #test-design #regression-guard · For a count assertion that goes stale on expansion, prefer `==N` (exact) over `>=N-1` (floor) — a floor guard silently allows over-registration. [SPRINT-33 043-04]`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-33-F14: readiness-gates.md has TWO independent count guards: WORK_IT
<!-- hash:a98426 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 2 sprint dir(s)
**Original entry:** `2026-06-01 · #gates #test · readiness-gates.md has TWO independent count guards: WORK_ITEM_TRANSITIONS keys (==8 types, work-item-type.node.test.ts) AND the yaml-block count (gate-unit.node.test.ts:748, ==N blocks); adding any new gate block bumps the SECOND not the first — both must be updated. [SPRINT-33 043-04]`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-33-F15: `gate check` non-verbose prints ONLY the `✅ <type>.<transiti
<!-- hash:95a490 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-06-01 · #gate #test-harness · `gate check` non-verbose prints ONLY the `✅ <type>.<transition> passed` summary + `❌` failing-predicate lines (per-criterion detail is `-v` only, gate.ts:288/298). Grepping for a PASSING predicate name never matches — assert pass via ABSENCE of `❌ <predicate-id>`, or use `-v`. [SPRINT-33 043-03]`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-33-F16: evalSection (readiness-predicates.ts) splits body on `^## ` 
<!-- hash:8e9b18 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 2 sprint dir(s)
**Original entry:** `2026-06-01 · #gate #template · evalSection (readiness-predicates.ts) splits body on `^## ` only — H3 (`### `) headings create NO section index. Demote a leading `## Open Questions` to `### ` to fix a positional `section(N)` off-by-one without moving content. [SPRINT-33 043-03]`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-33-F17: open-gates.ts Gate 3 has NO bucket filter (any item status==
<!-- hash:b2bf7c -->

**Category:** stale
**Reason:** stale: zero grep hits across last 2 sprint dir(s)
**Original entry:** `2026-06-01 · #wiki #synthesis #parity · open-gates.ts Gate 3 has NO bucket filter (any item status==Ready + empty remote_id) and Gate 2 reads `stories`; product-state.ts shippedItems is unfiltered. A bucket→synthesis reverse map MUST cover EVERY filter in each compiler, not just the first — under-mapping = stale page on that bucket's edit. [SPRINT-33 043-07 postflight]`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-33-F18: a byte-parity test only proves parity for the buckets/status
<!-- hash:9b5aa1 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-06-01 · #wiki #synthesis #test-design · a byte-parity test only proves parity for the buckets/statuses its FIXTURE exercises; a corpus with no Ready-non-proposal item + no elevated-ambiguity story can't catch open-gates under-mapping. Parity fixtures must trigger EACH gate of every multi-filter compiler. [SPRINT-33 043-07 postflight]`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---
