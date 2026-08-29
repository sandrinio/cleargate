---
bug_id: BUG-062
parent_ref: EPIC-043
parent_cleargate_id: EPIC-043
sprint_cleargate_id: null
carry_over: false
area: planning-layer
status: Draft
severity: P1-High
reporter: orchestrator
approved: false
context_source: "Split out of BUG-046 on 2026-08-29 by explicit human decision at the M4 planning halt, on the M4 Architect's measurement that BUG-046 carried four independent defects across 13 files and 13 verification cases — CR-108-sized for a single wave-10 dispatch. The split line is the Architect's and is clean: BUG-046 keeps reachability + refusal (cases C1-C7, C12, C13); this item takes dep_predecessors and the parser unification (C8-C11). Every claim below is inherited verbatim from BUG-046 §3.5(a)-(d), where it was measured live during SPRINT-39's own fan-out rather than reasoned. Grounding: .cleargate/scripts/collision_surface.sh:118-125 (the Sandbox parser's `do not` check added by BUG-049) and its §3.1 table parser, .claude/agents/architect-reader.md:35, .cleargate/sprint-runs/SPRINT-39/plans/waves.json."
created_at: 2026-08-29T00:00:00Z
updated_at: 2026-08-29T00:00:00Z
created_at_version: cleargate@0.24.2
updated_at_version: 5a33eae5
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
  last_gate_check: 2026-08-28T22:38:46Z
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

# BUG-062: The collision extractor derives no dependency edges and reads prose as file surface

> **SPLIT PROVENANCE (2026-08-29).** This item did not exist before today. It is the second half of
> [[BUG-046]], separated at the M4 planning halt by explicit human decision after the M4 Architect
> measured BUG-046 as four independent defects spanning thirteen files in two trees with thirteen
> verification cases. Nothing here is new analysis: §1-§3 are BUG-046 §3.5(a)-(d) moved, not
> rewritten. BUG-046 retains the worktree-reachability defect and its refusal path.

### Open Questions

- **Question:** Where does `dep_predecessors` live — a frontmatter list, or a parsed §2.2-style body row?
- **Recommended:** Frontmatter. `architect-reader.md:35` already reads the digest's other fields from
  frontmatter, and a machine-read edge set should not depend on prose formatting that no gate checks.
- **Human decision:** *(open)*

- **Question:** Should the four over-reporting cases be fixed as four guards, or as one unification of
  the two parsers that already disagree?
- **Recommended:** Unification. BUG-046 §3.5(d) already argues this: the Execution-Sandbox parser
  honours a `Do NOT modify` label (`collision_surface.sh:118-125`) and the §3.1 table parser ignores
  labels entirely. Adding a `/reference|read-only/i` special case leaves the two parsers disagreeing
  on the next label anyone invents.
- **Human decision:** *(open)*

## 1. The Anomaly (Expected vs. Actual)

**Expected:** `collision_surface.sh` emits a story's real write-set, and the wave-compatibility
predicate's clause 5 ("no dependency edge") evaluates against edges the extractor derived.

**Actual, both halves measured during SPRINT-39's own fan-out:**

**(a) Clause 5 is blind.** All **18** SPRINT-39 reader digests returned `dep_predecessors: []`. No
work-item template carries the field and `collision_surface.sh` emits nothing for it, so clause 5
evaluates against an always-empty set. **Every edge in SPRINT-39's `waves.json` was hand-carried by
the Orchestrator from the sprint plan's §2.1/§2.2 — the predicate derived none of them.** Left
uncorrected it would have co-waved `STORY-054-07` with `CR-108`/`CR-110`, and `BUG-043` with all
three M4 bugs. No clause would have blocked any of it.

**(b) The write-set is polluted by prose.** Four distinct over-reporting cases, all observed live:
1. Trailing `— description` text: `BUG-046` picked up `mcp/` from *"replace the false `mcp/` claim"*;
   `CR-106` picked up `state.json`; `BUG-045` picked up `cleargate-cli/test/`.
2. §3.1 prose cells containing `/`: `looks_like_path` accepts any token with a slash, so
   `New *.node.test.ts under cleargate-cli/test/` is emitted as file surface.
3. `Reference (read-only)` rows: observed on `STORY-054-01`, whose §3.1 declares two read-only
   template references and whose surface emitted **all four** paths.
4. The two parsers disagree by construction — the Sandbox parser reads row labels, the §3.1 table
   parser does not.

**Severity split, and it is the reason this item is P1 rather than P2.** (a) fails toward a **real
collision** — two genuinely dependent items co-waved and executed in parallel. (b) fails toward
**over-serialization**, which the script's own header calls the safe direction: it costs wall-clock,
not correctness. They are filed together because they live in the same script and the same digest
contract, not because they carry the same risk.

## 2. Reproduction Protocol

1. Run `.cleargate/scripts/collision_surface.sh` against any SPRINT-39 story file.
2. Observe `dep_predecessors` is absent from the output entirely — not empty-by-derivation, absent.
3. Run it against `BUG-046`'s own file. Observe `mcp/` in the emitted surface, sourced from the
   trailing description of a bullet, not from a declared path.
4. Run it against `STORY-054-01`. Observe all four §3.1 paths emitted, including the two on the row
   labelled `Reference (read-only)`.
5. Inspect `.cleargate/sprint-runs/SPRINT-39/plans/waves.json`: every dependency edge present was
   written by the Orchestrator, none by the extractor.

## 3. Evidence & Context

- `.cleargate/scripts/collision_surface.sh:118-125` — the Execution-Sandbox parser's `do not` label
  check, added by [[BUG-049]]. The §3.1 table parser has no equivalent.
