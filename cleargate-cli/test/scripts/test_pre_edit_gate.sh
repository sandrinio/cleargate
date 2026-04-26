#!/usr/bin/env bash
# test_pre_edit_gate.sh — CR-008 Phase B: table-driven bash tests for pre-edit-gate.sh
#
# Runs the hook script directly with controlled env to verify gate logic.
# Per FLASHCARD 2026-04-21 #test-harness #hooks #sed: use env injection, not sed-surgery.
#
# Usage: bash cleargate-cli/test/scripts/test_pre_edit_gate.sh
# Exit code: 0 = all pass, 1 = failures.

set -u

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
HOOK="${REPO_ROOT}/cleargate-planning/.claude/hooks/pre-edit-gate.sh"
PASS=0
FAIL=0
ERRORS=()

# ─── Helpers ──────────────────────────────────────────────────────────────────

run_hook() {
  local tmpdir="$1"
  local tool_name="${2:-Edit}"
  local file_path="$3"
  local stdin_json
  stdin_json=$(printf '{"tool_name":"%s","tool_input":{"file_path":"%s"}}' "${tool_name}" "${file_path}")

  CLAUDE_PROJECT_DIR="${tmpdir}" \
  CLEARGATE_PLANNING_GATE_MODE="${GATE_MODE:-warn}" \
  bash "${HOOK}" <<< "${stdin_json}" 2>&1
  return $?
}

assert() {
  local name="$1"
  local expected_exit="$2"
  local actual_exit="$3"
  local extra_check="${4:-}"

  if [ "${actual_exit}" -eq "${expected_exit}" ]; then
    if [ -z "${extra_check}" ] || eval "${extra_check}"; then
      echo "  ✓ ${name}"
      PASS=$((PASS + 1))
    else
      echo "  ✗ ${name} (exit ${actual_exit} ✓ but extra check failed: ${extra_check})"
      FAIL=$((FAIL + 1))
      ERRORS+=("${name}")
    fi
  else
    echo "  ✗ ${name} (expected exit ${expected_exit}, got ${actual_exit})"
    FAIL=$((FAIL + 1))
    ERRORS+=("${name}")
  fi
}

# Make a fake cleargate binary that simulates `doctor --can-edit`
make_fake_cleargate() {
  local dir="$1"
  local exit_code="${2:-0}" # 0 = allowed, 1 = blocked
  local reason="${3:-no_approved_stories}"

  mkdir -p "${dir}/fake-bin"
  cat > "${dir}/fake-bin/cleargate" << SCRIPT
#!/usr/bin/env bash
# Fake cleargate for testing
if [[ "\$*" == *"--can-edit"* ]]; then
  if [ "${exit_code}" -eq 0 ]; then
    echo "allowed"
    exit 0
  else
    echo "blocked: ${reason}"
    exit 1
  fi
fi
exit 0
SCRIPT
  chmod +x "${dir}/fake-bin/cleargate"
  export PATH="${dir}/fake-bin:${PATH}"
}

# Make a fake cleargate dist/cli.js so the first resolver branch is used
make_fake_dist() {
  local dir="$1"
  local exit_code="${2:-0}"
  local reason="${3:-no_approved_stories}"

  mkdir -p "${dir}/cleargate-cli/dist"
  cat > "${dir}/cleargate-cli/dist/cli.js" << SCRIPT
#!/usr/bin/env node
const args = process.argv.slice(2);
if (args.includes('--can-edit')) {
  if (${exit_code} === 0) {
    process.stdout.write('allowed\n');
    process.exit(0);
  } else {
    process.stdout.write('blocked: ${reason}\n');
    process.exit(1);
  }
}
process.exit(0);
SCRIPT
}

write_approved_story() {
  local dir="$1"
  local impl_files="${2:-}"
  local pending_dir="${dir}/.cleargate/delivery/pending-sync"
  mkdir -p "${pending_dir}"

  local impl_block=""
  if [ -n "${impl_files}" ]; then
    impl_block="implementation_files:\n  - \"${impl_files}\"\n"
  fi

  printf -- "---\nstory_id: \"STORY-001\"\napproved: true\n${impl_block}---\n\n# Story\n" \
    > "${pending_dir}/STORY-001.md"
}

