---
cr_id: CR-129
parent_ref: EPIC-063
parent_cleargate_id: null
sprint_cleargate_id: null
carry_over: false
status: Draft
approved: false
context_source: "Filed 2026-11-12 as the follow-up to STORY-063-11 §1.4 Q3 (owner approved the M2 recommendations: the brief shows report status, stories line and carried count now; a follow-up CR adds a structured goal verdict). Grounded against cleargate-cli main (sprint_report.md, reporter.md, reporter.toml, sprint-execution SKILL.md, close_sprint.mjs) and archived CR-110 on 2026-11-12. Filed for triage, not approved."
area: sprint-close,reporter,templates
created_at: 2026-11-12T00:00:00Z
updated_at: 2026-11-12T00:00:00Z
created_at_version: strategy-phase-pre-init
updated_at_version: strategy-phase-pre-init
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-11-11T23:29:49Z
  transition: ready-to-apply
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id CR-129
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-11-11T23:29:48Z
  sessions: []
---

# CR-129: Record the Sprint Goal Verdict as a Structured Field

## 0.5 Open Questions

- **Question (Q1):** Where is the verdict recorded: the report's frontmatter, or the sprint plan's frontmatter at close?
- **Recommended:** The report's frontmatter (`goal_verdict` and `goal_verdict_basis`). The report is the close-time artifact the Reporter already writes. Its frontmatter is not read by `close_sprint.mjs`'s required-row checks (`:451`, `:468` match body sections only), which was the reason CR-110 deferred this. And the report is what the wiki merges into the sprint page (CR-063), so the session brief reads it without a new source. Copying the verdict into the sprint plan's frontmatter is rejected: that would give two writers for one fact.
- **Human decision:** {populated during triage}

- **Question (Q2):** The Reporter derives the verdict before the human acks Gate 4. What if the human disputes it at close?
- **Recommended:** The field records the verdict that was acked. At Gate 4 the Brief shows the derived verdict. If the human corrects it, the orchestrator re-dispatches the Reporter with the correction, so the report frontmatter and the spoken Brief never disagree. The field also records `goal_verdict_acked_by`.
- **Human decision:** {populated during triage}

## 1. The Context Override (Old vs. New)

**Obsolete Logic (What to Remove / Forget):**
- OD-4 (CR-110, 2026-08-29): "The sprint-goal verdict is spoken in the close Brief; it is NOT written into `sprint_report.md`." CR-110 ruled this as "not this sprint", not forever, because adding a report *section* would have interacted with `close_sprint.mjs`'s required-row regex list. The rule is repeated in the sprint-execution skill (§E.2) and in both Reporter role files (Claude and Codex).
- The result today: a sprint's met / partial / missed verdict exists only in the chat Brief, CLAUDE.md prose and memory. No tool can read it, and the EPIC-063 session brief (STORY-063-11) has to fall back to report status plus the stories line.

**New Logic (The New Truth):**
- The Reporter writes `goal_verdict: met | partial | missed` and `goal_verdict_basis: <one line naming the Goal Acceptance Check evidence>` into `SPRINT-<#>_REPORT.md`'s frontmatter, derived from `sprint-context.md`'s `## Goal Acceptance Check` exactly as today. `goal_verdict_acked_by` is stamped after the Gate 4 ack (§0.5 Q2).
- OD-4 becomes: "The verdict is spoken first in the close Brief **and** recorded in the report's frontmatter. It is never added as a report body section." The body stays free of verdict prose, so the required-row checks are untouched.
- The session brief (STORY-063-11) and the wiki sprint page read `goal_verdict` when it is present, and fall back to today's status/stories line when it is absent (all reports written before this CR).

## 2. Blast Radius & Invalidation

- [x] Invalidate/Update Epic: none reverted. [[EPIC-063]] is the parent; STORY-063-11 ships first with the fallback and starts reading the field when this lands.
- [x] Invalidate/Update Story: none. [[CR-110]]'s OD-4 ruling is amended, not reverted. Its Goal Acceptance Check is the input this CR records.
- [x] Database schema impacts? No. When a report is pushed (`cleargate push <report>`), the new frontmatter keys go into the payload as ordinary fields.

## Existing Surfaces

- **Surface:** `cleargate-cli/scaffold/core/.cleargate/templates/sprint_report.md:1-6`. The report frontmatter (`sprint_id`, `status`, `generated_at`, `generated_by`, `template_version`) that gains the verdict keys.
- **Surface:** `cleargate-cli/scaffold/hosts/claude/.claude/agents/reporter.md:44` and `cleargate-cli/scaffold/hosts/codex/.codex/agents/reporter.toml:41`. The OD-4 "spoken, never written" rule in both Reporter roles.
- **Surface:** `cleargate-cli/scaffold/hosts/claude/.claude/skills/sprint-execution/SKILL.md:752`. §E.2's OD-4 sentence.
- **Surface:** `cleargate-cli/scaffold/core/.cleargate/scripts/close_sprint.mjs:451` and `:468` (required §3 metric rows and §5 sections, body-only regexes) and `:1383-1386` (Step 5 sets `sprint_status`).
- **Why this CR extends rather than rebuilds:** the verdict derivation, the Goal Acceptance Check and the report file all exist. This records an already-computed value in an existing frontmatter block and rewords one rule in three places.

## Prior work

