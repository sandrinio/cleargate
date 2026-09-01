#!/usr/bin/env bash
# bug069_ledger_fallback.red.sh — QA-Red for BUG-069.
#
# RED: token-ledger.sh's marker-absent attribution (lines 302-461, canonical
# `cleargate-planning/.claude/hooks/token-ledger.sh`) still runs the legacy
# fallback chain — Step 1 prior-ledger-row inheritance for work_item_id, a
# transcript role-marker grep for agent_type, and Steps 3+4 transcript scans.
# None of these refuse; the string "unattributed" does not appear anywhere in
# the file at baseline. A marker-less / sentinel-less fire therefore either
# copies forward a stale work_item_id or (re-)derives a value from the
# transcript, instead of writing an explicit refusal.
#
# GREEN: passes once BUG-069 lands — §302-461 replaced with the refusal in
# M1.md §4.3 as amended by §8.2: AGENT_TYPE refuses (-> "unattributed") when
# empty OR the literal string "unknown" (pending-task-sentinel.sh:173's
# default); WORK_ITEM_ID refuses (-> "") only when empty. Legacy Steps 1-4
# (prior-ledger-row read, HOOK_LOG dispatch-marker scrape, transcript scans)
# are deleted entirely.
#
# Scenarios (BUG-069 §5 Verification Protocol + M1.md §4.5 + §8.2):
#   1 (unit)        — seeded ledger inheritance refusal.
#   2 (unit)        — no chaining across two consecutive marker-less fires.
#   3 (unit)        — transcript containing the literal poisoned strings
#                      cannot re-poison a fresh (unseeded) fire.
#   4 (integration) — marker-present path (BUG-068's restored marker) is
#                      unharmed by BUG-069's rewrite of the marker-absent path.
#   5 (unit, §8.2)  — pending-task-sentinel.sh:173's own literal-"unknown"
#                      default must also refuse. Seeded directly as a
#                      .pending-task-*.json fixture (bypasses the sentinel
#                      hook itself — this scenario is about what token-ledger.sh
#                      does with an "unknown" sentinel value, not about how
#                      pending-task-sentinel.sh produces one).
#
# Isolation: every scenario runs inside its own mktemp -d fixture, injected
# via ORCHESTRATOR_PROJECT_DIR (token-ledger.sh and pre-tool-use-task.sh both
# resolve REPO_ROOT as "${ORCHESTRATOR_PROJECT_DIR:-${CLAUDE_PROJECT_DIR}}").
# Nothing under the real .cleargate/sprint-runs/ or .cleargate/hook-log/ is
# ever touched. Hook-under-test is the in-worktree CANONICAL copy at
# cleargate-planning/.claude/hooks/ (never the live gitignored .claude/).
#
# Usage: bash .cleargate/scripts/test/bug069_ledger_fallback.red.sh
# Expected at RED baseline: scenarios 1, 2, 3, 5 FAIL (at least in part);
# scenario 4 is a regression boundary and may already be green (BUG-068 is
# merged onto this branch's base) — see the per-scenario notes below.
# macOS bash 3.2 portable.

set -u

# ----------------------------------------------------------------
# Resolve paths
# ----------------------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../../.." && pwd)"

HOOKS_DIR="${REPO_ROOT}/cleargate-planning/.claude/hooks"
PRE_TOOL_USE_TASK_HOOK="${HOOKS_DIR}/pre-tool-use-task.sh"
TOKEN_LEDGER_HOOK="${HOOKS_DIR}/token-ledger.sh"

for h in "${PRE_TOOL_USE_TASK_HOOK}" "${TOKEN_LEDGER_HOOK}"; do
  if [[ ! -f "${h}" ]]; then
    printf 'ERROR: canonical hook not found at %s\n' "${h}" >&2
    exit 2
  fi
done

# ----------------------------------------------------------------
# Counters + assertion helpers (house style — bug068_dispatch_tool_name.red.sh)
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

fire_ledger() {
  # $1 = ORCHESTRATOR_PROJECT_DIR, $2 = transcript path, $3 = session_id
  local dir="$1" transcript="$2" session="$3" payload
  payload="$(jq -cn --arg tp "${transcript}" --arg sid "${session}" \
    '{transcript_path: $tp, session_id: $sid, cwd: "/tmp", hook_event_name: "SubagentStop"}')"
  printf '%s' "${payload}" \
    | env -u SKIP_FLASHCARD_GATE -u CLEARGATE_ADVISORY \
      ORCHESTRATOR_PROJECT_DIR="${dir}" CLEARGATE_NO_DASHBOARD=1 \
      bash "${TOKEN_LEDGER_HOOK}" >/dev/null 2>&1
}

