# Codex loop evidence — SPRINT-41 (STORY-058-13)

Procedure: `.cleargate/knowledge/clean-room-verification.md` § Other hosts → Codex · Gate: STORY-058-13 `deferred_verification`
(close_sprint.mjs Step 2.9) — the LAST scripted run and the LAST live human-trust run must both be PASS against the final cli artifact inputs.

## Run 1 — 2026-09-26T23:30:07.719Z — wave17 scripted

- result: PASS
- provider: scripted
- trust_posture: harness-exact-hash
- codex_sha256: 1d8b80de0a27f69b152bfb9b7b3b4fd3b8c589e4e76213db27219eab9ae53afa
- artifact_inputs: 96fe91375711e3aa3edaea0b85e25cd10db3243c2dad5c0b6b8201884ded7f1f
- loop_transport: PASS
- enforcement_parity: PASS
- metering: unavailable
- cli_sha 7a7bfa6f9f81ca9051a1ddeba47134539f5de041 · artifact tgz sha256 feed23ce5902783c9f302e55ffd8b44c2800d941e27ebea2457f2755861f9152 · container /Users/ssuladze/Documents/Dev/cg-cleanroom-20260926T232955Z-13run1 · codex_home /Users/ssuladze/Documents/Dev/cg-cleanroom-20260926T232955Z-13run1/codex-home · home /Users/ssuladze/Documents/Dev/cg-cleanroom-20260926T232955Z-13run1/home
- codex: /Users/ssuladze/Documents/Dev/CG_TEST/sprint-41-D2QMC1/codex-runtime-X33IWV/bin/codex · codex-cli 0.154.0-alpha.6.2 · origin https://releases.openai.com/codex/releases/0.154.0-alpha.6.2/codex-package-aarch64-apple-darwin.tar.gz (archive sha256 9dbf155219c70542cf352661ffe7a7d86b96e378990904bc09e8b31a9a247adf)
- model gpt-5.6-terra · sandbox_posture thread/start { cwd: <room>, model: <slug>, approvalPolicy: 'never', sandbox: 'workspace-write', config: { sandbox_workspace_write: { writable_roots: ['<roomRealpath>/.git'] } } } · approvals: never
- cleargate resolved: hooks /Users/ssuladze/Documents/Dev/cg-cleanroom-20260926T232955Z-13run1/tools/bin/cleargate ⏎  · role shells /Users/ssuladze/Documents/Dev/cg-cleanroom-20260926T232955Z-13run1/tools/bin/cleargate
- merge_sha: ec9575630fcaa20298fab127a147e7a934b348f9
- embedded codex (not run): /Applications/ChatGPT.app/Contents/Resources/codex · codex-cli 0.155.0-alpha.16.3 (measured 2026-09-26; not run) · sha256 c67698d0990aae05211d9c43ab343ad9517e406824dea77eca103a2806232b3a

### Controls

| Check | Attempts | Result | Evidence |
|---|---|---|---|
| codex.live.discovery | n/a | PASS | hooks/list before/after trust (inputs.json controls.hooksListBefore/After) |
| codex.live.session-start | 1 | PASS | S2b (inputs.json controls.turns.C2) |
| codex.live.post-tool-use | 1 | PASS | S2b (inputs.json controls.turns.C2, c2.gateCheckLine) |
| codex.live.edit-deny | 1 | PASS | S1 (inputs.json controls.turns.C3, c3) |
| codex.live.edit-allow | 1 | PASS | S2a (inputs.json controls.turns.C4, c4) |
| codex.live.dispatch-deny | 1 | PASS | S3 (inputs.json controls.turns.C5, c5) |
| codex.live.dispatch-identity | 1 | PASS | S4 (inputs.json controls.turns.C6, c6) |

### Loop checks

