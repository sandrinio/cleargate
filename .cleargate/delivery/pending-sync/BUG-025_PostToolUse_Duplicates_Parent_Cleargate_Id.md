---
bug_id: BUG-025
parent_ref: SPRINT-19 close pipeline diagnosis 2026-05-02; CR-022 M4/M5/M6/M11 lifecycle drift
parent_cleargate_id: null
sprint_cleargate_id: SPRINT-20
carry_over: false
status: Triaged
ambiguity: 🟢 Low
severity: P2-Medium
reporter: sandrinio (orchestrator-observed during SPRINT-19 close)
context_source: "SPRINT-19 close pipeline diagnosis 2026-05-02. close_sprint.mjs Step 2.6 lifecycle reconciler reported `status=missing in archive` for CR-022/CR-024/CR-025 even after move + status: Done. Root cause: parseFrontmatter throws `duplicated mapping key (4:1)` because PostToolUse stamp hook had silently inserted a second `parent_cleargate_id: null` line on every Edit/Write under .cleargate/delivery/**. Manual dedupe of the 3 CR files unblocked the close. Found by orchestrator during Gate 4 close attempt; not visible until reconciler runs. Affects every CR/Bug/Story file edited mid-sprint."
proposal_gate_waiver:
  approved_by: sandrinio
  approved_at: 2026-05-02T13:30:00Z
  reason: Direct approval pattern. Orchestrator-diagnosed during SPRINT-19 close. ~30 LOC fix in stamp-and-gate.sh; no architectural decision required.
approved: true
owner: sandrinio
target_date: SPRINT-20
created_at: 2026-05-02T13:30:00Z
updated_at: 2026-05-02T13:30:00Z
created_at_version: cleargate@0.10.0
updated_at_version: cleargate@0.10.0
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-05-02T11:00:54Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id BUG-025
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-05-02T11:00:53Z
  sessions: []
---

# BUG-025: PostToolUse Stamp Hook Duplicates `parent_cleargate_id` Frontmatter Key

## 1. The Anomaly

**Expected:** PostToolUse stamp-and-gate hook idempotently writes/updates frontmatter fields. If `parent_cleargate_id:` already exists in the document's frontmatter, the hook either updates the existing line in place or no-ops.

**Actual:** The hook unconditionally appends `parent_cleargate_id: null` to the frontmatter on every Edit/Write under `.cleargate/delivery/**`. Files edited multiple times accumulate multiple `parent_cleargate_id:` lines. js-yaml CORE_SCHEMA throws `YAMLException: duplicated mapping key (4:1)` on the resulting file. Downstream consumers (lifecycle reconciler, gate predicates, wiki ingest) silently fail to parse the frontmatter and report misleading errors (e.g., `status=missing` when status IS present but YAML parse threw before reaching it).

## 2. Reproduction Protocol

- **Step 1 — Pick any work item under pending-sync.** e.g., `BUG-024_Token_Ledger_Attribution_Spike.md`. Note its current frontmatter has exactly one `parent_cleargate_id:` line.
- **Step 2 — Trigger an Edit through Claude Code.** Any tool call that invokes `Edit` or `Write` on the file fires the PostToolUse stamp-and-gate hook (via `.claude/settings.json`).
- **Step 3 — Re-read the frontmatter.** A second `parent_cleargate_id: null` line has been appended. Repeated edits add more.
- **Step 4 — Try to YAML-load the frontmatter.** Run `node -e "const y=require('js-yaml');const fs=require('fs');const t=fs.readFileSync('<file>','utf8');const fm=t.match(/^---\n([\s\S]*?)\n---/)[1];y.load(fm);"` — throws `YAMLException: duplicated mapping key (4:1)`.
- **Step 5 — Run any consumer.** `cleargate gate check <file>`, the lifecycle reconciler in close_sprint.mjs Step 2.6, or `cleargate wiki ingest` will fail to read the document's `status:` field and report misleading downstream errors.

## 3. Evidence & Context

### 3.1 Observed during SPRINT-19 close (2026-05-02)

After moving CR-022/CR-024/CR-025 from `pending-sync/` to `archive/` with `status: Done` set via sed, the lifecycle reconciler reported all three as `status=missing in archive, expected Done`. Manual `head` on each file confirmed `status: Done` was present. Direct `js-yaml` parse failed:

```
$ node -e "..."
CR-022_Gate_4_Close_Pipeline_Hardening PARSE ERROR: duplicated mapping key (4:1)
 1 | cr_id: CR-022
 2 | parent_ref: SDLC brainstorm char ...
 3 | pare
CR-024_QA_Context_Pack_And_Lane_Playbook PARSE ERROR: duplicated mapping key (4:1)
CR-025_Initiative_Rename_And_MCP_Pull_Flow PARSE ERROR: duplicated mapping key (4:1)
```

Frontmatter excerpt from CR-022 pre-fix:

```yaml
cr_id: CR-022
parent_ref: SDLC brainstorm charter §1.8 (Gate 4 expanded close pipeline) ...
parent_cleargate_id: "SDLC brainstorm charter §1.8 (Gate 4 expanded close pipeline) ..."
parent_cleargate_id: null   # ← duplicate inserted by hook
parent_cleargate_id: null   # ← second duplicate from a later edit
```

### 3.2 Remediation applied during SPRINT-19 close

Manual dedupe via `python3` re.match — keep first occurrence, drop subsequent. After dedupe, lifecycle reconciler reported `lifecycle: clean (3 artifacts reconciled)` and the close advanced. **The fix in this BUG should make the manual dedupe unnecessary going forward.**

