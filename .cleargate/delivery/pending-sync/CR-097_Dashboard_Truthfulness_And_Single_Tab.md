---
cr_id: CR-097
parent_ref: EPIC-043
parent_cleargate_id: "EPIC-043"
sprint_cleargate_id: "SPRINT-99"
carry_over: false
status: Completed
approved: true
area: cli
context_source: verified codebase grounding — reproduced against this repo's live SPRINT-99 phantom sprint and a synthetic healthy sprint; misattribution traced to a dated line in .cleargate/hook-log/token-ledger.log
created_at: 2026-08-01T00:00:00Z
updated_at: 2026-08-01T00:00:00Z
created_at_version: 0.20.0
updated_at_version: 0.20.0
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-08-01T10:00:11Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id CR-097
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-08-01T10:00:11Z
  sessions: []
---

# CR-097: The Dashboard Says When It Cannot Be Trusted, and Stops Stacking Tabs

## 0.5 Open Questions

- **Question:** Should `sprint init`'s auto-opened dashboard also become a live server?
- **Recommended:** No — left as a snapshot, as implemented. `sprint init` must exit; handing it a server would leave a process running after a command the user expects to finish. The snapshot it writes is a point-in-time artifact, which is the correct thing at kickoff.
- **Human decision:** {populated during Brief review}

- **Question:** This repo's `.cleargate/sprint-runs/.active` still names SPRINT-99, a sprint with no plan file, a fabricated `STORY-99-01`, and 66.7M mis-attributed tokens.
- **Recommended:** Out of scope. This CR makes the condition visible; clearing the sentinel and deleting `sprint-runs/SPRINT-99/` destroys state and belongs to a human decision, not a code change.
- **Human decision:** {populated during Brief review}

## 1. The Context Override (Old vs. New)

**Obsolete Logic (What to Remove / Forget):**
- Forget that "every source degrades gracefully to an empty panel, never a throw" is sufficient. It is right for rendering and wrong for trust: a page built from a stale sentinel, no sprint plan, and another sprint's ledger rows is visually identical to a healthy one.
- Forget that the last dispatch marker in `HOOK_LOG` describes the current turn. The log is append-only and never rotated, so `tail -1` reaches back across sessions and across sprints.
- Forget that `--open` should write a file:// snapshot. It cannot refresh itself, so the documented refresh — re-run — spawns another browser tab while the tab already open stays stale.

**New Logic (The New Truth):**
- `collect()` returns `diagnostics: string[]` recording anything that made the page less true than it looks: a sentinel naming a sprint with no plan file (and that `.active` is the likely cause), an unparseable plan table, a missing `state.json`, and ledger rows attributing work to a different sprint. Rendered as a warning block directly under the header and printed to stderr.
- Dispatch-marker resolution is scoped to the current session via `session=`. A marker from another session says nothing about this turn.
- A carried `work_item_id` must be consistent with the sprint being bucketed into: the prior ledger row must belong to this sprint, and a `SPRINT-*` id that is not this sprint is rejected outright. Rejections are logged, not swallowed.
- `--open` implies `--serve`: one tab that patches itself every ~2s. A repeat `--open` probes `GET /healthz`; our own server is reused with no second tab, a foreign process on the port still errors. Plain `cleargate sprint dashboard` keeps writing the static artifact and opens nothing — that is what `sprint init` calls and what CI wants.

**The failure this fixes.** Observed live in this repo. `.active` named SPRINT-99; no SPRINT-99 plan file exists anywhere under `delivery/`. The dashboard rendered it as a healthy Active sprint with one story and 66,679,111 tokens under "architect", and exited 0 in silence. The tokens belonged to SPRINT-38. The hook log dates the cause precisely:

```
[2026-08-01T01:42:47Z] work_item_id from dispatch-marker log: SPRINT-38
```

The last marker in a months-long log was written on 2026-07-27 by a different session for a sprint that had already closed. A brand-new sprint's first turn adopted it, and the prior-ledger-row fallback then copied it into every subsequent row — self-perpetuating once a wrong id lands.

## 2. Blast Radius & Invalidation

- [x] Invalidate/Update CR: [[CR-084]] — the dashboard itself. Extended, not reverted: collectors are unchanged, the data model gains one field, `--open` changes meaning.
- [ ] Invalidate/Update Bug: [[BUG-027]] — authored the attribution fallback chain. Not reverted; its Steps 1–4 order stands, each step is now bounded.
- [ ] Database schema impacts? **No.** One added field on an in-memory type, one hook, one flag's routing.

**Downstream risk.**
- **`--open` behaviour changes.** Anyone scripting `sprint dashboard --open` expecting a file to be written and the process to exit will now get a long-lived server. Plain invocation is the artifact path and is unchanged. `sprint init`'s auto-open is unaffected — it calls the snapshot function directly.
- A regression surfaced while verifying: `sprint.dashboard.node.test.ts` called `sprintDashboardHandler({open: true})` with only `openFn` stubbed, so the new routing started a real server and the test file **hung** rather than failing. Rewritten to the new contract with an explicit note to stub `serveFn`. Worth knowing because a hang reads as a slow suite, not a failure.
- Ledger attribution gets stricter, so some turns that previously inherited an id will record `unknown`. That is the correct outcome — an honest gap beats a confident wrong number — but per-agent totals for affected sprints will shift.
- Diagnostics are additive; a healthy sprint emits none, asserted by test.

## Existing Surfaces

