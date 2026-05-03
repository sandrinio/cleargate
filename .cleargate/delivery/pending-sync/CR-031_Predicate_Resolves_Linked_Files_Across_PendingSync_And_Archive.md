---
cr_id: CR-031
parent_ref: EPIC-008
parent_cleargate_id: EPIC-008
sprint_cleargate_id: "SPRINT-21"
carry_over: false
status: Ready
approved: true
approved_at: 2026-05-03T20:00:00Z
approved_by: sandrinio
created_at: 2026-05-03T00:00:00Z
updated_at: 2026-05-03T00:00:00Z
created_at_version: cleargate@0.10.0
updated_at_version: cleargate@0.10.0
server_pushed_at_version: null
context_source: |
  Live evidence 2026-05-03 — same end-to-end install test in
  /Users/ssuladze/Documents/Dev/markdown_file_renderer. After Initiative was
  triaged and moved to `.cleargate/delivery/archive/INITIATIVE-001_*.md`, the
  spawned EPIC-001 declared `context_source: INITIATIVE-001_markdown_reviewer_component.md`
  (bare filename, no path prefix). Gate check failed:

    ❌ proposal-approved: linked file not found:
       INITIATIVE-001_markdown_reviewer_component.md

  Root cause: `cleargate-cli/src/lib/readiness-predicates.ts:274-290`
  `resolveLinkedPath()` tries exactly two candidates:
    1. path.resolve(path.dirname(docAbsPath), ref)  → pending-sync/<ref>
    2. path.resolve(projectRoot, ref)               → <root>/<ref>
  Neither traverses sibling delivery directories. When an Epic in pending-sync
  references an Initiative that has been correctly moved to archive (Initiative
  triage protocol explicitly mandates the move), the linked-file lookup fails.

  Same failure shape applies to:
    - Story citing a CR that has already been applied + archived.
    - Bug citing a CR that fixes it.
    - Any cross-reference where the source artifact has been pulled into archive
      while the citer remains in pending-sync.
  Initiative is the most visible case because EVERY Initiative spawn produces
  this pattern by design.
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-05-03T19:04:50Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id CR-031
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-05-03T17:46:02Z
  sessions: []
---

# CR-031: Predicate `resolveLinkedPath` Searches Both `pending-sync/` and `archive/`

## 0.5 Open Questions

- **Question:** Resolution order when an ID exists in both directories (race during a move)?
  - **Recommended:** prefer `pending-sync/` (the live, mutable copy). `archive/` is fallback. Ties are impossible in practice — the move is atomic — but specify the order for determinism.
  - **Human decision:** ✅ accepted as Recommended (batch 2026-05-03 — orchestrator + sandrinio compounding-order sweep)

- **Question:** Should the `context_source` field carry the directory prefix (`archive/INITIATIVE-001_*.md`) instead of bare filename?
  - **Recommended:** no. The whole point of the `context_source` field is *what* the source is, not *where* it lives. Lifecycle moves the file; the citation should not need rewriting on every move. Predicate-side fallback is the right layer.
  - **Human decision:** ✅ accepted as Recommended (batch 2026-05-03 — orchestrator + sandrinio compounding-order sweep)

- **Question:** Sprint inclusion?
  - **Recommended:** pair with CR-030 (same dogfood test, same surface, same minute spent in editor). One commit can carry both if Architect SDR groups them.
  - **Human decision:** ✅ SPRINT-21 (confirmed 2026-05-03). W1 batch dispatch alongside BUG-026 + CR-035 + CR-037; CR-030 itself is W3.

## 1. The Context Override (Old vs. New)

**Obsolete Logic (What to Remove / Forget):**

- `cleargate-cli/src/lib/readiness-predicates.ts:274-290` — `resolveLinkedPath()` candidate list:
  ```ts
  const candidates = [
    path.resolve(path.dirname(docAbsPath), ref),
    path.resolve(projectRoot, ref),
  ];
  ```
  Misses the sibling delivery directory case entirely.
- The implicit assumption that all live work-item cross-references stay in `pending-sync/`. Triage / sprint close / lifecycle reconciler all move files to `archive/`; a citation written before the move stays valid as text but breaks at predicate time.

**New Logic (The New Truth):**

`resolveLinkedPath()` gains a sibling-delivery fallback. New candidate list:

```ts
const candidates = [
  path.resolve(path.dirname(docAbsPath), ref),                          // 1. relative to citer
  path.resolve(projectRoot, ref),                                       // 2. project root
  path.resolve(projectRoot, '.cleargate', 'delivery', 'pending-sync', ref),  // 3. live
  path.resolve(projectRoot, '.cleargate', 'delivery', 'archive', ref),       // 4. archived
];
```

Resolution stops at first match. Sandbox check (`candidate.startsWith(projectRoot)`) is preserved for all four.

