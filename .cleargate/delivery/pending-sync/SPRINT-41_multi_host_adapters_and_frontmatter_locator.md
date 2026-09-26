---
sprint_id: SPRINT-41
parent_cleargate_id: null
sprint_cleargate_id: null
carry_over: false
lifecycle_init_mode: block
remote_id: null
source_tool: null
status: Active
approved: true
approved_by: sandrinio
approved_at: 2026-09-04T00:00:00Z
start_date: 2026-09-08
end_date: 2026-10-09
synced_at: null
created_at: 2026-09-04T00:00:00Z
updated_at: 2026-09-26T05:17:56Z
created_at_version: cleargate@0.26.1
updated_at_version: cb283bab-dirty
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-09-11T22:29:15Z
  transition: ready-for-execution
epics:
  - EPIC-058
proposals: []
context_source: "Direct owner request 2026-09-04: schedule EPIC-058 (multi-host adapters, amended same day with the clean-room verification requirement) and the frontmatter-locator defect into the next sprint. BUG-067 is carried as a standalone bug item, not as an EPIC-058 decomposition — it is a pre-existing v0.24.2 defect that EPIC-058's own clean-room requirement surfaced in the field on 2026-09-04."
stamp_error: no ledger rows for work_item_id SPRINT-41
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-09-26T13:58:17Z
  sessions: []
---

# SPRINT-41: Multi-Host Adapters & Frontmatter Locator

## 0. Stakeholder Brief

- **Sprint Goal:** Make the frontmatter locator position-independent so freshly scaffolded work items stop corrupting and start gating, and land the first slice of multi-host adapter support with Claude Code proven intact by clean-room verification.
- **Business Outcome:** ClearGate installs and runs under OpenAI Codex as well as Claude Code, from one shared planning core — and every install/upgrade change is from now on proven against a real fresh install rather than against this repo's hand-synced dogfood copy.
- **Risks (top 3):** Claude's intended blocking gates currently signal a non-blocking error; canonical/live hook drift prevents fixes reaching this instance; an alpha Codex loop may complete while enforcement never fires. M0 repairs and real negative controls are mandatory. The inspected active sentinel names SPRINT-41.
- **Metrics:** Fresh-install `cleargate new` → edit → gate cycle passes; clean-room Claude baseline reproduced for both no-flag and `--host all`; `cleargate init --host codex` produces a working Codex install; one real story completes the full Architect→QA-Red→Developer→QA-Verify loop under Codex, evidenced by `STORY-058-13`.

## Sprint Goal

Fix the position-dependent frontmatter locator across all three call sites, then land EPIC-058's foundation milestones — scaffold relocation, host registry, `--host` selectors — with the clean-room verification harness that proves Claude Code is unregressed.

## 1. Consolidated Deliverables

> Owner continuation on 2026-09-11T22:19:09Z approved the decision brief and the mid-sprint scope change under protocol §17. The deliverable set is **16 items: 13 stories and 3 bugs**. BUG-085, STORY-058-12, STORY-058-13, and BUG-089 are approved for append-only registration; the original 12 runtime records and their history must be preserved.
>
> Readiness checks are specification checks, not evidence that the harness works. The Architect's cross-milestone review and M0's live enforcement proofs remain pending. No re-initialization or direct state-cache editing is authorized.
>
> **Amendment 2026-09-24T21:53:44Z:** the owner directed [[CR-123]] (SPIDR scenario coverage, approved the same day) into this sprint, followed by a re-plan. The set is now **17 items: 13 stories, 3 bugs, 1 CR**. CR-123 was registered by one append-only genesis event (`sprint-runs/SPRINT-41/apply-approved-scope-2026-09-25.mjs`); the 16 existing records and the event prefix are unchanged.
>
> **Amendment 2026-09-26T09:30:00Z:** the owner asked for a cheap fresh-folder test, from init through a few epics and stories, with the direction "log every issue you find and fix them". The journey (`sprint-runs/SPRINT-41/reports/fresh-journey-smoke.md`) found one more trigger for [[BUG-090]]: the epic and story templates scaffold no `approved:` key. The orchestrator also found [[BUG-096]], the test-fixture temp-dir leak. Four output defects became [[BUG-097]]. FJ-6 is by-design (protocol §495). BUG-090 moves from known-fail to in-sprint fix. The set is now **20 items: 13 stories, 6 bugs, 1 CR**. The three bugs were registered by append-only genesis events (`sprint-runs/SPRINT-41/apply-approved-scope-2026-09-26.mjs`); the 17 existing records and the event prefix are unchanged. They run as a fix wave after STORY-058-10 → BD → RS-4a and before STORY-058-11.
>
> **Amendment 2026-09-26T10:45:00Z:** the fix-wave plan (`plans/M5-fixwave.md`) was accepted. FW-A1: BUG-090's phantom-fence case follows BUG-067's first-fence parity, so it now reads UNAPPROVED (fail closed). FW-A2 widens BUG-090 to cover hotfix.md, the close_sprint 2.6c sites, the doctor sniffs and the approveProbeStory flip. The Architect's census found [[BUG-098]]: the remaining positional readers, including a `sprint init --allow-drift` write-back that plants a phantom block. That is goal-critical ("stop corrupting"), so BUG-098 was registered by `apply-approved-scope-2026-09-26b.mjs`. The set is now **21 items: 13 stories, 7 bugs, 1 CR**. Wave order: wave14 (-10) → BD → RS-4a → fw1 BUG-096 → fw2 BUG-097 → fw3 BUG-090 → fw4 BUG-098 → wave15 (-11). `--known-fail sprint-init=BUG-090` is retired from -11 QA, RS-4, RS-5 and RS-CLOSE.
>
> **Amendment 2026-09-26T13:00:00Z (owner):** after reviewing the mediafi SPRINT-03 replan, the owner said: "that's how i want cleargate to be planning sprints" and "i want this delivered in the sprint. so the sprint also runs the same way from now on". [[CR-124]] (contract-first build-then-integrate sprint DAG, amending [[EPIC-055]]) is added as scope and registered by `apply-approved-scope-2026-09-26c.mjs`. The set is now **22 items: 13 stories, 7 bugs, 2 CRs**. The sprint's remaining work is being re-planned contract-first: real collisions only, contract branches, parallel builds in cli worktrees, integration in dependency order, and merges one at a time. R1 (serial single-checkout execution) is lifted as far as parallel builds need. The re-plan lives in `plans/replan-contract-first.md` and supersedes the wave order above once applied. STORY-058-11, STORY-058-12 and EPIC-055 are reset to 🔴 by CR-124 until amended.

| Story ID | Title | Lane | Milestone | Parallel? | Bounce Exposure |
|---|---|---|---|---|---|
| `BUG-067` | Frontmatter locator: find the fence, don't require offset 0 (3 call sites) | standard | M0 | n | med |
| `STORY-058-01` | Tracked `scaffold/core` + `scaffold/hosts/claude` payload layout | standard | M1 | n | high |
| `STORY-058-02` | Repoint scaffold-source validation + manifest builder; drop the sibling dependency | standard | M1 | n | med |
| `STORY-058-03` | `HostAdapter` contract, registry, behavior-preserving Claude adapter | standard | M2 | n | med |
| `STORY-058-04` | `cleargate init --host` selector parsing and profile expansion | standard | M2 | y | med |
| `STORY-058-05` | `cleargate host` list/add/remove lifecycle commands | standard | M3 | y | med |
| `STORY-058-06` | Install-manifest host ownership fields with legacy snapshot migration | standard | M3 | y | med |
| `STORY-058-07` | Per-host scoping of doctor, upgrade, uninstall, prune | standard | M3 | n | med |
| `BUG-085` | Live `/.claude/` re-sync, then durable meta-repo drift detection | standard | M3 | n | low |
| `STORY-058-08` | Clean-room verification procedure + `cleargate verify-install` driver | standard | M4 | y | low |
| `STORY-058-09` | Clean-room Claude regression baseline (no-flag and `--host all`) | standard | M4 | y | low |
| `STORY-058-10` | Codex payload surfaces: hooks.json, config.toml MCP, `AGENTS.md` injection | standard | M5 | y | med |
| `STORY-058-11` | Codex role/skill translation + harness-neutral repo-root shim | standard | M5 | y | med |
| `STORY-058-12` | Host dispatch-mode split: Task-based parallel dispatch (Claude) vs serial fallback (Codex) | standard | M6 | y | med |
| `STORY-058-13` | Codex end-to-end loop evidence: one real story through Architect→QA-Red→Developer→QA-Verify | standard | M6 | y | low |
| `BUG-089` | PreToolUse gates exit 1, which Claude Code does not treat as blocking — both gates fail open | standard | M0 | n | low |
| `CR-123` | SPIDR coverage for Story/CR/Bug, `spidr-coverage` predicate, Gherkin pointer + error-path fixes | standard | M1 | n | med |
| `BUG-090` | `sprint init` rejects fresh stories: positional frontmatter in two scripts + no `approved:` key in epic/story templates | standard | M5 | y | med |
| `BUG-096` | Init-parity test fixture leaks a temp dir per scenario (~17k dirs / 19 GB) | standard | M5 | y | low |
| `BUG-097` | New-user CLI output defects: `gate -v` on pass, `stamp --dry-run`, `wiki query`, `scaffold-lint` | standard | M5 | y | low |
| `BUG-098` | Remaining positional frontmatter readers (BUG-067/-090 carry-forward); `--allow-drift` plants a phantom block | standard | M5 | y | med |
| `CR-124` | Contract-first build-then-integrate: sprints planned and run as a dependency DAG, not collision waves | standard | M5 | y | med |

**Milestone column (plain values, so the dashboard groups correctly):** BUG-085 also runs the M0 barrier step B0 (§2.1) before its M3 wave; STORY-058-05 sits in M3 after -06 (SDR 2026-09-24); CR-123 runs as wave3, after M0 and before STORY-058-01.

> **Amendment 2026-09-26T14:00Z (contract-first re-plan):** for unmerged items, Parallel? reads "builds in a parallel lane" (CR-124). Milestone values are unchanged: the dashboard groups by this table's Milestone column and never reads waves.json.

**Decomposition notes.** L3 stories include `STORY-058-07`, `-10`, `-12`, and `-13`; `-07`'s §3.2 carries an explicit split
signal for the Architect (split into two L2s if `doctor`+`drift` and `upgrade`+`uninstall`+`prune`
turn out not to share a manifest-query helper). `STORY-058-01` is the highest-bounce story — it
moves every payload source at once — and is sequenced alone.

