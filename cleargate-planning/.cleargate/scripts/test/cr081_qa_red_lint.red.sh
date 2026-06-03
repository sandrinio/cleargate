#!/usr/bin/env bash
# cr081_qa_red_lint.red.sh — CR-081 QA-Red semantic-fixture lint harness.
#
# RED: fails against clean baseline — qa_red_lint.mjs does not yet exist,
# pre_gate_runner.sh has no qa_red_lint invocation, and qa.md has no
# red-now-green clause. All six scenarios therefore FAIL.
# GREEN: passes after Developer implements CR-081 (qa_red_lint.mjs created,
# pre_gate_runner.sh wired, qa.md red-now-green clause added).
#
# Scenarios (per M3 plan CR-081 §test / dispatch §Scenarios):
#   1. R-enum positive:   fixture with out-of-set literal → exit non-zero + R-enum message
#   2. R-query positive:  fixture with duplicate-text queryByText → exit non-zero + R-query message
#   3. Negative — clean: valid literal + unique query → exit 0 (no false positive)
#   4. Negative — NON-APPLICABLE (CRITICAL): plain node:test (assert-based, no Pydantic
#      Literal, no queryByText) shaped like CR-082's own close-gate test → exit 0.
#      Proves qa_red_lint won't phantom-flag CR-082's own *.red.node.test.ts when it goes live.
#   5. Wiring grep: grep -q "qa_red_lint" .cleargate/scripts/pre_gate_runner.sh
#   6. qa.md red-now-green clause grep
#
# Self-cleaning: trap EXIT removes any mktemp fixture dirs.
# macOS bash 3.2 portable.
# FLASHCARD #test-harness #bash 2026-06-03: use grep -q (not grep -c || echo 0).
# FLASHCARD #pre-gate #live-on-merge #qa-red-lint 2026-06-04: Class-3 pre-gate
#   checks MUST exit 0 on non-applicable files (plain node:test, no Pydantic/RTL).
#
# Exit 0 = PASS (all scenarios pass); exit non-zero = one or more FAIL.
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../../.." && pwd)"

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

# ── Constants ─────────────────────────────────────────────────────────────────
LINT_SCRIPT="${REPO_ROOT}/.cleargate/scripts/qa_red_lint.mjs"
PRE_GATE_SCRIPT="${REPO_ROOT}/.cleargate/scripts/pre_gate_runner.sh"
QA_MD="${REPO_ROOT}/cleargate-planning/.claude/agents/qa.md"

# ── Fixture temp dirs — tracked for cleanup ───────────────────────────────────
FIXTURE_DIR_ENUM=""
FIXTURE_DIR_QUERY=""
FIXTURE_DIR_CLEAN=""
FIXTURE_DIR_NONAPPLICABLE=""

cleanup() {
  [[ -n "${FIXTURE_DIR_ENUM}"          ]] && rm -rf "${FIXTURE_DIR_ENUM}"
  [[ -n "${FIXTURE_DIR_QUERY}"         ]] && rm -rf "${FIXTURE_DIR_QUERY}"
  [[ -n "${FIXTURE_DIR_CLEAN}"         ]] && rm -rf "${FIXTURE_DIR_CLEAN}"
  [[ -n "${FIXTURE_DIR_NONAPPLICABLE}" ]] && rm -rf "${FIXTURE_DIR_NONAPPLICABLE}"
}
trap cleanup EXIT

# ── Pre-check: qa_red_lint.mjs must exist for scenarios 1-4 ──────────────────
# On clean baseline it does NOT exist → scenarios 1-4 fail with "script absent".
LINT_PRESENT=0
if [[ -f "${LINT_SCRIPT}" ]]; then
  LINT_PRESENT=1
fi

# ═════════════════════════════════════════════════════════════════════════════
# SCENARIO 1: R-enum positive
# A fixture with an out-of-set Literal — mirrors DeckSpec(theme="dark") against
# Literal["technical-dark","business-warm","minimal-light"].
# We write a .py file with BOTH the Literal declaration AND the bad constructor
# call statically visible, plus a .ts mirror with a TS string-union + bad prop.
# Expected: qa_red_lint.mjs exits NON-ZERO and stderr mentions "dark" + R-enum.
# ═════════════════════════════════════════════════════════════════════════════
echo "--- Scenario 1: R-enum positive ---"

FIXTURE_DIR_ENUM="$(mktemp -d)"

