---
epic_id: EPIC-043
parent_cleargate_id: null
sprint_cleargate_id: null
carry_over: false
status: Draft
ambiguity: 🟢 Low
context_source: |
  Spawned 2026-06-01 from a source-level self-review of the framework ClearGate
  ships to users (10-agent + 4-lens multi-agent review, run against the codebase,
  not the wiki). The owner (sandrinio) asked verbatim: "create an EPIC and record
  all the improvements you described. lets work on the epic once you're done."

  PROPOSAL-GATE WAIVER (per standing rule feedback_proposal_gate_waiver): the
  legacy Proposal step is retired (CR-025/SPRINT-19) and the user requested an
  Epic directly with sharp intent + inline references (the review findings
  themselves). No retro-proposal authored; waiver recorded here.

  The review's verdict: the framework is NOT over-engineered (irreducible core is
  ~5 load-bearing pieces — template/Brief/Gate-1, the adversarial 5-agent split,
  worktree-per-story isolation, state.json authority, the versioned MCP items
  store) but it has never garbage-collected its superseded subsystems, so a small
  coherent core is obscured by removable scar tissue. This Epic is that GC pass
  plus three efficiency cuts.

  Eight findings were raised. Three are handled elsewhere and are recorded here as
  OUT-OF-SCOPE so nothing is lost: execution-mode collapse = CR-070 (Approved);
  parallel-wave + token-ledger fallback = EPIC-033 (shipped SPRINT-32, the fallback
  is REQUIRED for parallel attribution — finding invalidated); test-runner/scoped-QA
  = EPIC-031 + STORY-031-02. The remaining five net-new items are IN-SCOPE below.
owner: sandrinio
target_date: 2026-06-20
created_at: 2026-06-01T00:00:00Z
updated_at: 2026-06-01T12:00:00Z
created_at_version: cleargate@0.13.0
updated_at_version: cleargate@0.13.0
server_pushed_at_version: null
area: framework/hygiene
approved: true
proposal_gate_waiver: true
approved_by: sandrinio
approved_at: 2026-06-01T00:00:00Z
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-05-31T20:38:30Z
pushed_by: sandro.suladze@gmail.com
pushed_at: 2026-05-31T21:31:51.013Z
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
push_version: 2
stamp_error: no ledger rows for work_item_id EPIC-043
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-05-31T21:31:44Z
  sessions: []
---

# EPIC-043: Framework Hygiene & Efficiency Remediation

## 0. AI Coding Agent Handoff
*(This section is strictly for downstream AI execution agents. It contains zero business fluff.)*

```xml
<agent_context>
  <objective>Garbage-collect three superseded/stale documentation surfaces, cut two
  per-session and per-story efficiency taxes, and remove dead/plumbing surface area —
  without touching the framework's load-bearing core (the 5-agent split, gates 1-4,
  worktree isolation, the MCP items store).</objective>
  <architecture_rules>
    <rule>Do NOT re-implement execution-mode collapse — that is CR-070 (Approved). This Epic SEQUENCES AFTER CR-070 and must not edit the same execution_mode lines.</rule>
    <rule>Do NOT touch parallel-wave (launch_wave.mjs) or the token-ledger 3-level attribution fallback — EPIC-033 shipped these and the fallback is required for parallel dispatch attribution.</rule>
    <rule>Do NOT change QA-Verify's test scope behavior — that is EPIC-031/STORY-031-02. Only reconcile the qa.md PROSE with the shipped behavior + the artifact-diff memory note.</rule>
    <rule>Canonical/payload/live sync is mandatory. Edits to cleargate-planning/.claude/** (hooks, agents, skills) must propagate: canonical (cleargate-planning) → npm payload (cleargate-cli/templates/... via prebuild) → live (/.claude via cleargate init). Never edit only one mirror.</rule>
    <rule>Wiki is a derived cache. Recompile-efficiency changes must preserve correctness on `cleargate wiki build` (full rebuild) — only the per-edit incremental path may be narrowed.</rule>
    <rule>Hiding a CLI command means Commander hidden:true ONLY. The command must remain callable (hooks/scripts depend on it). Never delete a command a hook invokes.</rule>
    <rule>Flashcard curation (WS2) is review-driven at sprint retro, never age/byte-based auto-eviction. Archived cards move to a greppable cold file, never deleted. Project-specific lessons stay as long as they are live.</rule>
  </architecture_rules>
  <target_files>
    <file path="README.md" action="modify" />
    <file path="cleargate-cli/src/commands/wiki-ingest.ts" action="modify" />
    <file path="cleargate-cli/src/cli.ts" action="modify" />
    <file path="cleargate-cli/src/lib/triage-classifier.ts" action="delete" />
    <file path="cleargate-planning/.claude/agents/qa.md" action="modify" />
    <file path=".cleargate/FLASHCARD.md" action="modify" />
  </target_files>
</agent_context>
```

