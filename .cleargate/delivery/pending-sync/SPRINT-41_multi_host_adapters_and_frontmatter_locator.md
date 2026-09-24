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
end_date: 2026-09-26
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
| `BUG-085` | Live `/.claude/` re-sync, then durable meta-repo drift detection | fast | M0 + M3 | n | low |
| `BUG-067` | Frontmatter locator: find the fence, don't require offset 0 (3 call sites) | fast | M0 | n | med |
| `STORY-058-01` | Tracked `scaffold/core` + `scaffold/hosts/claude` payload layout | standard | M1 | n | high |
| `STORY-058-02` | Repoint scaffold-source validation + manifest builder; drop the sibling dependency | standard | M1 | n | med |
| `STORY-058-03` | `HostAdapter` contract, registry, behavior-preserving Claude adapter | standard | M2 | n | med |
| `STORY-058-04` | `cleargate init --host` selector parsing and profile expansion | standard | M2 | y | med |
| `STORY-058-05` | `cleargate host list \| add \| remove` lifecycle commands | standard | M2 | y | med |
| `STORY-058-06` | Install-manifest host ownership fields with legacy snapshot migration | standard | M3 | y | med |
| `STORY-058-07` | Per-host scoping of doctor, upgrade, uninstall, prune | standard | M3 | n | med |
| `STORY-058-08` | Clean-room verification procedure + `cleargate verify-install` driver | standard | M4 | y | low |
| `STORY-058-09` | Clean-room Claude regression baseline (no-flag and `--host all`) | standard | M4 | y | low |
| `STORY-058-10` | Codex payload surfaces: hooks.json, config.toml MCP, `AGENTS.md` injection | standard | M5 | n | med |
| `STORY-058-11` | Codex role/skill translation + harness-neutral repo-root shim | standard | M5 | y | med |
| `STORY-058-12` | Host dispatch-mode split: Task-based parallel dispatch (Claude) vs serial fallback (Codex) | standard | M6 | n | med |
| `STORY-058-13` | Codex end-to-end loop evidence: one real story through Architect→QA-Red→Developer→QA-Verify | standard | M6 | n | low |
| `BUG-089` | PreToolUse gates exit 1, which Claude Code does not treat as blocking — both gates fail open | standard | M0 | n | low |
| `CR-123` | SPIDR coverage for Story/CR/Bug, `spidr-coverage` predicate, Gherkin pointer + error-path fixes | standard | after M0, before STORY-058-01 (Architect confirms) | n | med |

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

*(Seeded at decomposition from the story set's own declared dependencies and shared files. The
Architect refines §2.1–2.5 during Sprint Design Review and owns the final wave assignment.)*

### 2.1 Phase Plan

- **M0 (sequential, blocking):** implement BUG-089's shared Claude block-signal handler first; perform BUG-085's targeted, backed-up live re-sync; start a new Claude session and prove actual edit/dispatch denials plus permitted-action controls and correct dispatch identity; then implement BUG-067. BUG-089 must not wait for M5. No normal feature wave proceeds on unverified enforcement.
- **Bootstrap constraint:** the current Codex session has no Workflow tool and the installed sprint-execution skill still requires it. No story execution is authorized outside that contract. Use a Workflow-capable Claude session for the bootstrap, or obtain an explicit bootstrap exception before implementing from Codex. Any pre-repair dispatch has untrusted enforcement/attribution and must be labelled as such, not presented as normal green-loop evidence.
- **BUG-085 spans M0 and M3:** M0 is the operational live re-sync and proof. M3 implements detect-and-warn against the relocated canonical source, after STORY-058-01/-02 and alongside per-host doctor work. No auto-overwrite, no target-repo manifest-hash check this sprint, and no Done transition after only the M0 half. Architect placement review remains required.
- **M1 → M2 → M3 → M4 → M5 → M6:** milestones are sequential. In M2, -04 and -05 may share a wave only after -03 and after shared-file review. In M3, -06 precedes -07. In M4, -08 precedes -09 because the baseline consumes the driver. In M5, -10 precedes -11. M6 is owner-approved: -12 then -13, after both M5 items.
- **M6 success:** standalone Codex `0.154.0-alpha.6.2`, a dedicated config/install path, recorded checksum, and human trust of the exact hook content. Four role dispatches plus a DevOps merge prove transport; required hook firing and actual negative-control denials prove enforcement. Both must pass for the Codex-port goal. Unavailable token usage is disclosed without fabricated zero rows.

### 2.2 Merge Ordering (Shared-File Surface Analysis)

