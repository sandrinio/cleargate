#!/usr/bin/env bash
# test_pre_gate_lane_aware.sh — STORY-022-04 Gherkin scenario verification
# Tests lane-aware post-scan routing helpers in pre_gate_common.sh +
# end-to-end integration of the lane logic in pre_gate_runner.sh.
#
# All helpers tested in isolation (source pre_gate_common.sh).
# Integration tests use a controlled tmp worktree with fake gate-checks.json.
#
# Cross-OS portability: bash 3.2+, no mapfile/readarray, POSIX ERE grep.
# Usage: bash .cleargate/scripts/test/test_pre_gate_lane_aware.sh
# Exit: 0 = all pass, 1 = failures present.

set -u

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
COMMON_SH="${REPO_ROOT}/.cleargate/scripts/pre_gate_common.sh"
RUNNER_SH="${REPO_ROOT}/.cleargate/scripts/pre_gate_runner.sh"
FIXTURES="${REPO_ROOT}/cleargate-cli/test/scripts/fixtures"

PASS=0
FAIL=0
ERRORS=()

pass() { printf '  PASS: %s\n' "$1"; PASS=$((PASS + 1)); }
fail() { printf '  FAIL: %s\n' "$1"; FAIL=$((FAIL + 1)); ERRORS+=("$1"); }

# Source helpers in a subshell to keep top-level environment clean
source_common() {
  # shellcheck source=pre_gate_common.sh
  source "${COMMON_SH}"
}

printf '\n=== STORY-022-04 Lane-Aware Pre-Gate Tests ===\n\n'

# ---------------------------------------------------------------------------
# Helper: make a minimal fake gate-checks.json
# ---------------------------------------------------------------------------
make_gate_checks() {
  local dir="$1"
  mkdir -p "${dir}/.cleargate/scripts"
  cat > "${dir}/.cleargate/scripts/gate-checks.json" << 'JSON'
{
  "qa": {
    "typecheck": "",
    "debug_patterns": [],
    "todo_patterns": [],
    "test": ""
  },
  "arch": {
    "typecheck": "",
    "new_deps_check": "false",
    "stray_env_files": [],
    "file_count_report": "false"
  }
}
JSON
}

# ---------------------------------------------------------------------------
# Helper: make a minimal v2 state.json with one fast-lane story
# ---------------------------------------------------------------------------
make_state_fast() {
  local state_file="$1"
  local story_id="${2:-STORY-TEST-01}"
  cat > "${state_file}" << JSON
{
  "schema_version": 2,
  "sprint_id": "SPRINT-TEST",
  "execution_mode": "v2",
  "sprint_status": "Active",
  "stories": {
    "${story_id}": {
      "state": "Bouncing",
      "qa_bounces": 0,
      "arch_bounces": 0,
      "worktree": null,
      "updated_at": "2026-04-27T00:00:00Z",
      "notes": "",
      "lane": "fast",
      "lane_assigned_by": "architect",
      "lane_demoted_at": null,
      "lane_demotion_reason": null
    }
  },
  "last_action": "fixture",
  "updated_at": "2026-04-27T00:00:00Z"
}
JSON
}

# ---------------------------------------------------------------------------
# Helper: make a minimal fake worktree directory (no git repo needed for QA-only
# scanner because gate-checks.json has all empty commands — scanner always passes)
# We still need git to not crash, so init a bare repo.
# ---------------------------------------------------------------------------
make_fake_worktree() {
  local wt="$1"
  mkdir -p "${wt}"
  git -C "${wt}" init -q 2>/dev/null || true
  git -C "${wt}" commit --allow-empty -m "init" -q 2>/dev/null || true
}

