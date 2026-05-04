#!/usr/bin/env bash
# test_stamp_and_gate.sh — CR-032: table-driven bash tests for stamp-and-gate.sh
#
# Verifies that the stamp-and-gate hook emits ⚠️ gate failed: lines to stdout
# when cleargate gate check exits non-zero, and stays quiet on pass.
#
# Per FLASHCARD 2026-04-21 #test-harness #hooks #sed: use env injection, not sed-surgery.
# Per M2 plan §CR-032 test shape: 4 bash scenarios.
#
# Usage: bash cleargate-cli/test/scripts/test_stamp_and_gate.sh
# Exit code: 0 = all pass, 1 = failures.

set -u

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
HOOK="${REPO_ROOT}/cleargate-planning/.claude/hooks/stamp-and-gate.sh"
PASS=0
FAIL=0
ERRORS=()

# ─── Helpers ──────────────────────────────────────────────────────────────────

# Create a fake cleargate binary in $dir/bin/ that responds to specific subcommands.
# gate check: exits $GATE_EXIT and prints $GATE_STDOUT
# stamp-tokens, wiki ingest: exit 0, print nothing
make_fake_cleargate() {
  local bin_dir="$1"
  local gate_exit="${2:-0}"
  local gate_stdout="${3:-}"

  mkdir -p "${bin_dir}"
  cat >"${bin_dir}/cleargate" <<FAKE_CG
#!/usr/bin/env bash
set -u
subcommand="\$1"
shift
case "\${subcommand}" in
  stamp-tokens)
    exit 0
    ;;
  gate)
    # \$1 is "check", \$2 is the file path
    printf '%s' "${gate_stdout}"
    exit ${gate_exit}
    ;;
  wiki)
    # \$1 is "ingest"
    exit 0
    ;;
  *)
    exit 0
    ;;
esac
FAKE_CG
  chmod +x "${bin_dir}/cleargate"
}

# Run the stamp-and-gate hook with a fixture file, injecting fake cleargate via PATH.
# Prints hook stdout only (stderr is discarded as it goes to log file).
# Args: $1=tmpdir, $2=fixture_file_path, $3=gate_exit, $4=gate_stdout
run_hook() {
  local tmpdir="$1"
  local fixture_file="$2"
  local gate_exit="${3:-0}"
  local gate_stdout="${4:-}"

  local fake_bin="${tmpdir}/fakebin"
  make_fake_cleargate "${fake_bin}" "${gate_exit}" "${gate_stdout}"

  # Build hook input payload
  local payload
  payload="$(printf '{"tool_name":"Write","tool_input":{"file_path":"%s"}}' "${fixture_file}")"

  mkdir -p "${tmpdir}/.cleargate/hook-log"

  # Run hook: inject fake cleargate ahead of PATH; capture stdout only
  PATH="${fake_bin}:${PATH}" CLAUDE_PROJECT_DIR="${tmpdir}" \
    bash "${HOOK}" <<< "${payload}" 2>/dev/null
}

assert_contains() {
  local name="$1"
  local expected="$2"
  local actual="$3"

  if printf '%s' "${actual}" | grep -qF "${expected}"; then
    printf '  ✓ %s\n' "${name}"
    PASS=$((PASS + 1))
  else
    printf '  ✗ %s\n    expected to contain: %s\n    got: %s\n' "${name}" "${expected}" "${actual}"
    FAIL=$((FAIL + 1))
    ERRORS+=("${name}")
  fi
}

assert_not_contains() {
  local name="$1"
  local unexpected="$2"
  local actual="$3"

  if printf '%s' "${actual}" | grep -qF "${unexpected}"; then
    printf '  ✗ %s\n    expected NOT to contain: %s\n    got: %s\n' "${name}" "${unexpected}" "${actual}"
    FAIL=$((FAIL + 1))
    ERRORS+=("${name}")
  else
    printf '  ✓ %s\n' "${name}"
    PASS=$((PASS + 1))
  fi
}

assert_count() {
  local name="$1"
  local pattern="$2"
  local expected_count="$3"
  local actual="$4"

  local actual_count
  actual_count=$(printf '%s' "${actual}" | grep -cF "${pattern}" 2>/dev/null || true)
  if [ "${actual_count}" -eq "${expected_count}" ]; then
    printf '  ✓ %s\n' "${name}"
    PASS=$((PASS + 1))
  else
    printf '  ✗ %s (expected %d match(es) for "%s", got %d)\n' \
      "${name}" "${expected_count}" "${pattern}" "${actual_count}"
    FAIL=$((FAIL + 1))
    ERRORS+=("${name}")
  fi
}

# ─── Tests ────────────────────────────────────────────────────────────────────

