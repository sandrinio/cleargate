# STORY-063-06-F1 Dev (role: developer)
STORY: STORY-063-06-F1
STATUS: done
COMMIT: 321428d (branch story/STORY-063-06-F1)
TYPECHECK: pass
TESTS: full npm test 4096 passed, 0 failed, 2 skipped; clean-room-claude-baseline 13/13 after commit
FILES_CHANGED (cleargate-cli/scaffold/core/.cleargate/): templates/{epic,CR,Bug,story,initiative}.md, templates/Sprint Plan Template.md (created_at/updated_at -> "{ISO}"), knowledge/cleargate-protocol.md (§11.1 rows)
NOTES: No src change. new.ts has one substitution path for all types ({ISO} at :317), so sprint and initiative are covered. stamp-frontmatter.ts already sets created_at only when absent and advances updated_at on re-stamp; sprint-scope.ts (add|remove) already stamps. Only protocol §11.1 was untrue; it now says `new` sets both, `stamp` sets created_at only if missing, `sprint add|remove` advances updated_at, Edit/Write hooks do not. No other template text documented a literal date (remaining "ISO-8601 timestamp" hits are pushed_at/synced_at comments, untouched). Codex check clean, no gen:codex needed. Payload and manifest refreshed (gitignored).
plan_deviations: []
adjacent_files: outer live .cleargate/templates (parity tests canonical-live-parity, gate-section-index-pinning.live, template-claude-md.live expected red until §R re-sync)
flashcards_flagged: []
