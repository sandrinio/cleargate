#!/usr/bin/env bash
# ============================================================
# test_template_gate_correctness.red.sh — QA-RED for STORY-043-03
# ============================================================
# IMMUTABLE (post-Red): This file was authored by the QA-Red agent
# and encodes the acceptance contract for STORY-043-03. It MUST NOT
# be edited by the Developer or any subsequent agent. The Developer
# delivers the implementation against which this red test goes green.
#
# Purpose:
#   Encode the 6 Gherkin acceptance scenarios for
#   "Template / Gate Correctness — De-number Headings, Add
#   context_source, Fix Bug Repro" (STORY-043-03, SPRINT-33 M1).
#
# Scenarios:
#   T1 (epic reuse/right-size): scratch Epic from epic.md →
#      gate check passes reuse-audit-recorded + simplest-form-justified.
#      FAILS today: ## 3.5 Existing Surfaces / ## 3.6 Why not simpler?
#      are numbered; literal-substring predicate misses them.
#
#   T2 (story positional intact): scratch Story from story.md →
#      "## Existing Surfaces" + "## Why not simpler?" appear AFTER
#      "## 4. Quality Gates"; implementation-files-declared=section3
#      and dod-declared=section4 predicates pass.
#      FAILS today (partially): headings are ### 1.6 / ### 1.7 inside
#      §1 run, not de-numbered and not relocated after §4.
#
#   T3 (CR + Bug discovery-checked): scratch CR from CR.md, scratch Bug
#      from Bug.md → each has non-empty context_source frontmatter;
#      discovery-checked passes for both.
#      FAILS today: neither template declares context_source.
#
#   T4 (Bug repro determinism): scratch Bug from Bug.md → §2
#      Reproduction uses "- " bullets (countDeclaredItems > 0);
#      section(2) positional index resolves to Reproduction (not
#      Open Questions); repro-steps-deterministic passes.
#      FAILS today: ordered list 1./2./3. scores 0; ## 0.5 Open
#      Questions shifts positional index.
#
#   T5 (mirror parity): diff -q CR.md + Bug.md working copy vs
#      cleargate-planning/.cleargate/templates/ canonical → zero diff.
#      PASSES today (byte-identical before any edits). Dev must keep
#      them identical after editing.
#
#   T6 (proposal purge): grep epic.md + story.md for retired Proposal
#      refs → zero matches.
#      FAILS today: PROPOSAL-{ID}.md, "approved proposal.md", and
#      "from the approved proposal" refs present.
#
# Usage:
#   bash .cleargate/scripts/test/test_template_gate_correctness.red.sh
#
# Expected at RED baseline: T1, T2, T3, T4, T6 FAIL; T5 PASSES.
# Expected after implementation: all 6 PASS.
#
# Path resolution:
#   SCRIPT_DIR = this file's directory (.cleargate/scripts/test/ inside worktree)
#   REPO_ROOT  = SCRIPT_DIR/../../.. = worktree checkout root
#   OUTER_REPO = derived via `git rev-parse --git-common-dir` (strips /.git suffix)
#                — worktrees use a .git file pointing to the main repo; this walks
#                  back to the outer repo where cleargate-cli/ lives.
#   CLI        = ${OUTER_REPO}/cleargate-cli/dist/cli.js
#                Override: CLEARGATE_CLI env var (for CI on non-worktree checkouts).
# ============================================================

set -u

# ----------------------------------------------------------------
# Resolve paths
# ----------------------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../../.." && pwd)"

TEMPLATES_DIR="${REPO_ROOT}/.cleargate/templates"
CANONICAL_DIR="${REPO_ROOT}/cleargate-planning/.cleargate/templates"

# Locate the CLI: prefer CLEARGATE_CLI env override; otherwise derive
# outer-repo root via git common dir (handles worktree + main checkout).
if [[ -n "${CLEARGATE_CLI:-}" ]]; then
  CLI="${CLEARGATE_CLI}"
