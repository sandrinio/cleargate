#!/bin/bash
# Wait until the watched session has grown enough to digest, then cut a chunk and exit.
# Exit triggers: growth >= BIG bytes since the last chunk, or any growth followed by QUIET seconds
# with no change (the session is waiting on the human, a natural checkpoint).
# Read-only over the transcripts. Usage: wait.sh <sessionJsonl> <watchDir>
S="$1"; W="$2"; D="${S%.jsonl}"
BIG=${BIG:-1500000}; QUIET=${QUIET:-420}
total() { { stat -f %z "$S"; find "$D" -name '*.jsonl' -exec stat -f %z {} + 2>/dev/null; } | awk '{s+=$1} END {print s+0}'; }
base=$(cat "$W/last_total" 2>/dev/null || echo 0)
last=$(total); still=0
while :; do
  sleep 30
  now=$(total)
  if [ "$now" = "$last" ]; then still=$((still+30)); else still=0; last=$now; fi
  grown=$((now-base))
  if [ "$grown" -ge "$BIG" ] || { [ "$grown" -gt 0 ] && [ "$still" -ge "$QUIET" ]; }; then
    echo "$now" > "$W/last_total"
    echo "trigger: grown=$grown quiet=${still}s at $(date +%H:%M:%S)"
    node "$W/extract.mjs" "$S" "$W"
    exit 0
  fi
done