## 1. Problem & Value

**Why are we doing this?**
A source-level review found the framework's core is sound but carries removable debt: a tutorial (root README) that instructs users to do the one thing the framework forbids; a per-edit wiki recompile that rebuilds all four synthesis pages dozens of times per story; an unbounded 66KB FLASHCARD that is now larger than the protocol it serves and is paid as a session-start token tax; two unconditional Architect agent re-entries that re-pay a 16KB prompt on the green path; and dead/mislabeled CLI surface that misleads users. None of this is a design flaw — it is un-collected scar tissue from migrations that shipped but were never finished. Cleaning it removes most of the "this feels too complicated" smell without touching the engine.

**Success Metrics (North Star):**
- **Doc truth:** `README.md` contains **0** references to the retired Proposal flow and **0** references to `close_sprint.mjs --assume-ack`; `qa.md` no longer contradicts the `feedback_qa_skip_test_rerun` memory. (Verifiable by grep.)
- **Wiki recompute:** per-delivery-edit synthesis recompiles drop from **4 pages always** to **only the affected partition** (and **0** on frontmatter-only stamp edits) — ≥75% fewer synthesis writes per story; `cleargate wiki build` output byte-identical to today.
- **Flashcard curation:** a flashcard-archival-candidate review runs at every sprint close; superseded/resolved/duplicate cards move to a greppable cold archive **by human review at Gate 4, not by age** — live project lessons are never auto-evicted. Hot-file size trends down as a byproduct.
- **Loop cost:** standard-lane (no-bounce) stories drop from **6** LLM agent dispatches to **≤5** by making the two Architect re-entries fire on a pre-gate signal (gated by §6 Q3).
- **Surface hygiene:** `cleargate --help` hides all hook-only plumbing commands; **0** CLI command descriptions contain a false "stub" label; **0** orphan lib modules with no `src/` callers remain.

## 2. Scope Boundaries

**✅ IN-SCOPE (Build This)** — eight workstreams, each one or more candidate Stories:

- [ ] **WS1 — Doc truth (kill the day-one contradictions).** Rewrite `README.md` §"Getting started in 10 minutes": drop "File a proposal" (→ "File a ClearGate Epic/Story"), drop `close_sprint.mjs --assume-ack` (→ "run `close_sprint.mjs` with NO flags; confirm the prompt verbatim"). Add a 1-page tiered QUICKSTART covering only the single-item happy path (init → file Story → Gate 1 → push), explicitly deferring sprints/agents/gates-2-4. Reconcile `cleargate-planning/.claude/agents/qa.md` prose with the shipped EPIC-031 scoped-test behavior and the `feedback_qa_skip_test_rerun` memory (doc-only; no test-runner change).
- [ ] **WS2 — Flashcard curation at sprint retro (NOT mechanical rotation).** Flashcard entries are project-specific lessons; age/byte-budget eviction is the wrong tool — it would drop still-live knowledge. Instead add a curation step to sprint close/retro: the Reporter surfaces flashcard **archival candidates** (superseded by a later card, a resolved one-off, or a duplicate) each with a one-line reason; a human approves at Gate 4; approved cards move to a greppable cold `.cleargate/FLASHCARD-archive.md`. Curation is by **review, not by clock** — a relevant card stays regardless of age. The session-start token-tax shrinkage is a byproduct of good curation, not a hard size target. Separately, confirm `cleargate-enforcement.md` is read only on hook-error, not in the always-on orientation set; if it is in the hot path, move it out.
- [ ] **WS3 — Wiki recompile efficiency.** Make `recompileSynthesis` in `wiki-ingest.ts` incremental: recompile only the synthesis page(s) whose partition the changed item belongs to, and skip recompile entirely when only frontmatter stamp fields changed (no body/status delta). Full `cleargate wiki build` stays a complete rebuild.
- [ ] **WS4 — Loop efficiency (Architect re-entries on signal).** Make Architect TPV (pre-dev test-plan validation) and Architect post-flight dispatch conditionally: run the scripted `pre_gate_runner.sh` scan always, but spawn a live Architect agent only when the scan flags something (demotion/bounce/surface drift). Green-path stories skip the two re-entries. **Gated by §6 Q3** (do we accept losing the agent re-read on the green path?).
- [ ] **WS5 — Surface hygiene.** Mark hook-only plumbing commands `hidden:true` in Commander (`stamp`, `stamp-tokens`, `state update`, `state validate`, `wiki ingest`, `gate qa`, `gate arch`, `reconcile-lifecycle` — keep callable). Fix the false `(stub — requires complete_story.mjs)` description at `cli.ts:418` (the handler is a real orchestration). Delete the orphan `cleargate-cli/src/lib/triage-classifier.ts` (no `src/` callers) and audit for other zero-caller lib modules; delete only those with no callers and passing CI.

- [ ] **WS6 — Template/gate heading reconciliation (recurring self-inflicted bug).** The epic/story/CR templates ship numbered headings (`## 3.5 Existing Surfaces`, `## 3.6 Why not simpler?`) but the readiness predicates `reuse-audit-recorded` / `simplest-form-justified` do a literal substring match for the UNNUMBERED `## Existing Surfaces` / `## Why not simpler?` (`cleargate-cli/src/lib/readiness-predicates.ts:720`). Every epic authored from the template fails the gate until hand-fixed — flashcarded 2026-05-02 and 2026-05-29, and it has bitten EPIC-030/031/032/033, STORY-033-01, and this Epic (EPIC-043). Fix once: either de-number the template headings or make the predicate tolerate a numeric prefix. Pick one and apply across epic/story/CR templates + their canonical/payload mirrors.
- [ ] **WS7 — Sprint consolidation pass (quality ADD).** Each story is built by a Developer sealed in its own worktree, blind to the other stories — so cross-story duplication, divergent patterns, and missed reuse are structurally invisible during execution. Add a Consolidation phase between walkthrough (Phase D) and close (Phase E): run `/simplify` (the `code-simplifier` agent) on `git diff main...sprint/S-NN`, applying reuse/dedup/altitude fixes on a consolidation commit on the sprint branch; **MUST NOT touch `*.red.node.test.ts`** (same immutability rule as the Developer); then **QA-Verify re-runs the FULL suite** as the safety net — green merges, red reverts the simplification. Optionally run a sprint-diff `/code-review` for integration bugs the per-story QA (each sealed to one story) cannot see. This is the one workstream that *raises* delivery quality rather than cutting cost.
- [ ] **WS8 — Gates that don't gate (integrity holes — make enforcement real).** Repair gates that currently emit a weak/false signal: **(a)** `pending-task-sentinel.sh` reads the retired `execution_mode` and so always takes the v1-advisory path — the flashcard gate never blocks; make it fail-closed with `CLEARGATE_ADVISORY=1` as the sole downgrade (sequences after CR-070). **(b)** `CR.md`/`Bug.md` declare no `context_source`, so `discovery-checked` fails for **every** CR and Bug (verified on BUG-033); add the field + footer box or drop the criterion. **(c)** `Bug.md` §2 Reproduction is an ordered list that `countDeclaredItems` scores 0, plus a `## 0.5` heading shifts the positional `section(2)` index, so `repro-steps-deterministic` always fails (verified on BUG-034); fix the sample to bullets + de-number/anchor. **(d)** `hotfix` is not a registered `WorkItemType` (`work-item-type.ts`), so `gate check` errors out on every hotfix; register it + add a `work_item_type: hotfix` gate block. **(e)** `close_sprint.mjs` lifecycle/orphan/merge gates fail **open** when `cleargate-cli/dist/cli.js` is stale/absent; assert a built `dist/` before the cascade or fail closed. **(f)** re-sync `reporter.md` to the v2 7-section template (`template_version` 1→2); collapse the dual dispatch markers and the double pre-close cascade run.