else
  GIT_COMMON_DIR="$(git -C "${REPO_ROOT}" rev-parse --git-common-dir 2>/dev/null || true)"
  if [[ -n "${GIT_COMMON_DIR}" && "${GIT_COMMON_DIR}" != ".git" ]]; then
    # Worktree: git-common-dir = /path/to/main/.git → strip /.git
    OUTER_REPO="$(dirname "${GIT_COMMON_DIR}")"
  else
    # Main checkout: git-common-dir = .git (relative) → REPO_ROOT is outer
    OUTER_REPO="${REPO_ROOT}"
  fi
  CLI="${OUTER_REPO}/cleargate-cli/dist/cli.js"
fi

# ----------------------------------------------------------------
# Pre-flight: verify required paths exist
# ----------------------------------------------------------------
for required in \
    "${TEMPLATES_DIR}/epic.md" \
    "${TEMPLATES_DIR}/story.md" \
    "${TEMPLATES_DIR}/CR.md" \
    "${TEMPLATES_DIR}/Bug.md" \
    "${CANONICAL_DIR}/CR.md" \
    "${CANONICAL_DIR}/Bug.md" \
    "${CLI}"; do
  if [[ ! -e "${required}" ]]; then
    printf 'ERROR: required path not found: %s\n' "${required}" >&2
    exit 2
  fi
done

# ----------------------------------------------------------------
# Counters
# ----------------------------------------------------------------
PASS=0
FAIL=0

# ----------------------------------------------------------------
# Assertion helpers
# ----------------------------------------------------------------
assert_eq() {
  local label="$1" expected="$2" actual="$3"
  if [[ "${expected}" == "${actual}" ]]; then
    printf 'PASS: %s\n' "${label}"
    PASS=$(( PASS + 1 ))
  else
    printf 'FAIL: %s — expected=%q actual=%q\n' "${label}" "${expected}" "${actual}"
    FAIL=$(( FAIL + 1 ))
  fi
}

assert_contains() {
  local label="$1" needle="$2" haystack="$3"
  if printf '%s' "${haystack}" | grep -qF "${needle}"; then
    printf 'PASS: %s\n' "${label}"
    PASS=$(( PASS + 1 ))
  else
    printf 'FAIL: %s — needle not found in output\n  needle: %s\n' "${label}" "${needle}"
    FAIL=$(( FAIL + 1 ))
  fi
}

# gate_check_output: run gate check on a file; capture combined stdout+stderr.
# Sets global GC_OUTPUT and GC_RC.
GC_OUTPUT=""
GC_RC=0

gate_check() {
  local file="$1"
  local out_file
  out_file="$(mktemp)"
  node "${CLI}" gate check "${file}" > "${out_file}" 2>&1
  GC_RC=$?
  GC_OUTPUT="$(cat "${out_file}")"
  rm -f "${out_file}"
}

# ----------------------------------------------------------------
# mk_tmpdir: create isolated temp directory
# ----------------------------------------------------------------
mk_tmpdir() {
  mktemp -d "/tmp/cg-043-03-red.XXXXXX"
}

# ----------------------------------------------------------------
# Scratch-file builders: strip <instructions> preamble, patch YAML.
# Each returns the path to the scratch file via stdout.
# ----------------------------------------------------------------

mk_epic_scratch() {
  local tmpdir="$1"
  local src="${TEMPLATES_DIR}/epic.md"
  local dest="${tmpdir}/EPIC-RED-scratch.md"

  local body_start
  body_start="$(grep -n '^---$' "${src}" | head -1 | cut -d: -f1)"
  tail -n +"${body_start}" "${src}" > "${dest}"

  perl -i -pe '
    s/epic_id: "EPIC-\{ID\}"/epic_id: "EPIC-RED"/;
    s/context_source: "PROPOSAL-\{ID\}\.md"/context_source: "approved Epic \/ verified codebase grounding + recorded direct approval"/;
    s/owner: "\{PM\/PO name\}"/owner: "qa-red"/;
    s/target_date: "\{YYYY-MM-DD\}"/target_date: "2026-06-01"/;
  ' "${dest}"

  printf '%s' "${dest}"
}

