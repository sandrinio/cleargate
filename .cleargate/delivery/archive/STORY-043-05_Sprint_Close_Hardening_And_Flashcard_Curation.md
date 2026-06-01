---
story_id: STORY-043-05
parent_epic_ref: EPIC-043
parent_cleargate_id: EPIC-043
sprint_cleargate_id: SPRINT-33
carry_over: false
area: scripts,close,reporter,flashcard
status: Completed
approved: true
approved_by: sandrinio
approved_at: 2026-06-01T00:00:00Z
context_source: |
  Decomposed from EPIC-043 (Framework Hygiene & Efficiency Remediation) at SPRINT-33
  kickoff 2026-06-01. Covers WS8(e) (close_sprint.mjs fail-closed dist assertion +
  remove the redundant --assume-ack cascade pass), WS8(f) (reporter.md v2 seven-section
  re-sync, template_version 1->2), and WS2 (review-driven flashcard-archival step at
  Gate 4 -> greppable .cleargate/FLASHCARD-archive.md). Inherits the Epic's proposal-gate
  waiver (CR-025 retired the proposal step).
proposal_gate_waiver: true
ambiguity: 🟢 Low
complexity_label: L3
parallel_eligible: n
created_at: 2026-06-01T12:00:00Z
updated_at: 2026-05-31T00:00:00Z
created_at_version: cleargate@0.13.0
updated_at_version: cleargate@0.13.0
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-05-31T21:39:50Z
source: local-authored
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id STORY-043-05
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-05-31T21:39:50Z
  sessions: []
---

# STORY-043-05: Sprint-Close Hardening & Flashcard Curation

## 1. The Spec (The Contract)

### 1.1 User Story

As a **ClearGate orchestrator closing a sprint at Gate 4**, I want the close cascade's
lifecycle/orphan/merge gates to **fail closed when the CLI `dist/` is stale or absent**
(instead of silently skipping as "non-fatal"), the redundant second cascade run on
`--assume-ack` removed, the Reporter agent re-synced to the **v2 seven-section** template,
and a **review-driven flashcard-archival step** added to close — so that close-stage
integrity holes are sealed and the FLASHCARD hot file is curated by human review (never by
age), without touching the load-bearing engine.

### 1.2 Detailed Requirements

- **WS8(e) — fail-closed dist assertion.** Add a single assertion early in
  `.cleargate/scripts/close_sprint.mjs` (before the Step 2.6 cascade) that verifies a built
  `cleargate-cli/dist/cli.js` exists. If it is absent, the close **aborts with a non-zero
  exit and a clear message** ("dist not built — run `npm run build` in cleargate-cli/")
  rather than letting Steps 2.6 / 2.6b / 2.6c / 2.6d / 2.8 take their "CLI binary not found
  (non-fatal)" skip path. The lifecycle, cross-sprint-orphan, parent-rollup, same-sprint-
  backsync, and merge gates must no longer be silently no-ops when `dist/` is stale.
- **WS8(e) — remove the redundant second cascade pass.** On the `--assume-ack` path, the
  full lifecycle/orphan/merge cascade must run **exactly once**. Remove the duplicate cascade
  invocation so the gates are not paid twice per close.
- **WS8(f) — Reporter v2 seven-section re-sync.** In `.claude/agents/reporter.md`: bump the
  documented `template_version` from **1 → 2**; change "all six sections (§§1-6)" / "All six
  sections required" prose to **seven (§§1-7)**; and add the three missing v2 sections to the
  §6-synthesize block — **§4 Observe**, **§5 Lessons**, **§6 Self-Assessment**, **§7 Change
  Log** (re-numbered from the current §4 Lessons / §5 Self-Assessment / §6 Change Log). The
  guardrail line "All six sections required" becomes "All seven sections required."
- **WS2 — flashcard-archival-candidate step at close.** Add a flashcard-curation step to the
  close pipeline + Reporter spec: the Reporter surfaces **archival candidates** — cards
  **superseded** by a later card, a **resolved** one-off, or a **duplicate** — each with a
  one-line reason. A human approves the batch at **Gate 4**. Only approved cards move to a
  greppable cold file `.cleargate/FLASHCARD-archive.md`. **Curation is by review, not by
  clock** — a still-relevant card stays regardless of age; **no entry is auto-evicted or
  deleted**.
