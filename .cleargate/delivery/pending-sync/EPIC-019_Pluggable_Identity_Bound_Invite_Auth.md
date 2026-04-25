---
epic_id: EPIC-019
status: Approved
ambiguity: 🟡 Medium
context_source: "conversation 2026-04-25 — direct user intent: bind invite tokens to verified identity; introduce pluggable auth providers; do not lock to GitHub. Proposal step waived per direct-approval pattern (memory: feedback_proposal_gate_waiver)."
owner: sandrinio
target_date: 2026-06-30
created_at: 2026-04-25T00:00:00Z
updated_at: 2026-04-25T00:00:00Z
created_at_version: strategy-phase-pre-init
updated_at_version: strategy-phase-pre-init
server_pushed_at_version: null
cached_gate_result:
  pass: false
  failing_criteria:
    - id: proposal-approved
      detail: "linked file not found: conversation 2026-04-25 — direct user intent: bind invite tokens to verified identity; introduce pluggable auth providers; do not lock to GitHub. Proposal step waived per direct-approval pattern (memory: feedback_proposal_gate_waiver)."
    - id: no-tbds
      detail: 1 occurrence at §10
    - id: affected-files-declared
      detail: section 4 has 0 listed-item (≥1 required)
  last_gate_check: 2026-04-25T00:05:49Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id EPIC-019
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-04-25T00:05:49Z
  sessions: []
---

# EPIC-019: Pluggable Identity-Bound Invite Auth

## 0. AI Coding Agent Handoff

```xml
<agent_context>
  <objective>Replace bearer-only invite redemption with identity-bound redemption pluggable across multiple auth providers (GitHub OAuth, email magic-link, future Google/SSO). Invite URL alone must no longer suffice to mint a member JWT.</objective>
  <architecture_rules>
    <rule>Existing `cleargate admin login` (GitHub device flow at mcp/src/admin-api/auth-device-poll.ts) is the prior-art pattern — extend it, do not duplicate it</rule>
    <rule>Already-redeemed JWTs MUST remain valid; this epic changes the redemption gate, not the post-redemption auth model</rule>
    <rule>Provider-specific code lives behind an `IdentityProvider` interface; `mcp/src/routes/join.ts` MUST NOT branch on provider name</rule>
    <rule>No PII in logs (FLASHCARD 2026-04-18 #cli #plaintext-redact still applies — invite URLs and OAuth codes are secrets)</rule>
    <rule>Schema change adds columns/tables; no destructive drops on `invites` or `members`</rule>
  </architecture_rules>
  <target_files>
    <file path="mcp/src/db/schema.ts" action="modify" />
    <file path="mcp/src/routes/join.ts" action="modify" />
    <file path="mcp/src/admin-api/members.ts" action="modify" />
    <file path="mcp/src/auth/identity/" action="create" />
    <file path="mcp/src/auth/identity/github-provider.ts" action="create" />
    <file path="mcp/src/auth/identity/magic-link-provider.ts" action="create" />
    <file path="cleargate-cli/src/commands/join.ts" action="modify" />
  </target_files>
</agent_context>
```

## 1. Problem & Value