# ==================================================================
# Scenario 1 (unit): seeded-ledger inheritance refusal
# ==================================================================
echo ""
echo "=== Scenario 1: marker-less fire refuses instead of inheriting seeded row ==="

TMP1="$(mk_tmpdir)"
SPRINT1="SPRINT-993"
SPRINT1_DIR="${TMP1}/.cleargate/sprint-runs/${SPRINT1}"
mkdir -p "${SPRINT1_DIR}"
printf '%s' "${SPRINT1}" > "${TMP1}/.cleargate/sprint-runs/.active"

LEDGER1="${SPRINT1_DIR}/token-ledger.jsonl"
SEED_ROW1="$(jq -cn --arg sprint "${SPRINT1}" \
  '{ts:"2026-08-01T00:00:00Z", sprint_id:$sprint, story_id:"", work_item_id:"CR-068", agent_type:"architect", session_id:"seed-s1", transcript:"", sentinel_started_at:"", delta_from_turn:0, delta:{}, session_total:{}, model:"x", turns:0}')"
printf '%s\n' "${SEED_ROW1}" > "${LEDGER1}"

TRANSCRIPT1="$(mktemp)"
TMP_DIRS+=("${TRANSCRIPT1}")
printf '%s\n' '{"type":"assistant","message":{"model":"claude-test","usage":{"input_tokens":1000,"output_tokens":500,"cache_creation_input_tokens":0,"cache_read_input_tokens":0}}}' > "${TRANSCRIPT1}"

fire_ledger "${TMP1}" "${TRANSCRIPT1}" "s1-subagent"

LEDGER1_LAST="$(tail -1 "${LEDGER1}" 2>/dev/null)"
LEDGER1_AGENT="$(printf '%s' "${LEDGER1_LAST}" | jq -r '.agent_type // empty' 2>/dev/null)"
LEDGER1_WORK_ITEM="$(printf '%s' "${LEDGER1_LAST}" | jq -r '.work_item_id // empty' 2>/dev/null)"
assert_eq "Sc1: appended row agent_type=unattributed (not inherited architect)" "unattributed" "${LEDGER1_AGENT}"
assert_eq "Sc1: appended row work_item_id=\"\" (not inherited CR-068)" "" "${LEDGER1_WORK_ITEM}"

# ==================================================================
# Scenario 2 (unit): no chaining across consecutive marker-less fires
# ==================================================================
echo ""
echo "=== Scenario 2: two consecutive marker-less fires do not chain attribution ==="

TMP2="$(mk_tmpdir)"
SPRINT2="SPRINT-992"
SPRINT2_DIR="${TMP2}/.cleargate/sprint-runs/${SPRINT2}"
mkdir -p "${SPRINT2_DIR}"
printf '%s' "${SPRINT2}" > "${TMP2}/.cleargate/sprint-runs/.active"

LEDGER2="${SPRINT2_DIR}/token-ledger.jsonl"
SEED_ROW2="$(jq -cn --arg sprint "${SPRINT2}" \
  '{ts:"2026-08-01T00:00:00Z", sprint_id:$sprint, story_id:"", work_item_id:"CR-068", agent_type:"architect", session_id:"seed-s2", transcript:"", sentinel_started_at:"", delta_from_turn:0, delta:{}, session_total:{}, model:"x", turns:0}')"
printf '%s\n' "${SEED_ROW2}" > "${LEDGER2}"

TRANSCRIPT2A="$(mktemp)"
TMP_DIRS+=("${TRANSCRIPT2A}")
printf '%s\n' '{"type":"assistant","message":{"model":"claude-test","usage":{"input_tokens":700,"output_tokens":300,"cache_creation_input_tokens":0,"cache_read_input_tokens":0}}}' > "${TRANSCRIPT2A}"
fire_ledger "${TMP2}" "${TRANSCRIPT2A}" "s2a-subagent"

TRANSCRIPT2B="$(mktemp)"
TMP_DIRS+=("${TRANSCRIPT2B}")
printf '%s\n' '{"type":"assistant","message":{"model":"claude-test","usage":{"input_tokens":600,"output_tokens":250,"cache_creation_input_tokens":0,"cache_read_input_tokens":0}}}' > "${TRANSCRIPT2B}"
fire_ledger "${TMP2}" "${TRANSCRIPT2B}" "s2b-subagent"

LEDGER2_LINES="$(wc -l < "${LEDGER2}" | tr -d ' ')"
assert_eq "Sc2: ledger has 3 rows (1 seed + 2 fires)" "3" "${LEDGER2_LINES}"

