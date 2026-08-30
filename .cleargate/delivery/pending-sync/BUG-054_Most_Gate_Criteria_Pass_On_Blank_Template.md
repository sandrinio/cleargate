---
bug_id: BUG-054
parent_ref: EPIC-043
parent_cleargate_id: "EPIC-043"
sprint_cleargate_id: null
carry_over: false
status: Draft
severity: P1-High
reporter: orchestrator
approved: false
area: planning-layer
context_source: verified codebase grounding — every section(N) criterion in readiness-gates.md executed against its own shipped template via the real exported evaluate(); surfaced by the STORY-054-01 Architect post-flight and independently re-measured by the orchestrator
created_at: 2026-08-27T00:00:00Z
updated_at: 2026-08-27T00:00:00Z
created_at_version: cleargate@0.24.2
updated_at_version: cleargate@0.24.2
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
  last_gate_check: 2026-08-27T14:50:08Z
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

# BUG-054: Nine of twelve gate criteria pass on their own unedited template

### Open Questions

- **Question:** Is the fix per-criterion (change predicate kinds and thresholds), per-template (remove the counted shape from the scaffold), or structural (a test that forbids the condition outright)?
- **Recommended:** Structural, plus whichever per-case repair each row needs. The durable artefact is a registry-wide test asserting that **every** `section(N)` criterion FAILS against its own shipped template, with a size-asserted allowlist for any deliberate exception. Without it the next template edit silently re-vacates a criterion, which is exactly how these nine arrived.
- **Human decision:** {populated during Brief review}

- **Question:** Does fixing this break the existing corpus?
- **Recommended:** Almost certainly yes, and that is the real cost. Tightening these criteria will fail items that pass today. The BUG-042 precedent applies — accept residue, record it, do not bulk-rewrite the archive — but the size of the residue must be measured before the fix is scheduled, not after.
- **Human decision:** {populated during Brief review}

## 1. The Anomaly (Expected vs. Actual)

**Expected Behavior:** A readiness criterion exists to detect that an author left a required section empty. Evaluated against a blank scaffold, every such criterion should **fail**.

**Actual Behavior:** **Nine of the twelve** pinnable `section(N)` criteria **pass** when evaluated against their own unedited template. They certify nothing: a document in which the author filled in none of the gated sections satisfies them.

| Criterion | Check | Score on blank template | Verdict |
|---|---|---|---|
| `epic.scope-in-populated` | `section(3) has ≥1 declared-item` | 3 | **fail-open** |
| `epic.affected-files-declared` | `section(8) has ≥1 declared-item` | 4 | **fail-open** |
| `story.implementation-files-declared` | `section(3) has ≥1 declared-item` | 4 | **fail-open** |
| `story.dod-declared` | `section(4) has ≥1 listed-item` | 3 | **fail-open** |
| `cr.blast-radius-populated` | `section(3) has ≥1 declared-item` | 3 | **fail-open** |
| `cr.sandbox-paths-declared` | `section(6) has ≥1 declared-item` | 2 | **fail-open** |
| `bug.repro-steps-deterministic` | `section(2) has ≥3 declared-item` | 3 | **fail-open** |
| `initiative.success-criteria-populated` | `section(5) has ≥1 listed-item` | 3 | **fail-open** |
| `hotfix.files-touched-declared` | `section(3) has ≥1 declared-item` | 2 | **fail-open** |
| `initiative.user-flow-populated` | `section(1) has ≥1 listed-item` | 0 | correct |
| `hotfix.anomaly-populated` | `section(2) has ≥1 listed-item` | 0 | correct |
| `hotfix.verification-steps-nonempty` | `section(4) has ≥1 unchecked-checkbox` | 0 | correct |

Two further criteria (`proposal.architecture-populated`, `proposal.touched-files-populated`) are un-pinnable — `proposal` is a registered gated type with no template on disk.

**Note `bug.repro-steps-deterministic` in particular.** Its threshold is `≥3`, which reads as deliberate hardening. The blank template scores **exactly 3**. Raising a threshold does not escape this class; the scaffold simply supplies whatever the threshold demands.

