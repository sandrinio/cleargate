---
story_id: STORY-020-01
parent_epic_ref: EPIC-020
parent_cleargate_id: "EPIC-020"
status: Approved
approved: true
approved_at: 2026-04-29T00:00:00Z
approved_by: sandrinio
ambiguity: 🟢 Low
context_source: PROPOSAL-012_Wiki_Contradiction_Detection.md
actor: Wiki Subsystem Maintainer
complexity_label: L1
parallel_eligible: y
expected_bounce_exposure: low
created_at: 2026-04-25T12:00:00Z
updated_at: 2026-04-25T12:00:00Z
created_at_version: post-SPRINT-13
updated_at_version: post-SPRINT-13
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-04-29T11:16:46Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id STORY-020-01
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-04-29T11:16:46Z
  sessions: []
---

# STORY-020-01: Contradict Subagent + Protocol §10.10 + Schema Delta

**Complexity:** L1 — three documentation/agent-definition files, no runtime code, single subsystem (wiki spec layer).

## 1. The Spec (The Contract)

### 1.1 User Story
As the Wiki Subsystem Maintainer, I want a fully-specified read-only contradict subagent and an additive `last_contradict_sha` field documented in protocol §10.4 + new §10.10, so that downstream stories (020-02 ingest wiring, 020-03 CLI wrapper) have a stable contract to integrate against.

### 1.2 Detailed Requirements
- Create `.claude/agents/cleargate-wiki-contradict.md` matching the PROPOSAL-012 §2.3 contract: model `sonnet`, tools `Read, Grep, Glob` (no Write/Edit/Bash), inputs = (draft path, neighborhood page paths), output = zero or more `contradiction: <draft-id> vs <neighbor-id> · <claim-summary ≤80 chars>` lines plus one paragraph of reasoning per finding, exit code always 0 in v1.
- Add a `## §10.10 Wiki Contradiction Detection` section to `.cleargate/knowledge/cleargate-protocol.md` covering: trigger point (ingest Phase 4), neighborhood rule, idempotency rule, status filter (Draft/In Review only), advisory exit, calibration plan (30 days, ≥20 labeled findings, ≥80% true-positive precondition for any future enforcing-mode proposal).
- Update §10.4 schema example in the protocol to show `last_contradict_sha: string | null` as **optional**. Add a one-line note: "Pages without this field MUST continue to pass lint."
- Update `.claude/agents/cleargate-wiki-lint.md`: add `last_contradict_sha` to the allowed-but-optional field list in the §10.4 inline schema. Add one bullet to the §10.4 schema description: "`last_contradict_sha` (optional) — populated by ingest Phase 4. Lint MUST NOT flag pages with or without this field."

### 1.3 Out of Scope
- Wiring Phase 4 into ingest (STORY-020-02).
- The CLI wrapper (STORY-020-03).
- Backfilling `last_contradict_sha` on existing wiki pages.
- Implementing the contradict subagent's prompt logic — only the contract is in scope; the subagent file itself contains the full instruction set per the §2.3 contract.

## 2. The Truth (Executable Tests)

### 2.1 Acceptance Criteria (Gherkin)

```gherkin
Feature: Contradict subagent contract + schema delta

  Scenario: Subagent definition exists with read-only tool list
    Given the file .claude/agents/cleargate-wiki-contradict.md exists
    When the frontmatter is parsed
    Then the tools field contains exactly "Read, Grep, Glob"
    And the model field is "sonnet"
    And the description mentions "advisory" and "neighborhood-scoped"

  Scenario: Protocol §10.10 documents the check
    Given .cleargate/knowledge/cleargate-protocol.md
    When the file is read
    Then a section titled "§10.10 Wiki Contradiction Detection" exists
    And it documents trigger point, neighborhood rule, idempotency, status filter, advisory exit, calibration plan

  Scenario: §10.4 schema shows last_contradict_sha as optional
    Given the protocol §10.4 inline schema example
    When read
    Then last_contradict_sha appears in the example with a comment "(optional)"
    And the surrounding text says pages without this field must pass lint

  Scenario: Lint subagent definition allows the optional field
    Given .claude/agents/cleargate-wiki-lint.md
    When the §10.4 inline schema is read
    Then last_contradict_sha is listed as an allowed optional field
    And the file states explicitly that lint MUST NOT flag pages whether or not the field is present
```

