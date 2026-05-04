---
cr_id: CR-042
parent_ref: EPIC-013
parent_cleargate_id: EPIC-013
sprint_cleargate_id: SPRINT-22
carry_over: false
status: Ready
approved: true
approved_at: 2026-05-04T08:30:00Z
approved_by: sandrinio
created_at: 2026-05-04T08:00:00Z
updated_at: 2026-05-04T08:00:00Z
created_at_version: cleargate@0.10.0
updated_at_version: cleargate@0.10.0
context_source: |
  CR-039 spike (SPRINT-21 W5) finding #4: reporter.md L108 claim
  "Task tool creates new conversation per dispatch" is INACCURATE per
  ledger evidence. SPRINT-20 + SPRINT-21 token-ledger.jsonl shows all
  rows for a given orchestrator session share one session_id (not
  per-dispatch). Architect post-flight on CR-039 confirmed; flagged as
  separate CR for SPRINT-22.

  Live `.claude/agents/reporter.md` is gitignored at /.claude/. Tracked
  copies at `cleargate-planning/.claude/agents/reporter.md` (canonical)
  and `cleargate-cli/templates/cleargate-planning/.claude/agents/reporter.md`
  (npm payload, auto-mirrored via prebuild).

  This is a doc-only fix. Code behavior unchanged. Future session-reset
  implementation (if any) is CR-041 which is gated NO-GO leaning.
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-05-04T08:32:14Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id CR-042
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-05-04T08:32:14Z
  sessions: []
---

# CR-042: reporter.md L108 "fresh session" claim corrected

## 0.5 Open Questions

- **Question:** Replace the inaccurate claim with what?
  - **Recommended:** drop the "Task tool creates new conversation per dispatch" sentence entirely; replace with a one-liner: "Reporter dispatch runs in the orchestrator's session_id; the SubagentStop hook attributes tokens to the work_item via the dispatch marker (.dispatch-<session-id>.json)." This is code-truth per CR-026.
  - **Human decision:** _populated during Brief review_

- **Question:** Audit other agent prompts for the same inaccuracy?
  - **Recommended:** yes, grep all `cleargate-planning/.claude/agents/*.md` for "fresh session", "new conversation", "per dispatch" — any matches in `architect.md`, `developer.md`, `qa.md`, `reporter.md` get the same fix in the same commit.
  - **Human decision:** _populated during Brief review_

## 1. The Context Override (Old vs. New)

**Obsolete Logic (What to Remove / Forget):**
- reporter.md (and possibly other agent prompts) instructs the agent assuming "Task tool creates new conversation per dispatch" or equivalent fresh-session semantics.
- Reporter prompt may instruct the agent to expect its own session_id.

**New Logic (The New Truth):**
- All Agent-tool dispatches share the orchestrator's session_id (verified empirically per CR-039 spike).
- Token attribution to the correct work_item happens via the dispatch marker file `.cleargate/sprint-runs/<sprint>/.dispatch-<session-id>.json` (CR-026).
- Reporter prompt should NOT carry "fresh session" mechanics.

## 2. Blast Radius & Invalidation

- [ ] `cleargate-planning/.claude/agents/reporter.md` (canonical) — update L108 + any related sentences.
- [ ] `cleargate-cli/templates/cleargate-planning/.claude/agents/reporter.md` (npm payload) — auto-mirrored via `npm run prebuild`.
- [ ] Live `.claude/agents/reporter.md` — gitignored; needs hand-port post-merge OR `cleargate init` re-sync.
- [ ] Other agent prompts (`architect.md`, `developer.md`, `qa.md`) — audit for same inaccuracy in same commit.
- [ ] Reporter prompt instructions in `.claude/skills/sprint-execution/SKILL.md` §E — verify no contradiction with corrected reporter.md.
- [ ] Database schema impacts? **No** — doc-only.

## Existing Surfaces

- **Surface:** `cleargate-planning/.claude/agents/reporter.md:L108` — the inaccurate claim (per CR-039 architect post-flight finding).
- **Surface:** `.cleargate/sprint-runs/SPRINT-21/spikes/CR-039_session_reset_memo.md` — the spike memo with full evidence.
- **Surface:** `.cleargate/sprint-runs/SPRINT-21/reports/CR-039-arch.md` — Architect's confirmation of doc-bug + recommendation to file as separate CR.
- **Why this CR extends rather than rebuilds:** doc-only fix, smaller than a story-level effort.

## 3. Execution Sandbox

**Modify:**
- `cleargate-planning/.claude/agents/reporter.md` (canonical)
- (Optional, if other agents have same inaccuracy:) `cleargate-planning/.claude/agents/{architect,developer,qa}.md`

**Auto-regenerated:**
- `cleargate-cli/templates/cleargate-planning/.claude/agents/reporter.md` (via `npm run prebuild`)
- `cleargate-planning/MANIFEST.json` (via prebuild)

**Hand-port (post-merge):**
- Live `.claude/agents/reporter.md` (gitignored; sync via `cleargate init` or copy)

**Out of scope:**
- Implementing actual session-reset behavior (CR-041, gated).
- Token-ledger schema changes.
- SKILL.md rewrites (CR-043 + CR-044 own those).

## 4. Verification Protocol

**Acceptance:**
1. `grep -n "Task tool creates new conversation\|new conversation per dispatch\|fresh session" cleargate-planning/.claude/agents/reporter.md` returns 0 hits.
2. Same grep across `cleargate-planning/.claude/agents/{architect,developer,qa}.md` — 0 hits (or hits only in code-truth contexts that explain the misconception).
3. `diff cleargate-planning/.claude/agents/reporter.md cleargate-cli/templates/cleargate-planning/.claude/agents/reporter.md` empty post-`npm run prebuild`.
4. Reporter prompt instructs agent to attribute tokens via dispatch marker (positive assertion — find the sentence).
5. `cleargate-planning/MANIFEST.json` regenerated with new SHA256 for reporter.md.
6. Live `.claude/agents/reporter.md` ↔ canonical drift documented in commit message: "Live re-sync required via `cleargate init` or hand-port post-merge."

**Test Commands:**
- `grep -n "fresh session\|new conversation" cleargate-planning/.claude/agents/*.md`
- `cd cleargate-cli && npm run prebuild && diff cleargate-planning/.claude/agents/reporter.md cleargate-cli/templates/cleargate-planning/.claude/agents/reporter.md`
- (Manual) re-read corrected reporter.md against CR-039 memo evidence.

**Pre-commit:** `cd cleargate-cli && npm run typecheck` (no-op for doc edits) + `npm test` (no-op for doc edits, but keep the gate). Never `--no-verify`.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟡 Yellow — Awaiting Brief approval**

Requirements to pass to Green (Ready for Execution):
- [x] "Obsolete Logic" to be evicted is explicitly declared.
- [x] Downstream impacts identified (canonical + npm payload + live mirror).
- [x] Execution Sandbox contains exact file paths.
- [x] Verification commands provided (6 acceptance criteria).
- [ ] `approved: true` is set in YAML frontmatter (post-Brief).
- [x] §2.5 Existing Surfaces cites at least one source-tree path the CR extends.
