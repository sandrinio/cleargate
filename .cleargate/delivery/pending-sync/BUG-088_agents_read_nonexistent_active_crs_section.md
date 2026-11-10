---
bug_id: BUG-088
parent_cleargate_id: null
sprint_cleargate_id: SPRINT-43
carry_over: false
status: Draft
severity: P3-Low
ambiguity: 🟡 Medium
approved: false
context_source: "Verified 2026-09-06: 12 references to an 'Active CRs' section across 5 agent files + SKILL.md in both trees; `## Active CRs` present in 0 of 18 files (template + 17 runtime sprint-context.md)"
area: sprint-execution,agent-prompts,scaffold-hygiene
created_at: 2026-09-06T00:00:00Z
updated_at: 2026-09-06T00:00:00Z
created_at_version: cleargate@0.26.1
updated_at_version: cleargate@0.26.1
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-09-06T16:37:43Z
  transition: ready-for-fix
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id BUG-088
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-09-06T16:37:42Z
  sessions: []
---

# BUG-088: Every Agent Is Ordered to Read a `## Active CRs` Section That Has Never Existed

### Open Questions

- **Question:** Strike the reference, or create the section?
- **Recommended:** Strike it. The section has had no producer for 17 sprints and no consumer has ever missed it; `init_sprint.mjs` has no code that would populate one. Creating a section to satisfy a stale sentence would add a surface that then needs filling, which is the failure mode already visible in §Cross-Cutting Rules. If per-sprint CR context is genuinely wanted later, that is a separate item with its own producer.
- **Human decision:** {populated during Brief review}

## 1. The Anomaly (Expected vs. Actual)

**Expected Behavior:** An agent's mandated preflight names sections that exist in the file it is told to read.

**Actual Behavior:** All five execution agents and SKILL.md instruct every dispatch that "The Sprint Goal + Cross-Cutting Rules + **Active CRs** sections constrain every decision in this dispatch." No `## Active CRs` section exists in the template or in any of the 17 runtime `sprint-context.md` files, and `init_sprint.mjs` contains no code to write one. Separately, `SKILL.md:165` asserts that `init_sprint.mjs` populates sprint-context.md with an "active CR list" — describing behaviour the script does not implement.

Every dispatch for 17 sprints has preflighted against a named authority that is not there. The cost is trust, not minutes: an agent told to treat three sections as binding, which finds two, learns that the preflight file's own self-description is unreliable.

## 2. Reproduction Protocol

- Run: `command grep -rn "Active CRs" .claude/agents/ .claude/skills/ cleargate-planning/.claude/agents/ cleargate-planning/.claude/skills/`
- Observe exactly 12 matches: `architect.md:20`, `qa.md:20`, `developer.md:20`, `devops.md:20`, `reporter.md:26`, `SKILL.md:242` — each present in both the live and canonical trees.
- Run: `command grep -l "## Active CRs" .cleargate/templates/sprint_context.md cleargate-planning/.cleargate/templates/sprint_context.md .cleargate/sprint-runs/*/sprint-context.md`
- Observe zero matches across all 18 files.
- Read `.cleargate/scripts/init_sprint.mjs` and confirm no code path emits an "Active CRs" heading or list.
- Read `SKILL.md:165` and observe the claim that init populates an "active CR list".

## 3. Evidence & Context

```
--- 12 references, verified 2026-09-06
.claude/agents/architect.md:20
.claude/agents/qa.md:20
.claude/agents/developer.md:20
.claude/agents/devops.md:20
.claude/agents/reporter.md:26
.claude/skills/sprint-execution/SKILL.md:242
cleargate-planning/.claude/agents/architect.md:20
cleargate-planning/.claude/agents/qa.md:20
cleargate-planning/.claude/agents/developer.md:20
cleargate-planning/.claude/agents/devops.md:20
cleargate-planning/.claude/agents/reporter.md:26
cleargate-planning/.claude/skills/sprint-execution/SKILL.md:242

--- the referenced text, identical at all 5 agent sites
"Before any other action, Read `.cleargate/sprint-runs/<sprint-id>/sprint-context.md`.
 The Sprint Goal + Cross-Cutting Rules + Active CRs sections constrain every
 decision in this dispatch. If the file is absent, surface to orchestrator (do not infer)."

--- occurrences of "## Active CRs" across template + 17 runtime files
0

--- SKILL.md:165 (unimplemented claim)
"...populated with `sprint_id` + goal ... + active CR list."
```

