#!/usr/bin/env bash
# test_count_tokens.sh
# Tests for count_tokens.mjs — 3 Gherkin scenarios:
#   1. count_tokens populated ledger
#   2. count_tokens --json emits machine-readable digest
#   3. count_tokens handles empty ledger
#
# All fixtures use mktemp -d (CLEARGATE_SPRINT_DIR env override for test isolation).
# macOS bash 3.2 portable: no mapfile/readarray.
# Exit 0 = all pass; exit 1 = one or more failures.
set -uo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
SCRIPTS_DIR="${REPO_ROOT}/.cleargate/scripts"
COUNT_TOKENS="${SCRIPTS_DIR}/count_tokens.mjs"

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

# Write a populated token-ledger.jsonl with rows for all 4 agent types
# and 3 distinct work_item_ids, so anomaly detection can trigger.
write_populated_ledger() {
  local dir="$1"
  # 4 rows: architect, developer, qa, reporter across 3 work_item_ids
  # Make STORY-AAA-01 have very high tokens to trigger anomaly detection (>4× median)
  cat > "${dir}/token-ledger.jsonl" << 'EOF'
{"ts":"2026-05-01T07:00:00Z","sprint_id":"SPRINT-fixture","story_id":"","work_item_id":"STORY-AAA-01","agent_type":"architect","session_id":"aaa","delta":{"input":100,"output":200,"cache_creation":50,"cache_read":5000},"model":"claude-opus-4-7","turns":10}
{"ts":"2026-05-01T08:00:00Z","sprint_id":"SPRINT-fixture","story_id":"","work_item_id":"STORY-BBB-01","agent_type":"developer","session_id":"bbb","delta":{"input":50,"output":100,"cache_creation":25,"cache_read":20},"model":"claude-sonnet-4-6","turns":5}
{"ts":"2026-05-01T09:00:00Z","sprint_id":"SPRINT-fixture","story_id":"","work_item_id":"STORY-BBB-01","agent_type":"qa","session_id":"ccc","delta":{"input":30,"output":60,"cache_creation":15,"cache_read":10},"model":"claude-sonnet-4-6","turns":3}
{"ts":"2026-05-01T10:00:00Z","sprint_id":"SPRINT-fixture","story_id":"","work_item_id":"STORY-CCC-01","agent_type":"reporter","session_id":"ddd","delta":{"input":20,"output":40,"cache_creation":10,"cache_read":5},"model":"claude-opus-4-7","turns":2}
EOF
}

# ─── Scenario 1: count_tokens populated ledger ───────────────────────────────

run_scenario_1() {
  local tmpdir
  tmpdir="$(make_tmpdir)"
  write_populated_ledger "${tmpdir}"

  local output exit_code
  output=$(CLEARGATE_SPRINT_DIR="${tmpdir}" node "${COUNT_TOKENS}" SPRINT-fixture 2>/dev/null)
  exit_code=$?

  if [ "${exit_code}" -ne 0 ]; then
    fail "Scenario 1: populated ledger — expected exit 0, got ${exit_code}" "exit code mismatch"
    rm -rf "${tmpdir}"; return
  fi

  if ! echo "${output}" | grep -q "Total tokens this sprint:"; then
    fail "Scenario 1: populated ledger — missing 'Total tokens this sprint:'" "${output}"
    rm -rf "${tmpdir}"; return
  fi

  # Verify the total is non-zero (sum all deltas: (100+200+50+5000)+(50+100+25+20)+(30+60+15+10)+(20+40+10+5) = 5350+195+115+75 = 5735)
  if echo "${output}" | grep -q "Total tokens this sprint: 0 "; then
    fail "Scenario 1: populated ledger — total is zero, expected non-zero" "${output}"
    rm -rf "${tmpdir}"; return
  fi

  # Check per-agent breakdown for all 4 canonical agent types
  local agent
  for agent in architect developer qa reporter; do
    if ! echo "${output}" | grep -q "  ${agent}:"; then
      fail "Scenario 1: populated ledger — missing per-agent line for '${agent}'" "${output}"
      rm -rf "${tmpdir}"; return
    fi
  done

  if ! echo "${output}" | grep -q "Anomalies:"; then
    fail "Scenario 1: populated ledger — missing 'Anomalies:' section header" "${output}"
    rm -rf "${tmpdir}"; return
  fi

  pass "Scenario 1: count_tokens populated ledger"
  rm -rf "${tmpdir}"
}

# ─── Scenario 2: count_tokens --json emits machine-readable digest ────────────

run_scenario_2() {
  local tmpdir
  tmpdir="$(make_tmpdir)"
  write_populated_ledger "${tmpdir}"

  local output exit_code
  output=$(CLEARGATE_SPRINT_DIR="${tmpdir}" node "${COUNT_TOKENS}" SPRINT-fixture --json 2>/dev/null)
  exit_code=$?

  if [ "${exit_code}" -ne 0 ]; then
    fail "Scenario 2: --json — expected exit 0, got ${exit_code}" "exit code mismatch"
    rm -rf "${tmpdir}"; return
  fi

  # Validate JSON using node (avoids jq dependency)
  local validation
  validation=$(echo "${output}" | node -e '
    let data = "";
    process.stdin.on("data", d => data += d);
    process.stdin.on("end", () => {
      try {
        const obj = JSON.parse(data);
        const missing = ["total","by_agent","by_work_item","anomalies"].filter(k => !(k in obj));
        if (missing.length > 0) {
          process.stderr.write("Missing keys: " + missing.join(", ") + "\n");
          process.exit(1);
        }
        process.stdout.write("ok\n");
        process.exit(0);
      } catch(e) {
        process.stderr.write("Invalid JSON: " + e.message + "\n");
        process.exit(1);
      }
    });
  ' 2>&1)
  local val_exit=$?

  if [ "${val_exit}" -ne 0 ]; then
    fail "Scenario 2: --json — JSON validation failed" "${validation}"
    rm -rf "${tmpdir}"; return
  fi

  pass "Scenario 2: count_tokens --json emits machine-readable digest"
  rm -rf "${tmpdir}"
}

# ─── Scenario 3: count_tokens handles empty ledger ───────────────────────────

run_scenario_3() {
  local tmpdir
  tmpdir="$(make_tmpdir)"
  # Empty ledger (zero rows — just touch)
  touch "${tmpdir}/token-ledger.jsonl"

  local output exit_code
  output=$(CLEARGATE_SPRINT_DIR="${tmpdir}" node "${COUNT_TOKENS}" SPRINT-fixture 2>/dev/null)
  exit_code=$?

  if [ "${exit_code}" -ne 0 ]; then
    fail "Scenario 3: empty ledger — expected exit 0, got ${exit_code}" "exit code mismatch"
    rm -rf "${tmpdir}"; return
  fi

  if ! echo "${output}" | grep -q "Ledger empty for SPRINT-fixture (0 rows)."; then
    fail "Scenario 3: empty ledger — missing expected note in stdout" "${output}"
    rm -rf "${tmpdir}"; return
  fi

  pass "Scenario 3: count_tokens handles empty ledger"
  rm -rf "${tmpdir}"
}

# ─── Run all scenarios ────────────────────────────────────────────────────────

run_scenario_1
run_scenario_2
run_scenario_3

echo ""
echo "Results: ${PASS} passed, ${FAIL} failed"
[ "${FAIL}" -eq 0 ] && exit 0 || exit 1
