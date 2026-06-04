---
epic_id: EPIC-050
parent_cleargate_id: null
sprint_cleargate_id: null
carry_over: false
status: Draft
ambiguity: 🔴 High
context_source: INITIATIVE-001 triage + connector/PRD.md v0.3.1 + EPIC-046/047/048 decomposition + verified cleargate-cli identity grounding (token-store/config/join) + recorded direct approval
owner: Sandro
target_date: 2026-09-30
area: connector
created_at: 2026-06-04T00:00:00Z
updated_at: 2026-06-04T00:00:00Z
created_at_version: strategy-phase-pre-init
updated_at_version: strategy-phase-pre-init
server_pushed_at_version: null
cached_gate_result:
  pass: false
  failing_criteria:
    - id: parent-approved
      detail: "OR-group failed — all alternatives failed: parent-approved-proposal: context_source is prose but no proposal_gate_waiver (approved_by + approved_at) found in frontmatter; parent-approved-initiative: context_source is prose but no proposal_gate_waiver (approved_by + approved_at) found in frontmatter"
    - id: existing-surfaces-verified
      detail: "cited paths do not exist on disk: .cleargate/config.json"
  last_gate_check: 2026-06-04T09:07:04Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id EPIC-050
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-06-04T07:43:54Z
  sessions: []
---

# EPIC-050: Connector Onboarding & Companion Packaging

## 0. AI Coding Agent Handoff

```xml
<agent_context>
  <objective>Ship the Connector as an OPT-IN, default-off ClearGate companion that the `cleargate` CLI installs, identifies, and supervises — including running N independent daemons on one machine, each bound to its own repo/project. This is the epic where the product's charter visibly expands from planning-only to planning + connectivity.</objective>
  <architecture_rules>
    <rule>NEVER bundle connector runtime code into the shipped npm planning payload (`cleargate-cli/src`, `.claude/`, the package). The connector ships as a SEPARATE package `@cleargate/connector` (own repo). `cleargate connector` is a THIN launcher that installs/spawns it and imports NOTHING from it. (EPIC-027 boundary.)</rule>
    <rule>Default OFF: a plain `npm i -g cleargate` + `cleargate init` installs and starts NOTHING. The daemon materializes only on explicit `cleargate connector` opt-in.</rule>
    <rule>Member-gated like push/pull/sync: pre-member → exit 2 with "Run: cleargate join <invite-url>". Connectivity requires membership.</rule>
    <rule>Native-lane identity reuse: post-join, reuse the keychain refresh token — NO separate pairing code for the ClearGate-native user.</rule>
    <rule>Per-instance identity: each daemon resolves repo → profile → project token; N daemons coexist (distinct connection_ids, working dirs, control sockets, and per-instance mcpUrl). One global "default" profile slot is NOT enough.</rule>
  </architecture_rules>
  <target_files>
    <file path="cleargate-cli/src/commands/connector.ts" action="create" />
    <file path="cleargate-cli/src/commands/join.ts" action="modify" />
    <file path="@cleargate/connector (separate repo) — install/lifecycle entry" action="create" />
  </target_files>
</agent_context>
```

## 1. Problem & Value

**Why are we doing this?**
EPIC-046/047/048 make the relay *work and be safe*, but only if you hand-run the daemon and hand-wire its identity. This epic is the difference between "a thing engineers can run" and "a thing a ClearGate member turns on in one command." It also answers the concrete multi-project case: a user with 4 unrelated repos, each `cleargate join`'d to a different project, running **4 independent daemons** and driving all 4 from their chat apps.

**Success Metrics (North Star):**
- After `cleargate join`, **one command** brings a Connector online reusing the existing identity — no second credential.
- **N daemons on one machine, one per repo/project, coexist** — each addressable by its own `connection_id`, each running `claude` in its own working dir, with no identity/socket collision.
- A planning-only user who never opts in gets **zero** connector code running and **zero** new daemons.

## 2. Scope Boundaries

