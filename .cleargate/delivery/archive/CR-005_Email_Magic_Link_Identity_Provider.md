---
cr_id: CR-005
parent_ref: EPIC-019
parent_cleargate_id: "EPIC-019"
status: Completed
approved: true
completed_at: 2026-04-25T13:59:00Z
created_at: 2026-04-25T00:00:00Z
updated_at: 2026-04-25T13:59:00Z
created_at_version: strategy-phase-pre-init
updated_at_version: strategy-phase-pre-init
server_pushed_at_version: null
cached_gate_result:
  pass: false
  failing_criteria:
    - id: no-tbds
      detail: 3 occurrences at §2, §4
  last_gate_check: 2026-04-25T10:10:43Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id CR-005
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-04-25T00:05:38Z
  sessions: []
---

# CR-005: Email Magic-Link Identity Provider

## 1. The Context Override (Old vs. New)

**Obsolete Logic (What to Remove / Forget):**
- The implicit assumption that every invitee has a third-party identity (GitHub, Google). Some users — non-engineers, contractors, stakeholders pulled in for one sprint — won't.
- The notion that "real" auth requires an OAuth provider. A signed, time-bound, single-use email code IS proof of email ownership; that's the only claim we need (the email-match check in CR-003 is the actual security boundary).

**New Logic (The New Truth):**
- A second `IdentityProvider` implementation: `MagicLinkProvider`. Same interface as `GitHubProvider` (CR-004); zero changes to `routes/join.ts`.
- `startChallenge` generates a high-entropy code (e.g. 32 hex chars, or a 6-digit human-pasteable code paired with a longer hidden nonce — TBD §6 EPIC-019 question 4), HMAC-signs it, sends it to `members.email` via the project's transactional-email infra, persists the **hash only** in `identity_proofs.challenge_payload`.
- `completeChallenge` accepts the user-submitted code, hashes it, constant-time-compares against the stored hash; on match, returns `{verifiedEmail: members.email, providerSubject: 'magic-link:' + members.email}`.
- The provider self-attests the verified email is the same email the code was sent to — no external IdP involved.
- This is the **default fallback**: when an invite has `required_provider IS NULL` and the CLI is invoked without `--auth`, magic-link is the safest choice (works for everyone).

## 2. Blast Radius & Invalidation

