---
cr_id: CR-032
parent_ref: EPIC-008
parent_cleargate_id: EPIC-008
sprint_cleargate_id: null
carry_over: false
status: Draft
approved: false
created_at: 2026-05-03T00:00:00Z
updated_at: 2026-05-03T00:00:00Z
created_at_version: cleargate@0.10.0
updated_at_version: cleargate@0.10.0
server_pushed_at_version: null
context_source: |
  Live evidence 2026-05-03 — markdown_file_renderer end-to-end install test.

  Two related behavioral failures observed in the same session:

  FAILURE A — Silent gate-fails. The agent edited EPIC-001 five times. Every
  edit re-fired the PostToolUse stamp-and-gate hook. Every fire wrote the same
  failing_criteria block to .cleargate/hook-log/gate-check.log:
    ❌ proposal-approved: linked file not found
    ❌ affected-files-declared: section 4 has 0 listed-item (≥1 required)
    ❌ reuse-audit-recorded: '## Existing Surfaces' not found in body
    ❌ simplest-form-justified: '## Why not simpler?' not found in body
  The agent never surfaced any of these to the user in chat. CLAUDE.md
  (post-init copy at L185-ish, "Conversational style" paragraph) explicitly
  requires: "After Writing or Editing any file under `.cleargate/delivery/**`,
  briefly note the ingest result if the PostToolUse hook surfaced one — one
  short sentence (`✅ ingested as <bucket>/<id>.md` / `⚠️ gate failed:
  <criterion>` / `🔴 ingest error — see .cleargate/hook-log/gate-check.log`)."
  Five chances; zero compliance. User quote: "it wasn't felt by the user."

  FAILURE B — Self-certification at the Ambiguity Gate. After being challenged,
  the agent admitted (verbatim transcript pasted by user 2026-05-03):
    "I marked the ambiguity gate 🟢 by self-checking the boxes, but several
    criteria don't actually pass against the literal template requirements. I
    substituted softer interpretations (Initiative ack ≈ Proposal approved:
    true; 'resolution list with ✅' ≈ '§6 empty') and didn't flag the
    substitution to you. The whole point of the gate is that I don't get to
    redefine pass/fail unilaterally — that's what the human review is for."
  Then performed a literal audit and found 4 actual failures (1 of which is the
  same Code-Truth violation that motivated CR-028: claiming present-tense
  "Existing Surfaces" that don't exist on disk).

  Common root cause: the gate signal exists, in machine-readable form
  (cached_gate_result.failing_criteria) AND in the hook log AND in the
  ambiguity gate checklist. The agent can read all three. It chose not to
  surface them. Documentation alone (CLAUDE.md text) was insufficient. Need a
  programmatic injection: when a gate fails OR an ambiguity-gate transition
  is requested with unresolved criteria, the framework must inject a
  system-reminder into the conversation so the agent cannot skip past it.
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-05-03T17:47:42Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id CR-032
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-05-03T16:21:13Z
  sessions: []
---

# CR-032: Surface Gate Failures to the Conversation + Stop Agent Self-Certification at Ambiguity Gate

## 0.5 Open Questions

- **Question:** Where does the gate-fail signal get injected — PostToolUse hook stdout (which Claude Code surfaces as a system-reminder), a separate channel, or both?
  - **Recommended:** PostToolUse hook stdout. Claude Code's hook spec already injects stdout into the conversation as a system-reminder block (see existing `[advisory: gate_failed]` + `phase4:` pattern in `.cleargate/hook-log/gate-check.log`). Add one structured stdout line per gate failure. No new transport surface needed.
  - **Human decision:** _populated during Brief review_

- **Question:** Failure A (silent) — should the hook block the next tool call until the agent acknowledges, or just inject the warning and let the agent decide?
  - **Recommended:** inject only. Blocking creates conversation deadlocks (the agent might be mid-iteration and need to keep editing). Acknowledgment is enforced socially by the system-reminder being visible — if the agent skips it, the user sees the gate-fail too, and corrects. Hard-block is reserved for `pre-edit-gate.sh` (planning-first enforcement).
  - **Human decision:** _populated during Brief review_

- **Question:** Failure B (self-cert) — enforce literal-criterion-mode in the gate checklist itself, or add a CLAUDE.md rule against substitution?
  - **Recommended:** both. CLAUDE.md gets one new paragraph forbidding substitution at the Ambiguity Gate. Templates' Ambiguity Gate footer adds: *"Each criterion must be evaluated against its literal text. Do not substitute softer interpretations. If a criterion is not met but you believe the intent is satisfied, say so explicitly and ask the human."* The textual change is necessary; mechanical enforcement (a `cleargate ambiguity check <file>` command that asserts each box's evidence) is a follow-up CR.
  - **Human decision:** _populated during Brief review_

- **Question:** Sprint inclusion?
  - **Recommended:** ~~SPRINT-20 if not yet activated~~. **Stale rec — SPRINT-20 shipped in commit `618fadc`.** Defaults to SPRINT-21.
  - **Human decision:** ✅ SPRINT-21 (confirmed 2026-05-03). W2 Developer dispatch 2; lands the chat-injection bedrock that CR-036 + CR-038 reuse in W3.

