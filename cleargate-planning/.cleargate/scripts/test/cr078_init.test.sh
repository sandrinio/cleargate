#!/usr/bin/env bash
# cr078_init.test.sh — CR-078 verification harness.
#
# Verifies F1 (.active sentinel write) and F2 (SDR lane audit ingest) are
# correctly implemented in init_sprint.mjs.
#
# All assertions run in FULL ISOLATION — mktemp -d scratch project dirs with
# their own .cleargate/sprint-runs/ trees. The REAL repo .active is NEVER touched.
# Safety invariant: after this harness exits, cat <repo>/.cleargate/sprint-runs/.active
# MUST still read SPRINT-34 (the running sprint).
#
# Assertions:
#   1. .active write: init a scratch SPRINT-99 → cat <temp>/.active == SPRINT-99
#   2. WARN on differing prior: seed .active=SPRINT-50, init SPRINT-99 →
#      stderr contains WARN, .active becomes SPRINT-99
#   3. Lane ingest via waves.json: seed lane_assignments marking one story fast →
#      state.json lane==fast + lane_assigned_by==sdr-lane-audit; undeclared story stays standard
#   4. Lane ingest fallback via §2.4: no waves.json but Sprint Plan with §2.4 Lane Audit
#      marking a story fast → same result
#   5. Regression: grep -c '\.active' init_sprint.mjs ≥ 1 (was 0 before CR-078)
#
# Exit 0 = PASS (all assertions pass); exit 1 = one or more FAIL.
#
# Harness self-cleans (trap EXIT removes temp dirs). NEVER touches the real repo .active.
# macOS bash 3.2 portable.
# FLASHCARD #test-harness #bash 2026-06-04: use CLEARGATE_REPO_ROOT + CLEARGATE_ADVISORY=1
#   to isolate init_sprint.mjs into a scratch tmpdir without real delivery files.
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../../.." && pwd)"
INIT_SCRIPT="${REPO_ROOT}/.cleargate/scripts/init_sprint.mjs"
CONSTANTS_SCRIPT="${REPO_ROOT}/.cleargate/scripts/constants.mjs"

PASS=0
FAIL=0

# Track temp dirs for cleanup
TEMP_DIRS=()

pass() {
  echo "PASS: $1"
  PASS=$((PASS + 1))
}

fail() {
  echo "FAIL: $1"
  echo "      detail: $2"
  FAIL=$((FAIL + 1))
}

# ── Teardown / trap ───────────────────────────────────────────────────────────
cleanup() {
  for d in "${TEMP_DIRS[@]+"${TEMP_DIRS[@]}"}"; do
    if [[ -d "${d}" ]]; then
      rm -rf "${d}"
    fi
  done
}
trap cleanup EXIT

# ── Helper: create a minimal scratch project dir ──────────────────────────────
# Each scratch dir gets its own .cleargate/sprint-runs/ tree.
# We seed a minimal constants.mjs symlink so the script can import it.
make_scratch() {
  local tmpdir
  tmpdir="$(mktemp -d)"
  TEMP_DIRS+=("${tmpdir}")
  # Create the sprint-runs dir
  mkdir -p "${tmpdir}/.cleargate/sprint-runs"
  # Create a minimal scripts dir (symlink to real scripts so import works)
  mkdir -p "${tmpdir}/.cleargate/scripts"
  # Symlink constants.mjs so the import resolves (init_sprint.mjs uses __dirname
  # for the scripts dir, NOT CLEARGATE_REPO_ROOT — so we pass CLEARGATE_REPO_ROOT
  # only for file-path resolution, not for module loading).
  echo "${tmpdir}"
}

# ── Pre-check: init_sprint.mjs must exist ────────────────────────────────────
if [[ ! -f "${INIT_SCRIPT}" ]]; then
  fail "pre-check" "init_sprint.mjs not found at ${INIT_SCRIPT}"
  echo ""
  echo "cr078_init.test.sh: ${PASS} passed, ${FAIL} failed"
  exit 1
