# QA Report — STORY-046-01

**Story:** STORY-046-01 — Scaffold /connector workspace + frozen envelope codec
**Sprint:** SPRINT-35
**QA agent:** role: qa
**Mode:** VERIFY (read-only acceptance trace)
**Commit verified:** c497459 on branch story/STORY-046-01
**Date:** 2026-06-04

---

## Result

**QA: PASS**

- TYPECHECK: pass (broker build exit 0, daemon build exit 0)
- TESTS: 7 passed, 0 failed, 0 skipped
- ACCEPTANCE_COVERAGE: 4 of 4 Gherkin scenarios covered
- MISSING: none
- REGRESSIONS: none

---

## Frozen-Contract Literal Check

`connector/shared/src/types.ts` checked against `connector/docs/envelope-protocol.md`:

| Contract element | Protocol spec | Implementation | Match |
|---|---|---|---|
| FrameType values | register, registered, hello, ready, prompt, event, turn_end, cancel, error, ping, pong (11) | Identical 11-value union | PASS |
| Envelope.v | number | `v: number` | PASS |
| Envelope.type | FrameType | `type: FrameType` | PASS |
| Envelope.connection_id | string | `connection_id: string` | PASS |
| Envelope.turn_id | optional string | `turn_id?: string` | PASS |
| Envelope.app_id | optional string | `app_id?: string` | PASS |
| Envelope.seq | optional number | `seq?: number` | PASS |
| Envelope.payload | opaque (unknown) | `payload?: unknown` | PASS |
| ErrorCode | offline, unauthorized, version_mismatch, no_capacity | Identical 4-value enum | PASS |

---

## Gherkin Scenario Map

| # | Scenario | Test name | Result |
|---|---|---|---|
| 1 | Codec round-trips an envelope | "round-trips an envelope with all fields including opaque payload" | PASS |
| 2 | Reject v=2 | "rejects envelope with version v=2" | PASS |
| 3 | Reject unknown type "frobnicate" | "rejects envelope with unknown frame type 'frobnicate'" | PASS |
| 4 | Opaque-payload pass-through | "carries opaque payload through without inspection (null, array, nested)" | PASS |

§4.1 minimum: 4 unit tests required; 7 present (exceeds minimum).

---

## Codec Discipline

- `decode` validates `v === 1` at line 72 of `envelope.ts` → throws `EnvelopeDecodeError` on mismatch.
- `decode` validates `type ∈ VALID_FRAME_TYPES` (Set, O(1)) at line 78 → throws `EnvelopeDecodeError` on unknown type.
- `payload` typed `unknown` in `Envelope`; assigned opaque in `decode` via direct assignment; no inspection anywhere in codec.
- `EnvelopeDecodeError` extends `Error`, sets `this.name = "EnvelopeDecodeError"`, passes `cause`.

---

## Gate Execution

All commands run through `bash .cleargate/scripts/run_script.sh` wrapper per CR-046.

| Gate | Command | Exit code | Result |
|---|---|---|---|
| shared tests | `npm --workspace shared test` | 0 | PASS — 7/7 |
| broker build | `npm --workspace broker run build` | 0 | PASS |
| daemon build | `npm --workspace daemon run build` | 0 | PASS |
| vitest check | `grep -r "vitest" .` | 1 (no matches) | PASS |

---

## Lane Compliance (fast lane)

- Runner: `tsx --test` with `*.node.test.ts` naming — correct.
- No vitest references anywhere in connector tree.
- Workspaces declared: `["shared","broker","daemon"]`.
- `tsconfig.base.json` present with strict + exactOptionalPropertyTypes.
- Broker and daemon each import/re-export `@connector/shared` — cross-package contract verified at compile time.

---

## Notes

QA context pack `.qa-context-STORY-046-01.md` was absent. Orchestrator did not pre-generate it for this cross-repo story. Proceeded on direct source inspection. No confidence impact — sources were fully readable.

---

## flashcards_flagged

- `2026-06-04 · #qa #cross-repo · QA context pack absent for connector cross-repo stories; orchestrator must set ORCHESTRATOR_PROJECT_DIR + run prep_qa_context.mjs before dispatch`

---

**VERDICT:** Ship it. All four Gherkin scenarios covered by named passing tests. Wire contract is byte-identical to the frozen protocol spec. Codec discipline (v-gate, type-gate, opaque payload, typed error) is correctly implemented. Both broker and daemon build clean. No vitest.