| Check | Result | Detail |
|---|---|---|
| codex.loop.dispatches | PASS | 5 dispatches: architect, qa, developer, qa, devops |
| codex.loop.worktree | PASS | created (git worktree add .worktrees/STORY-001-01 -b story/STORY-001-01 sprint/S-01), isolated, removed |
| codex.loop.merge | PASS | merge_sha ec9575630fcaa20298fab127a147e7a934b348f9 |
| codex.loop.terminal-state | PASS | Done; transitions: STORY-001-01: ∅ → Ready to Bounce; STORY-001-01: Ready to Bounce → Done |
| codex.loop.outcome | PASS | src/slugify.mjs present; slugify → hello-world; npm test 0 |
| codex.loop.serial-verdict | PASS | GREEN; serial-mode valid; tokens { metering: unavailable }; record exit 0 |
| codex.loop.hook-matrix | PASS | every trigger has its hook |
| codex.loop.no-synthetic-usage | PASS | no token-ledger rows in the room |
| codex.loop.path-identity | PASS | hooks and role shells resolve /Users/ssuladze/Documents/Dev/cg-cleanroom-20260926T232955Z-13run1/tools/bin/cleargate |
| codex.loop.meta-repo-untouched | PASS | no clean-room line appended to the meta-repo |
| codex.loop.metering | INFO | unavailable — ClearGate does not consume it in SPRINT-41; host exposes per-dispatch usage (subagent rollout token_usage_record): 5/5 dispatches with records; provider match 5/5 |
| codex.loop.trust-posture | INFO | harness-exact-hash: 5 hooks trusted by the harness, 5 listed, configWrites 2 |
| codex.loop.wall-clock | INFO | #1 architect 4838ms, #2 qa 4796ms, #3 developer 4606ms, #4 qa 2880ms, #5 devops 2935ms, S1 9723ms, S2a 9750ms, S2b 9813ms, S3 7973ms, S4 9762ms, S5 36440ms |

### Per-dispatch hooks

| # | role | agent_id | SessionStart | PreToolUse edit | PostToolUse | dispatch gate | SubagentStop | codex-identity | wall-clock |
|---|---|---|---|---|---|---|---|---|---|
| 0 | orchestrator (root) | 01a0e00e-b916-75e2-81c9-62e47388dadb | completed ×1 | n/a (no edit by this role) | n/a (no edit by this role) | completed (call_s5_spawn_architect), completed (call_s5_spawn_qa_red), completed (call_s5_spawn_developer), completed (call_s5_spawn_qa_verify), completed (call_s5_spawn_devops) | n/a (root session) | n/a (root session) | n/a |
| 1 | architect | 01a0e00e-c65f-75d1-af20-d2df6de7f4a0 | not fired (host: root session only, X6) | 2/2 | 2/2 | completed (call_s5_spawn_architect) | completed ×1 | agent_type=architect | n/a |
| 2 | qa | 01a0e00e-e036-79b3-9ec0-92526de08a98 | not fired (host: root session only, X6) | 2/2 | 2/2 | completed (call_s5_spawn_qa_red) | completed ×1 | agent_type=qa | n/a |
| 3 | developer | 01a0e00e-fa10-7391-a000-8691f1260bf5 | not fired (host: root session only, X6) | 2/2 | 2/2 | completed (call_s5_spawn_developer) | completed ×1 | agent_type=developer | n/a |
| 4 | qa | 01a0e00f-1214-7d80-9469-c65012a11f3e | not fired (host: root session only, X6) | 1/1 | 1/1 | completed (call_s5_spawn_qa_verify) | completed ×1 | agent_type=qa | n/a |
| 5 | devops | 01a0e00f-242d-70d3-b5a3-d92acad9f02b | not fired (host: root session only, X6) | 1/1 | 1/1 | completed (call_s5_spawn_devops) | completed ×1 | agent_type=devops | n/a |

### Metering

