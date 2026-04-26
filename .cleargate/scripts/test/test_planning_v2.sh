#!/usr/bin/env bash
# test_planning_v2.sh — STORY-013-09 Gherkin scenario verification
# Verifies Sprint Planning v2 contract: decomposition signals, Gate 2 enforcement, dry-run DoD.
# All tests are grep-based (no runtime deps). Exit 0 = all pass, non-zero = failure count.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
PASS=0
FAIL=0

pass() { echo "  PASS: $1"; PASS=$((PASS + 1)); }
fail() { echo "  FAIL: $1"; FAIL=$((FAIL + 1)); }

echo "=== STORY-013-09 Sprint Planning v2 Tests ==="
echo

# ---------------------------------------------------------------------------
# Scenario 1: Story template carries new fields on both surfaces
# ---------------------------------------------------------------------------
echo "Scenario 1: Story template has parallel_eligible + expected_bounce_exposure"

LIVE_STORY="$REPO_ROOT/.cleargate/templates/story.md"
MIRROR_STORY="$REPO_ROOT/cleargate-planning/.cleargate/templates/story.md"

for f in "$LIVE_STORY" "$MIRROR_STORY"; do
  label="$(basename "$(dirname "$f")")/$(basename "$f")"
  if grep -q 'parallel_eligible: "y"' "$f"; then
    pass "$label: parallel_eligible default 'y' present"
  else
    fail "$label: parallel_eligible default 'y' missing"
  fi
  if grep -q 'expected_bounce_exposure: "low"' "$f"; then
    pass "$label: expected_bounce_exposure default 'low' present"
  else
    fail "$label: expected_bounce_exposure default 'low' missing"
  fi
done

# Both surfaces byte-identical
if diff -q "$LIVE_STORY" "$MIRROR_STORY" > /dev/null 2>&1; then
  pass "story.md live == planning mirror (byte-identical)"
else
  fail "story.md live != planning mirror (diff detected)"
fi

echo

# ---------------------------------------------------------------------------
# Scenario 2: Sprint Plan Template §2 exists + new columns on both surfaces
# ---------------------------------------------------------------------------
echo "Scenario 2: Sprint Plan Template §2 Execution Strategy + new columns"

LIVE_SPT="$REPO_ROOT/.cleargate/templates/Sprint Plan Template.md"
MIRROR_SPT="$REPO_ROOT/cleargate-planning/.cleargate/templates/Sprint Plan Template.md"

for f in "$LIVE_SPT" "$MIRROR_SPT"; do
  label="$(basename "$(dirname "$f")")/$(basename "$f")"
  if grep -q '^## 2. Execution Strategy' "$f"; then
    pass "$label: '## 2. Execution Strategy' section present"
  else
    fail "$label: '## 2. Execution Strategy' section missing"
  fi
  if grep -q 'Parallel?' "$f"; then
    pass "$label: 'Parallel?' column header present"
  else
    fail "$label: 'Parallel?' column header missing"
  fi
  if grep -q 'Bounce Exposure' "$f"; then
    pass "$label: 'Bounce Exposure' column header present"
  else
    fail "$label: 'Bounce Exposure' column header missing"
  fi
  if grep -q 'execution_mode:' "$f"; then
    pass "$label: execution_mode frontmatter field present"
  else
    fail "$label: execution_mode frontmatter field missing"
  fi
done

if diff -q "$LIVE_SPT" "$MIRROR_SPT" > /dev/null 2>&1; then
  pass "Sprint Plan Template live == planning mirror (byte-identical)"
else
  fail "Sprint Plan Template live != planning mirror (diff detected)"
fi

echo

# ---------------------------------------------------------------------------
# Scenario 3 + 4: Gate 2 v2 enforcement — grep protocol.md for required prose
# ---------------------------------------------------------------------------
echo "Scenario 3+4: Protocol §2 Gate 2 v2 enforcement prose"

LIVE_PROTO="$REPO_ROOT/.cleargate/knowledge/cleargate-protocol.md"
MIRROR_PROTO="$REPO_ROOT/cleargate-planning/.cleargate/knowledge/cleargate-protocol.md"

for f in "$LIVE_PROTO" "$MIRROR_PROTO"; do
  label="$(basename "$(dirname "$f")")/$(basename "$f")"

  # execution_mode: "v2" mentioned in Gate 2 context
  if grep -q 'execution_mode.*v2' "$f"; then
    pass "$label: 'execution_mode.*v2' present in Gate 2 context"
  else
    fail "$label: 'execution_mode.*v2' missing"
  fi

  # 🔴 High ambiguity blocking rule
  if grep -q '🔴' "$f"; then
    pass "$label: '🔴' emoji present (block rule)"
  else
    fail "$label: '🔴' emoji missing from Gate 2 block rule"
  fi

  # human_override: true override path
  if grep -q 'human_override: true' "$f"; then
    pass "$label: 'human_override: true' present (override path)"
  else
    fail "$label: 'human_override: true' missing"
  fi

  # Gate 2 cited in the v2 rule
  if grep -q 'Gate 2' "$f"; then
    pass "$label: 'Gate 2' referenced in v2 rule"
  else
    fail "$label: 'Gate 2' not referenced"
  fi
