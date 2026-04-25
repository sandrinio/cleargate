---
bug_id: BUG-005
parent_ref: EPIC-013
status: Draft
severity: P2-Medium
reporter: sandrinio
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
  last_gate_check: 2026-04-25T00:27:04Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id BUG-005
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-04-25T00:27:04Z
  sessions: []
---

# BUG-005: Sprint Orchestration Scripts Are Blind to CR-* Prefix

## 1. The Anomaly (Expected vs. Actual)

**Expected Behavior:**
A sprint can be composed of any mix of approved work-item types — Stories, CRs, Bugs — and the v2 sprint lifecycle scripts (`cleargate sprint init/close`, `cleargate state update`, the orphan scan in `sprintArchiveHandler`, the Gate-2 file assertion) should track *all* of them in `state.json` and surface the right transitions. The work-item ID should be the unit of orchestration; the prefix (`STORY-`, `CR-`, `BUG-`) is a category tag, not an orchestration boundary.

**Actual Behavior:**
The orchestration is hard-coded to `STORY-\d+-\d+` everywhere. CR-* and BUG-* IDs are silently ignored:

- `cleargate-planning/.cleargate/scripts/assert_story_files.mjs:60` — regex `/STORY-\d+-\d+/g` against the deliverables section. If a sprint deliverables table contains only CRs (e.g. SPRINT-13), the regex matches zero IDs, the assertion exits 0 with a "no missing files" report, and Gate-2 is silently bypassed.
- `cleargate-cli/src/commands/sprint.ts:276` — `getStoriesForEpic` filters by `STORY-${epicNum}-` literal prefix. CRs (or anything else) under the same epic are invisible to the close-out / archive logic.
- `cleargate-cli/src/commands/sprint.ts:437` — orphan scan only inspects entries starting with `STORY-`.
- `cleargate-cli/src/commands/sprint.ts:447` — story ID derivation regex assumes `STORY-NNN-NN` filename pattern.

Encountered concretely on 2026-04-25 while activating SPRINT-13 (deliverables = CR-003, CR-004, CR-005, CR-006). `cleargate sprint init SPRINT-13 --stories CR-003,CR-004,CR-005,CR-006` would write `state.json` keyed by CR IDs, but no downstream lifecycle command would know what to do with those keys. Sprint runs correctly through manual orchestration; v2 automation is the gap.

## 2. Reproduction Protocol

