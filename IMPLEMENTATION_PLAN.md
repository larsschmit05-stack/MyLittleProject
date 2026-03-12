# V1 Implementation Plan - Capacity Flow Builder

This document defines the lean build sequence for V1 of the Capacity Flow Builder. It is intended for **Claude (Implementation Engineer)** to execute in small iterations and for **Codex (Engineering Reviewer)** to review against the approved scope in `docs/V1_PRD.md`.

The plan is intentionally strict:

- V1 supports **linear flows only**
- V1 supports **one global demand input tied to the Sink output**
- V1 supports **deterministic calculations only**
- V1 excludes simulation, optimization, scheduling, and branching workflows

## Step 1: Project Foundation (Completed)
**Goal:** Create the minimum app structure needed to build the editor and dashboard.

**What will be built:**
- Next.js app setup with TypeScript.
- Core dependencies: `reactflow`, `zustand`, `@supabase/supabase-js`.
- Base app routes for:
  - dashboard
  - editor
- Minimal editor shell with:
  - left sidebar for node palette
  - center canvas area
  - right sidebar for properties and results

**Success Criteria:**
- App runs locally.
- Dashboard route and editor route both render.
- Editor layout shows the three main regions required by the PRD.

---

## Step 2: Canvas And Node Rendering (Completed)
**Goal:** Make the visual flow builder usable at a basic level.

**What will be built:**
- React Flow canvas with pan and zoom.
- Node palette for adding:
  - Source node
  - Process node
  - Sink node
- Custom node rendering for the three V1 node types.
- Node selection and edge selection.
- Delete behavior for selected nodes and edges.

**Success Criteria:**
- User can place Source, Process, and Sink nodes on the canvas.
- User can connect nodes with directed edges.
- User can select and delete nodes and edges.

---

## Step 3: Graph Constraints (Completed)
**Goal:** Enforce the V1 graph rules before calculation logic is added.

**What will be built:**
- Port rules by node type:
  - Source = 0 input / 1 output
  - Process = 1 input / 1 output
  - Sink = 1 input / 0 output
- Connection validation to reject:
  - cycles
  - branching
  - merges
  - multiple outputs from one node
  - invalid node-type connections
- Linear-flow validation for the full model.
- Basic model-level checks for one Source and one Sink.

**Success Criteria:**
- A valid `Source -> Process -> Sink` chain can be created.
- Invalid V1 graph shapes are blocked at connection time or flagged immediately.
- The editor cannot persist a graph that violates the linear V1 rules.

---

## Step 4: Flow State And Domain Model
**Goal:** Establish a centralized, typesafe Zustand store as the single source of truth for the flow model, using the canonical V1 parameters and graph constraints defined in the PRD.

**What will be built:**
1. **Domain Types (`/types/flow.ts`):**
    - `ProcessNodeData`: `name`, `cycleTime`, `availableTime`, `yield`, `numberOfResources`, `conversionRatio`.
    - `SourceNodeData` and `SinkNodeData`.
    - `FlowModel` interface: `{ nodes: Node[], edges: Edge[], globalDemand: number }`.
2. **Zustand Store (`/store/useFlowStore.ts`):**
    - State: `nodes`, `edges`, `globalDemand`, and `selectedNodeId`.
    - Actions: `onNodesChange`, `onEdgesChange`, `onConnect`, `updateNodeData(nodeId, data)`, `setGlobalDemand(demand)`, `selectNode(nodeId)`.
3. **Migration of `CanvasArea.tsx`:**
    - Replace `useNodesState` and `useEdgesState` with store selectors and actions.
4. **Serialization:**
    - `getSerializedModel()` action for clean JSON output.

**Success Criteria:**
- The editor's visual state is synchronized with a global Zustand store.
- Selecting a node in the canvas updates `selectedNodeId` in the store.
- Conversion Ratio is stored on the Process node, not on edges.
- The model can be represented in a single consistent JSON shape.

**Risks:**
- **State Sync Conflicts:** Ensure standard `applyNodeChanges` and `applyEdgeChanges` are used to avoid infinite loops.
- **Initial Data Defaults:** Initialize `yield` at 100 and `conversionRatio` at 1 to prevent calculation errors.
- **Edge Data Drift:** Strictly forbid conversion logic on edges.

