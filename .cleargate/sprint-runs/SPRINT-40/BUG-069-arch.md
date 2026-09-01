# BUG-069 — Architect Post-Flight (§C.6)

`role: architect`

**Verdict: `ARCH: PASS`**

Branch `story/BUG-069` @ `ea386fe3`, reviewed against `plans/M1.md` §2 / §4 / §8.
Pre-gate exit 1; sole flag is the known environmental `typecheck` exit-254
(`ENOENT: cleargate-cli/package.json`) — unchanged from BUG-068's post-flight, confirmed on
the same four grounds, not re-litigated. Other three checks pass.

Scope re-verified in one command: `git diff --stat 6dbcdf06 ea386fe3 --` over
`pre-tool-use-task.sh`, `pending-task-sentinel.sh`, `settings.json` and
`.cleargate/scripts/test/` returns **empty**. BUG-068's three surfaces and the red test are
untouched. `bash -n` on the edited hook is clean.

---

## 1. Did §8.2 do its job? — YES, and the prediction was exact

### 1.1 The shipped guard is the amended shape

`cleargate-planning/.claude/hooks/token-ledger.sh:335` (post-edit numbering):

```bash
if [[ -z "${AGENT_TYPE}" || "${AGENT_TYPE}" == "unknown" ]]; then
  AGENT_TYPE="unattributed"
```

Byte-for-byte §8.2's decided replacement. The `work_item_id` guard at `:341` is `-z`-only,
also as §8.2 required. The two guards are independent `if` blocks with the correct asymmetry
(already covered by QA-Verify; re-confirmed by reading, not re-argued).

### 1.2 Sc5 genuinely discriminates — measured, not asserted

I ran the counterfactual rather than reasoning about it. Method: mirrored
`bug069_ledger_fallback.red.sh` plus the two hooks it drives into a scratch tree preserving
the `SCRIPT_DIR/../../..` layout the test uses to resolve `HOOKS_DIR`. No production file was
touched; the worktree was never written to.

| Mirror state | Result |
|---|---|
| Shipped guard (`-z ‖ == "unknown"`) | **17 passed / 0 failed** |
| Guard reverted to `-z`-only | **16 passed / 1 failed** |

The single failure:

```
FAIL: Sc5: sentinel agent_type=unknown refuses to agent_type=unattributed — expected=unattributed actual=unknown
PASS: Sc5: work_item_id keeps the sentinel's value (STORY-989-01)
```

Sc1, Sc2, Sc3, Sc4 and Sc5's second assertion all stay green under the degraded guard. So the
discrimination is **exactly one assertion wide, and it is the right one** — it fails with
`actual=unknown`, naming the fake value rather than merely reporting a mismatch.

### 1.3 What would have shipped without §8.2

A `-z`-only implementation. It would have scored **16/16 green** (Sc5 would not have been
written), passed QA-Verify, passed this post-flight, and merged. Its behaviour: any spawn
reaching `pending-task-sentinel.sh` without a `tool_input.subagent_type` writes a sentinel whose
`agent_type` is the literal `"unknown"` (`pending-task-sentinel.sh:173`,
`.tool_input.subagent_type // "unknown"`, still present on the merged file), and
`IS_AGENT_SPAWN` is satisfied by `tool_name ∈ {Task, Agent}` alone (`:59-61`) so that path is
live. `token-ledger.sh` would have read it as ground truth and shipped
`agent_type: "unknown"` — a fabricated attribution surviving through the one source the
refusal treats as unconditional truth. BUG-069 would have shipped its own defect class under
a different literal.

§8.2 is the reason that did not happen. Recorded as a working instance of post-flight
amendment feeding forward into the next wave's spec.

---

## 2. Is `"unknown"` fully eliminated as a producible value? — YES, and more completely than §8.2 predicted

Verified on the post-edit file, not on the prediction.

**Producers of `AGENT_TYPE` — complete enumeration** (`grep -n 'AGENT_TYPE='`), 5 sites:

| Line | Source | Can it be `"unknown"`? |
|---|---|---|
| `:154` | `SENTINEL_AGENT_TYPE=""` init | no |
| `:231` | dispatch marker (`DISPATCH_AGENT`) | **no** — `pre-tool-use-task.sh:80` refuses to write a marker unless `agent_type` is non-empty **and** `grep -qxF` matches `ALLOW_LIST`; `"unknown"` is not in that list |
| `:264` | pending-task sentinel `.agent_type` | **yes** — this is §8.2's producer |
| `:332` | `AGENT_TYPE="${SENTINEL_AGENT_TYPE}"` | inherits from `:231`/`:264` |
| `:336` | `AGENT_TYPE="unattributed"` | no |

