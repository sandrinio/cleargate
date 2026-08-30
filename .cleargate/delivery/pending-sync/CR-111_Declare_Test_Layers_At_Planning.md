---
cr_id: CR-111
parent_ref: null
parent_cleargate_id: null
sprint_cleargate_id: "SPRINT-39"
carry_over: false
area: planning-layer
status: Draft
approved: true
context_source: verified codebase grounding — story.md:184-189 §4.1 has Unit + E2E/acceptance + Performance rows but NO integration row; CR.md §4 and Bug.md §5 declare a bare command with no layer breakdown; grep of readiness-gates.md for test-plan/E2E/integration returns nothing; 30 *.integration.node.test.ts files exist under an undocumented convention. Recorded direct approval 2026-08-25.
created_at: 2026-08-25T22:11:46Z
updated_at: 2026-08-25T22:11:46Z
created_at_version: cleargate@0.24.2
updated_at_version: cleargate@0.24.2
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
  last_gate_check: 2026-08-25T22:11:47Z
  transition: ready-to-apply
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
---

# CR-111: Work items declare their integration and E2E test layers at planning time

## 0.5 Open Questions

- **Question:** Should every work item declare all three layers, or only those that apply?
- **Recommended:** Declare all three, with `0` as a valid, explicit answer. A row reading `Integration tests | 0 | pure function, no I/O` is a decision on record; an absent row is indistinguishable from an oversight. This is the same reasoning the Epic template's Reality Check uses ("omitting a row is a valid, intentional outcome") inverted — there, omission is cheap because no downstream agent consumes it; here QA does.
- **Human decision:** All three declared, `0` valid with a reason — recorded 2026-08-25.

- **Question:** Does the gate check counts, or only that the section is populated?
- **Recommended:** Populated only. A readiness gate cannot know whether 3 integration tests is right for a given story — that is the Architect's and QA's judgement. Gating population forces the conversation at planning time without pretending the gate can size it.
- **Human decision:** Populated only — recorded 2026-08-25.

## 1. The Context Override (Old vs. New)

**Obsolete Logic (What to Remove / Forget):**

- **Forget that `story.md` §4.1 covers the test layers.** It carries three rows — `Unit tests`, `E2E / acceptance tests`, `Performance test (if applicable)` (`story.md:184-189`). There is **no integration row**, despite `developer.md:96` mandating integration testing against real Postgres + Redis and 30 `*.integration.node.test.ts` files existing in the tree.
- **Forget that CRs and Bugs declare test coverage at all.** `CR.md` §4 Verification Protocol is a single `**Command/Test:**` line. `Bug.md` §5 is a command plus prose cases. Neither names a layer. A CR that needs an integration test and one that needs none are indistinguishable at plan time.
- **Forget that §4.1 is enforced.** Grepping `readiness-gates.md` for test-plan, E2E, or integration returns nothing. A story declares its minimums, then no predicate verifies they were declared, let alone met. `story.md` §4.2 DoD says *"Minimum test expectations (§4.1) met"* — a checkbox a human ticks.
- **Forget that the integration-test naming convention is defined anywhere.** 30 files use `*.integration.node.test.ts` and 6 use `*.red.integration.node.test.ts`; zero agent docs, skills, or knowledge files mention either. `SKILL.md` §C.3 pins QA-Red naming as `*.red.node.test.ts`, which the six red-integration files silently contradict.

**New Logic (The New Truth):**

- **Three layers, declared in every execution-unit work item.** `story.md` §4.1 gains an `Integration tests` row. `CR.md` and `Bug.md` gain the same three-row table beside their existing verification command — the command says *how to run*, the table says *what must exist*.
- **`0` is a valid declaration and must carry a reason.** Absence is not.
- **A readiness predicate checks the table is populated** for `story`, `cr`, and `bug` transitions. It checks population, not sizing.
- **The naming convention becomes documented, not tribal.** `*.integration.node.test.ts`, and `*.red.integration.node.test.ts` for the QA-Red variant, recorded in `developer.md`, `qa.md`, and `SKILL.md` §C.3 so the red-test naming rule stops contradicting practice.
- **Why planning time and not test time.** By the time a Developer is in a worktree, the decision has already been made implicitly — usually toward whatever is fastest to write. Declaring the layer in the work item makes it an Architect-reviewable, QA-checkable commitment before any code exists.

## 2. Blast Radius & Invalidation

