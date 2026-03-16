# Claude Implementation Guide

**Quick Reference for Claude Sonnet & Haiku**

---

## 📖 Read These First
- `README.md` — Product vision
- `docs/V1.6_PRD.md` — V1.6 feature requirements (Auth, Persistence, Validation)
- `docs/V1.6_IMPLEMENTATION_PLAN.md` — V1.6 implementation roadmap with code skeletons
- `docs/AI_ROLES.md` — Git/collaboration rules

---

## 🎯 Current Phase

**Status:** V1.6 implementation phase starting.

**Previous Phases:**
- **V1.0:** Linear process modeling (source → process → sink)
- **V1.5:** DAG support (merges, splits, fork-join with BOM ratios)
- **Archived documentation:** See `docs/archive/v1.5/` for V1.5 implementation details

---

## 🎯 Role & Scope (V1.6)

**Claude Opus:** Lead implementation of all 3 features per V1.6_IMPLEMENTATION_PLAN.md
- Feature 1: Supabase Auth Setup (3 days)
- Feature 2: Model Persistence with RLS (2 days)
- Feature 3: Process Validation (3 days)

**Opus Implementation Principles (NO OVER-ENGINEERING):**
- ✅ Follow the implementation plan closely (don't invent new architectures)
- ✅ Use standard patterns (Supabase auth, React hooks, Zustand stores)
- ✅ Write clean, readable code with proper error handling
- ✅ Add tests for critical paths (auth, RLS, validation)
- ✅ Keep solutions simple and pragmatic
- ❌ No unnecessary abstractions or layers
- ❌ No premature optimization or over-generalization
- ❌ No custom state management if Zustand works
- ❌ No complex utility libraries for simple tasks

**Quality Focus:** Catch edge cases and handle errors properly — not complexity for complexity's sake.

**Claude Haiku:** Polish, testing, and documentation (after Opus)
- Component styling with Tailwind
- Test coverage and edge cases
- Documentation updates

**Out of Scope (V1.7+):** Password reset, team sharing, Excel import, PDF export, offline mode, advanced auth

---

## 🚀 Build Steps (V1.6)

See `docs/V1.6_IMPLEMENTATION_PLAN.md` for detailed 10+ step checklist per feature:

**Feature 1 (Auth):** Supabase setup → Auth helpers → Context → Pages → Protected routes → Testing
**Feature 2 (Persistence):** Database schema → CRUD functions → useModels hook → Dashboard → Editor
**Feature 3 (Validation):** Validation functions → Graph traversal → Rules → Hooks → UI integration

---

## ⚠️ Key Risk Areas (V1.6)

- **RLS Configuration:** Must correctly isolate user data; test cross-user access prevention
- **Auto-Save Logic:** 30s debounce must not hammer database; implement connection pooling
- **Validation Performance:** Graph algorithms must complete in < 500ms on 50-node models
- **Email Verification:** Confirmation email flow must be tested; handle spam filters

---

## ✅ Definition of Done

V1.6 is complete when:
- ✅ All 3 features implemented per V1.6_IMPLEMENTATION_PLAN.md
- ✅ 100% RLS test coverage (cross-user access blocked)
- ✅ All validation rules tested (7 rules + edge cases)
- ✅ E2E tests passing (signup → create → validate → save → logout → login → load)
- ✅ Performance targets met (auth < 2s, save < 1s, validation < 500ms)
- ✅ No console errors or warnings in browser
- ✅ All PRD success criteria met

---

## 📁 Files to Create/Modify

**See Section 1, 2, 3 of V1.6_IMPLEMENTATION_PLAN.md for exact file structure:**
- 15+ new component files
- 5+ new lib/hooks files
- 10+ test files
- 1 database migration
- 4 RLS policies

---

## 🤝 Collaboration
- Use `dev` branch, not `main`
- See `docs/AI_ROLES.md` for git workflow and commit conventions
- Previous phase archives available at `docs/archive/`