# STORY-065-03 proof (rule 7, hand-applied)

- Proof column: Unit + integration — Done-guard reds; `merge_story.mjs` on a temp repo: pass → Done, pending → Sprint Review.
- QA-Verify (2026-11-16): PASS on the integrated tree d4dc3da, 6/6 scenarios. `done-guard.red` 7/7; `done-guard-merge.red.integration` 2/2 (`merge_story.mjs` on a real temp git repo: pending live evidence → Sprint Review with `awaiting proof: live (pending)`; container pass → Done with the evidence path); SPRINT-46 merge reds green; `test_update_state.integration` 3 failures are baseline (Sc2, Sc5). Probes: an `<instructions>`-first tiered item is guarded (C1 amendment); malformed evidence counts as missing; human pass → Done; untiered → Done.
- Commits: qa-red 9915f3c, dev b94ef3f, integration d4dc3da; cli main merge 0100761.
