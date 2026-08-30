# STORY-054-05 — Architect Post-Flight (§C.6)

role: architect
mode: POST-FLIGHT REVIEW
Branch under review: `story/STORY-054-05` in the `cleargate-cli` checkout, `HEAD=c79f615` (two commits ahead of its `main`).
Verdict: **PASS** — cleared for DevOps merge into `sprint/S-39`.

Nothing QA-Verify checked is re-derived here. Every claim below cites the shipped test file
(`cleargate-cli/test/docs/gate-section-index-pinning.node.test.ts`) or the fixture
(`cleargate-cli/test/fixtures/gate-section-index/expected-headings.ts`) by line.

---

## 1. Forward-compatibility judgment

### 1.1 The fixture is index-free. This changes what Cross-Cutting Rule 4 actually demands.

`EXPECTED_HEADINGS` (`expected-headings.ts:35-56`) maps `<type>.<criterion-id>` → **heading line
text**. No `section(N)` integer appears anywhere in the fixture. `checkPinning` (`:283-292`)
resolves the index out of the *registry* and compares only the resulting heading text.

Consequence, stated plainly because three downstream stories depend on it:

> **When a story inserts a `## ` heading AND correctly recomputes the shifted `section(N)`
> values in `readiness-gates.md`, the fixture needs ZERO edits.** The fixture changes only when
> a criterion's *target heading text* changes (a rename) or a *new pinnable criterion* appears.

Cross-Cutting Rule 4 currently reads "...AND update the fixture at `expected-headings.ts`". That
is over-broad. A Developer who takes it literally will open the fixture looking for something to
change, find nothing that needs changing, and is then one keystroke from the exact tampering the
rule forbids. Rule 4's real content is: **decide and fix the index first; touch the fixture only
if the heading a criterion names has changed.** Recorded as an amendment in §4 below.

### 1.2 STORY-054-06 inserts `## Task Breakdown` — which cases go red, and with what message

Verified heading positions in the canonical bodies (post-frontmatter, `## ` in document order):

| Template | Positions |
|---|---|
| `story.md` | 1 §1 The Spec · 2 §2 The Truth · 3 §3 The Implementation Guide · 4 §4 Quality Gates · 5 Existing Surfaces · 6 Prior work · 7 Why not simpler? · 8 Ambiguity Gate |
| `CR.md` | 1 `0.5 Open Questions` · 2 `1. The Context Override` · 3 `2. Blast Radius & Invalidation` · 4 Existing Surfaces · 5 Prior work · **6 `3. Execution Sandbox`** · 7 `4. Verification Protocol` · 8 Context Source · 9 Ambiguity Gate |
| `Bug.md` | 1 `1. The Anomaly` · **2 `2. Reproduction Protocol`** · 3 `3. Evidence & Context` · 4 `4. Execution Sandbox` · 5 `5. Verification Protocol` · 6 Prior work · 7 Context Source · 8 Ambiguity Gate |

**CASE A — heading inserted, registry NOT corrected.** This is the exact BUG-042 failure mode and
the reason this story exists.

- `story.md`, insertion after §3 (054-06 Requirement 4, verbatim): `story.dod-declared` stays
  `section(4)`, now resolves to the new heading. **S1b** (`:437-441`) goes red with the contract
  line from `:290`:
  `story.dod-declared: section(4) in story.md resolves to "## Task Breakdown", expected "## 4. Quality Gates"`
- `CR.md`, insertion anywhere at or above position 6: `cr.sandbox-paths-declared` stays
  `section(6)` and resolves to the heading that used to be at 5. **S1b** red:
  `cr.sandbox-paths-declared: section(6) in CR.md resolves to "## Prior work", expected "## 3. Execution Sandbox"`
  Insertion at or above position 3 additionally shifts `cr.blast-radius-populated` — **S1b** names
  both (`checkPinning` never truncates; S3b proves it), and **S2a** (`:472`) goes red because its
  neighbour assertion `/## 2\. Blast Radius & Invalidation/` no longer describes position 3.
- `Bug.md`, insertion at or above position 2: **S1b** red on `bug.repro-steps-deterministic`.
  Insertion at position 3 or below: nothing fires, correctly — nothing shifted.

All CASE A failures name the criterion, the wrong resolved heading and the intended heading. Loud
and specific.

