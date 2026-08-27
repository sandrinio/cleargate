---
bug_id: BUG-042
parent_ref: EPIC-054
parent_cleargate_id: "EPIC-054"
sprint_cleargate_id: "SPRINT-39"
carry_over: false
area: planning-layer
status: Draft
severity: P1-High
reporter: sandrinio
approved: true
context_source: "Discovered 2026-08-25 while drafting EPIC-054 WS6, checking where a new '## Task Breakdown' heading could be inserted without shifting gate indices. Verified empirically against the shipped binary (cleargate-cli/dist/cli.js) with three synthetic probes, not by reading code alone. Grounding: cleargate-cli/src/lib/readiness-predicates.ts:632-657 (evalSection), .cleargate/knowledge/readiness-gates.md:84-206 (gate definitions), .cleargate/templates/CR.md, .cleargate/templates/epic.md."
created_at: 2026-08-25T00:00:00Z
updated_at: 2026-08-25T09:53:35Z
created_at_version: cleargate@0.24.2
updated_at_version: dff83bd3-dirty
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
  last_gate_check: 2026-08-25T09:53:35Z
  transition: ready-for-fix
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
---

# BUG-042: Gate `section(N)` indices are positional, but two gates were written as if they were heading ordinals

### Open Questions

- **Question:** Should the fix renumber the criteria in `readiness-gates.md` (cheap, one-line each) or change `evalSection` to resolve headings by their printed ordinal (expensive, changes every gate at once)?
- **Recommended:** Renumber the criteria. `evalSection`'s positional semantics are correct and already relied on by the `story` and `bug` gates, which are aligned. Changing the evaluator would break the two gates that are currently right in order to fix the two that are wrong.
- **Human decision:** **Renumber the criteria** (2026-08-25). `evalSection` is not touched. Verified corrections, computed by replicating the parser's own split over the shipped templates:

  | Gate | Criterion | Declared | Corrected | Resolves to |
  |---|---|---|---|---|
  | `cr` | `blast-radius-populated` | `section(2)` | **`section(3)`** | `## 2. Blast Radius & Invalidation` |
  | `cr` | `sandbox-paths-declared` | `section(3)` | **`section(6)`** | `## 3. Execution Sandbox` |
  | `epic` | `affected-files-declared` | `section(5)` | **`section(8)`** | `## 4. Technical Grounding` |
  | `epic` | `scope-in-populated` | `section(3)` | `section(3)` | `## 2. Scope Boundaries` — already correct, do not touch |

- **Question:** Do the ~100 archived CRs whose `cached_gate_result.pass` was computed against the wrong section need re-evaluation?
- **Recommended:** No bulk re-evaluation. Re-run gates lazily — any archived item that is reopened gets checked against the corrected indices. A bulk pass would rewrite frontmatter across the archive for items that are already shipped and closed.
- **Human decision:** **Lazy re-check on reopen** (2026-08-25). No bulk pass. Archived `cached_gate_result` values are left as written; any item that is reopened is re-checked against the corrected indices at that point. Accepted tradeoff: the archive retains verdicts for `cr` and `epic` that were computed against a section other than the one they name.

## 1. The Anomaly (Expected vs. Actual)

**Expected Behavior:** In `.cleargate/knowledge/readiness-gates.md`, a criterion written `check: "section(3) has ≥1 declared-item"` for `work_item_type: cr` — with the id `sandbox-paths-declared` — should evaluate the CR template's `## 3. Execution Sandbox` section, which is the authoritative list of file paths the CR is allowed to touch.

**Actual Behavior:** `section(N)` is a **positional index over `## ` headings**, not the ordinal printed in the heading text. The CR template opens with `## 0.5 Open Questions`, which consumes index 1 and shifts every subsequent heading down by one. So:

