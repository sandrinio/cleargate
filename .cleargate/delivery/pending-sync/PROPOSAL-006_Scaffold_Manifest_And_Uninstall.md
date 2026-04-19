---
proposal_id: "PROP-006"
status: "Approved"
author: "AI Agent (cleargate planning)"
approved: true
approved_at: "2026-04-19T00:00:00Z"
approved_by: "Vibe Coder (sandro.suladze@gmail.com)"
created_at: "2026-04-19T00:00:00Z"
updated_at: "2026-04-19T00:00:00Z"
codebase_version: "post-SPRINT-03"
depends_on: ["PROP-001"]
related: ["PROP-005"]
draft_tokens:
  input: null
  output: null
  cache_read: null
  cache_creation: null
  model: null
---

# PROPOSAL-006: Scaffold Manifest + Drift Detection + `cleargate uninstall`

## 1. Initiative & Context

### 1.1 Objective
Give ClearGate a deterministic scaffold lifecycle by shipping two paired capabilities:

1. **Scaffold manifest + drift detection** — a canonical `MANIFEST.json` ships with `@cleargate/cli` declaring every file `cleargate init` installs, each with a SHA256 identifier and tier classification. An install-time snapshot at `.cleargate/.install-manifest.json` records what's actually on disk. `cleargate doctor --check-scaffold` compares the three surfaces (package / install / current) and reports *clean / user-modified / upstream-changed / both-changed* per file. When an agent detects upstream drift during triage it surfaces a one-line alert — never auto-overwrites.
2. **`cleargate uninstall`** — a clean removal command with preservation prompts for the artifacts a Vibe Coder has accumulated (FLASHCARD.md, shipped work items, sprint reports, ledgers). Always removes framework files (agents, hooks, protocol, templates, wiki, CLAUDE.md injection block). Writes a `.cleargate/.uninstalled` marker so a future `cleargate init` in the same project can restore preserved items.

The two capabilities ship together because they share one canonical data source — the manifest — and form the bookends of the scaffold lifecycle: **install** (manifest seeds the scaffold) → **upgrade** (drift detection drives safe updates) → **uninstall** (manifest distinguishes framework files from user artifacts). An uninstall without a manifest cannot surgically remove only framework files; a manifest without an uninstall is incomplete coverage of the install lifecycle.

**Scope relationship to [PROPOSAL-005](./PROPOSAL-005_Token_Cost_And_Readiness_Gates.md):** PROP-005 covers per-work-item token stamping + readiness gates. PROP-006 covers the scaffold-lifecycle (install / upgrade / uninstall). The two were split on 2026-04-19 (Q19) because they share no runtime surface — PROP-005 touches work-item frontmatter + gate predicates; PROP-006 touches the scaffold itself + installer machinery. They can ship in either order.

### 1.2 The "Why"

- **Manifest kills the "is this file mine or ClearGate's?" question.** Today there is no authoritative list of what `cleargate init` installs. If the user edits `cleargate-protocol.md` to add project-specific rules, a future `cleargate upgrade` cannot know whether to overwrite the file (user-local customization gets lost) or skip it (user never sees the new upstream rules). A SHA-tracked manifest resolves this deterministically: compare installed-SHA ↔ current-SHA ↔ package-SHA, pick the right merge strategy per case.
- **Drift detection is a cheap triage signal.** A SessionStart or doctor refresh computes drift once per day and caches it to `.cleargate/.drift-state.json`. The agent reads a one-line summary ("3 scaffold files have upstream updates") for ~20 tokens instead of diffing the protocol against memory.
- **Uninstall respects accumulated Vibe-Coder value.** The most valuable things a Vibe Coder creates over months of ClearGate use — `FLASHCARD.md` lessons, archived work items with remote PM IDs, sprint retrospectives — must survive framework removal. A blanket `rm -rf .cleargate/` destroys that. Preservation prompts make asymmetric defaults explicit: flashcards and archive default to *keep*; protocol and templates default to *remove*. This lowers the cost of *trying* ClearGate (easy to remove) without creating a footgun for long-term users.
- **Lowers adoption risk.** Reversibility signals confidence. Teams evaluating ClearGate are more willing to commit when they know they can back out cleanly — and that the framework itself knows how to leave the way it came in.
- **Enables meta-repo dogfooding.** This repo itself runs ClearGate; manifest + uninstall give us a credible way to test bootstrap + teardown cycles without manual cleanup.

