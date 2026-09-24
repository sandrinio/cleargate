---
cr_id: CR-123
parent_ref: null
parent_cleargate_id: null
sprint_cleargate_id: SPRINT-41
carry_over: false
area: templates
status: Approved
approved: true
approved_by: sandrinio
approved_at: 2026-09-24T21:53:44Z
context_source: "verified codebase grounding — story.md:140-153 §2.1 ships a two-scenario Gherkin skeleton with no coverage rule; story.md:19-32 Granularity Rubric says when to split but not along which axis; readiness-gates.md:173 story gate checks only body contains 'Scenario:'; readiness-gates.md:150 epic error-path check is a bare 'Error' substring; qa.md:39,42 + SKILL.md:340,438 send QA to '§4 acceptance' for every type while story Gherkin lives in §2.1; CR.md:133 + Bug.md:121 cite 'Gherkin scenario' in templates with no Gherkin block. User request 2026-09-25: adopt SPIDR as the test-scenario coverage strategy; §0.5 decisions recorded in chat 2026-09-25."
created_at: 2026-09-24T21:36:40Z
updated_at: 2026-09-24T21:43:17Z
created_at_version: cleargate@0.26.1
updated_at_version: cleargate@0.26.1
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-09-24T23:35:07Z
  transition: ready-to-apply
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id CR-123
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-09-24T22:39:45Z
  sessions: []
---

# CR-123: Tested work items declare SPIDR coverage, and their scenarios must match it

## 0.5 Open Questions

- **Question:** Where do the SPIDR flags live — frontmatter (as in the source proposal) or the body?
- **Recommended:** A body table beside the Gherkin, introduced by a `**SPIDR coverage.**` lead-in. Every closed-set evaluator reads `doc.body` only (`readiness-predicates.ts:1263-1266`); [[CR-109]] is moving machine fields out of frontmatter; the body is what reaches the PM tool, so stakeholders see which axes were ruled out and why; and it reuses [[CR-111]]'s lead-in table shape.
- **Human decision:** Delegated to the agent ("you decide") 2026-09-25 → body table.

- **Question:** Which work-item types carry the table?
- **Recommended:** Stories only.
- **Human decision:** "Whatever needs testing" 2026-09-25 → every type QA-Red writes tests for: **Story, CR, Bug**. CR §4 and Bug §5 gain a Gherkin block to hold the scenarios. Out: Epics (tested through their stories) and Hotfixes (verified by manual §3 steps, outside the QA loop).

- **Question:** Keep a Spike axis, given spikes are pre-sprint work items and never subtasks (sprint-execution SKILL §2.1)?
- **Recommended:** Keep it as a citation of a concluded SPIKE.
- **Human decision:** "Not sure we need this at all" 2026-09-25 → **dropped.** No Spike row. `story.md:28` already routes open discovery to a SPIKE item before the story is written, and the lead-in says so in one sentence.

- **Question:** Must covered axes also appear as `## Task Breakdown` rows?
- **Recommended:** Only when that section is present.
- **Human decision:** "Modify it so it fits our scenarios" 2026-09-25 → read as: SPIDR governs **test scenarios**, not subtasks. No task-row markers and no Task Breakdown check. The instructions state that Task Breakdown rows implement the scenarios and that no row is written for an `F` axis. Reading confirmed by the human's approval, 2026-09-25.

- **Question:** Fold in the three Gherkin defects from the same audit?
- **Recommended:** Yes.
- **Human decision:** Include, 2026-09-25. Adjusted by the type decision above: CR and Bug now gain real Gherkin blocks, so their "1 per Gherkin scenario" rows become correct and stay as written; QA's `§4` pointer becomes per-type instead of a flat `§2.1`.

## 1. The Context Override (Old vs. New)

**Obsolete Logic (What to Remove / Forget):**

