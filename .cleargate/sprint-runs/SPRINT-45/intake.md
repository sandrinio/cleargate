# SPRINT-45 Intake

Items found mid-sprint (rule 9). An item enters the sprint only with the owner's recorded OK.

| Date | Finding | Class | Owner decision | Route |
|---|---|---|---|---|
| 2026-11-14 | `upgrade --dry-run` labels `gate-checks.json` "overwritten, local edits lost" and `--yes` prints "(local edits replaced)", but upgrade restores the repo's gate commands (dispenser copies: byte-identical / only empty values filled) | UR:bug (BUG-133) | Fix in-sprint ("i'll go with what you recommend", 2026-11-14) | BUG-133 r2, SC-7 |
| 2026-11-14 | dispenser SPRINT-02 `unattributed.share` 0.075 > 0.05: SPIKE-001 prototype dispatches in the same session, which the holdout also lists as non-sprint | UR:review-feedback (goal check 1) | Accept as measured; the goal verdict reports check 1 partial on SPRINT-02; no rule change | Reporter verdict |
| 2026-11-14 | Reporter bundle ~197 KB vs 160 KB budget (pre-existing; Measured Metrics adds ~1.4 KB) | UR:review-feedback | Defer to a later sprint | Carry-over note in the report |
| 2026-11-14 | Pricing table should refresh from OpenRouter's public model list (build-time `pricing:refresh` + staleness gate, not runtime fetch) | CR:scope-change | Draft the CR after close | Not this sprint |
| 2026-11-14 | `sprint_metrics` R4 files a dispatch after an item's first merge as `post_merge`, never as a round, so a walkthrough UR:bug round (BUG-133 r2) reads derived rework 0; only the git disagreement line shows it | finding (measurement definition) | Not this roster; for a later CR (count walkthrough rounds separately in the report) | Report §improvement |
| 2026-11-14 | `test_close_sprint_v21.integration` Scenario 10 still expects `prep_reporter_context.mjs` to exit 1 on a missing ledger (untrue since BUG-081, already red at dbccc79); 105 integration tests red before the sprint and unlisted because `npm test` skips integration files | finding (test debt) | Not this roster; for a later sprint | Report §improvement |
