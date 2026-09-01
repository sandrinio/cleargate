#!/usr/bin/env bash
# bug068_dispatch_tool_name.red.sh — QA-Red for BUG-068.
#
# RED: fails against clean baseline — pre-tool-use-task.sh and
# pending-task-sentinel.sh both gate on tool_name == "Task"; this Claude
# Code build spawns subagents with tool_name == "Agent", so the dispatch
# marker, the flashcard barrier, and the rejected-name log line are all
# silently dead. token-ledger.sh (SubagentStop) therefore has no dispatch
# marker to consume and mis-attributes agent_type/work_item_id.
#
# GREEN: passes once BUG-068 lands — the accept-predicate becomes
# tool_name in {Task, Agent} OR tool_input.subagent_type present, every
# early exit logs, and the pending-task-sentinel.sh guards at :53/:157
# apply the same predicate.
#
# Scenarios (BUG-068 §5 Verification Protocol):
#   1 (unit)  — pre-tool-use-task.sh: Agent + subagent_type=developer +
#               prompt naming a work item + .active set → exactly one
#               .dispatch-*.json naming agent_type=developer.
#               FAILS at baseline: zero files.
#   2 (unit)  — pending-task-sentinel.sh: Agent + unprocessed flashcard
#               present → flashcard barrier BLOCKS (non-zero exit +
#               "FLASHCARD GATE BLOCKED" on stderr).
#               FAILS at baseline: TOOL_NAME_EARLY != "Task" skips the
#               whole gate block → exit 0, passes through.
#   3 (unit)  — pre-tool-use-task.sh: genuinely unrelated tool_name
#               ("Bash") → a log line is written to
#               .cleargate/hook-log/pre-tool-use-task.log recording the
#               rejected name.
#               FAILS at baseline: the mismatch exit at line 45 writes
#               nothing — the log FILE itself is never created (only its
#               parent dir, via the unconditional mkdir -p).
#   4 (integration) — synthetic Agent dispatch via pre-tool-use-task.sh →
#               marker written → token-ledger.sh (SubagentStop) consumes
#               it and attributes the ledger row to agent_type=developer,
#               work_item_id=STORY-997-01.
#               FAILS at baseline: no marker ever exists, so token-ledger
#               falls to its legacy fallbacks and writes agent_type=unknown,
#               work_item_id=none.
#
# Isolation: every scenario runs inside its own mktemp -d fixture, injected
# via ORCHESTRATOR_PROJECT_DIR (all three hooks resolve REPO_ROOT as
# "${ORCHESTRATOR_PROJECT_DIR:-${CLAUDE_PROJECT_DIR}}"). Nothing under the
# real .cleargate/sprint-runs/ or .cleargate/hook-log/ is ever touched.
# Hook-under-test is the in-worktree CANONICAL copy at
# cleargate-planning/.claude/hooks/ (never the live gitignored .claude/).
#
# Usage: bash .cleargate/scripts/test/bug068_dispatch_tool_name.red.sh
# Expected at RED baseline: scenarios 1, 2, 3, 4 all FAIL.
# Expected after implementation: all 4 PASS.
# macOS bash 3.2 portable.

set -u

# ----------------------------------------------------------------
# Resolve paths
# ----------------------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../../.." && pwd)"

HOOKS_DIR="${REPO_ROOT}/cleargate-planning/.claude/hooks"
PRE_TOOL_USE_TASK_HOOK="${HOOKS_DIR}/pre-tool-use-task.sh"
PENDING_TASK_SENTINEL_HOOK="${HOOKS_DIR}/pending-task-sentinel.sh"
TOKEN_LEDGER_HOOK="${HOOKS_DIR}/token-ledger.sh"

for h in "${PRE_TOOL_USE_TASK_HOOK}" "${PENDING_TASK_SENTINEL_HOOK}" "${TOKEN_LEDGER_HOOK}"; do
  if [[ ! -f "${h}" ]]; then
    printf 'ERROR: canonical hook not found at %s\n' "${h}" >&2
    exit 2
  fi
