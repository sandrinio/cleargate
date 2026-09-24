# Codex live transport probe — bootstrap B0

Observed 2026-09-11 23:49–23:51 UTC in disposable fixture
`/Users/ssuladze/Documents/Dev/CG_TEST/sprint-41-D2QMC1/transport-probe-7OVV9n`.
Binary: `/Applications/ChatGPT.app/Contents/Resources/codex`, previously verified
`0.154.0-alpha.6.2`. External Node child process using `app-server` default stdio;
no private desktop/conversation dispatch API. Existing ChatGPT authentication was
used normally; no credentials copied, global configuration changed, trust grants
added, or security-bypass flags supplied. Each thread explicitly used read-only
sandbox and no-tool probe instructions.

## Observed results

- Initialize/initialized succeeded in two separate server processes.
- Terra thread `01a092e0-7cc8-7983-b173-4b23101b8ec1`, turn
  `01a092e0-7d3b-7a20-ae5c-30470a59da14`: completed.
- Sol thread `01a092e0-7d17-7b33-b2c9-5dd18c711e63`, turn
  `01a092e0-7d3b-7a20-ae5c-303b827cd7d4`: completed.
- Both turns were admitted at 23:49:40.799Z, completed at 23:49:43.997Z and
  23:49:44.912Z respectively. This proves overlapping in-flight turns in distinct
  threads; it does not measure backend token-level execution overlap.
- Server exited cleanly, restarted, and `thread/read(includeTurns:true)` returned
  both matching completed turn IDs. `thread/resume` on Terra then completed a
  new turn `01a092e0-8dcb-7b82-b7c7-71b2bd5e3126`.
- Astra thread `01a092e0-9b56-7990-998f-b4da4ab5a23b`, turn
  `01a092e0-9b83-76c0-b2ff-d63e7e88766a`: completed using `gpt-6-astra`.
- Interrupt qualification succeeded after observing `turn/started`: turn
  `01a092e1-e653-7ca3-9d0f-0b74512d54e5` started at 23:51:13.242Z,
  `turn/interrupt` acknowledged at .351Z, and `turn/completed` reported
  `interrupted` at .352Z. Server exited 0.

## Race found and recovery

The first probe interrupted immediately after `turn/start` acknowledgement and
received RPC -32600, `no active turn to interrupt`. The diagnostic stopped that
server and reported failure (exit 1), rather than claiming interrupt success.
On restart, persisted history showed that turn
`01a092e0-a9d6-7723-80a3-75ba00dcc001` as interrupted. A separate controlled probe
then waited for the actual turn-start event and proved the successful path above.
Transport implementation must handle acknowledgement/active-turn timing and
reconcile persisted state; it must not blindly duplicate a turn after a race.

## Boundaries

This qualifies the pinned experimental transport's basic lifecycle and the exact
three requested models. It does not qualify the ClearGate engine, production
support, hooks, trust configuration, role behavior, worktree isolation, merge
recovery, packaged installation, or the sprint goal. No story was marked Done.
The app-server command remains documented as experimental. Actual host denial
and permitted controls remain mandatory separate evidence. No usage rows or
zero-token placeholders were synthesized.
