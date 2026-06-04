#!/usr/bin/env bash
# cr079_provision.red.sh — CR-079 QA-Red provision test harness.
#
# RED: fails against clean baseline — provision_worktree_config.sh does not yet
# exist, so the .env is never provisioned into the test worktree, and the
# stray_env_files scan has no exemption for provisioned config.
# GREEN: passes after Developer implements CR-079 (provision script created +
# pre_gate_runner.sh exemption branch + config.yml worktree.provision_config).
#
# Assertions (per M1 §5 / CR §4):
#   1. Provision (symlink): provision script creates .env symlink in worktree
#      pointing to absolute repo-root .env.
#   2. Scan PASS (exempted): with the provisioned .env present, stray_env_files
#      scan records PASS (provisioned file is exempt, not stray).
#   3. Negative control: a non-provisioned .env.local in the worktree makes the
#      scan record stray_env_files FAIL (exemption is scoped, not blanket).
#   4. Teardown: no dangling symlink at repo root; fixture .env cleaned up; no
#      leftover worktree.
#
# The harness is self-cleaning even on assertion failure: trap EXIT removes the
# test worktree, any fixture .env created at repo root, and the test branch.
#
# Mirrors: cr077_eviction.red.sh / test_prep_qa_context.sh harness shape.
# macOS bash 3.2 portable.
# FLASHCARD #test-harness #bash 2026-06-03: never use `grep -c … || echo 0`
#   (doubles on zero-match). Use grep -q or grep -c … | head -1.
#
# Exit 0 = PASS (all assertions pass); exit 1 = one or more FAIL.
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
TEST_BRANCH="test/079"
TEST_WORKTREE="${REPO_ROOT}/.worktrees/TEST-079"
PROVISION_SCRIPT="${REPO_ROOT}/.cleargate/scripts/provision_worktree_config.sh"
PRE_GATE_SCRIPT="${REPO_ROOT}/.cleargate/scripts/pre_gate_runner.sh"
FIXTURE_ENV="${REPO_ROOT}/.env"
# Report path written by pre_gate_runner.sh arch mode
SCAN_REPORT="${TEST_WORKTREE}/.cleargate/reports/pre-arch-scan.txt"

# Track whether the harness created the fixture .env at repo root
HARNESS_CREATED_ENV=0

# ── Teardown / trap ───────────────────────────────────────────────────────────
cleanup() {
  # Remove test worktree (force — even if dirty)
  if git -C "${REPO_ROOT}" worktree list 2>/dev/null | grep -q "${TEST_WORKTREE}"; then
    git -C "${REPO_ROOT}" worktree remove --force "${TEST_WORKTREE}" 2>/dev/null || true
    git -C "${REPO_ROOT}" worktree prune 2>/dev/null || true
  fi
  # Remove worktree directory if still present
  if [[ -d "${TEST_WORKTREE}" ]]; then
    rm -rf "${TEST_WORKTREE}"
  fi
  # Remove test branch if it exists
  if git -C "${REPO_ROOT}" branch --list "${TEST_BRANCH}" | grep -q "${TEST_BRANCH}"; then
    git -C "${REPO_ROOT}" branch -D "${TEST_BRANCH}" 2>/dev/null || true
  fi
  # Remove fixture .env only if harness created it and it's still a real file
  if [[ "${HARNESS_CREATED_ENV}" -eq 1 && -f "${FIXTURE_ENV}" && ! -L "${FIXTURE_ENV}" ]]; then
    rm -f "${FIXTURE_ENV}"
  fi
}
trap cleanup EXIT

# ── Pre-check: fixture .env at repo root ─────────────────────────────────────
# The repo has no .env (gitignored). Create a fixture so the provision script
# has a real source file to symlink from.
if [[ ! -e "${FIXTURE_ENV}" ]]; then
  printf 'CR079_FIXTURE=1\n' > "${FIXTURE_ENV}"
  HARNESS_CREATED_ENV=1
fi

# ── Setup: create test worktree ───────────────────────────────────────────────
# Clean up any stale worktree/branch from a previous interrupted run.
if git -C "${REPO_ROOT}" worktree list 2>/dev/null | grep -q "TEST-079"; then
  git -C "${REPO_ROOT}" worktree remove --force "${TEST_WORKTREE}" 2>/dev/null || true
  git -C "${REPO_ROOT}" worktree prune 2>/dev/null || true
