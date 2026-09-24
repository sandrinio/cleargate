---
story_id: STORY-058-13
parent_epic_ref: EPIC-058
parent_cleargate_id: null
sprint_cleargate_id: null
carry_over: false
status: Ready
approved: true
approved_by: sandrinio
approved_at: 2026-09-11T22:19:09Z
ambiguity: 🟢 Low
context_source: "Defect review of [[STORY-058-10]] / [[STORY-058-11]] on direct owner instruction 2026-09-11. [[EPIC-058]]'s success metric 'one real story completes the Architect → QA-Red → Developer → QA-Verify → DevOps loop in Codex' is owned by no story: [[STORY-058-08]] and [[STORY-058-09]] build clean-room verification for Claude only, and [[STORY-058-11]]'s single Codex-side manual check verifies that roles are listed and delegable, not that a story completes. Grounded in a full read of STORY-058-08/-09/-10/-11, cleargate-planning/.claude/settings.json, and a tooling survey of this machine's Codex install."
actor: ClearGate maintainer verifying a release
complexity_label: L3
parallel_eligible: n
expected_bounce_exposure: med
lane: standard
db_write_set: []
deferred_verification: []
created_at: 2026-09-11T00:00:00Z
updated_at: 2026-09-11T22:25:54Z
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

# STORY-058-13: Clean-room Codex loop-completion evidence — one real story, end to end

**Milestone:** M6 — Codex runtime validation (see §1.4 OQ2)

**Complexity:** L3 — a real multi-dispatch session against an alpha-stage external CLI, with an evidence artifact that gates sprint close.

## 1. The Spec (The Contract)

### 1.1 User Story
As a ClearGate maintainer verifying a release, I want one real story driven through the full execution loop inside a live Codex session, so that "ClearGate runs under Codex" is backed by evidence rather than by file presence.

### 1.2 Detailed Requirements
- Mirror [[STORY-058-09]]'s structure exactly: a clean-room directory outside this repository, installed from the packed artifact, exercised by a real host session, producing a written evidence artifact that gates sprint close.
- Pin the primary artifact to a dedicated standalone Codex `0.154.0-alpha.6.2` install, recording its absolute path, release origin, version output, and SHA-256 before execution. The inspected embedded binary is `/Applications/ChatGPT.app/Contents/Resources/codex`, also `0.154.0-alpha.6.2` (SHA-256 `ecad78dbf98adb89ec475edac86630406cbe59d9f3070b17d88065f136b94bcb`). It is a same-version secondary smoke target, not a substitute for primary standalone evidence. No standalone install has yet been made. A different version requires an explicit approach amendment.
- Isolate host state: every clean-room run sets a dedicated `CODEX_HOME` so the run never reads or writes this user's personal Codex configuration, sessions, or MCP registrations.
- Drive one real story through four dispatches — Architect, QA-Red, Developer, QA-Verify — and a DevOps-executed merge. The orchestrator must not perform the merge itself; SKILL.md's forbidden-orchestrator-patterns rule means a merge the orchestrator ran proves nothing about the loop.
- Separate `loop_transport` from `enforcement_parity` in the evidence. Both must pass for this story and the sprint's Codex-port goal to pass. Four role dispatches plus a DevOps merge prove transport only. Prove planning-first denial using an enforce-mode fixture with no active-sprint bypass, and flashcard/dispatch denial using a pending-flashcard fixture with no advisory/skip override; verify the forbidden edit/spawn did not occur, then remove the fixture condition and prove the permitted action proceeds. Missing required hooks, denials, or dispatch identity make enforcement parity fail or inconclusive, never green. A filed follow-up does not waive this condition.
- Record, per dispatch, which hooks fired and which did not: `SessionStart`, `PreToolUse` on file edits, `PostToolUse` ingest, the subagent-dispatch gate, and `SubagentStop`. A hook that did not fire is recorded as a gap, never omitted.
- Record the worktree lifecycle (creation from the sprint branch, isolation during the run, teardown at merge), the state transitions, and the merge commit SHA.
- Record token telemetry honestly: if Codex exposes no verifiable per-subagent usage, the artifact states `metering: unavailable`. Synthesizing zero-token rows is forbidden by [[EPIC-058]].
- Disclose the trust posture used. Codex gates hooks behind both workspace trust and a hook-trust prompt, and offers `--dangerously-bypass-hook-trust` for scripted runs. A human-granted trust and a bypassed one are not equivalent claims and must not be recorded as if they were.
- Extend [[STORY-058-08]]'s `cleargate verify-install` driver with the machine-checkable half for Codex — payload presence and shape, manifest host set, hook wiring, `[features] hooks = true`, doctor exit code — and leave only the irreducibly live half to the session.
- Do not restate [[STORY-058-10]]'s or [[STORY-058-11]]'s own acceptance criteria; consume them as prerequisites.
- The evidence artifact lands at `.cleargate/sprint-runs/<sprint-id>/codex-loop-evidence.md` and is a gating input to sprint close, the same way [[STORY-058-09]]'s Claude baseline is.