- metering: unavailable (ClearGate does not consume Codex per-subagent usage in SPRINT-41; no ledger rows are written)
- architect 01a0e00e-c65f-75d1-af20-d2df6de7f4a0: rollout found · records 3 · totals {"input_tokens":354,"cached_input_tokens":54,"output_tokens":84,"reasoning_output_tokens":0,"total_tokens":438} · provider match true
- qa 01a0e00e-e036-79b3-9ec0-92526de08a98: rollout found · records 5 · totals {"input_tokens":620,"cached_input_tokens":120,"output_tokens":170,"reasoning_output_tokens":0,"total_tokens":790} · provider match true
- developer 01a0e00e-fa10-7391-a000-8691f1260bf5: rollout found · records 5 · totals {"input_tokens":655,"cached_input_tokens":155,"output_tokens":205,"reasoning_output_tokens":0,"total_tokens":860} · provider match true
- qa 01a0e00f-1214-7d80-9469-c65012a11f3e: rollout found · records 4 · totals {"input_tokens":550,"cached_input_tokens":150,"output_tokens":190,"reasoning_output_tokens":0,"total_tokens":740} · provider match true
- devops 01a0e00f-242d-70d3-b5a3-d92acad9f02b: rollout found · records 5 · totals {"input_tokens":720,"cached_input_tokens":220,"output_tokens":270,"reasoning_output_tokens":0,"total_tokens":990} · provider match true

### Trust

- posture: harness-exact-hash
- detail: harness-exact-hash: 5 hooks trusted by the harness, 5 listed, configWrites 2
- hook: preToolUse /Users/ssuladze/Documents/Dev/cg-cleanroom-20260926T232955Z-13run1/repo-loop/.codex/hooks.json:pre_tool_use:0:0 trusted_hash sha256:12d0e6bd8faf4e826e103a27e3d21a86fa96d409811c54b7a9571116ac92adfe
- hook: preToolUse /Users/ssuladze/Documents/Dev/cg-cleanroom-20260926T232955Z-13run1/repo-loop/.codex/hooks.json:pre_tool_use:1:0 trusted_hash sha256:ca7130b0a7b06b357dd1df0d85b6448a34e20b60402b61a184e967adf5b58c7d
- hook: postToolUse /Users/ssuladze/Documents/Dev/cg-cleanroom-20260926T232955Z-13run1/repo-loop/.codex/hooks.json:post_tool_use:0:0 trusted_hash sha256:089ed472d677525784cfa867e12ceaad5f795ab3164bffa048e18cd18b8420e2
- hook: sessionStart /Users/ssuladze/Documents/Dev/cg-cleanroom-20260926T232955Z-13run1/repo-loop/.codex/hooks.json:session_start:0:0 trusted_hash sha256:e54f2f42c066ee560e4e011a473a219aed403aba0facf51d8b5107839bc00553
- hook: subagentStop /Users/ssuladze/Documents/Dev/cg-cleanroom-20260926T232955Z-13run1/repo-loop/.codex/hooks.json:subagent_stop:0:0 trusted_hash sha256:828ce7a711a01412f0d1975e90df083923b433a4059ab8cfa3f7ae1d04e2948d
- configWrites: 2

### State transitions

- STORY-001-01: ∅ → Ready to Bounce (migration)
- STORY-001-01: Ready to Bounce → Done (system)

### Gaps

- Sandbox: .git is read-only under Codex workspace-write (X8); the loop runs with writable_roots=[<room>/.git] on thread/start — follow-up: to be filed at step L6 (CR: declare the .git writable root for the ClearGate loop, or document it)
- Metering consumer: ClearGate does not read the SubagentStop agent_transcript_path token_usage_records (X7) — follow-up: to be filed at step L6 (CR)
- Role TOMLs carry Claude-host paths (.claude/…) in developer_instructions (STORY-058-11 codegen) — follow-up: to be filed at step L6 (CR)
- Autonomy guard: no request_user_input autonomy guard on Codex — follow-up: M5 follow-up
- Git hooks: no git pre-commit hooks for codex-only repos — follow-up: M5 follow-up
- INFO: SessionStart fires on the root session only (X6), by host design — follow-up: none (INFO)