---

## Step 5: Configuration Panel
**Goal:** Let the user enter the minimum data required for deterministic capacity analysis.

**What will be built:**
- Right sidebar form for selected Process nodes with fields for:
  - Name
  - Cycle Time
  - Available Time
  - Yield
  - Number of Resources
  - Conversion Ratio
- Global demand input in the right sidebar.
- Basic input validation for invalid or empty numeric values.

**Success Criteria:**
- Selecting a Process node opens its editable configuration.
- Updating any field persists to local app state immediately.
- Global demand can be entered once for the full model.

---

## Step 6: Deterministic Calculation Engine
**Goal:** Implement the V1 math as pure logic, independent from the UI.

**What will be built:**
- Time conversion utilities using **hours as the internal base unit**.
- Upstream demand propagation starting from the Sink.
- Required throughput calculation per node.
- Effective capacity calculation using:
  - `(Available Time / Cycle Time) * Number of Resources * Yield`
- Utilization calculation per node.
- System throughput calculation by:
  - normalizing each node capacity to Sink output units
  - taking the minimum normalized capacity
- Bottleneck identification based on highest utilization / limiting capacity.

**Success Criteria:**
- A valid linear flow returns:
  - required throughput per node
  - effective capacity per node
  - utilization per node
  - system throughput at Sink output units
  - bottleneck node
- The math is implemented outside UI components.

---

## Step 7: Calculation Tests
**Goal:** Prove the core math before wiring it deeply into the interface.

**What will be built:**
- Unit tests for:
  - time normalization to hours
  - demand propagation
  - yield handling
  - conversion ratio handling
  - effective capacity
  - utilization
  - system throughput normalization
  - bottleneck detection

**Success Criteria:**
- Calculation tests pass.
- At least one test covers a multi-step linear flow with yield and conversion losses.
- The calculation engine can be trusted without relying on manual UI checks.

---

## Step 8: Live Results In The Editor
**Goal:** Surface the calculation outputs in the main workflow.

**What will be built:**
- Automatic recalculation when:
  - node configuration changes
  - graph structure changes
  - global demand changes
- Results summary in the right sidebar showing:
  - system throughput
  - bottleneck
  - selected-node metrics
- Per-node displayed values for:
  - required throughput
  - effective capacity
  - utilization

**Success Criteria:**
- Changing a node value updates results immediately.
- The right sidebar shows the current model outputs clearly.
- The editor supports the PRD workflow: model, configure, input demand, analyze.

---

## Step 9: Visual Bottleneck Feedback
**Goal:** Make constraints visible without adding unnecessary UI complexity.

**What will be built:**
- Node-level utilization status styling:
  - Green for under 80%
  - Amber for 80% to 100%
  - Red for over 100% or bottleneck
- Clear visual highlight for the bottleneck node.

**Success Criteria:**
- Users can identify the bottleneck from the canvas without opening code or debug tools.
- Utilization status updates immediately when inputs change.

---

## Step 10: Local Scenario Duplication
**Goal:** Support the minimum V1 scenario workflow before persistence.

**What will be built:**
- Duplicate current model action in local app state.
- New duplicated model starts with copied nodes, edges, and demand.
- Duplicated model can be edited independently in the session.

**Success Criteria:**
- User can duplicate a model and change the copy without affecting the original.
- Scenario testing works without requiring side-by-side comparison.

---

## Step 11: Persistence Model
**Goal:** Define the minimum backend structure needed for save/load and saved scenarios.

**What will be built:**
- Supabase data model for saved models.
- Serialized storage of:
  - model metadata
  - nodes
  - edges
  - global demand
- Save and load functions against Supabase.

**Success Criteria:**
- A model can be saved and loaded without losing graph structure or process parameters.
- Stored data matches the V1 domain model already used in the editor.

---

## Step 12: Dashboard And Saved Scenarios
**Goal:** Complete the minimum V1 saved-model workflow.

**What will be built:**
- Dashboard showing saved models/scenarios.
- Open existing model from dashboard into editor.
- Save duplicated scenario as its own model entry.

**Success Criteria:**
- User can create a model, save it, return to the dashboard, reopen it, duplicate it, and save the duplicate separately.
- V1 scenario testing works as distinct saved models, matching the PRD.
