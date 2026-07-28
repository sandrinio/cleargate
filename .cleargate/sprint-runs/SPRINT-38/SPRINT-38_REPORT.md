---
sprint_id: SPRINT-38
status: Draft
generated_at: 2026-07-28T00:05:00Z
generated_by: Reporter agent
template_version: 2
pushed_by: sandro.suladze@gmail.com
pushed_at: 2026-07-28T07:53:04.285Z
push_version: 2
---

<!-- Sprint Report v2 Template — template_version: 2 -->

# SPRINT-38 Report: Enforcement Integrity Restoration

**Status:** Shipped — **goal verdict: PARTIAL**
**Window:** 2026-07-17 to 2026-07-28 (12 calendar days of a planned 2026-07-17→2026-07-31 window; ~2 working days of agent execution — waves 1-3 on 07-18/19, waves 4-7 on 07-27/28)
**Stories:** 9 planned / 9 shipped / 0 carried over · **+2 mid-sprint CRs shipped** = **11 items, all merged to `sprint/S-38`**

---

## Goal verdict — reasoned, not asserted

> Goal: *"Make every 'always enforced' ClearGate gate actually block again after the CR-070/CR-074 `execution_mode` retirement — no dead vocabulary, no silent no-ops, and a guard so canonical↔live drift cannot recur."*

**PARTIAL.** The goal is met in the artifact we ship and **not yet true of the instance that claims it.**

Evidence for *met*:

- Four gates were restored or retired and each is proven by a test that exercises the real mechanism, not the claim: file-surface (`STORY-051-01` `d2a42101`, then `CR-086` `65ce9cf8` end-to-end), decomposition fail-closed (`051-03` `4453c855`), `CLEARGATE_EXEC_MODE=v1` bypass deleted (`051-04` `284d481d`), test-ratchet retired from the payload (`051-02` `bf17a376`, −1234 lines).
- Two pure-prose "always enforced" claims became mechanisms: `prior-work-recorded` + `ambiguity-gate-resolved` predicates (`051-07`), and `--assume-ack` now physically refuses without `CLEARGATE_CI_ACK=1` (`051-08`).
- The drift guard exists and works — `cleargate doctor` blocks on canonical↔live divergence (`051-06`, cli `5864bb7`). It is currently the thing *reporting* the outstanding drift, which is the guard doing its job.
- The sprint refused to ship its own headline claim on faith: an advisory review found the flagship gate unreachable end-to-end, and `CR-086` fixed reachability rather than letting `051-01`'s script-level `exit 1` stand in for a refused commit.

Evidence for *not met*:

1. **The flagship gate is fixed in canonical + payload but not armed here.** `.git/hooks/pre-commit` → `/.claude/hooks/pre-commit.sh`, which is gitignored and still the pre-CR-086 dispatcher (verified at report time: 0 occurrences of the symlink walk). Until Gate 4 hand-ports it, this repo's own commits remain ungated — the exact gap between "the script exits 1" and "the commit is refused" that CR-086 was written to close.
2. **A defined-but-dead gate was found inside the sprint's own surface and left dead.** `check:no-vitest` is a no-op in all three packages (`\b` collapses to a literal `U+0008` through `execSync`); a real `import { vi } from 'vitest'` passes clean. "No silent no-ops" is not literally true at close.
3. **Named dead vocabulary survives by ruling.** Five residual `v1`/`v2` lines and 12 phantom `(source: protocol §NN)` annotations in `cleargate-enforcement.md`, plus `sprint-execution/SKILL.md:625` — all deferred by AD#2/AD#5 as cosmetic. Compounding: `check-no-exec-mode-vocab.mjs`'s `EXCLUDE_PATTERN` contains `cleargate-enforcement\.md`, so the sprint's own vocabulary gate is structurally blind to the file holding the residue.
4. **Three exit-0 paths remain in the file-surface chain** (E6 zero-parsed-paths, E9 missing-script, E11 non-executable sibling). They are now *documented* in the new enforcement §6.6 rather than *closed* — an honest downgrade from "no silent no-ops" to "every silent path is enumerated."

Not "missed": every planned item shipped, no story was escalated or parked, and the sprint caught a publish blocker (CR-087) before publish rather than after.

---

## §1 What Was Delivered

### User-Facing Capabilities

- **A pre-commit file-surface gate that actually refuses a commit.** Dispatcher symlink resolution, worktree sentinel resolution, and the §3.1 parser all fixed in one commit (`CR-086`/`65ce9cf8`); proven by a scratch-repo `git commit` in both a plain checkout and a linked worktree (21/21 e2e legs).
- **A pre-commit chain that is safe in a repo that is not this one.** Before `CR-087`, arming the dispatcher turned `pre-commit-surface-gate.sh:26` into a zero-byte commit blocker for every downstream install (measured `npm run --prefix <missing>` → exit 254) *and* for every linked worktree of this repo. Now each prefix runs only where it exists and defines the script; failures print (`d0617984`).
- **`cleargate doctor` fails on canonical↔live↔root drift** — the honor-system re-sync step became a machine check (`051-06`).
- **`cleargate sprint close --assume-ack` refuses without `CLEARGATE_CI_ACK=1`** (exit 2), with the requirement stated in the CLI help, the "sprint not closed" message, `usage()`, and both Gate-4 prompts.
- **Readiness gates gained two real predicates** — duplicate-check evidence and Ambiguity-Gate self-consistency are now machine-verified (7 → 9 predicate shapes).
- **Downstream installs stop receiving a broken test-ratchet hook** that spawned `npx vitest` against a nonexistent baseline.

### Internal / Framework Improvements

