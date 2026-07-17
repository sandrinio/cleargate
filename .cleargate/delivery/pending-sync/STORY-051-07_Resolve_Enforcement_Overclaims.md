---
story_id: STORY-051-07
parent_epic_ref: EPIC-051
parent_cleargate_id: EPIC-051
sprint_cleargate_id: null
carry_over: false
status: Draft
approved: true
ambiguity: 🟢 Low
context_source: EPIC-051 decomposition (framework self-audit 2026-07-17) + verified codebase grounding + recorded direct approval
area: framework/enforcement
actor: ClearGate maintainer (readiness gates)
complexity_label: L3
parallel_eligible: y
expected_bounce_exposure: med
lane: standard
db_write_set: []
deferred_verification: []
created_at: 2026-07-17T00:00:00Z
updated_at: 2026-07-17T00:00:00Z
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
  last_gate_check: 2026-07-17T18:17:06Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
---

# STORY-051-07: Give the Duplicate Check & Ambiguity Gate Real Enforcement
**Complexity:** L3 — Add two body-persisted readiness predicates (prior-work evidence + Ambiguity-Gate 🟢 contradiction) with a `## Prior work` template section, wire them into the epic/story/cr/bug gates, and align the CLAUDE.md wording that overclaims these disciplines as already-enforced.

## 1. The Spec (The Contract)

### 1.1 User Story
As a ClearGate maintainer of the readiness gates, I want the duplicate-check and Ambiguity-Gate disciplines to be actually machine-checked (not honor-system prose the docs falsely call "auditable evidence" and "evaluated literally"), so that a promotion to 🟢 cannot claim reuse-audit or self-consistency that no script ever verifies.

### 1.2 Detailed Requirements
- **R1 — `prior-work-recorded` predicate.** Add a new closed-set predicate `prior-work-recorded` to `cleargate-cli/src/lib/readiness-predicates.ts` (union kind + exact-string parse branch + evaluator). Semantics: locate the `## Prior work` section by heading text; **section absent → pass** (migration grace for items authored before this story); **section present but no evidence token → FAIL**, naming the missing evidence; **section present with an evidence token → pass**. An evidence token is either a `[[WORK-ITEM-ID]]` wikilink or one of the sentinels `none found` / `no prior work` / `none`. The scaffolded template content (R3) is deliberately authored to contain **no** evidence token, so a freshly-authored item that the author never fills in FAILS this predicate — the teeth apply until real evidence or a sentinel is recorded.
- **R2 — `ambiguity-gate-resolved` predicate.** Add a new closed-set predicate `ambiguity-gate-resolved` to the same file. Semantics: locate the `## ClearGate Ambiguity Gate` section (heading title matched by **prefix** — the template heading carries a ` (🟢 / 🟡 / 🔴)` suffix that an exact-equality match would miss); **absent → pass**; **present and the `Current Status:` line contains 🟢 → require zero `- [ ]` unchecked checkboxes in that section, FAIL (naming the unchecked count) if any remain**; **status not 🟢 (🟡/🔴) → pass** (no self-contradiction to flag).
- **R3 — `## Prior work` template section.** Add a scaffolded `## Prior work` section to `epic.md`, `story.md`, `CR.md`, and `Bug.md` (canonical + live + payload) that instructs the author to record `[[IDs]]` of related prior work or an empty-result sentinel. Its scaffolded body MUST contain no live evidence token (no `[[UPPERCASE-ID]]` wikilink, no `none found` / `no prior work` / `none` sentinel) so an unfilled item fails `prior-work-recorded`. It MUST be placed after every section that an existing `section(N)` index gate depends on (after `## Existing Surfaces` for epic/story/CR; before `## Context Source` for Bug) so no `section(N)` predicate re-targets.
- **R4 — Wire predicates + document vocabulary.** Add `prior-work-recorded` and `ambiguity-gate-resolved` as enforcing criteria to the `epic` (ready-for-decomposition), `story` (ready-for-execution), `cr` (ready-to-apply), and `bug` (ready-for-fix) gate blocks in `readiness-gates.md` (canonical + live + payload), and register both shapes in the Predicate Vocabulary section, updating the "exactly 7 predicate shapes" count to 9.
- **R5 — Duplicate-check wording.** Rewrite only the "Duplicate check before drafting" paragraph in root `CLAUDE.md`, `cleargate-planning/CLAUDE.md`, and the payload mirror so it describes the now-real body-persisted machine check (`## Prior work` enforced by `prior-work-recorded`) instead of "a `Prior work:` line in the Brief — this is auditable evidence."
- **R6 — Ambiguity-Gate wording.** Rewrite only the "Ambiguity Gate criteria are evaluated literally" paragraph in the same three CLAUDE.md copies so it states that `ambiguity-gate-resolved` mechanically fails a 🟢 claim that still has unchecked boxes, backstopping the literal-evaluation instruction.
- **R7 — node:test coverage.** Add one `*.node.test.ts` under `cleargate-cli/test/lib/` exercising `parsePredicate` + `evaluate` for both new predicates across: section absent, present-with-evidence, present-without-evidence, 🟢-with-unchecked, 🟢-all-checked, and non-🟢-with-unchecked.

