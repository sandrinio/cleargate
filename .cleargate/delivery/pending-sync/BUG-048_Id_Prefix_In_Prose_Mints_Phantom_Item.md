---
bug_id: BUG-048
parent_ref: null
parent_cleargate_id: null
sprint_cleargate_id: null
carry_over: false
area: planning-layer
status: Triaged
severity: P2-Medium
reporter: sandrinio
approved: true
context_source: verified empirically during SPRINT-39 preflight 2026-08-25 — assert_story_files.mjs --emit-json returned a bare STORY-054 alongside the seven real STORY-054-NN ids; source traced to extractWorkItemIds (.cleargate/scripts/lib/work-item-id.mjs:32-42)
created_at: 2026-08-25T21:33:19Z
updated_at: 2026-08-25T21:33:19Z
created_at_version: cleargate@0.24.2
updated_at_version: cleargate@0.24.2
server_pushed_at_version: null
draft_tokens:
  input: null
  output: null
  cache_read: null
  cache_creation: null
  model: null
  sessions: []
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-08-25T21:33:19Z
  transition: ready-for-fix
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
---

# BUG-048: An ID prefix written in prose mints a phantom work item that blocks preflight

### Open Questions

- **Question:** Reject a match followed by `-` / `*`, or require the id to be delimited?
- **Recommended:** Reject when the character following the match is `-` or `*`. A trailing hyphen means the text named a **prefix**, not an id; a trailing `*` means a glob. Both are prose conventions the extractor should decline rather than truncate. Do NOT add a general trailing `\b` — [[BUG-041]]'s comment at `work-item-id.mjs:33-34` records that a trailing boundary is exactly what made `BUG-2026-08-24` vanish.
- **Human decision:** Unresolved — replace this entire line with the human's decision.

## 1. The Anomaly (Expected vs. Actual)

**Expected:** `extractWorkItemIds` returns the work items a document references. A sentence describing a filename *prefix* (`STORY-054-`) or a *glob* (`STORY-054-*`) names no work item and should yield none.

**Actual:** the regex matches the id-shaped leading portion and emits a bare `STORY-054`. That phantom flows into `cleargate sprint preflight` Check 5, which cannot find a file for it and hard-blocks the sprint with `STORY-054 (file not found)`.

The message is actively misleading: it names an item that does not exist, was never planned, and cannot be created — while the seven real `STORY-054-NN` items are all present and passing.

**Why P2 rather than P1:** the failure is loud and the sprint plan is human-editable, so a rewrite unblocks it. But the diagnosis is genuinely hard — the operator is told a work item is missing when the real problem is a sentence describing a naming convention.

**Generality:** any sprint plan, epic, or protocol doc that mentions an ID prefix or glob in prose reproduces it. Describing naming conventions in planning documents is normal practice, and ClearGate's own templates encourage it.

## 2. Reproduction Protocol

1. In any sprint plan under `pending-sync/`, add a sentence containing an ID prefix in backticks, e.g. ``matches on filename prefix \`STORY-054-\``` or ``all \`STORY-054-*\` files``.
2. `node .cleargate/scripts/assert_story_files.mjs <sprint-file> --emit-json`
   **Observed:** `workItemIds` contains a bare `STORY-054` in addition to the real `STORY-054-NN` entries.
   **Expected:** only the real ids.
3. `node cleargate-cli/dist/cli.js sprint preflight <sprint-id>`
   **Observed:** `✗ Per-item readiness gates` listing `STORY-054 (file not found)`; preflight fails.

**Edge conditions the fix must handle:**
- Date-form ids (`BUG-2026-08-24`) must keep resolving whole — a trailing `\b` regression is explicitly forbidden (`work-item-id.mjs:33-34`).
- A legitimate id immediately followed by a hyphenated English word (`CR-105-style approach`) — currently matches `CR-105`; decide whether that stays.
- A real id at end-of-line or followed by punctuation must still match.
- Multi-segment ids (`STORY-047-02a`) must not regress to the aliasing failure recorded in FLASHCARD 2026-08-24.

## 3. Evidence & Context

Observed live during SPRINT-39 preflight, 2026-08-25:

```
$ node .cleargate/scripts/assert_story_files.mjs SPRINT-39_....md --emit-json
18 ids:
   BUG-042  STORY-054-05  STORY-054-01 ... CR-108
   STORY-054          <-- phantom
   EPIC-054
