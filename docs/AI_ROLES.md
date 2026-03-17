# AI Roles and Workflow

## Purpose
Define the default responsibilities of Claude, Codex, and Gemini in this repository.

**Current Project Context:** Operational Process Modeler is complete through V1.7 (Auth, Persistence, Validation, Parameter Panel, Bottleneck Highlighting). V1.8 enhancement phase in progress (Scenario Manager) — Lead: Claude Sonnet/Opus. Company testing V2 with full V1.8 feature set.

**Primary Documentation:**
- `README.md` — Product vision and value proposition
- `CLAUDE.md` — Claude-specific implementation guidance (V1.8)
- `docs/V1.8_PRD.md` — V1.8 product requirements (Scenario Manager)
- `docs/V1.8_IMPLEMENTATION.md` — V1.8 step-by-step build guide (12 phases)
- `docs/AI_ROLES.md` — This file (role definitions and workflow)
- `docs/archive/v1.7/` — V1.7 implementation details (Parameter Panel + Bottleneck Highlighting)
- `docs/archive/v1.6/` — V1.6 implementation details (Auth, Persistence, Validation)
- `docs/archive/v1.5/` — V1.5 implementation history (for reference)

## AI Roles

### Claude Opus — Lead Builder (V1.8)
**Current Phase Responsibilities (V1.8):**
- Lead implementation of Scenario Manager per V1.8_IMPLEMENTATION.md (21 days, 12 phases)
- Implement core features: scenario switching, parameter editing, simulation, bottleneck detection
- Write production code with Zustand store, DB integration, error handling
- Ensure all edge cases handled: multiple bottlenecks, deleted scenarios, save failures
- Ensure no regressions to V1.6 + V1.7 features (auth, persistence, bottleneck highlighting)
- Performance optimization: simulation <300ms, render 60fps
- Scope lock: All features ship in V1.0 (no deferral to V1.1)

**Principles:** Build for production, not MVP. Complete feature set. Reuse V1.6 patterns. Company is testing V2 with this code.

**General Responsibilities:**
- Leading complex implementation phases
- Writing production-grade code with proper architecture
- Identifying and handling edge cases
- Making sound technical decisions when plan is ambiguous

---

### Claude Sonnet — Lead Builder (V1.8)
**Current Phase Responsibilities (V1.8):**
- Lead implementation of Scenario Manager (if Opus unavailable or parallel tracks needed)
- Implement feature phases: foundation, core features, comparison, export
- Write production code per V1.8_IMPLEMENTATION.md
- Handle rapid iterations and performance optimization
- Code review and quality assurance

**General Responsibilities:**
- Implementing features in production
- Writing production code with proper testing
- Making technical implementation decisions
- Building UI and backend components
- Implementing complex logic and calculations
- Handling complex refactors and debugging

Claude Sonnet is the default agent for important engineering work during implementation phases.

### Claude Haiku — Quick Executor
**Current Phase Responsibilities (V1.8):**
- Component styling with Tailwind (scenario tabs, parameter panel, metrics, comparison)
- Writing and updating test cases per V1.8_IMPLEMENTATION.md (Phase 11: Testing)
- Documentation updates (user guide, API docs, README changes)
- Mobile UX refinement and touch-friendly adjustments (responsive layout testing)
- E2E test implementation (user workflows: create → edit → save → compare)
- Accessibility improvements (ARIA labels, tab order, color contrast)

**General Responsibilities:**
- Small bug fixes
- Simple UI adjustments
- Updating tests and test coverage
- Editing documentation
- Small, isolated refactors
- Fixing lint or TypeScript issues

Claude Haiku should only be used for clearly scoped, low-risk tasks. Do NOT use Haiku for core logic, complex calculations, or critical system components.

### Codex — Engineering Reviewer and Git Operator
**Current Phase Responsibilities (V1.8):**
- Review Scenario Manager implementation against V1.8_PRD.md and V1.8_IMPLEMENTATION.md
- Verify all 18 success criteria met (see V1.8_PRD.md Section 7)
- Verify regression tests pass: all V1.6 + V1.7 features still working
- Check performance targets met: simulation <300ms, load <500ms, render 60fps
- Verify edge case handling: multiple bottlenecks, no bottleneck, deleted scenarios, save failures
- Verify test coverage: unit tests + E2E workflows (create → edit → simulate → save → compare → export)
- Verify mobile responsiveness: 320px, 768px, 1024px, 1440px tested
- Verify accessibility: tab order correct, ARIA labels present, color contrast AAA
- Commit and push changes to dev branch with descriptive messages (feat: / fix: / test: / docs:)
- Flag scope creep: all features in V1.0, nothing deferred to V1.1

**General Responsibilities:**
- Reviewing plans and implementations critically
- Identifying bugs, edge cases, and technical risks
- Checking consistency with approved plans
- Handling commit and push workflows
- Writing clean, descriptive commit messages

Codex is primarily a reviewer and quality gate, not the main builder.

### Gemini — Brainstorm Partner
**Current Phase Responsibilities (V1.8):**
- Available if mid-phase discovery is needed (e.g., "is this edge case important?")
- Help prioritize if scope creep occurs
- Explore V1.9 features when V1.8 nears completion

**General Responsibilities:**
- Brainstorming product ideas and features
- Exploring UX directions and interaction patterns
- Helping with positioning and messaging
- Drafting planning docs and PRDs when useful
- Challenging assumptions and exploring alternatives

Gemini is not the primary implementation agent. Only use for ideation and planning, not execution.

## Default Workflow

### For Implementation Phase (Current - V1.8):
1. **Assign work to Claude Opus/Sonnet** — Implement Scenario Manager per V1.8_IMPLEMENTATION.md (21 days, 12 phases).
2. **Review with Codex** — Validate against V1.8_PRD.md, verify 18 success criteria met, check regressions, performance, edge cases, accessibility.
3. **Polish with Claude Haiku** — Mobile UX refinement, test coverage (unit + E2E), documentation updates, accessibility fixes.
4. **Commit with Codex** — Clean, descriptive commit messages; push to dev branch.
5. **Deploy for company testing** — Full V1.8 feature set (no MVP shortcuts).

### For Planning Phase (V1.9+):
1. **Brainstorm with Gemini** — Explore features, UX patterns, and prioritization (3-column comparison, PDF export, scenario templates).
2. **Draft requirements** — Create V1.9_PRD.md.
3. **Review and approve** — Get stakeholder sign-off before implementation begins.

### For General Feature Work:
1. Define the feature clearly (or use Gemini to brainstorm).
2. Use Claude Sonnet/Opus to implement it.
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
