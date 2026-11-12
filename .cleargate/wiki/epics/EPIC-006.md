---
type: epic
id: "EPIC-006"
parent: ""
children: 
  - "[[STORY-006-01]]"
  - "[[STORY-006-02]]"
  - "[[STORY-006-03]]"
  - "[[STORY-006-04]]"
  - "[[STORY-006-05]]"
  - "[[STORY-006-06]]"
  - "[[STORY-006-07]]"
  - "[[STORY-006-08]]"
  - "[[STORY-006-09]]"
  - "[[STORY-006-10]]"
cites: []
cited_by: 
  - "[[EPIC-002]]"
  - "[[SPRINT-27]]"
status: "Completed"
remote_id: ""
raw_path: ".cleargate/delivery/archive/EPIC-006_Admin_UI.md"
last_ingest: "2026-11-12T19:31:58.580Z"
last_ingest_commit: "df788e44cbb85fc71c13016b80799a517cde93db"
repo: "planning"
---

# EPIC-006: Admin UI (SvelteKit)

**Status:** Completed · **Sprint:** none · **Gate:** not run

## Objective
Build the ClearGate Admin web UI — a SvelteKit + DaisyUI + Tailwind app that admins log into via GitHub OAuth to manage projects, members, tokens, and view audit logs + basic stats. Talks exclusively to the MCP's admin API (EPIC-004).

## Problem & Value
**Why are we doing this?**
CLI-only admin is friction. Onboarding a new Vibe Coder, rotating a leaked token, or investigating "who pushed this?" is much faster with a UI. The Admin UI is the operator's daily driver.

**Success Metrics (North Star):**
- First-time admin completes GitHub OAuth + lands on dashboard in under 10 seconds.
- Invite flow: admin fills form → sees copyable invite URL in under 5 seconds.

[+198 bytes not shown — read .cleargate/delivery/archive/EPIC-006_Admin_UI.md]

## Scope
**In:**
- [ ] SvelteKit 2 + Vite scaffold
- [ ] DaisyUI + Tailwind configured
- [ ] `@auth/sveltekit` GitHub OAuth provider
- [ ] Session persistence in Redis (shared with MCP)
- [ ] All 10 routes per PROPOSAL-003 §2.11
- [ ]
**Out:**
- Password-based login (GitHub OAuth only in v1)
- SSO with enterprise IdPs (Okta, Azure AD) — v1.1+
- MFA (rely on GitHub's 2FA) — v1.1+
- Mobile responsive refinement (works on mobile but not optimized)
- Dark/light

[+610 bytes not shown — read .cleargate/delivery/archive/EPIC-006_Admin_UI.md]

## Architecture rules
- No direct database access. Only the admin API.
- GitHub OAuth via @auth/sveltekit is the only login path in v1.
- Sessions stored in Redis (shared with MCP service).
- Admin JWT is short-lived (15 min) — fetched on login, refreshed silently via @auth/sveltekit middleware.
- Token plaintext shown exactly once, in a modal, with explicit "I've saved it" confirmation before dismissal.
- No PII stored beyond what admin API provides.

[+224 bytes not shown — read .cleargate/delivery/archive/EPIC-006_Admin_UI.md]

## Decisions
All 8 questions resolved 2026-04-17 by Vibe Coder (Q2 **overridden to Chart.js**; all others accept recommendations).

1. **DaisyUI theme** — **Resolved (updated 2026-04-17):** custom `cleargate` theme per [design-guide.md §2.2](../../knowledge/design-guide.md#22-daisyui-theme-cleargate) — warm cream canvas, terracotta primary (`#E85C2F`), slate-blue secondary, bento card layout. Supersedes the earlier pick of stock `corporate`.

[+1,180 bytes not shown — read .cleargate/delivery/archive/EPIC-006_Admin_UI.md]

<!-- BEGIN relations -->
## Relations
- Parent: none
- Children (10): [[STORY-006-01]], [[STORY-006-02]], [[STORY-006-03]], [[STORY-006-04]], [[STORY-006-05]], [[STORY-006-06]], [[STORY-006-07]], [[STORY-006-08]], [[STORY-006-09]], [[STORY-006-10]]
- Cited by (2): [[EPIC-002]], [[SPRINT-27]]
<!-- END relations -->