- **Mirror canonical + payload.** Edits to `.claude/agents/reporter.md` and
  `.claude/skills/flashcard/SKILL.md` (live) MUST be mirrored to the canonical
  `cleargate-planning/.claude/agents/reporter.md` (and the flashcard SKILL canonical), so the
  npm `prebuild` propagates them. Update `.claude/skills/flashcard/SKILL.md` to document the
  cold-archive file and the review-driven (not age-based) curation rule.

### 1.3 Out of Scope

- **Execution-mode strip** (CR-070) — do not edit `execution_mode` lines; WS8(e) sequences
  after CR-070 but shares no lines with it.
- **WS8(a)–(d)** — `pending-task-sentinel.sh`, `CR.md`/`Bug.md` `context_source`, Bug §2
  repro, `hotfix` `WorkItemType` registration — those are sibling stories' files, not this one.
- **WS3 wiki recompile**, **WS4 Architect re-entries**, **WS5 surface hygiene**, **WS7
  consolidation** — other workstreams.
- Mechanical **age/byte FLASHCARD rotation** — explicitly rejected (Epic §6 Q1); curation is
  review-only.

## 2. The Truth (Executable Tests)

### 2.1 Acceptance Criteria (Gherkin)

```gherkin
Feature: Sprint-close hardening and review-driven flashcard curation

  Scenario: Close fails closed when the CLI dist is absent (WS8e)
    Given cleargate-cli/dist/cli.js does not exist
    When close_sprint.mjs runs the close cascade
    Then it aborts before Step 2.6 with a non-zero exit
    And the message instructs to build dist (npm run build in cleargate-cli/)
    And the lifecycle, orphan, parent-rollup, backsync, and merge gates are NOT silently skipped

  Scenario: The full cascade runs exactly once on --assume-ack (WS8e)
    Given a sprint is closed with --assume-ack and a present built dist/
    When close_sprint.mjs completes
    Then the lifecycle/orphan/merge cascade executes exactly one time
    And the previously-duplicated second cascade pass is gone

  Scenario: Reporter spec is re-synced to the v2 seven-section template (WS8f)
    Given .claude/agents/reporter.md
    Then it documents template_version 2 (not 1)
    And it requires seven sections (§§1-7), not six
    And §4 Observe, §5 Lessons, §6 Self-Assessment, §7 Change Log are all named
    And the canonical cleargate-planning/.claude/agents/reporter.md is byte-identical to live

  Scenario: Flashcard curation surfaces candidates for human approval at Gate 4 (WS2)
    Given a sprint is being closed at Gate 4
    When the flashcard-archival step runs
    Then the Reporter surfaces archival candidates, each with a one-line reason (superseded / resolved / duplicate)
    And only candidates a human approves move to .cleargate/FLASHCARD-archive.md
    And a still-relevant card stays regardless of age (no clock-based eviction)
    And every archived entry remains greppable in FLASHCARD-archive.md (none deleted)

  Scenario: Stale dist Error path — gate would have failed open before the fix (WS8e)
    Given cleargate-cli/dist/cli.js is stale or missing
    And the old close cascade emitted "CLI binary not found (non-fatal)" and continued
    When the hardened close_sprint.mjs runs
    Then it raises a fail-closed dist-assertion Error and exits non-zero
    And it does NOT reach the sprint_status flip with un-run lifecycle/merge gates
```

### 2.2 Verification Steps (Manual)

- [ ] `grep -c "non-fatal" .cleargate/scripts/close_sprint.mjs` no longer covers the lifecycle/orphan/merge skip — a dist-absent run aborts non-zero before Step 2.6.
- [ ] Move/rename `cleargate-cli/dist/cli.js`, run `node .cleargate/scripts/close_sprint.mjs <test-sprint>`; confirm a non-zero exit with the "dist not built" message.
- [ ] Restore `dist/`, run with `--assume-ack`; confirm the cascade log lines (Step 2.6 / 2.6b / 2.8) appear exactly once.
- [ ] `grep -n "template_version" .claude/agents/reporter.md` shows 2; `grep -ci "seven sections\|§§1-7" .claude/agents/reporter.md` ≥ 1; "six sections" no longer asserts the requirement.
- [ ] `diff .claude/agents/reporter.md cleargate-planning/.claude/agents/reporter.md` prints nothing (identical).
- [ ] `grep -n "FLASHCARD-archive.md\|by review, not by clock\|archival candidate" .claude/skills/flashcard/SKILL.md` returns hits; canonical SKILL mirrors it.
- [ ] Dry-run the Reporter flashcard step against `.cleargate/FLASHCARD.md`; confirm candidates print with reasons and nothing is written without human approval.

