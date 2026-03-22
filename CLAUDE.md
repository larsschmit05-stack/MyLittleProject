# Claude Implementation Guide

**Quick Reference for Claude Sonnet & Haiku**

---

## 📖 Read These First
- `README.md` — Product vision
- `docs/V1.9_PRD.md` — V1.9 requirements (Model Sharing & Permissions)
- `docs/AI_ROLES.md` — Git/collaboration rules
- `docs/archive/v1.8/` — V1.8 documentation (Scenario Manager - completed)
- `docs/archive/v1.7/` — V1.7 documentation (Parameter Panel + Bottleneck Highlighting - completed)
- `docs/archive/v1.6/` — V1.6 documentation (Auth, Persistence, Validation - completed)

---

## 🎯 Current Phase

**Status:** V1.9 enhancement phase (Model Sharing & Permissions)

**Phase Overview:**
Enable users to share models with team members via email invitations, granting **View** (read-only) or **Edit** (collaborative) access. Async collaboration with last-write-wins conflict resolution.

**Previous Phases:**
- **V1.0:** Linear process modeling (source → process → sink)
- **V1.5:** DAG support (merges, splits, fork-join with BOM ratios)
- **V1.6:** Auth, Persistence, Validation (✅ complete)
- **V1.7:** Parameter Panel + Bottleneck Highlighting (✅ complete)
- **V1.8:** Scenario Manager (✅ complete)
- **Archived documentation:** See `docs/archive/` for all phase details

---

## 🎯 Role & Scope (V1.9)

**Claude Sonnet/Opus:** Lead implementation of Model Sharing per V1.9_PRD.md
- Database schema + RLS: 2–3 days
- Email service (Brevo) integration: 1 day
- Invite API endpoints: 2–3 days
- Share modal UI: 3–4 days
- Invite acceptance flow: 2–3 days
- Permission enforcement: 2–3 days
- Testing + edge cases: 3–4 days

**Implementation Principles (BUILD FOR PRODUCTION):**
- ✅ Follow V1.9_PRD.md closely
- ✅ Use Zustand store for state management (reuse patterns from V1.6)
- ✅ Write clean, well-tested code with proper error handling
- ✅ Reuse V1.6 auth + DB patterns
- ✅ RLS enforces permissions (backend security first)
- ✅ Mobile responsive from day 1 (320px, 768px, 1440px tested)
- ✅ All success criteria met before merge
- ❌ No unnecessary abstractions or premature optimization
- ❌ No role changes or real-time sync (V1.1+ scope)

**Quality Focus:** Production-ready for team collaboration. Full invite + permission system.

**Out of Scope (V1.1+):** Role changes, edit users re-inviting, real-time sync, audit logs, bulk invites, shareable links, workspaces

---

## 🚀 Build Steps (V1.9)

See `docs/V1.9_PRD.md` for complete feature spec:

**Phase 1 (DB + Email):** model_access schema + RLS → Brevo integration
**Phase 2 (Backend):** Invite API → Access list API → Accept endpoint
**Phase 3 (Frontend UI):** Share modal → Invite form → Current access list
**Phase 4 (Acceptance Flow):** Invite link page → Signup/login → Accept confirmation
**Phase 5 (Permissions):** View-only UI → Edit controls → Backend RLS enforcement
**Phase 6 (Testing):** E2E workflows → Edge cases → Mobile polish

---

## ⚠️ Key Risk Areas (V1.9)

- **Email deliverability:** Invites must reach inbox (use Brevo's verified domain)
- **Permission enforcement:** RLS must block unauthorized access (403 on all API calls)
- **Last-write-wins conflicts:** Users may lose concurrent edits; acceptable but document
- **Invite expiration:** 30-day expiry logic + [Resend] must work correctly
- **Access revocation:** Immediately block revoked users (logged-out check needed)
- **Mobile UX:** Share modal must work on <400px screens

---

## ✅ Definition of Done

V1.9 is complete when:
- ✅ All 16 success criteria met (see V1.9_PRD.md)
- ✅ Owner can share model + send email invites
- ✅ Invited user receives email + can accept via link
- ✅ View access: all controls disabled (read-only UI)
- ✅ Edit access: full editing + save works
- ✅ Changes from one user persist to DB
- ✅ Other user sees changes on refresh
- ✅ Owner can revoke access
- ✅ Concurrent edits: last-write-wins (no error)
- ✅ Non-owner cannot delete model or manage sharing
- ✅ Backend RLS prevents unauthorized access (403)
- ✅ Expired invites show [Resend] option
- ✅ Edge cases handled (invalid email, duplicate, revoked access)
- ✅ E2E test: invite → accept → edit → save
- ✅ Mobile responsive (320px+)
- ✅ No console errors or security warnings
- ✅ All V1.6 + V1.7 + V1.8 features still working (no regressions)

---

## 📁 Files to Create/Modify

**New:**
- `types/modelAccess.ts` — TypeScript interfaces
- `lib/db/modelAccess.ts` — DB queries
- `lib/email/invites.ts` — Brevo integration
- `components/editor/ShareModal.tsx` — Share modal UI
- `components/public/InviteAcceptance.tsx` — Invite acceptance page
- `pages/api/models/[modelId]/invite.ts` — POST invite
- `pages/api/models/[modelId]/access.ts` — GET access list
- `pages/api/invites/[token]/accept.ts` — POST accept

**Modify:**
- `components/editor/EditorLayout.tsx` — Add [Share] button
- `store/modelStore.ts` — Access checking
- `lib/db/models.ts` — Permission checks

---

## 🤝 Collaboration
- Use `dev` branch, not `main`
- See `docs/AI_ROLES.md` for git workflow and commit conventions
- Previous phase archives available at `docs/archive/`

---

## 🛠️ Custom Commands

### `/save` — Commit and Push to Dev Branch

When `/save` is invoked:
1. Review all changes (`git status`)
2. Stage all modified files (`git add`)
3. Create a conventional commit message (feat:, fix:, docs:, etc.)
4. Commit the changes
5. Push to `origin/dev` branch
6. Show confirmation with branch and commit hash

**Guidelines:**
- Keep commit message summary ≤50 characters
- Follow conventional commits: `feat:`, `fix:`, `docs:`, `test:`, `refactor:`, etc.
- Include context in body if changes are substantial (>5 files)
- Example: `feat: add scenario comparison view with metrics display`