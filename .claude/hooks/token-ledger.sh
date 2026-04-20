#!/usr/bin/env bash
# SubagentStop hook: append one JSONL row per subagent completion to the active sprint's token ledger.
#
# Input: JSON on stdin from Claude Code with fields session_id, transcript_path, cwd, hook_event_name.
# Output: appends to .cleargate/sprint-runs/<sprint-id>/token-ledger.jsonl
# Cost computation is deferred to the Reporter agent (prices change; keep raw).
#
# ── Per-task sentinel contract (ADDED 2026-04-20) ─────────────────────────────
#
#   Before each Task (Agent) dispatch the orchestrator writes:
#     .cleargate/sprint-runs/<sprint>/.pending-task-<N>.json
#   with shape:
#     { "agent_type": "developer"|"architect"|"qa"|"reporter",
#       "work_item_id": "STORY-006-01",
#       "turn_index": <int — count of assistant turns in orchestrator transcript at dispatch>,
#       "started_at": "<ISO-8601>" }
#
#   On SubagentStop fire the hook:
#     1. Finds the newest .pending-task-*.json in the active sprint dir.
#     2. Reads agent_type, work_item_id, turn_index from it.
#     3. Computes token delta = sum of assistant turns at index >= turn_index in the transcript
#        (NOT the cumulative whole-file sum — that was the SPRINT-05 double-count bug).
#     4. Writes one JSONL row to token-ledger.jsonl with sentinel attribution.
#     5. Deletes the sentinel atomically (mv → append → rm .processed-*).
#
#   If no sentinel exists: falls back to legacy transcript-grep for agent_type/work_item_id
#   and computes the full-transcript delta (single-fire: no prior rows to double-count).
#   Fail-silent on missing sentinel — never block a subagent stop (exit 0 always).
#
# ── Active sprint detection ────────────────────────────────────────────────────
#
#   Primary  : .cleargate/sprint-runs/.active sentinel file (one line: "SPRINT-NN")
#              Orchestrator writes this at sprint kickoff, removes/updates at close.
#   Fallback : .cleargate/sprint-runs/_off-sprint/token-ledger.jsonl
#              When no .active sentinel exists, writes still get captured but
#              tagged _off-sprint instead of misrouting to a stale sprint dir.
#   (Removed): the old `ls -td sprint-runs/*/ | head -1` mtime heuristic — it
#              misrouted SPRINT-04 firings to SPRINT-03 because ledger appends
#              themselves bumped SPRINT-03's mtime. See REPORT.md SPRINT-04.
#
# ── Work-item ID detection (legacy / no-sentinel path) ────────────────────────
#
#   Primary  : first user message in the transcript — that's the orchestrator's
#              dispatch prompt, which by agent convention starts with
#              `STORY=NNN-NN`, `PROPOSAL-NNN`, `EPIC-NNN`, `CR-NNN`, or `BUG-NNN`.
#   Pattern  : (STORY|PROPOSAL|EPIC|CR|BUG)[-=]?[0-9]+(-[0-9]+)?
#   Fallback : grep first match anywhere in the transcript.
#   story_id : populated only when the match is a STORY-* (backward compat).
#   work_item_id: always populated when detection succeeds; equals story_id for STORY items.
#   (Removed): grep-first-anywhere as PRIMARY — it picked up SPRINT-05 mentions
#              from architect plans being read by the subagent and mistagged
#              every SPRINT-04 firing as STORY-006-01.
#
# Robustness: never exits non-zero on parse failure (never block a subagent stop). Errors go to a
# sibling hook.log so you can diagnose without fighting the runtime.

set -u

REPO_ROOT="/Users/ssuladze/Documents/Dev/ClearGate"
LOG_DIR="${REPO_ROOT}/.cleargate/hook-log"
mkdir -p "${LOG_DIR}"
HOOK_LOG="${LOG_DIR}/token-ledger.log"
ACTIVE_SENTINEL="${REPO_ROOT}/.cleargate/sprint-runs/.active"

