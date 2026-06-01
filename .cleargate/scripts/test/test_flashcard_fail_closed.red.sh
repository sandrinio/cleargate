#!/usr/bin/env bash
# ============================================================
# test_flashcard_fail_closed.red.sh — QA-RED for STORY-043-01
# ============================================================
# IMMUTABLE (post-correction): This file was authored by the QA-Red agent
# and encodes the acceptance contract for STORY-043-01. It MUST NOT
# be edited by the Developer or any subsequent agent. After this
# correction (sanctioned by the M1 amendment directive, orchestrator
# 2026-06-01), the file is re-sealed. The Developer delivers the
# implementation against which this red test goes green; the
# Developer's own deliverable is the rewrite of the CANONICAL
# test harness (test_flashcard_enforcement.sh), not this file.
#
# AMENDMENT NOTE (2026-06-01, per M1 plan §STORY-043-01
# "Test-target resolution directive", mechanism (a)):
#   This correction re-targets the hook-under-test from the LIVE
#   gitignored .claude/hooks/pending-task-sentinel.sh (reached via
#   the old _find_git_root walk-past-worktree logic) to the in-worktree
#   CANONICAL copy at cleargate-planning/.claude/hooks/pending-task-sentinel.sh.
#   The _find_git_root function and LIVE_HOOK variable are removed.
#   Hook-under-test is resolved SCRIPT-RELATIVE via REPO_ROOT (already
#   SCRIPT_DIR/../../.., stable in both main checkout and worktree).
#   Optional env override: PENDING_TASK_SENTINEL_HOOK (for CI on main
#   checkout where canonical and live may legitimately differ).
#   Immutability resumes after this single sanctioned correction.
#
# Purpose: Encode the 4 Gherkin acceptance scenarios for
# "flashcard sentinel fail-closed" (STORY-043-01, SPRINT-33 M1).
# Drives the in-worktree CANONICAL hook
#   cleargate-planning/.claude/hooks/pending-task-sentinel.sh
# via ORCHESTRATOR_PROJECT_DIR env injection (FLASHCARD #224 pattern:
# prefer env injection over sed-surgery for hook tests).
#
# Scenarios:
#   S1 (block by default): active sprint, state.json with NO
#      execution_mode, one unprocessed flagged card → hook exits 1
#      + prints "FLASHCARD GATE BLOCKED" on stderr naming the card
#      and its .processed-<hash> hint.
#      FAILS against clean baseline: current hook reads .execution_mode,
#      gets v1 default, takes the advisory arm → exit 0.
#
#   S2 (processed marker): the card's .processed-<hash> marker
#      exists → exit 0, sentinel written, no gate diagnostic.
#      Expected to PASS against clean baseline (marker bypasses gate).
#
#   S3 (advisory downgrade): CLEARGATE_ADVISORY=1 + one unprocessed
#      card → exit 0 + "FLASHCARD GATE WARNING" on stderr.
#      Expected to PASS against clean baseline (current v1 arm warns).
#
#   S4 (retired execution_mode ignored): stale state.json with
#      "execution_mode":"v1" + one unprocessed card, no
#      CLEARGATE_ADVISORY → hook still exits 1 (blocked).
#      FAILS against clean baseline: current hook reads "v1" and
#      takes the advisory arm → exit 0.
#
# Usage: bash .cleargate/scripts/test/test_flashcard_fail_closed.red.sh
# Expected at RED baseline: S1 + S4 FAIL; S2 + S3 PASS.
# Expected after implementation: all 4 PASS.

set -u

# ----------------------------------------------------------------
# Resolve paths
# ----------------------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../../.." && pwd)"

# Hook-under-test: in-worktree CANONICAL copy (mechanism (a) per M1 amendment).
# SCRIPT_DIR is .cleargate/scripts/test/ inside the worktree checkout root (REPO_ROOT).
# Walk: SCRIPT_DIR → ../../.. = REPO_ROOT.
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

# ----------------------------------------------------------------
# Counters
# ----------------------------------------------------------------
PASS=0
FAIL=0

# ----------------------------------------------------------------
# Known test card (stable SHA-1 first 12 chars)
# Card: "2026-04-22 · #test · example"
# Hash: 846e4f210032
# ----------------------------------------------------------------
KNOWN_CARD="2026-04-22 · #test · example"
KNOWN_HASH="846e4f210032"

# ----------------------------------------------------------------
# Assertion helpers
# ----------------------------------------------------------------
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

assert_not_contains() {
  local label="$1" needle="$2" haystack="$3"
  if printf '%s' "${haystack}" | grep -qF "${needle}"; then
    printf 'FAIL: %s — unexpected needle found in output\n  needle: %s\n  output: %s\n' \
      "${label}" "${needle}" "${haystack}"
    FAIL=$(( FAIL + 1 ))
  else
    printf 'PASS: %s\n' "${label}"
    PASS=$(( PASS + 1 ))
  fi
}

# ----------------------------------------------------------------
# mk_tmpdir: create an isolated temp directory
# ----------------------------------------------------------------
mk_tmpdir() {
  mktemp -d "/tmp/cg-fc-red.XXXXXX"
}

