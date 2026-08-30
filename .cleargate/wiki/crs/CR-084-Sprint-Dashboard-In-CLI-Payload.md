---
type: cr
id: "CR-084-Sprint-Dashboard-In-CLI-Payload"
parent: ""
children: []
status: "Completed"
remote_id: ""
raw_path: ".cleargate/delivery/archive/CR-084-Sprint-Dashboard-In-CLI-Payload.md"
last_ingest: "2026-08-30T22:18:10.906Z"
last_ingest_commit: "c5ef4013065ba78f372bac93c7fd4419d0e326f8"
repo: "planning"
---

# CR-084-Sprint-Dashboard-In-CLI-Payload: CR-084: Ship a Branded Sprint-Progress Dashboard as a `cleargate` CLI Subcommand

## 0.5 Open Questions

> All resolved via owner decision 2026-07-14. Retained for audit.

- **RESOLVED — Runtime:** Node, not Python. The dashboard is a **`cleargate` CLI subcommand** (`cleargate sprint dashboard`), not a loose script. The CLI already has filesystem + subprocess access and ships on every machine, so there is no new runtime and no `.cleargate/tools/` payload file. Rationale (owner Q "why not ordinary js/html/css?"): a `file://` HTML page cannot read sibling data files (Chrome blocks `fetch` of `file://`) and cannot run `git worktree list` (no browser shell), so a data-collector with FS+subprocess access must run first — that collector is the CLI. The **browser-facing output stays ordinary static HTML/CSS/JS** (data inlined as a `<script>` blob; all CSS/JS inline).
- **RESOLVED — Auto-open:** `cleargate sprint init` writes the snapshot and opens it in the **default browser** (new window/tab, best-effort per-platform: macOS `open`, Linux `xdg-open`, Windows `start`). Suppress with `--no-dashboard` or `CLEARGATE_NO_DASHBOARD=1`.

[+11,262 bytes not shown — read .cleargate/delivery/archive/CR-084-Sprint-Dashboard-In-CLI-Payload.md]

## Blast radius
Affects: no parent/child refs declared in frontmatter

## Open questions
- **RESOLVED — Runtime:** Node, not Python. The dashboard is a **`cleargate` CLI subcommand** (`cleargate sprint dashboard`), not a loose script. The CLI already has filesystem + subprocess access and ships on every machine, so there is no new runtime and no `.cleargate/tools/` payload file. Rationale (owner Q "why not ordinary js/html/css?"): a `file://` HTML page cannot read sibling data files (Chrome blocks `fetch` of `file://`) and cannot run `git worktree list` (no browser shell), so a data-collector with FS+subprocess access must run first — that collector is the CLI. The **browser-facing output stays ordinary static HTML/CSS/JS** (data inlined as a `<script>` blob; all CSS/JS inline).
- **RESOLVED — Auto-open:** `cleargate sprint init` writes the snapshot and opens it in the **default browser** (new window/tab, best-effort per-platform: macOS `open`, Linux `xdg-open`, Windows `start`). Suppress with `--no-dashboard` or `CLEARGATE_NO_DASHBOARD=1`.
- **RESOLVED — Live refresh:** `--serve` mode auto-updates **without a manual refresh** — a `/data` JSON endpoint plus inline client polling (~2s) patches the DOM in place (no flicker, keeps scroll).

[+276 bytes not shown — read .cleargate/delivery/archive/CR-084-Sprint-Dashboard-In-CLI-Payload.md]
