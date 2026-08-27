# STORY-054-02 — Developer Report

**Verdict: DONE.** Two commits, one Developer turn, per TPV Ruling 3 (all edits landed in
both trees before any test run; suite run once, after both commits' edits were staged).

## Sequence followed

1. Preflight read: sprint-context.md, story (post-amendment §3.1), M1.md (incl. TPV ruling
   block at `:881`), STORY-054-02-tpv.md, STORY-054-02-qa-red.md, FLASHCARD.md (`#test-harness`,
   `#gate`, `#id-parsing`).
2. Verified execution location: outer repo on `story/STORY-054-02` (main checkout, not a
   worktree), `cleargate-cli/` on `story/STORY-054-02`. Confirmed `spike.md` present in both
   trees (STORY-054-01 already merged).
3. Made ALL edits below in both working trees. Committed nothing until typecheck + targeted
   tests + full suite were run once.
4. Ran `npm --prefix cleargate-cli run typecheck` — clean.
5. Ran targeted files: `work-item-type-spike.node.test.ts` (12/12), `gate-section-index-pinning.node.test.ts`
   (14/14, S1a 18/16, S6 18=16+2), `work-item-type.node.test.ts` (15/15), `gate-unit.node.test.ts`
   (25/25), `readiness-predicates.node.test.ts` (119/119).
6. Ran the full suite once: `npm --prefix cleargate-cli test` → **2516 tests / 2514 pass /
   1 fail / 1 skip**. The 1 fail is the pre-existing `test/commands/sync.node.test.ts` network
   failure (`fetch failed` against `cleargate-mcp.soula.ge` — no outbound network in this
   sandbox), documented in sprint-context.md §Test Stack as the baseline's one known failure.
   All 6 of QA-Red's reds cleared; no other test regressed.
7. State-touch: `STORY-054-02` was already `Bouncing` — no-op (reported, not an error).
8. Commit A (outer repo), then Commit B (`cleargate-cli`), back-to-back, same turn.

## Files changed — outer repo (Commit A)

- `.cleargate/knowledge/readiness-gates.md` — appended two `work_item_type: spike` gate
  blocks (`ready-to-investigate`, `ready-to-conclude`) at file tail, after the `hotfix` block.
  Verbatim from M1 plan §"Schema changes". `severity: advisory` both blocks.
- `cleargate-planning/.cleargate/knowledge/readiness-gates.md` — byte-identical mirror
  (`diff` silent).
- `.cleargate/knowledge/cleargate-protocol.md` — §21.2 prose bucket list gains `spikes`;
  KNOWN_TYPES heading `(8 entries)` → `(9 entries)`, table gains one `spike` row after
  `sprint_report`.
- `cleargate-planning/.cleargate/knowledge/cleargate-protocol.md` — byte-identical mirror
  (`diff` silent).
- `.cleargate/templates/spike.md` — guidance fix (M1 A4 / story §3.1 site 5, orchestrator
  decision): one added sentence each in §1, §2, §5 instructing bullet-form answers. Each
  added sentence is prose (no line-initial `- `), so invariant 1 still holds — verified by
  Pin A staying green (all 4 non-vacuity assertions still fail on the shipped template).
  §4 untouched (table shape already non-vacuous via `declared-item`).
- `cleargate-planning/.cleargate/templates/spike.md` — byte-identical mirror (`diff` silent).
- `.cleargate/sprint-runs/SPRINT-39/STORY-054-02-dev.md` — this report.

## Files changed — `cleargate-cli` (Commit B)

- `src/lib/work-item-type.ts` — `WorkItemType` union `+= 'spike'`; `FM_KEY_MAP += { key:
  'spike_id', type: 'spike' }`; `PREFIX_MAP += { prefix: 'SPIKE-', type: 'spike' }`
  **appended last**, after `HOTFIX-` (R24 — `detectWorkItemType` matches by `includes`,
  not `startsWith`; placing `SPIKE-` last keeps `STORY-054-03_Spike-Doctrine.md` resolving
  to `story`, pinned by the R24 guard test); `WORK_ITEM_TRANSITIONS += spike:
  ['ready-to-investigate', 'ready-to-conclude']` (compiler-forced by the `Record<WorkItemType,
  string[]>` type — typecheck was the forcing function).
- `src/commands/push.ts` — `getItemType`'s private `typeMap` gains `spike_id: 'spike'`
  (M1 Open Decision #2 / R21, taken). Without this, `cleargate push` on a spike charter
  hard-errors with `exit(1)` before reaching the server.
- `test/lib/work-item-type.node.test.ts` — `WORK_ITEM_TRANSITIONS` count 8 → 9; title and
  `:18` header comment updated.
- `test/docs/gate-section-index-pinning.node.test.ts` — T2 four-site edit (all four land
  here, per M0's own fallback clause since 054-01 correctly did not pre-land them):
  `TEMPLATE_FOR += spike: 'spike.md'`; S1a totals `14→18` / `12→16`; S6 total `12→16`
  (`KNOWN_UNPINNABLE.size` stays 2, unchanged — no spike criterion is un-pinnable). Plus
  the six stale-prose sites TPV measured (not three): header `:22`, `:23`, `:41`, and
  titles for S1a, S1c ("six templates" → "seven templates"), S6. `:7`'s `14` (test-*case*
  count, a homonym) left untouched.
- `test/fixtures/gate-section-index/expected-headings.ts` — four new rows, hand-written
  from the criterion ids and `spike.md`'s actual `## ` heading lines (never derived by
  running the resolver): `spike.question-stated`, `spike.timebox-and-kill-criteria-set`,
  `spike.decision-log-populated`, `spike.outcome-declared`.
- `test/commands/gate-unit.node.test.ts` — TPV addition (Ruling 1): block count `9 → 11`
  at `:748` (now shifted a few lines from the new comment text), title and comment updated.
- `test/lib/readiness-predicates.node.test.ts` — TPV addition (Ruling 1): block count
  `9 → 11` at `:714`, title (`:699`) and comment (`:713`) updated.
- `test/lib/work-item-type-spike.red.node.test.ts` → `test/lib/work-item-type-spike.node.test.ts`
  — `git mv`, content unchanged (TPV Ruling 5/7). QA-Red's file was correct as authored;
  zero edits, all 12 cases (6 red-to-clear + 6 permanent pins) go green.

**`work-item-id.ts` untouched** — `git diff cleargate-cli/src/lib/work-item-id.ts` is empty
(DoD item / Requirement 6; `TYPE_PREFIXES` already carried `SPIKE`, per BUG-041).
**`readiness-predicates.ts` untouched** — Cross-Cutting Rule 3 held; `evalSection` was not
imported, exported, or re-implemented.

## R30 count (obligation from M1 plan)

Registering `spike` in `work-item-type.ts` while other id-key registries stay unregistered
adds a row to BUG-051's drift table, as the plan requires stating. This story closes exactly
**one** of the sites R30 lists — `push.ts:506-518` `getItemType` (the one Finding 3 / R21
scoped in via the fifth Gherkin scenario). All others named in M1 plan R30 remain open,
**including two more sites inside `push.ts` itself** that I verified independently and are
NOT closed by the `getItemType` fix: `findItemByIdOrRemoteId`'s key list (`push.ts:~459`)
and `getItemId`'s key list (`push.ts:~481`) both hardcode `['story_id', 'epic_id',
'proposal_id', ('sprint_id',) 'cr_id', 'bug_id']` with no `spike_id`, independently of
`getItemType`. Remaining open sites (none in this story's surface, none taken here):
`src/lib/sync/work-items.ts` (2 sites), `src/commands/push.ts` (2 sites, above),
`src/commands/pull.ts` (2 sites), `src/commands/sync.ts` (2 sites),
`src/commands/stamp-tokens.ts` (1 site), `src/lib/wiki-comments-render.ts` (2 sites),
`src/lib/wiki/contradict.ts` (1 site), `.claude/hooks/stamp-and-gate.sh` (1 site) — 13
sites across 8 modules, unchanged from the plan's count minus the one this story closes.

## Gherkin coverage — all five scenarios (§2.1 + M1 Open Decision #2's fifth)

1. `detectWorkItemTypeFromFm({ spike_id: 'SPIKE-001' })` → `'spike'` — PASS.
2. `detectWorkItemType('SPIKE-001')` → `'spike'` — PASS. Plus R24 ordering-guard regression:
   `detectWorkItemType('STORY-054-03_Spike-Doctrine.md')` → `'story'`, never `'spike'` — PASS.
3. Advisory gate passes: §1 + §2 populated, §5 empty, `ready-to-investigate` transition — PASS.
4. Error case: §2 has 1 listed-item (not 2) → `timebox-and-kill-criteria-set` reported by id,
   detail `"section 2 has 1 listed-item (≥2 required)"` — PASS.
5. `cleargate push` on a spike charter resolves type `'spike'` and reaches `push_item` — PASS.

Plus Pin A (non-vacuity guard, permanent): all four `section(N)` criteria FAIL against the
shipped, unedited `spike.md` — PASS (guidance-sentence edits did not introduce a `- `
bullet in any gated section).

## Rulings applied (TPV, `plans/M1.md:881`)

1. T2 is seven sites, not four — both `gate-unit.node.test.ts:748` and
   `readiness-predicates.node.test.ts:714` bumped in Commit B. Applied.
2. Red-window set is `S1a, S1b, S3a, S3b, S6` (not S5) — not directly observed since all
   edits landed before any test run (Ruling 3 followed), so no partial-state red window
   was ever produced or needed diagnosis. Ruling 3 made Ruling 2 moot in practice.
3. Sequence: all edits in both trees first, single suite run after both, then state-touch,
   then Commit A, then Commit B. Followed exactly — no intermediate red state was observed.
4. Arithmetic confirmed empirically: 18/16/16, `KNOWN_UNPINNABLE.size === 2`, four fixture
   rows, six stale-prose sites (not three). Matches TPV's numbers exactly.
5. `git mv` to `test/lib/work-item-type-spike.node.test.ts` in Commit B — applied, content
   unchanged.
6. No `severity` assertion added to the QA-Red file — applied (none added anywhere).
7. QA-Red file untouched except the Ruling-5 rename — applied; all 12 cases pass with zero
   content edits.

## Surprises

None beyond what TPV had already flagged (the seven-site T2 set, the six stale-prose sites,
and the S3a/S3b-not-S5 red-window correction were all pre-identified by TPV before this
dispatch — following Ruling 3 meant none of them was ever actually observed as a red state,
only avoided). One drafting note for the record: this story's own dispatch's "Expected end
state" full-suite line (`2516/2508/7/1`) is QA-Red's **pre-fix** baseline, not the post-fix
target — the correct post-fix reading is `2516/2514/1/1` (the 6 reds this story clears are
not "pre-existing" fails; only `sync.node.test.ts`'s network failure is). Confirmed against
sprint-context.md §Test Stack, which independently states the baseline pre-existing-failure
count as 1, matching what was measured here.

## STATUS

```
STATUS: done
COMMITS: 3a114e9c (outer) / 32eaaa0 (cleargate-cli)
SUITE: 2516/2514/1/1  (pre-existing fail same as sprint-context.md baseline: yes, 1 — the
  sprint-context.md pre-existing count is 1, not the QA-Red pre-fix total of 7)
