#!/usr/bin/env bash
# test_prep_qa_context.sh
# Tests for prep_qa_context.mjs — 6 Gherkin scenarios:
#   1. Happy path — all sections present, size ≤20KB, schema_version:1
#   2. Missing story file — degrades to one-liner, exit 0
#   3. Missing baseline cache — baseline_unavailable:true, exit 0
#   4. Bundle size cap warning — oversized fixture warns stderr, still writes
#   5. Legacy STATUS=done — format:legacy in JSON, SCHEMA_INCOMPLETE in prose
#   6. Usage error — no args → exit 2, stderr contains "Usage:"
#
# Fixtures use mktemp -d. CLEARGATE_SPRINT_DIR + CLEARGATE_PENDING_SYNC_DIR
# env overrides for test isolation (FLASHCARD 2026-04-21 #test-harness #scripts #env).
# macOS bash 3.2 portable: no mapfile/readarray (FLASHCARD 2026-04-21 #bash #macos #portability).
# Exit 0 = all pass; exit 1 = one or more failures.
set -uo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
SCRIPTS_DIR="${REPO_ROOT}/.cleargate/scripts"
PREP_SCRIPT="${SCRIPTS_DIR}/prep_qa_context.mjs"

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

make_tmpdir() {
  mktemp -d
}

# ── Fixture helpers ────────────────────────────────────────────────────────────

# Write a minimal valid state.json with one Active story
write_state_json() {
  local dir="$1"
  local story_id="${2:-STORY-AAA-01}"
  local story_state="${3:-Bouncing}"
  local lane="${4:-standard}"
  cat > "${dir}/state.json" << EOF
{
  "schema_version": 2,
  "sprint_id": "SPRINT-fixture",
  "execution_mode": "v2",
  "sprint_status": "Active",
  "stories": {
    "${story_id}": {
      "state": "${story_state}",
      "qa_bounces": 0,
      "arch_bounces": 0,
      "worktree": null,
      "updated_at": "2026-05-01T00:00:00Z",
      "notes": "",
      "lane": "${lane}",
      "lane_assigned_by": "test",
      "lane_demoted_at": null,
      "lane_demotion_reason": null
    }
  },
  "last_action": "test setup",
  "updated_at": "2026-05-01T00:00:00Z"
}
EOF
}

# Write a minimal milestone plan
write_milestone_plan() {
  local dir="$1"
  local story_id="${2:-STORY-AAA-01}"
  mkdir -p "${dir}/plans"
  cat > "${dir}/plans/M1.md" << EOF
# Milestone M1 — test fixture

### ${story_id} — test story

- This is a test blueprint.
- Some content here.

## Another Section
EOF
}

# Write a minimal story file in the pendingsync dir
write_story_file() {
  local dir="$1"
  local story_id="${2:-STORY-AAA-01}"
  cat > "${dir}/${story_id}_Test_Story.md" << EOF
---
story_id: ${story_id}
status: Approved
---

# ${story_id}: Test Story

## Gherkin

Given a test fixture
When the script runs
Then it should pass
EOF
}

# Write a .baseline-failures.json file
write_baseline_failures() {
  local dir="$1"
  cat > "${dir}/.baseline-failures.json" << 'EOF'
[
  {"file": "cleargate-cli/test/sprint.test.ts", "count": 1}
]
EOF
}

# Create a fake git worktree in tmpdir
# Sets up .git as a file pointing to a real git repo for git -C to work
setup_fake_worktree() {
  local worktree_dir="$1"
  local story_id="${2:-STORY-AAA-01}"

  # Use the real repo but pretend we're checking the story branch
  # The worktree dir has a .git file (linked worktree style)
  # For simplicity, we just create a real git repo with one commit

  local git_dir="${worktree_dir}/.git_fake_$$"
  mkdir -p "${git_dir}"
  git -C "${worktree_dir}" init --quiet 2>/dev/null || true
  git -C "${worktree_dir}" config user.email "test@test.com" 2>/dev/null || true
  git -C "${worktree_dir}" config user.name "Test" 2>/dev/null || true

  # Create a dummy file and commit
  echo "test" > "${worktree_dir}/test-fixture.txt"
  git -C "${worktree_dir}" add test-fixture.txt 2>/dev/null || true
  git -C "${worktree_dir}" commit --quiet -m "test(fixture): initial commit

STATUS: done
COMMIT: abc1234
TYPECHECK: pass
TESTS: 3 passed, 0 failed
FILES_CHANGED: test-fixture.txt
NOTES: test fixture commit" 2>/dev/null || true

  # Create a 'main' branch alias (local ref) so diff --name-only main..HEAD works
  git -C "${worktree_dir}" branch -f main HEAD 2>/dev/null || true
}

