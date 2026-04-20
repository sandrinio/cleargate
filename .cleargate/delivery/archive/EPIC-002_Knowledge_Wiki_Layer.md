---
epic_id: EPIC-002
status: Completed
ambiguity: 🟢 Low
context_source: PROPOSAL-002_Knowledge_Wiki.md
owner: Vibe Coder (ssuladze@exadel.com)
target_date: TBD
created_at: 2026-04-17T00:00:00Z
updated_at: 2026-04-18T00:00:00Z
completed_at: 2026-04-19T05:30:00Z
completed_in_sprint: SPRINT-04
created_at_version: strategy-phase-pre-init
updated_at_version: strategy-phase-pre-init
resolved_at: 2026-04-17T00:00:00Z
resolved_by: Vibe Coder (ssuladze@exadel.com)
approved: true
pushed_by: sandrinio@github.local
pushed_at: 2026-04-20T19:44:05.274Z
push_version: 3
---

# EPIC-002: Knowledge Wiki Layer

## 0. AI Coding Agent Handoff

```xml
<agent_context>
  <objective>Ship the Karpathy-style compiled awareness layer at .cleargate/wiki/. Three subagents (ingest/query/lint) maintain index.md + log.md + per-item pages + synthesis pages (product-state, roadmap, active-sprint, open-gates) + filed-back topic pages. PostToolUse hook + protocol rule trigger ingest; lint blocks Gate 1 and Gate 3 on drift.</objective>
  <architecture_rules>
    <rule>Wiki is derived; raw files (.cleargate/delivery, .cleargate/plans) are source of truth. On conflict, lint rebuilds from raw.</rule>
    <rule>Raw → wiki is a compile step (Karpathy framing). Rebuild is always safe and idempotent.</rule>
    <rule>Wiki pages hold metadata + summary + edges only — NOT full raw content (PROP-002 Q1). Exception: wiki/topics/ pages hold synthesis prose filed back from query results.</rule>
    <rule>wiki/ is committed to git (PROP-002 Q2). Multi-dev conflicts resolve via lint --rebuild.</rule>
    <rule>Lint auto-refuses Gate 1/Gate 3 transitions on drift (PROP-002 Q3).</rule>
    <rule>Wiki indexes work items (epics/stories/bugs/proposals/CRs) + sprints + synthesizes product-state/roadmap/active-sprint/open-gates. Excludes static protocol/templates (PROP-002 Q6, amended 2026-04-18).</rule>
    <rule>Query subagent has a --persist mode: good synthesis answers are filed back as wiki/topics/&lt;slug&gt;.md with edges to cited items. This is the compounding mechanism.</rule>
    <rule>log.md entries are structured YAML — one {timestamp, actor, action, target, path} per event.</rule>
    <rule>Backlinks use [[WORK-ITEM-ID]] wiki-link syntax.</rule>
  </architecture_rules>
  <target_files>
    <file path=".cleargate/knowledge/cleargate-protocol.md" action="modify" />
    <file path="cleargate-cli/assets/subagents/cleargate-wiki-ingest.md" action="create" />
    <file path="cleargate-cli/assets/subagents/cleargate-wiki-query.md" action="create" />
    <file path="cleargate-cli/assets/subagents/cleargate-wiki-lint.md" action="create" />
    <file path="cleargate-cli/assets/synthesis/active-sprint.md" action="create" />
    <file path="cleargate-cli/assets/synthesis/open-gates.md" action="create" />
    <file path="cleargate-cli/assets/synthesis/product-state.md" action="create" />
    <file path="cleargate-cli/assets/synthesis/roadmap.md" action="create" />
    <file path="cleargate-cli/src/commands/wiki-build.ts" action="create" />
    <file path="cleargate-cli/src/commands/wiki-ingest.ts" action="create" />
    <file path="cleargate-cli/src/commands/wiki-query.ts" action="create" />
    <file path="cleargate-cli/src/commands/wiki-lint.ts" action="create" />
    <file path="cleargate-cli/src/wiki/compile-sprint.ts" action="create" />
    <file path="cleargate-cli/src/wiki/compile-product-state.ts" action="create" />
    <file path="cleargate-cli/src/wiki/compile-roadmap.ts" action="create" />
    <file path="cleargate-cli/src/init/write-hooks.ts" action="create" />
  </target_files>
</agent_context>
```

