# ClearGate Meta-Repo

This repository is the **ClearGate product itself** — the standalone framework that turns AI coding agents into disciplined engineering teams. Bootstrapped on itself as of 2026-04-19: raw work items live in `.cleargate/delivery/{pending-sync,archive}/`, scaffold canonical at `cleargate-planning/`, protocol at `.cleargate/knowledge/cleargate-protocol.md`.

## Product vision in one line
Scaffold AI agents into a three-phase sync loop — **Plan** (PM tool → local markdown) → **Execute** (agent drafts via templates in `pending-sync/`) → **Deliver** (MCP adapter pushes native, no middleman DB). Full vision: see auto-memory `project_vision.md`.

## Repo layout

```
.cleargate/              ← raw work items + orchestration artifacts
  INDEX.md              (moved to delivery/INDEX.md; may drop once wiki ships)
  FLASHCARD.md          ← append-only lesson log (READ BEFORE WORK)
  knowledge/
    cleargate-protocol.md  ← delivery protocol (non-negotiable rules)
  templates/            ← blueprints: proposal/epic/story/CR/Bug/initiative/Sprint Plan
  delivery/
    INDEX.md            ← curated roadmap table (epic/sprint map)
    pending-sync/       ← drafts + in-flight items (sprints, epics, stories, proposals)
    archive/            ← items pushed to PM tool / completed
  wiki/                 ← compiled awareness layer (ships in SPRINT-04 EPIC-002)
  sprint-runs/<id>/
    plans/M<N>.md       ← Architect output per milestone
    token-ledger.jsonl  ← auto-populated by SubagentStop hook
    REPORT.md           ← Reporter output at sprint end
  hook-log/             ← raw hook stdout/stderr

cleargate-planning/     ← canonical scaffold source (what `cleargate init` installs)
  CLAUDE.md             ← the injection spec
  .claude/{agents,skills,hooks,settings.json}
  .cleargate/{FLASHCARD.md,knowledge,templates,delivery}/  (empty skeleton)

cleargate-cli/          ← @cleargate/cli npm package source (publishes `cleargate`)
mcp/                    ← MCP server — nested separate git repo (sandrinio/cleargate-mcp)
admin/                  ← admin tooling stub

.claude/                ← LIVE dogfood instance (gitignored) — Claude Code reads here
  agents/               ← four-agent role definitions
  skills/flashcard/
  hooks/token-ledger.sh
  settings.json

knowledge/              ← gitignored private reference docs (design-guide, architecture notes)
```

## How work gets done

1. **Plan** lives in `.cleargate/delivery/{pending-sync,archive}/`. A sprint file names its stories + milestones + DoD + risk table.
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

- **Shipped:** SPRINT-01 (MCP v0.1, 12 stories), SPRINT-02 (Admin API, 6 stories), [SPRINT-03](.cleargate/delivery/archive/SPRINT-03_CLI_Packages.md) (CLI packages + admin CLI + `cleargate join` + invite-storage retrofit, 11 stories). Deployed via Coolify at `https://cleargate-mcp.soula.ge/`.
- **Active:** [SPRINT-04 Knowledge Wiki](.cleargate/delivery/pending-sync/SPRINT-04_Knowledge_Wiki.md) — 9 EPIC-002 stories. Karpathy-style wiki + wiki-ingest/query/lint subagents + PostToolUse hook + `cleargate wiki {build,ingest,query,lint}` CLI. Adapted for our 3-repo case (git-SHA drift, `repo:` tag).
- **Planned next:** [SPRINT-05 Admin UI](.cleargate/delivery/pending-sync/SPRINT-05_Admin_UI.md) — deferred one sprint from SPRINT-04 to ship the wiki first.
- **Architectural decisions locked:**
  - **Invite storage (2026-04-18):** Postgres source of truth, Redis cache-only. Reason: durability + auditability + admin-UI queryability.
  - **Wiki drift detection (2026-04-19):** git SHA (not content hash) — drops EPIC-001 dependency; accepts spurious-recompile tradeoff.