### Goal Acceptance Check mapping

- Condition 5: loop_transport PASS + enforcement_parity PASS + metering: unavailable (explicit)

### Findings

- removed src/cg-probe.ts after S2a (recorded)

## Run 2 — 2026-09-27T00:13:17.644Z — wave17 scripted (integrated)

- result: PASS
- provider: scripted
- trust_posture: harness-exact-hash
- codex_sha256: 1d8b80de0a27f69b152bfb9b7b3b4fd3b8c589e4e76213db27219eab9ae53afa
- artifact_inputs: 990c4bd52dbb38a022ed52eacf5c1f593e7d199176829e79aa295d7eab9fd1c3
- loop_transport: PASS
- enforcement_parity: PASS
- metering: unavailable
- cli_sha 5594a41cfe3e710d8dd4c9f4b85ac78a703b65d5 · artifact tgz sha256 aecfb8eae495b4a0b3ea0a85e41f70c91f97c1171350b252ca22968f57789bc0 · container /Users/ssuladze/Documents/Dev/cg-cleanroom-20260927T001250Z-13run2 · codex_home /Users/ssuladze/Documents/Dev/cg-cleanroom-20260927T001250Z-13run2/codex-home · home /Users/ssuladze/Documents/Dev/cg-cleanroom-20260927T001250Z-13run2/home
- codex: /Users/ssuladze/Documents/Dev/CG_TEST/sprint-41-D2QMC1/codex-runtime-X33IWV/bin/codex · codex-cli 0.154.0-alpha.6.2 · origin https://releases.openai.com/codex/releases/0.154.0-alpha.6.2/codex-package-aarch64-apple-darwin.tar.gz (archive sha256 9dbf155219c70542cf352661ffe7a7d86b96e378990904bc09e8b31a9a247adf)
- model gpt-5.6-terra · sandbox_posture thread/start { cwd: <room>, model: <slug>, approvalPolicy: 'never', sandbox: 'workspace-write', config: { sandbox_workspace_write: { writable_roots: ['<roomRealpath>/.git'] } } } · approvals: never
- cleargate resolved: hooks /Users/ssuladze/Documents/Dev/cg-cleanroom-20260927T001250Z-13run2/tools/bin/cleargate ⏎  · role shells /Users/ssuladze/Documents/Dev/cg-cleanroom-20260927T001250Z-13run2/tools/bin/cleargate
- merge_sha: c2ca25de8e2b98cc901482753b0998281dfde983
- embedded codex (not run): /Applications/ChatGPT.app/Contents/Resources/codex · codex-cli 0.155.0-alpha.16.3 (measured 2026-09-26; not run) · sha256 c67698d0990aae05211d9c43ab343ad9517e406824dea77eca103a2806232b3a

### Controls

| Check | Attempts | Result | Evidence |
|---|---|---|---|
| codex.live.discovery | n/a | PASS | hooks/list before/after trust (inputs.json controls.hooksListBefore/After) |
| codex.live.session-start | 1 | PASS | S2b (inputs.json controls.turns.C2) |
| codex.live.post-tool-use | 1 | PASS | S2b (inputs.json controls.turns.C2, c2.gateCheckLine) |
| codex.live.edit-deny | 1 | PASS | S1 (inputs.json controls.turns.C3, c3) |
| codex.live.edit-allow | 1 | PASS | S2a (inputs.json controls.turns.C4, c4) |
| codex.live.dispatch-deny | 1 | PASS | S3 (inputs.json controls.turns.C5, c5) |
| codex.live.dispatch-identity | 1 | PASS | S4 (inputs.json controls.turns.C6, c6) |

### Loop checks

