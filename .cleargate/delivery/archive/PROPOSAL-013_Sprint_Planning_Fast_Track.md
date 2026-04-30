---
proposal_id: PROP-013
status: Completed
author: AI Agent (Opus 4.7)
approved: true
approved_at: 2026-04-26T00:00:00Z
approved_by: sandrinio
proposal_gate_waiver: "User picked Path A on 2026-04-26 with sharp intent (process-tightening sprint, fast-track inclusion explicitly requested) + inline reference (PROPOSAL-013 §2.3 rubric, §2.7 reporter integration). Standing rule: when user asks directly for an Epic with sharp intent + inline references, skip retro-proposal and record waiver here."
created_at: 2026-04-26T00:00:00Z
updated_at: 2026-04-26T00:00:00Z
created_at_version: post-SPRINT-13
updated_at_version: post-SPRINT-13
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-04-26T08:49:56Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
context_source: |
  Conversation 2026-04-26 — user asked for the ability to fast-track items where AI judges at sprint planning that the full bounce loop is overkill, citing V-Bounce-Engine (sandrinio/V-Bounce-Engine@main) as the reference implementation. Prior decision EPIC-013 §2 OUT-OF-SCOPE explicitly punted this with rationale "We already handle trivia informally. Formalize only if metrics show cost." The user observation is the cost trigger that unblocks this proposal. V-Bounce reference verified via gh + WebFetch:
    - skills/agent-team/SKILL.md: "Bounce Sequence: Developer → QA (if not Fast Track) → Architect (if not Fast Track) → DevOps Merge"; "Fast Track Exception: Stories labeled 'Fast Track' skip QA and Architect gates entirely—Developer output goes straight to DevOps merge."
    - VBOUNCE_MANIFEST.md: "L1 Trivial → Hotfix Path | Everything else → Standard Path"; hotfix template at product_plans/hotfixes/, audit script hotfix_manager.sh.
stamp_error: no ledger rows for work_item_id PROP-013
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-04-26T08:49:56Z
  sessions: []
sprint_cleargate_id: "SPRINT-12"
---

# PROPOSAL-013: Sprint Planning Fast-Track Lane

## 1. Initiative & Context

### 1.1 Objective

Add an AI-judged **lane classifier** to ClearGate's Sprint Planning v2 phase that tags each decomposed story with one of three lanes — `standard` (default; full architect → developer → QA loop), `fast` (skips Architect plan + QA gate; relies on pre-gate scanner + post-merge sprint-branch tests), or `hotfix` (off-sprint; CR-style; Dev → user manual verify → merge). The Architect proposes lanes during Sprint Design Review; the human confirms at Gate 2; the orchestrator routes accordingly during execution. Mis-classification has an automatic **demotion path** back to `standard` so the cost of a bad call is bounded.

### 1.2 The "Why"

1. **EPIC-013 punted this with a cost trigger.** That epic explicitly listed *"Fast Track / Hotfix path for L1 trivial"* as out-of-scope, gated on *"if metrics show cost."* SPRINT-12 and SPRINT-13 each carried at least one story (BUG-006, BUG-007, CR-007 ResendMailer swap) that went through the full four-agent loop despite being a single-file fix with deterministic verification. The architect plan + QA report + reporter cross-reference for those stories cost ~30-60k tokens each with zero correction signal — the loop was theatre.
2. **V-Bounce already has a working primitive.** `skills/agent-team/SKILL.md` (V-Bounce@main) defines two bypass routes: (a) **Fast Track** — story label that skips QA + Architect, Developer → DevOps merge; (b) **Hotfix Path** — L1-only, Developer → manual verify → merge, with dedicated `hotfix.md` template and `hotfix_manager.sh` ledger-sync script. We port the *concept* (lanes + AI triage + skipped gates) but **do not** port the DevOps role — ClearGate keeps the four-agent contract per EPIC-013 Q5 deferral. Lane routing happens inside the existing orchestrator + Developer scope.
3. **Sprint Planning v2 is the natural insertion point.** STORY-013-09 already added the Architect Sprint Design Review surface plus per-story decomposition signals (`parallel_eligible`, `expected_bounce_exposure`). Adding a third signal `lane: standard|fast|hotfix` is additive — no new agent, no new artifact, no MCP-side change. The Architect already reads every decomposed story to write §2 Execution Strategy; lane judgement reuses that read.
4. **The risk of getting it wrong is bounded by the demotion path.** A fast-track story whose pre-gate scanner OR post-merge test fails is **automatically re-routed** to standard (Architect plan invoked, QA spawned, `qa_bounces` reset to 0). The cost of a bad lane call is one extra pre-gate run plus the standard loop you would have run anyway. There is no way for a fast-tracked failure to escape detection.
5. **The Reporter closes the audit loop.** Sprint Report v2 §3 Execution Metrics gains a `Fast-Track Ratio` and `Fast-Track Demotion Rate`. §5 Framework Self-Assessment lists every fast-tracked story with a one-line "still trivial in retrospect? y/n". Three consecutive sprints with demotion rate ≥30% triggers an automatic re-tightening proposal — the framework polices its own classifier accuracy.

