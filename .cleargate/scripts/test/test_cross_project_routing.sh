#!/usr/bin/env bash
# test_cross_project_routing.sh — STORY-014-05
# Verifies 4 Gherkin scenarios for cross-project ledger routing via ORCHESTRATOR_PROJECT_DIR.
#
# Scenarios:
#   1. ORCHESTRATOR_PROJECT_DIR set + .active in target → sentinel writes to target tree.
#   2. ORCHESTRATOR_PROJECT_DIR set + SubagentStop → ledger row writes to target tree.
#   3. Unset ORCHESTRATOR_PROJECT_DIR → behavior unchanged (writes to hook-repo's own tree).
#   4. ORCHESTRATOR_PROJECT_DIR set but target has no .active → off-sprint bucket in TARGET.
#
# Usage: bash .cleargate/scripts/test/test_cross_project_routing.sh
# Expected: all assertions print PASS; script exits 0.

set -u

# REPO_ROOT: resolve from this script's location up 3 dirs (.cleargate/scripts/test -> repo root).
# Works from both main worktree and .worktrees/STORY-NNN-NN.
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../../.." && pwd)"

# GIT_ROOT: the real repo root where .git/ is a directory (not a .git file as in worktrees).
# .claude/ is gitignored and lives only at GIT_ROOT.
_find_git_root() {
  local dir="$1"
  while [[ "${dir}" != "/" ]]; do
    if [[ -d "${dir}/.git" ]]; then
      printf '%s' "${dir}"
      return
    fi
    dir="$(dirname "${dir}")"
  done
  printf '%s' "${REPO_ROOT}"
}
GIT_ROOT="$(_find_git_root "${REPO_ROOT}")"

LIVE_SENTINEL_HOOK="${GIT_ROOT}/.claude/hooks/pending-task-sentinel.sh"
LIVE_LEDGER_HOOK="${GIT_ROOT}/.claude/hooks/token-ledger.sh"

PASS=0
FAIL=0

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

assert_file_exists() {
  local label="$1" path="$2"
  if [[ -e "${path}" ]]; then
    printf 'PASS: %s\n' "${label}"
    PASS=$(( PASS + 1 ))
  else
    printf 'FAIL: %s — file not found: %s\n' "${label}" "${path}"
    FAIL=$(( FAIL + 1 ))
  fi
}

assert_file_absent() {
  local label="$1" path_glob="$2"
  # Use ls to check glob — if no files match, ls exits non-zero
  if ls ${path_glob} 2>/dev/null | grep -q .; then
    printf 'FAIL: %s — unexpected file(s) found: %s\n' "${label}" "${path_glob}"
    FAIL=$(( FAIL + 1 ))
  else
    printf 'PASS: %s\n' "${label}"
    PASS=$(( PASS + 1 ))
  fi
}

mk_tmpdir() {
  mktemp -d "/tmp/cg-xpr-test.XXXXXX"
}

# Set up a minimal target project tree with an active sprint.
mk_target_with_sprint() {
  local target="$1" sprint_id="$2"
  local sprint_dir="${target}/.cleargate/sprint-runs/${sprint_id}"
  mkdir -p "${sprint_dir}"
  printf '%s' "${sprint_id}" > "${target}/.cleargate/sprint-runs/.active"
  printf '{"schema_version":1,"sprint_id":"%s","execution_mode":"v2","sprint_status":"Active","stories":{},"last_action":"test","updated_at":"2026-04-21T00:00:00Z"}\n' \
    "${sprint_id}" > "${sprint_dir}/state.json"
  mkdir -p "${target}/.cleargate/hook-log"
  printf '%s' "${sprint_dir}"
}

# Set up a target project tree WITHOUT an active sprint.
mk_target_no_sprint() {
  local target="$1"
  mkdir -p "${target}/.cleargate/sprint-runs"
  mkdir -p "${target}/.cleargate/hook-log"
}

# Create a fake transcript file for the ledger hook.
mk_fake_transcript() {
  local path="$1"
  # Minimal JSONL transcript with one assistant turn carrying usage
  cat > "${path}" << 'EOF'
{"type":"user","message":{"content":"STORY=014-05 test dispatch"}}
{"type":"assistant","message":{"usage":{"input_tokens":100,"output_tokens":50,"cache_creation_input_tokens":0,"cache_read_input_tokens":0},"model":"claude-sonnet-4-6"}}
EOF
}