```

```
✗ Per-item readiness gates: 12/19 items not ready
   - STORY-054 (file not found)
```

Source (`.cleargate/scripts/lib/work-item-id.mjs:32-42`):

```js
export function extractWorkItemIds(text) {
  // No trailing \b: the package pattern had one after \d{3}, so `BUG-2026-08-24` consumed
  // `BUG-202`, failed the boundary on the following `6`, and vanished entirely.
  const re = new RegExp(String.raw`\b(?:${PREFIX_ALT})-(?:${BODY_ALT})`, 'g');
```

The comment shows the trailing-boundary trade-off was considered for the *date-form* case and resolved by removing the boundary entirely — which leaves the prefix/glob case unhandled. The two cases need different treatment, not one global switch.

The triggering prose was ``matches on filename prefix \`STORY-054-\``` and ``All seven \`STORY-054-*\` files exist`` in SPRINT-39 §1.

**Workaround applied to unblock SPRINT-39:** the three offending sentences were reworded to avoid the bare prefix token. The document's meaning is unchanged; the parser's input is.

## 3.5 Second instance — prose sprint mention mis-attributes an item's owning sprint

Found 2026-08-27 during SPRINT-39 M0. **Different file, different mechanism, same class:** an ID written in prose is read as a structural declaration.

`.cleargate/scripts/backfill_hierarchy.mjs:120` populates a missing `sprint_cleargate_id` with a last-resort fallback — `SPRINT_REGEX = /\bSPRINT-(\d+)\b/` (`:92`) matched against the **first 50 body lines**. Any item whose body happens to mention a sprint early gets attributed to it.

> **Corrected 2026-08-27 (architect post-flight).** An earlier draft of this section said the `PostToolUse` stamp hook runs the backfill. **It does not.** `.claude/settings.json` wires `PostToolUse` to `stamp-and-gate.sh`, which runs `stamp-tokens` → `gate check` → ingest and never invokes this script; a repo-wide grep for the name returns only the script's own header and its tests. It is a **manual one-shot** over flat `pending-sync/` + `archive/`. The mechanism and blast radius below are unchanged — but the defect fires in corpus-wide **batches** when someone runs it, not per-Write.

Observed on three in-flight SPRINT-39 items, each from an ordinary prose sentence:

| Item | Attributed to | Source line |
|---|---|---|
| `BUG-044` | `SPRINT-38` | body line 43 — a repro step naming an example path under `.cleargate/sprint-runs/SPRINT-38/` |
| `CR-106` | `SPRINT-03` | body line 42 — a backward-compatibility note |
| `CR-111` | `SPRINT-01` | body line 48 — a `**Surface:**` citation |

Seven items **not** in SPRINT-39 (`BUG-047`, `BUG-048`, `BUG-049`, `BUG-050`, `CR-109`, `EPIC-055`, `EPIC-057`) were symmetrically mis-tagged **into** it for the same reason. All 19 were corrected by hand on 2026-08-27; the backfill is idempotent once the key is non-null (`:266-272`), so the corrections hold.

**Why this is worse than the phantom-id case:** it fails *silently*. BUG-048's phantom hard-blocks preflight with a visible error. This writes a plausible-looking wrong value into frontmatter that then propagates — `cleargate push` forwards it to the remote, `wiki ingest` copies it into the compiled page, and `close_sprint.mjs` lifecycle reconciliation reads it. Nothing surfaces the error.

**Distinct fix recommendation.** BUG-048's fix refines a regex; this one should **delete the fallback**. A sprint is a scheduling fact that belongs in `state.json`, the sprint plan's deliverables table, or explicit frontmatter — never inferred from prose. Sniffing `fm.sprint_id` / `fm.sprint` / a `SPRINT-`-shaped `parent_epic_ref` (`:107-113`) is sound and should stay; the body-regex fallback at `:118-121` should be removed and the key left `null` for a human or `cleargate sprint init` to set. If the fallback is kept instead, it must at minimum be scoped to frontmatter and skip fenced/quoted prose — the same discipline [[BUG-041]] applied to id grammars.

**Ambiguity note.** Whether to fold this into BUG-048's fix or split it into its own item is an open call for the human — the two share a root cause but no code. Recorded here rather than filed separately to avoid adding another unscheduled item.

## 4. Execution Sandbox (Suspected Blast Radius)

**Investigate / modify:**
- `.cleargate/scripts/lib/work-item-id.mjs` — `extractWorkItemIds`.
- `cleargate-planning/.cleargate/scripts/lib/work-item-id.mjs` — canonical mirror.
- The duplicated TS grammar under `cleargate-cli/src/lib/` — must move together (the [[BUG-041]] shared-corpus rule).
- `.cleargate/scripts/test/test_assert_story_files.sh` — regression test.

**Do NOT modify:** `matchesId`, `normaliseId`, or the file-resolution path — the defect is in extraction only.

**Blast radius:** `extractWorkItemIds` feeds preflight scope, the lifecycle reconciler, and wiki cross-referencing. Over-tightening silently drops real ids from all three, which fails *closed and quiet* — strictly worse than the current loud failure. The shared-corpus test is the guard.

## 5. Verification Protocol (The Failing Test)

**Command:** `bash .cleargate/scripts/test/test_assert_story_files.sh`

1. **The failing test.** Text containing `\`STORY-054-\`` and `\`STORY-054-*\`` yields **no** bare `STORY-054`. **Must fail against the current tree.**
2. `BUG-2026-08-24` still extracts whole (BUG-041 regression guard).
3. `STORY-047-02a` still extracts whole — no aliasing to `STORY-047-02`.
4. Real ids followed by punctuation, end-of-line, or whitespace still extract.
5. **Shared-corpus parity** (BUG-041 flashcard rule): the `.mjs` and TS grammars are run over one corpus and must agree on every entry.

## Prior work

- [[BUG-041]] — *one ID grammar*, shipped in cleargate 0.24.1. Same module, same function, adjacent case: 041 fixed divergence *between* grammars, this fixes what the unified grammar over-matches. The `work-item-id.mjs:33-34` comment is 041's own record of the trade-off that left this open.
- `.cleargate/FLASHCARD.md` 2026-08-24 (`#id-parsing #danger`) — *"Greedy `STORY-\d+-\d+` ALIASES … Reject unmodelled shapes loudly; never alias."* This is that rule applied to a prefix rather than a suffix.
- `.cleargate/FLASHCARD.md` 2026-08-24 (`#id-parsing #dogfood`) — the shared-corpus pin, reused as §5 case 5.
- [[BUG-046]] — also a fail-open in a path-derived predicate; different module.

## Context Source

**context_source:** Reproduced live during SPRINT-39 preflight on 2026-08-25 by running `assert_story_files.mjs --emit-json` directly and tracing the phantom to `extractWorkItemIds`.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟡 Medium Ambiguity**

Requirements to pass to Green (Ready for Fix):
- [x] Reproduction steps are 100% deterministic.
- [x] Actual vs. Expected behavior is explicitly defined.
- [x] Raw error logs/evidence are attached.
- [x] Verification command (failing test) is provided.
- [x] `approved: true` is set in the YAML frontmatter.

> 🟡: the §Open Questions regex-shape decision is unresolved. Over-tightening fails closed and quiet, so the remedy needs a deliberate choice.
