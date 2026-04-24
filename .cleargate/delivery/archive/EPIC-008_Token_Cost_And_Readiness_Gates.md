---
epic_id: EPIC-008
status: "Abandoned"
ambiguity: 🟢 Low
context_source: PROPOSAL-005_Token_Cost_And_Readiness_Gates.md
owner: Vibe Coder (sandro.suladze@gmail.com)
target_date: TBD
created_at: 2026-04-19T00:00:00Z
updated_at: 2026-04-19T00:00:00Z
created_at_version: post-SPRINT-04
updated_at_version: post-SPRINT-04
depends_on_epics:
  - EPIC-001
related_epics:
  - EPIC-002
  - EPIC-009
approved: true
pushed_by: sandrinio@github.local
pushed_at: 2026-04-20T19:42:54.842Z
push_version: 3
---

# EPIC-008: Per-Work-Item Token Cost + Machine-Checkable Readiness Gates

## 0. AI Coding Agent Handoff

```xml
<agent_context>
  <objective>Ship two paired capabilities: (1) per-work-item `draft_tokens` frontmatter stamp populated by a PostToolUse hook from the sprint token ledger; (2) a closed-set predicate engine + `cleargate gate check` CLI that writes `cached_gate_result:` into each work item's frontmatter, blocks `wiki lint` on Epic/Story/CR/Bug failures, and advises (non-blocking) on Proposals. Also includes a SessionStart hook emitting a ~100-token blocked-items summary, and the token-ledger hook fix for the SPRINT-04→SPRINT-03 routing regression captured in FLASHCARD 2026-04-19.</objective>
  <architecture_rules>
    <rule>Agent never invokes stamp-tokens or gate check directly — a PostToolUse hook chains stamp-tokens → gate check → wiki ingest on every Write/Edit under .cleargate/delivery/**.</rule>
    <rule>Predicates are a CLOSED set (frontmatter/body/section/file-exists/link-target/status-of). No shell-out, no network, no arbitrary code in predicate execution.</rule>
    <rule>Gate definitions live centrally in .cleargate/knowledge/readiness-gates.md keyed by {work_item_type, transition}. Templates stay lean — no inline readiness blocks (PROP-005 Q2).</rule>
    <rule>Severity split: Proposal gates are ADVISORY (exit 0 with warnings); Epic/Story/CR/Bug gates are ENFORCING (exit non-zero blocks wiki lint) (PROP-005 Q6).</rule>
    <rule>Raw token counts only in frontmatter; USD cost is a Reporter-time derived view (PROP-005 Q4).</rule>
    <rule>No backfill of archived items — populates only from the go-live date forward (PROP-005 Q7).</rule>
    <rule>Stamp is idempotent within a session, accumulative across sessions with per-session breakdown (PROP-005 Q3).</rule>
    <rule>MCP-side gate enforcement is DEFERRED to post-PROP-007 (PROP-005 Q10). v1 enforcement point = wiki lint only.</rule>
    <rule>Scaffold-mirror discipline: every new hook/asset must live identically in cleargate-planning/ (shipped) AND .claude/ (dogfood). post-edit diff must be empty (FLASHCARD #wiki #protocol #mirror).</rule>
    <rule>PostToolUse hook schema uses nested `hooks[]` with `type:"command"` + `if:"Edit(<glob>)"` — no `pathPattern`, no `$CLAUDE_TOOL_FILE_PATH` env; file path is on stdin at `.tool_input.file_path` (FLASHCARD 2026-04-19 #hooks #protocol).</rule>
  </architecture_rules>
  <target_files>
    <file path=".cleargate/knowledge/readiness-gates.md" action="create" />
    <file path=".cleargate/knowledge/cleargate-protocol.md" action="modify" />
    <file path=".cleargate/templates/proposal.md" action="modify" />
    <file path=".cleargate/templates/epic.md" action="modify" />
    <file path=".cleargate/templates/story.md" action="modify" />
    <file path=".cleargate/templates/CR.md" action="modify" />
    <file path=".cleargate/templates/Bug.md" action="modify" />
    <file path=".cleargate/templates/initiative.md" action="modify" />
    <file path=".cleargate/templates/Sprint Plan Template.md" action="modify" />
    <file path="cleargate-cli/src/lib/readiness-predicates.ts" action="create" />
    <file path="cleargate-cli/src/lib/frontmatter-cache.ts" action="create" />
    <file path="cleargate-cli/src/lib/ledger-reader.ts" action="create" />
    <file path="cleargate-cli/src/commands/stamp-tokens.ts" action="create" />
    <file path="cleargate-cli/src/commands/gate.ts" action="create" />
    <file path="cleargate-cli/src/commands/doctor.ts" action="create" />
    <file path="cleargate-cli/src/wiki/lint.ts" action="modify" />
    <file path=".claude/hooks/token-ledger.sh" action="modify" />
    <file path=".claude/hooks/stamp-and-gate.sh" action="create" />
    <file path=".claude/hooks/session-start.sh" action="create" />
    <file path=".claude/settings.json" action="modify" />
    <file path="cleargate-planning/.claude/hooks/stamp-and-gate.sh" action="create" />
    <file path="cleargate-planning/.claude/hooks/session-start.sh" action="create" />
    <file path="cleargate-planning/.claude/settings.json" action="modify" />
  </target_files>
</agent_context>
```

