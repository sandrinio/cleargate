<instructions>
FOLLOW THIS EXACT STRUCTURE. Output sections in order 1-5.
YAML Frontmatter: Bug ID, Parent Ref, Status, Severity, Reporter, Approved gate.
§1 The Anomaly: Expected vs. Actual behavior.
§2 Reproduction Protocol: Deterministic steps to recreate.
§3 Evidence & Context: Raw logs, stack traces, payloads — no paraphrasing.
§4 Execution Sandbox: Exact file paths to investigate. Restrict scope to prevent unrelated refactoring.
Task Breakdown: one `- [ ] <action>` row per executable step, in execution order. REQUIRED at L3 and above, optional at L2, omit the section entirely at L1. An absent section passes the gate; a present-but-empty one fails. Task Breakdown rows implement the Gherkin scenarios in §5; no row is written for an axis marked F.
§5 Verification Protocol: The failing test that proves the bug exists and proves the fix resolves it. §5 also carries a SPIDR coverage table (axes: Paths, Interfaces, Data, Rules) above a Gherkin block. Paths = more than one *successful* way through (the baseline error scenario is not a path). Interfaces = more than one surface exposes the behaviour (CLI / API / UI / hook). Data = behaviour differs by data type, shape or volume — usually a Scenario Outline with Examples. Rules = a business rule constrains the outcome — one scenario per rule, including breaking it. Tag each covered scenario with the matching `@paths` / `@interfaces` / `@data` / `@rules` marker directly above `Scenario:` / `Scenario Outline:`. There is no Spike row: open discovery is chartered as a SPIKE item before this Bug is written.
Output location: .cleargate/delivery/pending-sync/BUG-124_brief-and-index-labels-mislead.md

POST-WRITE BRIEF
After Writing this document, render a Brief in chat with the following sections,
mechanically extracted from the document's own structure:

  - Prior work    ← cleargate-wiki-query result (cite [[IDs]] or write "none found")
  - Summary        ← §1 The Anomaly (repro)
  - Open Questions ← ### Open Questions
  - Edge Cases     ← §2 Reproduction Protocol (edge conditions)
  - SPIDR          ← §5 Verification Protocol (SPIDR coverage table)
  - Risks          ← §4 Execution Sandbox (suspected blast radius)
  - Ambiguity      ← bottom-of-doc ambiguity gate block

Halt for human review. When ambiguity reaches 🟢, proceed to call cleargate_push_item.
Do NOT ask separately for push confirmation — Brief approval covers it.

Do NOT output these instructions.
</instructions>

---
bug_id: BUG-124
parent_ref: null
parent_cleargate_id: null
sprint_cleargate_id: null
carry_over: false
area: session-brief,wiki,doctor
status: Completed
severity: P3-Low
reporter: orchestrator (field upgrade test 0.28.0 → 0.30.0 in a Go target repo, 2026-11-13)
approved: true
approved_by: "sandrinio (2026-11-13: 'i want you to fix them all and make a new release')"
approved_at: 2026-11-13T00:00:00Z
context_source: "Field upgrade test 2026-11-13: the target repo's first 0.30.0 brief, index and doctor output, checked line by line against its raw items; the dead archive links and the Release label reproduce on this meta-repo's own wiki; code grounding at cli main b9fe36a: src/wiki/synthesis/session-brief.ts:319 (open questions counts items), :320 (unlabelled contradictions), :251-271 (Last closed appends carried N), :126-135 (Release '<repo> no tags' with the default repo '.'), src/wiki/page-schema.ts:570 ([expand](archive/<bucket>.md), never written), src/commands/doctor.ts:225-250 (any non-zero gate exit in 24h printed as a hook failure)"
created_at: 2026-11-13T00:00:00Z
updated_at: 2026-11-13T00:00:00Z
created_at_version: strategy-phase-pre-init
updated_at_version: strategy-phase-pre-init
server_pushed_at_version: null
draft_tokens:
  input: null
  output: null
  cache_read: null
  cache_creation: null
  model: null
  sessions: []
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-11-12T21:56:55Z
  transition: ready-for-fix
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
last_contradict_sha: "0cc6581560c035424a77ea0f5edc4f3422a548860246e24c79889736ff20c2ab"
---

