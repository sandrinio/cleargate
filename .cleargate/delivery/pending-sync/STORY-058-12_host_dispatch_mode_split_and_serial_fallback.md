---
story_id: STORY-058-12
parent_epic_ref: EPIC-058
parent_cleargate_id: null
sprint_cleargate_id: null
carry_over: false
status: Ready
approved: true
approved_by: sandrinio
approved_at: 2026-09-11T22:19:09Z
ambiguity: 🟢 Low
context_source: Defect review of [[STORY-058-10]] / [[STORY-058-11]] on direct owner instruction 2026-09-11. Decomposes [[EPIC-058]]'s own unclaimed Scope-IN bullet (line 130, 'Split shared skills from host-specific sprint dispatch instructions'). Grounded in a full read of cleargate-planning/.claude/skills/sprint-execution/SKILL.md, .cleargate/scripts/launch_wave.mjs, and .cleargate/knowledge/cleargate-enforcement.md; no path in this story is inferred.
actor: Codex user running a ClearGate sprint
complexity_label: L3
parallel_eligible: n
expected_bounce_exposure: med
lane: standard
db_write_set: []
deferred_verification: []
created_at: 2026-09-11T00:00:00Z
updated_at: 2026-09-11T22:29:12Z
created_at_version: cleargate@0.26.1
updated_at_version: 11c29fd3-dirty
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-09-11T22:29:14Z
  transition: ready-for-execution
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  sessions: []
---

# STORY-058-12: Host dispatch-mode split — Claude wave dispatch stays, serial fallback for hosts without a Workflow primitive

**Milestone:** M6 — Codex runtime validation (see §1.4 OQ1)

**Complexity:** L3 — the orchestration playbook, a net-new dispatch contract, a serial driver, and the host-adapter field that selects between them.

## 1. The Spec (The Contract)

### 1.1 User Story
As a Codex user running a ClearGate sprint, I want sprint-execution instructions that dispatch on a host with no Workflow tool, so that the five-agent loop runs to completion instead of halting at wave 1.

