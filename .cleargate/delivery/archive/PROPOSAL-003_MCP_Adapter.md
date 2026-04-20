---
proposal_id: PROP-003
status: Approved
author: AI Agent (cleargate planning)
approved: true
approved_at: 2026-04-17T00:00:00Z
approved_by: Vibe Coder (ssuladze@exadel.com)
created_at: 2026-04-17T00:00:00Z
updated_at: 2026-04-17T00:00:00Z
codebase_version: strategy-phase-pre-init
depends_on:
  - PROP-001
  - PROP-002
pushed_by: sandrinio@github.local
pushed_at: 2026-04-20T19:44:01.279Z
push_version: 3
---

# PROPOSAL-003: ClearGate MCP — Remote Hub + Admin UI on Coolify VPS

## 1. Initiative & Context

### 1.1 Objective
Build the ClearGate backend as **two cooperating services on Coolify VPS**:

1. **ClearGate MCP** — a remote MCP server (Streamable HTTP) acting as a multi-tenant, versioned item hub. Generic adapter interface; v1 ships no PM-tool adapters and stores items itself.
2. **ClearGate Admin** — a small SvelteKit web app for managing projects, members, tokens, and viewing audit logs + basic stats. GitHub OAuth login.

v1 integrates with **Chyro only** (Chyro is an MCP client). PM-tool adapters (Linear, Jira, Azure DevOps) and webhook receivers are deferred to v1.1.

### 1.2 The "Why" for Remote

- **Multi-tenant collaboration.** Multiple Vibe Coders + Chyro share one project backlog; everyone sees the same authoritative state.
- **Centralized credentials.** Tokens (and future PM secrets in v1.1) managed in one place, not scattered across machines.
- **Operational visibility.** Audit log and basic stats answer "who did what and is the system healthy?" — impossible with bundled stdio MCP.
- **Decoupled integrations.** Chyro talks to MCP via standard MCP protocol; same surface as future Linear/Jira adapters in v1.1.

### 1.3 Preserved Principles

- **Local-first for drafts.** Vibe Coder's `.cleargate/delivery/pending-sync/` remains the truth for in-progress drafts before push.
- **MCP independence.** No Chyro-specific code in MCP core. Chyro is just an MCP client.
- **No proprietary PM data model.** MCP stores items as generic versioned blobs; the markdown structure (templates) defines meaning, not the MCP schema.
- **Generic adapter interface.** Future PM-tool adapters (v1.1) plug into the same interface. v1 has zero adapters and is the canonical store itself.

---

## 2. Technical Architecture & Constraints

### 2.1 High-Level Diagram

```
                ┌──────────────────────────────────────────────────────────┐
                │                  Coolify VPS                             │
                │                                                          │
                │  ┌─────────────────────────┐  ┌─────────────────────┐    │
                │  │  ClearGate MCP          │  │  ClearGate Admin    │    │
                │  │  (Fastify + MCP SDK)    │  │  (SvelteKit)        │    │
                │  │                         │  │                     │    │
                │  │  Tools:                 │  │  Routes:            │    │
                │  │   push_item             │  │   /login (GH OAuth) │    │
                │  │   pull_item             │  │   /projects/*       │    │
                │  │   list_items            │  │   /audit /stats     │    │
                │  │   sync_status           │  │                     │    │
                │  │                         │  │  Calls MCP admin    │    │
                │  │  Streamable HTTP        │  │  API w/ admin JWT   │    │
                │  └────────┬────────────────┘  └─────────┬───────────┘    │
                │           │                             │                │
                │           └──────────┬──────────────────┘                │
                │                      ▼                                   │
                │  ┌──────────────────────────┐  ┌──────────────────┐      │
                │  │  Postgres                │  │  Redis           │      │
                │  │  - projects              │  │  - rate_limit:*  │      │
                │  │  - members               │  │  - idempotency:* │      │
                │  │  - clients               │  │  - sessions:*    │      │
                │  │  - tokens (hashed)       │  │  (admin UI)      │      │
                │  │  - items                 │  │                  │      │
                │  │  - item_versions (last10)│  │                  │      │
                │  │  - audit_log             │  │                  │      │
                │  │  - admin_users           │  │                  │      │
                │  └──────────────────────────┘  └──────────────────┘      │
                │                                                          │
                │  Traefik (TLS, Let's Encrypt) — terminates HTTPS         │
                └──────────────────────────────────────────────────────────┘
                          ▲                            ▲
                          │ HTTPS+JWT                  │ HTTPS (browser)
                          │                            │
                ┌─────────┴────┐  ┌──────────────┐  ┌──┴──────────────┐
                │  Claude Code │  │  Chyro       │  │  Admin browser  │
                │  (multiple   │  │  (web app,   │  │  (GitHub login) │
                │  Vibe Coders)│  │  service     │  │                 │
                │              │  │  token)      │  │                 │
                └──────────────┘  └──────────────┘  └─────────────────┘
```

