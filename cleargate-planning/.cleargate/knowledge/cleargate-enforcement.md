# ClearGate Enforcement

Hook-enforced rules surfaced by CLI errors. AI agents read this file when a hook trips, not at session start. Source split from `cleargate-protocol.md` per EPIC-024 (2026-04-30).

## Index

| New § | Source § | Title |
|---|---|---|
| §1 | protocol §15 | Worktree Lifecycle |
| §2 | protocol §16 | User Walkthrough on Sprint Branch |
| §3 | protocol §17 | Mid-Sprint Change Request Triage |
| §4 | protocol §18 | Immediate Flashcard Gate |
| §5 | protocol §19 | Execution Mode Routing (retired — see §15 Operator Emergency Levers) |
| §6 | protocol §20 | File-Surface Contract |
| §7 | protocol §22 | Advisory Readiness Gates on Push — CR-010 |
| §8 | protocol §23 | Doctor Exit-Code Semantics |
| §9 | protocol §24 | Lane Routing |
| §10 | protocol §25 | Lifecycle Reconciliation (CR-017) |
| §11 | protocol §26 | Decomposition Gate (CR-017) |
| §12 | protocol §27 | Gate 3.5 — Sprint Close Acknowledgement (CR-019) |
| §15 | — | Operator Emergency Levers (STORY-070-01) |

---

## 1. Worktree Lifecycle (source: protocol §15)

**Always enforced** (STORY-070-01: `execution_mode` retired — single always-enforced behavior). Every story transition that would run a Developer agent MUST follow these procedures before any file edits begin. Set `CLEARGATE_ADVISORY=1` for break-glass downgrade to warnings (see §15).

### §1.1 Branch hierarchy

The branch hierarchy for a sprint is:

```
main
└── sprint/S-XX          ← cut at sprint start; never commit directly
    └── story/STORY-NNN-NN   ← cut when story transitions Ready → Bouncing
```

- **Sprint branch** is cut from `main` once at the start of each sprint:
  ```bash
  git checkout -b sprint/S-XX main
  ```
- **Story branch** is cut from the active sprint branch when the story enters `Bouncing` state:
  ```bash
  git checkout sprint/S-XX
  git checkout -b story/STORY-NNN-NN sprint/S-XX
  ```
- Story branches are **never** cut from `main` directly; they always track the sprint branch as parent.

### §1.2 Worktree commands

Per-story working trees live under `.worktrees/` at repo root. Each story gets its own isolated filesystem view.

**Create worktree (story starts bouncing):**
```bash
git worktree add .worktrees/STORY-NNN-NN -b story/STORY-NNN-NN sprint/S-XX
```

**Verify worktree:**
```bash
git worktree list
# .../repo            <sha>  [sprint/S-XX]
# .../repo/.worktrees/STORY-NNN-NN  <sha>  [story/STORY-NNN-NN]
```

**Merge story back into sprint branch (story passes QA + Architect):**
```bash
git checkout sprint/S-XX
git merge story/STORY-NNN-NN --no-ff -m "merge(story/STORY-NNN-NN): STORY-NNN-NN <title>"
```

**Remove worktree and story branch (after successful merge):**
```bash
git worktree remove .worktrees/STORY-NNN-NN
git branch -d story/STORY-NNN-NN
```

**Prune stale worktree refs:**
```bash
git worktree prune
```

All commands must be run from the **repo root** (not from inside `.worktrees/`), except Developer Agent file edits which happen inside the assigned worktree path.

### §1.3 MCP nested-repo rule

**The `mcp/` directory is a nested independent git repository.** Running `git worktree add` inside `mcp/` would create a worktree scoped to the nested repo, not to the outer ClearGate repo. This is a git footgun: the outer repo cannot track, merge, or remove the inner worktree via its own git commands.

**Rule:** Never run `git worktree add` inside `mcp/`. If a story requires edits to `mcp/`, the Developer Agent must edit `mcp/` from inside the outer worktree (`.worktrees/STORY-NNN-NN/mcp/...`) — the nested repo's files are visible there as a subdirectory, not as a separate git context. MCP-native worktree support is deferred to Q3.

### §1.4 Local state.json is in-flight authority

