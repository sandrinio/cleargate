---
epic_id: EPIC-016
status: Draft
approved: true
approved_at: 2026-04-30T00:00:00Z
approved_by: sandrinio
ambiguity: 🟡 Medium
context_source: "Direct-epic waiver (2026-04-24 conversation on ClearGate versioning). No separate PROPOSAL filed. Inline references: (a) cleargate@0.2.1 currently on npm with install-manifest + merge-3way upgrade flow shipped in EPIC-009 (STORY-009-01..08); (b) verified gaps — no npm-registry notifier, no CHANGELOG surface, and the meta-repo bypasses `cleargate init`/`upgrade` entirely (edits cleargate-planning/ in place); (c) relevant code: cleargate-cli/src/commands/upgrade.ts, doctor.ts (--check-scaffold, --session-start), lib/manifest.ts (Tier + overwrite_policy)."
owner: sandro
target_date: 2026-06-01
created_at: 2026-04-24T00:00:00Z
updated_at: 2026-04-24T00:00:00Z
created_at_version: strategy-phase-pre-init
updated_at_version: strategy-phase-pre-init
server_pushed_at_version: null
cached_gate_result:
  pass: false
  failing_criteria:
    - id: proposal-approved
      detail: "linked file not found: Direct-epic waiver (2026-04-24 conversation on ClearGate versioning). No separate PROPOSAL filed. Inline references: (a) cleargate@0.2.1 currently on npm with install-manifest + merge-3way upgrade flow shipped in EPIC-009 (STORY-009-01..08); (b) verified gaps — no npm-registry notifier, no CHANGELOG surface, and the meta-repo bypasses `cleargate init`/`upgrade` entirely (edits cleargate-planning/ in place); (c) relevant code: cleargate-cli/src/commands/upgrade.ts, doctor.ts (--check-scaffold, --session-start), lib/manifest.ts (Tier + overwrite_policy)."
    - id: no-tbds
      detail: 1 occurrence at §10
    - id: affected-files-declared
      detail: section 4 has 0 listed-item (≥1 required)
  last_gate_check: 2026-04-24T08:21:25Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id EPIC-016
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-04-24T08:21:25Z
  sessions: []
---

# EPIC-016: Upgrade UX — Release Notifier, CHANGELOG, Meta-Repo Dogfood

## 0. AI Coding Agent Handoff

```xml
<agent_context>
  <objective>Close the three gaps in ClearGate's versioning UX: users have no way to learn a new cleargate release exists, no changelog to read when they do upgrade, and the meta-repo itself bypasses the upgrade flow so the UX is untested in our primary development loop.</objective>
  <architecture_rules>
    <rule>Reuse the existing manifest + 3-way merge infrastructure from EPIC-009 — do NOT build a parallel upgrade path</rule>
    <rule>Registry checks must be opt-out (env var CLEARGATE_NO_UPDATE_CHECK=1) and throttled to ≤1/day to respect offline + CI environments</rule>
    <rule>CHANGELOG.md is the source of truth; upgrade output references it but does not duplicate its content inline</rule>
    <rule>No auto-upgrade — user still runs `cleargate upgrade` manually; this epic only surfaces that an upgrade is available</rule>
  </architecture_rules>
  <target_files>
    <file path="cleargate-cli/src/commands/doctor.ts" action="modify" />
    <file path="cleargate-cli/src/lib/registry-check.ts" action="create" />
    <file path="cleargate-cli/CHANGELOG.md" action="create" />
    <file path="cleargate-cli/src/commands/upgrade.ts" action="modify" />
    <file path="cleargate-cli/src/commands/init.ts" action="modify" />
  </target_files>
</agent_context>
```

## 1. Problem & Value

**Why are we doing this?**
EPIC-009 shipped a complete upgrade *mechanism* (manifest + SHA + 3-way merge + surgery for CLAUDE.md / settings.json) but zero upgrade *UX*. Consequences:
- A user running `cleargate@0.1.0` has no signal that `0.2.1` ships a new wiki-lint check. They either notice by accident (`npm outdated`) or never upgrade.
- When they do upgrade, they see per-file diffs but no narrative of "what changed in this release / why." Merge decisions get made blind.
- The meta-repo (this one) edits `cleargate-planning/` directly and never runs `cleargate init` / `upgrade`. We dogfood the *protocol* but not the *distribution*. Bugs in upgrade UX would ship to downstream users untested.