§8.2's claim that the other two producers (`:315`, `:317` at base numbering) sat inside the
deleted `302-461` region is **confirmed by the diff**: the `// "unknown"` jq default in the
legacy `subagent_type` capture and the `[[ -z … || == "null" ]] && AGENT_TYPE="unknown"`
line both went with the block. `grep -n unknown` on the post-edit file now returns **4 hits:
three comments (`:51`, `:328`, `:329`) and the guard itself (`:335`).** Zero assignment sites.

**Stronger than predicted:** because the guard sits at `:335` *after* `AGENT_TYPE` has been
resolved from either source, it screens the marker path too. Even if `ALLOW_LIST` were ever
widened to admit a literal `"unknown"` role name, the row would still refuse. The guard is
source-agnostic, not sentinel-specific.

**Consumer contract — verified on the post-edit files, all three need no edit:**

- `.cleargate/scripts/lib/ledger-digest.mjs` — `normalizeRow:57` `row.agent_type || row.agent
  || 'unknown'`; the hook now always writes a non-empty value so the fallback never fires.
  `aggregate:111-113` buckets `unattributed` into `by_agent.unattributed`; `:116` maps a null
  `work_item_id` to `unassigned`. The `:16` header contract ("must not crash") holds.
- `.cleargate/scripts/count_tokens.mjs:71-76` — canonical four first, then a tail loop over
  `Object.entries(by_agent)`; `unattributed` renders there.
- `.cleargate/scripts/prep_reporter_context.mjs:264-284` — same canonical-first + tail shape.

Both named suites re-run by me in the worktree: `test_count_tokens.sh` **3/0**,
`test_prep_reporter_context.sh` **3/0**.

`by_agent.unknown` is now reachable **only** from historical ledgers (rows written before this
merge) or from a row missing `agent_type` entirely, which the hook never writes. §8.2's
prediction holds; `ledger-digest.mjs:16` needs no edit, and I am not recommending one — its
comment is not false, it now describes a legacy-only bucket.

---

## 3. Architectural consequences of the −181-line deletion

Seven seams checked. Nothing blocking. Five observations, all recorded rather than actioned.

### 3.1 Dead code — none. Verified by enumeration, not by eye.

`grep -n 'work_item_plausible\|PRIOR_LEDGER\|DISPATCH_MARKER_WORK_ITEM\|STORY_ID_LEGACY\|WORK_ITEM_RAW'`
returns **zero hits** on the post-edit file. Every identifier introduced solely for the deleted
fallback chain went with it. `BANNER_SKIP_RE` survives at `:73` with exactly one consumer at
`:169`, as §4.3 required. `bash -n` clean.

### 3.2 Doc-lies — none surviving. One cosmetic residue.

`grep -niE 'legacy|fallback|step [1-4]|transcript.grep|anywhere'` returns 11 hits. Ten refer
to code that survives (the CR-026 newest-file marker path at `:190`/`:214`, the sentinel
second-priority path at `:247`, the `_off-sprint` fallback at `:37`) or are explicit
`(Removed):` documentation of the deletion (`:57-58`, `:71`).

The eleventh, `:163`, is cosmetic residue: *"a broad alphanumeric suffix to also match
letter-suffix IDs like STORY-A, STORY-B … (not just digit-keyed **like the legacy path**)."*
The digit-keyed legacy regex it compares against no longer exists in the file, so the
comparison points at nothing a reader can find. The sentence still conveys correct information
about the regex it documents. **Not a bounce** — flagged for the next incidental touch of this
file.

### 3.3 The transcript is still read — for *selection*, never for *origination*

Worth stating explicitly because a reviewer can reasonably think the deletion was incomplete.
`TRANSCRIPT_WORK_ITEM` is still derived from the transcript at `:164-185` (BUG-029 tuple-match).
But the enumeration in §2 above shows every `WORK_ITEM_ID=` site: `:155`, `:232`, `:267`,
`:333`, `:342`. **None of them reads `TRANSCRIPT_WORK_ITEM`.** It can only *disambiguate among
dispatch markers that already exist on disk* (`:196-201`, requiring `MATCH_COUNT == 1`); it can
never become the attributed value. §4.1's "the transcript is not a permitted attribution
source" is true for origination and, precisely, not for marker selection. The plan did not draw
this distinction; the implementation gets it right anyway.

Residual exposure is unchanged from BUG-029 and bounded: a poisoned transcript can at worst
select a *different but genuine* marker written by this sprint's own dispatcher. Guarded by
`BANNER_SKIP_RE` and the `MATCH_COUNT == 1` requirement. Out of scope.

### 3.4 `suggest_improvements.mjs` — a downstream compensator just went partly redundant

Not named in the plan. `.cleargate/scripts/suggest_improvements.mjs:146`:

```js
if (entry.work_item_id && entry.agent_type) {
```