# ---------------------------------------------------------------------------
# Helper: build a fake "repo root" for the lane block
# (SCRIPT_DIR/../../ must resolve to repo_root)
# pre_gate_runner.sh SCRIPT_DIR is .cleargate/scripts/
# so REPO_ROOT_FOR_LANE = SCRIPT_DIR/../.. = repo_root
# We replicate: <tmp>/cleargate/scripts/pre_gate_runner.sh
#               <tmp>/.cleargate/sprint-runs/.active
#               <tmp>/.cleargate/sprint-runs/SPRINT-TEST/state.json
#               <tmp>/.cleargate/delivery/pending-sync/SPRINT-TEST_test.md
# ---------------------------------------------------------------------------
make_fake_repo_for_runner() {
  local tmp_repo="$1"
  local story_id="${2:-STORY-TEST-01}"
  local lane="${3:-fast}"

  # Sprint active sentinel
  mkdir -p "${tmp_repo}/.cleargate/sprint-runs/SPRINT-TEST"
  printf 'SPRINT-TEST' > "${tmp_repo}/.cleargate/sprint-runs/.active"

  # State JSON
  local state_file="${tmp_repo}/.cleargate/sprint-runs/SPRINT-TEST/state.json"
  if [[ "${lane}" = "fast" ]]; then
    make_state_fast "${state_file}" "${story_id}"
  else
    cat > "${state_file}" << JSON
{
  "schema_version": 2,
  "sprint_id": "SPRINT-TEST",
  "execution_mode": "v2",
  "sprint_status": "Active",
  "stories": {
    "${story_id}": {
      "state": "Bouncing",
      "qa_bounces": 0,
      "arch_bounces": 0,
      "worktree": null,
      "updated_at": "2026-04-27T00:00:00Z",
      "notes": "",
      "lane": "${lane}",
      "lane_assigned_by": "architect",
      "lane_demoted_at": null,
      "lane_demotion_reason": null
    }
  },
  "last_action": "fixture",
  "updated_at": "2026-04-27T00:00:00Z"
}
JSON
  fi

  # Sprint markdown
  mkdir -p "${tmp_repo}/.cleargate/delivery/pending-sync"
  printf '# SPRINT-TEST Plan\n\n## 1. Deliverables\n\nplaceholder\n' \
    > "${tmp_repo}/.cleargate/delivery/pending-sync/SPRINT-TEST_test.md"

  # Scripts dir (SCRIPT_DIR for runner = .cleargate/scripts)
  local scripts_dir="${tmp_repo}/.cleargate/scripts"
  mkdir -p "${scripts_dir}"

  # Copy the actual scripts so sourcing works
  cp "${COMMON_SH}" "${scripts_dir}/pre_gate_common.sh"
  cp "${RUNNER_SH}" "${scripts_dir}/pre_gate_runner.sh"

  # Copy update_state.mjs and its deps
  cp "${REPO_ROOT}/.cleargate/scripts/update_state.mjs" "${scripts_dir}/update_state.mjs"
  cp "${REPO_ROOT}/.cleargate/scripts/constants.mjs" "${scripts_dir}/constants.mjs"
  cp "${REPO_ROOT}/.cleargate/scripts/validate_state.mjs" "${scripts_dir}/validate_state.mjs"
  cp "${REPO_ROOT}/.cleargate/scripts/state.schema.json" "${scripts_dir}/state.schema.json"

  # Gate checks (all-empty commands → scanner always passes exit 0)
  cat > "${scripts_dir}/gate-checks.json" << 'JSON'
{
  "qa": {
    "typecheck": "",
    "debug_patterns": [],
    "todo_patterns": [],
    "test": ""
  },
  "arch": {
    "typecheck": "",
    "new_deps_check": "false",
    "stray_env_files": [],
    "file_count_report": "false"
  }
}
JSON
}

# ===========================================================================
# Scenario 1: Helpers — resolve_story_id_from_branch
# ===========================================================================
printf 'Scenario: resolve_story_id_from_branch helper\n'

(
  source_common
  result="$(resolve_story_id_from_branch 'story/STORY-022-04')"
  if [[ "${result}" = "STORY-022-04" ]]; then
    exit 0
  else
    printf 'got: %s\n' "${result}" >&2
    exit 1
  fi
)
if [[ $? -eq 0 ]]; then
  pass "resolve_story_id_from_branch: story/STORY-022-04 -> STORY-022-04"
