# STORY-054-07 — Architect Post-Flight + M2 Milestone Close

role: architect

```
POSTFLIGHT: pass

CLAUSE_2_END_TO_END: BREAKS — first break is the Architect step (step 3 of 6), two ways.
  Steps that WORK, measured: (1) the template ships the section in the BODY of all six
  template files (story.md:181 / CR.md:114 / Bug.md:102, both trees; the <instructions>
  sentence at :7/:8/:8 is separate and is stripped on render); (2) an author writing rows
  at drafting time works end to end -- BUG-058 was authored with 6 rows and passes
  bug.ready-for-fix 7/7 including task-breakdown-complete; (5) QA-Verify is read-only and
  needs nothing; (6) the gate enforces correctly -- a template-rendered instance with the
  section and no rows returns {"pass":false,"detail":"## Task Breakdown is present but
  carries no `- [ ]` task rows"} under the real evaluator, so the gate forces the author to
  write rows or delete the section.
  Step 3 (Architect writes rows into the story file) breaks TWICE:
    A. architect.md contradicts itself 160 lines apart. :60-65 (this commit) says write the
       rows into each story file's own `## Task Breakdown`. :224, under `## Guardrails`,
       says "You write one markdown plan file. Nothing else." `Nothing else` is categorical.
       An Architect obeying its Guardrails writes no rows and the whole downstream chain
       has nothing to act on. Identical in canonical, payload and live.
    B. Committing the rows is blocked. See step 4 -- same mechanism, same file.
  Step 4 (Developer ticks in the same commit as the work) breaks, MEASURED:
    developer.md:48-52 says tick "in the same commit as the work it describes". That commit
    stages `.cleargate/delivery/pending-sync/STORY-*.md`, which is in no story's §3.1 and in
    none of surface-whitelist.txt's 10 patterns, so file_surface_diff.sh reports it
    off-surface and exits 1; the installed outer pre-commit chain runs that script via
    `exec`. Reproduced in an out-of-tree scratch repo built from the real script, the real
    whitelist, the real state.json and the real story file: the §3.1-declared file passes,
    only the work item is rejected.
    SECOND FACE, worse: the gate is INERT on a Bug or CR wave. find_story_file
    (file_surface_diff.sh:96-104) globs only STORY-<num>_*.md and `${story_id#STORY-}`
    leaves `BUG-043` unchanged, so it searches for STORY-BUG-043_*.md, finds nothing, and
    exits 0 with "No active story file found". Measured with a genuinely off-surface file
    staged. Blocked on Story waves, unguarded on Bug/CR waves.
    The bypass is already in routine use and undocumented: 2ed99cf8 staged two pending-sync
    story files plus plans/M2.md; replaying that staged set with the state.json of that
    timestamp reproduces BLOCKED on all three paths. That commit exists, therefore
    SKIP_SURFACE_GATE=1 (or equivalent) was used.
  Both breaks filed as BUG-059. Neither is in 054-07's declared scope; neither is a
  kick-back.

SEAM_RULING: accept as-is -- no separate CR filed. Two corrections to QA's framing:
  (a) QA said none of the three paragraphs names the other two roles. developer.md:51-52
      DOES name QA: "no other agent ticks these rows, and QA will report any that stay
      unchecked." The seam is architect.md -> nobody and qa.md -> nobody; the Developer->QA
      edge is already narrated. The seam is two paragraphs, not three.
  (b) Accepting is correct on the merits: every paragraph conditions on "if the story file
      carries a `## Task Breakdown` section", so the chain degrades safely at every stage
      and a maintainer reading one file gets a complete, self-sufficient contract. Adding
      cross-references is three prose edits with zero behavioural change.
  It is not accepted as "nothing to do", though: BUG-059's Defect-A fix rewrites
  architect.md's Guardrail in the same paragraph neighbourhood, so the cross-reference
  lands there for free. A third work item would be churn.

