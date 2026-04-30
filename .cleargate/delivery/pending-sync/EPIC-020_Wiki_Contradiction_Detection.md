---
epic_id: EPIC-020
status: Approved
approved: true
approved_at: 2026-04-29T00:00:00Z
approved_by: sandrinio
ambiguity: 🟢 Low
context_source: PROPOSAL-012_Wiki_Contradiction_Detection.md
owner: sandrinio
target_date: 2026-05-15
created_at: 2026-04-25T12:00:00Z
updated_at: 2026-04-25T12:00:00Z
created_at_version: post-SPRINT-13
updated_at_version: post-SPRINT-13
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-04-29T11:16:42Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id EPIC-020
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-04-29T11:16:42Z
  sessions: []
children:
  - "[[STORY-020-01]]"
  - "[[STORY-020-02]]"
  - "[[STORY-020-03]]"
---

# EPIC-020: Wiki Contradiction Detection (Advisory v1)

## 0. AI Coding Agent Handoff

```xml
<agent_context>
  <objective>Add a semantic contradiction-check phase to wiki-ingest so Draft/In-Review work items are screened against their cited neighborhood; emit advisory findings to wiki/contradictions.md without blocking any gate.</objective>
  <architecture_rules>
    <rule>Read-only subagent — Write/Edit/Bash forbidden in cleargate-wiki-contradict.md.</rule>
    <rule>Neighborhood-scoping is mandatory: full-corpus scans are forbidden. The subagent receives an explicit list of pages from the ingest caller.</rule>
    <rule>Idempotency via last_contradict_sha is mandatory — skip the LLM call when raw SHA matches.</rule>
    <rule>v1 always exits 0. No gate (1, 2, or 3) is blocked by a contradiction finding.</rule>
    <rule>Schema delta to §10.4 is additive only — pages without last_contradict_sha must continue to pass lint.</rule>
    <rule>No changes to .claude/hooks/stamp-and-gate.sh in v1. Phase 4 lives inside cleargate-wiki-ingest.</rule>
  </architecture_rules>
  <target_files>
    <file path=".claude/agents/cleargate-wiki-contradict.md" action="create" />
    <file path=".claude/agents/cleargate-wiki-ingest.md" action="modify" />
    <file path=".claude/agents/cleargate-wiki-lint.md" action="modify" />
    <file path=".cleargate/knowledge/cleargate-protocol.md" action="modify" />
    <file path=".cleargate/wiki/contradictions.md" action="create" />
    <file path=".cleargate/wiki/index.md" action="modify" />
    <file path="cleargate-cli/src/commands/wiki.ts" action="modify" />
    <file path="cleargate-cli/test/wiki-contradict.test.ts" action="create" />
  </target_files>
</agent_context>
```

## 1. Problem & Value

**Why are we doing this?**
`cleargate-wiki-lint` is structural-only — schema, backlinks, stale SHAs, exclusion list, mtime skew. Two drafts can each pass lint while asserting incompatible facts (e.g. "auth uses JWT" vs "auth uses OAuth client_credentials"). The corpus silently rots, downstream agents inherit poisoned premises, and the inconsistency only surfaces during execution where recovery cost is high. EPIC-020 closes that gap with a neighborhood-scoped semantic check fired from inside ingest.

**Success Metrics (North Star):**
- ≥1 true-positive contradiction surfaced per 30-day window across active drafting work (validates the check earns its tokens).
- 0 added gate-stage lint failures attributable to the new schema field (validates the additive delta).
- Per-call token cost ≤4k input + ≤1k output, p95 (validates neighborhood-scoping).
- After 30 days of advisory operation: a labeled finding log of ≥20 entries with ≥80% true-positive rate is the precondition for any future enforcing-mode proposal.

## 2. Scope Boundaries

