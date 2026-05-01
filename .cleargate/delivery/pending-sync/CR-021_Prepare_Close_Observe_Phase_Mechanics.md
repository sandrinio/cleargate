---
cr_id: CR-021
parent_ref: EPIC-025 (decomposition wrapper); cleargate-protocol.md (Prepare/Close/Observe-phase semantics) + close_sprint.mjs + reporter.md + Sprint Plan + Sprint Report templates
parent_cleargate_id: "EPIC-025 (decomposition wrapper); cleargate-protocol.md (Prepare/Close/Observe-phase semantics) + close_sprint.mjs + reporter.md + Sprint Plan + Sprint Report templates"
parent_cleargate_id: null
sprint_cleargate_id: SPRINT-18
carry_over: false
status: Draft
ambiguity: 🟢 Low
context_source: ".cleargate/scratch/SDLC_brainstorm.md (de-facto charter — Option A per 2026-05-01 conversation). Sibling to CR-020 (Plan-phase). This CR covers Prepare/Close/Observe-phase mechanics. Scope captured in brainstorm §2.3, §2.3a, §2.3b, §2.4, §6 working notes (CR-split: option 2 — CR-021 in SPRINT-18 after CR-020 lands in SPRINT-17). Verbatim user approval: 'go for option a'. Gate 1 (Brief) waived — sharp intent + inline references in source conversation."
proposal_gate_waiver:
  approved_by: sandrinio
  approved_at: 2026-05-01T20:00:00Z
  reason: Direct approval of Option A. The Prepare/Close/Observe scope is an aggregation of decisions made during the 2026-05-01 SDLC redesign session — Sprint Plan template reframe, Reporter capability surface, REPORT naming, Observe-phase findings section, Sprint Execution Gate preflight, auto-push on close, AI sprint-number auto-pick, AI priority-reordering.
owner: sandrinio
target_date: SPRINT-18
created_at: 2026-05-01T20:00:00Z
updated_at: 2026-05-01T20:00:00Z
created_at_version: cleargate@0.10.0
updated_at_version: cleargate@0.10.0
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-05-01T10:09:16Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id CR-021
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-05-01T10:09:16Z
  sessions: []
---

# CR-021: Prepare / Close / Observe-Phase Mechanics

**Wave dependency:** SPRINT-18, lands **after** CR-020 (SPRINT-17) ships. Reasons:
- CR-021's CLAUDE.md edits sit alongside CR-020's 6-bullet block; ordering avoids merge churn.
- The Sprint Plan template reframe (READ → actively-authored) consumes the Brief-presentation pattern that CR-020 establishes universally.
- The Sprint Report template's §4 Observe section uses the "skip if no data" pattern that CR-020 promotes template-wide.

## 1. The Context Override

### 1.1 What to remove / forget

This CR retires **eight pieces of legacy behavior** in the Prepare → Close pipeline:

1. **Sprint Plan as a READ-only artifact.** Today's `templates/Sprint Plan Template.md` declares: *"This is a READ artifact. It is written by `cleargate_pull_initiative` when syncing a Sprint from the remote PM tool. Do NOT draft this file manually."* Under CR-021, the Sprint Plan is **actively authored** in the Prepare phase by the orchestrator + Architect collaboration.
2. **REPORT.md as the report filename.** The current convention `.cleargate/sprint-runs/<id>/REPORT.md` is too generic; files referenced outside their sprint dir lose context. New convention: `SPRINT-<#>_REPORT.md`. Backwards-compat: existing archived reports (SPRINT-01..16) keep old name; new convention applies SPRINT-17+.
3. **Reporter agent's broad-fetch context loading.** Today the Reporter reads all epics + all story files + full git log + full token-ledger + full FLASHCARD = ~200KB. CR-021 introduces a curated context bundle (~30-50KB) via `prep_reporter_context.mjs`.
4. **Reporter capability surface left implicit.** The `reporter.md` agent definition does not list which scripts / skills / hooks are available to it. CR-021 makes this explicit.
5. **Observe-phase findings trapped in sprint plan §4 Execution Log.** Bugs found during user walkthrough on the sprint branch (§2 of cleargate-enforcement.md post-EPIC-024) get logged as `UR:bug` / `UR:review-feedback` events but never roll up into the sprint report. CR-021 adds a dedicated §4 Observe Findings section to the Sprint Report template.
6. **No environment-health gate at Prepare → Execute boundary.** Today the orchestrator can transition a Sprint Plan from Ready → Active without checking whether the previous sprint is closed, whether leftover worktrees exist, or whether the `sprint/S-NN` ref is free. CR-021 introduces `cleargate sprint preflight` (Gate 3 enforcement).
7. **Auto-push on close left manual.** When `close_sprint.mjs` flips a sprint to Completed, no automatic push of per-artifact status updates fires. Each Done story stays out of sync with MCP unless the human runs `cleargate sync` afterward. CR-021 wires auto-push as Step 7 of the close pipeline.
8. **Sprint number assigned manually.** The orchestrator currently asks the user "what sprint number?" or guesses from context. CR-021 has the AI auto-pick from `wiki/active-sprint.md` + `pending-sync/SPRINT-*.md` listing.
9. **No AI-proposed priority reordering.** Today the orchestrator follows human-set priorities verbatim. CR-021 has the AI surface technical-reason reorderings (dep chains, shared-surface conflicts, fast-lane bundling) in the Sprint Plan Brief.

