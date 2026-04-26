#!/usr/bin/env bash
# test_token_ledger.sh — BUG-009: table-driven bash tests for token-ledger.sh
#
# Verifies work_item_id detection across all supported id shapes including
# PROP=NNN / PROP-NNN normalization to PROPOSAL-NNN (BUG-009, 2026-04-26).
#
# Per FLASHCARD 2026-04-21 #test-harness #hooks #sed: use env injection, not sed-surgery.
#
# Usage: bash cleargate-cli/test/scripts/test_token_ledger.sh
# Exit code: 0 = all pass, 1 = failures.

set -u

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
HOOK="${REPO_ROOT}/cleargate-planning/.claude/hooks/token-ledger.sh"
PASS=0
FAIL=0
ERRORS=()

# ─── Helpers ──────────────────────────────────────────────────────────────────

# Make a minimal JSONL transcript with one user message and one assistant turn.
make_transcript() {
  local first_user_msg="$1"
  local user_turn
  local asst_turn
  user_turn="$(printf '{"type":"user","message":{"content":%s}}' \
    "$(printf '%s' "${first_user_msg}" | jq -Rs '.')")"
  asst_turn='{"type":"assistant","message":{"content":"response","model":"claude-sonnet-4-6","usage":{"input_tokens":100,"output_tokens":50,"cache_creation_input_tokens":0,"cache_read_input_tokens":0}}}'
  printf '%s\n%s\n' "${user_turn}" "${asst_turn}"
}

# Run the hook with a synthetic transcript and return the last row's work_item_id.
# Args: $1=tmpdir, $2=transcript_content, $3=sprint_id (empty = no sentinel)
run_hook_and_get_work_item() {
  local tmpdir="$1"
  local transcript="$2"
  local sprint_id="${3:-}"

  # Write transcript file
  local transcript_file="${tmpdir}/transcript.jsonl"
  printf '%s' "${transcript}" > "${transcript_file}"

  # Set up .cleargate/sprint-runs structure
  local sprint_runs_dir="${tmpdir}/.cleargate/sprint-runs"
  mkdir -p "${sprint_runs_dir}"
  if [[ -n "${sprint_id}" ]]; then
    printf '%s' "${sprint_id}" > "${sprint_runs_dir}/.active"
    mkdir -p "${sprint_runs_dir}/${sprint_id}"
  fi
  mkdir -p "${tmpdir}/.cleargate/hook-log"

  # Build hook input payload
  local payload
  payload="$(printf '{"session_id":"test-session-001","transcript_path":"%s","hook_event_name":"SubagentStop"}' \
    "${transcript_file}")"

  # Run the hook — env injection (FLASHCARD 2026-04-21 #test-harness #hooks #sed)
  CLAUDE_PROJECT_DIR="${tmpdir}" bash "${HOOK}" <<< "${payload}" 2>/dev/null

  # Extract work_item_id from the last row of the appropriate ledger
  local ledger_dir
  if [[ -n "${sprint_id}" ]]; then
    ledger_dir="${sprint_runs_dir}/${sprint_id}"
  else
    ledger_dir="${sprint_runs_dir}/_off-sprint"
  fi

  local ledger="${ledger_dir}/token-ledger.jsonl"
  if [[ -f "${ledger}" ]]; then
    # Get last line's work_item_id
    tail -1 "${ledger}" | jq -r '.work_item_id // ""'
  else
    printf ''
  fi
}

assert_work_item() {
  local name="$1"
  local expected="$2"
  local actual="$3"

  if [[ "${actual}" == "${expected}" ]]; then
    printf '  ✓ %s\n' "${name}"
    PASS=$((PASS + 1))
  else
    printf '  ✗ %s (expected "%s", got "%s")\n' "${name}" "${expected}" "${actual}"
    FAIL=$((FAIL + 1))
    ERRORS+=("${name}")
  fi
}

# ─── Tests ────────────────────────────────────────────────────────────────────

printf '\n'
printf 'BUG-009 token-ledger.sh tests\n'
printf '=================================\n'

# ── Case 1: STORY=014-01 → STORY-014-01 (regression baseline) ────────────────
assert_work_item "Case 1: STORY=014-01 → STORY-014-01 (regression baseline)" "STORY-014-01" "$(
  tmpdir=$(mktemp -d)
  transcript=$(make_transcript "STORY=014-01 You are the Developer agent.")
  run_hook_and_get_work_item "${tmpdir}" "${transcript}" "SPRINT-14"
  rm -rf "${tmpdir}"
)"

# ── Case 2: CR=008 → CR-008 (regression baseline) ───────────────────────────
assert_work_item "Case 2: CR=008 → CR-008 (regression baseline)" "CR-008" "$(
  tmpdir=$(mktemp -d)
  transcript=$(make_transcript "CR=008 You are the Developer agent.")
  run_hook_and_get_work_item "${tmpdir}" "${transcript}" "SPRINT-14"
  rm -rf "${tmpdir}"
)"

# ── Case 3: BUG=009 → BUG-009 (regression baseline) ─────────────────────────
assert_work_item "Case 3: BUG=009 → BUG-009 (regression baseline)" "BUG-009" "$(
  tmpdir=$(mktemp -d)
  transcript=$(make_transcript "BUG=009 You are the Developer agent.")
  run_hook_and_get_work_item "${tmpdir}" "${transcript}" "SPRINT-14"
  rm -rf "${tmpdir}"
)"

# ── Case 4: EPIC=022 → EPIC-022 (regression baseline) ───────────────────────
assert_work_item "Case 4: EPIC=022 → EPIC-022 (regression baseline)" "EPIC-022" "$(
  tmpdir=$(mktemp -d)
  transcript=$(make_transcript "EPIC=022 You are processing an epic.")
  run_hook_and_get_work_item "${tmpdir}" "${transcript}" "SPRINT-14"
  rm -rf "${tmpdir}"
)"

