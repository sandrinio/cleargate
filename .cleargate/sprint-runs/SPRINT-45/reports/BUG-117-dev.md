# BUG-117 dev report
Commit: af7d639 on story/BUG-117
Files: src/lib/pricing.ts, test/lib/pricing.node.test.ts
Typecheck: pass. Tests: pricing 14 pass/0 fail; doctor-pricing 5 pass/0 fail.
Repro now: claude-opus-5-5 {"usd":4}, claude-sonnet-5-5 {"usd":2}, claude-opus-4-7 {"usd":5}, all unknownModel false.
No other pins of old prices found in test/ or src/.
