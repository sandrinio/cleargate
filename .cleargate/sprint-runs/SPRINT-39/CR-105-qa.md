# CR-105 QA-Verify Report — SPRINT-39 wave9

role: qa

**Mode: VERIFY.** Independent gate — no edits made to either repo. `cleargate-cli` on `story/CR-105`
@ `45816b9`; outer repo on `story/CR-105` @ `71037e5a` (main checkout, not a worktree —
`git worktree list` shows exactly one entry). All verification run from source (`npx tsx`), never
through `cleargate-cli/dist/cli.js` (T12).

```
QA: pass
```

## Precedence applied

TPV RULING (T1–T12) > POST-FLIGHT RULING (BUG-043's) > ORCHESTRATOR RULING (O1–O7) > plan body, per
dispatch. Every claim below was independently re-measured, not inherited from the Dev/QA-Red/TPV
reports.

---

## 1. Behaviour, outside the harness

Ran the **shipped** `injectClaudeMd` (from `src/init/inject-claude-md.ts` @ `45816b9`) via `tsx`
against two fresh fixtures, using the real canonical block.

**Fixture A — prose above AND below an old block:**
```
starts with START marker: true
anchoredStarts: 1  anchoredEnds: 1
contains "Some intro prose here.": true
contains "More lines above the block.": true
contains "## Footer heading": true
contains "Prose that lives below the old block.": true
contains "Another line below.": true
contains "OLD BLOCK BODY": false
second application byte-identical: true
```

**Fixture B — no block at all:**
```
starts with START marker: true
anchoredStarts: 1  anchoredEnds: 1
contains "This file has never seen ClearGate before.": true
contains "Just plain user prose.": true
second application byte-identical: true
```

Every byte of user prose survives below the block, exactly one anchored block exists, and a second
application is byte-identical (idempotent) in both fixtures.

**Same fixtures against the pre-CR-105 source** (`git show 1133bf7:src/init/inject-claude-md.ts`,
BUG-043-as-shipped, immediately before CR-105):
```
Fixture A — starts with START marker: false     (block stayed in place, mid-file)
Fixture B — starts with START marker: false     (block appended; output ends with
                                                   "...\n<!-- CLEARGATE:END -->\n")
```
Confirms the change is real, not already true on the prior commit.

## 2. The M5 hole is genuinely closed

Read `src/init/inject-claude-md.ts` @ `45816b9`: the strip decision is
`BLOCK_REGEX.test(existing) ? existing.replace(BLOCK_REGEX, '') : existing` — a regex `.test()`,
**not** a substring count. `src/commands/upgrade.ts` and `src/commands/init.ts` route through the
same function; no independent "does a block exist" logic exists elsewhere.

Built the M5 mutant (`existing.split('<!-- CLEARGATE:START -->').length - 1 === 1`) in an
out-of-tree mirror and ran `test/init/claude-md-block-leads.red.node.test.ts` against it:
```
tests 15
pass 13
fail 2
  ✖ 8b: a file that ALREADY contains the REAL block is stripped, not stacked …  (2 !== 1)
  ✖ 8c: this repo's own root CLAUDE.md round-trips …                            (2 !== 1)
```
Both required tests fail exactly as TPV predicted. The shipped implementation avoids the hole; the
tests would have caught a regression into it. **Confirmed closed.**

## 3. The §0.5 Q1 notice fires correctly (T3)

Ran the real `initHandler` against a fresh `mktemp -d` tmpdir (never the meta-repo) with
`# My Project\n\nUser content here.\nAnother line.\n` as the pre-existing `CLAUDE.md`:

**Run 1** (relocating run) — exactly one notice line, verbatim:
```
[cleargate init] Moved the ClearGate block to the top of CLAUDE.md; 3 lines of your content now
follow it. Why: prompt-cache prefix stability — the block changes only on upgrade, so it must
physically precede your more volatile prose.
```
`NOTICE COUNT RUN 1: 1`

**Run 2** (idempotent re-run, same tmpdir) — zero notice lines. `[cleargate init] CLAUDE.md
unchanged (block already up to date)` printed instead. `NOTICE COUNT RUN 2: 0`.

"Relocate once, print a notice" — satisfied exactly; the notice does not repeat.

## 4. Canonical `:3` — both clauses (T11)

```
$ grep -n "appends\|updates the block in place" cleargate-planning/CLAUDE.md
(exit 1 — zero hits)
```
Real line 3 now reads: *"...init removes any existing block and **prepends** the current one, so the
block always leads the file; the user's existing content follows it untouched. Re-running `cleargate
init` relocates the block back to the top."* Both stale clauses ("appends" AND "updates the block in
place") are gone — not just the one the doc-truth grep covers. The `:1-6` preamble is byte-identical
(only line 3 changed, confirmed by `git show 71037e5a -- cleargate-planning/CLAUDE.md`: 1 line
changed). Markers still at `:7`/`:64`, unmoved.

## 5. The relocation is a pure move (kick-back 12)

```
$ git diff -U0 71037e5a^ 71037e5a -- CLAUDE.md | grep '^-' | grep -v '^---' | sort > removed.txt
$ git diff -U0 71037e5a^ 71037e5a -- CLAUDE.md | grep '^+' | grep -v '^+++' | sort > added.txt
$ diff removed.txt added.txt && echo IDENTICAL
59 removed.txt / 59 added.txt — IDENTICAL SETS
```
Every removed line reappears as an added line, zero net content change. All 11 top-level headings
outside the block survive **in order**:
```
2:## 🔄 ClearGate Planning Framework      (the block's own H2, now at top)
60:# ClearGate Meta-Repo
64:## Product vision in one line
67:## Repo layout
114:## Dogfood split — canonical vs live
128:## How work gets done
135:## Flashcard protocol (mandatory)
141:## Test + commit conventions
151:## Deploy targets
163:## Active state (as of 2026-04-18)
175:## Stack versions (canonical — see INDEX.md for full table)
179:## Guardrails for the conversational agent (me)
```
Root `CLAUDE.md` is 186 lines (`wc -l` confirmed), block leads at line 1.

**Independent re-derivation, not just diff-reading:** applied the shipped `injectClaudeMd` to the
pre-relocation root `CLAUDE.md` (using its own extracted block) and compared to the committed
post-relocation file — **byte-identical.** The relocation is exactly what the shipped code produces,
not a hand-edit that happens to match.

## T8 — read correctly, not as content loss

The Developer's commit message and CHANGELOG both say "your content is preserved and moves below the
block," never "byte-identical." Root `CLAUDE.md`'s block was at the end, so the strip-scar trims away
on this file — consistent with T8. Not treated as a defect.

## 6. `CHANGELOG.md` carries both entries (P3)

`git show HEAD:CHANGELOG.md` — `## Unreleased` section present with two entries: (1) the relocation
itself, phrased "your content is preserved and moves below the block, it is not touched or reordered
otherwise" (T8-compliant wording, no "byte-identical" claim); (2) BUG-061's known limitation (stray
lone `<!-- CLEARGATE:END -->` still eats prose). `package.json` diff from `1133bf7` to `HEAD`:
**empty** — not bumped, as required.

