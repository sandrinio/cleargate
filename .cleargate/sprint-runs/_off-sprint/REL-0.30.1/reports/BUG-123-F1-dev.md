# BUG-123 F1 dev report
STATUS: done
Files: src/wiki/synthesis/session-brief.ts (excerpt: both branches strip trailing [.,:;]+), scripts/brief-oracle.sh (awk mirror, no new spawns)
Typecheck clean. All 13 named test files green via `npm run test:file` (excerpt-punctuation 7/7, others 0 fail).
