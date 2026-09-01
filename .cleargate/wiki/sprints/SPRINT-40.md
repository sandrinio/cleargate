---
type: sprint
id: "SPRINT-40"
parent: ""
children: []
status: "Shipped"
remote_id: ""
raw_path: ".cleargate/sprint-runs/SPRINT-40/SPRINT-40_REPORT.md"
last_ingest: "2026-09-01T22:17:13.167Z"
last_ingest_commit: ""
repo: "planning"
report_raw_path: ".cleargate/sprint-runs/SPRINT-40/SPRINT-40_REPORT.md"
last_report_ingest_commit: "b99863b7a923f80c9de4ee3e837fcdcc00856d7c"
---

# SPRINT-40: SPRINT-40 Report: Field-Defect Remediation

`role: reporter`

<!-- Sprint Report v2 Template — template_version: 2 -->

# SPRINT-40 Report: Field-Defect Remediation

**Status:** Shipped
**Window:** Scheduled 2026-08-31 to 2026-09-04. Actual execution 2026-09-01T18:51Z–2026-09-02T02:05Z
(~7 hours wall-clock across one calendar-midnight boundary) — closed 2 days ahead of schedule.
**Stories:** 3 planned / 3 shipped / 0 carried over. (3 further items — BUG-047, BUG-048, CR-115 —
were descoped at SDR *before* wave 1 started; see §1 footnote. Not counted as carried-over.)

---

## §1 What Was Delivered

### User-Facing Capabilities
- Operators of ClearGate's own CLI diagnostics: `validate_state.mjs <path>` now accepts a bare
  positional state-file path instead of silently discarding it and then reporting "Multiple
  state.json files found" with a wall of candidates that includes the very path just given
  (CR-117, commit `8fb96999`). QA independently reverted the fix and reproduced the exact field
  incident end-to-end against the real repo's ~15-24 `state.json` candidates.

[+31,890 bytes not shown — read .cleargate/sprint-runs/SPRINT-40/SPRINT-40_REPORT.md]

## Blast radius
Affects: no parent/child refs declared in frontmatter
<!-- BEGIN sprint-report -->
## Sprint Report

`role: reporter`

<!-- Sprint Report v2 Template — template_version: 2 -->

# SPRINT-40 Report: Field-Defect Remediation

**Status:** Shipped
**Window:** Scheduled 2026-08-31 to 2026-09-04. Actual execution 2026-09-01T18:51Z–2026-09-02T02:05Z
(~7 hours wall-clock across one calendar-midnight boundary) — closed 2 days ahead of schedule.
**Stories:** 3 planned / 3 shipped / 0 carried over. (3 further items — BUG-047, BUG-048, CR-115 —
were descoped at SDR *before* wave 1 started; see §1 footnote. Not counted as carried-over.)

---

## §1 What Was Delivered

### User-Facing Capabilities
- Operators of ClearGate's own CLI diagnostics: `validate_state.mjs <path>` now accepts a bare
  positional state-file path instead of silently discarding it and then reporting "Multiple
  state.json files found" with a wall of candidates that includes the very path just given
  (CR-117, commit `8fb96999`). QA independently reverted the fix and reproduced the exact field
  incident end-to-end against the real repo's ~15-24 `state.json` candidates.
- ClearGate operators generally: the pre-dispatch flashcard safety gate — silently disabled since
  this Claude Code build renamed its agent-spawn tool from `Task` to `Agent` — is restored in
  **canonical** (`BUG-068`, commit `b642af5a`). This is a P0 safety fix, not an accounting one:
  unprocessed flashcards stopped blocking dispatch entirely. **Not yet live** — see §4/§6 Process.

### Internal / Framework Improvements
- `pre-tool-use-task.sh` / `pending-task-sentinel.sh`: replaced the `tool_name == "Task"` equality
  guard with an accept-predicate (`tool_name ∈ {Task, Agent}` **or** `tool_input.subagent_type`
  present) and made the previously-silent rejection path log a line, closing the exact "no trace on
  early exit" failure class already carded under BUG-058.
- `settings.json:15` matcher widened `"Task"` → `"Task|Agent"`.
- `token-ledger.sh`: deleted the entire four-step marker-absent fallback chain (−181/+117 lines,
  region `302-461`) — self-referential prior-row inheritance, dispatch-log scrape, transcript scan,
  anywhere-grep — and replaced it with an explicit, independently-refusing guard:
  `agent_type` refuses on empty **or** the literal `"unknown"`; `work_item_id` refuses on empty only
  (`BUG-069`, commit `3eef0661`). The `"unknown"`-literal clause was added mid-flight by the
  Architect (M1.md §8.2) *before* BUG-069's QA-Red was written — see §4.7 Self-Correction Chain.
