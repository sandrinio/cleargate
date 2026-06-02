---
cr_id: CR-076
parent_ref: EPIC-043
parent_cleargate_id: EPIC-043
sprint_cleargate_id: null
carry_over: false
status: Draft
approved: false
area: framework/hygiene
context_source: |
  Direct observation from the 2026-06-02 cleargate@0.14.0 publish run. `npm pack
  --dry-run` reported: package size 9.4 MB, unpacked 53.4 MB, 221 files. The unpacked
  size is dominated by sourcemaps — dist/cli.js.map (15.2 MB) + dist/cli.cjs.map
  (15.3 MB) ≈ 30 MB of the 53 MB. Separately, the scaffold payload ships TWICE: once
  at root `templates/cleargate-planning/**` and again at `dist/templates/cleargate-planning/**`
  (tsup onSuccess copies templates → dist/templates, and package.json `files` lists
  BOTH `dist` and `templates`). Owner-directed filing 2026-06-02 ("file the findings
  as work items" — both accepted). Routes to EPIC-043 per the tech-debt-findings
  memory directive.
created_at: 2026-06-02T00:00:00Z
updated_at: 2026-06-02T00:00:00Z
created_at_version: cleargate@0.14.0
updated_at_version: cleargate@0.14.0
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-06-02T10:15:59Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id CR-076
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-06-02T10:15:52Z
  sessions: []
---

# CR-076: Trim the published cleargate npm package — drop sourcemaps and de-duplicate the scaffold payload

## 0.5 Open Questions

- **Question:** Drop `dist/*.map` from the published tarball entirely, or keep them?
- **Recommended:** Drop from the published package (the build can still emit them for local debugging; exclude via `.npmignore` or by narrowing `files[]`, or set tsup `sourcemap` off for the publish build). ~30 MB of 53 MB; consumers of a CLI binary almost never need its sourcemaps, and they bloat every install.
- **Human decision:** {populated during Brief review}

- **Question:** The scaffold payload ships twice (`templates/` AND `dist/templates/`). Which copy does the INSTALLED CLI actually read at `cleargate init` time — and therefore which can be dropped from `files[]`?
- **Recommended:** Verify first (the bin is `dist/cli.js`, so it most likely resolves `dist/templates/` via `__dirname`). If confirmed, drop `templates` from `files[]` and ship only `dist` (which already contains `dist/templates/`). **Hard prerequisite:** do NOT remove a copy until the init template-resolution path is proven, or `cleargate init` breaks in the field.
- **Human decision:** {populated during Brief review}

## 1. The Context Override (Old vs. New)

**Obsolete Logic (What to Remove / Forget):**
- The published tarball is bloated: 53.4 MB unpacked / 9.4 MB packed / 221 files. ~30 MB is sourcemaps (`dist/cli.js.map` 15.2 MB + `dist/cli.cjs.map` 15.3 MB), shipped to every `npm i -g cleargate` / `npx cleargate` consumer.
- The entire `cleargate-planning` scaffold payload is published TWICE — once under root `templates/` and once under `dist/templates/` — because `package.json files[]` lists both `dist` and `templates`, and tsup's `onSuccess` already copies `templates → dist/templates`.

**New Logic (The New Truth):**
- The published package excludes sourcemaps and ships the scaffold payload exactly ONCE, from the path the CLI actually reads at runtime.
- Target a materially smaller unpacked size (rough goal: well under half of today's 53 MB) with zero change to `cleargate init` / `upgrade` behaviour.

## 2. Blast Radius & Invalidation

- [ ] Update `cleargate-cli/package.json` `files[]` (and/or add `.npmignore`).
- [ ] Update `cleargate-cli/tsup.config.ts` (sourcemap emission for the publish build).
- [ ] Verify (edit only if the read-path requires it) the init template-resolution path so removing a payload copy is safe.
- [ ] **Overlap flag:** the `changelog-format` "Tarball includes CHANGELOG" `npm pack` assertion (also in scope for **CR-075**) inspects tarball contents — re-run/adjust it after the `files[]` change so it still asserts the right (trimmed) manifest.
- [ ] Database schema impacts? No — packaging/build config only; no `mcp/`, `admin/`, or DB surface.

## Existing Surfaces

> L1 reuse audit. Paths verified 2026-06-02 against the cleargate-cli main checkout + the v0.14.0 `npm pack --dry-run` manifest.

- **Surface:** `cleargate-cli/package.json` — `files[]` lists both `dist` and `templates`, so the scaffold payload ships twice: the root `templates` tree AND the copy tsup nests inside the build output.
- **Surface:** `cleargate-cli/tsup.config.ts` — its `onSuccess` step copies the templates tree + manifest into the build output and emits the `cli.js.map` / `cli.cjs.map` sourcemaps; origin of both the duplicate payload copy and the ~30 MB of maps.
- **Surface:** `cleargate-cli/scripts/copy-planning-payload.mjs` and `cleargate-cli/src/init/copy-payload.ts` — the payload-mirror step plus the install template-resolution path; together they decide which payload copy the installed CLI reads, so the read path must be confirmed before dropping a copy.
- **Evidence (publish manifest, not a source surface):** the v0.14.0 `npm pack --dry-run` output — `cli.js.map` 15.2 MB + `cli.cjs.map` 15.3 MB (≈30 MB of maps), payload tree duplicated, 221 files, 53.4 MB unpacked.
- **Why this CR extends rather than rebuilds:** the publish pipeline already works and ships a correct (if heavy) package; this CR narrows what gets included — config surgery on `files[]` and tsup, not a new build system.

## 3. Execution Sandbox

**Modify:**
- `cleargate-cli/package.json` (`files[]`, optional `.npmignore`)
- `cleargate-cli/tsup.config.ts` (sourcemap)
- (verify-only, edit if needed) `cleargate-cli/src/init/copy-payload.ts` template-resolution path

## 4. Verification Protocol

**Command/Test:**
- `npm pack --dry-run` from `cleargate-cli/`: unpacked size materially reduced (no `*.map` entries; payload tree appears once), file count drops accordingly.
- `cleargate init` in a scratch directory still scaffolds `.claude/` + `.cleargate/` correctly (templates resolved) — the install-manifest lands at `.cleargate/.install-manifest.json`.
- `grep` the dry-run manifest: 0 lines matching `\.map$`; `templates/cleargate-planning` path prefix appears under exactly one root.

---

## Context Source

> Discovery audit. Populated from the 2026-06-02 publish-run manifest and recorded owner direction.

**context_source:** 2026-06-02 cleargate@0.14.0 `npm pack --dry-run` manifest (9.4 MB packed / 53.4 MB unpacked / 221 files; ~30 MB sourcemaps; payload under both `templates/` and `dist/templates/`) + owner-directed filing 2026-06-02. See [[reference_npm_publish_cleargate]].

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟡 Medium Ambiguity — recorded follow-up, not yet Gate-1-approved**

*Evaluate each criterion against its literal text. If you substituted an interpretation, leave the box unchecked and surface the substitution in the Brief.*

Requirements to pass to Green (Ready for Execution):
- [x] "Obsolete Logic" to be evicted is explicitly declared.
- [x] All impacted downstream Epics/Stories are identified and reverted to 🔴 High Ambiguity. — *No downstream Epic/Story depends on this leaf hygiene fix; the only cross-item coupling is the shared `npm pack` tarball assertion, flagged in §2 (CR-075). Nothing to revert.*
- [x] Execution Sandbox contains exact file paths.
- [x] Verification command is provided.
- [ ] `approved: true` is set in the YAML frontmatter. — *Intentionally Draft. Owner directed filing; approval is a separate Gate-1 step pending the §0.5 decisions (esp. the which-payload-copy verification).*
- [x] Existing Surfaces cites at least one source-tree path the CR extends.
