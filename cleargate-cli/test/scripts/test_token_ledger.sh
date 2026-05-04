#!/usr/bin/env bash
# test_token_ledger.sh — BUG-009 + BUG-010: table-driven bash tests for token-ledger.sh
#
# BUG-009 (2026-04-26): Verifies PROP=NNN / PROP-NNN normalization to PROPOSAL-NNN.
# BUG-010 (2026-04-26): Verifies line-anchored dispatch-marker detection so that
#   SessionStart "blocked items" reminder text does NOT pollute work_item_id.
#   Cases 11-18 (BUG-010 regression cases). Fixtures under test/scripts/fixtures/.
#
# Per FLASHCARD 2026-04-21 #test-harness #hooks #sed: use env injection, not sed-surgery.
#
# Usage: bash cleargate-cli/test/scripts/test_token_ledger.sh
# Exit code: 0 = all pass, 1 = failures.

set -u

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
HOOK="${REPO_ROOT}/cleargate-planning/.claude/hooks/token-ledger.sh"
FIXTURES_DIR="${REPO_ROOT}/cleargate-cli/test/scripts/fixtures"
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

# Run the hook with a pre-built fixture transcript file and return work_item_id.
# Args: $1=tmpdir, $2=fixture_file_path, $3=sprint_id (empty = no sentinel)
run_hook_from_fixture() {
  local tmpdir="$1"
  local fixture_file="$2"
  local sprint_id="${3:-}"

  # Set up .cleargate/sprint-runs structure
  local sprint_runs_dir="${tmpdir}/.cleargate/sprint-runs"
  mkdir -p "${sprint_runs_dir}"
  if [[ -n "${sprint_id}" ]]; then
    printf '%s' "${sprint_id}" > "${sprint_runs_dir}/.active"
    mkdir -p "${sprint_runs_dir}/${sprint_id}"
  fi
  mkdir -p "${tmpdir}/.cleargate/hook-log"

  # Build hook input payload pointing at the fixture file
  local payload
  payload="$(printf '{"session_id":"test-session-bug010","transcript_path":"%s","hook_event_name":"SubagentStop"}' \
    "${fixture_file}")"

  # Run the hook — env injection (FLASHCARD 2026-04-21 #test-harness #hooks #sed)
  CLAUDE_PROJECT_DIR="${tmpdir}" bash "${HOOK}" <<< "${payload}" 2>/dev/null

  # Extract work_item_id from the ledger
  local ledger_dir
  if [[ -n "${sprint_id}" ]]; then
    ledger_dir="${sprint_runs_dir}/${sprint_id}"
  else
    ledger_dir="${sprint_runs_dir}/_off-sprint"
  fi

  local ledger="${ledger_dir}/token-ledger.jsonl"
  if [[ -f "${ledger}" ]]; then
    tail -1 "${ledger}" | jq -r '.work_item_id // ""'
  else
    printf ''
  fi
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

# Run the hook with a pre-built transcript carrying specific usage numbers.
# Writes a sentinel with agent_type to set AGENT_TYPE via dispatch lookup.
# Args: $1=tmpdir, $2=agent_type, $3=input_tokens, $4=output_tokens, $5=cache_creation, $6=cache_read
# Returns: hook stdout (budget warning lines)
run_hook_with_usage() {
  local tmpdir="$1"
  local agent_type="$2"
  local in_tokens="$3"
  local out_tokens="$4"
  local cc_tokens="$5"
  local cr_tokens="$6"
  local extra_path="${7:-}"

  local sprint_id="SPRINT-TEST-$$"
  local sprint_runs_dir="${tmpdir}/.cleargate/sprint-runs"
  local sprint_dir="${sprint_runs_dir}/${sprint_id}"
  mkdir -p "${sprint_dir}"
  printf '%s' "${sprint_id}" > "${sprint_runs_dir}/.active"
  mkdir -p "${tmpdir}/.cleargate/hook-log"

  # Write a sentinel so AGENT_TYPE is picked up without transcript-grep
  local sentinel_file="${sprint_dir}/.pending-task-1.json"
  printf '{"agent_type":"%s","work_item_id":"%s","turn_index":0,"started_at":"2026-01-01T00:00:00Z"}' \
    "${agent_type}" "${sprint_id}" > "${sentinel_file}"

  # Write a minimal transcript with the requested usage numbers
  local transcript_file="${tmpdir}/transcript-usage.jsonl"
  printf '{"type":"user","message":{"content":"CR-036 %s"}}\n' "${agent_type}" > "${transcript_file}"
  printf '{"type":"assistant","message":{"content":"ok","model":"claude-opus-4-5","usage":{"input_tokens":%s,"output_tokens":%s,"cache_creation_input_tokens":%s,"cache_read_input_tokens":%s}}}\n' \
    "${in_tokens}" "${out_tokens}" "${cc_tokens}" "${cr_tokens}" >> "${transcript_file}"

  local payload
  payload="$(printf '{"session_id":"cr036-test-session","transcript_path":"%s","hook_event_name":"SubagentStop"}' \
    "${transcript_file}")"

  if [[ -n "${extra_path}" ]]; then
    PATH="${extra_path}:${PATH}" CLAUDE_PROJECT_DIR="${tmpdir}" bash "${HOOK}" <<< "${payload}" 2>/dev/null
  else
    CLAUDE_PROJECT_DIR="${tmpdir}" bash "${HOOK}" <<< "${payload}" 2>/dev/null
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

assert_contains() {
  local name="$1"
  local needle="$2"
  local haystack="$3"

  if printf '%s' "${haystack}" | grep -qF "${needle}"; then
    printf '  ✓ %s\n' "${name}"
    PASS=$((PASS + 1))
  else
    printf '  ✗ %s (expected to contain "%s", got: "%s")\n' "${name}" "${needle}" "${haystack}"
    FAIL=$((FAIL + 1))
    ERRORS+=("${name}")
  fi
}

assert_not_contains() {
  local name="$1"
  local needle="$2"
  local haystack="$3"

  if ! printf '%s' "${haystack}" | grep -qF "${needle}"; then
    printf '  ✓ %s\n' "${name}"
    PASS=$((PASS + 1))
  else
    printf '  ✗ %s (expected NOT to contain "%s", but it did)\n' "${name}" "${needle}"
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

# ─── BUG-010 Cases ────────────────────────────────────────────────────────────
# These cases verify that a SessionStart "blocked items" reminder (listing BUG-002,
# BUG-003, CR-005, etc. in bullet lines starting with "- ") does NOT pollute the
# work_item_id. Only lines whose FIRST CHARACTER starts the dispatch-marker prefix
# are considered. The orchestrator convention places the dispatch marker on the very
# first line of the dispatch prompt (e.g. "CR=009\n...").
#
# Fixture transcripts are at cleargate-cli/test/scripts/fixtures/transcript-bug-010-*.jsonl
# Each fixture has: SessionStart reminder block (with BUG-002 listed first) → blank line
# → dispatch line (e.g. CR=009) → rest of dispatch prompt.
#
# PRE-FIX (BUG-009 state): all these would return "BUG-002" (the bug).
# POST-FIX (BUG-010 state): each returns the dispatch-line marker (the fix).

printf '\n'
printf 'BUG-010 token-ledger.sh tests (line-anchored dispatch-marker detection)\n'
printf '=========================================================================\n'

# ── BUG-010 Case 11 (R-BUG-002 regression): reminder + CR=009 → CR-009 ────────
assert_work_item "BUG-010 Case 11: SessionStart reminder + CR=009 → CR-009 (not BUG-002)" "CR-009" "$(
  tmpdir=$(mktemp -d)
  run_hook_from_fixture "${tmpdir}" "${FIXTURES_DIR}/transcript-bug-010-case1-cr009.jsonl" "SPRINT-14"
  rm -rf "${tmpdir}"
)"

# ── BUG-010 Case 12: reminder + STORY=014-01 → STORY-014-01 ──────────────────
assert_work_item "BUG-010 Case 12: SessionStart reminder + STORY=014-01 → STORY-014-01" "STORY-014-01" "$(
  tmpdir=$(mktemp -d)
  run_hook_from_fixture "${tmpdir}" "${FIXTURES_DIR}/transcript-bug-010-case2-story014.jsonl" "SPRINT-14"
  rm -rf "${tmpdir}"
)"

# ── BUG-010 Case 13: reminder + BUG=008 → BUG-008 ────────────────────────────
assert_work_item "BUG-010 Case 13: SessionStart reminder + BUG=008 → BUG-008 (not BUG-002)" "BUG-008" "$(
  tmpdir=$(mktemp -d)
  run_hook_from_fixture "${tmpdir}" "${FIXTURES_DIR}/transcript-bug-010-case3-bug008.jsonl" "SPRINT-14"
  rm -rf "${tmpdir}"
)"

