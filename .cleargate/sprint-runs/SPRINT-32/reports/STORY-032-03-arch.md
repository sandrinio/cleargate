role: architect

# ARCH: PASS — STORY-032-03 Wiki-Build Integration (EPIC-032 capstone)

Post-flight architectural review of commits `a4fc3371` (integration) + `ad7bcccc` (flag-off regression test). v2 standard lane, LAST story of EPIC-032. Pre-gate 3/0, QA PASSED 5/5 (after qa_bounce #1). **PASS — clear to merge.**

---

## 1. Blueprint conformance — PASS

Reviewed against M2 plan STORY-032-03 section + flashcards. All blueprint rulings honored:

- **`--code-map` opt-in, OFF default:** `WikiBuildOptions.codeMap?: boolean` (wiki-build.ts:35); the entire pass is wrapped in `if (opts.codeMap)` (wiki-build.ts:131). Flag-absent path is byte-identical to today — verified by the dedicated regression test (code-map-flag-off.node.test.ts:86-108) asserting both no `wiki/code/` dir AND no `## Code Map` section.
- **Emits `wiki/code/<pkg>.md`, `kind: code-map`:** wiki-build.ts:147,166 writes per-package pages via `compilePage`; integration test Unit-3 asserts `kind: code-map` frontmatter.
- **Idempotent via 032-02 driftCheck:** wiki-build.ts:149-167 reads existing page → `parseCodeMapPage` → `await driftCheck(existing, gitRunner)` → skips rewrite when `!stale`. `driftCheck` is correctly `await`ed (it is async, page-schema.ts:158). Integration test Unit-2 pins identical-content-on-2nd-run.
- **`## Code Map` index section in BOTH paths:** the empty-delivery early-return branch (buildIndex, wiki-build.ts:243-263, `emptyCodeMapLines`) AND the normal path (wiki-build.ts:411-419, `codeMapLines`) both emit `## Code Map` gated on `codeMapResults.length > 0`. Both render `- [[code/<pkg>]] — <N> exported symbols`. This is the subtle dual-path requirement and it was met in both places.
- **symbolCount derived 032-03-side:** wiki-build.ts:141-144 sums `skeleton.exports.length` across modules — exactly the flashcard ruling (#code-map #wiki 2026-05-29: compilePage returns only a string; symbolCount is private BodySection state, so 032-03 must derive it). Dev did NOT expect a `{package,symbolCount}` return.
- **Consumes 032-01 extractor + 032-02 compile-page/page-schema, not re-stubbed:** imports `discoverPackages`/`extractSkeleton`/`compilePage`/`driftCheck`/`parseCodeMapPage` (wiki-build.ts:10-13). `compilePage(skeletons, { repoRoot, packageName, runner })` call (wiki-build.ts:161-165) matches the verified signature (compile-page.ts:73-77) exactly — passes `packageName` directly, NEVER `deriveRepo` (honors #code-map #admin #deriveRepo flashcard; `deriveRepo` would throw on the discovered `admin/` package).

## 2. architect.md merge-order (CRITICAL — second writer) — PASS

032-03 is the second and final writer of the shared `architect.md`. Verified clean coexistence with 033-03's already-merged SDR block:

- **032-03's edit is surgically scoped to the "Inspect existing code" Workflow step only.** The diff (a4fc3371) touches exactly ONE line — Workflow item 3 — appending the advisory code-map-first wording: *"For any in-scope package, read `.cleargate/wiki/code/<package>.md` structure first if it exists; code-map is advisory — verify with Read/Grep before citing symbols in the plan."* This is the "## Workflow" item 3 surface (canonical:27 region), edited by anchor text per the merge-order guard.
- **Did NOT touch/clobber 033-03's SDR block.** Canonical architect.md retains `## Sprint Design Review` at :82 with the full §2.1–2.5 structure intact (grep-confirmed); `architect-reader.md` + `architect-synth.md` (033-03 artifacts) present and untouched.
- **Did NOT reconcile the live↔canonical `## Autonomy Contract` divergence.** `## Autonomy Contract` remains at canonical:10 (the +8-offset source). The single-line edit landed at the anchor, not by line number, leaving the pre-existing divergence untouched — exactly per the merge-order guard sub-rule 2 and #mirror #parity flashcard.
- The two epics' architect.md edits coexist cleanly: Workflow:27 (032-03) and SDR:82 (033-03) are different sections; the +8 offset is preserved.

**Bonus:** the live `/.claude/agents/architect.md:23` already carries the identical edit (the live anchor, +8 below canonical). The Gate-4 live re-sync follow-up for this surface appears already done.

## 3. EPIC-032 end-to-end coherence — PASS (no seam gap)

With 032-01 + 032-02 + 032-03 merged, the code-map awareness layer is end-to-end coherent. The integration test (code-map-integration.red.node.test.ts) exercises the full chain on a real fixture package:

**discover** (`discoverPackages`, tsconfig-rooted, general-purpose) → **extract** (`extractSkeleton` → `ModuleSkeleton[]` with `exports`) → **compile** (`compilePage` with relative-path SHA keys, LANDMINE-B handled at compile-page.ts:83) → **page** (`kind: code-map`, Unit-3) → **drift** (`driftCheck`/`parseCodeMapPage`, idempotent, Unit-2) → **index** (`## Code Map` backlinks + symbol counts, Acceptance-2/3) → **architect consumption** (advisory read-step, Acceptance-4/5). No gap across the three stories.

## 4. scan.ts NOT modified — CORRECT, not a missed surface

`scan.ts` last changed in STORY-002-06 — untouched by this story. This is the correct call, not a missed surface. The M2 plan §3.2 step 3 + the "Excluded-suffix trap" gotcha (and Why-not-simpler §200) ruled that `.cleargate/wiki/` is in `scan.ts`'s `EXCLUDED_SUFFIXES`; making `scanRawItems` read the emitted pages would fight the exclusion (and pull in every wiki page). The implemented design instead passes the in-memory `CodeMapResult[]` directly to `buildIndex(items, codeMapResults)` (wiki-build.ts:174,234). This is precisely the in-memory-pass-to-buildIndex ruling — scan.ts correctly stays out of the change set.

## 5. ADR / boundary compliance — PASS

- **No new dependency:** no `package.json` touched in either commit (CR-037 N/A). symbolCount via `skeleton.exports.length`; SHA via existing `getGitSha`.
- **git-SHA drift (ADR 2026-04-19):** drift goes through 032-02's `driftCheck` → `getGitSha`; no content hashing introduced.
- **node:test:** both test files are `*.node.test.ts` under `cleargate-cli/test/wiki/` (the `test/**` glob path — honors #test-glob flashcard; not co-located in `src/`).
- **EPIC-027 boundary:** no PM-tool SDK imports in `wiki-build.ts` (grep-confirmed clean).
- **MANIFEST.json touch (a4fc3371):** only a regenerated `generated_at` timestamp + the architect.md `sha256` — the expected output of `npm run prebuild` after the canonical architect.md edit, NOT a hand-edit of scaffold structure. Correct dogfood-split behavior; not a forbidden-surface violation.

## Script Incidents

None — no `.cleargate/scripts/` invocations during this review.

---

**Verdict: ARCH: PASS.** Blueprint-conformant, the second-writer architect.md edit coexists cleanly with 033-03's SDR block without reconciling the pre-existing Autonomy-Contract divergence, the EPIC-032 discover→extract→compile→page→drift→index→consumption seam is end-to-end coherent, scan.ts is correctly untouched, and there are no ADR/boundary violations. Clear to merge as the EPIC-032 capstone.
