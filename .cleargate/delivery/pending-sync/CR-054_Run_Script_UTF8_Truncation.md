---
cr_id: CR-054
parent_ref: EPIC-013
parent_cleargate_id: EPIC-013
sprint_cleargate_id: SPRINT-25
carry_over: false
status: Draft
approved: false
created_at: 2026-05-04T19:00:00Z
updated_at: 2026-05-04T13:30:00Z
created_at_version: cleargate@0.10.0
updated_at_version: cleargate@0.10.0
context_source: |
  CR-046 shipped run_script.sh structured incident reporting with
  stdout/stderr capped at MAX_STREAM_BYTES = 4096 bytes (per
  cleargate-cli/src/lib/script-incident.ts:18). The bash truncation
  uses `${var:0:N}` which is **character-index, not byte-count**.

  ASCII-safe: 1 byte = 1 char, so `${var:0:4096}` truncates to ~4096
  bytes for ASCII input. UTF-8 multi-byte input: every multi-byte
  character (cyrillic, CJK, emoji, accented Latin) counts as 1 char
  but consumes 2-4 bytes. So a stream of 4096 chars of CJK is
  ~12KB on disk; the schema field claims 4KB but the JSON is 3x
  larger. Worse: truncation may split a multi-byte char at the
  boundary, leaving an invalid UTF-8 sequence that breaks
  JSON.parse downstream.

  CR-046 §0.5 Q3 deferred this to "future CR"; flashcard recorded
  2026-05-04 #wrapper #char-vs-byte. CR-054 is that future CR.

  Fix: replace `${var:0:N}` with byte-correct truncation. Options:
  (a) `head -c N` (POSIX byte-count); (b) `dd bs=1 count=N`; (c) `printf | iconv`.
  Option (a) is cleanest in bash.

  After truncation, if the last byte falls mid-sequence, must trim
  back to the last complete UTF-8 character boundary. Practical
  approach: use Node.js (since cleargate-cli is already a Node
  dependency) via a small `_truncate_stream.mjs` helper invoked from
  the wrapper. Or accept "may end mid-sequence" with a documented
  caveat — JSON.stringify of an invalid UTF-8 string in Node still
  produces valid JSON (escaped), so downstream parse won't break.
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-05-04T19:03:19Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id CR-054
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-05-04T18:36:35Z
  sessions: []
---

# CR-054: run_script.sh UTF-8 Byte-Correct Truncation

## 0.5 Open Questions

- **Question:** `head -c N` vs Node helper vs documented caveat?
  - **Recommended:** `head -c N` (POSIX, available everywhere bash runs). Truncates exactly N bytes. Trade-off: may split mid-multi-byte-char. Node.js downstream JSON.stringify handles invalid UTF-8 by escape; round-trip JSON parse works. Document the trade-off in the wrapper comment + script-incident.ts JSDoc.
  - **Human decision:** _populated during Brief review_

- **Question:** Trim mid-sequence partial char OR accept escaped output?
  - **Recommended:** ACCEPT escaped. Adding a Node helper to find the last clean UTF-8 boundary doubles wrapper complexity for a cosmetic improvement (the truncated stream is for debugging only; downstream tools handle escaped UTF-8 fine). Document as "may end with escaped partial-char on UTF-8 multi-byte input" in script-incident.ts JSDoc.
  - **Human decision:** _populated during Brief review_

- **Question:** Test scenario shape?
  - **Recommended:** add 1 scenario to existing wrapper Red test (or new file): UTF-8 input ≥4KB → assert incidentJson.stdout.length ≤ 4096+suffix bytes (NOT ≤ 4096 chars). Use a fixture with cyrillic or CJK text.
  - **Human decision:** _populated during Brief review_

- **Question:** Update MAX_STREAM_BYTES doc / JSDoc?
  - **Recommended:** YES. Update JSDoc in `cleargate-cli/src/lib/script-incident.ts` L16-18 to clarify "byte-count, not char-count" and note partial-char trade-off.
  - **Human decision:** _populated during Brief review_

- **Question:** Backport to TRUNCATION_SUFFIX boundary case?
  - **Recommended:** YES. `head -c N` gives N bytes; the suffix is ~16 ASCII bytes. Total payload = N + 16 bytes. If schema claims 4KB max, either lower N to 4080 (so total = 4096) OR document "MAX_STREAM_BYTES is the truncation point; total field can include +TRUNCATION_SUFFIX bytes". Option B is simpler; the 16-byte overhead is negligible.
  - **Human decision:** _populated during Brief review_

