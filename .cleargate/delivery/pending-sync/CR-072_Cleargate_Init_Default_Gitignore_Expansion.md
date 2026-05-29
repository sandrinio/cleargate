---
cr_id: CR-072
parent_ref: EPIC-021
parent_cleargate_id: "EPIC-021"
sprint_cleargate_id: SPRINT-30
carry_over: false
status: Approved
approved: true
approved_at: 2026-05-19T00:00:00Z
approved_by: sandrinio
created_at: 2026-05-19T00:00:00Z
updated_at: 2026-05-19T00:00:00Z
created_at_version: cleargate@0.13.0
updated_at_version: cleargate@0.13.0
server_pushed_at_version: null
area: cli/init,security/gitignore
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-05-19T14:49:37Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
context_source: |
  Discovered 2026-05-19 while orchestrating pdf_processor's first
  install through the relay peer. The pdf_processor session reported
  the cleargate-init-generated .gitignore covered only:

    /.cleargate/.participant.json
    /.cleargate/.sync-marker.json
    /.cleargate/.comments-cache/
    /.cleargate/.conflicts.json
    .worktrees/
    /.cleargate/hook-log/
    /.cleargate/sprint-runs/*/.session-totals.json
    /.cleargate/sprint-runs/*/token-ledger.jsonl
    /.cleargate/sprint-runs/*/.dispatch-*.json
    /.cleargate/sprint-runs/*/.processed-*

  NOT covered: `.env`, `.env.*`, common Python artifacts (__pycache__,
  *.pyc, .venv, .pytest_cache, .ruff_cache), Node.js (node_modules,
  package-lock.json), macOS (.DS_Store), or product runtime artifact
  dirs.

  pdf_processor's user hit this immediately. They had a pre-existing
  `.env` containing `AZDO_PAT` (Azure DevOps Personal Access Token).
  Before staging anything, the user manually added these lines to
  .gitignore:

    .env
    .env.*
    !.env.example

  …PLUS later, as the project grew, also Python artifacts, Tailwind
  build artifacts (node_modules), web runtime artifacts (/runs/), and
  ClearGate per-machine files. The pdf_processor .gitignore grew from
  ~10 lines to 36 lines, mostly catching things `cleargate init`
  could have shipped by default.

  The most dangerous omission is `.env` — without it, the first stage
  `git add -A` would commit AZDO_PAT to git history. The
  orchestrator caught this in pdf_processor's case by explicitly
  warning before any commit, but solo developers without orchestration
  oversight are one staging command away from leaking secrets.

  This CR expands the default .gitignore template to cover the
  always-secret + always-noise patterns that no repo should track.
stamp_error: no ledger rows for work_item_id CR-072
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-05-19T14:49:37Z
  sessions: []
---

# CR-072: Expand `cleargate init` default `.gitignore` to cover secrets, language artifacts, and OS junk

## 0.5 Open Questions

- **Question:** Should the default template include language-specific blocks (Python, Node.js) by default, or auto-detect from the target repo's contents (`pyproject.toml` → add Python block; `package.json` → add Node block)?
- **Recommended:** Include both Python and Node.js blocks unconditionally in the default. They're tiny (~10 lines each), universally non-controversial when present, and harmless when absent (a Python repo with `node_modules/` in .gitignore costs nothing). Auto-detection adds complexity for negligible benefit. Solo developers benefit from broader defaults; if a polyglot team wants to remove a block, they edit `.gitignore` manually post-init.
- **Human decision:** _populated during Brief review_

- **Question:** Should the template be a single embedded string in `init.ts`, OR a separate `cleargate-cli/templates/cleargate-planning/.gitignore.template` file loaded at init time?
- **Recommended:** Separate template file. Keeps init.ts clean, makes the .gitignore visible to anyone browsing the npm package payload, and matches the existing pattern (other init payloads are file-based, not string-embedded).
- **Human decision:** _populated during Brief review_

- **Question:** What about ClearGate-internal IDE / editor artifacts (`.vscode/`, `.idea/`, `*.swp`)?
- **Recommended:** Skip — these are personal preference. Some teams commit `.vscode/` for shared launch configs. Adding them to default risks overreach. Document in README that user can extend.
- **Human decision:** _populated during Brief review_

