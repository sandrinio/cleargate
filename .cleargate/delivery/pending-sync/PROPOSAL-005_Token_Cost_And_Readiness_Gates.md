---
proposal_id: "PROP-005"
status: "Draft"
author: "AI Agent (cleargate planning)"
approved: false
created_at: "2026-04-19T00:00:00Z"
updated_at: "2026-04-19T00:00:00Z"
codebase_version: "post-SPRINT-03"
depends_on: ["PROP-001", "PROP-002"]
draft_tokens:
  input: null
  output: null
  cache_read: null
  cache_creation: null
  model: null
---

# PROPOSAL-005: Per-Work-Item Token Cost + Machine-Checkable Readiness Gates

## 1. Initiative & Context

### 1.1 Objective
Extend every ClearGate work-item template with two new capabilities:

1. **Token cost stamp** — each Proposal, Epic, Story, CR, Bug, Initiative, and Sprint file carries a `draft_tokens` block in its frontmatter reporting the LLM tokens spent to draft it (input / output / cache_read / cache_creation + model). Stamped automatically by the PostToolUse hook.
2. **Readiness Gates** — each template declares an explicit, machine-checkable readiness checklist for its next downstream transition (Proposal → Epic, Epic → decomposition → coding, Story → execution, CR → apply, Bug → fix). `cleargate gate check` evaluates the literal checklist against the document so "is this ready?" gets a grounded yes/no, not a rubber-stamp.

The two capabilities ship together because they share the same surface area (per-template frontmatter + per-template review logic) and reinforce each other: the readiness gate tells you *whether* to proceed, the token stamp tells you *what it cost to get there* — together they give the Vibe Coder objective signal on both quality and budget.

**Scope split (2026-04-19):** scaffold manifest + drift detection + `cleargate uninstall` lifted into sibling [PROPOSAL-006](./PROPOSAL-006_Scaffold_Manifest_And_Uninstall.md) per Q19 resolution. PROP-006 can ship on its own timeline; PROP-005 stands alone.

### 1.2 The "Why"

- **Budget transparency.** Today `sprint-runs/<id>/token-ledger.jsonl` tracks per-sprint agent cost but cannot answer *"how much did PROPOSAL-005 itself cost to draft?"*. Per-item attribution is required for ROI decisions — *is a 40k-token Epic worth its weight?* — and for retrospective analysis (Reporter synthesis, flashcard recording of expensive dead-ends).
- **Anti-rubber-stamp.** The current Ambiguity Gate is a markdown checklist the human visually inspects. Under time pressure, humans tick boxes without reading. A machine-checkable gate — "lint the document against the criteria" — refuses to advance when §6 AI Interrogation Loop still has unanswered questions or when "TBD" strings remain. The agent becomes a gatekeeper on behalf of the human, not a yes-man.
- **Missing transition: Epic → decomposition.** Today only one Epic-level gate exists ("Ready for Coding"). But *decomposition into Stories* is a distinct earlier transition that also needs its own readiness criteria (scope boundaries sealed, blast radius known, no cross-cutting TBDs). Without it, agents draft Stories against under-specified Epics and the ambiguity cascades.
- **Continuity with PROP-001 & PROP-002.** PROP-001 established the automatic-metadata pattern (`created_at`, `updated_at`, `codebase_version`). This proposal extends the same pattern with `draft_tokens`. PROP-002 established the wiki lint pass as a gate enforcer — readiness checks plug into that existing lint infrastructure rather than inventing a new one.
- **Flashcard / Reporter feedback loop.** Token cost per item lets the Reporter flag outlier drafts ("PROPOSAL-042 consumed 2× the 30-day median — investigate"). Readiness-gate failures at Gate 1/3 become flashcard-worthy learning events.
- **Token-efficient by construction.** Both capabilities are pure data operations — no LLM judgment required. They run as deterministic hook + CLI code (bash / TypeScript), not as subagents or skills. The agent pays ~50 tokens to read cached gate results from frontmatter instead of ~2–5k tokens to re-evaluate criteria against the document on every "is this ready?" check. See §2.7 for the hook-first execution model.

### 1.3 Non-Goals

- No real-time UI or dashboard for token cost (CLI + frontmatter only in v1).
- No enforced token budget *caps* — reporting only. Cap enforcement is v1.1 once baseline data exists.
- No retroactive stamping of archived items (would invalidate `created_at` immutability from PROP-001).

---

## 2. Technical Architecture & Constraints

### 2.1 Dependencies