- [ ] Invalidate/Update Epic: [[EPIC-019]] — fulfills the "user might not have a token" requirement (no third-party identity required)
- [ ] Invalidate/Update CR-003: no — magic-link slots in as a registered provider with no schema or route changes
- [ ] Database schema impacts: **No** — reuses `identity_proofs` from CR-003
- [ ] **External infra dependency: transactional-email provider must be selected** (EPIC-019 §6 Q1 — SES / Postmark / Resend / project's existing solution)
- [ ] Hard dependency: CR-003 must merge first
- [ ] Soft dependency: CR-006 should ship together so users have a CLI surface for `--auth email`

## 3. Execution Sandbox

**Modify:**
- `mcp/src/auth/identity/registry.ts` — register `MagicLinkProvider` when `CLEARGATE_IDENTITY_PROVIDERS` includes `email`

**Create:**
- `mcp/src/auth/identity/magic-link-provider.ts`:
  - `class MagicLinkProvider implements IdentityProvider`
  - `name = 'email'`
  - `startChallenge({inviteId, expectedEmail})`:
    - Generate raw code (entropy: 256 bits backing, presented as either a 6-digit OTP + signed cookie, OR a single 32-char code — TBD)
    - Hash with `crypto.createHash('sha256')` — store hash only
    - Send email to `expectedEmail` via mailer abstraction
    - Persist challenge row with `expires_at = now() + 10min`
    - Return `{challengeId, clientHints: {sentTo: maskedEmail}}` (mask: `a***@example.com`)
  - `completeChallenge({challengeId, proof: {code}})`:
    - Look up challenge by id; verify not expired, not consumed
    - Hash submitted code; `crypto.timingSafeEqual` against stored hash
    - On match: return `{verifiedEmail: expectedEmail, providerSubject: 'magic-link:' + expectedEmail}`
    - On mismatch: increment a per-challenge attempt counter; lock after 5 failures (return 429)
- `mcp/src/auth/identity/magic-link-provider.test.ts` — unit tests
- `mcp/src/auth/identity/mailer.ts` — minimal abstraction `interface Mailer { send(to, subject, body): Promise<void> }`; one concrete impl per chosen provider; chosen provider TBD pending §6 Q1

**Email body template:**
- Plain-text + HTML; subject: `Your ClearGate invitation code`
- Body lists the project name, the role, the code, expiry time, sender (admin display name)
- No tracking pixels; no marketing copy; the link/code is the entire content

**Do NOT modify in this CR:**
- `mcp/src/routes/join.ts` — already provider-agnostic from CR-003
- CLI (CR-006's sandbox)
- GitHub provider (CR-004's sandbox)

## 4. Verification Protocol

**Command/Test:**
```bash
cd mcp && npm test -- src/auth/identity/magic-link-provider.test.ts
cd mcp && npm run typecheck
```

**Required test scenarios (new):**
- `startChallenge` → mailer.send called once with the right `to` address; challenge row persisted with hashed code; raw code never logged or returned
- `completeChallenge` happy path → returns `{verifiedEmail, providerSubject}`; consumes challenge atomically
- `completeChallenge` wrong code → 401; attempt counter increments; challenge stays open until threshold
- `completeChallenge` wrong code 5× → 429 `too_many_attempts`; challenge marked consumed (locked) so further attempts fast-fail
- `completeChallenge` after `expires_at` → 410 `challenge_expired`
- Concurrent `completeChallenge` with valid code → exactly one wins (atomic UPDATE on `consumed_at IS NULL`)
- Email-injection guard: `members.email` containing `\r\n` characters is rejected at challenge-start (defence against header injection in mailer)
- FLASHCARD #plaintext-redact: grep test for any `console.log` / structured-log entry containing the raw code → zero matches
- Mailer failure (transient) → challenge row rolled back; CLI sees a retryable error

**Eviction confirmation:**
- The challenge_payload jsonb stores ONLY the hash + masked email + attempt counter — never the plaintext code
- No file outside `auth/identity/` references the mailer (clean abstraction boundary)

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟡 Medium Ambiguity** (was 🔴; downgraded after EPIC-019 §6 resolved 2026-04-25)

**Resolved decisions (anchor for execution):**
- **Mailer:** Resend via SMTP — host `smtp.resend.com:465`, user `resend`, password from env `CLEARGATE_RESEND_API_KEY` (loaded at MCP boot; never persisted). Use `nodemailer` with `secure: true` (TLS-on-connect at 465).
- **UX:** 6-digit numeric code, paste into CLI prompt (`--code <code>` for non-interactive). Backed by a longer signed nonce in the URL/jsonb, but user-visible surface is just the 6-digit OTP.
- **Attempt cap:** 5 wrong-code attempts → 429, challenge locked. 10min TTL.
- **Sender domain:** `noreply@soula.ge`, display name "ClearGate". Domain verification (SPF / DKIM / Return-Path) configured in Resend dashboard against `soula.ge` as a deploy task; not blocking the code.

Requirements to pass to Green (Ready for Execution):
- [ ] CR-003 merged (hard dependency)
- [x] EPIC-019 §6 Q1 answered: Resend SMTP
- [x] EPIC-019 §6 Q4 answered: 6-digit paste-in-CLI
- [x] Mailer credential storage decided: env var `CLEARGATE_RESEND_API_KEY` (matches existing MCP env-var convention)
- [x] Per-challenge attempt-cap confirmed: 5 attempts, 10min window
- [ ] Resend sender-domain verified in Resend dashboard (deploy-time task; not blocking the code)
- [ ] Email template copy reviewed (draft template lives in this CR §3; final wording approval before merge)
- [ ] `approved: true` set in YAML frontmatter