done

# ----------------------------------------------------------------
# Counters + assertion helpers
# ----------------------------------------------------------------
PASS=0
FAIL=0

pass() {
  printf 'PASS: %s\n' "$1"
  PASS=$(( PASS + 1 ))
}

fail() {
  printf 'FAIL: %s\n' "$1"
  FAIL=$(( FAIL + 1 ))
}

assert_eq() {
  local label="$1" expected="$2" actual="$3"
  if [[ "${expected}" == "${actual}" ]]; then
    pass "${label}"
  else
    printf 'FAIL: %s — expected=%q actual=%q\n' "${label}" "${expected}" "${actual}"
    FAIL=$(( FAIL + 1 ))
  fi
}

assert_ne() {
  local label="$1" expected="$2" actual="$3"
  if [[ "${expected}" != "${actual}" ]]; then
    pass "${label}"
  else
    printf 'FAIL: %s — expected != %q but actual=%q\n' "${label}" "${expected}" "${actual}"
    FAIL=$(( FAIL + 1 ))
  fi
}

assert_contains() {
  local label="$1" needle="$2" haystack="$3"
  if printf '%s' "${haystack}" | grep -qF "${needle}"; then
    pass "${label}"
  else
    printf 'FAIL: %s — needle not found\n  needle: %s\n  haystack: %s\n' "${label}" "${needle}" "${haystack}"
    FAIL=$(( FAIL + 1 ))
  fi
}

assert_file_exists() {
  local label="$1" path="$2"
  if [[ -f "${path}" ]]; then
    pass "${label}"
  else
    printf 'FAIL: %s — file does not exist: %s\n' "${label}" "${path}"
    FAIL=$(( FAIL + 1 ))
  fi
}

# ----------------------------------------------------------------
# Fixture cleanup
# ----------------------------------------------------------------
TMP_DIRS=()
cleanup() {
  local d
  for d in "${TMP_DIRS[@]:-}"; do
    [[ -n "${d}" && -d "${d}" ]] && rm -rf "${d}"
  done
}
trap cleanup EXIT

mk_tmpdir() {
  local d
  d="$(mktemp -d)"
  TMP_DIRS+=("${d}")
  printf '%s' "${d}"
}

# ==================================================================
# Scenario 1 (unit): pre-tool-use-task.sh dispatch marker on tool_name=Agent
# ==================================================================
echo ""
echo "=== Scenario 1: pre-tool-use-task.sh writes marker for tool_name=Agent ==="

TMP1="$(mk_tmpdir)"
SPRINT1="SPRINT-996"
mkdir -p "${TMP1}/.cleargate/sprint-runs"
printf '%s' "${SPRINT1}" > "${TMP1}/.cleargate/sprint-runs/.active"

INPUT1='{"tool_name":"Agent","tool_input":{"subagent_type":"developer","description":"dev work","prompt":"STORY=996-01 implement the thing\nmore context"},"session_id":"s1-agent","transcript_path":"","cwd":"/tmp"}'

printf '%s' "${INPUT1}" | ORCHESTRATOR_PROJECT_DIR="${TMP1}" bash "${PRE_TOOL_USE_TASK_HOOK}" >/dev/null 2>&1
S1_RC=$?

SPRINT1_DIR="${TMP1}/.cleargate/sprint-runs/${SPRINT1}"
S1_COUNT="$(ls -1 "${SPRINT1_DIR}"/.dispatch-*.json 2>/dev/null | wc -l | tr -d ' ')"
assert_eq "Sc1: exactly one .dispatch-*.json written for Agent spawn" "1" "${S1_COUNT}"

