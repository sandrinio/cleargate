#!/usr/bin/env bash
# test_interrupt_contract.sh
# Gherkin grep-based contract tests for STORY-013-05: Orchestrator Interrupt Handling
# All scenarios verify markdown structure only — no runtime behavior.
# Exit 0 = all pass; exit 1 = one or more failures.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
DEVELOPER_MD="${REPO_ROOT}/.claude/agents/developer.md"
ARCHITECT_MD="${REPO_ROOT}/.claude/agents/architect.md"
PROTOCOL_MD="${REPO_ROOT}/.cleargate/knowledge/cleargate-protocol.md"

PASS=0
FAIL=0

check() {
  local description="$1"
  local file="$2"
  local pattern="$3"
  if grep -q "$pattern" "$file"; then
    echo "PASS: $description"
    PASS=$((PASS + 1))
  else
    echo "FAIL: $description"
    echo "      pattern: $pattern"
    echo "      file:    $file"
    FAIL=$((FAIL + 1))
  fi
}

# ---------------------------------------------------------------------------
# Scenario 1: Circuit breaker on runaway Developer
# developer.md has ## Circuit Breaker section and all three Blockers Report sections
# ---------------------------------------------------------------------------

check \
  "Scenario 1a: developer.md contains ## Circuit Breaker section" \
  "$DEVELOPER_MD" \
  "^## Circuit Breaker"

check \
  "Scenario 1b: developer.md Circuit Breaker includes ## Test-Pattern section" \
  "$DEVELOPER_MD" \
  "## Test-Pattern"

check \
  "Scenario 1c: developer.md Circuit Breaker includes ## Spec-Gap section" \
  "$DEVELOPER_MD" \
  "## Spec-Gap"

check \
  "Scenario 1d: developer.md Circuit Breaker includes ## Environment section" \
  "$DEVELOPER_MD" \
  "## Environment"

check \
  "Scenario 1e: developer.md Blockers Report path is sprint-runs not .cleargate/reports" \
  "$DEVELOPER_MD" \
  "sprint-runs/<id>/reports/"

# ---------------------------------------------------------------------------
# Scenario 2: User walkthrough splits enhancement from bug
# protocol.md §16 exists with UR:review-feedback and UR:bug tokens
# ---------------------------------------------------------------------------

check \
  "Scenario 2a: protocol.md contains ## 16. User Walkthrough on Sprint Branch (v2)" \
  "$PROTOCOL_MD" \
  "^## 16\. User Walkthrough on Sprint Branch (v2)"

check \
  "Scenario 2b: protocol.md §16 contains UR:review-feedback event type" \
  "$PROTOCOL_MD" \
  "UR:review-feedback"

check \
  "Scenario 2c: protocol.md §16 contains UR:bug event type" \
  "$PROTOCOL_MD" \
  "UR:bug"

check \
  "Scenario 2d: protocol.md §16 states UR:review-feedback does NOT increment Bug-Fix Tax" \
  "$PROTOCOL_MD" \
  "Does NOT increment Bug-Fix Tax"

check \
  "Scenario 2e: protocol.md §16 states UR:bug DOES increment Bug-Fix Tax" \
  "$PROTOCOL_MD" \
  "DOES increment Bug-Fix Tax"

# ---------------------------------------------------------------------------
# Scenario 3: Mid-sprint change request classified
# protocol.md §17 exists with all four CR event types and bounce-counter effects
# architect.md has ## Blockers Triage with three category routings
# ---------------------------------------------------------------------------

check \
  "Scenario 3a: protocol.md contains ## 17. Mid-Sprint Change Request Triage (v2)" \
  "$PROTOCOL_MD" \
  "^## 17\. Mid-Sprint Change Request Triage (v2)"

check \
  "Scenario 3b: protocol.md §17 contains CR:bug event type" \
  "$PROTOCOL_MD" \
  "CR:bug"

check \
  "Scenario 3c: protocol.md §17 contains CR:spec-clarification event type" \
  "$PROTOCOL_MD" \
  "CR:spec-clarification"

check \
  "Scenario 3d: protocol.md §17 contains CR:scope-change event type" \
  "$PROTOCOL_MD" \
  "CR:scope-change"

check \
  "Scenario 3e: protocol.md §17 contains CR:approach-change event type" \
  "$PROTOCOL_MD" \
  "CR:approach-change"

check \
  "Scenario 3f: architect.md contains ## Blockers Triage section" \
  "$ARCHITECT_MD" \
  "^## Blockers Triage"

check \
  "Scenario 3g: architect.md Blockers Triage contains test-pattern routing" \
  "$ARCHITECT_MD" \
  "test-pattern"

check \
  "Scenario 3h: architect.md Blockers Triage contains spec-gap routing" \
  "$ARCHITECT_MD" \
  "spec-gap"

check \
  "Scenario 3i: architect.md Blockers Triage contains environment routing" \
  "$ARCHITECT_MD" \
  "environment"

# ---------------------------------------------------------------------------
# Three-surface landing: mirrors byte-identical
# ---------------------------------------------------------------------------

PLANNING_ROOT="${REPO_ROOT}/cleargate-planning"

if diff -q \
  "${REPO_ROOT}/.claude/agents/developer.md" \
  "${PLANNING_ROOT}/.claude/agents/developer.md" > /dev/null 2>&1; then
  echo "PASS: Three-surface landing — developer.md mirrors byte-identical"
  PASS=$((PASS + 1))
else
  echo "FAIL: Three-surface landing — developer.md mirrors differ"
  FAIL=$((FAIL + 1))
fi

if diff -q \
  "${REPO_ROOT}/.claude/agents/architect.md" \
  "${PLANNING_ROOT}/.claude/agents/architect.md" > /dev/null 2>&1; then
  echo "PASS: Three-surface landing — architect.md mirrors byte-identical"
  PASS=$((PASS + 1))
else
  echo "FAIL: Three-surface landing — architect.md mirrors differ"
  FAIL=$((FAIL + 1))
fi

if diff -q \
  "${REPO_ROOT}/.cleargate/knowledge/cleargate-protocol.md" \
  "${PLANNING_ROOT}/.cleargate/knowledge/cleargate-protocol.md" > /dev/null 2>&1; then
  echo "PASS: Three-surface landing — cleargate-protocol.md mirrors byte-identical"
  PASS=$((PASS + 1))
else
  echo "FAIL: Three-surface landing — cleargate-protocol.md mirrors differ"
  FAIL=$((FAIL + 1))
fi

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------

echo ""
echo "Results: ${PASS} passed, ${FAIL} failed"

if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
exit 0