- `.claude/agents/architect-reader.md:35` — reads digest fields from frontmatter; the natural home
  for a declared `dep_predecessors`.
- All 18 SPRINT-39 reader digests — `dep_predecessors: []`, every one.
- BUG-046 §3.5(a)-(d), from which this evidence is moved verbatim.

## 4. Execution Sandbox (Suspected Blast Radius)

**Investigate / modify:**
- `.cleargate/scripts/collision_surface.sh` — cut each bullet at the first ` — ` before extracting;
  reject §3.1 cells containing spaces; unify the two parsers on one label check.
- `.claude/agents/architect-reader.md` — emit `dep_predecessors` in the digest.
- `.claude/agents/architect-synth.md` — refuse to co-wave two items joined by a declared edge.
- Work-item templates (`story.md`, `CR.md`, `Bug.md`) — a declared home for `dep_predecessors`.
- `cleargate-planning/` mirrors of every `.claude/` and `.cleargate/templates/` file above
  (dogfood-split rule — canonical is the source, live does not auto-propagate).

**Do NOT modify:** the five-clause predicate itself, `launch_wave.mjs`, worktree creation, the
worktree-reachability classifier or its refusal path ([[BUG-046]] owns those).

**Blast radius:** the collision-surface pipeline gates every story dispatch in every sprint. Adding
a template field moves no `section(N)` index only if it lands in frontmatter; a new `## ` heading
would engage Cross-Cutting Rule 4 and must be avoided.

## 5. Verification Protocol (The Failing Test)

**Command:** `bash .cleargate/scripts/test/test_file_surface.sh` and `test_collision_surface.sh`

1. **The failing test (C8).** An item declaring `dep_predecessors: [X]` yields a non-empty digest
   field, and `architect-synth` refuses to co-wave the pair without an Orchestrator override.
   **Must fail against the current tree.** Mutants to kill: reading the field from the body instead
   of frontmatter (contradicts `architect-reader.md:35`); defaulting a *missing* key to anything
   other than `[]`.
2. **(C9)** A sandbox bullet ``- `a/b.ts` — see `c/d.ts` `` yields only `a/b.ts`. **The fixture path
   must contain a hyphen** — `cleargate-cli/test/hooks/cr-026-integration.node.test.ts` is a real
   one — or a mutant that cuts at the first `-` instead of the first ` — ` survives.
3. **(C10)** A §3.1 cell `New *.node.test.ts under cleargate-cli/test/` yields no path. Mutants to
   kill: rejecting only cells with two or more spaces; rejecting by regex on the word `under`.
4. **(C11)** A §3.1 row labelled `Reference (read-only)` **and** a row labelled `Do NOT modify` are
   both skipped. Mutant to kill: adding a `/reference|read-only/i` special case only — the
   unification must reuse the Sandbox parser's `do not` check, so a `Do NOT modify` row in a *table*
   is skipped too.
5. All existing cases in both harnesses stay green (regression guard).

**Parity check:** every modified `.claude/` and template file diffs clean against its
`cleargate-planning/` mirror.

## Task Breakdown

> Rows split from [[BUG-046]]'s M4-plan task list on 2026-08-29, plus the two rows the split itself
> requires. Execution order. Not scheduled into SPRINT-39 — this item is `approved: false`.

- [ ] Resolve both §Open Questions with the human (dep_predecessors home; four guards vs one unification)
- [ ] QA-Red: author C8-C11 across test_file_surface.sh and test_collision_surface.sh; confirm all four red
- [ ] Give `dep_predecessors` a declared home in story.md/CR.md/Bug.md frontmatter, BOTH template trees
- [ ] architect-reader.md: emit `dep_predecessors` in the digest; missing key defaults to []
- [ ] architect-synth.md: refuse to co-wave two items joined by a declared edge
- [ ] collision_surface.sh: cut each sandbox bullet at the first ' — ' before emit_backticked
- [ ] collision_surface.sh: reject §3.1 cells containing spaces
- [ ] collision_surface.sh: unify the two parsers on the :91 'do not' label check so table rows honour labels too
- [ ] Mirror collision_surface.sh, both agents and all three templates into cleargate-planning/
- [ ] Run gate-section-index-pinning; assert no section index moved (frontmatter-only template change)
- [ ] Verify every mirrored pair diffs clean; zero .claude/ live paths in git diff --name-only

## Prior work

- [[BUG-046]] — the parent this was split from; retains worktree reachability and the refusal path.
  The two items share `collision_surface.sh` and must not run in the same wave.
- [[BUG-049]] — added the Execution-Sandbox parser whose `do not` label check this item unifies with
  the §3.1 table parser. The over-reporting in §1(b) case 1 was introduced by it.
- [[EPIC-055]] — parallel wave scheduling; consumes the edges this item makes derivable.
- `cleargate wiki query` returned no item proposing a declared home for `dep_predecessors`.

## Context Source

**context_source:** Split from [[BUG-046]] 2026-08-29 at the M4 planning halt by explicit human
decision, on the M4 Architect's measurement of BUG-046 as four defects / 13 files / 13 cases. All
evidence moved verbatim from BUG-046 §3.5(a)-(d), where it was observed live during SPRINT-39's own
fan-out. No new analysis was performed for this split.

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

**Held at 🟡 deliberately.** Six of seven criteria are met literally. The seventh is human approval,
and both §Open Questions carry a recommendation but no recorded decision — the `dep_predecessors`
home and the four-guards-vs-unification choice both change the shape of the fix. Going green on
box-count while those are open would be the interpretive leap the gate exists to catch.