**Explicitly deferred out of SPRINT-41 and NOT decomposed:** EPIC-058's **Copilot adapter** (held
pending the owner's still-unanswered scope question — decomposing scope that may be deleted is
waste), the **token-ledger metering adapter** (blocked on the two unverified Codex facts), and
**plugin/marketplace distribution**, and **`.codex/rules/**` command-policy assets**. The last remains explicit EPIC-058 scope for later decomposition before epic close. EPIC-058 carries a `target_date` of 2026-11-30 and spans more
than one sprint; this sprint takes the foundation slice plus the Codex adapter.

## 2. Execution Strategy

*(Architect Sprint Design Review 2026-09-24, re-run under owner rulings R1–R4 — see §4 Execution Log 2026-09-24T22:30:23Z. The first run halted on BUG-046 reachability: `sprint-runs/SPRINT-41/plans/sdr-halt-2026-09-24.md`. Wave plan: `sprint-runs/SPRINT-41/plans/waves.json`.)*

### 2.1 Phase Plan

> **Contract-first re-plan (2026-09-26, owner: "that's how i want cleargate to be planning sprints" / "the sprint also runs the same way from now on") — authoritative over the wave list below for every unmerged item.** Plan: `sprint-runs/SPRINT-41/plans/replan-contract-first.md`; machine plan: `plans/waves.json` (`schema_version: 2`).
> - **Contracts (cli):** C1 `contract/S-41-codex` = STORY-058-10 Developer commit `d0f0d95`; C4 `contract/S-41-fence` = BUG-090's Developer commit; C2 `contract/S-41-dispatch` = C1 + STORY-058-11 and CR-124 Developer commits; C3 `contract/S-41-loop` = STORY-058-12's pass-B commit. Frozen exports per the plan §2.
> - **Build now (4 lanes):** STORY-058-10 pass C, CR-124, STORY-058-11 (C1), BUG-090 (C1); then BUG-096, BUG-097; BUG-098 on C4; STORY-058-12 on C2; STORY-058-13 on C3.
> - **Integration edges:** BUG-090 and STORY-058-11 after STORY-058-10; BUG-098 after BUG-090; STORY-058-12 after STORY-058-10, STORY-058-11 and CR-124; STORY-058-13 after STORY-058-12 and BUG-090. BUG-096, BUG-097, CR-124 and STORY-058-10 have none.
> - **Merges** one at a time in the cli main checkout (now permanently on `main`) and on `sprint/S-41`; re-integrate if either moved. QA-Verify and post-flight run on the integrated tree; over-constrained reds are re-scoped by QA-Red.
> - **Boundaries:** BD after every cli merge; RS-4a after STORY-058-10; RS-4 after STORY-058-11 (live run → RS-4L, needs owner OD1, before RS-CLOSE); RS-CR after CR-124; RS-5 after STORY-058-12; step L (owner) before STORY-058-13's merge; RS-CLOSE last.

**Execution model (R1–R4):** strictly serial, by hand, one item at a time — QA-Red → TPV/Architect only on a pre-gate flag → Developer → QA-Verify → DevOps. Every item touches `cleargate-cli/`, and R1 gives that repo one main checkout with one story branch at a time, so no two items can be in flight. The five-clause predicate agrees independently: no pair is compatible. `launch_wave.mjs` cannot drive this (it only cuts outer-repo worktrees), so `waves.json` is walked by hand.

**Items touching both repos:** the cli half merges to cli `main` first, `dist` is rebuilt from cli `main`, then the outer half merges to `sprint/S-41`.

