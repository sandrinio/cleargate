---
cr_id: CR-051
parent_ref: EPIC-013
parent_cleargate_id: EPIC-013
sprint_cleargate_id: SPRINT-24
carry_over: false
status: Draft
approved: false
created_at: 2026-05-04T18:00:00Z
updated_at: 2026-05-04T18:00:00Z
created_at_version: cleargate@0.10.0
updated_at_version: cleargate@0.10.0
context_source: |
  CR-044 (SPRINT-22) shipped the DevOps role agent at
  `cleargate-planning/.claude/agents/devops.md` (and live mirror).
  Per Claude Code agent registration, files in `.claude/agents/`
  with valid `name:` frontmatter should be picked up as available
  subagent_types for the Agent tool.

  SPRINT-23 close session 2026-05-04: when the orchestrator attempted
  the first DevOps merge dispatch (CR-045), the Agent tool returned:
    "Agent type 'devops' not found. Available agents: architect,
     claude-code-guide, cleargate-wiki-contradict, cleargate-wiki-ingest,
     cleargate-wiki-lint, cleargate-wiki-query, code-simplifier:
     code-simplifier, developer, Explore, general-purpose, Plan, qa,
     reporter, statusline-setup"
  Even though `.claude/agents/devops.md` existed with proper frontmatter,
  byte-identical to canonical, with model: sonnet + name: devops.

  Workaround: orchestrator-fallback inline DevOps execution preserved
  the merge pipeline through 4 CRs of SPRINT-23. Functional but brittle —
  next sprint cannot rely on devops subagent_type spawn.

  Hypothesis (untested): Claude Code agent registry caches at session
  start; agents added/modified mid-session aren't picked up until a
  new session starts. SPRINT-23 session predated some final live edits
  to devops.md; or the agent registry has a glob that requires specific
  path/frontmatter shape.
cached_gate_result:
  pass: false
  failing_criteria:
    - id: existing-surfaces-verified
      detail: "cited paths do not exist on disk: devops.md, SKILL.md"
  last_gate_check: 2026-05-04T13:25:27Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id CR-051
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-05-04T13:25:27Z
  sessions: []
---

# CR-051: DevOps Subagent Registration — Investigation + Fix

## 0.5 Open Questions

- **Question:** Is this a bug or a CR?
  - **Recommended:** **Investigation-CR.** Type=CR because the resolution may require non-trivial design (re-shape devops.md frontmatter, add explicit Claude Code config, document session-restart requirement). If the root cause is "session caches at start", resolution is documentation only, then fold into CR. If a frontmatter fix, code change.
  - **Human decision:** _populated during Brief review_

