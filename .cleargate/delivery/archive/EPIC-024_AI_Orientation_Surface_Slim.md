---
epic_id: EPIC-024
parent_cleargate_id: null
sprint_cleargate_id: null
carry_over: false
status: Done
approved: true
approved_at: 2026-05-01T00:00:00Z
approved_by: sandrinio
ambiguity: 🟢 Low
context_source: "Conversation 2026-04-30 — Gate 1 waived per saved-memory pattern 'Proposal gate waivable by direct approval'. User explicitly approved three concrete proposals (A: Architect plan slim; B: protocol split; C: CLAUDE.md gap-fill) with sharp intent and inline file/line references. Trigger conversation: comparison of V-Bounce vs ClearGate planning surface revealed (a) CLAUDE.md silent on 4 high-leverage rules — Architect's two modes, execution_mode v1/v2 toggle, CR-017 boundary gates, CR-019 close-ack — (b) cleargate-protocol.md at 1088 lines burns ~3k tokens of context for enforcement detail the conversational AI will never reason about during normal triage, (c) per-milestone Architect plan (SPRINT-15/plans/M1.md = 219 lines) duplicates Story §3.1 file-surface table instead of focusing on the unique cross-story risk + live-code gotcha layer. Verbatim user approval: 'sounds good to me'. §6 ambiguity loop resolved 2026-04-30 — all 8 questions answered."
proposal_gate_waiver:
  approved_by: sandrinio
  approved_at: 2026-04-30T18:00:00Z
  reason: Direct approval pattern — sharp intent + inline file/line references in trigger conversation; user said 'sounds good to me' to three concrete proposals. Per saved-memory 'Proposal gate waivable by direct approval'.
owner: sandrinio
target_date: SPRINT-17
created_at: 2026-04-30T00:00:00Z
updated_at: 2026-04-30T18:00:00Z
created_at_version: cleargate@0.9.0
updated_at_version: cleargate@0.9.0
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-05-01T06:05:18Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id EPIC-024
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-05-01T06:04:44Z
  sessions: []
sprint_cleargate_id: "SPRINT-15"
---

# EPIC-024: AI Orientation Surface Slim

## 0. AI Coding Agent Handoff