### 2.2 V1 Scope Boundaries

**In v1:**
- MCP server with `push_item` / `pull_item` / `list_items` / `sync_status`
- Versioned item storage (last 10 versions per item, last-write-wins by server clock)
- Multi-tenant: projects with members and clients
- Per-member project-scoped JWT tokens (user role + service role)
- Admin UI: project/member/token CRUD, audit log, basic stats
- Audit log of every MCP call
- Rate limiting and idempotency
- Two Coolify deployments

**NOT in v1 (deferred to v1.1):**
- PM-tool adapters (Linear, Jira, Azure DevOps) — implemented as MCP-to-MCP adapters
- Webhook receivers (translate external events → MCP)
- OAuth 2.1 for MCP (bearer JWT only in v1)
- MCP → external callbacks (e.g., notify Chyro of changes)
- Live event streaming via Streamable HTTP GET channel

### 2.3 Two Deployable Services

Both ship as separate Docker images on Coolify, sharing the same Postgres and Redis instances:

| Service | Tech | Purpose |
|---|---|---|
| `cleargate-mcp` | Node.js 22 + Fastify + `@modelcontextprotocol/sdk` | The MCP server. Public domain: `mcp.cleargate.<domain>` |
| `cleargate-admin` | SvelteKit + DaisyUI + Tailwind | Admin web UI. Public domain: `admin.cleargate.<domain>` |

Why separate:
- Different security posture (admin behind GitHub OAuth; MCP behind service/user JWTs)
- Different scaling (admin lightly used; MCP under load)
- Independent deploys, smaller blast radius on compromise

