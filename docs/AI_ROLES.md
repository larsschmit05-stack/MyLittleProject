# AI Roles and Workflow

## Purpose
Define the default responsibilities of Claude, Codex, and Gemini in this repository.

**Current Project Context:** Operational Process Modeler is complete through V1.5 (DAG support with merges, splits, assemblies). V1.6 implementation phase in progress (Auth, Persistence, Validation) — Lead: Claude Opus.

**Primary Documentation:**
- `README.md` — Product vision and value proposition
- `CLAUDE.md` — Claude-specific implementation guidance (V1.6)
- `docs/V1.6_PRD.md` — V1.6 product requirements
- `docs/V1.6_IMPLEMENTATION_PLAN.md` — V1.6 implementation details
- `docs/AI_ROLES.md` — This file (role definitions and workflow)
- `docs/archive/v1.5/` — V1.5 implementation history (for reference)

## AI Roles

### Claude Opus — Lead Builder (V1.6)
**Current Phase Responsibilities (V1.6):**
- Implement Supabase Auth Setup (Feature 1, 3 days)
- Implement Model Persistence with RLS (Feature 2, 2 days)
- Implement Process Model Validation (Feature 3, 3 days)
- Write production code per V1.6_IMPLEMENTATION_PLAN.md
- Catch edge cases and ensure robust error handling
- Keep implementations pragmatic (no over-engineering)

**Principles:** Follow the plan, use standard patterns, write clean code. Superior quality without unnecessary complexity.

**General Responsibilities:**
- Leading complex implementation phases
- Writing production-grade code with proper architecture
- Identifying and handling edge cases
- Making sound technical decisions when plan is ambiguous

---

### Claude Sonnet — Lead Builder (Post-V1.6)
**Current Phase Responsibilities (V1.6):**
- Standby for Feature 1-3; escalate to if Opus needs support
- Available for parallel work on other components if needed

**General Responsibilities:**
- Implementing features in production
- Writing production code
- Making technical implementation decisions
- Building UI and backend components
- Implementing complex logic and calculations
- Handling complex refactors and debugging

Claude Sonnet is the default agent for important engineering work during implementation phases.

### Claude Haiku — Quick Executor
**Current Phase Responsibilities (V1.6):**
- Component styling with Tailwind (LoginForm, SignupForm, ModelsList, etc.)
- Writing and updating test cases per V1.6_IMPLEMENTATION_PLAN.md
- Documentation updates and README changes
- Small UI adjustments and bug fixes

**General Responsibilities:**
- Small bug fixes
- Simple UI adjustments
- Updating tests and test coverage
- Editing documentation
- Small, isolated refactors
- Fixing lint or TypeScript issues

Claude Haiku should only be used for clearly scoped, low-risk tasks. Do NOT use Haiku for core logic, complex calculations, or critical system components.

### Codex — Engineering Reviewer and Git Operator
**Current Phase Responsibilities (V1.6):**
- Review Feature 1 (Auth) implementation against V1.6_PRD.md
- Review Feature 2 (Persistence) implementation, verify RLS test coverage
- Review Feature 3 (Validation) implementation, verify all 7 rules tested
- Check performance targets met (auth < 2s, save < 1s, validation < 500ms)
- Verify test coverage and edge cases handled
- Commit and push changes to dev branch with descriptive messages

**General Responsibilities:**
- Reviewing plans and implementations critically
- Identifying bugs, edge cases, and technical risks
- Checking consistency with approved plans
- Handling commit and push workflows
- Writing clean, descriptive commit messages

Codex is primarily a reviewer and quality gate, not the main builder.

### Gemini — Brainstorm Partner
**Current Phase Responsibilities:**
- Planning next phase features and requirements
- Exploring UX patterns and interaction improvements
- Helping with product positioning and prioritization

**General Responsibilities:**
- Brainstorming product ideas and features
- Exploring UX directions and interaction patterns
- Helping with positioning and messaging
- Drafting planning docs and PRDs when useful
- Challenging assumptions and exploring alternatives

Gemini is not the primary implementation agent. Only use for ideation and planning, not execution.

## Default Workflow

### For Implementation Phase (Current - V1.6):
1. **Assign work to Claude Opus** — Implement Features 1-3 per V1.6_IMPLEMENTATION_PLAN.md (pragmatic, no over-engineering).
2. **Review with Codex** — Validate against V1.6_PRD.md, check test coverage, verify RLS and performance.
3. **Polish with Claude Haiku** — UI styling, test coverage, documentation updates.
4. **Commit with Codex** — Clean, descriptive commit messages; push to dev branch.

### For Planning Phase (V1.7+):
1. **Brainstorm with Gemini** — Explore features, UX patterns, and prioritization.
2. **Draft requirements** — Create V1.7_PRD.md and V1.7_IMPLEMENTATION_PLAN.md.
3. **Review and approve** — Get stakeholder sign-off before implementation begins.

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

**For Planning Phase:**
- **Feature brainstorming, requirements exploration, UX patterns** → Gemini
- **Draft PRD and implementation plans** → Gemini + stakeholder review
- **Architecture decisions** → Gemini + Sonnet (when implementation perspective needed)

**For Implementation Phase:**
- **Core logic and features per approved plan** → Claude Sonnet
- **UI, documentation, and polish** → Claude Haiku
- **Code review and quality gates** → Codex
- **Brainstorming (if needed mid-phase)** → Gemini

**General Guideline:**
- **Architecture, core logic, or maintainability** → Claude Sonnet
- **Small, clearly bounded, low-risk** → Claude Haiku
- **Review or git hygiene** → Codex
- **Ideation, alternatives, or messaging** → Gemini