During a story's execution, `state.json` at `.cleargate/sprint-runs/<sprint-id>/state.json` is the single source of truth for story state. The MCP server is a **post-facto audit** channel: it receives state updates after each transition but is never consulted during execution. If MCP is unavailable, execution continues uninterrupted; state.json records the ground truth that MCP will eventually replicate. (Source: EPIC-013 Q7 resolution.)

### §1.5 Enforcement gates

**Always enforced.** Attempting to run a Developer Agent on a story without a matching `.worktrees/STORY-NNN-NN/` path present causes `validate_bounce_readiness.mjs` to exit non-zero and the orchestrator to halt the story transition. Set `CLEARGATE_ADVISORY=1` (§15) for break-glass downgrade.

### §1.6 Wave worktree contract (source: protocol §23)

A wave runs multiple per-story segments concurrently, each in its OWN ClearGate-managed `.worktrees/STORY-X` (created via `git worktree add .worktrees/STORY-X -b story/STORY-X sprint/S-NN` — **not** the Workflow tool's `isolation:'worktree'`, which strips gitignored `/.claude/` + `/mcp/` and cuts off the wrong base; spike decision 2). Two file-surface axes:

- **Per-worktree `.git` index (no race).** Each segment commits inside its own worktree with an isolated `.git` index, so the pre-commit surface gate (`file_surface_diff.sh`) runs per-worktree and parallel in-segment commits do **not** race each other. File-disjointness between co-waved stories is the Architect's `waves.json` guarantee (STORY-033-03's five-clause predicate), not a runtime lock.
- **Shared sprint-branch axis (serial barrier merge).** `sprint/S-NN` is a single-writer axis. The barrier therefore merges each GREEN `story/STORY-X` to `sprint/S-NN` **serially — one worktree at a time, never two concurrently** (protocol §23.3). Concurrent `git worktree add` at wave launch is avoided by pre-creating all wave worktrees serially before any segment runs.

---

## 2. User Walkthrough on Sprint Branch (source: protocol §16)

**Always enforced** (STORY-070-01): the sprint branch MUST NOT merge to `main` until the walkthrough is complete and all `UR:bug` items are resolved.

### §2.1 Walkthrough trigger

After all stories in the sprint are merged into `sprint/S-XX` (every story state ∈ `TERMINAL_STATES`) and before `sprint/S-XX` merges to `main`, the orchestrator invites the user to test the running application on the sprint branch.

### §2.2 Feedback classification

User feedback during the walkthrough is classified into exactly two event types:

| Event type | Definition | Bug-Fix Tax effect |
|---|---|---|
| `UR:review-feedback` | Enhancement, polish, copy change, or UX preference — does NOT fix broken behavior | Does NOT increment Bug-Fix Tax |
| `UR:bug` | Defect, crash, wrong output, or behavior broken relative to spec | DOES increment Bug-Fix Tax |

**Classification rule:** when in doubt, ask the user one targeted question — "Is this broken relative to spec, or a preference?" Do not default to `UR:bug`.

### §2.3 Logging

Each piece of walkthrough feedback MUST be logged in the sprint markdown file under `## 4. Execution Log` with the event prefix:

```
UR:review-feedback 2026-04-21 — copy should say "Sign in" not "Log in" (resolved: STORY-013-09-dev.md commit abc123)
UR:bug 2026-04-21 — create-project button 500s on submit (resolved: STORY-013-10-dev.md commit def456)
```

### §2.4 Resolution gate

The sprint branch MUST NOT merge to `main` while any `UR:bug` item is unresolved. `UR:review-feedback` items MAY be deferred to the next sprint with orchestrator + user acknowledgment logged.

---

## 3. Mid-Sprint Change Request Triage (source: protocol §17)

**Always enforced** (STORY-070-01): every user-injected change during a bounce MUST be classified before routing.

### §3.1 Classification table

When the user injects new input during a QA bounce or active story execution, the orchestrator classifies the input into one of four categories:

| Event type | Definition | Bounce-counter effect | Routing |
|---|---|---|---|
| `CR:bug` | Defect introduced by the current story's implementation | Counts toward Bug-Fix Tax; increments `qa_bounces` | Re-open story; Developer fixes; QA re-verifies |
| `CR:spec-clarification` | Clarification of existing spec — no new scope, removes ambiguity | Does NOT increment any bounce counter | Update story acceptance criteria in place; re-run impacted test |
| `CR:scope-change` | Net-new requirement or expansion of story scope | Deferred: create a new Story in `pending-sync/`; current story continues unchanged | New Story ID assigned; current bounce counter unaffected |
| `CR:approach-change` | Switch implementation approach without changing functional spec | Does NOT increment bounce counter; resets Developer context | Re-spawn Developer with updated approach note; same story ID |

### §3.2 Logging

Each mid-sprint CR MUST be logged in the sprint markdown file under `## 4. Execution Log` with the event prefix:

```
CR:spec-clarification 2026-04-21 — endpoint must return project slug (clarified in STORY-013-05 §1.2; no new scope)
CR:scope-change 2026-04-21 — user requests audit log table (new STORY-013-11 created in pending-sync/)
```

### §3.3 Scope-change quarantine

A `CR:scope-change` MUST NOT be folded into the current story's commit. Create a new Story file and handle in a future sprint or as a mid-sprint addition (requires orchestrator + user explicit sign-off to add mid-sprint).

---

## 4. Immediate Flashcard Gate (source: protocol §18)

**Always enforced** (STORY-070-01): the orchestrator MUST NOT create the next story's worktree until all `flashcards_flagged` entries from the prior story's dev + QA reports are processed.

**V-Bounce reference:** `skills/agent-team/SKILL.md` §"Step 5.5: Immediate Flashcard Recording (Hard Gate)" at pinned SHA `2b8477ab65e39e594ee8b6d8cf13a210498eaded`.

### §4.1 Trigger

After story N's commit merges into `sprint/S-XX` and QA approves, the orchestrator collects `flashcards_flagged` from both:
- `STORY-NNN-NN-dev.md` (Developer Agent output report)
- `STORY-NNN-NN-qa.md` (QA Agent output report)

The two lists are merged (union, deduplication by exact string match). If the combined list is empty, the gate passes immediately.

### §4.2 Processing rule

For each entry in the merged `flashcards_flagged` list, the orchestrator MUST take exactly one of two actions before creating story N+1's worktree:

| Action | Effect | Record location |
|---|---|---|
| **Approve** | Append the one-liner verbatim to `.cleargate/FLASHCARD.md` (newest-first, per SKILL.md format) | The card itself is the record |
| **Reject** | Discard the entry — do NOT append to `FLASHCARD.md` | Sprint §4 Execution Log: `FLASHCARD-REJECT YYYY-MM-DD — "<card text>" — reason: <one sentence>` |

### §4.3 Worktree creation gate

The orchestrator MUST NOT run `git worktree add .worktrees/STORY-NNN-NN ...` for story N+1 until the §4.2 processing loop is complete (every entry either approved or rejected). This is a blocking serial step, not a background task.

### §4.4 Cards format

Each entry in `flashcards_flagged` MUST conform to the format required by `.claude/skills/flashcard/SKILL.md`:

```
YYYY-MM-DD · #tag1 #tag2 · lesson ≤120 chars
```

The orchestrator may reformat an entry that violates the format before appending, but must log the reformat in sprint §4 Execution Log.

### §4.5 Historical note

Before STORY-070-01, this gate was advisory under `execution_mode: v1` and mandatory under `execution_mode: v2`. The `execution_mode` field is now retired — this gate is always enforced.

### §4.6 PreToolUse hook enforcement

The `pending-task-sentinel.sh` PreToolUse hook automatically enforces the flashcard gate before every Task (subagent) dispatch. This is implemented by STORY-014-03.

**Hash-marker convention:**

Each `flashcards_flagged` card is identified by the first 12 hexadecimal characters of its SHA-1 hash (computed with `shasum -a 1`):

```bash
HASH="$(printf '%s' "<card text>" | shasum -a 1 | cut -c1-12)"
```

Hash stability: the same card string always produces the same hash. The hash is computed over the exact card string as it appears in the report's `flashcards_flagged` list (after stripping surrounding quotes).

**Processed marker:**

To mark a card as processed (approved or rejected by the orchestrator), touch the marker file:

```bash
touch .cleargate/sprint-runs/<sprint-id>/.processed-<hash>
```

