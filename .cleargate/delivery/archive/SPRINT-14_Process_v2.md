---
sprint_id: SPRINT-14
source_tool: local
status: Completed
start_date: 2026-04-27
end_date: 2026-05-10
created_at: 2026-04-26T00:00:00Z
updated_at: 2026-04-26T00:00:00Z
created_at_version: cleargate@0.5.0
updated_at_version: cleargate@0.5.0
context_source: "Conversation 2026-04-26 — user requested process-tightening sprint. Path A (ambitious) chosen: 3 process CRs + EPIC-022 (PROPOSAL-013 → Lane Classifier) + small-wins sweep. PROPOSAL-013 hard prereq EPIC-013 verified Completed 2026-04-21. PROPOSAL-013 awaits Gate 1 approval at sprint kickoff."
epics:
  - EPIC-022
crs:
  - CR-008
  - CR-009
  - CR-010
bugs:
  - BUG-008
  - BUG-009
proposals:
  - PROPOSAL-013
approved: true
approved_at: 2026-04-26T00:00:00Z
approved_by: sandrinio
activated_at: 2026-04-26T00:00:00Z
execution_mode: v2
human_override: false
draft_tokens:
  input: null
  output: null
  cache_read: null
  cache_creation: null
  model: null
  sessions: []
cached_gate_result:
  pass: null
  failing_criteria: []
  last_gate_check: null
sprint_cleargate_id: SPRINT-14
children:
  - "[[STORY-014-01]]"
  - "[[STORY-014-02]]"
---

# SPRINT-14: Process v2 — Planning-First Enforcement, Lane Classifier, Advisory Gates

## Sprint Goal

Promote ClearGate's process layer from "documentation-as-rules" to "machine-enforced rules." Three things land together:

1. **The framework's value prop becomes mechanical, not advisory.** CR-009 + CR-008 close the loop where hooks silently no-op and the planning-first rule lives only in CLAUDE.md text. After this sprint, an agent in a freshly-init'd repo *cannot* skip triage without being intercepted, and a missing CLI surfaces a loud preflight error instead of zero signal.
2. **Push semantics stop being all-or-nothing.** CR-010 converts `cached_gate_result.pass !== true` from a hard reject into a PM-tool advisory tag, unblocking the 24 items currently stuck at gate-check (mostly product-side answers a non-coder needs to provide).
3. **The four-agent loop earns a fast lane.** EPIC-022 (decomposed from PROPOSAL-013) ships the Architect-judged lane classifier + Hotfix path. Trivial work stops paying the full ~30–60k-token loop tax that SPRINT-12/13 spent on single-file fixes.

In parallel, a small-wins sweep (BUG-008, BUG-009, STORY-014-01) closes the most expensive paperwork drift: the SessionStart "24 items blocked" banner, missing token-ledger rows for CR/PROPOSAL drafts, and `cleargate doctor`'s unpredictable exit codes.

This is intentionally an ambitious sprint. Path B (split across SPRINT-14/15) was the safer alternative. The user picked Path A — the cost is one sprint of dual surgery (hook chain + reporter contract); the payoff is that SPRINT-15 onwards inherits the new floor without a half-shipped intermediate state.

## 1. Consolidated Deliverables