## 1. Problem & Value

**Why are we doing this?**
Without a compiled index, Claude Code starts every session blind — it must grep `delivery/` + `archive/` + `plans/` to know what exists, what's shipped, and what's next. That's slow, error-prone, and causes duplicate Proposals and misread roadmap state. The wiki is the awareness layer that fixes this in ~3k tokens at session start. It covers four planes: **work items** (epics/stories/bugs/proposals/CRs), **sprints**, **product state** (shipped vs. in-flight vs. planned), and **roadmap** (upcoming sprints and their composition).

**Success Metrics (North Star):**
- Starting a new session, Claude reads `wiki/index.md` first and correctly surfaces "an approved Proposal for X already exists, archived as LIN-987" without scanning directories.
- A new session can answer "what has ClearGate shipped?" and "what's in the next sprint?" from `wiki/product-state.md` + `wiki/roadmap.md` without reading any raw file.
- Any write to `delivery/*` or sprint/epic/story file triggers ingest; the affected wiki page + `index.md` + affected synthesis pages update within seconds.
- `wiki-lint` correctly detects a CR that invalidated an Epic without reverting its status; blocks Gate 1.
- `wiki-query --persist` on a topic (e.g., "invite storage model") produces `wiki/topics/invite-storage.md` with edges to all cited items; the next session answering the same question reads the topic page directly without re-synthesis.
- Multi-dev: Vibe Coder B pulls Vibe Coder A's commits and the wiki is consistent with raw state.

## 2. Scope Boundaries

**✅ IN-SCOPE**
- [ ] Protocol `§10 Knowledge Wiki Protocol` added to `cleargate-protocol.md`.
- [ ] Three subagent definitions shipped as assets in `cleargate-cli/` (copied into `.claude/agents/` by `cleargate init`).
- [ ] Per-item page generation for all work-item types: `wiki/epics/`, `wiki/stories/`, `wiki/bugs/`, `wiki/proposals/`, `wiki/crs/`.
- [ ] Per-sprint pages: `wiki/sprints/SPRINT-NN.md` — DoD checklist status, story list with completion state, sprint progress %.
- [ ] Four synthesis pages (all auto-maintained):
  - [ ] `wiki/active-sprint.md` — current sprint status + open gates + next story to start.
  - [ ] `wiki/open-gates.md` — items blocking on human action (unapproved proposals, unresolved interrogation Qs).
  - [ ] `wiki/product-state.md` — shipped ✓ / in-flight 🟡 / planned ⬜ matrix derived from `INDEX.md` + `archive/`.
  - [ ] `wiki/roadmap.md` — epic → sprint → story flow for upcoming sprints (not-yet-active).
- [ ] `wiki/topics/` directory — filed-back synthesis pages from `wiki query --persist` (Karpathy compounding loop).
- [ ] `cleargate wiki build` — bootstrap full rebuild from raw.
- [ ] `cleargate wiki ingest <file>` — single-file update (called by hook + subagent). Triggers recompile of affected synthesis pages.
- [ ] `cleargate wiki query <question> [--persist]` — reads wiki, synthesizes an answer; with `--persist`, files the answer back as `wiki/topics/<slug>.md`.
- [ ] `cleargate wiki lint` — consistency check with exit code for gate-blocking.
- [ ] `cleargate wiki lint --suggest` — advisory (non-blocking) pass that surfaces candidate backlinks ingest missed (Karpathy discovery pass).
- [ ] `cleargate init` writes a PostToolUse hook config into `.claude/settings.json`.
- [ ] Pagination support: split index at 50 items per bucket.

