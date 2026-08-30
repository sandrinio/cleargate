---
bug_id: BUG-058
parent_ref: EPIC-043
parent_cleargate_id: "EPIC-043"
sprint_cleargate_id: "SPRINT-14"
carry_over: false
status: Draft
severity: P2-Medium
reporter: architect (STORY-054-06 post-flight)
area: planning-layer
approved: false
ambiguity: 🟡 Medium
context_source: verified codebase grounding — measured during the STORY-054-06 post-flight review (SPRINT-39 wave6). Filed per the post-flight dispatch's Part A3 instruction. Pre-existing defect, introduced 3f2011c (2026-04-26, BUG-008, SPRINT-14 M2); surfaced — not caused — by STORY-054-06's docstring correction.
created_at: 2026-08-28T00:00:00Z
updated_at: 2026-08-28T00:00:00Z
created_at_version: 33c56974
updated_at_version: 33c56974
server_pushed_at_version: null
draft_tokens:
  input: null
  output: null
  cache_read: null
  cache_creation: null
  model: null
  sessions: []
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-08-28T08:48:58Z
  transition: ready-for-fix
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
---

# BUG-058: Predicate Vocabulary omits `marker-absence` — 11 union members, 10 documented shapes, and entry 2's worked example describes the wrong matcher

### Open Questions

- **Question:** Give `marker-absence` its own numbered entry **11**, or rewrite entry **2** to document both shapes under one number?
- **Recommended:** Its own entry. The two shapes have different matchers, different failure modes and different registry usage (10 criteria vs 1 doc example); folding them keeps the count honest at the cost of hiding a real behavioural fork. A new entry also leaves entry numbers 1-10 stable, so no prose that cites "entry 8" (`Bug.md:127`, `story.md`, `CR.md`) goes stale.
- **Human decision:** {populated during Brief review}

## 1. The Anomaly (Expected vs. Actual)

**Expected Behavior:** `.cleargate/knowledge/readiness-gates.md` § Predicate Vocabulary is the single source of truth for the closed predicate set. Its declared count and its numbered entries should enumerate every member of `ParsedPredicate` in `cleargate-cli/src/lib/readiness-predicates.ts`, and each entry's worked example should describe the matcher the registry actually uses.

**Actual Behavior:** Two defects, one structural and one substantive.

1. **Count mismatch.** `ParsedPredicate` (`readiness-predicates.ts:14-25`) has **11** members. The vocabulary declares *"There are exactly **10** predicate shapes"* (`readiness-gates.md:9`) and prints **10** numbered entries (`:11`, `:24`, `:27`, `:38`, `:41`, `:44`, `:47`, `:50`, `:53`, `:56`). The missing member is `{ kind: 'marker-absence'; marker: 'TBD' | 'TODO' | 'FIXME' }` (`:16`), produced by parser branch 2a (`:61-68`), dispatched at `:173-174`, evaluated by `evalMarkerAbsence` (`:581-636`).

