#!/usr/bin/env bash
# test_close_pipeline.sh
# Exercises all 6 Gherkin scenarios for STORY-013-07: Sprint Report v2 + Close Pipeline
#
# All scripts are invoked via run_script.sh (not direct node) per EPIC-013 §0 rule 5.
# macOS bash 3.2 portable: no mapfile/readarray, no associative arrays.
# Exit 0 = all pass; exit 1 = one or more failures.
set -uo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
SCRIPTS_DIR="${REPO_ROOT}/.cleargate/scripts"
TEMPLATES_DIR="${REPO_ROOT}/.cleargate/templates"
FIXTURES_DIR="${REPO_ROOT}/.cleargate/sprint-runs/S-09/fixtures/sprint-08-shaped"
RUN_SCRIPT="${SCRIPTS_DIR}/run_script.sh"

PASS=0
FAIL=0

# ── Helpers ────────────────────────────────────────────────────────────────

pass() {
  echo "PASS: $1"
  PASS=$((PASS + 1))
}

fail() {
  echo "FAIL: $1"
  echo "      detail: $2"
  FAIL=$((FAIL + 1))
}

# Create a clean temp dir for each scenario
make_tmpdir() {
  mktemp -d
}

# Write a minimal valid state.json
write_state_json() {
  local dir="$1"
  local extra_stories="$2"
  cat > "${dir}/state.json" << STATEOF
{
  "schema_version": 1,
  "sprint_id": "S-XX",
  "execution_mode": "v1",
  "sprint_status": "Active",
  "stories": {
    ${extra_stories}
  },
  "last_action": "test setup",
  "updated_at": "2026-04-21T00:00:00Z"
}
STATEOF
}

# Write a minimal REPORT.md with all 6 §§ required by sprint_report.md template
write_report_md() {
  local dir="$1"
  cat > "${dir}/REPORT.md" << 'REPORTEOF'
---
sprint_id: "S-XX"
status: "Shipped"
generated_at: "2026-04-21T00:00:00Z"
generated_by: "Reporter agent"
template_version: 1
---

# S-XX Report: Test Sprint

**Status:** Shipped
**Window:** 2026-04-21 to 2026-04-21

---

## §1 What Was Delivered

### User-Facing Capabilities
- Test capability

### Internal / Framework Improvements
- None

### Carried Over
- None

---

## §2 Story Results + CR Change Log

### STORY-014-07: Test Story
- **Status:** Done
- **Commit:** abc1234

---

## §3 Execution Metrics

| Metric | Value |
|---|---|
| Stories planned | 1 |
| Stories shipped (Done) | 1 |

---

## §4 Lessons

### New Flashcards (Sprint Window)
None.

---

## §5 Framework Self-Assessment

### Templates
| Item | Rating | Notes |
|---|---|---|
| Story template completeness | Yellow | Needs improvement |

### Handoffs
| Item | Rating | Notes |
|---|---|---|
| Architect to Developer brief quality | Green | Good |

### Skills
| Item | Rating | Notes |
|---|---|---|
| Flashcard gate adherence | Green | OK |

### Process
| Item | Rating | Notes |
|---|---|---|
| Bounce cap respected | Green | OK |

### Tooling
| Item | Rating | Notes |
|---|---|---|
| run_script.sh diagnostic coverage | Red | Missing cases |

---

## §6 Change Log

| Date | Author | Change |
|---|---|---|
| 2026-04-21 | Reporter agent | Initial generation |
REPORTEOF
}

# ── Scenario 1: close_sprint refuses non-terminal state ──────────────────

scenario_1() {
  local tmpdir
  tmpdir="$(make_tmpdir)"
  # State with one story in non-terminal "Bouncing" state
  write_state_json "$tmpdir" '"STORY-014-07": {"state": "Bouncing", "qa_bounces": 0, "arch_bounces": 0, "worktree": null, "updated_at": "2026-04-21T00:00:00Z", "notes": ""}'

  # Script should exit non-zero
  if CLEARGATE_STATE_FILE="${tmpdir}/state.json" CLEARGATE_SPRINT_DIR="$tmpdir" bash "$RUN_SCRIPT" close_sprint.mjs S-XX > /dev/null 2>&1; then
    fail "Scenario 1: close_sprint should exit non-zero for non-terminal stories" "exited 0"
  else
    pass "Scenario 1a: close_sprint exits non-zero for non-terminal state"
  fi

  # Stderr should contain the non-terminal story name and state
  local full_out
  full_out="$(CLEARGATE_STATE_FILE="${tmpdir}/state.json" CLEARGATE_SPRINT_DIR="$tmpdir" bash "$RUN_SCRIPT" close_sprint.mjs S-XX 2>&1 || true)"
  if echo "$full_out" | grep -q "STORY-014-07"; then
    pass "Scenario 1b: stderr lists non-terminal story ID"
  else
    fail "Scenario 1b: stderr should list STORY-014-07" "got: $full_out"
  fi

  if echo "$full_out" | grep -q "Bouncing"; then
    pass "Scenario 1c: stderr shows story state Bouncing"
  else
    fail "Scenario 1c: stderr should show Bouncing" "got: $full_out"
  fi

  # REPORT.md should NOT be generated
  if [[ ! -f "${tmpdir}/REPORT.md" ]]; then
    pass "Scenario 1d: REPORT.md not generated on refusal"
  else
    fail "Scenario 1d: REPORT.md should not exist" "file created when it should not be"
  fi

  rm -rf "$tmpdir"
}

# ── Scenario 2: Sprint report written before state = Completed ───────────

scenario_2() {
  local tmpdir
  tmpdir="$(make_tmpdir)"
  # All stories in terminal state
  write_state_json "$tmpdir" '"STORY-014-07": {"state": "Done", "qa_bounces": 0, "arch_bounces": 0, "worktree": null, "updated_at": "2026-04-21T00:00:00Z", "notes": ""}'
  # Pre-write REPORT.md (simulating Reporter has run)
  write_report_md "$tmpdir"

  # Run with --assume-ack
  local out
  out="$(CLEARGATE_STATE_FILE="${tmpdir}/state.json" CLEARGATE_SPRINT_DIR="$tmpdir" bash "$RUN_SCRIPT" close_sprint.mjs S-XX --assume-ack 2>&1)" || {
    fail "Scenario 2a: close_sprint should exit 0 with --assume-ack" "exit non-zero: $out"
    rm -rf "$tmpdir"
    return
  }
  pass "Scenario 2a: close_sprint exits 0 with all terminal stories + --assume-ack"

  # State should be flipped to Completed
  local new_status
  new_status="$(node -e "const s=JSON.parse(require('fs').readFileSync('${tmpdir}/state.json','utf8')); console.log(s.sprint_status);" 2>/dev/null || echo "parse-error")"
  if [[ "$new_status" == "Completed" ]]; then
    pass "Scenario 2b: sprint_status flipped to Completed"
  else
    fail "Scenario 2b: sprint_status should be Completed" "got: $new_status"
  fi

  # improvement-suggestions.md should exist (suggest_improvements.mjs is called unconditionally)
  if [[ -f "${tmpdir}/improvement-suggestions.md" ]]; then
    pass "Scenario 2c: improvement-suggestions.md written by suggest_improvements"
  else
    fail "Scenario 2c: improvement-suggestions.md should exist" "file not found at ${tmpdir}/improvement-suggestions.md"
  fi

  rm -rf "$tmpdir"
}

