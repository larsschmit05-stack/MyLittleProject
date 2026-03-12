# UI Style Guide - V1

This document defines the visual identity and design system for the Operational Process Modeler. The goal is to create a professional, modern, and trustworthy interface that feels approachable and startup-like, avoiding the "legacy enterprise" aesthetic of traditional ERP systems.

## 1. Design Philosophy
**"Data-First, Interface-Second."**
The UI should be a quiet stage for the user's data and process models. It prioritizes clarity, precision, and speed of insight over decorative elements. 
*   **Minimalism:** Remove anything that doesn't help the user understand their capacity.
*   **Precision:** Use clean lines and a strict grid to reflect the deterministic nature of the tool.
*   **Trust:** A polished, "Stripe-like" aesthetic communicates that the calculations are reliable and the tool is modern.

## 2. Color Palette
The palette is rooted in neutral tones with high-contrast accents for status and action.

### Base Colors
*   **Background (Primary):** `#FFFFFF` (White)
*   **Background (Secondary/Sidebar):** `#F7FAFC` (Very light cool gray)
*   **Canvas Background:** `#F9FAFB` (Subtle off-white) with `#E5E7EB` dot grid.
*   **Text (Primary):** `#111827` (Near black for readability)
*   **Text (Secondary):** `#4B5563` (Medium gray for labels and metadata)
*   **Border:** `#E5E7EB` (Light gray for subtle separation)

### Brand & Accent
*   **Action/Primary:** `#6366F1` (Indigo - professional and modern)
*   **Selection:** `#EEF2FF` (Light indigo tint for active states)

### Status Colors
*   **Healthy (Utilization < 80%):** `#10B981` (Emerald Green)
*   **Warning (Utilization 80-100%):** `#F59E0B` (Amber)
*   **Bottleneck (Utilization > 100%):** `#EF4444` (Rose Red)

## 3. Typography
Focus on legibility and technical clarity.
*   **Primary Font:** Inter (or system-default sans-serif: `-apple-system, BlinkMacSystemFont, "Segoe UI"`)
*   **Code/Numbers:** JetBrains Mono or Inter (tabular-nums) for alignment in data tables.
*   **Hierarchy:**
    *   **H1 (Page Title):** 24px, Semibold, #111827
    *   **H2 (Section Header):** 18px, Medium, #111827
    *   **Body:** 14px, Regular, #4B5563
    *   **Labels/Small:** 12px, Medium, #6B7280

## 4. UI Component Style
*   **Cards & Containers:** White background, 1px border (`#E5E7EB`), 8px border-radius. Subtle shadow (`0 1px 3px 0 rgba(0, 0, 0, 0.1)`).
*   **Inputs:** Minimalist fields with 1px border, 4px radius. Focus state uses Indigo ring.
*   **Buttons:** 
    *   *Primary:* Solid Indigo, white text.
    *   *Secondary:* White background, gray border, dark text.
*   **Nodes (React Flow):** 
    *   Rectangular with rounded corners (8px).
    *   Clean ports (small circles).
    *   Header area for node name, body for key metrics (Utilization %).
    *   Active/Selected node: 2px Indigo border.
*   **Shadows:** Use sparingly to create depth. Prefer thin borders over heavy shadows.

## 5. Canvas Style
The process builder should feel expansive and fluid.
*   **Background:** Light gray dot grid (spacing: 20px).
*   **Edges (Connections):** Smooth step or Bézier curves, `#9CA3AF` (gray) by default.
*   **Interaction:** Smooth zoom/pan. Node dragging should feel snappy with "snap-to-grid" behavior.

## 6. Data Visualization Style
*   **Utilization Gauges:** Simple horizontal progress bars within nodes. Color shifts (Green -> Amber -> Red) based on threshold.
*   **Bottleneck Highlighting:** The bottleneck node should have a subtle red glow or a thicker red border to draw immediate attention.
*   **Throughput Labels:** Small, pill-shaped badges on edges showing flow rate.

## 7. Design Principles
1.  **Immediate Feedback:** Any change in a node's parameter should instantly update the calculations and visual indicators across the whole canvas.
2.  **Affordance:** Ports and interactive elements should be clearly discoverable without cluttering the UI.
3.  **Consistency:** Use a strict 8px spacing scale for all margins and paddings.
4.  **Scalability:** The design must remain clean even when the user has 20+ nodes on the canvas.

---
*Inspired by Stripe, Linear, and modern SaaS engineering tools.*