### 2.4 Transport
**Streamable HTTP** per MCP 2026 spec for the MCP service. Single HTTPS endpoint supporting POST + GET. TLS via Traefik (Coolify default, auto Let's Encrypt). Admin UI is plain HTTPS browser traffic.

### 2.5 Authentication & Identity Model

#### Three IDs flow with every MCP request

| ID | Source | Purpose |
|---|---|---|
| `project_id` | JWT claim | Which backlog this call targets |
| `user_id` (or `service_name`) | JWT `sub` | Who the actor is |
| `client_id` | JWT claim | Which machine/instance is calling (Vibe Coder may have multiple devices) |

#### JWT structure

```json
{
  "sub": "<user_id-or-service-name>",
  "iss": "cleargate-mcp",
  "aud": "cleargate-mcp",
  "project_id": "<project_uuid>",
  "client_id": "<machine_uuid-optional-for-services>",
  "role": "user | service",
  "exp": <unix-timestamp>,
  "iat": <unix-timestamp>
}
```

For services (e.g., Chyro), an optional `X-Acting-User: <chyro-user-id>` header carries the human attribution. MCP trusts and logs it; the service is responsible for accuracy.

#### Token issuance flow

| Action | CLI | Resulting credential |
|---|---|---|
| Bootstrap first admin | env-var `CLEARGATE_ADMIN_BOOTSTRAP_GH_USER=<gh-handle>` at first server start | Admin user created, can log into Admin UI via GitHub OAuth |
| Create a project | Admin UI or `cleargate-admin create-project <name>` | `project_id` + first project-admin token |
| Invite a Vibe Coder | Admin UI or `cleargate-admin invite --project <id> --email <email>` | One-time signup link |
| Vibe Coder joins | `cleargate join <invite-url>` (CLI) | Refresh token saved to OS keychain (or `~/.cleargate/auth.json` chmod 600 fallback) |
| Issue service token | Admin UI or `cleargate-admin issue-token --project <id> --name <name> --role service` | Long-lived token (shown once) |
| Revoke any token | Admin UI or `cleargate-admin revoke-token <token_id>` | Server-side revocation list (Redis) |

Refresh tokens: 90-day rolling. Access tokens (returned by `/auth/refresh`): 15-minute TTL.

#### Three roles, all generic

| Role | Use |
|---|---|
| `admin` | Logs into Admin UI via GitHub OAuth. Can manage projects/members/tokens. |
| `user` | A Vibe Coder. Tied to email identity. Standard rate limits. |
| `service` | A long-lived integration (Chyro, future GitHub bot, etc.). Higher rate limits. May carry `X-Acting-User`. |

### 2.6 MCP Tools (v1)

| Tool | Args | Returns | Behavior |
|---|---|---|---|
| `push_item` | `cleargate_id`, `type`, `payload`, `idempotency_key` | `{ version, updated_at }` | Upserts an item. Increments `current_version`, archives prior payload to `item_versions`, prunes to last 10. |
| `pull_item` | `cleargate_id`, `version?` | `{ payload, version, updated_at, updated_by }` | Returns current payload (or specific version). |
| `list_items` | `type?`, `updated_since?`, `limit`, `cursor` | `{ items: [...], next_cursor }` | Paginated list scoped to caller's project. |
| `sync_status` | `cleargate_id`, `new_status` | `{ version, updated_at }` | Convenience wrapper around `push_item` for status-only updates. |

All tools are scoped to the JWT's `project_id` — no cross-project access possible.

### 2.7 Storage Schema (Postgres)

```sql
-- Tenancy
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID NOT NULL  -- admin_users.id
);

CREATE TABLE admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  github_handle TEXT UNIQUE NOT NULL,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_root BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  email TEXT NOT NULL,             -- user identity
  role TEXT NOT NULL,              -- 'user' | 'service'
  display_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (project_id, email)
);

CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  machine_label TEXT,              -- e.g., "macbook-pro-bohdan"
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  name TEXT NOT NULL,              -- audit-log-friendly label
  token_hash TEXT NOT NULL,        -- bcrypt hash of refresh token
  expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at TIMESTAMPTZ
);

-- Items + versioning
CREATE TABLE items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  cleargate_id TEXT NOT NULL,       -- e.g., "EPIC-042-stripe-webhooks"
  type TEXT NOT NULL,               -- 'initiative'|'epic'|'story'|'bug'|'cr'|'proposal'
  current_version BIGINT NOT NULL,
  current_payload JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by_member_id UUID NOT NULL REFERENCES members(id),
  updated_by_client_id UUID REFERENCES clients(id),
  UNIQUE (project_id, cleargate_id)
);

CREATE TABLE item_versions (
  id BIGSERIAL PRIMARY KEY,
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  version BIGINT NOT NULL,
  payload JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  updated_by_member_id UUID NOT NULL,
  updated_by_client_id UUID,
  UNIQUE (item_id, version)
);

CREATE INDEX idx_item_versions_item ON item_versions (item_id, version DESC);

-- Pruning to last 10 happens via trigger on insert into item_versions

-- Audit
CREATE TABLE audit_log (
  id BIGSERIAL PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  project_id UUID NOT NULL,
  member_id UUID,
  client_id UUID,
  acting_user TEXT,                 -- from X-Acting-User header (services)
  tool TEXT NOT NULL,               -- 'push_item'|'pull_item'|'list_items'|'sync_status'
  target_cleargate_id TEXT,
  result TEXT NOT NULL,             -- 'ok' | 'error'
  error_code TEXT,
  ip_address INET,
  user_agent TEXT
);

CREATE INDEX idx_audit_project_time ON audit_log (project_id, timestamp DESC);
```

### 2.8 Versioning & Conflict Policy

- **Server stamps `updated_at`** — never trust client clock.
- **Last-write-wins** by server timestamp. Postgres row-level lock on `items` serializes concurrent pushes.
- **Last 10 versions** per item retained in `item_versions`. Older pruned via trigger or nightly job.
- **Full payload per version** (not diffs) — items are small markdown blobs; storage is cheap, retrieval is trivial.
- **No real-time conflict detection.** If two pushes arrive in quick succession, the later one wins; the earlier sits in `item_versions` for audit.
- **Item IDs are human-friendly** (`EPIC-042-stripe-webhooks`), unique within a project.

### 2.9 Idempotency

Every `push_item` call carries a client-generated `idempotency_key = sha256(cleargate_id + payload)`. Server stores `idempotency:{project_id}:{key} → { version, updated_at }` in Redis with 24h TTL. Duplicate push returns cached result without writing.

### 2.10 Rate Limiting

| Scope | Limit |
|---|---|
| Per-user-token | 60 req/min |
| Per-service-token | 600 req/min |
| Per-admin-API | 30 req/min |

Sliding window in Redis. 429 returned with `Retry-After` header.

### 2.11 Admin UI Scope

```
ClearGate Admin (SvelteKit)
├── /login                          GitHub OAuth
├── /                                Dashboard (project list)
├── /projects/new                    Create project
├── /projects/[id]                   Project overview
├── /projects/[id]/members           List, invite, remove members
├── /projects/[id]/tokens            List, issue, revoke tokens
├── /projects/[id]/items             Browse items (paginated)
├── /projects/[id]/items/[clid]      View item + version history (last 10)
├── /projects/[id]/audit             Filtered audit log (date, user, tool)
├── /projects/[id]/stats             Basic charts: req/day, errors, top items
└── /settings                        Admin user management (root only)
```

Stack: SvelteKit + DaisyUI + Tailwind. Auth: GitHub OAuth (no passwords). Sessions in Redis.

The admin UI talks to the MCP via a separate admin API (mounted at `/admin/*` on the MCP service, gated by admin JWT scope).

### 2.12 Stack (verified April 2026 — latest stable)

| Layer | Choice | Version | Reason |
|---|---|---|---|
| MCP runtime | Node.js LTS + TypeScript strict | Node 24 LTS ("Krypton") + TS ^5.8 | Node 24 is current Active LTS (since May 2025); Node 22 now Maintenance LTS |
| MCP HTTP | Fastify | ^5.8 | Schema-first, fast; v5 production hardening (requestTimeout + return503OnClosing) |
| MCP SDK | `@modelcontextprotocol/sdk` | ^1.29 (v1.x) | v2 still pre-alpha; v1.x is production-recommended |
| Admin runtime | SvelteKit 2 + Vite | SvelteKit ^2, Svelte ^5 | Svelte 5 runtime is current default |
| Admin styling | Tailwind + DaisyUI | Tailwind ^4.2, DaisyUI ^5.5 | Tailwind v4 (CSS-first config) + DaisyUI v5 (Tailwind v4 compatible) |
| Admin auth | `@auth/sveltekit` w/ GitHub provider | current | Standard, audited |
| JWT | `jose` | ^5.9 | Spec-compliant, zero-dep |
| DB | PostgreSQL | **18** | 18.3 current; previously 17 |
| Cache/sessions | Redis | **8** | Redis 8.6.x current GA (Feb 2026); previously 7 |
| ORM | Drizzle | ^0.45.2 | v1.0 still beta; 0.45.2 is latest stable (incl. SQL-injection security fix in `sql.identifier()`/`sql.as()`) |
| Migrations | drizzle-kit | ^0.30 | Aligned with drizzle-orm 0.45.x |
| Validation | `zod` | ^4.3 | v4 is current (big release incl. `z.fromJSONSchema`, `z.xor`, `.exactOptional`) |
| Logging | pino + `pino-pretty` (dev) | pino ^9.4 | Fast, structured, scrubs auth headers |
| Charts (Admin UI) | Chart.js | ^4 | Per EPIC-006 Q2 override |
| Container | Docker, multi-stage builds | current | Coolify deploys containers |

### 2.13 Constraints

| Constraint | Detail |
|---|---|
| No PM-tool adapters in v1 | Explicit scope boundary; deferred to v1.1 |
| No webhook receivers in v1 | Deferred; Chyro pushes via MCP directly |
| Zero secrets in git | `.env.example` only |
| Token plaintext never stored | bcrypt hashes only |
| Authorization header scrubbed from logs | pino redaction config |
| Single-tenant project scope per JWT | No cross-project leakage |
| Admin UI behind GitHub OAuth | No public admin signup |

### 2.14 What v1.1 Adds

| Feature | Why deferred |
|---|---|
| Linear/Jira/Azure DevOps adapters (MCP-to-MCP) | v1 has no PM-tool integration; Chyro-only |
| Webhook receiver service | Only useful when external systems exist (PM tools); not needed for Chyro |
| OAuth 2.1 for MCP | Bearer JWT sufficient for v1 team scale |
| MCP → Chyro callbacks | Requires Chyro to expose a REST API; deferred |
| Live event streaming via Streamable HTTP GET | Pull-on-demand sufficient for v1 |

---

## 3. Scope Impact (Touched Files & Data)

### 3.1 New Repository Layout

```
mcp/                                 (already created)
├── README.md                        (already created — to be updated)
├── package.json
├── tsconfig.json
├── Dockerfile
├── docker-compose.yml               (local dev: Postgres + Redis + MCP)
├── .env.example
├── drizzle.config.ts
├── src/
│   ├── server.ts                    (Fastify + MCP HTTP entry)
│   ├── config.ts                    (env parsing w/ zod)
│   ├── auth/
│   │   ├── jwt.ts                   (issue/verify access + refresh)
│   │   ├── middleware.ts
│   │   └── github-oauth.ts          (admin login flow)
│   ├── db/
│   │   ├── client.ts
│   │   ├── schema.ts
│   │   └── migrations/
│   ├── redis/
│   │   └── client.ts
│   ├── tools/
│   │   ├── push-item.ts
│   │   ├── pull-item.ts
│   │   ├── list-items.ts
│   │   └── sync-status.ts
│   ├── admin-api/
│   │   ├── projects.ts
│   │   ├── members.ts
│   │   ├── tokens.ts
│   │   ├── audit.ts
│   │   └── stats.ts
│   ├── middleware/
│   │   ├── rate-limit.ts
│   │   ├── idempotency.ts
│   │   └── audit.ts
│   ├── adapters/                    (interface only in v1)
│   │   └── base.ts
│   └── util/
│       └── logger.ts                (pino w/ redaction)
├── scripts/
│   ├── cleargate-admin              (CLI: create-project, invite, issue-token, revoke)
│   └── bootstrap-admin.ts           (env-var → first admin user)
└── coolify/
    └── DEPLOYMENT.md

admin/                               (to be created on approval)
├── README.md
├── package.json
├── svelte.config.js
├── vite.config.ts
├── Dockerfile
├── .env.example
├── src/
│   ├── app.html
│   ├── routes/
│   │   ├── +layout.svelte
│   │   ├── +page.svelte             (dashboard)
│   │   ├── login/+page.svelte
│   │   ├── projects/
│   │   │   ├── +page.svelte
│   │   │   ├── new/+page.svelte
│   │   │   └── [id]/
│   │   │       ├── +page.svelte
│   │   │       ├── members/+page.svelte
│   │   │       ├── tokens/+page.svelte
│   │   │       ├── items/+page.svelte
│   │   │       ├── items/[clid]/+page.svelte
│   │   │       ├── audit/+page.svelte
│   │   │       └── stats/+page.svelte
│   │   └── settings/+page.svelte
│   ├── lib/
│   │   ├── mcp-client.ts            (calls MCP admin API)
│   │   └── components/
│   └── hooks.server.ts              (auth)
└── coolify/
    └── DEPLOYMENT.md
```

### 3.2 External Dependencies (v1)

**MCP service:**
- `@modelcontextprotocol/sdk`, `fastify`, `@fastify/cors`
- `pino`, `zod`, `jose`
- `pg`, `drizzle-orm`, `drizzle-kit`
- `ioredis`, `bcrypt`
- Dev: `vitest`, `tsx`, `@types/node`, `eslint`, `prettier`

**Admin UI:**
- `@sveltejs/kit`, `vite`, `svelte`
- `daisyui`, `tailwindcss`
- `@auth/sveltekit`, `@auth/core` (GitHub provider)
- `lucide-svelte` (icons)

### 3.3 Coolify Services

- PostgreSQL 17 (Coolify-managed, shared by both apps)
- Redis 7 (Coolify-managed)
- `cleargate-mcp` (Docker app)
- `cleargate-admin` (Docker app)
- Two domains: `mcp.cleargate.<domain>`, `admin.cleargate.<domain>` (auto-TLS via Traefik)

---

## 4. AI Interrogation Loop — Pre-Resolved per Conversation

Decisions confirmed by Vibe Coder during the design conversation that produced this proposal. Listed for audit trail.

### Core architecture
1. **MCP role in v1** — RESOLVED: stateful versioned hub (not stateless proxy). Source of truth for v1.
2. **PM-tool adapters in v1** — RESOLVED: none. Chyro-only. Linear/Jira/Azure DevOps as MCP-to-MCP adapters in v1.1.
3. **Webhook receivers in v1** — RESOLVED: none. Chyro pushes via MCP directly.
4. **Admin UI in v1** — RESOLVED: yes. SvelteKit + DaisyUI.
5. **Admin auth** — RESOLVED: GitHub OAuth only. No passwords.
6. **Transport** — RESOLVED: Streamable HTTP per MCP 2026 spec.
7. **MCP independence from Chyro** — RESOLVED: MCP code has zero Chyro-specific logic. Chyro is just an MCP client.

### Identity & auth
8. **Multi-tenant by project** — RESOLVED: yes. Multiple Vibe Coders + Chyro share one project.
9. **Token model** — RESOLVED: per-member project-scoped JWT. Tokens carry `project_id`, `user_id` or `service_name`, `client_id`, `role`.
10. **Service tokens are generic** — RESOLVED: no destination/ticket-system tied to a token. Same token for any MCP operation in any direction.
11. **Roles** — RESOLVED: `admin`, `user`, `service`. All generic.
12. **`X-Acting-User` for services** — RESOLVED: trust + log. Service is responsible for accuracy.
13. **Token issuance** — RESOLVED: both Admin UI and `cleargate-admin` CLI. CLI for headless ops; UI for daily use.

### Storage & versioning
14. **Source of truth on conflict** — RESOLVED: last-write-wins by server timestamp.
15. **Version history** — RESOLVED: last 10 versions per item retained.
16. **Per-version storage** — RESOLVED: full payload (not diffs). Items are small markdown blobs.
17. **`cleargate_id` format** — RESOLVED: human-friendly (`EPIC-042-stripe-webhooks`).

### Lifecycle
18. **Refresh token TTL** — RESOLVED: 90 days, rotating.
19. **Access token TTL** — RESOLVED: 15 minutes.
20. **Service token rotation** — RESOLVED: yearly, manual.
21. **Local token storage on Vibe Coder machine** — RESOLVED: OS keychain when available, `~/.cleargate/auth.json` (chmod 600) fallback.
22. **First admin bootstrap** — RESOLVED: env var `CLEARGATE_ADMIN_BOOTSTRAP_GH_USER` at first server start.

### Open questions remaining

None blocking. Two items to revisit later, not blocking approval:
- **§6 answer-block sync convention** for v1.1 PM tools — defer to v1.1 design.
- **Linear/Jira MCP-to-MCP wiring** — defer to v1.1 proposal.

---

## Approval Gate — PASSED

Approved by Vibe Coder on 2026-04-17. Scaffolding of `mcp/` and `admin/` per §3.1 authorized. Architecture confirmed: two separate Coolify apps (mcp + admin), shared Postgres + Redis.
