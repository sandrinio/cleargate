---
cr_id: CR-081
parent_ref: EPIC-045
parent_cleargate_id: EPIC-045
sprint_cleargate_id: null
carry_over: false
status: Draft
approved: true
area: framework/qa-loop
context_source: |
  Dogfood observation log for new_app SPRINT-66 (v2-parallel), findings F9 + F10:
  .cleargate/sprint-runs/_off-sprint/dogfood-SPRINT-66-observations.md.
  F9 (lines 552-561) — the §C.3.5 TPV gate is explicitly wiring-only ("does NOT
  evaluate test logic correctness", SKILL.md:301/312/323), so two semantic QA-Red
  FIXTURE bugs slipped to the Developer and each burned a full dispatch:
  STORY-115-02 built DeckSpec(theme="dark") against a Pydantic
  Literal["technical-dark","business-warm","minimal-light"] → ValidationError at
  construction before the assertion (blocker report lines 517-525); STORY-114-04 set
  detail:'Connected' on BOTH postgres+redis → queryByText('Connected') threw "Found
  multiple elements" (lines 529-537) — a repeat of a SPRINT-63 flashcarded
  queryByText multi-match hazard. F10 (lines 734-735) — QA-Verify FALSE-FAILed a
  red-now-green test, demanding a SEPARATE green-path file distinct from the
  now-passing red file; the orchestrator had to override on BOTH STORY-114-04 and
  STORY-117-01 (cited precedent), so it is recurring, not one-off. Prior art noted in
  F9: new_app carries a local SUG-SPRINT-52-03 QA-Red Lint Gate (qa_red_lint.mjs,
  rules R1-R5) whose coverage misses enum/Literal validity + queryByText single-match
  — it lives only in the target, not in the ClearGate manifest. Routes to the QA-loop
  hardening epic per the EPIC-043-family tech-debt-findings memory directive.
created_at: 2026-06-03T00:00:00Z
updated_at: 2026-06-03T00:00:00Z
created_at_version: cleargate@0.14.0
updated_at_version: cleargate@0.14.0
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
  last_gate_check: 2026-06-03T16:32:12Z
pushed_by: sandro.suladze@gmail.com
pushed_at: 2026-06-03T16:44:17.728Z
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
push_version: 1
---

# CR-081: QA-loop hardening — semantic QA-Red fixture lint + accept red-now-green as the green test

## 0.5 Open Questions

- **Question:** Should the semantic-fixture lint extend the existing §C.3.5 TPV gate (one more dispatch path) or ship as a standalone stock `qa_red_lint` script invoked by the orchestrator after the QA-Red commit and BEFORE Developer dispatch?
- **Recommended:** Standalone stock script wired into the existing pre-gate scan step. TPV is deliberately wiring-only and Architect-dispatched only on a flag (SKILL.md:300-301); folding semantic-correctness logic into TPV blurs the "wiring vs correctness" boundary that the gate is documented to hold. A dedicated `qa_red_lint` (modeled on the new_app-local SUG-SPRINT-52-03 `qa_red_lint.mjs`, run by `pre_gate_runner.sh` right after the QA-Red commit) keeps TPV pure, runs unconditionally (no flag needed), and is the thing F9 explicitly argues to upstream. Its flags route back to QA-Red exactly as a TPV wiring gap does (`arch_bounces`).
- **Human decision:** Accepted 2026-06-03 (owner: "accept all") — adopt the Recommended answer above.

- **Question:** What is the rule set scope for the lint? F9 names two concrete misses; do we ship only those two or a broader R1-Rn set?
- **Recommended:** Ship the two F9-proven rules first, leaving the file structured for growth: (R-enum) constructed-fixture enum/`Literal` validity — when a fixture constructs a typed model with a literal/enum field, the literal must be a member of the declared set (catches `DeckSpec(theme="dark")`); (R-query) query-by-text single-match — flag `queryByText(...)`/`getByText(...)` whose target string is duplicated across fixture rows in the same render, and recommend `queryAllByText(...)[0]` or `getByTestId(...)`. Both are pattern-matchable without executing tests. Defer broader rules to follow-up cards; do not gold-plate on first ship.
- **Human decision:** Accepted 2026-06-03 (owner: "accept all") — adopt the Recommended answer above.

- **Question:** What is the exact `qa.md` / DoD wording for red-now-green so QA-Verify stops false-FAILing?
- **Recommended:** Add an explicit clause to `qa.md` Mode VERIFY and to the acceptance-trace workflow: *"A QA-Red test file that was failing at baseline and now PASSES against the Developer's commit fully satisfies the green-test / acceptance-coverage requirement. Do NOT require a separate green-path file distinct from the red file — a duplicate is redundant under Rule 18 (reuse over re-create). Map each Gherkin scenario to the now-passing red test; absence of a second file is not a MISSING entry."* Mirror the one-liner in the coverage-check bullet (`qa.md:110`). This is the precise gap that forced the STORY-114-04 + STORY-117-01 overrides.
- **Human decision:** Accepted 2026-06-03 (owner: "accept all") — adopt the Recommended answer above.

## 1. The Context Override (Old vs. New)
*(AI agents hallucinate when old context conflicts with new requests. Explicitly declare what to evict.)*

**Obsolete Logic (What to Remove / Forget):**
- **(F9)** Stop relying on the §C.3.5 TPV gate to catch QA-Red *test logic* problems. TPV is wiring-only by design — it verifies imports resolve, constructor signatures match, mocked methods exist, after-hooks are present, and file naming (`SKILL.md:301`, `:312`, `:323`; `architect.md:110-118`). It does NOT evaluate whether a constructed fixture is *valid* or whether a query is *satisfiable*. Two SPRINT-66 fixture bugs proved the gap: an invalid Pydantic `Literal` (`DeckSpec(theme="dark")`) that `ValidationError`s before the assertion, and a duplicate `detail:'Connected'` that makes `queryByText` throw "Found multiple elements." Each slipped to the Developer and burned a full dispatch + blocker + route-back to QA-Red. A flashcard alone did not prevent the multi-match recurrence (it was already carded in SPRINT-63).
- **(F10)** Stop treating "a green test exists" as "a file *other than* the red file exists." QA-Verify currently reads §4.1/§4.2 literally and FALSE-FAILs a red-now-green test, demanding a SEPARATE green-path file. That literalism forced an orchestrator override on BOTH STORY-114-04 and STORY-117-01 — it is recurring, not a one-off.

**New Logic (The New Truth):**
- **(a)** A QA-Red **semantic-fixture lint** runs after the QA-Red commit and BEFORE Developer dispatch. Rule set (first ship): constructed-fixture enum/`Literal` validity; query-by-text single-match (prefer `queryAllByText` / `getByTestId` when the target string is duplicated). A flag routes back to QA-Red (increments `arch_bounces`, same path as a TPV wiring gap) BEFORE a Developer is spawned against an unsatisfiable Red test. Implementation: extend the existing pre-gate scan (`pre_gate_runner.sh`) with a stock `qa_red_lint` rather than each target reinventing it locally (the new_app SUG-SPRINT-52-03 `qa_red_lint.mjs` is the proven shape to upstream; its current R1-R5 miss exactly these two rules).
- **(b)** `qa.md` and the applicable DoD clause clarify that **a red test turned green satisfies the green-test requirement** — no duplicate green file is required (Rule 18). QA-Verify maps each Gherkin scenario to the now-passing red test; absence of a second file is not a MISSING entry and must not produce a FAIL.

## 2. Blast Radius & Invalidation
*(A CR acts as a "Gate Reset" — all affected downstream items revert to 🔴 High Ambiguity.)*

- [ ] Invalidate/Update Epic: EPIC-045 (QA-loop hardening) — this CR is one of its constituent remediations; no sibling story conflicts.
- [ ] Update SKILL.md §C.3.5 TPV Gate — insert the QA-Red semantic-fixture lint step before §C.4 Developer dispatch (or document the new pre-gate `qa_red_lint` hook there). The wiring-only contract of TPV itself is preserved, not changed.
- [ ] Update `qa.md` Mode RED (lint expectations) + Mode VERIFY / acceptance-trace workflow (red-now-green clause).
- [ ] Canonical-vs-live sync: edits land in `cleargate-planning/.claude/**` (canonical) and the live `/.claude/**` must be re-synced via `cleargate init` or hand-port — per the Dogfood split rule. A stock `qa_red_lint` ships in the `cleargate init` payload, so target repos pick it up on next init/upgrade.
- [ ] Database schema impacts? No — this is QA-loop scaffold (agent `.md` + sprint-execution SKILL + a pre-gate script). No `mcp/`, `admin/`, or DB surface.

## Existing Surfaces

> L1 reuse audit. Paths verified 2026-06-03 against the live `/.claude/` + `.cleargate/scripts/` tree.

- **Surface:** `.claude/skills/sprint-execution/SKILL.md:288-323` — §C.3.5 TPV Gate; lines 300-301 + the dispatch prompt at :312 + the closing note at :323 state TPV "does NOT evaluate test logic correctness" / "is a WIRING gate, not a correctness gate." This is the gate F9 shows is insufficient for semantic fixture bugs; the new lint step slots in beside it (after the QA-Red commit, before §C.4).
- **Surface:** `.claude/agents/architect.md:108-126` — `## Mode: TPV (Test Pattern Validation)`; line 118 "You DO NOT verify test logic correctness — that is Dev's TDD challenge." Confirms the wiring-only contract this CR leaves intact while adding a separate semantic lint.
- **Surface:** `.claude/agents/qa.md:42-47` (Mode RED: writes `*.red.node.test.ts`, wiring-soundness note) and `.claude/agents/qa.md:110` (coverage-check bullet "every Gherkin scenario has a passing test"); plus the Mode VERIFY acceptance-trace workflow at `.claude/agents/qa.md:131-135`. This is where the red-now-green DoD clarification (F10) lands.
- **Surface:** `.cleargate/scripts/pre_gate_runner.sh` + `.cleargate/scripts/pre_gate_common.sh` — the existing pre-gate scan invoked by §C.3.5 (`bash .cleargate/scripts/pre_gate_runner.sh arch …`, SKILL.md:295). The stock `qa_red_lint` extends this scan surface rather than adding a parallel runner.
- **Why this CR extends rather than rebuilds:** the QA-Red → TPV → Developer loop already exists and runs; this CR adds one semantic-correctness check beside the existing wiring gate and clarifies one DoD clause in the existing QA agent. It does not author a new gate framework. The lint's proven implementation already exists target-side (new_app `qa_red_lint.mjs`, SUG-SPRINT-52-03) and is being upstreamed, not invented.

## 3. Execution Sandbox
*(Restrict the agent's scope to prevent unrelated refactoring.)*

**Modify (canonical, then re-sync live):**
- `cleargate-planning/.claude/skills/sprint-execution/SKILL.md` — §C.3.5: add the QA-Red semantic-fixture lint step (invoke stock `qa_red_lint`, route flags back to QA-Red via `arch_bounces`) before §C.4.
- `cleargate-planning/.claude/agents/qa.md` — Mode RED lint expectations; Mode VERIFY + acceptance-trace red-now-green clause (mirror at the coverage-check bullet).
- `cleargate-planning/.claude/agents/architect.md` — one note that TPV stays wiring-only and the semantic lint is a separate pre-gate step (no behavior change to TPV itself).

**Create:**
- `cleargate-planning/.cleargate/scripts/qa_red_lint.mjs` — new stock QA-Red semantic-fixture lint (R-enum + R-query first ship), upstreamed/adapted from the new_app-local SUG-SPRINT-52-03 `qa_red_lint.mjs`. Wired into `pre_gate_runner.sh` so `cleargate init` targets inherit it.

**Then:** re-sync the live `/.claude/**` + `/.cleargate/scripts/**` via `cleargate init` (or hand-port), and let `npm run prebuild` mirror canonical into `cleargate-cli/templates/cleargate-planning/`.

## 4. Verification Protocol
*(How do we confirm new logic works and old logic is completely removed?)*

**Command/Test:**
- **F9 lint — positive:** `node .cleargate/scripts/qa_red_lint.mjs <fixture-dir>` flags a fixture that constructs a typed model with an out-of-set literal (regression fixture mirroring `DeckSpec(theme="dark")` against `Literal["technical-dark","business-warm","minimal-light"]`) → exit non-zero with a specific message; and flags a render fixture where the same text appears on two rows under a `queryByText`/`getByText` call → recommends `queryAllByText(...)[0]` / `getByTestId(...)`.
- **F9 lint — negative (no false positive):** a fixture with a valid literal and a uniquely-matched query passes (exit 0).
- **F9 wiring:** `grep -n "qa_red_lint" .cleargate/scripts/pre_gate_runner.sh` returns a hit (the lint is invoked in the pre-gate scan), and a lint flag routes back to QA-Red (verify the `arch_bounces` increment path is referenced, mirroring SKILL.md:317-323).
- **F10 DoD:** `grep -n "red-now-green\|now passes\|red test that was failing" .claude/agents/qa.md` returns the new clause in Mode VERIFY; confirm the coverage-check bullet (`qa.md:110`) no longer reads as requiring a separate green file.
- **Regression (no scope creep):** `git diff --name-only` against the CR branch lists only the four scaffold paths in §3 — no `mcp/`, `admin/`, or DB files touched.

---

## Context Source

> Discovery audit. Populated from the SPRINT-66 dogfood observation log (F9 + F10) and verified codebase grounding.

**context_source:** `.cleargate/sprint-runs/_off-sprint/dogfood-SPRINT-66-observations.md` findings F9 (lines 552-561 — TPV wiring-only lets semantic QA-Red fixture bugs through; STORY-115-02 `DeckSpec(theme="dark")` ValidationError + STORY-114-04 duplicate `detail:'Connected'` queryByText multi-match, a SPRINT-63 flashcard repeat; new_app SUG-SPRINT-52-03 `qa_red_lint.mjs` R1-R5 misses both) and F10 (lines 734-735 — QA-Verify false-FAILs red-now-green, orchestrator override on STORY-114-04 + STORY-117-01). Grounded against `.claude/skills/sprint-execution/SKILL.md` §C.3.5, `.claude/agents/architect.md` Mode TPV, `.claude/agents/qa.md` Mode RED/VERIFY, and `.cleargate/scripts/pre_gate_runner.sh`. Routes to EPIC-045 per the EPIC-043-family tech-debt-findings memory directive.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity — Ready (owner accepted all recommendations 2026-06-03)**

*Evaluate each criterion against its literal text. If you substituted an interpretation, leave the box unchecked and surface the substitution in the Brief.*

Requirements to pass to Green (Ready for Execution):
- [x] "Obsolete Logic" to be evicted is explicitly declared. — *§1 evicts the F9 reliance on wiring-only TPV for fixture correctness and the F10 "separate green file" literalism.*
- [x] All impacted downstream Epics/Stories are identified and reverted to 🔴 High Ambiguity. — *Only the parent EPIC-045 and three scaffold surfaces (SKILL §C.3.5, qa.md, architect.md) are affected; flagged in §2. No sibling story depends on this loop-hardening fix, so nothing else reverts.*
- [x] Execution Sandbox contains exact file paths. — *§3 lists the three canonical edits + one created script + the re-sync step.*
- [x] Verification command is provided. — *§4 gives concrete lint positive/negative/wiring commands plus the F10 DoD grep and a scope-creep diff check.*
- [x] `approved: true` is set in the YAML frontmatter. — *Intentionally Draft. Recorded from the SPRINT-66 dogfood log; approval is a separate Gate-1 step pending the §0.5 decisions (TPV-extend vs standalone lint; rule-set scope; exact red-now-green wording).*
- [x] Existing Surfaces cites at least one source-tree path the CR extends. — *Five verified paths cited (SKILL.md §C.3.5, architect.md Mode TPV, qa.md Mode RED/VERIFY, pre_gate_runner.sh, pre_gate_common.sh).*