```xml
<agent_context>
  <objective>Make four currently-implicit ClearGate rules explicit in CLAUDE.md, split cleargate-protocol.md into "AI reads" + "hooks enforce" files with full citation rewrite (no stub redirects), and remove Story §3.1 duplication from per-milestone Architect plans — without changing any gate semantic, CLI surface, or four-agent loop contract.</objective>
  <architecture_rules>
    <rule>Preserve every existing gate semantic: Gate 1 (proposal approval), Gate 2 (ambiguity 🔴→🟢), Gate 3 (push approved+confirmed), Gate 3.5 (sprint close ack). No mechanical changes — only document split, full citation rewrite, CLAUDE.md surfacing, and Architect plan template edit.</rule>
    <rule>Preserve four-agent loop and existing v1/v2 enforcement. The execution_mode flag's behaviour is unchanged; only its *visibility* in CLAUDE.md changes.</rule>
    <rule>Mirror parity invariant — every edit to .claude/agents/* and .cleargate/knowledge/* MUST also edit cleargate-planning/.claude/agents/* and cleargate-planning/.cleargate/knowledge/* identically (FLASHCARD 2026-04-19 #wiki #protocol #mirror). Post-edit diff returns empty.</rule>
    <rule>Full citation rewrite — every §-citation to a moved section (§§1-20, 22-27) across all live + archived surfaces (~92 occurrences) is rewritten to point at cleargate-enforcement.md §&lt;M&gt;. No stub redirects remain in cleargate-enforcement.md. One-time §11.4 archive-immutability carve-out applies: citation §-substitutions only; no frontmatter timestamp updates and no other body changes to archived files.</rule>
    <rule>No content deletion during the split — only relocation + citation rewrite. The text of every moved § is byte-identical at its new location, modulo cross-reference updates.</rule>
    <rule>Architect milestone plan size is scope-driven, not capped. The reform is: drop the per-story Files-to-create / Files-to-modify subsections (Developer reads Story §3.1 directly); keep ordering, cross-story risks, code-anchored gotchas, executable test scenarios, reuse map. Plan length follows what the milestone requires.</rule>
  </architecture_rules>
  <target_files>
    <file path=".claude/agents/architect.md" action="modify" reason="Rewrite Workflow step 4 plan template: drop per-story Files-to-create/Files-to-modify subsections; keep Order, Cross-story coupling, Gotchas (file:line), Test scenarios, Reuse, Cross-story risks, Open decisions. No size cap." />
    <file path="cleargate-planning/.claude/agents/architect.md" action="modify" reason="Canonical mirror — identical edit." />
    <file path=".cleargate/knowledge/cleargate-enforcement.md" action="modify" reason="Slim to ~400 lines: keep §§1-14 (role, triage, hierarchy, gates, delivery, MCP tools, scope, planning, decision ref, wiki, metadata, token gates, scaffold, sync) + §21 (status vocab). Sections §§1-20, §§7-27 are removed entirely from this file (no stub redirects)." />
    <file path=".cleargate/knowledge/cleargate-enforcement.md" action="create" reason="NEW file — receives §§1-20, §§7-27 (worktrees, walkthrough, mid-sprint CR, flashcard gate, execution mode, file-surface, push gates, doctor codes, lane routing, lifecycle reconciler, decomp gate, close ack). Top-of-file index lists each section's source §N from the original protocol for git-blame continuity. Hooks reference this file; AI reads it only when a CLI hook surfaces an error." />
    <file path="cleargate-planning/.cleargate/knowledge/cleargate-protocol.md" action="modify" reason="Canonical mirror — identical slim." />
    <file path="cleargate-planning/.cleargate/knowledge/cleargate-enforcement.md" action="create" reason="Canonical mirror — identical new file." />
    <file path="CLAUDE.md" action="modify" reason="Add 4-bullet block to CLEARGATE section: (1) execution_mode v1/v2 read-rule, (2) Architect runs twice per sprint (Sprint Design Review + per-milestone), (3) CR-017 boundary gates (decomp at init, lifecycle at close), (4) CR-019 close-ack rule. Update session-start read order to reference enforcement.md as fourth-tier (read only when a CLI hook surfaces an error)." />
    <file path="cleargate-planning/CLAUDE.md" action="modify" reason="Canonical mirror — identical edit." />
    <file path="<all surfaces with §-citations to moved sections>" action="modify" reason="Full citation rewrite across .cleargate/delivery/{archive,pending-sync}/, .claude/agents/, cleargate-planning/.claude/agents/, CLAUDE.md, cleargate-planning/CLAUDE.md, .cleargate/wiki/. Approximately 92 occurrences of `§(15|16|17|18|19|20|22|23|24|25|26|27)` to rewrite. Citation §-substitutions only; archived files take no other body or frontmatter changes (§11.4 carve-out)." />
  </target_files>
</agent_context>
```

## 1. Problem & Value

**Why are we doing this?**

A new AI agent landing in this repo today pays a ~5k-token orientation cost: 135 lines of CLAUDE.md + 1088 lines of `cleargate-protocol.md` + scattered agent definitions read reactively when a hook trips. Three quality issues compound the cost:

1. **CLAUDE.md is silent on four load-bearing rules.** `execution_mode: v1|v2` (master switch for half the protocol), Architect's two distinct spawn modes (Sprint Design Review + per-milestone plan), CR-017 boundary gates (lifecycle reconciler + decomposition gate), and CR-019 close-ack rule all live in protocol or agent-definition files — discovered at run-time, often the hard way (CR-019 itself originated from an orchestrator violation that wouldn't have happened if the rule had been in CLAUDE.md).
2. **`cleargate-enforcement.md` mixes "AI reads" rules with "hook enforces" spec.** Sections §§1-20, §§7-27 are operational enforcement detail — file-surface diff mechanics, hash-marker conventions, doctor exit codes, lane-routing rubrics, gate-mode tables. The conversational AI never reasons about them during normal triage; CLI hooks invoke them. Loading them into AI context every session is pure waste.
3. **Per-milestone Architect plans duplicate Story §3.1.** SPRINT-15/plans/M1.md is 219 lines. The unique-value layer (cross-story risks, live-code gotchas, executable test scenarios, reuse map) is buried under restated Files-to-create / Files-to-modify tables that the Developer agent reads directly from the Story file anyway. Plan size itself is not the issue — duplication is.

