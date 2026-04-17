---
epic_id: "EPIC-002"
status: "Ready"
ambiguity: "🟢 Low"
context_source: "PROPOSAL-002_Knowledge_Wiki.md"
owner: "Vibe Coder (ssuladze@exadel.com)"
target_date: "TBD"
created_at: "2026-04-17T00:00:00Z"
updated_at: "2026-04-17T00:00:00Z"
created_at_version: "strategy-phase-pre-init"
updated_at_version: "strategy-phase-pre-init"
resolved_at: "2026-04-17T00:00:00Z"
resolved_by: "Vibe Coder (ssuladze@exadel.com)"
---

# EPIC-002: Knowledge Wiki Layer

## 0. AI Coding Agent Handoff

```xml
<agent_context>
  <objective>Ship the Karpathy-style compiled awareness layer at .cleargate/wiki/. Three subagents (ingest/query/lint) maintain an index.md + log.md + per-item pages. PostToolUse hook + protocol rule trigger ingest; lint blocks Gate 1 and Gate 3 on drift.</objective>
  <architecture_rules>
    <rule>Wiki is derived; raw files (.cleargate/delivery, .cleargate/plans) are source of truth. On conflict, lint rebuilds from raw.</rule>
    <rule>Wiki pages hold metadata + summary + edges only — NOT full raw content (PROP-002 Q1).</rule>
    <rule>wiki/ is committed to git (PROP-002 Q2). Multi-dev conflicts resolve via lint --rebuild.</rule>
    <rule>Lint auto-refuses Gate 1/Gate 3 transitions on drift (PROP-002 Q3).</rule>
    <rule>Wiki indexes work items only — not protocol/templates (PROP-002 Q6).</rule>
    <rule>log.md entries are structured YAML — one {timestamp, actor, action, target, path} per event.</rule>
    <rule>Backlinks use [[WORK-ITEM-ID]] wiki-link syntax.</rule>
  </architecture_rules>
  <target_files>
    <file path="strategy/knowledge/cleargate-protocol.md" action="modify" />
    <file path="cleargate-cli/assets/subagents/cleargate-wiki-ingest.md" action="create" />
    <file path="cleargate-cli/assets/subagents/cleargate-wiki-query.md" action="create" />
    <file path="cleargate-cli/assets/subagents/cleargate-wiki-lint.md" action="create" />
    <file path="cleargate-cli/assets/synthesis/active-sprint.md" action="create" />
    <file path="cleargate-cli/assets/synthesis/open-gates.md" action="create" />
    <file path="cleargate-cli/src/commands/wiki-build.ts" action="create" />
    <file path="cleargate-cli/src/commands/wiki-ingest.ts" action="create" />
    <file path="cleargate-cli/src/commands/wiki-lint.ts" action="create" />
    <file path="cleargate-cli/src/init/write-hooks.ts" action="create" />
  </target_files>
</agent_context>
```

## 1. Problem & Value

**Why are we doing this?**
Without a compiled index, Claude Code starts every session blind — it must grep `delivery/` + `archive/` + `plans/` to know what exists. That's slow, error-prone, and causes duplicate Proposals. The wiki is the awareness layer that fixes this in ~3k tokens at session start.

**Success Metrics (North Star):**
- Starting a new session, Claude reads `wiki/index.md` first and correctly surfaces "an approved Proposal for X already exists, archived as LIN-987" without scanning directories.
- Any write to `delivery/*` triggers ingest; the affected wiki page + `index.md` update within seconds.
- `wiki-lint` correctly detects a CR that invalidated an Epic without reverting its status; blocks Gate 1.
- Multi-dev: Vibe Coder B pulls Vibe Coder A's commits and the wiki is consistent with raw state.

## 2. Scope Boundaries

**✅ IN-SCOPE**
- [ ] Protocol `§10 Knowledge Wiki Protocol` added to `cleargate-protocol.md`.
- [ ] Three subagent definitions shipped as assets in `cleargate-cli/` (copied into `.claude/agents/` by `cleargate init`).
- [ ] Two synthesis page templates (`active-sprint.md`, `open-gates.md`).
- [ ] `cleargate wiki build` — bootstrap full rebuild from raw.
- [ ] `cleargate wiki ingest <file>` — single-file update (called by hook + subagent).
- [ ] `cleargate wiki lint` — consistency check with exit code for gate-blocking.
- [ ] `cleargate init` writes a PostToolUse hook config into `.claude/settings.json`.
- [ ] Pagination support: split index at 50 items per bucket.

**❌ OUT-OF-SCOPE (deferred)**
- Indexing `knowledge/` and `templates/` (PROP-002 Q6 — work items only).
- Real-time push to clients (v1.1).
- Additional synthesis pages beyond the two defaults (user-generated).

## 3. The Reality Check (Context)

