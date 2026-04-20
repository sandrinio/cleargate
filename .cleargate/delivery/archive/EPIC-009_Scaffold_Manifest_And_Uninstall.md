---
epic_id: EPIC-009
status: Draft
ambiguity: 🟢 Low
context_source: PROPOSAL-006_Scaffold_Manifest_And_Uninstall.md
owner: Vibe Coder (sandro.suladze@gmail.com)
target_date: TBD
created_at: 2026-04-19T00:00:00Z
updated_at: 2026-04-19T00:00:00Z
created_at_version: post-SPRINT-04
updated_at_version: post-SPRINT-04
depends_on_epics:
  - EPIC-001
related_epics:
  - EPIC-008
approved: true
pushed_by: sandrinio@github.local
pushed_at: 2026-04-20T19:44:32.628Z
push_version: 3
---

# EPIC-009: Scaffold Manifest + Drift Detection + `cleargate uninstall`

## 0. AI Coding Agent Handoff

```xml
<agent_context>
  <objective>Give ClearGate a deterministic scaffold lifecycle. Ship (1) build-time MANIFEST.json declaring every file `cleargate init` installs (SHA256 + tier + policies); (2) `.install-manifest.json` snapshot written at init time; (3) `cleargate doctor --check-scaffold` for drift classification; (4) `cleargate upgrade` with three-way merge on `prompt-on-drift`; (5) `cleargate uninstall` with preservation categories, safety rails, and `.uninstalled` marker for future restore; (6) auto-generated CHANGELOG diff block at release time.</objective>
  <architecture_rules>
    <rule>Manifest is built at npm run build, shipped with the package — never computed at install time (PROP-006 Q1).</rule>
    <rule>File identifier is SHA256 over normalized content (LF, UTF-8, no-BOM, trailing-newline enforced) — no git dependency (PROP-006 Q2).</rule>
    <rule>Three surfaces compared pairwise: package manifest (shipped), install snapshot (.install-manifest.json), current state (live FS). 4 drift states per PROP-006 §2.4.</rule>
    <rule>Agent never auto-overwrites on upstream-changed drift. Agent emits a one-line advisory; `cleargate upgrade` is always human-initiated.</rule>
    <rule>Uninstall is SINGLE-TARGET — operates on the resolved `.cleargate/` (CWD or --path). Does NOT recurse into nested `.cleargate/` instances (PROP-006 Q5).</rule>
    <rule>Uninstall preservation defaults favor data retention: archive, FLASHCARD, pending drafts default to keep; protocol/templates/wiki/hook-log default to remove (PROP-006 §2.8).</rule>
    <rule>CLAUDE.md surgery uses a GREEDY regex between `<!-- CLEARGATE:START -->` and `<!-- CLEARGATE:END -->` markers (FLASHCARD 2026-04-19 #init #inject-claude-md #regex — the block body itself mentions both markers in prose).</rule>
    <rule>`cleargate doctor` is a shared command surface with EPIC-008 — first-to-ship creates the scaffold; second extends with its mode.</rule>
    <rule>tsup bundle assets: MANIFEST.json is a non-TS asset; must be listed in package.json `files[]` AND copied via a prebuild step (FLASHCARD 2026-04-19 #tsup #npm-publish #assets).</rule>
    <rule>`import.meta.url` resolves to the bundle file after tsup — thread a test seam for manifest-path resolution so tests bypass default lookup (FLASHCARD 2026-04-19 #tsup #bundle #import-meta).</rule>
    <rule>Scaffold-mirror discipline: every change must be reflected in BOTH cleargate-planning/ (shipped) AND .claude/ (dogfood); post-edit diff must be empty.</rule>
  </architecture_rules>
  <target_files>
    <file path="cleargate-cli/scripts/build-manifest.ts" action="create" />
    <file path="cleargate-cli/scripts/generate-changelog-diff.ts" action="create" />
    <file path="cleargate-cli/src/lib/sha256.ts" action="create" />
    <file path="cleargate-cli/src/lib/manifest.ts" action="create" />
    <file path="cleargate-cli/src/lib/claude-md-surgery.ts" action="create" />
    <file path="cleargate-cli/src/lib/settings-json-surgery.ts" action="create" />
    <file path="cleargate-cli/src/commands/init.ts" action="modify" />
    <file path="cleargate-cli/src/commands/doctor.ts" action="modify" />
    <file path="cleargate-cli/src/commands/upgrade.ts" action="create" />
    <file path="cleargate-cli/src/commands/uninstall.ts" action="create" />
    <file path="cleargate-cli/package.json" action="modify" />
    <file path="cleargate-planning/MANIFEST.json" action="create" />
    <file path=".cleargate/knowledge/cleargate-protocol.md" action="modify" />
  </target_files>
</agent_context>
```

