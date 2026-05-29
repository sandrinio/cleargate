#!/usr/bin/env bash
# collision_surface.sh — STORY-033-03 (EPIC-033)
#
# Standalone fork of parse_surface_paths() from file_surface_diff.sh:158-189.
# FIXES the single-column bug: the original reads only cols[2]; this fork scans
# ALL columns to detect file paths regardless of which column they appear in.
#
# Usage: collision_surface.sh <story-file>
#   Emits one file path per line, deduped, backticks stripped, comma-split cells split.
#   Exit 0 always (fail-safe: empty output is valid when no paths are present).
#
# Used by architect-synth to compute the five-clause wave-compatibility predicate.
# Do NOT modify file_surface_diff.sh — this is a deliberate standalone fork.

set -euo pipefail

STORY_FILE="${1:-}"

if [[ -z "${STORY_FILE}" ]]; then
  echo "[collision_surface] ERROR: No story file argument provided." >&2
  echo "[collision_surface] Usage: $0 <story-file>" >&2
  exit 1
fi

if [[ ! -f "${STORY_FILE}" ]]; then
  echo "[collision_surface] ERROR: Story file not found: ${STORY_FILE}" >&2
  exit 1
fi

# ---- Parse §3.1 file surface table (multi-column fix) -----------------------
#
# CHANGE vs file_surface_diff.sh:158-189:
#   Original: val=cols[2]  — reads only the second column (the "Value" column).
#   Fork:     iterate cols[1..n] — checks every column for path-like tokens.
#
# Non-path skip list (tightened to avoid false matches with col-1 labels):
#   "Yes", "No", "Yes/No", "N/A", and any prefix of "Yes/No —"
#
# Path-shape guard: token must contain "/" OR end in a known extension.
# This avoids emitting label cells like "Primary File (new)" that contain ".".
#
# Over-serialization is the safe failure direction — bias the guard conservative.

parse_surface_paths() {
  local story_file="$1"
  awk '
    /^### 3\.1/ { in_section=1; next }
    in_section && /^### / { in_section=0; next }
    in_section && /^\|/ {
      line=$0
      gsub(/^\||\|$/, "", line)
      n=split(line, cols, "|")
      # Scan ALL columns (fix: was only cols[2])
      for (c=1; c<=n; c++) {
        val=cols[c]
        # Trim whitespace
        gsub(/^[[:space:]]+|[[:space:]]+$/, "", val)
        # Strip backticks
        gsub(/`/, "", val)
        # Skip known non-path cells (exact and prefix matches)
        if (val == "Yes") continue
        if (val == "No") continue
        if (val == "Yes/No") continue
        if (val == "N/A") continue
        if (val == "Item") continue
        if (val == "Value") continue
        if (val == "") continue
        # Skip cells starting with "Yes/No —" (partial answers)
        if (substr(val, 1, 8) == "Yes/No -") continue
        # Path-shape guard: must contain "/" to be a path
        # This is more conservative than the original "contains . or /" to avoid
        # matching label cells like "Primary File (new)" which contain "."
        if (val !~ /\//) continue
        # Handle multiple paths separated by ", "
        npaths=split(val, paths, ", ")
        for (i=1; i<=npaths; i++) {
          p=paths[i]
          gsub(/^[[:space:]]+|[[:space:]]+$/, "", p)
          # Final guard: must contain "/"
          if (p != "" && (p ~ /\//)) print p
        }
      }
    }
  ' "${story_file}"
}

# Collect paths and deduplicate (portable bash 3.2 compat — no mapfile, no declare -A on macOS)
# FLASHCARD #bash #macos: no mapfile on macOS bash 3.2 — use while-read loop
# FLASHCARD #bash #macos: no associative arrays (declare -A) on macOS bash 3.2 — use awk for dedup
parse_surface_paths "${STORY_FILE}" | awk '!seen[$0]++'

exit 0
