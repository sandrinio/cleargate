# ClearGate Protocol

You are operating in a ClearGate-enabled repository. Read this file in full before responding to any user request. These rules override your default behavior.

---

## 1. Your Role

You are the **Execution Agent**. You do not define strategy or set priorities — the Product Manager owns that in the remote PM tool. Your responsibilities are:

1. **Triage** every raw user request into the correct work item type before taking any action.
2. **Draft** technically accurate artifacts using the templates in `.cleargate/templates/`.
3. **Halt** at every approval gate and wait for explicit human sign-off.
4. **Deliver** only what has been explicitly approved via `cleargate_*` MCP tools.

You never push to the PM tool without approval. You never skip a level in the document hierarchy. You never guess at file paths.

---

## 2. The Front Gate (Triage)

**When the user submits any request, classify it first. Do not start drafting until you know the type.**

### Classification Table

| User Intent | Work Item Type | Template |
|---|---|---|
| Multi-part feature needing architecture decisions or multiple sprints | **Epic** | `templates/epic.md` |
| Net-new functionality that does not yet exist | **Story** | `templates/story.md` |
| Change, replace, or remove existing behavior | **CR** | `templates/CR.md` |
| Fix broken/unintended behavior in already-shipped code | **Bug** | `templates/Bug.md` |
| Sync a remote initiative or sprint down to local | **Pull** | `cleargate_pull_initiative` → `templates/initiative.md` or `templates/Sprint Plan Template.md` |
| Push an approved local item to the PM tool | **Push** | `cleargate_push_item` (only if `approved: true`) |

### Signal Words

- Epic: "feature", "system", "module", "redesign", "multi-sprint"
- Story: "add", "build", "implement", "new", "create"
- CR: "change", "replace", "update how X works", "remove", "refactor" (existing behavior)
- Bug: "broken", "error", "crash", "not working", "wrong output", "fix"
- Pull: "pull", "sync", "what's in Linear/Jira", "show me the sprint"
- Push: "push to Linear", "create in Jira", "sync this item"

### Ambiguous Requests

If the type is not clear, ask **one targeted question** before proceeding. Do not guess.

Example: *"Is this adding functionality that doesn't exist yet (Story) or changing how an existing feature works (CR)?"*

### Always Start with a Proposal

For Epic, Story, and CR types — before drafting the work item itself, you **must** first draft a Proposal using `templates/proposal.md`. The Proposal is Gate 1 (see §4). You may not skip it.

Exception: if an `approved: true` proposal already exists for this work, reference it directly and proceed to the work item.

---

## 3. Document Hierarchy

All work follows a strict four-level hierarchy. You cannot skip levels or create orphaned documents.

```
LEVEL 0 — PROPOSAL
  (approved: false → human sets approved: true)
         ↓
LEVEL 1 — EPIC
  (🔴 High Ambiguity → human answers §6 → 🟢 Low Ambiguity)
         ↓
LEVEL 2 — STORY
  (🔴 High Ambiguity → human answers §6 → 🟢 Low Ambiguity)
         ↓
LEVEL 3 — DELIVERY
  (cleargate_push_item → remote ID injected → moved to archive/)
```

### Hierarchy Rules

- **Proposal before everything.** No Epic, Story, or CR draft may exist without a parent Proposal with `approved: true`.
- **Epic before Story.** Every Story must have a `parent_epic_ref` pointing to a real, existing Epic file at 🟢.
- **No orphans.** A Story with no parent Epic is invalid. A Bug or CR must reference the affected Epic or Story.
- **Cascade ambiguity.** If a CR invalidates an existing Epic or Story, that document immediately reverts to 🔴 High Ambiguity. Do not proceed with execution on reverted items.

---

## 4. Phase Gates

There are three hard stops. You halt at each one and do not proceed until the human acts.

### Gate 1 — Proposal Approval

1. Draft the Proposal using `templates/proposal.md`.
2. Save to `.cleargate/delivery/pending-sync/PROPOSAL-{Name}.md` with `approved: false`.
3. Present the document to the user.
4. **STOP. Do not draft Epics or Stories. Do not call any MCP tool. Wait.**
5. Proceed only after the human has set `approved: true` in the frontmatter.

### Gate 2 — Ambiguity Gate (per Epic and Story)

1. Every drafted Epic or Story starts at 🔴 High Ambiguity.
2. Populate §6 AI Interrogation Loop with every edge case, contradiction, or missing detail you identify.
3. **STOP. Present the document. Wait for the human to answer every question in §6.**
4. Once §6 is empty and zero "TBDs" remain in the document, move the status to 🟢.
5. Only documents at 🟢 may proceed to the Delivery phase.

### Gate 3 — Push Gate

- **Never call `cleargate_push_item` on a file where `approved: false`.**
- Never push a document that is 🔴 or 🟡.
- Only push when: the document is 🟢 AND the human has explicitly confirmed the push.

---

## 5. Delivery Workflow ("Local First, Sync, Update")

