# BUG-042 — QA-Red: captured pre-fix evidence (no test file, per M0.md)

role: qa

**Mode note.** BUG-042 §5 assigns its locking test to STORY-054-05 (M0 wave2); M0.md §"Test scenarios (from Gherkin)" states verbatim "Do not write two tests. BUG-042's own verification is the reproduction protocol in its §2, executed as a manual QA-Verify step." No `*.red.node.test.ts` file was written. This document IS the Red artifact: real command output, captured now, against the unmodified pre-fix tree, because the defect's whole character is that it presents as a green pass and the evidence is unreproducible once the fix lands.

## Binary / environment used

- `cleargate` resolves to **local dist**, invoked directly as `node cleargate-cli/dist/cli.js` — NOT the global `/opt/homebrew/bin/cleargate` (which is npm-linked-or-installed **0.24.2** and does not reflect the local tree; see memory `reference_global_cleargate_is_npm_linked.md`).
- Dist path: `/Users/ssuladze/Documents/Dev/ClearGate/cleargate-cli/dist/cli.js`, mtime `Aug 24 18:57` (built from the `sprint/S-39` tree at `65e8ca1d`, same commit the worktree was cut from).
- `cleargate-cli/` does **not** materialize inside `.worktrees/BUG-042/` (FLASHCARD `#worktree #collision-surface #danger`, confirmed empirically — `cleargate-cli/` is untracked in the outer repo). All `gate check` invocations below therefore run the dist binary from the **main checkout** with `cwd` pinned to the **worktree** (`.worktrees/BUG-042/`), so `resolveProjectRootForFile` (`cleargate-cli/src/lib/project-root.ts:94-100`) falls back to `resolveProjectRoot(cwd)` and reads the **worktree's** (pre-fix) `.cleargate/knowledge/readiness-gates.md`. This is the correct pre-fix source: verified byte-identical to `main`'s copy and to `cleargate-planning/.cleargate/knowledge/readiness-gates.md` (two-tree parity check below).
- Fixtures live in the session scratchpad during authoring; final copies are archived at `.cleargate/sprint-runs/SPRINT-39/BUG-042-qa-red-fixtures/` (both trees: `pre-fix/` and `post-fix-probe/`) so QA-Verify can re-run the exact same files. No real work item under `.cleargate/delivery/**` was touched or mutated.
- Note: `cleargate gate check` **writes its result back to the target file's frontmatter** on every invocation (`cleargate-cli/src/commands/gate.ts` — "evaluate readiness criteria and write result to frontmatter"). This is expected, documented behavior; the archived fixtures below carry whatever `cached_gate_result` was written by the LAST run against them. It only ever touches the fixture files themselves, never the registry or real work items.

## Pre-fix baseline confirmed

```
$ diff .cleargate/knowledge/readiness-gates.md cleargate-planning/.cleargate/knowledge/readiness-gates.md
(no output — byte-identical)
$ git diff --stat   # worktree, clean
(no output — clean)
```

Both trees carry the un-corrected indices: `cr.blast-radius-populated: section(2)`, `cr.sandbox-paths-declared: section(3)`, `epic.affected-files-declared: section(5)` — matching BUG-042 §1's table exactly.

---

## Scenario 1 — CR fixture, `## 3. Execution Sandbox` EMPTY (the fail-open closing)

Fixture: `BUG-042-qa-red-fixtures/pre-fix/cr-s1-empty-sandbox.md` — CR-shaped, built off `.cleargate/templates/CR.md`'s heading layout. `## 1. The Context Override`, `## 2. Blast Radius & Invalidation`, `## Existing Surfaces`, `## Prior work` all populated with real content; `## 3. Execution Sandbox` left with **zero** bullets/definition-terms.

```
$ cd .worktrees/BUG-042 && node <dist>/cli.js gate check <scratch>/cr-s1-empty-sandbox.md -v
Gate: cr.ready-to-apply (enforcing)
✅ cr.ready-to-apply passed (8 criteria)
EXIT=0
```

**This is the single most important artifact.** An Execution Sandbox with zero declared file paths passes `cr.ready-to-apply` at 8/8. `sandbox-paths-declared` is silently satisfied by a section it was never meant to read.

**Diagnostic confirmation of the mechanism** (an earlier run against the same body content, before `## Existing Surfaces` cited a path that exists on disk in the worktree, which made `existing-surfaces-verified` fail and forced verbose per-criterion output even though the section-index mechanics are identical):