mk_story_scratch() {
  local tmpdir="$1"
  local src="${TEMPLATES_DIR}/story.md"
  local dest="${tmpdir}/STORY-RED-scratch.md"

  local body_start
  body_start="$(grep -n '^---$' "${src}" | head -1 | cut -d: -f1)"
  tail -n +"${body_start}" "${src}" > "${dest}"

  perl -i -pe '
    s/story_id: "STORY-\{EpicID\}-\{StoryID\}-\{StoryName\}"/story_id: "STORY-RED-01"/;
    s/parent_epic_ref: "EPIC-\{ID\}"/parent_epic_ref: "EPIC-RED"/;
    s/context_source: "PROPOSAL-\{ID\}\.md"/context_source: "approved Epic \/ verified codebase grounding + recorded direct approval"/;
    s/actor: "\{Persona Name\}"/actor: "qa-red-agent"/;
  ' "${dest}"

  printf '%s' "${dest}"
}

mk_cr_scratch() {
  local tmpdir="$1"
  local src="${TEMPLATES_DIR}/CR.md"
  local dest="${tmpdir}/CR-RED-scratch.md"

  local body_start
  body_start="$(grep -n '^---$' "${src}" | head -1 | cut -d: -f1)"
  tail -n +"${body_start}" "${src}" > "${dest}"

  perl -i -pe '
    s/cr_id: "CR-\{ID\}"/cr_id: "CR-RED"/;
    s/parent_ref: "EPIC-\{ID\} \| STORY-\{ID\}"/parent_ref: "EPIC-RED"/;
    s/status: "Draft \| In Review \| Approved \| Completed"/status: "Draft"/;
  ' "${dest}"

  printf '%s' "${dest}"
}

mk_bug_scratch() {
  local tmpdir="$1"
  local src="${TEMPLATES_DIR}/Bug.md"
  local dest="${tmpdir}/BUG-RED-scratch.md"

  local body_start
  body_start="$(grep -n '^---$' "${src}" | head -1 | cut -d: -f1)"
  tail -n +"${body_start}" "${src}" > "${dest}"

  perl -i -pe '
    s/bug_id: "BUG-\{ID\}"/bug_id: "BUG-RED"/;
    s/parent_ref: "EPIC-\{ID\} \| STORY-\{ID\}"/parent_ref: "EPIC-RED"/;
    s/status: "Draft \| Triaged \| In Fix \| Completed"/status: "Draft"/;
    s/severity: "P0-Critical \| P1-High \| P2-Medium \| P3-Low"/severity: "P2-Medium"/;
    s/reporter: "\{name\}"/reporter: "qa-red-agent"/;
  ' "${dest}"

  printf '%s' "${dest}"
}

# ================================================================
# T1: Epic reuse/right-size predicates pass on template-derived Epic
# ================================================================
printf '\n=== T1: Epic scratch — reuse-audit-recorded + simplest-form-justified ===\n'
printf '(Expected to FAIL at red baseline: ## 3.5/## 3.6 numbered headings miss literal match)\n'

T1_TMP="$(mk_tmpdir)"
T1_EPIC="$(mk_epic_scratch "${T1_TMP}")"

gate_check "${T1_EPIC}"
T1_OUTPUT="${GC_OUTPUT}"

if printf '%s' "${T1_OUTPUT}" | grep -qiE 'reuse-audit-recorded.*pass|✓.*reuse-audit-recorded|reuse-audit-recorded.*✓'; then
  printf 'PASS: T1-A: reuse-audit-recorded PASSES on epic scratch\n'
  PASS=$(( PASS + 1 ))
else
  printf 'FAIL: T1-A: reuse-audit-recorded does NOT pass on epic scratch (red baseline — expected)\n'
  printf '      gate output lines containing "reuse":\n'
  printf '%s\n' "${T1_OUTPUT}" | grep -i 'reuse' | head -5 | sed 's/^/        /'
  FAIL=$(( FAIL + 1 ))
fi

if printf '%s' "${T1_OUTPUT}" | grep -qiE 'simplest-form-justified.*pass|✓.*simplest-form-justified|simplest-form-justified.*✓'; then
  printf 'PASS: T1-B: simplest-form-justified PASSES on epic scratch\n'
  PASS=$(( PASS + 1 ))