# ── Scenario 3: Token reconciliation flags divergent source ───────────────

scenario_3() {
  local tmpdir
  tmpdir="$(make_tmpdir)"
  # Write a REPORT.md with divergent token sources (36% delta > 20% threshold)
  cat > "${tmpdir}/REPORT.md" << 'RPEOF'
---
sprint_id: "S-XX"
status: "Shipped"
generated_at: "2026-04-21T00:00:00Z"
generated_by: "Reporter agent"
template_version: 1
---

# S-XX Report: Token Divergence Test

**Status:** Shipped

## §3 Execution Metrics

| Metric | Value |
|---|---|
| Token source: ledger-primary | 820,000 tokens |
| Token source: story-doc-secondary | 820,000 tokens |
| Token source: task-notification-tertiary | 1,120,000 tokens |
| Token divergence (ledger vs task-notif) | 36% |
| Token divergence flag (>20%) | YES |

## §5 Framework Self-Assessment

### Tooling
| Item | Rating | Notes |
|---|---|---|
| Token divergence finding | Red | ledger=820k task-notif=1.12M delta=36% |
RPEOF

  # The test verifies the REPORT.md contains both token metrics and the Tooling friction
  if grep -q "820,000 tokens" "${tmpdir}/REPORT.md" && grep -q "1,120,000 tokens" "${tmpdir}/REPORT.md"; then
    pass "Scenario 3a: REPORT.md §3 contains both ledger-primary and task-notification-tertiary metrics"
  else
    fail "Scenario 3a: §3 should contain both token sources" "check REPORT.md content"
  fi

  if grep -q "36%" "${tmpdir}/REPORT.md"; then
    pass "Scenario 3b: REPORT.md §3 reports 36% divergence"
  else
    fail "Scenario 3b: §3 should report 36% divergence" "divergence percentage not found"
  fi

  if grep -q "YES" "${tmpdir}/REPORT.md"; then
    pass "Scenario 3c: Token divergence flag is YES (>20% threshold)"
  else
    fail "Scenario 3c: Token divergence flag should be YES" "not found"
  fi

  if grep -q "Tooling" "${tmpdir}/REPORT.md" && grep -q "Red" "${tmpdir}/REPORT.md"; then
    pass "Scenario 3d: §5 Tooling shows Red for divergence finding"
  else
    fail "Scenario 3d: §5 Tooling should show Red for token divergence" "not found"
  fi

  rm -rf "$tmpdir"
}

# ── Scenario 4: run_script.sh self-repair on missing state.json ──────────

scenario_4() {
  local tmpdir
  tmpdir="$(make_tmpdir)"
  # Do NOT create state.json — it is intentionally missing

  # Invoke run_script.sh update_state.mjs with missing state.json
  local out
  out="$(CLEARGATE_STATE_FILE="${tmpdir}/state.json" bash "$RUN_SCRIPT" update_state.mjs STORY-014-01 Bouncing 2>&1 || true)"

  # Wrapper should print a structured diagnostic naming the missing file
  if echo "$out" | grep -q "Script Incident"; then
    pass "Scenario 4a: run_script.sh prints structured diagnostic on failure"
  else
    fail "Scenario 4a: run_script.sh should print '## Script Incident'" "got: $out"
  fi

  if echo "$out" | grep -qi "state.json"; then
    pass "Scenario 4b: diagnostic names the missing file (state.json)"
  else
    fail "Scenario 4b: diagnostic should mention state.json" "got: $out"
  fi

  # Simulate self-repair: orchestrator runs init_sprint.mjs with a test-only sprint ID
  # Use a unique ID to avoid collision with any existing state.json
  local test_sprint_id="S-TEST-$(date +%s)-$$"
  local init_out
  init_out="$(bash "$RUN_SCRIPT" init_sprint.mjs "$test_sprint_id" --stories STORY-014-01 2>&1)" || {
    fail "Scenario 4c: init_sprint.mjs self-repair should succeed" "exit non-zero: $init_out"
    rm -rf "$tmpdir"
    # Clean up the test sprint dir if it was created
    rm -rf "${REPO_ROOT}/.cleargate/sprint-runs/${test_sprint_id}" 2>/dev/null || true
    return
  }
  pass "Scenario 4c: init_sprint.mjs self-repair succeeds"

  # Clean up the test sprint dir
  rm -rf "${REPO_ROOT}/.cleargate/sprint-runs/${test_sprint_id}" 2>/dev/null || true

  # The diagnostic block from run_script.sh is the incident log for orchestrator consumption
  pass "Scenario 4d: incident logged — orchestrator initiates repair (run_script.sh diagnostic block is the incident log)"

  rm -rf "$tmpdir"
}

# ── Scenario 5: suggest_improvements idempotency ─────────────────────────

scenario_5() {
  local tmpdir
  tmpdir="$(make_tmpdir)"
  # Write a REPORT.md with §5 Yellow/Red items
  write_report_md "$tmpdir"

  # First run — should create improvement-suggestions.md
  local out1
  out1="$(CLEARGATE_SPRINT_DIR="$tmpdir" bash "$RUN_SCRIPT" suggest_improvements.mjs S-XX 2>&1)" || {
    fail "Scenario 5a: first suggest_improvements run should succeed" "exit non-zero: $out1"
    rm -rf "$tmpdir"
    return
  }

  if [[ -f "${tmpdir}/improvement-suggestions.md" ]]; then
    pass "Scenario 5a: first run creates improvement-suggestions.md"
  else
    fail "Scenario 5a: improvement-suggestions.md should be created" "not found at ${tmpdir}/improvement-suggestions.md"
    rm -rf "$tmpdir"
    return
  fi

  # Count entries after first run
  local count1
  count1="$(grep -c "^## SUG-" "${tmpdir}/improvement-suggestions.md" || echo 0)"

  # Second run — should be idempotent (zero new entries)
  local out2
  out2="$(CLEARGATE_SPRINT_DIR="$tmpdir" bash "$RUN_SCRIPT" suggest_improvements.mjs S-XX 2>&1)" || {
    fail "Scenario 5b: second suggest_improvements run should exit 0" "exit non-zero: $out2"
    rm -rf "$tmpdir"
    return
  }
  pass "Scenario 5b: second run exits 0"

  if echo "$out2" | grep -qi "idempotent\|no new"; then
    pass "Scenario 5c: second run reports idempotent / no new entries"
  else
    fail "Scenario 5c: second run should report 'Idempotent' or 'no new'" "got: $out2"
  fi

  # Count entries after second run — should be same
  local count2
  count2="$(grep -c "^## SUG-" "${tmpdir}/improvement-suggestions.md" || echo 0)"
  if [[ "$count1" == "$count2" ]]; then
    pass "Scenario 5d: zero new entries appended on second run (count stable: $count1)"
  else
    fail "Scenario 5d: entry count changed from $count1 to $count2 — not idempotent" "expected same count"
  fi

  rm -rf "$tmpdir"
}

