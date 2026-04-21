#!/usr/bin/env bash
# test_flashcard_enforcement.sh — STORY-014-03
# Verifies 4 Gherkin scenarios for the flashcard gate in pending-task-sentinel.sh.
#
# Scenarios:
#   1. v2 Task spawn blocked when unprocessed flagged card exists; stderr names card + touch-command hint.
#   2. v2 Task spawn proceeds after .processed-<hash> marker touched.
#   3. v1 advisory: warning to stderr, exit 0.
#   4. Empty flashcards_flagged: [] is a no-op.
#
# Usage: bash .cleargate/scripts/test/test_flashcard_enforcement.sh
# Expected: all assertions print PASS; script exits 0.

set -u

# REPO_ROOT: resolve from this script's location up 3 dirs (.cleargate/scripts/test -> repo root).
# Works from both main worktree and .worktrees/STORY-NNN-NN (which also have .cleargate/).
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

# Live hook — contains REPO_ROOT hardcoded; patched per test via sed.
LIVE_HOOK="${GIT_ROOT}/.claude/hooks/pending-task-sentinel.sh"

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

mk_sprint() {
  local tmpdir="$1" sprint_id="$2" exec_mode="$3"
  local sprint_dir="${tmpdir}/.cleargate/sprint-runs/${sprint_id}"
  mkdir -p "${sprint_dir}"
  printf '%s' "${sprint_id}" > "${tmpdir}/.cleargate/sprint-runs/.active"
  printf '{"schema_version":1,"sprint_id":"%s","execution_mode":"%s","sprint_status":"Active","stories":{},"last_action":"test","updated_at":"2026-04-22T00:00:00Z"}\n' \
    "${sprint_id}" "${exec_mode}" > "${sprint_dir}/state.json"
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

# Patch REPO_ROOT in the live hook for test isolation.
patch_hook() {
  local tmpdir="$1"
  sed "s|REPO_ROOT=\"/Users/ssuladze/Documents/Dev/ClearGate\"|REPO_ROOT=\"${tmpdir}\"|g" \
    "${LIVE_HOOK}" > "${tmpdir}/hook.sh"
  chmod +x "${tmpdir}/hook.sh"
}

# Invoke hook, capture stderr separately, return exit code via return value.
LAST_STDERR=""
invoke_hook() {
  local hook_sh="$1"
  local input_json='{"tool_name":"Task","tool_input":{"subagent_type":"developer","prompt":"STORY=099-02 test"},"transcript_path":"","session_id":"test","cwd":"/tmp"}'
  local stderr_file
  stderr_file="$(mktemp)"
  printf '%s' "${input_json}" | bash "${hook_sh}" 2>"${stderr_file}"
  local rc=$?
  LAST_STDERR="$(cat "${stderr_file}")"
  rm -f "${stderr_file}"
  return "${rc}"
}

# ================================================================
# Scenario 1: v2 Task spawn blocked when unprocessed flagged card exists
# ================================================================
printf '\n=== Scenario 1: v2 blocked on unprocessed card ===\n'
T1="$(mk_tmpdir)"
SPRINT_DIR1="$(mk_sprint "${T1}" "SPRINT-TEST" "v2")"
mk_dev_report_md "${SPRINT_DIR1}" "099-01"
patch_hook "${T1}"

LAST_STDERR=""
invoke_hook "${T1}/hook.sh"
RC1=$?

assert_eq "S1: exit code is 1 (blocked)" "1" "${RC1}"
assert_contains "S1: stderr names unprocessed card" "${KNOWN_CARD}" "${LAST_STDERR}"
assert_contains "S1: stderr has touch-command hint with hash" ".processed-${KNOWN_HASH}" "${LAST_STDERR}"
assert_contains "S1: stderr says FLASHCARD GATE BLOCKED" "FLASHCARD GATE BLOCKED" "${LAST_STDERR}"

rm -rf "${T1}"

# ================================================================
# Scenario 2: v2 Task spawn proceeds after .processed-<hash> marker touched
# ================================================================
printf '\n=== Scenario 2: v2 proceeds after marker touched ===\n'
T2="$(mk_tmpdir)"
SPRINT_DIR2="$(mk_sprint "${T2}" "SPRINT-TEST" "v2")"
mk_dev_report_md "${SPRINT_DIR2}" "099-01"
touch "${SPRINT_DIR2}/.processed-${KNOWN_HASH}"
patch_hook "${T2}"

LAST_STDERR=""
invoke_hook "${T2}/hook.sh"
RC2=$?

assert_eq "S2: exit code is 0 (allowed)" "0" "${RC2}"
SENTINEL_COUNT="$(ls "${SPRINT_DIR2}"/.pending-task-*.json 2>/dev/null | wc -l | tr -d '[:space:]')"
assert_eq "S2: sentinel file was written" "1" "${SENTINEL_COUNT}"

rm -rf "${T2}"

# ================================================================
# Scenario 3: v1 advisory — warning to stderr, exit 0
# ================================================================
printf '\n=== Scenario 3: v1 advisory (warning, exit 0) ===\n'
T3="$(mk_tmpdir)"
SPRINT_DIR3="$(mk_sprint "${T3}" "SPRINT-TEST" "v1")"
mk_dev_report_md "${SPRINT_DIR3}" "099-01"
patch_hook "${T3}"

LAST_STDERR=""
invoke_hook "${T3}/hook.sh"
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
SPRINT_DIR4="$(mk_sprint "${T4}" "SPRINT-TEST" "v2")"
mk_dev_report_empty "${SPRINT_DIR4}" "099-01"
patch_hook "${T4}"

LAST_STDERR=""
invoke_hook "${T4}/hook.sh"
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