# ── BUG-010 Case 14: reminder + EPIC=022 → EPIC-022 ──────────────────────────
assert_work_item "BUG-010 Case 14: SessionStart reminder + EPIC=022 → EPIC-022" "EPIC-022" "$(
  tmpdir=$(mktemp -d)
  run_hook_from_fixture "${tmpdir}" "${FIXTURES_DIR}/transcript-bug-010-case4-epic022.jsonl" "SPRINT-14"
  rm -rf "${tmpdir}"
)"

# ── BUG-010 Case 15: reminder + PROPOSAL=013 → PROPOSAL-013 ──────────────────
assert_work_item "BUG-010 Case 15: SessionStart reminder + PROPOSAL=013 → PROPOSAL-013" "PROPOSAL-013" "$(
  tmpdir=$(mktemp -d)
  run_hook_from_fixture "${tmpdir}" "${FIXTURES_DIR}/transcript-bug-010-case5-proposal013.jsonl" "SPRINT-14"
  rm -rf "${tmpdir}"
)"

# ── BUG-010 Case 16: reminder + PROP=013 → PROPOSAL-013 (BUG-009 normalize) ──
assert_work_item "BUG-010 Case 16: SessionStart reminder + PROP=013 → PROPOSAL-013 (BUG-009 preserved)" "PROPOSAL-013" "$(
  tmpdir=$(mktemp -d)
  run_hook_from_fixture "${tmpdir}" "${FIXTURES_DIR}/transcript-bug-010-case6-prop013.jsonl" "SPRINT-14"
  rm -rf "${tmpdir}"
)"