| Check | Result | Detail |
|---|---|---|
| codex.loop.dispatches | PASS | 5 dispatches: architect, qa, developer, qa, devops |
| codex.loop.worktree | PASS | created (git worktree add .worktrees/STORY-001-01 -b story/STORY-001-01 sprint/S-01), isolated, removed |
| codex.loop.merge | PASS | merge_sha c2ca25de8e2b98cc901482753b0998281dfde983 |
| codex.loop.terminal-state | PASS | Done; transitions: STORY-001-01: ∅ → Ready to Bounce; STORY-001-01: Ready to Bounce → Done |
| codex.loop.outcome | PASS | src/slugify.mjs present; slugify → hello-world; npm test 0 |
| codex.loop.serial-verdict | PASS | GREEN; serial-mode valid; tokens { metering: unavailable }; record exit 0 |
| codex.loop.hook-matrix | PASS | every trigger has its hook |
| codex.loop.no-synthetic-usage | PASS | no token-ledger rows in the room |
| codex.loop.path-identity | PASS | hooks and role shells resolve /Users/ssuladze/Documents/Dev/cg-cleanroom-20260927T001250Z-13run2/tools/bin/cleargate |
| codex.loop.meta-repo-untouched | PASS | no clean-room line appended to the meta-repo |
| codex.loop.metering | INFO | unavailable — ClearGate does not consume it in SPRINT-41; host exposes per-dispatch usage (subagent rollout token_usage_record): 5/5 dispatches with records; provider match 5/5 |
| codex.loop.trust-posture | INFO | harness-exact-hash: 5 hooks trusted by the harness, 5 listed, configWrites 2 |
| codex.loop.wall-clock | INFO | #1 architect 15716ms, #2 qa 14938ms, #3 developer 12728ms, #4 qa 6696ms, #5 devops 7296ms, S1 21007ms, S2a 14296ms, S2b 19709ms, S3 12965ms, S4 14684ms, S5 92317ms |

### Per-dispatch hooks

| # | role | agent_id | SessionStart | PreToolUse edit | PostToolUse | dispatch gate | SubagentStop | codex-identity | wall-clock |
|---|---|---|---|---|---|---|---|---|---|
| 0 | orchestrator (root) | 01a0e036-cdf6-7411-b8f9-4e9680043069 | completed ×1 | n/a (no edit by this role) | n/a (no edit by this role) | completed (call_s5_spawn_architect), completed (call_s5_spawn_qa_red), completed (call_s5_spawn_developer), completed (call_s5_spawn_qa_verify), completed (call_s5_spawn_devops) | n/a (root session) | n/a (root session) | n/a |
| 1 | architect | 01a0e036-f072-7b31-b618-358663e8f52e | not fired (host: root session only, X6) | 2/2 | 2/2 | completed (call_s5_spawn_architect) | completed ×1 | agent_type=architect | n/a |
| 2 | qa | 01a0e037-4830-7133-8c8d-f50717e682f9 | not fired (host: root session only, X6) | 2/2 | 2/2 | completed (call_s5_spawn_qa_red) | completed ×1 | agent_type=qa | n/a |
| 3 | developer | 01a0e037-9195-79f2-af26-d561a3892719 | not fired (host: root session only, X6) | 2/2 | 2/2 | completed (call_s5_spawn_developer) | completed ×1 | agent_type=developer | n/a |
| 4 | qa | 01a0e037-d5ab-7d61-ab15-80801f0d4499 | not fired (host: root session only, X6) | 1/1 | 1/1 | completed (call_s5_spawn_qa_verify) | completed ×1 | agent_type=qa | n/a |
| 5 | devops | 01a0e037-fd72-7172-a24c-63878a592af2 | not fired (host: root session only, X6) | 1/1 | 1/1 | completed (call_s5_spawn_devops) | completed ×1 | agent_type=devops | n/a |

### Metering

