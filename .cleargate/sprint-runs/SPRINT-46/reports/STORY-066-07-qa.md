# STORY-066-07 QA-Verify (role: qa)
QA: PASS
TYPECHECK: pass
Tests: qa-red-lint-volume 3/3, seal-red.integration 5/5, qa-red-seal-content 1/1, qa-content.integration 21/22 (1 fail = rule-18 known red, slice parity). prebuild ok (Codex --check).
Surface: f846d9a..a81271a = qa_red_lint.mjs, seal_red.mjs, qa.md, qa.toml + 3 red files; Developer commit touches no sealed red file.
Manual fixture run (real git, Go layout, spaced path): clean -> exit 0, JSON tests 4/scenarios 4, one qa-red commit with exactly 2 files, no report left in worktree. 11 tests -> exit 1, flags [qa_red_lint]; trimmed to 8 -> exit 0 resealed:true. Re-seal after dev commit -> exit 2. Missing file -> exit 2, no commit. Fixture deleted.
ACCEPTANCE_COVERAGE: 5 of 5
MISSING: none
REGRESSIONS: none