The marker files are gitignored via the existing `.cleargate/sprint-runs/` gitignore rule and serve only as local bookkeeping.

**Enforcement logic:**

1. The hook globs `SPRINT_DIR/STORY-*-dev.md` and `SPRINT_DIR/STORY-*-qa.md` (flat layout — no `reports/` subdirectory).
2. For each report file, it parses the `flashcards_flagged:` YAML list (inline `[]` and block `- "text"` forms both supported).
3. For each card, it computes the 12-char SHA-1 hash and checks for the `.processed-<hash>` marker in `SPRINT_DIR`.
4. If any card is unprocessed:
   - exits non-zero (blocks Task spawn) with stderr listing each unprocessed card and the `touch` command hint.
5. If `flashcards_flagged: []` or no report files exist, the gate passes immediately.

**Bypass:**

Set `SKIP_FLASHCARD_GATE=1` in the environment to bypass the gate entirely (both v1 and v2). This bypass is intended for CI and bootstrap scenarios where the hook runs without sprint context. Bypasses should be disabled once M1 is closed; the orchestrator tracks this in the sprint §4 Execution Log.

---

## 5. Execution Mode Routing (retired — source: protocol §19)

**STORY-070-01: `execution_mode` field is retired.** All gates are always enforced. This section is preserved for historical context only. See §15 (Operator Emergency Levers) for the break-glass escape hatch.

### §5.1 Historical flag semantics (retired)

The `execution_mode: "v1" | "v2"` field previously controlled whether protocol §§1–18 were enforcing or advisory for a sprint. As of STORY-070-01, this distinction is removed — the v2 (enforcing) behavior is unconditionally active. The field is stripped from state.json by the `_migrate-schema-v3.mjs` migrator on first read.

### §5.2 Sprint-scoped flag (retired)

Previously sprint-scoped. Now irrelevant — all sprints use the single always-enforced behavior.

### §5.3 Orchestrator routing rule (retired)

Previously, before spawning any agent, the orchestrator read the `execution_mode` frontmatter field and routed accordingly. As of STORY-070-01, this field is retired. The orchestrator always applies §§1–18 as mandatory gates. Use `CLEARGATE_ADVISORY=1` (§15) for break-glass.

### §5.4 CLI inert-mode message (retired)

Previously, v2-only CLI commands would print `v1 mode active — command inert` when `execution_mode: "v1"` was set. This behavior is retired — all CLI commands are always active.

### §5.5 Default value (retired)

Previously defaulted to `"v1"`. The field no longer exists in new state.json files.

---

## 6. File-Surface Contract (source: protocol §20)

Each story's §3.1 "Context & Files" table is the **authoritative file surface** for that story's commit. The pre-commit hook enforces this contract automatically. **Always enforced** (STORY-070-01: `execution_mode` retired).

### §6.1 Rule

A Developer agent MUST NOT stage and commit any file not declared in the active story's §3.1 table, unless that file matches a whitelist entry in `.cleargate/scripts/surface-whitelist.txt`.

Off-surface edits require one of:
1. A CR:scope-change item approved before the commit, OR
2. An updated §3.1 table committed in the same story (self-amending surface — rare, must be explicitly justified in the commit message).

### §6.2 Hook mechanics

The gate runs as `.cleargate/scripts/file_surface_diff.sh` invoked via `.claude/hooks/pre-commit-surface-gate.sh` and dispatched from `.claude/hooks/pre-commit.sh`. The dispatcher is symlinked to `.git/hooks/pre-commit`.

- Under v2: off-surface files cause a non-zero exit — the commit is blocked.
- Under v1: the hook prints a warning but exits 0 (advisory only).
- `SKIP_SURFACE_GATE=1` env variable bypasses the gate entirely (use sparingly; log bypass in sprint §4 Execution Log).

### §6.3 §3.1 table contract

The §3.1 table in `story.md` template uses a two-column `| Item | Value |` pipe table. The parser:
- Scans between the `### 3.1` heading and the next `### ` heading.
- Only processes rows where the Value cell contains `.` or `/` (path-shaped values).
- Strips backticks from values.
- Splits on `, ` to handle multiple paths in one cell.
- Ignores header and separator rows.

