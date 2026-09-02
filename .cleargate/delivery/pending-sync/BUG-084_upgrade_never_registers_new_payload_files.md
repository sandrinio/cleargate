---
bug_id: BUG-084
parent_ref: ""
parent_cleargate_id: null
sprint_cleargate_id: null
carry_over: false
status: Completed
severity: P2-Medium
reporter: orchestrator (field report from a consumer repo upgraded to 0.26.0)
approved: true
area: cli-upgrade
context_source: verified codebase grounding — upgrade.ts:118-141 and its five call sites, doctor.ts:359-372, uninstall.ts:304 read directly; field report of a 74-row payload against a 66-row snapshot + recorded direct approval 2026-09-02
created_at: 2026-09-02T13:10:00Z
updated_at: 2026-09-02T13:10:00Z
created_at_version: 0.26.0
updated_at_version: 0.26.1
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
  last_gate_check: 2026-09-02T15:18:29Z
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

# BUG-084: `cleargate upgrade` installs new payload files without ever registering them in the install snapshot

> **Field report.** A consumer repo upgraded to 0.26.0 reported its manifest row gap widening
> from 5 to 8: the payload carries 74 rows, `.cleargate/.install-manifest.json` still carries 66.
> The three scripts 0.26.0 promoted to canonical (`prep_reporter_context.mjs`, `count_tokens.mjs`,
> `lib/ledger-digest.mjs`) joined the unmanaged set. The gap is not that repo's state — it is
> structural, and every repo that reached its current version by `upgrade` rather than a fresh
> `init` carries a gap equal to the number of payload files added since it was installed.

## 1. The Anomaly (Expected vs. Actual)

**Expected Behavior:** After `cleargate upgrade`, `.cleargate/.install-manifest.json` describes
every ClearGate-owned file on disk. A file the new payload adds gets a row — path, sha256, tier,
overwrite_policy — exactly as `cleargate init` would have written it.

**Actual Behavior:** The file is written to disk with correct content; the snapshot never gains a
row. `updateSnapshotEntry` (`src/commands/upgrade.ts:118`) `.map()`s over the entries already in
the snapshot and patches the one whose `path` matches. A path that is not already present matches
nothing, so the map is a silent no-op. There is a sibling for removal (`pruneSnapshotEntries`, a
`.filter()`, CR-088) and one for version re-stamping (`restampSnapshotVersion`), but **no insert
path anywhere in the file**.

Two consequences follow, both silent:

1. **`uninstall` leaks the files.** It enumerates the snapshot (`src/commands/uninstall.ts:304`),
   so an unregistered file is never removed. `cleargate uninstall` leaves scaffold behind.
2. **`doctor --check-scaffold` mislabels them, permanently.** Drift iterates the *package*
   manifest and resolves `installSha` as `... ?? null` (`src/commands/doctor.ts:368`). For a
   pristine new file that is `classify(pkgSha=A, installSha=null, currentSha=A)`:
   `installEqualsPackage` is false and `currentEqualsInstall` is false, so it falls through to
   **`both-changed`** (`src/lib/manifest.ts:242-278`). Byte-perfect files are reported as
   conflicted on both sides, and every run prints `Run cleargate upgrade to review.` — advice that
   cannot help, because the upgrade it points at is the thing that cannot insert the row. This is
   worse than invisibility: it is durable false-positive noise that teaches people to ignore the
   drift line.

## 2. Reproduction Protocol

Deterministic, no network:

1. Stand up a project root with `.cleargate/.install-manifest.json` listing exactly one entry,
   `.claude/hooks/a.sh`, with policy `always`.
2. Stand up a package root whose `MANIFEST.json` lists **two** entries — `.claude/hooks/a.sh` and
   a net-new `.cleargate/scripts/new_script.mjs`, also `always` — and ship both files.
3. Run `upgradeHandler({ yes: true }, { cwd: projectRoot, packageRoot: pkgRoot, … })`.
4. Observe: `.cleargate/scripts/new_script.mjs` exists on disk with the payload's content, and
   `.install-manifest.json` still carries exactly one row. No warning is printed.
5. Run `cleargate doctor --check-scaffold` against the same root and observe the new file counted
   under `both-changed` rather than `clean`.

Real-world path: any repo installed at ≤0.25.0 and upgraded to 0.26.0 — `node -e` the two row
counts and diff the path sets.

## 3. Evidence & Context

Field measurement from the reporting repo:

```
payload rows (MANIFEST.json):            74
install snapshot rows (.install-manifest): 66
gap:                                       8   (was 5 before the 0.26.0 upgrade)

unregistered by this release:
  .cleargate/scripts/prep_reporter_context.mjs   [script/always]
  .cleargate/scripts/count_tokens.mjs            [script/always]
  .cleargate/scripts/lib/ledger-digest.mjs       [script/always]
```