```
Gate: cr.ready-to-apply (enforcing)
❌ existing-surfaces-verified: cited paths do not exist on disk: cleargate-cli/src/lib/readiness-predicates.ts
  [pass] blast-radius-populated: section 2 has 4 declared-item (≥1 required)
  [pass] no-tbds: no 'TBD' markers found in body
  [pass] sandbox-paths-declared: section 3 has 3 declared-item (≥1 required)
  [pass] discovery-checked: frontmatter(.).context_source != "null" → actual: "QA-Red fixture for BUG-042 reproduction — not a real work item."
  [pass] reuse-audit-recorded: '## Existing Surfaces' found 1 time
  [fail] existing-surfaces-verified: cited paths do not exist on disk: cleargate-cli/src/lib/readiness-predicates.ts
  [pass] prior-work-recorded: ## Prior work has recorded evidence
  [pass] ambiguity-gate-resolved: status 🔴 (not 🟢) — no self-contradiction
```

`sandbox-paths-declared: section 3 has 3 declared-item` — those 3 items are the fixture's `## 2. Blast Radius & Invalidation` checkboxes (3 `- [ ]` bullets), NOT the (empty) Execution Sandbox. Proves `section(3)` resolves to Blast Radius, exactly as BUG-042 §1 documents. (Note: `cleargate gate check -v` only prints per-criterion detail when the **overall** result fails — `gate.ts:322-326` — so the clean-pass run above shows only the summary line; this diagnostic run is included purely to make the resolved-section mechanism visible.)

---

## Scenario 2 — CR fixture, `## 2. Blast Radius & Invalidation` EMPTY

Fixture: `pre-fix/cr-s2-empty-blast-radius.md`. Same base as S1 but `## 3. Execution Sandbox` is populated (`**Modify:** - cleargate-cli/src/commands/gate.ts`) and `## 2. Blast Radius & Invalidation` is emptied.

```
$ node <dist>/cli.js gate check <scratch>/cr-s2-empty-blast-radius.md -v
Gate: cr.ready-to-apply (enforcing)
❌ sandbox-paths-declared: section 3 has 0 declared-item (≥1 required)
  [pass] blast-radius-populated: section 2 has 4 declared-item (≥1 required)
  [pass] no-tbds: no 'TBD' markers found in body
  [fail] sandbox-paths-declared: section 3 has 0 declared-item (≥1 required)
  [pass] discovery-checked: frontmatter(.).context_source != "null" → actual: "QA-Red fixture for BUG-042 reproduction — not a real work item."
  [pass] reuse-audit-recorded: '## Existing Surfaces' found 1 time
  [pass] existing-surfaces-verified: all 1 cited path exist on disk
  [pass] prior-work-recorded: ## Prior work has recorded evidence
  [pass] ambiguity-gate-resolved: status 🔴 (not 🟢) — no self-contradiction
EXIT=1
```

Matches BUG-042 §2 step 6 exactly: `sandbox-paths-declared` fails because `section(3)` resolves to the now-empty Blast Radius, while `blast-radius-populated` (`section(2)` → `## 1. The Context Override`, still populated) passes untouched.

---

## Scenario 3 — CR fixture, `## 1. The Context Override` EMPTY

Fixture: `pre-fix/cr-s3-empty-context-override.md`. `## 2. Blast Radius & Invalidation` and `## 3. Execution Sandbox` both populated; `## 1. The Context Override` emptied.

```
$ node <dist>/cli.js gate check <scratch>/cr-s3-empty-context-override.md -v
Gate: cr.ready-to-apply (enforcing)
❌ blast-radius-populated: section 2 has 0 declared-item (≥1 required)
  [fail] blast-radius-populated: section 2 has 0 declared-item (≥1 required)
  [pass] no-tbds: no 'TBD' markers found in body
  [pass] sandbox-paths-declared: section 3 has 3 declared-item (≥1 required)
  [pass] discovery-checked: frontmatter(.).context_source != "null" → actual: "QA-Red fixture for BUG-042 reproduction — not a real work item."
  [pass] reuse-audit-recorded: '## Existing Surfaces' found 1 time
  [pass] existing-surfaces-verified: all 1 cited path exist on disk
  [pass] prior-work-recorded: ## Prior work has recorded evidence
  [pass] ambiguity-gate-resolved: status 🔴 (not 🟢) — no self-contradiction
EXIT=1
```

Matches BUG-042 §2 step 7 exactly: `blast-radius-populated` fails because `section(2)` resolves to the now-empty Context Override; `sandbox-paths-declared` (`section(3)` → Blast Radius, still populated) passes.

---

## Scenario 4 — Epic fixture, `**Affected Files:**` under `## 4. Technical Grounding` EMPTY