Non-path rows (e.g., "Mirrors", "New Files Needed: Yes/No") are silently skipped.

### §6.4 Whitelist

`.cleargate/scripts/surface-whitelist.txt` declares auto-generated files that are always admitted regardless of story surface. Seed entries include: `cleargate-planning/MANIFEST.json`, `.cleargate/hook-log/*`, `.cleargate/sprint-runs/**/token-ledger.jsonl`, `.cleargate/sprint-runs/**/.pending-task-*.json`, `.cleargate/sprint-runs/**/state.json`.

### §6.5 Install (dogfood)

On `cleargate init`, the scaffold automatically installs the `.git/hooks/pre-commit` symlink. For existing dogfood repositories, install once by hand:

```bash
ln -sf ../../.claude/hooks/pre-commit.sh .git/hooks/pre-commit
```

Log this step in the sprint §4 Execution Log.

---

## 7. Advisory Readiness Gates on Push (v2) — CR-010 (source: protocol §22)

### §7.1 Two-tier push gate semantics

Push-time gate enforcement uses two distinct tiers:

**Tier 1 — `approved: true` (hard reject, unchanged):**
`cleargate_push_item` throws `PushNotApprovedError` when `payload.approved !== true`. This is the human go/no-go gate. No advisory mode or env knob overrides it.

**Tier 2 — `cached_gate_result` (advisory by default):**
When `cached_gate_result.pass === false`, the push proceeds in default advisory mode. The pushed item's body receives a single advisory prefix line placed immediately after the H1 heading (or as the first line if no H1 exists):

```
[advisory: gate_failed — <comma-separated criterion ids>]
```

Body content beyond the advisory prefix is byte-identical to the input. The push result includes `gate_status: 'open'` and `failing_criteria: [...]` as response metadata (not persisted to the DB schema).

### §7.2 Strict-mode opt-in and audit log

Set `STRICT_PUSH_GATES=true` on the MCP server to restore pre-CR-010 hard-reject behavior (`PushGateFailedError`, no DB write). Default: `false` (advisory mode).

Advisory pushes (gate_status='open') are recorded in `audit_log` with `result='ok'` — the push succeeded. The `failing_criteria` are surfaced in the push response shape, not in a new audit column. No schema migration is required.
**Rationale:** PM-tool answer-collection requires items to land before readiness answers arrive; advisory mode enables this. See CR-010 §0 for full evidence.

---

## 8. Doctor Exit-Code Semantics (source: protocol §23)

`cleargate doctor` exits with one of three codes (all modes: default, `--session-start`, `--can-edit`, `--check-scaffold`, `--pricing`). Hooks branch on the integer, not on stdout.
- `0` — clean. No blockers, no config errors. Stdout MAY include informational lines.
- `1` — blocked items or advisory issues (gate failures, stamp errors, drifted SHAs, missing ledger rows). Stdout lists each blocker.
- `2` — ClearGate misconfigured or partially installed (missing `.cleargate/`, missing `MANIFEST.json`, missing `auth.json`, hook resolver failure). Stdout emits a remediation hint. See `cleargate doctor --help`.

---

## 9. Lane Routing (source: protocol §24)

A story is eligible for `lane: fast` only if all seven checks pass (any false → `standard`):
1. **Size cap.** ≤2 files AND ≤50 LOC net (tests count; generated files do not).
2. **No forbidden surfaces.** Story does not modify: `mcp/src/db/` / `**/migrations/` (schema); `mcp/src/auth/` / `mcp/src/admin-api/auth-*` (auth); `cleargate.config.json` / `mcp/src/config.ts` (runtime config); `mcp/src/adapters/` (adapter API); `cleargate-planning/MANIFEST.json` (scaffold manifest); security-relevant code (token handling, invite verification, gate enforcement).
3. **No new dependency.** No new package added to any `package.json`.
4. **Single acceptance scenario or doc-only.** Exactly one `Scenario:` block (or zero for doc-only). `Scenario Outline:` or multiple scenarios → `standard`.
5. **Existing tests cover the runtime change.** Named test file exists and includes the affected module, OR story is doc/comment/non-runtime config only.
6. **`expected_bounce_exposure: low`.** `med` or `high` is auto-`standard`.
7. **No epic-spanning subsystem touches.** All affected files live under the parent epic's declared scope directories.

