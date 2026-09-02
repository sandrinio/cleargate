#!/usr/bin/env bash
# bug076_077_close_path.red.sh
#
# BUG-076: close_sprint.mjs must resolve the CLI from node_modules/cleargate/dist
#          as well as the meta-repo's cleargate-cli/dist. Before the fix it
#          hard-required the meta-repo path, making Gate-4 close unreachable in
#          every consumer install.
# BUG-077: Step 2.6d (child back-sync) must run BEFORE Step 2.6c (parent rollup).
#          Reversed, a parent judges children by frontmatter that 2.6d has not
#          yet written, so no parent can roll up on a first close.
#
# Both assertions are made against the SHIPPED script text and a consumer-shaped
# fixture — no meta-repo layout is assumed.
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLOSE_SCRIPT="${SCRIPT_DIR}/../close_sprint.mjs"
PASS=0; FAIL=0

ok()   { printf 'PASS: %s\n' "$1"; PASS=$((PASS+1)); }
bad()  { printf 'FAIL: %s\n' "$1"; FAIL=$((FAIL+1)); }

if [[ ! -f "${CLOSE_SCRIPT}" ]]; then
  echo "FAIL: close_sprint.mjs not found at ${CLOSE_SCRIPT}"; exit 1
fi

echo "=== BUG-076: CLI resolution is not meta-repo-only ==="

# 1. A resolver exists and names the consumer install location.
if grep -q "node_modules', 'cleargate', 'dist'" "${CLOSE_SCRIPT}"; then
  ok "BUG-076: resolver includes node_modules/cleargate/dist"
else
  bad "BUG-076: no node_modules/cleargate/dist candidate — consumer installs cannot close"
fi

# 2. No bare hardcoded cli.js path survives outside the resolver's own branch.
HARDCODED="$(grep -c "path.join(REPO_ROOT, 'cleargate-cli', 'dist', 'cli.js')" "${CLOSE_SCRIPT}" || true)"
if [[ "${HARDCODED}" == "0" ]]; then
  ok "BUG-076: zero hardcoded REPO_ROOT/cleargate-cli/dist/cli.js call sites"
else
  bad "BUG-076: ${HARDCODED} hardcoded cli.js call site(s) remain"
fi

# 3. The dynamic lib import must not assume the meta-repo layout either.
if grep -q "SCRIPTS_DIR, '..', '..', 'cleargate-cli', 'dist', 'lib'" "${CLOSE_SCRIPT}"; then
  bad "BUG-076: step 2.6d lib import still hardcodes the meta-repo layout"
else
  ok "BUG-076: step 2.6d lib import goes through the resolver"
fi

# 4. Guards must be null-safe: fs.existsSync(null) throws.
if grep -q "fs.existsSync(cliBin" "${CLOSE_SCRIPT}"; then
  bad "BUG-076: a guard still calls fs.existsSync on a nullable resolver result"
else
  ok "BUG-076: all resolver guards are null-safe"
fi

# 5. Behavioural check. NOTE: an earlier draft asserted "the fixture is not
#    rejected with 'dist not built'" — that PASSED against pre-fix code because
#    the fixture died earlier (no state.json), so the string never appeared for
#    reasons unrelated to the fix. Vacuous assertion; replaced. (Same trap QA-Red
#    caught in wave 3: Node exits 1 on MODULE_NOT_FOUND, so a bare exit-1 check
#    would have passed at baseline.)
#
#    Non-vacuous form: when NO CLI exists in EITHER location, the fixed code must
#    name BOTH candidate paths in its error. Pre-fix it names only the meta-repo
#    one, so this discriminates regardless of where the script later dies.
FIX="$(mktemp -d)"
trap 'rm -rf "${FIX}"' EXIT
mkdir -p "${FIX}/.cleargate/sprint-runs/SPRINT-99" "${FIX}/.cleargate/delivery/pending-sync" "${FIX}/.cleargate/delivery/archive"
# state.json must exist and hold only TERMINAL stories, or the close stops at
# Step 1-2 and never reaches the dist gate this assertion is about.
cat > "${FIX}/.cleargate/sprint-runs/SPRINT-99/state.json" <<'JSON'
{
  "schema_version": 3,
  "sprint_id": "SPRINT-99",
  "sprint_status": "Active",
  "updated_at": "2026-09-02T00:00:00.000Z",
  "stories": { "STORY-999-01": { "state": "Done", "qa_bounces": 0, "arch_bounces": 0, "lane": "standard", "updated_at": "2026-09-02T00:00:00.000Z" } }
}
JSON
printf '# SPRINT-99 report\n' > "${FIX}/.cleargate/sprint-runs/SPRINT-99/SPRINT-99_REPORT.md"
# Deliberately NO cleargate-cli/ AND no node_modules/cleargate/ — neither location.
OUT="$(cd "${FIX}" && CLEARGATE_REPO_ROOT="${FIX}" node "${CLOSE_SCRIPT}" SPRINT-99 2>&1 || true)"
if grep -q "node_modules/cleargate/dist/cli.js" <<<"${OUT}"; then
  ok "BUG-076: not-found error names the consumer install location"
else
  bad "BUG-076: not-found error does not mention node_modules/cleargate/dist — a consumer cannot tell what to do"
fi

echo
echo "=== BUG-077: back-sync precedes parent rollup ==="

LINE_D="$(grep -n '── Step 2.6d:' "${CLOSE_SCRIPT}" | head -1 | cut -d: -f1)"
LINE_C="$(grep -n '── Step 2.6c:' "${CLOSE_SCRIPT}" | head -1 | cut -d: -f1)"
LINE_6="$(grep -n '── Step 2.6:' "${CLOSE_SCRIPT}" | head -1 | cut -d: -f1)"
LINE_B="$(grep -n '── Step 2.6b:' "${CLOSE_SCRIPT}" | head -1 | cut -d: -f1)"

# The invariant: WRITERS (2.6d stories, 2.6c parents) precede JUDGES (2.6
# lifecycle, 2.6b orphan drift). Asserting only 2.6d < 2.6c — as an earlier
# version of this test did — passes while 2.6 still fails a first close.
if [[ -z "${LINE_D}" || -z "${LINE_C}" || -z "${LINE_6}" || -z "${LINE_B}" ]]; then
  bad "BUG-077: could not locate all four step markers (d=${LINE_D:-?} c=${LINE_C:-?} 6=${LINE_6:-?} b=${LINE_B:-?})"
else
  if (( LINE_D < LINE_C )); then
    ok "BUG-077: 2.6d (${LINE_D}) precedes 2.6c (${LINE_C}) — stories synced before parents roll up"
  else
    bad "BUG-077: 2.6c (${LINE_C}) runs before 2.6d (${LINE_D}) — parents judged on unsynced children"
  fi
  if (( LINE_C < LINE_6 )); then
    ok "BUG-077: 2.6c (${LINE_C}) precedes 2.6 (${LINE_6}) — parents set before lifecycle judges them"
  else
    bad "BUG-077: 2.6 (${LINE_6}) runs before 2.6c (${LINE_C}) — lifecycle drifts on an unrolled epic"
  fi
  if (( LINE_D < LINE_6 && LINE_C < LINE_B )); then
    ok "BUG-077: all writers (2.6d, 2.6c) precede all judges (2.6, 2.6b)"
  else
    bad "BUG-077: a judge runs before a writer — first close will report false drift"
  fi
fi

echo
echo "=== Summary ==="
printf 'Passed: %d\nFailed: %d\n' "${PASS}" "${FAIL}"
if (( FAIL > 0 )); then exit 1; fi
echo "All tests passed."