## 1. Problem & Value

**Why are we doing this?**
Today `sprint-runs/<id>/token-ledger.jsonl` tracks per-sprint agent cost but cannot answer *"how much did PROPOSAL-005 itself cost to draft?"* — per-item attribution is missing. And the current Ambiguity Gate is a prose checklist a human visually inspects; under time pressure, humans tick boxes without reading. We need a machine-checkable readiness gate that refuses to advance when `TBD` strings remain or §6 still has unanswered questions — the agent becomes a gatekeeper on behalf of the human, not a yes-man. Both capabilities share the same surface (per-template frontmatter + per-template review logic) and reinforce each other: the readiness gate tells you *whether* to proceed, the token stamp tells you *what it cost to get there*.

**Success Metrics (North Star):**
- Every work-item file written under `.cleargate/delivery/**` in a dogfood session emerges with `draft_tokens:` populated from the sprint ledger (no `null` on first save).
- Every Epic/Story/CR/Bug with `TBD` in its body fails `wiki lint`; fixing the TBD makes lint pass.
- Reporter synthesis page distinguishes "one 40k draft" from "eight 5k revisions" by reading `draft_tokens.sessions[]`.
- SessionStart boot emits a ≤100-token blocked-items summary; no Vibe-Coder action required.
- Token-ledger routing regression (FLASHCARD 2026-04-19: SPRINT-04 rows landing in SPRINT-03) is eliminated — ledger rows land in the active sprint's run directory and carry the correct `work_item_id`.
- Agent answers *"is this ready?"* from cached frontmatter in ≤50 tokens without re-evaluating predicates against the document.

## 2. Scope Boundaries

