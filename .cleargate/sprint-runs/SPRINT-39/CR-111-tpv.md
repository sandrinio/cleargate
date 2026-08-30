---
story_id: CR-111
sprint_id: SPRINT-39
mode: TPV
wave: 13
milestone: M4
generated_by: architect
generated_at: 2026-08-30
baseline_commit_cli: 6475274f1668e7b6f0beef80101b997bfb4f1a4e
baseline_commit_outer: a377cd0b21d60ee24e3eac73dc116d547ae5536b
verdict: PASS-WITH-AMENDMENTS
arch_bounces_increment: false
---

# CR-111 TPV — mutation gate on the QA-Red baseline

role: architect

## Verdict

**`TPV: PASS WITH AMENDMENTS`** — 8 amendments, **4 BLOCKING** (A1, A2, A3, A4).

**Wiring is sound. `arch_bounces` MUST NOT increment.** Every import resolves; `evaluate` and
`ParsedDoc` are real exports (`readiness-predicates.ts:160`, `:150`); every path constant resolves
to a real file; there are no mocks and therefore no orphan mock state; both files carry the
declared `*.red.node.test.ts` naming (`sprint-context.md` §Test Stack); zero `skipped` in both
files confirms cross-repo root resolution is correct rather than silently degraded; and the
baseline reproduces **exactly** out of a git repository — `A 12t/3p/9f/0s`, `B 8t/0p/8f/0s`.
QA-Red also disclosed the §4 contradiction instead of quietly picking a side, which is the reason
this is a coverage ruling and not a bounce.

The rejection reason is single and specific: **eight distinct wrong implementations score
identically to a correct reference (19 pass / 1 fail), one of them ships CR-111 with zero template
edits, and one defensible correct implementation is bounced by an assertion whose failure message
is false.**

Blunt first-class finding, measured, stated in §Finding 1: **the templates — the thing CR-111
exists to ship — are not constrained by a single assertion in either red file.** A predicate that
reads "fail if the body contains any `{placeholder}`, else fail if a `| 0 | |` row exists, else
pass" scores **19/20, byte-identical to correct**, with `story.md`, `CR.md` and `Bug.md` untouched
in both trees.

---

## What was run, and where

Everything ran **out of tree**, under
`/private/tmp/claude-501/-Users-ssuladze-Documents-Dev-ClearGate/49c00a07-a425-4af9-9ac6-97ed8ed5ee64/scratchpad/`.
`base/` is a non-git copy of `cleargate-cli/{src,test,scripts,package.json,tsconfig.json}` (with
`node_modules` symlinked) plus `cleargate-planning/{.cleargate,.claude}`; every mutant is an
independent `cp -a` of that base. `splitbase/` and `split2/` additionally carry a live
`.cleargate/{knowledge,templates,delivery,scripts}` tree so the two-tree assertions execute.

Neither of the Developer's trees was written to. Confirmed at exit:

```
$ git -C cleargate-cli status --porcelain | wc -l          0
$ git -C cleargate-cli rev-parse HEAD                      6475274f1668e7b6f0beef80101b997bfb4f1a4e
$ git -C cleargate-cli rev-parse --abbrev-ref HEAD         story/CR-111
$ git -C .worktrees/CR-111 status --porcelain | wc -l      0
$ git -C .worktrees/CR-111 rev-parse HEAD                  a377cd0b21d60ee24e3eac73dc116d547ae5536b
$ git -C .worktrees/CR-111 rev-parse --abbrev-ref HEAD     story/CR-111
```

No commit, no branch switch, no `close_sprint.mjs`, no `npm run prebuild`. The only files this
dispatch wrote in the main checkout are this report and the FLASHCARD lines in §Flashcards.

N10 honoured: every runner redirects to a log file and the status line is parsed from the completed
file. No `tail`/`head` in any runner pipeline. The one full-suite run was launched with `nohup … &`
and polled by line count + `ps` liveness — QA-Red's block-buffering flashcard held exactly as
written (the log sat at 3442 lines for minutes, then jumped to 5255 in one step).

**Baseline reproduces:**

