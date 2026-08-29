---
bug_id: BUG-045
parent_ref: null
parent_cleargate_id: null
sprint_cleargate_id: "SPRINT-39"
carry_over: false
area: planning-layer
status: Triaged
severity: P2-Medium
reporter: sandrinio
approved: true
context_source: verified codebase grounding — hotfix.ts:164-166 read directly; ClearGate protocol mandates pending-sync -> archive on push; discovered while scoping CR-108 on 2026-08-26 and approved in the same conversation
created_at: 2026-08-26T00:00:00Z
updated_at: 2026-08-25T20:56:18Z
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
  last_gate_check: 2026-08-25T20:56:18Z
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

# BUG-045: `hotfix new` ID allocation scans only `pending-sync/`, so archived IDs get reused

### Open Questions

- **Question:** Fix only `hotfix`, or fix the allocator generally?
- **Recommended:** Fix `hotfix` here — it is the only caller today. [[CR-108]] then generalizes the *corrected* allocator to all types. Generalizing first would propagate the defect to nine types before fixing it.
- **Human decision:** Fix hotfix first, CR-108 generalizes after — recorded 2026-08-26.

- **Question:** Should the fix also handle the ID-collision case between two concurrent invocations?
- **Recommended:** No. That is a distinct defect (no locking around allocate-then-create) and is scoped into [[CR-108]] §4 case 5, which needs the lockfile anyway for the multi-type allocator. Keep this bug to the scan-coverage defect.
- **Human decision:** Scope to scan coverage only — recorded 2026-08-26.

## 1. The Anomaly (Expected vs. Actual)

**Expected:** `cleargate hotfix new` allocates an ID strictly greater than every HOTFIX id that has ever existed in the repo.

**Actual:** It allocates an ID strictly greater than every HOTFIX id currently sitting in `pending-sync/`. Items that have moved to `archive/` are invisible to the scan, so their IDs are reissued.

```ts
const maxId = maxHotfixId(pendingDir);   // hotfix.ts:164 — pendingDir only
const nextId = maxId + 1;                // :165
const idStr = `HOTFIX-${String(nextId).padStart(3, '0')}`;  // :166
```

**Why this fires in normal use rather than as an edge case:** the ClearGate protocol *mandates* the move. CLAUDE.md: *"After `cleargate_push_item` returns a Remote ID, update the frontmatter AND move the file to `.cleargate/delivery/archive/`."* So the steady state is that completed items are archived and `pending-sync/` is comparatively empty. The scan is looking in the one directory the protocol drains.

**Worst case:** `pending-sync/` contains no HOTFIX items at all (all archived). `maxHotfixId` returns 0, the next allocation is `HOTFIX-001`, and it collides with the oldest archived hotfix. Two distinct work items then share an id — across the wiki, the ledger, git history, and any pushed remote id.

## 2. Reproduction Protocol

Deterministic, no timing dependency:

1. In a scratch repo with ClearGate scaffolding, run `cleargate hotfix new "first"` → produces `HOTFIX-001` in `pending-sync/`.
2. `mv .cleargate/delivery/pending-sync/HOTFIX-001*.md .cleargate/delivery/archive/` — exactly what the protocol prescribes after push.
3. Run `cleargate hotfix new "second"`.

**Observed:** `HOTFIX-001` again — a duplicate id.
**Expected:** `HOTFIX-002`.

**Edge conditions the fix must also satisfy:**
- `archive/` absent entirely (fresh install) → must not throw; treat as empty.
- Ids present in **both** directories → max across the union, not per-directory.
- Non-conforming filenames in either directory (e.g. `HOTFIX-notes.md`) → ignored, not parsed as id 0 or NaN.
- Zero-padding preserved: after `HOTFIX-009` the next is `HOTFIX-010`, not `HOTFIX-10`.

## 3. Evidence & Context

Verbatim from `cleargate-cli/src/commands/hotfix.ts`:

```ts
  const maxId = maxHotfixId(pendingDir);
  const nextId = maxId + 1;
  const idStr = `HOTFIX-${String(nextId).padStart(3, '0')}`;
```

`pendingDir` is the sole argument. No archive path is resolved anywhere in the allocation path.

Corroborating protocol text (CLAUDE.md, *Drafting work items*): *"After `cleargate_push_item` returns a Remote ID, update the frontmatter AND move the file to `.cleargate/delivery/archive/` — these two happen atomically, never one without the other."*

**Severity rationale — P2 not P1:** the failure is loud once it happens (two files claiming one id is visible in the wiki and in `ls`), and `hotfix` is a low-traffic command, so real-world exposure to date is likely nil. It is filed now because [[CR-108]] is about to generalize this exact allocator to all nine work-item types, where the same defect would become high-traffic.

## 4. Execution Sandbox (Suspected Blast Radius)

**§ AMENDMENT (orchestrator, 2026-08-29, per TPV T9(b) and M4 §Q5-C): `cleargate-cli/CHANGELOG.md`
is a required surface and was undeclared.** It is read by users *and* printed by `cleargate
upgrade`, so it is the only user-facing carrier this fix has. Add a `### Fixed` subsection above
`### Changed` under the existing `## Unreleased` heading (`CHANGELOG.md:6`, which currently has
no `### Fixed`). **Do NOT bump `package.json`** — `test/changelog-format.node.test.ts:140-149`
pins the topmost `## [X.Y.Z]` heading to `0.24.2`, and the version bump is a Gate-4 release step.

