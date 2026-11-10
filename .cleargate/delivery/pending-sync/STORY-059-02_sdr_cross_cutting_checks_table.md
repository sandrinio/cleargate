---
story_id: STORY-059-02
parent_epic_ref: EPIC-059
parent_cleargate_id: EPIC-059
sprint_cleargate_id: SPRINT-42
carry_over: false
status: Draft
approved: true
approved_by: sandrinio
approved_at: 2026-10-08T00:00:00Z
ambiguity: 🟢 Low
context_source: EPIC-059 Rule 2, from Kurnera CR-002 Rule 2 (owner-approved 2026-10-04). Grounded 2026-10-04 against Sprint Plan Template §2 (:91-121), architect.md §Sprint Design Review (:88-110), architect-reader.md digest (:16-41), architect-synth.md (:19-40, :189-191).
actor: Architect (Sprint Design Review)
complexity_label: L2
parallel_eligible: n
expected_bounce_exposure: med
lane: standard
area: sprint-planning,agent-prompts,templates
db_write_set: []
deferred_verification: []
created_at: 2026-10-04T00:00:00Z
updated_at: 2026-10-08T00:00:00Z
created_at_version: cleargate@0.26.1
updated_at_version: cleargate@0.26.1
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-10-08T13:22:50Z
  transition: ready-for-execution
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id STORY-059-02
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-10-03T23:22:45Z
  sessions: []
---

# STORY-059-02: The SDR Answers Five Cross-Cutting Checks
**Complexity:** L2 — one template table, one optional digest field, one synth fill rule, one §A.4 phrase; canonical + live.

## 1. The Spec (The Contract)

### 1.1 User Story
As the Architect running the Sprint Design Review, I want a short table of five concerns no single story tends to own, each answered with its owning story or "not needed", so that test data, the walkthrough build, app-level behaviour, off-surface dependencies and list limits are decided at planning instead of discovered mid-sprint.

### 1.2 Detailed Requirements
1. **Template.** Add `### 2.6 Cross-cutting checks` to `Sprint Plan Template.md` after §2.5, as a three-column table (`Check | Owner | Note`) with these five rows:
   1. **Test data:** what the tests create, and how it is removed.
   2. **Walkthrough:** which build, origin/port and data the owner will look at.
   3. **App-level behaviour:** behaviour no single page or command owns (errors outside a page, page titles, focus; for a CLI, top-level error handling and exit codes).
   4. **Surfaces:** stories whose acceptance depends on a file outside their own §3.1.
   5. **Limits:** every list or search with a limit has a scenario saying which items appear at the limit, with test data that tells them apart.

   Each `Owner` cell holds the owning story ID(s), `not needed — <reason>`, or `UNOWNED — <story IDs and the gap>`. No cell is left blank.
2. **Reader digest.** Add an optional `cross_cutting` field to the digest shape in `architect-reader.md`:
   `{"test_data": "none" | "creates-and-cleans" | "creates-only", "app_level": [<concern>], "off_surface_dependencies": [<path>], "limits": [{"what": <list or search>, "at_limit_scenario": true | false}]}`.
   The default when the story says nothing is `test_data: "none"` with empty lists. The reader takes these facts from the story's own §1.2, §2.1 and §3.1 only.
3. **Synth / single Architect.** `architect-synth.md` (N > 2) and `architect.md` §Sprint Design Review (N ≤ 2) fill §2.6:
   - Rows 1, 3, 4 and 5 come from the digests. Any `creates-only`, any non-empty `off_surface_dependencies`, or any limit with `at_limit_scenario: false` makes that row `UNOWNED` and names the stories.
   - Row 2 is copied from the sprint plan's own §2.6 Walkthrough row if the author filled it. If not, it is `UNOWNED — walkthrough build not declared`.
   - A digest without `cross_cutting` counts as `not reported by <story>`. It is not treated as "none".
   - `architect.md`'s canonical SDR structure list becomes §§2.1–2.6.
4. **Halt.** The SKILL.md §A.4 dispatch instructions name §§2.1–2.6. The plan-confirmation halt lists every `UNOWNED` row as an owner question, in the same numbered batch as STORY-059-01's reviewer findings.

