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
  templates/            ← blueprints: epic/story/CR/Bug/initiative/Sprint Plan
  delivery/
    INDEX.md            ← curated roadmap table (epic/sprint map)
    pending-sync/       ← drafts + in-flight items (sprints, epics, stories, initiatives)
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

## Dogfood split — canonical vs live

This repo develops the scaffold and runs on it simultaneously, so `.claude/` exists in two places that you must keep in sync manually:

- **Canonical (tracked):** `cleargate-planning/.claude/**` — source of truth. Edits land here.
- **NPM payload (tracked, auto-mirrored):** `cleargate-cli/templates/cleargate-planning/.claude/**` — kept byte-identical to canonical by `npm run prebuild` (`copy-planning-payload.mjs`). Don't hand-edit; `prebuild` overwrites.
- **Live (gitignored):** `/.claude/**` — what Claude Code actually executes in *this* repo. Excluded by `.gitignore:13`. Per-machine.

**Target repos do not receive a `cleargate-planning/` directory.** When `cleargate init` runs in a target repo, it copies only the *contents* of `.claude/` and `.cleargate/` from the payload — the `cleargate-planning/` wrapper exists only in this meta-repo as the canonical scaffold source and is never shipped outward. The top-level `CLAUDE.md` from the payload is bounded-block-injected into the target's root `CLAUDE.md` (not copied verbatim), and the top-level `MANIFEST.json` is skipped entirely per the SKIP_FILES set at `cleargate-cli/src/init/copy-payload.ts:54`. The install snapshot lands at `.cleargate/.install-manifest.json` in each target repo (not at `cleargate-planning/MANIFEST.json` — that path only exists in this meta-repo).

Edits to canonical do **not** auto-propagate to live. After changing canonical hooks/agents/skills/settings, re-sync the live instance: run `cleargate init` from the repo root (rewrites `/.claude/` from the npm payload) or hand-port the specific block. Skipping this is how BUG-024 shipped its own fix while still running with the buggy hook — the CR-026 PreToolUse:Task hook landed in canonical but the live `/.claude/settings.json` was never rewired, so the dispatch markers continued to mis-attribute for the rest of SPRINT-20.

Same rule applies to `.cleargate/templates/`, `.cleargate/knowledge/`, and any other surface that has a `cleargate-planning/` mirror — canonical edit + manual re-sync, every time.

## How work gets done

1. **Plan** lives in `.cleargate/delivery/{pending-sync,archive}/`. A sprint file names its stories + milestones + DoD + risk table.
2. **Execute** via the four-agent loop (`.claude/agents/`). I (the conversational agent) orchestrate; I do not write production code directly when a sprint is running.
3. **Artifacts** land in `.cleargate/sprint-runs/<id>/`. Never edit the ledger by hand; the hook owns it.
4. **Learning** accumulates in `.cleargate/FLASHCARD.md`. Every agent (and me) reads it at the start of non-trivial work.

## Flashcard protocol (mandatory)

- **Before starting work:** grep `.cleargate/FLASHCARD.md` for tags relevant to the task. If a card applies, follow it.
- **After a surprise:** append one line. Format `YYYY-MM-DD · #tag1 #tag2 · lesson ≤120 chars`. Grep first to avoid dupes. Newest on top.
- Tag vocabulary and exact rules: `.claude/skills/flashcard/SKILL.md`.

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
- After edits to `cleargate-planning/.claude/**` (hooks, agents, skills, settings), remind the user to re-sync the live `/.claude/` instance via `cleargate init` or hand-port — see *Dogfood split* above. Canonical edits do not auto-propagate.

<!-- CLEARGATE:START -->
## 🔄 ClearGate Planning Framework

This repository uses **ClearGate** — a standalone planning framework for AI coding agents. ClearGate scaffolds *how work is planned* (initiatives → epics → stories → sprints) and defines a four-agent loop for execution. ClearGate does not run builds, tests, or deployments; execution tooling remains the target repo's own.

**Session-start orientation (read in this order):**
1. `.cleargate/wiki/index.md` — compiled awareness layer (~3k tokens). Lists active sprint, in-flight items, recent shipments, open gates, planned work, and topic synthesis pages. **Read this first** to know what exists before grepping raw files. If absent, run `cleargate wiki build`.
2. `.cleargate/knowledge/cleargate-protocol.md` — delivery protocol (non-negotiable rules).
3. `.cleargate/FLASHCARD.md` — lessons tagged by topic (`#schema`, `#auth`, etc.). Grep for your area before starting.
4. `.cleargate/knowledge/cleargate-enforcement.md` — hook-enforced rules (worktree mechanics, file-surface contract, lifecycle reconciler, lane rubric, doctor exit codes, etc.). Read only when a CLI hook surfaces an error or when triaging a v2-mode question.

