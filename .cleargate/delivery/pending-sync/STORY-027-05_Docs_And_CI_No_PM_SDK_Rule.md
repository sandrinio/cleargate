---
story_id: STORY-027-05
parent_epic_ref: EPIC-027
parent_cleargate_id: EPIC-027
sprint_cleargate_id: SPRINT-27
carry_over: false
status: Draft
ambiguity: 🟢 Low
context_source: |
  EPIC-027 §2 Scope (Document RESERVED_PAYLOAD_KEYS + open-type + minimum-contract
  in cleargate-protocol.md + CLAUDE.md; CI no-PM-SDK grep rule script) + §5
  Scenario 14 (CI build fails on forbidden PM-SDK import). SPRINT-27 §1 row
  STORY-027-05 (fast lane, low bounce exposure) + §2.4 Lane Audit
  fast-lane justification (7 checks: ≤2 files ≤50 LOC, no forbidden surfaces,
  no new dep, one Gherkin against CI rule, no runtime change, low
  bounce-exposure, no epic-spanning subsystem). §2.5 ADR flag: locks an
  architectural rule once shipped (CI-enforced invariant).
actor: Developer / CI pipeline / future adapter authors reading cleargate-protocol.md
complexity_label: L1
parallel_eligible: y
expected_bounce_exposure: low
lane: fast
area: docs,ci,architecture
created_at: 2026-05-15T00:00:00Z
updated_at: 2026-05-14T00:00:00Z
created_at_version: cleargate@0.11.5
updated_at_version: cleargate@0.11.5
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-05-14T21:05:41Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id STORY-027-05
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-05-14T21:22:39Z
  sessions: []
---

# STORY-027-05: Docs (Protocol + CLAUDE.md) + CI No-PM-SDK Grep Rule
**Complexity:** L1 — doc edits (3 H2 sections across 2 files) + one ≤30 LOC Node grep script + one CI invocation. Lane: **fast** — passes all 7 lane-rubric checks.

**Lane: `fast`** — (1) ≤2 doc files + 1 script ≤30 LOC ✓; (2) no forbidden surfaces — `scripts/` is not auth/db/config/adapter ✓; (3) no new dep — pure Node fs/path/process ✓; (4) one Gherkin scenario ✓; (5) no runtime change ✓; (6) low bounce-exposure ✓; (7) no epic-spanning subsystem (doc + CI) ✓.

## 1. The Spec (The Contract)

### 1.1 User Story
As a future adapter author or new ClearGate developer reading `cleargate-protocol.md`, I want one authoritative section explaining the type-and-payload contract, the codebase/PM-tool SDK boundary rule, and the audit-trail conventions, so that I can implement a new Jira/Linear/Azure adapter without spelunking the source — and so that the CI pipeline catches the boundary violation if I accidentally import a PM-tool SDK into `cleargate-cli/` or `.claude/`.

### 1.2 Detailed Requirements
- R1: Add a new H2 section `## Type & Payload Contract` to `.cleargate/knowledge/cleargate-protocol.md`. Content:
  - Document the open-type validator: `z.string().min(1).max(64).regex(/^[a-z][a-z0-9_-]*$/)` post-normalize.
  - List `KNOWN_TYPES` (8 entries: 6 legacy + sprint + sprint_report) as the advisory registry.
  - Document `RESERVED_PAYLOAD_KEYS` (5 entries) — explain why callers must not set them.
  - Document the minimum payload contract: `cleargate_id` + `type` required; `title` + `status` recommended (L2 warning if missing).
  - Document the `payload.origin` convention: `cleargate-cli` triggers gates; `adapter:<vendor>` / `system:<service>` bypass.
  - Document the two valid `cleargate_id` formats (TYPE-NNN or 5-digit numeric).
  - Document the L1 errorCode taxonomy (7 codes) + L2 warningCode taxonomy (3 codes) with the `{code, message, hint}` and `{code, message, field?}` shapes.
- R2: Add a new H2 section `## Codebase / PM-Tool Boundary` to `.cleargate/knowledge/cleargate-protocol.md`. Content:
  - Rule: `cleargate-cli/src/**` and `.claude/**` MUST NOT import any PM-tool SDK.
  - Forbidden patterns: `@linear/sdk`, `jira-client`, `azure-devops`, `@atlassian/`, `linear-sdk`, `node-jira-client`, `jira.js`.
  - PM-tool adapters live exclusively at `mcp/src/adapters/`. Credentials live in admin DB rows, configured via admin console UI.
  - CI enforcement: `scripts/ci-no-pm-sdk.mjs` greps the CLI + .claude surfaces; CI fails on any match.
