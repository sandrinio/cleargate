#!/usr/bin/env bash
# test_file_surface.sh — Gherkin-style tests for file_surface_diff.sh
# Tests all 4 scenarios from STORY-014-01 §2.1
#
# Usage: bash .cleargate/scripts/test/test_file_surface.sh
# Exit: 0 if all pass, 1 if any fail
#
# The gate blocks unconditionally on off-surface staged files;
# SKIP_SURFACE_GATE=1 is the only bypass (see STORY-051-01).

set -euo pipefail

# Navigate up 3 levels: test/ -> scripts/ -> .cleargate/ -> repo-root/
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../../.." && pwd)"
SCRIPT="${REPO_ROOT}/.cleargate/scripts/file_surface_diff.sh"
PASS=0
FAIL=0
TOTAL=0

pass() { echo "  PASS: $1"; PASS=$((PASS+1)); TOTAL=$((TOTAL+1)); }
fail() { echo "  FAIL: $1 --- $2"; FAIL=$((FAIL+1)); TOTAL=$((TOTAL+1)); }

echo "REPO_ROOT: ${REPO_ROOT}"
echo "SCRIPT: ${SCRIPT}"
if [[ ! -f "${SCRIPT}" ]]; then
  echo "ERROR: file_surface_diff.sh not found at ${SCRIPT}"
  exit 1
fi

# ============================================================================
# Setup helpers
# ============================================================================

setup_git_repo() {
  local dir="$1"
  git init -q "${dir}"
  git -C "${dir}" config user.email "test@test.com"
  git -C "${dir}" config user.name "Test"
  git -C "${dir}" commit -q --allow-empty -m "init"
}

create_story_file() {
  local dir="$1"
  shift
  # remaining args are file paths to declare in §3.1
  mkdir -p "${dir}/.cleargate/delivery/pending-sync"
  local story="${dir}/.cleargate/delivery/pending-sync/STORY-014-01_Test.md"
  {
    echo "---"
    echo "story_id: STORY-014-01"
    echo "---"
    echo ""
    echo "# Test Story"
    echo ""
    echo "## 3. Implementation Guide"
    echo ""
    echo "### 3.1 Context & Files"
    echo ""
    echo "| Item | Value |"
    echo "|---|---|"
    for f in "$@"; do
      echo "| New script | \`${f}\` |"
    done
    echo ""
    echo "### 3.2 Technical Logic"
    echo "test"
  } > "${story}"
}

create_sprint_state() {
  local dir="$1"
  mkdir -p "${dir}/.cleargate/sprint-runs/SPRINT-10"
  echo "SPRINT-10" > "${dir}/.cleargate/sprint-runs/.active"
  echo "{\"stories\":{\"STORY-014-01\":{\"state\":\"In Progress\",\"updated_at\":\"2026-04-21T12:00:00Z\"}}}" > "${dir}/.cleargate/sprint-runs/SPRINT-10/state.json"
}

# ============================================================================
# Scenario 1: Gate catches off-surface edit
# ============================================================================

echo ""
echo "Scenario 1: Gate catches off-surface edit"

TMPDIR1="$(mktemp -d)"
setup_git_repo "${TMPDIR1}"
create_story_file "${TMPDIR1}" "hello.mjs" "README.md"
create_sprint_state "${TMPDIR1}"

touch "${TMPDIR1}/hello.mjs" "${TMPDIR1}/README.md" "${TMPDIR1}/unrelated.txt"
git -C "${TMPDIR1}" add hello.mjs README.md unrelated.txt

EXIT_CODE=0
STDERR_OUT="$(CLEARGATE_REPO_ROOT="${TMPDIR1}" bash "${SCRIPT}" 2>&1 >/dev/null)" || EXIT_CODE=$?

if [[ "${EXIT_CODE}" -ne 0 ]]; then
  pass "exit code is non-zero"
else
  fail "exit code is non-zero" "got exit 0"
fi

if echo "${STDERR_OUT}" | grep -q "unrelated.txt"; then
  pass "stderr lists unrelated.txt as off-surface"
else
  fail "stderr lists unrelated.txt as off-surface" "stderr was: ${STDERR_OUT}"