| Shared File | Stories Touching It | Merge Order | Rationale |
|---|---|---|---|
| `cleargate-cli/src/commands/init.ts` | STORY-058-01, -03, -04, -10 | 01 → 03 → 04 → 10 | 01 moves the payload source; 03 introduces the adapter seam; 04 adds host selection on top; 10 registers the Codex adapter into the resolved set |
| `cleargate-cli/src/lib/manifest.ts` | STORY-058-02, -06, -07 | 02 → 06 → 07 | 02 widens classification to the new roots; 06 adds ownership fields; 07 consumes them |
| `cleargate-cli/src/wiki/parse-frontmatter.ts` | BUG-067 | first | Read-path call site; no other story touches it |
| `cleargate-cli/src/commands/doctor.ts` | BUG-085, STORY-058-07 | after 01/02/06; serialize within M3 | Architect chooses the shared helper order; the meta-repo check must use the relocated canonical baseline and respect host scope |
| `.claude/**` (live, gitignored) | BUG-089, BUG-085, STORY-058-01, -09, -10, -11, -12 | 089 repair → 085 re-sync → fresh session | Back up exact targets, preserve local additions; re-sync later canonical changes deliberately at boundaries, never mid-dispatch |
| `cleargate-planning/.claude/skills/sprint-execution/SKILL.md` | STORY-058-12, CR-123 | CR-123 → 12 (12 after -10, -11) | Dispatch-mode split edits the orchestration playbook itself — canonical edit, needs the live `.claude/` re-sync per CLAUDE.md's Dogfood split section; exact two-pointer canonical diff plus a generated Codex core and serial fragment is specified in STORY-058-12 |
| `cleargate-planning/.cleargate/templates/{story,CR,Bug,epic}.md`, `cleargate-planning/.cleargate/knowledge/readiness-gates.md` | CR-123; STORY-058-01 copies the whole `.cleargate/**` tree into `cleargate-cli/scaffold/core/**` | CR-123 → 01 | Landing first lets -01 carry the edits in its byte-identical copy; landing after means CR-123 must edit the relocated `scaffold/core` copies instead |
| `cleargate-planning/.claude/agents/qa.md` | CR-123; STORY-058-11 generates `.codex/agents/*.toml` from canonical agent markdown at build time | CR-123 → 11 | Build-time generation picks the edit up either way; landing first avoids a regenerate |
| `cleargate-cli/src/lib/readiness-predicates.ts` | CR-123 | alone | No other SPRINT-41 item touches it |

### 2.3 Shared-Surface Warnings

- `init.ts` is touched by `STORY-058-01`, `-03`, `-04`, and `-10` — the highest conflict surface in the sprint. Serialize.
- BUG-067 touches `stamp-frontmatter.ts`, `stamp-tokens.ts`, and `parse-frontmatter.ts` together by
  design; its blast-radius note is explicit that fixing a subset "would read as fixed" while leaving
  the defect live. Do not split it across stories.
- **`BUG-085` vs `STORY-058-01` is a baseline-moves-under-you hazard, not a merge conflict.** They
  edit different files, so no VCS conflict will surface — but `-01` relocates the canonical scaffold
  that `BUG-085`'s check reads. A parity check written in M0 passes its own tests and then silently
  compares against a directory that no longer exists. Architect must confirm the check's baseline is
  resolved from the manifest/payload source rather than a hardcoded `cleargate-planning/` path.
- **`BUG-085`'s re-sync changes hook behaviour for every subsequent dispatch in this sprint.** That is
  the point, but it means the sprint's own token ledger will be discontinuous at the M0 boundary. The
  Reporter must treat pre-re-sync rows as unattributable rather than averaging across the seam.

- **CR-123 is off the goal's critical path** (`GOAL_RELATION: off critical path`). It must not enter M0, which is enforcement repair only. Its live-tree registration of `spidr-coverage` waits for the CLI build that evaluates it (CR-123 §2); until then every story, CR and bug gate check would throw on the unknown predicate.

### 2.4 Lane Audit

| Story | Lane | Rationale (≤80 chars) |
|---|---|---|
| `BUG-085` | fast | Targeted re-sync plus bounded doctor predicate; review M3 scope |
| `BUG-089` | standard | New shared CLI handler plus fail-closed hooks and real-host proof |
| `BUG-067` | fast | Single-mechanism locator fix; red test already exists as CR-108 N6b |
| `CR-123` | standard | New predicate + four templates + gate doc + two agent prompts, cross-repo |

### 2.5 ADR-Conflict Flags

- **Codebase / PM-Tool Boundary (CLAUDE.md):** EPIC-058 adds no PM-tool SDK; adapters use documented
  file and process contracts only. No conflict.
- **Dogfood split (CLAUDE.md):** STORY-058-01 relocates the canonical scaffold into `cleargate-cli`,
  which changes the canonical→payload→live propagation path documented in CLAUDE.md. That
  documentation must be updated in the same story, not after.
- **OD-3 `<instructions>`-verbatim scaffold contract:** BUG-067 must NOT be fixed by stripping
  `<instructions>`. Its §4 pins the fix in the frontmatter locator; OD-3 ruled no-stripping on
  measured evidence.

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

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)

**Current Status: 🟡 Medium Ambiguity** — scope is approved; the Architect's cross-milestone placement review and bootstrap execution route remain unresolved.

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

> **Why this remains 🟡.** Owner scope approval is complete, but the Architect review is not. Passing CLI readiness predicates is not authority to check that box or to bypass the installed dispatch contract.
