#!/usr/bin/env bash
# test_report_body_stdin.sh — STORY-014-10 acceptance
# 4 scenarios: valid pipe, empty stdin, pre-existing REPORT.md, primary path preservation.

set -uo pipefail

REPO_ROOT="${CLEARGATE_REPO_ROOT:-$(cd "$(dirname "$0")/../../.." && pwd)}"
CLOSE_SCRIPT="${REPO_ROOT}/.cleargate/scripts/close_sprint.mjs"
REPORTER_MD="${REPO_ROOT}/.claude/agents/reporter.md"
REPORTER_SCAFFOLD="${REPO_ROOT}/cleargate-planning/.claude/agents/reporter.md"

fail=0
pass=0
check() {
  local name="$1"; shift
  if "$@" >/dev/null 2>&1; then
    printf '  ✅ %s\n' "$name"
    pass=$((pass + 1))
  else
    printf '  ❌ %s\n' "$name"
    fail=$((fail + 1))
  fi
}

# Build a synthetic sprint dir fixture via CLEARGATE_SPRINT_DIR env.
setup_fixture() {
  local dir
  dir=$(mktemp -d -t cleargate-s10-XXXXX)
  cat > "${dir}/state.json" <<'JSON'
{
  "schema_version": 1,
  "sprint_id": "SPRINT-99",
  "execution_mode": "v2",
  "sprint_status": "Active",
  "stories": {
    "STORY-099-01": {
      "state": "Done",
      "qa_bounces": 0,
      "arch_bounces": 0,
      "worktree": null,
      "updated_at": "2026-04-22T00:00:00.000Z",
      "notes": ""
    }
  },
  "last_action": "fixture",
  "updated_at": "2026-04-22T00:00:00.000Z"
}
JSON
  echo "$dir"
}

# Stub prefill + suggest scripts so close_sprint.mjs doesn't explode.
# CLEARGATE_SPRINT_DIR is honored by the script for both state + output paths.

echo "Scenario 1: valid body piped in → SPRINT-99_REPORT.md written + state flipped"
fixture=$(setup_fixture)
body="# Sprint Report — SPRINT-99
## §1 What Was Delivered
- Nothing. Fixture run.

## §2 Story Results
- STORY-099-01: Done

## §3 Execution Metrics
N/A

## §4 Lessons
- Fixture

## §5 Tooling
- Fixture

## §6 Closing
fin"
export CLEARGATE_SPRINT_DIR="$fixture"
printf '%s' "$body" | node "$CLOSE_SCRIPT" SPRINT-99 --report-body-stdin >/dev/null 2>&1
rc=$?
unset CLEARGATE_SPRINT_DIR
check "exit 0 on valid stdin" test "$rc" -eq 0
check "SPRINT-99_REPORT.md written"       test -f "${fixture}/SPRINT-99_REPORT.md"
check "SPRINT-99_REPORT.md content matches" test "$(cat "${fixture}/SPRINT-99_REPORT.md")" = "$body"
check "state flipped to Completed" grep -q '"sprint_status": "Completed"' "${fixture}/state.json"
rm -rf "$fixture"

echo
echo "Scenario 2: empty stdin → exit non-zero + stderr says 'empty report body'"
fixture=$(setup_fixture)
export CLEARGATE_SPRINT_DIR="$fixture"
err=$({ printf '' | node "$CLOSE_SCRIPT" SPRINT-99 --report-body-stdin; } 2>&1 >/dev/null)
rc=$?
unset CLEARGATE_SPRINT_DIR
check "exit non-zero on empty stdin"    test "$rc" -ne 0
check "stderr names 'empty report body'" bash -c "printf '%s' \"\$1\" | grep -q 'empty report body'" _ "$err"
check "SPRINT-99_REPORT.md NOT written"  test ! -f "${fixture}/SPRINT-99_REPORT.md"
rm -rf "$fixture"

echo
echo "Scenario 3: pre-existing SPRINT-99_REPORT.md → exit non-zero + refuse message"
fixture=$(setup_fixture)
printf 'pre-existing content\n' > "${fixture}/SPRINT-99_REPORT.md"
export CLEARGATE_SPRINT_DIR="$fixture"
err=$({ printf 'attempted body\n' | node "$CLOSE_SCRIPT" SPRINT-99 --report-body-stdin; } 2>&1 >/dev/null)
rc=$?
unset CLEARGATE_SPRINT_DIR
check "exit non-zero on pre-existing SPRINT-99_REPORT.md"  test "$rc" -ne 0
check "stderr names 'already exists'"             bash -c "printf '%s' \"\$1\" | grep -q 'already exists'" _ "$err"
check "pre-existing content preserved"            test "$(tr -d '\n' < "${fixture}/SPRINT-99_REPORT.md")" = "pre-existing content"
rm -rf "$fixture"

echo
echo "Scenario 4: primary path — Write remains on reporter.md tools line"
check "live reporter.md has Write"     grep -qE '^tools: .*Write' "$REPORTER_MD"
check "scaffold reporter.md has Write" grep -qE '^tools: .*Write' "$REPORTER_SCAFFOLD"
check "live names fallback section"    grep -q "Fallback: Write-blocked Environment" "$REPORTER_MD"
check "scaffold names fallback section" grep -q "Fallback: Write-blocked Environment" "$REPORTER_SCAFFOLD"

echo
echo "Results: ${pass} passed, ${fail} failed"
exit $fail