**✅ IN-SCOPE (Build This)**
- [ ] Central `.cleargate/knowledge/readiness-gates.md` declaring all 6 transitions × criteria per PROP-005 §2.3 (Proposal→decomposition, Epic→decomposition, Epic→coding, Story→execution, CR→apply, Bug→fix).
- [ ] Closed-set predicate evaluator library (`readiness-predicates.ts`) covering the 6 predicate shapes from PROP-005 §2.4.
- [ ] Frontmatter-cache library (`frontmatter-cache.ts`) — idempotent read/write of `cached_gate_result` + `last_gate_check`.
- [ ] Ledger-reader library (`ledger-reader.ts`) — parses `sprint-runs/*/token-ledger.jsonl`, groups rows by `work_item_id` + session.
- [ ] `cleargate stamp-tokens <file>` CLI (hook-invoked, not agent-invoked).
- [ ] `cleargate gate check <file> [-v] [--transition <name>]` CLI — writes `cached_gate_result:{pass, failing_criteria, last_gate_check}` to frontmatter. Compact output by default, detailed with `-v` (PROP-005 Q5).
- [ ] `cleargate gate explain <file>` CLI — human-readable read-only rendering of current criteria + state.
- [ ] `cleargate doctor` base command with `--session-start` mode emitting blocked-gate summary (≤10 items, overflow → "N items blocked — run `cleargate doctor` for full list").
- [ ] Token-ledger hook generalization: extend `STORY_ID` detection to `(STORY|PROPOSAL|EPIC|CR|BUG)[-=]?[0-9]+(-[0-9]+)?`, record as `work_item_id` (PROP-005 Q1). Backward-compat alias: keep `story_id` on existing rows.
- [ ] Token-ledger sprint-routing fix: routes to the sprint whose raw file is `status: "Active"` (not `ls -td sprint-runs/*/`) — resolves FLASHCARD 2026-04-19 regression.
- [ ] PostToolUse hook `stamp-and-gate.sh` — chains `stamp-tokens → gate check → wiki ingest` in a single process. Logs to `.cleargate/hook-log/gate-check.log`.
- [ ] SessionStart hook `session-start.sh` — runs `cleargate doctor --session-start` on every boot.
- [ ] `.claude/settings.json` + `cleargate-planning/.claude/settings.json` — register both hooks (matcher + `if:"Edit(<glob>)"` per hooks-spec flashcard).
- [ ] Template updates: `draft_tokens:` stub in frontmatter of all 7 templates (input/output/cache_read/cache_creation/model/sessions[], initially null).
- [ ] Protocol §12 "Token Cost Stamping & Readiness Gates" added to `cleargate-protocol.md`; §4 "Phase Gates" updated to reference machine-checkable readiness; §10.8 wiki-lint enforcement extended.
- [ ] `wiki lint` refuses 🟢-candidate documents whose `cached_gate_result.pass == false` (enforcing types only) or whose `last_gate_check < updated_at` (staleness, all types).

**❌ OUT-OF-SCOPE (Do NOT Build This)**
- MCP-side gate enforcement (`cleargate_push_item` refuses on gate fail) — deferred per PROP-005 Q10; revisit after PROP-007 Multi-Participant Sync lands.
- USD cost in frontmatter — Reporter computes at sprint end from `cleargate-cli/src/lib/pricing.ts`; frontmatter stays raw tokens + model only (PROP-005 Q4).
- Backfill of archived items — forward-only (PROP-005 Q7).
- Per-document inline readiness overrides — deferred to v1.1 (PROP-005 Q2).
- Dollar-budget caps / enforcement — reporting only in v1.
- Real-time UI / dashboard for cost — CLI + frontmatter in v1.
- Dedicated flashcard for expensive-draft outliers — Reporter surfaces this; flashcard is future work.

## 3. The Reality Check (Context)