# Python fixture: Literal declaration + out-of-set constructor call
cat > "${FIXTURE_DIR_ENUM}/deck_spec_fixture.red.node.test.ts" << 'PYEOF'
# fixture: deck_spec with invalid enum literal
# Simulates a QA-Red test that constructs a typed model with a bad literal.
#
# Pydantic-style Literal declaration (statically visible in this file):
#   theme: Literal["technical-dark", "business-warm", "minimal-light"]
#
# Constructor call with out-of-set value (R-enum violation):
#   DeckSpec(theme="dark")   # "dark" is NOT in ["technical-dark","business-warm","minimal-light"]

from typing import Literal
from pydantic import BaseModel

class DeckSpec(BaseModel):
    theme: Literal["technical-dark", "business-warm", "minimal-light"]

# This is the bad fixture line — "dark" is NOT a valid member of the Literal set.
spec = DeckSpec(theme="dark")  # R-enum: "dark" not in Literal set
PYEOF

if [[ "${LINT_PRESENT}" -eq 0 ]]; then
  fail "scenario-1-r-enum-positive" \
    "qa_red_lint.mjs absent at ${LINT_SCRIPT} — cannot run; baseline FAIL as expected (RED)"
else
  LINT_OUT="$(node "${LINT_SCRIPT}" "${FIXTURE_DIR_ENUM}" 2>&1)" || LINT_EXIT=$?
  LINT_EXIT="${LINT_EXIT:-0}"
  if [[ "${LINT_EXIT}" -ne 0 ]] && echo "${LINT_OUT}" | grep -qi "dark"; then
    pass "scenario-1-r-enum-positive — exit non-zero + R-enum message names 'dark'"
  elif [[ "${LINT_EXIT}" -eq 0 ]]; then
    fail "scenario-1-r-enum-positive" \
      "qa_red_lint.mjs exited 0 (expected non-zero) — R-enum rule not triggered for out-of-set 'dark'"
  else
    fail "scenario-1-r-enum-positive" \
      "qa_red_lint.mjs exited non-zero but stderr did not mention 'dark' — R-enum message missing or wrong. Output: ${LINT_OUT}"
  fi
fi

# ═════════════════════════════════════════════════════════════════════════════
# SCENARIO 2: R-query positive
# A fixture (.tsx) where 'Connected' appears on TWO render-input rows AND a
# queryByText('Connected') call targets it.
# Expected: exit NON-ZERO + R-query message recommends queryAllByText/getByTestId.
# ═════════════════════════════════════════════════════════════════════════════
echo "--- Scenario 2: R-query positive ---"

FIXTURE_DIR_QUERY="$(mktemp -d)"

cat > "${FIXTURE_DIR_QUERY}/status_table_fixture.red.node.test.ts" << 'QEOF'
// fixture: status table with duplicate text — R-query violation
// Both postgres and redis rows have detail: 'Connected', so queryByText('Connected')
// will throw "Found multiple elements" at runtime.

import { render } from '@testing-library/react';
import StatusTable from '../StatusTable';

const rows = [
  { service: 'postgres', status: 'ok', detail: 'Connected' },
  { service: 'redis',    status: 'ok', detail: 'Connected' },  // duplicate detail text
];

test('shows connected status', () => {
  render(<StatusTable rows={rows} />);
  // R-query violation: 'Connected' appears on >=2 rows in the render input above.
  // queryByText will throw "Found multiple elements with text 'Connected'".
  const el = queryByText('Connected');  // bad — duplicate text, use queryAllByText('Connected')[0]
  expect(el).toBeTruthy();
});
QEOF

if [[ "${LINT_PRESENT}" -eq 0 ]]; then
  fail "scenario-2-r-query-positive" \
    "qa_red_lint.mjs absent at ${LINT_SCRIPT} — cannot run; baseline FAIL as expected (RED)"
else
  LINT_OUT2="$(node "${LINT_SCRIPT}" "${FIXTURE_DIR_QUERY}" 2>&1)" || LINT_EXIT2=$?
  LINT_EXIT2="${LINT_EXIT2:-0}"
  if [[ "${LINT_EXIT2}" -ne 0 ]] && \
     (echo "${LINT_OUT2}" | grep -qiE "queryAllByText|getByTestId|R-query"); then
    pass "scenario-2-r-query-positive — exit non-zero + R-query recommendation present"
  elif [[ "${LINT_EXIT2}" -eq 0 ]]; then
    fail "scenario-2-r-query-positive" \
      "qa_red_lint.mjs exited 0 (expected non-zero) — R-query rule not triggered for duplicate 'Connected' + queryByText"
  else
    fail "scenario-2-r-query-positive" \
      "qa_red_lint.mjs exited non-zero but R-query recommendation (queryAllByText/getByTestId) not in output. Output: ${LINT_OUT2}"
  fi
