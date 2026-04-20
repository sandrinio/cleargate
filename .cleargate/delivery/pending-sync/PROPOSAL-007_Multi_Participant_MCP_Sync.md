---
proposal_id: PROP-007
status: Draft
author: AI Agent (cleargate planning)
approved: true
created_at: 2026-04-19T00:00:00Z
updated_at: 2026-04-19T00:00:00Z
codebase_version: post-SPRINT-03
depends_on:
  - PROP-003
related:
  - PROP-001
  - PROP-002
  - PROP-005
  - PROP-006
stamp_error: no ledger rows for work_item_id PROP-007
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-04-20T20:12:14Z
  sessions: []
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-04-20T20:12:14Z
---

# PROPOSAL-007: Multi-Participant MCP Sync

## 1. Initiative & Context

### 1.1 Objective
Define the bidirectional sync model between ClearGate's local markdown state (`.cleargate/delivery/**`) and the remote PM tool (Linear / Jira / GitHub Projects via MCP), so that multi-participant teams share a unified project knowledge and backlog across platforms. Stakeholders who never open Claude Code should still be able to draft proposals, review approvals, and update statuses from the PM tool's native UI, with those changes flowing back into every participant's local view. Developers sharing a git repo should see each other's pushed items without stepping on one another's drafts.

Today, ClearGate push is one-way: a local `approved: true` proposal flows to the PM tool via `cleargate_push_item`, but any subsequent edit on the remote side (status change, comment, assignee update, stakeholder rewriting the description) is invisible locally until an explicit re-pull. There is no conflict resolution, no identity tracking, and no model for stakeholder-authored content flowing back. This proposal designs the minimum coherent sync contract that makes ClearGate usable for teams of more than one person.

### 1.2 The "Why"

- **Stakeholders are first-class.** A product owner on Linear should be able to draft a proposal, comment on it, approve or reject it — all from Linear — without ever touching `.cleargate/`. Today, any stakeholder work made remotely is lost to the local agent until someone re-pulls manually.
- **Multi-developer teams need shared backlog state.** Developer A pushes STORY-042-01 at 10am; Developer B opens Claude Code at 11am and must see that Story already exists, not re-draft it. Git sharing of the repo helps for static markdown, but status changes / comments / remote metadata don't live in markdown.
- **Conflict resolution is undefined.** What if Developer A edits an Epic locally while a PM rewrites its description remotely? There is no contract today — the first `push` silently wins.
- **Identity and attribution are missing.** No `pushed_by`, no `last_pulled_at`, no audit trail for who made which sync action.
- **Remote-only participation must be pleasant.** If the PM can't effectively collaborate from their own tool, the whole "markdown-first with MCP sync" thesis falls apart and ClearGate becomes a single-developer tool.
- **Unblocks gate enforcement at MCP push.** PROP-005 Q10 deferred MCP-side gate enforcement pending this design. Once sync contracts are locked, wiring gate checks into `cleargate_push_item` becomes mechanical.

### 1.3 Non-Goals

- **Not replicating PM tool UI.** No ClearGate comments UI, no in-markdown reaction/voting features. Stakeholders use the PM tool's native UI for those; ClearGate pulls read-only snapshots where useful.
- **Not real-time sync.** Eventual consistency model. Pull-on-demand + scheduled pulls. WebSocket / push-based sync deferred to v2.
- **Not changing raw markdown format.** PROP-001 frontmatter conventions stay. Wiki derivation stays. This proposal touches sync behavior, not artifact shape.
- **Not replacing git.** Multiple developers sharing a repo still use git for source control. Sync handles what git cannot (remote metadata, PM-tool-only content).
- **Not multi-tenant arbitration.** v1 assumes one ClearGate project maps to one remote PM project. Multi-remote federation deferred to v1.1.

---

## 2. Technical Architecture & Constraints

### 2.1 Dependencies

- **PROP-003** (hard) — MCP adapter is the existing push/pull surface; this proposal extends it.
- **PROP-001** (hard) — `created_at` / `updated_at` / `codebase_version` are the conflict-detection primitives.
- **PROP-002** (soft) — wiki synthesis pages render remote comments / statuses pulled down.
- **PROP-005** (soft) — readiness gates gain MCP-push enforcement once sync contract is locked.
- **PROP-006** (soft) — scaffold manifest is unrelated at runtime, but the drift-detection UX patterns (three-way merge, keep-mine / take-theirs) are reused here for work-item conflicts.