- [ ] Invalidate/Update: `.cleargate/templates/story.md` §4.1 — new Integration row.
- [ ] Invalidate/Update: `.cleargate/templates/CR.md` §4 and `.cleargate/templates/Bug.md` §5 — new three-row table.
- [ ] Invalidate/Update: `.cleargate/knowledge/readiness-gates.md` — new `test-layers-declared` criterion for three buckets.
- [ ] Invalidate/Update: `.claude/agents/developer.md`, `.claude/agents/qa.md`, `SKILL.md` §C.3 — naming convention.
- [ ] Database schema impacts? **No.**
- [ ] **Every in-flight work item lacking the table will fail the new criterion.** This is the largest risk. Mitigation: the criterion applies to items whose `created_at_version` is at or after the shipping release, so existing items are grandfathered rather than mass-invalidated. Confirm the predicate vocabulary supports a version guard before implementing; if it does not, ship the template rows first and the gate as a follow-up.
- [ ] **`readiness-gates.md` is this sprint's hot file** — [[BUG-042]], [[STORY-054-02]], [[STORY-054-05]], [[STORY-054-06]] all touch it. This CR merges after all four.
- [ ] **`story.md`/`CR.md`/`Bug.md` are touched by [[STORY-054-06]]** (adds `## Task Breakdown`) **and [[CR-108]]** (normalises placeholders). This CR merges last of the three.

## Existing Surfaces

- **Surface:** `.cleargate/templates/story.md:184-189` — §4.1 Minimum Test Expectations table. Extended with one row, not replaced; the Unit/E2E/Performance rows and their guidance stay verbatim.
- **Surface:** `.cleargate/templates/story.md` §4.2 DoD — already asserts "Minimum test expectations (§4.1) met." This CR gives that assertion something a predicate can read.
- **Surface:** `.cleargate/templates/CR.md` §4 Verification Protocol / `Bug.md` §5 — existing verification sections; the table is added beside the existing command line.
- **Surface:** `.cleargate/knowledge/readiness-gates.md` — the predicate vocabulary and per-bucket criteria lists. **§ AMENDMENT (orchestrator, 2026-08-29, per M4 plan F6 — the decisive finding). The mechanism
  claim is FALSE; the surface is still needed.** Measured with the real exported `evaluate()`
  against the shipped templates, identical in both trees: `story.md section(5)` already scores
  **6** `declared-item`, `CR.md section(8)` scores 1, `Bug.md section(6)` scores 1. So **no
  `section(N) has >=N declared-item` threshold is both non-vacuous and satisfiable** — any N <= 6
  is green on the unedited `story.md` before an author writes a word. Shipping it that way would
  add a **tenth** vacuous criterion to a registry [[BUG-054]] already measures at 9-of-12 vacuous.
  **Corrected mechanism:** reuse STORY-054-06's closed-set predicate shape, whose absence-passes
  branch also supplies grandfathering for free. Note also that the version guard §2 contemplates
  cannot exist: `readiness-predicates.ts:290-291` implements `>=` as `Number(a) >= Number(expected)`,
  so `created_at_version >= 'cleargate@0.25.0'` evaluates `NaN >= NaN`.
- **Surface:** `.claude/agents/developer.md:96` — *"Never mock the database. Integration tests against real Postgres + Redis (SPRINT-01 flashcard)."* The rule exists; this CR gives it a planning-time declaration to attach to.
- **Surface:** `cleargate-cli/test/**` — 24 `*.integration.node.test.ts` + 6 `*.red.integration.node.test.ts`, plus 1 in `mcp/`. The convention being documented is already the de-facto standard; this CR writes it down rather than inventing it.
- **Why this CR extends rather than rebuilds:** §4.1 already exists, already has the right shape, and is already referenced by the DoD — it is missing one row and any enforcement. The naming convention already exists in 30 files. Nothing new is designed here; three templates gain a row, one predicate is registered against machinery that already evaluates sections, and an established convention is written down.

## Task Breakdown

> Rows authored by the M4 Architect in `.cleargate/sprint-runs/SPRINT-39/plans/M4.md`
> and committed into this item by the orchestrator on 2026-08-29 (M4 OD-5), before any
> worktree was cut. Execution order.

- [ ] Cut story/CR-111 from sprint/S-39 after CR-108 and CR-110 merge; branch the cli half from cli main
- [ ] Re-measure story.md's §4.1 table position and developer.md's DB-rule line AFTER all predecessors land (N7)
- [ ] Add predicate #11 test-layers-declared to readiness-predicates.ts as a SIBLING of evalTaskBreakdownComplete; do not touch evalSection
- [ ] QA-Red: author T1-T11; T8 asserts the criterion FAILS on the shipped story.md/CR.md/Bug.md
- [ ] Add the Integration row to story.md §4.1 (both trees) and the test-layer declaration block to CR.md §4 / Bug.md §5 (both trees) — NO ## heading
- [ ] Register test-layers-declared in readiness-gates.md story/cr/bug blocks (both trees); bump :9's "exactly 10" to 11
- [ ] cleargate-planning/.claude/agents/developer.md + qa.md + skills/sprint-execution/SKILL.md §C.3: all three naming forms, incl. the hyphen case
- [ ] Run gate-section-index-pinning (expect 18/18/0/0); run typecheck + full cli suite; record all numbers
- [ ] Verify git diff on readiness-predicates.ts touches zero lines inside :640-690 and adds no export

## Prior work