- [[CR-110]] — Sprint Goal Acceptance Check (archived). Created the derivation and the OD-4 "spoken, not written" ruling this CR amends; its §Amendment explains the deferral reason, which frontmatter avoids.
- [[CR-063]] — Sprint-report ingest (archived). Merges the report into the wiki sprint page, so the brief can read the new field there.
- [[EPIC-063]] — parent. STORY-063-11 is the consumer and ships with a fallback.
- `.cleargate/FLASHCARD.md` grep for `goal.verdict`: none found.

## 3. Execution Sandbox

**Modify:**
- `cleargate-cli/scaffold/core/.cleargate/templates/sprint_report.md`
- `cleargate-cli/scaffold/hosts/claude/.claude/agents/reporter.md`
- `cleargate-cli/scaffold/hosts/codex/.codex/agents/reporter.toml`
- `cleargate-cli/scaffold/hosts/claude/.claude/skills/sprint-execution/SKILL.md`
- `cleargate-cli/scaffold/core/.cleargate/scripts/close_sprint.mjs` (validates the new keys at Step 2.5 and stamps `goal_verdict_acked_by` after ack; does not touch the body regexes)
- `cleargate-cli/test/scripts/close-sprint-goal-verdict.node.test.ts` (new)

## Task Breakdown

- [ ] Red tests: a report with a valid `goal_verdict` passes Step 2.5; an invalid value fails; a pre-CR report without the key still passes; after ack the key `goal_verdict_acked_by` is stamped.
- [ ] Add the keys to `sprint_report.md`'s frontmatter with `goal_verdict: "<met|partial|missed>"` placeholders.
- [ ] Reword OD-4 in `reporter.md`, `reporter.toml` and the skill's §E.2.
- [ ] `close_sprint.mjs`: validate the key at Step 2.5 (enum only), and stamp the ack after Step 5.
- [ ] Clean-room close of a fixture sprint from the packed tarball.

## 4. Verification Protocol

**Command/Test:** `npm --prefix cleargate-cli test`, then the clean-room close in `.cleargate/knowledge/clean-room-verification.md`.

**How we test this:**
- **What "working" means:** after a real sprint close, `SPRINT-<#>_REPORT.md`'s frontmatter says met, partial or missed, which matches what the close Brief said and what the human acked, and the session brief shows it.
- **Unit:** Step 2.5 enum validation, backward compatibility, ack stamp.
- **Contract:** the Reporter role text (both hosts) and §E.2 state the new rule (a docs test).
- **Real host:** a clean-room close of a fixture sprint from the packed tarball writes the field. The next real sprint close in this repo is the dogfood check: field present, matches the spoken verdict.
- **Regression guard:** the "pre-CR report without the key passes" test stays in `npm test`.

**SPIDR coverage.**

| Axis | Cover | Reason |
|---|---|---|
| Paths | T | New report with the field; legacy report without it. |
| Interfaces | T | Two writers of the rule text (Claude reporter.md, Codex reporter.toml) plus close_sprint.mjs. |
| Data | T | Three enum values, one Outline. |
| Rules | T | Enum-only validation; body regexes untouched. |

```gherkin
Feature: Structured sprint goal verdict

  @data
  Scenario Outline: A valid verdict passes close validation
    Given a sprint report whose frontmatter has goal_verdict "<verdict>" and a goal_verdict_basis line
    When close_sprint.mjs runs Step 2.5
    Then validation passes

    Examples:
      | verdict |
      | met     |
      | partial |
      | missed  |

  @paths
  Scenario: Reports written before this CR still close
    Given a sprint report with no goal_verdict key
    When close_sprint.mjs runs Step 2.5
    Then validation passes exactly as before

  @interfaces @rules
  Scenario: Both Reporter roles state the new rule
    Given the canonical reporter.md and reporter.toml and the sprint-execution skill
    Then each says the verdict is spoken in the Brief and recorded in report frontmatter
    And none says it is never written into the report

  @rules
  Scenario: Error — an invalid verdict value is rejected
    Given a sprint report whose frontmatter has goal_verdict "mostly"
    When close_sprint.mjs runs Step 2.5
    Then it exits non-zero naming goal_verdict and the allowed values
```

**Test layers.** Declare all three below. `0` is a valid, explicit answer and must carry a reason in the Notes column; an absent row is not a decision.

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 5 | Three enum values, legacy report, invalid value. |
| Integration tests | 1 | Docs test over both Reporter roles and the skill's §E.2. |
| E2E / acceptance tests | 1 | Clean-room close of a fixture sprint from the packed tarball. |

---

## Context Source

**context_source:** STORY-063-11 §1.4 Q3 follow-up, filed 2026-11-12. Grounded in `sprint_report.md`, `reporter.md`, `reporter.toml`, the sprint-execution skill, `close_sprint.mjs` and archived CR-110 on 2026-11-12.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟡 Medium Ambiguity**

*Evaluate each criterion against its literal text. If you substituted an interpretation, leave the box unchecked and surface the substitution in the Brief.*

Requirements to pass to Green (Ready for Execution):
- [x] "Obsolete Logic" to be evicted is explicitly declared.
- [x] All impacted downstream Epics/Stories are identified and reverted to 🔴 High Ambiguity.
- [x] Execution Sandbox contains exact file paths.
- [x] Verification command is provided.
- [ ] `approved: true` is set in the YAML frontmatter.
- [x] Existing Surfaces cites at least one source-tree path the CR extends.
