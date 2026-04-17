# ClearGate Admin

SvelteKit web UI for managing ClearGate projects, members, tokens, and viewing audit logs + basic stats.

## Status
[PROPOSAL-003](../strategy/proposals/PROPOSAL-003_MCP_Adapter.md) approved 2026-04-17. Full scaffold pending — will be added after `../mcp/` foundation is wired up.

## Architecture

Separate Coolify app that talks to `../mcp/`'s admin API. Deployed at `admin.cleargate.<domain>`.

- SvelteKit 2 + Vite
- DaisyUI + Tailwind
- `@auth/sveltekit` with GitHub OAuth provider
- Session state in Redis (shared with MCP)

## Planned routes

```
/login                          GitHub OAuth
/                               Dashboard — projects list
/projects/new                   Create project
/projects/[id]                  Project overview
/projects/[id]/members          Members CRUD
/projects/[id]/tokens           Tokens CRUD (one-time-display on issue)
/projects/[id]/items            Browse items
/projects/[id]/items/[clid]     Item + version history
/projects/[id]/audit            Filtered audit log
/projects/[id]/stats            Requests/day, errors, top items
/settings                       Admin user management (root only)
```

See [PROPOSAL-003](../strategy/proposals/PROPOSAL-003_MCP_Adapter.md) §2.11 for detail.

## Sibling service
[`../mcp/`](../mcp/) — the MCP server this UI administers.
