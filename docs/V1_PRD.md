# Product Requirements Document (V1) - Capacity Flow Builder

## 1. Product Goal
Provide a visual, lightweight SaaS tool to model deterministic capacity flow processes. It replaces complex Excel capacity models by allowing users to map process flows, define step capacities, input demand, and instantly calculate throughput, utilization, and bottlenecks. The tool sits between ad-hoc Excel models and heavy ERP systems.

## 2. Target Users
- Manufacturing Engineers
- Operations Managers
- Supply Chain Analysts
- Process Planners

## 3. Core Workflow
1. **Model:** User drags and drops nodes onto a visual canvas to represent process steps and connects them to define the flow of materials/work.
2. **Configure:** User clicks each node to configure its capacity, throughput rate, and material conversion rates.
3. **Input Demand:** User enters one global target demand linked to the Sink output material (e.g., units per week or month).
4. **Analyze:** System instantly calculates the end-to-end deterministic flow, highlighting the bottleneck, throughput, and utilization per node.
5. **Scenario Test:** User duplicates the model or tweaks node values to test "what-if" scenarios (e.g., adding a machine, increasing throughput rate) and compares results.

## 4. V1 Scope
V1 focuses purely on steady-state, deterministic capacity calculation for a single product flow.
- Visual canvas (drag, drop, connect nodes).
- Basic node and connection management.
- Node configuration (capacity parameters).
- Material conversion logic between steps.
- One global demand input tied to the Sink output material.
- Deterministic throughput and utilization calculation.
- Visual bottleneck identification.
- Simple scenario testing (duplicate and modify).

## 5. Main Screens
1. **Dashboard:** List of user's saved models/scenarios.
2. **Canvas/Editor:** The primary workspace. Consists of:
   - Left sidebar: Node palette (drag from here).
   - Center: Interactive drag-and-drop visual canvas.
   - Right sidebar: Configuration panel for the selected node/edge, demand input, and results summary.

## 6. Canvas Behavior & Graph Constraints
- **Drag & Drop:** Drag nodes from the palette to the canvas.
- **Connect:** Click and drag from a node's output port to another node's input port to create a directed edge.
- **Select:** Click a node or edge to select it and open its properties in the right sidebar.
- **Delete:** Select and press Delete to remove nodes or edges.
- **Pan/Zoom:** Standard canvas navigation.

**Graph Constraints (V1):**
To simplify the calculation engine:

Allowed:
* Linear flows

Not allowed:
* Cycles / loops
* Multiple inputs merging into one node
* Multiple outputs from one node
* Branching

Ports are node-type specific:
* Source node: 0 input / 1 output
* Process node: 1 input / 1 output
* Sink node: 1 input / 0 output

## 7. Node Types
1. **Source Node:** The starting point of raw material or initial input.
2. **Process Node:** Represents a step that takes time and has a specific capacity (e.g., a machine or manual workstation).
3. **Sink Node:** The endpoint where finished goods exit the system; global demand is linked to this node's output material.

## 8. Node Configuration
When a Process Node is selected, the following parameters can be configured:
- **Name:** Label for the step.
- **Throughput Rate:** Number of units processed per hour (e.g., units per hour).
- **Available Time:** Total working time available per period (e.g., hours per week, minus planned downtime).
- **Yield:** Percentage of good units produced (e.g., 95%).
- **Number of Resources:** Parallel machines or workers at this step (multiplier for capacity).

**Canonical Parameter Set:** Name, Throughput Rate, Available Time, Yield, Number of Resources. (Agents must use these exact terms to refer to Process Node properties).

**System Time Unit:**
All calculations must use **hours as the internal base unit**.
Inputs like throughput rate and available time should be consistent with this hourly base.

**Effective Capacity Formula:**
Effective Capacity =
Throughput Rate × Available Time × Number of Resources × Yield

This represents **maximum good output per period**.

## 9. Material Conversion & Demand Propagation

**Conversion Logic Location:**
Conversion ratios must be defined **on the Process Node only**, not on edges.
- E.g., It takes 4 units of Part A (Node 1) to make 1 unit of Assembly B (Node 2).

**Demand Propagation Algorithm:**
Step 1: Start at the Sink node with user demand.
Step 2: Move upstream through the graph.
Step 3: For each node:
* Required Output = downstream required input
* Required Input = Required Output / Yield × Conversion Ratio

Repeat until reaching the Source node.

## 10. Demand Input
**Demand Location:**
Demand is defined **one time globally**, and is always tied to the **Sink output material (final product)**.
- User specifies the target output quantity for a given time period (e.g., 10,000 units / month).
- The system must always calculate upstream requirements from this final demand.

## 11. Results and Outputs
For each node, the system calculates and displays the following (all results are in **units per period**, consistent with the demand and available time):
- **Required Throughput:** What is needed to meet the propagated demand.
- **Effective Capacity:** The theoretical maximum the node can produce independently.
- **Utilization (%):** Required Throughput / Effective Capacity.
- **Bottleneck Indicator:** The node with the highest utilization (or utilization > 100%) is visually highlighted (e.g., outlined in red).

**System Throughput Definition:**
System Throughput is calculated in two steps (result in **units per period**):
1. Normalize every node's effective capacity to **Sink output units** using conversion and yield relationships.
2. Take the **minimum normalized capacity** across nodes.

This minimum normalized capacity is the bottleneck-limited maximum achievable throughput at Sink output units.

## 12. Scenario Testing
- Users can "Clone" or "Duplicate" an existing model.
- Users can change parameters (e.g., add +1 to "Number of Resources" on the bottleneck node) in the cloned model and instantly see the new system throughput and utilization.
- Side-by-side or tabular comparison is nice-to-have, but V1 only requires the ability to save distinct models and view their individual results.

## 13. What is Explicitly Out of Scope for V1
- Stochastic simulation (variability in times or random failures).
- Queues, buffers, or Work-In-Progress (WIP) tracking.
- Discrete-event simulation (time-stepping).
- Production scheduling or sequencing.
- Multi-product mix optimization (calculating for multiple distinct products sharing the same line simultaneously).
- Circular flows and rework loops (non-DAG graphs).
- Financial/cost modeling.
- ERP/API integrations.

## 14. UI/UX Design Direction
The tool follows a "Data-First, Interface-Second" philosophy to ensure clarity and professional trust. For full details, refer to `docs/UI_STYLE_GUIDE.md`.

*   **Visual Style:** Modern, clean, and technical SaaS aesthetic (inspired by Stripe). Avoids "legacy enterprise" clutter.
*   **Color Palette:** White and light gray backgrounds with Indigo (`#6366F1`) as the primary action color.
*   **Status Indicators:** Color-coded utilization (Green < 80%, Amber 80-100%, Red > 100% for bottlenecks).
*   **Typography:** Clean sans-serif (Inter) with monospace (JetBrains Mono) for numerical data.
*   **Components:** Rounded corners (8px), subtle shadows, and a strict 8px spacing grid.
*   **Canvas Experience:** Light dot-grid background, smooth node connections, and instant visual feedback on parameter changes.

## 15. Success Criteria for V1
- A developer can build the UI and calculation engine without ambiguity.
- The system accurately calculates node utilizations and identifies the correct bottleneck in a multi-step process with varying yields and material conversions.
- The UI is responsive and updates calculations instantly upon parameter changes.
- Users can successfully model a 10-20 step process, apply a demand target, and determine if they can meet the demand within 5 minutes of usage.
