---
sprint_id: "SPRINT-07"
remote_id: null
source_tool: "local"
status: "Planned"
start_date: null
end_date: null
activated_at: null
completed_at: null
synced_at: null
created_at: "2026-04-19T19:45:00Z"
updated_at: "2026-04-19T19:45:00Z"
created_at_version: "post-SPRINT-05"
updated_at_version: "post-SPRINT-05"
execution_order: 1
ships_before: "SPRINT-06"
reorder_reason: "2026-04-19 — EPIC-010 Multi-Participant MCP Sync moved ahead of SPRINT-06 Admin UI. Business↔IT transparency is ClearGate's core value proposition; sync must exist before the Admin UI so Business stakeholders can participate from their PM tool natively, not via admin.cleargate.<domain>. Numeric sprint IDs preserved; ship order follows `execution_order`."
context_source: "PROPOSAL-007_Multi_Participant_MCP_Sync.md"
epics: ["EPIC-010"]
approved: true

---

# SPRINT-07: Multi-Participant MCP Sync v1

## Sprint Goal

Ship **EPIC-010 (Multi-Participant MCP Sync, v1)** end-to-end — bidirectional sync between ClearGate's local markdown state and the remote PM tool (Linear first concrete adapter; generic `PmAdapter` interface for Jira / GitHub Projects later). After this sprint, (a) a Business stakeholder can draft a proposal in Linear tagged `cleargate:proposal` and have it land in `.cleargate/delivery/pending-sync/` automatically on the next `cleargate sync`; (b) two developers sharing a repo see each other's pushed items without re-drafting; (c) local content edits and remote status changes reconcile via a three-way-merge prompt (content+content) or a silent remote-wins (status+status) with full sync-log attribution; (d) every push carries `pushed_by` + `pushed_at`; (e) the SessionStart hook nudges "N remote updates since yesterday" once per 24h. This Epic is the **product's core value proposition** — without it ClearGate is a single-developer tool, with it Business and IT share one backlog from their native tools.

## Consolidated Deliverables

### EPIC-010 — Multi-Participant MCP Sync v1 (8 stories)

- [`STORY-010-01`](STORY-010-01_Identity_And_SyncLog_Foundation.md): Identity resolver + sync-log library + template frontmatter fields — participant.json at `cleargate init`, precedence `.participant.json → CLEARGATE_USER → git → host`, append-only `sync-log.jsonl`, 5 templates gain `pushed_by` / `pushed_at` / `last_pulled_*` / `source` · **L2**
- [`STORY-010-02`](STORY-010-02_MCP_Pull_And_List_Endpoints.md): Four new MCP endpoints + generic `PmAdapter` interface — `cleargate_pull_item`, `list_remote_updates`, `pull_comments`, `detect_new_items`; `PmAdapter` interface in `mcp/src/adapters/` with `linear-adapter.ts` as v1 concrete impl · **L3**
- [`STORY-010-03`](STORY-010-03_Conflict_Detector_And_Merge_Helper.md): Conflict detector + three-way merge helper — pure `classify()` over PROP-007 §2.3 matrix (8 states); CLI `promptThreeWayMerge` with `[k]eep / [t]ake / [e]dit / [a]bort` · **L2**
- [`STORY-010-04`](STORY-010-04_Cleargate_Sync_Driver.md): `cleargate sync` / `pull` / `conflicts` / `sync-log` commands + frontmatter merge helper — driver enforces pull → detect → resolve → push ordering; `--dry-run`; single-item `pull <ID>`; halted-conflict surfacing · **L3**
- [`STORY-010-05`](STORY-010-05_Stakeholder_Proposal_Intake.md): Stakeholder-authored proposal intake via `cleargate:proposal` label — sync-driver branch that writes `PROPOSAL-*-remote-*.md` with `source: "remote-authored"`, idempotent on re-sync · **L2**
- [`STORY-010-06`](STORY-010-06_Comments_Snapshot_Wiki.md): Comments-as-snapshot + wiki integration — `pull_comments` for active items (current sprint + last 30d); `## Remote comments` section in wiki; `--comments` flag for manual refresh; 429 = silent skip · **L2**
- [`STORY-010-07`](STORY-010-07_Push_Gate_And_Revert.md): Push-time gate enforcement + attribution + `push --revert` — MCP refuses `approved: false`; stamps `pushed_by` from JWT; CLI `push --revert` soft-reverts via status push; no remote delete · **L2**
- [`STORY-010-08`](STORY-010-08_Protocol_Section_14_And_Session_Hook.md): Protocol §14 "Multi-Participant Sync" + SessionStart pull-suggestion hook — 9 non-negotiable rules in `.cleargate/knowledge/cleargate-protocol.md`; daily-throttled drift nudge; `cleargate sync --check` read-only subcommand · **L2**

