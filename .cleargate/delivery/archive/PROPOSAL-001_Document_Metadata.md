---
proposal_id: PROP-001
status: "Abandoned"
author: AI Agent (cleargate planning)
approved: true
approved_at: 2026-04-17T00:00:00Z
approved_by: Vibe Coder (ssuladze@exadel.com)
created_at: 2026-04-17T00:00:00Z
updated_at: 2026-04-17T00:00:00Z
codebase_version: strategy-phase-pre-init
pushed_by: sandrinio@github.local
pushed_at: 2026-04-20T19:44:09.120Z
push_version: 3
---

# PROPOSAL-001: Automatic Document Metadata (Creation, Edit, Codebase Version)

## 1. Initiative & Context

### 1.1 Objective
Every ClearGate document — Proposal, Epic, Story, Bug, CR, Initiative, Sprint — must automatically capture and maintain three metadata fields in its YAML frontmatter:

- `created_at` — ISO-8601 timestamp of first draft
- `updated_at` — ISO-8601 timestamp of last modification
- `codebase_version` — the version/commit state of the codebase when the document was touched

This gives every work item an auditable trail tying it to a precise moment and a precise codebase state.

### 1.2 The "Why"

- **Context decay.** A Story drafted against commit `abc123` may be obsolete if the repo is now at `xyz789`. The AI needs to know when a document was written relative to code state before acting on it.
- **CR blast radius.** When a CR invalidates prior Epics/Stories, knowing each downstream item's `codebase_version` lets the AI judge whether the invalidation still holds or if the code has already moved past it.
- **Human audit.** Vibe Coders reviewing archived items need to see "drafted at v1.3.2" to evaluate whether the implementation still reflects the intent.
- **Cross-session continuity.** An AI resuming work on a `pending-sync/` file from a prior session needs to detect staleness — did the codebase move since this draft?

---

## 2. Technical Architecture & Constraints

### 2.1 Dependencies
- **Git** — for commit SHA capture (primary source when repo is a git repo)
- **package.json** — for semver fallback when git is unavailable or missing tags
- **Node.js** — runtime for the stamping utility
- **YAML parser** — in the MCP adapter, to preserve these fields on push

### 2.2 System Constraints

| Constraint | Detail |
|---|---|
| Idempotency | Re-stamping must not change `created_at`, only `updated_at` and `codebase_version` |
| Clock source | ISO-8601 UTC from system clock — never local timezone |
| Privacy | No author email or PII captured — only commit SHA and semver |
| Archive immutability | Once a file moves to `archive/`, `updated_at` freezes. Archive is cold storage. |
| Fallback | If git is absent: use `package.json` version. If both absent: `codebase_version: "unknown"` with a warning. |
| Token discipline | The metadata block must be compact; it is read on every file load |

### 2.3 Proposed Schema

**Option A — Rich object (audit-grade, ~80 tokens):**
```yaml
created_at: "2026-04-17T14:32:10Z"
updated_at: "2026-04-17T15:01:42Z"
codebase_version:
  created_at_sha: "a3f2e91"
  created_at_tag: "v1.4.2"
  updated_at_sha: "a3f2e91"
  updated_at_tag: "v1.4.2"
  package_version: "1.4.2-dev"
```

**Option B — Flat strings (token-efficient, ~40 tokens):**
```yaml
created_at: "2026-04-17T14:32:10Z"
updated_at: "2026-04-17T15:01:42Z"
created_at_version: "a3f2e91"
updated_at_version: "a3f2e91"
```

**Recommendation:** **Option B.** The extra fidelity of Option A is rarely needed in the common case (dev timeline). When we need the richer data, `git show <sha>` retrieves it on demand. Token economy wins.

### 2.4 Update Mechanism — Three Options

**Option A — AI-driven.** Protocol rule: "The AI updates `updated_at` and `updated_at_version` on every write to a `.cleargate/delivery/*` file." Simple, no tooling, but relies on AI discipline — if the AI forgets, timestamps drift.

**Option B — File-save hook.** Shell hook (set up by `npx cleargate init`) stamps files on save. Deterministic but platform-specific (PostToolUse hook in Claude Code, fsevents on macOS, inotify on Linux). Fragile across environments.

**Option C — Stamp utility + protocol rule.** Ship `cleargate stamp <file>` CLI. Protocol rule: "After any write to `.cleargate/delivery/*`, invoke `cleargate stamp <file>` via Bash." AI calls it through the Bash tool. Deterministic AND visible — the user sees the stamp happening.

**Recommendation:** **Option C.** Best balance of determinism and transparency. The stamp command is idempotent (re-stamping preserves `created_at`). A PostToolUse hook (Option B) can be added later as an optimization, but C works everywhere Claude Code does.

