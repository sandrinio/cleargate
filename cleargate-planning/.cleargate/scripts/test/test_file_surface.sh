#!/usr/bin/env bash
# test_file_surface.sh — Gherkin-style tests for file_surface_diff.sh
# Tests all 4 scenarios from STORY-014-01 §2.1
#
# Usage: bash .cleargate/scripts/test/test_file_surface.sh
# Exit: 0 if all pass, 1 if any fail
#
# The gate blocks unconditionally on off-surface staged files;
# SKIP_SURFACE_GATE=1 is the only bypass (see STORY-051-01).

set -euo pipefail

# Navigate up 3 levels: test/ -> scripts/ -> .cleargate/ -> repo-root/
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../../.." && pwd)"
SCRIPT="${REPO_ROOT}/.cleargate/scripts/file_surface_diff.sh"
PASS=0
FAIL=0
TOTAL=0

pass() { echo "  PASS: $1"; PASS=$((PASS+1)); TOTAL=$((TOTAL+1)); }
fail() { echo "  FAIL: $1 --- $2"; FAIL=$((FAIL+1)); TOTAL=$((TOTAL+1)); }

echo "REPO_ROOT: ${REPO_ROOT}"
echo "SCRIPT: ${SCRIPT}"
if [[ ! -f "${SCRIPT}" ]]; then
  echo "ERROR: file_surface_diff.sh not found at ${SCRIPT}"
  exit 1
fi

# ============================================================================
# Setup helpers
# ============================================================================

setup_git_repo() {
  local dir="$1"
  git init -q "${dir}"
  git -C "${dir}" config user.email "test@test.com"
  git -C "${dir}" config user.name "Test"
  git -C "${dir}" commit -q --allow-empty -m "init"
}

create_story_file() {
  local dir="$1"
  shift
  # remaining args are file paths to declare in §3.1
  mkdir -p "${dir}/.cleargate/delivery/pending-sync"
  local story="${dir}/.cleargate/delivery/pending-sync/STORY-014-01_Test.md"
  {
    echo "---"
    echo "story_id: STORY-014-01"
    echo "---"
    echo ""
    echo "# Test Story"
    echo ""
    echo "## 3. Implementation Guide"
    echo ""
    echo "### 3.1 Context & Files"
    echo ""
    echo "| Item | Value |"
    echo "|---|---|"
    for f in "$@"; do
      echo "| New script | \`${f}\` |"
    done
    echo ""
    echo "### 3.2 Technical Logic"
    echo "test"
  } > "${story}"
}

create_sprint_state() {
  local dir="$1"
  mkdir -p "${dir}/.cleargate/sprint-runs/SPRINT-10"
  echo "SPRINT-10" > "${dir}/.cleargate/sprint-runs/.active"
  echo "{\"stories\":{\"STORY-014-01\":{\"state\":\"In Progress\",\"updated_at\":\"2026-04-21T12:00:00Z\"}}}" > "${dir}/.cleargate/sprint-runs/SPRINT-10/state.json"
}

# ============================================================================
# Scenario 1: Gate catches off-surface edit
# ============================================================================

echo ""
echo "Scenario 1: Gate catches off-surface edit"

TMPDIR1="$(mktemp -d)"
setup_git_repo "${TMPDIR1}"
create_story_file "${TMPDIR1}" "hello.mjs" "README.md"
create_sprint_state "${TMPDIR1}"

touch "${TMPDIR1}/hello.mjs" "${TMPDIR1}/README.md" "${TMPDIR1}/unrelated.txt"
git -C "${TMPDIR1}" add hello.mjs README.md unrelated.txt

EXIT_CODE=0
STDERR_OUT="$(CLEARGATE_REPO_ROOT="${TMPDIR1}" bash "${SCRIPT}" 2>&1 >/dev/null)" || EXIT_CODE=$?

if [[ "${EXIT_CODE}" -ne 0 ]]; then
  pass "exit code is non-zero"
else
  fail "exit code is non-zero" "got exit 0"
fi

if echo "${STDERR_OUT}" | grep -q "unrelated.txt"; then
  pass "stderr lists unrelated.txt as off-surface"
else
  fail "stderr lists unrelated.txt as off-surface" "stderr was: ${STDERR_OUT}"
fi

rm -rf "${TMPDIR1}"

# ============================================================================
# Scenario 2: Gate passes when staged files match surface
# ============================================================================

echo ""
echo "Scenario 2: Gate passes when staged files match surface"

TMPDIR2="$(mktemp -d)"
setup_git_repo "${TMPDIR2}"
create_story_file "${TMPDIR2}" "hello.mjs" "README.md"
create_sprint_state "${TMPDIR2}"

