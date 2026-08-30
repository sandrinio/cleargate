# STORY-054-05 — QA-Verify

role: qa

## Execution route

`cleargate-cli/` own git repo (gitignored in the outer meta-repo). Verified in place at
`/Users/ssuladze/Documents/Dev/ClearGate/cleargate-cli`, branch `story/STORY-054-05`,
`HEAD=c79f615`. Never edited, never committed. One scratch file was created to prove the
S3b truncation check and deleted immediately after (see §3); `git status --short` shows
only the pre-existing untracked `cleargate-0.23.1.tgz` throughout.

## 1. Fixture audit — 12 rows, independently derived

Method: for each criterion, I read its `section(N)` value directly out of
`.cleargate/knowledge/readiness-gates.md` (live tree; confirmed byte-identical to
`cleargate-planning/.cleargate/knowledge/readiness-gates.md` via `diff`), then counted
`## ` headings in the corresponding template (`.cleargate/templates/*.md`) in document
order to find the heading at position N — without running the checker or the resolver.
Then I compared that independently-derived heading to the fixture's value.

| Criterion | section(N) | Heading N names (independently counted) | Fixture value | Verdict |
|---|---|---|---|---|
| `epic.scope-in-populated` | 3 | `## 2. Scope Boundaries` | `## 2. Scope Boundaries` | match |
| `epic.affected-files-declared` | 8 | `## 4. Technical Grounding (The "Shadow Spec")` | `## 4. Technical Grounding (The "Shadow Spec")` (byte-verified, see below) | match |
| `story.implementation-files-declared` | 3 | `## 3. The Implementation Guide` | `## 3. The Implementation Guide` | match |
| `story.dod-declared` | 4 | `## 4. Quality Gates` | `## 4. Quality Gates` | match |
| `cr.blast-radius-populated` | 3 | `## 2. Blast Radius & Invalidation` | `## 2. Blast Radius & Invalidation` | match |
| `cr.sandbox-paths-declared` | 6 | `## 3. Execution Sandbox` | `## 3. Execution Sandbox` | match |
| `bug.repro-steps-deterministic` | 2 | `## 2. Reproduction Protocol` | `## 2. Reproduction Protocol` | match |
| `initiative.user-flow-populated` | 1 | `## 1. User Flow` | `## 1. User Flow` | match |
| `initiative.success-criteria-populated` | 5 | `## 5. Success Criteria` | `## 5. Success Criteria` | match |
| `hotfix.anomaly-populated` | 2 | `## 1. Anomaly` | `## 1. Anomaly` | match |
| `hotfix.files-touched-declared` | 3 | `## 2. Files Touched` | `## 2. Files Touched` | match |
| `hotfix.verification-steps-nonempty` | 4 | `## 3. Verification Steps` | `## 3. Verification Steps` | match |

12 of 12 match. Every row also passes the semantic check (what the criterion id *names*
agrees with the heading text: "sandbox-paths-declared" → "Execution Sandbox",
"blast-radius-populated" → "Blast Radius & Invalidation", "affected-files-declared" →
the section carrying the `**Affected Files:**`/`**Data Changes:**` labels, etc.) — none
of the 12 is a case where the fixture agrees with the tree's current position but
disagrees with what the id names. **No kick-back on the fixture.**

`epic.affected-files-declared` special check (T5 trap): read `epic.md` line 148 as raw
bytes via a small script and compared to the fixture literal —
`'## 4. Technical Grounding (The "Shadow Spec")'` — byte-for-byte identical, parenthetical
present, embedded double-quotes intact, correctly wrapped in a single-quoted TS string.

## 2. S3b truncation-check — does it actually prove multiplicity? (TPV T3)

TPV's finding: S3a's `findings.length === 1` is satisfied identically by a checker that
stops after its first hit, so "names every criterion, not just the first" was unproven.

I made a scratch copy of the promoted test file
(`test/docs/_qa-scratch-truncated.node.test.ts`, deleted immediately after use, never
committed) and patched `checkPinning`'s return statement to
`{ findings: findings.slice(0, 1), criteria }` — i.e. simulated exactly the truncating
checker TPV described. Ran it directly with `npx tsx --test`:

```
✔ S3a: inserting "## 9. Task Breakdown" into CR.md shifts sandbox-paths-declared and the checker names it
✖ S3b: inserting "## 9. Task Breakdown" into CR.md BEFORE Blast Radius shifts two criteria at once, and the checker names both
  AssertionError: expected exactly two findings for this two-criterion shift; got 1: [{"key":"cr.blast-radius-populated", ...}]
  1 !== 2
ℹ tests 14
ℹ pass 13
ℹ fail 1
```