## 1. Problem & Value

**Why are we doing this?**
Today there is no authoritative list of what `cleargate init` installs — if a user edits `cleargate-protocol.md` to add project-specific rules, a future `cleargate upgrade` cannot know whether to overwrite the file (loses user work) or skip it (user never sees the new upstream rules). A blanket `rm -rf .cleargate/` destroys accumulated `FLASHCARD.md` lessons, archived work items (with remote PM IDs), and sprint retrospectives. We need a manifest-driven scaffold lifecycle: install → upgrade (with drift classification) → uninstall (with preservation). Reversibility signals confidence to teams evaluating ClearGate; manifest + uninstall are the bookends.

**Success Metrics (North Star):**
- `cleargate doctor --check-scaffold` correctly classifies every tracked file into one of 4 states (clean / user-modified / upstream-changed / both-changed) on this repo.
- `cleargate upgrade --dry-run` on this repo produces the correct action plan for every file tier without executing anything.
- `cleargate uninstall --dry-run` on a test fixture removes all framework files + preserves FLASHCARD + archive + pending drafts; `cleargate init` after uninstall restores preserved items from the `.uninstalled` marker.
- CHANGELOG entries for future `@cleargate/cli` releases auto-open with a "Scaffold files changed" block generated from manifest diff.
- SessionStart (via EPIC-008's hook, once both ship) triggers drift-refresh at most once per day; agent surfaces upstream-changed items at triage without auto-overwriting.

## 2. Scope Boundaries

**✅ IN-SCOPE (Build This)**
- [ ] `sha256.ts` — normalized-content hasher (LF, UTF-8 no-BOM, trailing-newline enforced). Pure function; no deps beyond node:crypto.
- [ ] `manifest.ts` — load package manifest, load install snapshot, compute current SHAs, classify drift per PROP-006 §2.4. Emits `.drift-state.json`.
- [ ] `build-manifest.ts` — build-time script that walks `cleargate-planning/`, hashes every file, writes `cleargate-planning/MANIFEST.json`. Wired into `npm run build` via `prebuild`.
- [ ] `generate-changelog-diff.ts` — release-time script that diffs `MANIFEST.json` between the previous published version (via `npm show`) and the current one; produces a "## Scaffold files changed" block to prepend to CHANGELOG.md.
- [ ] `claude-md-surgery.ts` — surgical edit between `<!-- CLEARGATE:START -->` and `<!-- CLEARGATE:END -->` markers using GREEDY regex. Shared by init + uninstall.
- [ ] `settings-json-surgery.ts` — surgical remove of hook entries whose `command:` matches ClearGate-owned paths; preserves all other user config.
- [ ] `cleargate init` extension — write `.install-manifest.json` as final step; detect `.uninstalled` marker and offer restore-from-marker.
- [ ] `cleargate doctor --check-scaffold` — drift classification + `.drift-state.json` cache (daily-throttled on SessionStart).
- [ ] `cleargate upgrade [--dry-run]` — three-way merge driver; inline patch-style diff + `[k]eep mine / [t]ake theirs / [e]dit in $EDITOR`; incremental (per-file) execution with on-disk snapshot updated after each file (PROP-006 Q9).
- [ ] `cleargate uninstall [--dry-run] [--preserve <tier>,...] [--remove <tier>,...] [--yes] [--path <dir>]` — preservation flow per PROP-006 §2.7, typed-confirmation ceremony, `.uninstalled` marker write.
- [ ] Protocol §13 "Scaffold Manifest & Uninstall" added to `cleargate-protocol.md`.
- [ ] `cleargate-cli/package.json` updates: add `prebuild` script, include `MANIFEST.json` in `files[]`.
- [ ] Test fixtures for clean / user-modified / upstream-changed / both-changed scenarios (unit) and preservation categories (integration).

**❌ OUT-OF-SCOPE (Do NOT Build This)**
- Remote manifest verification / signed manifests / supply-chain attestation (v1.1).
- Automatic `cleargate upgrade` (always human-initiated in v1).
- Backup/restore beyond `.uninstalled` marker (git is the backup story).
- Version pinning per-file (file is either at package-SHA or not).
- External merge-tool integration (kdiff3 / vimdiff / etc.) — `cleargate config merge-tool` is a v1.1 knob.
- Schema migration on `.uninstalled` restore — blind-copy in v1 (PROP-006 Q6).
- Multi-remote federation for scaffold sources.

## 3. The Reality Check (Context)

| Constraint | Rule |
|---|---|
| Manifest timing | Built at `npm run build`, shipped in package. Never computed at install (PROP-006 Q1). |
| Identifier | SHA256 over normalized content (LF / UTF-8 / no-BOM / trailing-newline) (PROP-006 Q2). |
| Drift granularity | `user-artifact` tier (sha256:null) is silently skipped by `doctor --check-scaffold`; surfaces only in uninstall preview (PROP-006 Q8). |
| Drift refresh | Daily-throttled SessionStart + on-demand via `cleargate doctor --check-scaffold`. Agent can proactively invoke when context warrants (PROP-006 Q7). |
| Upgrade atomicity | Incremental (per-file). Successes stick even if later files fail; git is the revert safety net (PROP-006 Q9). |
| Uninstall scope | Single-target; does NOT recurse into nested `.cleargate/`. Operates on resolved CWD or `--path <dir>` (PROP-006 §2.10 + Q5). |
| Uninstall safety | Typed-confirmation (project name), `--dry-run` preview, default-keep on user artifacts (PROP-006 §2.10). |
| Pending drafts | Default keep with warn (PROP-006 Q4) — primary unrecoverable-loss risk. |
| CLAUDE.md surgery | GREEDY regex between markers (FLASHCARD #init #inject-claude-md #regex). Refuse with clear error if markers missing. |
| Settings.json surgery | Remove only hooks whose `command:` matches `.claude/hooks/{token-ledger,stamp-and-gate,session-start,wiki-*}.sh`; preserve all other user config. |
| tsup asset handling | MANIFEST.json must be in `files[]` + copied via prebuild (FLASHCARD #tsup #npm-publish #assets); `import.meta.url` seams for manifest resolution (FLASHCARD #tsup #bundle #import-meta). |
| CHANGELOG diff | Collapse content-identical entries (path-moved-only, metadata-changed-only) to avoid noise (PROP-006 Q10). |
| Doctor shared surface | First-to-ship (EPIC-008 or -009) creates base; second extends. If EPIC-008 ships first, `doctor.ts` already has `--session-start` mode — this Epic adds `--check-scaffold`. |

## 4. Technical Grounding

**MANIFEST.json entry shape** (from PROP-006 §2.3):

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
      "path": ".cleargate/FLASHCARD.md",
      "sha256": null,
      "tier": "user-artifact",
      "overwrite_policy": "never",
      "preserve_on_uninstall": "default-keep"
    }
  ]
}
```

**Drift state classification** (PROP-006 §2.4):

| installed_sha | current_sha | package_sha | State | Action |
|---|---|---|---|---|
| = | = | = | clean | none |
| = | ≠ installed | = installed | user-modified | warn; upgrade offers three-way merge |
| = | = installed | ≠ installed | upstream-changed | agent surfaces at triage |
| = | ≠ installed | ≠ installed & ≠ current | both-changed | upgrade requires three-way merge |
| — | — | absent | untracked | ignore |

**Preservation categories** (PROP-006 §2.8):

| Category | Paths | Default |
|---|---|---|
| Shipped work items | `.cleargate/delivery/archive/**` | keep |
| FLASHCARD.md | `.cleargate/FLASHCARD.md` | keep |
| Sprint retrospectives | `.cleargate/sprint-runs/*/REPORT.md` | keep |
| Pending drafts | `.cleargate/delivery/pending-sync/**` | keep (with warn) |
| Token ledgers | `.cleargate/sprint-runs/*/token-ledger.jsonl` | prompt |
| Protocol & templates | `.cleargate/knowledge/`, `.cleargate/templates/` | remove |
| Wiki | `.cleargate/wiki/` | remove |
| Hook logs | `.cleargate/hook-log/` | remove |

**Always-removed (no prompt):** framework agents under `.claude/agents/`, ClearGate hooks under `.claude/hooks/`, flashcard skill scaffold, ClearGate hook entries in `.claude/settings.json`, CLAUDE.md content between CLEARGATE markers, `@cleargate/cli` from `package.json`, `.cleargate/.install-manifest.json`, `.cleargate/.drift-state.json`.

**`.uninstalled` marker shape** (PROP-006 §2.9):

```json
{
  "uninstalled_at": "2026-04-19T11:00:00Z",
  "prior_version": "0.4.2",
  "preserved": [".cleargate/FLASHCARD.md", ".cleargate/delivery/archive/**", "..."],
  "removed": ["..."]
}
```

**Affected Files** (verified against current repo):
- `cleargate-cli/src/lib/` — 4 new files (sha256, manifest, claude-md-surgery, settings-json-surgery).
- `cleargate-cli/src/commands/` — extend init + doctor; create upgrade + uninstall.
- `cleargate-cli/scripts/` — 2 new build-time scripts.
- `cleargate-cli/package.json` — prebuild + files[] update.
- `cleargate-planning/MANIFEST.json` — new, build-time generated.
- `.cleargate/knowledge/cleargate-protocol.md` — new §13.

## 5. Acceptance Criteria

```gherkin
Feature: Scaffold manifest + uninstall

  Scenario: Build writes MANIFEST.json
    Given a clean cleargate-cli working tree
    When npm run build completes
    Then cleargate-planning/MANIFEST.json exists
    And every file under cleargate-planning/ (except user-artifact tier) has a sha256 entry

  Scenario: Install writes snapshot
    Given cleargate init runs on a fresh project
    When init completes
    Then .cleargate/.install-manifest.json is present with cleargate_version + installed_at + files[]

  Scenario: Drift classified on modified protocol
    Given a user edited cleargate-protocol.md after install
    When cleargate doctor --check-scaffold
    Then .drift-state.json lists the file as "user-modified"
    And stdout summary reports "1 file user-modified"

  Scenario: Upstream-changed advisory at agent triage
    Given a newer @cleargate/cli version with a new protocol SHA
    And user has not modified the file
    When the agent triage runs (reading .drift-state.json)
    Then agent emits one line "1 scaffold file has upstream updates: cleargate-protocol.md. Run `cleargate upgrade`."

  Scenario: Upgrade three-way merge
    Given both-changed state on cleargate-protocol.md
    When cleargate upgrade
    Then stdout renders inline patch-style diff
    And prompts [k]eep mine / [t]ake theirs / [e]dit in $EDITOR

  Scenario: Upgrade is incremental
    Given 3 files in prompt-on-drift state
    And the 2nd file's merge exits with an error
    When cleargate upgrade runs
    Then the 1st file is updated on disk
    And the 2nd file is unchanged
    And the 3rd file is still offered for merge
    And .install-manifest.json reflects the 1st file's new SHA

  Scenario: Uninstall dry-run
    When cleargate uninstall --dry-run
    Then stdout prints "Will remove N files, keep M files, update CLAUDE.md ..."
    And filesystem is unchanged

  Scenario: Uninstall preserves user artifacts
    When cleargate uninstall --yes (non-interactive for test)
    Then .cleargate/FLASHCARD.md persists
    And .cleargate/delivery/archive/** persists
    And .cleargate/delivery/pending-sync/** persists
    And .cleargate/knowledge/ is removed
    And .cleargate/templates/ is removed
    And .claude/agents/{architect,developer,qa,reporter}.md are removed
    And CLAUDE.md content between CLEARGATE markers is removed (surrounding content intact)
    And .cleargate/.uninstalled marker is written

  Scenario: Restore from marker
    Given .cleargate/.uninstalled marker exists
    When cleargate init runs in the same directory
    Then init prompts "Detected previous ClearGate install ... Restore preserved items? [Y/n]"
    And Y copies preserved files back into the new install

  Scenario: Uninstall refuses on missing CLAUDE.md markers
    Given CLAUDE.md exists but lacks the CLEARGATE:START/END markers
    When cleargate uninstall
    Then it exits non-zero with a clear error
    And no files are removed

  Scenario: CHANGELOG auto-opens with scaffold diff
    Given version 0.5.0 changes the hash of cleargate-protocol.md
    When generate-changelog-diff.ts runs for the 0.5.0 release
    Then CHANGELOG.md's 0.5.0 entry opens with "## Scaffold files changed" block
    And content-identical entries (path-moved only) are collapsed

  Scenario: user-artifact tier skipped silently
    Given FLASHCARD.md has diverged hashes between installs
    When cleargate doctor --check-scaffold
    Then FLASHCARD.md does NOT appear in drift output
    (it's user-owned; uninstall preview is where it surfaces)
```

## 6. AI Interrogation Loop — RESOLVED

All 6 questions resolved 2026-04-19 by Vibe Coder (accept all AI recommendations).

1. **Protocol section number** — **Resolved:** EPIC-009 takes §13. Chronological: EPIC-001 §11, EPIC-008 §12, EPIC-009 §13.
2. **`cleargate doctor` ownership** — **Resolved:** shared command surface. First-to-ship creates base; second extends. Consistent with EPIC-008 Q2.
3. **Uninstall + dogfood meta-repo** — **Resolved:** CI ships a `cleargate uninstall --dry-run` smoke test asserting preservation preview; NEVER run a wet uninstall in the meta-repo's CI. Full uninstall integration tests use throwaway tmp-dir fixtures.
4. **Settings.json surgery + SPRINT-04 `cleargate-wiki-ingest` hook** — **Resolved:** EPIC-008 STORY-008-06 explicitly removes the standalone wiki-ingest hook entry when registering stamp-and-gate (merge rather than duplicate). EPIC-009's surgery lib owns uninstall-time cleanup rules only. Cross-reference added to STORY-008-06 and STORY-009-06.
5. **Restore-from-marker integrity on renamed scaffold paths** — **Resolved:** accept the mismatch in v1. Log a warning during restore; user reconciles manually. Schema migration is a v1.1 concern per PROP-006 Q6.
6. **`--path <dir>` resolution semantics** — **Resolved:** require `.install-manifest.json` at the target path. If missing, print `"no ClearGate install detected at <path>"` and exit 0 — prevents pattern-match-based removal that would risk user data.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)

**Current Status: 🟢 Low Ambiguity — READY for Story execution**

Gate requirements (all met 2026-04-19):
- [x] PROPOSAL-006 has `approved: true`
- [x] `<agent_context>` block complete
- [x] §4 file paths verified against current repo
- [x] Cross-Epic dep on EPIC-001 declared
- [x] Cross-Epic coordination with EPIC-008 declared (shared `doctor` command + wiki-ingest hook cleanup)
- [x] §6 AI Interrogation Loop resolved
- [x] No TBDs in body
