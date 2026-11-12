---
type: epic
id: "EPIC-021"
parent: ""
children: 
  - "[[BUG-031]]"
  - "[[BUG-032]]"
  - "[[BUG-040]]"
  - "[[CR-011]]"
  - "[[CR-068]]"
  - "[[CR-069]]"
  - "[[CR-070]]"
  - "[[CR-071]]"
  - "[[CR-072]]"
  - "[[CR-073]]"
cites: []
cited_by: []
status: "Completed"
remote_id: ""
raw_path: ".cleargate/delivery/archive/EPIC-021_Solo_Onboarding_DX.md"
last_ingest: "2026-11-12T20:33:09.611Z"
last_ingest_commit: "5f8134f8b1ea5ad975d5687114fbf0f84ca1f53e"
repo: "planning"
---

# EPIC-021: Token-First Onboarding — Single-Command Join, OAuth Opt-In

**Status:** Completed · **Sprint:** none · **Gate:** pass

## Objective
Make token-based bearer auth the default and only required path for joining a ClearGate workspace from the CLI. The admin panel issues a token; the invitee pastes one command in their terminal; sync works. GitHub OAuth becomes opt-in via --auth github, not the front door.

## Problem & Value
**Why are we doing this?**

On 2026-04-25 a real user attempted to configure ClearGate at `/Users/ssuladze/Documents/Dev/SlaXadeL` and surfaced a fundamental UX failure: the documented "easy" path required a five-step bootstrap involving a GitHub OAuth device flow, two distinct CLI subcommand groups (`admin` vs root), and an undocumented split between `~/.cleargate/` (CLI identity) and `<repo>/.cleargate/` (planning scaffold).

[+2,620 bytes not shown — read .cleargate/delivery/archive/EPIC-021_Solo_Onboarding_DX.md]

## Scope
**In:**
- [ ] Token-first `cleargate join <url>` redemption that requires no `--auth` flag and no browser. Bare invocation = bearer token redemption against `https://<mcp-host>/join/<opaque-id>`.
- [ ] Token URL shape: `https://<mcp-host>/join/<opaque-id>` (server lookup, JWT never in clipboard or shell history).
**Out:**
- Removing or deprecating GitHub OAuth. Stays as `--auth github` opt-in. EPIC-019's identity-bound invite work is preserved verbatim.
- Renaming `~/.cleargate/` on disk. Documentation fix is the v1 mitigation; on-disk rename is a future migration story if revisited.
- Building a fresh admin UI from scratch.

[+4,760 bytes not shown — read .cleargate/delivery/archive/EPIC-021_Solo_Onboarding_DX.md]

## Architecture rules
- Reuse existing primitives. The MCP already implements token + invite mint/redeem at mcp/src/admin-api/{tokens,invites}.ts and bearer validation at mcp/src/auth/service-token.ts. No new auth primitives.
- Backwards compatibility is mandatory. Existing OAuth-redeemed ~/.cleargate/auth.json files MUST continue to push without re-issuance.
- OAuth (EPIC-019 device-flow) is preserved as opt-in via "cleargate join &lt;url&gt; --auth github". The endpoints in mcp/src/admin-api/auth-device-{start,poll}.ts stay live and untouched.
- Token-first is the default for the bare "cleargate join &lt;url&gt;" call — no flag required.

[+961 bytes not shown — read .cleargate/delivery/archive/EPIC-021_Solo_Onboarding_DX.md]

## Decisions
§6 is empty. No outstanding questions. Epic is 🟢.

<!-- BEGIN relations -->
## Relations
- Parent: none
- Children (10): [[BUG-031]], [[BUG-032]], [[BUG-040]], [[CR-011]], [[CR-068]], [[CR-069]], [[CR-070]], [[CR-071]], [[CR-072]], [[CR-073]]
<!-- END relations -->