- **Forget that scenario choice is left to the author.** `story.md:140-153` ships one happy-path and one error skeleton and nothing else. No rule says which alternate paths, interfaces, data variants or business rules need a scenario. The only machine check is `gherkin-present: body contains 'Scenario:'` (`readiness-gates.md:173`), which one scenario satisfies.
- **Forget that only stories have acceptance scenarios.** `CR.md` §4 and `Bug.md` §5 carry a command and a test-layer table but no scenarios, while their E2E rows (`CR.md:133`, `Bug.md:121`) already say "1 per Gherkin scenario".
- **Forget that the Granularity Rubric says how to split.** `story.md:24-28` lists when a story is too big and then says "emit two stories". It never says along which line to cut.
- **Forget that the epic error-path check verifies an error path.** `gherkin-error-path` is `body contains 'Error'` (`readiness-gates.md:150`) — a case-sensitive substring anywhere in the body, satisfied by prose.
- **Forget a single `§4 acceptance` pointer.** `qa.md:39,42` and `SKILL.md:340,438` send QA-Red and QA-Verify to "§4 acceptance Gherkin" for every type. That is right for a CR, wrong for a Story (§2.1) and wrong for a Bug (§5).

**New Logic (The New Truth):**

- **Story, CR and Bug declare SPIDR coverage directly above their Gherkin block** — Story §2.1, CR §4, Bug §5. Template text, identical in all three:

  ````markdown
  **SPIDR coverage.** One row per axis. `T` = at least one scenario below carries the axis tag
  (`@paths`, `@interfaces`, `@data`, `@rules`). `F` = no scenario carries it, and the row states
  why. There is no Spike row: open discovery is chartered as a SPIKE item (`templates/spike.md`)
  before this item is written.

  | Axis | Cover | Reason |
  |---|---|---|
  | Paths | {T or F} | {…} |
  | Interfaces | {T or F} | {…} |
  | Data | {T or F} | {…} |
  | Rules | {T or F} | {…} |
  ````

  Bold lead-ins, never `##` headings — a heading would renumber every `section(N)` criterion below it (`readiness-gates.md` entry 3).