### 1.3 Out of Scope
- The mechanically-enforced pre-commit gates handled by STORY-051-01 (file-surface / test-ratchet) and STORY-051-03 (decomposition / lifecycle-init). This story touches only the two readiness-gate predicates.
- The broader dead-`execution_mode`/v1/v2 vocabulary sweep across docs/agents/scripts (STORY-051-05). This story edits **only** the duplicate-check and Ambiguity-Gate paragraphs of CLAUDE.md.
- Back-filling `## Prior work` into the existing `.cleargate/delivery/pending-sync/` corpus. The migration grace (R1: absent → pass) intentionally leaves legacy items passing; no corpus migration is performed here.
- Any change to the section-index quirks already present in the epic/cr gate blocks; this story preserves them, it does not correct them.

### 1.4 Open Questions

> The one policy decision this story depended on was resolved at gate review; recorded below as the Human decision. No new open question surfaced during drafting.

- **Question:** Duplicate check + Ambiguity Gate are documented as enforced ("auditable evidence" / "evaluated literally") but no script checks either. Add real body-persisted predicates, or downgrade the language to honest advisory?
- **Recommended:** Add real teeth — a `## Prior work` section + `prior-work-recorded` predicate, plus an `ambiguity-gate-resolved` unchecked-checkbox predicate — then align the CLAUDE.md wording to the now-real enforcement.
- **Human decision:** ADD REAL TEETH (Epic §6 Q4, resolved 2026-07-17). Build both predicates + the `## Prior work` template section, wire them into the epic/story/cr/bug gates, then align the CLAUDE.md duplicate-check and Ambiguity-Gate wording to describe the real machine checks. No downgrade.

### 1.5 Risks

> Risks specific to this Story (cross-story risks belong in the milestone plan).

- **Risk:** A required `## Prior work` section + a hard-fail predicate would fail every existing pending-sync item that lacks the section on its next gate check.
- **Mitigation:** `prior-work-recorded` passes when the section is entirely absent (migration grace); it only fails when the section is present-but-evidence-less. New items get the section by construction from the templates (R3), so the teeth apply to all newly-authored work while the legacy corpus stays green.
- **Risk:** Inserting a new `## ` heading shifts the 1-indexed `section(N)` predicates the existing gates depend on (`readiness-gates.md` epic `section(3)`/`section(5)`, story `section(3)`/`section(4)`, cr `section(2)`/`section(3)`, bug `section(2)`), silently re-targeting them.
- **Mitigation:** Place `## Prior work` strictly after the highest index-referenced section in each template (after `## Existing Surfaces` for epic/story/CR; before `## Context Source` for Bug). A test asserts the pre-existing index gates still resolve to their original sections after the template edit.
- **Risk:** A live token in the scaffolded `## Prior work` template body (a `[[UPPERCASE-ID]]` wikilink or a `none found` sentinel in the instruction/placeholder text) would make `prior-work-recorded` pass on unfilled items — a toothless gate.
- **Mitigation:** Author the scaffolded section content token-free (angle-bracket instruction, no uppercase wikilink, no sentinel phrase). Scenario 2 + the regression test assert an unfilled template-authored item FAILS the predicate.
- **Risk:** Shared-file collision — this story and STORY-051-05 both edit `CLAUDE.md` / `cleargate-planning/CLAUDE.md`.
- **Mitigation:** Scope this story's CLAUDE.md edits to exactly two paragraphs (duplicate-check, Ambiguity-Gate); land after the STORY-051-05 vocabulary sweep merges so the paragraph edits apply cleanly on top of the swept file rather than racing it.
- **Risk:** Dogfood drift — the runtime reads the **live** `.cleargate/knowledge/readiness-gates.md` (`gate.ts:186-187`), so a canonical-only edit would not take effect in this repo.
- **Mitigation:** Sync canonical → live → payload for every `readiness-gates.md` / template / CLAUDE.md edit; run `npm run prebuild` to regenerate the payload; §3.1 lists all three tiers as commit surface.

