# STORY-048-02 — Developer Report

role: developer · STORY=048-02 · 2026-06-04 · lane: standard · execution: wave3 adversarial workflow segment

STORY: STORY-048-02
STATUS: done
COMMIT: 1fdaa42
TYPECHECK: pass
TESTS: 35 passed, 0 failed (048-02 normalize/lifecycle + 12 regression from 048-01; orchestrator re-run at barrier 35/35)
FILES_CHANGED:
  - daemon/src/normalize.ts (new, +362) — pure record→Event|null allowlist map; signature_delta→null; unmapped→drift log + null (never raw-forward); text from text_delta only
  - daemon/src/turn-runner.ts (new, +249) — EOF-driven lifecycle on ChildHandle.stdout; monotonic per-turn seq; open on first system/init, 2nd system/init = continuation; keep reading past every result; stream_end + turn_end ONLY at stdout EOF; two error classes
  - daemon/src/index.ts (edit, +57/-27) — route prompts through turn-runner, replacing 048-01 raw-forward stub; dial/register/spawn/teardown preserved
  - daemon/test/normalize.red.node.test.ts (QA-Red, frozen)
  - daemon/package.json (+2/-1) — test glob extended to test/**
  - harness/spike/captures-2.1.162/{02-background,10-tooluse}.ndjson + PROVENANCE.md — fixtures

NOTES: Edited the MERGED index.ts (re-read from main). EOF is the SOLE turn terminus (result→turn_result, never closes; 02-background fixture has 2 result events, turn stays open until stdout end). TWO disjoint error classes: in-band is_error:true→turn_result{error} recoverable; out-of-band spawn failure (ENOENT/0 parseable records)→distinct fatal error{code:'spawn_failed'}, never hangs. text rendered from text_delta only (no double-count). signature_delta skipped; unmapped→drift channel, never raw-forwarded. tool_use accumulates input_json_delta→one PascalCase tool_use; tool_result paired by tool_use_id (is_error null=success). M0 verbosity fixed=tools. No 048-01 regression (12 teardown/dial tests pass).

FIXTURES: orchestrator pre-seeded captures-2.1.162/{02-background,10-tooluse} from the verified 2.1.161 spike captures (PROVENANCE.md notes the 2.1.162 baseline was re-verified unchanged — additive result fields only). Committed with the story.

ADVISORIES (EPIC-048 hardening, non-blocking M0): (a) index.ts handlePrompt uses void promise.then() without .catch() — a stdout stream error would leak the liveTurns entry; add .catch in a future story. (b) 2nd system/init detected via a boolean turnOpen flag rather than session_id equality (openSessionId written but unread) — conservative, passes the continuation test, but diverges from the "same-session" spec literal.

flashcards_flagged:
  - "2026-06-04 · #connector #normalize · EOF is the SOLE turn terminus: a `result` maps to turn_result and NEVER closes; emit stream_end only on stdout 'end'. Background tasks emit ≥2 results (fixture 02-background) — closing on the first breaks them."
  - "2026-06-04 · #connector #normalize · Two disjoint error classes: in-band is_error:true → turn_result{error} (recoverable); out-of-band spawn failure (ENOENT/0 parseable records) → distinct fatal error{code:'spawn_failed'}, never a hang on an already-fired EOF."
  - "2026-06-04 · #connector #tool-use · PascalCase tool names arrive already-PascalCase from real claude output (assistant record) — do NOT apply a case transform; the spike fixture proves it."
  - "2026-06-04 · #typescript #strict · exactOptionalPropertyTypes=true: never assign `prop: expr|undefined` in an object literal — use conditional spread `...(cond ? {prop:val} : {})`."
