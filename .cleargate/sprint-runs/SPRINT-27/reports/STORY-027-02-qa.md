---
work_item: STORY-027-02
sprint: SPRINT-27
agent: qa
status: pass
inner_mcp_commit: 51c432c
typecheck: pass
tests_027_02: 29 passed, 0 failed
tests_027_01_regression: 36 passed, 0 failed
vitest_full: 331 passed, 1 skipped (pre-existing)
---

# STORY-027-02 SPRINT-27 — QA Report

## Verdict

QA: PASS
TYPECHECK: pass
TESTS: 29 passed (STORY-027-02 suite), 36 passed (-01 regression), 331 passed vitest baseline — 0 failed, 1 skipped pre-existing
ACCEPTANCE_COVERAGE: 10 of 10 Gherkin scenarios have matching tests
MISSING: none
REGRESSIONS: none
DEVIATION_VERDICT: ACCEPT — sync-status.ts strip of RESERVED_PAYLOAD_KEYS before re-pushing is minimal and correct. Stored payload already contains server_pushed_at_version from prior push; without stripping, syncStatus would trigger the new reserved_key check. Fix preserves skipApprovedGate semantics; -03 origin policy is unaffected.

## Gherkin Coverage Map

| Scenario | Description | Test |
|---|---|---|
| 1 | reserved key server_pushed_at_version → reserved_key | push-item-reject-paths.red.node.test.ts "Scenario 1 (RED)" |
| 2 | reserved key cleargate_id → reserved_key, names key | push-item-reject-paths.red.node.test.ts "Scenario 2 (RED)" |
| 3 | type change at v2 → type_change_forbidden | push-item-reject-paths.red.node.test.ts "Scenario 3 (RED)" |
| 4 | grandfather at v1 + pre-0.12.0 → lazy pass, type becomes bug | push-item-reject-paths.red.node.test.ts "Scenario 4 (RED)" |
| 5 | post-lock (v2 type=bug) + push story → type_change_forbidden | push-item-reject-paths.red.node.test.ts "Scenario 5 (RED)" |
| 6 | push "Story" for stored "story" at v2 → normalize matches, pass | push-item-reject-paths.red.node.test.ts "Scenario 6 (RED)" |
| 7 | payload > 1 MB → payload_too_large, message cites limit | push-item-reject-paths.red.node.test.ts "Scenario 7 (RED)" |
| 8 | MCP_MAX_PAYLOAD_BYTES=4194304, 2 MB → pass | push-item-reject-paths.red.node.test.ts "Scenario 8 (RED)" |
| 9 | approved="true" (string) → approved_not_boolean, correct message+hint | push-item-reject-paths.red.node.test.ts "Scenario 9 (RED)" |
| 10 | all four error shapes have top-level {code,message,hint} | push-item-reject-paths.red.node.test.ts "reserved-key error has top-level shape (Scenario 10)" |

## Contract Checks

- RESERVED_PAYLOAD_KEYS: 5 keys (['cleargate_id','type','server_pushed_at_version','pushed_by','pushed_at']), exported — PASS
- MAX_PAYLOAD_BYTES_DEFAULT: 1048576, exported — PASS
- ValidationError: full class (extends Error, .code, .hint, .name='ValidationError'), exported — PASS
- semverLt: exported, used for grandfather clause — PASS
- Reject order in push-item.ts: (1) reserved_key (2) payload_too_large (3) approved_not_boolean (4) type_change_forbidden — all BEFORE approved gate at line 213 — PASS
- audit_log: ValidationError caught by runTool catch → writeAudit → errorCodeFor handles instanceof ValidationError (register-tools.ts:65) — PASS
- approved_not_boolean fires only when payload.approved is defined-and-not-boolean; absent approved falls through to existing not_approved gate — PASS
- Type normalization at line 112 (args = {...args, type: normalizedType}) happens BEFORE the -02 checks; type comparison in type_change_forbidden uses normalized type — PASS
- Grandfather reads created_at_version from existingForTypeCheck.currentPayload (stored DB row), not from incoming args.payload — PASS

## CR-064 Prerequisite

KNOWN_TYPES in payload-contract.ts line 22 contains 'sprint_report' (underscore) — CONFIRMED.

## DoD Checklist

- [x] All 10 §2.1 Gherkin scenarios green under tsx --test
- [x] RESERVED_PAYLOAD_KEYS, ValidationError, MAX_PAYLOAD_BYTES_DEFAULT exported from payload-contract.ts
- [x] Four new errorCodes emit audit_log rows (via ValidationError instanceof path in errorCodeFor)
- [x] Grandfather clause verified by two-pair test (lazy-pass Scenario 4 + post-lock Scenario 5)
- [x] npm run typecheck clean (Dev report)
- [x] Pre-commit hook clean (Dev report)

## flashcards_flagged

- "2026-05-15 · #mcp #reserved-keys · syncStatus re-pushes stored payload which already contains server_pushed_at_version — strip RESERVED_PAYLOAD_KEYS before re-passing to pushItem"