### 1.3 Out of Scope
- The Copilot equivalent — deferred from SPRINT-41 with the Copilot adapter.
- Implementing token-ledger metering for Codex — this story records whether telemetry exists; [[STORY-058-10]] owns the open `SubagentStop` question.
- Fixing whatever the run exposes. Defects found become their own Bug or CR items; this story's deliverable is the evidence, not the remediation.
- Any claim about Codex parity for role tool boundaries: [[STORY-058-11]] already records that Codex has no per-agent `tools:` allowlist, so QA's "never edits code" boundary is prompt-enforced during this run and the artifact must say so.
- Re-verifying the Claude baseline — that is [[STORY-058-09]], which must already be green before this story runs.

### 1.4 Open Questions

> Resolved by owner continuation on 2026-09-12 local time (2026-09-11 UTC).

- **Question (OQ1):** which Codex artifact is authoritative for this evidence — a newly pinned standalone install, or the ChatGPT-app-embedded `0.154.0-alpha.6.2` already on this machine?
- **Recommended:** pin standalone `0.154.0-alpha.6.2`; record the checksum from the actual standalone artifact, not by assuming it matches the embedded build.
- **Human decision:** Approved by sandrinio on 2026-09-11T22:19:09Z through “continue please” after the recommended decision brief: standalone 0.154.0-alpha.6.2 is authoritative; embedded same-version testing is secondary.

- **Question (OQ2):** new milestone M6, or fold into M5 beside the Codex payload stories?
- **Recommended:** M6, after [[STORY-058-12]]. This story cannot run until a dispatch mode exists for Codex.
- **Human decision:** Approved by sandrinio on 2026-09-11T22:19:09Z through “continue please” after the recommended decision brief: retain M6, with -12 before -13.

- **Question (OQ3):** is a human-witnessed trust grant followed by a scripted `codex exec` run acceptable evidence, or must every check stay fully interactive as in [[STORY-058-09]]?
- **Recommended:** human-grants trust once, then script the run and record that posture in the artifact. A `--dangerously-bypass-hook-trust` run is acceptable only as an explicitly labelled secondary data point, never as the primary evidence.
- **Human decision:** Approved by sandrinio on 2026-09-11T22:19:09Z through “continue please” after the recommended decision brief: human-granted workspace trust and trust for the exact hook content/hashes, then scripted execution; bypass testing is secondary and labelled.

- **Question (OQ4):** does "the loop ran under Codex" require the flashcard write-gate and dispatch attribution to actually fire, or is completing the four dispatches plus a DevOps merge sufficient with the enforcement gap disclosed as a follow-up?
- **Recommended:** distinguish transport from enforcement. Disclosure is mandatory but cannot substitute for a required gate firing and denying the negative control.
- **Human decision:** Approved by sandrinio on 2026-09-11T22:19:09Z through “continue please” after the recommended decision brief: require both loop transport and enforcement parity; disclose gaps, but do not close this story or pass the sprint's Codex-port goal until mandatory enforcement is proven.

### 1.5 Risks

- **Risk:** testing against a version-drifted, app-embedded alpha produces a result that does not generalize to a user's standalone install.
- **Mitigation:** OQ1 pins the artifact; the evidence file records the exact version string it ran against.

- **Risk:** the loop visibly "completes" — files change, a merge lands — while the flashcard gate and dispatch attribution never fire, so ClearGate looks ported while its enforcement layer is inert.
- **Mitigation:** the artifact's per-hook firing record is mandatory, and an un-fired gate is a recorded gap, not an omission. This is the same failure class the repo's own flashcards already name for the Claude host.

- **Risk:** a four-dispatch worktree-and-merge run against an alpha CLI is materially flakier and slower than [[STORY-058-09]]'s hook-firing checks, with no established wall-clock baseline for Codex.
- **Mitigation:** run against the smallest real story available; record wall-clock per dispatch as the first Codex baseline rather than asserting a budget.