# ----------------------------------------------------------------
# mk_sprint: create a synthetic sprint fixture.
# Arguments: tmpdir sprint_id [exec_mode]
# If exec_mode is omitted or empty, state.json is written WITHOUT
# an execution_mode field (the post-CR-070 world).
# If exec_mode is provided, it is embedded (stale/legacy state).
# Returns (stdout): the sprint_dir path.
# ----------------------------------------------------------------
mk_sprint() {
  local tmpdir="$1" sprint_id="$2"
  local exec_mode="${3:-}"  # optional; empty = omit from state.json
  local sprint_dir="${tmpdir}/.cleargate/sprint-runs/${sprint_id}"
  mkdir -p "${sprint_dir}"
  printf '%s' "${sprint_id}" > "${tmpdir}/.cleargate/sprint-runs/.active"
  mkdir -p "${tmpdir}/.cleargate/hook-log"

  if [[ -n "${exec_mode}" ]]; then
    # Write stale/legacy state.json WITH execution_mode (S4 scenario).
    printf '{"schema_version":3,"sprint_id":"%s","execution_mode":"%s","sprint_status":"Active","stories":{},"last_action":"test","updated_at":"2026-06-01T00:00:00Z"}\n' \
      "${sprint_id}" "${exec_mode}" > "${sprint_dir}/state.json"
  else
    # Write clean post-CR-070 state.json WITHOUT execution_mode (S1/S2/S3).
    printf '{"schema_version":3,"sprint_id":"%s","sprint_status":"Active","stories":{},"last_action":"test","updated_at":"2026-06-01T00:00:00Z"}\n' \
      "${sprint_id}" > "${sprint_dir}/state.json"
  fi

  printf '%s' "${sprint_dir}"
}

# ----------------------------------------------------------------
# mk_dev_report_md: write a STORY-*-dev.md with one flagged card.
# ----------------------------------------------------------------
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

# ----------------------------------------------------------------
# invoke_hook: drive the CANONICAL hook, capture stderr.
# $1 = tmpdir  →  used as ORCHESTRATOR_PROJECT_DIR.
# Sets global LAST_STDERR and LAST_RC.
# ----------------------------------------------------------------
LAST_STDERR=""
LAST_RC=0

invoke_hook() {
  local tmpdir="$1"
  local input_json
  input_json='{"tool_name":"Task","tool_input":{"subagent_type":"developer","prompt":"STORY=043-01 red-test"},"transcript_path":"","session_id":"qa-red","cwd":"/tmp"}'
  local stderr_file
  stderr_file="$(mktemp)"

  printf '%s' "${input_json}" \
    | ORCHESTRATOR_PROJECT_DIR="${tmpdir}" bash "${CANONICAL_HOOK}" 2>"${stderr_file}"
  LAST_RC=$?
  LAST_STDERR="$(cat "${stderr_file}")"
  rm -f "${stderr_file}"
}

# Like invoke_hook but exports CLEARGATE_ADVISORY=1 (S3).
invoke_hook_advisory() {
  local tmpdir="$1"
  local input_json
  input_json='{"tool_name":"Task","tool_input":{"subagent_type":"developer","prompt":"STORY=043-01 red-advisory"},"transcript_path":"","session_id":"qa-red","cwd":"/tmp"}'
  local stderr_file
  stderr_file="$(mktemp)"

  printf '%s' "${input_json}" \
    | ORCHESTRATOR_PROJECT_DIR="${tmpdir}" CLEARGATE_ADVISORY=1 bash "${CANONICAL_HOOK}" 2>"${stderr_file}"
  LAST_RC=$?
  LAST_STDERR="$(cat "${stderr_file}")"
  rm -f "${stderr_file}"
}

# ================================================================
# S1: Block by default — active sprint, no execution_mode in
#     state.json, one unprocessed flagged card → exit 1 + BLOCKED.
#
# FAILS against clean baseline:
#   Current hook reads .execution_mode, gets the // "v1" default,
#   enters the advisory arm → exits 0 with WARNING instead of
#   BLOCKED + exit 1.
# ================================================================
printf '\n=== S1: block by default (no execution_mode in state.json) ===\n'
T1="$(mk_tmpdir)"
SD1="$(mk_sprint "${T1}" "SPRINT-RED" "")"   # no exec_mode → clean state
mk_dev_report_md "${SD1}" "043-01"

invoke_hook "${T1}"

assert_eq "S1: exit code is 1 (blocked)" "1" "${LAST_RC}"
assert_contains "S1: stderr contains FLASHCARD GATE BLOCKED" "FLASHCARD GATE BLOCKED" "${LAST_STDERR}"
assert_contains "S1: stderr names the flagged card" "${KNOWN_CARD}" "${LAST_STDERR}"
assert_contains "S1: stderr has .processed-<hash> hint" ".processed-${KNOWN_HASH}" "${LAST_STDERR}"
assert_not_contains "S1: stderr must NOT say WARNING (that is the advisory arm)" "FLASHCARD GATE WARNING" "${LAST_STDERR}"