| Item | Type | Title | Complexity | Parallel? | Bounce Exposure | Milestone |
|---|---|---|---|---|---|---|
| [`CR-009`](CR-009_Hook_CLI_Resolution_Pin_NPX.md) | CR | Hook CLI Resolution — Pin `npx @cleargate/cli@<PIN>` + Loud Preflight | L2 | n | med | M1 |
| [`CR-008`](CR-008_Planning_First_Enforcement.md) | CR | Planning-First Enforcement — Hook Surfaces Doctor Output + Optional Edit Gate (Phase A + B) | L3 | n | high | M1 |
| [`CR-010`](CR-010_Advisory_Readiness_Gates_On_Push.md) | CR | Advisory Readiness Gates on Push — gate-semantic only (label rendering cut to follow-up CR-012-suggested per Architect M1 §6 finding: `pm-adapter.ts` is read-only) | L1 | y | low | M1 |
| `BUG-008` | Bug | Gate-check criteria over-match: (a) `proposal-approved` reads `context_source` prose as a file path, (b) `no-tbds` matches "TBD" inside legitimate words/quoted-checklist-text, (c) `blast-radius-populated` mis-indexes which section to count items in (CR §1 has bullets but counts as 0). Same root class — fix with scoped match logic per criterion. | L2 | y | low | M2 |
| `BUG-009` | Bug | `SubagentStop` hook does not record token-ledger rows for CR / PROPOSAL drafts | L1 | y | low | M2 |
| `STORY-014-01` | Story | `cleargate doctor` exit-code semantics: 0 clean / 1 blocked-items / 2 config-error | L1 | y | low | M2 |
| `STORY-022-01` | Story | Architect Lane Classification — rubric in `architect.md` + protocol §14 | L2 | n | med | M3 |
| `STORY-022-02` | Story | `state.json` schema v2 bump + migration in `update_state.mjs` | L2 | n | med | M3 |
| `STORY-022-03` | Story | Templates: `Sprint Plan Template.md` + `story.md` + `sprint_report.md` lane fields | L1 | n | low | M3 |
| `STORY-022-04` | Story | `pre_gate_runner.sh` demotion mechanics + `LD` event emission | L2 | y | med | M4 |
| `STORY-022-05` | Story | Developer agent lane-aware execution + demotion handler | L2 | y | med | M4 |
| `STORY-022-06` | Story | Hotfix lane — `hotfix.md` template + scaffold mirror + `cleargate hotfix new` + ledger | L3 | y | med | M4 |
| `STORY-022-07` | Story | Reporter Sprint Report v2.1 — adds (a) machine-readable §0 frontmatter for AI N+1-sprint planner, (b) expanded human sections for project team, (c) Fast-Track + Hotfix metrics from PROPOSAL-013, (d) `close_sprint.mjs` validation (sections + naming convention) | L3 | n | high | M5 |
| `STORY-014-02` | Story | Sprint close self-upgrade — `cleargate upgrade` on this repo, refresh live `.claude/` + `.cleargate/{knowledge,templates}/`, bump `cleargate-cli` 0.5.0→0.6.0 + `MANIFEST.json` 0.5.0→0.6.0 + `mcp` 0.1.0→0.2.0, commit | L2 | n | med | M5 |
| `STORY-022-08` | Story | Dogfood — run a known-trivial CR with `lane: fast` end-to-end **against the post-upgrade live dogfood from 014-02**; verify Lane Audit row + LD-event-on-induced-failure + REPORT.md passes new `close_sprint.mjs` validation | L2 | n | med | M5 |

**Totals: 3 CRs + 2 Bugs + 2 stand-alone Stories + 1 Epic (8 Stories) = 15 items.** Complexity: 5×L1 + 7×L2 + 3×L3. No L4.

**Follow-ups filed during sprint (for SPRINT-15+):**
- **CR-012-suggested** (post-CR-010 scope cut): build `pm-adapter.pushItemLabel(...)` write surface so the advisory `gate_failed` rendering can move from a body-prefix string to a real PM-tool tag/label. Verified necessary 2026-04-26 by Architect M1 §6 — adapter is currently read-only.

## 2. Execution Strategy

### 2.1 Phase Plan

**M1 — Process Floor (sequential, blocking everything else):**
- **CR-009 first.** Until hooks resolve to a real CLI, every other improvement is invisible. `npx -y @cleargate/cli@<PIN>` tail-branch in `stamp-and-gate.sh` + `session-start.sh`; loud preflight banner when the CLI fails to resolve.
- **CR-008 second.** Pairs directly with CR-009: same hook chain, same stdout-routing surface. Phase A (route doctor stdout to where Claude reads — drop the `2>/dev/null`). Phase B (`PreToolUse` `pre-edit-gate.sh` blocking `Edit|Write` before triage exists).
- **CR-010 in parallel with CR-008.** Disjoint surface — `mcp/src/tools/push-item.ts` only. Lands when CR-009 is in.

**M2 — Hygiene & Surface Fixes (all parallel, all small):**
- BUG-008 ‖ BUG-009 ‖ STORY-014-01. Three disjoint surfaces. Spawn three Developer agents in worktrees concurrently. Sprint kickoff bookkeeping (BUG-006 archive, BUG-007 wiki re-ingest, hook-log gitignore, gate-writeup sweep) happens before M2 spawns and is not story-tracked.

**M3 — Lane Classifier substrate (sequential):**
- **PROPOSAL-013 Gate 1 approval.** `approved: false → true`. Architect drafts EPIC-022 from the proposal. M3 cannot start until both happen.
- **STORY-022-01 → STORY-022-02 → STORY-022-03.** Rubric (agent + protocol) → schema (state.json v2 + migration) → templates (Sprint Plan + story + sprint report carry the new lane fields). Order matters: 022-02's migration consumes the lane definition from 022-01; 022-03 references the schema from 022-02.

**M4 — Lane Classifier execution (parallel after M3):**
- **STORY-022-04 ‖ STORY-022-05 ‖ STORY-022-06.** Three disjoint code surfaces:
  - 022-04 = `pre_gate_runner.sh` (shell)
  - 022-05 = `.claude/agents/developer.md` (agent contract)
  - 022-06 = template + CLI + ledger (`cleargate-cli/src/commands/hotfix.ts`, new `templates/hotfix.md`, new `wiki/topics/hotfix-ledger.md`)