## 3. The Implementation Guide

### 3.1 Context & Files

- `.cleargate/scripts/close_sprint.mjs` — WS8(e): add the fail-closed `dist/cli.js`
  assertion before Step 2.6 (currently each of Steps 2.6 line ~354, 2.6b line ~405, 2.6c
  line ~454, 2.6d line ~512, and 2.8 fail open with "CLI binary not found (non-fatal)"); and
  remove the redundant second cascade pass on the `--assume-ack` branch (`assumeAck` set at
  line ~168). Also wire the WS2 flashcard-archival-candidate surfacing into the close
  pipeline alongside the existing Step 6.7 `--flashcard-cleanup` scan.
- `.claude/agents/reporter.md` — WS8(f): bump `template_version` 1→2 (line ~113), change
  "all six sections (§§1-6)" (line ~49) and "All six sections required" (line ~260) to seven
  / §§1-7, and add §4 Observe / §5 Lessons / §6 Self-Assessment / §7 Change Log to the §6
  synthesize block (lines ~101-111). WS2: document the flashcard-archival-candidate surfacing
  duty (reasons: superseded / resolved / duplicate; human approves at Gate 4; cold-archive
  target).
- `.claude/skills/flashcard/SKILL.md` — WS2: document `.cleargate/FLASHCARD-archive.md` as
  the greppable cold archive and the review-driven (not age-based) curation rule; extend Rule
  6/7 to point archival candidates at the cold file rather than deletion.
- `cleargate-planning/.claude/agents/reporter.md` — canonical mirror of the live
  `.claude/agents/reporter.md` (currently byte-identical); apply the same WS8(f)/WS2 edits so
  the npm `prebuild` propagates them. The flashcard SKILL canonical mirror is updated the same
  way.

### 3.2 Technical Logic

1. **Dist assertion (WS8e).** Resolve `cleargate-cli/dist/cli.js` from `REPO_ROOT`; if it
   does not exist, `process.stderr.write` the build instruction and `process.exit(1)` BEFORE
   Step 2.6. Keep the existing `CLEARGATE_SKIP_*` test seams intact so test environments can
   still bypass the gates explicitly — the assertion fails closed only on *unintended*
   staleness, not on the deliberate skip-env path.
2. **De-duplicate the cascade (WS8e).** Trace the `--assume-ack` branch (`assumeAck` truthy)
   and ensure the lifecycle/orphan/merge cascade is invoked once; delete the second
   invocation. The Step 2.6→2.8 sequence already runs unconditionally above the Gate-4 ack —
   the redundant pass is the duplicate to remove.
3. **Reporter v2 (WS8f).** String edits: `template_version: 1` → `2`; "six"/"§§1-6" →
   "seven"/"§§1-7"; insert §4 Observe and re-number Lessons → §5, Self-Assessment → §6, Change
   Log → §7 in the synthesize block + guardrails.
4. **Flashcard curation (WS2).** Reporter scans `.cleargate/FLASHCARD.md`, classifies cards
   as superseded / resolved / duplicate with a one-line reason, and emits a candidate list in
   the report + the Gate-4 Brief. close_sprint.mjs presents the list; on human approval the
   approved cards are appended to `.cleargate/FLASHCARD-archive.md` (greppable, never deleted)
   and marked `[S]`/`[R]` in the hot file per SKILL Rule 7. No card is removed by age.
5. **Mirror.** After editing live `reporter.md` + flashcard `SKILL.md`, copy byte-for-byte to
   `cleargate-planning/.claude/...`; the npm `prebuild` mirrors canonical → payload. Remind
   the user to re-sync live via `cleargate init` per the Dogfood-split rule.

## 4. Quality Gates

### 4.1 Minimum Test Expectations

