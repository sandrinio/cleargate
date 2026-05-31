---
sprint_id: SPRINT-30
status: Shipped
generated_at: 2026-05-29T00:00:00.000Z
generated_by: Reporter agent
template_version: 2
pushed_by: sandro.suladze@gmail.com
pushed_at: 2026-05-31T01:03:45.978Z
push_version: 1
---

<!-- role: reporter -->
<!-- Sprint Report v2 Template — template_version: 2 -->
<!-- Event-type vocabulary (protocol §§2–17):
     User-Review: UR:review-feedback | UR:bug
     Change-Request: CR:bug | CR:spec-clarification | CR:scope-change | CR:approach-change
     Circuit-breaker: test-pattern | spec-gap | environment
     Lane-Demotion: LD -->

# SPRINT-30 Report: Solo Onboarding + Dogfood Hardening

**Status:** Shipped
**Window:** 2026-05-19 to 2026-05-22 (story merges) · close 2026-05-29 (4 calendar days execution)
**Stories:** 8 planned / 8 shipped / 0 carried over
**Parent epic:** EPIC-021 (Solo Onboarding DX) — Completed

---

## §1 What Was Delivered

### User-Facing Capabilities
<!-- Backed by commits; goal = remove the install + first-sprint friction a solo dev with no prior ClearGate context hits. -->
- **Clean `cleargate init` transcript.** The DEP0190 deprecation warning that polluted fresh-install output is gone — the PATH probe at init.ts:452 dropped `shell: true` and now spawns the `which` binary instead of the `command -v` shell builtin (commit `3a151a89`, STORY-068-01).
- **Visible MCP-restart directive.** A boxed banner now fires on stderr after the init `Done.` line telling the user to restart Claude Code to load the MCP server (and to verify with `/mcp`), instead of burying it as one bullet among 60+ file-creation lines — the root cause of pdf_processor SPRINT-01's silent MCP failures (commit `bedc3774`, STORY-069-01; new helper `cleargate-cli/src/lib/banners.ts`).
- **Safer default `.gitignore`.** A fresh init now ships a `.gitignore` covering `.env*` secrets (with `!.env.example` allowlist), Python/Node build artifacts, and OS junk — so the solo developer no longer commits an `AZDO_PAT`-carrying `.env` on their first `git add -A` (commit `9e379f75`, STORY-072-01).
- **Correct pre-member state on fresh repos.** A brand-new repo with no per-repo join now reports `state: pre-member` regardless of any global `~/.cleargate/auth.json` token, restoring the CR-011 capability-gating contract that pdf_processor's fresh install violated (commit `209b9b78`, BUG-031).

### Internal / Framework Improvements
- **Readiness-gate PATH regex tightened.** `PATH_RE` in `readiness-predicates.ts` now requires a `/` separator (root files use `./name.ext`) and supports a numeric line-anchor suffix, killing the false-positive gate failures that bare filenames and dotted code-references produced when authoring `§Existing Surfaces` (commit `9e379f75`/W0, STORY-073-01).
- **`execution_mode` vocabulary collapsed; schema bumped v2→v3.** The `v1`/`v2` dual-mode field is purged from docs, templates, scripts, CLI descriptions, and `state.schema.json`; a strip-on-read migrator (`_migrate-schema-v3.mjs`) cleans legacy state files, and a `CLEARGATE_ADVISORY=1` break-glass env var replaces the old advisory mode. Verified: this sprint's own `state.json` is `schema_version: 3` with no `execution_mode` key (commit `145a28c2`, STORY-070-01).
- **Sprint Execution Autonomy contract anchored (protocol §22).** The "agents decide, they don't ask" rule was promoted from a single sentence in one orchestrator skill into a 5-case enumerated protocol section, propagated to all five loop-agent definitions, and backed by a soft `pre-tool-use-autonomy.sh` PreToolUse hook wired into `settings.json` (commit `28aed0fd`, STORY-071-01).
- **close_sprint back-sync repaired.** `reconcileCurrentSprintStories` now flips same-sprint Done stories to `status: Completed, approved: true` and archives them at close, plus a `--retroactive` flag for drifted closed sprints — eliminating the 13-file manual frontmatter rewrite pdf_processor SPRINT-02 needed (commit `19b9e6a7`, BUG-032).

### Carried Over
- None. All 8 items reached Done and merged to main (close merge `33101a89`).

---

## §2 Story Results + CR Change Log

