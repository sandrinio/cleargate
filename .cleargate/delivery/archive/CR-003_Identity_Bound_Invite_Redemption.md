---
cr_id: CR-003
parent_ref: EPIC-019
status: Completed
approved: true
completed_at: 2026-04-25T13:59:00Z
created_at: 2026-04-25T00:00:00Z
updated_at: 2026-04-25T13:59:00Z
created_at_version: strategy-phase-pre-init
updated_at_version: strategy-phase-pre-init
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-04-25T10:10:39Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id CR-003
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-04-25T00:03:55Z
  sessions: []
---

# CR-003: Identity-Bound Invite Redemption (Substrate)

## 1. The Context Override (Old vs. New)

**Obsolete Logic (What to Remove / Forget):**
- Bearer-only redemption: `POST /join/:token` consumes the invite based purely on possession of the token UUID (`mcp/src/routes/join.ts:54` — single atomic UPDATE on `consumed_at IS NULL AND expires_at > now()`).
- The implicit assumption that `members.email` (set by the admin at invite time) needs no proof at redemption time.
- Any future code branching on provider name inside `join.ts` (forbidden by epic architecture rule).

**New Logic (The New Truth):**
- Redemption is a **two-step ceremony**: (1) `POST /join/:token/challenge { provider }` opens an `identity_proofs` row; (2) `POST /join/:token/complete { challenge_id, proof }` verifies the proof, checks `verified_email == members.email`, and atomically consumes the invite + identity proof in one transaction.
- A new `IdentityProvider` interface (`mcp/src/auth/identity/provider.ts`) abstracts away "how to verify email." `join.ts` calls `registry.get(providerName).verify(proof, challenge)` and never knows about GitHub/email/Google specifics.
- `invites.required_provider` (nullable) lets admins pin a provider per-invite; NULL = any registered provider acceptable.
- A `REQUIRE_IDENTITY_ON_JOIN` env flag controls rollout: `false` keeps legacy bearer behaviour, `true` rejects bearer-only redemptions with HTTP 400.

## 2. Blast Radius & Invalidation

- [ ] Invalidate/Update Epic: [[EPIC-019]] — this CR delivers the substrate the rest depend on; until it merges the other CRs are all 🔴
- [ ] Invalidate/Update existing flow: `cleargate join` (`cleargate-cli/src/commands/join.ts:26`) — single-shot POST becomes two-step orchestration (CR-006 owns the CLI side; this CR provides the server endpoints)
- [ ] Invalidate/Update existing admin flow: `cleargate admin login` (`mcp/src/admin-api/auth-device-poll.ts`) — refactor target for CR-004 (this CR ships the interface; CR-004 migrates admin-login onto it)
- [ ] Database schema impacts: **Yes**
  - `invites` table: add `required_provider text` (nullable)
  - new `identity_proofs` table: `id uuid PK`, `invite_id uuid FK invites(id) ON DELETE CASCADE`, `provider text NOT NULL`, `verified_email text` (NULL until completion), `challenge_payload jsonb` (provider-opaque state — PKCE verifier, magic-link nonce hash, etc.), `created_at timestamptz`, `expires_at timestamptz` (≤10min), `consumed_at timestamptz` (NULL = pending; one-shot)
  - new audit_log tool values: `'invite_challenge_start'`, `'invite_challenge_complete'`, `'invite_redeem_reject'`
  - migration is additive only — no destructive drops; rollback path is `DROP TABLE identity_proofs; ALTER TABLE invites DROP COLUMN required_provider;`

## 3. Execution Sandbox

**Modify:**
- `mcp/src/db/schema.ts` — add `requiredProvider` to `invites` table, add `identityProofs` table export
- `mcp/src/routes/join.ts` — split single endpoint into `POST /join/:token/challenge` and `POST /join/:token/complete`; keep legacy `POST /join/:token` behind feature flag for backwards compat during rollout
- `mcp/src/admin-api/members.ts` — invite-creation `InviteBody` Zod schema accepts optional `required_provider: 'github' | 'email' | null` (default null)

**Create:**
- `mcp/src/auth/identity/provider.ts` — `IdentityProvider` interface:
  ```ts
  export interface IdentityProvider {
    readonly name: string;
    startChallenge(input: { inviteId: string; expectedEmail: string }): Promise<{ challengeId: string; clientHints: Record<string, unknown> }>;
    completeChallenge(input: { challengeId: string; proof: unknown }): Promise<{ verifiedEmail: string; providerSubject: string }>;
  }
  ```
- `mcp/src/auth/identity/registry.ts` — provider registry; reads enabled providers from env (`CLEARGATE_IDENTITY_PROVIDERS=github,email`)
- `mcp/src/auth/identity/index.ts` — barrel export
- `mcp/src/db/migrations/0NNN_identity_proofs.sql` — Drizzle migration

**Do NOT modify in this CR (out of sandbox):**
- `mcp/src/auth/jwt.ts` — JWT model unchanged
- `mcp/src/auth/service-token.ts` — service tokens unaffected
- `cleargate-cli/src/commands/join.ts` — CLI orchestration is CR-006's sandbox
- Any concrete provider impl (CR-004 GitHub, CR-005 magic-link)

## 4. Verification Protocol

**Command/Test:**
```bash
cd mcp && npm test -- src/routes/join.test.ts src/auth/identity/
cd mcp && npm run typecheck
```

**Required test scenarios (new):**
- `POST /join/:token/challenge` with valid token + registered provider → 200, returns `challengeId` + provider hints
- `POST /join/:token/challenge` with `required_provider="github"` invite + `provider="email"` request → 400 `provider_not_allowed`
- `POST /join/:token/complete` with mismatched verified email → 403 `email_mismatch`, invite remains unconsumed, identity_proof remains unconsumed
- `POST /join/:token/complete` happy path → atomic UPDATE on both `invites.consumed_at` and `identity_proofs.consumed_at` in one transaction
- Concurrent double-complete → exactly one succeeds (existing `consumed_at IS NULL` guard pattern, extended to identity_proofs)
- `REQUIRE_IDENTITY_ON_JOIN=true` + legacy `POST /join/:token` → 400 `identity_proof_required`
- `REQUIRE_IDENTITY_ON_JOIN=false` (default during rollout) + legacy `POST /join/:token` → still works (audit-logged with `legacy=true`)
- Audit log entries written for all three new event types with redacted payloads (no plaintext nonces; FLASHCARD #plaintext-redact)
- Identity-proof TTL (10min) honored — expired challenge returns 410 `challenge_expired`

**Eviction confirmation:**
- Grep for `consumed_at IS NULL` in `routes/join.ts` returns matches only inside the *new* atomic transaction (no naked legacy path when feature flag is on)
- No new code in `join.ts` references "github", "email", or any other provider name (confirms abstraction is real)

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🔴 High Ambiguity**

Requirements to pass to Green (Ready for Execution):
- [ ] EPIC-019 §6 AI Interrogation answers integrated (specifically: feature-flag rollout policy)
- [ ] Migration file numbered (next sequential after current head)
- [ ] Identity-proof TTL confirmed (10min default, configurable via env?)
- [ ] Audit-log payload redaction strategy reviewed against FLASHCARD 2026-04-18 #plaintext-redact
- [ ] `approved: true` set in YAML frontmatter
