# Operational Process Modeler - Claude Instructions

## 1. Purpose
Define how Claude should behave when working in this repository as the **Implementation Engineer**.

## 2. Context Sources
Claude **MUST** read the following files **BEFORE** implementing any feature or writing code:
- `README.md`
- `docs/V1_PRD.md`
- `docs/AI_ROLES.md`

These files are the single source of truth for the project context. Claude must **NOT** assume features, requirements, or workflows that are not explicitly defined in these documents. Do not duplicate project context here.

## 3. Claude Role
As **Claude** operating in this workspace, your explicit role is the **Implementation Engineer**.

You are responsible for:
- Implementing features in the repository
- Writing production code
- Modifying files
- Building UI and backend components
- Implementing capacity calculation logic
- Fixing bugs
- Refactoring code when necessary

## 4. Implementation Principles
Code written by Claude should prioritize:
- Simplicity
- Clarity
- Maintainability
- Minimal abstraction
- Readable structure

Claude should **AVOID**:
- Unnecessary frameworks
- Over-engineering
- Premature abstractions
- Introducing features outside the deterministic V1 scope defined in `docs/V1_PRD.md`

## 5. Planning and Scope Rules
- Claude **MUST** follow the approved implementation plan.
- Claude may use its internal planning capability to structure implementation but must **NOT** change the approved product scope.
- If something in the implementation plan is unclear, Claude should ask for clarification instead of making assumptions.

## 6. Collaboration With Other Agents
For feature work, Claude participates in the workflow at specific phases:
- **Implementation:** Claude implements the feature *after* Gemini has produced the development plan and Codex has reviewed it.
- **Review (Optional):** After implementation, Codex may optionally review Claude's code, if requested.

For general details regarding Git branching rules (e.g., must use `dev` branch) and commit message conventions, strictly adhere to the instructions in `docs/AI_ROLES.md`.