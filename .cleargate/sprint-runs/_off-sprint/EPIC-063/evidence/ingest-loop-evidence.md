# Clean-room evidence — ingest loop (STORY-063-07)

Procedure: `.cleargate/knowledge/clean-room-verification.md` §5.1 · the LAST run must have nine PASS rows.

## Run 1 — 2026-11-12T10:12:41.957Z — ingest-loop run

- result: PASS
- cli_sha: 1c5bb1cb619d105a5ed703e23397454f16436bb3
- artifact_inputs: 2a5feae51e117461f7431befb1805f8968ceb2cfc2e98e2acec71d0244af0953
- artifact: cleargate-0.28.0.tgz sha256 128aa1c3ee6c5b5ce11b37441632c6c1e11ae9ddd94ac3559781fe2c2632eff9
- cleargate resolved: /Users/ssuladze/Documents/Dev/cg-cleanroom-d7-ingest/tools/bin/cleargate
- claude: 2.1.322 (Claude Code)
- session limits: max-turns 20 · max-budget-usd 3 · timeout 900000 ms
- container: /Users/ssuladze/Documents/Dev/cg-cleanroom-d7-ingest
- room: /Users/ssuladze/Documents/Dev/cg-cleanroom-d7-ingest/repo-ingest
- model: claude-sonnet-5-5
- ref: story/STORY-063-07
- duration_s: 115
- session positive-1: transcript /Users/ssuladze/Documents/Dev/cg-cleanroom-d7-ingest/evidence/ingest.positive-1.stream.jsonl · init.model claude-sonnet-5-5 · results [success/turns 6] · total_cost_usd 0.1959936
- session negative: transcript /Users/ssuladze/Documents/Dev/cg-cleanroom-d7-ingest/evidence/ingest.negative.stream.jsonl · init.model claude-sonnet-5-5 · results [success/turns 6] · total_cost_usd 0.18093420000000002
- session shell: transcript /Users/ssuladze/Documents/Dev/cg-cleanroom-d7-ingest/evidence/ingest.shell.stream.jsonl · init.model claude-sonnet-5-5 · results [success/turns 2] · total_cost_usd 0.06770160000000001

| Check | Room | Result | Evidence |
|---|---|---|---|
| claude.live.contradiction-directive | ingest-room | PASS | /Users/ssuladze/Documents/Dev/cg-cleanroom-d7-ingest/evidence/ingest.positive-1.stream.jsonl — PostToolUse:Edit additionalContext carries the pending directive for EPIC-002 |
| claude.live.contradiction-dispatch | ingest-room | PASS | /Users/ssuladze/Documents/Dev/cg-cleanroom-d7-ingest/evidence/ingest.positive-1.stream.jsonl — Agent tool_use for cleargate-wiki-contradict, SubagentStop exit 0 x1, new token-ledger row |
| claude.live.contradiction-finding | ingest-room | PASS | /Users/ssuladze/Documents/Dev/cg-cleanroom-d7-ingest/evidence/ingest.positive-1.stream.jsonl — contradictions.md gained 1 entry, one naming [[EPIC-001]] |
| claude.live.contradiction-stamp | ingest-room | PASS | /Users/ssuladze/Documents/Dev/cg-cleanroom-d7-ingest/evidence/ingest.positive-1.stream.jsonl — page last_contradict_sha equals the raw content hash (1ece56621127…) ; /Users/ssuladze/Documents/Dev/cg-cleanroom-d7-ingest/evidence/ingest.negative.stream.jsonl — page last_contradict_sha equals the raw … |
| claude.live.brief-contradictions-line | ingest-room | PASS | /Users/ssuladze/Documents/Dev/cg-cleanroom-d7-ingest/evidence/ingest.positive-1.stream.jsonl — last result (result 1 of 1) has a "Contradictions:" line ; /Users/ssuladze/Documents/Dev/cg-cleanroom-d7-ingest/evidence/ingest.negative.stream.jsonl — last result (result 1 of 1) has a "Contradictions:" … |
| claude.live.contradiction-negative | ingest-room | PASS | /Users/ssuladze/Documents/Dev/cg-cleanroom-d7-ingest/evidence/ingest.negative.stream.jsonl — negative draft EPIC-003 stamped, no new finding names it |
| claude.live.shell-ingest | ingest-room | PASS | /Users/ssuladze/Documents/Dev/cg-cleanroom-d7-ingest/evidence/ingest.shell.stream.jsonl — PostToolUse:Bash exit 0 x1, page raw_path .cleargate/delivery/archive/EPIC-002_cache_swap.md |
| claude.live.report-kept | ingest-room | PASS | sprint page contains <!-- BEGIN sprint-report --> |
| claude.live.silent-drop-alarm | ingest-room | PASS | session-start output: ⚠️ contradiction check missing: 1 recently edited draft(s) never checked — EPIC-004. Run the check before their Brief (wiki contradict <file>, then wiki contradict-commit). |

