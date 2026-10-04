---
bug_id: BUG-098
parent_ref: null
parent_cleargate_id: null
sprint_cleargate_id: SPRINT-41
carry_over: false
area: frontmatter,cli
status: "Completed"
severity: P1-High
reporter: orchestrator (SPRINT-41 fix-wave Architect census, plans/M5-fixwave.md Follow-ups)
approved: true
approved_by: sandrinio
approved_at: 2026-09-26T09:30:00Z
context_source: plans/M5-fixwave.md Follow-ups census at cli main 35580b0 (measured phantom write-back in sprint.ts); BUG-067 carry-forward list; SPRINT-41 §4 M0 closeout follow-ups; owner directive 2026-09-26 'log every issue you find and fix them'
created_at: 2026-09-26T10:45:00Z
updated_at: 2026-09-26T10:45:00Z
created_at_version: strategy-phase-pre-init
updated_at_version: strategy-phase-pre-init
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-09-26T09:59:23Z
  transition: ready-for-fix
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id BUG-098
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-09-26T09:59:23Z
  sessions: []
---

# BUG-098: The remaining positional frontmatter readers misread or corrupt `<instructions>`-led work items (BUG-067 / BUG-090 carry-forward)

### Open Questions

- **Question:** Should every remaining site move to BUG-067's shared `locateFrontmatter`, or only the ones that write or gate?
- **Recommended:** Every site that reads or writes a *work item* uses the shared locator (TS) or BUG-090's `locateFrontmatterFence` (scripts). The generated-page parsers and sprint-report parsing are listed "leave" in plans/M5-fixwave.md, and stay as they are.
- **Human decision:** Recommended option taken. Owner directive 2026-09-26: "log every issue you find and fix them". The orchestrator resolved this question under sprint autonomy, because the sprint goal requires that freshly scaffolded items "stop corrupting".

## 1. The Anomaly (Expected vs. Actual)
**Expected Behavior:** Every cli path that reads or rewrites a work item's frontmatter finds the real fence, even when a leading `<instructions>` block sits before it. `cleargate new` writes that block into every item (CR-108). This is the contract BUG-067 established.

**Actual Behavior:** [[BUG-067]] fixed five TypeScript sites and [[BUG-090]] fixes the sprint scripts. These sites still require `---` at offset 0:
- **Data-corrupting.** `src/commands/sprint.ts:745-760` (`parseFileFrontmatter`) returns `{fm:{}, body: raw}` for an `<instructions>`-led sprint plan. The `sprint init --allow-drift` waiver write-back (`:396-406`) then serialises a new frontmatter block, holding only `context_source`, *in front of* the `<instructions>` block. That is BUG-067's phantom-block signature. Other callers: `:307`, `:628`, `:808`, `:828`, `:959`, `:1024`.
- **Close-blocking.** `src/lib/lifecycle-reconcile.ts:777` (`setFrontmatterFieldAtomic`) throws on an `<instructions>`-led story, so close stops at Step 2.6d.
- **Gate misread.** `src/lib/readiness-predicates.ts:434-462` (`readFrontmatterFromFile`) reads an `<instructions>`-led parent proposal or initiative as `{}`, so `parent-approved` fails for a properly approved parent.
- **Other readers:**
  - `src/commands/doctor.ts:257` and `:854` (`--pricing`)
  - `src/lib/frontmatter-merge.ts:93`
  - `src/lib/slug.ts:162`
  - `src/lib/wiki/contradict.ts:495`
  - `src/commands/wiki-audit-status.ts:251`
  - `src/lib/intake.ts:263` (`hasAnyRemoteAuthored` scans the `<instructions>` preamble)
- **Scripts:**
  - `prep_reporter_context.mjs:84` gives null dates for an `<instructions>`-led sprint plan.
  - `dedupe_frontmatter.mjs:60` skips `<instructions>`-led files.
  - `backfill_hierarchy.mjs` (M0 follow-up list) is left failing closed: it is live-only, and its skip guards against BUG-048's sprint re-ownership.