fi

# ═════════════════════════════════════════════════════════════════════════════
# SCENARIO 3: Negative — clean (no false positive)
# A fixture with a valid in-set literal + a uniquely-matched queryByText.
# Expected: exit 0 (no flags).
# ═════════════════════════════════════════════════════════════════════════════
echo "--- Scenario 3: Negative — clean (no false positive) ---"

FIXTURE_DIR_CLEAN="$(mktemp -d)"

cat > "${FIXTURE_DIR_CLEAN}/clean_fixture.red.node.test.ts" << 'CEOF'
// fixture: clean — valid literal + unique query text
// theme="technical-dark" IS in Literal["technical-dark","business-warm","minimal-light"].
// 'Postgres' appears exactly once in the render input, so getByText('Postgres') is safe.

from typing import Literal
from pydantic import BaseModel

class DeckSpec(BaseModel):
    theme: Literal["technical-dark", "business-warm", "minimal-light"]

# Valid in-set value — no R-enum violation
spec = DeckSpec(theme="technical-dark")

const rows = [
  { service: 'postgres', status: 'ok', detail: 'Postgres' },   // unique detail
  { service: 'redis',    status: 'ok', detail: 'Redis' },      // different text
];

test('shows postgres row', () => {
  render(<StatusTable rows={rows} />);
  // Safe: 'Postgres' appears exactly once in the render input above.
  const el = getByText('Postgres');
  expect(el).toBeTruthy();
});
CEOF

if [[ "${LINT_PRESENT}" -eq 0 ]]; then
  fail "scenario-3-negative-clean" \
    "qa_red_lint.mjs absent at ${LINT_SCRIPT} — cannot run; baseline FAIL as expected (RED)"
else
  node "${LINT_SCRIPT}" "${FIXTURE_DIR_CLEAN}" > /dev/null 2>&1
  CLEAN_EXIT=$?
  if [[ "${CLEAN_EXIT}" -eq 0 ]]; then
    pass "scenario-3-negative-clean — exit 0 (no false positive on valid literal + unique query)"
  else
    fail "scenario-3-negative-clean" \
      "qa_red_lint.mjs exited ${CLEAN_EXIT} (expected 0) — false positive on clean fixture"
  fi
fi

# ═════════════════════════════════════════════════════════════════════════════
# SCENARIO 4: Negative — NON-APPLICABLE file (CRITICAL live-on-merge safety)
# A plain node:test file using only assert, no Pydantic Literal, no queryByText/
# getByText — shaped exactly like CR-082's own close_sprint.deferred-verify.red.node.test.ts.
# Expected: exit 0. Proves qa_red_lint won't phantom-flag CR-082's red test on merge.
# THIS SCENARIO IS MANDATORY.
# ═════════════════════════════════════════════════════════════════════════════
echo "--- Scenario 4: Negative — NON-APPLICABLE file (CRITICAL) ---"

FIXTURE_DIR_NONAPPLICABLE="$(mktemp -d)"

# Write a file that is intentionally shaped like CR-082's own node:test:
# - uses node:test + assert only
# - no import from pydantic, no Literal[...], no string-union type
# - no queryByText, getByText, queryAllByText
# - no RTL imports
cat > "${FIXTURE_DIR_NONAPPLICABLE}/close_sprint.deferred-verify.red.node.test.ts" << 'NAEOF'
// close_sprint.deferred-verify.red.node.test.ts
// CR-082 QA-Red node:test — shaped as a plain node:test + assert file.
// No Pydantic Literal, no queryByText/getByText, no RTL — NOT a QA-Red lint target.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import path from 'node:path';

const SCRIPT = path.resolve(import.meta.dirname, '../../close_sprint.mjs');