- **Risk:** conflating a bypassed hook-trust run with a human-trusted one overstates what was proven.
- **Mitigation:** the trust posture is a required field in the artifact.

## 2. The Truth (Executable Tests)

### 2.1 Acceptance Criteria (Gherkin)

```gherkin
Feature: Codex loop-completion evidence

  Scenario: A real story completes the loop under Codex
    Given a clean-room repository installed from the packed artifact with --host codex
    And a pinned standalone Codex CLI and a dedicated CODEX_HOME
    When one real story is driven through Architect, QA-Red, Developer, and QA-Verify
    And the DevOps role executes the merge
    Then the story reaches its terminal state
    And the merge commit SHA is recorded in the evidence artifact

  Scenario: Hook firing is recorded per dispatch, including hooks that did not fire
    Given the loop run has completed
    When the evidence artifact is written
    Then it records for each dispatch which hooks fired and which did not
    And any hook with no Codex matcher is recorded as a gap rather than omitted
    And negative controls prove required edit and dispatch denials by the host
    And positive controls prove permitted actions proceed
    And missing mandatory enforcement prevents a passing story or Codex-port goal

  Scenario: Unavailable telemetry is stated, never synthesized
    Given Codex exposes no verifiable per-subagent token usage
    When the evidence artifact records cost
    Then it states metering unavailable
    And no zero-token ledger rows are written for the run

  Scenario: Trust posture is disclosed
    Given hooks required a trust decision before they could run
    When the evidence artifact is written
    Then it names whether trust was granted by a human or bypassed with the dangerous flag
    And primary evidence records human trust for the exact workspace and hook hashes

  Scenario: The machine-checkable half is automated
    Given the clean-room install has completed
    When cleargate verify-install --host codex runs
    Then it checks payload shape, manifest host set, hook wiring, the hooks feature flag, and doctor exit code
    And it prints the checks it cannot make, so the manual remainder is explicit
```

### 2.2 Verification Steps (Manual)
- [ ] Create the clean room outside this repository, install from the packed artifact with `--host codex`, and record the Codex version string.
- [ ] Start a real Codex session with the dedicated `CODEX_HOME`, grant workspace and hook trust, and record the posture.
- [ ] Drive the four dispatches and the DevOps merge; capture the per-dispatch hook-firing record as you go, not afterwards from memory.
- [ ] Write `codex-loop-evidence.md` and confirm sprint close reads it as a gating input.

## 3. The Implementation Guide

### 3.1 Context & Files

| Item | Value |
|---|---|
| Primary File | `.cleargate/sprint-runs/SPRINT-41/codex-loop-evidence.md` |
| Related Files | `.cleargate/delivery/pending-sync/STORY-058-08_clean_room_verification_procedure_and_driver.md`, `.cleargate/delivery/pending-sync/STORY-058-09_clean_room_claude_regression_baseline.md`, `cleargate-planning/.claude/settings.json` |
| New Files Needed | Yes — `.cleargate/sprint-runs/SPRINT-41/codex-loop-evidence.md`; plus the Codex branch of `cleargate-cli/src/commands/verify-install.ts` created by [[STORY-058-08]] |

### 3.2 Technical Logic

The story is a procedure plus an artifact, not a feature. Its correctness rests on two separations that [[STORY-058-08]] already established for Claude and this story inherits.

First, machine-checkable versus live. Payload shape, manifest host set, hook registration, the `[features] hooks = true` flag, and `doctor`'s exit code are all readable from disk, so they extend `verify-install --host codex` and run unattended. Whether a hook actually fires when a real session edits a file, whether a Codex-dispatched DevOps role can complete a merge, and whether any subagent-dispatch gate exists at all are only observable in a live session — and file presence has already produced false confidence in this repo once.

Second, evidence versus remediation. The run will surface gaps; those become their own items. The artifact's job is to make each gap legible — which hook, which dispatch, what was expected, what happened — so a later reader can tell a proven capability from an assumed one. Every field that could be quietly omitted is mandatory: un-fired hooks, unavailable telemetry, trust posture, and the exact version under test.

Sequencing is forced by dependency, not preference: [[STORY-058-10]] supplies the payload, [[STORY-058-11]] the roles, [[STORY-058-12]] the dispatch mode, and [[STORY-058-09]] the Claude baseline this run must not regress.

## Task Breakdown