### 1.3 Out of scope (v1)

- **No DevOps agent split.** EPIC-013 Q5 deferred this; v1 keeps merge inside Developer's extended checklist regardless of lane. Re-evaluate after 2 sprints on this proposal's epic.
- **No automatic lane assignment without human confirmation.** Architect proposes; human must explicitly accept the Sprint Plan with the lane column populated. Gate 2 enforcement applies — a Sprint Plan that contains `lane: fast` for a story with `expected_bounce_exposure: high` is a hard contradiction the gate rejects.
- **No retroactive fast-tracking mid-sprint.** Lane is fixed at sprint planning. A standard-lane story cannot be re-classified to fast once execution starts. The reverse (fast → standard demotion on failure) is allowed because it strictly tightens the loop.
- **Hotfix lane is off-sprint only.** Hotfix items live in `pending-sync/CR-NNN_*.md` or `pending-sync/BUG-NNN_*.md` (existing surfaces), not inside Sprint Plans. The lane field on a Sprint Plan story is `standard|fast` only; hotfix is a separate routing applied to off-sprint CR/Bug items.
- **No machine-learning classifier.** The rubric is a deterministic checklist (§2.3) the Architect agent applies. We do not train a model on past sprints. If the rubric proves insufficient, we tighten the rubric, not the model.
- **No cross-repo fast-track**. ClearGate fast-tracks ClearGate stories; the nested `mcp/` repo and any future submodules use the same outer-repo lane assignment (consistent with EPIC-013 Q3 worktree decision).

## 2. Technical Architecture & Constraints

### 2.1 Lane definitions

| Lane | Triage timing | Architect plan | QA gate | Pre-gate scanner | Post-merge test on sprint branch | Demotion path |
|---|---|---|---|---|---|---|
| `standard` | Sprint Planning v2 (default) | ✅ written | ✅ spawned | ✅ runs | ✅ runs | n/a |
| `fast` | Sprint Planning v2 (Architect-proposed, human-confirmed) | ❌ skipped | ❌ skipped | ✅ runs (mandatory — this is the safety net) | ✅ runs (mandatory — second safety net) | Auto-demote to `standard` on any pre-gate or post-merge failure |
| `hotfix` | Off-sprint (CR/Bug at draft time) | ❌ skipped | ❌ skipped | ✅ runs | ✅ runs on `main` directly (no sprint branch) | Demotion lifts the item back to a real CR/Bug; user notified |

The pre-gate scanner is **never** skipped, regardless of lane. It is the mechanical floor (typecheck + lint + debug-statement + TODO + new-dep detection from EPIC-013) and is cheap. Skipping the architect plan and QA agent is what the lane buys; mechanical correctness is non-negotiable.

### 2.2 Where the AI judges

The lane decision happens during the **Architect Sprint Design Review** that STORY-013-09 already adds. Concretely:

```
existing flow (post STORY-013-09):
  Sprint markdown drafted with stories + acceptance Gherkin
  Architect reads each story, writes §2 Execution Strategy
  human reviews + confirms at Gate 2

new tail step (this proposal):
  Architect runs the §2.3 rubric on each story
  emits proposed `lane: standard|fast` per story
  emits a one-line rationale per non-standard lane: "lane=fast — single file, doc-only, no schema"
  Architect writes a §2.4 "Lane Audit" subsection in the Sprint Plan listing every fast-lane story + rationale
  human reviews the Lane Audit explicitly during Gate 2
  Gate 2 rejects the sprint if any fast-lane rationale references a forbidden surface (auth, schema, migration, runtime config, public API)
```

