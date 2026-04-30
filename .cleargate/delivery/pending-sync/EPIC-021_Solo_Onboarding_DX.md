---
epic_id: EPIC-021
status: Ready
ambiguity: 🟢 Low
context_source: User direct request 2026-04-25 — proposal gate waived (sharp intent + inline references). Architectural pivot 2026-04-25 from solo-OAuth-patches to token-first onboarding after user pushback on GitHub binding. All 8 §6 AI Interrogation questions ratified by user 2026-04-25 with AI recommendations accepted verbatim. Token primitives confirmed already present in mcp/src/admin-api/{tokens,invites}.ts and mcp/src/auth/service-token.ts.
owner: sandrinio
target_date: 2026-05-09
created_at: 2026-04-25T00:00:00Z
updated_at: 2026-04-25T00:00:00Z
created_at_version: strategy-phase-pre-init
updated_at_version: strategy-phase-pre-init
server_pushed_at_version: null
cached_gate_result:
  pass: false
  failing_criteria:
    - id: proposal-approved
      detail: context_source is prose but no proposal_gate_waiver (approved_by + approved_at) found in frontmatter
    - id: affected-files-declared
      detail: section 4 has 0 listed-item (≥1 required)
  last_gate_check: 2026-04-26T15:34:58Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id EPIC-021
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-04-25T17:26:44Z
  sessions: []
---

# EPIC-021: Token-First Onboarding — Single-Command Join, OAuth Opt-In

## 0. AI Coding Agent Handoff

```xml
<agent_context>
  <objective>Make token-based bearer auth the default and only required path for joining a ClearGate workspace from the CLI. The admin panel issues a token; the invitee pastes one command in their terminal; sync works. GitHub OAuth becomes opt-in via --auth github, not the front door.</objective>
  <architecture_rules>
    <rule>Reuse existing primitives. The MCP already implements token + invite mint/redeem at mcp/src/admin-api/{tokens,invites}.ts and bearer validation at mcp/src/auth/service-token.ts. No new auth primitives.</rule>
    <rule>Backwards compatibility is mandatory. Existing OAuth-redeemed ~/.cleargate/auth.json files MUST continue to push without re-issuance.</rule>
    <rule>OAuth (EPIC-019 device-flow) is preserved as opt-in via "cleargate join &lt;url&gt; --auth github". The endpoints in mcp/src/admin-api/auth-device-{start,poll}.ts stay live and untouched.</rule>
    <rule>Token-first is the default for the bare "cleargate join &lt;url&gt;" call — no flag required.</rule>
    <rule>Default token TTL is 30 days, per-project overridable via projects.default_token_ttl_seconds, per-token overridable via --ttl on issue-token.</rule>
    <rule>Default invite tokens are single-use. Admins may opt into reusable tokens via --reusable or fixed-cohort via --max-uses N.</rule>
    <rule>Token URL form is https://&lt;mcp-host&gt;/join/&lt;opaque-id&gt;. The JWT itself never appears in the URL, clipboard, or shell history. Server lookup resolves opaque-id to JWT at redemption time.</rule>
    <rule>Server-side identity model unchanged: admin_users, projects, members, invites tables stay as-is. Tokens map to a member record at issue time; "who pushed" attribution flows from token → member.email.</rule>
    <rule>"cleargate admin issue-token" requires a pre-existing admin JWT in ~/.cleargate/admin-auth.json. The admin obtains that JWT via either (a) admin-panel UI redemption of an admin-scope invite, or (b) "cleargate admin bootstrap-root &lt;handle&gt;" for the very first admin in a fresh MCP.</rule>
  </architecture_rules>
  <target_files>
    <file path="cleargate-cli/src/commands/join.ts" action="modify" />
    <file path="cleargate-cli/src/commands/whoami.ts" action="modify" />
    <file path="cleargate-cli/src/commands/admin.ts" action="create" />
    <file path="cleargate-cli/src/cli.ts" action="modify" />
    <file path="cleargate-cli/README.md" action="modify" />
    <file path="cleargate-planning/CLAUDE.md" action="modify" />
    <file path="cleargate-planning/.cleargate/knowledge/cleargate-protocol.md" action="modify" />
    <file path="admin/src/routes/" action="modify" />
    <file path="mcp/src/admin-api/invites.ts" action="modify-if-needed" />
    <file path="mcp/src/admin-api/tokens.ts" action="modify-if-needed" />
  </target_files>
</agent_context>
```

