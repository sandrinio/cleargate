# Architect Post-Flight Review — STORY-043-02

**Role:** architect
**Sprint:** SPRINT-33
**Story:** STORY-043-02 Readiness Predicate Heading-Text Anchoring
**Commit reviewed:** 1002e90 on branch story/STORY-043-02 (cleargate-cli repo)
**Mode:** POST-FLIGHT (read-only design/structural review)
**Date:** 2026-06-01

---

```
ARCH-POSTFLIGHT: PASS
ISSUES: none (1 cosmetic non-blocking note recorded below)
flashcards_flagged: [entry-41-retire-confirmed]
```

---

## Verification against the six review axes

### 1. `headingTitleOf` — single shared helper, correct stripping + edge cases — PASS
Exported once at `cleargate-cli/src/lib/readiness-predicates.ts:355`. Two-stage strip:
- `/^#+\s*/` removes the `#`-run + following spaces.
- `/^\d+(\.\d+)*\.?\s+/` removes an optional numeric prefix.

Edge cases traced by hand against the regexes:
- `#`-only / title-less heading (`"##"`): returns `""` (empty string), not `null`. Benign — an empty title never equals a non-empty needle title, so no false match; the predicate needles in use are all non-empty.
- Deeply-numbered `## 3.6.1 Foo`: `\d+`=`3`, `(\.\d+)*`=`.6.1`, `\s+`=space → `"Foo"`. Correct.
- Trailing punctuation `## Why not simpler?` / `### Why not simpler?`: numeric regex does not engage (starts with `W`); the `?` is part of the title and is NOT stripped. Correct — matches the story's explicit edge requirement.
- Purely-numeric heading `## 3.5` (no text): numeric regex requires trailing `\s+`, which is absent, so it does not strip → returns `"3.5"`. No false match against any recognized title. Correct.
- Non-heading line: returns `null` (early return on `!startsWith('#')`). Correct.

### 2. `evalBodyContains` branching + `detail` parity — PASS
`headingTitleOf(needle)` at L380 is the branch discriminant: non-null title → heading-anchored line scan (L382-418); null → unchanged literal `body.indexOf(needle, pos)` scan (L420-455). The literal path is byte-for-byte the prior implementation. Both branches emit identical `detail` templates (`'${needle}' found ${count} time${…}`, `${count} occurrence${…} at ${sectionList}`, `'${needle}' not found in body`) and honour `parsed.negated` symmetrically. No regression to plain needles (`STORY-`, `Scenario:`) — verified: a non-heading needle never enters the heading branch.

### 3. `evalExistingSurfacesVerified` locator — PASS
The positional `part.startsWith("## Existing Surfaces")` test is replaced by `headingTitleOf(firstLine) === 'Existing Surfaces'` at L791, operating on the first line of each `body.split(/^(?=## )/m)` part. The split pattern, PATH_RE extraction, sandbox/existence check, sentinel handling, and not-applicable branch are all unchanged downstream. The locator now routes a numbered `## 3.5 Existing Surfaces` to the correct section.

### 4. Closed-set parser + 7 predicate shapes — PASS
No change to `parsePredicate` or the predicate grammar. The diff touches only the two evaluators' heading resolution; no new SHAPE was added. Confirmed via diff scope (only `evalBodyContains`, the new helper, and the `evalExistingSurfacesVerified` locator line changed).

### 5. Recognized-titles set vs heading-needle matching — PASS (acceptable design, no silent over-match)
The implementation matches by **equality of normalized title between the needle and a body line** (`lineTitle === needleTitle`), not against a hardcoded recognized-titles enum. This is the more general of the two acceptable designs named in the brief. It is internally consistent: a heading needle can only match a body heading carrying the *same* normalized title, so it cannot silently over-match a different section. The story's "recognized titles" list (Existing Surfaces / Why not simpler? / Technical Grounding / Reproduction Protocol) describes the needles the gate actually issues, not a constraint the matcher must enforce. No over-match risk. Acceptable.

### 6. Scope discipline — PASS
Diff = `src/lib/readiness-predicates.ts` (+77/-3) and `test/lib/readiness-predicates.node.test.ts` (+121) only. No `mcp/` or `admin/` touched. Confirmed via `git show --stat`.

---

## Cosmetic note (non-blocking)

The heading-anchored branch tracks `§` section context with `currentSection` starting at 1 and incrementing on each `^## ` line, including the matched heading's own `##` line. This yields a slightly different `§N` value than the literal branch's `sectionCount + 1` accounting for the same position. This only affects the human-readable `detail` string — it is never read for pass/fail and no test asserts the heading-branch `§N` value. Not a correctness defect; flagging only so a future edit that starts asserting section context in the heading path knows to reconcile the two counters. No action required for this story.

---

## DoD cross-check
- [x] `headingTitleOf` added, one definition, reused by both evaluators.
- [x] `evalBodyContains` matches heading needles by normalized title; plain needles stay literal.
- [x] `evalExistingSurfacesVerified` locator selects by heading text, not `startsWith`.
- [x] 4 new unit tests (numbered, releveled, plain-substring-unchanged, numbered-section locator) present and green per QA.
- [x] Typecheck clean; full suite green modulo 86 pre-existing unrelated failures (QA-confirmed).
- [x] FLASHCARD entry 41 retirement is mechanically supported (numbered headings now pass). Recommend the orchestrator/DevOps confirm the gate-parity manual step (§2.2 first bullet) before formally striking entry 41 from FLASHCARD.md.

**Verdict: PASS — ship.**