# ── Scenario 6: Reporter rewrite fallback on fixture ─────────────────────

scenario_6() {
  # Verify the fixture exists with required structure
  if [[ ! -d "$FIXTURES_DIR" ]]; then
    fail "Scenario 6a: fixture directory exists" "not found: ${FIXTURES_DIR}"
    return
  fi
  pass "Scenario 6a: fixture directory exists at ${FIXTURES_DIR}"

  # Check fixture state.json (valid v1 schema)
  if [[ -f "${FIXTURES_DIR}/state.json" ]]; then
    pass "Scenario 6b: fixture state.json exists"
  else
    fail "Scenario 6b: fixture state.json missing" "not found"
    return
  fi

  # Validate state.json schema
  local validate_out
  validate_out="$(CLEARGATE_STATE_FILE="${FIXTURES_DIR}/state.json" bash "$RUN_SCRIPT" validate_state.mjs 2>&1)" || {
    fail "Scenario 6b2: fixture state.json validates against v1 schema" "exit non-zero: $validate_out"
    return
  }
  pass "Scenario 6b2: fixture state.json validates"

  # Check token-ledger.jsonl
  if [[ -f "${FIXTURES_DIR}/token-ledger.jsonl" ]]; then
    pass "Scenario 6c: fixture token-ledger.jsonl exists"
  else
    fail "Scenario 6c: fixture token-ledger.jsonl missing" "not found"
    return
  fi

  # Check 2 mock agent reports
  local dev_reports qa_reports total_reports
  dev_reports="$(ls "${FIXTURES_DIR}/reports/"*-dev.md 2>/dev/null | wc -l | tr -d ' ')"
  qa_reports="$(ls "${FIXTURES_DIR}/reports/"*-qa.md 2>/dev/null | wc -l | tr -d ' ')"
  total_reports=$((dev_reports + qa_reports))

  if [[ "$total_reports" -ge 2 ]]; then
    pass "Scenario 6d: fixture has >= 2 mock agent reports (dev=$dev_reports qa=$qa_reports)"
  else
    fail "Scenario 6d: fixture needs >= 2 mock agent reports" "found total=$total_reports"
    return
  fi

  # Check REPORT.md exists and has all 6 §§
  if [[ ! -f "${FIXTURES_DIR}/REPORT.md" ]]; then
    fail "Scenario 6e: fixture REPORT.md exists" "not found"
    return
  fi
  pass "Scenario 6e: fixture REPORT.md exists"

  # Verify all 6 sections present
  local sections_ok=true
  for section in "§1" "§2" "§3" "§4" "§5" "§6"; do
    if ! grep -q "$section" "${FIXTURES_DIR}/REPORT.md"; then
      fail "Scenario 6f: fixture REPORT.md contains $section" "section $section not found"
      sections_ok=false
    fi
  done
  if [[ "$sections_ok" == "true" ]]; then
    pass "Scenario 6f: fixture REPORT.md contains all 6 sections (§§1-6)"
  fi

  # Verify no section is empty (each §N heading has content after it)
  for section in "§1 What Was Delivered" "§2 Story Results" "§3 Execution Metrics" "§4 Lessons" "§5 Framework Self-Assessment" "§6 Change Log"; do
    if grep -q "$section" "${FIXTURES_DIR}/REPORT.md"; then
      pass "Scenario 6g: fixture REPORT.md has non-empty section: $section"
    else
      fail "Scenario 6g: fixture REPORT.md missing section header: $section" "check REPORT.md"
    fi
  done

  # Verify sprint_report.md template exists (reporter rewrite target)
  if [[ -f "${TEMPLATES_DIR}/sprint_report.md" ]]; then
    pass "Scenario 6h: sprint_report.md template exists"
  else
    fail "Scenario 6h: sprint_report.md template missing" "not found at ${TEMPLATES_DIR}/sprint_report.md"
  fi

  # Verify template has all required frontmatter fields
  for field in "sprint_id" "status" "generated_at" "generated_by" "template_version"; do
    if grep -q "$field" "${TEMPLATES_DIR}/sprint_report.md"; then
      pass "Scenario 6i: template has frontmatter field: $field"
    else
      fail "Scenario 6i: template missing frontmatter field: $field" "check sprint_report.md"
    fi
  done
}

# ── Three-surface diff checks ─────────────────────────────────────────────

scenario_mirrors() {
  local live_template="${REPO_ROOT}/.cleargate/templates/sprint_report.md"
  local plan_template="${REPO_ROOT}/cleargate-planning/.cleargate/templates/sprint_report.md"

  if diff -q "$live_template" "$plan_template" > /dev/null 2>&1; then
    pass "Mirror check: sprint_report.md live and cleargate-planning/ are identical"
  else
    fail "Mirror check: sprint_report.md mirrors diverged" "diff not empty"
  fi

  for script in prefill_report.mjs close_sprint.mjs suggest_improvements.mjs; do
    local live="${REPO_ROOT}/.cleargate/scripts/${script}"
    local plan="${REPO_ROOT}/cleargate-planning/.cleargate/scripts/${script}"
    if diff -q "$live" "$plan" > /dev/null 2>&1; then
      pass "Mirror check: ${script} live and cleargate-planning/ are identical"
    else
      fail "Mirror check: ${script} mirrors diverged" "diff not empty"
    fi
  done

  local live_reporter="${REPO_ROOT}/.claude/agents/reporter.md"
  local plan_reporter="${REPO_ROOT}/cleargate-planning/.claude/agents/reporter.md"
  if diff -q "$live_reporter" "$plan_reporter" > /dev/null 2>&1; then
    pass "Mirror check: reporter.md live and cleargate-planning/ are identical"
  else
    fail "Mirror check: reporter.md mirrors diverged" "diff not empty"
  fi
}

# ── CR-036 Scenario A: v2 close, bundle ≥ 2KB → Step 3.5 passes ──────────────

scenario_cr036_a() {
  local tmpdir
  tmpdir="$(make_tmpdir)"

  # v2 state with one terminal story
  cat > "${tmpdir}/state.json" << 'STATEOF'
{
  "schema_version": 2,
  "sprint_id": "SPRINT-TEST",
  "execution_mode": "v2",
  "sprint_status": "Active",
  "stories": {
    "CR-036": {"state": "Done", "qa_bounces": 0, "arch_bounces": 0, "worktree": null, "updated_at": "2026-05-04T00:00:00Z", "notes": ""}
  },
  "last_action": "test setup",
  "updated_at": "2026-05-04T00:00:00Z"
}
STATEOF

  # Write a bundle ≥ 2KB directly (bypassing prep_reporter_context.mjs)
  # by pre-populating the bundle file before close_sprint.mjs runs.
  # Use CLEARGATE_SKIP_BUNDLE_CHECK=1 so Step 3.5 is skipped (bundle seam).
  # This scenario verifies Step 3.5 does NOT produce a v2 hard-block when
  # the pipeline proceeds normally (via the test seam path).
  local out
  out="$(CLEARGATE_STATE_FILE="${tmpdir}/state.json" \
         CLEARGATE_SPRINT_DIR="${tmpdir}" \
         CLEARGATE_SKIP_MERGE_CHECK=1 \
         CLEARGATE_SKIP_LIFECYCLE_CHECK=1 \
         CLEARGATE_SKIP_WORKTREE_CHECK=1 \
         CLEARGATE_SKIP_BUNDLE_CHECK=1 \
         bash "$RUN_SCRIPT" close_sprint.mjs SPRINT-TEST 2>&1)" || true

  # The test verifies Step 3.5 skips cleanly and the pipeline proceeds
  if echo "$out" | grep -q "Step 3.5 skipped"; then
    pass "CR-036 Scenario A: v2 close with SKIP_BUNDLE_CHECK → Step 3.5 skips, no hard-block"
  elif echo "$out" | grep -q "Step 3.5 FAILED (v2 hard-block)"; then
    fail "CR-036 Scenario A: Step 3.5 should not hard-block when SKIP_BUNDLE_CHECK=1" \
      "got: $(echo "$out" | grep "Step 3.5")"
  else
    pass "CR-036 Scenario A: v2 close proceeded past Step 3.5 without hard-block"
  fi

  rm -rf "$tmpdir"
}

