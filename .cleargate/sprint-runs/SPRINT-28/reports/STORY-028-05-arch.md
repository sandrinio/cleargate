role: architect

# STORY-028-05 Architect Post-Flight — mcp/ vitest elimination

**Story:** STORY-028-05 — Convert `mcp/` Test Suite to node:test
**Sprint:** SPRINT-28 (v2)
**Lane:** standard
**Mode:** POST-FLIGHT (read-only)
**Generated:** 2026-05-18
**Outer commit:** `0ba97261` on `sprint/S-28` (dev report only)
**Inner commit:** `b14e23e` on mcp/ `main` (the actual conversion — 68 files)
**QA verdict:** PASS — 5/5 scenarios, 505 pass / 0 fail / 1 skipped (pre-existing live SMTP gate)

---

## Verdict

**ARCHITECT: PASS**

All five Gherkin scenarios satisfied. Three orchestrator-confirmed plan deviations are net improvements over the dispatched plan, not regressions. Atomic-commit invariant met (one inner commit carries config delete + dep removal + 50 file conversions). Zero vitest residue verified independently.

## Verification Performed

| Check | Method | Result |
|---|---|---|
| `vitest.config.ts` absent in mcp/ | `find mcp -name 'vitest.config.*' -not -path '*/node_modules/*'` | PASS (zero matches) |
| `vitest` removed from `mcp/package.json` devDependencies | parsed JSON | PASS (`vitest in devDeps: False`) |
| `test` script invokes node:test runner | parsed JSON | PASS — `node --test --test-concurrency=1 --experimental-test-module-mocks --env-file=.env --import tsx/esm 'src/**/*.node.test.ts' 'scripts/**/*.node.test.ts' 'test/**/*.node.test.ts'` |
| `from 'vitest'` residue in mcp/ | `grep -rE "from 'vitest'" mcp --include='*.ts'` | PASS (zero matches) |
| `vi.(mock\|fn\|spyOn\|stubGlobal\|useFakeTimers\|hoisted)` residue in mcp/ | `grep -rE` | PASS — single hit at `mcp/src/tools/push-item.node.test.ts:9` is a JSDoc-style comment explaining the pattern being replaced ("Stateful mock state — mutated per-test (replaces vi.mocked().mockReturnValue pattern)"). No live API call. |
| `linear-adapter.ts` production-source residue | `grep -nE "vi\." mcp/src/adapters/linear-adapter.ts` | PASS — exit 1, zero hits. JSDoc-comment cleanup landed. |
| Inner-commit atomicity | `git show --stat b14e23e` | PASS — 68 files in single commit (package.json + package-lock.json + vitest.config.ts deletion + 50 test-file pairs + linear-adapter.ts comment fix) |
| Commit subject format | `git log --oneline` | PASS — matches §1.2 step 6 exactly |

## Review Point Resolutions

### RP1 — Three orchestrator-confirmed plan deviations

All three are upgrades, not drift:

1. **`--test-concurrency=1`** — required for parity with vitest's `singleFork: true` for DB-sharing integration tests. Without this, parallel file execution corrupts shared Postgres state. Architect-approved retroactively; document as the mcp/ runner standard for SPRINT-29+ regression checks.
2. **`AdminApiError.kind` (not `.errorType`)** — mock-shape bug fix. The real `AdminApiError` class exposes `.kind` (verified by Dev across 4 command-test sites). Pre-conversion vitest tests passed because vi.mock() did not validate property names; node:test's tighter equality surfaced the gap. Net win.
3. **`socket.destroySoon` no-op via Fastify onRequest hook** — works around a `@hono/node-server` 500ms timer that fires `socket.destroySoon()` on Fastify's `inject()` synthetic socket. Without the patch, the test process hangs for 500ms post-suite and may flake on slow CI. The fix is local to `service-token.node.test.ts`; no production code changed. Strictly better than the dispatched "pre-existing warnings are OK" stance.

None of the three require an amendment to existing dispatched stories (-06, -07) because each deviation is package-local. However, the runner-flag pair (`--test-concurrency=1 --experimental-test-module-mocks`) should be inherited as the **baseline test-script template** for STORY-028-06 and STORY-028-07 — see Amendment 1.

### RP2 — mcp/ nested-repo discipline