- `reporter.md` (this agent's own contract) gained an explicit refusal instruction: census
  `agent_type` before publishing a per-agent cost table; refuse (total + named reason) if any row
  is `unattributed` or a single value dominates the census.

### Carried Over
- None.

**Footnote — three items descoped, not carried over.** `BUG-047`, `BUG-048`, `CR-115` were refused
by `architect-synth` at Sprint Design Review under the BUG-046 reachability predicate: their
surfaces live in `cleargate-cli/**`, an independent nested git repo that is gitignored in this
meta-repo and materializes zero tracked files inside a `git worktree add` checkout. They never
entered a wave and are not "carried over" in the bounce/escalation sense — they remain in
`pending-sync/`, approved and gate-passing, for a follow-up sprint scoped for cli-main-checkout
execution. Descoping this way narrowed the Sprint Goal itself (see sprint-context.md's goal-narrow
note) and left `CR-117` as `GOAL_RELATION: off critical path` — real, necessary work, just not what
this sprint is measured by.

---

## §2 Story Results + CR Change Log

### BUG-068: PreToolUse dispatch hooks gate on the tool name `Task`
- **Status:** Completed
- **Complexity:** N/A (Bug — no L-complexity field in this template)
- **Commit:** `b642af5a` (merge); `fa4873a2` (fix); `6b121b96` (wiki-ingest side effect)
- **Bounce count:** qa=0 arch=0 total=0
- **CR Change Log:**
  | # | Event type | Description | Counter delta |
  |---|---|---|---|
  | 1 | CR:approach-change | Architect post-flight review of `story/BUG-068` found `pending-task-sentinel.sh` carries **no** `ALLOW_LIST` at all, so the 6 non-allow-listed roles are attributed via the sentinel, not left silently missing. This *downgrades* the original open-decision-1 severity and, separately, exposes that the sentinel's `subagent_type // "unknown"` default is a non-empty fake-attribution value BUG-069's `-z`-only guard (as originally decided) would never catch. M1.md §8 appended, with a pointer inserted under §4 so wave-2 could not miss it. **BUG-068's own diff is unaffected** — the amendment changes wave-2's (BUG-069's) planned shape only. | none (BUG-068's own commit; effect lands on BUG-069 below) |
  | 2 | CR:spec-clarification | Same post-flight pass: Goal Acceptance Check item 2's "including a line for a rejected tool name" clause was found unobservable through the live route — `settings.json:15`'s `Task\|Agent` matcher is the *outer* gate, so a rejected tool name never reaches the hook in production; the rejection path is real and proven only by direct invocation (red test Sc3.1/Sc3.2). Recorded as a known deviation for Gate 4, not self-amended. | none (documentation/wording finding; no code change) |
- **UR Events:** none.

### BUG-069: Token-ledger fallback inherits the previous row's attribution
- **Status:** Completed
- **Complexity:** N/A (Bug — no L-complexity field in this template)
- **Commit:** `3eef0661` (merge); `ea386fe3` (fix); `6dbcdf06` (qa-red)
- **Bounce count:** qa=0 arch=0 total=0
- **CR Change Log:**
  | # | Event type | Description | Counter delta |
  |---|---|---|---|
  | 1 | CR:approach-change | Inbound from BUG-068's post-flight (M1.md §8.2), absorbed **before** QA-Red was written: the `agent_type` refusal guard rejects `-z` **or** the literal `"unknown"` (the sentinel's own default), not empty alone; a fifth red-test scenario (Sc5) added. Architect's own post-flight ran the counterfactual: guard reverted to `-z`-only scored **16/16 green** and would have shipped `agent_type: "unknown"` — the exact fabrication class this story exists to kill, under a different literal. | none (pre-emptive plan amendment; never manifested as a bounce because it landed before the story's own QA-Red existed) |
- **UR Events:** none.

### CR-117: A CLI script that ignores an argument says so
- **Status:** Completed
- **Complexity:** N/A (fast lane, no post-flight Architect dispatched — correctly absent)
- **Commit:** `8fb96999` (merge); `d8ab60b3` (fix)
- **Bounce count:** qa=0 arch=0 total=0
- **CR Change Log:** none.
- **UR Events:**
  | # | Event type | Feedback | Tax impact |
  |---|---|---|---|
  | 1 | UR:review-feedback | CR text left "which input wins when both `--state-file` and a positional path are given" unspecified. Developer resolved it (`--state-file` wins, disclosed as the more explicit form); QA judged this a defensible, disclosed interpretation consistent with `CR-093` precedent rather than a defect, and did not request rework. | none (enhancement/clarification, not rework) |

