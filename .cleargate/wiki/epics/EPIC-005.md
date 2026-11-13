---
type: epic
id: "EPIC-005"
parent: ""
children: 
  - "[[STORY-005-01]]"
  - "[[STORY-005-02]]"
  - "[[STORY-005-03]]"
  - "[[STORY-005-04]]"
  - "[[STORY-005-05]]"
  - "[[STORY-005-06]]"
cites: []
cited_by: 
  - "[[EPIC-002]]"
status: "Completed"
remote_id: ""
raw_path: ".cleargate/delivery/archive/EPIC-005_Admin_CLI.md"
last_ingest: "2026-11-13T01:02:08.963Z"
last_ingest_commit: "2691d20a51eb6e8211a9ec862c0ec0ddf8c09601"
repo: "planning"
---

# EPIC-005: Admin CLI + Client Bootstrap

**Status:** Completed · **Sprint:** none · **Gate:** not run

## Objective
Ship two CLIs: (a) cleargate-admin — headless administrative ops run by a root admin against an MCP instance (create-project, invite, issue-token, revoke-token); (b) cleargate join — the client-side onboarding flow that a Vibe Coder runs locally to exchange an invite token for a long-lived refresh token stored in the OS keychain.

## Problem & Value
**Why are we doing this?**
Admin UI won't cover every workflow — CI scripts, bulk ops, and onboarding scenarios need a CLI. Vibe Coders also need a frictionless "paste your invite token and get going" flow that handles secure local storage of the refresh token.

[+444 bytes not shown — read .cleargate/delivery/archive/EPIC-005_Admin_CLI.md]

## Scope
**In:**
- [ ] `mcp/scripts/cleargate-admin.ts` — subcommands: `create-project`, `invite`, `issue-token`, `revoke-token`, `list-projects`, `list-tokens`
- [ ] Argument parsing (Commander or similar minimal lib)
- [ ] Reads admin JWT from `CLEARGATE_ADMIN_TOKEN` env var or
**Out:**
- `cleargate push`, `cleargate pull`, `cleargate list` — future Epics (not in v1 scope at all; Claude Code uses the MCP directly)
- Non-interactive invite flow (e.g., SAML / SSO)
- Token rotation automation

[+504 bytes not shown — read .cleargate/delivery/archive/EPIC-005_Admin_CLI.md]

## Architecture rules
- cleargate-admin lives in mcp/scripts/ — ships with the MCP service; operator runs it against the MCP URL with an admin JWT.
- cleargate join lives in cleargate-cli/ — a separate npm package that Vibe Coders install globally.
- Refresh tokens stored in OS keychain via keytar (or equivalent); file fallback is ~/.cleargate/auth.json with chmod 600.
- Invite tokens are one-time-use, short-lived (24h), and bound to project_id + email.
- Both CLIs call the Admin API (EPIC-004) for state-changing operations — never write to the DB directly.

## Decisions
All 7 questions resolved 2026-04-17 by Vibe Coder (Q6 refined; accept all other recommendations).

1. **Multi-project profiles** — **Resolved:** support `--profile` flag, default `"default"`. Low cost, future-proof.
2. **Admin JWT on admin's machine** — **Resolved:** `cleargate-admin login` subcommand exchanges GitHub OAuth device flow → admin JWT → keychain under profile `"admin"`. No env-var management.
3.

[+1,145 bytes not shown — read .cleargate/delivery/archive/EPIC-005_Admin_CLI.md]

<!-- BEGIN relations -->
## Relations
- Parent: none
- Children (6): [[STORY-005-01]], [[STORY-005-02]], [[STORY-005-03]], [[STORY-005-04]], [[STORY-005-05]], [[STORY-005-06]]
- Cited by (1): [[EPIC-002]]
<!-- END relations -->
