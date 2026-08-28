# BUG-043 — Architect post-flight

role: architect · wave 8 · M3 · reviewing `cleargate-cli` `story/BUG-043` @ `1e01ea0`

```
POSTFLIGHT: pass

SEVERITY_SENTENCES:
  Sentence 1 — "BUG-043's two defects had unequal reach: the greedy-match defect that destroyed
  user prose was LIVE and reachable through `cleargate init`, and is now NARROWED — a
  `<!-- CLEARGATE:END -->` quoted inline in prose below the block no longer extends the match —
  but not closed, because a stray END alone on its own line still does, a residual that ships as
  a titled known-limitation test and is now tracked as BUG-061."
  Sentence 2 — "The full-file-overwrite defect on `upgrade`'s take-theirs branch was LATENT, never
  reachable: `CLAUDE.md` is in `INTENTIONALLY_UNTRACKED` (`build-manifest.ts:334`) and carries zero
  rows in the current 70-entry payload manifest, the 65-entry install snapshot, and every historical
  commit of `MANIFEST.json`, so replacing both destructive routes with a named refusal removes a
  landmine that arms the moment anyone adds a `CLAUDE.md` manifest row, rather than stopping data
  loss anyone has observed."
  Re-verified independently for this report: manifest 70/0, install snapshot 65/0,
  `INTENTIONALLY_UNTRACKED` contains `'CLAUDE.md'` at `scripts/build-manifest.ts:334`, and
  `test/scripts/build-manifest.node.test.ts:258-261` pins `classifyPath('CLAUDE.md') === null`.

DEFECT_B_LIMITATION: NOT recorded anywhere a user would find it. Grepped `cleargate-cli/README.md`,
  `cleargate-cli/CHANGELOG.md`, `cleargate-planning/CLAUDE.md` and `.cleargate/knowledge/` — zero
  hits. It exists in exactly two places, both engineer-only: the fixture comment at
  `test/lib/claude-md-anchoring.red.node.test.ts:80-87` and the test title at `:157`. Two carriers
  are needed and neither is optional:
    (a) RELEASE NOTE. `cleargate-cli/CHANGELOG.md` is read by users AND printed by `cleargate
        upgrade` (0.24.2 fixed exactly that resolver). BUG-043's two commits touch neither
        `CHANGELOG.md` nor `package.json`, and the repo's own convention puts both in the fix
        commit — `8d1524a` (the BUG-041 fix) carried a 22-line CHANGELOG hunk and a version bump.
        This is a Gate-4 release obligation, NOT a Developer kick-back: the M3 plan never names
        `CHANGELOG.md` for either M3 item, so the Developer followed the plan exactly.
    (b) FOLLOW-UP ITEM — **filed as BUG-061**. Investigating (a) surfaced a fact that outranks the
        documentation question: the recorded rationale for retaining greedy is now measurably
        FALSE. See GRAMMAR_UNIFICATION's sibling finding below and FINDINGS 2.
  BUG-043's own §1 should NOT carry it. §1 describes the defect as found; appending a
  post-fix residual there rewrites the bug's history. The residual is forward-looking work.

GRAMMAR_UNIFICATION: WARRANTED. No existing item — grepped `BLOCK_REGEX`, `ROOT_BLOCK_REGEX`,
  `CLEARGATE:START` and "unify" across `pending-sync/` and `archive/`; the only hits are BUG-043,
  CR-105 and SPRINT-39 itself. **Filed as CR-113 — "One bounded-marker grammar"**, gate-green 9/9
  under `node cleargate-cli/dist/cli.js gate check`, `approved: false`, 🟡 (five of six criteria
  met literally; the sixth is human approval).
  The census changed the CR's shape and is the reason it is worth filing rather than noting:
  there are **THREE** bounded-marker grammars in `cleargate-cli/src`, not two, and the third is
  not equivalent — `src/init/root-gitignore.ts:41` `ROOT_BLOCK_REGEX` is **unanchored and greedy**,
  the pre-BUG-043 shape, used at `:107` (`test`) and `:108` (`replace`), the identical
  test-then-replace pair BUG-043 hardened. It writes `.gitignore` in every user repo on `cleargate
  init`, its only test file (`test/commands/init-root-gitignore.node.test.ts`) exercises no quoted
  or indented marker, and its own comment at `:36-40` justifies the greedy shape by saying it
  *"mirrors inject-claude-md's rationale"* — a precedent BUG-043 superseded on 2026-08-28.
  The shared-corpus equivalence test (N7) is a detector, not a fix, and it sees two of the three.

CR_105_TARGET: INTACT, latent, not gutted. Read `src/commands/upgrade.ts:340-389` in its committed
  state. `isClaudeMd(entry.path)` (`:364`, helper at `:211`) and the enclosing `if (choice === 't')`
  are structurally unchanged; only the try/catch body was rewritten. Both destructive routes are
  gone; no path inside the branch assigns `mergedContent = theirs`.
  **What CR-105 must do to it, precisely:** the branch's single write is now
  `mergedContent = writeBlock(ours, theirBlock);` at `upgrade.ts:381`. That is an IN-PLACE swap —
  `writeBlock` replaces the body between the existing markers and never moves them. CR-105 must
  replace that ONE line with the relocate contract, reusing `injectClaudeMd` rather than
  re-deriving it: `writeBlock` takes a body, `injectClaudeMd` takes a full block, so the call
  becomes `injectClaudeMd(ours, CLEARGATE_START + theirBlock + CLEARGATE_END)` or, cleaner,
  `injectClaudeMd(ours, extractBlock(theirs))`. Do not touch the two refusal returns at `:371-377`
  and `:378-380`, do not touch the `catch` at `:382-388`, do not touch the `isClaudeMd` guard. Per
  ORCHESTRATOR RULING 2 this is latent defense-in-depth — it delivers nothing observable today and
  must be recorded as such, not reported as a shipped behaviour change.

CR_105_RED_SET: RE-MEASURED on top of shipped BUG-043; nothing inherited. Out-of-tree mirror of
  `cleargate-cli` @ `1e01ea0` under a symlinked meta-root, CR-105's `injectClaudeMd` body applied
  per the M3 plan's verbatim source change.
    control  (BUG-043 as shipped) : tests 138 · suites 52 · pass 138 · fail 0 · skipped 0
    CR-105 cli half applied       : tests 138 · suites 52 · pass 137 · fail 1 · skipped 0
    + root CLAUDE.md relocated    : tests 215 (15 files) · pass 212 · fail 1 · skipped 2
  **Expected red set for wave 9 is exactly ONE existing test:**
    `test/commands/init.node.test.ts` — "scenario 3: existing CLAUDE.md without markers — appends
    bounded block, preserves user content", at `:299-319`, failing on `assert.ok(startIdx > userIdx)`
    at `:314`.
  Nothing else moves. Verified across all 15 default-tier files that mention `CLAUDE.md`, and the
  census is complete rather than sampled: `test/lib/claude-md-anchoring.red.node.test.ts` is the
  ONLY test file in the tree that imports `injectClaudeMd` or `extractBlock`
  (`grep -rln "injectClaudeMd\|extractBlock" test/`), so no unexamined file can observe the change.
  The 2 skips are `git ls-files` doc-truth tests that skip because the mirror has no `.git` — a
  mirror artefact; they run in the real checkout.
  A separate 12-file batch (README/readiness-predicates/doc-truth) showed 9 failures in the mirror
  under BOTH the patched and unpatched control, byte-identical failing sets. Mirror-root artefacts,
  invariant under CR-105, not signal — recorded so wave-9's QA is not surprised by them.
  Not in the red SET but authored fresh by wave-9 QA-Red: the 10 new scenarios in the M3 plan's
  CR-105 table, plus a scenario for the §0.5 Q1 relocation notice (see CR_105_S3).

R4_HELD: YES. The four wave-8 tests TPV named as at-risk are green under CR-105:
  - "D: injectClaudeMd does not splice into the sentence" — green
  - the `D`, `F`, `G` shared-corpus equivalence rows — green (the whole describe block passes)
  Read the shipped file to confirm the mechanism, not just the result: the equivalence loop at
  `test/lib/claude-md-anchoring.red.node.test.ts:258` compares `hasAnchoredBlock` against
  `extractBlock` — grammar, not output shape — and the D-inject test at `:109` asserts
  `countAnchoredLines(result, ...) === 1` rather than an append-shape string equality (`:122-123`).
  R4's rewrite is present and is what holds.
  **One residue R4 did not cover:** the D-inject test's TITLE still reads "— appends instead, word
  \"and\" survives". Under CR-105 it prepends. Assertion green, prose stale. Retitle in wave 9;
  same class as `init.node.test.ts` scenario 4. See FINDINGS 4.

CR_105_S3: STILL MISSING FIVE THINGS after your amendment. Re-read CR-105 `§3` in full.
  1. `cleargate-cli/test/commands/init.node.test.ts` scenario 3 — **NOT in §3.** `§3` lists only
     "New `*.node.test.ts` under `cleargate-cli/test/`". This is the one existing test CR-105 reds,
     now re-measured. Its real location is `:299-319`, not the `:294-314` the M3 plan carries, and
     the `startIdx > userIdx` assertion is at `:314`.
  2. `cleargate-cli/test/commands/init.node.test.ts` scenario 4 — **NOT in §3.** At `:323-346`
     (plan says `:317-341`). Stays green; its title "preserves content above and below" goes stale.
  3. `cleargate-cli/test/lib/claude-md-anchoring.red.node.test.ts:109` — **NOT in §3, and new since
     the plan was written.** Title says "appends instead". Retitle-only, no assertion change.
  4. The §0.5 Q1 relocation notice — **has a site but no assignment, and there is an active
     contradiction that will silently drop it.** `§3` lists `src/commands/init.ts` as "the call site
     that must adopt the new contract"; the M3 plan measured that claim false and says, in bold,
     "**`init.ts` needs no change.**" A Developer following the plan will not open `init.ts`, and the
     notice — a recorded human decision — never ships. `init.ts` must stay in `§3` with its
     justification REPLACED: the only viable site is the stdout branch at `init.ts:390-396`, which
     today prints `Updated CLAUDE.md (bounded block injected/replaced)`. Read it directly; the
     surrounding call site (`:371-388`) genuinely needs nothing.
  5. `cleargate-cli/CHANGELOG.md` — **NOT in §3.** CR-105 relocates the block once in every
     downstream install. That is the definition of a release note.
  Also stale, all from BUG-043 shifting `inject-claude-md.ts` by four lines: `§3`'s amendment cites
  `inject-claude-md.ts:10` (docstring) — now `:11`; `## Existing Surfaces` cites `:41`
  (`injectClaudeMd`) — now `:45`; `§1` cites `:50` (the append line) — now `:57`; `context_source`
  cites `:41-52` — now `:45-58`. The M3 plan's own "Source change, verbatim" cites `:46-52` and
  `:7-10`; real ranges are `:51-57` and `:8-11`.
  Unchanged and still correct: `§2` bullet 5 and `§4`'s manifest assertion remain unsatisfiable in
  the CR body (N5 supplies the replacement). A Developer reading `§2` directly will still chase it.

