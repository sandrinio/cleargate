---
sprint_id: "S-09"
created_at: "2026-04-21T00:00:00Z"
last_updated: "2026-04-21T00:00:00Z"
---

# Sprint Context — SPRINT-09 (EPIC-013 Execution Phase v2)

Per-sprint audit artefact. Populated at sprint init (M1 planning) and re-touched after each story merges. Referenced from every Developer/QA/Architect task brief so all agents start from the same baseline. SPRINT-09 runs under `execution_mode: v1` — scripts ship, none are invoked mid-sprint.

## Locked Versions

Frozen dependency versions for this sprint. Orchestrator populated from `package.json` snapshots at sprint init; Developers must not upgrade these mid-sprint without an explicit CR.

| Workspace | Name | Version | Key deps |
|---|---|---|---|
| `/` | `cleargate-monorepo` | (no version) | npm workspaces |
| `cleargate-cli/` | `cleargate` | 0.2.1 | `zod ^4.3.0`, `typescript ^5.8.0` |
| `admin/` | `@cleargate/admin` | 0.1.0 | `@sveltejs/kit ^2.20.7`, `tailwindcss ^4.2.0`, `zod ^4.3.0`, `typescript ^5.8.0` |
| `mcp/` | `@cleargate/mcp` | 0.1.0 | `fastify ^5.8.0`, `drizzle-orm ^0.45.2`, `zod ^4.3.0`, `typescript ^5.8.0` |
| runtime | Node | `>=24.0.0` | — |

## Cross-Cutting Rules

Sprint-wide architecture rules. Copied verbatim from EPIC-013 `<architecture_rules>` (`.cleargate/delivery/pending-sync/EPIC-013_Execution_Phase_v2.md` §0).

1. Do NOT replace the four-agent contract (architect/developer/qa/reporter). DevOps + Scribe are OUT OF SCOPE for v2; optional split stays future work.
2. Do NOT touch MCP adapter, wiki ingest/lint, or scaffold manifest surfaces. This epic is execution-loop only.
3. All new state lives under `.cleargate/sprint-runs/<id>/` or `.cleargate/delivery/pending-sync/`; no changes to `.cleargate/wiki/` writers.
4. `state.json` is a cache of sprint markdown, not a new source of truth. Sprint markdown remains canonical for humans.
5. All new scripts go through a `run_script.sh` wrapper (per V-Bounce pattern) — no direct shell invocation from agents.

**SPRINT-09 additions (from SPRINT-09 constraints):**

6. SPRINT-09 itself runs `execution_mode: v1`. No story may invoke `cleargate sprint init`, `cleargate state update`, or `git worktree add` mid-sprint (R1). First real v2 exercise is SPRINT-10.
7. Nested `mcp/` is off-limits for worktrees — single outer-repo worktree; edit `mcp/` inside it normally (R2).
8. Three-surface landing mandatory: every change lands in `.cleargate/` + `cleargate-planning/` + (where applicable) repo root config. Missing any → QA kick-back (R9).
9. `state.json` schema locked at `schema_version: 1` as of STORY-013-02 merge. Any change bumps the field; no silent edits (R3).

## Active FLASHCARD Tags

Tags from `.cleargate/FLASHCARD.md` relevant to this sprint's surface. Agents: grep the flashcard file for each tag before starting work.

- `#worktree` — nested `mcp/` is off-limits for `git worktree add`; edit inside outer worktree (2026-04-21).
- `#mcp` — nested-repo worktrees are a git footgun; use single outer worktree (2026-04-21).
- `#state-schema` — state.json lives at `.cleargate/sprint-runs/<id>/state.json` (NOT `.vbounce/state.json`); init default state is "Ready to Bounce"; auto-escalate on bounces==3 (2026-04-21).
- `#bash` `#macos` `#portability` — macOS ships bash 3.2; `mapfile`/`readarray` are bash 4+ only. Use portable `while IFS= read -r` pattern (2026-04-21).
- `#mjs` `#jsdoc` `#syntax` — glob `*` inside a .mjs JSDoc block triggers SyntaxError at module load; use `<id>` placeholder (2026-04-21).
- `#schema` — drizzle-kit manual SQL files ignored by `db:migrate`; always run `db:generate` first (2026-04-18).
- `#recipe` — V-Bounce port cheatsheet for state/worktree/bounce semantics (2026-04-21).

## Adjacent Implementations (Reuse First)

Exported helpers and modules from already-merged M1 stories. M2 Developers check here before writing new helpers — duplication is a kick-back criterion.

| Story | Module / Export | Path |
|---|---|---|
| STORY-013-01 | Worktree commands + branch hierarchy recipe | `.cleargate/knowledge/cleargate-protocol.md` §15 |
| STORY-013-02 | `VALID_STATES`, `TERMINAL_STATES`, `SCHEMA_VERSION`, `BOUNCE_CAP` constants | `.cleargate/scripts/constants.mjs` |
| STORY-013-02 | `init_sprint` (create state.json), `update_state` (atomic transitions), `validate_state`, `validate_bounce_readiness` | `.cleargate/scripts/*.mjs` |
| STORY-013-02 | state.json v1 JSON Schema | `.cleargate/scripts/state.schema.json` |
| STORY-013-03 | `run_script.sh` wrapper (stdout/stderr split + diagnostic block) | `.cleargate/scripts/run_script.sh` |
| STORY-013-03 | `pre_gate_runner.sh qa\|arch` + `pre_gate_common.sh` helpers | `.cleargate/scripts/pre_gate_runner.sh`, `pre_gate_common.sh` |
| STORY-013-03 | `gate-checks.json` (Node+TS baseline) + `init_gate_config.sh` re-seeder | `.cleargate/scripts/gate-checks.json`, `init_gate_config.sh` |
| STORY-013-04 | `sprint_context.md` template | `.cleargate/templates/sprint_context.md` |
| STORY-013-04 | Architect `## Adjacent Implementation Check` workflow step | `.claude/agents/architect.md` |
