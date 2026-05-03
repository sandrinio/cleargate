#!/usr/bin/env bash
set -u
REPO_ROOT="${CLAUDE_PROJECT_DIR}"
LOG="${REPO_ROOT}/.cleargate/hook-log/gate-check.log"
mkdir -p "$(dirname "$LOG")"

# cleargate-pin: 0.5.0
# Resolve cleargate CLI (three-branch resolver — CR-009):
#   1. meta-repo dogfood dist (fastest; only present in ClearGate's own repo)
#   2. on-PATH binary (global install or shim)
#   3. pinned npx invocation (always works wherever Node is present)
if [ -f "${REPO_ROOT}/cleargate-cli/dist/cli.js" ]; then
  CG=(node "${REPO_ROOT}/cleargate-cli/dist/cli.js")
elif command -v cleargate >/dev/null 2>&1; then
  CG=(cleargate)
else
  CG=(npx -y "cleargate@0.5.0")
fi

FILE=$(jq -r '.tool_input.file_path' 2>/dev/null || echo "")
[ -z "$FILE" ] && exit 0
case "$FILE" in *.cleargate/delivery/*) : ;; *) exit 0 ;; esac
TS=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
# Ordered chain — stamp MUST precede gate (gate may read draft_tokens)
"${CG[@]}" stamp-tokens "$FILE" >>"$LOG" 2>&1
SR1=$?
# CR-032: capture gate check stdout to tmpfile so we can re-emit ⚠️ lines to
# hook stdout (→ Claude Code system-reminder). gate.ts emits ❌ lines to
# stdout (gate.ts:259), not stderr; the tmpfile captures them separately.
GATE_OUT=$(mktemp)
"${CG[@]}" gate check "$FILE" >"$GATE_OUT" 2>>"$LOG"
SR2=$?
cat "$GATE_OUT" >>"$LOG"
if [ "$SR2" -ne 0 ]; then
  WORK_ITEM_ID=$(grep -m1 -oE '(EPIC|STORY|CR|BUG|HOTFIX|PROPOSAL|INITIATIVE|SPRINT)-[0-9]+(-[0-9]+)?' "$FILE" | head -1)
  : "${WORK_ITEM_ID:=<work-item>}"
  grep '^❌' "$GATE_OUT" 2>/dev/null | sed -E "s/^❌ /⚠️ gate failed: ${WORK_ITEM_ID} — /"
fi
rm -f "$GATE_OUT"
"${CG[@]}" wiki ingest "$FILE" >>"$LOG" 2>&1
SR3=$?
echo "[$TS] stamp=$SR1 gate=$SR2 ingest=$SR3 file=$FILE" >>"$LOG"
exit 0   # ALWAYS 0 — severity enforcement is at wiki lint, not hook
