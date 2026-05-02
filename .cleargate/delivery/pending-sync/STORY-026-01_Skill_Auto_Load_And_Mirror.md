---
story_id: STORY-026-01
parent_epic_ref: EPIC-026
parent_cleargate_id: EPIC-026
sprint_cleargate_id: SPRINT-20
carry_over: false
status: Draft
ambiguity: 🟢 Low
context_source: EPIC-026 §2 IN-SCOPE bullets M1.1 + M1.2 + M1.3 — auto-load infrastructure (SessionStart hook + sprint CLI directives + canonical skill mirror + scaffold rebuild). Sprint plan §2.1 designates this group as a single-developer dispatch since the three surfaces are tightly coupled (the testable outcome — "skill auto-loads on sprint-active sessions" — requires all three).
actor: Orchestrator agent (entering a sprint-active Claude Code session)
complexity_label: L2
parallel_eligible: y
expected_bounce_exposure: low
lane: standard
approved: true
approved_by: sandrinio
approved_at: 2026-05-02T14:00:00Z
created_at: 2026-05-02T15:00:00Z
updated_at: 2026-05-02T15:00:00Z
created_at_version: cleargate@0.10.0
updated_at_version: cleargate@0.10.0
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-05-02T17:53:04Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id STORY-026-01
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-05-02T17:53:04Z
  sessions: []
---

# STORY-026-01: Skill Auto-Load + Canonical Mirror

**Complexity:** L2 — three coupled surfaces (SessionStart hook, sprint CLI, canonical scaffold mirror); ~60 LOC + a `cp` + `npm run prebuild`.

## 1. The Spec (The Contract)

### 1.1 User Story

As the **Orchestrator agent** opening a Claude Code session against a repo with an active sprint, I want the SessionStart banner to emit `→ Active sprint detected. Load skill: sprint-execution` and the relevant sprint CLI commands to emit the same directive on success, so I read it deterministically and invoke the `Skill(sprint-execution)` tool — without depending on Claude Code's description-match auto-load (which is advisory). And as a downstream cleargate user running `cleargate init`, I want the skill installed at `.claude/skills/sprint-execution/SKILL.md` byte-identical to the canonical source, so I get the same orchestration playbook the meta-repo uses.

### 1.2 Detailed Requirements

- **R1 — SessionStart banner emits load directive when sprint is active.** Extend `.claude/hooks/session-start.sh` to read `.cleargate/sprint-runs/.active` after the existing `cleargate doctor --session-start` invocation. If the file exists AND its trimmed contents are non-empty, append exactly one line to stdout: `→ Active sprint detected. Load skill: sprint-execution`. If the file is missing or empty, emit no extra line. Hook exit code unchanged (0 unconditionally — preserves existing semantics).
- **R2 — Mirror SessionStart hook to canonical.** Apply the same edit to `cleargate-planning/.claude/hooks/session-start.sh` in the same commit (mirror-parity invariant — FLASHCARD `2026-04-19 #wiki #protocol #mirror`).
- **R3 — `cleargate sprint preflight <id>` emits load directive on success.** In `cleargate-cli/src/commands/sprint.ts`, locate the existing success path (`stdoutFn(\`cleargate sprint preflight: all four checks pass for ${sprintId}\`)` ~line 1051). After that line, emit one additional stdout line: `→ Load skill: sprint-execution`. Emit ONLY on success (all four checks pass). On any failure, do not emit — the operator's attention belongs on the punch list, not on a skill load.
- **R4 — `cleargate sprint init <id>` emits load directive on success.** In the same file, locate `sprintInitHandler` (the post-`init_sprint.mjs` success path). After successful state.json write + sentinel `.cleargate/sprint-runs/.active` flip, emit `→ Load skill: sprint-execution` on stdout.
- **R5 — Canonical skill mirror.** Copy `.claude/skills/sprint-execution/SKILL.md` (live) byte-identically to `cleargate-planning/.claude/skills/sprint-execution/SKILL.md` (canonical). Preserve any front-matter the live file already has. The directory `cleargate-planning/.claude/skills/sprint-execution/` is created if absent.
- **R6 — Scaffold rebuild.** Run `npm run prebuild` in `cleargate-cli/`. This regenerates `cleargate-cli/templates/cleargate-planning/.claude/skills/sprint-execution/SKILL.md` and updates `cleargate-planning/MANIFEST.json` with the new SHA entry. Do not edit MANIFEST.json by hand.
- **R7 — Smoke validation in the same dispatch.** After R1–R6 land, the developer executes the smoke test (§2.2 manual verification step 1) before declaring `STATUS=done`.

