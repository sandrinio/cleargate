---
cr_id: CR-024
parent_ref: CR-021 §3.2.4 / §3.2.5 (Reporter context-bundle pattern, SPRINT-18); SPRINT-18 QA cycle observations 2026-05-01
parent_cleargate_id: "CR-021 §3.2.4 / §3.2.5 (Reporter context-bundle pattern, SPRINT-18); SPRINT-18 QA cycle observations 2026-05-01"
parent_cleargate_id: null
sprint_cleargate_id: SPRINT-19
carry_over: false
status: Draft
ambiguity: 🟢 Low
context_source: "SPRINT-18 mid-execution observation 2026-05-01: QA pass-1 for STORY-025-04 only caught the silent R4 scope-drop because the orchestrator manually surfaced the missing context in the QA prompt; in a normal flow it would have green-lit the drop. Current QA cycle is 'tests pass + structural conformance' which catches structural defects but misses semantic ones. Conversation 2026-05-01 mapped the gaps (semantic correctness past Gherkin, adversarial probe, DoD §2.2 audit, spec-vs-impl drift, cross-story integration, regression boundary, lane-aware depth) and the recommended fix (script-built objective context pack + dev-emitted subjective handoff + lane-aware QA playbook). User 2026-05-01: 'agree with recommandation. please create CR and put it in the next sprint'."
proposal_gate_waiver:
  approved_by: sandrinio
  approved_at: 2026-05-01T22:00:00Z
  reason: Direct approval pattern. Recommendation laid out in conversation (script + handoff + lane playbook) and approved verbatim. No new design decisions; the CR maps 1:1 to two stories spelled out in chat.
approved: false
owner: sandrinio
target_date: SPRINT-19
created_at: 2026-05-01T22:00:00Z
updated_at: 2026-05-01T22:00:00Z
created_at_version: cleargate@0.10.0
updated_at_version: cleargate@0.10.0
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-05-01T12:37:18Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id CR-024
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-05-01T12:37:18Z
  sessions: []
---

# CR-024: QA Context Pack + Lane-Aware Playbook

**Lane:** `standard` — two stories, ~250 LOC + agent definition edits + dev STATUS=done schema change. Affects every future QA cycle.

## 0.5 Open Questions

- **Question:** Pack format — markdown bundle (mirrors `.reporter-context.md`) or structured YAML/JSON (machine-readable)?
  **Recommended:** **Markdown bundle** with embedded fenced-code blocks for structured fields (file lists, baseline failures). Matches `prep_reporter_context.mjs` pattern shipped in STORY-025-01; lets QA agent read it as prose instead of parsing.
  **Human decision:** _accept recommended unless objection_

- **Question:** Dev STATUS=done schema — extend the existing free-form block, or replace with strict YAML?
  **Recommended:** **Extend** — keep STATUS / COMMIT / TYPECHECK / TESTS / FILES_CHANGED / NOTES / flashcards_flagged as today, ADD new structured fields: `r_coverage:` (R-table: requirement → covered? deferred? CR-clarified?), `plan_deviations:` (list with reason), `adjacent_files:` (paths flagged for regression sweep). Backwards-compatible — old devs without the new fields don't break QA, just give it less context.
  **Human decision:** _accept recommended_

- **Question:** Lane playbook depth — 3 lanes (`fast` / `standard` / `runtime`) or fold runtime into standard with a sub-flag?
  **Recommended:** **3 lanes.** `fast` = doc-only stories (mirror diff + grep, skip typecheck/vitest). `standard` = source-code stories without runtime CLI surface (typecheck + targeted vitest). `runtime` = CLI/integration stories (everything in standard + exit-code matrix + `--help` + integration smoke). Maps cleanly to existing lane field; QA agent dispatches on it.
  **Human decision:** _accept recommended_

## 1. The Context Override (Old vs. New)

**Obsolete Logic (What to Remove / Forget):**
- QA prompt is hand-assembled per spawn by the orchestrator, with the orchestrator deciding ad-hoc what context to include. Current state: brittle (forgotten fields surface as wasted re-derivation or silent false-passes), inconsistent (each spawn looks different), and uniform-depth (doc-only stories pay the same typecheck + vitest cost as runtime stories).
- Dev STATUS=done block is free-form prose. Coverage table and plan-deviations are buried in `NOTES`, requiring orchestrator + QA to re-derive what the dev already knows.
- QA agent definition has one playbook regardless of lane. Fast-lane doc stories run typecheck and full targeted vitest unnecessarily.

**New Logic (The New Truth):**
- **`prep_qa_context.mjs <story-id> <commit-sha>`** script computes objective context: `main` baseline failures, adjacent-file regression candidates, cross-story interaction map, FLASHCARD slice by tag, story-and-plan path resolution. Output: `.cleargate/sprint-runs/<sprint>/.qa-context-<story-id>.md` (~10-20KB).
- **Dev STATUS=done** carries new structured fields (`r_coverage`, `plan_deviations`, `adjacent_files`) supplying subjective handoff information the script cannot derive.
- **QA agent definition** reads the pack as its first input, dispatches on `lane:` from frontmatter, executes the lane-specific playbook (fast / standard / runtime).
- Orchestrator's QA spawn prompt collapses to ~5 lines: worktree path + commit SHA + "read `.qa-context-<story>.md` and run the playbook."

## 2. Blast Radius & Invalidation