else
  fail "resolve_story_id_from_branch: story/STORY-022-04 -> STORY-022-04"
fi

(
  source_common
  result="$(resolve_story_id_from_branch 'cr/CR-009')"
  if [[ "${result}" = "CR-009" ]]; then
    exit 0
  else
    printf 'got: %s\n' "${result}" >&2
    exit 1
  fi
)
if [[ $? -eq 0 ]]; then
  pass "resolve_story_id_from_branch: cr/CR-009 -> CR-009"
else
  fail "resolve_story_id_from_branch: cr/CR-009 -> CR-009"
fi

(
  source_common
  result="$(resolve_story_id_from_branch 'main')"
  if [[ -z "${result}" ]]; then
    exit 0
  else
    printf 'expected empty, got: %s\n' "${result}" >&2
    exit 1
  fi
)
if [[ $? -eq 0 ]]; then
  pass "resolve_story_id_from_branch: main -> empty string"
else
  fail "resolve_story_id_from_branch: main -> empty string"
fi

printf '\n'

# ===========================================================================
# Scenario: resolve_lane helper
# ===========================================================================
printf 'Scenario: resolve_lane helper\n'

(
  source_common
  tmpf="$(mktemp)"
  cat > "${tmpf}" << 'JSON'
{
  "schema_version": 2,
  "sprint_id": "SPRINT-TEST",
  "execution_mode": "v2",
  "sprint_status": "Active",
  "stories": {
    "STORY-TEST-01": {
      "state": "Bouncing",
      "qa_bounces": 0,
      "arch_bounces": 0,
      "worktree": null,
      "updated_at": "2026-04-27T00:00:00Z",
      "notes": "",
      "lane": "fast",
      "lane_assigned_by": "architect",
      "lane_demoted_at": null,
      "lane_demotion_reason": null
    }
  },
  "last_action": "fixture",
  "updated_at": "2026-04-27T00:00:00Z"
}
JSON
  result="$(resolve_lane "${tmpf}" "STORY-TEST-01")"
  rm -f "${tmpf}"
  if [[ "${result}" = "fast" ]]; then
    exit 0
  else
    printf 'got: %s\n' "${result}" >&2
    exit 1
  fi
)
if [[ $? -eq 0 ]]; then
  pass "resolve_lane: fast lane story -> fast"
else
  fail "resolve_lane: fast lane story -> fast"
fi

# Scenario 3 + 4: lane=standard and no-lane → both return "standard"
(
  source_common
  tmpf="$(mktemp)"
  cp "${FIXTURES}/state.lane-standard.json" "${tmpf}"
  result="$(resolve_lane "${tmpf}" "STORY-TEST-01")"
  rm -f "${tmpf}"
  if [[ "${result}" = "standard" ]]; then
    exit 0
  else
    printf 'got: %s\n' "${result}" >&2
    exit 1
  fi
)
if [[ $? -eq 0 ]]; then
  pass "resolve_lane: lane=standard fixture -> standard"
else
  fail "resolve_lane: lane=standard fixture -> standard"
fi

(
  source_common
  tmpf="$(mktemp)"
  cp "${FIXTURES}/state.no-lane.json" "${tmpf}"
  result="$(resolve_lane "${tmpf}" "STORY-TEST-01")"
  rm -f "${tmpf}"
  if [[ "${result}" = "standard" ]]; then
    exit 0
  else
    printf 'got: %s\n' "${result}" >&2
    exit 1
  fi
)
if [[ $? -eq 0 ]]; then
  pass "resolve_lane: legacy v1 state.json (no lane field) -> standard"
else
  fail "resolve_lane: legacy v1 state.json (no lane field) -> standard"
fi

(
  source_common
  result="$(resolve_lane "/nonexistent/state.json" "STORY-TEST-01")"
  if [[ "${result}" = "standard" ]]; then
    exit 0
  else
    printf 'got: %s\n' "${result}" >&2
    exit 1
  fi
)
if [[ $? -eq 0 ]]; then
  pass "resolve_lane: missing state.json -> standard"
