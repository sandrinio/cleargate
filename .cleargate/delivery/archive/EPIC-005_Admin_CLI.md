---
epic_id: EPIC-005
status: Completed
ambiguity: 🟢 Low
context_source: PROPOSAL-003_MCP_Adapter.md
owner: Vibe Coder (ssuladze@exadel.com)
target_date: 2026-04-18
completed_in_sprint: SPRINT-03
completed_at: 2026-04-18T17:30:00Z
completion_notes: All 5 stories shipped in SPRINT-03. `cleargate-admin login` (OAuth device flow) deferred to SPRINT-04 as a closeout item.
created_at: 2026-04-17T00:00:00Z
updated_at: 2026-04-18T18:00:00Z
created_at_version: strategy-phase-pre-init
updated_at_version: strategy-phase-pre-init
resolved_at: 2026-04-17T00:00:00Z
resolved_by: Vibe Coder (ssuladze@exadel.com)
approved: true
pushed_by: sandrinio@github.local
pushed_at: 2026-04-20T19:43:08.587Z
push_version: 3
children:
  - "[[STORY-005-01]]"
  - "[[STORY-005-02]]"
  - "[[STORY-005-03]]"
  - "[[STORY-005-04]]"
  - "[[STORY-005-05]]"
  - "[[STORY-005-06]]"
---

# EPIC-005: Admin CLI + Client Bootstrap

## 0. AI Coding Agent Handoff

```xml
<agent_context>
  <objective>Ship two CLIs: (a) cleargate-admin — headless administrative ops run by a root admin against an MCP instance (create-project, invite, issue-token, revoke-token); (b) cleargate join — the client-side onboarding flow that a Vibe Coder runs locally to exchange an invite token for a long-lived refresh token stored in the OS keychain.</objective>
  <architecture_rules>
    <rule>cleargate-admin lives in mcp/scripts/ — ships with the MCP service; operator runs it against the MCP URL with an admin JWT.</rule>
    <rule>cleargate join lives in cleargate-cli/ — a separate npm package that Vibe Coders install globally.</rule>
    <rule>Refresh tokens stored in OS keychain via keytar (or equivalent); file fallback is ~/.cleargate/auth.json with chmod 600.</rule>
    <rule>Invite tokens are one-time-use, short-lived (24h), and bound to project_id + email.</rule>
    <rule>Both CLIs call the Admin API (EPIC-004) for state-changing operations — never write to the DB directly.</rule>
  </architecture_rules>
  <target_files>
    <file path="mcp/scripts/cleargate-admin.ts" action="create" />
    <file path="mcp/scripts/commands/create-project.ts" action="create" />
    <file path="mcp/scripts/commands/invite.ts" action="create" />
    <file path="mcp/scripts/commands/issue-token.ts" action="create" />
    <file path="mcp/scripts/commands/revoke-token.ts" action="create" />
    <file path="cleargate-cli/package.json" action="create" />
    <file path="cleargate-cli/src/cli.ts" action="create" />
    <file path="cleargate-cli/src/commands/join.ts" action="create" />
    <file path="cleargate-cli/src/auth/token-store.ts" action="create" />
  </target_files>
</agent_context>
```

## 1. Problem & Value

**Why are we doing this?**
Admin UI won't cover every workflow — CI scripts, bulk ops, and onboarding scenarios need a CLI. Vibe Coders also need a frictionless "paste your invite token and get going" flow that handles secure local storage of the refresh token.

**Success Metrics (North Star):**
- A root admin with an admin JWT can run `cleargate-admin create-project "X"` against a deployed MCP and see it in the Admin UI immediately.
- A Vibe Coder with an invite URL runs `cleargate join <url>` once; subsequent MCP calls from their machine authenticate without re-prompting.
- Keychain storage works on macOS (Keychain) and Linux (libsecret) with graceful fallback to file on systems without either.

## 2. Scope Boundaries

**✅ IN-SCOPE**
- [ ] `mcp/scripts/cleargate-admin.ts` — subcommands: `create-project`, `invite`, `issue-token`, `revoke-token`, `list-projects`, `list-tokens`
- [ ] Argument parsing (Commander or similar minimal lib)
- [ ] Reads admin JWT from `CLEARGATE_ADMIN_TOKEN` env var or `~/.cleargate/admin-auth.json`
- [ ] `cleargate-cli/` package scaffold (shared dep with EPIC-001/002/future CLI commands)
- [ ] `cleargate join <invite-url>` — POSTs invite token to MCP, receives refresh token, stores in keychain
- [ ] Keychain integration via `keytar` (or `@napi-rs/keyring` if keytar has build issues in 2026)
- [ ] File fallback when keychain unavailable — `~/.cleargate/auth.json` chmod 600
- [ ] Access token auto-refresh when expired (called by other `cleargate-cli` commands)

**❌ OUT-OF-SCOPE (deferred)**
- `cleargate push`, `cleargate pull`, `cleargate list` — future Epics (not in v1 scope at all; Claude Code uses the MCP directly)
- Non-interactive invite flow (e.g., SAML / SSO)
- Token rotation automation

## 3. The Reality Check (Context)

| Constraint | Rule |
|---|---|
| Token security | Never print refresh tokens to stdout after `join`. Confirm with "Token stored in keychain." |
| Invite TTL | 24 hours, one-time-use. After use or expiry, token invalid. |
| Keychain availability | macOS: native Keychain. Linux: libsecret via D-Bus (gnome-keyring, KWallet). Both optional — file fallback must work. |
| Admin JWT source | env var or `~/.cleargate/admin-auth.json`. Never accept admin JWT on command line (shell history leak). |
| Exit codes | 0 = success, 1 = user error, 2 = network error, 3 = auth error. Scripts can detect. |
| Dependency | Entire Epic depends on EPIC-004 (Admin API) reaching 🟢. |