**CASE B — heading inserted AND registry correctly recomputed.** `story.md` `dod-declared` 4→5
resolves back to `## 4. Quality Gates`; S1b green, **no fixture edit**. This is the correct-and-
cheap path.

But note the tripwire that fires *even on the correct path*: **S3a** (`:544-547`) and **S3b**
(`:582-589`) assert **exact, full message strings** built from today's `CR.md` layout —
`section(6) in CR.md resolves to "## Prior work"` and `section(3) ... resolves to "## 9. Task
Breakdown"`. Any real heading inserted into `CR.md` at or above position 6 changes those synthetic
post-mutation positions, so S3a/S3b go red **whether or not the registry was corrected**, and they
present as an assertion-text mismatch rather than as a gate defect. That is a test-maintenance
obligation on 054-06 that no plan currently records. It is discharged in §4.

**Zero-churn placement exists and I am specifying it** (see §3): `CR.md` → insert immediately
**after** `## 3. Execution Sandbox` (new position 7); `Bug.md` → immediately **after**
`## 2. Reproduction Protocol` (new position 3). Both leave every gated index, every hardcoded
assertion string, and the `readiness-gates.md:36` worked example untouched. `story.md` keeps its
specified placement after §3, costing exactly one digit in the registry (`section(4)`→`section(5)`,
both trees) and nothing else.

**CASE C — heading inserted, registry NOT corrected, fixture edited to match.** The kick-back
shape. Coverage is **uneven and this is the artifact's sharpest residual weakness**:

| Fixture row | Second witness beyond S1b | Tampering caught? |
|---|---|---|
| `cr.sandbox-paths-declared` | S2a `:471`, S3a `:546`, S3b `:588` | **yes** |
| `cr.blast-radius-populated` | S2b `:482`, S3b `:584` | **yes** |
| `epic.affected-files-declared` | S2c `:493` | **yes** |
| `story.implementation-files-declared`, `story.dod-declared`, `bug.repro-steps-deterministic`, `initiative.*` ×2, `hotfix.*` ×3 (9 rows) | none — S1b is the only reader | **no** |

The three BUG-042 criteria are double-witnessed because S2/S3 hardcode their expected heading text
independently of the fixture. The other nine are single-witness: edit the row, S1b goes green,
gate silently re-broken. **STORY-054-06 touches `story.md` and `Bug.md` — three of the nine
unguarded rows.** Accepted, not fixed (see §6); the mitigation is procedural (Rule 4 + the fixture
header), not mechanical.

### 1.3 Is the correct-use instruction co-located with the guard?

**Yes.** `expected-headings.ts:20-32` (invariant 3) states it verbatim, including the words
"Editing a row here to match whatever the tree currently resolves to — WITHOUT first deciding and
fixing the `section(N)` value in `readiness-gates.md` — silently re-breaks the gate; this is a QA
kick-back". That header sits in the one file a tempted Developer must open. The test file header
(`:69-77`) carries the T2 edit obligation. **This is not a half-guard** — the doctrine ships with
the artifact and does not depend on `sprint-context.md`, which ships nowhere.

One gap, accepted: the mismatch message at `:290` names the criterion, the template and both
headings but does **not** name `expected-headings.ts`. Only the missing-row branch (`:278`) and the
missing-template branch (`:268-269`) name their remediation file. A Developer reading CI output
alone gets the numbers, then has to open the fixture to meet the doctrine — one hop, and the word
"expected" in the message points there. Not worth a kickback.

### 1.4 A gated type gains a template with no fixture row — loud, confusing, or silent?

Read from the code, in the order the sprint will actually hit it:

- **STORY-054-01 ships `spike.md` with no gate blocks** (054-01 §1.3, Out of Scope, verbatim).
  Nothing in the registry mentions `spike`, so `enumerateSectionCriteria` still returns 14 and the
  test stays 14/14 green. Correct behaviour — nothing to pin yet.
  **But:** `S1c` (`:443-460`) derives its live↔canonical byte-parity list from
  `Object.values(TEMPLATE_FOR)` (`:446`). Until `spike: 'spike.md'` is in the map, **`spike.md`'s
  Cross-Cutting Rule 1 two-tree parity is not machine-checked at all.** 054-01 should add the map
  row in its own commit even though it ships zero criteria: it is one line, it cannot fail (S1c
  skips non-existent paths at `:451`), and it buys parity coverage a wave early.
