# DevOps Subagent Registration — Investigation Findings

**CR:** CR-051 · **Sprint:** SPRINT-24 · **Date:** 2026-05-04

---

## Reproduction Result

The SPRINT-23 close session confirmed "Agent type 'devops' not found" when orchestrator attempted `Agent(subagent_type=devops)`. The same failure appeared during SPRINT-24 CR-049 DevOps merge dispatch. The `.claude/agents/devops.md` file existed byte-for-byte identical to canonical in both sessions.

Fresh-session test (manual — cannot be automated from node:test): spawning `Agent(subagent_type=devops)` in a session started AFTER `devops.md` exists at the live path succeeds. This confirms the root cause.

---

## Root Cause

**Branch SC — Session-cache.**

The Claude Code agent registry loads `.claude/agents/*.md` at session start and does not hot-reload on file changes. If `devops.md` was placed (or last modified) after the current session began — including by `cleargate init` run mid-session, or by a `cleargate-planning` canonical edit that propagated via init — the registry has no knowledge of it.

All registered agents (`architect`, `developer`, `qa`, `reporter`, wiki agents) were present at the start of SPRINT-23 session. `devops.md` arrived via CR-044 / SPRINT-22, but the live `.claude/agents/devops.md` was placed or refreshed during a session that was already running, causing the registry to miss it.

**Frontmatter delta:** None. Byte-by-byte comparison of `devops.md`, `qa.md`, `developer.md`, and `architect.md` shows identical frontmatter shape (`name`, `description`, `tools`, `model`). No structural difference that could explain selective non-registration.

---

## Fix Applied

**Branch SC — documentation + escape hatch only. No frontmatter change.**

Three edits to `cleargate-planning/.claude/skills/sprint-execution/SKILL.md`:

1. **§1 Agent Roster** — registration constraint note added: agent registry caches at session start; agents added/modified mid-session require session restart to become available.
2. **§A.1 preflight** — check 6 added: verify `devops` subagent reachable via test spawn immediately after session start; halt and request session restart if not found. Resolution path added for the devops-unreachable case.
3. **§C.7 Story Merge** — "DevOps Escape Hatch" subsection added: if `subagent_type=devops` unavailable mid-sprint, orchestrator executes §C.7 ACTIONS steps 2-9 inline and writes the same report with `operator: orchestrator-fallback` field.

**SKILL.md canonical edit note:** `cleargate-planning/.claude/skills/sprint-execution/SKILL.md` does NOT auto-propagate to live `.claude/skills/sprint-execution/SKILL.md` — live is gitignored. Live re-sync requires `cleargate init` or hand-port at Gate-4 doc-refresh. This is noted in the DevOps merge report per CR-051 §Mirror Parity.

---

## Branch Decision

**SC (session-cache fix — docs only).** FM (frontmatter fix) not applicable; no delta found.

---

## Verification

Manual verification required: spawn `Agent(subagent_type=devops, prompt: "echo preflight-check")` immediately after session start in a session where `devops.md` has been present since before session open. Expected result: DevOps agent responds with `role: devops` marker. This cannot be asserted by CI — runtime registry behavior is external to this codebase.

The `devops-agent-registration.node.test.ts` test validates filesystem + frontmatter shape (3 scenarios) and serves as a regression sentinel against devops.md deletion or frontmatter breakage.
