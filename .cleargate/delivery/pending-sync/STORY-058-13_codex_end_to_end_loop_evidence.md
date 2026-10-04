---
story_id: STORY-058-13
parent_epic_ref: EPIC-058
parent_cleargate_id: null
sprint_cleargate_id: SPRINT-41
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
deferred_verification:
  - description: "Goal check 5: codex-loop-evidence.md has a PASS scripted run and a PASS live human-trust run, both on the final cli artifact inputs and the pinned standalone codex"
    command: node cleargate-cli/scripts/clean-room/codex-loop.mjs check --evidence .cleargate/sprint-runs/SPRINT-41/codex-loop-evidence.md --write-result .cleargate/sprint-runs/SPRINT-41/deferred-verify/STORY-058-13.json
    blocks: BUG-106
    note: "Owner decision 2026-10-04 (SPRINT-41 close): this live check moves out of SPRINT-41 and is carried with BUG-106; it no longer blocks SPRINT-41 close."
created_at: 2026-09-11T00:00:00Z
updated_at: 2026-09-25T22:39:50Z
created_at_version: cleargate@0.26.1
updated_at_version: 31969ea3-dirty
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-10-04T06:31:53Z
  transition: ready-for-execution
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id STORY-058-13
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-09-25T09:53:38Z
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
- Pin the primary artifact to a dedicated standalone Codex `0.154.0-alpha.6.2` install, recording its absolute path, release origin, version output, and SHA-256 before execution. The inspected embedded binary is `/Applications/ChatGPT.app/Contents/Resources/codex`, also `0.154.0-alpha.6.2` (SHA-256 `ecad78dbf98adb89ec475edac86630406cbe59d9f3070b17d88065f136b94bcb`). It is a same-version secondary smoke target, not a substitute for primary standalone evidence. The standalone install is pinned at `/Users/ssuladze/Documents/Dev/CG_TEST/sprint-41-D2QMC1/codex-runtime-X33IWV/bin/codex` (SHA-256 `1d8b80de0a27f69b152bfb9b7b3b4fd3b8c589e4e76213db27219eab9ae53afa`, re-measured 2026-09-27; release origin and archive SHA-256 in the SPRINT-41 report `codex-standalone-release.md`). A different version requires an explicit approach amendment. Measured 2026-09-26: the ChatGPT.app embedded binary has auto-updated to `codex-cli 0.155.0-alpha.16.3` (SHA-256 `c67698d0990aae05211d9c43ab343ad9517e406824dea77eca103a2806232b3a`), so no same-version embedded target exists; no embedded smoke is run and the evidence records the drift. The deterministic secondary data point is the pinned standalone binary driven by a scripted Responses endpoint (`provider: scripted`), labelled as such.
- Isolate host state: every clean-room run sets a dedicated `CODEX_HOME` so the run never reads or writes this user's personal Codex configuration, sessions, or MCP registrations.
- The real story is authored inside the clean room, never taken from this repository: `repo-loop/` is a fresh git repository seeded with a minimal Node package and installed with `cleargate init --yes --host codex` from the packed artifact; its epic, story (STORY-001-01, `src/slugify.mjs`, one Gherkin scenario) and sprint (SPRINT-01) are created with the artifact's `cleargate new`, authored as a drafting agent authors them (the `<instructions>` block stripped, per protocol Guidance Surface Reach), approved, and started with `cleargate sprint init`. The run asserts that nothing is written to this repository's sprint state or hook logs.
- Sandbox posture is disclosed: Codex's `workspace-write` sandbox makes `.git` read-only (measured: `git worktree add` fails), so every session starts with `config.sandbox_workspace_write.writable_roots = [<room>/.git]` on `thread/start` (child agents inherit it; nothing is persisted).
- Role shells run `/bin/zsh -lc`, and macOS `path_helper` puts `/opt/homebrew/bin` ahead of the launcher PATH; the clean room's `HOME` carries a `.zprofile` that re-prepends the artifact's bin directory, and the run asserts that hooks and role shells both resolve the artifact `cleargate`.
- Drive one real story through four dispatches — Architect, QA-Red, Developer, QA-Verify — and a DevOps-executed merge. The orchestrator must not perform the merge itself; SKILL.md's forbidden-orchestrator-patterns rule means a merge the orchestrator ran proves nothing about the loop.
- Separate `loop_transport` from `enforcement_parity` in the evidence. Both must pass for this story and the sprint's Codex-port goal to pass. Four role dispatches plus a DevOps merge prove transport only. Prove planning-first denial using an enforce-mode fixture with no active-sprint bypass, and flashcard/dispatch denial using a pending-flashcard fixture with no advisory/skip override; verify the forbidden edit/spawn did not occur, then remove the fixture condition and prove the permitted action proceeds. Missing required hooks, denials, or dispatch identity make enforcement parity fail or inconclusive, never green. A filed follow-up does not waive this condition.
- Record, per dispatch, which hooks fired and which did not: `SessionStart`, `PreToolUse` on file edits, `PostToolUse` ingest, the subagent-dispatch gate, and `SubagentStop`. A hook that did not fire is recorded as a gap, never omitted.
- Record the worktree lifecycle (creation from the sprint branch, isolation during the run, teardown at merge), the state transitions, and the merge commit SHA.
- Record token telemetry honestly: if Codex exposes no verifiable per-subagent usage, the artifact states `metering: unavailable`. Synthesizing zero-token rows is forbidden by [[EPIC-058]]. Measured: each Codex subagent's rollout (`agent_transcript_path` in the SubagentStop payload) holds one `token_usage_record` per model response carrying the provider's exact usage. ClearGate does not consume it in SPRINT-41, so the ClearGate verdict is `metering: unavailable`; the artifact records the telemetry probe (per dispatch: found, record count, totals, and — for scripted runs — an exact cross-check against the provider-reported usage) and a follow-up CR carries the consumer.
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

  Scenario: Unavailable metering is stated, never synthesized
    Given ClearGate does not consume Codex per-subagent usage in SPRINT-41
    When the evidence artifact records cost
    Then it states metering unavailable
    And it records whether the host exposed per-dispatch usage telemetry, and where
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
- [ ] Pass B: `codex-loop.mjs run --provider scripted --trust harness` into a sibling container appends Run 1 (PASS).
- [ ] QA-Verify: the same run into a fresh container reproduces Run 1's verdicts.
- [ ] Step L: `prepare --provider live`, owner trust in the Codex TUI, `run --trust human` appends Run 2 (PASS); both runs record the pinned path, origin, version and SHA-256.
- [ ] `codex-loop.mjs check` exits 0 after the merge and again at RS-CLOSE.

