# AI Roles and Workflow

## Purpose
Define the default responsibilities of Claude, Codex, and Gemini in this repository.

## AI Roles

### Claude Sonnet — Lead Builder
Responsible for:
- implementing features
- writing production code
- making technical implementation decisions
- building UI and backend components
- implementing logic and calculations
- handling complex refactors and debugging

Claude Sonnet is the default agent for important engineering work.

### Claude Haiku — Quick Executor
Responsible for:
- small bug fixes
- simple UI adjustments
- updating tests
- editing documentation
- small, isolated refactors
- fixing lint or TypeScript issues

Claude Haiku should only be used for clearly scoped, low-risk tasks.

### Codex — Engineering Reviewer and Git Operator
Responsible for:
- reviewing plans and implementations critically
- identifying bugs, edge cases, and technical risks
- checking consistency with the approved plan
- handling commit and push workflows
- writing clean commit messages

Codex is primarily a reviewer, not the main builder.

### Gemini — Brainstorm Partner
Responsible for:
- brainstorming product ideas
- exploring UX directions
- helping with positioning and messaging
- drafting planning docs when useful
- challenging assumptions

Gemini is not the primary implementation agent.

## Default Workflow
1. Define the feature clearly.
2. Use Claude Sonnet to implement it.
3. Use Codex to review it.
4. Use Claude Haiku for small follow-up fixes if useful.
5. Use Codex to commit and push changes.
6. Use Gemini only when brainstorming or exploring alternatives is helpful.

## Git Workflow Rule
Agents must only commit and push to `dev` or a feature branch.
Direct commits to `main` are forbidden.

When the user says "save changes", the agent must:
1. review uncommitted changes
2. verify the branch is not `main`
3. write a clear commit message
4. commit the changes
5. push to GitHub
6. return a short summary

Commit message prefixes:
- feat:
- fix:
- docs:
- refactor:
- test:
- chore:

Avoid vague commit messages like:
- updates
- changes
- work in progress

If pushing is not possible, clearly explain that and provide the commit message and required git commands.

## Rule
If the task affects architecture, core logic, or maintainability, use Claude Sonnet.
If the task is small and clearly bounded, Claude Haiku can handle it.
If the task is review or git hygiene, use Codex.
If the task is ideation, alternatives, or messaging, use Gemini.
