---
type: epic
id: "EPIC-011"
parent: ""
children: 
  - "[[STORY-011-01]]"
  - "[[STORY-011-02]]"
  - "[[STORY-011-03]]"
  - "[[STORY-011-04]]"
cites: []
cited_by: []
status: "Completed"
remote_id: ""
raw_path: ".cleargate/delivery/archive/EPIC-011_End_To_End_Production_Readiness.md"
last_ingest: "2026-11-12T19:31:58.580Z"
last_ingest_commit: "2691d20a51eb6e8211a9ec862c0ec0ddf8c09601"
repo: "planning"
sprint_cleargate_id: "SPRINT-06"
---

# EPIC-011: End-to-End Production Readiness (Auth + Bootstrap + Deploy)

**Status:** Completed · **Sprint:** SPRINT-06 · **Gate:** pass

## Objective
Close the four remaining blockers that prevent a brand-new real user from successfully onboarding onto a deployed ClearGate instance: (1) CLI commands must use the refresh-token-in-keychain that `cleargate join` produces (not a pasted env JWT); (2) Admin-UI-issued project service tokens must authenticate against MCP (currently stored but never verified); (3) first-root-admin seeding must

[+294 bytes not shown — read .cleargate/delivery/archive/EPIC-011_End_To_End_Production_Readiness.md]

## Problem & Value
**Why are we doing this?**
SPRINT-06 shipped all 13 Admin UI stories + post-sprint hotfixes, and SPRINT-07 shipped the Multi-Participant MCP Sync layer. Both sprints passed QA, 262 admin tests and 248 MCP tests are green, and the UI renders cleanly in the browser.

[+1,830 bytes not shown — read .cleargate/delivery/archive/EPIC-011_End_To_End_Production_Readiness.md]

## Scope
**In:**
- [ ] **Story 1: Wire `acquireAccessToken` into all CLI commands.** Sync, pull, push, sync-log, conflicts, mcp-client.
**Out:**
- Email / magic-link / password login (deferred by 2026-04-20 triage — GitHub-only in v1).
- SSO / SAML / OIDC via Okta / Azure AD / Google (v1.1+).

[+2,270 bytes not shown — read .cleargate/delivery/archive/EPIC-011_End_To_End_Production_Readiness.md]

## Architecture rules
- Reuse existing JWT issuance (`mcp/src/auth/jwt.ts`) and token store (`cleargate-cli/src/auth/factory.ts`) — do not introduce a second auth path.
- Service-token middleware verifies `Authorization: Bearer <plaintext>` via bcrypt-compare against `tokens.token_hash`; on match, issues a short-lived access JWT with `role: 'user'` and the matched member's project_id.

[+964 bytes not shown — read .cleargate/delivery/archive/EPIC-011_End_To_End_Production_Readiness.md]

## Decisions
*All scope-level questions were resolved 2026-04-20 via chat triage with Vibe Coder (sandro.suladze@gmail.com). Summary:*

1. **Why skip the Proposal gate?** — User explicitly triaged this Epic directly from a chat conversation reviewing post-SPRINT-06 gaps. Context is the SPRINT-06 REPORT.md carry-forward section + live hot-debugging session that surfaced the four concrete blockers.

[+1,944 bytes not shown — read .cleargate/delivery/archive/EPIC-011_End_To_End_Production_Readiness.md]

<!-- BEGIN relations -->
## Relations
- Parent: none
- Children (4): [[STORY-011-01]], [[STORY-011-02]], [[STORY-011-03]], [[STORY-011-04]]
<!-- END relations -->