**Demotion mechanics.** Demotion is one-way (`fast → standard`). Trigger: pre-gate scanner failure OR post-merge test failure on a fast-lane story. On demotion: set `lane = "standard"`, write `lane_demoted_at` (ISO-8601), `lane_demotion_reason`, reset `qa_bounces = 0` and `arch_bounces = 0` (see STORY-022-02 schema). Architect plan is invoked and QA spawned per standard contract.

Event-type `LD` (Lane Demotion) is recorded in sprint markdown §4 alongside existing `UR` and `CR` events; Reporter aggregates into §3 Execution Metrics > Fast-Track Demotion Rate.

---

## 10. Lifecycle Reconciliation (CR-017) (source: protocol §25)

### §10.1 Purpose

Artifact lifecycle drift occurs when a Developer agent commits `feat(STORY-NNN-NN): ...` but the artifact's `status:` field is never advanced and the file is never moved to `archive/`. CR-017 enforces status reconciliation at two sprint boundaries: sprint close and sprint kickoff.

### §10.2 Verb-to-Status Map (v1)

| Commit verb pattern | Applies to types | Expected terminal status | Expected location |
|---|---|---|---|
| `feat(STORY-NNN-NN): ...` | STORY | `Done` | `archive/` |
| `feat(<TYPE>-NNN): ...` where TYPE ∈ {EPIC, CR} | EPIC, CR | `Completed` OR `Done` | `archive/` |
| `fix(BUG-NNN): ...` | BUG | `Verified` | `archive/` |
| `fix(HOTFIX-NNN-NN): ...` | HOTFIX | `Verified`, `Done`, OR `Completed` | `archive/` |
| `merge: <TYPE>-NNN → ...` | any | ignored — merge commits carry no expectation | n/a |
| `chore(...)`, `docs:`, `refactor:`, `test:`, `file(...)`, `plan(...)` | n/a | no expectation | n/a |
| `feat(BUG-NNN): ...` (verb mismatch) | BUG | soft warning only — does NOT block in v1 | n/a |

Multi-ID commits: scanner parses subject + first non-empty body line for ALL ID patterns matching `(STORY-\d{3}-\d{2}|CR-\d{3}|BUG-\d{3}|EPIC-\d{3}|HOTFIX-\d{3}-\d{2})`. Each ID gets independent validation. Unknown IDs (no file found) are skipped silently.

### §10.3 Carry-Over Semantics

An artifact with `carry_over: true` in its frontmatter is silently skipped by the lifecycle reconciler — it does not appear in `drift` or `clean` counts. Carry-over is set **explicitly by the human at sprint close** as a deliberate "keep open across boundary" signal. It is never auto-inferred. `close_sprint.mjs` does NOT auto-promote `carry_over: true` artifacts into the next sprint plan.

### §10.4 Invocation Points and Gate Mode

| Phase | Invocation | Mode |
|---|---|---|
| **Sprint close** | `close_sprint.mjs` Step 2.6 via `cleargate sprint reconcile-lifecycle <id>` | Block-by-default. Drift → exit 1 with punch list. |
| **Sprint kickoff — lifecycle layer** | `cleargate sprint init` before `init_sprint.mjs` | **warn-only** when `lifecycle_init_mode: "warn"` in sprint frontmatter (default for SPRINT-15); **block** when `lifecycle_init_mode: "block"` (SPRINT-16+). `--allow-drift` flag skips the warn/block but records a waiver in `context_source:`. |
| **Always active** | Both gates always run (STORY-070-01: single enforced behavior). | n/a |

### §10.5 v2 Escalation Path

`lifecycle_init_mode: "warn"` was the grace setting for SPRINT-15 (already-in-flight artifacts). Starting with SPRINT-16, set `lifecycle_init_mode: "block"` in the sprint frontmatter to enforce hard blocking at kickoff. After one clean SPRINT-15 close, the `warn` grace period ends.

---

## 11. Decomposition Gate (CR-017) (source: protocol §26)

### §11.1 Purpose

