---
cr_id: CR-010
parent_ref: EPIC-008
status: Completed
sprint: SPRINT-14
milestone: M1
complexity: L1
scope_cut_2026_04_26: "Label/tag UI rendering via pm-adapter.ts demoted to follow-up CR (suggested CR-012). M1 scope is gate-semantic only: gate_failed → no-longer-hard-rejects-push, advisory tag rendered as frontmatter-derived `[advisory: gate_failed]` description prefix. Strict-mode opt-in retained. Verified 2026-04-26 by Architect M1 plan §6: pm-adapter.ts is read-only; push-item.ts does not call the adapter — the originally-prescribed surface does not exist. CR-012 (suggested) builds the missing pm-adapter.pushItemLabel(...) method post-SPRINT-14."
approved: true
approved_at: 2026-04-26T00:00:00Z
approved_by: sandrinio
created_at: 2026-04-26T00:00:00Z
updated_at: 2026-04-26T00:00:00Z
created_at_version: 0.5.0
updated_at_version: 0.5.0
server_pushed_at_version: null
cached_gate_result:
  pass: false
  failing_criteria:
    - id: no-tbds
      detail: 1 occurrence at §2
  last_gate_check: 2026-04-26T09:10:22Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id CR-010
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-04-26T09:10:22Z
  sessions: []
---

# CR-010: Advisory Readiness Gates on Push — `gate_failed` Becomes a Tag, Not a Rejection

## 0. Live Evidence (Why Now)

On 2026-04-26 a SessionStart hook in the dogfood meta-repo reported **22 items blocked** at gate-check (`BUG-002/003/005/006: repro-steps-deterministic`, `EPIC-014/016/021: proposal-approved`, `EPIC-020: no-tbds`, `PROPOSAL-011: architecture-populated`, `STORY-014-01: implementation-files-declared`, +12 more). None of these items can be pushed to the PM tool today because `mcp/src/tools/push-item.ts:103-107` rejects any payload with `cached_gate_result.pass !== true` (`PushGateFailedError`, code `gate_failed`).

The user observation that surfaced the issue: *"They are blocked because answers are needed. Maybe questions are directed to product managers — those who don't work with code, but the product requirements. So it needs to be synced."*

The framework's current model assumes all readiness answers (repro steps, TBD resolution, architecture detail, file declarations) are filled **locally** before push. In practice:
- `repro-steps-deterministic` for a Bug often needs the reporter or a non-coding stakeholder to answer.
- `no-tbds` on an Epic body often marks open product questions only a PO can resolve.
- `architecture-populated` on a Proposal can be deferred until after stakeholder sign-off on intent.

By rejecting these at the MCP boundary, ClearGate forces the agent to **pretend** answers exist (or block indefinitely), instead of letting the PM tool — the natural answer-collection surface for non-coders — receive the item with its open questions intact.

## 1. The Context Override (Old vs. New)

**Obsolete Logic (What to Remove / Forget):**
- `mcp/src/tools/push-item.ts:103-107` rejecting payloads with `cached_gate_result.pass !== true`. The `PushGateFailedError` class becomes unused for this code path.
- Protocol §"Gate 3 — Push Gate" wording that frames readiness gates as a *blocking* check at push time (`cleargate-planning/.cleargate/knowledge/cleargate-protocol.md`, search `Gate 3`).
- Agent CLAUDE.md "Halt at gates" rule wording that conflates Gate 1 (Proposal approval — human-only) with Gate 3 (item readiness — currently server-blocking). Gate 1 stays. Gate 3 becomes advisory.

**New Logic (The New Truth):**

Two-tier gate semantics on push:

1. **`approved: true` remains a hard server-side gate.** This is the human go/no-go. Untouched. `PushNotApprovedError` continues to fire when `payload['approved'] !== true`.
2. **`cached_gate_result.pass !== true` becomes advisory.** The push proceeds. The remote item is created/updated with a structured **gate-status payload** that the PM adapter renders as a label, custom field, or body annotation. Failing criteria are listed by ID so PMs see exactly what's open.

Concretely:
- `push-item.ts` no longer throws on `pass !== true`. It instead passes `{ gate_status: "open", failing_criteria: [...] }` through to the PM adapter.
- The PM adapter (Linear today; pluggable) renders this as: a label `cleargate:gate-open`, plus per-criterion labels (`gate:no-tbds`, `gate:repro-steps-deterministic`, etc.), plus a body footer block `> ⚠️ This item was pushed with open readiness criteria: [list].`
- A subsequent push (after PM input is pulled back and the local file is updated) re-runs `gate check` locally; if pass, the next push removes the `cleargate:gate-open` label.
- An optional `strict-push` MCP config flag (default `false`) preserves the old hard-reject behavior for teams that want it.

## 2. Blast Radius & Invalidation