ARCHITECT_COUNT="$(jq -r 'select(.agent_type == "architect") | .agent_type' "${LEDGER2}" 2>/dev/null | wc -l | tr -d ' ')"
assert_eq "Sc2: zero rows carry agent_type=architect beyond the seeded one" "1" "${ARCHITECT_COUNT}"

LEDGER2_ROW2_AGENT="$(sed -n '2p' "${LEDGER2}" | jq -r '.agent_type // empty' 2>/dev/null)"
LEDGER2_ROW3_AGENT="$(sed -n '3p' "${LEDGER2}" | jq -r '.agent_type // empty' 2>/dev/null)"
assert_eq "Sc2: first appended row is unattributed" "unattributed" "${LEDGER2_ROW2_AGENT}"
assert_eq "Sc2: second appended row is unattributed" "unattributed" "${LEDGER2_ROW3_AGENT}"

LEDGER2_ROW2_WI="$(sed -n '2p' "${LEDGER2}" | jq -r '.work_item_id // empty' 2>/dev/null)"
LEDGER2_ROW3_WI="$(sed -n '3p' "${LEDGER2}" | jq -r '.work_item_id // empty' 2>/dev/null)"
assert_eq "Sc2: first appended row work_item_id=\"\"" "" "${LEDGER2_ROW2_WI}"
assert_eq "Sc2: second appended row work_item_id=\"\"" "" "${LEDGER2_ROW3_WI}"

# ==================================================================
# Scenario 3 (unit): transcript cannot re-poison a fresh fire
# ==================================================================
echo ""
echo "=== Scenario 3: transcript carrying the poisoned strings cannot re-poison ==="

TMP3="$(mk_tmpdir)"
SPRINT3="SPRINT-991"
SPRINT3_DIR="${TMP3}/.cleargate/sprint-runs/${SPRINT3}"
mkdir -p "${SPRINT3_DIR}"
printf '%s' "${SPRINT3}" > "${TMP3}/.cleargate/sprint-runs/.active"
# No seeded ledger row — isolates this scenario to the transcript-scan path
# (Steps 3+4), not Step 1's prior-row inheritance (covered by Scenario 1/2).

TRANSCRIPT3="$(mktemp)"
TMP_DIRS+=("${TRANSCRIPT3}")
printf '%s\n' '{"type":"user","message":{"content":"Continuing role: architect work on CR-068 immediately."}}' > "${TRANSCRIPT3}"
printf '%s\n' '{"type":"assistant","message":{"model":"claude-test","usage":{"input_tokens":800,"output_tokens":400,"cache_creation_input_tokens":0,"cache_read_input_tokens":0}}}' >> "${TRANSCRIPT3}"

fire_ledger "${TMP3}" "${TRANSCRIPT3}" "s3-subagent"

LEDGER3="${SPRINT3_DIR}/token-ledger.jsonl"
LEDGER3_LAST="$(tail -1 "${LEDGER3}" 2>/dev/null)"
LEDGER3_AGENT="$(printf '%s' "${LEDGER3_LAST}" | jq -r '.agent_type // empty' 2>/dev/null)"
LEDGER3_WORK_ITEM="$(printf '%s' "${LEDGER3_LAST}" | jq -r '.work_item_id // empty' 2>/dev/null)"
assert_eq "Sc3: row agent_type=unattributed despite 'architect' literal in transcript" "unattributed" "${LEDGER3_AGENT}"
assert_eq "Sc3: row work_item_id=\"\" despite 'CR-068' literal in transcript" "" "${LEDGER3_WORK_ITEM}"

# ==================================================================
# Scenario 4 (integration): marker-present path is unharmed
# ==================================================================
echo ""
echo "=== Scenario 4: BUG-068's restored marker still attributes correctly ==="

TMP4="$(mk_tmpdir)"
SPRINT4="SPRINT-990"
SPRINT4_DIR="${TMP4}/.cleargate/sprint-runs/${SPRINT4}"
mkdir -p "${SPRINT4_DIR}"
printf '%s' "${SPRINT4}" > "${TMP4}/.cleargate/sprint-runs/.active"

INPUT4A='{"tool_name":"Agent","tool_input":{"subagent_type":"developer","description":"dev work","prompt":"STORY=990-01 fix the regression"},"session_id":"s4-orchestrator","transcript_path":"","cwd":"/tmp"}'
printf '%s' "${INPUT4A}" | ORCHESTRATOR_PROJECT_DIR="${TMP4}" bash "${PRE_TOOL_USE_TASK_HOOK}" >/dev/null 2>&1

