---
sprint_id: "SPRINT-44"
status: "Shipped"
generated_at: "2026-11-10T18:30:00Z"
generated_by: "Reporter agent"
template_version: 2
---

# SPRINT-44 Report: Dashboard Backlog Board and Sprint Planner

**Status:** Shipped
**Window:** 2026-11-10 to 2026-11-10 (1 calendar day; planned end 2026-11-14)
**Stories:** 4 planned / 6 shipped (4 planned + 2 added mid-sprint at the walkthrough) / 0 carried over

Role: reporter. Sources: `.reporter-context.md` bundle, sprint-context.md, the sprint file §6 Execution Log, `state.json`, `.session-totals.json`, `.script-incidents/`. The bundle's git-log slice was empty ("Git log unavailable for sprint/S-44"); commit SHAs below come from the §6 log and the orchestrator's verified facts.

---

## §1 What Was Delivered

### User-Facing Capabilities
- `cleargate dashboard` (alias `cleargate sprint dashboard`) serves one local page with Backlog, Plan and Sprint tabs, with or without an active sprint (STORY-062-01). With no sprint the Sprint tab reads "No sprint is active"; the background record moved to `.cleargate/.dashboard.json` and no longer exits when the sprint changes.
- Backlog tab lists every pending-sync item with gate badges (135 items, 0 diagnostics in the §6 pre-check), parent/child grouping and, added at the walkthrough, a status filter that hides done items by default (STORY-062-02, STORY-062-06).
- Plan tab assembles the next sprint: pick a draft sprint, tick items, commit. Stale claims (by Completed/archived/missing sprints) show "will be reassigned"; open claims are disabled (STORY-062-04).
- Each Backlog/child/Plan row has a view button opening the ticket in the existing modal (`GET /doc?id=`, backlog-listed ids only), added at the walkthrough (STORY-062-05).
- Owner walkthrough 2026-11-10: "it works. goal is met."

### Internal / Framework Improvements
- `cleargate sprint add|remove <sprint-id> <ids...> [--expect <sha>] [--json]` is the single write path for sprint membership (STORY-062-03): refuses Active/Completed/archived sprints and stale `--expect` hashes (exit 3), edits frontmatter lines only through `frontmatter-locator.ts` with an invariant check before write, then stamp, gate and wiki-ingest.
- `POST /plan` calls `sprintScopeHandler` in-process (codes 0/1/3 mapped to 200/422/409); every POST needs the per-launch token and a loopback Origin/Host.
- Host allowlist guard on every route (closes the DNS-rebinding read of `/` and `/data` raised in the STORY-062-04 post-flight).
- CR-101 sentinel valve removed from `serve.ts`; `findLiveRecordSync`/legacy-record migration keeps a 0.27 per-sprint daemon adoptable and stoppable.
- Phase D.5 consolidation pass (code-simplifier, 7 src files, +89/-111) kept; suite green after it (2bdb71b).
- Canonical `sprint-dashboard` SKILL.md updated; `gen:codex` copies in sync.

### Carried Over
None. Carry-forward follow-ups (not stories) are listed in §6 Process.

---

## §2 Story Results + CR Change Log

### STORY-062-03: `cleargate sprint add|remove`
- **Status:** Completed
- **Complexity:** L3
- **Commit:** `3d2d05f` (cli main, --no-ff)
- **Bounce count:** qa=0 arch=0 total=0
- **CR Change Log:**
  | # | Event type | Description | Counter delta |
  |---|---|---|---|
  | 1 | CR:spec-clarification | M1 decision 1: a stale claim (Completed/archived/missing sprint) is reassigned with a warning; only an open sprint's claim refuses | none |
- **UR Events:** none