- [x] Invalidate/Update Story: STORY-010-07 (push-gate enforcement) — its server-side `gate_failed` rejection branch is being demoted. Story is shipped (in archive); this CR amends its enforcement contract. Follow-up story under EPIC-008 will refactor the test suite.
- [x] Invalidate/Update Epic: **EPIC-008** (Token Cost & Readiness Gates) is the parent. Its readiness-gate model is preserved — only the *enforcement layer* moves from server-side rejection to label-based annotation.
- [ ] Database schema impacts: **None.** Gate state lives in frontmatter (already shipped) and PM-tool labels (created on demand, no migration).
- [ ] Audit log: `runTool` audit entries change shape. Today a failed push writes `result='error', errorCode='gate_failed'`. After this CR: a push with open gates writes `result='success', gate_status='open', failing_criteria=[...]`. Audit-log readers must handle both during transition.
- [ ] FLASHCARD impact: add card on completion — *"Push-time gate semantics: `approved` is hard-reject; `cached_gate_result` is advisory and renders as PM-tool labels. Strict mode opts back into hard-reject."*
- [ ] Cross-repo: Agent CLAUDE.md (`cleargate-planning/CLAUDE.md` + the live `.claude/...` injection) must reword "Halt at gates" so the four-agent loop and the conversational agent stop treating Gate 3 as a blocker.
- [ ] Adapter contract change: `mcp/src/adapters/pm-adapter.ts` interface gains a `gate_status` field on push payload; `linear-adapter.ts` implements label + body-footer rendering. Adapters not yet built (Jira, GitHub Projects) inherit the contract.

## 3. Execution Sandbox

**Modify:**
- `mcp/src/tools/push-item.ts` — remove the `cached_gate_result.pass` rejection branch (lines 99-107). Pass `gate_status` + `failing_criteria` through to the adapter call. `PushGateFailedError` class kept but only thrown when `strict-push` config is on.
- `mcp/src/tools/push-item.test.ts` — invert tests for the gate_failed path (was: throws → is: succeeds with gate_status='open'); add new strict-mode test covering rejection.
- `mcp/src/adapters/pm-adapter.ts` — extend the push-item interface with `gate_status?: 'pass' | 'open'` and `failing_criteria?: string[]`.
- `mcp/src/adapters/linear-adapter.ts` — implement label + body-footer rendering on push. On a subsequent push with `gate_status='pass'`, remove the labels and the footer block (idempotent).
- `mcp/src/adapters/linear-adapter.test.ts` — fixtures for: open-gate push (labels added), passing re-push (labels removed), criterion change between pushes (label set updated).
- `mcp/src/config.ts` — add `STRICT_PUSH_GATES` boolean env (default `false`).
- `cleargate-planning/.cleargate/knowledge/cleargate-protocol.md` — rewrite Gate 3 section. Old: "lint must pass before `cleargate_push_item` is called." New: "`approved: true` must be set; readiness gates are surfaced as labels, not blockers; opt into strict mode via env."
- `cleargate-planning/CLAUDE.md` — reword "Halt at gates" to clarify Gate 1 (Proposal approval) and Gate 2 (Ambiguity) remain human-confirm; Gate 3 push proceeds with open readiness criteria when the user authorizes the push.
- `CLAUDE.md` (live meta-repo, OUTSIDE the bounded ClearGate block — only if dogfood policy diverges) — no change planned; project overrides untouched.

**Out of scope:**
- Wiki-sync via MCP (separate Epic).
- Capability gating of sync skills by membership state (CR-011).
- Adapters beyond Linear (no Jira/GitHub adapter exists yet; contract is defined here so future adapters inherit it).
- Removing `PushGateFailedError` class entirely (kept for strict-mode path).

## 4. Verification Protocol

**Acceptance:**
1. **Default mode (advisory).** With `STRICT_PUSH_GATES=false` (default): push a Bug with `cached_gate_result.pass=false, failing_criteria=['repro-steps-deterministic']`. Assert: MCP returns success; remote Linear issue exists with labels `cleargate:gate-open` + `gate:repro-steps-deterministic`; body footer contains the criterion list.
2. **Re-push closes the loop.** After the local file has `cached_gate_result.pass=true` (PM answered, agent updated, gate check re-ran), re-push the same item. Assert: the labels and footer are removed; audit log records `gate_status='pass'`.
3. **Strict mode preserves old behavior.** With `STRICT_PUSH_GATES=true`: push the same Bug with failing gates. Assert: `PushGateFailedError` thrown; audit log records `result='error', errorCode='gate_failed'`.
4. **`approved: true` still hard-rejects.** Push with `approved !== true` regardless of gate state. Assert: `PushNotApprovedError` thrown. Behavior unchanged from today.
5. **Protocol + CLAUDE.md alignment.** Manual review: agents reading the new Gate 3 wording no longer treat readiness gates as a push blocker.

**Test commands:**
- `cd mcp && npm run typecheck && npm test` — green.
- `cd mcp && npm test push-item.test.ts linear-adapter.test.ts` — focused.
- Manual smoke: dogfood meta-repo, run a push on one of the 22 currently-blocked items (e.g. BUG-006); confirm Linear issue appears with the open-gate labels.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟡 Medium Ambiguity**

Requirements to pass to Green (Ready for Execution):
- [x] "Obsolete Logic" to be evicted is explicitly declared (push-item.ts:103-107 rejection branch; protocol Gate 3 wording; CLAUDE.md "Halt at gates" framing).
- [x] All impacted downstream Epics/Stories are identified (EPIC-008 parent; STORY-010-07 enforcement contract amended).
- [x] Execution Sandbox contains exact file paths.
- [x] Verification command is provided.
- [ ] **Open question:** Label-vs-custom-field-vs-title-prefix mechanism. Draft picks Linear labels because they are pluggable across PM tools and require zero schema config. Confirm with user before STORY decomposition.
- [ ] **Open question:** Default value of `STRICT_PUSH_GATES`. Draft picks `false` (advisory by default) on the principle that the dogfood evidence (22 blocked items, no escape hatch) is the failure mode to fix. Confirm.
- [ ] **Open question:** Audit-log shape change. Acceptable to write `gate_status` as a new field on success rows, or do we need a migration?
- [ ] `approved: true` is set in the YAML frontmatter.