## 1. Problem & Value

**Why are we doing this?**

On 2026-04-25 a real user attempted to configure ClearGate at `/Users/ssuladze/Documents/Dev/SlaXadeL` and surfaced a fundamental UX failure: the documented "easy" path required a five-step bootstrap involving a GitHub OAuth device flow, two distinct CLI subcommand groups (`admin` vs root), and an undocumented split between `~/.cleargate/` (CLI identity) and `<repo>/.cleargate/` (planning scaffold). When the user asked "why are we bound to GitHub at all," verification confirmed the MCP already exposes a bearer-token + invite primitive that doesn't require any third-party identity provider — but that path is buried under `cleargate admin issue-token` and the CLI's `join` subcommand defaults to the OAuth flow shipped in EPIC-019.

The user's mental model is correct: for a self-hosted planning tool used primarily by the team that runs it, **bearer tokens issued by the admin panel are the natural primitive**. The admin panel is already the trust anchor — it owns the database, the project boundaries, and the invitation policy. Forcing every invitee through GitHub OAuth on top of that is enterprise plumbing the threat model doesn't justify, and it breaks the "everyone, regardless of role, redeems the same kind of code" parity the user asked for.

**Concrete friction observed in 2026-04-25 transcript:**

1. Five distinct CLI invocations to reach first-push from a clean machine.
2. Two browser hops (one for admin panel UI, one for OAuth device flow).
3. Two auth files on disk (`~/.cleargate/auth.json` member, `~/.cleargate/admin-auth.json` admin) for what users perceive as one identity.
4. Same-name `~/.cleargate/` vs `<repo>/.cleargate/` collision with no documentation distinguishing them.
5. Injected `CLAUDE.md` block lists none of the relevant CLI commands; downstream coding agents cannot self-serve the push question.
6. Protocol §6 references `cleargate_push_item` as if it were a Claude-Code-attached MCP server, causing repeated `claude mcp list` probes that find nothing and lead agents to conclude the framework is unimplemented.
7. `cleargate whoami` exits 5 with "mcpUrl not configured" if `auth.json` is absent, even when `admin-auth.json` is populated — the CLI denies it knows you when half its identity files are present.
8. The OAuth-bound invite couples invite redemption to a GitHub identity, excluding any non-GitHub user from the platform.

**Success Metrics (North Star):**

- **TTPI (Time-To-First-Push)** from clean install to a first item in the admin panel: **≤ 90 seconds**, with zero browser hops in the default token flow.
- **CLI invocations to first push** in the default flow: **≤ 2** (`cleargate join <url>` + `cleargate push <file>`).
- **Identity-provider dependency in default path**: **none**. GitHub OAuth retained only behind explicit `--auth github`.
- **Agent-self-serve rate**: a Claude Code session in a freshly-init'd downstream repo answers "how do I push this?" correctly without external documentation, validated by a dogfood transcript test.

## 2. Scope Boundaries

**✅ IN-SCOPE (Build This)**

