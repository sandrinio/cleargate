---
sprint_id: SPRINT-47
parent_cleargate_id: null
sprint_cleargate_id: null
carry_over: false
lifecycle_init_mode: block
remote_id: null
source_tool: manual
status: Active
start_date: 2026-11-17
end_date: 2026-11-21
synced_at: null
created_at: 2026-11-16T07:48:36.285Z
updated_at: 2026-11-16T07:48:36.285Z
created_at_version: strategy-phase-pre-init
updated_at_version: strategy-phase-pre-init
draft_tokens:
  input: null
  output: null
  cache_read: null
  cache_creation: null
  model: null
  sessions: []
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-11-16T07:52:34Z
  transition: ready-for-execution
epics:
  - EPIC-065
stories:
  - STORY-065-01
  - STORY-065-02
  - STORY-065-03
  - STORY-065-04
  - STORY-065-05
  - STORY-065-06
execution_mode: v2
area: sprint-execution,scripts,agent-prompts,templates,gates
sprint_goal: |
  Make proof decide Done: every item declares a proof tier, a script records each proof as evidence, an item becomes Done only when evidence for its tier exists, and close and the report show the tier promised and the evidence produced, or "built, not proven at tier X".
proposals: []
context_source: |
  Decomposes EPIC-065 (INITIATIVE-002 WS-1, approved by the owner 2026-11-16) into STORY-065-01..06.
  Absorbs CR-128 (into STORY-065-01) and CR-129 (into STORY-065-06). Folds in two SPRINT-46 intake
  items: upgrade keeping user keys in gate-checks.json (STORY-065-02) and a seal for new red files
  after the Developer's commit (STORY-065-05). First sprint here on the new loop (cleargate 0.31.2).
last_contradict_sha: "c14c59842c9b56819cd6b7bb72245c47089b0f027339d852bc9a9c20c3c4876f"
---

# SPRINT-47: Proof Decides Done

## 0. Stakeholder Brief

This is the third slice of INITIATIVE-002 (Evidence-First Execution Loop), and the one the
initiative was started for. Across the repositories that run ClearGate, most defects were found
after every agent check had passed: about 130 at walkthroughs in doc_processor, more than 70 in
live runs in new_app, about 47 by real runs here. Today nothing in the loop asks how an item will be
proven, nothing records that it was, and an item is Done the moment it merges. This sprint makes
each item say up front how it will be proven, has a script run that proof and keep the result, holds
the item out of Done until the result exists, and makes close and the report show any gap.

It is the first sprint here on the loop SPRINT-46 shipped (fast, standard and runtime lanes, sealed
red tests, merge by script). At its close the new rules go live here and ship as `cleargate` 0.32.0.

- **Sprint Goal:** Make proof decide Done: every item declares a proof tier, a script records each proof as evidence, an item becomes Done only when evidence for its tier exists, and close and the report show the tier promised and the evidence produced, or "built, not proven at tier X".
- **Business Outcome:** "done" means proven at a stated tier; an unproven item is visible as such, at merge, at the walkthrough, at close and in the report.
- **Risks (top 3):** the sprint changes the merge, the Done transition and close that its own loop runs; three stories edit the same skill file; the release gate is one sandbox run, not a field sprint. See Risks & Dependencies.
- **Metrics:** in the release sandbox run every item has an evidence file or is listed "built, not proven"; a proof that fails blocks its merge and sends the item back; Done is never written without evidence.

## Sprint Goal

Make proof decide Done: every item declares a proof tier, a script records each proof as evidence, an item becomes Done only when evidence for its tier exists, and close and the report show the tier promised and the evidence produced, or "built, not proven at tier X".

## 1. Consolidated Deliverables

<!-- cleargate:ignore-ids -->The Proof column applies INITIATIVE-002 rule 1 by hand, as in SPRINT-45 and SPRINT-46: the recorder this sprint builds is not live until Gate 4.<!-- /cleargate:ignore-ids --> Lanes are computed by `assign_lane.mjs` at kickoff; the values below are its output on the drafts.

| Story ID | Title | Lane | Milestone | Parallel? | Bounce Exposure | Proof (tier — check) |
|---|---|---|---|---|---|---|
| `STORY-065-01` | Items declare a proof tier <!-- cleargate:ignore-ids -->(absorbs CR-128)<!-- /cleargate:ignore-ids --> | runtime | SDR | y | med | Unit + integration — `proof-declared` reds; preflight on a fixture sprint; before/after gate sweep over `pending-sync/` unchanged |
| `STORY-065-02` | Record evidence for a proof | runtime | SDR | y | med | Unit + integration + clean-room — recorder reds on a temp repo; init/upgrade reds; `cleargate init` from the packed tarball shows the `proof` block |
| `STORY-065-03` | Done waits for evidence | standard | SDR | after 02's contract | low | Unit + integration — Done-guard reds; `merge_story.mjs` on a temp repo: pass → Done, pending → Sprint Review |
| `STORY-065-04` | Prove stage in the build loop | standard | SDR | after 02's contract | med | Unit + docs pins — `stagesFor` per lane; verdicts on the runner and serial paths; skill-text pins |
| `STORY-065-05` | Holdout scenarios and property tests | standard | SDR | y | med | Unit + integration — view and count reds; `seal_red.mjs --amendment` on real git |
| `STORY-065-06` | Close and report show proof <!-- cleargate:ignore-ids -->(absorbs CR-129)<!-- /cleargate:ignore-ids --> | standard | SDR | after 02's contract | med | Unit + integration — a fixture sprint closed end to end with one unproven item; Step 2.5 on the new report template |