> All eight items shipped with `qa_bounces=0 arch_bounces=0` per `state.json`. No CR or UR events were
> recorded during execution — first-pass success across the board. The per-story CR/UR tables below are
> therefore "no events recorded" by design, not omission.

### STORY-068-01: Drop `shell: true` from init PATH probe
- **Status:** Completed
- **Commit:** `3a151a89` (qa-red `c854cfae`)
- **Bounce count:** qa=0 arch=0 total=0
- **CR Change Log:** No events recorded.
- **UR Events:** No events recorded.
- **Note:** Architect surfaced a required spec clarification pre-dispatch (`command -v` is a shell builtin and cannot survive `shell:true` removal → swap to `which`). Resolved at dispatch time, not as a bounce.

### STORY-069-01: Emit final MCP-restart banner after init `Done.`
- **Status:** Completed
- **Commit:** `bedc3774` (qa-red `5996de58`)
- **Bounce count:** qa=0 arch=0 total=0
- **CR Change Log:** No events recorded.
- **UR Events:** No events recorded.

### STORY-070-01: Collapse `execution_mode` vocabulary + schema v3 migrator + advisory env hatch
- **Status:** Completed
- **Complexity:** standard (rubric: ~16 files / ~400 LOC, 8 scenarios)
- **Commit:** `145a28c2` (qa-red `b8e1f8a6` — 5 files, 21 baseline fails; prebuild sync `aa9eee63`)
- **Bounce count:** qa=0 arch=0 total=0
- **CR Change Log:** No events recorded.
- **UR Events:** No events recorded.

### STORY-071-01: Anchor Sprint Execution Autonomy contract (protocol §22) + 5 agents + soft hook
- **Status:** Completed
- **Complexity:** standard (rubric: ~12 files / ~250 LOC, 6 scenarios)
- **Commit:** `28aed0fd` (qa-red `c5fd850b` — 2 files, 35 baseline fails; close `b8fafc02`)
- **Bounce count:** qa=0 arch=0 total=0
- **CR Change Log:** No events recorded.
- **UR Events:** No events recorded.
- **Note:** Highest token cost in the sprint (17.3× median story cost per ledger anomaly scan) — broad blast radius (5 agent files + new hook + settings.json + protocol doc).

### STORY-072-01: Expand default `.gitignore` template
- **Status:** Completed
- **Commit:** `9e379f75` (qa-red `74ba4552`; prebuild sync `49fb4b0b`)
- **Bounce count:** qa=0 arch=0 total=0
- **CR Change Log:** No events recorded.
- **UR Events:** No events recorded.

### STORY-073-01: Tighten readiness-gate PATH regex (Wave 0 prerequisite)
- **Status:** Completed
- **Commit:** landed Wave 0 (qa-red red-test run logged 2026-05-19T16:51; merged ahead of W1)
- **Bounce count:** qa=0 arch=0 total=0
- **CR Change Log:** No events recorded.
- **UR Events:** No events recorded.

### BUG-031: Fresh-repo pre-member isolation
- **Status:** Completed
- **Commit:** `209b9b78` (qa-red `8d3287d3`; surface-miscite patch `892b0a2a`)
- **Bounce count:** qa=0 arch=0 total=0
- **CR Change Log:** No events recorded.
- **UR Events:** No events recorded.
- **Note:** The story's `§Existing Surfaces` miscited `cleargate-cli/src/util/identity.ts` (canonical is `src/lib/identity.ts`). Corrected via a §1.6/§4-only editorial patch (`892b0a2a`) — Gherkin untouched, not a bounce.

### BUG-032: close_sprint back-sync flips same-sprint story frontmatter
- **Status:** Completed
- **Commit:** `19b9e6a7` (qa-red `2a3c6b6c` — 4 scenarios)
- **Bounce count:** qa=0 arch=0 total=0
- **CR Change Log:** No events recorded.
- **UR Events:** No events recorded.
- **Note:** Flagged `bounce: high` at plan time (wide close-pipeline blast radius); shipped clean with zero bounces.

---

## §3 Execution Metrics

