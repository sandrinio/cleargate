---
story_id: STORY-009-08
parent_epic_ref: EPIC-009
status: "Abandoned"
ambiguity: 🟢 Low
complexity_label: L1
context_source: PROPOSAL-006_Scaffold_Manifest_And_Uninstall.md
created_at: 2026-04-19T00:00:00Z
updated_at: 2026-04-19T00:00:00Z
created_at_version: post-SPRINT-04
updated_at_version: post-SPRINT-04
approved: true
pushed_by: sandrinio@github.local
pushed_at: 2026-04-20T19:42:52.868Z
push_version: 3
---

# STORY-009-08: Protocol §13 "Scaffold Manifest & Uninstall"

**Complexity:** L1 — pure doc.

## 1. The Spec

### 1.1 User Story
As a Vibe Coder reading the protocol, I want §13 to document the scaffold lifecycle (install → drift → upgrade → uninstall → restore) so that I understand the mental model and when to run each command.

### 1.2 Detailed Requirements

Add **§13 "Scaffold Manifest & Uninstall"** to `.cleargate/knowledge/cleargate-protocol.md` with the following subsections:

- **13.1 Overview** — the three-surface model (package manifest / install snapshot / current state); SHA256 as the identifier; drift states.
- **13.2 Install** — what `cleargate init` writes; `.install-manifest.json` shape; restore-from-`.uninstalled` flow.
- **13.3 Drift detection** — `cleargate doctor --check-scaffold`; daily-throttled SessionStart refresh; agent advisory at triage (never auto-overwrite).
- **13.4 Upgrade** — three-way merge UX; incremental execution; `--dry-run` and `--yes` behavior.
- **13.5 Uninstall** — preservation categories and defaults; safety rails (typed confirmation, `--dry-run`, single-target, refuse-on-uncommitted); `.uninstalled` marker; restore path.
- **13.6 Publishing notes** — `MANIFEST.json` is built at `npm run build`, shipped in package; CHANGELOG auto-opens with a scaffold-diff block per release.

Keep the tone terse and protocol-like — this is a reference, not a tutorial. Concrete shapes (JSON / YAML) can use fenced blocks.

### 1.3 Out of Scope
Rewriting §§1-12. §4 "Phase Gates" already references lifecycle concepts; add a cross-reference to §13 but don't rewrite §4.

## 2. The Truth

### 2.1 Acceptance Criteria

```gherkin
Feature: Protocol §13

  Scenario: Section present with all subsections
    When I grep cleargate-protocol.md for "## 13."
    Then §13 is present
    And each subsection 13.1–13.6 exists

  Scenario: Cross-reference from §4
    When I read §4 "Phase Gates"
    Then there is a one-line pointer "(See §13 for scaffold lifecycle commands)"

  Scenario: No TBDs
    When I grep §13 for "TBD"
    Then zero matches

  Scenario: Concrete shapes included
    When I read §13.2
    Then the `.install-manifest.json` shape is shown in a fenced JSON block
    And §13.5 shows the `.uninstalled` marker shape
```

### 2.2 Verification Steps
- [ ] Section numbering collision check: §11 is EPIC-001's, §12 is EPIC-008's, §13 is ours. If either EPIC-001 or EPIC-008 slips, revise section number before merge.

## 3. Implementation

| Item | Value |
|---|---|
| Primary File | `.cleargate/knowledge/cleargate-protocol.md` |

## 4. Quality Gates

| Test Type | Min | Notes |
|---|---|---|
| Doc review | — | Vibe Coder reviews before merge |
| Lint check | 1 | Protocol lint run, no new warnings |

## Ambiguity Gate
🟢 — EPIC-009 §6 Q1 resolved 2026-04-19: protocol §13 confirmed.
