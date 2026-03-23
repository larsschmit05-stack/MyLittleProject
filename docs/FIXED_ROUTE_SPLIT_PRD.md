# Product Requirements Document — Fixed Route Split on Edges

**Status:** Proposed
**Target Release:** TBD
**Type:** Focused modeling enhancement

---

## 1. Overview

`Fixed Route Split on Edges` allows users to divide one total demand across parallel upstream routes by assigning fixed percentages on connector lines.

This feature is intended for processes where multiple routes feed the same downstream state, but those routes are **not freely interchangeable**.

### Problem Solved

Some process steps are alternatives only in a structural sense, not in an optimization sense.

Example:
- `Vol. Aut. Stripfoil`
- `Semi-Aut. Stripfoil`
- `Ompotten`

These three routes all feed the same downstream production stage, but each route handles a predefined portion of the flow based on product or packaging characteristics.

The current model does not express this well:
- `Work Categories` are too abstract for this problem
- capacity-aware redistribution suggests routes can substitute for each other
- equal upstream demand per route is operationally wrong

### What This Feature Delivers

Users can assign a fixed split percentage to each relevant connector line:
- edge to `Vol. Aut. Stripfoil` = `50%`
- edge to `Semi-Aut. Stripfoil` = `30%`
- edge to `Ompotten` = `20%`

The engine then propagates required throughput using those edge percentages.

---

## 2. Scope

### Core Concept

The split belongs to the **flow path**, not to the process node.

Users should define the route mix by clicking the connector lines that represent the alternative routes.

If a downstream step requires `D` units, and the route split is `50 / 30 / 20`, then the upstream routes receive:
- route A = `D * 0.50`
- route B = `D * 0.30`
- route C = `D * 0.20`

### Example

Total demand:
- `100,000 zakjes/week`

Fixed route split:
- `Source -> Vol. Aut. Stripfoil = 50%`
- `Source -> Semi-Aut. Stripfoil = 30%`
- `Source -> Ompotten = 20%`

Result:
- `Volauto req = 50,000`
- `Semi-auto req = 30,000`
- `Ompotten req = 20,000`

These flows then continue through the normal capacity, OEE, utilization, and bottleneck calculations.

---

## 3. In Scope

- fixed percentage allocation on relevant connector lines
- route-group validation that total split equals `100%`
- throughput propagation using edge-based split
- standard capacity and bottleneck analysis per route
- clear editor UX for viewing and editing route split values

---

## 4. Out of Scope

- dynamic rerouting when a route has insufficient capacity
- optimizer-style allocation
- automatic fallback from one route to another
- per-SKU routing rules
- rule-based routing such as “if volume > X then use route A”
- replacing normal BOM behavior for true material merges

---

## 5. Functional Requirements

1. A user can assign a `Route Split (%)` value to a connector line.
2. Route split is used when multiple parallel edges represent alternative routes for the same downstream demand.
3. The route split values in one route group must sum to `100%`, with a small tolerance such as `99-101%`.
4. Missing values inside a route group are invalid.
5. Required throughput is propagated according to the configured edge split.
6. Each route retains its own required throughput, effective capacity, utilization, and bottleneck visibility.
7. Existing models without route split configuration remain backward compatible.

---

## 6. UX Requirements

### Editing

The user can click a connector line and see:
- `Route Split (%)`

If the edge belongs to a route group, the editor should also show:
- the related route edges
- the current group total
- whether the group is valid

### Example Panel

- `To Vol. Aut. Stripfoil: 50%`
- `To Semi-Aut. Stripfoil: 30%`
- `To Ompotten: 20%`
- `Total: 100%`

### Validation Feedback

The UI should clearly indicate when:
- a value is missing
- a value is negative
- the total is not `100%`

---

## 7. Calculation Rules

If downstream required throughput is `D`, then for each route edge:

- `route_required = D * route_split`

Example:
- `D = 100,000`
- `Volauto = 50%`
- `Semi-auto = 30%`
- `Ompotten = 20%`

Then:
- `Volauto = 50,000`
- `Semi-auto = 30,000`
- `Ompotten = 20,000`

After this split, each route is processed with the normal deterministic flow logic:
- OEE
- effective capacity
- utilization
- bottleneck detection

---

## 8. Why This Is Better Than Work Categories For This Use Case

This is not primarily a grouped-demand problem.

It is a **fixed route distribution** problem:
- one total demand
- several parallel routes
- each route gets a predefined share

`Work Categories` are better suited to demand segmentation across shared resources. They are not the right abstraction when the real need is to assign one total flow across fixed routes.

---

## 9. Success Criteria

This feature is successful if users can:

- enter one total demand
- distribute that demand over parallel routes using connector-line percentages
- see correct required throughput per route
- identify overloads and bottlenecks on the route level
- model fixed operational mix without relying on work categories

---

## 10. Final Assessment

For the pharmacy dispensing use case, `Fixed Route Split on Edges` is a better fit than `Work Categories`.

It reflects the real operational question:
- not “which demand category is this?”
- but “which percentage of the total flow goes through each route?”