# Create worktree with a legacy STATUS=done commit
setup_legacy_status_worktree() {
  local worktree_dir="$1"

  git -C "${worktree_dir}" init --quiet 2>/dev/null || true
  git -C "${worktree_dir}" config user.email "test@test.com" 2>/dev/null || true
  git -C "${worktree_dir}" config user.name "Test" 2>/dev/null || true

  echo "test" > "${worktree_dir}/test-file.txt"
  git -C "${worktree_dir}" add test-file.txt 2>/dev/null || true
  git -C "${worktree_dir}" commit --quiet -m "feat(test): legacy commit

STATUS: done
COMMIT: def5678
TYPECHECK: pass
TESTS: 2 passed, 0 failed
FILES_CHANGED: test-file.txt
NOTES: legacy format without r_coverage or plan_deviations" 2>/dev/null || true

  git -C "${worktree_dir}" branch -f main HEAD 2>/dev/null || true
}

# ─── Scenario 1: Happy path ───────────────────────────────────────────────────

run_scenario_1() {
  local tmpdir pendingsync_dir worktree_dir output_path
  tmpdir="$(make_tmpdir)"
  pendingsync_dir="$(make_tmpdir)"
  worktree_dir="$(make_tmpdir)"

  write_state_json "${tmpdir}" "STORY-AAA-01" "Bouncing" "standard"
  write_milestone_plan "${tmpdir}" "STORY-AAA-01"
  write_story_file "${pendingsync_dir}" "STORY-AAA-01"
  write_baseline_failures "${tmpdir}"
  setup_fake_worktree "${worktree_dir}" "STORY-AAA-01"

  output_path="${tmpdir}/.qa-context-STORY-AAA-01.md"

  local exit_code stderr_out
  stderr_out=$(CLEARGATE_SPRINT_DIR="${tmpdir}" CLEARGATE_PENDING_SYNC_DIR="${pendingsync_dir}" \
    node "${PREP_SCRIPT}" STORY-AAA-01 "${worktree_dir}" --output "${output_path}" 2>&1 >/dev/null)
  exit_code=$?

  if [ "${exit_code}" -ne 0 ]; then
    fail "Scenario 1: happy path — expected exit 0, got ${exit_code}" "${stderr_out}"
    rm -rf "${tmpdir}" "${pendingsync_dir}" "${worktree_dir}"; return
  fi

  if [ ! -f "${output_path}" ]; then
    fail "Scenario 1: happy path — output file not written at ${output_path}" "file missing"
    rm -rf "${tmpdir}" "${pendingsync_dir}" "${worktree_dir}"; return
  fi

  # Check size ≤20KB (20480 bytes)
  local bundle_size
  bundle_size=$(wc -c < "${output_path}" | tr -d ' ')
  if [ "${bundle_size}" -gt 20480 ]; then
    fail "Scenario 1: happy path — bundle size ${bundle_size} bytes exceeds 20KB" "too large"
    rm -rf "${tmpdir}" "${pendingsync_dir}" "${worktree_dir}"; return
  fi

  # Check all 8 section headers
  local section
  for section in "Worktree + Commit" "Spec Sources" "Baseline" "Adjacent Files" "Cross-Story Map" "Flashcard Slice" "Lane" "Dev Handoff"; do
    if ! grep -qF "${section}" "${output_path}"; then
      fail "Scenario 1: happy path — missing section '${section}' in bundle" "$(head -30 "${output_path}")"
      rm -rf "${tmpdir}" "${pendingsync_dir}" "${worktree_dir}"; return
    fi
  done

  # Check JSON block parses to schema_version: 1
  local schema_version
  schema_version=$(node -e "
const fs = require('fs');
const content = fs.readFileSync('${output_path}', 'utf8');
const m = content.match(/\`\`\`json\\n([\\s\\S]*?)\\n\`\`\`/);
if (!m) { process.stdout.write('NO_JSON\\n'); process.exit(0); }
const obj = JSON.parse(m[1]);
process.stdout.write(String(obj.schema_version) + '\\n');
" 2>/dev/null)

  if [ "${schema_version}" != "1" ]; then
    fail "Scenario 1: happy path — expected schema_version 1, got '${schema_version}'" "json parse issue"
    rm -rf "${tmpdir}" "${pendingsync_dir}" "${worktree_dir}"; return
  fi

  pass "Scenario 1: prep_qa_context happy path — all 8 sections, ≤20KB, schema_version:1"
  rm -rf "${tmpdir}" "${pendingsync_dir}" "${worktree_dir}"
}

# ─── Scenario 2: Missing story file → one-liner ───────────────────────────────

run_scenario_2() {
  local tmpdir pendingsync_dir worktree_dir output_path
  tmpdir="$(make_tmpdir)"
  pendingsync_dir="$(make_tmpdir)"
  worktree_dir="$(make_tmpdir)"

  write_state_json "${tmpdir}" "STORY-AAA-01" "Bouncing" "standard"
  write_milestone_plan "${tmpdir}" "STORY-AAA-01"
  # Deliberately NO story file in pendingsync_dir
  write_baseline_failures "${tmpdir}"
  setup_fake_worktree "${worktree_dir}" "STORY-AAA-01"

  output_path="${tmpdir}/.qa-context-STORY-AAA-01.md"

  local exit_code
  CLEARGATE_SPRINT_DIR="${tmpdir}" CLEARGATE_PENDING_SYNC_DIR="${pendingsync_dir}" \
    node "${PREP_SCRIPT}" STORY-AAA-01 "${worktree_dir}" --output "${output_path}" >/dev/null 2>&1
  exit_code=$?

  if [ "${exit_code}" -ne 0 ]; then
    fail "Scenario 2: missing story — expected exit 0, got ${exit_code}" "exit code mismatch"
    rm -rf "${tmpdir}" "${pendingsync_dir}" "${worktree_dir}"; return
  fi

  if [ ! -f "${output_path}" ]; then
    fail "Scenario 2: missing story — output file not written" "file missing"
    rm -rf "${tmpdir}" "${pendingsync_dir}" "${worktree_dir}"; return
  fi

  # Spec Sources section must contain the story-not-found one-liner
  if ! grep -qF "Story file not found" "${output_path}"; then
    fail "Scenario 2: missing story — expected 'Story file not found' one-liner in Spec Sources" \
      "$(grep -A5 'Spec Sources' "${output_path}" | head -10)"
    rm -rf "${tmpdir}" "${pendingsync_dir}" "${worktree_dir}"; return
  fi

  # Other sections still present (not impacted)
  if ! grep -qF "## Baseline" "${output_path}"; then
    fail "Scenario 2: missing story — Baseline section missing (other sections impacted)" "missing section"
    rm -rf "${tmpdir}" "${pendingsync_dir}" "${worktree_dir}"; return
  fi

  pass "Scenario 2: missing story file degrades to one-liner, other sections unaffected"
  rm -rf "${tmpdir}" "${pendingsync_dir}" "${worktree_dir}"
}

# ─── Scenario 3: Missing baseline cache → baseline_unavailable:true ──────────

run_scenario_3() {
  local tmpdir pendingsync_dir worktree_dir output_path
  tmpdir="$(make_tmpdir)"
  pendingsync_dir="$(make_tmpdir)"
  worktree_dir="$(make_tmpdir)"

  write_state_json "${tmpdir}" "STORY-AAA-01" "Bouncing" "standard"
  write_milestone_plan "${tmpdir}" "STORY-AAA-01"
  write_story_file "${pendingsync_dir}" "STORY-AAA-01"
  # Deliberately NO .baseline-failures.json
  setup_fake_worktree "${worktree_dir}" "STORY-AAA-01"

  output_path="${tmpdir}/.qa-context-STORY-AAA-01.md"

  local exit_code
  CLEARGATE_SPRINT_DIR="${tmpdir}" CLEARGATE_PENDING_SYNC_DIR="${pendingsync_dir}" \
    node "${PREP_SCRIPT}" STORY-AAA-01 "${worktree_dir}" --output "${output_path}" >/dev/null 2>&1
  exit_code=$?

  if [ "${exit_code}" -ne 0 ]; then
    fail "Scenario 3: missing baseline — expected exit 0, got ${exit_code}" "exit code mismatch"
    rm -rf "${tmpdir}" "${pendingsync_dir}" "${worktree_dir}"; return
  fi

  # Check JSON baseline_unavailable === true
  local baseline_unavailable
  baseline_unavailable=$(node -e "
const fs = require('fs');
const content = fs.readFileSync('${output_path}', 'utf8');
const m = content.match(/\`\`\`json\\n([\\s\\S]*?)\\n\`\`\`/);
if (!m) { process.stdout.write('NO_JSON\\n'); process.exit(0); }
const obj = JSON.parse(m[1]);
process.stdout.write(String(obj.baseline.baseline_unavailable) + '\\n');
" 2>/dev/null)

  if [ "${baseline_unavailable}" != "true" ]; then
    fail "Scenario 3: missing baseline — expected baseline_unavailable=true, got '${baseline_unavailable}'" "json check"
    rm -rf "${tmpdir}" "${pendingsync_dir}" "${worktree_dir}"; return
  fi

  # Prose should contain recompute one-liner
  if ! grep -q "cleargate gate test" "${output_path}"; then
    fail "Scenario 3: missing baseline — expected recompute one-liner in Baseline section" \
      "$(grep -A5 '## Baseline' "${output_path}" | head -10)"
    rm -rf "${tmpdir}" "${pendingsync_dir}" "${worktree_dir}"; return
  fi

  pass "Scenario 3: missing baseline cache → baseline_unavailable:true, recompute one-liner present"
  rm -rf "${tmpdir}" "${pendingsync_dir}" "${worktree_dir}"
}

# ─── Scenario 4: Bundle size cap warning ─────────────────────────────────────

run_scenario_4() {
  local tmpdir pendingsync_dir worktree_dir output_path
  tmpdir="$(make_tmpdir)"
  pendingsync_dir="$(make_tmpdir)"
  worktree_dir="$(make_tmpdir)"

  write_state_json "${tmpdir}" "STORY-AAA-01" "Bouncing" "standard"
  write_milestone_plan "${tmpdir}" "STORY-AAA-01"
  write_story_file "${pendingsync_dir}" "STORY-AAA-01"

  # Create an oversized fixture: write a very large baseline-failures.json
  # with 500+ entries to bloat the JSON block past 20KB
  local big_json="${tmpdir}/.baseline-failures.json"
  printf '[' > "${big_json}"
  local i=0
  while [ $i -lt 400 ]; do
    if [ $i -gt 0 ]; then printf ',' >> "${big_json}"; fi
    printf '{"file":"cleargate-cli/test/very/long/path/to/some/test/file/number_%d_with_extra_padding_so_it_is_bigger/test.spec.ts","count":%d}' $i $i >> "${big_json}"
    i=$((i + 1))
  done
  printf ']' >> "${big_json}"

  setup_fake_worktree "${worktree_dir}" "STORY-AAA-01"

  output_path="${tmpdir}/.qa-context-STORY-AAA-01.md"

  local exit_code stderr_out
  stderr_out=$(CLEARGATE_SPRINT_DIR="${tmpdir}" CLEARGATE_PENDING_SYNC_DIR="${pendingsync_dir}" \
    node "${PREP_SCRIPT}" STORY-AAA-01 "${worktree_dir}" --output "${output_path}" 2>&1 >/dev/null)
  exit_code=$?

  # Must still exit 0 (R4: write anyway)
  if [ "${exit_code}" -ne 0 ]; then
    fail "Scenario 4: size cap — expected exit 0 even when oversized, got ${exit_code}" "${stderr_out}"
    rm -rf "${tmpdir}" "${pendingsync_dir}" "${worktree_dir}"; return
  fi

  # Bundle must still be written
  if [ ! -f "${output_path}" ]; then
    fail "Scenario 4: size cap — bundle not written even when oversized" "file missing"
    rm -rf "${tmpdir}" "${pendingsync_dir}" "${worktree_dir}"; return
  fi

  # Stderr must contain warning about exceeding 20KB
  if ! echo "${stderr_out}" | grep -qi "exceeds 20KB"; then
    fail "Scenario 4: size cap — expected stderr warning about 20KB target" "stderr: ${stderr_out}"
    rm -rf "${tmpdir}" "${pendingsync_dir}" "${worktree_dir}"; return
  fi

  pass "Scenario 4: oversized fixture → exit 0, bundle written, stderr warns about 20KB"
  rm -rf "${tmpdir}" "${pendingsync_dir}" "${worktree_dir}"
}

# ─── Scenario 5: Legacy STATUS=done → format:legacy ──────────────────────────

run_scenario_5() {
  local tmpdir pendingsync_dir worktree_dir output_path
  tmpdir="$(make_tmpdir)"
  pendingsync_dir="$(make_tmpdir)"
  worktree_dir="$(make_tmpdir)"

  write_state_json "${tmpdir}" "STORY-AAA-01" "Bouncing" "standard"
  write_milestone_plan "${tmpdir}" "STORY-AAA-01"
  write_story_file "${pendingsync_dir}" "STORY-AAA-01"
  setup_legacy_status_worktree "${worktree_dir}"

  output_path="${tmpdir}/.qa-context-STORY-AAA-01.md"

  local exit_code
  CLEARGATE_SPRINT_DIR="${tmpdir}" CLEARGATE_PENDING_SYNC_DIR="${pendingsync_dir}" \
    node "${PREP_SCRIPT}" STORY-AAA-01 "${worktree_dir}" --output "${output_path}" >/dev/null 2>&1
  exit_code=$?

  if [ "${exit_code}" -ne 0 ]; then
    fail "Scenario 5: legacy handoff — expected exit 0, got ${exit_code}" "exit code mismatch"
    rm -rf "${tmpdir}" "${pendingsync_dir}" "${worktree_dir}"; return
  fi

  # Check JSON dev_handoff.format === "legacy"
  local handoff_format
  handoff_format=$(node -e "
const fs = require('fs');
const content = fs.readFileSync('${output_path}', 'utf8');
const m = content.match(/\`\`\`json\\n([\\s\\S]*?)\\n\`\`\`/);
if (!m) { process.stdout.write('NO_JSON\\n'); process.exit(0); }
const obj = JSON.parse(m[1]);
process.stdout.write(String(obj.dev_handoff.format) + '\\n');
" 2>/dev/null)

  if [ "${handoff_format}" != "legacy" ]; then
    fail "Scenario 5: legacy handoff — expected dev_handoff.format=legacy, got '${handoff_format}'" "json check"
    rm -rf "${tmpdir}" "${pendingsync_dir}" "${worktree_dir}"; return
  fi

  # Prose must contain SCHEMA_INCOMPLETE warning
  if ! grep -qF "SCHEMA_INCOMPLETE" "${output_path}"; then
    fail "Scenario 5: legacy handoff — expected SCHEMA_INCOMPLETE in Dev Handoff section" \
      "$(grep -A5 '## Dev Handoff' "${output_path}" | head -10)"
    rm -rf "${tmpdir}" "${pendingsync_dir}" "${worktree_dir}"; return
  fi

  pass "Scenario 5: legacy STATUS=done → format:legacy in JSON, SCHEMA_INCOMPLETE in prose"
  rm -rf "${tmpdir}" "${pendingsync_dir}" "${worktree_dir}"
}

# ─── Scenario 6: Usage error — no args ────────────────────────────────────────

run_scenario_6() {
  local exit_code stderr_out

  stderr_out=$(node "${PREP_SCRIPT}" 2>&1 >/dev/null)
  exit_code=$?

  if [ "${exit_code}" -ne 2 ]; then
    fail "Scenario 6: usage error — expected exit 2, got ${exit_code}" "exit code mismatch"
    return
  fi

  if ! echo "${stderr_out}" | grep -qi "Usage:"; then
    fail "Scenario 6: usage error — stderr must contain 'Usage:'" "stderr: ${stderr_out}"
    return
  fi

  pass "Scenario 6: no args → exit 2, stderr contains 'Usage:'"
}

# ─── Run all scenarios ────────────────────────────────────────────────────────

run_scenario_1
run_scenario_2
run_scenario_3
run_scenario_4
run_scenario_5
run_scenario_6

echo ""
echo "Results: ${PASS} passed, ${FAIL} failed"
[ "${FAIL}" -eq 0 ] && exit 0 || exit 1