# Invoke the sentinel hook with ORCHESTRATOR_PROJECT_DIR set to a target.
# The hook uses ${ORCHESTRATOR_PROJECT_DIR:-hardcoded-path}, so setting the env var
# routes all writes to the target.
invoke_sentinel_hook() {
  local target_dir="$1"
  local input_json
  input_json='{"tool_name":"Task","tool_input":{"subagent_type":"developer","prompt":"STORY=014-05 cross-project test"},"transcript_path":"","session_id":"test-session","cwd":"/tmp"}'
  local stderr_file
  stderr_file="$(mktemp)"
  # Export env vars so they propagate through the pipe into bash's environment.
  export ORCHESTRATOR_PROJECT_DIR="${target_dir}"
  export SKIP_FLASHCARD_GATE=1
  printf '%s' "${input_json}" | bash "${LIVE_SENTINEL_HOOK}" 2>"${stderr_file}"
  local rc=$?
  unset ORCHESTRATOR_PROJECT_DIR SKIP_FLASHCARD_GATE
  rm -f "${stderr_file}"
  return "${rc}"
}

# Invoke the ledger hook with ORCHESTRATOR_PROJECT_DIR set to a target.
invoke_ledger_hook() {
  local target_dir="$1" transcript_path="$2"
  local input_json
  input_json="{\"tool_name\":\"SubagentStop\",\"transcript_path\":\"${transcript_path}\",\"session_id\":\"test-session\",\"cwd\":\"/tmp\",\"hook_event_name\":\"SubagentStop\"}"
  local stderr_file
  stderr_file="$(mktemp)"
  # Export env var so it propagates through the pipe into bash's environment.
  export ORCHESTRATOR_PROJECT_DIR="${target_dir}"
  printf '%s' "${input_json}" | bash "${LIVE_LEDGER_HOOK}" 2>"${stderr_file}"
  local rc=$?
  unset ORCHESTRATOR_PROJECT_DIR
  rm -f "${stderr_file}"
  return "${rc}"
}

# ================================================================
# Scenario 1: ORCHESTRATOR_PROJECT_DIR set + .active → sentinel writes to target
# ================================================================
printf '\n=== Scenario 1: sentinel writes to target tree ===\n'
T1="$(mk_tmpdir)"
TARGET1="$(mk_tmpdir)"
SPRINT_DIR1="$(mk_target_with_sprint "${TARGET1}" "SPRINT-01")"

invoke_sentinel_hook "${TARGET1}"
RC1=$?

assert_eq "S1: hook exit 0" "0" "${RC1}"
# Check that .pending-task-*.json was written in the TARGET's sprint dir
SENTINEL_COUNT1="$(ls "${SPRINT_DIR1}"/.pending-task-*.json 2>/dev/null | wc -l | tr -d '[:space:]')"
assert_eq "S1: sentinel written to target sprint dir" "1" "${SENTINEL_COUNT1}"
# Verify nothing was written in the local REPO_ROOT tree (except its own hook-log)
assert_file_absent "S1: no sentinel in local REPO_ROOT sprint tree" \
  "${REPO_ROOT}/.cleargate/sprint-runs/SPRINT-01/.pending-task-*.json"

rm -rf "${T1}" "${TARGET1}"

# ================================================================
# Scenario 2: ORCHESTRATOR_PROJECT_DIR set + SubagentStop → ledger row writes to target
# ================================================================
printf '\n=== Scenario 2: ledger row writes to target tree ===\n'
T2="$(mk_tmpdir)"
TARGET2="$(mk_tmpdir)"
SPRINT_DIR2="$(mk_target_with_sprint "${TARGET2}" "SPRINT-02")"
TRANSCRIPT2="${T2}/transcript.jsonl"
mk_fake_transcript "${TRANSCRIPT2}"

invoke_ledger_hook "${TARGET2}" "${TRANSCRIPT2}"
RC2=$?

assert_eq "S2: hook exit 0" "0" "${RC2}"
LEDGER2="${SPRINT_DIR2}/token-ledger.jsonl"
assert_file_exists "S2: ledger file created in target sprint dir" "${LEDGER2}"
# Verify the ledger row has the correct sprint_id
if [[ -f "${LEDGER2}" ]]; then
  SPRINT_IN_LEDGER2="$(jq -r '.sprint_id' "${LEDGER2}" 2>/dev/null)"
  assert_eq "S2: ledger row sprint_id is SPRINT-02" "SPRINT-02" "${SPRINT_IN_LEDGER2}"
fi

rm -rf "${T2}" "${TARGET2}"