{
  INPUT="$(cat)"

  # --- parse hook payload ---
  TRANSCRIPT_PATH="$(printf '%s' "${INPUT}" | jq -r '.transcript_path // empty')"
  SESSION_ID="$(printf '%s' "${INPUT}" | jq -r '.session_id // empty')"

  if [[ -z "${TRANSCRIPT_PATH}" || ! -f "${TRANSCRIPT_PATH}" ]]; then
    printf '[%s] no transcript_path (session=%s)\n' "$(date -u +%FT%TZ)" "${SESSION_ID}" >> "${HOOK_LOG}"
    exit 0
  fi

  # --- determine active sprint via sentinel ---
  SPRINT_ID=""
  if [[ -f "${ACTIVE_SENTINEL}" ]]; then
    SPRINT_ID="$(tr -d '[:space:]' < "${ACTIVE_SENTINEL}")"
  fi

  if [[ -n "${SPRINT_ID}" ]]; then
    SPRINT_DIR="${REPO_ROOT}/.cleargate/sprint-runs/${SPRINT_ID}"
    mkdir -p "${SPRINT_DIR}"
    printf '[%s] routing to sprint=%s (sentinel)\n' "$(date -u +%FT%TZ)" "${SPRINT_ID}" >> "${HOOK_LOG}"
  else
    # No active sprint: capture the row in an off-sprint ledger so we don't lose data.
    SPRINT_ID="_off-sprint"
    SPRINT_DIR="${REPO_ROOT}/.cleargate/sprint-runs/_off-sprint"
    mkdir -p "${SPRINT_DIR}"
    printf '[%s] no .active sentinel — bucketing as _off-sprint\n' "$(date -u +%FT%TZ)" >> "${HOOK_LOG}"
  fi
  LEDGER="${SPRINT_DIR}/token-ledger.jsonl"

  # --- per-task sentinel: find newest .pending-task-*.json in sprint dir ---
  SENTINEL_FILE=""
  SENTINEL_AGENT_TYPE=""
  SENTINEL_WORK_ITEM_ID=""
  SENTINEL_TURN_INDEX=0
  SENTINEL_STARTED_AT=""

  if [[ -d "${SPRINT_DIR}" ]]; then
    # Find newest pending-task sentinel (ls -t sorts newest first)
    SENTINEL_FILE="$(ls -t "${SPRINT_DIR}"/.pending-task-*.json 2>/dev/null | head -1)"
  fi

  if [[ -n "${SENTINEL_FILE}" && -f "${SENTINEL_FILE}" ]]; then
    SENTINEL_JSON="$(cat "${SENTINEL_FILE}" 2>/dev/null)"
    SENTINEL_AGENT_TYPE="$(printf '%s' "${SENTINEL_JSON}" | jq -r '.agent_type // empty' 2>/dev/null)"
    SENTINEL_WORK_ITEM_ID="$(printf '%s' "${SENTINEL_JSON}" | jq -r '.work_item_id // empty' 2>/dev/null)"
    SENTINEL_TURN_INDEX="$(printf '%s' "${SENTINEL_JSON}" | jq -r '.turn_index // 0' 2>/dev/null)"
    SENTINEL_STARTED_AT="$(printf '%s' "${SENTINEL_JSON}" | jq -r '.started_at // empty' 2>/dev/null)"
    printf '[%s] found sentinel=%s agent=%s work_item=%s turn_index=%s\n' \
      "$(date -u +%FT%TZ)" "${SENTINEL_FILE}" "${SENTINEL_AGENT_TYPE}" "${SENTINEL_WORK_ITEM_ID}" "${SENTINEL_TURN_INDEX}" >> "${HOOK_LOG}"
  fi

  # --- compute token usage ---
  # DELTA MODEL (per-task sentinel path): slice transcript from turn_index forward.
  # CUMULATIVE GUARD (no-sentinel path): use entire transcript — single-fire so no double-count.
  #
  # turn_index counts assistant turns (0-based). We select assistant turns, skip the first
  # turn_index of them, then sum the remainder. This isolates tokens attributable to this subagent run.
  if [[ -n "${SENTINEL_FILE}" && -f "${SENTINEL_FILE}" && -n "${SENTINEL_AGENT_TYPE}" ]]; then
    # Delta model: slice from turn_index
    USAGE_JSON="$(jq -cs --argjson idx "${SENTINEL_TURN_INDEX}" '
      [ .[] | select(.type == "assistant" and .message.usage) ]
      | .[$idx:]
      | (map(.message.usage.input_tokens // 0)                     | add // 0) as $in
      | (map(.message.usage.output_tokens // 0)                    | add // 0) as $out
      | (map(.message.usage.cache_creation_input_tokens // 0)      | add // 0) as $cc
      | (map(.message.usage.cache_read_input_tokens // 0)          | add // 0) as $cr
      | (map(.message.model) | unique | map(select(. != null)) | join(","))     as $models
      | (length)                                                   as $turns
      | {input: $in, output: $out, cache_creation: $cc, cache_read: $cr, model: $models, turns: $turns}
    ' "${TRANSCRIPT_PATH}" 2>/dev/null)"
  else
    # No sentinel: sum all assistant turns (full transcript — first fire, no prior rows to double-count)
    USAGE_JSON="$(jq -cs '
      map(select(.type == "assistant" and .message.usage))
      | (map(.message.usage.input_tokens // 0)                     | add // 0) as $in
      | (map(.message.usage.output_tokens // 0)                    | add // 0) as $out
      | (map(.message.usage.cache_creation_input_tokens // 0)      | add // 0) as $cc
      | (map(.message.usage.cache_read_input_tokens // 0)          | add // 0) as $cr
      | (map(.message.model) | unique | map(select(. != null)) | join(","))     as $models
      | (length)                                                   as $turns
      | {input: $in, output: $out, cache_creation: $cc, cache_read: $cr, model: $models, turns: $turns}
    ' "${TRANSCRIPT_PATH}" 2>/dev/null)"
  fi

  if [[ -z "${USAGE_JSON}" || "${USAGE_JSON}" == "null" ]]; then
    printf '[%s] could not parse usage from %s\n' "$(date -u +%FT%TZ)" "${TRANSCRIPT_PATH}" >> "${HOOK_LOG}"
    exit 0
  fi

  # --- resolve agent_type and work_item_id ---
  # Sentinel takes precedence; fall back to legacy transcript-grep when no sentinel.
  AGENT_TYPE="${SENTINEL_AGENT_TYPE}"
  WORK_ITEM_ID="${SENTINEL_WORK_ITEM_ID}"

  if [[ -z "${AGENT_TYPE}" ]]; then
    # Legacy: grep subagent_type from user messages, then role markers
    AGENT_TYPE="$(jq -rs '
      [.[] | select(.type == "user") | .message.content]
      | tostring
      | capture("subagent_type[\"\\s:=]+(?<t>[a-zA-Z0-9_-]+)"; "g")?.t
      // "unknown"
    ' "${TRANSCRIPT_PATH}" 2>/dev/null)"
    [[ -z "${AGENT_TYPE}" || "${AGENT_TYPE}" == "null" ]] && AGENT_TYPE="unknown"

    if [[ "${AGENT_TYPE}" == "unknown" ]]; then
      for role in architect developer qa reporter; do
        if grep -qiE "\\b${role}\\b agent|role: ${role}|you are the ${role}" "${TRANSCRIPT_PATH}" 2>/dev/null; then
          AGENT_TYPE="${role}"
          break
        fi
      done
    fi
  fi

  if [[ -z "${WORK_ITEM_ID}" ]]; then
    # Legacy: detect work_item_id (PRIMARY: first user message; FALLBACK: anywhere-grep)
    WORK_ITEM_RAW="$(jq -rs '
      [.[] | select(.type == "user")] | .[0].message.content
      | if type == "array" then map(.text? // "") | join(" ") else (. // "") end
      | tostring
      | scan("(STORY|PROPOSAL|EPIC|CR|BUG)[-=]?([0-9]+(-[0-9]+)?)") | .[0:2] | join("-")
    ' "${TRANSCRIPT_PATH}" 2>/dev/null | head -1)"

    if [[ -n "${WORK_ITEM_RAW}" && "${WORK_ITEM_RAW}" != "null" && "${WORK_ITEM_RAW}" != "-" ]]; then
      WORK_ITEM_ID="$(printf '%s' "${WORK_ITEM_RAW}" | sed 's/=/-/g')"
    else
      WORK_ITEM_ID="$(grep -oE '(STORY|PROPOSAL|EPIC|CR|BUG)[-=]?[0-9]+(-[0-9]+)?' "${TRANSCRIPT_PATH}" 2>/dev/null \
        | head -1 \
        | sed 's/=/-/g')"
      if [[ -n "${WORK_ITEM_ID}" ]]; then
        printf '[%s] work_item_id fallback grep: %s\n' "$(date -u +%FT%TZ)" "${WORK_ITEM_ID}" >> "${HOOK_LOG}"
      fi
    fi
    [[ -z "${WORK_ITEM_ID}" ]] && WORK_ITEM_ID=""

    # Legacy fallback: if no work_item_id found at all, fall back to old grep for story_id only
    if [[ -z "${WORK_ITEM_ID}" ]]; then
      STORY_ID_LEGACY="$(grep -oE 'STORY[-=]?[0-9]{3}-[0-9]{2}' "${TRANSCRIPT_PATH}" 2>/dev/null \
        | head -1 \
        | sed -E 's/STORY[-=]?([0-9]{3}-[0-9]{2})/STORY-\1/')"
      [[ -z "${STORY_ID_LEGACY}" ]] && STORY_ID_LEGACY="none"
      WORK_ITEM_ID="${STORY_ID_LEGACY}"
    fi
  fi

  # story_id is populated only when the work item is a STORY-* (backward compat)
  STORY_ID=""
  if [[ "${WORK_ITEM_ID}" == STORY-* ]]; then
    STORY_ID="${WORK_ITEM_ID}"
  fi

  # --- atomic sentinel deletion (mv → append → rm) ---
  PROCESSED_FILE=""
  if [[ -n "${SENTINEL_FILE}" && -f "${SENTINEL_FILE}" ]]; then
    PROCESSED_FILE="${SENTINEL_FILE%.json}.processed-$$"
    if ! mv "${SENTINEL_FILE}" "${PROCESSED_FILE}" 2>/dev/null; then
      # mv failed (race condition or permissions): proceed without deletion
      PROCESSED_FILE=""
      printf '[%s] warn: could not mv sentinel %s\n' "$(date -u +%FT%TZ)" "${SENTINEL_FILE}" >> "${HOOK_LOG}"
    fi
  fi

  # --- assemble ledger row ---
  TS="$(date -u +%FT%TZ)"
  ROW="$(jq -cn \
    --arg ts "${TS}" \
    --arg agent "${AGENT_TYPE}" \
    --arg story "${STORY_ID}" \
    --arg work_item "${WORK_ITEM_ID}" \
    --arg session "${SESSION_ID}" \
    --arg transcript "${TRANSCRIPT_PATH}" \
    --arg sprint "${SPRINT_ID}" \
    --arg sentinel_started_at "${SENTINEL_STARTED_AT}" \
    --argjson turn_index "${SENTINEL_TURN_INDEX}" \
    --argjson usage "${USAGE_JSON}" \
    '{ts: $ts, sprint_id: $sprint, agent_type: $agent, story_id: $story, work_item_id: $work_item, session_id: $session, transcript: $transcript, sentinel_started_at: $sentinel_started_at, delta_from_turn: $turn_index} + $usage')"

  printf '%s\n' "${ROW}" >> "${LEDGER}"
  printf '[%s] wrote row: sprint=%s agent=%s work_item=%s story=%s tokens=in:%s/out:%s delta_from=%s\n' \
    "${TS}" "${SPRINT_ID}" "${AGENT_TYPE}" "${WORK_ITEM_ID}" "${STORY_ID}" \
    "$(printf '%s' "${USAGE_JSON}" | jq -r '.input')" \
    "$(printf '%s' "${USAGE_JSON}" | jq -r '.output')" \
    "${SENTINEL_TURN_INDEX}" \
    >> "${HOOK_LOG}"

  # --- delete processed sentinel ---
  if [[ -n "${PROCESSED_FILE}" && -f "${PROCESSED_FILE}" ]]; then
    rm -f "${PROCESSED_FILE}"
  fi
} 2>> "${HOOK_LOG}"

exit 0
