---
bug_id: BUG-008
parent_ref: EPIC-008
status: Verified
severity: P2-Medium
reporter: orchestrator
sprint: SPRINT-14
milestone: M2
approved: true
approved_at: 2026-04-26T00:00:00Z
approved_by: sandrinio
created_at: 2026-04-26T00:00:00Z
updated_at: 2026-04-26T00:00:00Z
created_at_version: cleargate@0.5.0
updated_at_version: cleargate@0.5.0
server_pushed_at_version: null
cached_gate_result:
  pass: false
  failing_criteria:
    - id: repro-steps-deterministic
      detail: section 2 has 0 listed-item (≥3 required)
    - id: no-tbds
      detail: 17 occurrences at §2, §3, §6
  last_gate_check: 2026-04-26T11:09:58Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
context_source: |
  SPRINT-14 kickoff 2026-04-26 — three distinct gate-criteria over-match patterns surfaced
  during the gate-writeup paperwork sweep. Treat as one bug because they share a root class
  (criteria match strings without scope awareness). Filed as the M2 small-wins surface.
stamp_error: no ledger rows for work_item_id BUG-008
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-04-26T11:09:58Z
  sessions: []
---

# BUG-008: Gate-Check Criteria Over-Match — `proposal-approved`, `no-tbds`, `blast-radius-populated`

## 1. The Anomaly (Expected vs. Actual)