- R3: Add one paragraph to the `## 🔄 ClearGate Planning Framework` block in `CLAUDE.md` (the bounded-block-injected section) summarizing R1 + R2 in three sentences. Cross-references `cleargate-protocol.md` for full detail. Keep the addition under 200 words to respect the bounded-block budget.
- R4: Edit `cleargate-planning/CLAUDE.md` (canonical) AND `CLAUDE.md` (live) in identical ways — bounded block parity. Confirm with diff after edit. Remind future devs to re-sync via `cleargate init` in target repos.
- R5: Create `scripts/ci-no-pm-sdk.mjs` (root-level scripts/, not `cleargate-cli/scripts/`):
  - Glob `cleargate-cli/src/**/*.ts` + `.claude/**/*.{ts,sh,md}`.
  - For each file, check for forbidden-pattern matches.
  - Skip imports in comments (line starting with `//` or inside `/* */`).
  - On any match: print `❌ <file>:<line>: forbidden import '<pattern>' — see cleargate-protocol.md §Codebase/PM-Tool Boundary`. Exit 1.
  - Zero matches → print `✓ no forbidden PM-SDK imports` and exit 0.
- R6: Wire the script into `package.json` root scripts: `"check:no-pm-sdk": "node scripts/ci-no-pm-sdk.mjs"`. Add `check:no-pm-sdk` to the existing `npm run check` target if such a target exists, otherwise document the standalone invocation in the new script's README block.
- R7: Update `mcp/src/db/schema.ts:92` (`type` column vocabulary comment) to read `// Open vocabulary: lowercase-kebab (1-64 chars, /^[a-z][a-z0-9_-]*$/ after normalize). See KNOWN_TYPES in mcp/src/lib/payload-contract.ts for advisory registry.` — one-line comment fix only; not a schema change.

### 1.3 Out of Scope
- Implementing the `cleargate lint` command — STORY-027-06 / SPRINT-28.
- Building the `@cleargate/types` npm package — STORY-027-07 / SPRINT-28.
- Documenting adapter implementation patterns (Jira/Linear/Azure) — separate epic when those adapters get built.
- Wiring the CI script into GitHub Actions YAML or any specific CI runner config — `package.json` script is the contract; runner integration is a follow-up.

### 1.4 Open Questions

> No EPIC-027 §6 questions are open for this story. All design decisions are derivative of -01..-04 contracts.

### 1.5 Risks
- **Risk:** CLAUDE.md bounded-block addition exceeds the "200 words" budget and inflates new-repo `cleargate init` overhead.
- **Mitigation:** Strict word count enforced in §3. Cross-reference to protocol doc keeps the bounded block tight.

- **Risk:** Forbidden-pattern list (R5) misses a PM-SDK variant (e.g., `linear/sdk` without the @ prefix).
- **Mitigation:** Pattern list designed defensively (7 variants covering the three major vendors + common alt-package names). Add a comment in the script inviting future devs to extend.

- **Risk:** `.claude/**` includes a path where a hypothetical future feature legitimately needs to load a JSON/text fixture mentioning a PM tool name (false positive).
- **Mitigation:** Script greps for `import` statements specifically (`/^\s*(import|from)\s+['"][^'"]*<pattern>/m`), not free-form mentions. Comments and string literals not in import position pass.

## 2. The Truth (Executable Tests)

### 2.1 Acceptance Criteria (Gherkin)