fi

# ── ASSERTION 5 (regression): grep count for .active references ───────────────
# Was 0 before CR-078; must be ≥ 1 after.
ACTIVE_COUNT="$(grep -c '\.active' "${INIT_SCRIPT}" || true)"
if [[ "${ACTIVE_COUNT}" -ge 1 ]]; then
  pass "5-regression: init_sprint.mjs contains ≥1 .active reference (count=${ACTIVE_COUNT})"
else
  fail "5-regression: init_sprint.mjs has 0 .active references — F1 not implemented" \
    "grep -c '.active' returned ${ACTIVE_COUNT}"
fi

# ────────────────────────────────────────────────────────────────────────────
# ASSERTION 1: .active write — init SPRINT-99 in scratch dir → .active == SPRINT-99
# ────────────────────────────────────────────────────────────────────────────
SCRATCH1="$(make_scratch)"
mkdir -p "${SCRATCH1}/.cleargate/sprint-runs/SPRINT-99"

# Run init_sprint.mjs with CLEARGATE_REPO_ROOT pointing to scratch dir.
# CLEARGATE_ADVISORY=1 bypasses story-file assertion (no delivery/ in scratch dir).
INIT_STDERR1="$(
  CLEARGATE_REPO_ROOT="${SCRATCH1}" CLEARGATE_ADVISORY=1 \
    node "${INIT_SCRIPT}" SPRINT-99 --stories STORY-99-01 --force 2>&1 >/dev/null
)"
INIT_EXIT1=$?

ACTIVE_VAL1=""
if [[ -f "${SCRATCH1}/.cleargate/sprint-runs/.active" ]]; then
  ACTIVE_VAL1="$(cat "${SCRATCH1}/.cleargate/sprint-runs/.active" | tr -d '\n')"
fi

if [[ "${ACTIVE_VAL1}" = "SPRINT-99" ]]; then
  pass "1-active-write: .active == SPRINT-99 after init"
else
  fail "1-active-write: .active not set to SPRINT-99" \
    "got '${ACTIVE_VAL1}'; init exit=${INIT_EXIT1}; stderr: ${INIT_STDERR1}"
fi

# ────────────────────────────────────────────────────────────────────────────
# ASSERTION 2: WARN on differing prior — seed .active=SPRINT-50, init SPRINT-99
# ────────────────────────────────────────────────────────────────────────────
SCRATCH2="$(make_scratch)"
mkdir -p "${SCRATCH2}/.cleargate/sprint-runs/SPRINT-99"
# Pre-seed .active with a different sprint
printf 'SPRINT-50\n' > "${SCRATCH2}/.cleargate/sprint-runs/.active"

INIT_STDERR2="$(
  CLEARGATE_REPO_ROOT="${SCRATCH2}" CLEARGATE_ADVISORY=1 \
    node "${INIT_SCRIPT}" SPRINT-99 --stories STORY-99-01 --force 2>&1 >/dev/null
)"

ACTIVE_VAL2=""
if [[ -f "${SCRATCH2}/.cleargate/sprint-runs/.active" ]]; then
  ACTIVE_VAL2="$(cat "${SCRATCH2}/.cleargate/sprint-runs/.active" | tr -d '\n')"
fi

# Check .active updated
if [[ "${ACTIVE_VAL2}" = "SPRINT-99" ]]; then
  pass "2a-warn-prior: .active updated to SPRINT-99 despite prior SPRINT-50"
else
  fail "2a-warn-prior: .active not updated" \
    "got '${ACTIVE_VAL2}'"
fi

# Check WARN emitted
if echo "${INIT_STDERR2}" | grep -q "WARN: .active was SPRINT-50"; then
  pass "2b-warn-prior: WARN message emitted on stderr"
else
  fail "2b-warn-prior: expected WARN about prior .active on stderr" \
    "stderr was: ${INIT_STDERR2}"
