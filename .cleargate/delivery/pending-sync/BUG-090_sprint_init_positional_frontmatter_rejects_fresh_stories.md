<instructions>
FOLLOW THIS EXACT STRUCTURE. Output sections in order 1-5.
YAML Frontmatter: Bug ID, Parent Ref, Status, Severity, Reporter, Approved gate.
§1 The Anomaly: Expected vs. Actual behavior.
§2 Reproduction Protocol: Deterministic steps to recreate.
§3 Evidence & Context: Raw logs, stack traces, payloads — no paraphrasing.
§4 Execution Sandbox: Exact file paths to investigate. Restrict scope to prevent unrelated refactoring.
Task Breakdown: one `- [ ] <action>` row per executable step, in execution order. REQUIRED at L3 and above, optional at L2, omit the section entirely at L1. An absent section passes the gate; a present-but-empty one fails. Task Breakdown rows implement the Gherkin scenarios in §5; no row is written for an axis marked F.
§5 Verification Protocol: The failing test that proves the bug exists and proves the fix resolves it. §5 also carries a SPIDR coverage table (axes: Paths, Interfaces, Data, Rules) above a Gherkin block. Paths = more than one *successful* way through (the baseline error scenario is not a path). Interfaces = more than one surface exposes the behaviour (CLI / API / UI / hook). Data = behaviour differs by data type, shape or volume — usually a Scenario Outline with Examples. Rules = a business rule constrains the outcome — one scenario per rule, including breaking it. Tag each covered scenario with the matching `@paths` / `@interfaces` / `@data` / `@rules` marker directly above `Scenario:` / `Scenario Outline:`. There is no Spike row: open discovery is chartered as a SPIKE item before this Bug is written.
Output location: .cleargate/delivery/pending-sync/BUG-090_sprint-init-positional-frontmatter-rejects-fresh-stories.md

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
bug_id: BUG-090
parent_ref: null
parent_cleargate_id: null
sprint_cleargate_id: null
carry_over: false
area: scripts,frontmatter,sprint-init
status: Draft
severity: P1-High
reporter: orchestrator (SPRINT-41 M4 Architect probe F5)
approved: false
context_source: measured reproduction in .cleargate/sprint-runs/SPRINT-41/plans/M4.md "Measured facts" F5 (cli dist built from 2e566b5), verified against .cleargate/scripts/assert_story_files.mjs:162 and close_sprint.mjs:1035,1053 on sprint/S-41
created_at: 2026-09-25T18:40:00Z
updated_at: 2026-09-25T18:31:08Z
created_at_version: strategy-phase-pre-init
updated_at_version: 45ef413c-dirty
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
  last_gate_check: 2026-09-25T18:31:08Z
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

# BUG-090: `sprint init` rejects every freshly scaffolded story — positional frontmatter in assert_story_files.mjs and close_sprint.mjs

### Open Questions

