<instructions>
FOLLOW THIS EXACT STRUCTURE. Output sections in order 1-5.
YAML Frontmatter: Bug ID, Parent Ref, Status, Severity, Reporter, Approved gate.
§1 The Anomaly: Expected vs. Actual behavior.
§2 Reproduction Protocol: Deterministic steps to recreate.
§3 Evidence & Context: Raw logs, stack traces, payloads — no paraphrasing.
§4 Execution Sandbox: Exact file paths to investigate. Restrict scope to prevent unrelated refactoring.
Task Breakdown: one `- [ ] <action>` row per executable step, in execution order. REQUIRED at L3 and above, optional at L2, omit the section entirely at L1. An absent section passes the gate; a present-but-empty one fails. Task Breakdown rows implement the Gherkin scenarios in §5; no row is written for an axis marked F.
§5 Verification Protocol: The failing test that proves the bug exists and proves the fix resolves it. §5 also carries a SPIDR coverage table (axes: Paths, Interfaces, Data, Rules) above a Gherkin block. Paths = more than one *successful* way through (the baseline error scenario is not a path). Interfaces = more than one surface exposes the behaviour (CLI / API / UI / hook). Data = behaviour differs by data type, shape or volume — usually a Scenario Outline with Examples. Rules = a business rule constrains the outcome — one scenario per rule, including breaking it. Tag each covered scenario with the matching `@paths` / `@interfaces` / `@data` / `@rules` marker directly above `Scenario:` / `Scenario Outline:`. There is no Spike row: open discovery is chartered as a SPIKE item before this Bug is written.
Output location: .cleargate/delivery/pending-sync/BUG-126_contradiction-check-fails-for-excluded-bucket-drafts.md

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
bug_id: BUG-126
parent_ref: null
parent_cleargate_id: null
sprint_cleargate_id: null
carry_over: false
area: wiki,contradict
status: Triaged
severity: P2-Medium
reporter: orchestrator (field upgrade test 0.28.0 → 0.30.0 in a Go target repo, 2026-11-13)
approved: true
approved_by: "sandrinio (2026-11-13: 'i want you to fix them all and make a new release')"
approved_at: 2026-11-13T00:00:00Z
context_source: "Field upgrade test 2026-11-13 addendum (wiki contradict on a story draft names a wiki/stories page that does not exist), reproduced on a pristine copy of the field repo with the published 0.30.0 binary; code grounding at cli main b9fe36a: src/lib/wiki/contradict.ts:186-206 (pagePath = wiki/<bucket>/<id>.md whatever wiki.ingest_buckets says; passed to the subagent as draftWikiPath), src/commands/wiki-contradict.ts:232 (contradict-commit fails 'wiki page not found … run cleargate wiki ingest first', which skips excluded buckets)"
created_at: 2026-11-13T00:00:00Z
updated_at: 2026-11-13T00:00:00Z
created_at_version: strategy-phase-pre-init
updated_at_version: strategy-phase-pre-init
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
  last_gate_check: 2026-11-12T22:01:34Z
  transition: ready-for-fix
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
last_contradict_sha: "69b9c4f61fb35c46ae23fdab496599493b9b6696b76cb1c0cee234cdf4e07158"
---

# BUG-126: The contradiction check cannot be completed for a story draft when stories are not in the wiki (the default)

### Open Questions

- **Question:** For a draft whose bucket `wiki.ingest_buckets` excludes (stories, by default), what does the check read and where is it recorded?
- **Recommended:** Read the raw file. `wiki contradict` passes the raw path as the draft to check and names it as such in the prompt. `contradict-commit` records `last_contradict_sha` on the raw file only, and appends findings to `wiki/contradictions.md` as for any draft. Stories are the most common drafts and the ones most likely to contradict their epic, so skipping them is not recommended.
- **Human decision:** Recommended option accepted (sandrinio 2026-11-13: "i want you to fix them all and make a new release").

## 1. The Anomaly (Expected vs. Actual)
**Expected Behavior:** The check CLAUDE.md requires before every unapproved draft's Brief (`wiki contradict` → `cleargate-wiki-contradict` subagent → `wiki contradict-commit`) can be completed for every draft type in a repo with the default config.

**Actual Behavior:**
- `wiki contradict` builds the draft page path as `wiki/<bucket>/<id>.md` (`contradict.ts:186-206`) without checking `wiki.ingest_buckets`. For a story in a default repo that is `wiki/stories/STORY-…md`, which does not exist, and the subagent is told to read it.
- `wiki contradict-commit` then exits 1: `wiki page not found for STORY-002-10 — run cleargate wiki ingest <file> first`. Ingest skips excluded buckets, so following the advice changes nothing, and an agent following CLAUDE.md is stuck or skips the step.
- The same happens for any other bucket a repo leaves out of `ingest_buckets`.