- `cleargate wiki query "test layers integration e2e declared planning"` → **none found**.
- [[STORY-054-06]] (SPRINT-39) — adds `## Task Breakdown` to the same three templates. Merge-order constraint recorded in §2 and the sprint's §2.2.
- [[CR-108]] — normalises placeholders across all nine templates. Same constraint.
- [[BUG-042]] / [[STORY-054-05]] — correct and pin `section(N)` gate indices. **Directly load-bearing**: adding a table to three gated templates shifts section indices, which is precisely the defect class 042 fixes and 05 pins. This CR must land after both, and 05's pinning test is what adjudicates it.
- [[EPIC-056]] — CI verification layer. Adjacent: this CR declares which layers a work item needs; EPIC-056 supplies the environment-independent runner that makes integration results trustworthy. Neither blocks the other.

## 3. Execution Sandbox

**Modify:**
- `.cleargate/templates/story.md` — §4.1 Integration row.
- `.cleargate/templates/CR.md` — §4 test-layer table.
- `.cleargate/templates/Bug.md` — §5 test-layer table.
- `.cleargate/knowledge/readiness-gates.md` — `test-layers-declared` criterion, three buckets.
- `.claude/agents/developer.md` — naming convention.
- `.claude/agents/qa.md` — naming convention.
- `.claude/skills/sprint-execution/SKILL.md` §C.3 — red-integration naming.
- `cleargate-planning/` mirrors of all seven.

**Do NOT modify:** `epic.md` or `initiative.md` (epics declare acceptance shape, execution units declare counts), the Performance row's existing guidance, or `evalSection`'s positional semantics.

**Merge ordering:** after [[BUG-042]] → [[STORY-054-05]] → [[STORY-054-02]] → [[STORY-054-06]] on `readiness-gates.md`, and after [[STORY-054-06]] → [[CR-108]] on the three templates. This CR is the last template edit in the sprint.

## 4. Verification Protocol

**Command/Test:** `npm --prefix cleargate-cli test`

1. **The failing case.** A file that *carries* a test-layer declaration but omits the Integration row fails `test-layers-declared`. **Must fail against the current tree** — the criterion does not exist.

   > **ORCHESTRATOR AMENDMENT (2026-08-30, CR-111 TPV §4 ruling).** This item's first sentence
   > previously read *"a story file with no Integration row fails"*, which **directly contradicted
   > item 5** (grandfathering): a pre-release story has no Integration row, so the same input had to
   > both fail and pass. Resolved as **absence-passes**, on measurement — absence-fails would newly
   > fail **386 of 400** live story/cr/bug items (96.5%), and the alternative version guard is
   > **unbuildable** (`readiness-predicates.ts:290-291` evaluates `>=` as `Number(a) >= Number(b)`,
   > i.e. `NaN >= NaN` for semver strings).
   >
   > **Binding contract:** `test-layers-declared` fires only on a document that already carries a
   > declaration (an `| Integration tests |` row, or a test-layer lead-in block); absent → **pass**
   > with a `not-applicable:` detail; present → all three layers declared, every count a
   > non-negative integer, and every `0` carrying a non-empty reason. In the CR's own words: **an
   > absent row is not a decision.**
2. `Integration tests | 0 | pure function, no I/O` **passes** — zero with a reason is a valid declaration.
3. `Integration tests | 0 | ` with no reason **fails**.
4. A CR and a Bug each require the same table; a missing table fails for both buckets.
5. **Grandfathering:** an item whose `created_at_version` predates this release is not failed by the new criterion.
6. **Section-index regression:** [[STORY-054-05]]'s pinning test stays green after three templates gain a table — the guard against re-introducing [[BUG-042]]'s defect.
7. Documentation assertion: `developer.md`, `qa.md`, and `SKILL.md` §C.3 all name `*.integration.node.test.ts` and `*.red.integration.node.test.ts`, and no doc claims red tests may only be `*.red.node.test.ts`.

**Parity check:** all seven modified files diff clean against their `cleargate-planning/` mirrors.

---

## Context Source

**context_source:** Verified codebase grounding — `story.md:184-189` read directly and confirmed to lack an integration row; `CR.md` §4 and `Bug.md` §5 confirmed to declare only a command; `readiness-gates.md` grepped for test-plan/E2E/integration with zero hits; 30 `*.integration.node.test.ts` files counted across `cleargate-cli` and `mcp`. Direct approval recorded 2026-08-25, with the human specifying that integration and end-to-end coverage be declared in work items during planning rather than decided at test-writing time.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Ready for Execution**

Requirements to pass to Green (Ready for Execution):
- [x] "Obsolete Logic" to be evicted is explicitly declared.
- [x] All impacted downstream Epics/Stories are identified and reverted to 🔴 High Ambiguity. — none invalidated; the grandfathering guard in §2 is what prevents mass-invalidation of in-flight items, and all merge-order constraints are recorded.
- [x] Execution Sandbox contains exact file paths.
- [x] Verification command is provided.
- [x] `approved: true` is set in the YAML frontmatter.
- [x] Existing Surfaces cites at least one source-tree path the CR extends.

> **Gate 1 sign-off: approved 2026-08-25** by sandrinio.