**✅ IN-SCOPE (Build This)**
- [ ] `cleargate connector` command surface: `install` (fetch/pin `@cleargate/connector`), `up`/`down` (start/stop the daemon for this repo), `status` (connection_id, project, presence, broker URL), `logs`. Default invocation = sensible up-or-status.
- [ ] **Separate-package install model**: CLI fetches `@cleargate/connector` to a managed location on opt-in, pins a version compatible with the CLI's `protocol_version`, and spawns it. CLI imports nothing from it (boundary-safe; `check:no-connector-import`-style guard).
- [ ] **Default-off**: `init` never installs/starts the connector; opt-in is explicit.
- [ ] **Member-gating** + pre-member redirect (reuse the push/pull/sync gating surface).
- [ ] **Native-lane identity reuse**: post-join, the daemon registers with the broker using the keychain refresh-token-derived credential (no pairing code).
- [ ] **Per-repo profile pinning (closes the verified gap)**: extend `.cleargate/.join.json` to record the **profile** (today it stores `project_id` only — `join.ts:479-499`), so each repo auto-resolves its own identity; the connector binds repo → profile → project without per-invocation `--profile`. (May land as a small standalone CLI CR first — see §6; useful for `push`/`pull`/`sync` across repos too.)
- [ ] **Per-instance isolation**: distinct local control socket/IPC path per daemon (keyed by `connection_id`/repo) so N daemons don't collide; per-instance `mcpUrl` resolution for the cross-plane case.
- [ ] **Lifecycle/supervision**: foreground + detached run, crash-restart with jittered reconnect (pairs with EPIC-048), clean shutdown that tears down `claude` (no orphans). OS-service integration (launchd/systemd) — depth is an open Q (§6).
- [ ] **Charter Gate-1 surface**: this epic is the deliberate "we now ship connectivity" decision; document the planning-only → planning+connectivity expansion in the bounded CLAUDE.md block + README.

**❌ OUT-OF-SCOPE (Do NOT Build This)**
- The broker / registry / routing (→ EPIC-046), credential minting/verify (→ EPIC-047), the daemon's `claude`-spawn/normalize/teardown CORE (→ EPIC-048). This epic **packages and onboards** EPIC-048's daemon; it does not reimplement it.
- Admin Connections UI (→ EPIC-049).
- Bundling connector code into the npm planning payload (forbidden by charter).
- Auto-start on machine boot as a default (opt-in only).
- Standalone (non-ClearGate) pairing-code onboarding UX polish beyond what EPIC-047 exposes.

## 3. The Reality Check (Context)

| Constraint Type | Limit / Rule |
|---|---|
| Charter | Connector code NEVER in the npm planning payload — separate `@cleargate/connector`; CLI is a thin launcher |
| Default | Off — opt-in only; planning users get nothing |
| Gating | Member-only (pre-member → join redirect) |
| Identity | Per-instance: repo → profile → project; N daemons coexist; global "default" profile is insufficient |
| Charter expansion | Ships planning-only → planning + connectivity — deliberate human Gate-1, not drift |

## Existing Surfaces

> L1 reuse audit. Verified this session.

- **Surface:** `cleargate-cli/src/auth/token-store.ts` + `keychain-store.ts:10` + `file-store.ts:28` — tokens stored **per `profile`** (keychain `Entry("cleargate", profile)` / `auth.json` `profiles[profile]`). Multiple profiles already coexist; the daemon selects the right one per instance.
- **Surface:** `cleargate-cli/src/config.ts:9` — `profile` defaults to a single global `"default"`; `~/.cleargate/config.json` holds a **global singleton** `mcpUrl`/`profile`. This is *why* per-repo profile pinning is needed for N daemons.
- **Surface:** `cleargate-cli/src/commands/join.ts:479-499` (BUG-031) — already writes per-repo `.cleargate/.join.json` with `project_id` (not profile). **Extend it with `profile`.**
- **Surface:** `cleargate-cli/src/auth/{acquire,refresh,factory}.ts` — token acquisition/refresh/keychain factory the daemon reuses to mint its broker-register credential.
- **Coverage of this epic's scope:** **partial** — identity storage + join + per-repo binding exist (~50%); the `cleargate connector` command, separate-package install/supervision, per-instance sockets, and profile pinning are net-new.

## Why not simpler?

> L2 / L3 right-size + justify-complexity.

- **Smallest existing surface that could carry this epic:** the CLI command framework + token store carry identity, but nothing installs/supervises a companion daemon or scopes identity per-instance.
- **Why isn't `npm i -g @cleargate/connector` + manual start enough?** Three reasons it must be CLI-orchestrated: (1) **charter** — connector code can't live in the planning payload, so the CLI must install a *peer* package without importing it; (2) **per-instance identity** — N daemons on one box each need their own repo→profile→project resolution, which today's single global `"default"` profile cannot express; (3) **default-off + member-gating** — the connector must be invisible to planning-only users and gated on membership. None of that is a plain `npm i`.