**Triage first, draft second.** Every user request gets classified (Epic / Story / CR / Bug / Pull / Push) *before* any drafting. If the type is ambiguous, ask ONE targeted question — do not guess.

**Sprint execution.** When a sprint is active, the orchestration playbook lives at `.claude/skills/sprint-execution/SKILL.md` — load it before dispatching any execution agent (Architect / Developer / QA / Reporter). The skill is the canonical four-agent-loop spec; the always-on CLAUDE.md keeps only the halt-rules and the load-skill contract.

**Skill auto-load directive.** When the SessionStart banner emits `Load skill: <name>`, invoke the Skill tool to load it before continuing. Claude Code's description-match auto-load is advisory; this rule is the contract.

**Codebase is source of truth.** Wiki, memory, and `context_source` are derived caches. On conflict between cache and code, the code wins; the cache rebuilds. Before stating that a capability exists or doesn't exist, grep the code.

**Duplicate check before drafting.** Before Writing any new file under `.cleargate/delivery/pending-sync/`, dispatch the `cleargate-wiki-query` subagent with the request topic. Record the result (`[[IDs]]` of related prior work, or `none found`) on a `Prior work:` line in the Brief — this is auditable evidence the check ran. Then grep `.cleargate/delivery/archive/` + `.cleargate/FLASHCARD.md` for residual hits the wiki may have missed (raw items not yet ingested). If the request names an integration, feature, or capability, also grep the source tree for existing implementations and cite findings in `## Existing Surfaces`. If you find overlap, surface it as a one-liner (*"This is very close to STORY-003-05 shipped in SPRINT-01 — are you extending it or redoing it?"*) before drafting.

**Halt at gates.** You halt at Gate 1 (Initiative approval) and Gate 2 (Ambiguity resolution) and wait for explicit human sign-off. You never call `cleargate_push_item` without `approved: true` (hard reject) and explicit human confirmation. Readiness gates (`cached_gate_result.pass`) are advisory by default — the push proceeds and the item body receives an `[advisory: gate_failed — <criteria>]` prefix; opt into hard-reject via `STRICT_PUSH_GATES=true` on the MCP server.

**Sprint mode.** Read `execution_mode:` in the active sprint's frontmatter before spawning Developer/QA. `v1` = advisory; `v2` = enforce the rules in `cleargate-enforcement.md`. Default `v1`.

**Ambiguity Gate criteria are evaluated literally.** Each `[ ]` box in a work-item's Ambiguity Gate footer must be evaluated against the literal criterion text, not against your interpretation of its intent. If a criterion is not met but you believe the human's intent is satisfied, leave the box unchecked, say so explicitly in the Brief, and ask. Do not substitute "in spirit" satisfaction for literal satisfaction. The gate exists specifically to catch the case where you are about to declare 🟢 by interpretive leap.

**Brief is the universal pre-push handshake.** Every work-item template's `<instructions>` block tells you to render a Brief in chat after Writing the document — Summary / Open Questions / Edge Cases / Risks / Ambiguity. Halt for human review. When ambiguity reaches 🟢, push via `cleargate_push_item` automatically — the same approval covers Gate 1 and the push.

**Boundary gates (CR-017).** `cleargate sprint init` runs the decomposition gate; `close_sprint.mjs` runs the lifecycle reconciler. Both block in v2.

**Sprint close is Gate-4-class (CR-019).** Run `close_sprint.mjs` with no flags first; surface the prompt verbatim; halt. Never pass `--assume-ack` autonomously. Pre-close enforces Steps 2.7 (no leftover worktrees) + 2.8 (sprint branch merged to main) under v2; failure halts close. Post-close prints a 6-item handoff list (Step 8) summarizing commits, merge state, wiki ingest, flashcards, artifacts, and next-sprint preflight.