| Layer | What is asserted | Mechanism |
|---|---|---|
| Script (dist gate) | dist-absent run aborts non-zero before Step 2.6 | node:test spawning close_sprint.mjs with dist path moved |
| Script (single cascade) | cascade log lines appear once under `--assume-ack` | node:test parsing stdout for duplicate Step-2.6 markers |
| Doc (reporter) | template_version 2 + seven sections + §4-§7 named | grep assertions in a `*.node.test.ts` doc-lint |
| Mirror parity | live `reporter.md` == canonical; flashcard SKILL == canonical | `diff` parity check (node:test) |
| Flashcard curation | candidates surface with reasons; archive append-only | node:test against a fixture FLASHCARD.md + dry-run |

### 4.2 Definition of Done

- [ ] close_sprint.mjs fails closed (non-zero) when `cleargate-cli/dist/cli.js` is absent, before Step 2.6.
- [ ] The `--assume-ack` path runs the lifecycle/orphan/merge cascade exactly once (redundant pass removed).
- [ ] `.claude/agents/reporter.md` documents `template_version: 2`, seven sections (§§1-7), and §4 Observe / §5 Lessons / §6 Self-Assessment / §7 Change Log.
- [ ] The flashcard-archival-candidate step is documented in close + Reporter; candidates surface at Gate 4 with reasons; approved cards move to `.cleargate/FLASHCARD-archive.md`; none deleted by age.
- [ ] `.claude/skills/flashcard/SKILL.md` documents the cold-archive file + review-driven curation.
- [ ] Canonical `cleargate-planning/.claude/agents/reporter.md` (and flashcard SKILL canonical) are byte-identical to live; user reminded to re-sync live via `cleargate init`.
- [ ] `npm run typecheck` clean + affected `npm test` green; no `--no-verify`.

## Existing Surfaces

> L1 reuse audit. Source paths this story modifies, verified by grep/read 2026-06-01.

- **Surface:** `.cleargate/scripts/close_sprint.mjs:354` — Step 2.6 emits `Step 2.6 skipped: CLI binary not found at cleargate-cli/dist/cli.js (non-fatal).` — the lifecycle gate fails open when `dist/` is stale. Mirrored at `:405` (2.6b), `:454` (2.6c), `:512` (2.6d), and the Step 2.8 `fail-open` at `:649,657`. WS8(e) adds the fail-closed assertion above these.
- **Surface:** `.cleargate/scripts/close_sprint.mjs:168` — `const assumeAck = args.includes('--assume-ack') || reportBodyStdin;` — the `--assume-ack` branch is where the redundant second cascade pass is removed.
- **Surface:** `.claude/agents/reporter.md:49,113,260` — "all six sections (§§1-6)", "Required frontmatter: ... template_version: 1", "All six sections required" — WS8(f) bumps to v2 / seven sections / §§1-7.
- **Surface:** `.claude/skills/flashcard/SKILL.md:59-65` (Rules 6-8) — append-only "Never delete" + `[S]`/`[R]` markers; the reporter "flags candidates at sprint end; a human approves the batch." WS2 points the approved batch at the new cold archive.
- **Surface:** `cleargate-planning/.claude/agents/reporter.md` — canonical mirror; `diff` confirms it is currently byte-identical to live, so the same edits must land in both.

## Why not simpler?

- **Smallest existing surface:** the four files above already exist — `close_sprint.mjs` already runs the cascade and a Step 6.7 flashcard-cleanup scan, `reporter.md` already flags flashcard candidates, and `SKILL.md` already documents `[S]`/`[R]` markers. This story narrows and reconciles them; it builds no new module and adds no new command.
- **Why isn't extension/config sufficient?** It IS extension/reconciliation — that is the point. The dist gate is a guard added to an existing cascade (not a new subsystem); the cascade de-dup is a deletion; the Reporter re-sync and flashcard curation are doc edits + one cold-archive file. A config flag cannot fix a gate that fails open by skipping, nor a doc that says "six sections" when the template has seven — those are corrections, not parameters.

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low**

*Evaluate each criterion against its literal text.*

- [x] Parent EPIC-043 is approved (`approved: true`) and this story inherits its scope.
- [x] §1.2 requirements are concrete and verifiable (grep/diff/exit-code assertions).
- [x] §2.1 Gherkin has a Feature, ≥2 Scenarios, and a named Error/edge scenario.
- [x] §3.1 cites only this story's four real file paths (no spillover into sibling stories).
- [x] §Existing Surfaces cites real source paths with file:line.
- [x] §Why not simpler? answers both sub-bullets.
- [x] 0 "TBD"s remain in the document.
