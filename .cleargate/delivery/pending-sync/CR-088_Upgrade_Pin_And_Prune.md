---
cr_id: CR-088
parent_ref: EPIC-009
parent_cleargate_id: "EPIC-009"
sprint_cleargate_id: null
carry_over: false
status: Completed
approved: true
area: cleargate-cli
context_source: "verified codebase grounding (SPRINT-38 shipping review, 4 adversarially-verified findings) + recorded direct approval 2026-07-28 (owner: fix all three before publishing 0.18.0)"
created_at: 2026-07-28T00:00:00Z
updated_at: 2026-07-28T00:00:00Z
created_at_version: 0.18.0
updated_at_version: 0.18.0
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-07-28T10:57:48Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id CR-088
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-07-28T10:47:30Z
  sessions: []
---

# CR-088: `cleargate upgrade` — substitute the version pin, prune retired payload files

## 0.5 Open Questions

- **Question:** On upgrade, should the pin written into `pin-aware` hooks be the version the repo was first installed with, or the version of the payload being installed?
- **Recommended:** The payload being installed. The hooks resolve `npx -y cleargate@<pin>`; a stale pin would run an old CLI against new scaffold files.
- **Human decision:** Accepted 2026-07-28 — `newPinVersion = pkgManifest.cleargate_version`, with the install snapshot's `pin_version` re-stamped to match.

- **Question:** Should `pin-aware` keep the interactive three-way merge prompt, or overwrite like the sibling hooks?
- **Recommended:** Overwrite. Every other `.claude/hooks/**` file is `overwrite_policy: always`; `pin-aware` is semantically "always + substitution". Keeping the prompt means offering a choice between "keep your file" and "corrupt your file".
- **Human decision:** Accepted 2026-07-28 — behaviour change noted in CHANGELOG.

## 1. The Context Override (Old vs. New)

**Obsolete Logic (What to Remove / Forget):**

- Forget that `upgrade`'s routing switch covers every `overwrite_policy`. It did **not** handle `pin-aware`, which fell through `default:` to merge-3way and wrote the payload verbatim — baking the literal `__CLEARGATE_VERSION__` into `.claude/hooks/session-start.sh` and `.claude/hooks/stamp-and-gate.sh`.
- Forget that `upgrade` only ever *adds or rewrites*. It must also **remove**: a file dropped from the incoming manifest was previously left on disk forever.
- Forget the claim in `cleargate-enforcement.md:304` that retiring the test-ratchet hook "required no edit — [the dispatcher] discovers hooks by lexical glob and simply has one fewer file to find." Downstream copies have one **more** file to find, because nothing ever deleted it.

**New Logic (The New Truth):**

- `pin-aware` has its own `case` and its own handler (`applyPinAware`), which substitutes `PIN_PLACEHOLDER` with the incoming payload's version before an atomic write — mirroring `copyPayload`'s init-time behaviour (CR-009). The snapshot records `entry.sha256` (the *placeholder-form* hash), because `computeCurrentSha` reverse-substitutes the pin before hashing (BUG-023).
- The install snapshot's `cleargate_version` and `pin_version` are re-stamped at the end of a run. Without this, `computeCurrentSha` reverse-substitutes a stale pin and misclassifies every pin-aware hook as `user-modified` immediately after a clean upgrade.
- `upgrade` computes `snapshotPaths − manifestPaths` and prunes the difference. It deletes only when the on-disk file still byte-matches what ClearGate installed; a locally-modified orphan is kept and reported on stderr. `user-artifact` tier and `preserve_on_uninstall` entries are never considered, and `--only <tier>` scopes the prune.
- Prunes appear in `--dry-run` as `action=prune`.

**Why this was release-gating:** the corruption is silent (`doctor` and `upgrade --dry-run` both report `state=clean`, because the corrupted content already *is* the placeholder form and therefore hashes equal to the package SHA), non-self-healing (a plain `init` skips the existing file; only `init --force` repairs it), and cascading (`pre-edit-gate.sh:103-104` derives its own pin by grepping `stamp-and-gate.sh`). Separately, CR-086 fixed the dispatcher to resolve the real `.claude/hooks/` directory, which would have **armed** the un-pruned test-ratchet orphan into a hard `git commit` block in every repo that followed the shipped `ln -sf … .git/hooks/pre-commit` instruction.

## 2. Blast Radius & Invalidation

- [x] Invalidate/Update Story: [[STORY-009-05]] — `cleargate upgrade` three-way merge driver; its policy-routing contract is amended (a fourth action, `pin-aware`) and a prune phase is added after the per-file loop.
- [x] Invalidate/Update Story: [[STORY-051-02]] — retiring the test-ratchet gate from the payload is only safe *because* this CR prunes it downstream. The two ship together in 0.18.0.
- [x] Database schema impacts? **No** — CLI-only; the only persisted state is `.cleargate/.install-manifest.json` and `.cleargate/.drift-state.json`.
- Behaviour change for interactive users: `session-start.sh` and `stamp-and-gate.sh` no longer prompt during `upgrade`. Documented in CHANGELOG 0.18.0.
- Not covered by this CR (documented as known issues): `cleargate init --force` does not prune; and telemetry seeded into repos by 0.15.0–0.17.1 is not in the manifest, so prune cannot reach it.

## Existing Surfaces

