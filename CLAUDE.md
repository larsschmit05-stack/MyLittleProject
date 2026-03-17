# Claude Implementation Guide

**Quick Reference for Claude Sonnet & Haiku**

---

## 📖 Read These First
- `README.md` — Product vision
- `docs/V1.8_PRD.md` — V1.8 requirements (Scenario Manager)
- `docs/V1.8_IMPLEMENTATION.md` — V1.8 step-by-step implementation guide
- `docs/AI_ROLES.md` — Git/collaboration rules
- `docs/archive/v1.7/` — V1.7 documentation (Parameter Panel + Bottleneck Highlighting - completed)
- `docs/archive/v1.6/` — V1.6 documentation (Auth, Persistence, Validation - completed)

---

## 🎯 Current Phase

**Status:** V1.8 enhancement phase (Scenario Manager - build on V1.6+V1.7 foundation).

**Previous Phases:**
- **V1.0:** Linear process modeling (source → process → sink)
- **V1.5:** DAG support (merges, splits, fork-join with BOM ratios)
- **V1.6:** Auth, Persistence, Validation (✅ complete)
- **V1.7:** Parameter Panel + Bottleneck Highlighting (✅ complete)
- **Archived documentation:** See `docs/archive/` for previous phase details

---

## 🎯 Role & Scope (V1.8)

**Claude Sonnet/Opus:** Lead implementation of Scenario Manager per V1.8_PRD.md
- Phase 1-3: Foundation & data model (3 days)
- Phase 4-7: Core features (parameter editing, simulation, save/load) (7 days)
- Phase 8-10: Comparison & export features (4 days)

**Implementation Principles (BUILD FOR PRODUCTION):**
- ✅ Follow the V1.8_PRD.md and V1.8_IMPLEMENTATION.md closely
- ✅ Use Zustand store for state management (reuse patterns from V1.6)
- ✅ Write clean, well-tested code with proper error handling
- ✅ Reuse V1.6 simulation engine (don't rewrite)
- ✅ Handle edge cases: multiple bottlenecks, no bottleneck, deleted scenarios
- ✅ Performance targets: simulation <300ms, load <500ms, render 60fps
- ✅ Mobile responsive from day 1 (320px, 768px, 1440px tested)
- ❌ No unnecessary abstractions or premature optimization
- ❌ No changes to V1.6/V1.7 core logic
- ❌ Don't defer features to "V1.9" — all features ship in V1.0

**Quality Focus:** Production-ready for company V2 testing. Complete feature set, not MVP.

**Claude Haiku:** Component styling, testing, and documentation (after core implementation)
- Mobile UX polish with Tailwind
- Test coverage (unit + E2E for all workflows)
- Documentation updates and API docs

**Out of Scope (V1.1+):** 3-column comparison, PDF/Excel export, delta indicators, scenario templates

---

## 🚀 Build Steps (V1.8)

See `docs/V1.8_IMPLEMENTATION.md` for complete 12-phase implementation guide:

**Phase 1-3 (Foundation):** Data model + DB schema → Scenario tabs → Duplication & rename
**Phase 4-7 (Core Features):** Parameter editing → Simulation trigger → Bottleneck detection → Metrics display → Save/load
**Phase 8-10 (Additional Features):** 2-column comparison → CSV export → Edge cases & error handling
**Phase 11-12 (Polish & Docs):** Testing, performance optimization, accessibility, documentation

---

## ⚠️ Key Risk Areas (V1.8)

- **Data Persistence:** Scenarios must survive browser refresh, logout, DB failures
- **State Management:** Zustand store must track unsaved edits correctly (don't lose user work)
- **Simulation Performance:** <300ms for 100-node models; bottleneck detection must be correct
- **Responsive Layout:** Scenario tabs + parameter panel + metrics panel on mobile (<1200px)
- **Edge Cases:** Multiple bottlenecks, no bottleneck, deleted scenarios, save failures
- **Company Testing:** Full feature set (no deferral) — company will test scenarios, comparison, export immediately

---

## ✅ Definition of Done

V1.8 is complete when:
- ✅ All features implemented per V1.8_PRD.md (18 success criteria)
- ✅ Scenario switching works (tabs, [+ New], rename dialog)
- ✅ Parameter editing + [Simulate] works (instant feedback, all node types)
- ✅ Bottleneck detection correct (single, multiple, none)
- ✅ Metrics display accurate (throughput, bottleneck, utilization)
- ✅ Save/load working (round-trip to DB, unsaved edits warning)
- ✅ 2-column comparison view (read-only, any 2 scenarios)
- ✅ CSV export generates correct format
- ✅ All edge cases handled (deleted scenarios, save failures, network errors)
- ✅ E2E workflows passing: create → edit → simulate → save → compare → export
- ✅ Mobile responsive (320px, 768px, 1024px, 1440px tested)
- ✅ All V1.6 + V1.7 features still working (no regressions)
- ✅ Performance targets met (simulation <300ms, load <500ms, render 60fps)
- ✅ No console errors or warnings
- ✅ Accessibility: tab order, ARIA labels, AAA color contrast
- ✅ Unit + E2E tests passing

---

## 📁 Files to Create/Modify

**See V1.8_IMPLEMENTATION.md for exact file list by phase:**
- **New:** `types/scenario.ts`, `store/scenarioStore.ts`, `lib/db/scenarios.ts`, `components/editor/ScenarioTabs.tsx`, `components/editor/ParameterPanel.tsx`, `components/editor/MetricsPanel.tsx`, `components/editor/ComparisonView.tsx`, `lib/export/csv.ts`, `lib/simulation/bottleneck.ts`
- **Modified:** `components/editor/EditorLayout.tsx`, `components/editor/CanvasArea.tsx` (for bottleneck highlighting)
- **Unchanged:** V1.6 simulation engine, validation logic, auth system

---

## 🤝 Collaboration
- Use `dev` branch, not `main`
- See `docs/AI_ROLES.md` for git workflow and commit conventions
- Previous phase archives available at `docs/archive/`