| Constraint | Rule |
|---|---|
| Idempotency | Re-stamping in the same session is a no-op. Re-drafting in a new session accumulates (input += new_input, ...) with `sessions:[...]` capturing per-session breakdown. |
| Hook ordering | `stamp-tokens` MUST precede `gate check` in the chain (gate may read `draft_tokens` in advisory-output). Single process, single log, ordering guaranteed. |
| Predicate safety | Sandboxed — no shell-out, no network, read-only FS access limited to `.cleargate/**`. |
| Staleness detection | `wiki lint` flags any file where `last_gate_check < updated_at` — catches silent hook failures within one lint pass. |
| Hook-failure visibility | Every invocation logs to `.cleargate/hook-log/gate-check.log`; `cleargate doctor` surfaces last-24h failures. |
| Severity split | Proposal → advisory (exit 0 always). Epic/Story/CR/Bug → enforcing (exit non-zero blocks wiki lint). `approved: true` still a pure human judgment; gate never blocks it. |
| Multi-agent cost | All subagents' ledger rows tagged with the same `work_item_id` accumulate into one `draft_tokens` block. |
| Missing ledger row | `stamp-tokens` writes `draft_tokens: {input: null, ...}` with `stamp_error:` annotation — never fabricates. |
| Cross-session model | `sessions: [{model, tokens, ts}]` preserves per-session detail; top-level `model:` is comma-joined for grep (PROP-005 Q3). |
| SessionStart cost cap | Summary ≤ 100 tokens; 10-item cap; overflow → "N items blocked" pointer (PROP-005 Q12). |
| Sprint-file stamping | Sprint `draft_tokens:` records only planning-phase tokens. Stories' tokens attribute to their own files; no double-counting (PROP-005 Q9). |
| Scaffold mirror | New hooks must be written identically to `.claude/hooks/` (live dogfood) AND `cleargate-planning/.claude/hooks/` (shipped). post-edit `diff` must return empty. |
| Hook schema | Claude Code uses nested `hooks[]` with `type:"command"` + `if:"Edit(<glob>)"`; file path on stdin at `.tool_input.file_path` — no `pathPattern`, no env var (FLASHCARD). |

## 4. Technical Grounding

**Frontmatter stamp shape (added to all 7 templates):**

```yaml
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
```

**`readiness-gates.md` entry shape** (from PROP-005 §2.3):

```yaml
- work_item_type: epic
  transition: ready-for-decomposition
  criteria:
    - id: proposal-approved
      check: "frontmatter(context_source).approved == true"
    - id: no-tbds
      check: "body does not contain 'TBD'"
    - id: interrogation-empty
      check: "§6 AI Interrogation Loop has zero unanswered questions"
    - id: affected-files-verified
      check: "§4 Technical Grounding contains ≥1 file path AND every path exists on disk"
    - id: scope-boundaries-sealed
      check: "§2 IN-SCOPE has ≥1 checked item AND §2 OUT-OF-SCOPE has ≥1 item"
```

**Predicate vocabulary (closed set, from PROP-005 §2.4):**
1. `frontmatter(<ref>).<field> <op> <value>`
2. `body contains "<string>"` / `body does not contain "<string>"`
3. `section(<N>) has <count> <item-type>`
4. `file-exists(<path>)`
5. `link-target-exists(<[[WORK-ITEM-ID]]>)`
6. `status-of(<[[ID]]>) == <value>`

**Hook schema (corrected per flashcard 2026-04-19):**

```json
{
  "hooks": {
    "PostToolUse": [{
      "hooks": [{
        "type": "command",
        "if": "Edit(.cleargate/delivery/**)",
        "command": ".claude/hooks/stamp-and-gate.sh"
      }]
    }],
    "SessionStart": [{
      "hooks": [{
        "type": "command",
        "command": ".claude/hooks/session-start.sh"
      }]
    }]
  }
}
```

`stamp-and-gate.sh` reads file path from stdin `.tool_input.file_path`, runs `cleargate stamp-tokens "$file" && cleargate gate check "$file" && cleargate wiki ingest "$file"`, logs everything to `.cleargate/hook-log/gate-check.log`.

**Ledger-hook changes** (`.claude/hooks/token-ledger.sh`):
- Detect `(STORY|PROPOSAL|EPIC|CR|BUG)[-=]?[0-9]+(-[0-9]+)?` in orchestrator transcript; record `work_item_id` column. Keep `story_id` column populated for backward-compat on STORY-only matches.
- **Sprint routing fix (per FLASHCARD 2026-04-19):** target sprint = the one whose raw file has `status: "Active"` in frontmatter, NOT the newest directory under `sprint-runs/`. Create `sprint-runs/<active-id>/` if missing. Eliminates SPRINT-04 → SPRINT-03 misrouting.

**Per-template gate specifications** (summary, expanded in `readiness-gates.md`):

