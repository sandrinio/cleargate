---
cr_id: CR-096
parent_ref: EPIC-043
parent_cleargate_id: "EPIC-043"
sprint_cleargate_id: null
carry_over: false
status: Completed
approved: true
area: cli
context_source: verified codebase grounding — diffed MANIFEST.json against the shipped payload (67 tracked vs 75 files), traced classifyPath()'s null-drop, and reproduced a fresh `cleargate init` into an empty repo
created_at: 2026-08-01T00:00:00Z
updated_at: 2026-08-01T00:00:00Z
created_at_version: 0.20.0
updated_at_version: 0.20.0
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-08-01T09:59:15Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id CR-096
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-08-01T09:59:15Z
  sessions: []
---

# CR-096: Nothing Ships Unversioned, and the Scaffold Explains Itself

## 0.5 Open Questions

- **Question:** Should an unclassified payload file fail `prebuild` rather than warn?
- **Recommended:** Warn, as implemented. A hard failure blocks the build for a file that may be perfectly fine to ship untracked, and the warning names both remedies (add a `TIER_RULES` entry, or list it in `INTENTIONALLY_UNTRACKED`). Escalating to an error is a one-line change if the warning proves ignorable in practice.
- **Human decision:** {populated during Brief review}

## 1. The Context Override (Old vs. New)

**Obsolete Logic (What to Remove / Forget):**
- Forget that the install manifest covers the scaffold. It covers what someone remembered to write a `TIER_RULES` pattern for. `classifyPath()` returns `null` on no match and `walkDir` silently `continue`s, while `copy-payload` walks the tree independently and ships the file regardless.
- Forget that payload hygiene is handled. `EXCLUDE_DIRS` guards directories only; a loose runtime file in `.cleargate/` walks straight through.
- Forget that `cleargate init` points new users at a README. No README shipped anywhere in the payload.

**New Logic (The New Truth):**
- `build-manifest` reports every payload file matching no `TIER_RULE`, naming the file and both remedies. Seven paths that ship untracked deliberately are listed in `INTENTIONALLY_UNTRACKED` so the warning stays signal: `CLAUDE.md`, `MANIFEST.json` (neither is copied verbatim), `.gitignore`, `config.yml`, `config.example.yml`, and the two `.gitkeep` placeholders.
- `.cleargate/README.md` ships, tracked as tier `protocol` / `merge-3way` — upgrades deliver improvements without clobbering a user's annotations.
- `copy-planning-payload.mjs` gains `EXCLUDE_FILES` alongside `EXCLUDE_DIRS`.
- `init`'s closing line names `.cleargate/README.md` (Quickstart), which now exists.

**The failure this fixes.** An unversioned file installs once and is then frozen forever in every downstream repo — invisible to `upgrade`, to `doctor` drift, to `uninstall` — with nothing printed anywhere. That is a permanent, silent divergence introduced by the ordinary act of adding a scaffold file.

Separately, `.cleargate/.sync-marker.json` was shipping to every user. It is untracked in the meta-repo — which is why it went unnoticed — but the copier walks the working tree, so a per-machine runtime file carrying `{"last_check":"2026-06-02T18:09:09Z"}` was published to npm and written into every `cleargate init`. Every fresh repo began life believing it last synced in June. The target's own `.cleargate/.gitignore` lists that exact file as per-machine state, so shipping it contradicted the scaffold's own rules.

## 2. Blast Radius & Invalidation

- [x] Invalidate/Update CR: [[CR-089]] — extended, not reverted. Its directory-level payload hygiene stands; this adds the file-level case it did not cover.
- [ ] Invalidate/Update CR: [[CR-092]] — its "payload exclusion and MANIFEST exclusion must move together" rule is reinforced here, not changed.
- [ ] Database schema impacts? **No.** Build scripts, one new doc, one CLI string.

**Downstream risk.**
- Manifest grows 67 → 68 entries. `upgrade` will see `.cleargate/README.md` as a new tracked file and install it; existing repos get it on their next upgrade.
- Payload count is unchanged at 75 (−`.sync-marker.json`, +`README.md`), so tarball size is effectively flat.
- Removing `.sync-marker.json` from the payload is safe: `sync.ts` writes it on demand and every reader guards on existence. Repos that already received the stale copy keep it; it is gitignored and will be overwritten on their next `sync`.
- The `prebuild` warning is advisory and does not change exit status, so no build breaks.

