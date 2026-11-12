# STORY-063-03-F1 QA-Red
QA-RED: WRITTEN
Files (modified, uncommitted):
- test/hooks/post-shell-ingest.red.integration.node.test.ts: new describe "03-F1" with 2 tests (stash-pop conflict incl. resolve-then-ingest; cherry-pick conflict).
- test/docs/ingest-docs-match-code.red.node.test.ts: new describe "03-F1" with 3 tests (no unconditional "starts no node process"; key phrases; no "via Task" in wiki-ingest.ts).
Red count: 5 failing (2 integration, 3 docs). The rest of the files stay green (22 pass).
Reasons:
- stash-pop / cherry-pick: fixture verified as real UU with no MERGE_HEAD; hook runs `shell-ingest` against the conflicted file (log contains it; stdout carries the ingest line).
- docs: §10.9 #2 still has the old sentence and lacks the 3 phrases; wiki-ingest.ts:75,378 still say "via Task".
F5 unit red: SKIPPED. `parseStatusZ` (src/commands/hook.ts:144) is not exported, so it needs `export` before a unit red can be written (harmless parity nit); no production edits made.
