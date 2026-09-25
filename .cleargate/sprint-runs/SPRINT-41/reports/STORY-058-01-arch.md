# STORY-058-01 — Architect post-flight

ARCH: PASS

role: architect

Scope: cli `83dbc68..66ed73a` (non-scaffold), outer `b5a57b57..b478dfd4` (`CLAUDE.md`, `cleargate-planning/DEPRECATED.md`). Read-only in both repos. Scratch proofs ran under `/private/tmp/claude-501/cg5801/arch-build` and were deleted afterwards. The orchestrator stopped the review at the 25-minute budget, after both scratch runs had already finished. Two items are marked **not evaluated**.

## 1. Design conformance: PASS

- `src/lib/scaffold-layout.mjs` imports only `node:fs` and `node:path`. It adds no dependency and imports no command module.
- `EXCLUDE_DIRS` and `EXCLUDE_FILES` moved over verbatim, with the CR-089/092/096 comments intact.
- `REQUIRED_EMPTY_DIRS` is created unconditionally after every root is composed. Cross-root collision is rejected on file paths, and the error names the path.
- `.d.mts` matches the implementation: three `Set<string>` exports and `composePayload(roots: string[], dst: string): void`.
- tsconfig uses `moduleResolution: Bundler` and includes `src/**/*`. That means -02 can `import { composePayload } from '../lib/scaffold-layout.mjs'` in `src/commands/init.ts`. TS resolves the `.d.mts`, and tsup bundles the `.mjs` into `dist/cli.js`. No change is needed first.
- The shape works as-is for:
  - -02's `--from-source` temp view;
  - the compatibility payload;
  - -03/-10's `[core, claude, codex]`. Collision rejection there also enforces rule 4: a host root that ships a `.cleargate/**` path or `CLAUDE.md` owned elsewhere throws.
- Per-root manifests need no return value. -02 walks each root directly, so root-relative paths are already logical install paths. Adding a return value later would not break anything.
- Carry-forwards for -02. All are additive, and none is needed before merge:
  - **(a)** `composePayload` creates `REQUIRED_EMPTY_DIRS` on **every** call. If -02 builds the split view `templates/scaffold/hosts/<host>/` with `composePayload([hostRoot], view)`, each host view gets a stray empty `.cleargate/{sprint-runs,hook-log}`. Fix: add an optional third parameter, e.g. `opts = { ensureRequiredEmptyDirs: true }`, whose default keeps -01's behaviour. Alternatively, export a hygiene-only `copyRoot` helper. Empty dirs never reach a manifest or the npm tarball, so the damage stays inside the view.
  - **(b)** A dir-versus-file collision across roots throws a raw fs error (`EEXIST`/`EISDIR`/`ENOTDIR`) rather than the descriptive message. Symlinks are not rejected: a file symlink is copied as its target, and a dir symlink hits `EISDIR`. -02's layout validation owns both.
  - **(c)** Widening `roots` to `readonly string[]` later would not break callers.

## 2. Build safety at merge: PASS (proven in scratch)

cli `main` is at `45bde09`, which is the merge-base of `66ed73a`, so the post-merge tree equals `git archive 66ed73a`.

The scratch build used that archive with `node_modules` symlinked, no `templates/cleargate-planning` and no `dist`. A poisoned sibling `../cleargate-planning/` held a fake `MANIFEST.json` and `hooks/poison.sh`. `npm run build` exited 0:

- `[prebuild] … composed: 80 files`
- `[build-manifest] 74 files → …/templates/cleargate-planning/MANIFEST.json`
- `tsup onSuccess: MANIFEST.json copied to dist/MANIFEST.json`
- no unclassified-path warning