- All three converge on the schema-v2 `state.json` from M3 but only 022-04 mutates it (writes the LD demotion event); 022-05 reads it; 022-06 writes a new ledger entirely.

**M5 — Lane Classifier finishing + sprint self-upgrade (sequential, last, three-step):**
- **STORY-022-07 first.** Reporter contract change + `close_sprint.mjs` validation. **High-bounce risk** — see §2.3.
- **STORY-014-02 second.** Sprint close-out self-upgrade: run `cleargate upgrade` on this repo to copy the new scaffold canonical from `cleargate-planning/.claude/*` into the live (gitignored) `.claude/`, and from `cleargate-planning/.cleargate/{knowledge,templates}/*` into the corresponding root paths (without touching `.cleargate/{delivery,wiki,sprint-runs,hook-log,FLASHCARD.md}` — those are local data, not scaffold-managed). Bump `cleargate-cli` 0.5.0→0.6.0, `cleargate-planning/MANIFEST.json` 0.5.0→0.6.0, `mcp` 0.1.0→0.2.0. Commit with `chore(SPRINT-14): self-upgrade — bump cleargate 0.5.0 → 0.6.0 + mcp 0.1.0 → 0.2.0`.
- **STORY-022-08 last.** Dogfood end-to-end against the *post-upgrade* live dogfood. Pick a known-trivial CR (or seed a synthetic one), assign `lane: fast`, run the loop, verify Lane Audit row appears, induce a pre-gate failure to verify auto-demotion. Because this story runs after 014-02, it doubles as the upgrade-path regression test on a non-trivial repo (populated `.cleargate/delivery/` + live wiki + ledger).

### 2.2 Merge Ordering (Shared-File Surface Analysis)

| Shared File | Items Touching It | Merge Order | Rationale |
|---|---|---|---|
| `.cleargate/knowledge/cleargate-protocol.md` | CR-008 (planning-first §X), CR-010 (gate semantics §10), STORY-022-01 (lane routing §14) | CR-008 → CR-010 → 022-01 | All three append disjoint sections; serialize to avoid append-conflict noise. |
| `cleargate-planning/.claude/hooks/stamp-and-gate.sh` | CR-009 | — | Single-touch this sprint. **Correction (Architect M1 §6):** earlier draft of this plan erroneously listed CR-008 + BUG-009 as also touching this file; verified 2026-04-26 that CR-008 modifies only `session-start.sh` and BUG-009 modifies `token-ledger.sh`. R-05 mitigation lighter than originally planned. |
| `cleargate-planning/.claude/hooks/session-start.sh` | CR-009, CR-008 | CR-009 → CR-008 | CR-009 owns the resolver tail-branch fix; CR-008 owns stdout routing (drop `2>/dev/null`). Both touch the same file; serialize. |
| `cleargate-planning/.claude/hooks/token-ledger.sh` | BUG-009 | — | Single-touch. BUG-009 adds CR/PROPOSAL work-item-id detection to the SubagentStop hook. Disjoint from CR-008/009. |
| `cleargate-planning/MANIFEST.json` | CR-008 (adds `pre-edit-gate.sh`), CR-009 (pin-aware overwrite), STORY-022-03 (adds hotfix template), STORY-022-06 (adds hotfix scaffold mirror) | CR-008 → CR-009 → 022-03 → 022-06 | Each append is independent; serialize for clean diff history. Manifest version bumps once at sprint close. |
| `mcp/src/tools/push-item.ts` | CR-010, BUG-008 | CR-010 → BUG-008 | CR-010 changes reject semantics; BUG-008 only fixes the `proposal-approved` criterion's path-detection regex (orthogonal but adjacent). |
| `.cleargate/templates/Sprint Plan Template.md` | STORY-022-03 | — | Single-story surface. |
| `.cleargate/templates/story.md` | STORY-022-03 | — | Single-story surface. |
| `.cleargate/templates/sprint_report.md` | STORY-022-03 (lane skeleton), STORY-022-07 (validation enforces) | 022-03 → 022-07 | 022-03 adds the structural skeleton; 022-07 makes it mandatory in `close_sprint.mjs`. |
| `.cleargate/scripts/update_state.mjs` | STORY-022-02, STORY-022-04, STORY-022-05 | 022-02 → 022-04 ‖ 022-05 | 022-02 owns schema v1→v2 migration. 022-04 and 022-05 only call existing flags (`--lane`, `--lane-demote`). |
| `.cleargate/scripts/pre_gate_runner.sh` | STORY-022-04 | — | Single-story surface. |
| `.cleargate/scripts/close_sprint.mjs` | STORY-022-07 | — | Single-story surface; lands after 022-03's template stub exists. |
| `.claude/agents/architect.md` | STORY-022-01 | — | Single-story surface. |
| `.claude/agents/developer.md` | STORY-022-05 | — | Single-story surface. |
| `.claude/agents/reporter.md` | STORY-022-07 | — | Single-story surface. |
| `cleargate-cli/src/commands/wiki.ts` | STORY-022-06 (`cleargate hotfix new`) | — | Adds a sibling subcommand; no shared surface this sprint. |

