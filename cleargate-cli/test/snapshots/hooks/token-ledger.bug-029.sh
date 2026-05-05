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

# CR-026: SessionStart blocked-items banner poisons transcript-grep (BUG-024 §3.1 Defect 2).
# Skip-pattern: any line starting with "<N> items? blocked: " is the SessionStart banner.
# Applied in the legacy work-item ID resolution block below via sed filtering.
BANNER_SKIP_RE='^[0-9]+ items? blocked: '

REPO_ROOT="${ORCHESTRATOR_PROJECT_DIR:-${CLAUDE_PROJECT_DIR}}"
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

  # --- dispatch-marker attribution (CR-016 + CR-026 + BUG-029, highest priority) ---
  # The PreToolUse:Task hook (pre-tool-use-task.sh, CR-026) auto-writes:
  #   .cleargate/sprint-runs/<sprint>/.dispatch-<ts>-<pid>-<rand>.json
  # with { work_item_id, agent_type, spawned_at, session_id, writer }.
  # Reading this file (if present) gives accurate attribution; falls back to the
  # per-task pending-task sentinel (second priority) and transcript-scan (third).
  #
  # BUG-029 fix — tuple-match replaces newest-file lookup:
  # When two parallel Task() spawns write two distinct .dispatch-*.json files,
  # the old `ls -t | head -1` (newest-file) lookup grabs whichever was written
  # last — mis-attributing the ledger row to the wrong story. The fix: extract
  # the work_item_id from the SubagentStop transcript (first user message) and
  # match it against the work_item_id field inside each .dispatch-*.json.
  # Fallback: if no tuple match, fall back to newest-file lookup with a warning.
  #
  # Atomicity: rename to .processed-$$ before reading, then delete post-row-write.
  # This prevents stale dispatch files from leaking attribution to a later subagent.
  SENTINEL_AGENT_TYPE=""
  SENTINEL_WORK_ITEM_ID=""
  DISPATCH_PROCESSED=""

  # BUG-029: extract work_item_id from the SubagentStop transcript (first user message).
  # This is the orchestrator's dispatch prompt — by convention it starts with the
  # work_item_id (e.g. "STORY=NNN-NN" or "STORY-NNN-NN") or contains it prominently.
  # We use non-capturing groups (no capture groups → scan returns full match string)
  # and a broad alphanumeric suffix to also match letter-suffix IDs like STORY-A, STORY-B
  # used in tests and fast-lane items (not just digit-keyed like the legacy path).
  TRANSCRIPT_WORK_ITEM=""
  if [[ -f "${TRANSCRIPT_PATH}" ]]; then
    # Primary: first user message, scan for work-item reference (TYPE[-=]ID).
    # scan("(?:...)+") with no capture groups returns the full match string.
    TRANSCRIPT_WORK_ITEM="$(jq -rs --arg banner_re "${BANNER_SKIP_RE}" '
      [.[] | select(.type == "user")]
      | [.[] | select(
          (.message.content | if type == "array"
            then map(.text? // "") | join(" ")
            else (. // "") end
          ) | test($banner_re) | not
        )]
      | .[0].message.content
      | if type == "array" then map(.text? // "") | join(" ") else (. // "") end
      | tostring
      | [scan("(?:STORY|PROPOSAL|EPIC|CR|BUG|HOTFIX)[-=][A-Za-z0-9]+(?:-[A-Za-z0-9]+)?")]
      | .[0] // ""
    ' "${TRANSCRIPT_PATH}" 2>/dev/null | head -1 | sed 's/=/-/g')"
    # Normalize: replace = with - (STORY=NNN-NN → STORY-NNN-NN)
    TRANSCRIPT_WORK_ITEM="$(printf '%s' "${TRANSCRIPT_WORK_ITEM}" | sed 's/=/-/g')"
    [[ "${TRANSCRIPT_WORK_ITEM}" == "" || "${TRANSCRIPT_WORK_ITEM}" == "null" ]] && TRANSCRIPT_WORK_ITEM=""
  fi

  # BUG-029: tuple-match — iterate dispatch files, find one whose work_item_id
  # matches TRANSCRIPT_WORK_ITEM. If exactly one matches, consume it; otherwise
  # fall back to newest-file (legacy CR-026 path) with a warning logged.
  DISPATCH_FILE=""
  if [[ -n "${TRANSCRIPT_WORK_ITEM}" ]]; then
    # Search all dispatch files for a content match on work_item_id.
    MATCHED_FILE=""
    MATCH_COUNT=0
    for CANDIDATE in "${SPRINT_DIR}"/.dispatch-*.json; do
      [[ -f "${CANDIDATE}" ]] || continue
      CANDIDATE_WORK_ITEM="$(jq -r '.work_item_id // empty' "${CANDIDATE}" 2>/dev/null)"
      if [[ "${CANDIDATE_WORK_ITEM}" == "${TRANSCRIPT_WORK_ITEM}" ]]; then
        MATCHED_FILE="${CANDIDATE}"
        MATCH_COUNT=$(( MATCH_COUNT + 1 ))
      fi
    done
    if [[ "${MATCH_COUNT}" -eq 1 ]]; then
      DISPATCH_FILE="${MATCHED_FILE}"
      printf '[%s] dispatch-marker tuple-match: transcript_work_item=%s → %s\n' \
        "$(date -u +%FT%TZ)" "${TRANSCRIPT_WORK_ITEM}" "${DISPATCH_FILE}" >> "${HOOK_LOG}"
    elif [[ "${MATCH_COUNT}" -gt 1 ]]; then
      printf '[%s] warn: %d dispatch files matched work_item=%s — falling back to newest-file\n' \
        "$(date -u +%FT%TZ)" "${MATCH_COUNT}" "${TRANSCRIPT_WORK_ITEM}" >> "${HOOK_LOG}"
    fi
  fi

  # Fallback: newest-file lookup (CR-026 path-B) when tuple-match found nothing.
  if [[ -z "${DISPATCH_FILE}" ]]; then
    if [[ -n "${TRANSCRIPT_WORK_ITEM}" ]]; then
      printf '[%s] warn: no tuple-match for work_item=%s — falling back to newest-file lookup\n' \
        "$(date -u +%FT%TZ)" "${TRANSCRIPT_WORK_ITEM}" >> "${HOOK_LOG}"
    fi
    DISPATCH_FILE="$(ls -t "${SPRINT_DIR}"/.dispatch-*.json 2>/dev/null | head -1)"
  fi

  if [[ -n "${DISPATCH_FILE}" && -f "${DISPATCH_FILE}" ]]; then
    DISPATCH_PROCESSED="${DISPATCH_FILE%.json}.processed-$$"
    if mv "${DISPATCH_FILE}" "${DISPATCH_PROCESSED}" 2>/dev/null; then
      DISPATCH_JSON="$(cat "${DISPATCH_PROCESSED}" 2>/dev/null)"
      DISPATCH_AGENT="$(printf '%s' "${DISPATCH_JSON}" | jq -r '.agent_type // empty' 2>/dev/null)"
      DISPATCH_WORK_ITEM="$(printf '%s' "${DISPATCH_JSON}" | jq -r '.work_item_id // empty' 2>/dev/null)"
      if [[ -n "${DISPATCH_AGENT}" && -n "${DISPATCH_WORK_ITEM}" ]]; then
        SENTINEL_AGENT_TYPE="${DISPATCH_AGENT}"
        SENTINEL_WORK_ITEM_ID="${DISPATCH_WORK_ITEM}"
        printf '[%s] dispatch-marker: session=%s work_item=%s agent=%s\n' \
          "$(date -u +%FT%TZ)" "${SESSION_ID}" "${SENTINEL_WORK_ITEM_ID}" "${SENTINEL_AGENT_TYPE}" >> "${HOOK_LOG}"
      else
        printf '[%s] warn: dispatch file malformed or missing fields, falling back: %s\n' \
          "$(date -u +%FT%TZ)" "${DISPATCH_PROCESSED}" >> "${HOOK_LOG}"
      fi
    else
      printf '[%s] warn: could not rename dispatch file %s (race?), skipping\n' \
        "$(date -u +%FT%TZ)" "${DISPATCH_FILE}" >> "${HOOK_LOG}"
    fi
  fi
  # DISPATCH_PROCESSED is deleted after row-write (see "delete processed dispatch" block below).

  # --- per-task sentinel: find newest .pending-task-*.json in sprint dir ---
  # Second-priority fallback when dispatch-marker is absent or malformed.
  # When dispatch-marker already populated SENTINEL_AGENT_TYPE + SENTINEL_WORK_ITEM_ID,
  # still read the pending-task sentinel to get turn_index + started_at for delta accounting.
  SENTINEL_FILE=""
  SENTINEL_TURN_INDEX=0
  SENTINEL_STARTED_AT=""
  # Preserve SENTINEL_AGENT_TYPE / SENTINEL_WORK_ITEM_ID from dispatch block above.

  if [[ -d "${SPRINT_DIR}" ]]; then
    # Find newest pending-task sentinel (ls -t sorts newest first)
    SENTINEL_FILE="$(ls -t "${SPRINT_DIR}"/.pending-task-*.json 2>/dev/null | head -1)"
  fi

  if [[ -n "${SENTINEL_FILE}" && -f "${SENTINEL_FILE}" ]]; then
    SENTINEL_JSON="$(cat "${SENTINEL_FILE}" 2>/dev/null)"
    # Only use attribution from pending-task if dispatch-marker did not already provide it.
    if [[ -z "${SENTINEL_AGENT_TYPE}" ]]; then
      SENTINEL_AGENT_TYPE="$(printf '%s' "${SENTINEL_JSON}" | jq -r '.agent_type // empty' 2>/dev/null)"
    fi
    if [[ -z "${SENTINEL_WORK_ITEM_ID}" ]]; then
      SENTINEL_WORK_ITEM_ID="$(printf '%s' "${SENTINEL_JSON}" | jq -r '.work_item_id // empty' 2>/dev/null)"
    fi
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
      for role in architect developer qa reporter devops cleargate-wiki-contradict; do
        if grep -qiE "\\b${role}\\b agent|role: ${role}|you are the ${role}" "${TRANSCRIPT_PATH}" 2>/dev/null; then
          AGENT_TYPE="${role}"
          break
        fi
      done
    fi
  fi

  if [[ -z "${WORK_ITEM_ID}" ]]; then
    # BUG-027: Before falling to transcript grep, attempt sentinel-aware lookups.
    #
    # Resolution order (cheapest/most-accurate first):
    #   Step 1 — Prior ledger row (Option A, M1 open decision):
    #     Read the most-recent row from ${LEDGER} (the file this hook appends to).
    #     Orchestrator-architect coordination calls happen AFTER a subagent dispatch that
    #     correctly tagged the active epic; reusing the last row's work_item_id is both
    #     cheap and accurate. This step is the primary fix for the 12 EPIC-001
    #     misattributions observed during the SPRINT-02 dogfood (BUG-027 context_source).
    #   Step 2 — Most-recent dispatch-marker log line:
    #     The hook emits "dispatch-marker: session=... work_item=... agent=..." to HOOK_LOG
    #     on every successful dispatch-file consumption. Reading the last such line gives
    #     accurate attribution for the same class of coordination calls.
    #   Step 3 (legacy) — First user message transcript scan (CR-026 banner-skip).
    #   Step 4 (last resort) — Anywhere-grep in transcript (CR-026 banner-skip).
    #
    # Steps 3+4 are kept as final fallbacks; the transcript grep is now the last resort,
    # not the primary path, which eliminates the EPIC-001 lexical-first misattribution.

    # Step 1: Read most-recent prior ledger row's work_item_id.
    PRIOR_LEDGER_WORK_ITEM=""
    if [[ -f "${LEDGER}" ]]; then
      PRIOR_LEDGER_WORK_ITEM="$(tail -1 "${LEDGER}" 2>/dev/null \
        | jq -r '.work_item_id // empty' 2>/dev/null)"
      # Only accept non-empty, non-"none", non-"unknown" values.
      if [[ -n "${PRIOR_LEDGER_WORK_ITEM}" && \
            "${PRIOR_LEDGER_WORK_ITEM}" != "none" && \
            "${PRIOR_LEDGER_WORK_ITEM}" != "unknown" && \
            "${PRIOR_LEDGER_WORK_ITEM}" != "null" ]]; then
        WORK_ITEM_ID="${PRIOR_LEDGER_WORK_ITEM}"
        printf '[%s] work_item_id from prior ledger row: %s\n' "$(date -u +%FT%TZ)" "${WORK_ITEM_ID}" >> "${HOOK_LOG}"
      fi
    fi

    # Step 2: Read most-recent dispatch-marker log line (if Step 1 did not resolve).
    if [[ -z "${WORK_ITEM_ID}" && -f "${HOOK_LOG}" ]]; then
      DISPATCH_MARKER_WORK_ITEM="$(grep -E '^\[.+\] dispatch-marker: ' "${HOOK_LOG}" 2>/dev/null \
        | tail -1 \
        | grep -oE 'work_item=[^ ]+' \
        | head -1 \
        | sed 's/work_item=//')"
      if [[ -n "${DISPATCH_MARKER_WORK_ITEM}" && \
            "${DISPATCH_MARKER_WORK_ITEM}" != "none" && \
            "${DISPATCH_MARKER_WORK_ITEM}" != "unknown" ]]; then
        WORK_ITEM_ID="${DISPATCH_MARKER_WORK_ITEM}"
        printf '[%s] work_item_id from dispatch-marker log: %s\n' "$(date -u +%FT%TZ)" "${WORK_ITEM_ID}" >> "${HOOK_LOG}"
      fi
    fi

    # Step 3: Legacy transcript scan — first user message (CR-026 banner-skip applied).
    # Only runs when Steps 1+2 did not resolve.
    if [[ -z "${WORK_ITEM_ID}" ]]; then
      # CR-026: banner-skip applied before jq scan (BUG-024 §3.1 Defect 2).
      # The SessionStart hook emits a banner line of the form:
      #   "N items blocked: BUG-004: ..."
      # This line poisons transcript-grep by matching the work-item regex first.
      # We skip it via select(. | test(BANNER_SKIP_RE) | not) in the jq pipeline.
      # BANNER_SKIP_RE is defined near the top of this script.
      WORK_ITEM_RAW="$(jq -rs --arg banner_re "${BANNER_SKIP_RE}" '
        [.[] | select(.type == "user")]
        | [.[] | select(
            (.message.content | if type == "array"
              then map(.text? // "") | join(" ")
              else (. // "") end
            ) | test($banner_re) | not
          )]
        | .[0].message.content
        | if type == "array" then map(.text? // "") | join(" ") else (. // "") end
        | tostring
        | scan("(STORY|PROPOSAL|EPIC|CR|BUG|HOTFIX)[-=]?([0-9]+(-[0-9]+)?)") | .[0:2] | join("-")
      ' "${TRANSCRIPT_PATH}" 2>/dev/null | head -1)"

      if [[ -n "${WORK_ITEM_RAW}" && "${WORK_ITEM_RAW}" != "null" && "${WORK_ITEM_RAW}" != "-" ]]; then
        WORK_ITEM_ID="$(printf '%s' "${WORK_ITEM_RAW}" | sed 's/=/-/g')"
      else
        # Step 4 (last resort): CR-026: fallback grep also applies banner-skip via sed filter.
        # This is the path that was misattributing EPIC-001 (BUG-027). Now reached only when
        # Steps 1+2+3 all fail to resolve a work_item_id.
        WORK_ITEM_ID="$(sed -E "/${BANNER_SKIP_RE}/d" "${TRANSCRIPT_PATH}" 2>/dev/null \
          | grep -oE '(STORY|PROPOSAL|EPIC|CR|BUG|HOTFIX)[-=]?[0-9]+(-[0-9]+)?' \
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

  # --- per-turn delta math (CR-018) ---
  # USAGE_JSON (computed above) is the intra-fire cumulative session total from the transcript.
  # We maintain .session-totals.json keyed by session_id with the last-known cumulative totals.
  # Cross-fire delta = current_session_total − prior_session_total.
  # For the first fire of a session, delta == session_total.
  #
  # Atomic update via mktemp + mv (POSIX rename is atomic on the same filesystem).
  # Concurrent-fire safety: two worktree SubagentStop fires may race. The atomic rename
  # ensures one writer wins; the other sees the updated file on its next read.
  SESSION_TOTALS_FILE="${SPRINT_DIR}/.session-totals.json"

  # Read current session totals (or empty object if file absent)
  PRIOR_SESSION_JSON="{}"
  if [[ -f "${SESSION_TOTALS_FILE}" ]]; then
    PRIOR_SESSION_JSON="$(cat "${SESSION_TOTALS_FILE}" 2>/dev/null || printf '{}')"
    [[ -z "${PRIOR_SESSION_JSON}" ]] && PRIOR_SESSION_JSON="{}"
  fi

  # Compute current intra-fire totals from USAGE_JSON
  CURRENT_IN="$(printf '%s' "${USAGE_JSON}" | jq -r '.input // 0')"
  CURRENT_OUT="$(printf '%s' "${USAGE_JSON}" | jq -r '.output // 0')"
  CURRENT_CC="$(printf '%s' "${USAGE_JSON}" | jq -r '.cache_creation // 0')"
  CURRENT_CR="$(printf '%s' "${USAGE_JSON}" | jq -r '.cache_read // 0')"
  CURRENT_MODEL="$(printf '%s' "${USAGE_JSON}" | jq -r '.model // ""')"
  CURRENT_TURNS="$(printf '%s' "${USAGE_JSON}" | jq -r '.turns // 0')"

  # Look up prior totals for this session_id
  PRIOR_IN="$(printf '%s' "${PRIOR_SESSION_JSON}" | jq -r --arg sid "${SESSION_ID}" '.[$sid].input // 0' 2>/dev/null || printf '0')"
  PRIOR_OUT="$(printf '%s' "${PRIOR_SESSION_JSON}" | jq -r --arg sid "${SESSION_ID}" '.[$sid].output // 0' 2>/dev/null || printf '0')"
  PRIOR_CC="$(printf '%s' "${PRIOR_SESSION_JSON}" | jq -r --arg sid "${SESSION_ID}" '.[$sid].cache_creation // 0' 2>/dev/null || printf '0')"
  PRIOR_CR="$(printf '%s' "${PRIOR_SESSION_JSON}" | jq -r --arg sid "${SESSION_ID}" '.[$sid].cache_read // 0' 2>/dev/null || printf '0')"

  # Compute delta = current − prior (floor at 0 to guard against transcript-reread edge cases)
  DELTA_IN=$(( CURRENT_IN - PRIOR_IN ))
  DELTA_OUT=$(( CURRENT_OUT - PRIOR_OUT ))
  DELTA_CC=$(( CURRENT_CC - PRIOR_CC ))
  DELTA_CR=$(( CURRENT_CR - PRIOR_CR ))
  [[ "${DELTA_IN}" -lt 0 ]] && DELTA_IN=0
  [[ "${DELTA_OUT}" -lt 0 ]] && DELTA_OUT=0
  [[ "${DELTA_CC}" -lt 0 ]] && DELTA_CC=0
  [[ "${DELTA_CR}" -lt 0 ]] && DELTA_CR=0

  # Build delta and session_total JSON blocks
  DELTA_JSON="$(jq -cn \
    --argjson in "${DELTA_IN}" \
    --argjson out "${DELTA_OUT}" \
    --argjson cc "${DELTA_CC}" \
    --argjson cr "${DELTA_CR}" \
    '{input: $in, output: $out, cache_creation: $cc, cache_read: $cr}')"

  SESSION_TOTAL_JSON="$(jq -cn \
    --argjson in "${CURRENT_IN}" \
    --argjson out "${CURRENT_OUT}" \
    --argjson cc "${CURRENT_CC}" \
    --argjson cr "${CURRENT_CR}" \
    '{input: $in, output: $out, cache_creation: $cc, cache_read: $cr}')"

  # Atomically update .session-totals.json with new totals for this session_id
  TS="$(date -u +%FT%TZ)"
  NEW_SESSION_TOTALS="$(printf '%s' "${PRIOR_SESSION_JSON}" | jq -c \
    --arg sid "${SESSION_ID}" \
    --argjson in "${CURRENT_IN}" \
    --argjson out "${CURRENT_OUT}" \
    --argjson cc "${CURRENT_CC}" \
    --argjson cr "${CURRENT_CR}" \
    --arg ts "${TS}" \
    --argjson ti "${SENTINEL_TURN_INDEX}" \
    '.[$sid] = {input: $in, output: $out, cache_creation: $cc, cache_read: $cr, last_ts: $ts, last_turn_index: $ti}' \
    2>/dev/null)"

  if [[ -n "${NEW_SESSION_TOTALS}" ]]; then
    SESSION_TOTALS_TMP="$(mktemp "${SESSION_TOTALS_FILE}.tmp.XXXXXX" 2>/dev/null)"
    if [[ -n "${SESSION_TOTALS_TMP}" ]]; then
      printf '%s\n' "${NEW_SESSION_TOTALS}" > "${SESSION_TOTALS_TMP}"
      mv "${SESSION_TOTALS_TMP}" "${SESSION_TOTALS_FILE}" 2>/dev/null || \
        printf '[%s] warn: could not atomic-rename session-totals\n' "${TS}" >> "${HOOK_LOG}"
    fi
  fi

  # --- assemble ledger row (v2 schema: delta + session_total replace flat input/output/cache_*) ---
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
    --argjson delta "${DELTA_JSON}" \
    --argjson session_total "${SESSION_TOTAL_JSON}" \
    --arg model "${CURRENT_MODEL}" \
    --argjson turns "${CURRENT_TURNS}" \
    '{ts: $ts, sprint_id: $sprint, story_id: $story, work_item_id: $work_item, agent_type: $agent, session_id: $session, transcript: $transcript, sentinel_started_at: $sentinel_started_at, delta_from_turn: $turn_index, delta: $delta, session_total: $session_total, model: $model, turns: $turns}')"

  printf '%s\n' "${ROW}" >> "${LEDGER}"
  printf '[%s] wrote row: sprint=%s agent=%s work_item=%s story=%s delta=in:%s/out:%s session_total=in:%s/out:%s delta_from=%s\n' \
    "${TS}" "${SPRINT_ID}" "${AGENT_TYPE}" "${WORK_ITEM_ID}" "${STORY_ID}" \
    "${DELTA_IN}" "${DELTA_OUT}" \
    "${CURRENT_IN}" "${CURRENT_OUT}" \
    "${SENTINEL_TURN_INDEX}" \
    >> "${HOOK_LOG}"

  # --- CR-036: Reporter token-budget warning (chat-injection per CR-032 pattern) ---
  if [[ "${AGENT_TYPE}" == "reporter" ]]; then
    REPORTER_TOTAL=$(( DELTA_IN + DELTA_OUT + DELTA_CC + DELTA_CR ))
    REPORTER_BUDGET_SOFT=200000
    REPORTER_BUDGET_HARD=500000
    if [[ "${REPORTER_TOTAL}" -gt "${REPORTER_BUDGET_HARD}" ]]; then
      printf '\n⚠️ Reporter token budget exceeded: %s > %s (HARD advisory)\n' \
        "${REPORTER_TOTAL}" "${REPORTER_BUDGET_HARD}"
      # Auto-flashcard via cleargate CLI (best-effort; never block)
      if command -v cleargate >/dev/null 2>&1; then
        cleargate flashcard record \
          "Reporter dispatch exceeded 500k tokens — investigate prompt or bundle" \
          >/dev/null 2>&1 || true
      fi
    elif [[ "${REPORTER_TOTAL}" -gt "${REPORTER_BUDGET_SOFT}" ]]; then
      printf '\n⚠️ Reporter token budget exceeded: %s > %s (soft warn)\n' \
        "${REPORTER_TOTAL}" "${REPORTER_BUDGET_SOFT}"
    fi
  fi

  # --- delete processed sentinel ---
  if [[ -n "${PROCESSED_FILE}" && -f "${PROCESSED_FILE}" ]]; then
    rm -f "${PROCESSED_FILE}"
  fi

  # --- delete processed dispatch file ---
  if [[ -n "${DISPATCH_PROCESSED:-}" && -f "${DISPATCH_PROCESSED}" ]]; then
    rm -f "${DISPATCH_PROCESSED}"
  fi
} 2>> "${HOOK_LOG}"

exit 0
