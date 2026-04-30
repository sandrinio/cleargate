---
story_id: STORY-008-03
parent_epic_ref: EPIC-008
parent_cleargate_id: "EPIC-008"
status: "Abandoned"
ambiguity: 🟢 Low
complexity_label: L2
context_source: PROPOSAL-005_Token_Cost_And_Readiness_Gates.md
created_at: 2026-04-19T00:00:00Z
updated_at: 2026-04-19T00:00:00Z
created_at_version: post-SPRINT-04
updated_at_version: post-SPRINT-04
cached_gate_result:
  pass: false
  failing_criteria:
    - id: no-tbds
      detail: 2 occurrences at §2, §3
    - id: implementation-files-declared
      detail: section 3 has 0 listed-item (≥1 required)
    - id: dod-declared
      detail: section 4 has 0 listed-item (≥1 required)
  last_gate_check: 2026-04-20T19:22:06Z
approved: true
---

# STORY-008-03: `cleargate gate` Command (check + explain)

**Complexity:** L2 — wires predicate evaluator + frontmatter cache into a Commander subcommand.

## 1. The Spec

### 1.1 User Story
As an agent or Vibe Coder, I want `cleargate gate check <file>` to evaluate readiness criteria and write the result to frontmatter, and `cleargate gate explain <file>` to render the cached result in ≤50 agent tokens so I can decide transitions cheaply.

### 1.2 Detailed Requirements
- **`cleargate gate check <file> [-v] [--transition <name>]`**:
  - Detects work-item type from frontmatter (`proposal_id`, `epic_id`, `story_id`, etc.).
  - Infers default transition = next-unpassed (Epic has two; others one each) per PROP-005 Q8.
  - `--transition` overrides inference.
  - Loads matching criteria from `.cleargate/knowledge/readiness-gates.md`.
  - Evaluates each criterion via `readiness-predicates.evaluate()`.
  - Writes `cached_gate_result:{pass, failing_criteria:[{id, detail}], last_gate_check}` via `frontmatter-cache.writeCachedGate()`.
  - **Severity behavior:** Proposal → exit 0 always (advisory); Epic/Story/CR/Bug → exit non-zero on any failing criterion (enforcing).
  - **Default output (compact):** one line per failing criterion, e.g. `❌ no-tbds: 2 TBDs in §2`.
  - **`-v` output:** full expected-vs-actual diff per criterion.
- **`cleargate gate explain <file>`**:
  - Read-only — reads cached `cached_gate_result` + renders a human-readable summary.
  - Does NOT re-evaluate predicates.
  - Designed for ≤50 LLM-tokens when the output is fed back to an agent.

### 1.3 Out of Scope
Hook wiring (STORY-008-06). `wiki lint` integration (STORY-008-07).

## 2. The Truth

### 2.1 Acceptance Criteria

```gherkin
Feature: cleargate gate

  Scenario: Check passing Epic
    Given EPIC-X.md meets all ready-for-decomposition criteria
    When cleargate gate check EPIC-X.md
    Then exit 0
    And cached_gate_result.pass = true

  Scenario: Check failing Story (enforcing)
    Given STORY-Y.md has no §3 files
    When cleargate gate check STORY-Y.md
    Then exit non-zero
    And stdout contains "❌ affected-files-verified:"
    And cached_gate_result.pass = false
    And cached_gate_result.failing_criteria lists the id

  Scenario: Check failing Proposal (advisory)
    Given PROPOSAL-Z.md contains a TBD
    When cleargate gate check PROPOSAL-Z.md
    Then exit 0
    And stdout contains "⚠ no-tbds: ... (advisory)"
    And cached_gate_result.pass = false (recorded, not enforced)

  Scenario: Verbose output
    Given STORY-Y.md fails
    When cleargate gate check STORY-Y.md -v
    Then stdout contains full predicate evaluation per failing criterion

  Scenario: Explain is read-only and cheap
    Given EPIC-X.md has cached_gate_result populated
    When cleargate gate explain EPIC-X.md
    Then output ≤ 50 LLM-tokens
    And no predicate re-evaluation (frontmatter unchanged)

  Scenario: Explicit transition override
    Given EPIC-X.md has already passed ready-for-decomposition
    When cleargate gate check EPIC-X.md --transition ready-for-decomposition
    Then evaluation runs against that transition's criteria
```

### 2.2 Verification Steps
- [ ] `cleargate gate check --help` lists subcommands.
- [ ] Exit-code behavior matches severity table in EPIC-008 §4.

## 3. Implementation

| Item | Value |
|---|---|
| Primary File | `cleargate-cli/src/commands/gate.ts` |
| Related | `cleargate-cli/src/cli.ts` (register subcommand) |
| Deps | STORY-008-01 (gates doc), STORY-008-02 (evaluator + cache lib) |

## 4. Quality Gates

| Test Type | Min | Notes |
|---|---|---|
| CLI integration tests | 6 | 1 per Gherkin scenario |
| Unit tests | 4 | Type-detection, transition-inference, severity-routing, output-formatter |

## Ambiguity Gate
🟢.
