---
cr_id: CR-050
parent_ref: EPIC-013
parent_cleargate_id: EPIC-013
sprint_cleargate_id: SPRINT-24
carry_over: false
status: Ready
approved: true
approved_at: 2026-05-04T18:30:00Z
approved_by: human
created_at: 2026-05-04T18:00:00Z
updated_at: 2026-05-04T18:30:00Z
created_at_version: cleargate@0.10.0
updated_at_version: cleargate@0.10.0
context_source: |
  CR-046 shipped the run_script.sh wrapper rewrite (arbitrary-cmd
  interface) PLUS a back-compat shim (commit 763e7f7, Path A) that
  detects `<script-name>.{mjs,sh}` arg-1 and routes through node/bash.

  Path A was the right SPRINT-23 choice — minimal blast radius,
  ships fast. But it leaves the codebase with two interfaces in
  parallel: 6 production CLI call-sites (sprint init/close, state
  update/validate, gate qa/arch) still pass `<script-name>.{mjs,sh}`
  and rely on the back-compat shim. The new arbitrary-cmd interface
  is the canonical going-forward; the shim is debt.

  CR-050 retires the shim by migrating the 6 callers to the new
  interface. After migration: shim deleted; wrapper has one canonical
  interface; all callers go through it explicitly.

  Architect post-flight on CR-046 (commit 763e7f7) named the 6 sites:
  - cleargate-cli/src/commands/sprint.ts:237 (sprint init)
  - cleargate-cli/src/commands/sprint.ts:284 (sprint close)
  - cleargate-cli/src/commands/state.ts:87  (state update)
  - cleargate-cli/src/commands/state.ts:130 (state validate)
  - cleargate-cli/src/commands/gate.ts:420  (gate qa)
  - cleargate-cli/src/commands/gate.ts (gateArch handler)
  Plus 2 prose lines in cleargate-planning/.claude/agents/architect.md
  (already updated to NEW form in commit 763e7f7).
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-05-04T13:58:51Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id CR-050
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-05-04T13:58:51Z
  sessions: []
---

# CR-050: run_script.sh Path B Caller Migration + Shim Removal

## 0.5 Open Questions

- **Question:** Migration shape — `node` vs `bash` explicit, or auto-resolve?
  - **Recommended:** explicit. Each caller passes `node` or `bash` as arg-1, then the script path as arg-2. Most explicit, no surprise routing. Wrapper continues to support arbitrary executables for non-script use cases.
  - **Human decision:** _populated during Brief review_

- **Question:** Delete the back-compat shim, or keep with deprecation warning?
  - **Recommended:** DELETE. After 6 production callers migrate, no in-repo caller uses the OLD interface. Keeping the shim adds bash complexity for an empty support surface. Outside-repo callers would need to migrate; we have none.
  - **Human decision:** _populated during Brief review_

- **Question:** Test strategy — update existing tests OR add new e2e tests?
  - **Recommended:** Update existing tests. The 6 callers' integration tests (sprint.node.test.ts, state.node.test.ts, gate.node.test.ts) currently inject spawnMock; switch them to invoke the real wrapper via tmpdir-spawnSync (per CR-046 Architect kickback flashcard). This both covers the migration AND retroactively fixes the spawnMock-blindspot bug that hid the regression.
  - **Human decision:** _populated during Brief review_

- **Question:** Coordinate with CR-052 (e2e wrapper test pattern)?
  - **Recommended:** YES — CR-052 ships `cleargate-cli/test/helpers/wrap-script.ts` (or similar) helper. CR-050 consumes it. Therefore: CR-052 lands first in W2 ordering; CR-050 imports the helper. Otherwise CR-050 inlines tmpdir-spawnSync logic into 3 test files = duplication.
  - **Human decision:** _populated during Brief review_

- **Question:** What if a 7th caller is found mid-migration?
  - **Recommended:** Migrate it as part of CR-050 (same scope class). Surface in §4 Execution Log. Do NOT defer to a follow-up CR for a single missed caller; the back-compat shim cannot be deleted while any caller depends on it.
  - **Human decision:** _populated during Brief review_

## 1. The Context Override (Old vs. New)

**Obsolete Logic (What to Remove / Forget):**
- run_script.sh accepts both arbitrary-cmd AND `<script-name>.{mjs,sh}` per back-compat shim.
- Production callers in cleargate-cli/src/commands/{sprint,state,gate}.ts pass script names.
- Two parallel interfaces — keep the shim "for safety".