A sprint that references `epics: ["EPIC-X"]` in its plan cannot activate until EPIC-X has been decomposed into at least one `STORY-X-NN_*.md` file with `parent_epic_ref: EPIC-X`. Similarly, a `proposals: ["PROPOSAL-Z"]` reference requires that an EPIC file citing PROPOSAL-Z in its `context_source:` exists. Decomposition is between-sprints transition work — not story-tracked, no Gherkin on the decomposition itself, no QA — but the gate at `cleargate sprint init` verifies the output.

### §11.2 Gate Rules

1. **Epic → stories.** For each ID in sprint frontmatter `epics:`, a file `EPIC-NNN_*.md` must exist in `pending-sync/` AND at least one `STORY-NNN-NN_*.md` must have `parent_epic_ref: EPIC-NNN` in its frontmatter. Violation: `reason: 'no-child-stories'`.
2. **Proposal → epic.** For each ID in sprint frontmatter `proposals:`, a file `EPIC-NNN_*.md` must exist in `pending-sync/` with `context_source:` containing the proposal ID string. Violation: `reason: 'no-decomposed-epic'`.
3. **Anchor file missing.** If the referenced file does not exist at all: `reason: 'file-missing'`.

### §11.3 No-Waiver Policy

The decomposition gate cannot be waived with `--allow-drift`. Passing `--allow-drift` with an outstanding decomposition failure still exits 1 and emits:

```
decomposition gate cannot be waived; complete the decomposition or push start_date.
```

If the Architect cannot deliver the decomposition before the activating sprint's `start_date`, push `start_date` — do not relax the gate.

### §11.4 Invocation

`cleargate sprint init` calls `reconcileDecomposition()` BEFORE shelling out to `init_sprint.mjs`. A non-empty `missing[]` result exits 1 with a punch list. Always enforced (STORY-070-01).

---

## 12. Gate 3.5 — Sprint Close Acknowledgement (CR-019) (source: protocol §27)

### §12.1 Gate Posture

Sprint close is a **Gate-3-class action** — same posture as `cleargate_push_item` push-approval (§4 Gate 3), which already requires `approved: true` + explicit human confirmation. Authorising the execution loop ("start sprint NN") does NOT authorise the close. Close requires its own dedicated human approval.

### §12.2 Two-Step Protocol

1. **Step A — Orchestrator:** runs `node .cleargate/scripts/close_sprint.mjs <sprint-id>` with no flags. The script validates Steps 1–2.6, prefills the report stub if missing, and exits 0 with the exact prompt: `Review the report, then confirm close by re-running with --assume-ack`. The orchestrator surfaces this prompt verbatim to the human and **halts**.
2. **Step B — Human:** reviews `REPORT.md`, then either runs `node .cleargate/scripts/close_sprint.mjs <sprint-id> --assume-ack` themselves, or explicitly tells the orchestrator "approved, close it" — at which point the orchestrator may pass the flag on the human's behalf.

### §12.3 Flag Reservation

`--assume-ack` is reserved for **automated test environments only**. The conversational orchestrator (the human-facing agent) is a non-test environment and MUST NOT pass `--assume-ack` on its own initiative. Violation of this rule is a Gate-3 breach equivalent to calling `cleargate_push_item` without `approved: true`.

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

This gate is **always enforced** (STORY-070-01: single always-enforced behavior).



## 14. Sprint Close Gate (Gate 4) — Pre-close + Post-close additions (source: CR-022)

`close_sprint.mjs` runs an 8-step close pipeline. Steps 2.7, 2.8, 6.5, 6.6, 6.7, and 8 were added in SPRINT-19 by CR-022 to harden the close pipeline against the issues observed in SPRINT-18 (worktrees left open, sprint branch unmerged, no post-close handoff visibility).

### §14.1 Step 2.7 — Worktree-Closed Pre-close Check

Before any close action, the script verifies no leftover story worktrees remain. Runs `git worktree list --porcelain` and matches paths under `.worktrees/`.

- **Enforcement (v2):** any leftover worktree halts the close (exit 1) with `Step 2.7 failed: leftover worktree at <path>`. Resolution: `git worktree remove` the abandoned worktree, or merge the in-flight story first.
- **Advisory (v1):** prints `Step 2.7 warning: leftover worktree at <path> (advisory in v1)` to stderr but continues.
- **Test seams:** `CLEARGATE_SKIP_WORKTREE_CHECK=1` (full bypass), `CLEARGATE_FORCE_WORKTREE_PATHS` (test injection).