**Total: 8 stories, 1 Epic. Complexity: 2 × L3 + 6 × L2.**

## Risks & Dependencies

**Status legend:** `open` (captured, mitigation not yet proven) · `mitigated` (mitigation implemented + verified green by QA) · `hit-and-handled` (fired during sprint; recovery recorded in FLASHCARD + below) · `did-not-fire` (sprint closed without occurrence). QA updates `status` at each milestone gate; reporter audits final column in `REPORT.md`.

| ID | Risk | Mitigation | Owner | Status |
|---|---|---|---|---|
| R1 | **Generic `PmAdapter` interface locked too early to Linear idioms.** If interface is Linear-shaped, v1.1's Jira / GH Projects adapter breaks it. | Architect M2 review: diff `PmAdapter` shape against Jira REST + GH Projects v2 GraphQL BEFORE story starts. Interface = 4 verbs + abstract shapes; Linear specifics under `RemoteItem.raw`. Findings in `mcp/src/adapters/README.md`. | **STORY-010-02** (+ Architect M2 plan) | `open` |
| R2 | **Sync-ordering invariant broken** (driver pushes before pull finishes). Reversal amplifies conflicts silently. | Hard unit test mocks adapter + asserts `pull → push` call order. Architect M3 plan names the invariant. FLASHCARD on landing: `#sync #ordering`. | **STORY-010-04** | `open` |
| R3 | **Conflict matrix (PROP-007 §2.3) has gaps.** Real-world collisions (concurrent delete-and-create, remote-renamed-title, CR-vs-Story type mismatch) may fall outside the 8 states. | Tests cover all 8 states + explicit `"unknown"` fallthrough that halts sync with clear message. Never guess; surface. 9th/10th state = v1.1 proposal amendment. | **STORY-010-03** | `open` |
| R4 | **Linear API rate limits during comment pulls.** Large sprint × 5-sync/day ≈ 250+ comment calls/day. | 429 → silent skip + sync-log `result=skipped-rate-limit`. Ship `--skip-comments` flag in-sprint (not deferred). Ops: dedicated per-project API token. | **STORY-010-06** (+ Ops DoD) | `open` |
| R5 | **Participant identity mismatch.** Local `.participant.json=a@x.com` but CI env `CLEARGATE_USER=ci-bot@x.com` creates confusing audit trail. | Identity resolver logs `source` (participant-json / env / git / host) on every sync-log entry. Per-repo `.participant.json` is documented as source-of-truth; env override for CI is expected. Protocol §14. | **STORY-010-01** (resolver) + **STORY-010-08** (protocol) | `open` |
| R6 | **Wiki comment section drift on re-render.** Loose delimiter regex → duplicate sections / orphan openers. | Exact-match delimiter regex (no fuzzy whitespace). Tests: insert / replace / remove / double-run idempotency. Reuses EPIC-009 `#regex #inject-claude-md` lesson. | **STORY-010-06** | `open` |
| R7 | **SessionStart hook adds latency to session boot.** MCP round-trip could add 500ms–2s. | Hook caps at 3s timeout (`timeout 3 npx cleargate sync --check`). Timeout / non-zero exit → silent, session proceeds. Marker-file throttling ≤1 call / 24h / repo. | **STORY-010-08** | `open` |
| R8 | **Back-compat lint noise on large archives.** 57 archived items lack `pushed_by` / `last_remote_update`; error-level lint would block gates. | Rule `R-014 sync-attribution-missing` is **warn**, never error. Per-item suppression via `lint_ignore:` array. | **STORY-010-01** (frontmatter + rule) + **STORY-010-08** (protocol ref) | `open` |
| R9 | **Two-terminal E2E infrastructure gap.** Real "Dev A pushes, Dev B pulls" needs 2 scratch clones; existing harness is single-machine vitest. | M3/M4 milestone includes one scripted E2E using 2 scratch dirs against deployed MCP. Manual run, recorded in `mcp/coolify/DEPLOYMENT.md`-style doc. Automation gap accepted for v1. | **M3/M4 sprint-level** (no single-story owner) | `open` |
| R10 | **`cleargate:proposal` label missing on fresh workspace.** Stakeholder tags + syncs → zero intake because label isn't findable. | Ops DoD creates label pre-sprint. Protocol §14 names it. `cleargate sync --check` warns if zero items match label filter on first run. | **STORY-010-05** (diagnostic) + **STORY-010-08** (Protocol §14) + **Ops DoD** | `open` |

