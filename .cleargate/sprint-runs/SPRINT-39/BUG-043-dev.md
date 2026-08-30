# BUG-043 — Developer report

role: developer · wave 8 · repo: `cleargate-cli` (main checkout, branch `story/BUG-043`)

```
STATUS: done
COMMITS: 7528d22 (fix: anchor CLEARGATE markers to their own line — claude-md-surgery.ts,
  inject-claude-md.ts, test/commands/init.node.test.ts, atomic per R10/R11), then
  1e01ea0 (fix: upgrade refuses rather than overwrites a user's CLAUDE.md — src/commands/upgrade.ts)
SUITE: 2557 / 2555 / 1 / 1 — the ONE failure is the pre-existing, documented network-dependent
  case: test/commands/sync.node.test.ts "Scenario: missing CLEARGATE_MCP_TOKEN — exits 2 when no
  MCP URL or token is configured" ("Error: cannot reach https://cleargate-mcp.soula.ge (fetch
  failed)"). Matches sprint-context.md's named pre-existing failure exactly; unrelated to this fix.
  Measured with a fresh foreground run (no pipe through tail/head — captured to a file, grepped the
  runner's own `ℹ tests/pass/fail/skipped` summary lines directly).
TYPECHECK: pass — `npm --prefix cleargate-cli run typecheck` (`tsc --noEmit`), clean, no output.
REDS_CLEARED: 20/20, all for the expected reason.
  - test/lib/claude-md-anchoring.red.node.test.ts: 27/27 pass (was 18 red / 9 pre-existing green
    pins at QA-Red baseline; the file also carries 2 R3 CRLF-write-path tests that were GREEN on
    baseline already per QA-Red round 2 — those stay green, unaffected).
  - test/commands/upgrade-claude-md.red.node.test.ts: 4/4 pass (was 2 red — scenarios 9 and 10 —
    2 pre-existing green pins — scenarios 11, 12).
  - No test went green for the wrong reason: re-ran both files targeted (not just full-suite) and
    read each test's own name/assertion; the shared-corpus equivalence loop (9 rows) exercises
    `hasAnchoredBlock` + `extractBlock` against the real exported functions, not a stub.
R3_CRLF: still green — confirmed. Both new tests in the "Defect B — CRLF write path (R3)" describe
  block pass: `writeBlock(FIXTURE_B, ...)` and `removeBlock(FIXTURE_B)` both preserve the CRLF
  prose outside the block byte-for-byte. Verified by reading the shipped diff directly
  (`git diff c013589..1e01ea0`) — the only `\r` mentions anywhere in the diff are in two new
  COMMENT lines explaining why `\r` needs no handling (it's an ECMAScript LineTerminator); the two
  `content.replace(BLOCK_REGEX, ...)` call sites are structurally unchanged from before this fix
  (same shape, only the regex constant changed). No normalisation logic was added anywhere.
NORMALISATION: confirmed absent. Grepped the diff for `\r` / `replace(` — zero mutation of file
  bytes outside the regex pattern itself. Tolerance for CRLF is delivered entirely because `\r` is
  already a LineTerminator under `/m` (N1); tolerance for trailing horizontal whitespace is
  delivered entirely by `[ \t]*` in the pattern. Nothing on the write path (`writeBlock`,
  `removeBlock`, `injectClaudeMd`) rewrites line endings.
THIRD_GUARD: added, in both `writeBlock` and `removeBlock`, in `src/lib/claude-md-surgery.ts`.
  Order preserved exactly as ruled (R8/N3): the two existing `content.includes(...)` guards fire
  FIRST with their original, untouched messages (`CLAUDE.md is missing <!-- CLEARGATE:START -->
  marker` / `... CLEARGATE:END --> marker`), THEN the new `BLOCK_REGEX.test(content)` guard throws
  `NOT_ANCHORED` (`CLAUDE.md has CLEARGATE markers but no anchored block (both markers must sit
  alone on their own line)`), BEFORE the `content.replace(...)` call. All three messages stay
  distinct — none unified. Verified two ways: (1) read the committed source directly; (2) fixture F
  (no markers at all) still throws the pre-existing guard-1 message, not NOT_ANCHORED, which only
  holds if guard order is preserved (a hoisted third guard would fire first and change F's message).
FIXTURE_C: confirmed does NOT throw. `writeBlock(FIXTURE_C, ...)` (trailing horizontal whitespace
  on both marker lines) changes the content successfully — `[ \t]*` in the anchored regex already
  tolerates it, so the guard and the regex agree for this fixture (R1). Test
  "C (trailing whitespace): writeBlock does NOT throw — CORRECTION vs plan's N3 table" passes.
UPGRADE_BRANCH: implemented as latent defense-in-depth, NOT deleted. `src/commands/upgrade.ts`'s
  `isClaudeMd(entry.path)` branch still exists and is still reached by the same control flow as
  before; only its body changed — both destructive routes (`ourBlock === null` → full overwrite,
  bare `catch` → full overwrite) are replaced with named refusals that `return { updated: false,
  newSha: null }` and leave the file untouched, using the same "skip this file, continue the run"
  idiom already used elsewhere in the function. The branch remains dead in production today
  (CLAUDE.md is INTENTIONALLY_UNTRACKED, 0 manifest rows — N4), confirmed by scenario 12 passing
  unchanged against the real 70-entry MANIFEST.json. CR-105 (wave 9) is the intended future
  consumer; nothing here removes or guts the branch.
MARKER_COUNT: counts anchored LINES, never substring occurrences, in every place a count matters.
  - `test/commands/init.node.test.ts` (R11, my edit): the private substring-based
    `GREEDY_BLOCK_REGEX` + placeholder-split check was replaced with `hasAnchoredBlock(claudeMd)`
    plus asserting `removeBlock(claudeMd)` leaves ZERO `CLEARGATE_START`/`CLEARGATE_END`
    substrings — a stronger, anchor-aware check than the placeholder-split it replaced.
  - QA-Red's `countAnchoredLines()` helper (in the untouched anchoring test file) uses
    `^<marker>[ \t]*$` with `/gm`, run against test output, for the probe-4 and D-inject
    assertions — not touched by me, confirmed still present and still used post-fix (27/27 green).
N7_INIT_TEST: R11's verbatim form applied exactly as specified — same import list
  (`hasAnchoredBlock, removeBlock, CLEARGATE_START, CLEARGATE_END`), same three-line body. Landed
  in commit 7528d22, the SAME commit as the `hasAnchoredBlock` export in
  `src/lib/claude-md-surgery.ts` and the anchored regex in `src/init/inject-claude-md.ts` — all
  three files in one atomic commit, per R10 (a named import of a not-yet-existing export crashes
  the whole test file at ESM link time if it lands first). `test/commands/init.node.test.ts`
  targeted run: 28/28 pass, matching TPV's measured expectation exactly.
UNTOUCHED: walked the full list.
  - `test/lib/claude-md-anchoring.red.node.test.ts` and
    `test/commands/upgrade-claude-md.red.node.test.ts` (QA-Red's two files): confirmed byte-
    identical — `git diff c013589..1e01ea0 -- <these two paths>` is EMPTY. Not opened for edit.
  - Fixture F, both C tests, scenario 10, the 11762 real-file pin: all inside the two files above,
    therefore untouched by the same evidence.
  - `test/lib/claude-md-surgery.node.test.ts:211-218` (BUG-060 hardcoded absolute path, incl. the
    "dogfood sanity" block reading the live main-checkout CLAUDE.md): confirmed byte-identical
    (`git diff` empty for this file across the same range) and confirmed still GREEN in the
    combined 79-test targeted run (which includes this file).
  - `cleargate-planning/MANIFEST.json`, the four `.cleargate/wiki/*` pages, `EPIC-058_*.md`: never
    opened, never in any `cleargate-cli` diff (they live in the outer repo, out of this item's
    execution route entirely).
  - Outer checkout: confirmed still on `sprint/S-39` throughout (checked before and after the full
    suite run); never ran `cleargate init` (bare or otherwise) in the meta-repo; never ran
    `cleargate wiki`.
  - `cleargate-cli` working tree: clean except the pre-existing untracked `cleargate-0.23.1.tgz`
    (not created or touched by me).
SURPRISES:
  1. **The first full-suite attempt was orphaned by a background-monitoring mixup on my end** —
     I launched `npm --prefix cleargate-cli test` via a bare `&` background instead of the
     harness's own `run_in_background`, then compounded it by also wrapping a separate `until`
     poll loop through `run_in_background`. The two were not the same process and the poll loop
     completed (process died) without the actual suite finishing in a way I could observe
     directly. The coordinator caught this, told me to stop waiting on it, and I killed the stale
     process (PIDs 19771/19790) and re-ran the full suite fresh in the foreground, piping only to
     a log file (never through `tail`/`head`, per the sprint's own flashcard on pipe exit codes
     masking a red suite as green) and reading the runner's own summary lines with `grep`. Net
     effect: no work was lost or redone — my four source/test edits were already correct and
     already verified via the three targeted runs before the confusion — but it cost turns.
  2. **TPV R13 (fix two stale line-number citations) conflicts with my dispatch's explicit
     "Do NOT touch" list.** R13 names `upgrade-claude-md.red.node.test.ts:10` (a comment inside
     QA-Red's file, citing `upgrade.ts:364-378` when the real range is `:366`-`:379` post-fix) and
     the plan's own gotcha-list citation of `uninstall.ts:437-441` (real range `:435`-`:443`). Both
     targets are outside my authorized edit surface — R11 only authorizes `init.node.test.ts`, and
     my dispatch is explicit that QA-Red's two files are otherwise forbidden. I left both citations
     stale rather than touch a forbidden surface on a TPV ruling's authority alone; flagging here so
     it is not silently dropped, per QA-Red's own note in its round-2 SURPRISES.
  3. No other deviation from the plan/TPV text. All fixture behaviour matched TPV's measured tables
     exactly on first implementation — no guess-and-check cycles were needed on the regex or guard
     shape; the mutation matrix in the TPV report predicted the code correctly.
```

## r_coverage

- { r_id: "N1 (CRLF tolerance in pattern, not mutation)", covered: true, deferred: false, clarified: false }
- { r_id: "N2 (verbatim anchored regexes, both modules)", covered: true, deferred: false, clarified: false }
- { r_id: "N3 (third guard, both functions, order preserved)", covered: true, deferred: false, clarified: false }
- { r_id: "N4 (upgrade branch latent, not deleted)", covered: true, deferred: false, clarified: false }
- { r_id: "N7 (shared-corpus pin + init.node.test.ts private-regex replacement)", covered: true, deferred: false, clarified: false }
- { r_id: "N8 (export hasAnchoredBlock predicate, not the regex)", covered: true, deferred: false, clarified: false }
- { r_id: "N9 (anchored-line marker counting, never substring)", covered: true, deferred: false, clarified: false }
- { r_id: "N10 (fixture H known-limitation, untouched)", covered: true, deferred: false, clarified: false }
- { r_id: "R1 (fixture C does not throw)", covered: true, deferred: false, clarified: false }
- { r_id: "R2 (no test asserts writeBlock's NOT_ANCHORED fires inside upgrade; catch kept verbatim)", covered: true, deferred: false, clarified: false }
- { r_id: "R10/R11 (atomic three-file commit, verbatim init.node.test.ts replacement)", covered: true, deferred: false, clarified: false }
- { r_id: "R13 (stale line-number citations in QA-Red's file / plan gotcha list)", covered: false, deferred: true, clarified: false }
- { r_id: "Q1 human decision (upgrade refuses with named error, never substitutes payload)", covered: true, deferred: false, clarified: false }
- { r_id: "Q2 human decision (markers anchored to their own line)", covered: true, deferred: false, clarified: false }

## plan_deviations

- { what: "R13's two stale line-number citations left unfixed", why: "both targets are forbidden surfaces per my explicit dispatch (QA-Red's file; the M3 plan doc itself) — R11 is the only authorized edit inside QA-Red's files, and I have no write mandate over plans/M3.md", orchestrator_confirmed: false }

## adjacent_files

- "cleargate-cli/src/commands/uninstall.ts"
- "cleargate-cli/src/lib/drift-check.ts"
- "cleargate-cli/src/init/root-gitignore.ts"

## flashcards_flagged

- "2026-08-28 · #test-harness #danger · Don't mix ad-hoc `&` backgrounding with run_in_background poll loops for the same process — they desync and neither tells you the truth; run long suites via run_in_background directly. [BUG-043]"
