# ClearGate Meta-Repo

This repository is the **ClearGate product itself** — the standalone framework that turns AI coding agents into disciplined engineering teams. It is *not yet bootstrapped on itself*; planning lives in `strategy/work-items/` instead of `.cleargate/delivery/pending-sync/`. Once `npx cleargate init` (shipped by EPIC-000) can run against this repo, those items migrate.

## Product vision in one line
Scaffold AI agents into a three-phase sync loop — **Plan** (PM tool → local markdown) → **Execute** (agent drafts via templates in `pending-sync/`) → **Deliver** (MCP adapter pushes native, no middleman DB). Full vision: see auto-memory `project_vision.md`.

## Repo layout

```
strategy/              ← planning (human + orchestrator authored)
  work-items/
    INDEX.md           ← single source of truth for epics/stories/sprints/roadmap
    sprints/SPRINT-*.md
    epics/EPIC-*.md
    stories/STORY-*.md
  proposals/           ← pre-epic design docs
  ClearGate CLAUDE.md  ← SPEC ONLY (what `cleargate init` injects into downstream users' CLAUDE.md — do not confuse with this file)

mcp/                   ← MCP server implementation (EPIC-003, EPIC-004 shipped)
cleargate-cli/         ← @cleargate/cli npm package (created by SPRINT-03 STORY-000-01; may not exist yet)
admin/                 ← admin tooling stub

.claude/               ← Claude Code runtime configuration
  agents/              ← architect / developer / qa / reporter role definitions
  hooks/token-ledger.sh
  skills/flashcard/
  settings.json        ← SubagentStop hook wiring
  settings.local.json  ← user-local permissions

.cleargate/            ← runtime artifacts (sprint outputs + learning)
  FLASHCARD.md         ← append-only project lesson log (READ BEFORE WORK)
  sprint-runs/<id>/
    plans/W<N>.md      ← Architect output per milestone
    token-ledger.jsonl ← auto-populated by SubagentStop hook
    REPORT.md          ← Reporter output at sprint end
```

## How work gets done

1. **Plan** lives in `strategy/work-items/`. A sprint file names its stories + milestones + DoD + risk table.
2. **Execute** via the four-agent loop (`.claude/agents/`). I (the conversational agent) orchestrate; I do not write production code directly when a sprint is running.
3. **Artifacts** land in `.cleargate/sprint-runs/<id>/`. Never edit the ledger by hand; the hook owns it.
4. **Learning** accumulates in `.cleargate/FLASHCARD.md`. Every agent (and me) reads it at the start of non-trivial work.

## Flashcard protocol (mandatory)

- **Before starting work:** grep `.cleargate/FLASHCARD.md` for tags relevant to the task. If a card applies, follow it.
- **After a surprise:** append one line. Format `YYYY-MM-DD · #tag1 #tag2 · lesson ≤120 chars`. Grep first to avoid dupes. Newest on top.
- Tag vocabulary and exact rules: `.claude/skills/flashcard/SKILL.md`.

## Agent orchestration

When running a sprint, spawn via the `Agent` tool with `subagent_type`:
- **architect** (opus) — produces `plans/W<N>.md`, no production code
- **developer** (sonnet) — one story end-to-end, one commit, includes `STORY=NNN-NN` verbatim in first response line
- **qa** (sonnet) — independent verification, re-runs tests, approves or kicks back; never commits
- **reporter** (opus) — runs once at sprint end, produces `REPORT.md`

Full role contracts in `.claude/agents/*.md`. Communication model: agents don't talk to each other; they read/write artifact files and return structured text to the orchestrator.

## Test + commit conventions

- **Real infra, no mocks** for database tests — run against docker-compose Postgres 18 + Redis 8 (flashcard-worthy: mocked tests have bitten us before).
- **Pre-commit:** `npm run typecheck` clean + `npm test` green for the affected package. Non-negotiable.
- **Commit format:** `feat(<epic>): STORY-NNN-NN <short desc>` — one commit per story.
- **Never `--no-verify`.** If a hook fails, fix the cause.
- **Never `git reset --hard`, force push, or rewrite history** without explicit per-action approval.

## Active state (as of 2026-04-18)