# ================================================================
# Scenario 3: Unset ORCHESTRATOR_PROJECT_DIR → writes to hook-repo's tree
# ================================================================
printf '\n=== Scenario 3: unset env → writes to hook-repo (fallback) ===\n'
# When ORCHESTRATOR_PROJECT_DIR is unset, the live hook falls back to its hardcoded path:
# /Users/ssuladze/Documents/Dev/ClearGate (the GIT_ROOT).
# We set up a test sprint dir in GIT_ROOT, invoke the hook without the env var,
# and verify the sentinel lands in GIT_ROOT (not a target dir).
LOCAL_TEST_SPRINT="${GIT_ROOT}/.cleargate/sprint-runs/SPRINT-XPRTEST"
LOCAL_ACTIVE="${GIT_ROOT}/.cleargate/sprint-runs/.active"
ORIG_ACTIVE=""
if [[ -f "${LOCAL_ACTIVE}" ]]; then
  ORIG_ACTIVE="$(cat "${LOCAL_ACTIVE}")"
fi

mkdir -p "${LOCAL_TEST_SPRINT}"
mkdir -p "${GIT_ROOT}/.cleargate/hook-log"
printf 'SPRINT-XPRTEST' > "${LOCAL_ACTIVE}"
printf '{"schema_version":1,"sprint_id":"SPRINT-XPRTEST","execution_mode":"v1","sprint_status":"Active","stories":{},"last_action":"test","updated_at":"2026-04-21T00:00:00Z"}\n' \
  > "${LOCAL_TEST_SPRINT}/state.json"

# Invoke sentinel hook with ORCHESTRATOR_PROJECT_DIR explicitly removed from env.
INPUT3='{"tool_name":"Task","tool_input":{"subagent_type":"developer","prompt":"STORY=014-05 fallback test"},"transcript_path":"","session_id":"test-session","cwd":"/tmp"}'
STDERR3_FILE="$(mktemp)"
export SKIP_FLASHCARD_GATE=1
printf '%s' "${INPUT3}" | env -u ORCHESTRATOR_PROJECT_DIR bash "${LIVE_SENTINEL_HOOK}" 2>"${STDERR3_FILE}"
RC3=$?
unset SKIP_FLASHCARD_GATE
rm -f "${STDERR3_FILE}"

SENTINEL_COUNT3="$(ls "${LOCAL_TEST_SPRINT}"/.pending-task-*.json 2>/dev/null | wc -l | tr -d '[:space:]')"
assert_eq "S3: hook exit 0 (fallback)" "0" "${RC3}"
assert_eq "S3: sentinel written to GIT_ROOT sprint dir (fallback)" "1" "${SENTINEL_COUNT3}"

# Restore original .active state and clean up test sprint dir.
rm -f "${LOCAL_TEST_SPRINT}"/.pending-task-*.json
rm -rf "${LOCAL_TEST_SPRINT}"
if [[ -n "${ORIG_ACTIVE}" ]]; then
  printf '%s' "${ORIG_ACTIVE}" > "${LOCAL_ACTIVE}"
else
  rm -f "${LOCAL_ACTIVE}"
fi

# ================================================================
# Scenario 4: ORCHESTRATOR_PROJECT_DIR set + no .active in target → off-sprint in TARGET
# ================================================================
printf '\n=== Scenario 4: no .active in target → off-sprint bucket in TARGET ===\n'
T4="$(mk_tmpdir)"
TARGET4="$(mk_tmpdir)"
mk_target_no_sprint "${TARGET4}"  # No .active file

invoke_sentinel_hook "${TARGET4}"
RC4=$?

assert_eq "S4: hook exit 0 (off-sprint)" "0" "${RC4}"
# Sentinel should go to _off-sprint in TARGET
OFFSPRINT_DIR4="${TARGET4}/.cleargate/sprint-runs/_off-sprint"
SENTINEL_COUNT4="$(ls "${OFFSPRINT_DIR4}"/.pending-task-*.json 2>/dev/null | wc -l | tr -d '[:space:]')"
assert_eq "S4: sentinel written to TARGET _off-sprint dir" "1" "${SENTINEL_COUNT4}"
# Verify it did NOT go to local REPO_ROOT's _off-sprint
# (Use file test on local off-sprint — check no new pending-task files since test start)
# Note: this check is best-effort since we can't easily isolate time; we verify the target got it.
assert_file_exists "S4: TARGET _off-sprint dir was created" "${OFFSPRINT_DIR4}"

rm -rf "${T4}" "${TARGET4}"

# ================================================================
# Summary
# ================================================================
printf '\n=== Results: %d passed, %d failed ===\n' "${PASS}" "${FAIL}"
if [[ "${FAIL}" -gt 0 ]]; then
  exit 1
fi
exit 0
