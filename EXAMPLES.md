# Examples: Real-World Production Processes

This document shows real-world production networks modeled with the Operational Process Modeler. Each example demonstrates different aspects of process modeling: merges, splits, unit conversion, quality loss, and bottleneck identification.

## Example 1: Pharmaceutical Dispensing (Patient Blister Packing)

A pharmacy automates personalized medication dispensing using three parallel storage methods, then fills and inspects patient-specific blister packs.

### Process Flow

```
INPUT DEMAND
  319,778 bags/day
       ↓
STORAGE PROCESSING (Merge: Three parallel methods)
  ├─→ Manual Ompotten
  │   4 stations × 37 jars/hr × 14 hrs/day = 2,072 jars/day
  │   Handles: 67% of demand (1,093 jars/day needed)
  │   Utilization: 53%
  │
  ├─→ Semi-auto Stripfoil
  │   4 stations × 10 jars/hr × 14 hrs/day = 560 jars/day
  │   Handles: 15% of demand (245 jars/day needed)
  │   Utilization: 44%
  │
  └─→ Auto Stripfoil
      2 stations × 13 jars/hr × 14 hrs/day = 364 jars/day
      Handles: 18% of demand (293 jars/day needed)
      Utilization: 80%
       ↓
  TOTAL OUTPUT: 2,996 jars/day
  TOTAL NEEDED: 1,631 jars/day
  SURPLUS: 184% capacity
       ↓
ROWADOSE PRODUCTION (Fill bags with pills)
  Input: 1,631 jars/day (canisters with medicines)
  Equipment: 9 operational machines (10 total, 1 backup)
  Rate: 5,760 items/hr per machine
  Operating time: 12 hours/day
  Effectiveness: 49% (includes downtime)

  Theoretical: 9 × 5,760/hr × 12 hrs = 622,080 bags/day
  Effective: 622,080 × 49% = 304,819 bags/day

  Unit conversion: 1 jar → 196 bags
    (470 medicines/jar ÷ 2.4 medicines/bag)

  Output: 1,631 jars × 196 = 319,578 bags/day (matches demand)
  Capacity check: 304,819 bags/day available
  Utilization: 95% (HIGH — near capacity constraint)
       ↓
INSPECTION/QC (Visual check + patient-specific cuts)
  Input: 319,778 bags/day
  Equipment: 5 parallel machines
  Rate: 4,536 bags/hr per machine (already includes 70% effectiveness)
  Operating time: 12.5 hours/day

  Output: 5 × 4,536/hr × 12.5 hrs = 283,500 bags/day
  Utilization: 113% (OVER CAPACITY — bottleneck)

  Unprocessed: 319,778 - 283,500 = 36,278 bags/day
       ↓
OUTPUT (Patient-ready blister packs to pharmacist)
  Actual throughput: 283,500 bags/day (limited by inspection)
  Demand: 319,778 bags/day
  Shortfall: 36,278 bags/day (11.3%)
```

### System Analysis

| Stage | Bottleneck? | Utilization | Limiting Factor |
|-------|-------------|-------------|-----------------|
| Storage | ✗ | 54% avg | Surplus capacity |
| Production | ⚠ | 95% | Near max |
| **Inspection** | **✓** | **113%** | **Unable to keep up** |

**Bottleneck**: Inspection machines (5 units at 4,536 bags/hr each)

**System Throughput**: 283,500 bags/day (limited by inspection, not demand)

**Improvement Opportunities**:
1. Add 1–2 inspection machines → increase capacity to 352,000–420,500 bags/day
2. Upgrade inspection machines to 5,000+ bags/hr each
3. Optimize inspection process to reduce effective downtime

### Key Features Demonstrated

- **Merge (3-way)**: Three storage methods feed one production line
- **Unit Conversion**: Jars → Bags (1 jar = 196 bags)
- **Parallel Capacity**: Multiple machines per stage
- **Effectiveness/Downtime**: 49% for production, 70% for inspection
- **Bottleneck Detection**: System throughput limited by slowest stage
- **Utilization Bands**: Storage (healthy), Production (warning), Inspection (red/over capacity)

---

## Example 2: Assembly Process with Scrap (Automotive Component)

An automotive supplier assembles parts from multiple sources, with quality loss and scrap routing.

### Process Flow