**New Logic (The New Truth):**
- run_script.sh has ONE canonical interface: `bash run_script.sh <executable> [args...]`.
- 6 production callers pass `node <script>.mjs` or `bash <script>.sh` explicitly.
- The back-compat extension-routing block (CR-046 commit 763e7f7) is removed.
- Tests for the 6 callers exercise the real wrapper via tmpdir-spawnSync — no spawnMock for wrapper invocations.

## 2. Blast Radius & Invalidation

- [ ] **`cleargate-cli/src/commands/sprint.ts`** — 2 invocations (preflight at L237, close at L284). Pass `node` + script path explicitly.
- [ ] **`cleargate-cli/src/commands/state.ts`** — 2 invocations (update at L87, validate at L130). Pass `node` + script path.
- [ ] **`cleargate-cli/src/commands/gate.ts`** — 2 invocations (qa at L420, arch in gateArch handler). Pass `bash` + script path.
- [ ] **`.cleargate/scripts/run_script.sh`** — DELETE the back-compat extension-routing block (~15 LOC from commit 763e7f7). Keep self-exemption + failure capture + arbitrary-cmd path.
- [ ] **`cleargate-planning/.cleargate/scripts/run_script.sh`** — canonical mirror.
- [ ] **6 caller test files** — update spawnMock-style tests to use shared helper from CR-052 (`test/helpers/wrap-script.ts`). NEW assertion: real wrapper exec returns expected exit code.
- [ ] **`cleargate-cli/test/scripts/run-script-wrapper-backcompat.node.test.ts`** — DELETE (companion test for the shim being removed).

## Existing Surfaces

- **Surface:** `cleargate-cli/src/commands/sprint.ts` — 2 callers.
- **Surface:** `cleargate-cli/src/commands/state.ts` — 2 callers.
- **Surface:** `cleargate-cli/src/commands/gate.ts` — 2 callers.
- **Surface:** `.cleargate/scripts/run_script.sh` — wrapper with shim.
- **Surface:** `cleargate-cli/test/scripts/run-script-wrapper-backcompat.node.test.ts` — shim companion test.
- **Why this CR extends rather than rebuilds:** wrapper exists; arbitrary-cmd interface exists. CR-050 retires one branch. Bounded.

## 3. Execution Sandbox

**Modify:**
- 3 src/commands files (6 invocations updated)
- run_script.sh + canonical mirror (delete shim block)
- 3 test files (replace spawnMock with shared helper)

**Add:**
- (none — depends on CR-052's `test/helpers/wrap-script.ts`)

**Delete:**
- `cleargate-cli/test/scripts/run-script-wrapper-backcompat.node.test.ts`

**Out of scope:**
- run_script.sh self-repair (deferred from CR-046 §0.5 Q3; future CR)
- UTF-8 byte-vs-char truncation (deferred from CR-046; future CR)

## 4. Verification Protocol

**Acceptance:**
1. All 6 production callers updated. Grep `cleargate-cli/src/commands/` for `run_script.sh` invocations — every match passes `node` or `bash` as first arg, never a bare `<script-name>.{mjs,sh}`.
2. Back-compat shim block removed from run_script.sh. Wrapper LOC drops by ~15.
3. CLI smoke: `cleargate sprint preflight SPRINT-NN`, `cleargate state validate <id>`, `cleargate gate qa <file>` all exit non-127 on a worktree with the new wrapper.
4. 3 caller test files updated to use shared helper from CR-052; tests exercise real wrapper. No `spawnMock as never` for run_script.sh invocations.
5. Companion test `run-script-wrapper-backcompat.node.test.ts` deleted; sprint test count stays consistent (deletions counted in §4 Execution Log).
6. Mirror parity: live ↔ canonical for run_script.sh + 5 agent prompts (no agent prompt edits expected; CR-046 already updated architect.md prose).
7. `cd cleargate-cli && npm run typecheck && npm test` exits 0.

**Test Commands:**
- `cd cleargate-cli && npm test`
- (manual) `bash .cleargate/scripts/run_script.sh node .cleargate/scripts/validate_state.mjs --state-file <path>` should work.
- (manual) `bash .cleargate/scripts/run_script.sh validate_state.mjs` should now FAIL (shim removed; bare-name no longer routes).

**Pre-commit:** `cd cleargate-cli && npm run typecheck && npm test`. Never `--no-verify`.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟡 Yellow — Awaiting Brief approval**

- [x] §0.5 Open Questions surfaced (5 questions, all with recommended defaults).
- [x] §3 Execution Sandbox lists files to touch.
- [x] §4 Verification Protocol has testable acceptance.
- [ ] Human approves §0.5 defaults (or overrides).
- [ ] Lane assigned at SDR (preliminary: standard — 9 files + interface change).
- [ ] Dependency on CR-052 (W2 ordering) confirmed.

---