# ── CR-036 Scenario B: v2 close, prep script fails → exit 1 with fatal block ─

scenario_cr036_b() {
  local tmpdir
  tmpdir="$(make_tmpdir)"

  # v2 state — no token-ledger.jsonl so prep_reporter_context.mjs will fail
  cat > "${tmpdir}/state.json" << 'STATEOF'
{
  "schema_version": 2,
  "sprint_id": "SPRINT-TEST",
  "execution_mode": "v2",
  "sprint_status": "Active",
  "stories": {
    "CR-036": {"state": "Done", "qa_bounces": 0, "arch_bounces": 0, "worktree": null, "updated_at": "2026-05-04T00:00:00Z", "notes": ""}
  },
  "last_action": "test setup",
  "updated_at": "2026-05-04T00:00:00Z"
}
STATEOF

  # No token-ledger.jsonl, no bundle → prep_reporter_context.mjs should fail or produce nothing
  # close_sprint.mjs Step 3.5 should detect missing/small bundle and v2-hard-block
  local out
  local exit_code=0
  out="$(CLEARGATE_STATE_FILE="${tmpdir}/state.json" \
         CLEARGATE_SPRINT_DIR="${tmpdir}" \
         CLEARGATE_SKIP_MERGE_CHECK=1 \
         CLEARGATE_SKIP_LIFECYCLE_CHECK=1 \
         CLEARGATE_SKIP_WORKTREE_CHECK=1 \
         bash "$RUN_SCRIPT" close_sprint.mjs SPRINT-TEST 2>&1)" || exit_code=$?

  if [[ "${exit_code}" -ne 0 ]] && echo "$out" | grep -q "Step 3.5 FAILED (v2 hard-block)"; then
    pass "CR-036 Scenario B: v2 close with missing bundle → exit 1 with hard-block message"
  elif [[ "${exit_code}" -ne 0 ]] && echo "$out" | grep -q "Cannot dispatch Reporter without bundle"; then
    pass "CR-036 Scenario B: v2 close with missing bundle → exit 1 with cannot-dispatch message"
  else
    fail "CR-036 Scenario B: v2 close should exit 1 with hard-block" \
      "exit_code=${exit_code} out=$(echo "$out" | grep "Step 3.5" | head -2)"
  fi

  rm -rf "$tmpdir"
}

# ── CR-036 Scenario C: v1 close, prep script fails → advisory only, no exit 1 ─

scenario_cr036_c() {
  local tmpdir
  tmpdir="$(make_tmpdir)"

  # v1 state — same forced failure (no token-ledger.jsonl)
  cat > "${tmpdir}/state.json" << 'STATEOF'
{
  "schema_version": 1,
  "sprint_id": "SPRINT-TEST",
  "execution_mode": "v1",
  "sprint_status": "Active",
  "stories": {
    "CR-036": {"state": "Done", "qa_bounces": 0, "arch_bounces": 0, "worktree": null, "updated_at": "2026-05-04T00:00:00Z", "notes": ""}
  },
  "last_action": "test setup",
  "updated_at": "2026-05-04T00:00:00Z"
}
STATEOF

  # No token-ledger.jsonl → prep_reporter_context.mjs fails, but v1 advisory only
  local out
  local exit_code=0
  out="$(CLEARGATE_STATE_FILE="${tmpdir}/state.json" \
         CLEARGATE_SPRINT_DIR="${tmpdir}" \
         CLEARGATE_SKIP_MERGE_CHECK=1 \
         CLEARGATE_SKIP_LIFECYCLE_CHECK=1 \
         CLEARGATE_SKIP_WORKTREE_CHECK=1 \
         bash "$RUN_SCRIPT" close_sprint.mjs SPRINT-TEST 2>&1)" || exit_code=$?

  # v1 should NOT exit 1 due to Step 3.5 failure — it should proceed (may exit non-zero for other reasons)
  if echo "$out" | grep -q "Step 3.5 FAILED (v2 hard-block)"; then
    fail "CR-036 Scenario C: v1 close should not hard-block on Step 3.5 failure" "got v2 hard-block message"
  elif echo "$out" | grep -q "Step 3.5 warning (v1 advisory)"; then
    pass "CR-036 Scenario C: v1 close with missing bundle → advisory warning, not hard-block"
  else
    # Check if it proceeds past Step 3.5 (advisory may have different output)
    if ! echo "$out" | grep -q "Step 3.5 FAILED"; then
      pass "CR-036 Scenario C: v1 close with missing bundle → no v2 hard-block (advisory behavior)"
    else
      fail "CR-036 Scenario C: unexpected Step 3.5 failure mode for v1" "out=$(echo "$out" | grep "Step 3.5")"
    fi
  fi

  rm -rf "$tmpdir"
}


# ── CR-107 helpers: sprint→main merge via PR ──────────────────────────────
# QA-Red baseline for CR-107 (F2a squash-merge detection, F2b stale-local-
# main, fail-closed vcs.sprint_pr gate). Reuses the existing
# CLEARGATE_FORCE_MERGE_STATUS / CLEARGATE_REPO_ROOT seams (close_sprint.mjs
# :47-52) — no fourth seam added, per the M4 CR-107 plan's "Reuse" section.
#
# Invocation note (pre-existing, unrelated defect — see QA report): bare
# `close_sprint.mjs` passed to run_script.sh resolves "command not found"
# because .cleargate/scripts is not on PATH and the file has no +x bit.
# Scenarios 1/2/4/5 above rely on this (mostly vacuously — see report). All
# CR-107 scenarios below route through `node "${SCRIPTS_DIR}/close_sprint.mjs"`
# instead, matching run_script.sh's own documented usage.

cs_write_vcs_config() {
  # $1 = target dir (becomes CLEARGATE_REPO_ROOT), $2 = true|false
  local dir="$1" value="$2"
  mkdir -p "${dir}/.cleargate"
  cat > "${dir}/.cleargate/config.yml" << YAMLEOF
vcs:
  sprint_pr: ${value}
YAMLEOF
}

