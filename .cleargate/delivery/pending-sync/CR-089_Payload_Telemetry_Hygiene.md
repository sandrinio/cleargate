---
cr_id: CR-089
parent_ref: EPIC-009
parent_cleargate_id: "EPIC-009"
sprint_cleargate_id: null
carry_over: false
status: Completed
approved: true
area: cleargate-cli
context_source: verified codebase grounding (SPRINT-38 shipping review; reproduced with the published 0.17.1 binary) + recorded direct approval 2026-07-28
created_at: 2026-07-28T00:00:00Z
updated_at: 2026-07-28T00:00:00Z
created_at_version: 0.18.0
updated_at_version: 0.18.0
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-07-28T10:57:49Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id CR-089
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-07-28T10:47:42Z
  sessions: []
---

# CR-089: Stop shipping maintainer telemetry in the npm payload

## 0.5 Open Questions

- **Question:** Exclude `.cleargate/sprint-runs/` at the payload-copy step (prebuild), at the init-write step, or both?
- **Recommended:** At the copy step. It is the single choke point where meta-repo working-tree state becomes published artifact; fixing it there means the tarball never contains the data, so nothing downstream needs to filter it.
- **Human decision:** Accepted 2026-07-28 — exclude in `copy-planning-payload.mjs`, preserving the directory as an empty skeleton.

- **Question:** Delete the maintainer's local `token-ledger.jsonl` from `cleargate-planning/`?
- **Recommended:** No. It is gitignored dogfood telemetry the owner may still want; once the copier excludes the directory, deleting it buys nothing for the release.
- **Human decision:** Left in place.

## 1. The Context Override (Old vs. New)

**Obsolete Logic (What to Remove / Forget):**

- Forget that `.gitignore` protects the npm payload. It does not. `copy-planning-payload.mjs` walks the **working tree**, so a file can be untracked in the meta-repo and still be published to npm and written into every user repo by `cleargate init`.
- Forget that excluding `.cleargate/sprint-runs/**` from MANIFEST.json generation (`scripts/build-manifest.ts`) keeps it out of the package. That governs only what `upgrade` tracks — the *copy* was unconditional.
- Forget that the canonical scaffold ships an empty `sprint-runs/` skeleton. It did not: live dogfood runs left a real `_off-sprint/token-ledger.jsonl` there, and it shipped.

**New Logic (The New Truth):**

- `copy-planning-payload.mjs` carries an explicit `EXCLUDE_DIRS` hygiene list. `.cleargate/sprint-runs` is recreated as an empty directory so the scaffold's shape is preserved while its contents are dropped, and the exclusion is logged at prebuild time.

**What was leaking:** `templates/cleargate-planning/.cleargate/sprint-runs/_off-sprint/token-ledger.jsonl` (126,945 B, 222 rows) plus `.session-totals.json`. Rows carry the maintainer's home-directory transcript paths (`/Users/…/.claude/projects/…`), Claude session UUIDs, model ids, and per-turn token counts. No credentials. Present and byte-identical in the 0.15.0, 0.17.0 and 0.17.1 tarballs; reproduced by running the published 0.17.1 binary in a fresh repo, which prints `Created .cleargate/sprint-runs/_off-sprint/token-ledger.jsonl`.

**Why it is more than a disclosure issue:** `token-ledger.sh:324-333` reads `tail -1 "${LEDGER}" | jq -r '.work_item_id'` as its attribution fallback. Every row in the seeded file is `CR-078`, so the first off-sprint agent turn in a brand-new downstream repo was attributed to a work item that does not exist there. Because npm strips `.gitignore` from tarballs, the target repo also had no ignore rule for it — a `git add -A` would commit the maintainer's telemetry into a stranger's history.

## 2. Blast Radius & Invalidation

