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


# ════════════════════════════════════════════════════════════════════════════
# CR-110 — sprint goal acceptance check (QA-Red, G1-G8 + Rule-4 verification)
#
# Scope: ## Goal Acceptance Check in sprint_context.md (both trees), the
# init_sprint.mjs advisory that fires when it is unresolved, and the static
# prose contract on reporter.md / SKILL.md that reads it (OD-4: the sprint
# verdict is SPOKEN in the close Brief, never written to sprint_report.md --
# so G5/G7 pin reporter.md's own instruction text, not an executable output).
#
# G2/G3/G4 exercise a SYNTHETIC future-state template this harness builds
# itself (make_future_template), decoupled from the exact mechanism/timing by
# which "populated" content reaches sprint-context.md (sprint-plan-line
# extraction vs. hand-edit at §A.5 -- CR-110's own schema names the LATTER:
# "populated by orchestrator AT §A.5", i.e. after init, not derived from the
# plan at kickoff the way ## Sprint Goal is). The detection logic, however the
# Developer wires it, is only ever handed a STRING that is either byte-equal
# to the placeholder below or something else -- this harness pins both cases.
# ASSUMPTION (flagged for the Developer/TPV): the placeholder is fixtured here
# as ONE unwrapped line, matching every other placeholder in the current
# template (## Sprint Goal's is one line). The CR body's verbatim block is
# word-wrapped for doc readability; if the real template ships it wrapped
# across two lines, the detection must normalise whitespace, or this fixture
# needs a matching update -- call this out explicitly, do not silently accept
# either.
# ════════════════════════════════════════════════════════════════════════════

GAC_PLACEHOLDER='_(populated by orchestrator at §A.5, confirmed by the human at the same halt that confirms the sprint plan)_'

