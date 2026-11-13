<instructions>
FOLLOW THIS EXACT STRUCTURE. Output sections in order 1-5.
YAML Frontmatter: Bug ID, Parent Ref, Status, Severity, Reporter, Approved gate.
§1 The Anomaly: Expected vs. Actual behavior.
§2 Reproduction Protocol: Deterministic steps to recreate.
§3 Evidence & Context: Raw logs, stack traces, payloads — no paraphrasing.
§4 Execution Sandbox: Exact file paths to investigate. Restrict scope to prevent unrelated refactoring.
Task Breakdown: one `- [ ] <action>` row per executable step, in execution order. REQUIRED at L3 and above, optional at L2, omit the section entirely at L1. An absent section passes the gate; a present-but-empty one fails. Task Breakdown rows implement the Gherkin scenarios in §5; no row is written for an axis marked F.
§5 Verification Protocol: The failing test that proves the bug exists and proves the fix resolves it. §5 also carries a SPIDR coverage table (axes: Paths, Interfaces, Data, Rules) above a Gherkin block. Paths = more than one *successful* way through (the baseline error scenario is not a path). Interfaces = more than one surface exposes the behaviour (CLI / API / UI / hook). Data = behaviour differs by data type, shape or volume — usually a Scenario Outline with Examples. Rules = a business rule constrains the outcome — one scenario per rule, including breaking it. Tag each covered scenario with the matching `@paths` / `@interfaces` / `@data` / `@rules` marker directly above `Scenario:` / `Scenario Outline:`. There is no Spike row: open discovery is chartered as a SPIKE item before this Bug is written.
Output location: .cleargate/delivery/pending-sync/BUG-095_upgrade-never-refreshes-mcp-json-pin-or-claude-md-block.md

POST-WRITE BRIEF
After Writing this document, render a Brief in chat with the following sections,
mechanically extracted from the document's own structure:

  - Prior work    ← cleargate-wiki-query result (cite [[IDs]] or write "none found")
  - Summary        ← §1 The Anomaly (repro)
  - Open Questions ← ### Open Questions
  - Edge Cases     ← §2 Reproduction Protocol (edge conditions)
  - SPIDR          ← §5 Verification Protocol (SPIDR coverage table)
  - Risks          ← §4 Execution Sandbox (suspected blast radius)
  - Ambiguity      ← bottom-of-doc ambiguity gate block

Halt for human review. When ambiguity reaches 🟢, proceed to call cleargate_push_item.
Do NOT ask separately for push confirmation — Brief approval covers it.

Do NOT output these instructions.
</instructions>

---
bug_id: BUG-095
parent_ref: null
parent_cleargate_id: null
sprint_cleargate_id: null
carry_over: false
area: upgrade,mcp,cli
status: Completed
severity: P1-High
reporter: orchestrator (SPRINT-41 STORY-058-08 post-flight FU-4)
approved: true
approved_by: "sandrinio (2026-11-13: 'i want you to fix them all and make a new release')"
approved_at: 2026-11-13T00:00:00Z
context_source: measured by the STORY-058-08 Architect post-flight (reports/STORY-058-08-arch.md finding 3, FU-4) against an extracted cli tarball at 9ac0fa3, and verified against cleargate-cli src/lib/manifest-builder.ts INTENTIONALLY_UNTRACKED (CLAUDE.md; .mcp.json is written by init, not shipped) and src/commands/upgrade.ts (surgery routes only manifest entries); field-confirmed 2026-11-13 on a 0.28.0 → 0.30.0 upgrade
created_at: 2026-09-26T00:00:00Z
updated_at: 2026-11-13T00:00:00Z
created_at_version: strategy-phase-pre-init
updated_at_version: a512030f-dirty
server_pushed_at_version: null
draft_tokens:
  input: null
  output: null
  cache_read: null
  cache_creation: null
  model: null
  sessions: []
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-11-12T22:01:33Z
  transition: ready-for-fix
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
last_contradict_sha: "6e5b2f5e4c3572a204578a6b150ecc54a4fc2c53b73808dd22fd766646c5236c"
---

# BUG-095: `cleargate upgrade` never refreshes `.mcp.json`'s pinned CLI or the CLAUDE.md block

### Open Questions