# ── Case 5: PROPOSAL=013 → PROPOSAL-013 (canonical form) ────────────────────
assert_work_item "Case 5: PROPOSAL=013 → PROPOSAL-013 (canonical)" "PROPOSAL-013" "$(
  tmpdir=$(mktemp -d)
  transcript=$(make_transcript "PROPOSAL=013 You are reviewing a proposal.")
  run_hook_and_get_work_item "${tmpdir}" "${transcript}" "SPRINT-14"
  rm -rf "${tmpdir}"
)"

# ── Case 6: PROP=012 → PROPOSAL-012 (NEW — PROP normalised to PROPOSAL) ─────
assert_work_item "Case 6: PROP=012 → PROPOSAL-012 (PROP normalised to canonical PROPOSAL)" "PROPOSAL-012" "$(
  tmpdir=$(mktemp -d)
  transcript=$(make_transcript "PROP=012 You are reviewing a proposal.")
  run_hook_and_get_work_item "${tmpdir}" "${transcript}" "SPRINT-14"
  rm -rf "${tmpdir}"
)"

# ── Case 7: PROP-013 → PROPOSAL-013 (NEW — PROP-NNN form normalised) ────────
assert_work_item "Case 7: PROP-013 → PROPOSAL-013 (PROP-NNN form normalised)" "PROPOSAL-013" "$(
  tmpdir=$(mktemp -d)
  transcript=$(make_transcript "PROP-013 You are reviewing a proposal.")
  run_hook_and_get_work_item "${tmpdir}" "${transcript}" "SPRINT-14"
  rm -rf "${tmpdir}"
)"

# ── Case 8: CR-010 dash form → CR-010 ────────────────────────────────────────
assert_work_item "Case 8: CR-010 (dash form) → CR-010" "CR-010" "$(
  tmpdir=$(mktemp -d)
  transcript=$(make_transcript "CR-010 You are the Developer agent.")
  run_hook_and_get_work_item "${tmpdir}" "${transcript}" "SPRINT-14"
  rm -rf "${tmpdir}"
)"

# ── Case 9: Negative — no id token → empty / legacy fallback ─────────────────
# Per existing hook behaviour, when no recognised id is found, the legacy fallback
# produces "none" for STORY_ID and sets WORK_ITEM_ID accordingly.
_tmpdir9=$(mktemp -d)
_transcript9=$(make_transcript "Hello, I have no work item identifier in this message.")
_result9=$(run_hook_and_get_work_item "${_tmpdir9}" "${_transcript9}" "SPRINT-14")
rm -rf "${_tmpdir9}"
# Accept either "" or "none" — both are valid "no id found" signals from the hook
if [[ "${_result9}" == "" || "${_result9}" == "none" ]]; then
  printf '  ✓ Case 9: no id → empty/none (negative case)\n'
  PASS=$((PASS + 1))
else
  printf '  ✗ Case 9: no id → expected "" or "none", got "%s"\n' "${_result9}"
  FAIL=$((FAIL + 1))
  ERRORS+=("Case 9: no id fallback")
fi

# ── Case 10: Sprint routing — sentinel SPRINT-14 → row in SPRINT-14 dir ──────
_tmpdir10=$(mktemp -d)
_transcript10=$(make_transcript "BUG=009 You are the Developer agent.")
_sprint_runs_dir10="${_tmpdir10}/.cleargate/sprint-runs"
mkdir -p "${_sprint_runs_dir10}"
printf 'SPRINT-14' > "${_sprint_runs_dir10}/.active"
mkdir -p "${_sprint_runs_dir10}/SPRINT-14"
mkdir -p "${_tmpdir10}/.cleargate/hook-log"
_transcript_file10="${_tmpdir10}/transcript.jsonl"
printf '%s' "${_transcript10}" > "${_transcript_file10}"
_payload10="$(printf '{"session_id":"test-sprint-routing","transcript_path":"%s","hook_event_name":"SubagentStop"}' \
  "${_transcript_file10}")"
CLAUDE_PROJECT_DIR="${_tmpdir10}" bash "${HOOK}" <<< "${_payload10}" 2>/dev/null

_ledger10="${_sprint_runs_dir10}/SPRINT-14/token-ledger.jsonl"
_off_sprint_ledger10="${_sprint_runs_dir10}/_off-sprint/token-ledger.jsonl"

_sprint14_has_row=0
_off_sprint_has_row=0
[[ -f "${_ledger10}" ]] && _sprint14_has_row=1
[[ -f "${_off_sprint_ledger10}" ]] && _off_sprint_has_row=1

rm -rf "${_tmpdir10}"

if [[ "${_sprint14_has_row}" -eq 1 && "${_off_sprint_has_row}" -eq 0 ]]; then
  printf '  ✓ Case 10: SPRINT-14 sentinel → row in SPRINT-14, NOT _off-sprint\n'
  PASS=$((PASS + 1))
else
  printf '  ✗ Case 10: sprint routing failed (sprint14_row=%s off_sprint_row=%s)\n' \
    "${_sprint14_has_row}" "${_off_sprint_has_row}"
  FAIL=$((FAIL + 1))
  ERRORS+=("Case 10: sprint routing")
fi

# ─── Summary ──────────────────────────────────────────────────────────────────

printf '\n'
printf 'Results: %d passed, %d failed\n' "${PASS}" "${FAIL}"
if [[ ${FAIL} -gt 0 ]]; then
  printf 'Failed cases:\n'
  for e in "${ERRORS[@]}"; do
    printf '  - %s\n' "${e}"
  done
  exit 1
fi
exit 0