S1_AGENT_TYPE=""
if [[ "${S1_COUNT}" == "1" ]]; then
  S1_FILE="$(ls -1 "${SPRINT1_DIR}"/.dispatch-*.json 2>/dev/null | head -1)"
  S1_AGENT_TYPE="$(jq -r '.agent_type // empty' "${S1_FILE}" 2>/dev/null)"
  S1_WORK_ITEM="$(jq -r '.work_item_id // empty' "${S1_FILE}" 2>/dev/null)"
  assert_eq "Sc1: marker names agent_type=developer" "developer" "${S1_AGENT_TYPE}"
  assert_eq "Sc1: marker names work_item_id=STORY-996-01" "STORY-996-01" "${S1_WORK_ITEM}"
else
  fail "Sc1: marker names agent_type=developer (no marker file to inspect)"
  fail "Sc1: marker names work_item_id=STORY-996-01 (no marker file to inspect)"
fi

# ==================================================================
# Scenario 2 (unit): pending-task-sentinel.sh flashcard barrier on tool_name=Agent
# ==================================================================
echo ""
echo "=== Scenario 2: pending-task-sentinel.sh flashcard barrier blocks Agent spawn ==="

TMP2="$(mk_tmpdir)"
SPRINT2="SPRINT-995"
SPRINT2_DIR="${TMP2}/.cleargate/sprint-runs/${SPRINT2}"
mkdir -p "${SPRINT2_DIR}"
printf '%s' "${SPRINT2}" > "${TMP2}/.cleargate/sprint-runs/.active"

# Unprocessed flashcard via a dev report (matches "${SPRINT_DIR}"/*-dev.md glob).
cat > "${SPRINT2_DIR}/STORY-995-01-dev.md" << 'EOF'
# Dev Report STORY-995-01

## flashcards_flagged

- "2026-09-01 · #bug068 · sentinel scenario 2 fixture card"

## notes

done
EOF

INPUT2='{"tool_name":"Agent","tool_input":{"subagent_type":"developer","description":"dev work","prompt":"STORY=995-01 implement the thing"},"session_id":"s2-agent","transcript_path":"","cwd":"/tmp"}'

STDERR2_FILE="$(mktemp)"
TMP_DIRS+=("${STDERR2_FILE}")
printf '%s' "${INPUT2}" | ORCHESTRATOR_PROJECT_DIR="${TMP2}" bash "${PENDING_TASK_SENTINEL_HOOK}" >/dev/null 2>"${STDERR2_FILE}"
S2_RC=$?
S2_STDERR="$(cat "${STDERR2_FILE}" 2>/dev/null)"

assert_ne "Sc2: flashcard barrier blocks Agent spawn (non-zero exit)" "0" "${S2_RC}"
assert_contains "Sc2: stderr carries FLASHCARD GATE BLOCKED" "FLASHCARD GATE BLOCKED" "${S2_STDERR}"

# ==================================================================
# Scenario 3 (unit): rejected-tool-name path logs (no more silent exit)
# ==================================================================
echo ""
echo "=== Scenario 3: pre-tool-use-task.sh logs on a genuinely unrelated tool_name ==="

TMP3="$(mk_tmpdir)"
SPRINT3="SPRINT-994"
mkdir -p "${TMP3}/.cleargate/sprint-runs"
printf '%s' "${SPRINT3}" > "${TMP3}/.cleargate/sprint-runs/.active"

INPUT3='{"tool_name":"Bash","tool_input":{"command":"ls -la"},"session_id":"s3-bash","transcript_path":"","cwd":"/tmp"}'

printf '%s' "${INPUT3}" | ORCHESTRATOR_PROJECT_DIR="${TMP3}" bash "${PRE_TOOL_USE_TASK_HOOK}" >/dev/null 2>&1

HOOK_LOG3="${TMP3}/.cleargate/hook-log/pre-tool-use-task.log"
assert_file_exists "Sc3: pre-tool-use-task.log is created for a rejected tool_name" "${HOOK_LOG3}"