DOD_DECLARED_CR: CR-112 filed --
  `.cleargate/delivery/pending-sync/CR-112_Heading_Anchored_Predicates_Replace_Positional_Section.md`
  "Heading-anchored predicates replace positional section(N)". Gate-green: cr.ready-to-apply,
  9 criteria, verified with `node cleargate-cli/dist/cli.js gate check`.
  Measured evidence restated in the CR verbatim:
    - `story.dod-declared` resolved to "## 4. Quality Gates" in 209/231 authored STORY-*.md
      before 33c56974 and in 1/231 after (the one hit:
      STORY-051-07_Resolve_Enforcement_Overclaims.md).
    - What section(5) now resolves to instead: 76 "## Existing Surfaces", 54 "## ClearGate
      Ambiguity Gate", 50 "## Ambiguity Gate", 33 "section 5 not found", 13 "## 5. Open
      questions", 5 other.
    - 0 of 231 authored stories carry a Task Breakdown heading, so the shift reaches all of
      them.
    - Gutting a Story's entire "## 4. Quality Gates" leaves section(5) has ≥1 listed-item at
      {"pass":true,"detail":"section 5 has 5 listed-item"} -- it is counting Existing
      Surfaces. Demonstrated on STORY-054-07 itself with the real evaluator.
    - Registry-wide context carried forward: 9 of 12 pinnable section(N) criteria already
      pass against their own unedited template.
  Scope is the LOCATOR only. BUG-050 (declared-item counts a bare bold label) and BUG-054
  (registry-wide vacuity) keep the counter half, stated explicitly in CR-112 §2 so the three
  are not conflated at scheduling.

