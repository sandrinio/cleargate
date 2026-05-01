#!/usr/bin/env bash
# test_prep_reporter_context.sh
# Tests for prep_reporter_context.mjs — 3 Gherkin scenarios:
#   4. prep happy path (closed sprint with all sections)
#   5. prep missing milestone plans (graceful fallback)
#   6. prep missing token-ledger.jsonl (hard error, exit 1)
#
# All fixtures use mktemp -d. CLEARGATE_SPRINT_DIR + CLEARGATE_PENDING_SYNC_DIR
# env overrides are used for test isolation (see M1 plan: "Env-override conventions").
# macOS bash 3.2 portable: no mapfile/readarray.
# Exit 0 = all pass; exit 1 = one or more failures.
set -uo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
SCRIPTS_DIR="${REPO_ROOT}/.cleargate/scripts"
PREP_SCRIPT="${SCRIPTS_DIR}/prep_reporter_context.mjs"

PASS=0
FAIL=0

pass() {
  echo "PASS: $1"
  PASS=$((PASS + 1))
}

fail() {
  echo "FAIL: $1"
  echo "      detail: $2"
  FAIL=$((FAIL + 1))
}

make_tmpdir() {
  mktemp -d
}

# Write a minimal valid token-ledger.jsonl (3 rows across 3 agents)
write_ledger() {
  local dir="$1"
  cat > "${dir}/token-ledger.jsonl" << 'EOF'
{"ts":"2026-05-01T07:00:00Z","sprint_id":"SPRINT-fixture","story_id":"","work_item_id":"STORY-AAA-01","agent_type":"architect","session_id":"aaa","delta":{"input":100,"output":200,"cache_creation":50,"cache_read":500},"model":"claude-opus-4-7","turns":10}
{"ts":"2026-05-01T08:00:00Z","sprint_id":"SPRINT-fixture","story_id":"","work_item_id":"STORY-BBB-01","agent_type":"developer","session_id":"bbb","delta":{"input":50,"output":100,"cache_creation":25,"cache_read":20},"model":"claude-sonnet-4-6","turns":5}
{"ts":"2026-05-01T09:00:00Z","sprint_id":"SPRINT-fixture","story_id":"","work_item_id":"STORY-CCC-01","agent_type":"qa","session_id":"ccc","delta":{"input":30,"output":60,"cache_creation":15,"cache_read":10},"model":"claude-sonnet-4-6","turns":3}
EOF
}

# Write a minimal valid state.json (schema_version 2 shape)
write_state_json() {
  local dir="$1"
  cat > "${dir}/state.json" << 'EOF'
{
  "schema_version": 2,
  "sprint_id": "SPRINT-fixture",
  "execution_mode": "v2",
  "sprint_status": "Completed",
  "stories": {
    "STORY-AAA-01": {
      "state": "Done",
      "qa_bounces": 0,
      "arch_bounces": 0,
      "lane": "standard",
      "lane_assigned_by": "test",
      "lane_demoted_at": null,
      "lane_demotion_reason": null
    }
  },
  "last_action": "test setup",
  "updated_at": "2026-05-01T00:00:00Z"
}
EOF
}

# Write a minimal milestone plan M1.md
write_milestone_plan() {
  local dir="$1"
  mkdir -p "${dir}/plans"
  cat > "${dir}/plans/M1.md" << 'EOF'
# Milestone M1
## Stories: STORY-AAA-01
## Summary
This is a test milestone plan.
EOF
}

# Write a synthetic sprint plan in the pending-sync dir fixture.
# Must contain sections ## 1., ## 2., ## 5. for the slice extraction.
write_sprint_plan() {
  local pendingsync_dir="$1"
  cat > "${pendingsync_dir}/SPRINT-fixture_test.md" << 'EOF'
---
sprint_id: "SPRINT-fixture"
start_date: "2026-05-01"
end_date: "2026-05-15"
status: "Approved"
---

# SPRINT-fixture: Test Sprint

## 0. Brief

Brief content here.

## 1. Consolidated Deliverables

Deliverables for this sprint.

## 2. Execution Strategy

Execution strategy content here.

## 3. Risks & Dependencies

Risk content here.

## 4. Execution Log

Log content here.

## 5. Metrics & Metadata

Metrics content here.
EOF
}

# ─── Scenario 4: prep happy path ─────────────────────────────────────────────

