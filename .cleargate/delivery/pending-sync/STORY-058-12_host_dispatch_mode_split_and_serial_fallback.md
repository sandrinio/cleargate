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
updated_at: 2026-09-25T22:40:09Z
created_at_version: cleargate@0.26.1
updated_at_version: 31969ea3-dirty
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-09-25T22:40:09Z
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
  input: 0
  output: 0
  cache_creation: 0
  cache_read: 0
  model: claude-opus-5-5
  last_stamp: 2026-09-26T13:53:26Z
  sessions:
    - session: 75d958ba-2473-408d-b4db-e15b774ad28f
      model: claude-opus-5-5
      input: 0
      output: 0
      cache_read: 0
      cache_creation: 0
      ts: 2026-09-25T19:55:17Z
---

# STORY-058-12: Host dispatch-mode split — Claude wave dispatch stays, serial fallback for hosts without a Workflow primitive

**Milestone:** M6 — Codex runtime validation (see §1.4 OQ1)

**Complexity:** L3 — the orchestration playbook, a net-new dispatch contract, a serial driver, and the host-adapter field that selects between them.

## 1. The Spec (The Contract)

### 1.1 User Story
As a Codex user running a ClearGate sprint, I want sprint-execution instructions that dispatch on a host with no Workflow tool, so that the five-agent loop runs to completion instead of halting at wave 1.