## Stack versions (canonical — see INDEX.md for full table)

Node 24 LTS · TypeScript ^5.8 · Fastify ^5.8 · Drizzle 0.45.2 · Zod ^4.3 · Postgres 18 · Redis 8 · SvelteKit ^2 (Svelte 5) · Tailwind ^4.2 · DaisyUI ^5.5

## Guardrails for the conversational agent (me)

- Before recommending a file/function/flag that memory claims exists: verify with Read/Grep. Memory may be stale.
- Before destructive ops (force push, reset --hard, dropping tables, deleting branches, killing untracked work): ask.
- Sprint execution runs through the four-agent loop — do not implement stories yourself in the main conversation when a sprint is active.
- Keep conversational output terse. Details live in the sprint file and REPORT.md, not in chat.
- Sprint close requires explicit human ack. Run close_sprint.mjs without flags first; surface the "re-run with --assume-ack" prompt verbatim and halt. Never pass --assume-ack yourself — that flag is reserved for automated tests.

<!-- CLEARGATE:START -->
## 🔄 ClearGate Planning Framework

This repository uses **ClearGate** — a standalone planning framework for AI coding agents. ClearGate scaffolds *how work is planned* (proposals → epics → stories → sprints) and defines a four-agent loop for execution. ClearGate does not run builds, tests, or deployments; execution tooling remains the target repo's own.

**Session-start orientation (read in this order):**
1. `.cleargate/wiki/index.md` — compiled awareness layer (~3k tokens). Lists active sprint, in-flight items, recent shipments, open gates, planned work, and topic synthesis pages. **Read this first** to know what exists before grepping raw files. If absent, run `cleargate wiki build`.
2. `.cleargate/knowledge/cleargate-protocol.md` — delivery protocol (non-negotiable rules).
3. `.cleargate/FLASHCARD.md` — lessons tagged by topic (`#schema`, `#auth`, etc.). Grep for your area before starting.
4. `.cleargate/knowledge/cleargate-enforcement.md` — hook-enforced rules (worktree mechanics, file-surface contract, lifecycle reconciler, lane rubric, doctor exit codes, etc.). Read only when a CLI hook surfaces an error or when triaging a v2-mode question.

**Triage first, draft second.** Every user request gets classified (Epic / Story / CR / Bug / Pull / Push) *before* any drafting. If the type is ambiguous, ask ONE targeted question — do not guess.

**Duplicate check before drafting.** Before drafting a Proposal or work item, grep `.cleargate/delivery/archive/` + `.cleargate/FLASHCARD.md` for similar past work. If you find overlap, surface it as a one-liner (*"This is very close to STORY-003-05 shipped in SPRINT-01 — are you extending it or redoing it?"*) instead of drafting a duplicate.

**Halt at gates.** You halt at Gate 1 (Proposal approval) and Gate 2 (Ambiguity resolution) and wait for explicit human sign-off. You never call `cleargate_push_item` without `approved: true` and explicit human confirmation (Gate 3).

**Sprint mode.** Read `execution_mode:` in the active sprint's frontmatter before spawning Developer/QA. `v1` = advisory; `v2` = enforce the rules in `cleargate-enforcement.md`. Default `v1`.

**Brief is the universal pre-push handshake.** Every work-item template's `<instructions>` block tells you to render a Brief in chat after Writing the document — Summary / Open Questions / Edge Cases / Risks / Ambiguity. Halt for human review. When ambiguity reaches 🟢, push via `cleargate_push_item` automatically — the same approval covers Gate 1 and the push.

**Architect runs twice per sprint.** (1) Sprint Design Review writes §2 of the sprint plan before human confirm. (2) Per-milestone plan writes `sprint-runs/<id>/plans/M<N>.md` before Developer agents start that milestone.

**Boundary gates (CR-017).** `cleargate sprint init` runs the decomposition gate; `close_sprint.mjs` runs the lifecycle reconciler. Both block in v2.

