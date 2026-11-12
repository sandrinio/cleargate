# STORY-063-10-F1 Dev (role: developer)

STATUS: done
COMMIT: 40196f2 (branch story/STORY-063-10-F1, cleargate-cli)
TYPECHECK: pass
TESTS: full npm test 4749 tests, 4747 pass, 0 fail, 2 skipped. decisions-*.node.test.ts 196/196. Live pair 2/2.

Live: page has exactly 1 `- Supersedes:` line, on EPIC-063 ([[EPIC-020]]); STORY-063-10 has none. items=623 answered=402 decisions.md=32848 tokens.
Delivery porcelain before/after the full run: identical (only the owner's untracked CR-131 file).

FILES_CHANGED: src/wiki/synthesis/decisions.ts, templates/synthesis/decisions.md, scaffold/hosts/claude/.claude/agents/cleargate-wiki-query.md, scaffold/hosts/codex/.codex/agents/cleargate-wiki-query.toml (regenerated), test/wiki/decisions-unit.red.node.test.ts, test/wiki/decisions-wiring.red.node.test.ts

NOTES: F1-1 line-based G-M2-57 rule (table row, backtick/quote parity, same-line token starting with ID; not/never sentence guard, by guard, self-drop, dedup kept; fences not stripped). F1-2 sections ordered by body offset. F1-3 per-entry supersedes copy. F1-4 header wording. F1-5 query-agent sentence, gen:codex, payload+manifest rebuilt, build-codex-payload --check exit 0.
Authorized shape changes (orchestrator ruling): decisions-unit.red.node.test.ts:98 and decisions-wiring.red.node.test.ts:87 now pin the F1-4 sentence (same includes() check), each with trailing `// superseded by STORY-063-10-F1 F1-4`.

plan_deviations: []
flashcards_flagged:
- "2026-11-12 · #wiki #decisions · A header-wording change breaks the older decisions-unit/wiring reds that pin the old sentence; QA-Red must update them in the F1 Red."