- **M0 (sequential, blocking):** wave1 BUG-089 → **barrier B0** (BUG-085's M0 step) → wave2 BUG-067
- **Between M0 and M1 (off critical path):** wave3 CR-123
- **M1:** wave4 STORY-058-01 → wave5 -02
- **M2:** wave6 -03 → wave7 -04
- **M3:** wave8 -06 → wave9 **-05 (moved from M2)** → wave10 -07 → wave11 BUG-085 (durable check)
- **M4:** wave12 -08 → wave13 -09
- **M5:** wave14 -10 → wave15 -11
- **M6:** wave16 -12 → wave17 -13

**The one change from the halt order:** STORY-058-05 now runs after -06. -05 §1 says "Manifest schema for ownership — STORY-058-06; this story consumes it", and -06 §1 agrees ("Consuming them in `host remove` — STORY-058-05"). `host remove` may only delete files whose manifest `owner` matches the host, and that field does not exist until -06 lands.

**Co-waves that pass the predicate but go unused:** none. Only BUG-089/BUG-067 and -05/BUG-085 pass clauses 2–4; both fail clause 1 (the plan marks the bugs parallel=n) and clause 5 (owner order). The owner-allowed -04/-05 co-wave fails clause 2 on `src/cli.ts` and `src/hosts/registry.ts`.

**Barrier B0 — BUG-085's M0 step (not a wave, no state change):**
1. Wait until BUG-089's cli half is merged, `dist` is rebuilt from cli `main`, and its outer half is merged to `sprint/S-41`.
2. Re-sync live `.claude/` from the **`sprint/S-41` tip, not `main`** — BUG-089's canonical hook edits exist only on the sprint branch.
3. Back up each exact live file first. Substitute the version pin rather than copying blindly: canonical `__CLEARGATE_VERSION__` vs live `0.20.0` is install-time substitution, not drift (flashcard 2026-08-28).
4. Keep the live-only files: `scheduled_tasks.lock`, `settings.local.json`, `worktrees/`.
5. Restart Claude Code. Prove real edit and dispatch denials, permitted actions, and correct dispatch identity.
6. Ledger rows from before this point are unattributable.

**Boundary steps:**

| ID | When | What |
|---|---|---|
| BD | After every cli merge | Rebuild `dist` from cli `main` (`stamp-and-gate.sh:12`, `pre-edit-gate.sh:94` and `session-start.sh:10` run `cleargate-cli/dist/cli.js` first). |
| RS-1 | After BUG-067 | Re-sync live `stamp-and-gate.sh`. |
| RS-2 | After CR-123 | Re-sync live `qa.md` and `SKILL.md` (CR-123 condition 2). |
| RS-3 | After M1 closes | The re-sync source switches to `cleargate-cli/scaffold/hosts/claude/**`. Run a re-sync diff; it must be empty. |
| RS-4 | After -11 | All nine hooks use the new repo-root shim. Re-sync, restart, and re-run -09's clean-room Claude baseline before -12. |
| RS-5 | After -12 | Re-sync `SKILL.md` and `dispatch-serial.md` before -13. |

### 2.2 Merge Ordering (Shared-File Surface Analysis)

| Shared File | Items | Order | Rationale |
|---|---|---|---|
| `cleargate-cli/src/cli.ts` | BUG-089, 058-04, -05, -08* | 089 → 04 → 05 → 08 | Each adds a command registration |
| `cleargate-cli/src/commands/init.ts` | 058-03*, -04, -06 | 03 → 04 → 06 | 03 routes install through the adapter; 04 adds `--host`; 06 records ownership |
| `cleargate-cli/src/hosts/registry.ts` | 058-03 (create), -04, -05 | 03 → 04 → 05 | Forward reference to 03's create |
| `cleargate-cli/src/hosts/types.ts` | 058-03 (create), -12 | 03 → 12 | 12 adds `dispatchMode` to `HostAdapter` |
| `cleargate-cli/src/lib/manifest.ts` | 058-06, -05 (read) | 06 → 05 | `remove` depends on the `owner` field |
| `cleargate-cli/scripts/build-manifest.ts` | 058-02, -06 | 02 → 06 | 02 widens the roots; 06 adds ownership |
| `cleargate-cli/package.json` | 058-02, -11* | 02 → 11 | 11 adds codegen to prebuild |
| `cleargate-cli/src/commands/doctor.ts` | 058-07, BUG-085 | 07 → 085 | Per-host scoping, then the parity check |
| `cleargate-cli/src/hooks/hook-signal.ts` | BUG-089 (creates), 058-10 | 089 → 10 | 10 extends it; no second handler |
| `cleargate-cli/src/commands/verify-install.ts` | 058-08 (create), -13 | 08 → 13 | 13 adds the Codex checks |
| `cleargate-cli/test/e2e/**` | BUG-067 (folder), 058-09 | 067 → 09 | The folder entry contains -09's test |
| `cleargate-cli/scaffold/core/**` | 058-01 (create), -11 | 01 → 11 | `harness.sh` lands inside 01's tree |
| `cleargate-cli/scaffold/hosts/codex/**` | 058-10 (create), -11 | 10 → 11 | `.codex/agents/**` is under 10's pattern |
| `CLAUDE.md` | 058-01*, BUG-085 | 01 → 085 | 01 rewrites *Dogfood split*; 085 extends it |
| canonical `.claude/hooks/*.sh` | BUG-089, BUG-067, BUG-085, 058-11* | 089 → 067 → [01 relocates] → 085 → 11 | Post-M1 edits go to `scaffold/hosts/claude` |
| canonical `settings.json` | BUG-089, 058-13 | 089 → 13 | 13 must target the relocated path |
| canonical `sprint-execution/SKILL.md` | CR-123, 058-12 | CR-123 → 12 | 12 edits different lines |
| canonical `agents/qa.md` | CR-123, 058-11 (reads it for codegen) | CR-123 → 11 | Avoids regenerating |
| canonical `.cleargate/templates/*`, `readiness-gates.md` | CR-123; 058-01 copies them | CR-123 → 01 | -01's copy then carries the edits |
| `.cleargate/scripts/test/bug068_dispatch_tool_name.red.sh` | BUG-089, BUG-085 | 089 → 085 | — |
| `.cleargate/knowledge/cleargate-enforcement.md` | BUG-089, 058-12 | 089 → 12 | — |
| `.cleargate/knowledge/clean-room-verification.md` | 058-08 (create), -09 | 08 → 09 | Forward reference (R4), not a refusal |
| `cleargate-cli/test/helpers/init-fixture.ts` | all remaining cli items except BUG-097 | tail order = merge order | One row per rel; shared enforcement row byte-identical (plan §7.5) |
| `…/.cleargate/knowledge/cleargate-enforcement.md` (+ twin) | STORY-058-11, CR-124, STORY-058-12 | 11 ∥ CR-124 → 12 | disjoint regions; 12 rewrites §16 b10 and appends §17 |
| `…/skills/sprint-execution/SKILL.md` | CR-124, STORY-058-12 | CR-124 → 12 | 12's renderer anchors and banned tokens; CR-124 edits only inside A2 plus §A.4 |
| `…/.cleargate/scripts/launch_wave.mjs` (+ twin) | CR-124, STORY-058-12 | CR-124 → 12 | disjoint regions (CR-124 new exports + launchWave; 12 header + validator) |
| `…/.codex/agents/*.toml` (generated) | STORY-058-11, CR-124 | second merger regenerates | prebuild `--check` |
| `…/scripts/clean-room/{codex-hooks,evidence}.mjs` | STORY-058-10, -11, -12, -13 | 10 → 11 → 12 → 13 | chained extensions |
| live `assert_story_files.mjs` ↔ `prep_reporter_context.mjs` / `dedupe_frontmatter.mjs` | BUG-090, BUG-098 | BUG-090 → BUG-098 (both repos) | ESM import link |

\* The item's own §3.1 names this path, but its parsed surface does not (defect D3).

### 2.3 Shared-Surface Warnings

- **R1 has no parallelism.** One cli checkout means one item in flight, whatever the predicate says.
- **`dist` is live enforcement.** Every live gate hook runs `cleargate-cli/dist/cli.js`. `dist` is gitignored, so it survives branch switches; a build on a story branch puts unmerged code in charge of the outer repo's gates. `build` is `rm -rf dist && tsup`, so during a build the hooks fall back to the global binary. Build from cli `main` only, after merge (step BD); if a segment builds for e2e, rebuild from `main` before the next outer write (flashcard 2026-08-29).
- **CR-123 condition 1:** the cli half merges and `dist` is rebuilt before the outer half registers `spidr-coverage`; otherwise every Story/CR/Bug gate check throws.
- **CR-123 condition 2:** live `qa.md` and `SKILL.md` change only at RS-2.
- **BUG-085 vs STORY-058-01:** the baseline moves underneath the check. After -01, `cleargate-planning/` feeds neither the payload nor the live re-sync, but BUG-085's task text still compares against `cleargate-planning/.claude/**` (defect D4).
- **Live-only edits create drift** in files whose canonical twins are byte-identical today (BUG-089, BUG-067, -12) — the BUG-024/BUG-085 failure class (defect D1).
- **-11 rewrites all nine hooks** Claude runs today. -09's baseline exists to catch exactly this, so re-run it at RS-4 before -12.
- **B0 breaks the ledger's continuity.** The Reporter treats rows before B0 as unattributable. BUG-089's own segment runs under fail-open gates.
- `init.ts` is touched by 03/04/06, not the seed's 01/03/04/10; `manifest.ts` by 06/05. The table above supersedes the seed.
- Parallel outer commits and the surface gate: rule 17 note (RP-A5).
- Harness runs are serialized, and from a worktree they need an explicit `--container` (rule 20).
- -12 renderer anchors and banned tokens constrain CR-124's SKILL.md text (plan §7.1).
- `check-no-exec-mode-vocab` bans "under v2", "v2 only" and similar in agent and skill text.

### 2.4 Lane Audit

| Story | Lane | Rationale (≤80 chars) |
|---|---|---|
| `BUG-067` | standard (demoted from fast) | Fails checks 1, 2, 6: 5+ files, gate-enforcement surface, med bounce |
| `BUG-085` | standard (demoted from fast) | Fails checks 1, 2, 7: re-syncs enforcement hooks; spans live/canonical/cli |
| all others | standard | No fast-lane candidates; no promotions |

`state.json` still records `fast` for both until `update_state.mjs --lane-demote` runs (defect D2).

### 2.5 ADR-Conflict Flags

- **Codebase / PM-Tool Boundary:** no host SDK or PM SDK is imported. No conflict.
- **Dogfood split:** STORY-058-01 changes the canonical → payload → live path and must update `CLAUDE.md` in the same story. Its parsed surface omits `CLAUDE.md` (defect D3).
- **OD-3 (`<instructions>` stays verbatim):** BUG-067 fixes the frontmatter locator; it must not strip `<instructions>`.
- **Worktree isolation / sprint-execution §2/§C.0:** overridden for this sprint by R1 (extends the 2026-09-11 bootstrap exception). R3 lifts the bootstrap decision's ban on writing live files, for B0 only.
- **BUG-046 reachability:** zero refusals. Every unreachable path is under `cleargate-cli/` (R1) except -09's `clean-room-verification.md`, which is -08's create (R4).

### 2.6 Wave Assignment

Repo `both` = cli half first, `dist` rebuilt, then the outer half on `sprint/S-41`.

| Wave | Milestone | Item | Repo | Why here |
|---|---|---|---|---|
| wave1 | M0 | BUG-089 | both | M0 chain; shares the bug068 red test with BUG-085 |
| B0 | M0 | BUG-085 M0 step | outer main checkout | Barrier, not a wave |
| wave2 | M0 | BUG-067 | both | After B0; `test/e2e/` contains -09's test |
| wave3 | M0→M1 | CR-123 | both | Before -01, -11, -12; conditions 1 and 2 |
| wave4 | M1 | STORY-058-01 | both | Highest bounce; §3.1 still prose (D3) |
| wave5 | M1 | STORY-058-02 | cli | After 01; shares `build-manifest.ts`, `package.json` |
| wave6 | M2 | STORY-058-03 | cli | Creates the host registry; §3.1 still prose (D3) |
| wave7 | M2 | STORY-058-04 | cli | After 03; shares `cli.ts`, `registry.ts` with -05 |
| wave8 | M3 | STORY-058-06 | cli | Before 05, 07, BUG-085; shares `manifest.ts`, `init.ts` |
| wave9 | M3 | STORY-058-05 | cli | Moved from M2: needs -06's `owner` field |
| wave10 | M3 | STORY-058-07 | cli | After 06; shares `doctor.ts` |
| wave11 | M3 | BUG-085 | both | Only BUG-085 wave; after 07; shares `doctor.ts`, `CLAUDE.md` |
| wave12 | M4 | STORY-058-08 | both | Before 09 and 13; §3.1 still prose (D3) |
| wave13 | M4 | STORY-058-09 | both | After 08 (its created doc) |
| wave14 | M5 | STORY-058-10 | cli | After BUG-089; `hosts/codex/**` holds -11's files |
| wave15 | M5 | STORY-058-11 | cli | After 10, 01, CR-123, 09; §3.1 still prose (D3) |
| wave16 | M6 | STORY-058-12 | both | After 03, CR-123, 10, 11 |
| wave17 | M6 | STORY-058-13 | both | After 12, 08 |

**Remainder (contract-first, derived integration layers — `waves.json` `schema_version: 2`):**

| Layer | Items | Base | Integrates after |
|---|---|---|---|
| wave14 | STORY-058-10 | 35580b0 (pass C in its worktree) | — |
| cf-L0 | BUG-096, BUG-097, CR-124 | cli main | — |
| cf-L1 | BUG-090, STORY-058-11 | C1 | STORY-058-10 |
| cf-L2 | BUG-098, STORY-058-12 | C4, C2 | BUG-090; STORY-058-10 + STORY-058-11 + CR-124 |
| cf-L3 | STORY-058-13 | C3 | STORY-058-12, BUG-090 |

### 2.7 Pre-dispatch defects

- **D1 — BUG-089, BUG-067:** each edits one live file whose canonical twin is byte-identical today (`.cleargate/knowledge/cleargate-enforcement.md`, `.cleargate/scripts/prep_doc_refresh.mjs`). Add the `cleargate-planning/.cleargate/...` twin to each item's §3.1, or the fix never ships.
- **D2 — BUG-067, BUG-085:** `state.json` says `fast`, and fast lane skips QA-Red. Run `update_state.mjs <ID> --lane-demote` for both before wave2.
- **D3 — STORY-058-01, -03, -08, -11:** §3.1 is still a bullet list, so the outer pre-commit surface check guards nothing. Missing from the parsed surface: -01 `copy-planning-payload.mjs` + `CLAUDE.md`; -03 `init.ts`; -08 `cli.ts`; -11 the nine hooks + `package.json`. Convert to tables before each dispatches.
- **D4 — BUG-085, -11, -12, -13:** after wave4 merges, `cleargate-planning/` is no longer the source; re-declare each against `cleargate-cli/scaffold/{core,hosts/claude}/**` and commit on `sprint/S-41` before the next outer worktree.
- **D5 — STORY-058-05:** moved to M3 (applied in `waves.json` and §1).
- **Before wave1:** cut `sprint/S-41` (R2).

## Risks & Dependencies

| Risk | Mitigation |
|---|---|
| EPIC-058 decomposition | 13 local stories now exist; run the decomposition/readiness checks against the amended set, not the historical 11-story count. |
| ~~EPIC-058 fails `parent-approved`~~ — **resolved 2026-09-04**: `proposal_gate_waiver` recorded with `approved_by` + `approved_at` on direct owner approval. | — |
| ~~BUG-067 fix approach undecided~~ — **resolved 2026-09-04**: locate-the-fence, all three call sites. | Fail-closed remains an in-sprint fallback but requires re-dispatch, not silent substitution. |
| Codex runtime and trust behavior may drift. | Pin standalone 0.154.0-alpha.6.2; emit hooks=true explicitly; verify workspace/hook trust. Windows validation is deferred, not asserted impossible. |
| Documented lifecycle hooks and Agent matcher still require live proof on the pinned runtime. | Separate dispatch identity and enforcement from usage metering. Missing required enforcement blocks -13; unverifiable token usage may be disclosed as unavailable. |
| Codex has no `CLAUDE_PROJECT_DIR` equivalent (11 uses across our hooks) and no per-agent `tools:` allowlist. | Derive repo root from the stdin `cwd` field; accept that per-role tool restriction degrades from harness-enforced to prompt-enforced under Codex, and record it as a known enforcement delta. |
| Scope approvals | BUG-085, -12, -13, and BUG-089 approved by owner continuation; Architect review and actual implementation evidence remain outstanding. |
| **This sprint currently runs on pre-[[BUG-068]] hooks.** 8 files in live `/.claude/` differ from canonical, incl. a 218-line drift in `token-ledger.sh`. Enforcement and telemetry behaviour during SPRINT-41 will not match what the test suite proves. | [[BUG-085]] M0 re-sync before the first dispatch. Until then, treat any ledger row from this repo as unattributed regardless of its `agent_type` field. |
| Historical SPRINT-40 blocker is stale. | Read-only audit finds the active sentinel names SPRINT-41. Do not re-close or reinitialize another sprint as part of this scope change. |

## Metrics & Metadata

- **Expected Impact:** A fresh `cleargate init` install can author and gate a work item without
  corruption (today it cannot); ClearGate becomes installable for Codex users; install/upgrade
  changes gain a real regression witness; and a real story runs the full five-agent loop under
  Codex end to end, with a host-aware dispatch mode instead of a silent Claude-only assumption.
- **Priority Alignment:** BUG-067 is P1-High and pre-existing since v0.24.2, with its exposed
  population widened to every newly authored item by CR-108. It follows the M0 enforcement bootstrap and precedes the epic's feature work.

---

## Execution Guidelines (Local Annotation — Not Pushed)

- **Starting Point:** BUG-089's M0 enforcement repair, followed by BUG-085 re-sync and new-session proof, then BUG-067. Story execution requires the installed Workflow contract or an explicit bootstrap exception; this planning update grants neither an implicit bypass nor a false runtime pass.

- **Relevant Context:** [[EPIC-058]] §0 architecture rules (clean-room + Claude-as-baseline);
  [[BUG-067]] §3 FIELD CONFIRMATION and §4 three-call-site blast radius; [[PROPOSAL-074]] for the
  original `HostAdapter` precedent; Codex CLI v0.153.2 docs for hooks/agents/skills/MCP contracts.
- **Constraints:** Do not strip `<instructions>` to fix BUG-067 (OD-3). Do not import any host SDK.
  Do not give hosts separate `.cleargate/**` trees. Copilot is out of scope this sprint pending the
  owner's scope decision on EPIC-058.

## Prior work

- [[EPIC-058]] — the sprint's primary epic; amended 2026-09-04 with the clean-room requirement.
- [[BUG-067]] — carried as a standalone bug; amended 2026-09-04 with field confirmation.
- [[PROPOSAL-074]] — Antigravity single-host port; the `HostAdapter` precedent EPIC-058 generalizes.
- [[SPRINT-34]] — `Polyglot Portability Hardening`; language/test-stack portability, adjacent to but
  distinct from harness portability.
- [[CR-108]] — widened BUG-067's blast radius; does not cause it.
- [[BUG-085]] — added 2026-09-04: the live `/.claude/` instance was never re-synced after
  [[BUG-068]]/[[BUG-069]] shipped, so those fixes are inert in this repo and the token ledger cannot
  attribute spend. Second occurrence of the [[BUG-024]]/[[CR-026]] canonical-vs-live failure.

## Decomposition Status

**DECOMPOSED 2026-09-04; AMENDED 2026-09-11T22:19:09Z.** EPIC-058 has 13 local STORY-058 items. BUG-067, BUG-085, and BUG-089 are the three standalone bug deliverables. All 16 are owner-approved. The active sprint is already initialized; register only the four missing items through append-only genesis events and rebuild the cache by folding the log. **AMENDED 2026-09-24T21:53:44Z:** [[CR-123]] registered the same way; 17 items.

## 4. Execution Log

- 2026-09-11T22:19:09Z · CR:scope-change · sandrinio's “continue please” accepts the preceding decision brief: approve/register BUG-085, STORY-058-12, STORY-058-13, BUG-089; M0 shared-handler repair and re-sync, M3 durable drift check, M6 serial contract then strict transport/enforcement evidence; standalone Codex 0.154.0-alpha.6.2 and human hook trust; defer command rules and token metering.
- 2026-09-11T22:19:09Z · Execution constraint · No Workflow tool is available in the current Codex task; installed sprint-execution §2/§C.0 forbids executing stories outside a wave segment. Planning/roster reconciliation may complete; no source repair, merge, or live resync is claimed.
- 2026-09-24T21:53:44Z · CR:scope-change · Owner directs [[CR-123]] (SPIDR scenario coverage, approved the same day) into SPRINT-41 and a re-plan. Registered by one append-only genesis event; the 16 existing records are unchanged. Sprint goal unchanged — CR-123 is off the critical path. The re-plan is the pending Architect Sprint Design Review over all 17 items. The isolated CG_TEST workspace state predates this amendment.
- 2026-09-24T22:25:00Z · SDR HALT · Reader/synth fan-out over 17 items wrote `waves.json` with zero waves: 11 refused under BUG-046 reachability (16 of 17 items touch the nested `cleargate-cli/` repo, which a worktree of this repo does not contain), 6 blocked behind them. BUG-085 placement ruled (M3 entry + M0 operational step); CR-123 placement confirmed. Awaiting the owner's ruling on cli-repo and live `.claude/**` execution. Full output: `sprint-runs/SPRINT-41/plans/sdr-halt-2026-09-24.md`.
- 2026-09-24T22:30:23Z · CR:approach-change · Owner rulings on the SDR halt: (1) **cli work** runs on a story branch in the `cleargate-cli` main checkout (not a worktree), orchestrated by hand one item at a time — QA-Red → TPV/Architect only when the pre-gate scan flags → Developer → QA-Verify → DevOps — without `/workflows`; this extends the 2026-09-11 bootstrap exception. DevOps merges to cli `main` locally only; no push or publish. Outer tracked `.cleargate/**` edits land in the outer repo on `sprint/S-41`; canonical `.claude/**` edits only, live re-sync at boundaries. (2) **BUG-085's M0 step** runs against this repo's real live `.claude/`: back up, re-sync from canonical, restart Claude Code, prove real denials and dispatch identity. This supersedes the bootstrap decision's ban on writing the original live files, for this step only. (3) **All `.cleargate/` changes committed to main** in one chore commit so worktrees and the preflight see them; `.agents/`, `.codex/`, `AGENTS.md` left untouched. Next: fix the item-surface defects the synth listed, then re-dispatch readers and synth with these rulings.
- 2026-09-24T23:20:00Z · SDR · Re-run under rulings R1–R4: all 17 items placed as 17 serial single-item waves, zero refusals; `waves.json` overwritten. STORY-058-05 moved M2→M3 after -06 (its `host remove` needs -06's manifest `owner` field). BUG-067 and BUG-085 demoted fast→standard. Pre-dispatch defects D1–D4 listed in §2.7. §2 replaced; awaiting the owner's plan confirmation.
- 2026-09-24T23:34:00Z · Plan confirmed · Owner goal directive: "get sprint ready for execution and you have my permission to start the sprint. during the sprint, make decisions on your own and deliver the sprint goal." This confirms the §2 plan (17 serial waves, STORY-058-05 at M3, BUG-067/BUG-085 standard) and authorises kickoff. The orchestrator set `end_date` 2026-09-26 → 2026-10-09: 17 serial items cannot fit the original window. D2 lane demotions for BUG-067 and BUG-085 were run by the orchestrator through `run_script.sh update_state.mjs --lane-demote` — a §C.7-listed script invoked outside DevOps, recorded here as an edge case (planning action, not a merge). Ambiguity Gate flipped to 🟢.
- 2026-09-24T23:58:00Z · Kickoff · Preflight 5/5 pass; `devops` agent reachable (check 6, listed in this session's agent registry). `sprint/S-41` cut from main. Cli main baseline at 3364802: 2683 tests, 0 fail, 3 skipped.
- 2026-09-25T00:10:00Z · CR:spec-clarification · [[STORY-058-10]] §3.2 resolver renamed `resolveBlockSignal(host, outcome)` → `resolveHookSignal({ host, decision })` to match what [[BUG-089]] ships (TPV note A2). No scope change.
- 2026-09-25T00:10:00Z · BUG-089 · TPV BLOCKED-WIRING-GAP (fake `cleargate` stub answered `doctor --can-edit`; shell suite read the main checkout's hook). arch_bounces=1; QA-Red re-dispatched. Pre-gate `typecheck: exit 254` is structural under R1 (`gate-checks.json` runs `npm --prefix cleargate-cli` in an outer worktree, which never contains the nested repo), so every item will dispatch a live TPV/post-flight Architect per the non-removable safeguard.
- 2026-09-25T02:20:00Z · BUG-089 · **Done.** QA-Red (1 TPV wiring bounce) → Dev → QA PASS 11/11 → Architect post-flight PASS (first post-flight dispatch stalled >2h with no process running; stopped and re-dispatched) → DevOps. Post-merge full suite found 1 regression invisible pre-merge (`pin-placeholder-coverage`: sentinel gained `__CLEARGATE_VERSION__` without a pin-aware manifest rule) → qa_bounces=1, rework c400d07 → full suite 2698/0 fail. Merges: outer ebd70b09 + a568864b, cli 19a8a0f + a2694e4; MANIFEST cb711e54; `dist` rebuilt from cli a2694e4 (`hook signal` block→2, allow→0).
- 2026-09-25T02:20:00Z · Carry-forwards from BUG-089 post-flight: (1) `HOOK_ADDITION` exact-string coupling needs a guard test → [[STORY-058-09]] baseline; (2) re-running non-`--force` `cleargate init` on a pre-BUG-089 install adds a second `pre-edit-gate.sh` entry (upgrade/`--force` stay clean) → [[STORY-058-06]]/[[STORY-058-07]] ownership work; (3) pre-existing: `pending-task-sentinel.sh:102` exits 1 under bash 3.2 when no report files exist, skipping dispatch recording → [[BUG-085]] attribution scope at M3; (4) a Codex host needing a non-exit-2 block signal must change both shell tails → [[STORY-058-10]].
- 2026-09-25T02:20:00Z · Flashcard gate (BUG-089): 9 approved. FLASHCARD-REJECT 2026-09-25 — "A sealed cross-session red test may mix unit + integration assertions…" — reason: one-off adoption detail, not a recurring hazard. FLASHCARD-REJECT 2026-09-25 — "test_pre_edit_gate.sh roots at BASH_SOURCE/../../.. → outer MAIN hook, never the worktree; no override." — reason: fixed in a23c655 (`PRE_EDIT_GATE_HOOK` override). FLASHCARD-REJECT 2026-09-25 — "2026-09-12 · #test-harness #tsx · CG_TEST-backed TMPDIR rejects tsx IPC sockets…" — reason: superseded by the existing 2026-09-12 short-TMPDIR recipe card.
- 2026-09-25T03:50:00Z · Barrier B0 · **Passed.** Live `.claude/` re-synced from the `sprint/S-41` tip with backup (6 files; pin kept at 0.20.0; live-only files preserved). Fresh headless Claude sessions in fixture repos: E1 enforce-mode uncovered Write refused, E2 warn-mode Write permitted, D1 Agent spawn refused by the flashcard gate, D2 permitted after processing with ledger `agent_type: qa` and a populated sentinel. The same harness before the re-sync reproduced all three defects (Write landed; gate never fired on `Agent`; row attributed to `architect`). Evidence: `reports/BUG-085-b0-proof.md`. The orchestrating session keeps its pre-B0 hook snapshot until a human restart, so its ledger rows stay unattributable until then; this does not block the loop.
- 2026-09-25T04:45:00Z · BUG-085 M0 follow-up · After B0, 11 cli tests (`test/hooks/{pre-tool-use-task,token-ledger-attribution,token-ledger-regression}`) went red: they read the per-machine LIVE `.claude/hooks/*` and pinned pre-BUG-068/069 contracts. Repointed to canonical (`CLEARGATE_META_ROOT`-aware) and updated to the current contracts; QA PASS; merged cli 515dd3e (2700/0 fail); BUG-085 §4 amended. BUG-085 itself stays open for wave11.
- 2026-09-25T05:40:00Z · BUG-067 · **Done.** QA-Red (adopted CG_TEST seal, re-rooted; hook-chain input frozen to a fixture after TPV) → TPV APPROVED (temp-build recipe `tsup --out-dir .bug067-build --onSuccess true` + absolute `CLEARGATE_BUILT_CLI`, so `dist` is never built on a story branch) → Dev (shared `src/lib/frontmatter-locator.ts`; 5 positional sites, not 3) → QA PASS 9/9 → Architect PASS → DevOps: outer e031682b, cli 8931b91, suite 2741/0 fail/2 skipped, `dist` rebuilt; live `stamp` on an `<instructions>`-led file keeps `bug_id`, one block, instructions byte-identical. RS-1 is a no-op (`stamp-and-gate.sh` unchanged). **M0 complete.**
- 2026-09-25T05:40:00Z · Carry-forwards from BUG-067: (1) push/pull/sync write-backs (`push.ts:341`, `pull.ts:172`, `sync.ts:575/665`, `sync/work-items.ts:327`) used to throw on `<instructions>`-led items and now succeed while dropping the preamble — member-only paths, unreachable in this pre-member repo; needs a follow-up bug filed at close; (2) remaining positional sites (`frontmatter-merge.ts`, `sprint.ts:745` second parser, `doctor.ts runCanEdit`; `backfill_hierarchy.mjs` keeps failing closed) → follow-up; (3) `stampHandler` lacks try/catch on malformed input (manual CLI only); (4) locator API cleanup (shared EOL-mapping helper, typed errors).
- 2026-09-25T05:40:00Z · Flashcard gate (BUG-085 M0 + BUG-067 + M1 plan): 16 approved. FLASHCARD-REJECT — "writeCachedGate already fails closed on malformed frontmatter…7/30 passing on baseline" — reason: item-specific detail. FLASHCARD-REJECT — "BUG-067 hook-chain e2e reads the live pending-sync BUG-067 item…" — reason: fixed in dbca7e4 (frozen fixture). FLASHCARD-REJECT — "cli story/BUG-067 full suite has 11 pre-existing fails in test/hooks/…" — reason: fixed by cli 515dd3e. FLASHCARD-REJECT — "To prove a full-suite failure predates your diff: tagged git stash…" — reason: stash in the shared cli checkout risks others' work; re-run at the merge-base instead. FLASHCARD-REJECT — "2026-08-29 card is fixed by BUG-067 once dist is rebuilt…" — reason: superseded by the orchestrator's correction card (dist rebuilt at 8931b91).
- 2026-09-25T05:40:00Z · Attribution · This orchestrating session keeps its pre-B0 hook snapshot (no restart yet), so `pre-tool-use-task.sh` never fires for its `Agent` calls. Since BUG-067 the orchestrator writes each dispatch marker by hand with `write_dispatch.sh` (skill §1 fallback, `CLAUDE_SESSION_ID` set), so rows from then on attribute correctly; rows between B0 and that point read `unattributed`.
- 2026-09-25T07:25:00Z · CR-123 · **Done.** QA-Red → TPV BLOCKED (epic gate-block lookup) → QA-Red fix + e2e added → TPV APPROVED → Dev → QA PASS 10/10 → Architect PASS → DevOps in the reversed order (cli 45bde09 → BD1 → outer eef96600 → BD2 + MANIFEST 5808e869). Post-merge suite caught a Brief-anchor regression in `Bug.md`/`CR.md` invisible pre-merge → qa_bounces=1, rework 7602348c, QA PASS → outer ffc7a6c7, MANIFEST db57ece0, suite 2773/0 fail. Live `gate check`: EPIC-052/053 (ready-for-coding) pass; STORY-058-01, CR-122, BUG-088 pass with `spidr-coverage` not-applicable; CR-123's stale `predicate error` cache replaced (24bb4ec4). **RS-2 done:** live `qa.md` + `SKILL.md` re-synced with backup; parity holds.
- 2026-09-25T07:25:00Z · Process · New sprint-context rule 16: two-repo items that edit outer docs run every `CLEARGATE_META_ROOT`-honouring cli test against the worktree pre-merge. Carry-forward: `enforcement-doc-coherence` `resolves()` can never resolve decimal `§N.M` Brief anchors (story.md §1.1/§1.4/§1.5/§2.1) — pre-existing test weakness, follow-up at close.
- 2026-09-25T07:25:00Z · Flashcard gate (CR-123): 8 approved. FLASHCARD-REJECT — "Full npm test with no CLEARGATE_META_ROOT override reads the outer MAIN checkout's canonical docs…" — reason: duplicates the 2026-08-27 cross-branch-dependency card.
- 2026-09-25T07:35:00Z · Surface gate · Standing bypass (sprint-context rule 17): orchestrator/DevOps chore and conflict-merge commits on `sprint/S-41` may set `SKIP_SURFACE_GATE=1`. The gate resolves the "active" item by recency and whitelists no orchestration artifacts, so once a STORY is the latest-updated item it would block every sprint-plan, flashcard, events and report commit on the sprint branch. Story-branch commits stay fully gated; STORY §3.1 tables gain literal orchestration rows (first: STORY-058-01).
- 2026-09-25T07:54:00Z · STORY-058-01 · QA-Red wrote 19 reds (cli `744cb5e`). TPV R1 returned BLOCKED-WIRING-GAP: 7c asserted whole-file `.gitignore` equality, but init Step 5d appends a managed block. There were 4 more fixes: stub the resolver probe, add the missing init-level equivalence test, key the 4c census on the snapshot's own files, and scope scenario 5 to its section. The Architect measured all 5 fixes green against a scratch plan-conformant implementation. Applied by QA-Red R2 (cli `83dbc68`: 20 tests, 16 red, 3 baseline-gated skips). TPV R2 was waived because R1 had already measured the exact fixes; the orchestrator re-ran the counts and diffed the edits against the spec. M1.md scenarios 4 and 7 were amended. Developer dispatched. The worktree surface gate skips (the story state is not `In Progress` in frontmatter), so the story-branch commits are gated only by §3.1 review at QA-Verify.
- 2026-09-25T09:55:00Z · STORY-058-01 · **Done.** Dev (cli `66ed73a`, outer `b478dfd4`) → QA PASS 10/10. QA confirmed that the Dev's 32 fail / 21 cancelled rule-16 sweep is pre-existing, by running solo files at both commits; batch diffs proved noisy under load. Architect post-flight PASS (stopped at budget after its scratch proofs had finished): the scratch build next to a poisoned sibling is byte-identical, and verify-pack is OK. DevOps followed rule 15: outer `9837329c`, then cli `464e1e4b`, then the full suite at 2788/2786/0 fail/2 skip (baseline +15), then BD. The payload is byte- and mode-identical to the CR-123 baseline, `dist/MANIFEST.json` comes from the composed payload, and nothing writes `cleargate-planning/` any more. No live re-sync was needed.
- 2026-09-25T09:55:00Z · STORY-058-01 follow-ups · Rule 10 was amended (canonical is now `cleargate-cli/scaffold/{core,hosts/claude}/**`) and *Adjacent Implementations* populated. The D4 re-declarations were committed (`a37948f7`: BUG-085, STORY-058-11/12/13 → scaffold paths; BUG-085 also gains the three stale CLAUDE.md sentences from post-flight §3). Five -01 carry-forwards were added to the M1 plan's -02 blueprint (a `composePayload` empty-dir opt-out, descriptive collision/symlink errors, a third stale-MANIFEST reader, fixture `DEPRECATED.md` leakage, and the guard allowlist). Flashcard gate: 1 approved (QA batch-noise); the Architect added 2 cards, 1 of them folded into -02's plan instead of becoming a card. **M1 is 2/3 done.**
- 2026-09-25T10:45:00Z · STORY-058-02 · QA-Red R1 (cli `43c4556`) → TPV R1 BLOCKED. The sibling-read guard flagged itself and the sealed files, its regex had 5 false negatives, scenario 11 compared a volatile `generated_at`, scenario 12 omitted `.mcp.json`, and scenario 13's victim depended on readdir order. The Architect named the exports and the four-path allowlist in the M1 plan (`bb97b72f`). QA-Red R2 applied F1–F9 (cli `20a40ff`); TPV R2 was waived under the same rule as -01. The M2 plan was drafted in parallel (`b96a4526`), and A1–A7 were applied to STORY-058-03 (`d311771e`).
- 2026-09-25T12:30:00Z · STORY-058-02 · Dev → cli `477b942`. The full suite was 2806/2804/0 fail/2 skip (baseline +18), all 70 repointed test files were verified, and 7 `.integration.` files carry failures the Dev calls pre-existing; QA re-checks that claim at base `464e1e4`. **Ran long:** 105 min against a 30 min budget (70-file repoint plus solo re-runs). The Dev made three unilateral calls, which QA-Verify checks: identifier renames in two tests to clear the sealed guard's proximity match; a dynamic import of `scripts/build-manifest.ts` in the `--from-source` bridge, to keep its `isMain` entry out of the bundle; and a `composeCanonicalPayload` helper that also writes a MANIFEST. QA-Verify dispatched.
- 2026-09-25T14:10:00Z · STORY-058-02 · **Done.**
  - **QA round 1 FAIL** (qa_bounces=1): `--from-source` crashed with `ERR_MODULE_NOT_FOUND` under the bundled `dist/cli.js`. The import path was two `'..'` too deep; the 2026-08-24 card on exactly this was missed. Every test ran in-process under tsx, so none saw it.
  - **Rework** (cli `358ae35`): `resolveCliPackageRoot` walks up by structure. An installed package without `scripts/` now gets a clean exit 2. A clone-built integration test runs the real bundle (red → green).
  - QA round 2 PASS. QA also confirmed the 7 "pre-existing" `.integration` fails at base `464e1e4`; `test_close_sprint_v21` is flaky and `gate-run` S7 is pre-existing. The guard rename is a legitimate false-positive fix.
  - **Architect post-flight PASS**, run in parallel with QA round 2. All four Dev calls accepted, 12 follow-ups routed:
    - FU-1..4 → STORY-058-06. FU-1 (the compat manifest takes every host's files) is a pre-dispatch requirement.
    - FU-5/6 → STORY-058-10.
    - FU-7..12 → close.
  - The Architect also wrote M2's as-built amendments (V1–V7 re-measured at `358ae35`, M2-A1..A13). STORY-058-03's anchors were re-pointed (`6791a8f2`).
  - **DevOps:** cli `a821d40` → suite 2810/2808/0 fail/2 skip (baseline +22, the new V7) → BD. The flat payload is byte- and mode-identical to the -01 baseline; verify-pack OK (196 files, payload 80); dist-spawning tests pass post-BD, with 7 pre-existing `.integration` fails, all untouched by the diff.
  - Flashcard gate: 7 approved. Rejected: 2 duplicates, and 2 merged into one. **The gate cannot see these cards:** `pending-task-sentinel.sh` parses only `- "card"` lists, and the -02 reports used fenced JSON arrays → carry-forward to [[BUG-085]] (it owns that hook).
- 2026-09-25T14:25:00Z · RS-3 · **M1 complete.**
  - `b0-live-resync.mjs` dry-run on cli `main`: 0 changes. Live `.claude/` equals `scaffold/hosts/claude/.claude` after pin substitution; doctor's two hook drifts are pin-only, verified. No apply and no fresh-session proof needed.
  - CLAUDE.md block byte-identical. `.cleargate/templates` and `knowledge` match `scaffold/core`, apart from live-only files.
  - Fixed live-behind drift: `.cleargate/config.example.yml` ← canonical (CR-079 worktree and `ingest_buckets` doc blocks, CR-107 wording), and the stale `cleargate-planning/` schema pointer in live `config.yml`.
  - Canonical-behind drift, pre-existing: `scaffold/core/.cleargate/scripts/validate_state.mjs` lacks CR-117 (positional state-file path; landed live-only at `d8ab60b3`). This is the `canonical-live-parity` red → carry-forward to [[BUG-085]] (M3 durable drift check): port CR-117 to canonical. `gate-checks.json` differs by design (meta-repo `npm --prefix` commands).
- 2026-09-25T14:45:00Z · STORY-058-03 · **M2 started.**
  - **QA-Red** (cli `11fe514`, 15 min):
    - `test/helpers/init-fixture.ts` (frozen clock and pin, probe stub).
    - 19 contract unit reds, all `ERR_MODULE_NOT_FOUND` on `src/hosts/*`.
    - A 5-scenario parity integration, green by design.
    - Baseline `/private/tmp/cg-s41-m2-init-baseline` (425 files, sha `bdc4bb1a…`), deterministic over 3 re-runs.
  - **TPV APPROVED** with no test fix, measured in scratch: a conformant implementation takes the unit file from 0/19 to 19/19, and parity stays 5/5. It found two constraints:
    - **D1:** a strictly verbatim move reds scenario 11, because the `init.ts:497` fallback holds `CLEARGATE:START`; move it as the constants (M2-A14).
    - **Q1:** parity plus the injected-seam spy cannot kill "route only when the seam is set". -03 QA-Verify closes this with a static grep; -04's reds add a default-path witness (M2-A15).
  - Developer dispatched. The M3 Architect plan is running in parallel.
- 2026-09-25T15:30:00Z · STORY-058-03 · **Done**, with 0 bounces. Dev (cli `0fb61b1`, 20 min, no deviations) → QA PASS → Architect post-flight PASS → DevOps.
  - **QA:** the static grep was empty, the verbatim move matched hunk for hunk, and a bundled-dist double init placed each hook exactly once.
  - **Post-flight follow-ups:** FU-5 → -04; FU-1/2/7 → -05 (sink convention, `remove()` never rejects); FU-3 → -07 doc, plus a close CR on `init --force` overwriting `settings.json` wholesale; FU-4 → -10 (`AGENTS.md` would be copied wholesale); FU-6 → close.
  - **DevOps:** merged cli `55f5d95`. The suite ran 2829/2827/0 fail/2 skip. BD: flat payload byte-identical, and the adapter is bundled. Post-BD parity 5/5 against the M2 baseline.
  - **Plans:** the M3 plan landed (`plans/M3.md`: -06 → -05 → -07 → BUG-085; 11 `[verify after …]` tags, of which T1–T5 are now resolved). Mid-Sprint Amendment: shared portable assets go in `scaffold/core` under a sharedRoot an adapter declares. STORY-058-04 received amendments B1–B8, with anchors re-measured as M2-A16.
- 2026-09-25T16:20:00Z · STORY-058-04 · **wave7 started.**
  - **QA-Red** (cli `a178d38`, 14 min): 4 files. 19 reds; 18 green by design (scenario 13 ×2, the M2-A15 default-path witness, 15 parity compares).
  - **TPV REJECTED** (28 min, `arch_bounces=1`), with exact re-seal edits E1–E8 (M2-A17/A18):
    - **W1:** sealed 12c could never fail. `runInitScenario` always passes `payloadDir`, which init reads before `fromSource`, so the `--from-source` mkdtemp was unreachable.
    - **W2:** 7b's whole-payload census reds for a correct -11 (`.agents/**` in core).
    - The sealed set let 8 of 23 plausible mutants survive; the amended set kills all 23.
    - Binding Dev constraints D1–D8 (M2-A19); M2-A20 is a forward note for -10.
  - **Re-seal** (cli `4785032`, 5 min): E1–E8 applied verbatim. The orchestrator reproduced the red-commit counts (0/11, 3/10, 0/4, 15/15), so Dev proceeds without a second TPV round.
  - **M3 prep:** STORY-058-06 received amendments C1–C6 (the M2-A13 FU-1 pre-dispatch gate) and was re-gated green. The M2 baseline hash was re-confirmed.
- 2026-09-25T17:45:00Z · STORY-058-04 · **Done**, with 0 QA bounces and 1 Architect bounce (the TPV re-seal). **M2 complete.**
  - **Dev** (cli `128bad6`, 18 min): followed D1–D8 verbatim; no deviations. All six files reproduced TPV's conformant counts: 11/11, 10/10, 4/4, 15/15, plus -03's 19/19 and 5/5. 25 witnesses were clean.
  - **QA PASS** (4 min): sealed tests untouched. The static greps matched, D1–D8 were verified from the diff, and the tsx CLI smokes passed (`--help`, `--host cursor` → 2, `--host ""` → 2).
  - **Post-flight PASS** (15 min):
    - FU-1..8 routed. The binding -06 amendments are M3-A1 (one hoisted `include` predicate) and M3-A2 (snapshot `hosts` = the installed set via `mergeInstalledHosts`, plus new scenario 21).
    - The -10 dispatch text gets M3-A3 (root-level surgery targets are admitted only for a selected declarer) and M3-A4 (a composed payload per selection).
    - M3 tags T6–T10 are resolved, with anchors re-derived; T11 opens after -07.
  - **DevOps:** merged cli `2e566b5`. The suite ran 2850/2848/0 fail/2 skip.
    - BD: the flat payload is byte-identical, and verify-pack reported 196 files, payload 80.
    - Real-dist smokes: `--help` lists `--host`. `--host cursor` exits 2 and leaves the target empty. No-flag re-init places each hook exactly once. `--host CLAUDE,claude` produces the same file set as no flag. `--from-source --host cursor` exits 2 and leaks no tempdir.
    - Post-BD: parity 5/5 and 15/15; the baseline is intact.
    - Attempt 1 stalled for 40 min on an `rm -rf "$(…)"` smoke-cleanup call. The orchestrator stopped it, and attempt 2 finished from smoke (c) (flashcard added).
  - **M3 prep:** M3-A1/A2 were applied to STORY-058-06's §3.1 bullet and Step 7 Task Breakdown row, and the story was re-gated green.
- 2026-09-25T18:00:00Z · M2 close · Browser check of the dashboard (`.playwright-mcp/s41-m2-close-*.png`): 7/17 done (41%); M2 2/2 Done; -04 shows QA 0 · Arch 1 with 6 reports. The `/data` 404s come from the static preview server, not the dashboard.
- 2026-09-25T19:10:00Z · STORY-058-06 · **M3 started (wave8).**
  - **QA-Red** (cli `3871857`, 29 min): 4 new red files, 3 amended sealed files, the 0.10.0 legacy fixture (sha `fa0c79ac…`), and `SANCTIONED_BASELINE_DELTAS` + `primeExtra` in `init-fixture.ts`. 26 reds.
  - **TPV REJECTED** (32 min, `arch_bounces=1`):
    - **Q1:** the sanctioned delta must be strict. QA-Red's dual-accept, caused by an orchestrator dispatch wording error, let a build that never writes `hosts` pass parity (measured).
    - **M3-A7:** the M3-A2 carry-forward dropped shared-root core entries.
    - Plan defects M3-A9..A12.
    - 6 surviving mutants.
    - E1–E9 re-seal diff (`git apply --check` clean). D1–D13 bind the Dev. C7 story text was applied, and the story re-gated green.
  - **M4 plan** (parallel, 37 min; `plans/M4.md`): -08 `verify-install` + procedure doc, -09 clean-room harness + packed-tarball e2e.
    - Probe findings F1–F10: PATH control is required, or hooks run the global `cleargate`; headless `claude -p --include-hook-events` works as live evidence.
    - `waves.json` gained a concrete RS-4 and a new `RS-CLOSE`.
    - Drafted **[[BUG-090]]** (F5, P1: `sprint init` + `close_sprint` Step 2.9 anchor frontmatter at offset 0; the sixth BUG-067-class site) and **[[BUG-091]]** (F8, P3: `doctor --check-scaffold` false positive on the post-processed `gate-checks.json`). Both are Draft and outside the sprint, pending owner approval. SPRINT-41's own items all start with `---`, so this sprint's close gate is unaffected.
- 2026-09-25T19:55:00Z · STORY-058-06 · **Done**, with 0 QA bounces and 1 Architect bounce (the TPV re-seal).
  - **Re-seal** (cli `e990607`): TPV's E1–E9 diff was applied verbatim. The orchestrator reproduced the counts; parity went 0/5 and 0/15 by design under the strict delta.
  - **Dev** (cli `10176ea`, 23 min): D1–D13 followed; the one deviation (a try/catch around verify-pack 3c) was accepted by QA and Arch (M3-A22). Every red went green, including strict parity 5/5 and 15/15.
  - **QA PASS** (7 min): 13 files solo, exact. QA proved the pre-existing `test_version_bump_alignment` failure on main.
  - **Post-flight PASS** (15 min): FU-1..16 routed as M3-A14..A23.
    - Binding before -05 QA-Red: A14 (fixture owners), A15 (one payload per registry), A17 (mechanics), A18 (D4 anchors).
    - -10: A19 `buildInstallView` must skip each split root's `MANIFEST.json` (a measured collision); FU-6/7.
    - -09: A23, B5 compares the claude-visible subset from RS-4.
    - M4 V1–V3 are resolved.
  - **DevOps:** merged cli `6b5ee5c`. The suite ran 2885/2883/0/2, reconciled exactly (2850 + 38 − 3).
    - BD: the payload is byte-identical (NUL-safe digest), and MANIFEST's only delta is `owner`; verify-pack 3c is live and green.
    - Real-dist smokes: no-flag and `--from-source` snapshots end with `hosts: ["claude"]`, and every entry is owner-stamped. Doctor leaves the legacy 0.10.0 snapshot byte-unchanged.
    - Post-BD parity 5/5 and 15/15; the baseline is intact.
  - **-05 prep:** amendments D1–D5 (D4 per M3-A18) were applied and the story re-gated green.
- 2026-09-25T20:40:00Z · M5 plan · `plans/M5.md` (parallel, 56 min):
  - Measured Codex 0.154 contract, offline, with a scripted Responses endpoint ($0):
    - the `spawn_agent` matcher is `.*spawn_agent`;
    - a hook blocks only on exit 2 plus stderr;
    - `apply_patch` payloads carry no `file_path`;
    - trust-gated `.codex/` loading;
    - hook events come from app-server, not `exec --json`.
  - Decisions:
    - generated byte-identical Codex hook copies (AD-1, amends -10 Gherkin 4; reversal path OD2);
    - `openInstallView` for upgrade/doctor;
    - -10 runs in two Developer passes.
  - `waves.json`: wave15 becomes a both-repos wave; RS-4a added; RS-4 procedure written; RS-CLOSE gains the Codex steps. Mid-Sprint Amendment recorded.
  - **Owner action OD1** (surfaced): a one-time `codex login` into the dedicated `CODEX_HOME`, before RS-4 step 5.
- 2026-09-26T00:40:00Z · M6 plan · `plans/M6.md` (parallel, 43 min):
  - -12: Claude stays wave-parallel, Codex runs serial; `dispatch_serial.mjs`; generated Codex `SKILL.md`.
  - -13: a live loop on a throwaway `slugify` project under owner-granted trust, with a scripted run as secondary evidence. Token metering is explicitly unavailable, with a CR to follow.
  - **Owner action at step L:** grant Codex TUI trust (~2 min) and accept live-model quota.
- 2026-09-26T00:50:00Z · STORY-058-05 · **wave9.**
  - **QA-Red** (cli `764f063`, 15 min): 16 reds.
  - **TPV REJECTED** (28 min, `arch_bounces=1`):
    - The fixture's stub `readInstallManifest` (`files: []`) made 4 of 13 reds unsatisfiable and 2 vacuous.
    - 14 of 39 mutants survived, including delete-by-owner vs by-path, the story's safety property.
    - Re-seal R1–R10 (M3-A24..A30); D1–D12 are binding.
    - The harness blocked the architect's report Write ("Subagents should return findings as text"); the orchestrator saved the report from its final message.
  - **Re-seal** (cli `156c864`, 3 min): sha256 matches TPV. The orchestrator reproduced 0/17 and 0/3. Developer dispatched.
  - **Dev** (cli `3617c67`, 16 min): D1–D12 followed with no deviations. Both new files 17/17 and 3/3 on the first attempt; the 50 witnesses are clean.
  - **QA PASS** (9 min) and **post-flight PASS** (16 min):
    - FU-1..10 routed.
    - Binding for -07: M3-A31 (sink adapter), M3-A32 (partial-path gates), M3-A33 (doctor owner plumbing).
    - Binding for -10: M3-A35.
    - T12 and M4 V4 resolved.
  - **INCIDENT (2026-09-26 01:02, local time):** a QA-Verify tsx smoke ran `init --yes --pin 0.0.0-qa` before its `cd`, so a non-force init wrote into the meta-repo. Damage:
    - `.cleargate/.install-manifest.json`, `gate-checks.json`, `.gitignore` and `.mcp.json` rewritten; `.mcp.json` was pinned to `cleargate@0.0.0-qa`, which would break the MCP server on the next session.
    - A new `.cleargate/.gitignore`, and a full wiki build (~300 files, plus 12 new pages).
    - Live `settings.json` was rewritten but stayed canonical-equal. No hook, agent or skill was touched.
    - The orchestrator restored every path to HEAD, verified by the snapshot sha `fa0c79ac…`.
    - New rule (Mid-Sprint Amendment 01:20Z): writing smokes run as `(cd <literal tmp> && node …)`, and the orchestrator checks the outer `git status` after each QA and DevOps dispatch.
  - **DevOps:** merged cli `170ac4c`. Suite 2902/2900/0/2, exact.
    - BD: payload and manifest unchanged.
    - Six real-dist `host` smokes are green. A read-only `host list` in OUTER reports `installed: claude`, 3 retired paths missing, exit 1.
    - The outer repo was untouched (verified).
  - **-07 prep:** E1–E7, including the post-flight corrections, applied; re-gated green.
- 2026-09-26T04:15:00Z · STORY-058-07 · **wave10.**
  - **QA-Red** (cli `23e8280`, 29 min): 41 of 47 red, 5 ambiguities. The orchestrator confirmed #3–#5.
  - **TPV REJECTED** (32 min, `arch_bounces=1`):
    - 4 of 30 reds were unsatisfiable on a conformant build (scenarios 6, 10, 15a, 18).
    - One sealed -03 test goes red by design (Scenario 7, the BUG-089 supersede).
    - 3 binding plan tests were missing (M3-A31/A32 11b–d); 19 mutants survived.
    - Re-seal R1–R10 (patch `7d6a5f6b`); rulings #1 (`--host` narrows at emit only) and #2; M3-A36..A43; E1–E13 binding.
  - **Re-seal** (cli `fe11c1d`, 3 min): hashes match. The orchestrator reproduced 4 files.
  - **Dev** (cli `b146faf`, 25 min): 30/30 new, contract 19/19, parity 5/5 and 15/15 (`user-content` settings hash `123d7bc7…` = T2), 20 witnesses clean. One sanctioned deviation (`confirmTypedName`).
  - **Flashcard gate held:** it blocked the QA and post-flight dispatch until the 2 Dev cards were processed (working as designed).
  - **QA PASS** (8 min).
  - **Post-flight FAIL** (19 min, `arch_bounces=2`, a plan gap):
    - Blueprint (b) left `.claude/settings.json` as `{}` after a full uninstall, so the uninstall's own restore path (re-init) wired 2 of 7 hooks. Main wires 7.
    - Remediation M3-A44: `claude.remove()` unlinks an emptied file; CHANGELOG entries; a whitespace revert.
    - Also: M3-A45 (smokes never `--cwd OUTER`), T11 and M4 V5/V6 resolved, M3-A46..A51 (BUG-085, -10).
    - Two pre-existing defects filed as Drafts: **BUG-092** (P1: init into an existing settings.json wires 2 of 7 hooks) and **BUG-093** (P2: upgrade take-theirs drops user hooks under ClearGate events).
  - **R11 QA-Red** (cli `4394c9b`, 10 min): 4/4 red.
  - **TPV-R11 APPROVED** (16 min): 12 of 13 mutants killed. Survivor l is bound as a Dev constraint. M3-A52: `init --yes` still prompts "Restore preserved items?" after an uninstall, so the smoke uses `</dev/null`.
  - **Dev fix** (cli `384a628`, 5 min): 3 files, D2 numstat 55/0.
  - **QA round 2 PASS** and **post-flight round 2 PASS** (6 min each): re-init restores 7/7 hooks.
  - **Sentinel gap found (M3-A53, binding for BUG-085 and M6):** `pending-task-sentinel.sh` scans only the FIRST `flashcards_flagged` block per report (3 `break`s). Interim: the orchestrator swept every dev/qa report and marked 5 later-block cards; all were already in FLASHCARD.md or were added.
  - **DevOps:** merged cli `b100ea8`. Suite 2944/2942/0/2, exact.
    - BD: payload and manifest unchanged; verify-pack OK (196 files).
    - Smokes green: the legacy-snapshot doctor in a scratch copy, the clean-room matrix, and uninstall → re-init `SMOKE3-OK`.
    - The outer repo was untouched.
  - **Close follow-ups:**
    - FU-5/6/7/12/13
    - `init --yes` prompting after an uninstall (M3-A52)
    - the M3 story Task Breakdown wording "shared by … uninstall" overstates it (FU-6)
  - **Prep done in parallel:** BUG-085 F1–F5; -08 A1–A5; -09 B1–B9 (+FU-16, BUG-090 as the known-fail); -10 E1–E10; -11 F1–F7; -12 H1–H11 (the H7 `build-codex-payload.mjs` surface is deferred until -10 creates it); -13 G1–G10. The stale -12 reports were relocated. Forward pointers were added to M4/M5/M6.

- 2026-09-26T06:55:00Z · BUG-085 · **wave11 — M3 complete.**
  - **QA-Red** (cli `ec29f45`, 32 min): drift-check 20/22 red, doctor-drift-guard 9/12, sentinel cards 10/12, parity Scenario 2 red. It flagged a `captureOrCompare` helper change.
  - **TPV REJECTED** (47 min, `arch_bounces=1`):
    - The two delta rows read `currentHash` from canonical, so parity passed at the red commit (violates M3-A8).
    - 5 mutants survived: session-start exit code, allowed-count drift line, unparseable not blocking, unanchored pin, `README.md` include dropped.
    - Re-seal R1–R7 (patch `7adc1598`); rulings #2 (tree-gated skip) and #3 (the M3-A53 A1 table is corrected); M3-A54..A60; G1–G16.
  - **Re-seal** (cli `8425816`, 4 min): counts match. The orchestrator reproduced 2 files.
  - **Dev** (cli `12ae157` + outer `68fd9426`, 24 min):
    - All counts green; the 3 dist cases were checked on a scratch build (rule 11).
    - Rule-16 files clean; the CLAUDE.md block is unchanged.
    - No deviations.
  - **QA PASS** (8 min). **Post-flight PASS** (24 min): M3-A61 (RS-BUG085 as built, via `b0-live-resync.mjs`), M3-A62 (CLAUDE.md reader-list chore), M4 V7/V8 + M4-A1..A4, M5/M6 pointers (FU-6/7).
  - **FU-1 filed as Draft BUG-094** (P2): `cleargate state validate <id>` always fails after the CR-117 port. The wrapper passes the id positionally. No in-sprint impact; it must be fixed before the next publish.
  - **Orchestrator prep:**
    - Pre-marked the 6 -02 JSON cards and the 5 later-block cards.
    - Stopped a subagent-orphaned test run (`uninstall-reinit` via tsx) that had hung 88 min on the `Restore preserved items?` prompt.
  - **DevOps:** merged outer `ccdeb4b3` and cli `b244551`.
    - Suite 2987/2983/2 fail/2 skip. The 2 fails are the dist-lag cases, green post-BD (13/13).
    - BD: payload delta of exactly 2 files (sentinel, `validate_state.mjs`). New payload baseline `/private/tmp/claude-501/cg5801/payload-baseline-post-085` (identity `e44154af…`).
    - **RS-BUG085 R1–R10 green:** exactly 1 pre-sync drift line; dry-parse 0 unmarked (control blocks); `b0-live-resync.mjs` applied exactly 1 file (sha `444becd2…`, mode 755, pin 0.20.0); post-sync `doctor` is drift-clean (exit 0); SessionStart has no drift line; `validate_state.mjs` is unchanged; bug068 10/10 in canonical and live mode.
    - Worktree and branches removed.
  - **M3-A62 CLAUDE.md chore** applied by the orchestrator. The block hash is unchanged and `doctor` still reports 0 drift.
  - **M3 close — browser check** (`.playwright-mcp/s41-m3-close-dashboard.png`): M3 4/4, 11/17 (65%), 0 in flight, no worktrees.
    - Dashboard observations for the Reporter: `UNATTRIBUTED` holds 15.7B of 22.7B tokens; the "Execution timeline" panel says "No execution log yet" despite a populated §4; `/data` 404s come from the static `http.server`.
  - **Next:** M4 (-08, -09). The live witness for the re-synced sentinel (R10) is the next Agent dispatch.

- 2026-09-26T05:25:00Z · STORY-058-08 · **wave12.**
  - **Live witness R10 (RS-BUG085):** the first dispatch after the re-sync wrote `.pending-task` with `agent_type: qa`; no flashcard-gate block.
  - **QA-Red** (cli `81c05e9`, 21 min): 36/36 red.
  - **TPV REJECTED** (39 min, `arch_bounces=1`): 22 mutants survived; ruling #2 required a direct `findCleargatePackageRoot` test (U17). Re-seal R1–R17 (patch `30e6ff85`); M4-A5..A13; H1–H24.
  - **Re-seal** (cli `549fdaa`): 38/5/9 red; the orchestrator reproduced the unit file.
  - **Dev** (cli `9ac0fa3` + outer `adde0a23`, 23 min): 38/38, 5/5, 9/9; tsx smoke 12/12 PASS.
  - **QA FAIL** (`qa_bounces=1`): `<h>.no-verifier` fired for a registered-but-not-installed `--host` (H17). The clean-room DoD run (the doc followed verbatim, packed artifact, a real haiku S1 session) PASSED with 0 structural doc gaps and 1 fold-back.
  - **Post-flight FAIL** (`arch_bounces=2`): the same H17 defect, plus an R-B crash on a snapshot that parses to `null`, `{}`, `[]` or a string, plus doc inaccuracies. Remediation M4-A14 R-A/R-B/R-C; V9/V12 resolved; M4-A15..A23 for -09.
  - **Round 2:** reds U9c/U11e/U11f (cli `4285391`); Dev fix (cli `fc0184d` + outer `31f266f2`). QA-R2 PASS (R-B re-probed in a new clean-room container built from `fc0184d`). ARCH-R2 PASS, requiring the U9d regression guard (cli `6251f06`, 42/42 green on arrival).
  - **Filed as Draft: BUG-095 (P2).** Upgrade never refreshes `.mcp.json`'s pinned CLI or the CLAUDE.md block (FU-4).
  - **DevOps:** merged outer `cb283bab` and cli `1b742b3`.
    - Suite 3038/3036/0/2, exact.
    - BD: payload identical to the post-085 baseline (`e44154af`); verify-pack OK (196).
    - Real-dist smokes: 12/12 PASS; a deleted payload file is named; a `null` snapshot gives parseable JSON.
    - Worktree and branches removed.
  - **Clean-room containers left for evidence:** `~/Documents/Dev/cg-cleanroom-20260926T042955Z-qa08/` and `…T050106Z-qa08-r2/`.

- 2026-09-26T05:18:26Z · STORY-058-09 · **wave13.**
  - **QA-Red** (cli `eed511c`, 17 min): evidence unit all red, e2e 3 red + 9 anchors, 5 ambiguities.
  - **TPV REJECTED** (38 min, `arch_bounces=1`): B4 room isolation, E5-5 epics line; 63/66 mutants killed after the re-seal. Rulings #1–#3; M4-A24..A32; J1–J13. Re-seal patch `8d43e853`.
  - **Re-seal** (cli `6c5a4c5`): unit 60 red, e2e 3 red + 10; the orchestrator reproduced the unit count.
  - **Dev** (cli `7ce56a2` + outer `22c1e557`, 31 min): unit 60/60, e2e 13/13; artifact inputs byte-neutral (`a7e231b9…0d12`); the 19 sealed files plus parity match exactly.
    - **Run 1 (live, first attempt): PASS.** Claude Code 2.1.283, haiku; container `~/Documents/Dev/cg-cleanroom-20260926T064145Z-claude`. Every gating row is PASS in both the no-flag and `--host all` rooms; `sprint-init` reads `FAIL-KNOWN (BUG-090)` ×2. `check` ×2 exit 0.
    - A doc edit that landed in the main checkout was self-caught and reverted before commit.
  - **QA PASS-PENDING-SMOKE** (8 min). The deferred `check --write-result` belongs to RS-CLOSE. A read-only audit of the container confirmed Run 1 is not vacuous.
  - **Post-flight PASS** (20 min), merge now:
    - Rulings: D1 (`active-sprint` sentinel drive) accepted; D2 accepted; O1 (unsanitised evidence cells, a measured latent fail-open) → fixed before RS-4, Run 1 stays as written.
    - F1 (missing S3 canary) and F2 (host line read from `registered`) are latent until codex registers.
    - All of it routes to M5-A1..A14 in -10 pass B. The Step 2.9 contract is verified.
  - **DevOps:** merged outer `3deb2bc2` and cli `35580b0`.
    - Suite 3098/3096/0/2, exact.
    - BD: payload identical (`e44154af`); verify-pack OK (196/80); post-BD 60/60, 13/13, parity 5/5 + 15/15; `check` from OUTER PASS.
    - Smokes 12/12 ×2. Worktree and branches removed.
  - **Orchestrator:**
    - M5-A10 applied to the -10 story (gate green, 14 criteria).
    - `waves.json` RS-CLOSE `<F5 BUG id>` → `BUG-090`.
    - M6 carry pointer written; -09 Adjacent row added.
  - **M4 close — browser check** (`.playwright-mcp/s41-m4-close-dashboard.png`): M4 2/2, 13/17 (76%), 0 in flight, no worktrees.
    - The same dashboard observations stand: `UNATTRIBUTED` 23.9B of 30.9B, the Execution timeline panel is empty, and `/data` 404s come from the static server.
  - **Kept until RS-4:** the Run 1 container and its two session dirs. Kept until RS-CLOSE: `/private/tmp/cg-s41-m2-init-baseline`.
  - **Next:** M5 (-10 codex adapter, then -11, then RS-4a/RS-4). OD1 codex login is needed at RS-4 step 5.

- 2026-09-26T14:00:00Z · CR-124 re-plan · plans/replan-contract-first.md accepted: remainder runs contract-first — contracts C1 contract/S-41-codex (=STORY-058-10 d0f0d95), C4 contract/S-41-fence (BUG-090 Dev), C2 contract/S-41-dispatch (STORY-058-11 + CR-124 Dev), C3 contract/S-41-loop (STORY-058-12 Dev); nested worktrees OUTER/.worktrees/<ID>/cleargate-cli; 4 build lanes, 1 merge lane, 1 harness lane; waves.json schema_version 2; rules 9 and 11 superseded, 19–21 added; the cli main checkout stays on main; RS-4's live run becomes RS-4L (owner OD1, before RS-CLOSE); RS-CR added after CR-124.
- 2026-09-26T14:10:00Z · STORY-058-10 · Re-plan step 0 ran AFTER pass C, not before: pass C was dispatched in the cli main checkout before the re-plan landed. Pass C committed `393c286` (test 46 scripted codex session 1/1, 10 gating verdicts PASS, ~18 min). The cli main checkout was then switched to `main` (`35580b0`), and -10 moved to `.worktrees/STORY-058-10` (detached outer host plus nested cli worktree). C1 `contract/S-41-codex` = `d0f0d95`; pass C touched only non-frozen harness internals. QA-Verify ∥ post-flight dispatched there. Post-flight FAIL (claude-baseline.mjs unwired, M5-A47) → pass D `b12240b` → QA2 PASS-PENDING-SMOKE + post-flight PASS → DevOps merged `fcb1491` 2026-09-26T15:10Z (arch_bounces=2, qa_bounces=1); BD; RS-4a live re-sync of 4 hooks (pin 0.20.0) — canonical-live-parity 11/11.

**Contract-first ledger (CR-124 dogfood):**

| Item | Base (sha) | Contract | Build start | Dev sha | Integrated on cli main | Re-syncs | QA-Red re-scopes | Merge (outer / cli) |
|---|---|---|---|---|---|---|---|---|
| STORY-058-10 | `35580b0` | owner of C1 `contract/S-41-codex` = `d0f0d95` | 2026-09-25 (serial, pre-re-plan); passes C/D in `.worktrees/STORY-058-10` 2026-09-26 | `560a4f1` A, `d0f0d95` B, `393c286` C, `b12240b` D | yes, no-op (main unchanged at `35580b0`) | 0 | 0 (TPV re-seal before Dev) | — (cli-only) / `fcb1491`; full suite 3309/3307/0/2; BD; RS-4a 11/11 |

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)

**Current Status: 🟢 Low Ambiguity** — scope approved; the Architect's cross-milestone review is done (SDR re-run 2026-09-24); the execution route is ruled (R1–R4); the owner confirmed the plan and authorised kickoff on 2026-09-25.

- [x] Sprint goal is one sentence and names its primary outcome.
- [x] Risks are recorded with mitigations, including the blockers that prevent sprint init.
- [x] Prior work is checked and recorded.
- [x] **Every deliverable resolves to an existing, approved work item.** 13 stories plus 3 bugs; four additions approved by owner continuation. [[CR-123]] added 2026-09-24T21:53:44Z, approved by the owner.
- [x] [[EPIC-058]] is approved and decomposed into 13 stories; the existing proposal-gate waiver is retained.

- [x] [[BUG-067]] is approved and its fix approach is chosen — **locate-the-fence**.
- [x] **[[BUG-085]]'s milestone placement is confirmed by the Architect.** *Ruled by the SDR synth 2026-09-24 (`sprint-runs/SPRINT-41/plans/sdr-halt-2026-09-24.md`): one wave entry at M3 after STORY-058-07; the M0 half is an operational barrier step in the main checkout, not a wave.* §2.1 recommends splitting
      it — M0 re-sync, M3 parity check — because [[STORY-058-01]] relocates the baseline the check
      reads. A bug item spanning two milestones is unusual and needs an explicit ruling.
- [x] `approved: true` is set in the YAML frontmatter.

> **Resolved 2026-09-25.** The two open conditions that held this at 🟡 — the Architect review and the bootstrap execution route — closed with the SDR re-run and owner rulings R1–R4. Readiness predicates remain specification checks, not runtime evidence; the M0 live-enforcement proofs still run at barrier B0.
