role: qa — STORY-063-04 QA-Red
File: cleargate-cli/test/wiki/build-sprint-reports.red.node.test.ts (12 tests, 12 fail on baseline, 0 pass).
Covers: Outline x2, report-only, parity, rebuild-after-ingest + no-op, canonical-over-legacy, bad-report tolerance, C4.1 exports, C4.2 listSprintReports, G1 (3 variants).
Existing wiki-ingest-sprint-report.red.node.test.ts: 14/14 green. Typecheck clean.

## Amendment (arch bounce 1)
Harness defect: `build()`/`ingest()` exit seam threw on every code including 0, but wikiIngestHandler's no-op path ends with exit(0) (pinned by ingest.node.test.ts:328). Fix: shared `seamExit` throws a `CleanExit` sentinel for code 0 (caught by `runClean`) and `Error('EXIT:n')` for non-zero. No behavioural assertion changed; the "unchanged (no-op)" assertion is intact. Result with Dev WIP: 12 pass, 0 fail.
