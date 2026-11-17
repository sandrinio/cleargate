# STORY-065-06 proof (rule 7, hand-applied)

- Proof column: Unit + integration — a fixture sprint closed end to end with one unproven item; Step 2.5 on the new report template.
- QA-Verify (2026-11-16): PASS on the integrated tree 927c793, 5/5 scenarios; sealed reds close-evidence-step 8/8, close-evidence.red.integration 2/2; close-sprint-fence.red 4/4; reporter-content 14/14; prep-reporter tests green; the 5 failures in test_close_sprint_v21/close-sprint-reconcile are on the 99cbfd7 baseline list.
- Fixture close runs (worktree scripts staged into temp git repos, evidence written by the real record_evidence.mjs): all proven → "proven at <tier>" lines; a Sprint Review live item → "built, not proven at tier live (pending)" and the ack prompt names it; ack pass → unproven.json, item stays Sprint Review, carry_over true + proof_pending live, goal_verdict_acked_at stamped; green deferred-verify counted; untiered → "no proof tier declared (not guarded)"; Step 2.5 met/mostly/absent → pass/fail/pass; bundle "## Evidence" with goal tier.
- Commits: qa-red d714e3f, dev f8afa56, integration 927c793; cli main merge b4702a5.
