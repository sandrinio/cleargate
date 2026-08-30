---
bug_id: BUG-059
parent_ref: EPIC-054
parent_cleargate_id: EPIC-054
sprint_cleargate_id: SPRINT-39
carry_over: false
status: Draft
severity: P1-High
reporter: architect (STORY-054-07 post-flight)
area: planning-layer
approved: false
ambiguity: 🟡 Medium
context_source: verified codebase grounding — measured during the STORY-054-07 post-flight review (SPRINT-39 wave7), by executing `.cleargate/scripts/file_surface_diff.sh` in an out-of-tree scratch git repo seeded from this repo's real script, real whitelist, real state.json and real story files. Filed per the post-flight dispatch's Part A1 instruction. Defect A is introduced by STORY-054-07 (`a1250ad0`); Defect B is a pre-existing property of the surface gate that STORY-054-07 makes load-bearing for the first time.
created_at: 2026-08-28T00:00:00Z
updated_at: 2026-08-28T00:00:00Z
created_at_version: a1250ad0
updated_at_version: a1250ad0
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
  last_gate_check: 2026-08-28T10:02:39Z
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

# BUG-059: The Task Breakdown loop cannot execute as written — two defects

### Open Questions

- **Question:** Should the surface gate admit the active work item's own file unconditionally, or only when the item carries a `## Task Breakdown` section?
- **Recommended:** Unconditionally, by whitelist pattern. The gate's purpose is to catch implementation scope creep; a work item editing itself is the one edit that is definitionally in scope, and `file_surface_diff.sh:150-157`'s own comment already blesses the self-amending case for §3.1. A section-conditional rule would need the gate to parse the item body, which it does not do today.
- **Human decision:** _pending Gate 1._

- **Question:** For Defect A, does the Architect's "one markdown plan file, nothing else" Guardrail get narrowed, or does the Task Breakdown paragraph get an explicit carve-out?
- **Recommended:** Narrow the Guardrail. "No production code" is the rule that matters; "one markdown plan file. Nothing else." was a shorthand for it that is now literally false, because the Architect is also required to amend story files. Rewrite the bullet so it forbids production code and permits the plan plus story-file task rows.
- **Human decision:** _pending Gate 1._

## 1. The Anomaly (Expected vs. Actual)

**Expected Behavior:** After STORY-054-06 shipped the `## Task Breakdown` section and STORY-054-07 wired the three execution agents to it, the loop runs end to end: the template ships the section, an author or the Architect writes `- [ ]` rows, the Developer ticks them to `- [x]` in the same commit as the work, QA-Verify reports any that stay unchecked, and `task-breakdown-complete` gates the result.

**Actual Behavior:** Two independent defects. The first stops the Architect half; the second stops the Developer half. Both are silent in the sense that nothing in the three new agent paragraphs mentions either.

**Defect A — `architect.md` contradicts itself, 160 lines apart.**
`cleargate-planning/.claude/agents/architect.md:60-65` (added by `a1250ad0`) instructs the Architect to
`write the same task rows into each story file's own`&nbsp;`## Task Breakdown`&nbsp;`section`.
`cleargate-planning/.claude/agents/architect.md:224`, under `## Guardrails`, states:

> - **No production code.** You write one markdown plan file. Nothing else.

`Nothing else` is categorical and the two rules cannot both be obeyed. An Architect that reads its Guardrails section — which the same file frames as non-negotiable — writes no story-file rows, and the Developer and QA contracts downstream then find nothing to act on. Both trees and the live tree carry the contradiction identically (`diff -q` silent on all three pairs).

**Defect B — the pre-commit surface gate blocks the commit the Developer is told to make.**
`developer.md:48-52` (added by the same commit) says to tick each row `in the same commit as the work it describes`. Ticking a row edits the work-item file under `.cleargate/delivery/pending-sync/`. That path is neither in `.cleargate/scripts/surface-whitelist.txt` (10 patterns, none matching `.cleargate/delivery/**`) nor in any story's own §3.1 file surface — §3.1 declares the implementation surface, not the story file. `file_surface_diff.sh` therefore reports it off-surface and exits 1, and the installed outer `pre-commit` hook chain runs that script via `exec` (`.claude/hooks/pre-commit-surface-gate.sh`, last line).

The same defect has a second face that is worse than the block: **the gate is entirely inert when the active work item is a Bug or a CR.** `find_story_file` (`file_surface_diff.sh:96-104`) globs only `STORY-<num>_*.md`, and `story_num="${story_id#STORY-}"` leaves `BUG-043` unchanged, so the lookup searches for `STORY-BUG-043_*.md`, finds nothing in either root, and the script prints `No active story file found ... skipping surface check` and exits 0. So the tick commit is blocked on Story waves and unguarded on Bug/CR waves — the enforcement is inconsistent, not merely strict.

