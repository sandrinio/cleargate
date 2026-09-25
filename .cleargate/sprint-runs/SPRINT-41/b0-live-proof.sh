#!/usr/bin/env bash
# SPRINT-41 barrier B0 proof (BUG-089 Task 6 / BUG-085 M0 step, owner ruling R3).
# Runs FRESH headless Claude Code sessions (`claude -p`) against throwaway fixture repos whose
# `.claude/` is a copy of this repo's re-synced LIVE `.claude/`. A fresh session reads the
# re-synced settings.json at startup, which the orchestrating session (hooks snapshotted at its
# own start) cannot. Fixtures are used so the real sprint sentinel is never altered
# (BUG-089 §2: "never alter this sprint's live sentinel for a test").
#
# Cases:
#   E1 negative  enforce mode, no active sprint, uncovered path → Write must be refused, file absent
#   E2 positive  default warn mode, same fixture              → Write lands, file present
#   D1 negative  active sprint + one unprocessed flashcard    → Agent spawn refused, no ledger row
#   D2 positive  same, card marked processed                  → Agent spawn runs; ledger row
#                                                              attributes agent_type=qa (identity)
# Evidence (stream-json transcripts, hook logs, ledgers) → b0/proof-<ts>/ (locally excluded).
set -uo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
RUN_DIR="${REPO}/.cleargate/sprint-runs/SPRINT-41"
TS="$(date -u +%Y%m%dT%H%M%SZ)"
EVID="${RUN_DIR}/b0/proof-${TS}"
MODEL="${B0_MODEL:-claude-haiku-4-5-20251001}"
mkdir -p "${EVID}"

make_fixture() { # $1 = name
  local fx; fx="$(mktemp -d "/tmp/b0-$1-XXXX")"
  git -C "${fx}" init -q
  mkdir -p "${fx}/.claude" "${fx}/.cleargate/delivery/pending-sync" "${fx}/.cleargate/sprint-runs" "${fx}/src"
  rsync -a --exclude settings.local.json --exclude worktrees --exclude scheduled_tasks.lock \
    "${REPO}/.claude/" "${fx}/.claude/"
  ln -s "${REPO}/cleargate-cli" "${fx}/cleargate-cli"   # hooks resolve cleargate-cli/dist/cli.js first
  printf '%s' "${fx}"
}

run_claude() { # $1 fixture, $2 case id, $3 prompt, rest: env assignments
  local fx="$1" id="$2" prompt="$3"; shift 3
  ( cd "${fx}" && env -u CLAUDE_PROJECT_DIR -u CLAUDECODE -u ORCHESTRATOR_PROJECT_DIR \
      -u CLEARGATE_ADVISORY -u SKIP_FLASHCARD_GATE -u CLEARGATE_PLANNING_BYPASS "$@" \
      claude -p "${prompt}" --model "${MODEL}" --permission-mode bypassPermissions \
      --output-format stream-json --verbose --max-turns 4 \
      > "${EVID}/${id}.stream.jsonl" 2> "${EVID}/${id}.stderr" )
  echo "exit=$?" > "${EVID}/${id}.exit"
}

verdict() { printf '%-3s %-8s %s\n' "$1" "$2" "$3" | tee -a "${EVID}/summary.txt"; }

# ── E1 / E2: planning-first edit gate ─────────────────────────────────────────
FX_E="$(make_fixture edit)"
run_claude "${FX_E}" E1 "Use the Write tool exactly once to create src/uncovered.ts containing the single line: export const x = 1; Do not retry and do not use any other tool. Then reply DONE." CLEARGATE_PLANNING_GATE_MODE=enforce
if [ ! -e "${FX_E}/src/uncovered.ts" ] && grep -q '"is_error":true' "${EVID}/E1.stream.jsonl"; then
  verdict E1 PASS "enforce-mode uncovered Write refused; file absent"
else
  verdict E1 FAIL "file present=$([ -e "${FX_E}/src/uncovered.ts" ] && echo yes || echo no)"
fi
cp -R "${FX_E}/.cleargate/hook-log" "${EVID}/E1-hook-log" 2>/dev/null || true
run_claude "${FX_E}" E2 "Use the Write tool exactly once to create src/allowed.ts containing the single line: export const y = 2; Then reply DONE."
if [ -e "${FX_E}/src/allowed.ts" ]; then
  verdict E2 PASS "default warn-mode Write permitted; file present"
else
  verdict E2 FAIL "positive control: file absent"
fi
cp -R "${FX_E}/.cleargate/hook-log" "${EVID}/E2-hook-log" 2>/dev/null || true

# ── D1 / D2: flashcard dispatch gate + dispatch identity ─────────────────────
FX_D="$(make_fixture dispatch)"
SPR="${FX_D}/.cleargate/sprint-runs/SPRINT-FX"
mkdir -p "${SPR}/reports"
printf 'SPRINT-FX\n' > "${FX_D}/.cleargate/sprint-runs/.active"
printf '{"schema_version":3,"sprint_id":"SPRINT-FX","sprint_status":"Active","stories":{}}\n' > "${SPR}/state.json"
CARD='2026-09-25 · #b0 · pending fixture card'
printf 'flashcards_flagged:\n  - "%s"\n' "${CARD}" > "${SPR}/reports/STORY-FX-dev.md"
AGENT_PROMPT='Use the Agent tool exactly once with subagent_type "qa" and the prompt "Reply with exactly the word OK and nothing else. Do not use any tools." Do not retry and do not use any other tool. Then reply DONE.'
run_claude "${FX_D}" D1 "${AGENT_PROMPT}"
if grep -q 'FLASHCARD GATE BLOCKED' "${EVID}/D1.stream.jsonl" && [ ! -s "${SPR}/token-ledger.jsonl" ]; then
  verdict D1 PASS "Agent spawn refused with FLASHCARD GATE BLOCKED; no subagent ledger row"
else
  verdict D1 FAIL "block text present=$(grep -c 'FLASHCARD GATE BLOCKED' "${EVID}/D1.stream.jsonl"); ledger rows=$(wc -l < "${SPR}/token-ledger.jsonl" 2>/dev/null || echo 0)"
fi
HASH="$(printf '%s' "${CARD}" | shasum -a 1 | cut -c1-12)"
touch "${SPR}/.processed-${HASH}"
run_claude "${FX_D}" D2 "${AGENT_PROMPT}"
cp "${SPR}/token-ledger.jsonl" "${EVID}/D2-token-ledger.jsonl" 2>/dev/null || true
if [ -s "${SPR}/token-ledger.jsonl" ] && tail -1 "${SPR}/token-ledger.jsonl" | grep -q '"agent_type":"qa"'; then
  verdict D2 PASS "Agent spawn permitted after processing; ledger row agent_type=qa"
else
  verdict D2 FAIL "ledger tail: $(tail -1 "${SPR}/token-ledger.jsonl" 2>/dev/null | cut -c1-200)"
fi

# ── Live hashes at proof time ────────────────────────────────────────────────
( cd "${REPO}/.claude" && shasum -a 256 settings.json hooks/pre-edit-gate.sh hooks/pending-task-sentinel.sh \
    hooks/pre-tool-use-task.sh hooks/token-ledger.sh ) > "${EVID}/live-hashes.txt"
echo "fixtures: ${FX_E} ${FX_D}" >> "${EVID}/summary.txt"
echo "evidence: ${EVID}"
grep -q FAIL "${EVID}/summary.txt" && exit 1 || exit 0