**Why are we doing this?**
Today an invite URL is a pure bearer token — anyone who copies it from Slack, an email screenshot, or shoulder-surfs it can redeem it and become the named member (`mcp/src/routes/join.ts:54` consumes the token without verifying the redeemer's identity). Compounding the risk, the system has no abstraction for *how* identity is established: the existing GitHub device-flow at `mcp/src/admin-api/auth-device-poll.ts` is admin-only and hard-coded. Members onboarding through `cleargate join` cannot prove who they are at all.

**Success Metrics (North Star):**
- 100% of invite redemptions verify identity matching `members.email` before consuming the invite (zero bearer-only redemptions in audit log).
- ≥2 identity providers shipped (GitHub OAuth + email magic-link) by epic close, demonstrating the abstraction is real.
- Adding a third provider (e.g. Google OAuth) takes ≤1 CR with no changes to `join.ts` or schema.

## 2. Scope Boundaries

**✅ IN-SCOPE (Build This)**
- [ ] `IdentityProvider` interface — pluggable contract for `startChallenge`, `completeChallenge`, returns verified `{email, providerSubject}`
- [ ] Identity-bound redemption: `POST /join/:token` requires a fresh identity proof matching `members.email`
- [ ] GitHub OAuth provider implementation (reuses device-flow pattern from admin-login)
- [ ] Email magic-link provider (no third-party identity required — fallback for users without GitHub/Google)
- [ ] CLI `cleargate join` UX update: provider selection (`--auth github|email`), browser/inbox callback handling
- [ ] Schema additions: `identity_proofs` table; `invites.required_provider` (nullable; admin-pinned provider override)
- [ ] Audit-log events: `invite_redeem_attempt` with provider + success/failure
- [ ] Migration of `cleargate admin login` to consume the same `IdentityProvider` interface (de-duplication)

**❌ OUT-OF-SCOPE (Do NOT Build This)**
- SAML / SSO / SCIM (separate epic when first enterprise customer asks)
- MFA on top of OAuth (provider's own MFA suffices; don't reinvent)
- Session management / token refresh changes — JWT model from EPIC-003 stays as-is
- Per-role provider restriction (e.g. "admins must use GitHub") — defer until a real policy need surfaces
- Google OAuth, GitLab OAuth — design for them, do not build them in this epic
- Migrating already-redeemed members to "re-prove" their identity — grandfather them in

## 3. The Reality Check (Context)

| Constraint Type | Limit / Rule |
|---|---|
| Backwards compat | Pre-prod — no live members. Hard cutover at deploy: migration TRUNCATEs any existing rows in `invites` (none in prod yet); admins re-issue invites under the new flow. No grandfather window. |
| Performance | Redemption round-trip ≤5s p95 (OAuth callback round-trip dominates; magic-link is async by nature) |
| Security | Identity proof must be single-use, time-bound (≤10min), bound to a specific `invite.id` — no replay across invites |
| Security | OAuth `state` param + PKCE for code-flow; HMAC-signed nonces for magic-link; no plaintext secrets in audit-log (FLASHCARD #plaintext-redact) |
| Security | If verified identity email ≠ `members.email` → reject with 403, audit-log the attempt, do NOT consume the invite |
| UX | Users without third-party accounts (GitHub/Google) MUST have a path — magic-link covers this; UX is paste-6-digit-code-in-CLI (matches GitHub device-flow shape from `cleargate admin login`) |
| Email infra | Resend via SMTP (`smtp.resend.com:465`, user `resend`, password from env `CLEARGATE_RESEND_API_KEY`); sender `noreply@soula.ge`, display "ClearGate"; SPF/DKIM verified in Resend dashboard against `soula.ge` (deploy-time). Credentials never written to disk; key rotated after testing |

## 4. Technical Grounding (The "Shadow Spec")

**Affected Files:**
- `mcp/src/db/schema.ts:159` — invites table: add `requiredProvider text` (nullable); add new `identity_proofs` table (challenge_id PK, invite_id FK, provider, verified_email, expires_at, consumed_at)
- `mcp/src/routes/join.ts:54` — split into two endpoints: `POST /join/:token/challenge` (start identity proof) + `POST /join/:token/complete` (atomic verify-and-consume)
- `mcp/src/admin-api/members.ts:154` — invite-creation accepts optional `required_provider` ('github'|'email'|null=any-allowed)
- `mcp/src/auth/identity/` — new directory; `provider.ts` interface, `github-provider.ts`, `magic-link-provider.ts`, `registry.ts`
- `mcp/src/admin-api/auth-device-poll.ts` — refactor to consume `IdentityProvider` (de-dup with member onboarding)
- `cleargate-cli/src/commands/join.ts:26` — accept `--auth <provider>`; orchestrate two-step challenge/complete; render OAuth URL or prompt for emailed code
- `cleargate-cli/src/commands/admin-login.ts` — same refactor surface (shared CLI helper for device-flow rendering)

**Data Changes:**
- `invites.required_provider` (text, nullable) — admin-pinned provider for this invite, or NULL = any registered provider acceptable
- new `identity_proofs` table — one row per challenge; one-shot consumption
- new `audit_log.tool` values: `'invite_challenge_start'`, `'invite_challenge_complete'`, `'invite_redeem_reject'`

## 5. Acceptance Criteria

```gherkin
Feature: Identity-bound invite redemption with pluggable providers

  Scenario: User with GitHub account redeems invite
    Given an admin issued an invite for "alice@example.com"
    And alice runs `cleargate join <invite-url> --auth github`
    When alice authorizes the device-flow on GitHub
    And the verified GitHub email matches "alice@example.com"
    Then the invite is consumed
    And a member JWT is minted and seated locally
    And the audit log records "invite_challenge_complete" with provider="github" result="ok"

  Scenario: User without third-party identity uses magic-link
    Given an admin issued an invite for "bob@example.com"
    And bob runs `cleargate join <invite-url> --auth email`
    When the system emails bob a single-use code
    And bob pastes the code into the CLI prompt within 10 minutes
    Then the invite is consumed
    And a member JWT is minted and seated locally

  Scenario: Email mismatch rejection
    Given an admin issued an invite for "alice@example.com"
    And mallory holds the leaked URL
    When mallory completes GitHub OAuth as "mallory@evil.com"
    Then the redemption is rejected with HTTP 403
    And the invite remains unconsumed
    And the audit log records "invite_redeem_reject" reason="email_mismatch"

  Scenario: Bearer-only redemption is refused
    Given the identity-bound feature flag is enabled
    When any client posts to `/join/:token` without a completed challenge
    Then the response is HTTP 400 "identity_proof_required"

  Scenario: Provider pinning honored
    Given an admin issued an invite with required_provider="github"
    When the invitee attempts `--auth email`
    Then the challenge endpoint returns HTTP 400 "provider_not_allowed"

  Scenario: Already-redeemed members keep working
    Given a member redeemed an invite before this epic shipped
    When that member runs any CLI command using their existing JWT
    Then the request authenticates and succeeds (no forced re-proof)
```

## 6. AI Interrogation Loop (Human Input Required)

*All questions resolved 2026-04-25; answers integrated into §2–§4 above. Kept here as a decision record.*

- **Q1: Transactional-email provider?**
  - **Resolved:** Resend via SMTP. Host `smtp.resend.com:465`, user `resend`, password from env `CLEARGATE_RESEND_API_KEY`. Credentials never written to disk; loaded by mailer at boot. Existing key shared in chat must be rotated after testing.
- **Q2: Feature-flag rollout — grandfather or hard cutover?**
  - **Resolved:** Hard cutover. Pre-prod, no live members. Migration TRUNCATEs `invites` (none in prod yet); admins re-issue invites under the new flow post-deploy. No `REQUIRE_IDENTITY_ON_JOIN` env flag needed — identity proof is unconditionally required from day one.
- **Q3: Migrate `cleargate admin login` in this epic, or hold it stable?**
  - **Resolved:** Migrate in this epic (CR-004). User: "doesn't matter" — defaulting to migrate, since de-duplicating the device-flow code beats carrying two implementations.
- **Q4: Magic-link UX — paste-code or clickable-link?**
  - **Resolved:** Paste-6-digit-code in CLI. Reasons: (a) matches existing GitHub device-flow shape from `cleargate admin login` (consistent UX across all providers); (b) works over SSH / headless boxes; (c) scriptable in CI via `--code <code>`; (d) no MCP callback path needed.
- **Q5: `invites.required_provider` default?**
  - **Resolved:** Per-invite override only. Default NULL (any registered provider acceptable). Admin can pin a specific provider when issuing the invite if needed (e.g. `--auth-provider github`). No project-level default — YAGNI until an org-policy use case appears.

---

## Child CRs

This epic decomposes into change requests rather than stories — each CR rewrites a layer of the existing invite/auth machinery:

- [[CR-003]] — Identity-Bound Invite Redemption (substrate: provider interface + redemption gate + schema)
- [[CR-004]] — GitHub OAuth Identity Provider (formalize device-flow as a provider)
- [[CR-005]] — Email Magic-Link Identity Provider (no-third-party fallback)
- [[CR-006]] — CLI `cleargate join` Provider Selection UX

Future CRs (Google OAuth, GitLab, SAML) attach to this epic without new architecture work.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟡 Medium Ambiguity** (was 🔴; downgraded after §6 resolved 2026-04-25)

Requirements to pass to Green (Ready for Coding Agent):
- [x] §6 AI Interrogation Loop resolved (all five questions answered; decisions integrated into §2–§4).
- [x] Magic-link transactional-email provider chosen (Resend SMTP) and credential plan documented (env `CLEARGATE_RESEND_API_KEY`).
- [x] Feature-flag rollout plan documented (hard cutover; pre-prod; no grandfather window).
- [x] All 4 child CRs (CR-003, CR-004, CR-005, CR-006) drafted with `parent_ref: "EPIC-019"`.
- [ ] §4 Technical Grounding contains 100% real, verified file paths *with line numbers* for every modified file (current draft has line numbers for the touched files but no line numbers for newly-created files — acceptable for the substrate CR; tighten before per-CR execution).
- [ ] 0 "TBDs" exist in the document.
- [ ] `approved: true` set in YAML frontmatter (Gate 1 sign-off).