### 1.2 Detailed Requirements
- `cleargate-planning/.claude/skills/sprint-execution/SKILL.md` stays the single source of host-generic orchestration. This story does **not** restructure, renumber, or re-order it: EPIC-058 line 67 makes any Claude-observable behavior change a release blocker, and §C.0.1 is referenced by name from `cleargate-protocol.md` §23 and from SKILL.md:275 itself.
- Exactly two additive pointer insertions are permitted in `SKILL.md`: one after the §2 mandate (line 104) and one in §C.0 (after line 269). Each names the fallback contract for hosts that have no `/workflows` primitive. Every other line, heading, and cross-reference stays byte-identical.
- Author `cleargate-planning/.claude/skills/sprint-execution/dispatch-serial.md` — net-new, containing zero host-specific tool-call syntax, defining the serial dispatch contract in full.
- The serial contract MUST reproduce, without weakening: per-story ClearGate-managed worktree creation (`git worktree add .worktrees/STORY-X -b story/STORY-X sprint/S-NN`, launch_wave.mjs:112-115); the flashcard write-gate at its original per-story granularity (`cleargate-enforcement.md` §4.3, the blocking serial step); exactly-once ledger attribution through the existing dispatch-marker → `SubagentStop` chain on hosts that expose it; single-writer serial merge onto `sprint/S-NN`; the §22 true-blocker halt; and idempotent re-dispatch after a blocker.
- The serial contract MUST NOT copy three mechanisms that exist only as `parallel()` workarounds: the `SKIP_FLASHCARD_GATE=1` suppression window (SKILL.md:275, :580 — it exists because per-thunk child env is not settable, and copying it would silently widen the flashcard blind spot); RUN_ID-keyed barrier attribution (launch_wave.mjs:14-24 — it exists because `PreToolUse` never fires and `SubagentStop` carries the orchestrator's session id under a wave); and verdict-return-instead-of-halt (launch_wave.mjs:13 — a serial loop can halt synchronously in its own turn, which is strictly better).
- Dispatch-mode selection is an **install-time, static** property of the host adapter, not a runtime probe: extend the `HostAdapter` contract from [[STORY-058-03]] with a `dispatchMode: "wave-parallel" | "serial"` field. Claude resolves to `wave-parallel`; Codex resolves to `serial`.
- The installed Codex core is a static host-specific rendering of the single canonical source: omit the Claude-only Workflow/parallel mandate and workarounds from that rendering, and explicitly instruct the reader to read `dispatch-serial.md`. The two-insertion byte-diff restriction applies to the canonical Claude source, not to generated Codex output. Verify that the rendered core preserves every host-neutral gate and role boundary.
- Ship the portable sprint-execution surface that [[STORY-058-11]] now explicitly excludes: the host-generic core plus the serial dispatch fragment, installed under `.agents/skills/sprint-execution/`.
- Implement the serial driver as `.cleargate/scripts/dispatch_serial.mjs`, importing `worktreeAddCommand` and `validateVerdicts` from `launch_wave.mjs` rather than re-deriving them, so both dispatch modes construct identical worktree commands and accept identical verdict shapes.
- Preserve the common verdict envelope (`storyId`, run identity, GREEN/ESCALATED/BLOCKED, counters, blocker) without inventing token usage. The existing validator requires numeric token fields: extend it with a serial-only opt-in that accepts `tokens: { metering: "unavailable" }` as an additive union branch. Its default wave path must keep accepting/rejecting exactly the existing measured-token contract. Serial consumers must not append a usage-ledger row for unavailable metering; dispatch identity and state transitions remain required. Cover legacy acceptance/rejection and explicit serial unavailable acceptance in tests.
- `launch_wave.mjs` has zero test coverage today. This story lands first-ever coverage for both the wave verdict contract it reuses and the serial path it adds.

### 1.3 Out of Scope
- Any Codex-side wave/parallel scheduler. Serial is the fallback, not a port of `parallel()`.
- [[EPIC-055]]'s DAG wave scheduling — that is Claude-path concurrency work and is unaffected.
- Per-subagent token metering for Codex — deferred from SPRINT-41; dispatch identity remains required, while unavailable usage stays unavailable rather than becoming synthetic zero rows.
- The Copilot adapter — deferred from SPRINT-41 pending the owner's scope question.
- Changing Claude Code's default execution path in any way. The Workflow-tool path stays the default and stays byte-identical.
- Proving the loop actually completes under Codex — that is [[STORY-058-13]], which consumes this story's output.

### 1.4 Open Questions

> Resolved by owner continuation on 2026-09-12 local time (2026-09-11 UTC).

- **Question (OQ1):** does this land in a new milestone M6, or fold into M5 beside the Codex payload stories?
- **Recommended:** new M6. `-12` and `-13` are runtime/validation work that depends on M5's payload and role translation landing first, mirroring why clean-room verification earned its own M4.
- **Human decision:** Approved by sandrinio on 2026-09-11T22:19:09Z through “continue please” after the recommended decision brief: retain M6 after M5.

- **Question (OQ2):** should a serial run still emit the `launch_wave` verdict shape (GREEN / ESCALATED / BLOCKED + blocker discriminant), even though it can halt synchronously and does not need a verdict to survive a barrier?
- **Recommended:** yes — emit the same shape for schema uniformity with the Reporter, the token ledger, and the sprint dashboard, while still halting synchronously on a true blocker. Uniform consumers, better halt semantics.
- **Human decision:** Approved by sandrinio on 2026-09-11T22:19:09Z through “continue please” after the recommended decision brief: emit the shared GREEN / ESCALATED / BLOCKED verdict and halt synchronously on a true blocker.

- **Question (OQ3):** does the portable surface ship as two files mirroring the Claude layout (core `SKILL.md` + `dispatch-serial.md`), or as one concatenated file for hosts whose skill loader reads a single `SKILL.md`?
- **Recommended:** two files, mirroring Claude. If a host's loader proves single-file-only during [[STORY-058-13]], concatenate at install time rather than forking the source.
- **Human decision:** Approved by sandrinio on 2026-09-11T22:19:09Z through “continue please” after the recommended decision brief: ship two files, with an explicit instruction to read dispatch-serial.md; no source fork.

### 1.5 Risks

- **Risk:** the live `/.claude/` instance is stale against canonical (8-12 drifted files per `cleargate doctor`), so pointer edits made in canonical will not reach the running orchestrator until [[BUG-085]]'s re-sync lands.
- **Mitigation:** sequence after BUG-085's M0 re-sync; the story's DoD requires the pointer lines to be present in the live instance, not only in canonical.

- **Risk:** two dispatch contracts drift apart over time — a gate added to the wave path but not the serial one is invisible until a Codex sprint silently skips it.
- **Mitigation:** the serial driver imports its worktree and verdict seams from `launch_wave.mjs`; a test asserts both modes construct the identical worktree command, so shared mechanics cannot fork silently.

- **Risk:** an edit to `SKILL.md` renumbers or re-orders a section that `cleargate-protocol.md` §23 and SKILL.md:275 reference by name, breaking cross-references that no test covers.
- **Mitigation:** the Claude-path-unchanged guard diffs the file and fails on any change other than the two approved insertions.

## 2. The Truth (Executable Tests)

### 2.1 Acceptance Criteria (Gherkin)

```gherkin
Feature: Host dispatch-mode split

  Scenario: The Claude path is unchanged
    Given the sprint-execution SKILL.md before this story
    When the story's edits are applied
    Then the only differences are the two approved pointer insertions at section 2 and section C.0
    And no heading, section number, or cross-reference has changed

  Scenario: A host without a Workflow primitive resolves to the serial contract
    Given a host adapter whose dispatchMode is "serial"
    When the sprint-execution surface is installed for that host
    Then the serial dispatch contract is installed alongside the host-generic core
    And no instruction in the installed surface requires the Workflow tool

  Scenario: Serial dispatch runs one story at a time in its own worktree
    Given a wave containing three stories and a host in serial dispatch mode
    When the serial driver runs that wave
    Then the stories are dispatched strictly one at a time in wave order
    And each story runs inside its own .worktrees/STORY-X created from the sprint branch
    And the worktree command is byte-identical to the one the wave path constructs

  Scenario: A true blocker halts the serial loop synchronously
    Given a serial run in which the second of three stories reports a true blocker
    When the driver processes that blocker
    Then the loop halts for the human in the same turn
    And the third story is never dispatched
    And resuming after the blocker re-dispatches only the blocked story

  Scenario: The flashcard write-gate is never suppressed in a serial run
    Given a serial dispatch run of any size
    When the run completes or halts
    Then SKIP_FLASHCARD_GATE was never set or mutated at any point
    And the per-story flashcard gate ran between every pair of consecutive stories
```

### 2.2 Verification Steps (Manual)
- [ ] Diff `SKILL.md` against its pre-story copy and confirm only the two pointer lines differ.
- [ ] Run one real Claude sprint wave after the edits and confirm the Workflow path is chosen and behaves as before.
- [ ] Inspect the installed `.agents/skills/sprint-execution/` tree and confirm it contains no Workflow-tool instruction.

## 3. The Implementation Guide

### 3.1 Context & Files

| Item | Value |
|---|---|
| Primary File | `cleargate-planning/.claude/skills/sprint-execution/SKILL.md` |
| Related Files | `.cleargate/scripts/launch_wave.mjs`, `.cleargate/knowledge/cleargate-enforcement.md`, `.cleargate/knowledge/cleargate-protocol.md`, `cleargate-cli/src/hosts/types.ts` |
| New Files Needed | Yes — `cleargate-planning/.claude/skills/sprint-execution/dispatch-serial.md`, `.cleargate/scripts/dispatch_serial.mjs`, `.cleargate/scripts/dispatch_serial.test.mjs` |

### 3.2 Technical Logic

The split is textual, not structural. `SKILL.md` §2 (line 104) and §C.0 (lines 265-269) are the only two places that hard-code "there is one and only one way a sprint executes… through the Workflow tool"; both already carry a halt-if-unavailable branch. Each gains one additive sentence giving that branch a destination — the serial dispatch contract — for hosts whose adapter declares `dispatchMode: "serial"`. Nothing else in the file moves.

`dispatch-serial.md` restates, in host-neutral language, every invariant the wave path enforces through `launch_wave.mjs`, and deliberately omits the three mechanisms that exist only to work around `parallel()`. Worktree isolation, the per-story flashcard gate, ledger attribution, serial merge, the §22 halt, and idempotent resume are invariants and are restated. `SKIP_FLASHCARD_GATE` suppression, RUN_ID-keyed attribution, and verdict-instead-of-halt are workarounds and are omitted — under serial dispatch the original, tighter rules in `cleargate-enforcement.md` §4.3 already govern unmodified, and re-importing the wider window would be a regression rather than symmetry.

`dispatch_serial.mjs` mirrors `launchWave`'s injectable-seam shape (launch_wave.mjs:264) with a `dispatchStory` seam, so tests can assert ordering, halt behavior, and env hygiene without spawning agents. It imports `worktreeAddCommand` and `validateVerdicts` from `launch_wave.mjs` rather than copying them.

Host selection happens once, at install time: `HostAdapter.dispatchMode` is read by the installer to decide which sprint-execution surface a host receives. There is no runtime detection of `/workflows`, because a host's dispatch capability is a property of the host, not of the session — the same static-delta pattern [[STORY-058-11]] already uses for Codex's missing `tools:` allowlist.

## Task Breakdown

- [ ] Add the `dispatchMode` field to the `HostAdapter` contract and set it for the Claude and Codex adapters.
- [ ] Author `dispatch-serial.md` — every reproduced invariant, every deliberately-omitted workaround, with the reason for each omission stated in the file.
- [ ] Insert the two pointer sentences into `SKILL.md` §2 and §C.0; change nothing else.
- [ ] Add the Claude-path-unchanged guard that fails on any other diff.
- [ ] Implement `.cleargate/scripts/dispatch_serial.mjs` with an injectable `dispatchStory` seam, importing `worktreeAddCommand` and `validateVerdicts` from `launch_wave.mjs`.
- [ ] Write the serial-driver unit tests: strict ordering, halt-on-blocker, resume-only-the-blocked-story, and `SKIP_FLASHCARD_GATE` never set.
- [ ] Extend the imported verdict validator with the explicit serial unavailable-metering branch; retain strict default wave validation and prove unavailable tokens create no synthetic usage rows.
- [ ] Wire the portable sprint-execution surface (core + serial fragment) into the Codex payload under `.agents/skills/sprint-execution/`.
- [ ] Re-sync the live `/.claude/` instance and confirm the pointer lines are present there, per CLAUDE.md's dogfood-split rule.

## 4. Quality Gates

### 4.1 Minimum Test Expectations

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 8 | Claude-path byte-diff guard; strict ordering; halt; resume; no skip mutation; legacy measured verdict acceptance/rejection; serial-only unavailable branch; no synthetic usage rows |
| Integration tests | 1 | Installing for a `serial` host emits the core plus the serial fragment and no Workflow-tool instruction |
| E2E / acceptance tests | 1 | One Claude wave still runs through the Workflow path unchanged after the edits |

### 4.2 Definition of Done (The Gate)
- [ ] Minimum test expectations (§4.1) met.
- [ ] All Gherkin scenarios from §2.1 covered.
- [ ] Peer/Architect Review passed.
- [ ] `SKILL.md` differs from its pre-story copy by exactly the two approved pointer insertions.
- [ ] The live `/.claude/` instance carries the same pointer lines as canonical, verified after re-sync.
- [ ] `dispatch-serial.md` contains no host-specific tool-call syntax.
- [ ] Serial unavailable metering is explicit; default wave verdict validation is unchanged and no unavailable-usage record is synthesized as zero.

## Existing Surfaces

- **Surface:** `cleargate-planning/.claude/skills/sprint-execution/SKILL.md:104` — the single sentence that hard-codes the Workflow tool as the only dispatch path and halts when it is unavailable; one of the two insertion points.
- **Surface:** `cleargate-planning/.claude/skills/sprint-execution/SKILL.md:265` — §C.0, the `launch_wave` contract and second insertion point.
- **Surface:** `.cleargate/scripts/launch_wave.mjs` — `worktreeAddCommand`, `validateVerdicts`, `mintRunId`, and the injectable-seam shape the serial driver mirrors and imports rather than duplicates.
- **Surface:** `.cleargate/knowledge/cleargate-enforcement.md` — §4.3's per-story flashcard barrier, the original rule the serial path restores unmodified.
- **Surface:** `.cleargate/delivery/pending-sync/PROPOSAL-074_Antigravity_2_Host_Port.md` — `HostAdapter.subagentDispatchMode`, the existing precedent for expressing dispatch style as a host-adapter field.
- **Coverage of this requirement:** partial — the halt branch and the invariants exist, but no fallback destination and no serial driver exist today.

## Prior work

- [[EPIC-058]] line 130 carries this exact scope as an unchecked, undecomposed Scope-IN bullet; none of [[STORY-058-01]] through [[STORY-058-11]] claims it.
- [[EPIC-055]] owns wave scheduling as a DAG — Claude-path concurrency, not host portability; no overlap with a serial fallback.
- [[EPIC-033]] built the wave execution model this story splits; [[PROPOSAL-074]] defines the `subagentDispatchMode` precedent.
- [[STORY-058-11]] previously claimed verbatim installation of all shared skills; amended 2026-09-11 to exclude `sprint-execution` and point here.

## Why not simpler?

- **Smallest existing surface that could carry this:** `cleargate-planning/.claude/skills/sprint-execution/SKILL.md:267` — the existing "if `/workflows` is unavailable, halt" branch.
- **Why isn't extension / parameterization / config sufficient?** The halt branch is the whole problem: it is a correct behavior with no destination. Parameterizing it needs somewhere to point, and that destination — a complete dispatch contract that reproduces worktree isolation, the flashcard gate, ledger attribution, and blocker semantics without any `parallel()` workaround — does not exist in any form today. A config flag that toggles between "halt" and "halt" is not a fallback. The alternative, forking `SKILL.md` per host, is what EPIC-058's "normalize into shared handlers" rule and its Claude-regression-baseline rule both forbid.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity** — owner decisions are recorded in §1.4. Readiness is not implementation or runtime evidence; verification and DoD remain unchecked.

- [x] Gherkin scenarios completely cover all detailed requirements in §1.2.
- [x] Implementation Guide (§3) maps to specific, verified file paths from the approved Epic and verified codebase grounding.
- [x] No "TBDs" exist anywhere in the specification or technical logic.
- [x] Existing Surfaces cites at least one source-tree path or explicitly states "none — net-new."
- [x] Why not simpler? has both sub-bullets answered (no "TBD" / no "{}").