touch "${TMPDIR2}/hello.mjs" "${TMPDIR2}/README.md"
git -C "${TMPDIR2}" add hello.mjs README.md

EXIT_CODE=0
CLEARGATE_REPO_ROOT="${TMPDIR2}" bash "${SCRIPT}" 2>/dev/null || EXIT_CODE=$?

if [[ "${EXIT_CODE}" -eq 0 ]]; then
  pass "exit code is 0"
else
  fail "exit code is 0" "got exit ${EXIT_CODE}"
fi

rm -rf "${TMPDIR2}"

# ============================================================================
# Scenario 3: Whitelist admits generated files
# ============================================================================

echo ""
echo "Scenario 3: Whitelist admits generated files"

TMPDIR3="$(mktemp -d)"
setup_git_repo "${TMPDIR3}"
create_story_file "${TMPDIR3}" "hello.mjs"
create_sprint_state "${TMPDIR3}"

mkdir -p "${TMPDIR3}/.cleargate/scripts"
{
  echo "cleargate-planning/MANIFEST.json"
  echo ".cleargate/hook-log/*"
} > "${TMPDIR3}/.cleargate/scripts/surface-whitelist.txt"

touch "${TMPDIR3}/hello.mjs"
mkdir -p "${TMPDIR3}/cleargate-planning"
touch "${TMPDIR3}/cleargate-planning/MANIFEST.json"
git -C "${TMPDIR3}" add hello.mjs cleargate-planning/MANIFEST.json

EXIT_CODE=0
CLEARGATE_REPO_ROOT="${TMPDIR3}" bash "${SCRIPT}" 2>/dev/null || EXIT_CODE=$?

if [[ "${EXIT_CODE}" -eq 0 ]]; then
  pass "MANIFEST.json not flagged (whitelisted)"
else
  fail "MANIFEST.json not flagged (whitelisted)" "got exit ${EXIT_CODE}"
fi

rm -rf "${TMPDIR3}"

# ============================================================================
# Scenario 4: SKIP_SURFACE_GATE=1 bypasses
# ============================================================================

echo ""
echo "Scenario 4: SKIP_SURFACE_GATE=1 bypasses"

TMPDIR4="$(mktemp -d)"
setup_git_repo "${TMPDIR4}"
create_story_file "${TMPDIR4}" "hello.mjs"
create_sprint_state "${TMPDIR4}"

touch "${TMPDIR4}/hello.mjs" "${TMPDIR4}/unrelated.txt"
git -C "${TMPDIR4}" add hello.mjs unrelated.txt

EXIT_CODE=0
STDERR_OUT="$(CLEARGATE_REPO_ROOT="${TMPDIR4}" SKIP_SURFACE_GATE=1 bash "${SCRIPT}" 2>&1 >/dev/null)" || EXIT_CODE=$?

if [[ "${EXIT_CODE}" -eq 0 ]]; then
  pass "SKIP_SURFACE_GATE=1 exits 0 (bypassed)"
else
  fail "SKIP_SURFACE_GATE=1 exits 0" "got exit ${EXIT_CODE}"
fi

if echo "${STDERR_OUT}" | grep -qi "bypassing gate"; then
  pass "SKIP_SURFACE_GATE=1 reports the gate was bypassed"
else
  fail "SKIP_SURFACE_GATE=1 reports bypass" "stderr was: ${STDERR_OUT}"
fi

rm -rf "${TMPDIR4}"


# ============================================================================
# BUG-046: collision_surface.sh worktree-reachability classification
#
# QA-Red baseline (2026-08-29). Scope: C1-C7, C12, C13 per
# .cleargate/sprint-runs/SPRINT-39/plans/M4.md BUG-046 section. C8-C11
# (dep_predecessors + the three parser over-report cases) moved to
# [[BUG-062]] and are OUT of scope here -- do not add them to this file.
#
# collision_surface.sh currently performs NO git classification at all (146
# lines, zero ls-files/check-ignore/tracked checks) -- it is a pure text
# parser. Every scenario below is RED against that baseline unless marked
# green-by-design (with the mutant it guards named explicitly).
#
# QA CONTRACT ASSUMPTION (the item leaves the wire format open -- "annotate
# or exit non-zero" -- Dev may renegotiate at kickback if a different shape
# is more natural, but SOME concrete contract is required to write a real
# red/green test):
#   - An unreachable path is signalled by the case-insensitive substring
#     "unreachable" appearing in the script's combined stdout+stderr for
#     that invocation, alongside the literal path text (exit code may stay 0
#     or go non-zero -- both satisfy the item's "annotate OR exit non-zero").
#   - A nested-independent-repo path (mcp/-shaped) additionally carries the
#     substring "nested" so its guidance is distinguishable from a merely-
#     gitignored path (C2's own distinguishing-message requirement).
#   - Repo root is resolved via CLEARGATE_REPO_ROOT (the existing
#     file_surface_diff.sh:29 convention), never bare CWD -- fixtures set it
#     explicitly rather than `cd`, matching how Scenarios 1-4 above already
#     invoke file_surface_diff.sh.
#   - "file_creates" rows are labelled "New Files Needed", verbatim from
#     architect-reader.md's own field-sources documentation (not invented
#     here) -- see C3.
# ============================================================================

