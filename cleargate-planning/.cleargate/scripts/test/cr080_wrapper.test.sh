#!/usr/bin/env bash
# cr080_wrapper.test.sh — CR-080 verification harness.
#
# Verifies F5 (pre_gate_runner.sh realpath-at-entry) and F8 (run_script.sh
# env pass-through) are correctly implemented.
#
# Assertions:
#   F5-1: Relative worktree path — report written to correct location, no ENOENT.
#   F5-2: Absolute worktree path — identical report location, no path doubling.
#   F8-3: CLEARGATE_STATE_FILE exported before wrapper — reaches the child process.
#   F8-4 (optional allowlist): RUN_SCRIPT_ENV_ALLOWLIST=FOO prevents non-listed
#         var from being actively required (documents opt-in behavior).
#
# Exit 0 = PASS (all assertions pass); exit 1 = one or more FAIL.
#
# Self-cleaning: trap EXIT removes the stub worktree and any tmp files.
# Mirrors the cr077/cr079 harness shape.
# macOS bash 3.2 portable.
# FLASHCARD #test-harness #bash 2026-06-03: use grep -q not grep -c || echo.
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../../.." && pwd)"

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

# ── Constants ────────────────────────────────────────────────────────────────
TEST_STUB_DIR="${REPO_ROOT}/.worktrees/CR-080-smoke"
PRE_GATE_SCRIPT="${REPO_ROOT}/.cleargate/scripts/pre_gate_runner.sh"
RUN_SCRIPT="${REPO_ROOT}/.cleargate/scripts/run_script.sh"

# Temp file for F8 env probe
TMP_STATE_FILE="/tmp/cr080-probe-$$.json"

# ── Teardown / trap ───────────────────────────────────────────────────────────
cleanup() {
  # Remove stub worktree directory
  if [[ -d "${TEST_STUB_DIR}" ]]; then
    rm -rf "${TEST_STUB_DIR}"
  fi
  # Remove tmp files
  rm -f "${TMP_STATE_FILE}" 2>/dev/null || true
}
trap cleanup EXIT

# ── Pre-checks ───────────────────────────────────────────────────────────────
if [[ ! -f "${PRE_GATE_SCRIPT}" ]]; then
  fail "pre-check" "pre_gate_runner.sh not found at ${PRE_GATE_SCRIPT}"
  echo ""
  echo "cr080_wrapper.test.sh: ${PASS} passed, ${FAIL} failed"
  exit 1
fi

if [[ ! -f "${RUN_SCRIPT}" ]]; then
  fail "pre-check" "run_script.sh not found at ${RUN_SCRIPT}"
  echo ""
  echo "cr080_wrapper.test.sh: ${PASS} passed, ${FAIL} failed"
  exit 1
fi

# ── Setup: create a stub worktree dir with the expected .cleargate structure ──
# We use a simple stub directory rather than a real git worktree because the
# pre_gate_runner.sh only requires the directory to exist for path normalization;
# the typecheck/test/stray checks are skipped when no package.json is present.
rm -rf "${TEST_STUB_DIR}" 2>/dev/null || true
mkdir -p "${TEST_STUB_DIR}/.cleargate/reports"

# ────────────────────────────────────────────────────────────────────────────
# ASSERTION F5-1: Relative worktree path writes report to correct location
# ────────────────────────────────────────────────────────────────────────────
# Run from REPO_ROOT with a relative path (.worktrees/CR-080-smoke).
# The report should land at <absolute-stub-dir>/.cleargate/reports/pre-qa-scan.txt.

RELATIVE_PATH=".worktrees/CR-080-smoke"
# Use qa mode (matches CR §4 verification command); report file = pre-qa-scan.txt.
# qa mode skips typecheck + test when no package.json is present in the worktree.
EXPECTED_REPORT="${TEST_STUB_DIR}/.cleargate/reports/pre-qa-scan.txt"

# Remove any stale report from a previous run
rm -f "${EXPECTED_REPORT}" 2>/dev/null || true

# Run from repo root with the RELATIVE path (the bug scenario).
# We use a non-existent branch (sprint/S-99) — pre_gate_runner.sh tolerates it
# (qa mode skips package.json checks when no package.json exists).
cd "${REPO_ROOT}"
bash "${PRE_GATE_SCRIPT}" qa "${RELATIVE_PATH}" "sprint/S-99" > /dev/null 2>&1 || true