else
  printf 'FAIL: T1-B: simplest-form-justified does NOT pass on epic scratch (red baseline — expected)\n'
  printf '      gate output lines containing "simplest":\n'
  printf '%s\n' "${T1_OUTPUT}" | grep -i 'simplest' | head -5 | sed 's/^/        /'
  FAIL=$(( FAIL + 1 ))
fi

rm -rf "${T1_TMP}"

# ================================================================
# T2: Story positional predicates intact — heading relocation + section3/4
# ================================================================
printf '\n=== T2: Story scratch — positional predicates + heading relocation ===\n'
printf '(Expected to FAIL at red baseline: ### 1.6/### 1.7 inside §1, not relocated after §4)\n'

T2_TMP="$(mk_tmpdir)"
T2_STORY="$(mk_story_scratch "${T2_TMP}")"

# Sub-check A: "## Existing Surfaces" appears after "## 4. Quality Gates"
QUALITY_GATES_LINE="$(grep -n '^## 4\. Quality Gates' "${T2_STORY}" | head -1 | cut -d: -f1)"
ES_LINE="$(grep -n '^## Existing Surfaces$' "${T2_STORY}" | head -1 | cut -d: -f1)"
WNS_LINE="$(grep -n '^## Why not simpler?$' "${T2_STORY}" | head -1 | cut -d: -f1)"

if [[ -z "${QUALITY_GATES_LINE}" ]]; then
  printf 'FAIL: T2-A-pre: "## 4. Quality Gates" not found in story scratch\n'
  FAIL=$(( FAIL + 1 ))
else
  if [[ -n "${ES_LINE}" && "${ES_LINE}" -gt "${QUALITY_GATES_LINE}" ]]; then
    printf 'PASS: T2-A: "## Existing Surfaces" appears after "## 4. Quality Gates" (line %s > %s)\n' "${ES_LINE}" "${QUALITY_GATES_LINE}"
    PASS=$(( PASS + 1 ))
  else
    printf 'FAIL: T2-A: "## Existing Surfaces" missing or not after "## 4. Quality Gates" (red baseline)\n'
    printf '      QG_LINE=%s, ES_LINE=%s\n' "${QUALITY_GATES_LINE}" "${ES_LINE:-<not found as H2>}"
    FAIL=$(( FAIL + 1 ))
  fi

  if [[ -n "${WNS_LINE}" && "${WNS_LINE}" -gt "${QUALITY_GATES_LINE}" ]]; then
    printf 'PASS: T2-B: "## Why not simpler?" appears after "## 4. Quality Gates" (line %s > %s)\n' "${WNS_LINE}" "${QUALITY_GATES_LINE}"
    PASS=$(( PASS + 1 ))
  else
    printf 'FAIL: T2-B: "## Why not simpler?" missing or not after "## 4. Quality Gates" (red baseline)\n'
    printf '      QG_LINE=%s, WNS_LINE=%s\n' "${QUALITY_GATES_LINE}" "${WNS_LINE:-<not found as H2>}"
    FAIL=$(( FAIL + 1 ))
  fi
fi

# Sub-check C+D: gate check — implementation-files-declared and dod-declared
gate_check "${T2_STORY}"
T2_OUTPUT="${GC_OUTPUT}"

if printf '%s' "${T2_OUTPUT}" | grep -qiE 'implementation-files-declared.*pass|✓.*implementation-files-declared|implementation-files-declared.*✓'; then
  printf 'PASS: T2-C: implementation-files-declared PASSES (section 3 unshifted)\n'
  PASS=$(( PASS + 1 ))
else
  printf 'FAIL: T2-C: implementation-files-declared does NOT pass — section 3 may have shifted\n'
  printf '%s\n' "${T2_OUTPUT}" | grep -i 'implementation' | head -3 | sed 's/^/        /'
  FAIL=$(( FAIL + 1 ))
fi