### 2.3 Shared-Surface Warnings

- **Reporter contract changes mid-sprint (STORY-022-07).** PROPOSAL-013 §2.7 says `close_sprint.mjs` must reject reports missing the §5 Lane Audit + Hotfix Audit tables. **SPRINT-14's own close report cannot fail this validation.** Mitigation: 022-07 ships the validation behind a feature flag tied to `state.json.schema_version`. Validation activates only when `schema_version >= 2` AND at least one story in the sprint has `lane: fast`. SPRINT-14 itself runs all stories at `lane: standard` (the dogfood story 022-08 is the *only* `lane: fast` candidate, and its purpose is to populate the audit table). Flashcard worth filing on completion: "*Reporter contract changes that gate sprint close must guard activation against the same sprint that ships them — first sprint to use the new contract is N+1, not N.*"
- **Hook chain triple-touch (CR-009 + CR-008 + BUG-009).** All three modify `stamp-and-gate.sh`. Strict serialization in §2.2 plus a per-CR snapshot test on the rendered hook output (capture before, lock the diff). If any of the three's hook diff exceeds the expected surface, QA kicks back.
- **Phase B of CR-008 (PreToolUse `pre-edit-gate.sh`) is the highest-blast-radius change in the sprint.** It can hard-block agent edits if the gate is too aggressive. Mitigation: the gate only blocks `Edit|Write` when both (a) the path is outside `.cleargate/delivery/pending-sync/` AND (b) zero items exist in `pending-sync/` matching the user-prompt's intent (regex on user-prompt text). False positives go to a "warned, not blocked" log. Ship in **warn-only mode** for the first 48h after merge; promote to enforcing mode at sprint close if zero false-positives observed. CR-008 itself must specify the false-positive log surface.
- **`MANIFEST.json` quadruple-touch.** Four items append to the manifest. Serialize per §2.2; any conflict is a trivial rebase append. Architect's M3 plan must call out that 022-03 and 022-06 append to the same `templates` block, in lexicographic order.
- **state.json schema bump (STORY-022-02).** Per protocol §1.4, any state.json change bumps the version. Migration must be reversible-by-fresh-init for the dogfood smoke test (022-08). If migration is lossy, QA kicks back.
- **CR-010 + BUG-008 share `push-item.ts`.** CR-010 changes the `gate_failed` rejection logic; BUG-008 fixes the `proposal-approved` criterion's path-matching. Disjoint code paths but same file. CR-010 lands first (broader change); BUG-008 rebases (one-line regex fix).
- **PROPOSAL-013 approval is a Gate-1 prerequisite for M3.** If the user does not flip `approved: false → true` on PROPOSAL-013 at sprint kickoff, M1 + M2 still ship (9 items); M3/M4/M5 (5 items) drop to SPRINT-15. Document this fork in the sprint kickoff commit.

### 2.4 Sprint Report v2.1 — what STORY-022-07 must produce

The current `.cleargate/templates/sprint_report.md` is `template_version: 1` and ships six sections (§1 Delivered, §2 Story Results + CR Log, §3 Metrics, §4 Lessons, §5 Self-Assessment, §6 Change Log). Bump to `template_version: 2` with the additions below, plus the PROPOSAL-013 §2.7 Fast-Track / Hotfix integration. Two audiences: **(A) project team members** (humans, including non-coders) need to know what shipped, what broke, what's parked. **(B) the AI agent planning the next sprint** needs structured, greppable, machine-parseable state to plan SPRINT-N+1 without re-reading every artifact.

**New §0 — AI Continuity Block (machine-readable, top of file, YAML):**

