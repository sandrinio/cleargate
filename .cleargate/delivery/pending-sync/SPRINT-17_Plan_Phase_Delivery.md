---
sprint_id: "SPRINT-17"
parent_cleargate_id: null
sprint_cleargate_id: null
carry_over: false
lifecycle_init_mode: "block"
remote_id: null
source_tool: "local"
status: "Completed"
completed_at: "2026-05-01T09:47:36Z"
execution_mode: "v2"
start_date: "2026-05-02"
end_date: "2026-05-15"
created_at: "2026-05-01T00:00:00Z"
updated_at: "2026-05-01T00:00:00Z"
created_at_version: "cleargate@0.10.0"
updated_at_version: "cleargate@0.10.0"
context_source: "Brainstorm charter at .cleargate/scratch/SDLC_brainstorm.md §2.4 — three-sprint sequential roadmap (revised 2026-05-01). SPRINT-17 maps to ordinal 'Sprint 1 — Plan phase delivery' of the SDLC redesign. Anchor scope: EPIC-024 (AI Orientation Surface Slim — 4 stories) + CR-020 (Brief-Driven SDLC Plan Phase). Sequential dependency to SPRINT-18 (CR-021) and SPRINT-19 (CR-022, undrafted): CR-021's Sprint Plan reframe consumes CR-020's universal Brief pattern; CR-021 + CR-022 both touch close_sprint.mjs, requiring sequential merge."
epics: ["EPIC-024"]
crs: ["CR-020"]
bugs: []
proposals: []
approved: true
approved_at: 2026-05-01T00:00:00Z
approved_by: sandrinio
activated_at: null
human_override: false
draft_tokens:
  input: null
  output: null
  cache_read: null
  cache_creation: null
  model: null
  sessions: []
cached_gate_result:
  pass: null
  failing_criteria: []
  last_gate_check: null
sprint_cleargate_id: "SPRINT-17"
---

# SPRINT-17: Sprint 1 — Plan Phase Delivery

## Sprint Goal

Land the **Plan-phase** layer of the SDLC redesign:

1. **EPIC-024 — AI Orientation Surface Slim.** Make four currently-implicit ClearGate rules explicit in `CLAUDE.md`; split `cleargate-protocol.md` into "AI reads" + "hooks enforce" files with full citation rewrite (no stub redirects); remove Story §3.1 duplication from per-milestone Architect plans; ship a sprint-closeout doc & metadata refresh checklist for the *human-facing* orientation surface. Four stories, three waves internal.
2. **CR-020 — Brief-Driven SDLC Plan Phase.** Universal Brief pattern in every work-item template; collapse old Gate 1 + Gate 2 + Gate 3 → new four-gate model (Gate 1 Brief / Gate 2 Sprint Ready / Gate 3 Sprint Execution / Gate 4 Close-Ack); insert §0 Phase Map at top of slim protocol; drop the "Always Start with a Proposal" mandate; reframe MCP as the universal sync surface (no Linear/Jira mentions in protocol prose).

This is the **first sprint to ship Plan-phase mechanics on top of the post-EPIC-024 slim protocol** — CR-020 amends the very file STORY-024-02 just produced. Wave ordering inside SPRINT-17 is therefore non-negotiable (see §2 SDR — to be populated by Architect).

Ordinal name: **Sprint 1 of 3** in the brainstorm charter (`.cleargate/scratch/SDLC_brainstorm.md §2.4`). SPRINT-18 = Sprint 2 (CR-021 Prepare/Close/Observe mechanics). SPRINT-19 = Sprint 3 (CR-022 Gate 4 close pipeline hardening, currently undrafted).

## 1. Consolidated Deliverables

| Item | Type | Title | Lane | Complexity | Parallel? | Bounce Exposure | Milestone |
|---|---|---|---|---|---|---|---|
| `STORY-024-01` | Story | Architect plan slim — drop §3.1 duplication from per-milestone plans | standard | L2 | y (Wave 1) | low | M1 |
| `STORY-024-03` | Story | CLAUDE.md gap-fill — surface 4 implicit rules + tier-4 read order | fast | L1 | y (Wave 1) | low | M1 |
| `STORY-024-04` | Story | Sprint closeout doc & metadata refresh checklist + `prep_doc_refresh.mjs` | standard | L2 | y (Wave 1) | low | M1 |
| `STORY-024-02` | Story | `cleargate-protocol.md` split + new `cleargate-enforcement.md` + ~92 §-citation rewrites | standard | L2 | n (Wave 2) | med | M2 |
| [`CR-020`](CR-020_Brief_Driven_SDLC_Plan_Phase.md) | CR | Brief-driven SDLC Plan phase + universal Brief pattern + §0 Phase Map + four-gate model | standard | L3 | n (Wave 3) | med | M3 |

