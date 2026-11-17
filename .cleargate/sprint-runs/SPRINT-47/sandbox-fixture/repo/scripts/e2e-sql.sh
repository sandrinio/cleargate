#!/usr/bin/env bash
# Container-tier proof for `tally --sql` (STORY-001-02): loads the SQL into the throwaway
# PostgreSQL 18 container and checks the rows. Prints "e2e-sql: ok" on success.
set -euo pipefail
PG=${TALLY_PG_CONTAINER:-cg-s47-pg}
psql_() { docker exec -i "$PG" psql -U postgres -d postgres -v ON_ERROR_STOP=1 -qAt "$@"; }
fail() { echo "FAIL: $*" >&2; exit 1; }

psql_ -c "DROP TABLE IF EXISTS tally_counts" >/dev/null
go run ./cmd/tally --sql testdata/sample.txt | psql_ >/dev/null || fail "sample.txt SQL did not load"
want=$(go run ./cmd/tally testdata/sample.txt | wc -l | tr -d ' ')
got=$(psql_ -c "SELECT count(*) FROM tally_counts")
[ "$got" = "$want" ] || fail "tally_counts has $got rows, want $want"
psql_ -c "DROP TABLE IF EXISTS tally_counts" >/dev/null
go run ./cmd/tally --sql testdata/apostrophes.txt | psql_ >/dev/null || fail "apostrophes.txt SQL did not load"
n=$(psql_ -c "SELECT n FROM tally_counts WHERE word = 'don''t'")
[ "$n" = "2" ] || fail "don't has n=$n, want 2"
psql_ -c "DROP TABLE IF EXISTS tally_counts" >/dev/null
echo "e2e-sql: ok"