- **CR §4 and Bug §5 gain a Gherkin skeleton** after the table, before `**Test layers.**`. CR: `Scenario: {New logic holds}` and `Scenario: {Obsolete logic is gone}`. Bug: `Scenario: {The §1 expected behaviour holds}` and `Scenario: {Error — …}`. Their E2E rows ("1 per Gherkin scenario") stay as written — they now point at something real.
- **Axis meanings, in each template's instructions block.** Paths = more than one *successful* way through (the baseline error scenario is not a path). Interfaces = more than one surface exposes the behaviour (CLI / API / UI / hook). Data = behaviour differs by data type, shape or volume — usually a `Scenario Outline` with `Examples`. Rules = a business rule constrains the outcome — one scenario per rule, including breaking it.
- **Scenarios are tagged with Gherkin's native tag syntax** — a line beginning with `@` directly above `Scenario:` / `Scenario Outline:`. Untagged scenarios (happy path, error path) are legal under any flags. Unknown tags are ignored.
- **Task Breakdown follows the scenarios.** One sentence in each instructions block: rows implement the scenarios, and no row is written for an axis marked `F`. No marker syntax, no predicate — `## Task Breakdown` and `task-breakdown-complete` are untouched.
- **A new readiness predicate, `spidr-coverage`, enforces it** on the story, cr and bug gates, registered identically and reading `doc.body` only (the [[CR-111]] rule). Lead-in absent → pass with `not-applicable:` (migration grace). Lead-in present → fails on: a missing axis row; a Cover cell that is not exactly `T` or `F` (so an unedited template fails — [[BUG-054]]); an `F` row with an empty Reason; a `T` axis with no tagged scenario inside a ```` ```gherkin ```` fence; an `F` axis with any tagged scenario. Tags outside a gherkin fence are ignored.
- **The Granularity Rubric gains the split axes.** When a too-big signal trips, split along one axis: Paths → one story per path, happy path first; Interfaces → one story per interface, cheapest first; Data → simplest data subset first; Rules → ship with the rule relaxed, add it in the follow-up. The existing Spike line (`story.md:28`) stays as is.
- **Each Brief surfaces the table.** Story, CR and Bug POST-WRITE BRIEFs gain `- SPIDR ← <section> SPIDR coverage table`, so the human confirms the flags at Gate 1 — that is where an `F` gets challenged.
- **Error scenarios are named `Scenario: Error — …`.** Story, Bug and Epic skeletons become `Scenario: {Error — invalid action is rejected}`; the epic check becomes `body contains 'Scenario: Error'`.
- **QA reads the right section per type.** `qa.md:39,42` and `SKILL.md:340,438` say: the acceptance Gherkin — Story §2.1, CR §4, Bug §5 — or, for an item written before this CR, its numbered verification steps.

## 2. Blast Radius & Invalidation

- [ ] Invalidate/Update Story: none reverted. The 26 stories, 27 CRs and 41 bugs in `pending-sync/` carry no `**SPIDR coverage.**` lead-in and pass `spidr-coverage` as `not-applicable`; nothing gains a failure.
- [ ] Invalidate/Update Epic: none reverted. [[EPIC-052]] and [[EPIC-053]] keep passing `gherkin-error-path` (their error scenarios are already `Scenario: Error — …`, measured). The other 10 pending epics contain zero `Error` today and already fail it — no change.
- [ ] Database schema impacts? **No.**
- [ ] **CLI and gate-doc must ship together.** Registering `spidr-coverage` in `readiness-gates.md` before the running `cleargate` binary knows the shape makes `parsePredicate` throw `unsupported predicate shape` on every story, cr and bug gate check (`readiness-predicates.ts:146`). The global binary is a real 0.26.1 install, not linked. Land the live-tree registration only once the binary that evaluates it carries the predicate.
- [ ] **Fast lane gets rarer — intended.** Most items with any `T` axis carry two or more scenarios, and `architect.md:189` makes multi-scenario items standard-lane. All-`F` items keep fast-lane eligibility.
- [ ] **QA-Red input changes for CRs and Bugs.** New CRs/Bugs hand QA-Red a Gherkin block where they used to hand it numbered verification steps. Older items still have only the steps; the per-type pointer names both.
- [ ] **Hot files.** `story.md` is also touched by [[CR-119]] (§3.1 greenfield row). `readiness-gates.md` is also touched by [[BUG-058]] (vocabulary count), [[CR-112]] (heading-anchored predicates) and [[BUG-054]]. Whichever lands first, this CR re-measures line anchors and appends `spidr-coverage` as the next numbered vocabulary entry; the "exactly N predicate shapes" text follows the union size at merge time.
- [ ] **Count-pinning tests.** `test/docs/test-layers-declared-doctrine.red.node.test.ts:322-358` pins "exactly 11" and "12 closed-set". Both assertions move with this CR.

## Existing Surfaces

- **Surface:** `cleargate-planning/.cleargate/templates/story.md:140-153` — §2.1 Gherkin skeleton. Gains the SPIDR table and the error rename; Given/When/Then shape unchanged.
- **Surface:** `cleargate-planning/.cleargate/templates/story.md:19-32` — Granularity Rubric. Gains the split-axis lines; no signal removed.
- **Surface:** `cleargate-planning/.cleargate/templates/CR.md:122-134` — §4 Verification Protocol. Gains the table and a Gherkin skeleton beside the existing command and test-layer table.
- **Surface:** `cleargate-planning/.cleargate/templates/Bug.md:110-122` — §5 Verification Protocol. Same addition.
- **Surface:** `cleargate-cli/src/lib/readiness-predicates.ts:1271` — `evalTestLayersDeclared`: lead-in trigger, absent-passes, "an exclusion needs a reason", registered identically on story/cr/bug. `spidr-coverage` is a sibling with the same shape.
- **Surface:** `cleargate-planning/.cleargate/knowledge/readiness-gates.md:150` — epic `gherkin-error-path`; check string tightened, id unchanged.
- **Why this CR extends rather than rebuilds:** every mechanism already exists. Three templates gain a table next to a verification section they already have. The predicate copies a shipped evaluator. Gherkin tags are standard syntax, not a ClearGate invention. The Rubric gains the axis it was missing, not a new rubric.

## Prior work

- SPIDR framing, axis-tagged scenarios, SPIDR split axes: **none found** (`cleargate-wiki-query`, 2026-09-25; grep of `archive/` and `FLASHCARD.md` for `SPIDR` returns nothing).
- [[EPIC-054]] — shipped the spike charter the lead-in points to.
- [[CR-111]] — closest precedent: lead-in-triggered declaration, absent-passes, reasoned exclusions, identical story/cr/bug registration. Reused rather than re-argued.
- [[CR-112]] — heading-anchored predicates; `spidr-coverage` locates its table by lead-in and its scenarios by fence, never by `section(N)`.
- [[CR-109]] — moving machine fields out of frontmatter; supports the body-table choice.
- [[BUG-054]] — gate criteria that pass on a blank template; Verification item 1 guards against repeating it.
- [[BUG-058]] — Predicate Vocabulary miscount; sequencing noted in §2.
- [[CR-119]] — same template file (`story.md`); merge ordering noted in §2.
- [[BUG-059]], [[BUG-055]] — surfaced by the duplicate check; unaffected now that this CR touches neither Task Breakdown nor spikes.

## 3. Execution Sandbox

**Modify (meta-repo — canonical first, then copy to the live `.cleargate/` tree):**
- `cleargate-planning/.cleargate/templates/story.md` — §2.1 table + error rename; instructions block (axis meanings, Task Breakdown sentence, Rubric split axes, Brief line).
- `cleargate-planning/.cleargate/templates/CR.md` — §4 table + Gherkin skeleton; instructions block; Brief line.
- `cleargate-planning/.cleargate/templates/Bug.md` — §5 table + Gherkin skeleton; instructions block; Brief line.
- `cleargate-planning/.cleargate/templates/epic.md` — §5 skeleton gains `Scenario: {Error — …}`.
- `cleargate-planning/.cleargate/knowledge/readiness-gates.md` — vocabulary entry for `spidr-coverage`; register it in the story, cr and bug blocks; shape count; epic `gherkin-error-path` check string.
- `cleargate-planning/.claude/agents/qa.md` — lines 39, 42.
- `cleargate-planning/.claude/skills/sprint-execution/SKILL.md` — lines 340, 438.
- `.cleargate/templates/story.md`, `.cleargate/templates/CR.md`, `.cleargate/templates/Bug.md`, `.cleargate/templates/epic.md`, `.cleargate/knowledge/readiness-gates.md` — byte-identical copies of the canonical files.
- The live .claude/agents/qa.md and .claude/skills/sprint-execution/SKILL.md copies are gitignored
  and re-synced from canonical at the sprint boundary (hand-port or `cleargate init`); not part of
  this CR's parsed commit surface.

**Modify (`cleargate-cli` repo — branch in the main checkout, not a worktree):**
- `cleargate-cli/src/lib/readiness-predicates.ts` — `ParsedPredicate` member, parser branch, `evaluate()` case, `evalSpidrCoverage`, header count.
- `cleargate-cli/test/lib/readiness-predicates-spidr-coverage.red.node.test.ts` — new.
- `cleargate-cli/test/docs/test-layers-declared-doctrine.red.node.test.ts` — the two count assertions only.

**Do NOT modify:** `## Task Breakdown` or `task-breakdown-complete`, `hotfix.md`, `architect.md`'s fast-lane rule, `developer.md` (one test per scenario already covers tagged scenarios), `evalSection`, any gate block beyond the one `gherkin-error-path` string and the three `spidr-coverage` registrations, or any existing work item.