### 2.2 Sync Matrix — What Syncs, Which Direction, When

| Artifact | Local → Remote | Remote → Local | Authority |
|---|---|---|---|
| Proposal (draft, `approved: false`) | Push on explicit approval only | Pull on demand (for stakeholder-authored drafts) | Local (content) |
| Proposal (approved) | Push via `cleargate_push_item` | Pull on demand + periodic | Remote (status) / Local (content) |
| Epic | Push after Gate 2 🟢 | Pull on demand + periodic | Remote (status) / Local (content) |
| Story | Push after Gate 2 🟢 | Pull on demand + periodic | Remote (status, assignee) / Local (content) |
| CR | Push after approval | Pull on demand | Remote (status) / Local (content) |
| Bug | Push after approval | Pull on demand | Remote (status, assignee) / Local (content) |
| Sprint plan | Push on sprint start | Pull on demand | Remote (status) / Local (structure) |
| Comments (PM-tool-native) | ❌ Never pushed from local | Pulled as read-only snapshot into wiki | Remote |
| Assignees | ❌ Not set from local | Pulled into frontmatter | Remote |
| Status | `cleargate_sync_status` push | Pulled on periodic sync | Remote |
| Work-item content body | Push (authoritative source) | Prompt on remote-edit conflict | Local unless remote `updated_at` > local |
| FLASHCARD.md | ❌ Never | ❌ Never | Local-only (per-participant) |
| Wiki (`.cleargate/wiki/`) | ❌ Never | ❌ Never | Local-only (derived) |
| Token ledger | ❌ Never | ❌ Never | Local-only (per-participant) |
| Pending drafts (unpushed) | ❌ Never | ❌ Never | Local-only until explicitly pushed |
| `.install-manifest.json` | ❌ Never | ❌ Never | Local-only (scaffold state) |

**Key principle:** remote is authoritative for *operational metadata* (status, assignees, comments); local is authoritative for *content* (descriptions, acceptance criteria, requirements). Conflicts on content get prompted; conflicts on status always take the remote.

### 2.3 Conflict Resolution

When a local edit and a remote edit have both occurred since the last successful sync, `cleargate sync` classifies the conflict and handles it per these rules:

| Change type | Conflict? | Resolution |
|---|---|---|
| Local content edit, no remote changes | No | Push local; update `last_pushed_at`. |
| Remote status change, no local changes | No | Pull remote state into frontmatter; update `last_pulled_at`. |
| Local content edit + remote content edit | **Yes** | Three-way merge (analogous to PROP-006 Q3): inline diff + `[k]eep mine / [t]ake theirs / [e]dit in $EDITOR`. |
| Local content edit + remote status change | No | Merge: push content, pull status. Both authorities respected; no human intervention. |
| Local status change + remote status change | **Yes** | Remote wins silently (PM tool is authoritative for workflow state). Log to `sync-log.jsonl` so the Vibe Coder sees the overwrite on review. |
| Local delete + remote edit | **Yes** | Refuse to sync; surface to human ("This item was deleted locally but edited remotely — resurrect or delete remote?"). |
| Remote delete + local edit | **Yes** | Refuse to sync; surface to human (same shape). |

Conflict detection primitive: compare `updated_at` (local) with remote-equivalent timestamp from the MCP response; both must exceed `last_pushed_at` / `last_pulled_at` to be a true conflict.

### 2.4 Identity and Attribution

Every participant has an identity — derived by CLI in order of preference:

1. `CLEARGATE_USER` env var (explicit override, used by CI / scripted sync).
2. `git config user.email` (standard developer identity).
3. Fallback: hostname + username.

Every sync operation records to frontmatter:

```yaml
pushed_by: "sandro.suladze@gmail.com"
pushed_at: "2026-04-19T14:32:00Z"
last_pulled_by: "sandro.suladze@gmail.com"
last_pulled_at: "2026-04-19T15:10:00Z"
last_remote_update: "2026-04-19T14:58:00Z"   # from MCP response
```

Every sync operation also appends a line to `.cleargate/sprint-runs/<sprint>/sync-log.jsonl`:

```json
{"ts":"2026-04-19T14:32:00Z","actor":"sandro.suladze@gmail.com","op":"push","target":"STORY-042-01","remote_id":"LIN-1042","result":"ok"}
```

No content-body attribution per-edit (use git blame for that). Attribution at sync granularity only.

