# CR-075 — QA-Verify Report

- **Mode:** VERIFY (read-only) · CLI-repo story (cli `story/CR-075`)
- **Verdict:** ✅ PASS (with documented residual + follow-up needed)
- **Commit:** `880de75` on cli `story/CR-075`.

## Decisive results
| Q | Check | Result |
|---|---|---|
| Q1 | Contract harness `cr075-standalone-contract.node.test.ts` | 6/6 PASS |
| Q2 | NEW failures introduced by CR-075 | **0** (rename + workspace-removal + wrapper only; no test-logic change) |
| Q3 | Residual classification | **N=6 Node-25-only · P=22 pre-existing-genuine · M=0 mis-tiered** |
| Q4 | Default tier clean (zero infra / workspace= / exit-127 / live↔canonical-parity) | **yes** |
| Q5 | Tiering correctness (30 integration files; spot-checks need infra/monorepo) | yes |
| Q6 | `.nvmrc`=24 + both workspace= conversions (changelog-format + license-contract, in-package pack) | yes |
| — | Wrapper `run-default-tests.mjs` excludes integration tier | yes (183 files, 0 integration leaked) |

## Residual classification (28 clean-run default-tier failures)
- **N=6 — Node-25-harness-only** (would pass on Node 24, deferred per CR §0.5): FileTokenStore ×2 (`it is not defined`), copyPayload-BUG-018 ×1, wiki/contradict-cli ×2, wiki/ingest ×1 (`require is not defined`).
- **P=22 — pre-existing genuine test rot** (fail on Node 24 too; NOT Node-25): AdminApiClient C-2/C-2b (Zod v4 schema), acquireAccessToken ×2 (expect-shim), cleargate CLI inert-message ×3, state-unit ×6, story-unit ×3, sync ×1, mcpServeHandler ×1, whoami ×1, membership ×2, wiki/build ×1 (TypeError).
- **M=0 — mis-tiered:** none. Infra/monorepo cleanly tiered to `test:integration`.

## Verdict rationale
CR-075's scope was **tiering** (make the suite standalone-runnable), NOT fixing pre-existing test rot. It did that correctly: zero new failures, zero mis-tiering, infra/monorepo/workspace= cleanly removed from the default tier, contract harness green. PASS.

## ⚠️ FOLLOW-UP NEEDED (surface to owner at close)
The **22 class-P residuals** are pre-existing genuine assertion/logic failures (predate CR-075, fail on Node 24). The default tier is therefore NOT fully green even on Node 24. A follow-up CR (EPIC-043) should audit + fix these: Zod-v4 schema drift, expect()-shim assertion mismatches, inert-message string drift, membership/JWT assertion bugs, wiki/build TypeError. The 6 class-N Node-25 cases are covered by the `.nvmrc`=24 + the deferred Node-25 follow-up.

## Note
The Developer's "57" vs QA's clean-run "28" discrepancy = the `RUN_SCRIPT_ACTIVE=1` env leak when `npm test` is invoked via `run_script.sh` (CR-046/052/054 self-exemption tests false-fail under the wrapper). Run `npm test` directly for accurate counts. CR-075 implementation sound.
