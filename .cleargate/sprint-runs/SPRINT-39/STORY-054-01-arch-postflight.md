# STORY-054-01 — Architect Post-Flight

**Verdict: PASS.** Commit `85473ffb`, worktree `.worktrees/STORY-054-01`, branch `story/STORY-054-01`.
Two new files, byte-identical (`diff` empty), 164 lines each, no code, no tests.
`spike.md` was not edited by this pass, in either tree.

Scope: the five questions in the dispatch. The adjudication is not re-litigated — it is re-executed
(§0) and then stress-tested (§1).

---

## 0. Adjudication re-executed independently

Ran the real exported `evaluate()` (`cleargate-cli/src/lib/readiness-predicates.ts:154`) against the
committed template in **both trees**, body extracted with `templateBodyOf`'s exact frontmatter regex
(`gate-section-index-pinning.node.test.ts:221`).

| Criterion (M1 verbatim YAML) | Score on unedited `spike.md` | Result |
|---|---|---|
| `question-stated` — `section(1) has >=1 listed-item` | 0 | **fails — correct** |
| `timebox-and-kill-criteria-set` — `section(2) has >=2 listed-item` | 0 | **fails — correct** |
| `decision-log-populated` — `section(4) has >=1 declared-item` | 0 | **fails — correct** |
| `outcome-declared` — `section(5) has >=1 listed-item` | 0 | **fails — correct** |
| `no-tbds` | pass (`0` TBD in file) | correct — presence gate, not a vacuity gate |
| `ambiguity-gate-resolved` | pass (`status 🔴 (not 🟢) — no self-contradiction`) | correct |

Identical in `cleargate-planning/.cleargate/templates/spike.md`. The adjudication holds. QA's
`declared-item` measurements also reproduce exactly (§1=1, §2=2, §4=0, §5=1) — QA measured a predicate
that does not ship.

Invariant sweep, all clean: zero code fences (so invariant 6 is unfalsifiable-by-content today), zero
`SPRINT-<digits>` anywhere in the file, `{ID}`/`{ISO}`/`{SLUG}` and no fourth placeholder token, zero
`__CLEARGATE_VERSION__`, `sprint_cleargate_id` and `carry_over` both absent. Bare `---` lines at raw
49 / 86 / 147 only — 49+86 are the frontmatter pair, 147 is post-frontmatter (`hotfix.md:100`
precedent), and the probe's heading positions came out right, which is the operative proof that
`templateBodyOf` binds the correct pair.

---

## 1. Is the non-vacuity claim robust? **No. It is one edit from collapsing, and the same collapse has ALREADY happened twice in this repo, unnoticed.**

### 1.1 The claim rests on a convention with no witness

`question-stated`, `timebox-and-kill-criteria-set` and `outcome-declared` are non-vacuous **only**
because `spike.md` ships zero `- ` lines in §1/§2/§5. Nothing tests that. `gate-section-index-pinning.node.test.ts`
pins heading **text** at `section(N)`; it never evaluates a criterion against its own template.

### 1.2 Measured: the convention is already broken elsewhere in the registry

I evaluated **every** `section(N)` criterion in `readiness-gates.md` against its own shipped canonical
template. Result:

**9 of the 12 pinnable criteria already pass on the unedited template — i.e. are vacuous today.**

| Criterion | Predicate | Score on shipped template | Mechanism |
|---|---|---|---|
| `epic.scope-in-populated` | `section(3) >=1 declared-item` | 3 | BUG-050 |
| `epic.affected-files-declared` | `section(8) >=1 declared-item` | 4 | BUG-050 |
| `story.implementation-files-declared` | `section(3) >=1 declared-item` | 4 | BUG-050 |
| **`story.dod-declared`** | **`section(4) >=1 listed-item`** | **3** | **template ships `- [ ]` bullets** |
| `cr.blast-radius-populated` | `section(3) >=1 declared-item` | 3 | BUG-050 |
| `cr.sandbox-paths-declared` | `section(6) >=1 declared-item` | 2 | BUG-050 |
| `bug.repro-steps-deterministic` | `section(2) >=3 declared-item` | 3 | BUG-050 |
| **`initiative.success-criteria-populated`** | **`section(5) >=1 listed-item`** | **3** | **template ships bullets** |
| `hotfix.files-touched-declared` | `section(3) >=1 declared-item` | 2 | BUG-050 |