# BUG-124: Brief, index and doctor labels say things that are not true

### Open Questions

- **Question:** How should the Waiting line count open questions?
- **Recommended:** Count questions and name the items: `26 open questions in 11 items (STORY-002-01, …)`. The IDs list stays per item.
- **Human decision:** Recommended option accepted (sandrinio 2026-11-13: "i want you to fix them all and make a new release").

- **Question:** What should "0 unlabelled contradictions" say when open drafts have never been checked?
- **Recommended:** Add the unchecked count when it is not zero: `0 unlabelled contradictions (12 drafts never checked)`. It is not an alarm, so the 0.29 unchecked-draft alarm keeps its 1–7-day window.
- **Human decision:** Recommended option accepted (sandrinio 2026-11-13: "i want you to fix them all and make a new release").

- **Question:** Should the index's archive `[expand](archive/<bucket>.md)` links be written or dropped?
- **Recommended:** Drop the links and keep the counts. Archived items are reachable by grepping `wiki/<bucket>/`, and pages listing every archived item would cost tokens the index was cut down to save.
- **Human decision:** Recommended option accepted (sandrinio 2026-11-13: "i want you to fix them all and make a new release").

## 1. The Anomaly (Expected vs. Actual)
**Expected Behavior:** Every count and label at session start means what it says.

**Actual Behavior:**
- **Waiting, questions.** `11 open questions (STORY-002-01, …)` counts items (`session-brief.ts:319`). The 11 items hold 26 open questions.
- **Waiting, contradictions.** `0 unlabelled contradictions` reads as "checked, clean". In the field repo none of the 12 open drafts had been checked (no `last_contradict_sha`, no `wiki/contradictions.md`).
- **Last closed.** `SPRINT-01 (2026-11-12) — Shipped — 11 planned / 11 shipped / 0 carried over — carried 0` says the carried count twice: the sprint's own stories line is followed by `— carried N`.
- **Release.** `Release: . no tags`. The default `release_repos: ['.']` prints the literal `.`. This meta-repo's brief has the same shape for a named repo (`mcp no tags`), so only `.` is affected.
- **Index.** `- Epics: 1 Completed · [expand](archive/epics.md)`: no `wiki/archive/` directory exists, in the field repo or in this meta-repo. Pre-existing; [[STORY-063-09]] kept the links (R3).
- **Doctor.** `⚠ hook failure at 2026-11-12T09:47:36Z: stamp=0 gate=1 ingest=0 file=…/EPIC-002_….md`. `gate=1` is an advisory readiness-gate failure on a draft, which is normal, not a hook failure. It is printed for 24 hours even after the item's gate passes, so doctor shows three failures while the brief says `0 failing gates`.

## 2. Reproduction Protocol
1. A corpus with one closed sprint whose report says `0 carried over`, two open stories with 3 and 2 open questions, one never-checked draft, an archived epic, and no `wiki.brief.release_repos` in config.
2. Edit a draft so its gate fails, then fix it so it passes (two PostToolUse hook runs within 24 hours).
3. `cleargate wiki build`, `cleargate doctor --session-start`, `cleargate doctor`.

Edge conditions:
- A named release repo keeps its name.
- A real hook failure (stamp or ingest non-zero, or a crash) is still printed.
- A Waiting line with no unchecked drafts is unchanged.

## 3. Evidence & Context
Field brief and doctor, 2026-11-13:
```
Waiting on you: 0 failing gates · 11 open questions (STORY-002-01, STORY-002-02, STORY-002-03, STORY-002-04, STORY-002-05 +6 more) · 0 unlabelled contradictions · 0 unfinished close checklists
Last closed: SPRINT-01 (2026-11-12) — Shipped — 11 planned / 11 shipped / 0 carried over — carried 0
Release: . no tags
⚠ hook failure at 2026-11-12T09:47:36Z: stamp=0 gate=1 ingest=0 file=…/pending-sync/EPIC-002_ingest_you_can_trust.md
⚠ hook failure at 2026-11-12T18:53:25Z: stamp=0 gate=1 ingest=0 file=…/pending-sync/STORY-002-01_credentials_sealed.md
⚠ hook failure at 2026-11-12T18:57:48Z: stamp=0 gate=1 ingest=0 file=…/pending-sync/STORY-002-09_captures_export_and_replay.md
```
Meta-repo index, same build: `- Epics: 35 Completed · 3 Abandoned · [expand](archive/epics.md)` with no `.cleargate/wiki/archive/`.

