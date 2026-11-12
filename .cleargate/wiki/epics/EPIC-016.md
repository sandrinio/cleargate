---
type: epic
id: "EPIC-016"
parent: ""
children: 
  - "[[BUG-028]]"
  - "[[CR-059]]"
  - "[[STORY-016-01]]"
  - "[[STORY-016-02]]"
  - "[[STORY-016-03]]"
  - "[[STORY-016-04]]"
  - "[[STORY-016-05]]"
  - "[[STORY-016-06]]"
cites: []
cited_by: []
status: "Completed"
remote_id: ""
raw_path: ".cleargate/delivery/archive/EPIC-016_Upgrade_UX.md"
last_ingest: "2026-11-12T21:25:29.802Z"
last_ingest_commit: "5f8134f8b1ea5ad975d5687114fbf0f84ca1f53e"
repo: "planning"
---

# EPIC-016: Upgrade UX — Release Notifier, CHANGELOG, Meta-Repo Dogfood

**Status:** Completed · **Sprint:** none · **Gate:** fail: gherkin-error-path

## Objective
Close the three gaps in ClearGate's versioning UX: users have no way to learn a new cleargate release exists, no changelog to read when they do upgrade, and the meta-repo itself bypasses the upgrade flow so the UX is untested in our primary development loop.

## Problem & Value
**Why are we doing this?**
EPIC-009 shipped a complete upgrade *mechanism* (manifest + SHA + 3-way merge + surgery for CLAUDE.md / settings.json) but zero upgrade *UX*. Consequences:
- A user running `cleargate@0.1.0` has no signal that `0.2.1` ships a new wiki-lint check. They either notice by accident (`npm outdated`) or never upgrade.
- When they do upgrade, they see per-file diffs but no narrative of "what changed in this release / why." Merge decisions get made blind.

[+689 bytes not shown — read .cleargate/delivery/archive/EPIC-016_Upgrade_UX.md]

## Scope
**In:**
- [ ] `npm view cleargate version` (or equivalent registry lookup) with a 24h cache at `~/.cleargate/update-check.json`
- [ ] Update notifier surfaced via `cleargate doctor --session-start` (one line: "cleargate 0.3.0 available — run `cleargate upgrade` or `npx
**Out:**
- Auto-upgrade (the user still runs `cleargate upgrade` manually)
- Breaking-change lockouts / migration DSL (rely on merge-3way for now; revisit when we actually ship a breaker)
- GUI release viewer / admin-UI surface for version diff
- Registry lookups for

[+691 bytes not shown — read .cleargate/delivery/archive/EPIC-016_Upgrade_UX.md]

## Architecture rules
- Reuse the existing manifest + 3-way merge infrastructure from EPIC-009 — do NOT build a parallel upgrade path
- Registry checks must be opt-out (env var CLEARGATE_NO_UPDATE_CHECK=1) and throttled to ≤1/day to respect offline + CI environments
- CHANGELOG.md is the source of truth; upgrade output references it but does not duplicate its content inline
- No auto-upgrade — user still runs `cleargate upgrade` manually; this epic only surfaces that an upgrade is available

## Decisions
- **Q1. Where does the registry check fire?** Options: (a) `cleargate doctor --session-start` only; (b) every `cleargate` command; (c) Claude Code SessionStart hook.
  - **Recommended default:** (a). Minimum intrusion — the user already runs `doctor --session-start` daily per the M3 session-start hook.

[+1,286 bytes not shown — read .cleargate/delivery/archive/EPIC-016_Upgrade_UX.md]

<!-- BEGIN relations -->
## Relations
- Parent: none
- Children (8): [[BUG-028]], [[CR-059]], [[STORY-016-01]], [[STORY-016-02]], [[STORY-016-03]], [[STORY-016-04]], [[STORY-016-05]], [[STORY-016-06]]
<!-- END relations -->
