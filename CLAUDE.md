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