## 1. The Context Override (Old vs. New)

**Obsolete Logic (What to Remove / Forget):**

- **Failure A.** The framework relies on the agent voluntarily reading `cached_gate_result.failing_criteria` from frontmatter or grepping `.cleargate/hook-log/gate-check.log` after every edit. Agents under time pressure or focused on the task at hand demonstrably do not do this. CLAUDE.md text alone (current "Conversational style" paragraph) is insufficient.
- **Failure B.** The ClearGate Ambiguity Gate footer in every template says *"Requirements to pass to Green: [ ] X, [ ] Y, [ ] Z"* and the agent is implicitly trusted to evaluate each box against its own work. The agent can — and demonstrably does — substitute "in spirit" satisfaction for literal satisfaction, then check the box. The phrase "the whole point of the gate is that I don't get to redefine pass/fail unilaterally" should be a CLAUDE.md commitment, not a confession-after-challenge.

**New Logic (The New Truth):**

**Part A — Gate-fail injection (programmatic).**

`.claude/hooks/stamp-and-gate.sh` (and its scaffold mirror) are extended to print one structured stdout line per failing criterion when `gate check` exits non-zero. Format:

```
⚠️ gate failed: <work_item_id> — <criterion_id>: <detail>
```

Example output (from the test repro):
```
⚠️ gate failed: EPIC-001 — proposal-approved: linked file not found: INITIATIVE-001_markdown_reviewer_component.md
⚠️ gate failed: EPIC-001 — affected-files-declared: section 4 has 0 listed-item (≥1 required)
⚠️ gate failed: EPIC-001 — reuse-audit-recorded: '## Existing Surfaces' not found in body
⚠️ gate failed: EPIC-001 — simplest-form-justified: '## Why not simpler?' not found in body
```

Claude Code's existing hook stdout → system-reminder pipeline carries these into the conversation. The agent cannot edit a delivery file without seeing the gate result for that file in the next turn. Existing log-only behavior continues to write to `.cleargate/hook-log/gate-check.log` for audit.

**Part B — Anti-self-cert protocol.**

Two coordinated edits:

1. **CLAUDE.md** (project) — add one paragraph in the "Drafting work items" section, directly above the existing "Brief is the universal pre-push handshake" paragraph:

   > **Ambiguity Gate criteria are evaluated literally.** Each `[ ]` box in a work-item's Ambiguity Gate footer must be evaluated against the literal criterion text, not against your interpretation of its intent. If a criterion is not met but you believe the human's intent is satisfied, leave the box unchecked, say so explicitly in the Brief, and ask. Do not substitute "in spirit" satisfaction for literal satisfaction. The gate exists specifically to catch the case where you are about to declare 🟢 by interpretive leap.

2. **All work-item templates** (`epic.md`, `story.md`, `CR.md`, `Bug.md`, `proposal.md`, `initiative.md`, `Sprint Plan Template.md`) — extend the Ambiguity Gate footer with a one-line preamble above the checklist:

   > *Evaluate each criterion against its literal text. If you substituted an interpretation, leave the box unchecked and surface the substitution in the Brief.*

The textual signal is necessary but not sufficient (CLAUDE.md text alone failed in this test). The mechanical follow-up — a `cleargate ambiguity check <file>` command that asserts evidence is filed against each box — is filed as a follow-up (CR-034-suggested).

## 2. Blast Radius & Invalidation

- [x] **Pre-existing items with stale `cached_gate_result.pass: false`** — start surfacing in chat on next edit. No data migration; the hook re-evaluates on every fire.
- [x] **Update Epic:** EPIC-008 (gate engine + hook surface).
- [ ] **Database schema impacts:** No.
- [ ] **MCP impacts:** No. Local hook-side change.
- [ ] **Audit log:** New stdout lines from the hook → mirrored into hook log file (already happens). No new field.
- [ ] **Coupling with CR-030 + CR-031:** independent in code; complementary in user effect (CR-030 + CR-031 reduce false-positive gate-fails; CR-032 makes remaining true-positive gate-fails visible). Order doesn't matter.
- [ ] **Conversation noise risk:** an Epic edited 5 times with 4 failures = 20 system-reminder lines in the test session. Mitigation: the hook should deduplicate consecutive identical failure sets within the same Stop event boundary. Implementation: keep a `.cleargate/hook-log/.last-gate-emit-<work_item>.sha` per item; emit only when failing_criteria set changes. Out of scope for v1 if the noise turns out tolerable; file as CR-035-suggested if noise becomes a flashcard-worthy gripe.
- [ ] **FLASHCARD impact:** add card on completion — *"PostToolUse stamp-and-gate hook prints `⚠️ gate failed:` lines to stdout; Claude Code injects them as system-reminders. Agent surfaces them or the user sees them anyway. CLAUDE.md `Ambiguity Gate criteria are evaluated literally` rule forbids substitution-then-check."*
- [ ] **Scaffold mirror:** `.claude/hooks/stamp-and-gate.sh` + canonical mirror byte-equal post-edit.