write_sprint_sentinel() {
  local dir="$1"
  mkdir -p "${dir}/.cleargate/sprint-runs"
  echo "SPRINT-14" > "${dir}/.cleargate/sprint-runs/.active"
}

# ─── Tests ────────────────────────────────────────────────────────────────────

echo ""
echo "CR-008 pre-edit-gate.sh tests"
echo "================================="

# ── Test 1: Whitelist path .cleargate/** → exit 0 ────────────────────────────
(
  tmpdir=$(mktemp -d)
  mkdir -p "${tmpdir}/.cleargate/delivery/pending-sync"
  make_fake_dist "${tmpdir}" 1

  run_hook "${tmpdir}" "Edit" "${tmpdir}/.cleargate/delivery/pending-sync/STORY-NEW.md"
  actual=$?

  rm -rf "${tmpdir}"
  exit $actual
)
assert "Case 1: whitelist path .cleargate/delivery/pending-sync/ → exit 0" 0 $?

# ── Test 2: Whitelist path CLAUDE.md → exit 0 ────────────────────────────────
(
  tmpdir=$(mktemp -d)
  mkdir -p "${tmpdir}/.cleargate/delivery/pending-sync"
  make_fake_dist "${tmpdir}" 1

  run_hook "${tmpdir}" "Edit" "${tmpdir}/CLAUDE.md"
  actual=$?

  rm -rf "${tmpdir}"
  exit $actual
)
assert "Case 2: whitelist path CLAUDE.md → exit 0" 0 $?

# ── Test 3: Non-whitelist, no stories, MODE=warn → exit 0, log written ───────
(
  tmpdir=$(mktemp -d)
  mkdir -p "${tmpdir}/.cleargate/delivery/pending-sync"
  make_fake_dist "${tmpdir}" 1 "no_approved_stories"
  LOG="${tmpdir}/.cleargate/hook-log/pre-edit-gate-warn.log"

  GATE_MODE=warn run_hook "${tmpdir}" "Edit" "${tmpdir}/src/foo.ts"
  actual=$?

  # Check log file was written
  log_check="[ -f '${LOG}' ] && grep -q 'would_block' '${LOG}' && grep -q 'no_approved_stories' '${LOG}'"

  rm -rf "${tmpdir}"
  exit $actual
)
assert "Case 3: non-whitelist + no stories + warn mode → exit 0" 0 $?

# ── Test 4: Non-whitelist, no stories, MODE=enforce → exit 1 ─────────────────
(
  tmpdir=$(mktemp -d)
  mkdir -p "${tmpdir}/.cleargate/delivery/pending-sync"
  make_fake_dist "${tmpdir}" 1 "no_approved_stories"

  GATE_MODE=enforce run_hook "${tmpdir}" "Edit" "${tmpdir}/src/foo.ts"
  actual=$?

  rm -rf "${tmpdir}"
  exit $actual
)
assert "Case 4: non-whitelist + no stories + enforce mode → exit 1" 1 $?

# ── Test 5: CLEARGATE_PLANNING_BYPASS=1 → exit 0 ─────────────────────────────
(
  tmpdir=$(mktemp -d)
  mkdir -p "${tmpdir}/.cleargate/delivery/pending-sync"
  make_fake_dist "${tmpdir}" 1

  CLEARGATE_PLANNING_BYPASS=1 GATE_MODE=enforce \
    run_hook "${tmpdir}" "Edit" "${tmpdir}/src/foo.ts"
  actual=$?

  rm -rf "${tmpdir}"
  exit $actual
)
assert "Case 5: CLEARGATE_PLANNING_BYPASS=1 → exit 0" 0 $?

# ── Test 6: Approved story covers file → exit 0 ──────────────────────────────
(
  tmpdir=$(mktemp -d)
  make_fake_dist "${tmpdir}" 0 # returns allowed
  write_approved_story "${tmpdir}" "src/foo.ts"

  GATE_MODE=enforce run_hook "${tmpdir}" "Edit" "${tmpdir}/src/foo.ts"
  actual=$?

  rm -rf "${tmpdir}"
  exit $actual
)
assert "Case 6: approved story covers file → exit 0" 0 $?

