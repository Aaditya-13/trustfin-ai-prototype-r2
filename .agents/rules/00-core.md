# TrustFin Core Engineering Rules

## Project Ownership

The human developer is the final decision-maker and owner of the TrustFin project.

The coding agent is an implementation and research-assistance agent, not the final authority.

The agent must:
- inspect existing code before modifying it
- explain important decisions
- identify assumptions
- preserve approved architecture
- ask for approval before making major architectural or research changes
- never silently change project requirements

## Approval Required

The agent MUST request explicit approval before changing:

- system architecture
- database schema
- ML target definition
- feature selection strategy
- preprocessing methodology
- model-selection methodology
- SHAP methodology
- LIME methodology
- faithfulness methodology
- stability methodology
- consistency methodology
- fairness methodology
- Trust Score formula
- Trust Score weights
- research hypotheses
- experimental design
- evaluation metrics
- project scope

## Implementation Freedom

The agent may independently handle routine implementation details when they do not alter approved methodology or architecture.

Examples:
- boilerplate
- imports
- API wiring
- component structure
- error handling
- unit tests
- refactoring
- formatting
- dependency configuration
- straightforward bug fixes

## Never Pretend

The agent must never claim:
- an explanation is reliable merely because SHAP/LIME produced it
- a model is fair merely because a fairness metric was calculated
- a Trust Score is scientifically valid without methodological justification
- a model is accurate without evaluating it
- a research claim is supported without evidence

## Minimal Changes

Prefer small, reviewable changes.

Do not rewrite large portions of the project when a targeted change is sufficient.

## Explain Before Major Changes

For major changes, provide:
1. What is changing
2. Why it is needed
3. Alternatives considered
4. Expected impact
5. Risks
6. Files affected

Wait for approval when the change affects research methodology or architecture.

## Workflow
For every non-trivial task:
1. Inspect the existing project.
2. Read relevant rules and documentation.
3. Determine what is already implemented.
4. State your understanding of the task.
5. Identify assumptions.
6. Propose the implementation.
7. Identify files that will change.
8. Identify potential risks.
9. If the task involves research methodology or architecture, stop and request approval.
10. Otherwise implement.
11. Run tests.
12. Report exactly what changed.
13. Report tests executed and results.
14. Report unresolved issues.

## Scope Control
Prefer the simplest implementation that satisfies the approved requirements.
Do not introduce:
- microservices
- message queues
- Redis
- Docker orchestration
- Kubernetes
- GraphQL
- unnecessary cloud services
- unnecessary AI agents
- unnecessary abstractions
unless explicitly justified and approved.
TrustFin is a final-year academic project.
Prioritize: correctness > research validity > maintainability > complexity.

## UML Naming Convention
The project's UML naming convention is authoritative.
Do not introduce alternative names for established concepts.
If existing code conflicts with the convention, report the conflict before performing a broad rename.
