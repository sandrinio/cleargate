# BUG-089 regression triage

Role: orchestrator. This is diagnostic evidence, not independent QA approval.

All commands ran in `/Users/ssuladze/Documents/Dev/CG_TEST/sprint-41-D2QMC1/stories/BUG-089/meta/cleargate-cli`.

- The full default suite captured from process session 18824 ended with actual exit 1. Its tool output was truncated; no complete test-count summary is claimed.
- Wrapping the whole suite exports `RUN_SCRIPT_ACTIVE=1`. The wrapper's own legacy tests inherit it and therefore exercise its self-exemption path, producing no incident files. A focused rerun kept the required outer wrapper but invoked the child with `env -u RUN_SCRIPT_ACTIVE`: wrapper plus UTF-8 truncation tests passed 21/21, exit 0. No test files or production wrapper were modified.
- The snapshot-drift test references a sibling MCP OpenAPI snapshot missing from the isolated clone. Copied only `mcp/src/admin-api/__snapshots__/openapi.test.ts.snap`, not credentials or the MCP runtime, into the paired fixture. Source MCP HEAD is `9f4c33a41de2128131a6d28df4ffbc444f913fcc`. Both snapshot SHA-256 values are `dda6e3de38f4efdfdbd652e9b7543edaacd2a4b2dd733472dcf62c3dc27b5911`.
- A further full default run is capturing complete stdout/stderr under the run root as `bug089-regression-cleanenv.{stdout,stderr}.log`, using a temporary output-capture script. Until its exit and failures are reconciled, it is not a pass.

The complete rerun ended exit 1: 2,695 tests, 2,636 passed, 56 failed, 3 skipped. Full logs are preserved. A missing fixture `.claude` tree accounts for the hook/agent ENOENT groups; the Red/Green example also expects a parent-root tsx executable, though the meta package no longer declares that tool. Only the exact nonsecret canonical input files needed by those tests were copied into the paired fixture (`pre-tool-use-task.sh`, `token-ledger.sh`, `architect-reader.md`, `architect-synth.md`); no settings or trust were installed. A fixture-local symlink exposes its already-installed CLI tsx binary at the legacy parent lookup path. Nothing points to original dependencies.

Those eight affected test files reran with 69 tests: 58 passed, 11 failed. Logs: `bug089-environment-retest.{stdout,stderr}.log`. The remaining failures are one assertion treating `Agent` as a non-dispatch name and ten assertions expecting transcript-inferred ledger attribution. Both copied hook sources are unchanged from the BUG-089 story baseline; canonical BUG-068/069 already changed those contracts. This is not proof that the failures can simply be ignored: QA must reconcile them with the current contracts during BUG-085's fixture/live coherence work.

The remaining full-suite failure outside that group is `init.node.test.ts` comparing the deliberately changed pre-edit hook with the old BUG-038 byte snapshot. Its diff is the host argument and fail-closed exit-2 repair. The paired BUG-089 raw scope now authorizes QA to add a new BUG-089 snapshot and repoint only that regular test, retaining the historical snapshot and portable-parser coverage. Raw stamp and real readiness gate passed 8 criteria after this scope reconciliation; no snapshot edit has yet occurred.

The legacy suite mutates paired delivery relationship metadata and regenerates its manifest. After inspecting every delivery hunk, the coordinator reversed exactly 38 generated parent/sprint relationship fields through a narrow patch. BUG-089 task ticks, approved scope amendments and runtime gate configuration remain. The regenerated manifest is still pending DevOps reconciliation. No blanket restoration was performed.

Original live Claude settings, SPRINT-41 state/events and active sentinel hashes were rechecked unchanged at approximately 00:31 UTC. No original production changes, push, live-host denial proof or sprint completion are claimed.
# Follow-up: current snapshot qualification

2026-09-12T00:54Z: Developer added the BUG-089 successor snapshot without changing BUG-038. Parent reran the prescribed wrapper plus `env -u RUN_SCRIPT_ACTIVE npm run test:file -- test/commands/init.node.test.ts` with short CG_TEST TMPDIR `test-tmp-I6mBlS`: exit 0, 28 passed, zero skipped. This supersedes the Developer's launcher limitation, not the outstanding full-suite or live-enforcement gates.