- **Surface:** `cleargate-cli/src/dashboard/collect.ts` — `SprintDashboardData`, `parseTokenLedger`, `findSprintPlanFile`, `readStateJson`. Gains `diagnostics` and `foreignLedgerAttribution()`; no collector logic changed.
- **Surface:** `cleargate-cli/src/dashboard/render.ts` — the header block and CSS; gains the accuracy warning.
- **Surface:** `cleargate-cli/src/dashboard/serve.ts` — the request router and the `EADDRINUSE` handler; gains `/healthz` and same-server reuse.
- **Surface:** `cleargate-cli/src/commands/sprint.ts` — `sprintDashboardHandler`'s mode branch and the snapshot path's stdout.
- **Surface:** `cleargate-planning/.claude/hooks/token-ledger.sh` — the Step 1 (prior ledger row) and Step 2 (dispatch marker) resolution blocks.
- **Why this CR extends rather than rebuilds:** every collector was verified correct against real-shaped inputs — `deriveStoryStatus` matches `state.schema.json`'s enum exactly, the shipped Sprint Plan Template's header row matches the table parser, and `agent_type` matches what the hook writes. Rewriting them would discard working, tested code to fix a problem that lives entirely in what the module declines to report and in one flag's routing.

## Prior work

- [[CR-084]] — introduced the sprint dashboard, its collectors, and the snapshot/serve split.
- [[BUG-027]] — introduced the four-step `work_item_id` fallback chain, including the two steps bounded here.
- [[CR-018]] — the per-turn delta math the ledger rows carry; unchanged, but it is why a wrong `work_item_id` corrupts totals rather than a single row.
- [[CR-093]], [[CR-094]], [[CR-095]] — the same defect family from this review pass: a check that decided the wrong thing and said nothing.
- No prior item addresses dashboard trustworthiness or browser-tab lifecycle.

## 3. Execution Sandbox

**Modify:**
- `cleargate-cli/src/dashboard/collect.ts` — add `diagnostics` to `SprintDashboardData`; add `foreignLedgerAttribution()`; populate diagnostics in `collect()`; add `diagnostics: []` to the inactive shell.
- `cleargate-cli/src/dashboard/render.ts` — warning block under the header, plus `.cg-diagnostics` styles.
- `cleargate-cli/src/dashboard/serve.ts` — `/healthz` route; `EADDRINUSE` probe that reuses our own server and still errors on a foreign one.
- `cleargate-cli/src/commands/sprint.ts` — `--open` routes to serve; snapshot path prints diagnostics to stderr.
- `cleargate-planning/.claude/hooks/token-ledger.sh` — `work_item_plausible()`; same-sprint requirement on Step 1; `session=` scoping on Step 2; log both rejection paths.
- `cleargate-cli/test/commands/sprint.dashboard.node.test.ts` — update the `--open` test to the new contract; add a plain-invocation snapshot test.
- `cleargate-cli/test/snapshots/hooks-snapshots.node.test.ts` — advance the token-ledger byte-lock to CR-097; `story-033-02` retained as historical baseline. Per the file's own rule, the snapshot moves only alongside a work item — this one.

**Add:**
- `cleargate-cli/test/dashboard/cr097.node.test.ts` — 10 tests across diagnostics, render, routing, and `/healthz`.
- `cleargate-cli/test/snapshots/hooks/token-ledger.cr-097.sh` — new authoritative byte-lock.

## 4. Verification Protocol

**Command/Test:** `cd cleargate-cli && npm run typecheck && npm test`

- New suite: 10 pass / 0 fail, including the no-false-positive cases (healthy sprint emits no diagnostics; a `STORY-`/`EPIC-` work item is not flagged as cross-sprint).
- `sprint.dashboard.node.test.ts`: 9 pass / 0 fail after the hang fix.
- Live corpus, rebuilt binary — the real SPRINT-99 phantom:
  - `warning: no sprint plan for SPRINT-99 found under .cleargate/delivery/ … .active is stale.`
  - `warning: 5 of 5 token-ledger rows attribute work to SPRINT-38 — token spend shown below may belong to another sprint`
  - Warning block present in the HTML; absent from a healthy synthetic sprint.
- Serve reuse, both directions:
  - our server on the port → `Dashboard already running: http://localhost:4719  (reusing it — no new tab)`, exit 0
  - a foreign process on the port → `port 4720 already in use by another process — pass --port <n>`, exit 1
- Hook: `bash -n` clean. All three token-ledger behavioural suites pass unchanged (44/45 before the byte-lock was advanced; the single failure was the lock itself, not behaviour).
- Snapshot locks: 11 pass / 0 fail.

---

## Context Source

**context_source:** verified codebase grounding. Collectors were exonerated by building a synthetic sprint with real-shaped inputs and confirming every panel correct. The failure was then reproduced against this repo's live SPRINT-99 state, and the misattribution traced to a dated `work_item_id from dispatch-marker log: SPRINT-38` line in `.cleargate/hook-log/token-ledger.log`. Refresh-model and ledger-bounding choices were put to the human before implementation. No PM-tool or remote input.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity — promoted from 🟡 at Gate 1**

Requirements to pass to Green (Ready for Execution):
- [x] "Obsolete Logic" to be evicted is explicitly declared.
- [x] All impacted downstream Epics/Stories are identified and reverted to 🔴 High Ambiguity.
- [x] Execution Sandbox contains exact file paths.
- [x] Verification command is provided.
- [x] `approved: true` is set in the YAML frontmatter.
- [x] Existing Surfaces cites at least one source-tree path the CR extends.
