# QA-RED Report — STORY-032-03

**Role:** role: qa
**Story:** STORY-032-03: Wiki-Build Integration + Index Linking + Architect Consumption
**Mode:** RED
**Date:** 2026-05-29
**Worktree:** /Users/ssuladze/Documents/Dev/ClearGate/.worktrees/STORY-032-03/

## RED Tests Written

**Test file:**
`cleargate-cli/test/wiki/code-map-integration.red.node.test.ts`

**Absolute path:**
`/Users/ssuladze/Documents/Dev/ClearGate/.worktrees/STORY-032-03/cleargate-cli/test/wiki/code-map-integration.red.node.test.ts`

## Scenario Coverage (§2.1 Gherkin)

| Scenario | Test | Description | RED signal |
|---|---|---|---|
| §2.1 Scenario 1 | Acceptance-1 | codeMap:true writes wiki/code/pkg-alpha.md | file not written |
| §2.1 Scenario 1 | Acceptance-2 | codeMap:true adds ## Code Map to index.md | section absent |
| §2.1 Scenario 3 | Acceptance-3 | ## Code Map has [[code/pkg-alpha]] + "exported symbols" | section absent |
| §2.1 Scenario 4 | Acceptance-4 | architect.md "Inspect existing code" references wiki/code/ | text absent |
| §2.1 Scenarios 4+5 | Acceptance-5 | architect.md has "code-map is advisory; verify with Read/Grep" | text absent |
| (integration) | Unit-1 | wiki/code/ dir created when codeMap:true | dir not created |
| (integration) | Unit-2 | idempotent rebuild: 2nd run produces identical page content | page not written |
| (integration) | Unit-3 | wiki/code/pkg-alpha.md frontmatter has kind: code-map | page not written |

## Baseline Test Run

```
tests 8
suites 2
pass 0
fail 8
cancelled 0
skipped 0
todo 0
duration_ms 301.558041

Failing:
✖ Acceptance-1: codeMap:true writes .cleargate/wiki/code/pkg-alpha.md (22.037667ms)
✖ Acceptance-2: codeMap:true adds "## Code Map" section to index.md (7.704459ms)
✖ Acceptance-3: ## Code Map section contains [[code/pkg-alpha]] backlink entry with "exported symbols" (8.257458ms)
✖ Unit-1: wiki/code/ subdirectory is created under wikiRoot when codeMap:true (5.638709ms)
✖ Unit-2: idempotent rebuild — 2nd codeMap:true run produces identical wiki/code page content (10.062792ms)
✖ Unit-3: wiki/code/pkg-alpha.md has "kind: code-map" in YAML frontmatter (11.740208ms)
✖ Acceptance-4: canonical architect.md "Inspect existing code" step references .cleargate/wiki/code/ path (0.348333ms)
✖ Acceptance-5: canonical architect.md has "code-map is advisory" and "verify with Read/Grep" wording (0.177584ms)
```

## Typecheck

`npm run typecheck` exits 0. The `// @ts-expect-error` directive suppresses the
"codeMap does not exist in WikiBuildOptions" error during RED. After the Developer adds
`codeMap?: boolean` to `WikiBuildOptions`, the directive becomes "Unused '@ts-expect-error'"
→ typecheck fails → Developer removes the directive → typecheck GREEN again.

## Wiring Soundness (TPV pre-check)

- **Imports resolve:** `wiki-build.ts`, `_fixture.ts`, `node:test`, `node:assert/strict`, `node:fs`, `node:path`, `node:url` — all exist at cited paths ✓
- **Constructor signatures:** `wikiBuildHandler` takes `WikiBuildOptions` (all optional); called with compatible object ✓
- **Mock methods:** None used ✓
- **After-hooks:** `afterEach(() => fixture.cleanup())` present for all `beforeEach` fixture writes ✓
- **File naming:** `*.red.node.test.ts` ✓

## Fixture Design

- `buildFixture([])` creates empty delivery dir in tmpdir
- `addMinimalPackage(fixture.root, 'pkg-alpha')` adds `pkg-alpha/tsconfig.json` + `package.json`
  - `tsconfig.json` has `include: []` → `walkSources` returns [] → `extractSkeleton` returns []
  - `compilePage([], {packageName:'pkg-alpha',...})` writes page with `kind: code-map` + empty body
  - `discoverPackages` finds `pkg-alpha/` as a distinct package root (has both tsconfig.json + package.json)
- After impl: `wikiBuildHandler({ codeMap:true })` → discoverPackages → extractSkeleton → compilePage → writes `wiki/code/pkg-alpha.md` + `## Code Map` section in index.md
- Architecture.md tests: direct `fs.readFileSync` on `cleargate-planning/.claude/agents/architect.md` (canonical, tracked in worktree)

## Notes