- **PROP-001** (hard) — frontmatter stamping helper is the extension point for `draft_tokens`. This proposal cannot ship until PROP-001's `stamp-frontmatter` helper lands (EPIC-001).
- **PROP-002** (soft) — readiness lint piggybacks on `cleargate wiki lint`. If PROP-002 ships first (currently in SPRINT-04), we extend its lint pass. If not, we ship a standalone `cleargate gate check` command.
- **Claude Code transcript schema** — the SubagentStop hook already parses `message.usage.{input,output,cache_*}` per transcript. The new work reuses that parser.
- **Existing token-ledger hook** (`.claude/hooks/token-ledger.sh`) — remains unchanged; its per-sprint ledger is the authoritative source. The per-item stamp is a *summary* derived from it.

### 2.2 Token-Stamp Data Flow

```
Agent drafts PROPOSAL-NNN.md (Write/Edit)
    ↓
PostToolUse hook fires on .cleargate/delivery/** writes:
  1. cleargate stamp-tokens <file>    — updates draft_tokens:{...} from ledger
  2. cleargate gate check <file>       — updates cached_gate_result:{...}
  3. cleargate wiki ingest <file>      — refreshes wiki page (existing)
    ↓
SubagentStop hook continues to append per-turn rows to
  sprint-runs/<id>/token-ledger.jsonl (unchanged; source of truth for cost)
    ↓
Vibe Coder later asks "is this ready?" → agent reads cached_gate_result
  from frontmatter (~50 tokens); no re-evaluation needed.
```

**The agent does not call `stamp-tokens` or `gate check` directly** — the hook owns both. This keeps the agent's prompt short (no "remember to stamp before returning" instruction) and zero-cost: the CLI runs in bash, not as a subagent.

**Key property:** the stamp is idempotent. Re-running on the same file with the same session adds nothing; if the file is re-drafted in a new session, the helper accumulates (input += new_input, …) so multi-session drafts show true total cost.

### 2.3 Readiness-Gate Model

**Gate definitions live centrally in `.cleargate/knowledge/readiness-gates.md`** — one canonical page declaring every transition and its predicate list, keyed by `{work_item_type, transition}`. Templates do **not** carry inline `readiness_gate:` blocks. Rationale (Q2 resolution): a single source of truth is easier to audit and keeps the seven templates lean. Per-document overrides are deferred to v1.1 if a real case demands it.

Example entry in `readiness-gates.md`:

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

Each `check` is a tiny, deterministic predicate executable by `cleargate gate check <file>`. The command looks up the document's type + current transition, reads the matching criteria from `readiness-gates.md`, and evaluates them against the document. Exits 0 if all pass, non-zero with a readable diff otherwise. Predicates are a closed, documented set (see §2.4) — not arbitrary code — so readiness logic is auditable and portable across projects.

**Per-template gate specifications (summary):**

| Template | Transition | Key criteria (beyond "approved + no TBDs") |
|---|---|---|
| Proposal | `ready-for-decomposition` | §2 architecture + §3 touched files populated; depends_on refs resolve |
| Epic | `ready-for-decomposition` | proposal approved; §2 scope in/out populated; §4 files verified on disk |
| Epic | `ready-for-coding` | all Stories linked; §5 Gherkin has happy + error scenarios; §6 empty |
| Story | `ready-for-execution` | parent Epic 🟢; §3 files verified; §4 DoD items declared; Gherkin covers §1.2 |
| CR | `ready-to-apply` | blast radius identified; all invalidated items reverted to 🔴; sandbox paths exist |
| Bug | `ready-for-fix` | repro deterministic (≥3 steps); failing test path provided; severity set |

### 2.4 Predicate Vocabulary (closed set)

Machine-checkable predicates are one of:

- `frontmatter(<ref>).<field> <op> <value>` — resolves `<ref>` (own file or linked file), reads field, compares.
- `body contains "<string>"` / `body does not contain "<string>"`
- `section(<N>) has <count> <item-type>` — e.g. `section(2) has ≥1 checked-checkbox`
- `file-exists(<path>)`
- `link-target-exists(<[[WORK-ITEM-ID]]>)` — resolves via `wiki/index.md`
- `status-of(<[[ID]]>) == <value>` — cross-doc status check

Anything outside this set is rejected at template-lint time — forces readiness to be grounded in inspectable facts, not prose claims.

### 2.5 System Constraints

