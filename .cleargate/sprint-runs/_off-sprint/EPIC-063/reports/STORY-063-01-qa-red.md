# STORY-063-01 QA-Red report (role: qa)

QA-RED: WRITTEN. Branch story/STORY-063-01, not committed.

Files (cleargate-cli):
- test/wiki/contradict-commit.red.node.test.ts (31 tests, 0 pass at baseline): in-process handler, ingest, parseFindings, contradictContentHash, phase4SkipReason, round trip, G2 SPIKE, R6.
- test/wiki/contradict-commit-cli.red.integration.node.test.ts (6 tests, 0 pass): tsx subprocess (stdin, --findings, malformed, plan tests 11 and 12, --help).
- test/wiki/contradict.node.test.ts (EDITED, superseded by R4): 2 assertions now expect the body content hash (inline reference, no new import). Both fail at baseline.

Scenario map: S1 -> commit "two findings"; S2 -> "[]"; S3 -> S3 describe (+ transcript, no-findings, --findings precedence, [[ ]] strip, 95-char claim); S4 -> ingest/commit/ingest incl. frontmatter-only and body edit; S5 -> approved/Active/control + phase4SkipReason; S6 -> 5 malformed cases + missing page, byte-identical snapshots.
Plan tests: 7 round trip, 8/G2 spikes, 9 hash vectors, 10/11/12 CLI.

Baseline failures: 39 (31 + 6 + 2). Typecheck clean. Failure reasons verified: missing exports, unknown command 'contradict-commit', ingestSha '' instead of content hash, 'topics' !== 'spikes'.

Notes for Developer/TPV:
- Missing-export tests use namespace imports with `any` casts so each test fails on its own and the file still typechecks.
- Tests import from src/lib/wiki/contradict.js (C1) and src/commands/wiki-contradict.js (C1.6).
- Fixtures use EPIC-091/092/093, SPIKE-007. Never-committed drafts use gitRunner `() => ''`; the CLI/R6 temp dirs have no .git.
- Handler-level tests call exit via a throwing seam and treat undefined or 0 as success; non-zero failures must call `exit(1)` (or exit with non-zero) with stderr prefixed `wiki contradict-commit: `.
- Subprocess tests pass absolute raw paths with spawn cwd = cleargate-cli, so the handler must resolve the project root from the file path.
- Known-value vector: "---\nstatus: \"Draft\"\n---\n\nBody\n" -> df3f9228...cbe0a7.