- metering: unavailable (ClearGate does not consume Codex per-subagent usage in SPRINT-41; no ledger rows are written)
- architect 01a0e036-f072-7b31-b618-358663e8f52e: rollout found · records 3 · totals {"input_tokens":354,"cached_input_tokens":54,"output_tokens":84,"reasoning_output_tokens":0,"total_tokens":438} · provider match true
- qa 01a0e037-4830-7133-8c8d-f50717e682f9: rollout found · records 5 · totals {"input_tokens":620,"cached_input_tokens":120,"output_tokens":170,"reasoning_output_tokens":0,"total_tokens":790} · provider match true
- developer 01a0e037-9195-79f2-af26-d561a3892719: rollout found · records 5 · totals {"input_tokens":655,"cached_input_tokens":155,"output_tokens":205,"reasoning_output_tokens":0,"total_tokens":860} · provider match true
- qa 01a0e037-d5ab-7d61-ab15-80801f0d4499: rollout found · records 4 · totals {"input_tokens":550,"cached_input_tokens":150,"output_tokens":190,"reasoning_output_tokens":0,"total_tokens":740} · provider match true
- devops 01a0e037-fd72-7172-a24c-63878a592af2: rollout found · records 5 · totals {"input_tokens":720,"cached_input_tokens":220,"output_tokens":270,"reasoning_output_tokens":0,"total_tokens":990} · provider match true

### Trust

- posture: harness-exact-hash
- detail: harness-exact-hash: 5 hooks trusted by the harness, 5 listed, configWrites 2
- hook: preToolUse /Users/ssuladze/Documents/Dev/cg-cleanroom-20260927T001250Z-13run2/repo-loop/.codex/hooks.json:pre_tool_use:0:0 trusted_hash sha256:12d0e6bd8faf4e826e103a27e3d21a86fa96d409811c54b7a9571116ac92adfe
- hook: preToolUse /Users/ssuladze/Documents/Dev/cg-cleanroom-20260927T001250Z-13run2/repo-loop/.codex/hooks.json:pre_tool_use:1:0 trusted_hash sha256:ca7130b0a7b06b357dd1df0d85b6448a34e20b60402b61a184e967adf5b58c7d
- hook: postToolUse /Users/ssuladze/Documents/Dev/cg-cleanroom-20260927T001250Z-13run2/repo-loop/.codex/hooks.json:post_tool_use:0:0 trusted_hash sha256:089ed472d677525784cfa867e12ceaad5f795ab3164bffa048e18cd18b8420e2
- hook: sessionStart /Users/ssuladze/Documents/Dev/cg-cleanroom-20260927T001250Z-13run2/repo-loop/.codex/hooks.json:session_start:0:0 trusted_hash sha256:e54f2f42c066ee560e4e011a473a219aed403aba0facf51d8b5107839bc00553
- hook: subagentStop /Users/ssuladze/Documents/Dev/cg-cleanroom-20260927T001250Z-13run2/repo-loop/.codex/hooks.json:subagent_stop:0:0 trusted_hash sha256:828ce7a711a01412f0d1975e90df083923b433a4059ab8cfa3f7ae1d04e2948d
- configWrites: 2

### State transitions

- STORY-001-01: ∅ → Ready to Bounce (migration)
- STORY-001-01: Ready to Bounce → Done (system)

### Gaps

- Sandbox: .git is read-only under Codex workspace-write (X8); the loop runs with writable_roots=[<room>/.git] on thread/start — follow-up: to be filed at step L6 (CR: declare the .git writable root for the ClearGate loop, or document it)
- Metering consumer: ClearGate does not read the SubagentStop agent_transcript_path token_usage_records (X7) — follow-up: to be filed at step L6 (CR)
- Role TOMLs carry Claude-host paths (.claude/…) in developer_instructions (STORY-058-11 codegen) — follow-up: to be filed at step L6 (CR)
- Autonomy guard: no request_user_input autonomy guard on Codex — follow-up: M5 follow-up
- Git hooks: no git pre-commit hooks for codex-only repos — follow-up: M5 follow-up
- INFO: SessionStart fires on the root session only (X6), by host design — follow-up: none (INFO)

### Goal Acceptance Check mapping

- Condition 5: loop_transport PASS + enforcement_parity PASS + metering: unavailable (explicit)

### Findings

- removed src/cg-probe.ts after S2a (recorded)
