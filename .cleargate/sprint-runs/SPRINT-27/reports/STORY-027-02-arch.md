---
role: architect
work_item: STORY-027-02
sprint: SPRINT-27
phase: post-flight
inner_mcp_commit: 51c432c
red_commit: 0d5ab7f
m_plan: .cleargate/sprint-runs/SPRINT-27/plans/M2.md
---

# STORY-027-02 — Architect Post-Flight (SPRINT-27, Wave 2 step 2/4)

ARCH-PASS: APPROVED
NOTES: All seven verification points pass against inner mcp commit `51c432c`. (1) `payload-contract.ts` extends additively — appends `RESERVED_PAYLOAD_KEYS` (5 keys verbatim per M2 §161-163), `MAX_PAYLOAD_BYTES_DEFAULT = 1048576`, hand-rolled `semverLt` (no node-semver dep), and replaces -01's stub `ValidationError` with the full `readonly code` + `readonly hint` implementation; no signature drift, no breaking changes to -01's exports. (2) Four reject paths inserted in push-item.ts at lines 117-211, all positioned above the `if (!ctx.skipApprovedGate)` block at line 216. Order matches M2 §165-205 exactly: reserved_key → payload_too_large → approved_not_boolean → type_change_forbidden. Each throws ValidationError with the prescribed `{code, message, hint}` shape; payload-size check wraps `JSON.stringify` in try/catch for circular-ref defense; type-change check uses a single SELECT and includes the R3 grandfather clause (`currentVersion === 1` AND (`created_at_version` missing OR `semverLt(createdAtVersion, 'cleargate@0.12.0')`)). (3) Hand-off to -03 is structurally clean — `skipApprovedGate` symbol still present at push-item.ts:31, 214, 216, 228 (unchanged), payload-contract.ts header comment already anticipates `ORIGIN_CLEARGATE_CLI` + `originRequiresGates` extension. (4) sync-status.ts deviation is minimal and bounded: introduces a local `stripReserved()` helper that removes only RESERVED_PAYLOAD_KEYS from the stored payload before re-pushing through `pushItem`. It does NOT bypass legitimate validation — type-change, size, and approved_not_boolean still fire against the stripped+merged `nextPayload`; the `skipApprovedGate: true` flag is preserved (untouched, -03's responsibility). The stripping is semantically correct: server stamps `server_pushed_at_version` on every push, so the stored payload reliably contains a reserved key, and the new reserved_key gate would otherwise hard-reject every legitimate sync-status invocation. (5) register-tools.ts adjustment is exactly the M-plan-prescribed `ValidationError` import + one-line addition to `errorCodeFor` (line 64) BEFORE the `instanceof Error` fallback — ensures audit_log captures specific codes (`reserved_key`, `type_change_forbidden`, etc.) instead of a generic message slice. (6) No new package dependencies — `semverLt` hand-rolled per M2 §205 directive. (7) Test posture sound — Dev reports 29 new -02 tests pass, 36 -01 regression tests pass, full vitest 331/1-skipped (skip is pre-existing rate-limit socket noise, unrelated). HTTP wire-shape risk (M2 §206, §217) was not surfaced as a Blockers Report; resolution either landed silently in tests or was deferred to QA-Verify — acceptable because the audit_log path is correct regardless of on-wire envelope, and the wire-shape question is explicitly inherited by -03 per M2 §275.
STRUCTURAL_DEBT: none
DEVIATION_VERDICT: ACCEPT — sync-status.ts strip is a necessary defensive measure introduced by -02's own reserved-key gate; deferring it to -03 would have left -01's sync-status vitest red between merges. The fix is bounded (5 keys), reversible (-03 can replace via origin policy without removing the helper if it remains needed), and Dev recorded a flashcard (2026-05-15 #mcp #reserved-keys) capturing the gotcha. Flag for -03 dispatch: when -03 migrates sync-status from `skipApprovedGate: true` to `payload.origin = "system:sync-status"`, evaluate whether `stripReserved()` is still needed — likely yes, because server-stamped keys persist in storage regardless of origin signal. -03 Architect should NOT remove the helper without confirming the reserved_key gate still fires on `system:*` origins (R1 in -02 is origin-independent by design).
HANDOFF_TO_003: ready

## Verification cites

- `mcp/src/lib/payload-contract.ts` — RESERVED_PAYLOAD_KEYS append at L54-60; MAX_PAYLOAD_BYTES_DEFAULT at L67; semverLt at L75-86; ValidationError full body at L43-51 (replaces -01 stub).
- `mcp/src/tools/push-item.ts` — reject path (1) reserved_key L121-129; (2) payload_too_large L131-153; (3) approved_not_boolean L158-166; (4) type_change_forbidden L170-211; all above `if (!ctx.skipApprovedGate)` at L216.
- `mcp/src/tools/sync-status.ts` — `stripReserved` helper L37-46; `nextPayload` constructed from stripped base at L47-51; `skipApprovedGate: true` preserved at L54.
- `mcp/src/mcp/register-tools.ts` — `import { ValidationError } from '../lib/payload-contract.js'` at L6; `errorCodeFor` ValidationError branch at L64.

## Wall-clock

≤10 min budget honored.