run_scenario_4() {
  local tmpdir pendingsync_dir bundle_path
  tmpdir="$(make_tmpdir)"
  pendingsync_dir="$(make_tmpdir)"

  write_ledger "${tmpdir}"
  write_state_json "${tmpdir}"
  write_milestone_plan "${tmpdir}"
  write_sprint_plan "${pendingsync_dir}"

  bundle_path="${tmpdir}/.reporter-context.md"

  local stdout_out exit_code
  stdout_out=$(CLEARGATE_SPRINT_DIR="${tmpdir}" CLEARGATE_PENDING_SYNC_DIR="${pendingsync_dir}" \
    node "${PREP_SCRIPT}" SPRINT-fixture 2>/dev/null)
  exit_code=$?

  if [ "${exit_code}" -ne 0 ]; then
    fail "Scenario 4: happy path — expected exit 0, got ${exit_code}" "${stdout_out}"
    rm -rf "${tmpdir}" "${pendingsync_dir}"; return
  fi

  if [ ! -f "${bundle_path}" ]; then
    fail "Scenario 4: happy path — bundle file not written at ${bundle_path}" "file missing"
    rm -rf "${tmpdir}" "${pendingsync_dir}"; return
  fi

  # Check bundle size ≤ 160KB (163840 bytes)
  local bundle_size
  bundle_size=$(wc -c < "${bundle_path}" | tr -d ' ')
  if [ "${bundle_size}" -gt 163840 ]; then
    fail "Scenario 4: happy path — bundle size ${bundle_size} exceeds 160KB" "size: ${bundle_size}"
    rm -rf "${tmpdir}" "${pendingsync_dir}"; return
  fi

  # Check all 6 required section headers are present
  local anchor
  for anchor in "Sprint Plan Slices" "State.json Summary" "Milestone Plans" "Git Log Digest" "Token Ledger Digest" "Flashcard Slice"; do
    if ! grep -qF "${anchor}" "${bundle_path}"; then
      fail "Scenario 4: happy path — missing section '${anchor}' in bundle" "$(head -50 "${bundle_path}")"
      rm -rf "${tmpdir}" "${pendingsync_dir}"; return
    fi
  done

  pass "Scenario 4: prep_reporter_context happy path"
  rm -rf "${tmpdir}" "${pendingsync_dir}"
}

# ─── Scenario 5: prep missing milestone plans ─────────────────────────────────

run_scenario_5() {
  local tmpdir pendingsync_dir bundle_path
  tmpdir="$(make_tmpdir)"
  pendingsync_dir="$(make_tmpdir)"

  write_ledger "${tmpdir}"
  write_state_json "${tmpdir}"
  write_sprint_plan "${pendingsync_dir}"
  # Deliberately NO plans/ subdirectory

  bundle_path="${tmpdir}/.reporter-context.md"

  local exit_code
  CLEARGATE_SPRINT_DIR="${tmpdir}" CLEARGATE_PENDING_SYNC_DIR="${pendingsync_dir}" \
    node "${PREP_SCRIPT}" SPRINT-fixture >/dev/null 2>&1
  exit_code=$?

  if [ "${exit_code}" -ne 0 ]; then
    fail "Scenario 5: missing plans — expected exit 0, got ${exit_code}" "exit code mismatch"
    rm -rf "${tmpdir}" "${pendingsync_dir}"; return
  fi

  if [ ! -f "${bundle_path}" ]; then
    fail "Scenario 5: missing plans — bundle file not written" "file missing"
    rm -rf "${tmpdir}" "${pendingsync_dir}"; return
  fi

  if ! grep -qF "No milestone plans for SPRINT-fixture." "${bundle_path}"; then
    fail "Scenario 5: missing plans — expected one-liner 'No milestone plans for SPRINT-fixture.'" \
      "$(grep -A2 'Milestone Plans' "${bundle_path}" | head -5)"
    rm -rf "${tmpdir}" "${pendingsync_dir}"; return
  fi

  pass "Scenario 5: prep_reporter_context handles missing milestone plans gracefully"
  rm -rf "${tmpdir}" "${pendingsync_dir}"
}

# ─── Scenario 6: prep missing token-ledger.jsonl ─────────────────────────────

run_scenario_6() {
  local tmpdir pendingsync_dir
  tmpdir="$(make_tmpdir)"
  pendingsync_dir="$(make_tmpdir)"

  write_state_json "${tmpdir}"
  write_sprint_plan "${pendingsync_dir}"
  # Deliberately NO token-ledger.jsonl

  local stderr_out exit_code
  stderr_out=$(CLEARGATE_SPRINT_DIR="${tmpdir}" CLEARGATE_PENDING_SYNC_DIR="${pendingsync_dir}" \
    node "${PREP_SCRIPT}" SPRINT-fixture 2>&1 >/dev/null)
  exit_code=$?

  if [ "${exit_code}" -ne 1 ]; then
    fail "Scenario 6: missing ledger — expected exit 1, got ${exit_code}" "exit code mismatch"
    rm -rf "${tmpdir}" "${pendingsync_dir}"; return
  fi

  if ! echo "${stderr_out}" | grep -q "token-ledger.jsonl"; then
    fail "Scenario 6: missing ledger — stderr must contain path to missing file" "${stderr_out}"
    rm -rf "${tmpdir}" "${pendingsync_dir}"; return
  fi

  pass "Scenario 6: prep_reporter_context hard-fails when token-ledger.jsonl is missing"
  rm -rf "${tmpdir}" "${pendingsync_dir}"
}

# ─── Run all scenarios ────────────────────────────────────────────────────────

run_scenario_4
run_scenario_5
run_scenario_6

echo ""
echo "Results: ${PASS} passed, ${FAIL} failed"
[ "${FAIL}" -eq 0 ] && exit 0 || exit 1