**❌ OUT-OF-SCOPE (Do NOT Build This — recorded for completeness)**
- **Execution-mode v1/v2 collapse** — owned by **CR-070** (Approved). This Epic must not edit the `execution_mode` lines, the inert-mode message, or `state.schema.json` schema bump. Sequence after CR-070 merges.
- **Parallel-wave gating / token-ledger fallback collapse** — **INVALIDATED.** EPIC-033 shipped parallel-wave (SPRINT-32); the token-ledger 3-level attribution fallback is required for parallel dispatch. Do not touch `launch_wave.mjs` or `token-ledger.sh` attribution.
- **Test-runner split / QA scoped-test default** — owned by **EPIC-031** + `STORY-031-02`. WS1's qa.md edit is prose-reconciliation only, not a behavior change.
- **Any change to the load-bearing core:** the adversarial 5-agent split, Gates 1-4 semantics, the literal-ambiguity rule, worktree-per-story isolation, the versioned MCP `items`/`itemVersions` store. These earned their keep in the review.
- **Agent-dispatch architectural bets** — structured verdicts for serial dispatches + prompt-cache-friendly dispatch + model tiering. These are net-new *design* (they touch the dispatch protocol and harness integration), not hygiene; cramming them here would over-stuff the epic the way the review warned against. Recorded as **EPIC-044** for its own decomposition.
- Net-new abstractions, new commands, or a wiki rewrite. This is deletion/narrowing/reconciliation only.

## 3. The Reality Check (Context)

| Constraint Type | Limit / Rule |
|---|---|
| Cross-repo | CLI source (`cleargate-cli/`) and MCP are their own git repos (gitignored here). Hooks/agents/skills live in `cleargate-planning/` (canonical, tracked). A WS may span repos — commit per repo, per story. |
| Canonical/payload/live sync | Any `cleargate-planning/.claude/**` edit must mirror to the npm payload (`prebuild`) and re-sync the live `/.claude/` (`cleargate init`) or it ships buggy (the BUG-024 failure mode). |
| Sequencing | WS-execution-mode is CR-070's; if CR-070 is mid-flight, WS1's doc edits must not collide on the same enforcement.md/CLAUDE.md lines. |
| Correctness floor | `cleargate wiki build` (full rebuild) output must be byte-identical before/after WS3. The incremental path is an optimization, not a behavior change. |
| Backwards safety | Hidden commands (WS5) stay callable; no hook or script may break. Deleted orphan modules must have zero `src/` callers and green CI. |
| Memory integrity | Flashcard curation (WS2) is review-driven at retro, never age-based; no entry is deleted — archived cards move to a greppable cold file only. |
| Risk asymmetry | WS4 is the only behavior change to the sprint loop; it trades a green-path agent re-read for ~17% fewer dispatches. Mitigate by keeping the dispatch on ANY pre-gate flag. |

## Existing Surfaces

> L1 reuse audit. Source-tree implementations this Epic modifies/deletes. All paths verified by grep/read on 2026-06-01.