| Gate | Criterion | Declared index | Heading it actually evaluates | Intended heading |
|---|---|---|---|---|
| `cr` | `blast-radius-populated` | `section(2)` | `## 1. The Context Override` | `## 2. Blast Radius & Invalidation` |
| `cr` | `sandbox-paths-declared` | `section(3)` | `## 2. Blast Radius & Invalidation` | `## 3. Execution Sandbox` |
| `epic` | `affected-files-declared` | `section(5)` | `## Existing Surfaces` | §4's `**Affected Files:**` list |

The consequence is a **fail-open**: `## 3. Execution Sandbox` in every CR, and the Affected Files list in every Epic, are gated by nothing. A CR with a completely empty Execution Sandbox passes `cr.ready-to-apply` at 8/8 criteria. The gate reports `severity: enforcing` and prints a green pass, so the failure is invisible — it reads as "checked and fine" rather than "not checked."

`story` and `bug` are **correctly aligned** and are not affected: their printed ordinals happen to match their positional indices because neither template has a fractional or unnumbered heading ahead of the gated sections.

## 2. Reproduction Protocol

1. Create a CR-shaped markdown file with the standard `.cleargate/templates/CR.md` heading layout: `## 0.5 Open Questions`, `## 1. The Context Override (Old vs. New)`, `## 2. Blast Radius & Invalidation`, `## Existing Surfaces`, `## Prior work`, `## 3. Execution Sandbox`, `## 4. Verification Protocol`, `## Context Source`, `## ClearGate Ambiguity Gate`.
2. Populate `## 2. Blast Radius & Invalidation` with three bullet items.
3. Leave `## 3. Execution Sandbox` **completely empty** — no bullets, no table, no paths.
4. Run `node cleargate-cli/dist/cli.js gate check <file>`.
5. Observe: `✅ cr.ready-to-apply passed (8 criteria)`. The empty Execution Sandbox does not fail `sandbox-paths-declared`.
6. Now empty `## 2. Blast Radius & Invalidation` instead and re-run. Observe `❌ sandbox-paths-declared: section 3 has 0 declared-item` — proving `section(3)` resolves to the Blast Radius heading, not the Execution Sandbox heading.
7. Now empty `## 1. The Context Override` instead and re-run. Observe `❌ blast-radius-populated: section 2 has 0 declared-item` — proving `section(2)` resolves to the Context Override heading.
8. For the Epic variant: take any gate-passing Epic, delete every bullet under `**Affected Files:**` in §4, re-run `gate check`. Observe it still passes 12/12.

## 3. Evidence & Context

Probes run 2026-08-25 against `cleargate-cli/dist/cli.js` in this repo. Raw output:

```
### §3 Execution Sandbox is EMPTY. Gate result:
Gate: cr.ready-to-apply (enforcing)
✅ cr.ready-to-apply passed (8 criteria)

### A: '## 2. Blast Radius' emptied →
Gate: cr.ready-to-apply (enforcing)
❌ sandbox-paths-declared: section 3 has 0 declared-item (≥1 required)

### B: '## 1. Context Override' emptied →
Gate: cr.ready-to-apply (enforcing)
❌ blast-radius-populated: section 2 has 0 declared-item (≥1 required)

### epic with EMPTY §4 Affected Files →
Gate: epic.ready-for-decomposition (enforcing)
✅ epic.ready-for-decomposition passed (12 criteria)
```

The mechanism, from `cleargate-cli/src/lib/readiness-predicates.ts:640-650`:

```
const rawParts = body.split(/^(?=## )/m);
const hasPreamble = rawParts.length > 0 && !rawParts[0]!.startsWith('## ');
const arrayIndex = hasPreamble ? parsed.index : parsed.index - 1;
```

Preamble handling is correct — the H1 title block before the first `##` is accounted for, so section 1 is reliably the first `## ` heading. The evaluator is not the defect. The defect is that two gate definitions were authored against the heading *text* rather than the heading *position*, and nothing cross-checks the two.

This is the same failure shape as [[BUG-041]]: a parser that is correct for the one input it was written against and silently wrong for another, failing *safe-looking* — a green pass rather than a throw.

## 4. Execution Sandbox (Suspected Blast Radius)