## 2. The Truth (Executable Tests)

### 2.1 Acceptance Criteria (Gherkin)

```gherkin
Feature: Real enforcement for the duplicate check and Ambiguity Gate

  Scenario: Recorded prior work and a consistent Green claim both pass
    Given a story whose "## Prior work" section cites "[[STORY-003-05]]"
    And whose Ambiguity Gate status line reads Green with every checkbox checked
    When "cleargate gate check" evaluates the story
    Then prior-work-recorded passes
    And ambiguity-gate-resolved passes
    And the gate exits zero

  Scenario: Prior-work section present but no evidence line fails the gate
    Given an epic whose "## Prior work" section contains only the token-free template placeholder with no wikilink and no "none found" sentinel
    When "cleargate gate check" evaluates the epic
    Then prior-work-recorded fails naming the missing evidence
    And the enforcing gate exits non-zero

  Scenario: A Green claim with unchecked boxes fails the gate
    Given a cr whose Ambiguity Gate status line reads Green
    And whose Ambiguity Gate block still has at least one "- [ ]" unchecked box
    When "cleargate gate check" evaluates the cr
    Then ambiguity-gate-resolved fails naming the unchecked count
    And the enforcing gate exits non-zero

  Scenario: Legacy item without the section and a non-Green claim both pass
    Given a bug authored before this story with no "## Prior work" section
    And whose Ambiguity Gate status line reads High with unchecked boxes
    When "cleargate gate check" evaluates the bug
    Then prior-work-recorded passes as migration grace
    And ambiguity-gate-resolved passes because the status is not Green
    And the gate does not exit non-zero on either new predicate

  Scenario: Template-authored item carries the section without shifting index gates
    Given a story authored from the updated story.md template
    When "cleargate gate check" evaluates it
    Then a "## Prior work" section is present
    And the pre-existing section(3) and section(4) predicates resolve to the Implementation Guide and Quality Gates sections unchanged
    And the Predicate Vocabulary documents nine shapes
```

### 2.2 Verification Steps (Manual)
- [ ] `cleargate gate check` on a hand-built epic with `## Prior work` containing `[[EPIC-051]]` reports `prior-work-recorded` pass; deleting the wikilink (leaving the heading) flips it to fail.
- [ ] `cleargate gate check` on a story whose Ambiguity block says `Current Status: 🟢` with one `- [ ]` box reports `ambiguity-gate-resolved` fail; checking the box flips it to pass.
- [ ] A pending-sync item with no `## Prior work` section still passes the gate (migration grace) — confirm on one real archive/pending item.
- [ ] A freshly template-authored item (untouched `## Prior work` scaffold) reports `prior-work-recorded` **fail** — confirms the scaffold carries no live evidence token.
- [ ] `grep -c "predicate shapes" readiness-gates.md` shows the count updated to 9 across canonical, live, and payload copies.
- [ ] `diff` canonical vs live vs payload for `readiness-gates.md` and each template shows byte-identical bodies after sync + `npm run prebuild`.
- [ ] The root `CLAUDE.md` and `cleargate-planning/CLAUDE.md` duplicate-check and Ambiguity-Gate paragraphs no longer contain "auditable evidence the check ran" as the sole assurance; they reference the predicates.

## 3. The Implementation Guide

### 3.1 Context & Files

