# BUG-043 QA-Verify report

role: qa

```
QA: pass
BUG_ACTUALLY_FIXED: Re-derived the ORIGINAL §3 probe-4 repro independently of the test harness —
  ran injectClaudeMd() directly via tsx against (a) baseline src @ 9e46ce5 and (b) fixed src @
  HEAD (1e01ea0), same input/output as the bug report:
    baseline: "# Proj\n\n<START>\nNEW SCAFFOLD v2\n<END> marker here.\n\nIMPORTANT USER PROSE\n"
              — "I documented the " destroyed. contains("I documented the ") = false.
    fixed:    "# Proj\n\n<START>\nNEW SCAFFOLD v2\n<END>\n\nI documented the <END> marker here.\n\n
              IMPORTANT USER PROSE\n" — full sentence survives. contains("I documented the ") = true.
  Byte-for-byte matches the bug's own §3 transcript on baseline and is fixed on HEAD. Defect B
  confirmed fixed by direct execution, not by trusting the test suite.
CRLF_RULING: No normalisation anywhere on the write path. Read the full src/ diff (c6540dd..1e01ea0,
  3 files, 65 lines) line by line: the only `\r` mentions are two new COMMENT lines explaining why
  CRLF needs no handling (ECMAScript LineTerminator). Both `content.replace(BLOCK_REGEX, ...)` call
  sites in writeBlock/removeBlock are structurally unchanged — only the regex constant changed, and
  the regex captures/replaces, it does not rewrite line endings. Tolerance is delivered entirely by
  `[ \t]*$` in the pattern (horizontal whitespace only), per the orchestrator's R1 ruling. R3's two
  new CRLF-write-path tests (FIXTURE_B, writeBlock/removeBlock) are GREEN, confirmed via targeted
  run (27/27 in claude-md-anchoring.red.node.test.ts) — correctly so, per TPV's own R3 text: these
  are pins against a *future* normalising implementation, not scenarios red on this baseline (QA-Red
  round 2 measured this correctly and recorded the deviation from the dispatch's "red on baseline"
  framing).
REDS_HONEST: Confirmed by direct re-execution, not inherited. Checked out c013589's src/ (pre-fix)
  with QA-Red's two test files at their final (byte-identical-to-shipped) state and re-ran both red
  files: 27 tests / 9 pass / 18 fail (anchoring) + 4 tests / 2 pass / 2 fail (upgrade) = exactly 20
  red, exactly matching QA-Red round 2's reported baseline. Then restored HEAD and re-ran: 27/27 and
  4/4, all 20 flipped green.
  - D: `readBlock(FIXTURE_D)` asserts `=== null` (strictEqual), not merely "did not throw" — a real
    content assertion. Baseline value was `" and "` (non-null); post-fix is `null`. Discriminates.
  - G: `readBlock(FIXTURE_G)` asserts `=== null` identically — baseline indented-marker capture was
    non-null; post-fix is `null`. Discriminates.
  - Guard-divergence D/G tests use `assert.throws(fn, /CLAUDE\.md has CLEARGATE markers but no
    anchored block/)` — message-matched, not bare throw — and are paired with an "A: writeBlock
    still changes content" test guarding against an over-broad throw-everything fix. Genuine.
  - The 9 shared-corpus TypeError reds were a real per-test catchable failure (namespace import),
    confirmed by re-running against baseline — not a file-load crash; verified the file executed all
    27 tests at baseline (9 pass / 18 fail), not 1/1 as a link-time crash would produce.
GRAMMARS_EQUIVALENT: Both anchored, both greedy. Read directly from committed source:
  - `claude-md-surgery.ts:12` — `/^<!-- CLEARGATE:START -->[ \t]*$([\s\S]*)^<!-- CLEARGATE:END -->[ \t]*$/m`
  - `inject-claude-md.ts:23` — `/^<!-- CLEARGATE:START -->[ \t]*$[\s\S]*^<!-- CLEARGATE:END -->[ \t]*$/m`
  Identical apart from the capture-group parens (surgery captures the body; inject matches the whole
  block for extractBlock's `match[0]`). Both use `^…$` under `/m`, both use greedy `[\s\S]*` (no `?`
  anywhere). Node-verified: `.source` strings above, `[\s\S]*?` absent from both. The shared-corpus
  equivalence loop (N7/R4, 9 fixtures) passes 9/9 post-fix, run targeted.
GUARD_ORDER: Confirmed by direct source read of claude-md-surgery.ts writeBlock/removeBlock: (1)
  `content.includes(CLEARGATE_START)` → original message "CLAUDE.md is missing <!-- CLEARGATE:START
  --> marker", (2) `content.includes(CLEARGATE_END)` → original message "...CLEARGATE:END -->
  marker" (byte-identical to the bug's own §3 transcript), (3) `BLOCK_REGEX.test(content)` →
  NOT_ANCHORED, new and distinct, (4) replace. Three distinct messages, none unified, NOT_ANCHORED
  strictly last before the mutation. Fixture F (no markers) test asserts the pre-existing guard-1
  message verbatim via regex match — confirmed GREEN both at baseline (F was not among the 18
  baseline reds — guard 1 already existed) and post-fix (27/27).
FIXTURE_C: Confirmed does not throw. `writeBlock(FIXTURE_C, ...)` (trailing horizontal whitespace on
  both marker lines) changes content successfully post-fix — `[ \t]*` already tolerates it, matching
  TPV R1's correction of the plan's N3 table. Both C tests (`readBlock` trailing-ws pin, `writeBlock`
  does-not-throw correction test) are byte-identical in `git diff c013589 1e01ea0 -- <QA-Red's two
  files>` (empty diff, see QA_RED_UNTOUCHED below) — QA-Red's own tests, unmodified by the Developer.
UPGRADE_BRANCH: Present, latent, NOT deleted. Read `upgrade.ts:361-386` directly: the `isClaudeMd
  (entry.path)` branch and its surrounding `if (choice === 't')` control flow are structurally
  unchanged; only the try/catch body was rewritten. Both destructive routes (`ourBlock === null` →
  full overwrite; bare `catch` → full overwrite) are gone, replaced by named refusals using the
  function's existing "skip, continue the run" idiom (`return { updated: false, newSha: null }`,
  same as :425/:435/:444 elsewhere in the file). No path inside the `isClaudeMd` branch ever assigns
  `mergedContent = theirs` — the outer `let mergedContent = theirs` default (shared by every file
  type in the `choice === 't'` case) is never reached for CLAUDE.md because both error routes return
  early. Scenario 12 (real 70-entry MANIFEST.json, 0 CLAUDE.md rows) still passes, confirming N4
  latency is unchanged. CR-105 is the intended future consumer.
MARKER_COUNT: Counts anchored LINES, not substrings, everywhere it matters. `countAnchoredLines()`
  (claude-md-anchoring.red.node.test.ts:304-308) builds `new RegExp('^' + escaped + '[ \\t]*$', 'gm')`
  and counts matches — used in the D-inject and probe-4 assertions (`anchoredStarts === 1 &&
  anchoredEnds === 1`). `init.node.test.ts`'s R11 replacement (`hasAnchoredBlock` + zero-residual-
  substring check via `removeBlock`) is the correct complementary form for "exactly one contiguous
  block" and does not reintroduce a raw substring count as an "exactly N" assertion.
QA_RED_UNTOUCHED: Confirmed empty. `git diff c013589 1e01ea0 -- test/lib/claude-md-anchoring.red.node.test.ts test/commands/upgrade-claude-md.red.node.test.ts` — zero output, zero exit code. Both
  QA-Red files are byte-identical to their round-2 TPV-corrected state; the Developer touched neither.
SUITE: 2557 / 2555 / 1 / 1 — full suite, run fresh from this session (captured to a log file, never
  piped through tail/head), 892 suites, ~334s. The sole failure is the pre-existing, documented
  network-dependent case: `test/commands/sync.node.test.ts` "exits 2 when no MCP URL or token is
  configured" — `Error: cannot reach https://cleargate-mcp.soula.ge (fetch failed)`, matching
  sprint-context.md's named pre-existing failure verbatim. Matches the Developer's reported numbers
  exactly. Note per the dispatch's own warning: this green suite is corroborating, not primary,
  evidence — the load-bearing signal is REDS_HONEST above.