# ── BUG-010 Case 17 (negative): ONLY SessionStart reminder, no dispatch line ──
# With the fix, the primary jq finds no line-start marker and returns empty.
# The fallback grep (now line-anchored) also finds nothing in the JSONL (reminder
# items are "- BUG-002:" mid-line, not line-start). Legacy STORY fallback also
# finds nothing. Final result: "none" (per hook's STORY_ID="none" fallback).
# This is an intentional behavior change from BUG-009 (which returned "BUG-002").
# The old BUG-009 behavior was itself incorrect (it was the bug being fixed).
_tmpdir17=$(mktemp -d)
_result17=$(run_hook_from_fixture "${_tmpdir17}" "${FIXTURES_DIR}/transcript-bug-010-case7-no-dispatch.jsonl" "SPRINT-14")
rm -rf "${_tmpdir17}"
if [[ "${_result17}" == "" || "${_result17}" == "none" ]]; then
  printf '  ✓ BUG-010 Case 17: no dispatch line → empty/none (fallback, no false-positive)\n'
  PASS=$((PASS + 1))
else
  printf '  ✗ BUG-010 Case 17: no dispatch line → expected "" or "none", got "%s"\n' "${_result17}"
  FAIL=$((FAIL + 1))
  ERRORS+=("BUG-010 Case 17: no dispatch line fallback")
fi

# ── BUG-010 Case 18 (tie-break): multiple dispatch markers → first line wins ──
# Tie-break rule: when multiple lines in the first user message start with a
# dispatch-marker prefix, the FIRST such line is used. This matches the orchestrator
# convention of placing the primary dispatch marker on the very first line.
assert_work_item "BUG-010 Case 18: multiple dispatch markers → first (STORY-014-01) wins" "STORY-014-01" "$(
  tmpdir=$(mktemp -d)
  run_hook_from_fixture "${tmpdir}" "${FIXTURES_DIR}/transcript-bug-010-case8-multi-dispatch.jsonl" "SPRINT-14"
  rm -rf "${tmpdir}"
)"