**Success Metrics (North Star):**
- A user on `N-1` sees a one-line notification within 24 h of running any `cleargate` command or a Claude Code session-start.
- `cleargate upgrade` prints (or links to) a release-notes block covering every version between installed and current before prompting for merges.
- The meta-repo has a documented path to consume `cleargate-planning/` as if it were an installed package, so the upgrade flow is exercised on every release.

## 2. Scope Boundaries

**✅ IN-SCOPE (Build This)**
- [ ] `npm view cleargate version` (or equivalent registry lookup) with a 24h cache at `~/.cleargate/update-check.json`
- [ ] Update notifier surfaced via `cleargate doctor --session-start` (one line: "cleargate 0.3.0 available — run `cleargate upgrade` or `npx cleargate-changelog`")
- [ ] Opt-out env var `CLEARGATE_NO_UPDATE_CHECK=1` + respect of `NO_COLOR` / CI-detection
- [ ] `CHANGELOG.md` at `cleargate-cli/CHANGELOG.md` with one section per published version
- [ ] `cleargate upgrade` prints the CHANGELOG delta (from installed version to package version) before starting the merge loop
- [ ] Meta-repo dogfood path: a documented / scripted way to run `cleargate init --from-source ./cleargate-planning` so this repo's scaffold is installed via the same code path downstream users hit

**❌ OUT-OF-SCOPE (Do NOT Build This)**
- Auto-upgrade (the user still runs `cleargate upgrade` manually)
- Breaking-change lockouts / migration DSL (rely on merge-3way for now; revisit when we actually ship a breaker)
- GUI release viewer / admin-UI surface for version diff
- Registry lookups for anything other than the `cleargate` CLI package (no MCP server / admin-API version tracking yet)
- Signed releases / provenance attestation (separate concern)

## 3. The Reality Check (Context)