**Success Metrics (North Star):**

- **Orientation token cost (aspirational)** — measured at sprint close as `wc -c CLAUDE.md` + `wc -c slim cleargate-protocol.md` ÷ 4. Target: ≤8000 tokens. Current: ~13.5k tokens. **Aspirational** per §6 Q5 — measured, not gated. Promote to a `cleargate doctor` check in a follow-up CR after one clean SPRINT-17 cycle confirms the budget is stable.
- **Architect milestone plan duplication — zero per-story Files-to-create / Files-to-modify subsections.** Plan length follows what the milestone scope requires (no line cap per §6 Q4). Current: every plan I sampled (M1.md=219, M2.md=164, M3.md=189, M4.md=348 in SPRINT-15) contains "Files to create:" and "Files to modify:" subsections that duplicate Story §3.1.
- **CLAUDE.md rule coverage 4/4** — every rule that is "AI must consult X before action Y" appears in CLAUDE.md by name. Target: 4/4 rules added (execution_mode read, Architect-twice, CR-017 gates, CR-019 close-ack). Current: 1/4 (close-ack lives in upper "Guardrails for me", absent from the canonical CLEARGATE block; others 0/4).
- **No regression** — `cleargate doctor` exits 0; `cleargate wiki lint` exits 0; `node .cleargate/scripts/state-scripts.test.mjs` and `.cleargate/scripts/test_ratchet.mjs` pass; mirror diff under `cleargate-planning/` returns empty.

## 2. Scope Boundaries

**✅ IN-SCOPE (Build This)**

- [ ] **Workstream A — Architect plan slim.** Edit `architect.md` (live + canonical mirror): rewrite Workflow step 4 plan template to drop per-story Files-to-create/Files-to-modify subsections; keep Order, Cross-story coupling, Gotchas (file:line citations), executable Test scenarios, Reuse map, Cross-story risks, Open decisions. **No size cap** — plan length is scope-driven (§6 Q4).
- [ ] **Workstream B — Protocol split + full citation rewrite.** Move `cleargate-enforcement.md` §§1-20 + §§7-27 → new `cleargate-enforcement.md` (§6 Q2 confirmed). Original file retains §§1-14 + §21 only — **no stub redirects** (§6 Q3: full rewrite). Grep all ~92 §-citations to moved sections across live + archived surfaces and rewrite each to the new file's §-numbering. One-time §11.4 archive-immutability carve-out: citation substitutions only, no frontmatter timestamp updates, no other body changes to archived files. Both files mirror to canonical.
- [ ] **Workstream C — CLAUDE.md gap-fill.** Add 4-bullet block to CLEARGATE section covering: read `execution_mode` before agent spawns, Architect's two spawn modes (Sprint Design Review + per-milestone plan), CR-017 boundary gates (decomposition at init, lifecycle at close), CR-019 close-ack rule. Update session-start read order from 3-tier to 4-tier (add `cleargate-enforcement.md` at tier 4: "read only when a CLI hook surfaces an error"). Bullets cite by name (e.g. "the lifecycle reconciler") rather than specific § numbers, so the gap-fill commit doesn't couple to Workstream B's renumbering. Mirror to canonical.
- [ ] **Workstream D — Sprint closeout doc & metadata refresh checklist (added 2026-05-01).** Create canonical knowledge doc `.cleargate/knowledge/sprint-closeout-checklist.md` enumerating every README / CHANGELOG / MANIFEST / CLAUDE.md "Active state" / wiki / INDEX / frontmatter-stamp surface that may need refresh at sprint close, with per-item trigger conditions. Create script `.cleargate/scripts/prep_doc_refresh.mjs <sprint-id>` that scans the sprint's changed-file set and emits a per-sprint tailored checklist at `.cleargate/sprint-runs/<id>/.doc-refresh-checklist.md`. Add 1-line CLAUDE.md reference. Mirror to canonical. **Wiring into `close_sprint.mjs` is deferred to CR-022 (Sprint 3); STORY-024-04 produces the artifacts only.** Loose thematic fit under EPIC-024 — READMEs and metadata are the *human* orientation surface, parallel to EPIC-024's *AI* orientation surface.