PINNING: 18/16/16 confirmed, KNOWN_UNPINNABLE.size === 2
SPIKE_TEST: 12/12 (file renamed: yes, work-item-type-spike.red.node.test.ts →
  work-item-type-spike.node.test.ts)
MIRRORS: all three diffs silent (readiness-gates.md, cleargate-protocol.md, spike.md)
RULINGS_APPLIED: 1-7, all applied (2 was moot in practice — Ruling 3 avoided ever
  producing the partial-state red window Ruling 2 describes)
```

## Note on this file's own commit status

This report could NOT be committed in Commit A as instructed: the outer repo's pre-commit
surface gate (`pre-commit-surface-gate.sh`) rejected it — `[surface-gate] BLOCKED: staged
files outside declared §3.1 surface: off-surface: .cleargate/sprint-runs/SPRINT-39/STORY-054-02-dev.md`
— because `*-dev.md` sprint-run reports are not on the whitelist the gate checks against
the story's declared §3.1 file list, exactly as the dispatch anticipated ("the surface-gate
whitelist does not admit `*-dev.md`"). Per the dispatch's explicit instruction, I did NOT
set `SKIP_SURFACE_GATE=1` (no explicit human approval for a hook bypass) and did NOT
silently drop the file — I unstaged it, completed Commit A with the six declared
knowledge-doc files only, and am surfacing this here plus in the final STORY report to the
orchestrator. This file remains on disk, uncommitted, at
`.cleargate/sprint-runs/SPRINT-39/STORY-054-02-dev.md` — same state as `STORY-054-02-tpv.md`
and `STORY-054-02-qa-red.md` (both `??` in `git status`, also outside any declared surface).
The orchestrator/DevOps should fold these sprint-run artifacts into a wave-close docs commit,
or the surface gate's declared-file check should special-case `.cleargate/sprint-runs/**`
report/plan artifacts the same way it already tolerates hook-owned files
(`.session-totals.json`, `token-ledger.jsonl`, `state.json`).
