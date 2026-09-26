# BUG-097 — QA-Red report

role: qa

```
QA-RED: WRITTEN
RED_TESTS:
  - test/commands/gate-unit.node.test.ts (BUG-097 G1)
  - test/commands/stamp.node.test.ts (BUG-097 S1, S2, S3)
  - test/wiki/query.node.test.ts (BUG-097 Q1, Q3)
  - test/commands/scaffold-lint.node.test.ts (BUG-097 L1)
BASELINE_FAIL: 7
flashcards_flagged:
  - "2026-09-26 · #qa-red #test-harness · A single diff-preview stdout call embeds many lines; join+split before per-line asserts, not array equality."
```

## Commit

cli `story/BUG-097`, worktree `/Users/ssuladze/Documents/Dev/ClearGate/.worktrees/BUG-097/cleargate-cli`:

```
d41efe0a2eaa9632a6b7d7b66922e538bbd6c7ce  qa-red(BUG-097): 7 red + 6 anchors across gate/stamp/wiki-query/scaffold-lint output
```

Base: cli `main` / `story/BUG-097` branch point `35580b0` (unchanged — merge(story/STORY-058-09)).

Files touched: exactly the 4 named in the blueprint. No `src/**`, `scaffold/**`, `scripts/**`. No new test files.

## Per-file table

| File | Existing (base) | +New | Solo total | Solo pass/fail | New reds | New anchors |
|---|---|---|---|---|---|---|
| `test/commands/gate-unit.node.test.ts` | 25 | +3 | 28 | 27 / 1 | G1 | G2, G3 |
| `test/commands/stamp.node.test.ts` | 6 | +4 | 10 | 7 / 3 | S1, S2, S3 | S4 |
| `test/wiki/query.node.test.ts` | 23 | +3 | 26 | 24 / 2 | Q1, Q3 | Q2 |
| `test/commands/scaffold-lint.node.test.ts` | 7 | +3 | 10 | 9 / 1 | L1 | L2, L3 |
| **Total** | **61** | **+13** | **74** | **67 / 7** | **7** | **6** |

Matches the blueprint's pinned totals exactly: +13 tests, 7 red (G1, S1, S2, S3, Q1, Q3, L1), 6 anchors (G2, G3, S4, Q2, L2, L3). `npm run typecheck` is clean.

### Why each red fails (verified, not asserted)

- **G1** — `gate check -v` on `PASSING_EPIC` prints 2 lines today (header + `✅ … passed`), not the pinned 4 (header, `✅`, then the two `[pass]` per-criterion lines). Fails `2 !== 4` — the exact defect (verbose block nested inside the failure branch only).
- **S1** — dry-run on a fresh file whose frontmatter already carries a nested `cached_gate_result` object. Debug capture confirms stamp preserves the untouched key by the same object reference (so the existing `===` check correctly treats it as unchanged, no spurious `-`/`+` pair), but the rendered line is `` cached_gate_result: [object Object]`` instead of the pinned compact-JSON form — 0 matching lines instead of 1. Confirmed by direct instrumented run, not inferred.
- **S2 / S3** — `buildDiffPreview` is not yet a named export of `stamp.ts`; a dynamic `import('../../src/commands/stamp.js')` returns a namespace object whose `.buildDiffPreview` is `undefined` (per the existing `2026-09-26 · #qa-red #test-harness #recipe` card), so the call throws `TypeError: mod.buildDiffPreview is not a function` — red by absence, not by wiring in the calling test file.
- **Q1 / Q3** — the index-row and code-map excerpts each already start with `` - [[ID]]``; the handler still prepends a second `` - [[ID]] — `` in front of the whole line, so the expected de-duplicated line never appears (`assert.ok(...)` false). Q2's non-`` - [[``-prefixed excerpt (a table row) already renders correctly today (prefixing a bare excerpt is exactly the intended behaviour) — confirmed anchor, unaffected by the bug.
- **L1** — a project with no `cleargate-planning/` (the normal target-repo case) prints `scaffold-lint: clean` twice (`runScaffoldLint`'s own early-return print plus the handler's unconditional print), not once — `2 !== 1`.

### Fixture / assertion note vs. the blueprint

The blueprint's S1/S4 literal expected lines assume `stampHandler`'s dry-run pushes one line per `stdout()` call. An instrumented run showed the handler instead makes **one `stdout()` call carrying the entire diff block** (header `---`/`+++` plus every changed/unchanged line joined by `\n`). Testing via `out.filter(l => l === '<exact line>')` therefore fails structurally regardless of content correctness. Fixed by reconstructing real lines with `out.join('\n').split('\n')` before per-line assertions in S1 and S4 — content assertions are otherwise exactly as pinned (verified S4 passes green at the base commit after the fix, S1 still fails only on content as intended). No other file needed this treatment (`gate-unit`'s `out` array is genuinely one push per line; `query`'s `runQuery` already returns a single joined `stdout` string that the tests `.split('\n')` themselves; `scaffold-lint`'s `makeCapture` also captures one push per line).

## Anchors re-run solo (unchanged, cross-file)

| File | tests | pass | fail |
|---|---|---|---|
| `test/commands/gate.node.test.ts` | 3 | 3 | 0 |
| `test/commands/stamp-tokens.node.test.ts` | 9 | 9 | 0 |
| `test/commands/cli-gating.node.test.ts` | 20 | 20 | 0 |

## Git status

```
$ git -C /Users/ssuladze/Documents/Dev/ClearGate/.worktrees/BUG-097/cleargate-cli status --porcelain
(clean)

$ git -C /Users/ssuladze/Documents/Dev/ClearGate/.worktrees/BUG-097 status --porcelain
(clean)

$ git -C /Users/ssuladze/Documents/Dev/ClearGate status --porcelain
 M .cleargate/sprint-runs/SPRINT-41/.session-totals.json
 M .cleargate/sprint-runs/SPRINT-41/events.jsonl
 M .cleargate/sprint-runs/SPRINT-41/state.json
 M .cleargate/sprint-runs/SPRINT-41/token-ledger.jsonl
```
The 4 outer main-checkout diffs are the pre-existing ledger/session files from before this dispatch (this is a cli-only item — no outer worktree writes were made).

## flashcards_flagged

```yaml
flashcards_flagged:
  - "2026-09-26 · #qa-red #test-harness · A single diff-preview stdout call embeds many lines; join+split before per-line asserts, not array equality."
```