- [ ] Install the pinned standalone Codex CLI in a dedicated path; record release origin, absolute path, version, and checksum.
- [ ] Extend `cleargate verify-install` with the Codex machine-checkable branch, including the `[features] hooks = true` assertion.
- [ ] Stand up the clean room with a dedicated `CODEX_HOME` and install with `--host codex`.
- [ ] Grant trust, record the posture, and confirm hooks are live before dispatching anything.
- [ ] Drive Architect, QA-Red, Developer, QA-Verify, then the DevOps merge, capturing hook firing per dispatch.
- [ ] Write `codex-loop-evidence.md` with every mandatory field, including gaps and unavailable telemetry.
- [ ] Wire the artifact into sprint close as a gating input, matching [[STORY-058-09]]'s treatment.
- [ ] File a follow-up Bug or CR for each gap the run exposes.

## 4. Quality Gates

### 4.1 Minimum Test Expectations

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 2 | `verify-install --host codex` machine-check set; the `[features] hooks = true` assertion including the absent-flag path |
| Integration tests | 1 | Clean-room install with `--host codex` produces the expected payload shape and manifest host set |
| E2E / acceptance tests | 1 | The live loop run itself, recorded in `codex-loop-evidence.md` |

### 4.2 Definition of Done (The Gate)
- [ ] Minimum test expectations (§4.1) met.
- [ ] All Gherkin scenarios from §2.1 covered.
- [ ] Peer/Architect Review passed.
- [ ] A real story reached its terminal state under Codex with a DevOps-executed merge, and the commit SHA is recorded.
- [ ] The evidence artifact records per-dispatch hook firing, including hooks that did not fire.
- [ ] Both `loop_transport` and `enforcement_parity` pass, with actual host denials and positive controls; missing required enforcement is not waived by a follow-up item.
- [ ] Telemetry is either recorded from real usage or explicitly marked unavailable; no synthesized zero rows exist.
- [ ] The primary standalone path, release origin, version, SHA-256, and human trust of the exact hook hashes are recorded.
- [ ] Every gap the run exposed has a filed follow-up item.

## Existing Surfaces

- **Surface:** `.cleargate/delivery/pending-sync/STORY-058-08_clean_room_verification_procedure_and_driver.md` — the clean-room procedure and `verify-install` driver this story extends rather than re-derives.
- **Surface:** `.cleargate/delivery/pending-sync/STORY-058-09_clean_room_claude_regression_baseline.md` — the Claude baseline whose structure, evidence artifact, and sprint-close gating this story mirrors for Codex.
- **Surface:** `cleargate-planning/.claude/settings.json` — the authoritative list of hook events whose Codex firing this run must record.
- **Surface:** `cleargate-planning/.claude/hooks/pre-edit-gate.sh` — one of the two gates whose real blocking behavior, not mere invocation, the run must observe.
- **Coverage of this requirement:** none — no existing story drives a real story through the loop on any host other than Claude.

## Prior work

- [[EPIC-058]] states the success metric; [[STORY-058-08]] and [[STORY-058-09]] cover Claude only; [[STORY-058-10]] and [[STORY-058-11]] verify installability and delegability, not loop completion.
- [[STORY-058-12]] supplies the dispatch mode this run exercises.
- [[PROPOSAL-074]] anticipated per-host dispatch differences but proposes no loop-completion evidence for any host.

## Why not simpler?

- **Smallest existing surface that could carry this:** `.cleargate/delivery/pending-sync/STORY-058-11_codex_role_and_skill_translation.md` — its §2.2 already includes one manual Codex-session check.
- **Why isn't extension / parameterization / config sufficient?** That check verifies roles are listed and delegable — a registry read. Loop completion is a different claim with a different failure surface: worktree isolation, gate firing, state transitions, and a role-executed merge, across four dispatches against an alpha CLI. Folding it into -11 would couple a narrow, low-risk translation story to the open architectural question of whether Codex's subagent model can drive the ClearGate dispatch contract at all — the same coupling that already justified splitting the clean-room driver ([[STORY-058-08]]) from its Claude execution ([[STORY-058-09]]).

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity** — owner decisions are recorded in §1.4. This approves the evidence contract; no runtime success is claimed before the unchecked verification and DoD are satisfied.

- [x] Gherkin scenarios completely cover all detailed requirements in §1.2.
- [x] Implementation Guide (§3) maps to specific, verified file paths from the approved Epic and verified codebase grounding.
- [x] No "TBDs" exist anywhere in the specification or technical logic.
- [x] Existing Surfaces cites at least one source-tree path or explicitly states "none — net-new."
- [x] Why not simpler? has both sub-bullets answered (no "TBD" / no "{}").