if printf '%s' "${T2_OUTPUT}" | grep -qiE 'dod-declared.*pass|✓.*dod-declared|dod-declared.*✓'; then
  printf 'PASS: T2-D: dod-declared PASSES (section 4 unshifted)\n'
  PASS=$(( PASS + 1 ))
else
  printf 'FAIL: T2-D: dod-declared does NOT pass — section 4 may have shifted\n'
  printf '%s\n' "${T2_OUTPUT}" | grep -i 'dod' | head -3 | sed 's/^/        /'
  FAIL=$(( FAIL + 1 ))
fi

rm -rf "${T2_TMP}"

# ================================================================
# T3: CR + Bug — context_source present and discovery-checked passes
# ================================================================
printf '\n=== T3: CR + Bug scratch — context_source + discovery-checked ===\n'
printf '(Expected to FAIL at red baseline: no context_source in either template)\n'

T3_TMP="$(mk_tmpdir)"
T3_CR="$(mk_cr_scratch "${T3_TMP}")"
T3_BUG="$(mk_bug_scratch "${T3_TMP}")"

# T3-A: CR has non-empty context_source frontmatter
CR_CONTEXT_SOURCE="$(grep '^context_source:' "${T3_CR}" | head -1)"
if [[ -n "${CR_CONTEXT_SOURCE}" ]] && ! printf '%s' "${CR_CONTEXT_SOURCE}" | grep -qE '^context_source:\s*(null|""\s*$|\s*$)'; then
  printf 'PASS: T3-A: CR scratch has non-empty context_source: %s\n' "${CR_CONTEXT_SOURCE}"
  PASS=$(( PASS + 1 ))
else
  printf 'FAIL: T3-A: CR scratch missing or empty context_source (red baseline)\n'
  printf '      found: %s\n' "${CR_CONTEXT_SOURCE:-<absent>}"
  FAIL=$(( FAIL + 1 ))
fi

# T3-B: Bug has non-empty context_source frontmatter
BUG_CONTEXT_SOURCE="$(grep '^context_source:' "${T3_BUG}" | head -1)"
if [[ -n "${BUG_CONTEXT_SOURCE}" ]] && ! printf '%s' "${BUG_CONTEXT_SOURCE}" | grep -qE '^context_source:\s*(null|""\s*$|\s*$)'; then
  printf 'PASS: T3-B: Bug scratch has non-empty context_source: %s\n' "${BUG_CONTEXT_SOURCE}"
  PASS=$(( PASS + 1 ))
else
  printf 'FAIL: T3-B: Bug scratch missing or empty context_source (red baseline)\n'
  printf '      found: %s\n' "${BUG_CONTEXT_SOURCE:-<absent>}"
  FAIL=$(( FAIL + 1 ))
fi

# T3-C: gate check CR → discovery-checked passes
gate_check "${T3_CR}"
T3_CR_OUTPUT="${GC_OUTPUT}"
if printf '%s' "${T3_CR_OUTPUT}" | grep -qiE 'discovery-checked.*pass|✓.*discovery-checked|discovery-checked.*✓'; then
  printf 'PASS: T3-C: CR gate check — discovery-checked PASSES\n'
  PASS=$(( PASS + 1 ))
else
  printf 'FAIL: T3-C: CR gate check — discovery-checked does NOT pass (red baseline)\n'
  printf '%s\n' "${T3_CR_OUTPUT}" | grep -i 'discovery' | head -3 | sed 's/^/        /'
  FAIL=$(( FAIL + 1 ))
fi

# T3-D: gate check Bug → discovery-checked passes
gate_check "${T3_BUG}"
T3_BUG_OUTPUT="${GC_OUTPUT}"
if printf '%s' "${T3_BUG_OUTPUT}" | grep -qiE 'discovery-checked.*pass|✓.*discovery-checked|discovery-checked.*✓'; then
  printf 'PASS: T3-D: Bug gate check — discovery-checked PASSES\n'
  PASS=$(( PASS + 1 ))
else
  printf 'FAIL: T3-D: Bug gate check — discovery-checked does NOT pass (red baseline)\n'
  printf '%s\n' "${T3_BUG_OUTPUT}" | grep -i 'discovery' | head -3 | sed 's/^/        /'
  FAIL=$(( FAIL + 1 ))