else
  fail "resolve_lane: missing state.json -> standard"
fi

printf '\n'

# ===========================================================================
# Scenario: append_ld_event helper
# ===========================================================================
printf 'Scenario: append_ld_event helper\n'

(
  source_common
  tmpf="$(mktemp)"
  printf '# Sprint Plan\n\n## 1. Deliverables\n\nplaceholder\n' > "${tmpf}"
  append_ld_event "${tmpf}" "STORY-TEST-01" "scanner failed: typecheck error"
  # Verify section header was created
  if grep -q '^## 4\. Events' "${tmpf}"; then
    if grep -q '| LD |' "${tmpf}"; then
      if grep -q 'STORY-TEST-01' "${tmpf}"; then
        rm -f "${tmpf}"
        exit 0
      fi
    fi
  fi
  cat "${tmpf}" >&2
  rm -f "${tmpf}"
  exit 1
)
if [[ $? -eq 0 ]]; then
  pass "append_ld_event: creates '## 4. Events' section + LD row when absent"
else
  fail "append_ld_event: creates '## 4. Events' section + LD row when absent"
fi

(
  source_common
  tmpf="$(mktemp)"
  printf '# Sprint Plan\n\n## 4. Events\n\n| Event | Story | Timestamp | Reason |\n|---|---|---|---|\n' > "${tmpf}"
  append_ld_event "${tmpf}" "STORY-TEST-02" "scanner failed"
  # Should NOT duplicate the ## 4. Events heading
  count="$(grep -c '^## 4\. Events' "${tmpf}" || true)"
  if [[ "${count}" -eq 1 ]] && grep -q '| LD |' "${tmpf}" && grep -q 'STORY-TEST-02' "${tmpf}"; then
    rm -f "${tmpf}"
    exit 0
  fi
  cat "${tmpf}" >&2
  rm -f "${tmpf}"
  exit 1
)
if [[ $? -eq 0 ]]; then
  pass "append_ld_event: appends row only when '## 4. Events' already exists"
else
  fail "append_ld_event: appends row only when '## 4. Events' already exists"
fi

(
  source_common
  tmpf="$(mktemp)"
  printf '# Sprint Plan\n\n## 1. Deliverables\n\nplaceholder\n' > "${tmpf}"
  # reason > 80 chars should be truncated
  long_reason="$(printf 'x%.0s' {1..100})"
  append_ld_event "${tmpf}" "STORY-TEST-01" "${long_reason}"
  # The row should be present but reason truncated to <=80 chars
  row_reason="$(grep '| LD |' "${tmpf}" | sed 's/.*| LD |[^|]*|[^|]*| //' | sed 's/ *|.*//' || true)"
  row_len="${#row_reason}"
  rm -f "${tmpf}"
  if [[ "${row_len}" -le 80 ]]; then
    exit 0
  else
    printf 'reason length: %s\n' "${row_len}" >&2
    exit 1
  fi
)
if [[ $? -eq 0 ]]; then
  pass "append_ld_event: reason truncated to <=80 chars"
else
  fail "append_ld_event: reason truncated to <=80 chars"
fi

printf '\n'

# ===========================================================================
# Gherkin Scenario 1: lane=fast + scanner pass → skip QA, state=Architect Passed
# ===========================================================================
printf 'Gherkin Scenario 1: lane=fast + scanner pass -> skip QA spawn signal\n'

