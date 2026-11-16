---
story_id: STORY-065-06
parent_epic_ref: EPIC-065
parent_cleargate_id: null
sprint_cleargate_id: null
carry_over: false
status: Ready
approved: true
approved_by: sandrinio
approved_at: 2026-11-16T09:00:00Z
ambiguity: 🟢 Low
context_source: EPIC-065 (approved 2026-11-16) §2 scope and §6 answers; surfaces re-mapped at cleargate-cli 99cbfd7 on 2026-11-16 after SPRINT-46; SPRINT-46 intake items folded in are named in Prior work
actor: Owner closing a sprint; the Reporter
complexity_label: L3
area: sprint-execution,scripts,agent-prompts,templates
parallel_eligible: y
expected_bounce_exposure: med
lane: standard
db_write_set: []
deferred_verification: []
created_at: 2026-11-16T07:39:06.618Z
updated_at: 2026-11-16T07:39:06.618Z
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
  last_gate_check: 2026-11-16T07:48:10Z
  transition: ready-for-execution
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
last_contradict_sha: "35c90892292056555a9b4497f22fe84333d38c8d6d898a7f8fef686a2dcbcd72"
---

# STORY-065-06: Close and Report Show Proof
**Complexity:** L3 — close's deferred-verification step becomes the evidence step for every item, Sprint Review items close only with the owner's ack, and the report gains a proof table and a recorded goal verdict, in both hosts.

## 1. The Spec (The Contract)

### 1.1 User Story
As the owner closing a sprint, I want close and the report to show, per item and for the goal, the tier promised and the evidence produced, or "built, not proven at tier X", so that I accept any gap knowingly and the record keeps it.

### 1.2 Detailed Requirements
- **R1 — Evidence step.** `close_sprint.mjs` Step 2.9 (`:1172-1388`) becomes "Step 2.9: evidence". For every item in `state.json` except Parking Lot, it reads `<sprintDir>/evidence/<ID>.json` and prints `<ID>: proven at <tier> (evidence/<ID>.json)` or `<ID> built, not proven at tier <tier> (<missing|pending|fail>)`. For one release it also accepts a green `deferred-verify/<ID>.json` for an item that declares `deferred_verification` (CR-082), and says so in the line.
- **R1a — Untiered and legacy items (Gate 2, decision 6).** An item with no `proof_tier` is never listed as unproven (it is Done at merge, STORY-065-03 R1a). An item that declares `deferred_verification` and has no green `deferred-verify/` result keeps CR-082's Step 2.9 failure output for this release (`close-sprint-fence.red` pins it). 06 reads evidence only through `lib/proof.mjs` (contract C1).
- **R2 — Sprint Review closes only with the ack.** Step 2 (`:488-504`) accepts an item in `Sprint Review` (the others must still be terminal). The no-flag pass prints the unproven list in the ack prompt (`Unproven: N — <IDs>; they are recorded as built, not proven`) and halts as today. The ack pass writes `<sprintDir>/unproven.json` (`[{id, tier, reason}]`) and leaves those items in `Sprint Review`.
- **R3 — Unproven items stay open.** On the ack pass, each unproven item's work-item file gets `carry_over: true` and `proof_pending: <tier>`, so the lifecycle step leaves it open and a later sprint can prove it without rebuilding it.
- **R4 — Reporter bundle.** `prep_reporter_context.mjs` adds an `## Evidence` section: one row per item (id, declared tier, status, evidence path, recorded_by, sha), plus the goal's tier from `sprint-context.md`.
- **R5 — Report.** `templates/sprint_report.md` frontmatter gains `goal_verdict: ""` (`met | partial | missed`) and `goal_verdict_basis: ""`, and §1 gains a "Proof" table (Item | Tier | Evidence | Result — `proven` or `not reached at tier X`). `reporter.md` and `reporter.toml` fill both from the bundle; OD-4 becomes "the verdict is spoken first in the close Brief and recorded in the report's frontmatter; never a body section". SKILL §E.2 (both hosts) says the same.
- **R6 — Verdict check.** Step 2.5 fails a report whose `goal_verdict` is present and not one of the three values; a report without the key (written before this release) passes. After the ack pass, close adds `goal_verdict_acked_at: <ISO>` to the report frontmatter.

### 1.3 Out of Scope
- Writing evidence (STORY-065-02), the Done guard (065-03), walkthrough proof (065-04).
- The session brief and wiki reading `goal_verdict` (STORY-063-11 already falls back when it is absent).
- Retiring `deferred-verify/` reading; that is the release after this one.

### 1.4 Open Questions