## Run 2 — 2026-11-12T10:58:12.398Z — 0.29.0 release

- result: PASS
- cli_sha: d9a9ba1a4892b77a356bba1b07854def866338dc
- artifact_inputs: 35dc162ae06bd6ce3d8aa1fd961ea87935fbcacc329b818c23fa62353addf42c
- artifact: cleargate-0.29.0.tgz sha256 7cc52d30ab736bdc1dee1243370cf53d7bb04583f5dd99bbb6d1de06ca6b6291
- cleargate resolved: /Users/ssuladze/Documents/Dev/cg-cleanroom-20261112T105812Z-ingest/tools/bin/cleargate
- claude: 2.1.322 (Claude Code)
- session limits: max-turns 20 · max-budget-usd 3 · timeout 900000 ms
- container: /Users/ssuladze/Documents/Dev/cg-cleanroom-20261112T105812Z-ingest
- room: /Users/ssuladze/Documents/Dev/cg-cleanroom-20261112T105812Z-ingest/repo-ingest
- model: claude-sonnet-5-5
- ref: v0.29.0
- duration_s: 105
- session positive-1: transcript /Users/ssuladze/Documents/Dev/cg-cleanroom-20261112T105812Z-ingest/evidence/ingest.positive-1.stream.jsonl · init.model claude-sonnet-5-5 · results [success/turns 6] · total_cost_usd 0.1947795
- session negative: transcript /Users/ssuladze/Documents/Dev/cg-cleanroom-20261112T105812Z-ingest/evidence/ingest.negative.stream.jsonl · init.model claude-sonnet-5-5 · results [success/turns 4, success/turns 2] · total_cost_usd 0.18981060000000002
- session shell: transcript /Users/ssuladze/Documents/Dev/cg-cleanroom-20261112T105812Z-ingest/evidence/ingest.shell.stream.jsonl · init.model claude-sonnet-5-5 · results [success/turns 2] · total_cost_usd 0.0676741