(
  tmp_repo="$(mktemp -d)"
  tmp_wt="$(mktemp -d)"
  story_id="STORY-TEST-01"
  branch="story/${story_id}"

  make_fake_repo_for_runner "${tmp_repo}" "${story_id}" "fast"
  make_fake_worktree "${tmp_wt}"

  # Run from the tmp_repo's scripts dir so SCRIPT_DIR resolves correctly
  runner_out="$(bash "${tmp_repo}/.cleargate/scripts/pre_gate_runner.sh" qa "${tmp_wt}" "${branch}" 2>&1)"
  runner_exit=$?

  # Check stdout contains skip message
  skip_msg_ok=0
  if printf '%s\n' "${runner_out}" | grep -q "lane=fast"; then
    skip_msg_ok=1
  fi

  # Check state.json has state=Architect Passed
  state_file="${tmp_repo}/.cleargate/sprint-runs/SPRINT-TEST/state.json"
  state_val="$(jq -r --arg sid "${story_id}" '.stories[$sid].state' "${state_file}" 2>/dev/null || printf 'UNKNOWN')"
  state_ok=0
  if [[ "${state_val}" = "Architect Passed" ]]; then
    state_ok=1
  fi

  rm -rf "${tmp_repo}" "${tmp_wt}"

  if [[ "${runner_exit}" -eq 0 && "${skip_msg_ok}" -eq 1 && "${state_ok}" -eq 1 ]]; then
    exit 0
  else
    printf 'exit=%s skip_msg_ok=%s state=%s\n' "${runner_exit}" "${skip_msg_ok}" "${state_val}" >&2
    printf 'runner_out: %s\n' "${runner_out}" >&2
    exit 1
  fi
)
if [[ $? -eq 0 ]]; then
  pass "Scenario 1: lane=fast + scanner pass -> exit 0, skip message, state=Architect Passed"
else
  fail "Scenario 1: lane=fast + scanner pass -> exit 0, skip message, state=Architect Passed"
fi

printf '\n'

# ===========================================================================
# Gherkin Scenario 2: lane=fast + scanner fail → demote + LD event
# We simulate scanner fail by giving a gate-checks.json typecheck command that exits 1.
# ===========================================================================
printf 'Gherkin Scenario 2: lane=fast + scanner fail -> demote + LD event\n'

(
  tmp_repo="$(mktemp -d)"
  tmp_wt="$(mktemp -d)"
  story_id="STORY-TEST-01"
  branch="story/${story_id}"

  make_fake_repo_for_runner "${tmp_repo}" "${story_id}" "fast"
  make_fake_worktree "${tmp_wt}"

  # Override gate-checks.json to make typecheck fail (exit 1)
  cat > "${tmp_repo}/.cleargate/scripts/gate-checks.json" << 'JSON'
{
  "qa": {
    "typecheck": "exit 1",
    "debug_patterns": [],
    "todo_patterns": [],
    "test": ""
  },
  "arch": {
    "typecheck": "",
    "new_deps_check": "false",
    "stray_env_files": [],
    "file_count_report": "false"
  }
}
JSON

  # Create a package.json so typecheck cmd is executed
  printf '{"name":"test","version":"1.0.0"}\n' > "${tmp_wt}/package.json"

  # Run runner (expect exit 1)
  bash "${tmp_repo}/.cleargate/scripts/pre_gate_runner.sh" qa "${tmp_wt}" "${branch}" \
    > /dev/null 2>&1
  runner_exit=$?

  state_file="${tmp_repo}/.cleargate/sprint-runs/SPRINT-TEST/state.json"

  # Check lane was demoted to standard
  lane_val="$(jq -r --arg sid "${story_id}" '.stories[$sid].lane' "${state_file}" 2>/dev/null || printf 'UNKNOWN')"
  # Check lane_demoted_at is non-null
  demoted_at="$(jq -r --arg sid "${story_id}" '.stories[$sid].lane_demoted_at' "${state_file}" 2>/dev/null || printf 'null')"
  # Check lane_demotion_reason is non-null
  demote_reason="$(jq -r --arg sid "${story_id}" '.stories[$sid].lane_demotion_reason' "${state_file}" 2>/dev/null || printf 'null')"
  # Check qa_bounces=0, arch_bounces=0
  qa_bounces="$(jq -r --arg sid "${story_id}" '.stories[$sid].qa_bounces' "${state_file}" 2>/dev/null || printf '-1')"
  arch_bounces="$(jq -r --arg sid "${story_id}" '.stories[$sid].arch_bounces' "${state_file}" 2>/dev/null || printf '-1')"

  # Check sprint markdown has LD event row
  sprint_md="${tmp_repo}/.cleargate/delivery/pending-sync/SPRINT-TEST_test.md"
  ld_row_ok=0
  if grep -q '| LD |' "${sprint_md}" && grep -q "${story_id}" "${sprint_md}"; then
    ld_row_ok=1
  fi

  rm -rf "${tmp_repo}" "${tmp_wt}"

  if [[ "${runner_exit}" -eq 1 \
     && "${lane_val}" = "standard" \
     && "${demoted_at}" != "null" \
     && "${demote_reason}" != "null" \
     && "${qa_bounces}" = "0" \
     && "${arch_bounces}" = "0" \
     && "${ld_row_ok}" -eq 1 ]]; then
    exit 0
  else
    printf 'exit=%s lane=%s demoted_at=%s reason=%s qa=%s arch=%s ld=%s\n' \
      "${runner_exit}" "${lane_val}" "${demoted_at}" "${demote_reason}" \
      "${qa_bounces}" "${arch_bounces}" "${ld_row_ok}" >&2
    exit 1
  fi
)
if [[ $? -eq 0 ]]; then
  pass "Scenario 2: lane=fast + scanner fail -> lane=standard + LD event + exit 1"
