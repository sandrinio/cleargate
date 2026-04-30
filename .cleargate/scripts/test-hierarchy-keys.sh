#!/usr/bin/env bash
# test-hierarchy-keys.sh — STORY-015-05 acceptance test
# Asserts that all six templates carry both hierarchy frontmatter keys.
# Exit 0 on success; non-zero on any failure.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
TEMPLATES_DIR="${REPO_ROOT}/.cleargate/templates"

TEMPLATES=(
  "epic.md"
  "story.md"
  "Sprint Plan Template.md"
  "CR.md"
  "Bug.md"
  "hotfix.md"
)

FAIL=0

echo "=== STORY-015-05: Hierarchy Frontmatter Keys — Template Audit ==="
echo ""

for tmpl in "${TEMPLATES[@]}"; do
  path="${TEMPLATES_DIR}/${tmpl}"

  if [[ ! -f "${path}" ]]; then
    echo "FAIL: template not found: ${path}"
    FAIL=1
    continue
  fi

  # Count how many of the two hierarchy key lines appear
  key_count=$(grep -cE "^(parent_cleargate_id|sprint_cleargate_id):" "${path}" || true)

  if [[ "${key_count}" -ne 2 ]]; then
    echo "FAIL: ${tmpl} — expected 2 hierarchy key lines, got ${key_count}"
    FAIL=1
  else
    echo "PASS: ${tmpl} — both hierarchy keys present (${key_count}/2)"
  fi
done

echo ""

# Verify existing prose parent_ref lines were NOT deleted (Bug.md and CR.md must still have parent_ref:)
for tmpl in "CR.md" "Bug.md"; do
  path="${TEMPLATES_DIR}/${tmpl}"
  if ! grep -qE "^parent_ref:" "${path}"; then
    echo "FAIL: ${tmpl} — existing parent_ref: line was deleted (must be preserved)"
    FAIL=1
  else
    echo "PASS: ${tmpl} — parent_ref: preserved verbatim"
  fi
done

# Verify story.md still has parent_epic_ref:
if ! grep -qE "^parent_epic_ref:" "${TEMPLATES_DIR}/story.md"; then
  echo "FAIL: story.md — existing parent_epic_ref: line was deleted (must be preserved)"
  FAIL=1
else
  echo "PASS: story.md — parent_epic_ref: preserved verbatim"
fi

echo ""

# Assert both keys default to null
echo "=== Checking null defaults ==="
for tmpl in "${TEMPLATES[@]}"; do
  path="${TEMPLATES_DIR}/${tmpl}"
  [[ ! -f "${path}" ]] && continue

  non_null=$(grep -E "^(parent_cleargate_id|sprint_cleargate_id):" "${path}" | grep -v "null" || true)
  if [[ -n "${non_null}" ]]; then
    echo "FAIL: ${tmpl} — hierarchy key(s) do not default to null:"
    echo "${non_null}"
    FAIL=1
  else
    echo "PASS: ${tmpl} — both keys default to null"
  fi
done

echo ""

if [[ "${FAIL}" -ne 0 ]]; then
  echo "=== RESULT: FAILED ==="
  exit 1
else
  echo "=== RESULT: ALL CHECKS PASSED ==="
  exit 0
fi
