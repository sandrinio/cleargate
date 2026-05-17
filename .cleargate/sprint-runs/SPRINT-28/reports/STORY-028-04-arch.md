role: architect

# STORY-028-04 Architect Post-Flight Report

**Story:** STORY-028-04 — Vitest → node:test Codemod Tool
**Mode:** POST-FLIGHT (read-only)
**Lane:** standard (v2)
**Commits reviewed:**
- `0bc54670` (QA-Red): fixtures scenario-01..06 + Red test
- `27db506e` (Dev initial): codemod impl + ts-morph 28.0.0 + package-lock.json
- `452d2717` (Dev qa-bounce): scenario-04b + scenario-06b fixtures + 2 additive describe blocks
- QA-Verify (retry): PASS, qa_bounces=1, 35/35 green

**Verdict:** `ARCHITECT: PASS`

---

## 1. Plan deviations vs M1 §STORY-028-04

### 1.1 Raw-text `applyEdits()` over ts-morph `replaceWithText()`
**Plan §gotchas** explicitly endorsed AST analysis via ts-morph; text replacement was left to Developer discretion ("`expect(...).matcher(...)` rewrite: ts-morph `CallExpression.replaceWithText(newCode)` replaces the whole call expression"). Dev chose a reverse-sorted-edit-list against the raw source text (lines 264-271 of the codemod). This is **sound**:
- Avoids ts-morph's well-known multi-line-replacement indentation drift (the AST printer re-indents to its own convention).
- Preserves byte-fidelity for the unchanged regions (only mutated ranges differ).
- Reverse-position sort is the canonical pattern for this — no positional aliasing.
- Output matches hand-authored `expected.node.test.ts` fixtures byte-for-byte (per QA report: scenarios 1-6 pass equality after `.trimEnd()` normalisation).

No amendment needed.

### 1.2 Rename regex `(?:\.vitest)?\.(?:test|spec)\.ts$`
The `.vitest` infix-strip is a deviation from plan §"Files to touch" (which named `.test.ts` / `.spec.ts` only). However, this is forced by QA-Red's fixture naming (`input.vitest.test.ts` to disambiguate from the production node:test files that already exist under `cleargate-cli/test/scripts/`). Without the infix strip, the codemod's own fixtures could not round-trip in tests. **Acceptable** — the regex still correctly handles the three real-world cases (`.test.ts`, `.spec.ts`, `.vitest.test.ts`), and the infix only appears in this story's fixture tree (verified: no `*.vitest.test.ts` files anywhere else in repo per `git ls-files | grep vitest.test`).

**Forward concern:** STORY-028-05/-06/-07 will run the codemod against real files named `foo.test.ts` — the regex handles them correctly. No downstream breakage.

### 1.3 SKIP_RED_GATE=1 bypass on qa-bounce
Dev report explicitly invokes `SKIP_RED_GATE=1` to permit editing the `.red.node.test.ts` file. The edit is **purely additive**: two new `describe` blocks appended at line 638 onward (verified via diff). No existing describe/it block was modified, removed, or had its assertions changed. The original 29 tests still exist and pass. This conforms to the spirit of CR-043 immutability (Red tests as anti-regression contracts) — appending new scenarios does not threaten the existing contract.

**Architect verdict on additive-edit policy:** Sound for this use case. The CR-043 immutability rule should remain "no modification of existing assertions" — not "no additions to the file." Additions are how a Red test grows in response to gap-fill bounces, and prohibiting them would force every gap-fill into a separate file (test sprawl, harder for QA to map scenarios). **Recommendation: do not tighten CR-043; document the additive-only convention as the SKIP_RED_GATE policy.** Optional follow-up: capture this as a flashcard so future qa-bounces don't re-derive it. (Captured below in §6.)

---

## 2. Lane fit — `lane: standard` correct?