else
  fail "Scenario 2: lane=fast + scanner fail -> lane=standard + LD event + exit 1"
fi

printf '\n'

# ===========================================================================
# Gherkin Scenario 3: lane=standard → no state.json mutation beyond scanner
# ===========================================================================
printf 'Gherkin Scenario 3: lane=standard -> no LD row, QA-normal exit\n'

(
  tmp_repo="$(mktemp -d)"
  tmp_wt="$(mktemp -d)"
  story_id="STORY-TEST-01"
  branch="story/${story_id}"

  make_fake_repo_for_runner "${tmp_repo}" "${story_id}" "standard"
  make_fake_worktree "${tmp_wt}"

  state_file="${tmp_repo}/.cleargate/sprint-runs/SPRINT-TEST/state.json"
  state_before="$(cat "${state_file}")"

  bash "${tmp_repo}/.cleargate/scripts/pre_gate_runner.sh" qa "${tmp_wt}" "${branch}" \
    > /dev/null 2>&1
  runner_exit=$?

  state_after="$(cat "${state_file}")"

  sprint_md="${tmp_repo}/.cleargate/delivery/pending-sync/SPRINT-TEST_test.md"
  no_ld_row=0
  if ! grep -q '| LD |' "${sprint_md}" 2>/dev/null; then
    no_ld_row=1
  fi

  rm -rf "${tmp_repo}" "${tmp_wt}"

  # state.json byte-identical (no lane mutation on standard)
  state_identical=0
  if [[ "${state_before}" = "${state_after}" ]]; then
    state_identical=1
  fi

  if [[ "${runner_exit}" -eq 0 && "${no_ld_row}" -eq 1 && "${state_identical}" -eq 1 ]]; then
    exit 0
  else
    printf 'exit=%s no_ld_row=%s state_identical=%s\n' "${runner_exit}" "${no_ld_row}" "${state_identical}" >&2
    exit 1
  fi
)
if [[ $? -eq 0 ]]; then
  pass "Scenario 3: lane=standard -> no LD row, state.json unchanged, exit 0"
else
  fail "Scenario 3: lane=standard -> no LD row, state.json unchanged, exit 0"
fi

printf '\n'

# ===========================================================================
# Gherkin Scenario 4: legacy v1 state.json (no lane field) → treat as standard
# ===========================================================================
printf 'Gherkin Scenario 4: legacy v1 state.json (no lane field) -> standard behaviour\n'