### 1.3 Non-Goals

- No version pinning per-file (a file is either at package-SHA or not — we don't track partial version graphs).
- No remote manifest verification (e.g. signed manifests, supply-chain attestation) — v1.1 concern.
- No automatic `cleargate upgrade` — upgrade is always explicit and human-initiated. Drift is surfaced, not acted on.
- No backup / restore beyond the `.uninstalled` marker. If the Vibe Coder wants true backups, that's git's job.

---

## 2. Technical Architecture & Constraints

### 2.1 Dependencies

- **PROP-001** (hard) — `codebase_version` stamping pattern is the reference implementation for "read, hash, compare" logic used by the manifest system. Shares the stamping helper conventions.
- **PROP-005** (soft, related) — if both ship, `cleargate doctor` grows two modes (`--session-start` for gate summary, `--check-scaffold` for drift). They coexist cleanly; neither blocks the other.
- **Node.js crypto** — SHA256 hashing. No external dep.
- **@cleargate/cli build pipeline** — must add `build:manifest` step. No new build infrastructure; extends the existing npm scripts.

### 2.2 Manifest Surfaces

Three surfaces — compared pairwise to decide what action is safe.

| Surface | Path | Authored by | Purpose |
|---|---|---|---|
| **Package manifest** | `cleargate-planning/MANIFEST.json` (shipped with `@cleargate/cli`) | Build step (`npm run build:manifest`) hashes every file under `cleargate-planning/` and records it | Canonical "what does THIS version of ClearGate install" |
| **Install snapshot** | `.cleargate/.install-manifest.json` | Written by `cleargate init` at install time — a frozen copy of the package manifest for the installed version | Canonical "what was installed HERE, at what version" |
| **Current state** | live filesystem | live | What is actually on disk right now |

### 2.3 Manifest Entry Shape

```json
{
  "cleargate_version": "0.4.2",
  "installed_at": "2026-04-19T10:00:00Z",
  "files": [
    {
      "path": ".cleargate/knowledge/cleargate-protocol.md",
      "sha256": "a1b2c3...",
      "tier": "protocol",
      "overwrite_policy": "prompt-on-drift",
      "preserve_on_uninstall": "default-remove"
    },
    {
      "path": ".cleargate/templates/proposal.md",
      "sha256": "c3d4e5...",
      "tier": "template",
      "overwrite_policy": "prompt-on-drift",
      "preserve_on_uninstall": "default-remove"
    },
    {
      "path": ".cleargate/FLASHCARD.md",
      "sha256": null,
      "tier": "user-artifact",
      "overwrite_policy": "never",
      "preserve_on_uninstall": "default-keep"
    }
  ]
}
```

Enumerations:

- `tier` ∈ `{protocol, template, agent, hook, skill, cli-config, user-artifact, derived}` — drives uninstall defaults.
- `overwrite_policy` ∈ `{always, prompt-on-drift, never}` — governs `cleargate upgrade` behavior per file.
- `preserve_on_uninstall` ∈ `{default-keep, default-remove, always-remove, prompt}` — governs `cleargate uninstall` defaults.
- `sha256` is null for `user-artifact` tier (we never claim to know its content).

### 2.4 Drift States

Computed by `cleargate doctor --check-scaffold` for each manifest entry.

| installed_sha | current_sha | package_sha | State | Action |
|---|---|---|---|---|
| = | = | = | **clean** | none |
| = | ≠ installed | = installed | **user-modified** | warn; `cleargate upgrade` offers diff + "keep mine / take theirs / three-way" |
| = | = installed | ≠ installed | **upstream-changed** | agent surfaces "new version available for this file" at next triage |
| = | ≠ installed | ≠ installed & ≠ current | **both-changed** | `cleargate upgrade` requires three-way merge |
| — | — | absent from manifest | **untracked** | left alone; may be project file |

**Agent-facing drift signal:** at triage (SessionStart or first triage tool), the agent reads `.cleargate/.install-manifest.json` and the cached `.cleargate/.drift-state.json` (refreshed by `cleargate doctor` — throttled to once per day). If any `upstream-changed` or `both-changed` entries exist, agent emits one line: *"3 scaffold files have upstream updates: cleargate-protocol.md, proposal.md, story.md. Run `cleargate upgrade` to review."* The agent never auto-overwrites.

### 2.5 File Identifier

SHA256 over normalized content — LF-only line endings, trailing-newline enforced, UTF-8 no-BOM. Display the first 8 hex chars when human-readable output is needed. Deterministic across OSes without needing git.

**Interaction with PROP-001 `codebase_version`:** orthogonal. `codebase_version` in a work-item's frontmatter records the *target project's* commit SHA when the item was drafted. The manifest records the *ClearGate framework's* version. Both coexist.

### 2.6 `cleargate upgrade` Flow

1. Load package manifest + install snapshot + compute current SHA for every tracked file.
2. For each file, classify via §2.4 table.
3. Group by `overwrite_policy`:
   - `always` → overwrite silently.
   - `never` → skip silently (user artifacts).
   - `prompt-on-drift` → interactive prompt per file (keep mine / take theirs / three-way merge).
4. After each file: update `.install-manifest.json` to reflect the new on-disk SHA.
5. Refresh `.drift-state.json`.

`cleargate upgrade --dry-run` prints the plan without executing.

### 2.7 `cleargate uninstall`

**Invocation:**

```
cleargate uninstall [--dry-run] [--preserve <tier>,...] [--remove <tier>,...] [--yes] [--path <dir>]
```

**Flow (interactive default):**

1. Compute the file set from the install manifest.
2. Classify each path into one of the preservation categories (below).
3. Prompt per category (defaults shown in brackets).
4. Print summary: *"Will remove 34 files, keep 127 files, update CLAUDE.md to strip CLEARGATE block, remove `@cleargate/cli` from package.json dependencies."*
5. Require typed confirmation — user types the project name (same ceremony as `rm -rf` safeguards).
6. Execute. Write `.cleargate/.uninstalled` marker (§2.9).
7. Print a one-line restore hint if any items were preserved.

### 2.8 Preservation Categories

| # | Category | Paths | Default |
|---|---|---|---|
| 1 | **Shipped work items** | `.cleargate/delivery/archive/**` | **keep** — has remote PM IDs; losing this breaks traceability to Linear/Jira tickets |
| 2 | **FLASHCARD.md** | `.cleargate/FLASHCARD.md` | **keep** — accumulated lessons; portable to another framework |
| 3 | **Sprint retrospectives** | `.cleargate/sprint-runs/*/REPORT.md` | **keep** — historical audit trail |
| 4 | **Pending drafts** | `.cleargate/delivery/pending-sync/**` | **keep** (with warn) — drafts are user work; destroying is asymmetric loss |
| 5 | **Token ledgers** | `.cleargate/sprint-runs/*/token-ledger.jsonl` | **prompt** — raw usage data; some want it, most don't |
| 6 | **Protocol & templates** | `.cleargate/knowledge/`, `.cleargate/templates/` | **remove** — framework artifacts; dead weight without the framework |
| 7 | **Wiki** | `.cleargate/wiki/` | **remove** — derived; rebuildable if reinstalled |
| 8 | **Hook logs** | `.cleargate/hook-log/` | **remove** — transient |

**Always removed (no prompt):**

- `.claude/agents/{architect,developer,qa,reporter,cleargate-wiki-*}.md` — ClearGate-specific agent definitions (identified via manifest `tier: agent`).
- `.claude/hooks/{token-ledger,stamp-and-gate,session-start}.sh` — ClearGate hooks (whichever subset is installed; driven by manifest `tier: hook`).
- `.claude/skills/flashcard/` — scaffolded skill.
- `.claude/settings.json` hook entries matching ClearGate hook names (surgical edit; preserves unrelated user config).
- Content of `CLAUDE.md` between `<!-- CLEARGATE:START -->` and `<!-- CLEARGATE:END -->` markers (surrounding content intact).
- `@cleargate/cli` entry in `package.json` dependencies + `package-lock.json` regeneration.
- `.cleargate/.install-manifest.json` + `.cleargate/.drift-state.json` (replaced by `.uninstalled` marker).

### 2.9 `.cleargate/.uninstalled` Marker

```json
{
  "uninstalled_at": "2026-04-19T11:00:00Z",
  "prior_version": "0.4.2",
  "preserved": [".cleargate/FLASHCARD.md", ".cleargate/delivery/archive/**", "..."],
  "removed": ["..."]
}
```

A future `cleargate init` in the same project detects this marker and offers: *"Detected previous ClearGate install (uninstalled 2026-04-19). Restore preserved items into new install? [Y/n]"*. Restore is a blind copy for v1 — preserved files are user artifacts, not versioned framework files.

### 2.10 Safety Rails

- **Single-target operation** — uninstall acts on the `.cleargate/` at CWD (or `--path <dir>` if provided). It does **not** recurse into nested `.cleargate/` instances. Uninstalling the meta-repo does not touch `cleargate-planning/.cleargate/` and vice versa.
- **Typed confirmation** — user types the project name before execution (same ceremony as `rm -rf` safeguards). Primary mistake-catcher.
- `--dry-run` prints every action without executing — required for CI / scripted use.
- `--yes` skips the typed-confirmation ceremony; documented as dangerous.
- Refuses to run if the working tree has uncommitted changes to any manifest-tracked file unless `--force` is passed — protects against "I uninstalled and lost my in-progress protocol customization".
- If `.cleargate/` directory is empty after preservation filtering, remove the directory itself. Otherwise leave remaining files in place.
- **Recoverability assumption (Q5 resolution):** archived work items are pullable from the MCP remote via `cleargate_pull_initiative` (unless the PM-tool project was also deleted). Other user artifacts (FLASHCARD, pending drafts, sprint reports) default to **keep**. Framework files are reinstallable via `cleargate init`. Uninstall is therefore a reversible operation by design — no nested-repo refuse-by-default guard is needed.

### 2.11 System Constraints

| Constraint | Detail |
|---|---|
| Manifest generation timing | At `npm run build`, shipped in the npm package. Deterministic, reviewable in PR diffs; Vibe Coder never runs the hashing step. |
| Identifier scheme | SHA256 over normalized content. No git dependency; no per-file semver maintenance tax. |
| Manifest coverage | Only files installed by `cleargate init`. Project-created work items (e.g. `.cleargate/delivery/pending-sync/*`) are **untracked** in manifest — left alone by upgrade, categorized by uninstall rules. |
| Three-way merge UX | Print patch-style diff + three options (keep mine / take theirs / open in `$EDITOR` with conflict markers). External merge tools deferred to v1.1. |
| CLAUDE.md surgery | Edit only content between `<!-- CLEARGATE:START -->` and `<!-- CLEARGATE:END -->`. If markers are missing, refuse with a clear error (protects against corrupted CLAUDE.md). |
| `settings.json` surgery | Remove only hook entries whose command matches ClearGate-owned paths (`.claude/hooks/{token-ledger,stamp-and-gate,session-start,wiki-*}.sh`). Preserve all other user config. |
| Privacy | Manifest contains paths + hashes only; no user content or PII. |
| Idempotency | Re-running `doctor --check-scaffold` is a pure read. Re-running `upgrade` on a clean tree is a no-op. Re-running `uninstall` after successful uninstall prints "already uninstalled" and exits 0. |

### 2.12 CLI Surface

| Command | Purpose |
|---|---|
| `cleargate doctor --check-scaffold` | Compute drift state, write `.drift-state.json`, print summary. |
| `cleargate upgrade [--dry-run]` | Drive file updates per `overwrite_policy`; interactive prompts on drift. |
| `cleargate uninstall [...]` | §2.7 flow. |
| `cleargate init` | Extend existing command: write install snapshot + detect `.uninstalled` marker for restore prompt. |

Integration points:
- `cleargate init` writes `.install-manifest.json` as its final step (before any user prompts).
- SessionStart hook (if PROP-005 ships) invokes `cleargate doctor --check-scaffold` with a once-per-day throttle.

---

## 3. Scope Impact (Touched Files & Data)

### 3.1 Known Files — must be modified

**CLI commands:**
- `cleargate-cli/src/commands/init.ts` — write `.cleargate/.install-manifest.json` at install; detect `.uninstalled` marker and offer restore.
- `cleargate-cli/src/commands/doctor.ts` — add `--check-scaffold` mode (may be new file if PROP-005 hasn't shipped yet; otherwise extend).

**Build pipeline:**
- `cleargate-cli/package.json` — add `"build:manifest": "tsx scripts/build-manifest.ts"` and chain into `build`; include `MANIFEST.json` in published files list.

**Protocol:**
- `.cleargate/knowledge/cleargate-protocol.md` — add §12 "Scaffold Manifest & Uninstall" covering manifest surfaces, drift signals, and the uninstall ceremony.

### 3.2 Expected New Entities

**CLI source:**
- `cleargate-cli/src/commands/upgrade.ts` — three-way merge driver for scaffold files with `prompt-on-drift` policy.
- `cleargate-cli/src/commands/uninstall.ts` — preservation flow from §2.7.
- `cleargate-cli/src/lib/manifest.ts` — loads/compares package manifest, install snapshot, current state; emits drift state JSON.
- `cleargate-cli/src/lib/sha256.ts` — normalized-content hasher (LF, UTF-8, no-BOM).
- `cleargate-cli/src/lib/claude-md-surgery.ts` — surgical edit between CLEARGATE markers; reused by init + uninstall.
- `cleargate-cli/src/lib/settings-json-surgery.ts` — surgical edit of `.claude/settings.json` hook entries.
- `cleargate-cli/scripts/build-manifest.ts` — build-time hasher that writes `cleargate-planning/MANIFEST.json`.

**Runtime artifacts:**
- `cleargate-planning/MANIFEST.json` — canonical package manifest. Generated at build time, published with npm package.
- `.cleargate/.install-manifest.json` — written by `cleargate init`; never hand-edited.
- `.cleargate/.drift-state.json` — cached drift classification per tracked file.
- `.cleargate/.uninstalled` — written by `cleargate uninstall`; consumed by future `cleargate init`.

**Test fixtures:**
- `cleargate-cli/test/fixtures/manifest/` — clean / user-modified / upstream-changed / both-changed scenarios.
- `cleargate-cli/test/fixtures/uninstall/` — each preservation-category default, dry-run output, restore-from-marker.
- `cleargate-cli/test/fixtures/upgrade/` — three-way merge paths + policy-based skips.

### 3.3 MCP Adapter Impact

None. Manifest and uninstall are purely local-CLI concerns; MCP-pushed remote items aren't touched by scaffold lifecycle operations.

---

## 4. AI Interrogation Loop (Human Input Required)

*(Carried over from PROP-005's split on 2026-04-19. Numbering restarts at Q1 for this Proposal.)*

1. **Q — Manifest generation timing.** Generate `MANIFEST.json` at `npm run build` (shipped artifact) vs. at `cleargate init` time (computed at install, captures local env quirks)? Recommendation: at build time, shipped in the package. Deterministic, reviewable in PR diffs, and the Vibe Coder never runs the hashing step. Install copies it into `.install-manifest.json` verbatim.
   - **Human Answer:** **Build-time manifest, primarily internal with Vibe-Coder-facing derived views** (2026-04-19). The `MANIFEST.json` / `.install-manifest.json` files are machine-readable source-of-truth — Vibe Coders interact via derived commands (`cleargate doctor --check-scaffold`, `cleargate upgrade`, `cleargate uninstall` previews, auto-generated CHANGELOG entries). The raw JSON is available for debugging inspection but is not marketed as a user-facing artifact. Build-time generation keeps it deterministic and reviewable in PR diffs.

2. **Q — File identifier: SHA256 vs. git blob hash vs. semver-per-file.** Recommendation: SHA256 over normalized content. Git blob hash ties us to git (fails on non-git installs); per-file semver creates a maintenance tax (who bumps `proposal.md` to 1.2.0?). SHA256 is automatic, deterministic, and opaque.
   - **Human Answer:** **SHA256 over normalized content** (2026-04-19). LF line endings, UTF-8 no-BOM, trailing-newline enforced. First 8 hex chars shown in human-readable output. Zero human overhead, no git dependency.

3. **Q — Three-way merge UX on drift.** When `cleargate upgrade` hits a `both-changed` file, present diff inline in terminal, open `$EDITOR` with merge markers, or punt to a third-party merge tool? Recommendation: print a patch-style diff + three options (keep mine / take theirs / open in `$EDITOR` with conflict markers). Defer external merge-tool integration to v1.1.
   - **Human Answer:** **Inline patch-style diff + three choices** (2026-04-19). Option (a) — terminal-rendered diff followed by `[k]eep mine / [t]ake theirs / [e]dit in $EDITOR`. No external merge-tool dependency in v1; `cleargate config merge-tool` knob considered for v1.1 if power users ask.

4. **Q — Preservation defaults for pending drafts.** §2.8 #4 currently says **keep** (flipped from "prompt" during scoping). Confirm: is "keep with warning" correct, or should we prompt? Recommendation: **keep with warn**. Reasoning: the few users who *want* to wipe pending drafts can pass `--remove=pending-drafts`; the many who accidentally lose work cannot undo.
   - **Human Answer:** **Keep with warn, confirmed** (2026-04-19). Pending drafts default to preserve; `--remove=pending-drafts` is the opt-out. Pending drafts are not in MCP (never pushed), so this is the primary unrecoverable-loss risk in an uninstall — default-keep is the safe posture.

5. **Q — Uninstall in a nested-repo setup (meta-repo case).** This repo has `cleargate-planning/` as a dogfooded install plus `mcp/` as a nested git repo. Should `cleargate uninstall` refuse to run when multiple `.cleargate/` instances are detectable, to prevent accidentally nuking the wrong one? Recommendation: refuse by default; require `--path <dir>` to name the target install explicitly when ambiguity is detected.
   - **Human Answer:** **Drop the refuse-by-default guard. Allow uninstall to proceed.** (2026-04-19, Vibe Coder). Rationale: archived work items are recoverable via `cleargate_pull_initiative` from the MCP remote (unless the human also deleted the PM-tool project); FLASHCARD + pending drafts + sprint reports default to **keep** (§2.8); framework files are reinstallable via `cleargate init`. The actual blast radius of nuking the "wrong" install is bounded and recoverable. Keep the cheap safeguards that catch real mistakes: typed-confirmation ceremony (project name), `--dry-run` preview, default-keep on user artifacts. Add `--path <dir>` as an explicit-targeting affordance for scripted/CI use, not as a disambiguator. Uninstall operates on the `.cleargate/` at the resolved path; it does **not** recurse into nested `.cleargate/` instances — it's a single-target operation.

6. **Q — Restore-from-`.uninstalled` fidelity.** If the Vibe Coder preserved FLASHCARD.md + archive, uninstalled, then reinstalls six months later on a newer ClearGate version, should the restore blindly copy files in or pass them through a migration hook? Recommendation: blind copy for v1 — these are user artifacts, not versioned framework files. Schema migration (e.g. frontmatter field renames) becomes a v1.1 concern if/when we actually change the schema.
   - **Human Answer:** **Blind copy, v1** (2026-04-19). Vibe Coder note: cloud-sync contract is not yet defined — the multi-participant MCP sync story (future PROP-007) is still being observed. Until that contract exists, restore operates purely on local preserved artifacts, no schema migration. Schema-migration hooks get revisited in v1.1 alongside whatever the sync story decides about canonical frontmatter shapes.

7. **Q — Drift refresh trigger.** When should `.drift-state.json` be recomputed? Options: (a) every SessionStart, (b) daily-throttled SessionStart, (c) only on explicit `cleargate doctor --check-scaffold`. Recommendation: (b) — daily-throttled on SessionStart. Rationale: upstream package-SHA changes rarely within a single day; paying the hash cost more often is wasteful, and a 24h staleness window is acceptable for advisory signal. Vibe Coder can force-refresh with `doctor --check-scaffold`.
   - **Human Answer:** **Daily-throttled SessionStart + agent-driven refresh** (2026-04-19). Default: daily-throttled auto-refresh (as recommended). Addition: the agent itself can invoke `cleargate doctor --check-scaffold` when context warrants — e.g., Vibe Coder mentions running `npm update`, drift-state cache is approaching staleness before Gate 1/3, or the Vibe Coder asks a question whose answer depends on current scaffold state. The agent should also **proactively suggest** running the command when it notices upstream-changed entries that may be worth reviewing. `cleargate doctor --check-scaffold` must therefore be on the agent's permitted-tools list in `cleargate-planning/.claude/settings.json`.

8. **Q — Drift granularity on `user-artifact` tier.** Files like `FLASHCARD.md` have `sha256: null` in the manifest (we don't claim to know their content). Should `doctor --check-scaffold` report them at all, or silently skip? Recommendation: silently skip. These are user-owned; surfacing them as "clean" or "modified" is noise. They appear only in uninstall's preservation preview.
   - **Human Answer:** **Silently skip** (2026-04-19). `doctor --check-scaffold` ignores `user-artifact` tier entirely. They surface only in `uninstall` preservation previews where their identity matters.

9. **Q — `cleargate upgrade` bundling.** Should upgrade be transactional (all-or-nothing: if one file's merge fails, roll back the others) or incremental (each file handled independently, survivors stick)? Recommendation: incremental. Simpler to implement, easier to recover from; the user can always re-run upgrade for the files that failed. Transactional upgrade adds complexity (shadow directory + atomic rename) for marginal safety gain.
   - **Human Answer:** **Incremental** (2026-04-19). Each file handled independently; successes stick even if a later file fails. `cleargate doctor --check-scaffold` shows the mixed-state tree after any partial run; re-running `cleargate upgrade` is idempotent and resumes from where it stopped. Git provides the revert safety net for upgrades the Vibe Coder regrets. No shadow-directory machinery in v1.

10. **Q — Manifest diff publishing.** Should `@cleargate/cli` release notes include a "files changed in this release" section auto-generated from package-manifest diff between versions? Recommendation: yes — one-line-per-file summary at the top of CHANGELOG entries. Cheap to generate from the manifest; gives Vibe Coders upgrading a preview of what drift their existing installs will show.
    - **Human Answer:** **Yes, ship in v1** (2026-04-19). Each `@cleargate/cli` release's CHANGELOG entry auto-opens with a "Scaffold files changed" block generated from manifest diff vs. the previous version. Collapse content-identical entries (only path-moved or metadata-changed) to avoid noise. Gives Vibe Coders a preview of upcoming drift before running `cleargate upgrade`.

---

## Approval Gate

(Vibe Coder: Review this proposal. If the architecture and context are correct, answer the questions in §4 and set `approved: true` in the YAML frontmatter. Only then is the AI authorized to decompose into Epics/Stories.)