- Decomposition gate fails closed on `declaredNone`/`error` instead of vacuously passing; `--allow-drift` is the sole waiver, and a referenced-but-undecomposed epic stays non-waivable (`051-03`).
- `CLEARGATE_EXEC_MODE=v1` bypass deleted from `assert_story_files.mjs`; one sanctioned reference remains, asserting absence-of-effect (`051-04`).
- 15 live `execution_mode`/`v1`/`v2` behaviour-switch prose hits → 0 in shipping surfaces, with an npm-script gate and a preservation-regression test guarding against over-scrub (`051-05`).
- Four-gate spine (Gate 1 Brief / 2 Sprint-Ready / 3 Execution / 4 Close) is now the only numbering model in the protocol, both `CLAUDE.md`s, and enforcement §12; phantom paths (`.cleargate/plans/`), a deleted-module reference (`triage-classifier.ts`), broken `Bug.md` anchors, an unresolved `§<N>` placeholder, and a 246-line orphan RED test all cleared (`051-09`).
- Autonomy hook reads `.agent_type` (canonical) instead of a constant `"unknown"` — canonical only; see Gate-4 owed.
- New enforcement §6.6 "Exit-0 paths (what does not block)" — an enumerated ledger (E1-E12) of every non-blocking path in the chain, so a skipped step cannot vanish undocumented.
- Phase D.5 consolidation: dead `STATE_JSON_GLOB` replaced with a used `SPRINT_RUNS_DIR`, duplicated story-file lookup factored into `find_story_file()`, inert `is_whitelisted()` branch removed, and the three `close_sprint.mjs` user-facing `--assume-ack` strings brought in line with the guard (`8d69ae12`).

### Carried Over

**None.** All nine planned stories and both mid-sprint CRs merged. (Carry-over *work items* are enumerated in §4.5 — those are new findings, not unfinished sprint scope.)

---

## §2 Story Results + CR Change Log

### STORY-051-01: Restore file-surface pre-commit gate to blocking
- **Status:** Completed · **Complexity:** L2 · **Lane:** standard
- **Commit:** `d2a42101` (4 files, +52/−160) · merge `086788ea`
- **Bounce count:** qa=0 arch=0 total=0
- **CR Change Log:** none.
- **Note:** its acceptance ("gate exits non-zero on an off-surface file") was verified only by direct script invocation. `CR-086` extended it to a real refused commit — no gate reset, no re-open.

### STORY-051-02: Retire the test-ratchet pre-commit gate
- **Status:** Completed · **Complexity:** L2 · **Lane:** standard
- **Commits:** outer `bf17a376` (7 files, +8/−1234) · merge `80863ef8` · cli `0dc1891` (+137)
- **Bounce count:** qa=0 arch=0 total=0
- **CR Change Log:** none. Architect open decision (fold the stale enforcement §6.2 bullets into 02) was declined and routed to 09 — recorded, not actioned as a bounce.

### STORY-051-03: Give the decomposition & sprint-readiness gates a work list
- **Status:** Completed · **Complexity:** L3 · **Lane:** standard
- **Commits:** outer `4453c855` (4 files, +11/−1) · merge `cf3b45ce` · cli `001dd55` (4 files, +311/−24)
- **Bounce count:** qa=0 arch=0 total=0
- **CR Change Log:** none. Two legacy vacuous-pass tests were deliberately flipped to fail-closed.

### STORY-051-04: Remove the `CLEARGATE_EXEC_MODE=v1` silent bypass
- **Status:** Completed · **Complexity:** L2 · **Lane:** standard
- **Commits:** outer `284d481d` (4 files, +76/−58) · merge `e9fc9592` · cli follow-up `928b9c5` (+7/−6)
- **Bounce count:** qa=0 arch=0 total=0
- **CR Change Log:**
  | # | Event type | Description | Counter delta |
  |---|---|---|---|
  | 1 | CR:spec-clarification | Architect pre-authorised dropping the `Sc2 execution_mode=v2` assertion, unnamed in §3.2 but load-bearing for "suite green" — caught in planning, not in a bounce | none |
- **Flag:** the cli follow-up `928b9c5` landed under 051-05's wave (converting a stale `v1 warns-only` fixture the bypass removal invalidated). One story, two waves.

### STORY-051-05: Sweep dead execution_mode/v1/v2 vocabulary
- **Status:** Completed · **Complexity:** L3 · **Lane:** standard
- **Commits:** outer `ac483be6` (11 files, +33/−33) · merge `b8181b02` · cli `e42203f` (5 files, +233/−11)
- **Bounce count:** qa=0 arch=0 total=0
- **CR Change Log:**
  | # | Event type | Description | Counter delta |
  |---|---|---|---|
  | 1 | CR:spec-clarification | Absence-test path relocated from `src/` to `test/` — a `*.node.test.ts` under `src/` is silently never globbed by `npm test`, i.e. the story as written would have shipped a dead gate | none |
  | 2 | CR:spec-clarification | Near-duplicate npm scripts (`check:no-execution-mode-vocabulary` vs new `check:no-exec-mode-vocab`) reconciled by consolidation | none |

### STORY-051-06: Canonical↔live↔root drift guard in `cleargate doctor`
- **Status:** Completed · **Complexity:** L3 · **Lane:** standard
- **Commits:** **outer: none (by design — cli-only story)** · cli `5864bb7` (3 files, +501)
- **Bounce count:** qa=0 arch=0 total=0
- **CR Change Log:** none.
- **Flag (commit-count anomaly):** zero commits on the sprint branch. Correct here — the story's declared surface is `cleargate-cli/src` + tests, and cli is a separate gitignored repo. Recorded so the anomaly is not read as a missing merge.

### STORY-051-07: Real teeth for duplicate-check + Ambiguity Gate
- **Status:** Completed · **Complexity:** L3 (heaviest planned story, ~20 files / 3 tiers) · **Lane:** standard
- **Commits:** outer `9e532648` (12 files, +122/−6) · merge `3d26af12` · cli `44dfb65` (2 files, +460/−1)
- **Bounce count:** qa=0 arch=0 total=0 — the Gate-1 contingency ("split into 07a/07b if it bounces ≥2×") never fired.
- **CR Change Log:** none.

### STORY-051-08: Narrow break-glass semantics — scope `CLEARGATE_ADVISORY`, guard `--assume-ack`
- **Status:** Completed · **Complexity:** L3 · **Lane:** standard
- **Commits:** outer `2122688f` (9 files, +66/−37) + **remediation `bdc42af0`** (2 files, +6/−6) · merge `b2af9be7` · cli `377ad1c` (qa-red, +393) + `7015658`
- **Bounce count:** qa=0 **arch=1** total=1
- **CR Change Log:**
  | # | Event type | Description | Counter delta |
  |---|---|---|---|
  | 1 | CR:scope-change | AD#1-AD#4 mid-sprint amendment before dispatch: guard-test relocated to `test/scripts/`; enforcement §14.1/§14.2 "advisory in v1" bullets folded in; two CLI strings (`cli.ts:347`, `sprint.ts:788`) folded in; token-policy wording ratified | none (pre-dispatch) |
  | 2 | CR:bug | **Architect post-flight FAIL.** The guard's own stderr literal asserted the *superseded* policy ("orchestrator MUST NOT … set `CLEARGATE_CI_ACK`") while §12.3 — landed in the same commit — stated the ratified rule. A compliant agent reading the error could not have closed this sprint. Fixed in `bdc42af0`; post-flight #2 PASS, diff exactly 2 files / 6 lines | arch_bounces +1 |
