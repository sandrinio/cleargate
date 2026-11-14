# BUG-117 QA-Verify (role: qa)
QA: PASS
- Commit af7d639 touches only src/lib/pricing.ts and test/lib/pricing.node.test.ts.
- All nine section-3 rows match cell by cell (checked in diff).
- Gherkin: 7 outline rows + unknown-model test present (14 tests total, 8 new). Old table lacked 5 Claude-5 rows (unknownModel true) and had opus-4-7 at 15, haiku-4-5 at 0.8, so those assertions fail on the old table; unknown-model row is a guard that already held.
- typecheck exit 0; pricing test 14/14; doctor-pricing test 5/5. No stale price pins in src/ or test/.
- Advisory: cache_read/cache_creation/output are not asserted by the new rows (only the input price and the opus-4-7 composite); verified by reading the diff instead.