describe('close_sprint deferred-verification gate (Step 2.9)', () => {
  it('declared + NO result file → exits non-zero', () => {
    // Env-seam: CLEARGATE_FORCE_DEFERRED_VERIFY drives the test without real files
    const env = {
      ...process.env,
      CLEARGATE_FORCE_DEFERRED_VERIFY: JSON.stringify({
        'STORY-099-01': { declared: [{ command: 'docker build .', blocks: 'close' }], result: null }
      }),
      CLEARGATE_SKIP_WORKTREE_CHECK: '1',
      CLEARGATE_SKIP_MERGE_CHECK: '1',
    };
    let threw = false;
    try {
      execSync(`node ${SCRIPT} SPRINT-00`, { env, stdio: 'pipe' });
    } catch {
      threw = true;
    }
    assert.ok(threw, 'Expected close_sprint.mjs to exit non-zero when deferred result is absent');
  });

  it('declared + green result → gate passes', () => {
    const env = {
      ...process.env,
      CLEARGATE_FORCE_DEFERRED_VERIFY: JSON.stringify({
        'STORY-099-01': { declared: [{ command: 'docker build .', blocks: 'close' }], result: 'green' }
      }),
      CLEARGATE_SKIP_WORKTREE_CHECK: '1',
      CLEARGATE_SKIP_MERGE_CHECK: '1',
    };
    // Should NOT throw — gate passes on green
    assert.doesNotThrow(() => {
      execSync(`node ${SCRIPT} SPRINT-00`, { env, stdio: 'pipe' });
    });
  });

  it('none declared → silent no-op, continues', () => {
    const env = {
      ...process.env,
      CLEARGATE_FORCE_DEFERRED_VERIFY: JSON.stringify({}),
      CLEARGATE_SKIP_WORKTREE_CHECK: '1',
      CLEARGATE_SKIP_MERGE_CHECK: '1',
    };
    // No deferred entries declared → gate is a no-op → should not throw
    assert.doesNotThrow(() => {
      execSync(`node ${SCRIPT} SPRINT-00`, { env, stdio: 'pipe' });
    });
  });
});
NAEOF

if [[ "${LINT_PRESENT}" -eq 0 ]]; then
  fail "scenario-4-nonapplicable" \
    "qa_red_lint.mjs absent at ${LINT_SCRIPT} — cannot run; baseline FAIL as expected (RED)"
else
  node "${LINT_SCRIPT}" "${FIXTURE_DIR_NONAPPLICABLE}" > /dev/null 2>&1
  NA_EXIT=$?
  if [[ "${NA_EXIT}" -eq 0 ]]; then
    pass "scenario-4-nonapplicable — exit 0 on plain node:test file (no phantom R-enum/R-query flag)"
  else
    fail "scenario-4-nonapplicable" \
      "qa_red_lint.mjs exited ${NA_EXIT} (expected 0) — CRITICAL: false-flagged CR-082's own node:test shape; live-on-merge self-block risk"
  fi
fi

# ═════════════════════════════════════════════════════════════════════════════
# SCENARIO 5: Wiring grep — qa_red_lint invoked in pre_gate_runner.sh run_arch()
# Expected: grep -q "qa_red_lint" .cleargate/scripts/pre_gate_runner.sh → 0
# FAILS on clean baseline (not yet wired).
# ═════════════════════════════════════════════════════════════════════════════
echo "--- Scenario 5: Wiring grep ---"

if grep -q "qa_red_lint" "${PRE_GATE_SCRIPT}" 2>/dev/null; then
  pass "scenario-5-wiring-grep — 'qa_red_lint' found in pre_gate_runner.sh"
else
  fail "scenario-5-wiring-grep" \
    "'qa_red_lint' not found in ${PRE_GATE_SCRIPT} — CR-081 wiring not yet applied (expected RED)"
fi

# ═════════════════════════════════════════════════════════════════════════════
# SCENARIO 6: qa.md red-now-green clause grep
# Expected: grep -qiE "red-now-green|now PASSES|failing at baseline" in qa.md → 0
# FAILS on clean baseline (clause not yet added).
# ═════════════════════════════════════════════════════════════════════════════
echo "--- Scenario 6: qa.md red-now-green clause ---"

if grep -qiE "red-now-green|now PASSES|failing at baseline" "${QA_MD}" 2>/dev/null; then
  pass "scenario-6-qa-md-clause — red-now-green clause found in qa.md"
else
  fail "scenario-6-qa-md-clause" \
    "red-now-green clause not found in ${QA_MD} — CR-081 qa.md edit not yet applied (expected RED)"
fi

# ── Summary ───────────────────────────────────────────────────────────────────
echo ""
echo "cr081_qa_red_lint.red.sh: ${PASS} passed, ${FAIL} failed"
if [[ "${FAIL}" -gt 0 ]]; then
  exit 1
fi
exit 0