printf '\n'
printf 'CR-032 stamp-and-gate.sh tests\n'
printf '================================\n'

# ── Case 1: Failing fixture emits ⚠️ lines ────────────────────────────────────
# Gate exits 1 + prints 2 ❌ lines → hook stdout must contain exactly 2 ⚠️ lines.
printf '\nCase 1: failing gate emits exactly 2 ⚠️ gate failed: lines\n'
_tmpdir1=$(mktemp -d)
_fixture1="${_tmpdir1}/.cleargate/delivery/pending-sync/EPIC-099_Test.md"
mkdir -p "$(dirname "${_fixture1}")"
cat >"${_fixture1}" <<'FIXTURE'
---
epic_id: EPIC-099
status: Draft
---
# EPIC-099: Test Epic
FIXTURE
_gate_out1="❌ parent-approved: OR-group failed — all alternatives failed: parent-approved-proposal: linked file not found: INITIATIVE-001_test.md; parent-approved-initiative: linked file not found: INITIATIVE-001_test.md
❌ affected-files-declared: section 4 has 0 listed-item (≥1 required)"
_stdout1=$(run_hook "${_tmpdir1}" "${_fixture1}" 1 "${_gate_out1}")
rm -rf "${_tmpdir1}"

assert_count "Case 1a: exactly 2 ⚠️ gate failed: lines" "⚠️ gate failed:" 2 "${_stdout1}"

# ── Case 2: Pass case stays quiet ─────────────────────────────────────────────
# Gate exits 0 + prints nothing → hook stdout must contain zero ⚠️ gate failed: lines.
printf '\nCase 2: passing gate produces zero ⚠️ gate failed: lines\n'
_tmpdir2=$(mktemp -d)
_fixture2="${_tmpdir2}/.cleargate/delivery/pending-sync/EPIC-100_Pass.md"
mkdir -p "$(dirname "${_fixture2}")"
cat >"${_fixture2}" <<'FIXTURE'
---
epic_id: EPIC-100
status: Draft
---
# EPIC-100: Pass Epic
FIXTURE
_stdout2=$(run_hook "${_tmpdir2}" "${_fixture2}" 0 "")
rm -rf "${_tmpdir2}"

assert_not_contains "Case 2: no ⚠️ gate failed: line on pass" "⚠️ gate failed:" "${_stdout2}"

# ── Case 3: Detail preservation ───────────────────────────────────────────────
# A failure with detail text → full detail appears verbatim after the — separator.
printf '\nCase 3: detail text is preserved verbatim after — separator\n'
_tmpdir3=$(mktemp -d)
_fixture3="${_tmpdir3}/.cleargate/delivery/pending-sync/EPIC-101_Detail.md"
mkdir -p "$(dirname "${_fixture3}")"
cat >"${_fixture3}" <<'FIXTURE'
---
epic_id: EPIC-101
status: Draft
---
# EPIC-101: Detail Epic
FIXTURE
_gate_out3="❌ affected-files-declared: section 4 has 0 listed-item (≥1 required)"
_stdout3=$(run_hook "${_tmpdir3}" "${_fixture3}" 1 "${_gate_out3}")
rm -rf "${_tmpdir3}"

assert_contains "Case 3: detail text preserved verbatim" \
  "affected-files-declared: section 4 has 0 listed-item (≥1 required)" \
  "${_stdout3}"

# ── Case 4: Work-item ID extraction ───────────────────────────────────────────
# Fixture file with cr_id: CR-099 in frontmatter → emitted line says CR-099.
printf '\nCase 4: work-item ID extracted from file content\n'
_tmpdir4=$(mktemp -d)
_fixture4="${_tmpdir4}/.cleargate/delivery/pending-sync/CR-099_Test.md"
mkdir -p "$(dirname "${_fixture4}")"
cat >"${_fixture4}" <<'FIXTURE'
---
cr_id: CR-099
status: Draft
---
# CR-099: Test CR
FIXTURE
_gate_out4="❌ parent-approved: OR-group failed"
_stdout4=$(run_hook "${_tmpdir4}" "${_fixture4}" 1 "${_gate_out4}")
rm -rf "${_tmpdir4}"

assert_contains "Case 4: CR-099 appears in gate failed line" "gate failed: CR-099 —" "${_stdout4}"

# ─── Summary ──────────────────────────────────────────────────────────────────

printf '\n'
printf 'Results: %d passed, %d failed\n' "${PASS}" "${FAIL}"
if [[ ${FAIL} -gt 0 ]]; then
  printf 'Failed cases:\n'
  for e in "${ERRORS[@]}"; do
    printf '  - %s\n' "${e}"
  done
  exit 1
fi
exit 0