The Architect is the *judge*; the human is the *appellate court*. This matches the existing Architect-proposes / human-confirms pattern for ambiguity (🟢/🟡/🔴) and for `expected_bounce_exposure`.

### 2.3 Eligibility rubric — the deterministic checklist

A story is eligible for `lane: fast` **only if all of the following are true**. Any single false flips it to `standard`. The rubric lives in `.claude/agents/architect.md` § Lane Classification and in `.cleargate/knowledge/cleargate-protocol.md` §14 (new). Both surfaces stay in sync — protocol is the spec, agent file is the runtime instruction.

1. **Size cap.** Implementation diff projected at ≤2 files AND ≤50 LOC net (additions + deletions). Tests count toward the cap; generated files do not.
2. **No forbidden surfaces.** Story does not modify any of: database schema or migration, auth/identity flow, runtime config schema (`cleargate.config.json` shape), MCP adapter API surface, scaffold manifest (`cleargate-planning/MANIFEST.json` shape), security-relevant code (token handling, invite verification, gate enforcement). The forbidden-surface list is encoded in the protocol §14 table and matched by file-path prefix.
3. **No new dependency.** Story does not add a package to any `package.json`. Removals and version pins within an existing major are allowed.
4. **Single acceptance scenario or doc-only.** Story Gherkin has exactly one `Scenario:` block (or zero, for pure doc/comment changes). Stories with `Scenario Outline:` or multiple scenarios are not fast-eligible.
5. **Existing tests cover the runtime change.** Either (a) story description names an existing test file the change exercises, or (b) story is doc-only / comment-only / non-runtime config (gitignore, README, prompt template). The pre-gate scanner verifies (a) by checking that at least one referenced test file exists and includes the affected module name as a string match.
6. **`expected_bounce_exposure: low`.** A story can only be fast if its STORY-013-09 decomposition signal is already `low`. `med` or `high` is auto-`standard`.
7. **No epic-spanning subsystem touches.** Story's affected files all live under one of the epic's declared scope directories (per the epic's `<target_files>` block). A story that touches files outside its parent epic's declared scope is auto-`standard`.

### 2.4 Demotion mechanics

The auto-demotion path is the hard guarantee that a bad lane call cannot escape:

```
fast-lane story enters execution
→ Developer agent spawned in worktree (EPIC-013 worktree contract intact)
→ Developer commits + pushes to story branch
→ pre_gate_runner.sh fast .worktrees/STORY-NNN-NN/ sprint/S-XX
   ├─ pass → continue
   └─ fail → state.json: lane=fast → lane=standard; qa_bounces=0; arch_bounces=0
            QA agent now spawned per standard contract; emit "auto-demoted: <reason>" to sprint markdown §4 with event type LD (Lane Demotion)
→ post-merge test on sprint/S-XX
   ├─ pass → story state Done; close path identical to standard
   └─ fail → revert merge; state.json: lane=fast → lane=standard; re-enter standard loop from Architect plan
```

Demotion is logged with event type `LD` (Lane Demotion) in sprint markdown §4 alongside the existing `UR` (User Review) and `CR` (Change Request) events. Reporter aggregates `LD` events into §3 Execution Metrics > Fast-Track Demotion Rate.

### 2.5 Hotfix lane (off-sprint)

A separate flow for L1 trivial items that arrive **outside** sprint planning — typically a one-line bug report or copy fix:

- New work-item template `.cleargate/templates/hotfix.md` (ports V-Bounce `templates/hotfix.md`, adapts to ClearGate frontmatter).
- File lands in `.cleargate/delivery/pending-sync/HOTFIX-NNN_*.md` (new id prefix; never collides with CR/Bug numbering).
- Triage at draft time: the conversational agent applies the same §2.3 rubric. If it passes, item is tagged `lane: hotfix`; if any check fails, the item is auto-converted to a CR or Bug per the existing triage protocol.
- Execution: Developer agent only. No worktree (works on a short-lived `hotfix/HOTFIX-NNN` branch off `main`). User performs the manual verification step (the `hotfix.md` template includes a § "Verification Steps" the user explicitly walks before merge approval). Merge to `main` is direct.
- Audit: a hotfix appends to `.cleargate/wiki/topics/hotfix-ledger.md` (new append-only topic page) at merge time with date, item id, files touched, lines changed, originating signal (user report / monitor / drive-by), and resolved-by commit SHA. The Sprint Reporter reads this ledger at sprint close and surfaces hotfix activity that occurred *during the sprint window* in the sprint report (see §2.7) — hotfixes are off-sprint by execution path but **on-sprint by metric**, because volume of hotfixes is a first-class signal of how well sprint planning is catching real work.
- Hard cap: ≤3 hotfixes per rolling 7-day window. The 4th forces the user to either bundle them into a Sprint Plan or downgrade one to a CR. The cap prevents hotfix-as-process drift (this is a flashcard-worthy lesson from V-Bounce's manifest, which has no such cap).

### 2.6 State machine impact (state.json schema delta)

EPIC-013's `state.json` schema (locked at `schema_version: 1`) gains one new optional field per story. Per protocol, **any change bumps the version** — this proposal's epic ships `schema_version: 2` with a migration step in close_sprint.mjs that defaults missing fields to `standard`:

```json
{
  "schema_version": 2,
  "stories": {
    "STORY-NNN-NN": {
      "state": "...",
      "qa_bounces": 0,
      "arch_bounces": 0,
      "lane": "standard | fast",
      "lane_assigned_by": "architect | human-override",
      "lane_demoted_at": null,
      "lane_demotion_reason": null,
      "updated_at": "..."
    }
  }
}
```

Backward compatibility: a `schema_version: 1` state.json is auto-migrated by adding `lane: standard` and `lane_assigned_by: migration-default` to every story. Old sprints stay readable.

### 2.7 Reporter integration (Sprint Report v2 delta)

Sprint Report v2 (introduced by EPIC-013 STORY-013-07) gains both **fast-track** metrics (in-sprint) and **hotfix** metrics (off-sprint but counted against the sprint window). Hotfix volume is a first-class signal of how well sprint planning is forecasting real work — a sprint that ships zero stories but absorbs five hotfixes is a planning failure, even if every individual hotfix was correctly classified.

- **§3 Execution Metrics** — five new rows:
  - `Fast-Track Ratio` = `count(stories where lane = fast at sprint close) / total stories`
  - `Fast-Track Demotion Rate` = `count(stories with LD event) / count(stories where lane = fast was assigned)`
  - `Hotfix Count (sprint window)` = `count of HOTFIX-* items merged between sprint start and sprint close`
  - `Hotfix-to-Story Ratio` = `Hotfix Count / total in-sprint stories`. Above 0.3 is a planning-discipline warning surfaced in §5.
  - `Hotfix Cap Breaches` = number of distinct rolling-7-day windows during the sprint where the ≤3 cap was hit. Always reported even if zero.
- **§5 Framework Self-Assessment > Process** — two new tables:

  **Lane Audit** (one row per fast-lane story):

  | Story | Files touched | LOC | Demoted? | In retrospect, was fast correct? (y/n) | Notes |
  |---|---|---|---|---|---|

  The retrospect column is human-filled during sprint close. A "n" answer in three consecutive sprints triggers an automatic flashcard `#fast-track #classifier-drift` and a follow-up CR to tighten the rubric.

  **Hotfix Audit** (one row per hotfix merged during the sprint window):

  | Hotfix ID | Originating signal | Files touched | LOC | Resolved-by SHA | Could this have been a sprint story? (y/n) | If y — why was it missed at planning? |
  |---|---|---|---|---|---|---|

  The "could this have been a sprint story?" column is human-filled during sprint close. Three or more "y" answers in a single sprint triggers an automatic flashcard `#hotfix #planning-miss` and a follow-up CR to extend the Architect's Sprint Design Review checklist with the missing surface category.

- **§5 > Process** also gains a one-paragraph **Hotfix Trend** narrative: rolling 4-sprint hotfix count, with a flag if the trend is monotonically increasing across three sprints (signal of accumulating debt or a rubric leak).

The hotfix data source is `.cleargate/wiki/topics/hotfix-ledger.md`, filtered by merge timestamp falling between the sprint's `started_at` and `closed_at`. Reporter never reads the raw `pending-sync/HOTFIX-*.md` files for this — the ledger is canonical for the metric.

### 2.8 Dependencies

- Existing: `cleargate-wiki-ingest`, `stamp-and-gate.sh`, EPIC-013 worktree contract, EPIC-013 state.json, EPIC-013 pre_gate_runner.sh, STORY-013-09 Sprint Design Review.
- Hard prerequisite: **EPIC-013 must ship before this epic starts.** `lane: fast` is meaningless without the pre-gate scanner and post-merge test infrastructure that EPIC-013 builds. SPRINT-09 (EPIC-013 dogfood) is the gating sprint.
- No new external packages.
- No MCP-side changes (lane is local-only state, like state.json itself; never pushed to PM tool — consistent with EPIC-013 Q7 authority boundary).
- No CLI breaking changes.

### 2.9 System Constraints

| Constraint | Details |
|---|---|
| **Four-agent contract** | Preserved. No DevOps role. Developer's existing post-merge checklist absorbs the merge step regardless of lane. |
| **Pre-gate scanner** | Never skipped, any lane. Mechanical floor is non-negotiable. |
| **Demotion is one-way** | A story can demote `fast → standard` but never promote `standard → fast` mid-sprint. Lane is decided once, at Sprint Planning v2 Gate 2. |
| **Forbidden surfaces** | Encoded in protocol §14 as a file-path prefix list. Adding a new forbidden surface is a one-line protocol edit + flashcard, not a code change. |
| **Schema version** | state.json bumps to `schema_version: 2`. Migration defaults are explicit (no silent field addition). |
| **Hotfix cap** | ≤3 per rolling 7-day window. Enforced at draft time by the conversational agent (counts files in `pending-sync/HOTFIX-*.md` plus archived hotfixes resolved in the last 7 days). |
| **Hotfix metrics** | Hotfixes are off-sprint by execution but on-sprint by metric. Sprint Report §3 always includes Hotfix Count, Hotfix-to-Story Ratio, and Hotfix Cap Breaches; §5 always includes the Hotfix Audit table — even when the count is zero (proves the metric was checked, not skipped). |
| **No ML** | Rubric is deterministic. No training. Drift is fixed by tightening the rubric, not by retraining. |
| **Reporter audit** | Mandatory. A sprint report missing the §5 Lane Audit table OR the §5 Hotfix Audit table fails close_sprint.mjs validation. |

## 3. Scope Impact (Touched Files & Data)

### 3.1 Known Files (modified)

- `.claude/agents/architect.md` — append § Lane Classification (the §2.3 rubric, the §2.2 Sprint Design Review tail step, the rationale-emission contract).
- `.claude/agents/developer.md` — append § Lane-Aware Execution: read `lane` from state.json on spawn; if `lane: fast`, skip writing the architect-plan-citation block (no plan exists); demotion handler that resets state.json on pre-gate or post-merge failure.
- `.claude/agents/reporter.md` — extend report-writing contract: §3 Fast-Track + Hotfix metric rows, §5 Lane Audit table, §5 Hotfix Audit table, §5 Hotfix Trend narrative; reject reports missing any of these. Reporter reads `wiki/topics/hotfix-ledger.md` (canonical source) filtered by sprint window.
- `.cleargate/knowledge/cleargate-protocol.md` — add §14 "Lane Routing" with the rubric, demotion mechanics, hotfix cap, state.json schema bump, and the LD event type addition to §10.
- `.cleargate/templates/Sprint Plan Template.md` — extend §1 story table with `Lane` column; add §2.4 "Lane Audit" section that Architect fills.
- `.cleargate/templates/story.md` — add `lane: standard|fast` frontmatter (additive; defaults to `standard` if absent).
- `.cleargate/templates/sprint_report.md` — add §3 Fast-Track Ratio + Demotion Rate + Hotfix Count + Hotfix-to-Story Ratio + Hotfix Cap Breaches rows; add §5 Lane Audit table skeleton, §5 Hotfix Audit table skeleton, and §5 Hotfix Trend narrative placeholder.
- `.cleargate/scripts/update_state.mjs` — accept `--lane <standard|fast>` and `--lane-demote <reason>` flags; bump schema_version to 2 on first write; auto-migrate v1 state.json on read.
- `.cleargate/scripts/pre_gate_runner.sh` — add post-pass hook: if scanner passes AND lane=fast, skip QA spawn signal; if scanner fails AND lane=fast, write demotion event to state.json.
- `.cleargate/scripts/close_sprint.mjs` — validate §3 fast-track + hotfix metric rows AND §5 Lane Audit + Hotfix Audit + Hotfix Trend presence in REPORT.md before flipping sprint_status to Completed; reads `wiki/topics/hotfix-ledger.md` for sprint-window count cross-check.
- `.cleargate/scripts/init_sprint.mjs` — accept lane-per-story input from Sprint Plan §1 table; emit error if any story has `lane: fast` AND `expected_bounce_exposure: med|high` (rubric §6 contradiction).
- `cleargate-planning/MANIFEST.json` — bump scaffold version; declare new template files for three-surface landing.
- `cleargate-cli/src/commands/wiki.ts` — register `cleargate hotfix new <slug>` to scaffold a `pending-sync/HOTFIX-NNN_<slug>.md` from the new template (parallels `cleargate story new`).
- `.cleargate/wiki/index.md` — add a "Hotfix Ledger" section linking to `wiki/topics/hotfix-ledger.md`.

### 3.2 Expected New Entities

- `.cleargate/templates/hotfix.md` — new work-item template, ports V-Bounce `hotfix.md` adapted to ClearGate frontmatter (id format `HOTFIX-NNN`, includes mandatory § "Verification Steps" the user walks).
- `.cleargate/wiki/topics/hotfix-ledger.md` — new append-only synthesis page (canonical source for all hotfix metrics). Each merged hotfix appends a YAML row: `merged_at`, `id`, `files[]`, `loc_changed`, `originating_signal` (one of `user-report` / `monitor` / `drive-by` / `regression`), `commit_sha`, `verified_by` (user identity), and (filled at sprint close) `sprint_id` + `could_have_been_sprint_story` + `planning_miss_reason`. Read by Reporter at sprint close, filtered by sprint window.
- `cleargate-planning/.cleargate/templates/hotfix.md` — scaffold-mirror per EPIC-013 R9 three-surface landing rule.
- (Optional) `.cleargate/scripts/hotfix_audit.mjs` — weekly cap check + ledger reconciliation; runs from `cleargate doctor` and emits a warning if the hotfix count for the rolling 7-day window is ≥3. Defer to v2 unless cap-breach happens during the first month.

### 3.3 Schema delta (additive — `state.json` bumps to v2)

```json
{
  "schema_version": 2,
  "stories": {
    "STORY-NNN-NN": {
      "lane": "standard | fast",
      "lane_assigned_by": "architect | human-override | migration-default",
      "lane_demoted_at": "<ISO> | null",
      "lane_demotion_reason": "<string> | null"
    }
  }
}
```

Backward compatibility: `schema_version: 1` files auto-migrate on first write under the new code, with all stories defaulted to `lane: standard, lane_assigned_by: migration-default`. No data loss.

## 4. Open Questions for Human Confirmation

These are genuinely undecided and should land in the resulting Epic's §6 AI Interrogation Loop. Listing here so they don't get lost between Gate 1 (this proposal's approval) and Gate 2 (epic decomposition).

1. **Should lane assignment be available to Bugs, or stories only?** A trivial bug (typo, copy fix) is the strongest fast-track candidate, but bugs already have a lighter triage. Recommendation: yes, extend `lane` to bug frontmatter too — same rubric, same demotion path. Confirm or override.
2. **What is the exact LOC cap?** §2.3 rubric §1 proposes 50 LOC net. V-Bounce uses no explicit cap. A stricter cap (e.g. 30) catches more rubric escapes; a looser cap (e.g. 100) reduces false-negative cost. Recommendation: start at 50, log every fast-lane story's actual LOC in the §5 Lane Audit, tighten or loosen after 2 sprints of data.
3. **Hotfix cap — calendar week or rolling 7-day?** §2.5 says ≤3 per calendar week. Rolling 7-day is more honest (no Sunday-resets-the-budget gaming). Recommendation: rolling 7-day. Confirm.
4. **Three-strike demotion rule for the rubric itself?** §2.7 proposes that 3 consecutive sprints with "n" answers in the retrospect column triggers a CR. Should it also auto-disable the fast lane until the CR ships? Recommendation: yes — fail-safe default. Confirm or override.

🔒 Approval Gate

(Vibe Coder: Review this proposal. Specifically validate (a) the Architect-as-judge / human-as-appellate-court pattern from §2.2, (b) the §2.3 rubric is tight enough — or too tight — and adjust the rubric items if needed before Gate 2, (c) the §2.5 hotfix cap is the right discipline mechanism, (d) the schema_version bump in §2.6 is acceptable given EPIC-013's "any change bumps version, never silent" rule, (e) EPIC-013 must ship first per §2.8 — confirm the dependency order is acceptable. If correct, change `approved: false` → `approved: true` in the YAML frontmatter. Only then is the AI authorized to proceed with Epic decomposition (likely EPIC-022).)
