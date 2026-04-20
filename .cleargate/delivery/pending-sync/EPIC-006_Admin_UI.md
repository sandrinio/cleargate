---
epic_id: EPIC-006
status: Ready
ambiguity: 🟢 Low
context_source: PROPOSAL-003_MCP_Adapter.md
owner: Vibe Coder (ssuladze@exadel.com)
target_date: TBD
created_at: 2026-04-17T00:00:00Z
updated_at: 2026-04-17T00:00:00Z
created_at_version: strategy-phase-pre-init
updated_at_version: strategy-phase-pre-init
resolved_at: 2026-04-17T00:00:00Z
resolved_by: Vibe Coder (ssuladze@exadel.com)
approved: true
pushed_by: sandrinio@github.local
pushed_at: 2026-04-20T19:44:40.339Z
push_version: 2
---

# EPIC-006: Admin UI (SvelteKit)

## 0. AI Coding Agent Handoff

```xml
<agent_context>
  <objective>Build the ClearGate Admin web UI — a SvelteKit + DaisyUI + Tailwind app that admins log into via GitHub OAuth to manage projects, members, tokens, and view audit logs + basic stats. Talks exclusively to the MCP's admin API (EPIC-004).</objective>
  <architecture_rules>
    <rule>No direct database access. Only the admin API.</rule>
    <rule>GitHub OAuth via @auth/sveltekit is the only login path in v1.</rule>
    <rule>Sessions stored in Redis (shared with MCP service).</rule>
    <rule>Admin JWT is short-lived (15 min) — fetched on login, refreshed silently via @auth/sveltekit middleware.</rule>
    <rule>Token plaintext shown exactly once, in a modal, with explicit "I've saved it" confirmation before dismissal.</rule>
    <rule>No PII stored beyond what admin API provides.</rule>
    <rule>Visual language is defined by knowledge/design-guide.md — the custom DaisyUI `cleargate` theme, token palette, typography, spacing, and component patterns there are authoritative. Do not substitute stock DaisyUI themes.</rule>
  </architecture_rules>
  <target_files>
    <file path="admin/package.json" action="create" />
    <file path="admin/svelte.config.js" action="create" />
    <file path="admin/vite.config.ts" action="create" />
    <file path="admin/tailwind.config.js" action="create" />
    <file path="admin/postcss.config.js" action="create" />
    <file path="admin/tsconfig.json" action="create" />
    <file path="admin/Dockerfile" action="create" />
    <file path="admin/.env.example" action="create" />
    <file path="admin/src/app.html" action="create" />
    <file path="admin/src/app.css" action="create" />
    <file path="admin/src/hooks.server.ts" action="create" />
    <file path="admin/src/lib/mcp-client.ts" action="create" />
    <file path="admin/src/lib/components/" action="create" />
    <file path="admin/src/routes/+layout.svelte" action="create" />
    <file path="admin/src/routes/+page.svelte" action="create" />
    <file path="admin/src/routes/login/+page.svelte" action="create" />
    <file path="admin/src/routes/projects/new/+page.svelte" action="create" />
    <file path="admin/src/routes/projects/[id]/+page.svelte" action="create" />
    <file path="admin/src/routes/projects/[id]/members/+page.svelte" action="create" />
    <file path="admin/src/routes/projects/[id]/tokens/+page.svelte" action="create" />
    <file path="admin/src/routes/projects/[id]/items/+page.svelte" action="create" />
    <file path="admin/src/routes/projects/[id]/items/[clid]/+page.svelte" action="create" />
    <file path="admin/src/routes/projects/[id]/audit/+page.svelte" action="create" />
    <file path="admin/src/routes/projects/[id]/stats/+page.svelte" action="create" />
    <file path="admin/src/routes/settings/+page.svelte" action="create" />
  </target_files>
</agent_context>
```

## 1. Problem & Value

**Why are we doing this?**
CLI-only admin is friction. Onboarding a new Vibe Coder, rotating a leaked token, or investigating "who pushed this?" is much faster with a UI. The Admin UI is the operator's daily driver.