## 2. Reproduction Protocol
1. A repo with the default `wiki.ingest_buckets` (no `stories`), an epic, and a Draft story under it in `pending-sync/`.
2. `cleargate wiki contradict <story-file>`: read `draftWikiPath` in the `phase4:` line.
3. `printf 'No contradictions found.\n' | cleargate wiki contradict-commit <story-file>; echo $?`.

Edge conditions:
- An included bucket (epics, bugs, …) behaves exactly as today, page stamp included.
- The sha-idempotent skip works for raw-only drafts (read `last_contradict_sha` from the raw file).
- A repo that re-adds `stories` to `ingest_buckets` gets today's page behaviour.

## 3. Evidence & Context
Reproduced 2026-11-13 on a pristine copy of the field repo (published 0.30.0):
```
$ cleargate wiki contradict .cleargate/delivery/pending-sync/STORY-002-10_controllers_list.md
phase4: {"draftId":"STORY-002-10","draftWikiPath":"…/.cleargate/wiki/stories/STORY-002-10.md","neighborhood":["epics/EPIC-002.md","epics/EPIC-001.md"],…}
$ ls .cleargate/wiki/stories
ls: .cleargate/wiki/stories: No such file or directory
$ printf 'No contradictions found.\n' | cleargate wiki contradict-commit .cleargate/delivery/pending-sync/STORY-002-10_controllers_list.md
wiki contradict-commit: wiki page not found for STORY-002-10 — run cleargate wiki ingest .cleargate/delivery/pending-sync/STORY-002-10_controllers_list.md first
exit=1
```
`config.yml`: `ingest_buckets: [epics, sprints, proposals, crs, bugs, initiatives, spikes]`.

## 4. Execution Sandbox (Suspected Blast Radius)
**Investigate / Modify:**
- `cleargate-cli/src/lib/wiki/contradict.ts` (draft path and idempotency for an excluded bucket).
- `cleargate-cli/src/commands/wiki-contradict.ts` ~:232 (commit to the raw file when the bucket is excluded).
- The `cleargate-wiki-contradict` agent prompt if it assumes a wiki page (`scaffold/hosts/claude/.claude/agents/cleargate-wiki-contradict.md`).

**Do NOT modify:** the neighbourhood selection; the unchecked-draft alarm.

## Task Breakdown
- [ ] QA-Red: the scenarios below.
- [ ] Raw-file draft path, idempotency and commit for excluded buckets.
- [ ] Agent prompt wording if needed (canonical scaffold, then re-sync live).
- [ ] Typecheck; contradict tests.

## 5. Verification Protocol (The Failing Test)
**Command:** `cd cleargate-cli && npm run test:file -- test/commands/wiki-contradict-excluded-bucket.red.node.test.ts`

| Axis | Cover | Reason |
|---|---|---|
| Paths | T | check, then commit |
| Interfaces | T | `wiki contradict` and `wiki contradict-commit` |
| Data | T | excluded vs included bucket |
| Rules | T | every draft type can complete the required check |

```gherkin
Feature: The contradiction check works for drafts outside the wiki

  @paths @interfaces
  Scenario: A story draft is checked from its raw file
    Given the default ingest_buckets and a Draft story with no wiki page
    When cleargate wiki contradict runs on it
    Then the phase4 prompt names the story's raw file as the draft to read

  @paths @rules
  Scenario: The result is recorded on the raw file
    Given that story and the subagent's "No contradictions found." output
    When cleargate wiki contradict-commit runs
    Then it exits 0 and the raw file carries last_contradict_sha

  @data
  Scenario: A checked story is not checked again
    Given that story, committed and unchanged
    When cleargate wiki contradict runs again
    Then it prints skipped: with the sha

  @data
  Scenario: An included bucket is unchanged
    Given a Draft epic with a wiki page
    When the check and commit run
    Then last_contradict_sha is on both the wiki page and the raw file
```

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 4 | one per scenario |
| Integration tests | 1 | built CLI, check then commit on a default-config temp repo |
| E2E / acceptance tests | 0 | the next story Brief |

---

## Prior work

- [[STORY-063-01]]: the `wiki contradict-commit` command and recheck rules (0.29.0, [[EPIC-063]] M1); it assumed every draft has a wiki page.

## Context Source

**context_source:** field upgrade test 2026-11-13 addendum, reproduced on a pristine copy of the field repo; code grounding at cli main `b9fe36a`.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity**

Requirements to pass to Green (Ready for Fix):
- [x] Reproduction steps are 100% deterministic.
- [x] Actual vs. Expected behavior is explicitly defined.
- [x] Raw error logs/evidence are attached.
- [x] Verification command (failing test) is provided.
- [x] `approved: true` is set in the YAML frontmatter.