- [ ] Token-first `cleargate join <url>` redemption that requires no `--auth` flag and no browser. Bare invocation = bearer token redemption against `https://<mcp-host>/join/<opaque-id>`.
- [ ] Token URL shape: `https://<mcp-host>/join/<opaque-id>` (server lookup, JWT never in clipboard or shell history). Reuses existing EPIC-019 invite-URL shape.
- [ ] Default token TTL: **30 days**. Per-project default configurable via `projects.default_token_ttl_seconds`. Per-token override via `cleargate admin issue-token --ttl <duration>`.
- [ ] Default invite tokens are **single-use** (consumed on first redemption, replay rejected). Admin opt-ins: `--reusable` (no use limit) or `--max-uses <N>` (cohort onboarding). All redemptions audit-logged regardless of policy.
- [ ] Admin panel UI: "Issue invite" action generates a token and renders a single copy-paste line of the form `npx cleargate join <https-url>`. Same UI for issuing admin tokens, member tokens, and invites — only the scope and TTL in the rendered command differ.
- [ ] CLI: `cleargate admin issue-token --project <id> --member <email-or-name> [--scope admin|member] [--ttl <duration>] [--reusable | --max-uses <N>]` exposed at top level and documented. Already partially exists per `cli.ts:308`; surface formally, document, test.
- [ ] CLI: `cleargate admin revoke-token <token-id>` exposed at top level.
- [ ] `cleargate admin issue-token` requires a pre-existing admin JWT in `~/.cleargate/admin-auth.json`. The admin obtains that JWT via either (a) admin-panel UI redemption of an admin-scope invite, or (b) `cleargate admin bootstrap-root <handle>` for the very first admin in a fresh MCP.
- [ ] OAuth retained as opt-in via `cleargate join <url> --auth github`. Existing `mcp/src/admin-api/auth-device-{start,poll}.ts` endpoints stay live, untouched. Existing OAuth-redeemed auth files keep pushing without re-issuance.
- [ ] `cleargate whoami` succeeds whenever any auth file is populated. When both `~/.cleargate/auth.json` and `~/.cleargate/admin-auth.json` exist, output is two lines: `admin:  <email> @ <mcp-url>` and `member: <email> @ <project-name>`. When only one exists, only that line. Exit 0 in all populated cases.
- [ ] `cleargate init` writes scaffold only. Under `--yes`, no prompts, no `~/.cleargate/` mutation, no auth side effects. Token redemption is a separate, explicit `cleargate join` step regardless of `--yes`. Scaffold init is fully idempotent.
- [ ] Single conceptual identity for the user: the CLI presents "you" as one thing regardless of token vs OAuth provenance. Disk-level split (`auth.json` / `admin-auth.json`) becomes implementation detail, not user-facing.
- [ ] CLI Commands section appended inside the `<!-- CLEARGATE:START -->...<!-- CLEARGATE:END -->` block of injected `CLAUDE.md`. Curated list of **10 most-used commands**, each with a one-line "when to use" hint, plus a pointer to `cleargate --help`. Specific commands: `init`, `join`, `whoami`, `push`, `pull`, `sync`, `admin issue-token`, `wiki build`, `gate check`, `doctor`. Final line: *"Run `cleargate --help` for the full surface (~30 commands)."*
- [ ] Protocol §6 (`MCP Tools Reference` in `cleargate-protocol.md`) clarifies that `cleargate_*` MCP tools are server-side and called *by the `cleargate` CLI on the agent's behalf* — never registered as Claude-Code-attached MCP servers. Closes the `claude mcp list` confusion.
- [ ] Documentation note (in injected `CLAUDE.md` and `cleargate-protocol.md`) explicitly distinguishing `~/.cleargate/` (per-user CLI state) from `<repo>/.cleargate/` (per-repo planning scaffold).
- [ ] Updated `cleargate-cli/README.md` with a "First push in 90 seconds" quickstart focused on the token flow.
- [ ] Audit log rows for: token-issue, token-redeem, token-revoke, item-push. Existing `mcp/src/middleware/audit.ts` machinery; verify token-redeem path is wired.
- [ ] Dogfood end-to-end test: clean machine → `npx cleargate init --yes` in a fresh repo → admin panel issue invite → paste-and-redeem → `cleargate push` → item visible in admin panel within ≤ 90 seconds wall-clock. Recorded as scripted regression test.

**❌ OUT-OF-SCOPE (Do NOT Build This)**

- Removing or deprecating GitHub OAuth. Stays as `--auth github` opt-in. EPIC-019's identity-bound invite work is preserved verbatim.
- Renaming `~/.cleargate/` on disk. Documentation fix is the v1 mitigation; on-disk rename is a future migration story if revisited.
- Building a fresh admin UI from scratch. Reuse the existing SvelteKit admin app at `admin/`; only the invite-render flow needs touch-up.
- Auto-deploying MCP for the user (e.g., Coolify one-click). Solo onboarding assumes an MCP URL is reachable.
- Adding new authentication providers (SAML, Google, email-link). Token + opt-in OAuth is the v1 surface.
- IP allowlists, geo-restrictions, hardware-token MFA. Defer to a security-hardening Epic if needed.
- Migrating existing OAuth-bound `~/.cleargate/auth.json` files to token-form. They keep working as-is; users may opt into re-issuance but it is not required.
- Changing the planning protocol gates (Gate 1 / Gate 2 / Gate 3). Auth UX is orthogonal to gate enforcement.
- Self-contained JWT-in-URL token form (`cleargate://<host>/<jwt>`). Rejected — JWT exposure in clipboard/scrollback is unacceptable leak surface.
- Token TTL options shorter than 1 hour or longer than 365 days. Outside the safe envelope.

