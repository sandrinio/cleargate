---
epic_id: EPIC-000
status: Completed
ambiguity: 🟢 Low
context_source: PROPOSAL-001_Document_Metadata.md, PROPOSAL-002_Knowledge_Wiki.md, PROPOSAL-003_MCP_Adapter.md
owner: Vibe Coder (ssuladze@exadel.com)
target_date: 2026-04-18
completed_in_sprint: SPRINT-03
completed_at: 2026-04-18T04:00:00Z
created_at: 2026-04-17T00:00:00Z
updated_at: 2026-04-18T18:00:00Z
created_at_version: strategy-phase-pre-init
updated_at_version: strategy-phase-pre-init
resolved_at: 2026-04-17T00:00:00Z
resolved_by: Vibe Coder (ssuladze@exadel.com)
approved: true
pushed_by: sandrinio@github.local
pushed_at: 2026-04-20T19:44:11.157Z
push_version: 3
---

# EPIC-000: `cleargate-cli` Package Scaffold

## 0. AI Coding Agent Handoff

```xml
<agent_context>
  <objective>Scaffold the cleargate-cli npm package — shared foundation for EPIC-001 (stamp), EPIC-002 (wiki), EPIC-005 (join/admin). Ships a Commander-based CLI with config loader, auth/token-store abstraction, and MCP-client stub. Publishable to npm as @cleargate/cli.</objective>
  <architecture_rules>
    <rule>Package path: cleargate-cli/ (sibling of mcp/ and admin/).</rule>
    <rule>Published as @cleargate/cli (scoped).</rule>
    <rule>Three usage modes supported: npx one-off, local devDep, global install.</rule>
    <rule>Zero business logic in EPIC-000 — pure scaffold and shared plumbing.</rule>
    <rule>TypeScript strict. Built with tsup (fast, works out of the box for Node CLIs).</rule>
    <rule>Binary entry: bin/cleargate → dist/cli.js with #!/usr/bin/env node shebang.</rule>
  </architecture_rules>
  <target_files>
    <file path="cleargate-cli/package.json" action="create" />
    <file path="cleargate-cli/tsconfig.json" action="create" />
    <file path="cleargate-cli/tsup.config.ts" action="create" />
    <file path="cleargate-cli/.gitignore" action="create" />
    <file path="cleargate-cli/README.md" action="create" />
    <file path="cleargate-cli/src/cli.ts" action="create" />
    <file path="cleargate-cli/src/config.ts" action="create" />
    <file path="cleargate-cli/src/auth/token-store.ts" action="create" />
    <file path="cleargate-cli/src/mcp-client/index.ts" action="create" />
  </target_files>
</agent_context>
```

## 1. Problem & Value

Three Epics (001, 002, 005) need the same `cleargate-cli` package, config loader, and auth/token-store. Scaffolding once avoids duplication and guarantees consistency.

**Success Metrics:**
- `npx @cleargate/cli --help` prints usage listing (even if commands are stubs).
- Global install via `npm i -g @cleargate/cli` puts `cleargate` on PATH.
- Local devDep + npm script runs the CLI from a project.
- Config loader reads `CLEARGATE_MCP_URL`, profile flag, and returns typed config.
- Token store picks keychain (via the chosen library) if available, file fallback otherwise.

## 2. Scope Boundaries

**✅ IN-SCOPE**
- [ ] package.json with bin entry + scoped name
- [ ] tsconfig + tsup config
- [ ] Commander CLI entry (`cli.ts`) with stub subcommands registered
- [ ] Config loader (`config.ts`) with zod validation
- [ ] TokenStore interface + KeychainTokenStore + FileTokenStore (`~/.cleargate/auth.json` chmod 600)
- [ ] MCP client stub (`mcp-client/index.ts`) — typed wrapper around `fetch` to call MCP Streamable HTTP
- [ ] README with install-mode matrix

**❌ OUT-OF-SCOPE**
- Actual commands (`stamp`, `wiki *`, `join`, `whoami`) — those are their own Epics
- npm publish automation (done manually first time)

## 3. Acceptance Criteria

```gherkin
Feature: cleargate-cli scaffold

  Scenario: Help output
    When I run `npx cleargate --help`
    Then stdout lists the stub subcommands and global flags

  Scenario: Version flag
    When I run `cleargate --version`
    Then stdout matches the version in package.json

  Scenario: Token store keychain
    Given a macOS host with Keychain available
    When cleargate saves a token for profile "default"
    Then the OS Keychain contains an entry under service "cleargate"

  Scenario: Token store file fallback
    Given a Linux host without libsecret
    When cleargate saves a token for profile "default"
    Then ~/.cleargate/auth.json exists with mode 0600
```

## 6. AI Interrogation Loop — RESOLVED

1. **Build tool** — **Resolved:** tsup. Fast, zero-config for Node CLIs, emits ESM + CJS.
2. **CLI argument lib** — **Resolved:** Commander. Mature, typed, small footprint.
3. **Keychain library** — **Resolved:** verify at implementation time. Target: prebuilt binaries for Node 22 on macOS + Linux. Candidates: `keytar`, `@napi-rs/keyring`. Pick whichever builds cleanly.
4. **Config precedence** — **Resolved:** CLI flags > env vars > `~/.cleargate/config.json` > defaults.
5. **Profile storage location** — **Resolved:** `~/.cleargate/config.json` (file) + OS keychain for secrets.
6. **Typed MCP client surface** — **Resolved:** generate from the MCP's OpenAPI spec (EPIC-004) once available. v0 ships a hand-rolled thin wrapper.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)

**Current Status: 🟢 Low Ambiguity — READY**

- [x] Source proposals approved
- [x] `<agent_context>` complete
- [x] §6 resolved
- [x] No blocking TBDs

Stories: STORY-000-01 through STORY-000-04.