```yaml
---
sprint_id: "SPRINT-NN"
status: "shipped | partial | blocked"
window_start: "YYYY-MM-DD"
window_end: "YYYY-MM-DD"
goal_hit: "yes | no | partial"
shipped_items: ["CR-NNN", "STORY-NNN-NN", ...]    # IDs only, machine-iterable
carried_over: ["STORY-NNN-NN", ...]                 # to be picked up by next sprint
escalated: ["STORY-NNN-NN", ...]                    # blocked, needs human decision
parked: ["STORY-NNN-NN: <reason>", ...]             # deferred with reason
follow_up_crs: ["CR-NNN-suggested: <one-line>", ...]
follow_up_bugs: ["BUG-NNN-suggested: <one-line>", ...]
risks_hit_and_handled: ["R-NN", ...]
risks_did_not_fire: ["R-NN", ...]
risks_still_open: ["R-NN: <one-line>", ...]
flashcards_added_count: N
template_version: 2
version_bumps:
  cleargate_cli: "0.X.0 → 0.Y.0"
  cleargate_planning_manifest: "0.X.0 → 0.Y.0"
  mcp: "0.X.0 → 0.Y.0"
dogfood_self_upgrade_clean: "yes | no | partial: <one-line>"
---
```

**Expanded §1 — Sprint Goal & Outcome (human-readable):**

- **Goal:** one-sentence recap of the sprint goal.
- **Did we hit it?** one-paragraph yes/no/partial answer in plain language.
- **User-Facing Capabilities** — bulleted, non-coder-readable. What can a project team member now do that they couldn't before?
- **Internal / Framework Improvements** — agent-contract / hook / template / protocol changes invisible to end users.
- **Carried Over / Parked / Escalated** — explicit lists with one-line reasons each.

**New §2.5 — Risks Status (vs Sprint Plan §Risks):** table mirroring the sprint plan's risks table with `hit-and-handled | mitigated | still-open | did-not-fire` plus a one-line note. Carries the IDs verbatim so reviewers can cross-ref the original plan.

**New §6 — What Worked / What Didn't / What Changed Mid-Sprint:** three subsections. Loop-improvement candidates, anti-patterns to avoid, decisions made by the orchestrator that diverged from the original plan. This section is the highest-value page for an N+1 sprint planning agent — it captures live signal you cannot reconstruct from git.

**New §7 — Branch + Commit Map:** one row per shipped item: `(item-id, branch, commits, test-count-before/after)`. Lets a team member click through to the actual code and an AI agent verify shipped state without re-reading commit logs.

**Existing §3 / §4 / §5** — kept; §3 gains the Fast-Track + Hotfix rows from PROPOSAL-013 §2.7 + a new `LD events` row alongside the existing CR:* / UR:* tallies.

**Naming convention enforcement (validation, not template):** `close_sprint.mjs` rejects sprint reports whose path is not exactly `.cleargate/sprint-runs/<SPRINT-ID>/REPORT.md` where `<SPRINT-ID>` matches `^SPRINT-\d{2,3}$`. The existing `sprint-runs/S-09/` directory is non-conformant — it gets renamed in sprint kickoff bookkeeping (see Execution Guidelines).

**Backward-compat:** validator accepts `template_version: 1` reports as legacy-pass (no §0 block / Fast-Track / Hotfix tables required). Only enforces v2 sections when `template_version: 2`. Saves us from retroactive paperwork on shipped sprints.

### 2.5 ADR-Conflict Flags

- **Hard-reject vs advisory gates (CR-010).** Original gate-criteria contract (locked in EPIC-008) treats `cached_gate_result.pass` as a binary push permission. CR-010 splits this: `approved: true/false` stays binary (hard reject); `cached_gate_result` becomes advisory (PM-tool label). Protocol §10 amendment lands as part of CR-010. No prior ADR conflict — extends, doesn't supersede.
- **Lane routing inside the four-agent contract (EPIC-022).** EPIC-013 Q5 deferred a DevOps role split. PROPOSAL-013 §1.3 OUT-OF-SCOPE re-affirms: no new agent. Lane routing happens inside the existing Architect (judges) + Developer (executes lane-aware) + QA (skipped on `lane: fast`) + Reporter (audits) loop. This is consistent with the EPIC-013 four-agent lock.
- **Schema-version contract (STORY-022-02).** EPIC-013 protocol §1.4: "any state.json change bumps the version, never silent." Migration must be explicit (no silent field addition). 022-02 emits a `schema_version: 1 → 2` migration log line on first write under new code. No conflict.
- **Karpathy-style raw-as-source-of-truth (PROPOSAL-012/EPIC-020 not in this sprint).** EPIC-022 does NOT touch the wiki contradiction-detection layer. PROPOSAL-012's `last_contradict_sha` schema delta and EPIC-020's three stories ship in a later sprint. Two schema-bumping epics in one sprint = forbidden.

## Milestones