## 4. Technical Grounding (The "Shadow Spec")

**Affected Files:**
- `cleargate-cli/src/commands/connector.ts` — new command (install/up/down/status/logs). Create. Thin launcher; spawns `@cleargate/connector`; imports nothing from it.
- `cleargate-cli/src/commands/join.ts` — record `profile` into `.cleargate/.join.json`. Modify.
- `@cleargate/connector` (separate repo) — install/lifecycle entry that the CLI invokes; wraps EPIC-048's daemon.
- Bounded CLAUDE.md block + README — charter-expansion note.

**Data Changes:**
- `.cleargate/.join.json`: add `profile` field (alongside existing `project_id`, `joined_at`).
- Per-instance control socket path (e.g. `~/.cleargate/connector/<connection_id>.sock`) + per-instance runtime state (pid, broker URL, presence).
- No server-side schema change (identity = EPIC-047; transit-only = EPIC-046).

## 5. Acceptance Criteria

```gherkin
Feature: Connector Onboarding & Companion Packaging
  Scenario: Default-off for planning users
    Given a fresh `npm i -g cleargate` and `cleargate init`
    Then no connector package is installed and no daemon is running

  Scenario: Pre-member is redirected
    Given no valid join token on disk
    When the user runs `cleargate connector up`
    Then it exits 2 with "Run: cleargate join <invite-url>"

  Scenario: One-command onboarding after join
    Given the user has run `cleargate join` in repo R for project P
    When they run `cleargate connector up`
    Then `@cleargate/connector` is installed if absent
    And a daemon registers with the broker reusing the join identity (no pairing code)
    And `cleargate connector status` shows the connection_id, project P, and online presence

  Scenario: Four repos, four projects, four daemons
    Given four unrelated repos each joined to a different project
    When `cleargate connector up` runs in each
    Then four daemons run concurrently, each bound to its repo's profile/project
    And each is addressable by its own connection_id with no identity or socket collision
    And a turn on one runs `claude` in that repo's working dir only

  Scenario: Clean teardown
    When the user runs `cleargate connector down` in a repo
    Then that daemon stops and leaves no orphaned claude or child processes
    And the other daemons are unaffected
```

## 6. AI Interrogation Loop (Human Input Required)

- **AI Question:** "Lifecycle depth for v1: foreground/detached process only (user manages restart), or OS-service integration (launchd/systemd) for auto-restart + boot survival?" — **Human Answer:** {Waiting}
- **AI Question:** "Per-repo profile pinning: land it as a **standalone CLI CR first** (benefits push/pull/sync across repos immediately) or fold it into this epic?" — **Human Answer:** {Waiting}
- **AI Question:** "Install mechanism for `@cleargate/connector`: global `npm i -g`, `npx`-on-demand, or a CLI-managed vendored dir under `~/.cleargate/connector`?" — **Human Answer:** {Waiting}
- **AI Question:** "Version coupling: how does the CLI pin/upgrade the connector package against its `protocol_version` — exact pin, semver range, or handshake-and-warn?" — **Human Answer:** {Waiting}
- **AI Question:** "Confirm the charter expansion (planning-only → planning + connectivity) ships here as a deliberate Gate-1 — yes?" — **Human Answer:** {Waiting}
- ✅ **Tunnel Phase-0 (borrowed — prior effort's EPIC-012 Phase-1): OUT as a built feature.** Decided 2026-06-04. We do **not** add a local inbound listener to the daemon (it fights the dial-out design and opens the product's worst security surface — a code-executing daemon reachable over a tunnel). Instead, early phone→Claude dogfood = **reach the M0 broker over Tailscale** (phone + laptop on the same private mesh); captured as an **ops note** on SPRINT-35, zero extra code. The only window where building the listener would pay off is dogfooding *before any broker exists* — but M0 is one sprint, so waiting for it is cheaper.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🔴 High Ambiguity**

Requirements to pass to Green (Ready for Coding Agent):
- [ ] `approved: true` is set in the YAML frontmatter.
- [ ] The `<agent_context>` block is complete and validated.
- [ ] §4 Technical Grounding contains 100% real, verified file paths.
- [ ] §6 AI Interrogation Loop is empty (all human answers integrated into the spec).
- [ ] 0 "TBDs" exist in the document.
- [x] Existing Surfaces cites at least one source-tree path or explicitly states "none — net-new."
- [x] Why not simpler? has both sub-bullets answered.
