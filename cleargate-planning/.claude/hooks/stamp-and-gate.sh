#!/usr/bin/env bash
set -u
REPO_ROOT="${CLAUDE_PROJECT_DIR}"
LOG="${REPO_ROOT}/.cleargate/hook-log/gate-check.log"
mkdir -p "$(dirname "$LOG")"

# Resolve cleargate CLI: prefer on-PATH binary (`npm i -g cleargate` / `npx`),
# fall back to a meta-repo-local dist (dogfood case). If neither is present,
# log a remediation message and exit 0 (BUG-006).
if command -v cleargate >/dev/null 2>&1; then
  CG=(cleargate)
elif [ -f "${REPO_ROOT}/cleargate-cli/dist/cli.js" ]; then
  CG=(node "${REPO_ROOT}/cleargate-cli/dist/cli.js")
else
  echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] cleargate CLI not found — install with 'npm i -g cleargate' or run via 'npx cleargate'. Hook skipped." >>"$LOG"
  exit 0
fi

FILE=$(jq -r '.tool_input.file_path' 2>/dev/null || echo "")
[ -z "$FILE" ] && exit 0
case "$FILE" in *.cleargate/delivery/*) : ;; *) exit 0 ;; esac
TS=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
# Ordered chain — stamp MUST precede gate (gate may read draft_tokens)
"${CG[@]}" stamp-tokens "$FILE" >>"$LOG" 2>&1
SR1=$?
"${CG[@]}" gate check "$FILE" >>"$LOG" 2>&1
SR2=$?
"${CG[@]}" wiki ingest "$FILE" >>"$LOG" 2>&1
SR3=$?
echo "[$TS] stamp=$SR1 gate=$SR2 ingest=$SR3 file=$FILE" >>"$LOG"
exit 0   # ALWAYS 0 — severity enforcement is at wiki lint, not hook