**Sprint Execution Gate (CR-021).** Before transitioning Ready → Active, the environment must pass: previous sprint Completed, no leftover worktrees, `sprint/S-NN` ref free, `main` clean. See `cleargate sprint preflight`.

**Sprint close is Gate-4-class (CR-019).** Run `close_sprint.mjs` with no flags first; surface the prompt verbatim; halt. Never pass `--assume-ack` autonomously.

**Drafting work items:**
- Use the templates in `.cleargate/templates/` (`proposal.md`, `epic.md`, `story.md`, `CR.md`, `Bug.md`, `Sprint Plan Template.md`, `initiative.md`).
- Save drafts to `.cleargate/delivery/pending-sync/{TYPE}-{ID}-{Name}.md`.
- After `cleargate_push_item` returns a Remote ID, update the frontmatter AND move the file to `.cleargate/delivery/archive/` — these two happen atomically, never one without the other.
- **Story granularity.** When decomposing an epic into stories, run the Granularity Rubric at the top of `story.md`. If a candidate story trips any signal (unrelated goals joined, >5 Gherkin scenarios, subsystems span, L4 complexity), emit two stories with consecutive IDs instead. Splits and merges are free at decomposition time — no remote IDs exist yet.

**Four-agent loop (roles in `.claude/agents/`):**
- `architect.md` — one plan per milestone; no production code.
- `developer.md` — one Story end-to-end; one commit per Story; runs typecheck + tests before commit.
- `qa.md` — independent verification gate; re-runs checks; never commits, never edits.
- `reporter.md` — one sprint retrospective at sprint end; synthesizes token ledger + git log + flashcards into `REPORT.md`.

**Orchestrator Dispatch Convention.** Before each `Task()` spawn, write an explicit dispatch marker so the token-ledger hook can attribute tokens to the correct work item and agent without relying on transcript-grep heuristics. Call `bash .cleargate/scripts/write_dispatch.sh <work_item_id> <agent_type>` immediately before the `Task()` call; the hook reads `.cleargate/sprint-runs/<sprint>/.dispatch-<session-id>.json`, uses `work_item_id` + `agent_type` verbatim, then deletes the file. Example: `bash .cleargate/scripts/write_dispatch.sh STORY-020-02 developer`.

**Conversational style.** Keep replies terse. Details live in the work-item file and `REPORT.md`, not in chat. State results and next steps; skip narration of your own thought process. After Writing or Editing any file under `.cleargate/delivery/**`, briefly note the ingest result if the PostToolUse hook surfaced one — one short sentence (`✅ ingested as <bucket>/<id>.md` / `⚠️ gate failed: <criterion>` / `🔴 ingest error — see .cleargate/hook-log/gate-check.log`). Do not narrate when nothing fired (skip-excluded paths). This is conversational confirmation, not retry logic.

**Support infrastructure.** Flashcard protocol: `.claude/skills/flashcard/SKILL.md`. Token-ledger hook: `.claude/hooks/token-ledger.sh`, wired via `.claude/settings.json` (SubagentStop) — auto-logs agent cost per sprint for the Reporter.

**Project overrides.** Content OUTSIDE this `<!-- CLEARGATE:START -->...<!-- CLEARGATE:END -->` block takes precedence where it conflicts with ClearGate defaults.

**Scope reminder.** ClearGate is a *planning* framework. It scaffolds how work gets planned and how the four-agent loop runs. It does not replace your project's build system, CI, test runner, or deployment tooling.

**Doc & metadata refresh on close.** During Gate 4 ack, read `.cleargate/sprint-runs/<id>/.doc-refresh-checklist.md` (generated by `prep_doc_refresh.mjs`) and apply or punt each `- [ ]` item per the canonical list at `.cleargate/knowledge/sprint-closeout-checklist.md`. Items already marked `- [x]` indicate "no changes detected, skip."
<!-- CLEARGATE:END -->