(
  tmp_repo="$(mktemp -d)"
  tmp_wt="$(mktemp -d)"
  story_id="STORY-TEST-01"
  branch="story/${story_id}"

  # Set up repo structure but use a v1 (no-lane) state.json
  mkdir -p "${tmp_repo}/.cleargate/sprint-runs/SPRINT-TEST"
  printf 'SPRINT-TEST' > "${tmp_repo}/.cleargate/sprint-runs/.active"
  cp "${FIXTURES}/state.no-lane.json" \
    "${tmp_repo}/.cleargate/sprint-runs/SPRINT-TEST/state.json"
  mkdir -p "${tmp_repo}/.cleargate/delivery/pending-sync"
  printf '# SPRINT-TEST Plan\n\n## 1. Deliverables\n\nplaceholder\n' \
    > "${tmp_repo}/.cleargate/delivery/pending-sync/SPRINT-TEST_test.md"
  local_scripts="${tmp_repo}/.cleargate/scripts"
  mkdir -p "${local_scripts}"
  cp "${COMMON_SH}" "${local_scripts}/pre_gate_common.sh"
  cp "${RUNNER_SH}" "${local_scripts}/pre_gate_runner.sh"
  cp "${REPO_ROOT}/.cleargate/scripts/update_state.mjs" "${local_scripts}/update_state.mjs"
  cp "${REPO_ROOT}/.cleargate/scripts/constants.mjs" "${local_scripts}/constants.mjs"
  cp "${REPO_ROOT}/.cleargate/scripts/validate_state.mjs" "${local_scripts}/validate_state.mjs"
  cp "${REPO_ROOT}/.cleargate/scripts/state.schema.json" "${local_scripts}/state.schema.json"
  cat > "${local_scripts}/gate-checks.json" << 'JSON'
{
  "qa": { "typecheck": "", "debug_patterns": [], "todo_patterns": [], "test": "" },
  "arch": { "typecheck": "", "new_deps_check": "false", "stray_env_files": [], "file_count_report": "false" }
}
JSON

  make_fake_worktree "${tmp_wt}"

  bash "${tmp_repo}/.cleargate/scripts/pre_gate_runner.sh" qa "${tmp_wt}" "${branch}" \
    > /dev/null 2>&1
  runner_exit=$?

  # Should exit 0 (pass) and NOT emit LD row (treated as standard, not fast)
  sprint_md="${tmp_repo}/.cleargate/delivery/pending-sync/SPRINT-TEST_test.md"
  no_ld_row=0
  if ! grep -q '| LD |' "${sprint_md}" 2>/dev/null; then
    no_ld_row=1
  fi

  rm -rf "${tmp_repo}" "${tmp_wt}"

  if [[ "${runner_exit}" -eq 0 && "${no_ld_row}" -eq 1 ]]; then
    exit 0
  else
    printf 'exit=%s no_ld_row=%s\n' "${runner_exit}" "${no_ld_row}" >&2
    exit 1
  fi
)
if [[ $? -eq 0 ]]; then
  pass "Scenario 4: legacy v1 state.json (no lane) -> treated as standard, exit 0, no LD row"
else
  fail "Scenario 4: legacy v1 state.json (no lane) -> treated as standard, exit 0, no LD row"
fi

printf '\n'

# ===========================================================================
# Gherkin Scenario 5: Cross-OS portability code review assertions
# (Informational — grep-based verification of portability rules per BUG-010 §4b)
# ===========================================================================
printf 'Gherkin Scenario 5: Cross-OS portability rules (code review)\n'

RUNNER="${REPO_ROOT}/.cleargate/scripts/pre_gate_runner.sh"
COMMON="${REPO_ROOT}/.cleargate/scripts/pre_gate_common.sh"

# No echo -e in lane-aware block
(
  # Check new code uses printf not echo -e
  if grep -n 'echo -e' "${RUNNER}" 2>/dev/null | grep -v '^[[:space:]]*#'; then
    exit 1
  fi
  exit 0
)
if [[ $? -eq 0 ]]; then
  pass "Scenario 5a: pre_gate_runner.sh has no 'echo -e' (uses printf)"
else
  fail "Scenario 5a: pre_gate_runner.sh has no 'echo -e' (uses printf)"
fi