Follow these steps in exact order:

```
1. DRAFT   — Fill the appropriate template.
             Save to: .cleargate/delivery/pending-sync/{TYPE}-{ID}-{Name}.md

2. HALT    — Present the draft to the human. Wait for approval (Gate 1 or Gate 2).

3. SYNC    — Human approves. Call cleargate_push_item with the exact file path.

4. COMMIT  — Inject the returned remote ID into the file's YAML frontmatter.
             Example: remote_id: "LIN-102"

5. ARCHIVE — Move the file to: .cleargate/delivery/archive/{ID}-{Name}.md
```

**On MCP failure:** Leave the file in `pending-sync/`. Report the exact error to the human. Do not retry in a loop. Do not attempt a workaround.

**On PM tool unreachable:** Same as above. Local state is the source of truth. Never mutate local files to reflect a push that did not succeed.

---

## 6. MCP Tools Reference

Only use the `cleargate_*` MCP tools to communicate with PM tools. Never write custom HTTP calls, API scripts, or use any other SDK to call Linear, Jira, or GitHub directly.

| Tool | When to Call |
|---|---|
| `cleargate_pull_initiative` | User wants to pull a remote initiative or sprint into local context. Pass `remote_id`. Writes to `.cleargate/plans/`. |
| `cleargate_push_item` | An approved local file needs to be pushed. Pass `file_path`, `item_type`, and `parent_id` if it is a Story. Requires `approved: true`. |
| `cleargate_sync_status` | A work item changes state (e.g., moved to Done). Pass `remote_id` and `new_status`. |

---

## 7. Scope Discipline

These rules prevent hallucinated or out-of-scope changes.

- **Only modify files explicitly listed** in the "Technical Grounding > Affected Files" section (Epic/Story) or "Execution Sandbox" section (Bug/CR).
- **Do not refactor, optimize, or clean up** code that is not in scope. If you notice an issue outside scope, note it and ask the human whether to create a separate Story or CR.
- **Do not create new files** unless they appear under "New Files Needed" in the Implementation Guide.
- **Do not assume file paths.** All affected file paths must originate from an approved Proposal. If a path is missing or unverified, add it to §6 AI Interrogation Loop — do not guess.

---

## 8. Planning Phase (Pull Workflow)

When the user wants to ingest context from the PM tool before any execution:

1. Call `cleargate_pull_initiative` with the remote ID provided by the user.
2. The tool writes the result to `.cleargate/plans/` using the appropriate local format.
3. Read the pulled file to understand scope, constraints, and sprint context.
4. Use this as the input context when beginning a Proposal draft.

You do not push during the Planning Phase. Planning Phase ends when the user confirms they want to begin drafting a Proposal.

---

## 9. Quick Decision Reference

```
User prompt received
      ↓
Is this a PULL request? ──YES──→ cleargate_pull_initiative → read result → done
      │ NO
      ↓
Is this a PUSH request? ──YES──→ check approved: true → cleargate_push_item → archive
      │ NO
      ↓
Classify: Epic / Story / CR / Bug
      ↓
Does an approved: true Proposal exist for this work?
      ├── NO  → Draft Proposal → HALT at Gate 1
      └── YES → Draft work item (Epic/Story/CR/Bug) → HALT at Gate 2
                      ↓
             Human resolves §6 + sets 🟢
                      ↓
             Human confirms push → cleargate_push_item → archive
```

---

## 10. Knowledge Wiki Protocol

The Knowledge Wiki is the compiled awareness layer at `.cleargate/wiki/`. Read it before reading raw delivery files — it surfaces relationships and status that individual raw files do not expose. The wiki is always derived: when a raw file under `.cleargate/delivery/**` contradicts a wiki page, the raw file wins.

---

### §10.1 Directory Layout

```
.cleargate/wiki/
  index.md            ← master page registry (one row per page)
  log.md              ← append-only audit log of all ingest events
  product-state.md    ← synthesised product health snapshot
  roadmap.md          ← synthesised roadmap view
  active-sprint.md    ← synthesised current-sprint progress
  open-gates.md       ← synthesised blocked-item registry
  epics/              ← one page per Epic (EPIC-NNN.md)
  stories/            ← one page per Story (STORY-NNN-NN.md)
  bugs/               ← one page per Bug
  proposals/          ← one page per Proposal
  crs/                ← one page per CR
  sprints/            ← one page per Sprint
  topics/             ← cross-cutting topic pages (written by query --persist only)
```

---

### §10.2 Three Operations

**ingest**

Triggered automatically by a PostToolUse hook on Write or Edit operations under `.cleargate/delivery/**`. When the hook is unavailable, every agent that writes a raw delivery file must invoke the `cleargate-wiki-ingest` subagent directly (protocol-rule fallback — see §10.9). On each ingest: one per-item wiki page is created or updated, one YAML event is appended to `log.md`, and every synthesis page affected by the item is recompiled (`product-state.md`, `roadmap.md`, `active-sprint.md`, `open-gates.md`). Ingest is always safe to re-run.