## 2. Execution Strategy
*(Written by the Architect during the Sprint Design Review, architect-reader ×6 → architect-synth, 2026-11-16. `plans/waves.json` schema_version 2; `launchable: false` until Gate 2 confirms the layout; `refused_if_gate_2_declines` carries the six BUG-046 strings.)*

### 2.1 Phase Plan

**Shape.** Contract-first build-then-integrate DAG. All six items build at once, each in its own worktree cut from its `base`; only `upstream` orders integration, and merges are serial. One contract, one real collision. No item is fail-safe-serialized: every item declares `parallel_eligible: y`, none writes to a database, none has an empty surface.

| Item | Lane | Base | Upstream | Layer |
|---|---|---|---|---|
| STORY-065-01 | runtime | cli `main` | — | 0 |
| STORY-065-02 | runtime | `contract/S-47-evidence` (owner) | — | 0 |
| STORY-065-05 | standard | cli `main` | — | 0 |
| STORY-065-03 | standard | `contract/S-47-evidence` | 02 (C1) | 1 |
| STORY-065-04 | runtime (raised) | `contract/S-47-evidence` | 02 (C1); 01 (generated `.agents` SKILL.md) | 1 |
| STORY-065-06 | standard | `contract/S-47-evidence` | 02 (C1); 04 and 01 (generated `.agents` SKILL.md) | 2 |

- GOAL_RELATION wave1 (01, 02, 05): advances — the declared tier, the recorder, holdouts (Goal check c).
- GOAL_RELATION wave2 (03, 04): advances — Done waits for evidence; the prove step.
- GOAL_RELATION wave3 (06): advances — close and the report show proof and the verdict.
- Critical path: 02 → 04 → 06. Equal or shorter: 01 → 04 → 06, 02 → 03.

**Contract C1: `contract/S-47-evidence`** (cli, base `main`, owner STORY-065-02; consumers 03, 04, 06). A Developer dispatch (C0) creates it after Gate 2 and sprint init, before any build, in a throwaway worktree `OUTER/.worktrees/S47-C0/cleargate-cli`, as one commit `chore(EPIC-065): contract C1 skeleton (STORY-065-02 lib/proof + record_evidence)` adding two new files inside 02's surface.

- **`scaffold/core/.cleargate/scripts/lib/proof.mjs`** — full logic (small and pure; two functions are verbatim moves). Exports:
  - `PROOF_TIERS`, frozen, `['unit','container','live','human']`
  - `isProofTier(x): boolean`
  - `parseProofCommand(content): string|null` — verbatim from `prep_qa_context.mjs:545-567`; a `{…}` placeholder line returns null
  - `readProofTier(content): string|null` — the raw frontmatter value, not validated, so the guard fails closed on a bad value
  - `findItemFile(repoRoot, id): string|null` — verbatim from `init_sprint.mjs:117-130`
  - `evidencePath(sprintDir, id)`
  - `readEvidence(sprintDir, id): Evidence|null` — null when missing, unreadable or malformed; never throws
  - `proofStatus(evidence, tier) → {ok, reason: missing|pending|fail|tier|null, recorded_tier}`, checked in that order
- **Evidence file** `<sprintDir>/evidence/<ID>.json`, written atomically and only by the recorder. Keys (always present): `schema_version: 1`, `id`, `tier`, `status: pass|fail|pending`, `mode: command|human|pending`, `command|null`, `note|null`, `exit_code|null`, `timed_out`, `excused: 'baseline'|null`, `excused_failing: string[]`, `tail` (≤ 40 lines, secrets masked), `sha|null`, `recorded_at`, `recorded_by: 'record_evidence.mjs'`, `duration_ms`. 02 may add keys, never remove or retype one.
- **`record_evidence.mjs`** CLI: `<ID> [--tier T] [--worktree W] [-- cmd…]` or `<ID> --human "<note>"`. Exit 0 pass or pending, exit 1 proof failed (both write the file and print it as one JSON line); exit 2 could not run (nothing written, empty stdout, one stderr line `record_evidence: <reason>`). Reads `CLEARGATE_PROOF_TIMEOUT_S` and `CLEARGATE_SPRINT_DIR`; entry-point guard. **In C1 it is a stub that always exits 2** ("contract C1 stub") — fail safe: the barrier halts instead of merging.
- **What 02 may change:** it owns both files; it never renames, retypes or makes async a frozen export, and never changes an exit code or the `proofStatus` order. Its QA-Red finds the `lib/proof.mjs` tests already passing at the C1 base, by design.