## 2. Reproduction Protocol
1. In a scratch dir: `git init`, then `node <cli>/dist/cli.js init --yes`, then `cleargate new sprint probe`. Leave the `<instructions>` block in place.
2. Create lifecycle drift: list a story whose status disagrees with the sprint. Then run `cleargate sprint init SPRINT-01 --allow-drift`.
3. `head -5` the sprint plan. A new `---\ncontext_source: "lifecycle waiver: …"\n---` block now sits before `<instructions>`, and the original frontmatter is untouched below it. That is a phantom block.
4. Separately, give `parent_ref` to an approved `<instructions>`-led initiative in an epic, then run `gate check` on the epic. `parent-approved` fails.

Edge conditions: CRLF; a file with no frontmatter (each site keeps today's fallback); a demoted phantom already present (the first fence is read, matching BUG-067 and BUG-090 FW-A1); generated wiki pages and sprint reports (leave, `---`-led by construction).

## 3. Evidence & Context
```
src/commands/sprint.ts:747   if (lines[0] !== '---') return { fm: {}, body: raw };
src/commands/sprint.ts:397-406  --allow-drift: parseFileFrontmatter(rawSprint) → fm['context_source'] = waiverLine
                                → atomicWriteStr(sprintPlanPath, serializeFileContent(fm, body))   // body = whole raw file
plans/M5-fixwave.md "Follow-ups": sites measured at cli main 35580b0; `--allow-drift` phantom write-back reproduced 2026-09-26 in /private/tmp/cg-s41-fixwave-plan; the decomposition gate then reads the phantom and reports 'no epics or proposals'
```

## 4. Execution Sandbox (Suspected Blast Radius)
**Investigate / Modify:**
- `cleargate-cli/src/lib/frontmatter-locator.ts`: add the exports `frontmatterYaml` and `withFrontmatterYaml` (the shared splice helper).
- `cleargate-cli/src/commands/sprint.ts`: `parseFileFrontmatter` and its readers (`:307`, `:628`, `:959`, `:1024`), plus the writers `:396-411`, `stampFile` and `stampSprintClose`.
- `cleargate-cli/src/lib/lifecycle-reconcile.ts` (`setFrontmatterFieldAtomic`), `src/lib/readiness-predicates.ts` (`readFrontmatterFromFile`).
- `cleargate-cli/src/commands/doctor.ts:257,854`, `src/lib/frontmatter-merge.ts:91-100`, `src/lib/slug.ts:160-169`, `src/lib/wiki/contradict.ts:492-516`, `src/commands/wiki-audit-status.ts:248-270`, `src/lib/intake.ts:263` (new site).
- `cleargate-cli/scaffold/core/.cleargate/scripts/{prep_reporter_context,dedupe_frontmatter}.mjs` plus the live mirrors, in one outer commit, using BUG-090's exported `locateFrontmatterFence`.
- `cleargate-cli/test/helpers/init-fixture.ts`: 2 sanctioned-delta rows.
- **Leave:**
  - `.cleargate/scripts/backfill_hierarchy.mjs`: live-only and not shipped; its fail-closed skip guards against the BUG-048 body-regex sprint re-ownership.
  - `src/wiki/page-schema.ts:117`, `src/wiki/code-map/page-schema.ts:89`, `src/commands/push.ts:235`.
  - The push/pull/sync whole-file write-backs `push.ts:341`, `pull.ts:172`, `sync.ts:575,665`, `sync/work-items.ts:327`: sprint §4 BUG-067 carry-forward (1).
The exact site list and test shapes are pinned by `plans/M5-fixwave.md` §BUG-098. It depends on BUG-090 (the script locator export).

## Task Breakdown
- [x] QA-Red: splice-helper reds; --allow-drift (LF, CRLF, malformed), stampSprintClose, archive stampFile, lifecycle_init_mode read; 2.6d set-field (LF, CRLF append); parent-approved (initiative, proposal); doctor advisory + pricing; slug ×2; merge; contradict stamp; audit-status fix; intake R10; two script spawns; fresh-install --allow-drift integration; 2 M2 delta rows
- [x] Add frontmatterYaml / withFrontmatterYaml to src/lib/frontmatter-locator.ts
- [x] sprint.ts: parseFileFrontmatter through locateFrontmatter; waiver, stampFile and stampSprintClose splice via rewriteFrontmatter; malformed YAML → no write
- [x] Fix setFrontmatterFieldAtomic and readFrontmatterFromFile the same way
- [x] Fix doctor :257/:854, frontmatter-merge, slug, contradict, wiki-audit-status, intake
- [x] prep_reporter_context.mjs and dedupe_frontmatter.mjs import locateFrontmatterFence (needs BUG-090); byte-copy both to the live mirror at integration (after merging sprint/S-41, never during the build; FW-A17 item 3), in one outer commit
- [x] Typecheck and the targeted tests

## 5. Verification Protocol (The Failing Test)
**Command:** `cd cleargate-cli`, then each solo via `npm run test:file --`: `test/lib/frontmatter-yaml-splice.red.node.test.ts`, `test/commands/sprint-frontmatter-fence.red.node.test.ts`, `test/commands/sprint-archive.node.test.ts`, `test/lib/lifecycle-reconcile-fence.red.node.test.ts`, `test/commands/gate-unit.node.test.ts`, `test/commands/doctor-fence.red.node.test.ts`, `test/lib/slug.node.test.ts`, `test/lib/frontmatter-merge.node.test.ts`, `test/wiki/contradict.node.test.ts`, `test/wiki/audit-status.node.test.ts`, `test/lib/intake.node.test.ts`, `test/scripts/scripts-fence-bug098.red.node.test.ts`, `test/e2e/sprint-allow-drift-fresh-install.red.integration.node.test.ts`.

| Axis | Cover | Reason |
|---|---|---|
| Paths | T | `---`-led (unchanged) and `<instructions>`-led items both read and write correctly |
| Interfaces | T | `sprint init`, the close reconciler, the readiness gate, doctor, the wiki and the scripts |
| Data | T | LF and CRLF; a phantom block before `<instructions>` |
| Rules | T | A write never touches bytes outside the located frontmatter span |

```gherkin
Feature: Every work-item frontmatter reader finds the real fence

  @rules
  Scenario: --allow-drift never plants a phantom block
    Given an <instructions>-led sprint plan and lifecycle drift
    When `cleargate sprint init <id> --allow-drift` records its waiver
    Then context_source is updated inside the real frontmatter and the <instructions> block is byte-identical

  @interfaces
  Scenario: The close reconciler sets a field on an instructions-led story
    Given an <instructions>-led story that Step 2.6d must update
    When close_sprint runs the lifecycle reconciler
    Then the field is set in the real frontmatter and close does not stop

  @interfaces
  Scenario: parent-approved reads an instructions-led approved parent
    Given an epic whose parent_ref names an approved <instructions>-led initiative
    When `gate check` runs on the epic
    Then parent-approved passes

  @data @paths
  Scenario Outline: Remaining readers agree with the shared locator
    Given an <variant> work item
    When <reader> reads its frontmatter
    Then it returns the same fields as locateFrontmatter
    Examples:
      | variant              | reader                   |
      | instructions-led LF  | each reader named in §4  |
      | instructions-led CRLF| each reader named in §4  |
      | ---led               | each reader named in §4  |

  @rules
  Scenario: A malformed frontmatter behind <instructions> is never rewritten
    Given an <instructions>-led sprint plan whose frontmatter is not valid YAML
    When `cleargate sprint init <id> --allow-drift` records its waiver
    Then the file is byte-identical and no block is planted before <instructions>
```

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 27 | default tier, per plans/M5-fixwave.md §BUG-098 |
| Integration tests | 1 | fresh-install `sprint init --allow-drift`, plus the two M2 parity files |
| E2E / acceptance tests | 1 | the clean-room `sprint-init` row at RS-4 |

---

## Prior work

- [[BUG-067]] — the shared locator; its carry-forward names `frontmatter-merge.ts`, `sprint.ts:745` and `doctor.ts:947`. This bug completes it.
- [[BUG-090]] — the scripts' `locateFrontmatterFence`; this bug reuses its export.
- [[SPRINT-41]] — the §4 M0 closeout follow-ups list these sites; the fix-wave Architect census measured them.

## Context Source

**context_source:** `plans/M5-fixwave.md` Follow-ups census at cli main `35580b0`, and the BUG-067 carry-forward list.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity**

- [x] Reproduction steps are 100% deterministic.
- [x] Actual vs. Expected behavior is explicitly defined.
- [x] Raw error logs/evidence are attached.
- [x] Verification command (failing test) is provided.
- [x] `approved: true` is set in the YAML frontmatter.