### STORY-062-01: Dashboard runs without a sprint, with a tab shell
- **Status:** Completed
- **Complexity:** L3
- **Commit:** cli `2f99b7f`; outer `9f0935ac` (into `sprint/S-44`; outer 783934d6 before merge)
- **Bounce count:** qa=0 arch=1 total=1
- **CR Change Log:**
  | # | Event type | Description | Counter delta |
  |---|---|---|---|
  | 1 | CR:spec-clarification | M1 decision 2: `src/commands/init.ts` joins §3.1 for the generated-gitignore line `/.dashboard.json` | none |
  | 2 | CR:approach-change | TPV BLOCKED-WIRING-GAP: red `startServer()` returned the port before `listening` (port-0 callers got 0). Routed to QA-Red, fixed 2c1cf6a | arch_bounces +1 |
- **UR Events:** none

### STORY-062-02: Backlog board
- **Status:** Completed
- **Complexity:** L3
- **Commit:** `0e60fbd`
- **Bounce count:** qa=0 arch=0 total=0
- **CR Change Log:** none
- **UR Events:** none. Note: the 02 post-flight found the defect that became STORY-062-04's rework.

### STORY-062-04: Plan tab and `POST /plan`
- **Status:** Completed
- **Complexity:** L4
- **Commit:** `8f71c87`
- **Bounce count:** qa=1 arch=0 total=1
- **CR Change Log:**
  | # | Event type | Description | Counter delta |
  |---|---|---|---|
  | 1 | CR:spec-clarification | M2: bodyOutOfDate excludes epics; remove-then-add not atomic so a refusal after a write returns `partial`; §3.1 adds the gen:codex copy and four red files | none |
  | 2 | CR:spec-clarification | R2 clarified to match 03: stale claims are enabled rows with a "will be reassigned" warning | none |
  | 3 | CR:bug | Plan tab disabled stale claims (M2 predated the R2 clarification); M2 amended (§A1-A5), new red file plan-stale-claims.red, Developer rework ca2b644 | qa_bounces +1 |
- **UR Events:** none

### STORY-062-05: Ticket view and Host guard on every route (added mid-sprint)
- **Status:** Completed
- **Complexity:** L3
- **Commit:** `4200799`
- **Bounce count:** qa=0 arch=0 total=0
- **CR Change Log:**
  | # | Event type | Description | Counter delta |
  |---|---|---|---|
  | 1 | CR:scope-change | Added at the walkthrough by owner choice: `GET /doc?id=`, view buttons, shared Host guard on every route | none (story added) |
  | 2 | CR:spec-clarification | M3: Plan rows' view button is the last child, never inside a label; `<error>` precedence; `/doc` GET-only with two 500 forms; `capDoc`/`MAX_DOC_CHARS` exported | none |
- **UR Events:**
  | # | Event type | Feedback | Tax impact |
  |---|---|---|---|
  | 1 | UR:review-feedback | "need to be able to read those tickets just like in sprint dashboard" | enhancement |

### STORY-062-06: Backlog status filter (added mid-sprint)
- **Status:** Completed
- **Complexity:** L2
- **Commit:** `b98fd0c` (D.5 consolidation `2bdb71b` merged first)
- **Bounce count:** qa=0 arch=0 total=0
- **CR Change Log:**
  | # | Event type | Description | Counter delta |
  |---|---|---|---|
  | 1 | CR:scope-change | Status filter, done hidden by default; R4 folds in the queued 2 s whole-list redraw lost-click fix | none (story added) |
  | 2 | CR:spec-clarification | M4: vanished status kept as extra option; child id with no backlog item counts as no status; redraw skip compares stored HTML | none |
- **UR Events:**
  | # | Event type | Feedback | Tax impact |
  |---|---|---|---|
  | 1 | UR:review-feedback | "filter by statuses please? by default it shouldn't show done items" | enhancement |

---

## §3 Execution Metrics