| Run | File A | File B | Total |
|---|---|---|---|
| in-tree (QA-Red's report) | 12t 3p 9f 0s | 8t 0p 8f 0s | 3 pass / 17 fail |
| out-of-tree `base/` (this dispatch) | 12t 3p 9f 0s | 8t 0p 8f 0s | 3 pass / 17 fail |

---

## Full-suite baseline — one clean run, QA-Red's composed number CONFIRMED

QA-Red's full run was interrupted and the `20` was composed from a targeted run plus a partial
full run. I ran it once, cleanly, from the pristine `story/CR-111` checkout:

```
$ npm --prefix cleargate-cli test          # nohup, redirected, 7m00s
ℹ tests 2668
ℹ suites 934
ℹ pass 2647
ℹ fail 20
ℹ cancelled 0
ℹ skipped 1
ℹ duration_ms 420068.661459
```

**`fail 20`, exactly as composed.** Enumerated from the `✖ failing tests:` block:

| Group | Count | Names |
|---|---|---|
| File A (new) | 9 | T2, T3, T4b×2, T5×2, T8×3 |
| File B (new) | 8 | T4×3, T7×3, T10, T11 |
| Inherited | 3 | `new-command.node.test.ts` — *"calling stampFrontmatter directly on a freshly scaffolded … file corrupts the real frontmatter — see BUG-067"*; `sync.node.test.ts` — *"exits 2 when no MCP URL or token is configured"* (9.5 s network timeout); `reporter-content.node.test.ts` — *"Capability Surface + Post-Output Brief sections are byte-identical between live and canonical"* (CR-110 live/canonical drift, clears at Gate-4 re-sync) |

9 + 8 + 3 = 20. **QA-Red's composition caveat can be retired — the number is right.** The cli repo
was clean before and after the run (`git status --porcelain` → 0 rows both times).

**Developer's target after implementation: `fail 4`** — the 3 inherited, plus T1, which no correct
implementation can satisfy (see §Ruling / A1). If A1 is applied first, the target is `fail 3`.

---

## THE RULING YOU OWE — CR-111 §4 items 1 and 5

### The contradiction is real and is not resolvable by interpretation

§4 item **1**: *"A story file with no Integration row fails `test-layers-declared`."*
§4 item **5**: *"an item whose `created_at_version` predates this release is not failed by the new
criterion."*

A pre-release story file has no Integration row. Item 1 demands `fail`; item 5 demands `pass`. The
version guard that would have distinguished them **cannot be built** — re-verified this dispatch by
reading `readiness-predicates.ts:290-291`:

```ts
:290  case '>=': return Number(a) >= Number(expected);
:291  case '<=': return Number(a) <= Number(expected);
```

`frontmatter(.).created_at_version >= 'cleargate@0.25.0'` evaluates `NaN >= NaN` → `false`, always.
F7 stands.

### RULING — absence-passes, and here is the number that decides it

I measured what "absence fails" would actually cost, by running the reference implementation over
every `STORY-`/`CR-`/`BUG-` file in `.cleargate/delivery/{pending-sync,archive}`:

```
items=400  grandfathered(not-applicable)=386  triggered&pass=0  triggered&fail=14
=> an "absence FAILS" rule would newly fail 386 of 400 items (96.5%).
```

**386 of 400.** §2 called mass invalidation "the largest risk"; that is what it is worth. The
version guard that was supposed to prevent it does not exist. **Absence-passes wins, and it wins on
a measurement, not on a preference.**

### The binding contract, one sentence the Developer implements against

> **`test-layers-declared` is a closed-set predicate that fires only on a document that already
> carries a test-layer declaration — an `| Integration tests | … |` table row, or a
> `**Test layers.**` lead-in. With no declaration present it returns `pass` with a
> `not-applicable:` detail, exactly as predicates #7–#10 do. With a declaration present it fails
> unless all three layers (Unit, Integration, E2E/acceptance) are declared, every count cell is a
> non-negative integer, and every row whose count is `0` carries a non-empty reason.**

Three consequences, all binding:

1. **§4 item 1 is FALSE post-implementation and must be rewritten.** Its second sentence — *"Must
   fail against the current tree — the criterion does not exist"* — is a statement about today's
   parse error, not about post-implementation semantics. QA-Red read it correctly. The item's
   *first* sentence must be replaced with the claim the CR's own template prose actually makes:
   **"an absent row is not a decision"** — i.e. a declaration that is *present but incomplete*
   fails.

2. **The `story` escape hatch is accepted and named.** A story that carries the §4.1 table but
   deletes the Integration row is indistinguishable from a pre-CR-111 item and is grandfathered.
   Without a version guard there is no way to close it, and closing it by widening the trigger to
   "any layer row" costs **79 of 400** corpus items (measured — mutant M7 below). Nobody may
   "harden" this later without re-running that measurement.

3. **The predicate is type-agnostic.** It reads `doc.body` only, like every other closed-set
   evaluator in the file (`evalTaskBreakdownComplete`, `evalPriorWorkRecorded`,
   `evalAmbiguityGateResolved` all ignore `doc.fm`). This is currently enforced only implicitly —
   see A8.

### What T1 must therefore assert

**T1 as authored is unsatisfiable by any correct implementation.** Measured: every one of the nine
implementations I built — REF, REF-B, M5, M6, M7, M8, M12, M15, M20 — fails T1 **and only T1**,
because the predicate now parses and `assert.throws` gets no exception. Its message is:

```
AssertionError: Missing expected exception: this must throw TODAY —
                parsePredicate has no test-layers-declared branch yet
```

T1 is a red-phase scaffold, not an acceptance test. Two rulings:

**(a) The Developer is authorised to delete T1's `assert.throws` body.** This is an explicit,
Architect-granted exception to `SKILL.md` §C.3's *"immutable post-Red"*. Without it the story can
never reach a green suite. Record the exception in the Dev report.

**(b) T1 must be replaced, in place, by the claim §4 item 1 actually makes under this ruling:**

> **T1′ — a body carrying a `**Test layers.**` declaration whose table omits the
> `| Integration tests | … |` row FAILS**, with a detail naming the absent row.

Motivating measurement: **M6** — an implementation identical to the reference except that it
validates only the rows it finds and never requires all three — scores **19/20, indistinguishable
from correct**, and fails **1 of 400** corpus items where the reference fails 14. "An absent row is
not a decision" is the sentence CR-111 ships into three templates and it is currently tested by
nothing.

**Do not add a story-shaped sibling to T1′.** Under consequence 2 above, story-shape
"table present, Integration row absent" is grandfathered *by design*. Asserting it would contradict
the ruling.

### One scenario this ruling makes wrong, and how it must change

**None of T2–T11 becomes wrong.** T1 is the only casualty. But one *item-level* consequence must be
decided by the orchestrator, not by me, because it is not a test:

**CR-111 fails its own gate under the ruling.** Measured — the reference implementation returns
`fail` for `CR-111_Declare_Test_Layers_At_Planning.md`, because its `## Task Breakdown` row at
`:108` contains the literal string `**Test layers.**`:

```
- [ ] Add the Integration row to story.md §4.1 (both trees) and the **Test layers.** block to
      CR.md §4 / Bug.md §5 (both trees) — NO ## heading
```

The label trigger fires; no table follows; `cr.ready-to-apply` goes red on CR-111 itself.
**Recommend: reword that task row** (drop the bold markers — `the Test layers. block`). The
alternative — treating label-without-table as not-triggered — reopens an escape hatch where a CR
deletes the table but keeps the heading, and is worse. Either way this is a one-line orchestrator
edit before merge, and it is the only corpus item in `pending-sync` other than STORY-047-03 that
the criterion newly fails.

---

## Kill matrix — every mutant, measured

Reference target: **19 pass / 1 fail (T1 only)**. A mutant SURVIVES when it reaches that score.

| # | Mutant | A | B | Total | Killed by | Verdict |
|---|---|---|---|---|---|---|
| — | **REF** — correct, table-tokeniser shape | 11p 1f | 8p 0f | **19/1** | — | reference ✓ |
| — | **REF-B** — correct, per-row regex sweep (deliberately different shape) | 11p 1f | 8p 0f | **19/1** | — | reference ✓ |
| **M5** | **null impl — `{placeholder}` anywhere ⇒ fail, `\| 0 \| \|` ⇒ fail, else pass. ZERO template edits.** | 11p 1f | 8p 0f | **19/1** | **nothing** | **SURVIVES** |
| **M6** | correct except "all three rows required" is dropped | 11p 1f | 8p 0f | **19/1** | **nothing** | **SURVIVES** |
| **M7** | trigger widened to ANY layer row (Unit/E2E too) | 11p 1f | 8p 0f | **19/1** | **nothing** | **SURVIVES** |
| **M8** | label-blind — `**Test layers.**` never recognised (`hasLabel = false`) | 11p 1f | 8p 0f | **19/1** | **nothing** | **SURVIVES** |
| **M12** | `readiness-gates.md` bumped 10→11, `readiness-predicates.ts:3` left stale at 11 | 11p 1f | 8p 0f | **19/1** | **nothing** | **SURVIVES** |
| **M13** | canonical gate blocks left **syntactically invalid YAML** (3 blocks) | 11p 1f | 8p 0f | **19/1** | **nothing** | **SURVIVES** |
| **M14** | T10 discharged by **deleting** `cr-026-integration.node.test.ts`, docs silent | 11p 1f | 8p 0f | **19/1** | **nothing** | **SURVIVES** |
| **M15** | doctrine = one HTML comment per file carrying only the greped tokens | 11p 1f | 8p 0f | **19/1** | **nothing** | **SURVIVES** |
| **M19** | canonical-only edits, live `.cleargate/` untouched (Rule 1 half) | 11p 1f | 8p 0f | **19/1** | nothing *in CR-111's files* | **SURVIVES** (caught elsewhere — F-b) |
| M1 | **the precedent mutant** — copy `evalTaskBreakdownComplete`'s row-count-only logic | 5p 7f | 8p 0f | 13/7 | T3, T4b×2, T8×3 | killed ✓ |
| M2a | **`section(N)` registry route** — `check: "section(5) has ≥1 declared-item"` | 3p 9f | 8p 0f | 11/9 | all 9 File A (throw) | killed ✓ |
| M2b | **vacuous closed-set** — locate section, `≥1 declared-item`, pass | 5p 7f | 8p 0f | 13/7 | T3, T4b×2, T8×3 | killed ✓ |
| M3a | `evalSection` **exported** | 10p 2f | 8p 0f | 18/2 | T9 export pin | killed ✓ |
| M3b | `evalSection` edited to split on `##+` (sub-headings) | 10p 2f | 8p 0f | 18/2 | T9 hash pin | killed ✓ |
| M3c | `evalSection` **cosmetically reformatted** (var rename + comment drop) | 10p 2f | 8p 0f | 18/2 | T9 hash pin | killed ✓ |
| **M3d** | **correct impl; sibling placed BETWEEN `evalSection` and `applyCountOp`** | 10p 2f | 8p 0f | 18/2 | T9 hash pin | **correct impl BOUNCED** |
| M4a | docs edited in `SKILL.md` only (the STORY-054-07 §Reach failure) | 11p 1f | 6p 2f | 17/3 | T7 ×2 | killed ✓ |
| M16 | **N1 inversion** — docs edited in live `.claude/` only, canonical untouched | 11p 1f | 4p 4f | 15/5 | T7 ×3, T10 | killed ✓ |
| M17 | naming line placed in `SKILL.md` §C.4 instead of §C.3 | 11p 1f | 7p 1f | 18/2 | T7 SKILL scoping | killed ✓ |
| M18 | template edits in **live tree only**, canonical untouched | 8p 4f | 8p 0f | 16/4 | T8 ×3 | killed ✓ |
| M20 | correct except the "`0` must carry a reason" rule is dropped | 8p 4f | 8p 0f | 16/4 | T3, T4b×2 | killed ✓ |
| **REF-C** | **correct; derives the expected layout from the doc's work-item type** | 5p 7f | 8p 0f | 13/7 | T3, T4b×2, T8×3 | **correct impl BOUNCED** |

---

## Finding 1 — the templates are unconstrained. M5 ships CR-111 with none of them.

**M5, verbatim, is the entire predicate:**

```ts
function evalTestLayersDeclared(doc: ParsedDoc): { pass: boolean; detail: string } {
  const b = doc.body;
  if (/\{[^}\n]{1,80}\}/.test(b))   return { pass: false, detail: 'unfilled placeholder present' };
  if (/\|\s*0\s*\|\s*\|/.test(b))   return { pass: false, detail: 'a 0 count carries no reason' };
  return { pass: true, detail: 'ok' };
}
```

It has no notion of a test layer, a table, a row, or a count. It was built with
`apply_common.sh m5 no-templates` — the registry, the vocabulary count and the three doc files were
edited, the **three templates were not**:

```
$ diff -q m5/cleargate-planning/.cleargate/templates/story.md  <real>/story.md   -> story.md UNCHANGED
$ diff -q m5/cleargate-planning/.cleargate/templates/CR.md     <real>/CR.md      -> CR.md UNCHANGED
$ diff -q m5/cleargate-planning/.cleargate/templates/Bug.md    <real>/Bug.md     -> Bug.md UNCHANGED
$ run.sh m5   ->  m5 | A 12t 11p 1f 0s | B 8t 8p 0f 0s | TOTAL pass=19 fail=1
```

**Why T8 does not catch it.** T8 asserts `result.pass === false` against the canonical templates.
It is satisfied by *any* reason for failing. The unedited `story.md`/`CR.md`/`Bug.md` all contain
`{…}` placeholders, so M5 fails them — for a reason that has nothing to do with test layers, and
without the templates ever gaining a row.

This is the "assertion of the right sign for the wrong reason" shape. It is not hypothetical: the
whole point of CR-111 is the Integration row, and **no assertion in either red file requires the
string `Integration tests` to appear in any template.**

Real-world cost, measured over the 400 `STORY-`/`CR-`/`BUG-` files in
`.cleargate/delivery/{pending-sync,archive}`:

| Implementation | Baseline score | Corpus items failed (of 400) |
|---|---|---|
| **REF (correct)** | 19/1 | **14** |
| M6 (absent rows unchecked) | 19/1 | **1** |
| M7 (any-layer-row trigger) | 19/1 | **79** |
| **M5 (null)** | 19/1 | **257** |
| absence-fails (the §4-item-1 literal reading) | — | **386** |

Four implementations that the baseline cannot tell apart, whose real blast radius spans **1 to
257 out of 400**. The baseline has no grip whatsoever on the dimension §2 names as the largest
risk.

---

## Finding 2 — M3d: a correct implementation is bounced, and the message is false

T9 extracts `evalSection` by text markers (`readiness-predicates-test-layers-declared.red.node.test.ts:309-322`):

```ts
const startMarker = 'function evalSection(';
const endMarker   = '\nfunction applyCountOp(';
return src.slice(startIdx, endIdx);
```

M3d is the **reference implementation, unchanged**, with the new sibling function injected between
`evalSection` and `applyCountOp` — a placement a Developer might reasonably choose to keep the
section-related evaluators together.

```
m3d | A 12t 10p 2f 0s | B 8t 8p 0f 0s | TOTAL pass=18 fail=2
  A: evalSection body is byte-identical to the frozen baseline (content hash, not line range)
```

and yet:

```
$ python: base_evalSection_text in m3d_source
m3d contains base evalSection VERBATIM: True | base seg len 2110
```

**`evalSection` was not modified by one character**, and T9 reports:

```
evalSection changed — N5/Cross-Cutting Rule 3 forbids modifying it; add a sibling function instead
```

The Developer has already added a sibling function. The message sends them hunting for a change
they did not make. The hash pin is otherwise excellent — M3a (export), M3b (semantic edit) and
M3c (cosmetic reformat: variable rename + one comment removed) are all killed, and M3c proves the
"cosmetic reformat cannot satisfy it" property the dispatch asked about. The defect is purely in
the *end anchor*.

---

## Finding 3 — REF-C: the "type-aware" design is silently forbidden

REF-C is a correct implementation that branches on the document's own work-item type — plausible,
because the criterion is registered in three *separate per-type* gate blocks and the plan's F9
describes it as "registered against `story`, `cr` and `bug`". It scores **13/20**, killed by six
assertions.

The cause: `makeDoc` (File A `:61-63`) ships `fm: {}` for every fixture, and T8 passes template
paths (`story.md`, `CR.md`, `Bug.md`) with `fm: {}` as well. Nothing in either file *states* that
the predicate must be type-agnostic; the constraint is expressed only as six failures with generic
messages. The constraint is **correct** — every closed-set evaluator in `readiness-predicates.ts`
ignores `doc.fm` — but a Developer will burn a cycle discovering it.

---

## Finding 4 — T4 does not parse the YAML it appends to. M13 proves it.

While building the reference I introduced, by accident, exactly the mechanical error a Developer
hand-appending to a fenced YAML list will make: the last existing criterion and the new one ended
up on the same line. **All of T4×3 and T11 passed.** I then reproduced it deliberately as M13:

```
$ js-yaml over canonical readiness-gates.md
BLOCK 4 YAMLException: bad indentation of a mapping entry (28:43)     <- story
BLOCK 5 YAMLException: bad indentation of a mapping entry (22:43)     <- cr
BLOCK 6 YAMLException: bad indentation of a mapping entry (18:43)     <- bug
canonical yaml blocks: 11  INVALID: 3

$ run.sh m13  ->  m13 | A 12t 11p 1f 0s | B 8t 8p 0f 0s | TOTAL pass=19 fail=1
```

Three broken gate blocks — `cleargate gate check` would throw on every story, CR and bug in the
repo — and CR-111's baseline is fully green.

`extractGateBlock` (File B `:76-82`) is a text regex and `assert.match(block, /- id: test-layers-declared/)`
is a substring test. Neither loads YAML.

**The only guards that would catch it read the LIVE tree, and File B reads CANONICAL:**

| Guard | File | Tree it reads |
|---|---|---|
| *"every criterion.check parses via parsePredicate without throwing"* | `test/lib/readiness-predicates.node.test.ts:728` | `SMOKE_REPO_ROOT/.cleargate/…` (**live**) |
| *"all criterion check strings in readiness-gates.md parse …"* | `test/commands/gate-unit.node.test.ts:751` | `GATE_TEST_REPO_ROOT/.cleargate/…` (**live**) |
| *"js-yaml parse … returns 11 blocks"* | `gate-unit.node.test.ts:748` | **live** |
| T4 ×3 | File B `:84-129` | `cleargate-planning/.cleargate/…` (**canonical**) |

Measured, on a two-tree copy with the criterion registered in the **live** file only and no
predicate in `src`:

```
readiness-predicates.node.test.ts   119t 119p 0f   ->   119t 117p 2f
gate-unit.node.test.ts               25t  25p 0f   ->    25t  23p 2f
```

So the live/canonical split is load-bearing in both directions and neither half sees the other.

---

## Finding 5 — T7 and T10 are vocabulary checklists, not doctrine tests

**M15** replaces the instructional sentence in all three docs with one HTML comment per file
carrying nothing but the greped tokens:

```html
<!-- *.integration.node.test.ts *.red.integration.node.test.ts -integration.node.test.ts -->
```

Score: **19/20**. Zero instruction, zero context, fully green. Same class as CR-110's M1d.

**M14** discharges T10 by *deleting* `cleargate-cli/test/hooks/cr-026-integration.node.test.ts` and
removing every mention of the hyphen form from the docs. T10's own early return
(`:196-200`, `if (!stillHyphenated) return;`) makes deletion a clean pass. Score: **19/20**.

**And the reference implementation itself leaves the contradiction in place.** `SKILL.md:339`
still reads, verbatim, after the reference's edit:

```
> `Mode: RED — … File-naming: *.red.node.test.ts (immutable post-Red). Forbidden: …`
```

T7 is green. CR-111 §4 item 7's second clause — *"and no doc claims red tests may **only** be
`*.red.node.test.ts`"* — is tested by nothing. That clause is half the reason the CR exists (§1's
last bullet: the six `*.red.integration.node.test.ts` files "silently contradict" this sentence).