- §2.1 Scenario 2 ("Flag absent preserves today's behavior") is ALREADY SATISFIED by the current baseline (no impl = no wiki/code writes). Not included as a RED test (it would PASS in RED, violating the "all tests fail" requirement). Verified correct in QA-VERIFY phase.
- Scenario 5 ("stale-export edge") behavioral aspects (Architect verification, plan not citing stale symbols) are live-dispatch behaviors not testable via node:test. Covered by the content assertions in Acceptance-4 and Acceptance-5 (the advisory wording enables the behavior). Per M2.md: "architect.md content assertions (scenarios 4-5) are grep-style checks on the agent file, not live dispatch."
- `@ts-expect-error` pattern: after implementation, the directive becomes a typecheck error (unused) → Developer removes it → typecheck GREEN → correct TDD cycle.

---

## QA-VERIFY

**Role:** role: qa
**Story:** STORY-032-03
**Mode:** VERIFY
**Dev commit:** a4fc3371
**Worktree:** `/Users/ssuladze/Documents/Dev/ClearGate/.worktrees/STORY-032-03/`
**QA run date:** 2026-05-29
**QA context pack:** absent (fallback to worktree + dev report)

### Scoped test run

Command: `bash .cleargate/scripts/run_script.sh tsx --test test/wiki/code-map-integration.red.node.test.ts`
(cwd: `.worktrees/STORY-032-03/cleargate-cli/`)

Result: **8 passed, 0 failed, 0 skipped, 0 cancelled.** Exit 0.

All 8 tests green: Acceptance-1 through Acceptance-5 + Unit-1 through Unit-3.

### Typecheck

`npm run typecheck` — exit 0, no errors. `@ts-expect-error` removed (now unused after `codeMap?: boolean` added to `WikiBuildOptions`).

### Full suite

`tsx --test --test-concurrency=1 --experimental-test-module-mocks ... 'test/**/*.node.test.ts'`

Result: 2269 tests total; **2079 passed, 134 failed, 56 cancelled** (piped summary run).
`npm test` reports 151 failures; the delta (17) is attributable to npm's cancelled-test accounting, not new failures.

Pre-existing failures confirmed: AdminApiClient (C-2/C-2b), snapshot-drift, acquireAccessToken, FileTokenStore, CHANGELOG.md format, --help CLI scenarios, doctor, developer.md, gate commands, wiki/hotfix-ledger, init/reinit, reconcile-lifecycle — none overlap with this commit's touched files (`wiki-build.ts`, `architect.md`, `MANIFEST.json`).

Zero wiki-build or code-map test failures.

### Gherkin scenario coverage (§2.1)

| Scenario | Test(s) covering it | Result |
|---|---|---|
| 1. Opt-in flag registers the code-map pass (writes pages + index section) | Acceptance-1, Acceptance-2, Unit-1 | PASS |
| 2. Flag absent preserves today's behavior (no wiki/code/ writes, no ## Code Map) | **NO DEDICATED TEST** — implementation guard verified by code inspection only | MISSING |
| 3. Index links resolve to emitted pages (backlink + symbol count) | Acceptance-3 | PASS |
| 4. Architect dispatch consumes code-map page first (architect.md updated) | Acceptance-4 | PASS |
| 5. Stale code-map page + Architect verify via Read/Grep (advisory wording) | Acceptance-5 | PASS (wording present) |

**Scenario 2 gap:** No test explicitly invokes `wikiBuildHandler` without `codeMap:true` and asserts that `wiki/code/` is not created and `index.md` has no `## Code Map` section. `build.node.test.ts` runs 80 tests without `codeMap:true` but none assert absence of wiki/code/. Story §4.1 DoD requires "flag-off writes nothing + no section" as a unit test. §4.2 DoD requires all §2.1 Gherkin scenarios covered.

**Scenario 5 note:** The behavioral aspects (Architect not citing stale symbols, rebuild queue) are agent-dispatch behaviors not testable via node:test. Covered via advisory text assertions (Acceptance-4/5). Acceptable per M2 plan ruling.

### Implementation correctness checks

1. **`codeMap?: boolean` added to `WikiBuildOptions`** (wiki-build.ts:35) — confirmed.
2. **Code-map pass guarded by `if (opts.codeMap)`** (wiki-build.ts:131) — confirmed.
3. **`buildIndex` empty-delivery early-return also injects Code Map** (wiki-build.ts:244-253) — confirmed. Dev identified and fixed this bug correctly.
4. **`buildIndex` normal path injects Code Map** (wiki-build.ts:412-419) — confirmed.
5. **SHA-based idempotency via `driftCheck`** (wiki-build.ts:148-158) — confirmed. Unit-2 passes.
6. **`kind: code-map` in emitted page** — confirmed by Unit-3.
7. **`scan.ts` NOT modified** — confirmed. In-memory `codeMapResults` list passed to `buildIndex` instead.

### Architect.md checks

