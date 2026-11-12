# STORY-063-06-F1 QA (role: qa)
QA: PASS
- Templates: epic, story, CR, Bug, Sprint Plan, initiative now `created_at/updated_at: "{ISO}"`; spike unchanged (already {ISO} both); hotfix has created_at "{ISO}" only, no updated_at, same as before.
- Protocol §11.1: both rows true vs new.ts ({ISO} -> now), stamp-frontmatter.ts (created_at set only when absent; updated_at advanced), sprint-scope.ts (calls stampFrontmatter on add|remove).
- Tests: 99 pass, 0 fail (new-command, new-draft-alarm-window.red, unchecked-drafts*). typecheck clean. build-codex-payload --check exit 0.
- Consumers: no src/scripts reader parses template created_at; only new.ts substitutes {ISO}; probe-items.mjs only reads template bodies. No literal {ISO} survives in written items (tests assert it).
- Note (not a defect): live /.cleargate/templates/*.md differs from scaffold (expected drift until init re-sync).