- **M1 — Process Floor (3 CRs).** Ends when CR-009, CR-008 (Phase A + B), CR-010 all pass QA + merge to `sprint/SPRINT-14`. M1 goal: hooks reliably resolve the CLI, doctor stdout reaches the agent, planning-first rule is mechanically enforced, push gate is advisory (not hard-reject) for non-`approved` criteria. Smoke test: in a freshly-init'd repo, an agent given an off-protocol prompt ("build me a website") is intercepted by `pre-edit-gate.sh` *before* the first Write tool call.
- **M2 — Hygiene & Surface Fixes (2 BUGs + 1 Story).** Ends when BUG-008, BUG-009, STORY-014-01 all pass QA + merge. M2 goal: SessionStart blocked-count drops to ≤8 items (real engineering blockers only); CR/PROPOSAL drafts appear in token-ledger; `cleargate doctor` exit codes are predictable. Smoke test: SessionStart hook output diff vs sprint kickoff (~24 → ≤8); a fresh draft of any work-item type produces a token-ledger row.
- **M3 — Lane Classifier substrate (3 Stories + EPIC-022 file + PROPOSAL-013 approval).** Ends when STORY-022-01, STORY-022-02, STORY-022-03 all pass QA + merge AND `state.json` migration roundtrips cleanly on a known-good fixture. M3 goal: rubric exists, schema bumped, templates carry lane fields. Smoke test: `cleargate sprint init` on a fixture sprint emits `state.json` with `schema_version: 2` + every story defaulted to `lane: standard, lane_assigned_by: migration-default`.
- **M4 — Lane Classifier execution (3 Stories, parallel).** Ends when STORY-022-04, STORY-022-05, STORY-022-06 all pass QA + merge. M4 goal: pre-gate scanner emits demotion events on fast-lane failure; Developer agent reads `lane` from state.json; hotfix lane scaffolding works end-to-end. Smoke test: synthetic fast-lane story with an induced failure correctly demotes (state.json shows `lane_demoted_at` populated, sprint markdown §4 shows `LD` event); `cleargate hotfix new` scaffolds a valid `pending-sync/HOTFIX-NNN_*.md`.
- **M5 — Lane Classifier finishing + self-upgrade (3 Stories).** Ends when STORY-022-07, STORY-014-02, STORY-022-08 all pass QA + merge, the live `.claude/` + scaffold-managed `.cleargate/{knowledge,templates}/` reflect the post-SPRINT-14 canonical, all three version bumps land in one chore commit, and SPRINT-14's own REPORT.md passes the new `close_sprint.mjs` validation (gated on schema_version + lane=fast usage; both true once 022-08 lands). M5 goal: Reporter writes Lane Audit + Hotfix Audit tables; sprint close pipeline is gated on their presence; one real fast-lane story ran end-to-end against the upgraded dogfood; this repo is on `cleargate@0.6.0` and consumes its own work. Smoke test: `cleargate --version` reports `0.6.0`; live `.claude/agents/architect.md` content-equals `cleargate-planning/.claude/agents/architect.md`; the dogfood's `cleargate-planning/MANIFEST.json` `cleargate_version` field is `"0.6.0"`.

## Risks & Dependencies

**Status legend:** `open` · `mitigated` · `hit-and-handled` · `did-not-fire`.