---

## §3 Execution Metrics

| Metric | Value |
|---|---|
| Stories planned | 3 |
| Stories shipped (Done) | 3 |
| Stories escalated | 0 |
| Stories carried over | 0 |
| Fast-Track Ratio | 33.3% (1 of 3 — `CR-117`) |
| Fast-Track Demotion Rate | 0% (0 of 1 fast-lane stories demoted) |
| Hotfix Count (sprint window) | 0 (`wiki/topics/hotfix-ledger.md` holds one entry total, `HOTFIX-001` @ 2026-04-30, outside this sprint's window) |
| Hotfix-to-Story Ratio | 0.00 |
| Hotfix Cap Breaches | 0 |
| LD events | 0 (`events.jsonl` carries zero lane-demotion rows) |
| Total QA bounces | 0 |
| Total Arch bounces | 0 |
| CR:bug events | 0 |
| CR:spec-clarification events | 1 |
| CR:scope-change events | 0 |
| CR:approach-change events | 1 |
| UR:bug events | 0 |
| UR:review-feedback events | 1 |
| Circuit-breaker fires: test-pattern | 0 |
| Circuit-breaker fires: spec-gap | 0 |
| Circuit-breaker fires: environment | 0 |
| **Bug-Fix Tax** | 0% |
| **Enhancement Tax** | 33.3% (1 disclosed-interpretation clarification / 3 stories — not rework; see §2 CR-117) |
| **First-pass success rate** | 100% (3 of 3 stories, zero qa/arch bounces) |
| Token source: ledger-primary | 77,417,668 tokens (see caveat below — **do not read this as trustworthy per-agent data**) |
| Token source: story-doc-secondary | 0 tokens (all three items' `draft_tokens` frontmatter is present but all-zero this sprint) |
| Token source: task-notification-tertiary | N/A — not available this sprint |
| Token divergence (ledger vs task-notif) | N/A — tertiary source unavailable |
| Token divergence flag (>20%) | N/A |

### Ledger integrity caveat — read before citing any number above

**This sprint fixed the dispatch-telemetry bugs while running on the broken machinery, and the
figures above are the proof.** The canonical fix (`BUG-068` + `BUG-069`) is merged, but the **live
`/.claude/` instance the orchestrator actually dispatched every agent through this sprint was never
re-synced** — that re-sync is a deliberate post-merge, human/orchestrator-owned step (M1.md §0 item
4; §5), not part of either story's scope. Every dispatch this sprint ran under the *pre-fix* hooks.

Three-source split, per CR-035:

```
Token cost (sprint work, dev+qa+architect+devops): 74,467,901
Token cost (Reporter analysis pass, this dispatch): ~2,949,767 (PARTIAL — a SubagentStop already
  fired mid-dispatch and logged a reporter-attributed row at 2026-09-01T21:04:36Z; this is not the
  final figure. See token-ledger.jsonl post-dispatch for the number after this dispatch completes.)
Token cost (sprint total, .session-totals.json):    77,417,668
```

The "sprint work" figure is **not a trustworthy per-agent breakdown** — it is presented only as the
complement of the total. Census of the sprint's own 147-row `token-ledger.jsonl`, taken at report
time:

```
agent_type:    135 architect / 5 qa / 3 developer / 3 devops / 1 reporter
work_item_id:   45 BUG-068 / 39 BUG-069 / 34 CR-117 / 15 BUG-033 / 12 M1 / 2 SPRINT-40
```

`BUG-033` is not a member of this sprint at all — 15 rows were scraped by the legacy transcript-grep
Step 3/4 fallback from a `.dispatch-*.json` predicate name in `waves.json` prose
(`empty_surface_guard_BUG_033`); `M1` is a milestone **plan filename**, not a work item. All 27 of
those rows, plus the great majority of the 135 `architect` rows, are attributed by the exact
self-referential inheritance chain `BUG-069` deletes — they are not evidence of what architect
actually did. `hook-log/token-ledger.log` shows this directly: `work_item_id fallback grep: BUG-033`
at `18:51:19Z`, then `work_item_id from prior ledger row: BUG-033` repeating for the next several
fires, then later the chain re-anchors on `SPRINT-40` itself and keeps copying that forward — live,
in production, for the entire sprint that fixes this exact defect. **Do not build a per-agent cost
table from this file for SPRINT-40.** The aggregate total (77.4M, from `.session-totals.json`,
summed independent of attribution) is the only number here with any claim to accuracy.

Divergence between "sprint work" (74.47M) and "sprint total" (77.42M) is 3.8% — under the 20%
flag threshold — and is fully explained by this dispatch's own in-progress usage. This is expected,
not a finding.

---

## §4 Observe Phase Findings

### 4.1 Bugs Found (UR:bug)
None via the formal bounce path (zero QA/Architect bounces this sprint). See §4.6 below for a
different and more consequential class of "bug found": the framework re-triggering its own
previously-filed defects on the team that was fixing it.

### 4.2 Hotfixes Triggered
None in the sprint window.

### 4.3 Review Feedback (UR:review-feedback)
One instance, folded without rework — see §2, CR-117.

### 4.4 Risks Materialized (script incidents, CR-046)

| Timestamp | Agent | Command | Exit | Summary |
|---|---|---|---|---|
| 2026-09-01T20:07:11Z | devops | `node .cleargate/scripts/update_state.mjs BUG-068 Completed` | 1 | `checkFoldDrift()` refused: `state.json` did not byte-match `fold(events.jsonl)`. Root cause: `events.jsonl` mixed formal `kind:"transition"` rows with informal narrative lines (`orchestrator_decision`, `arch_postflight_pass`, etc.) that carry no `story_id` but still drag the document-level `updated_at` forward via `fold()`'s `maxTs` computation running before the `storyId == null` skip. Incident: `.cleargate/sprint-runs/SPRINT-40/.script-incidents/20260901T200711Z-4cd0cc827f94.json`. |

### 4.5 Process Failures (orchestrator-owned, both self-caught before landing)

1. **Narrative-vs-transition log mixing blocked wave 1's state transition.** The incident above.
   Fixed at the wave-1 close commit (`17723183`) by splitting the orchestrator's narrative appends
   out of `events.jsonl` into a new `orchestrator-log.jsonl`; nothing was deleted, and `events.jsonl`
   from that point on carries only formal `kind:"transition"` rows (confirmed clean for waves 2-3 —
   both later `update_state.mjs` sequences ran with **no** `checkFoldDrift()` refusal). This is the
   only reason this report could distinguish "orchestrator narrative" from "formal state log" at all.

2. **The tool's own error message chains a destructive remedy onto an unverified diagnosis.**
   The `checkFoldDrift()` refusal above prints, verbatim, as its *entire* suggested fix: *"Refusing
   to fold: delete `.../events.jsonl` to re-synthesize genesis from `state.json`."* That is a one-line
   instruction to erase the sprint's audit trail, offered with no intermediate "diagnose the drift
   first" step and no distinction between "log corrupted" and "log carries a legitimate second
   schema" (which is what had actually happened here). DevOps read past that line, diagnosed the
   real cause (narrative-row mixing, not corruption), and explicitly declined to run the suggested
   `rm`, escalating instead — correctly, and exactly per its "no auto-resolve, no code authoring"
   mandate. But a less careful operator piping only the error's last line to a shell would have
   destroyed the log based on a message that never verified what caused the drift. The fix belongs in
   the message, not in operator discipline: `checkFoldDrift()`'s remedy text should name the two
   possible causes and require a read of the tail of `events.jsonl` before suggesting deletion.
   Follow-up candidate (§4.9 item 6, folded into the sentinel-lifecycle-class follow-ons).

### 4.6 The framework reproduced its own filed defects on the team fixing it — three times

1. **`collision_surface.sh` tokenized a prose code-span into a phantom file path.** Found live at
   SDR (`82a4d323`) while preparing this very sprint: `CR-115`'s Execution Sandbox carried
   `config.yml` as a surface that "exists under no root" — an inline code-span in prose had been
   read as a file path. Corrected to `.cleargate/config.yml`. This is a **live reproduction of
   `BUG-062`**, already filed and closed.
2. **`BUG-047`'s gate-cache staleness no-op blocked kickoff.** Preflight reported all four newly
   authored items `(stale)`: `last_gate_check` trailed `updated_at`, and re-gating produced an
   *unchanged* verdict, so `writeCachedGate` no-op'd and never advanced the stamp — exactly
   `BUG-047`'s own bug, hit live while assembling the sprint that fixes it (`fe9082b4`). Worked
   around via `BUG-047`'s own documented escape (null the cache, force a genuine re-write); `BUG-047`
   itself remains descoped to the follow-up cli-main-checkout sprint (see §1 footnote).
3. **`CR-117`'s own motivating incident reproduced end-to-end during its own verification.** The
   Developer's red-before-green check (stash the fix, re-run) fed `--frobnicate` through the
   unfixed `validate_state.mjs` discovery path and hit the *actual* "Multiple state.json files
   found" wall of candidates under `.cleargate/sprint-runs/` — not a synthetic fixture. QA
   independently repeated the same revert-and-rerun and got the same result. The bug CR-117 fixes is
   not hypothetical; it happened, again, inside the sprint that fixes it.

### 4.7 Self-Correction Chain (Architect, mid-sprint)

The Architect's own M1 plan concluded (§3.5/§6/§7 open decision 1) that the 5-of-11-role
`ALLOW_LIST` gap left six agent roles — `devops` most consequentially — permanently unattributed
after both fixes land. **The orchestrator relayed this as verified** in its own decision log
(`orchestrator-log.jsonl` line 4, `2026-09-01T19:45:10Z`). At BUG-068's post-flight
(`2026-09-02T00:05:10Z`), the Architect re-read `pending-task-sentinel.sh` and found its own
conclusion **wrong**: that hook carries no `ALLOW_LIST` at all (`grep -c ALLOW` → 0) and attributes
every spawn passing `IS_AGENT_SPAWN` via the sentinel, which `token-ledger.sh:249-257` reads as a
second-priority ground-truth source. A `devops` dispatch gets no marker but **does** get a correctly
attributed row. The gap costs `BUG-029` tuple-match precision, not attribution — a real but smaller
defect. The Architect corrected its own finding in the same post-flight pass that produced it,
appended the correction to `M1.md` §8 and to the flashcard trail (a card marked "PARTIAL CORRECTION"
of the prior day's card), and downgraded the follow-on CR's recommended framing accordingly. Both the
error and its correction are preserved verbatim in `orchestrator-log.jsonl` lines 4 and 9.

### 4.8 Goal Acceptance Check — discriminating-power findings (facts, not the verdict)

The orchestrator authored four acceptance criteria at kickoff and audited its own criteria against
the merged branches before Gate 4. Findings, not softened:

- **Item 1** (`.dispatch-*.json` non-empty after *any* agent dispatch): holds only for the 5
  `ALLOW_LIST`-covered roles against 11 agent files in `cleargate-planning/.claude/agents/`.
- **Item 2** ("a line for a rejected tool name" in the live log): unsatisfiable through the live
  route — `settings.json:15`'s `Task|Agent` matcher is the outer gate, so a name it doesn't match
  never reaches the hook that would log the rejection. Proven only by direct invocation
  (`Sc3.1`/`Sc3.2`).
- **Item 3** (a marker-less `SubagentStop` appends `agent_type: unattributed`): mechanically
  confirmed by 3 independent red-test scenarios — **and** the orchestrator found that a *healthy*
  post-re-sync ledger may show **zero** `unattributed` rows, because the sentinel (no allow-list) can
  still attribute a marker-less spawn correctly. Absence of `unattributed` rows is evidence of
  nothing; the refusal path is verified by its red test, never by grepping the production ledger.
- **Item 4** (">1 distinct `agent_type` across the sprint's own ledger"): refuted as discriminating.
  The **pre-fix** ledger already carries 4 distinct values today (see §3 census) — the item passes
  under the exact fabrication mechanism it exists to detect. A `work_item_id` value absent from the
  sprint's own item set, or a single `agent_type` exceeding ~60% of rows, would discriminate; simple
  distinct-count does not.

Of the four, only item 3 survives as originally worded, and with a counter-intuitive precision noted
above. This is recorded here as the audited evidence; the resulting met/partial/missed verdict is
spoken in the Post-Output Brief per OD-4, not written here.

### 4.9 Open items for Gate 4 (orchestrator-flagged, human decision required)

1. **Live `/.claude/` re-sync — 5 files still unsynced.** `pre-tool-use-task.sh`,
   `pending-task-sentinel.sh`, `settings.json` (BUG-068) and `token-ledger.sh`, `agents/reporter.md`
   (BUG-069) all still differ canonical-vs-live at report time (confirmed by blob hash in both
   DevOps reports). Until this lands, none of this sprint's fixes are active at runtime.
2. **Where rename-proofing should live, and at what cost.** The hook-level `subagent_type` disjunct
   is dead through the `settings.json` matcher route (§4.8 item 2). Option (a): restate acceptance
   item 2 as satisfied by direct-invocation proof only. Option (b): broaden the matcher to a
   catch-all so every tool call routes through both hooks — genuinely rename-proof, but a real
   per-tool-call performance question, deserving its own CR.
3. **Replacement Goal Acceptance criteria** for items 1 and 4 (§4.8) — not self-amended by the
   Architect or orchestrator; a human-confirmed check needs a human to re-confirm its replacement.
4. **8 pre-existing `story/STORY-014-*` orphan branches** (dated 2026-04-21/22, 130-148 commits
   ahead of `main`, unrelated to SPRINT-40). DevOps flagged these as a risk to the *next* sprint's
   `§A.1` preflight; **the orchestrator independently verified this claim and found it false** by
   reading `sprint.ts:1325` (worktree-path check) and `:1352` (`refs/heads/sprint/S-NN` check) —
   neither examines lingering `story/*` branch refs. The orphans are inert clutter needing a human
   decision, not a blocker. Not deleted here (destructive action on unrelated work, outside mandate).

### 4.10 Follow-on items filed or flagged (8 total)

| # | Item | Disposition |
|---|---|---|
| 1 | `BUG-047` — gate-cache stamp deadlock | Descoped at SDR to a follow-up cli-main-checkout sprint |
| 2 | `BUG-048` — id-prefix-in-prose mints phantom item | Same descope |
| 3 | `CR-115` — upgrade warns on user-modified files | Same descope |
| 4 | `ALLOW_LIST` covers 5 of 11 agent roles | Follow-on CR recommended, **reframed** post-correction (§4.7) as a `BUG-029` tuple-match precision gap, not a missing-attribution hole |
| 5 | `.red.sh` files uncovered by the red-test immutability hook | `pre-commit-surface-gate.sh:11` matches `\.red\.(node\.)?test\.ts$` only, never `*.red.sh` — 7 bash red tests in this repo, including this sprint's sole spec artifact, are honour-system only |
| 6 | Sentinel-claim lifecycle asymmetry | `.dispatch-*.json` claimed before read (`:213`); `.pending-task-*.json` claimed only *after* the `USAGE_JSON`-empty early exit (`:471`, past `:299`) — a truncated transcript can destroy the marker and leak the sentinel to the next fire. Dormant before BUG-068, live from its merge onward. Recommended as a follow-on bug, not a BUG-069 scope-change. |
| 7 | `gate-checks.json` `arch.typecheck`/`qa.typecheck` | Point at `npm --prefix cleargate-cli run typecheck`; `cleargate-cli/package.json` is absent from every worktree by construction (gitignored, independent nested repo), so this manufactures a FAIL — and forces a non-removable Architect dispatch — on **every** story in this sprint, unconditionally. Emptying both keys routes to the `INFO: skipped` branch. Config change, orchestrator's call. |
| 8 | Preflight check 2 sees only `STORY-*` worktrees | `sprint.ts:1325` matches `/[/\\]\.worktrees[/\\]STORY-/` and is blind to Bug/CR/Spike/Hotfix worktrees — the exact four other types ClearGate scaffolds. This sprint's three worktrees (`.worktrees/BUG-068`, `.worktrees/BUG-069`, `.worktrees/CR-117`) were **all** of a type this check cannot see; a leftover worktree of any of them would have passed the gate clean. |

---

## §5 Lessons

### New Flashcards (Sprint Window)

| Date | Tags | Lesson |
|---|---|---|
| 2026-09-01 | #planning #dogfood-split | A sprint plan's shared-file collision claim is a hypothesis, not a measurement — running the committed red test at baseline showed `BUG-068` needed zero lines in `token-ledger.sh`, narrowing sprint plan §2.3. |
| 2026-09-01 | #hooks #immutability #danger | The red-test immutability gate is TS-only (`\.red\.(node\.)?test\.ts$`); all 7 `*.red.sh` bash red tests in this repo are honour-system only. |
| 2026-09-01 | #hooks #test-harness #danger | `SKIP_FLASHCARD_GATE=1` / `CLEARGATE_ADVISORY=1`, both exported by `launch_wave.mjs`/known break-glass, silently defeat a barrier red test — run barrier tests with `env -u` both. |
| 2026-09-01 | #hooks #ledger #danger | `ALLOW_LIST` covers 5 of 11 agent roles; six write no dispatch marker even post-fix. (Partially corrected the next day — see below.) |
| 2026-09-02 | #hooks #settings #danger | A rename-proof predicate inside a hook is dead code if `settings.json`'s matcher is the outer routing gate — rename-proofing belongs in the matcher or it is theatre. |
| 2026-09-02 | #hooks #ledger #danger | `token-ledger.sh` claims the dispatch marker atomically before reading it, but claims the sentinel only *after* the `USAGE_JSON`-empty early exit — a reachable path that destroys the marker and leaks the sentinel, chaining attribution to the next fire. |
| 2026-09-02 | #hooks #ledger #danger | `pending-task-sentinel.sh:173` defaults `agent_type` to the literal string `"unknown"`, not empty — a `-z`-only refusal guard passes it straight through. Test the sentinel's default value, not just emptiness. |
| 2026-09-02 | #hooks #ledger #danger | **Partial correction** of the 2026-09-01 `ALLOW_LIST` card: `pending-task-sentinel.sh` has no allow-list at all, so the 6 gap roles ARE still attributed via the sentinel. The gap costs tuple-match precision, not attribution — count both ground-truth files before declaring a telemetry hole. |
| 2026-09-02 | #hooks #ledger | A healthy post-fix ledger may show **zero** `unattributed` rows — their absence is evidence of nothing; verify the refusal path with its red test, never by grepping production. |
| 2026-09-02 | #gate #ledger #danger | A `">N distinct values"` acceptance criterion is satisfied by the exact fabrication it exists to detect — SPRINT-40's own pre-fix ledger already carried 4 distinct `agent_type` values, all suspect. Assert a specific value on a specific row instead. |

10 cards recorded this sprint window, all dupe-checked by their authoring agents against existing
tags before append. One flagged-but-not-yet-recorded candidate: the Developer's `CR-117`
`#test-harness #cli #danger` card (macOS `os.tmpdir()` is a symlink; an un-realpath'd CLI-mode guard
silently no-ops) is present in `CR-117-dev.md`'s `flashcards_flagged` field but does not yet appear
in `FLASHCARD.md` — flagging for the human/orchestrator to append at close, since appending is
outside this agent's own mandate for other agents' flagged cards.

### Flashcard Audit (Stale Candidates)

Ran the full stale-detection pass specified in reporter.md §5b across all 247 cards in
`FLASHCARD.md` (zero carry a `[S]`/`[R]` marker). Extracted file-path, identifier, CLI-flag, and
env-var candidates per card and grepped the repo (excluding `FLASHCARD.md` itself and
`sprint-runs/*`) for each. 240 of 247 cards yielded at least one extractable symbol; 6 initially
flagged as "all symbols absent" on first pass, but all 6 were false positives of this pass's own
extraction regex — each matched only a decorative ALL-CAPS emphasis word in the card's prose
(`READING`, `BUNDLED`, `MATCHER`, `GITIGNORED`, `BUNDLES`) or a too-generic CLI flag (`--dry-run`)
rather than a genuine referenced symbol; every one of those 6 cards' *actual* referenced code
(`findWorkItemFile`, `tsup`, etc.) is present in the repo but was missed by this pass's simplified
identifier regex (it only matches upper-CamelCase and `snake_case`, not lower-camelCase function
names). No genuine stale flashcards detected.

### Supersede Candidates

| Newer card | Older card | Proposed marker for older |
|---|---|---|
| 2026-09-02 `#hooks #ledger #danger` "PARTIAL CORRECTION of the 2026-09-01 ALLOW_LIST card..." | 2026-09-01 `#hooks #ledger #danger` "`pre-tool-use-task.sh:67` ALLOW_LIST names 5 agent roles... DevOps fires on every story merge, so a 'restored' ledger still has a permanent hole." | `[R]` partial — the 5-of-11 role count and the "still no marker" fact both remain true and useful; only the "permanent hole in the ledger" / severity framing is superseded. Recommend a `[R]` note pointing to the newer card rather than full retirement. |

---

## §6 Framework Self-Assessment

### Templates
| Item | Rating | Notes |
|---|---|---|
| Story template completeness | Green | Not exercised this sprint (Bug/CR templates only) — no finding either way. |
| Sprint Plan Template usability | Yellow | `architect-reader` digests reported `parallel_eligible: y` and `dep_predecessors: []` for both M1 stories, contradicting the human-approved §1/§2.2 plan text in both cases; resolved toward the plan (fail-safe direction), but worth checking whether the digest generator defaults `parallel_eligible` rather than reading the plan's own column — if so it would silently un-serialize a future sprint. |
| Sprint Report template (this one) | Green | v2.1 lane/hotfix rows exercised cleanly against real `schema_version: 3` state with one genuine fast-lane story. |

### Handoffs
| Item | Rating | Notes |
|---|---|---|
| Architect → Developer brief quality | Green | `M1.md` measured its own shared-surface hypothesis down to zero lines before asserting it, gave verbatim decided code for every change, and — critically — inserted a pointer under §4 so the mid-flight §8 amendment could not be missed by a Developer reading top-down (explicitly citing the FLASHCARD `#worktree #planning #danger` failure mode it was designed to avoid). |
| Developer → QA artifact completeness | Green | Both M1 dev reports disclosed the one plan-partition edge case each took (BUG-069's `BANNER_SKIP_RE` comment rescope) with `orchestrator_confirmed: false` rather than silently self-certifying it. |
| QA → Orchestrator kickback clarity | Green | N/A in the strict sense (zero bounces), but all three QA passes ran genuine adversarial verification beyond trusting the dev report (novel-tool-name probes, revert-and-rerun reproduction of the real incident, an adversarial two-marker tuple-match fixture) rather than accepting green as sufficient. |

### Skills
| Item | Rating | Notes |
|---|---|---|
| Flashcard gate adherence | Yellow | Ironic given the sprint's subject: the mechanical gate (`pending-task-sentinel.sh`'s barrier) was disabled on the live route for this sprint's *entire* own execution, since the fix it depends on was never re-synced live. Every agent still read and cited FLASHCARD.md per discipline, not enforcement — the sprint that restores the gate ran without the gate ever firing on it. |
| Adjacent-implementation reuse rate | Green | `IS_AGENT_SPAWN` computed once and reused at both `pending-task-sentinel.sh` guard sites; `SENTINEL_AGENT_TYPE`/`SENTINEL_WORK_ITEM_ID` reused rather than duplicated; `CR-117`'s Developer reused `state-scripts.test.mjs`'s existing describe block and fixture helpers instead of a new sibling file. |

### Process
| Item | Rating | Notes |
|---|---|---|
| Bounce cap respected | Green | 0 of 3 stories bounced. |
| Three-surface landing compliance | Red | Deliberately, by design this sprint — canonical is fixed; npm payload and live `/.claude/` are both still unsynced at report time (§4.9 item 1). This is the sprint's central open item, not an oversight. |
| Circuit-breaker fires (if any) | Green | Zero fires across all three stories. |

### Lane Audit

| Story | Files touched | LOC | Demoted? | In retrospect, was fast correct? (y/n) | Notes |
|---|---|---|---|---|---|
| `CR-117` | 6 | 274 | n | | |

### Hotfix Audit

| Hotfix ID | Originating signal | Files touched | LOC | Resolved-by SHA | Could this have been a sprint story? (y/n) | If y — why was it missed at planning? |
|---|---|---|---|---|---|---|
| (none) | — | — | — | — | — | — |

### Hotfix Trend

Rolling 4-sprint hotfix count (SPRINT-36, 38, 39, 40 — SPRINT-37 was drafted but never executed):
0, 0, 0, 0. `trend: FLAT` (not increasing). `wiki/topics/hotfix-ledger.md` holds exactly one entry
in its entire history (`HOTFIX-001`, 2026-04-30), well outside this rolling window. No retrospective
action indicated by the trend itself.

### Tooling
| Item | Rating | Notes |
|---|---|---|
| run_script.sh diagnostic coverage | Green | The one script incident this sprint (fold-drift refusal) was captured with full stderr, enabling accurate root-cause diagnosis without any information loss. |
| Token ledger completeness | Red | This sprint's own subject. The live ledger the orchestrator actually ran under stayed corrupted for the sprint's full duration — 135 of 147 rows attributed to `architect` via the exact self-referential chain `BUG-069` deletes, including 15 rows scraped onto a cross-sprint id (`BUG-033`) and 12 onto a plan filename (`M1`). See §3 caveat. |
| Token divergence finding | N/A | The specific ledger-vs-task-notification divergence metric is not computable this sprint (tertiary source unavailable); the sprint-work-vs-sprint-total split (3.8%) does not itself cross the 20% threshold. The real trustworthiness problem is captured in the row above, not here. |

---

## §7 Change Log

| Date | Author | Change |
|---|---|---|
| 2026-09-02 | Reporter agent | Initial generation. |
<!-- END sprint-report -->