COLLISION_SCRIPT="${REPO_ROOT}/.cleargate/scripts/collision_surface.sh"
if [[ ! -f "${COLLISION_SCRIPT}" ]]; then
  echo "ERROR: collision_surface.sh not found at ${COLLISION_SCRIPT}"
  exit 1
fi

cs_init_repo() {
  # $1 = dir. Real repo + one commit (git check-ignore/ls-files need a valid
  # repo; the commit need not contain anything).
  local dir="$1"
  git init -q "${dir}"
  git -C "${dir}" config user.email "qa@test.com"
  git -C "${dir}" config user.name "QA"
  git -C "${dir}" commit -q --allow-empty -m "init"
}

cs_story() {
  # $1 = dir, $2 = §3.1 row label, $3 = declared path. Prints the story
  # file's absolute path on stdout.
  local dir="$1" label="$2" p="$3"
  mkdir -p "${dir}/.cleargate/delivery/pending-sync"
  local story="${dir}/.cleargate/delivery/pending-sync/STORY-BUG046-CS_Test.md"
  {
    echo "---"
    echo "story_id: STORY-BUG046-CS"
    echo "---"
    echo ""
    echo "# Fixture Story"
    echo ""
    echo "### 3.1 Context & Files"
    echo ""
    echo "| Item | Value |"
    echo "|---|---|"
    echo "| ${label} | \`${p}\` |"
    echo ""
    echo "### 3.2 Technical Logic"
    echo "test"
  } > "${story}"
  echo "${story}"
}

cs_run() {
  # $1 = CLEARGATE_REPO_ROOT dir, $2 = story file path.
  # Sets globals CS_OUT (combined stdout+stderr) and CS_EC (exit code).
  local dir="$1" story="$2"
  CS_EC=0
  CS_OUT="$(CLEARGATE_REPO_ROOT="${dir}" bash "${COLLISION_SCRIPT}" "${story}" 2>&1)" || CS_EC=$?
}

flagged_unreachable() {
  # $1 = combined output, $2 = path. True iff both the "unreachable" marker
  # and the literal path appear somewhere in the output.
  echo "$1" | command grep -qi "unreachable" && echo "$1" | command grep -qF "$2"
}

# ---- C1: gitignored path is flagged unreachable (THE RED) -----------------

echo ""
echo "Scenario 5 (BUG-046 C1): gitignored path is flagged unreachable"

TMPDIR5="$(mktemp -d)"
cs_init_repo "${TMPDIR5}"
mkdir -p "${TMPDIR5}/vendor"
echo "/vendor/" > "${TMPDIR5}/.gitignore"
echo "export const x = 1;" > "${TMPDIR5}/vendor/lib.ts"
STORY5="$(cs_story "${TMPDIR5}" "Modify" "vendor/lib.ts")"

cs_run "${TMPDIR5}" "${STORY5}"

if flagged_unreachable "${CS_OUT}" "vendor/lib.ts"; then
  pass "BUG-046 C1: gitignored vendor/lib.ts flagged unreachable"
else
  fail "BUG-046 C1: gitignored vendor/lib.ts flagged unreachable" "output was: ${CS_OUT}"
fi

rm -rf "${TMPDIR5}"

# ---- C2: nested independent repo -> distinguishing message ----------------

echo ""
echo "Scenario 6 (BUG-046 C2): nested independent repo path flagged with a distinguishing message"

TMPDIR6="$(mktemp -d)"
cs_init_repo "${TMPDIR6}"
mkdir -p "${TMPDIR6}/mcp/.git"   # fake nested-repo boundary, mirrors real mcp/
echo "/mcp/" > "${TMPDIR6}/.gitignore"
STORY6="$(cs_story "${TMPDIR6}" "Modify" "mcp/src/index.ts")"

cs_run "${TMPDIR6}" "${STORY6}"