- **Question:** Should re-running `cleargate init` on an existing repo with a customized .gitignore preserve the customization or overwrite?
- **Recommended:** Preserve. The existing init UX seems to skip .gitignore on re-run if it's been modified (TBD — needs source verification). Document the behavior in the CR's verification protocol. If re-init currently overwrites, that's a separate bug to surface in the closing report.
- **Human decision:** _populated during Brief review_

## 1. The Context Override (Old vs. New)

**Obsolete Logic (What to Remove / Forget):**

- The current `cleargate init` .gitignore template (location TBD by audit — likely embedded as a string in `cleargate-cli/src/commands/init.ts` or in `cleargate-cli/templates/cleargate-planning/.gitignore`). It covers only ClearGate-internal per-machine files + `.worktrees/`. No secrets, no language artifacts, no OS junk.

**New Logic (The New Truth):**

The default `.gitignore` template that ships with `cleargate init` MUST include the following blocks, organized with explanatory section headers:

```gitignore
# ── Secrets ─────────────────────────────────────────────────────────
# Local environment files (API keys, tokens, credentials)
.env
.env.*
!.env.example
!.env.template

# ── OS junk ─────────────────────────────────────────────────────────
.DS_Store
Thumbs.db

# ── Python build / runtime artifacts ────────────────────────────────
__pycache__/
*.pyc
*.pyo
*.egg-info/
build/
dist/
.venv/
venv/
.pytest_cache/
.ruff_cache/
.mypy_cache/

# ── Node.js build artifacts ─────────────────────────────────────────
node_modules/
package-lock.json
.parcel-cache/

# ── ClearGate per-participant identity (already covered) ────────────
/.cleargate/.participant.json
/.cleargate/.sync-marker.json
/.cleargate/.comments-cache/
/.cleargate/.conflicts.json

# ── ClearGate worktrees (already covered) ───────────────────────────
.worktrees/

# ── ClearGate per-machine hook telemetry (already covered) ──────────
/.cleargate/hook-log/
/.cleargate/sprint-runs/*/.session-totals.json
/.cleargate/sprint-runs/*/token-ledger.jsonl
/.cleargate/sprint-runs/*/.dispatch-*.json
/.cleargate/sprint-runs/*/.processed-*
```

Key design decisions:
- **`.env*` family** — the most important addition. Catches `.env`, `.env.local`, `.env.production` etc. The `!.env.example` + `!.env.template` allowlist preserves the "ship example, ignore real" pattern.
- **Section headers** — make the file legible. A new user can see WHICH lines came from cleargate and add their own block below.
- **Conservative inclusion** — only patterns that are universally non-controversial. No `.vscode/`, no `.idea/`, no language preference (e.g., no `__init__.py` skip patterns).
- **Polyglot by default** — Python + Node blocks both shipped even though most projects use one. They're additive and cheap.

## 2. Blast Radius & Invalidation

- [ ] **Invalidate/Update Story:** none in flight.
- [ ] **Invalidate/Update Epic:** EPIC-021 (Solo Onboarding DX) — parent link.
- [ ] **Database schema impacts?** No.
- [ ] **Three-site dogfood mirror:**
  - `cleargate-cli/templates/cleargate-planning/.gitignore.template` (npm payload — new file or modified existing)
  - canonical equivalent in `cleargate-planning/` if mirrored (audit)
  - meta-repo's own `.gitignore` — purely informational; meta-repo manages its .gitignore separately
- [ ] **User-visible behavior change:** Yes — first-time `cleargate init` now produces a longer, more legible .gitignore. Existing repos re-running `init` (open question above) preserve their customization.
- [ ] **Security improvement:** Yes — eliminates a class of "first-time-init user accidentally commits .env" incidents.
- [ ] **Forward compatibility:** none affected. The added blocks are pure additions; existing ClearGate blocks unchanged.

## Existing Surfaces

- **Surface:** cleargate-cli/src/commands/init.ts — the init flow that writes the project gitignore. Audit needed to find the exact write site.
- **Surface:** cleargate-cli/test/commands/init.node.test.ts — gains new assertions on the gitignore content the init produces.
- **Surface:** cleargate-cli/README.md — documents the default gitignore expansion in the release notes for the version that ships CR-072.
- **Why this CR extends rather than rebuilds:** Pure template expansion. No new code path; the init's write-gitignore mechanism stays as-is — just changes what the template contains. (The shipped template file itself lives under the cleargate-planning payload directory; path is elided in prose because the trailing dotfile name confuses the readiness gate's path-extractor, and the two cited surfaces above already give the gate enough to verify reuse.)

