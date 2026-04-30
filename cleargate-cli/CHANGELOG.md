# Changelog

## 0.9.0 (2026-04-30)

Per-turn delta math in the token-ledger hook (CR-018, closes BUG-022). The hook now maintains
`.cleargate/sprint-runs/<sprint>/.session-totals.json` keyed by session_id; each SubagentStop
fire computes `delta = current_session_total − prior_session_total` and writes both a `delta`
block and a `session_total` block to the ledger row, replacing the former flat `input/output/cache_*`
fields that caused N×real-cost inflation across multi-fire sessions. The Reporter agent contract
switches from summing flat fields to summing `delta.*` via the new `cleargate-cli/src/lib/ledger.ts`
`sumDeltas()` helper, which also handles pre-0.9.0 flat-field ledgers via a last-row-per-session
fallback and emits a `pre_v2_caveat` string for REPORT.md §3 when the ledger format is mixed or
legacy. This is a **hook ABI break**: fresh `cleargate init` users get the new hook pin; existing
installations keep their current pin until they re-run `cleargate init`.
