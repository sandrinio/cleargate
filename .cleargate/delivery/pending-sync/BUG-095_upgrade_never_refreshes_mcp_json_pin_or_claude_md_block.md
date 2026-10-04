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
status: Draft
severity: P2-Medium
reporter: orchestrator (SPRINT-41 STORY-058-08 post-flight FU-4)
approved: false
context_source: measured by the STORY-058-08 Architect post-flight (reports/STORY-058-08-arch.md finding 3, FU-4) against an extracted cli tarball at 9ac0fa3, and verified against cleargate-cli src/lib/manifest-builder.ts:418 (INTENTIONALLY_UNTRACKED) and src/commands/upgrade.ts:395 (surgery routes only manifest entries)
created_at: 2026-09-26T00:00:00Z
updated_at: 2026-09-26T04:49:13Z
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
  last_gate_check: 2026-09-26T04:49:13Z
  transition: ready-for-fix
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
---

# BUG-095: `cleargate upgrade` never refreshes `.mcp.json`'s pinned CLI or the CLAUDE.md block

### Open Questions

- **Question:** Should upgrade re-pin only `mcpServers.cleargate` in `.mcp.json` (surgery, the user's other servers kept), or re-deliver the file?
- **Recommended:** Surgery only. `.mcp.json` and `CLAUDE.md` are deliberately `INTENTIONALLY_UNTRACKED` because they are user-owned (CR-096). Upgrade should update the one ClearGate-owned entry (`mcpServers.cleargate`, via `buildStdioEntry(newPin)`) and the ClearGate bounded block in `CLAUDE.md`, and leave everything else byte-identical.
- **Human decision:** {pending Gate 1}

## 1. The Anomaly (Expected vs. Actual)
**Expected Behavior:** After `cleargate upgrade --yes`, the MCP server registered in `.mcp.json` runs the upgraded CLI version, and the CLAUDE.md ClearGate block matches the upgraded payload's block. The same is already true of the hook pins and the snapshot's `pin_version` (CR-088).

**Actual Behavior:**
- `.mcp.json` and `CLAUDE.md` are `INTENTIONALLY_UNTRACKED` (`cleargate-cli/src/lib/manifest-builder.ts:418`).
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
cleargate-cli/src/lib/manifest-builder.ts:418  INTENTIONALLY_UNTRACKED includes .mcp.json and CLAUDE.md
cleargate-cli/src/commands/upgrade.ts:395       only manifest entries reach mergeSurgeryTarget
```

## 4. Execution Sandbox (Suspected Blast Radius)
**Investigate / Modify:**
- `cleargate-cli/src/commands/upgrade.ts`: after the manifest loop, re-pin `mcpServers.cleargate` with `buildStdioEntry(newPin)` (`src/init/inject-mcp-json.ts:55`) and re-inject the CLAUDE.md block, through the Claude adapter's surgery.
- `cleargate-cli/src/hosts/claude.ts`, only if the adapter owns the new surgery.
- Tests: `test/commands/upgrade*.node.test.ts`.
- `verify-install` check 11/12 detail strings should name expected vs found (FU-4 note). That is a small, separate change in `src/commands/verify-install.ts`.

## Task Breakdown
- [ ] QA-Red: after init --pin 0.0.1 + upgrade --yes, `.mcp.json` names the upgraded pin, other servers kept; the CLAUDE.md block equals the payload's
- [ ] Re-pin `mcpServers.cleargate` and re-inject the CLAUDE.md block on upgrade
- [ ] verify-install checks 11/12: name expected vs found in the detail

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
```

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 3 | one per scenario |
| Integration tests | 1 | `upgrade --yes` then `verify-install` exits 0 |
| E2E / acceptance tests | 0 | the clean-room harness covers fresh installs only |

---

## Prior work

- [[CR-088]] — upgrade re-pins hook files and the snapshot's `pin_version`; `.mcp.json` was outside its refresh loop.
- [[CR-096]] — made `.mcp.json` and `CLAUDE.md` intentionally untracked (user-owned), which is why upgrade never touches them.
- [[BUG-093]] — adjacent: upgrade's settings.json take-theirs merge.
- [[STORY-058-08]] — `verify-install` check 12 detects this; its post-flight filed it as FU-4.

## Context Source

**context_source:** STORY-058-08 Architect post-flight (FU-4), verified against `manifest-builder.ts:418` and `upgrade.ts:395` at cli `9ac0fa3`.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟡 Medium Ambiguity** — the surgery-vs-redeliver question is open; approval pending.

- [x] Reproduction steps are 100% deterministic.
- [x] Actual vs. Expected behavior is explicitly defined.
- [x] Raw error logs/evidence are attached.
- [x] Verification command (failing test) is provided.
- [ ] `approved: true` is set in the YAML frontmatter.