M2_GOAL: met
  Clause 2 ("a Task Breakdown section inside Story/CR/Bug") and clause 3 ("repair the
  gate-index defect that blocks the second one") are both delivered with machine witnesses:
    - The section is in the BODY of all six template files (3 live + 3 canonical), 6 grep
      lines per tree, matching P5's scenario-4 baseline exactly.
    - `task-breakdown-complete` is an enforcing criterion in story.ready-for-execution,
      cr.ready-to-apply and bug.ready-for-fix. Verified live on three documents: a rendered
      template instance fails, BUG-058 with 6 rows passes 7/7, and an item with no section
      passes as not-applicable.
    - The index repair carried 054-06's heading insertion through the pin at 14/14 with zero
      fixture edits, and the one moved value (story.dod-declared 4->5) produced zero
      item-level verdict flips across 11 sprint items.
    - The three agent contracts exist in canonical, payload and live, byte-identical.
  Why this is `met` and not `partial`, applying M1's standard: M1 came back partial because
  CLAUDE.md:161's template list had no spike.md -- a chain break INSIDE the sprint's own
  declared surface, requiring a further commit before the milestone could close. BUG-059's
  breaks are OUTSIDE both M2 stories' declared surfaces: surface-whitelist.txt and
  file_surface_diff.sh appear in no story's §3.1, and architect.md's Guardrail bullet is
  text no requirement named. Every requirement of 054-06 and 054-07 is delivered and every
  DoD box is satisfiable. M2 met its goal and left residue; M1 missed part of its own. The
  distinction is not cosmetic -- M1's gap made the shipped feature unreachable through the
  documented path, M2's makes an already-working feature harder to operate.

M2_RESIDUE:
  BLOCKS M3: none. Reasoning per item, not by assertion --
    - BUG-059 does not block M3. Its blocking face fires only when the active work item id
      begins `STORY-`; M3's two items are BUG-043 and CR-105, for which the gate is inert
      (measured). M3's Developers will feel neither face. It blocks the NEXT sprint's
      stories, and it blocks any attempt to dogfood the tick loop on a Story.
    - BUG-057 (CLAUDE.md:162 teaches {TYPE}-{ID}-{Name} while deriveBucket keys on the first
      underscore) does not block M3, but it OVERLAPS it: CR-105 rewrites root CLAUDE.md and
      cleargate-planning/CLAUDE.md, and BUG-057's fix edits root CLAUDE.md:162. Same file,
      different lines. Sequence them or merge them; do not run both concurrently.
    - BUG-058 (Predicate Vocabulary omits marker-absence) is documentation-only, in
      readiness-gates.md, which M3 does not touch. Open, not blocking.
    - CR-112 is a follow-on refactor scheduled for a later sprint. Not blocking.
  ALSO OPEN, from earlier milestones, and none blocks M3: BUG-055 (P1-High, spike push lands
    under unknown id -- spike surface, untouched by M3), BUG-056 (P2, gate block severity has
    no machine witness), BUG-050, BUG-054, BUG-053, BUG-051, BUG-046.
  NOT a defect but a live constraint M3 inherits: outer `main` still lacks `## Task
  Breakdown` in canonical story.md (measured: `git show main:… | grep -c` -> 0,
  `sprint/S-39` -> 1), so any cli suite run from an outer checkout parked on `main` shows 1
  spurious failure (Scenario 7). M3 runs in cleargate-cli, which has no sprint branch, so
  its Developer MUST keep the outer checkout on sprint/S-39 or a branch cut from it for the
  whole run.

M3_BUG_043_S31: incomplete
  (Note: a Bug has no §3.1. Its surface declaration is `## 4. Execution Sandbox (Suspected
  Blast Radius)`. Audited that section.)
  MISSING 1 -- `cleargate-cli/src/lib/drift-check.ts`. It imports readBlock at :16 and calls
    it twice at :111/:118 inside checkClaudeMdBlockDrift. §4 explicitly reasons about
    downstream consumers -- it names uninstall.ts as "inherits the regex fix for free" -- and
    misses the one whose behaviour actually shifts. Under the agreed /^…$/m anchoring, a
    CRLF or trailing-whitespace CLAUDE.md makes readBlock return null and
    `doctor --drift` then reports claude-md-block-mismatch. The fix's line-ending
    normalisation must live inside the shared module, and drift-check must be verified, not
    assumed.
  MISSING 2 -- the two existing tests that own the current behaviour.
    `test/lib/claude-md-surgery.node.test.ts` (a greedy-prose-mention case at :126 with
    fixture test/fixtures/claude-md/with-prose-mention.md, plus a dogfood test at :211-218
    that reads /Users/ssuladze/Documents/Dev/ClearGate/CLAUDE.md by HARDCODED ABSOLUTE PATH)
    and `test/commands/init.node.test.ts:263-278`, which carries its own private copy of the
    old greedy regex. §5 says "the normal path must remain byte-identical" and names no file.
  MEASURED, and this is the load-bearing part for M3's Developer: the anchoring change alone
    breaks ZERO existing tests. Both BLOCK_REGEX constants were patched to
    /^<!-- CLEARGATE:START -->$([\s\S]*)^<!-- CLEARGATE:END -->$/m in an out-of-tree mirror
    (real node_modules, meta-root symlinks so cross-repo tests resolve) and the six
    CLAUDE.md-touching default-tier files were run before and after:
      baseline  90 tests / 88 pass / 0 fail / 2 skipped
      patched   90 tests / 88 pass / 0 fail / 2 skipped
    Defect A is likewise uncovered: NO file under test/commands/upgrade* mentions CLAUDE.md
    at all, so the take-theirs full-overwrite has never had a test. M3's Developer must not
    read green-to-green as evidence the fix is inert -- there is simply nothing there yet.
  CORRECT as written: the three modify targets, the uninstall.ts exclusion, the deferral of
    BLOCK_REGEX unification, and both Open Questions' recorded human decisions.

M3_CR_105_S31: wrong
  (A CR's surface declaration is `## 3. Execution Sandbox`. Audited that section.)
  WRONG -- §3 lists `cleargate-planning/CLAUDE.md` as "canonical payload; no content change,
    but confirm the block is the first content so the shipped source models the contract."
    Measured: that file is 64 lines with <!-- CLEARGATE:START --> at line 7. Six lines of
    payload-wrapper preamble precede it and must stay -- extractBlock ships only the bounded
    block, so the preamble is deliberately outside it. The confirmation as written can only
    fail, and "make it pass" means deleting the wrapper's own documentation.
  WRONG, second half -- canonical CLAUDE.md:3 reads: "If one already exists, init appends the
    bounded block below without touching the user's existing content." That is verbatim the
    obsolete logic CR-105 §1 evicts ("Forget 'append.'"). A content change IS required, and
    §3 asserts there is none. Also absent: `inject-claude-md.ts:10`'s docstring, which
    documents the same append branch in the same words.
  CORRECT as written, verified: root CLAUDE.md is 186 lines with the block at 129-186, so
    §1's volatility argument holds on this repo's own file; drift-check.ts IS
    position-independent (checkClaudeMdBlockDrift hashes the block body, never an offset);
    and `test/scripts/template-claude-md.node.test.ts` locates its comparison region by
    `content.indexOf(PHRASE)`, not by line offset, so relocation does not touch it. §3's "Do
    NOT modify" list is right about both. No test or script in cleargate-cli hardcodes a
    CLAUDE.md line number.

M3_INTERACTIONS: yes -- four, all actionable.
  1. Spike type / spikes bucket / new predicate CODE: NO interaction. Both M3 items live in
     cleargate-cli/src/{init,lib,commands} plus CLAUDE.md; zero overlap with
     work-item-type.ts, derive-bucket.ts, page-schema.ts or readiness-predicates.ts.
  2. `## Task Breakdown` + the new predicate: both M3 items pass their gates TODAY (measured
     with the local dist: bug.ready-for-fix 7/7, cr.ready-to-apply 9/9) because neither
     carries the section, so task-breakdown-complete returns not-applicable. CONSEQUENCE: M3
     will not exercise the loop 054-07 just wired unless the M3 Architect adds the section --
     and because the surface gate is inert for Bug/CR ids (BUG-059 Defect B, second face),
     M3 is the one place in this sprint where the tick loop can be dogfooded without hitting
     the block. Recommend the M3 Architect add it.
  3. If it does add it, placement is fixed. BUG-043 -> position 5, immediately before
     `## 5. Verification Protocol`, matching Bug.md; bug.repro-steps-deterministic is
     section(2) and is above the insertion, unaffected. CR-105 -> position 7, immediately
     before `## 4. Verification Protocol`, matching CR.md; cr.blast-radius-populated
     (section(3)) and cr.sandbox-paths-declared (section(6)) are both above the insertion,
     unaffected. Any earlier insertion in CR-105 breaks a live criterion. Verified against
     both items' actual heading lists and against the two templates' post-054-06 layouts.
  4. The moved dod-declared index does NOT reach M3 -- it is in the `story` block only, and
     neither bug.ready-for-fix nor cr.ready-to-apply carries it. But P2(c) does reach M3:
     see M2_RESIDUE's last paragraph (outer checkout must stay on sprint/S-39).
  5. One more, outside the four asked about: CR-105 rewrites root CLAUDE.md, and open
     residue BUG-057's fix edits root CLAUDE.md:162. Same file. Sequence, do not parallelise.

GATE_4_CHECKLIST: cumulative, numbered, with what remains stated precisely.
  1. LIVE `.claude/` RE-SYNC (R31). Measured now with `diff -rq cleargate-planning/.claude
     .claude`: exactly FOUR files differ.
       a. `skills/sprint-execution/SKILL.md` -- THE ONE REAL SPRINT RESIDUE. Canonical gained
          §2.1 "Spikes run before the loop, not inside it" (9 lines, at :100-108) and one
          line at :775 pointing at `.cleargate/templates/spike.md`. Live has neither. Both
          are STORY-054-03's. This is R31 and it is still outstanding.
       b/c/d. `hooks/pre-edit-gate.sh`, `hooks/session-start.sh`, `hooks/stamp-and-gate.sh`
          -- NOT sprint residue. The only differences are the version-pin placeholder:
          canonical carries `__CLEARGATE_VERSION__`, live carries `0.20.0`, substituted at
          install time. DO NOT "fix" these by copying canonical over live; that writes the
          literal placeholder into executable hooks. Note separately that the live pin says
          0.20.0 while the global binary is 0.24.2 -- a stale install, pre-existing, related
          to the known `cleargate upgrade` defect.
       The THREE AGENT FILES ARE DONE. architect.md, developer.md and qa.md are byte-identical
       across canonical, live and payload (9 `diff -q` comparisons, all silent). The wave-7
       hand-port discharged that half early and correctly. Nothing remains for them.
  2. PAYLOAD REGENERATION -- `npm --prefix cleargate-cli run prebuild`. Note that `qa.md`,
     the three templates and readiness-gates.md are ALREADY in sync (the concurrent session's
     08:31:25Z prebuild plus wave 7's copier run). What prebuild adds is MANIFEST.json
     regeneration and any file the copier has not touched since. Run it once at close, after
     item 3 is coordinated.
  3. `cleargate-planning/MANIFEST.json` RECONCILIATION. Currently ` M` (modified, unstaged) in
     the outer working tree, regenerated by the CONCURRENT session at 08:31:25Z, carrying
     wave-6 SHAs plus rows from earlier stories. Whitelisted at surface-whitelist.txt:12.
     DevOps must COORDINATE with the other session before staging it -- it is not this
     sprint's file alone. After wave 7 it also needs the three agent-file rows (:20 architect,
     :55 developer, :69 qa), which a1250ad0 deliberately did not touch.
  4. MERGE `story/STORY-054-07` -> `sprint/S-39`, then `sprint/S-39` -> outer `main`. The
     second half is not optional bookkeeping: it closes the window in which any cli suite run
     from an outer checkout on `main` reports 1 spurious Scenario 7 failure (measured: main's
     canonical story.md has 0 `## Task Breakdown`, sprint/S-39 has 1). Merge promptly.
     NEVER "fix" that red by editing Scenario 7 -- it is the sole non-vacuity pin on
     task-breakdown-complete.
  5. BRANCH DELETION. Outer: story/STORY-054-01, -02, -03, -04, -06, -07 (all six exist;
     -01 through -06 are already merged into sprint/S-39). cleargate-cli: story/STORY-054-02,
     -04, -05, -06. No worktrees exist (`git worktree list` -> main checkout only), so there
     is no 2.7 teardown debt.
  6. PUBLISH `cleargate` + GLOBAL REINSTALL. New for this sprint, from the 054-06 post-flight
     P3: `/opt/homebrew/bin/cleargate` is a REAL global install of 0.24.2, not a link, and it
     has no parser for `task-breakdown-complete`. It now emits an identical `predicate error`
     on every Story, CR and Bug in this repo -- legacy, empty-section and correctly-authored
     alike. Zero signal, reads as a failing gate. Until it is republished and reinstalled, the
     operator instruction stands: use `node cleargate-cli/dist/cli.js gate check <file>`.
     End-user installs are unaffected (payload and binary ship in one version).
  7. FLASHCARD APPENDS. Two sets are proposed-but-unwritten because FLASHCARD.md is contended
     by the concurrent session: the 054-06 post-flight's set, and this dispatch's (below).
     Append them in one pass at close, newest on top, after grepping for dupes.
  8. STALE PROSE, named owners, from M2 §Open decisions 5 and the M1/M2 residue:
     `test_template_gate_correctness.red.sh` T2-D's "(section 4 unshifted)" label; three stale
     test titles in gate-section-index-pinning.node.test.ts (:430 "exactly 14 … 12 pinnable +
     2", :443 "six templates", :633 "14 = 12 pinned + 2" -- now 18/16/seven);
     `cleargate-planning/.cleargate/config.example.yml:10`'s `# Valid buckets:` list, which
     omits `spikes` and `topics` (BUG-051's). All are the exact class of stale prose this
     sprint exists to remove; they belong in the report as owned residue, not silent debt.
  9. EXISTING-INSTALL CAVEAT for the release notes: `cleargate upgrade` will never add
     `spikes` to an existing install's `wiki.ingest_buckets` -- config.yml is
     INTENTIONALLY_UNTRACKED / first-install-only. New installs get it from the seed; existing
     repos must add `- spikes` by hand. Repos that omit `ingest_buckets` entirely are
     unaffected.
 10. `stamp-and-gate.sh:40`'s WORK_ITEM_ID regex omits `SPIKE` (M1 §C5). Latent while the
     spike gate is advisory. Carry as known residue with a named owner; do not fix at close.
 11. WIKI INGEST of the sprint's new items, INCLUDING the new `spikes` bucket, plus the two
     items filed by this dispatch (BUG-059, CR-112). Deferred until the concurrent session
     releases the wiki pages -- `wiki/{index,log,product-state,roadmap}.md` are all currently
     modified by it. Do not run `cleargate wiki` before that.
 12. SPRINT REPORT + PUSH. `SPRINT-39_REPORT.md`, pushed under id SPRINT-39-REPORT, type
     sprint_report. It must carry, at minimum: N5's 74 and 0 beside P4's 209/231 -> 1/231; the
     BUG-059 chain break; and the five items in #8.
 13. DOC-REFRESH CHECKLIST. `.cleargate/sprint-runs/SPRINT-39/.doc-refresh-checklist.md` does
     NOT exist yet -- `prep_doc_refresh.mjs` has not been run. Run it before Gate-4 ack, then
     apply or punt each `- [ ]` per `.cleargate/knowledge/sprint-closeout-checklist.md`.
 14. CLOSE. `close_sprint.mjs` with NO flags first; surface the re-run prompt verbatim; halt
     for explicit human authorization. Never pass --assume-ack autonomously.

SCOPE: clean for the commit under review; the working tree carries three unrelated groups.
  a1250ad0 = exactly 3 files, 18 insertions, 0 deletions, all under
  cleargate-planning/.claude/agents/. No cli commit (cleargate-cli HEAD unchanged at 9e46ce5).
  Nothing under .claude/ staged (`git ls-files .claude/` -> 0). No payload path staged.
  Undeclared/uncommitted in the working tree, none of it 054-07's and none of it touched by
  this dispatch:
   - CONCURRENT SESSION (do not touch): EPIC-058_*.md (untracked), wiki/epics/EPIC-058.md
     (untracked), wiki/{index,log,product-state,roadmap}.md (modified),
     cleargate-planning/MANIFEST.json (modified), .session-totals.json.tmp.G5Ptvh (untracked).
   - HOOK-MANAGED (whitelisted): sprint-runs/SPRINT-39/{state.json,token-ledger.jsonl,
     .session-totals.json}.
   - PRE-EXISTING BACKFILL, noted in the wave-6 post-flight and unchanged since: a one-line
     `sprint_cleargate_id: null -> "SPRINT-39"` in 7 pending-sync items (BUG-047/048/049/050,
     CR-109, EPIC-055, EPIC-057).
   - THIS DISPATCH'S WRITES: this report, the M2.md append, and the two new items
     BUG-059_*.md and CR-112_*.md, all uncommitted in the outer main checkout as instructed.

REPRODUCED: everything load-bearing was re-executed; nothing was taken from the Dev or QA
  reports on trust.
  1. `git show a1250ad0` full diff + `--stat`; `git show a1250ad0 | grep -c "^+## "` -> 0.
  2. Nine parity comparisons: canonical vs live and canonical vs payload for architect.md,
     developer.md, qa.md -- all six `diff -q` silent (payload parity holds for all three, not
     just the one qa.md test pins).
  3. `readme-qa-doc-truth-043-06.red.node.test.ts` re-run: 18 pass / 0 fail / 0 skipped.
  4. `grep -n "Task Breakdown" .cleargate/templates/*.md` and the canonical mirror -> 6 lines
     each, matching P5's scenario-4 baseline; no ticking/flagging rule in any <instructions>
     block.
  5. architect.md read END TO END (not grepped): found the `## Guardrails` contradiction at
     :224 against the new paragraph at :60-65.
  6. Surface-gate break, executed twice in an out-of-tree scratch git repo seeded from the
     real file_surface_diff.sh, surface-whitelist.txt, state.json and story files:
     Story-active + story file staged -> BLOCKED / exit 1; Bug-active + off-surface file
     staged -> "No active story file found" / exit 0.
  7. 2ed99cf8's staged set replayed against the same script with the state.json of that
     timestamp -> BLOCKED on all three paths, establishing that the bypass was used.
  8. Whitelist read in full (10 patterns) and `diff`ed against the cleargate-planning mirror
     -- identical, and neither matches `.cleargate/delivery/**`.
  9. Hook chain read end to end: .git/hooks/pre-commit symlink -> .claude/hooks/pre-commit.sh
     dispatcher -> exactly one matching pre-commit-*.sh -> its final `exec` of
     file_surface_diff.sh.
 10. Gate behaviour on three real documents via `node cleargate-cli/dist/cli.js gate check -v`:
     a template-rendered story instance (task-breakdown-complete FAILS, dod-declared passes at
     section 5 = Quality Gates -- correct for the template); BUG-058 (7/7 incl. 6 task rows);
     BUG-043 (7/7) and CR-105 (9/9), both not-applicable on the section.
 11. Template heading positions re-derived for story.md (Task Breakdown at 4, Quality Gates at
     5), CR.md (Task Breakdown at 7) and Bug.md (Task Breakdown at 5); and for BUG-043 and
     CR-105 as authored, to fix M3's insertion points.
 12. BUG-043 anchoring blast radius MEASURED, not reasoned: out-of-tree cleargate-cli mirror
     with real node_modules and meta-root symlinks, both BLOCK_REGEX constants patched to the
     anchored form, six CLAUDE.md-touching default-tier files run before and after -- 90/88/0
     fail/2 skipped in BOTH states. Plus a repo-wide census of readBlock/writeBlock/
     removeBlock/injectClaudeMd/BLOCK_REGEX call sites, which is what surfaced drift-check.ts.
 13. CR-105 §3 claims checked on disk: canonical CLAUDE.md 64 lines / START at :7 / preamble
     lines 1-6 / the "appends" sentence at :3; root CLAUDE.md 186 lines / block at 129-186;
     template-claude-md.node.test.ts's locator read (indexOf, not offset).
 14. Branch and worktree inventory in both repos; `git show main:` vs `git show sprint/S-39:`
     on canonical story.md (0 vs 1 `## Task Breakdown`), confirming the P2(c) window is open.
 15. `diff -rq cleargate-planning/.claude .claude` and a per-file diff of all four differing
     files, to separate the one real R31 residue from the three version-pin non-issues.
 16. Both newly filed items gate-checked with the local dist: BUG-059 7/7, CR-112 9/9.

FINDINGS:
  1. architect.md contradicts itself. `:60-65` orders the Architect to write task rows into
     each story file; `:224` says "You write one markdown plan file. Nothing else." Filed as
     BUG-059 Defect A. This is the first break in the sprint-goal chain and it is inside the
     file this story edited -- the §Reach audit greps outward for other agents' files and
     never reads the edited file end to end. PASS is still correct: the plan specified the
     paragraph verbatim, R1 asked for exactly it, and reconciling the Guardrail is a decision
     no requirement authorised.
  2. The pre-commit surface gate blocks the commit developer.md now mandates, and is inert on
     Bug/CR waves. Both measured. Filed as BUG-059 Defect B. The `SKIP_SURFACE_GATE=1` bypass
     is already in routine orchestrator use (2ed99cf8) and appears in none of the three new
     paragraphs.
  3. QA's COMPOSES note is one third wrong: developer.md:51-52 DOES name QA. The seam is two
     paragraphs, not three. Ruling stands (accept), but the record should be right.
  4. M2 §Open decisions #4 is filed as CR-112 with the 209/231 -> 1/231 measurement carried
     verbatim, per the dispatch instruction.
  5. CR-105 §3 contains a self-contradicting instruction: it asks to "confirm the block is the
     first content" in a canonical file where six lines legitimately precede it, and declares
     "no content change" for a file whose line 3 states the exact obsolete behaviour the CR
     evicts. This is the 5th consecutive surface-declaration defect in this sprint (054-02,
     054-04, 054-06, 054-07, CR-105) and the first that is WRONG rather than merely
     INCOMPLETE.
  6. BUG-043 §4 omits drift-check.ts, the third readBlock consumer, while explicitly reasoning
     about the second (uninstall.ts). Incomplete, not wrong.
  7. Neither M3 item exercises the loop M2 just shipped, because neither carries a
     `## Task Breakdown` section. If M3 is to prove the sprint's own feature, its Architect
     must add the section -- and M3 is the safe place to do it, precisely because BUG-059's
     blocking face does not fire for Bug/CR ids.
  8. The full cli suite was NOT re-run by this dispatch. QA-Verify ran it from clean with the
     outer checkout confirmed on story/STORY-054-07 before and after (2526/2524/1/1, the one
     documented sync.node.test.ts network failure), and this story adds zero runtime surface --
     three markdown paragraphs in an untracked-tree-mirrored agent file. The one test with
     teeth on this change (readme-qa-doc-truth-043-06) was re-run here at 18/0/0.

FLASHCARDS (proposed -- NOT written; FLASHCARD.md is contended by the concurrent session and
this dispatch's write budget is report + M2 append + two item files. Append at close):
  - 2026-08-28 · #gate #worktree #danger · The pre-commit surface gate rejects a work item's
    OWN file: `.cleargate/delivery/**` is in no §3.1 and in none of surface-whitelist.txt's 10
    patterns, so ticking a Task Breakdown row "in the same commit as the work" exits 1. And it
    is INERT the other way -- find_story_file globs only STORY-<num>_*.md, so a BUG-/CR- active
    item skips the gate entirely at exit 0. Blocked on Story waves, unguarded on Bug/CR waves.
    [SPRINT-39 STORY-054-07 post-flight / BUG-059]
  - 2026-08-28 · #agents #doctrine #danger · Adding an instruction to an agent .md without
    reading the file END TO END lands a contradiction: architect.md:224's "You write one
    markdown plan file. Nothing else." survived a story whose whole point was to make the
    Architect write story files too. A reach audit that greps OUTWARD for other agents' files
    cannot see it. Read the edited file, not just its neighbours. [SPRINT-39 STORY-054-07]
  - 2026-08-28 · #planning #collision-surface · A Bug/CR has no §3.1 -- its surface lives in
    `## 4. Execution Sandbox` / `## 3. Execution Sandbox`, which the surface gate cannot parse.
    So for Bug and CR waves the declared surface is documentation only, enforced by nothing.
    Do not assume a wave is gated because the sprint has a gate. [SPRINT-39 M3 preflight]
  - 2026-08-28 · #test-harness #cross-repo · A "will this break tests?" question is answerable
    cheaply: mirror the package out-of-tree with a SYMLINKED node_modules and meta-root
    symlinks so cross-repo reads resolve, patch, run the affected files before and after.
    BUG-043's regex anchoring measured 90/88/0/2 in both states -- a zero-delta answer worth
    more than an estimate. [SPRINT-39 M3 preflight]
  - 2026-08-28 · #qa #ambiguity · Grep-per-file can pass a 3-agent prose contract that still
    fails to compose as a chain -- read all 3 paragraphs together. (QA-flagged; and note the
    reader must also check the paragraphs against the REST of each file, which is where
    STORY-054-07's real defect was.) [SPRINT-39 STORY-054-07]
```

## Script Incidents

None. No script was invoked through `run_script.sh` by this dispatch; all measurement was
direct execution of `file_surface_diff.sh`, `node cleargate-cli/dist/cli.js`, `tsx --test`
and `git` in read-only or out-of-tree contexts.

## Version check

Not applicable. This dispatch declares no dependency and no package version. CR-037's
`npm view` rule was not skipped; it had no subject.

## Notes

Filed by this dispatch, both gate-green, both uncommitted in the outer main checkout:
- `.cleargate/delivery/pending-sync/BUG-059_Task_Breakdown_Ticks_Cannot_Be_Committed.md`
  (`bug.ready-for-fix`, 7 criteria, PASS)
- `.cleargate/delivery/pending-sync/CR-112_Heading_Anchored_Predicates_Replace_Positional_Section.md`
  (`cr.ready-to-apply`, 9 criteria, PASS)

Appended to `.cleargate/sprint-runs/SPRINT-39/plans/M2.md`: the
`POST-FLIGHT RULING — STORY-054-07` block, rulings Q1-Q8. Nothing earlier in that file was
rewritten.

No `cleargate wiki` command was run. `wiki/index.md` was not read as an awareness source;
every fact above comes from raw files, from source, or from execution. No EPIC-058 file,
no wiki page, no `MANIFEST.json` and no `.session-totals.json.tmp.*` was read as sprint
input, edited or staged.
