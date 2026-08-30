---
bug_id: BUG-061
parent_ref: EPIC-043
parent_cleargate_id: EPIC-043
sprint_cleargate_id: null
carry_over: false
area: planning-layer
status: Draft
severity: P2-Medium
reporter: architect-postflight
approved: false
context_source: "Filed 2026-08-28 by the BUG-043 post-flight Architect. BUG-043 shipped anchoring, which narrowed Defect B but did not close it; the residual is pinned as an intentionally-titled KNOWN LIMITATION test (cleargate-cli/test/lib/claude-md-anchoring.red.node.test.ts:157) and appears on no user-facing surface. The new fact that makes this filable rather than merely noted: the recorded rationale for retaining greedy is measurably FALSE after anchoring — non-greedy now returns a byte-identical 11762-char body on BOTH real CLAUDE.md files, so it no longer truncates the real block. Every number below was executed, not read. Grounding: cleargate-cli/src/lib/claude-md-surgery.ts:4-6 and :12, cleargate-cli/src/init/inject-claude-md.ts:14-18 and :23."
created_at: 2026-08-28T00:00:00Z
updated_at: 2026-08-28T00:00:00Z
created_at_version: cleargate@0.24.2
updated_at_version: 1e01ea0
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
  last_gate_check: 2026-08-28T18:36:49Z
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

# BUG-061: The greedy block match still eats user prose, and the reason it is greedy is no longer true

### Open Questions

- **Question:** Retain greedy and close the residual some other way, or flip to non-greedy now that
  anchoring has removed the reason greedy existed?
- **Recommended:** Flip to non-greedy. The recorded rationale for greedy — *"Non-greedy would stop
  at the first inline END marker in prose, cutting off the real block"*
  (`cleargate-cli/src/lib/claude-md-surgery.ts:6`) — was true of the **unanchored** pattern and is
  false of the anchored one: an inline mention is no longer a candidate anchor, so there is nothing
  for non-greedy to stop at. Measured on both real files: identical 11762-char body either way.
  The comment is a stale premise sitting three lines above the code it justifies.
- **Human decision:** {populated during Brief review}

- **Question:** Non-greedy changes what happens to a file that somehow carries **two** well-formed
  anchored blocks. Which outcome is wanted?
- **Recommended:** The non-greedy one, and say so in the comment. Measured (transcript in §3):
  greedy collapses the span and **destroys everything between the two blocks** — on the fixture, the
  line `mid` and the entire second block are gone. Non-greedy replaces the first block and leaves
  the second in place: a visible duplicate, no bytes lost. `inject-claude-md.ts:18`'s stated
  assumption is *"at most one cleargate block per file (idempotency requires it)"* — greedy enforces
  that assumption by deleting the evidence, which is the same silent-write class BUG-043 exists to
  close. A duplicate block is a loud, recoverable state; deleted prose is not.
- **Human decision:** {populated during Brief review}

## 1. The Anomaly (Expected vs. Actual)

**Expected Behavior:** Rewriting the ClearGate block in a `CLAUDE.md` never destroys content the
user wrote. This is BUG-043's stated contract, and it is the whole reason `injectClaudeMd`,
`writeBlock` and `removeBlock` do surgery instead of overwriting.

**Actual Behavior:** Two residual data-loss paths survive BUG-043, both silent, both reachable
through `cleargate init`.

**Residual 1 — a stray `<!-- CLEARGATE:END -->` alone on its own line below the block.**
Anchoring made an *inline* marker mention safe (BUG-043 Defect B, probe 4 — fixed and verified).
It did nothing for a marker that is itself anchored-shaped. The greedy body still runs to the
**last** anchored `END`, so every byte between the real END and that stray one is consumed on the
next rewrite. BUG-043 shipped this as an explicitly-titled known limitation
(`cleargate-cli/test/lib/claude-md-anchoring.red.node.test.ts:157`) rather than a fix, correctly,
because closing it meant reversing a recorded human decision mid-fix.

**Residual 2 — two well-formed blocks in one file.** Greedy matches from the first anchored START
to the last anchored END, so a replacement deletes the second block **and all user content between
them**. `cleargate-cli/src/init/inject-claude-md.ts:18` documents the intent as *"we assume at most
one cleargate block per file"*; the mechanism does not assume it, it enforces it destructively.

**The fact that changes the calculus, and it post-dates the human decision:** the reason greedy was
retained no longer holds. `cleargate-cli/src/lib/claude-md-surgery.ts:4-6` still reads *"regex MUST
be GREEDY … Non-greedy would stop at the first inline END marker in prose, cutting off the real
block."* That was correct for the unanchored regex. Under BUG-043's anchored regex an inline
mention is not a candidate match at all, so non-greedy has nothing to stop at — measured, both real
`CLAUDE.md` files return the identical 11762-character body under either quantifier. The comment
justifying the behaviour is now false, and it sits three lines above the constant it justifies,
where the next reader will use it to keep greedy.

