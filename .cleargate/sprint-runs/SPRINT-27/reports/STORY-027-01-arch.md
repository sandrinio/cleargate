---
role: architect
work_item: STORY-027-01
sprint: SPRINT-27
mode: post-flight
inner_mcp_commit: caa8cf8
review_date: 2026-05-15
---

# STORY-027-01 — Architect Post-flight Review

ARCH-PASS: APPROVED

NOTES: All 9 verification checks pass against inner mcp commit caa8cf8. `mcp/src/lib/` was created and contains only `payload-contract.ts` (50 LOC). The module exports all four required symbols: `TYPE_REGEX` (line 11), `KNOWN_TYPES` (lines 14-23 — 8 entries, `'sprint'` at line 21 + `'sprint_report'` at line 22, underscore confirmed verbatim; CR-064 Wave 3 string-match unblocked), `normalizeType` (lines 29-31, trim→lowercase→whitespace-to-hyphen), and `ValidationError` (lines 40-50). The ValidationError is in fact the **full** class implementation already — readonly `code` and `hint` fields, `name = 'ValidationError'` set, extends Error — so STORY-027-02's "replace stub" step is a structural no-op with zero API change at call sites (M-plan §83 anticipated this). `push-item.ts` deletes the `ITEM_TYPES` const array entirely, loosens the Zod schema to `z.string().min(1).max(64)`, inserts the normalize-then-validate gate at the top of `pushItem()` before the existing `skipApprovedGate` block (matches M-plan §87-99 anchor), and adds `stored_type: string` to `PushItemResult` (line 44) with `args = { ...args, type: normalizedType }` mutation cleanly threading the normalized value into both insert and update return literals. `register-tools.ts` drops the `ITEM_TYPES` import (line 5) and swaps both inputSchema usages (push_item line 99 + list_items line 161) to the loose `z.string().min(1).max(64)` shape — handler-gate handles regex/length per the design. Extended importers `list-items.ts` and `cleargate-sync-work-items.ts` (the latter swaps `syncItemPayloadSchema.type`) both correctly drop the `ITEM_TYPES` import and adopt the same loose Zod shape; `grep -rn "ITEM_TYPES" mcp/src/` returns zero hits, confirming the removal is total. `sync-status.ts` line 43 drops the obsolete narrowing cast `as 'initiative' | 'epic' | ...` to bare `current.type` — consistent with the opened type surface, not an origin-migration touch (STORY-027-03's concern). `mcp/package.json` is untouched in commit caa8cf8 — no new deps, as required. The file-level docblock at the top of `payload-contract.ts` (lines 1-8) pre-declares the extension points for -02, -03, -04, giving subsequent stories a clean anchor for symbol-anchored appends. Tests: 36 Red node:test passed, 331+1-skipped vitest passed (rate-limit socket noise is pre-existing per Dev report). Typecheck clean.

STRUCTURAL_DEBT: none

DEVIATION_VERDICTS:
  - extended-importers: ACCEPT — M-plan §141 only named `register-tools.ts` as the SDR-fixed gap, but `list-items.ts` and `cleargate-sync-work-items.ts` were ALSO importing `ITEM_TYPES` and typecheck would have failed otherwise. Same removal scope, mechanical correctness, no design drift. Confirmed via `grep ITEM_TYPES src/` (zero hits post-commit).
  - type-regex-loose: ACCEPT — M-plan §87-99 itself instructed handler-gate enforcement (normalize-then-validate inside `pushItem`) precisely because Zod's `.regex()` error shape cannot carry `{code, message, hint}`. The corollary is that `register-tools.ts` does NOT need `TYPE_REGEX` imported — importing it just to not use it would be dead code triggering a TS unused-import error. Plan §102 explicitly permitted leaving the import out. Aligned with M-plan §105 "regex enforcement moved into pushItem".

HANDOFF_TO_002: ready
- `payload-contract.ts` has the file-level extension docblock (lines 4-7) naming -02's extension points: RESERVED_PAYLOAD_KEYS, MAX_PAYLOAD_BYTES_DEFAULT, "full" ValidationError. The class is already full; -02's "replace stub" step becomes a no-op (consistent with M-plan §157 expectation).
- `pushItem()` has a clean anchor for -02's four-check block: insert RESERVED_KEYS + size + approved-not-boolean + type-change-forbidden checks IMMEDIATELY after the normalize-then-validate gate (lines 100-110 post-amend) and BEFORE the existing `skipApprovedGate` block. M-plan §165 anchor confirmed.
- `register-tools.ts:errorCodeFor` (M-plan §206 reference) is unchanged in this commit — -02 will add the `ValidationError → err.code` mapping there. No conflict.
- No structural debt to clean before -02 starts.