**Story decomposition + parallelism (revised 2026-05-01):**

| Wave | Story | Lane | Surface | Parallel? |
|---|---|---|---|---|
| **Wave 1** | STORY-024-01 — Architect plan slim | standard (L2) | `architect.md` × 2 mirrors | ‖ with 024-03 + 024-04 |
| **Wave 1** | STORY-024-03 — CLAUDE.md gap-fill | fast (L1, doc-only ≤2 files) | `CLAUDE.md` × 2 mirrors | ‖ with 024-01 + 024-04 |
| **Wave 1** | STORY-024-04 — Sprint closeout doc & metadata refresh checklist | standard (L2) | `.cleargate/knowledge/sprint-closeout-checklist.md` × 2 mirrors + `.cleargate/scripts/prep_doc_refresh.mjs` (new) + `CLAUDE.md` × 2 mirrors (different lines than 024-03) | ‖ with 024-01 + 024-03 |
| **Wave 2** | STORY-024-02 — Protocol split + full citation rewrite | standard (L2 — see story) | `cleargate-protocol.md` × 2 + new `cleargate-enforcement.md` × 2 + ~121 §-citation rewrites across all surfaces (including just-merged `architect.md`) | sequential after Wave 1 |

Wave 2 follows Wave 1 because 024-02 must rewrite §-citations inside `architect.md` (which 024-01 also edits) — sequential merge prevents shared-surface conflicts. STORY-024-04's CLAUDE.md edit is on different lines than STORY-024-03's, so they can land in parallel without conflict; merge ordering between them is non-binding.

**❌ OUT-OF-SCOPE (Do NOT Build This)**

- Changing any gate semantic (Gate 1/2/3/3.5 unchanged).
- Changing four-agent loop role contracts beyond Architect's plan-template field.
- Changing `execution_mode: v1|v2` enforcement behaviour — only its visibility in CLAUDE.md changes.
- Refactoring template files (`templates/epic.md`, `templates/story.md`, etc.).
- Modifying CLI command surface, MCP tool surface, or hooks.
- **Adding a sprint-init check that asserts §2 Sprint Design Review is non-stub before activation** — out of scope per §6 Q7. File a separate CR if/when SDR-skip drift is observed.
- **Promoting the orientation token budget into a `cleargate doctor` failing check** — aspirational only for SPRINT-17 per §6 Q5; promote in a follow-up CR after one clean cycle.
- Re-authoring the wiki layer or its build pipeline.
- Adding any other automated CI checks beyond the existing `doctor` + `wiki lint`.

## 3. The Reality Check (Context)

