# AI Roles and Workflow

## Purpose
Define the default responsibilities of Claude, Codex, and Gemini in this repository.

**Current Project Context:** Operational Process Modeler is complete through V1.6 (Auth, Persistence, Validation). V1.7 enhancement phase in progress (Parameter Panel + Bottleneck Highlighting) — Lead: Claude Opus.

**Primary Documentation:**
- `README.md` — Product vision and value proposition
- `CLAUDE.md` — Claude-specific implementation guidance (V1.7)
- `docs/V1.7_PRD.md` — V1.7 product requirements
- `docs/AI_ROLES.md` — This file (role definitions and workflow)
- `docs/archive/v1.6/` — V1.6 implementation details (Auth, Persistence, Validation)
- `docs/archive/v1.5/` — V1.5 implementation history (for reference)

## AI Roles

### Claude Opus — Lead Builder (V1.7)
**Current Phase Responsibilities (V1.7):**
- Implement Parameter Panel enhancement (floating modal + before/after + reset, 2-3 days)
- Implement Bottleneck Highlighting enhancement (pulse animation + edge cases, 1-2 days)
- Write production code per V1.7_PRD.md (Section 9: Implementation Notes)
- Extract components from V1.6 codebase; don't rewrite
- Catch edge cases (multiple bottlenecks, invalid scenarios, empty graphs)
- Ensure no regressions to V1.6 features (simulation, validation, persistence)

**Principles:** Enhance existing code pragmatically. Reuse patterns from V1.6. Polish for production without over-engineering.

**General Responsibilities:**
- Leading complex implementation phases
- Writing production-grade code with proper architecture
- Identifying and handling edge cases
- Making sound technical decisions when plan is ambiguous

---

### Claude Sonnet — Lead Builder (Post-V1.7)
**Current Phase Responsibilities (V1.7):**
- Support Opus if parallel work needed or if enhancements become larger than expected
- Available for rapid iterations if UX polish requires additional rounds

**General Responsibilities:**
- Implementing features in production
- Writing production code
- Making technical implementation decisions
- Building UI and backend components
- Implementing complex logic and calculations
- Handling complex refactors and debugging

Claude Sonnet is the default agent for important engineering work during implementation phases.

### Claude Haiku — Quick Executor
**Current Phase Responsibilities (V1.7):**
- Component styling with Tailwind (floating panel, mobile UX polish)
- Writing and updating test cases per V1.7_PRD.md (Section 5: Acceptance Tests)
- Documentation updates and README changes
- Mobile UX refinement and touch-friendly adjustments
- E2E test implementation

**General Responsibilities:**
- Small bug fixes
- Simple UI adjustments
- Updating tests and test coverage
- Editing documentation
- Small, isolated refactors
- Fixing lint or TypeScript issues

Claude Haiku should only be used for clearly scoped, low-risk tasks. Do NOT use Haiku for core logic, complex calculations, or critical system components.

### Codex — Engineering Reviewer and Git Operator
**Current Phase Responsibilities (V1.7):**
- Review Enhancement 1 (Parameter Panel) implementation against V1.7_PRD.md (Section 2)
- Review Enhancement 2 (Bottleneck Highlighting) implementation against V1.7_PRD.md (Section 3)
- Verify regression tests pass: all V1.6 features still working
- Check performance targets met (panel render < 200ms, animations 60fps)
- Verify edge case handling: multiple bottlenecks, invalid scenarios, empty graphs
- Verify test coverage (mobile, desktop, edge cases)
- Commit and push changes to dev branch with descriptive messages (feat: / fix: / test:)

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

### For Implementation Phase (Current - V1.7):
1. **Assign work to Claude Opus** — Implement 2 enhancements per V1.7_PRD.md (extract components, add features, test edge cases).
2. **Review with Codex** — Validate against V1.7_PRD.md, verify regressions, check performance and edge cases.
3. **Polish with Claude Haiku** — Mobile UX refinement, test coverage, documentation updates, E2E tests.
4. **Commit with Codex** — Clean, descriptive commit messages; push to dev branch.

### For Planning Phase (V1.8+):
1. **Brainstorm with Gemini** — Explore features, UX patterns, and prioritization (scenario branching, sensitivity analysis, export).
2. **Draft requirements** — Create V1.8_PRD.md.
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