| Constraint Type | Limit / Rule |
|---|---|
| Privacy | Registry check hits `registry.npmjs.org` only — no telemetry, no phone-home to a ClearGate-controlled endpoint |
| Offline | Registry failure (DNS, timeout, 5xx) must be silent — cached result or no output; never block the user's command |
| Throttle | At most 1 registry check per 24h per user home dir; cache file is `~/.cleargate/update-check.json` |
| Compatibility | CHANGELOG.md must be valid Common Changelog (https://common-changelog.org/) — one section per version, most-recent first |
| Meta-repo | `cleargate init --from-source` must not break the existing downstream `cleargate init` (which resolves the scaffold from the installed npm package) |

## 4. Technical Grounding

**Affected Files:**
- `cleargate-cli/src/lib/registry-check.ts` — new: fetch latest npm version, cache write/read, respect opt-out
- `cleargate-cli/src/commands/doctor.ts` — `--session-start` mode gains an update-available line after the existing blocked-items summary
- `cleargate-cli/src/commands/upgrade.ts` — before the merge loop, print CHANGELOG delta from installed version to package version
- `cleargate-cli/CHANGELOG.md` — new file, backfilled with sections for 0.1.0 → 0.2.1 (best-effort from git log)
- `cleargate-cli/src/commands/init.ts` — support `--from-source <path>` for meta-repo dogfood (resolves scaffold from a local directory instead of the installed npm package)
- `cleargate-cli/package.json` — no version change; `CHANGELOG.md` added to the `files` array so it ships in the npm tarball

**Data Changes:**
- `~/.cleargate/update-check.json` — new cache file `{ checked_at: ISO, latest_version: string }`. Per-user, not per-repo. Never checked into git.

## 5. Acceptance Criteria

```gherkin
Feature: Upgrade UX

  Scenario: Registry check surfaces on session-start
    Given cleargate 0.2.1 is installed and registry reports 0.3.0 as latest
    And CLEARGATE_NO_UPDATE_CHECK is unset
    When `cleargate doctor --session-start` runs
    Then stdout contains "cleargate 0.3.0 available (current: 0.2.1)"

  Scenario: Opt-out suppresses notification
    Given CLEARGATE_NO_UPDATE_CHECK=1 is set
    When `cleargate doctor --session-start` runs
    Then no update-available line appears in stdout

  Scenario: Offline failure is silent
    Given the npm registry is unreachable
    When `cleargate doctor --session-start` runs
    Then no stderr is emitted
    And exit code is 0

  Scenario: 24h throttle honored
    Given `~/.cleargate/update-check.json` has checked_at 1 hour ago
    When `cleargate doctor --session-start` runs
    Then no network request is made
    And the cached latest_version is used for the notification

  Scenario: Upgrade prints CHANGELOG delta
    Given installed version 0.1.0 and package version 0.2.1
    When `cleargate upgrade --dry-run` runs
    Then stdout contains the CHANGELOG sections for 0.2.0 and 0.2.1
    And the delta is printed before the per-file plan

  Scenario: Meta-repo dogfood
    Given the meta-repo contains `cleargate-planning/`
    When `cleargate init --from-source ./cleargate-planning` runs
    Then the scaffold is installed from the local directory
    And a subsequent `cleargate doctor --check-scaffold` reports "clean" for all tiered files
```

## 6. AI Interrogation Loop

- **Q1. Where does the registry check fire?** Options: (a) `cleargate doctor --session-start` only; (b) every `cleargate` command; (c) Claude Code SessionStart hook.
  - **Recommended default:** (a). Minimum intrusion — the user already runs `doctor --session-start` daily per the M3 session-start hook.

- **Q2. Which CHANGELOG format?** Options: (a) Common Changelog / Keep-a-Changelog style `CHANGELOG.md`; (b) structured JSON ledger; (c) GitHub Releases only.
  - **Recommended default:** (a) Common Changelog — simplest, human-readable, works without a network call.

- **Q3. How does the meta-repo "dogfood" install actually work?** Options: (a) `cleargate init --from-source ./cleargate-planning` copies files as an install; (b) a symlink-based `--dev` mode so edits hot-reload; (c) skip dogfood, add an integration test instead.
  - **Recommended default:** (a) copy semantics — matches downstream behavior exactly, no hidden behavior divergence. Integration test covers it.

- **Q4. Breaking-change semantics for semver-major bumps?** Options: (a) merge-3way handles it case-by-case (status quo); (b) lockout upgrade unless `--breaking-change` flag is passed; (c) per-entry migration hooks in MANIFEST.
  - **Recommended default:** (a) for now. Revisit when we actually ship `1.0.0`.

- **Q5. Should `cleargate upgrade` itself bump the install-manifest's `cleargate_version` field, or does that happen elsewhere?**
  - **Recommended default:** Yes — bump `cleargate_version` at the end of the upgrade loop, alongside the per-file SHA updates. Matches installed-at semantics.

## 7. Stories (Decomposition — to be fleshed out at sprint prep)

| ID | Title | Complexity | Notes |
|---|---|---|---|
| STORY-016-01 | Registry-check library + cache | L2 | `lib/registry-check.ts`; unit tests with injected fetcher |
| STORY-016-02 | doctor --session-start surfaces notifier | L1 | integration with runSessionStart |
| STORY-016-03 | CHANGELOG.md backfill + ship in npm tarball | L1 | backfill 0.1.0 → 0.2.1 from git log |
| STORY-016-04 | upgrade prints CHANGELOG delta | L2 | parse CHANGELOG; slice between versions; print before plan |
| STORY-016-05 | init --from-source for meta-repo dogfood | L2 | resolve scaffold from local dir; preserve existing behavior |
| STORY-016-06 | Integration test: dogfood install → doctor clean | L2 | E2E test that exercises the full upgrade loop |

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟡 Medium Ambiguity**

Requirements to pass to Green:
- [ ] §6 AI Interrogation Loop answered by human (5 questions)
- [ ] Story decomposition in §7 fleshed into individual story files before sprint assembly
- [ ] Confirm Common Changelog vs. Keep-a-Changelog format choice
- [ ] 0 TBDs

**Sprint placement:** Filed as stub for future sprint assembly. Do NOT include in SPRINT-11 (hygiene sprint stays tight on EPIC-015 only).