This is a closed, deterministic fix — no recursive search, no glob, no scan. The two new candidates are constants relative to `projectRoot`. No performance regression (still 4 fs.existsSync calls in the worst case vs 2 today).

## 2. Blast Radius & Invalidation

- [x] **Pre-existing items currently failing `proposal-approved`** (or any other predicate that uses `resolveLinkedPath`) due to archived target — start passing on next gate evaluation. Surface as positive signal in `cleargate doctor` output.
- [x] **Update Epic:** EPIC-008 (predicate engine).
- [ ] **Database schema impacts:** No.
- [ ] **MCP impacts:** No. Push semantics unchanged; predicate runs locally.
- [ ] **Audit log:** No new fields.
- [ ] **Coupling with CR-030:** independent in code (different file), tightly coupled in user-visible effect (CR-030 makes Initiative show up; CR-031 makes Initiative-citing Epics pass). Should ship together.
- [ ] **FLASHCARD impact:** add card on completion — *"`resolveLinkedPath` walks pending-sync + archive; cross-references survive triage moves without rewriting `context_source`."*
- [ ] **No template changes.** Bare filenames in `context_source` remain canonical.

## Existing Surfaces

> L1 reuse audit.

- **Surface:** `cleargate-cli/src/lib/readiness-predicates.ts` — `resolveLinkedPath` helper currently walks `pending-sync/` only; this CR extends it to also walk `archive/` as fallback.
- **Surface:** `.cleargate/delivery/archive/` and `.cleargate/delivery/pending-sync/` — the two directories the lifecycle moves work items between; predicate must look in both.
- **Why this CR extends rather than rebuilds:** one helper, ~6-line additive fallback; no schema or contract change.

## 3. Execution Sandbox

**Modify:**

- `cleargate-cli/src/lib/readiness-predicates.ts:274-290` — extend `resolveLinkedPath()` candidate list with the two sibling-delivery paths. ~6 lines added; no behavioral change for already-resolving cases (order: relative-to-doc first, project-root second, then pending-sync, then archive).

**Tests:**

- `cleargate-cli/test/lib/readiness-predicates.test.ts` — add scenarios:
  1. **Citer in pending-sync, target in pending-sync** (existing baseline) — resolves via candidate 1.
  2. **Citer in pending-sync, target in archive** (the bug) — resolves via candidate 4. Pre-CR: returns null.
  3. **Citer in archive, target in archive** (frozen pair, e.g. shipped Story citing shipped CR) — resolves via candidate 1 (sibling within archive/).
  4. **Citer in archive, target in pending-sync** (rare but possible: shipped item citing a still-active Bug) — resolves via candidate 3.
  5. **Sandbox preserved** — symlink or `..` traversal in `ref` still rejected.

**Out of scope:**

- Migrating shipped artifacts that hand-rolled `archive/` prefixes into their `context_source` — let them coexist; both forms resolve under the new rule.
- Cross-repo resolution (the 3-repo split). Resolution stays project-local.

## 4. Verification Protocol

**Acceptance:**

1. **Bug reproduces pre-CR.** In the markdown_file_renderer test folder, `cleargate gate check .cleargate/delivery/pending-sync/EPIC-001_*.md` reports `❌ proposal-approved: linked file not found`. Same command post-CR: predicate finds `archive/INITIATIVE-001_*.md` and the criterion passes (assuming the `parent-approved` rename from CR-030 also lands; if CR-031 ships solo, the predicate still resolves but may fail on field check — that's CR-030's job).
2. **Unit test #2 passes.** New vitest scenario "citer in pending-sync, target in archive" returns the archive path.
3. **No regression.** Existing tests for `resolveLinkedPath` (baseline candidates 1+2) still pass.
4. **Sandbox preserved.** Test #5 confirms `../../etc/passwd` shape rejected.

**Test commands:**

- `cd cleargate-cli && npm test -- readiness-predicates` — focused.
- Manual smoke: re-run gate check on the markdown_file_renderer Epic; confirm `proposal-approved` (or `parent-approved` post-CR-030) resolves.

**Pre-commit:** typecheck + tests green; one commit `feat(CR-031): resolveLinkedPath walks pending-sync + archive`; never `--no-verify`.

**Post-commit:** archive the CR file; append flashcard.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)

**Current Status: 🟡 Medium Ambiguity**

- [x] Obsolete logic explicitly declared (resolveLinkedPath:274-290).
- [x] All impacted downstream items identified (cited dependents start passing).
- [x] Execution Sandbox names exact file + line.
- [x] Verification command provided with 4 scenarios + sandbox test.
- [ ] **Open question:** Resolution order on conflict (§0.5 Q1).
- [ ] **Open question:** `context_source` directory prefix policy (§0.5 Q2).
- [ ] **Open question:** Sprint pairing with CR-030 (§0.5 Q3).
- [ ] `approved: true` is set in the YAML frontmatter.