## 3. The Implementation Guide

*Re-declared 2026-09-25 after STORY-058-01 (M1.md §D4 + STORY-058-01-arch.md §5): canonical paths → `cleargate-cli/scaffold/{core,hosts/claude}/**`. Starts only after STORY-058-02 merges, since it reads canonical through `cleargate-cli/test/helpers/scaffold-roots.ts` (created by -02). The evidence file itself stays outer.*

### 3.1 Context & Files

| Item | Value |
|---|---|
| Primary File (new) | `.cleargate/sprint-runs/SPRINT-41/codex-loop-evidence.md` |
| Related Files | `cleargate-cli/src/commands/verify-install.ts`, `.cleargate/knowledge/clean-room-verification.md`, `cleargate-cli/scripts/clean-room/mock-responses.mjs`, `cleargate-cli/scripts/clean-room/codex-appserver.mjs`, `cleargate-cli/scripts/clean-room/codex-hooks.mjs`, `cleargate-cli/test/commands/verify-install-codex.red.node.test.ts`, `cleargate-cli/CHANGELOG.md`, `cleargate-cli/scripts/clean-room/evidence.mjs` — reference, unchanged, `cleargate-cli/scripts/clean-room/artifact.mjs` — reference, unchanged, `cleargate-cli/scripts/clean-room/probe-items.mjs` — reference, unchanged, `cleargate-cli/scaffold/core/.cleargate/scripts/assert_story_files.mjs` — reference, unchanged, `cleargate-cli/scaffold/core/.cleargate/scripts/launch_wave.mjs` — reference, unchanged, `cleargate-cli/scaffold/core/.cleargate/scripts/dispatch_serial.mjs` — reference, unchanged, `cleargate-cli/scaffold/core/.cleargate/scripts/lib/flashcard-gate.mjs` — reference, unchanged, `cleargate-cli/scaffold/hosts/codex/.codex/hooks.json` — reference, unchanged, `cleargate-cli/scaffold/hosts/claude/.claude/settings.json` — reference, unchanged |
| New Files Needed | `cleargate-cli/scripts/clean-room/codex-loop.mjs`, `cleargate-cli/scripts/clean-room/loop-evidence.mjs`, `cleargate-cli/scripts/clean-room/loop-script.mjs`, `cleargate-cli/scripts/clean-room/fixtures/codex-loop/seed/package.json`, `cleargate-cli/scripts/clean-room/fixtures/codex-loop/seed/README.md`, `cleargate-cli/scripts/clean-room/fixtures/codex-loop/story-body.md`, `cleargate-cli/scripts/clean-room/fixtures/codex-loop/red-test.mjs`, `cleargate-cli/scripts/clean-room/fixtures/codex-loop/impl.mjs`, `cleargate-cli/scripts/clean-room/fixtures/codex-loop/plan-M1.md`, `cleargate-cli/scripts/clean-room/fixtures/codex-loop/waves.json`, `cleargate-cli/scripts/clean-room/fixtures/codex-loop/reports/`, `cleargate-cli/test/commands/verify-install-codex-shape.red.node.test.ts`, `cleargate-cli/test/commands/verify-install-codex-cli.red.integration.node.test.ts`, `cleargate-cli/test/scripts/codex-loop-evidence.red.node.test.ts`, `cleargate-cli/test/scripts/codex-loop-harness.red.node.test.ts`, `cleargate-cli/test/e2e/codex-loop.red.integration.node.test.ts`, `.cleargate/sprint-runs/SPRINT-41/codex-loop-evidence.md` |
| Orchestration Files | `.cleargate/delivery/pending-sync/STORY-058-13_codex_end_to_end_loop_evidence.md`, `.cleargate/wiki/log.md`, `.cleargate/sprint-runs/SPRINT-41/reports/STORY-058-13-qa-red.md`, `.cleargate/sprint-runs/SPRINT-41/reports/STORY-058-13-tpv.md`, `.cleargate/sprint-runs/SPRINT-41/reports/STORY-058-13-dev.md`, `.cleargate/sprint-runs/SPRINT-41/reports/STORY-058-13-qa.md`, `.cleargate/sprint-runs/SPRINT-41/reports/STORY-058-13-arch.md`, `.cleargate/sprint-runs/SPRINT-41/reports/STORY-058-13-devops.md` |

