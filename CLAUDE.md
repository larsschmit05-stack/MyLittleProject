# Operational Process Modeler - Claude Instructions

## 1. Purpose
Define how Claude should behave when working in this repository as the **Implementation Engineer**.

## 2. Context Sources
Claude **MUST** read the following files **BEFORE** implementing any feature or writing code:
- `README.md`
- `docs/V1.5_PRD.md` (current version)
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

## 6. Claude Sonnet vs. Claude Haiku Task Breakdown

### Claude Sonnet — Use for V1.5 Work:
**Sonnet handles architecture, core logic, and complex features.** For this project:
- **DAG Graph Engine:** Implementing merge/split node support and complex graph validation
- **Topological Sort & Demand Propagation:** Core calculation logic for complex networks with BOM ratios and split ratios
- **Authentication System:** Building secure login and user data ownership
- **Import/Export Logic:** Complex Excel parsing and PDF/spreadsheet generation
- **Merge/Split Configuration UI:** New sidebar components with BOM and split ratio inputs
- **Calculation Engine Refactor:** Extending V1 propagation logic to handle DAGs, merges, and splits
- **Complex Bug Fixes:** Issues requiring deep knowledge of calculation logic or graph structure
- **Testing Strategy:** Writing comprehensive tests for topological sort, merge handling, and split distribution

### Claude Haiku — Use for V1.5 Work:
**Haiku handles isolated, well-scoped fixes and adjustments.** For this project:
- **UI Polish:** Adjusting colors, spacing, or button positioning for merge/split nodes
- **Input Validation Helpers:** Adding simple validation rules for BOM or split ratio inputs (e.g., ensuring split ratios sum to 100%)
- **Documentation Updates:** Updating README, guides, or comments to explain merge/split features
- **Test Coverage:** Writing additional tests once the core logic exists (extending existing test patterns)
- **Lint & TypeScript Fixes:** Fixing type errors or linting issues in code Sonnet wrote
- **Simple Refactors:** Extracting repeated component code into reusable helpers (small scope)
- **Bug Fixes:** Issues that are clearly scoped and don't require architectural changes (e.g., "fix typo in BOM label")
- **Data Migration Scripts:** Small scripts to transform V1 data if needed for V1.5

### Decision Rule for V1.5:
- **Does it involve core math or graph logic?** → Sonnet
- **Does it touch authentication or external data (Excel, PDF)?** → Sonnet
- **Does it require new component architecture or refactoring existing logic?** → Sonnet
- **Is it a small, isolated fix to existing code?** → Haiku
- **Is it documentation, testing, or polish?** → Haiku (unless it's test strategy/architecture)

---

## 7. Collaboration With Other Agents
For feature work, Claude participates in the workflow at specific phases:
- **Implementation:** Claude implements the feature *after* a plan has been reviewed.
- **Review (Optional):** After implementation, Codex may optionally review Claude's code, if requested.

For general details regarding Git branching rules (e.g., must use `dev` branch) and commit message conventions, strictly adhere to the instructions in `docs/AI_ROLES.md`.