2. **The undocumented shape is the one 10 live criteria use, and entry 2 describes it wrongly.** Every `no-tbds` criterion in the registry — **10 of 66** criteria, one in each of the ten gate blocks — is written `body does not contain marker 'TBD'`, which parses to `marker-absence`. Vocabulary entry 2 (`:24-25`) documents only the generic `body-contains` shape and states: *"Performs a case-sensitive **substring search**… Example: `body does not contain 'TBD'` fails if the literal string `TBD` appears **anywhere** in the body."* `marker-absence` does not do that. It matches only a marker in a **syntactic role** — colon-suffixed (`<MARKER>:`), parenthesised, square-bracketed, `//`-commented, `#`-commented, or alone on its own line (`:594-604`) — and it skips a template self-reference line (`:589`). *(The five literal forms cannot be written out in this document: `no-tbds` matches them, so spelling them here fails this file's own gate — which is itself a small demonstration of the shape being undocumented.)* So the vocabulary's only worked TBD example describes behaviour **no criterion in the registry has**, and the behaviour every `no-tbds` criterion **does** have is documented nowhere.

**Why it matters:** a reader auditing `no-tbds` against the vocabulary concludes their item fails if `TBD` appears anywhere in prose. It does not. That is a fail-open surprise in the exact direction the vocabulary exists to prevent, and it is the same "documented count vs. real count" drift class as [[BUG-051]] and [[BUG-042]].

**Not caused by STORY-054-06.** `marker-absence` was introduced in `3f2011c` (2026-04-26, *"fix(BUG-008): SPRINT-14 M2 — gate criteria over-match"*) and has been undocumented since. STORY-054-06 corrected the `readiness-predicates.ts:3` docstring from a stale `6` to the true union count `11` and appended vocabulary entry 10, which is what made the 11-vs-10 gap visible for the first time.

## 2. Reproduction Protocol

Run from the repo root. Each step is deterministic and read-only.

- Count the union members:
  `sed -n '14,25p' cleargate-cli/src/lib/readiness-predicates.ts | grep -c "kind:"` → **11**
- Count the numbered vocabulary entries:
  `grep -cE '^\*\*[0-9]+\. `' .cleargate/knowledge/readiness-gates.md` → **10**
- Read the declared count: `sed -n '9p' .cleargate/knowledge/readiness-gates.md` → *"exactly **10 predicate shapes**"*
- Confirm the missing member is `marker-absence`: diff the two lists by hand; every other `kind` has a numbered entry.
- Count the criteria that depend on it:
  `grep -c "body does not contain marker 'TBD'" .cleargate/knowledge/readiness-gates.md` → **10**
- Prove the two shapes are not interchangeable — evaluate both forms against the same body (`tsx`, real exported evaluator, body = `## 1. Spec\n\nThe estimate is TBD pending measurement.\n`):
  - `body does not contain marker 'TBD'` → `{"pass":true,"detail":"no 'TBD' markers found in body"}`
  - `body does not contain 'TBD'` → `{"pass":false,"detail":"1 occurrence at §2"}`
- Confirm both trees are affected: `diff .cleargate/knowledge/readiness-gates.md cleargate-planning/.cleargate/knowledge/readiness-gates.md` → silent (byte-identical).

## 3. Evidence & Context

```
$ grep -nE '^\*\*[0-9]+\. `' .cleargate/knowledge/readiness-gates.md
11:**1. `frontmatter(<ref>).<field> <op> <value>`**
24:**2. `body contains "<string>"` / `body does not contain "<string>"`**
27:**3. `section(<N>) has <count> <item-type>`**
38:**4. `file-exists(<path>)`**
41:**5. `link-target-exists(<[[WORK-ITEM-ID]]>)`**
44:**6. `status-of(<[[ID]]>) == <value>`**
47:**7. `existing-surfaces-verified`**
50:**8. `prior-work-recorded`**
53:**9. `ambiguity-gate-resolved`**
56:**10. `task-breakdown-complete`**
                                   -> 10 entries; readiness-gates.md:9 declares 10

$ sed -n '14,25p' cleargate-cli/src/lib/readiness-predicates.ts
export type ParsedPredicate =
  | { kind: 'frontmatter'; ... }
  | { kind: 'body-contains'; needle: string; negated: boolean }
  | { kind: 'marker-absence'; marker: 'TBD' | 'TODO' | 'FIXME' }      <-- UNDOCUMENTED
  | { kind: 'section'; ... }
  | { kind: 'file-exists'; path: string }
  | { kind: 'link-target-exists'; id: string }
  | { kind: 'status-of'; id: string; value: string }
  | { kind: 'existing-surfaces-verified' }
  | { kind: 'prior-work-recorded' }
  | { kind: 'ambiguity-gate-resolved' }
  | { kind: 'task-breakdown-complete' }
                                   -> 11 members

$ tsx  (real exported evaluate(), body: "## 1. Spec\n\nThe estimate is TBD pending measurement.\n")
parse "body does not contain marker 'TBD'" -> {"kind":"marker-absence","marker":"TBD"}
parse "body does not contain 'TBD'"        -> {"kind":"body-contains","needle":"TBD","negated":true}
eval  marker form  -> {"pass":true,"detail":"no 'TBD' markers found in body"}
eval  plain  form  -> {"pass":false,"detail":"1 occurrence at §2"}
                                   -> same prose, opposite verdicts

$ grep -c "body does not contain marker 'TBD'" .cleargate/knowledge/readiness-gates.md
10                                 -> all ten no-tbds criteria use the undocumented shape

$ git log --oneline -S"marker-absence" -- cleargate-cli/src/lib/readiness-predicates.ts | tail -1
3f2011c fix(BUG-008): SPRINT-14 M2 — gate criteria over-match (proposal-approved/no-tbds/blast-radius-populated)
$ git log -1 --format='%ad' 3f2011c
Sun Apr 26 19:35:48 2026 +0400
```

## 4. Execution Sandbox (Suspected Blast Radius)

**Investigate / Modify:**
- `.cleargate/knowledge/readiness-gates.md` — `:9` (declared count) and the entry list; add entry **11** after `:56-63`, and correct entry 2's `:25` worked example so it no longer uses `'TBD'` as its illustration of a substring search.
- `cleargate-planning/.cleargate/knowledge/readiness-gates.md` — byte-identical mirror. Both trees in the same commit (SPRINT-39 Cross-Cutting Rule 1).

**Read-only (do not modify):**
- `cleargate-cli/src/lib/readiness-predicates.ts` — the code is correct. This is a documentation defect; changing the matcher would silently re-red the corpus.
- Every `no-tbds` criterion in the registry — behaviour is correct and stays.

**Explicitly out of scope:** any change to `evalMarkerAbsence`'s matching rules, and any change to the ten `no-tbds` check strings.

## Task Breakdown

> **Required at L3 and above. Optional at L2. Omit the whole section at L1.**
> An absent section passes the gate; a section that is present but carries no task rows does not.
> Write one row per executable step, in execution order:
> `- [ ] <action>` with an optional trailing `-> <requirement-id>`. The requirement reference is
> reserved for grounding ids and is not interpreted today.

- [ ] Decide entry-11-vs-fold-into-2 (Open Question) at Gate 1
- [ ] Bump `readiness-gates.md:9` to the true shape count, both trees
- [ ] Add the `marker-absence` entry: syntactic-role matcher, the five accepted forms, the template self-reference exclusion, and a worked example that contrasts it with entry 2
- [ ] Rewrite entry 2's worked example so it stops using `'TBD'` — no registry criterion uses the plain form on that marker
- [ ] `diff` the two trees — must be silent
- [ ] Add a test asserting the declared count equals `ParsedPredicate`'s member count, so this cannot drift again

## 5. Verification Protocol (The Failing Test)

**Command:** `npm --prefix cleargate-cli exec -- tsx --test cleargate-cli/test/lib/readiness-predicates.node.test.ts`

The durable fix is a new assertion (there is no existing witness — this is why the gap survived four months): parse every numbered `**N. \`shape\`**` heading out of `readiness-gates.md`, parse the `kind:` literals out of the `ParsedPredicate` union, and assert the two sets are equal. Today that assertion fails naming `marker-absence`; after the doc fix it passes. A count-only assertion (`10 === 11`) is weaker and would have been satisfied by any wrong tenth entry — assert set equality, not cardinality.

Second, cheaper witness for the same commit: assert `readiness-gates.md:9`'s declared number equals the union member count.

---

## Prior work

> `cleargate-wiki-query` was NOT dispatched for this file — the post-flight dispatch forbade every
> `cleargate wiki` command while a second session holds the wiki pages. Duplicate check was done by
> grep over `.cleargate/delivery/{pending-sync,archive}` and `.cleargate/FLASHCARD.md` instead.
> Re-run the wiki query before Gate 1 sign-off.

- [[STORY-054-06]] — the story whose docstring correction (stale `6` → true `11`) made the 11-vs-10 gap visible. Not its cause and not a kick-back; QA-Verify flagged it and the post-flight confirmed it independently.
- [[BUG-008]] — SPRINT-14 M2, `3f2011c`. Introduced `marker-absence` to fix `no-tbds` over-matching. Correct fix, undocumented shape.
- [[BUG-051]] — work-item registries drifted. Same class: a registry documented in one place and implemented in another, with no machine check tying them together.
- [[BUG-042]] — gate section index off by heading. Same file, same "the doc says one thing, the evaluator does another" failure mode.
- [[BUG-054]] — most gate criteria pass on blank template. Adjacent, distinct: that is a vacuity defect in the criteria, this is a completeness defect in the vocabulary.
- [[BUG-056]] — gate block `severity` has no machine witness. Same root cause as this bug's durable fix: parts of `readiness-gates.md` have no test reading them.

## Context Source

> Discovery audit. Populated from verified codebase grounding.

**context_source:** Measured 2026-08-28 during the STORY-054-06 Architect post-flight (SPRINT-39 wave6, outer `33c56974` / cli `a7f1c66`). Every number above was reproduced independently of the QA-Verify report: union members counted from source, vocabulary entries counted from the registry, the marker-vs-plain divergence executed against the real exported `evaluate()`, and the introducing commit found with `git log -S`. Filed on the explicit instruction of the post-flight dispatch (Part A3). No `cleargate wiki` command was run.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟡 Medium Ambiguity**

*Evaluate each criterion against its literal text. If you substituted an interpretation, leave the box unchecked and surface the substitution in the Brief.*

Requirements to pass to Green (Ready for Fix):
- [x] Reproduction steps are 100% deterministic.
- [x] Actual vs. Expected behavior is explicitly defined.
- [x] Raw error logs/evidence are attached.
- [x] Verification command (failing test) is provided.
- [ ] `approved: true` is set in the YAML frontmatter.

**Open at 🟡:** the Open Question above (entry 11 vs. fold into entry 2) is a human decision, and
`approved` is the human's to set. Everything else is measured and literal.