### 1.3 Out of Scope
- A readiness predicate that blocks a plan with `UNOWNED` rows (advisory only, per EPIC-059 §2).
- Any change to `waves.json`, contract formation or the collision predicate.
- Rewriting existing sprint plans to add §2.6.

### 1.4 Open Questions

- **Question:** Should row 2 (walkthrough) also be derived from stories?
- **Recommended:** No. The walkthrough build is a sprint-level fact, not a story's. The plan author fills it at drafting and the synth only flags it when it is empty. STORY-059-04's Phase D rule then uses that row.
- **Human decision:** Accepted 2026-10-08 (owner): no. The plan author fills the walkthrough row at drafting; the synth only flags it when empty.

### 1.5 Risks

- **Risk:** `cleargate-cli/test/docs/contract-first-dag-text.red.node.test.ts` and similar tests pin digest and SDR text, and could break on the new field.
- **Mitigation:** Add the field as optional, using the same "optional field, default" sentence pattern as `unreachable_surface` and `exports_*`. Run the pinned files with the §Test Stack single-file runner before committing.
- **Risk:** The Sprint Plan template's filename contains spaces. The §3.1 parser and the gate's path verifier both split on whitespace, so the template (canonical and live) cannot be declared in the §3.1 table and the pre-commit surface gate will treat it as off-surface.
- **Mitigation:** The SDR records this as a declared off-surface pair for this story: the canonical and live `Sprint Plan Template.md`. The commit that touches them cites this risk. The underlying parser gap belongs with [[BUG-052]]'s surface-tooling family, and it is filed only if it blocks.
- **Risk:** It edits SKILL.md §A.4, which STORY-059-01 also edits.
- **Mitigation:** Merge after STORY-059-01 (`parallel_eligible: n`).

## 2. The Truth (Executable Tests)

### 2.1 Acceptance Criteria (Gherkin)

**SPIDR coverage.**

| Axis | Cover | Reason |
|---|---|---|
| Paths | T | Owned, not-needed, UNOWNED and not-reported outcomes. |
| Interfaces | T | Both SDR producers: architect-synth (N > 2) and single Architect (N ≤ 2). |
| Data | T | Digest field values drive the row outcome. |
| Rules | T | No blank Owner cell. |

```gherkin
Feature: The SDR answers five cross-cutting checks

  Scenario: The template carries the table
    Given the canonical Sprint Plan template
    When §2 is read
    Then a "2.6 Cross-cutting checks" table follows §2.5
    And it has exactly the rows Test data, Walkthrough, App-level behaviour, Surfaces, Limits

  @data
  Scenario: The reader digest reports cross-cutting facts
    Given cleargate-cli/scaffold/hosts/claude/.claude/agents/architect-reader.md
    When the digest shape is read
    Then it declares an optional cross_cutting field with test_data, app_level, off_surface_dependencies and limits
    And it states the default when the story says nothing

  @paths @interfaces
  Scenario: Both SDR producers mark gaps UNOWNED
    Given architect-synth.md and architect.md §Sprint Design Review
    When the §2.6 fill rule is read
    Then creates-only test data, a non-empty off_surface_dependencies, or a limit without an at-limit scenario yields UNOWNED naming the stories
    And a digest without cross_cutting yields "not reported by <story>"
    And architect.md lists the SDR structure as §§2.1–2.6

  @rules
  Scenario: No Owner cell is blank and gaps reach the owner
    Given the §2.6 fill rule and SKILL.md §A.4
    When the halt instruction is read
    Then every row is answered with a story ID, "not needed — <reason>", or UNOWNED
    And every UNOWNED row is listed as an owner question in the plan-confirmation halt

  Scenario: Canonical and live agree
    Given the five canonical files this story edits
    When each is compared with its live mirror
    Then the changed sections match byte-for-byte
```

### 2.2 Verification Steps (Manual)
- [ ] Run the SDR for the sprint after SPRINT-42 and confirm §2.6 is present with all five rows answered.

## 3. The Implementation Guide

### 3.1 Context & Files

