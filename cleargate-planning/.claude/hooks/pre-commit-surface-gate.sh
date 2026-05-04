#!/usr/bin/env bash
# pre-commit-surface-gate.sh
set -euo pipefail
REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"

# CR-043: Red-test immutability check (Option A — runs BEFORE file-surface delegation)
if [[ "${SKIP_RED_GATE:-}" != "1" ]]; then
  CURRENT_BRANCH="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "")"
  if [[ "${CURRENT_BRANCH}" == story/STORY-* || "${CURRENT_BRANCH}" == story/CR-* || "${CURRENT_BRANCH}" == story/BUG-* ]]; then
    # Look for staged modifications to *.red.test.ts or *.red.node.test.ts files
    STAGED_RED="$(git diff --cached --name-only --diff-filter=M 2>/dev/null | grep -E '\.red\.(node\.)?test\.ts$' || true)"
    if [[ -n "${STAGED_RED}" ]]; then
      # Check whether a qa-red commit exists on this branch (subject starts with "qa-red(")
      if git log --pretty=%s HEAD 2>/dev/null | grep -qE '^qa-red\('; then
        echo "[red-gate] REJECT: Developer commits cannot modify *.red.test.ts or *.red.node.test.ts files post-QA-Red." >&2
        echo "[red-gate] Modified files: ${STAGED_RED}" >&2
        echo "[red-gate] Bypass: SKIP_RED_GATE=1 (log bypass in sprint §4 Execution Log)." >&2
        exit 1
      fi
    fi
  fi
else
  echo "[red-gate] BYPASS: SKIP_RED_GATE=1 set — skipping Red-test immutability check. Log bypass in sprint §4." >&2
fi

SCRIPT="${REPO_ROOT}/.cleargate/scripts/file_surface_diff.sh"
if [[ ! -f "${SCRIPT}" ]]; then
  echo "[surface-gate] WARNING: file_surface_diff.sh not found — skipping" >&2
  exit 0
fi
exec bash "${SCRIPT}" "$@"
