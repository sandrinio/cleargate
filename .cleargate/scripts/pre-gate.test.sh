#!/usr/bin/env bash
# pre-gate.test.sh — Acceptance tests for STORY-013-03
# Usage: bash .cleargate/scripts/pre-gate.test.sh
# Exercises all 6 Gherkin scenarios from §2.1.
# Uses throwaway tmpdirs + STORY-013-FAKE / S-FAKE IDs. Cleans up after.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RUN_SCRIPT="${SCRIPT_DIR}/run_script.sh"
PRE_GATE="${SCRIPT_DIR}/pre_gate_runner.sh"
INIT_GATE="${SCRIPT_DIR}/init_gate_config.sh"

PASS=0
FAIL=0

# ---------------------------------------------------------------------------
# Helper functions
# ---------------------------------------------------------------------------
pass() { echo "[PASS] $1"; PASS=$((PASS + 1)); }
fail() { echo "[FAIL] $1"; FAIL=$((FAIL + 1)); }

assert_exit() {
  local expected="$1"
  local actual="$2"
  local label="$3"
  if [[ "$actual" -eq "$expected" ]]; then
    pass "$label (exit code ${actual})"
  else
    fail "$label — expected exit ${expected}, got ${actual}"
  fi
}

assert_contains() {
  local haystack="$1"
  local needle="$2"
  local label="$3"
  if echo "$haystack" | grep -qF "$needle"; then
    pass "$label"
  else
    fail "$label — expected to find '${needle}'"
    echo "  actual output: $(echo "$haystack" | head -5)"
  fi
}

# ---------------------------------------------------------------------------
# SCENARIO 1: run_script.sh passes through a successful script
# ---------------------------------------------------------------------------
echo ""
echo "=== Scenario 1: run_script.sh passes through a successful script ==="
TMP1="$(mktemp -d)"
trap 'rm -rf "$TMP1"' EXIT

cat > "${TMP1}/ok.mjs" << 'EOF'
process.stdout.write("hello\n");
EOF

stdout_out="$("$RUN_SCRIPT" "${TMP1}/ok.mjs" 2>/dev/null)"
exit_code=$?

assert_exit 0 $exit_code "Scenario 1: exit code 0"
assert_contains "$stdout_out" "hello" "Scenario 1: stdout is 'hello'"

# ---------------------------------------------------------------------------
# SCENARIO 2: run_script.sh prints a diagnostic block on failure
# ---------------------------------------------------------------------------
echo ""
echo "=== Scenario 2: run_script.sh prints diagnostic block on failure ==="
TMP2="$(mktemp -d)"
trap 'rm -rf "$TMP1" "$TMP2"' EXIT

cat > "${TMP2}/fail.mjs" << 'EOF'
process.stderr.write("oops\n");
process.exit(7);
EOF

stderr_out="$("$RUN_SCRIPT" "${TMP2}/fail.mjs" 2>&1 >/dev/null)" || exit_code=$?
exit_code=${exit_code:-0}

# Capture both exit code and stderr properly
set +e
stderr_out=$("$RUN_SCRIPT" "${TMP2}/fail.mjs" 2>&1 >/dev/null)
exit_code=$?
set -e

assert_exit 7 $exit_code "Scenario 2: exit code is 7"
assert_contains "$stderr_out" "## Script Incident" "Scenario 2: stderr contains '## Script Incident'"
assert_contains "$stderr_out" "Exit code:" "Scenario 2: stderr contains 'Exit code:'"
assert_contains "$stderr_out" "Suggested fix:" "Scenario 2: stderr contains 'Suggested fix:'"

# ---------------------------------------------------------------------------
# SCENARIO 3: pre_gate_runner qa catches a debug statement
# ---------------------------------------------------------------------------
echo ""
echo "=== Scenario 3: pre_gate_runner qa catches a debug statement ==="
TMP3="$(mktemp -d)"
trap 'rm -rf "$TMP1" "$TMP2" "$TMP3"' EXIT

# Create a minimal git repo as the "worktree"
git init "$TMP3" -q
git -C "$TMP3" config user.email "test@example.com"
git -C "$TMP3" config user.name "Test"

# Add a file with console.log
cat > "${TMP3}/index.js" << 'EOF'
console.log('debug');
function main() { return 42; }
module.exports = { main };
EOF

# Need at least one commit so git grep works
git -C "$TMP3" add .
git -C "$TMP3" commit -m "init" -q

set +e
"$PRE_GATE" qa "$TMP3" "sprint/S-FAKE" > /dev/null 2>&1
exit_code=$?
set -e

assert_exit 1 $exit_code "Scenario 3: exit code is 1 (checks failed)"

# Check report was written
REPORT_FILE="${TMP3}/.cleargate/reports/pre-qa-scan.txt"
if [[ -f "$REPORT_FILE" ]]; then
  pass "Scenario 3: report file exists at ${REPORT_FILE}"
  report_content="$(cat "$REPORT_FILE")"
  assert_contains "$report_content" "index.js" "Scenario 3: report names offending file"
else
  fail "Scenario 3: report file not found at ${REPORT_FILE}"
