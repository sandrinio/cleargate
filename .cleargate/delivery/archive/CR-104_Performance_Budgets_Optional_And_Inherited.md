---
cr_id: CR-104
parent_ref: null
parent_cleargate_id: null
sprint_cleargate_id: null
carry_over: false
status: Completed
approved: true
area: planning
context_source: |
  Direct user request 2026-08-24 ("do we include measurements in epic? how many ms should it
  take, latency, load and etc" → "latency could also be optional depended on the context /
  agree with the story inheriting it"). Every claim below was verified against the current tree
  before drafting, not taken from memory: epic.md:110-115 (the Reality Check table and its
  unconditional Performance row), story.md (grep for performance|latency|p95|throughput returns
  zero — the story template has no perf surface at all), story.md:166 (the `(if applicable)`
  optional-section idiom this CR reuses), readiness-predicates.ts (13 predicate ids, none
  performance-related), and a corpus count over .cleargate/delivery/archive/EPIC-*.md showing
  9 of 32 archived epics filled the Performance row and 23 deleted it outright.
  A grep for "reality check"|"constraint type" across cleargate-cli/src, .claude/, and scripts/
  returns zero matches, confirming §3 is inert prose that no code parses.
created_at: 2026-08-24T00:00:00Z
updated_at: 2026-08-24T00:00:00Z
created_at_version: 0.23.1
updated_at_version: 0.23.1
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-08-24T08:42:41Z
  transition: ready-to-apply
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id CR-104
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-08-24T08:42:41Z
  sessions: []
---

# CR-104: Performance Budgets — Optional in the Epic, Inherited by the Story

## 0.5 Open Questions

- **Question:** Should the story-side budget land in §2.1 Gherkin, or in a new prose subsection (e.g. §3.4 Performance Budget)?
- **Recommended:** §2.1 Gherkin. QA-Verify already diffs the commit against the story's acceptance Gherkin and flags missing scenarios. A budget expressed as a `Then` clause is verified by machinery that ships today; a budget in prose is verified by nobody, which reproduces the exact failure this CR is fixing one level down.
- **Human decision:** Gherkin (§2.1) — confirmed 2026-08-24. User agreed the story should inherit; Gherkin is the only landing spot that makes inheritance load-bearing rather than decorative.

- **Question:** Should a readiness predicate enforce that a populated epic Performance row reaches the child story?
- **Recommended:** No. The user's constraint is that latency is optional depending on context, and a predicate cannot distinguish "no performance dimension applies here" from "the author forgot." Enforcement would produce false blocks on the majority of ClearGate's own epics — 23 of 32 archived epics legitimately have no perf dimension. Guidance-only, zero engine change.
- **Human decision:** No predicate — confirmed 2026-08-24 ("latency could also be optional depended on the context").

- **Question:** Should the 9 archived epics with populated Performance rows be retro-fitted to the new `measured by <method>` shape?
- **Recommended:** No. They are Completed; rewriting shipped items produces churn in the wiki ingest log for zero downstream benefit. New authorship only.
- **Human decision:** No retro-fit — confirmed 2026-08-24. The 9 archived epics with populated
  Performance rows keep their current wording. New authorship only; this CR touches no item under
  `.cleargate/delivery/archive/`.

## 1. The Context Override (Old vs. New)

**Obsolete Logic (What to Remove / Forget):**

- **Forget that `epic.md` §3's Performance row is unconditional.** It renders today as `| Performance | {e.g., Must complete in < 200ms} |` with no signal that omission is legitimate. The observed consequence across ClearGate's own corpus: 23 of 32 archived epics silently deleted the row, 9 filled it. Nothing distinguishes a deliberate "no perf dimension here" from an author who skipped it, so the row carries no information either way.
- **Forget that a bare millisecond figure is a sufficient budget.** Of the 9 epics that filled the row, only EPIC-027 (`<5ms p99 vs current baseline`) names a baseline. The rest state absolute bounds with no measurement method, which makes them unfalsifiable at QA time — nobody can fail a story for missing a number that was never operationalized.
- **Forget that performance is an epic-only concern.** `story.md` has no performance surface whatsoever; a grep for `performance|latency|p95|p99|throughput|load|nfr` across it returns zero. Any budget stated in an epic dies at decomposition and never reaches the agent that writes the code.

**New Logic (The New Truth):**

1. **The epic Performance row is explicitly conditional.** It becomes `| Performance *(if applicable)* |`, and the guidance instructs the author to either state a budget in the shape `<metric> <percentile> <bound>, measured by <method>` or omit the row entirely. **Omission is a valid, intentional outcome** — this codifies existing majority practice rather than changing behavior. The change makes the absence deliberate instead of silent.
2. **A populated epic budget is inherited by its stories.** When the parent epic's §3 Performance row is populated, each story whose scope touches that budget restates it as a Gherkin `Then` clause in §2.1 and adds a matching row to §4.1 Minimum Test Expectations. When the epic omits the row, the story inherits nothing and says nothing.
3. **No new section, no new predicate, no engine change.** The inheritance rides §2.1 and §4.1, which QA-Verify and §4.2 Definition of Done (`All Gherkin scenarios from §2.1 covered`) already check. The readiness-predicate registry is untouched.

## 2. Blast Radius & Invalidation

- [ ] Invalidate/Update Story: **none.** This is additive authoring guidance for new work. No in-flight story's acceptance criteria change.
- [ ] Invalidate/Update Epic: **none invalidated.** No archived epic is retro-fitted (see §0.5 Q3).
- [x] **Coordination required with [[EPIC-052]] (Requirement-Level Grounding, Draft, 🟢).** Its `<agent_context>` target_files already list `.cleargate/templates/epic.md`, `story.md`, `CR.md`, `Bug.md`, and `initiative.md` for modification, and it adds a `## Grounding` table to each. EPIC-052 must carry this CR's optional Performance row and the story-side inheritance line forward when it rewrites those templates. This is a merge-ordering constraint, not an invalidation — the two changes touch different sections of the same files. Ship this CR first: it is a two-file guidance edit, while EPIC-052 is an undecomposed 12-file epic blocked behind [[CR-103]].
- [ ] Database schema impacts? **No.** No schema, no MCP push payload change, no adapter surface change.
- [x] **Install-manifest regeneration required.** `cleargate-planning/MANIFEST.json:433` records a `sha256` for `.cleargate/templates/epic.md` under `tier: template`, `overwrite_policy: merge-3way`. Editing the template invalidates that hash; `npm run prebuild` regenerates it. Downstream consequence: repos running `cleargate upgrade` will see a **3-way merge** on these two templates rather than a clean overwrite. Users who edited their own copies get a merge prompt — expected and correct for the `merge-3way` tier, but worth stating.
- [ ] Test impact: **none.** The three tests referencing these templates assert existence (`foreign-repo.integration.node.test.ts:205-206`) or use synthetic fixture hashes (`uninstall.node.test.ts:155`, `upgrade.node.test.ts:233/479/772`). No test asserts template body content.

## Existing Surfaces

- **Surface:** `.cleargate/templates/epic.md:110-115` — §3 The Reality Check renders a two-row constraints table (`Performance`, `Security`) with placeholder values. This is the only performance surface in the entire template set.
- **Surface:** `.cleargate/templates/story.md:166` — `### 3.3 API Contract (if applicable)`. The established in-template idiom for a conditional section; this CR reuses that exact wording rather than inventing a new optionality marker.
- **Surface:** `.cleargate/templates/story.md:131` — §2.1 Acceptance Criteria (Gherkin), the block QA-Verify diffs commits against. The story-side landing spot.
- **Surface:** `.cleargate/templates/story.md:174` — §4.1 Minimum Test Expectations, an existing table with a `Notes` column that already references §2.1 scenarios.
- **Surface:** `cleargate-cli/src/lib/readiness-predicates.ts:977` — documents the existing `section entirely absent → pass` migration-grace behavior, confirming optional sections are native to the predicate engine's design and require no new code to be tolerated.
- **Why this CR extends rather than rebuilds:** every affected surface already exists and already has the right shape. The Performance row exists but reads as mandatory; the optional-section idiom exists but is not applied to it; the Gherkin block and test-expectations table exist but nothing routes a budget into them. This is three wording edits and one instruction line across two templates. There is no new section, no new command, no new predicate, and no code change of any kind.

## Prior work

- [[CR-028]] — *Code Truth, Triage, Reuse, Right-Size, Justify.* The direct precedent: it added `Existing Surfaces`, `Prior work`, and `Why not simpler?` sections across 6 template mirrors plus readiness-gates mirrors, and is explicitly described in its own §4 as "pure protocol + template + new gate-criteria additions; zero new infrastructure." Same change shape as this CR, one tier smaller here because CR-104 adds no gate criteria.
- [[EPIC-052]] — *Requirement-Level Grounding.* Overlaps on files (`templates/epic.md`, `templates/story.md`) but not on purpose: EPIC-052 answers "is this requirement shipped?" via a `## Grounding` table with `file::symbol` citations and locking tests. CR-104 answers "what is this thing's latency budget, if any?" Adjacent, not duplicate. See §2 for the merge-ordering constraint.
- [[CR-034]] — *Predicate-vs-Template Format Mismatch.* Precedent for the failure mode this CR deliberately avoids: a predicate whose expected format diverged from what the template actually emits. CR-104 adds no predicate, so it cannot reproduce that class of bug.
- No prior work proposes performance, latency, load, or NFR budgets in any ClearGate template. A grep for `non-functional|performance budget|template.*(performance|latency|nfr)` across `.cleargate/wiki/` and `.cleargate/delivery/` returns only the three items above, none of which address measurements.

## 3. Execution Sandbox

**Modify (canonical — edits land here first):**
- `cleargate-planning/.cleargate/templates/epic.md` — §3 Reality Check: mark the Performance row `*(if applicable)*`; add one guidance line above the table stating the budget shape and that omission is valid.
- `cleargate-planning/.cleargate/templates/story.md` — two edits: (a) `<instructions>` block, add one decomposition line on inheriting a populated parent-epic Performance row into §2.1; (b) §4.1 Minimum Test Expectations, add an `(if applicable)` performance row to the table.

**Modify (live dogfood mirror — byte-identical re-sync, same commit):**
- `.cleargate/templates/epic.md`
- `.cleargate/templates/story.md`

**Regenerate — do NOT hand-edit:**
- `cleargate-planning/MANIFEST.json` — via `npm run prebuild` from `cleargate-cli/`.
- `cleargate-cli/templates/cleargate-planning/.cleargate/templates/{epic,story}.md` — gitignored npm payload, same `prebuild` run.

**Explicitly out of sandbox:** `cleargate-cli/src/**` (no code change), `readiness-predicates.ts`, `.cleargate/knowledge/readiness-gates.md`, `CR.md`, `Bug.md`, `initiative.md`, `hotfix.md`, and every archived work item.

## 4. Verification Protocol

**Command/Test:**

```bash
# 1. New wording present in canonical + live, both templates
command grep -c 'if applicable' cleargate-planning/.cleargate/templates/epic.md \
                                .cleargate/templates/epic.md
command grep -n 'Performance' cleargate-planning/.cleargate/templates/story.md \
                              .cleargate/templates/story.md

# 2. Old unconditional row is gone (must return zero)
command grep -c '^| Performance | {e.g.' .cleargate/templates/epic.md || echo "evicted OK"

# 3. Three-mirror parity — all three diffs must be silent
cd cleargate-cli && npm run prebuild && cd ..
diff -q cleargate-planning/.cleargate/templates/epic.md  .cleargate/templates/epic.md
diff -q cleargate-planning/.cleargate/templates/story.md .cleargate/templates/story.md
diff -q cleargate-planning/.cleargate/templates/epic.md \
        cleargate-cli/templates/cleargate-planning/.cleargate/templates/epic.md

# 4. MANIFEST hash rotated for both templates
git diff --stat cleargate-planning/MANIFEST.json   # must show a change

# 5. No engine regression
cd cleargate-cli && npm run typecheck && npm test
```

**Old-logic eviction check:** step 2 asserts the unconditional placeholder row no longer exists in the live template. Step 3 asserts no mirror retains it.

**Behavioral acceptance:** author a throwaway epic from the modified template with no performance dimension; confirm the Performance row can be omitted without any gate, predicate, or `cleargate doctor` complaint. Then author one *with* a budget and confirm the decomposed story's §2.1 carries it as a `Then` clause.

---

## Context Source

**context_source:** Direct user request 2026-08-24 + verified codebase grounding. Full audit trail in the frontmatter `context_source` block: template line anchors, the 9-of-32 corpus count, the zero-match greps proving §3 is inert and story.md has no perf surface, and the predicate-registry enumeration proving no performance predicate exists.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity**

*Evaluate each criterion against its literal text. If you substituted an interpretation, leave the box unchecked and surface the substitution in the Brief.*

Requirements to pass to Green (Ready for Execution):
- [x] "Obsolete Logic" to be evicted is explicitly declared.
- [x] All impacted downstream Epics/Stories are identified and reverted to 🔴 High Ambiguity. *(Literal read: none are impacted — EPIC-052 is a merge-ordering coordination, not an invalidation, and is named explicitly in §2.)*
- [x] Execution Sandbox contains exact file paths.
- [x] Verification command is provided.
- [x] `approved: true` is set in the YAML frontmatter.
- [x] Existing Surfaces cites at least one source-tree path the CR extends.