Results:
- **No sibling dependency.** The poisoned sibling's SHA-256 inventory was unchanged. No poison file reached the payload, and `poison` does not appear in `MANIFEST.json`.
- **Byte-identical payload.** Compared with `payload-baseline` (CR-123 BD2) and with the real checkout's current `templates/cleargate-planning`, `diff -rq --exclude=MANIFEST.json` is empty. Both trees have 100 entries, and the `stat %p` listing of files and dirs is identical. `MANIFEST.json` differs only on line 3, `generated_at`.
- **dist manifest comes from the new source.** `cmp dist/MANIFEST.json templates/cleargate-planning/MANIFEST.json` shows the files are byte-identical.
- **Nothing writes into outer `cleargate-planning/`.** The copier, the `build-manifest` default and the tsup source all resolve under the package root. No cli test calls `buildManifest()` with the default output; all calls pass `planningRoot`/`outputPath`. Rule 14's MANIFEST revert becomes a no-op.
- **Packaging.** `files` = `dist`, `templates`, … It includes neither `scaffold/` nor `src/`, which is correct, because only prebuild needs `scaffold-layout.mjs` today. `node scripts/verify-pack.mjs` passed: 115 files, payload 80, version 0.26.1. `prepublishOnly` (test → typecheck → build → verify-pack) is intact. No `pretest` script exists. Nothing on `main` breaks publish or verify-pack.
- Interim staleness, all acceptable because we don't publish mid-sprint (see Carry-forwards):
  - the frozen snapshot `cleargate-planning/MANIFEST.json` is no longer regenerated;
  - it is still read by `src/lib/manifest.ts:127` (dev fallback), `scripts/generate-changelog-diff.ts:222` and `test/scripts/test_version_bump_alignment.integration.node.test.ts:137`;
  - all three go stale at the next version bump, not before.
- Observation, harmless: the real checkout's `templates/cleargate-planning/` was regenerated at 12:52:32 today, after BD2 at 11:10, by a prebuild run I could not attribute. Its content equals the baseline (`diff -rq` empty), and `dist/` was untouched (11:10). BD overwrites it anyway.

## 3. Docs: PASS, with three stale sentences carried forward

- The CLEARGATE block is untouched. QA check 5 confirmed three-way byte equality, and I found no block lines in the diff.
- The *Dogfood split* rewrite is accurate about canonical roots, the composed payload, the gitignored payload label, the deprecated snapshot, and pin substitution versus drift. `DEPRECATED.md` is correct: it names both roots, freeze SHA `e911c38e…`, "do not edit", and no deletion at close.
- Sentences that are now false or misleading. None affects enforcement:
  1. The intro paragraph (outside the block) says *"Bootstrapped on itself … scaffold canonical at `cleargate-planning/`"*. The rewrite missed it, and it is now false.
  2. The re-sync paths say *"rebuild `dist` … then run `cleargate init` from the repo root (rewrites `/.claude/` from the npm payload)"*, and the last guardrail bullet says *"via `cleargate init`"*. Bare `cleargate` is the global 0.26.1 install (rule 18). Its payload is the published package, not the composed `cleargate-cli/templates/cleargate-planning`. The correct path is `node cleargate-cli/dist/cli.js init`, after BD. `resolveDefaultPayloadDir`, `init.ts:147-152`, resolves to `<cli>/templates/cleargate-planning`.
  3. The deprecated-snapshot bullet says it stays until *"BUG-085's D4 re-declarations and a handful of outer shell tests"* stop reading it. The list is incomplete. It omits the ~85 cli tests and the `manifest.ts`/changelog/check scripts, all owned by -02, and `drift-check.ts:143-160` plus the doctor text, owned by BUG-085.
- The `copy-payload.ts:54` cite is stale (SKIP_FILES is at `:63`). That was true before this story too; noting it only.

## 4. Rule-16 post-merge risk: none found

Method: I built two post-merge-shape sandboxes. Each was an outer `git archive` with the built cli (`66ed73a`) nested at `cleargate-cli/`:
- **before** = outer `b5a57b57`;
- **after** = outer `b478dfd4`.

In both I ran every non-integration cli test that resolves `CLI_ROOT/..` or honours `CLEARGATE_META_ROOT` and mentions `cleargate-planning` or `CLAUDE.md`. That is 50 files, run serially, with `CLEARGATE_META_ROOT` unset.

| Sandbox | Tests | Pass | Fail | Skipped |
|---|---|---|---|---|
| before | 775 | 751 | 21 | 3 |
| after | 775 | 753 | 19 | 3 |

