# AI Roles and Workflow

## Purpose
Define the default responsibilities of Claude, Codex, and Gemini in this repository.

**Current Project Context:** Building V1.5 of the Operational Process Modeler (capacity flow modeling tool with DAG support for merges, splits, and assemblies).

**Primary Documentation:**
- `README.md` — Product vision and value proposition
- `docs/V1.5_PRD.md` — Product requirements (DAGs, BOM, splits, complex propagation)
- `docs/V1.5_IMPLEMENTATION_PLAN.md` — Step-by-step build plan with technical decisions
- `CLAUDE.md` — Claude-specific implementation guidance
- `docs/AI_ROLES.md` — This file (role definitions and workflow)

## AI Roles

### Claude Sonnet — Lead Builder
**Current V1.5 Responsibilities:**
- Implementing DAG graph engine (merges, splits, fork-join support)
- Building topological sort and complex demand propagation engine
- Writing calculation tests for merge/split scenarios
- Implementing merge/split configuration UI (BOM and split ratio inputs)
- Graph validation rewrite (cycle detection, scrap edge constraints, ratio validation)
- Complex bug fixes and refactoring

**General Responsibilities:**
- Implementing features in production
- Writing production code
- Making technical implementation decisions
- Building UI and backend components
- Implementing complex logic and calculations
- Handling complex refactors and debugging

Claude Sonnet is the default agent for important engineering work and all V1.5 core implementation.

### Claude Haiku — Quick Executor
**Current V1.5 Responsibilities:**
- UI polish (colors, spacing, labels for merge/split nodes)
- Input validation helpers (split ratio sum validation, BOM completeness)
- Test coverage expansion (extending Sonnet's test framework)
- Documentation updates (README, code comments, guides)
- Lint and TypeScript fixes
- Simple bug fixes with clear scope

**General Responsibilities:**
- Small bug fixes
- Simple UI adjustments
- Updating tests and test coverage
- Editing documentation
- Small, isolated refactors
- Fixing lint or TypeScript issues

Claude Haiku should only be used for clearly scoped, low-risk tasks. Do NOT use Haiku for calculation engine, graph validation, or propagation logic.

### Codex — Engineering Reviewer and Git Operator
**Current V1.5 Responsibilities:**
- Reviewing topological sort and demand propagation logic for correctness
- Validating test coverage for merge/split/fork-join scenarios
- Checking consistency with V1.5_IMPLEMENTATION_PLAN.md requirements
- Reviewing calculation accuracy and edge case handling
- Ensuring graph validation rules match PRD constraints

**General Responsibilities:**
- Reviewing plans and implementations critically
- Identifying bugs, edge cases, and technical risks
- Checking consistency with approved plans
- Handling commit and push workflows
- Writing clean, descriptive commit messages

Codex is primarily a reviewer and quality gate, not the main builder.

### Gemini — Brainstorm Partner
**Current V1.5 Responsibilities:**
- Not typically used for V1.5 (implementation phase, not planning phase)
- If needed: explore UX for merge/split node presentation, alternative split semantics

**General Responsibilities:**
- Brainstorming product ideas and features
- Exploring UX directions and interaction patterns
- Helping with positioning and messaging
- Drafting planning docs and PRDs when useful
- Challenging assumptions and exploring alternatives

Gemini is not the primary implementation agent. Only use for ideation and planning, not execution.

## Default Workflow

### For V1.5 Implementation (Current):
1. **Planning is done** — V1.5_PRD.md and V1.5_IMPLEMENTATION_PLAN.md are approved.
2. **Assign work to Claude Sonnet** — Implement steps 1-5 (types, validation, propagation, tests, UI).
3. **Review with Codex** — Validate against plan, check test coverage, verify calculation correctness.
4. **Polish with Claude Haiku** — UI adjustments, documentation, test expansion.
5. **Commit with Codex** — Clean, descriptive commit messages; push to dev branch.

### For General Feature Work:
1. Define the feature clearly (or use Gemini to brainstorm).
2. Use Claude Sonnet to implement it.
3. Use Codex to review for bugs, risks, consistency with plan.
4. Use Claude Haiku for small follow-up fixes if needed.
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

## Decision Rule

**For V1.5 Implementation:**
- **Core calculation engine, graph validation, topological sort, merge/split propagation** → Claude Sonnet
- **UI components, input validation, documentation** → Claude Haiku (or Sonnet if complex)
- **Code review, quality assurance, commit workflow** → Codex
- **Brainstorming UX patterns or alternatives** → Gemini (unlikely needed now)

**General Guideline:**
- **Architecture, core logic, or maintainability** → Claude Sonnet
- **Small, clearly bounded, low-risk** → Claude Haiku
- **Review or git hygiene** → Codex
- **Ideation, alternatives, or messaging** → Gemini
