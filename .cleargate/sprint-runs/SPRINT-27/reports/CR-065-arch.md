role: architect

# CR-065 SPRINT-27 — Architect Post-flight Review

**Mode:** POST-FLIGHT REVIEW (read-only)
**Worktree:** `/Users/ssuladze/Documents/Dev/ClearGate/.worktrees/CR-065`
**Red commit:** `500ca63`
**Dev commit:** `974a947`
**Reviewed against:** M1 blueprint CR-065 section, SDR §2.2/§2.3/§2.5, pre-Wave-1 HEAD `b038ec4`

---

ARCH-PASS: APPROVED
NOTES: Verified all 8 checks from the post-flight rubric. (1) Shared-file anchor: `mcp-serve.ts` env-var branch lands at lines 82-87 BEFORE the `new AuthFetcher(...)` call (now nested at lines 100-106 inside the `else` branch); M1-prescribed insertion point preserved. The `Authorization: Bearer ${accessToken}` header is unchanged at `postFrame` line 233 (M1 cited line 178 of the pre-CR file — pre-CR diff confirms this is the same header literal, line-shifted due to new lines above). (2) New file `cleargate-cli/src/auth/service-token-fetcher.ts` exists at the blueprint-specified path; 19 LOC, ≤20 cap honored. (3) `TokenFetcher` interface introduced in `refresh.ts` lines 13-20, exported, single-method (`getAccessToken(): Promise<string>`) as M1 demanded ("Keep it minimal: ONE method"). `AuthFetcher implements TokenFetcher` at line 90. `ServiceTokenFetcher implements TokenFetcher` at line 13 of the new file. Both satisfy the contract. The accepted deviation (`ServiceToken401Error` sentinel class + `isServiceTokenMode: boolean` parameter on `proxyOne` rather than widening the interface with a callback) is contained entirely within `mcp-serve.ts`; no other callers of `AuthFetcher` or `TokenFetcher` exist in `cleargate-cli/` (confirmed by file-surface diff scope: only 3 files changed). (4) Env-unset path is behaviorally byte-identical to `b038ec4`: same `createTokenStore` invocation with identical option spreads, same `AuthFetcher` constructor args (`baseUrl`, `loadRefresh`, `saveRefresh`, conditional `fetch`/`now` spreads), same boot-time `getAccessToken()` call wrapped in identical try/catch + `RefreshError` branch + `return exit(1)`. The keychain branch retains `invalidate()`-and-retry-once semantics on 401 via `(fetcher as AuthFetcher).invalidate()` at line 202. The only additive stderr line `auth mode = keychain-refresh\n` is M1-prescribed (implementation sketch step 3) and does not alter wire behavior. (5) Env-var literal `CLEARGATE_SERVICE_TOKEN` appears verbatim at 5 sites in cleargate-cli/src (mcp-serve.ts:83 read, mcp-serve.ts:152 error message, plus 3 doc-comments); CR-061 stdio-tab string-match will resolve cleanly. No shared-constant extraction. (6) `service-token-fetcher.ts` contains zero `keytar`/`keychain` imports — grep returned only one doc-comment string mention of "keychain interaction" (negation). (7) `package.json` + `package-lock.json` diffs vs `b038ec4` are empty — no new dependencies. (8) Test files at `cleargate-cli/test/commands/mcp-serve-service-token.red.node.test.ts` and `cleargate-cli/test/auth/service-token-fetcher.red.node.test.ts` are unchanged between `500ca63..974a947` (`git diff` on `cleargate-cli/test/` returned empty), preserving CR-043 Red-test immutability.

STRUCTURAL_DEBT: none

DEVIATION_VERDICT: ACCEPT — the sentinel-error + boolean-flag pattern keeps the `TokenFetcher` interface minimal (one method, as M1 demanded) while still allowing `proxyOne` to fail-fast in service-token mode. Widening the interface (e.g., `onUnauthorized` callback) would have leaked retry policy into the contract, and a separate `RetryingFetcher` wrapper would have been over-engineered for two implementations. The sentinel `ServiceToken401Error` is a private class scoped to `mcp-serve.ts` (declared at line 64, not exported, not used elsewhere), so it does not contaminate downstream consumers. The cast `(fetcher as AuthFetcher).invalidate()` at line 202 is the only ergonomic cost — acceptable because `isServiceTokenMode === false` guards that branch and the cast is correct by construction. QA-Verify's 6/6 pass confirms the behavioral contract holds.

---

## Checks summary

| # | Check | Status | Evidence |
|---|---|---|---|
| 1 | Shared-file anchor preserved (env-var branch BEFORE `new AuthFetcher`; Bearer header unchanged) | PASS | `mcp-serve.ts:82-87` before `:100-106`; `postFrame:233` unchanged |
| 2 | New file `service-token-fetcher.ts` at blueprint path | PASS | `cleargate-cli/src/auth/service-token-fetcher.ts` exists, 19 LOC |
| 3 | `TokenFetcher` interface introduced; both fetchers implement | PASS | `refresh.ts:13-20`, `refresh.ts:90`, `service-token-fetcher.ts:13` |
| 4 | Env-unset path byte-identical to pre-CR | PASS | Diff vs `b038ec4` shows identical AuthFetcher opts + RefreshError handling + invalidate-and-retry semantics; only additive change is M1-prescribed mode-announcement stderr line |
| 5 | Env var name verbatim `CLEARGATE_SERVICE_TOKEN` (CR-061 W3 string-match) | PASS | 5 verbatim occurrences in source; no shared constant |
| 6 | No keychain access in service-token mode | PASS | `grep -i keytar\|keychain` on new fetcher returns only a doc-comment negation |
| 7 | No new dependencies | PASS | `git diff b038ec4..974a947 -- cleargate-cli/package.json` empty |
| 8 | Red test files unchanged post-Red | PASS | `git diff 500ca63..974a947 -- cleargate-cli/test/` empty |

## Files reviewed

- `/Users/ssuladze/Documents/Dev/ClearGate/.worktrees/CR-065/cleargate-cli/src/commands/mcp-serve.ts`
- `/Users/ssuladze/Documents/Dev/ClearGate/.worktrees/CR-065/cleargate-cli/src/auth/refresh.ts`
- `/Users/ssuladze/Documents/Dev/ClearGate/.worktrees/CR-065/cleargate-cli/src/auth/service-token-fetcher.ts`
- Pre-CR baseline `b038ec4:cleargate-cli/src/commands/mcp-serve.ts` (extracted to `/tmp/mcp-serve-pre.ts` for diff)

## Sign-off

CR-065 may merge to `sprint/S-27`. No structural debt introduced. The TPV-equivalent interface deviation (sentinel error + boolean flag) is justified, contained, and consistent with M1's "minimal `TokenFetcher`" mandate.