**❌ OUT-OF-SCOPE (deferred)**
- Indexing static protocol docs (`knowledge/`) and `templates/` (PROP-002 Q6 amended — these stay outside the wiki; they're loaded via CLAUDE.md).
- Real-time push to clients (v1.1).
- User-added custom synthesis pages beyond the four defaults (v1.1 — would need user-authored compile recipes).
- Auto-generated topic pages on every query (v1.1 — v1 requires explicit `--persist` to avoid topic spam).

## 3. The Reality Check (Context)

| Constraint | Rule |
|---|---|
| Source of truth | Raw files always win. Wiki is derived. |
| Compile framing | Raw → wiki is a compile step (Karpathy). `wiki build` is the compiler; it is always safe to re-run. |
| Idempotency | Re-ingesting produces byte-identical pages. |
| Determinism | Page content must depend only on raw state — no timestamps from ingest time inside body (only in `last_ingest` frontmatter). |
| Synthesis recompile | Writing any raw file recompiles the affected per-item page + every synthesis page (product-state/roadmap/active-sprint/open-gates) it influences. Cheap; freshness is the value (PROP-002 Q7). |
| Topic pages are append-only-by-query | `wiki/topics/*.md` are written only by `wiki query --persist`, not by ingest. They survive rebuilds (they are not derived from raw items, only *reference* them). Lint flags a topic page whose cited items have been archived or invalidated. |
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

**Sprint page shape** (`wiki/sprints/SPRINT-03.md`):
```markdown
---
type: sprint
id: "SPRINT-03"
status: "🟡 in-flight"
start_date: "2026-04-18"
end_date: null
stories_total: 11
stories_done: 5
progress_pct: 45
raw_path: ".cleargate/delivery/archive/SPRINT-03_CLI_Packages.md"
last_ingest: "2026-04-18T12:00:00Z"
---

# SPRINT-03: CLI Packages

Goal (≤2 sentences compiled from the raw sprint file).

## Stories
- [x] [[STORY-000-01]] — Package scaffold
- [x] [[STORY-000-02]] — Commander entry
- [ ] [[STORY-005-01]] — Admin CLI create-project
- ...

## DoD status
- [x] All 11 stories merged on `main`
- [ ] Matrix-smoke (npx / -D / -g) passes
- ...

## Open gates
[[STORY-004-07]] blocks [[STORY-003-13]] blocks [[STORY-005-05]] — strict M4 order.
```

**Product-state synthesis page** (`wiki/product-state.md`):
```markdown
---
type: synthesis
kind: product-state
last_compile: "2026-04-18T12:00:00Z"
---

# Product State

## Shipped ✓
- [[EPIC-003]] MCP Server Core — SPRINT-01 · deployed to `cleargate-mcp.soula.ge`
- [[EPIC-004]] Admin API — SPRINT-02

## In flight 🟡
- [[EPIC-000]] CLI Package Scaffold — 4/4 stories done, part of [[SPRINT-03]]
- [[EPIC-005]] Admin CLI — 0/5 stories done

## Planned ⬜
- [[EPIC-001]] Document Metadata Lifecycle — no sprint assigned
- [[EPIC-002]] Knowledge Wiki Layer — no sprint assigned
- [[EPIC-006]] Admin UI — next sprint candidate
```

**Roadmap synthesis page** (`wiki/roadmap.md`):
```markdown
---
type: synthesis
kind: roadmap
last_compile: "2026-04-18T12:00:00Z"
---

# Roadmap

## Next up
### [[SPRINT-04]] (planned) — Admin UI
- [[EPIC-006]] — 10 stories, first candidate

## Backlog (no sprint yet)
- [[EPIC-001]] Document Metadata Lifecycle
- [[EPIC-002]] Knowledge Wiki Layer
```

**Topic page shape** (`wiki/topics/invite-storage.md`, filed by `wiki query --persist`):
```markdown
---
type: topic
id: "invite-storage"
created_by: "cleargate-wiki-query"
created_at: "2026-04-18T12:00:00Z"
cites: ["[[STORY-004-03]]", "[[STORY-004-07]]", "[[STORY-003-13]]"]
---

# Invite storage

Invite storage is a **Postgres source of truth** (`invites` table), not Redis. Decision locked 2026-04-18; see [[STORY-004-07]] for the retrofit migrating from SPRINT-02's Redis-only shape.
Redemption goes through [[STORY-003-13]]'s atomic `UPDATE … RETURNING` against the `invites` table.

Related items: [[STORY-004-03]] (original Redis impl, superseded), [[STORY-005-05]] (`cleargate join` — consumes the redemption endpoint).
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

  Scenario: Sprint page reflects story completion
    Given SPRINT-03 has 11 stories and 5 are marked Done in raw state
    When `cleargate wiki build` runs
    Then wiki/sprints/SPRINT-03.md has stories_done: 5 and progress_pct: 45
    And each story line in its checklist reflects its Done/Not-Done state

  Scenario: Product-state synthesis reflects shipped vs. in-flight
    Given EPIC-003 is marked Shipped in INDEX.md and SPRINT-01 archived
    And EPIC-005 has 0 done stories in active SPRINT-03
    When `cleargate wiki build` runs
    Then wiki/product-state.md lists EPIC-003 under "Shipped"
    And lists EPIC-005 under "In flight"

  Scenario: Query result filed back into topics
    Given a human asks Claude "how is invite storage modeled"
    And Claude synthesizes an answer from STORY-004-03, STORY-004-07, STORY-003-13
    When `cleargate wiki query "invite storage" --persist` runs
    Then wiki/topics/invite-storage.md is created
    And its frontmatter cites ["[[STORY-004-03]]","[[STORY-004-07]]","[[STORY-003-13]]"]
    And wiki/index.md lists the new topic under "Topics"

  Scenario: Lint suggest surfaces missing cross-ref
    Given EPIC-002 body mentions EPIC-000 but the wiki page has no edge to [[EPIC-000]]
    When `cleargate wiki lint --suggest` runs
    Then exit code is 0 (advisory only)
    And stdout includes "wiki/epics/EPIC-002.md: missing edge to [[EPIC-000]]"

  Scenario: Topic page flagged when cited item is invalidated
    Given wiki/topics/invite-storage.md cites [[STORY-004-03]]
    And STORY-004-03 is marked invalidated by CR-012 in raw state
    When `cleargate wiki lint` runs
    Then exit code is non-zero
    And a diagnostic names the topic page and the invalidated citation
```

## 6. AI Interrogation Loop — RESOLVED

Q1–Q7 resolved 2026-04-17 by Vibe Coder. Q8–Q10 added 2026-04-18 during scope expansion (per user direction: wiki covers work items + sprints + product state + roadmap, per Karpathy's full pattern).

1. **Subagent definition location** — **Resolved:** project-local (`.claude/agents/`). Subagents are project-specific — each repo's wiki rules live with the repo. Ship as assets in `cleargate-cli/assets/subagents/` and copy on `cleargate init`.
2. **PostToolUse hook syntax** — **Resolved:** WebFetch the current Claude Code `.claude/settings.json` hooks spec at init-implementation time. Do not hard-code from training.
3. **Init on existing repo** — **Resolved:** `cleargate init` auto-runs `cleargate wiki build` when it detects existing `.cleargate/delivery/*.md` files. Seamless onboarding.
4. **`wiki-ingest` trust model** — **Resolved:** no gate. Subagent writes freely into `wiki/`; lint catches mistakes.
5. **Lint in CI** — **Resolved:** not in v1. Locally triggered + gate-triggered is sufficient. Pre-commit adds friction.
6. **Synthesis page cadence** — **Resolved:** refresh on every ingest. Cheap to regenerate; freshness is the value.
7. **Cross-Epic dep** — **Resolved:** shared prerequisite **EPIC-000: CLI package scaffold**.
8. **Wiki scope ceiling (amended Q6)** — **Resolved 2026-04-18:** Wiki covers four planes: work items, sprints, product state, roadmap. Still excludes static protocol (`knowledge/`) and `templates/` — those are loaded via CLAUDE.md and don't change often enough to justify compile overhead. Reason: aligns with Karpathy's full pattern (the wiki IS the knowledge base, not just a TOC of one type of artifact).
9. **Query file-back loop (the Karpathy compounding property)** — **Resolved 2026-04-18:** Ship `wiki/topics/` + `wiki query --persist` in v1, but require explicit `--persist` flag. Implicit auto-persist on every query is v1.1. Reason: v1 avoids noise from low-value queries; we learn what to persist by observing which topics get re-queried.
10. **Lint discovery vs. enforcement** — **Resolved 2026-04-18:** Ship both. `wiki lint` is enforcement (exit non-zero, blocks gates on drift). `wiki lint --suggest` is advisory (exit 0, surfaces candidate cross-refs ingest missed). Reason: Karpathy's lint *discovers* new connections; ours should too, but the discovery must not block transitions — only inform the next ingest pass.

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
