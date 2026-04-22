#!/usr/bin/env bash
# test_architect_numbering.sh — STORY-014-09 acceptance
# 4 grep-based scenarios verifying architect.md + story.md prose edits.

set -uo pipefail

REPO_ROOT="${CLEARGATE_REPO_ROOT:-$(cd "$(dirname "$0")/../../.." && pwd)}"
ARCHITECT_LIVE="${REPO_ROOT}/.claude/agents/architect.md"
ARCHITECT_SCAFFOLD="${REPO_ROOT}/cleargate-planning/.claude/agents/architect.md"
STORY_LIVE="${REPO_ROOT}/.cleargate/templates/story.md"
STORY_SCAFFOLD="${REPO_ROOT}/cleargate-planning/.cleargate/templates/story.md"

fail=0
pass=0
run() {
  local name="$1"; shift
  if "$@" >/dev/null 2>&1; then
    printf '  ✅ %s\n' "$name"
    pass=$((pass + 1))
  else
    printf '  ❌ %s\n' "$name"
    fail=$((fail + 1))
  fi
}

echo "Scenario 1: architect.md has Protocol Numbering Resolver section"
run "live has section"     grep -q "^## Protocol Numbering Resolver" "$ARCHITECT_LIVE"
run "scaffold has section" grep -q "^## Protocol Numbering Resolver" "$ARCHITECT_SCAFFOLD"

echo "Scenario 2: section names the grep command"
run "live cites grep"     grep -q 'grep -n "\^## \[0-9\]"' "$ARCHITECT_LIVE"
run "scaffold cites grep" grep -q 'grep -n "\^## \[0-9\]"' "$ARCHITECT_SCAFFOLD"

echo "Scenario 3: story.md Granularity Rubric names L3+high-exposure split rule"
run "live names rule"     grep -q "complexity_label: L3.*expected_bounce_exposure: high" "$STORY_LIVE"
run "scaffold names rule" grep -q "complexity_label: L3.*expected_bounce_exposure: high" "$STORY_SCAFFOLD"

echo "Scenario 4: existing L4-split rule still present"
run "live retains L4 rule"     grep -q "L4 is a planning smell" "$STORY_LIVE"
run "scaffold retains L4 rule" grep -q "L4 is a planning smell" "$STORY_SCAFFOLD"

echo
echo "Scenario 5: three-surface diff empty"
if ! diff -q "$ARCHITECT_LIVE" "$ARCHITECT_SCAFFOLD" >/dev/null 2>&1; then
  echo "  ❌ architect.md drift between live + scaffold:"
  diff "$ARCHITECT_LIVE" "$ARCHITECT_SCAFFOLD" | head -6
  fail=$((fail + 1))
else
  echo "  ✅ architect.md live ↔ scaffold"
  pass=$((pass + 1))
fi

if ! diff -q "$STORY_LIVE" "$STORY_SCAFFOLD" >/dev/null 2>&1; then
  echo "  ❌ story.md drift between live + scaffold:"
  diff "$STORY_LIVE" "$STORY_SCAFFOLD" | head -6
  fail=$((fail + 1))
else
  echo "  ✅ story.md live ↔ scaffold"
  pass=$((pass + 1))
fi

echo
echo "Results: ${pass} passed, ${fail} failed"
exit $fail