| Constraint | Detail |
|---|---|
| Backward compatibility | Existing archived work items lack `draft_tokens` and `readiness_gate` blocks. Both are treated as optional; lint warns (not errors) when missing on pre-cutover items. |
| Token accounting model | Raw token counts only. No dollar-cost conversion in frontmatter (prices drift). Reporter computes $ at sprint end. |
| Privacy | Transcript paths never land in the frontmatter — only aggregate counts + model ID. |
| Idempotency | Re-stamping the same file in the same session is a no-op. Re-drafting in a new session accumulates. |
| Gate execution safety | Predicates are sandboxed — no shell-out, no network, no arbitrary code. Read-only filesystem access limited to `.cleargate/**`. |
| Multi-agent cost | When multiple subagents contribute to one draft (e.g. architect + developer on a Story), all their usage rows for that `work_item_id` accumulate into the single `draft_tokens` block. |
| Failure mode (missing ledger) | If the hook did not fire or the ledger row is missing, `stamp-tokens` writes `draft_tokens: {input: null, …}` with a `stamp_error:` annotation — never fabricates numbers. |
| Gate-result staleness | Cached `gate_result` carries `last_gate_check: <ISO8601>`. `wiki lint` flags any file where `last_gate_check < updated_at` (frontmatter was touched after the last gate run) — catches silent hook failures. |
| Hook-failure visibility | Every hook invocation logs to `.cleargate/hook-log/gate-check.log` (stdout + stderr + exit code). `cleargate doctor` surfaces any failure in the last 24h — the hook can fail silently but the staleness lint + doctor command make it visible within one lint pass. |
| Cross-session work | `draft_tokens.sessions: [...]` keeps per-session breakdown so the Reporter can distinguish "one 40k draft" from "eight 5k revisions". |

### 2.6 CLI Surface

New commands:

- `cleargate stamp-tokens <file>` — reads the session's ledger rows for the file's `work_item_id`, writes `draft_tokens:{...}` into frontmatter. Invoked by the PostToolUse hook, not by the agent.
- `cleargate gate check <file> [--transition <name>]` — evaluates the file's readiness gate; writes `cached_gate_result:{pass, failing_criteria, last_gate_check}` into frontmatter; exits non-zero on any failure. Invoked by the PostToolUse hook.
- `cleargate gate explain <file>` — human-readable rendering of the readiness criteria and their current state. Read-only. Used by the agent when the Vibe Coder asks *"is this ready?"* — answers from cached frontmatter in ~50 tokens without re-evaluating.
- `cleargate doctor` — reports hook health (last invocation time, recent failures from `.cleargate/hook-log/`). Run on demand when something seems wrong.

Integration points:
- `cleargate wiki lint` (from PROP-002) verifies `cached_gate_result.pass == true` on every 🟢-candidate document and refuses to pass lint on stale/failing gates.
- MCP `cleargate_push_item` refuses to push any work item whose cached gate result is not passing.

### 2.7 Hook-First Execution Model

Three hooks carry this feature; no new subagents and no new skills.

| Hook | Trigger | Command | Purpose |
|---|---|---|---|
| PostToolUse | Write/Edit under `.cleargate/delivery/**` | `cleargate stamp-tokens "$file" && cleargate gate check "$file" && cleargate wiki ingest "$file"` | On every draft save, update token stamp + cached gate result + wiki page in one shot. |
| SubagentStop | (existing) | `.claude/hooks/token-ledger.sh` | Append per-turn usage rows to the sprint ledger. Unchanged semantics; adds `work_item_id` column. |
| SessionStart | session boot | `cleargate doctor --session-start` | Greps `pending-sync/` for any file with `cached_gate_result.pass == false`, emits a one-line summary into the session context (~100 tokens) so the agent knows what's blocked before the Vibe Coder asks. |

**Why no subagent / no skill:**
- A subagent for `gate check` would pay full model tokens to evaluate deterministic predicates — strictly worse than the CLI.
- A skill for "check readiness" would load prompt context on every invocation; the cached frontmatter result makes the skill redundant.
- The agent's only job is *reading* the cached result when asked. No prompt engineering required.

**Hook-failure mitigation:** see §2.5 rows *Gate-result staleness* and *Hook-failure visibility*. The `last_gate_check` vs. `updated_at` comparison makes silent hook failures detectable within one `wiki lint` pass.

---

## 3. Scope Impact (Touched Files & Data)

### 3.1 Known Files — must be modified

