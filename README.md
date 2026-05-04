![ClearGate — Architecting the Future of AI-Driven Team Orchestration](./assets/github-banner.svg)

# ClearGate

**Bridging the gap between vibe coding and disciplined engineering.**

ClearGate is an open-source planning scaffold that turns AI coding agents into a disciplined engineering team. It installs a five-role agent team (Architect, Developer, QA, DevOps, Reporter), a template-driven work-item protocol (proposals → epics → stories → sprints), and a compiled awareness wiki — so your AI agents stop drifting between disconnected tasks and start shipping coherent software.

> ClearGate is not an AI code generator. **It is an AI Engineering Manager.**

---

## Quick install

```bash
npx cleargate init
npx cleargate doctor
```

Requires Node ≥ 24 LTS. `init` writes a bounded ClearGate block into `CLAUDE.md`, installs the five-role agent definitions, and scaffolds `.cleargate/`. To pin the version per-project, add it as a dev dependency: `npm i -D cleargate`. Full walkthrough in [Install](#install) and [Getting started in 10 minutes](#getting-started-in-10-minutes) below.

---

## Give it to your agent

Already running an AI coding agent? Paste this prompt into Claude Code (or Cursor / Aider / any agent with shell + file-read access on this repo) and let it install and verify ClearGate for you:

```text
Install ClearGate (npm package: cleargate) in this project.

1. Run `npx cleargate init` from the repo root. Report what files it
   created or modified.
2. Run `npx cleargate doctor`. Surface any warnings or errors verbatim.
3. Read the bounded `<!-- CLEARGATE:START -->...<!-- CLEARGATE:END -->`
   block now in CLAUDE.md. In 3 lines, summarize how this changes how
   we'll plan and execute work from now on.
4. List `.claude/agents/` and `.cleargate/templates/` — one line per
   item — so I can see what's available.

Do not write any production code yet. This is install + verification
only. If any step errors, stop and report the exact error.
```

If `init` lands cleanly, your next message can be: *"File a ClearGate proposal for [your feature]."* The agent will classify the request, draft a work item under `.cleargate/delivery/pending-sync/`, and halt at Gate 1 for your approval — no rogue code generation.

---

## The problem

Standard AI coding tools live entirely inside the developer's terminal. The business is locked out, sessions start blind, and agents re-grep raw files, hallucinate duplicate work, and overwrite cross-cutting decisions without warning.

|            | Standard AI                              | ClearGate                                                       |
| ---------- | ---------------------------------------- | --------------------------------------------------------------- |
| Context    | Session blindness, blind grep            | Compiled wiki (~3k-token `index.md` read at session start)      |
| Planning   | Flat task lists                          | Phase plans + shared-surface merge ordering                     |
| Execution  | Single terminal thread                   | Concurrent git worktrees + five-role agent team                 |
| Visibility | Dev-only (zero stakeholder visibility)   | MCP push to PM tool of record                                   |
| Memory     | Forgets between sessions                 | Append-only `FLASHCARD.md` lessons + sprint reports             |

---

## How it works

![The ClearGate Lifecycle — five-role pipeline with Ambiguity Gate, parallel worktrees, and MCP push to PM tool of record](./assets/lifecycle-diagram.svg)

> Stakeholder input enters through Triage. The Architect drafts a phase plan, which **halts at the Ambiguity Gate** until human sign-off. Once approved, parallel Developer/QA pairs execute in isolated git worktrees. DevOps handles mechanical merge and state transitions. The Reporter synthesizes the sprint, lessons compound into the Wiki, and the MCP adapter pushes everything natively into your PM tool.

> _Diagram refresh in flight — see SPRINT-25 lifecycle-diagram-prompt.md_

---

## What ClearGate does

### 1. Compiled awareness — the Karpathy-style wiki

Raw work-item state (epics, stories, sprints, bugs, CRs, proposals, flashcard lessons) is continuously compiled into a lightweight `.cleargate/wiki/index.md`. The orchestrator reads this ~3,000-token summary at the **start of every session** — instant grasp of project topology, active sprint goals, and architectural constraints, *before a single file is grepped*.

### 2. Triage → Planning → Execution → Quality & Delivery

Every change starts as a classified work item. Drafted Epics and Phase Plans **halt at the Ambiguity Gate** until an Orchestrator + PO + Sponsor sign-off unlocks them. The AI cannot skip levels or "go rogue" past Draft. The result: absolute business control over AI compute and repository changes.

### 3. The Five-Role Agent Loop

Sub-agents never converse. They communicate via structured, file-based artifacts routed by the orchestrator. Five roles execute in a strict 7-step per-story sequence:

**The 7-step per-story loop:**
1. **Architect (M1 mode)** — reads the Sprint file and writes a milestone plan with file-surface analysis, merge ordering, and per-story blueprints.
2. **QA (Red mode)** — before any implementation, writes failing `*.red.node.test.ts` tests covering each story's acceptance Gherkin. Tests must be RED against the clean baseline.
3. **Architect (TPV mode — Test Pattern Validation)** — validates that QA-Red tests are wiring-sound (imports resolve, constructors match, mocked methods exist). Blocks wiring-gap tests from reaching the Developer.
4. **Developer** — implements exactly one story in an isolated git worktree, runs typecheck + tests, commits one commit.
5. **QA (Verify mode)** — read-only acceptance trace: re-runs gates, maps each Gherkin scenario to a passing test, checks the DoD clause.
6. **Architect (post-flight mode)** — brief architectural review after QA-Verify pass; confirms no cross-story regressions or ADR conflicts were introduced.
7. **DevOps** — mechanical merge (no-ff), mirror parity audit, worktree teardown, state transition to `Done`.

**Reporter** — once at sprint close, after all stories have merged, synthesizes the token ledger, flashcards, git log, and DoD into `SPRINT-<#>_REPORT.md`.

**The five roles in detail:**

- **Architect** — four dispatch modes: Sprint Design Review (SDR, pre-sprint structure), M1 milestone plan (file-surface analysis + merge ordering), TPV (Test Pattern Validation between QA-Red and Developer), and post-flight architectural review. Writes plans, never code.
- **Developer** — one per story, inside an isolated git worktree. Implements code + tests, runs typecheck, commits exactly one story. Follows the Architect's blueprint; returns `STATUS=done` or `BLOCKED`.
- **QA** — two dispatch modes: Red (writes failing tests before any implementation — tests are immutable once written) and Verify (read-only acceptance trace after Developer commits). Never edits code; only approves or kicks back.
- **DevOps** — post-QA mechanical pipeline: no-ff merge to sprint branch, prebuild if canonical scaffold was touched, mirror parity diff (live ↔ canonical), worktree remove, branch delete, state transition to `Done` via `update_state.mjs`.
- **Reporter** — once per sprint at close. Synthesizes token ledger, flashcards, git log, DoD checklist, and story outcomes into a structured retrospective. Feeds the self-improving engine.

### 4. Shared-surface merge ordering

Before any code is written, the Architect lists the files each story will touch and computes the collision graph. Colliding stories enter a strict sequential queue; non-overlapping stories run concurrently in isolated git worktrees. No merge-conflict thrash, no file-lock contention, clean per-story commits.

### 5. Quality assurance & hotfix tracking

Final human sign-off is required before a sprint can close. Bugs found post-QA are **never** silently patched — they are filed as hotfixes with originating signal and files touched, giving full traceability. A strict lifecycle reconciler (`close_sprint.mjs`) blocks sprint close on any drift between shipped commits and ticket state. The cross-sprint orphan reconciler (Step 2.6b) detects and archives work items that drifted across sprint boundaries without resolution.

### 6. Total visibility for the business — the MCP adapter

ClearGate runs an MCP server that exposes `cleargate_push_item`, `cleargate_pull_initiative`, and friends. Approved epics, stories, and sprint reports are pushed natively into the customer's tool of record — no middleman DB, no proprietary dashboard. MCP server with adapter framework; native **Jira** and **GitHub Projects** adapters in development; **Linear** is shipped. See [docs/INTERNALS.md](./docs/INTERNALS.md) for adapter status. The Sponsor and PO audit AI-generated contracts, dependencies, and token ledgers in real time, in their own tool.

### 7. The self-improving engine

Every sprint feeds three input metrics into the next: first-pass success rate, Architect/QA bounce count, and the Bug-Fix Tax (% of sprint capacity spent on bugs). **Test Pattern Validation (TPV)** catches test wiring gaps before the Developer touches them — the TPV catch-rate across sprints is a leading indicator of spec quality. The **Hotfix Audit** asks *"could this hotfix have been a sprint story? why was it missed at planning?"* — and the lessons land in append-only `.cleargate/FLASHCARD.md`, tagged (`#schema`, `#auth`, `#worktree`, …) and read by every agent at the start of non-trivial work. The framework structurally forces the AI to learn from its mistakes — and from the human engineer's feedback.

---

## What's New (SPRINT-22 through SPRINT-24)

The SDLC Hardening arc (SPRINT-22 → SPRINT-23 → SPRINT-24) added eight major capabilities to the framework. Post-CR-053, `cleargate init` no longer writes a root `MANIFEST.json` to the user's repo.

**SPRINT-22 — TDD discipline + role refinement**
- **CR-042** Reporter prompt accuracy fix — fresh-session dispatch contract documented in `reporter.md`.
- **CR-043** TDD Red/Green discipline — `*.red.node.test.ts` files are immutable after QA-Red writes them; Developer cannot edit them.
- **CR-044** DevOps role agent — 5th agent added, owns mechanical merge + state transitions, decoupled from orchestrator.

**SPRINT-23 — Cross-cutting tooling**
- **CR-045** Sprint Context File — per-sprint `sprint-context.md` anchors every agent dispatch to the same baseline.
- **CR-046** `run_script.sh` structured incident wrapper — all script invocations go through the wrapper; failures produce incident JSON for Reporter §Risks.
- **CR-047** Mid-Sprint Triage Rubric + Test Pattern Validation gate — TPV added as Architect mode between QA-Red and Developer; triage rubric governs mid-sprint CR scope changes.
- **CR-048** Cross-sprint orphan reconciler hardening — Step 2.6b detects work items that drifted across sprints without resolution.

**SPRINT-24 — Carry-over cleanup**
- **CR-049** Canonical-vs-live parity CI guard — drift between `cleargate-planning/` and the npm payload now fails CI.
- **CR-050** `run_script.sh` shim retirement — 8 callers migrated to the structured wrapper.
- **CR-051** DevOps subagent registration findings + escape hatch — `devops` registration edge case documented; escape hatch in SKILL.md §C.7.
- **CR-052** `wrapScript` shared test helper — canonical caller-test pattern for `run_script.sh`-invoking tests.

See sprint files for the complete commit history.

---

## Install

Requires Node ≥ 24 LTS.

1. Bootstrap the scaffold in your repo:

   ```bash
   npx cleargate init
   ```

   `npx` fetches and runs the published package on demand — no prior install needed. The command writes a bounded `<!-- CLEARGATE:START -->...<!-- CLEARGATE:END -->` block into your `CLAUDE.md` (creating the file if it does not exist), installs agent role definitions under `.claude/agents/`, wires the token-ledger hook in `.claude/settings.json`, and creates `.cleargate/` with protocol rules, work-item templates, draft/archive folders, and a flashcard lesson log. Re-running `init` is idempotent — it updates the bounded block in place and preserves your customizations.

2. Verify the scaffold is healthy:

   ```bash
   npx cleargate doctor
   ```

   `doctor` checks for scaffold drift, missing hooks, blocked items, and configuration validity. Fix any issues it reports before starting your first sprint.

3. *(Optional)* Pin the version per-project so every contributor gets the same one:

   ```bash
   npm i -D cleargate
   ```

   Records `cleargate` under `devDependencies` in your `package.json`. Skip this step if you're happy letting `npx` always grab the latest published version.

---

## What `init` lays down

```text
your-repo/
├── CLAUDE.md                       ← bounded ClearGate block injected (idempotent)
├── .claude/                        ← Claude Code session config
│   ├── agents/                     ← the five-role agent team:
│   │                                  architect · developer · qa · devops · reporter
│   │                                  (+ cleargate-wiki-contradict · wiki-ingest ·
│   │                                     wiki-query · wiki-lint)
│   ├── skills/                     ← sprint-execution · flashcard
│   ├── hooks/                      ← session-start, token-ledger,
│   │                                  pre-commit & pre-edit gates
│   └── settings.json               ← hook wiring (PostToolUse, SubagentStop, …)
└── .cleargate/                     ← planning artifacts + protocol (checked into git)
    ├── FLASHCARD.md                ← append-only lesson log (every agent reads it)
    ├── config.example.yml          ← gate command template (copy to config.yml)
    ├── knowledge/                  ← protocol, enforcement rules, readiness gates,
    │                                  sprint-closeout checklist, mid-sprint-triage-rubric.md
    ├── scripts/                    ← run_script.sh structured incident wrapper +
    │                                  close_sprint.mjs · update_state.mjs · suggest_improvements.mjs
    ├── templates/                  ← blueprints: epic · story · CR · Bug ·
    │                                  initiative · Sprint Plan
    └── delivery/
        ├── pending-sync/           ← drafts + in-flight work items
        └── archive/                ← items pushed to PM tool of record / completed
```

**`.claude/`** is what Claude Code reads at session start — agent role definitions, skills, and hooks that fire on tool use. **`.cleargate/`** is where your planning artifacts live — work items as markdown files, edited by both humans and agents, versioned alongside your code. The compiled `.cleargate/wiki/` (the ~3k-token awareness layer) is generated on demand by `cleargate wiki build` and grows as your project does.

---

## Getting started in 10 minutes

After `cleargate init` completes, ask Claude Code to begin. The session will read the ClearGate block in `CLAUDE.md` automatically. Walk through these steps:

1. **File a proposal.** Ask Claude Code: *"I want to add [feature]. File a ClearGate proposal."* Claude will classify the request, draft a Proposal file in `.cleargate/delivery/pending-sync/`, and halt at **Gate 1** for your review.

2. **Approve it.** Read the draft. Set `approved: true` in the frontmatter and tell Claude Code to proceed. Gate 1 closes.

3. **Decompose into an Epic and Stories.** Claude Code will decompose the Proposal into an Epic (scope + goals) and then into Stories (individual implementable units). Each Story gets a Gherkin acceptance scenario and an ambiguity gate. If anything is unclear, the agent halts and asks — it cannot skip levels. When all open questions are resolved, **Gate 2** (Ambiguity) closes.

4. **Schedule a Sprint.** Group the Stories into a Sprint file. Run `cleargate sprint preflight` (**Gate 3**) to verify the sprint is ready for execution — no orphaned work items, no unresolved ambiguities, no drift in the scaffold.

5. **Invoke the Architect subagent.** Ask Claude Code to spawn the Architect agent for Milestone 1 (Sprint Design Review). The Architect reads the Sprint file, produces a milestone plan, and assigns files to each Story. No production code is written at this step.

6. **Run the five-role per-story loop** for each Story in sequence:
   - **Architect (M1)** writes the blueprint for the milestone.
   - **QA (Red)** writes failing tests before any code.
   - **Architect (TPV)** validates test wiring.
   - **Developer** implements the Story in an isolated git worktree and commits.
   - **QA (Verify)** accepts or kicks back.
   - **Architect (post-flight)** confirms no architectural drift.
   - **DevOps** merges, tears down the worktree, and flips the Story state to `Done`.

7. **Close the sprint.** After all Stories are `Done`, the Reporter writes the retrospective. Run `close_sprint.mjs --assume-ack` (**Gate 4**) to flip the sprint to `Completed`, archive artifacts, and print the 6-item handoff summary.

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

ClearGate is not a build tool, test runner, or CI system. The Developer agent calls *your project's* toolchain — `cleargate gate test`, `cleargate gate typecheck`, etc. — via the commands you configure in `.cleargate/config.yml`. Your toolchain stays yours; ClearGate orchestrates when and why agents invoke it.

---

## Want to know more?

- Architecture, repo layout, and how ClearGate is built with itself: [docs/INTERNALS.md](./docs/INTERNALS.md)
- License: [LICENSE](./LICENSE) (MIT)