- Only failing before: the story's own scenario-5 reds, "Dogfood split section names both new scaffold roots" and "DEPRECATED.md exists". They go green on the outer merge, as designed.
- Only failing after: **none**.
- The other 19 failures are the same set in both sandboxes. They come from the sandbox lacking `.git` and similar causes, and are independent of this diff.

Named MAIN readers that change behaviour on the outer merge:
- `test/docs/dogfood-split-integrity`, `claude-md-block-leads-relocation.red` (heading order and a ≥90-line floor), `template-claude-md`, `claude-md-anchoring.red` and `no-execution-mode-vocabulary.red`: all green after.
- Snapshot-as-payload tests (`init.node.test.ts:132`, `init-participant:22`, `init-gitignore-expansion:21`, `test/init/claude-md-block-leads.red:35`) now copy `DEPRECATED.md` into each fixture root. `copyPayload` walks every top-level file except `SKIP_FILES` (`copy-payload.ts:63,125`). No assertion notices it. The effect disappears when -02 repoints them.
- `init-from-source.node.test.ts:128` resolves 4 levels up (`…/Dev/cleargate-planning`, which does not exist), so the diff does not affect it.
- Integration files were not in scope for the default suite. `test/e2e/dogfood-install.integration` installs `--from-source` from the snapshot and is already failing, per QA.

## 5. D4 readiness (M1.md 340–361)

All cited targets exist in `66ed73a`:
- 9 hooks under `scaffold/hosts/claude/.claude/hooks/`;
- `settings.json`;
- `skills/{sprint-execution,flashcard}/SKILL.md`;
- `agents/developer.md`;
- `scaffold/core/.cleargate/knowledge/cleargate-enforcement.md`.

`drift-check.ts` still joins `cwd/cleargate-planning` in the 140–162 window.

Corrections:
1. **Preamble.** "Every item below reads canonical through `test/helpers/scaffold-roots.ts` (from -02)" is a sequencing precondition: -02 must merge before any D4 item's worktree is cut. The D4 *text* commits can land right after -01, but no D4 item may start before -02.
2. **-11.** "The `developer.md` and `skills/flashcard/SKILL.md` reads → `scaffold/hosts/claude`" should give the full paths:
   - `cleargate-cli/scaffold/hosts/claude/.claude/agents/developer.md`
   - `cleargate-cli/scaffold/hosts/claude/.claude/skills/flashcard/SKILL.md`

   The `.claude/` segment is easy to drop.
3. **BUG-085.** "compose from `cwd/cleargate-cli/scaffold/{core,hosts/claude}`" should name the reuse: `composePayload` from `cleargate-cli/src/lib/scaffold-layout.mjs`. It should also require a unique temp dir cleaned in `finally`. Alternatively, compare per root without composing: live `.claude/**` against `hosts/claude/.claude/**`, and live `.cleargate/**` against `core/.cleargate/**`. That needs no temp dir.
4. **BUG-085.** Add the three doc fixes from §3 to its CLAUDE.md scope. It already "rebases the CLAUDE.md extension onto -01's rewrite". Alternatively, the orchestrator folds fixes 1 and 3 into the D4 chore commit.
5. **Not evaluated:** the `drift-check.ts:143-160` and `doctor.ts:268-271` line numbers themselves, the -12 `:104`/`:269` anchors, and the -13 `pre-edit-gate.sh:221` cite. -01 did not modify any of those files, so the cites cannot have shifted because of this story.

## DevOps merge notes (rule 15)

1. **Outer first:** merge `story/STORY-058-01` (`b478dfd4`) into `sprint/S-41`. The merge commit may use `SKIP_SURFACE_GATE=1` (rule 17).
2. **Then cli:** merge `66ed73a` into cli `main` (`45bde09`, ff-eligible; use the `merge(story/STORY-058-01): …` precedent). Leave the pre-existing untracked `cleargate-0.25.0.tgz` alone.
   - Order matters: `scaffold-relocation.red.node.test.ts` scenario 5 reads MAIN, so it is red until the outer half lands.