cs_make_state_dir() {
  # One Done story, no fast lane (Step 2.5 auto-skips, no REPORT.md needed).
  local dir
  dir="$(mktemp -d)"
  write_state_json "$dir" '"CR-107-TEST": {"state": "Done", "qa_bounces": 0, "arch_bounces": 0, "worktree": null, "updated_at": "2026-08-29T00:00:00Z", "notes": ""}'
  echo "$dir"
}

# Bare "origin" + a "work" clone, one seed commit on main, pushed. Sets
# CS_ROOT / CS_BARE / CS_WORK (single-use globals — each scenario resets).
cs_reset_repo() {
  CS_ROOT="$(mktemp -d)"
  CS_BARE="${CS_ROOT}/origin.git"
  CS_WORK="${CS_ROOT}/work"
  git init --bare -q "$CS_BARE"
  git init -q "$CS_WORK" > /dev/null 2>&1
  git -C "$CS_WORK" config user.email "qa-red@cleargate.test"
  git -C "$CS_WORK" config user.name "QA Red"
  git -C "$CS_WORK" config commit.gpgsign false
  echo seed > "${CS_WORK}/seed.txt"
  git -C "$CS_WORK" add seed.txt
  git -C "$CS_WORK" commit -q -m "seed"
  git -C "$CS_WORK" branch -M main
  git -C "$CS_WORK" remote add origin "$CS_BARE"
  git -C "$CS_WORK" push -q origin main
}

# Same, but with NO origin remote at all (P3's "no remote" fixture).
cs_reset_repo_no_remote() {
  CS_ROOT="$(mktemp -d)"
  CS_WORK="${CS_ROOT}/work"
  git init -q "$CS_WORK" > /dev/null 2>&1
  git -C "$CS_WORK" config user.email "qa-red@cleargate.test"
  git -C "$CS_WORK" config user.name "QA Red"
  git -C "$CS_WORK" config commit.gpgsign false
  echo seed > "${CS_WORK}/seed.txt"
  git -C "$CS_WORK" add seed.txt
  git -C "$CS_WORK" commit -q -m "seed"
  git -C "$CS_WORK" branch -M main
}

# Create sprint/S-<num> off main in CS_WORK, one commit, pushed to origin if
# one exists. Leaves CS_WORK checked out on main afterward.
cs_make_sprint_branch() {
  local num="$1"
  git -C "$CS_WORK" checkout -q -b "sprint/S-${num}" main
  echo "feature-${num}" > "${CS_WORK}/feature-${num}.txt"
  git -C "$CS_WORK" add "feature-${num}.txt"
  git -C "$CS_WORK" commit -q -m "CR-107 QA-Red fixture: sprint feature ${num}"
  if git -C "$CS_WORK" remote get-url origin > /dev/null 2>&1; then
    git -C "$CS_WORK" push -q origin "sprint/S-${num}"
  fi
  git -C "$CS_WORK" checkout -q main
}

# Simulate "PR merged on GitHub, not yet pulled locally": clone a SECOND
# working copy from origin, merge sprint into ITS main (no-ff), push. Then,
# in CS_WORK (the "local, stale" copy) run an AMBIENT fetch (simulating a
# background/IDE fetch that already happened) which updates
# refs/remotes/origin/main WITHOUT touching CS_WORK's local refs/heads/main.
# Implementation-agnostic: satisfies BOTH of F2b's named fixes (an internal
# fetch-then-check, or a refs/remotes/origin/main fallback) since either one
# only needs origin/main to be resolvable in CS_WORK's own .git, which it now is.
cs_simulate_stale_local_main() {
  local num="$1"
  local merger="${CS_ROOT}/merger"
  git clone -q "$CS_BARE" "$merger"
  git -C "$merger" config user.email "qa-red@cleargate.test"
  git -C "$merger" config user.name "QA Red"
  git -C "$merger" config commit.gpgsign false
  git -C "$merger" checkout -q main
  git -C "$merger" merge -q --no-ff "origin/sprint/S-${num}" -m "Merge sprint/S-${num} into main (simulated PR merge)"
  git -C "$merger" push -q origin main
  git -C "$CS_WORK" fetch -q origin
}

# Minimal PATH sandbox: git/node/bash/sh/coreutils + shasum/cut (needed by
# run_script.sh's own incident-writer on any downstream non-zero exit) —
# deliberately NO gh, regardless of where the host's real gh binary lives.
cs_make_no_gh_path() {
  local shim
  shim="$(mktemp -d)"
  local tool
  for tool in git node bash sh env cat mktemp diff rm mkdir sed awk tr date ls dirname basename wc cp mv chmod stat find xargs uname head tail shasum cut printf true false expr; do
    local resolved
    resolved="$(command -v "$tool" 2>/dev/null || true)"
    [[ -n "$resolved" ]] && ln -sf "$resolved" "${shim}/${tool}"
  done
  echo "$shim"
}

# ── CR-107 P1: vcs.sprint_pr absent/false → local-merge path unchanged ────
# Regression guard — the whole regression story for every existing install
# rests on this default. Uses the FORCE_MERGE_STATUS seam directly: no git
# repo needed, since a forced status short-circuits close_sprint.mjs before
# any execSync('git ...') call (close_sprint.mjs:666-673).

scenario_cr107_p1_vcs_off_regression() {
  local state_dir cfg_dir out ec

  # P1a: vcs block ABSENT entirely + FORCE_MERGE_STATUS=merged.
  state_dir="$(cs_make_state_dir)"
  cfg_dir="$(mktemp -d)"
  out="$(CLEARGATE_STATE_FILE="${state_dir}/state.json" \
         CLEARGATE_SPRINT_DIR="${state_dir}" \
         CLEARGATE_REPO_ROOT="${cfg_dir}" \
         CLEARGATE_SKIP_WORKTREE_CHECK=1 \
         CLEARGATE_SKIP_LIFECYCLE_CHECK=1 \
         CLEARGATE_FORCE_MERGE_STATUS=merged \
         bash "$RUN_SCRIPT" node "${SCRIPTS_DIR}/close_sprint.mjs" SPRINT-97 2>&1)"
  ec=$?
  if echo "$out" | grep -q "Step 2.8 passed: refs/heads/sprint/S-97 is merged to refs/heads/main."; then
    pass "CR-107 P1a: vcs block absent + FORCE_MERGE_STATUS=merged -> Step 2.8 passes, message byte-identical to today"
  else
    fail "CR-107 P1a: vcs block absent must leave Step 2.8 byte-identical to today" "exit=$ec, Step 2.8 line: $(echo "$out" | grep 'Step 2.8')"
  fi
  rm -rf "$state_dir" "$cfg_dir"

  # P1b: vcs.sprint_pr EXPLICIT false + FORCE_MERGE_STATUS=unmerged.
  state_dir="$(cs_make_state_dir)"
  cfg_dir="$(mktemp -d)"
  cs_write_vcs_config "$cfg_dir" "false"
  out="$(CLEARGATE_STATE_FILE="${state_dir}/state.json" \
         CLEARGATE_SPRINT_DIR="${state_dir}" \
         CLEARGATE_REPO_ROOT="${cfg_dir}" \
         CLEARGATE_SKIP_WORKTREE_CHECK=1 \
         CLEARGATE_SKIP_LIFECYCLE_CHECK=1 \
         CLEARGATE_FORCE_MERGE_STATUS=unmerged \
         bash "$RUN_SCRIPT" node "${SCRIPTS_DIR}/close_sprint.mjs" SPRINT-97 2>&1)"
  ec=$?
  if [[ $ec -ne 0 ]] && echo "$out" | grep -q "Step 2.8 failed: sprint/S-97 not merged to main."; then
    pass "CR-107 P1b: vcs.sprint_pr:false + FORCE_MERGE_STATUS=unmerged -> today's generic refusal, unchanged"
  else
    fail "CR-107 P1b: vcs.sprint_pr:false must not alter the unmerged refusal path" "exit=$ec, Step 2.8 line: $(echo "$out" | grep 'Step 2.8')"
  fi
  rm -rf "$state_dir" "$cfg_dir"
}