Loss is bounded in both residuals — only text between the real END and the last anchored END — and
silent in both: no warning, no diff, no non-zero exit.

## 2. Reproduction Protocol

1. Build a `CLAUDE.md` with a well-formed block, then user prose, then a bare
   `<!-- CLEARGATE:END -->` alone on its own line, then more prose.
2. Call `readBlock` on it. Observe the returned body runs past the real END, through the user's
   prose, to the stray marker.
3. Call `injectClaudeMd` with a replacement block. Observe the prose between the two ENDs is gone.
4. Swap the quantifier in `BLOCK_REGEX` from `[\s\S]*` to `[\s\S]*?`, leaving the anchors intact.
   Re-run steps 2-3. Observe the body stops at the real END and the prose survives.
5. Read both real `CLAUDE.md` files (root and `cleargate-planning/`) under both quantifiers.
   Observe the extracted body is byte-identical — 11762 characters — either way.
6. Build a `CLAUDE.md` with **two** well-formed anchored blocks separated by a line of prose.
   Call `injectClaudeMd`. Observe under greedy that the middle prose and the second block are both
   destroyed; observe under non-greedy that nothing is lost.

## 3. Evidence & Context

Executed 2026-08-28 against `cleargate-cli` @ `1e01ea0` (BUG-043 shipped). Raw output:

```
--- real files, greedy vs non-greedy, both anchored ---
CLAUDE.md                    greedy 11762  non-greedy 11762  equal true
cleargate-planning/CLAUDE.md greedy 11762  non-greedy 11762  equal true

--- fixture H: stray END alone on its own line below the block ---
H greedy      -> "\nscaffold\n<!-- CLEARGATE:END -->\n\nuser line one\n"
H non-greedy  -> "\nscaffold\n"

--- two well-formed anchored blocks, injectClaudeMd with a replacement ---
input:
  "# P\n\n[START]\nA\n[END]\n\nmid\n\n[START]\nB\n[END]\n\ntail\n"
greedy     -> "# P\n\n[START]\nNEW\n[END]\n\ntail\n"
non-greedy -> "# P\n\n[START]\nNEW\n[END]\n\nmid\n\n[START]\nB\n[END]\n\ntail\n"
```

In the H case the greedy body swallows the real END marker and the line `user line one`; a
subsequent write puts them inside the replaced span and they are gone. In the two-block case greedy
destroys `mid` **and** the entire second block; non-greedy loses nothing.

The stale justification, verbatim (`cleargate-cli/src/lib/claude-md-surgery.ts:4-6`):

```
// IMPORTANT: regex MUST be GREEDY ([\s\S]* not [\s\S]*?)
// The block body itself may reference both markers in prose (FLASHCARD 2026-04-19 ...).
// Non-greedy would stop at the first inline END marker in prose, cutting off the real block.
```

The third line is the one measurement contradicts. `cleargate-cli/src/init/inject-claude-md.ts:14-18`
carries the same claim in its own words, plus the "at most one block per file" assumption.

**Why this is filed rather than left as a test comment.** The residual is currently recorded in
exactly two places, both of which only an engineer reading the test file will ever see: the fixture
comment at `cleargate-cli/test/lib/claude-md-anchoring.red.node.test.ts:80-87` and the test title at
`:157`. It appears in no `CHANGELOG.md` entry, no `README.md` line, no `CLAUDE.md` prose, and no
`.cleargate/knowledge/` document — verified by grep. A user whose prose was eaten has nowhere to
find out that this is known.

## 4. Execution Sandbox (Suspected Blast Radius)

**Investigate / Modify:**

- `cleargate-cli/src/lib/claude-md-surgery.ts:12` — `BLOCK_REGEX` quantifier; and `:4-6`, the
  comment whose third line is false.
- `cleargate-cli/src/init/inject-claude-md.ts:23` — the duplicate grammar; and `:14-18`, the same
  stale rationale plus the one-block assumption.
- `cleargate-cli/test/lib/claude-md-anchoring.red.node.test.ts:157` — fixture `H`'s known-limitation
  test. It asserts the **current** body verbatim, so it inverts rather than deletes: it becomes the
  proof the residual is closed.
- `cleargate-cli/CHANGELOG.md` — the residual and its resolution are user-visible.

**Measured, and load-bearing for whoever picks this up:** fixture `H` is the **sole** fixture in
the 9-row corpus that discriminates greedy from non-greedy (TPV R6, independently reproduced here).
Every other row, and both real files, are byte-identical under either quantifier. So the entire
observable blast radius of this change is one test — which is either reassuring or alarming
depending on how much you trust a 9-row corpus, and is the reason §5 asks for the two-block case to
be added rather than assumed.

