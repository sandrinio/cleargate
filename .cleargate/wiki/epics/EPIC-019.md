---
type: epic
id: "EPIC-019"
parent: ""
children: 
  - "[[BUG-017]]"
  - "[[BUG-018]]"
  - "[[BUG-019]]"
  - "[[CR-003]]"
  - "[[CR-004]]"
  - "[[CR-005]]"
  - "[[CR-006]]"
  - "[[CR-007]]"
cites: 
  - "[[CR-003]]"
  - "[[CR-004]]"
  - "[[CR-005]]"
  - "[[CR-006]]"
cited_by: 
  - "[[CR-003]]"
  - "[[CR-004]]"
  - "[[CR-005]]"
  - "[[CR-006]]"
status: "Completed"
remote_id: ""
raw_path: ".cleargate/delivery/archive/EPIC-019_Pluggable_Identity_Bound_Invite_Auth.md"
last_ingest: "2026-11-12T21:25:29.802Z"
last_ingest_commit: "08bdacb0657f9a24021eb40ba9b31b7f5379b38a"
repo: "planning"
---

# EPIC-019: Pluggable Identity-Bound Invite Auth

**Status:** Completed · **Sprint:** none · **Gate:** fail: proposal-approved, no-tbds, affected-files-declared

## Objective
Replace bearer-only invite redemption with identity-bound redemption pluggable across multiple auth providers (GitHub OAuth, email magic-link, future Google/SSO). Invite URL alone must no longer suffice to mint a member JWT.

## Problem & Value
**Why are we doing this?**
Today an invite URL is a pure bearer token — anyone who copies it from Slack, an email screenshot, or shoulder-surfs it can redeem it and become the named member (`mcp/src/routes/join.ts:54` consumes the token without verifying the redeemer's identity).

[+670 bytes not shown — read .cleargate/delivery/archive/EPIC-019_Pluggable_Identity_Bound_Invite_Auth.md]

## Scope
**In:**
- [ ] `IdentityProvider` interface — pluggable contract for `startChallenge`, `completeChallenge`, returns verified `{email, providerSubject}`
- [ ] Identity-bound redemption: `POST /join/:token` requires a fresh identity proof
**Out:**
- SAML / SSO / SCIM (separate epic when first enterprise customer asks)
- MFA on top of OAuth (provider's own MFA suffices; don't reinvent)
- Session management / token refresh changes — JWT model from EPIC-003 stays as-is
-

[+926 bytes not shown — read .cleargate/delivery/archive/EPIC-019_Pluggable_Identity_Bound_Invite_Auth.md]

## Architecture rules
- Existing `cleargate admin login` (GitHub device flow at mcp/src/admin-api/auth-device-poll.ts) is the prior-art pattern — extend it, do not duplicate it
- Already-redeemed JWTs MUST remain valid; this epic changes the redemption gate, not the post-redemption auth model
- Provider-specific code lives behind an `IdentityProvider` interface; `mcp/src/routes/join.ts` MUST NOT branch on provider name
- No PII in logs (FLASHCARD 2026-04-18 #cli #plaintext-redact

[+143 bytes not shown — read .cleargate/delivery/archive/EPIC-019_Pluggable_Identity_Bound_Invite_Auth.md]

## Decisions
*All questions resolved 2026-04-25; answers integrated into §2–§4 above. Kept here as a decision record.*

- **Q1: Transactional-email provider?**
  - **Resolved:** Resend via SMTP. Host `smtp.resend.com:465`, user `resend`, password from env `CLEARGATE_RESEND_API_KEY`. Credentials never written to disk; loaded by mailer at boot. Existing key shared in chat must be rotated after testing.

[+1,241 bytes not shown — read .cleargate/delivery/archive/EPIC-019_Pluggable_Identity_Bound_Invite_Auth.md]

<!-- BEGIN relations -->
## Relations
- Parent: none
- Children (8): [[BUG-017]], [[BUG-018]], [[BUG-019]], [[CR-003]], [[CR-004]], [[CR-005]], [[CR-006]], [[CR-007]]
- Cites (4): [[CR-003]], [[CR-004]], [[CR-005]], [[CR-006]]
- Cited by (4): [[CR-003]], [[CR-004]], [[CR-005]], [[CR-006]]
<!-- END relations -->