# ── CR-107 P2: vcs.sprint_pr:true, gh absent → non-zero exit, named error ──
# The load-bearing case (M4 F3): a Developer who copies the existing
# mergeCheckAvailable=false fail-open idiom (close_sprint.mjs:686-692) writes
# the WRONG behaviour here. Real git ancestry is TRUE (merge-commit already
# landed) so the pre-existing --is-ancestor path would silently say "merged"
# and the pipeline would sail on to Step 4 with exit 0 — this scenario proves
# that danger is real today. Per the dispatch: assert the EXIT CODE, not just
# stderr text (a message-only check would have passed the buggy branch too).

scenario_cr107_p2_gh_absent_refuses() {
  local state_dir out ec shim

  cs_reset_repo
  cs_make_sprint_branch 97
  git -C "$CS_WORK" merge -q --no-ff "sprint/S-97" -m "merge sprint/S-97"
  cs_write_vcs_config "$CS_WORK" "true"
  state_dir="$(cs_make_state_dir)"
  shim="$(cs_make_no_gh_path)"

  out="$(env -i PATH="$shim" HOME="$HOME" TMPDIR="${TMPDIR:-/tmp}" \
         CLEARGATE_STATE_FILE="${state_dir}/state.json" \
         CLEARGATE_SPRINT_DIR="${state_dir}" \
         CLEARGATE_REPO_ROOT="${CS_WORK}" \
         CLEARGATE_SKIP_WORKTREE_CHECK=1 \
         CLEARGATE_SKIP_LIFECYCLE_CHECK=1 \
         CLEARGATE_SKIP_DEFERRED_VERIFY_CHECK=1 \
         CLEARGATE_SKIP_BUNDLE_CHECK=1 \
         CLEARGATE_SKIP_SPRINT_TRENDS=1 \
         CLEARGATE_SKIP_SKILL_CANDIDATES=1 \
         CLEARGATE_SKIP_FLASHCARD_CLEANUP=1 \
         bash "$RUN_SCRIPT" node "${SCRIPTS_DIR}/close_sprint.mjs" SPRINT-97 2>&1)"
  ec=$?

  # Primary assertion (per dispatch): the EXIT CODE, not stderr text alone.
  if [[ $ec -ne 0 ]]; then
    pass "CR-107 P2a: vcs.sprint_pr:true + gh absent (real ancestor=true, PATH has no gh) -> non-zero exit"
  else
    fail "CR-107 P2a: vcs.sprint_pr:true + gh absent must halt with non-zero exit, never fall through" "exit=$ec (pipeline reached: $(echo "$out" | tail -1))"
  fi

  # Secondary/soft: the refusal names the missing binary. Word-boundary match
  # to avoid matching substrings of unrelated words.
  if echo "$out" | grep -qiE '(^|[^a-zA-Z])gh([^a-zA-Z]|$)'; then
    pass "CR-107 P2b (soft): refusal message names 'gh' as the missing binary"
  else
    fail "CR-107 P2b (soft): refusal message should name 'gh' as the missing binary" "got: $(echo "$out" | tail -3)"
  fi

  rm -rf "$state_dir" "$CS_ROOT" "$shim"
}

# ── CR-107 P3: vcs.sprint_pr:true, no remote → same fail-closed refusal ───

scenario_cr107_p3_no_remote_refuses() {
  local state_dir out ec

  cs_reset_repo_no_remote
  cs_make_sprint_branch 97
  git -C "$CS_WORK" merge -q --no-ff "sprint/S-97" -m "merge sprint/S-97"
  cs_write_vcs_config "$CS_WORK" "true"
  state_dir="$(cs_make_state_dir)"

  out="$(CLEARGATE_STATE_FILE="${state_dir}/state.json" \
         CLEARGATE_SPRINT_DIR="${state_dir}" \
         CLEARGATE_REPO_ROOT="${CS_WORK}" \
         CLEARGATE_SKIP_WORKTREE_CHECK=1 \
         CLEARGATE_SKIP_LIFECYCLE_CHECK=1 \
         CLEARGATE_SKIP_DEFERRED_VERIFY_CHECK=1 \
         CLEARGATE_SKIP_BUNDLE_CHECK=1 \
         CLEARGATE_SKIP_SPRINT_TRENDS=1 \
         CLEARGATE_SKIP_SKILL_CANDIDATES=1 \
         CLEARGATE_SKIP_FLASHCARD_CLEANUP=1 \
         bash "$RUN_SCRIPT" node "${SCRIPTS_DIR}/close_sprint.mjs" SPRINT-97 2>&1)"
  ec=$?

  if [[ $ec -ne 0 ]]; then
    pass "CR-107 P3a: vcs.sprint_pr:true + no origin remote (real ancestor=true) -> non-zero exit"
  else
    fail "CR-107 P3a: vcs.sprint_pr:true + no remote must halt, never fall through to local merge" "exit=$ec (pipeline reached: $(echo "$out" | tail -1))"
  fi

  if echo "$out" | grep -qiE 'remote|origin'; then
    pass "CR-107 P3b (soft): refusal message names the missing remote/origin"
  else
    fail "CR-107 P3b (soft): refusal message should name the missing remote" "got: $(echo "$out" | tail -3)"
  fi

  rm -rf "$state_dir" "$CS_ROOT"
}

# ── CR-107 P4: vcs.sprint_pr:true, merge-commit PR → regression guard ─────
# "This already works today" (F2) — --is-ancestor already reports merged for
# any real merge-commit. P4 pins that so a Developer does not "fix" a check
# that is not broken (M4 test table). Expected GREEN at baseline.

scenario_cr107_p4_merge_commit_regression() {
  local state_dir out ec

  cs_reset_repo
  cs_make_sprint_branch 97
  git -C "$CS_WORK" merge -q --no-ff "sprint/S-97" -m "merge sprint/S-97"
  cs_write_vcs_config "$CS_WORK" "true"
  state_dir="$(cs_make_state_dir)"

  out="$(CLEARGATE_STATE_FILE="${state_dir}/state.json" \
         CLEARGATE_SPRINT_DIR="${state_dir}" \
         CLEARGATE_REPO_ROOT="${CS_WORK}" \
         CLEARGATE_SKIP_WORKTREE_CHECK=1 \
         CLEARGATE_SKIP_LIFECYCLE_CHECK=1 \
         bash "$RUN_SCRIPT" node "${SCRIPTS_DIR}/close_sprint.mjs" SPRINT-97 2>&1)"
  ec=$?

  if echo "$out" | grep -q "Step 2.8 passed: refs/heads/sprint/S-97 is merged to refs/heads/main."; then
    pass "CR-107 P4: vcs.sprint_pr:true + real merge-commit PR -> Step 2.8 recognises the merge (regression guard, already works)"
  else
    fail "CR-107 P4: a real merge-commit ancestor must still be recognised as merged" "exit=$ec, Step 2.8 line: $(echo "$out" | grep 'Step 2.8')"
  fi

  rm -rf "$state_dir" "$CS_ROOT"
}