- **Question:** What happens to an unproven item's work item at close: stay open for a later proof (R3), or close as Completed with the gap only in the report?
- **Recommended:** Stay open (`carry_over: true`, `proof_pending: <tier>`). Completed means Done, and Done now means proven; closing it would make the record say the opposite of the evidence.
- **Human decision:** As recommended (owner, 2026-11-16: "approve as recommended").
- **Question:** CR-129 asked for `goal_verdict_acked_by` (who acked). Record a name, or only the time?
- **Recommended:** Only the time (`goal_verdict_acked_at`). The ack is always the owner's, and a name in a pushed report is personal data the record does not need.
- **Human decision:** As recommended (owner, 2026-11-16: "approve as recommended").

### 1.5 Risks

- **Risk:** Step 2's terminal check is relied on elsewhere in close (lifecycle, rollup, archive) and a Sprint Review item breaks a later step.
- **Mitigation:** R3 marks those items `carry_over`, which the lifecycle and rollup steps already skip; an integration test closes a fixture sprint with one unproven item end to end.
- **Risk:** The proof table pushes the report past Step 2.5's body checks.
- **Mitigation:** The table sits in §1 and adds no row the §3/§5 regexes (`:451`, `:468`) read; the Step 2.5 test runs on the new template.

## 2. The Truth (Executable Tests)

### 2.1 Acceptance Criteria (Gherkin)

**SPIDR coverage.**

| Axis | Cover | Reason |
|---|---|---|
| Paths | T | All proven; some unproven and acked. |
| Interfaces | T | Close output, the Reporter bundle and both Reporter roles. |
| Data | T | Evidence files and legacy deferred-verify files. |
| Rules | T | Verdict enum; unproven items stay open. |

```gherkin
Feature: Close and report show proof

  @paths
  Scenario: Every item proven
    Given STORY-A and STORY-B are Done with passing evidence at their declared tiers
    When close_sprint.mjs runs
    Then Step 2.9 prints "STORY-A: proven at container" and "STORY-B: proven at unit" and passes

  @paths @rules
  Scenario: An unproven item is listed, acked and kept open
    Given STORY-D is in "Sprint Review" with proof_tier "live" and pending evidence
    When close_sprint.mjs runs without flags
    Then it prints "STORY-D built, not proven at tier live (pending)" and the ack prompt names STORY-D
    When the owner authorises the close and the ack pass runs
    Then unproven.json lists STORY-D, STORY-D stays in "Sprint Review"
    And STORY-D's work item has carry_over true and proof_pending "live"

  @data
  Scenario: A legacy deferred-verify result still counts for one release
    Given STORY-L declares deferred_verification and deferred-verify/STORY-L.json is green, with no evidence file
    When close_sprint.mjs runs
    Then Step 2.9 prints "STORY-L: proven (deferred-verify, CR-082)"

  @interfaces
  Scenario: The bundle and the report carry proof and the verdict
    Given a sprint whose items have evidence files
    When prep_reporter_context.mjs builds the bundle
    Then it has an "## Evidence" section with one row per item and the goal's tier
    And sprint_report.md has goal_verdict and goal_verdict_basis keys and a Proof table in §1
    And reporter.md, reporter.toml and both skills' §E.2 say the verdict is spoken in the Brief and recorded in the frontmatter

  @rules
  Scenario Outline: Close checks the recorded verdict
    Given the report's frontmatter has <verdict>
    When close_sprint.mjs reaches Step 2.5
    Then it <outcome>

    Examples:
      | verdict                  | outcome                          |
      | goal_verdict "met"       | passes                           |
      | goal_verdict "mostly"    | fails naming goal_verdict        |
      | no goal_verdict key      | passes (report predates this)    |
```

### 2.2 Verification Steps (Manual)
- [ ] After the ack pass on the fixture sprint, the report frontmatter carries `goal_verdict_acked_at`.

## 3. The Implementation Guide

### 3.1 Context & Files

| Item | Value |
|---|---|
| Primary File | `cleargate-cli/scaffold/core/.cleargate/scripts/close_sprint.mjs` |
| Related Files | `cleargate-cli/scaffold/core/.cleargate/scripts/prep_reporter_context.mjs`, `cleargate-cli/scaffold/core/.cleargate/templates/sprint_report.md`, `cleargate-cli/scaffold/hosts/claude/.claude/agents/reporter.md`, `cleargate-cli/scaffold/hosts/codex/.codex/agents/reporter.toml`, `cleargate-cli/scaffold/hosts/claude/.claude/skills/sprint-execution/SKILL.md`, `cleargate-cli/scaffold/core/.agents/skills/sprint-execution/SKILL.md` |
| New Files Needed | Yes — `cleargate-cli/test/scripts/close-evidence-step.red.node.test.ts`, `cleargate-cli/test/scripts/close-evidence.red.integration.node.test.ts` |