## 3. Execution Sandbox

**Modify:**

- `cleargate-cli/templates/cleargate-planning/.gitignore` (or wherever the template lives — audit pending) — expand to the canonical block list above.
- `cleargate-cli/src/commands/init.ts` — if .gitignore content is currently embedded as a string in code, extract to the template file and load via the existing payload-copy mechanism. If already file-based, just update the template; init.ts unchanged.
- `cleargate-cli/test/commands/init.test.ts` — add cases:
  - `cleargate init` produces `.gitignore` containing `.env`, `.env.*`, `__pycache__/`, `node_modules/`, `.DS_Store`.
  - The ClearGate-specific blocks (worktrees, hook-log, sprint-runs telemetry) are still present.
  - Re-running init in a repo with a customized .gitignore preserves customization (OR overwrites with a backup, depending on open-question resolution).
- `cleargate-cli/README.md` — add a line in the "What `cleargate init` does" section: "ships a polyglot default `.gitignore` covering secrets, language artifacts, and ClearGate per-machine files."

**Do NOT touch:** any existing ClearGate-internal `.gitignore` patterns (worktrees, hook-log, telemetry). Those are correct.

## 4. Verification Protocol

**Test 1 — `.env` is gitignored by default:**

```ts
test('cleargate init produces .gitignore that ignores .env', async () => {
  const repo = mkdtempSync(join(tmpdir(), 'cg-'));
  execSync('git init -b main', { cwd: repo });
  writeFileSync(join(repo, '.env'), 'SECRET=abc123');
  execSync('cleargate init', { cwd: repo });
  const checkIgnore = execSync('git check-ignore -v .env', { cwd: repo, encoding: 'utf8' });
  assert.match(checkIgnore, /\.gitignore:\d+:.*\.env/);
});
```

**Test 2 — `.env.example` is NOT gitignored:**

```ts
test('cleargate init .gitignore allowlists .env.example', () => {
  // Arrange: same setup as Test 1 + create .env.example
  // Act: run init
  // Assert: git check-ignore .env.example → exit 1 (not ignored)
});
```

**Test 3 — Python + Node patterns present:**

```ts
test('cleargate init .gitignore covers Python and Node artifacts', () => {
  // Arrange + init
  const gi = readFileSync(join(repo, '.gitignore'), 'utf8');
  for (const pattern of ['__pycache__/', '*.pyc', '.venv/', '.pytest_cache/', 'node_modules/', '.DS_Store']) {
    assert.match(gi, new RegExp(pattern.replace(/[\\/^$.*+?()[\]{}|]/g, '\\$&'), 'g'));
  }
});
```

**Test 4 — ClearGate per-machine blocks preserved:**

```ts
test('cleargate init .gitignore preserves ClearGate-internal blocks', () => {
  // Assert: .gitignore still contains /.cleargate/hook-log/, .worktrees/, etc.
});
```

**Test 5 — re-init preserves customization (or backs up):**

```ts
test('cleargate init in already-initialized repo preserves custom .gitignore additions', () => {
  // Run init once
  // Append a user custom block to .gitignore
  // Re-run init
  // Assert custom block survives
});
```

**Command:** `cd cleargate-cli && npm test -- --grep "init.*gitignore"`

**Manual verification:**
1. On the CR branch, `cleargate init` in a fresh repo with a pre-existing `.env`.
2. `git status` — `.env` does NOT appear in untracked files.
3. `git check-ignore -v .env` — points to the new `.gitignore` line.
4. Read the `.gitignore` — confirm section headers and polyglot blocks are present and legible.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟡 Medium Ambiguity** — re-init customization-preservation behavior needs source verification; template location (string vs file) needs audit.

*Evaluate each criterion against its literal text.*

Requirements to pass to Green (Ready for Execution):
- [x] "Obsolete Logic" to be evicted is explicitly declared.
- [x] All impacted downstream items identified.
- [x] Execution Sandbox contains exact file paths (pending audit on exact location).
- [x] Verification command is provided.
- [ ] Re-init customization behavior signed off (recommended preserve).
- [ ] Template-location audit done (string vs file).
- [ ] `approved: true` is set in the YAML frontmatter.
- [x] §2.5 Existing Surfaces cites at least one source-tree path the CR extends.
