# AI Roles and Workflow

## Purpose
Define a clear workflow for how AI agents (Gemini, Codex, and Claude) collaborate during development in this repository.

## AI Roles

### Gemini — Product Planner
**Responsible for:**
- Planning features
- Structuring development steps
- Writing documentation
- Creating prompts for implementation
- Defining product scope

*Note: Gemini does NOT write production code.*

### Codex — Engineering Reviewer
**Responsible for:**
- Reviewing plans created by Gemini
- Identifying missing steps
- Identifying technical risks
- Identifying scope creep
- Suggesting improvements to implementation plans
- Reviewing completed implementations if needed
- Generating tests or improvements when requested

### Claude — Implementation Engineer
**Responsible for:**
- Implementing features in the repository
- Writing production code
- Modifying files
- Building UI and backend components
- Implementing logic and calculations
- Fixing bugs

*Note: Claude may use its internal planning mode before coding to structure implementation, but must not change the approved product scope.*

## Development Workflow
For feature work, the development workflow follows this sequence:
1. **Gemini** creates the initial plan.
2. **Codex** reviews the plan critically.
3. **Claude** prepares implementation using its internal planning capability.
4. **Claude** implements the feature.
5. **Codex** may optionally review the final implementation if requested.

**Sequence:** Gemini → Codex → Claude (→ optional Codex review)

## Planning Rules
- Claude should focus on implementation and should not need to review the product plan itself.
- Claude may use its planning capability only to organize implementation details, not to change scope.

## Git Workflow Rule
**Branch Restriction:** Agents must ONLY commit and push to the `dev` branch (or specific feature branches). Committing directly to the `main` branch is strictly forbidden.

When the user says "save changes", the AI agent must:
1. Review the current uncommitted changes
2. Verify that the active branch is `dev` and not `main`
3. Write a clear commit message
4. Commit the changes
5. Push the branch to GitHub
6. Return a short summary of what was saved

**Commit Message Prefixes:**
Commit messages must use clear prefixes such as:
- `feat:`
- `fix:`
- `docs:`
- `refactor:`
- `test:`
- `chore:`

**Avoid vague messages such as:**
- updates
- changes
- work in progress

*Note: If pushing to GitHub is not possible, the agent must clearly say so and provide the commit message and the git commands needed.*

## General Rules for AI Agents
- Strictly adhere to the assigned role and responsibilities.
- Ensure clear handoffs between the planning, review, and implementation phases.
- Do not exceed the defined boundaries of your role (e.g., Gemini must not write production code, Claude must not alter the approved scope).