1. Create a sprint file in `.cleargate/delivery/pending-sync/SPRINT-XX_*.md` whose `## 1. Consolidated Deliverables` table contains only CR-* IDs (no STORY-* IDs).
2. Set `execution_mode: "v2"` and `approved: true` in the sprint frontmatter.
3. Run `node cleargate-planning/.cleargate/scripts/assert_story_files.mjs .cleargate/delivery/pending-sync/SPRINT-XX_*.md`
4. Observe: exit code 0, "all story files present" message, despite no STORY-* files existing for the deliverables.
5. Run `node cleargate-cli/dist/cli.cjs sprint init SPRINT-XX --stories CR-003,CR-004`
6. Observe: `state.json` is written with CR-* keys; subsequent `cleargate state update CR-003 in_progress` — verify behavior (likely either errors or no-ops because state-file IDs don't pattern-match).
7. Run `cleargate sprint close SPRINT-XX` — observe whether CR-* deliverables are detected as "complete" or silently dropped from the close-out report.

A failing-test recipe lives in §5 below.

## 3. Evidence & Context

```
$ grep -nE "STORY-\\\\d|startsWith\\(.STORY|story.+regex" \
    cleargate-planning/.cleargate/scripts/assert_story_files.mjs \
    cleargate-cli/src/commands/sprint.ts

cleargate-planning/.cleargate/scripts/assert_story_files.mjs:60:
  const matches = text.match(/STORY-\d+-\d+/g) || [];

cleargate-cli/src/commands/sprint.ts:276:
  return Object.keys(stateStories).filter((k) => k.startsWith(`STORY-${epicNum}-`));

cleargate-cli/src/commands/sprint.ts:431:
  // Orphan scan: any STORY-*.md in pending-sync with parent_epic_ref matching

cleargate-cli/src/commands/sprint.ts:437:
    if (!entry.startsWith('STORY-') || !entry.endsWith('.md')) continue;

cleargate-cli/src/commands/sprint.ts:447:
      // Derive story ID from filename (STORY-014-01_Something.md → STORY-014-01)
```

SPRINT-13 sprint plan deliverables row (from `.cleargate/delivery/pending-sync/SPRINT-13_Identity_Bound_Invite_Auth.md`):
```
| Item    | Title                                  | Complexity | Parallel? | Bounce Exposure | Milestone |
| `CR-003`| Identity-Bound Invite Redemption ...   | L3         | n         | high            | M1        |
| `CR-004`| GitHub OAuth Identity Provider ...     | L2         | y         | med             | M2        |
| `CR-005`| Email Magic-Link Identity Provider ... | L2         | y         | med             | M2        |
| `CR-006`| CLI cleargate join Provider Selection  | L3         | n         | med             | M3        |
```

`assert_story_files.mjs` against this file returns "0 STORY-* found" → silently passes.

## 4. Execution Sandbox (Suspected Blast Radius)

**Investigate / Modify:**
- `cleargate-planning/.cleargate/scripts/assert_story_files.mjs` — generalize regex to `(STORY|CR|BUG)-\d+(?:-\d+)?` (CR/BUG IDs may be flat `CR-NNN` while stories are `STORY-NNN-NN` — need to handle both shapes); update doc comment + variable names; rename module to `assert_work_item_files.mjs` (or keep the name but stop pretending it's only stories)
- `cleargate-cli/src/commands/sprint.ts:276` (`getStoriesForEpic`) — extend to scan all work-item-prefixed keys; rename to `getWorkItemsForEpic`
- `cleargate-cli/src/commands/sprint.ts:431-447` (orphan scan + ID derivation) — extend prefix list; the filename pattern differs (CR-NNN_*.md vs STORY-NNN-NN_*.md)
- `cleargate-cli/src/commands/sprint.ts` callers of `getStoriesForEpic` — update consumers
- `cleargate-cli/src/commands/state.ts` (if it exists with STORY assumptions) — extend
- All test files that mock STORY- prefixes — augment with CR-* + BUG-* fixtures
- `cleargate-cli/src/commands/sprint.ts:4` doc comment ("STORY-013-08: CLI wrappers for sprint lifecycle scripts.") — note the generalization

**Do NOT touch in this fix (out of sandbox):**
- The `STORY-*-NN` filename convention (Story granularity rubric in templates/story.md still applies — Stories keep `NNN-NN` shape; CRs keep flat `NNN`)
- The four-agent role contracts in `.claude/agents/` (Story-centric vocabulary in agent docs is a separate concern)
- The MCP `items.type` enum (already supports all six types including 'cr', 'bug' — `mcp/src/db/schema.ts:91`)

## 5. Verification Protocol (The Failing Test)

**Failing test before fix** (write this first; it must fail against current main):
```bash
# new test: cleargate-planning/.cleargate/scripts/assert_work_item_files.test.mjs
# Scenario 1: sprint with CR-only deliverables → assert script must REPORT missing CR-* files,
#             not silently pass.
# Scenario 2: sprint mixing STORY-* and CR-* → assert script must check both.
# Scenario 3: missing CR file → exit 1 with the CR id in the missing list.
```

**Failing test for sprint.ts:**
```bash
# new test: cleargate-cli/test/commands/sprint-cr-orchestration.test.ts
# Scenario: state.json contains keys CR-003, CR-004; getStoriesForEpic('019') returns ['CR-003','CR-004','CR-005','CR-006'].
# Scenario: orphan scan picks up CR-NNN.md files matching parent_epic_ref.
```

**Command (must fail before fix, pass after):**
```bash
cd cleargate-planning && node --test .cleargate/scripts/assert_work_item_files.test.mjs
cd cleargate-cli && npm test -- test/commands/sprint-cr-orchestration.test.ts
cd cleargate-cli && npm run typecheck
```

**Eviction confirmation:**
- `grep -rE "STORY-\\\\d\\+-\\\\d\\+" cleargate-planning/.cleargate/scripts/ cleargate-cli/src/commands/sprint.ts` → matches limited to filename-derivation regex for the `NNN-NN` story-shape ONLY, not for orchestration logic
- Round-trip: a CR-only sprint can be `init`'d, `state update`'d through a CR's lifecycle, and `close`'d cleanly

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟡 Medium Ambiguity**

Requirements to pass to Green (Ready for Fix):
- [x] Reproduction steps are 100% deterministic (above)
- [x] Actual vs. Expected behavior is explicitly defined
- [x] Raw error logs/evidence are attached (file:line citations + grep output)
- [x] Verification command (failing test) is provided
- [ ] Filename-pattern decision for CRs: keep flat `CR-NNN` (current convention; CR-001/002/003 all flat) vs. allow `CR-NNN-NN` mini-decomposition (no precedent; would muddy the "CRs are atomic" semantic). Recommend: keep flat.
- [ ] Decide: separate `assert_work_item_files.mjs` script vs. rename `assert_story_files.mjs` in place. Recommend: rename in place; one orchestration concept, one script.
- [ ] `approved: true` set in YAML frontmatter (Gate 1 sign-off)

## Notes

- This bug surfaced during SPRINT-13 activation (2026-04-25) and is **not blocking SPRINT-13 execution** — the sprint can proceed via manual orchestration. The four-agent loop reads work-item files directly; the missing piece is the v2 lifecycle scripts (`state.json` tracking + sprint close-out automation).
- A fix should land before any future sprint that mixes Story + CR deliverables, OR before a future CR-only sprint that wants the close-out automation.
- Suggested home: a one-story CR (or Story under EPIC-013 Execution Phase v2 / EPIC-014 Execution V2 Polish) in a future sprint. Not urgent enough to interrupt SPRINT-13.
