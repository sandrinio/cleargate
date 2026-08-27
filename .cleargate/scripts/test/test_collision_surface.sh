#!/usr/bin/env bash
# test_collision_surface.sh — BUG-049: collision_surface.sh must read Bug/CR
# Execution Sandbox prose sections, not only the Story §3.1 table.
#
# Usage: bash .cleargate/scripts/test/test_collision_surface.sh
# Exit: 0 all pass, 1 any fail

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../../.." && pwd)"
SCRIPT="${REPO_ROOT}/.cleargate/scripts/collision_surface.sh"
PASS=0; FAIL=0

pass() { echo "  PASS: $1"; PASS=$((PASS+1)); }
fail() { echo "  FAIL: $1 --- $2"; FAIL=$((FAIL+1)); }

[[ -f "${SCRIPT}" ]] || { echo "ERROR: not found: ${SCRIPT}"; exit 1; }
TMP="$(mktemp -d)"; trap 'rm -rf "${TMP}"' EXIT

run() { bash "${SCRIPT}" "$1" 2>/dev/null; }
has() { run "$1" | grep -qxF "$2"; }

# ---- Sc1: CR with `## 3. Execution Sandbox` prose ------------------------
cat > "${TMP}/cr.md" <<'MD'
# CR-999: Example
## 3. Execution Sandbox

**Modify:**
- `.cleargate/scripts/update_state.mjs` — write path becomes appendEvent
- `cleargate-planning/.cleargate/scripts/update_state.mjs` — canonical mirror

**Create:**
- `.cleargate/scripts/state-events.mjs` — new module

**Do NOT modify:** `state.schema.json`, `validate_state.mjs`

## 4. Verification Protocol
**Command/Test:** `npm test`
MD
has "${TMP}/cr.md" ".cleargate/scripts/update_state.mjs" \
  && pass "Sc1 CR §3 Modify path returned" || fail "Sc1 CR §3 Modify path returned" "missing"
has "${TMP}/cr.md" ".cleargate/scripts/state-events.mjs" \
  && pass "Sc2 CR §3 Create path returned" || fail "Sc2 CR §3 Create path returned" "missing"

# ---- Sc3: Do NOT modify paths are EXCLUDED (anti-surface) ----------------
if has "${TMP}/cr.md" "state.schema.json"; then
  fail "Sc3 'Do NOT modify' excluded" "state.schema.json leaked into surface"
else
  pass "Sc3 'Do NOT modify' excluded"
fi

# ---- Sc4: Bug with `## 4. Execution Sandbox` -----------------------------
cat > "${TMP}/bug.md" <<'MD'
# BUG-999: Example
## 4. Execution Sandbox (Suspected Blast Radius)

**Investigate / modify:**
- `.cleargate/scripts/collision_surface.sh` — extend the parser
- `.claude/agents/architect-reader.md` — carry the classification

**Do NOT modify:** `Bug.md`, `CR.md`

## 5. Verification Protocol
MD
has "${TMP}/bug.md" ".cleargate/scripts/collision_surface.sh" \
  && pass "Sc4 Bug §4 modify path returned" || fail "Sc4 Bug §4 modify path returned" "missing"
if has "${TMP}/bug.md" "Bug.md"; then
  fail "Sc5 Bug 'Do NOT modify' excluded" "Bug.md leaked"
else
  pass "Sc5 Bug 'Do NOT modify' excluded"
fi

# ---- Sc6: genuinely empty sandbox still returns empty (BUG-033 guard) ----
cat > "${TMP}/empty.md" <<'MD'
# CR-998: Example
## 3. Execution Sandbox

To be determined.

## 4. Verification Protocol
MD
if [[ -z "$(run "${TMP}/empty.md")" ]]; then
  pass "Sc6 empty sandbox -> empty (BUG-033 fail-safe preserved)"
else
  fail "Sc6 empty sandbox -> empty" "returned: $(run "${TMP}/empty.md")"
fi

# ---- Sc7: Story §3.1 table still works (regression guard) ----------------
cat > "${TMP}/story.md" <<'MD'
# STORY-999-01: Example
### 3.1 Context & Files
| Item | Value |
|---|---|
| Primary File | `src/lib/thing.ts` |
| Tests | `test/thing.node.test.ts` |

### 3.2 Other
MD
has "${TMP}/story.md" "src/lib/thing.ts" \
  && pass "Sc7 Story §3.1 table unchanged" || fail "Sc7 Story §3.1 table unchanged" "regression"

echo ""
echo "collision_surface: ${PASS} passed, ${FAIL} failed"
[[ ${FAIL} -eq 0 ]] || exit 1