## 1. The Context Override (Old vs. New)

**Obsolete Logic (What to Remove / Forget):**
- run_script.sh `${var:0:N}` truncation is "byte-correct" — assumed-true on ASCII input but wrong on UTF-8 multi-byte.
- script-incident.ts MAX_STREAM_BYTES = 4096 means "field is at most 4096 bytes" — fails on UTF-8 input.

**New Logic (The New Truth):**
- run_script.sh truncation uses `head -c N` for byte-correct cap.
- script-incident.ts JSDoc updated to document byte-count semantics + partial-char trade-off.
- A regression test asserts UTF-8 input ≥4KB produces incidentJson with stdout.bytelength ≤ 4096 + TRUNCATION_SUFFIX.

## 2. Blast Radius & Invalidation

- [ ] **`.cleargate/scripts/run_script.sh`** — replace `${var:0:N}` in `_truncate_stream()` with `head -c N`. Mirror to canonical.
- [ ] **`cleargate-planning/.cleargate/scripts/run_script.sh`** — canonical mirror.
- [ ] **`cleargate-cli/src/lib/script-incident.ts`** — update JSDoc on MAX_STREAM_BYTES (L16-18) to document byte-count semantics + partial-char trade-off.
- [ ] **`cleargate-cli/test/scripts/run-script-utf8-truncation.red.node.test.ts`** — NEW. 1 scenario: UTF-8 fixture (cyrillic or CJK) ≥4KB → assert truncation correct.
- [ ] **No SKILL.md edit** — internal wrapper logic.

## Existing Surfaces

- **Surface:** `.cleargate/scripts/run_script.sh` L113 `_truncate_stream()` — current implementation using `${var:0:N}`.
- **Surface:** `cleargate-cli/src/lib/script-incident.ts` L16-18 — MAX_STREAM_BYTES JSDoc.
- **Surface:** `cleargate-cli/test/helpers/wrap-script.ts` (CR-052) — helper for wrapper integration tests; consume in new test.
- **Why this CR extends rather than rebuilds:** the truncation logic is one bash function; CR-054 swaps the implementation while preserving the function signature. Bounded change.

## 3. Execution Sandbox

**Modify:**
- `.cleargate/scripts/run_script.sh` (+ canonical mirror)
- `cleargate-cli/src/lib/script-incident.ts` (JSDoc update)

**Add:**
- `cleargate-cli/test/scripts/run-script-utf8-truncation.red.node.test.ts`

**Out of scope:**
- Self-repair (CR-057 territory)
- Lower MAX_STREAM_BYTES from 4096 (configuration change, not bug fix)
- Trim-to-clean-boundary partial-char handling (escaped output is acceptable per Open Q2 default)

## 4. Verification Protocol

**Acceptance:**
1. `_truncate_stream()` in run_script.sh + canonical mirror uses `head -c $MAX_STREAM_BYTES` (or equivalent byte-count primitive).
2. JSDoc on `script-incident.ts:16-18` documents byte-count semantics + partial-char trade-off.
3. NEW Red test passes 1 scenario: UTF-8 input (e.g., 5000 cyrillic chars = ~10KB) → wrapper writes incidentJson; `Buffer.byteLength(incidentJson.stdout) ≤ MAX_STREAM_BYTES + Buffer.byteLength(TRUNCATION_SUFFIX) + small slack`. ASCII-only fixtures still pass (existing CR-046 wrapper tests untouched).
4. JSON.parse round-trip on the resulting incidentJson succeeds (no broken UTF-8 escaping).
5. Mirror parity: live = canonical for run_script.sh.
6. `cd cleargate-cli && npm run typecheck && npm test` exits 0.

**Test Commands:**
- `cd cleargate-cli && npm test -- test/scripts/run-script-utf8-truncation.red.node.test.ts`
- (manual) `printf 'кириллический текст %.0s' {1..500} | bash .cleargate/scripts/run_script.sh false` → check `.script-incidents/<ts>.json` stdout byte length.

**Pre-commit:** `cd cleargate-cli && npm run typecheck && npm test`. Never `--no-verify`.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟡 Yellow — Awaiting Brief approval**

- [x] §0.5 Open Questions surfaced (5 questions, all with recommended defaults).
- [x] §3 Execution Sandbox lists files to touch.
- [x] §4 Verification Protocol has testable acceptance.
- [ ] Human approves §0.5 defaults.
- [ ] Lane assigned at SDR (preliminary: standard — small but multi-file: bash + ts + new test).

---
