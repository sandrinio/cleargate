# ClearGate Lifecycle Diagram — Image Generation Prompt

> Use this file with an external image generator (Midjourney, DALL-E, Stable Diffusion, or any
> diagram-aware tool). Copy the sections that the tool accepts. The `## Reference` section is the
> most load-bearing — paste it verbatim or the box-and-arrow topology will be wrong.

---

## Subject

A clean technical architecture diagram titled **"The ClearGate Five-Role Agent Loop"** showing
the full per-sprint lifecycle: stakeholder input flowing through a structured 7-step per-story
execution loop, with four explicit human-approval gates, five agent roles, and an output feedback
path back into the framework's self-improving engine.

The diagram must convey:
- Five roles in a structured sequence (not a flat list).
- Four gates where human sign-off is required before execution continues.
- The per-story 7-step loop as the core of the execution phase.
- The Reporter closing the loop at sprint end, feeding lessons back into the wiki and FLASHCARD.md.

---

## Style

- Clean technical diagram, NOT a whiteboard sketch or hand-drawn style.
- Flat design, minimal drop shadows, no gradients.
- Sans-serif font throughout (Inter, Helvetica, or similar).
- Arrows are directional (single-head), thin, with 1-2px stroke.
- Boxes use rounded corners (8px radius).
- Horizontal flow (left-to-right) for the main pipeline.
- The 7-step per-story loop should be rendered as a vertical sub-flow or a numbered sequence
  embedded within the "Execution" phase box.
- Gate symbols: use a diamond or octagon shape (traffic-stop convention) to visually distinguish
  human gate checkpoints from automated agent steps.
- Overall aspect ratio: 16:9 or 3:2 landscape. Wide enough to read comfortably at 1200px wide.

---

## Layout

The diagram has four top-level horizontal phases:

```
[PLAN] → [EXECUTE] → [DELIVER] → [LEARN]
```

**Phase 1 — PLAN (left column):**
- Input box: "Stakeholder Input" (initiative or raw request)
- Gate 1 box (diamond): "Gate 1 — Initiative Approval"
- Decomposition box: "Triage → Epic → Stories"
- Gate 2 box (diamond): "Gate 2 — Ambiguity Resolution"
- Sprint box: "Sprint File (goal + stories)"
- Gate 3 box (diamond): "Gate 3 — `cleargate sprint preflight`"

**Phase 2 — EXECUTE (center, largest section):**
- Heading: "Per-Story Loop (7 steps, isolated git worktree)"
- Numbered vertical sequence inside a rounded border:
  1. Architect (M1) — milestone plan + file-surface analysis
  2. QA (Red) — writes failing *.red.node.test.ts before any code
  3. Architect (TPV) — validates test wiring soundness
  4. Developer — implements in isolated worktree, one commit
  5. QA (Verify) — read-only acceptance trace
  6. Architect (post-flight) — architectural drift check
  7. DevOps — no-ff merge, worktree teardown, state → Done

**Phase 3 — DELIVER (right of execute):**
- Reporter box: "Reporter — sprint retrospective REPORT.md"
- Gate 4 box (diamond): "Gate 4 — `close_sprint.mjs --assume-ack`"
- Output box: "Sprint → Completed; artifacts archived"

**Phase 4 — LEARN (far right, feeds back left):**
- Three outputs flowing back to the PLAN phase:
  - FLASHCARD.md (tagged lessons → read at every agent start)
  - Wiki index.md (compiled awareness layer → session-start orientation)
  - improvement-suggestions.md (TPV catch-rate, hotfix audit, skill candidates)
- A curved arrow from LEARN back to PLAN labeled "Next sprint"

---

## Reference (boxes + arrows)

Exact topology — box labels and directed edges:

```
[Stakeholder Input]
      ↓
[Gate 1: Initiative Approval] ←── human sign-off
      ↓
[Triage → Epic → Stories]
      ↓
[Gate 2: Ambiguity Resolution] ←── human sign-off
      ↓
[Sprint File (goal + stories)]
      ↓
[Gate 3: cleargate sprint preflight] ←── automated + human
      ↓
┌─────────────────────────────────────────────────┐
│  Per-Story Loop (isolated git worktree)          │
│  1. Architect (M1) — milestone plan              │
│  2. QA (Red) — failing tests written             │
│  3. Architect (TPV) — wiring validation          │
│  4. Developer — implement + commit               │
│  5. QA (Verify) — acceptance trace               │
│  6. Architect (post-flight) — drift check        │
│  7. DevOps — merge + teardown + state → Done     │
└─────────────────────────────────────────────────┘
      ↓
[Reporter — REPORT.md retrospective]
      ↓
[Gate 4: close_sprint.mjs --assume-ack] ←── human sign-off
      ↓
[Sprint Completed → artifacts archived]
      ↓
┌───────────────────────────────────────┐
│ LEARN (feeds back to next sprint)      │
│ • FLASHCARD.md (append-only lessons)  │
│ • Wiki index.md (compiled awareness)  │
│ • improvement-suggestions.md (TPV,    │
│   hotfix audit, skill candidates)     │
└───────────────────────────────────────┘
      ↑ ← curved "Next sprint" arrow back to top
```

**Parallel execution note (optional callout box):**
Stories that touch non-overlapping files run concurrently in separate git worktrees. The Architect
computes the collision graph at M1; non-colliding stories are parallelized; colliding stories are
serialized. Add a small callout with two parallel "Per-Story Loop" boxes connected by a "||"
symbol to illustrate concurrency.

---

## Color palette

Align with the ClearGate brand colors visible in `assets/github-banner.svg`:

| Element | Color | Hex |
|---|---|---|
| Phase header backgrounds | Dark navy | #0F172A |
| Agent role boxes (steps 1-7) | Slate blue | #1E3A5F |
| Gate diamonds | Amber / orange | #F59E0B |
| Human sign-off label text | White | #FFFFFF |
| Automated step boxes | Steel blue | #2563EB |
| Output/deliver boxes | Emerald green | #059669 |
| Learn/feedback boxes | Purple | #7C3AED |
| Arrow strokes | Medium gray | #64748B |
| Background | Very light gray or white | #F8FAFC or #FFFFFF |
| Body text inside boxes | White (on dark) / Dark (on light) | contrast-safe |

Gate diamonds must be visually distinct — use the amber (#F59E0B) fill to signal "human pause point."

---

## Caption

Suggested diagram caption (place below the image):

> **The ClearGate Five-Role Agent Loop** — Stakeholder input flows through four human gates into a
> 7-step per-story execution loop. Five roles (Architect, Developer, QA, DevOps, Reporter) communicate
> only via structured file artifacts; no direct inter-agent conversation. The Reporter closes the loop
> at sprint end: lessons compound into FLASHCARD.md and the wiki, and feed the next sprint's planning.

Alt-text for accessibility:
> Flowchart showing the ClearGate lifecycle: stakeholder input → Gate 1 → triage → Gate 2 → sprint file → Gate 3 → per-story 7-step loop (Architect M1, QA Red, Architect TPV, Developer, QA Verify, Architect post-flight, DevOps merge) → Reporter → Gate 4 → sprint completed; feedback loop returns lessons to next sprint via FLASHCARD.md and wiki.
