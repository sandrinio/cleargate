#!/usr/bin/env bash
# collision_surface.sh — STORY-033-03 (EPIC-033)
#
# Standalone fork of parse_surface_paths() from file_surface_diff.sh:158-189.
# FIXES the single-column bug: the original reads only cols[2]; this fork scans
# ALL columns to detect file paths regardless of which column they appear in.
#
# Usage: collision_surface.sh <story-file>
#   Emits one file path per line, deduped, backticks stripped, comma-split cells split.
#   Exit 0 always.
#
# FAIL-SAFE CONTRACT (BUG-033): when ZERO paths are parseable from the §3.1 table
#   (no table, prose-only table, or only slash-free/extension-less tokens), this
#   script emits EMPTY stdout AND a `[collision_surface] WARN:` line on STDERR.
#   The wave-compatibility predicate (architect-synth) MUST treat an empty surface
#   as "cannot prove disjointness" → fail-safe-serialize, NEVER as
#   "empty ∩ empty = ∅ ⇒ disjoint". Empty stdout is a SERIALIZE signal, not a
#   parallelize signal. Over-serialization is the safe failure direction.
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
# Path-shape guard (looks_like_path): a token is a path IFF it contains "/" OR ends
# in a known file extension. This catches both slash-bearing paths (a/b.ts) AND
# bare filenames the prior slash-only guard missed (package.json, schema.sql), while
# still rejecting label cells like "Primary File (new)" or prose like "Some details.".
# BUG-033: the guard now matches the documented contract — the prior code was
# slash-only despite the comment claiming "/ OR known extension".
#
# Over-serialization is the safe failure direction — a token we cannot classify as a
# path is dropped, so the story trends toward an empty surface → fail-safe-serialize.

parse_surface_paths() {
  local story_file="$1"
  awk '
    # A token is a path IFF it contains "/" OR ends in a known file extension.
    function looks_like_path(s) {
      return (s ~ /\//) || \
             (s ~ /\.(ts|tsx|cts|mts|js|jsx|cjs|mjs|json|jsonc|sh|bash|md|sql|svelte|vue|css|scss|sass|less|ya?ml|toml|ini|env|txt|prisma|html|htm|py|rs|go|rb|java|kt)$/)
    }
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
        # Handle multiple paths separated by ", "; guard each split token.
        npaths=split(val, paths, ", ")
        for (i=1; i<=npaths; i++) {
          p=paths[i]
          gsub(/^[[:space:]]+|[[:space:]]+$/, "", p)
          if (p != "" && looks_like_path(p)) print p
        }
      }
    }
  ' "${story_file}"
}

# Collect paths and deduplicate (portable bash 3.2 compat — no mapfile, no declare -A on macOS)
# FLASHCARD #bash #macos: no mapfile on macOS bash 3.2 — use while-read loop
# FLASHCARD #bash #macos: no associative arrays (declare -A) on macOS bash 3.2 — use awk for dedup
SURFACE="$(parse_surface_paths "${STORY_FILE}" | awk '!seen[$0]++')"

if [[ -z "${SURFACE}" ]]; then
  # BUG-033 fail-safe signal. ZERO parseable paths = the disjointness predicate CANNOT
  # prove this story is collision-free, so it must NOT be co-waved. stdout stays empty
  # (the caller reads "no proven surface"); the predicate fail-safe-serializes on empty.
  echo "[collision_surface] WARN: no parseable file surface in ${STORY_FILE} — downstream MUST fail-safe-serialize (empty surface is NOT 'disjoint')." >&2
  exit 0
fi

printf '%s\n' "${SURFACE}"
exit 0
