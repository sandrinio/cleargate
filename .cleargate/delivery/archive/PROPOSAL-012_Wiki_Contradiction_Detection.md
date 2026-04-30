---
proposal_id: PROP-012
status: Approved
author: AI Agent (Opus 4.7)
approved: true
created_at: 2026-04-25T00:00:00Z
updated_at: 2026-04-25T12:00:00Z
created_at_version: post-SPRINT-13
updated_at_version: post-SPRINT-13
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-04-25T16:20:47Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
context_source: Conversation 2026-04-25 — user flagged that current wiki-lint catches structural drift only, leaving the corpus open to content controversies (e.g. story A says 'auth = JWT', story B says 'auth = OAuth'). Triage classified this as a Proposal because it adds a new wiki-side capability orthogonal to existing lint/ingest/query. Lint scope (.claude/agents/cleargate-wiki-lint.md) and ingest hook chain (.claude/hooks/stamp-and-gate.sh) read inline.
stamp_error: no ledger rows for work_item_id PROP-012
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-04-25T16:20:47Z
  sessions: []
---

# PROPOSAL-012: Wiki Contradiction Detection

## 1. Initiative & Context

### 1.1 Objective

Add a semantic, neighborhood-scoped contradiction check to the wiki layer so that when a new draft (Proposal / Epic / Story / CR / Bug) makes a claim that conflicts with an already-ingested item it cites or shares an epic with, the conflict is surfaced **before** it propagates into synthesis pages and downstream agent context. v1 ships in **advisory mode** (non-blocking, ledger-tracked); promotion to enforcing is a deferred decision after calibration.

### 1.2 The "Why"

1. **Current lint is structural-only.** `cleargate-wiki-lint` enforces frontmatter schema, backlink bidirectionality, stale SHAs, exclusion list, mtime skew, and pagination. It does **not** read prose. Two drafts can each pass lint while asserting incompatible facts ("auth uses JWT" vs "auth uses OAuth client credentials"), and the inconsistency only surfaces during execution — at which point the four-agent loop has already burned tokens building on a poisoned premise.
2. **Raw-as-source-of-truth is fine for POC, fragile at scale.** With ~50 stories the human can hold the corpus in their head; past 100 they cannot, and the wiki/topics synthesis pages become silently wrong. The Karpathy-style awareness layer's value depends on the corpus being internally consistent.
3. **The hook chain already does the expensive read.** `stamp-and-gate.sh` invokes `cleargate-wiki-ingest` on every Write/Edit under `.cleargate/delivery/**`. Ingest already reads the just-written file, computes the affected-synthesis neighborhood, and recompiles topic pages. A contradiction-check phase piggybacks on this existing read — adding one LLM call per draft, scoped to the cited neighborhood (≈3-8 pages, not the full corpus). Token cost is bounded; gate-time recovery cost is not.
4. **Drift is cheaper to catch at write than at gate.** Per the current lint guardrails, gate-stage failures cost ~10× hook-stage failures because they require re-Read of raw + re-Read of page + re-ingest + re-lint. Same logic applies to contradictions: catch at the moment the inconsistent claim enters the corpus, not when QA blocks on a story whose acceptance criteria contradict an already-shipped epic.

### 1.3 Out of scope (v1)

- Contradictions across **archived/approved** items (frozen — assumed correct; only check Draft / In Review against the rest of the corpus).
- Auto-resolution. The agent flags; the human decides which side is right.
- Cross-repo contradictions where the conflicting claim lives in code (not in `.cleargate/`). Wiki only.
- Contradiction detection for `wiki/topics/*.md` synthesis pages themselves — they are derived, not authored; if their inputs are consistent, they are too.
- Promotion to enforcing-mode (blocks Gate 1 / Gate 3). v1 is advisory only; calibration data informs that decision in a later proposal.

## 2. Technical Architecture & Constraints

### 2.1 Trigger point — ingest phase, not a separate hook

The check fires from inside `cleargate-wiki-ingest`, **after** the per-item page is written and the affected-synthesis recompile completes, **before** the ingest agent returns. This keeps the design hook-free in v1 — no change to `stamp-and-gate.sh`. Idempotency rule §10.7 still applies: if the raw file content is byte-identical to last ingest, ingest is a no-op and the contradict phase does not run.

Pseudocode for the new ingest tail:

```
# existing ingest flow:
write per-item wiki page
append YAML event to wiki/log.md
recompile affected synthesis pages

# NEW phase 4:
if status in {Draft, In Review}:
  neighborhood = collect_cited_pages(this_draft)
  findings = invoke_contradict_subagent(this_draft, neighborhood)
  if findings:
    append to wiki/contradictions.md (advisory log)
    return findings as part of ingest stdout
```

### 2.2 Neighborhood-scoping rule (O(neighborhood), never O(corpus))

The contradict subagent reads only:

1. The just-written draft (already loaded by ingest).
2. Every `[[ID]]` directly cited in the draft body.
3. The draft's `parent` page (epic, if it's a story; proposal, if it's an epic) and **its** other children — sibling stories under the same epic are the highest-prior contradiction zone in practice.
4. Any `wiki/topics/*.md` page whose `cites:` list includes the draft's parent.

This gives a typical neighborhood of 3-8 pages. **Never** a full-corpus scan. Token budget per check: ~1.5-4k input + ~300-800 output.

### 2.3 Subagent contract

New subagent file `.claude/agents/cleargate-wiki-contradict.md` with these properties:

- **Tools:** Read, Grep, Glob (read-only — no Write, no Edit, no Bash).
- **Model:** sonnet (cheap, calibrated for short-form factual judgment).
- **Inputs:** path to just-written draft, list of neighborhood page paths.
- **Output:** zero or more findings, one per line, format:

  ```
  contradiction: <draft-id> vs <neighbor-id> · <claim-summary> (≤80 chars)
  ```

- **Exit code:** always 0 in v1 (advisory).
- **Determinism:** the subagent must include its full reasoning in stdout (one paragraph per finding) so the human can audit calibration. Findings without reasoning are rejected.

### 2.4 Advisory log — `wiki/contradictions.md`

A new synthesis page (not a per-item page, not under `topics/`):

- Append-only YAML log of findings with timestamps, draft id, neighbor id, claim summary, and ingest commit SHA.
- Lives outside the per-bucket pagination check (it's a log, not an index).
- Read by the conversational agent at session-start (via `wiki/index.md` linking to it) so the orchestrator sees pending controversies before drafting new work.

### 2.5 Calibration plan

Before any future proposal promotes the check to enforcing-mode, collect **30 days** of advisory findings in `wiki/contradictions.md`. Each finding gets one of three human-applied labels in a follow-up edit: `true-positive`, `false-positive`, `nitpick`. Promotion threshold (informal): ≥80% true-positive across ≥20 findings. Below that threshold, v1 stays advisory indefinitely or is reverted.

### 2.6 Dependencies

- Existing: `cleargate-wiki-ingest` subagent, `stamp-and-gate.sh` hook, wiki schema §10.4, token-ledger hook.
- No new external packages.
- No MCP-side changes.
- No CLI breaking changes — `cleargate wiki contradict <file>` is added as an opt-in manual invocation; the hook chain calls it transparently via ingest.

### 2.7 System Constraints

| Constraint | Details |
|---|---|
| **Token budget** | LLM call per draft Write/Edit under `.cleargate/delivery/**`. Bounded at ≤4k input + ≤1k output by neighborhood-scoping. New role `cleargate-wiki-contradict` recorded in token-ledger.jsonl by SubagentStop hook. |
| **Read-only** | Subagent uses Read/Grep/Glob only. Never writes the draft, never edits the neighbor. Findings go to `wiki/contradictions.md` via the **ingest** subagent's writer (single owner). |
| **Idempotent** | If the draft content SHA is unchanged since last contradict run, skip. Stamped via `last_contradict_sha` in page frontmatter (new optional field — see §10.4 schema delta in §3 below). |
| **Advisory exit** | v1 always exits 0. Findings appear in ingest stdout and in `wiki/contradictions.md`; gate transitions are not blocked. |
| **No cross-repo** | The neighborhood is wiki-only. Code contradictions (e.g. a story claims an env var that the codebase contradicts) are not in scope. |
| **Calibration gate** | Promotion to enforcing-mode requires a separate proposal citing the calibration log. |

## 3. Scope Impact (Touched Files & Data)

### 3.1 Known Files (modified)

- `.claude/agents/cleargate-wiki-ingest.md` — append "Phase 4: contradict invocation" to the workflow; document the §10.7 idempotency interaction.
- `.cleargate/knowledge/cleargate-protocol.md` — add §10.10 (Wiki Contradiction Detection) describing the advisory check, neighborhood rule, and calibration plan. Add `last_contradict_sha` as an optional field in the §10.4 schema (lint must NOT reject pages missing it; lint must NOT reject pages that have it).
- `.claude/agents/cleargate-wiki-lint.md` — one-line addition: lint ignores `last_contradict_sha`.
- `cleargate-cli/src/commands/wiki.ts` — register `cleargate wiki contradict <file>` subcommand (manual invocation path; same behavior as the ingest-tail call).
- `.cleargate/wiki/index.md` — add a "Contradictions" section linking to `wiki/contradictions.md` so session-start orientation sees it.

### 3.2 Expected New Entities

- `.claude/agents/cleargate-wiki-contradict.md` — new subagent definition (read-only; sonnet; tools Read/Grep/Glob).
- `.cleargate/wiki/contradictions.md` — new advisory log page. Append-only. Schema:

  ```yaml
  ---
  type: "synthesis"
  id: "contradictions"
  generated_at: "<ISO>"
  ---

  # Wiki Contradictions — Advisory Log

  ## 2026-04-25
  - draft: "[[STORY-014-02]]"
    neighbor: "[[STORY-013-04]]"
    claim: "auth flow expects JWT vs neighbor mandates OAuth client_credentials"
    ingest_sha: "abc1234"
    label: null  # pending human labeling
  ```

- (Possibly) `.cleargate/sprint-runs/<sprint-id>/contradict-ledger.jsonl` — only if SubagentStop ledger format proves insufficient; default is to reuse the existing ledger with `role: cleargate-wiki-contradict`.

### 3.3 Schema delta (§10.4 — additive only)

One new optional field added to the per-item page schema:

```
last_contradict_sha: "<git-sha-of-raw-at-last-check>"
```

Purpose: idempotency. If the stored value matches the current raw-file SHA, skip the contradict subagent call (already-checked, no-op). Lint is unchanged for pages without this field — backwards-compatible with every existing wiki page.

🔒 Approval Gate

(Vibe Coder: Review this proposal. Specifically validate (a) advisory-only v1 is the right starting point vs. enforcing on day one, (b) the neighborhood-scoping rule in §2.2 is conservative enough, (c) the calibration plan in §2.5 is acceptable as the gate to enforcing-mode, and (d) the §10.4 additive schema delta in §3.3 doesn't conflict with EPIC-015 or any in-flight wiki work. If correct, change `approved: false` → `approved: true` in the YAML frontmatter. Only then is the AI authorized to proceed with Epic/Story decomposition.)