**Pinned interfaces** (no branch; full text in `waves.json`):
- **P1 — `## Proof` format** (owner 01; readers 02's parser and 01's predicate): heading exactly `## Proof`; the command is the first line of the first fenced block under it; a `{…}` placeholder counts as empty.
- **P2 — holdout rule** (owner 05, mirrored in 01's TypeScript predicate): only the single tag line directly above `Scenario:` / `Scenario Outline:`, only inside gherkin fences.
- **P3 — `prove` stage** (owner 04): `{kind: 'barrier-script', when: 'always', script: 'record_evidence.mjs'}`, directly before `merge` in every lane.
- **P4 — Done choice at merge** (owner 03): pass → Done; a declared tier without passing evidence → Sprint Review; no declared tier → Done. The merge result gains `state` and `evidence`.
- **P5 — Sprint Review at the walkthrough and close** (owners 04 §D, 06): items without a tier are not guarded; a legacy `deferred_verification` with no green result keeps CR-082's output for one release.

**Layout and stage route** (Gate 2 decisions 1 and 2). Every path is inside the nested `cleargate-cli` repo.
- **Worktrees:** a detached outer host `OUTER/.worktrees/<ID>` plus a cli worktree `OUTER/.worktrees/<ID>/cleargate-cli` on `story/<ID>` from its base; the orchestrator sets them up one at a time (symlink `node_modules` and `/.claude`, then `npm run prebuild`).
- **Stages:** each lane's stages from the live 0.31.2 `stagesFor`, dispatched by hand (the shipped runner cannot address a nested repo).
  - **story-plan** (runtime only): the Architect writes `plans/<ID>.md`.
  - **qa-red** ends with the live seal against the cli worktree: `seal_red.mjs <ID> --worktree OUTER/.worktrees/<ID>/cleargate-cli --sprint-branch <base>` (verified: its git steps run in the cli repo, its records land in OUTER's sprint dir, the scan records typecheck as N/A, so build lanes run `npm run typecheck` themselves).
  - **architect-tpv**, and **architect-review** on the standard lane, run only when the seal flags (exit 2 included); runtime items always get architect-review.
  - **qa-verify** runs the live `prep_qa_context.mjs` and the item's Proof column check.
- **Merge:** one DevOps dispatch at a time into cli `main` with `--no-ff`, local only. `merge_story.mjs` cannot be used (one repo root, a fixed `sprint/S-47` branch, the sprint dir from the same checkout); this route is recorded in §6 as the layout's edge case.
- **After the merge:** the full suite in a throwaway worktree at `main`'s tip; no dist rebuild on cli `main`. Teardown: cli worktree first, then the outer host.
- **Proof (rule 1):** the orchestrator writes the QA-Verify PROOF result to `evidence/<ID>-proof.md`, then runs live `update_state.mjs <ID> Done`.
- **Kickoff baseline:** recorded at 99cbfd7 in `evidence/baseline-failures-99cbfd7.txt`.

**Lanes:** 5 build lanes, 1 merge lane. C0 first; at kickoff 02, 01, 04, 06, 05; 03 takes the next free lane.

### 2.2 Merge Ordering (Shared-File Surface Analysis)

Default merge order **02, 01, 05, 04, 03, 06**, taken as items pass QA-Verify, subject to `upstream`. Ties: layer 0 02 then 01; layer 1 04 before 03.

| Shared File | Stories Touching It | Merge Order | Rationale |
|---|---|---|---|
| `scaffold/core/.agents/skills/sprint-execution/SKILL.md` (generated) | 01, 04, 06 | 01 → 04 → 06 | **Real collision (single-writer generated file).** Rendered from the Claude SKILL by `renderCodexSprintExecution` (`build-codex-payload.mjs:334,417`); each story regenerates it in its own commit and again at integration; never hand-merged. |
| `scaffold/hosts/claude/.claude/skills/sprint-execution/SKILL.md` | 01 (§A.5 :227-245), 04 (§5 table :254-258, §C.0.1 :272-287, new `stage \`prove\`` note, §C.7 :492-511, §D :599-617), 06 (§E.2 :684-713) | 01 → 04 → 06 | Sections do not overlap; follows the generated file's order; each later story re-applies its insertions. |
| `scaffold/core/.cleargate/scripts/wave_runner.js` | 05 (`promptFor` :50-55, qa-verify schema :32-40), 04 (verify-only, :98-115) | 05 any time | Regions do not overlap; 04 expects no change, and any it needs stays in :98-115. |
| `scaffold/core/.cleargate/scripts/wave_runner_args.mjs` | 05 (item args :160-176, `view_file`), 04 (verify-only) | 05 any time | Already skips non-agent stages (:47, :161, :176); 04 needs no edit. |
| `lib/proof.mjs`, `record_evidence.mjs` (new) | C1 → 02 | C1, then 02 | 02 replaces the stub; the skeleton is the shared ancestor of 03, 04 and 06, so no add/add conflict. |
| Agent `.toml` files (generated) | `devops.toml` 03; `qa.toml`, `developer.toml` 05; `reporter.toml` 06 | — | One editor each. |

### 2.3 Shared-Surface Warnings

- **01/04/06, SKILL rendering.** Keep the six renderer anchor lines verbatim, including the A3 line `**Serial barrier merge.** …` that `codex-sprint-execution-render.red` Test 32 quotes exactly. §C.0 (§C.0.1, §C.0.2) is Claude-only — Codex replaces it with R2 — so the tokens `C.0.1`, `launch_wave`, `RUN_ID` and `/workflows` may not appear outside it, or prebuild's `--check` fails. Codex's §C.7 gets R3 ("merges each GREEN story … as soon as that story passes"), so decision 7 changes R3 to name the prove step.
- **04, earlier sealed tests.** `test/scripts/segment-stages.red.node.test.ts:48-51` pins exact lane lists that will now include `prove`; edited in 04's QA-Red commit. `loop-spec-three-paths.red` T1 needs `prove` in the §5 paths table of both SKILL renderings and a `stage \`prove\`` note in §C.
- **03/04, Done at merge.** §C.7 says the script "marks the item `Done`"; 04 rewrites it to match P4, and 03's `devops.md` (exit-5 rule) states the same rule.
- **03, untiered items.** As written, R1 sends every item without evidence to Sprint Review. SPRINT-46's sealed merge tests use untiered fixtures that expect Done at seven points: `merge-story.red.integration` :167, :312; `merge-story-resume.red.integration` :156, :175, :192, :287; `merge-story-carry-state.red.integration` :130. Decision 5 makes R1 match R3.
- **06, close.** `close-sprint-fence.red` (:211, :225-226) pins CR-082's Step 2.9 failure text (decision 6b). Ack-pass writes stay after the ack check (:1533-1550). An item without a tier is not listed as unproven (decision 6a).
- **01/05, the holdout rule in two languages.** 01 implements it in TypeScript, 05 in `.mjs`; both test the same two tag shapes (P2), or a container item can pass the gate yet show no holdout to 05's view, or the reverse.
- **01/02, `## Proof` format.** 02's parser ignores a `{…}` placeholder (P1, decision 4); otherwise an unedited template block would run as a bash command.
- **01/02, `init_sprint.mjs`.** 01 places `- **Tier:**` after the Goal Acceptance Check placeholder; `init_sprint.mjs:48-49` mirrors that placeholder and reads the section's first non-empty line (:413), so the file stays 02's (its `findItemFile` region only).
- **02/03/06, one evidence rule.** 03 and 06 import `readEvidence`, `proofStatus` and `readProofTier` from `lib/proof.mjs` and never parse evidence themselves. `seal_red.mjs` keeps its own `findItemFile` (05's file); removing that duplicate is not in the roster.
- **Live loop.** The sprint edits `merge_story.mjs`, `update_state.mjs`, `close_sprint.mjs`, `seal_red.mjs` and `segment_stages.mjs`, which its own loop runs: canonical only (rule 5). The sprint does not use `merge_story.mjs`; the live seal and `update_state.mjs` stay 0.31.2 until Gate 4.
- **Known reds in the merge lane** (recorded in §6 as they start; never hand-ported): `canonical-live-parity` 5a (templates) from the first of the 01/06 merges; 5b (knowledge) from the first of 01/03; 5c (agents) from the first of 03/05/06; `qa-content` slice parity from the 05 merge; doctor drift lines from the first merge. Scenarios 1–3 and 5d stay green.

### 2.4 Lane Audit

| Story | Lane | Signals | Raised by Architect (reason ≤80 chars) |
|---|---|---|---|
| `STORY-065-01` | runtime | subsystems 2 (scaffold, src); scenarios 6 | — |
| `STORY-065-02` | runtime | subsystems 2 (scaffold, src); scenarios 5 | — |
| `STORY-065-03` | standard | scenarios 6 | — |
| `STORY-065-04` | runtime | scenarios 5 (computed standard) | stage table all lanes read; amends earlier sealed pins and Codex R3 |
| `STORY-065-05` | standard | scenarios 5 | — |
| `STORY-065-06` | standard | scenarios 5 | — |

No item declares `proof_tier` (drafted before the predicate exists). After init the raise is applied with `update_state.mjs STORY-065-04 --lane runtime` (flashcard 2026-11-15 #lanes #sdr).

### 2.5 ADR-Conflict Flags

- **OD-4 reversed (065-06):** the goal verdict is recorded in the report frontmatter; deliberate, owner-approved (EPIC-065 §6, CR-129 absorbed). SKILL §E.2 and `reporter.md`/`.toml` change together.
- **Merge route (layout):** the SKILL says `merge_story.mjs` is the one route; this sprint merges by DevOps dispatch because the script cannot reach cli `main`. Same precedent as SPRINT-46; recorded in §6.
- **EPIC-054 lock (no new state or work unit):** respected — Sprint Review exists; `evidence/`, `unproven.json`, `carry_over`, `proof_pending` live in sprint artifacts or item frontmatter, not `state.json`.
- **EPIC-055 / CR-124 (serial merges):** respected — the prove step runs at the serial barrier.
- **Generated Codex files are never hand-edited** (flashcard 2026-09-27 #codex #gen-codex): respected — 04's Codex change goes into the R3 generator text.
- **BUG-075:** 03 guards only the edge into Done. **CR-082:** `deferred-verify/` read for one more release (06). **`CLEARGATE_ADVISORY`** does not bypass the Done guard (owner decision on 065-03), consistent with "advisory softens gate strength only".
- **node:test only, real infrastructure:** every new test is `*.node.test.ts`; the container-tier sandbox proof uses a real Postgres 18 container on OrbStack.

### Wave Assignment

| Wave | Stories | Parallel? | Rationale |
|------|---------|-----------|-----------|
| wave1 | STORY-065-01, STORY-065-02, STORY-065-05 | Yes | Integration layer 0: no upstream, no real collision. 02 builds from C1, which it owns. Merge 02, then 01. |
| wave2 | STORY-065-03, STORY-065-04 | Yes | Integration layer 1. 03 upstream 02 (builds now from C1). 04 upstream 02 (C1) and 01 (real collision: the generated `.agents` SKILL.md). No shared path between 03 and 04; on a tie, merge 04 first. |
| wave3 | STORY-065-06 | No | Integration layer 2. Upstream 04 and 01 (real collision: the generated `.agents` SKILL.md) and 02 (C1). Merges last. |

### Gate 2 decisions (resolved 2026-11-16: owner approved all eleven as recommended, "go"; full text in `waves.json` `open_decisions_for_gate_2`)

1. Use nested cli worktrees for SPRINT-47.
2. Run the stages by hand on the live 0.31.2 scripts; merge by DevOps into cli `main`.
3. Approve C1 as written (it adds four exports to 02 and names the `excused_failing` key).
4. Add the `{…}` placeholder rule to `parseProofCommand` (STORY-065-02).
5. STORY-065-03: an item with no proof tier goes to Done at merge (R1 matches R3).
6. STORY-065-06: items with no tier are not counted as unproven, and the legacy deferred-verify failure output is kept.
7. Widen STORY-065-04's surface to `segment-stages.red` and the Codex R3 text in `build-codex-payload.mjs`.
8. Raise STORY-065-04 to runtime.
9. Edits to earlier-sprint sealed red tests go in each item's QA-Red commit.
10. Accept the known reds, no dist rebuild on cli `main` during the sprint, and the kickoff baseline at 99cbfd7.
11. Run 5 build lanes and 1 merge lane in the kickoff order above.

## Risks & Dependencies

| Risk | Mitigation |
|---|---|
| The sprint changes `merge_story.mjs`, `update_state.mjs` and `close_sprint.mjs`, which its own merges and close run | Canonical only; the live loop is unchanged until Gate 4 (rule 5), so the sprint merges and closes on 0.31.2. |
| SKILL.md (both hosts) is edited by 065-01 (§A.5), 065-04 (§C.0.1, §C.7, §D) and 065-06 (§E.2) | Different sections; the SDR orders the merges and the later stories re-sync before merging. |
| 065-03, 065-04 and 065-06 read the evidence file 065-02 writes | Contract-first: the schema and `lib/proof.mjs` exports are frozen on a contract branch at kickoff, so the three build in parallel against it. |
| The release gate is one sandbox run, not a field sprint, and the release ships before dispenser_adapter uses it | Same as 0.31.0: dispenser_adapter's next sprint is ordinary field use and its defects ship as patches. The sandbox run covers each tier the sandbox can reach. |
| A container proof in the sandbox needs Docker | OrbStack is available here; the run-7 setup script gains a Postgres 18 container for the container item. |
| Nested-cli layout: every path is inside `cleargate-cli` | Same as SPRINT-46: stories build in nested cli worktrees and merge locally into cli `main`. |

## Metrics & Metadata
- **Expected Impact:** every item proven at a stated tier or shown as not proven; a failed proof caught before merge rather than at the walkthrough; Done never written without evidence.
- **Priority Alignment:** INITIATIVE-002 WS-1, the owner's first-ranked workstream; EPIC-065 was approved with all eight recommendations on 2026-11-16 ("happy with recommendations"). The north-star metrics in EPIC-065 §1 are measured over the next three sprints here and in dispenser_adapter.

## Prior work

- [[EPIC-065]] — the epic this sprint decomposes; [[INITIATIVE-002]] its parent.
- [[SPRINT-46]] — built the loop this sprint extends (stage table, sealed reds, merge by script, kickoff baseline) and logged the intake items folded in here.
- [[EPIC-066]] — that loop's epic; EPIC-065 §6 Q10 puts the prove step in its stage table.
- [[CR-128]], [[CR-129]] — absorbed; archived at Gate 4.
- [[CR-082]] — deferred verification, generalised by the evidence file.

---

## Execution Guidelines (Local Annotation — Not Pushed)

- **Starting Point:** STORY-065-02's contract (evidence schema, `lib/proof.mjs`), then every story in parallel against it.
- **Relevant Context:** EPIC-065 (pending-sync), `cleargate-cli/scaffold/core/.cleargate/scripts/`, `cleargate-cli/scaffold/hosts/{claude,codex}/`, `cleargate-cli/scaffold/core/.agents/skills/sprint-execution/`, `.cleargate/sprint-runs/SPRINT-46/intake.md`.
- **Constraints:** canonical edits only; local merges only; no push or publish during the sprint.

**Before kickoff:**
1. Owner approves the six stories, their open questions and this plan (Gate 1).
2. Sprint Design Review writes §2 and `waves.json`; owner confirms it and the Goal Acceptance Check (Gate 2). Preflight (Gate 3).

**Hand-applied rules from INITIATIVE-002** (copied into `sprint-context.md` Cross-Cutting Rules at kickoff):

1. **Proof per item.** Each item is Done only when the evidence named in its Proof column exists, recorded in its QA-Verify report or in `sprint-runs/SPRINT-47/evidence/`.
2. **Fixed roster.** The six items above are the roster. Anything found mid-sprint goes to `sprint-runs/SPRINT-47/intake.md` and enters only with the owner's recorded OK in §6.
3. **Lanes by risk.** Lanes are `assign_lane.mjs`'s; the Architect may only raise one.
4. **Recount at close.** The orchestrator records a hand recount of rework from git and dispatch metadata beside `sprint_metrics.mjs` in the close Brief.
5. **Loop unchanged under the sprint.** No edit to live `/.claude/**` or live `.cleargate/{scripts,knowledge,templates}` until Gate 4. This matters more than usual: the sprint changes the merge, the Done transition and close, which its own loop runs.

**At Gate 4:**
1. Re-sync the live copy here from cli `main` after the close.
2. Release `cleargate` 0.32.0 (new features, so a minor bump): CHANGELOG, `release(cleargate): v0.32.0 — <summary>`, tag, push cli `main` and the tag, `npm publish`, GitHub release with the registry tarball (checked against the publish shasum).
3. Archive CR-128 and CR-129 as absorbed (`superseded_by`), push the meta-repo `main`.

**Goal Acceptance Check** (proposed; confirmed at Gate 2; the sandbox run as the release gate approved 2026-11-16, decision 8) — Tier: live:
- (a) cli `npm test` has 0 failures at the final cli `main`, and `npm run test:integration` fails only on tests in the kickoff baseline list.
- (b) Clean-room: the packed release candidate installed into a temp Go repo whose `Makefile` has an `e2e:` target seeds `proof.unit` `go test ./...` and `proof.container` `make e2e`; `cleargate new story` shows `proof_tier` and `## Proof`; `cleargate gate check` names `proof-declared` on the unedited story.
- (c) Sandbox end-to-end run on the release candidate (plain layout, as SPRINT-46 run 7), a throwaway Go repo with four items: one `unit`; one `container` against a Postgres 18 container with one `@holdout` scenario; one `human`; one `container` item whose first proof fails on purpose. Pass when: every item has `evidence/<ID>.json` or is listed "built, not proven"; the failed proof blocked that merge and the item went back to the Developer; the holdout was absent from the QA-Red and Developer prompts and its test landed in a `qa-red(<ID>): amendment` commit; the human item waited in Sprint Review until the walkthrough confirmation; the report has the proof table and `goal_verdict`; the run halted only at plan confirmation, the walkthrough and Gate 4.

**Considered, not in the roster** (SPRINT-46 intake; each is drafted only on the owner's word):
- A CR redefining the sprint token split (CR-035) from measured totals; it edits `prep_reporter_context.mjs` and `reporter.md`, as STORY-065-06 does.
- `update_state.mjs --reopen` for an escalated item (the skill's re-run of an escalated item fails today).
- `.script-incidents/` files tracked in target repos (the generated root ignore omits them).
- Close leaving `main` with modified wiki pages, so the next preflight fails until a hand commit (BUG-086, S32).
- Cheaper field tests: a loop replay harness, one-story sandboxes, the full run once per release (the owner's question of 2026-11-15); an epic of its own.
- A size cap on the Reporter bundle (about 614KB against a 160KB target).

## 4. Decomposition Status

- [x] All work items have their type's required sections.
- [x] No epic without child stories — EPIC-065 has STORY-065-01..06.
- [x] All work items 🟢 — owner approved STORY-065-01..06 and their open questions as recommended (2026-11-16).
- [x] Gate 2 SDR §2 Execution Strategy written by Architect (2026-11-16; `plans/waves.json` schema_version 2).

## 5. Gate Checklist

- [x] **Gate 1** — EPIC-065 and the six roster items approved (owner, 2026-11-16: "approve as recommended").
- [x] **Gate 2** (Sprint Ready) — SDR §2, decisions 1–11 and the Goal Acceptance Check confirmed (owner, 2026-11-16: "go").
- [x] **Gate 3** (preflight) — `cleargate sprint preflight SPRINT-47` all pass, devops reachable (2026-11-16).
- [ ] **Gate 4** (close) — after all items merge and the walkthrough.

## 6. Execution Log

- 2026-11-16 · Planned. EPIC-065 §6 answered as recommended by the owner ("happy with recommendations"); surfaces re-mapped at cli 99cbfd7; six stories drafted, every story gate passes.
- 2026-11-16 · Gate 1. Owner approved the six stories, their seven open questions, the sandbox release gate and no extra roster items ("approve as recommended").
- 2026-11-16 · Gate 3 checks run early: `cleargate sprint preflight SPRINT-47` all pass (test gate `npm --prefix cleargate-cli test` exit 0); devops reachable; a stale `.pending-task` sentinel from a finished subagent was removed before the clean-main check. `sprint/S-47` cut from main.
- 2026-11-16 · SDR written (architect-reader ×6, architect-synth): one contract (C1 `contract/S-47-evidence`), three integration layers, 065-04 raised to runtime; 11 decisions for Gate 2.
- 2026-11-16 · Gate 2. Owner approved §2, decisions 1–11 and the Goal Acceptance Check ("go"). Spec clarifications applied: STORY-065-02 R6, STORY-065-03 R1a, STORY-065-04 R4a (+ surface), STORY-065-06 R1a. Goal Acceptance Check and Cross-Cutting Rules 1–21 written to `sprint-context.md`; status Active.
- 2026-11-16 · C0 · contract C1 `contract/S-47-evidence` 37efc13 (`lib/proof.mjs` full, `record_evidence.mjs` stub exit 2; stub stderr wording is the shorter dispatch text, accepted). Worktrees up: 01, 05 (base main), 02, 04, 06 (base C1). Integration baseline at 99cbfd7 running in `.worktrees/S47-BASE`. Dispatched: story plans 01, 02, 04; QA-Red 05, 06. 03 waits for a free build lane (5-lane cap).
- 2026-11-16 · 05: seal clean (9 tests / 5 scenarios, f744333) → Developer 08dfd17 → QA-Verify. 06: seal clean (10 / 5, d714e3f) → Developer f8afa56; QA-Verify waits for integration (upstream 01, 04; rule 16). 03: worktree from C1, QA-Red. 04 plan written (116 lines); CR:spec-clarification on 02 R1 (live/human with `--worktree` → pending) and three plan decisions accepted (sprint-context amendments). Known red to add when 01 merges: `sprint-execution-mirror.integration` (live vs canonical SKILL).
- 2026-11-16 · 05 QA-Verify PASS (5/5 scenarios, 77/77 ×3, no defects) → merged cli main 61317b3 by the orchestrator (`git merge --no-ff`; the merge script cannot reach the nested repo, Gate 2 decision 2). Known reds from this merge (rule 19): `canonical-live-parity` 5c, `qa-content` slice parity. Post-merge suite queued behind the integration baseline (one full suite at a time). 01 and 02 plans written and accepted (sprint-context amendments). 01 QA-Red dispatched.
- 2026-11-16 · baseline · cli 99cbfd7 in a throwaway outer host with dist built: `npm run test:integration` 951 tests, 845 pass, 64 fail (`evidence/baseline-failures-99cbfd7.txt`, 145 ✖ lines incl. suite headers); unit suite 0 failing (preflight probe). 03 seal clean (9915f3c) → Developer; 04 seal clean (ec39600; also edits `segment-stages.red`, `codex-sprint-execution-render.red:54`) → Developer; 01 seal clean (834fac6, 12 tests / 6 scenarios) → Developer. Post-merge suite for 05 running at cli main 61317b3.
- 2026-11-16 · 01 Developer 475b7c6 (396 tests; R6 sweep 0 of 132 changed; cut-over 2026-11-16T09:50:00Z) → integrated cli main (05) as 39e3c0e, codex check and typecheck clean → QA-Verify. 04 Developer blocked Red-Test: three sealed tests wrong (prove-stage Sc2 validates a runner verdict in wave mode; loop-spec T8b Fast row lacks `prove`; agent-environment-rule U2 takes the first `| 2 |` row of the whole SKILL, now §C.6.5) → qa-bounce (defect_in red-test), Developer edits left uncommitted and unstaged in the worktree, QA-Red re-seal.
- 2026-11-16 · 02 Developer 0669ac3 (clean-room: packed tarball into a temp Go repo seeds proof unit `go test ./...`, container `make e2e`) → integrated main as 7ab6022 → QA-Verify. 03 Developer b94ef3f → waits for 02 to merge (upstream, rule 16). 03's Done-reader survey found `wave_runner_args.mjs:144` would relaunch Sprint Review items → CR:spec-clarification R2a on 04, test added to 04's re-seal.
- 2026-11-16 · 02 QA-Verify PASS → Architect post-flight FAIL (code: prototype-unsafe key merge in `detect-test-stack.ts`; plan-level: process-group handling in `record_evidence.mjs`) → arch-bounce 1, QA-Red amendment tests (by hand; amendment seal not live), then Developer. 01 QA-Verify PASS (6/6; 21 reds all baseline or live-vs-canonical parity) → Architect post-flight. 04 Developer rework c1eee86 (R2a) → waits for 01/02 to merge.
- 2026-11-16 · post-merge (05) · cli main 61317b3 unit suite 5676 tests, 0 fail (integration still running). 01: amendment reds 9e5b7c5 → fix afc88a7 → re-verify PASS → post-flight PASS → merged cli main d669c7d (ahead of 02, no upstream), Done; Task Breakdown rows ticked for 01 and 05 (rule 20). Known reds from this merge (rule 19 + 01 plan): `canonical-live-parity` 5a/5b, `template-stubs.integration`, `gate-section-index-pinning.live.integration` S1c, template live-vs-mirror/preamble parity, CR-024 S2 Sc6, CR-032 template pairs, `sprint-execution-mirror.integration`.
- 2026-11-16 · post-merge (05) integration at 61317b3: 913 run, 848 pass, 65 fail; vs the 99cbfd7 list the only new failures are `CR-024 S2 Scenario 6` (mirror parity) and the qa-content slice parity — both live-vs-canonical, rule 19. 02: re-verify PASS → post-flight PASS with a contract finding → C1 amendment (orchestrator): `readProofTier` skips a leading `<instructions>` block (else a tiered item drafted by `cleargate new` reads untiered and 03 would let it reach Done unproven) → red 213ad3c → fix b159b5c, verified by the orchestrator (22 tests, 0 fail) → merged cli main 3dfd3eb, Done. 03 and 04 integrated main cleanly (d4dc3da, 6bcf9ff; gen:codex no diff) → QA-Verify. Post-merge suite for 01+02 running at 3dfd3eb. 06 waits for 04.
- 2026-11-16 · 03 QA-Verify PASS (6/6; seal clean, standard lane → no architect-review) → merged cli main (no shared path with 04, so not held for the 04-first tie rule), Done. 04 QA-Verify PASS (6/6 on 6bcf9ff) → Architect post-flight.
- 2026-11-16 · 04 post-flight FAIL (skill wording, arch-bounce 1): untiered items halted at the prove barrier; exit-1 rework skipped post-flight on the serial path → CR:spec-clarification R3a (applies Gate 2 decision 5) → amendment pins (by hand) → fix 140faa7 (+ unbackticked `prove` in serial step 3, accepted) → re-integrated main (03) as c5fa1a1: prebuild/gen:codex/typecheck clean, 7 test files green → Architect re-check.
- 2026-11-16 · 04 post-flight re-check PASS → merged cli main, Done. 06 integration next (upstream 01, 02, 04 all merged).
- 2026-11-16 · 06 QA-Verify PASS on 927c793 (5/5; fixture sprint closed end to end with one unproven item; Step 2.5 met/mostly/absent; seal clean, standard lane → no architect-review) → merged cli main, Done. All six items Done. Post-merge unit suite at 3dfd3eb (01+02): 5717 tests, 0 fail. Next: full suite at the final cli main, then the Goal Acceptance Check (a) suite, (b) clean-room, (c) sandbox run on the RC.
- 2026-11-16 · Goal check (b) MET: RC 0.32.0-rc.1 (cli b4702a5) packed and installed into a temp Go repo with a `Makefile` `e2e:` target → `proof` = unit `go test ./...`, container `make e2e`; `cleargate new story` shows `proof_tier`, `## Proof` and the holdout guidance; `gate check` names `proof-declared` ("proof_tier is missing") on the unedited story (`evidence/sandbox/0.32.0-rc.1/cleanroom-*`). Goal check (a) suite running at b4702a5. Goal check (c) sandbox session started (`field-trials/2026-11-sandbox-s47.md`).
- 2026-11-16 · Goal check (a) at cli main b4702a5 (throwaway outer host, dist built): unit 5739 tests, 0 fail; integration 959 run, 830 pass, 87 fail. Against the 99cbfd7 list (`evidence/final-failures-b4702a5.txt`) every new ✖ line (33) is a live-vs-canonical parity check (templates, knowledge, protocol, close_sprint, skill and sprint_report mirrors), which rule 11/19 expects until the Gate 4 re-sync; none is a canonical regression. Re-verify the integration half after the re-sync, before publish. The suite again moved EPIC-058/061 to archive inside the throwaway host (flashcard 2026-11-15); cleaned there, the real tree is untouched.