| ID | Risk | Mitigation | Owner | Status |
|---|---|---|---|---|
| R-01 | PROPOSAL-013 not approved by user at sprint kickoff → M3/M4/M5 cannot start, sprint becomes a 9-item process-floor sprint | Document the fork in sprint kickoff commit. M1+M2 are independently valuable; SPRINT-15 picks up EPIC-022. Architect must NOT spawn M3 stories until `approved: true` is in PROPOSAL-013 frontmatter. | sandrinio | open |
| R-02 | CR-008 Phase B `pre-edit-gate.sh` false-positives block legitimate edits in dogfood | Ship in warn-only mode for 48h post-merge. Promote to enforcing only after QA confirms zero false positives in the warn log. CR-008 spec must include the warn-log surface and promotion criterion. | Developer CR-008 / QA | open |
| R-03 | Reporter contract change (022-07) gates SPRINT-14's own close report → sprint cannot close | Validation activates only when `schema_version >= 2` AND `lane: fast` was used. SPRINT-14 only flips this on dogfood story 022-08. If 022-08 is dropped from sprint, `lane: fast` is never set, validation stays dormant. | Developer 022-07 / QA | mitigated |
| R-04 | state.json migration (022-02) is lossy → existing sprints (SPRINT-09 through SPRINT-13 archives) become unreadable | Migration is additive only: `lane: standard, lane_assigned_by: migration-default` defaults injected on first read. Pre-migration state.json snapshots stay byte-identical via fixture roundtrip test. | Developer 022-02 / QA | open |
| R-05 | Hook chain triple-touch (CR-008 + CR-009 + BUG-009 all modify `stamp-and-gate.sh`) → merge conflicts dominate sprint | Strict serialization per §2.2: CR-009 first, CR-008 second, BUG-009 last. Each item ships a hook-output snapshot diff in its commit. Architect M1 plan must call this out. | Architect M1 / Developer | open |
| R-06 | EPIC-022 + 3 CRs in one sprint = scope overload, sprint slips past 2026-05-10 | Path B (split sprint) was rejected by user; commitment is to M1+M2 minimum (9 items) + as much of M3-M5 as the loop sustains. Sprint slippage past 5/10 triggers a mid-sprint cut: drop STORY-022-08 dogfood (slip to SPRINT-15) before any other deferral. | Orchestrator | open |
| R-07 | CR-010 advisory-tag rendering depends on PM-tool label support not yet verified | Verify Linear + Jira tag/label APIs in CR-010 §3 before kickoff. If neither supports the advisory shape, fall back to PM-tool description prefix `[advisory: gate_failed]`. | Developer CR-010 | open |
| R-08 | BUG-008 fix to `proposal-approved` criterion accidentally widens the gate (lets through actually-unlinked proposals) | Add a unit test in CR-010's adjacent test file: an EPIC frontmatter with `context_source: "PROPOSAL-999.md"` (file does not exist) MUST still fail the gate. The fix is *only* about not treating prose as a path. | Developer BUG-008 / QA | open |
| R-09 | Hotfix lane (022-06) cap-breach detection requires walking past 7 days of `pending-sync/HOTFIX-*` + archived hotfixes — slow on large repos | Stub the cap check to a no-op in v1; ship the rolling-window walk in v2 only if a hotfix is actually drafted during SPRINT-14. PROPOSAL-013 §2.5 explicitly allows deferral. | Developer 022-06 | mitigated |
| R-10 | Self-upgrade (014-02) clobbers local data — `.cleargate/delivery/`, `.cleargate/wiki/`, `.cleargate/FLASHCARD.md`, `.cleargate/sprint-runs/`, or `.cleargate/hook-log/` get overwritten by the scaffold copy | Upgrade implementation MUST be manifest-driven: only files listed in `cleargate-planning/MANIFEST.json` are touched. Pre-upgrade, capture a `git status --porcelain` snapshot; post-upgrade, diff again — any unexpected modifications outside the manifest file list = QA kicks back. Take a tarball backup of `.cleargate/delivery/` + `.cleargate/wiki/` before 014-02 runs as a final safety net. | Developer 014-02 / QA | open |
| R-11 | Version bumps land in three places (`cleargate-cli/package.json`, `cleargate-planning/MANIFEST.json`, `mcp/package.json`) — partial bump if commit fails mid-write | All three bumps + the `cleargate upgrade` execution + the dogfood roundtrip happen in a single commit. Pre-commit hook validates that all three versions match the expected target (0.6.0 / 0.6.0 / 0.2.0). If any one is wrong, commit aborts. | Developer 014-02 | open |
| R-12 | Self-upgrade pin-lag — CR-009 pins hook resolver to `npx -y @cleargate/cli@<PIN>`. If 014-02 bumps `cleargate-cli` to 0.6.0 but does NOT re-stamp the hook pin, post-upgrade hooks resolve to 0.5.0 from the npm cache instead of the new 0.6.0. Surfaced by Architect M1 §7 as forward-flag. | STORY-014-02 must include a re-stamp step: after `cleargate upgrade` runs, grep both `stamp-and-gate.sh` and `session-start.sh` for the pinned version; if any line still references the pre-bump version, fail the commit and emit an error. CR-009 must spec the pin format such that one-line sed rewrite is the canonical re-stamp mechanism. | Developer 014-02 / CR-009 | open |

## Metrics & Metadata

- **Expected Impact:**
  - SessionStart "blocked items" count drops from 24 → ≤8 (paperwork drift cleared).
  - First-run success rate of `npx cleargate@<X> init` + Claude Code session: agent reaches a triage gate (Proposal/Epic/Story) on >90% of off-protocol prompts (vs. 0% today, per CG_TESTING_v1 evidence on 2026-04-26).
  - Push-blocked items pushable as advisory: ~16 of the current 24 (EPIC-014/016/020/021, BUG-002/003/005, PROPOSAL-011, etc.).
  - First fast-lane story shipped: token spend per trivial CR drops from ~30–60k → ≤10k (Architect plan + QA gate skipped; pre-gate scanner only).
- **Priority Alignment:** P0 process work per 2026-04-26 conversation. Three CRs were pre-ranked P0/P1 (CR-009/008 P0; CR-010 P1; CR-011 deferred — depends on EPIC-021). PROPOSAL-013 added by user. EPIC-021 + EPIC-020 deferred to later sprints.

---

## Execution Guidelines (Local Annotation — Not Pushed)