- **Question:** Should upgrade re-pin only `mcpServers.cleargate` in `.mcp.json` (surgery, the user's other servers kept), or re-deliver the file?
- **Recommended:** Surgery only. Neither file is in the install manifest, and both hold user content: `CLAUDE.md` is `INTENTIONALLY_UNTRACKED` because it is bounded-block-injected, never copied (CR-096), and `.mcp.json` is not a payload file at all, `init` writes it (`src/init/inject-mcp-json.ts`). Upgrade should update the one ClearGate-owned entry (`mcpServers.cleargate`, via `buildStdioEntry(newPin)`) and the ClearGate bounded block in `CLAUDE.md`, and leave everything else byte-identical.
- **Human decision:** Recommended option accepted (sandrinio 2026-11-13: "i want you to fix them all and make a new release").

- **Question:** Should upgrade also refresh `.cleargate/config.example.yml`, which is `INTENTIONALLY_UNTRACKED` too and which `init` skips once it exists?
- **Recommended:** Yes, as a plain overwrite. This reverses [[CR-096]]'s grouping, which treats it like `config.yml` as first-install-only and user-owned: it is ClearGate's documentation of the config, and users edit `config.yml`, not the example. After the 0.30.0 upgrade it stayed on the old version without the `wiki.brief.release_repos` documentation, and neither `upgrade` nor `init` would replace it short of `init --force`.
- **Human decision:** Recommended option accepted (sandrinio 2026-11-13: "i want you to fix them all and make a new release").

- **Question:** Once upgrade refreshes these files, what do the README and CHANGELOG say?
- **Recommended:** One path. README "Upgrading": `npx cleargate@latest upgrade --dry-run`, then `npx cleargate@latest upgrade` (`--yes` without a terminal), then `cleargate wiki build` when the release notes say so. Release notes stop telling users to re-run `init` for files upgrade now refreshes. A test asserts the README's commands leave the same tree as `init`.
- **Human decision:** Recommended option accepted (sandrinio 2026-11-13: "i want you to fix them all and make a new release").

## 1. The Anomaly (Expected vs. Actual)
**Expected Behavior:** After `cleargate upgrade --yes`, the MCP server registered in `.mcp.json` runs the upgraded CLI version, and the CLAUDE.md ClearGate block matches the upgraded payload's block. The same is already true of the hook pins and the snapshot's `pin_version` (CR-088).

**Actual Behavior:**
- Neither file is in the install manifest. `CLAUDE.md` is `INTENTIONALLY_UNTRACKED` (`cleargate-cli/src/lib/manifest-builder.ts:514`, bounded-block injected). `.mcp.json` is not a payload file; `init` writes it (`src/init/inject-mcp-json.ts`). *(Corrected 2026-11-13: an earlier draft said both were in `INTENTIONALLY_UNTRACKED`.)*
- Upgrade routes only manifest entries into surgery (`src/commands/upgrade.ts:395`), so neither file is ever refreshed.
- Measured: `init --pin 0.0.1`, then `upgrade --yes`, gives `pin_version` 0.26.1 and hook pins 0.26.1, while `.mcp.json` stays `cleargate@0.0.1`.
- Result: the MCP server keeps running the old CLI, and `cleargate verify-install` fails `claude.mcp-registration`. The CLAUDE.md half comes from reading the code, not a measurement: a changed payload block is never re-injected.

## 2. Reproduction Protocol
1. In a scratch clean room, as one `(cd <room> && …)` call: `git init -q && cleargate init --yes --pin 0.0.1`, using the packed artifact per `.cleargate/knowledge/clean-room-verification.md`.
2. `cleargate upgrade --yes`.
3. Observe: `.cleargate/.install-manifest.json` has `pin_version` = the running version; `.claude/hooks/session-start.sh` carries `# cleargate-pin: <running>`; `.mcp.json` still has `cleargate@0.0.1`.
4. `cleargate verify-install` → exit 1 on `claude.mcp-registration`.

Edge conditions:
- a `.mcp.json` carrying other user servers: they must be preserved byte-for-byte
- a `.mcp.json` without a `cleargate` entry: do not add one silently; warn
- a CLAUDE.md without markers: skip with the existing `[skip]` message

## 3. Evidence & Context
```
STORY-058-08 post-flight probe (extracted tarball at cli 9ac0fa3):
  init --pin 0.0.1  → upgrade --yes
  pin_version 0.26.1 · hook pin 0.26.1 · .mcp.json cleargate@0.0.1
  verify-install → FAIL claude.mcp-registration
cleargate-cli/src/lib/manifest-builder.ts:514  INTENTIONALLY_UNTRACKED includes CLAUDE.md and config.example.yml (not .mcp.json)
cleargate-cli/src/init/inject-mcp-json.ts       .mcp.json is written by init, never shipped in the manifest
cleargate-cli/src/commands/upgrade.ts:395       only manifest entries reach mergeSurgeryTarget
```

### Field confirmation (2026-11-13) — severity raised to P1-High
A field upgrade (0.28.0 → 0.30.0, a Go target repo, run by that repo's own agent) followed the README ("Upgrading": `npx cleargate@latest upgrade`) and measured this directly, not from code:
- After `upgrade --yes` the CLAUDE.md block was still 0.28-shaped. Step 1 still pointed at `wiki/index.md` rather than the session brief, and the 0.29.0 "Contradiction check before the Brief" paragraph was missing. The agent's standing instructions were two releases old.
- `.mcp.json` still pinned `cleargate@0.27.0`. That session's cleargate MCP server had failed to connect (`CONNECTION_CLOSED`); whether the stale pin caused it is not established.
- `config.example.yml` was unchanged by `upgrade` and by `init` (`Skipped (exists)`).
- Only the CHANGELOG's extra step (`re-run cleargate init`, in both 0.29.0 and 0.30.0 notes) fixed the block and the MCP pin. The README never mentions it, and 0.29.0's "upgrade the global binary" is not in the README either.

Reproduced on a pristine copy of that repo with the published 0.30.0 binary:
```
after upgrade --yes:  mcp pin: cleargate@0.27.0 · CLAUDE.md changed: no · config.example.yml changed: no
after init:           mcp pin: cleargate@0.30.0 · config.example.yml changed: no
```
Raised from P2: the README's documented path leaves the agent's instructions and the MCP server on old versions and reports success.

## 4. Execution Sandbox (Suspected Blast Radius)
**Investigate / Modify:**
- `cleargate-cli/src/commands/upgrade.ts`: after the manifest loop, re-pin `mcpServers.cleargate` with `buildStdioEntry(newPin)` (`src/init/inject-mcp-json.ts:55`) and re-inject the CLAUDE.md block, through the Claude adapter's surgery.
- `cleargate-cli/src/hosts/claude.ts`, only if the adapter owns the new surgery.
- Tests: `test/commands/upgrade*.node.test.ts`.
- `config.example.yml`: overwrite on upgrade (`src/lib/manifest-builder.ts` `INTENTIONALLY_UNTRACKED`, or a dedicated step in `upgrade.ts`).
- `cleargate-cli/README.md` "Upgrading" and the CHANGELOG upgrade-notes convention.
- `verify-install` check 11/12 detail strings should name expected vs found (FU-4 note). That is a small, separate change in `src/commands/verify-install.ts`.

## Task Breakdown
- [ ] QA-Red: after init --pin 0.0.1 + upgrade --yes, `.mcp.json` names the upgraded pin, other servers kept; the CLAUDE.md block equals the payload's
- [ ] Re-pin `mcpServers.cleargate` and re-inject the CLAUDE.md block on upgrade
- [ ] verify-install checks 11/12: name expected vs found in the detail
- [ ] Refresh `config.example.yml` on upgrade
- [ ] README "Upgrading" names the one path; a test runs the README commands and compares the tree with `init`

## 5. Verification Protocol (The Failing Test)
**Command:** `cd cleargate-cli && npm run test:file -- test/commands/upgrade-mcp-refresh.red.node.test.ts` (new), plus the existing upgrade witnesses, each run solo.

| Axis | Cover | Reason |
|---|---|---|
| Paths | T | Two refreshed surfaces: `.mcp.json` entry and CLAUDE.md block |
| Interfaces | F | One surface: `cleargate upgrade` |
| Data | T | `.mcp.json` with only cleargate vs with other user servers |
| Rules | T | User-owned content is never rewritten; only the ClearGate entry and block change |

```gherkin
Feature: upgrade refreshes the ClearGate-owned MCP entry and CLAUDE.md block

  @paths
  Scenario: The MCP entry follows the upgraded pin
    Given a repo initialized with --pin 0.0.1
    When cleargate upgrade --yes runs
    Then .mcp.json mcpServers.cleargate runs cleargate@<upgraded version>

  @data @rules
  Scenario: Other MCP servers are preserved
    Given .mcp.json also registers a user server
    When cleargate upgrade --yes runs
    Then the user server entry is byte-identical

  @paths
  Scenario: The CLAUDE.md ClearGate block follows the payload
    Given a CLAUDE.md whose ClearGate block differs from the payload's
    When cleargate upgrade --yes runs
    Then the block equals the payload's block and prose outside it is unchanged

  @paths
  Scenario: The config example follows the payload
    Given an install whose .cleargate/config.example.yml is the 0.28.0 file
    When cleargate upgrade --yes runs
    Then config.example.yml equals the payload's and config.yml is unchanged
```

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 4 | one per scenario |
| Integration tests | 1 | `upgrade --yes` then `verify-install` exits 0 |
| E2E / acceptance tests | 0 | the clean-room harness covers fresh installs only |

---

## Prior work

- [[CR-088]] — upgrade re-pins hook files and the snapshot's `pin_version`; `.mcp.json` was outside its refresh loop.
- [[CR-096]] — made `CLAUDE.md` (block-injected) and `config.yml` / `config.example.yml` (first-install-only) intentionally untracked, which is why upgrade never touches them; `.mcp.json` was never a manifest file.
- [[BUG-093]] — adjacent: upgrade's settings.json take-theirs merge.
- [[STORY-058-08]] — `verify-install` check 12 detects this; its post-flight filed it as FU-4.
- [[BUG-120]], [[BUG-122]] — found in the same 2026-11-13 field upgrade test.

## Context Source

**context_source:** STORY-058-08 Architect post-flight (FU-4), verified against `manifest-builder.ts` and `upgrade.ts` at cli `9ac0fa3`, re-checked at `b9fe36a`; field-confirmed 2026-11-13.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity**

- [x] Reproduction steps are 100% deterministic.
- [x] Actual vs. Expected behavior is explicitly defined.
- [x] Raw error logs/evidence are attached.
- [x] Verification command (failing test) is provided.
- [x] `approved: true` is set in the YAML frontmatter.