**Expected Behavior:** Each gate criterion in `cleargate gate check` (and the SessionStart hook's gate roll-up) should match the *semantic* condition it names. A criterion id like `proposal-approved` should pass when the work item references an approved proposal, regardless of the prose used in `context_source`. `no-tbds` should pass when no genuine TBD markers exist in the spec body. `blast-radius-populated` should pass when the document's blast-radius section contains at least one listed item.

**Actual Behavior:** Three criteria over-match by treating prose as machine syntax:

1. **`proposal-approved` reads `context_source` as a file path.** EPIC-021 carries `context_source: "User direct request 2026-04-25 — proposal gate waived (sharp intent + inline references)..."`. The gate-check returns `linked file not found: User direct request 2026-04-25 — proposal gate waived...` — it path-tests the entire comment text. Same failure mode hits EPIC-014 and EPIC-016.
2. **`no-tbds` matches the literal substring `TBD` inside legitimate words.** CR-010 §2 contains the prose phrase *"TBD resolution"* (referring to the *concept* of resolving TBDs). EPIC-020's pass-criteria checklist contains the literal line `- [x] 0 "TBDs" exist in the document.` — gate fires on its own self-referential text. Both are false positives; neither is an actual TBD marker.
3. **`blast-radius-populated` mis-indexes which section to count.** CR-011 §1 ("Context Override") contains 4+ bullets; the gate reports *"section 1 has 0 listed-item (≥1 required)"*. The criterion is plausibly meant to count §2 ("Blast Radius") but pulls §1, or the bullet-detector misses the actual bullets. Either way the criterion mis-locates the section it audits.

Net effect: SessionStart blocked-count banner is dominated by false positives. Real engineering blockers are buried.

## 2. Reproduction Protocol

**Repro for #1 (`proposal-approved` path-as-prose):**

1. From repo root: `cat .cleargate/delivery/pending-sync/EPIC-021_Solo_Onboarding_DX.md | head -25`. Note `context_source` carries human prose (not a file path).
2. Run `cleargate gate check .cleargate/delivery/pending-sync/EPIC-021_Solo_Onboarding_DX.md`.
3. Observed: `failing: proposal-approved — linked file not found: User direct request 2026-04-25 — proposal gate waived...`
4. Expected: pass (the proposal gate waiver is a documented standing rule per `feedback_proposal_gate_waiver.md`; the criterion should not treat prose as a path).

**Repro for #2 (`no-tbds` substring match):**

1. `grep -n "TBD" .cleargate/delivery/pending-sync/CR-010_Advisory_Readiness_Gates_On_Push.md` → exactly one hit, in the prose phrase "TBD resolution" (line ~44, conceptual reference).
2. Run `cleargate gate check .cleargate/delivery/pending-sync/CR-010_Advisory_Readiness_Gates_On_Push.md`.
3. Observed: `failing: no-tbds — 1 occurrence at §2`.
4. Expected: pass (no genuine TBD markers — the word appears as a noun referring to the concept).

**Repro for #3 (`blast-radius-populated` mis-indexing):**

1. `awk '/^## 1\./,/^## 2\./' .cleargate/delivery/pending-sync/CR-011_Capability_Gating_By_Membership.md | head -20` → confirms §1 contains 4+ bulleted items.
2. Run `cleargate gate check .cleargate/delivery/pending-sync/CR-011_Capability_Gating_By_Membership.md`.
3. Observed: `failing: blast-radius-populated — section 1 has 0 listed-item (≥1 required)`.
4. Expected: pass (or the criterion should target §2 if the spec demands the *Blast Radius* section specifically — fix whichever is correct).

## 3. Evidence & Context

```
[from SessionStart 2026-04-26]
SessionStart:clear hook success: 24 items blocked:
  BUG-002: repro-steps-deterministic
  BUG-003: repro-steps-deterministic
  BUG-005: repro-steps-deterministic
  BUG-006: repro-steps-deterministic        ← already fixed; was in pending-sync; now archived
  CR-010: no-tbds                           ← #2 above
  CR-011: blast-radius-populated            ← #3 above
  EPIC-014: proposal-approved               ← #1 above
  EPIC-016: proposal-approved               ← #1 above
  EPIC-020: no-tbds                         ← #2 above
  EPIC-021: proposal-approved               ← #1 above
  …14 more
```

Of the 24, ≥7 are pure false positives covered by this bug. The remaining real blockers (BUG-002/003/005 missing repro steps, PROPOSAL-011 architecture-populated) are legitimate engineering work and are NOT in scope for BUG-008.

## 4. Execution Sandbox

**Investigate / modify:**

- The gate-criteria implementation. Locate via `grep -rn "proposal-approved\|no-tbds\|blast-radius-populated" cleargate-cli/src/ mcp/src/` and read the criterion definitions before editing.
- Likely surface: a gate-criteria registry / dispatcher in `cleargate-cli/src/lib/` or `cleargate-cli/src/commands/gate.ts`. Verify the actual path before invoking changes.
- Test surface: wherever gate-check criteria currently have unit tests (likely `cleargate-cli/test/commands/gate.test.ts` or similar).

**Do NOT touch:**

- The SessionStart hook (CR-008/009 own those).
- `mcp/src/tools/push-item.ts` (CR-010 owns gate-result interpretation; this bug is about how `cached_gate_result` is *computed*, which is upstream of CR-010's interpretation logic).
- Any criterion not explicitly listed in §1 above. If you find another gate criterion with a similar bug while in here, file a new bug rather than expanding scope.

**Out of scope:**

- Refactoring the gate-criteria framework. Each fix is a scoped match-logic correction, not a redesign.
- Renaming criterion ids.

## 5. Verification Protocol

Each of the three sub-fixes ships with a regression test. The new test must FAIL on the current code and PASS after the fix.

**Test 1 — `proposal-approved` does not path-test prose:**

Given a fixture work-item with `context_source` containing prose (e.g. `"User direct request — proposal gate waived (sharp intent + inline references)"`), the criterion passes if a `proposal_gate_waiver` field exists in frontmatter OR if `context_source` matches a real path that exists. Prose-only `context_source` with a documented waiver passes.

A second sub-test: `context_source: "PROPOSAL-999.md"` referencing a file that does NOT exist on disk MUST still fail the criterion. The fix is *only* about not treating arbitrary prose as a path — real broken file references must still be caught.

**Test 2 — `no-tbds` matches genuine markers, not substrings inside words:**

Given a fixture body containing the prose word `"TBD resolution"`, the criterion passes (TBD is a noun, not a marker). Given a fixture body containing `TBD: <something>` or `(TBD)` or a bare line `TBD` — the criterion fails. The matcher should require either:
- `TBD` followed by a colon, parens-bound, or as the entire trimmed line; OR
- `TODO:` / `FIXME:` similar marker syntax.

A second sub-test: the self-referential template line `- [x] 0 "TBDs" exist in the document.` must NOT trigger the gate (it is template boilerplate, not a TBD marker).

**Test 3 — `blast-radius-populated` targets the correct section:**

Given a CR fixture whose §2 ("Blast Radius") has bullets, the criterion passes. Given a CR fixture whose §2 is empty (or absent), the criterion fails with a clear error naming §2. Verify by reading the CR template (`templates/CR.md`) which section the criterion is contractually pointed at and align the implementation to the contract. If the template names a different section number than what the criterion currently scans, the implementation matches the template, not vice versa.

**Post-fix smoke:**

1. `cleargate gate check` on each of CR-010, CR-011, EPIC-020, EPIC-021 should now pass for the criteria in scope.
2. `cleargate doctor --session-start` blocked-count should drop by ≥7 vs. pre-fix baseline.

**Pre-commit gates:**

- Unit tests must include the regression cases above.
- `npm run typecheck` clean.
- `npm test` green for the affected package.
- Commit message: `fix(BUG-008): SPRINT-14 M2 — gate criteria over-match (proposal-approved/no-tbds/blast-radius-populated)`.
