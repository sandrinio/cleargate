# CR-126 QA-Red report (role: qa)

QA-RED: WRITTEN
Files (cleargate-cli, branch cr/CR-126, uncommitted):
- test/lib/readiness-predicates-testing-strategy.red.node.test.ts (new; 65 tests, 65 fail at baseline, 0 pass)
- test/fixtures/testing-strategy/complete-epic.md (EPIC-063 verification plan reshaped; 5 journeys J1-J5)
- test/docs/test-layers-declared-doctrine.red.node.test.ts (SUPERSEDED pins: "exactly 12 predicate shapes" -> 13; "exactly 13 closed-set" -> 14; fails at baseline by design, 2 tests T11/T11A5)

Coverage: plan scenarios 1-11 (absent, unedited template, Eval empty/n-a incl. 4 dash forms, complete fixture with detail prefix + "5 journey(s)", exemption PASS (pending-sync, archive, filename fallback, exemption-first), exemption negatives STORY-9001-01/064-01/90-01, contract via gateCheckHandler x3, hook path via PATH stub of stamp-and-gate.sh, authorProbeEpic G4, registration in single epic fence, vocab entry 13, count pins, template placement/Brief line/ambiguity box/story.md line) plus journeys: absent, no rows, empty Walked by (names journey+column), placeholder cell, single-journey pass, n/a dash forms, bare n/a fails, 7 labels x (missing/empty/placeholder).
Baseline failure reasons: predicate tests throw "unsupported predicate shape: testing-strategy-complete" (53) ; template/registration/count/probe tests fail on missing section/entry/number; contract/hook tests fail on missing criterion (hook test first asserts cached_gate_result exists, which holds, proving the harness is sound).
Old-count grep across test/: only the doctrine file held the strings (updated).
Notes for Developer/Arch: gate-section-index-pinning live parity (S1c .live.integration) goes red until release re-sync. Exit seam tolerates exit(0). Detail strings asserted, not just pass flags. The 3 contract tests that expect non-listing carry a registration prerequisite assert so they are red now.

## Amendment (arch bounce 1)
Two S14 assertions changed in readiness-predicates-testing-strategy.red.node.test.ts; nothing else touched.
1. Section-order test now anchors on heading lines ('\n## 5. Acceptance Criteria', '\n## Testing Strategy\n', '\n## 6. AI Interrogation Loop'), since the Brief line inside <instructions> also contains "## Testing Strategy".
2. Ambiguity Gate checkbox pin now reads: "- [ ] Testing Strategy answers how we test this, including its user journeys and real-host proof or why it isn't needed." (orchestrator decision 7). No other assertion pinned the old wording.
RESULT_WITH_DEV_WIP: 65 tests, 65 pass, 0 fail (Developer's uncommitted implementation in place). Not committed.
