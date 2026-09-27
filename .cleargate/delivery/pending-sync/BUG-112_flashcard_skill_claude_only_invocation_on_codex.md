---
bug_id: BUG-112
parent_ref: STORY-058-11
parent_cleargate_id: null
sprint_cleargate_id: SPRINT-41
carry_over: false
area: codex-adapter
status: Triaged
severity: P3-Low
reporter: orchestrator (SPRINT-41 Codex dogfood run r7, issue I22)
approved: true
approved_by: "sandrinio (SPRINT-41 directives: 'log every issue you find and fix them'; 2026-09-27 'you watch and file all issues, then fix and then use codex to test again'; 'you respond as an owner'); filed by the orchestrator per plans/M7.md §8.4"
approved_at: 2026-09-27T08:58:00Z
context_source: "Codex dogfood r7 (issues.md I22); verified codebase grounding at cli main 0e5b0ac: scaffold/core/.agents/skills/flashcard/SKILL.md:81-83 (Skill(flashcard, …) invocations in the portable skill), scaffold/hosts/codex/.codex/agents/{architect,developer,qa,reporter}.toml (2-3 Skill(flashcard, …) each, generated from the Claude agents by npm run gen:codex)"
created_at: 2026-09-27T08:58:00Z
updated_at: 2026-09-27T08:58:00Z
created_at_version: strategy-phase-pre-init
updated_at_version: strategy-phase-pre-init
server_pushed_at_version: null
draft_tokens:
  input: null
  output: null
  cache_read: null
  cache_creation: null
  model: null
  sessions: []
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-09-27T09:01:06Z
  transition: ready-for-fix
---

# BUG-112: Codex agents are told to call `Skill(flashcard, "check")`, a Claude tool call, so Codex invents a `cleargate flashcard` command

### Open Questions

- **Question:** Rewrite the Codex renders, or make the portable skill host-neutral?
- **Recommended:** Both, at their sources.
  - The portable `scaffold/core/.agents/skills/flashcard/SKILL.md` describes its modes host-neutrally ("`check` — read `.cleargate/FLASHCARD.md` and apply the Rule 8 filter…"), with no `Skill(...)` syntax.
  - The agent-TOML codegen maps `Skill(flashcard, "<mode>")` to `use the flashcard skill in <mode> mode (read .cleargate/FLASHCARD.md)`.
  - The Claude agents and the Claude flashcard skill are unchanged.
- **Human decision:** Recommended option taken by the orchestrator acting as owner (2026-09-27 "you respond as an owner"). The owner may overrule at the next check-in.

## 1. The Anomaly (Expected vs. Actual)
**Expected Behavior:** Every instruction a Codex agent reads names an action Codex can take.

**Actual Behavior:** The Codex `architect`, `developer`, `qa` and `reporter` TOMLs, and the portable flashcard skill, say `Skill(flashcard, "check")`. Codex has no `Skill` tool, so the orchestrator translated it to `cleargate flashcard check --topic sprint-execution` → `error: unknown command 'flashcard'`.

## 2. Reproduction Protocol
1. `command grep -c 'Skill(flashcard' scaffold/hosts/codex/.codex/agents/*.toml` → architect 2, developer 2, qa 3, reporter 2.
2. `command grep -n 'Skill(flashcard' scaffold/core/.agents/skills/flashcard/SKILL.md` → lines 81–83.
3. In a Codex session, follow either instruction literally.

Edge conditions:
- The Claude renders keep `Skill(flashcard, …)`, which is valid on Claude Code.
- `build-codex-payload.mjs --check` and the codegen `--check` pass after regeneration.
- The Claude-only flashcard skill (`scaffold/hosts/claude/.claude/skills/flashcard/SKILL.md`) is untouched.

## 3. Evidence & Context
```
Codex r7: cleargate flashcard check --topic sprint-execution
error: unknown command 'flashcard'
(use `cleargate --help`)
qa.toml:24   | **Skills** | `Skill(flashcard, "check")` — first action on spawn |
flashcard/SKILL.md:81  - **`Skill(flashcard, "check")`** — open `.cleargate/FLASHCARD.md`, apply the Rule 8 filter …
```

## 4. Execution Sandbox (Suspected Blast Radius)
**Investigate / Modify:**
- `cleargate-cli/scaffold/core/.agents/skills/flashcard/SKILL.md` (portable skill text).
- The agent-TOML codegen replacement table (`npm run gen:codex`; the payload builder has upstream BUG-101, which edits `build-codex-payload.mjs`).
- The regenerated `scaffold/hosts/codex/.codex/agents/*.toml`; tests beside the codex payload and portable-skills tests.

**Do NOT modify:** `scaffold/hosts/claude/**`.

## Task Breakdown
- [ ] QA-Red: no `Skill(` in any Codex TOML or the portable flashcard skill; the Claude agents unchanged
- [ ] Portable skill wording, codegen replacement, gen:codex
- [ ] Typecheck, codex payload/portable-skills tests, --check

## 5. Verification Protocol (The Failing Test)
**Command:** `cd cleargate-cli && npm run test:file -- test/scripts/codex-no-skill-calls.red.node.test.ts` (solo).

| Axis | Cover | Reason |
|---|---|---|
| Paths | F | One render path |
| Interfaces | T | Agent TOMLs and the portable skill |
| Data | F | No data variation |
| Rules | T | The Claude renders keep `Skill(...)` |

```gherkin
Feature: Codex instructions name actions Codex can take

  @interfaces
  Scenario: No Claude tool-call syntax in Codex renders
    Given the generated .codex/agents/*.toml and scaffold/core/.agents/skills/flashcard/SKILL.md
    Then none contains "Skill("
    And each flashcard instruction names .cleargate/FLASHCARD.md

  @rules
  Scenario: Claude renders are unchanged
    Then scaffold/hosts/claude/.claude/agents/qa.md still contains 'Skill(flashcard, "check")'
```

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 2 | text assertions |
| Integration tests | 0 | none |
| E2E / acceptance tests | 0 | DT re-run |

---

## Prior work

- [[STORY-058-11]]: the Codex agent-TOML codegen and the portable skills.
- [[BUG-103]]: the same class of drift (Claude idiom read literally by Codex), for the sprint-execution skill only.

## Context Source

**context_source:** Codex dogfood r7 (2026-09-27, issues.md I22); code grounding at cli main `0e5b0ac`; owner directives recorded in `approved_by`.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity**

Requirements to pass to Green (Ready for Fix):
- [x] Reproduction steps are 100% deterministic.
- [x] Actual vs. Expected behavior is explicitly defined.
- [x] Raw error logs/evidence are attached.
- [x] Verification command (failing test) is provided.
- [x] `approved: true` is set in the YAML frontmatter.
