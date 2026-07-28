---
story: "STORY-051-09"
sprint: "SPRINT-38"
wave: "5"
agent: "qa"
modes: "[red, verify]"
verdict: "PASS (after one FAIL + one sustained FAIL, both orchestrator-caused)"
qa_bounces: "1"
transcribed_by: "orchestrator"
story_id: "STORY-051-09"
sprint_id: "SPRINT-38"
arch_bounces: "0"
---

# STORY-051-09 — QA report

## QA-Red

`QA-RED: WRITTEN` · one file `cleargate-cli/test/scaffold/enforcement-doc-coherence.node.test.ts`
(349 lines, committed `63d9016`). **26/26 legs red** on baseline across six clusters: gate-token
absence (4), phantom paths/module/placeholder (7), Bug.md anchor resolution (4), orphan absence (2),
autonomy-hook attribution behavioral leg (1), enforcement-doc coherence (8).

## QA-Verify — round 1: FAIL (scope boundary)

Functionally complete and correct: 5/5 Gherkin scenarios, re-map coherent as prose, phantoms
cleared, Bug.md anchors resolving, `launch_wave.mjs` comment-only, autonomy hook on `.agent_type`,
orphan gone from both tracked tiers with the payload correctly deferred, dogfood parity
byte-identical, 26/26 green under the worktree override, full-suite failures all classified as the
known pre-merge pattern, no stray `.cleargate/delivery/**` mutations.

Failed on one finding: the `cleargate-enforcement.md` `:20` and `:461` edits appeared unauthorized —
`M2.md` carried no record of any such ruling, and the story's §3.1 claimed orchestrator approval.

**Root cause: orchestrator record-keeping, not a Developer defect.** Both edits *were* approved at
wave-4 post-flight and recorded in `reports/STORY-051-08-arch.md` ("Wave-5 scope additions raised —
both APPROVED by the orchestrator", `91bb87f1`), then carried verbatim into the wave-5 QA-Red and
Developer dispatches — but never written back into the plan, which is what QA audits against.
QA's call was correct on the evidence available to it.

## QA-Verify — round 2: FAIL sustained (half-applied remediation)

The first remediation ran as a workflow whose Architect leg died on a 529 and returned `null`, so
`AD#5` was never written while the dependent story-doc edit (`cd476ee1`) landed citing it. QA caught
that the story now pointed at an amendment that did not exist — the same defect class, compounded.
Correct call.

Round 2 also raised a second objection — that AD#5 belonged in the story worktree's `M2.md` — which
was **overruled**: milestone plans are orchestrator-owned artifacts committed on the sprint branch
(`M0.md` `980274a6`, `M1.md` `356dc914`, `M2.md` `fd6a8542`, reports `91bb87f1`), never inside a
story worktree. The valid half — an uncommitted edit is not a record — was fixed by committing
`9ac01e33`.

## QA-Verify — round 3: PASS

```
QA: PASS
SCOPE_BOUNDARY: resolved — AD#5 committed on sprint/S-38 at 9ac01e33, authorizing exactly the two
                landed edits (:20 3rd-column-only, :461 gate-number-token-only), nothing more.
PLAN_CONSISTENCY: consistent — MUST-NOT-TOUCH row, R14 file-table cell, cross-story ownership table,
                08's file-table cell, and grounding notes all agree.
STRAY_MUTATIONS: none
TESTS: 26/26
```

Minor citation imprecision noted, not scope-affecting: the story's §3.1 says 08's
`CLEARGATE_CI_ACK` sentence is "on `:461`" where the plan's grounding notes place it at `:463`.

## Flashcards flagged

- `2026-07-27 · #orchestration #scope-discipline · Orchestrator rulings issued in DISPATCH text must be written back into the milestone plan …`
- `2026-07-27 · #qa-red #scope-discipline · Red tests written from dispatch-only scope additions read as overreach when audited against the blueprint …`