**Drafting work items:**
- Use the templates in `.cleargate/templates/` (`epic.md`, `story.md`, `CR.md`, `Bug.md`, `Sprint Plan Template.md`, `initiative.md`).
- Save drafts to `.cleargate/delivery/pending-sync/{TYPE}-{ID}-{Name}.md`.
- After `cleargate_push_item` returns a Remote ID, update the frontmatter AND move the file to `.cleargate/delivery/archive/` — these two happen atomically, never one without the other.
- **Story granularity.** When decomposing an epic into stories, run the Granularity Rubric at the top of `story.md`. If a candidate story trips any signal (unrelated goals joined, >5 Gherkin scenarios, subsystems span, L4 complexity), emit two stories with consecutive IDs instead. Splits and merges are free at decomposition time — no remote IDs exist yet.

**Initiative Intake.** Stakeholder input arrives via two paths: (1) MCP pull — call `cleargate_pull_initiative` with the remote ID; the tool writes `pending-sync/INITIATIVE-NNN_*.md` automatically; read the result and present a Brief. (2) Manual paste — human pastes the text; triage it, write `pending-sync/INITIATIVE-NNN_*.md` using `templates/initiative.md`, present a Brief. In both cases, after Gate 1 the file moves to `archive/` stamped with `triaged_at:` and `spawned_items:`.

**State-aware surface.** At session start, `cleargate doctor --session-start` (invoked by the SessionStart hook) emits one banner line before any other output: `ClearGate state: pre-member — local planning enabled, sync requires join.` OR `ClearGate state: member (project: <project_id>) — full surface enabled.` In **pre-member** state (no valid join token on disk), only local-planning commands are reachable: `init`, `join`, `whoami`, `wiki *`, `gate *`, `stamp`, `doctor`, `scaffold-lint`, `sprint *`, `story *`, `state *`, `upgrade`, `uninstall`. Commands `push`, `pull`, `sync`, `sync-log`, `conflicts`, and `admin *` (except `admin login`) require membership and exit 2 with a redirect: `Run: cleargate join <invite-url>`. If the SessionStart banner says `pre-member`, do not suggest push/pull/sync to the user — instead ask for an invite URL and direct them to `cleargate join`.

**Conversational style.** Keep replies terse. Details live in the work-item file and `REPORT.md`, not in chat. State results and next steps; skip narration of your own thought process. After Writing or Editing any file under `.cleargate/delivery/**`, briefly note the ingest result if the PostToolUse hook surfaced one — one short sentence (`✅ ingested as <bucket>/<id>.md` / `⚠️ gate failed: <criterion>` / `🔴 ingest error — see .cleargate/hook-log/gate-check.log`). Do not narrate when nothing fired (skip-excluded paths). This is conversational confirmation, not retry logic.

**Support infrastructure.** Flashcard protocol: `.claude/skills/flashcard/SKILL.md`. Token-ledger hook: `.claude/hooks/token-ledger.sh`, wired via `.claude/settings.json` (SubagentStop) — auto-logs agent cost per sprint for the Reporter.

**Cross-project orchestration.** When running an orchestrator from one project's repo against another project's sprint tree, export `ORCHESTRATOR_PROJECT_DIR=/absolute/path/to/target/repo` in the shell before launching the session. Overrides `CLAUDE_PROJECT_DIR`; sentinel + ledger writes route into the target's `.cleargate/sprint-runs/` tree. If the target has no `.cleargate/sprint-runs/.active` sentinel, writes land in the target's `_off-sprint` bucket — not the orchestrator's own repo.

**Project overrides.** Content OUTSIDE this `<!-- CLEARGATE:START -->...<!-- CLEARGATE:END -->` block takes precedence where it conflicts with ClearGate defaults.

**Scope reminder.** ClearGate is a *planning* framework. It scaffolds how work gets planned and how the four-agent loop runs. It does not replace your project's build system, CI, test runner, or deployment tooling.

**Guardrails for the conversational agent:**
- Sprint close requires explicit human ack. Run close_sprint.mjs without flags first; surface the "re-run with --assume-ack" prompt verbatim and halt. Never pass --assume-ack yourself — that flag is reserved for automated tests.

**Doc & metadata refresh on close.** During Gate 4 ack, read `.cleargate/sprint-runs/<id>/.doc-refresh-checklist.md` (generated by `prep_doc_refresh.mjs`) and apply or punt each `- [ ]` item per the canonical list at `.cleargate/knowledge/sprint-closeout-checklist.md`. Items already marked `- [x]` indicate "no changes detected, skip."
<!-- CLEARGATE:END -->
