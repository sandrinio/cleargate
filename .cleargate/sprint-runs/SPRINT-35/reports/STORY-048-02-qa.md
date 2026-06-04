# STORY-048-02 — QA-Verify Report (adversarial multi-lens)

role: qa · STORY=048-02 · 2026-06-04 · Mode: VERIFY (read-only, 3 independent lenses)

QA: PASS
ACCEPTANCE_COVERAGE: 9 of 9 Gherkin scenarios
MISSING: none
REGRESSIONS: none (048-01 teardown/dial suite: 12 tests still pass within the 35)
Orchestrator re-run at barrier: 35/35 pass, clean tree.

## Lens 1 — Acceptance trace: PASS
All 9 §2.1 scenarios covered; 35 daemon tests green (≥9 new unit min met). No raw stream-json ever forwarded (allowlist enforced).

## Lens 2 — EOF turn lifecycle (sprint-goal crux): PASS
Replay of captures-2.1.162/02-background.ndjson (2 result events): runner does NOT close on the first result; keeps emitting until stdout EOF, then stream_end + turn_end. 2nd same-session system/init = continuation (not a new turn_start). TWO error classes genuinely distinct: in-band is_error:true → recoverable turn_result (turn still closes at EOF); out-of-band spawn failure → distinct fatal error that does NOT hang waiting for EOF.

## Lens 3 — Normalize correctness + no wave-2 regression: PASS
signature_delta skipped (no event); unmapped record type → drift log + no raw forward; visible text from text_delta ONLY (no double-count vs assembled assistant message); tool_use accumulates input_json_delta fragments into ONE PascalCase tool_use; tool_result paired by tool_use_id (is_error null=success, one event per parallel block) — 10-tooluse fixture. REGRESSION: 048-01 dial-register + teardown/no-orphan/exit-handler/seam cases all still pass — index.ts edit did not regress 048-01.

flashcards_flagged: (rolled into dev.md; see gate-curated set)