Non-vacuous today: `initiative.user-flow-populated`, `hotfix.anomaly-populated`,
`hotfix.verification-steps-nonempty` — three, out of twelve.

**The two bolded rows are the load-bearing finding.** They are `listed-item`, not `declared-item`.
BUG-050 does not explain them. They are vacuous for exactly the reason spike.md's guarantee is fragile:
**the paired template ships the counted shape in the gated section.** `story.md` §4 Quality Gates ships
`- [ ] Minimum test expectations…` ×3; `initiative.md` §5 ships three `- {…}` placeholders. So the
standing rule now in sprint-context ("use `listed-item` + a template shipping zero bullets") has a
silent second half — *and the repo has already violated that second half twice.* `listed-item` is not
safer than `declared-item`; it is safe only under a convention that has a 0-for-2 track record here.

### 1.3 What breaks it — enumerated by execution, not by argument

Mutations applied to the committed body, re-scored with the real `evaluate()`:

| Mutation | Effect |
|---|---|
| **M3** — §2's two `**Timebox:**` / `**Kill criteria:**` paragraphs "improved" into a 2-item bullet list | `timebox-and-kill-criteria-set` → **GREEN on an empty charter** |
| **M4** — §1's blockquote guidance turned into one bullet | `question-stated` → **GREEN on an empty charter** |
| **M1** — one `## ` heading deleted above the gated band (e.g. `## 3. Decision Unblocked`) | `## Prior work` slides to position 5 and `## 4. Decision Log`'s content to 4 → **`outcome-declared` AND `decision-log-populated` both GREEN** |
| **M2** — two headings deleted above the band | position 5 = Ambiguity Gate (5 bullets), position 4 = Prior work (1 declared-item) → **same two GREEN** |

M1/M2 matter because §6 `## Prior work` (1 `listed-item`) and §7 Ambiguity Gate (5 `listed-item`,
7 `declared-item`) are **bullet-rich sections sitting directly beneath the gated band**. The template is
one heading-deletion away from sliding a bullet-rich section into a gated slot. Nothing catches it:
Cross-Cutting Rule 4 and the pinning test both address heading **insertion**, and both would catch a
deletion only via S1b's heading-text mismatch — which fires **only if a fixture row exists**, i.e. only
after 054-02 lands. Between merge and 054-02 there is zero coverage.

Note also: STORY-054-01 Requirement 7's own parenthetical says the seven invariants "apply to
`## Prior work` as well (no `- ` bullets that would score `listed-item`)" **and** says copy `Bug.md`
verbatim. `Bug.md`'s block is a bullet. The Developer took the "copy verbatim" clause; the shipped
§6 carries one bullet. Harmless today (position 6 is ungated) and **not** a kickback — the requirement
is internally contradictory and the Developer resolved it the way that preserved sentinel-vocabulary
parity, which is the more load-bearing half. Recorded so nobody re-derives it as a defect.

### 1.4 Cheapest honest pin, and its owner

**Take this — Pin A. Owner: STORY-054-02, in the `*.node.test.ts` file it is already required to create
(`§3.1 New Files Needed: Yes`).** ~12 lines, no new file, no new surface:

```ts
// The gate this story ships must be non-vacuous: the SHIPPED template must FAIL every
// section criterion. Guards STORY-054-01 invariant 1, which is an authoring convention
// with no other witness. Measured 2026-08-27: 9 of 12 pre-existing section criteria are
// already vacuous this way (2 of them `listed-item`), so this is not hypothetical.
for (const [id, pred] of SPIKE_SECTION_CRITERIA) {
  const r = evaluate(pred, { fm: {}, body: templateBodyOf(SPIKE_TEMPLATE), absPath: SPIKE_TEMPLATE });
  assert.ok(!r.pass, `${id} passes on the UNEDITED spike.md — the gate is born vacuous: ${r.detail}`);
}
```