Loss is bounded and visible in both cases: Defect A produces an empty section rather than wrong rows, and Defect B produces a blocked commit rather than a lost edit. Neither destroys data. Both stop the loop STORY-054-07 exists to close.

## 2. Reproduction Protocol

1. Read `cleargate-planning/.claude/agents/architect.md` lines 60-65 and line 224. Observe that the first requires writing into each story file and the second forbids writing anything but the plan.
2. Create a throwaway git repo. Copy into it, unmodified: `.cleargate/scripts/file_surface_diff.sh`, `.cleargate/scripts/surface-whitelist.txt`, this repo's `.cleargate/sprint-runs/SPRINT-39/state.json`, and any `STORY-054-0N_*.md` from `.cleargate/delivery/pending-sync/`.
3. Write `SPRINT-39` into `.cleargate/sprint-runs/.active`. Commit the tree once so there is a base.
4. Append a `- [x] ticked` line to the copied story file — the exact edit `developer.md:48-52` prescribes — and `git add` it together with one file that the story's §3.1 does declare.
5. Run `bash .cleargate/scripts/file_surface_diff.sh`. Observe exit 1 and `off-surface: .cleargate/delivery/pending-sync/STORY-054-07_Architect_Developer_QA_Wiring.md`. The declared file passes; only the story file is rejected.
6. Now edit the copied `state.json` so the most recently updated entry is `BUG-043` instead of a `STORY-*` id, stage any file at all, and re-run the script. Observe exit 0 and `WARNING: No active story file found` — the gate certified nothing.

## 3. Evidence & Context

Both runs executed 2026-08-28 in an out-of-tree scratch repo; the real repo was read, never written. Raw output:

```
--- Defect B, Story wave: story file staged alongside a declared file ---
$ git diff --cached --name-only
.cleargate/delivery/pending-sync/STORY-054-07_Architect_Developer_QA_Wiring.md
cleargate-planning/.claude/agents/developer.md
$ bash .cleargate/scripts/file_surface_diff.sh
[surface-gate] BLOCKED: staged files outside declared §3.1 surface:
  off-surface: .cleargate/delivery/pending-sync/STORY-054-07_Architect_Developer_QA_Wiring.md
[surface-gate] Commit blocked. Declare these files in §3.1 or open a CR:scope-change.
EXIT=1

--- Defect B, Bug/CR wave: an obviously off-surface file staged ---
$ git diff --cached --name-only
SOMETHING_RANDOM.md
$ bash .cleargate/scripts/file_surface_diff.sh
[surface-gate] WARNING: No active story file found (searched <root> and <root>) — skipping surface check
EXIT=0
```

Corroborating evidence from this sprint's own history: `2ed99cf8` (`docs(SPRINT-39): M2 plan + both story §3.1 amendments`) staged two files under `.cleargate/delivery/pending-sync/` plus `.cleargate/sprint-runs/SPRINT-39/plans/M2.md`. Replaying that exact staged set against the same script, with `state.json` set so the active item is `STORY-054-03` as it was at that timestamp, reproduces `BLOCKED` on all three paths. The commit exists, so it was made with `SKIP_SURFACE_GATE=1` or an equivalent bypass. The workaround is already in routine use and is undocumented in the agent contracts.

Preconditions for Defect B's blocking face: a sprint is active, `.cleargate/sprint-runs/.active` resolves, and the active work item id begins `STORY-`. Preconditions for its inert face: the active work item id begins with anything else.

Relevant grounding:
- `.cleargate/scripts/file_surface_diff.sh:96-104` — `find_story_file`, the `STORY-`-only glob.
- `.cleargate/scripts/file_surface_diff.sh:170-172` — the exit-0 "no active story file" path.
- `.cleargate/scripts/file_surface_diff.sh:315-330` — the off-surface report and exit 1.
- `.cleargate/scripts/surface-whitelist.txt` — 10 patterns, byte-identical to the `cleargate-planning/` mirror; none matches `.cleargate/delivery/**`.
- `.claude/hooks/pre-commit-surface-gate.sh` — final line `exec bash "${SCRIPT}" "$@"`.

## 4. Execution Sandbox (Suspected Blast Radius)

**Investigate / Modify:**
- `cleargate-planning/.claude/agents/architect.md` — the `## Guardrails` bullet at `:224` (Defect A).
- `.cleargate/scripts/surface-whitelist.txt` and its `cleargate-planning/.cleargate/scripts/` mirror — add the work-item path pattern (Defect B, blocking face). Two-tree edit, same commit.
- `.cleargate/scripts/file_surface_diff.sh` and its mirror — `find_story_file` / `resolve_story_file` must resolve a Bug or CR id, not only `STORY-` (Defect B, inert face).
- `cleargate-cli/test/scripts/` — a new `*.node.test.ts` covering both faces.

