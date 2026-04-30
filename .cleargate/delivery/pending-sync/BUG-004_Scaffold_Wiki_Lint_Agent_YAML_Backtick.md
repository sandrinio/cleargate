---
bug_id: BUG-004
parent_ref: EPIC-018
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
  pass: false
  failing_criteria:
    - id: repro-steps-deterministic
      detail: section 2 has 0 listed-item (≥3 required)
  last_gate_check: 2026-04-24T22:00:56Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id BUG-004
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-04-24T22:00:56Z
  sessions: []
---

# BUG-004: Scaffold `cleargate-wiki-lint.md` Frontmatter YAML Backtick Breaks Strict Parser

## 1. The Anomaly (Expected vs. Actual)

**Expected Behavior:**
All scaffolded agent-definition files under `cleargate-planning/.claude/agents/*.md` should have valid YAML frontmatter that parses cleanly under `js-yaml` CORE_SCHEMA. Downstream consumers who introspect agent metadata (for example, STORY-018-05's `assertMdFilesParseClean` in the foreign-repo integration test) need to load the frontmatter without swallowing exceptions.

**Actual Behavior:**
`cleargate-planning/.claude/agents/cleargate-wiki-lint.md` has a `description:` field whose value contains an unquoted backtick, which `js-yaml` CORE_SCHEMA interprets as the start of a complex scalar and throws `YAMLException: bad indentation of a mapping entry`.

## 2. Reproduction Protocol

1. `cd <repo-root>`
2. `node -e "const y=require('js-yaml');const fs=require('fs');const t=fs.readFileSync('cleargate-planning/.claude/agents/cleargate-wiki-lint.md','utf8');const fm=t.match(/^---\n([\s\S]*?)\n---/)[1];y.load(fm);"` — throws `YAMLException: bad indentation of a mapping entry`.
3. Conversely, the same load works for `architect.md`, `developer.md`, `qa.md`, `reporter.md` etc.

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
