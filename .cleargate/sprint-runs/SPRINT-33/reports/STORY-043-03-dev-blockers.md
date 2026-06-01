## Test-Pattern

The sealed red test (`test_template_gate_correctness.red.sh`) has 8 assertions (T1-A, T1-B, T2-C, T2-D, T3-C, T3-D, T4-A, T4-C) that use grep patterns requiring `predicate-name.*pass` in non-verbose `gate check` output, but non-verbose mode only outputs `❌` lines for failures — passing predicates are never shown — making these assertions systematically unpassable; additionally, T4-A's awk range `/^## 2\. Reproduction Protocol/,/^## [0-9]/` self-terminates on the same line because `## 2.` matches the end pattern `^## [0-9]`, capturing 0 bullets regardless of the implementation.

## Spec-Gap

The story spec correctly describes the template changes needed (de-number headings, add context_source, fix Bug repro, purge proposal refs), all of which have been implemented and verified through 10 passing assertions, but the QA-Red test encodes "gate predicate passes" by grepping for `predicate-name.*pass` in non-verbose gate output — a format that the CLI never produces — and the T4-A awk range was written in a way that self-terminates on `## 2. Reproduction Protocol` before reading any content.

## Environment

N/A — local build environment is clean; `cleargate-cli/dist/cli.js` was built from the current source (both dated May 31 15:56-57); the gate check behavior confirmed via direct CLI invocation and matches the TypeScript source at `cleargate-cli/src/commands/gate.ts` lines 287-303.