if [[ -f "${EXPECTED_REPORT}" ]]; then
  pass "F5-1: relative-worktree-path — report written at correct absolute location"
else
  fail "F5-1: relative-worktree-path — report not found at ${EXPECTED_REPORT}" \
    "expected report at ${EXPECTED_REPORT} after running with relative path ${RELATIVE_PATH}"
fi

# ────────────────────────────────────────────────────────────────────────────
# ASSERTION F5-2: Absolute worktree path writes report to the same location
# ────────────────────────────────────────────────────────────────────────────
# Run from repo root with ABSOLUTE path — identical report location expected.

rm -f "${EXPECTED_REPORT}" 2>/dev/null || true

cd "${REPO_ROOT}"
bash "${PRE_GATE_SCRIPT}" qa "${TEST_STUB_DIR}" "sprint/S-99" > /dev/null 2>&1 || true

if [[ -f "${EXPECTED_REPORT}" ]]; then
  pass "F5-2: absolute-worktree-path — report written at correct location"
else
  fail "F5-2: absolute-worktree-path — report not found at ${EXPECTED_REPORT}" \
    "expected report at ${EXPECTED_REPORT} after running with absolute path ${TEST_STUB_DIR}"
fi

# Regression: verify no path-doubling (the ENOENT symptom was a doubled path like
# <worktree>/<worktree>/.cleargate/... — which can't exist). The report is at the
# expected location = no doubling occurred. Verified implicitly by F5-1 passing
# from a relative-path invocation (the bug only triggered on relative paths).

# ────────────────────────────────────────────────────────────────────────────
# ASSERTION F8-3: CLEARGATE_STATE_FILE exported before wrapper reaches child
# ────────────────────────────────────────────────────────────────────────────
# Export the var, then run run_script.sh wrapping a node -e that reads it.
# The child should print the value, not "MISSING".

PROBE_RESULT="$(
  export CLEARGATE_STATE_FILE="${TMP_STATE_FILE}"
  bash "${RUN_SCRIPT}" node -e 'process.stdout.write(process.env.CLEARGATE_STATE_FILE || "MISSING")' 2>/dev/null
)"

if [[ "${PROBE_RESULT}" = "${TMP_STATE_FILE}" ]]; then
  pass "F8-3: CLEARGATE_STATE_FILE forwarded to child — got '${PROBE_RESULT}'"
else
  fail "F8-3: CLEARGATE_STATE_FILE not forwarded to child" \
    "expected '${TMP_STATE_FILE}', got '${PROBE_RESULT}'"
fi

# ────────────────────────────────────────────────────────────────────────────
# ASSERTION F8-4 (optional allowlist): RUN_SCRIPT_ENV_ALLOWLIST is opt-in only
# ────────────────────────────────────────────────────────────────────────────
# When RUN_SCRIPT_ENV_ALLOWLIST is set to "FOO", a var NOT in the allowlist
# (e.g. CLEARGATE_STATE_FILE) should still reach the child because the
# allowlist is advisory/documentation-only — the current implementation does
# NOT strip the env (it only populates _allowed_env for future use).
# This assertion documents that the default pass-through is preserved even
# when the allowlist var is set: the child still sees CLEARGATE_STATE_FILE.

PROBE_ALLOWLIST_RESULT="$(
  export CLEARGATE_STATE_FILE="${TMP_STATE_FILE}"
  export RUN_SCRIPT_ENV_ALLOWLIST="FOO"
  bash "${RUN_SCRIPT}" node -e 'process.stdout.write(process.env.CLEARGATE_STATE_FILE || "MISSING")' 2>/dev/null
)"

if [[ "${PROBE_ALLOWLIST_RESULT}" = "${TMP_STATE_FILE}" ]]; then
  pass "F8-4: allowlist opt-in — full pass-through preserved when RUN_SCRIPT_ENV_ALLOWLIST set"
else
  fail "F8-4: allowlist opt-in — CLEARGATE_STATE_FILE unexpectedly dropped" \
    "expected '${TMP_STATE_FILE}', got '${PROBE_ALLOWLIST_RESULT}'"
fi

# ── Summary ───────────────────────────────────────────────────────────────────
echo ""
echo "cr080_wrapper.test.sh: ${PASS} passed, ${FAIL} failed"

if [[ $FAIL -gt 0 ]]; then
  exit 1
fi
exit 0