**Explicitly NOT in scope:**

- Unifying the two `BLOCK_REGEX` definitions — [[CR-113]] owns that. This Bug changes one character
  in each; CR-113 changes where they come from. Either can land first.
- `cleargate-cli/src/init/root-gitignore.ts:41` — also greedy, also unanchored, different markers.
  [[CR-113]] owns it.
- Reversing anchoring, the `[ \t]*` tolerance, the `NOT_ANCHORED` guard, or either `includes`
  guard message. BUG-043 shipped those and three tests assert the messages verbatim.

## Task Breakdown

- [ ] Reproduce §3's three transcripts against current `main` and record them in the Developer report
- [ ] Write the red test for the two-block case — it does not exist in the current corpus
- [ ] Invert fixture `H`'s known-limitation test so it asserts the residual is closed; retitle it
- [ ] Change the quantifier in `cleargate-cli/src/lib/claude-md-surgery.ts:12` and `cleargate-cli/src/init/inject-claude-md.ts:23` together, in one commit
- [ ] Rewrite the stale rationale at `cleargate-cli/src/lib/claude-md-surgery.ts:4-6` and `cleargate-cli/src/init/inject-claude-md.ts:14-18` — state what anchoring changed and why non-greedy is now safe
- [ ] Re-run the real-file pin: both `CLAUDE.md` bodies must still be 11762 characters
- [ ] Run the shared-corpus equivalence loop; the two grammars must still agree on every row
- [ ] Run `npm --prefix cleargate-cli run typecheck` and `npm --prefix cleargate-cli test` by hand and report both numbers — `cleargate-cli` commits are ungated
- [ ] Add the CHANGELOG entry naming both residuals and their resolution

## 5. Verification Protocol (The Failing Test)

**Command:** `npm --prefix cleargate-cli test`

The locking tests must fail before the fix:

- **Residual 1:** given fixture `H`, `readBlock` returns `"\nscaffold\n"` — the body stops at the
  real END. Today it returns `"\nscaffold\n<!-- CLEARGATE:END -->\n\nuser line one\n"`.
- **Residual 1, write path:** `injectClaudeMd(H, NEW)` leaves the exact string `user line one`
  present in the output, and exactly one anchored START line and two anchored END lines survive.
- **Residual 2:** given a file with two well-formed anchored blocks separated by the line `mid`,
  `injectClaudeMd` leaves `mid` present. Today it is destroyed. **This test does not exist in any
  form today** — the corpus has no two-block fixture.
- **Regression, must not move:** `readBlock` on both real `CLAUDE.md` files returns a 11762-char
  body; the 9-row shared-corpus equivalence loop still agrees across both modules; fixtures
  `A`/`B`/`C`/`D`/`F`/`G`/`I`/`J` are byte-identical to today.

## Prior work

- [[BUG-043]] — the parent defect. Anchoring narrowed Defect B; this Bug is the residual its own
  N10 ruling named and pinned rather than closed. No overlap: BUG-043 changed the anchors, this
  changes the quantifier.
- [[CR-113]] — unifies the marker grammars and anchors the third one. Adjacent, not overlapping;
  either order works.
- [[CR-105]] — relocates the block to lead `CLAUDE.md`, and makes remove-then-prepend run the match
  on **every** `init` rather than occasionally. That raises this residual's exposure, so schedule
  this after CR-105 lands, not before.
- [[BUG-041]] — the duplicated-grammar precedent; same family, different subject.
- `grep -rn "stray END" .cleargate/delivery/{pending-sync,archive}` returns no prior item. The
  residual has never been filed.

## Context Source

> Discovery audit. Populated from the approved Epic, verified codebase grounding, and recorded direct approval.

**context_source:** Filed by the BUG-043 post-flight Architect on 2026-08-28. The trigger was the
question *"is the residual limitation recorded anywhere a user would find it?"* — it is not, and
investigating that surfaced the larger fact that the recorded reason for retaining greedy is
measurably false after anchoring. Every transcript in §3 was executed against `1e01ea0`, not read.
Not yet human-approved; both §0.5 questions reverse or confirm a recorded human decision and are
therefore not an agent's to default.

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

**Held at 🟡 deliberately.** Four of five criteria are met literally. The fifth is human approval,
which an Architect cannot grant itself — and here it is more than a formality: both §0.5 questions
propose reversing a decision the human recorded on 2026-08-26 ("Greedy is retained"). The premise
that decision rested on has since been measured false, which is grounds to re-ask, not grounds to
assume the answer.
