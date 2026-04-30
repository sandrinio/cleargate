---
story_id: STORY-020-02
parent_epic_ref: EPIC-020
parent_cleargate_id: EPIC-020
status: Done
approved: true
approved_at: 2026-04-29T00:00:00Z
approved_by: sandrinio
ambiguity: 🟢 Low
context_source: PROPOSAL-012_Wiki_Contradiction_Detection.md
actor: cleargate-wiki-ingest subagent
complexity_label: L2
parallel_eligible: n
expected_bounce_exposure: med
created_at: 2026-04-25T12:00:00Z
updated_at: 2026-04-25T12:00:00Z
created_at_version: post-SPRINT-13
updated_at_version: post-SPRINT-13
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-04-30T12:19:12Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id STORY-020-02
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-04-29T11:17:09Z
  sessions: []
---

# STORY-020-02: Ingest Phase 4 + Neighborhood Collector + Advisory Log

**Complexity:** L2 — modifies the ingest subagent contract, adds neighborhood-collection logic, and introduces the advisory log as a new wiki page. Strict predecessor of STORY-020-03 (CLI wraps the same Phase 4 logic).

## 1. The Spec (The Contract)

### 1.1 User Story
As the `cleargate-wiki-ingest` subagent, I want a documented Phase 4 that collects the draft's neighborhood, invokes `cleargate-wiki-contradict`, and appends findings to `wiki/contradictions.md` — short-circuited by status-filter and SHA-idempotency — so that contradictions surface at write-time without blocking any gate.