## 7. `upgrade.ts` (P9 + T10)

```diff
-import { readBlock, writeBlock } from '../lib/claude-md-surgery.js';
+import { readBlock } from '../lib/claude-md-surgery.js';
+import { injectClaudeMd, extractBlock } from '../init/inject-claude-md.js';
...
-        mergedContent = writeBlock(ours, theirBlock);
+        mergedContent = injectClaudeMd(ours, extractBlock(theirs));
```
Exactly one behavioural line changed (`:381`). Read `:355-395`: both refusal returns (`ourBlock ===
null`, `theirBlock === null`), the `catch`, and the `isClaudeMd` guard are byte-identical to before.
`writeBlock` dropped from the import (confirmed unused elsewhere in the file); `readBlock` retained
(still used by both guards). `npm --prefix cleargate-cli run typecheck` — clean, no output, no
`TS6133` (T10's predicted failure mode did not occur).

**Recorded per dispatch: this branch is latent.** `CLAUDE.md` remains in `INTENTIONALLY_UNTRACKED`
(`build-manifest.ts` unmodified by this diff — confirmed, see §8 below); 0 rows in the current
70-entry `MANIFEST.json` and the 65-entry `.install-manifest.json`. This change delivers nothing
observable today and is not certified as a shipped behaviour change — it is defense-in-depth per
ORCHESTRATOR RULING O2.

## 8. No new marker-matching regex anywhere (kick-back 7 / N7 / CR-113)

```
$ grep -rn "BLOCK_REGEX\s*=" src/ test/
src/init/inject-claude-md.ts:23   (pre-existing, BUG-043)
src/init/root-gitignore.ts:41     ROOT_BLOCK_REGEX (unrelated, different markers, CR-113's scope)
src/lib/claude-md-surgery.ts:12   (pre-existing, BUG-043)
```
No third `CLAUDE.md`-marker regex introduced. Both `countAnchoredLines` copies (T7) are regex-free
line filters:
```ts
function countAnchoredLines(content: string, marker: string): number {
  return content.split('\n').filter((l) => l.trimEnd() === marker).length;
}
```
in both `test/lib/claude-md-anchoring.red.node.test.ts:309-311` and
`test/init/claude-md-block-leads.red.node.test.ts:47-49`. Confirmed identical implementation, no
regex.

---

## All 14 kick-back criteria, evaluated individually

| # | Criterion | Verdict | Evidence |
|---|---|---|---|
| 1 | `cleargate-planning/CLAUDE.md:1-6` preamble deleted or markers moved | **CLEAR** | Only line 3 changed (git show, 1-line diff); markers still at `:7`/`:64` |
| 2 | Canonical `:3` still says "appends" | **CLEAR** | grep returns zero hits; rewritten to "prepends" |
| 3 | `inject-claude-md.ts:10` docstring still says "append block with 2 leading newlines" | **CLEAR** | Docstring rewritten: "remove any existing block, then PREPEND" |
| 4 | Block bodies of root/canonical no longer hash-match | **CLEAR** | `block-equal: true 11762 11762` (independently re-run) |
| 5 | `init.node.test.ts` scenario 3 deleted rather than inverted, or stale titles | **CLEAR** | Scenario 3 retitled "CR-105: block leads, user content follows"; scenario 4 retitled, no "above and below" |
| 6 | "Exactly one block" asserted by substring count | **CLEAR** | `countAnchoredLines` is line-based; tests 8b/8c independently proven to catch a substring-counting **implementation** too (§2 above) |
| 7 | Second `BLOCK_REGEX` introduced anywhere | **CLEAR** | Census: 2 (pre-existing), + unrelated `ROOT_BLOCK_REGEX` (CR-113 scope) |
| 8 | `CLAUDE.md` added to `MANIFEST.json`, `POST_PROCESSED_FILES`, or `classifyPath` | **CLEAR** | 65/0, 70/0 census re-run; `build-manifest.ts` not in the diff at all |
| 9 | Idempotence not asserted, or only on block-at-bottom fixture | **CLEAR** | Test 4b (already-at-top, block-only) and 4c (already-at-top, with prose) present; independently re-verified via my own fixtures (both `outXb === outX`) |
| 10 | §0.5 Q1 relocation notice missing from `init`'s stdout | **CLEAR** | §3 above — fires once, silent on idempotent re-run |
| 11 | Outer edit made in a worktree | **CLEAR** | `git worktree list` — one entry, main checkout, on `story/CR-105` |
| 12 | Content in root `CLAUDE.md` lost or reordered other than the block move | **CLEAR** | 59/59 removed=added line sets; 11 headings present, in order; independently re-derived byte-identical via shipped `injectClaudeMd` |
| 13 | By-hand typecheck + suite numbers absent from Dev report | **CLEAR** | Present in Dev report; independently re-run and matched exactly (below) |
| 14 | `cleargate init` run in the meta-repo | **CLEAR** | `git status --short` in outer repo shows no unexpected `CLAUDE.md`/`.claude/` churn from this dispatch; my own notice-firing test used a `mktemp -d` tmpdir, never the meta-repo |

All 14 clear. **No kick-back.**

---

## Measured suite line — full suite, fresh shell

```
$ npm --prefix cleargate-cli test
ℹ tests 2576
ℹ suites 896
ℹ pass 2574
ℹ fail 1
ℹ cancelled 0
ℹ skipped 1
ℹ duration_ms 445141.7

✖ failing tests:
test at test/commands/sync.node.test.ts:1:18146
✖ exits 2 when no MCP URL or token is configured
  AssertionError: Input did not match /MCP URL not configured|.../
  actual: 'Error: cannot reach https://cleargate-mcp.soula.ge (fetch failed)\n'
```

**`2576 / 2574 / 1 / 1`** — matches the Developer's claim and the TPV ladder exactly. The sole
residual failure is the documented pre-existing network test (`sync.node.test.ts`, no outbound
network in this sandbox, fails identically on `main`, not this change). No delta to report.

`npm --prefix cleargate-cli run typecheck` — clean, no output, exit 0.

## Targeted doc-truth run (commit-3 acceptance)

```
$ npm --prefix cleargate-cli exec -- tsx --test --test-reporter=tap \
    test/docs/claude-md-block-leads-relocation.red.node.test.ts
# tests 4
# pass 4
# fail 0
# skipped 0
```

All four assertions green: (1) root's first non-empty line is the START marker, (2) canonical `:3`
no longer describes the evicted append contract, (3) block-body hash parity (must-stay-green, sole
witness for M7), (4) pure-move / prose-survival (T2, must-stay-green). **`pass 4 · fail 0 · skipped
0`** — the outer half is fully certified, not skip-satisfied.

## Additional targeted confirmation

```
$ npx tsx --test --test-reporter=tap test/init/claude-md-block-leads.red.node.test.ts
# tests 15 / pass 15 / fail 0 / skipped 0

$ npx tsx --test --test-reporter=tap test/commands/init.node.test.ts \
    test/commands/upgrade-claude-md.red.node.test.ts test/lib/claude-md-anchoring.red.node.test.ts
# tests 59 / pass 59 / fail 0 / skipped 0
```

---

## M5-variant transcript (M5 hole check, verbatim)

```
$ npx tsx --test --test-reporter=tap test/init/claude-md-block-leads.red.node.test.ts   # against
  the substring-counting mutant, out-of-tree mirror
# tests 15
# pass 13
# fail 2
  ✖ 8b: a file that ALREADY contains the REAL block is stripped, not stacked … (2 !== 1)
  ✖ 8c: this repo's own root CLAUDE.md round-trips …                           (2 !== 1)
```

## §0.5 Q1 notice — run 1 / run 2, verbatim

```
RUN 1: [cleargate init] Moved the ClearGate block to the top of CLAUDE.md; 3 lines of your content
now follow it. Why: prompt-cache prefix stability — the block changes only on upgrade, so it must
physically precede your more volatile prose.
NOTICE COUNT RUN 1: 1

RUN 2: (no relocation notice line present)
NOTICE COUNT RUN 2: 0
```

---

## Method-constraint compliance

- Never verified through `cleargate-cli/dist/cli.js` — all runs via `npx tsx` / `npm --prefix
  cleargate-cli` from source (T12).
- Full suite run in a fresh shell, never piped through `tail`/`head` — captured to a background log
  file and read in full via the Read tool.
- No file in either repo edited. No `git reset --hard`, `checkout -- .`, `checkout <ref> -- .`,
  `stash`, force push, `--no-verify`, or branch switch performed. `stash@{0}` in `cleargate-cli`
  untouched. Outer repo remained on `story/CR-105` throughout.
- No `cleargate init` run anywhere in this tree; no `cleargate wiki`; no bare `cleargate`.
- Did not touch `EPIC-058_*.md`, `.cleargate/wiki/**`, or `cleargate-planning/MANIFEST.json`.
- All out-of-harness verification used either scratchpad scripts (importing shipped `src/` via
  absolute path, read-only against the real repos) or a `mktemp -d`-based out-of-tree mirror for the
  M5-mutant check; the mutant mirror was scratch-only and never touched the real `cleargate-cli`
  checkout.

## Script Incidents

None. No script was invoked through `run_script.sh` — all verification was direct `tsx`/`npx
tsc`/`node`/`git`/`grep` execution, matching the plan's own measurement method.

---

VERDICT: Ship it. All 14 CR-105 kick-back criteria clear on independent re-measurement. The M5
substring-counting hole TPV found is confirmed closed in the shipped code (not just forbidden in
tests) — verified both by reading (`BLOCK_REGEX.test()`, not substring count) and by mutation
(8b/8c fail under the substring-counting variant, pass under shipped). The §0.5 Q1 notice fires
exactly once on the relocating run and is silent on the idempotent re-run, matching the recorded
human decision's letter. Canonical `:3` no longer carries either stale clause. The root `CLAUDE.md`
relocation is proven a pure move three independent ways (diff-set equality, heading-order
preservation, and re-derivation from the shipped `injectClaudeMd` producing a byte-identical file).
`upgrade.ts`'s change is correctly scoped to one line and correctly reported as latent
defense-in-depth, not a shipped behaviour change. Full suite `2576/2574/1/1` and targeted doc-truth
`pass 4 · fail 0 · skipped 0` both match the Developer's claims exactly on independent re-run.

STATUS=done