3. **Full suite:** `npm test` in cli `main`.
   - Expect the `45bde09` baseline plus 15 new tests (`scaffold-relocation.red.node.test.ts`), with 0 fail. The integration red file is excluded from the default suite.
   - Revert `.cleargate/delivery` per rule 14. The MANIFEST half of that revert is now a no-op.
   - Assert `git -C /Users/ssuladze/Documents/Dev/ClearGate status --porcelain -- cleargate-planning` is empty.
4. **BD:** `npm run build` in cli `main`.
   - Expected log lines: `[prebuild] cleargate-planning payload composed: 80 files`, `[build-manifest] 74 files → …/templates/cleargate-planning/MANIFEST.json`, `tsup onSuccess: MANIFEST.json copied to dist/MANIFEST.json`, and no unclassified warning.
   - Then assert, with `B=/private/tmp/claude-501/cg5801/payload-baseline` (kept) and `T=cleargate-cli/templates/cleargate-planning`:
     - `diff -rq --exclude=MANIFEST.json $B $T` → empty.
     - The mode listings match: `(cd X && find . -exec stat -f '%p %N' {} \; | sort -k2)` is identical for both, with 100 entries each.
     - `diff <(sed 3d $B/MANIFEST.json) <(sed 3d $T/MANIFEST.json)` → empty. Only `generated_at` differs; `cleargate_version` is 0.26.1 with 74 entries.
     - `cmp cleargate-cli/dist/MANIFEST.json $T/MANIFEST.json` → identical.
     - `$T/.cleargate/sprint-runs` and `$T/.cleargate/hook-log` exist and are empty.
     - Outer `git status --porcelain -- cleargate-planning` is still empty.
     - `node cleargate-cli/dist/cli.js --version` → `0.26.1`.
     - Optional: `node scripts/verify-pack.mjs` → `OK — 115 files, payload 80`. It is a dry-run and safe.
5. **No live re-sync.** The relocation preserves bytes.
6. **Orchestrator (plan lines 224–230):**
   - Add the Rule-10 amendment (`cleargate-cli/scaffold/{core,hosts/claude}/**`).
   - Commit D4 with the §5 corrections.
   - Add `composePayload`/`EXCLUDE_DIRS`/`EXCLUDE_FILES`/`REQUIRED_EMPTY_DIRS` from `cleargate-cli/src/lib/scaffold-layout.mjs` to *Adjacent Implementations*.

## Carry-forwards

| # | Item | Owner |
|---|---|---|
| 1 | Add an opt-out for `REQUIRED_EMPTY_DIRS`, e.g. `composePayload(roots, dst, { ensureRequiredEmptyDirs })`, before host-only split views are built | -02 |
| 2 | Repoint the readers of the frozen snapshot MANIFEST: `src/lib/manifest.ts:127`, `scripts/generate-changelog-diff.ts:222`, **and `test/scripts/test_version_bump_alignment.integration.node.test.ts:137`** (the last is not on -02's explicit list) | -02 |
| 3 | Snapshot-as-`payloadDir` tests now install `DEPRECATED.md` into fixtures; the repoint to the composed payload removes this | -02 |
| 4 | Descriptive errors for dir/file collisions and symlinks | -02 layout validation |
| 5 | CLAUDE.md: fix the intro "scaffold canonical at `cleargate-planning/`", name `node cleargate-cli/dist/cli.js init` in both re-sync sentences, complete the snapshot-reader list | BUG-085, or the orchestrator's D4 chore |
| 6 | D4 corrections 1–4 above | Orchestrator (D4 commit) |

## Script Incidents

None. `npm run build`, `verify-pack` and the 50-file runs ran directly, only inside the scratch copies.

flashcards_flagged:
  - "2026-09-25 · #scaffold #compose · composePayload makes REQUIRED_EMPTY_DIRS on every call; a host-only view gets a stray empty .cleargate/ — add opt-out"
  - "2026-09-25 · #cli #manifest · After 058-01 nothing regenerates cleargate-planning/MANIFEST.json; readers of it go stale at next version bump"