CR_105_RED_BASELINE: AUTHORABLE FOR BOTH HALVES. The M3 plan's "no red baseline is authorable for
  the outer commit; there is nothing to write" is WRONG, and I measured both replacement assertions
  red on the current tree:
    root CLAUDE.md first non-empty line === '<!-- CLEARGATE:START -->'
      -> "# ClearGate Meta-Repo"  => FALSE (red)
    cleargate-planning/CLAUDE.md line 3 contains no "appends"
      -> "…If one already exists, init **appends** the bounded block…"  => contains (red)
  The precedent is established in this repo, not invented: `test/scripts/template-claude-md.node.test.ts:16`
  resolves a module-relative `REPO_ROOT` and reads BOTH `CLAUDE.md` files; `test/scaffold/
  enforcement-doc-coherence.node.test.ts:45-51` does the same with a `CLEARGATE_META_ROOT` env
  override; `test/docs/dogfood-split-integrity.node.test.ts:96-103` asserts phrase presence in root
  `CLAUDE.md`. A doc-truth red file for the outer contract belongs in the cli test tree and lands in
  the **cli** commit; the outer commit still carries no test files, which is what the plan was
  reaching for and mis-stated.
  So: cli half — the 10 scenarios in the M3 plan's table, plus one for the Q1 notice. Outer half —
  three assertions (root-leads, canonical `:3` free of "appends", `block-equal` between the two
  trees, which is green today and must STAY green). **Dispatch QA-Red for wave 9 with both halves.**