Confirmed clean:
- Inner commit `b14e23e` lives in `mcp/.git/` history (verified: `cd mcp && git log` shows it as HEAD of `main`).
- Outer commit `0ba97261` on `sprint/S-28` carries only the 45-line dev report — no mcp/ binary blobs or submodule pointer corruption.
- **Deploy implication for SPRINT-28 close:** the Coolify-deployed mcp endpoint at `https://cleargate-mcp.soula.ge/` will NOT pick up this conversion at SPRINT-28 close — it deploys from mcp/'s `main` branch, and the release recipe in the project CLAUDE.md "Deploy targets" table says nothing about coordinating an mcp/ push as part of sprint close. This is correct: the conversion is a test-runner refactor, not a runtime behavior change; mcp/ can ship at its own cadence.
- **Action for Reporter / DevOps:** sprint REPORT.md should call out explicitly that `b14e23e` exists in mcp/'s history but has not been pushed to mcp/'s `origin` — the human decides when/whether to push the test-runner refactor to the deploy mirror. Flag captured below in `## Mid-Sprint Amendments`.

### RP3 — Test runner config sustainability

The `--test-concurrency=1 --experimental-test-module-mocks` pair is sustainable for STORY-028-06 (cleargate-cli/) and STORY-028-07 (admin/) baselines on these grounds:

- `--experimental-test-module-mocks` is required by Node 24 LTS to enable `mock.module()` (Dev report key fix #1). All three packages will inherit any module-mock conversions, so the flag must travel with the runner.
- `--test-concurrency=1` is conservative but cheap. cleargate-cli/ tests rarely touch shared state (mostly CLI surface unit tests, per spot-check of 49 existing `*.node.test.ts` files), so `=1` is over-serialization but safe. admin/ has zero DB integration, so `=1` is pure cost — but the cost is small (34 files), and uniformity across the three test scripts reduces the cognitive load when debugging cross-package failures.
- Recommendation: ship `--test-concurrency=1` everywhere in -06 and -07 to lock in uniformity; SPRINT-29 can tune per-package if CI runtime becomes a bottleneck. Captured as Amendment 1.

### RP4 — Cross-package readiness for STORY-028-06 and STORY-028-07

Pre-flight signals gathered in this post-flight:

| Package | `from 'vitest'` files | `vi.*` files | `test.each/describe.each` | `expect.assertions/extend` | Pre-existing `*.node.test.ts` |
|---|---|---|---|---|---|
| cleargate-cli/ | 149 | 26 | 0 | 0 | 49 |
| admin/ | 34 | 0 (rough) | 0 | 0 | 0 |

**mcp/ codemod hit-rate baseline:** 8 of 50 files auto-converted (16%); 42 manual. Manual conversions were driven by matcher diversity beyond the codemod's 7-matcher set: `toMatchObject`, `toContain`, `toBeInstanceOf`, etc.

**Projection for STORY-028-06 (cleargate-cli/, 149 files):**
- Manual-fix rate ≥ 60% (90+ files) is the realistic expectation given matcher diversity in the existing test suite. STORY-028-04's earlier post-flight amendment from 2026-05-18T21:04:56 already flagged `test.each` and `expect.assertions` as non-handled — those are clean here (zero hits in cleargate-cli/), so manual-fix is purely matcher rewrites.
- vi.* density: 26 files with vi.* calls. mcp/ had similar concentration but heavier per-file (vi.mock + vi.fn combos for DB and adapter mocks). cleargate-cli/'s vi.* sites are likely lighter (CLI-command unit tests), so per-file conversion cost should be lower.
- **Sizing risk:** the 149-file total is 3× mcp/'s 50. Even at the same per-file budget, this is one full Developer dispatch session minimum. Recommend Architect issue a STORY-028-06 dispatch addendum: pre-flight dry-run + manual-fix count escalation threshold should be **40** (not 20 as in -05) — preserving the "escalate if >2× expected" rule from EPIC-028 §"Risks & Dependencies".

**Projection for STORY-028-07 (admin/, 34 files):**
- Lowest risk. Smaller surface, zero vi.* density (per spot-check), no svelte-component-import tests (zero `.svelte` references in test files via grep — admin tests are all server-side TS).
- The svelte preflight gate from EPIC-028 should still run, but expected to be a no-op for the runtime conversion (svelte component tests are not present).
- **No dispatch-time deviation expected.**

### RP5 — JSDoc-comment fix immutability in linear-adapter.ts

Confirmed: `linear-adapter.ts:2` (delta line per `git show --stat`) is the comment scrubbed of the `vi.mock()` reference. The verifying grep `grep -nE "vi\." linear-adapter.ts` returns exit 1 (zero matches).

**Regression risk for future merges:** any merge that touches this file from a long-lived branch predating SPRINT-28 will reintroduce the `vi.mock()` JSDoc reference. Mitigation: the residue greps in STORY-028-08's wrap-up DoD will catch a regression — `rg "from 'vitest'|vi\\." mcp/` is part of the validation gates already specified. No structural fix needed beyond ensuring STORY-028-08's grep is run pre-close.

## Adjacent Implementations Update

Append to sprint-context §"Adjacent Implementations":

| Story | Module / Export | Path |
|---|---|---|
| STORY-028-05 | mcp/ test-script template: `node --test --test-concurrency=1 --experimental-test-module-mocks --env-file=.env --import tsx/esm 'src/**/*.node.test.ts' 'scripts/**/*.node.test.ts' 'test/**/*.node.test.ts'` | mcp/package.json |
| STORY-028-05 | Fastify onRequest socket.destroySoon no-op pattern (Hono adapter workaround) | mcp/src/admin-api/service-token.node.test.ts |

## Mid-Sprint Amendments (for sprint-context.md)

Two new amendments to append:

```
2026-05-18T<HH:MM:SS>.000Z · STORY-028-05-arch · Architect post-flight (PASS). Three confirmed deviations are net improvements; the runner-flag pair `--test-concurrency=1 --experimental-test-module-mocks` SHOULD be inherited as the test-script baseline for STORY-028-06 (cleargate-cli/) and STORY-028-07 (admin/) — uniformity reduces cross-package debugging cost; per-package tuning deferred to SPRINT-29 if CI runtime becomes a bottleneck. STORY-028-06 dispatch addendum: bump manual-fix escalation threshold to 40 (was 20 for -05) given the 149-file scale (3× mcp/'s 50) and likely matcher-diversity manual-fix rate of ≥60%. STORY-028-07 dispatch unchanged — small surface (34 files), zero vi.* density, zero svelte-component tests.
2026-05-18T<HH:MM:SS>.000Z · STORY-028-05-arch · Deploy advisory for SPRINT-28 close: mcp/ inner commit b14e23e (the actual conversion) lives in mcp/'s git history but has NOT been pushed to mcp/'s `origin`. Coolify deploys mcp/ from mcp/'s main branch, so the test-runner refactor will not ship to https://cleargate-mcp.soula.ge/ at SPRINT-28 close. This is correct (no runtime change), but Reporter MUST call this out in REPORT.md and human MUST decide push timing for mcp/ separately. Outer sprint branch (0ba97261 on sprint/S-28) carries only the 45-line dev report.
```

## Open Decisions for Orchestrator

1. **Push mcp/ inner commit b14e23e to mcp/'s origin?** — decision deferred to human at SPRINT-28 close. Reporter to surface in REPORT.md handoff section.
2. **STORY-028-06 dispatch addendum** — does Architect re-dispatch with the threshold-40 + runner-flag inheritance, or does orchestrator inject these as dispatch-text overrides? Per memory `feedback_dispatch_vs_milestone_plan_precedence`, an amendment-class change should re-dispatch Architect first; this one straddles the line (test-script template is reuse, not new behavior). Orchestrator's call.

## Script Incidents

None. All verification ran via direct `git`/`grep`/`find` invocations; no scripted gates triggered.

---

**STORY:** STORY-028-05
**ARCHITECT:** PASS
**INNER_COMMIT:** b14e23e (mcp/ — 68 files, atomic)
**OUTER_COMMIT:** 0ba97261 (sprint/S-28 — dev report only)
**DEVIATIONS:** 3 confirmed (--test-concurrency=1, AdminApiError.kind, socket.destroySoon onRequest patch) — all net improvements
**AMENDMENTS:** 2 (runner-flag inheritance + manual-fix threshold for -06; mcp/ deploy advisory for close)
**ADJACENT:** mcp/ test-script template + Fastify onRequest pattern added to reuse registry
