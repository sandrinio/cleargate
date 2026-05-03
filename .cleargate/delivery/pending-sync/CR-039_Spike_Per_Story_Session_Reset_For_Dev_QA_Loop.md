---
cr_id: CR-039
parent_ref: EPIC-013
parent_cleargate_id: EPIC-013
sprint_cleargate_id: null
carry_over: false
status: Draft
approved: false
created_at: 2026-05-03T00:00:00Z
updated_at: 2026-05-03T00:00:00Z
created_at_version: cleargate@0.10.0
updated_at_version: cleargate@0.10.0
server_pushed_at_version: null
context_source: |
  Surfaced 2026-05-03 in markdown_file_renderer end-to-end install test.
  Token-cost analysis showed 96.5% of sprint cost (23M of 23.85M tokens) was
  cache_read. Examination of the ledger:

    - All 12 SubagentStop rows shared session_id 69df1822-3425-4408-bc7f-8fcd99856e58.
    - session_total grew monotonically: row 1 ~10k → row 11 ~10.5M → row 12 ~23M.
    - Each new agent dispatch (architect → dev1 → qa1 → dev2 → qa2 → ...)
      inherited the cumulative cache from all prior turns.
    - Dev for STORY-001-05 (row 9) carried 10.2M cache_read in its session_total —
      that's the cumulative cost of stories 1-4's agent reasoning re-cached for
      story 5's dev to "read past" before doing its work.

  CR-036 fixes the Reporter dispatch (largest single contributor at 13M).
  Remaining structural cost: each dev+qa pair inherits the prior pair's
  session context. Even with perfect per-agent prompts, ~3-5M tokens per
  sprint go to "re-read what the prior story's agents did, even though I
  don't need it."

  Hypothesis: dispatching each Developer (and each QA) in a fresh session_id
  drops cumulative cache_read by 3-5M tokens per sprint, with NO loss of
  correctness — each story's dispatch only needs (a) the story file, (b)
  the milestone plan, (c) the four-agent contract, (d) the test target.
  None of those require knowledge of prior stories' execution traces.

  This is a spike CR — not an implementation CR. The unknowns:
    1. Does Claude Code's `Agent` tool support session_id override on dispatch?
       Or is it inherited automatically from the orchestrator's session?
    2. If session reset is supported, what does it cost in cache-creation
       overhead (re-loading the four-agent contract + per-story prompt)?
    3. Does the token-ledger hook attribution still work correctly when
       dispatched agents have new session_ids? (Ledger row schema includes
       session_id; downstream consumers may key on it.)
    4. What's the right granularity — per-story reset, per-milestone reset,
       per-wave reset?

  Spike output: a written investigation memo + a recommendation. If
  recommendation is "go," follow-up implementation CR (CR-040-suggested) lands
  the change. If "no-go" (e.g., SDK doesn't support session reset cleanly),
  document the cost ceiling and move on.
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-05-03T17:47:43Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id CR-039
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-05-03T17:46:58Z
  sessions: []
---

# CR-039 (SPIKE): Investigate Per-Story Session Reset for Dev+QA Dispatches

> **This is a spike CR, not an implementation CR.** Output is an investigation
> memo + go/no-go recommendation. Implementation lands as CR-040-suggested if
> the spike recommends "go."

## 0.5 Open Questions

- **Question:** Spike output format — written memo vs prototype branch vs both?
  - **Recommended:** **memo + minimal prototype**. Memo answers the four unknowns; prototype validates the cost-savings claim against a single fresh sprint. Both fit in one developer-day.
  - **Human decision:** _populated during Brief review_

- **Question:** Spike scope — Dev+QA only, or also Architect?
  - **Recommended:** **Dev+QA only** for v1. Architect runs once per sprint (bundled M1 plan, per the sprint-execution skill default); minimal cumulative cost. Dev+QA loops per-story; that's where the cumulative cache compounds.
  - **Human decision:** _populated during Brief review_

- **Question:** Spike duration cap?
  - **Recommended:** **1 developer-day max**. If unknowns 1-2 can't be answered in a day, the SDK likely doesn't expose what we need cleanly — record findings and close as "no-go for v1."
  - **Human decision:** _populated during Brief review_

- **Question:** Sprint inclusion?
  - **Recommended:** SPRINT-21 if capacity allows (low-risk spike, high-leverage finding). Otherwise SPRINT-22 candidate.
  - **Human decision:** ✅ SPRINT-21 (confirmed 2026-05-03). W4 Developer dispatch 8 (solo). If W1–W3 wall-clock budget runs hot, defers to SPRINT-22 carry-over per sprint plan §3 mitigation.

## 1. The Context Override (Old vs. New)

**Obsolete Logic (What to Remove / Forget):**

- The implicit assumption that session_id sharing across agent dispatches in a sprint is free or unavoidable. Per-story session inheritance carries 3-5M tokens of cache_read overhead per sprint that no agent actually uses.
- The orchestrator pattern in `.claude/skills/sprint-execution/SKILL.md` (Wave 1 dispatch loops) doesn't address session boundaries — it dispatches via `Agent` tool with `subagent_type` and lets session continuity happen by default.

**New Logic (The New Truth — POST-SPIKE):**

To be determined by spike output. Two possible end-states:

- **Go:** orchestrator dispatches each Developer (and each QA) with fresh session_id. Cumulative sprint cache_read drops 3-5M tokens. Implementation CR-040-suggested lands the orchestrator change + token-ledger schema check.
- **No-go:** SDK doesn't support session reset cleanly. Document cost ceiling. Possibly file CR-041-suggested for a different cost lever (e.g., per-wave Architect refresh of bundled context).

## 2. Blast Radius & Invalidation

- [x] **Spike itself:** zero blast radius. Investigation only; no production code change.
- [x] **Possible follow-up CR-040:** if spike says "go," that CR touches orchestrator dispatch logic + possibly token-ledger schema. Blast radius scoped THERE, not here.
- [ ] **Update Epic:** EPIC-013 (execution phase v2 — orchestrator dispatch contract).
- [ ] **Database schema impacts:** None for spike. Possibly token-ledger schema for follow-up CR.
- [ ] **MCP impacts:** None.
- [ ] **Coupling with CR-036** (Reporter diet): both target cost reduction. Independent in code; complementary in user effect. CR-036 first (largest lever); CR-039 spike runs after CR-036 to see what's left.
- [ ] **FLASHCARD impact:** add card on spike completion documenting either the go-recommendation or the no-go ceiling.

## Existing Surfaces

> L1 reuse audit. Spike investigates these surfaces; does NOT modify them.

- **Surface:** `.claude/skills/sprint-execution/SKILL.md` §C.3 — Developer dispatch site; spike examines whether `Agent` tool supports session_id override here.
- **Surface:** `.claude/hooks/token-ledger.sh` — SubagentStop hook attribution; spike verifies ledger row schema still works when dispatched agents have new session_ids.
- **Surface:** `.cleargate/sprint-runs/<id>/token-ledger.jsonl` — ledger format; spike's prototype writes against this same schema.
- **Surface:** Anthropic SDK `Agent` tool — external surface; spike investigates `session_id` parameter / inheritance behavior.
- **Why this CR extends rather than rebuilds:** spike output is a memo + optional prototype branch; production surfaces unchanged. Implementation lives in follow-up CR-040-suggested if spike says go.

## 3. Execution Sandbox

**Spike deliverables (1 markdown memo + optional prototype branch):**

- `.cleargate/sprint-runs/<sprint-id>/spikes/CR-039_session_reset_memo.md` — written investigation answering the four unknowns:
  1. SDK support for session_id override on `Agent` dispatch — confirmed yes/no with code references.
  2. Cache-creation overhead of fresh session per dispatch — measured against a fixture sprint.
  3. Token-ledger attribution behavior with new session_ids — tested via a single dispatch + ledger inspection.
  4. Right granularity (per-story / per-milestone / per-wave) — recommendation with rationale.
- (Optional) prototype branch `spike/cr-039-session-reset` — minimal change to one Developer dispatch site that uses fresh session_id; run a 2-story fixture sprint and capture ledger; compare cumulative tokens vs baseline.

**Spike does NOT modify:**

- Production orchestrator code (`.claude/skills/sprint-execution/SKILL.md`).
- Token-ledger schema or attribution.
- Any agent prompt.
- Any close pipeline behavior.

**Out of scope for the spike:**

- Implementing the session-reset change in production.
- Architect dispatch boundaries (per §0.5 Q2).
- Cross-sprint context inheritance (separate concern).

## 4. Verification Protocol

**Acceptance (spike completion criteria):**

1. **Memo exists.** `.cleargate/sprint-runs/<sprint-id>/spikes/CR-039_session_reset_memo.md` written, ≥500 words, addresses all four unknowns with code or measurement references.
2. **Recommendation is unambiguous.** Memo concludes with one of: "GO — file CR-040 with scope X" / "NO-GO — reason Y" / "PARTIAL — go for case A, defer case B."
3. **(Optional) Prototype delta measured.** If prototype branch exists, ledger comparison shows actual cache_read delta against baseline (target ≥3M tokens saved per 5-story sprint). Memo cites the number.
4. **(If GO) Follow-up CR drafted.** CR-040 draft sits in `pending-sync/` referencing this spike's memo as `context_source`.
5. **(If NO-GO) Cost ceiling documented.** Memo states the residual cumulative-cache cost the framework cannot avoid without breaking session inheritance, and what would have to change in the SDK or orchestrator pattern to enable it later.

**Test commands:**

- Per the spike memo's measurement method (likely: dispatch a 2-agent loop with current pattern, capture session_total; dispatch with fresh session_id, capture session_total; diff).

**Pre-commit:** one commit `spike(CR-039): session reset investigation memo + (optional) prototype`; never `--no-verify`.

**Post-commit:** archive CR file; append flashcard line documenting the go/no-go decision.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)

**Current Status: 🟡 Medium Ambiguity**

- [x] Spike charter clear (4 unknowns enumerated).
- [x] Spike NOT an implementation CR (explicit in title + §1).
- [x] Output deliverables named (memo + optional prototype).
- [x] Acceptance criteria define spike completion.
- [ ] **Open question:** Output format — memo only vs memo+prototype (§0.5 Q1).
- [ ] **Open question:** Scope — Dev+QA only vs include Architect (§0.5 Q2).
- [ ] **Open question:** Duration cap (§0.5 Q3).
- [x] ~~**Open question:** Sprint inclusion (§0.5 Q4).~~ Resolved 2026-05-03: SPRINT-21 (W4).
- [ ] `approved: true` is set in the YAML frontmatter.