**Estimated totals:** 4 stories + 1 CR = **5 items**. Complexity: 1×L1 + 3×L2 + 1×L3. Lane mix: 1 fast / 4 standard.

**Wave structure (preliminary; Architect SDR to confirm in §2):**

- **Wave 1 (parallel, disjoint surfaces):** STORY-024-01 ‖ STORY-024-03 ‖ STORY-024-04 — three independent file sets (`architect.md`, `CLAUDE.md` 4-bullet block, new knowledge doc + script).
- **Wave 2 (sequential, shared surface):** STORY-024-02 — protocol split + citation rewrite. Must follow STORY-024-01 (both edit `architect.md`) and is the largest single change.
- **Wave 3 (sequential, depends on Wave 1+2 closure):** CR-020 — amends the slim protocol from STORY-024-02, replaces the CLAUDE.md 4-bullet block from STORY-024-03 with a richer Brief-driven instruction set, drops `proposal_gate_waiver` from all six templates.

## 2. Execution Strategy

*(Populated by Architect Sprint Design Review 2026-05-01.)*

### 2.1 Phase Plan

Confirmed: three waves, sequential between waves, parallel within Wave 1.

- **Wave 1 (parallel — disjoint surfaces):** `STORY-024-01` ‖ `STORY-024-03` ‖ `STORY-024-04`. The three stories edit non-overlapping file regions: 024-01 edits `architect.md` Workflow step 4 (lines 13–42); 024-03 edits the `CLAUDE.md` CLEARGATE-tag-block at the bullet-region between current "Halt at gates" (line 15 of the block) and "Drafting work items" (line 17 of the block), plus appends tier-4 to the read-order list at lines 6–9 of the block; 024-04 creates two new files (`.cleargate/knowledge/sprint-closeout-checklist.md` + `.cleargate/scripts/prep_doc_refresh.mjs`) and inserts a single bullet into the same `CLAUDE.md` CLEARGATE-tag-block but at the *end* of the block (close-related guardrail), not in the read-order list nor adjacent to 024-03's 4-bullet insertion. No line-range collision between 024-03 and 024-04 inside CLAUDE.md.
- **Wave 2 (sequential after Wave 1):** `STORY-024-02`. Must follow 024-01 because the citation rewrite re-touches `architect.md` (specifically line 140 — the `§9 "Lane Routing"` reference in the Lane Classification section, disjoint from 024-01's edit region but the same file). Must follow 024-03 because 024-03 introduces a tier-4 line that *names* `cleargate-enforcement.md` (a file 024-02 creates); 024-03 ships the name promise, 024-02 fulfils it. Must follow 024-04 because the new `sprint-closeout-checklist.md` body cites `cleargate-enforcement.md` and `cleargate-enforcement.md` as canonical paths — 024-04 lands the references, 024-02 ensures the cited file exists.
- **Wave 3 (sequential after Wave 2):** `CR-020`. CR-020 §3.2.1 inserts §0 Phase Map at the top of the *slim* `cleargate-protocol.md` (post-024-02). CR-020 §3.2.10 explicitly *replaces* STORY-024-03's 4-bullet block in CLAUDE.md with a richer 6-bullet block; the replacement targets exactly the bullets 024-03 wrote, not a reflowed neighbourhood. CR-020 §3.2.7 retrofits all six work-item templates with `POST-WRITE BRIEF` instructions — this is independent of EPIC-024 surfaces but must land after 024-02 so the templates' Brief blocks can cite the slim protocol's new gate names without colliding with the §-citation rewrite.

### 2.2 Merge Ordering (Shared-File Surface Analysis)

Files touched by more than one anchor item:

| Shared File | Stories Touching It | Merge Order | Rationale |
|---|---|---|---|
| `.claude/agents/architect.md` (+ canonical mirror) | STORY-024-01, STORY-024-02 | 024-01 → 024-02 | 024-01 rewrites Workflow step 4 (lines 13–42); 024-02 rewrites the `§9 "Lane Routing"` citation at line 140 to point at `cleargate-enforcement.md §9`. Disjoint line ranges but same file — sequential merge avoids a same-file conflict for the Wave 2 commit. |
| `.cleargate/knowledge/cleargate-enforcement.md` (+ canonical mirror) | STORY-024-02, CR-020 | 024-02 → CR-020 | 024-02 removes §§1-20 + §§7-27 entirely (no stub redirects); CR-020 inserts new §0 Phase Map at top and rewrites §§2/3/4/5/6 inline. CR-020 lands on the *slim* file; ordering is non-negotiable. |
| `CLAUDE.md` CLEARGATE-tag-block (+ canonical mirror) | STORY-024-03, STORY-024-04, CR-020 | 024-03 ‖ 024-04 (Wave 1) → CR-020 (Wave 3) | 024-03 inserts 4 bullets between "Halt at gates" and "Drafting work items" + appends a tier-4 line to the session-start read-order list. 024-04 inserts a single close-related bullet near the end of the block (different line range; close-related guardrail surface). CR-020 §3.2.10 *replaces* 024-03's 4-bullet block with a 6-bullet block (additive of CR-020 Sprint-Execution-Gate forward-ref + Brief handshake bullets, retaining the "Sprint mode" / "Architect runs twice" / "Boundary gates (CR-017)" / "Sprint close (CR-019)" semantic content). CR-020 explicitly states it *retains* 024-03's tier-4 read-order entry — that line is not touched. CR-020 does not touch 024-04's close-related bullet (different surface). |
| `.cleargate/templates/{epic,story,CR,Bug,hotfix,proposal}.md` (+ canonical mirrors) | CR-020 only | n/a | No story in EPIC-024 touches the template directory. CR-020 owns all six templates exclusively; merge order trivial. |

No other file is touched by more than one anchor item. The `.cleargate/scripts/prep_doc_refresh.mjs` (new in 024-04) is exclusive to 024-04. The new `.cleargate/knowledge/sprint-closeout-checklist.md` (new in 024-04) is exclusive to 024-04. The new `.cleargate/knowledge/cleargate-enforcement.md` (created by 024-02) is exclusive to 024-02 at creation; CR-020 §3.2.4 mentions it once in prose ("specified by CR-021") but adds no edit to the file itself.

### 2.3 Shared-Surface Warnings

- **CLAUDE.md CLEARGATE-tag-block is already mirror-divergent pre-sprint.** Audit at 2026-05-01: live block = 35 lines, canonical block = 39 lines (4 extra lines in canonical: a "Readiness gates advisory-by-default" extension to the "Halt at gates" bullet, plus "State-aware surface" and "Cross-project orchestration" bullets not present live). STORY-024-03's Gherkin scenario "Mirror parity within CLEARGATE-tag-block" requires the two regions to be byte-identical post-edit. **Decision (orchestrator, 2026-05-01):** scope STORY-024-03's mirror-parity Gherkin to "the 4 new bullets are byte-identical between live and canonical" — not "the entire block diff is empty." Reasoning: the FLASHCARD `2026-04-19 #mirror` invariant is *edit-parity* (every edit applied identically to both files), not *state-parity* (every byte matches at all times). The pre-existing divergence is legacy; reconciling it requires deciding which version is canonical, which is research scope outside SPRINT-17. Architect milestone plan (M1) MUST capture this scope narrowing in §3.2: "Mirror parity scope for STORY-024-03 = the four new bullets only; pre-existing canonical-only bullets remain in canonical, untouched. Same scope-narrowing applies to STORY-024-04's CLAUDE.md edit and CR-020's CLEARGATE-block reflow." Tracked as a follow-up in §6 of this plan for a future cleanup CR.
- **STORY-024-03 ↔ CR-020 replacement boundary.** CR-020 §3.2.10 spec says it replaces 024-03's 4-bullet block with 6 bullets in the same location. Confirm at execution time: the deletion target for CR-020 must match 024-03's 4 bullets *exactly* (verbatim, including the leading `**Sprint mode.**`, `**Architect runs twice per sprint.**`, `**Boundary gates (CR-017).**`, `**Sprint close is Gate-3-class (CR-019).**` headers). The replacement set in CR-020 §3.2.10 retains those four bullets (Sprint mode / Architect runs twice / Boundary gates / Sprint close, with the close bullet relabeled "Gate-4-class" not "Gate-3-class") and inserts two new bullets ("Brief is the universal pre-push handshake" + "Sprint Execution Gate (CR-021)"). Developer executing CR-020 MUST grep for 024-03's exact bullet text and replace as a contiguous block — not re-author from scratch — to keep the diff reviewable.
- **STORY-024-04 ↔ CR-020 close-bullet adjacency.** 024-04 inserts a "Doc & metadata refresh on close" bullet near the end of the CLEARGATE block. CR-020 §3.2.10's 6-bullet block is inserted in the *middle* of the block (replacing 024-03's location, which is between "Halt at gates" and "Drafting work items"). The two are at different line ranges and do not collide — but the developer executing CR-020 must NOT inadvertently delete 024-04's close-bullet when reflowing the block. Architect milestone plan must call out: "CR-020 replacement scope = 024-03's 4 bullets only; 024-04's close-related bullet at end-of-block is out of scope and must remain."
- **architect.md §9 citation rewrite is on a fresh line range from 024-01's Workflow edit.** 024-01 rewrites lines 13–42 (Workflow step 4 fence). 024-02's citation rewrite hits line 140 (`§9 "Lane Routing"` in the Lane Classification section). Same file, disjoint ranges — sequential merge prevents a same-file lock conflict but no line-overlap merge conflict expected. The §10/§21 illustrative prose at line 114 (Protocol Numbering Resolver example) is not a real citation; 024-02's grep for `§(15|16|17|18|19|20|22|23|24|25|26|27)` would not match §10 or §21. **No false-positive risk** here.
- **Citation rewrite includes the live `pending-sync/` surface (which contains EPIC-024 + STORY-024-* + CR-020 themselves).** STORY-024-02's citation surfaces include `.cleargate/delivery/pending-sync/**`. By the time 024-02 runs (Wave 2), Wave-1 stories have merged but CR-020 has NOT. The unmerged CR-020 file in `pending-sync/` contains references like `cleargate-enforcement.md §<N>` (forward references) and existing citations. Developer executing 024-02 MUST grep CR-020 for moved-§ citations and rewrite per the mapping table the same way as any other in-flight item — and CR-020 must be re-validated after 024-02's commit lands but before CR-020's Wave-3 execution begins.