- **Root cause (recorded verbatim from the Architect):** *"the ruling changed a policy; the fix list covered every doc site but not the place the old policy was asserted in code."*

### STORY-051-09: Fix doc contradictions, gate-numbering canon & phantom references
- **Status:** Completed · **Complexity:** L3 · **Lane:** standard
- **Commits:** outer `9ed104c3` (16 files, +85/−564) + `cd476ee1` (doc citation) · merge `db07fccb` · cli `63d9016` (qa-red, +349) · plan amendment `9ac01e33`
- **Bounce count:** **qa=1** arch=0 total=1 (three QA-Verify rounds: FAIL → FAIL sustained → PASS)
- **CR Change Log:**
  | # | Event type | Description | Counter delta |
  |---|---|---|---|
  | 1 | CR:scope-change | AD#5 — two wave-5 scope additions (`enforcement.md:20` 3rd column, `:461` gate-number token) approved at wave-4 post-flight and passed verbatim into the QA-Red and Developer dispatches | none |
  | 2 | CR:spec-clarification | **QA-Verify round 1 FAIL.** The `:20`/`:461` edits read as unauthorized: AD#5 existed only in the dispatch prompt and in `reports/STORY-051-08-arch.md`, never in `M2.md` — and QA audits scope against the plan. **Root cause: orchestrator record-keeping, not a Developer defect.** QA's call was correct on the evidence available | qa_bounces +1 |
  | 3 | CR:bug | **Round 2 FAIL sustained.** The first remediation ran as a workflow whose Architect leg died on a **529** and returned `null`, so AD#5 was never written — while the dependent story-doc edit (`cd476ee1`) landed *citing* it. The story now pointed at an amendment that did not exist. QA caught the compounded defect | none (same bounce) |
  | 4 | CR:spec-clarification | Round 2's second objection — that AD#5 belonged in the story worktree's `M2.md` — was **overruled**: milestone plans are orchestrator-owned artifacts on the sprint branch. The valid half (an uncommitted edit is not a record) was fixed by committing `9ac01e33`. Round 3 PASS | none |
- **Note:** `state.json` records `qa_bounces: 1`; three verify rounds occurred. The counter is not wrong — one kickback, one sustained finding, one pass — but the count understates the round-trips.

### CR-086: Make the file-surface pre-commit gate fire end-to-end *(mid-sprint, wave 6)*
- **Status:** Completed · **Commits:** plan `644f34a0` · outer `65ce9cf8` (5 files, +257/−45) · merge `d8733937` · cli `195194f` (qa-red, +531)
- **Bounce count:** qa=0 arch=0 total=0
- **Why in-sprint rather than carried:** it invalidated the sprint's own headline claim. `051-01` restored the script correctly, but the chain was dead at three independent points — the dispatcher globbed `.git/hooks/` for siblings and matched nothing, the `.active` sentinel is gitignored and absent from every worktree (so the gate never once ran against a Developer commit), and the §3.1 awk stripped backticks *before* splitting, turning a prose-bearing Value cell into three garbage sentences. Carrying it would have shipped a sprint whose flagship deliverable was, end to end, still a no-op. Taken on explicit human decision after orchestrator reproduction of findings 1-3.
- **UR Events:**
  | # | Event type | Feedback | Tax impact |
  |---|---|---|---|
  | 1 | UR:review-feedback | Advisory sprint-diff review (workflow `wu653hnqt`) — 28 findings raised, 21 adversarially refuted, 7 confirmed | folded in-sprint as CR-086 |
- **Discipline note:** QA-Red corrected the Architect plan's own red/green ledger (a leg predicted green-by-accident was genuinely red because it also asserts stderr text). 15/21 legs red on baseline; the honest set was stated rather than "21/21 red."

### CR-087: Guard the `check:no-vitest` chain; make its failure diagnosable *(mid-sprint, wave 7)*
- **Status:** Completed · **Commits:** plan `164c5adf` · outer `d0617984` (3 files, +24/−1) · merge `50214ca2` · cli `51521f7` (qa-red, +504)
- **Bounce count:** qa=0 arch=0 total=0
- **Why in-sprint rather than carried:** **publish blocker.** CR-086 armed a line that had been byte-identical and inert since 0.13.0. Measured: `npm run check:no-vitest --prefix <missing>` exits 254; `if !` maps it to exit 1; `-s` + `2>/dev/null` make it a **zero-byte** commit failure. No downstream repo shape passes — and neither does any linked worktree of this repo, because `mcp/`, `cleargate-cli/`, `admin/` are gitignored here. Without CR-087 the sprint would have shipped a silent commit-blocker to every install that followed its own documented `ln -sf` recipe, and blocked every SPRINT-39 Developer worktree commit. Taken on direct human approval after the shipping review.
- **UR Events:**
  | # | Event type | Feedback | Tax impact |
  |---|---|---|---|
  | 1 | UR:review-feedback | Shipping review (workflow `wfdakdjhq`) — 24 agents over real npm tarballs 0.10.0-0.17.1, **16 findings confirmed / 0 refuted**, A/B measured on identical repo state | folded in-sprint as CR-087; remaining findings carried (§4.5) |
- **Process note (recorded, no harm):** a first Developer Edit pass landed on the outer MAIN checkout instead of the assigned worktree — the file was read by its bare `CLAUDE.md`-documented path. Caught by the Developer's own `git status` cross-check, reverted, redone in the worktree, independently confirmed clean by the Architect. Flashcarded.

---

## §3 Execution Metrics