- **Shipped:** SPRINT-01 (MCP v0.1, 12 stories), SPRINT-02 (Admin API, 6 stories). Deployed via Coolify at `https://cleargate-mcp.soula.ge/`.
- **Planned (not started):** [SPRINT-03](strategy/work-items/sprints/SPRINT-03_CLI_Packages.md) — CLI packages (`cleargate-cli` scaffold + admin CLI + `cleargate join`) + STORY-003-13 (MCP redemption route) + STORY-004-07 (invite storage Redis → Postgres retrofit). 11 stories across 6 waves.
- **Architectural decision locked (2026-04-18):** invite storage is **Postgres source of truth**, not Redis. Redis is cache-only in the invite flow. Reason: durability + auditability + admin-UI queryability. STORY-004-07 retrofits SPRINT-02's Redis-only shape.

## Stack versions (canonical — see INDEX.md for full table)

Node 24 LTS · TypeScript ^5.8 · Fastify ^5.8 · Drizzle 0.45.2 · Zod ^4.3 · Postgres 18 · Redis 8 · SvelteKit ^2 (Svelte 5) · Tailwind ^4.2 · DaisyUI ^5.5

## Guardrails for the conversational agent (me)

- Before recommending a file/function/flag that memory claims exists: verify with Read/Grep. Memory may be stale.
- Before destructive ops (force push, reset --hard, dropping tables, deleting branches, killing untracked work): ask.
- Sprint execution runs through the four-agent loop — do not implement stories yourself in the main conversation when a sprint is active.
- Keep conversational output terse. Details live in the sprint file and REPORT.md, not in chat.

<!-- CLEARGATE:START -->
## 🔄 ClearGate Planning Framework

This repository uses **ClearGate** — a standalone planning framework for AI coding agents. ClearGate scaffolds *how work is planned* (proposals → epics → stories → sprints) and defines a four-agent loop for execution. ClearGate does not run builds, tests, or deployments; execution tooling remains the target repo's own.

**Session-start orientation (read in this order):**
1. `.cleargate/knowledge/cleargate-protocol.md` — delivery protocol (non-negotiable rules).
2. `.cleargate/FLASHCARD.md` — lessons tagged by topic (`#schema`, `#auth`, etc.). Grep for your area before starting.

**Triage first, draft second.** Every user request gets classified (Epic / Story / CR / Bug / Pull / Push) *before* any drafting. If the type is ambiguous, ask ONE targeted question — do not guess.

**Duplicate check before drafting.** Before drafting a Proposal or work item, grep `.cleargate/delivery/archive/` + `.cleargate/FLASHCARD.md` for similar past work. If you find overlap, surface it as a one-liner (*"This is very close to STORY-003-05 shipped in SPRINT-01 — are you extending it or redoing it?"*) instead of drafting a duplicate.

**Halt at gates.** You halt at Gate 1 (Proposal approval) and Gate 2 (Ambiguity resolution) and wait for explicit human sign-off. You never call `cleargate_push_item` without `approved: true` and explicit human confirmation (Gate 3).

**Drafting work items:**
- Use the templates in `.cleargate/templates/` (`proposal.md`, `epic.md`, `story.md`, `CR.md`, `Bug.md`, `Sprint Plan Template.md`, `initiative.md`).
- Save drafts to `.cleargate/delivery/pending-sync/{TYPE}-{ID}-{Name}.md`.
- After `cleargate_push_item` returns a Remote ID, update the frontmatter AND move the file to `.cleargate/delivery/archive/` — these two happen atomically, never one without the other.

**Four-agent loop (roles in `.claude/agents/`):**
- `architect.md` — one plan per milestone; no production code.
- `developer.md` — one Story end-to-end; one commit per Story; runs typecheck + tests before commit.
- `qa.md` — independent verification gate; re-runs checks; never commits, never edits.
- `reporter.md` — one sprint retrospective at sprint end; synthesizes token ledger + git log + flashcards into `REPORT.md`.

**Conversational style.** Keep replies terse. Details live in the work-item file and `REPORT.md`, not in chat. State results and next steps; skip narration of your own thought process.

**Support infrastructure.** Flashcard protocol: `.claude/skills/flashcard/SKILL.md`. Token-ledger hook: `.claude/hooks/token-ledger.sh`, wired via `.claude/settings.json` (SubagentStop) — auto-logs agent cost per sprint for the Reporter.

**Project overrides.** Content OUTSIDE this `<!-- CLEARGATE:START -->...<!-- CLEARGATE:END -->` block takes precedence where it conflicts with ClearGate defaults.

**Scope reminder.** ClearGate is a *planning* framework. It scaffolds how work gets planned and how the four-agent loop runs. It does not replace your project's build system, CI, test runner, or deployment tooling.
<!-- CLEARGATE:END -->