| Item | Value |
|---|---|
| Primary File | `cleargate-cli/src/lib/readiness-predicates.ts` — add two closed-set predicate kinds, parse branches, and evaluators |
| Related File (gate spec, canonical) | `cleargate-planning/.cleargate/knowledge/readiness-gates.md` |
| Related File (gate spec, live) | `.cleargate/knowledge/readiness-gates.md` |
| Related File (gate spec, payload) | `cleargate-cli/templates/cleargate-planning/.cleargate/knowledge/readiness-gates.md` |
| Related File (template, canonical) | `cleargate-planning/.cleargate/templates/story.md` |
| Related File (template, canonical) | `cleargate-planning/.cleargate/templates/epic.md` |
| Related File (template, canonical) | `cleargate-planning/.cleargate/templates/CR.md` |
| Related File (template, canonical) | `cleargate-planning/.cleargate/templates/Bug.md` |
| Related File (template, live) | `.cleargate/templates/story.md` |
| Related File (template, live) | `.cleargate/templates/epic.md` |
| Related File (template, live) | `.cleargate/templates/CR.md` |
| Related File (template, live) | `.cleargate/templates/Bug.md` |
| Related File (template, payload) | `cleargate-cli/templates/cleargate-planning/.cleargate/templates/story.md` |
| Related File (template, payload) | `cleargate-cli/templates/cleargate-planning/.cleargate/templates/epic.md` |
| Related File (template, payload) | `cleargate-cli/templates/cleargate-planning/.cleargate/templates/CR.md` |
| Related File (template, payload) | `cleargate-cli/templates/cleargate-planning/.cleargate/templates/Bug.md` |
| Related File (CLAUDE, root/live) | `CLAUDE.md` — duplicate-check + Ambiguity-Gate paragraphs only |
| Related File (CLAUDE, canonical) | `cleargate-planning/CLAUDE.md` — same two paragraphs |
| Related File (CLAUDE, payload) | `cleargate-cli/templates/cleargate-planning/CLAUDE.md` — regenerated by `npm run prebuild` |
| New File Needed | Yes — `cleargate-cli/test/lib/readiness-predicates-prior-work-ambiguity.node.test.ts` |

### 3.2 Technical Logic

**Predicate additions (`readiness-predicates.ts`).** The file already carries a closed-set, no-parameter predicate family — `existing-surfaces-verified` — modeled end to end: union member (`readiness-predicates.ts:20`), exact-string parse branch (`:117-119`), `evaluate` switch arm (`:164-166`), and a heading-anchored section-locator evaluator (`evalExistingSurfacesVerified`, `:776-859`). Clone that shape twice.

1. Extend the `ParsedPredicate` union (`:12-20`) with `| { kind: 'prior-work-recorded' }` and `| { kind: 'ambiguity-gate-resolved' }`.
2. In `parsePredicate`, after the `existing-surfaces-verified` branch (`:117`), add two exact-string branches: `if (s === 'prior-work-recorded') return { kind: 'prior-work-recorded' };` and the same for `ambiguity-gate-resolved`.
3. In `evaluate` (`:149-166`), add two `case` arms delegating to `evalPriorWorkRecorded(doc)` and `evalAmbiguityGateResolved(doc)`.
4. `evalPriorWorkRecorded(doc)`: split the body on `^(?=## )` and select the part whose first line's `headingTitleOf(...)` (`:359-367`) equals `Prior work` — the same locator `evalExistingSurfacesVerified` uses (`:785-795`); `## Prior work` has no parenthetical suffix, so exact-equality is correct here. If no such section → `{ pass: true, detail: 'not-applicable: ## Prior work section absent (pre-EPIC-051 migration grace)' }`. If present, test the section text for an evidence token: a `\[\[[A-Z0-9-]+\]\]` wikilink OR a case-insensitive sentinel (`none found` / `no prior work` / a standalone `none`). Present with a token → pass; present without → `{ pass: false, detail: '## Prior work has no [[ID]] wikilink or "none found" sentinel' }`.
5. `evalAmbiguityGateResolved(doc)`: locate the section whose heading title **begins with** `ClearGate Ambiguity Gate` — the template heading is `## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)`, so `headingTitleOf` returns `ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)` (it strips `#` runs and numeric prefixes but not a parenthetical suffix); match with `startsWith('ClearGate Ambiguity Gate')`, **not** `===`, or the locator never fires. Absent → pass. Present → read the `Current Status:` line; if it contains the 🟢 emoji, count `- [ ]` unchecked boxes with the exact `/^\s*- \[ \]/gim` pattern already used in `evalSection` (`:564-565`). Any unchecked → `{ pass: false, detail: 'Ambiguity Gate claims 🟢 but N unchecked checkbox(es) remain' }`; zero unchecked → pass. Status without 🟢 → `{ pass: true, detail: 'status not 🟢 — no self-contradiction' }`.

Both evaluators are pure string work over `doc.body`; they inherit the sandbox-free, read-only guarantees of the closed-set family (no FS, no shell, no network).

**Gate wiring (`readiness-gates.md`).** Add two criteria to each of the four enforcing blocks — epic ready-for-decomposition (`:67-94`), story ready-for-execution (`:115-138`), cr ready-to-apply (`:140-157`), bug ready-for-fix (`:159-172`):