# ── Test 7: Approved story doesn't cover file → exit 1 (enforce) ─────────────
(
  tmpdir=$(mktemp -d)
  make_fake_dist "${tmpdir}" 1 "file_not_in_implementation_files"
  write_approved_story "${tmpdir}" "src/bar.ts"

  GATE_MODE=enforce run_hook "${tmpdir}" "Edit" "${tmpdir}/src/foo.ts"
  actual=$?

  rm -rf "${tmpdir}"
  exit $actual
)
assert "Case 7: approved story doesn't cover file → exit 1 (enforce)" 1 $?

# ── Test 8: Sprint-active sentinel present → exit 0 ──────────────────────────
(
  tmpdir=$(mktemp -d)
  make_fake_dist "${tmpdir}" 1 # would block if doctor called
  write_sprint_sentinel "${tmpdir}"
  # No pending-sync dir to force doctor call to fail if it's reached
  mkdir -p "${tmpdir}/.cleargate/delivery/pending-sync"

  GATE_MODE=enforce run_hook "${tmpdir}" "Edit" "${tmpdir}/src/any-file.ts"
  actual=$?

  rm -rf "${tmpdir}"
  exit $actual
)
assert "Case 8: sprint-active sentinel present → exit 0 (whitelist bypass; doctor not called because sprint active)" 0 $?

# ── Test 9: Malformed stdin (no tool_input.file_path) → exit 0 (fail-open) ───
(
  tmpdir=$(mktemp -d)
  mkdir -p "${tmpdir}/.cleargate/delivery/pending-sync"
  make_fake_dist "${tmpdir}" 1

  # Malformed JSON — no tool_input.file_path
  echo '{"tool_name":"Edit","no_tool_input":true}' | \
    CLAUDE_PROJECT_DIR="${tmpdir}" \
    CLEARGATE_PLANNING_GATE_MODE=enforce \
    bash "${HOOK}" >/dev/null 2>&1
  actual=$?

  rm -rf "${tmpdir}"
  exit $actual
)
assert "Case 9: malformed stdin (no file_path) → exit 0 (fail-open)" 0 $?

# ── Test 10: MODE=off → skip all checks, exit 0 ──────────────────────────────
(
  tmpdir=$(mktemp -d)
  mkdir -p "${tmpdir}/.cleargate/delivery/pending-sync"
  make_fake_dist "${tmpdir}" 1

  GATE_MODE=off run_hook "${tmpdir}" "Write" "${tmpdir}/src/foo.ts"
  actual=$?

  rm -rf "${tmpdir}"
  exit $actual
)
assert "Case 10: MODE=off → exit 0 always" 0 $?

# ── Test 11: Warn mode writes structured log entry ───────────────────────────
(
  tmpdir=$(mktemp -d)
  mkdir -p "${tmpdir}/.cleargate/delivery/pending-sync"
  make_fake_dist "${tmpdir}" 1 "no_approved_stories"

  GATE_MODE=warn run_hook "${tmpdir}" "Edit" "${tmpdir}/src/foo.ts" >/dev/null 2>&1

  LOG="${tmpdir}/.cleargate/hook-log/pre-edit-gate-warn.log"
  if [ -f "${LOG}" ] && grep -q "mode=warn" "${LOG}" && grep -q "would_block" "${LOG}"; then
    exit 0
  else
    exit 1
  fi

  rm -rf "${tmpdir}"
)
assert "Case 11: warn mode writes structured log with mode=warn + would_block" 0 $?

# ─── Summary ──────────────────────────────────────────────────────────────────

echo ""
echo "Results: ${PASS} passed, ${FAIL} failed"
if [ ${FAIL} -gt 0 ]; then
  echo "Failed cases:"
  for e in "${ERRORS[@]}"; do
    echo "  - ${e}"
  done
  exit 1
fi
exit 0
