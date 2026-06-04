# STORY-048-01 — Developer Blockers Report

role: developer · STORY=048-01 · 2026-06-04

**Summary:** Implementation is complete, typecheck-clean, and proven correct by 3 dev-authored
ESM-safe impl tests (`daemon/src/teardown.impl.node.test.ts`, all green). 3 of the 9 frozen
`*.red.node.test.ts` cases fail SOLELY because the frozen red-test HARNESS is incompatible with
the project's pinned Node 25 — not because of any implementation gap. The frozen red tests are a
Forbidden Surface; I cannot fix the harness. Routes back to QA-Red.

## Test-Pattern
The 3 failing red cases (`dial-register`, `no-orphans-on-cancel`, `exit-handler-reaps-all`) fail at
harness setup before any implementation code runs: the WS stub calls CommonJS `require("http")`/
`require("crypto")` inside an ESM module (→ `ReferenceError: require is not defined`), and the
fake-process-tree + signal-tracker helpers spawn `node --input-type=module <scriptFile>` which Node
25 rejects with `ERR_INPUT_TYPE_NOT_ALLOWED` (the flag is now `--eval`/`--print`/STDIN-only), so the
spawned parent crashes before forking the detached grandchild and `grandchild.pid` never appears.

## Spec-Gap
N/A — the §1.2 requirements, §2.1 Gherkin, §3.1 file surface, and §3.3 API contract are unambiguous
and fully implemented; the failure is purely a runtime-harness incompatibility in the frozen test
file, not a missing or contradictory spec detail.

## Environment
The frozen red tests were authored against a Node version where `require` was injectable into the ESM
test scope and `--input-type=module <scriptFile>` was tolerated; on the pinned Node 25 (v25.9.0 in this
worktree) both patterns are hard errors — QA-Red must drop `--input-type=module` from the two `spawn(...)`
calls (lines ~219, ~536) and replace the `require("http")`/`require("crypto")` calls (lines ~58-59) with
ESM `import`, after which all 9 cases pass (proven: the dev impl tests reproduce the identical 3 scenarios
with exactly those two fixes and go green).

## Proof the implementation is correct
- `daemon/src/teardown.impl.node.test.ts` — 3/3 green, covering the same 3 scenarios with a Node-25-safe
  harness (ESM `import` for the WS stub; `.mjs` spawn target with NO `--input-type` flag).
- The other 6 red cases pass against the implementation as-is: `exact-argv`, `realpath-pin`,
  `SIGTERM-before-SIGKILL`, `backend-seam-grep-clean`, `Backend-interface-exports`, `ChildHandle-shape`.
- Workspace typecheck (shared + broker + daemon): clean. Daemon `tsc` build: clean.
- DoD seam grep: zero direct `claude`-CLI literals in `index.ts`/`spawn.ts`/`teardown.ts`; the binary
  literal lives only in `backend.ts` (`ClaudeBackend`).

## Recommended routing
QA-Red applies the two harness fixes above to `daemon/src/teardown.red.node.test.ts` (Forbidden Surface
for Developer), re-runs; expected 12/12 green with the implementation committed on this branch.
