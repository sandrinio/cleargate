#!/usr/bin/env bash
# SubagentStop hook: append one JSONL row per subagent completion to the active sprint's token ledger.
#
# Input: JSON on stdin from Claude Code with fields session_id, transcript_path, cwd, hook_event_name.
# Output: appends to .cleargate/sprint-runs/<sprint-id>/token-ledger.jsonl
# Cost computation is deferred to the Reporter agent (prices change; keep raw).
#
# Robustness: never exits non-zero on parse failure (never block a subagent stop). Errors go to a
# sibling hook.log so you can diagnose without fighting the runtime.

set -u

REPO_ROOT="/Users/ssuladze/Documents/Dev/ClearGate"
LOG_DIR="${REPO_ROOT}/.cleargate/hook-log"
mkdir -p "${LOG_DIR}"
HOOK_LOG="${LOG_DIR}/token-ledger.log"

{
  INPUT="$(cat)"

  # --- parse hook payload ---
  TRANSCRIPT_PATH="$(printf '%s' "${INPUT}" | jq -r '.transcript_path // empty')"
  SESSION_ID="$(printf '%s' "${INPUT}" | jq -r '.session_id // empty')"

  if [[ -z "${TRANSCRIPT_PATH}" || ! -f "${TRANSCRIPT_PATH}" ]]; then
    printf '[%s] no transcript_path (session=%s)\n' "$(date -u +%FT%TZ)" "${SESSION_ID}" >> "${HOOK_LOG}"
    exit 0
  fi

  # --- determine active sprint ---
  # Convention: one active sprint at a time — the most-recently-modified sprint-run dir.
  SPRINT_DIR="$(ls -td "${REPO_ROOT}/.cleargate/sprint-runs/"*/ 2>/dev/null | head -1)"
  if [[ -z "${SPRINT_DIR}" ]]; then
    printf '[%s] no active sprint dir\n' "$(date -u +%FT%TZ)" >> "${HOOK_LOG}"
    exit 0
  fi
  LEDGER="${SPRINT_DIR%/}/token-ledger.jsonl"

  # --- walk transcript, sum usage across all assistant turns in this subagent run ---
  # Transcripts are JSONL; assistant lines have message.usage.{input_tokens,output_tokens,
  # cache_creation_input_tokens,cache_read_input_tokens} and message.model.
  USAGE_JSON="$(jq -cs '
    map(select(.type == "assistant" and .message.usage))
    | (map(.message.usage.input_tokens // 0)                     | add) as $in
    | (map(.message.usage.output_tokens // 0)                    | add) as $out
    | (map(.message.usage.cache_creation_input_tokens // 0)      | add) as $cc
    | (map(.message.usage.cache_read_input_tokens // 0)          | add) as $cr
    | (map(.message.model) | unique | map(select(. != null)) | join(","))     as $models
    | (length)                                                   as $turns
    | {input: $in, output: $out, cache_creation: $cc, cache_read: $cr, model: $models, turns: $turns}
  ' "${TRANSCRIPT_PATH}" 2>/dev/null)"

  if [[ -z "${USAGE_JSON}" || "${USAGE_JSON}" == "null" ]]; then
    printf '[%s] could not parse usage from %s\n' "$(date -u +%FT%TZ)" "${TRANSCRIPT_PATH}" >> "${HOOK_LOG}"
    exit 0
  fi

  # --- detect agent_type ---
  # The first user-type message in the transcript contains the Agent tool invocation context;
  # newer transcripts embed <subagent-type>...</subagent-type> or the system prompt header.
  # Best-effort; falls back to "unknown".
  AGENT_TYPE="$(jq -rs '
    [.[] | select(.type == "user") | .message.content]
    | tostring
    | capture("subagent_type[\"\\s:=]+(?<t>[a-zA-Z0-9_-]+)"; "g")?.t
    // "unknown"
  ' "${TRANSCRIPT_PATH}" 2>/dev/null)"
  [[ -z "${AGENT_TYPE}" || "${AGENT_TYPE}" == "null" ]] && AGENT_TYPE="unknown"

  # Fallback: grep the raw transcript for agent role markers written by our agent definitions.
  if [[ "${AGENT_TYPE}" == "unknown" ]]; then
    for role in architect developer qa reporter; do
      if grep -qiE "\\b${role}\\b agent|role: ${role}|you are the ${role}" "${TRANSCRIPT_PATH}" 2>/dev/null; then
        AGENT_TYPE="${role}"
        break
      fi
    done
  fi

  # --- detect story_id ---
  # Orchestrator convention: pass `STORY=NNN-NN` in the agent prompt. Grep for STORY-NNN-NN or STORY=NNN-NN.
  STORY_ID="$(grep -oE 'STORY[-=]?[0-9]{3}-[0-9]{2}' "${TRANSCRIPT_PATH}" 2>/dev/null \
    | head -1 \
    | sed -E 's/STORY[-=]?([0-9]{3}-[0-9]{2})/STORY-\1/')"
  [[ -z "${STORY_ID}" ]] && STORY_ID="none"

  # --- assemble ledger row ---
  TS="$(date -u +%FT%TZ)"
  ROW="$(jq -cn \
    --arg ts "${TS}" \
    --arg agent "${AGENT_TYPE}" \
    --arg story "${STORY_ID}" \
    --arg session "${SESSION_ID}" \
    --arg transcript "${TRANSCRIPT_PATH}" \
    --argjson usage "${USAGE_JSON}" \
    '{ts: $ts, agent_type: $agent, story_id: $story, session_id: $session, transcript: $transcript} + $usage')"

  printf '%s\n' "${ROW}" >> "${LEDGER}"
  printf '[%s] wrote row: agent=%s story=%s tokens=in:%s/out:%s\n' \
    "${TS}" "${AGENT_TYPE}" "${STORY_ID}" \
    "$(printf '%s' "${USAGE_JSON}" | jq -r '.input')" \
    "$(printf '%s' "${USAGE_JSON}" | jq -r '.output')" \
    >> "${HOOK_LOG}"
} 2>> "${HOOK_LOG}"

exit 0