**Templates (add `draft_tokens` frontmatter stub + `§ Readiness Gate` block):**
- `.cleargate/templates/proposal.md`
- `.cleargate/templates/epic.md`
- `.cleargate/templates/story.md`
- `.cleargate/templates/CR.md`
- `.cleargate/templates/Bug.md`
- `.cleargate/templates/initiative.md`
- `.cleargate/templates/Sprint Plan Template.md`

**Protocol:**
- `.cleargate/knowledge/cleargate-protocol.md` — add §11 "Token Cost Stamping" and extend §4 (Phase Gates) with the machine-checkable readiness check; extend §10.8 (wiki lint enforcement) to include readiness-gate checks.

**Hooks:**
- `.claude/hooks/token-ledger.sh` — extend the `STORY_ID` detection to also capture `PROPOSAL-NNN`, `EPIC-NNN`, `CR-NNN`, `BUG-NNN` and record as `work_item_id` (keep `story_id` as alias for backward compat on existing rows).
- `.claude/hooks/stamp-and-gate.sh` — new. PostToolUse on Write/Edit under `.cleargate/delivery/**`. Chains `stamp-tokens` → `gate check` → `wiki ingest`. Logs to `.cleargate/hook-log/gate-check.log`.
- `.claude/hooks/session-start.sh` — new. Runs `cleargate doctor --session-start`, emits blocked-item summary into session context.
- `.claude/settings.json` — register the two new hooks (PostToolUse matcher `Write|Edit` with pathPattern `.cleargate/delivery/**`; SessionStart trigger).
- `cleargate-planning/.claude/settings.json` — mirror the hook config so `cleargate init` scaffolds it into new projects.

**CLI (scaffold source):**
- `cleargate-cli/src/commands/stamp-tokens.ts` — new.
- `cleargate-cli/src/commands/gate.ts` — new (subcommands: `check`, `explain`).
- `cleargate-cli/src/commands/doctor.ts` — new (reports hook health; `--session-start` mode emits blocked-gate summary).
- `cleargate-cli/src/lib/readiness-predicates.ts` — new (predicate evaluator, closed set from §2.4).
- `cleargate-cli/src/lib/ledger-reader.ts` — new (parses `sprint-runs/*/token-ledger.jsonl` for a given work_item_id + session).
- `cleargate-cli/src/lib/frontmatter-cache.ts` — new (reads/writes `cached_gate_result` + `last_gate_check` idempotently).

### 3.2 Expected New Entities

- `.cleargate/knowledge/readiness-gates.md` — canonical reference of all transitions + criteria + predicate grammar. One page, centralized (Q2 resolution). Read by `cleargate gate check` at evaluation time and by agents when drafting any work item.
- Agent-definition updates (under `cleargate-planning/.claude/agents/`) — agents read cached `cached_gate_result` from frontmatter when the Vibe Coder asks readiness questions. Stamp-tokens and gate-check are hook-owned; no agent-side invocation changes required.
- Test fixtures under `cleargate-cli/test/fixtures/gate/` — one minimal + one failing example per template type.

### 3.3 MCP Adapter Impact

- `cleargate_push_item` — before push, invokes `gate check` on the target file; refuses with a structured error naming the failing predicate if any criterion fails. This is a hard gate (Gate 3 enforcement).

---

## 4. AI Interrogation Loop (Human Input Required)