### 1.2 Detailed Requirements
- `cleargate-cli/scaffold/hosts/claude/.claude/skills/sprint-execution/SKILL.md` stays the single source of host-generic orchestration. This story does **not** restructure, renumber, or re-order it: EPIC-058 line 67 makes any Claude-observable behavior change a release blocker, and §C.0.1 is referenced by name from `cleargate-protocol.md` §23 and from SKILL.md:275 itself.
- Exactly two additive pointer insertions are permitted in `SKILL.md`: one after the §2 mandate (line 104) and one in §C.0 (after line 269). Each names the fallback contract for hosts that have no `/workflows` primitive. Every other line, heading, and cross-reference stays byte-identical to the canonical `SKILL.md` at this story's integration base, which already carries CR-124's §A.4 edits and its new §C.0.2 (inside the A2 range, so the Codex rendering replaces it with R2). The inserted texts are pinned verbatim in the M6 plan (P1 after the §2 paragraph beginning "There is one and only one way a sprint executes"; P2 after the §C.0 paragraph beginning "A single-story wave is one segment"); each insertion is one empty line plus one paragraph line.
- Author `cleargate-cli/scaffold/hosts/claude/.claude/skills/sprint-execution/dispatch-serial.md` — net-new, containing zero host-specific tool-call syntax, defining the serial dispatch contract in full.
- The serial contract MUST reproduce, without weakening: per-story ClearGate-managed worktree creation (`git worktree add .worktrees/STORY-X -b story/STORY-X sprint/S-NN`, launch_wave.mjs:112-115); the flashcard write-gate at its original per-story granularity (`cleargate-enforcement.md` §4.3, the blocking serial step); exactly-once ledger attribution through the existing dispatch-marker → `SubagentStop` chain on hosts that expose it; single-writer serial merge onto `sprint/S-NN`; the §22 true-blocker halt; and idempotent re-dispatch after a blocker.
- The serial contract MUST NOT copy three mechanisms that exist only as `parallel()` workarounds: the `SKIP_FLASHCARD_GATE=1` suppression window (SKILL.md:275, :580 — it exists because per-thunk child env is not settable, and copying it would silently widen the flashcard blind spot); RUN_ID-keyed barrier attribution (launch_wave.mjs:14-24 — it exists because `PreToolUse` never fires and `SubagentStop` carries the orchestrator's session id under a wave); and verdict-return-instead-of-halt (launch_wave.mjs:13 — a serial loop can halt synchronously in its own turn, which is strictly better).
- Dispatch-mode selection is an **install-time, static** property of the host adapter, not a runtime probe: extend the `HostAdapter` contract from [[STORY-058-03]] with a `dispatchMode: "wave-parallel" | "serial"` field. Claude resolves to `wave-parallel`; Codex resolves to `serial`.
- The installed Codex core is a static host-specific rendering of the single canonical source: omit the Claude-only Workflow/parallel mandate and workarounds from that rendering, and explicitly instruct the reader to read `dispatch-serial.md`. The two-insertion byte-diff restriction applies to the canonical Claude source, not to generated Codex output. Verify that the rendered core preserves every host-neutral gate and role boundary.
- Ship the portable sprint-execution surface that [[STORY-058-11]] now explicitly excludes: the host-generic core plus the serial dispatch fragment, installed under `.agents/skills/sprint-execution/`.
- Implement the serial driver as `.cleargate/scripts/dispatch_serial.mjs`, importing `worktreeAddCommand` and `validateVerdicts` from `launch_wave.mjs` rather than re-deriving them, so both dispatch modes construct identical worktree commands and accept identical verdict shapes. It is also the step-wise CLI a model orchestrator drives — `next --sprint <id> --wave <wave> [--resume]` (flashcard gate, then the next story and its exact worktree command) and `record --sprint <id> --wave <wave> --verdict <file|->` (serial-mode validation; exit 3 halts) — and it never writes `token-ledger.jsonl`. Its flashcard gate is `.cleargate/scripts/lib/flashcard-gate.mjs`, a port of `pending-task-sentinel.sh`'s scan pinned to the hook by a parity test; both files ship in `cleargate-cli/scaffold/core` with byte-identical outer twins.
- Preserve the common verdict envelope (`storyId`, run identity, GREEN/ESCALATED/BLOCKED, counters, blocker) without inventing token usage. The existing validator requires numeric token fields: extend it with a serial-only opt-in that accepts `tokens: { metering: "unavailable" }` as an additive union branch. Its default wave path must keep accepting/rejecting exactly the existing measured-token contract. Serial consumers must not append a usage-ledger row for unavailable metering; dispatch identity and state transitions remain required. Cover legacy acceptance/rejection and explicit serial unavailable acceptance in tests. The opt-in is `validateVerdicts(verdicts, { mode: 'serial' })`; with no second argument (or `{ mode: 'wave' }`) the validator accepts and rejects exactly as before. Serial mode also accepts `devSha: null` / `qaSha: null` on a non-GREEN verdict — a story blocked before any commit has no SHA, and a fake one would be invented evidence; GREEN still requires both.
- `launch_wave.mjs`'s validator is covered today only by the sealed STORY-033-04 barrier tests and BUG-034's restore test, both of which read the meta-repo's live copy. This story adds canonical-copy coverage: a default-mode corpus that must accept and reject exactly as the pre-story file does, the serial-mode branch, and the serial driver.
- The installer reads `dispatchMode` through `payloadFilter`: a path under `.agents/skills/sprint-execution/` is installed only when a selected host that declares the `.agents` shared root also declares `dispatchMode: serial`. The Codex rendering is generated by `cleargate-cli/scripts/codex-sprint-execution.mjs` from the canonical `SKILL.md` (five anchored replacements; a missing anchor or a surviving Workflow token fails the build) and written with a byte-identical `dispatch-serial.md` to `cleargate-cli/scaffold/core/.agents/skills/sprint-execution/` by `build-codex-payload.mjs --write`; prebuild `--check` fails on drift.
- Protocol §23 gains one host-boundary sentence and §23.5 (the serial contract); `cleargate-enforcement.md` gains §17 (Host Dispatch Modes) and an updated §16 bullet 10. Each is a canonical `cleargate-cli/scaffold/core` edit with a byte-identical outer twin.
- "Contract-first plans (CR-124): `dispatch-serial.md` §2 gains the paragraph pinned in the SPRINT-41 re-plan (RP-A16) — a serial host runs a `schema_version: 2` plan's derived `waves` in order, never cuts a story from a `contracts[]` branch, and cuts each story from `sprint/S-NN` after its `upstream` has merged."

### 1.3 Out of Scope
- Any Codex-side wave/parallel scheduler. Serial is the fallback, not a port of `parallel()`.
- [[EPIC-055]]'s scheduler automation — Claude-path concurrency, unaffected; CR-124's contract-first protocol applies to wave-parallel hosts, and serial hosts read a `schema_version: 2` plan's derived waves in order (dispatch-serial.md §2).
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
- [ ] Run the dispatch-path probe (`CLEARGATE_CLAUDE_E2E=1 npm run test:file -- test/e2e/claude-dispatch-path.red.integration.node.test.ts`): a headless Claude Code session reading the edited playbook answers HALT, and one reading the Codex rendering answers SERIAL. A live `/workflows` wave cannot run under SPRINT-41's by-hand execution ruling (R1); RS-5's clean-room Claude baseline is the install-level witness.
- [ ] Inspect the installed `.agents/skills/sprint-execution/` tree and confirm it contains no Workflow-tool instruction.

## 3. The Implementation Guide

*Re-declared 2026-09-25 after STORY-058-01 (M1.md §D4 + STORY-058-01-arch.md §5): canonical paths → `cleargate-cli/scaffold/{core,hosts/claude}/**`. Starts only after STORY-058-02 merges, since it reads canonical through `cleargate-cli/test/helpers/scaffold-roots.ts` (created by -02). The `:104`/`:269` insertion anchors below were re-measured against `cleargate-cli/scaffold/hosts/claude/.claude/skills/sprint-execution/SKILL.md` (byte-identical to the old canonical copy) and are unchanged.*

### 3.1 Context & Files

| Item | Value |
|---|---|
| Primary File | `cleargate-cli/scaffold/hosts/claude/.claude/skills/sprint-execution/SKILL.md` |
| Related Files | `cleargate-cli/scaffold/core/.cleargate/scripts/launch_wave.mjs`, `.cleargate/scripts/launch_wave.mjs`, `cleargate-cli/scaffold/core/.cleargate/knowledge/cleargate-protocol.md`, `.cleargate/knowledge/cleargate-protocol.md`, `cleargate-cli/scaffold/core/.cleargate/knowledge/cleargate-enforcement.md`, `.cleargate/knowledge/cleargate-enforcement.md`, `cleargate-cli/src/hosts/types.ts`, `cleargate-cli/src/hosts/claude.ts`, `cleargate-cli/src/hosts/codex.ts`, `cleargate-cli/src/hosts/registry.ts`, `cleargate-cli/src/hosts/manifest-query.ts` (only if selectEntriesForHosts does not delegate to payloadFilter), `cleargate-cli/scripts/build-codex-payload.mjs`, `cleargate-cli/scripts/clean-room/codex-hooks.mjs`, `cleargate-cli/scripts/clean-room/evidence.mjs`, `cleargate-cli/test/helpers/init-fixture.ts`, `cleargate-cli/test/scaffold/portable-skills.red.node.test.ts`, `cleargate-cli/test/scripts/codex-hooks-harness.red.node.test.ts`, `cleargate-cli/test/docs/codex-enforcement-delta.red.node.test.ts`, `cleargate-cli/CHANGELOG.md` |
| New Files Needed | `cleargate-cli/scaffold/hosts/claude/.claude/skills/sprint-execution/dispatch-serial.md`, `cleargate-cli/scaffold/core/.cleargate/scripts/dispatch_serial.mjs`, `.cleargate/scripts/dispatch_serial.mjs`, `cleargate-cli/scaffold/core/.cleargate/scripts/lib/flashcard-gate.mjs`, `.cleargate/scripts/lib/flashcard-gate.mjs`, `cleargate-cli/scripts/codex-sprint-execution.mjs`, `cleargate-cli/scaffold/core/.agents/skills/sprint-execution/SKILL.md`, `cleargate-cli/scaffold/core/.agents/skills/sprint-execution/dispatch-serial.md`, `cleargate-cli/test/scripts/dispatch-verdict-modes.red.node.test.ts`, `cleargate-cli/test/scripts/dispatch-serial.red.node.test.ts`, `cleargate-cli/test/scripts/dispatch-serial-cli.red.node.test.ts`, `cleargate-cli/test/scripts/flashcard-gate-parity.red.node.test.ts`, `cleargate-cli/test/scaffold/skill-md-serial-pointers.red.node.test.ts`, `cleargate-cli/test/scaffold/dispatch-serial-doc.red.node.test.ts`, `cleargate-cli/test/docs/serial-dispatch-docs.red.node.test.ts`, `cleargate-cli/test/scripts/serial-twins.red.node.test.ts`, `cleargate-cli/test/hosts/dispatch-mode.red.node.test.ts`, `cleargate-cli/test/scripts/codex-sprint-execution-render.red.node.test.ts`, `cleargate-cli/test/commands/init-codex-sprint-execution.red.node.test.ts`, `cleargate-cli/test/e2e/claude-dispatch-path.red.integration.node.test.ts`, `cleargate-cli/test/fixtures/skill-pre-058-12/SKILL.md`, `cleargate-cli/test/fixtures/launch-wave-pre-058-12/launch_wave.mjs` |
| Orchestration Files | `.cleargate/delivery/pending-sync/STORY-058-12_host_dispatch_mode_split_and_serial_fallback.md`, `.cleargate/wiki/log.md`, `.cleargate/sprint-runs/SPRINT-41/reports/STORY-058-12-qa-red.md`, `.cleargate/sprint-runs/SPRINT-41/reports/STORY-058-12-tpv.md`, `.cleargate/sprint-runs/SPRINT-41/reports/STORY-058-12-dev.md`, `.cleargate/sprint-runs/SPRINT-41/reports/STORY-058-12-qa.md`, `.cleargate/sprint-runs/SPRINT-41/reports/STORY-058-12-arch.md`, `.cleargate/sprint-runs/SPRINT-41/reports/STORY-058-12-devops.md` |

### 3.2 Technical Logic

The split is textual, not structural. `SKILL.md` §2 (line 104) and §C.0 (lines 265-269) are the only two places that hard-code "there is one and only one way a sprint executes… through the Workflow tool"; both already carry a halt-if-unavailable branch. Each gains one additive sentence giving that branch a destination — the serial dispatch contract — for hosts whose adapter declares `dispatchMode: "serial"`. Nothing else in the file moves.

`dispatch-serial.md` restates, in host-neutral language, every invariant the wave path enforces through `launch_wave.mjs`, and deliberately omits the three mechanisms that exist only to work around `parallel()`. Worktree isolation, the per-story flashcard gate, ledger attribution, serial merge, the §22 halt, and idempotent resume are invariants and are restated. `SKIP_FLASHCARD_GATE` suppression, RUN_ID-keyed attribution, and verdict-instead-of-halt are workarounds and are omitted — under serial dispatch the original, tighter rules in `cleargate-enforcement.md` §4.3 already govern unmodified, and re-importing the wider window would be a regression rather than symmetry.

`dispatch_serial.mjs` mirrors `launchWave`'s injectable-seam shape (launch_wave.mjs:264) with a `dispatchStory` seam, so tests can assert ordering, halt behavior, and env hygiene without spawning agents. It imports `worktreeAddCommand` and `validateVerdicts` from `launch_wave.mjs` rather than copying them.

Host selection happens once, at install time: `HostAdapter.dispatchMode` is read by the installer to decide which sprint-execution surface a host receives. There is no runtime detection of `/workflows`, because a host's dispatch capability is a property of the host, not of the session — the same static-delta pattern [[STORY-058-11]] already uses for Codex's missing `tools:` allowlist.

The Codex rendering's host note maps the playbook's Claude dispatch terms to Codex: `spawn_agent` with `agent_type` and `fork_turns: "none"`, then `wait_agent` until that agent's final answer. Measured on the pinned 0.154.0-alpha.6.2 (M6 plan X2–X3): `spawn_agent` returns immediately and `fork_turns` defaults to `all`. `dispatch-serial.md` itself stays host-neutral. `session-start.sh` is unchanged: its `Load skill: sprint-execution` line resolves under Codex once `.agents/skills/sprint-execution/` is installed.

"Contract-first execution: built in `OUTER/.worktrees/STORY-058-12/cleargate-cli` from `contract/S-41-dispatch` (C1 + STORY-058-11 and CR-124 Developer commits); integrates after STORY-058-10, STORY-058-11 and CR-124 merge. `launch_wave.mjs` edits stay within the header verdict-schema block and `validateVerdicts`; CR-124's `storyBases`, `integrationReady` and `launchWave({…, bases})` are untouched."

## Task Breakdown

- [ ] QA-Red: verdict modes (default-mode parity corpus vs the frozen pre-story launch_wave.mjs), serial driver and CLI, flashcard-gate hook parity, SKILL.md two-insertion guard, dispatch-serial.md doc, protocol §23.5 / enforcement §17 twins, dispatchMode filter, Codex rendering, codex init install, Claude/Codex dispatch-path probe; M2 sanctioned rows and additions
- [ ] Pass A: validateVerdicts(verdicts, { mode: 'serial' }); lib/flashcard-gate.mjs; dispatch_serial.mjs (dispatchSerial + next/record CLI); dispatch-serial.md; P1/P2 in SKILL.md; protocol §23 sentence + §23.5; enforcement §17, §16 bullet 10, Index; outer twins
- [ ] Pass B: HostAdapter.dispatchMode (claude wave-parallel, codex serial); payloadFilter serial-surface rule; codex-sprint-execution.mjs rendering; build-codex-payload.mjs generates .agents/skills/sprint-execution; codex.live.skills expects sprint-execution; CHANGELOG
- [ ] Prove the Claude path unchanged: the two-insertion byte guard, headings unchanged, and the headless dispatch-path probe answers HALT on Claude Code
- [ ] Re-sync the live /.claude/ instance at RS-5 and confirm the pointer lines and dispatch-serial.md are present there
- [ ] Integrate: merge cli main after STORY-058-10, STORY-058-11 and CR-124 merge; re-verify renderer anchors on the integrated SKILL.md; QA-Verify and post-flight on the integrated tree

## 4. Quality Gates

### 4.1 Minimum Test Expectations

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 8 | Claude-path byte-diff guard; strict ordering; halt; resume; no skip mutation; legacy measured verdict acceptance/rejection; serial-only unavailable branch; no synthetic usage rows |
| Integration tests | 1 | Installing for a `serial` host emits the core plus the serial fragment and no Workflow-tool instruction |
| E2E / acceptance tests | 1 | Dispatch-path probe: headless Claude Code on the edited playbook answers HALT (Codex rendering: SERIAL); RS-5 re-runs the clean-room Claude baseline |

### 4.2 Definition of Done (The Gate)
- [ ] Minimum test expectations (§4.1) met.
- [ ] All Gherkin scenarios from §2.1 covered.
- [ ] Peer/Architect Review passed.
- [ ] `SKILL.md` differs from its pre-story copy by exactly the two approved pointer insertions.
- [ ] The live `/.claude/` instance carries the same pointer lines as canonical, verified after re-sync.
- [ ] `dispatch-serial.md` contains no host-specific tool-call syntax.
- [ ] Serial unavailable metering is explicit; default wave verdict validation is unchanged and no unavailable-usage record is synthesized as zero.

## Existing Surfaces

- **Surface:** `cleargate-cli/scaffold/hosts/claude/.claude/skills/sprint-execution/SKILL.md:104` — the single sentence that hard-codes the Workflow tool as the only dispatch path and halts when it is unavailable; one of the two insertion points.
- **Surface:** `cleargate-cli/scaffold/hosts/claude/.claude/skills/sprint-execution/SKILL.md:265` — §C.0, the `launch_wave` contract and second insertion point.
- **Surface:** `.cleargate/scripts/launch_wave.mjs` — `worktreeAddCommand`, `validateVerdicts`, `mintRunId`, and the injectable-seam shape the serial driver mirrors and imports rather than duplicates.
- **Surface:** `.cleargate/knowledge/cleargate-enforcement.md` — §4.3's per-story flashcard barrier, the original rule the serial path restores unmodified.
- **Surface:** `.cleargate/delivery/pending-sync/PROPOSAL-074_Antigravity_2_Host_Port.md` — `HostAdapter.subagentDispatchMode`, the existing precedent for expressing dispatch style as a host-adapter field.
- **Surface:** `cleargate-cli/test/scripts/wave-execution-barrier.red.node.test.ts`, `cleargate-cli/test/scripts/bug-034-flashcard-gate-restore.node.test.ts` — today's only validator coverage (reads the outer live launch_wave.mjs).
- **Coverage of this requirement:** partial — the halt branch and the invariants exist, but no fallback destination and no serial driver exist today.

## Prior work

- [[EPIC-058]] line 130 carries this exact scope as an unchecked, undecomposed Scope-IN bullet; none of [[STORY-058-01]] through [[STORY-058-11]] claims it.
- [[EPIC-055]] owns wave scheduling as a DAG — Claude-path concurrency, not host portability; no overlap with a serial fallback.
- [[EPIC-033]] built the wave execution model this story splits; [[PROPOSAL-074]] defines the `subagentDispatchMode` precedent.
- [[STORY-058-11]] previously claimed verbatim installation of all shared skills; amended 2026-09-11 to exclude `sprint-execution` and point here.

## Why not simpler?

- **Smallest existing surface that could carry this:** `cleargate-cli/scaffold/hosts/claude/.claude/skills/sprint-execution/SKILL.md:267` — the existing "if `/workflows` is unavailable, halt" branch.
- **Why isn't extension / parameterization / config sufficient?** The halt branch is the whole problem: it is a correct behavior with no destination. Parameterizing it needs somewhere to point, and that destination — a complete dispatch contract that reproduces worktree isolation, the flashcard gate, ledger attribution, and blocker semantics without any `parallel()` workaround — does not exist in any form today. A config flag that toggles between "halt" and "halt" is not a fallback. The alternative, forking `SKILL.md` per host, is what EPIC-058's "normalize into shared handlers" rule and its Claude-regression-baseline rule both forbid.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity** — restored 2026-09-26 by the SPRINT-41 contract-first re-plan (RP-A16): the dispatch contract carries the build/integrate phases for serial hosts (dispatch-serial.md §2 paragraph) and the SKILL.md baseline is post-CR-124. Owner decisions are recorded in §1.4. Readiness is not implementation or runtime evidence; verification and DoD remain unchecked.

- [x] Gherkin scenarios completely cover all detailed requirements in §1.2.
- [x] Implementation Guide (§3) maps to specific, verified file paths from the approved Epic and verified codebase grounding.
- [x] No "TBDs" exist anywhere in the specification or technical logic.
- [x] Existing Surfaces cites at least one source-tree path or explicitly states "none — net-new."
- [x] Why not simpler? has both sub-bullets answered (no "TBD" / no "{}").
