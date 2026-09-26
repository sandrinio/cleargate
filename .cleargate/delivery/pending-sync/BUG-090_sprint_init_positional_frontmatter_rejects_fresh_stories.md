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

Edge conditions: CRLF files (`\r?\n`); an item with no frontmatter at all (must still report `has_heading: false`); a demoted phantom `---\nstamp_error: x\n---` before `<instructions>` (a phantom block *inside* `<instructions>` is opaque and the real fence is read; a phantom block *before* `<instructions>`, the BUG-067 corruption signature, is the first fence, so the item reads UNAPPROVED — parity with BUG-067's locator, measured 2026-09-26).

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
- `cleargate-cli/src/commands/push.ts:271-274`: the refusal message must say whether the key is `false` or absent. `src/` changes: `push.ts` (wording) and `doctor.ts` (two sniff deletions); BUG-067's locator is already there.
- `cleargate-cli/scaffold/core/.cleargate/templates/hotfix.md` and its live mirror: `approved: false` after `status:`.
- `close_sprint.mjs:250` (`readFmStatus`) and `:587` (`setFrontmatterStatusAtomic`): the same locator (Step 2.6c).
- `cleargate-cli/src/commands/doctor.ts:738,1022`: delete the positional sniffs (the approval readers for `--session-start` and `--can-edit`).
- `cleargate-cli/scripts/clean-room/probe-items.mjs` `approveProbeStory`: flip the scaffolded key in place (prevents a duplicate YAML key).
- `cleargate-cli/test/helpers/init-fixture.ts`: 5 sanctioned-delta rows.
- Site census for the other scripts (plans/M5-fixwave.md): `dedupe_frontmatter.mjs:60` leave (→ BUG-098); `prefill_report.mjs:41` leave (agent reports only); `prep_qa_context.mjs:125` leave (dead code); `prep_reporter_context.mjs:84` leave (→ BUG-098); `close_sprint.mjs:711` leave (already position-independent).

## Task Breakdown
- [x] QA-Red: fence-parity table (script vs TS locator), assert_story_files fence spawns, close_sprint Step 2.9 + 2.6c spawns, template approved-key + approveProbeStory flip, push wording, doctor can-edit/session-start, fresh-install sprint-init integration, 5 M2 sanctioned-delta rows
- [x] Export locateFrontmatterFence (JS port of frontmatter-locator.ts) and assertWorkItemApproved from assert_story_files.mjs; use them at :162
- [x] close_sprint.mjs imports locateFrontmatterFence; fix :250, :587 (span splice), :1035, :1053 (null or throw → skip)
- [x] Scaffold approved: false directly after status: in epic.md, story.md and hotfix.md
- [x] approveProbeStory flips the scaffolded approved key in place; throws on two approved lines
- [x] push.ts: absent-key wording; a present non-true value is rendered with JSON.stringify
- [x] doctor.ts: delete the positional sniffs in runSessionStart and runCanEdit
- [x] Byte-copy the 5 canonical files to the live mirror in one outer commit; typecheck and targeted tests

## 5. Verification Protocol (The Failing Test)
**Command:** `cd cleargate-cli`, then solo via `npm run test:file --`: `test/scripts/frontmatter-fence-parity.red.node.test.ts`, `test/scripts/assert-story-files-fence.red.node.test.ts`, `test/scripts/close-sprint-fence.red.node.test.ts`, `test/scripts/template-approved-key.red.node.test.ts`, `test/commands/push.node.test.ts`, `test/commands/doctor.node.test.ts`, `test/commands/doctor-session-start.node.test.ts`, `test/e2e/sprint-init-fresh-install.red.integration.node.test.ts`; plus `bash .cleargate/scripts/test/test_assert_story_files.sh` (unchanged regression anchor).

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
      | a phantom fence block inside the <instructions> block |

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

  @rules
  Scenario: A BUG-067-corrupted item is read from its first fence
    Given an approved story whose file carries a phantom `---` block before its <instructions> block
    When assert_story_files reads it
    Then it reports UNAPPROVED and exits 1, reading the same block `gate check` reads

  @interfaces
  Scenario: doctor reads approval behind an instructions block
    Given an approved <instructions>-led story in pending-sync and no active sprint
    When `doctor --can-edit src/x.ts` and `doctor --session-start` run
    Then can-edit allows the edit and the planning-first reminder is not printed

  @interfaces
  Scenario: Step 2.6c flips an instructions-led epic
    Given the lifecycle reconciler returns auto-flip for an <instructions>-led epic
    When close_sprint.mjs Step 2.6c runs
    Then the epic's status becomes Completed, its <instructions> block is byte-identical, and it is archived
```

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 48 | default tier, per plans/M5-fixwave.md BUG-090 test list as amended by FW-A16 (TPV re-seal: 40 red + 8 anchors) |
| Integration tests | 2 | fresh-install `sprint init` plus the two M2 parity files |
| E2E / acceptance tests | 1 | the -09 harness `sprint-init` row, once at QA-Verify and again at RS-4 (no `--known-fail`) |

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