fi
if [[ -d "${TEST_WORKTREE}" ]]; then
  rm -rf "${TEST_WORKTREE}"
fi
if git -C "${REPO_ROOT}" branch --list "${TEST_BRANCH}" | grep -q "${TEST_BRANCH}"; then
  git -C "${REPO_ROOT}" branch -D "${TEST_BRANCH}" 2>/dev/null || true
fi

git -C "${REPO_ROOT}" worktree add "${TEST_WORKTREE}" -b "${TEST_BRANCH}" HEAD \
  > /dev/null 2>&1
if [[ ! -d "${TEST_WORKTREE}" ]]; then
  fail "setup-worktree" "git worktree add failed — ${TEST_WORKTREE} does not exist"
  echo ""
  echo "cr079_provision.red.sh: ${PASS} passed, ${FAIL} failed"
  exit 1
fi

# ────────────────────────────────────────────────────────────────────────────
# ASSERTION 1: Provision script creates .env symlink in worktree
# ────────────────────────────────────────────────────────────────────────────
# On the clean baseline: provision_worktree_config.sh does not exist → fails.

if [[ ! -f "${PROVISION_SCRIPT}" ]]; then
  fail "provision-script-exists" \
    "provision_worktree_config.sh does not exist at ${PROVISION_SCRIPT}"
else
  pass "provision-script-exists"
  # Script exists — run it and check the resulting symlink
  bash "${PROVISION_SCRIPT}" "${TEST_WORKTREE}" > /dev/null 2>&1 || true
fi

if [[ -L "${TEST_WORKTREE}/.env" ]]; then
  SYMLINK_TARGET="$(readlink "${TEST_WORKTREE}/.env")"
  if [[ "${SYMLINK_TARGET}" = "${FIXTURE_ENV}" ]]; then
    pass "provision-symlink-target — readlink resolves to absolute repo-root .env"
  else
    fail "provision-symlink-target" \
      "readlink='${SYMLINK_TARGET}' — expected absolute path '${FIXTURE_ENV}'"
  fi
else
  # Expected on clean baseline: provision script never ran → no symlink
  fail "provision-symlink-exists" \
    "${TEST_WORKTREE}/.env does not exist (provision script never ran or failed)"
fi

# ────────────────────────────────────────────────────────────────────────────
# ASSERTION 2: Scan records PASS for provisioned .env (exemption in place)
# ────────────────────────────────────────────────────────────────────────────
# Pre-condition: the .env must actually be present in the worktree for this
# assertion to be meaningful. On clean baseline, no .env was provisioned, so
# the scan trivially PASSes (nothing to flag). This means assertion 2 does NOT
# fail on the baseline solely due to the missing script — but we need it to
# FAIL to prove the exemption logic. We therefore MANUALLY place a .env symlink
# into the worktree here (mirroring what a real provision step would do), then
# run the scan. On clean baseline the scan will record FAIL because the
# exemption branch does not exist. After implementation the scan records PASS
# because the provisioned .env is exempt.

# Ensure a .env (symlink) is present in the worktree before running scan.
# If the provision step (assertion 1) already created it, this is a no-op.
if [[ ! -L "${TEST_WORKTREE}/.env" && ! -f "${TEST_WORKTREE}/.env" ]]; then
  # Create the symlink manually for this assertion so we can test the scan
  # exemption independently of the provision script.
  ln -s "${FIXTURE_ENV}" "${TEST_WORKTREE}/.env"
fi

# Remove any stale scan report so we get a fresh run.
rm -f "${SCAN_REPORT}" 2>/dev/null || true

# Run pre_gate_runner.sh arch mode with ABSOLUTE worktree path (FLASHCARD
# #pre-gate #cwd-leak #worktree 2026-06-03: pass absolute path to avoid leak).
bash "${PRE_GATE_SCRIPT}" arch "${TEST_WORKTREE}" HEAD > /dev/null 2>&1 || true

if [[ -f "${SCAN_REPORT}" ]]; then
  if grep -q '^\[PASS\] stray_env_files' "${SCAN_REPORT}"; then
    pass "scan-exemption — stray_env_files PASS for provisioned .env"
  else
    # Expected on clean baseline: no exemption branch → records FAIL on .env
    STRAY_LINE="$(grep 'stray_env_files' "${SCAN_REPORT}" | head -1 || echo '(no stray_env_files line)')"
    fail "scan-exemption — stray_env_files should record PASS for provisioned .env" \
      "report line: ${STRAY_LINE}"
  fi