### 3.3 Corpus impact estimate

`grep -c "^parent_cleargate_id:" .cleargate/delivery/**/*.md` will count duplicates across the corpus. Every file edited via Claude Code Edit/Write since the hook was wired (likely SPRINT-15+ era) is suspect. The fix should also include a one-time corpus dedupe pass.

## 4. Execution Sandbox (Suspected Blast Radius)

**SDR-corrected primary suspect (2026-05-02):** The bash hook `.claude/hooks/stamp-and-gate.sh` is a 32-line wrapper that shells to `cleargate stamp-tokens`, `cleargate gate check`, `cleargate wiki ingest` (verified by Read). The bash itself does NOT write `parent_cleargate_id`. The producer-side defect lives in the TypeScript command chain those subcommands invoke. Audit the TS handlers FIRST before touching the bash wrapper.

**Investigate / Modify:**
- **`cleargate-cli/src/commands/stamp-tokens.ts`** (live in `dist/cli.js` after build) + its `buildNewFrontmatter` helper — the frontmatter rebuild path. Trace whether the existing-keys-preservation loop (around line 325 — `if (k !== 'draft_tokens' && k !== 'stamp_error')`) accidentally appends `parent_cleargate_id` from a different code path or fails to dedupe when the input already has duplicates from a prior edit.
- **`cleargate-cli/src/commands/gate.ts` + `gate-check.ts` + `gate-run.ts`** — these are also invoked by the same hook chain. Audit any frontmatter-rewrite path (`stampFrontmatter`, `buildNewFrontmatter`, or equivalent serializer). One of these is appending `parent_cleargate_id: null` on each invocation.
- **`cleargate-cli/src/lib/stamp-frontmatter.ts`** + the YAML serializer it uses — the writer is the prime suspect for the unconditional append.
- **`.cleargate/scripts/backfill_hierarchy.mjs`** (verified writer of `parent_cleargate_id` per `grep -rln`) — one-shot batch script per its header comment, but verify it isn't being re-invoked from anywhere in the hook chain or by `cleargate gate run`.
- **`.claude/hooks/stamp-and-gate.sh` (live + canonical mirror)** — secondary suspect. Audit ONLY after the TS chain is cleared. The wrapper makes the hook idempotency a TS-handler concern, not a bash-hook concern.
- **One-time corpus dedupe script:** `.cleargate/scripts/dedupe_frontmatter.mjs` (NEW) — scans `.cleargate/delivery/**/*.md`, finds duplicate top-level YAML keys, keeps the first non-null value or the first occurrence, rewrites the file. Idempotent (re-run is no-op). Required regardless of where the producer-side fix lands — corpus is already polluted.

**Do NOT modify:**
- The `parseFrontmatter` consumer logic in `cleargate-cli/src/lib/frontmatter-yaml.ts` — strict YAML parsing is correct; the bug is the producer side.
- The PostToolUse hook's gate-check or ingest paths — only the stamp/serializer logic that writes the duplicate key.
- Wiki-page schema writers (`cleargate-cli/src/wiki/page-schema.ts`, `commands/wiki-ingest.ts`) — those write derivative wiki pages under `.cleargate/wiki/`, not raw work items under `.cleargate/delivery/`. Out of scope.

**Investigation order (M4 plan must follow):**
1. Repro per §2 — capture a `git diff` of one delivery file before/after a single Edit through Claude Code.
2. Bisect: run each of `cleargate stamp-tokens <file>`, `cleargate gate check <file>`, `cleargate wiki ingest <file>` individually against a clean fixture. The one that adds `parent_cleargate_id: null` on a clean file is the producer.
3. Fix in the TS handler identified by step 2; mirror to canonical if applicable.
4. Run dedupe corpus script.
5. Verify single-file regression test asserts hook idempotency across 3 sequential Edits.

## 5. Verification Protocol (The Failing Test)

**Before fix (expected to fail):**
```bash
# Pick any pending-sync file and edit it 3 times via Claude Code's Edit tool.
# Then:
grep -c "^parent_cleargate_id:" .cleargate/delivery/pending-sync/<file>
# Returns: 3 (or 4) — should be 1
```

**After fix (must pass):**
```bash
# Same setup — edit the file 3 times.
grep -c "^parent_cleargate_id:" .cleargate/delivery/pending-sync/<file>
# Returns: 1
```

**Regression test:** add a unit test under `cleargate-cli/test/hooks/` (or `.cleargate/scripts/test/`) that:
1. Creates a fixture file with one `parent_cleargate_id:` line.
2. Invokes the hook script three times.
3. Asserts exactly one `parent_cleargate_id:` line remains and YAML parses cleanly.

**Corpus dedupe verification:** after the one-time dedupe script runs:
```bash
for f in .cleargate/delivery/**/*.md; do
  count=$(grep -c "^parent_cleargate_id:" "$f")
  [ "$count" -le 1 ] || echo "FAIL: $f has $count parent_cleargate_id lines"
done
```
Returns no FAIL lines.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity**

All requirements concrete; reproduction deterministic; fix is a 2-surface edit (hook idempotency + corpus dedupe script).

Requirements to pass to Green:
- [x] `approved: true` set.
- [x] Reproduction protocol deterministic (≥3 listed steps).
- [x] Verification protocol cites a failing test that proves the bug + the fix.
- [x] Execution Sandbox restricts scope to hook + dedupe script (no consumer-side changes).
