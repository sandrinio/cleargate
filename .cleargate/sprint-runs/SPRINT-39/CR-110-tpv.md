---
story_id: CR-110
sprint_id: SPRINT-39
mode: TPV
wave: 12
milestone: M4
generated_by: architect
generated_at: 2026-08-29
baseline_commit: f72e78f9
verdict: PASS-WITH-AMENDMENTS
arch_bounces_increment: false
---

# CR-110 TPV — mutation gate on the QA-Red baseline

role: architect

## Verdict

**`TPV: PASS WITH AMENDMENTS`** — 7 amendments, **4 BLOCKING** (A1, A2, A3, A4).

**Wiring is sound. `arch_bounces` MUST NOT increment.** Every path the harness cites resolves
(`init_sprint.mjs:37-39` `CLEARGATE_REPO_ROOT`, `:242` the `--force` guard, `:253` the template
read, `:270-275` the goal splice, `:300` the atomic rename); the `CLEARGATE_ADVISORY=1` +
`CLEARGATE_REPO_ROOT` isolation idiom works; `TEMP_DIRS` + `trap cleanup EXIT` leaves no orphan
state; both trees are byte-identical (`md5 e2b6352bc6792d56d5cd3b9cfd233254`); `bash -n` is clean;
the run is deterministic across 3 runs at **22 passed / 12 failed, exit 1**; and a correct
reference implementation reaches **33 passed / 1 failed** (the pre-existing SAFETY assertion only).
The baseline is satisfiable and well-formed. This is a **coverage** ruling.

The rejection reason is single and specific: **seven distinct wrong implementations score
identically to a correct reference (33/1), one assertion cannot be flipped by any content mutation,
and one plausible correct implementation is bounced.**

Blunt first-class finding, measured, stated in §Finding 1: **the G5/G6 prose-contract half is a
vocabulary checklist, not an acceptance test.** Two HTML comment lines carrying nothing but the
greped tokens score a clean 33/1.

---

## What was run, and where

Everything ran **out of tree**. `.worktrees/CR-110` was copied with
`tar cf - --exclude='.git' .` into
`/private/tmp/claude-501/-Users-ssuladze-Documents-Dev-ClearGate/49c00a07-a425-4af9-9ac6-97ed8ed5ee64/scratchpad/base`
and every mutant is an independent `cp -a` of that base. The worktree was never written to.

Confirmed at exit:

```
$ git -C .worktrees/CR-110 status --porcelain
                                   (empty)
$ git -C .worktrees/CR-110 rev-parse HEAD
f72e78f975d379d5fb536ff0edb196901a6259f2
$ git -C .worktrees/CR-110 rev-parse --abbrev-ref HEAD
story/CR-110
$ md5 .worktrees/CR-110/.cleargate/scripts/test/cr078_init.test.sh
       ... = e2b6352bc6792d56d5cd3b9cfd233254   (unchanged, both trees)
```

No commit, no branch switch, no `close_sprint.mjs` invocation, no `init_sprint.mjs` run against
the live sprint tree — every fixture uses `SPRINT-99` under a `mktemp -d` project root. The main
checkout's 27 modified paths all pre-date this dispatch (delivery docs `mtime 23:26:24`, the cli
suite started `23:32:17`); the only files this dispatch wrote in the main checkout are this report
and four FLASHCARD lines.

N10 honoured throughout: every suite run redirects to a log file and the status line is parsed from
the completed file. No `tail`/`head` in any runner pipeline.

## Determinism — CONFIRMED

| Run | Result | Exit |
|---|---|---|
| base 1 | `22 passed, 12 failed` | 1 |
| base 2 | `22 passed, 12 failed` | 1 |
| base 3 | `22 passed, 12 failed` | 1 |
| REF_wrapped 1/2/3 | `33 passed, 1 failed` | 1 |

`diff` of the full `^PASS:|^FAIL:` label set across base runs 1 and 3: identical. QA-Red's
measurement reproduces exactly, out of a git repository, in a non-git copy.

**34 assertions.** 11 CR-110 reds (`G1a G1b G2b G4a G4b G5a G5b G5d G6a G6b G6c`) + 1 pre-existing
(`SAFETY`, hardcodes `expected SPRINT-34` at `cr078_init.test.sh:635`; fails identically on the
main checkout; out of surface; not fixed).

---

## Kill matrix — every mutant, measured

Target for a correct implementation: **33 passed / 1 failed** (SAFETY only).