### 3.2 Technical Logic

The story is a procedure plus an artifact, not a feature. Its correctness rests on two separations that [[STORY-058-08]] already established for Claude and this story inherits.

First, machine-checkable versus live. Payload shape, manifest host set, hook registration, the `[features] hooks = true` flag, and `doctor`'s exit code are all readable from disk, so they extend `verify-install --host codex` and run unattended. Whether a hook actually fires when a real session edits a file, whether a Codex-dispatched DevOps role can complete a merge, and whether any subagent-dispatch gate exists at all are only observable in a live session — and file presence has already produced false confidence in this repo once.

Second, evidence versus remediation. The run will surface gaps; those become their own items. The artifact's job is to make each gap legible — which hook, which dispatch, what was expected, what happened — so a later reader can tell a proven capability from an assumed one. Every field that could be quietly omitted is mandatory: un-fired hooks, unavailable telemetry, trust posture, and the exact version under test.

Sequencing is forced by dependency, not preference: [[STORY-058-10]] supplies the payload, [[STORY-058-11]] the roles, [[STORY-058-12]] the dispatch mode, and [[STORY-058-09]] the Claude baseline this run must not regress.

Harness (M6 plan): `scripts/clean-room/codex-loop.mjs prepare` builds the container, installs the packed artifact, and authors the clean-room project; for the primary run the owner then trusts the workspace and the exact hooks in the Codex TUI; `run --trust human` refuses unless every project hook is trusted at its current hash and makes no trust write itself. Six sessions: edit deny (enforce mode, no active sprint, story unapproved), edit allow, a delivery-item ingest, dispatch deny (a pending flashcard, no skip or advisory override), dispatch allow with identity, and the loop (a real model orchestrator following the installed playbook and `dispatch-serial.md`). Evidence is the `codex app-server` notification stream (child threads, hook runs keyed by call id), the `codex-identity` log, child rollouts, git and `state.json`. Gating ids split into `loop_transport` and `enforcement_parity`; `check` requires a PASS scripted run and a PASS live human-trust run on the final artifact inputs.