done

if diff -q "$LIVE_PROTO" "$MIRROR_PROTO" > /dev/null 2>&1; then
  pass "cleargate-protocol.md live == planning mirror (byte-identical)"
else
  fail "cleargate-protocol.md live != planning mirror (diff detected)"
fi

echo

# ---------------------------------------------------------------------------
# Scenario 5: Architect contract + dry-run file
# ---------------------------------------------------------------------------
echo "Scenario 5: Architect Sprint Design Review contract + dry-run DoD"

LIVE_ARCH="$REPO_ROOT/.claude/agents/architect.md"
MIRROR_ARCH="$REPO_ROOT/cleargate-planning/.claude/agents/architect.md"
DRYRUN="$REPO_ROOT/.cleargate/sprint-runs/S-09/sprint-10-design-review-dryrun.md"

for f in "$LIVE_ARCH" "$MIRROR_ARCH"; do
  label="$(basename "$(dirname "$f")")/$(basename "$f")"
  if grep -q '^## Sprint Design Review' "$f"; then
    pass "$label: '## Sprint Design Review' section present"
  else
    fail "$label: '## Sprint Design Review' section missing"
  fi
  if grep -q '2b8477ab' "$f"; then
    pass "$label: V-Bounce pinned SHA present"
  else
    fail "$label: V-Bounce pinned SHA missing"
  fi
done

if diff -q "$LIVE_ARCH" "$MIRROR_ARCH" > /dev/null 2>&1; then
  pass "architect.md live == planning mirror (byte-identical)"
else
  fail "architect.md live != planning mirror (diff detected)"
fi

# Dry-run file existence
if [ -f "$DRYRUN" ]; then
  pass "sprint-10-design-review-dryrun.md exists"
else
  fail "sprint-10-design-review-dryrun.md MISSING"
fi

# Dry-run has all 4 subsections
for subsection in "### 2.1 Phase Plan" "### 2.2 Merge Ordering" "### 2.3 Shared-Surface Warnings" "### 2.4 ADR-Conflict Flags"; do
  if grep -qF "$subsection" "$DRYRUN"; then
    pass "dry-run contains: $subsection"
  else
    fail "dry-run missing: $subsection"
  fi
done

# Dry-run has DRY-RUN ONLY header
if grep -q 'DRY-RUN ONLY' "$DRYRUN"; then
  pass "dry-run has 'DRY-RUN ONLY' header (not auto-promoted)"
else
  fail "dry-run missing 'DRY-RUN ONLY' header"
fi

echo
# ---------------------------------------------------------------------------
# STORY-022-03 Scenario 1: Sprint Plan Template has Lane column + §2.4 Lane Audit
# ---------------------------------------------------------------------------
echo "STORY-022-03 Scenario 1: Sprint Plan Template Lane column + §2.4 Lane Audit"

for f in "$LIVE_SPT" "$MIRROR_SPT"; do
  label="$(basename "$(dirname "$f")")/$(basename "$f")"
  if grep -q '| Lane |' "$f"; then
    pass "$label: '| Lane |' column header present in §1 table"
  else
    fail "$label: '| Lane |' column header missing from §1 table"
  fi
  if grep -q '^### 2.4 Lane Audit' "$f"; then
    pass "$label: '### 2.4 Lane Audit' subsection present"
  else
    fail "$label: '### 2.4 Lane Audit' subsection missing"
  fi
  if grep -q '### 2.5 ADR-Conflict Flags' "$f"; then
    pass "$label: '### 2.5 ADR-Conflict Flags' (renumbered from 2.4) present"
  else
    fail "$label: '### 2.5 ADR-Conflict Flags' renumbering missing"
  fi
done

echo

# ---------------------------------------------------------------------------
# STORY-022-03 Scenario 2: story.md frontmatter declares lane field
# ---------------------------------------------------------------------------
echo "STORY-022-03 Scenario 2: story.md frontmatter has lane: \"standard\" + documentation"

for f in "$LIVE_STORY" "$MIRROR_STORY"; do
  label="$(basename "$(dirname "$f")")/$(basename "$f")"
  if grep -q 'lane: "standard"' "$f"; then
    pass "$label: 'lane: \"standard\"' default present in frontmatter"
  else
    fail "$label: 'lane: \"standard\"' missing from frontmatter"
  fi
  if grep -q 'protocol §24' "$f"; then
    pass "$label: lane field documented with protocol §24 reference"
  else
    fail "$label: lane field documentation (protocol §24 reference) missing"
  fi
done

echo

echo "=== Results: $PASS passed, $FAIL failed ==="

if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
exit 0
