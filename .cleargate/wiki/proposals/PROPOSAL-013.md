---
type: proposal
id: "PROPOSAL-013"
parent: ""
children: []
status: "Completed"
remote_id: ""
raw_path: ".cleargate/delivery/archive/PROPOSAL-013_Sprint_Planning_Fast_Track.md"
last_ingest: "2026-08-30T22:18:10.906Z"
last_ingest_commit: "e2fef1f5c8d58f66c94aa3418a1150ece11573d2"
repo: "planning"
---

# PROPOSAL-013: Sprint Planning Fast-Track Lane

## 1. Initiative & Context

### 1.1 Objective

Add an AI-judged **lane classifier** to ClearGate's Sprint Planning v2 phase that tags each decomposed story with one of three lanes — `standard` (default; full architect → developer → QA loop), `fast` (skips Architect plan + QA gate; relies on pre-gate scanner + post-merge sprint-branch tests), or `hotfix` (off-sprint; CR-style; Dev → user manual verify → merge). The Architect proposes lanes during Sprint Design Review; the human confirms at Gate 2; the orchestrator routes accordingly during execution. Mis-classification has an automatic **demotion path** back to `standard` so the cost of a bad call is bounded.

### 1.2 The "Why"

[+23,284 bytes not shown — read .cleargate/delivery/archive/PROPOSAL-013_Sprint_Planning_Fast_Track.md]

## Blast radius
Affects: no parent/child refs declared in frontmatter
