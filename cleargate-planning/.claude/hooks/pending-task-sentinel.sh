#!/usr/bin/env bash
# PreToolUse hook for Task (Agent subagent dispatch).
#
# Purpose: when the orchestrator spawns a subagent via the Task tool, record the
# dispatch metadata (agent_type, work_item_id, turn_index) into a sentinel file
# under the active sprint dir. The SubagentStop hook reads the newest sentinel
# to attribute the token-ledger row correctly.
#
# Why: SubagentStop fires on the ORCHESTRATOR's session with the orchestrator's
# transcript_path. Without a sentinel, the hook can only grep the full
# transcript and every row tags against the orchestrator — per-story cost is
# uncomputable. The sentinel provides (a) ground-truth agent_type and
# work_item_id, and (b) a turn_index pivot so the post-hook can compute the
# delta instead of the cumulative sum.
#
# Input: JSON on stdin from Claude Code with fields:
#   session_id, transcript_path, cwd, hook_event_name, tool_name, tool_input
# For tool_name == "Task", tool_input has: subagent_type, description, prompt.
#
# Output: writes .cleargate/sprint-runs/<sprint-id>/.pending-task-<turn_index>.json
#         with { agent_type, work_item_id, turn_index, started_at }
#
# Robustness: never blocks the tool call (exit 0 always). Log errors to hook-log.

set -u

REPO_ROOT="${CLAUDE_PROJECT_DIR}"
LOG_DIR="${REPO_ROOT}/.cleargate/hook-log"
mkdir -p "${LOG_DIR}"
HOOK_LOG="${LOG_DIR}/pending-task-sentinel.log"
ACTIVE_SENTINEL="${REPO_ROOT}/.cleargate/sprint-runs/.active"

{
  INPUT="$(cat)"

  TOOL_NAME="$(printf '%s' "${INPUT}" | jq -r '.tool_name // empty')"
  if [[ "${TOOL_NAME}" != "Task" ]]; then
    # Not a subagent dispatch — no sentinel needed.
    exit 0
  fi

  TRANSCRIPT_PATH="$(printf '%s' "${INPUT}" | jq -r '.transcript_path // empty')"
  AGENT_TYPE="$(printf '%s' "${INPUT}" | jq -r '.tool_input.subagent_type // "unknown"')"
  PROMPT="$(printf '%s' "${INPUT}" | jq -r '.tool_input.prompt // empty')"

  # Extract work_item_id from prompt — by convention first line is STORY=NNN-NN
  # or an inline PROPOSAL-NNN / EPIC-NNN / CR-NNN / BUG-NNN reference.
  WORK_ITEM_ID="$(printf '%s' "${PROMPT}" | grep -oE '(STORY|PROPOSAL|EPIC|CR|BUG)[-=]?[0-9]+(-[0-9]+)?' | head -1 | sed 's/=/-/g')"
  [[ -z "${WORK_ITEM_ID}" ]] && WORK_ITEM_ID=""

  # Determine active sprint
  SPRINT_ID=""
  if [[ -f "${ACTIVE_SENTINEL}" ]]; then
    SPRINT_ID="$(tr -d '[:space:]' < "${ACTIVE_SENTINEL}")"
  fi
  if [[ -z "${SPRINT_ID}" ]]; then
    SPRINT_ID="_off-sprint"
  fi
  SPRINT_DIR="${REPO_ROOT}/.cleargate/sprint-runs/${SPRINT_ID}"
  mkdir -p "${SPRINT_DIR}"

  # Compute turn_index: count of assistant turns in the orchestrator transcript so far.
  TURN_INDEX=0
  if [[ -n "${TRANSCRIPT_PATH}" && -f "${TRANSCRIPT_PATH}" ]]; then
    TURN_INDEX="$(jq -cs '[.[] | select(.type == "assistant" and .message.usage)] | length' "${TRANSCRIPT_PATH}" 2>/dev/null)"
    [[ -z "${TURN_INDEX}" || "${TURN_INDEX}" == "null" ]] && TURN_INDEX=0
  fi

  STARTED_AT="$(date -u +%FT%TZ)"
  SENTINEL_FILE="${SPRINT_DIR}/.pending-task-${TURN_INDEX}.json"

  # Write the sentinel atomically (tmp + mv).
  TMP="${SENTINEL_FILE}.tmp.$$"
  jq -cn \
    --arg agent "${AGENT_TYPE}" \
    --arg work_item "${WORK_ITEM_ID}" \
    --argjson idx "${TURN_INDEX}" \
    --arg started "${STARTED_AT}" \
    '{agent_type: $agent, work_item_id: $work_item, turn_index: $idx, started_at: $started}' \
    > "${TMP}" 2>/dev/null \
    && mv "${TMP}" "${SENTINEL_FILE}" \
    && printf '[%s] wrote sentinel sprint=%s agent=%s work_item=%s turn=%s\n' \
        "${STARTED_AT}" "${SPRINT_ID}" "${AGENT_TYPE}" "${WORK_ITEM_ID}" "${TURN_INDEX}" \
        >> "${HOOK_LOG}" \
    || printf '[%s] failed to write sentinel %s\n' "${STARTED_AT}" "${SENTINEL_FILE}" >> "${HOOK_LOG}"
} 2>> "${HOOK_LOG}"

exit 0