```yaml
    - id: prior-work-recorded
      check: "prior-work-recorded"
    - id: ambiguity-gate-resolved
      check: "ambiguity-gate-resolved"
```

Then, in the Predicate Vocabulary header (`:9`), change "exactly **7 predicate shapes**" to "exactly **9 predicate shapes**" and append two shape entries (8 and 9) documenting the closed-set semantics, mirroring entry 7's `existing-surfaces-verified` description (`:35-36`). The loader (`gate.ts:74-98`) reads every fenced ```yaml block and the evaluate loop (`gate.ts:224-232`) already tolerates arbitrary criterion IDs, so no CLI code changes beyond the predicate library.

**Template section (R3).** In `epic.md`, `story.md`, `CR.md`, insert after the `## Existing Surfaces` section. The scaffolded content is deliberately **token-free** — it contains no `[[UPPERCASE-ID]]` wikilink and none of the `none found` / `no prior work` / `none` sentinels — so an unfilled item fails `prior-work-recorded`:

```markdown
## Prior work

> Duplicate-check evidence, enforced by the `prior-work-recorded` readiness predicate.
> Paste the `cleargate-wiki-query` result here: link each related item as a wiki-style
> reference, or replace the line below with an explicit empty-result sentinel.
> Accepted sentinels are listed in readiness-gates.md (Predicate Vocabulary entry 8).

- <replace with related-work wikilinks, or an explicit empty-result sentinel>
```

For `Bug.md` (no `## Existing Surfaces`), insert the same section immediately before `## Context Source`. This keeps every `section(N)` index gate pointed at its original section — verified in the test (Scenario 5). Because the scaffold body carries no evidence token, a template-authored item that is never filled fails the predicate (Scenario 2), which is the intended teeth.

**CLAUDE.md wording (R5/R6).** Root `CLAUDE.md:148` and `cleargate-planning/CLAUDE.md:26` — replace the "…on a `Prior work:` line in the Brief — this is auditable evidence the check ran." clause with language stating the result is persisted as the work item's `## Prior work` body section and enforced by the `prior-work-recorded` gate predicate (the Brief still surfaces it for the human). Root `CLAUDE.md:154` and `cleargate-planning/CLAUDE.md:30` — append to the "evaluated literally" paragraph that the `ambiguity-gate-resolved` predicate mechanically rejects a 🟢 claim left with unchecked boxes. Touch no other paragraph. Run `npm run prebuild` to regenerate the payload `CLAUDE.md`; hand-sync live `readiness-gates.md` + templates.

**Exit codes.** No new codes. Enforcing gates already exit non-zero on any failing criterion (`gate.ts:307-309`); the two new criteria simply add failure conditions.

### 3.3 API Contract (if applicable)

| Command | Trigger | Exit 0 | Exit 1 |
|---|---|---|---|
| `cleargate gate check <epic\|story\|cr\|bug>` | enforcing gate for the detected type | all criteria pass, incl. `prior-work-recorded` + `ambiguity-gate-resolved` | any criterion fails (e.g. `## Prior work` present without evidence, or 🟢 claimed with unchecked boxes) |

## 4. Quality Gates

### 4.1 Minimum Test Expectations

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests (parse) | 2 | `parsePredicate('prior-work-recorded')` and `parsePredicate('ambiguity-gate-resolved')` return the new kinds — node:test |
| Unit tests (evaluate) | 6 | prior-work: absent→pass, present+evidence→pass, present-no-evidence→fail; ambiguity: 🟢+unchecked→fail, 🟢+all-checked→pass, non-🟢+unchecked→pass |
| Regression test (index safety) | 1 | a template-authored story still resolves `section(3)`/`section(4)` to Implementation Guide / Quality Gates after `## Prior work` insertion |
| Acceptance mapping | 5 | one assertion cluster per §2.1 scenario — node:test only, `*.node.test.ts`, no vitest |