It catches all four mutations above (M1–M4), because every one of them makes some criterion pass on the
unedited template. It is inside 054-02's own Requirement 4 claim ("the gate is not vacuous"), not new
scope. It needs no fixture, no allowlist, no change to any merged file.

**Do NOT take Pin B here.** The general form — assert this for *every* section criterion, with a
size-asserted `KNOWN_VACUOUS` allowlist mirroring `KNOWN_UNPINNABLE` — is the right long-term shape and
now has a fully measured seed (the 9 rows in §1.2). But it edits `gate-section-index-pinning.node.test.ts`,
a merged QA-passed story's file, and it would need the allowlist populated with nine known-bad rows
before it could ever be green. **Route to the sprint report as a follow-on CR**, alongside the existing
S8 candidate. Its value is now much higher than when it was first raised: it converts BUG-050's blast
radius from prose into a size-asserted set.

### 1.5 The §4 asymmetry — real, and NOT equalizable by authoring

§4's guarantee is that a markdown table **cannot match either counter**: `|`-leading lines are excluded
by `countDeclaredItems`' definition-list regex, and they do not start with `- `. That is immunity by
*presence of a shape that cannot score*. §1/§2/§5's guarantee is *absence of a shape that would score*.
Presence-of-immune-shape survives arbitrary editing; absence does not survive a single edit. So the
asymmetry is genuine and structural, and **it cannot be equalized by rewriting `spike.md`** — there is
no prose shape that is immune to someone later adding a bullet to it.

**Verdict: the asymmetry is acceptable, but only once Pin A exists.** Equalization is a *test's* job,
not an author's. Without Pin A it is not acceptable, because §1.2 proves the convention is not merely
theoretically fragile — it has already failed, silently, in two of the six shipped gated templates.

---

## 2. Corrected Requirement 4 — correct, with one completeness gap and one behavioural finding

**Predicate kinds: correct.** STORY-054-02 Requirement 4's amended table matches the M1 plan's verbatim
YAML exactly — `listed-item` for §1/§2/§5, `declared-item` for §4 — and its four measured scores match
my independent run row-for-row. The rationale is right: `readiness-predicates.ts` is frozen, so predicate
*choice* is the only available lever.

**Completeness gap (minor, flag only).** Requirement 4's prose enumerates "question stated, timebox set,
kill criteria set, no TBD marker" and the table lists the four section criteria. It never names
**`ambiguity-gate-resolved`**, which the M1 YAML puts in the `ready-to-investigate` block, nor the
`ready-to-conclude` block's `no-tbds`. Requirement 4 does say "Add two gate blocks" and points to the
M1 §Schema-changes YAML as the copy source, so a Developer following the pointer ships all six criteria.
Not a defect; noting it so the pointer is not later dropped as redundant. **If the pointer is ever
removed, Requirement 4 becomes an under-specification of the block it governs.**

### 2.1 The §2 `>=2` threshold — answer

**What an author who writes exactly one bullet gets:** a hard fail with
`section 2 has 1 listed-item (≥2 required)`, reported by id `timebox-and-kill-criteria-set`.
That is **exactly the intended behaviour** and is test-pinned — M1's Gherkin scenario 4 asserts that
message verbatim for "a charter missing its kill criteria". `>=2` is the deliberate encoding of "§2 must
carry *both* a timebox and kill criteria". Threshold is right; keep it.