```gherkin
Feature: Docs + CI no-PM-SDK rule

  Scenario: CI build fails on forbidden PM-SDK import in CLI
    Given a developer adds "import { LinearClient } from '@linear/sdk'" to cleargate-cli/src/foo.ts
    When CI runs `node scripts/ci-no-pm-sdk.mjs`
    Then the script exits 1
    And stdout contains "❌ cleargate-cli/src/foo.ts:<line>: forbidden import '@linear/sdk'"
    And the error references "cleargate-protocol.md §Codebase/PM-Tool Boundary"

  Scenario: CI build fails on forbidden jira-client import in .claude hooks
    Given a developer adds "import jira from 'jira-client'" to .claude/hooks/foo.sh (or .ts shim)
    When CI runs `node scripts/ci-no-pm-sdk.mjs`
    Then the script exits 1
    And stdout names the file and pattern

  Scenario: CI build passes on adapter file in mcp/src/adapters
    Given mcp/src/adapters/linear-adapter.ts contains "import { LinearClient } from '@linear/sdk'"
    When CI runs `node scripts/ci-no-pm-sdk.mjs`
    Then the script exits 0
    And the adapter file is not scanned (excluded by glob)

  Scenario: Comment mention of forbidden pattern not flagged
    Given cleargate-cli/src/bar.ts has the line "// previously used @linear/sdk; now uses MCP"
    When CI runs `node scripts/ci-no-pm-sdk.mjs`
    Then the script exits 0 (comment is not an import statement)

  Scenario: cleargate-protocol.md has Type & Payload Contract section
    Given STORY-027-05 has merged
    When reading .cleargate/knowledge/cleargate-protocol.md
    Then "## Type & Payload Contract" H2 section is present
    And it documents KNOWN_TYPES, RESERVED_PAYLOAD_KEYS, payload.origin, cleargate_id formats, errorCode + warningCode taxonomies

  Scenario: cleargate-protocol.md has Codebase / PM-Tool Boundary section
    Given STORY-027-05 has merged
    When reading .cleargate/knowledge/cleargate-protocol.md
    Then "## Codebase / PM-Tool Boundary" H2 section is present
    And it names cleargate-cli/src/**, .claude/**, mcp/src/adapters/

  Scenario: CLAUDE.md bounded block summarizes the rule
    Given STORY-027-05 has merged
    When reading the bounded block in CLAUDE.md
    Then it contains a sentence referencing the open-type rule, the codebase/PM-tool boundary, and a cross-reference to cleargate-protocol.md
    And the addition is under 200 words

  Scenario: package.json exposes check:no-pm-sdk script
    Given STORY-027-05 has merged
    When reading package.json scripts
    Then "check:no-pm-sdk" maps to "node scripts/ci-no-pm-sdk.mjs"

  Scenario: schema.ts type-column comment updated
    Given STORY-027-05 has merged
    When reading mcp/src/db/schema.ts line ~92
    Then the comment says "Open vocabulary: lowercase-kebab" and references KNOWN_TYPES location
```

### 2.2 Verification Steps (Manual)
- [ ] `node scripts/ci-no-pm-sdk.mjs` on clean tree exits 0.
- [ ] Temporarily add `import x from '@linear/sdk';` to `cleargate-cli/src/index.ts` → script exits 1 with the file + pattern named. Revert.
- [ ] `diff cleargate-planning/CLAUDE.md CLAUDE.md` shows the bounded block matches (or differs only in outside-bounded-block content).
- [ ] Word-count the CLAUDE.md added paragraph: `wc -w` ≤ 200.

## 3. The Implementation Guide

### 3.1 Context & Files

| Item | Value |
|---|---|
| Primary File | `.cleargate/knowledge/cleargate-protocol.md` |
| Related Files | `CLAUDE.md`, `cleargate-planning/CLAUDE.md`, `mcp/src/db/schema.ts`, `package.json` |
| New Files Needed | Yes — `scripts/ci-no-pm-sdk.mjs` (~30 LOC) |
| Test Files | `scripts/ci-no-pm-sdk.node.test.ts` (1 test file with 4 scenarios) |

### 3.2 Technical Logic

1. **`scripts/ci-no-pm-sdk.mjs`** — minimal Node script:
   ```js
   #!/usr/bin/env node
   import { readFileSync } from 'node:fs';
   import { globSync } from 'node:fs'; // or fast-glob if globSync absent in target Node version
   const PATTERNS = ['@linear/sdk', 'jira-client', 'azure-devops', '@atlassian/', 'linear-sdk', 'node-jira-client', 'jira.js'];
   const FILES = globSync(['cleargate-cli/src/**/*.ts', '.claude/**/*.{ts,sh,md}']);
   let hits = 0;
   for (const file of FILES) {
     const content = readFileSync(file, 'utf8');
     const lines = content.split('\n');
     for (let i = 0; i < lines.length; i++) {
       const line = lines[i];
       if (line.trim().startsWith('//')) continue;
       for (const pattern of PATTERNS) {
         const importRe = new RegExp(`^\\s*(import|from)\\s+['"][^'"]*${pattern.replace(/[/\.]/g, '\\$&')}`);
         if (importRe.test(line) || (/^\s*(import|require)\b.*['"][^'"]*$/.test(line) && line.includes(pattern))) {
           console.log(`❌ ${file}:${i + 1}: forbidden import '${pattern}' — see cleargate-protocol.md §Codebase/PM-Tool Boundary`);
           hits++;
         }
       }
     }
   }
   if (hits === 0) { console.log('✓ no forbidden PM-SDK imports'); process.exit(0); }
   process.exit(1);
   ```
   (Architect M-plan refines exact regex; Developer may simplify if globSync API choice changes.)

2. **`cleargate-protocol.md` edits:** Append two H2 sections at the end of the file (or insert alphabetically; verify existing structure during dev). Content per R1 + R2.

3. **`CLAUDE.md` edits:** Locate the bounded block (`<!-- CLEARGATE:START --> ... <!-- CLEARGATE:END -->`) inside the `## 🔄 ClearGate Planning Framework` section. Insert one paragraph (under 200 words) just before the **Project overrides.** paragraph. Mirror identically in `cleargate-planning/CLAUDE.md`.