S3a stayed green (its insertion point only ever shifts one criterion, so truncating to 1
result is indistinguishable from exhaustive). S3b went red — a truncating checker cannot
satisfy it. This is exactly the distinguishing behavior TPV required. **S3b genuinely
closes the T3 gap.** Confirmed clean afterward: `rm` the scratch file, `git status
--short` shows only the pre-existing untracked tarball.

Also verified independently: S3b's insertion point (`## 1. The Context Override (Old vs.
New)` → before `## 2. Blast Radius & Invalidation`) is genuinely the earliest point that
shifts both BUG-042-corrected CR criteria (position 3 `blast-radius-populated` and
position 6 `sandbox-paths-declared`), matching T3's requirement, and both finding
messages are asserted verbatim (not just `assert.throws` or key-only), satisfying the
Failure-message contract T3 says is normative for S2 **and** S3.

**Context noted, not held against the Developer:** the dispatch's pointer to T3 as
containing S3b "verbatim" was wrong — T3 is prose-only (`grep -c "S3b" plans/M0.md` → 0,
independently reconfirmed). S3b is Developer-derived from T3's stated requirement + the
plan's Failure-message contract, verified by direct execution against the real canonical
tree. Scrutinized hardest per the dispatch's own instruction — it holds up.

## 3. Counting discipline