if flagged_unreachable "${CS_OUT}" "mcp/src/index.ts" && echo "${CS_OUT}" | command grep -qi "nested"; then
  pass "BUG-046 C2: nested-repo mcp/ path flagged, message distinguishes 'nested'"
else
  fail "BUG-046 C2: nested-repo mcp/ path flagged, message distinguishes 'nested'" "output was: ${CS_OUT}"
fi

rm -rf "${TMPDIR6}"

# ---- C3: file_creates path not yet on disk is NOT flagged (false-positive
#          guard -- the item's own highest-risk case) -----------------------
# GREEN-BY-DESIGN at today's baseline (unannotated emission trivially never
# says "unreachable"). Named mutant it guards: a classifier keyed on
# fs.existsSync instead of git ls-files/check-ignore, which would see "does
# not exist on disk" and wrongly flag every new-file story -- turning every
# new-file story into a refusal sprint-repo-wide (dispatch's own framing).

echo ""
echo "Scenario 7 (BUG-046 C3): a declared-new (file_creates) path that does not exist yet is NOT flagged"

TMPDIR7="$(mktemp -d)"
cs_init_repo "${TMPDIR7}"
# deliberately do NOT create brand/new-module.ts on disk.
STORY7="$(cs_story "${TMPDIR7}" "New Files Needed" "brand/new-module.ts")"

cs_run "${TMPDIR7}" "${STORY7}"

if flagged_unreachable "${CS_OUT}" "brand/new-module.ts"; then
  fail "BUG-046 C3: file_creates path not flagged" "wrongly flagged unreachable: ${CS_OUT}"
else
  pass "BUG-046 C3: file_creates path not flagged (false-positive guard, green-by-design -- guards fs.existsSync classifier)"
fi

rm -rf "${TMPDIR7}"

# ---- C4: untracked-but-not-ignored path (regular row) IS flagged ----------

echo ""
echo "Scenario 8 (BUG-046 C4): an untracked, non-ignored path (authoring mistake) is flagged unreachable"

TMPDIR8="$(mktemp -d)"
cs_init_repo "${TMPDIR8}"
mkdir -p "${TMPDIR8}/oops"
echo "content" > "${TMPDIR8}/oops/forgot.ts"   # on disk, never `git add`-ed, no gitignore rule
STORY8="$(cs_story "${TMPDIR8}" "Modify" "oops/forgot.ts")"

cs_run "${TMPDIR8}" "${STORY8}"

if flagged_unreachable "${CS_OUT}" "oops/forgot.ts"; then
  pass "BUG-046 C4: untracked-but-not-ignored path flagged"
else
  fail "BUG-046 C4: untracked-but-not-ignored path flagged" "output was: ${CS_OUT}"
fi

rm -rf "${TMPDIR8}"

# ---- C5: no .gitignore at all -> zero flags, no crash ---------------------
# GREEN-BY-DESIGN at today's baseline (no git awareness at all today, so
# trivially both "exit 0" and "no unreachable text" already hold). Named
# mutant it guards: a classifier that unconditionally reads .gitignore (or
# calls `git check-ignore` without tolerating its normal exit-1 under
# `set -e`) and crashes / flags everything when the file is simply absent.

echo ""
echo "Scenario 9 (BUG-046 C5): repo with no .gitignore at all produces zero flags and does not crash"

TMPDIR9="$(mktemp -d)"
cs_init_repo "${TMPDIR9}"
# deliberately NO .gitignore file at all
mkdir -p "${TMPDIR9}/tracked"
echo "content" > "${TMPDIR9}/tracked/file.ts"
git -C "${TMPDIR9}" add tracked/file.ts
git -C "${TMPDIR9}" commit -q -m "add tracked file"
STORY9="$(cs_story "${TMPDIR9}" "Modify" "tracked/file.ts")"

cs_run "${TMPDIR9}" "${STORY9}"

if [[ "${CS_EC}" -eq 0 ]] && ! echo "${CS_OUT}" | command grep -qi "unreachable"; then
  pass "BUG-046 C5: no .gitignore -> zero flags, exit 0, no crash (green-by-design -- guards .gitignore-required classifier)"
else
  fail "BUG-046 C5: no .gitignore -> zero flags, exit 0, no crash" "exit=${CS_EC} output=${CS_OUT}"
fi

rm -rf "${TMPDIR9}"

# ---- C7: existing test_file_surface.sh scenarios stay green ---------------
# No new fixture code -- Scenarios 1-4 above are untouched by this story and
# re-run every time this file runs. Their PASS/FAIL is folded into the same
# summary counters below; a regression there fails the suite as a whole.