- **`.cleargate/wiki/code/<package>.md` referenced in "Inspect existing code" step** — confirmed (line 31).
- **"code-map is advisory; verify with Read/Grep" wording** — confirmed (same line 31).
- **STORY-033-03 SDR block (Planning-workflow path)** — intact at line 104.
- **`npm run prebuild` ran** — MANIFEST.json SHA updated to reflect architect.md change (confirmed via diff).
- **Live `/.claude/agents/architect.md` re-sync** — Dev confirms done directly (gitignored). Close-time follow-up noted per §3.2.

### Adversarial probe

- No-flag path: implementation guard `if (opts.codeMap)` is unambiguous; `codeMapResults` stays `[]`; `buildIndex(items, [])` emits no `## Code Map` section. Verified by code inspection. No test asserts this.
- Empty package (no .ts files): `extractSkeleton` returns `[]`; `compilePage([], opts)` writes valid page with `kind: code-map` + 0 symbols. Covered by Unit-1/2/3 fixture design.

### Regression check

Zero regressions in code-map or wiki-build surfaces. All 134 pre-existing failures confirmed unrelated to this commit.


---

## QA-VERIFY (recheck)

**Role:** role: qa
**Story:** STORY-032-03
**Mode:** VERIFY (qa_bounce #1 recheck)
**Dev commit:** ad7bcccc
**Worktree:** `/Users/ssuladze/Documents/Dev/ClearGate/.worktrees/STORY-032-03/`
**QA run date:** 2026-05-29

### Focused test run

Command: `bash .cleargate/scripts/run_script.sh tsx --test test/wiki/code-map-integration.red.node.test.ts test/wiki/code-map-flag-off.node.test.ts`
(cwd: `.worktrees/STORY-032-03/cleargate-cli/`)

Result: **9 passed, 0 failed, 0 skipped, 0 cancelled.** Exit 0.

```
STORY-032-03 code-map flag-off regression — §2.1 Scenario 2
  ✔ Scenario 2: omitting codeMap does NOT create wiki/code/ and index.md has no ## Code Map section (14.449417ms)

STORY-032-03 code-map integration (RED) — wikiBuildHandler codeMap pass
  ✔ Acceptance-1: codeMap:true writes .cleargate/wiki/code/pkg-alpha.md
  ✔ Acceptance-2: codeMap:true adds "## Code Map" section to index.md
  ✔ Acceptance-3: ## Code Map section contains [[code/pkg-alpha]] backlink entry with "exported symbols"
  ✔ Unit-1: wiki/code/ subdirectory is created under wikiRoot when codeMap:true
  ✔ Unit-2: idempotent rebuild — 2nd codeMap:true run produces identical wiki/code page content
  ✔ Unit-3: wiki/code/pkg-alpha.md has "kind: code-map" in YAML frontmatter

STORY-032-03 architect.md instruction (RED) — "Inspect existing code" step
  ✔ Acceptance-4: canonical architect.md "Inspect existing code" step references .cleargate/wiki/code/ path
  ✔ Acceptance-5: canonical architect.md has "code-map is advisory" and "verify with Read/Grep" wording

tests 9 / pass 9 / fail 0 / skipped 0
```

### New test assertion quality (§2.1 Scenario 2)

`code-map-flag-off.node.test.ts` runs `wikiBuildHandler` WITHOUT `codeMap: true` against a fixture that DOES contain a discoverable package (`pkg-alpha/tsconfig.json` + `package.json`). This is the meaningful case — the guard must fire even when a package is present.

Two concrete `assert.ok(!...)` calls:
- (a) `!fs.existsSync(wikiCodeDir)` — wiki/code/ must not be created
- (b) `!indexContent.includes('## Code Map')` — index.md must have no Code Map section

Both assertions are real, non-vacuous, and fail descriptively if the guard regresses.

### Gherkin scenario coverage (§2.1) — updated

| Scenario | Test(s) | Result |
|---|---|---|
| 1. Opt-in flag writes pages + index section | Acceptance-1, Acceptance-2, Unit-1 | PASS |
| 2. Flag absent preserves today's behavior (no wiki/code/, no ## Code Map) | Scenario-2 in code-map-flag-off.node.test.ts | PASS (gap closed) |
| 3. Index links resolve to emitted pages | Acceptance-3 | PASS |
| 4. Architect dispatch consumes code-map page first | Acceptance-4 | PASS |
| 5. Stale code-map + Architect verify via Read/Grep | Acceptance-5 | PASS |

All 5 of 5 §2.1 scenarios now have dedicated test coverage.

### Commit scope

`ad7bcccc` is test-only: 1 file added (`cleargate-cli/test/wiki/code-map-flag-off.node.test.ts`), 109 insertions. No implementation surface touched. Zero regression risk.

### Prior GREEN findings

All previously GREEN items remain unchanged (8/8 original red tests passing, typecheck clean, integration correct, architect.md read-step, both buildIndex paths). No regressions detected.

### Verdict

PASS. All 5 §2.1 Gherkin scenarios have matching passing tests. Scenario 2 gap closed. Ship it.
