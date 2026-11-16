---
sprint_id: "SPRINT-47"
created_at: "2026-11-16T08:43:32.902Z"
last_updated: "2026-11-16T08:43:32.902Z"
---

# Sprint Context

Per-sprint audit artefact. Populated at sprint init (M1 planning) and re-touched after each story merges. Referenced from every Developer/QA/Architect task brief so all agents start from the same baseline.

## Sprint Goal

Make proof decide Done: every item declares a proof tier, a script records each proof as evidence, an item becomes Done only when evidence for its tier exists, and close and the report show the tier promised and the evidence produced, or "built, not proven at tier X".

## Goal Acceptance Check

Confirmed by the owner at Gate 2 (2026-11-16, "go"). Tier: live. Run before Gate 4:
- (a) cli `npm test` has 0 failures at the final cli `main`, and `npm run test:integration` fails only on tests in the kickoff list `evidence/baseline-failures-99cbfd7.txt`.
- (b) Clean-room: the packed release candidate installed into a temp Go repo whose `Makefile` has an `e2e:` target seeds `proof.unit` `go test ./...` and `proof.container` `make e2e`; `cleargate new story` shows `proof_tier` and `## Proof`; `cleargate gate check` names `proof-declared` on the unedited story.
- (c) Sandbox end-to-end run on the release candidate (plain layout, as SPRINT-46 run 7): a throwaway Go repo with four items — one `unit`; one `container` against a Postgres 18 container with one `@holdout` scenario; one `human`; one `container` item whose first proof fails on purpose. Pass when every item has `evidence/<ID>.json` or is listed "built, not proven"; the failed proof blocked that merge and the item went back to the Developer; the holdout was absent from the QA-Red and Developer prompts and its test landed in a `qa-red(<ID>): amendment` commit; the human item waited in Sprint Review until the walkthrough confirmation; the report has the proof table and `goal_verdict`; the run halted only at plan confirmation, the walkthrough and Gate 4.

## Locked Versions

| Package | Version |
|---------|---------|
| Node    | `>=24.0.0` |
| TypeScript | `^5.8.0` |
| cleargate (cli) | `0.31.2` at sprint start (cli `main` 99cbfd7, pushed). Release 0.32.0 at Gate 4 only, with the owner's go. |

No item adds a runtime dependency. Node built-ins only; shell scripts stay POSIX bash.

## Test Stack

