---
type: epic
id: "EPIC-058"
parent: ""
children: 
  - "[[BUG-100]]"
  - "[[BUG-101]]"
  - "[[BUG-103]]"
  - "[[BUG-105]]"
  - "[[BUG-110]]"
  - "[[BUG-114]]"
  - "[[BUG-115]]"
  - "[[BUG-116]]"
  - "[[STORY-058-01]]"
  - "[[STORY-058-02]]"
  - "[[STORY-058-03]]"
  - "[[STORY-058-04]]"
  - "[[STORY-058-05]]"
  - "[[STORY-058-06]]"
  - "[[STORY-058-07]]"
  - "[[STORY-058-08]]"
  - "[[STORY-058-09]]"
  - "[[STORY-058-10]]"
  - "[[STORY-058-11]]"
  - "[[STORY-058-12]]"
  - "[[STORY-058-13]]"
cites: 
  - "[[BUG-043]]"
  - "[[CR-105]]"
  - "[[PROPOSAL-074]]"
  - "[[SPRINT-34]]"
  - "[[STORY-058-12]]"
cited_by: 
  - "[[BUG-067]]"
  - "[[BUG-100]]"
  - "[[BUG-102]]"
  - "[[EPIC-060]]"
  - "[[EPIC-061]]"
  - "[[SPRINT-41]]"
  - "[[STORY-058-01]]"
  - "[[STORY-058-02]]"
  - "[[STORY-058-03]]"
  - "[[STORY-058-04]]"
  - "[[STORY-058-05]]"
  - "[[STORY-058-06]]"
  - "[[STORY-058-07]]"
  - "[[STORY-058-08]]"
  - "[[STORY-058-09]]"
  - "[[STORY-058-10]]"
  - "[[STORY-058-11]]"
  - "[[STORY-058-12]]"
  - "[[STORY-058-13]]"
  - "[[STORY-060-01]]"
  - "[[STORY-063-07]]"
  - "[[STORY-063-12]]"
status: "Draft"
remote_id: ""
raw_path: ".cleargate/delivery/pending-sync/EPIC-058_Additive_Multi_Host_Execution_Adapters.md"
last_ingest: "2026-11-13T01:02:08.963Z"
last_ingest_commit: "eac91c203dc0dc96a8db12fbb5cd29c53d069690"
repo: "planning"
---

# EPIC-058: Additive Multi-Host Execution Adapters

**Status:** Draft · **Sprint:** none · **Gate:** pass

## Objective
Make the npm-installed ClearGate scaffold natively support Claude Code, GitHub Copilot, and OpenAI Codex through additive host adapters that share one `.cleargate/**` core and can coexist in the same target repository.

## Problem & Value
**Why are we doing this?**
ClearGate's planning and enforcement model is broadly host-independent, but the npm package installs only Claude Code primitives: `CLAUDE.md`, `.claude/agents/**`, `.claude/skills/**`, `.claude/settings.json`, Claude hook payload assumptions, and Claude-specific lifecycle surgery.

[+2,250 bytes not shown — read .cleargate/delivery/pending-sync/EPIC-058_Additive_Multi_Host_Execution_Adapters.md]

## Scope
**In:**
- [ ] Move the canonical distributable scaffold into tracked paths inside `cleargate-cli`; remove the sibling `../cleargate-planning` prebuild dependency.
- [ ] Add a typed `HostAdapter` contract and registry for `claude`, `copilot`, and `codex`.
**Out:**
- Supporting Antigravity, Cursor, Windsurf, Cline, Aider, or hosts other than Claude Code, GitHub Copilot, and OpenAI Codex.
- Replacing the target repository's build system, test runner, CI provider, or deployment tooling.

[+3,495 bytes not shown — read .cleargate/delivery/pending-sync/EPIC-058_Additive_Multi_Host_Execution_Adapters.md]

## Architecture rules
- All production implementation and canonical npm payload sources MUST live inside the standalone `cleargate-cli` repository; the outer meta-repo and sibling `cleargate-planning/` directory MUST NOT be build-time dependencies.
- Preserve `cleargate init` as byte-compatible Claude installation behavior unless the user supplies a host flag.

[+1,972 bytes not shown — read .cleargate/delivery/pending-sync/EPIC-058_Additive_Multi_Host_Execution_Adapters.md]

## Decisions
No unresolved questions. The following decisions are integrated throughout this Epic:

- `--host portable` installs Copilot + Codex; `--host all` installs Claude + Copilot + Codex; explicit individual selectors remain available.
- `cleargate host remove <host>` ships in v1 so additive adapters can be surgically removed.
- Claude-only installs do not receive `AGENTS.md`; the no-flag Claude result remains backward-compatible.

<!-- BEGIN relations -->
## Relations
- Parent: none
- Children (21): [[BUG-100]], [[BUG-101]], [[BUG-103]], [[BUG-105]], [[BUG-110]], [[BUG-114]], [[BUG-115]], [[BUG-116]], [[STORY-058-01]], [[STORY-058-02]], [[STORY-058-03]], [[STORY-058-04]], [[STORY-058-05]], [[STORY-058-06]], [[STORY-058-07]], [[STORY-058-08]], [[STORY-058-09]], [[STORY-058-10]], [[STORY-058-11]], [[STORY-058-12]], +1 more
- Cites (5): [[BUG-043]], [[CR-105]], [[PROPOSAL-074]], [[SPRINT-34]], [[STORY-058-12]]
- Cited by (22): [[BUG-067]], [[BUG-100]], [[BUG-102]], [[EPIC-060]], [[EPIC-061]], [[SPRINT-41]], [[STORY-058-01]], [[STORY-058-02]], [[STORY-058-03]], [[STORY-058-04]], [[STORY-058-05]], [[STORY-058-06]], [[STORY-058-07]], [[STORY-058-08]], [[STORY-058-09]], [[STORY-058-10]], [[STORY-058-11]], [[STORY-058-12]], [[STORY-058-13]], [[STORY-060-01]], +2 more
<!-- END relations -->