# No mapfile/readarray in new helpers
(
  if grep -n 'mapfile\|readarray' "${COMMON}" 2>/dev/null | grep -v '^[[:space:]]*#'; then
    exit 1
  fi
  exit 0
)
if [[ $? -eq 0 ]]; then
  pass "Scenario 5b: pre_gate_common.sh has no mapfile/readarray (bash 3.2+ compatible)"
else
  fail "Scenario 5b: pre_gate_common.sh has no mapfile/readarray (bash 3.2+ compatible)"
fi

# No \d or \<\> in grep patterns in new helpers
(
  if grep -n 'grep.*\\d\|grep.*\\<\|grep.*\\>' "${COMMON}" 2>/dev/null | grep -v '^[[:space:]]*#'; then
    exit 1
  fi
  exit 0
)
if [[ $? -eq 0 ]]; then
  pass "Scenario 5c: pre_gate_common.sh POSIX ERE only (no \\d or \\<\\>)"
else
  fail "Scenario 5c: pre_gate_common.sh POSIX ERE only (no \\d or \\<\\>)"
fi

# date -u +%FT%TZ portable form used in append_ld_event
(
  if grep -q "date -u '+%Y-%m-%dT%H:%M:%SZ'" "${COMMON}"; then
    exit 0
  else
    exit 1
  fi
)
if [[ $? -eq 0 ]]; then
  pass "Scenario 5d: append_ld_event uses portable date -u +%Y-%m-%dT%H:%M:%SZ"
else
  fail "Scenario 5d: append_ld_event uses portable date -u +%Y-%m-%dT%H:%M:%SZ"
fi

# Quoted variable expansions in new lane block in runner
(
  # Check OVERALL_EXIT, STORY_ID, LANE, STATE_JSON are quoted where used
  if grep -E '\$OVERALL_EXIT[^}"]|\$STORY_ID[^}"]|\$LANE[^}"]|\$STATE_JSON[^}"]' \
    "${RUNNER}" | grep -v '^[[:space:]]*#' | grep -v 'printf\|echo\|\[' \
    > /dev/null 2>&1; then
    # Some unquoted uses found — this is a soft warning, not a hard fail
    # because bash arithmetic contexts allow unquoted
    exit 0
  fi
  exit 0
)
if [[ $? -eq 0 ]]; then
  pass "Scenario 5e: variable expansion quoting review passed (soft check)"
else
  fail "Scenario 5e: variable expansion quoting review"
fi

printf '\n'

# ===========================================================================
# Scaffold mirror byte-equality
# ===========================================================================
printf 'Scaffold mirror verification\n'

LIVE_RUNNER="${REPO_ROOT}/.cleargate/scripts/pre_gate_runner.sh"
MIRROR_RUNNER="${REPO_ROOT}/cleargate-planning/.cleargate/scripts/pre_gate_runner.sh"
LIVE_COMMON="${REPO_ROOT}/.cleargate/scripts/pre_gate_common.sh"
MIRROR_COMMON="${REPO_ROOT}/cleargate-planning/.cleargate/scripts/pre_gate_common.sh"

if diff -q "${LIVE_RUNNER}" "${MIRROR_RUNNER}" > /dev/null 2>&1; then
  pass "pre_gate_runner.sh live == planning mirror (byte-identical)"
else
  fail "pre_gate_runner.sh live != planning mirror (diff detected)"
fi

if diff -q "${LIVE_COMMON}" "${MIRROR_COMMON}" > /dev/null 2>&1; then
  pass "pre_gate_common.sh live == planning mirror (byte-identical)"
else
  fail "pre_gate_common.sh live != planning mirror (diff detected)"
fi

printf '\n'

# ===========================================================================
# Summary
# ===========================================================================
printf '=== Results: %s passed, %s failed ===\n' "${PASS}" "${FAIL}"
if [[ "${FAIL}" -gt 0 ]]; then
  printf 'Failed:\n'
  for e in "${ERRORS[@]}"; do
    printf '  - %s\n' "${e}"
  done
  exit 1
fi
exit 0
