#!/usr/bin/env bash
# cr077_eviction.red.sh — CR-077 QA-Red eviction grep test.
#
# RED: fails against clean baseline — the EPIC-028 policy tokens (node:test,
# vitest, check:no-vitest, tsx --test, node.test.ts) are still present in the
# three scoped agent files + gate-checks.json + sprint_context.md template.
# GREEN: passes after Developer evicts those policy tokens (M1 §5b / §7.2).
#
# SCOPE NARROWED per M1 plan §5b + §7.2:
#   - Grep ONLY the three §3-scoped agents + gate-checks.json + sprint_context.md
#     (NOT bare 'cleargate-cli' token — it legitimately appears in devops/reporter/
#      wiki agents as meta-repo path references and in qa.md:98/116 + architect.md:64
#      as meta-repo runtime-lane heuristics; asserting zero there forces deleting
#      correct framework content — see M1 plan §7 Risk 2).
#   - The gate-checks.json IS in scope because its `cd cleargate-cli` literal IS
#     the F6 leak.
#
# Mirrors the test_prep_qa_context.sh bash-harness pattern
# (.cleargate/scripts/test/ shape, mktemp-free since we read live files).
# macOS bash 3.2 portable.
#
# Exit 0 = PASS (all assertions pass); exit 1 = one or more FAIL.
set -uo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"

PASS=0
FAIL=0

pass() {
  echo "PASS: $1"
  PASS=$((PASS + 1))
}

fail() {
  echo "FAIL: $1"
  echo "      detail: $2"
  FAIL=$((FAIL + 1))
}

# ── File paths (absolute) ─────────────────────────────────────────────────────
DEVELOPER_MD="${REPO_ROOT}/cleargate-planning/.claude/agents/developer.md"
QA_MD="${REPO_ROOT}/cleargate-planning/.claude/agents/qa.md"
ARCHITECT_MD="${REPO_ROOT}/cleargate-planning/.claude/agents/architect.md"
GATE_CHECKS="${REPO_ROOT}/cleargate-planning/.cleargate/scripts/gate-checks.json"
SPRINT_CONTEXT_TEMPLATE="${REPO_ROOT}/cleargate-planning/.cleargate/templates/sprint_context.md"

# ── Guard: verify scoped files exist ─────────────────────────────────────────
for f in "$DEVELOPER_MD" "$QA_MD" "$ARCHITECT_MD" "$GATE_CHECKS" "$SPRINT_CONTEXT_TEMPLATE"; do
  if [[ ! -f "$f" ]]; then
    fail "scoped file exists" "MISSING: $f"
  fi
done

# ── Scenario: EPIC-028 policy tokens evicted from scoped files ───────────────
#
# Tokens: node:test | vitest | check:no-vitest | tsx --test | node.test.ts
# (the bare 'cleargate-cli' token is EXCLUDED from this grep — see SCOPE note above)
#
# Expected result after Developer implements CR-077: ZERO matches.
# Right now (clean baseline) this returns matches → the test FAILS RED.

MATCH_COUNT=$(grep -rniE \
  "node:test|vitest|check:no-vitest|tsx --test|node\.test\.ts" \
  "$DEVELOPER_MD" \
  "$QA_MD" \
  "$ARCHITECT_MD" \
  "$GATE_CHECKS" \
  "$SPRINT_CONTEXT_TEMPLATE" \
  2>/dev/null | wc -l | tr -d '[:space:]')

if [[ "$MATCH_COUNT" -eq 0 ]]; then
  pass "eviction grep — zero EPIC-028 policy tokens in scoped files"
else
  # Print the actual matches to help the Developer understand what remains
  MATCH_LINES=$(grep -rniE \
    "node:test|vitest|check:no-vitest|tsx --test|node\.test\.ts" \
    "$DEVELOPER_MD" \
    "$QA_MD" \
    "$ARCHITECT_MD" \
    "$GATE_CHECKS" \
    "$SPRINT_CONTEXT_TEMPLATE" \
    2>/dev/null | head -20)
  fail "eviction grep — EPIC-028 policy tokens still present (expect ZERO, got ${MATCH_COUNT})" \
    "First matches:
${MATCH_LINES}"
fi

# ── Sub-scenario: gate-checks.json specifically has no "cd cleargate-cli" ────
# The F6 literal must be gone from the shipped payload gate-checks.json.
CD_CLI_COUNT=$(grep -c "cd cleargate-cli" "$GATE_CHECKS" 2>/dev/null || echo "0")
if [[ "$CD_CLI_COUNT" -eq 0 ]]; then
  pass "gate-checks.json — no 'cd cleargate-cli' F6 literal in shipped payload"
else
  fail "gate-checks.json — F6 literal 'cd cleargate-cli' still present (count: ${CD_CLI_COUNT})" \
    "$(grep -n "cd cleargate-cli" "$GATE_CHECKS")"
fi

# ── Sub-scenario: sprint_context.md template has a ## Test Stack block ───────
# The template must contain the structured test-stack block introduced by CR-077 §3b.
if grep -q "## Test Stack" "$SPRINT_CONTEXT_TEMPLATE" 2>/dev/null; then
  pass "sprint_context.md template — ## Test Stack block present"
else
  fail "sprint_context.md template — ## Test Stack block MISSING" \
    "grep '## Test Stack' returned no match in ${SPRINT_CONTEXT_TEMPLATE}"
fi

# ── Summary ───────────────────────────────────────────────────────────────────
echo ""
echo "cr077_eviction.red.sh: ${PASS} passed, ${FAIL} failed"
if [[ "$FAIL" -gt 0 ]]; then
  exit 1
fi
exit 0