| Metric | Value |
|---|---|
| Stories planned | 8 |
| Stories shipped (Done) | 8 |
| Stories escalated | 0 |
| Stories carried over | 0 |
| Fast-Track Ratio | 0% (all 8 `lane: standard`) |
| Fast-Track Demotion Rate | N/A (no story ever assigned `fast`) |
| Hotfix Count (sprint window) | 0 |
| Hotfix-to-Story Ratio | 0 |
| Hotfix Cap Breaches | 0 |
| LD events | 0 |
| Total QA bounces | 0 |
| Total Arch bounces | 0 |
| CR:bug events | 0 |
| CR:spec-clarification events | 0 |
| CR:scope-change events | 0 |
| CR:approach-change events | 0 |
| UR:bug events | 0 |
| UR:review-feedback events | 0 |
| Circuit-breaker fires: test-pattern | 0 |
| Circuit-breaker fires: spec-gap | 0 |
| Circuit-breaker fires: environment | 0 |
| **Bug-Fix Tax** | 0% |
| **Enhancement Tax** | 0% |
| **First-pass success rate** | 100% (8/8 with qa=0 AND arch=0) |

### Token Reconciliation (CR-035 two-line split)

Ledger is pure CR-018 v2 format (103/103 rows carry `delta`; 0 flat rows) — no pre-0.9.0 caveat applies.
`.session-totals.json` sum reconciles exactly with the bundle's pre-computed `sprint_total_tokens`.

```
Token cost (sprint work, dev+qa+architect): 234,334,597
Token cost (Reporter analysis pass):        TBD — see token-ledger.jsonl post-dispatch
Token cost (sprint total):                  241,101,878
```

| Token source | Value |
|---|---|
| Source 1 — session-totals (sprint total) | 241,101,878 |
| Source 2 — ledger deltas, agent_type ≠ reporter (sprint work) | 234,334,597 |
| Source 3 — Reporter analysis pass | TBD (SubagentStop not yet fired) |
| Source 4 — story-doc Token Usage frontmatter | N/A (no `token_usage`/`draft_tokens` fields in bundle) |
| Source 5 — task-notification totals | N/A |
| **Divergence (work vs total)** | **2.89%** |
| **Divergence flag (>20%)** | **NO** |

The 6,767,281-token gap between sprint-work and sprint-total is the Reporter's own (pre-dispatch) bundle/orientation overhead, recorded under `reporter` agent_type (4 rows). It is well under the 20% threshold, so no divergence flag — and the Source-3 TBD gap is expected, not a defect.

**Per-agent breakdown (from ledger digest):** architect 106.5M (51 dispatches) · developer 88.4M (21) · qa 22.2M (16) · devops 14.9M (8) · reporter 6.8M (4) · unknown 2.3M (3). All 103 rows carry a story/work-item id (0 unassigned).

**Ledger anomalies (digest):** SPRINT-28 9.4× median; STORY-071-01 17.3× median story cost. STORY-071-01's spike is consistent with its 12-file / 5-agent blast radius.

**Cost (rates as of 2026-05-29):** not computed — 220.4M of the 241.1M total is `cache_read` (≈91%), and a defensible USD figure requires the current per-token cache-read vs input/output rate split, which is not pinned in this bundle. Marked `~$X (rates as of 2026-05-29)` pending rate confirmation rather than fabricated.

---

## §4 Observe Phase Findings

Observe phase: no findings.

<!-- No UR:bug, no hotfixes, and no UR:review-feedback recorded in the Observe window
     [2026-05-22 last-merge → 2026-05-29 close]. Section collapsed per template directive. -->

---

## §5 Lessons

### New Flashcards (Sprint Window) — 2026-05-19 → 2026-06-02

Fourteen cards landed in-window. The early cluster (2026-05-19/20) is SPRINT-30's own execution; the
2026-05-29 cluster is off-sprint SPRINT-32/33 planning + spike work carried on this branch.

