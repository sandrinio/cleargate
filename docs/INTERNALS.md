This document maps how the ClearGate repo is organized — what every top-level folder is for, how the three deployed products relate, and how data flows between them. It is the internal reference; if you're here to *use* ClearGate in your own project, start with [README.md](../README.md) instead.

> Verified against source on **2026-05-31** (post planning-only split). The codebase is the source of truth — if this doc and the code disagree, the code wins and this doc is stale.

---

## TL;DR — three products + one framework

ClearGate is **three deployed products** plus **one framework** that drives Claude Code on a developer's machine. They all live as sibling folders in this repo, but after the **2026-05-31 planning-only split** the outer `sandrinio/cleargate` repo tracks *only* the framework — the three products are each their **own git repo**, gitignored here and re-cloned side-by-side so local builds resolve.

| # | Thing | Folder(s) | Where it runs |
|---|---|---|---|
| 1 | **MCP server** | `mcp/` | `https://cleargate-mcp.soula.ge` (Coolify) |
| 2 | **Admin console** | `admin/` | `https://admin.cleargate.soula.ge` (Coolify) |
| 3 | **The framework** | `cleargate-cli/` + `cleargate-planning/` + `.cleargate/` + `.claude/` | npm (`cleargate`) → Claude Code on user machines |

The framework is **not one folder** — that's the most common point of confusion. It's a layered thing (see below).

---

## The deployment topology

```
  USER MACHINE (any target repo + Claude Code)            CLOUD (Coolify)
  ┌────────────────────────────────────────────┐    ┌────────────────────────────────┐
  │ `cleargate` CLI (npm package)               │    │  mcp/   cleargate-mcp.soula.ge   │
  │   init  → drops .claude/ + .cleargate/      │    │  ┌────────────────────────────┐ │
  │   join  → redeems invite, gets Bearer token │    │  │ /mcp          (MCP-over-HTTP)│ │
  │   push/sync ──── Bearer token ──────────────┼────┼─▶│ /admin-api/v1 (REST)        │ │
  │   mcp serve → stdio↔HTTP bridge for Claude  │    │  └─────────────┬──────────────┘ │
  │                                             │    │     Postgres (items+versions,  │
  │ Claude Code runs the five-agent loop using  │    │       tokens, members, audit,  │
  │ the scaffold; work items are markdown under │    │       invites)                 │
  │ .cleargate/delivery/**                      │    │     Redis (cache + sessions)   │
  └────────────────────────────────────────────┘    │              ▲                 │
                                                      │  /admin-api  │ Bearer JWT       │
                        GitHub OAuth ─────────────────┼──────────────┤                 │
                                                      │  admin/  admin.cleargate.soula  │
                                                      │  mint tokens · view items ·     │
                                                      │  audit · stats  (NO DB of its   │
                                                      │  own; Redis sessions only)      │
                                                      └────────────────────────────────┘
        Linear (PM tool)  ◀──── PULL only ──── adapter in mcp/src/adapters/
```

---

## What each top-level folder is