## 3. The Reality Check (Context)

| Constraint Type | Limit / Rule |
|---|---|
| Backwards compatibility | Existing OAuth-redeemed `~/.cleargate/auth.json` files MUST keep pushing without behavioral change or re-issuance. |
| OAuth preservation | `mcp/src/admin-api/auth-device-{start,poll}.ts` stay live. The `--auth github` flag remains a first-class redemption path. |
| Token security | Tokens are bearer credentials. Mitigation primitives required: 30-day default TTL (configurable), single-use default (with `--reusable` / `--max-uses` opt-ins), admin-side revocation, audit log on issue + redeem + push + revoke. |
| Token URL form | `https://<mcp-host>/join/<opaque-id>`. JWT MUST NOT appear in URL, clipboard, or shell history. Server lookup resolves opaque-id → JWT at redemption time. |
| Token TTL bounds | Allowed range: 1 hour to 365 days. Default: 30 days. Configurable per project; overridable per token. |
| Token use policy | Default single-use. `--reusable` opt-in for unlimited reuse. `--max-uses <N>` opt-in for fixed cohort. |
| Server-side identity | Tokens map to a `members` row at issue time. `pushed_by` attribution remains `members.email`, unchanged from EPIC-010 §14.7. |
| Audit trail | Every token-issue, token-redeem, token-revoke, and item-push MUST land an `audit_log` row with actor + timestamp + scope. |
| Admin token issuance | `cleargate admin issue-token` requires pre-existing admin JWT in `~/.cleargate/admin-auth.json`. Obtained via UI invite redemption or `bootstrap-root`. No password / OAuth required at issuance time. |
| CLI ergonomics | Default path requires zero flags: `cleargate join <url>` is the whole command. Flags exist only for explicit overrides (`--auth github`, `--profile <name>`). |
| `init --yes` semantics | Scaffold-only. No prompts, no `~/.cleargate/` mutation, no auth side effects. Idempotent across re-runs. |
| `whoami` semantics | Exits 0 whenever any auth file is populated. Two-line scoped output when both present. |
| Protocol gates | Gates 1/2/3 MUST still gate work item delivery. Auth changes are orthogonal. |
| MCP availability | Token redemption assumes MCP is reachable. Failure mode is a clear error, not a silent degraded state. |
| CLAUDE.md update | New CLI Commands section MUST live inside the `<!-- CLEARGATE:START -->...<!-- CLEARGATE:END -->` markers so it propagates on `cleargate upgrade`. |
| CLAUDE.md surface | Curated 10 commands + pointer to `cleargate --help`. Exhaustive list rejected on token-budget grounds. |

## 4. Technical Grounding (The "Shadow Spec")

**Affected files (verified by Read/Grep on 2026-04-25):**

