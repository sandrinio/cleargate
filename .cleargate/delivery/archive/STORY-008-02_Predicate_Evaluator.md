---
story_id: STORY-008-02
carry_over: true
parent_epic_ref: EPIC-008
parent_cleargate_id: "EPIC-008"
status: "Abandoned"
ambiguity: 🟢 Low
complexity_label: L3
context_source: PROPOSAL-005_Token_Cost_And_Readiness_Gates.md
created_at: 2026-04-19T00:00:00Z
updated_at: 2026-04-19T00:00:00Z
created_at_version: post-SPRINT-04
updated_at_version: post-SPRINT-04
approved: true
pushed_by: sandrinio@github.local
pushed_at: 2026-04-20T19:43:53.438Z
push_version: 3
---

# STORY-008-02: Predicate Evaluator + Frontmatter-Cache Libraries

**Complexity:** L3 — 6 predicate shapes × evaluator + idempotent frontmatter write; heavy unit tests.

## 1. The Spec

### 1.1 User Story
As the `gate check` CLI, I want a closed-set predicate evaluator and an idempotent frontmatter writer so that I can classify a work item as pass/fail deterministically and cache the result without corrupting YAML.

### 1.2 Detailed Requirements
- **`cleargate-cli/src/lib/readiness-predicates.ts`** — exports `evaluate(predicate: string, doc: ParsedDoc): {pass: boolean, detail: string}`. Supports exactly the 6 predicate shapes:
  1. `frontmatter(<ref>).<field> <op> <value>` — ref resolves to own file (`.`) or a linked file path; `op` ∈ `{==, !=, >=, <=}`.
  2. `body contains "<string>"` / `body does not contain "<string>"`.
  3. `section(<N>) has <count> <item-type>` — `<item-type>` ∈ `{checked-checkbox, unchecked-checkbox, listed-item}`; `<count>` supports `≥N`, `==N`, `>0`.
  4. `file-exists(<path>)`.
  5. `link-target-exists(<[[WORK-ITEM-ID]]>)` — resolves via `.cleargate/wiki/index.md`.
  6. `status-of(<[[ID]]>) == <value>`.
- **Sandboxed:** no shell-out, no network, read-only FS limited to `.cleargate/**`.
- **Grammar parser:** reject malformed predicates with a clear error (used by `readiness-gates.md` lint at load time).
- **`cleargate-cli/src/lib/frontmatter-cache.ts`** — exports `readCachedGate(file)` and `writeCachedGate(file, {pass, failing_criteria, last_gate_check})`. Idempotent: re-running with same inputs produces byte-identical output (preserves YAML key order, no whitespace drift).
- **`now` seam:** `last_gate_check` timestamp injectable via options for test determinism (FLASHCARD `#cli #determinism #test-seam`).

### 1.3 Out of Scope
CLI wiring (STORY-008-03). Integration with `wiki lint` (STORY-008-07).

## 2. The Truth

### 2.1 Acceptance Criteria

```gherkin
Feature: Predicate evaluator

  Scenario: frontmatter predicate passes
    Given a doc with frontmatter `approved: true`
    When evaluate("frontmatter(.).approved == true", doc)
    Then pass is true

  Scenario: body-contains TBD fails no-tbds
    Given a doc body containing "TBD"
    When evaluate("body does not contain 'TBD'", doc)
    Then pass is false
    And detail cites "1 occurrence at §2"

  Scenario: section checkbox count
    Given §2 has 3 checked + 1 unchecked checkbox
    When evaluate("section(2) has ≥1 checked-checkbox", doc)
    Then pass is true

  Scenario: file-exists on missing path
    When evaluate("file-exists('cleargate-cli/src/no-such.ts')", doc)
    Then pass is false

  Scenario: link-target-exists resolves via wiki index
    Given wiki/index.md contains a link to [[STORY-003-13]]
    When evaluate("link-target-exists([[STORY-003-13]])", doc)
    Then pass is true

  Scenario: malformed predicate rejected
    When evaluate("eval(`rm -rf /`)", doc)
    Then it throws "unsupported predicate shape"

  Scenario: frontmatter-cache idempotency
    Given a doc with cached_gate_result populated
    When writeCachedGate is called with identical inputs
    Then the file bytes are unchanged
```

### 2.2 Verification Steps
- [ ] Unit tests cover every predicate shape × pass/fail branch.
- [ ] `writeCachedGate` byte-identical-rerun test passes.

## 3. Implementation

| Item | Value |
|---|---|
| Primary Files | `cleargate-cli/src/lib/readiness-predicates.ts`, `cleargate-cli/src/lib/frontmatter-cache.ts` |
| Related | `cleargate-cli/src/lib/frontmatter.ts` (existing parser, extend if needed) |
| New Files? | Yes — both primary files |

Reuse EPIC-001's `stamp-frontmatter` helper for YAML preservation semantics (dependency — this Story is blocked on EPIC-001's STORY-001-04).

## 4. Quality Gates

| Test Type | Min | Notes |
|---|---|---|
| Unit tests | 18 | 3 per predicate shape × 6 shapes (pass, fail, malformed) |
| Idempotency test | 1 | `writeCachedGate` byte-identical rerun |
| Sandbox test | 3 | Rejects shell injection, network access, FS escape |

## Ambiguity Gate
🟢.
