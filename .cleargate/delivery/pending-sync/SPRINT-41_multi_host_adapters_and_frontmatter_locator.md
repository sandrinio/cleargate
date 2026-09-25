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
updated_at: 2026-09-11T22:25:54Z
created_at_version: cleargate@0.26.1
updated_at_version: 11c29fd3-dirty
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
  last_stamp: 2026-09-04T19:08:53Z
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

| Story ID | Title | Lane | Milestone | Parallel? | Bounce Exposure |
|---|---|---|---|---|---|
| `BUG-085` | Live `/.claude/` re-sync, then durable meta-repo drift detection | standard | M3 | n | low |
| `BUG-067` | Frontmatter locator: find the fence, don't require offset 0 (3 call sites) | standard | M0 | n | med |
| `STORY-058-01` | Tracked `scaffold/core` + `scaffold/hosts/claude` payload layout | standard | M1 | n | high |
| `STORY-058-02` | Repoint scaffold-source validation + manifest builder; drop the sibling dependency | standard | M1 | n | med |
| `STORY-058-03` | `HostAdapter` contract, registry, behavior-preserving Claude adapter | standard | M2 | n | med |
| `STORY-058-04` | `cleargate init --host` selector parsing and profile expansion | standard | M2 | y | med |
| `STORY-058-05` | `cleargate host` list/add/remove lifecycle commands | standard | M3 | y | med |
| `STORY-058-06` | Install-manifest host ownership fields with legacy snapshot migration | standard | M3 | y | med |
| `STORY-058-07` | Per-host scoping of doctor, upgrade, uninstall, prune | standard | M3 | n | med |
| `STORY-058-08` | Clean-room verification procedure + `cleargate verify-install` driver | standard | M4 | y | low |
| `STORY-058-09` | Clean-room Claude regression baseline (no-flag and `--host all`) | standard | M4 | y | low |
| `STORY-058-10` | Codex payload surfaces: hooks.json, config.toml MCP, `AGENTS.md` injection | standard | M5 | n | med |
| `STORY-058-11` | Codex role/skill translation + harness-neutral repo-root shim | standard | M5 | y | med |
| `STORY-058-12` | Host dispatch-mode split: Task-based parallel dispatch (Claude) vs serial fallback (Codex) | standard | M6 | n | med |
| `STORY-058-13` | Codex end-to-end loop evidence: one real story through Architect→QA-Red→Developer→QA-Verify | standard | M6 | n | low |
| `BUG-089` | PreToolUse gates exit 1, which Claude Code does not treat as blocking — both gates fail open | standard | M0 | n | low |
| `CR-123` | SPIDR coverage for Story/CR/Bug, `spidr-coverage` predicate, Gherkin pointer + error-path fixes | standard | M1 | n | med |

**Milestone column (plain values, so the dashboard groups correctly):** BUG-085 also runs the M0 barrier step B0 (§2.1) before its M3 wave; STORY-058-05 sits in M3 after -06 (SDR 2026-09-24); CR-123 runs as wave3, after M0 and before STORY-058-01.

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