- `cleargate-cli/src/commands/join.ts` — verified at line 89: bare invite tokens require `mcpUrl`. Modify to default to token redemption (no `--auth` required) and accept the existing `https://<mcp-host>/join/<opaque-id>` URL shape that already carries the host. OAuth becomes the `--auth github` branch only.
- `cleargate-cli/src/commands/whoami.ts` — modify to read both `~/.cleargate/auth.json` and `~/.cleargate/admin-auth.json` and present unified two-line output. Today exits 5 if `auth.json` is absent.
- `cleargate-cli/src/commands/admin.ts` — new file (or extension of existing admin subcommand wiring). Implements `issue-token`, `revoke-token` with the flag set defined in §2 IN-SCOPE. Wired from `cli.ts:307`.
- `cleargate-cli/src/cli.ts` — verified at line 307–308. Surface `admin issue-token` and `admin revoke-token` formally as commander subcommands. Update `--description` text to advertise token-first as default.
- `cleargate-cli/src/commands/init.ts` — confirm `--yes` produces scaffold-only, no `~/.cleargate/` mutation. Add regression test.
- `cleargate-cli/README.md` — replace existing quickstart with token-first 90-second walkthrough.
- `cleargate-planning/CLAUDE.md` — append CLI Commands table inside `<!-- CLEARGATE:START -->...<!-- CLEARGATE:END -->`. 10 curated commands + `--help` pointer + one-sentence note distinguishing `~/.cleargate/` from `<repo>/.cleargate/`.
- `cleargate-planning/.cleargate/knowledge/cleargate-protocol.md` — §6 clarification that `cleargate_*` are server-side MCP tools accessed via the `cleargate` CLI, not Claude-attached MCP servers. Around line 146–155.
- `admin/src/routes/` — invite-render flow: "Issue invite" action produces the copy-paste `cleargate join` command. UI surface for `--reusable` / `--max-uses` / `--ttl` controls.
- `mcp/src/admin-api/invites.ts` — verify URL-shape and TTL semantics. Modify if needed to honor per-token TTL override and use-count policy.
- `mcp/src/admin-api/tokens.ts` — verify CLI-callable issue + revoke endpoints exist and are exposed via OpenAPI. Modify if needed.
- `mcp/src/auth/service-token.ts` — verified present. Bearer validation already implemented.
- `mcp/src/middleware/audit.ts` — verify token-issue, token-redeem, token-revoke audit-log paths. Add if missing.

**Auth file paths (verified from published v0.4.0 bundle, /tmp/cgtest/package/dist on 2026-04-25):**

- Member auth: `~/.cleargate/auth.json` (chunk-4V4QABOJ.js:135).
- Admin auth: `~/.cleargate/admin-auth.json` (cli.js:8359).
- Profile config: `~/.cleargate/config.json` (chunk-OM4FAEA7.js:25).

**MCP existing primitives (verified by Glob on `/Users/ssuladze/Documents/Dev/ClearGate/mcp/src/admin-api/` 2026-04-25):**

- `tokens.ts` + `tokens.test.ts` — token issue/revoke endpoints.
- `invites.ts` — invite mint/redeem.
- `auth-exchange.ts` — credential exchange flow.
- `service-token.ts` (in `auth/`) — bearer validation.
- `auth-device-start.ts` + `auth-device-poll.ts` — GitHub OAuth (preserved, not modified).

**Data Changes:**

- No new tables. Reuses `admin_users`, `projects`, `members`, `invites`, `audit_log`.
- New project-level setting: `projects.default_token_ttl_seconds` (default 2592000 = 30 days).
- New invite-level columns (additive): `max_uses INTEGER NULL` (NULL = single-use; explicit values = cohort cap), `use_count INTEGER NOT NULL DEFAULT 0`. If `invites` already has shape that supports this via existing columns, reuse; otherwise add via migration.
- Optional config flag in `~/.cleargate/config.json`: `default_auth_method: "token" | "github"`. Forward-compatible: unknown keys ignored.

## 5. Acceptance Criteria

