---
type: epic
id: "EPIC-000"
parent: ""
children: 
  - "[[STORY-000-01]]"
  - "[[STORY-000-02]]"
  - "[[STORY-000-03]]"
  - "[[STORY-000-04]]"
cites: []
cited_by: 
  - "[[EPIC-002]]"
status: "Completed"
remote_id: ""
raw_path: ".cleargate/delivery/archive/EPIC-000_CLI_Package_Scaffold.md"
last_ingest: "2026-11-12T19:31:58.580Z"
last_ingest_commit: "2691d20a51eb6e8211a9ec862c0ec0ddf8c09601"
repo: "planning"
---

# EPIC-000: `cleargate-cli` Package Scaffold

**Status:** Completed · **Sprint:** none · **Gate:** not run

## Objective
Scaffold the cleargate-cli npm package — shared foundation for EPIC-001 (stamp), EPIC-002 (wiki), EPIC-005 (join/admin). Ships a Commander-based CLI with config loader, auth/token-store abstraction, and MCP-client stub. Publishable to npm as @cleargate/cli.

## Problem & Value
Three Epics (001, 002, 005) need the same `cleargate-cli` package, config loader, and auth/token-store. Scaffolding once avoids duplication and guarantees consistency.

**Success Metrics:**
- `npx @cleargate/cli --help` prints usage listing (even if commands are stubs).
- Global install via `npm i -g @cleargate/cli` puts `cleargate` on PATH.
- Local devDep + npm script runs the CLI from a project.

[+176 bytes not shown — read .cleargate/delivery/archive/EPIC-000_CLI_Package_Scaffold.md]

## Scope
**In:**
- [ ] package.json with bin entry + scoped name
- [ ] tsconfig + tsup config
- [ ] Commander CLI entry (`cli.ts`) with stub subcommands registered
- [ ] Config loader (`config.ts`) with zod validation
- [ ] TokenStore interface + KeychainTokenStore + FileTokenStore (`~/.cleargate/auth.json` chmod 600)
- [ ] MCP client stub
**Out:**
- Actual commands (`stamp`, `wiki *`, `join`, `whoami`) — those are their own Epics
- npm publish automation (done manually first time)

[+123 bytes not shown — read .cleargate/delivery/archive/EPIC-000_CLI_Package_Scaffold.md]

## Architecture rules
- Package path: cleargate-cli/ (sibling of mcp/ and admin/).
- Published as @cleargate/cli (scoped).
- Three usage modes supported: npx one-off, local devDep, global install.
- Zero business logic in EPIC-000 — pure scaffold and shared plumbing.
- TypeScript strict. Built with tsup (fast, works out of the box for Node CLIs).
- Binary entry: bin/cleargate → dist/cli.js with #!/usr/bin/env node shebang.

## Decisions
1. **Build tool** — **Resolved:** tsup. Fast, zero-config for Node CLIs, emits ESM + CJS.
2. **CLI argument lib** — **Resolved:** Commander. Mature, typed, small footprint.
3. **Keychain library** — **Resolved:** verify at implementation time. Target: prebuilt binaries for Node 22 on macOS + Linux. Candidates: `keytar`, `@napi-rs/keyring`. Pick whichever builds cleanly.
4. **Config precedence** — **Resolved:** CLI flags > env vars > `~/.cleargate/config.json` > defaults.
5.

[+259 bytes not shown — read .cleargate/delivery/archive/EPIC-000_CLI_Package_Scaffold.md]

<!-- BEGIN relations -->
## Relations
- Parent: none
- Children (4): [[STORY-000-01]], [[STORY-000-02]], [[STORY-000-03]], [[STORY-000-04]]
- Cited by (1): [[EPIC-002]]
<!-- END relations -->