- [x] Updates `.claude/agents/qa.md` (live + canonical) — adds Capability Surface table mirroring the Reporter agent pattern from STORY-025-05; adds lane-playbook dispatch logic.
- [x] Updates `.claude/agents/developer.md` (live + canonical) — extends STATUS=done schema with `r_coverage` / `plan_deviations` / `adjacent_files`. Backwards-compatible: old format still parses, just gives QA less context.
- [x] New script `.cleargate/scripts/prep_qa_context.mjs` + tests under `.cleargate/scripts/test/test_prep_qa_context.sh`.
- [ ] No schema/migration impact (state.json untouched; sprint frontmatter untouched).
- [ ] No CLI surface change (no new `cleargate` subcommand — script invoked directly by orchestrator).
- [ ] No template changes.
- **Downstream invalidation:** None. Existing in-flight stories continue with old QA flow until SPRINT-19 ships. SPRINT-18 QA cycle does NOT retroactively benefit (intentional — avoid scope creep).

## 3. Execution Sandbox

**Two stories under this CR:**

### Story 1 — `prep_qa_context.mjs` script + schema (~150 LOC)

**Modify / Create:**
- `.cleargate/scripts/prep_qa_context.mjs` (NEW)
- `.cleargate/scripts/lib/qa-context-builder.mjs` (NEW — extracted helper if logic exceeds 50 LOC)
- `.cleargate/scripts/test/test_prep_qa_context.sh` (NEW — real-fixture bash test, mirrors -01)

**Pack contents (markdown sections):**
1. **Worktree + Commit** — path, branch, HEAD SHA, dev's claimed status
2. **Spec sources** — story.md path, plan.md path, design-spec section pointers
3. **Baseline** — `main` HEAD SHA, pre-existing failure count + filenames (from `main` test run cache; recompute if stale)
4. **Adjacent files** — `git diff --name-only main..HEAD` neighborhoods (test files in same dir as touched source files; mirror pairs of touched files)
5. **Cross-story map** — other in-flight stories in same sprint touching any file in adjacent-files; commit SHAs they live at
6. **FLASHCARD slice** — pre-grepped entries by tag derived from touched-file paths (e.g., `cleargate-cli/src/` touches → grep `#cli #commander`)
7. **Lane** — `fast` / `standard` / `runtime` from story frontmatter
8. **Dev handoff** — verbatim copy of dev's structured STATUS=done block

### Story 2 — Dev STATUS=done schema + QA agent lane playbook

**Modify:**
- `.claude/agents/developer.md` (live + canonical) — extend STATUS=done section with new required fields: `r_coverage:` (YAML list mapping R1..RN to covered/deferred/clarified), `plan_deviations:` (list of {what, why, orchestrator_confirmed}), `adjacent_files:` (list of paths likely-to-regress, dev's call). Examples + rationale in agent prose.
- `.claude/agents/qa.md` (live + canonical) — add Capability Surface table; add Lane-Aware Playbook section with three sub-checklists (fast / standard / runtime); add Pack-First instruction ("read `.qa-context-<story>.md` first; spec/plan/diff fall back to source files only when pack is incomplete").

**Lane playbook shapes:**
- `fast`: mirror diff + grep checklist + DoD §2.2 audit + spec-impl drift table. Skip typecheck/vitest unless adjacent-files include code.
- `standard`: fast playbook + typecheck + targeted vitest (touched-file neighborhoods only) + adversarial probe (1-2 boundary cases).
- `runtime`: standard playbook + exit-code matrix (CLI stories) + integration smoke (script stories) + `--help` text check.

## 4. Verification Protocol

**Story 1 acceptance:**
- `bash .cleargate/scripts/test/test_prep_qa_context.sh` passes against fixture sprint with 2 stories at different commits.
- Pack output ≤20KB on real STORY-025-01 fixture.
- Cross-story map correctly identifies STORY-025-04 ↔ CR-023 shared-file overlap on Sprint Plan Template.
- Missing inputs (no plan, no main baseline cache) reduce to one-liners and continue (matches -01 R4 resilience pattern).

**Story 2 acceptance:**
- Re-spawn the SPRINT-18 QA pass-1 scenario for STORY-025-04 against the new playbook + pack — must catch the silent R4 scope-drop in pass-1, not require orchestrator manual prompt augmentation.
- Doc-only stories (e.g., STORY-025-05 / -06 retroactive) run QA in <2 min (vs 6-14 min today); fast-lane spec verification mirrors the SPRINT-18 fast-lane stories (CR-023, STORY-025-05).
- Dev STATUS=done with old schema (no `r_coverage`) still passes QA — the missing fields produce a "QA: SCHEMA_INCOMPLETE — context limited" warning, not a hard fail. Backwards-compat assertion.

**Smoke test:**
- Spawn QA on a real SPRINT-19 story using the new pack + playbook end-to-end. Compare cycle time + signal quality vs SPRINT-18 baseline (target: ≥30% faster on doc-only; ≥50% reduction in orchestrator manual context augmentation).

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low — pending Gate 1 (push)**

Requirements to pass to Green (Ready for Execution):
- [x] Obsolete logic explicitly declared (free-form QA prompt, free-form STATUS=done, single playbook).
- [x] Two-story decomposition stated with concrete file lists.
- [x] Verification protocol cites specific assertions (cycle-time targets, retroactive STORY-025-04 scope-drop catch).
- [x] No downstream invalidation; SPRINT-18 unaffected.
- [ ] `approved: true` set in YAML — pending push (Gate 1 + Gate 3 covered together).