| Template | Transition | Severity | Key criteria (beyond "approved + no TBDs") |
|---|---|---|---|
| Proposal | `ready-for-decomposition` | advisory | §2 architecture + §3 touched files populated; depends_on refs resolve |
| Epic | `ready-for-decomposition` | enforcing | proposal approved; §2 scope in/out populated; §4 files verified on disk |
| Epic | `ready-for-coding` | enforcing | all Stories linked; §5 Gherkin has happy + error scenarios; §6 empty |
| Story | `ready-for-execution` | enforcing | parent Epic 🟢; §3 files verified; §4 DoD items declared; Gherkin covers §1.2 |
| CR | `ready-to-apply` | enforcing | blast radius identified; all invalidated items reverted to 🔴; sandbox paths exist |
| Bug | `ready-for-fix` | enforcing | repro deterministic (≥3 steps); failing test path provided; severity set |

**Affected Files** (verified against current repo):
- `cleargate-cli/src/` — new libs + commands; extends existing `wiki/lint.ts`.
- `.claude/hooks/token-ledger.sh` — already exists at `.claude/hooks/token-ledger.sh`; extend per §4.
- `.claude/settings.json` — register PostToolUse + SessionStart hooks.
- `cleargate-planning/.claude/` — mirror copies of every hook + settings change.
- `.cleargate/templates/*.md` — all 7 files gain the `draft_tokens` + `cached_gate_result` stubs.
- `.cleargate/knowledge/cleargate-protocol.md` — new §12.

## 5. Acceptance Criteria

```gherkin
Feature: Token cost stamping + readiness gates

  Scenario: First write to a new Epic stamps draft_tokens
    Given an agent writes .cleargate/delivery/pending-sync/EPIC-999.md for the first time in session X
    When the PostToolUse hook fires
    Then stamp-and-gate.sh runs stamp-tokens → gate check → wiki ingest in order
    And EPIC-999.md has draft_tokens:{input:>0, output:>0, model:"<session-X-model>", sessions:[{...}]}
    And EPIC-999.md has cached_gate_result:{pass:<bool>, failing_criteria:[...], last_gate_check:<ISO8601>}
    And .cleargate/hook-log/gate-check.log has an OK entry for EPIC-999.md

  Scenario: Re-stamp in the same session is a no-op
    Given EPIC-999.md already stamped in session X
    When the agent edits a typo and the hook re-fires in session X
    Then draft_tokens values are unchanged (no double-count)
    And updated_at advances

  Scenario: Re-draft in a new session accumulates
    Given EPIC-999.md has draft_tokens:{input: 1000, sessions:[{session:"X",...}]}
    When session Y edits the file and the hook fires
    Then draft_tokens.input >= 1000 (accumulated)
    And draft_tokens.sessions has 2 entries
    And top-level model is comma-joined if models differ

  Scenario: Epic with TBD fails gate check
    Given .cleargate/delivery/pending-sync/EPIC-999.md contains "TBD" in §2
    When cleargate gate check EPIC-999.md runs
    Then exit code is non-zero
    And stdout prints "❌ no-tbds: 1 TBD in §2"
    And cached_gate_result.pass = false in frontmatter

  Scenario: Epic with TBD fails wiki lint
    Given EPIC-999.md has cached_gate_result.pass = false
    When cleargate wiki lint runs
    Then exit code is non-zero
    And a diagnostic names EPIC-999 and its failing criterion

  Scenario: Proposal with TBD warns but does not block
    Given PROPOSAL-999.md contains "TBD" in §2
    When cleargate gate check PROPOSAL-999.md runs
    Then exit code is 0
    And stdout prints "⚠ no-tbds: 1 TBD in §2 (advisory)"
    And cached_gate_result.pass = false (recorded, not enforced)

  Scenario: Verbose gate output shows expected vs. actual
    Given EPIC-999.md fails "affected-files-verified"
    When cleargate gate check EPIC-999.md -v runs
    Then stdout contains the full predicate evaluation
    And each failing file path is listed

  Scenario: SessionStart emits blocked-items summary
    Given 3 items in pending-sync/ have cached_gate_result.pass = false
    When a new Claude Code session starts
    Then session context includes a line "3 items blocked: EPIC-X, STORY-Y, BUG-Z"
    And the summary consumes ≤100 tokens

  Scenario: Token ledger tags PROPOSAL work_item_id
    Given an agent edits PROPOSAL-042.md during an orchestrator turn
    When the SubagentStop hook fires
    Then a new row in sprint-runs/<active>/token-ledger.jsonl has work_item_id="PROPOSAL-042"
    And story_id field is absent (or empty) for that row

  Scenario: Token ledger routes to active sprint (not newest directory)
    Given SPRINT-04 is status:"Active" in pending-sync/
    And sprint-runs/SPRINT-03/ exists as a leftover directory
    When a new ledger row is appended
    Then the row lands in sprint-runs/SPRINT-04/token-ledger.jsonl
    And not in sprint-runs/SPRINT-03/token-ledger.jsonl

  Scenario: Stale gate detected by lint
    Given EPIC-999.md has cached_gate_result.last_gate_check = "2026-04-18T12:00:00Z"
    And EPIC-999.md has updated_at = "2026-04-19T10:00:00Z"
    When cleargate wiki lint runs
    Then exit code is non-zero
    And a diagnostic names EPIC-999 as stale

  Scenario: gate explain reads cached result
    Given EPIC-999.md has cached_gate_result populated
    When cleargate gate explain EPIC-999.md runs
    Then output is human-readable and ≤50 LLM-tokens when fed back to an agent
    And no predicate re-evaluation occurs (read-only)
```