- **Question:** Should the two `.mjs` scripts import the shared `locateFrontmatter` from the cli (BUG-067's `frontmatter-locator.ts`), or carry a small script-local fence locator?
- **Recommended:** A script-local locator with the same contract (first `---` fence after an optional leading `<instructions>…</instructions>` block and whitespace). The scripts ship in `scaffold/core` and run without the cli's `src/`, so importing TS is not an option. Pin both implementations to one shared fixture set.
- **Human decision:** {pending Gate 1}

## 1. The Anomaly (Expected vs. Actual)
**Expected Behavior:** `cleargate sprint init` accepts an approved story whose file starts with the `<instructions>` block that `cleargate new story` writes (CR-108). `close_sprint.mjs` Step 2.9 reads `deferred_verification` from the same kind of file.

**Actual Behavior:** `assert_story_files.mjs:162` matches frontmatter with `/^---\r?\n…/`, which is anchored at file offset 0. Every freshly scaffolded story is `<instructions>`-led, so an approved story reads as unapproved: `UNAPPROVED (1): STORY-001-01`, and `sprint init` exits 1. `close_sprint.mjs:1035` (`parseFrontmatterFields`) and `:1053` (`parseDeferredVerifications`) use the same anchored regex. As a result, Step 2.9 silently skips an `<instructions>`-led item's `deferred_verification` (fail-open). This is the sixth BUG-067-class site. [[BUG-067]] fixed the cli's five TypeScript sites; its carry-forward lists `frontmatter-merge.ts`, `sprint.ts:745` and `doctor.ts:947`, but not these two scripts.

## 2. Reproduction Protocol
1. In a scratch dir: `git init`, then `node <cli>/dist/cli.js init --yes`.
2. `cleargate new epic probe`, then `cleargate new story probe-story --epic EPIC-001`. Set `approved: true` in the story's frontmatter and leave the `<instructions>` block in place (the real user path).
3. Declare a sprint that lists the story, then run `cleargate sprint init SPRINT-01`.
4. Observe `UNAPPROVED (1): STORY-001-01` and exit 1.
5. Delete only the `<instructions>…</instructions>` block and re-run. Observe exit 0, `state.json` and `.active` written, and `→ Load skill: sprint-execution`.

Edge conditions: CRLF files (`\r?\n`); an item with no frontmatter at all (must still report `has_heading: false`); a demoted phantom `---\nstamp_error: x\n---` before `<instructions>` (the locator must pick the real fence, as BUG-067's locator does).

## 3. Evidence & Context
```
.cleargate/scripts/assert_story_files.mjs:161-162
  // Match YAML frontmatter block: starts with --- on first line
  const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);

.cleargate/scripts/close_sprint.mjs:1035 and :1053
  const fm = raw.match(/^---\n([\s\S]*?)\n---/);

sprint init (fresh <instructions>-led story, approved: true):
  UNAPPROVED (1): STORY-001-01          → exit 1
same fixture, <instructions> block removed:
  exit 0, state.json + .active written, → Load skill: sprint-execution
```
Measured by the SPRINT-41 M4 Architect probe (`plans/M4.md` "Measured facts" F5). The SPRINT-41 story files all start with `---`, so this sprint's own close gate is unaffected.

## 4. Execution Sandbox (Suspected Blast Radius)
**Investigate / Modify:**
- `cleargate-cli/scaffold/core/.cleargate/scripts/assert_story_files.mjs` (canonical) and the live `.cleargate/scripts/assert_story_files.mjs` mirror
- `cleargate-cli/scaffold/core/.cleargate/scripts/close_sprint.mjs` (canonical) and the live mirror, lines ~1035 and ~1053
- Do not touch cli `src/` (BUG-067's locator is already there). Grep the other `.cleargate/scripts/*.mjs` for `match(/^---` and list any further sites in this item before fixing.

## Task Breakdown
- [ ] QA-Red: an `<instructions>`-led approved story passes `assert_story_files`; Step 2.9 reads `deferred_verification` from an `<instructions>`-led item; CRLF and phantom-fence fixtures
- [ ] Add a script-local fence locator with BUG-067's contract; use it at `assert_story_files.mjs:162` and `close_sprint.mjs:1035,1053`
- [ ] Grep the remaining `.cleargate/scripts/*.mjs` for anchored `^---` sites; fix or list each
- [ ] Mirror canonical → live; typecheck and targeted tests

## 5. Verification Protocol (The Failing Test)
**Command:** `bash .cleargate/scripts/test/test_assert_story_files.sh` (extend with the new fixtures) plus `cd cleargate-cli && npm run test:file -- test/scripts/test_assert_work_item_files.node.test.ts`, each run solo.

| Axis | Cover | Reason |
|---|---|---|
| Paths | T | Two successful reads: an approved `<instructions>`-led story, and a `---`-led one (unchanged) |
| Interfaces | T | Two surfaces: `sprint init` (assert_story_files) and `close_sprint.mjs` Step 2.9 |
| Data | T | LF vs CRLF, and a phantom demoted fence before `<instructions>` |
| Rules | T | Approval is read from the real frontmatter only; unapproved stays rejected |

```gherkin
Feature: Position-independent frontmatter in sprint scripts

  @paths @interfaces
  Scenario: An approved instructions-led story passes sprint init
    Given a story scaffolded by `cleargate new story` with approved: true and its <instructions> block intact
    When `cleargate sprint init` runs assert_story_files
    Then the story is reported approved and sprint init exits 0

  @interfaces
  Scenario: Step 2.9 reads deferred_verification behind an instructions block
    Given an <instructions>-led item carrying a deferred_verification entry
    When close_sprint.mjs Step 2.9 parses it
    Then the entry is found and enforced

  @data
  Scenario Outline: The fence is located regardless of line endings and phantom fences
    Given an approved story with <variant>
    When assert_story_files reads it
    Then it is approved
    Examples:
      | variant |
      | CRLF line endings |
      | a demoted phantom fence before <instructions> |

  @rules
  Scenario: An unapproved instructions-led story is still rejected
    Given an <instructions>-led story with approved: false
    When sprint init runs
    Then it reports UNAPPROVED and exits 1
```

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 4 | one per Gherkin scenario (the outline counts once per example) |
| Integration tests | 1 | `sprint init` over a real scaffolded fresh install |
| E2E / acceptance tests | 0 | covered by the -09 clean-room harness `sprint-init` check once fixed (it records FAIL-KNOWN until then) |

---

## Prior work

- [[BUG-067]] — the same positional-fence defect class; fixed the cli's five TypeScript sites (the shared locator), not these two scripts. This bug extends it.
- [[SPRINT-41]] — M4 Architect probe F5 found it; -09's clean-room harness records `sprint-init` as FAIL-KNOWN against this ID.

## Context Source

**context_source:** measured reproduction in `.cleargate/sprint-runs/SPRINT-41/plans/M4.md` F5, verified against the scripts on `sprint/S-41`.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟡 Medium Ambiguity** — the locator-placement question is open; approval pending.

- [x] Reproduction steps are 100% deterministic.
- [x] Actual vs. Expected behavior is explicitly defined.
- [x] Raw error logs/evidence are attached.
- [x] Verification command (failing test) is provided.
- [ ] `approved: true` is set in the YAML frontmatter.