### 2.4 Lane Audit

| Story | Lane | Rationale (≤80 chars) |
|---|---|---|
| `STORY-024-03` | fast | Doc-only, 2-file mirror, no forbidden surfaces, exposure low, 1 epic scope |

Seven-check rubric for STORY-024-03 (per `.claude/agents/architect.md` §"Lane Classification"): (1) size cap — 2 files (live + canonical CLAUDE.md), inserts ~12 LOC net (4 bullets + 1 tier-4 line + blank-line separators) ≪ 50 LOC cap, **pass**; (2) forbidden surfaces — `CLAUDE.md` is not in the schema/auth/config/adapter/manifest/security prefix list, **pass**; (3) no new dependency — zero `package.json` edits, **pass**; (4) single acceptance scenario or doc-only — story has 8 Gherkin scenarios but ALL are non-runtime grep checks against the post-edit doc (no `Scenario Outline`, no runtime acceptance), and the story is doc-only per check 7 — **pass under doc-only carve-out**; (5) existing tests cover runtime change — N/A, doc-only / non-runtime, **pass**; (6) `expected_bounce_exposure: low` — confirmed in frontmatter, **pass**; (7) no epic-spanning subsystem touches — both files (`CLAUDE.md`, `cleargate-planning/CLAUDE.md`) are within EPIC-024's declared scope, **pass**. All 7 pass → `lane: fast` confirmed.