### 2.5 Collaboration Touchpoints

Concrete scenarios the design must support:

**Scenario A — Stakeholder drafts a proposal on Linear:**
1. Stakeholder creates a new Linear issue describing the idea.
2. Vibe Coder runs `cleargate pull` or opens a session (SessionStart hook auto-triggers sync).
3. MCP detects the new remote item with no local counterpart; writes it to `.cleargate/delivery/pending-sync/PROPOSAL-stakeholder-idea.md` with `approved: false` and `source: "remote-authored"` in frontmatter.
4. Agent surfaces at triage: *"Stakeholder proposed LIN-1099 'Refund flow redesign' — review at `.cleargate/delivery/pending-sync/…`"*.
5. Vibe Coder reviews, edits, approves. Gate 1 passes; `cleargate_push_item` pushes the now-fleshed-out proposal back.

**Scenario B — Stakeholder comments on a pushed Story:**
1. Story STORY-042-01 is in `archive/` with `remote_id: LIN-1042`.
2. PM adds a comment on LIN-1042 in Linear.
3. Next `cleargate sync` pulls the comment into the wiki page at `.cleargate/wiki/stories/STORY-042-01.md` under a "## Remote comments" section (read-only snapshot, timestamped).
4. Agent mentions it at triage if the Vibe Coder queries the story: *"1 new comment on LIN-1042 from pm@company.com — see wiki page."*
5. Vibe Coder reads the comment on Linear or on the wiki page; replies on Linear (not locally).

**Scenario C — Two developers race to draft the same Story:**
1. Developer A drafts STORY-042-02 locally at 10:00.
2. Developer B, unaware, drafts the same Story at 10:05 on a different branch.
3. Developer A pushes at 10:10 → gets remote ID LIN-1043.
4. Developer B pulls at 10:15 → detects LIN-1043 exists with a similar title; wiki-query surfaces the match before B's push.
5. If wiki-query misses it: B tries to push. MCP assigns a different remote ID; two Stories now exist remotely. Duplicate is caught by the next human review cycle; one gets merged/closed on the PM tool.

v1 does not prevent this race at the MCP layer (no distributed lock). Mitigation is wiki-query + pre-push dedupe prompt.

**Scenario D — Developer changes status locally; stakeholder changes status remotely at the same time:**
1. Developer marks STORY-042-01 as `done` locally → `cleargate_sync_status` pushes.
2. Meanwhile, PM reverts LIN-1042 to `in-progress` on Linear.
3. Next `cleargate sync` detects the conflict. **Remote wins** (§2.3 rule); local status updates to `in-progress`; sync-log records the overwrite.
4. Agent surfaces at next triage: *"Status on STORY-042-01 was overridden remotely from `done` to `in-progress`. PM may have additional requirements — check LIN-1042 comments."*

### 2.6 Sync Cadence

Three sync modes:

| Mode | Trigger | Scope |
|---|---|---|
| **Manual** | `cleargate sync` | All tracked items; prints summary of pulled/pushed/conflicts. |
| **Targeted** | `cleargate pull <ID>` / `cleargate push <file>` | One item. |
| **Auto (SessionStart)** | Hook at session boot, daily-throttled | Pulls only; warns on drift. Push never auto-fires — always explicit. |

`cleargate sync --watch` (long-running periodic sync in the background) is deferred to v1.1.

Pre-triage sync: if the wiki's `last_remote_sync` is older than 1 hour AND the current sprint is active, the agent suggests `cleargate sync` before any drafting begins. The agent does not auto-run sync without consent, because pulls can introduce conflicts the Vibe Coder may want to handle in a dedicated session.

### 2.7 Shared-Repo Scenario (Git + Multiple Developers)

When multiple developers share the ClearGate repo via git:

- **Static markdown (`.cleargate/delivery/**`):** normal git merge. If two developers modify the same file between pulls, standard git merge conflicts apply. Nothing ClearGate-specific.
- **Dynamic frontmatter (`pushed_at`, `last_pulled_at`, etc.):** these change with every sync and are therefore merge-conflict-prone. Mitigation: use ISO-8601 strings that sort textually; git usually takes the newer one. When that fails, the frontmatter-cache library (PROP-005) offers a merge helper.
- **Token ledger + FLASHCARD.md:** per-participant. The meta-repo decision (2026-04-18): ledger is local-only. FLASHCARD debated — currently shared via git. Revisit as v1.1 question.
- **Wiki:** derived; rebuild after any raw file merge via `cleargate wiki build`.
- **`.install-manifest.json`:** per-participant (different machines might have different install times). Add to gitignore in v1.