**Honest counter-evidence, recorded so this is not over-ranked.** In SPRINT-40, 6 of 6 Dev and QA dispatches cited §Test Stack verbatim despite `1. (rule 1)` sitting two sections above. Sonnet demonstrably reads past template noise. The win here is trust and hygiene, not a measured defect — hence P3-Low.

## 4. Execution Sandbox (Suspected Blast Radius)

**Investigate / Modify:**
- `cleargate-planning/.claude/agents/{architect,qa,developer,devops,reporter}.md` and their live mirrors — strike ` + Active CRs` from the preflight sentence
- `cleargate-planning/.claude/skills/sprint-execution/SKILL.md:242` and live — same
- `cleargate-planning/.claude/skills/sprint-execution/SKILL.md:165` and live — remove the unimplemented "active CR list" claim

**Do NOT modify:**
- Any `## ` heading in `sprint_context.md`. `init-sprint-context.red.node.test.ts:145-147` asserts `## Cross-Cutting Rules`, `## Active FLASHCARD Tags` and `## Adjacent Implementations` render; it is green and sealed post-Red.
- The rest of the preflight sentence. `autonomy-contract.red.node.test.ts` and `agent-developer-section.integration.node.test.ts` pin literal strings in these files — run them before committing.

## Task Breakdown

- [ ] Strike ` + Active CRs` at the 5 canonical agent sites
- [ ] Strike it at `SKILL.md:242` canonical
- [ ] Remove the unimplemented "active CR list" claim at `SKILL.md:165` canonical
- [ ] Mirror all 6 canonical edits to the live tree
- [ ] Run the pinned agent-prompt tests (`autonomy-contract`, `agent-developer-section`, `qa-content`, `test-layers-declared-doctrine`) before committing
- [ ] Re-grep to confirm 0 remaining references

## 5. Verification Protocol (The Failing Test)

**Command:** `bash .cleargate/scripts/test/bug088_no_phantom_sections.red.sh`

The harness asserts a general invariant rather than a one-off string: for every `## <Name>` section that an agent preflight sentence declares constraining, that heading must exist in `.cleargate/templates/sprint_context.md`. Pre-fix it fails naming `Active CRs`; post-fix it passes and guards against the next phantom.

**Test layers.** Declare all three below.

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 0 | Markdown-only change; no functions touched |
| Integration tests | 0 | No runtime surface involved |
| E2E / acceptance tests | 3 | phantom-section invariant fails pre-fix; passes post-fix; the three pinned headings still render |

---

## Prior work

- none found for the phantom section itself — the `cleargate-wiki-query` pass returned no item covering it.
- [[EPIC-044]] — Completed, "Agent Dispatch Reliability & Token Efficiency". Owns dispatch/prompt structure; the phantom reference likely predates or survived it.
- [[EPIC-054]] — Completed, "Spike & Task Decomposition Surfaces". Added sections across the same agent files and is a plausible origin for a left-behind reference.
- [[CR-110]] — Completed. Established which `sprint_context.md` sections are real and agent-read; this bug removes a name that never joined that set.

## Context Source

**context_source:** Verified by grep 2026-09-06 during the execution-efficiency audit: 12 references across 5 agent files and SKILL.md in both trees; `## Active CRs` present in 0 of 18 candidate files; `init_sprint.mjs` has no producer. Counter-evidence (SPRINT-40 agents read past placeholder noise) recorded in §3 and reflected in the P3-Low severity.

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

> The single unchecked box is the Gate-1 human decision, plus the §Open Questions strike-vs-create call.