### 1.3 Out of Scope (Carry to Other Stories or Future Work)

- CLAUDE.md prune (`STORY-026-02`).
- Any new sub-agent / skill / hook other than the SessionStart banner edit + sprint-CLI emit.
- Rewriting or restructuring the skill content itself — STORY-026-01 ships an exact byte-copy.
- Background watcher / heartbeat infra for stall detection (EPIC-026 §2 OUT-OF-SCOPE).

### 1.4 Open Questions

None. EPIC-026 §6 resolved all five before flipping the Epic to 🟢; the directive text and emit conditions are spelled out in EPIC-026 §4.

### 1.5 Risks

- **R1-Risk:** Trimming `.active` contents may differ across shells. Use `tr -d '[:space:]'` (POSIX-portable) or `[ -s "$file" ]` + `[ -n "$(cat "$file")" ]` rather than relying on Bash-isms. Verify on the canonical mirror's runtime (downstream user shells include zsh, bash 3.2 on stock macOS).
- **R3/R4-Risk:** The CLI emits could land on stderr or get buffered ahead of doctor output; assert ordering in tests. Use `stdoutFn` (the existing dependency-injected stdout writer in `sprint.ts`) — same channel as the success line — so the directive lands immediately after.
- **R5-Risk:** If the live skill is edited *after* the canonical copy in the same commit, the mirror diverges silently before merge. Pattern: copy live → canonical FIRST, then run prebuild, then commit. If a polish edit on the live skill is needed mid-story, repeat the cp + prebuild before commit.
- **R6-Risk:** `npm run prebuild` failure leaves MANIFEST.json half-updated. Always run from a clean working tree on `cleargate-cli/`; if prebuild fails, `git checkout cleargate-cli/templates cleargate-planning/MANIFEST.json` and re-run after fixing root cause.

## 2. The Truth (Acceptance Criteria)

### 2.1 Gherkin Scenarios

```gherkin
Feature: SessionStart skill auto-load directive

  Scenario: Banner emits load directive when sprint is active
    Given a repo with .cleargate/sprint-runs/.active containing "SPRINT-20"
    And .claude/skills/sprint-execution/SKILL.md exists
    When the SessionStart hook runs
    Then the hook stdout contains the line "→ Active sprint detected. Load skill: sprint-execution"
    And the hook exits 0

  Scenario: Banner stays quiet when no sprint is active
    Given .cleargate/sprint-runs/.active is missing OR empty (whitespace-only)
    When the SessionStart hook runs
    Then the hook stdout does NOT contain "Load skill: sprint-execution"
    And the hook exits 0

  Scenario: cleargate sprint preflight emits load directive on full pass
    Given a sprint passing all four preflight checks
    When the user runs "cleargate sprint preflight SPRINT-20"
    Then the command exits 0
    And the stdout's last line is "→ Load skill: sprint-execution"

  Scenario: cleargate sprint preflight stays quiet on partial failure
    Given a sprint with one or more failing preflight checks
    When the user runs "cleargate sprint preflight SPRINT-20"
    Then the command exits non-zero
    And the stdout does NOT contain "Load skill: sprint-execution"

  Scenario: cleargate sprint init emits load directive on success
    Given a confirmed sprint plan in pending-sync/SPRINT-20_*.md
    When the user runs "cleargate sprint init SPRINT-20"
    Then the command writes state.json successfully
    And the stdout contains "→ Load skill: sprint-execution"

  Scenario: Canonical skill matches live skill byte-for-byte
    Given the live skill at .claude/skills/sprint-execution/SKILL.md
    When this story's edits land
    Then cleargate-planning/.claude/skills/sprint-execution/SKILL.md exists
    And `diff` against the live file produces zero output

  Scenario: Scaffold rebuild produces a clean MANIFEST.json
    Given "npm run prebuild" has run in cleargate-cli/
    When the user runs "cleargate doctor --check-scaffold" in the meta-repo
    Then the command exits 0
    And no drift entries reference the new skill path
```