if [[ -f "${HOOK_LOG3}" ]]; then
  LOG3_CONTENT="$(cat "${HOOK_LOG3}" 2>/dev/null)"
  assert_contains "Sc3: log line records the rejected tool_name (Bash)" "Bash" "${LOG3_CONTENT}"
else
  fail "Sc3: log line records the rejected tool_name (Bash) (no log file to inspect)"
fi

# ==================================================================
# Scenario 4 (integration): dispatch marker → token-ledger.sh attribution
# ==================================================================
echo ""
echo "=== Scenario 4: Agent dispatch marker consumed correctly by token-ledger.sh ==="

TMP4="$(mk_tmpdir)"
SPRINT4="SPRINT-997"
SPRINT4_DIR="${TMP4}/.cleargate/sprint-runs/${SPRINT4}"
mkdir -p "${SPRINT4_DIR}"
printf '%s' "${SPRINT4}" > "${TMP4}/.cleargate/sprint-runs/.active"

# Step A: orchestrator spawns a subagent via Agent — pre-tool-use-task.sh should
# (post-fix) write the dispatch marker.
INPUT4A='{"tool_name":"Agent","tool_input":{"subagent_type":"developer","description":"dev work","prompt":"STORY=997-01 fix the regression"},"session_id":"s4-orchestrator","transcript_path":"","cwd":"/tmp"}'
printf '%s' "${INPUT4A}" | ORCHESTRATOR_PROJECT_DIR="${TMP4}" bash "${PRE_TOOL_USE_TASK_HOOK}" >/dev/null 2>&1

# Step B: build a minimal synthetic subagent transcript (one assistant turn with
# usage; no user message — isolates the dispatch-marker attribution path from any
# transcript-grep fallback).
TRANSCRIPT4="$(mktemp)"
TMP_DIRS+=("${TRANSCRIPT4}")
printf '%s\n' '{"type":"assistant","message":{"model":"claude-test","usage":{"input_tokens":1000,"output_tokens":500,"cache_creation_input_tokens":0,"cache_read_input_tokens":0}}}' > "${TRANSCRIPT4}"

# Step C: subagent completes — SubagentStop fires token-ledger.sh.
INPUT4B="$(jq -cn --arg tp "${TRANSCRIPT4}" '{transcript_path: $tp, session_id: "s4-subagent", cwd: "/tmp", hook_event_name: "SubagentStop"}')"
printf '%s' "${INPUT4B}" | ORCHESTRATOR_PROJECT_DIR="${TMP4}" bash "${TOKEN_LEDGER_HOOK}" >/dev/null 2>&1

LEDGER4="${SPRINT4_DIR}/token-ledger.jsonl"
assert_file_exists "Sc4: token-ledger.jsonl row is written" "${LEDGER4}"

if [[ -f "${LEDGER4}" ]]; then
  LEDGER4_ROW="$(tail -1 "${LEDGER4}" 2>/dev/null)"
  LEDGER4_AGENT="$(printf '%s' "${LEDGER4_ROW}" | jq -r '.agent_type // empty' 2>/dev/null)"
  LEDGER4_WORK_ITEM="$(printf '%s' "${LEDGER4_ROW}" | jq -r '.work_item_id // empty' 2>/dev/null)"
  assert_eq "Sc4: ledger row attributes agent_type=developer" "developer" "${LEDGER4_AGENT}"
  assert_eq "Sc4: ledger row attributes work_item_id=STORY-997-01" "STORY-997-01" "${LEDGER4_WORK_ITEM}"
else
  fail "Sc4: ledger row attributes agent_type=developer (no ledger file to inspect)"
  fail "Sc4: ledger row attributes work_item_id=STORY-997-01 (no ledger file to inspect)"
fi

# ------------------------------------------------------------------
echo ""
echo "=== Summary ==="
echo "Passed: ${PASS}"
echo "Failed: ${FAIL}"
if [[ "${FAIL}" -gt 0 ]]; then
  exit 1
fi
echo "All tests passed."
exit 0