Fixture: `pre-fix/epic-s4-empty-affected-files.md` — Epic-shaped, built off `.cleargate/templates/epic.md`'s heading layout (`## 0. AI Coding Agent Handoff` through `## 6. AI Interrogation Loop`, plus the unnumbered `## Existing Surfaces` / `## Prior work` / `## Why not simpler?` insertions). `**Affected Files:**` under `## 4. Technical Grounding` has zero bullets; `**Data Changes:**` carries one placeholder-style bullet (`- Table/Entity: none`). `parent-approved` OR-group satisfied via top-level `approved_by` + `approved_at` (waiver route) so the run isolates the section-index defect from an unrelated criterion.

```
$ node <dist>/cli.js gate check <scratch>/epic-s4-empty-affected-files.md -v
Gate: epic.ready-for-decomposition (enforcing)
✅ epic.ready-for-decomposition passed (12 criteria)
EXIT=0
```

**Diagnostic confirmation** (same fixture, before the waiver fields were added — isolates the section-index result from the unrelated `parent-approved` failure):

```
Gate: epic.ready-for-decomposition (enforcing)
❌ parent-approved: OR-group failed — all alternatives failed: ...
  [fail] parent-approved-proposal: ...
  [fail] parent-approved-initiative: ...
  [pass] no-tbds: no 'TBD' markers found in body
  [pass] scope-in-populated: section 3 has 2 declared-item (≥1 required)
  [pass] affected-files-declared: section 5 has 2 declared-item (≥1 required)
  [pass] interrogation-resolved: 'Unresolved' not found in body
  ...
```

`affected-files-declared: section 5 has 2 declared-item` — those 2 items are `## Existing Surfaces`'s `**Surface:**` / `**Coverage...**` definition-list terms, not anything under `## 4. Technical Grounding`. Confirms `section(5)` resolves to `## Existing Surfaces`, exactly as BUG-042 §1 documents.

---

## Post-fix probe (computed, not the real fix)

To give the inversion table a **verified**, not hand-derived, "post-fix expectation" column — without touching the frozen `evalSection` or the real registry — I built a throwaway synthetic project at `BUG-042-qa-red-fixtures/post-fix-probe/` (own `.cleargate/config.yml` + a **copy** of `readiness-gates.md` with BUG-042's three documented corrections applied) and re-ran the same fixture bodies against it. `diff` confirms the copy differs from the pre-fix registry by exactly the three lines BUG-042 §"Schema changes (verbatim)" specifies — nothing else.

```
$ diff .worktrees/BUG-042/.cleargate/knowledge/readiness-gates.md post-fix-probe/readiness-gates.corrected.md
99c99
<       check: "section(5) has ≥1 declared-item"
---
>       check: "section(8) has ≥1 declared-item"
170c170
<       check: "section(2) has ≥1 declared-item"
---
>       check: "section(3) has ≥1 declared-item"
174c174
<       check: "section(3) has ≥1 declared-item"
---
>       check: "section(6) has ≥1 declared-item"
```

Results, corrected registry:

```
S1 (empty Execution Sandbox):  ❌ sandbox-paths-declared: section 6 has 0 declared-item — CLOSES.
S2 (empty Blast Radius):       ❌ blast-radius-populated: section 3 has 0 declared-item — CLOSES.
                                sandbox-paths-declared: section 6 has 2 declared-item — still passes (reads Execution Sandbox now, correctly).
S3 (empty Context Override):   ✅ passed 8/8 — §1 is now gated by nothing (BUG-042's own R2, accepted).
S4 (empty Affected Files, Data Changes populated): ✅ passed 12/12 — DOES NOT CLOSE. See finding below.
```

---

## ⚠️ FINDING — the epic correction does not close the fail-open for the realistic case

**This is a loud finding, not a scenario failure.** BUG-042's own §2 step 8 reproduction protocol says: *"delete every bullet under `**Affected Files:**` in §4, re-run `gate check`. Observe it still passes 12/12."* I ran that exact instruction — delete only the bullets under the `**Affected Files:**` label, leave the label itself — against the **corrected** registry (`section(8)`, not `section(5)`), and it **still passes 12/12**:

Fixture: `post-fix-probe/epic-s4d-label-only.md` — `## 4. Technical Grounding` contains only the bare line `**Affected Files:**`, nothing else (no bullets, no `## Data Changes` block at all).

```
$ node <dist>/cli.js gate check post-fix-probe/epic-s4d-label-only.md -v   # against the CORRECTED registry
Gate: epic.ready-for-decomposition (enforcing)
✅ epic.ready-for-decomposition passed (12 criteria)
EXIT=0
```

**Root cause:** `countDeclaredItems` (`readiness-predicates.ts:712-763`) has a "definition-list term" branch matching any trimmed line against `/^(\*{1,2}|_{1,2})?[A-Z][^|*\n]*(\*{1,2}|_{1,2})?:/`. The bare label line `**Affected Files:**` itself matches this pattern (bold text, starts uppercase, ends in a colon) and is counted as **1 declared item** — independent of whether anything is declared underneath it. The correction moves `section(N)` to point at the right heading, but the counting predicate is satisfied by the section's own boilerplate subsection label, not by its content.

I isolated this with three variants (all archived under `post-fix-probe/`, all run against the corrected registry):

| Fixture | §4 content | Result |
|---|---|---|
| `epic-s4-empty-affected-files.md` (from pre-fix set) | `**Affected Files:**` (empty) + `**Data Changes:**` `- Table/Entity: none` | ✅ passes — masked by the Data Changes bullet |
| `epic-s4b-empty-both.md` | `**Affected Files:**` (empty) + `**Data Changes:**` (empty) — both labels present, zero content anywhere | ✅ passes — masked by the labels themselves |
| `epic-s4c-diagnostic-no-labels.md` | nothing at all under `## 4.` (labels also deleted) | ❌ **fails** — `section 8 has 0 declared-item` |
| `epic-s4d-label-only.md` | `**Affected Files:**` only (no bullets, no Data Changes section) — the literal, realistic reading of BUG-042 §2 step 8 | ✅ passes — masked by the one remaining label |

`s4c` proves the corrected index and the evaluator both work correctly when §4 is **genuinely** empty. `s4/s4b/s4d` prove that in every realistic authoring shape — where the subsection label(s) survive even after every bullet under them is deleted, which is how a human or agent actually edits a document — the corrected criterion is **still a fail-open**. Real epics essentially never delete `**Affected Files:**` / `**Data Changes:**` themselves; they clear the content beneath. BUG-042's fix, as scoped (renumber `section(5)` → `section(8)`, verbatim per its "Schema changes" diff), does not close this. This is a **distinct defect** from the one BUG-042 diagnoses — same symptom class (fail-open, presents green), different mechanism (`countDeclaredItems`'s definition-list-term branch, not the index) — and is out of BUG-042's stated scope (`evalSection`/index only; `readiness-predicates.ts` is otherwise frozen for the sprint). Flagging for the Developer's brief and the sprint report; not something I can or should fix by editing the frozen predicate file.

