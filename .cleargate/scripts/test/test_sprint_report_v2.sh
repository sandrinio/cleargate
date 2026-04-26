#!/usr/bin/env bash
# test_sprint_report_v2.sh — STORY-022-03 Gherkin scenario 3 verification
# Verifies sprint_report.md template v2 contract: template_version bump, six new §3 metrics,
# §5 Lane Audit + Hotfix Audit + Hotfix Trend subsections, LD vocabulary registration.
# All tests are grep-based (no runtime deps). Exit 0 = all pass, non-zero = failure count.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
PASS=0
FAIL=0

pass() { echo "  PASS: $1"; PASS=$((PASS + 1)); }
fail() { echo "  FAIL: $1"; FAIL=$((FAIL + 1)); }

echo "=== STORY-022-03 Sprint Report v2 Template Tests ==="
echo

LIVE_SR="$REPO_ROOT/.cleargate/templates/sprint_report.md"
MIRROR_SR="$REPO_ROOT/cleargate-planning/.cleargate/templates/sprint_report.md"

# ---------------------------------------------------------------------------
# Scenario 3: sprint_report.md gains §3 metrics + §5 Process tables + Hotfix Trend
#             + version bump + LD vocabulary
# ---------------------------------------------------------------------------
echo "Scenario 3: sprint_report.md v2 contract"

for f in "$LIVE_SR" "$MIRROR_SR"; do
  label="$(basename "$(dirname "$f")")/$(basename "$f")"

  # template_version: 2 in frontmatter
  if grep -q 'template_version: 2' "$f"; then
    pass "$label: 'template_version: 2' present in frontmatter"
  else
    fail "$label: 'template_version: 2' missing from frontmatter"
  fi

  # LD vocabulary in header comment block
  if grep -q 'Lane-Demotion: LD' "$f"; then
    pass "$label: 'Lane-Demotion: LD' vocabulary entry present"
  else
    fail "$label: 'Lane-Demotion: LD' vocabulary entry missing"
  fi

  # Six new §3 metric rows
  if grep -q '^| Fast-Track Ratio |' "$f"; then
    pass "$label: '| Fast-Track Ratio |' metric row present"
  else
    fail "$label: '| Fast-Track Ratio |' metric row missing"
  fi

  if grep -q '^| Fast-Track Demotion Rate |' "$f"; then
    pass "$label: '| Fast-Track Demotion Rate |' metric row present"
  else
    fail "$label: '| Fast-Track Demotion Rate |' metric row missing"
  fi

  if grep -q '^| Hotfix Count (sprint window) |' "$f"; then
    pass "$label: '| Hotfix Count (sprint window) |' metric row present"
  else
    fail "$label: '| Hotfix Count (sprint window) |' metric row missing"
  fi

  if grep -q '^| Hotfix-to-Story Ratio |' "$f"; then
    pass "$label: '| Hotfix-to-Story Ratio |' metric row present"
  else
    fail "$label: '| Hotfix-to-Story Ratio |' metric row missing"
  fi

  if grep -q '^| Hotfix Cap Breaches |' "$f"; then
    pass "$label: '| Hotfix Cap Breaches |' metric row present"
  else
    fail "$label: '| Hotfix Cap Breaches |' metric row missing"
  fi

  if grep -q '^| LD events |' "$f"; then
    pass "$label: '| LD events |' metric row present"
  else
    fail "$label: '| LD events |' metric row missing"
  fi

  # §5 Lane Audit table skeleton
  if grep -q '^### Lane Audit' "$f"; then
    pass "$label: '### Lane Audit' subsection present"
  else
    fail "$label: '### Lane Audit' subsection missing"
  fi

  # §5 Hotfix Audit table skeleton
  if grep -q '^### Hotfix Audit' "$f"; then
    pass "$label: '### Hotfix Audit' subsection present"
  else
    fail "$label: '### Hotfix Audit' subsection missing"
  fi

  # §5 Hotfix Trend narrative placeholder
  if grep -q '^### Hotfix Trend' "$f"; then
    pass "$label: '### Hotfix Trend' subsection present"
  else
    fail "$label: '### Hotfix Trend' subsection missing"
  fi

  # Hotfix Trend has the TBD marker for Reporter
  if grep -q 'TBD: Reporter fills at sprint close' "$f"; then
    pass "$label: Hotfix Trend has 'TBD: Reporter fills at sprint close' marker"
  else
    fail "$label: Hotfix Trend missing 'TBD: Reporter fills at sprint close' marker"
  fi
done

echo

# ---------------------------------------------------------------------------
# Scenario 4: Scaffold mirror byte-equality
# ---------------------------------------------------------------------------
echo "Scenario 4: scaffold mirror byte-equality"

if diff -q "$LIVE_SR" "$MIRROR_SR" > /dev/null 2>&1; then
  pass "sprint_report.md live == planning mirror (byte-identical)"
else
  fail "sprint_report.md live != planning mirror (diff detected)"
fi

echo

echo "=== Results: $PASS passed, $FAIL failed ==="

if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
exit 0
