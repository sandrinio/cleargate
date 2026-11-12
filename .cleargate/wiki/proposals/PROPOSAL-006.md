---
type: proposal
id: "PROPOSAL-006"
parent: ""
children: []
cites: []
cited_by: []
status: "Abandoned"
remote_id: ""
raw_path: ".cleargate/delivery/archive/PROPOSAL-006_Scaffold_Manifest_And_Uninstall.md"
last_ingest: "2026-11-12T21:25:29.802Z"
last_ingest_commit: "c5daa2e17d44c5de50c683745851916812069428"
repo: "planning"
---

# PROPOSAL-006: Scaffold Manifest + Drift Detection + `cleargate uninstall`

**Status:** Abandoned · **Sprint:** none · **Gate:** not run

## Initiative & Context
### 1.1 Objective
Give ClearGate a deterministic scaffold lifecycle by shipping two paired capabilities:

1. **Scaffold manifest + drift detection** — a canonical `MANIFEST.json` ships with `@cleargate/cli` declaring every file `cleargate init` installs, each with a SHA256 identifier and tier classification. An install-time snapshot at `.cleargate/.install-manifest.json` records what's actually on disk.

[+3,910 bytes not shown — read .cleargate/delivery/archive/PROPOSAL-006_Scaffold_Manifest_And_Uninstall.md]

## Technical Architecture & Constraints
### 2.1 Dependencies

- **PROP-001** (hard) — `codebase_version` stamping pattern is the reference implementation for "read, hash, compare" logic used by the manifest system. Shares the stamping helper conventions.
- **PROP-005** (soft, related) — if both ship, `cleargate doctor` grows two modes (`--session-start` for gate summary, `--check-scaffold` for drift). They coexist cleanly; neither blocks the other.

[+11,012 bytes not shown — read .cleargate/delivery/archive/PROPOSAL-006_Scaffold_Manifest_And_Uninstall.md]

## Scope Impact (Touched Files & Data)
### 3.1 Known Files — must be modified

**CLI commands:**
- `cleargate-cli/src/commands/init.ts` — write `.cleargate/.install-manifest.json` at install; detect `.uninstalled` marker and offer restore.
- `cleargate-cli/src/commands/doctor.ts` — add `--check-scaffold` mode (may be new file if PROP-005 hasn't shipped yet; otherwise extend).

[+2,097 bytes not shown — read .cleargate/delivery/archive/PROPOSAL-006_Scaffold_Manifest_And_Uninstall.md]

## AI Interrogation Loop (Human Input Required)
*(Carried over from PROP-005's split on 2026-04-19. Numbering restarts at Q1 for this Proposal.)*

1. **Q — Manifest generation timing.** Generate `MANIFEST.json` at `npm run build` (shipped artifact) vs. at `cleargate init` time (computed at install, captures local env quirks)? Recommendation: at build time, shipped in the package.

[+8,193 bytes not shown — read .cleargate/delivery/archive/PROPOSAL-006_Scaffold_Manifest_And_Uninstall.md]

## Approval Gate
(Vibe Coder: Review this proposal. If the architecture and context are correct, answer the questions in §4 and set `approved: true` in the YAML frontmatter. Only then is the AI authorized to decompose into Epics/Stories.)

<!-- BEGIN relations -->
## Relations
- Parent: none
<!-- END relations -->