`section(` occurs 18 times as raw text in `readiness-gates.md` (1 placeholder
`section(<N>)`, 3 prose worked-examples `section(2)`/`section(3)`/`section(6)` inside the
Predicate Vocabulary paragraph, 14 real criteria). `enumerateSectionCriteria` does not
text-scan; it goes through `loadGateBlocksFromText` (extracts fenced ```yaml blocks,
`yaml.load`s them, unwraps `Array.isArray(parsed) ? parsed[0] : parsed`) and then calls
the **imported** `parsePredicate` on each criterion's `check:` string, keeping only
`parsed.kind === 'section'` hits. Confirmed by reading the code and by the passing
assertion:

```
S1a: exactly 14 section(N) criteria are enumerated (12 pinnable + 2 known-unpinnable)  ✔
S6:  KNOWN_UNPINNABLE.size === 2, both named proposal.* rows; 14 = 12 + 2               ✔
```

Confirmed the `Array.isArray(parsed) ? parsed[0] : parsed` unwrap is present at
`loadGateBlocksFromText` with an explicit comment citing `gate.ts:85` and the
BUG-041-lesson flashcard. Dropping it would `undefined` every criterion and vacuously
pass S1a at 0 — it does not.

## 4. No divergent parser

`import { parsePredicate } from '../../src/lib/readiness-predicates.js';` — confirmed
used (not a hand-rolled `/section\((\d+)\)/`) inside `enumerateSectionCriteria`. No
`/section\(/` regex literal appears anywhere else in the test file
(`grep -n 'section\\\\('` returns only the one inside `mutateCriterionIndex`'s
*registry-text-mutation* regex, which rewrites the YAML `check:` string's digit — a
different purpose from parsing, and it only ever writes, never reads/classifies a
predicate). `readiness-predicates.ts` is untouched: `git diff main..HEAD --stat --
src/` is empty.

## 5. Header (D5)

`grep -n "RED PHASE\|baseline fail\|8 of 13"` on the promoted file returns zero matches.
The current header states: promoted-by-`git mv` from `7778722`, all 14 cases expected
green, S2/S3a/S3b/S5 are permanent mutation guards (not transient red), the
"why in-memory not tmpdir" rationale (kept, block further down file untouched), the
"why canonical not live/payload" rationale (present, quoted from the M0 plan), and the T2
edit-obligation note naming both `TEMPLATE_FOR` (in this file) and
`expected-headings.ts` as required edits for any story adding a template. All present
and accurate — no stale RED-phase claim remains at the file-header level (the one
remaining "RED phase" string is inside `requireFixture()`'s *runtime* diagnostic, which
correctly describes what fires only if the fixture is later removed — appropriate to
keep, not a stale claim about current state).

## 6. Two-tree parity (S1c)

Not skipped — `describe(..., { skip: !fs.existsSync(CANON) })` and `CANON` exists in
this environment; confirmed S1c executed and passed in every run below (2.3–3.6ms, real
buffer-equality comparisons, not a no-op). It iterates `readiness-gates.md` plus all six
`Object.values(TEMPLATE_FOR)` templates, and I independently `diff`'d
`.cleargate/knowledge/readiness-gates.md` against
`cleargate-planning/.cleargate/knowledge/readiness-gates.md` myself — `IDENTICAL`.

## Re-run evidence (all by me, not trusted from the Developer's report)

**Typecheck** — `npm run typecheck` (cleargate-cli): clean, exit 0, no output.

**Targeted file, twice** (once before, once after the S3b truncation probe, to confirm
the repo was restored clean):
```
tests 14
pass 14
fail 0
skipped 0
```
All: R8 sanity ✔, S1a ✔ S1b ✔ S1c ✔, S2a ✔ S2b ✔ S2c ✔, S3a ✔ S3b ✔, S4 ✔, S5a ✔ S5b ✔,
S6 ✔, S7 ✔.

**Fixture-removed regression check** (moved `expected-headings.ts` aside, reran): S1b,
S2a/b/c, S3a, S3b, S5a, S5b all fail via the `requireFixture()` diagnostic naming the
missing path; moved back, full green again. Not vacuous.

**Full-suite corroboration.** Orchestrator's pre-established fact (dispatch) and the
Developer's report both give `tests 2493, pass 2491, fail 1, skipped 1`, the one failure
being `test/commands/sync.node.test.ts` "exits 2 when no MCP URL or token is configured."
I independently reproduced the network condition myself: `curl -s --max-time 3
https://cleargate-mcp.soula.ge/` → exit 28 (unreachable) in this sandbox. I also
independently confirmed `git diff main..HEAD --stat -- test/commands/sync.node.test.ts
src/commands/sync.ts` is empty — that file and its source are byte-identical to `main`
on this branch, so the failure cannot be caused by this story regardless of environment.
I also ran my own full-suite re-run to completion (`npm test`, ~477s,
test-isolation=process across 874 suites): **`tests 2493, pass 2491, fail 1, skipped 1`
— exact match** to both the Developer's and Orchestrator's reported figures. The single
failure is the same case, and the captured output removes any doubt about cause:
`test/commands/sync.node.test.ts` > "exits 2 when no MCP URL or token is configured" fails
because the actual stderr is literally `Error: cannot reach https://cleargate-mcp.soula.ge
(fetch failed)\n`, not a regex-mismatch on any config-error text — i.e. the CLI never
even reaches the code path under test because the outbound fetch itself fails first, in
this sandbox, for network reasons. Combined with the zero-diff confirmation on that file
and its source (§ above) and my own independent repro of the unreachable network
condition, this is conclusively pre-existing/environmental, not a regression introduced
by this story.

## Story surface / DoD cross-check

- `git diff main..HEAD --stat -- src/` — empty. Confirmed.
- Two new files only: `test/docs/gate-section-index-pinning.node.test.ts`,
  `test/fixtures/gate-section-index/expected-headings.ts`. Matches M0 §File surface
  exactly.
- All four Gherkin scenarios (story §2.1) map to passing tests: "every gated index
  resolves to its named heading" → S1b; "a reverted correction is caught" → S2a (+S2b/S2c
  for the other two BUG-042 corrections); "a new heading is caught, names every shifted
  criterion" → S3a+S3b; "the test does not drift from the evaluator" → S4.
- D1 (rename) — confirmed, no `.red.` file remains.
- T1 (no extraction to `test/helpers/`) — confirmed, checker stays inline.
- T2 (TEMPLATE_FOR + fixture both required) — note present verbatim in file header and
  fixture header.
- T4 (S6 narrowness accepted) — no widening found, S6 unchanged from QA-Red's shape.

## Flashcards flagged

None new — this pass didn't surface anything the existing `#gate #readiness-gates`
cards (S1a counting discipline, un-pinnable-set, worked-example staleness) don't already
cover.

STATUS=pass

## Verdict

PASS. All 12 fixture rows are independently correct — both positionally (matches
`section(N)` in the registry against the counted heading in the template) and
semantically (the heading matches what the criterion id names) — so this is a genuine
statement of intent, not a resolver transcript; the earlier corrupted-fixture probe (one
row flipped to the wrong heading, 4 cases red including S1b) already demonstrated the
test is not vacuous, and my independent re-derivation confirms the values it protects are
the right ones. S3b closes the TPV T3 gap for real: I proved it by forcing a
first-hit-only checker and watching S3a stay green while S3b alone went red — the exact
signature of a checker that can distinguish truncation from exhaustiveness. The counting
path goes through parsed YAML + the imported `parsePredicate`, never a text scan, and the
`loadGateBlocks` array-unwrap (the BUG-041 lesson) is intact. The header is honest about
the green state and carries both required rationales plus the T2 obligation. Two-tree
parity runs for real. To the story's actual reason for existing — will this test catch
STORY-054-06 shifting an index in M2 — yes: if 054-06 inserts `## Task Breakdown` above
`## 3. Execution Sandbox` in `CR.md`/`Bug.md`/`story.md` without updating both
`readiness-gates.md`'s `section(N)` values and `expected-headings.ts`, S1b (or S2/S3's
now-shifted resolution) fails immediately, by name, with the exact wrong-vs-expected
heading text in the message — which is precisely the failure mode BUG-042 shipped
undetected. Ship it.