TYPECHECK: pass — `npm --prefix cleargate-cli run typecheck` (`tsc --noEmit`), clean, no output.
DOD: Per QA kick-back criteria (M3 plan §"QA kick-back criteria — BUG-043 fails on any one of
  these"), all 12 checked directly against source, not inferred:
  1. includes()-only guard survives in writeBlock/removeBlock — NO (both carry the BLOCK_REGEX.test
     guard). PASS.
  2. Existing error message strings changed — NO (both original messages byte-identical). PASS.
  3. `\s*` or `\r?$` in either regex — NO (`[ \t]*$` only, confirmed via `.source`). PASS.
  4. Non-greedy `[\s\S]*?` anywhere — NO (both regexes use plain `[\s\S]*`, no `?`). PASS.
  5. upgrade still assigns `mergedContent = theirs` inside isClaudeMd — NO (both routes are named
     refusals; verified by reading upgrade.ts:361-386 directly). PASS.
  6. No CRLF fixture in new tests — FIXTURE_B (fully CRLF) present, plus 2 new R3 write-path tests.
     PASS.
  7. Fixture H residual not pinned as known limitation — H is explicitly titled "KNOWN LIMITATION"
     with an inline no-fix-this-later comment. PASS.
  8. New test uses a literal `/Users/` path — NO; `CANONICAL_CLAUDE_MD` resolves module-relative via
     `import.meta.url`, matching `template-claude-md.node.test.ts:16`'s pattern. PASS.
  9. "Green suite" offered as sole evidence — NO; Dev report leads with REDS_CLEARED 20/20 and names
     the specific reason per test. PASS.
  10. By-hand typecheck+suite numbers absent from Dev report — present (SUITE/TYPECHECK fields,
      matching my independent re-run exactly). PASS.
  11. build-manifest.node.test.ts:258-261 touched, or CLAUDE.md moved out of INTENTIONALLY_UNTRACKED
      — NO; full diff c6540dd..1e01ea0 touches exactly 6 files, all under
      test/{lib,commands}/claude-md*|init|upgrade-claude-md and src/{lib/claude-md-surgery,
      init/inject-claude-md,commands/upgrade}.ts — build-manifest.* untouched. PASS.
  12. `cleargate init` run in the meta-repo — NO, confirmed not run by either Developer or this QA
      pass. PASS.
  All 12/12 pass. Zero kick-backs.
REPRODUCED:
  - `npm --prefix cleargate-cli run typecheck` — clean.
  - `claude-md-anchoring.red.node.test.ts` targeted — 27/27 pass (post-fix).
  - `upgrade-claude-md.red.node.test.ts` targeted — 4/4 pass (post-fix).
  - `init.node.test.ts` targeted — 28/28 pass.
  - `claude-md-surgery.node.test.ts` targeted — 10/10 pass (incl. the BUG-060-owned hardcoded-path
    "dogfood sanity" test, still green, still untouched).
  - `upgrade.node.test.ts` targeted — 14/14 pass.
  - Baseline re-derivation: checked out c013589 src/ (pre-fix) with the final QA-Red test files,
    re-ran both red files fresh — 27/9/18/0 and 4/2/2/0, exactly 20 red, matching QA-Red's own
    round-2 numbers. Restored HEAD afterward (`git checkout HEAD -- <3 src files + init.node.test.ts>`,
    working tree confirmed clean via `git status --porcelain` before and after).
  - Independent, test-harness-free repro of the bug's own §3 probe-4 via a standalone tsx script
    importing `injectClaudeMd` directly from src, run once against baseline src and once against
    fixed src — see BUG_ACTUALLY_FIXED above.
  - Full suite: `npm --prefix cleargate-cli test`, captured to a log file (not piped through
    tail/head), 2557/2555/1/1.
  - Read the full source of claude-md-surgery.ts, inject-claude-md.ts, and upgrade.ts:350-395 in
    their committed, current state (not diff-only) to confirm guard order, message text, regex
    grammar, and branch structure directly.
FINDINGS: none.
```

## Notes

- Concurrency constraints honoured: did not read/edit/stage EPIC-058 files, wiki pages,
  `.session-totals.json.tmp.*`, or `cleargate-planning/MANIFEST.json`; ran no `cleargate wiki`
  command; ran no `cleargate init`. Outer checkout confirmed still on `sprint/S-39`
  (untouched by this QA pass).
- `cleargate-cli` working tree confirmed clean (only the pre-existing untracked
  `cleargate-0.23.1.tgz`) after the baseline re-derivation round-trip.

## flashcards_flagged

- []
