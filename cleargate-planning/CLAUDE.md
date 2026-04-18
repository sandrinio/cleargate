# ClearGate — Injected CLAUDE.md Block

This file is the content `cleargate init` injects into a downstream user's `CLAUDE.md` between bounded markers. If the user has no existing `CLAUDE.md`, init writes this as a standalone file wrapped with the markers. If one already exists, init appends the bounded block below without touching the user's existing content. Re-running `cleargate init` updates the block in place.

---

<!-- CLEARGATE:START -->
## 🔄 ClearGate Planning Framework

This repository uses **ClearGate** — a standalone planning framework for AI coding agents. ClearGate scaffolds *how work is planned* (proposals → epics → stories → sprints) and defines the four-agent loop that turns plans into shipped code. ClearGate does not run builds, tests, or deployments; execution tooling remains the target repo's own.

**Before any non-trivial task, read these in order:**
1. `.cleargate/knowledge/cleargate-protocol.md` — the non-negotiable delivery protocol (triage → draft → halt → sync → archive). All classification rules, phase gates, and scope discipline live here.
2. `.cleargate/FLASHCARD.md` — prior lessons tagged by topic (`#schema`, `#auth`, `#test-harness`, etc.). Grep for your area before starting; append one-liners after any surprise.

**When drafting work items:**
- Use the templates in `.cleargate/templates/` (`proposal.md`, `epic.md`, `story.md`, `CR.md`, `Bug.md`, `Sprint Plan Template.md`, `initiative.md`).
- Save drafts to `.cleargate/delivery/pending-sync/` using the pattern `{TYPE}-{ID}-{Name}.md`.
- After `cleargate_push_item` returns a Remote ID, move the file to `.cleargate/delivery/archive/`.

**When executing a sprint (four-agent loop, roles in `.claude/agents/`):**
- `architect.md` — produces one plan per milestone; no production code.
- `developer.md` — one Story end-to-end; one commit per Story; runs typecheck + tests before commit.
- `qa.md` — independent verification gate; re-runs checks; never commits, never edits.
- `reporter.md` — one sprint retrospective at sprint end; synthesizes token ledger + git log + flashcards into `REPORT.md`.

**Support infrastructure:**
- Flashcard protocol: `.claude/skills/flashcard/SKILL.md`
- Token-ledger hook: `.claude/hooks/token-ledger.sh`, wired via `.claude/settings.json` (SubagentStop); auto-logs agent cost per sprint for the Reporter.

**Scope reminder:** ClearGate is a *planning* framework. It scaffolds how work gets planned and how the four-agent loop runs. It does not replace your project's build system, CI, test runner, or deployment tooling.
<!-- CLEARGATE:END -->