**Investigate / Modify:**
- `.cleargate/knowledge/readiness-gates.md` — the `cr` block (`blast-radius-populated`, `sandbox-paths-declared`) and the `epic` block (`affected-files-declared`). Index corrections only.
- `cleargate-planning/.cleargate/knowledge/readiness-gates.md` — canonical mirror; must receive the identical edit per the CLAUDE.md dogfood-split rule.
- New test file under `cleargate-cli/test/`, `*.node.test.ts` per the single-runner rule.

**Explicitly NOT in scope:**
- `cleargate-cli/src/lib/readiness-predicates.ts` — `evalSection` is correct. Do not change positional semantics; the `story` and `bug` gates depend on them and are currently right.
- Bulk re-evaluation of `cached_gate_result` across `.cleargate/delivery/archive/`.
- Any template restructuring. Renumbering the criteria is strictly cheaper and lower-risk than moving headings that ~100 archived items already match.

## 5. Verification Protocol (The Failing Test)

**Command:** `npm --prefix cleargate-cli test`

The locking test must pin, for every `{work_item_type, transition}` gate that uses a `section(N)` predicate, the **resolved heading text** at that index in the corresponding template — not merely that the gate passes. Shape:

- Parse each template under `.cleargate/templates/` with the same `split(/^(?=## )/m)` + preamble rule `evalSection` uses.
- For each `section(N)` criterion in `readiness-gates.md`, assert the heading at index N matches an expected string fixture (e.g. `cr` / `sandbox-paths-declared` → `## 3. Execution Sandbox`).
- Fail with the criterion id, the expected heading, and the heading actually resolved.

It must fail before the fix on exactly three criteria (`cr.blast-radius-populated`, `cr.sandbox-paths-declared`, `epic.affected-files-declared`) and pass after. This test is also the prerequisite [[EPIC-054]] WS5 depends on: it converts "a new `##` heading silently shifts a gate" from an invisible regression into a build break.

---

## Prior work

- [[EPIC-054]] — Spike & Task Decomposition Surfaces. Discovered this defect while scoping WS6; its WS5 corrects and pins the indices because WS6 cannot add a `## Task Breakdown` heading safely otherwise. This Bug carries the diagnosis and the historical question; EPIC-054 WS5 carries the forward-looking fix. Fix them together or fix this first.
- [[BUG-041]] — Work-Item Id Grammar Divergence. Same failure class: independent parsers agreeing on the common case, silently wrong elsewhere, failing safe-looking with an empty/green result rather than an error.
- [[BUG-033]] — Collision Surface Fail Open. Same fail-open shape in a different enforcement surface.
- [[EPIC-052]] — Requirement-Level Grounding. Adds `## Grounding` to five templates and will shift indices again; it needs this test to land safely for the same reason EPIC-054 does.
- No prior item reports a `section(N)` index defect. `cleargate wiki query` returned no matches for gate section indexing.

## Context Source

> Discovery audit. Populated from the approved Epic, verified codebase grounding, and recorded direct approval.

**context_source:** Discovered 2026-08-25 during EPIC-054 WS6 scoping. Verified by three empirical probes against the shipped binary rather than by code reading alone; raw output in §3. Grounded in `cleargate-cli/src/lib/readiness-predicates.ts:632-657` and `.cleargate/knowledge/readiness-gates.md:84-206`.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity**

*Evaluate each criterion against its literal text. If you substituted an interpretation, leave the box unchecked and surface the substitution in the Brief.*

Requirements to pass to Green (Ready for Fix):
- [x] Reproduction steps are 100% deterministic.
- [x] Actual vs. Expected behavior is explicitly defined.
- [x] Raw error logs/evidence are attached.
- [x] Verification command (failing test) is provided.
- [x] `approved: true` is set in the YAML frontmatter.

**Signed off 2026-08-25.** All five criteria met literally. Both Open Questions carry recorded human decisions: renumber the criteria (not the evaluator, not the templates), and re-check archived items lazily on reopen rather than in bulk. The corrected indices are verified against the shipped templates and tabulated above, so the fix story does not have to re-derive them.