| Date | Tags | Lesson |
|---|---|---|
| 2026-05-19 | #git #stash | `git stash` + failed `pop` + `drop` lost in-flight Dev edits; use a throwaway branch, never stash for baseline compare. |
| 2026-05-19 | #regex #test-fixture | Tightening a path regex breaks fixtures citing bare filenames; update to slash-required (`./package.json`) — intentional. |
| 2026-05-19 | #readiness-gate #path-re | `PATH_RE` suffix `(?::[a-zA-Z0-9_]+)?` now supports numeric anchors (`:42`); strip-suffix regex must mirror the class. |
| 2026-05-19 | #qa-red #spec-gap | Red file's inline regex/const goes stale after Dev's fix; delete the `.red.` file at merge, don't patch in place. |
| 2026-05-19 | #test-harness #gitignore | `git check-ignore -v` exits 0 for `!` negation rules (false positive); omit `-v` to get exit 1 for not-ignored. |
| 2026-05-19 | #close-pipeline #id-lookup | `reconcileCrossSprintOrphans` prefix-split drops non-standard IDs; use `findArtifactFile()` for cross-format coverage. |
| 2026-05-19 | #close-pipeline #test-seam | `reconcileCurrentSprintStories` (Step 2.6d) needs no SKIP seam — pure FS; `import().catch` handles stale-dist. |
| 2026-05-19 | #devops #build #dist | Merge-time scoped test fails on stale `dist/cli.js`; rebuild (`npm run build`) before Step 6 when src/ is touched. |
| 2026-05-20 | #worktree #build #dist | `dist/cli.js` references co-located chunk files; copy the whole dist/ tree (not just cli.js) into the worktree. |
| 2026-05-20 | #worktree #build #node_modules | git worktrees share source but NOT `node_modules`; symlink before `npm run build` in a fresh worktree. |
| 2026-05-20 | #membership #per-repo #cr-011 | `getMembershipState` needs `{projectRoot}` + per-repo `.cleargate/.join.json`; global auth.json alone is insufficient. |
| 2026-05-22 | #qa #regression #baseline-variance | Full-suite failure count varies ~15 across runs; stash-baseline first, never trust raw count diff. |
| 2026-05-29 | #orchestration #subagent #sdr | Agent subagents return ONLY their final message; instruct "final message = the block verbatim" or lose the deliverable. |
| 2026-05-29 | #workflow #token-ledger #worktree | Workflow `agent()` fires SubagentStop with orchestrator session_id; dispatch-marker attribution dead — write ledger at barrier. |

### Flashcard Audit (Stale Candidates)

Stale-detection pass over the sprint-window cards: every concrete symbol they reference
(`getMembershipState`, `.cleargate/.join.json`, `reconcileCurrentSprintStories`, `PATH_RE`,
`pre-tool-use-autonomy.sh`, `CLEARGATE_ADVISORY`, `emitMcpRestartBanner`, `reconcileCrossSprintOrphans`)
resolves to a live repo path.

No stale flashcards detected.

### Supersede Candidates

| Newer card | Older card | Proposed marker for older |
|---|---|---|
| 2026-05-19 `#regex #test-fixture` / `#readiness-gate #path-re` (PATH_RE tightening) | Any earlier card asserting bare-filename paths pass the readiness gate (none found in-window) | none — no in-window contradiction |

No supersede actions required this sprint. (Note: the FLASHCARD file carries 5 existing `[S]`/`[R]` markers, all pre-dating this sprint; none touched.)

---

## §6 Framework Self-Assessment

### Templates
| Item | Rating | Notes |
|---|---|---|
| Story template completeness | Yellow | BUG-031's `§Existing Surfaces` shipped with a wrong path (`util/identity.ts`) that needed a post-draft editorial patch (`892b0a2a`). The new STORY-073-01 slash-required guidance should reduce this class going forward. |
| Sprint Plan Template usability | Yellow | Plan §1 mis-classified 3 stories as `lane: fast`; the Architect's 7-check rubric flipped all 3 to `standard`. The plan's §2.4 Lane Audit only audited one of them — the rubric should run on every fast candidate at plan time. |
| Sprint Report template (this one) | Green | v2 structure fit an all-clean 8-item sprint; the "Observe phase: no findings" collapse and the CR-035 two-line split both worked as specified. |

### Handoffs
| Item | Rating | Notes |
|---|---|---|
| Architect → Developer brief quality | Green | M1/M2 SDRs carried verbatim path/line citations and pre-resolved the `command -v`→`which` and §22-numbering ambiguities before dispatch — zero arch bounces. |
| Developer → QA artifact completeness | Green | QA-Red red-test runs are present for all 8 items; QA-Green produced zero kickbacks. |
| QA → Orchestrator kickback clarity | Green | No kickbacks occurred (0 qa_bounces). Cannot stress-test clarity this sprint. |

### Skills
| Item | Rating | Notes |
|---|---|---|
| Flashcard gate adherence | Yellow | Architect noted the Skill tool was not invokable from its dispatch context and grepped FLASHCARD.md directly instead (M1 plan §7.6). Functionally fine, but the skill-invocation seam is not reaching sub-agents. |
| Adjacent-implementation reuse rate | Green | `extractSessionLoadDelta`, `resolveIdentity`, `setFrontmatterStatusAtomic`, `walkActiveParents` all reused from the sprint-context Adjacent-Implementations table; no duplicate helpers introduced. |

