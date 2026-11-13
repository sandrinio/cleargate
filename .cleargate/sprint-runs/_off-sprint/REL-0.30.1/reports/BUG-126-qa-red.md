# BUG-126 QA-Red (U5, worktree cg-wt/u5, branch story/BUG-126 @ b9fe36a; not committed)

QA-RED: WRITTEN
BASELINE_FAIL: 5 default-tier cases + 1 integration case (6 red; 4 included-bucket/edge controls green on base)

Files created:
- test/commands/wiki-contradict-excluded-bucket.red.node.test.ts
- test/commands/wiki-contradict-excluded-bucket.red.integration.node.test.ts
Files modified: none (no existing test expects a story draft to fail commit; contradict-commit.red.node.test.ts:397 untouched).

Red (fail on base for the bug's reason):
- Sc1 prompt: base prompt has `Draft wiki page: .../wiki/stories/STORY-002-10.md`, not the "Draft raw file (bucket "stories" is not in wiki.ingest_buckets, so it has no wiki page): <raw>" line.
- Sc2 commit (2 cases): exit 1 "wiki page not found for STORY-002-10"; includes findings landing in contradictions.md.
- Sc3 (2 cases): commit fails first on base (so no raw stamp -> no sha-idempotent skip; body-edit re-open case also red via commit).
- Integration: built 0.30.0 CLI prints the wiki/stories prompt (fails at the prompt assertion; commit never reached on base).
Green on base (controls, must stay green): Sc4 epic page+raw stamped; included bucket with missing page keeps failure; `stories` re-added to ingest_buckets gives page behaviour.

Notes for Dev:
- Default config = config.yml with ingest_buckets omitting stories (absent config.yml = all ingestable).
- The bug's literal "No contradictions found." is NOT accepted by parseFindings (exit 1 "neither a JSON findings array nor ..."); tests feed the real subagent output `contradiction-check: no findings` (and a JSON array). Fix must not rely on the bare sentence.
- Sc3 asserts `skipped: sha-idempotent sha=<first 8 of hash>`; prompt line is asserted with `^...$` multiline, so emit it as its own line.
- Integration run: CLEARGATE_BUILT_CLI=<scratch build of branch head>/dist/cli.js npm run test:file -- test/commands/wiki-contradict-excluded-bucket.red.integration.node.test.ts
- Existing contradict tests green on base (contradict-commit.red, contradict-cli, unchecked-drafts.red).