| Check | Room | Result | Evidence |
|---|---|---|---|
| claude.live.contradiction-directive | ingest-room | PASS | /Users/ssuladze/Documents/Dev/cg-cleanroom-20261112T105812Z-ingest/evidence/ingest.positive-1.stream.jsonl — PostToolUse:Edit additionalContext carries the pending directive for EPIC-002 |
| claude.live.contradiction-dispatch | ingest-room | PASS | /Users/ssuladze/Documents/Dev/cg-cleanroom-20261112T105812Z-ingest/evidence/ingest.positive-1.stream.jsonl — Agent tool_use for cleargate-wiki-contradict, SubagentStop exit 0 x1, new token-ledger row |
| claude.live.contradiction-finding | ingest-room | PASS | /Users/ssuladze/Documents/Dev/cg-cleanroom-20261112T105812Z-ingest/evidence/ingest.positive-1.stream.jsonl — contradictions.md gained 1 entry, one naming [[EPIC-001]] |
| claude.live.contradiction-stamp | ingest-room | PASS | /Users/ssuladze/Documents/Dev/cg-cleanroom-20261112T105812Z-ingest/evidence/ingest.positive-1.stream.jsonl — page last_contradict_sha equals the raw content hash (1ece56621127…) ; /Users/ssuladze/Documents/Dev/cg-cleanroom-20261112T105812Z-ingest/evidence/ingest.negative.stream.jsonl — page last_co… |
| claude.live.brief-contradictions-line | ingest-room | PASS | /Users/ssuladze/Documents/Dev/cg-cleanroom-20261112T105812Z-ingest/evidence/ingest.positive-1.stream.jsonl — last result (result 1 of 1) has a "Contradictions:" line ; /Users/ssuladze/Documents/Dev/cg-cleanroom-20261112T105812Z-ingest/evidence/ingest.negative.stream.jsonl — last result (result 2 of… |
| claude.live.contradiction-negative | ingest-room | PASS | /Users/ssuladze/Documents/Dev/cg-cleanroom-20261112T105812Z-ingest/evidence/ingest.negative.stream.jsonl — negative draft EPIC-003 stamped, no new finding names it |
| claude.live.shell-ingest | ingest-room | PASS | /Users/ssuladze/Documents/Dev/cg-cleanroom-20261112T105812Z-ingest/evidence/ingest.shell.stream.jsonl — PostToolUse:Bash exit 0 x1, page raw_path .cleargate/delivery/archive/EPIC-002_cache_swap.md |
| claude.live.report-kept | ingest-room | PASS | sprint page contains <!-- BEGIN sprint-report --> |
| claude.live.silent-drop-alarm | ingest-room | PASS | session-start output: ⚠️ contradiction check missing: 1 recently edited draft(s) never checked — EPIC-004. Run the check before their Brief (wiki contradict <file>, then wiki contradict-commit). |

## Run 3 — 2026-11-12T11:00:46.389Z — 0.29.0 release (final tag c7ab958)

- result: PASS
- cli_sha: c7ab9589e4b52da48d48346200d9e01d6db8bf11
- artifact_inputs: 35dc162ae06bd6ce3d8aa1fd961ea87935fbcacc329b818c23fa62353addf42c
- artifact: cleargate-0.29.0.tgz sha256 056eb98f216509f967fa80d87db939b4b5f6d5a561f13199c838c86f11819917
- cleargate resolved: /Users/ssuladze/Documents/Dev/cg-cleanroom-20261112T110046Z-ingest/tools/bin/cleargate
- claude: 2.1.322 (Claude Code)
- session limits: max-turns 20 · max-budget-usd 3 · timeout 900000 ms
- container: /Users/ssuladze/Documents/Dev/cg-cleanroom-20261112T110046Z-ingest
- room: /Users/ssuladze/Documents/Dev/cg-cleanroom-20261112T110046Z-ingest/repo-ingest
- model: claude-sonnet-5-5
- ref: v0.29.0
- duration_s: 105
- session positive-1: transcript /Users/ssuladze/Documents/Dev/cg-cleanroom-20261112T110046Z-ingest/evidence/ingest.positive-1.stream.jsonl · init.model claude-sonnet-5-5 · results [success/turns 6] · total_cost_usd 0.1837119
- session negative: transcript /Users/ssuladze/Documents/Dev/cg-cleanroom-20261112T110046Z-ingest/evidence/ingest.negative.stream.jsonl · init.model claude-sonnet-5-5 · results [success/turns 6] · total_cost_usd 0.17498870000000002
- session shell: transcript /Users/ssuladze/Documents/Dev/cg-cleanroom-20261112T110046Z-ingest/evidence/ingest.shell.stream.jsonl · init.model claude-sonnet-5-5 · results [success/turns 2] · total_cost_usd 0.0678679

| Check | Room | Result | Evidence |
|---|---|---|---|
| claude.live.contradiction-directive | ingest-room | PASS | /Users/ssuladze/Documents/Dev/cg-cleanroom-20261112T110046Z-ingest/evidence/ingest.positive-1.stream.jsonl — PostToolUse:Edit additionalContext carries the pending directive for EPIC-002 |
| claude.live.contradiction-dispatch | ingest-room | PASS | /Users/ssuladze/Documents/Dev/cg-cleanroom-20261112T110046Z-ingest/evidence/ingest.positive-1.stream.jsonl — Agent tool_use for cleargate-wiki-contradict, SubagentStop exit 0 x1, new token-ledger row |
| claude.live.contradiction-finding | ingest-room | PASS | /Users/ssuladze/Documents/Dev/cg-cleanroom-20261112T110046Z-ingest/evidence/ingest.positive-1.stream.jsonl — contradictions.md gained 1 entry, one naming [[EPIC-001]] |
| claude.live.contradiction-stamp | ingest-room | PASS | /Users/ssuladze/Documents/Dev/cg-cleanroom-20261112T110046Z-ingest/evidence/ingest.positive-1.stream.jsonl — page last_contradict_sha equals the raw content hash (1ece56621127…) ; /Users/ssuladze/Documents/Dev/cg-cleanroom-20261112T110046Z-ingest/evidence/ingest.negative.stream.jsonl — page last_co… |
| claude.live.brief-contradictions-line | ingest-room | PASS | /Users/ssuladze/Documents/Dev/cg-cleanroom-20261112T110046Z-ingest/evidence/ingest.positive-1.stream.jsonl — last result (result 1 of 1) has a "Contradictions:" line ; /Users/ssuladze/Documents/Dev/cg-cleanroom-20261112T110046Z-ingest/evidence/ingest.negative.stream.jsonl — last result (result 1 of… |
| claude.live.contradiction-negative | ingest-room | PASS | /Users/ssuladze/Documents/Dev/cg-cleanroom-20261112T110046Z-ingest/evidence/ingest.negative.stream.jsonl — negative draft EPIC-003 stamped, no new finding names it |
| claude.live.shell-ingest | ingest-room | PASS | /Users/ssuladze/Documents/Dev/cg-cleanroom-20261112T110046Z-ingest/evidence/ingest.shell.stream.jsonl — PostToolUse:Bash exit 0 x1, page raw_path .cleargate/delivery/archive/EPIC-002_cache_swap.md |
| claude.live.report-kept | ingest-room | PASS | sprint page contains <!-- BEGIN sprint-report --> |
| claude.live.silent-drop-alarm | ingest-room | PASS | session-start output: ⚠️ contradiction check missing: 1 recently edited draft(s) never checked — EPIC-004. Run the check before their Brief (wiki contradict <file>, then wiki contradict-commit). |
