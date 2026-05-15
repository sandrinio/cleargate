---
work_item: CR-065
sprint: SPRINT-27
agent: developer
lane: standard
status: done
commit: 974a947
red_commit: 500ca63
typecheck: pass
tests: 148 passed, 17 failed (17 pre-existing Red failures unrelated to CR-065; all 10 CR-065 assertions green)
---

# CR-065 — Developer Report

## R-coverage
- R1: service-token-fetcher.ts new module — covered
- R2: mcp-serve.ts env-var branch before AuthFetcher — covered
- R3: Bearer header unchanged at line 178 — covered
- R4: Boot-time stderr "auth mode = ..." logging — covered
- R5: Env-unset path byte-identical regression — covered

## Plan deviations
- proxyOne 401 dispatch uses `isServiceTokenMode: boolean` flag + sentinel error type (`ServiceToken401Error`) instead of widening `TokenFetcher` interface with callback. Reason: minimal-change approach; keychain `invalidate()` cast is type-safe within the `isServiceTokenMode===false` guard. `orchestrator_confirmed: pending` at Dev time → ACCEPTED post-hoc as reasonable engineering choice (no interface contract widening).

## Files changed
- cleargate-cli/src/auth/service-token-fetcher.ts (NEW)
- cleargate-cli/src/auth/refresh.ts (MODIFIED — added TokenFetcher interface; AuthFetcher implements it)
- cleargate-cli/src/commands/mcp-serve.ts (MODIFIED — env-var branch, service-token mode, 401 fail-fast)

## Flashcards flagged
none