Contract-first execution (CR-124; SPRINT-41 re-plan and the M6 plan's C3 entry re-derivation): built in `OUTER/.worktrees/STORY-058-13/cleargate-cli` on `story/STORY-058-13`, cut from `contract/S-41-loop` after that ref is fast-forwarded from STORY-058-12's pass-B commit to STORY-058-12's integrated commit (pass B merged with cli `main`, which carries STORY-058-10's scripted-session harness and BUG-090's probe-story approval flip); integrates after STORY-058-12 merges (BUG-090 is already merged). The four controls are graded by STORY-058-10's `codexHookVerdicts` unchanged, so they reuse its probe names: the epic `EPIC-001_cleanroom_probe.md`, the edit target `src/cg-probe.ts`, and the probe dispatch message `STORY=001-01 Reply with exactly OK.`. `authorLoopStory` lives in `loop-script.mjs` and composes `stripInstructionsBlock` (`codex-hooks.mjs`) with `locateFrontmatterFence` (`assert_story_files.mjs`); `probe-items.mjs` is not edited.

## Task Breakdown

- [ ] QA-Red: verify-install codex shape checks (8 ids, mutations, unavailable split view, null snapshot), CLI integration, loop verdicts and evidence check (one negative per condition), mock routes / loop script / authorLoopStory / runLoopTurn / codex-hooks helper exports, e2e (install shape; scripted loop gated on CLEARGATE_CODEX_BIN); amend the STORY-058-10 verify-install test (null snapshot = 8 skips; split view pinned to the canonical scaffold)
- [ ] Pass A: extend HOST_VERIFIERS.codex (hooks wiring, executable bits, foreign hooks, AGENTS.md block, MCP registration, roles, skills) reading the packed split view (`VerifyInstallOptions.splitViewRoot`; an unavailable split view fails, never passes); live ids for loop transport and enforcement parity
- [ ] Pass B: codex-loop.mjs prepare/run/check, loop-evidence.mjs, loop-script.mjs (incl. authorLoopStory), fixtures; mock routes, runLoopTurn and codex-hooks.mjs helper exports; clean-room-verification.md Codex section; Run 1 (scripted) appended to codex-loop-evidence.md
- [ ] Integrate: merge cli main after STORY-058-12 merges; re-verify; re-run the scripted loop if `codex-loop.mjs check` reports the scripted run stale
- [ ] QA-Verify: reproduce the scripted run in a fresh container on the integrated tree; verdicts identical to the last scripted run
- [ ] Step L (orchestrator + owner): prepare the live room, owner grants workspace + exact-hook trust in the Codex TUI, run the primary live human-trust loop (Run 2), commit the evidence
- [ ] File a Draft follow-up item for every recorded gap and cite its id in the evidence
- [x] Evidence gates close through deferred_verification (close_sprint.mjs Step 2.9) — frontmatter applied by the orchestrator (M6 amendment G1)

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
- [ ] codex-loop-evidence.md gates sprint close through this story's deferred_verification (last scripted PASS and last live human-trust PASS, both on the final artifact inputs and the pinned codex SHA-256).
- [ ] The run proves it wrote nothing to this repository's sprint state (codex.loop.meta-repo-untouched).

## Existing Surfaces

- **Surface:** `.cleargate/delivery/pending-sync/STORY-058-08_clean_room_verification_procedure_and_driver.md` — the clean-room procedure and `verify-install` driver this story extends rather than re-derives.
- **Surface:** `.cleargate/delivery/pending-sync/STORY-058-09_clean_room_claude_regression_baseline.md` — the Claude baseline whose structure, evidence artifact, and sprint-close gating this story mirrors for Codex.
- **Surface:** `cleargate-cli/scaffold/hosts/claude/.claude/settings.json` — the authoritative list of hook events whose Codex firing this run must record.
- **Surface:** `cleargate-cli/scaffold/hosts/claude/.claude/hooks/pre-edit-gate.sh` — one of the two gates whose real blocking behavior, not mere invocation, the run must observe.
- **Surface:** `cleargate-cli/src/commands/verify-install.ts` — `HOST_VERIFIERS.codex` (STORY-058-10: `codex.features-hooks` plus six live ids), which this story extends with seven shape checks and two live ids.
- **Surface:** `cleargate-cli/scripts/clean-room/codex-hooks.mjs` and `cleargate-cli/scripts/clean-room/evidence.mjs` — the STORY-058-10 Codex harness: `codexHookVerdicts` grades this story's four controls unchanged, and `stripInstructionsBlock`, the scripted item builders and the hook-log readers are reused, not copied.
- **Surface:** `cleargate-cli/scripts/clean-room/codex-appserver.mjs` and `cleargate-cli/scripts/clean-room/mock-responses.mjs` — `runTurn`, `trustRoom`, `flattenHooksList` and the content-routed mock responder, extended additively.
- **Surface:** STORY-058-12's serial driver and verdict mode (`dispatch_serial.mjs`, `validateVerdicts` with `mode: 'serial'`, `cardHash`) on contract branch `contract/S-41-loop` — the dispatch path the loop exercises; cited by name because it reaches cli `main` only when STORY-058-12 merges.
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
