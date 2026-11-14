---
bug_id: BUG-135
parent_ref: null
parent_cleargate_id: null
sprint_cleargate_id: null
carry_over: false
area: wiki
status: Draft
severity: P3-Low
reporter: orchestrator (field upgrade watch 0.27.0 → 0.30.1 in a Python target repo, 2026-11-13; reproduced in a scratch repo)
approved: false
context_source: "Field upgrade watch 2026-11-13: the target repo's first 0.30.1 wiki build skipped two bugs with 'malformed frontmatter' and no reason (both had unquoted ': ' in a plain scalar); reproduced in a scratch repo with one such bug; code grounding at cli main dbccc79: src/wiki/scan.ts:84-92 (catch drops the error, onSkip(rawPath, 'malformed frontmatter')), src/commands/wiki-ingest.ts:221 and src/commands/wiki-contradict.ts:114,124 (both print e.message)"
created_at: 2026-11-13T09:14:27.590Z
updated_at: 2026-11-13T09:14:27.590Z
created_at_version: strategy-phase-pre-init
updated_at_version: strategy-phase-pre-init
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-11-13T09:23:35Z
  transition: ready-for-fix
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id BUG-135
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-11-13T09:23:45Z
  sessions: []
last_contradict_sha: "503a8feb294dec1c05d32de605b818a57a2138e0624070982f41d113519d09d8"
---

# BUG-135: wiki build says "malformed frontmatter" without saying what is wrong

### Open Questions

- **Question:** How much of the parser's error should the build warning carry?
- **Recommended:** Its first line, which names the problem and the line and column: `skipped <path>: malformed frontmatter: bad indentation of a mapping entry (3:13)`. The code-frame lines that follow it in the message stay out of the build output; `wiki ingest <path>` still prints them.
- **Human decision:** pending

## 1. The Anomaly (Expected vs. Actual)
**Expected Behavior:** When `wiki build` skips an item for malformed frontmatter, the warning says what the parser rejected and where, as `wiki ingest` and `wiki contradict` already do.

**Actual Behavior:** `scan.ts:84-92` catches the parse error and reports only `malformed frontmatter`. The field repo's build skipped two bugs this way; finding the cause (an unquoted `: ` inside a plain scalar, `bad indentation of a mapping entry`) meant running `wiki ingest` on each file. A skipped item is missing from every wiki page and from the brief, so the warning is the only sign of it.

## 2. Reproduction Protocol
1. A repo with one bug whose frontmatter has `reporter: QA: found in the nightly run: step 3` (unquoted).
2. `cleargate wiki build`: read the warning.
3. `cleargate wiki ingest <that file>`: compare.

Edge conditions:
- A file with no frontmatter at all keeps its current handling.
- A multi-line parser message contributes its first line only.
- Valid files print nothing new.

## 3. Evidence & Context
Scratch reproduction on 0.30.1:
```
$ cleargate wiki build
wiki build: warn: skipped .cleargate/delivery/pending-sync/BUG-403_x.md: malformed frontmatter

$ cleargate wiki ingest .cleargate/delivery/pending-sync/BUG-403_x.md
wiki ingest: malformed frontmatter in .cleargate/delivery/pending-sync/BUG-403_x.md: parseFrontmatter: invalid YAML: bad indentation of a mapping entry (3:13)
```
`src/wiki/scan.ts:88-91`:
```ts
      } catch {
        // Malformed frontmatter — skip
        onSkip?.(rawPath, 'malformed frontmatter');
        continue;
```

## 4. Execution Sandbox (Suspected Blast Radius)
**Investigate / Modify:**
- `cleargate-cli/src/wiki/scan.ts` (pass the error's first line in the skip reason).

**Do NOT modify:** the skip itself (a malformed item is still skipped, not fatal); `wiki ingest` and `wiki contradict` messages.

## 5. Verification Protocol (The Failing Test)
**Command:** `cd cleargate-cli && npm run test:file -- test/wiki/scan-skip-reason.red.node.test.ts`

| Axis | Cover | Reason |
|---|---|---|
| Paths | F | one scan path |
| Interfaces | F | `wiki build` is the only caller that prints skips |
| Data | T | YAML error shapes |
| Rules | F | no rule beyond "say why" |

```gherkin
Feature: wiki build says why it skipped an item

  @data
  Scenario Outline: The skip warning carries the parser's reason
    Given a raw item whose frontmatter has <problem>
    When cleargate wiki build runs
    Then the skip warning for it ends with "<reason>"

    Examples:
      | problem                                   | reason                                                  |
      | reporter: QA: found in the nightly run    | malformed frontmatter: bad indentation of a mapping entry (3:13) |
      | an unclosed double quote in title         | malformed frontmatter: <the parser's first message line, with its line:column> |
```

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 2 | one per example row; assert the prefix and the line:column, not the parser's exact wording |
| Integration tests | 0 | the scan is pure over a fixture directory |
| E2E / acceptance tests | 0 | the next field build |

---

## Prior work

- none found for this warning. [[BUG-098]] and [[BUG-067]] concern frontmatter handling and stamping, not the build's skip message.

## Context Source

**context_source:** field upgrade watch 2026-11-13; reproduced in a scratch repo; code grounding at cli main `dbccc79`.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟡 Medium Ambiguity**

Requirements to pass to Green (Ready for Fix):
- [x] Reproduction steps are 100% deterministic.
- [x] Actual vs. Expected behavior is explicitly defined.
- [x] Raw error logs/evidence are attached.
- [x] Verification command (failing test) is provided.
- [ ] `approved: true` is set in the YAML frontmatter.
