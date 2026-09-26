# Clean-room evidence — SPRINT-41 (Codex, STORY-058-10)

Procedure: M5 plan §"Codex host contract" · Gate: STORY-058-10 `deferred_verification`
(close_sprint.mjs Step 2.9) — the LAST `scripted` run must be PASS against the final cli
artifact inputs, and at least one `live` run must be PASS.

## Run 1 — 2026-09-26T19:19:57.698Z — RS-4 scripted

- result: PASS
- provider: scripted
- cli_sha: 0399beb3df997ce3410f30238fae93a64958e6c3
- artifact_inputs: 802ee5c951c0c41784e6a0f495b00471836ab05cff551fb0cdebff19097fd003
- artifact: cleargate-0.26.1.tgz sha256 deee1d3b651f15e804c94b5312ab112e9a01daeadfe85f7064a6ba96419bc204
- container: /Users/ssuladze/Documents/Dev/cg-cleanroom-20260926T191800Z-codex
- codex: codex-cli 0.154.0-alpha.6.2 · sha256 1d8b80de0a27f69b152bfb9b7b3b4fd3b8c589e4e76213db27219eab9ae53afa · model gpt-5.6-terra
- trust posture: harness-exact-hash

| Check | Result | Detail |
|---|---|---|
| codex.live.discovery | PASS |  |
| codex.live.session-start | PASS |  |
| codex.live.post-tool-use | PASS |  |
| codex.live.edit-deny | PASS |  |
| codex.live.edit-allow | PASS |  |
| codex.live.dispatch-deny | PASS |  |
| codex.live.dispatch-identity | PASS |  |
| codex.live.shared-hooks | PASS |  |
| claude.control.edit-deny | PASS |  |
| codex.verify-install | PASS |  |
| codex.live.roles | PASS | 11 roles listed; qa spawned with its instructions |
| codex.live.skills | PASS | flashcard, sprint-dashboard room-local; no room-local sprint-execution |
| codex.live.metering | INFO | unavailable |
| codex.live.trust-posture | INFO | harness-exact-hash: 5 hooks |

### Findings
- none

## Run 2 — 2026-09-26T21:36:18.434Z — RS-5 after STORY-058-12

- result: PASS
- provider: scripted
- cli_sha: 5f25a203140c1e92ffbbfb30d7e0540826abe408
- artifact_inputs: 253bb8efecd5b3aeba1976ea6e530afec984add4d77bfb44749104ff9f11e7c6
- artifact: cleargate-0.26.1.tgz sha256 dd81394c59449c203dee0ffafa32cfee2ee7f5b6014004eb5b201ad982efc5c0
- container: /Users/ssuladze/Documents/Dev/cg-cleanroom-20260926T213522Z-codex
- codex: codex-cli 0.154.0-alpha.6.2 · sha256 1d8b80de0a27f69b152bfb9b7b3b4fd3b8c589e4e76213db27219eab9ae53afa · model gpt-5.6-terra
- trust posture: harness-exact-hash

| Check | Result | Detail |
|---|---|---|
| codex.live.discovery | PASS |  |
| codex.live.session-start | PASS |  |
| codex.live.post-tool-use | PASS |  |
| codex.live.edit-deny | PASS |  |
| codex.live.edit-allow | PASS |  |
| codex.live.dispatch-deny | PASS |  |
| codex.live.dispatch-identity | PASS |  |
| codex.live.shared-hooks | PASS |  |
| claude.control.edit-deny | PASS |  |
| codex.verify-install | PASS |  |
| codex.live.roles | PASS | 11 roles listed; qa spawned with its instructions |
| codex.live.skills | PASS | flashcard, sprint-dashboard, sprint-execution room-local |
| codex.live.metering | INFO | unavailable |
| codex.live.trust-posture | INFO | harness-exact-hash: 5 hooks |

### Findings
- none