**Dependencies:**
- EPIC-003 (MCP Server Core) — **shipped** in SPRINT-01 ✓. JWT + rate-limit middleware reused as-is.
- EPIC-001 (Document Metadata Lifecycle) — **shipped** in SPRINT-05 ✓. Provides `created_at` / `updated_at` / `codebase_version` stamping primitives used by conflict detector.
- EPIC-002 (Knowledge Wiki Layer) — **shipped** in SPRINT-04 ✓. `wiki-ingest` subagent extended in STORY-010-06 for `## Remote comments`.
- EPIC-008 (Token Cost + Readiness Gates) — **shipped** in SPRINT-05 ✓. STORY-010-07 reuses the `cached_gate_result` frontmatter field for push-time gate check (non-blocking in this Epic; EPIC-008 owns the authoritative pre-push check).
- New runtime deps: `diff` (pin from EPIC-009, already in CLI tree). No new MCP deps — Linear SDK pin is existing.
- External infra: Linear workspace with API access + `cleargate:proposal` label created pre-sprint.

## Metrics & Metadata

- **Expected Impact:** Closes PROPOSAL-007's v1 scope (6 of 9 IN-SCOPE items ship; remaining deferrals are v1.1). Delivers the Business↔IT bridge: stakeholders drafting in Linear flow into ClearGate; pushed work carries attribution; conflicts resolve deterministically. **This Epic is what makes ClearGate a team tool rather than a single-developer tool.** Unblocks the public v0.9 "multi-participant alpha" narrative.
- **Priority Alignment:** Platform priority = **Critical** (core value proposition). Codebase priority = **High** (8 stories touch CLI + MCP + protocol + templates + hooks — most cross-cutting Epic post-SPRINT-01).

---

## Execution Guidelines (Local Annotation — Not Pushed)

### Starting Point

**M1 — STORY-010-01 lands first.** Identity resolver + sync-log lib + template frontmatter fields are the foundation everything else imports. Blocks M2, M3, M4 entirely. Single-story milestone; finish on one Developer assignment.

### Relevant Context

- **PROPOSAL-007 is the architecture source of truth.** `.cleargate/delivery/pending-sync/PROPOSAL-007_Multi_Participant_MCP_Sync.md` — `approved: true` as of 2026-04-19. All 11 interrogation answers inline in §4. Sync matrix (§2.2), conflict rules (§2.3), identity model (§2.4), collaboration scenarios A–D (§2.5).
- **EPIC-010 is the shadow spec.** §4 Technical Grounding holds the exact matrix + enums + JSON shapes. §6 epic-level resolutions clarify story decomposition (8 medium), adapter strategy (generic interface, Linear concrete), identity scope (per-repo bound to user), comment cadence (every sync + `--comments` manual), back-compat (lint warn only).
- **Generic `PmAdapter` interface pattern** (STORY-010-02): the interface defines 4 verbs (`pullItem`, `listUpdates`, `pullComments`, `detectNewItems`) + abstract data shapes. Linear-specific fields live in `RemoteItem.raw`. Architect validates interface against Jira / GitHub Projects shape docs before the story starts.
- **FLASHCARD references to pre-read:** `#sync` (none yet — this Epic creates them), `#regex` (EPIC-009 lessons for delimiter handling in comments section), `#template` (EPIC-001 lessons for adding optional frontmatter fields without breaking existing lint).
- **Linear workspace setup required pre-sprint:** create `cleargate:proposal` label; issue a project-scoped API token for MCP; capture in ops secrets doc.

### Constraints

