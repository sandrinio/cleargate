---
type: sprint
id: "SPRINT-41"
parent: ""
children: 
  - "[[EPIC-058]]"
cites: 
  - "[[BUG-024]]"
  - "[[BUG-067]]"
  - "[[BUG-068]]"
  - "[[BUG-069]]"
  - "[[BUG-085]]"
  - "[[BUG-089]]"
  - "[[BUG-090]]"
  - "[[BUG-091]]"
  - "[[BUG-096]]"
  - "[[BUG-097]]"
  - "[[BUG-098]]"
  - "[[CR-026]]"
  - "[[CR-108]]"
  - "[[CR-123]]"
  - "[[CR-124]]"
  - "[[EPIC-055]]"
  - "[[EPIC-058]]"
  - "[[PROPOSAL-074]]"
  - "[[SPRINT-34]]"
  - "[[STORY-058-01]]"
  - "[[STORY-058-06]]"
  - "[[STORY-058-07]]"
  - "[[STORY-058-09]]"
  - "[[STORY-058-10]]"
cited_by: 
  - "[[BUG-067]]"
  - "[[BUG-087]]"
  - "[[BUG-090]]"
  - "[[BUG-096]]"
  - "[[BUG-098]]"
  - "[[BUG-099]]"
status: "Completed"
remote_id: ""
raw_path: ".cleargate/delivery/archive/SPRINT-41_multi_host_adapters_and_frontmatter_locator.md"
last_ingest: "2026-11-13T01:02:08.963Z"
last_ingest_commit: "6152464d5852f1bccc42d4b56df816054613b129"
repo: "planning"
report_raw_path: ".cleargate/sprint-runs/SPRINT-41/SPRINT-41_REPORT.md"
last_report_ingest_commit: "0ea4fd7df6d503be54e81a70e3e46417864e774b"
---

# SPRINT-41: Multi-Host Adapters & Frontmatter Locator

**Status:** Completed · **Dates:** 2026-09-08 → 2026-10-09 · **Gate:** pass

## Goal
Fix the position-dependent frontmatter locator across all three call sites, then land EPIC-058's foundation milestones — scaffold relocation, host registry, `--host` selectors — with the clean-room verification harness that proves Claude Code is unregressed.

## Deliverables
| Story ID | Title | Lane | Milestone | Parallel? | Bounce Exposure |
|---|---|---|---|---|---|
| `BUG-067` | Frontmatter locator: find the fence, don't require offset 0 (3 call sites) | standard | M0 | n | med |
| `STORY-058-01` | Tracked `scaffold/core` + `scaffold/hosts/claude` payload layout | standard | M1 | n | high |
| `STORY-058-02` | Repoint scaffold-source validation + manifest builder; drop the sibling dependency | standard | M1 | n | med |
| `STORY-058-03` | `HostAdapter` contract, registry, behavior-preserving Claude adapter | standard | M2 | n | med |
| `STORY-058-04` | `cleargate init --host` selector parsing and profile expansion | standard | M2 | y | med |
| `STORY-058-05` | `cleargate host` list/add/remove lifecycle commands | standard | M3 | y | med |
| `STORY-058-06` | Install-manifest host ownership fields with legacy snapshot migration | standard | M3 | y | med |
| `STORY-058-07` | Per-host scoping of doctor, upgrade, uninstall, prune | standard | M3 | n | med |
| `BUG-085` | Live `/.claude/` re-sync, then durable meta-repo drift detection | standard | M3 | n | low |
| `STORY-058-08` | Clean-room verification procedure + `cleargate verify-install` driver | standard | M4 | y | low |
| `STORY-058-09` | Clean-room Claude regression baseline (no-flag and `--host all`) | standard | M4 | y | low |
| `STORY-058-10` | Codex payload surfaces: hooks.json, config.toml MCP, `AGENTS.md` injection | standard | M5 | y | med |
| `STORY-058-11` | Codex role/skill translation + harness-neutral repo-root shim | standard | M5 | y | med |
| `STORY-058-12` | Host dispatch-mode split: Task-based parallel dispatch (Claude) vs serial fallback (Codex) | standard | M6 | y | med |
| `STORY-058-13` | Codex end-to-end loop evidence: one real story through Architect→QA-Red→Developer→QA-Verify | standard | M6 | y | low |
| `BUG-089` | PreToolUse gates exit 1, which Claude Code does not treat as blocking — both gates fail open | standard | M0 | n | low |

[+5,182 bytes not shown — read .cleargate/delivery/archive/SPRINT-41_multi_host_adapters_and_frontmatter_locator.md]

<!-- BEGIN relations -->
## Relations
- Parent: none
- Children (1): [[EPIC-058]]
- Cites (24): [[BUG-024]], [[BUG-067]], [[BUG-068]], [[BUG-069]], [[BUG-085]], [[BUG-089]], [[BUG-090]], [[BUG-091]], [[BUG-096]], [[BUG-097]], [[BUG-098]], [[CR-026]], [[CR-108]], [[CR-123]], [[CR-124]], [[EPIC-055]], [[EPIC-058]], [[PROPOSAL-074]], [[SPRINT-34]], [[STORY-058-01]], +4 more
- Cited by (6): [[BUG-067]], [[BUG-087]], [[BUG-090]], [[BUG-096]], [[BUG-098]], [[BUG-099]]
<!-- END relations -->
<!-- BEGIN sprint-report -->
## Sprint Report
**Report status:** Draft · **Report:** .cleargate/sprint-runs/SPRINT-41/SPRINT-41_REPORT.md · **Improvement suggestions:** .cleargate/sprint-runs/SPRINT-41/improvement-suggestions.md

### Carried Over
Fifteen items sit in Parking Lot and are carried by the 2026-10-04 owner close decision (`sprint-context.md` Mid-Sprint Amendments, CLOSE DECISION). All are M7 Codex-dogfood fixes:
- **Partly built, preserved on branches:** BUG-102 (build complete; outer twin `5eac6ddc`, cli `story/BUG-102` `33d0627`), BUG-103 (independent QA FAIL, real R7 defect, qa=1 arch=1, state was Bouncing), BUG-105 (implementation uncommitted in cli worktree, build `a926ee8` on `story/BUG-105`, open hotfix slug-validation regression), BUG-114 (worktrees prepared, no role dispatched).
- **Not started:** BUG-104, BUG-106 through BUG-113, BUG-115, BUG-116.
- **Re-targeted:** the two close-blocking live-Codex deferred verifications (STORY-058-10 goal check 4, STORY-058-13 goal check 5) moved from `blocks: close` to `blocks: BUG-106`, because the owner's dedicated Codex login (option O2) never happened.
- Also outside the sprint: EPIC-058's Copilot adapter, token-ledger metering adapter (blocked on unverified Codex telemetry facts), plugin/marketplace distribution and `.codex/rules/**` command policy (explicitly deferred in sprint plan §1).
<!-- END sprint-report -->