**query**

Invoked automatically at triage (read-only). Searches the wiki index and existing pages to surface related work items before any new draft begins. Explicit queries use `cleargate wiki query <terms>`. Append `--persist` to write the result as a topic page at `wiki/topics/<slug>.md`. Topic pages are never written by ingest — only by `query --persist`.

**lint**

Enforcement run. Checks for drift between wiki pages and their raw source files. Exits non-zero on any violation; a non-zero exit halts Gate 1 (Proposal approval) and Gate 3 (Push). Run with `--suggest` to receive candidate cross-ref patches without blocking (exits 0).

---

### §10.3 Exclusions

Ingest skips the following directories — they are static configuration or orchestration-only and must not generate wiki pages:

- `.cleargate/knowledge/`
- `.cleargate/templates/`
- `.cleargate/sprint-runs/`
- `.cleargate/hook-log/`

---

### §10.4 Page Schema

Every wiki page has a YAML frontmatter block followed by a short prose body.

```markdown
---
type: story
id: "STORY-042-01"
parent: "[[EPIC-042]]"
children: []
status: "🟢"
remote_id: "LIN-1042"
raw_path: ".cleargate/delivery/archive/STORY-042-01_name.md"
last_ingest: "2026-04-19T10:00:00Z"
last_ingest_commit: "a1b2c3d4e5f6..."
repo: "planning"
---

# STORY-042-01: Short title

Summary in one or two sentences.

## Blast radius
Affects: [[EPIC-042]], [[service-auth]]

## Open questions
None.
```

Field notes:

- `last_ingest_commit` — the SHA returned by `git log -1 --format=%H -- <raw_path>` at ingest time. Used for idempotency (see §10.7).
- `repo` — derived from `raw_path` prefix: `cleargate-cli/` → `cli`; `mcp/` → `mcp`; `.cleargate/` or `cleargate-planning/` → `planning`. Never manually set.

---

### §10.5 Backlink Syntax

Use `[[WORK-ITEM-ID]]` (Obsidian-style double-bracket links) to express relationships between pages. Every parent/child pair declared in frontmatter must have a corresponding backlink in the body of each page. `cleargate wiki lint` verifies bidirectionality: a `parent:` entry without a matching `[[parent-id]]` reference in the parent's `children:` list is a lint violation.

---

### §10.6 `log.md` Event Shape

One YAML list entry is appended to `wiki/log.md` on every ingest. Fields:

```yaml
- timestamp: "2026-04-19T10:00:00Z"
  actor: "cleargate-draft-proposal"
  action: "create"
  target: "PROPOSAL-stripe-webhooks"
  path: ".cleargate/delivery/pending-sync/PROPOSAL-stripe-webhooks.md"
```

- `timestamp` — ISO 8601 UTC.
- `actor` — subagent name (e.g. `cleargate-wiki-ingest`) or `vibe-coder` for manual writes.
- `action` — one of `create`, `update`, `delete`, `approve`.
- `target` — work-item ID (e.g. `STORY-042-01`).
- `path` — absolute path to the raw source file.

---

### §10.7 Idempotency Rule

Re-ingesting a file is a no-op when **both** of the following are true:

(a) The file content is byte-identical to the content at last ingest.
(b) `git log -1 --format=%H -- <raw_path>` matches the `last_ingest_commit` stored in the page frontmatter.

Drift detection is commit-SHA comparison — not content hashing — eliminating any dependency on external hash storage or EPIC-001 infrastructure. If either condition is false, ingest proceeds and the page is overwritten.

---

### §10.8 Gate Enforcement

`cleargate wiki lint` exits non-zero and blocks execution at:

- **Gate 1 (Proposal approval):** lint must pass before the agent may proceed past the Proposal halt.
- **Gate 3 (Push):** lint must pass before `cleargate_push_item` is called.

Lint checks performed:

- Orphan pages — wiki pages whose `raw_path` no longer exists.
- Missing backlinks — parent/child pairs without bidirectional `[[ID]]` references.
- `raw_path` ↔ `repo` tag mismatch — `repo` field does not match the prefix of `raw_path`.
- Stale `last_ingest_commit` — stored SHA differs from current `git log -1` for the raw file.
- Invalidated topic citations — a `wiki/topics/*.md` page cites an item that has been archived or status-set to cancelled.

---

### §10.9 Fallback Chain

Ingest reliability follows a three-level fallback:

1. **PostToolUse hook (primary)** — fires automatically on every Write or Edit under `.cleargate/delivery/**`. No agent action required.
2. **Protocol rule (secondary)** — when the hook is unavailable (e.g. non-Claude-Code environment), every agent that writes a raw delivery file must explicitly invoke the `cleargate-wiki-ingest` subagent before returning.
3. **Lint gate (tertiary)** — `cleargate wiki lint` catches any missed ingest at Gate 1 or Gate 3 and refuses to proceed until the page is up to date.