| Metric | Value |
|---|---|
| Stories planned | 4 |
| Stories shipped (Done) | 6 (4 + 2 added at walkthrough) |
| Stories escalated | 0 |
| Stories carried over | 0 |
| Fast-Track Ratio | 0% (all six `lane: standard`) |
| Fast-Track Demotion Rate | N/A (no fast-lane stories) |
| Hotfix Count (sprint window) | 0 (no hotfix recorded in the §6 log; ledger not consulted, bundle-only) |
| Hotfix-to-Story Ratio | 0 |
| Hotfix Cap Breaches | 0 |
| LD events | 0 |
| Total QA bounces | 1 (STORY-062-04) |
| Total Arch bounces | 1 (STORY-062-01, TPV wiring gap) |
| CR:bug events | 1 |
| CR:spec-clarification events | 8 (sprint-context Mid-Sprint Amendments + §6) |
| CR:scope-change events | 2 |
| CR:approach-change events | 1 |
| UR:bug events | 0 |
| UR:review-feedback events | 2 |
| Circuit-breaker fires: test-pattern | 0 |
| Circuit-breaker fires: spec-gap | 0 |
| Circuit-breaker fires: environment | 0 |
| **Bug-Fix Tax** | 17% (1 / 6) |
| **Enhancement Tax** | 33% (2 / 6) |
| **First-pass success rate** | 67% (4 / 6: 02, 03, 05, 06) |
| Token source: ledger-primary (sprint work) | 793,790,975 tokens (`sumDeltas`, agent_type != reporter) |
| Token source: session-totals (sprint total) | 190,376,100 tokens (sum of `.session-totals.json`) |
| Token source: story-doc-secondary | N/A (not collected, bundle-only) |
| Token source: task-notification-tertiary | N/A |
| Token divergence (ledger vs session-totals) | 317% (ledger work is 4.2x the session total) |
| Token divergence flag (>20%) | YES |

Test totals: full suite on cli main after build at the final merge: 3840 tests, 3838 pass, 0 fail, 2 skipped. Progression at each merge: 3647/3649 (03), 3678/3680 (01), 3714/3716 (02), 3776/3778 (04), 3827/3829 (05), 3838/3840 (06 + D.5).

### Token cost

```
Token cost (sprint work, dev+qa+architect): 793,790,975   (ledger deltas; see caveat)
Token cost (Reporter analysis pass):        TBD — see token-ledger.jsonl post-dispatch
Token cost (sprint total):                  190,376,100   (.session-totals.json)
```