| # | Mutant | Result | Killed by | Verdict |
|---|---|---|---|---|
| — | **REF_unwrapped** — correct; one-line placeholder, whitespace-normalised detection | **33 / 1** | — | reference ✓ |
| — | **REF_wrapped** — correct; CR-body wrapped placeholder, normalised detection | **33 / 1** | — | reference ✓ |
| M1 | word salad — tokens scattered, incoherent, instructs judgement | 32 / 2 | G6c only | near-miss |
| M1b | ditto, `does not` 5 lines from `GOAL_RELATION` | 32 / 2 | G6c only | near-miss |
| **M1c** | tokens in one unrelated paragraph; instructs "do not open `sprint-context.md`" | **33 / 1** | **nothing** | **SURVIVES** |
| **M1d** | one HTML comment per file, greped tokens only, zero instruction | **33 / 1** | **nothing** | **SURVIVES** |
| **M2** | "populated ⇒ achieved", expressed without `non-empty` adjacent to `met` | **33 / 1** | **nothing** | **SURVIVES** |
| **M3** | wrapped template + unwrapped-literal detection — advisory **provably dead** in production | **33 / 1** | **nothing** | **SURVIVES** |
| **M5** | advisory keyed on the token's PRESENCE — false "unresolved" on every mechanical check | **33 / 1** | **nothing** | **SURVIVES** |
| **M6a** | verbatim paste of `SKILL.md:702` (the enum's **definition** site) into `reporter.md` | **33 / 1** | **nothing** | **SURVIVES** |
| **M6d** | `` `met` \| `partial` \| `missed` `` in `reporter.md` | **33 / 1** | **nothing** | **SURVIVES** |
| **M6e** | three-bullet definition list in `reporter.md` | **33 / 1** | **nothing** | **SURVIVES** |
| **M10** | `init_sprint.mjs` advisory in the LIVE tree only; canonical mirror untouched | **33 / 1** | **nothing** | **SURVIVES (Rule 1)** |
| M4 | template heading in the live tree only | 30 / 4 | G1b, G1c, G4b | killed ✓ |
| M5c | no `init_sprint.mjs` change at all | 32 / 2 | G2b | killed ✓ |
| M6b | verbatim paste of `SKILL.md:697` | 32 / 2 | G7 | killed ✓ |
| M6c | verbatim paste of `SKILL.md:45` | 32 / 2 | G7 | killed ✓ |
| M7 | heading appended after `## Mid-Sprint Amendments` | 31 / 3 | G4a, G4b | killed ✓ |
| M8 | heading inserted before `## Sprint Goal` (G4's named mutant) | 31 / 3 | G4a, G4b | killed ✓ |
| M9 | heading inserted after `## Test Stack` | 31 / 3 | G4a, G4b | killed ✓ |
| **B** | **correct**; wrapped placeholder + wrapped-literal detection (self-consistent) | **32 / 2** | G2b | **correct impl BOUNCED** |
| B2 | correct; enum spelled `off-critical-path` | 32 / 2 | G6b | spelling pin |
| **B3** | **correct**; verdict derivation worded without the word "satisfied" | **32 / 2** | G5b | **over-fit** |
| B4 | correct; section referred to by paraphrase | 31 / 3 | G5a, G5b | over-fit |

---

## Finding 1 — the G5/G6 half is a vocabulary checklist. Measured.

**M1d, the floor.** Reference implementation everywhere except `reporter.md` and `SKILL.md`, which
receive **one HTML comment line each**:

```
cleargate-planning/.claude/agents/reporter.md
+ <!-- Goal Acceptance Check GOAL_RELATION satisfied -->

cleargate-planning/.claude/skills/sprint-execution/SKILL.md
+ <!-- GOAL_RELATION advances off critical path does not -->
```

```
$ bash .cleargate/scripts/test/cr078_init.test.sh
cr078_init.test.sh: 33 passed, 1 failed        (FAIL: SAFETY VIOLATION only)
```

**Two comment lines flip all six red prose assertions** — `G5a G5b G5d G6a G6b G6c` — and leave
`G5c` and `G7` green. Eight prose assertions, zero instruction, clean score.

Why each one is satisfied, from the source:

| Assertion | `cr078_init.test.sh` | What it actually tests |
|---|---|---|
| G5a `:530` | `grep -qi 'Goal Acceptance Check'` | the string, anywhere in the file |
| G5b `:536` | `grep -qi 'satisfied'` | the **word "satisfied"**, anywhere in the file |
| G5d `:555` | `grep -qi 'GOAL_RELATION'` | the string, anywhere in the file |
| G6a `:583` | `grep -q 'GOAL_RELATION'` | the string, anywhere in the file |
| G6b `:589` | `grep -q 'advances' && grep -q 'off critical path'` | **one token.** `advances` is already green at baseline — canonical `SKILL.md:42` and `:229` |
| G6c `:595` | `grep -A3 'GOAL_RELATION' \| grep -qiE "does not\|…"` | the phrase **`does not`** within 3 lines |

G6c is the only one with any structure, and it is defeated by moving three words closer: M1
(`does not` 5 lines from `GOAL_RELATION`) fails it; M1c and M1d (same words, 1–3 lines away)
pass it. It measures line distance, not meaning.

**M1c is the realistic version of this.** A "## Note on terminology" section that names both
tokens, uses "satisfied", and then instructs the exact behaviour CR-110 exists to remove:

> *"For the sprint-goal line in the close Brief, use your own read of how the sprint went. Do not
> open `sprint-context.md` for this — the Brief is a judgement call and reading a recorded condition
> would only anchor it."*

**33 / 1.** CR-110's central claim is un-implemented and the suite is green.

QA-Red's choice of a static prose contract is defensible (OD-4 removed the executable surface) and
I am not overturning it. But a whole-file grep bans a phrasing, not a claim
(FLASHCARD 2026-08-29 `#doctrine #test-harness`), and this half currently bans nothing.

### The minimum repair, measured

The honest ceiling is **scoped spelling coverage**. I attempted a forbidden-instruction grep and
**it does not work** — measured: `grep -qiE 'your own|judgement|do not open|…'` false-positives on
the *correct* reference, which legitimately writes *"Do not substitute your own judgement for a
condition nobody recorded."* Negation is not greppable. That approach is dropped, not deferred.

What does work, measured across 15 variants:

**A1 — scope the tokens to one goal-named section.** Both `Goal Acceptance Check` and
`GOAL_RELATION` must appear inside a single `## ` section whose heading matches `/[Gg]oal/`:

```bash
gv() { awk '/^## / { in_b = ($0 ~ /[Gg]oal/); if (in_b) s=""; next } in_b { s = s "\n" $0 } END { print s }' "$1"; }
gv "$REPORTER_MD" | command grep -qi 'Goal Acceptance Check' &&
gv "$REPORTER_MD" | command grep -qi 'GOAL_RELATION'
```

| Variant | A1 |
|---|---|
| baseline `reporter.md` | **FAIL** (correctly red) |
| REF_unwrapped / REF_wrapped / B3 | PASS |
| M1 / M1c / M1d | **FAIL** — all three killed |

**A3 — widen G5c from one word-pair to the presence-implies-success family.** G5c
(`:548`, `non-empty` within 80 chars of `met`) is defeated by any competent phrasing of the same
wrong behaviour — see Finding 2. Replacement:

```bash
command grep -qiE '(non-empty|populated|has content|is not empty|carries content|beyond its placeholder)[^.]{0,90}\b(met|achieved|satisfied|success)|\b(met|achieved|satisfied|success)[^.]{0,90}(non-empty|populated|has content|is not empty|carries content)'
```

| Variant | A3 |
|---|---|
| baseline / REF ×2 / B3 / M1* / M6* | PASS (green-at-baseline guard, same posture as G5c) |
| **M2** | **FAIL — killed** |
| V_G5c (the literal rejected spelling) | **FAIL — killed** (G5c's own kill preserved) |

A1 + A3 together kill M1, M1c, M1d and M2 without touching either reference. They do not make the
half an acceptance test — nothing grep-shaped can — but they raise it from "the words are present"
to "the words are present in an instruction block and do not state the rejected rule."

**Direction-B cost, disclosed:** A1 requires the literal string `Goal Acceptance Check` inside a
goal-named `## ` heading's section. B4 (correct, but refers to "the goal-acceptance criteria
section") fails it. That contract must be stated in the Developer dispatch.

---

## Finding 2 — G5c does not kill the mutant the M4 plan named. Measured.

The M4 plan (`plans/M4.md:1739`) names this the mutant that *"passes G1–G4 and leaves the verdict
exactly as ungrounded as before — CR-110's whole point, undone."* QA-Red encoded G5c as a
co-occurrence guard, `non-empty` within ~80 chars of `met` (`:548`), and verified it kills the
literal spelling.

**It does. It also kills nothing else.** M2 writes the identical wrong rule without putting those
two tokens near each other:

```
+ - If the section has content beyond its placeholder, the goal is satisfied — report success.
+ - A populated check counts as an achieved goal. You do not need to run the condition it names,
+   and you should not try to; the Orchestrator already confirmed it at the kickoff halt.
```

```
M2_presence_equals_met       33 passed / 1 failed      (SAFETY only)
V_G5c_nonempty_met           32 passed / 2 failed      (G5c fires on the literal spelling)
```

Every other assertion is satisfied: G5a (names the section), G5b (uses "satisfied"), G5d (quotes
`GOAL_RELATION`), G7 (no enum), G1–G4 (template + advisory correct). **A "populated ⇒ achieved"
Reporter ships green.** A3 above is the repair; it kills M2 and preserves G5c's own kill.

---

## Finding 3 — G7 is a partial guard: it misses the definition site and the two idiomatic forms

QA-Red's rescope from bare words to `met[^a-z]{1,4}partial[^a-z]{1,4}missed` (`:571`) was correct
and well-evidenced — the bare-word form is permanently unsatisfiable against `reporter.md:99`,
`:193`, `:243`. The narrowed regex was then tested against realistic spellings, and against the
three real `SKILL.md` sites a Developer would copy from.

Canonical `SKILL.md` in this worktree (797 lines post-CR-107; the plan's `:695`/`:700` shifted to
`:697`/`:702`):

| Site | Spelling | Regex |
|---|---|---|
| `:45` | `` `met / partial / missed` `` | **CAUGHT** |
| `:697` | `**Verdict: met \| partial \| missed.**` | **CAUGHT** |
| `:702` | `` `met` = goal achieved as written. `partial` = … `missed` = … `` | **ESCAPES** |

`:702` is the site that **defines** the enum. It is the paste a Developer teaching `reporter.md`
the vocabulary would make. Measured end-to-end, not by regex inspection:

```
M6a_paste_skill702    33 passed / 1 failed      SURVIVES
M6b_paste_skill697    32 passed / 2 failed      G7 fires
M6c_paste_skill45     32 passed / 2 failed      G7 fires
M6d_backticked_pipe   33 passed / 1 failed      SURVIVES   `met` | `partial` | `missed`
M6e_bullets           33 passed / 1 failed      SURVIVES   three-bullet definition list
```

Seventeen-spelling probe (`scratchpad/g7probe.sh`), all measured against the exact G7 regex:

| Caught | Escapes |
|---|---|
| `met \| partial \| missed` · `met/partial/missed` · `met, partial, missed` · `Met \| Partial \| Missed` · plain table row · `met — partial — missed` · `[met, partial, missed]` · `["met","partial","missed"]` | `` `met` / `partial` / `missed` `` · `` `met` \| `partial` \| `missed` `` · `**met** \| **partial** \| **missed**` · backticked table row · bulleted list (backticked or plain) · wrapped across a line break · prose sentence · `"met", "partial" or "missed"` |

Backticked-per-word and bulleted-definition are the two most common enum shapes in
`.claude/agents/*.md`. Both escape.

**A5 — the repair, measured.** Strip inline markup, widen the gap, and add a standalone-token
clause:

```bash
tr -d '`*"' < "$REPORTER_MD" | command grep -qiE 'met[^a-z]{1,12}partial[^a-z]{1,12}missed' && FAIL
command grep -q '`met`' "$REPORTER_MD" && command grep -q '`partial`' "$REPORTER_MD" \
  && command grep -q '`missed`' "$REPORTER_MD" && FAIL
```

| Variant | A5 |
|---|---|
| baseline `reporter.md` | PASS (no false positive on `:99`/`:193`/`:243`) |
| REF_unwrapped / REF_wrapped / B3 | PASS |
| M6a / M6b / M6c / M6d / M6e | **FAIL — all five killed** |

---

## Finding 4 — the placeholder wrap decides the implementation, in both directions

QA-Red's finding 3 is correct and it is worse than flagged. `GAC_PLACEHOLDER`
(`cr078_init.test.sh:319`) pins the placeholder as **one unwrapped line**; the M4 plan's
`### Schema change — verbatim placement` block prints it **wrapped across two lines**. G2/G3/G4's
advisory checks run against `make_future_template` (`:327-365`), the harness's own synthetic
template — never against the real artefact. Four combinations, all measured end-to-end:

| Template ships | Detection keys on | Suite | Advisory fires on the SHIPPED template |
|---|---|---|---|
| unwrapped | normalised (REF) | **33 / 1** | **yes** |
| wrapped (CR body verbatim) | normalised (REF) | **33 / 1** | **yes** |
| unwrapped | unwrapped literal | 33 / 1 | yes |
| **wrapped (CR body verbatim)** | **unwrapped literal** | **33 / 1** | **NO — advisory dead** |
| **wrapped (CR body verbatim)** | **wrapped literal (self-consistent, correct)** | **32 / 2** (G2b) | **yes — correct impl bounced** |

Production-shape probe for the dead-advisory row — the variant's own shipped template, run through
its own `init_sprint.mjs`:

```
M3_wrapped_literal   exit=0  advisory_fires_on_shipped_template=False
  stderr: 'WARN: no lane assignments found (…) — all stories default to standard'
REF_wrapped          exit=0  advisory_fires_on_shipped_template=True
```

So the two rows that matter both go the wrong way. A Developer who copies the CR body verbatim
(wrapped) and keys detection on the harness's string ships a **dead feature that scores 33/1**. A
Developer who copies the CR body verbatim and keys detection on **their own template** — the
self-consistent, correct choice — is **bounced on G2b**.

**A2 — the repair, measured.** One new scenario that runs the **real committed template from both
trees** through `init_sprint.mjs` and asserts the advisory fires (the same shape as G1's
`run_g1 "${REPO_ROOT}/…"`, which already proves the pattern works):

| Variant | A2 |
|---|---|
| REF_unwrapped / REF_wrapped | PASS |
| **B (wrapped, self-consistent)** | **PASS — the direction-B bounce disappears** |
| **M3 (wrapped + unwrapped literal)** | **FAIL — killed** |
| **M5c (no `init_sprint.mjs` change)** | **FAIL — killed** |

A2 also makes G2b's synthetic-fixture dependency non-load-bearing. Additionally: **pin the
placeholder to one canonical shape in the plan.** Recommendation: **unwrapped, one line**, matching
`## Sprint Goal`'s placeholder (`sprint_context.md:13`) and every other placeholder in the shipped
template. That resolves the ambiguity at its source; A2 keeps it honest afterwards.

---

## Finding 5 — the harness has no fixture for a populated MECHANICAL check

`make_future_template` (`:327-365`) has exactly two flavours: `placeholder` and `token`. The CR's
**primary** success path — a real, named, mechanical condition — is never fed to the advisory.

M5 exploits exactly that hole: an advisory keyed on the **presence of the literal token** rather
than on unresolved-ness.

```js
+ if (!ctxContent.includes('not-mechanically-verifiable —')) {
+   process.stderr.write('WARN: Goal Acceptance Check unresolved — populate sprint-context.md §Goal Acceptance Check.\n');
+ }
```

G2b green (placeholder flavour lacks the token → advisory fires). G3b green (token flavour has it →
silent). **33 / 1.** Its production behaviour, measured against a populated mechanical check:

```
Goal Acceptance Check:
  `bash .cleargate/scripts/test/cr078_init.test.sh` exits 0 AND `.cleargate/wiki/spikes/`
  contains at least one page.

M5_inverted   stderr: WARN: Goal Acceptance Check unresolved — populate sprint-context.md …
REF_unwrapped stderr: (nothing)
```

Every sprint with a real check gets a permanent false "unresolved" advisory, and the suite is green.

**A4 — the repair, measured.** A third `make_future_template` flavour, `mechanical`, carrying a
named command; assert `exit 0` **and** stderr carries **no** `unresolved`:

| Variant | A4 |
|---|---|
| REF ×2 / M3 ×2 / B / M5c | PASS |
| **M5** | **FAIL — killed** |

---

## Vacuity audit — every green-at-baseline assertion, with its mutant

| Assertion | Line | Mutant built | Flipped? |
|---|---|---|---|
| **G1c** parity | `:399` | template divergence **outside** the new section (a whitespace drift in the live `Locked Versions` row) | ✅ 32/2 — unique kill (M4 also flips it, but this one flips G1c alone) |
| **G2a** exit 0 on unresolved | `:421` | `process.exit(1)` on the placeholder, placed after the ctx write so G1 is unaffected | ✅ 32/2 |
| **G3a** exit 0 on token | `:448` | `process.exit(1)` when the literal token is the recorded check | ✅ 32/2 |
| **G3b** token ≠ unresolved | `:454` | unconditional advisory | ✅ 32/2 |
| **G3c** token survives verbatim | `:462` | render replaces the recorded value with `(check recorded)` | ❌ **33/1 — DOES NOT FLIP** |
| **G5c** rejected shortcut absent | `:548` | literal `"If the section is non-empty, report the goal as met."` | ✅ 32/2 — but see Finding 2: no other spelling flips it |
| **G7** no vocab duplication | `:571` | 5 duplication forms | ⚠️ **2 of 5 flip** — see Finding 3 |
| **RULE4a / RULE4b** | `:618-629` | `- work_item_type: sprint_context` gate block added to both trees | ✅ 31/3 |
| **G4c / G4d** frontmatter | `:505-518` | frontmatter block removed from both templates | ✅ 31/3 |

### G3c is vacuous by construction — the template's own guidance satisfies it

`:462` greps the **whole rendered file** for `not-mechanically-verifiable`. The Goal Acceptance
Check section's **guidance prose** — which ships in every rendered `sprint-context.md`, in the
harness fixture and in the real template alike — contains that literal token. Measured, under a
mutant that deletes the recorded value:

```
## Goal Acceptance Check

(check recorded)                                       ← the recorded value, destroyed

The concrete condition that is true when the Sprint Goal is met. Either a named command, artifact,
or observable state — or the literal token `not-mechanically-verifiable` followed by the
qualitative evidence standing in for it. Both are valid. Silence is not.

$ grep -n 'not-mechanically-verifiable' <rendered>
18:or observable state — or the literal token `not-mechanically-verifiable` followed by the
=> G3c PASSES
```

**G3c has no unique kill.** The only mutation that flips it is deleting the whole section — which
G1a/G1b already catch. It is satisfied by boilerplate for every implementation, correct or not.

**A7 — the repair, measured.** Assert the recorded **value**, not a token the template prints about
itself: the first non-empty line under `## Goal Acceptance Check` in the rendered file must be
byte-equal to the value the fixture recorded.

| Variant | A7 |
|---|---|
| REF ×2 / M3 ×2 / M5 / B / M5c | PASS |
| **V_G3c (render mangles the value)** | **FAIL — killed** |

---

## Finding 6 — Cross-Cutting Rule 1 has exactly one machine witness

`G1c` (`:399`) `diff -q`s the two `sprint_context.md` copies. **Nothing diffs the two
`init_sprint.mjs` copies.**

```
M10_init_live_only           33 passed / 1 failed
   two-tree init_sprint.mjs diff clean? False   (Cross-Cutting Rule 1 VIOLATED)
```

`INIT_SCRIPT` (`:32`) resolves to `${REPO_ROOT}/.cleargate/scripts/init_sprint.mjs` — the live tree
only. The canonical mirror is never executed and never compared.

Verified there is no second witness anywhere in the two commands CR-110 §4 names:

- `cleargate-cli/test/scaffold/canonical-live-parity.red.integration.node.test.ts` names four
  scripts (`write_dispatch.sh`, `validate_state.mjs`, `test_flashcard_gate.sh`,
  `test_test_ratchet.sh`) — **`init_sprint.mjs` is not among them** — and it is
  `*.integration.node.test.ts`, which `cleargate-cli/scripts/run-default-tests.mjs:24-28` excludes
  from `npm --prefix cleargate-cli test`. It did not appear in the full-suite log.
- `gate-section-index-pinning` S1c covers `readiness-gates.md` + the seven gated templates only.

**A6 — the repair.** One line, the same shape as G1c:

```bash
diff -q "${REPO_ROOT}/.cleargate/scripts/init_sprint.mjs" \
        "${REPO_ROOT}/cleargate-planning/.cleargate/scripts/init_sprint.mjs"
```

Measured: PASS on both references, **FAIL on M10**.

(`reporter.md` and `SKILL.md` need no such check — they are canonical-primary per N1, the live
copies are untracked and absent from the worktree, and G5/G6 already read canonical.)

---

## Cross-Cutting Rules 3 and 4 — measured from the main checkout, not accepted

Run from `/Users/ssuladze/Documents/Dev/ClearGate`. **Note: the main checkout is on
`sprint/S-39` @ `ac3e07f3`, not `main`** — which is the right tree to measure, and worth recording,
because the cli suite reads the outer working tree (FLASHCARD 2026-08-27 `#test-harness #cross-repo`).

**Rule 4 — the plan's claim is TRUE, and its assertion number is WRONG.**

```
$ npm --prefix cleargate-cli exec -- tsx --test cleargate-cli/test/docs/gate-section-index-pinning.node.test.ts
ℹ tests 14 · suites 2 · pass 14 · fail 0 · cancelled 0 · skipped 0 · todo 0   EXIT=0
```

The M4 plan and CR-110's task rows instruct asserting `gate-section-index-pinning` at
**`18 / 18 / 0 / 0`**. **That is a homonym error** — exactly the class FLASHCARD 2026-08-27
`#test-harness #danger` warns about. `18` is the **criteria** count, printed inside two test names:

```
✔ S1a: exactly 18 section(N) criteria are enumerated (16 pinnable + 2 known-unpinnable)
✔ S6: KNOWN_UNPINNABLE names exactly the two proposal criteria (size 2); 18 = 16 pinned + 2
```

The **test-case** count is **14**. The Developer's acceptance line is **`tests 14 · pass 14 ·
fail 0 · skipped 0`**. A Developer chasing `18 / 18` will conclude the suite is broken and go
looking for four missing tests.

The underlying claim verifies:

- `TEMPLATE_FOR` (`gate-section-index-pinning.node.test.ts:111-118`) = 7 entries —
  `epic, story, cr, bug, initiative, hotfix, spike`. **No `sprint_context`.**
- `command grep -rn 'sprint_context'` across `gate-section-index-pinning.node.test.ts`,
  `cleargate-cli/test/fixtures/gate-section-index/expected-headings.ts`,
  `.cleargate/knowledge/readiness-gates.md`, and
  `cleargate-planning/.cleargate/knowledge/readiness-gates.md` → **zero hits**.
- No `section(N)` criterion targets `sprint_context`. **Zero indices move; the fixture needs zero
  edits; N6's do-not-open instruction stands.**

**Rule 3 — not engaged.** CR-110's file surface contains no `readiness-predicates.ts`;
`evalSection` is neither imported nor referenced by any CR-110 path.

### But the plan and QA-Red both missed two real positional consumers of `sprint_context.md`

`command grep -rn 'sprint[-_]context'` across `.cleargate/scripts`, `cleargate-cli/src`,
`cleargate-cli/test`:

1. **`cleargate-cli/test/scripts/init-sprint-context.red.node.test.ts` Scenario 2** — "contains all
   6 required section headers in correct order". It asserts `## Sprint Goal` precedes
   `## Locked Versions` **and that `## Mid-Sprint Amendments` is the LAST `## ` header**
   (`:170-181`). This is a **real cross-repo consumer of the template that CR-110 edits**, named
   nowhere in the plan or the CR.

   ```
   $ npm --prefix cleargate-cli exec -- tsx --test cleargate-cli/test/scripts/init-sprint-context.red.node.test.ts
   ℹ tests 3 · pass 3 · fail 0 · skipped 0   EXIT=0
   ```

   Replicated its ordering logic against every variant: **both references PASS**; `M7`
   (heading appended after `## Mid-Sprint Amendments`) **FAILS it** — and G4a/G4b catch M7 too, so
   the harness is not blind here. But the Developer must **re-run this file** and QA-Verify must
   check it; it is not in either command CR-110 §4 names as a *targeted* run (it is inside the full
   cli suite).

2. **`cleargate-cli/src/dashboard/collect.ts:540-558` `extractSprintGoal`** — takes the first
   non-empty line under `/^##\s+Sprint Goal\s*$/`. Heading-text keyed, not positional. CR-110's
   insertion is **below** `## Sprint Goal`, so this is unaffected. Recorded so nobody re-derives it.

Both are heading-**text** keyed (`content.indexOf`, `findIndex(/^##\s+Sprint Goal\s*$/)`), never
index-keyed. **No positional consumer of `sprint_context.md` exists.** The plan's conclusion holds;
its evidence was incomplete.

---

## Wiring checklist (the five TPV items)

| # | Check | Result |
|---|---|---|
| 1 | Imports/paths resolve | ✅ `INIT_SCRIPT` `:32`, `REPORTER_MD` `:528`, `SKILL_MD` `:581`, both `readiness-gates.md` `:628-629`, both templates `:396-397` — all exist and were read |
| 2 | Invocation signatures match | ✅ `node init_sprint.mjs <id> --stories <ids> [--force]` matches `init_sprint.mjs:44-46`; `CLEARGATE_REPO_ROOT` honoured at `:37-39`; `CLEARGATE_ADVISORY=1` bypass works |
| 3 | No orphan state | ✅ `TEMP_DIRS` + `trap cleanup EXIT` (`:52-60`); every scratch is `mktemp -d`; the real `.active` is never written (SAFETY `:634` proves the isolation, it just hardcodes the wrong sprint) |
| 4 | Exit-code idiom | ✅ `$?` is captured immediately after each command substitution assignment; no `local x="$(...)"` masking bug in any new scenario |
| 5 | Naming / two trees | ✅ both copies byte-identical (`md5 e2b6352b…`); `bash -n` clean; file is the one CR-110 §4 names |

**Semantic note (CR-081):** `qa_red_lint` scope, not TPV's. Nothing semantic found beyond what is
reported above as coverage.

---

## Verdict

`TPV: PASS WITH AMENDMENTS`

Wiring is sound; the baseline is deterministic, satisfiable and correctly red for the right
reasons. `arch_bounces` MUST NOT increment. Amendments **A1–A4 are BLOCKING**; A5–A7 are required
but non-blocking on the same commit.

**QA-Red applies these — not the Developer.** A Developer amending its own acceptance test is the
tampering shape (BUG-046 T9 precedent).

1. **A1 (BLOCKING) — scope G5a/G5d to one goal-named `## ` section of `reporter.md`.**
   Motivating mutants: **M1d** (two HTML comment lines, `33/1`), **M1c** (one unrelated paragraph
   instructing "do not open `sprint-context.md`", `33/1`). Measured: kills M1, M1c, M1d; red at
   baseline; PASS on both references. Contract to state in the Developer dispatch: the literal
   string `Goal Acceptance Check` must appear inside a `## ` section whose heading contains "Goal".

2. **A2 (BLOCKING) — add G2c: run the REAL committed `sprint_context.md` (both trees) through
   `init_sprint.mjs` and assert the advisory fires.** Motivating mutant: **M3** — wrapped template
   + unwrapped-literal detection, `33/1`, advisory measured **dead** on the shipped template.
   Also fixes the direction-B bounce: **B** (wrapped + wrapped-literal, correct and
   self-consistent) is bounced `32/2` on G2b today and **passes A2**. Pair it with a plan
   amendment pinning the placeholder to **one unwrapped line**, matching `sprint_context.md:13`.

3. **A3 (BLOCKING) — widen G5c from `non-empty`+`met` to the presence-implies-success family.**
   Motivating mutant: **M2**, the M4 plan's own named central mutant ("populated ⇒ achieved"),
   `33/1`. Measured: kills M2, preserves G5c's existing kill, no false positive on baseline or
   either reference.

4. **A4 (BLOCKING) — add a third `make_future_template` flavour, `mechanical`.** Assert exit 0 and
   **no** `unresolved` in stderr for a populated named-command check. Motivating mutant: **M5**,
   advisory keyed on the token's presence — `33/1` while emitting a false "unresolved" on the CR's
   primary success path. Measured: kills M5, passes everything else.

5. **A5 — widen G7.** Strip `` ` `` `*` `"` before matching, widen the gap class to
   `[^a-z]{1,12}`, and add a standalone-backticked-token clause. Motivating mutants: **M6a**
   (verbatim paste of canonical `SKILL.md:702`, the enum's definition site), **M6d**
   (`` `met` | `partial` | `missed` ``), **M6e** (three-bullet list) — all `33/1`. Measured: kills
   all five M6 forms; no false positive on baseline `reporter.md:99/:193/:243` or either reference.

6. **A6 — add a `diff -q` on the two `init_sprint.mjs` copies.** Motivating mutant: **M10**, live
   tree only, `33/1`, Cross-Cutting Rule 1 violated with zero witness anywhere in either command
   CR-110 §4 names. One line, same shape as G1c `:399`.

7. **A7 — replace G3c's whole-file token grep with a positional assertion on the recorded value.**
   Motivating mutant: **V_G3c**, render destroys the recorded value, `33/1`. G3c is satisfied by
   the template's own guidance prose in every rendered file and has **no unique kill** today.

**Two corrections to the dispatch package, both measured, both for the Developer brief:**

- **`gate-section-index-pinning` acceptance is `tests 14 · pass 14 · fail 0 · skipped 0`, not
  `18/18/0/0`.** `18` is the criteria count printed inside S1a's and S6's test names. The plan's
  underlying Rule-4 claim is verified true; only the number is wrong.
- **`cleargate-cli/test/scripts/init-sprint-context.red.node.test.ts` is a second, unnamed consumer
  of `sprint_context.md`** and asserts `## Mid-Sprint Amendments` is the file's last `## ` heading.
  Green today (3/3); must be re-run. Not a blocker — G4a/G4b catch the mutant that would break it.

**Without A1–A4, the answer to "can a wrong implementation pass?" is yes, seven ways, measured.**

## Script Incidents

None. No `run_script.sh`-wrapped invocation failed; no incident JSON was produced.

## Artefacts

All out-of-tree, under
`/private/tmp/claude-501/-Users-ssuladze-Documents-Dev-ClearGate/49c00a07-a425-4af9-9ac6-97ed8ed5ee64/scratchpad/`:
`build.py` (mutant builder) · `prose.py` · `inits.py` · `run1.py`–`run10.py` (mutant batches) ·
`repairs.sh`, `repairs2.sh`, `repairs3.py` (amendment measurements) · `g7probe.sh` (17-spelling
probe) · one directory per variant · `run_<tag>.log` per suite run.
Suite logs from the main checkout: `/tmp/cr110_cli.log`, `/tmp/cr110_pin.log`, `/tmp/cr110_ctx.log`.

## Flashcards recorded

Four, prepended to `.cleargate/FLASHCARD.md`:
`#test-harness #tpv #danger` (the vocabulary-checklist measurement) ·
`#test-harness #fixtures #danger` (guidance prose satisfies the fixture's own token grep) ·
`#test-harness #tpv #danger` (a synthetic fixture decides the implementation's detection shape) ·
`#test-harness #dogfood-split` (Rule 1 had one witness; the mirror check is integration-tier and excluded).