## 4. Execution Sandbox (Suspected Blast Radius)
**Investigate / Modify:**
- `cleargate-cli/src/wiki/synthesis/session-brief.ts`: Waiting parts (:319-320), Last closed (:251-271), Release label (:126-135, `.` → the repo directory's name).
- `cleargate-cli/src/wiki/page-schema.ts:570` (drop the expand link).
- `cleargate-cli/src/commands/doctor.ts:225-250` (report gate exits as gate results, and drop entries superseded by a later clean run of the same file).
- `cleargate-cli/scripts/brief-oracle.sh` (the oracle's waiting and release facts must keep agreeing).

**Do NOT modify:** the Waiting line's per-reason grouping (STORY-063-11-F3); the unchecked-draft alarm window.

## Task Breakdown
- [ ] QA-Red: the scenarios below.
- [ ] Brief labels; index link; doctor log reading.
- [ ] Brief oracle parity; typecheck; brief, index and doctor tests.

## 5. Verification Protocol (The Failing Test)
**Command:** `cd cleargate-cli && npm run test:file -- test/wiki/brief-labels.red.node.test.ts`

| Axis | Cover | Reason |
|---|---|---|
| Paths | F | one build path, one doctor path |
| Interfaces | T | the brief, the index and doctor |
| Data | T | question counts, repo names, hook-log histories |
| Rules | T | a label never overstates or double-states |

```gherkin
Feature: Session-start labels are true

  @data
  Scenario: Open questions are counted as questions
    Given two open stories with 3 and 2 open questions
    When the brief is built
    Then the Waiting line reads "5 open questions in 2 items"

  @rules
  Scenario: Unchecked drafts are not reported as clean
    Given one open draft with no last_contradict_sha and no contradictions
    When the brief is built
    Then the Waiting line reads "0 unlabelled contradictions (1 draft never checked)"

  @rules
  Scenario: The carried count is stated once
    Given a closed sprint whose stories line says "0 carried over"
    When the brief is built
    Then the Last closed line ends with "0 carried over"

  @data
  Scenario: The default release repo is named
    Given no wiki.brief.release_repos and an untagged repo in directory "acme-app"
    When the brief is built
    Then the Release line reads "acme-app no tags"

  @interfaces
  Scenario: The index has no dead links
    Given an archived epic
    When cleargate wiki build runs
    Then wiki/index.md has no link to archive/epics.md

  @interfaces @rules
  Scenario: A gate that later passed is not a hook failure
    Given a hook log with a gate=1 entry for a file and a later all-zero entry for the same file
    When cleargate doctor runs
    Then no "hook failure" line names that file
```

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 6 | one per scenario |
| Integration tests | 1 | `brief-oracle.sh` agrees on a fixture corpus |
| E2E / acceptance tests | 0 | the next field brief |

---

## Prior work

- [[STORY-063-11]] (Completed, 0.30.0): the brief lines; specified `<repo> no tags` with no rule for `.`, and the carried count from `### Carried Over`.
- [[STORY-063-09]] (Completed, 0.30.0): the index; kept the archive expand links unchanged (R3).
- [[EPIC-008]] and [[PROPOSAL-005]]: defined doctor's 24-hour hook-failure surfacing.

## Context Source

**context_source:** field upgrade test 2026-11-13; dead archive links and the Release label reproduced on this meta-repo's wiki; code grounding at cli main `b9fe36a`.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity**

Requirements to pass to Green (Ready for Fix):
- [x] Reproduction steps are 100% deterministic.
- [x] Actual vs. Expected behavior is explicitly defined.
- [x] Raw error logs/evidence are attached.
- [x] Verification command (failing test) is provided.
- [x] `approved: true` is set in the YAML frontmatter.