- **MCP stays a pure adapter.** No business logic server-side (conflict detection, merge, state reconciliation are all CLI-side). MCP only translates local drafts ↔ PM-tool API calls.
- **Pull always before push within `cleargate sync`.** Enforced by unit test; never refactored around.
- **No real-time / websockets / long-running daemons.** `cleargate sync --watch` is v1.1.
- **Single-remote only.** One ClearGate project ↔ one PM project. Multi-remote federation is v1.1.
- **No content attribution per-edit.** Use `git blame`; sync-log is op-level only.
- **No auto-push ever.** Every push is explicit (`cleargate push` or `cleargate sync` after user confirms). SessionStart pulls-suggest only.
- **Tokens never logged.** JWT and API tokens do not appear in sync-log, stdout, or wiki. Grep assertion in STORY-010-07 DoD.
- **FLASHCARD.md stays git-tracked shared** (no per-participant split).
- **Comment pull is read-only.** Never write comments back to the PM tool.

### Milestones within sprint

1. **M1 — Foundations (STORY-010-01):** identity resolver + sync-log lib + template frontmatter additions. Single Developer. Unit-test heavy (≥11 unit tests). Blocks everything else.
2. **M2 — MCP + conflict logic (STORY-010-02 + STORY-010-03):** parallel across 2 Developers. 02 is the L3; 03 is the L2. Architect may carve `PmAdapter` interface into its own sub-story if 02 lands heavy (>1.5 days). Linear fixtures recorded in this milestone for use by later stories.
3. **M3 — Driver + stakeholder intake (STORY-010-04 + STORY-010-05):** sequential. 04 ships the `cleargate sync` orchestrator; 05 extends 04 with the intake branch. Two-terminal E2E attempted here (may retry in M5).
4. **M4 — Enrichment + hardening (STORY-010-06 + STORY-010-07):** parallel across 2 Developers. 06 is comments-to-wiki; 07 is push-gate + revert. Both consume M1–M3 libs; independent file surfaces.
5. **M5 — Protocol + hook closeout (STORY-010-08):** sequential. Protocol §14 authored with all shipped behavior reflected; SessionStart hook + `cleargate sync --check` subcommand added. Scaffold-mirror discipline verified (dogfood `.cleargate/knowledge/` diff vs `cleargate-planning/.cleargate/knowledge/` = empty).

### Sprint Definition of Done

**Engineering DoD**

- [ ] All 8 Stories merged (EPIC-010-01 through 08)
- [ ] `npm run typecheck` clean in `mcp/` and `cleargate-cli/`
- [ ] `npm test` green in `mcp/` — new integration suites: `sync/pull-item.test.ts`, `sync/list-updates.test.ts`, `sync/pull-comments.test.ts`, `sync/detect-new.test.ts`, `sync/push-gate.test.ts`
- [ ] `npm test` green in `cleargate-cli/` — new unit suites: `identity.test.ts`, `sync-log.test.ts`, `conflict-detector.test.ts`, `merge-helper.test.ts`, `sync.test.ts`, `pull.test.ts`, `conflicts.test.ts`, `push-revert.test.ts`, `slug.test.ts`, `frontmatter-merge.test.ts`
- [ ] Two-terminal E2E verified by hand at least once: Developer A drafts + pushes STORY-999-01; Developer B on scratch clone runs `cleargate sync` and sees STORY-999-01 locally
- [ ] Stakeholder intake E2E verified by hand: tag a Linear sandbox issue `cleargate:proposal`; run `cleargate sync`; verify `pending-sync/PROPOSAL-*-remote-*.md` created
- [ ] Content-conflict E2E verified by hand: simulate concurrent local + remote edit; confirm 3-way merge prompt fires; test `[k]`, `[t]`, `[e]`, `[a]` each resolve correctly
- [ ] Protocol §14 present in BOTH `cleargate-planning/.cleargate/knowledge/cleargate-protocol.md` and `.cleargate/knowledge/cleargate-protocol.md`; diff between them is empty
- [ ] Wiki rebuild clean (`cleargate wiki build` 0 errors); wiki-lint green on all EPIC-010 + STORY-010-* pages
- [ ] Back-compat lint warnings limited to rule `R-014 sync-attribution-missing`; no error-level drift on archived items
- [ ] No tokens / JWT fragments appear in any sync-log entry (`rg "eyJ" .cleargate/sprint-runs/SPRINT-07/sync-log.jsonl` = zero matches)