```gherkin
Feature: Token-first onboarding to ClearGate

  Scenario: Bare invite redemption with zero flags
    Given an admin has issued an invite via the admin panel for member <member-name>
    And the admin panel rendered a copy-paste command of the form
        npx cleargate join https://<mcp-host>/join/<opaque-id>
    And a fresh machine with no ~/.cleargate/auth.json
    When the invitee runs that exact command in their terminal
    Then no browser opens
    And no GitHub OAuth flow is triggered
    And ~/.cleargate/auth.json is written with a valid bearer JWT
    And "cleargate whoami" prints "member: <email> @ <project-name>"
    And the elapsed time from command start to whoami success is ≤ 5 seconds

  Scenario: Same flow for admin tokens
    Given an admin issues themselves an admin-scope token via the admin panel
    When they run the rendered command on their CLI machine
    Then ~/.cleargate/admin-auth.json is written with a valid admin JWT
    And "cleargate whoami" prints "admin: <email> @ <mcp-url>"

  Scenario: GitHub OAuth retained as opt-in
    Given an admin issues an invite intended for OAuth redemption
    And the invitee runs "cleargate join <invite-url> --auth github"
    When the GitHub device-flow OAuth completes successfully
    Then ~/.cleargate/auth.json is written
    And the on-disk auth shape is indistinguishable from the pre-EPIC-021 OAuth-bound shape
    And subsequent "cleargate push" calls succeed unchanged

  Scenario: Existing OAuth-bound auth keeps working
    Given a user redeemed an invite via OAuth before EPIC-021 shipped
    And ~/.cleargate/auth.json contains an OAuth-bound JWT
    When they run "cleargate push <approved-file>" after EPIC-021 ships
    Then the push succeeds with no behavioral change
    And no migration prompt or re-issuance is required

  Scenario: whoami works whenever any auth file is populated
    Given ~/.cleargate/admin-auth.json contains a valid admin JWT
    And ~/.cleargate/auth.json does NOT exist
    When the user runs "cleargate whoami"
    Then the command exits 0
    And prints "admin: <email> @ <mcp-url>"
    And does NOT print "mcpUrl not configured"

  Scenario: whoami unifies admin + member identities when both present
    Given ~/.cleargate/admin-auth.json contains a valid admin JWT
    And ~/.cleargate/auth.json contains a valid member JWT for the same user
    When the user runs "cleargate whoami"
    Then the output is exactly two lines:
        admin:  <email> @ <mcp-url>
        member: <email> @ <project-name>

  Scenario: init --yes is scaffold-only
    Given a fresh repo with no .cleargate/ and no ~/.cleargate/auth.json
    When the user runs "npx cleargate init --yes"
    Then .cleargate/ is created with the standard scaffold
    And ~/.cleargate/ is NOT modified
    And no prompts are issued
    And the command exits 0
    And re-running "npx cleargate init --yes" is idempotent (no diff to disk)

  Scenario: Default token TTL is 30 days
    Given an admin issues a token via "cleargate admin issue-token --project P --member M" without --ttl
    When the token is inspected in the admin panel
    Then its expiry is exactly 30 days from issuance (within 1 second clock skew)

  Scenario: --ttl overrides the default per-token
    Given an admin runs "cleargate admin issue-token --project P --member M --ttl 7d"
    When the token is inspected
    Then its expiry is exactly 7 days from issuance

  Scenario: Single-use token is consumed on first redemption
    Given an admin issued a token without --reusable or --max-uses
    And the invitee redeemed it successfully on machine A
    When a second redemption is attempted using the same URL on machine B
    Then the redemption fails with a clear "token already used" error
    And ~/.cleargate/auth.json is NOT created or modified on machine B

  Scenario: --reusable token allows multiple redemptions
    Given an admin issued a token with --reusable
    When five different machines redeem it in sequence
    Then all five redemptions succeed
    And five distinct audit_log rows record the redemptions

  Scenario: --max-uses caps cohort onboarding
    Given an admin issued a token with --max-uses 3
    When four machines attempt redemption in sequence
    Then redemptions 1-3 succeed
    And redemption 4 fails with a "token use limit reached" error

  Scenario: Token revocation rejects subsequent redemption
    Given an admin issued a token and rendered the join command
    And the admin then revoked the token via "cleargate admin revoke-token <id>" or the admin panel
    When an invitee runs the rendered "cleargate join ..." command
    Then the redemption fails with a 401 and a clear error message
    And ~/.cleargate/auth.json is NOT created or modified

  Scenario: Issued tokens are auditable end-to-end
    Given an admin issues a token
    And an invitee redeems it
    And the invitee pushes an approved item
    When the admin views the audit log for the project
    Then the log shows three rows in chronological order:
        token-issue (actor: admin email, target: member email)
        token-redeem (actor: member email, source: <ip>)
        item-push (actor: member email, item: <id>)

  Scenario: Injected CLAUDE.md lists the CLI surface
    Given a downstream repo has been initialized via "cleargate init"
    When a Claude Code agent reads the CLAUDE.md block between <!-- CLEARGATE:START --> and <!-- CLEARGATE:END -->
    Then the block contains a "CLI Commands" section listing exactly these 10 commands:
        init, join, whoami, push, pull, sync, admin issue-token, wiki build, gate check, doctor
    And each command has a one-line "when to use" hint
    And the section ends with the line: "Run `cleargate --help` for the full surface (~30 commands)."
    And the block contains a one-sentence note distinguishing ~/.cleargate/ from <repo>/.cleargate/

  Scenario: Protocol distinguishes the two .cleargate/ roots and clarifies cleargate_* tools
    Given the user reads .cleargate/knowledge/cleargate-protocol.md
    When they reach §6 MCP Tools Reference
    Then the doc explicitly states that cleargate_* MCP tools are server-side and accessed via the cleargate CLI, not via "claude mcp" registration
    And the doc explicitly states that ~/.cleargate/ is per-user CLI state and <repo>/.cleargate/ is per-repo planning scaffold

  Scenario: First-push under 90 seconds end-to-end
    Given a clean machine and a reachable MCP at https://cleargate-mcp.soula.ge
    And the admin issues an invite via the admin panel and copies the rendered command
    When the invitee runs:
        cd <fresh-repo>
        npx cleargate init --yes
        npx cleargate join <copied-url>
        echo "approved: true" >> .cleargate/delivery/pending-sync/<draft>.md
        npx cleargate push .cleargate/delivery/pending-sync/<draft>.md
    Then the pushed item is visible in the admin panel within 5 seconds of the push command returning
    And the wall-clock time between npx cleargate init and item-visible is ≤ 90 seconds (excluding human typing)
```

