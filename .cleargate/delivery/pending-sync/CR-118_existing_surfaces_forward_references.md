---
cr_id: CR-118
parent_ref: EPIC-NNN | STORY-NNN-NN
parent_cleargate_id: null
sprint_cleargate_id: null
carry_over: false
status: Completed
approved: true
context_source: approved Epic / verified codebase grounding + recorded direct approval
created_at: 2026-04-17T00:00:00Z
updated_at: 2026-04-17T00:00:00Z
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
  last_gate_check: 2026-09-01T23:14:38Z
  transition: ready-to-apply
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
area: gate-predicates
---

# CR-118: `existing-surfaces-verified` must accept forward references to planned deliverables

> **First-user field report,** 2026-09-02, from running the full lifecycle in a
> fresh consumer repo. **Implemented in the same run.**

## 0.5 Open Questions

- **Question:** Resolve forward references by scanning pending-sync `<target_files>`, or by honouring an inline `(planned)` marker on the citation?
- **Recommended:** **Scan `<target_files>`.** It requires no new authoring convention, it is checkable rather than assertable, and it fails closed — a path nobody has declared anywhere still fails. An inline marker would let an author wave through any typo.
- **Human decision:** Accepted as recommended — implemented as `isPlannedDeliverable()`.

## 1. The Context Override (Old vs. New)

**Obsolete Logic (to be evicted):** that every path cited in `## Existing Surfaces`
must already exist on disk. `readiness-predicates.ts` reached its sentinel escape
only when `paths.length === 0`, so citing any path meant all of them had to exist:

```ts
const paths = [...new Set(rawMatches.map(...))];
if (paths.length === 0) {            // sentinel branch gated behind this
  if (SENTINEL_RE.test(sectionContent)) return { pass: true, ... };
}
// any cited path missing → fail
```

**New Logic:** a cited path that does not exist is checked against the
`<file path="...">` declarations in every pending-sync item's `<agent_context>`.
If some item has declared it as a planned deliverable, the citation is a forward
reference to specified-but-unbuilt work, not a hallucinated path — it passes, and
the detail line reports how many forward references were accepted.

## 2. Blast Radius & Invalidation

- [ ] Invalidate/Update Story: none
- [ ] Invalidate/Update Epic: none
- [ ] Database schema impacts? **No** — pure predicate logic.

Strictly widening: every document that passed before still passes.

## Existing Surfaces

- **Surface:** `cleargate-cli/src/lib/readiness-predicates.ts` — `evalExistingSurfacesVerified()` and the new `isPlannedDeliverable()` helper.
- **Why this CR extends rather than rebuilds:** the section locator, path regex, sandbox check and sentinel handling are all correct and untouched. The change inserts one step between "path is missing" and "therefore fail".

## Prior work

- [[CR-033]] — introduced `existing-surfaces-verified` and its path-existence rule.
- [[BUG-071]] — the sentinel-vocabulary half of the same predicate's mismatch with its templates.

## 3. Execution Sandbox

**Investigate / Modify:**
- `cleargate-cli/src/lib/readiness-predicates.ts`

## Task Breakdown

- [x] Add `isPlannedDeliverable(candidate, projectRoot)` scanning pending-sync `<file path="...">` declarations
- [x] Consult it before failing on missing paths; report forward-reference count in the detail
- [x] Keep fail-closed behaviour for paths declared nowhere
- [ ] Add a regression test for the forward-reference pass and the undeclared-path fail

## 4. Verification Protocol

**Command:** `npx tsx --test test/lib/readiness-predicates.node.test.ts`

Red test: an epic citing `src/foo.mjs` in `## Existing Surfaces`, where a sibling
pending-sync item declares `<file path="src/foo.mjs" action="create" />` and the
file does not exist, must PASS. Before the change it failed. Second: a citation
to `src/never-declared.mjs` must still FAIL.

**Test layers.**

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 2 | forward reference passes; undeclared missing path still fails |
| Integration tests | 1 | a two-epic decomposition where the second cites the first's deliverables passes `epic.ready-for-decomposition` |
| E2E / acceptance tests | 0 | covered by the integration case |

---

## Context Source

**context_source:** verified codebase grounding — `readiness-predicates.ts` path-existence branch, and a live failure in a fresh consumer repo where EPIC-002 could not cite EPIC-001's deliverables, read directly 2026-09-02.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity — implemented and verified 2026-09-02**

Requirements to pass to Green:
- [x] Old vs New logic is explicitly contrasted.
- [x] Blast radius is enumerated.
- [x] Verification command is provided.
- [x] `approved: true` is set in the YAML frontmatter.
