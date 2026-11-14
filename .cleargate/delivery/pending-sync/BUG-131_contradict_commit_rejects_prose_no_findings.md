---
bug_id: BUG-131
parent_ref: null
parent_cleargate_id: null
sprint_cleargate_id: null
carry_over: false
area: wiki-contradict
status: Draft
severity: P2-Medium
reporter: orchestrator (relayed from a Go target repo on 0.30.1, 2026-11-13; parser behaviour reproduced from source)
approved: false
context_source: "Go target repo on 0.30.1 (contradict-commit exited 1 on a 'no contradictions' answer for a draft with an empty neighbourhood), reproduced 2026-11-13 by calling parseFindings on the three input shapes; code grounding at cli main dbccc79: src/lib/wiki/contradict.ts:93-152 (parseFindings: JSON array or finding/summary lines, else throws), :186-245 (preparePhase4 returns skip:false with a 0-page neighbourhood), :556-572 (buildContradictPrompt does not name the no-findings line), scaffold/hosts/claude/.claude/agents/cleargate-wiki-contradict.md:61-90 (the agent's no-findings summary line), src/commands/wiki-contradict.ts:145-146 (skipped: <reason>)"
created_at: 2026-11-13T09:14:26.870Z
updated_at: 2026-11-13T09:14:26.870Z
created_at_version: strategy-phase-pre-init
updated_at_version: strategy-phase-pre-init
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-11-13T09:19:45Z
  transition: ready-for-fix
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id BUG-131
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-11-13T09:19:45Z
  sessions: []
last_contradict_sha: "3e48690a9d52b8f7096d454f699fa1c1d750bfe91e8da57e585b10a88d6ea974"
---

# BUG-131: An empty neighbourhood still asks for an agent run, and a prose "no contradictions" answer fails the commit

### Open Questions

- **Question:** What should `wiki contradict` do when the neighbourhood is empty?
- **Recommended:** Print `skipped: empty neighborhood`, stamp `last_contradict_sha` itself (as `contradict-commit` does for zero findings), and exit 0. There is nothing to compare, so no agent run is needed, and the brief's "never checked" count drops.
- **Human decision:** pending

- **Question:** Should `contradict-commit` accept free prose such as "No contradictions found." as zero findings?
- **Recommended:** No: a garbled answer must not read as clean. Keep the two accepted forms, but name them in the error (`send "contradiction-check: no findings" or "[]" when there are none`), and add that line to the prompt `wiki contradict` prints, so the agent is told the exact closing line.
- **Human decision:** pending

## 1. The Anomaly (Expected vs. Actual)
**Expected Behavior:** A draft with no neighbouring pages finishes its contradiction check without an agent run. When an agent does run and finds nothing, the protocol's next step (`contradict-commit`) succeeds or says exactly what to send.

**Actual Behavior:**
- `preparePhase4` (`contradict.ts:221-245`) returns `skip: false` with `Neighborhood pages (0): ` in the prompt, so the protocol still dispatches `cleargate-wiki-contradict` for a draft that has nothing to be compared with.
- The prompt (`contradict.ts:563-571`) tells the agent how to write a finding but not the closing `contradiction-check: no findings` line; that line is only in the agent's own definition. An answer that says "no contradictions" in prose is rejected: `parseFindings` (`contradict.ts:144-146`) throws `input is neither a JSON findings array nor cleargate-wiki-contradict output`, and `contradict-commit` exits 1 without naming the accepted forms. The field session hit this on a draft with an empty neighbourhood.

## 2. Reproduction Protocol
1. A Draft, unapproved item whose body links no `[[ID]]` that has a wiki page and that has no parent.
2. `cleargate wiki contradict <file>`: observe a `phase4:` line with an empty neighbourhood instead of `skipped:`.
3. `printf 'No contradictions found.\n' | cleargate wiki contradict-commit <file>`: observe exit 1.

Edge conditions:
- A non-empty neighbourhood still prints the `phase4:` prompt.
- `contradiction-check: no findings` and `[]` are still accepted.
- A finding line with a summary count that disagrees is still rejected.
- A SHA-idempotent re-run still prints `skipped: sha-idempotent …`.

