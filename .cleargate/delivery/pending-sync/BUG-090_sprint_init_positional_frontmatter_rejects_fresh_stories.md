---
bug_id: BUG-090
parent_ref: null
parent_cleargate_id: null
sprint_cleargate_id: "SPRINT-41"
carry_over: false
area: scripts,frontmatter,sprint-init
status: Draft
severity: P1-High
reporter: orchestrator (SPRINT-41 M4 Architect probe F5)
approved: true
approved_by: sandrinio
approved_at: 2026-09-26T09:30:00Z
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

# BUG-090: `sprint init` rejects every freshly scaffolded story — positional frontmatter in assert_story_files.mjs and close_sprint.mjs, and no `approved:` key in the epic/story templates

### Open Questions

- **Question:** Should the two `.mjs` scripts import the shared `locateFrontmatter` from the cli (BUG-067's `frontmatter-locator.ts`), or carry a small script-local fence locator?
- **Recommended:** A script-local locator with the same contract (first `---` fence after an optional leading `<instructions>…</instructions>` block and whitespace). The scripts ship in `scaffold/core` and run without the cli's `src/`, so importing TS is not an option. Pin both implementations to one shared fixture set.
- **Human decision:** Recommended option taken (a script-local locator). The owner directed on 2026-09-26: "log every issue you find and fix them" (fresh-folder journey). The orchestrator resolved this question under sprint autonomy.

## 1. The Anomaly (Expected vs. Actual)
**Expected Behavior:** `cleargate sprint init` accepts an approved story whose file starts with the `<instructions>` block that `cleargate new story` writes (CR-108). `close_sprint.mjs` Step 2.9 reads `deferred_verification` from the same kind of file.

**Actual Behavior:** `assert_story_files.mjs:162` matches frontmatter with `/^---\r?\n…/`, which is anchored at file offset 0. Every freshly scaffolded story is `<instructions>`-led, so an approved story reads as unapproved: `UNAPPROVED (1): STORY-001-01`, and `sprint init` exits 1. `close_sprint.mjs:1035` (`parseFrontmatterFields`) and `:1053` (`parseDeferredVerifications`) use the same anchored regex. As a result, Step 2.9 silently skips an `<instructions>`-led item's `deferred_verification` (fail-open). This is the sixth BUG-067-class site. [[BUG-067]] fixed the cli's five TypeScript sites; its carry-forward lists `frontmatter-merge.ts`, `sprint.ts:745` and `doctor.ts:947`, but not these two scripts.

**Second trigger (fresh-folder journey, 2026-09-26, `reports/fresh-journey-smoke.md` FJ-1).** Suppose the author removes the `<instructions>` block, as the block's own "Do NOT output these instructions" line tells them to. The story still fails the same way. `cleargate new epic` and `cleargate new story` scaffold no `approved:` key at all. `Bug.md` and `CR.md` scaffold `approved: false`, and `epic.md`'s own Ambiguity Gate line demands "`approved: true` is set in the YAML frontmatter". So a new user fills the item in and records the approval the readiness gate accepts (`approved_by` + `approved_at`). The gate goes 🟢, then `sprint init` reports `UNAPPROVED` because `assert_story_files.mjs` needs a literal `approved: true` line. `push` refuses the same item with `has approved: false` (`push.ts:271-274`), even though the key is absent, not false. Adding `approved: true` anywhere in the frontmatter clears it; position does not matter for this trigger.

## 2. Reproduction Protocol
1. In a scratch dir: `git init`, then `node <cli>/dist/cli.js init --yes`.
2. `cleargate new epic probe`, then `cleargate new story probe-story --epic EPIC-001`. Set `approved: true` in the story's frontmatter and leave the `<instructions>` block in place (the real user path).
3. Declare a sprint that lists the story, then run `cleargate sprint init SPRINT-01`.
4. Observe `UNAPPROVED (1): STORY-001-01` and exit 1.
5. Delete only the `<instructions>…</instructions>` block and re-run. Observe exit 0, `state.json` and `.active` written, and `→ Load skill: sprint-execution`.

Second trigger: in the same scratch dir, remove the story's `<instructions>` block, fill it in, and record approval as `approved_by` + `approved_at`. No `approved:` key exists, because the template writes none. `gate check` passes; `sprint init` still reports `UNAPPROVED (1)`. Add `approved: true` and it exits 0.

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
Second trigger, measured by the fresh-folder journey (cli dist 0.26.1 @ `35580b0`, project `/private/tmp/cg-s41-fresh-journey`):
```
gate check STORY-001-01 → ✅ story.ready-for-execution passed (14 criteria)
sprint init SPRINT-01 --stories STORY-001-01,STORY-001-02,STORY-002-01
  UNAPPROVED (3): STORY-001-01, STORY-001-02, STORY-002-01   → exit 1
+ `approved: true` inserted mid-frontmatter → exit 0, state.json written
scaffold/core/.cleargate/templates/{epic,story}.md: no `^approved:` line (Bug.md:39 and CR.md:37 carry `approved: false`)
```
Measured by the SPRINT-41 M4 Architect probe (`plans/M4.md` "Measured facts" F5). The SPRINT-41 story files all start with `---`, so this sprint's own close gate is unaffected.

## 4. Execution Sandbox (Suspected Blast Radius)
**Investigate / Modify:**
- `cleargate-cli/scaffold/core/.cleargate/scripts/assert_story_files.mjs` (canonical) and the live `.cleargate/scripts/assert_story_files.mjs` mirror
- `cleargate-cli/scaffold/core/.cleargate/scripts/close_sprint.mjs` (canonical) and the live mirror, lines ~1035 and ~1053
- `cleargate-cli/scaffold/core/.cleargate/templates/epic.md` and `story.md` (canonical) plus the live `.cleargate/templates/` mirrors: scaffold `approved: false`, matching `Bug.md`/`CR.md`. These are installed files, so the M2 init-parity baseline needs `SANCTIONED_BASELINE_DELTAS` rows.
- `cleargate-cli/src/commands/push.ts:271-274`: the refusal message must say whether the key is `false` or absent. This is the only `src/` change; BUG-067's locator is already there.
- Grep the other `.cleargate/scripts/*.mjs` for `match(/^---` and list any further sites in this item before fixing.

## Task Breakdown
- [ ] QA-Red: an `<instructions>`-led approved story passes `assert_story_files`; Step 2.9 reads `deferred_verification` from an `<instructions>`-led item; CRLF and phantom-fence fixtures
- [ ] Add a script-local fence locator with BUG-067's contract; use it at `assert_story_files.mjs:162` and `close_sprint.mjs:1035,1053`
- [ ] Grep the remaining `.cleargate/scripts/*.mjs` for anchored `^---` sites; fix or list each
- [ ] Scaffold `approved: false` in `epic.md` and `story.md`; add the init-parity sanctioned-delta rows
- [ ] `push.ts`: separate refusal wording for an absent `approved` key and for `approved: false`
- [ ] Mirror canonical → live; typecheck and targeted tests

## 5. Verification Protocol (The Failing Test)
**Command:** `bash .cleargate/scripts/test/test_assert_story_files.sh` (extend with the new fixtures) plus `cd cleargate-cli && npm run test:file -- test/scripts/test_assert_work_item_files.node.test.ts`, each run solo.

| Axis | Cover | Reason |
|---|---|---|
| Paths | T | Two successful reads: an approved `<instructions>`-led story, and a `---`-led one (unchanged). A third path: a template-scaffolded story approved by flipping its scaffolded `approved:` key |
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

  @paths
  Scenario: A template-scaffolded story carries an approved key to flip
    Given a story and an epic created by `cleargate new` in a fresh install
    Then each frontmatter contains `approved: false`
    And after the author sets it to true and removes the <instructions> block, sprint init exits 0

  @rules
  Scenario: push names an absent approved key accurately
    Given a work item whose frontmatter has no approved key
    When push's client-side approval check runs
    Then the refusal says the key is missing, not that it is false

  @rules
  Scenario: An unapproved instructions-led story is still rejected
    Given an <instructions>-led story with approved: false
    When sprint init runs
    Then it reports UNAPPROVED and exits 1
```

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 6 | one per Gherkin scenario (the outline counts once per example) |
| Integration tests | 1 | `sprint init` over a real scaffolded fresh install |
| E2E / acceptance tests | 0 | covered by the -09 clean-room harness `sprint-init` check once fixed (it records FAIL-KNOWN until then) |

---

## Prior work

- [[BUG-067]] — the same positional-fence defect class; fixed the cli's five TypeScript sites (the shared locator), not these two scripts. This bug extends it.
- [[SPRINT-41]] — M4 Architect probe F5 found it; -09's clean-room harness records `sprint-init` as FAIL-KNOWN against this ID. The 2026-09-26 fresh-folder journey found the second trigger (`reports/fresh-journey-smoke.md` FJ-1).

## Context Source

**context_source:** measured reproduction in `.cleargate/sprint-runs/SPRINT-41/plans/M4.md` F5, verified against the scripts on `sprint/S-41`.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity** — locator placement resolved (script-local); owner directive 2026-09-26 approves the fix.

- [x] Reproduction steps are 100% deterministic.
- [x] Actual vs. Expected behavior is explicitly defined.
- [x] Raw error logs/evidence are attached.
- [x] Verification command (failing test) is provided.
- [x] `approved: true` is set in the YAML frontmatter.