### 2.8 MCP Tool Evolution

Existing tools (from PROP-003):

- `cleargate_pull_initiative` — pull entire initiative into local plans.
- `cleargate_push_item` — one-way push (file → remote).
- `cleargate_sync_status` — push status change.

New tools required:

- **`cleargate_pull_item <remote_id>`** — pull a single item by remote ID; returns frontmatter + content body + comments + remote metadata.
- **`cleargate_list_remote_updates <since>`** — lightweight poll: list of `{remote_id, last_updated_at}` for items changed since `since`. Enables cheap SessionStart sync without hauling full content.
- **`cleargate_pull_comments <remote_id>`** — read-only snapshot of PM-tool-native comments. Used by wiki ingest to attach comments to wiki pages.
- **`cleargate_detect_new_items <since>`** — enumerate remote items that have no local counterpart. Drives Scenario A (stakeholder-authored proposals flowing in).

### 2.9 System Constraints

| Constraint | Detail |
|---|---|
| Consistency model | Eventual. Real-time deferred to v2. Acceptable staleness: ≤1 hour during active sprint; any during idle. |
| Authority split | Remote authoritative for status, assignees, comments. Local authoritative for content body. Per-field conflict rules in §2.3. |
| Privacy | Sync-log records op metadata only (who, when, what target). No content bodies, no PII beyond the email identity. |
| Security | All MCP calls use existing JWT from PROP-003. Tokens never logged. |
| Failure mode | On MCP failure, local state is source of truth. Sync retry is always manual; no exponential-backoff autoretry loops (can mask real problems). |
| Idempotency | Pulling the same item twice without remote changes is a no-op. Pushing with no local changes since last push is a no-op. |
| Ordering | Within a single `cleargate sync`, operations are: (1) pull updates, (2) detect conflicts, (3) prompt-or-resolve, (4) push approved local changes. Never push before pull — would amplify conflicts. |
| Backwards compat | Existing archived items lack sync-attribution frontmatter fields. Treat as `pulled_by: null` etc. Lint warns, does not error. |

### 2.10 CLI Surface

| Command | Purpose |
|---|---|
| `cleargate sync` | Full bidirectional pull + conflict resolution + push of approved items. |
| `cleargate sync --dry-run` | Show what would be pulled / pushed / conflicted. No state change. |
| `cleargate pull <ID>` | Targeted pull of one item. |
| `cleargate push <file>` | Targeted push; requires `approved: true`. Existing behavior with gate-check and sync-log additions. |
| `cleargate conflicts` | List current unresolved conflicts (from a previous sync that halted on user input). |
| `cleargate sync-log` | Print recent sync operations; filters by actor, op, target. |

### 2.11 Remote-Only Participant UX

The PM / stakeholder on Linear never runs `cleargate`. Their experience:

- **Drafting:** they create the issue in Linear with whatever fields their PM tool provides. ClearGate pulls it, writes it to `pending-sync/` with `source: "remote-authored"`, and the Vibe Coder completes the proposal template fields during review.
- **Commenting:** they use Linear's native comment UI. ClearGate pulls comments as read-only into wiki pages; never writes comments back.
- **Approving:** they mark the Linear issue as "Approved" or equivalent; ClearGate pulls the status; agent surfaces it; Vibe Coder runs the local approval flow which should now auto-detect the remote approval and mirror it.
- **Reading progress:** Linear's native dashboard. ClearGate's wiki is an internal view for developers, not a stakeholder-facing product.

The core asymmetry: **local participants get full toolkit (agent, gates, wiki, protocol). Remote participants get PM-tool-native UX with ClearGate as an invisible bridge.**

---

## 3. Scope Impact (Touched Files & Data)

### 3.1 Known Files — must be modified

**MCP server:**
- `mcp/src/endpoints/pull-item.ts` — new `cleargate_pull_item` handler.
- `mcp/src/endpoints/list-remote-updates.ts` — new.
- `mcp/src/endpoints/pull-comments.ts` — new.
- `mcp/src/endpoints/detect-new-items.ts` — new.
- `mcp/src/endpoints/push-item.ts` — extend with gate-check enforcement (PROP-005 Q10 deferred work) and `pushed_by` attribution.
- `mcp/src/lib/conflict-detector.ts` — new.

