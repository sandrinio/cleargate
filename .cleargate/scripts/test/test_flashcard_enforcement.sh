#!/usr/bin/env bash
# test_flashcard_enforcement.sh — STORY-014-03 (reworked STORY-043-01)
# Verifies 4 Gherkin scenarios for the flashcard gate in pending-task-sentinel.sh.
#
# Scenarios (fail-closed semantics after STORY-043-01):
#   1. Block by default: unprocessed flagged card + no CLEARGATE_ADVISORY → exit 1 + BLOCKED.
#   2. Processed marker: .processed-<hash> present → exit 0, sentinel written.
#   3. Advisory: CLEARGATE_ADVISORY=1 + unprocessed card → exit 0 + WARNING.
#   4. Empty flashcards_flagged: [] is a no-op.
#
# Usage: bash .cleargate/scripts/test/test_flashcard_enforcement.sh
# Expected: all assertions print PASS; script exits 0.

set -u

# REPO_ROOT: resolve from this script's location up 3 dirs (.cleargate/scripts/test -> repo root).
# Works from both main worktree and .worktrees/STORY-NNN-NN (which also have .cleargate/).
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../../.." && pwd)"

# Hook-under-test: in-worktree CANONICAL copy (mechanism (a) per M1 §STORY-043-01).
# SCRIPT_DIR is .cleargate/scripts/test/ inside the checkout root (REPO_ROOT).
# Target: cleargate-planning/.claude/hooks/pending-task-sentinel.sh within that checkout.
# NOT .claude/hooks/... (that is the LIVE gitignored hook, out of bounds mid-sprint).
# Optional env override for CI on main checkout: PENDING_TASK_SENTINEL_HOOK.
if [[ -n "${PENDING_TASK_SENTINEL_HOOK:-}" ]]; then
  CANONICAL_HOOK="${PENDING_TASK_SENTINEL_HOOK}"
else
  CANONICAL_HOOK="${REPO_ROOT}/cleargate-planning/.claude/hooks/pending-task-sentinel.sh"
fi

if [[ ! -f "${CANONICAL_HOOK}" ]]; then
  printf 'ERROR: canonical hook not found at %s\n' "${CANONICAL_HOOK}" >&2
  exit 2
fi

PASS=0
FAIL=0

# Known hash for the test card (proved stable — sha1 first 12 chars).
# Card: "2026-04-22 · #test · example"
# Hash: 846e4f210032
KNOWN_CARD="2026-04-22 · #test · example"
KNOWN_HASH="846e4f210032"

assert_eq() {
  local label="$1" expected="$2" actual="$3"
  if [[ "${expected}" == "${actual}" ]]; then
    printf 'PASS: %s\n' "${label}"
    PASS=$(( PASS + 1 ))
  else
    printf 'FAIL: %s — expected=%q actual=%q\n' "${label}" "${expected}" "${actual}"
    FAIL=$(( FAIL + 1 ))
  fi
}

assert_contains() {
  local label="$1" needle="$2" haystack="$3"
  if printf '%s' "${haystack}" | grep -qF "${needle}"; then
    printf 'PASS: %s\n' "${label}"
    PASS=$(( PASS + 1 ))
  else
    printf 'FAIL: %s — needle not found in output\n  needle: %s\n  output: %s\n' \
      "${label}" "${needle}" "${haystack}"
    FAIL=$(( FAIL + 1 ))
  fi
}

mk_tmpdir() {
  mktemp -d "/tmp/cg-fc-test.XXXXXX"
}

# mk_sprint: create a synthetic sprint fixture WITHOUT execution_mode (post-CR-070 world).
# Arguments: tmpdir sprint_id
# Returns (stdout): the sprint_dir path.
mk_sprint() {
  local tmpdir="$1" sprint_id="$2"
  local sprint_dir="${tmpdir}/.cleargate/sprint-runs/${sprint_id}"
  mkdir -p "${sprint_dir}"
  printf '%s' "${sprint_id}" > "${tmpdir}/.cleargate/sprint-runs/.active"
  # Write clean post-CR-070 state.json WITHOUT execution_mode field.
  printf '{"schema_version":3,"sprint_id":"%s","sprint_status":"Active","stories":{},"last_action":"test","updated_at":"2026-06-01T00:00:00Z"}\n' \
    "${sprint_id}" > "${sprint_dir}/state.json"
  mkdir -p "${tmpdir}/.cleargate/hook-log"
  printf '%s' "${sprint_dir}"
}

# Creates a dev report with markdown ## flashcards_flagged section (standard format).
mk_dev_report_md() {
  local sprint_dir="$1" story_id="$2"
  local report="${sprint_dir}/STORY-${story_id}-dev.md"
  cat > "${report}" << EOF
# Dev Report STORY-${story_id}

## flashcards_flagged

- "${KNOWN_CARD}"

## notes

done
EOF
}

# Creates a dev report with inline empty flashcards_flagged: [].
mk_dev_report_empty() {
  local sprint_dir="$1" story_id="$2"
  local report="${sprint_dir}/STORY-${story_id}-dev.md"
  cat > "${report}" << 'EOF'
---
story_id: STORY-099-01
status: done
flashcards_flagged: []
---
# Dev Report
EOF
}

# Invoke hook, capture stderr separately, return exit code via return value.
# $1 = tmpdir (used as ORCHESTRATOR_PROJECT_DIR so the hook reads from it)
LAST_STDERR=""
invoke_hook() {
  local tmpdir="$1"
  local input_json='{"tool_name":"Task","tool_input":{"subagent_type":"developer","prompt":"STORY=099-02 test"},"transcript_path":"","session_id":"test","cwd":"/tmp"}'
  local stderr_file
  stderr_file="$(mktemp)"
  printf '%s' "${input_json}" | ORCHESTRATOR_PROJECT_DIR="${tmpdir}" bash "${CANONICAL_HOOK}" 2>"${stderr_file}"
  local rc=$?
  LAST_STDERR="$(cat "${stderr_file}")"
  rm -f "${stderr_file}"
  return "${rc}"
}

