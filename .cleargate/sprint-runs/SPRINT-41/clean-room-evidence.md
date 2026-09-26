# Clean-room evidence — SPRINT-41 (Claude baseline, STORY-058-09)

Procedure: `.cleargate/knowledge/clean-room-verification.md` · Gate: STORY-058-09 `deferred_verification`
(close_sprint.mjs Step 2.9) — the LAST run must be PASS against the final cli artifact inputs.

## Run 1 — 2026-09-26T06:43:14.154Z — wave13 STORY-058-09

- result: PASS
- cli_sha: 1b742b3c0ed07394367ed45a595f07b9fde65d2b
- artifact_inputs: a7e231b9a535f39d163c99f25bd538c53c4c856a2f4d36b25bc0daf5ecd10d12
- artifact: cleargate-0.26.1.tgz sha256 09281d2805dbdd008b2f597706b35078c61d3fc4853b9d1589db0759e8dd3a8d
- container: /Users/ssuladze/Documents/Dev/cg-cleanroom-20260926T064145Z-claude
- claude: 2.1.283 (Claude Code) · model claude-haiku-4-5-20251001 · --setting-sources project,local
- cleargate resolved: /Users/ssuladze/Documents/Dev/cg-cleanroom-20260926T064145Z-claude/tools/bin/cleargate
- registered hosts: claude · --host all resolved to: claude

| Check | no flag | --host all | Evidence |
|---|---|---|---|
| room-isolation | PASS | PASS |  |
| verify-install | PASS | PASS |  |
| doctor | PASS | PASS |  |
| tree-comparison | PASS | PASS |  |
| claude.live.session-start | PASS | PASS |  |
| claude.live.pre-tool-use | PASS | PASS |  |
| claude.live.post-tool-use | PASS | PASS |  |
| claude.live.dispatch | PASS | PASS |  |
| claude.live.agents-skills | PASS | PASS |  |
| claude.live.agents-md-exposure | N/A | N/A |  |
| claude.live.hook-identity | PASS | PASS |  |
| claude.live.mcp-connect | INFO | INFO | noflag: cleargate: status=connected source=project; non-project entries: 4 | all: cleargate: status=connected source=project; non-project entries: 4 |
| sprint-init | FAIL-KNOWN (BUG-090) | FAIL-KNOWN (BUG-090) | noflag: exit 1 — UNAPPROVED (1): STORY-001-01
ERROR: sprint init blocked — 0 items missing, 1 unapproved, 0 stub-empty. Fix the above, then re-run init. | all: exit 1 — UNAPPROVED (1): STORY-001-01
ERROR: sprint init blocked — 0 items missing, 1 unapproved, 0 stub-empty. Fix the above, then re-run init. |
| check-scaffold | INFO | INFO | noflag exit 0 | all exit 0 (F8: a pristine install reports one pre-existing upstream-changed false positive) |
| active-sprint | INFO | INFO | noflag: sentinel drive ok (exit 0, 1 pending file(s)) | all: sentinel drive ok (exit 0, 1 pending file(s)) |
| verify-install-all-plain | N/A | PASS |  |

### Goal Acceptance Check mapping
- Condition 1 (BUG-067): claude.live.post-tool-use (authored epic, one PostToolUse cycle, stamp=0 gate=0)
- Condition 2: no-flag column — session-start, pre-tool-use, post-tool-use, agents-skills, doctor
- Condition 3: --host all column + claude.no-foreign-hooks + tree comparison (vacuous while registered hosts = [claude]; RS-4 is the witness)

### Not exercised
- PreToolUse AskUserQuestion (pre-tool-use-autonomy.sh) — no headless trigger
- git pre-commit hooks (pre-commit.sh, pre-commit-surface-gate.sh) — git hooks, not host hooks
- Enforce-mode denials — proven by B0 in the meta-repo; out of the baseline scope

### Findings
- --host all resolved to [claude]: coexistence is vacuous until another host registers; the RS-4 re-run is the witness

## Run 2 — 2026-09-26T19:13:51.310Z — RS-4 after STORY-058-11

- result: PASS
- cli_sha: 0399beb3df997ce3410f30238fae93a64958e6c3
- artifact_inputs: 802ee5c951c0c41784e6a0f495b00471836ab05cff551fb0cdebff19097fd003
- artifact: cleargate-0.26.1.tgz sha256 1b1566551bc419fe5a1aaf105053755137bbddac360af117844dc3926f74b768
- container: /Users/ssuladze/Documents/Dev/cg-cleanroom-20260926T191351Z-claude
- claude: 2.1.283 (Claude Code) · model claude-haiku-4-5-20251001 · --setting-sources project,local
- cleargate resolved: /Users/ssuladze/Documents/Dev/cg-cleanroom-20260926T191351Z-claude/tools/bin/cleargate
- registered hosts: claude, codex · --host all resolved to: claude, codex

| Check | no flag | --host all | Evidence |
|---|---|---|---|
| room-isolation | PASS | PASS |  |
| verify-install | PASS | PASS |  |
| doctor | PASS | PASS |  |
| tree-comparison | PASS | PASS |  |
| host-set | PASS | PASS | noflag=[claude]; all=[claude, codex]; registered=[claude, codex] |
| claude.live.session-start | PASS | PASS |  |
| claude.live.pre-tool-use | PASS | PASS |  |
| claude.live.post-tool-use | PASS | PASS |  |
| claude.live.dispatch | PASS | PASS |  |
| claude.live.agents-skills | PASS | PASS |  |
| claude.live.agents-md-exposure | N/A | PASS |  |
| claude.live.hook-identity | PASS | PASS |  |
| claude.live.agents-skills-parity | PASS | PASS |  |
| claude.live.mcp-connect | INFO | INFO | noflag: cleargate: status=connected source=project; non-project entries: 4 \| all: cleargate: status=pending source=project; non-project entries: 4 |
| sprint-init | PASS | PASS | noflag: exit 0 \| all: exit 0 |
| check-scaffold | INFO | INFO | noflag exit 0 \| all exit 0 (F8: a pristine install reports one pre-existing upstream-changed false positive) |
| active-sprint | INFO | INFO | noflag: sentinel drive ok (exit 0, 1 pending file(s)); .active after sprint-init: present \| all: sentinel drive ok (exit 0, 1 pending file(s)); .active after sprint-init: present |
| verify-install-all-plain | N/A | PASS |  |

### Goal Acceptance Check mapping
- Condition 1 (BUG-067): claude.live.post-tool-use (authored epic, one PostToolUse cycle, stamp=0 gate=0)
- Condition 2: no-flag column — session-start, pre-tool-use, post-tool-use, agents-skills, doctor
- Condition 3: --host all column + host-set + claude.live.agents-skills-parity + claude.no-foreign-hooks + tree comparison (registered hosts: claude, codex; --host all resolved to: claude, codex)

### Not exercised
- PreToolUse AskUserQuestion (pre-tool-use-autonomy.sh) — no headless trigger
- git pre-commit hooks (pre-commit.sh, pre-commit-surface-gate.sh) — git hooks, not host hooks
- Enforce-mode denials — proven by B0 in the meta-repo; out of the baseline scope

### Findings
- none