### §14.2 Step 2.8 — Sprint-Merged-to-Main Verify

Verifies the sprint branch (`sprint/S-NN`) tip is an ancestor of `main`. Runs `git merge-base --is-ancestor <sprint-tip> <main-tip>`.

- **Enforcement (v2):** unmerged sprint halts the close (exit 1) with `Step 2.8 failed: sprint branch not merged to main`. Resolution: merge `sprint/S-NN` into `main` first.
- **Advisory (v1):** prints `Step 2.8 warning: sprint branch unmerged (advisory in v1)` to stderr but continues.
- **Test seams:** `CLEARGATE_SKIP_MERGE_CHECK=1`, `CLEARGATE_FORCE_MERGE_STATUS=merged|unmerged`, `CLEARGATE_REPO_ROOT` (test override).

### §14.3 Steps 6.5 / 6.6 / 6.7 — Post-close additions

Three non-fatal post-close steps fold into `improvement-suggestions.md`:
- **Step 6.5:** invokes `sprint_trends.mjs` (stub — full implementation deferred to CR-027).
- **Step 6.6:** scans for skill-candidate patterns via `suggest_improvements.mjs --skill-candidates`.
- **Step 6.7:** scans for stale flashcards via `suggest_improvements.mjs --flashcard-cleanup`.

Each step has its own skip seam (`CLEARGATE_SKIP_SPRINT_TRENDS=1`, `CLEARGATE_SKIP_SKILL_CANDIDATES=1`, `CLEARGATE_SKIP_FLASHCARD_CLEANUP=1`). Failures are non-fatal — printed as `Step 6.x warning:` and the pipeline continues.

### §14.4 Step 8 — Verbose post-close handoff list

Prints a 6-item handoff to stdout summarizing: (1) commits in sprint, (2) merge state, (3) wiki ingest status, (4) flashcard count, (5) artifacts written, (6) next-sprint preflight reminder. The next-sprint ID is computed by parsing the numeric portion of the closing sprint and incrementing it (e.g., SPRINT-19 → SPRINT-20).

This step replaces the prior 3-line "pipeline complete" summary with explicit action-oriented output for the conversational orchestrator to relay to the human.

### §14.5 `--allow-wiki-lint-debt` waiver flag

`cleargate sprint archive --allow-wiki-lint-debt` waives wiki-lint findings during archive. Reserved for cases where pre-existing wiki-lint debt blocks otherwise-clean archives (e.g., 34 broken-backlink findings carried since SPRINT-16). Without the flag, lint findings cause `archive` to roll back. The flag emits the verbatim Gherkin message `wiki-lint debt waived via --allow-wiki-lint-debt flag` and continues.

Reporter bundle cap raised from 80KB → 160KB (`MAX_BUNDLE_BYTES` in `prep_reporter_context.mjs`) to absorb heavy-strategy sprint reports. Override via `VITEST_MAX_FORKS`-style `MAX_BUNDLE_BYTES` future env.

---

## 15. Operator Emergency Levers (STORY-070-01)

**Internal break-glass env vars for ClearGate operators.** These are undocumented in normal user-facing docs; they exist to allow the framework to progress when a gate blocks incorrectly. Do not use routinely — gate failures are signals of real problems.

### `CLEARGATE_ADVISORY=1`

When set to the exact string `'1'`, all gate failures in the CLI (`cleargate sprint preflight`, `cleargate sprint init`, etc.) are **downgraded from hard exits to stderr warnings** prefixed with `[advisory]`. The command exits 0.

**Semantics:**
- Only the exact string `'1'` is truthy. Values `'0'`, `'true'`, `'yes'`, `''`, or absent → gate failures remain fatal.
- Implemented in `cleargate-cli/src/util/gate-mode.ts` via `isAdvisory()`.
- Does NOT downgrade migrator errors or parse failures — those remain fatal regardless.

**When to use:** CI environments bootstrapping a new ClearGate install, or during a sprint where a transient gate failure (e.g., stale state.json) would otherwise block a human-confirmed safe operation.

**Log advisory use:** Record any use of `CLEARGATE_ADVISORY=1` in the sprint §4 Execution Log.
