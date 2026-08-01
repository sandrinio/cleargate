---
cr_id: CR-098
parent_ref: EPIC-043
parent_cleargate_id: EPIC-043
sprint_cleargate_id: null
carry_over: false
status: Completed
approved: true
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
  last_stamp: 2026-08-01T13:01:17Z
  sessions: []
---

# CR-098: `context_source` Cannot Be Both Prose and a Path

## 0.5 Open Questions — RESOLVED 2026-08-01

- **Question:** Introduce a dedicated `parent_ref_path` key, or make `parent-approved` read the existing `parent_ref` field?
- **Recommended:** Read `parent_ref`, which every template already carries and which already names the parent (`EPIC-{ID} | STORY-{ID}`). It is currently an id, not a path, so `parent-approved` would need to resolve an id to a file — the same search `findSprintPlanFile` and `sprint-file-locate` already do. That avoids adding a key to every template and every archived item, and it removes the prose-vs-path guess entirely rather than relocating it.
- **Human decision:** **Read `parent_ref`.** Approved by sandrinio 2026-08-01.

  **Correction to the recommendation's premise.** "every template already carries [`parent_ref`]" was **wrong**. Only `Bug.md` and `CR.md` carry it; `epic.md`, `story.md`, and `initiative.md` do not — and `parent-approved` fires *only* on `work_item_type: epic` (readiness-gates.md, the two `or_group: parent-approved` criteria are its sole uses). So the chosen direction required one step the CR did not anticipate: adding `parent_ref` to `epic.md`. That is one key in one template, still far cheaper than `parent_ref_path` across five templates plus backfill, so the direction stands.

- **Question:** What happens to the ~150 archived items whose `context_source` is prose?
- **Recommended:** Nothing. They are archived; their gates already ran. The migration cost is the reason to prefer reading `parent_ref` over adding a new key.
- **Human decision:** **Nothing.** Confirmed — no archived item was touched. `context_source` remains valid prose everywhere; it simply is no longer read as a path.

## 1. The Context Override (Old vs. New)

**Obsolete Logic (What to Remove / Forget):**
- Forget that `context_source` has one meaning. Two readiness criteria read it as two incompatible types, and the templates ship it as the third.

**New Logic (The New Truth):**
- `context_source` has exactly **one** meaning: prose evidence of grounding, read only by `discovery-checked` as a presence flag. It never names another document.
- `parent_ref` names the parent, and is the only key `parent-approved` reads. It resolves through exactly two forms, in order: a bare work-item id (`INITIATIVE-001`) matched by filename stem under `pending-sync/` then `archive/`, or a relative path.
- The two resolution outcomes are deliberately **asymmetric**:
  - `parent_ref` **unset** → fall back to a recorded direct approval (`proposal_gate_waiver` with `approved_by` + `approved_at`, or top-level `approved_by` + `approved_at`). This is the documented route for an epic whose parent was approved in conversation with no document on disk.
  - `parent_ref` **set but unresolvable** → hard fail, no waiver escape. Naming a parent that is not on disk is a broken reference, not an approval. This preserves the R-08 regression guarantee.
- `looksLikeProse` is deleted. Nothing guesses a type any more.

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

- [x] Invalidate/Update Bug: [[BUG-008]] — heuristic removed, not left as dead straddling code. Its sub-fix #1 test block is replaced; sub-fix #2 (no-tbds marker semantics) is untouched.
- [x] Invalidate/Update CR: [[CR-095]] — the three-route failure message is now two routes (name the parent / record the waiver). All four CR-095 waiver-soundness tests survive unchanged in behaviour, retargeted to `parent_ref`.
- [x] Database schema impacts? **No.** Frontmatter contract only.

**Downstream Epics/Stories reverted to 🔴: none — the set is empty.** The two impacted items are a Bug and a CR, both already closed; neither is an Epic or a Story, and neither has an ambiguity gate still in play. The gate criterion below is therefore satisfied vacuously, and is recorded here rather than checked silently.

**Downstream risk (of acting, not of the finding).**
- Any change to the meaning of `context_source` touches every template, the readiness-gates doc, the predicate evaluator, and potentially archived items. That breadth is exactly why this is filed rather than fixed.
- Doing nothing is a defensible outcome: the heuristic works and is now well-messaged. The cost is that it remains a trap for the next author.

## Existing Surfaces