## Task Breakdown

- [ ] Re-measure every line anchor cited here against the tree at branch time; re-base on [[CR-119]] / [[BUG-058]] / [[CR-112]] if any has landed
- [ ] QA-Red: write `readiness-predicates-spidr-coverage.red.node.test.ts` covering Verification items 1-7, including all three unedited templates failing
- [ ] Add `spidr-coverage` to `readiness-predicates.ts` as a sibling of `evalTestLayersDeclared`; bump the header shape count
- [ ] Edit canonical `story.md`, `CR.md`, `Bug.md`: table + Gherkin skeleton (bold lead-ins, no `##` headings), instructions blocks, Brief lines; Rubric split axes in `story.md`
- [ ] Edit canonical `epic.md` §5 skeleton
- [ ] Edit canonical `readiness-gates.md`: vocabulary entry, story/cr/bug registration, count text, epic `gherkin-error-path` string
- [ ] Edit canonical `qa.md` and `SKILL.md`: per-type acceptance pointer
- [ ] Update the two count assertions in the doctrine test
- [ ] Run typecheck, the full cli suite, and `gate-section-index-pinning` (pass count must not change)
- [ ] Copy canonical templates + gates doc to the live `.cleargate/` tree once the evaluating binary carries the predicate; hand-port live `.claude/` qa.md + SKILL.md
- [ ] Run `cleargate gate check` on EPIC-052, EPIC-053 and one pending story, CR and bug each; confirm no new failures

