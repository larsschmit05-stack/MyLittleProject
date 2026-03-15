# Claude Implementation Guide - V1.5

**Quick Reference for Claude Sonnet & Haiku**

---

## 📖 Read These First
- `README.md` — Product vision
- `docs/V1.5_PRD.md` — Requirements (DAGs, BOM, splits)
- `docs/V1.5_IMPLEMENTATION_PLAN.md` — Full technical plan (reference for details)
- `docs/AI_ROLES.md` — Git/collaboration rules

---

## 🎯 Role & Scope

**Claude Sonnet:** Steps 1-5 (types, validation, calculation engine, tests, UI)
**Claude Haiku:** Step 6 (polish, documentation, simple fixes)

**Out of Scope for V1.5:** Authentication, Import/Export, Operational Calendars, Max Capability Mode, Multi-product, Stochastic Simulation, Rework Loops

---

## 🏗️ V1.5 Key Concepts (Compact)

| Concept | Details |
|---------|---------|
| **Merges** | Process node with multiple inputs + BOM ratios |
| **Splits** | Process node with multiple outputs (real edges + scrap edges) |
| **Fork-join** | Node with both multiple inputs AND outputs (allowed) |
| **Real output edge** | Carries downstream demand in propagation |
| **Scrap edge** | Visual only; excluded from demand propagation; dead-end |
| **Topological sort** | Order nodes Sink→Source using real edges only |
| **BOM ratios** | Keyed by edge ID; define units needed per output |
| **Material field** | Optional `outputMaterial` for UI labels (no validation) |

---

## 🚀 Build Steps (Sequential)

```
Step 1: Types          → Step 2: Validation       → Step 3: Propagation
   ↓                      ↓                           ↓
(Sonnet)            (Sonnet)                      (Sonnet)
                                                     ↓
                                                Step 4: Tests
                                                   ↓
                                                (Sonnet/Haiku)
                                                   ↓
                                           ⚠️ GATE: All tests must pass
                                                   ↓
                                             Step 5: UI
                                                   ↓
                                                (Sonnet)
                                                   ↓
                                             Step 6: Polish
                                                   ↓
                                                (Haiku)
```

**CRITICAL:** Do NOT start Step 5 until Step 4 passes completely.

---

## ⚠️ Highest-Risk Areas

| Area | Risk | Mitigation |
|------|------|-----------|
| **Multi-level cascades** | One wrong node = silent wrong numbers | Test 2-level merges explicitly |
| **Split with 2+ real outputs** | Must satisfy all paths simultaneously | Code: `max(demand1/ratio1, demand2/ratio2)` |
| **V1 compatibility** | Old models have no `bomRatios`/`isScrap` | Guard: `undefined` = 1:1 BOM, no scrap |
| **Edge ID orphaning** | Delete edge → BOM ratio lost | Purge stale keys in `onEdgesChange` |
| **Topological sort order** | Wrong order = wrong results (silent bug) | Test with cascading scenarios |

---

## ✅ Definition of Done (Each Step)

| Step | Must Pass |
|------|-----------|
| 1 | V1 tests still pass; new types compile; V1 models load |
| 2 | Linear chains, merges, fork-join, splits, cycles all validate correctly |
| 3 | 3-part assembly (4:1:2 BOM), scrap-split, fork-join, multi-market all calculate correctly; V1 identical results |
| 4 | **ALL TESTS PASS** (no failures); covers merges, splits, fork-join, cascading, yields; Codex sign-off |
| 5 | BOM UI works; split ratios work; scrap edges render; V1 users unaffected |
| 6 | Error messages clear; results panel shows valid or error (no NaN); validation doesn't block editing |

---

## 🔍 Review Gates (Codex Required)

| After Step | Check |
|-----------|-------|
| 2 | Cycle detection logic correct? |
| 3 | Topological sort correct? Split with 2+ outputs sums right? |
| 4 | **ALL TESTS PASS?** (GATE: cannot proceed without sign-off) |
| 5 | No V1 regression? |

---

## 📁 Files to Create/Modify

```
lib/flow/validation.ts       → Step 2
lib/flow/calculations.ts     → Step 3
lib/flow/calculations.test.ts → Step 4
components/editor/PropertiesPanel.tsx → Step 5
types/flow.ts                → Step 1
store/useFlowStore.ts        → Update to use calculateFlowDAG()
```

---

## 🚨 Step-Specific Gotchas

**Step 1:** Edge IDs change when deleted/recreated → stale `bomRatios` keys. Purge in `onEdgesChange`.

**Step 2:** Cycle detection must run speculatively (before React Flow persists).

**Step 3 (HIGHEST RISK):**
- Multi-level merge cascades with different BOMs → easy silent bugs
- Split with 2+ real outputs → demand sums from all paths
- V1 model loading → guard `undefined` fields

**Step 4:** Use `.toBeCloseTo(value, 4)` not exact equality (floating point).

**Step 5:** Edge selection is new state (mutually exclusive with node selection).

**Step 6:** Resolve node IDs to names in error messages.

---

## 📋 For Details, See:
- `docs/V1.5_IMPLEMENTATION_PLAN.md` — Full step descriptions, success criteria, risks
- `docs/V1.5_PRD.md` — Product requirements and graph constraints
- `docs/AI_ROLES.md` — Git workflow, commit messages
- `docs/V1.5_AGENT_REFERENCE.md` — Multi-agent FAQ

---

## 🤝 Collaboration
- Sonnet builds Steps 1-5
- Haiku handles Step 6
- Codex reviews after Steps 2, 3, 4 (Step 4 is mandatory gate)
- Use `dev` branch, not `main`