**Explicitly NOT in scope:**
- `.claude/agents/architect.md` and the other live-tree copies — untracked (CR-099); they are a hand-port, not a commit surface.
- `cleargate-cli/templates/cleargate-planning/**` — generated payload, regenerated at close.
- Promoting QA's Task Breakdown check from advisory to blocking — STORY-054-07 §1.3 defers that deliberately.
- `.cleargate/knowledge/cleargate-enforcement.md` §6's exit-0 ledger — it may need a line, but only after the fix shape is chosen at Gate 1.

## 5. Verification Protocol (The Failing Test)

**Command:** `npm --prefix cleargate-cli test`

The locking test must cover both defects and fail before the fix:

- **Defect A:** assert `cleargate-planning/.claude/agents/architect.md` contains no sentence that forbids the Architect from writing files other than the plan while the Task Breakdown paragraph is present. A literal-string assertion on the current Guardrail text is sufficient and will go red today.
- **Defect B, blocking face:** drive `file_surface_diff.sh` in a temp repo with a `STORY-` active item, stage the story's own file, and assert exit 0. Red today at exit 1.
- **Defect B, inert face:** drive the same script with a `BUG-` active item and one genuinely off-surface file staged, and assert exit 1 with that file named. Red today at exit 0 with the `No active story file found` warning.
- **Regression:** with a `STORY-` active item and a genuinely off-surface implementation file staged, the gate must still exit 1 and name it. This is the behaviour the whitelist addition must not weaken.

## Task Breakdown

> **Required at L3 and above. Optional at L2. Omit the whole section at L1.**
> An absent section passes the gate; a section that is present but carries no task rows does not.
> Write one row per executable step, in execution order:
> `- [ ] <action>` with an optional trailing `-> <requirement-id>`. The requirement reference is
> reserved for grounding ids and is not interpreted today.

- [ ] Settle both Open Questions at Gate 1 — whitelist-vs-parse, and narrow-Guardrail-vs-carve-out
- [ ] Rewrite `architect.md:224` so it forbids production code without forbidding the story-file amendment; both trees byte-identical
- [ ] Add the work-item path pattern to `surface-whitelist.txt`; both trees byte-identical
- [ ] Teach `find_story_file` / `resolve_story_file` to resolve a Bug or CR id, not only `STORY-`; both trees byte-identical
- [ ] Write the four-assertion locking test and confirm three of the four are red before the fix
- [ ] Re-run the full cli suite and record pass/fail/skipped, since commits made inside `cleargate-cli` are ungated

## Prior work

- [[STORY-054-07]] — the story that introduced Defect A and made Defect B load-bearing. Post-flight PASS; this bug is its filed residue, not a kick-back.
- [[STORY-054-06]] — shipped the `## Task Breakdown` section and the `task-breakdown-complete` predicate the loop gates on.
- [[EPIC-054]] — parent epic, workstreams WS6 and WS7.
- [[BUG-046]] — the previous measured defect in the same enforcement family: a wave predicate certifying a surface no Developer can reach.
- [[CR-099]] — established that the live `.claude/` tree is untracked and canonical is the tracked source; it is why Defect A's fix lands in `cleargate-planning/`.
- No prior item reports the surface gate rejecting a work item's own file, or the gate skipping on a non-`STORY-` active item. `.cleargate/delivery/archive/` and `.cleargate/FLASHCARD.md` were grepped for `surface-gate`, `file_surface_diff` and `off-surface`; the only hits are the two flashcards about the dead `state in (...)` branch and the ungated `cleargate-cli` checkout, neither of which is this.

## Context Source

> Discovery audit. Populated from the approved Epic, verified codebase grounding, and recorded direct approval.

**context_source:** Measured during the STORY-054-07 post-flight review (SPRINT-39 wave7) against outer commit `a1250ad0`, by executing the real `file_surface_diff.sh` in an out-of-tree scratch repo and by reading `architect.md` end to end rather than grepping it. Filed per the post-flight dispatch's Part A1 instruction to name the first place the sprint-goal chain breaks.

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

**Held at 🟡 deliberately.** Four of five criteria are met literally. The fifth is unchecked because it is literally false — `approved: false` — and both Open Questions are unanswered. The fix shape for Defect B is a real choice (whitelist pattern versus body-parsing) with different blast radii, and choosing it here rather than at Gate 1 would be the interpretive leap the gate exists to catch.