### 2.2 Verification Steps (Manual)
- [ ] `grep -n "cleargate-wiki-contradict" .claude/agents/cleargate-wiki-contradict.md` returns the role-prefix line.
- [ ] `grep -n "§10.10" .cleargate/knowledge/cleargate-protocol.md` returns a section heading.
- [ ] `grep -n "last_contradict_sha" .cleargate/knowledge/cleargate-protocol.md .claude/agents/cleargate-wiki-lint.md` returns both files.
- [ ] `cleargate wiki lint` (enforce mode) exits 0 against the current corpus (no existing page declares `last_contradict_sha`, so the optional-field rule is exercised by absence).

## 3. The Implementation Guide

### 3.1 Context & Files

| Item | Value |
|---|---|
| Primary File | `.claude/agents/cleargate-wiki-contradict.md` |
| Related Files | `.cleargate/knowledge/cleargate-protocol.md`, `.claude/agents/cleargate-wiki-lint.md` |
| New Files Needed | Yes — `.claude/agents/cleargate-wiki-contradict.md` |

**Files declared (gate-detector bullet list — parser counts `^- ` lines, not table rows):**
- `.claude/agents/cleargate-wiki-contradict.md` (new)
- `.cleargate/knowledge/cleargate-protocol.md` (modify — §10.4 schema + §10.10 new section)
- `.claude/agents/cleargate-wiki-lint.md` (modify — allow optional `last_contradict_sha`)

### 3.2 Technical Logic
The contradict subagent definition mirrors the structure of `cleargate-wiki-lint.md`: frontmatter (name/description/tools/model), role-prefix line, "Your one job" paragraph, Inputs section, Workflow steps (Step 1: Load draft + neighborhood, Step 2: Compare claims pairwise within the neighborhood, Step 3: Emit findings + reasoning, Step 4: Exit 0), Output format, Guardrails ("read-only", "neighborhood-only", "advisory"), and "What you are NOT" section. Reuse the lint file's structural conventions verbatim where they apply.

The §10.10 protocol section reuses the structural pattern of §10.7 (Idempotency) and §10.8 (Lint Checks Reference): one paragraph of overview, then bulleted-rule list, then a calibration-plan paragraph at the end.

### 3.3 API Contract (if applicable)

| Endpoint | Method | Auth | Request Shape | Response Shape |
|---|---|---|---|---|
| (subagent invocation) | Task tool | n/a | `{ draft_path, neighborhood: string[] }` | stdout: zero or more `contradiction:` lines + reasoning paragraphs; exit 0 |

## 4. Quality Gates

### 4.1 Minimum Test Expectations

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 0 | Documentation-only story; no runtime code. |
| Schema/grep checks | 4 | One per §2.1 Gherkin scenario, run as Bash assertions during QA. |

### 4.2 Definition of Done (The Gate)
- [ ] Minimum test expectations (§4.1) met (4 grep-based assertions pass).
- [ ] All Gherkin scenarios from §2.1 covered.
- [ ] `cleargate wiki lint` exits 0 against the current corpus after this story's commits.
- [ ] Peer/Architect Review passed.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity (Ready for Execution)**

Requirements satisfied:
- [x] EPIC-020 §6 questions resolved (skip-on-Approved, graceful truncation, inline labels, synchronous Phase 4 — all confirmed 2026-04-25).
- [x] Subagent contract is fully specified in §1.2; the prose body is left to the developer agent guided by PROPOSAL-012 §2.3 and the structural conventions of `cleargate-wiki-lint.md` per §3.2.
- [x] No "TBDs" exist anywhere in the specification or technical logic.