## Existing Surfaces

- **Surface:** `cleargate-cli/scripts/build-manifest.ts` — `TIER_RULES`, `classifyPath()` (returns `null` on no match), and `walkDir()`'s silent `continue`. This is where unversioned files disappeared.
- **Surface:** `cleargate-cli/scripts/copy-planning-payload.mjs` — `EXCLUDE_DIRS`, the directory-only hygiene set.
- **Surface:** `cleargate-cli/src/commands/init.ts` — the completion message naming a README that did not exist.
- **Surface:** `cleargate-cli/src/init/copy-payload.ts` — `SKIP_FILES` (`CLAUDE.md`, `MANIFEST.json`), the two files deliberately never copied verbatim; unchanged, but they are why those paths appear in `INTENTIONALLY_UNTRACKED`.
- **Why this CR extends rather than rebuilds:** the manifest's tier/policy model is sound — `always` / `merge-3way` / `pin-aware` / `skip` map cleanly onto how each surface is owned, and `upgrade` already honours them. The defect is not the model but that the allowlist fails open and says nothing. One report plus one new rule preserves every existing classification byte-for-byte.

## Prior work

- [[CR-089]] — payload telemetry hygiene; introduced `EXCLUDE_DIRS`, which this extends to files.
- [[CR-092]] — established that payload and MANIFEST exclusions must move together; the same coupling is why an unclassified-but-shipped file is a defect rather than a nuisance.
- [[CR-090]] — the npm/privacy class: files reaching user repos that should never have left the meta-repo.
- [[CR-088]] — orphan prune on upgrade, which only works for files the manifest knows about; untracked files are invisible to it.
- No prior item addresses manifest coverage completeness or ships an orientation doc.

## 3. Execution Sandbox

**Modify:**
- `cleargate-cli/scripts/build-manifest.ts` — add the `.cleargate/README.md` `TIER_RULE`; add `INTENTIONALLY_UNTRACKED`, `unclassifiedPaths`, and the CLI warning.
- `cleargate-cli/scripts/copy-planning-payload.mjs` — add `EXCLUDE_FILES` and its check in the file branch of `copyDir`.
- `cleargate-cli/src/commands/init.ts` — completion message names `.cleargate/README.md`.

**Add:**
- `cleargate-planning/.cleargate/README.md` — Quickstart, the three-phase loop, a what-lives-where table, commands, and the overwrite-policy table.

**Delete:**
- `cleargate-planning/.cleargate/.sync-marker.json` — per-machine runtime state that was never meant to ship.

**Regenerate (build output, not hand-edited):**
- `cleargate-planning/MANIFEST.json` — 67 → 68 entries.

## 4. Verification Protocol

**Command/Test:** `cd cleargate-cli && npm run typecheck && npm test`

- Clean `prebuild` prints no warning; adding a probe file (`.cleargate/UNRULED.md`) produces `WARNING: 1 payload file(s) match no TIER_RULE and will ship UNVERSIONED — .cleargate/UNRULED.md` and names both remedies. Probe removed; manifest back to 68.
- Fresh `cleargate init` into an empty repo: `Created .cleargate/README.md`, the completion line names it, `.install-manifest.json` has 68 entries including `.cleargate/README.md | merge-3way`, and **no** `.sync-marker.json` is written.
- Coverage diff: every payload file is either in the manifest or in `INTENTIONALLY_UNTRACKED` — no third category.

---

## Context Source

**context_source:** verified codebase grounding. Coverage gap found by diffing `MANIFEST.json` (67 entries) against the shipped payload (75 files) and tracing the eight-file difference to `classifyPath()`'s null-drop. The `.sync-marker.json` leak was found in the same diff and confirmed present in a fresh install. No PM-tool or remote input.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity — promoted from 🟡 at Gate 1**

Requirements to pass to Green (Ready for Execution):
- [x] "Obsolete Logic" to be evicted is explicitly declared.
- [x] All impacted downstream Epics/Stories are identified and reverted to 🔴 High Ambiguity.
- [x] Execution Sandbox contains exact file paths.
- [x] Verification command is provided.
- [x] `approved: true` is set in the YAML frontmatter.
- [x] Existing Surfaces cites at least one source-tree path the CR extends.