## 3. Evidence & Context
`parseFindings` on 0.30.1 source:
```
"No contradictions found. The neighbourho" -> throws: input is neither a JSON findings array nor cleargate-wiki-contradict output
"contradiction-check: no findings" -> []
"[]" -> []
```
Prompt lines built by `buildContradictPrompt` (`contradict.ts:569-571`):
```
Neighborhood pages (0): 
For each contradiction found, emit one line: contradiction: <ID> vs <neighbor-id> · <claim-summary (≤80 chars)>
Follow each finding with one reasoning paragraph. Always exit 0.
```

## 4. Execution Sandbox (Suspected Blast Radius)
**Investigate / Modify:**
- `cleargate-cli/src/lib/wiki/contradict.ts` (`preparePhase4` empty-neighbourhood skip and stamp; `buildContradictPrompt` closing line; `parseFindings` error text).
- `cleargate-cli/src/commands/wiki-contradict.ts` (print the new skip reason).
- `cleargate-cli/scaffold/hosts/claude/CLAUDE.md` block and `cleargate-protocol.md` only if the `skipped:` wording rule needs a line for the new reason.

**Do NOT modify:** neighbourhood selection (BUG-132 owns sprint plans); the excluded-bucket path (BUG-126).

## 5. Verification Protocol (The Failing Test)
**Command:** `cd cleargate-cli && npm run test:file -- test/wiki/contradict-empty-neighbourhood.red.node.test.ts`

| Axis | Cover | Reason |
|---|---|---|
| Paths | T | empty neighbourhood (skip) vs non-empty (agent run) |
| Interfaces | T | `wiki contradict` and `wiki contradict-commit` |
| Data | T | input shapes for the commit |
| Rules | T | an unreadable answer is never read as clean |

```gherkin
Feature: The contradiction check finishes when there is nothing to compare

  @paths @interfaces
  Scenario: An empty neighbourhood is skipped and stamped
    Given a Draft item with no neighbouring wiki pages
    When cleargate wiki contradict runs on it
    Then it prints "skipped: empty neighborhood"
    And the item's last_contradict_sha is its current SHA

  @paths
  Scenario: A non-empty neighbourhood still asks for the agent
    Given a Draft item whose parent epic has a wiki page
    When cleargate wiki contradict runs on it
    Then it prints a phase4 line whose prompt names "contradiction-check: no findings"

  @data
  Scenario Outline: The commit accepts the two zero-finding forms
    Given the findings input <input>
    When cleargate wiki contradict-commit runs
    Then it exits <code>

    Examples:
      | input                              | code |
      | "contradiction-check: no findings" | 0    |
      | "[]"                               | 0    |
      | "No contradictions found."         | 1    |

  @rules @interfaces
  Scenario: A rejected answer names what to send
    Given the findings input "No contradictions found."
    When cleargate wiki contradict-commit runs
    Then stderr names "contradiction-check: no findings" and "[]"
```

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 6 | one per scenario and example row |
| Integration tests | 1 | `wiki contradict` then `contradict-commit` on a fixture repo |
| E2E / acceptance tests | 0 | the next field draft |

---

## Prior work

- [[STORY-063-01]] (Completed, 0.30.0): introduced `contradict-commit` and its two accepted forms.
- [[BUG-126]] (Completed, 0.30.1): made the check finish for excluded-bucket drafts; left neighbourhood selection alone.
- [[BUG-132]] (Draft): sprint plans get an empty neighbourhood; this bug is what an empty neighbourhood then costs.

## Context Source

**context_source:** Go target repo on 0.30.1; parser reproduced from source; code grounding at cli main `dbccc79`.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟡 Medium Ambiguity**

Requirements to pass to Green (Ready for Fix):
- [x] Reproduction steps are 100% deterministic.
- [x] Actual vs. Expected behavior is explicitly defined.
- [x] Raw error logs/evidence are attached.
- [x] Verification command (failing test) is provided.
- [ ] `approved: true` is set in the YAML frontmatter.