| Metric | Value |
|---|---|
| Stories planned | 9 |
| Stories shipped (Done) | 9 |
| Mid-sprint CRs shipped | 2 (CR-086, CR-087) — **11 items merged** |
| Stories escalated | 0 |
| Stories carried over | 0 |
| Fast-Track Ratio | 0% (all 9 `lane: standard`; each trips ≥1 disqualifier) |
| Fast-Track Demotion Rate | N/A — 0 stories ever assigned `lane: fast` |
| Hotfix Count (sprint window) | 0 (`wiki/topics/hotfix-ledger.md` holds one entry, HOTFIX-001 @ 2026-04-30, outside the window) |
| Hotfix-to-Story Ratio | 0.00 |
| Hotfix Cap Breaches | 0 |
| LD events | 0 |
| Total QA bounces | 1 (051-09) |
| Total Arch bounces | 1 (051-08) |
| CR:bug events | 2 |
| CR:spec-clarification events | 5 |
| CR:scope-change events | 2 (AD#1-#4 batch; AD#5) |
| CR:approach-change events | 0 |
| UR:bug events | 0 |
| UR:review-feedback events | 2 (advisory sprint-diff review → CR-086; shipping review → CR-087) |
| Circuit-breaker fires: test-pattern | 0 |
| Circuit-breaker fires: spec-gap | 0 |
| Circuit-breaker fires: environment | 0 (see §4.1 — a 529 killed a workflow Architect leg mid-remediation; no breaker was declared) |
| **Bug-Fix Tax** | **22.2%** (2 CR:bug / 9 stories; 18.2% over all 11 items) |
| **Enhancement Tax** | **22.2%** (2 UR:review-feedback / 9 stories) — see caveat below |
| **First-pass success rate** | **77.8%** (7/9 stories with qa=0 AND arch=0; 81.8% over all 11 items — both CRs were zero-bounce) |
| Token source: ledger-primary (delta rows, non-reporter) | **262,676,853** |
| Token source: story-doc-secondary | 0 — every `draft_tokens` block in the sprint's work items is `null` with `stamp_error: no ledger rows for work_item_id <ID>` |
| Token source: task-notification-tertiary | N/A — not captured |
| Token divergence (ledger vs session-totals) | **0%** (identical; ledger deltas sum exactly to the two sessions' totals) |
| Token divergence flag (>20%) | **NO** |

**Counting notes (so the tallies are interpretable):** CR-086 and CR-087 are each counted **once**, as `UR:review-feedback` folded in-sprint, not additionally as `CR:bug` — counting them twice would double the tax for work that was delivered as first-class scope. The two `CR:bug` events are the 051-08 stderr-policy remediation and the 051-09 half-landed remediation. **The "Enhancement Tax" label is wrong for this sprint:** both review-feedback events were defect findings, not enhancements — see §6 Templates.

### Token reconciliation (CR-035 two-line split)

```
Token cost (sprint work, dev+qa+architect): 262,676,853
Token cost (Reporter analysis pass):        TBD — see token-ledger.jsonl post-dispatch
Token cost (sprint total):                  262,676,853
```

Sprint-work and sprint-total are identical because zero `agent_type: reporter` rows existed at report-write time and every one of the 126 delta rows belongs to a non-reporter agent. Components: `cache_read` 249,836,598 (95.1%) · `cache_creation` 9,940,902 · `output` 2,882,951 · `input` 16,402. Two orchestrator sessions: `66fd2f5e` (2026-07-17T20:11Z → 07-18T22:32Z, 29 rows, 192,195,323) and `ef81765d` (2026-07-27T11:05Z → 23:15Z, 97 rows, 70,481,530).

**Indicative cost: ~$780.** Computed at Claude Opus 4-class list rates (input $15 / output $75 / cache-write $18.75 / cache-read $1.50 per M tokens), rate reference date **2026-07-28**. The sprint ran on two model strings (`claude-opus-4-8`, 29 rows; `claude-opus-5`, 97 rows) and no verified opus-5 rate card was available to the Reporter. Treat this as order-of-magnitude, not an invoice.

**Attribution is materially incomplete — read the per-item table as "as-recorded," not as truth.**

| Work item (as stamped) | Tokens | Rows |
|---|---|---|
| `STORY-046-01` — **not in this sprint** | 162,957,841 (62.0%) | 2 |
| `STORY-051-09` | 26,791,163 | 50 |
| `SPRINT-38` (orchestration/close-out) | 16,311,406 | 32 |
| `STORY-051-05` | 14,928,208 | 9 |
| `STORY-051-08` | 12,601,499 | 8 |
| `CR-086` | 9,199,489 | 5 |
| `M2` / `M0` / `M1` (planning dispatches) | 6,200,317 / 5,775,073 / 5,274,694 | 2 / 13 / 4 |
| `CR-087` | 2,637,163 | 1 |
| **`STORY-051-01/-02/-03/-04/-06/-07`** | **0** | **0** |

Three defects in this data, all reportable rather than repairable:

1. **A single row carries 158,372,909 tokens (60.3% of the sprint) stamped `STORY-046-01`** — a connector-epic story that was never in SPRINT-38. It is the first `SubagentStop` of session `66fd2f5e` capturing 541 prior orchestrator turns against a stale dispatch marker. The sprint total is right; that row's *attribution* is meaningless.
2. **112 of 126 rows are labelled `architect`** (developer: 3, qa: 4, devops: 7) across 11 work items with at least 4 agent roles each. Per-agent totals are not usable. The likely mechanism is the dispatch marker not being rewritten for agents launched via the Workflow tool, so every `SubagentStop` in a session inherits the last-written marker.
3. **Six of nine stories have zero ledger rows** — waves 1-3 ran through the Workflow tool and produced planning-bucket rows (`M0`/`M1`) but no per-story attribution.

What is defensible: **the sprint total (262,676,853) and the two session windows.** Everything below that line is labelled, not asserted. `story-doc-secondary` corroborates nothing — every work item carries `stamp_error: no ledger rows for work_item_id <ID>`, which is the same defect seen from the other side.

---

## §4 Observe Phase Findings

### 4.1 Bugs Found (UR:bug)

| Date | Description | Resolution | Commit |
|---|---|---|---|
| 2026-07-27 | 051-08's guard stderr asserted a policy the §12.3 text in the same commit contradicted | Architect post-flight FAIL → remediation | `bdc42af0` |
| 2026-07-27 | Remediation half-landed: a workflow Architect leg died on a **529** and returned `null`, so AD#5 was never written while the story doc citing it did land | Re-run; AD#5 committed to the plan | `9ac01e33` |
| 2026-07-27 | Phase D.5 found 051-08's `CLEARGATE_CI_ACK` clause missing from `close_sprint.mjs`'s own three user-facing strings — `usage()` and **both Gate-4 prompts, two of which instruct the user to re-run with the flag the new guard rejects** | Fixed in the consolidation pass | `8d69ae12` |
| 2026-07-27 | Test-induced live-data mutation: a `close_sprint` integration run flipped `EPIC-044` `Draft → Completed` in `.cleargate/delivery/pending-sync/` | Reverted once (`b09233a0`) — **and it has recurred: the file is dirty again at report time** | see Gate-4 handoff |

### 4.2 Hotfixes Triggered

None. Zero entries in `wiki/topics/hotfix-ledger.md` within the sprint window.

### 4.3 Review Feedback (UR:review-feedback)

| Date | Description | Status | Deferred to / Rationale |
|---|---|---|---|
| 2026-07-27 | **Advisory sprint-diff review** (`wu653hnqt`): 28 raised / 21 adversarially refuted / **7 confirmed**. Findings 1-3 — dispatcher symlink, worktree sentinel, §3.1 parser — reproduced by the orchestrator | **folded** | Shipped as CR-086 (wave 6) |
| 2026-07-27 | **Shipping review** (`wfdakdjhq`): 24 agents over real npm tarballs 0.10.0-0.17.1, **16 confirmed / 0 refuted**, A/B measured on identical repo state | **partly folded** | Publish blocker P1 shipped as CR-087; P2/P3 + H1-H5 + M1-M6 carried (§4.5) |

### 4.4 Discoveries that outlive this sprint

**A. `cleargate init` works; `cleargate upgrade` is broken in two independent layers.** Established by the shipping review against real published tarballs, not by reading code:

- `init` succeeds at **every** published version 0.10.0 → 0.17.1.
- Layer 1 — **the fix cannot reach the people who need it.** The `packageRoot ?? cwd` self-copy fix shipped in the **0.17.0 binary**, so every user on 0.10-0.16 still runs the broken `upgrade`. Upgrading is precisely the operation they cannot perform.
- Layer 2 — **even the fixed binary is wrong.** It writes the literal `__CLEARGATE_VERSION__` placeholder into the pin-aware hooks, and it never touches `CLAUDE.md`, `.mcp.json`, `config.yml`, or the install snapshot.

**B. `check:no-vitest` is itself a no-op in all three packages.** `package.json` holds `\\b`; the shell hands `node -e` a `\b`; the JS **single-quoted** string literal inside `execSync('…')` consumes it — grep receives a literal `U+0008` BACKSPACE. Measured: a scratch package running the verbatim `cleargate-cli` script over `import { vi } from 'vitest'` prints `no vitest residue` and exits 0, while the same script over `<BS>vitest<BS>` exits 1. Identical in `mcp` and `admin`. **Found by this sprint, not fixed by it.** Two things follow: CR-087 weakens nothing (it now correctly runs a check that cannot fail), and the repo's EPIC-028 vitest-elimination guarantee has been unenforced since it was written. This is a defined-but-dead gate of exactly the class EPIC-051 was chartered to eliminate — the sprint's most valuable finding and its sharpest indictment.

**C. `enforcement.md:302`'s "each package's own pre-commit convention" is false.** `cleargate-cli/.git/hooks/pre-commit` and `mcp/.git/hooks/pre-commit` do not exist. The guarded loop in `pre-commit-surface-gate.sh` is the **only** pre-commit enforcement of `check:no-vitest` anywhere in the repo — which, given B, means there is none.

**D. Arming the gate breaks this repo's own close-out commits.** Proven by a scratch-index dry run, not predicted: with `.active = SPRINT-38` and all nine stories `Done`, `resolve_story_file()`'s most-recently-updated fallback resolves an arbitrary finished story, and staging `plans/M3.md` + a delivery doc exits **1**. The surface whitelist admits `MANIFEST.json`, `hook-log/*`, `token-ledger.jsonl`, `state.json` — but **not** `.cleargate/delivery/**`, `.cleargate/sprint-runs/**/*.md`, or `FLASHCARD.md`.

### 4.5 Carry-overs (enumerated so none is lost)

**From the shipping review (not yet filed as work items — filing them is itself an action):**

| ID | Item |
|---|---|
| P2 | **Publish blocker** — `upgrade` writes `__CLEARGATE_VERSION__` unsubstituted into pin-aware hooks |
| P3 | **Publish blocker** — `upgrade` does not prune orphaned payload files |
| H1-H5 | Upgrade machinery: broken binary shipped to 0.10-0.16 users; `CLAUDE.md` / `.mcp.json` / `config.yml` / install-snapshot never refreshed on upgrade |
| M1-M6 | Hygiene findings (medium severity) |

**From CR-086:**

| ID | Item |
|---|---|
| CR-B | Residual exit-0 paths E6 (`file_surface_diff.sh` zero parsed paths — now genuinely reachable for a backtick-less §3.1), E9 (missing script → exit 0), E11 (non-executable sibling skipped silently). Decide per path: promote to exit 1, or warn loudly and keep exit 0 |
| CR-C | `cleargate init` installs the pre-commit symlink — the code CR-086 deliberately did not write. Needs collision policy (husky/lefthook/`pre-commit` all own that path), `--force`, dry-run, re-init idempotency, manifest accounting, and a matching `uninstall` |
| CR-D | `resolve_story_file()` falls back to an arbitrary `Done` story once every story is terminal — every post-close commit is measured against a finished story's §3.1 |

**From CR-087:**

| ID | Item |
|---|---|
| W7-CarryOver-E | `enforcement.md:302` claims a per-package pre-commit convention that does not exist (Discovery C) |
| W7-CarryOver-F | Extract `test/scaffold/_hook-fixture.ts` — the two hook suites duplicate ~60 lines of git/fixture primitives |
| W7-CarryOver-G (EPIC-045) | The hard-coded `mcp \| cleargate-cli \| admin` prefix list is meta-repo vocabulary in a file that ships everywhere. Guarded now, generalise later |
| **NEW** | **The `\b`→backspace defect (Discovery B).** Highest value of the four |

**From AD#2 / AD#5 (deliberately deferred doc residue):**

| ID | Item |
|---|---|
| CR (named) | `cleargate-enforcement.md` residual `v1`/`v2` lines — verified present at report time at `:248`, `:357` (§7 heading), `:416` (§10.2 heading), `:426`, `:442` — plus **12** `(source: protocol §NN)` annotations pointing at protocol sections that do not exist (protocol jumps §14 → §21). **Note:** `check-no-exec-mode-vocab.mjs`'s `EXCLUDE_PATTERN` contains `cleargate-enforcement\.md`, so the sprint's own vocabulary gate is permanently blind to this file — the CR should decide whether to drop that exclusion |
| CR (named) | `.claude/skills/sprint-execution/SKILL.md:625` — "This is a **Gate-3-class action**" survives the four-gate re-map (verified present) |
| CR (named) | `cleargate-planning/.claude/agents/cleargate-wiki-lint.md:3,:140` — 2 three-gate tokens survive; 051-09's "repo-wide" claim is therefore not literally global |
| CR (named) | Protocol §12.6 quotes §4 non-verbatim (pre-existing); enforcement §-index has no rows for §13/§14 |

### 4.6 Script Incidents

10 incident files in `.cleargate/sprint-runs/SPRINT-38/.script-incidents/`, all on 2026-07-27, none blocking:

- `20260727T110748Z` · `node` exit 1 — dirty working tree (`.session-totals.json`, hook-owned)
- `20260727T112843Z`, `20260727T112919Z` · `npx` exit 1
- `20260727T113147Z`, `20260727T124205Z`, `20260727T130345Z`, `20260727T132706Z` · `bash` exit 1 — pre-gate scan (mode: arch) reporting FAIL, i.e. the gate working
- `20260727T115715Z` · `npm` exit 1 — wrapped full-suite run, the 16 expected pre-merge-red legs. Full-suite runs were subsequently invoked directly, per the flashcard that `run_script.sh` collides with `run-script-wrapper.red.node.test.ts`'s own incident-dir assertions
- `20260727T125451Z` · `node` exit 1 — dirty tree, the EPIC-044 test-induced flip (§4.1)
- `20260727T141449Z` · `node` exit 1 — `update_state.mjs`: `CLEARGATE_STATE_FILE` not exported into the wrapper subshell (DevOps operator error); retried inline, exit 0

---

## §5 Lessons

### New Flashcards (Sprint Window)

35 cards recorded in the window [2026-07-17 → 2026-07-28]. Grouped by lead tag:

| Date | Tags | Lesson (abbreviated) |
|---|---|---|
| 07-27 | #gate #danger | `check:no-vitest` is itself a NO-OP in all 3 packages — `\b` reaches grep as a literal BACKSPACE; a real `import {vi} from 'vitest'` passes clean |
| 07-27 | #hooks #portability | A shipped pre-commit hook must guard every `npm --prefix <dir>` on dir-exists AND script-defined — missing dir exits 254, `-s`+`2>/dev/null` make it a zero-byte failure |
| 07-27 | #hooks #worktree | `mcp`/`cleargate-cli`/`admin` are gitignored here, so an unguarded `--prefix` check blocks every LINKED WORKTREE too, not just downstream installs |
| 07-27 | #test-harness #npm | `npm_config_loglevel=silent` propagates into nested `npm run` — emit your own stderr line rather than relying on npm's banner |
| 07-27 | #dogfood #worktree | Reading a file by its bare `CLAUDE.md`-documented path inside a worktree dispatch lands the edit on the MAIN checkout — prefix with the worktree root |
| 07-27 | #gate #dogfood | A gate can be "restored" at the script level and still be dead end-to-end — verify reachability with a REAL git commit |
| 07-27 | #gate #hooks | bash does NOT resolve symlinks in `${BASH_SOURCE[0]}` — resolve with `while [ -L ]`+`readlink`+`cd -P`; `readlink -f` is GNU-only |
| 07-27 | #gate #worktree | Gitignored runtime sentinels never exist in a linked worktree — resolve from `--git-common-dir`'s parent, not `--show-toplevel` |
| 07-27 | #danger #gate | `pre-commit-surface-gate.sh` → exit 254 in any repo lacking those dirs; arming the gate ships a commit-blocker downstream — fix before publish |
| 07-27 | #qa-red #test-harness | An Architect plan's per-leg red/green ledger can mis-predict green-by-accident when a leg also asserts stderr text — run it, don't trust the table |
| 07-27 | #orchestration #scope-discipline | Orchestrator rulings issued in DISPATCH text must be written back into the milestone plan — QA audits scope against the plan |
| 07-27 | #enforcement #docs | When a ruling changes a POLICY, fix EVERY place the old policy is asserted — error strings too, not just doc sites |
| 07-27 | #test-harness #danger | Integration tests that spawn the REAL outer `close_sprint.mjs` can mutate LIVE delivery docs — check `git status` on `.cleargate/delivery/**` after |
| 07-27 | #test-harness #qa-red | Anchor doc-coherence assertions on literal heading text (`content.indexOf`), not line numbers |
| 07-27 | #orchestration | developer/qa agents write a report file only on the BLOCKED path, but DevOps §C.7 halts without `dev.md`/`qa.md` — orchestrator must transcribe |
| 07-19 | #test-harness #cli | Default `npm test` globs only `test/**/*.node.test.ts` — a `*.node.test.ts` under `src/` is SILENTLY not run |
| 07-19 | #gate | Two overlapping exec-mode vocab scripts exist and NEITHER is wired into the pre-commit hook = defined-but-dead gate |
| 07-19 | #test-harness #build | doctor integration tests spawn the BUILT `dist/cli.js` — a deferred dist rebuild runs them against a stale binary |
| 07-18/19 | #dogfood #sync #build, #test-harness, #cross-repo, #readiness-gates, #review | 12 further cards on prebuild source-hardcoding, `CLEARGATE_META_ROOT` pre-merge paths, fence-aware section locators, grep binary mis-detection, stale fixtures |

### Flashcard Audit (Stale Candidates)

Mechanical pass over all **79** active cards (none carries an `[S]`/`[R]` marker). Symbols extracted per card — file paths, CamelCase/snake_case identifiers, `--flags`, `ENV_VARS` — and grepped repo-wide excluding `FLASHCARD.md` and `sprint-runs/**`.

**No stale flashcards detected.** Every card with extractable symbols has at least one symbol still present in the tree. 0 of 79 qualify for `[S]`.

### Supersede Candidates

| Newer card | Older card | Proposed marker for older |
|---|---|---|
| 2026-07-27 `#gate #danger` — `check:no-vitest` is itself a no-op | 2026-07-19 `#gate` — "NEITHER exec-mode script is wired into `pre-commit-surface-gate.sh` (only `check:no-vitest` is)" | **Annotate, do not archive.** The older card's premise ("`check:no-vitest` is the one wired gate") is now known to be wired-but-dead. Both lessons remain true; the newer one changes what the older one implies |
| CR-087 `d0617984` (the guard) | 2026-07-27 `#danger #gate` — "arming the gate ships a commit-blocker downstream — **fix before publish**" | **`[R]` (resolved) with a pointer to CR-087.** The action item is discharged; the lesson (arming a dead gate exports its defects) should survive the marker |

No card in the corpus is contradicted by a newer one. **No archival batch is proposed this sprint** — recommend Gate-4 approval only for the single `[R]` above.

---

## §6 Framework Self-Assessment

### Templates

| Item | Rating | Notes |
|---|---|---|
| Story template completeness | **Green** | Nine stories, zero scope ambiguity that reached a Developer. The Granularity Rubric held: the heaviest story (07, ~20 files / 3 tiers) shipped zero-bounce and the pre-agreed 07a/07b split never fired |
| Sprint Plan Template usability | **Yellow** | The plan has **no §4 Execution Log**, so the Reporter's Observe-window date filter has no source — §4 here is reconstructed from agent reports, git, and incident JSON. The plan also bootstrapped its own `epics:`/`context_source:` fields by hand because 051-03 had not yet shipped them |
| Sprint Report template (this one) | **Yellow** | Three mismatches: (1) **"Enhancement Tax" mislabels defect-driven review feedback** — both UR events this sprint were defects, and the metric name asserts the opposite; (2) the template has no row for mid-sprint CRs, so an 11-item sprint reports as a 9-story sprint unless the Reporter adds rows; (3) the event vocabulary states "CR:scope-change increments arch_bounces", but this sprint's arch bounce was a `CR:bug` — the mapping is one-to-one in the template and many-to-one in reality |

### Handoffs

| Item | Rating | Notes |
|---|---|---|
| Architect → Developer brief quality | **Green** | M0-M3 plans corrected the story files where they were stale (line numbers, test paths, the "documented relative symlink" that is absolute here) and pre-registered the first-bounce hints (G1-G12, W7-G1-G11). Both CRs shipped zero-bounce against plans that had already reproduced the defect and measured the exit codes |
| Developer → QA artifact completeness | **Green** | Every Developer report carried commit SHAs, typecheck/test results with the pre-merge-red legs enumerated and explained, and an explicit deferred-set. The CR-087 Developer self-reported a wrong-tree edit it had already caught and reverted — exactly the disclosure that makes reports usable |
| QA → Orchestrator kickback clarity | **Green** | 051-09's kickback named the finding, the evidence, and its own limits. Both CR QA-Red passes corrected the Architect's predicted red/green ledger rather than reporting the predicted number |

### Skills

| Item | Rating | Notes |
|---|---|---|
| Flashcard gate adherence | **Green** | Five wave-close flashcard gates fired (`69877ac0`, `d6e5af02`, `faf9ac12`, `91bb87f1`, `5914b032`, `6c7719ab`); 35 cards recorded in-window, each carrying its `[SPRINT-38 <item>]` provenance |
| Adjacent-implementation reuse rate | **Green** | Every plan carries an explicit "Reuse — do not re-implement" block with verified export sites (`hashNormalized`, `readBlock`, `isAdvisory`, `evalExistingSurfacesVerified`, `headingTitleOf`, the `ratchet-retired` scaffold-test template). CR-087 deliberately duplicated ~60 lines of fixture primitives rather than exporting from CR-086's suite, on the stated ground that *a control you edited is not a control* — and filed the extraction as W7-CarryOver-F |

### Process

| Item | Rating | Notes |
|---|---|---|
| Bounce cap respected | **Green** | Max 1 bounce on any item (cap is 2). No circuit-breaker fired |
| Three-surface landing compliance | **Yellow** | Canonical↔live parity was clean at every merge and machine-checked twice over (parity test + 051-06's own drift guard). But the **third** surface — the gitignored live `/.claude/**` — was deferred by design for the whole sprint and is still unsynced at report time: `pre-commit.sh`, `pre-commit-surface-gate.sh`, `pre-tool-use-autonomy.sh`, and four agent files. The deferral was correct (arming a hook mid-wave against in-flight commits is destructive); the *outstanding* state is the risk |
| Circuit-breaker fires (if any) | **Green** | Zero |
| Plan-of-record discipline | **Red** | The sprint's one QA bounce and its one sustained FAIL both trace to a single cause: **AD#5 was ruled at wave-4 post-flight, passed verbatim into two wave-5 dispatches, and never written into `M2.md`.** QA audits scope against the plan, so it correctly failed a legitimately-approved edit. The remediation then half-landed when a workflow Architect leg died on a **529** and returned `null`, leaving a story doc citing an amendment that did not exist. Two round-trips, zero Developer defects. AD#1-AD#4 were recorded correctly in the plan; AD#5 was not — the difference is that AD#5 was ruled mid-wave rather than at plan time |
| Agent report contract | **Yellow** | Developer and QA agents write a file only on the BLOCKED path, while DevOps §C.7 halts without `<ID>-dev.md`/`-qa.md`. The orchestrator transcribed 6 of the 16 reports to satisfy a prerequisite the agents are not built to produce. Flashcarded; the contract mismatch itself is unfixed |
| Lifecycle reconciliation | **Yellow** | `e5444d52` archived EPIC-051, all nine stories, and both CRs — but **`SPRINT-38_Enforcement_Integrity_Restoration.md` is still in `pending-sync/` with `status: Active`**. Close will need to move it |

### Autonomy Warnings

`.cleargate/hook-log/autonomy-warnings.log` — **4 entries inside the sprint window** (of 12 total in the file):

| Timestamp | Tool | Agent (as logged) |
|---|---|---|
| 2026-07-18T15:15:13Z | AskUserQuestion | `unknown` |
| 2026-07-18T22:36:52Z | AskUserQuestion | `unknown` |
| 2026-07-27T14:45:37Z | AskUserQuestion | `unknown` |
| 2026-07-27T20:33:24Z | AskUserQuestion | `unknown` |

All four fired in soft mode and were allowed through; the 07-18T22:36 and 07-27 entries align with the wave-1 merge checkpoint and the two mid-sprint CR approvals — i.e. the human decision points the sprint was designed to halt at, not autonomy breaches. **Every agent column reads `unknown`, which is the R10 defect 051-09 fixed in canonical and cannot fix in the live hook until Gate 4 hand-ports it.** The log is, at present, evidence that the fix has not landed where it runs.

### Lane Audit

| Story | Files touched | LOC | Demoted? | In retrospect, was fast correct? (y/n) | Notes |
|---|---|---|---|---|---|
| (none) | — | — | — | — | All nine stories `lane: standard`; zero fast-lane assignments, zero LD events |

### Hotfix Audit

| Hotfix ID | Originating signal | Files touched | LOC | Resolved-by SHA | Could this have been a sprint story? (y/n) | If y — why was it missed at planning? |
|---|---|---|---|---|---|---|
| (none) | — | — | — | — | — | — |

### Hotfix Trend

Rolling 4-sprint hotfix count: **SPRINT-34 = 0 · SPRINT-35 = 0 · SPRINT-36 = 0 · SPRINT-38 = 0.** `trend: FLAT` — no monotonic increase, no retrospective action recommended. `wiki/topics/hotfix-ledger.md` holds a single lifetime entry (HOTFIX-001, 2026-04-30). Caveat worth stating plainly: a flat-zero hotfix count across four sprints more likely reflects that the hotfix lane is unused than that no urgent fixes occurred — **CR-086 and CR-087 were both hotfix-shaped work** (a live defect found mid-sprint, fixed in-window, publish-blocking) that was correctly routed as CRs instead. The metric is measuring the lane, not the phenomenon.

### Tooling

| Item | Rating | Notes |
|---|---|---|
| `run_script.sh` diagnostic coverage | **Green** | 10 incidents captured with command, exit code, and stderr; two were genuine operator errors surfaced immediately (unexported `CLEARGATE_STATE_FILE`, dirty-tree guard), the rest were gates correctly reporting FAIL. One known limitation held and was worked around: wrapping a full-suite `npm test` collides with `run-script-wrapper.red.node.test.ts`'s own incident-dir assertions |
| Token ledger completeness | **Red** | 60.3% of the sprint's tokens sit in one row stamped with an out-of-sprint story (`STORY-046-01`); 112 of 126 rows are labelled `architect`; six of nine stories produced zero rows; every work item carries `stamp_error: no ledger rows`. The **total** is trustworthy and reconciles exactly with `.session-totals.json`; **nothing below the total is.** Root cause is dispatch-marker attribution for Workflow-tool-launched agents — squarely EPIC-044 territory |
| Token divergence finding | **Green** | Sprint-work vs sprint-total diverge by 0%. No divergence flag. The Reporter pass is TBD by construction |
| Enforcement self-consistency | **Yellow** | The sprint's own vocabulary gate excludes the file holding the residual vocabulary; the sprint's own vitest gate is a no-op; the sprint's own file-surface gate is armed everywhere except the repo that ships it. Each is now *known and named* rather than assumed working — which is the actual deliverable — but none of the three is closed |

---

## §7 Change Log

| Date | Author | Change |
|---|---|---|
| 2026-07-28 | Reporter agent | Initial generation |

---

## Gate-4 handoff — owed before / at close

**Blocking the close script:**

1. **`sprint/S-38` is not merged to `main`** — 49 commits ahead, 0 behind. `close_sprint.mjs` Step 2.8 will halt. (Step 2.7 passes: `git worktree list` shows only the main checkout.)
2. **Step 2.6c parent rollup halts on 9 unrelated parents** — connector epics EPIC-046/047/048, undecomposed EPIC-030/031/050, and SPRINT-31/37/38. Close therefore needs `CLEARGATE_SKIP_PARENT_ROLLUP=1`. **This is a human decision and has not been taken.**
3. **Close runs under 08's own guard** — `close_sprint.mjs SPRINT-38` with no flags first, surface the prompt verbatim, halt for explicit human authorization, then set `CLEARGATE_CI_ACK=1` for that single invocation. The token is never exported into the shell session.

**Working-tree hygiene before close:**

4. **`.cleargate/delivery/pending-sync/EPIC-044_*.md` is dirty again** — `status: Draft → Completed`, a test-induced parent-rollup mutation. It was reverted once in `b09233a0` and has recurred. Revert before close or it ships silently.
5. **`SPRINT-38_Enforcement_Integrity_Restoration.md` is still in `pending-sync/` with `status: Active`** — the reconciler archived every child but not the sprint file.

**Live `/.claude` hand-ports (gitignored; canonical is correct, live is not):**

6. `pre-commit.sh` — hand-port CR-086's symlink walk. Verified absent from live at report time. **Nothing mechanical checks `pre-commit.sh` parity — `diff` by hand after.**
7. `pre-commit-surface-gate.sh` — hand-port CR-087's guard. Live is 31 lines, canonical is 50. **Port both 6 and 7 together or not at all:** arming the dispatcher without the guard blocks every commit here (all three package dirs are gitignored and absent from worktrees).
8. `pre-tool-use-autonomy.sh` — one-line `.agent` → `.agent_type`. Until then the autonomy log keeps writing `unknown`.
9. Live agent drift: `agents/qa.md`, `agents/devops.md`, `agents/reporter.md`, `agents/cleargate-wiki-lint.md` — all four confirmed drifted.
10. cli `dist` rebuild — `dist/cli.js` dates to 2026-07-19, i.e. before waves 4-7.

**⚠ Read this before arming (items 6+7):**

> **Arming the live dispatcher makes this repo's own commits gated for the first time, and a measured dry run shows the close-out commits will BLOCK.** With `.active = SPRINT-38` and all nine stories `Done`, `resolve_story_file()` falls back to an arbitrary finished story whose §3.1 has nothing to do with a close commit. `.cleargate/delivery/**`, `.cleargate/sprint-runs/**/*.md`, and `FLASHCARD.md` are **not** on the surface whitelist. Mitigation is `SKIP_SURFACE_GATE=1` for close-out commits, logged in the sprint Execution Log per §6.2's own instruction — and note that `SKIP_SURFACE_GATE=1` does **not** skip the `check:no-vitest` loop, which will add ~5.8 s and ~15 lines of banner to every commit here. This is a close *procedure* item; do not "fix" the fallback inline (that is carry-over CR-D).

**Not done, recorded:**

11. **The Phase D walkthrough has NOT been performed.** The human redirected to the shipping review before testing the branch. Close is pending their authorization; nobody has exercised the merged branch end-to-end as a user.
12. The shipping review's P2/P3/H1-H5/M1-M6 findings exist only in the review workflow output and in this report — **they are not yet filed as work items.**