## 6. AI Interrogation Loop — RESOLVED

All 6 questions resolved 2026-04-19 by Vibe Coder (accept all AI recommendations).

1. **Protocol section numbering** — **Resolved:** EPIC-008 takes §12 ("Token Cost Stamping & Readiness Gates"). EPIC-001 keeps §11; EPIC-009 takes §13. Chronological by Epic number; avoids collision.
2. **`cleargate doctor` command ownership** — **Resolved:** shared command surface. First-to-ship creates the base (subcommand dispatcher + hook-health report); second extends with its mode. Single command, multiple modes — matches PROP-005 §2.6 + PROP-006 §2.12 intent.
3. **Token-ledger sprint-routing fix: in-scope for this Epic?** — **Resolved:** fix the FLASHCARD 2026-04-19 routing regression in STORY-008-04 — same file as the `work_item_id` generalization; cheap to pair. Regression fixture required (see STORY-008-04 §4).
4. **SessionStart hook test strategy** — **Resolved:** unit tests on `cleargate doctor --session-start` stdout only. Full-hook integration is a manual verification step in STORY-008-06's DoD (Claude Code hook harness too hard to stub cleanly in v1).
5. **`readiness-gates.md` versioning** — **Resolved:** always-current (no versioning in v1). Archived items are effectively frozen (no writes trigger hook); retroactive "gate check on archive" is an explicit operator action. Versioning becomes v1.1 work if archives actually need re-validation.
6. **Template stubs for `cached_gate_result`** — **Resolved:** carry the stub. Predictable frontmatter shape is easier for predicates to parse; missing-vs-null distinction is a source of lint warnings otherwise.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)

**Current Status: 🟢 Low Ambiguity — READY for Story execution**

Gate requirements (all met 2026-04-19):
- [x] PROPOSAL-005 has `approved: true`
- [x] `<agent_context>` block complete
- [x] §4 file paths verified against current repo
- [x] Cross-Epic dep on EPIC-001 declared
- [x] Cross-Epic coordination with EPIC-009 declared (shared `doctor` command surface)
- [x] §6 AI Interrogation Loop resolved
- [x] No TBDs in body