**✅ IN-SCOPE (Build This)**
- [ ] New read-only subagent `cleargate-wiki-contradict` (sonnet, tools Read/Grep/Glob).
- [ ] Phase 4 wired into `cleargate-wiki-ingest`: only fires for `status ∈ {Draft, In Review}`, only on raw-SHA change.
- [ ] Neighborhood collector: cited `[[IDs]]` + parent + parent's other children + topic pages citing the parent.
- [ ] Advisory log writer (owned by ingest): appends YAML entries to `.cleargate/wiki/contradictions.md`.
- [ ] Schema delta §10.4: optional `last_contradict_sha` field. Lint backwards-compatible.
- [ ] Protocol §10.10: documents the check, neighborhood rule, idempotency, and calibration plan.
- [ ] CLI `cleargate wiki contradict <file>` — manual-invocation path for ad-hoc rechecks.
- [ ] `wiki/index.md` adds a "Contradictions" section linking to the log.

**❌ OUT-OF-SCOPE (Do NOT Build This)**
- Auto-resolution of contradictions. The agent flags; the human decides.
- Cross-repo contradictions (story-vs-code). Wiki-only.
- Contradictions across approved/archived items (frozen — assumed correct).
- Contradiction checks across `wiki/topics/*.md` synthesis pages (derived, not authored).
- Promotion to enforcing-mode (gate-blocking). v1 is advisory; promotion is a separate proposal.
- Changes to `stamp-and-gate.sh`. Phase 4 lives inside ingest, not the hook chain.
- Backfill of `last_contradict_sha` on existing pages. Field appears lazily as drafts get re-ingested.

## 3. The Reality Check (Context)

| Constraint Type | Limit / Rule |
|---|---|
| Token budget | ≤4k input + ≤1k output per call (neighborhood-scoping enforces this). New role `cleargate-wiki-contradict` recorded in `token-ledger.jsonl` by the SubagentStop hook. |
| Idempotency | If `last_contradict_sha` matches current `git log -1 --format=%H -- <raw_path>`, the LLM call MUST be skipped. |
| Read-only | The contradict subagent uses Read/Grep/Glob only. Findings are written to `wiki/contradictions.md` by ingest, never by contradict. |
| Advisory exit | Subagent always exits 0 in v1. Ingest always returns success even when findings exist. No gate is blocked. |
| Backwards-compat | Lint MUST continue to pass on every existing wiki page that lacks `last_contradict_sha`. |
| Status filter | Phase 4 runs only when the ingested page's `status ∈ {Draft, In Review}`. Approved/archived items skip. |
| Performance | Neighborhood is bounded at 8 pages typical, 12 hard cap. If a draft cites >12 distinct items, truncate to 12 (cite-order) and note the truncation in the finding output. |

**Affected files (mirrored to §4 for the gate-detector — known parser indexing quirk on epic templates that use §0–§6):**
- `.claude/agents/cleargate-wiki-contradict.md` (new)
- `.claude/agents/cleargate-wiki-ingest.md` (modify)
- `.claude/agents/cleargate-wiki-lint.md` (modify)
- `.cleargate/knowledge/cleargate-protocol.md` (modify)
- `.cleargate/wiki/contradictions.md` (new)
- `.cleargate/wiki/index.md` (modify)
- `cleargate-cli/src/commands/wiki.ts` (modify)
- `cleargate-cli/test/wiki-contradict.test.ts` (new)

## 4. Technical Grounding (The "Shadow Spec")

**Affected Files:**
- `.claude/agents/cleargate-wiki-contradict.md` — NEW. Subagent contract per PROPOSAL-012 §2.3.
- `.claude/agents/cleargate-wiki-ingest.md` — append Phase 4 to the workflow; document the §10.7 idempotency interaction (raw-SHA byte-identical short-circuits Phase 4 too).
- `.claude/agents/cleargate-wiki-lint.md` — one-line addition: `last_contradict_sha` is an allowed-but-optional field, not a §10.4 violation when present, not a violation when absent.
- `.cleargate/knowledge/cleargate-protocol.md` — add §10.10 (Wiki Contradiction Detection); update §10.4 schema example to show `last_contradict_sha` as optional.
- `.cleargate/wiki/contradictions.md` — NEW. Append-only YAML log.
- `.cleargate/wiki/index.md` — add "Contradictions" section linking to the log.
- `cleargate-cli/src/commands/wiki.ts` — register `contradict` subcommand alongside `build`/`ingest`/`query`/`lint`.
- `cleargate-cli/test/wiki-contradict.test.ts` — NEW. Smoke test for the CLI wrapper (mocks the subagent invocation; asserts exit code 0 + findings on stdout).