### 3.2 Technical Logic
- Keep `CLEARGATE_FORCE_DEFERRED_VERIFY` working as the test seam (`:1267`) and add an equivalent for evidence only if a test needs it; prefer real files in a temp sprint dir.
- Step 2 change: treat `Sprint Review` as closable; the ack-pass writes (`unproven.json`, `carry_over`, `proof_pending`, `goal_verdict_acked_at`) go with the other ack-pass writes after the ack check (`:1533-1550`), never in the no-flag pass.
- Bundle: add the section where `prep_reporter_context.mjs` assembles its sections (the Test Gate line at `:212` reads `baseline.json`; place Evidence beside it).

### 3.3 API Contract (if applicable)

| Endpoint | Method | Auth | Request Shape | Response Shape |
|---|---|---|---|---|
| `unproven.json` (file) | read | None | — | `[{ id, tier, reason: missing\|pending\|fail }]` |
| Report frontmatter | read | None | — | `goal_verdict: met\|partial\|missed`, `goal_verdict_basis: string`, `goal_verdict_acked_at: ISO` |

## Task Breakdown
- [x] Red tests for the five scenarios (unit with temp sprint dirs; one integration close of a fixture sprint with one unproven item).
- [x] Step 2.9 evidence step with the one-release `deferred-verify/` fallback; Step 2 accepts Sprint Review.
- [x] Ack-pass writes: `unproven.json`, `carry_over` + `proof_pending`, `goal_verdict_acked_at`.
- [x] Step 2.5 verdict enum check.
- [x] Bundle Evidence section.
- [x] Report template; `reporter.md`, `reporter.toml`, both skills' §E.2.

## 4. Quality Gates

### 4.1 Minimum Test Expectations

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 7 | Scenarios 1, 3, 4 and the three Outline rows, plus the bundle section. Epic levels: Unit, Contract. |
| Integration tests | 1 | Fixture sprint closed end to end with one unproven item (scenario 2). Epic level: Integration. Journey: "Close with a gap". |
| E2E / acceptance tests | 1 | Reporter role-text pins for both hosts. |

### 4.2 Definition of Done (The Gate)
- [ ] Minimum test expectations (§4.1) met.
- [ ] All Gherkin scenarios from §2.1 covered.
- [ ] Peer/Architect Review passed.

## Existing Surfaces

- **Surface:** `cleargate-cli/scaffold/core/.cleargate/scripts/close_sprint.mjs:488-504,1172-1388,1533-1550` — Step 2 terminal check, Step 2.9 deferred verification, the ack halt.
- **Surface:** `cleargate-cli/scaffold/core/.cleargate/scripts/close_sprint.mjs:736-806` — Step 2.5 report validation.
- **Surface:** `cleargate-cli/scaffold/core/.cleargate/scripts/prep_reporter_context.mjs:212` — the bundle's Test Gate line, beside which Evidence goes.
- **Surface:** `cleargate-cli/scaffold/hosts/claude/.claude/agents/reporter.md:28-45` — Goal Acceptance Check and OD-4.
- **Coverage of this requirement:** partial — the close gate, the bundle and the verdict derivation exist; the evidence step, the Sprint Review close and the recorded verdict are new.

## Prior work

- [[EPIC-065]] — parent.
- [[CR-129]] (Draft) — structured goal verdict; absorbed here (R5, R6), and closes when this merges.
- [[CR-082]] (Completed) — the deferred-verification close gate this step generalises.
- [[CR-110]] (Completed) — Goal Acceptance Check and the OD-4 rule amended here.
- [[CR-134]] (Draft) — close writes statuses only in the ack pass; R2 and R3 follow the same rule.
- [[BUG-119]] (Triaged) — close halts on unrelated incomplete parents; may stand between a close and this ack prompt.

## Why not simpler?

- **Smallest existing surface that could carry this:** CR-082's Step 2.9 and CR-129's two frontmatter keys.
- **Why isn't extension / parameterization / config sufficient?** It is an extension: Step 2.9 is generalised from opt-in stories to every item and reads the new evidence file, and CR-129 is taken as written except its ack stamp, which records only the time (`goal_verdict_acked_at`, not `goal_verdict_acked_by`; §1.4). What is new is that Sprint Review can reach close at all, which the Done guard makes possible, and that needs the owner's ack and a record of the gap.

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