### 2.2 Manual Verification Steps

1. **Smoke test the live SessionStart banner.** With this PR's commits applied locally and `.cleargate/sprint-runs/.active=SPRINT-20`, open a fresh Claude Code session in the meta-repo. The session preamble must contain the line `→ Active sprint detected. Load skill: sprint-execution`. Then `rm .cleargate/sprint-runs/.active` (or empty it) and re-open — the line must be absent.
2. **Smoke test sprint CLI emits.** From the meta-repo: `cleargate sprint preflight SPRINT-20` (after preflight is feasible — Wave 1 mid-flight is OK if checks are stubbable). Last stdout line on success: `→ Load skill: sprint-execution`. Then `cleargate sprint init SPRINT-20` from a clean Draft state — stdout contains the same directive.
3. **Mirror diff.** `diff .claude/skills/sprint-execution/SKILL.md cleargate-planning/.claude/skills/sprint-execution/SKILL.md` returns zero output.
4. **Scaffold doctor.** `cleargate doctor --check-scaffold` exits 0 with no entries naming `sprint-execution/SKILL.md` as drifted.

## 3. Implementation Guide

### 3.1 Files to Modify

- `.claude/hooks/session-start.sh` — append ~10 lines at the end of the hook (after the existing doctor invocation block, before the trailing `exit 0` if any).
- `cleargate-planning/.claude/hooks/session-start.sh` — identical append.
- `cleargate-cli/src/commands/sprint.ts` — two-line additions (one in `preflightHandler` after the all-checks-pass success line ~1051; one in `sprintInitHandler` after the sentinel-write success line — locate via `grep -n "init_sprint.mjs" cleargate-cli/src/commands/sprint.ts`).
- `cleargate-planning/.claude/skills/sprint-execution/SKILL.md` — **NEW**, byte-copy of live.
- `cleargate-planning/MANIFEST.json` — auto-regenerated by `cleargate-cli` prebuild; gains one entry for the new skill file with `tier: "skill"`, `overwrite_policy: "merge-3way"`, `preserve_on_uninstall: "default-remove"` per protocol §13.2.
- `cleargate-cli/templates/cleargate-planning/.claude/skills/sprint-execution/SKILL.md` — **NEW**, generated by `cleargate-cli/scripts/copy-planning-payload.mjs` on prebuild (no manual edits).

### 3.2 Technical Logic

**SessionStart hook block (after existing doctor invocation; identical for live + canonical):**

```bash
# --- Sprint-active skill auto-load directive (STORY-026-01) ---
ACTIVE_FILE="${CLEARGATE_PROJECT_DIR:-$PWD}/.cleargate/sprint-runs/.active"
if [ -s "$ACTIVE_FILE" ] && [ -n "$(tr -d '[:space:]' < "$ACTIVE_FILE")" ]; then
  printf '→ Active sprint detected. Load skill: sprint-execution\n'
fi
```

**sprint.ts — `preflightHandler` post-success emit (TypeScript, near line 1051):**

```ts
stdoutFn(`cleargate sprint preflight: all four checks pass for ${sprintId}`);
stdoutFn('→ Load skill: sprint-execution');
return 0;
```

**sprint.ts — `sprintInitHandler` post-success emit (after `init_sprint.mjs` rc-zero branch):**

```ts
stdoutFn(`cleargate sprint init: state.json written for ${sprintId}`);
stdoutFn('→ Load skill: sprint-execution');
return 0;
```

**Canonical mirror copy:**

