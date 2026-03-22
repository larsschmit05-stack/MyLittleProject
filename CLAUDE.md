# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Product

Operational Process Modeler — a SaaS tool for visually modeling production processes as DAG flow networks and analyzing capacity bottlenecks. Users draw process flows on a canvas (source → process → sink), configure parameters, and instantly see throughput, utilization, and bottlenecks. Lightweight alternative to Excel models and ERP systems.

See `README.md` for full product vision and `docs/` for PRDs.

## Commands

```bash
npm run dev          # Start Next.js dev server
npm run build        # Production build
npm run lint         # ESLint
npm run test         # Vitest (all tests)
npx vitest run path/to/file.test.ts  # Single test file
```

## Tech Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript**
- **React Flow 11** for DAG canvas visualization
- **Zustand** for state management (3 stores)
- **Supabase** (PostgreSQL + Auth + RLS) — backend
- **Brevo** — transactional email (invites)
- **Tailwind CSS 4** — styling
- **Vitest** + Testing Library — tests
- **Vercel** — deployment

## Architecture

### State Management (store/)

Three Zustand stores — all client-side state flows through these:

- **useFlowStore** — Core editor state: nodes, edges, scenarios, demand, calculations, validation. The largest and most important store.
- **useAuthStore** — Auth state: user, session, login/signup/logout. Listens to Supabase auth state changes.
- **useModelAccessStore** — Sharing & permissions: access list, invite/revoke/cancel actions, current user role.

### API Routes (app/api/)

Next.js App Router API routes. Key groups:

- `models/[modelId]/invite` — POST send invite
- `models/[modelId]/access` — GET access list; `access/[userId]` DELETE revoke
- `models/[modelId]/cancel-invite` — POST cancel pending invite
- `models/shared` — GET models shared with current user
- `invites/[token]/accept|decline|details|resend` — Invite workflow

### Database & Auth

- **Supabase client**: `lib/supabase.ts` (browser), `lib/supabaseServer.ts` (server/API routes)
- **Tables**: `models`, `scenarios`, `model_access`, `invite_tokens`
- **RLS enforces all permissions** — backend security first. Policies in `supabase/migrations/20260321_add_sharing_rls.sql`
- **Stored procedures** (SECURITY DEFINER): `get_user_access_level`, `get_model_access_list`, `get_user_email`, `accept_invite_by_token`, `decline_invite_by_token` — in `supabase/migrations/`
- **Persistence**: `lib/persistence.ts` (insertModel, updateModel, fetchModel)
- **DB queries**: `lib/db/modelAccess.ts` (invites, access), `lib/db/scenarios.ts`

### Editor / Canvas

- `components/editor/EditorLayout.tsx` — Main layout container
- `components/editor/CanvasArea.tsx` — React Flow wrapper
- `components/editor/nodes/` — Custom nodes: SourceNode, ProcessNode, SinkNode
- `components/editor/edges/ScrapAwareEdge.tsx` — Custom edge with BOM ratios
- Flow calculations: `utils/calculations.ts` — see DAG Calculation Engine below
- Flow validation: `lib/flow/validation.ts`
- Bottleneck detection: `lib/flow/bottleneck.ts`
- Editor init: `EditorInitClient.tsx` reads `?id=` from URL → calls `loadModel(id)`. New models have no `?id`, so `savedModelId` stays `null` until first save.

### DAG Calculation Engine (utils/calculations.ts)

Two-pass algorithm in `calculateFlowDAG()`:

1. **Forward pass** (source → sink): Computes `flowShare` per node — the fraction of total flow passing through it, accounting for split ratios on edges. Parallel branches each get flowShare=1.0.
2. **Reverse pass** (sink → source): Propagates `requiredThroughput` backward from global demand. At merge nodes, incoming edges are grouped by material (`outputMaterial` of source node). Each material group applies its BOM ratio. Same-material edges from multiple suppliers are pooled and demand is distributed proportionally by flow share (not by capacity).

Key concepts:
- **throughputRate**: Input processing rate per time unit (before yield loss). UI label: "Processing Rate".
- **Effective capacity**: `throughputRate × availableTime × numberOfResources × (yield/100)`
- **Utilization**: `requiredThroughput / effectiveCapacity` — bottleneck is the node with highest utilization
- **System throughput**: `globalDemand / maxUtilization` when constrained, `globalDemand` otherwise
- **Time unit**: Model-level setting (minute/hour/day/week). Labels update dynamically. The calculation engine is unit-agnostic; consistency is the user's responsibility.
- **conversionRatio**: Input units consumed per output unit. Examples: bottling 1.05, forging 5.0, assembly 1.0. See `lib/flow/conversionRatio.ts`.
- **Scrap edges** (`edge.data.isScrap === true`) are excluded from topology and demand propagation
- **Utilization thresholds** are centralized in `lib/flow/thresholds.ts` — all surfaces use `>=` for the bottleneck threshold (0.95)

