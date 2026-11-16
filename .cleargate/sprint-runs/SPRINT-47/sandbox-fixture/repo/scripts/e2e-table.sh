#!/usr/bin/env bash
# Container-tier proof for `tally --sql --table NAME` (STORY-001-04). Prints "e2e-table: ok".
# SANDBOX INJECTION (SPRINT-47 goal check (c)): the first run of this proof under the prove stage
# (an ancestor process is record_evidence.mjs) fails on purpose, once, so the prove-stage rework
# route is exercised. Runs outside the prove stage (QA-Verify, a person) are never affected.
set -euo pipefail
MARK=/tmp/cg-s47-e2e-table-injected-once
under_prove=no; p=$$
for _ in 1 2 3 4 5 6 7 8; do
  p=$(ps -o ppid= -p "$p" 2>/dev/null | tr -d ' ') || break
  [ -n "$p" ] && [ "$p" != "0" ] && [ "$p" != "1" ] || break
  if ps -o command= -p "$p" 2>/dev/null | command grep -q 'record_evidence.mjs'; then under_prove=yes; break; fi
done
if [ "$under_prove" = yes ] && [ ! -f "$MARK" ]; then
  touch "$MARK"
  echo "INJECTED FAILURE (SPRINT-47 sandbox goal check c): the first prove-stage run of this proof fails on purpose to exercise the rework route. No code change is required for this line; the next run checks the real behaviour."
  exit 1
fi
PG=${TALLY_PG_CONTAINER:-cg-s47-pg}
psql_() { docker exec -i "$PG" psql -U postgres -d postgres -v ON_ERROR_STOP=1 -qAt "$@"; }
fail() { echo "FAIL: $*" >&2; exit 1; }

for t in t_alpha t_beta; do psql_ -c "DROP TABLE IF EXISTS $t" >/dev/null; done
go run ./cmd/tally --sql --table t_alpha testdata/sample.txt | psql_ >/dev/null || fail "t_alpha did not load"
go run ./cmd/tally --sql --table t_beta testdata/apostrophes.txt | psql_ >/dev/null || fail "t_beta did not load"
wa=$(go run ./cmd/tally testdata/sample.txt | wc -l | tr -d ' ')
wb=$(go run ./cmd/tally testdata/apostrophes.txt | wc -l | tr -d ' ')
ga=$(psql_ -c "SELECT count(*) FROM t_alpha"); gb=$(psql_ -c "SELECT count(*) FROM t_beta")
[ "$ga" = "$wa" ] || fail "t_alpha has $ga rows, want $wa"
[ "$gb" = "$wb" ] || fail "t_beta has $gb rows, want $wb"
x=$(psql_ -c "SELECT count(*) FROM t_alpha WHERE word = 'don''t'")
[ "$x" = "0" ] || fail "t_alpha holds a t_beta word"
if go run ./cmd/tally --sql --table Bad-Name testdata/sample.txt >/dev/null 2>&1; then fail "Bad-Name was accepted"; fi
for t in t_alpha t_beta; do psql_ -c "DROP TABLE IF EXISTS $t" >/dev/null; done
echo "e2e-table: ok"