# ---- C6: architect-synth documents a REFUSAL (not a third serialize) for
#          unreachable surface entries -------------------------------------

echo ""
echo "Scenario 10 (BUG-046 C6): architect-synth.md documents a REFUSAL for unreachable surface entries"

SYNTH_MD="${REPO_ROOT}/cleargate-planning/.claude/agents/architect-synth.md"
if [[ ! -f "${SYNTH_MD}" ]]; then
  fail "BUG-046 C6: architect-synth.md exists" "not found at ${SYNTH_MD}"
elif command grep -qi "refus" "${SYNTH_MD}" && command grep -qi "unreachable" "${SYNTH_MD}"; then
  pass "BUG-046 C6: architect-synth.md documents a refusal for unreachable entries"
else
  fail "BUG-046 C6: architect-synth.md documents a refusal for unreachable entries" "no refus*/unreachable text found in ${SYNTH_MD}"
fi

# ---- C12: refusal is scoped to wave-plan GENERATION only ------------------
# (a) is the RED sub-check (no such scoping language exists at baseline).
# (b) and (c) are green-by-design regression guards bundled into the same
# case, per the item's own scoping decision (2026-08-26 SDR halt): the
# refusal must never run against an already-written waves.json or at
# dispatch time, or it would retroactively invalidate SPRINT-39's own
# confirmed waves 11-13 (CR-108 declares cleargate-cli/src/** paths the new
# check would refuse).

echo ""
echo "Scenario 11 (BUG-046 C12): reachability refusal is scoped to wave-plan GENERATION only"

READER_MD="${REPO_ROOT}/cleargate-planning/.claude/agents/architect-reader.md"
LAUNCH_WAVE="${REPO_ROOT}/.cleargate/scripts/launch_wave.mjs"

C12_OK=1
C12_WHY=""

# (a) POSITIVE / RED: architect-synth.md must say, explicitly, that the
# refusal is a generation-time concern.
if ! (command grep -qi "generation" "${SYNTH_MD}" && command grep -qiE "unreachable|reachab" "${SYNTH_MD}"); then
  C12_OK=0
  C12_WHY="architect-synth.md has no generation-time scoping language for the refusal"
fi

# (b) REGRESSION: architect-reader is a pure digest reporter -- it must never
# itself refuse/reject a story (that stays architect-synth's job).
if command grep -qi "refus\|reject" "${READER_MD}"; then
  C12_OK=0
  C12_WHY="${C12_WHY} | architect-reader.md now contains refus/reject language -- refusal leaked into the reader"
fi

# (c) REGRESSION: launch_wave.mjs is the dispatch-time script (Do-NOT-modify
# per the M4 plan). Baseline already has ONE unrelated "unreachable" hit
# (:59, "test DB unreachable, MCP down") -- assert the count does not grow.
LW_COUNT="$(command grep -ic "reachab" "${LAUNCH_WAVE}" || true)"
if [[ "${LW_COUNT}" -ne 1 ]]; then
  C12_OK=0
  C12_WHY="${C12_WHY} | launch_wave.mjs 'reachab' count changed from baseline 1 to ${LW_COUNT} -- dispatch-time check suspected"
fi

if [[ "${C12_OK}" -eq 1 ]]; then
  pass "BUG-046 C12: refusal scoped to generation, reader/dispatch untouched"
else
  fail "BUG-046 C12: refusal scoped to generation, reader/dispatch untouched" "${C12_WHY}"
fi

# ---- C13: whole-tree documentation grep (not the two known lines) ---------

echo ""
echo "Scenario 12 (BUG-046 C13): no file under .cleargate/knowledge/ or cleargate-planning/.claude/ claims gitignored/nested-repo paths are visible inside a worktree"

DOC_HITS="$(command grep -rniE "visible[^.]*(as a )?subdirectory" \
  "${REPO_ROOT}/.cleargate/knowledge" \
  "${REPO_ROOT}/cleargate-planning/.claude" \
  2>/dev/null || true)"

if [[ -z "${DOC_HITS}" ]]; then
  pass "BUG-046 C13: no false 'visible as a subdirectory' claim anywhere in knowledge/ or canonical .claude/"
else
  fail "BUG-046 C13: no false 'visible as a subdirectory' claim anywhere in knowledge/ or canonical .claude/" "hits: ${DOC_HITS}"
fi


# ============================================================================
# Summary
# ============================================================================

echo ""
echo "Results: ${PASS}/${TOTAL} passed, ${FAIL} failed"

if [[ "${FAIL}" -gt 0 ]]; then
  exit 1
fi
exit 0