| Folder | Tracked in outer repo? | What it is |
|---|---|---|
| `mcp/` | No — own repo `sandrinio/cleargate-mcp`, gitignored | The only product that owns a database. Fastify server exposing MCP-over-HTTP at `/mcp` plus a Bearer-auth `/admin-api/v1` REST API. Postgres = source of truth (versioned `items`, last 10 versions/item); Redis = cache / rate-limit / token-revocation. Linear pull adapter. |
| `admin/` | No — gitignored; **not yet its own git repo** (split pending) | Thin SvelteKit (Svelte 5 / adapter-node) frontend over the MCP server's `/admin-api/v1`. Owns **no business data** — every read/write is an HTTP call to `mcp`. Its only storage is Redis (GitHub-OAuth sessions). |
| `cleargate-cli/` | No — own repo `sandrinio/cleargate-cli`, gitignored | The npm package `cleargate`. Two jobs: **(1)** `cleargate init` scaffolds a target repo; **(2)** sync client + stdio↔HTTP MCP bridge (`cleargate mcp serve`) to the hosted server. |
| `cleargate-planning/` | **Yes** | The **canonical scaffold payload** `init` installs — agents, hooks, skills, templates, knowledge, and the bounded `CLAUDE.md` block. Mirrored byte-for-byte into `cleargate-cli/templates/` by `prebuild`; never shipped as a folder (only its *contents* land in target repos). |
| `.cleargate/` | **Yes** (runtime bits gitignored) | This repo **dogfooding itself** — the live, populated planning store the empty `cleargate-planning/.cleargate/` skeleton grows into: raw work items (`delivery/`), the compiled `wiki/`, `sprint-runs/`, `templates/`, `knowledge/`, `FLASHCARD.md`. |
| `.claude/` | No — gitignored, per-machine | The **live runtime instance** Claude Code executes here: five agent roles + wiki subagents, skills, hooks, `settings.json`. Re-synced from canonical via `cleargate init`. |
| `cleargate-planning/` & root `CLAUDE.md` | Yes | `CLAUDE.md` = this repo's own Claude Code instructions (with the bounded `CLEARGATE` block). `cleargate-planning/CLAUDE.md` = the canonical block that gets injected into target repos. Keep the two bounded blocks in sync. |
| `assets/`, `docs/`, `README.md`, `LICENSE` | Yes | Public face of `github.com/sandrinio/cleargate`. `docs/INTERNALS.md` is this file. |
| `scripts/ci-no-pm-sdk.mjs` | Yes | The EPIC-027 boundary CI gate (`npm run check:no-pm-sdk`): fails on any PM-tool SDK import in `cleargate-cli/src/**` or `.claude/**`. |
| `sql/hotfixes/` | Yes | Manual one-off DB patches for the MCP Postgres (applied by hand, not a migration runner). |
| `package.json` (root) | Yes | `name: cleargate-planning`, private, **no deps, no workspaces** — only the `check:no-pm-sdk` script. Not a workspace root anymore. |
| `knowledge/` | No — gitignored | Private reference docs (design guide, architecture notes). Distinct from the tracked `.cleargate/knowledge/`. |
| `package-lock.json`, `node_modules/`, `test-baseline.json` | mixed | **Stale monorepo residue** — see [Cleanup status](#cleanup-status). |

---

## The framework, decomposed (canonical → payload → live)

"The framework" reaches Claude Code through three copies of the same scaffold that must be kept in sync **manually**:

1. **Canonical (tracked):** `cleargate-planning/.claude/**` + `cleargate-planning/.cleargate/**` — source of truth. Edits land here.
2. **NPM payload (tracked, auto-mirrored):** `cleargate-cli/templates/cleargate-planning/**` — kept byte-identical to canonical by `npm run prebuild` (`copy-planning-payload.mjs`). Published inside the `cleargate` npm package. Don't hand-edit.
3. **Live (gitignored):** `/.claude/**` — what Claude Code actually executes in *this* repo. Regenerated by `cleargate init` from the payload.

Edits to canonical do **not** auto-propagate to live. After changing canonical hooks/agents/skills/settings/CLAUDE.md, re-sync via `cleargate init` (or hand-port). Skipping this is a recurring bug source.

`cleargate init` copies only the **contents** of `.claude/` and `.cleargate/` into a target repo — the `cleargate-planning/` wrapper exists only in this meta-repo. The top-level `CLAUDE.md` is bounded-block-injected (not copied verbatim); `MANIFEST.json` is skipped; the install snapshot lands at the target's `.cleargate/.install-manifest.json`.

---

## The five-agent execution loop

Sprint execution runs five agent roles (definitions in `.claude/agents/`, canonical in `cleargate-planning/.claude/agents/`), orchestrated by the conversational agent — agents return structured text, never talk to each other directly:

- **Architect** (opus) — plans a milestone; does not write production code.
- **Developer** (sonnet) — one Story per commit, with tests + typecheck.
- **QA** (sonnet) — independent verify; runs in RED (author failing tests) and VERIFY modes. Never edits code, never commits.
- **DevOps** — mechanical merge, worktree teardown, state→Done. Never authors code.
- **Reporter** (opus) — sprint retrospective → `SPRINT-<#>_REPORT.md`.

Plus four wiki subagents (`query`, `ingest`, `lint`, `contradict`) for the awareness layer. The sprint-execution skill describes the dispatch order as **Architect → QA-Red → Developer → QA-Verify → Reporter**, with DevOps handling merge/teardown.

---

## How the three products connect

### Token flow (mint → use → validate)

1. **Mint** — an operator in the admin console calls `POST /admin-api/v1/projects/:id/tokens`. The MCP server generates a 32-byte base64url plaintext, stores only its **bcrypt hash** (`tokens.tokenHash`), and returns the plaintext **once**.
2. **Distribute** — the user runs `cleargate join <invite-url>` (GitHub device-flow or email OTP), which seats a refresh token in the OS keychain (`~/.cleargate/auth.json` fallback) and writes `.cleargate/.join.json` (project_id).
3. **Use** — every CLI call to `/mcp` sends `Authorization: Bearer <token>`.
4. **Validate** — the MCP server's `combinedAuth` preHandler tries JWT first, then the service-token path (shape guard → bcrypt compare against non-revoked/non-expired rows → Redis `rev:token:<id>` double-check).

The admin **console itself** uses a separate path: a Redis-backed `cg_session` cookie is exchanged at `/admin-api/v1/auth/exchange` for a short-lived admin JWT, sent as Bearer on subsequent admin-api calls. A `403` on exchange means the GitHub account isn't on the admin allowlist (which lives in the MCP DB).

### Sync flow (markdown → visibility)

1. A work item is markdown under `.cleargate/delivery/**` with YAML frontmatter (`approved: true`, etc.).
2. `cleargate push <file>` runs a **client-side `approved` gate** — if `approved !== true` it exits with **zero network traffic** — then builds the payload (frontmatter + body + `origin: cleargate-cli`, reserved keys stripped).
3. The CLI calls `push_item` over `/mcp` with a Bearer token.
4. The MCP server runs L1/L2 contract checks, then upserts the `items` row + appends `item_versions` inside a `SELECT FOR UPDATE` transaction. **Push terminates in Postgres.**
5. The admin console reads those rows back via `GET /admin-api/v1/projects/:id/items` for stakeholder visibility — closing the loop with **no middleman DB**.

---

## Three things that surprise people

These contradict the intuitive (and previously-documented) model — all verified in source:

1. **`admin/` has no database.** No `drizzle`, no `pg`, no `DATABASE_URL`. It's a frontend over `mcp`'s `/admin-api/v1`; its only storage is Redis (OAuth sessions). There is **one** database, owned by `mcp` — admin reaches it only over HTTP.

2. **`push` never reaches Linear.** The PM adapter interface is **pull-only** (`pullItem` / `listUpdates` / `pullComments` / `detectNewItems` — there is no `pushItem`). So push = markdown → MCP → **Postgres, full stop**. The external PM tool is touched only on the *pull / sync-in* direction. (The one-line product vision's "MCP adapter pushes native" is the roadmap target, not current behavior.)

3. **Adapter selection is a single global env var, not per-project DB rows.** `buildAdapter()` returns `LinearAdapter` iff a server-wide `LINEAR_API_KEY` is set, else a no-op stub. There is no `adapters`/`credentials` table; per-project `PM_TOOL` selection is explicitly marked "future" in the code.

---

## Cleanup status

Leftovers from before the 2026-05-31 split — none load-bearing for the repo's tracked contents, but worth knowing:

- **`test-baseline.json`** (root) — *removed* in this pass. It baselined CLI tests that now live in the split-out `cleargate-cli/` repo (which carries its own baseline). The outer `pre-commit` dispatcher globs `.git/hooks/pre-commit-*.sh` and **none are installed**, so the test-ratchet never ran on outer-repo commits.
- **`package-lock.json`** (root, tracked) — still declares `name: cleargate-monorepo` with `workspaces: [cleargate-cli, admin]`. Stale relative to the planning-only `package.json`, but it is the accurate record of the current root `node_modules` install.
- **Root `node_modules/`** (gitignored) — **still load-bearing**: `admin/node_modules` is *empty*, so admin's deps are hoisted into root `node_modules`. Deleting it (or regenerating the lockfile, which prunes on next install) breaks `cd admin && npm run build`. Cleaning these is coupled to completing the admin split — make `admin/` (and verify `cleargate-cli/`) self-contained with their own `npm install` first, **then** drop the root lockfile + `node_modules`.
- **Vestigial `cleargate-admin` remote** on the outer repo — leftover from the retired "push to both remotes" admin-deploy model. Droppable.

---

## Stack versions (this repo's own)

Node 24 LTS · TypeScript ^5.8 · Fastify ^5.8 · Drizzle 0.45.2 · Zod ^4.3 · Postgres 18 · Redis 8 · SvelteKit ^2 (Svelte 5) · Tailwind ^4.2 · DaisyUI ^5.5.

ClearGate imposes none of these on downstream consumers — this documents the meta-repo's own toolchain. Downstream projects pick whatever stack they run and configure gate commands via `.cleargate/config.yml`.

## License

MIT — see [LICENSE](../LICENSE).