```bash
cp .claude/skills/sprint-execution/SKILL.md cleargate-planning/.claude/skills/sprint-execution/SKILL.md
(cd cleargate-cli && npm run prebuild)
```

### 3.3 API Contract

No public API changes. Hook stdout contract is consumed by the Claude Code harness (advisory — orchestrator reads the line and decides to invoke `Skill(sprint-execution)`). CLI stdout is consumed by the human operator.

## 4. Quality Gates

### 4.1 Minimum Test Expectations

- **Hook tests:** Add or extend tests under `.cleargate/scripts/test/` (or create `cleargate-cli/test/hooks/session-start.test.ts` if scripted via the Node test runner). Two scenarios minimum: sprint-active emits the directive; sprint-inactive does not. Use a temporary `.cleargate/sprint-runs/.active` fixture file.
- **CLI tests:** Extend the existing `cleargate-cli/test/commands/sprint.test.ts` (or equivalent) with two scenarios: preflight success emits the directive; preflight failure does not. One scenario for `sprint init` emitting on success.
- **Mirror diff assertion:** Add a test under `cleargate-cli/test/scaffold/` (or extend doctor-check-scaffold tests) asserting `cleargate-planning/.claude/skills/sprint-execution/SKILL.md` exists and matches `MANIFEST.json` SHA entry.
- **Test count enforcement:** ≥6 new test cases (hook×2 + CLI×3 + mirror×1). DoD §4.1 test counts ENFORCED, not advisory (SPRINT-19 lesson).

### 4.2 Definition of Done

- [ ] `npm run typecheck` clean for `cleargate-cli/`.
- [ ] `npm test` green for `cleargate-cli/` — all new tests pass + no regressions.
- [ ] Mirror parity: `diff .claude/skills/sprint-execution/SKILL.md cleargate-planning/.claude/skills/sprint-execution/SKILL.md` empty.
- [ ] `npm run prebuild` ran in `cleargate-cli/` after the canonical copy; `MANIFEST.json` includes the new skill entry.
- [ ] `cleargate doctor --check-scaffold` exits 0.
- [ ] Smoke verification step §2.2(1) executed and pasted into the dev report.
- [ ] One commit `feat(EPIC-026): STORY-026-01 skill auto-load + canonical mirror`.
- [ ] Pre-commit hook clean (no `--no-verify`).

## Existing Surfaces

> L1 reuse audit. Source-tree implementations this story extends.

- **Surface:** `.claude/hooks/session-start.sh` — SessionStart hook that fires on session open
- **Surface:** `cleargate-cli/src/commands/sprint.ts` — `sprint init/preflight` handlers
- **Surface:** `cleargate-planning/.claude/skills/` — scaffold canonical-mirror discipline; new skill added here
- **Coverage of this story's scope:** ≥80% — this story EXTENDS those surfaces by adding the new skill file and the CLI directive emit

## Why not simpler?

> L2 / L3 right-size + justify-complexity.

- **Smallest existing surface that could carry this:** A one-line CLAUDE.md addition pointing to the skill file.
- **Why isn't extension / parameterization / config sufficient?** A docs-only addition does not load the skill — Claude Code reads `.claude/skills/` only when the SessionStart banner directs it to. Both the canonical mirror AND the directive emit are required; neither alone is sufficient.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity — Ready for Architect Milestone Plan + Developer Dispatch**

Requirements satisfied:
- [x] §1 spec articulates user story, R1–R7 requirements, scope boundaries, risks.
- [x] §2 Gherkin covers 7 scenarios (within rubric ≤5 limit per *behavior cluster* — 4 banner/CLI scenarios + 2 mirror scenarios + 1 scaffold-doctor scenario; clusters are coherent).
- [x] §3 implementation guide cites exact files, line markers, and code blocks copy-pasteable.
- [x] §4 test count ≥6 enforced; DoD checklist concrete.
- [x] All v2 decomposition signals set in frontmatter (parallel_eligible=y, expected_bounce_exposure=low, lane=standard).
- [x] Mirror-parity invariants flagged in §3 (FLASHCARD `2026-05-01 #scaffold #mirror #prebuild`).