- **Question:** First action — reproduce or read Claude Code docs?
  - **Recommended:** Both, parallel. (a) Fresh session reproduce: spawn `Agent(subagent_type=devops)` immediately after session start; if it works, root cause = session-cache. (b) Read Claude Code agent registration docs / cleargate-planning/.claude/agents/* shape comparisons.
  - **Human decision:** _populated during Brief review_

- **Question:** If root cause is session caching, what's the fix?
  - **Recommended:** Document the constraint in `cleargate-planning/.claude/skills/sprint-execution/SKILL.md` §1 Agent Roster: "Restart Claude Code session if devops/* subagent_type returns 'not found' even when the .md file exists." Add a session-start verification check to the orchestrator preflight. Fix doesn't require code; just docs + workflow guard.
  - **Human decision:** _populated during Brief review_

- **Question:** Should orchestrator-fallback inline DevOps stay as documented escape hatch?
  - **Recommended:** YES. Document explicitly in SKILL.md §C.7 as "DevOps escape hatch — if subagent_type=devops unavailable, orchestrator executes the same checklist inline. Devops report still generated; mark `operator: orchestrator-fallback`."
  - **Human decision:** _populated during Brief review_

- **Question:** If the bug is in the agent .md frontmatter shape, what's the fix?
  - **Recommended:** Compare devops.md against the agents that DO register (qa.md, developer.md). Find frontmatter delta (model field, tools list, name spelling, capitalization). If divergence found, fix devops.md to match. Then re-test.
  - **Human decision:** _populated during Brief review_

## 1. The Context Override (Old vs. New)

**Obsolete Logic (What to Remove / Forget):**
- "DevOps subagent_type works because the .md file exists." False — SPRINT-23 proved otherwise.
- "Orchestrator can dispatch DevOps via Agent tool whenever needed." Brittle.

**New Logic (The New Truth):**
- DevOps subagent registration follows whatever Claude Code agent-registry rule we discover via investigation.
- Sprint-execution SKILL.md documents the rule + the orchestrator-fallback inline path as a documented backup.
- Pre-sprint-kickoff orchestrator preflight verifies devops subagent_type is reachable; halt if not.

## 2. Blast Radius & Invalidation

- [ ] **Investigation phase** (Wave 2-A, ≤30 min):
  - Fresh Claude Code session: try `Agent(subagent_type=devops, prompt: "test")` immediately. Record result.
  - Compare frontmatter byte-by-byte against qa.md / developer.md.
  - Read claude.com/claude-code docs for agent registration rules.
- [ ] **`cleargate-planning/.claude/agents/devops.md`** — possibly modify frontmatter to match the registration rule we discover.
- [ ] **`.claude/agents/devops.md`** — live mirror.
- [ ] **`cleargate-planning/.claude/skills/sprint-execution/SKILL.md`** — §1 Agent Roster: add registration constraint note. §C.7: add "DevOps escape hatch" subsection documenting orchestrator-fallback inline path.
- [ ] **`cleargate-planning/.claude/skills/sprint-execution/SKILL.md`** — §A.1 preflight: add "verify devops subagent_type" check.
- [ ] **NEW `cleargate-cli/test/scaffold/devops-agent-registration.node.test.ts`** — at minimum, asserts devops.md exists at canonical + live; frontmatter parseable; name field = "devops". Cannot test Claude Code registry directly — that's a runtime behavior. Document this test scope limit in test header.
- [ ] **No code change to cleargate-cli/src** — this is process + docs + agent prompt fix, not CLI surface.

## Existing Surfaces

- **Surface:** `.claude/agents/devops.md` + `cleargate-planning/.claude/agents/devops.md`.
- **Surface:** `cleargate-planning/.claude/skills/sprint-execution/SKILL.md` §1 + §C.7.
- **Surface:** Claude Code Agent tool subagent_type registration mechanism (external, runtime).
- **Why this CR extends rather than rebuilds:** devops.md exists; SKILL.md exists; CR-051 adds documentation + verification + escape-hatch formalization. No new infrastructure.

## 3. Execution Sandbox

**Investigate:**
- Fresh-session reproducibility of subagent_type=devops not-found
- Frontmatter delta vs working agents
- Claude Code docs

**Modify:**
- `cleargate-planning/.claude/agents/devops.md` (if frontmatter fix needed)
- `cleargate-planning/.claude/skills/sprint-execution/SKILL.md` §1 + §C.7 + §A.1 preflight

**Add:**
- `cleargate-cli/test/scaffold/devops-agent-registration.node.test.ts`

**Out of scope:**
- Adding new subagent types (CR-053 future skill candidate is separate)
- Refactoring the entire .claude/agents/ shape
- Investigating other "missing" agents — only devops is in scope; report any others surfaced as a follow-up flashcard

## 4. Verification Protocol

**Acceptance:**
1. Investigation report written: `.cleargate/sprint-runs/SPRINT-24/devops-registration-findings.md` summarizing root cause + fix path. ≤500 words.
2. If frontmatter fix shipped: `Agent(subagent_type=devops, prompt: "echo test")` succeeds in a fresh Claude Code session. Captured in §4 Execution Log via screenshot or transcript snippet.
3. SKILL.md §1 Agent Roster has a registration constraint note (≤3 lines). SKILL.md §C.7 has DevOps escape-hatch subsection (≤10 lines).
4. SKILL.md §A.1 preflight has "verify devops subagent_type" check listed.
5. NEW test `devops-agent-registration.node.test.ts` passes 3 scenarios: devops.md exists at both paths; frontmatter parses; name field = "devops".
6. Mirror parity: canonical = live for devops.md (post any frontmatter fix).
7. `cd cleargate-cli && npm run typecheck && npm test` exits 0.

**Test Commands:**
- `cd cleargate-cli && npm test -- test/scaffold/devops-agent-registration.node.test.ts`
- (manual, fresh session) Spawn DevOps agent; verify it returns the expected acceptance signal (or `STATUS: blocked` with a non-registration reason).

**Pre-commit:** `cd cleargate-cli && npm run typecheck && npm test`. Never `--no-verify`.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟡 Yellow — Awaiting Brief approval**

- [x] §0.5 Open Questions surfaced (5 questions).
- [x] §3 Execution Sandbox lists files to touch.
- [x] §4 Verification Protocol has testable acceptance.
- [ ] Human approves §0.5 defaults.
- [ ] Lane assigned at SDR (preliminary: standard — investigation + multi-file edit).
- [ ] Investigation result may scope-cut the CR (if root cause = session cache, fix is docs-only).

---