fi

rm -rf "${T3_TMP}"

# ================================================================
# T4: Bug repro determinism — bullets, section(2)=Reproduction,
#     repro-steps-deterministic passes
# ================================================================
printf '\n=== T4: Bug scratch — repro bullets + section(2) positional + predicate ===\n'
printf '(Expected to FAIL at red baseline: ordered list + ## 0.5 shifts index)\n'

T4_TMP="$(mk_tmpdir)"
T4_BUG="$(mk_bug_scratch "${T4_TMP}")"

# T4-A: §2 Reproduction uses "- " bullets (not "1. " ordinals)
# Count "- " bullets in §2 body (between ## 2. and next ## heading)
REPRO_BULLETS="$(awk '/^## 2\. Reproduction Protocol/,/^## [0-9]/' "${T4_BUG}" | grep -c '^- ' || true)"
REPRO_ORDINALS="$(awk '/^## 2\. Reproduction Protocol/,/^## [0-9]/' "${T4_BUG}" | grep -cE '^[0-9]+\. ' || true)"

if [[ "${REPRO_BULLETS}" -gt 0 ]]; then
  printf 'PASS: T4-A: §2 Reproduction has %d bullet items ("- " prefix)\n' "${REPRO_BULLETS}"
  PASS=$(( PASS + 1 ))
else
  printf 'FAIL: T4-A: §2 Reproduction has 0 bullet items (red baseline: ordinal list with %d items)\n' "${REPRO_ORDINALS}"
  FAIL=$(( FAIL + 1 ))
fi

# T4-B: section(2) resolves to Reproduction — the 2nd H2 heading (1-indexed)
# after the YAML front-matter should contain "Reproduction".
IN_YAML=0
H2_INDEX=0
SECTION2_HEADING=""
while IFS= read -r line; do
  if [[ "${line}" == "---" ]]; then
    if [[ "${IN_YAML}" -eq 0 ]]; then IN_YAML=1; continue
    else IN_YAML=0; continue; fi
  fi
  [[ "${IN_YAML}" -eq 1 ]] && continue
  if printf '%s' "${line}" | grep -qE '^## '; then
    H2_INDEX=$(( H2_INDEX + 1 ))
    if [[ "${H2_INDEX}" -eq 2 ]]; then
      SECTION2_HEADING="${line}"
      break
    fi
  fi
done < "${T4_BUG}"

if printf '%s' "${SECTION2_HEADING}" | grep -qiE 'Reproduction'; then
  printf 'PASS: T4-B: section(2) resolves to Reproduction: "%s"\n' "${SECTION2_HEADING}"
  PASS=$(( PASS + 1 ))
else
  printf 'FAIL: T4-B: section(2) does NOT resolve to Reproduction (red baseline)\n'
  printf '      2nd H2 heading found: "%s"\n' "${SECTION2_HEADING:-<none found>}"
  FAIL=$(( FAIL + 1 ))
fi

# T4-C: repro-steps-deterministic predicate passes via gate check
gate_check "${T4_BUG}"
T4_OUTPUT="${GC_OUTPUT}"
if printf '%s' "${T4_OUTPUT}" | grep -qiE 'repro-steps-deterministic.*pass|✓.*repro-steps-deterministic|repro-steps-deterministic.*✓'; then
  printf 'PASS: T4-C: repro-steps-deterministic PASSES on Bug scratch\n'
  PASS=$(( PASS + 1 ))
else
  printf 'FAIL: T4-C: repro-steps-deterministic does NOT pass (red baseline)\n'
  printf '%s\n' "${T4_OUTPUT}" | grep -i 'repro' | head -3 | sed 's/^/        /'
  FAIL=$(( FAIL + 1 ))
fi

rm -rf "${T4_TMP}"

# ================================================================
# T5: Mirror parity — CR.md + Bug.md byte-identical with canonical
# ================================================================
printf '\n=== T5: Mirror parity — CR.md + Bug.md diff vs canonical ===\n'
printf '(Expected to PASS today; Dev must keep identical after editing)\n'