### 2.5 Version Capture Semantics

Two questions bundled:

- Do we capture `codebase_version` at creation only (frozen snapshot), at last edit only (moving target), or both?
- If both, how do we name them without bloating frontmatter?

**Recommendation:** Capture both as `created_at_version` and `updated_at_version` (matches Option B schema). The "when written" version is needed for audit/archaeology; the "last touched" version is needed for staleness detection.

### 2.6 MCP Adapter Impact

These fields are not part of the native schema of Linear/Jira/GitHub. The adapter must:

1. Preserve the fields locally (never strip on push).
2. Inject a human-readable metadata trailer into the PM description on push. Example:
   ```
   ---
   ClearGate metadata
   Drafted: 2026-04-17T14:32:10Z at a3f2e91
   Last edit: 2026-04-17T15:01:42Z at a3f2e91
   ```
3. On pull (for read artifacts like Initiative/Sprint), set `created_at` and `updated_at` to the remote entity's `createdAt`/`updatedAt` timestamps if provided by the PM API, and `codebase_version` to the current local repo state.

---

## 3. Scope Impact (Touched Files & Data)

### 3.1 Known Files — must be modified

**Templates (add metadata fields to YAML frontmatter):**
- `.cleargate/templates/initiative.md`
- `.cleargate/templates/epic.md`
- `.cleargate/templates/story.md`
- `.cleargate/templates/Bug.md`
- `.cleargate/templates/CR.md`
- `.cleargate/templates/proposal.md`
- `.cleargate/templates/Sprint Plan Template.md`

**Protocol (add §11 "Document Metadata Lifecycle"):**
- `.cleargate/knowledge/cleargate-protocol.md`

### 3.2 Expected New Entities

Once the npm package exists:
- `packages/cleargate/src/commands/stamp.ts` — the `cleargate stamp <file>` CLI command
- `packages/cleargate/src/utils/codebase-version.ts` — git SHA + package.json detection
- `packages/cleargate/src/utils/stamp-frontmatter.ts` — idempotent YAML frontmatter updater

### 3.3 MCP Adapter Impact
- `packages/cleargate-mcp/src/adapters/linear.ts` — preserve + render metadata in issue description
- `packages/cleargate-mcp/src/adapters/jira.ts` — same
- `packages/cleargate-mcp/src/adapters/github.ts` — same

---

## 4. AI Interrogation Loop — RESOLVED

All decisions resolved by Vibe Coder 2026-04-17, accepting AI recommendations. One item deferred.

### Original 7 questions

1. **Schema shape** — **Resolved:** flat strings (Option B). Token economy over audit-grade fidelity.
2. **Update mechanism** — **Resolved:** stamp CLI + protocol rule (Option C). Deterministic and visible.
3. **Version capture** — **Resolved:** both. Fields: `created_at_version` + `updated_at_version`.
4. **MCP sync** — **Resolved:** push metadata as human-readable trailer in the PM description.
5. **Archive immutability** — **Resolved:** freeze `updated_at` on move to `archive/`.
6. **Git-absent fallback** — **Resolved:** fall back to `package.json` version with a warning. If both absent: `codebase_version: "unknown"`.
7. **Pre-init handling** — **Resolved:** forward-only. Strategy-phase docs are not retroactively stamped on `init`.

### Edge-case questions

8. **Dirty working tree** — **Resolved:** append `-dirty` suffix to SHA (e.g., `"a3f2e91-dirty"`) when `git status --porcelain` returns non-empty output. Signals that the draft is not reproducible from a clean checkout.
9. **MCP `remote_id` injection as stamp event** — **DEFERRED to MCP design phase.** Decision postponed until the MCP adapter is specified in a future proposal. Current placeholder recommendation: yes, MCP writes count as stamp events. To be confirmed.
10. **Stale-detection threshold** — **Resolved:** flag a document as "potentially stale" when ≥ 1 merge commit exists between the document's `updated_at_version` and current HEAD.
11. **`pushed_at_version` field** — **Resolved:** add as a third captured version. Populated by invoking `cleargate stamp` inside `cleargate_push_item` at push time. No new mechanism — same git-state capture utility, one additional invocation site.

### Implementation notes derived from resolutions

- **Dirty detection:** `git status --porcelain` is the canonical check. If non-empty → append `-dirty`.
- **Version capture utility:** one shared `codebase-version.ts` helper. Called at three sites: creation stamp, edit stamp, push stamp.
- **Three version fields per document:** `created_at_version`, `updated_at_version`, `pushed_at_version` (null until push).

---

## Approval Gate — PASSED

Approved by Vibe Coder on 2026-04-17. AI authorized to proceed with Epic/Story decomposition for this feature. Unblocks PROPOSAL-002 (which has a declared `depends_on` on this proposal).
