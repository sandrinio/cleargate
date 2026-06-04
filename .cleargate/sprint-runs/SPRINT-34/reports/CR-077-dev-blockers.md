## Test-Pattern

`cr077_eviction.red.sh` line 92: `CD_CLI_COUNT=$(grep -c "cd cleargate-cli" ... || echo "0")` — when `grep -c` finds 0 matches it exits 1, causing `|| echo "0"` to fire and producing a two-line string `"0\n0"` that makes `[[ "$CD_CLI_COUNT" -eq 0 ]]` fail with bash syntax error; the assertion ALWAYS fails when the canonical gate-checks.json has no `cd cleargate-cli` (the desired GREEN state).

## Spec-Gap

The `CD_CLI_COUNT` bash arithmetic comparison is broken for the 0-match case: `grep -c` exits 1 (no match) per POSIX, triggering `|| echo "0"`, producing `"0\n0"` that cannot be compared with `-eq 0`; the check cannot pass without either (a) fixing the `|| echo "0"` to `|| true` and stripping newlines (e.g., `$(grep -c ... 2>/dev/null; true)`) or (b) removing the redundant sub-scenario (the main eviction grep already covers `cd cleargate-cli` indirectly via the empty-string gate-checks.json).

## Environment

N/A — all other assertions pass (eviction grep returns ZERO policy tokens; Test Stack block present); the failure is purely in the bash comparison logic at line 92, not an environment issue.