rm -rf "${T1}"

# ================================================================
# S2: Processed marker — .processed-<hash> exists → exit 0,
#     sentinel written, no gate diagnostic.
#
# Expected to PASS against clean baseline (marker already bypasses).
# ================================================================
printf '\n=== S2: processed marker lets Task proceed ===\n'
T2="$(mk_tmpdir)"
SD2="$(mk_sprint "${T2}" "SPRINT-RED" "")"
mk_dev_report_md "${SD2}" "043-01"
touch "${SD2}/.processed-${KNOWN_HASH}"

invoke_hook "${T2}"

assert_eq "S2: exit code is 0 (allowed)" "0" "${LAST_RC}"
assert_not_contains "S2: no gate diagnostic emitted" "FLASHCARD GATE" "${LAST_STDERR}"
SENTINEL_COUNT="$(ls "${SD2}"/.pending-task-*.json 2>/dev/null | wc -l | tr -d '[:space:]')"
assert_eq "S2: sentinel file was written" "1" "${SENTINEL_COUNT}"

rm -rf "${T2}"

# ================================================================
# S3: Advisory downgrade — CLEARGATE_ADVISORY=1 + unprocessed card
#     → exit 0 + FLASHCARD GATE WARNING on stderr.
#
# Expected to PASS against clean baseline (current v1 arm warns).
# The assertion validates the MECHANISM changes (CLEARGATE_ADVISORY,
# not execution_mode) — so even if it passes today via the v1 path,
# the test verifies the right diagnostic string and exit code.
# ================================================================
printf '\n=== S3: CLEARGATE_ADVISORY=1 downgrades block to warning ===\n'
T3="$(mk_tmpdir)"
SD3="$(mk_sprint "${T3}" "SPRINT-RED" "")"
mk_dev_report_md "${SD3}" "043-01"

invoke_hook_advisory "${T3}"

assert_eq "S3: exit code is 0 (advisory, not blocked)" "0" "${LAST_RC}"
assert_contains "S3: stderr contains FLASHCARD GATE WARNING" "FLASHCARD GATE WARNING" "${LAST_STDERR}"
assert_contains "S3: stderr names the flagged card" "${KNOWN_CARD}" "${LAST_STDERR}"
assert_not_contains "S3: stderr must NOT say BLOCKED (that is the default arm)" "FLASHCARD GATE BLOCKED" "${LAST_STDERR}"

rm -rf "${T3}"

# ================================================================
# S4: Retired execution_mode ignored — stale state.json with
#     "execution_mode":"v1" + unprocessed card, no CLEARGATE_ADVISORY
#     → hook exits 1 (blocked). execution_mode is ignored.
#
# FAILS against clean baseline:
#   Current hook reads "v1" from state.json, enters the v1-advisory
#   arm → exits 0 with WARNING. After fix, execution_mode is not
#   read at all; default path blocks.
# ================================================================
printf '\n=== S4: stale execution_mode:v1 in state.json is ignored — still blocked ===\n'
T4="$(mk_tmpdir)"
SD4="$(mk_sprint "${T4}" "SPRINT-RED" "v1")"   # stale: execution_mode present
mk_dev_report_md "${SD4}" "043-01"

# Guard: confirm the stale state.json actually contains execution_mode
# (so this test is meaningful and not vacuously passing).
if ! grep -q '"execution_mode"' "${SD4}/state.json"; then
  printf 'FAIL: S4 setup — state.json missing execution_mode field (test fixture broken)\n'
  FAIL=$(( FAIL + 1 ))
else
  invoke_hook "${T4}"

  assert_eq "S4: exit code is 1 (blocked despite stale execution_mode:v1)" "1" "${LAST_RC}"
  assert_contains "S4: stderr contains FLASHCARD GATE BLOCKED" "FLASHCARD GATE BLOCKED" "${LAST_STDERR}"
  assert_contains "S4: stderr names the flagged card" "${KNOWN_CARD}" "${LAST_STDERR}"
  assert_not_contains "S4: stderr must NOT say WARNING (advisory arm must not fire)" "FLASHCARD GATE WARNING" "${LAST_STDERR}"
fi

rm -rf "${T4}"

# ================================================================
# Hash stability guard
# ================================================================
printf '\n=== Hash stability ===\n'
COMPUTED_HASH="$(printf '%s' "${KNOWN_CARD}" | shasum -a 1 | cut -c1-12)"
assert_eq "Hash: known card produces expected hash" "${KNOWN_HASH}" "${COMPUTED_HASH}"

# ================================================================
# Summary
# ================================================================
printf '\nResults: %d passed, %d failed\n' "${PASS}" "${FAIL}"
printf 'NOTE (red-phase): S1 + S4 are expected to FAIL against the unmodified hook.\n'
printf '       S2 + S3 may already pass. After implementation all 4 must pass.\n'

if [[ "${FAIL}" -gt 0 ]]; then
  exit 1
fi
exit 0
