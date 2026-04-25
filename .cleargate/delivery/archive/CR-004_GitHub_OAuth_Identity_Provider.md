---
cr_id: CR-004
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
  pass: false
  failing_criteria:
    - id: no-tbds
      detail: 1 occurrence at §4
  last_gate_check: 2026-04-25T10:10:42Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id CR-004
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-04-25T00:03:58Z
  sessions: []
---

# CR-004: GitHub OAuth Identity Provider

## 1. The Context Override (Old vs. New)

**Obsolete Logic (What to Remove / Forget):**
- The view that GitHub OAuth is admin-only. Today the device-flow at `mcp/src/admin-api/auth-device-poll.ts` exists solely to authenticate admins via `cleargate admin login`; members have no GitHub path.
- Direct calls into GitHub-specific code from `mcp/src/admin-api/auth-device-poll.ts` (e.g. `https://github.com/login/device/code`, GitHub user-info endpoints) — these become implementation details of the provider, not first-class routes.
- The duplicated device-flow rendering logic between admin-login and any future member-facing flow (don't ship two versions).

**New Logic (The New Truth):**
- A single `GitHubProvider` class implements `IdentityProvider` (the interface from CR-003). It owns: device-code request, polling, GitHub user-email retrieval (with `read:user` + `user:email` scopes), and email-verification confirmation.
- `cleargate admin login` is refactored to consume this provider via the registry — admin-login becomes a thin caller, not a bespoke implementation.
- The same provider serves member redemption: `cleargate join <url> --auth github` walks the same device-flow against the same backend.
- GitHub credentials (`GITHUB_OAUTH_CLIENT_ID`, optional `GITHUB_OAUTH_CLIENT_SECRET` for non-device flows later) live in MCP env, not duplicated across handlers.

## 2. Blast Radius & Invalidation

- [ ] Invalidate/Update Epic: [[EPIC-019]] — proves the IdentityProvider interface is real (not theoretical)
- [ ] Invalidate/Update existing flow: `cleargate admin login` (`mcp/src/admin-api/auth-device-poll.ts`) — this CR migrates it onto the new provider; behaviour MUST stay identical (admin-login UX is a regression-test contract)
- [ ] Invalidate/Update CLI: `cleargate-cli/src/commands/admin-login.ts` only if the response shape from the device-flow endpoints changes (target: keep response shape stable so CLI is unchanged in this CR)
- [ ] Database schema impacts: **No** — uses the `identity_proofs` table from CR-003; no new columns
- [ ] Hard dependency: CR-003 must merge first

## 3. Execution Sandbox

**Modify:**
- `mcp/src/admin-api/auth-device-poll.ts` — replace direct GitHub HTTP calls with `registry.get('github').completeChallenge(...)`; preserve the `/admin/auth/device/poll` route signature
- `mcp/src/admin-api/auth-device-start.ts` (if exists, or wherever device-code is currently requested) — replace with `registry.get('github').startChallenge(...)`
- `mcp/src/auth/identity/registry.ts` — register `GitHubProvider` when `CLEARGATE_IDENTITY_PROVIDERS` includes `github`

**Create:**
- `mcp/src/auth/identity/github-provider.ts`:
  - `class GitHubProvider implements IdentityProvider`
  - `name = 'github'`
  - `startChallenge` → POSTs to `https://github.com/login/device/code`, persists `device_code` (hashed) + `user_code` + `interval` into `identity_proofs.challenge_payload` jsonb; returns `{challengeId, clientHints: {userCode, verificationUri, interval}}`
  - `completeChallenge` → polls `https://github.com/login/oauth/access_token` (or expects CLI to drive polling — TBD); on success, fetches `/user/emails`, picks the **primary verified** email, returns `{verifiedEmail, providerSubject: githubUserId}`
- `mcp/src/auth/identity/github-provider.test.ts` — unit + integration tests against a mocked GitHub API (use `nock` or msw — pattern from existing test files)

**Do NOT modify in this CR (out of sandbox):**
- `mcp/src/routes/join.ts` — already abstracted in CR-003; this CR doesn't touch it
- The CLI side of admin-login or member join (CR-006 owns CLI changes)
- `mcp/src/auth/jwt.ts`, `service-token.ts` — orthogonal
- Magic-link provider (CR-005's sandbox)

## 4. Verification Protocol

**Command/Test:**
```bash
cd mcp && npm test -- src/auth/identity/github-provider.test.ts src/admin-api/auth-device-poll.test.ts
cd mcp && npm run typecheck
```

**Required test scenarios (new + regression):**
- New: `GitHubProvider.startChallenge` → returns valid `challengeId` + `userCode` + `verificationUri`; persists challenge state
- New: `GitHubProvider.completeChallenge` happy path → mocked GitHub returns access token + verified primary email; provider returns `{verifiedEmail, providerSubject}`
- New: `completeChallenge` when GitHub returns no verified email → throws `IdentityProofError` (provider must NEVER return an unverified address; this would defeat the email-match check in CR-003)
- New: `completeChallenge` when GitHub access-token request returns `authorization_pending` → returns null/pending (CLI keeps polling)
- New: `completeChallenge` when GitHub returns `access_denied` → throws specific error → audit-logged as `'invite_redeem_reject'` with reason
- Regression: `cleargate admin login` end-to-end (against staging or mocked GitHub) — must succeed identically to pre-refactor behaviour
- Regression: existing `auth-device-poll.test.ts` passes unchanged after refactor (the route shape is stable)

**Eviction confirmation:**
- Grep `mcp/src/admin-api/` for `github.com` URLs → zero matches (all GitHub HTTP lives in `auth/identity/github-provider.ts`)
- `auth-device-poll.ts` is ≤30 lines (route handler + provider call only — all real logic moved into the provider)

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🔴 High Ambiguity**

Requirements to pass to Green (Ready for Execution):
- [ ] CR-003 merged (hard dependency)
- [ ] Decision: server-side polling vs. CLI-driven polling for the device-flow access-token exchange (current admin-login pattern is CLI-driven — preserve it unless we have a reason to change)
- [ ] GitHub OAuth app credentials path documented (env var names, secret rotation policy)
- [ ] EPIC-019 §6 AI Interrogation question 3 answered ("comfortable migrating admin-login in same epic?")
- [ ] `approved: true` set in YAML frontmatter
