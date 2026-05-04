---
cr_id: CR-056
parent_ref: EPIC-013
parent_cleargate_id: EPIC-013
sprint_cleargate_id: SPRINT-25
carry_over: false
status: Draft
approved: false
created_at: 2026-05-04T19:00:00Z
updated_at: 2026-05-04T13:30:00Z
created_at_version: cleargate@0.10.0
updated_at_version: cleargate@0.10.0
context_source: |
  SPRINT-23 + SPRINT-24 close pipelines run `suggest_improvements.mjs`
  Step 6.6 to scan for skill creation candidates. Both sprints
  produced an identical candidate:

    CAND-SPRINT-23-S01: CR-045 × architect (hash:6b1802)
    CAND-SPRINT-24-S01: CR-045 × architect (hash:6b1802)

  Pattern detected: "CR-045 × architect repeated ≥3× in token-ledger".

  CR-045 is the Sprint Context File CR (shipped SPRINT-23). The
  "≥3× in token-ledger" heuristic is detecting a side-effect of
  session-sharing: when multiple architect dispatches run within the
  same session, the token ledger attributes them all to the same
  bucket. CR-045 was the first-merged CR in SPRINT-23; subsequent
  Architect dispatches in the same session got bucketed under
  CR-045's work_item_id.

  This is NOT a real recurring pattern that warrants a dedicated
  skill — it's a token-attribution artifact. Yet the heuristic flags
  it every sprint, generating false-positive noise in
  improvement-suggestions.md.

  CR-056 has 2 phases:
  1. INVESTIGATE: read the heuristic in suggest_improvements.mjs;
     verify the diagnosis (false-positive vs real pattern).
  2. ACT:
     (a) If false-positive, fix the heuristic (deduplicate by hash
         across sprints OR exclude session-shared bucket attribution
         OR add work-item-type filter).
     (b) If real pattern (e.g., a sub-flow in Architect dispatches
         that genuinely repeats and could be skill-extracted),
         design + ship the skill.

  Recommend (a). Real skill candidates would need stronger evidence
  (manual review, multi-CR pattern across non-shared sessions).
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-05-04T19:03:19Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id CR-056
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-05-04T18:56:29Z
  sessions: []
---

# CR-056: Skill Candidate Heuristic — Investigation + Fix

## 0.5 Open Questions

- **Question:** Investigation budget?
  - **Recommended:** ≤ 30 min Dev investigation. Read `suggest_improvements.mjs --skill-candidates` logic; manually trace the "CR-045 × architect" attribution path; confirm false-positive hypothesis. Document in findings report. If real pattern is found instead, surface to human + scope a follow-up CR for next sprint (don't try to ship skill in CR-056 if it's substantive design work).
  - **Human decision:** _populated during Brief review_

- **Question:** False-positive fix shape?
  - **Recommended:** add a deduplication step: if a candidate's `hash` already appears in a prior sprint's `improvement-suggestions.md` AND the prior candidate has not been actioned (no skill at `.claude/skills/<slug>/SKILL.md` corresponding), surface as `seen_in: [SPRINT-23, SPRINT-24, SPRINT-25]` instead of duplicating. Human reviews once; can mark as "rejected — token-attribution artifact" via a manual entry in a `seen-and-rejected.md` doc.
  - **Human decision:** _populated during Brief review_

- **Question:** Scope-cut threshold?
  - **Recommended:** if investigation reveals (a) the heuristic is one fixable line, scope-cut to that fix only. (b) If it's structural (deep refactor needed), ship a 1-line guard that excludes the false-positive class, log a flashcard noting "heuristic needs SPRINT-26 redesign", surface in §6 Tooling for Reporter.
  - **Human decision:** _populated during Brief review_

- **Question:** Should CR-056 also action the FLASHCARD cleanup candidates?
  - **Recommended:** NO. Cleanup candidates need `[S]` / `[R]` markers applied per FLASHCARD Rule 7. That's a separate user-approval gate (`/improve` or `cleargate flashcard prune`); orchestrator must not bulk-apply. CR-056 stays scoped to skill-candidate heuristic; flashcard cleanup is human-driven post-sprint.
  - **Human decision:** _populated during Brief review_

- **Question:** What if the heuristic is just genuinely too aggressive (signal-to-noise issue beyond CR-045)?
  - **Recommended:** raise the bar. Threshold from "≥3× in token-ledger" to "≥3× across ≥2 distinct sprints AND not session-shared". Easy to retrofit; doesn't change the candidate-format output.
  - **Human decision:** _populated during Brief review_

## 1. The Context Override (Old vs. New)

**Obsolete Logic (What to Remove / Forget):**
- "≥3× in token-ledger" is a meaningful signal for skill-creation candidates.
- Every sprint's improvement-suggestions.md should re-flag the same hash.

