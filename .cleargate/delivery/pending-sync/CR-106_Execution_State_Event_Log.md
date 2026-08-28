---
cr_id: CR-106
parent_ref: null
parent_cleargate_id: null
sprint_cleargate_id: "SPRINT-39"
carry_over: false
area: planning-layer
status: Draft
approved: true
context_source: verified codebase grounding (update_state.mjs:78-99 read-modify-write; state.schema.json; 27 non-test readers enumerated) + recorded direct approval in design conversation 2026-08-26
created_at: 2026-08-26T00:00:00Z
updated_at: 2026-08-25T20:50:14Z
created_at_version: cleargate@0.24.2
updated_at_version: dff83bd3-dirty
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
  last_gate_check: 2026-08-25T20:50:14Z
  transition: ready-to-apply
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
---

# CR-106: Execution state becomes an append-only event log with a derived fold

> **CITATION REPAIR (orchestrator, 2026-08-29).** The live `.claude/skills/sprint-execution/SKILL.md` had drifted from canonical (777 vs 787 lines) because STORY-054-03's Gate-4 re-sync never ran. Live was re-synced from canonical today and is now byte-identical. Canonical is purely additive over the old live file -- a 9-line `### 2.1 Spikes run before the loop` block after `:99` and one reference line after `:765` -- so every citation in this file below `:100` shifted by +9 and every one below `:766` by +10. Repaired here: `:252`->`:261`. Each target was re-read after the re-sync and confirmed to carry the quoted text.


## 0.5 Open Questions

> Populate during drafting. Resolve every entry before flipping ambiguity to 🟢.

- **Question:** Should the fold run inline on every append (synchronous rewrite of `state.json`) or lazily on read?
- **Recommended:** Inline on every append. Lazy folding reintroduces a read-side race and would force all 27 readers to learn about the log. Inline keeps the invariant "`state.json` is always current" that every existing reader already assumes.
- **Human decision:** Inline — recorded 2026-08-26.

- **Question:** Does the event log replace `token-ledger.jsonl`?
- **Recommended:** No. The ledger is hook-owned and records cost, not lifecycle. Two logs with distinct owners and distinct schemas; do not merge them.
- **Human decision:** No — recorded 2026-08-26.

- **Question:** What happens if the fold and a hand-edited `state.json` disagree?
- **Recommended:** The log wins and the fold overwrites, matching the CLAUDE.md doctrine that derived caches rebuild. `validate_state.mjs` gains a check that flags a `state.json` whose content differs from `fold(events)` so silent hand-edits surface rather than persist.
- **Human decision:** Log wins, drift is flagged — recorded 2026-08-26.

## 1. The Context Override (Old vs. New)

**Obsolete Logic (What to Remove / Forget):**

- **Forget that `state.json` is a document that writers mutate.** Today `update_state.mjs` performs an unguarded read-modify-write of the whole file: it parses `state.json` (`:99`), mutates one story's record, and rewrites the entire document via tmp+rename (`:78-79`). The tmp+rename gives atomicity of the *write* — no torn file — but provides no lost-update protection. Two concurrent invocations interleave as: A reads → B reads → A writes → B writes over A's snapshot. **A's transition is silently lost.** This is a live defect today whenever two segments in the same wave transition simultaneously; it is not hypothetical, merely narrow.
- **Forget that the race is fixable with a lock.** A lockfile serializes access to a sharing that should not exist. Every field under `stories.<ID>` is owned by exactly one writer — that story's segment. There is no cross-story field. The only global keys, `last_action` and `updated_at`, are derivable (last event, max timestamp). The contention is an artifact of file layout, not of the domain.

**New Logic (The New Truth):**

- **`events.jsonl` is the truth. `state.json` is a fold over it.** Every lifecycle transition becomes one appended JSON line: `{ts, sprint_id, story_id, from, to, actor, run_id, wave, reason}`. POSIX `O_APPEND` writes below `PIPE_BUF` (4096 bytes) are atomic, so concurrent appends cannot interleave and contention goes to zero regardless of wave width.
- **`state.json` keeps its exact current schema and path.** After each append the folder rewrites it. It gains exactly one writer — the folder — and folds are idempotent, so the lost-update race is structurally impossible rather than merely unlikely. **No reader changes.** All 27 non-test consumers keep working untouched.
- **This finishes a pattern ClearGate already uses everywhere else.** `token-ledger.jsonl` is append-only JSONL, hook-owned, with an explicit "never edit by hand" rule (CLAUDE.md). `wiki/log.md` is an append-only YAML event stream. The CLAUDE.md doctrine already reads *"Wiki, memory, and `context_source` are derived caches… the code wins; the cache rebuilds."* `state.json` is the last machine-written surface still modelled as a mutable document.
- **Idempotency stops being a prose obligation.** `SKILL.md:261` currently *asks* segments to be idempotent as a "belt-and-suspenders safety net" for `resumeFromRunId`. With events keyed by `run_id`, a replayed GREEN segment appends a duplicate that the fold discards. The guarantee moves out of prose and into the data model.