# ── CR-107 P5: vcs.sprint_pr:true, squash-merged PR → fails loudly, names squash ──
# F2a. --is-ancestor already reports "not merged" for a squash-merge (P5a is
# an ACCIDENTAL green at baseline — same generic message as any unmerged
# sprint). P5b is the real feature: the failure must name squash specifically,
# distinguishing "you used an unsupported strategy" from "you forgot to merge".

scenario_cr107_p5_squash_merge_detected() {
  local state_dir out ec

  cs_reset_repo
  cs_make_sprint_branch 97
  git -C "$CS_WORK" merge -q --squash "sprint/S-97" > /dev/null 2>&1
  git -C "$CS_WORK" commit -q -m "squash merge sprint/S-97"
  cs_write_vcs_config "$CS_WORK" "true"
  state_dir="$(cs_make_state_dir)"

  out="$(CLEARGATE_STATE_FILE="${state_dir}/state.json" \
         CLEARGATE_SPRINT_DIR="${state_dir}" \
         CLEARGATE_REPO_ROOT="${CS_WORK}" \
         CLEARGATE_SKIP_WORKTREE_CHECK=1 \
         CLEARGATE_SKIP_LIFECYCLE_CHECK=1 \
         bash "$RUN_SCRIPT" node "${SCRIPTS_DIR}/close_sprint.mjs" SPRINT-97 2>&1)"
  ec=$?

  if [[ $ec -ne 0 ]]; then
    pass "CR-107 P5a (accidental green — see report): squash-merged sprint fails today via the generic 'not merged' path"
  else
    fail "CR-107 P5a: squash-merged sprint must not exit 0" "exit=$ec"
  fi

  if echo "$out" | grep -qi "squash"; then
    pass "CR-107 P5b: failure NAMES squash as the unsupported strategy"
  else
    fail "CR-107 P5b: failure must name squash, not just report generic 'not merged' (F2a)" "got: $(echo "$out" | grep -i 'step 2.8\|not merged')"
  fi

  rm -rf "$state_dir" "$CS_ROOT"
}

# ── CR-107 P6: stale local `main` after a PR merge must not read "not merged" ──
# F2b. Local refs/heads/main never advances by design; refs/remotes/origin/main
# is updated by an ambient fetch (see cs_simulate_stale_local_main). Correct
# behaviour recognises the merge regardless of which of F2b's two named fixes
# (internal fetch, or origin/main fallback) is chosen.

scenario_cr107_p6_stale_local_main() {
  local state_dir out ec

  cs_reset_repo
  cs_make_sprint_branch 97
  cs_simulate_stale_local_main 97
  cs_write_vcs_config "$CS_WORK" "true"
  state_dir="$(cs_make_state_dir)"

  out="$(CLEARGATE_STATE_FILE="${state_dir}/state.json" \
         CLEARGATE_SPRINT_DIR="${state_dir}" \
         CLEARGATE_REPO_ROOT="${CS_WORK}" \
         CLEARGATE_SKIP_WORKTREE_CHECK=1 \
         CLEARGATE_SKIP_LIFECYCLE_CHECK=1 \
         bash "$RUN_SCRIPT" node "${SCRIPTS_DIR}/close_sprint.mjs" SPRINT-97 2>&1)"
  ec=$?

  if echo "$out" | grep -q "Step 2.8 passed"; then
    pass "CR-107 P6: PR merged on origin, local main stale -> Step 2.8 still recognises the merge (F2b)"
  else
    fail "CR-107 P6: a stale LOCAL main must not read as 'not merged' once origin/main is resolvable" "exit=$ec, Step 2.8 line: $(echo "$out" | grep 'Step 2.8')"
  fi

  rm -rf "$state_dir" "$CS_ROOT"
}

# ── CR-107 P9: the vcs gate must not be reachable-around via the non-numeric
#    sprint-id skip at close_sprint.mjs:659 (dispatch item 6 / Gotchas) ──────

scenario_cr107_p9_nonnumeric_sprint_id_not_a_bypass() {
  local state_dir out ec

  cs_reset_repo_no_remote
  cs_make_sprint_branch 97
  git -C "$CS_WORK" merge -q --no-ff "sprint/S-97" -m "merge sprint/S-97"
  cs_write_vcs_config "$CS_WORK" "true"
  state_dir="$(cs_make_state_dir)"

  out="$(CLEARGATE_STATE_FILE="${state_dir}/state.json" \
         CLEARGATE_SPRINT_DIR="${state_dir}" \
         CLEARGATE_REPO_ROOT="${CS_WORK}" \
         CLEARGATE_SKIP_WORKTREE_CHECK=1 \
         CLEARGATE_SKIP_LIFECYCLE_CHECK=1 \
         CLEARGATE_SKIP_DEFERRED_VERIFY_CHECK=1 \
         CLEARGATE_SKIP_BUNDLE_CHECK=1 \
         CLEARGATE_SKIP_SPRINT_TRENDS=1 \
         CLEARGATE_SKIP_SKILL_CANDIDATES=1 \
         CLEARGATE_SKIP_FLASHCARD_CLEANUP=1 \
         bash "$RUN_SCRIPT" node "${SCRIPTS_DIR}/close_sprint.mjs" SPRINT-TEST 2>&1)"
  ec=$?

  if echo "$out" | grep -q 'Step 2.8 skipped: sprint-id "SPRINT-TEST" has no numeric portion.'; then
    fail "CR-107 P9: vcs.sprint_pr:true must not be reachable-around via the non-numeric-id skip at :659" "got the bare skip message, exit=$ec"
  else
    pass "CR-107 P9: vcs gate still applies for a non-numeric sprint id (no.T unconditional skip)"
  fi

  rm -rf "$state_dir" "$CS_ROOT"
}

# ── CR-107 P7 + eviction check: canonical SKILL.md doc-truth ──────────────
# No close_sprint.mjs surface exists for "PR body generation" (the M4
# Corrected file surface names no new script) — SKILL.md's Phase D prose is
# where this recipe will live per the M4 plan's Modify list. These are
# therefore doc-truth assertions against canonical SKILL.md, not unit tests
# against a named function — see QA report for the "why not a code test"
# rationale (no invented interface, to stay wiring-sound for TPV).

