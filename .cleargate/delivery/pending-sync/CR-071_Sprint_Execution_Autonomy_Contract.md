---
cr_id: CR-071
parent_ref: EPIC-021
parent_cleargate_id: "EPIC-021"
sprint_cleargate_id: SPRINT-30
carry_over: false
status: Approved
approved: true
approved_at: 2026-05-19T00:00:00Z
approved_by: sandrinio
created_at: 2026-05-19T00:00:00Z
updated_at: 2026-05-19T00:00:00Z
created_at_version: cleargate@0.13.0
updated_at_version: cleargate@0.13.0
server_pushed_at_version: null
area: protocol/sprint-execution,agent-contracts
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-05-19T14:48:49Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
context_source: |
  Raised by sandrinio on 2026-05-19 while watching pdf_processor's
  first sprint execute through the relay peer. Verbatim:

    "i think we're also missing the autonomous execution mode when
     sprint starts. It shouldn't be asking questions unless it's
     critical and Orchestrator or architect cannot make the right
     decision to meet the sprint goal. All questions should be
     clarified before sprint starts. that's what the gate is for, right?"

  The principle ALREADY EXISTS but is under-codified:

  - `.claude/skills/sprint-execution/SKILL.md:640` says:
      "Sprint execution is autonomous. Once started, run the loop
       end-to-end. Escalate only on blockers, gate failures, or
       destructive operations."
  - Auto-memory `feedback_sprint_autonomy.md` carries the same rule.

  Gap evidence (why this CR matters):

  1. The rule lives in ONE place (the orchestrator's skill file).
     Sub-agents dispatched into the loop (Architect, Developer, QA,
     DevOps) do NOT carry the autonomy contract in their own
     definitions. Their prompts mention `blockers reports` but never
     `do not use AskUserQuestion`. If the orchestrator forgets to
     repeat the rule in each dispatch prompt, agents drift.
  2. `blocker` is undefined. Agents must guess what merits escalation
     vs. what they should resolve. A precise enumeration of
     "legitimate blocker" vs. "agent decides" cases is missing.
  3. The protocol doc (`.cleargate/knowledge/cleargate-protocol.md`)
     does NOT carry the autonomy contract — only the
     `--assume-ack`/Gate-4 guardrail. That's a narrower rule about
     one specific user-facing prompt; the broader contract is absent.
  4. No mechanical enforcement. An agent could call AskUserQuestion
     during execution and nothing stops it.

  Live observation: during pdf_processor's SPRINT-01 execution on
  2026-05-18, sandrinio (on that side) was prompted via AskUserQuestion
  to pick between "keep code / retrofit protocol / revert" — that ask
  WAS legitimate (it was about the user's intent re: a protocol
  bypass — a true blocker). But the framework currently has no way to
  distinguish "user-intent question (legitimate)" from "I-don't-know-
  which-error-message-to-use question (should-decide)." Both look the
  same to the dispatched agent.

  This CR encodes the contract in the protocol doc, propagates it to
  every agent definition with a precise blocker enumeration, and adds
  one optional enforcement hook for discoverability.
stamp_error: no ledger rows for work_item_id CR-071
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-05-19T14:48:48Z
  sessions: []
---

# CR-071: Sprint execution autonomy contract — agents resolve ambiguity, only escalate true blockers

## 0.5 Open Questions

- **Question:** Should the enforcement be a hard hook (PreToolUse on `AskUserQuestion` during an active sprint blocks the call) or a soft hook (logs a warning, lets it through, surfaces in the sprint report)?
- **Recommended:** Soft for v1 of this CR. Hard enforcement risks blocking the legitimate-blocker case (the agent genuinely needs a user decision). A soft warning + report aggregation gives us visibility to tune the rule without breaking real escalation paths. Promote to hard in a follow-up CR if soft data shows agents are crying wolf.
- **Human decision:** _populated during Brief review_

- **Question:** Does the autonomy contract apply during the Architect's Sprint Design Review (SDR), which happens AFTER initial Gate 2 approval but BEFORE sprint goes Active?
- **Recommended:** No. SDR is part of the gate phase, not execution. SDR is exactly where Architect surfaces clarifying questions (shared-surface conflicts, ADR collisions, lane reassignments) to the user. The contract kicks in only after `sprint_status: "Active"` flips in state.json.
- **Human decision:** _populated during Brief review_

- **Question:** How does the contract interact with `cleargate-wiki-contradict` advisory subagent, which can surface findings mid-execution?
- **Recommended:** Advisory subagents that emit warnings without halting the loop are fine — they're informational, not blocking. The contract bans interactive `AskUserQuestion`-style prompts, not all observability.
- **Human decision:** _populated during Brief review_

- **Question:** What happens if a Developer agent hits a story-level Gherkin scenario that's genuinely contradictory or impossible? Hard blocker, or should they pick the closest interpretation?
- **Recommended:** Hard blocker — write `STORY-NNN-NN-dev-blockers.md` and return BLOCKED. The story spec was supposed to clear at Gate 1; if it didn't, that's a Gate-1 escape and the user must triage. Developer should NOT silently reinterpret a contradictory spec.
- **Human decision:** _populated during Brief review_

## 1. The Context Override (Old vs. New)

**Obsolete Logic (What to Remove / Forget):**

- The autonomy contract lives in ONE place (`sprint-execution/SKILL.md:640`) as a single sentence. Sub-agents read their own definition files, not the skill. Today's contract is effectively orchestrator-only.
- The word "blocker" appears in agent definitions but is never defined. Implicit definition emerges from blockers-report examples (merge conflicts, infra failures), but the rule "do not ask the user — write a blockers report instead" is absent.
- No enforcement: an agent calling `AskUserQuestion` during sprint execution gets no warning.

**New Logic (The New Truth):**

The autonomy contract is **load-bearing protocol** with three layers:

### 1.1 Protocol-doc anchor (canonical)

Add a new section to `.cleargate/knowledge/cleargate-protocol.md` titled **§ Sprint Execution Autonomy** with:

- **Rule:** Once `sprint_status: "Active"`, no agent (Orchestrator, Architect, Developer, QA, DevOps, Reporter) MAY issue a user-facing prompt (`AskUserQuestion`, `ExitPlanMode`, interactive stdin read) **EXCEPT** for one of the precisely-enumerated "true blocker" cases below.
- **Rationale:** All ambiguity is supposed to clear at Gate 2 (pre-sprint). Mid-execution questions are evidence that Gate 2 was incomplete; the right answer is to surface those gaps to next sprint's Gate-2 checklist, not to interrupt the current execution.

### 1.2 Precise blocker enumeration

A "true blocker" — the only conditions under which an agent MAY escalate to the user during execution:

1. **Destructive action approval.** Any of: force-push, `git reset --hard`, dropping a DB table, deleting an untracked file the user might own, killing a process. The agent MUST ask before performing.
2. **Secret / credential handling.** Anything that would require reading from `.env`, fetching a secret, or persisting credential material. Agent asks before reading or writing.
3. **User-intent decision.** A question whose answer is genuinely "what does the user want?" and cannot be inferred from the sprint goal, story Gherkin, or prior decisions. Concrete examples: a protocol-bypass discovery (like pdf_processor 2026-05-18), a sprint-goal pivot, a Gate-4 close ack.
4. **True technical impossibility.** Required infrastructure unavailable (e.g., test database unreachable, MCP server down, npm registry timing out persistently). Agent writes a blockers report AND surfaces to user — both, because the user often needs to take action outside the loop.
5. **Spec-internal contradiction.** Story Gherkin contradicts itself, or two stories scheduled in the same wave specify incompatible behavior on a shared surface. Agent writes blockers report — this is a Gate-1/Gate-2 escape and the user must triage.

**Not blockers — agent decides:**

- Choice between two reasonable implementations that both meet the story's acceptance Gherkin. Architect picks; Developer follows.
- Test-pattern selection within established repo precedent.
- Minor wording / UX copy choices. Default to the conservative option; document the choice in the dev report.
- Refactor-or-not within the touched surface. Default to NO refactor unless the story specifies it (per CLAUDE.md "don't add features beyond what the task requires").
- Library version selection within Architect's pre-validated version table.
- Error-message phrasing.
- Log-line format.

### 1.3 Agent-definition propagation

Each agent definition (`architect.md`, `developer.md`, `qa.md`, `devops.md`, `reporter.md`) gains a top-of-file **Autonomy Contract** subsection that:

- Asserts: "You MUST NOT call `AskUserQuestion` or any other user-facing prompt during sprint execution."
- Lists the 5 true-blocker cases verbatim from §1.2 above (single source of truth via include, not copy-paste).
- States: "When in doubt, write a blockers report and return `BLOCKED`. Do not interpret silence as permission to proceed on ambiguous scope."

### 1.4 Soft enforcement hook (optional, recommended for v1)

A `PreToolUse` hook on `AskUserQuestion` checks for an active sprint (sentinel = `.cleargate/sprint-runs/.active` non-empty + `state.json` `sprint_status: "Active"`). If active:

- **Soft mode (this CR):** Logs a warning to `.cleargate/hook-log/autonomy-warnings.log` with timestamp + agent name (extracted from current dispatch) + question text. Lets the call proceed.
- The Reporter agent reads this log at sprint close and produces an `autonomy-warnings` section in the sprint report so we can see whether the rule is holding.

Hard enforcement (block the call) is deferred to a follow-up CR after we have data on legitimate blocker frequency.

## 2. Blast Radius & Invalidation

- [ ] **Invalidate/Update Story:** none in flight.
- [ ] **Invalidate/Update Epic:** EPIC-021 (Solo Onboarding DX) parent link.
- [ ] **Database schema impacts?** No.
- [ ] **Three-site dogfood mirror:**
  - `.cleargate/knowledge/cleargate-protocol.md` (canonical only — no mirror needed; knowledge dir is not bound-block-injected)
  - `.claude/skills/sprint-execution/SKILL.md` — cross-reference to new protocol section
  - `cleargate-planning/.claude/agents/*.md` (canonical) + `cleargate-cli/templates/cleargate-planning/.claude/agents/*.md` (payload, auto-mirrored by `npm run prebuild`) + live `/.claude/agents/*.md` (manual re-sync or `cleargate init` re-run)
- [ ] **User-visible behavior change:** Subtle but real. Agents start declining to ask. Some sprints may see more blockers reports as agents learn the rule. Reporter aggregates the autonomy-warnings log so we can tune.
- [ ] **Reporter template impact:** new section in sprint-report template for `autonomy-warnings` aggregation. Out-of-scope: just add the section header; populate it in a follow-up if needed.

## Existing Surfaces

- **Surface:** .claude/skills/sprint-execution/SKILL.md — the existing single-sentence autonomy rule (current line ~640). CR-071 expands and anchors it elsewhere.
- **Surface:** .cleargate/knowledge/cleargate-protocol.md — gains new section for the Sprint Execution Autonomy rule.
- **Surface:** .claude/agents/architect.md — existing blockers handling; gains Autonomy Contract subsection at the top.
- **Surface:** .claude/agents/developer.md — existing dev-blockers protocol; gains Autonomy Contract subsection at the top.
- **Surface:** .claude/agents/qa.md — currently has no explicit blockers section; gains Autonomy Contract plus blockers protocol.
- **Surface:** .claude/agents/devops.md — existing devops-blockers handling; gains Autonomy Contract subsection at the top.
- **Surface:** .claude/agents/reporter.md — gains a new section that reads the autonomy-warnings hook log at sprint close.
- **Why this CR extends rather than rebuilds:** the autonomy principle already exists in the skill; the blockers-report mechanism already exists in agent definitions. CR-071 ties them together with a precise enumeration and propagates the rule to every agent. No new mechanism — just promotion + clarification + enforcement.

## 3. Execution Sandbox

**Modify:**

- `.cleargate/knowledge/cleargate-protocol.md` — append new section **§ Sprint Execution Autonomy** with the rule + 5-case blocker enumeration + "not blockers" examples (per §1.1–1.2 above).
- `.claude/skills/sprint-execution/SKILL.md:640` — replace single-sentence autonomy rule with a cross-reference: "See `.cleargate/knowledge/cleargate-protocol.md` § Sprint Execution Autonomy for the canonical rule and blocker enumeration."
- `.claude/agents/architect.md` — add **Autonomy Contract** subsection near top, reference protocol doc.
- `.claude/agents/developer.md` — same.
- `.claude/agents/qa.md` — same + ensure blockers protocol exists (currently thin).
- `.claude/agents/devops.md` — same.
- `.claude/agents/reporter.md` — same + add subsection on reading `.cleargate/hook-log/autonomy-warnings.log` at sprint close.
- `cleargate-planning/.claude/agents/*.md` — mirror canonical edits.
- `npm run prebuild` (in `cleargate-cli/`) — runs `copy-planning-payload.mjs` which auto-mirrors to `cleargate-cli/templates/cleargate-planning/.claude/agents/*.md`. No manual edit there.
- Live `/.claude/agents/*.md` — manual re-port OR re-run `cleargate init` against this meta-repo after merge. List as DoD item on the closing story.
- `.claude/hooks/pre-tool-use-autonomy.sh` — **new hook file.** Reads stdin (Claude Code's PreToolUse hook protocol), inspects `tool_name`, if `AskUserQuestion` AND active sprint detected, appends to `.cleargate/hook-log/autonomy-warnings.log` and exits 0 (soft mode).
- `.claude/settings.json` — wire the new hook into the `hooks.PreToolUse` array. Both canonical + live.

**Do NOT touch:**

- The existing blockers-report mechanism (Developer's `STORY-NNN-NN-dev-blockers.md` flow). It's correct; CR-071 just makes it the default-mandatory escalation path instead of one option among several.
- Architect SDR — that's pre-execution and the contract doesn't apply.

## 4. Verification Protocol

**Test 1 — protocol doc carries the section:**
```ts
test('cleargate-protocol.md declares Sprint Execution Autonomy', () => {
  const proto = readFileSync('.cleargate/knowledge/cleargate-protocol.md', 'utf8');
  assert.match(proto, /Sprint Execution Autonomy/);
  assert.match(proto, /true blocker/i);
  // 5 enumerated blocker cases:
  for (const t of [/Destructive action/, /Secret.*handling/, /User-intent decision/, /technical impossibility/, /Spec-internal contradiction/]) {
    assert.match(proto, t);
  }
});
```

**Test 2 — each agent definition has the contract:**
```ts
test('each loop agent definition carries Autonomy Contract', () => {
  for (const agent of ['architect.md','developer.md','qa.md','devops.md','reporter.md']) {
    const body = readFileSync(`.claude/agents/${agent}`, 'utf8');
    assert.match(body, /Autonomy Contract/, `${agent}: missing autonomy section`);
    assert.match(body, /MUST NOT.*AskUserQuestion/i, `${agent}: missing AskUserQuestion ban`);
  }
});
```

**Test 3 — soft hook logs a warning when AskUserQuestion fires during active sprint:**
```ts
test('PreToolUse autonomy hook appends to log during active sprint', () => {
  // Arrange: fixture .cleargate/sprint-runs/.active = "SPRINT-XX", state.json sprint_status: Active
  // Act: invoke hook with stdin {tool_name: "AskUserQuestion", tool_input: {...}}
  // Assert: hook exit 0 + log file contains one new line with timestamp + agent + question
});
```

**Test 4 — hook is silent outside active sprint:**
```ts
test('autonomy hook does NOT log when no sprint active', () => {
  // Arrange: no .active sentinel OR sprint_status: Completed
  // Act: invoke hook with same payload
  // Assert: log file untouched
});
```

**Manual verification:**
1. Start a fresh sprint, flip status to Active.
2. Dispatch a Developer agent for a story whose Gherkin is intentionally crafted to tempt an `AskUserQuestion` (e.g., "use the right error message"). Confirm: agent writes to dev report and decides instead of asking.
3. Dispatch a Developer agent for a story whose acceptance includes a destructive action (e.g., "rm -rf the legacy_data dir"). Confirm: agent escalates via AskUserQuestion, hook fires soft warning, log captures it.
4. Read sprint report at close — confirm autonomy-warnings section is populated (or "none" if clean).

**Command:** `cd cleargate-cli && npm test && npm run check:agent-autonomy-contract`

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟡 Medium Ambiguity** — main pending decision is hard-vs-soft enforcement; recommended soft for v1.

*Evaluate each criterion against its literal text.*

Requirements to pass to Green (Ready for Execution):
- [x] "Obsolete Logic" to be evicted is explicitly declared (no enforcement, no doc anchor, no per-agent rule).
- [x] All impacted downstream items identified (none in flight; EPIC-021 link only).
- [x] Execution Sandbox contains exact file paths.
- [x] Verification command is provided.
- [ ] Soft-vs-hard enforcement decision signed off (recommended soft).
- [ ] `approved: true` is set in the YAML frontmatter.
- [x] §2.5 Existing Surfaces cites at least one source-tree path the CR extends.
