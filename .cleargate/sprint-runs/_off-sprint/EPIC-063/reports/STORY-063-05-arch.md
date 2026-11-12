# STORY-063-05 Architect post-flight

role: architect

**Mode:** post-flight. The pre-gate scan cannot see cli branches, so the safeguard requires this review.
**Commits:** Dev `0a6d3ae`, QA-Red `1a84b1e`, base `9c89d49` on `story/STORY-063-05` (cleargate-cli).
**Plan:** `.cleargate/sprint-runs/_off-sprint/EPIC-063/plans/M1.md`, sections C5, STORY-063-05 and G14/G16.

## Verdict: ARCH: PASS

## Checks

### 1. C5 contracts match exactly: PASS
- `src/lib/sprint-run-state.ts` exports the following, character-for-character as C5.2 specifies:
  - `RawStoryState` (the same four optional fields)
  - `PlanEntry`
  - `SprintRunState { status: 'ok' | 'missing' | 'malformed'; sprintStatus; stories }`
  - `readSprintRunState(runDir: string): SprintRunState`
  - `parseSprintPlanTable(cwd: string, sprintId: string): Map<string, PlanEntry>`
- `splitRow` and `isSeparatorRow` stay private.
- C5.1: `compile(state: RawItem[], repoRoot: string, templateDir?: string): string` (`active-sprint.ts:19`).
- Signature-change risk: both arguments are strings, so an old 2-argument call such as `compile(items, templateDir)` would still typecheck. Every call site has been updated. A `git grep` at `0a6d3ae` finds only `wiki-build.ts:291`, `wiki-ingest.ts:584` and the red test.
- `tsc --noEmit` is clean (exit 0).

### 2. `collect.ts` extraction is verbatim with no behaviour change: PASS
- I compared the code mechanically. The moved `splitRow`, `isSeparatorRow` and `parsePlanTable` are 83 lines on each side. The only difference is the signature line, which adds `export` and renames the function to `parseSprintPlanTable`.
- `readStateJson` → `readSprintRunState`: the only changes are the split try (read, then parse) and the `status` field on the four return paths. `sprintStatus` and `stories` have the same values on every path.
- `collect.ts:484-485` destructures only `{ sprintStatus, stories }`, so the dashboard output cannot change.
- No duplicate parser remains in `src/`:
  - `git grep` finds `splitRow`/`isSeparatorRow` and the `story\s*id` header match only in `sprint-run-state.ts`.
  - The only reader that parses the `stories` map from state.json is `sprint-run-state.ts:33`.
- Imports left in `collect.ts` are all still used: `extractWorkItemIds` at `:372` and `findSprintPlanFile` at `:495`.
- Tests: `test/dashboard/{collect,cr097,cr101,cr102}.node.test.ts` give 77/77 pass, unchanged.

### 3. Sentinel read through `resolveActiveSprint`; stale sentinel handled: PASS
- `active-sprint.ts` reads the sentinel only through `resolveActiveSprint(repoRoot)`, and the `.active` path is never named in the new code. Both new modules only read files: no git, no network.
- Stale sentinel: `activeId` is null, `no_active` renders, and `stale_warning: [{ id }]` produces exactly one line.
- That warning line matches doctor's BUG-036 wording (`doctor.ts:695`).
- `sprint-run-state.ts` imports `commands/sprint-file-locate.ts`, a leaf module (it imports only `lib/project-root`). There is no import cycle, and `lib/scaffold-source.ts:24` already sets the lib→commands precedent.

### 4. Recently Completed ordering: PASS
- Keys are computed in this order:
  1. `listSprintReports(repoRoot)`, then `parseFrontmatter(...).fm.generated_at` per report;
  2. fall back to sprint `updated_at`;
  3. fall back to `null`, which sorts last.
- Ties break on `Number(numericStem(id))` descending.
- Abandoned sprints are excluded, and the list takes the top 3.
- Scratch check: three reports with an identical `generated_at`, for SPRINT-09, SPRINT-11 and SPRINT-100, render as 100 → 11 → 09. A lexical sort would give 11 → 100 → 09.
- Comparing time strings lexically is safe for the data on disk:
  - All 22 report `generated_at` values are UTC `Z` ISO strings.
  - `parseFrontmatter` uses CORE_SCHEMA, so timestamps stay strings and never become `Date` objects.
- Read-only render against the outer repo, with the `.active` sentinel empty:
  - Current: none.
  - Planned: 18, 31, 37, 42, 43.
  - Recently Completed: 44, 41, 40.
  - This matches the §R step 8 expectation exactly.

### 5. Template: PASS
- `templates/synthesis/active-sprint.md` is tracked (`git ls-tree`), and `package.json` `files` contains `templates`.
- The three headings are unchanged.
- The stale-warning text is word-for-word the plan's text.
- `{{active_line}}` and `{{item_lines}}` are rendered in TS beforehand, so there are no nested sections. This follows the `render.ts` contract.
- Blank lines between rendered blocks are pre-existing renderer behaviour and the same in all four synthesis templates.

### 6. `cwd` threading and G14: PASS
- `writeSynthesisPage(page, items, wikiRoot, templateDir, cwd)`. The caller `recompileSynthesis` passes its own `cwd`, which is `resolveProjectRootForFile(rawPath)` (`wiki-ingest.ts:91`).
- Build passes its `cwd`, which is `resolveProjectRoot` (`wiki-build.ts:64`). Both are the repo root.
- `BUCKET_SYNTHESIS_MAP` (`wiki-ingest.ts:517-528`) has no diff hunk.
- `wiki-ingest-synthesis-parity.red` plus the red sentinel suite: 44/44 pass.

### 7. No new dependencies, no unrelated edits: PASS (one minor note)
- `package.json` and `package-lock.json` are unchanged.
- `check-no-inline-id-regex` passes.
- Minor note: the comment in `resolveDefaultTemplateDir` (`active-sprint.ts:95-97`) was shortened from 12 lines to 2. The removed text was stale: it described a CR-076-retired `onSuccess` template copy and vitest. The change is in a touched function and is accurate, so I accept it.

## Advisory (non-blocking; for the orchestrator)
- **A1: `roadmap.md` still uses the retired rule.** `roadmap.ts:30-35` still sorts sprints by `activated_at`/`completed_at`. After this story, `roadmap.md` "In-Flight Sprints" can list SPRINT-14/15/28 while `active-sprint.md` says no sprint is active.
  - This is outside 05's literal scope; R1 covers only the active-sprint page.
  - Route it as a follow-up item, or add it to M2's 063-11 brief together with G14.
- **A2: stale comment in `collect.ts`.** The header comment at `collect.ts:8-11` still says `active-sprint.ts` "scans item frontmatter for a different purpose". That is false now. The section header `// ─── state.json ───` (`:138`) is also left with no content under it. Both are cosmetic; the next item that touches `collect.ts` should fix them.
- **A3: any read error is reported as `missing`.** `readSprintRunState` returns `'missing'` for any read error, not only ENOENT, so EACCES or EISDIR render as "state.json missing". The plan only specified ENOENT. This does not affect the M1 scenarios. M2 (063-11) should not rely on `missing` meaning ENOENT only.

## Script Incidents
None. Every run went through `run_script.sh` and exited 0: `tsc --noEmit`, the inline-ID-regex check, and two `node --test` runs. The cli working tree is still clean.

flashcards_flagged:
- `2026-11-12 · #wiki #synthesis · roadmap.ts still partitions sprints by activated_at/completed_at; active-sprint uses the .active sentinel — pages can disagree.`