Rows with an empty `work_item_id` are dropped from the skill-candidate corpus entirely. Post-069,
refused rows are invisible to that detector.

This is **correct, not a regression**: you cannot bucket an unattributed row by work item. More
pointedly, the false-positive class that file documents at `:160-172` — *"CR-045 × architect",
17 entries sharing one session_id* — is itself a product of the fabrication BUG-069 deletes, and
`isSessionShared()` (`:176-185`) exists to compensate for it. Fewer fabricated buckets will now
reach that filter. It is not dead (genuine same-session multi-dispatch buckets still exist), so
no removal is warranted. Recorded as a consequence, not an action.

### 3.5 `stamp-tokens` — expect new, *honest*, `stamp_error` values

`cleargate-cli/src/commands/stamp-tokens.ts:143` emits `no ledger rows for work_item_id <X>`.
Pre-069, a marker-less dispatch carried a fabricated or inherited id and therefore stamped
tokens onto *some* document — often the wrong one. Post-069 it carries `""`, matches no
document, and stamps nothing. A document whose dispatches were all unattributed will now
surface a visible `stamp_error` where it previously stamped cleanly and wrongly. This is the
intended trade (refuse over mis-stamp) and consistent with FLASHCARD 2026-08-24 `#tokens`.
**Gate 4 must not read a new `stamp_error` here as a regression.** Narrow in practice — see §4.2.

### 3.6 `cleargate-cli` consumers tolerate the new value domain

- `src/dashboard/collect.ts:430` — `'unknown'` fallback only when the field is absent/empty;
  never fires post-069. `:449` `orderedAgents = [...AGENT_ORDER, ...unlisted]` appends
  non-canonical agents, so `unattributed` renders in the dashboard.
- `src/lib/ledger-reader.ts:89` — passthrough. `:80-84` falls `work_item_id` back to
  `story_id`, which is also `""` post-069 (`token-ledger.sh:346-349` only sets `STORY_ID` on a
  `STORY-*` prefix). Consistent `""`, no surprise value.

### 3.7 Coverage gap — the producer is pinned, the render path is not

`command grep -rn "unattributed" .cleargate/scripts/` returns hits **only inside
`bug069_ledger_fallback.red.sh`**. No consumer test — `test_count_tokens.sh`,
`test_prep_reporter_context.sh`, or any `ledger-digest` test — carries an `unattributed` row in
its fixture. Their green proves the consumers did not *break*; it does not prove they *render*
the new value. I verified the render paths by reading them (§2), which is why this is not a
bounce. Follow-on candidate: one fixture row per consumer suite.

### 3.8 Report-metadata error (no code impact)

`BUG-069-dev.md`'s `adjacent_files` cites `cleargate-planning/.claude/scripts/lib/ledger-digest.mjs`
and `cleargate-planning/.claude/scripts/count_tokens.mjs`. **Neither path exists** — the real
files are `.cleargate/scripts/lib/ledger-digest.mjs` and `.cleargate/scripts/count_tokens.mjs`.
The files themselves are genuinely untouched and genuinely tolerant; only the report's path
strings are wrong. Cosmetic.

### 3.9 Task Breakdown

5 of 6 rows ticked in the **worktree** copy. Row 5 correctly left unticked with the
plan-superseded reason inline, per §0 item 4 and §7 open decision 2. Surface-gate compliant.

---

## 4. Sprint-goal readiness

Measured against the live tree, not inferred. Live hooks are **not yet re-synced**:
`grep -c 'Task|Agent' .claude/settings.json` → `0`; `.claude/hooks/pre-tool-use-task.sh` has no
`SUBAGENT_TYPE_PROBE`; `.claude/hooks/token-ledger.sh` has no `unattributed`. Everything below
is conditioned on the §5 post-merge re-sync.

### 4.1 Item 1 — `.dispatch-*.json` non-empty after any agent dispatch: **PARTIALLY REFUTED as literally worded**

Satisfiable for the five allow-listed roles. **Not satisfiable for "any agent dispatch."**
`pre-tool-use-task.sh:79` still reads
`ALLOW_LIST="architect developer qa reporter cleargate-wiki-contradict"` — 5 names — while
`ls cleargate-planning/.claude/agents/*.md` returns **11**. A `devops`, `architect-reader`,
`architect-synth`, `cleargate-wiki-ingest`, `cleargate-wiki-lint` or `cleargate-wiki-query`
dispatch writes **no marker** and hits the `:81` rejection log line instead.

BUG-069 changes nothing here — the marker-writing path is BUG-068's, untouched by this diff.
This is the already-escalated `ALLOW_LIST` gap (M1 §7 open decision 1) surfacing in the
acceptance wording. **Recommendation to the human at Gate 4:** restate item 1 as *"following an
allow-listed agent dispatch (architect / developer / qa / reporter / cleargate-wiki-contradict)"*,
or resolve open decision 1 first. Do not read a missing marker after a `devops` dispatch as a
failed fix.