| Field | Value |
|-------|-------|
| Backend runner    | Full suite: `npm test` in a cli tree (merge lane only). Single files: `npm run test:file -- <file>`. `npm test` skips `*.integration.node.test.ts`; run those by file. |
| Frontend runner   | none |
| Typecheck command | `npm run typecheck` (`tsc --noEmit`) in the cli worktree (the seal's scan records typecheck N/A in this layout, so build lanes run it themselves) |
| Red-test naming   | `*.red.node.test.ts` (integration-layer reds: `*.red.integration.node.test.ts`) |

Run full suites with a short private `TMPDIR`. Never run two full suites at once. A throwaway cli worktree has no `dist`: build it there (never in cli `main`) before dist-spawning tests. Full-suite integration needs an outer-host layout (flashcard 2026-11-15 #test-harness #worktree).

## Cross-Cutting Rules

From EPIC-065 `<architecture_rules>`:

1. Generalise what exists: the evidence file generalises CR-082's `deferred-verify/<ID>.json`; the goal tier extends CR-110's Goal Acceptance Check; "merged, awaiting proof" is the existing `Sprint Review` state.
2. Evidence is written only by `record_evidence.mjs`, never hand-authored by an agent. A command-tier proof is run by the script.
3. Stack-neutral: no step depends on `package.json` or Node in the target's own code; proof commands come from the item or `gate-checks.json`.
4. Scripts and templates change in `cleargate-cli/scaffold/core`; prompts and the skill change in `scaffold/hosts/claude` and their Codex counterparts in the same story. Generated files (`scaffold/core/.agents/skills/sprint-execution/*.md`, `scaffold/hosts/codex/.codex/agents/*.toml`) are regenerated with `npm run gen:codex`, never hand-edited or hand-merged.
5. No new `state.json` work unit and no new story state (EPIC-054 lock). Merges stay serial (EPIC-055, CR-124).
6. An init/upgrade change is not Done until a clean-room install shows it (EPIC-058 rule 1; STORY-065-02).

Hand-applied INITIATIVE-002 rules (sprint plan, Execution Guidelines):

7. **Proof per item.** An item is Done only when the evidence in its sprint-plan Proof column exists: the orchestrator records the QA-Verify proof result in `sprint-runs/SPRINT-47/evidence/<ID>-proof.md`, then runs live `update_state.mjs <ID> Done`.
8. **Fixed roster.** The six items are the roster. Anything found mid-sprint goes to `sprint-runs/SPRINT-47/intake.md` and enters only with the owner's recorded OK in sprint §6.
9. **Lanes by risk.** Lanes are `assign_lane.mjs`'s; 065-04 raised to runtime by the Architect (Gate 2 decision 8).
10. **Recount at close.** The orchestrator records a hand recount of rework from git and dispatch metadata beside `sprint_metrics.mjs` in the close Brief.
11. **Loop unchanged under the sprint.** No edit to live `/.claude/**` or live `.cleargate/{scripts,knowledge,templates}` until Gate 4. The sprint changes `merge_story.mjs`, `update_state.mjs`, `close_sprint.mjs`, `seal_red.mjs` and `segment_stages.mjs`, which its own loop runs; the live copies stay 0.31.2. At Gate 4 (owner's go only): live re-sync from cli `main`, release 0.32.0 (push cli + tag, npm publish, GitHub release), archive CR-128/CR-129 as absorbed, push the meta-repo.

Execution (owner, Gate 2 2026-11-16, "go"; the nested-cli layout of SPRINT-44..46; plan of record `plans/waves.json`):

12. **Worktrees.** `OUTER` = `/Users/ssuladze/Documents/Dev/ClearGate`, `CLI` = `OUTER/cleargate-cli`. Each item has a detached outer host `OUTER/.worktrees/<ID>` (`git worktree add --detach … sprint/S-47`; no item has an outer change) and a nested cli worktree `OUTER/.worktrees/<ID>/cleargate-cli` (`git -C CLI worktree add <abs path> -b story/<ID> <base from waves.json>`). Setup, by the orchestrator, serially: `ln -s CLI/node_modules <cli wt>/node_modules`; `ln -s OUTER/.claude <outer host>/.claude`; `(cd <cli wt> && npm run prebuild)`. Never `npm install`/`npm ci` in a worktree. **No agent edits files in the cli main checkout.**
13. **Stages, by hand** (the shipped runner and `merge_story.mjs` address one repo). Per lane, from live 0.31.2 `stagesFor`: runtime = story-plan → qa-red → [architect-tpv if the seal flags] → developer → qa-verify → architect-review → merge; standard = qa-red → [architect-tpv if flagged] → developer → qa-verify → [architect-review if flagged] → merge. QA-Red's last step is the live seal against the cli worktree: `ORCHESTRATOR_PROJECT_DIR=OUTER bash OUTER/.cleargate/scripts/run_script.sh node OUTER/.cleargate/scripts/seal_red.mjs <ID> --worktree OUTER/.worktrees/<ID>/cleargate-cli --sprint-branch <base> -- <files>`. QA-Verify runs live `prep_qa_context.mjs <ID> OUTER/.worktrees/<ID>/cleargate-cli` first. Dispatch descriptions are `<stage> <ID>` (CR-120); briefs name the work-item id on line 1. Bounce cap 3.
14. **Concurrency.** At most 5 build lanes and 1 merge lane. Build lanes run typecheck plus targeted test files only.
15. **Contract C1 `contract/S-47-evidence`** (owner STORY-065-02, base cli `main`; consumers 03, 04, 06): `scaffold/core/.cleargate/scripts/lib/proof.mjs` — `PROOF_TIERS` (frozen `['unit','container','live','human']`), `isProofTier(x)`, `parseProofCommand(content): string|null` (a `{…}` placeholder line returns null), `readProofTier(content): string|null` (raw), `findItemFile(repoRoot, id): string|null`, `evidencePath(sprintDir, id)`, `readEvidence(sprintDir, id): Evidence|null` (never throws), `proofStatus(evidence, tier) → {ok, reason: missing|pending|fail|tier|null, recorded_tier}`; the evidence JSON shape and the `record_evidence.mjs` CLI and exit codes 0/1/2 (C1 stub always exits 2). Full text in `waves.json` `contracts`. Owners replace stub bodies; never rename, retype or make async a frozen export.
16. **Integration.** An item integrates only after every `upstream` item has merged into cli `main`: in its cli worktree `git merge --no-ff main`; the owner's region wins and the item re-applies its insertions; a conflict inside an existing or red test goes to QA-Red, never the Developer. Never hand-merge a generated file: `npm run gen:codex`, then prebuild (`build-codex-payload.mjs --check`). Then typecheck and the item's tests, then QA-Verify on the integrated tree. If `main` moves before the merge, integrate again.
17. **Sealed red tests from earlier sprints** are edited in the item's QA-Red commit, never the Developer's (Gate 2 decision 9): 065-04 `test/scripts/segment-stages.red.node.test.ts` (lane lists gain `prove`) and `loop-spec-three-paths.red` T1; any item touching the SKILL keeps the six renderer anchor lines verbatim (`codex-sprint-execution-render.red` Test 32). The cli repo has no git hooks: QA-Verify's diff review enforces each item's §3.1.
18. **Merge.** Default order 02, 01, 05, 04, 03, 06, as items pass QA-Verify, subject to `upstream`. DevOps merges `story/<ID>` into cli `main` with `--no-ff` (local only — no push, no publish). **No `dist` rebuild on cli `main`.** The post-merge full suite runs in a throwaway cli worktree at `main`'s tip (outer-host layout). Teardown: both `git status --porcelain` empty, remove the cli worktree first, then the outer host.
19. **Known reds.** Canonical-live parity breaks by design (rule 11): `canonical-live-parity` 5a (templates) from the first of the 01/06 merges; 5b (knowledge) from the first of 01/03; 5c (agents) from the first of 03/05/06; `qa-content` slice parity from the 05 merge; doctor drift lines and the SessionStart drift banner from the first merge. Scenarios 1–3 and 5d stay green. Pre-existing integration failures at cli 99cbfd7 are listed in `evidence/baseline-failures-99cbfd7.txt`. Each new known red is logged in sprint §6 when it starts. Never hand-port live.
20. **Detached hosts.** The Developer cannot tick Task Breakdown rows in the item file; the orchestrator ticks them at merge.
21. **Proof runs.** Run proofs with the canonical scripts by path from a cli tree, never the live copies. Fixture repos for proofs are temp git repos, never this sprint's own tree.

## Active FLASHCARD Tags

- `#worktree` — nested cli worktrees under detached outer hosts; `git -C <repo> worktree add` resolves relative paths against `<repo>`, pass absolute paths; never `git stash`.
- `#test-harness` — `npm test` skips integration files; full-suite integration needs the outer-host layout; reds spawning real git can flake under load; cr081/cr079 shell tests leave `scaffold/core/.cleargate/sprint-runs/` untracked.
- `#merge` — judge a post-merge suite by diffing failing names against the reference list; the integration suite in an outer host moves EPIC-058/061 to archive (clean it before the next merge).
- `#codex #gen-codex` — generated Codex files fail `prebuild --check` when stale; regenerate, never hand-edit.
- `#qa-red` — seal `scan_exit` 0 for an expected red: assert the raw `[FAIL] typecheck` line separately from flags.

## Adjacent Implementations (Reuse First)

| Story | Module / Export | Path |
|-------|----------------|------|
| (existing) | `parseProofCommand`, `buildCommands` (moving to `lib/proof.mjs` via C1) | `cleargate-cli/scaffold/core/.cleargate/scripts/prep_qa_context.mjs` |
| (existing) | `findItemFile`, `matchesId` | `cleargate-cli/scaffold/core/.cleargate/scripts/init_sprint.mjs`, `scripts/lib/work-item-id.mjs` |
| (existing) | `extractFailing`, `commandEnv`, `lastLine`, `testsRan` | `cleargate-cli/scaffold/core/.cleargate/scripts/record_baseline.mjs` |
| (existing) | `STAGE_NAMES`, `STAGE_DEFS`, `LANE_STAGES`, `stagesFor`, `laneOf` | `cleargate-cli/scaffold/core/.cleargate/scripts/segment_stages.mjs` |
| (existing) | `countScenarios`, R-volume | `cleargate-cli/scaffold/core/.cleargate/scripts/qa_red_lint.mjs` |
| (existing) | `renderCodexSprintExecution`, R2/R3 replacement texts | `cleargate-cli/scripts/build-codex-payload.mjs` |

## Mid-Sprint Amendments

- 2026-11-16 · Gate 2 · decisions 1–11 approved as recommended (owner: "go"). Spec clarifications applied to the items: STORY-065-02 (C1 exports; `{…}` placeholder rule, decision 4), STORY-065-03 (untiered item → Done at merge, decision 5), STORY-065-04 (surface widened to `segment-stages.red` and the Codex R3 text, decision 7), STORY-065-06 (untiered items not unproven; CR-082 failure output kept, decision 6).
- 2026-11-16 · STORY-065-02 · CR:spec-clarification (from the STORY-065-04 plan): with `--worktree`, `record_evidence.mjs` records `pending` for a `live` or `human` item and runs nothing; a live command runs only without `--worktree` (walkthrough). Exit codes and C1 exports unchanged.
- 2026-11-16 · STORY-065-04 · plan decisions accepted: the walkthrough starts when every item is Done, Sprint Review, Escalated or Parking Lot; on the serial path a recorder exit 2 records a BLOCKED `technical-impossibility` verdict with the recorder's reason and halts; the prove exit table lives in a new `### C.6.5 Prove — stage \`prove\`` section (loop-spec T4 pins §C.7's exit rows); QA-Red also edits `codex-sprint-execution-render.red:54` (the Codex merge text, decision 7/9).
- 2026-11-16 · STORY-065-02 · plan accepted; surface addition (as decision 7/9): QA-Red edits the earlier sealed `test/commands/gate-commands-kept.red.node.test.ts` (GATE_FIELDS gains `proof.unit`, `proof.container`). Clarification extended: a `human` item never runs a command; only `--human` records it, otherwise `pending`. Where the plan and the item's clarification differ, the item wins.
- 2026-11-16 · STORY-065-01 · plan accepted: `PROOF_DECLARED_CUTOVER` is a UTC timestamp later than every pending item's `created_at`; preflight R5 checks stories, CRs and bugs only; SKILL A.1 check-5 text (`SKILL.md:139`) also updated. Known reds from its merge: `template-stubs.integration` (live vs canonical templates) and `gate-section-index-pinning.live.integration` S1c.
- 2026-11-16 · STORY-065-04 · CR:spec-clarification R2a: `wave_runner_args.mjs:144` counts `Sprint Review` as merged (found by 03's Done-reader survey); test added in 04's re-seal.
- 2026-11-16 · STORY-065-03 · plan deviation accepted: `test/helpers/scaffold-roots.ts` `canonicalPath` maps `.codex/` to `scaffold/hosts/codex` (the sealed red read a non-existent `scaffold/core/.codex`).
- 2026-11-16 · STORY-065-02 · post-flight FAIL (arch-bounce 1): (1) `detect-test-stack.ts` `addMissingKeys`/`pruneToShape` use `in`, so a user `__proto__` key pollutes the process and `constructor`/`toString` user keys are dropped — use own-key checks and skip `__proto__`; (2) `record_evidence.mjs` waits out the timeout when a background child holds stdout and leaves orphans — kill the group when bash exits or the recorder is interrupted (plan "Post-flight A/B"). Spec-clarification added: mask `scheme://user:password@` credentials in the tail. Regression tests committed by hand as `qa-red(STORY-065-02): amendment` (the canonical `--amendment` seal is not live until Gate 4).
- 2026-11-16 · STORY-065-01 · post-flight FAIL (arch-bounce 1, code): `readiness-predicates.ts` `readProofSection` splits on `\n` (a CRLF item never matches a label) and label continuations run past a heading; fix: split on `/\r?\n/` (also `hasHoldoutScenario`), end a continuation at `/^#{1,6}\s/`. P2 contract note (contract_change_rule): 05's `scanGherkinScenarios` accepts more shapes than P2 (stacked tag lines, any `@`-led line, `Gherkin`/spaced fences); the 01 gate is the narrower reader, which fails safe (a gate-passing item is always withheld by 05) except a gherkin block nested in a markdown fence. Recorded; alignment of 05 to P2 goes to intake.
- 2026-11-16 · STORY-065-02 · post-flight fix 84d7f77; deviation accepted: URL-password masking also applies to the evidence `command` field (stdout carries it).
- 2026-11-16 · contract C1 amendment (orchestrator, contract_change_rule; goal-critical): `lib/proof.mjs` `readProofTier(content)` skips one leading `<instructions>…</instructions>` block before looking for the `---` frontmatter, as `frontmatter-locator.ts` (01's gate) does. Signature unchanged (sync, `string|null`). Reason: `cleargate new` leaves that block above the frontmatter; a line-1-only reader returns null for a tiered item, so 03's guard would let it reach Done without proof. Owner 02 (amendment red + fix before merge); 03, 04, 06 inherit it.