What T7 *does* do well, measured: M4a (SKILL-only) is killed by 2, M16 (live-tree-only, the N1/X9
inversion) is killed by 4, M17 (right line, wrong section) is killed by 1. The **reach** half is
sound; the **content** half is a grep.

---

## Findings on the plan's own claims

### F-a — "T3 alone kills M1" is FALSE, and M1 is killed by six

Plan text: *"**This is the mutant the precedent hands you**, and it passes T1, T2, T4 and T5."*

Measured: **M1 is killed by T3, T4b×2 and T8×3 — six assertions.** It does not pass T4, and it does
not pass T8. The narrower mutant M20 (correct except the `0 ⇒ reason` rule) is killed by three
(T3 + T4b×2).

**Honest caveat, since the dispatch asked for plainness:** the three witnesses share one code path.
T4b's two cases are T3's malformed row (`| Integration tests | 0 | |`) re-embedded in CR-shaped and
Bug-shaped prose. They are three assertions but substantially one witness. T8's three are a genuine
second, independent witness (real file reads).

### F-b — T4b's declared mutant is NOT killed

T4b's stated purpose: *"kills an implementation that only recognizes story.md's bare-row shape and
silently no-ops (passes) on the CR/Bug `**Test layers.**`-labeled block."*

**M8** is exactly that implementation — `hasLabel` hard-wired to `false`, so the
`**Test layers.**` lead-in is never recognised. It scores **19/20**. The reason is structural: both
T4b fixtures also carry an `| Integration tests | 0 | |` row, so the row trigger fires and the label
path is never exercised. QA-Verify must not credit T4b with the coverage its name claims. (This is
not a bounce: the behaviour is still correct in practice for CR/Bug documents scaffolded from the
new template, because they carry the row too. It only matters for a CR that keeps the label and
deletes the table — which is A1's T1′.)

### F-c — T6 verified BY EXECUTION, `14/14/0/0`, before and after

Run in a two-tree copy carrying all three template edits (`story.md` §4.1 Integration row,
`CR.md` §4 and `Bug.md` §5 `**Test layers.**` tables), both trees mirrored:

```
test/docs/gate-section-index-pinning.node.test.ts -> tests 14  pass 14  fail 0  skipped 0
```

Identical to the unedited baseline. **Cross-Cutting Rules 3 and 4 hold under execution**: no `## `
heading is added, no `section(N)` value moves, `expected-headings.ts` needs zero edits, S1a's `18`
and S6's `16` are unchanged. The M4 plan body's `18 / 18 / 0 / 0` is a homonym — `18` is the
criteria count printed inside S1a's title (`:439`) and S6's (`:651`), not a test count. This is now
the **third** independent confirmation.

Also measured green under the reference: `readiness-predicates.node.test.ts` 119/119,
`gate-unit.node.test.ts` 25/25.

### F-d — zero collateral breakage across the adjacent suite

Eleven test files that read `story.md`/`CR.md`/`Bug.md`/`readiness-gates.md` or the payload, run on
an unmodified two-tree copy and on the same copy with the full reference implementation:

| File | base | reference |
|---|---|---|
| `pin-placeholder-coverage.node.test.ts` | 4t 1p 0f | 4t 1p 0f |
| `build-manifest.node.test.ts` | 20t 20p 0f | 20t 20p 0f |
| `template-stubs.integration.node.test.ts` | 50t 50p 0f | 50t 50p 0f |
| `template-sync-fields.integration.node.test.ts` | 20t 16p 4f | 20t 16p 4f |
| `status-vocab-phase-b.red.node.test.ts` | 75t 75p 0f | 75t 75p 0f |
| `enforcement-doc-coherence.node.test.ts` | 26t 25p 1f | 26t 25p 1f |
| `stamp-frontmatter.node.test.ts` | 8t 8p 0f | 8t 8p 0f |
| `readiness-predicates-task-breakdown.red.node.test.ts` | 10t 10p 0f | 10t 10p 0f |
| `readiness-predicates-prior-work-ambiguity.node.test.ts` | 22t 22p 0f | 22t 22p 0f |
| `work-item-type-spike.node.test.ts` | 12t 12p 0f | 12t 12p 0f |
| `new-command.node.test.ts` | 57t 55p 2f | 57t 55p 2f |

**Zero delta.** (The non-zero failures are scratchpad-layout artefacts — missing `.git`, `mcp/`,
`admin/`, live `.claude/`, `MANIFEST.json` — present identically in both columns, so they cancel.)
`pin-placeholder-coverage` is about `__CLEARGATE_VERSION__` only and is indifferent to `{N}`.

### F-e — the two-tree inversion, both directions

| Mutant | CR-111 baseline | Caught by |
|---|---|---|
| M18 — templates edited in **live** tree only | **16/4** (T8 ×3) | CR-111's own T8 ✓ |
| M19 — templates + gates edited in **canonical** only | **19/1 — survives** | `gate-section-index-pinning` **S1c** (`readiness-gates.md differs between live and canonical`), and `template-stubs.integration` `live === mirror` (3 fails) |

So T8 pins canonical-primary for the templates (good, and it is the N1-correct direction), and
Cross-Cutting Rule 1's *other* half is covered — but only by two files that are **not** in CR-111's
red set. **QA-Verify must run `gate-section-index-pinning.node.test.ts` and
`template-stubs.integration.node.test.ts` explicitly**, or run the full suite, which covers both.

---

## Count-drift adjudication — repo-wide sweep

Command (`command grep`, N-shim-aware):

```bash
command grep -rn --include='*.md' --include='*.ts' --include='*.mjs' -iE \
  "(exactly|there are)[^.]{0,20}(1[0-9]|[0-9])[^.]{0,12}(closed-set )?predicate" . \
  | command grep -v node_modules | command grep -v '/dist/' | command grep -v sprint-runs
```

**The complete set of counts CR-111 invalidates — there are exactly two live ones, and QA-Red found
the second:**

| # | Site | Today | Must become | Tested? |
|---|---|---|---|---|
| 1 | `.cleargate/knowledge/readiness-gates.md:9` | `exactly **10 predicate shapes**` | `11` | **transitively** — T11 reads canonical; S1c pins live≡canonical |
| 2 | `cleargate-planning/.cleargate/knowledge/readiness-gates.md:9` | same | `11` | **yes** — T11 |
| 3 | **`cleargate-cli/src/lib/readiness-predicates.ts:3`** | `Supports exactly 11 closed-set predicate shapes.` | **`12`** | **NO — M12 survives at 19/1** |

Sites confirmed **NOT** to require an edit — do not touch them:

| Site | Value | Why unchanged |
|---|---|---|
| `cleargate-cli/templates/cleargate-planning/.cleargate/knowledge/readiness-gates.md:9` | `10` | **GENERATED npm payload.** Cross-Cutting Rule 2 — gitignored, regenerated by `prebuild` at Gate-4. Hand-editing it is a kick-back. |
| `gate-unit.node.test.ts:748` | `11` yaml blocks | CR-111 adds **criteria to existing blocks**, no new block. Verified green under the reference (25/25). |
| `gate-section-index-pinning.node.test.ts:439` / `:651` | `18` / `16` | CR-111 adds **no `section(N)` criterion**. Verified green (14/14). |
| `readiness-predicates.node.test.ts` | — | no hardcoded predicate count. Verified green (119/119). |

**One consequence that is the orchestrator's, not the Developer's:**
`.cleargate/delivery/pending-sync/BUG-058_Predicate_Vocabulary_Omits_Marker_Absence.md:55,71` is an
open bug whose entire premise is the `11` union members vs `10` documented shapes discrepancy.
CR-111 shifts it to **12 vs 11** without changing the underlying defect. BUG-058's two citations go
stale the moment CR-111 merges. Flagging, not deciding.

**Ruling on T11:** widen it. See A5.

**On the number `11` vs `12` itself** — QA-Red's analysis is correct and I re-verified it:
`ParsedPredicate` (`readiness-predicates.ts:137-147`) has 11 union members today; `readiness-gates.md`
documents 10 numbered shapes; the difference is `marker-absence`, which the vocabulary folds into
shape #2 (parser branches `// 2a.`/`// 2b.`). CR-111 adds one member and one documented shape, so
both counts advance by one: source `11 → 12`, doc `10 → 11`. The two numbers are *supposed* to
differ by one. Do not "align" them.

---

## Amendments

### A1 — BLOCKING. Replace T1. Motivating mutant: **M6** (19/1, indistinguishable; 1/400 corpus failures vs REF's 14).

T1's `assert.throws` is unsatisfiable by any correct implementation (nine measured). Two parts:

1. **Authorise the Developer to delete T1's throw assertion.** Explicit exception to §C.3's
   "immutable post-Red", granted here, to be recorded in the Dev report.
2. **Replace it in place with T1′:** a body carrying a `**Test layers.**` declaration whose table
   omits the `| Integration tests | … |` row must FAIL, and the returned `detail` must name the
   absent row. This is the claim CR-111's own template prose ships (*"an absent row is not a
   decision"*) and it is the only surviving readable meaning of §4 item 1.

Do **not** add a story-shaped counterpart — grandfathering owns that case (ruling, consequence 2).

### A2 — BLOCKING. Pin the template CONTENT, not just the predicate's verdict. Motivating mutant: **M5** (null impl, zero template edits, 19/1).

Three assertions, all cheap, all in File A or File B:

a. canonical `story.md` contains a line matching `^\| Integration tests \|` **inside** §4.1's
   existing table (between the `Unit tests` and `E2E / acceptance tests` rows);
b. canonical `CR.md` and `Bug.md` each contain the literal `**Test layers.**` **and** an
   `| Integration tests |` row;
c. **T8 must assert on `result.detail`, not only `result.pass`** — the detail must name the test
   layers / the integration row, so "fails for an unrelated reason" no longer satisfies it.

(c) alone kills M5. (a)+(b) make the template edit a first-class, machine-checked deliverable
instead of an inference.

### A3 — BLOCKING. Pin the trigger. Motivating mutant: **M7** (19/1; 79/400 corpus failures vs REF's 14).

Add one assertion: **a story-shaped body carrying the PRE-CR-111 §4.1 table — `Unit tests`,
`E2E / acceptance tests`, `Performance test` rows, no `Integration tests` row — must PASS.**

That single scenario is the entire difference between grandfathering and mass-invalidating the
corpus, it is the risk §2 calls the largest, and today nothing asserts it: T5's two fixtures carry
no table at all, so they cannot distinguish "no declaration" from "no Integration row".

### A4 — BLOCKING. Fix T9's end anchor. Motivating mutant: **M3d** (correct impl bounced; `evalSection` byte-identical at 2110 chars).

Either:

- **(preferred)** end the extraction at `evalSection`'s own closing brace rather than at the next
  function's opening line; or
- keep the marker pair but assert `src.includes(FROZEN_EVALSECTION_TEXT)` **first**, so an
  insertion after the function produces a message that says *"a function was inserted between
  `evalSection` and `applyCountOp`"* rather than the current, false *"evalSection changed"*.

**And, independently of the fix — dispatch instruction for the Developer:** place
`evalTestLayersDeclared` at **end of file, after `evalTaskBreakdownComplete`**, matching
STORY-054-06's precedent. Verified: REF, REF-B and every surviving mutant do this and T9 stays
green.

### A5 — Widen T11 to the second count. Motivating mutant: **M12** (19/1).

Add a sub-assertion reading `cleargate-cli/src/lib/readiness-predicates.ts:3` and requiring
`Supports exactly 12 closed-set predicate shapes.` Rationale is the sweep table above: this is the
second and last live count site, and it is the same defect class that bit CR-108 four hours ago —
a frozen constant in a file the sweep did not cover.

### A6 — Make T4 parse the YAML. Motivating mutant: **M13** (3 invalid canonical blocks, 19/1).

Add one `js-yaml` load over every ```` ```yaml ```` block in the **canonical** `readiness-gates.md`,
asserting zero throws and 11 blocks. The two pre-existing guards read the **live** tree only
(`readiness-predicates.node.test.ts:728`, `gate-unit.node.test.ts:751`), so a canonical-only
corruption is invisible to the whole repo until the live half is written.

### A7 — Make T7/T10 assert claims, not vocabulary. Motivating mutants: **M15** (token dump, 19/1) and **M14** (delete the file, 19/1).

Minimum viable, three parts:

a. §C.3 must no longer carry the **unqualified** `File-naming: *.red.node.test.ts` claim — assert
   that the `*.red.integration.node.test.ts` form appears in the same paragraph/line as the
   `File-naming:` sentence, or that the sentence is reworded. This is CR-111 §4 item 7's second
   clause and it is currently untested (the reference implementation leaves `SKILL.md:339` intact
   and T7 is green).
b. T10 must require the doc mention **regardless** of whether the hyphen file still exists —
   deleting a test file is not "accounting for a naming form".
c. In `developer.md` and `qa.md`, require the two literals to appear inside a normal prose line
   (e.g. adjacent to a required word such as `Integration`), not merely somewhere in the file.

(a) is the load-bearing one; (b) and (c) are one line each.

### A8 — Declare the type-agnostic contract. Motivating: **REF-C bounced at 13/20**.

State, in File A's header and in the Developer dispatch: **`test-layers-declared` reads `doc.body`
only and must not consult `doc.fm` or `doc.absPath`** — every fixture ships `fm: {}` and the three
existing closed-set evaluators behave the same way. The constraint is right; it is simply
undeclared, and a type-aware design is the most natural wrong turn given the criterion is
registered in three per-type gate blocks.

---

## Non-amendment notes for the Developer and QA-Verify

1. **Target after implementation:** File A `12t 12p 0f` (11p 1f until A1 lands), File B `8t 8p 0f`,
   full suite `fail 3` (the inherited set) — or `fail 4` if T1 is left as authored.
2. **Run these two by hand; they are outside CR-111's red set and they own Cross-Cutting Rule 1:**
   `npm --prefix cleargate-cli exec -- tsx --test cleargate-cli/test/docs/gate-section-index-pinning.node.test.ts`
   (expect `14/14/0/0`) and `…/test/scripts/template-stubs.integration.node.test.ts` (expect
   `50/50/0`). M19 survives CR-111's own baseline and is caught only by these.
3. **Cross-repo sequencing.** `readiness-predicates.node.test.ts:728` and `gate-unit.node.test.ts:751`
   parse every criterion in the **live** `.cleargate/knowledge/readiness-gates.md` against the cli
   parser. Measured: registering the criterion in the live tree with no predicate in `src` turns
   **4 pre-existing tests red** across those two files. The outer-repo commit and the cli-repo
   commit are in different repositories; whichever lands first, the intermediate state is red for
   tests in files the Developer never opened. Land the cli half first, or land both before running
   the suite.
4. **Cross-Cutting Rule 6.** The cli commit is ungated. Report `npm --prefix cleargate-cli run typecheck`
   (the reference typechecks clean, `tsc --noEmit` exit 0) and the full-suite three numbers.
5. **Every freshly scaffolded story/CR/bug will carry a failing enforcing criterion from the moment
   it is created** — measured: of 400 corpus items, `triggered & pass = 0`. This is intended and
   has precedent (`prior-work-recorded` and `task-breakdown-complete` both fail on the unedited
   scaffold today), but it is a real behaviour change and the orchestrator should know it before
   merge, not after.
6. **N9 stands** — do not verify any of this through `cleargate-cli/dist/cli.js`. Everything above
   ran from source via `tsx`.

---

## Script Incidents

None. Every command was a plain Test-Stack command (`npm --prefix cleargate-cli test`,
`npx tsx --test <path>`, `npx tsc --noEmit`), plain `git`/`diff`/`command grep`, or a
scratchpad-local `python3`/`node -e`. No `.cleargate/scripts/**` invocation was required, so no
`run_script.sh` wrapper bypass occurred.

## flashcards_flagged

- `2026-08-30 · #test-harness #tpv #danger · An assertion of the form "the real artefact FAILS this criterion" is satisfiable by failing for an unrelated reason — assert on the detail/message, not just the boolean.`
- `2026-08-30 · #test-harness #tpv #danger · A red test that pins a parse-error throw is unsatisfiable by any correct implementation; it is red-phase scaffolding and must be replaced, not carried, or the story can never go green.`
- `2026-08-30 · #gate #readiness-gates #danger · A grandfathering predicate's TRIGGER is the whole design: same score on the baseline, 1 vs 79 vs 257 vs 386 of 400 corpus items failed. Pin the trigger with a pre-release fixture.`
- `2026-08-30 · #test-harness #danger · Pinning a frozen function by "slice from marker A to the NEXT function's marker" fires on an INSERTION after it — evalSection byte-identical, T9 red, message says "changed".`
- `2026-08-30 · #gate #test-harness · A regex/substring assertion over a fenced YAML block passes on syntactically INVALID YAML — three broken gate blocks scored fully green. Parse the block, don't grep it.`

---

```
TPV: PASS WITH AMENDMENTS
1. A1 (BLOCKING) — replace T1's unsatisfiable throw-pin with "declaration present, Integration row
   absent -> FAIL"; authorise deleting the throw assertion. Mutant: M6 (19/1, 1/400 vs REF's 14).
2. A2 (BLOCKING) — pin the template CONTENT (Integration row in story.md; **Test layers.** + row in
   CR.md/Bug.md) and assert T8's detail, not only its boolean. Mutant: M5 (null impl, ZERO template
   edits, 19/1, 257/400).
3. A3 (BLOCKING) — assert a pre-CR-111 §4.1 table (Unit + E2E + Performance, no Integration row)
   PASSES. Mutant: M7 (wide trigger, 19/1, 79/400).
4. A4 (BLOCKING) — fix T9's end anchor; instruct end-of-file placement. Mutant: M3d (correct impl
   bounced; evalSection byte-identical at 2110 chars; message false).
5. A5 — widen T11 to readiness-predicates.ts:3 (11 -> 12). Mutant: M12 (19/1).
6. A6 — make T4 js-yaml-parse the canonical gate blocks. Mutant: M13 (3 invalid blocks, 19/1).
7. A7 — T7 must catch the unqualified "*.red.node.test.ts" claim at SKILL.md:339; T10 must not be
   dischargeable by deleting the file. Mutants: M15 (token dump, 19/1), M14 (delete, 19/1).
8. A8 — declare the type-agnostic contract (doc.body only). Motivating: REF-C bounced at 13/20.

RULING (§4 items 1 vs 5): ABSENCE-PASSES. Measured: absence-fails would newly fail 386 of 400
  story/cr/bug items (96.5%); the version guard is unbuildable (readiness-predicates.ts:290-291,
  NaN >= NaN). Binding contract: the predicate fires only on a document that already carries a
  test-layer declaration (an `| Integration tests |` row, or a `**Test layers.**` lead-in); absent
  -> pass with a not-applicable detail; present -> all three layers declared, every count a
  non-negative integer, every 0 carrying a non-empty reason. §4 item 1's first sentence is FALSE
  post-implementation and must be rewritten to "an absent row is not a decision". T1 becomes T1'
  per A1. Side effect requiring an orchestrator edit: CR-111 fails its own gate because its Task
  Breakdown row at :108 contains the literal `**Test layers.**` — reword that row before merge.

BASELINE: reproduced exactly out of tree (A 12t/3p/9f/0s, B 8t/0p/8f/0s). One clean full-suite run
  confirms QA-Red's composed number: tests 2668, pass 2647, fail 20, skipped 1, 420s — 9 (File A)
  + 8 (File B) + 3 inherited (BUG-067 stampFrontmatter, sync MCP_TOKEN network,
  reporter-content live/canonical drift).
T6: verified BY EXECUTION at 14/14/0/0 both before and after all three template edits (third
  independent confirmation; the plan's 18/18/0/0 is S1a/S6's criteria-count title string).
TREES: cleargate-cli @ 6475274 story/CR-111 CLEAN (0 rows); .worktrees/CR-111 @ a377cd0b
  story/CR-111 CLEAN (0 rows). All mutants built out of tree under scratchpad/.
arch_bounces: DO NOT INCREMENT — wiring is sound; this is a coverage ruling.
```