**CLI:**
- `cleargate-cli/src/commands/sync.ts` — new (full bidirectional sync).
- `cleargate-cli/src/commands/pull.ts` — new (targeted pull).
- `cleargate-cli/src/commands/conflicts.ts` — new.
- `cleargate-cli/src/commands/sync-log.ts` — new.
- `cleargate-cli/src/commands/push.ts` — extend to record `pushed_by`, append to sync-log.
- `cleargate-cli/src/lib/identity.ts` — new (resolves participant identity).
- `cleargate-cli/src/lib/merge-helper.ts` — new (reuses PROP-006 three-way-merge UX).

**Protocol:**
- `.cleargate/knowledge/cleargate-protocol.md` — add §13 "Multi-Participant Sync" covering sync matrix, conflict resolution, identity, and the remote-authored-proposal flow.

**Hook:**
- `.claude/hooks/session-start.sh` — extend with daily-throttled `cleargate sync` pull suggestion (not auto-pull — suggestion only).

**Frontmatter (all work-item types):**
- Add optional fields: `pushed_by`, `pushed_at`, `last_pulled_by`, `last_pulled_at`, `last_remote_update`, `source: "local-authored" | "remote-authored"`.

### 3.2 Expected New Entities

- `.cleargate/sprint-runs/<sprint>/sync-log.jsonl` — append-only sync audit trail.
- `.cleargate/delivery/pending-sync/PROPOSAL-*-remote-*.md` naming convention for items pulled from remote before local review.
- Wiki synthesis: `.cleargate/wiki/<type>/<id>.md` pages extended with `## Remote comments` section when comments are pulled.
- Test fixtures under `mcp/test/fixtures/sync/` — one per conflict scenario in §2.3.

### 3.3 MCP Adapter Impact — Summary

| Tool | Status | Change |
|---|---|---|
| `cleargate_pull_initiative` | Existing | No change (still bulk initiative pull). |
| `cleargate_push_item` | Existing | Add gate-check enforcement (PROP-005 hookup) + `pushed_by` recording. |
| `cleargate_sync_status` | Existing | Add conflict detection; remote-wins rule from §2.3. |
| `cleargate_pull_item` | **New** | Targeted single-item pull. |
| `cleargate_list_remote_updates` | **New** | Cheap poll for "what changed since X". |
| `cleargate_pull_comments` | **New** | Read-only comment snapshot. |
| `cleargate_detect_new_items` | **New** | Find remote items with no local counterpart. |

---

## 4. AI Interrogation Loop (Human Input Required)