### Sharing & Permissions (V1.9)

- `model_access` table tracks user access (status: pending/accepted/declined/revoked)
- `invite_tokens` table tracks email invitations (status: pending/accepted/declined/expired/revoked)
- `revokeAccess()` in `lib/db/modelAccess.ts` must update BOTH tables
- `createInvite()` cross-checks `model_access` to avoid blocking re-invites after revocation
- Email via `lib/email/brevoClient.ts` + `lib/email/sendInvite.ts`
- Share UI: `components/editor/ShareModal.tsx`
- Invite acceptance: `app/invites/[token]/page.tsx` + `components/public/InviteAcceptClient.tsx`

### Middleware & Routing

`middleware.ts` — Auth guard using Supabase SSR. Public paths: `/`, `/login`, `/signup`, `/invites/*`. Unauthenticated users on protected routes redirect to `/login`. Authenticated users on auth pages redirect to `/dashboard`.

### App Pages

- `/dashboard` — Model list
- `/editor/[modelId]` — Editor canvas
- `/login`, `/signup` — Auth
- `/invites/[token]` — Invite acceptance

### PDF Export

`lib/export/pdf.ts` — Generates PDF reports of model results using jspdf + jspdf-autotable. Tests in `lib/export/__tests__/pdf.test.ts`.

## Key Patterns

- **Zustand stores** are the single source of truth for client state — components read from stores, actions mutate through store methods
- **RLS is the security boundary** — never rely solely on frontend checks
- **Supabase RPCs** (SECURITY DEFINER) for cross-table operations that need to bypass RLS (e.g., accepting invites, looking up emails from auth.users)
- **Last-write-wins** for concurrent edits (no real-time sync)
- **Conventional commits**: `feat:`, `fix:`, `docs:`, `test:`, `refactor:`
- **Branch**: work on `dev`, not `main`
- **UI styling**: CSS custom properties (not raw hex) for colors — see `docs/UI_STYLE_GUIDE.md` and `components/editor/styles.ts` for shared style objects

## Testing

### Structure & Patterns

Vitest with jsdom environment (`vitest.config.ts` + `vitest.setup.ts`). Tests live next to the code they test:
- `utils/calculations.test.ts` — DAG calculation logic (largest test suite)
- `lib/flow/validation.test.ts` — Model validation
- `store/*.test.ts` — Zustand store actions
- `lib/db/*.test.ts` — Database/API functions

### DAG Calculation Tests

When modifying `calculateFlowDAG()`, test structure is:

1. **Backward-compatibility tests** — Single-product, linear, merge/split scenarios must not regress
2. **New feature tests** — Add tests for the new capability (multi-product, capacity-aware routing, etc.)
3. **Edge case tests** — Zero demand, all capacity at one node, utilization exactly at threshold (0.95)

Example pattern:
```typescript
describe('calculateFlowDAG', () => {
  it('should propagate demand backward through linear flow', () => {
    // Setup: source → process → sink
    // Verify: process.requiredThroughput === globalDemand
  });

  it('should distribute demand at merge nodes by flow share', () => {
    // Setup: suppliers A and B → merge → sink
    // Verify: demand splits proportionally by flow share (not capacity)
  });
});
```

### Running Tests

```bash
npm run test                           # All tests
npx vitest run utils/calculations.test.ts  # Single file
npx vitest watch                      # Watch mode
```

## Environment Variables

Required in both `.env.local` (dev) and Vercel (prod):

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase connection
- `BREVO_API_KEY`, `BREVO_SENDER_EMAIL`, `BREVO_SENDER_NAME` — Email delivery

## Modifying the DAG Calculation Engine

The DAG engine is the computational core. When extending it (e.g., for V1.9.2 features), follow this pattern:

### 1. **Define the feature in types** (`types/flow.ts`)

Before modifying calculations, extend the data structures:
```typescript
// Example: adding OEE decomposition
interface ProcessNodeData {
  availabilityRate?: number;    // 0–100, default 100
  performanceEfficiency?: number; // 0–100, default 100
  qualityRate?: number;         // 0–100, default 100
  // ... rest of fields
}
```

### 2. **Update the calculation** (`utils/calculations.ts`)