fi

# ---------------------------------------------------------------------------
# SCENARIO 4: pre_gate_runner arch flags a new runtime dep
# ---------------------------------------------------------------------------
echo ""
echo "=== Scenario 4: pre_gate_runner arch flags a new runtime dep ==="
TMP4="$(mktemp -d)"
trap 'rm -rf "$TMP1" "$TMP2" "$TMP3" "$TMP4"' EXIT

git init "$TMP4" -q
git -C "$TMP4" config user.email "test@example.com"
git -C "$TMP4" config user.name "Test"

# Create initial package.json without the new dep and commit it on a branch
# that will be the "sprint branch parent"
cat > "${TMP4}/package.json" << 'EOF'
{
  "name": "test-pkg",
  "version": "1.0.0",
  "dependencies": {}
}
EOF

git -C "$TMP4" add .
git -C "$TMP4" commit -m "init" -q

# Create the sprint branch
git -C "$TMP4" checkout -b "sprint/S-FAKE" -q

# Add a commit to represent the sprint start (branch^)
cat > "${TMP4}/placeholder.txt" << 'EOF'
sprint start
EOF
git -C "$TMP4" add placeholder.txt
git -C "$TMP4" commit -m "sprint start" -q

# Now modify package.json to add a new runtime dep (current worktree state)
cat > "${TMP4}/package.json" << 'EOF'
{
  "name": "test-pkg",
  "version": "1.0.0",
  "dependencies": {
    "some-new-lib": "^1.0.0"
  }
}
EOF

set +e
"$PRE_GATE" arch "$TMP4" "sprint/S-FAKE" > /dev/null 2>&1
exit_code=$?
set -e

assert_exit 1 $exit_code "Scenario 4: exit code is 1 (new dep detected)"

REPORT_FILE="${TMP4}/.cleargate/reports/pre-arch-scan.txt"
if [[ -f "$REPORT_FILE" ]]; then
  pass "Scenario 4: report file exists"
  report_content="$(cat "$REPORT_FILE")"
  assert_contains "$report_content" "new runtime dep: some-new-lib" "Scenario 4: report lists 'new runtime dep: some-new-lib'"
else
  fail "Scenario 4: report file not found at ${REPORT_FILE}"
fi

# ---------------------------------------------------------------------------
# SCENARIO 5: init_gate_config seeds a config file on first run
# ---------------------------------------------------------------------------
echo ""
echo "=== Scenario 5: init_gate_config seeds config on first run ==="
TMP5="$(mktemp -d)"
trap 'rm -rf "$TMP1" "$TMP2" "$TMP3" "$TMP4" "$TMP5"' EXIT

# First run: should create the file
FAKE_CONFIG="${TMP5}/gate-checks.json"
set +e
bash "$INIT_GATE" --config-path "$FAKE_CONFIG"
exit_code=$?
set -e

assert_exit 0 $exit_code "Scenario 5: init_gate_config exits 0 on first run"
if [[ -f "$FAKE_CONFIG" ]]; then
  pass "Scenario 5: gate-checks.json created"
  config_content="$(cat "$FAKE_CONFIG")"
  assert_contains "$config_content" '"qa"' "Scenario 5: config has 'qa' key"
  assert_contains "$config_content" '"arch"' "Scenario 5: config has 'arch' key"
else
  fail "Scenario 5: gate-checks.json not found at ${FAKE_CONFIG}"
fi

# Second run: should be a no-op (exit 0, file unchanged)
MTIME_BEFORE="$(stat -f '%m' "$FAKE_CONFIG" 2>/dev/null || stat -c '%Y' "$FAKE_CONFIG" 2>/dev/null || echo '0')"
sleep 1
set +e
bash "$INIT_GATE" --config-path "$FAKE_CONFIG"
exit_code=$?
set -e
MTIME_AFTER="$(stat -f '%m' "$FAKE_CONFIG" 2>/dev/null || stat -c '%Y' "$FAKE_CONFIG" 2>/dev/null || echo '0')"

assert_exit 0 $exit_code "Scenario 5: init_gate_config exits 0 on second run (no-op)"
if [[ "$MTIME_BEFORE" == "$MTIME_AFTER" ]]; then
  pass "Scenario 5: no-op — file not modified on second run"
else
  fail "Scenario 5: file was overwritten on second run (mtime changed)"
fi

# ---------------------------------------------------------------------------
# SCENARIO 6: run_script.sh refuses unknown extension
# ---------------------------------------------------------------------------
echo ""
echo "=== Scenario 6: run_script.sh refuses unknown extension ==="

set +e
stderr_out=$("$RUN_SCRIPT" "something.py" 2>&1 >/dev/null)
exit_code=$?
set -e

assert_exit 2 $exit_code "Scenario 6: exit code is 2"
assert_contains "$stderr_out" "unsupported extension" "Scenario 6: stderr says 'unsupported extension'"

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
echo ""
echo "=================================================="
echo "Results: ${PASS} passed, ${FAIL} failed"
echo "=================================================="

if [[ $FAIL -gt 0 ]]; then
  exit 1
fi
exit 0