### 4.2 Definition of Done (The Gate)
- [ ] `prior-work-recorded` and `ambiguity-gate-resolved` added to the union, parser, `evaluate` switch, and two evaluators in `readiness-predicates.ts` (ambiguity locator uses `startsWith`, not `===`).
- [ ] Both criteria wired into the epic/story/cr/bug enforcing blocks in `readiness-gates.md`; vocabulary count updated 7 → 9 with two documented shape entries.
- [ ] `## Prior work` section added to all four templates with token-free scaffold content, without shifting any `section(N)` index gate (regression test green).
- [ ] Duplicate-check + Ambiguity-Gate paragraphs updated in root `CLAUDE.md` and `cleargate-planning/CLAUDE.md`; no other paragraph touched.
- [ ] Minimum test expectations (§4.1) met; all five §2.1 Gherkin scenarios covered by `node:test` (`tsx --test`, `*.node.test.ts`); no vitest.
- [ ] Canonical → live → payload synced for `readiness-gates.md` + all four templates; `npm run prebuild` regenerated the payload `CLAUDE.md`; `diff` shows the three tiers byte-identical.
- [ ] `cleargate-cli` typecheck clean + `npm test` green.

## Existing Surfaces

> L1 reuse audit. Cite real file:line paths (with a '/').

- **Surface:** `cleargate-cli/src/lib/readiness-predicates.ts:776` — `evalExistingSurfacesVerified`, a closed-set, heading-anchored section-locator evaluator with sentinel-phrase handling. The exact pattern both new evaluators clone (locate via `headingTitleOf`, pass-when-absent, scan section text).
  - **Coverage of this requirement:** partial — supplies the locator/sentinel scaffolding but not the prior-work evidence-token logic, the 🟢-conditional, or the unchecked-box count; those are net-new logic inside the same pattern.
- **Surface:** `cleargate-cli/src/lib/readiness-predicates.ts:564` — `evalSection` unchecked-checkbox counter (`/^\s*- \[ \]/gim`, at `:565`). Reused verbatim by `evalAmbiguityGateResolved`.
  - **Coverage of this requirement:** ≥80% for the box-counting sub-problem; the wrapping 🟢-status conditional is new.
- **Surface:** `cleargate-cli/src/lib/readiness-predicates.ts:359` — `headingTitleOf`, number/level-tolerant heading matcher (strips `#` runs + numeric prefixes, keeps parenthetical suffixes). Reused by both new locators — exact-match for `Prior work`, prefix-match for `ClearGate Ambiguity Gate`.
  - **Coverage of this requirement:** ≥80% for heading anchoring.
- **Surface:** `cleargate-planning/.cleargate/knowledge/readiness-gates.md:35` — the `reuse-audit-recorded` + `existing-surfaces-verified` two-tier precedent (heading-presence check paired with a content-verifier). The design template the prior-work pair follows.
  - **Coverage of this requirement:** partial — precedent for wiring and severity, not the predicates themselves.
- **Surface:** `cleargate-cli/src/commands/gate.ts:224` — the evaluate loop that runs every criterion and exits non-zero on failure (`:307-309`). Consumes the new criteria unchanged.
  - **Coverage of this requirement:** ≥80% — no CLI change needed; the library carries the new behavior.

## Why not simpler?

- **Smallest existing surface that could carry this:** `section(N) has 0 unchecked-checkbox` (`readiness-predicates.ts:561-565`) for the Ambiguity Gate, and `body contains '## Prior work'` (heading-anchored `body-contains`) for the duplicate check — both already-shipped predicate shapes, no new code.
- **Why isn't extension / parameterization / config sufficient?** The `section(N)` index is position-brittle: the Ambiguity Gate is the last section and its ordinal differs across item types, and any future template edit would silently re-point the check — exactly the drift class this epic exists to kill. It also cannot express the required "only fail when 🟢 is *claimed*" conditional. A bare `body contains '## Prior work'` verifies only that a heading exists, not that a real evidence line was recorded, and — with no absent-section grace — would hard-fail the entire pre-epic corpus on next check, violating the backward-compatibility constraint. Heading-anchored closed-set predicates carry the conditional, the evidence-token test, and the migration grace that neither existing shape can. They are net-new *entries* in the existing closed-set family, not a net-new abstraction.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low — approved at Gate 1 (2026-07-17)**

*Evaluate each criterion against its literal text.*

Requirements to pass to Green (Ready for Execution):
- [x] Gherkin scenarios completely cover all detailed requirements in §1.2.
- [x] Implementation Guide (§3) maps to specific, verified file paths from the approved Epic and verified codebase grounding.
- [x] No "TBDs" exist anywhere in the specification or technical logic.
- [x] Existing Surfaces cites at least one source-tree path or explicitly states "none — net-new."
- [x] Why not simpler? has both sub-bullets answered (no "TBD" / no "{}").