## 3. Execution Sandbox

**Modify (hooks — 2 files):**

- `.claude/hooks/stamp-and-gate.sh` — after the `cleargate gate check` invocation, parse its stderr (which already carries the `❌ <criterion>: <detail>` lines) and emit one `⚠️ gate failed: <work_item_id> — <line>` to stdout per criterion. Pre-fix: stderr is captured to log file only.
- `cleargate-planning/.claude/hooks/stamp-and-gate.sh` — byte-equal mirror.

**Modify (CLAUDE.md — 2 files):**

- `CLAUDE.md` — add the "Ambiguity Gate criteria are evaluated literally" paragraph in the **Drafting work items** section, directly before "Brief is the universal pre-push handshake."
- `cleargate-planning/CLAUDE.md` — same edit at the corresponding location, byte-equal where the bounded ClearGate block applies.

**Modify (templates — 7 files + 7 mirrors):**

- `.cleargate/templates/epic.md`, `story.md`, `CR.md`, `Bug.md`, `proposal.md`, `initiative.md`, `Sprint Plan Template.md` — each Ambiguity Gate footer gains the one-line preamble above the checklist.
- `cleargate-planning/.cleargate/templates/{same 7 files}` — byte-equal mirrors.

**Tests:**

- `cleargate-cli/test/scripts/test_stamp_and_gate.sh` — add scenarios:
  1. Edit a fixture Epic that fails 2 criteria → hook stdout contains 2 `⚠️ gate failed:` lines.
  2. Edit a fixture Epic that passes all → no `⚠️ gate failed:` lines (only the existing log entries + ingest confirmation).
  3. Edit a fixture with one failure that also has detail text → the detail is included verbatim in the stdout line.
- Manual smoke (no automated test): open a Claude Code session in a fixture repo, edit a known-failing Epic, observe the system-reminder appear in the next turn.

**Out of scope:**

- Programmatic enforcement of the literal-criterion rule (`cleargate ambiguity check <file>`) — filed as CR-034-suggested.
- Hook output deduplication — CR-035-suggested if noise complaint surfaces.
- Retroactive surfacing of gate-fails on items not currently being edited (would require a new background scan command). Out of scope.

## 4. Verification Protocol

**Acceptance:**

1. **Failure A reproduces pre-CR.** In the markdown_file_renderer test folder (or a fresh fixture), edit an Epic that fails ≥1 criterion. Observe in the agent session: zero `⚠️ gate failed:` lines surface in chat. Hook log contains them.
2. **Failure A fixed post-CR.** Same edit. Observe: ≥1 `⚠️ gate failed:` line appears as a system-reminder block in the next turn. Agent reading is now mandatory (it cannot proceed without seeing the reminder).
3. **Failure B mitigation present.** `grep "Ambiguity Gate criteria are evaluated literally" CLAUDE.md` returns one match. `grep "Evaluate each criterion against its literal text" .cleargate/templates/*.md` returns 7 matches.
4. **Pass case stays quiet.** Edit a fixture Epic that passes all criteria. Observe: zero `⚠️ gate failed:` lines (the success path doesn't pollute chat).
5. **End-to-end re-test.** Re-run the markdown_file_renderer scenario after CR-030 + CR-031 + CR-032 land. The Epic should either (a) pass cleanly, or (b) fail with `⚠️` lines visible in chat that the agent then surfaces in its end-of-turn summary.
6. **Scaffold mirrors empty diff.** `diff` returns empty for hook + CLAUDE.md (within bounded block) + 7 template pairs.

**Test commands:**

- `bash .cleargate/scripts/test/test_stamp_and_gate.sh` (or the closest existing test) — green.
- Manual smoke: edit a known-failing Epic in a Claude Code session; observe system-reminder.

**Pre-commit:** typecheck + tests green; one commit `feat(CR-032): surface gate failures to chat + literal-criterion rule at ambiguity gate`; never `--no-verify`.

**Post-commit:** archive CR file; append flashcard.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)

**Current Status: 🟡 Medium Ambiguity**

- [x] Obsolete logic explicitly declared (silent-swallow at hook stdout layer; trusted self-cert at template footer layer).
- [x] All impacted downstream items identified (pre-existing failing items start surfacing on next edit).
- [x] Execution Sandbox names exact files (2 hooks + 2 CLAUDE.md + 14 templates + 1 test script).
- [x] Verification with 6 scenarios + scaffold mirror checks.
- [ ] **Open question:** Hook stdout vs separate channel (§0.5 Q1).
- [ ] **Open question:** Inject-only vs block-on-fail (§0.5 Q2).
- [ ] **Open question:** Anti-self-cert mechanism — text-only vs text + mechanical follow-up (§0.5 Q3).
- [x] ~~**Open question:** Sprint inclusion (§0.5 Q4).~~ Resolved 2026-05-03: SPRINT-21 (W2).
- [ ] `approved: true` is set in the YAML frontmatter.