**Data Changes:**
- §10.4 page schema: add **optional** `last_contradict_sha: string | null` field. Frontmatter pages without this field continue to pass lint unchanged.

## 5. Acceptance Criteria

```gherkin
Feature: Wiki Contradiction Detection (Advisory v1)

  Scenario: Draft with cited neighbor that contradicts it
    Given a Draft story STORY-X-01 declaring "auth = JWT"
    And an already-ingested STORY-Y-01 declaring "auth = OAuth client_credentials"
    And STORY-X-01's body cites [[STORY-Y-01]]
    When cleargate-wiki-ingest runs on STORY-X-01
    Then Phase 4 fires
    And one finding is appended to .cleargate/wiki/contradictions.md
    And the finding line matches "contradiction: STORY-X-01 vs STORY-Y-01 · <claim ≤80 chars>"
    And the ingest exit code is 0
    And no gate is blocked

  Scenario: Approved item — Phase 4 skipped
    Given an Approved epic EPIC-Z whose body cites a contradicting neighbor
    When cleargate-wiki-ingest runs on EPIC-Z
    Then Phase 4 does NOT fire
    And no finding is appended

  Scenario: Idempotent re-ingest with unchanged SHA
    Given STORY-X-01 was previously checked and stamped with last_contradict_sha=abc123
    And the current git SHA for STORY-X-01's raw_path is abc123
    When cleargate-wiki-ingest runs on STORY-X-01
    Then Phase 4 short-circuits without calling the contradict subagent
    And the SubagentStop ledger records 0 new tokens for role=cleargate-wiki-contradict

  Scenario: Lint backwards-compat for pages without last_contradict_sha
    Given an existing wiki page that does not declare last_contradict_sha
    When cleargate-wiki-lint runs in enforce mode
    Then no schema-violation finding is emitted for that page
    And lint exits 0 if no other violations exist

  Scenario: Manual CLI invocation
    Given a developer runs "cleargate wiki contradict .cleargate/delivery/pending-sync/STORY-X-01.md"
    When the command completes
    Then the contradict subagent runs against STORY-X-01's neighborhood
    And findings (if any) are printed to stdout

  Scenario: Error path — subagent invocation fails
    Given the cleargate-wiki-contradict subagent crashes mid-call (e.g. transient model API Error)
    When cleargate-wiki-ingest catches the failure
    Then the Error is logged once to stderr with the draft id and exception class
    And no entry is appended to wiki/contradictions.md
    And last_contradict_sha is NOT stamped (so the next ingest will retry)
    And ingest still exits 0 (advisory contract — Phase 4 failures must NOT block other phases)
    And the exit code is 0
```

## 6. AI Interrogation Loop (Resolved 2026-04-25)

All four questions answered — recommendations accepted by human (sandrinio).

- **Q1:** Should Phase 4 run when a page transitions `In Review → Approved`?
  - **A1:** **No.** Skip-on-Approved stands. Rely on In-Review checks; the most expensive moment is also the one with the smallest marginal information gain (the human is approving — they've already reviewed). Locked into status filter in §3 Reality Check.
- **Q2:** When a draft cites >12 distinct `[[IDs]]`, truncate or error?
  - **A2:** **Truncate (graceful).** First-12 in cite-order; emit `truncated: true` in the finding output. Hard cap stays 12 in the §3 Reality Check.
- **Q3:** Where do `true-positive` / `false-positive` / `nitpick` labels live?
  - **A3:** **Inline** in the YAML entries of `wiki/contradictions.md`. No sibling labels file. Simpler one-file flow; the human edits the same record they're judging.
- **Q4:** Sync vs async Phase 4?
  - **A4:** **Synchronous v1.** Ingest blocks on the LLM call (~3-5s p95). Async deferred — adds a missed-write failure mode that's not worth the latency win at v1 scale. Revisit only if observed p95 >10s.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity (Ready for Coding Agent)**

Requirements satisfied:
- [x] Proposal document has `approved: true` (PROPOSAL-012).
- [x] The `<agent_context>` block is complete and validated.
- [x] §4 Technical Grounding contains 100% real, verified file paths.
- [x] §6 AI Interrogation Loop resolved (all 4 questions answered, recommendations accepted).
- [x] 0 "TBDs" exist in the document.