# make_future_template <scratch-root> <placeholder|token>
# Writes a minimal but structurally faithful sprint_context.md into
# <scratch-root>/.cleargate/templates/ -- frontmatter + ## Sprint Goal +
# ## Goal Acceptance Check (placeholder or already-populated-with-the-literal-
# token) + ## Locked Versions, matching the CR's verbatim placement (after
# Sprint Goal, before Locked Versions).
make_future_template() {
  local root="$1"
  local flavor="$2"
  local dest="${root}/.cleargate/templates"
  mkdir -p "${dest}"
  local gac_body
  if [[ "${flavor}" = "token" ]]; then
    gac_body='not-mechanically-verifiable — confirmed via 2026-08-29 stakeholder walkthrough.'
  else
    gac_body="${GAC_PLACEHOLDER}"
  fi
  cat > "${dest}/sprint_context.md" <<EOF
---
sprint_id: "S-NN"
created_at: "YYYY-MM-DDTHH:MM:SSZ"
last_updated: "YYYY-MM-DDTHH:MM:SSZ"
---

# Sprint Context

## Sprint Goal

_(populated by orchestrator from sprint plan §0 at kickoff)_

## Goal Acceptance Check

${gac_body}

The concrete condition that is true when the Sprint Goal is met. Either a named command, artifact,
or observable state — or the literal token \`not-mechanically-verifiable\` followed by the
qualitative evidence standing in for it. Both are valid. Silence is not.

## Locked Versions

| Package | Version |
|---------|---------|
| Node    | \`>=24.0.0\` |
EOF
}

# ────────────────────────────────────────────────────────────────────────────
# G1: THE RED. init_sprint.mjs renders ## Goal Acceptance Check into
# sprint-context.md, sourced from the REAL, currently-committed template
# (both trees) copied byte-for-byte into a scratch project, so init exercises
# its real render path (F2: "the render is free" -- verbatim template copy,
# zero init_sprint.mjs change needed once the template carries the section).
# Must FAIL against the current tree. G1a/G1b are independent per-tree checks
# -- kills "heading added to live only, not the canonical mirror" (Rule 1).
# ────────────────────────────────────────────────────────────────────────────
run_g1() {
  local template_src="$1"
  local label="$2"
  local scratch
  scratch="$(make_scratch)"
  mkdir -p "${scratch}/.cleargate/sprint-runs/SPRINT-99" "${scratch}/.cleargate/templates"
  cp "${template_src}" "${scratch}/.cleargate/templates/sprint_context.md"

  CLEARGATE_REPO_ROOT="${scratch}" CLEARGATE_ADVISORY=1 \
    node "${INIT_SCRIPT}" SPRINT-99 --stories STORY-99-01 --force >/dev/null 2>&1

  local ctx="${scratch}/.cleargate/sprint-runs/SPRINT-99/sprint-context.md"
  if [[ -f "${ctx}" ]] && command grep -q '^## Goal Acceptance Check$' "${ctx}"; then
    pass "${label}: rendered sprint-context.md contains ## Goal Acceptance Check"
  else
    fail "${label}: rendered sprint-context.md is missing ## Goal Acceptance Check -- section not yet in the source template" \
      "template_src=${template_src}"
  fi
}

run_g1 "${REPO_ROOT}/.cleargate/templates/sprint_context.md" "G1a-red-live"
run_g1 "${REPO_ROOT}/cleargate-planning/.cleargate/templates/sprint_context.md" "G1b-red-canonical"

if diff -q "${REPO_ROOT}/.cleargate/templates/sprint_context.md" "${REPO_ROOT}/cleargate-planning/.cleargate/templates/sprint_context.md" >/dev/null 2>&1; then
  pass "G1c-parity: live and canonical sprint_context.md are byte-identical (Cross-Cutting Rule 1)"
else
  fail "G1c-parity: live and canonical sprint_context.md have diverged" \
    "$(diff "${REPO_ROOT}/.cleargate/templates/sprint_context.md" "${REPO_ROOT}/cleargate-planning/.cleargate/templates/sprint_context.md")"
fi

# ────────────────────────────────────────────────────────────────────────────
# G2: advisory fires + init still exits 0 when the Goal Acceptance Check is
# unresolved (the placeholder survives unedited) -- backward-compat guard for
# every existing sprint plan (none derives this check).
# ────────────────────────────────────────────────────────────────────────────
SCRATCH_G2="$(make_scratch)"
mkdir -p "${SCRATCH_G2}/.cleargate/sprint-runs/SPRINT-99"
make_future_template "${SCRATCH_G2}" "placeholder"

INIT_STDERR_G2="$(
  CLEARGATE_REPO_ROOT="${SCRATCH_G2}" CLEARGATE_ADVISORY=1 \
    node "${INIT_SCRIPT}" SPRINT-99 --stories STORY-99-01 --force 2>&1 >/dev/null
)"
INIT_EXIT_G2=$?

if [[ "${INIT_EXIT_G2}" -eq 0 ]]; then
  pass "G2a-goal-check-advisory: init exits 0 with an unresolved Goal Acceptance Check (GREEN-AT-BASELINE -- nothing errors today either; this pins the non-blocking contract against a future 'exit(1) on unpopulated' regression)"
else
  fail "G2a-goal-check-advisory: init must exit 0 on an unresolved check, never block" "exit=${INIT_EXIT_G2}"
fi

if echo "${INIT_STDERR_G2}" | command grep -qi 'goal acceptance check' && echo "${INIT_STDERR_G2}" | command grep -qi 'unresolved'; then
  pass "G2b-goal-check-advisory: stderr carries a one-line advisory naming the unresolved Goal Acceptance Check"
else
  fail "G2b-goal-check-advisory: expected stderr advisory mentioning 'Goal Acceptance Check' + 'unresolved' (mirror sprint_context.md's own Test Stack degradation idiom: 'test_stack unresolved -- populate sprint_context.md §Test Stack')" \
    "stderr was: ${INIT_STDERR_G2}"
fi

# ────────────────────────────────────────────────────────────────────────────
# G3: the literal token `not-mechanically-verifiable` is accepted as
# POPULATED, not treated as unresolved.
# ────────────────────────────────────────────────────────────────────────────
SCRATCH_G3="$(make_scratch)"
mkdir -p "${SCRATCH_G3}/.cleargate/sprint-runs/SPRINT-99"
make_future_template "${SCRATCH_G3}" "token"

INIT_STDERR_G3="$(
  CLEARGATE_REPO_ROOT="${SCRATCH_G3}" CLEARGATE_ADVISORY=1 \
    node "${INIT_SCRIPT}" SPRINT-99 --stories STORY-99-01 --force 2>&1 >/dev/null
)"
INIT_EXIT_G3=$?

if [[ "${INIT_EXIT_G3}" -eq 0 ]]; then
  pass "G3a-goal-check-token: init exits 0 when the Goal Acceptance Check already carries the literal token"
else
  fail "G3a-goal-check-token: unexpected non-zero exit" "exit=${INIT_EXIT_G3}"
fi

if echo "${INIT_STDERR_G3}" | command grep -qi 'unresolved'; then
  fail "G3b-goal-check-token: 'not-mechanically-verifiable' must be treated as POPULATED, not unresolved" \
    "stderr was: ${INIT_STDERR_G3}"
else
  pass "G3b-goal-check-token: no unresolved-advisory fires when the token is already recorded (GREEN-AT-BASELINE -- no advisory logic exists yet to false-fire; pins the future non-regression, FLASHCARD 2026-08-28 #test-harness #qa 'gap-closing red test can be green on today's baseline by design')"
fi

CTX_G3="${SCRATCH_G3}/.cleargate/sprint-runs/SPRINT-99/sprint-context.md"
if [[ -f "${CTX_G3}" ]] && command grep -q 'not-mechanically-verifiable' "${CTX_G3}"; then
  pass "G3c-goal-check-token: rendered sprint-context.md preserves the literal token verbatim (F2: render is free)"
else
  fail "G3c-goal-check-token: rendered sprint-context.md lost or mangled the literal token" "checked: ${CTX_G3}"
fi

# ────────────────────────────────────────────────────────────────────────────
# G4: sprint-context.md stays parseable by the existing preflight path --
# ## Sprint Goal stays BEFORE ## Goal Acceptance Check, which stays BEFORE
# ## Locked Versions, in the REAL committed template (both trees) -- checked
# directly against the shipped artifact, not this harness's own fixture,
# since ordering is a property of what the Developer ships, not of the test.
# Kills: inserting the section BEFORE ## Sprint Goal (CR-110 G4 mutant).
# Frontmatter-intact checks are unaffected by this CR and pin the non-
# regression.
# ────────────────────────────────────────────────────────────────────────────
check_heading_order() {
  local template_path="$1"
  local label="$2"
  if [[ ! -f "${template_path}" ]]; then
    fail "${label}: template not found" "${template_path}"
    return
  fi
  local l_goal l_gac l_locked
  l_goal="$(command grep -n '^## Sprint Goal$' "${template_path}" | head -1 | cut -d: -f1)"
  l_gac="$(command grep -n '^## Goal Acceptance Check$' "${template_path}" | head -1 | cut -d: -f1)"
  l_locked="$(command grep -n '^## Locked Versions$' "${template_path}" | head -1 | cut -d: -f1)"

  if [[ -z "${l_gac}" ]]; then
    fail "${label}: ## Goal Acceptance Check heading not found" "${template_path}"
    return
  fi
  if [[ -n "${l_goal}" && -n "${l_locked}" && "${l_goal}" -lt "${l_gac}" && "${l_gac}" -lt "${l_locked}" ]]; then
    pass "${label}: ## Sprint Goal(${l_goal}) < ## Goal Acceptance Check(${l_gac}) < ## Locked Versions(${l_locked})"
  else
    fail "${label}: heading order violated -- ## Sprint Goal must stay the file's first section" \
      "Sprint Goal=${l_goal} GoalAcceptanceCheck=${l_gac} LockedVersions=${l_locked}"
  fi
}

check_heading_order "${REPO_ROOT}/.cleargate/templates/sprint_context.md" "G4a-order-live"
check_heading_order "${REPO_ROOT}/cleargate-planning/.cleargate/templates/sprint_context.md" "G4b-order-canonical"

check_frontmatter_intact() {
  local template_path="$1"
  local label="$2"
  local first_line closing_dash
  first_line="$(sed -n '1p' "${template_path}")"
  closing_dash="$(sed -n '2,10p' "${template_path}" | command grep -n '^---$' | head -1 | cut -d: -f1)"
  if [[ "${first_line}" = "---" && -n "${closing_dash}" ]]; then
    pass "${label}: frontmatter block intact (opens + closes with ---)"
  else
    fail "${label}: frontmatter block malformed" "first_line='${first_line}' closing_dash='${closing_dash}'"
  fi
}
check_frontmatter_intact "${REPO_ROOT}/.cleargate/templates/sprint_context.md" "G4c-frontmatter-live"
check_frontmatter_intact "${REPO_ROOT}/cleargate-planning/.cleargate/templates/sprint_context.md" "G4d-frontmatter-canonical"

# ────────────────────────────────────────────────────────────────────────────
# G5 / G7: reporter.md is a PROSE agent instruction file, not executable code.
# Per OD-4 the sprint-goal verdict is SPOKEN in the close Brief and never
# written to sprint_report.md, so there is no executable artifact to run a
# behavioural test against -- the contract is pinned on reporter.md's own
# instruction text (canonical, primary per N1; the live .claude/agents/
# reporter.md copy is untracked and does not exist in this worktree).
# ────────────────────────────────────────────────────────────────────────────
REPORTER_MD="${REPO_ROOT}/cleargate-planning/.claude/agents/reporter.md"

if command grep -qi 'Goal Acceptance Check' "${REPORTER_MD}"; then
  pass "G5a-reporter-reads-check: reporter.md names ## Goal Acceptance Check"
else
  fail "G5a-reporter-reads-check: reporter.md does not mention Goal Acceptance Check" "${REPORTER_MD}"
fi

if command grep -qi 'satisfied' "${REPORTER_MD}"; then
  pass "G5b-reporter-derives-not-judges: reporter.md instructs deriving the verdict from whether the check is SATISFIED"
else
  fail "G5b-reporter-derives-not-judges: reporter.md has no 'satisfied' language -- verdict derivation from the recorded check is unspecified" "${REPORTER_MD}"
fi

# Scoped to CO-OCCURRENCE of "non-empty" and "met" within ~80 chars, either
# order -- reporter.md ALREADY contains an unrelated "non-empty" at :269
# ("All seven sections required ... non-empty content", about report-section
# completeness, nothing to do with the goal verdict). A bare substring check
# on "non-empty" is a false-positive trap against that pre-existing line and
# would be permanently unsatisfiable; measured, not assumed.
if command grep -qiE 'non-empty[^.]{0,80}\bmet\b|\bmet\b[^.]{0,80}non-empty' "${REPORTER_MD}"; then
  fail "G5c-reporter-rejected-mutant: reporter.md ties 'non-empty' to 'met' -- the rejected 'section non-empty => met' shortcut (CR-110 G5 mutant)" \
    "${REPORTER_MD}"
else
  pass "G5c-reporter-rejected-mutant: reporter.md does not fall back to a presence/non-empty check for the verdict (GREEN-AT-BASELINE, pins the non-regression; scoped past the pre-existing unrelated 'non-empty' at reporter.md:269)"
fi

if command grep -qi 'GOAL_RELATION' "${REPORTER_MD}"; then
  pass "G5d-reporter-quotes-goal-relation: reporter.md quotes GOAL_RELATION"
else
  fail "G5d-reporter-quotes-goal-relation: reporter.md does not mention GOAL_RELATION (F1 corrected justification)" "${REPORTER_MD}"
fi

# G7: the met|partial|missed vocabulary triplet stays SKILL.md-exclusive.
# Scoped to the ENUM-STYLE sequence (mirrors how SKILL.md itself writes it --
# "met | partial | missed" / "met/partial/missed"), NOT bare word-boundary
# hits on "met"/"missed" alone -- those already occur twice in reporter.md's
# UNRELATED existing prose ("conditions are not met", "why was it missed at
# planning?") and would make a bare-word assertion permanently vacuous.
# CORRECTION to CR-110 F1's own claim ("reporter.md contains zero occurrences
# of verdict, met, partial, missed") -- false by word-boundary grep, measured;
# the enum-scoped form is what G7's actual mutant (vocabulary duplication)
# needs.
if command grep -qiE 'met[^a-z]{1,4}partial[^a-z]{1,4}missed' "${REPORTER_MD}"; then
  fail "G7-reporter-no-vocab-dup: reporter.md duplicates the met|partial|missed enum -- BUG-041-class drift" "${REPORTER_MD}"
else
  pass "G7-reporter-no-vocab-dup: reporter.md does not duplicate the met|partial|missed enum (GREEN-AT-BASELINE, pins the non-regression)"
fi

# ────────────────────────────────────────────────────────────────────────────
# G6: GOAL_RELATION: advances | off critical path is a separate, per-milestone
# line that does NOT force the sprint verdict away from met (§Q5-B).
# ────────────────────────────────────────────────────────────────────────────
SKILL_MD="${REPO_ROOT}/cleargate-planning/.claude/skills/sprint-execution/SKILL.md"

if command grep -q 'GOAL_RELATION' "${SKILL_MD}"; then
  pass "G6a-skill-goal-relation-exists: SKILL.md defines GOAL_RELATION"
else
  fail "G6a-skill-goal-relation-exists: SKILL.md has no GOAL_RELATION line" "${SKILL_MD}"
fi

if command grep -q 'advances' "${SKILL_MD}" && command grep -q 'off critical path' "${SKILL_MD}"; then
  pass "G6b-skill-goal-relation-enum: SKILL.md names both GOAL_RELATION values (advances | off critical path)"
else
  fail "G6b-skill-goal-relation-enum: SKILL.md is missing one or both GOAL_RELATION values" "${SKILL_MD}"
fi

if command grep -A3 'GOAL_RELATION' "${SKILL_MD}" | command grep -qiE "does not|never (changes|affects|forces)|separate from|distinct from|not (the|a) sprint verdict"; then
  pass "G6c-skill-goal-relation-separate-axis: SKILL.md states GOAL_RELATION does not alter the sprint verdict"
else
  fail "G6c-skill-goal-relation-separate-axis: SKILL.md does not explicitly decouple GOAL_RELATION from the met|partial|missed sprint verdict (§Q5-B)" "${SKILL_MD}"
fi

# ────────────────────────────────────────────────────────────────────────────
# Rule-4 verification: sprint_context is NOT a gated type, so Cross-Cutting
# Rule 4 (## heading insertion renumbers section(N)) is NOT engaged by this
# CR's ## Goal Acceptance Check heading (M4 plan N6) -- verified directly
# rather than assumed. GREEN at baseline; pins the fact against a future
# accidental gating of sprint_context.
#
# NOTE: the OTHER half of N6's claim -- TEMPLATE_FOR
# (cleargate-cli/test/docs/gate-section-index-pinning.node.test.ts) has
# exactly 7 entries with no `sprint_context` key -- is NOT testable from this
# worktree: cleargate-cli has 0 tracked files in the outer repo and does not
# exist under .worktrees/* (FLASHCARD 2026-08-26 #worktree #collision-surface
# #danger). Manually verified from the main checkout instead (see QA-Red
# report); not encoded here because gate-section-index-pinning.node.test.ts is
# outside CR-110's declared file surface (§3 Execution Sandbox) and editing it
# would be scope creep this dispatch does not authorise.
# ────────────────────────────────────────────────────────────────────────────
check_no_sprint_context_gate() {
  local gates_path="$1"
  local label="$2"
  if command grep -q 'work_item_type: sprint_context' "${gates_path}" 2>/dev/null; then
    fail "${label}: readiness-gates.md now gates sprint_context -- Rule 4 IS engaged, section(N) must be recomputed" \
      "${gates_path}"
  else
    pass "${label}: readiness-gates.md has no sprint_context gate block (Rule 4 not engaged)"
  fi
}
check_no_sprint_context_gate "${REPO_ROOT}/.cleargate/knowledge/readiness-gates.md" "RULE4a-live"
check_no_sprint_context_gate "${REPO_ROOT}/cleargate-planning/.cleargate/knowledge/readiness-gates.md" "RULE4b-canonical"

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