| Item | Value |
|---|---|
| Primary File | `cleargate-cli/scaffold/hosts/claude/.claude/agents/architect-synth.md` |
| Related Files | `cleargate-cli/scaffold/hosts/claude/.claude/agents/architect-reader.md`, `cleargate-cli/scaffold/hosts/claude/.claude/agents/architect.md`, `cleargate-cli/scaffold/hosts/claude/.claude/skills/sprint-execution/SKILL.md`, `.claude/agents/architect-synth.md`, `.claude/agents/architect-reader.md`, `.claude/agents/architect.md`, `.claude/skills/sprint-execution/SKILL.md` |
| New Files Needed | Yes — `cleargate-cli/test/scaffold/sdr-cross-cutting-checks.node.test.ts` |

### 3.2 Technical Logic
- **Template:** insert §2.6 after `### 2.5 ADR-Conflict Flags` (`Sprint Plan Template.md:119`) with the five rows and an Owner placeholder that names the three accepted answer forms (story ID, `not needed — <reason>`, `UNOWNED — <gap>`).
- **Reader:** add `cross_cutting` to the pinned digest block (`architect-reader.md:16-29`), plus one `Field sources` bullet saying where each key comes from.
- **Synth:** add `cross_cutting` to its validated-input shape (`architect-synth.md:19-31`) as optional, and add a `## Cross-cutting checks (§2.6)` section with the fill rule.
- **architect.md:** add item 6 to §Sprint Design Review (`:88-104`) and change "§§2.1–2.5" to "§§2.1–2.6" at `:108` and `:110`.
- **SKILL.md §A.4:** change "§§2.1–2.4"/"§§2.1–2.5" to "§§2.1–2.6" in both dispatch texts, and extend the halt sentence so `UNOWNED` rows join the owner-question list.

## 4. Quality Gates

### 4.1 Minimum Test Expectations

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 5 | One per §2.1 scenario, text assertions on canonical + live. |
| Integration tests | 0 | Prompt and template text only; there is no runtime surface. |
| E2E / acceptance tests | 0 | The next SDR's §2.6 is the acceptance check, recorded in that sprint's report. |

### 4.2 Definition of Done (The Gate)
- [ ] Minimum test expectations (§4.1) met.
- [ ] All Gherkin scenarios from §2.1 covered.
- [ ] Pinned SDR/digest text tests still pass.
- [ ] Peer/Architect Review passed.

## Existing Surfaces

- **Surface:** `cleargate-cli/scaffold/hosts/claude/.claude/agents/architect-reader.md:16` — pinned digest shape; optional-field precedent (`unreachable_surface`, `exports_*`).
- **Surface:** `cleargate-cli/scaffold/hosts/claude/.claude/agents/architect-synth.md:19` — validated-input digest shape and SDR emission.
- **Surface:** `cleargate-cli/scaffold/hosts/claude/.claude/agents/architect.md:88` — canonical §2.1–2.5 SDR definition.
- **Surface:** the canonical Sprint Plan template, §2 Execution Strategy at line 91 — named in prose because its filename contains spaces, which the surface verifier splits on.
- **Coverage of this requirement:** ≥80% — extends the existing SDR output and digest by one section and one optional field.

## Prior work

- [[CR-090]] — reader/synth SDR wiring this extends.
- [[CR-124]] — added the optional `exports_*` digest fields; same extension pattern.
- [[BUG-046]] — added optional `unreachable_surface`; same pattern.

## Why not simpler?

- **Smallest existing surface that could carry this:** a static table in the template that the plan author fills by hand.
- **Why isn't extension / parameterization / config sufficient?** A hand-filled table is what Kurnera's planning skill does, and it relies on the author remembering to look. Upstream, the readers already read every story. Adding one optional digest field lets the synth answer four of the five rows mechanically and flag gaps no one would otherwise notice. That is the smallest change that makes the table more than decoration.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity**

*Evaluate each criterion against its literal text. If you substituted an interpretation, leave the box unchecked and surface the substitution in the Brief.*

Requirements to pass to Green (Ready for Execution):
- [x] Gherkin scenarios completely cover all detailed requirements in §1.2.
- [x] Implementation Guide (§3) maps to specific, verified file paths from the approved Epic and verified codebase grounding.
- [x] No "TBDs" exist anywhere in the specification or technical logic.
- [x] Existing Surfaces cites at least one source-tree path or explicitly states "none — net-new."
- [x] Why not simpler? has both sub-bullets answered (no "TBD" / no "{}").