- **Starting Point:** **CR-009 first, alone.** No other story can spawn until the resolver pin lands and a freshly-init'd repo's hooks reliably resolve the CLI. Architect's M1 plan covers CR-009 + CR-008 + CR-010 together, but Developer agents spawn one CR at a time in M1.
- **Sprint kickoff bookkeeping (do before M1 spawns):**
  1. Move `BUG-006_Init_Scaffold_Hooks_Reference_Nonexistent_CLI_Path.md` from `pending-sync/` → `archive/`; flip status to `Completed` (already shipped in commit `a0d8acc`).
  2. Re-ingest `archive/BUG-007_*.md` into `wiki/bugs/BUG-007.md` so it reflects `status: Completed` (already shipped in commit `ac3576b`).
  3. Add `.cleargate/hook-log/` to `.gitignore` (currently dirty in every `git status`).
  3a. Rename `.cleargate/sprint-runs/S-09/` → `.cleargate/sprint-runs/SPRINT-09/` to conform to the `^SPRINT-\d{2,3}$` naming convention enforced by STORY-022-07's `close_sprint.mjs` validator. One-shot `git mv`; no content change.
  4. Gate-writeup paperwork sweep: fix the TBDs / blast-radius / affected-files sections on EPIC-014, EPIC-016, EPIC-020, EPIC-021, CR-010, CR-011, STORY-014-01, PROPOSAL-011 so the SessionStart blocked-count reflects engineering blockers only, not stale drafts. Pure copy-edit; no code.
  5. Flip PROPOSAL-013 `approved: false → true` (Gate 1) and draft `EPIC-022_Sprint_Lane_Classifier_And_Hotfix_Path.md` from the proposal. **If user declines to approve at kickoff, drop M3/M4/M5 from the sprint and ship SPRINT-14 as a 9-item process-floor sprint.**
- **Relevant Context:**
  - PROPOSAL-013 §2.3 rubric, §2.4 demotion mechanics, §2.6 schema delta, §2.7 reporter integration are the binding spec for STORY-022-01 through STORY-022-07.
  - CR-008 §0 cites the CG_TESTING_v1 evidence from 2026-04-26 — keep that smoke test as the canonical M1-close acceptance check.
  - CR-009 §0 cites the same session — fresh `npx` invocation must produce a reachable CLI before the agent's first turn ends.
  - EPIC-013 archive (Completed 2026-04-21) is the prereq baseline — every M3+ story can assume `pre_gate_runner.sh`, `state.json`, and worktree isolation already exist.
  - FLASHCARD entries to grep before starting: `#hooks`, `#schema`, `#reporter`, `#mocked-tests-bit-us`, `#test-harness`.
- **Constraints:**
  - **Never `--no-verify`.** Pre-commit must run typecheck + tests for the affected package.
  - **Real Postgres + Redis for any test that touches schema** (i.e. STORY-022-02 migration test). No mocks.
  - **No mid-sprint scope creep.** EPIC-020 (wiki contradict), CR-011 (membership gating), EPIC-021 (token-first onboarding) are explicitly deferred. If a "while we're in here" temptation arises, file a fresh CR for SPRINT-15.
  - **No protocol-doc edits outside of CR-008 / CR-010 / STORY-022-01 surfaces.** Single-source-of-truth: each item touches its declared section in §10 / §14.
  - **STORY-022-07 → STORY-014-02 → STORY-022-08 strict order.** Reporter validation (022-07) must exist before self-upgrade (014-02) so the upgraded scaffold contains the new validator. Self-upgrade (014-02) must precede dogfood (022-08) so the dogfood runs against the post-upgrade live `.claude/`, validating the upgrade path simultaneously with the lane classifier.
  - **Version bump is sprint-close-only.** `cleargate-cli/package.json`, `cleargate-planning/MANIFEST.json`, and `mcp/package.json` stay at their pre-sprint values (0.5.0 / 0.5.0 / 0.1.0) until STORY-014-02. No mid-sprint bumps. The `created_at_version` / `updated_at_version` frontmatter on items drafted *during* SPRINT-14 says `0.5.0` (drafted on 0.5.0); items drafted *after* sprint close say `0.6.0`.
  - **Sprint slippage rule:** if 2026-05-08 arrives with M3 incomplete, drop STORY-022-08 first (slip to SPRINT-15) — but NOT 014-02. Self-upgrade still happens at sprint close even on a partial sprint, because the wiki/protocol/template work that *did* land needs to be active in the dogfood for SPRINT-15 to consume. Without 022-08, the upgrade path validation is weaker (no fast-lane exercise) but non-zero (scaffold copy + version roundtrip still tested). Do not drop 022-07 — without it, 022-04 through 022-06 ship into a void with no audit.
