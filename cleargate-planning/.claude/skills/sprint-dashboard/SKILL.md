---
name: sprint-dashboard
description: |
  Render or serve the branded sprint-progress dashboard (`cleargate sprint dashboard`).
  Use when a human wants a visual, point-in-time or live view of the active sprint's
  story states, milestone/wave grouping, token spend by agent, worktrees, and dispatch
  reports. Triggers: explicit user phrases "show me the dashboard", "open the sprint
  dashboard", "sprint progress view"; automatically opened (best-effort) after
  `cleargate sprint init` succeeds. Not for CI/automation — this is a human-facing
  visual surface, not a data source other tooling should scrape (use `state.json` /
  `token-ledger.jsonl` directly for that).
---

# Sprint Dashboard — Branded Progress View (CR-084)

A self-contained, zero-network HTML document rendering the active sprint's state.
Ships inside the `cleargate` CLI binary (`src/dashboard/{collect,render,serve,open}.ts`)
— no separate tool file, no payload sync beyond this skill.

## When to run

- **Snapshot** — `cleargate sprint dashboard [--open]`. Writes
  `.cleargate/sprint-runs/<id>/dashboard.html` (a single self-contained file, data
  inlined as `<script>const DATA=…</script>`) and, with `--open`, launches it in the
  default browser. Point-in-time — re-run to refresh. This is what `cleargate sprint
  init` auto-runs on success.
- **Live** — `cleargate sprint dashboard --serve [--open] [--port <n>]` during
  execution. A stdlib `http` server serves the page plus a `/data` JSON endpoint;
  inline client JS polls `/data` every ~2s and patches the DOM in place — no manual
  refresh, no flicker, scroll position preserved. Default port `4713`.

## Flags

| Flag | Effect |
|---|---|
| `--open` | Open the snapshot (or, with `--serve`, the live page) in the default browser. |
| `--serve` | Run the live stdlib http server instead of writing a static snapshot. |
| `--port <n>` | Port for `--serve` (default `4713`). |
| `--no-dashboard` (on `sprint init` only) | Suppress the auto-opened dashboard step. |
| `CLEARGATE_NO_DASHBOARD=1` (env, on `sprint init` only) | Same suppression, for CI/non-interactive runs. |

## Data sources (all best-effort — a missing/malformed input degrades to an empty
panel, never a crash)

- `state.json` — story states → done/active/blocked/queued counts.
- the sprint plan's pipe-table (`pending-sync/` then `archive/`) — story titles +
  milestone/wave grouping.
- `token-ledger.jsonl` — token spend by agent (sums `delta.*`, never `session_total`
  — the latter double-counts across rows). Frequently absent; empty panel is normal,
  not an error.
- `sprint-context.md` — the `## Sprint Goal` paragraph, shown as the header subtitle.
- `git worktree list` — active `.worktrees/STORY-*` checkouts.
- `reports/` — per-story and per-role dispatch-report counts.
- `SPRINT-NN_REPORT.md` presence — a flag surfaced in the Reports panel.

## Troubleshooting

**Blank story titles, or every story lumped under a single "All stories" group** ⇒
the sprint plan's pipe-table column headers don't match what the collector looks
for (`Story ID` + `Title` cells in the header row, optionally `Milestone` or `Wave`
for grouping — parsed by header **name**, not position, so column order and extra
columns are fine). Everything else (state, counts, tokens, worktrees, reports)
still renders correctly from `state.json` regardless. Fix by renaming the plan
table's header row to include `Title` and (`Milestone` or `Wave`) cells.