**Success Metrics (North Star):**
- First-time admin completes GitHub OAuth + lands on dashboard in under 10 seconds.
- Invite flow: admin fills form → sees copyable invite URL in under 5 seconds.
- Token rotation: admin revokes + issues new token in under 3 clicks.
- Audit log loads a 30-day window with filters in under 1 second.
- Lighthouse performance score ≥ 90 on the dashboard route.

## 2. Scope Boundaries

**✅ IN-SCOPE**
- [ ] SvelteKit 2 + Vite scaffold
- [ ] DaisyUI + Tailwind configured
- [ ] `@auth/sveltekit` GitHub OAuth provider
- [ ] Session persistence in Redis (shared with MCP)
- [ ] All 10 routes per PROPOSAL-003 §2.11
- [ ] Token-issuance modal: plaintext shown once + "I've saved it" gate + auto-dismiss on navigation
- [ ] Audit log: date-range picker, user filter, tool filter, cursor pagination
- [ ] Stats charts: req/day, error rate, top items (simple SVG or Chart.js — small bundle)
- [ ] Empty states on every list page (no projects, no members, no tokens, no items)
- [ ] Error boundaries with user-friendly fallbacks
- [ ] Dockerfile (multi-stage) + Coolify deploy runbook

**❌ OUT-OF-SCOPE (deferred)**
- Password-based login (GitHub OAuth only in v1)
- SSO with enterprise IdPs (Okta, Azure AD) — v1.1+
- MFA (rely on GitHub's 2FA) — v1.1+
- Mobile responsive refinement (works on mobile but not optimized)
- Dark/light theme switcher (ship with one theme in v1, configurable later)
- In-app docs / help tooltips (link to external docs instead)
- Bulk import/export UI

## 3. The Reality Check (Context)

| Constraint | Rule |
|---|---|
| Transport | HTTPS only. Admin UI at `admin.cleargate.<domain>`; MCP at `mcp.cleargate.<domain>`. |
| Auth | GitHub OAuth → session cookie → admin JWT fetched from `/admin-api/v1/auth/exchange`. |
| Session | Stored in Redis (shared instance). Cookie is HttpOnly, Secure, SameSite=Lax. |
| Token display | Modal shown immediately on token-create response. Close-button disabled until "I've saved it" checkbox ticked. |
| Performance | p95 TTFB < 300ms server-side; hydration < 1s on mid-range device. |
| A11y | All interactive elements reachable via keyboard; focus ring visible; aria labels on icon buttons. |
| Error handling | Admin API 403 → redirect to login. 5xx → inline error with retry. Network offline → banner. |
| Analytics | None in v1. No third-party tracking. |

## 4. Technical Grounding

**Stack (from PROPOSAL-003 §2.12):**
- SvelteKit 2 (`@sveltejs/kit@^2`)
- Vite
- Tailwind 4 + DaisyUI 5 (custom `cleargate` theme — see [design-guide.md](../../knowledge/design-guide.md))
- `@fontsource-variable/inter` (self-hosted Inter Variable per design guide §3)
- `@auth/sveltekit` + `@auth/core` (GitHub provider)
- `ioredis` for Redis session store (shared with MCP)
- `lucide-svelte` for icons
- A small charting lib — TBD (Q3 below)

**Routes (from PROPOSAL-003 §2.11):**
```
/login                              GitHub OAuth
/                                   Dashboard — projects list
/projects/new                       Create project
/projects/[id]                      Project overview
/projects/[id]/members              Members CRUD
/projects/[id]/tokens               Tokens CRUD + one-time-display modal
/projects/[id]/items                Browse items (paginated)
/projects/[id]/items/[clid]         Item + version history
/projects/[id]/audit                Filtered audit log
/projects/[id]/stats                Basic charts
/settings                           Admin user mgmt (root only)
```

**Dependency:** requires EPIC-004 (Admin API) deployed and reachable. Requires OpenAPI spec from EPIC-004 to generate typed mcp-client.

## 5. Acceptance Criteria

```gherkin
Feature: Admin UI

  Scenario: First-time GitHub OAuth
    Given the MCP env var CLEARGATE_ADMIN_BOOTSTRAP_GH_USER matches my GitHub handle
    When I visit /login and authorize the GitHub app
    Then I land on / (dashboard)
    And the header shows my GitHub avatar + handle

  Scenario: Non-bootstrap GitHub user rejected
    Given my GitHub handle is not in admin_users
    When I attempt GitHub OAuth
    Then I land on /login with an "not authorized" error
    And no session cookie is set

  Scenario: Create project from UI
    When I click "New project", enter name "Foo", submit
    Then I land on /projects/<pid>
    And the project appears on /

  Scenario: Token issuance shows plaintext modal once
    Given I'm on /projects/<pid>/tokens
    When I click "Issue token", fill name, submit
    Then a modal displays the plaintext token
    And the "Close" button is disabled until I tick "I've saved it"
    And reloading the page shows the token in the list WITHOUT plaintext

  Scenario: Audit log filters
    When I open /projects/<pid>/audit and set tool=push_item, from=7d ago
    Then rows match filters
    And "Next" pagination cursor loads more without duplicates

  Scenario: Stats page loads
    When I open /projects/<pid>/stats?window=30d
    Then a bar chart of requests/day renders within 1 second
    And error rate + top 10 items are shown

  Scenario: Settings root-only
    Given my admin_users row has is_root=false
    When I visit /settings
    Then status is 403 with a "Root admin required" message
```

## 6. AI Interrogation Loop — RESOLVED

All 8 questions resolved 2026-04-17 by Vibe Coder (Q2 **overridden to Chart.js**; all others accept recommendations).

1. **DaisyUI theme** — **Resolved (updated 2026-04-17):** custom `cleargate` theme per [design-guide.md §2.2](../../knowledge/design-guide.md#22-daisyui-theme-cleargate) — warm cream canvas, terracotta primary (`#E85C2F`), slate-blue secondary, bento card layout. Supersedes the earlier pick of stock `corporate`. Theme switcher deferred to v1.1; dark variant (`cleargate-dark`) added then.
2. **Charting library — OVERRIDE:** **Chart.js**. User chose canvas-based Chart.js over SVG-based Chartist. Implication: slightly larger bundle, better interactivity out-of-the-box, easier to customize tooltips and scales.
3. **Session storage** — **Resolved:** custom Redis adapter for `@auth/sveltekit`. Consistent with MCP's Redis — single source of truth for session invalidation.
4. **Admin JWT exchange** — **Resolved:** `POST /admin-api/v1/auth/exchange` with session cookie → returns admin JWT. Cached in memory, refreshed silently by `@auth/sveltekit` middleware.
5. **Mobile responsive** — **Resolved:** usable but not polished. Tables wrap; modals full-screen on < 640px. No dedicated mobile design work.
6. **Empty-states copy** — **Resolved:** actionable. "No projects yet. [Create your first →]" — not passive.
7. **Deployment** — **Resolved:** `@sveltejs/adapter-node` + Node 22 alpine Docker + Coolify at `admin.cleargate.<domain>`. No edge runtime.
8. **Error monitoring** — **Resolved:** pino structured logs to stdout; Coolify captures. No Sentry/Datadog in v1.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)

**Current Status: 🟢 Low Ambiguity — READY (pending EPIC-004 endpoint stubs + OpenAPI)**

Gate requirements:
- [x] PROPOSAL-003 has `approved: true`
- [x] `<agent_context>` block complete
- [x] §6 AI Interrogation Loop resolved
- [x] Charting lib chosen (Chart.js)
- [x] DaisyUI theme chosen (`cleargate` custom theme — see [design-guide.md](../../knowledge/design-guide.md))
- [ ] EPIC-004 endpoints stubbed with types so typed client can compile (implementation-time dep)
- [ ] OpenAPI spec from EPIC-004 available (implementation-time dep)
