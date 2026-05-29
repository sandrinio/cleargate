# role: architect — STORY-032-02 Post-Flight Architectural Review

**Verdict: ARCH: PASS**

Story: STORY-032-02 — Code-map page schema + git-SHA drift + 2k token budget
Sprint: SPRINT-32 · Milestone: M2 · Wave: serial (033-03 → **032-02** → 033-04 → 032-03)
Dev commit: `b4a82153`
Lane: standard (v2) · Pre-gate 3/0 · QA 5/5 · Arch post-flight: PASS

---

## 1. Blueprint Conformance (M2 §STORY-032-02) — PASS

Every M2 verbatim contract is met:

- **`CodeMapPage`** (`page-schema.ts:25`): `kind: 'code-map'` + `source_shas: Record<string,string>` (relative-path → SHA). Self-contained variant — does NOT extend `WikiPage`, does NOT touch `WikiPageType`/`RepoTag`.
- **`serializeCodeMapPage`/`parseCodeMapPage`** (`page-schema.ts:61,87`): mirror the YAML emission shape of `serializePage`/`parsePage`. Round-trip verified by tests (4 assertions: kind, package, source_shas, body all preserved).
- **`driftCheck(page, runner?)`** (`page-schema.ts:158`): walks `source_shas`, calls `getGitSha(file, runner)` per file, returns `{ stale, changed }`. `getGitSha` is REUSED from `git-sha.ts:10`, not re-implemented. The optional `runner: GitRunner` test-seam mirrors `git-sha.ts`. Per-package isolation verified (a one-file mismatch marks only that package stale).
- **`estimateTokens(text)`** (`page-schema.ts:49`): `Math.floor(text.length / 4)` — chars/4 heuristic, zero new dep, single helper backing BOTH budget-check (`compile-page.ts:262`) and overrun math (`:269`), so reported `N` is reproducible. Determinism verified.
- **`compilePage`** (`compile-page.ts:73`): renders `ModuleSkeleton[]` → page string. `TRUNCATION_PRIORITY_ORDER` exported as an auditable constant (`:38`): signatures survive first, graph dropped before signatures, then types, vars, member-detail dropped first — matches the §1.4 recommended order exactly.
- **Budget enforcement** (`enforceTokenBudget`, `:256`): hard 2000-token cap; drops sections in reverse-priority order; footer literal `<!-- truncated: N symbols omitted -->` (`:301`); warning literal `code-map: <package> exceeded 2k budget by N tokens` (`:307`); `console.warn` (never throws, never `process.exit`). Exit-0-on-over-budget verified by `assert.doesNotThrow`.
- **Module Graph** (`buildModuleGraph`, `:229`): top-level local import-edge ASCII summary, counted against the same 2k budget (it is a `BodySection` joined into `fullBody` before `estimateTokens`), priority `module-graph` dropped before signatures.

## 2. Both Landmines Correctly Resolved — PASS

- **LANDMINE B (absolute `modulePath`):** `compile-page.ts:83` calls `path.relative(repoRoot, skeleton.modulePath)` BEFORE `getGitSha` AND before building `source_shas` keys. Verified against `extract-skeleton.ts:253` (`modulePath: sf.fileName` is absolute). Test asserts no absolute path appears as a `source_shas` key and the relative equivalent is present. `null` SHA from untracked files is stored deterministically as `""` (`:84`), not crashing the serializer — handled per M2 gotcha.
- **LANDMINE A (`RepoTag` has no `admin`):** Dev chose **option (b)** — `compilePage` takes a `packageName: string` param (`CompilePageOptions`, `:53`) derived from the dir name upstream; ZERO import of `deriveRepo`/`derive-repo`/`RepoTag` in `compile-page.ts` (grep hits are comments only). The admin-package test (`compile-page.red.node.test.ts:424`) confirms no throw. This is the M2-recommended path and does NOT widen the shared `page-schema.ts` union.

## 3. Forward-Compat with STORY-032-03 (LAST, integrates this) — PASS with one advisory

032-03 needs three things from this story; two are fully satisfied, one requires 032-03 to compute a value rather than receive it:

- **`kind: code-map` page recognition (scan.ts extension):** PASS. `CodeMapPage` is a clean string-keyed variant independent of `WikiPageType`/`RepoTag`, so 032-03's scan.ts can recognize the new kind without touching the shared union — exactly what 032-03 §3.2 step 3 describes.
- **`compilePage` entrypoint + `CodeMapPage` schema for the pass + index linking:** PASS. The entrypoint signature `compilePage(skeletons, { repoRoot, packageName, runner? }): string` is the registration surface 032-03 §3.2 step 2 invokes.
- **ADVISORY (non-blocking): `compilePage` returns only `string`, not `{ package, symbolCount }`.** 032-03's `## Code Map` index section requires a per-page exported-symbol count (032-03 Gherkin: *"each entry shows the page's exported-symbol count"*; M2 line 164: *"collecting the list of `{ package, symbolCount }` results"*). The `symbolCount` exists internally as a private `BodySection` field (`compile-page.ts:113`) but is NOT exposed to the caller. **This does NOT pre-constrain 032-03** — 032-03 owns the integration glue (its §3.1 lists `compile-page.ts` as read-only input) and can derive the count itself by either (a) `parseCodeMapPage(page).body` + counting `- ` lines, or (b) re-summing `skeleton.exports.length` from the `ModuleSkeleton[]` it already passes in. No re-dispatch needed; flagged so 032-03's Developer computes the count rather than expecting a richer return. Flashcard recorded.

## 4. ADR / Boundary Compliance — PASS

- **No new dependency:** `getGitSha` reused from `git-sha.ts`; `ts`/`path` are existing. chars/4 estimator is zero-dep. Confirmed against Locked Versions.
- **git-SHA drift per ADR 2026-04-19:** `driftCheck` uses `getGitSha` exclusively; no content hashing introduced.
- **node:test only:** both test files are `*.red.node.test.ts` run under `tsx --test`; placed at `cleargate-cli/test/wiki/code-map/` (M2 Architect ruling — NOT `src/`, per FLASHCARD #test-glob 2026-05-29). 28 tests pass.
- **EPIC-027 boundary:** no PM-tool SDK import in `cleargate-cli/src/**`. Pure wiki CLI source.
- **Mirror obligation:** NONE — all files under `cleargate-cli/src/`; no `.claude/**` or `cleargate-planning/**` mirror, no `npm run prebuild`.

## 5. Verification

- `npm run typecheck --workspace cleargate-cli` → clean (`tsc --noEmit`, no errors).
- `tsx --test` on both code-map test files → **28 pass / 0 fail** (all 5 Gherkin scenarios + LANDMINE A + LANDMINE B + serialize/parse round-trip + drift isolation + estimator determinism).

## Script Incidents

None.

---

**ARCH: PASS** — Blueprint-conformant, both M2 landmines correctly resolved via the recommended paths, typecheck clean, 28/28 tests green, no ADR/boundary violations. The one forward-compat advisory (`compilePage` returns `string`, not `{package, symbolCount}`) is non-blocking and resolvable inside 032-03's own scope. Cleared for merge.