*(The following are the AI's open questions on this Proposal. The Proposal stays at Draft until all are answered. Draft → In Review once the Vibe Coder has answered; In Review → Approved when `approved: true` is set.)*

1. **Q — Scope of "work_item_id" in the hook.** Should the token-ledger hook generalize fully today (support PROP/EPIC/STORY/CR/BUG) or start Story-only (match today's behavior) and extend incrementally? Recommendation: full generalization is a one-line regex change — do it now.
   - **Human Answer:** {Waiting}

2. **Q — Readiness-gate authoring: declarative block vs. conventions-by-section.** §2.3 proposes a YAML `readiness_gate:` block per template. Alternative: hard-code the gate criteria in `readiness-gates.md` per work-item-type and keep templates lean. Tradeoff: inline is more flexible (per-document overrides) but more surface area to lint; centralized is simpler but rigid. Recommendation: centralized for v1, allow inline overrides in v1.1 only if a real need emerges.
   - **Human Answer:** **Centralized** (2026-04-19). Gates live in `.cleargate/knowledge/readiness-gates.md`; templates stay lean. Inline overrides deferred to v1.1.

3. **Q — What happens on multi-session drafts with model changes?** If a draft is started on Sonnet and finished on Opus, do we store `model: "sonnet,opus"` (comma-joined like the existing hook) or `model: "mixed"` with per-session breakdown in `sessions:`? Recommendation: comma-joined for brevity + `sessions: [{model, tokens...}]` for detail.
   - **Human Answer:** {Waiting}

4. **Q — Should the token stamp include estimated cost in USD?** Pro: immediate Vibe-Coder feedback on expensive drafts. Con: prices drift; stamped cost becomes stale; forces repo-wide updates when prices change. Recommendation: raw tokens in frontmatter; Reporter computes $ at sprint end (prices versioned in Reporter config).
   - **Human Answer:** {Waiting}

5. **Q — Gate failure rendering.** When `gate check` fails, should it print a compact one-line-per-criterion summary or a detailed diff showing the expected vs. actual state of each predicate? Recommendation: compact by default, detailed with `-v`.
   - **Human Answer:** {Waiting}

6. **Q — Enforcement severity at Gate 1 (Proposal approval).** Should a Proposal itself have a readiness gate (blocking the human from approving until criteria pass), or is Proposal approval purely a human judgment call with no pre-checks? Recommendation: *advisory* for Proposals (lint warns but does not block `approved: true`) — the Vibe Coder's judgment is the whole point of Gate 1. Enforcement kicks in at Epic/Story/CR/Bug where the criteria are structural.
   - **Human Answer:** {Waiting}

7. **Q — Retroactive stamping.** Do we backfill `draft_tokens` for already-archived items using git log + saved transcripts, or leave history blank? Recommendation: leave blank. Retrofit is low-value and risks invalidating `created_at` immutability.
   - **Human Answer:** {Waiting}

8. **Q — Epic has two transitions (decomposition, then coding).** Do we put both `readiness_gate` blocks in the Epic template or treat it as "the gate the Epic is currently asking about" (transition advances state)? Recommendation: both blocks, keyed by `transition:` — `cleargate gate check --transition ready-for-decomposition` vs. `--transition ready-for-coding`. Default transition = whichever the document has *not yet passed*.
   - **Human Answer:** {Waiting}

9. **Q — Token stamp on Sprint files.** Sprint files are assembled from many sub-drafts over days; is stamping meaningful? Recommendation: stamp the *planning-phase* tokens only (the sprint plan drafting session), not aggregate of all stories within the sprint. Story tokens already attribute to the Story itself.
   - **Human Answer:** {Waiting}

10. **Q — Gate check in wiki lint vs. MCP push.** Both are enforcement points. If `wiki lint` already checks gates, is MCP-side enforcement redundant? Recommendation: keep both. `wiki lint` runs at Gate 1/3 in the planning flow; MCP push is a last-mile backstop in case lint was skipped (e.g. CI without Claude Code). Belt + suspenders; cheap to maintain.
   - **Human Answer:** {Waiting}

11. **Q — Hook ordering with existing `wiki ingest` hook.** PROP-002 already installs a PostToolUse hook that runs `cleargate wiki ingest` on `.cleargate/delivery/**` writes. This proposal adds `stamp-tokens` + `gate check` on the same trigger. Options: (a) one combined hook script that chains all three; (b) three separate hook registrations firing in order. Recommendation: (a) — one `stamp-and-gate.sh` that chains the trio in a single process. Single log file, single failure mode, and ordering is guaranteed (stamp must precede gate-check because gate-check may read `draft_tokens`).
    - **Human Answer:** **Defer; rewrite later** (2026-04-19). Let SPRINT-04 ship the `wiki ingest` hook as-is. When PROP-005 lands, the implementing Story will add `stamp-tokens` + `gate check` to the same hook script (combined chain — rationale (a) still holds) as a refactor rather than blocking SPRINT-04. Confirmed by Vibe Coder: "split will help with this" — PROP-005 and PROP-002 sequence cleanly because they're now independent proposals.

12. **Q — SessionStart cost discipline.** The SessionStart hook adds ~100 tokens to every session. Worth it? Recommendation: yes — it replaces the agent's implicit "scan pending-sync/" behavior which currently costs ~2–3k tokens via Read/Glob on every session boot. Net savings ~20×. Cap the summary at 10 items; if more are blocked, summarize as "12 items blocked — run `cleargate doctor` for full list".
    - **Human Answer:** {Waiting}

---

## Approval Gate

(Vibe Coder: Review this proposal. If the architecture and context are correct, answer the questions in §4 and set `approved: true` in the YAML frontmatter. Only then is the AI authorized to decompose into Epics/Stories.)