```
DEMAND: 500 assemblies/day

SOURCE: 500 units/day
         ↓
PART A SUPPLIER          PART B SUPPLIER
(500/day available)      (500/day available)
         ↓                        ↓
        ASSEMBLY (Merge: 1 Part A + 2 Part B → 1 assembly)
        1 machine, 600 units/hr, 8 hrs/day
        Capacity: 4,800 units/day
        Utilization: 10% (low)
         ↓
    QUALITY TEST (Split: 95% pass / 5% scrap)
    2 machines, 400 items/hr, 8 hrs, 90% effective
    Effective capacity: 5,760 items/day
         ├─→ PASS (95% = 475 assemblies/day)
         │   Utilization: 8%
         │   ↓
         │   OUTPUT (Good assemblies)
         │
         └─→ SCRAP (5% = 25 assemblies/day)
             [Excluded from demand calculation]
             Rework/disposal
```

### System Analysis

- **Bottleneck**: None; all processes have slack capacity
- **System Throughput**: 500 assemblies/day (matches demand)
- **Quality Loss**: 5% scrap reduces output to 475 good units
- **Spare Capacity**: All stages significantly underutilized

### Key Features Demonstrated

- **Merge with Ratio**: Assembly requires 2 parts per 1 unit (BOM ratio)
- **Split with Quality Loss**: Scrap edges excluded from calculation
- **Excess Capacity**: No constraint; could increase demand significantly

---

## Example 3: Multi-Stage Bottleneck (Food Processing)

A canning facility with peeling, cooking, and packing stages. Cooking is the bottleneck.

### Process Flow

```
DEMAND: 10,000 cans/day

RAW PRODUCE (10,000 units/day)
         ↓
    PEELING (Automatic)
    2 machines, 600 units/hr, 8 hrs
    Capacity: 9,600 units/day
    Utilization: 104% (OVER CAPACITY — bottleneck #1)
         ↓
    COOKING (Batch processor)
    1 machine, 1,500 units/batch, 4 batches/day, 8 hrs
    Capacity: 6,000 units/day
    Utilization: 167% (OVER CAPACITY — bottleneck #2)
         ↓
    CANNING & SEALING
    4 machines, 500 units/hr, 8 hrs
    Capacity: 16,000 units/day
    Utilization: 63% (healthy)
         ↓
    LABELING & PACKAGING
    3 machines, 400 units/hr, 8 hrs
    Capacity: 9,600 units/day
    Utilization: 104% (OVER CAPACITY — bottleneck #3)
         ↓
    OUTPUT (Packaged cans)
    Actual throughput: 6,000 cans/day (limited by cooking)
    Demand: 10,000 cans/day
    Shortfall: 4,000 cans/day (40%)
```

### System Analysis

| Stage | Capacity | Demand | Utilization |
|-------|----------|--------|------------|
| Peeling | 9,600 | 10,000 | 104% |
| **Cooking** | **6,000** | **10,000** | **167%** |
| Canning | 16,000 | 10,000 | 63% |
| Labeling | 9,600 | 10,000 | 104% |

**Primary Bottleneck**: Cooking (batch processor limited to 4 batches/day)

**Improvement Path**:
1. Add batch cooker #2 → Cooking capacity doubles to 12,000/day (new bottleneck: Peeling & Labeling)
2. Then add peeler #3 and labeler #4 → Can reach ~10,000/day

### Key Features Demonstrated

- **Multiple Bottlenecks**: Peeling, Cooking, and Labeling all over-capacity
- **Batch Processing**: Cooking is constrained by batch capacity, not per-hour rate
- **Cascade Effect**: Improving one bottleneck reveals the next constraint

---

## How to Use These Examples

### In the Tool:

1. **Create a new model** on the Dashboard
2. **Draw the flow** using nodes and edges (match the process flow above)
3. **Configure parameters**:
   - Node: throughputRate, numberOfResources, availableTime, yield
   - Edge: bomRatio (for merges), routeSplitPercent (for parallel routes)
4. **Set demand** at the sink
5. **Observe**:
   - Utilization colors (green <85%, orange 85–95%, red >95%)
   - System throughput vs. demand
   - Which node is the bottleneck (highest utilization)

### Interpreting Results:

- **Green nodes** (utilization <85%): Spare capacity, no immediate concern
- **Orange nodes** (85–95%): Approaching capacity, monitor closely
- **Red nodes** (>95%): At or over capacity, likely bottleneck
- **System throughput < demand**: Bottleneck limits output; improvements needed to meet demand

---

## Notes on Real-World Data

These examples use realistic pharmaceutical, automotive, and food processing parameters based on industry standards. However, always validate with actual process data:

- Measure throughput rates in your environment
- Track effectiveness/downtime empirically
- Confirm BOM ratios and material conversions
- Account for shift patterns and operating hours

The tool is only as accurate as the data you input.
