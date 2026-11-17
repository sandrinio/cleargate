# STORY-065-01 proof (rule 7, hand-applied)

- Proof column: Unit + integration — `proof-declared` reds; preflight on a fixture sprint; before/after gate sweep over `pending-sync/` unchanged.
- QA-Verify (2026-11-16): PASS, 6/6 scenarios; sealed reds `proof-declared.red` 11/11, `preflight-proof-tier.red` 2/2; R6 sweep 132 story/CR/bug items, 0 changed (before = 99cbfd7 gates doc, after = this item's); cut-over `2026-11-16T09:50:00Z` later than every pending `created_at`; holdout shapes probed.
- Post-flight FAIL (CRLF splitting; label continuation past a heading) → amendment reds 9e5b7c5 → fix afc88a7 → re-verify PASS (only the known S1c live-parity red) → post-flight PASS.
- Commits: qa-red 834fac6, dev 475b7c6, main merge 39e3c0e, amendment 9e5b7c5, fix afc88a7; cli main merge d669c7d.