### 1.2 Detailed Requirements
- Append a "Phase 4 — Contradiction Check" section to `.claude/agents/cleargate-wiki-ingest.md`'s workflow, ordered AFTER affected-synthesis recompile and BEFORE the agent's final exit.
- **Status filter:** Phase 4 runs only when the just-ingested page's `status ∈ {Draft, In Review}`. For all other statuses (Approved, Done, Archived, Cancelled, etc.), Phase 4 is skipped without invoking the subagent or stamping `last_contradict_sha`.
- **Idempotency:** Before invoking the subagent, compute `current_sha = git log -1 --format=%H -- <raw_path>`. If the page's `last_contradict_sha` equals `current_sha`, skip the subagent invocation (no LLM call, no log append). The frontmatter is left untouched.
- **Neighborhood collector** (deterministic, before LLM call):
  1. Parse the just-written draft body for `[[ID]]` mentions; resolve each to a wiki page path.
  2. Add the draft's `parent` page (from frontmatter `parent:`).
  3. Add every other child of that parent (from the parent's `children:` list), excluding the draft itself.
  4. Add every `wiki/topics/*.md` page whose `cites:` list includes the draft's parent.
  5. Deduplicate. If the resulting list exceeds 12 entries, truncate to the first 12 in cite-order (drafts cited first, then parent, then siblings, then topic pages). Note `truncated: true` in the finding output if truncation occurred.
- **Subagent invocation:** Spawn `cleargate-wiki-contradict` via the Task tool with `{ draft_path, neighborhood: string[] }`. The subagent returns stdout containing zero or more findings.
- **Advisory log writer:** For every finding returned, append one YAML entry to `.cleargate/wiki/contradictions.md` in the schema below. Ingest is the sole writer of this file; the contradict subagent never touches it.
- **Stamp:** After Phase 4 completes (whether findings were emitted or not), update the page's `last_contradict_sha` frontmatter field to `current_sha`. This is the only frontmatter mutation Phase 4 makes.
- **Advisory exit:** Phase 4 never causes ingest to exit non-zero. Findings are informational. The PostToolUse hook chain continues unaffected.
- **Create initial `.cleargate/wiki/contradictions.md`** with the synthesis-page header (`type: synthesis`, `id: contradictions`, `generated_at`) and an empty findings list. This file is the append target.
- **Update `.cleargate/wiki/index.md`** to add a "Contradictions" section linking to `contradictions.md`. Place it after the existing "Open Gates" section so session-start orientation sees it before drafting new work.

### 1.3 Out of Scope
- The contradict subagent definition itself (STORY-020-01).
- The CLI wrapper (STORY-020-03).
- Backfilling `last_contradict_sha` on existing pages — the field appears lazily as drafts get re-ingested under Phase 4.
- Manual labeling tooling — the human edits `contradictions.md` by hand to apply `label:` values; no CLI for labeling in v1.
- Async/fire-and-forget Phase 4. v1 is synchronous; ingest blocks on the LLM call.

## 2. The Truth (Executable Tests)

### 2.1 Acceptance Criteria (Gherkin)

```gherkin
Feature: Ingest Phase 4 — Contradiction Check (Advisory)

  Scenario: Phase 4 fires on Draft and appends a finding
    Given a Draft story whose body contradicts a cited neighbor
    And the draft's last_contradict_sha is null
    When cleargate-wiki-ingest runs
    Then Phase 4 invokes cleargate-wiki-contradict
    And the subagent returns at least one finding line
    And exactly one YAML entry per finding is appended to wiki/contradictions.md
    And the draft's last_contradict_sha is stamped to the current git SHA
    And ingest exits 0

  Scenario: Status filter — Approved page skips Phase 4
    Given a wiki page with status "Approved"
    When cleargate-wiki-ingest runs
    Then Phase 4 is skipped
    And cleargate-wiki-contradict is NOT invoked
    And last_contradict_sha is NOT stamped
    And no entry is appended to wiki/contradictions.md

  Scenario: SHA-idempotency short-circuit
    Given a Draft page whose last_contradict_sha matches git log -1 for raw_path
    When cleargate-wiki-ingest runs
    Then Phase 4 short-circuits before invoking the subagent
    And the SubagentStop ledger records 0 new tokens for role=cleargate-wiki-contradict
    And no entry is appended to wiki/contradictions.md

  Scenario: Neighborhood truncation at 12
    Given a Draft that cites 15 distinct [[IDs]]
    When Phase 4 runs
    Then the neighborhood list passed to the subagent has exactly 12 entries
    And every emitted finding line includes "truncated: true"

  Scenario: Advisory log schema is well-formed
    Given Phase 4 has appended a finding entry
    When wiki/contradictions.md is parsed
    Then the entry has fields draft, neighbor, claim, ingest_sha, label
    And the label field is null (pending human labeling)
```

### 2.2 Verification Steps (Manual)
- [ ] Create a synthetic Draft story with a contradicting cited neighbor; run `cleargate wiki ingest <path>`; verify one entry appended to `wiki/contradictions.md` and `last_contradict_sha` stamped.
- [ ] Re-run `cleargate wiki ingest <path>` immediately; verify zero new entries (idempotency).
- [ ] Flip the synthetic story to `status: Approved`; modify body trivially; re-run ingest; verify Phase 4 skipped and no `last_contradict_sha` change.
- [ ] Inspect `.cleargate/wiki/index.md` — confirm a "Contradictions" section linking to `contradictions.md`.
- [ ] Inspect `.cleargate/sprint-runs/<id>/token-ledger.jsonl` — confirm at least one row with `role: cleargate-wiki-contradict`.

## 3. The Implementation Guide

### 3.1 Context & Files

| Item | Value |
|---|---|
| Primary File | `.claude/agents/cleargate-wiki-ingest.md` |
| Related Files | `.cleargate/wiki/index.md` |
| New Files Needed | Yes — `.cleargate/wiki/contradictions.md` |

### 3.2 Technical Logic
Phase 4 lives at the bottom of the ingest workflow, after the existing affected-synthesis recompile pass. Pseudocode:

```
# After Phase 3 (recompile synthesis):

if status not in {"Draft", "In Review"}: return  # filter

current_sha = bash("git log -1 --format=%H -- " + raw_path)
if last_contradict_sha == current_sha: return    # idempotent

neighborhood = collect_neighborhood(draft)        # see §1.2 step 5
if len(neighborhood) > 12:
    neighborhood = neighborhood[:12]
    truncated = True
else:
    truncated = False

findings = invoke_subagent(
    "cleargate-wiki-contradict",
    {"draft_path": raw_path, "neighborhood": neighborhood}
)

for f in findings:
    append_yaml_entry_to(".cleargate/wiki/contradictions.md", {
        "draft": f.draft_id,
        "neighbor": f.neighbor_id,
        "claim": f.claim_summary,
        "ingest_sha": current_sha,
        "truncated": truncated,
        "label": None
    })

stamp(raw_path, "last_contradict_sha", current_sha)
# always exit 0 from ingest's perspective
```

The advisory log entry schema:

```yaml
- draft: "[[STORY-020-02]]"
  neighbor: "[[STORY-Y-01]]"
  claim: "auth flow expects JWT vs neighbor mandates OAuth client_credentials"
  ingest_sha: "abc1234"
  truncated: false
  label: null
```

The initial `wiki/contradictions.md` skeleton:

```yaml
---
type: "synthesis"
id: "contradictions"
generated_at: "2026-04-25T12:00:00Z"
---

# Wiki Contradictions — Advisory Log

(Append-only. Each entry is one YAML record. Human applies label: true-positive | false-positive | nitpick.)

findings: []
```

### 3.3 API Contract (if applicable)

| Endpoint | Method | Auth | Request Shape | Response Shape |
|---|---|---|---|---|
| `Task("cleargate-wiki-contradict")` | spawn | n/a | `{ draft_path: string, neighborhood: string[] }` | stdout: 0..N `contradiction:` lines + reasoning paragraphs; exit 0 |

## 4. Quality Gates

### 4.1 Minimum Test Expectations

| Test Type | Minimum Count | Notes |
|---|---|---|
| Integration tests | 5 | One per §2.1 Gherkin scenario, exercised against a fixture wiki tree under `cleargate-cli/test/fixtures/wiki-contradict/`. |
| Idempotency assertion | 1 | Run ingest twice on the same SHA; assert zero new ledger rows for the contradict role. |

### 4.2 Definition of Done (The Gate)
- [ ] Minimum test expectations (§4.1) met.
- [ ] All Gherkin scenarios from §2.1 covered.
- [ ] `wiki/contradictions.md` exists with the synthesis header.
- [ ] `wiki/index.md` has a "Contradictions" section.
- [ ] `cleargate wiki lint` exits 0 (the new optional field is silently accepted).
- [ ] Peer/Architect Review passed.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity (Ready for Execution after STORY-020-01 lands)**

Requirements:
- [x] EPIC-020 §6 questions resolved (skip-on-Approved, graceful >12-cite truncation, inline labels, **synchronous** Phase 4 — all confirmed 2026-04-25). The synchronous-Phase 4 answer locks the §3.2 control-flow pseudocode as authoritative.
- [ ] STORY-020-01 merged so the contradict subagent contract is locked (sequencing dependency, not an ambiguity).
- [ ] No "TBDs" exist anywhere in the specification or technical logic.