## 2. Reproduction Protocol

Deterministic, read-only, no network:

- For each fenced YAML gate block in `.cleargate/knowledge/readiness-gates.md`, take every criterion whose `check` matches `^section\(\d+\)`.
- Map `work_item_type` → template: `story`→`story.md`, `epic`→`epic.md`, `cr`→`CR.md`, `bug`→`Bug.md`, `initiative`→`initiative.md`, `hotfix`→`hotfix.md`, `sprint`→`Sprint Plan Template.md`. `proposal` has no template.
- Read the template, strip the `<instructions>` block, then strip the frontmatter — i.e. reproduce what a rendered instance looks like before an author types anything.
- Call the real exported `evaluate(check, { fm: {}, body })` from `cleargate-cli/src/lib/readiness-predicates.ts`.
- Any criterion returning `pass: true` is fail-open.

Result: 14 criteria total → 12 pinnable → **9 pass, 3 fail**, 2 un-pinnable.

## 3. Evidence & Context

```
section(N) criteria found: 14

  VACUOUS ⚠  epic.scope-in-populated              section(3) has ≥1 declared-item -> section 3 has 3 declared-item (≥1 required)
  VACUOUS ⚠  epic.affected-files-declared         section(8) has ≥1 declared-item -> section 8 has 4 declared-item (≥1 required)
  VACUOUS ⚠  story.implementation-files-declared  section(3) has ≥1 declared-item -> section 3 has 4 declared-item (≥1 required)
  VACUOUS ⚠  story.dod-declared                   section(4) has ≥1 listed-item   -> section 4 has 3 listed-item (≥1 required)
  VACUOUS ⚠  cr.blast-radius-populated            section(3) has ≥1 declared-item -> section 3 has 3 declared-item (≥1 required)
  VACUOUS ⚠  cr.sandbox-paths-declared            section(6) has ≥1 declared-item -> section 6 has 2 declared-item (≥1 required)
  VACUOUS ⚠  bug.repro-steps-deterministic        section(2) has ≥3 declared-item -> section 2 has 3 declared-item (≥3 required)
  VACUOUS ⚠  initiative.success-criteria-populated section(5) has ≥1 listed-item  -> section 5 has 3 listed-item (≥1 required)
  VACUOUS ⚠  hotfix.files-touched-declared        section(3) has ≥1 declared-item -> section 3 has 2 declared-item (≥1 required)
  real       initiative.user-flow-populated       section(1) has ≥1 listed-item   -> section 1 has 0 listed-item (≥1 required)
  real       hotfix.anomaly-populated             section(2) has ≥1 listed-item   -> section 2 has 0 listed-item (≥1 required)
  real       hotfix.verification-steps-nonempty   section(4) has ≥1 unchecked-checkbox -> section 4 has 0 unchecked-checkbox (≥1 required)

SUMMARY: 9 pass-on-empty-template (VACUOUS) | 3 correctly fail | 2 un-pinnable
```

**Two distinct causes, and only one of them is already filed.**

- **Seven** rows fail open through `declared-item`, which scores any line beginning with a capital and reaching a colon before a `|` or `*` — bold subsection labels *and* ordinary guidance prose. That mechanism is [[BUG-050]], whose scope was widened with measured evidence in its §3.1 on the same day as this measurement.
- **Two** rows — `story.dod-declared` and `initiative.success-criteria-populated` — fail open through **`listed-item`**, which counts only `/^\s*- /gm`. BUG-050 does not explain these. Their cause is simply that the shipped template ships bullets in the gated section: `story.md` §4 carries three `- [ ]` lines and `initiative.md` §5 carries three `- {…}` lines. **This is the more dangerous half**, because `listed-item` is the predicate currently recommended as the *safe* alternative to `declared-item` — and it is safe only when paired with a template that ships zero of the counted shape. That pairing is an authoring convention with nothing enforcing it, and it has already been broken twice.

