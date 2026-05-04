---
qa_role: red
cr_id: CR-053
sprint_id: SPRINT-25
authored_at: 2026-05-04
authored_by: qa
---

# QA-Red Report: CR-053

## Red test file written

`.worktrees/CR-053/cleargate-cli/test/init/copy-payload-manifest.red.node.test.ts`

## Baseline run result

```
▶ copyPayload — CR-053 MANIFEST.json skip regression
  ✖ does NOT copy MANIFEST.json from payload root to targetCwd (4.33ms)
  ✔ still copies legitimate planning content (cleargate-planning/ skeleton) (0.95ms)
✖ copyPayload — CR-053 MANIFEST.json skip regression (5.66ms)
tests 2  |  pass 1  |  fail 1  |  skipped 0
exit code: 1
```

Failure message:
```
AssertionError: MANIFEST.json must NOT be written to targetCwd
  (found at <tmpdir>/MANIFEST.json)
  actual: true, expected: false
```

## RED confirmed

- Scenario 1: FAILS (MANIFEST.json is copied to targetCwd — bug is live)
- Scenario 2: PASSES (legitimate planning content copies correctly)

BASELINE_FAIL: 1 of 2 scenarios

## Acceptance criteria mapping

| CR §4 item | Coverage |
|---|---|
| 1. SKIP_FILES contains 'MANIFEST.json' | Verified via source grep (L49); not yet present — RED confirmed |
| 2. NEW test: fixture with root-level MANIFEST.json → not copied | WRITTEN + RED confirmed |
| 3–6 | Developer-phase acceptance (gitignore, smoke, Gate-4, typecheck+test) |

## Payload structure confirmed

`find cleargate-cli/templates -name "MANIFEST.json"` → `cleargate-cli/templates/cleargate-planning/MANIFEST.json`

payloadDir root = `cleargate-planning/` subdir of templates. `MANIFEST.json` sits at relPath `'MANIFEST.json'` relative to payloadDir. Correct SKIP_FILES key is `'MANIFEST.json'` (not a path-prefixed form).

## Notes

- Test uses `node:test` + `node:assert/strict` pattern (not vitest). Glob `test/**/*.node.test.ts` picks it up.
- `before`/`after` hooks create + tear down real tmpdir fixtures. No mocks.
- Two scenarios in the file: (1) MANIFEST not copied [RED], (2) legitimate content copied [GREEN even pre-fix — sanity check that copyPayload still works].