## 2. Blast Radius & Invalidation

- [ ] Invalidate/Update: **none.** `state.json`'s schema, path, and semantics are unchanged by design — this CR adds a producer behind it, it does not alter the contract any consumer sees.
- [ ] Database schema impacts? **No.** No Postgres involvement; this is filesystem state under `.cleargate/sprint-runs/<id>/`.
- [ ] **Hard predecessor: [[BUG-044]]** — closes the lost-update race with a lockfile and ships the regression test this CR must keep green. Merges before this CR inside M4.
- [ ] **Forward dependency:** EPIC-055 (parallel wave scheduling) is blocked on this CR. Widening concurrency across waves multiplies the lost-update window; the log must land first.
- [ ] **`validate_state.mjs` gains a check** (fold-vs-file drift). This is additive — it cannot fail a tree that has no `events.jsonl` yet.
- [ ] **`init_sprint.mjs` must seed `events.jsonl`** alongside `state.json`, and must remain correct for sprints that predate the log.
- [ ] **Backward compatibility:** a sprint directory with `state.json` and no `events.jsonl` must keep working read-only (closed sprints: SPRINT-03 … SPRINT-38 all have `state.json` and no log). The folder synthesises a genesis event set from the existing `state.json` on first append, or the sprint is treated as legacy-immutable. Chosen: **legacy-immutable** — never rewrite a closed sprint's state.

## Existing Surfaces

> L1 reuse audit. List source-tree implementations this CR extends or modifies. Cite file:line.

- **Surface:** `.cleargate/scripts/update_state.mjs:78-79` — `atomicWrite()`; tmp+rename of the whole document. Prevents torn files, not lost updates. This CR keeps the function and moves it behind the folder.
- **Surface:** `.cleargate/scripts/update_state.mjs:99` — `JSON.parse(fs.readFileSync(stateFile))`; the read half of the unguarded read-modify-write. Replaced by an append.
- **Surface:** `.cleargate/scripts/state.schema.json` — the `state.json` shape contract. Unchanged by this CR; it becomes the fold's output contract.
- **Surface:** `.cleargate/scripts/validate_state.mjs` — existing shape validator. Extended with a fold-vs-file drift check.
- **Surface:** `.cleargate/scripts/_migrate-schema-v3.mjs:1-20` — established precedent for a versioned, idempotent, tmp+rename state migrator with a strip-on-read contract. The genesis/legacy handling reuses this shape rather than inventing one.
- **Surface:** `.claude/hooks/token-ledger.sh` + `.cleargate/sprint-runs/<id>/token-ledger.jsonl` — the existing append-only JSONL event surface in the very same directory. This CR mirrors its idiom (append-only, single owner, never hand-edited).
- **Why this CR extends rather than rebuilds:** The output contract (`state.json`, `state.schema.json`) and every one of its 27 non-test consumers stay exactly as they are. What changes is only the *producer* — a write path that today reconstructs the whole document from a stale read becomes an append plus a deterministic fold. `atomicWrite`, the schema, the migrator idiom, and the JSONL convention are all existing surfaces being composed, not replaced. A rebuild would mean changing the read contract, which is precisely what makes this cheap to adopt and what this CR deliberately avoids.

## Task Breakdown

> Rows authored by the M4 Architect in `.cleargate/sprint-runs/SPRINT-39/plans/M4.md`
> and committed into this item by the orchestrator on 2026-08-29 (M4 OD-5), before any
> worktree was cut. Execution order.

- [ ] Confirm BUG-044 is merged and node --test .cleargate/scripts/state-scripts.test.mjs is 12/12/0
- [ ] Create .cleargate/scripts/state-events.mjs: appendEvent(), fold(), EVENT_SCHEMA; fold() takes ONLY the event array
- [ ] QA-Red: author E2-E9; confirm the red set by MEASUREMENT, not prediction
- [ ] Rewrite update_state.mjs write path to appendEvent + fold; route :116 and :122 migration writes through it
- [ ] Extend validate_state.mjs with the fold-vs-file drift check (additive; must not fail a tree with no events.jsonl)
- [ ] Seed events.jsonl in init_sprint.mjs; collapse the duplicated tmp+rename idiom at :231-233
- [ ] Mirror all four scripts into cleargate-planning/ byte-identically, same commit
- [ ] Run both eviction greps; run node --test; record pass/fail/skipped verbatim
- [ ] Re-measure every line citation in the item and in this plan that points into a file this commit edited (N7)

## Prior work