## 4. Verification Protocol

**Command/Test:** `npm --prefix cleargate-cli run typecheck && npm --prefix cleargate-cli test`, then `cleargate gate check <file> -v` for item 8.

1. **Blank templates fail.** A story, CR and bug scaffolded from the new templates each fail `spidr-coverage`, because their Cover cells read `{T or F}`. Must fail against the new templates, not only hand-made fixtures.
2. **Grandfathered.** A body with no `**SPIDR coverage.**` lead-in passes with a `not-applicable:` detail.
3. **T needs a tag, F forbids one.** `Paths = T` with no `@paths` scenario fails, naming Paths. `Paths = F` with an `@paths` scenario fails. Same for Interfaces, Data, Rules.
4. **An exclusion needs a reason.** An `F` row with an empty Reason fails; a `T` row with an empty Reason passes.
5. **Fence-scoped tags.** `@paths` in prose outside a ```` ```gherkin ```` fence does not count toward coverage.
6. **Type-agnostic.** The same body gives the same result under the story, cr and bug gate blocks.
7. **Epic error path.** A body whose only `Error` is prose fails `gherkin-error-path`; `Scenario: Error — x` passes; the unedited `epic.md` fails.
8. **No regressions on live items.** `cleargate gate check` on [[EPIC-052]] and [[EPIC-053]] still passes `gherkin-error-path`; one pending story, CR and bug each show no new failing criterion.
9. **Evicted pointer is gone.** `grep -rn "against §4 acceptance\|story's §4 acceptance" cleargate-planning/ .claude/` returns nothing.
10. **No section renumbering.** `gate-section-index-pinning.node.test.ts` pass count is unchanged.
11. **Mirror parity.** `diff -q` between each canonical file and its live copy is silent.

**Test layers.** Declare all three below. `0` is a valid, explicit answer and must carry a reason in the Notes column; an absent row is not a decision.

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 9 | Items 1-7 against the exported `evaluate()`; item 1 once per template |
| Integration tests | 0 | Evaluates a markdown string — no Postgres, Redis, network or disk lookup involved |
| E2E / acceptance tests | 2 | `cleargate gate check` on a freshly scaffolded story (item 1) and on EPIC-052 (item 8) |

---

## Context Source

> Discovery audit. Populated from the approved Epic, verified codebase grounding, and recorded direct approval.

**context_source:** verified codebase grounding (template, gate-doc, predicate and agent-prompt line citations in §1 and Existing Surfaces; measured `Error` counts across the 12 pending epics; pending item counts 26 stories / 27 CRs / 41 bugs) + user request 2026-09-25 to adopt SPIDR, with the five §0.5 decisions recorded in chat the same day. CR approved by the human in chat, 2026-09-25.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity**

*Evaluate each criterion against its literal text. If you substituted an interpretation, leave the box unchecked and surface the substitution in the Brief.*

Requirements to pass to Green (Ready for Execution):
- [x] "Obsolete Logic" to be evicted is explicitly declared.
- [x] All impacted downstream Epics/Stories are identified and reverted to 🔴 High Ambiguity.
- [x] Execution Sandbox contains exact file paths.
- [x] Verification command is provided.
- [x] `approved: true` is set in the YAML frontmatter.
- [x] Existing Surfaces cites at least one source-tree path the CR extends.