| Constraint Type | Limit / Rule |
|---|---|
| **Mirror parity** | Every edit under `.claude/agents/*`, `.cleargate/knowledge/*`, or `CLAUDE.md` MUST be applied identically to `cleargate-planning/.claude/agents/*`, `cleargate-planning/.cleargate/knowledge/*`, or `cleargate-planning/CLAUDE.md` (CLAUDE.md mirrors only the CLEARGATE-tag-block region; outside-block content diverges intentionally). Post-edit `diff` returns empty within the tracked region. (FLASHCARD 2026-04-19 #wiki #protocol #mirror) |
| **§11.4 archive-immutability carve-out** | This Epic carves out a one-time exception to protocol §11.4 for citation substitutions in archived files. Allowed: `§<old>` → `§<new>` token replacement. Forbidden: any other body change, any frontmatter timestamp update, any `cleargate stamp` invocation against an archive path. The carve-out is verified by acceptance scenario "Citation rewrite preserves audit trail" — `git diff` of each archive file shows only §-substitution lines. |
| **Citation completeness** | After STORY-024-02 merges, `grep -rE '§(15\|16\|17\|18\|19\|20\|22\|23\|24\|25\|26\|27)\b' .cleargate/delivery/ .claude/agents/ cleargate-planning/.claude/agents/ CLAUDE.md cleargate-planning/CLAUDE.md .cleargate/wiki/` returns zero hits that resolve to `cleargate-protocol.md`. All such citations now point at `cleargate-enforcement.md`. |
| **No protocol number reuse / no §-renumber** | The slim `cleargate-protocol.md` keeps §§1-14 + §21 at their existing numbers. The new `cleargate-enforcement.md` numbers its sections 1..N independently, but each section's heading carries a "(source: protocol §N)" annotation for git-blame continuity. (FLASHCARD 2026-04-21 #protocol #section-numbering) |
| **Token budget — orientation (aspirational)** | CLAUDE.md byte size + slim `cleargate-protocol.md` byte size ÷ 4 ≤ 8000 tokens. **Measured, not gated** per §6 Q5. Promote to a `cleargate doctor` failing check in a follow-up CR if the budget proves stable across one clean SPRINT-17 cycle. |
| **Architect plan size** | **No cap.** Plan length is scope-driven (§6 Q4). Workstream A's reform removes duplication, not lines. |
| **Test surface** | `cleargate doctor` exits 0; `cleargate wiki lint` exits 0; existing test suites (`state-scripts.test.mjs`, `test_ratchet.mjs`) pass without modification. |
| **No new dependencies** | Zero packages added to any `package.json`. Pure documentation refactor + agent prompt edit. |
| **Lane** | 024-01 = `standard` (L2, agent-prompt edit + mirror). 024-02 = `standard` (L3, multi-file split + ~92 citation rewrites; trips lane-cap). 024-03 = `fast` (L1, doc-only ≤2 files, no forbidden surfaces). |

## 4. Technical Grounding (The "Shadow Spec")

**Affected Files:**

*Workstream A — Architect plan slim:*
- `.claude/agents/architect.md` — rewrite Workflow step 4 (lines 18-42 currently). New plan template subsections: Order, Per-story blueprint (Cross-story coupling + Gotchas with file:line + Test scenarios + Reuse), Cross-story risks, Open decisions. **Drop**: per-story Files-to-create / Files-to-modify subsections. **No size cap.**
- `cleargate-planning/.claude/agents/architect.md` — identical edit (canonical mirror).

*Workstream B — Protocol split + full citation rewrite:*
- `.cleargate/knowledge/cleargate-enforcement.md` — retain §§1-14 + §21 (status vocab). **Remove §§1-20 + §§7-27 entirely** (no stub redirects per §6 Q3). Total target ≈400 lines (currently 1088).
- `.cleargate/knowledge/cleargate-enforcement.md` — NEW. Receives the moved sections. Top-of-file index lists each section with its source `§N` from the original protocol. Each section heading carries a `(source: protocol §N)` annotation for git-blame continuity.
- `cleargate-planning/.cleargate/knowledge/cleargate-protocol.md` — identical slim (canonical mirror).
- `cleargate-planning/.cleargate/knowledge/cleargate-enforcement.md` — NEW canonical mirror.
- **Citation rewrite** — grep `§(15|16|17|18|19|20|22|23|24|25|26|27)\b` (~92 occurrences as of 2026-04-30) across:
  - `.cleargate/delivery/archive/**` (shipped story + sprint files — covered by §11.4 carve-out, citation-only edits allowed)
  - `.cleargate/delivery/pending-sync/**` (in-flight items)
  - `.claude/agents/**` (live agent definitions including architect.md from Wave 1 merge)
  - `cleargate-planning/.claude/agents/**` (canonical mirror)
  - `CLAUDE.md` + `cleargate-planning/CLAUDE.md` (only if Workstream C's bullets cite specific §s — but Workstream C drafts citation-by-name to avoid coupling)
  - `.cleargate/wiki/**` (auto-rebuilt, but in-flight pages may carry citations)
  Each `§<old>` → `§<new>` substitution; no other edits in the same diff hunk.

*Workstream C — CLAUDE.md gap-fill:*
- `CLAUDE.md` — add 4-bullet block to CLEARGATE section between current "Halt at gates" bullet and "Drafting work items" bullet. Bullets cite by name (e.g. "the lifecycle reconciler", "the close-ack rule") rather than specific § numbers. Update session-start read order from 3-tier to 4-tier (add `cleargate-enforcement.md` at tier 4 with "read only when a CLI hook surfaces an error or when triaging a v2-mode question").
- `cleargate-planning/CLAUDE.md` — identical edit (canonical mirror).

**Data Changes:**

None. Pure documentation refactor + agent prompt edit. No frontmatter schema changes, no DB migrations, no template edits, no new CLI flags, no hooks added.

## 5. Acceptance Criteria

```gherkin
Feature: AI Orientation Surface Slim

  Scenario: Architect milestone plan drops §3.1 duplication
    Given execution_mode is "v2"
    And the Architect agent is spawned for milestone M<N> of an arbitrary sprint
    When the Architect writes plans/M<N>.md
    Then the file MUST NOT contain a "Files to create:" or "Files to modify:" subsection per story
    And the file MUST contain "Cross-story risks", "Gotchas", "Test scenarios", and "Reuse" subsections (or their equivalents)
    And the file MAY be of any length the milestone scope requires

  Scenario: Protocol split — full rewrite, no stub redirects
    Given Workstream B has merged
    When `grep -E '§(15|16|17|18|19|20|22|23|24|25|26|27)\b' .cleargate/knowledge/cleargate-protocol.md` runs
    Then it returns zero matches
    And `cleargate-enforcement.md` exists at .cleargate/knowledge/ and at cleargate-planning/.cleargate/knowledge/
    And `cleargate-enforcement.md` contains every section that previously lived at §§1-20 + §§7-27 of cleargate-enforcement.md
    And each section in cleargate-enforcement.md carries a "(source: protocol §N)" annotation in its heading

  Scenario: Citation rewrite is complete
    Given Workstream B has merged
    When `grep -rE '§(15|16|17|18|19|20|22|23|24|25|26|27)\b.*cleargate-protocol' .cleargate/ .claude/ cleargate-planning/ CLAUDE.md` runs
    Then it returns zero matches
    And every occurrence of `§(15|16|17|18|19|20|22|23|24|25|26|27)` in the corpus that previously cited `cleargate-protocol.md` now cites `cleargate-enforcement.md` with the new §-number

  Scenario: Citation rewrite preserves archive audit trail
    Given Workstream B has merged
    And a file F in .cleargate/delivery/archive/ contained citations to moved §§
    When `git diff <pre-024-02-sha> HEAD -- F` is examined
    Then every changed line contains only a `§<old>` → `§<new>` substitution OR a file path swap from `cleargate-protocol.md` to `cleargate-enforcement.md`
    And no frontmatter field of F changed (no updated_at, no last_stamp, no last_synced_body_sha)
    And no body content of F changed beyond the citation substitution

  Scenario: CLAUDE.md surfaces the four implicit rules
    Given a fresh AI agent reads CLAUDE.md cold
    When the agent reaches the CLEARGATE block
    Then the agent finds an explicit instruction "Read execution_mode in the active sprint's frontmatter before spawning Developer/QA"
    And the agent finds an explicit statement "Architect runs twice per sprint: Sprint Design Review (writes §2 of sprint plan) + per-milestone (writes plans/M<N>.md)"
    And the agent finds an explicit reference to CR-017 boundary gates (decomposition at sprint init, lifecycle reconciler at sprint close)
    And the agent finds an explicit reference to CR-019 close-ack (orchestrator MUST NOT pass --assume-ack autonomously)
    And the session-start read order lists cleargate-enforcement.md at tier 4 with "read only when a CLI hook surfaces an error"

  Scenario: Mirror parity invariant
    Given the Epic's stories have all merged
    When `diff .claude/agents/architect.md cleargate-planning/.claude/agents/architect.md` runs
    Then the diff is empty
    And `diff .cleargate/knowledge/cleargate-protocol.md cleargate-planning/.cleargate/knowledge/cleargate-protocol.md` is empty
    And `diff .cleargate/knowledge/cleargate-enforcement.md cleargate-planning/.cleargate/knowledge/cleargate-enforcement.md` is empty
    And the CLEARGATE-tag-block region of CLAUDE.md is byte-identical to the same region of cleargate-planning/CLAUDE.md

  Scenario: Token budget measured (aspirational)
    Given the Epic has shipped
    When orientation cost is measured as `(wc -c CLAUDE.md) + (wc -c .cleargate/knowledge/cleargate-protocol.md) ÷ 4`
    Then the result is logged in the SPRINT-17 §4 Execution Log as a measurement
    And the measurement is not a gate — sprint can close even if the result exceeds 8000 tokens
    And a follow-up CR is filed if the result remains stable below the budget across SPRINT-17

  Scenario: No regression on existing tests
    Given the Epic has shipped
    When `cleargate doctor`, `cleargate wiki lint`, `node .cleargate/scripts/state-scripts.test.mjs`, and `node .cleargate/scripts/test_ratchet.mjs` run
    Then all four exit 0

  Scenario: No accidental gate-semantic change
    Given the Epic has shipped
    When the Gate 1, Gate 2, Gate 3, and Gate 3.5 enforcement code paths in cleargate-cli/src/ and mcp/src/ are diffed against the pre-Epic baseline
    Then those code paths are byte-identical to the pre-Epic baseline
```

## 6. AI Interrogation Loop — Resolved 2026-04-30

*All eight questions answered. This section is preserved as a decision log; `§6 AI Interrogation Loop is empty (all human answers integrated into the spec)` is satisfied because every answer below has been propagated into §0–§5.*

- **Q1 — Sprint placement.** **Resolved: SPRINT-17 in full.** All three workstreams target SPRINT-17. High-impact bundle; splitting across sprints doubles coordination cost.
- **Q2 — Naming the new file.** **Resolved: `cleargate-enforcement.md`.** Most accurate description of contents; reads naturally in CLI hook error messages.
- **Q3 — Citation rewrite policy.** **Resolved: full rewrite.** No stub redirects. All ~92 §-citations rewritten across live + archived surfaces. One-time §11.4 archive-immutability carve-out: citation substitutions only, no other body or frontmatter changes to archived files.
- **Q4 — Architect plan size cap.** **Resolved: no cap.** Plan length is scope-driven. The reform removes Story §3.1 duplication, not lines. No `--allow-extended` flag; no override mechanism needed.
- **Q5 — Token budget enforcement.** **Resolved: aspirational.** Measured at sprint close, not gated. Promote to a `cleargate doctor` failing check in a follow-up CR after one clean SPRINT-17 cycle confirms stability.
- **Q6 — Story decomposition + parallelism.** **Resolved: 3 stories, two waves.** Wave 1 (parallel): STORY-024-01 ‖ STORY-024-03. Wave 2 (sequential after Wave 1): STORY-024-02. Decomposition rationale documented in §2 Story decomposition table.
- **Q7 — Sprint-init §2 SDR check.** **Resolved: out of scope.** Ship the doc rules; observe whether SDR-skip drift occurs; file a separate CR if/when needed (CR-019 pattern).
- **Q8 — In-flight sprint plan migration.** **Resolved: moot under Q1+Q3.** SPRINT-17 placement means SPRINT-16 will already be archived by the time STORY-024-02 runs; full rewrite (Q3) covers archive/ files via the §11.4 carve-out. No special migration handling needed.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity**

Requirements to pass to Green (Ready for Coding Agent):
- [x] Proposal document has `approved: true`. **Waived per `proposal_gate_waiver` frontmatter — saved-memory pattern 'Proposal gate waivable by direct approval'.**
- [x] The `<agent_context>` block is complete and validated.
- [x] §4 Technical Grounding contains 100% real, verified file paths.
- [x] §6 AI Interrogation Loop is empty (all human answers integrated into the spec).
- [x] 0 "TBDs" exist in the document.