| Constraint | Rule |
|---|---|
| Source of truth | Raw files always win. Wiki is derived. |
| Idempotency | Re-ingesting produces byte-identical pages. |
| Determinism | Page content must depend only on raw state — no timestamps from ingest time inside body (only in `last_ingest` frontmatter). |
| Concurrency | `index.md` updates via atomic write-temp-then-rename to avoid corrupt reads. |
| Hook fragility | PostToolUse hook is deterministic on Claude Code platforms; protocol rule is the fallback. |
| Git policy | `wiki/` committed. `lint --rebuild` is the conflict resolver. |

## 4. Technical Grounding

**Wiki page shape** (per PROP-002 §2.4):
```markdown
---
type: epic
id: "EPIC-042-webhooks"
parent: "[[PROPOSAL-stripe-webhooks]]"
children: ["[[STORY-042-001]]", ...]
status: "🟢"
remote_id: "LIN-1042"
raw_path: ".cleargate/delivery/archive/EPIC-042-webhooks-LIN-1042.md"
last_ingest: "2026-04-17T15:32:00Z"
---

# EPIC-042: Webhooks

Summary ≤ 2 sentences.

## Blast radius
Affects: [[auth-service]], [[billing-service]]

## Open questions (from §6)
None.
```

**`log.md` entry shape:**
```yaml
- timestamp: "2026-04-17T15:32:00Z"
  actor: "cleargate-draft-proposal"
  action: "create"
  target: "PROPOSAL-stripe-webhooks"
  path: ".cleargate/delivery/pending-sync/PROPOSAL-stripe-webhooks.md"
```

**`.claude/settings.json` hook written by `cleargate init`:**
```json
{
  "hooks": {
    "PostToolUse": [{
      "matcher": "Write|Edit",
      "pathPattern": ".cleargate/(delivery|plans)/**",
      "command": "npx cleargate wiki-ingest \"$CLAUDE_TOOL_FILE_PATH\""
    }]
  }
}
```

## 5. Acceptance Criteria

```gherkin
Feature: Knowledge wiki layer

  Scenario: Ingest on new draft
    Given a new file .cleargate/delivery/pending-sync/EPIC-042.md
    When the PostToolUse hook fires
    Then wiki/epics/EPIC-042.md exists with metadata + summary + edges
    And wiki/index.md includes EPIC-042 under "Active"
    And wiki/log.md has a new YAML entry

  Scenario: Session start query
    Given wiki/index.md contains PROPOSAL-stripe-webhooks archived as LIN-987
    When Claude triages a new prompt mentioning Stripe webhooks
    Then the triage response surfaces the prior Proposal without scanning delivery/

  Scenario: Lint blocks on drift
    Given a Proposal in pending-sync/ that has approved: true
    But no wiki/proposals page exists for it
    When cleargate wiki lint runs
    Then exit code is non-zero
    And a diagnostic names the missing page
    And Gate 1 (push approval) is refused

  Scenario: CR invalidation captured
    Given a CR-007 that invalidates EPIC-035
    When cleargate wiki lint runs
    Then wiki/crs/CR-007.md has invalidates: ["[[EPIC-035]]"]
    And EPIC-035's wiki status reflects the reversion

  Scenario: Pagination triggers at 50
    Given 51 archived items
    When cleargate wiki build runs
    Then wiki/index-archive.md contains the archived entries
    And wiki/index.md links to index-archive.md under "Archived"

  Scenario: Multi-dev merge conflict
    Given two devs edited wiki/index.md with different line orderings
    When `cleargate wiki lint --rebuild` runs after merge
    Then index.md is deterministically regenerated from raw state
```

## 6. AI Interrogation Loop — RESOLVED

All 7 questions resolved 2026-04-17 by Vibe Coder (accept all recommendations).

1. **Subagent definition location** — **Resolved:** project-local (`.claude/agents/`). Subagents are project-specific — each repo's wiki rules live with the repo. Ship as assets in `cleargate-cli/assets/subagents/` and copy on `cleargate init`.
2. **PostToolUse hook syntax** — **Resolved:** WebFetch the current Claude Code `.claude/settings.json` hooks spec at init-implementation time. Do not hard-code from training.
3. **Init on existing repo** — **Resolved:** `cleargate init` auto-runs `cleargate wiki build` when it detects existing `.cleargate/delivery/*.md` files. Seamless onboarding.
4. **`wiki-ingest` trust model** — **Resolved:** no gate. Subagent writes freely into `wiki/`; lint catches mistakes.
5. **Lint in CI** — **Resolved:** not in v1. Locally triggered + gate-triggered is sufficient. Pre-commit adds friction.
6. **Synthesis page cadence** — **Resolved:** refresh on every ingest. Cheap to regenerate; freshness is the value.
7. **Cross-Epic dep** — **Resolved:** shared prerequisite **EPIC-000: CLI package scaffold**.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)

**Current Status: 🟢 Low Ambiguity — READY for Story decomposition**

Gate requirements (all met 2026-04-17):
- [x] PROPOSAL-002 has `approved: true`
- [x] `<agent_context>` block complete
- [x] §4 file paths verified (cleargate-cli package tracked as EPIC-000 prereq)
- [x] §6 AI Interrogation Loop resolved
- [x] No blocking TBDs
- [x] Shared EPIC-000 dependency declared