- **Surface:** `README.md:225,229,248` — "Getting started in 10 minutes" still says "File a proposal" (line 229, retired by CR-025) and `close_sprint.mjs --assume-ack` (line 248, forbidden by CLAUDE.md guardrail). WS1 rewrites these. CR-058 refreshed step-6 ordering previously but missed these two lines.
- **Surface:** `cleargate-cli/src/commands/wiki-ingest.ts:313-314,660-678` — `recompileSynthesis()` writes all four synthesis pages on every ingest; the code comment literally reads `// (all four — M3 over-recompiles)`. WS3 narrows this.
- **Surface:** `.claude/hooks/stamp-and-gate.sh:40` — PostToolUse fires `cleargate wiki ingest` on every Edit/Write to a delivery file, triggering the over-recompile dozens of times per story.
- **Surface:** `cleargate-cli/src/cli.ts:418` — `story complete` description = `(stub — requires complete_story.mjs)`, false; handler is a real 6-step orchestration. WS5 fixes the label + hides plumbing commands.
- **Surface:** `cleargate-cli/src/lib/triage-classifier.ts` — zero `src/` callers (verified); duplicates the protocol §2 triage table the agent already uses. WS5 deletes it.
- **Surface:** `cleargate-planning/.claude/agents/qa.md:87,94,115,145` — mandates fresh-shell full re-run, contradicting the `feedback_qa_skip_test_rerun` memory and the EPIC-031 scoped-test default. WS1 reconciles the prose.
- **Surface:** `.cleargate/FLASHCARD.md` (66,116 bytes / 276 lines) + `.cleargate/knowledge/cleargate-enforcement.md` (33,863 bytes / 551 lines) — session-start token tax. WS2 adds retro curation (`close_sprint.mjs` + `reporter.md`) and confirms enforcement.md lazy-loads.
- **Coverage of this Epic's scope by existing surfaces:** ~100% extension/deletion of existing code — **no net-new abstraction required.**

## Why not simpler?

> L2 / L3 right-size + justify-complexity.

- **Smallest existing surface that could carry this Epic:** the surfaces listed in §3.5 — every workstream edits or deletes existing files; nothing new is built.
- **Why isn't extension / parameterization / config sufficient?** It is — that is precisely the point. This Epic is the opposite of adding complexity: it is deletion (orphan module, false label), narrowing (per-edit recompile, conditional Architect dispatch), and reconciliation (README, qa.md, flashcard curation, template/gate headings). The only reason it is an Epic rather than a single CR is that the six workstreams touch independent subsystems (docs, wiki engine, hook payload, sprint loop, CLI surface, templates) across two repos and warrant independent Stories with their own acceptance tests and merge isolation. Each WS is individually small; bundling them as one CR would violate the granularity rubric (subsystems span).

## 4. Technical Grounding (The "Shadow Spec")

**Affected Files (verified 2026-06-01):**
- `README.md` — WS1: rewrite §Getting started (lines ~225-248); add tiered QUICKSTART section or separate `QUICKSTART.md` + repoint `cleargate-cli/src/commands/init.ts` final-banner reference at it.
- `cleargate-planning/.claude/agents/qa.md` — WS1: reconcile re-run prose (lines 87,94,115,145) with EPIC-031 behavior + memory; mirror to payload + live.
- `.cleargate/FLASHCARD.md` (+ new `.cleargate/FLASHCARD-archive.md`) — WS2: retro-curation, not mechanical rotation. Wire a flashcard-archival-candidate step into `.cleargate/scripts/close_sprint.mjs` + the Reporter (`.claude/agents/reporter.md`) so candidates surface at Gate 4 with reasons; update `.claude/skills/flashcard/SKILL.md` + the session-start orientation list. Mirror canonical in `cleargate-planning/.cleargate/` + payload.
- `.cleargate/knowledge/cleargate-enforcement.md` — WS2: confirm/move to lazy-load (read-on-error only); verify it is not in the always-on set.
- `cleargate-cli/src/commands/wiki-ingest.ts` — WS3: `recompileSynthesis()` (lines 660-678) + its caller (line 314) — add partition-targeting + frontmatter-only-skip guard.
- `cleargate-planning/.claude/skills/sprint-execution/SKILL.md` + `.claude/agents/architect.md` — WS4: make TPV + post-flight dispatch conditional on `pre_gate_runner.sh` output; mirror to payload + live.
- `cleargate-cli/src/cli.ts` — WS5: `hidden:true` on plumbing commands; fix `:418` description.
- `cleargate-cli/src/lib/triage-classifier.ts` — WS5: delete (+ its test, + audit for siblings).

