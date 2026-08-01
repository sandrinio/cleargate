---
cr_id: CR-094
parent_ref: EPIC-043
parent_cleargate_id: EPIC-043
sprint_cleargate_id: null
carry_over: false
status: Approved
approved: true
area: cli
context_source: verified codebase grounding — defect reported from a live drafting session (token-ledger CR blocked by a false 🟢 read), reproduced against readiness-predicates.ts:987 pre-fix
created_at: 2026-08-01T00:00:00Z
updated_at: 2026-08-01T00:00:00Z
created_at_version: 0.20.0
updated_at_version: 0.20.0
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-08-01T07:41:22Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id CR-094
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-08-01T08:10:54Z
  sessions: []
---

# CR-094: The Ambiguity Status Is the First Glyph, Not Any Mention of One

## 0.5 Open Questions

- **Question:** Should a `Current Status:` line carrying no 🟢/🟡/🔴 glyph at all fail instead of passing?
- **Recommended:** Pass, as it does today, but say so in the detail (`Current Status: line carries no 🟢/🟡/🔴 glyph — treated as not 🟢`). This predicate's job is to catch a *self-contradiction* — a Green claim standing next to unchecked boxes. Absence of a claim is not a contradiction, and turning it into a hard failure would block legacy items that predate the glyph convention. The explicit detail string is what stops it being silent.
- **Human decision:** {populated during Brief review}

## 1. The Context Override (Old vs. New)

**Obsolete Logic (What to Remove / Forget):**
- Forget that "the document claims 🟢" can be decided by asking whether 🟢 appears on the status line. A substring test has no notion of negation, so a line that names a status only to *deny* it reads identically to one asserting it.

**New Logic (The New Truth):**
- The claimed status is the **first** 🟢/🟡/🔴 on the `Current Status:` line. That is where the template puts it (`**Current Status: 🔴 High Ambiguity**`), and everything after it on that line is prose *about* the status, not a second claim.
- A genuine 🟢 that mentions 🟡 in passing (`🟢 Low — promoted from 🟡 after the Gate 1 review`) still fails on unchecked boxes. The check keeps its teeth.
- A `Current Status:` line with no glyph passes, and the detail says exactly that rather than staying silent.

**The failure this fixes.** `evalAmbiguityGateResolved` decided Green-ness with `statusLine.includes('🟢')`. A document honestly declaring `**Current Status: 🟡 Medium — not 🟢 until the human confirms X**` was read as claiming Green. At 🟡 an item necessarily still has unchecked boxes, so the predicate then hard-failed it for "self-contradiction" — against a document that was entirely self-consistent. Hit live while drafting the token-ledger CR. The only way through was to move the rationale to its own line, a workaround with nothing at the callsite to explain it; the next author writing an honest 🟡 would have paid the same cost.

## 2. Blast Radius & Invalidation

- [x] Invalidate/Update CR: [[CR-093]] — sibling defect from the same review pass; no logical dependency, both land together.
- [ ] Invalidate/Update Story: [[STORY-051-07]] — authored this predicate. Not reverted: its intent (backstop the "evaluate literally" discipline) is unchanged and its five acceptance scenarios still pass verbatim.
- [ ] Database schema impacts? **No.** One expression plus its detail strings.

**Downstream risk.**
- Items previously blocked by a false Green read now promote. That is the fix, but it means a 🟢 promotion that was failing for this reason will start passing — which is correct only because those documents were never claiming Green.
- Documents already carrying the "move the rationale to its own line" workaround keep working unchanged; the workaround is now unnecessary, not harmful.
- The predicate is advisory by default (`cached_gate_result.pass`); only `STRICT_PUSH_GATES=true` makes it hard-reject. Blast radius on push behaviour is correspondingly small.

## Existing Surfaces

- **Surface:** `cleargate-cli/src/lib/readiness-predicates.ts:987` — `evalAmbiguityGateResolved`, the Green-claim detection. This is the single line changed.
- **Surface:** `cleargate-cli/src/wiki/synthesis/open-gates.ts:16` — carries a NOTE recording that *the same* substring-matching mistake (`status.includes('🔴')`) was already found and fixed once, where it matched zero items in the real corpus. Precedent that this is a class, not a one-off.
- **Surface:** `cleargate-cli/src/wiki/synthesis/product-state.ts:31`, `cleargate-cli/src/wiki/synthesis/roadmap.ts:84` — use anchored `status.startsWith('🟢')`; correct, left alone.
- **Surface:** `cleargate-cli/src/wiki/lint-checks.ts:371` — uses exact equality `ambiguity === '🟢 Low'`; correct, left alone.
- **Why this CR extends rather than rebuilds:** the predicate's structure — locate the section, find the status line, count unchecked boxes — is right, and its five STORY-051-07 acceptance scenarios encode behaviour worth preserving. Only the Green-detection expression is wrong. A `grep` of `src/` for glyph substring tests confirms this was the last remaining instance, so the change is one expression plus honest detail strings, not a rewrite.

## Prior work

- [[CR-093]] — the other defect found in the same pass; both are "a check that looked right and silently decided the wrong thing".
- [[STORY-051-07]] — introduced `ambiguity-gate-resolved` and the `includes('🟢')` expression this CR replaces.
- [[STORY-002-09]] — the open-gates corpus-shape fix, the first time a status-glyph substring match was caught in this codebase.
- No prior item addresses negation handling in status parsing.

## 3. Execution Sandbox

**Modify:**
- `cleargate-cli/src/lib/readiness-predicates.ts` — replace the `includes('🟢')` test with a first-glyph match; add the no-glyph branch and its detail; extend the function docblock.
- `cleargate-cli/test/lib/readiness-predicates-prior-work-ambiguity.node.test.ts` — four regression tests.
- `cleargate-cli/CHANGELOG.md` — Unreleased entry.

## 4. Verification Protocol

**Command/Test:** `cd cleargate-cli && npm run typecheck && npm test`

- Targeted suite: **22 pass / 0 fail**, including the five original STORY-051-07 acceptance scenarios unchanged.
- The four new tests were run against the pre-fix expression and reproduced the defect: `AssertionError: an honest 🟡 must not be read as a 🟢 claim just because it names 🟢`. They pass post-fix.
- Old logic evicted: `grep -rn "includes('🟢')" src/` returns only the comment describing the removed code.
- Teeth retained: `CR-094: a real 🟢 claim that also names 🟡 still fails on unchecked boxes` asserts `pass === false`.

---

## Context Source

**context_source:** verified codebase grounding. Defect reported from a live drafting session where the token-ledger CR was blocked by a false Green read; root-caused to `readiness-predicates.ts:987` and reproduced pre-fix with a targeted test. No PM-tool or remote input.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity — promoted from 🟡 at Gate 1**

*The status line above carries both glyphs on purpose — this document is its own regression case. At 🟡 it read `🟡 … not 🟢 until approved`, which the old substring test misread as a Green claim and hard-failed on the then-unchecked box. Promoted to 🟢 it reads `🟢 … promoted from 🟡`, the mirror case: first glyph wins, so this IS a Green claim, and it passes only because every box below is now checked. Both halves of the fix, on one line, without the move-it-to-its-own-line workaround.*

Requirements to pass to Green (Ready for Execution):
- [x] "Obsolete Logic" to be evicted is explicitly declared.
- [x] All impacted downstream Epics/Stories are identified and reverted to 🔴 High Ambiguity.
- [x] Execution Sandbox contains exact file paths.
- [x] Verification command is provided.
- [x] `approved: true` is set in the YAML frontmatter.
- [x] Existing Surfaces cites at least one source-tree path the CR extends.