STORY-024-01, STORY-024-02, STORY-024-04, and CR-020 are all `lane: standard`. Brief rationale per item: 024-01 frontmatter declares `complexity_label: L2` (agent-prompt edit ≥ 2 files but ≤ 50 LOC, marginal — pre-classified standard by author); 024-02 trips check 1 (~92 citation rewrites across many files, well over 50 LOC) and check 4 (multiple Gherkin scenarios with runtime grep verification); 024-04 trips check 1 (5-file surface: 1 knowledge doc + 1 script + 1 CLAUDE.md addition × 2 mirrors); CR-020 is a 16-file change with §§2/3/4/5/6 protocol rewrites — well over fast-lane size cap.

### 2.5 ADR-Conflict Flags

- **None blocking.** EPIC-024 §0 explicitly preserves every existing gate semantic (Gate 1/2/3/3.5) and every four-agent contract; CR-020 retires gate *names* and *ceremony* but leaves the underlying enforcement code paths byte-identical (CR-020 §2.4 + Gherkin scenario "No accidental gate-semantic change at the code level"). The locked architectural decisions in CLAUDE.md §"Active state" — invite storage = Postgres source of truth, wiki drift detection = git SHA — are untouched by any anchor item in SPRINT-17.
- **Soft flag (informational, not blocking):** CR-020 retires the "Always Start with a Proposal" mandate that has shipped in the protocol since SPRINT-01-era. Saved-memory entry "Proposal gate waivable by direct approval" + the `proposal_gate_waiver` frontmatter pattern across ~30% of 2026 work items is the de-facto state already; CR-020 §1.1 documents this. No prior FLASHCARD or ADR locks the Proposal-first rule against retirement. Surface as informational so reviewers see the trace, not as a blocker.
- **Soft flag (informational, not blocking):** STORY-024-02's §11.4 archive-immutability one-time carve-out is documented in EPIC-024 §3 Reality Check + the story's §1.2 Phase 3 spec. No conflict with FLASHCARD `2026-04-21 #protocol #section-numbering` (that flashcard governs *new* section numbering for forward-only appends; 024-02 is a non-renumbering removal of §§1-20 + §§7-27, leaving §§1-14 + §21 at their existing numbers — fully consistent with the flashcard's intent).

## 3. Risks & Dependencies

| Risk | Mitigation |
|---|---|
| **§-citation rewrite scope creep** (STORY-024-02 — ~92 occurrences across live + archived surfaces) | One-time §11.4 archive-immutability carve-out documented in EPIC-024 §3 Reality Check; QA scenario "Citation rewrite preserves audit trail" diffs each archive file for citation-only changes. |
| **CR-020 lands on freshly-slimmed protocol — merge timing fragile** | Wave 3 sequencing (CR-020 after STORY-024-02) is enforced by §2.2 Merge Ordering. Architect confirms order in SDR. |
| **Mirror parity drift** — every edit must apply identically to `cleargate-planning/` | Existing FLASHCARD `2026-04-19 #wiki #protocol #mirror` already encodes the rule. Each story's DoD requires `diff` empty before commit. |
| **Token budget aspiration may not land within SPRINT-17** | EPIC-024 §6 Q5 explicitly marks token budget as **measured, not gated**. Promotion to `cleargate doctor` check deferred to a follow-up CR after one clean cycle. |
| **CR-020 retires `proposal_gate_waiver` field — in-flight items have it set** | Saved-memory pattern + this very sprint's EPIC-024 + CR-020 use the field. Migration: drop from templates only; existing files keep the field as historical metadata (§2.3 of CR-020 covers the one-time cleanup pass). |

## 4. Metrics & Metadata

- **Expected Impact:**
  - Orientation token cost (aspirational): `wc -c CLAUDE.md + slim cleargate-protocol.md ÷ 4` ≤ 8000 tokens (current ~13.5k). Measured at sprint close.
  - Architect milestone plan duplication: zero per-story Files-to-create / Files-to-modify subsections (current: every plan in SPRINT-15 had them).
  - CLAUDE.md rule coverage: 4/4 implicit rules made explicit (current: 1/4).
  - Plan-phase ceremony: Gate 1 + Gate 2 + Gate 3 collapse to **single Brief approval moment** per work item (current: three separate human-confirmation moments).
  - "Always Start with a Proposal" mandate retired; Proposal becomes optional Initiative-class artifact.
- **Priority Alignment:** First of three sequential sprints in the SDLC redesign roadmap. Plan-phase changes have the heaviest dependencies and must land first to unblock SPRINT-18 (CR-021 Prepare/Close/Observe) and SPRINT-19 (CR-022 Close pipeline hardening, undrafted).

## 5. Between-sprints transition work (must complete before SPRINT-17 activation)

*Not story-tracked, not a SPRINT-17 deliverable. Owned by the conversational orchestrator (this session) + Architect SDR.*

- [x] SPRINT-16 closed — `sprint_status: Completed` per `.cleargate/sprint-runs/SPRINT-16/state.json`.
- [x] EPIC-024 entry gate green (frontmatter parse error fixed 2026-05-01: removed duplicate `sprint_cleargate_id` key).
- [x] STORY-024-04 entry gate green (§3.2 fenced markdown headings demoted from `## ` to `### ` to bypass code-fence-blind section parser; §3.1 file table converted to bulleted list to satisfy `implementation-files-declared` predicate).
- [x] STORY-024-01 / 024-02 / 024-03 / CR-020 entry gates green (verified 2026-05-01).
- [x] **Architect Sprint Design Review (SDR)** — §2 of this file populated 2026-05-01 with confirmed wave structure + merge ordering + 5 shared-surface warnings + lane audit (STORY-024-03 fast-lane, all others standard) + ADR-conflict scan (none blocking).
- [ ] Flip status Draft → Approved on EPIC-024 + CR-020 + STORY-024-01..04. EPIC-024 already `Ready` (treat as equivalent for sprint init); flip the four stories + CR-020 from `Draft` → `Approved`.
- [ ] Run `cleargate gate check` on all 6 anchor items + this sprint file. All must report `pass: true` with `cached_gate_result` populated.
- [ ] Mirror parity audit — narrow scope per §2.3 decision (edit-parity, not state-parity). Confirm `.cleargate/templates/`, `.cleargate/knowledge/`, `.claude/agents/` mirrors are byte-identical for *unchanged* files. Pre-existing CLAUDE.md CLEARGATE-block divergence is out of scope for SPRINT-17.
- [ ] `cleargate sprint init SPRINT-17` — runs CR-017 lifecycle reconciler (block-mode) + decomposition gate (block-mode). All `epics:` + `crs:` items have files + 🟢 + approved.

## 5a. Mid-sprint gate (Wave 2 → Wave 3 boundary)

- [ ] **CR-020 re-validation after STORY-024-02 commits.** STORY-024-02's grep-and-rewrite includes `pending-sync/CR-020*` in its citation surface. After Wave 2 closes (024-02 merged + commit landed), run `cleargate gate check .cleargate/delivery/pending-sync/CR-020_Brief_Driven_SDLC_Plan_Phase.md`. If gate fails (e.g. broken §-references introduced by the rewrite), halt Wave 3 and reconcile before spawning the CR-020 developer. Decision (orchestrator, 2026-05-01): this is an explicit blocking gate, not advisory. Cost: seconds.

## 6. Open follow-ups (not in scope for SPRINT-17)

- **Gate-parser code-fence blindness** — the readiness-gate predicate evaluator (`cleargate-cli/src/lib/readiness-predicates.ts`) splits sections on `^(?=## )` without respecting fenced code blocks. STORY-024-04 hit this (in-fence `## N.` headings shifted real `## 4. Quality Gates` to section 13). Fix candidate: file as a Bug or fold into CR-021/022 if pre-close hooks audit gate parsing. Workaround applied in STORY-024-04: demote in-fence `##` to `###`.
- **CLAUDE.md CLEARGATE-block pre-existing mirror divergence** — live block (35 lines) lacks 4 bullets present in canonical (39 lines): "Readiness gates advisory-by-default" extension to "Halt at gates", "State-aware surface", "Cross-project orchestration". Origin unknown — likely a prior sprint commit landed in canonical without the live mirror, or vice versa. Resolution requires a research pass to determine which version is correct. Track as a future cleanup CR (candidate name: `CR-023 — CLEARGATE-block mirror reconciliation`). Decision per §2.3: SPRINT-17 work explicitly does NOT touch these 4 lines.
- **Token budget gated check** — promote orientation cost from aspirational measurement to `cleargate doctor` failing check after SPRINT-17 cycle confirms stability (EPIC-024 §6 Q5).
- **Sprint-init §2 SDR-skip detector** — out of scope per EPIC-024 §6 Q7. File a Bug if SDR-skip drift observed.

---

## Execution Guidelines (Local Annotation — Not Pushed)

- **Starting Point:** Architect SDR. Spawn `architect` subagent with `subagent_type: architect` against this file + EPIC-024 + CR-020 + all four stories. SDR populates §2 of this file (NOT a per-milestone plan; that comes later, one per milestone). Required before activation per `execution_mode: v2`.
- **Relevant Context:** `.cleargate/scratch/SDLC_brainstorm.md` (de-facto charter — SPRINT-17 maps to ordinal Sprint 1); EPIC-024 §0 agent_context block; CR-020 §3.3 Order of edits; FLASHCARD `2026-04-19 #wiki #protocol #mirror` (mirror parity).
- **Constraints:**
  - Wave 3 (CR-020) MUST follow Wave 2 (STORY-024-02) — protocol slim must merge before CR-020 amends it.
  - One-time §11.4 archive-immutability carve-out applies to STORY-024-02's citation rewrite only — citation §-substitutions allowed in archived files; no other body or frontmatter changes.
  - No CLI surface changes, no MCP tool surface changes, no hook additions in SPRINT-17. Pure doc + agent-prompt + template refactor.
  - Mirror parity invariant — every edit under `.claude/agents/`, `.cleargate/knowledge/`, `.cleargate/templates/`, or CLEARGATE-tag-block region of `CLAUDE.md` MUST mirror to canonical scaffold under `cleargate-planning/`.