**Investigate / modify:**
- `cleargate-cli/src/commands/hotfix.ts` — `maxHotfixId` call site and, if the helper is local to this file, the helper itself.
- `cleargate-cli/test/` — new regression test (see §5).

**Do NOT modify:** the template renderer, `stamp-frontmatter.ts`, or the work-item type registry. Those are [[CR-108]]'s surface; this bug is confined to the id scan.

**Blast radius:** small and contained — one command, one allocation call. The forward risk is the reason for urgency, not the current risk: [[CR-108]] lifts this allocator to all nine types in the same sprint.

## 5. Verification Protocol (The Failing Test)

**Command:** `npm --prefix cleargate-cli test`

1. **The failing test.** `HOTFIX-001` in `archive/`, `pending-sync/` empty → next allocation is `HOTFIX-002`. **Must fail against the current tree.**
2. Ids split across both directories. **§ AMENDMENT (orchestrator, 2026-08-29, per TPV
   `TPV RULING — BUG-045` T9(a)). The original fixture is DECORATIVE — it does not
   discriminate.** Measured against `e4cb49f`: `001` archived / `002` pending → `003` is
   **GREEN at baseline**, because `pendingDir`'s own archive-blind max is already `2`, so a
   completely unfixed implementation passes it. The archive must hold the **higher** id for
   the case to be diagnostic — QA-Red re-derived it that way as R2, measured red, and it is
   the sole killer of the scan-the-wrong-set mutant. **§2's Reproduction Protocol is NOT
   affected and must not be edited** — TPV measured it diagnostic (create → `mv` to archive →
   create is red at baseline) and ruled it in as R15.
3. `archive/` missing → no throw, allocation proceeds from `pending-sync/` alone.
4. Malformed filenames in either directory are ignored.
5. Zero-padding: `HOTFIX-009` present → next is `HOTFIX-010`.
6. Existing `hotfix new` behaviour with a populated `pending-sync/` is unchanged (regression guard).

**§ AMENDMENT (orchestrator, 2026-08-29, per TPV T9(c)) — collision-freedom is NOT a sufficient
acceptance criterion, and this is the finding that would otherwise have shipped a wrong fix.**
TPV built a mutant that drops the `classifyType(id) === 'HOTFIX'` filter while widening the
helper. It passes every case above **and** this item's own real-tree collision argument: on
this repo it allocates `HOTFIX-115`, because it tracks the CR/EPIC/STORY numbering and
therefore collides with nothing. A fix is accepted only if the type filter demonstrably
survives — see R14, which is the only case that kills it.

**Hand-off to [[CR-108]]:** these cases are the acceptance floor for the generalized allocator. CR-108 §4 case 4 re-runs the same scenario parameterized across every registered type.

## Task Breakdown

> Rows authored by the M4 Architect in `.cleargate/sprint-runs/SPRINT-39/plans/M4.md`
> and committed into this item by the orchestrator on 2026-08-29 (M4 OD-5), before any
> worktree was cut. Execution order.

- [ ] Branch story/BUG-045 from cleargate-cli main @ e4cb49f (main checkout, NOT a worktree)
- [ ] QA-Red: author test/commands/hotfix-id-archive-scan.red.node.test.ts with R1-R7; confirm R1,R2,R6 red against e4cb49f
- [ ] Widen maxHotfixId to accept N dirs; call maxHotfixId(pendingDir, archiveDir) at hotfix.ts:164; no new regex, no mtime filter
- [ ] Confirm countActiveHotfixes is byte-unchanged (R7)
- [ ] Add one bullet to cleargate-cli/CHANGELOG.md under the existing ## Unreleased
- [ ] Run npm --prefix cleargate-cli run typecheck and the full suite; record both numbers (Rule 6)
- [ ] Verify grep -rn "maxHotfixId" cleargate-cli/src still returns exactly two hits

## Prior work

- `cleargate wiki query "work item id allocation archive scan"` → **none found**.
- [[BUG-041]] — *one ID grammar*; shipped in cleargate 0.24.1. Same family (duplicated/divergent id handling) but that bug was about parsing grammar divergence, this one about scan coverage. The accompanying flashcard (*"pin duplicated grammars with a shared-corpus test"*, 2026-08-24) prescribes the shared-corpus shape [[CR-108]] uses.
- [[CR-108]] — generalizes this allocator to all work-item types. Hard successor; this bug must land first.
- SPRINT-39 §2.5 already flags the same divergence class for `STORY-054-04`'s four hardcoded bucket lists.

## Context Source

**context_source:** Verified codebase grounding — `hotfix.ts:164-166` read directly on 2026-08-26 while scoping [[CR-108]]; the archive-move mandate quoted verbatim from CLAUDE.md. Direct approval recorded in the same conversation.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Ready for Fix**

Requirements to pass to Green (Ready for Fix):
- [x] Reproduction steps are 100% deterministic.
- [x] Actual vs. Expected behavior is explicitly defined.
- [x] Raw error logs/evidence are attached.
- [x] Verification command (failing test) is provided.
- [x] `approved: true` is set in the YAML frontmatter.