The mechanism, verbatim (`src/commands/upgrade.ts:132-140`):

```js
const updated: ManifestFile = {
  ...snapshot,
  files: snapshot.files.map((entry) =>
    entry.path === filePath ? { ...entry, sha256: newSha } : entry
  ),
};
```

`.map()` cannot lengthen an array. Every one of the five call sites (lines 240, 282, 357, 413, 462)
inherits the no-op.

## 4. Execution Sandbox (Suspected Blast Radius)

**Investigate / Modify:**
- `cleargate-cli/src/commands/upgrade.ts` — `updateSnapshotEntry` and its five call sites.

**Do not touch:** `pruneSnapshotEntries`, `restampSnapshotVersion`, the routing switch, or
`doctor.ts` / `uninstall.ts`. Both downstream symptoms resolve once the row exists; changing the
consumers instead would paper over the missing row.

**Not fixed here:** a net-new file whose `overwrite_policy` is `skip` or `preserve` is never
written by `upgrade` at all (`upgrade.ts:581-584` routes it to action `skip`, which neither writes
nor records). For a *net-new* path there is nothing to preserve, so that is arguably wrong too —
but it is a different defect with a different fix, and no such file exists in today's payload.
Filed as a note here rather than silently widened into this change.

## Task Breakdown

- [ ] Make `updateSnapshotEntry` an upsert: patch the matching row, or append a full
      `ManifestEntry` when no row matches.
- [ ] Take the appended row's `tier`, `overwrite_policy` and `preserve_on_uninstall` from the
      package manifest entry, so the row is indistinguishable from one `init` would have written.
- [ ] Refuse the insert when the resolved sha is `null` — nothing was installed, so nothing should
      be registered.
- [ ] Thread the `ManifestEntry` through all five call sites in place of the bare path.
- [ ] Write the regression test described in §5.

## 5. Verification Protocol (The Failing Test)

**Command:** `npm run test:file -- test/commands/upgrade-registers-new-files.node.test.ts`

The test must FAIL against the pre-fix code for the stated reason (row count stays 1), not for an
incidental one — the discrimination trap recorded in FLASHCARD 2026-09-02 `#qa #red-test`.

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 4 | net-new row appended with correct sha/tier/policy; existing row still patched (no regression); `uninstall` reaches the new file; `doctor` reports it `clean`, not `both-changed` |
| Integration tests | 0 | No database or network in this path — the upgrade handler takes a real tmpdir fs and injected stdout/stderr seams. Real infra would add nothing to observe. |
| E2E / acceptance tests | 0 | Covered by the unit layer against the real handler entry point (`upgradeHandler`), which is the same surface the CLI invokes. |

---

## Prior work

> Duplicate-check evidence, enforced by the `prior-work-recorded` readiness predicate.

- none found — searched `.cleargate/delivery/pending-sync/` and `.cleargate/delivery/archive/` for
  install-manifest items. The nearest neighbours are [[CR-088]] (`upgrade` pin substitution +
  orphan **prune** — the removal half of snapshot maintenance, which is precisely why the absence
  of an insert half went unnoticed) and [[BUG-037]] (`upgrade` blanks the gate commands `init`
  detected). Neither covers registration of net-new rows. [[CR-053]] and [[BUG-045]] touch manifest
  paths and ID reuse respectively; unrelated mechanism.

## Existing Surfaces

- `cleargate-cli/src/commands/upgrade.ts:118` — `updateSnapshotEntry` (map-only; the defect)
- `cleargate-cli/src/commands/upgrade.ts:152` — `pruneSnapshotEntries` (filter; the removal sibling)
- `cleargate-cli/src/commands/upgrade.ts:186` — `restampSnapshotVersion` (version fields)
- `cleargate-cli/src/commands/init.ts:550` — Step 7, writes the full snapshot (the shape to match)
- `cleargate-cli/src/lib/manifest.ts:242` — `classify()` (why a missing row reads `both-changed`)
- `cleargate-cli/src/commands/uninstall.ts:304` — snapshot enumeration (why the files leak)
- `cleargate-cli/test/commands/upgrade-pin-and-prune.node.test.ts` — the tmpdir + injected-seam
  harness this bug's test reuses

## Context Source

**context_source:** verified codebase grounding — `upgrade.ts:118-141` and its five call sites,
`doctor.ts:359-372`, `manifest.ts:242-278` and `uninstall.ts:304` read directly; field report of a
74-row payload against a 66-row snapshot; direct approval recorded 2026-09-02.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Ready for Fix**

Requirements to pass to Green (Ready for Fix):
- [x] Reproduction steps are 100% deterministic.
- [x] Actual vs. Expected behavior is explicitly defined.
- [x] Raw error logs/evidence are attached.
- [x] Verification command (failing test) is provided.
- [x] `approved: true` is set in the YAML frontmatter.