SCOPE: clean. `git diff --name-only 9e46ce5..1e01ea0` = 6 files, every one a declared surface:
  `src/lib/claude-md-surgery.ts`, `src/init/inject-claude-md.ts`, `src/commands/upgrade.ts` (§4
  Modify), `test/lib/claude-md-anchoring.red.node.test.ts` + `test/commands/upgrade-claude-md.red.node.test.ts`
  (§4 "New `*.node.test.ts`"), `test/commands/init.node.test.ts` (§4 AMENDMENT row 3, R11).
  Two declared-but-untouched files are correctly untouched: `src/lib/drift-check.ts` (amendment
  row 1 — plan Question 1 measured it a fix requiring no edit) and
  `test/lib/claude-md-surgery.node.test.ts` (amendment row 2 — BUG-060's surface, kick-back 8).
  No new dependency: `package.json` untouched. No schema drift: no template, no frontmatter, no
  `readiness-gates.md` criterion, no `## ` heading anywhere, so no `section(N)` index moves.
  No outer-repo file touched by either commit.

REPRODUCED:
  - Manifest census, from scratch: committed `cleargate-planning/MANIFEST.json` @ HEAD = 70 entries
    / 0 `CLAUDE.md` rows; `.cleargate/.install-manifest.json` = 65 / 0. Read
    `scripts/build-manifest.ts:333-341` and `test/scripts/build-manifest.node.test.ts:258-261`.
  - Full `git diff c013589..1e01ea0 -- src/` read line by line: three files, anchored regex in both
    modules, `hasAnchoredBlock` export, `NOT_ANCHORED` third guard added AFTER both `includes`
    guards in `writeBlock` (`:46`) and `removeBlock` (`:63`), both `upgrade` overwrite routes
    replaced by refusals. No normalisation on any write path.
  - Out-of-tree mirror @ `1e01ea0`, three states measured: control 138/138/0/0; CR-105 cli half
    138/137/1/0; CR-105 cli half + relocated root `CLAUDE.md` across 15 files 215/212/1/2. Control
    for the 12-file doc-truth batch run twice (patched / unpatched) with byte-identical failing sets.
  - R6 reproduced independently: greedy vs non-greedy under the shipped anchors returns an identical
    11762-char body on BOTH real `CLAUDE.md` files; fixture H returns
    `"\nscaffold\n<!-- CLEARGATE:END -->\n\nuser line one\n"` greedy vs `"\nscaffold\n"` non-greedy.
  - Two-block case measured (NEW — not in any existing corpus): greedy `injectClaudeMd` destroys the
    intervening line `mid` AND the second block; non-greedy loses nothing.
  - Outer-half red assertions measured on the current tree (both red); `block-equal` measured true
    at 11808 chars including markers = 11762 body + 46 marker chars, consistent with the shipped pin.
  - `src/commands/upgrade.ts:340-389`, `src/init/inject-claude-md.ts` (whole file),
    `src/init/root-gitignore.ts:31-41,107-108`, `src/commands/init.ts:370-396`,
    `test/commands/init.node.test.ts:294-346` read in committed state, not via diff.
  - Repo-wide census: `grep -rln "injectClaudeMd\|extractBlock" test/` = 1 file;
    `grep -rln "CLAUDE\.md" test/` = 31 paths, 15 of them default-tier test files, all measured.
  - Gate checks via `node cleargate-cli/dist/cli.js gate check` (never the poisoned global binary):
    CR-113 9/9, BUG-061 7/7.

FINDINGS:
  1. No CHANGELOG entry and no version bump on either BUG-043 commit. Repo convention puts both in
     the fix commit (`8d1524a`, the BUG-041 fix: 22-line CHANGELOG hunk + `package.json`). NOT a
     kick-back — the M3 plan names `CHANGELOG.md` for neither M3 item. Gate-4 release obligation;
     the severity qualification (A1) and the residual (A2) both land there.
  2. The greedy rationale in `src/lib/claude-md-surgery.ts:4-6` is now FALSE and still shipped
     verbatim: *"Non-greedy would stop at the first inline END marker in prose, cutting off the real
     block."* True of the unanchored pattern, false of the anchored one — measured, identical 11762
     body either way. It sits three lines above the constant it justifies. `src/init/inject-claude-md.ts:14-18`
     carries the same claim. **BUG-061 filed** (7/7, `approved: false`, 🟡) covering both residuals
     and the stale comment. Not a wave-8 kick-back: reversing a recorded human decision was
     correctly out of scope for the Developer.
  3. A third bounded-marker grammar exists and is unanchored: `src/init/root-gitignore.ts:41`,
     live in every user repo via `cleargate init`, untested for quoted or indented markers.
     **CR-113 filed** (9/9, `approved: false`, 🟡).
  4. Three stale test titles that CR-105 must retitle in the same commit that reds them:
     `init.node.test.ts:299` ("appends bounded block"), `:323` ("above and below"),
     `claude-md-anchoring.red.node.test.ts:109` ("appends instead"). The third is new since the
     M3 plan's blast-radius table was written.
  5. The `init.ts` contradiction (CR_105_S3 item 4) is the highest-risk item in the wave-9 handoff:
     a recorded human decision silently dies in the gap between `§3` and the plan's bold correction.
  6. **TPV R13 was half wrong, and the wrong half would corrupt a correct citation.** Only ONE of
     its two claims holds. (a) REAL: `upgrade-claude-md.red.node.test.ts:10` cites
     `upgrade.ts:364-378`; the real post-fix range is `try` at `:368` through `catch` closing
     `:388`. (b) **NOT REAL:** R13 says the M3 plan's gotcha citation `uninstall.ts:437-441` is
     wrong and that `removeBlock` is at `:436` inside a `try` at `:435`. Read directly — `try` is
     at `:436`, `removeBlock` at **`:437`**, `writeAtomic` `:438`, the `removedPaths.push` `:439`,
     `catch` `:440-442`. R13 shifted the whole block up one line; the plan's original `:437-441`
     was CORRECT. `uninstall.ts` was untouched by BUG-043, so nothing moved. Fix (a) only, in wave
     9's Developer (it has the anchoring file open anyway for finding 4) or at DevOps merge; leave
     (b) alone. The Developer deferred both CORRECTLY — its dispatch forbade QA-Red's files and it
     has no mandate over `plans/M3.md`. Do not re-dispatch wave 8 for one comment.
  7. Nine mirror-only failures in the doc-truth batch (`readme-qa-doc-truth-043-06.red`,
     `readiness-predicates`). Invariant under CR-105 — measured in both directions with identical
     failing sets. Named here so wave-9 QA does not mistake them for CR-105 regressions if it
     reproduces my method. They do NOT appear in the real checkout's 2557/2555/1/1.
```

## Script Incidents

None. No script was invoked through `run_script.sh` by this dispatch. All measurement was direct
execution of `npx tsx`, `node`, `git` and `command grep`, read-only against the real tree and
read-write only inside an out-of-tree scratch mirror.

## Files written by this dispatch (all uncommitted, outer main checkout)

- `.cleargate/sprint-runs/SPRINT-39/BUG-043-arch-postflight.md` — this report
- `.cleargate/sprint-runs/SPRINT-39/plans/M3.md` — appended POST-FLIGHT RULING block
- `.cleargate/delivery/pending-sync/CR-113_One_Bounded_Marker_Grammar.md` — new, heredoc-authored
- `.cleargate/delivery/pending-sync/BUG-061_Greedy_Block_Match_Still_Eats_Prose.md` — new, heredoc-authored

Both new items were authored via Bash heredoc, so the PostToolUse ingest hook did not fire and no
wiki page was written — verified: `git status --porcelain .cleargate/wiki/crs .cleargate/wiki/bugs`
is empty. Concurrency constraints honoured: no `EPIC-058` file, no `wiki/{index,log,product-state,roadmap}.md`,
no `cleargate-planning/MANIFEST.json`, no `.session-totals.json.tmp.*` read as input, edited or
staged; no `cleargate wiki` command; no `cleargate init`; outer checkout confirmed still on
`sprint/S-39`; every gate check via `node cleargate-cli/dist/cli.js`.

## flashcards_flagged

- "2026-08-28 · #regex #danger · Anchoring a bounded-block regex kills the ARGUMENT for greedy, not just the bug: post-anchor, non-greedy returns a byte-identical body on both real CLAUDE.md files, so the shipped comment justifying greedy is now false three lines above the constant. When a fix removes a constraint, re-read the comments that cite it. [SPRINT-39 M3 / BUG-043 post-flight]"
- "2026-08-28 · #test-harness #danger · Greedy first-START-to-last-END on a two-block file DELETES everything between the blocks — the 'we assume at most one block per file' comment describes an assumption the mechanism enforces by destroying the evidence. Measured; no fixture in the 9-row corpus covered it. [SPRINT-39 M3 / BUG-061]"
- "2026-08-28 · #dogfood-split #process · A defect fix in cleargate-cli that ships no CHANGELOG entry has no user-facing record — and `cleargate upgrade` PRINTS the changelog, so the omission is silent twice. Repo convention puts the entry in the fix commit (8d1524a), but no milestone plan this sprint named CHANGELOG.md for any item. [SPRINT-39 M3]"