### 1.2 The new truth (post-CR)

**Sprint Plan template** gains the universal `<instructions>` block (per CR-020). Specifies what to gather (sprint number, available items, priorities, dependencies), how (which tools/scripts), what analysis to perform (priority-reorder proposals, decomposition flags, Architect SDR trigger), where to write, and the post-write Brief shape. Sprint Plan goes Draft → Ready when **Gate 2** conditions satisfy; Ready → Active when **Gate 3** conditions satisfy.

**Sprint Report template** gains a new §4 Observe Findings section + the universal "skip if no data" pattern. Renumbering: §4 Lessons → §5; §5 Retrospective → §6.

**Sprint Report filename** = `SPRINT-<#>_REPORT.md`.

**Reporter agent** has an explicit capability surface (scripts, skills, hooks observing, inputs, output, post-output Brief). Reads `prep_reporter_context.mjs` curated bundle as default input; falls back to source files only when flagged.

**`prep_reporter_context.mjs`** (new) writes `.cleargate/sprint-runs/<id>/.reporter-context.md` containing the curated bundle: Sprint plan §1/§2/§5, state.json one-liners, milestone plans, git-log digest, token-ledger digest, FLASHCARD date-window slice, REPORT template.

**`cleargate sprint preflight`** (new CLI subcommand on existing `sprint.ts`) runs the four Gate 3 checks: previous sprint Completed, no leftover `.worktrees/STORY-*` paths, no existing `sprint/S-NN` git ref, no uncommitted changes on `main`. Halts on any failure; human decides resolution per item.

**`close_sprint.mjs` Step 3.5** (new) invokes `prep_reporter_context.mjs` between prefill (Step 3) and the manual Reporter spawn announcement (Step 4).

**`close_sprint.mjs` Step 7** (new, post-Gate-4 ack) invokes `cleargate sync work-items <sprint-id>` to push per-artifact Completed status updates to MCP. Failure is non-fatal (logged, sprint stays Completed).

**Sprint number auto-pick** mechanic in the Sprint Plan drafting flow: AI scans `wiki/active-sprint.md` + `pending-sync/SPRINT-*.md` listing, emits `max(N) + 1`, surfaces it in the Sprint Plan Brief for human confirmation.

**AI priority-reordering proposals**: orchestrator analyzes the backlog after fetching items, identifies dependency chains and shared-surface conflicts, proposes reorderings in the Sprint Plan Brief with one-line rationale per change. Human accepts / rejects / amends.

## 2. Blast Radius & Invalidation

### 2.1 Surfaces directly modified

