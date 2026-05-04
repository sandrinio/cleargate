role: architect

# CR-030 (γ) Post-Flight Architect Review — SPRINT-21 W3

**Commit under review:** `56f9fd6` on `story/CR-030` (worktree `.worktrees/CR-030-bounce`)
**Predecessor (retired):** `3caa056` (Path α — AND-semantics defect; broke both Proposal and Initiative parent paths)
**Inputs:** M3 plan, dev report (Bounce Resolution), QA report (PASS 5/5), readiness-gates.md (worktree).
**Method:** Read-only verification (Read + Grep + git show). No npm test, no build.

---

## Verdict

**PASS.** All 5 spot-checks come back clean. The γ implementation is structurally sound, semantically correct, and backward-compatible. The bounce was driven by a real defect (α's AND-semantics) and γ resolves it via the right primitive (named OR-groups in the criterion schema), not a hack.

---

## Check 1 — OR-group evaluator design soundness

**Result: ok.**

`gate.ts:53-60` defines `GateCriterion` with optional `or_group?: string`. Doc-comment is explicit:

> *Criteria sharing the same or_group value are treated as a logical OR: the gate passes for that concern if ANY member of the group passes. Criteria without or_group are treated as required (AND).*

`gate.ts:223-269` implements that contract:

- **L240-247:** Builds `orGroups: Map<string, [...members]>` keyed on `or_group` name, populated only for criteria that declare a group. Criteria without `or_group` never enter the map.
- **L249-263:** Iterates allResults; for each grouped criterion, only the FIRST member of its group emits a (potential) failure — guarded by `groupMembers[0]!.id === r.id`. The group fails iff `groupMembers.some((m) => m.pass)` returns false. Failure is consolidated as one `OR-group failed — all alternatives failed: <id1>: <detail1>; <id2>: <detail2>` line.
- **L264-268:** Criteria without `or_group` follow the original AND path (`if (!r.pass) failingCriteria.push(...)`).

**Backward-compat:** Criteria without `or_group` behave exactly as before — same code path, same failure semantics. Grep of `readiness-gates.md` confirms only the two new criteria use `or_group: parent-approved`; every other criterion is `or_group`-less and unchanged. Zero blast radius on legacy gates.

**Edge cases handled:**
- Single-member group → degenerates to AND (only one alternative; if it fails, group fails). Defensive and correct.
- All members fail → one consolidated failure line with all member details. Better signal than two separate "❌ parent-approved-proposal" + "❌ parent-approved-initiative" lines.
- One member passes → group is silently absent from `failingCriteria`. Correct.

**Potential nit (non-blocking):** The "first-member-only" guard relies on iteration order being stable — `Map<string, Array<...>>` preserves insertion order in V8/JS by spec, so this is safe. If a future refactor swaps to an unordered structure, the guard would need re-anchoring. Not actionable now; flagged for awareness.

**No design concerns.** The schema-level `or_group: <name>` is the simplest primitive that expresses "alternative parents satisfy this concern" and reads naturally in YAML.

---

## Check 2 — YAML schema correctness

**Result: ok.**

`readiness-gates.md` L72-77 (epic.ready-for-decomposition):

```yaml
- id: parent-approved-proposal
  check: "frontmatter(context_source).approved == true"
  or_group: parent-approved
- id: parent-approved-initiative
  check: "frontmatter(context_source).status == 'Triaged'"
  or_group: parent-approved
```

Both predicates resolve `context_source` (so they walk pending-sync ∪ archive via CR-031's resolver). Body shapes are correct:
- Proposal path checks `approved == true` — the canonical Proposal-approval signal.
- Initiative path checks `status == 'Triaged'` — the canonical Initiative-decomposed signal (matches `templates/initiative.md` lifecycle).

Both share `or_group: parent-approved`. No third member; clean two-alternative OR.

L186-196 also defines a fresh `initiative.ready-for-decomposition` advisory gate (no-tbds + user-flow + success-criteria), which is the second half of CR-030's Initiative-first-class scope. Schema-conformant.

---

## Check 3 — Full-gate-run regression test

**Result: ok.**

`gate.test.ts:855-1020+` ships a `describe('CR-030 γ: OR-group evaluator — parent-approved', ...)` block with three scenarios, all using the same `OR_GROUP_GATES_DOC` fixture (epic.ready-for-decomposition with the two `or_group: parent-approved` criteria + an unrelated `no-tbds` criterion):

1. **L881-932 — Proposal parent (approved: true, no status)** → asserts `expect(combined).not.toMatch(/❌ parent-approved/)`. Gate PASSES for the parent-approved concern. ✓
2. **L934-984 — Initiative parent (status: 'Triaged', no approved)** → same assertion, gate PASSES. ✓
3. **L986-1020+ — Missing parent file** → asserts gate FAILS with the consolidated OR-group-failed message and a non-zero exit code. Negative path covered. ✓

The fixture is self-contained (writes its own readiness-gates.md to a tmp dir + parent file + epic file under test), so the test exercises the full `gateCheckHandler` end-to-end including frontmatter resolution + predicate dispatch + OR-group consolidation. This is exactly the test α was missing — the prose-`context_source` heuristic at the original gate.test.ts:659 short-circuited to a waiver pass without resolving any file, masking α's AND defect.

The new fixture forces real file resolution. Future regressions of OR-group semantics will trip these tests immediately.

---

## Check 4 — Engine-bypass auto-rescind

**Result: noted.**

SPRINT-21 frontmatter L56-67 confirms the bypass is documented and self-rescinding:

```yaml
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-05-03T00:00:00Z
  bypass_note: |
    One-time hand-set bypass 2026-05-03. ... Bypass is rescinded once
    CR-030 lands and the engine can type-detect Sprint files natively.
```

The bypass becomes obsolete the moment commit `56f9fd6` lands on main, because:
- `work-item-type.ts` now extends `WorkItemType` to include `sprint` (per dev report L37).
- `derive-bucket.ts`, `page-schema.ts`, and `stamp-tokens.ts` carry the matching extensions.
- `readiness-gates.md` L174-183 defines `sprint.ready-for-execution` (risk-table-populated + discovery-checked) so a fresh `cleargate gate check` against the SPRINT-21 file will run the real gate, not bypass.

**Sprint-close handoff requirement:** Post-merge of CR-030 to `sprint/S-21`, the orchestrator MUST run `cleargate gate check .cleargate/delivery/pending-sync/SPRINT-21_Framework_Hardening_Test_Surfaced.md` to regenerate `cached_gate_result` from real evaluation, then drop the `bypass_note` block. This is a single-line frontmatter edit + cache regen, not a code change. Recommend folding into the doc-refresh checklist (`prep_doc_refresh.mjs`) at sprint close.

I am flagging this for the orchestrator. No defect with γ itself.

---

## Check 5 — Hot-file impact on CR-033's already-merged work

**Result: ok (line-disjoint, semantically intact).**

CR-033 inserted three `existing-surfaces-verified` criteria (at originally-cited L82, L124, L143). Post-CR-030 merge, those three criteria now sit at:

| File-line (post-merge) | Gate block | Role |
|---|---|---|
| L90-91 | epic.ready-for-decomposition | unchanged |
| L134-135 | story.ready-for-execution | unchanged |
| L155-156 | cr.ready-to-apply | unchanged |

The line-number drift is purely cosmetic (CR-030 added two new criteria + a new initiative gate block above and below). All three CR-033 entries are still attached to the correct gate blocks, with the correct `id` and `check` strings. No conflict, no overlap, no semantic interference.

CR-030's edits are concentrated in:
- L72-77 (new `parent-approved-{proposal,initiative}` pair, replacing the old single `proposal-approved`)
- L185-196 (new `initiative.ready-for-decomposition` gate block, appended below `sprint.ready-for-execution`)

These ranges are line-disjoint from CR-033's L90/L134/L155 inserts. Merge is clean.

---

## Cross-story risk surfaced (advisory, not blocking)

The dev report flashcard #2 is correct and important: `stamp-tokens.ts:194 idKeys` and `work-item-type.ts:14 FM_KEY_MAP` are now two independent sources of truth for the work-item key list. Future additions (e.g. a hypothetical `MILESTONE` type) MUST update both. Recommend the Reporter cite this in §"Tech Debt" so it surfaces at sprint close. Not a CR-030 defect; a structural debt now visible because CR-030 surfaced it.

---

## Return format

```
ARCH: PASS
CHECK_1_OR_GROUP_DESIGN: ok
CHECK_2_YAML_SCHEMA: ok
CHECK_3_REGRESSION_TEST: ok
CHECK_4_BYPASS_RESCIND: noted
CHECK_5_LINE_DISJOINT: ok
```
