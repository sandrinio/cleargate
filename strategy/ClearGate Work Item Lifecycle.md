ClearGate Work Item Lifecycle
To bridge the gap between high-level project management and granular AI execution, work items follow a strict, multi-stage lifecycle enforcing Research-Driven Decomposition.

1. Initiation (High-Level)
Actor: Product Manager or Workspace Assistant (Chyro).
State: Pure business intent, user story, or feature request. No codebase context is required or assumed.
Action: Staged as a rough draft for the Vibe Coder to pick up.
2. Requirement Synthesis (Phase Gate 1)
Actor: AI Agent & Vibe Coder.
State: AI reads the Initiation draft, explores the actual local codebase and available product documentation, and maps the business request to a technical reality.
Action: AI drafts a strict, technically accurate research artifact using .cleargate/templates/proposal.md.
Gate: The proposal.md is generated with approved: false. The AI halts and awaits the Vibe Coder to manually review, refine, and set approved: true. The AI is strictly forbidden from scaffolding Epics or Stories until this gate passes.
3. Structural Decomposition (Phase Gate 2)
Actor: AI Agent.
State: The proposal is approved. The AI uses the approved proposal as its exclusive context.
Action: AI scaffolds PM tracking entities using .cleargate/templates/epic.md and .cleargate/templates/story.md.
4. Prioritization & Sprints
Actor: PM (via Platform) and Vibe Coder (via Codebase).
State: Items receive a dual-priority lock (Platform urgency + Codebase sequencing).
Action: Items fall into the backlog or are assigned to a sprint-plan.md, which the AI reads first to gain broader context.
5. Delivery & Sync
Actor: Claude Code & ClearGate MCP.
State: The execution phase.
Action: The "Local First, Sync, Update" loop pushes the fully approved and decomposed deliverables to the PM tool via MCP, then archives the local state.