fi

# ────────────────────────────────────────────────────────────────────────────
# ASSERTION 3: Lane ingest via waves.json
# ────────────────────────────────────────────────────────────────────────────
SCRATCH3="$(make_scratch)"
mkdir -p "${SCRATCH3}/.cleargate/sprint-runs/SPRINT-99/plans"

# Seed waves.json with lane_assignments marking STORY-99-01 as fast
cat > "${SCRATCH3}/.cleargate/sprint-runs/SPRINT-99/plans/waves.json" <<'EOF'
{
  "sprint": "SPRINT-99",
  "generated_at": "2026-06-04T00:00:00Z",
  "waves": [
    {
      "wave": "wave1",
      "stories": ["STORY-99-01", "STORY-99-02"],
      "parallel": false,
      "rationale": "test wave"
    }
  ],
  "lane_assignments": {
    "STORY-99-01": "fast"
  }
}
EOF

INIT_STDERR3="$(
  CLEARGATE_REPO_ROOT="${SCRATCH3}" CLEARGATE_ADVISORY=1 \
    node "${INIT_SCRIPT}" SPRINT-99 --stories STORY-99-01,STORY-99-02 --force 2>&1 >/dev/null
)"

STATE3="${SCRATCH3}/.cleargate/sprint-runs/SPRINT-99/state.json"
if [[ ! -f "${STATE3}" ]]; then
  fail "3-waves-lane: state.json not written" \
    "init stderr: ${INIT_STDERR3}"
else
  LANE3_01="$(node -e "const s=require('${STATE3}'); process.stdout.write(s.stories['STORY-99-01'].lane)" 2>/dev/null || echo 'ERROR')"
  LANE_BY3_01="$(node -e "const s=require('${STATE3}'); process.stdout.write(s.stories['STORY-99-01'].lane_assigned_by)" 2>/dev/null || echo 'ERROR')"
  LANE3_02="$(node -e "const s=require('${STATE3}'); process.stdout.write(s.stories['STORY-99-02'].lane)" 2>/dev/null || echo 'ERROR')"
  LANE_BY3_02="$(node -e "const s=require('${STATE3}'); process.stdout.write(s.stories['STORY-99-02'].lane_assigned_by)" 2>/dev/null || echo 'ERROR')"

  if [[ "${LANE3_01}" = "fast" ]]; then
    pass "3a-waves-lane: STORY-99-01 lane==fast (declared in waves.json)"
  else
    fail "3a-waves-lane: STORY-99-01 lane expected 'fast'" \
      "got '${LANE3_01}'"
  fi

  if [[ "${LANE_BY3_01}" = "sdr-lane-audit" ]]; then
    pass "3b-waves-lane: STORY-99-01 lane_assigned_by==sdr-lane-audit"
  else
    fail "3b-waves-lane: STORY-99-01 lane_assigned_by expected 'sdr-lane-audit'" \
      "got '${LANE_BY3_01}'"
  fi

  if [[ "${LANE3_02}" = "standard" ]]; then
    pass "3c-waves-lane: STORY-99-02 (undeclared) lane==standard"
  else
    fail "3c-waves-lane: STORY-99-02 lane expected 'standard' (undeclared)" \
      "got '${LANE3_02}'"
  fi

  if [[ "${LANE_BY3_02}" = "migration-default" ]]; then
    pass "3d-waves-lane: STORY-99-02 lane_assigned_by==migration-default (undeclared)"
  else
    fail "3d-waves-lane: STORY-99-02 lane_assigned_by expected 'migration-default'" \
      "got '${LANE_BY3_02}'"
  fi
fi

# ────────────────────────────────────────────────────────────────────────────
# ASSERTION 4: Lane ingest fallback via §2.4 — no waves.json, sprint plan with Lane Audit
# ────────────────────────────────────────────────────────────────────────────
SCRATCH4="$(make_scratch)"
mkdir -p "${SCRATCH4}/.cleargate/sprint-runs/SPRINT-99"
mkdir -p "${SCRATCH4}/.cleargate/delivery/pending-sync"