else
  fail "scan-report-exists" \
    "pre-arch-scan.txt not written at ${SCAN_REPORT}"
fi

# ────────────────────────────────────────────────────────────────────────────
# ASSERTION 3: Negative control — .env.local still triggers FAIL
# ────────────────────────────────────────────────────────────────────────────
# .env.local is in stray_env_files list but NOT in provision_config default.
# Drop it into the worktree, run a fresh scan, assert stray_env_files FAIL.

printf 'NOT_PROVISIONED=1\n' > "${TEST_WORKTREE}/.env.local"

# Remove the previous scan report so we get a completely fresh scan.
rm -f "${SCAN_REPORT}" 2>/dev/null || true

bash "${PRE_GATE_SCRIPT}" arch "${TEST_WORKTREE}" HEAD > /dev/null 2>&1 || true

if [[ -f "${SCAN_REPORT}" ]]; then
  if grep -q '^\[FAIL\] stray_env_files' "${SCAN_REPORT}"; then
    pass "negative-control — .env.local (non-provisioned) triggers stray_env_files FAIL"
  else
    NEG_LINE="$(grep 'stray_env_files' "${SCAN_REPORT}" | head -1 || echo '(no stray_env_files line)')"
    fail "negative-control — .env.local should trigger stray_env_files FAIL (exemption must be scoped)" \
      "report line: ${NEG_LINE}"
  fi
else
  fail "negative-control-report-exists" \
    "pre-arch-scan.txt not written at ${SCAN_REPORT} for negative-control scan"
fi

# Remove the negative-control file so teardown sees a clean worktree
rm -f "${TEST_WORKTREE}/.env.local"

# ────────────────────────────────────────────────────────────────────────────
# ASSERTION 4: Teardown verification
# ────────────────────────────────────────────────────────────────────────────
# Remove the worktree and verify no dangling symlink at repo root and no
# leftover fixture .env. The EXIT trap is the safety net; here we verify
# explicitly so we can record PASS/FAIL before returning.

git -C "${REPO_ROOT}" worktree remove --force "${TEST_WORKTREE}" 2>/dev/null || true
git -C "${REPO_ROOT}" worktree prune 2>/dev/null || true
if [[ -d "${TEST_WORKTREE}" ]]; then
  rm -rf "${TEST_WORKTREE}"
fi
if git -C "${REPO_ROOT}" branch --list "${TEST_BRANCH}" | grep -q "${TEST_BRANCH}"; then
  git -C "${REPO_ROOT}" branch -D "${TEST_BRANCH}" 2>/dev/null || true
fi

# Assertion: no dangling symlink at repo root (.env symlink lives INSIDE the
# worktree pointing OUT; removing the worktree removes the symlink).
if [[ -L "${FIXTURE_ENV}" ]]; then
  fail "teardown-no-dangling-symlink" \
    ".env at repo root is a symlink after worktree removal — dangling"
else
  pass "teardown-no-dangling-symlink — no dangling symlink at repo root"
fi

# Assertion: worktree is no longer registered
if git -C "${REPO_ROOT}" worktree list 2>/dev/null | grep -q "TEST-079"; then
  fail "teardown-worktree-removed" \
    ".worktrees/TEST-079 still registered in git worktree list"
else
  pass "teardown-worktree-removed — .worktrees/TEST-079 removed"
fi

# Assertion: fixture .env at repo root is cleaned up (if harness created it)
if [[ "${HARNESS_CREATED_ENV}" -eq 1 ]]; then
  rm -f "${FIXTURE_ENV}"
  HARNESS_CREATED_ENV=0   # prevent double-remove in trap
  if [[ -e "${FIXTURE_ENV}" ]]; then
    fail "teardown-fixture-env-removed" \
      "fixture .env still present at ${FIXTURE_ENV} after cleanup"
  else
    pass "teardown-fixture-env-removed — fixture .env cleaned up"
  fi
fi

# ── Summary ───────────────────────────────────────────────────────────────────
echo ""
echo "cr079_provision.red.sh: ${PASS} passed, ${FAIL} failed"
if [[ "${FAIL}" -gt 0 ]]; then
  exit 1
fi
exit 0