- **Surface:** `.cleargate/knowledge/readiness-gates.md:12` — the `<ref>` definition ("relative path to another document").
- **Surface:** `.cleargate/knowledge/readiness-gates.md:78-93` — `parent-approved-proposal` / `parent-approved-initiative` (path reader) and `discovery-checked` (presence reader), on the same key.
- **Surface:** `cleargate-cli/src/lib/readiness-predicates.ts` — `evalFrontmatter`'s prose-vs-path heuristic, the straddle.
- **Surface:** `.cleargate/templates/{epic,story,CR,Bug,initiative}.md` — all seed `context_source` as prose. **Only `CR.md` and `Bug.md` carry `parent_ref`** (measured 2026-08-01); `epic.md` gained it as part of this change, and `story.md`/`initiative.md` still lack it — harmless, since `parent-approved` fires only on epics.
- **Why this CR extends rather than rebuilds:** the direction reuses `parent_ref`, a key the schema already had, rather than inventing `parent_ref_path`. Adding it to `epic.md` is one line in one template; `parent_ref_path` would have been five templates plus a backfill.

## Prior work

- [[BUG-008]] — introduced the prose-vs-path heuristic that exists only because of this ambiguity.
- [[CR-095]] — hardened the waiver and rewrote the failure message to name every route; surfaced this as its own open question, which this CR now carries.
- [[CR-030]] — introduced the `parent-approved` OR-group.
- No prior item proposes a single type for `context_source`.

## 3. Execution Sandbox

**Modify:**
- `cleargate-cli/src/lib/readiness-predicates.ts` — `evalFrontmatter`'s non-`.` branch rewritten; `looksLikeProse` deleted; added `hasRecordedWaiver`, `resolveParentRef`, `resolveWorkItemIdToPath`, `WORK_ITEM_ID_RE`.
- `.cleargate/knowledge/readiness-gates.md` + `cleargate-planning/.cleargate/knowledge/readiness-gates.md` — Predicate Vocabulary shape 1 redefined; both `or_group: parent-approved` criteria retargeted to `frontmatter(parent_ref)`; the STORY-051-03 (Q7) self-referential note rewritten (it described `discovery-checked` as the *exception* to an upstream `context_source` form that no longer exists).
- `.cleargate/templates/epic.md` + `cleargate-planning/.cleargate/templates/epic.md` — added `parent_ref`, the one step the CR's premise missed.
- `cleargate-cli/test/lib/readiness-predicates.node.test.ts` — BUG-008 sub-fix #1 block replaced by a `CR-098` block; ref-mechanism tests (CR-031 scenarios, CR-030 field map) retargeted from `context_source` to `parent_ref`.
- `cleargate-cli/test/commands/gate-unit.node.test.ts` — `OR_GROUP_GATES_DOC` fixture and its three epic fixtures retargeted; two test names corrected where the scenario they described had drifted from what they assert.

**Data corrected (not code):**
- `EPIC-046`, `EPIC-047` — `parent_ref: INITIATIVE-001` added. Both cited INITIATIVE-001 in prose and were blocked with an unactionable message; they are now blocked on the true cause, that INITIATIVE-001 is `In Triage` rather than `Triaged`.

**Not touched:** the ~150 archived items, per the second open question.

## 4. Verification Protocol

**Command/Test:** `cd cleargate-cli && npm test` — 2291 pass / 0 fail / 1 skipped (up from 2283; +8 CR-098 tests). `npm run typecheck` clean.

**Acceptance, both halves met:**
- `grep -rn "looksLikeProse" cleargate-cli/src/` returns nothing. Asserted in-suite, not just by hand: `CR-098: looksLikeProse is gone — the heuristic is not consulted anywhere` reads the source file and fails if the identifier reappears.
- `parent-approved` resolves its parent through exactly one documented mechanism (`parent_ref`), with the id and path forms as two spellings of that one mechanism.

**Behavioural evidence on a real item.** `cleargate gate check` on EPIC-046, before and after:

```
before: ❌ parent-approved: … parent_ref is unset and no parent-approval waiver is
        recorded. Either set parent_ref to the parent work-item id (e.g.
        "INITIATIVE-002") or to a path relative to this file, or record the waiver …

after:  ❌ parent-approved: … parent-approved-proposal: expected approved == true, got
        undefined; parent-approved-initiative: expected status == "Triaged", got "In Triage"
```

The item is still blocked — correctly. What changed is that the message now names a cause someone can act on.

---

## Context Source

**context_source:** verified codebase grounding. The three-way type conflict is directly readable in `readiness-gates.md` against the shipped templates' own defaults; no inference required. Raised while fixing [[CR-095]] and filed rather than acted on because it is a schema decision. No PM-tool or remote input.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity — schema decision taken 2026-08-01; implemented and verified**

Requirements to pass to Green (Ready for Execution):
- [x] "Obsolete Logic" to be evicted is explicitly declared.
- [x] All impacted downstream Epics/Stories are identified and reverted to 🔴 High Ambiguity.
- [x] Execution Sandbox contains exact file paths.
- [x] Verification command is provided.
- [x] `approved: true` is set in the YAML frontmatter.
- [x] Existing Surfaces cites at least one source-tree path the CR extends.
