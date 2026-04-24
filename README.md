# ClearGate — Planning scaffold your AI coding agents follow.

**Node ≥ 24 LTS required.**

ClearGate gives AI coding agents (Claude Code and similar) a structured planning protocol so they ship coherent software instead of drifting between disconnected tasks. It installs a four-agent loop (Architect plans, Developer codes, QA verifies, Reporter retrospects), a template-driven work-item protocol (proposals → epics → stories → sprints), and a compiled awareness wiki that gives every agent session immediate situational context without re-grepping raw files.

ClearGate is not a build tool, test runner, or CI system. The Developer agent calls *your project's* toolchain — `cleargate gate test`, `cleargate gate typecheck`, etc. — via commands you configure in `.cleargate/config.yml`. Your toolchain stays yours; ClearGate orchestrates when and why agents invoke it.

---

## Why it exists

AI coding agents are good at tactical execution but poor at self-coordinating across sessions. Without structure, a vibe-coder and their agent loop end up with orphaned changes, duplicate work items drafted from memory, and no reliable retrospective. ClearGate enforces a protocol: every change starts as a classified work item, every sprint runs through a gated four-agent loop, and every session starts with a compiled wiki that surfaces what already shipped — so the agent never re-discovers what the last session forgot.

---

## Install

Requires Node ≥ 24 LTS.

1. Add ClearGate to your project:

   ```bash
   npm i -D cleargate
   ```

2. Bootstrap the scaffold in your repo:

   ```bash
   npx cleargate init
   ```

   This writes a bounded `<!-- CLEARGATE:START -->...<!-- CLEARGATE:END -->` block into your `CLAUDE.md` (creating the file if it does not exist), installs agent role definitions under `.claude/agents/`, wires the token-ledger hook in `.claude/settings.json`, and creates `.cleargate/` with protocol rules, work-item templates, draft/archive folders, and a flashcard lesson log. Re-running `init` is idempotent — it updates the bounded block in place and preserves your customizations.

3. Verify the scaffold is healthy:

   ```bash
   npx cleargate doctor
   ```

   `doctor` checks for scaffold drift, missing hooks, blocked items, and configuration validity. Fix any issues it reports before starting your first sprint.

---

## Getting started in 10 minutes

After `cleargate init` completes, ask Claude Code to begin. The session will read the ClearGate block in `CLAUDE.md` automatically. Walk through these steps:

1. **File a proposal.** Ask Claude Code: *"I want to add [feature]. File a ClearGate proposal."* Claude will classify the request, draft a Proposal file in `.cleargate/delivery/pending-sync/`, and halt at Gate 1 for your review.

2. **Approve it.** Read the draft. Set `approved: true` in the frontmatter and tell Claude Code to proceed. Gate 1 closes.

3. **Decompose into an Epic and Stories.** Claude Code will decompose the Proposal into an Epic (scope + goals) and then into Stories (individual implementable units). Each Story gets a Gherkin acceptance scenario and an ambiguity gate. If anything is unclear, the agent halts and asks — it cannot skip levels.

4. **Schedule a Sprint.** Group the Stories into a Sprint file. This tells the four-agent loop what to execute.

5. **Invoke the Architect subagent.** Ask Claude Code to spawn the Architect agent for Milestone 1. The Architect reads the Sprint file, produces a milestone plan, and assigns files to each Story. No production code is written at this step.

6. **Run the Developer, QA, and Reporter agents** for each Story in sequence. Each Developer agent commits exactly one Story; QA re-verifies independently; Reporter writes the retrospective at sprint end.

For gates configuration (what command `cleargate gate test` runs in your project), create `.cleargate/config.yml` at your repo root. `cleargate init` installs a documented example template at `.cleargate/config.example.yml` alongside — copy it and edit, or start from the skeleton below:

```yaml
# .cleargate/config.yml — adjust commands to your stack
gates:
  precommit: "npm run typecheck && npm test"   # Node example
  test: "npm test"
  typecheck: "npm run typecheck"
  lint: "npm run lint"
```

If a gate key is absent, `cleargate gate <name>` prints a friendly "not configured" message and exits 0 (non-blocking). Pass `--strict` to flip that to exit 1.

---

## Want to know more?

- Architecture, repo layout, and how ClearGate is built with itself: [docs/INTERNALS.md](./docs/INTERNALS.md)
- License: [LICENSE](./LICENSE) (MIT)
