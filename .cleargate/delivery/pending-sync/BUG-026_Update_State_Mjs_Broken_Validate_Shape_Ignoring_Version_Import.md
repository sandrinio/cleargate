---
bug_id: BUG-026
parent_ref: EPIC-013
parent_cleargate_id: EPIC-013
sprint_cleargate_id: null
carry_over: false
status: Ready
severity: high
approved: true
approved_at: 2026-05-03T20:00:00Z
approved_by: sandrinio
created_at: 2026-05-03T00:00:00Z
updated_at: 2026-05-03T00:00:00Z
created_at_version: cleargate@0.10.0
updated_at_version: cleargate@0.10.0
server_pushed_at_version: null
context_source: |
  Surfaced 2026-05-03 in markdown_file_renderer end-to-end install test
  (cleargate@0.10.0). Test agent's sprint-close walkthrough self-report
  named this as one of five critical signals:

    "5. update_state.mjs is broken (validateShapeIgnoringVersion import bug).
        I worked around it 5× by patching state.json directly via node -e.
        Fix: 30-second patch — either add the missing export or simplify the
        script. Either way, file as a CR before SPRINT-02 or it'll bite the
        same way."

  The import error fires when the orchestrator (or the close pipeline) tries
  to call update_state.mjs to mutate sprint state — every state transition
  during the SPRINT-01 execution required a manual `node -e` workaround,
  bypassing the script's validation logic. State integrity in 0.10.0 sprints
  depends on whether anyone notices and works around it.

  Same family as BUG-021 (token-ledger detector regression post-template-strip)
  — a script that exports something the consumer expects but the export
  shape changed without updating downstream call sites.
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-05-03T19:04:49Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id BUG-026
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-05-03T17:47:35Z
  sessions: []
---

# BUG-026: `update_state.mjs` Broken — `validateShapeIgnoringVersion` Import Bug

## 1. The Anomaly (Expected vs. Actual)

**Expected:** `node .cleargate/scripts/update_state.mjs <SPRINT> <STORY> <STATUS>` mutates `state.json` after validating the new shape against `state.schema.json`. Exits 0 on success; non-zero on shape violation.

**Actual:** the script throws an import-resolution error before reaching its main body — `validateShapeIgnoringVersion` is imported from a sibling module that no longer exports under that name. Every state mutation fails identically; the four-agent loop and lifecycle reconciler silently lose state-update commits unless an operator manually patches `state.json` via `node -e`.

## 2. Reproduction Protocol

> Each step independently reproducible from a fresh shell.

- **Step 1** — fresh init: `npx cleargate@0.10.0 init` in a clean folder.
- **Step 2** — trigger state mutation: `node .cleargate/scripts/update_state.mjs SPRINT-01 STORY-001-01 Done`.
- **Step 3** — observe: script throws `ImportError` / `SyntaxError` on `validateShapeIgnoringVersion` (depending on Node major); state.json unchanged.
- **Step 4** — confirm scope: re-run with any other story id / status — same import error fires before argument parsing.
- **Step 5** — operator workaround (used 5× across SPRINT-01 in the test session): `node -e "const fs=require('fs'); const p='.cleargate/sprint-runs/SPRINT-01/state.json'; const s=JSON.parse(fs.readFileSync(p)); s.stories['STORY-001-01'].status='Done'; fs.writeFileSync(p, JSON.stringify(s, null, 2));"` — bypasses validation entirely.

## 3. Evidence & Context

- **Severity:** high. State mutations are core to the four-agent loop. Without `update_state.mjs`, every sprint either (a) falls back to `node -e` patches with no validation (drift-prone), or (b) silently skips state updates (lifecycle reconciler then reports inconsistent state at close).
- **Test agent self-report (2026-05-03 install test):** "will bite SPRINT-02" if not fixed; called out as one of five critical signals.
- **Root cause (hypothesized):** the script imports `validateShapeIgnoringVersion` from a sibling module (likely `validate_state.mjs` or `state.schema.json` adapter). Either (a) the exporting module no longer exports under that name (renamed or removed during a refactor), or (b) the export path changed (file moved) and the import string was missed.
- **Family resemblance:** same shape as BUG-021 (token-ledger detector regression post-template-strip) — exporter renamed, consumer not updated.

## Existing Surfaces

> L1 reuse audit.

- **Surface:** `.cleargate/scripts/update_state.mjs` — broken import block at top of file.
- **Surface:** `.cleargate/scripts/validate_state.mjs` (or wherever `validateShapeIgnoringVersion` was last exported) — export site to restore or alias.
- **Surface:** `.cleargate/scripts/state.schema.json` — schema the validator reads against; unchanged by this fix.
- **Surface:** `cleargate-planning/.cleargate/scripts/update_state.mjs` — canonical mirror; fix lands here too per scaffold-mirror discipline.
- **Why this fix extends rather than rebuilds:** the validation contract is correct; only the export/import wiring is broken. One-line restore preserves intent.

## 4. Execution Sandbox (Suspected Blast Radius)

- **Modify (script):** `.cleargate/scripts/update_state.mjs` — fix the import.
- **Modify (canonical mirror):** `cleargate-planning/.cleargate/scripts/update_state.mjs` — same fix.
- **Possibly modify:** `.cleargate/scripts/validate_state.mjs` (or actual export site) — re-add the missing export, or alias to the current name.
- **Fix paths (two options):**
  - **(a) Restore the missing export** (preferred). If `validateShapeIgnoringVersion` was dropped/renamed, re-add it (or alias the new name). One-line change.
  - **(b) Simplify the script.** If the import was over-engineered, inline the minimal validation needed (~5-line shape check against `state.schema.json`).
- **Out of scope:** any change to `state.schema.json`, the lifecycle reconciler, or downstream consumers.

## 5. Verification Protocol

1. **Bug reproduces pre-fix.** Run `node .cleargate/scripts/update_state.mjs SPRINT-01 STORY-001-01 Done` in a fresh init folder → ImportError.
2. **Fix unblocks.** Same command post-fix → exits 0, mutates state.json correctly, state.json validates against `state.schema.json`.
3. **Validation still fires.** Run with an invalid shape (e.g., bogus story status) → script rejects with a clear error.
4. **Mirror parity.** `diff .cleargate/scripts/update_state.mjs cleargate-planning/.cleargate/scripts/update_state.mjs` returns empty.
5. **Regression test added.** `cleargate-cli/test/scripts/test_update_state.sh` (or new) covers happy path + invalid-shape rejection.

**Test commands:**
- `node .cleargate/scripts/update_state.mjs SPRINT-NN STORY-NN-NN Done` against a fixture sprint.
- `bash .cleargate/scripts/test/test_update_state.sh` (post-fix, if test exists).

**Pre-commit:** typecheck + tests green; one commit `fix(BUG-026): update_state.mjs import — restore validateShapeIgnoringVersion export`; never `--no-verify`.

**Post-commit:** archive bug file; append flashcard line.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)

**Current Status: 🟢 Low Ambiguity — Ready for Fix**

- [x] Repro steps deterministic (3 steps, fresh init, single command).
- [x] Severity set: high.
- [x] Root cause hypothesized with two fix paths.
- [x] Verification provides 5 acceptance scenarios.
- [x] No TBDs.
- [ ] `approved: true` is set in the YAML frontmatter.