**WS7/WS8 affected files (verified 2026-06-01):**
- `.claude/skills/sprint-execution/SKILL.md` + `.claude/agents/qa.md` — WS7: insert the Consolidation phase (D.5) running the `code-simplifier` agent on the sprint diff, gated by a QA-Verify full-suite re-run before merge. Mirror canonical + payload.
- `.claude/hooks/pending-task-sentinel.sh` (+ canonical + `cleargate-cli/templates/.../pending-task-sentinel.sh`) — WS8(a): drop the `execution_mode` read; always enforce; `CLEARGATE_ADVISORY=1` sole downgrade. Sequence after CR-070.
- `.cleargate/templates/CR.md`, `.cleargate/templates/Bug.md` — WS8(b)/(c): add `context_source` frontmatter + footer box; convert Bug §2 Reproduction sample to bullets; de-number/anchor `## 0.5`.
- `cleargate-cli/src/lib/work-item-type.ts` (+ `readiness-gates.md`) — WS8(d): register `hotfix` in the `WorkItemType` union + `FM_KEY_MAP` + transitions; add a `work_item_type: hotfix` gate block.
- `.cleargate/scripts/close_sprint.mjs` — WS8(e): assert a built `cleargate-cli/dist/cli.js` before the lifecycle/orphan/merge cascade, or fail closed; remove the redundant second cascade pass on `--assume-ack`.
- `.claude/agents/reporter.md` — WS8(f): re-sync to the v2 7-section template (`template_version` 1→2).

**Data Changes:** None to product schema/DB/MCP. `state.schema.json` is CR-070's (execution_mode strip), not this Epic's.

## 5. Acceptance Criteria

```gherkin
Feature: Framework Hygiene & Efficiency Remediation

  Scenario: README no longer contradicts the framework (WS1)
    Given a user reads README.md "Getting started"
    When they grep the file
    Then there are zero occurrences of "File a proposal" or "--assume-ack"
    And step 1 says to file a ClearGate Epic/Story
    And the close step says to run close_sprint.mjs with no flags and confirm verbatim

  Scenario: QA doc matches shipped behavior (WS1)
    Given cleargate-planning/.claude/agents/qa.md
    Then its re-run guidance matches the EPIC-031 scoped-test default
    And it does not instruct an unconditional fresh-shell full re-run that the feedback_qa_skip_test_rerun memory forbids

  Scenario: Flashcard curation runs at sprint close (WS2)
    Given a sprint is being closed at Gate 4
    When the retro runs
    Then the Reporter surfaces flashcard archival candidates, each with a one-line reason (superseded / resolved / duplicate)
    And only candidates a human approves move to FLASHCARD-archive.md
    And no card is evicted by age alone — a still-relevant card stays regardless of age
    And every archived entry remains greppable in FLASHCARD-archive.md (none deleted)

  Scenario: Wiki recompiles only the affected partition (WS3)
    Given a single delivery item's body changes
    When the PostToolUse hook runs wiki ingest
    Then only the synthesis page(s) for that item's partition are rewritten
    And a frontmatter-only stamp edit rewrites zero synthesis pages
    And a full `cleargate wiki build` produces byte-identical output to before the change

  Scenario: Architect re-entries fire only on a signal (WS4, if Q3 = yes)
    Given a standard-lane story whose pre_gate_runner.sh scan is clean
    When the story runs through the loop
    Then no live Architect TPV or post-flight agent is dispatched
    And total agent dispatches for the story are <= 5
    Given a story whose pre-gate scan flags a demotion or surface drift
    Then a live Architect agent IS dispatched for that flag

  Scenario: Plumbing hidden, stub label fixed, orphan removed (WS5)
    Given `cleargate --help`
    Then it does not list stamp, stamp-tokens, state update/validate, wiki ingest, gate qa/arch, reconcile-lifecycle
    And those commands remain callable directly by hooks
    And `story complete`'s description contains no "stub" text
    And cleargate-cli/src/lib/triage-classifier.ts no longer exists
    And the full test suite is green

  Scenario: Core is untouched (guardrail)
    Given the diff for this Epic
    Then it does not modify execution_mode handling (CR-070), launch_wave.mjs or token-ledger attribution (EPIC-033), QA test scope (EPIC-031), gate 1-4 semantics, worktree isolation, or the MCP items store

  Scenario: Error path — incremental recompile drifts from full rebuild (WS3)
    Given the WS3 incremental recompile path has a partition-targeting bug
    When CI runs the parity check comparing incremental output to `cleargate wiki build`
    Then the check fails with a non-zero exit and a clear "wiki synthesis drift" Error naming the divergent page
    And the incremental optimization is rejected until parity is restored (full rebuild remains the correctness floor)

  Scenario: Error path — hiding a command breaks a hook caller (WS5)
    Given a plumbing command is marked hidden:true
    When a hook or script invokes that command directly
    Then the command still executes successfully (hidden affects `--help` only, not callability)
    And if invocation Errors, the WS5 change is reverted (no hook may break)
```