**New Logic (The New Truth):**
- The skill-candidate heuristic deduplicates across sprints by hash.
- Session-shared attribution (multiple architect dispatches in one session bucketing to the first-merged work_item_id) is filtered out before pattern detection.
- Threshold raised to "≥3× across ≥2 distinct sprints AND not session-shared".
- The "CR-045 × architect" candidate is documented as a known false-positive in the heuristic's source comments.

## 2. Blast Radius & Invalidation

- [ ] **`.cleargate/scripts/suggest_improvements.mjs`** (or the corresponding `cleargate-cli/src/lib/` module that backs it) — heuristic refactor. Add deduplication + session-shared filter + threshold raise.
- [ ] **`cleargate-cli/test/lib/suggest-improvements-heuristic.red.node.test.ts`** — NEW. 3 scenarios:
  - false-positive class (session-shared) is filtered out.
  - real pattern (≥3× across ≥2 sprints) still flagged.
  - dedup: same hash already actioned → not re-surfaced.
- [ ] **Investigation report:** `.cleargate/sprint-runs/SPRINT-25/skill-candidate-heuristic-findings.md` — Dev's pre-fix analysis (≤300 words).
- [ ] **No SKILL.md edit** — internal close-pipeline tool.
- [ ] **No skill creation** in CR-056 — that's a follow-up CR if real pattern surfaces.

## Existing Surfaces

- **Surface:** `.cleargate/scripts/suggest_improvements.mjs` — close-pipeline Step 6.6 entry point. Dev's investigation also confirms whether logic lives entirely in this file or also in a `cleargate-cli/src/lib/` companion module.
- **Surface:** `.cleargate/sprint-runs/SPRINT-23/improvement-suggestions.md` — historical false-positive evidence (sprint 1 of 2).
- **Surface:** `.cleargate/sprint-runs/SPRINT-24/improvement-suggestions.md` — historical false-positive evidence (sprint 2 of 2).
- **Surface:** `.cleargate/sprint-runs/SPRINT-23/token-ledger.jsonl` — token-attribution data (sprint 1 of 2).
- **Surface:** `.cleargate/sprint-runs/SPRINT-24/token-ledger.jsonl` — token-attribution data (sprint 2 of 2).
- **Why this CR extends rather than rebuilds:** `.cleargate/scripts/suggest_improvements.mjs` is a working tool; CR-056 tightens one heuristic. No rebuild.

## 3. Execution Sandbox

**Investigate:**
- Read suggest_improvements.mjs source
- Trace the "CR-045 × architect" attribution
- Manually compute: did SPRINT-23 + SPRINT-24 actually have ≥3× distinct architect dispatches with `work_item_id: CR-045`?

**Modify:**
- suggest_improvements.mjs (or backing src/lib module): heuristic refactor

**Add:**
- New Red test
- Investigation findings report

**Out of scope:**
- Designing or shipping any new skill
- FLASHCARD cleanup
- Refactoring suggest_improvements.mjs beyond the skill-candidate heuristic
- Other improvement-suggestions categories (trends, flashcard-cleanup) — separate concerns

## 4. Verification Protocol

**Acceptance:**
1. Investigation findings report at `.cleargate/sprint-runs/SPRINT-25/skill-candidate-heuristic-findings.md` — diagnoses CR-045 × architect as false-positive (or surfaces real pattern with evidence). ≤ 300 words.
2. Heuristic in suggest_improvements.mjs (or backing module) deduplicates by hash, filters session-shared, raises threshold per Open Q5 default.
3. NEW Red test passes 3 scenarios: false-positive filtered; real pattern flagged; dedup works.
4. SPRINT-25's own Gate-4 close runs Step 6.6; the resulting `.cleargate/sprint-runs/SPRINT-25/improvement-suggestions.md` does NOT contain CR-045 × architect (or contains it with `seen_in: [SPRINT-23, SPRINT-24, SPRINT-25] — known false-positive` marker).
5. Mirror parity: if `suggest_improvements.mjs` has a canonical mirror, both updated lockstep.
6. `cd cleargate-cli && npm run typecheck && npm test` exits 0.

**Test Commands:**
- `cd cleargate-cli && npm test -- test/lib/suggest-improvements-heuristic.red.node.test.ts`
- (manual) Re-run suggest_improvements.mjs against SPRINT-23 + SPRINT-24 fixtures; verify no false-positive surfaces.

**Pre-commit:** `cd cleargate-cli && npm run typecheck && npm test`. Never `--no-verify`.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟡 Yellow — Awaiting Brief approval**

- [x] §0.5 Open Questions surfaced (5 questions, all with recommended defaults).
- [x] §3 Execution Sandbox lists files to touch.
- [x] §4 Verification Protocol has testable acceptance.
- [ ] Human approves §0.5 defaults.
- [ ] Lane assigned at SDR (preliminary: standard — investigation + multi-file refactor + new test).
- [ ] Investigation may scope-cut (per Open Q3).

---