**Ops DoD**

- [ ] Linear workspace has `cleargate:proposal` label created (or renamed from existing equivalent) and verified by a `detectNewItems` smoke call
- [ ] Project-scoped API token issued for MCP's Linear access; rotated into Coolify env
- [ ] MCP redeployed on Coolify with 4 new tool registrations visible via `/mcp/tools/list` endpoint
- [ ] Architect-reviewed `PmAdapter` interface diffed against Jira REST + GitHub Projects v2 shapes; findings recorded in `mcp/src/adapters/README.md`
- [ ] SessionStart hook verified in a fresh shell: it prints on drift, stays silent otherwise, does not block session boot on MCP failure
- [ ] Per-participant `.cleargate/.participant.json` set for at least one developer (verified by `cat`)
- [ ] Sprint retrospective (REPORT.md) authored by reporter agent

**Carryover from SPRINT-06 → SPRINT-07 (none in that direction — SPRINT-06 now ships AFTER SPRINT-07).** Non-blocking SPRINT-06 prep items:
- [ ] SPRINT-06 Admin UI sprint's `execution_order: 2` annotation present (done 2026-04-19)
- [ ] INDEX.md sprint table reflects new ship order (done 2026-04-19)

### Scope adjustments to watch for mid-sprint

- **If `PmAdapter` interface review surfaces a Linear-specific bias** → pause STORY-010-02; reshape the interface; re-verify against the two other PM tools before resuming. Acceptable to slip the sprint end date by 2–3 days; unacceptable to ship a Linear-shaped "generic" interface.
- **If Linear API rate-limits bite during integration testing** → ship `--skip-comments` flag in STORY-010-06 (already planned but may graduate from fallback to default for large sprints). Add per-project throttle config in v1.1.
- **If content-conflict three-way merge UX is confusing in real use** (architect or Developer finds the inline patch diff unreadable on narrow terminals) → fall back to writing the 3 versions to temp files and opening $EDITOR with git-merge-markers as the default, rather than inline. `merge-helper.ts` supports this path already; change only the default resolution.
- **If two-terminal E2E reveals a conflict the §2.3 matrix doesn't cover** → add a 9th state `"unknown"` that halts sync with "conflict shape not recognized — please resolve manually and report" rather than silently doing the wrong thing. Do not ship a guess.
- **If the `cleargate:proposal` label naming collides with an existing Linear tag convention** → configurable via `CLEARGATE_PROPOSAL_LABEL` env; defaults remain the same. Ops note in the runbook.
- **If the SessionStart hook adds > 1s to session boot in practice** → lower the throttle to once per 48h; add `CLEARGATE_DISABLE_SYNC_HOOK=1` env opt-out.

### Commit cadence

One commit per Story = **8 commits**. Setup commits allowed for: (a) Linear workspace label creation (ops-side — no code commit); (b) `.gitignore` additions for `.cleargate/.participant.json`, `.cleargate/.comments-cache/`, `.cleargate/.sync-marker.json`, `.cleargate/.conflicts.json` (lands with STORY-010-01 or -06, whichever ships first). Budget: up to 1 setup commit + 8 story commits = **9 commits max**. STORY-010-02 may split into 2 commits if architect carves the `PmAdapter` interface into its own prep story; if so, **10 commits max**.

### Next Sprint Preview

**SPRINT-06 Admin UI** (now ships SECOND per `execution_order`): 12 stories — EPIC-006 Admin UI (10) + STORY-004-08 (`/auth/exchange`) + STORY-005-06 (`cleargate-admin login`). Deferred twice (SPRINT-04 → SPRINT-05 → originally SPRINT-06; now SPRINT-07→SPRINT-06 ship-order swap). Sprint file unchanged in content; only frontmatter annotation updated.

**SPRINT-08+ candidates** (post–Admin-UI): EPIC-010 v1.1 deferrals — `cleargate sync --watch`, webhook-driven push, FLASHCARD personal/shared split, multi-remote federation. Plus any new proposals surfaced during real multi-participant use (PROP-007 §2.3 matrix may need amendment based on real-world conflicts).