## 6. AI Interrogation Loop (Human Input Required)
*(The Epic stays 🟡/🔴 until these are answered.)*

- **Q1 — Flashcard cleanup mechanism.** ✅ RESOLVED 2026-06-01. Owner: mechanical age/byte rotation is wrong — flashcards are project-specific lessons and a relevant one must not be evicted just for being old. Cleanup becomes a **curation step at sprint close/retro**: Reporter surfaces archival candidates with reasons, human approves at Gate 4, approved cards move to a greppable cold archive. By review, not by clock. Integrated into WS2 + §1 metric + §4.
- **Q2 — QUICKSTART form.** ✅ RESOLVED 2026-06-01. A short section inside `README.md` (no new file to drift) + repoint the `cleargate init` final banner at it. Integrated into WS1 + §4.
- **Q4 — sequencing vs CR-070.** ✅ RESOLVED 2026-06-01. CR-070 and EPIC-043 touch mostly different files (CR-070: enforcement.md / CLAUDE.md / state scripts; EPIC-043: README / qa.md / wiki-ingest / cli / templates / FLASHCARD), so collision risk is low and they can run independently. Slot the Approved-but-unscheduled CR-070 into the same cleanup sprint, its story ordered before WS1. Orchestration detail, no further human input needed.
- **Q5 — target date.** ✅ RESOLVED 2026-06-01. "Doesn't matter" — `target_date` stays a flexible placeholder; this is its own small cleanup sprint, date set at sprint-init time.

- **Q3 — WS4 risk acceptance.** ✅ RESOLVED 2026-06-01. Owner chose (a): KEEP WS4 conditional. The two Architect re-entries (TPV + post-flight) fire only when `pre_gate_runner.sh` flags something (demotion/bounce/surface drift); clean stories skip both (6→5 dispatches), risky stories keep the full Architect re-read. WS4 stays IN-SCOPE.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity — Ready for Sprint Planning / Decomposition**

*Evaluate each criterion against its literal text. If you substituted an interpretation, leave the box unchecked and surface the substitution in the Brief.*

Requirements to pass to Green (Ready for Coding Agent):
- [ ] Proposal document has `approved: true`. — **N/A: proposal step retired (CR-025); waiver recorded via frontmatter `proposal_gate_waiver: true` + `approved_by`/`approved_at` per feedback_proposal_gate_waiver. Left unchecked because the literal criterion references a Proposal doc that does not exist; surfaced in Brief. Gate predicate `parent-approved` is satisfied by the waiver.**
- [x] The `<agent_context>` block is complete and validated.
- [x] §4 Technical Grounding contains 100% real, verified file paths (grep-verified 2026-06-01).
- [x] §6 AI Interrogation Loop is empty — all 5 questions resolved 2026-06-01 (Q1 redesigned to retro-curation; Q2/Q4/Q5 defaults accepted; Q3 = keep WS4 conditional) and integrated into §2/§4/§5.
- [x] 0 "TBDs" exist in the document.
- [x] §Existing Surfaces cites at least one source-tree path.
- [x] §Why not simpler? has both sub-bullets answered.