The two-pass algorithm is in `calculateFlowDAG()`:
- **Forward pass**: Computes `flowShare` (fraction of total flow through each node)
- **Reverse pass**: Propagates `requiredThroughput` backward from sink

For most features, modify the **reverse pass** where utilization is calculated:
```typescript
// Current: effective capacity = throughputRate × availableTime × numResources × (yield/100)
// New (OEE): effective capacity = throughputRate × availableTime × numResources × (availability × performance × quality / 1000000)
```

### 3. **Add validation** (`lib/flow/validation.ts`)

Validate the new fields:
- Type checks (number, must be >= 0, <= 100, etc.)
- Cross-field validation (e.g., if using capacity-aware routing, capacity limits must be positive)

### 4. **Test thoroughly**

- Backward-compat: Single-product, linear flow with no new fields must calculate identically
- New feature: Test the new behavior with explicit scenarios
- Regressions: Run full test suite before merging

## Custom Commands

### `/save` — Commit and Push to Dev Branch

1. `git status` to review changes
2. Stage all modified files
3. Create conventional commit message (summary ≤50 chars)
4. Push to `origin/dev`

## Roadmap & Implementation Strategy

### Current State
- **V1.9.1** complete: Time-unit support, infeasibility detection, bottleneck semantics
- **V1.9.2** approved (minimal scope): OEE decomposition + work categories + capacity-aware routing (3–5 weeks)

### V1.9.2 Specification
See `docs/roadmap/V1.9.2_PRD.md` for the feature overview and `docs/roadmap/V1.9.2_IMPLEMENTATION.md` for the 3-run implementation plan.

**Key features:**
1. **Full OEE** — Availability, performance, quality as separate factors
2. **Capacity-Aware Merge Allocation** — Route demand to suppliers based on available capacity
3. **Work Categories** — Model 3–10 grouped demand streams (industry-agnostic: pharma, automotive, food, etc.)

**Note:** Work Categories are **not pharmacy-specific**. They apply to any manufacturing process that needs to model multiple product types or demand profiles flowing through shared resources.

### Reference: Pharmaceutical Dispensing Process

Example that exercises V1.9.2 features:

```
INPUT: Patients/pharmacy → demand (Y zakjes/week)

STAGE 1: Stock Processing (3 parallel routes based on capacity)
├─ Auto Stripfoil — high-volume, long setup
├─ Semi-auto — medium volume
└─ Manual (Ompotten) — small volume, flexible
OUTPUT: Pots with medicines

STAGE 2: Production (9 Rowadose machines)
├─ Fill sachets (2.4 pills/sachet per order)
├─ OEE: Availability (uptime %), Performance (speed %), Quality (pass %)
OUTPUT: Large roll of filled sachets

STAGE 3: Inspection (5 Schouw machines)
├─ Visual quality check + patient-specific cutting
├─ OEE: same factors as production
OUTPUT: Quality-checked, patient-ready rolls
```

**Features needed for this:**
- **F7 (Full OEE)**: Explicit availability/performance/quality per machine stage
- **F2 (Capacity-Aware Merge)**: Route batches to least-constrained stock method based on available capacity
- **F1 (Work Categories)**: Group 1200 medicines into 3–10 families (bulk strips, small strips, pots)

## Known Gotchas

- **invite_tokens vs model_access**: The source of truth for current access is `model_access`, not `invite_tokens`. Token status can become stale if revocation partially fails. Always cross-check `model_access` when making access decisions.
- **SECURITY DEFINER RPCs**: When operations need to access `auth.users` or bypass RLS, use existing RPCs rather than direct table queries. `auth.uid()` still works inside SECURITY DEFINER functions.
- **Error handling on Supabase updates**: Always check `{ error }` from Supabase operations — silent failures (especially on invite_tokens updates) have caused bugs.
- **bomRatios structure**: `ProcessNodeData.bomRatios` maps material name (string) → ratio. At merge nodes, incoming edges are grouped by the source node's `outputMaterial`. Each material group gets its BOM ratio applied during demand propagation (`calculations.ts:370`). Same-material edges from multiple suppliers share one BOM entry; demand is distributed proportionally by flow share. Legacy models that stored bomRatios keyed by edge ID are auto-migrated to material-name keys via `migrateBomRatios()` in `useFlowStore.ts`. Conflicting ratios during migration resolve to the higher value with a dismissible warning.
- **New model access**: `useModelAccess(modelId)` returns owner permissions when `modelId` is `null` (unsaved new model). Without this, new models would be read-only because `fetchUserAccess` never runs for null IDs. The `savedModelId` in `useFlowStore` is `null` until the first save to Supabase.
