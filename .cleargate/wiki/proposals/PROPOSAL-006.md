---
type: proposal
id: "PROPOSAL-006"
parent: ""
children: []
status: "Abandoned"
remote_id: ""
raw_path: ".cleargate/delivery/archive/PROPOSAL-006_Scaffold_Manifest_And_Uninstall.md"
last_ingest: "2026-08-30T22:18:10.906Z"
last_ingest_commit: "c5daa2e17d44c5de50c683745851916812069428"
repo: "planning"
---

# PROPOSAL-006: Scaffold Manifest + Drift Detection + `cleargate uninstall`

## 1. Initiative & Context

### 1.1 Objective
Give ClearGate a deterministic scaffold lifecycle by shipping two paired capabilities:

1. **Scaffold manifest + drift detection** — a canonical `MANIFEST.json` ships with `@cleargate/cli` declaring every file `cleargate init` installs, each with a SHA256 identifier and tier classification. An install-time snapshot at `.cleargate/.install-manifest.json` records what's actually on disk. `cleargate doctor --check-scaffold` compares the three surfaces (package / install / current) and reports *clean / user-modified / upstream-changed / both-changed* per file. When an agent detects upstream drift during triage it surfaces a one-line alert — never auto-overwrites.
2. **`cleargate uninstall`** — a clean removal command with preservation prompts for the artifacts a Vibe Coder has accumulated (FLASHCARD.md, shipped work items, sprint reports, ledgers). Always removes framework files (agents, hooks, protocol, templates, wiki, CLAUDE.md injection block). Writes a `.cleargate/.uninstalled` marker so a future `cleargate init` in the same project can restore preserved items.

[+26,022 bytes not shown — read .cleargate/delivery/archive/PROPOSAL-006_Scaffold_Manifest_And_Uninstall.md]

## Blast radius
Affects: no parent/child refs declared in frontmatter