*(The AI's open questions on this Proposal. The Proposal stays at Draft until all are answered.)*

1. **Q — Stakeholder-authored proposal flow: push or pull model for the initial "remote draft" state?** When a stakeholder creates a Linear issue intended as a ClearGate proposal, does (a) ClearGate periodically poll for such issues and pull them into `pending-sync/`, or (b) the stakeholder (or a PM automation) signal ClearGate explicitly via a webhook or tag? Recommendation: (a) poll-based for v1 (simpler, no webhook infrastructure), gated by an agreed-upon issue label like `cleargate:proposal` so we don't drag in every Linear issue. Webhook-driven push is v1.1 if label scanning proves too slow.
   - **Human Answer:** {Waiting}

2. **Q — Default conflict-bias: local-wins or remote-wins on content conflicts?** §2.3 proposes *prompt* for content conflicts (three-way merge). Alternative: last-write-wins by `updated_at`, no prompt. Recommendation: **prompt**. Silent content loss is the worst possible UX for a collaboration tool. Tradeoff: friction on every conflict — accepted because conflicts should be rare (content is local-authoritative, so concurrent edits are the exception).
   - **Human Answer:** {Waiting}

3. **Q — Sync cadence: manual-only or daily-throttled auto?** §2.6 proposes daily-throttled SessionStart pull + suggestion to Vibe Coder. Alternative: pure manual (never auto-sync). Recommendation: daily-throttled pull (read-only — no conflict risk) + manual push. SessionStart pull keeps the agent's context fresh without introducing unprompted state changes.
   - **Human Answer:** {Waiting}

4. **Q — Comment sync depth.** Pull comments into wiki as read-only snapshots (proposed) vs. skip comments entirely and require stakeholders + developers to always look at Linear? Recommendation: pull into wiki. Reasoning: developers already look at wiki at triage; having comments there means they don't context-switch to Linear for every discussion. Tradeoff: storage + freshness overhead — mitigated by pulling only comments on *active* items (in-flight sprint + last 30 days).
   - **Human Answer:** {Waiting}

5. **Q — Shared-repo FLASHCARD.md: per-participant or shared?** The meta-repo currently commits FLASHCARD.md to git (shared across developers). But flashcards can be deeply personal ("watch out for my `foo` typo habit"). Should we split into `FLASHCARD.shared.md` (git-tracked) + `FLASHCARD.personal.md` (gitignored)? Recommendation: defer to v1.1. v1 keeps status quo (single file, shared via git). Revisit if real-world use shows the personal/shared tension is material.
   - **Human Answer:** {Waiting}

6. **Q — Identity resolution precedence.** Proposed: `CLEARGATE_USER` env → `git config user.email` → hostname/username. Concern: git email may differ across repos (e.g., work vs. personal). Should we require an explicit ClearGate identity set once at `cleargate init` and stored in `.cleargate/.participant.json`? Recommendation: **explicit identity at init**, with env + git fallbacks for CI scenarios. Stored identity is more reliable than inferring per-call.
   - **Human Answer:** {Waiting}

7. **Q — Revert / un-push flow.** If a developer accidentally pushes a broken Story, how do they un-push? Options: (a) `cleargate push --revert <ID>` pushes an "archived" status to remote (doesn't delete the remote item, just marks it done-without-shipping); (b) relies on PM tool to manually delete; (c) no explicit revert — fix forward. Recommendation: (a) soft-revert via status. Hard delete requires PM-tool-native action; keeps ClearGate out of destructive remote ops.
   - **Human Answer:** {Waiting}

8. **Q — Multi-tenant PM mapping.** v1 assumes one ClearGate project → one remote PM project. Realistic? Some orgs split proposals into Linear and execution into Jira. Recommendation: defer federation to v1.1; v1 supports single-remote. Projects needing multi-remote can run two ClearGate instances side-by-side in separate directories until federation ships.
   - **Human Answer:** {Waiting}

9. **Q — Scope of v1 vs. v1.1.** This is a large surface. Proposed v1 scope: pull-on-demand + manual sync + conflict prompts + comments-as-snapshot + single-remote + stakeholder pull via label polling. v1.1: `--watch` long-running sync, webhook-driven push, FLASHCARD split, multi-remote federation. Recommendation: honor the proposed split. v1 is ~6 Stories; v1.1 is ~4 more.
   - **Human Answer:** {Waiting}

10. **Q — Sprint placement.** PROP-007 depends on PROP-003 (existing MCP) and is soft-related to PROP-005/006. Sequence: (a) PROP-005/006 ship first, then PROP-007 in a dedicated sprint; (b) PROP-007 ships in parallel with PROP-006 (no shared surface); (c) PROP-007 waits until real MCP usage patterns are observed. Recommendation: **(c) wait and observe**. Vibe Coder's own note: "observe how it works now as it is" (PROP-005 Q10 resolution). Target window: 3–6 months of real MCP use before committing to the sync contract. Use that time to collect real conflict scenarios and refine §2.3 rules against reality.
    - **Human Answer:** {Waiting}

11. **Q — Cloud sync contract scope: is ClearGate itself the sync contract or is the PM tool?** Framing: is the "source of truth" for the shared team view (a) ClearGate's local markdown + wiki, synced via MCP; or (b) the PM tool, with ClearGate as a local working copy? The answer shapes whether remote-only participants are first-class (case (a)) or second-class (case (b)). Recommendation: **(b) PM tool is authoritative**. ClearGate is a local productivity layer over the PM tool; the PM tool is where the shared team view lives. Stakeholders work in the PM tool; developers work in ClearGate; sync bridges them. This framing justifies remote-wins for status and lets us scope v1 smaller — we aren't building a new distributed system, we're building a markdown frontend to an existing one.
    - **Human Answer:** {Waiting}

---

## Approval Gate

(Vibe Coder: Review this proposal. This is the largest-surface Proposal in ClearGate to date. Recommended: answer Q10 first — the sequencing decision shapes whether the other answers matter now or in six months. If the architecture and context are correct, answer the questions in §4 and set `approved: true` in the YAML frontmatter. Only then is the AI authorized to decompose into Epics/Stories.)
