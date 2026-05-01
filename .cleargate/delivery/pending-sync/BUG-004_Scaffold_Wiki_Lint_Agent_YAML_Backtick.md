---
bug_id: BUG-004
parent_ref: EPIC-018
parent_cleargate_id: EPIC-018
sprint_cleargate_id: SPRINT-12
status: Draft
severity: P2-Medium
reporter: sandro (via QA STORY-018-05)
approved: false
created_at: 2026-04-25T00:00:00Z
updated_at: 2026-04-25T00:00:00Z
created_at_version: strategy-phase-pre-init
updated_at_version: strategy-phase-pre-init
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-05-01T19:44:21Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
draft_tokens:
  input: 2061
  output: 1033718
  cache_creation: 6303363
  cache_read: 70122563
  model: <synthetic>,claude-opus-4-7, claude-opus-4-7
  last_stamp: 2026-05-01T19:44:17Z
  sessions:
    - session: b01e84b6-4e1a-42fc-95df-09aba928f166
      model: <synthetic>,claude-opus-4-7, claude-opus-4-7
      input: 2061
      output: 1033718
      cache_read: 70122563
      cache_creation: 6303363
      ts: 2026-04-30T06:26:39Z
    - session: 38f336f0-4722-4213-91ae-13ec63702623
      model: <synthetic>,claude-opus-4-7
      input: 0
      output: 0
      cache_read: 0
      cache_creation: 0
      ts: 2026-04-30T15:49:49Z
    - session: a5fe9811-3bef-44f1-b9c3-bf3121e9594b
      model: <synthetic>,claude-opus-4-7, claude-opus-4-7
      input: 0
      output: 0
      cache_read: 0
      cache_creation: 0
      ts: 2026-04-30T16:49:00Z
    - session: 313615e8-3686-4bc4-9c1b-cf27cf3913d2
      model: claude-opus-4-7
      input: 0
      output: 0
      cache_read: 0
      cache_creation: 0
      ts: 2026-05-01T05:55:18Z
    - session: 7585ce22-2277-4caf-ad49-b127f3455ea2
      model: claude-opus-4-7
      input: 0
      output: 0
      cache_read: 0
      cache_creation: 0
      ts: 2026-05-01T06:12:40Z
    - session: b1b93311-7c24-4370-964a-182a74879391
      model: <synthetic>,claude-opus-4-7
      input: 0
      output: 0
      cache_read: 0
      cache_creation: 0
      ts: 2026-05-01T10:52:07Z
    - session: 42bd30eb-614b-4718-aae7-1aa48a7674dd
      model: <synthetic>,claude-opus-4-7, claude-opus-4-7
      input: 0
      output: 0
      cache_read: 0
      cache_creation: 0
      ts: 2026-05-01T11:40:26Z
    - session: 9ec729a0-a1c1-45a6-8414-d2cc1318768e
      model: claude-opus-4-7
      input: 0
      output: 0
      cache_read: 0
      cache_creation: 0
      ts: 2026-05-01T19:03:45Z
---

# BUG-004: Scaffold `cleargate-wiki-lint.md` Frontmatter YAML Backtick Breaks Strict Parser

## 1. The Anomaly (Expected vs. Actual)

**Expected Behavior:**
All scaffolded agent-definition files under `cleargate-planning/.claude/agents/*.md` should have valid YAML frontmatter that parses cleanly under `js-yaml` CORE_SCHEMA. Downstream consumers who introspect agent metadata (for example, STORY-018-05's `assertMdFilesParseClean` in the foreign-repo integration test) need to load the frontmatter without swallowing exceptions.

**Actual Behavior:**
`cleargate-planning/.claude/agents/cleargate-wiki-lint.md` has a `description:` field whose value contains an unquoted backtick, which `js-yaml` CORE_SCHEMA interprets as the start of a complex scalar and throws `YAMLException: bad indentation of a mapping entry`.

## 2. Reproduction Protocol

- **Step 1 — Position at repo root.** `cd <repo-root>`.
- **Step 2 — Attempt YAML parse of the offending agent frontmatter.** Run `node -e "const y=require('js-yaml');const fs=require('fs');const t=fs.readFileSync('cleargate-planning/.claude/agents/cleargate-wiki-lint.md','utf8');const fm=t.match(/^---\n([\s\S]*?)\n---/)[1];y.load(fm);"` — throws `YAMLException: bad indentation of a mapping entry`.
- **Step 3 — Confirm peer agent files parse cleanly.** The same load works for `architect.md`, `developer.md`, `qa.md`, `reporter.md` etc., so the defect is isolated to `cleargate-wiki-lint.md`'s `description:` value.

## 3. Evidence & Context

Surfaced by STORY-018-05 QA (2026-04-25). The foreign-repo integration test's `assertMdFilesParseClean` helper was scoped to `.cleargate/` only — explicitly excluding `.claude/agents/*.md` — because this one file's frontmatter throws. See SPRINT-12 REPORT §"What the loop got right" ("Foreign-repo test caught a real scaffold bug while staying in scope").

Specific trigger: a backtick appearing unquoted in the `description:` value. Example line shape (approximate — the developer agent did not capture the exact bytes):

```yaml
description: ... `cleargate wiki lint` ...
```

The backtick opens a YAML plain-scalar context that the parser cannot close on the same line. Quoting (`description: "... \`cleargate wiki lint\` ..."`) or escaping the backtick resolves the issue.

## 4. Execution Sandbox (Suspected Blast Radius)

**Investigate / Modify:**
- `cleargate-planning/.claude/agents/cleargate-wiki-lint.md` — the single defective file.
- Also grep sibling agent files under `cleargate-planning/.claude/agents/` for additional unquoted backticks in `description:` — preventative scan.
- After fix: widen STORY-018-05's `assertMdFilesParseClean` scope to include `.claude/agents/*.md` in the foreign-repo integration test, to prevent regression.

**Do NOT modify:**
- Any `cleargate-cli/` source — this is a scaffold content issue, not a parser/loader bug.
- Other agent files unless the preventative scan finds similar issues.

## 5. Verification Protocol (The Failing Test)

**Before fix (expected to fail):**
```bash
node -e "const y=require('js-yaml');const fs=require('fs');const t=fs.readFileSync('cleargate-planning/.claude/agents/cleargate-wiki-lint.md','utf8');const fm=t.match(/^---\n([\s\S]*?)\n---/)[1];try{y.load(fm);console.log('PASS');}catch(e){console.error('FAIL:',e.message);process.exit(1);}"
```

**After fix (must pass):** same command prints `PASS` and exits 0.

**Regression test:** widen `assertMdFilesParseClean` in `cleargate-cli/test/integration/foreign-repo.test.ts` to cover `.claude/agents/*.md`. The test fails before this bug is fixed and passes after.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity**

All requirements concrete; reproduction deterministic; fix is a 1-line frontmatter edit + a scope-widening test edit.

Requirements to pass to Green:
- [ ] `approved: true` set.