CR_DIFF_OUT="$(diff -q "${TEMPLATES_DIR}/CR.md" "${CANONICAL_DIR}/CR.md" 2>&1)"
CR_DIFF_RC=$?
if [[ "${CR_DIFF_RC}" -eq 0 ]]; then
  printf 'PASS: T5-A: CR.md byte-identical with canonical\n'
  PASS=$(( PASS + 1 ))
else
  printf 'FAIL: T5-A: CR.md differs from canonical: %s\n' "${CR_DIFF_OUT}"
  FAIL=$(( FAIL + 1 ))
fi

BUG_DIFF_OUT="$(diff -q "${TEMPLATES_DIR}/Bug.md" "${CANONICAL_DIR}/Bug.md" 2>&1)"
BUG_DIFF_RC=$?
if [[ "${BUG_DIFF_RC}" -eq 0 ]]; then
  printf 'PASS: T5-B: Bug.md byte-identical with canonical\n'
  PASS=$(( PASS + 1 ))
else
  printf 'FAIL: T5-B: Bug.md differs from canonical: %s\n' "${BUG_DIFF_OUT}"
  FAIL=$(( FAIL + 1 ))
fi

# ================================================================
# T6: Proposal purge — zero retired-Proposal refs in epic.md + story.md
# ================================================================
printf '\n=== T6: Proposal purge — grep epic.md + story.md for stale refs ===\n'
printf '(Expected to FAIL at red baseline: PROPOSAL-{ID}.md, "approved proposal.md", etc. present)\n'

T6_GREP="$(grep -nE 'PROPOSAL-\{ID\}\.md|approved proposal\.md|from the approved proposal' \
    "${TEMPLATES_DIR}/epic.md" "${TEMPLATES_DIR}/story.md" 2>&1 || true)"
T6_COUNT="$(printf '%s' "${T6_GREP}" | grep -c . || true)"

if [[ "${T6_COUNT}" -eq 0 ]]; then
  printf 'PASS: T6-A: zero retired-Proposal refs found in epic.md + story.md\n'
  PASS=$(( PASS + 1 ))
else
  printf 'FAIL: T6-A: %d retired-Proposal ref(s) found (red baseline — expected)\n' "${T6_COUNT}"
  printf '%s\n' "${T6_GREP}" | head -10
  FAIL=$(( FAIL + 1 ))
fi

# T6-B: context_source default in epic.md reads the approved-Epic wording
EPIC_CS="$(grep '^context_source:' "${TEMPLATES_DIR}/epic.md" | head -1)"
if printf '%s' "${EPIC_CS}" | grep -qF 'approved Epic'; then
  printf 'PASS: T6-B: epic.md context_source default contains "approved Epic"\n'
  PASS=$(( PASS + 1 ))
else
  printf 'FAIL: T6-B: epic.md context_source default still reads stale value (red baseline)\n'
  printf '      found: %s\n' "${EPIC_CS}"
  FAIL=$(( FAIL + 1 ))
fi

STORY_CS="$(grep '^context_source:' "${TEMPLATES_DIR}/story.md" | head -1)"
if printf '%s' "${STORY_CS}" | grep -qF 'approved Epic'; then
  printf 'PASS: T6-C: story.md context_source default contains "approved Epic"\n'
  PASS=$(( PASS + 1 ))
else
  printf 'FAIL: T6-C: story.md context_source default still reads stale value (red baseline)\n'
  printf '      found: %s\n' "${STORY_CS}"
  FAIL=$(( FAIL + 1 ))
fi

# ================================================================
# Summary
# ================================================================
printf '\nResults: %d passed, %d failed\n' "${PASS}" "${FAIL}"
printf 'NOTE (red-phase): T1, T2 (heading relocation), T3, T4, T6 are expected to FAIL\n'
printf '                  against the unmodified templates. T5 should PASS.\n'
printf '                  After Developer implementation, ALL must pass.\n'

if [[ "${FAIL}" -gt 0 ]]; then
  exit 1
fi
exit 0
