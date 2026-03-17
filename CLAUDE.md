# Claude Implementation Guide

**Quick Reference for Claude Sonnet & Haiku**

---

## 📖 Read These First
- `README.md` — Product vision
- `docs/V1.7_PRD.md` — V1.7 enhancement requirements (Parameter Panel + Bottleneck Highlighting)
- `docs/AI_ROLES.md` — Git/collaboration rules
- `docs/archive/v1.6/` — V1.6 documentation (Auth, Persistence, Validation - completed)

---

## 🎯 Current Phase

**Status:** V1.7 enhancement phase (build on V1.6 foundation).

**Previous Phases:**
- **V1.0:** Linear process modeling (source → process → sink)
- **V1.5:** DAG support (merges, splits, fork-join with BOM ratios)
- **V1.6:** Auth, Persistence, Validation (✅ complete)
- **Archived documentation:** See `docs/archive/` for previous phase details

---

## 🎯 Role & Scope (V1.7)

**Claude Opus:** Lead implementation of 2 enhancements per V1.7_PRD.md
- Enhancement 1: Parameter Panel (floating modal + before/after + reset) — 2-3 days
- Enhancement 2: Bottleneck Highlighting (pulse animation + edge cases) — 1-2 days

**Opus Implementation Principles (ENHANCE, DON'T OVER-ENGINEER):**
- ✅ Follow the V1.7_PRD.md closely (enhancements to existing code, not new architectures)
- ✅ Reuse existing components and patterns (extract, don't rewrite)
- ✅ Write clean, readable code with proper error handling
- ✅ Add tests for new edge cases (multiple bottlenecks, invalid scenarios, etc.)
- ✅ Keep solutions simple and pragmatic
- ❌ No unnecessary abstractions or rewrites
- ❌ No premature optimization
- ❌ No changes to simulation engine or validation logic (V1.6 foundation stays solid)
- ❌ No complex utility libraries for simple tasks (CSS animations, simple conditional rendering)

**Quality Focus:** Polish for production quality without adding unnecessary complexity.

**Claude Haiku:** Component styling, testing, and documentation (after Opus)
- Mobile UX polish with Tailwind
- Test coverage for edge cases (multiple bottlenecks, invalid states)
- Documentation updates and README changes

**Out of Scope (V1.8+):** Scenario branching, historical what-if tracking, sensitivity analysis, PDF export

---

## 🚀 Build Steps (V1.7)

See `docs/V1.7_PRD.md` for complete enhancement requirements:

**Enhancement 1 (Parameter Panel):** Extract floating panel component → Add before/after display → Add reset button → Mobile modal implementation
**Enhancement 2 (Bottleneck Highlighting):** Add pulse animation CSS → Edge case handling (zero/multiple/invalid) → Hover tooltip → Integration testing

---

## ⚠️ Key Risk Areas (V1.7)

- **Floating Panel Positioning:** Must not obscure important graph content on narrow screens (< 1024px)
- **Pulse Animation:** Must be subtle enough not to distract; test UX over extended use
- **Reset Button:** Must provide clear visual feedback; undo must be instant and obvious
- **Edge Cases:** Multiple bottlenecks, invalid scenarios, empty graphs must display correctly

---

## ✅ Definition of Done

V1.7 is complete when:
- ✅ All 2 enhancements implemented per V1.7_PRD.md (Section 5: Success Criteria)
- ✅ Floating panel extracts and floats correctly on desktop, modal on mobile
- ✅ Before/after comparison displays with clear formatting (throughput, bottleneck, utilization)
- ✅ Reset button reverts changes without saving; Save button commits to DB
- ✅ Pulse animation on bottleneck badges (subtle, stops on hover/focus)
- ✅ All edge cases handled: zero bottleneck, multiple, invalid, empty graph
- ✅ Hover tooltip shows detailed metrics
- ✅ E2E workflow test passing (float panel → adjust → reset → adjust → save → verify in DB)
- ✅ Mobile bottom-sheet tested on real device
- ✅ All V1.6 features still working (no regressions)
- ✅ No console errors or warnings
- ✅ Performance targets met (panel render < 200ms, animations 60fps)

---

## 📁 Files to Create/Modify

**See Section 4.4 of V1.7_PRD.md for exact file list:**
- **New:** `components/editor/FloatingParameterPanel.tsx`
- **Modified:** `components/editor/PropertiesPanel.tsx`, `ProcessNode.tsx`, `styles.ts`, `EditorLayout.tsx` (optional)
- **Unchanged:** Simulation engine, validation logic, store architecture

---

## 🤝 Collaboration
- Use `dev` branch, not `main`
- See `docs/AI_ROLES.md` for git workflow and commit conventions
- Previous phase archives available at `docs/archive/`