fi

rm -rf "${TMPDIR1}"

# ============================================================================
# Scenario 2: Gate passes when staged files match surface
# ============================================================================

echo ""
echo "Scenario 2: Gate passes when staged files match surface"

TMPDIR2="$(mktemp -d)"
setup_git_repo "${TMPDIR2}"
create_story_file "${TMPDIR2}" "hello.mjs" "README.md"
create_sprint_state "${TMPDIR2}"

touch "${TMPDIR2}/hello.mjs" "${TMPDIR2}/README.md"
git -C "${TMPDIR2}" add hello.mjs README.md

EXIT_CODE=0
CLEARGATE_REPO_ROOT="${TMPDIR2}" bash "${SCRIPT}" 2>/dev/null || EXIT_CODE=$?

if [[ "${EXIT_CODE}" -eq 0 ]]; then
  pass "exit code is 0"
else
  fail "exit code is 0" "got exit ${EXIT_CODE}"
fi

rm -rf "${TMPDIR2}"

# ============================================================================
# Scenario 3: Whitelist admits generated files
# ============================================================================

echo ""
echo "Scenario 3: Whitelist admits generated files"

TMPDIR3="$(mktemp -d)"
setup_git_repo "${TMPDIR3}"
create_story_file "${TMPDIR3}" "hello.mjs"
create_sprint_state "${TMPDIR3}"

mkdir -p "${TMPDIR3}/.cleargate/scripts"
{
  echo "cleargate-planning/MANIFEST.json"
  echo ".cleargate/hook-log/*"
} > "${TMPDIR3}/.cleargate/scripts/surface-whitelist.txt"

touch "${TMPDIR3}/hello.mjs"
mkdir -p "${TMPDIR3}/cleargate-planning"
touch "${TMPDIR3}/cleargate-planning/MANIFEST.json"
git -C "${TMPDIR3}" add hello.mjs cleargate-planning/MANIFEST.json

EXIT_CODE=0
CLEARGATE_REPO_ROOT="${TMPDIR3}" bash "${SCRIPT}" 2>/dev/null || EXIT_CODE=$?

if [[ "${EXIT_CODE}" -eq 0 ]]; then
  pass "MANIFEST.json not flagged (whitelisted)"
else
  fail "MANIFEST.json not flagged (whitelisted)" "got exit ${EXIT_CODE}"
fi

rm -rf "${TMPDIR3}"

# ============================================================================
# Scenario 4: SKIP_SURFACE_GATE=1 bypasses
# ============================================================================

echo ""
echo "Scenario 4: SKIP_SURFACE_GATE=1 bypasses"

TMPDIR4="$(mktemp -d)"
setup_git_repo "${TMPDIR4}"
create_story_file "${TMPDIR4}" "hello.mjs"
create_sprint_state "${TMPDIR4}"

touch "${TMPDIR4}/hello.mjs" "${TMPDIR4}/unrelated.txt"
git -C "${TMPDIR4}" add hello.mjs unrelated.txt

EXIT_CODE=0
STDERR_OUT="$(CLEARGATE_REPO_ROOT="${TMPDIR4}" SKIP_SURFACE_GATE=1 bash "${SCRIPT}" 2>&1 >/dev/null)" || EXIT_CODE=$?

if [[ "${EXIT_CODE}" -eq 0 ]]; then
  pass "SKIP_SURFACE_GATE=1 exits 0 (bypassed)"
else
  fail "SKIP_SURFACE_GATE=1 exits 0" "got exit ${EXIT_CODE}"
fi

if echo "${STDERR_OUT}" | grep -qi "bypassing gate"; then
  pass "SKIP_SURFACE_GATE=1 reports the gate was bypassed"
else
  fail "SKIP_SURFACE_GATE=1 reports bypass" "stderr was: ${STDERR_OUT}"
fi

rm -rf "${TMPDIR4}"

# ============================================================================
# Summary
# ============================================================================

echo ""
echo "Results: ${PASS}/${TOTAL} passed, ${FAIL} failed"

if [[ "${FAIL}" -gt 0 ]]; then
  exit 1
fi
exit 0