| Surface | What changes |
|---|---|
| `.cleargate/templates/Sprint Plan Template.md` | Reframe `<instructions>` from READ-only to actively-authored. Add universal Brief instruction. Add stakeholder/Sponsor-facing section + AI-execution section split (dual-audience). |
| `.cleargate/templates/sprint_report.md` | Insert new §4 Observe Findings + skip-if-empty pattern. Renumber current §4 Lessons → §5, §5 Retrospective → §6. Update `<instructions>` `output_location` from `REPORT.md` → `SPRINT-<#>_REPORT.md`. Promote skip-if-empty to per-section pattern across all sections. |
| `cleargate-planning/.cleargate/templates/{Sprint Plan Template,sprint_report}.md` | Identical mirror edits |
| `.cleargate/scripts/close_sprint.mjs` | Update REPORT.md path → SPRINT-<#>_REPORT.md (4 hits). Insert new Step 3.5 invoking `prep_reporter_context.mjs`. Insert new Step 7 invoking `cleargate sync work-items` for auto-push. Update Step 5 prompt text to reference new filename. |
| `.cleargate/scripts/prefill_report.mjs` | Update output path → `SPRINT-<#>_REPORT.md`. |
| `.cleargate/scripts/test/test_close_pipeline.sh` | Update fixture paths and assertions for new filename. |
| `.cleargate/scripts/test/test_report_body_stdin.sh` | Update fixture paths for new filename. |
| `.cleargate/scripts/prep_reporter_context.mjs` (NEW) | Build curated context bundle. ~150 LOC. |
| `.cleargate/scripts/count_tokens.mjs` (NEW or extend existing) | Per-agent + per-sprint token totals from `token-ledger.jsonl`. ~100 LOC; reuses existing ledger schema. |
| `.claude/agents/reporter.md` | Add capability-surface table (scripts / skills / hooks / inputs / output). Add post-output Brief instruction. Update output path reference. |
| `cleargate-planning/.claude/agents/reporter.md` | Identical mirror edit |
| `cleargate-cli/src/commands/sprint.ts` | Add new `preflight <sprint-id>` subcommand. Implements four Gate 3 checks. ~80 LOC added. |
| `cleargate-cli/src/cli.ts` | Wire `sprint preflight` subcommand into main CLI router. |
| `cleargate-cli/test/commands/sprint-preflight.test.ts` (NEW) | Unit + integration tests for the preflight subcommand. |
| `CLAUDE.md` (CLEARGATE-tag-block region only) | Add Sprint Execution Gate bullet (forward-referenced from CR-020's 6-bullet block). |
| `cleargate-planning/CLAUDE.md` | Identical mirror edit |
| `.cleargate/knowledge/cleargate-enforcement.md` (post-EPIC-024) | Add new §<N> Sprint Execution Gate enforcement spec. |
| `cleargate-planning/.cleargate/knowledge/cleargate-enforcement.md` | Identical mirror edit |

### 2.2 Documents reverted to 🔴

**None.** All in-flight items at the time CR-021 ships will already be SPRINT-17-or-later artifacts (drafted under CR-020's universal Brief pattern). The Sprint Plan reframe applies to **SPRINT-18+ plans**; SPRINT-17's Sprint Plan (drafted under CR-020 Plan-phase rules) is grandfathered under its current shape — Architect SDR §2 written, Brief presented, Gate 2 passed. SPRINT-17 closes under the existing close pipeline (no Step 3.5 / Step 7 yet).

### 2.3 Backwards-compat carve-outs

- **Existing `REPORT.md` files in `.cleargate/sprint-runs/SPRINT-01..16/`**: keep old name. No rename pass. The naming convention applies SPRINT-17+. (SPRINT-17's report is written under the old `REPORT.md` name since CR-020 hasn't shipped naming changes; SPRINT-18's report gets the new name.) Wait — SPRINT-17 closes *between* CR-020 and CR-021 shipping. To avoid an awkward middle state, **SPRINT-17 also keeps the old `REPORT.md` name**; the new naming applies SPRINT-18+. Architect milestone plan should clarify in the SPRINT-18 init.
- **Existing `pending-sync/SPRINT-*.md` from before CR-021**: not retroactively re-templated. Sprint Plan reframe applies to SPRINT-18+ plans drafted under the new template.

### 2.4 New CLI surface

`cleargate sprint preflight <sprint-id>` is the **only new public CLI command** introduced by this CR. The auto-push step inside `close_sprint.mjs` reuses the existing `cleargate sync work-items` command (shipped as STORY-023-01, commit `36208fc`).

## 3. Execution Sandbox

### 3.1 Files modified / created

> **v2 file-surface contract.** Every file staged in this CR's commits must appear below or be covered by `.cleargate/scripts/surface-whitelist.txt`.

**Templates:**
- `.cleargate/templates/Sprint Plan Template.md`
- `.cleargate/templates/sprint_report.md`
- `cleargate-planning/.cleargate/templates/Sprint Plan Template.md`
- `cleargate-planning/.cleargate/templates/sprint_report.md`

**Scripts:**
- `.cleargate/scripts/close_sprint.mjs` (modify — Step 3.5 + Step 7 + naming)
- `.cleargate/scripts/prefill_report.mjs` (modify — naming)
- `.cleargate/scripts/test/test_close_pipeline.sh` (modify — fixtures)
- `.cleargate/scripts/test/test_report_body_stdin.sh` (modify — fixtures)
- `.cleargate/scripts/prep_reporter_context.mjs` (NEW)
- `.cleargate/scripts/count_tokens.mjs` (NEW)

**Agent definitions:**
- `.claude/agents/reporter.md`
- `cleargate-planning/.claude/agents/reporter.md`

**CLI:**
- `cleargate-cli/src/commands/sprint.ts` (add `preflight` subcommand)
- `cleargate-cli/src/cli.ts` (router wire-up)
- `cleargate-cli/test/commands/sprint-preflight.test.ts` (NEW)

**Brain files:**
- `CLAUDE.md` (CLEARGATE-tag-block region only)
- `cleargate-planning/CLAUDE.md` (CLEARGATE-tag-block region only)

**Enforcement spec:**
- `.cleargate/knowledge/cleargate-enforcement.md` (NEW §<N>)
- `cleargate-planning/.cleargate/knowledge/cleargate-enforcement.md` (NEW §<N>)

**Total:** ~18 files (8 new, 10 modified; 8 mirror pairs covered).

### 3.2 Edit blueprint per surface

#### 3.2.1 Sprint Plan Template reframe

Replace the current `<instructions>` block (which forbids manual drafting) with:

```
<instructions>
This template is actively authored during the Prepare phase.

WHAT TO GATHER
  - Sprint number — read .cleargate/wiki/active-sprint.md, scan pending-sync/SPRINT-*.md, emit max(N) + 1
  - Available work items — pending-sync/{EPIC,STORY,CR,BUG,HOTFIX}-*.md filtered ambiguity:🟢 + status:Ready
  - Human-set priorities — frontmatter `priority` field per item
  - Cross-item dependencies — `parent_epic_ref:` + shared file-surface analysis

HOW TO GATHER
  - Read for sprint-runs/, Grep for pending-sync/, scripts/wiki-query for awareness layer
  - cleargate-cli/src/lib/admin-url.ts for any admin-link references

ANALYSIS REQUIRED
  - Propose priority reordering for technical reasons (dep chains, shared-surface conflicts, fast-lane bundling). One-line rationale per change.
  - Flag missing decomposition (epics with no child stories) — must resolve before Gate 2 passes.
  - Trigger Architect Sprint Design Review (writes §2 Execution Strategy) once scope is locked.

WHERE TO WRITE
  - .cleargate/delivery/pending-sync/SPRINT-<#>_<name>.md

POST-WRITE BRIEF
  Render in chat with these sections:
    - Sprint Goal (1 sentence)
    - Selected items (table: id / type / lane / milestone / parallel? / bounce-exposure)
    - Recommended priority changes (with one-line rationale per change)
    - Open questions for human (with recommended answers)
    - Risks (with mitigations)
    - Current ambiguity + Gate 2 readiness checklist (decomposed? all 🟢? SDR §2 written?)
  Halt for human review. When ambiguity reaches 🟢 AND Gate 2 conditions satisfy, proceed to call cleargate_push_item.

DUAL-AUDIENCE STRUCTURE
  Top of body: Stakeholder/Sponsor view (Sprint Goal, Business Outcome, Risks/Mitigations, Metrics).
  Bottom of body: AI-execution view (Phase Plan, Merge Ordering, Lane Audit, ADR-Conflict Flags, Decomposition Status).

Do NOT output these instructions.
</instructions>
```

Body skeleton additions: a top-of-body "## 0. Stakeholder Brief" (~10 lines, Sponsor-readable) above current §1.

#### 3.2.2 Sprint Report Template — §4 Observe + skip pattern + naming

Update `<instructions>` `output_location: .cleargate/sprint-runs/<sprint-id>/SPRINT-<#>_REPORT.md`.

Insert new §4 between current §3 Execution Metrics and current §4 Lessons:

```markdown
## 4. Observe Phase Findings

> Populated from sprint plan §4 Execution Log entries dated within the Observe window
> [last-story-merge-timestamp, sprint-close-timestamp]. Reporter date-filters and groups by event type.
>
> SKIP THIS SECTION ENTIRELY (no header, no body) if all three subsections are empty.
> Output a single line in its place: "Observe phase: no findings."

### 4.1 Bugs Found (UR:bug)
| Date | Description | Resolution | Commit |

### 4.2 Hotfixes Triggered
| ID | Trigger | Resolution | Commit |

### 4.3 Review Feedback (UR:review-feedback)
| Date | Description | Status (folded / deferred) | Deferred to / Rationale |
```

Renumber: current §4 Lessons → §5; current §5 Retrospective → §6.

Promote skip-if-empty to a template-wide convention. Each section's `<instructions>` block declares its skip condition. Sections without findings collapse to a one-liner.

#### 3.2.3 `close_sprint.mjs` — Step 3.5 + Step 7 + naming

**Path updates** (4 hits in current code):
```javascript
// BEFORE
const reportFile = path.join(sprintDir, 'REPORT.md');
// AFTER
const reportFile = path.join(sprintDir, `SPRINT-${sprintNumber}_REPORT.md`);
// where sprintNumber is extracted from sprintId (strip "SPRINT-" prefix)
```

Also update `reportFile2` (line 206), `reportFile` (lines 327, 357, 366), and the v2.1 validation header check (line 209).

**New Step 3.5** (insert between current Step 3 and Step 4 announcement):

```javascript
// ── Step 3.5: Build curated Reporter context bundle ──────────────────
process.stdout.write('Step 3.5: building Reporter context bundle...\n');
try {
  invokeScript('prep_reporter_context.mjs', [sprintId], {
    CLEARGATE_STATE_FILE: stateFile,
    CLEARGATE_SPRINT_DIR: sprintDir,
  });
  process.stdout.write(`Step 3.5 passed: ${sprintDir}/.reporter-context.md ready.\n`);
} catch (err) {
  // Non-fatal — Reporter falls back to source files
  process.stderr.write(`Step 3.5 warning: prep_reporter_context.mjs failed: ${err.message}\n`);
  process.stderr.write('Reporter will fall back to broad-fetch context loading.\n');
}
```

**New Step 7** (insert after Step 6 suggest_improvements, before final stdout):

```javascript
// ── Step 7: Auto-push per-artifact Completed status to MCP ───────────
process.stdout.write('Step 7: pushing per-artifact status updates to MCP...\n');
try {
  // Reuse cleargate sync work-items <sprint-id> from STORY-023-01
  const cliBin = path.join(REPO_ROOT, 'cleargate-cli', 'dist', 'cli.js');
  if (fs.existsSync(cliBin)) {
    execSync(`node ${JSON.stringify(cliBin)} sync work-items ${JSON.stringify(sprintId)}`, {
      stdio: 'inherit',
      env: process.env,
    });
    process.stdout.write('Step 7 passed: work-item statuses synced.\n');
  } else {
    process.stdout.write('Step 7 skipped: CLI binary not found (non-fatal).\n');
  }
} catch (err) {
  // Non-fatal — sprint stays Completed; sync can be retried manually
  process.stderr.write(`Step 7 warning: sync work-items failed: ${err.message}\n`);
  process.stderr.write('Run `cleargate sync work-items` manually to retry.\n');
}
```

**Step 5 prompt text update**: replace `"REPORT.md found at ${reportFile}"` with the new filename in the wait-for-ack messages.

#### 3.2.4 `prep_reporter_context.mjs` (new)

Outline (~150 LOC):

```javascript
#!/usr/bin/env node
/**
 * prep_reporter_context.mjs <sprint-id>
 *
 * Writes a curated context bundle for the Reporter agent at
 * .cleargate/sprint-runs/<id>/.reporter-context.md
 *
 * Bundle contents (in order):
 *   - Sprint plan §1, §2, §5 (slice from pending-sync/ or archive/)
 *   - state.json one-liner per story (id / state / lane / qa_bounces / arch_bounces)
 *   - Milestone plans M1.md..MN.md verbatim
 *   - git log --stat sprint/S-NN ^main (subject + LOC delta)
 *   - Token-ledger digest (totals per work_item + anomaly flags from count_tokens.mjs)
 *   - FLASHCARD slice — entries dated within [sprint.start_date, sprint.end_date]
 *   - REPORT template path reference
 *
 * Output: .reporter-context.md gitignored alongside state.json.
 */
```

#### 3.2.5 `count_tokens.mjs` (new — wraps existing token-ledger.jsonl)

Outline (~100 LOC). Reuses existing `sumDeltas()` API from CR-018; adds aggregation by `work_item_id` + `agent_type`. Produces a digest summary suitable for inclusion in the Reporter context bundle:

```
Total tokens this sprint: <N> (input: <X> / output: <Y> / cache_read: <Z>)
Per-agent breakdown:
  architect: <N>  (across <M> dispatches)
  developer: <N>  (across <M> dispatches)
  qa: <N>         (across <M> dispatches)
  reporter: <N>   (across <M> dispatches)
Anomalies:
  - STORY-XXX-YY: 4× higher than median story cost
  - <other flags>
```

#### 3.2.6 `reporter.md` agent definition — capability surface

Add a new section to `.claude/agents/reporter.md` after the role-prefix line:

```markdown
## Capability Surface

| Capability type | Items |
|---|---|
| **Scripts** | `prep_reporter_context.mjs` (read curated bundle), `count_tokens.mjs` (token totals + anomalies), git log per sprint commit, FLASHCARD date-window slicer |
| **Skills** | `flashcard` (Skill tool — read past lessons) |
| **Hooks observing** | `SubagentStop` → `token-ledger.sh` (attributes Reporter tokens via dispatch marker; pre-sprint) |
| **Default input** | `.cleargate/sprint-runs/<id>/.reporter-context.md` (built by `prep_reporter_context.mjs` at close pipeline Step 3.5). Fall back to source files only when the bundle is incomplete or missing. |
| **Output** | `.cleargate/sprint-runs/<id>/SPRINT-<#>_REPORT.md` |

## Post-Output Brief

After Writing the report, render a Brief in chat:

> Delivered N stories, M epics. Observe: X bugs, Y review-feedback. Carry-over: Z. Token cost: T.
> See `SPRINT-<#>_REPORT.md` for full report.
> Ready to authorize close (Gate 4)?

This Brief replaces today's "re-run with --assume-ack" prompt as the Gate 4 trigger. The orchestrator surfaces this Brief verbatim to the human and halts.
```

#### 3.2.7 `cleargate sprint preflight` subcommand

New file: `cleargate-cli/src/commands/sprint-preflight.ts` (or as a sub-handler within existing `sprint.ts`).

```typescript
/**
 * cleargate sprint preflight <sprint-id>
 *
 * Runs the four Gate 3 (Sprint Execution) checks. Halts on any failure;
 * caller decides resolution per item.
 *
 * Checks:
 *   1. Previous sprint status is Completed (lookup wiki/active-sprint.md or scan pending-sync/SPRINT-*.md)
 *   2. No leftover .worktrees/STORY-* paths
 *   3. No existing sprint/S-NN git ref
 *   4. No uncommitted changes on main
 *
 * Exit codes:
 *   0 — all checks pass
 *   1 — one or more checks failed (stderr lists each)
 *   2 — usage error
 */
```

Wire into `cleargate-cli/src/cli.ts` as `sprint preflight <id>` subcommand.

Tests (`cleargate-cli/test/commands/sprint-preflight.test.ts`): one fixture per check (clean state, prev-sprint-not-closed, leftover-worktree, existing-branch, dirty-main). Asserts exit code + stderr message per case.

#### 3.2.8 CLAUDE.md — Sprint Execution Gate bullet

CR-020 §3.2.10 already includes a forward-reference to CR-021's Sprint Execution Gate. CR-021 doesn't add a new bullet — it just makes the forward-reference live by ensuring `cleargate sprint preflight` actually exists.

The only CLAUDE.md change in CR-021 is to update the bullet text to reference the now-extant subcommand:

```diff
- **Sprint Execution Gate (CR-021).** Before transitioning Ready → Active, the environment must pass: previous sprint Completed, no leftover worktrees, `sprint/S-NN` ref free, `main` clean. See `cleargate sprint preflight`.
+ **Sprint Execution Gate.** Before transitioning Ready → Active, run `cleargate sprint preflight <id>`. The four checks (previous sprint Completed, no leftover worktrees, `sprint/S-NN` ref free, `main` clean) must all pass. Halt and ask the human for resolution on any failure.
```

#### 3.2.9 `cleargate-enforcement.md` — new §<N> Sprint Execution Gate

Append a new section (next free §N after EPIC-024's §1..12 numbering, so §13):

```markdown
## 13. Sprint Execution Gate (Gate 3) (source: new in CR-021)

Before sprint state transitions Ready → Active, the orchestrator MUST invoke
`cleargate sprint preflight <sprint-id>` and verify all four checks pass:

1. **Previous sprint Completed.** Scan `.cleargate/wiki/active-sprint.md` and
   `pending-sync/SPRINT-*.md`. The sprint immediately preceding `<sprint-id>`
   in the linear sequence must have `sprint_status: "Completed"` in its
   `state.json`. Skip the check if there is no preceding sprint (SPRINT-01).

2. **No leftover worktrees.** Run `git worktree list` and verify no path
   matches `.worktrees/STORY-*`. Leftover worktrees indicate a story from a
   prior sprint that wasn't merged or removed cleanly.

3. **Sprint branch ref free.** Run `git show-ref refs/heads/sprint/S-NN`. The
   ref must NOT exist (we're about to cut it). If it exists, the sprint
   was previously started or the prior cleanup didn't complete.

4. **`main` is clean.** Run `git status --porcelain` on a `main` checkout.
   No uncommitted changes (modified, untracked, staged) may exist.

On any failure, the script exits 1 with a punch list. The orchestrator surfaces
the failure verbatim to the human and halts. Resolution is per-item:
- Prev sprint not closed → run `cleargate sprint close <prev-id>` first
- Leftover worktree → `git worktree remove` if abandoned, or merge if work in progress
- Branch ref exists → investigate; force-deletion only with explicit human approval
- Dirty main → human commits / stashes / discards as appropriate

This gate is **enforcing under `execution_mode: v2`** and **advisory under v1**.
```

### 3.3 Order of edits (Architect milestone plan should reflect)

1. **M1** — `prep_reporter_context.mjs` + `count_tokens.mjs` (new scripts; foundational; can be parallel-developed).
2. **M2** — `cleargate sprint preflight` subcommand + tests (new CLI surface; independent of M1).
3. **M3** (after M1 + M2) — `close_sprint.mjs` Step 3.5 + Step 7 + naming changes; `prefill_report.mjs` naming; test fixture updates.
4. **M4** (parallel with M1–M3) — Sprint Plan Template reframe + Sprint Report Template §4 + skip pattern + renumber.
5. **M5** (after M2 + M4) — `reporter.md` capability surface + Brief instruction + naming.
6. **M6** (after M2) — `cleargate-enforcement.md` §13 + CLAUDE.md sprint-preflight bullet update.

All canonical mirrors edited in lockstep with their live counterparts.

## 4. Verification Protocol

### 4.1 Gherkin acceptance scenarios

```gherkin
Feature: Prepare/Close/Observe-phase mechanics

  Scenario: Sprint Plan Template is actively-authored
    Given CR-021 has merged
    When .cleargate/templates/Sprint Plan Template.md is read
    Then the <instructions> block contains "actively authored during the Prepare phase"
    And it does NOT contain "READ artifact" or "Do NOT draft this file manually"
    And it contains a POST-WRITE BRIEF section with sprint goal, selected items, priority changes, open questions, risks, ambiguity

  Scenario: Sprint Report Template has §4 Observe Findings
    Given CR-021 has merged
    When .cleargate/templates/sprint_report.md is read
    Then it contains a "## 4. Observe Phase Findings" heading between current §3 and current §5 (was §4)
    And §4 contains "SKIP THIS SECTION ENTIRELY" pattern in its instructions
    And current §4 Lessons is renumbered to §5
    And current §5 Retrospective is renumbered to §6

  Scenario: REPORT.md renamed to SPRINT-<#>_REPORT.md
    Given CR-021 has merged
    When close_sprint.mjs runs against a SPRINT-18+ sprint
    Then the report file is written at .cleargate/sprint-runs/<id>/SPRINT-<#>_REPORT.md
    And no file named REPORT.md is created in that directory
    # Backwards-compat: SPRINT-01..17 archived REPORT.md files keep their old names

  Scenario: prep_reporter_context.mjs builds the bundle
    Given CR-021 has merged
    When `node .cleargate/scripts/prep_reporter_context.mjs SPRINT-18` runs against a closed sprint fixture
    Then it writes .cleargate/sprint-runs/SPRINT-18/.reporter-context.md
    And the file contains slices of: sprint plan §1/§2/§5, state.json one-liners, milestone plans M*.md, git log digest, token-ledger digest, FLASHCARD date-window slice
    And the file is ≤80KB (target: 30-50KB)

  Scenario: close_sprint.mjs invokes Step 3.5 and Step 7
    Given CR-021 has merged
    When close_sprint.mjs runs end-to-end against a fixture sprint
    Then Step 3.5 invokes prep_reporter_context.mjs and prints "Step 3.5 passed"
    And Step 7 (post-Gate-4-ack) invokes `cleargate sync work-items <sprint-id>` and prints "Step 7 passed" or "Step 7 skipped" if CLI binary missing
    And Step 7 failure does NOT roll back the Completed status (sprint stays Completed; warning logged)

  Scenario: cleargate sprint preflight runs the four checks
    Given CR-021 has merged
    When `cleargate sprint preflight SPRINT-19` runs in a clean repo state
    Then the command exits 0
    And stdout reports "all four checks pass"

  Scenario: cleargate sprint preflight catches leftover worktree
    Given CR-021 has merged
    And a leftover .worktrees/STORY-018-99 directory exists
    When `cleargate sprint preflight SPRINT-19` runs
    Then the command exits 1
    And stderr contains "leftover worktree: STORY-018-99"
    And stderr contains a hint: "git worktree remove .worktrees/STORY-018-99"

  Scenario: cleargate sprint preflight catches non-Completed previous sprint
    Given CR-021 has merged
    And the previous sprint's state.json has sprint_status:"Active" (not Completed)
    When `cleargate sprint preflight SPRINT-19` runs
    Then the command exits 1
    And stderr contains "previous sprint not Completed"
    And stderr contains a hint: "run cleargate sprint close <prev-id> first"

  Scenario: Reporter agent has explicit capability surface
    Given CR-021 has merged
    When .claude/agents/reporter.md is read
    Then it contains a "Capability Surface" section with a table listing scripts, skills, hooks, inputs, output
    And it contains a "Post-Output Brief" section with the verbatim Brief text including "Ready to authorize close (Gate 4)?"
    And the listed default input is .reporter-context.md

  Scenario: cleargate-enforcement.md has §13 Sprint Execution Gate
    Given CR-021 has merged
    When .cleargate/knowledge/cleargate-enforcement.md is read
    Then it contains a "## 13. Sprint Execution Gate (Gate 3) (source: new in CR-021)" heading
    And §13 specifies the four checks
    And §13 declares "enforcing under execution_mode: v2; advisory under v1"

  Scenario: AI auto-picks sprint number during Prepare phase
    Given CR-021 has merged
    And the orchestrator is drafting a Sprint Plan
    When the orchestrator follows the Sprint Plan Template's <instructions> WHAT TO GATHER step
    Then it scans .cleargate/wiki/active-sprint.md + pending-sync/SPRINT-*.md
    And it emits the next sprint number as max(N) + 1
    And it surfaces the chosen number in the Sprint Plan Brief for human confirmation

  Scenario: AI proposes priority reordering
    Given CR-021 has merged
    And the backlog has 5 items with human-set priorities and known dependencies (item B depends on item A, but B has higher human priority)
    When the orchestrator drafts the Sprint Plan
    Then the Brief surfaces a "Recommended priority changes" section
    And the section flags item A → before B with a one-line rationale (dependency chain)

  Scenario: Mirror parity invariant
    Given CR-021 has merged
    When `diff` runs on each live/canonical pair (templates + scripts + agents + CLAUDE.md CLEARGATE-block + enforcement.md)
    Then every diff returns empty (or for CLAUDE.md, the CLEARGATE-tag-block region is byte-identical)

  Scenario: No regression
    Given CR-021 has merged
    When `cleargate doctor`, `cleargate wiki lint`, `node .cleargate/scripts/state-scripts.test.mjs`, `node .cleargate/scripts/test_ratchet.mjs`, and the CLI test suite (`npm test` in cleargate-cli/) run
    Then all five exit 0
```

### 4.2 Manual verification steps

- [ ] Read updated Sprint Plan Template — confirm `<instructions>` block declares actively-authored, contains POST-WRITE BRIEF with all six bullets, declares dual-audience structure.
- [ ] Read updated Sprint Report Template — confirm §4 Observe Findings present, §5 = old §4 Lessons, §6 = old §5 Retrospective, skip-if-empty pattern visible.
- [ ] Run `node .cleargate/scripts/prep_reporter_context.mjs SPRINT-18` against a fixture — inspect the output bundle, verify size + content slices.
- [ ] Run `node .cleargate/scripts/close_sprint.mjs SPRINT-18` end-to-end against a fixture — verify Step 3.5 fires, Step 7 fires after ack, naming uses `SPRINT-18_REPORT.md`.
- [ ] Run `cleargate sprint preflight SPRINT-19` in a clean repo — exits 0.
- [ ] Manually create a leftover `.worktrees/STORY-test/` dir, re-run preflight — exits 1 with the right message.
- [ ] Read updated `reporter.md` — confirm Capability Surface table + Post-Output Brief section.
- [ ] Read `cleargate-enforcement.md` §13 — confirm complete and consistent with the CLI subcommand behavior.
- [ ] Run `diff` on each live/canonical pair — empty.
- [ ] Run `cleargate doctor`, `cleargate wiki lint`, `state-scripts.test.mjs`, `test_ratchet.mjs`, `npm test` in cleargate-cli/ — all exit 0.

### 4.3 Definition of Done

- [ ] All §4.1 Gherkin scenarios pass.
- [ ] Mirror diff empty for all 8 file pairs.
- [ ] No regression on existing tests (5 test suites listed above).
- [ ] CR-020 has shipped before this CR's commits land (Wave dependency satisfied).
- [ ] EPIC-024 has shipped (cleargate-enforcement.md exists for §13 insertion).
- [ ] Backwards-compat preserved: SPRINT-01..17 archived REPORT.md files keep old names; new naming applies SPRINT-18+.
- [ ] No core gate-enforcement code regressions (gate-run.ts, push.ts, sync.ts byte-identical to pre-CR baseline).
- [ ] Architect (gate review) approves.
- [ ] Commit message format: `feat(EPIC-protocol): CR-021 Prepare/Close/Observe-phase mechanics` (single CR, may decompose into 2-3 commits along milestone boundaries).

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity**

Requirements to pass to Green (Ready for Execution):
- [x] Approved Proposal exists (waived per `proposal_gate_waiver` frontmatter — saved-memory pattern + brainstorm Option A confirmed by user 2026-05-01).
- [x] §3 Execution Sandbox lists every file path explicitly (~18 files, 8 mirror pairs, 6 net-new files).
- [x] Downstream invalidation analysis complete (§2.2: zero items reverted to 🔴; backwards-compat carve-outs documented for SPRINT-01..17).
- [x] Verification Protocol (§4) covers every behavior change (13 Gherkin scenarios + 10 manual steps).
- [x] No "TBDs" remain.
