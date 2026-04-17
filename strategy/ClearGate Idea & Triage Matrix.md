ClearGate: The Planning Engine
Vision
ClearGate is a strict, tool-agnostic planning orchestrator that focuses purely on the planning workflow. It takes ambiguous ideas and forces them through rigorous gates until they are crystal-clear specifications ready for execution (by humans or AI agents). Its philosophy is "Process Over Vibe," ensuring no work passes through the gate until it is absolutely clear.

Core Pillars
Document-First Hierarchy: Structured templates for moving from high-level vision to actionable work.
Ambiguity Scoring: The mechanism and criteria for evaluating a document's clarity. A hard gate ensures a section reaches "Green" status before any execution can begin.
Structured Handoffs: Final YAML/Markdown artifacts outputted for an external execution team.
Planning State Machine: Strict workflow states a document must pass through (e.g., Draft → Review → Refinement → Approved).
The Triage Matrix & Hierarchy
ClearGate has a frictionless entry point. The human doesn't categorize work; they simply submit a Raw Request. The AI acts as the "Front Gate" and triages the request into one of the following buckets based on scope and impact:

1. Epic (The "What")
Scope: Complex, multi-part feature requiring architectural decisions or taking more than a single sprint.
Function: Maps technical context and scope boundaries. Paused at the gate until architecture is unambiguous.
2. Story (The "New Value")
Scope: Adding new functionality or behavior that did not exist before.
Function: Defines exact Gherkin acceptance criteria and implementation guide. The ultimate handoff payload.
3. Change Request / CR (The "Context Override")
Scope: Changing or modifying existing features/behavior. (If it alters what is already built or in-flight, it is a CR, not a Story).
Function: Acts as a "Gate Reset." Requires explicit declaration of what is being removed/changed to prevent AI context hallucination. Reverts affected Epics/Stories back to 🔴 (High Ambiguity).
4. Bug (The "Fix")
Scope: Unintended behavior in already shipped features.
Function: Hard gate requires verified, exact reproduction steps before passing to an executor.
Immediate Action Items
 Refactor existing epic.md, story.md, bug.md, and change_request.md blueprints to implement the strict ClearGate Ambiguity Rubric.
 Adapt legacy CLAUDE.md into the central ClearGate Brain, implementing the Triage Matrix routing rules.
 Create cleargate-triage AI skill to handle automated ingestion of raw requests.