# Create a minimal sprint plan with a §2.4 Lane Audit table (no waves.json)
cat > "${SCRATCH4}/.cleargate/delivery/pending-sync/SPRINT-99_Test_Sprint.md" <<'EOF'
---
status: Active
approved: true
---
# SPRINT-99: Test Sprint

## 0. Frontmatter
- **Sprint Goal:** Test lane ingest fallback

## 2. Execution Strategy

### 2.4 Lane Audit

| Story | Lane | Rationale (≤80 chars) |
|---|---|---|
| `STORY-99-01` | fast | Isolated fix, no agent surface |

### 2.5 ADR-Conflict Flags
None.
EOF

INIT_STDERR4="$(
  CLEARGATE_REPO_ROOT="${SCRATCH4}" CLEARGATE_ADVISORY=1 \
    node "${INIT_SCRIPT}" SPRINT-99 --stories STORY-99-01,STORY-99-02 --force 2>&1 >/dev/null
)"

STATE4="${SCRATCH4}/.cleargate/sprint-runs/SPRINT-99/state.json"
if [[ ! -f "${STATE4}" ]]; then
  fail "4-plan-lane: state.json not written" \
    "init stderr: ${INIT_STDERR4}"
else
  LANE4_01="$(node -e "const s=require('${STATE4}'); process.stdout.write(s.stories['STORY-99-01'].lane)" 2>/dev/null || echo 'ERROR')"
  LANE_BY4_01="$(node -e "const s=require('${STATE4}'); process.stdout.write(s.stories['STORY-99-01'].lane_assigned_by)" 2>/dev/null || echo 'ERROR')"
  LANE4_02="$(node -e "const s=require('${STATE4}'); process.stdout.write(s.stories['STORY-99-02'].lane)" 2>/dev/null || echo 'ERROR')"

  if [[ "${LANE4_01}" = "fast" ]]; then
    pass "4a-plan-lane: STORY-99-01 lane==fast (declared in §2.4 Lane Audit table)"
  else
    fail "4a-plan-lane: STORY-99-01 lane expected 'fast'" \
      "got '${LANE4_01}'; stderr: ${INIT_STDERR4}"
  fi

  if [[ "${LANE_BY4_01}" = "sdr-lane-audit" ]]; then
    pass "4b-plan-lane: STORY-99-01 lane_assigned_by==sdr-lane-audit"
  else
    fail "4b-plan-lane: STORY-99-01 lane_assigned_by expected 'sdr-lane-audit'" \
      "got '${LANE_BY4_01}'"
  fi

  if [[ "${LANE4_02}" = "standard" ]]; then
    pass "4c-plan-lane: STORY-99-02 (undeclared) lane==standard"
  else
    fail "4c-plan-lane: STORY-99-02 lane expected 'standard'" \
      "got '${LANE4_02}'"
  fi
fi

# ────────────────────────────────────────────────────────────────────────────
# SAFETY: Verify the real repo .active is still SPRINT-34
# ────────────────────────────────────────────────────────────────────────────
REAL_ACTIVE="$(cat "${REPO_ROOT}/.cleargate/sprint-runs/.active" | tr -d '\n')"
if [[ "${REAL_ACTIVE}" = "SPRINT-34" ]]; then
  pass "safety: real repo .active still == SPRINT-34 (not clobbered)"
else
  fail "SAFETY VIOLATION: real repo .active clobbered!" \
    "expected SPRINT-34, got '${REAL_ACTIVE}'"
fi

# ── Summary ───────────────────────────────────────────────────────────────────
echo ""
echo "cr078_init.test.sh: ${PASS} passed, ${FAIL} failed"
if [[ "${FAIL}" -gt 0 ]]; then
  exit 1
fi
exit 0
