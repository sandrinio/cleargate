# Codex transport research and partial probe

2026-09-11 UTC. Sol research completed through a read-only, ephemeral Codex CLI
role dispatch using `gpt-5.6-sol` and the explicit architect-reader profile.

## Decision

Use app-server stdio as the customer-callable coordinator transport: it exposes
thread read/resume and explicit turn interruption plus bidirectional requests.
Keep exec JSON for isolated diagnostics. The product must provide persistence,
effect reconciliation and quality gates itself; private conversation delegation
is not a distributable API. The app-server command remains experimental and
unsupported for production workloads despite its stable-method subset.
Sources: [App Server](https://learn.chatgpt.com/docs/app-server),
[non-interactive mode](https://learn.chatgpt.com/docs/non-interactive-mode).

Hook discovery and successful turns do not prove trust or enforcement. Qualification
needs actual denied side effects and permitted controls. Never bypass changed-hook
trust. Source: [hooks](https://learn.chatgpt.com/docs/hooks).

## Root-verified local facts

- Binary: `/Applications/ChatGPT.app/Contents/Resources/codex`, version
  `0.154.0-alpha.6.2`; login-status command reports ChatGPT authentication without
  reading credential files.
- Generated pinned schemas: `/Users/ssuladze/Documents/Dev/CG_TEST/sprint-41-D2QMC1/runtime-schema`.
- The actual default-stdio `app-server` process accepted initialize/initialized
  and model/list, returned all three requested exact model IDs, then exited 0
  after stdin closed. No experimental API capability was requested.
- Use `app-server` (default stdio), not the research response's unverified
  `app-server --stdio` example. Every actual command must match the pinned help.
- ThreadStartParams includes model, cwd, developerInstructions, config, sandbox,
  approvalPolicy and ephemeral. Schema presence is not real lifecycle proof.

## Still required

Real concurrent turns, read/resume after restart, interrupt, approval behavior,
actual hook firing/denials, durable coordinator recovery and packed-artifact
portability. None is certified by this partial probe. No sprint usage ledger was
written or synthetic token counts inserted.