# ─── CR-036 Budget Warning Tests ──────────────────────────────────────────────
# Tests for the reporter token-budget warning block added by CR-036.
# Usage numbers: input=50000, output=50000, cc=0, cr=<varies>
# DELTA_IN + DELTA_OUT + DELTA_CC + DELTA_CR = total

printf '\n'
printf 'CR-036 reporter token-budget warning tests\n'
printf '=============================================\n'

# ── CR-036 Case 19: reporter row, total < 200k → no budget line ──────────────
# total = 50000 + 50000 + 0 + 80000 = 180000 (< 200k)
_cr036_tmpdir19=$(mktemp -d)
_cr036_out19=$(run_hook_with_usage "${_cr036_tmpdir19}" "reporter" 50000 50000 0 80000)
rm -rf "${_cr036_tmpdir19}"
assert_not_contains \
  "CR-036 Case 19: reporter row total=180k → no budget warning" \
  "Reporter token budget exceeded" \
  "${_cr036_out19}"

# ── CR-036 Case 20: reporter row, 200k < total < 500k → soft-warn line ───────
# total = 50000 + 50000 + 0 + 200000 = 300000 (> 200k, < 500k)
_cr036_tmpdir20=$(mktemp -d)
_cr036_out20=$(run_hook_with_usage "${_cr036_tmpdir20}" "reporter" 50000 50000 0 200000)
rm -rf "${_cr036_tmpdir20}"
assert_contains \
  "CR-036 Case 20: reporter row total=300k → soft warn line" \
  "(soft warn)" \
  "${_cr036_out20}"
assert_not_contains \
  "CR-036 Case 20: reporter row total=300k → not HARD advisory" \
  "(HARD advisory)" \
  "${_cr036_out20}"

# ── CR-036 Case 21: reporter row, total > 500k → hard-advisory + flashcard ───
# total = 50000 + 50000 + 0 + 500000 = 600000 (> 500k)
# Use stub-cleargate-cli on PATH so flashcard invocation is recorded
_cr036_tmpdir21=$(mktemp -d)
_cr036_stub_log="${_cr036_tmpdir21}/stub-invocations.log"
export CLEARGATE_STUB_LOG="${_cr036_stub_log}"
_cr036_out21=$(run_hook_with_usage "${_cr036_tmpdir21}" "reporter" 50000 50000 0 500000 \
  "${FIXTURES_DIR}/stub-cleargate-cli")
unset CLEARGATE_STUB_LOG
assert_contains \
  "CR-036 Case 21: reporter row total=600k → HARD advisory line" \
  "(HARD advisory)" \
  "${_cr036_out21}"
# Verify stub was called (flashcard invocation)
_cr036_stub_called=0
if [[ -f "${_cr036_stub_log}" ]] && grep -q "flashcard" "${_cr036_stub_log}"; then
  _cr036_stub_called=1
fi
if [[ "${_cr036_stub_called}" -eq 1 ]]; then
  printf '  ✓ CR-036 Case 21: cleargate flashcard stub was invoked on HARD advisory\n'
  PASS=$((PASS + 1))
else
  printf '  ✗ CR-036 Case 21: cleargate flashcard stub NOT invoked (stub_log=%s, exists=%s)\n' \
    "${_cr036_stub_log}" "$(test -f "${_cr036_stub_log}" && echo yes || echo no)"
  FAIL=$((FAIL + 1))
  ERRORS+=("CR-036 Case 21: flashcard stub not invoked")
fi
rm -rf "${_cr036_tmpdir21}"

# ── CR-036 Case 22: non-reporter row over budget → no warning ────────────────
# same 600k usage but agent_type=developer → no budget warning
_cr036_tmpdir22=$(mktemp -d)
_cr036_out22=$(run_hook_with_usage "${_cr036_tmpdir22}" "developer" 50000 50000 0 500000)
rm -rf "${_cr036_tmpdir22}"
assert_not_contains \
  "CR-036 Case 22: developer row total=600k → no Reporter budget warning" \
  "Reporter token budget" \
  "${_cr036_out22}"

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