- **STORY-054-02 adds the `work_item_type: spike` gate blocks** using "the existing `section(N)
  has >=1 declared-item` ... predicates" (054-02 §3.2, verbatim). At that moment three assertions
  fire at once:
  - **S1a** (`:432`, `:434`) — `assert.strictEqual(criteria.length, 14)` and `pinnable.length, 12`.
    Message lists every enumerated key, so the diff is self-explanatory.
  - **S6** (`:643-644`) — `unpinnableInRegistry.length === 2` and
    `criteria.length - unpinnableInRegistry.length === 12`.
  - **S1b** — one finding per spike criterion, with exact remediation text:
    - no `TEMPLATE_FOR` row → `spike.<id>: no template found for work_item_type "spike" — either add one to TEMPLATE_FOR or add "spike.<id>" to KNOWN_UNPINNABLE` (`:268-269`)
    - map row present, fixture row absent → `no expected heading declared for spike.<id> — add one to expected-headings.ts` (`:278`)

  **Loud, not confusing, not silent.** And the escape hatch offered in the `:268` message is itself
  guarded: taking it trips `S6`'s `KNOWN_UNPINNABLE.size === 2` (`:634`). A Developer cannot make
  the test green by declaring a criterion un-pinnable. That is a properly closed loop.

**Answer to the core question: yes, this guard survives contact with 054-06 and 054-02, and it
fails loudly and by name in every case that matters.**

---

## 2. T2 discharge — the complete edit set for adding a template

`TEMPLATE_FOR` exists as recorded, at `gate-section-index-pinning.node.test.ts:111-118`:

```ts
const TEMPLATE_FOR: Record<string, string> = {
  epic: 'epic.md',
  story: 'story.md',
  cr: 'CR.md',
  bug: 'Bug.md',
  initiative: 'initiative.md',
  hotfix: 'hotfix.md',
};
```

**(a) Correct against the code — yes.** `canonicalTemplateReader` (`:309-315`) returns `null` when
`TEMPLATE_FOR[workItemType]` is absent, and `checkPinning:265-272` converts that `null` into the
`no template found for work_item_type "spike"` finding. T2's predicted failure text is exactly
what the code emits.

**(b) Sufficient — NO. There is a third site, and it holds two literals.**

Complete edit set for a story that adds a gated template with `section(N)` criteria:

| # | Site | Edit |
|---|---|---|
| 1 | `gate-section-index-pinning.node.test.ts:111-118` `TEMPLATE_FOR` | add `spike: 'spike.md'` |
| 2 | `expected-headings.ts:35-56` | one row per new **pinnable** criterion, full heading line |
| 3 | `gate-section-index-pinning.node.test.ts:432` and `:434` (**S1a**) | bump `14` → `14+k` (total) and `12` → `12+k` (pinnable) |
| 4 | `gate-section-index-pinning.node.test.ts:644` (**S6**) | bump the `12` in `criteria.length - unpinnableInRegistry.length === 12` |

Sites 3 and 4 are hardcoded totals. They are **intentional** — the M0 plan's S6 says "Silence is
not a pass", and a hardcoded total is precisely what makes a silent registry addition impossible.
But T2 as written ("`TEMPLATE_FOR` **as well as** fixture rows") stops one site short, and a
Developer who edits only sites 1+2 lands a red S1a/S6 and may reasonably conclude they got the
fixture wrong. Site 4 additionally constrains the reverse direction: any criterion added to
`KNOWN_UNPINNABLE` must also move `:634`'s `size, 2`.

Note the ordering property this creates and that 054-02 must respect: sites 3 and 4 can only be
bumped to the *correct* number once the registry blocks exist, so **all four edits belong in
054-02's single commit** (with site 1 optionally pre-landed by 054-01 as recommended in §1.4).

Recorded in `sprint-context.md` §Adjacent Implementations.

---

## 3. R11 discharge

**Claim verified against the shipped test: no case reads the worked example.** `S7`
(`:649-663`) does read the same paragraph — `extractPredicateVocabularySection` (`:360-369`) slices
`## Predicate Vocabulary` (canonical `readiness-gates.md:7`) to the next `## ` — but its extractor
regex is `/`(cleargate-cli\/test\/[^`]*\.node\.test\.ts)`/g` (`:373`). It pulls **only backticked
test paths**. The sentence "`## 3. Execution Sandbox` in `CR.md` is `section(6)`, not
`section(3)`" (canonical `readiness-gates.md:36`) is never parsed, never resolved, never compared.
**R11(a) stands exactly as written: the worked example is unpinned prose.**

### Disposition — cheaper structural fix, chosen

**Primary (M2 obligation on STORY-054-06): choose the zero-shift placement, and the prose problem
disappears rather than being maintained.**

- `CR.md` — insert `## Task Breakdown` immediately **after** `## 3. Execution Sandbox` (it becomes
  position 7). `cr.sandbox-paths-declared` stays `section(6)`; the worked example at `:36` stays
  true; no registry edit; S2a/S3a/S3b assertion strings untouched. This is also the better
  authoring position — an execution checklist directly under the sandbox declaration, above the
  verification protocol.
- `Bug.md` — insert immediately **after** `## 2. Reproduction Protocol` (position 3).
  `bug.repro-steps-deterministic` stays `section(2)`; nothing shifts.
- `story.md` — keep 054-06 Requirement 4's specified placement after §3. `story.dod-declared`
  moves `section(4)` → `section(5)` in `readiness-gates.md`, **both trees**, same commit. No fixture
  edit (heading text unchanged, §1.1). No test-file edit.

**Fallback, if 054-06 insists on placing above Execution Sandbox for authoring reasons** — its DoD
must then carry all four of:
1. `readiness-gates.md` `cr.sandbox-paths-declared` `section(6)` → `section(7)`, both trees.
2. **Rewrite the worked example at `readiness-gates.md:36`, both trees** — and keep the backticked
   path `cleargate-cli/test/docs/gate-section-index-pinning.node.test.ts` in that paragraph, or
   **S7 goes red** (`:656-659` asserts the vocabulary section cites exactly that path).
3. Update the hardcoded message strings in **S3a** (`:546`) and **S3b** (`:584`, `:588`).
4. If the insertion is also above `## 2. Blast Radius & Invalidation`, update **S2a** (`:472`) and
   **S2b** (`:483`) neighbour assertions and the `section(3)` registry value.

**Rejected: delete the falsifiable sentence.** Tempting, and it would end the maintenance — but the
same paragraph is what S7 depends on. Any prose edit there must preserve the backticked path.

**Rejected for this sprint, recorded as a candidate follow-on CR: an S8 that pins the prose.**
~8 lines reusing `templateBodyOf`/`resolveHeadingLine` to extract
``` `## X` in `Y.md` is `section(N)` ``` from the vocabulary section and assert the resolution.
It is the durable fix — EPIC-052 WS1 adds `## Grounding` to five templates next sprint and will
re-falsify the example — but it is a new assertion inside a merged, QA-passed story's file and is
new scope for 054-06. Routed to the sprint report alongside the R1 and R5 residues.

Recorded in `sprint-context.md` §Mid-Sprint Amendments as an M2 obligation.

---

## 4. Guard notes for three downstream M-plans (R12 carry-over) — with a material correction

### 4.1 `hotfix.ts` claim — verified, and it holds

`cleargate-cli/src/commands/hotfix.ts:178-182`:

```ts
  // ── Substitute placeholders ──────────────────────────────────────────────
  const content = templateContent
    .replace(/\{ID\}/g, idStr)
    .replace(/\{SLUG\}/g, opts.slug)
    .replace(/\{ISO\}/g, now);
```

Three substitutions, then `fs.writeFileSync(outPath, content)` at `:191`. `grep -n instructions
cleargate-cli/src/commands/hotfix.ts` returns exactly one hit — a doc comment at `:131`. **Zero
`<instructions>` handling. R12's verbatim-render claim is confirmed.**

### 4.2 `story.md` `SPRINT-` occurrences — verified, and they are NOT where R12 says they matter

`SPRINT-09` appears at raw lines **28** and **45** of `.cleargate/templates/story.md`, byte-identical
in `cleargate-planning/.cleargate/templates/story.md`. Both are **inside the `<instructions>` block**
(lines 1–62); the frontmatter is lines 64–105. `awk 'NR>105' .cleargate/templates/story.md | head -50
| grep 'SPRINT-[0-9]'` returns **nothing** — the post-frontmatter body's first 50 lines are clean.

### 4.3 CORRECTION to R12 — the exposure is latent-zero on both render paths today

`backfill_hierarchy.mjs` `parseFm` (`:70`) opens with `if (!raw.startsWith('---')) return null;`.
All seven authoring templates (`Bug.md`, `CR.md`, `Sprint Plan Template.md`, `epic.md`, `hotfix.md`,
`initiative.md`, `story.md`) begin with `<instructions>` at line 1 — verified by `head -c 3` on each.
Therefore:

- **Verbatim render path** (today's `cleargate hotfix new`): the emitted item starts with
  `<instructions>`, `parseFm` returns `null`, and the backfill **skips the file entirely** — no
  sniff, no write, no phantom stamp. R12's "phantom attribution on **every** newly scaffolded
  story, shipped as default behaviour" does **not** hold for this path.
- **Stripped render path** (instructions removed on render — CR-108's recommended fix): the item
  starts with `---`, so `body` is post-frontmatter content, where no template today carries a
  `SPRINT-<digits>` in its first 50 lines. Also clean.

The 19 real mis-attributions came from **hand-authored** items that already start with `---` and
mention a sprint in their first 50 body lines. That mechanism is untouched, still real, and still
justifies the close-gate obligation already recorded in `sprint-context.md`.

**The load-bearing consequence for CR-108:** stripping `<instructions>` is *precisely what makes a
scaffolded item backfill-visible for the first time*. CR-108 cannot ship the strip without also
settling `sprint_cleargate_id`, or it converts today's latent-zero exposure into a live one in the
same commit. That coupling was not previously recorded anywhere.

### 4.4 The three guard notes, phrased against the body

All three are recorded in `sprint-context.md` §Mid-Sprint Amendments (§4 of that file), ISO-stamped,
one line each, in the existing format. Phrased against the **post-frontmatter body**, not the raw
file — a Developer told to purge `SPRINT-` from the raw file will waste a dispatch removing
harmless `<instructions>` prose.

---

## 5. sprint-context §Adjacent Implementations — updated

Four rows appended plus five "do not re-derive" facts. See
`.cleargate/sprint-runs/SPRINT-39/sprint-context.md`. Append-only; no existing row rewritten.

---

## 6. Residual risk

**Nothing about this artifact makes the remaining 11 waves harder.** It makes two of them
(054-02, 054-06) *louder*, which is the point. Four risks accepted rather than fixed:

1. **Nine of twelve fixture rows are single-witness (§1.2 CASE C).** Only S1b reads them, so
   editing a row to match a drifted tree goes green. The three BUG-042 criteria are double-
   witnessed by S2/S3; the rest are not. Mitigation is procedural — `expected-headings.ts:20-32`
   plus Cross-Cutting Rule 4. **Accepted**: a second witness for every row means duplicating the
   fixture, which is a pin of a pin. STORY-054-06 touches three of the nine unguarded rows, so
   QA-Verify on 054-06 must read the registry diff, not just the test result.
2. **S3a/S3b hardcode full post-mutation message strings (`:546`, `:584`, `:588`).** They fire on
   any `CR.md` restructuring at or above position 6, correct-or-not, and present as an assertion
   mismatch rather than a gate defect. **Accepted** — the zero-shift placement in §3 avoids it
   entirely, and the fallback DoD covers it if 054-06 chooses otherwise.
3. **S7 hard-couples the test to prose.** It requires `## Predicate Vocabulary` to exist as a
   literal heading (`:361`, throws otherwise) and to keep citing this test's exact path
   (`:656-659`). Any restructuring of `readiness-gates.md` headings, or a rewrite of that paragraph
   that drops the backticked path, turns S7 red. **Accepted** — that is R11(b) working as designed;
   recorded so nobody reads it as a defect.
4. **`mutateCriterionIndex` (`:333`) is not block-scoped.** Its regex matches the first
   `- id: <id>` followed by a `section(` check anywhere in the registry. Duplicate criterion ids
   across gate blocks are already normal (`no-tbds` ×8), but all three ids S2 mutates are unique
   today (verified ×1 each) and none of 054-02's spike ids collides. **Accepted**, low
   probability, and the helper throws a named error rather than silently mis-mutating if the
   anchor stops matching.

No defect found. No KICKBACK.

---

## Script Incidents

None. No `run_script.sh` invocation was required; all findings are from Read/Grep and two
read-only `git`/`awk` probes in the `cleargate-cli` checkout. Nothing under `cleargate-cli/**` was
edited, no branch operation was run, nothing was committed.