## 4. Technical Grounding

**`cleargate-admin` usage:**
```bash
export CLEARGATE_MCP_URL=https://mcp.cleargate.example.com
export CLEARGATE_ADMIN_TOKEN=<admin-jwt>

cleargate-admin create-project --name "ClearGate Core"
# → project_id: <uuid>

cleargate-admin invite --project <pid> --email vibe@example.com --role user
# → invite URL: https://mcp.cleargate.example.com/join/<opaque-token>

cleargate-admin issue-token --project <pid> --member-id <mid> --name "chyro-prod"
# → token plaintext shown once, save now
```

**`cleargate join` usage:**
```bash
cleargate join https://mcp.cleargate.example.com/join/<opaque-token>
# → [cleargate] invitation validated for project "ClearGate Core"
# → [cleargate] refresh token stored in macOS Keychain
# → [cleargate] you're good to go

# Later, Claude Code or any cleargate-cli command uses the stored token:
cleargate whoami
# → user@example.com · project "ClearGate Core" · machine "macbook-pro-bohdan"
```

**Token store interface:**
```typescript
// cleargate-cli/src/auth/token-store.ts
export interface TokenStore {
  save(profile: string, refreshToken: string): Promise<void>;
  load(profile: string): Promise<string | null>;
  remove(profile: string): Promise<void>;
}
// Implementations: KeychainTokenStore, FileTokenStore
// Factory picks keychain first, falls back to file with a warning
```

## 5. Acceptance Criteria

```gherkin
Feature: Admin CLI + Client Bootstrap

  Scenario: Create project via CLI
    Given an admin JWT in CLEARGATE_ADMIN_TOKEN
    When I run cleargate-admin create-project --name "X"
    Then stdout contains project_id=<uuid>
    And GET /admin-api/v1/projects includes that project

  Scenario: Issue token shows plaintext once
    When I run cleargate-admin issue-token --project <pid> --member-id <mid> --name "bot"
    Then stdout contains the plaintext token
    And running cleargate-admin list-tokens --project <pid> shows the token by name but not the plaintext

  Scenario: Vibe Coder join stores in keychain
    Given a valid invite URL
    When I run cleargate join <url> on macOS
    Then stderr contains "refresh token stored in macOS Keychain"
    And the OS Keychain contains an entry under service "cleargate"

  Scenario: Join falls back to file on headless Linux
    Given a Linux environment without a secret service
    When I run cleargate join <url>
    Then ~/.cleargate/auth.json exists with mode 600
    And stderr contains "keychain unavailable, using file fallback"

  Scenario: Expired invite rejected
    Given an invite URL issued 25 hours ago
    When cleargate join runs
    Then exit code is 3 (auth error)
    And stderr contains "invite expired"

  Scenario: Second join on same machine replaces previous token
    Given a stored refresh token for project P
    When cleargate join runs for project Q
    Then the stored token for profile "default" is Q's token
    And P's token is removed from keychain
```

## 6. AI Interrogation Loop — RESOLVED

All 7 questions resolved 2026-04-17 by Vibe Coder (Q6 refined; accept all other recommendations).

1. **Multi-project profiles** — **Resolved:** support `--profile` flag, default `"default"`. Low cost, future-proof.
2. **Admin JWT on admin's machine** — **Resolved:** `cleargate-admin login` subcommand exchanges GitHub OAuth device flow → admin JWT → keychain under profile `"admin"`. No env-var management.
3. **Keychain library** — **Resolved:** verify at implementation time via WebSearch current community consensus. Target: prebuilt binaries for Node 22 on macOS + Linux.
4. **Invite token format** — **Resolved:** opaque random UUID (not JWT). Stored in DB with `expires_at` (24h) and `consumed_at`. Simpler than signed JWT, easier to revoke.
5. **Invite redemption endpoint** — **Resolved:** public `POST /join/:invite_token` on MCP (no auth). Returns refresh token on success, 404/410 on invalid/expired.
6. **Distribution — REFINED:** support **three modes**, not just global:
   - `npx @cleargate/cli@latest join <url>` — one-off onboarding, no install.
   - `npm i -D @cleargate/cli` per project — for repeated commands like `stamp`, `wiki ingest`. Version pinned per repo.
   - `npm i -g @cleargate/cli` — power users who want `cleargate` on PATH.
   - **Docs default to `npx` for `join`; local devDep for project commands.** Global is secondary.
7. **Cross-Epic dependencies** — **Resolved:** requires EPIC-004 🟢. Shares `cleargate-cli/` scaffold with EPIC-001, EPIC-002 via prerequisite **EPIC-000: CLI package scaffold**.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)

**Current Status: 🟢 Low Ambiguity — READY (pending EPIC-004 🟢 + EPIC-000 scaffold)**

Gate requirements:
- [x] PROPOSAL-003 has `approved: true`
- [x] `<agent_context>` block complete
- [x] §6 AI Interrogation Loop resolved
- [x] Distribution model locked (npx + local devDep + global)
- [ ] EPIC-004 (Admin API) reached 🟢 (implementation-time dependency)
- [ ] EPIC-000 (cleargate-cli scaffold) completed (implementation-time dependency)
- [ ] Keychain library verified to build on target platforms (implementation-time check)