### Process
| Item | Rating | Notes |
|---|---|---|
| Bounce cap respected | Green | 100% first-pass success (0 qa, 0 arch bounces across 8 items). No cap pressure. |
| Three-surface landing compliance | Green | Payload stories (STORY-070-01, STORY-071-01, STORY-072-01) each have an explicit `npm run prebuild` re-sync commit (`aa9eee63`, `49fb4b0b`, `bf1ddce2`). Dogfood-mirror discipline held. |
| Circuit-breaker fires (if any) | Green | None fired. |
| Commit-scope convention | Yellow | STORY-070-01/071-01 story commits use `feat(EPIC-029):` (per the `feat(<epic>):` convention — correct), but their close-chore commits and the other six stories use `(SPRINT-30)` scope. Mixed epic-vs-sprint scope tags within one sprint; pick one convention. |

### Lane Audit
No fast-lane stories this sprint — all 8 items are `lane: standard` (`lane_assigned_by: migration-default`). Table omitted (activation condition not met: zero `lane: fast` stories at close).

### Hotfix Audit

| Hotfix ID | Originating signal | Files touched | LOC | Resolved-by SHA | Could this have been a sprint story? (y/n) | If y — why was it missed at planning? |
|---|---|---|---|---|---|---|
| (none) | — | — | — | — | — | — |

### Hotfix Trend

0 hotfixes in the SPRINT-30 window. `wiki/topics/hotfix-ledger.md` shows no rows with `merged_at` between sprint start (2026-05-19) and close (2026-05-29). No monotonic-increase flag — `trend: FLAT` (0 across the window). Prior sprints in this branch's lineage carry no lane/hotfix ledger data (pre-v2-schema), so the rolling 4-sprint count is `0 hotfixes (no ledger data for SPRINT-27..29)`.

### Tooling
| Item | Rating | Notes |
|---|---|---|
| run_script.sh diagnostic coverage | Yellow | The wrapper captured 12 incident JSONs (see §Script Incidents). 9 are expected QA-Red red-test runs (exit 1 = tests failing pre-implementation, by design). 3 are genuine friction: two callers passed a compound `cd X && npm ...` / `ENV=val node ...` string as a single command (wrapper exec'd it literally → "No such file or directory" at line 92), and one `git worktree remove` exited 128 needing `--force` on a worktree with untracked files. None blocked the sprint; the wrapper-misuse pattern is worth a guard. |
| Token ledger completeness | Green | Pure v2 format, 103/103 rows with `delta`, every row carries a work-item id, `.session-totals.json` reconciles exactly with the digest. |
| Token divergence finding | Green | Work-vs-total divergence 2.89% (< 20%) — no flag. Source-3 (Reporter pass) TBD is expected pre-dispatch. |

---

## Script Incidents

The `run_script.sh` wrapper captured 12 incident JSONs under
`.cleargate/sprint-runs/SPRINT-30/.script-incidents/`. Triage:

- 9 are **expected QA-Red failures** — `npx tsx --test ...red.node.test.ts` runs that exit 1 because the tests are written to fail before the Developer implements (e.g. `20260519T165104Z-c327ee6f500e.json` = STORY-073-01 red run, 4 pass / 2 fail baseline). Not defects.
- `20260519T173923Z-dba8d6531a4e.json` · null · `cd .../cleargate-cli && npm run prebuild` exited 1 · "No such file or directory" — compound `cd && npm` string passed as a single command to the wrapper.
- `20260519T184528Z-bb211746e252.json` · null · `CLEARGATE_STATE_FILE=... node update_state.mjs STORY-072-01 Done` exited 1 · "No such file or directory" — env-var-prefix-as-command misuse of the wrapper.
- `20260522T180134Z-a896bd56be5c.json` · null · `git worktree remove .../STORY-070-01` exited 128 · "contains modified or untracked files, use --force to delete it" — benign; recovered with `--force`.

The two wrapper-misuse incidents share a root cause: the wrapper expects `<cmd> [args...]`, not a shell-compound or `ENV=val cmd` prefix. Recommend a one-line guard or doc note in `run_script.sh`.

---

## §7 Change Log

| Date | Author | Change |
|---|---|---|
| 2026-05-29 | Reporter agent | Initial generation |