4. **`schema.ts` comment fix:** One-line edit at line ~92. No schema change.

5. **`package.json` script:** Add `"check:no-pm-sdk": "node scripts/ci-no-pm-sdk.mjs"` to the root-level `scripts` object. If a `"check"` aggregate exists, append `&& npm run check:no-pm-sdk`.

### 3.3 API Contract

Not applicable — docs + CI script only.

## 4. Quality Gates

### 4.1 Minimum Test Expectations

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit/script tests | 4 | One per CI-script Gherkin scenario (forbidden CLI hit, forbidden .claude hit, adapter file allowed, comment not flagged) |
| Doc-existence tests | 3 | Grep tests asserting H2 sections present in protocol.md, CLAUDE.md word count ≤200, schema.ts comment updated |

### 4.2 Definition of Done
- [ ] All 9 §2.1 Gherkin scenarios green (4 script + 5 doc-state).
- [ ] `scripts/ci-no-pm-sdk.mjs` exists, exits 0 on clean tree.
- [ ] `cleargate-protocol.md` has both new H2 sections.
- [ ] `CLAUDE.md` bounded block + `cleargate-planning/CLAUDE.md` bounded block identical and ≤200 added words.
- [ ] `mcp/src/db/schema.ts:92` comment updated.
- [ ] `package.json` exposes `check:no-pm-sdk` script.
- [ ] `npm run check:no-pm-sdk` exit code 0 on main tree.
- [ ] Pre-commit hook clean.

## Existing Surfaces

> L1 reuse audit. Source-tree implementations this story extends. The new CI script is documented in §3.

- **Surface:** `.cleargate/knowledge/cleargate-protocol.md` — existing protocol doc with multiple H2 sections; new sections appended/inserted into the existing structure.
- **Surface:** `CLAUDE.md` — existing bounded-block injection target inside the ClearGate Planning Framework section; one paragraph added.
- **Surface:** `cleargate-planning/CLAUDE.md` — canonical mirror of the bounded block; same paragraph added.
- **Surface:** `mcp/src/db/schema.ts` line ~92 — existing items table type-column with vocabulary comment; one-line comment update.
- **Surface:** `package.json` — root scripts object extended with one entry.
- **Surface:** `cleargate-cli/scripts/copy-planning-payload.mjs` — sibling Node script; same authoring style (no dependency, plain fs/path/glob) as the new CI script.

## Why not simpler?

> L1 right-size + justify-complexity (this is L1 — minimal justification).

- **Smallest existing surface that could carry this:** Just add the CI script and skip the doc edits — let the script's own error messages serve as the documentation.
- **Why isn't extension / parameterization / config sufficient?** A CI grep without a written rule is mysterious — when it fires, the developer reads the error, sees "forbidden import," and doesn't know WHY the rule exists or where adapter code should live instead. The protocol doc edit provides the rationale (codebase/PM-tool boundary + adapter location rule), and the CLAUDE.md cross-reference ensures AI agents reading the bounded block see the rule. Without the docs, the CI rule becomes a riddle that gets blame-pushed-around the team. The combined cost (≤200 words + ≤30 LOC script + 1 comment fix) is the minimum viable invariant.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity — Ready for Execution**

Requirements satisfied:
- [x] Gherkin scenarios cover all §1.2 requirements R1-R7 (9 scenarios).
- [x] §3 Implementation Guide cites verified file paths (cleargate-protocol.md, CLAUDE.md bounded block, schema.ts:92, package.json).
- [x] No "TBD" markers.
- [x] `## Existing Surfaces` cites 6 source-tree paths.
- [x] `## Why not simpler?` answers both sub-bullets.
- [x] Lane: fast — 7-check rationale matches SPRINT-27 §2.4 lane audit row.