**Divergence flag (YES).** The two sources disagree in the unusual direction: "sprint work" (sum of ledger deltas) exceeds "sprint total" (session totals) by 603,414,875 tokens. A per-agent subset cannot exceed the total, so at least one source is mis-attributing or double-counting cache reads (781,571,253 of the ledger's 793.8M are cache_read). The bundle's anomaly line also reads `unassigned: 76.2x higher than median story cost`. Treat both figures as unreconciled; the Reporter pass is TBD so the gap is not explained by it. Rated Yellow in Tooling (not Red: the TBD gap is expected, but the inversion is a real ledger defect).

**Per-agent cost table: REFUSED (attribution check).** The ledger census contains `agent_type: "unattributed"` rows: 15 dispatches carrying 710,568,168 tokens (89.5% of ledger work). No dispatch marker was written for those dispatches, so a per-agent breakdown cannot be trusted. Census as recorded (bundle digest, 68 ledger rows): architect 21 dispatches (55,405,618), developer 8 (189,788), qa 14 (14,858,600), devops 8 (12,768,801), unattributed 15 (710,568,168), cleargate-wiki-query 1 (0), code-simplifier 1 (0). Historical rows were not repaired or rewritten. No USD figure is published because the attributable base is too small to price honestly.

---

## §4 Observe Phase Findings

Observe window: last story merge (2026-11-10T22:13 local, STORY-062-06 + D.5) to close. All three items below are walkthrough-time findings, dated 2026-11-10; the first two were folded into the sprint as STORY-062-05 and STORY-062-06 and merged before close.

### 4.1 Bugs Found (UR:bug)
| Date | Description | Resolution | Commit |
|---|---|---|---|
| 2026-11-10 | None filed as UR:bug. The Backlog 2 s whole-list redraw dropping clicks (raised in 062-05 post-flight) was fixed inside STORY-062-06 R4 | folded | `b98fd0c` |

### 4.2 Hotfixes Triggered
| ID | Trigger | Resolution | Commit |
|---|---|---|---|
| (none) | — | — | — |

### 4.3 Review Feedback (UR:review-feedback)
| Date | Description | Status (folded / deferred) | Deferred to / Rationale |
|---|---|---|---|
| 2026-11-10 | Read tickets from Backlog rows like the sprint dashboard; Host-check every route | folded | STORY-062-05 `4200799` |
| 2026-11-10 | Status filter; done hidden by default | folded | STORY-062-06 `b98fd0c` |

Autonomy warnings: `.cleargate/hook-log/autonomy-warnings.log` has one entry in the sprint window: `2026-11-10T09:13:54Z AskUserQuestion unknown` (agent type not attributed). Earlier entries (2026-09-26 to 2026-10-04) predate the sprint.

---

## §5 Lessons

### New Flashcards (Sprint Window)

| Date | Tags | Lesson |
|---|---|---|
| 2026-11-10 | #dashboard #client | Backlog redraw-skip: compare the stored last-written HTML, never el.innerHTML (browser read-back normalises entities) |
| 2026-11-10 | #dashboard #security | Host allowlist is host:port; browsers omit :80, so a dashboard on port 80 would 403 every page |
| 2026-11-10 | #dashboard #security | Host-check every dashboard route, not only POST: GET / and /data are DNS-rebinding readable |
| 2026-11-10 | #dashboard #security | readDeliveryDoc matches by id PREFIX across pending-sync AND archive; never use it to serve a requested id |
| 2026-11-10 | #dashboard #client | cgRenderBacklogList rewrites #backlog-list every 2 s poll; row buttons lose clicks (fixed STORY-062-06) |
| 2026-11-10 | #dashboard #client | Separate document click listeners all fire; a return in one never stops another |
| 2026-11-10 | #dashboard #daemon | One long-lived .dashboard.json + pid-only isAlive can SIGTERM a recycled pid after reboot |
| 2026-11-10 | #dashboard #sprint-scope | Plan-tab claim rules mirror sprint add's claim branch; change both or neither |
| 2026-11-10 | #dashboard #cache | collectBacklog returns cached BacklogItem objects by reference; consumers must not mutate them |
| 2026-11-10 | #dashboard #test-harness | cr102 class-parity reads the FIRST script; never add a script element before the client script (recorded twice) |
| 2026-11-10 | #dashboard #test-harness | backlog-tab.red bans doc-btn inside the SSR backlog section |
| 2026-11-10 | #dashboard #serve | serve({port:0}) leaves boundPort and handle.port at 0; read server.address().port |
| 2026-11-10 | #test-harness #dashboard | red serve() opts still pass stale sentinelIntervalMs; never re-add |
| 2026-11-10 | #qa #test-harness | Red that throws TypeError on an undefined fetch record is a harness bug; vm El stubs need a parent pointer; vm objects fail deepEqual by prototype; port-0 helpers must await 'listening' |
| 2026-11-10 | #qa #worktree / #qa #zsh | wikiIngestHandler needs src/wiki/templates in fresh worktrees; zsh `echo == x` aborts; `"$T:src/x"` modifier bug |
| 2026-11-10 | #sha #sprint-scope | hashNormalized strips BOM/CRLF; a raw-bytes --expect must hash readFileSync bytes |
| 2026-11-10 | #codex #skill / #codegen #gen-codex | Editing a PORTABLE_SKILLS SKILL.md needs gen:codex; `gen:codex -- --check` ignores --check |
| 2026-11-10 | #merge #dashboard / #merge #contract | Client-script stub/fill conflict: drop BOTH stubs; swapping merge order forces re-integration and re-QA |
| 2026-11-10 | #planning #amendments | A story R-clarification logged after its M-plan was cut never reached the Dev; amend the M-plan row too |
| 2026-11-10 | #surface-gate #worktree / #sdr #collision-surface | §3.1 root files need a `./` prefix; a "Yes — <path>" New Files cell leaks a surface token |
| 2026-11-10 | #frontmatter #yaml | A key line holding only a comment (`bugs: # c`) has no whitespace before `#` |

Rejected at §6 (not recorded): macOS `sed -i` arg; getVersion test noise (cosmetic, twice); three duplicate STORY-062-04 dev cards; misdiagnosed outer surface-gate card (replaced by the `./` card). Candidate not yet recorded: a full suite in a cli worktree needs `npm run build` first (13 files exec dist/cli.js; produced 37 spurious failures in D.5.2).

### Flashcard Audit (Stale Candidates)
Not run this dispatch: the stale-detection pass requires Grep over the repo and FLASHCARD.md, which the bundle-only input rule forbids. Surfaced as a gap, not a finding.

### Supersede Candidates

| Newer card | Older card | Proposed marker for older |
|---|---|---|
| 2026-11-10 "Host-check every dashboard route, not only POST" | any card implying only POST needs the Host check (not located, bundle-only) | none proposed |
| 2026-11-10 "backlog redraw-skip compares stored HTML" | 2026-11-10 "cgRenderBacklogList rewrites every 2 s; row buttons lose clicks" | [R] (fixed STORY-062-06; already marked fixed in §6) |
| 2026-11-10 "cr102 class-parity reads the FIRST script" (two copies) | its own duplicate | duplicate: archive one |

---

## §6 Framework Self-Assessment

### Templates
| Item | Rating | Notes |
|---|---|---|
| Story template completeness | Yellow | §3.1 root files need a `./` prefix, and a "Yes — <path>" New Files cell leaks a surface token; both blocked or polluted the surface gate |
| Sprint Plan Template usability | Green | Contracts C1-C4, waves and rules 10-16 carried the sprint; plan rules overridden only by amendments |
| Sprint Report template (this one) | Yellow | No place for mid-sprint scope adds as planned-vs-shipped, or for close-script deviations; both are noted in §1/§6 prose |

### Handoffs
| Item | Rating | Notes |
|---|---|---|
| Architect → Developer brief quality | Yellow | M-plans were precise (Developers deviated 0 times on 05 and 06), but M2 predated the R2 clarification and sent 04 to a rework |
| Developer → QA artifact completeness | Green | 5 of 6 stories passed QA-Verify first time |
| QA → Orchestrator kickback clarity | Green | TPV caught the 062-01 port-before-listening harness bug before the Developer ran |

### Skills
| Item | Rating | Notes |
|---|---|---|
| Flashcard gate adherence | Green | About 20 cards recorded, five rejected with reasons (duplicates, cosmetic) |
| Adjacent-implementation reuse rate | Green | locator, `parseFrontmatter`, stamp/gate/ingest handlers reused; `readDeliveryDoc` deliberately not reused (prefix match across archive) |

### Process
| Item | Rating | Notes |
|---|---|---|
| Bounce cap respected | Green | 1 qa + 1 arch bounce; cap not approached |
| Three-surface landing compliance | Yellow | Canonical SKILL.md + gen:codex done in-sprint; live `/.claude` re-sync and dist rebuild deferred to Gate 4 by design (item 5 of the Goal Check pending) |
| Circuit-breaker fires (if any) | Green | None fired |

**Close-run deviations (honest account).**
- `close_sprint.mjs` Step 2.6c flipped `carry_over: true` EPIC-058 to Completed (it ignores `carry_over`); restored by hand to pending-sync Draft. Follow-up bug. It also flipped EPIC-061 to Completed because only S12, S1 and S7 (STORY-061-01..03) were ever drafted as stories; S2–S6 and S8–S11 are still open, so EPIC-061 was restored to pending-sync Draft too (outer bde3df00). Follow-up: the roll-up should not complete an epic whose own plan lists undrafted work.
- 2.6c then halted on 16 unrelated parents (BUG-119 class); `CLEARGATE_SKIP_PARENT_ROLLUP=1` used (SPRINT-41 precedent). 2.6 lifecycle then passed clean (31 artifacts).
- 2.6b false-positived on the 15 SPRINT-41 Parking Lot bugs BUG-102..116 (Parking Lot read as orphan); `CLEARGATE_SKIP_LIFECYCLE_CHECK=1` used after 2.6 passed clean. Follow-up bug.
- `prefill_report` skipped every dev/qa report ("no frontmatter found").
- Orphaned agent wait loops: one polled for about 10 h; two older DevOps agents also held background waits. All stopped.
- The first D.5.2 full suite ran in an unbuilt worktree: 37 failures in 13 files, all `dist/cli.js` MODULE_NOT_FOUND. Not a verdict; the real run after `npm run build` was 3840 / 0 fail.
- Workarounds used throughout: BUG-052 (`SKIP_SURFACE_GATE=1` on `sprint/S-44` bookkeeping commits and one outer commit, 783934d6) and BUG-087 (pre-gate typecheck false fail, exit 254 while `npm run typecheck` exits 0; on every story, forcing live TPV/post-flight dispatches).
- Mid-sprint scope: two stories added at the walkthrough (062-05, 062-06), both owner-directed, goal-relevant, and run through the full loop.

**Follow-ups to carry (from §6 log).**
- A-2: Abandoned sprints' claims treated as stale (needs 03 + 04 change). A-3: export the claim classifier from `sprint-scope.ts`.
- pid-reuse risk in `.dashboard.json` stop/`sprint close` (pid-only `isAlive`).
- CR for line-level stamp/gate writers (whole-block re-dump changes non-normalized files).
- No Backlog refresh after a Plan commit; `partial` returned even when remove changed nothing (`serve.ts`).
- `/data` plan payload about 100 KB per poll; sha of decoded text at `sprint-scope.ts:396` vs raw bytes elsewhere.
- `--port 80` vs the Host allowlist; aria-label on view buttons; `collect.node.test.ts` temp-dir leak.
- Doc tidy: `plan.ts:25`, `serve.ts` header, SKILL.md file list/record fields and `/doc`, all-route guard and status-filter mentions (Gate-4 doc-refresh checklist).
- Owner call: non-carry-over items claimed by another open sprint are hidden from the Plan picker.
- Status literally `open` clashes with the "Not done" filter value.
- `npm run gen:codex -- --check` ignores `--check`.
- Close-script bugs: 2.6c ignores `carry_over`; 2.6c BUG-119-class parent halt; 2.6b Parking Lot false positive; `prefill_report` frontmatter skip.

### Lane Audit

| Story | Files touched | LOC | Demoted? | In retrospect, was fast correct? (y/n) | Notes |
|---|---|---|---|---|---|
| (none: no story was assigned `lane: fast`) | — | — | — | — | |

### Hotfix Audit

| Hotfix ID | Originating signal | Files touched | LOC | Resolved-by SHA | Could this have been a sprint story? (y/n) | If y — why was it missed at planning? |
|---|---|---|---|---|---|---|
| (none) | — | — | — | — | — | — |

### Hotfix Trend
0 hotfixes in the SPRINT-44 window; prior-sprint counts were not read (bundle-only input). Monotonic-increase flag: no.

### Tooling
| Item | Rating | Notes |
|---|---|---|
| run_script.sh diagnostic coverage | Yellow | 15 incident JSONs in `.script-incidents/`: 6 pre-gate scan reports, 5 `npm` runs (`node:net` EADDRINUSE and test-lane exits), 1 architect `tsx` exit 1, and 3 `update_state.mjs` entries at 18:12Z (one exit 127 from invoking the bare script name through the wrapper, two exit 1 at `update_state.mjs:212`). Wrapper captured them, but the pre-gate entries are the BUG-087 false fail repeated |
| Token ledger completeness | Red | 15 of 68 dispatches `agent_type: "unattributed"` (89.5% of ledger tokens); per-agent table refused |
| Token divergence finding | Yellow | Divergence flag = YES: ledger sprint-work 793,790,975 vs session total 190,376,100 (delta 603,414,875, +317%), inverted (subset exceeds total). Reporter pass TBD, so not Red per spec; the inversion points to cache_read double counting |

---

## §7 Change Log

| Date | Author | Change |
|---|---|---|
| 2026-11-10 | Reporter agent | Initial generation |
