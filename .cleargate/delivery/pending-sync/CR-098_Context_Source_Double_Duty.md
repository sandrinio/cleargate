---
cr_id: CR-098
parent_ref: EPIC-043
parent_cleargate_id: "EPIC-043"
sprint_cleargate_id: null
carry_over: false
status: Draft
approved: false
area: cli
context_source: verified codebase grounding — the conflict is visible in readiness-gates.md §Predicate Vocabulary entry 1 versus the shipped templates' own frontmatter defaults
created_at: 2026-08-01T00:00:00Z
updated_at: 2026-08-01T00:00:00Z
created_at_version: 0.20.0
updated_at_version: 0.20.0
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-08-01T11:30:51Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id CR-098
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-08-01T11:30:50Z
  sessions: []
---

# CR-098: `context_source` Cannot Be Both Prose and a Path

## 0.5 Open Questions

> This CR is filed as a **finding**, not a decision. It is deliberately left at
> 🔴 pending the schema call, which is not the agent's to make.

- **Question:** Introduce a dedicated `parent_ref_path` key, or make `parent-approved` read the existing `parent_ref` field?
- **Recommended:** Read `parent_ref`, which every template already carries and which already names the parent (`EPIC-{ID} | STORY-{ID}`). It is currently an id, not a path, so `parent-approved` would need to resolve an id to a file — the same search `findSprintPlanFile` and `sprint-file-locate` already do. That avoids adding a key to every template and every archived item, and it removes the prose-vs-path guess entirely rather than relocating it.
- **Human decision:** {populated during Brief review}

- **Question:** What happens to the ~150 archived items whose `context_source` is prose?
- **Recommended:** Nothing. They are archived; their gates already ran. The migration cost is the reason to prefer reading `parent_ref` over adding a new key.
- **Human decision:** {populated during Brief review}

## 1. The Context Override (Old vs. New)

**Obsolete Logic (What to Remove / Forget):**
- Forget that `context_source` has one meaning. Two readiness criteria read it as two incompatible types, and the templates ship it as the third.

**New Logic (The New Truth):**
- To be decided — see Open Questions. The finding is that the ambiguity is structural, not a bug in either reader.

**The conflict.** `readiness-gates.md` §Predicate Vocabulary entry 1 defines `<ref>` as "a frontmatter key whose value is a **relative path to another document**", and `parent-approved` uses it that way:

```
- id: parent-approved-proposal
  check: "frontmatter(context_source).approved == true"
- id: parent-approved-initiative
  check: "frontmatter(context_source).status == 'Triaged'"
```

But `discovery-checked` reads the same key as an opaque presence flag:

```
- id: discovery-checked
  check: "frontmatter(.).context_source != null"
```

…and every shipped template seeds it as **prose**:

```
context_source: "approved Epic / verified codebase grounding + recorded direct approval"
```

So the documented type, the second reader's type, and the shipped default are three different things. `[[BUG-008]]`'s prose-vs-path heuristic exists solely to straddle the gap: it guesses by looking for spaces, dashes, colons, parens, or >200 chars. Every item hitting `parent-approved` pays for that guess, and `[[CR-095]]` had to teach the failure message to explain both routes because neither is canonical.

This is not causing incorrect gate results today — `[[CR-095]]` closed the soundness hole and the messaging gap. It is a design smell that makes each new reader of `context_source` pick a type and hope.

## 2. Blast Radius & Invalidation

- [ ] Invalidate/Update Bug: [[BUG-008]] — its heuristic becomes unnecessary under either resolution, and should be removed rather than left as dead straddling code.
- [ ] Invalidate/Update CR: [[CR-095]] — its three-route failure message collapses to one route once the key has one meaning.
- [ ] Database schema impacts? **No.** Frontmatter contract only.

**Downstream risk (of acting, not of the finding).**
- Any change to the meaning of `context_source` touches every template, the readiness-gates doc, the predicate evaluator, and potentially archived items. That breadth is exactly why this is filed rather than fixed.
- Doing nothing is a defensible outcome: the heuristic works and is now well-messaged. The cost is that it remains a trap for the next author.

## Existing Surfaces

- **Surface:** `.cleargate/knowledge/readiness-gates.md:12` — the `<ref>` definition ("relative path to another document").
- **Surface:** `.cleargate/knowledge/readiness-gates.md:78-93` — `parent-approved-proposal` / `parent-approved-initiative` (path reader) and `discovery-checked` (presence reader), on the same key.
- **Surface:** `cleargate-cli/src/lib/readiness-predicates.ts` — `evalFrontmatter`'s prose-vs-path heuristic, the straddle.
- **Surface:** `.cleargate/templates/{epic,story,CR,Bug,initiative}.md` — all seed `context_source` as prose, and all carry `parent_ref`.
- **Why this CR extends rather than rebuilds:** it proposes no implementation yet. The recommended direction reuses `parent_ref`, already present in every template, rather than adding a key.

## Prior work

- [[BUG-008]] — introduced the prose-vs-path heuristic that exists only because of this ambiguity.
- [[CR-095]] — hardened the waiver and rewrote the failure message to name every route; surfaced this as its own open question, which this CR now carries.
- [[CR-030]] — introduced the `parent-approved` OR-group.
- No prior item proposes a single type for `context_source`.

## 3. Execution Sandbox

**Deliberately empty — this CR is a finding, not an implementation.** Populate after the schema decision. The surfaces that would change are listed under Existing Surfaces.

## 4. Verification Protocol

**Command/Test:** to be defined with the implementation.

The acceptance shape, whichever direction is chosen: `grep -rn "looksLikeProse" cleargate-cli/src/` returns nothing, and `parent-approved` resolves its parent through exactly one documented mechanism.

---

## Context Source

**context_source:** verified codebase grounding. The three-way type conflict is directly readable in `readiness-gates.md` against the shipped templates' own defaults; no inference required. Raised while fixing [[CR-095]] and filed rather than acted on because it is a schema decision. No PM-tool or remote input.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🔴 High Ambiguity — a finding awaiting a schema decision, not a plan**

Requirements to pass to Green (Ready for Execution):
- [ ] "Obsolete Logic" to be evicted is explicitly declared.
- [ ] All impacted downstream Epics/Stories are identified and reverted to 🔴 High Ambiguity.
- [ ] Execution Sandbox contains exact file paths.
- [ ] Verification command is provided.
- [ ] `approved: true` is set in the YAML frontmatter.
- [x] Existing Surfaces cites at least one source-tree path the CR extends.