TRANSCRIPT4="$(mktemp)"
TMP_DIRS+=("${TRANSCRIPT4}")
printf '%s\n' '{"type":"assistant","message":{"model":"claude-test","usage":{"input_tokens":1200,"output_tokens":650,"cache_creation_input_tokens":0,"cache_read_input_tokens":0}}}' > "${TRANSCRIPT4}"

fire_ledger "${TMP4}" "${TRANSCRIPT4}" "s4-subagent"

LEDGER4="${SPRINT4_DIR}/token-ledger.jsonl"
assert_file_exists "Sc4: token-ledger.jsonl row is written" "${LEDGER4}"

LEDGER4_LAST="$(tail -1 "${LEDGER4}" 2>/dev/null)"
LEDGER4_AGENT="$(printf '%s' "${LEDGER4_LAST}" | jq -r '.agent_type // empty' 2>/dev/null)"
LEDGER4_WORK_ITEM="$(printf '%s' "${LEDGER4_LAST}" | jq -r '.work_item_id // empty' 2>/dev/null)"
LEDGER4_SPRINT="$(printf '%s' "${LEDGER4_LAST}" | jq -r '.sprint_id // empty' 2>/dev/null)"
LEDGER4_DELTA_SHAPE="$(printf '%s' "${LEDGER4_LAST}" | jq -r 'if (.delta // null) != null and ((.delta | type) == "object") and ((.delta | length) > 0) then "present" else "absent" end' 2>/dev/null)"

assert_eq "Sc4: ledger row attributes agent_type=developer" "developer" "${LEDGER4_AGENT}"
assert_eq "Sc4: ledger row attributes work_item_id=STORY-990-01" "STORY-990-01" "${LEDGER4_WORK_ITEM}"
assert_eq "Sc4: ledger row attributes sprint_id=${SPRINT4}" "${SPRINT4}" "${LEDGER4_SPRINT}"
assert_eq "Sc4: ledger row carries a non-empty delta object" "present" "${LEDGER4_DELTA_SHAPE}"

# ==================================================================
# Scenario 5 (unit, §8.2): sentinel's literal "unknown" default must refuse
# ==================================================================
echo ""
echo "=== Scenario 5: sentinel agent_type=unknown refuses; work_item_id is kept ==="

TMP5="$(mk_tmpdir)"
SPRINT5="SPRINT-989"
SPRINT5_DIR="${TMP5}/.cleargate/sprint-runs/${SPRINT5}"
mkdir -p "${SPRINT5_DIR}"
printf '%s' "${SPRINT5}" > "${TMP5}/.cleargate/sprint-runs/.active"

# No .dispatch-*.json — seed a .pending-task-*.json directly, matching the
# shape pending-task-sentinel.sh:205-210 writes, with agent_type carrying the
# hook's own literal default (pending-task-sentinel.sh:173:
# `.tool_input.subagent_type // "unknown"`) and a non-empty work_item_id.
SENTINEL5="${SPRINT5_DIR}/.pending-task-0-99999-12345.json"
jq -cn --arg wi "STORY-989-01" \
  '{agent_type: "unknown", work_item_id: $wi, turn_index: 0, started_at: "2026-09-02T00:00:00Z"}' \
  > "${SENTINEL5}"

TRANSCRIPT5="$(mktemp)"
TMP_DIRS+=("${TRANSCRIPT5}")
printf '%s\n' '{"type":"assistant","message":{"model":"claude-test","usage":{"input_tokens":900,"output_tokens":450,"cache_creation_input_tokens":0,"cache_read_input_tokens":0}}}' > "${TRANSCRIPT5}"

fire_ledger "${TMP5}" "${TRANSCRIPT5}" "s5-subagent"

LEDGER5="${SPRINT5_DIR}/token-ledger.jsonl"
LEDGER5_LAST="$(tail -1 "${LEDGER5}" 2>/dev/null)"
LEDGER5_AGENT="$(printf '%s' "${LEDGER5_LAST}" | jq -r '.agent_type // empty' 2>/dev/null)"
LEDGER5_WORK_ITEM="$(printf '%s' "${LEDGER5_LAST}" | jq -r '.work_item_id // empty' 2>/dev/null)"
assert_eq "Sc5: sentinel agent_type=unknown refuses to agent_type=unattributed" "unattributed" "${LEDGER5_AGENT}"
assert_eq "Sc5: work_item_id keeps the sentinel's value (STORY-989-01)" "STORY-989-01" "${LEDGER5_WORK_ITEM}"

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