**Why this matters more than any individual row.** ClearGate's readiness gates are the mechanism by which a work item is declared ready. The three criteria that work are outnumbered three to one by criteria that pass on a blank page. Every `cached_gate_result.pass: true` in the corpus carries less assurance than it appears to, and the failure is silent in the direction that matters — it never blocks, it only fails to block.

## 4. Execution Sandbox (Suspected Blast Radius)

**Investigate / Modify:**
- `.cleargate/knowledge/readiness-gates.md` — the criteria: predicate kinds and thresholds. Plus the `cleargate-planning/` mirror, same commit (Cross-Cutting Rule 1).
- `.cleargate/templates/{story,epic,CR,Bug,initiative,hotfix}.md` — the counted shapes the scaffolds ship. Plus mirrors.
- `cleargate-cli/src/lib/readiness-predicates.ts` — `countDeclaredItems` (:712-763) and the `listed-item` branch (:667). **Frozen for the duration of SPRINT-39** by that sprint's Cross-Cutting Rule 3; this bug must not be scheduled against a sprint where that freeze is in force.
- `cleargate-cli/test/docs/gate-section-index-pinning.node.test.ts` — the natural home for the registry-wide non-vacuity assertion, since it already enumerates every `section(N)` criterion and resolves its template.

**Explicitly NOT in scope:** bulk-rewriting `.cleargate/delivery/archive/**` to satisfy tightened criteria. The BUG-042 precedent stands — accept and record the residue.

## 5. Verification Protocol (The Failing Test)

**Command:** `npm --prefix cleargate-cli exec -- tsx --test cleargate-cli/test/docs/gate-section-index-pinning.node.test.ts`

The assertion does not exist yet. It is a natural extension of the file STORY-054-05 shipped, which already enumerates all 14 criteria and resolves each to its template — it needs only to additionally **evaluate** each one and assert `pass === false`, with a size-asserted `KNOWN_VACUOUS` allowlist seeded at the nine rows above so the count can only go down.

Seeding the allowlist at nine is deliberate: it makes the current state explicit rather than aspirational, fails loudly if a tenth appears, and turns each repair into a one-line deletion with a visible diff.

---

## Prior work

> Duplicate-check evidence, enforced by the `prior-work-recorded` readiness predicate.

- [[BUG-050]] — the `countDeclaredItems` mechanism. Explains **7 of the 9** rows. Filed earlier in SPRINT-39 and widened with measured evidence (§3.1) the same day as this measurement. This bug is the systemic count BUG-050 implies but does not state, and it additionally covers the two `listed-item` rows BUG-050 cannot explain.
- [[BUG-042]] — corrected three drifted `section(N)` **indices**. Adjacent and complementary: BUG-042 fixed which section a criterion reads; this bug is about criteria that pass regardless of which section they read. A correct index pointing at a vacuous criterion is still vacuous — noted in BUG-042's own closure as an accepted residue (R10).
- [[STORY-054-05]] — shipped the enumerating pinning test that makes this measurable at all, and is the natural host for the fix's assertion.
- [[BUG-051]] — same-day sibling; another class of invariant assumed enforced that nothing enforces.

## Context Source

> Discovery audit.

**context_source:** verified codebase grounding — surfaced by the STORY-054-01 Architect post-flight while stress-testing whether the new spike gate's non-vacuity was robust, then independently re-measured by the orchestrator by executing all 14 criteria against their own templates through the real exported `evaluate()`. Counts agree exactly. No prior epic approval; filed for triage.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟡 Medium Ambiguity**

*Evaluate each criterion against its literal text.*

Requirements to pass to Green (Ready for Fix):
- [x] Reproduction steps are 100% deterministic.
- [x] Actual vs. Expected behavior is explicitly defined.
- [x] Raw error logs/evidence are attached.
- [ ] Verification command (failing test) is provided. — the host file exists and the assertion is specified, but it is not written, and it must not be while `readiness-predicates.ts` is frozen.
- [ ] `approved: true` is set in the YAML frontmatter.