> Duplicate-check evidence, enforced by the `prior-work-recorded` readiness predicate.

- `cleargate wiki query "execution state json concurrency event log append only"` → **none found**. Second query `"state.json lost update race"` → **none found**.
- Residual greps: `.cleargate/delivery/archive/` returns items that *read* state.json (`CR-078`, `BUG-002`, `EPIC-014`, `STORY-025-02`) but none that touch its write model or concurrency.
- `.cleargate/FLASHCARD.md` has two adjacent cards — line 22 (`HOOK_LOG` is append-only and never rotated; scope log-derived fallbacks by session id) and line 82 (`init_sprint.mjs` no longer writes `execution_mode` into state.json) — neither covers the write race. Card 22 is a **direct design input**: it is the known failure mode of an unscoped append-only log, and this CR's log is scoped by `sprint_id` per line for exactly that reason.
- Related but distinct: [[BUG-034]] (flashcard-gate restore not exception-safe) and [[BUG-033]] (collision surface fail-open) are the two prior concurrency-adjacent defects in the wave machinery; both are fixed and neither touches state.json.

## 3. Execution Sandbox

**Modify:**
- `.cleargate/scripts/update_state.mjs` — write path becomes `appendEvent()` + `fold()`; `atomicWrite` retained for the fold's output.
- `.cleargate/scripts/validate_state.mjs` — add fold-vs-file drift check.
- `.cleargate/scripts/init_sprint.mjs` — seed `events.jsonl` at sprint init.
- `.cleargate/scripts/state-scripts.test.mjs` — concurrency regression test (see §4).
- `cleargate-planning/.cleargate/scripts/update_state.mjs` — canonical mirror.
- `cleargate-planning/.cleargate/scripts/validate_state.mjs` — canonical mirror.
- `cleargate-planning/.cleargate/scripts/init_sprint.mjs` — canonical mirror.

**Create:**
- `.cleargate/scripts/state-events.mjs` — `appendEvent()`, `fold()`, `EVENT_SCHEMA`; the only module that writes `state.json`.
- `cleargate-planning/.cleargate/scripts/state-events.mjs` — canonical mirror.

**Do NOT modify:** any of the 27 non-test `state.json` readers. If a reader needs changing, the fold is wrong.

## 4. Verification Protocol

**Command/Test:** `node --test .cleargate/scripts/state-scripts.test.mjs`

New cases, all required:

1. **Lost-update regression — inherited from [[BUG-044]], not authored here.** BUG-044 lands first inside M4 and ships the Red-first 20-way concurrency test plus a lockfile that closes the race. This CR must keep that exact test green **after** the lock is removed and replaced by the single-writer fold. Do not delete or weaken it; it is the property that survives the architecture change. (Same shape as [[BUG-042]] → [[STORY-054-05]] in M0.)
2. **Fold determinism.** `fold(events)` twice over the same log yields byte-identical output.
3. **Replay idempotency.** Appending a duplicate event with an already-seen `run_id` leaves the fold unchanged.
4. **Schema conformance.** The fold's output validates against `state.schema.json` unchanged.
5. **Legacy sprint immutability.** A sprint dir with `state.json` and no `events.jsonl` is not rewritten and does not throw.
6. **Atomic append.** Concurrent appends produce no interleaved or truncated lines; every line parses as JSON.

**Eviction check:** `command grep -n "readFileSync.*stateFile" .cleargate/scripts/update_state.mjs` returns nothing — the read-modify-write is gone, not merely guarded.

**Parity check:** `diff .cleargate/scripts/state-events.mjs cleargate-planning/.cleargate/scripts/state-events.mjs` is empty (dogfood-split rule, CLAUDE.md).

---

## Context Source

**context_source:** Verified codebase grounding — `update_state.mjs:78-99` read-modify-write confirmed by direct read; `state.json` per-story field ownership confirmed against `.cleargate/sprint-runs/SPRINT-38/state.json`; 27 non-test readers enumerated by grep. Direct approval recorded in the design conversation of 2026-08-26, in which the append-only-plus-fold shape and the "no reader migration" adoption path were both proposed and accepted.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Ready for Execution**

*Evaluate each criterion against its literal text.*

Requirements to pass to Green (Ready for Execution):
- [x] "Obsolete Logic" to be evicted is explicitly declared.
- [x] All impacted downstream Epics/Stories are identified and reverted to 🔴 High Ambiguity. — none exist; EPIC-055 is drafted downstream of this CR and already records the dependency.
- [x] Execution Sandbox contains exact file paths.
- [x] Verification command is provided.
- [x] `approved: true` is set in the YAML frontmatter.
- [x] Existing Surfaces cites at least one source-tree path the CR extends.

> **Gate 1 sign-off: approved 2026-08-26** by sandrinio, in the design conversation that produced this CR.