---

## Inversion table

| Criterion | Names (intent) | Actually reads TODAY (pre-fix) | Pre-fix verdict (empty-target-section fixture) | Post-fix expectation (BUG-042's documented diff) |
|---|---|---|---|---|
| `cr.blast-radius-populated` | `## 2. Blast Radius & Invalidation` | `## 1. The Context Override` (`section(2)`) | Empty §1 → **FAILS** (S3); empty §2 → **PASSES** (S2, unread) | `section(3)` → resolves to `## 2. Blast Radius & Invalidation`. Empty §2 → **FAILS** correctly (verified, S2 vs corrected registry). §1 becomes gated by nothing (accepted, BUG-042 R2). |
| `cr.sandbox-paths-declared` | `## 3. Execution Sandbox` | `## 2. Blast Radius & Invalidation` (`section(3)`) | Empty §3 → **PASSES** (S1 — the fail-open); empty §2 → **FAILS** (S2, wrong section) | `section(6)` → resolves to `## 3. Execution Sandbox`. Empty §3 → **FAILS** correctly (verified, S1 vs corrected registry). Fail-open **closes**. |
| `epic.affected-files-declared` | `**Affected Files:**` list under `## 4. Technical Grounding` | `## Existing Surfaces` (`section(5)`) | Empty §4 Affected Files → **PASSES** (S4 — the fail-open) | `section(8)` → resolves to `## 4. Technical Grounding`. Empty-but-labeled §4 → **STILL PASSES** (verified, s4/s4b/s4d vs corrected registry) — fail-open does **not** close for the realistic authoring shape. Only closes when the subsection labels are also removed (s4c). **New finding, see above — not closed by BUG-042 as scoped.** |
| `epic.scope-in-populated` | `## 2. Scope Boundaries` | `## 2. Scope Boundaries` (`section(3)`) | Not tested (not in scope — BUG-042 table row 1: already correct, do not touch) | No change (`section(3)`, unchanged). |
| `hotfix.*` (3 criteria) | §1/§2/§3 of `hotfix.md` | Same, correctly, today (`section(2)/(3)/(4)`) | Not tested (M0.md's explicit trap: "already positionally correct... do not align") | No change. |

---

## Exact commands QA-Verify must re-run (copy-pasteable)

Run from the meta-repo root, `cd`-ing into the **worktree** only for the `cwd` pin (per FLASHCARD `#worktree #collision-surface #danger` — `cleargate-cli/` is not materialized inside any worktree; the dist binary is invoked from the main checkout by absolute path).

```bash
WT=/Users/ssuladze/Documents/Dev/ClearGate/.worktrees/BUG-042   # or wherever the Developer's fix landed
CLI=/Users/ssuladze/Documents/Dev/ClearGate/cleargate-cli/dist/cli.js
FIX=/Users/ssuladze/Documents/Dev/ClearGate/.cleargate/sprint-runs/SPRINT-39/BUG-042-qa-red-fixtures/pre-fix

# Re-run npm run build in cleargate-cli first if src changed and dist is stale (FLASHCARD 2026-07-19 #test-harness #build).

# S1 — must now FAIL (sandbox-paths-declared, section 6, 0 declared-item):
cd "$WT" && node "$CLI" gate check "$FIX/cr-s1-empty-sandbox.md" -v

# S2 — must still FAIL (blast-radius-populated, section 3, 0 declared-item), sandbox-paths-declared must now PASS:
cd "$WT" && node "$CLI" gate check "$FIX/cr-s2-empty-blast-radius.md" -v

# S3 — must now PASS 8/8 (accepted — §1 is un-gated post-fix, BUG-042 R2):
cd "$WT" && node "$CLI" gate check "$FIX/cr-s3-empty-context-override.md" -v

# S4 — EXPECTED to still PASS 12/12 per the finding above. If the Developer's fix
# additionally hardens countDeclaredItems or the epic template, re-derive; otherwise
# this PASS is the documented residual gap, not a QA-Verify regression.
cd "$WT" && node "$CLI" gate check "$FIX/epic-s4-empty-affected-files.md" -v

# Two-tree parity (must remain empty):
diff "$WT/.cleargate/knowledge/readiness-gates.md" "$WT/cleargate-planning/.cleargate/knowledge/readiness-gates.md"

# evalSection zero-diff hard constraint:
cd "$WT" && git diff --stat -- cleargate-cli/src/lib/readiness-predicates.ts   # (only if cleargate-cli materializes in the fix's worktree)

# Regression baseline:
npm --prefix cleargate-cli test
npm --prefix cleargate-cli run typecheck
```

## Gaps — scenarios NOT reproduced by this Red pass

- **Scenario 5 (`git diff readiness-predicates.ts` empty)** — not applicable pre-fix; nothing has changed yet. QA-Verify's job.
- **Scenario 6 (two-tree parity)** — confirmed empty **pre-fix** (baseline, above). QA-Verify must re-confirm parity **post-fix**, since the fix is a two-tree edit by construction.
- **Scenario 7 (`npm test` green / typecheck clean)** — not run here; BUG-042 changes no behavioral code, so this is purely a regression check, deferred to QA-Verify per M0.md.
- **The full `## 3. Execution Sandbox` two-locator divergence (R5)** — out of scope for BUG-042 and for this Red pass; noted in M0.md as a candidate follow-on CR, not reproduced here.

---

STATUS=red-captured

**Summary.** Captured real, verbatim `cleargate gate check -v` output (local dist, `65e8ca1d`, pre-fix worktree) for all four dispatch-specified scenarios; all four match BUG-042 §1/§2's documented pre-fix behavior exactly, with S1 and S4 reproducing the fail-open (green pass on an empty gated section) that is the bug's core claim. I additionally built a synthetic corrected-registry probe (three-line diff matching BUG-042's own "Schema changes" verbatim, in a scratch project, never touching the real registry or the frozen evaluator) to verify the CR-side fixes close cleanly (S1/S2 now fail correctly, S3's un-gating is the accepted R2 residue) — but the epic-side fix does **not** close the fail-open for the realistic authoring shape: `countDeclaredItems`'s definition-list-term branch counts the bare `**Affected Files:**` label itself as a declared item, so `section(8)` still reports ≥1 declared-item even when every bullet beneath the label is deleted, unless the label line is deleted too (which real authors don't do). This is a distinct mechanism from the index defect BUG-042 diagnoses and is not closed by its scoped fix — flagged loudly per instruction, for the Developer's brief and the sprint report, not acted on here (no diff to any frozen or in-scope file was made).