- **Surface:** `cleargate-cli/src/commands/upgrade.ts:440-459` — the `overwrite_policy` routing switch. Handled `always` / `skip` / `preserve` / `merge-3way` / `default`; no `pin-aware` case existed, and the `FileWork['action']` union could not express one.
- **Surface:** `cleargate-cli/src/commands/upgrade.ts:414-457` — work-item construction, enumerated exclusively from `pkgManifest.files`. The install snapshot was loaded but used only as a sha lookup, never iterated, so no set difference was ever computed.
- **Surface:** `cleargate-cli/src/init/copy-payload.ts:31-36,133-137` — `PIN_PLACEHOLDER` + `HOOK_FILES_WITH_PIN`, the *only* substitution site in the codebase (init-only). Now exports `PIN_PLACEHOLDER` so upgrade uses the identical token.
- **Surface:** `cleargate-cli/src/lib/manifest.ts:40` — `overwrite_policy` union already declared `'pin-aware'`; `cleargate-cli/scripts/build-manifest.ts:103-120` already assigned it to the two hooks. The policy was real and shipped in MANIFEST.json — only the consumer was missing.
- **Surface:** `cleargate-cli/src/lib/manifest.ts:195-223` — `reverseSubstitutePinAware` / `computeCurrentSha` (BUG-023). Read-only hashing; explains why the corruption was invisible to `doctor`.
- **Surface:** `cleargate-cli/src/commands/uninstall.ts:233-248` — existing `removeFile`/`removeDir` removal primitives, reviewed for reuse; the prune path uses a plain `unlink` since it deletes single tracked files only.
- **Why this CR extends rather than rebuilds:** the manifest already carried the `pin-aware` policy and the snapshot already carried every path needed for a set difference. Both defects are missing consumers of existing data, not missing data — so the change is two handlers plus a snapshot filter, with no schema or format change.

## Prior work

- [[CR-009]] — Hook CLI Resolution. Introduced the `__CLEARGATE_VERSION__` placeholder and the `overwrite_policy: pin-aware` annotation intended to protect the pinned-version line across upgrades. This CR supplies the upgrade-side handler CR-009 specified but never landed.
- [[STORY-009-05]] — `cleargate upgrade` three-way merge driver. The authoritative upgrade design being amended.
- [[STORY-009-02]] — Build Manifest And Changelog. Generates the MANIFEST that `upgrade` consumes and that the prune diffs against.
- [[BUG-023]] — pin reverse-substitution before hashing. Explains why the corruption classified as `clean`.
- [[BUG-028]] — upgrade merge prompt: dry-run vs real-run state mismatch. Prior work on the same prompt/plan surface the `--dry-run` prune lines extend.
- [[STORY-051-02]] — Retire the Test-Ratchet Pre-Commit Gate from the Payload. Produces the orphans this CR prunes.
- [[CR-086]] — file-surface gate end-to-end. Fixed the dispatcher's `HOOK_DIR` resolution, which is what arms an un-pruned orphan hook.

## 3. Execution Sandbox

**Modify:**
- `cleargate-cli/src/commands/upgrade.ts`
- `cleargate-cli/src/init/copy-payload.ts` (export `PIN_PLACEHOLDER` only)

**Add:**
- `cleargate-cli/test/commands/upgrade-pin-and-prune.node.test.ts`

## 4. Verification Protocol

**Command/Test:** `npx tsx --test test/commands/upgrade-pin-and-prune.node.test.ts` — 11 scenarios, all green. Covers: real version written / no placeholder; repair of an already-corrupted install; no merge prompt for pin-aware; snapshot version + pin re-stamp; placeholder-form sha recorded so the next run classifies `clean`; orphan removed and dropped from snapshot; locally-modified orphan kept + warned; `user-artifact` and `preserve_on_uninstall` never pruned; already-deleted orphan tolerated; `--only <tier>` scoping; `--dry-run` reports without mutating.

**Full suite:** `npm test` — 2234 pass / 0 fail / 1 skipped.

**End-to-end (real binaries, no test seam):** install published `cleargate@0.17.1` into a scratch git repo (snapshot = 80 entries, hooks pinned `0.17.1`, orphan hook + script present), symlink `.git/hooks/pre-commit` per the shipped instruction, then run the local 0.18.0 `dist/cli.js upgrade --yes`. Observed: `[pin] rewritten with pin 0.18.0` for both hooks; `[prune] removed:` for all 4 retired files; snapshot re-stamped to `version=0.18.0 pin=0.18.0 entries=76`; **`git commit` still exits 0** with the now-armed dispatcher; `doctor --check-scaffold` reports `0 user-modified, 74 clean` (the single `upstream-changed` is `.claude/settings.json`, which is expected — its merge surgery preserves user hooks so it never hashes equal to the package SHA).

---

## Context Source

**context_source:** verified codebase grounding — SPRINT-38 shipping review, 6-dimension audit with adversarial verification (32 candidate findings, 28 refuted, 4 confirmed); both defects independently reproduced against real published tarballs before any code was written. Direct owner approval recorded 2026-07-28 ("fix all three, then publish 0.18.0"), which waives the retro-proposal step. SPRINT-38_REPORT.md §4.5 listed P2/P3 as publish blockers "not yet filed as work items" — this CR files P2 and P3.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Ready for Execution**

Requirements to pass to Green (Ready for Execution):
- [x] "Obsolete Logic" to be evicted is explicitly declared.
- [x] All impacted downstream Epics/Stories are identified and reverted to 🔴 High Ambiguity.
- [x] Execution Sandbox contains exact file paths.
- [x] Verification command is provided.
- [x] `approved: true` is set in the YAML frontmatter.
- [x] Existing Surfaces cites at least one source-tree path the CR extends.