- [x] Invalidate/Update Story: [[STORY-009-02]] — Build Manifest And Changelog; the prebuild pipeline this CR amends.
- [x] Database schema impacts? **No** — build-script change only; no runtime code path.
- No downstream item depends on payload `sprint-runs/` content. Verified non-consumers: `sprint_trends.mjs` has zero token-ledger references; the Reporter (`reporter.md:63,73,74`) and the dashboard (`src/dashboard/collect.ts:552`) read `sprint-runs/<named-sprint-id>/`, never `_off-sprint`. The one reader that does enumerate `_off-sprint` is `src/commands/stamp-tokens.ts:119` → `src/lib/ledger-reader.ts:160-164`, which is exactly the mis-attribution path being closed.
- Not covered (documented as a known issue): repos already installed at 0.15.0–0.17.1 have the file on disk. It is not in the manifest, so `upgrade` cannot prune it; manual deletion.

## Existing Surfaces

- **Surface:** `cleargate-cli/scripts/copy-planning-payload.mjs:37-50` — `copyDir()`, a recursive working-tree copy with zero exclusions. The defect.
- **Surface:** `cleargate-cli/package.json` `files: ["dist","templates",…]` with no `.npmignore` — ships `templates/` wholesale, so anything the copier writes is published.
- **Surface:** `cleargate-cli/src/init/copy-payload.ts:54,122` — `SKIP_FILES = {CLAUDE.md, MANIFEST.json}` applied via `listFilesRecursive(...).filter(...)`. Nothing filtered `sprint-runs`, so init wrote it into user repos.
- **Surface:** `cleargate-cli/scripts/build-manifest.ts` — `TIER_RULES` already excludes the sprint-runs subtree from MANIFEST.json. Establishes the intent this CR extends to the copy step.
- **Surface:** the meta-repo's root gitignore, line 30 — ignores the canonical scaffold's sprint-runs subtree, added 2026-06-02 with the comment "guard against recurrence". The git side was already guarded; the payload side was the unguarded half.
- **Surface:** `.cleargate/sprint-runs/_off-sprint/token-ledger.jsonl` — the shape of the leaked artifact (this meta-repo's own copy; the canonical-scaffold copy under `cleargate-planning/` was the one that shipped).
- **Why this CR extends rather than rebuilds:** the exclusion policy already existed in two places (manifest tiering, meta-repo gitignore). This adds the missing third enforcement point rather than inventing a new mechanism.

## Prior work

- [[BUG-003]] — `cleargate-planning/MANIFEST.json` regenerates dirty on every build. Same class of defect (meta-repo build artifact leaking into tracked/published state); resolved by untracking, which is precisely why gitignore alone proved insufficient here.
- [[STORY-009-02]] — Build Manifest And Changelog. Owns the prebuild pipeline being changed.
- No prior CR or story gates `copy-planning-payload.mjs`'s exclusion list — this surface was previously ungoverned.

## 3. Execution Sandbox

**Modify:**
- `cleargate-cli/scripts/copy-planning-payload.mjs`

## 4. Verification Protocol

**Command/Test:**

```
npm run build
npm pack --dry-run 2>&1 | grep -E 'token-ledger\.jsonl|session-totals'   # must return nothing
```

Observed after the fix: prebuild logs `[prebuild] payload-hygiene: emptied .cleargate/sprint-runs/`, and the pack listing contains neither file (`PAYLOAD CLEAN`). Before the fix the same grep returned `126.9kB .../token-ledger.jsonl` and `858B .../.session-totals.json`.

**Post-publish re-check:** `npm pack cleargate@0.18.0 && tar -tzf cleargate-0.18.0.tgz | grep -E 'token-ledger|session-totals'` — must be empty.

---

## Context Source

**context_source:** verified codebase grounding — reproduced by installing the published `cleargate@0.17.1` and running its real `init` binary in a scratch repo, confirming the seeded file hashes identically to the maintainer's local copy. Direct owner approval recorded 2026-07-28 as part of "fix all three, then publish 0.18.0".

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