# Like invoke_hook but exports CLEARGATE_ADVISORY=1 (Scenario 3).
invoke_hook_advisory() {
  local tmpdir="$1"
  local input_json='{"tool_name":"Task","tool_input":{"subagent_type":"developer","prompt":"STORY=099-02 test"},"transcript_path":"","session_id":"test","cwd":"/tmp"}'
  local stderr_file
  stderr_file="$(mktemp)"
  printf '%s' "${input_json}" | ORCHESTRATOR_PROJECT_DIR="${tmpdir}" CLEARGATE_ADVISORY=1 bash "${CANONICAL_HOOK}" 2>"${stderr_file}"
  local rc=$?
  LAST_STDERR="$(cat "${stderr_file}")"
  rm -f "${stderr_file}"
  return "${rc}"
}

# ================================================================
# Scenario 1: Block by default — unprocessed flagged card, no CLEARGATE_ADVISORY → exit 1
# ================================================================
printf '\n=== Scenario 1: block by default (no execution_mode, no advisory) ===\n'
T1="$(mk_tmpdir)"
SPRINT_DIR1="$(mk_sprint "${T1}" "SPRINT-TEST")"
mk_dev_report_md "${SPRINT_DIR1}" "099-01"

LAST_STDERR=""
invoke_hook "${T1}"
RC1=$?

assert_eq "S1: exit code is 1 (blocked)" "1" "${RC1}"
assert_contains "S1: stderr names unprocessed card" "${KNOWN_CARD}" "${LAST_STDERR}"
assert_contains "S1: stderr has touch-command hint with hash" ".processed-${KNOWN_HASH}" "${LAST_STDERR}"
assert_contains "S1: stderr says FLASHCARD GATE BLOCKED" "FLASHCARD GATE BLOCKED" "${LAST_STDERR}"

rm -rf "${T1}"

# ================================================================
# Scenario 2: Processed marker — .processed-<hash> present → exit 0 + sentinel written
# ================================================================
printf '\n=== Scenario 2: processed marker lets Task proceed ===\n'
T2="$(mk_tmpdir)"
SPRINT_DIR2="$(mk_sprint "${T2}" "SPRINT-TEST")"
mk_dev_report_md "${SPRINT_DIR2}" "099-01"
touch "${SPRINT_DIR2}/.processed-${KNOWN_HASH}"

LAST_STDERR=""
invoke_hook "${T2}"
RC2=$?

assert_eq "S2: exit code is 0 (allowed)" "0" "${RC2}"
SENTINEL_COUNT="$(ls "${SPRINT_DIR2}"/.pending-task-*.json 2>/dev/null | wc -l | tr -d '[:space:]')"
assert_eq "S2: sentinel file was written" "1" "${SENTINEL_COUNT}"

rm -rf "${T2}"

# ================================================================
# Scenario 3: Advisory — CLEARGATE_ADVISORY=1 + unprocessed card → exit 0 + WARNING
# ================================================================
printf '\n=== Scenario 3: CLEARGATE_ADVISORY=1 downgrades block to warning ===\n'
T3="$(mk_tmpdir)"
SPRINT_DIR3="$(mk_sprint "${T3}" "SPRINT-TEST")"
mk_dev_report_md "${SPRINT_DIR3}" "099-01"

LAST_STDERR=""
invoke_hook_advisory "${T3}"
RC3=$?

assert_eq "S3: exit code is 0 (advisory, not blocked)" "0" "${RC3}"
assert_contains "S3: stderr has WARNING (not BLOCKED)" "FLASHCARD GATE WARNING" "${LAST_STDERR}"
assert_contains "S3: stderr names the card" "${KNOWN_CARD}" "${LAST_STDERR}"

rm -rf "${T3}"

# ================================================================
# Scenario 4: Empty flashcards_flagged: [] is a no-op
# ================================================================
printf '\n=== Scenario 4: empty flashcards_flagged is no-op ===\n'
T4="$(mk_tmpdir)"
SPRINT_DIR4="$(mk_sprint "${T4}" "SPRINT-TEST")"
mk_dev_report_empty "${SPRINT_DIR4}" "099-01"

LAST_STDERR=""
invoke_hook "${T4}"
RC4=$?

assert_eq "S4: exit code is 0 (empty list, no-op)" "0" "${RC4}"
if printf '%s' "${LAST_STDERR}" | grep -qE "(BLOCKED|WARNING)"; then
  printf 'FAIL: S4: unexpected gate output in stderr: %s\n' "${LAST_STDERR}"
  FAIL=$(( FAIL + 1 ))
else
  printf 'PASS: S4: no gate output (correct no-op)\n'
  PASS=$(( PASS + 1 ))
fi

rm -rf "${T4}"

# ================================================================
# Hash stability check (proves DoD requirement: same card -> same hash)
# ================================================================
printf '\n=== Hash stability ===\n'
COMPUTED_HASH="$(printf '%s' "${KNOWN_CARD}" | shasum -a 1 | cut -c1-12)"
assert_eq "Hash: known card produces known hash" "${KNOWN_HASH}" "${COMPUTED_HASH}"

# ================================================================
# Summary
# ================================================================
printf '\n=== Results: %d passed, %d failed ===\n' "${PASS}" "${FAIL}"
if [[ "${FAIL}" -gt 0 ]]; then
  exit 1
fi
exit 0