## 6. AI Interrogation Loop (Human Input Required)

> All 8 questions resolved 2026-04-25. User ratified all AI recommendations verbatim. Resolution log:
>
> - **Q1 — Default token TTL.** ✅ 30 days, per-project configurable via `projects.default_token_ttl_seconds`, per-token override via `--ttl`. Integrated into §2 IN-SCOPE, §3 Reality Check, §4 Data Changes.
> - **Q2 — Token URL form.** ✅ `https://<mcp-host>/join/<opaque-id>`. Server lookup, JWT never in clipboard. Integrated into §2 IN-SCOPE, §3 Reality Check, §5 Gherkin.
> - **Q3 — Target sprint and target_date.** ✅ Dedicated SPRINT-17, target_date `2026-05-09`. Integrated into frontmatter `target_date`.
> - **Q4 — `init --yes` interaction.** ✅ Scaffold-only, no `~/.cleargate/` mutation, fully idempotent. Integrated into §2 IN-SCOPE, §3 Reality Check, §5 Gherkin "init --yes is scaffold-only".
> - **Q5 — `whoami` output format.** ✅ Two scoped lines when both files present (`admin:` / `member:`); single line when only one present; exit 0 in all populated cases. Integrated into §2 IN-SCOPE, §3 Reality Check, §5 Gherkin "whoami unifies admin + member identities".
> - **Q6 — CLAUDE.md curated vs exhaustive.** ✅ Curated 10 commands + `cleargate --help` pointer. Specific commands pinned in §2 IN-SCOPE and §5 Gherkin "Injected CLAUDE.md lists the CLI surface".
> - **Q7 — `admin issue-token` auth precondition.** ✅ Requires pre-existing admin JWT in `~/.cleargate/admin-auth.json`. Obtained via admin-panel UI redemption or `bootstrap-root`. Integrated into §0 architecture rules, §2 IN-SCOPE, §3 Reality Check.
> - **Q8 — Single-use vs reusable invites.** ✅ Default single-use. `--reusable` and `--max-uses <N>` opt-ins. All redemptions audit-logged. Integrated into §2 IN-SCOPE, §3 Reality Check, §4 Data Changes (`max_uses` / `use_count` columns), §5 Gherkin.

§6 is empty. No outstanding questions. Epic is 🟢.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity — Ready for Sprint Planning**

Pass criteria — all met:
- [x] Proposal gate waiver recorded in `context_source` per user's standing rule (sharp intent + inline references).
- [x] §0 `<agent_context>` block is complete with 9 architecture rules covering all decided invariants.
- [x] §4 Technical Grounding contains 100% real, verified file paths (cross-checked against repo on 2026-04-25).
- [x] §6 AI Interrogation Loop is empty; all 8 questions resolved with ratified answers integrated into §2/§3/§4/§5.
- [x] 0 "TBDs" exist in the document. `target_date` pinned to `2026-05-09`.

Next planning step (out of scope for this Epic file):
- Story decomposition into 7–8 Stories with consecutive IDs covering: (1) token-first join CLI, (2) whoami unification, (3) admin issue-token CLI, (4) admin revoke-token CLI, (5) admin-panel invite-render UI, (6) injected CLAUDE.md CLI Commands section, (7) protocol §6 clarification, (8) dogfood end-to-end test.