### 4.2 Item 3 — marker-less `SubagentStop` appends `agent_type: unattributed`: **CONFIRMED, with a wording precision the human needs**

Mechanically satisfiable, and directly proven: red-test Sc1 (seeded ledger, refuses instead of
inheriting), Sc2 (two consecutive fires, no chaining), Sc5 (sentinel `"unknown"` refuses while
`work_item_id` is retained). All green, all in the counterfactual set.

**But "marker-less" is not sufficient in the live route, and the human will look for the wrong
thing.** Per §8.1, `pending-task-sentinel.sh` has no allow-list, so a marker-less dispatch still
gets a *correctly attributed* sentinel and its row reads e.g. `devops`, **not** `unattributed`.
An `unattributed` row requires a spawn that is marker-less **and** sentinel-less-or-`"unknown"`.
A healthy post-re-sync SPRINT-40 ledger may therefore contain **zero** `unattributed` rows.

**Absence of `unattributed` rows is the expected healthy state, not evidence the fix did not
ship.** The refusal is verified by its red test, never by grepping the production ledger.
Flashcarded.

### 4.3 Item 4 — >1 distinct `agent_type` for waves 2-3: **REFUTED as a discriminating check**

This is the finding I would most want in front of the human at Gate 4.

Census of SPRINT-40's **current, pre-re-sync** `token-ledger.jsonl` (101 rows, 1 session):

```
  93 architect
   4 qa
   2 developer
   1 devops
```

Four distinct `agent_type` values **already**. Item 4 is satisfied *today*, by the ledger the
sprint exists to fix, produced by hooks that still carry both bugs.

And the values are demonstrably fabricated. The `work_item_id` census on the same file:

```
  45 BUG-068      28 BUG-069      15 BUG-033      12 M1
```

`M1` is a milestone-plan **filename**, not a work-item id. `BUG-033` is not in this sprint. All
27 of those rows are attributed to `architect`. The 93/101 `architect` share is the exact field
signature quoted in M1 §4.3 — the role-word grep at base `:317-325` matching *any* transcript
containing `role: architect`, which the orchestrator's own transcript does constantly.

Item 4 as worded therefore passes both before and after the fix and proves nothing. A
discriminating replacement, satisfiable post-re-sync in wave 3: *"no ledger row carries a
`work_item_id` absent from this sprint's work-item set, and no single `agent_type` exceeds ~60%
of rows."* Both are false today and both become true once markers land. **Orchestrator/human
call at Gate 4 — I am not amending an acceptance criterion the human confirmed.**

### 4.4 Item 2 — unchanged by BUG-069

Confirmed: nothing in this diff touches `settings.json`, `pre-tool-use-task.sh` or the
`pre-tool-use-task.log` rejection path (`git diff --stat` over those paths → empty). The
recorded deviation (§8.4 / open decision 5 — `settings.json:15`'s `"Task|Agent"` matcher is the
outer gate, so no rejected tool name reaches the hook in production) stands exactly as written.
Not re-argued.

---

## 5. Out of scope — confirmed untouched, as directed

Stale-sentinel lifecycle asymmetry (§8.3) → follow-on bug; `ALLOW_LIST` gap → follow-on CR;
row 5 re-sync → post-merge orchestrator step; `.red.sh` immutability → known. None of the four
was actioned in this diff, and none should have been.

## Recommendations (none blocking)

1. Gate 4: restate acceptance items 1 and 4 per §4.1 / §4.3 before verifying them.
2. Follow-on: one `unattributed` fixture row in `test_count_tokens.sh` and
   `test_prep_reporter_context.sh` (§3.7).
3. Incidental: the stale "legacy path" comparison at `token-ledger.sh:163` (§3.2).

## Script Incidents

None from this dispatch. The single file under `.script-incidents/`
(`20260901T200711Z-4cd0cc827f94.json`) predates it — BUG-068 DevOps, 2026-09-01T20:07Z.

## Flashcards recorded

Two, appended to `.cleargate/FLASHCARD.md` (dupe-checked first):

- `#gate #ledger #danger` — a ">N distinct values" acceptance criterion is satisfied by the
  fabrication it exists to detect; assert a specific value on a specific row.
- `#hooks #ledger` — a healthy post-069 ledger shows zero `unattributed` rows; their absence is
  evidence of nothing. Verify a refusal path with its red test.

---

**`ARCH: PASS`** — merge-ready. §8.2 did its job and is measurably load-bearing: without it a
`-z`-only guard would have scored a clean 16/16 and shipped `agent_type: "unknown"`.
