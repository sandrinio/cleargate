---
bug_id: BUG-063
parent_ref: EPIC-043
parent_cleargate_id: EPIC-043
sprint_cleargate_id: "SPRINT-39"
carry_over: false
area: planning-layer
status: Draft
severity: P2-Medium
reporter: tpv-bug-045
approved: false
context_source: "Found 2026-08-29 by the BUG-045 TPV Architect while building mutant M3b (a hand-rolled id regex) and confirmed end-to-end: findInlineIdRegexHits() returns [] against a mutant file whose line 58 is literally /^HOTFIX-(\\d+)_/. Independently re-confirmed by the orchestrator by reading ID_ESCAPE directly. The gate was cited by the SPRINT-39 M4 plan as THE mechanical check that a Developer cannot hand-roll a new id grammar; it is not. Grounding: cleargate-cli/scripts/check-no-inline-id-regex.mjs:47 (ID_ESCAPE), :43-44 (TYPE_WORD), and the docstring at :50-56 which names adjacency as the previous version's defect."
created_at: 2026-08-29T00:00:00Z
updated_at: 2026-08-29T00:00:00Z
created_at_version: cleargate@0.24.2
updated_at_version: 9c1ba35f
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
  last_gate_check: 2026-08-29T09:48:54Z
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

# BUG-063: The inline-id-regex gate cannot see a capture group, which is the form it exists to catch

## 1. The Anomaly (Expected vs. Actual)

**Expected:** `npm run check:no-inline-id-regex` fails any source line that hand-rolls a work-item-id
grammar instead of using the helpers in `src/lib/work-item-id.ts`. This gate is the mechanical
backstop for [[BUG-041]] (fourteen id grammars, three divergent) and was cited by the SPRINT-39 M4
plan as the reason a Developer cannot reintroduce one.

**Actual:** it misses **every capture-group form**. `ID_ESCAPE`
(`scripts/check-no-inline-id-regex.mjs:47`) is:

```js
export const ID_ESCAPE = /-\+?(\\+d|\[0-9\]|\\+w)|\)-\+?\\+d/;
```

The first alternative requires the escape to follow the hyphen **immediately**. A capture group puts
`(` between them, so all of these are invisible:

```
/^HOTFIX-(\d+)_/        invisible
/^HOTFIX-([0-9]+)_/     invisible
/^HOTFIX-(\d+)[_.-]/i   invisible
/^HOTFIX-\d+/           CAUGHT
```

The second alternative (`\)-\+?\\+d`) only covers the *alternation* shape `(SPRINT|BUG)-\d`, where
the paren precedes the hyphen. Nothing covers a paren *after* it.

**The gate's own motivating example is the form it cannot see.** And its docstring at `:50-56`
already names this exact class of error:

> *"The first version of this gate required the type and the escape to be adjacent (`BUG-\d`), which
> missed the alternation form entirely… Requiring adjacency is how a gate ends up agreeing with the
> bug it was written to catch."*

The adjacency requirement was relaxed for alternation and left in place for capture groups.

## 2. Reproduction Protocol

1. Create a file under a path the gate globs containing exactly `const RE = /^HOTFIX-(\d+)_/;`
2. Run `npm --prefix cleargate-cli run check:no-inline-id-regex`.
3. Observe exit 0 — no hit.
4. Change the line to `const RE = /^HOTFIX-\d+/;` and re-run. Observe the gate fires.
5. Confirm mechanically: `findInlineIdRegexHits()` returns `[]` for the capture-group form.

## 3. Evidence & Context

- `cleargate-cli/scripts/check-no-inline-id-regex.mjs:47` — `ID_ESCAPE`, the defect.
- `:43-44` — `TYPE_WORD`, which is correct and not implicated.
- `:50-56` — the docstring naming adjacency as the previous version's defect.
- Found by the BUG-045 TPV Architect while building mutant M3b; `findInlineIdRegexHits()` measured
  returning `[]` against a file whose line 58 is literally that regex.
- Re-confirmed independently by the orchestrator by reading `ID_ESCAPE` directly.
- The M4 plan cites this gate as the mechanical check for BUG-045's M3 mutant class. It is not one.

## 4. Execution Sandbox (Suspected Blast Radius)

**Investigate / modify:**
- `cleargate-cli/scripts/check-no-inline-id-regex.mjs` — `ID_ESCAPE` must tolerate an optional
  capture-group opener (and a non-capturing `(?:`) between the hyphen and the escape.
- `cleargate-cli/test/scripts/check-no-inline-id-regex.node.test.ts` — add the three invisible forms
  as fixtures. **They must be red before the fix.**

**Do NOT modify:** `TYPE_WORD`, the SPRINT exemption, or `src/lib/work-item-id.ts`.

**Blast radius:** the gate runs pre-commit on the `cleargate-cli` repo. Widening it may surface
**pre-existing** hits that were always violations but invisible — expect that, and triage them rather
than narrowing the gate back to make the tree green. That triage is the real cost of this fix.

## 5. Verification Protocol (The Failing Test)

**Command:** `npm --prefix cleargate-cli test`

1. **The failing test.** `/^HOTFIX-(\d+)_/` produces a hit. **Must fail against the current tree.**
2. `/^HOTFIX-([0-9]+)_/` and `/^HOTFIX-(\d+)[_.-]/i` likewise.
3. `/^HOTFIX-\d+/` still produces a hit (regression guard — the existing behaviour).
4. `(SPRINT|BUG)-\d` still produces a hit (the alternation form the second alternative covers).
5. Prose containing `BUG-041` in a comment produces **no** hit — the false-positive guard the
   docstring says the escape requirement exists to provide.
6. A full-tree run is triaged: every newly-surfaced hit is either fixed or explicitly exempted with
   a recorded reason. **Narrowing `ID_ESCAPE` to make the tree green is a kick-back.**

## Prior work

- [[BUG-041]] — fourteen id grammars, three divergent; the reason this gate exists.
- [[BUG-048]] — an id prefix in prose minting a phantom item; the false-positive pressure that
  motivated requiring a regex escape at all.
- [[BUG-045]] — the SPRINT-39 item whose TPV found this; its mutant M3b is the live example.
- [[BUG-057]] — `deriveBucket` keying on the first underscore; same family of id-grammar drift.
- No prior item proposes changing `ID_ESCAPE`.

## Context Source

**context_source:** Found 2026-08-29 by the BUG-045 TPV Architect during mutation testing, confirmed
end-to-end against a real mutant file, and re-confirmed independently by the orchestrator reading
`ID_ESCAPE`. Not scheduled into SPRINT-39.

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟡 Medium Ambiguity**

*Evaluate each criterion against its literal text. If you substituted an interpretation, leave the box unchecked and surface the substitution in the Brief.*

Requirements to pass to Green (Ready for Fix):
- [x] The anomaly is stated as expected-vs-actual with observed evidence.
- [x] Reproduction steps are deterministic.
- [x] Evidence cites file:line or a captured transcript.
- [x] Execution Sandbox names exact file paths.
- [x] Verification protocol names a failing test that must fail against the current tree.
- [ ] `approved: true` is set in the YAML frontmatter.
- [x] Prior work records related items or an explicit none-found sentinel.

**Held at 🟡.** Six of seven criteria are met literally; the seventh is human approval. The open
question is §4's blast radius — widening the gate will surface pre-existing hits, and how many is
unmeasured. That number should be taken before scheduling, because it, not the one-line fix, is the
work.