Two honest limits on that encoding, both acceptable:
- It is a **count, not a semantics check**: two bullets both about the timebox pass. Unavoidable with a
  frozen predicate set; the Ambiguity Gate checkbox ("Section 2's timebox is a concrete bound, and its
  kill criteria are conditions that could actually trigger") is the human backstop, and
  `ambiguity-gate-resolved` is its machine backstop.
- One bullet naming both ("`- Timebox 48h; kill if X`") fails. Correct-by-design — it is the shape the
  gate is trying to discourage.

### 2.2 **NEW FINDING — the gate is non-vacuous AND currently non-satisfiable-by-following-the-template**

This is the consequence of §1's trick that nobody has checked, and it is the thing I would most want
resolved before 054-02 ships.

I authored a realistic, complete spike charter **in exactly the shape `spike.md` teaches** — §1 as a
sentence ("State the single unresolved question… in one or two sentences"), §2 keeping the
`**Timebox:**` / `**Kill criteria:**` bold-label paragraph shape the template ships, §5 as prose
("State the concluding verdict here…"). Scored with the real `evaluate()`:

| Criterion | Score on a **fully and correctly authored** charter | |
|---|---|---|
| `question-stated` | 0 listed-item | **FAILS** |
| `timebox-and-kill-criteria-set` | 0 listed-item | **FAILS** |
| `outcome-declared` | 0 listed-item | **FAILS** |
| `decision-log-populated` | 0 declared-item | correctly fails (log empty pre-discovery) |

Rewriting the same three answers as `- ` bullets flips all three green.

So **three of four gated criteria will report red on a good charter**, because the template's guidance
teaches prose while the gate counts bullets. `severity: advisory` means nothing blocks — but every
authored spike will carry `cached_gate_result.pass: false` with three failing criteria, which is precisely
how a team learns to ignore a gate. It is FLASHCARD 2026-08-06 `#gate #danger` ("match the predicate to
what the template emits") inverted twice: deliberately mismatched against the *scaffold* — correct — but
accidentally mismatched against the *authored instance* too.

**Cheapest fix, and it does not conflict with invariant 1.** Amend §1/§2/§5 guidance prose to instruct
the author to record the answer as `- ` bullets. An instruction *sentence* about bullets contains no
line-initial `- `, so the template still scores 0 and stays non-vacuous. It must be phrased as prose or
inside the existing `>` blockquote — **never as a worked example bullet**, which would itself score.

**Owner: not mine to assign.** Routed as Open Decision #1 below. This is **not** a kickback on 054-01:
§1.3 explicitly scopes gate satisfiability out of this story, none of its four Gherkin scenarios covers
it, and the M1 plan's invariant 1 *required* the zero-bullet template the Developer shipped. The
predicate choice that creates the tension is 054-02's, and 054-02 has not been dispatched.

---

## 3. `## Prior work` at position 6 — **no gated position moved. Zero downstream effect. Confirmed by execution.**

Heading positions resolved from the committed file by the real splitter:

| Pos | Heading (as resolved) | Gated? | Fixture row |
|---|---|---|---|
| 1 | `## 1. The Question` | yes | `spike.question-stated` |
| 2 | `## 2. Timebox & Kill Criteria` | yes | `spike.timebox-and-kill-criteria-set` |
| 3 | `## 3. Decision Unblocked` | no | — |
| 4 | `## 4. Decision Log` | yes | `spike.decision-log-populated` |
| 5 | `## 5. Outcome & Spawned Items` | yes | `spike.outcome-declared` |
| 6 | `## Prior work` | no | — |
| 7 | `## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)` | no | — |

Identical in both trees. Every gated position is ≤5 and the decision inserted at 6, so **nothing shifted**.
The four `section(N)` values in the M1 YAML (`1`, `2`, `4`, `5`) and the four fixture rows in M1 §(d)
stand unaltered, and each pins a heading line that is a **character-exact** match to what
`resolveHeadingLine` returns from the committed file — including the `&` in heading 2 and the printed
ordinals. **Nothing moved. No finding.**

Two consequences worth recording, neither a shift:
- `prior-work-recorded` is a **closed-set, parameterless** predicate — it locates by heading text, not by
  `section(N)`. Adding `## Prior work` therefore adds **no** index coupling and **no** fixture row, now or
  if a later story adds the criterion to the spike blocks.
- Heading 7 carries a parenthetical and two emoji. Harmless *because it is ungated* — M1's T5 note applies
  and is satisfied. If any future story gates position 6 or 7, the fixture row must carry the **full**
  line including the parenthetical.

---

## 4. Producer obligations created by this merge

`spike.md` now exists **in two trees but not on `main`** — it is on `story/STORY-054-01` only, pending
DevOps merge to `sprint/S-39`. Every obligation below is conditional on that merge.

### → STORY-054-02 (wave 4)

1. **Hard precondition, verify before starting.** `gate-section-index-pinning.node.test.ts:96` sets
   `META_ROOT = path.resolve(CLI_ROOT, '..')` — always the **main checkout**, never a worktree. So
   `TEMPLATE_FOR.spike` is inert until `spike.md` is checked out in the main tree. M1 already routes
   054-02 to the main checkout on `story/STORY-054-02` off post-merge `sprint/S-39`; that routing is now
   **load-bearing, not a convenience.** Verify literally:
   `ls .cleargate/templates/spike.md cleargate-planning/.cleargate/templates/spike.md`.
2. **The T2 edit set is four assertion sites — plus three test TITLES that go stale.** Re-verified against
   the merged `db13a03`:
   | # | Site | Today | After |
   |---|---|---|---|
   | 1 | `TEMPLATE_FOR` `:111-118` | 6 rows | + `spike: 'spike.md',` |
   | 2 | `expected-headings.ts:35-56` | 12 rows | + the 4 rows from M1 §(d) |
   | 3 | S1a `:432` / `:434` | `14` / `12` | `18` / `16` |
   | 4 | S6 `:644` | `12` | `16` — and `:634` `KNOWN_UNPINNABLE.size, 2` **stays 2, do not touch** |
   | 5 | **test titles** `:430`, `:443`, `:633` | "exactly 14 … 12 pinnable + 2", "six templates", "14 = 12 pinned + 2" | 18 / 16 / seven templates |
   Site 5 breaks no build. It is exactly the class of stale prose this sprint exists to eliminate, and
   `:633`'s title would assert a number the body no longer checks.
3. **Adding the `TEMPLATE_FOR` row automatically extends S1c** (`:446` derives its byte-parity list from
   `Object.values(TEMPLATE_FOR)`), so `spike.md`'s Cross-Cutting-Rule-1 parity becomes machine-checked for
   the first time at that moment. Until then it is checked only by 054-01's one-shot `diff` (run, empty).
4. **Take Pin A** (§1.4) in the new test file.
5. **§3.1 is incomplete and must be amended before dispatch** — orchestrator action, Open Decision #2.
6. Registry edits must land in the **canonical** tree: `GATES_DOC` (`:99`) reads
   `cleargate-planning/.cleargate/knowledge/readiness-gates.md`. Both trees anyway per Rule 1, but a
   canonical-only omission makes S1a read `14` and look like the story did nothing.

### → STORY-054-03

7. **`sprint_cleargate_id` is deliberately ABSENT from spike frontmatter** (not `null`). R3's protocol
   prose — "spikes run before sprint kickoff, take no `state.json` slot, get no worktree" — should say the
   field is *omitted*, because a reader who greps for it finds nothing and will otherwise assume a bug.
   Same for `carry_over`.
8. **The Ambiguity Gate is INVERTED and the shipped body says so** (`spike.md:154-157`, outside
   `<instructions>`, so it survives stripping). R3/R4 prose must not contradict it: green means the
   *question* is sharp, never that the *answer* is known.
9. R1 edits `story.md:27`, which is inside `<instructions>` — **no `## ` heading, therefore no
   `section(N)` shift, therefore no fixture edit.** Do not open `expected-headings.ts`.

### → STORY-054-04

10. **The charter filename shape is now fixed:** `spike.md`'s instructions say
    `Output location: .cleargate/delivery/pending-sync/{ID}_{SLUG}.md` → `SPIKE-001_Some-Slug.md`.
    Underscore after the id. That satisfies `findWorkItemFile`'s `${id}_` requirement (FLASHCARD
    2026-08-24 `#id-parsing #danger`: a `-` separator makes the item unreachable). 054-04's fixtures must
    use the underscore form, or they test a filename no real charter will have.
11. 054-04's `PREFIX_MAP` row must resolve `SPIKE-`; `deriveBucket()` **throws** on an unknown prefix
    (already in its amended §3.1). Nothing new from this merge — recorded so the coupling is not re-derived.

---

## 5. Residual risk

The four spike criteria will be four of only **seven** non-vacuous `section(N)` criteria in the entire
registry, and their non-vacuity is guaranteed by an authoring convention that this repo has already
broken twice without noticing (`story.dod-declared`, `initiative.success-criteria-populated` — both
`listed-item`, both vacated by a template that ships bullets in the gated section). Until Pin A lands,
any future edit to `spike.md` — a well-meant bulleting of §1/§2/§5, or the deletion of a heading above
the gated band, which slides bullet-rich `## Prior work` or the Ambiguity Gate into a gated slot — turns
a criterion green on an empty charter with no test, no gate and no reviewer signal. The narrower hazard
the dispatch asks about is real but bounded: the template's guidance prose does score `declared-item`
(§1=1, §2=2, §5=1, BUG-050 §3.1), so **any future gate pointed at these sections with a `declared-item`
predicate is born vacuous** — which is not hypothetical, because BUG-050's own eventual fix will make
someone re-audit predicate kinds and `declared-item` is the "obvious" choice for a prose section. The
mitigation is documentary and already in place: the standing rule in sprint-context and BUG-050 §3.1.
Its weakness is that it is prose, which is the same weakness this whole sprint has been repairing.
The single sharpest residual item, though, is **§2.2** — three of four criteria red on a *correct*
charter is a live UX defect that will surface on the very first spike, before any of the vacuity risks
ever materialise.

---

## Open decisions for the orchestrator

1. **Does the §1/§2/§5 guidance get amended to instruct `- ` bullet answers (§2.2)?** Without it, three of
   four criteria are red on a correct charter. Cheapest route: add `.cleargate/templates/spike.md` + its
   `cleargate-planning/` mirror to **STORY-054-02 §3.1 Related Files** — 054-02 already runs in the main
   checkout, already opens both trees, and already must author a *passing* §1/§2 to make its own Gherkin
   scenario 3 green. Alternative is a follow-on CR, at the cost of shipping a knowingly noisy gate.
   **Not a 054-01 reopen** — §1.3 scopes gate satisfiability out. Flagged, not decided.
2. **STORY-054-02 §3.1 is incomplete and must be amended before dispatch.** It lists only
   `work-item-type.ts` + the two knowledge docs + mirrors. Missing: `cleargate-cli/src/commands/push.ts`
   (mandated by `M1/decision-2`), `test/docs/gate-section-index-pinning.node.test.ts`, and
   `test/fixtures/gate-section-index/expected-headings.ts`. Cross-Cutting Rule 6 means the cli-side gap is
   not gate-enforced — which makes an accurate §3.1 the only remaining control. Orchestrator action.
3. **Pin B (registry-wide vacuity assertion with a size-asserted `KNOWN_VACUOUS` set) → sprint report as a
   follow-on CR.** Seed measured and ready: 9 rows, listed in §1.2. Not taken here — it edits a merged
   story's file and cannot be green without the allowlist.

## Script Incidents

None. No `run_script.sh` invocation was required by this pass.

## Files changed by this pass

- `.cleargate/sprint-runs/SPRINT-39/STORY-054-01-arch-postflight.md` (this file)
- `.cleargate/sprint-runs/SPRINT-39/sprint-context.md` — appended: §Adjacent Implementations rows +
  §Mid-Sprint Amendments entries (append-only)
- `.cleargate/sprint-runs/SPRINT-39/plans/M1.md` — appended: post-flight amendment block (append-only)
- `.cleargate/FLASHCARD.md` — three cards

`spike.md` untouched in both trees. No merge, branch, commit or push. `readiness-predicates.ts` untouched
(read-only import only; `git diff` on it is empty).