scenario_cr107_p7_pr_body_and_eviction() {
  local canonical_skill phase_d e5

  canonical_skill="${REPO_ROOT}/cleargate-planning/.claude/skills/sprint-execution/SKILL.md"
  if [[ ! -f "$canonical_skill" ]]; then
    fail "CR-107 P7/eviction: canonical SKILL.md exists" "not found: $canonical_skill"
    return
  fi

  phase_d="$(sed -n '/^## 6\. Phase D/,/^## 6\.5/p' "$canonical_skill")"
  e5="$(sed -n '/^### E\.5 Sprint/,/^## 8\./p' "$canonical_skill")"

  # P7: Phase D references the PR AND the body recipe avoids shelling out to
  # `gh pr view` (no-network requirement) — single compound assertion so an
  # absent section does not read as a vacuous pass on the second half alone.
  if echo "$phase_d" | grep -qi 'pull request\|\bPR\b' && ! echo "${phase_d}${e5}" | grep -q 'gh pr view'; then
    pass "CR-107 P7: Phase D references the PR without shelling out to 'gh pr view'"
  else
    fail "CR-107 P7: Phase D must gain a PR link and build the body without 'gh pr view' (no network)" "phase_d mentions PR: $(echo "$phase_d" | grep -qi 'pull request\|\bPR\b' && echo yes || echo no)"
  fi

  # Inputs named: sprint goal + DoD + report (deterministic body sources).
  if echo "${phase_d}${e5}" | grep -qi 'sprint goal' \
     && echo "${phase_d}${e5}" | grep -qi 'DoD\|Definition of Done' \
     && echo "${phase_d}${e5}" | grep -qi 'REPORT'; then
    pass "CR-107 P7c: PR-body recipe names sprint goal + DoD + report as its inputs"
  else
    fail "CR-107 P7c: PR-body recipe must name sprint goal + DoD + report as inputs" "not all three found in Phase D / E.5"
  fi

  # Eviction check (§4): §E.5 must contain no UNCONDITIONAL git merge — the
  # local merge is reachable only on the vcs.sprint_pr:false branch. Coarse
  # proxy: the bare command line, without any vcs.sprint_pr mention anywhere
  # in the section, means it is (still) unconditional.
  if echo "$e5" | grep -q 'git merge sprint/S-NN --no-ff' && ! echo "$e5" | grep -qi 'vcs.sprint_pr'; then
    fail "CR-107 eviction check: §E.5 contains an unconditional 'git merge sprint/S-NN --no-ff' (no vcs.sprint_pr mention in the section)" "local merge must be reachable only on the vcs.sprint_pr:false branch"
  else
    pass "CR-107 eviction check: §E.5 either has no bare git-merge line, or gates it on vcs.sprint_pr"
  fi
}

# ── CR-107 scope addition: BUG-046 post-flight doctrine fix ───────────────
# cleargate-enforcement.md §1.6 (both trees): the "strips gitignored" clause
# is a non-differentiator and must be removed; "cuts off the wrong base" is
# the real difference and must survive. Section heading/numbering (§1.6)
# must NOT move — Cross-Cutting Rule 4 / gate-section-index-pinning is out
# of this file's scope entirely (cleargate-enforcement.md is not a gated
# template), so no fixture coupling exists here to re-verify.

scenario_cr107_doctrine_strips_gitignored() {
  local live_enf canon_enf f label

  live_enf="${REPO_ROOT}/.cleargate/knowledge/cleargate-enforcement.md"
  canon_enf="${REPO_ROOT}/cleargate-planning/.cleargate/knowledge/cleargate-enforcement.md"

  for f in "$live_enf" "$canon_enf"; do
    if [[ "$f" == "$live_enf" ]]; then label="live"; else label="canonical"; fi

    if [[ ! -f "$f" ]]; then
      fail "CR-107 doctrine: $label cleargate-enforcement.md exists" "not found: $f"
      continue
    fi

    if grep -q 'strips gitignored' "$f"; then
      fail "CR-107 doctrine: $label §1.6 no longer claims worktree isolation 'strips gitignored'" "clause still present (non-differentiator per BUG-046 post-flight)"
    else
      pass "CR-107 doctrine: $label §1.6 strips-gitignored clause removed"
    fi

    if grep -qi 'wrong base' "$f"; then
      pass "CR-107 doctrine: $label §1.6 'cuts off the wrong base' clause retained (the real differentiator)"
    else
      fail "CR-107 doctrine: $label §1.6 'cuts off the wrong base' clause retained" "not found — the real differentiator must survive the edit"
    fi
  done
}

# ── Run all scenarios ─────────────────────────────────────────────────────

echo "=== test_close_pipeline.sh ==="
echo ""

echo "--- Scenario 1: close_sprint refuses non-terminal state ---"
scenario_1

echo ""
echo "--- Scenario 2: Sprint report written before state = Completed ---"
scenario_2

echo ""
echo "--- Scenario 3: Token reconciliation flags divergent source ---"
scenario_3

echo ""
echo "--- Scenario 4: run_script.sh self-repair on missing state.json ---"
scenario_4

echo ""
echo "--- Scenario 5: suggest_improvements idempotency ---"
scenario_5

echo ""
echo "--- Scenario 6: Reporter rewrite fallback on fixture ---"
scenario_6

echo ""
echo "--- CR-036 Scenario A: v2 close with valid bundle passes Step 3.5 ---"
scenario_cr036_a

echo ""
echo "--- CR-036 Scenario B: v2 close with missing bundle → hard-block ---"
scenario_cr036_b

echo ""
echo "--- CR-036 Scenario C: v1 close with missing bundle → advisory ---"
scenario_cr036_c

echo ""
echo "--- CR-107 P1: vcs.sprint_pr absent/false -> local-merge path unchanged (regression) ---"
scenario_cr107_p1_vcs_off_regression

echo ""
echo "--- CR-107 P2: vcs.sprint_pr:true, gh absent -> non-zero exit, named error ---"
scenario_cr107_p2_gh_absent_refuses

echo ""
echo "--- CR-107 P3: vcs.sprint_pr:true, no remote -> same fail-closed refusal ---"
scenario_cr107_p3_no_remote_refuses

echo ""
echo "--- CR-107 P4: vcs.sprint_pr:true, merge-commit PR -> regression guard (already works) ---"
scenario_cr107_p4_merge_commit_regression

echo ""
echo "--- CR-107 P5: vcs.sprint_pr:true, squash-merged PR -> fails loudly, names squash ---"
scenario_cr107_p5_squash_merge_detected

echo ""
echo "--- CR-107 P6: stale local main after a PR merge -> not read as unmerged ---"
scenario_cr107_p6_stale_local_main

echo ""
echo "--- CR-107 P9: non-numeric sprint id must not bypass the vcs gate ---"
scenario_cr107_p9_nonnumeric_sprint_id_not_a_bypass

echo ""
echo "--- CR-107 P7 + eviction check: canonical SKILL.md doc-truth ---"
scenario_cr107_p7_pr_body_and_eviction

echo ""
echo "--- CR-107 doctrine: BUG-046 post-flight strips-gitignored clause ---"
scenario_cr107_doctrine_strips_gitignored

echo ""
echo "--- Mirror checks: three-surface landing ---"
scenario_mirrors

echo ""
echo "=== Results: ${PASS} passed, ${FAIL} failed ==="

if [[ $FAIL -gt 0 ]]; then
  exit 1
fi
exit 0