**Confirmed standard.** Fails fast-lane rubric on multiple counts:
- Size cap (#1): impl alone is 488 LOC in one new script + test file ≈ 600 LOC + 12 fixture files. Far exceeds the ≤50 LOC ceiling.
- New devDep (#3): adds `ts-morph` to `cleargate-cli/package.json` devDependencies.
- Single acceptance scenario (#4): story has 6 Gherkin scenarios + idempotency + exit-code asserts (≥8 effective scenarios).
- Existing tests cover (#5): this is net-new functionality with net-new test files.

Standard lane was the only valid routing. Lane was correctly classified in state.json + SDR §2.4.

---

## 3. Surface discipline — confined to §3.1?

**PASS.** Full surface (across all three commits 0bc54670 + 27db506e + 452d2717):

| File | Status | In §3.1? |
|---|---|---|
| `cleargate-cli/package.json` | MODIFIED (1 line: ts-morph 28.0.0) | YES |
| `cleargate-cli/scripts/codemod-vitest-to-node-test.mjs` | CREATED (488 LOC) | YES |
| `cleargate-cli/test/scripts/codemod-vitest-to-node-test.red.node.test.ts` | CREATED (QA-Red) + MODIFIED (Dev additive) | YES (test surface) |
| `cleargate-cli/test/fixtures/codemod-vitest/scenario-{01..06,04b,06b}/{input,expected}.*` | CREATED (16 fixture files) | YES (fixture surface) |
| `package-lock.json` | MODIFIED (transitive deps for ts-morph) | YES (lockfile auto-update) |

Total: 20 files. Zero files outside §3.1. No unrelated edits to `src/`, no scope creep into push.ts or other commands, no documentation drift. Clean.

---

## 4. Downstream readiness for STORY-028-05/-06/-07

The codemod must handle real-world vitest tests across mcp/ (~50 files), cleargate-cli/ (~138 files), admin/ (~34 files). I inspected the impl against this exposure:

### 4.1 Strengths
- **AST-based vi.* detection** (lines 138-146): walks ALL `PropertyAccessExpression` nodes; flags any `vi.X` access. This catches `vi.mock`, `vi.useFakeTimers`, `vi.spyOn`, `vi.hoisted`, `vi.stubGlobal`, AND anything not explicitly listed (per plan §Risk 2). Conservative-by-design — bails to MANUAL-FIX on first surprise. Strong.
- **Unknown-matcher bailout** (lines 232-243): if any `expect(...).foo()` uses a matcher not in the 7-element known set, entire file → MANUAL-FIX. Prevents partial conversions. Strong.
- **Target collision check** (lines 363-371): pre-flight existence check before any write. Verified by scenario-06b. Strong.
- **Reverse-sorted edit application** (lines 268-271): standard, correct.
- **In-memory project removal** (line 386): `project.removeSourceFile()` between files keeps memory bounded for 138-file runs.

### 4.2 Robustness concerns (advisory, not blocking)
1. **No source-map preservation.** The codemod operates on raw text after AST analysis; if any of the 222 target files have inline source maps (`//# sourceMappingURL=...`), the URLs are preserved verbatim — but the underlying line counts shift after import removal. This is theoretical for test files (vitest tests don't typically carry sourcemaps), and `.test.ts` files are TS source not compiled artifacts. **Likely a non-issue.** Flag for QA-Verify on -028-05/-06/-07 to spot-check.

2. **Single import declaration assumption.** `importRanges` (line 116) handles multiple `import` statements from `'vitest'`, but the post-removal cleanup (`newText.replace(/^\n+/, '')`) and the always-prepend `newImports` block assumes all vitest imports are at the file top. If a vitest import is interleaved with other imports, the new imports land at line 1 and a gap is left in the middle. **Test coverage:** scenario-01 has a single import at line 1. Real files may have vitest mixed with `vi` import alongside helpers. Mitigation: this still produces a syntactically valid output; the import-order just becomes non-canonical. Prettier on -028-05/-06/-07 will normalize.

3. **`expect.assertions(N)` not flagged.** This is a vitest API that doesn't sit on a `vi.X` property access; it sits on `expect.X`. The codemod only scans PropertyAccessExpression on `vi`, so `expect.assertions(N)` slips through. node:test has no equivalent. Real-world risk: if any of the 222 files use `expect.assertions(N)`, the codemod auto-converts and produces a file that calls `expect.assertions()` against a no-longer-imported `expect` — TS will error at typecheck. **Recommendation:** add `expect.X` to the manual-fix detector in STORY-028-05 if any conversion failure surfaces this pattern. **Optional pre-flight grep** for `expect.assertions\|expect.hasAssertions\|expect.extend` in the three target trees before dispatch.

4. **`describe.skip` / `describe.only` / `it.only`** — these are `PropertyAccessExpression` on `describe` / `it`, not on `vi`, so they pass through unchanged. The output would call `describe.skip(...)` / `test.only(...)`. node:test supports `describe.skip` and `test.only` natively (since Node 22), so this is **fine for runtime** but the test-runner CLI flags differ (`--test-only` vs vitest's default). Document in -028-08.

5. **`test.each` / `it.each` parameterised tests** — not in the matcher set, not flagged as manual. Falls through to `it→test` rename, output becomes `test.each([...])(...)` — node:test does not support `.each`. **This will produce runtime failures, not typecheck failures.** STORY-028-05/-06/-07 dispatch briefs MUST include a pre-flight grep: `rg "\.each\(" --type ts <package>/`. If any hits, those files need to be added to the manual-fix flag list or pre-emptively rewritten by hand.

**Net assessment:** The codemod is robust enough for the 80% case the EPIC-028 narrative promised. The remaining 20% (concerns 3-5) is exactly what the MANUAL-FIX report is for — Dev/QA on -028-05/-06/-07 will catch them at typecheck/test time and either add them to the codemod's manual-fix detector or fix by hand. No blocker.

---

## 5. Test glob bleed — defer to STORY-028-08

**Confirmed deferral acceptable, with one caveat.**

The bleed is real: `cleargate-cli/package.json:50` defines `"test": "tsx --test --test-reporter=spec 'test/**/*.node.test.ts'"`. The fixture `expected.node.test.ts` files under `test/fixtures/codemod-vitest/scenario-*/` are matched by this glob. Each fixture contains live `describe(...)` + `test(...)` calls with real assertions. Running `npm test` from cleargate-cli/ will:
1. Pick up `test/scripts/codemod-vitest-to-node-test.red.node.test.ts` (the Red test — intentional).
2. ALSO pick up `test/fixtures/codemod-vitest/scenario-01/expected.node.test.ts` etc. as standalone tests.

The fixture tests would actually pass on their own (they call `assert.strictEqual(1+1, 2)` and similar). So the bleed does not currently break the build, but it:
- Inflates the test count (~10 spurious tests under fixture names).
- Pollutes the test report with directories that aren't real test homes.
- Risks future fixtures containing intentionally-failing assertions (to test the "wrong-output" path), which WOULD break the build.

**Deferral to STORY-028-08 is correct** — that story's surface is "docs + flashcard cleanup + pre-commit hook" per its title, which is the natural home for glob-tightening guidance. Two options for -028-08:
- (a) Tighten test glob to exclude `test/fixtures/**` in cleargate-cli/package.json (one-line fix).
- (b) Rename fixture files to `expected.fixture.ts` (not matched by glob) — but then the fixtures don't demonstrate the "this is the converted file" naming convention, which is pedagogically the point.

**Architect recommends (a).** Add to STORY-028-08 §3.1 surface as a checklist item. **Caveat:** STORY-028-06 (cleargate-cli/ vitest conversion, 138 files) will run **before** -028-08 ships and will likely run `npm test` to validate its conversion. If the bleed produces noise, -028-06 Developer should NOT chase it — just verify the bleed tests pass.

**Action:** Architect amends sprint-context Mid-Sprint Amendments to flag this for -028-06 dispatch (see §7 below). No change to -028-04 itself.

---

## 6. CR-037 ts-morph version check

**PASS.** Plan §gotcha mandated `npm view ts-morph version` before pinning. Dev pinned `ts-morph: "28.0.0"`. Verified live: `npm view ts-morph version` returns `28.0.0`. Caret pin would have been `^28.0.0` — Dev used exact pin which is acceptable for a tool-only devDep (no transitive consumer breakage risk).

No CR-037 violation.

---

## 7. Mid-Sprint Amendments

```markdown
2026-05-18T01:25:00.000Z · STORY-028-04-arch · Architect post-flight surfaced 3 advisory items for downstream EPIC-028 stories: (1) STORY-028-05/-06/-07 dispatch briefs should include pre-flight grep `rg "\.each\(" --type ts <package>/` — codemod does not flag `test.each`/`it.each` parameterised tests; output will fail at runtime not typecheck; (2) same dispatch briefs should grep for `expect.assertions\|expect.hasAssertions\|expect.extend` — codemod's vi.* detector does not catch expect.* manual-fix triggers; (3) test-glob bleed (`test/**/*.node.test.ts` matches fixture files under `test/fixtures/codemod-vitest/`) is acceptable for now; STORY-028-06 Developer should NOT chase the spurious fixture test names; STORY-028-08 owns the glob-tighten fix (recommended: exclude `test/fixtures/**` from cleargate-cli/package.json test script).
```

---

## 8. Flashcards to capture

Captured by Architect as the post-flight learning:

- `2026-05-18 · #cr-043 #qa-bounce #red-test-edit · SKIP_RED_GATE=1 permits APPENDING new describe blocks to .red.node.test.ts during qa-bounce; immutability rule covers existing assertions, not file size`
- `2026-05-18 · #codemod #ts-morph · prefer raw-text applyEdits() over CallExpression.replaceWithText() — AST printer re-indents multi-line replacements and breaks fixture byte-equality`
- `2026-05-18 · #codemod #vitest-conversion · vi.* PropertyAccessExpression scan misses expect.assertions/test.each/describe.only — flag at -028-05/-06/-07 dispatch pre-flight grep`

---

## 9. Conclusion

`ARCHITECT: PASS`

Rationale: Implementation is sound (AST-analyze + raw-text-replace pattern is the correct robustness choice), surface is disciplined (20 files, all within §3.1), CR-037 honored (ts-morph 28.0.0 verified against registry), lane classification correct (standard, not fast). The two deviations (rename-regex `.vitest` infix-strip + SKIP_RED_GATE=1 additive edit) are both justified and create no downstream hazard. Downstream readiness for STORY-028-05/-06/-07 is good for the 80%-case promise of EPIC-028 narrative; advisory items in §7 cover the 20% edge cases so Developers can pre-flight grep before conversion. Test-glob bleed deferral to STORY-028-08 confirmed; -028-06 Developer flagged in Mid-Sprint Amendments to not chase the spurious test names.

No FAIL. No re-dispatch needed. Story ready for DevOps merge to sprint/S-28.
