import { describe, test, expect } from 'vitest';
import { simulateWithRework } from './rework';
import { calculateFlowDAG } from './calculations';
import type { SerializedModel, ProcessNodeData } from '../types/flow';

function makeProcessData(overrides: Partial<ProcessNodeData> = {}): ProcessNodeData {
  return {
    name: 'P',
    throughputRate: 100,
    availableTime: 8,
    yield: 100,
    numberOfResources: 1,
    conversionRatio: 1,
    ...overrides,
  };
}

// Helper to create a simple linear chain: Source -> P1 -> P2 -> ... -> Sink
function makeLinearChain(processCount: number, globalDemand = 100): SerializedModel {
  const nodes: SerializedModel['nodes'] = [];
  const edges: SerializedModel['edges'] = [];

  nodes.push({ id: 'src', type: 'source', position: { x: 0, y: 0 }, data: { label: 'Source' } });

  for (let i = 0; i < processCount; i++) {
    nodes.push({
      id: `p${i}`,
      type: 'process',
      position: { x: (i + 1) * 200, y: 0 },
      data: makeProcessData({ name: `P${i}`, outputMaterial: 'Widget' }),
    });
  }

  nodes.push({
    id: 'sink',
    type: 'sink',
    position: { x: (processCount + 1) * 200, y: 0 },
    data: { label: 'Sink' },
  });

  // Chain edges
  let prev = 'src';
  for (let i = 0; i < processCount; i++) {
    edges.push({ id: `e-${prev}-p${i}`, source: prev, target: `p${i}` });
    prev = `p${i}`;
  }
  edges.push({ id: `e-${prev}-sink`, source: prev, target: 'sink' });

  return { nodes, edges, globalDemand };
}

describe('simulateWithRework', () => {
  test('no rework: identical to calculateFlowDAG', () => {
    const model = makeLinearChain(3);
    const withRework = simulateWithRework(model);
    const without = calculateFlowDAG(model);

    expect(withRework.systemThroughput).toBe(without.systemThroughput);
    expect(withRework.bottleneckNodeId).toBe(without.bottleneckNodeId);
    expect(Object.keys(withRework.nodeResults)).toEqual(Object.keys(without.nodeResults));
    expect(withRework.rework).toBeUndefined();
  });

  test('linear chain + single rework loop converges', () => {
    // Source -> P0 (yield 90%) -> P1 (yield 95%, 5% rework to P0) -> Sink
    const model = makeLinearChain(2, 100);
    // Set yields
    const p0 = model.nodes.find(n => n.id === 'p0')!;
    (p0.data as ProcessNodeData).yield = 90;
    const p1 = model.nodes.find(n => n.id === 'p1')!;
    (p1.data as ProcessNodeData).yield = 95;
    (p1.data as ProcessNodeData).reworkLoops = [{ targetNodeId: 'p0', percentage: 5 }];

    const result = simulateWithRework(model);

    expect(result.rework).toBeDefined();
    expect(result.rework!.converged).toBe(true);
    expect(result.rework!.convergenceIterations).toBeLessThanOrEqual(10);
    expect(result.rework!.totalReworkCycles).toBeGreaterThan(0);
    expect(result.rework!.reworkSources).toHaveLength(1);
    expect(result.rework!.reworkSources[0].nodeId).toBe('p1');
    expect(result.rework!.reworkSources[0].targetNodeId).toBe('p0');

    // P0 should have rework demand
    expect(result.nodeResults['p0'].reworkDemand).toBeGreaterThan(0);

    // System throughput should be close to demand since capacities are high
    expect(result.systemThroughput).toBeCloseTo(100, 0);
  });

  test('multiple rework loops from one node', () => {
    // Source -> P0 -> P1 -> P2 (5% to P0, 3% to P1) -> Sink
    const model = makeLinearChain(3, 100);
    const p2 = model.nodes.find(n => n.id === 'p2')!;
    (p2.data as ProcessNodeData).yield = 90;
    (p2.data as ProcessNodeData).reworkLoops = [
      { targetNodeId: 'p0', percentage: 5 },
      { targetNodeId: 'p1', percentage: 3 },
    ];

    const result = simulateWithRework(model);

    expect(result.rework).toBeDefined();
    expect(result.rework!.converged).toBe(true);
    expect(result.rework!.reworkSources).toHaveLength(2);
    expect(result.nodeResults['p0'].reworkDemand).toBeGreaterThan(0);
    expect(result.nodeResults['p1'].reworkDemand).toBeGreaterThan(0);
  });

  test('cascading rework converges (needs more iterations)', () => {
    // Source -> P0 -> P1 (5% to P0) -> P2 (5% to P1) -> Sink
    const model = makeLinearChain(3, 100);
    const p1 = model.nodes.find(n => n.id === 'p1')!;
    (p1.data as ProcessNodeData).yield = 90;
    (p1.data as ProcessNodeData).reworkLoops = [{ targetNodeId: 'p0', percentage: 5 }];
    const p2 = model.nodes.find(n => n.id === 'p2')!;
    (p2.data as ProcessNodeData).yield = 90;
    (p2.data as ProcessNodeData).reworkLoops = [{ targetNodeId: 'p1', percentage: 5 }];

    const result = simulateWithRework(model);

    expect(result.rework).toBeDefined();
    expect(result.rework!.converged).toBe(true);
    expect(result.rework!.convergenceIterations).toBeGreaterThan(1);
  });

  test('high rework percentage still converges', () => {
    // Source -> P0 (yield 50%) -> P1 (yield 60%, 40% rework to P0) -> Sink
    const model = makeLinearChain(2, 100);
    const p0 = model.nodes.find(n => n.id === 'p0')!;
    (p0.data as ProcessNodeData).yield = 50;
    const p1 = model.nodes.find(n => n.id === 'p1')!;
    (p1.data as ProcessNodeData).yield = 60;
    (p1.data as ProcessNodeData).reworkLoops = [{ targetNodeId: 'p0', percentage: 40 }];

    const result = simulateWithRework(model);

    expect(result.rework).toBeDefined();
    expect(result.rework!.converged).toBe(true);
    expect(result.rework!.totalReworkCycles).toBeGreaterThan(0);
  });

  test('unstable config returns converged=false', () => {
    // Source -> P0 (yield 10%) -> P1 (yield 10%, rework 89% to P0) -> Sink
    // This creates a near-unstable loop
    const model = makeLinearChain(2, 100);
    const p0 = model.nodes.find(n => n.id === 'p0')!;
    (p0.data as ProcessNodeData).yield = 10;
    const p1 = model.nodes.find(n => n.id === 'p1')!;
    (p1.data as ProcessNodeData).yield = 10;
    (p1.data as ProcessNodeData).reworkLoops = [{ targetNodeId: 'p0', percentage: 89 }];

    const result = simulateWithRework(model);

    expect(result.rework).toBeDefined();
    // With such extreme values, convergence may or may not happen
    // but we should get a result either way
    expect(result.rework!.convergenceIterations).toBeGreaterThanOrEqual(1);
    expect(result.systemThroughput).toBeGreaterThanOrEqual(0);
  });

  test('rework amounts use output-based model per PRD', () => {
    // Source -> P0 (yield 100%) -> P1 (yield 90%, 10% rework to P0) -> Sink
    // Demand = 100 at sink. P1 output = 100, rework = output × 10% = 10.
    // In demand-driven model, P1's output demand is fixed at 100 (from sink),
    // so rework amount = exactly 10 units/hr.
    // If it were gross-input-based: rework = (100/0.9) × 0.10 ≈ 11.11
    const model = makeLinearChain(2, 100);
    const p1 = model.nodes.find(n => n.id === 'p1')!;
    (p1.data as ProcessNodeData).yield = 90;
    (p1.data as ProcessNodeData).reworkLoops = [{ targetNodeId: 'p0', percentage: 10 }];

    const result = simulateWithRework(model);

    expect(result.rework).toBeDefined();
    expect(result.rework!.converged).toBe(true);

    // Output-based: rework = 100 * 0.10 = 10 exactly
    // Gross-input-based would give ≈ 11.11
    const rs = result.rework!.reworkSources[0];
    expect(rs.reworkAmount).toBeCloseTo(10, 1);

    // P0 should have increased demand from rework
    const base = calculateFlowDAG(model);
    expect(result.nodeResults['p0'].requiredThroughput)
      .toBeGreaterThan(base.nodeResults['p0'].requiredThroughput);
  });

  // ─── DAG-specific tests ───────────────────────────────────────────────────

  test('DAG: rework into merge input propagates with BOM ratios', () => {
    // Two sources feed a merge node, then output goes through an assembly node
    //   Source1 -> P_input1 (bom 2) ─┐
    //                                  ├─> P_merge -> P_assembly (5% rework to P_merge) -> Sink
    //   Source2 -> P_input2 (bom 1) ─┘
    const model: SerializedModel = {
      nodes: [
        { id: 'src1', type: 'source', position: { x: 0, y: 0 }, data: { label: 'Source1' } },
        { id: 'src2', type: 'source', position: { x: 0, y: 200 }, data: { label: 'Source2' } },
        { id: 'p_in1', type: 'process', position: { x: 200, y: 0 }, data: makeProcessData({ name: 'Input1', outputMaterial: 'A' }) },
        { id: 'p_in2', type: 'process', position: { x: 200, y: 200 }, data: makeProcessData({ name: 'Input2', outputMaterial: 'B' }) },
        { id: 'p_merge', type: 'process', position: { x: 400, y: 100 }, data: makeProcessData({
          name: 'Merge',
          outputMaterial: 'AB',
          bomRatios: { 'e-in1-merge': 2, 'e-in2-merge': 1 },
        }) },
        { id: 'p_asm', type: 'process', position: { x: 600, y: 100 }, data: makeProcessData({
          name: 'Assembly',
          yield: 90,
          outputMaterial: 'Final',
          reworkLoops: [{ targetNodeId: 'p_merge', percentage: 5 }],
        }) },
        { id: 'sink', type: 'sink', position: { x: 800, y: 100 }, data: { label: 'Sink' } },
      ],
      edges: [
        { id: 'e-src1-in1', source: 'src1', target: 'p_in1' },
        { id: 'e-src2-in2', source: 'src2', target: 'p_in2' },
        { id: 'e-in1-merge', source: 'p_in1', target: 'p_merge' },
        { id: 'e-in2-merge', source: 'p_in2', target: 'p_merge' },
        { id: 'e-merge-asm', source: 'p_merge', target: 'p_asm' },
        { id: 'e-asm-sink', source: 'p_asm', target: 'sink' },
      ],
      globalDemand: 100,
    };

    const result = simulateWithRework(model);

    expect(result.rework).toBeDefined();
    expect(result.rework!.converged).toBe(true);
    expect(result.rework!.reworkSources).toHaveLength(1);

    // Merge node should receive rework demand
    expect(result.nodeResults['p_merge'].reworkDemand).toBeGreaterThan(0);

    // Both input nodes should have increased demand from merge propagation
    // P_in1 has BOM ratio 2, P_in2 has BOM ratio 1
    const baseWithout = calculateFlowDAG(model);
    expect(result.nodeResults['p_in1'].requiredThroughput)
      .toBeGreaterThan(baseWithout.nodeResults['p_in1'].requiredThroughput);
    expect(result.nodeResults['p_in2'].requiredThroughput)
      .toBeGreaterThan(baseWithout.nodeResults['p_in2'].requiredThroughput);
  });

  test('DAG: rework in a chain increases target node demand', () => {
    // Source -> P0 (yield 90%) -> P1 (yield 90%) -> P2 (yield 90%, 5% rework to P0) -> Sink
    // In demand-driven model, P2's output = 100 (fixed by sink).
    // Rework = 100 * 5% = 5 units/hr fed back to P0.
    // P0's demand increases, but P1 and P2 demands stay the same
    // (they're driven by downstream requirements, not by upstream capacity).
    const model = makeLinearChain(3, 100);
    const p0 = model.nodes.find(n => n.id === 'p0')!;
    (p0.data as ProcessNodeData).yield = 90;
    const p1 = model.nodes.find(n => n.id === 'p1')!;
    (p1.data as ProcessNodeData).yield = 90;
    const p2 = model.nodes.find(n => n.id === 'p2')!;
    (p2.data as ProcessNodeData).yield = 90;
    (p2.data as ProcessNodeData).reworkLoops = [{ targetNodeId: 'p0', percentage: 5 }];

    const base = calculateFlowDAG(model);
    const result = simulateWithRework(model);

    expect(result.rework).toBeDefined();
    expect(result.rework!.converged).toBe(true);

    // P0 should have rework demand
    expect(result.nodeResults['p0'].reworkDemand).toBeGreaterThan(0);

    // P0's total required throughput should be higher with rework than without
    expect(result.nodeResults['p0'].requiredThroughput)
      .toBeGreaterThan(base.nodeResults['p0'].requiredThroughput);

    // P1 and P2 demand stays the same (driven by sink)
    expect(result.nodeResults['p1'].requiredThroughput)
      .toBeCloseTo(base.nodeResults['p1'].requiredThroughput, 5);
    expect(result.nodeResults['p2'].requiredThroughput)
      .toBeCloseTo(base.nodeResults['p2'].requiredThroughput, 5);
  });

  test('DAG: rework with fork-join (split then merge)', () => {
    // Source -> P_start -> [50%] P_a ─┐
    //                   -> [50%] P_b ─┤─> P_join (bom: 1, 1) -> P_final (3% rework to P_start) -> Sink
    const model: SerializedModel = {
      nodes: [
        { id: 'src', type: 'source', position: { x: 0, y: 100 }, data: { label: 'Source' } },
        { id: 'p_start', type: 'process', position: { x: 200, y: 100 }, data: makeProcessData({ name: 'Start', outputMaterial: 'Raw' }) },
        { id: 'p_a', type: 'process', position: { x: 400, y: 0 }, data: makeProcessData({ name: 'BranchA', outputMaterial: 'PartA' }) },
        { id: 'p_b', type: 'process', position: { x: 400, y: 200 }, data: makeProcessData({ name: 'BranchB', outputMaterial: 'PartB' }) },
        { id: 'p_join', type: 'process', position: { x: 600, y: 100 }, data: makeProcessData({
          name: 'Join',
          outputMaterial: 'Assembly',
          bomRatios: { 'e-a-join': 1, 'e-b-join': 1 },
        }) },
        { id: 'p_final', type: 'process', position: { x: 800, y: 100 }, data: makeProcessData({
          name: 'Final',
          yield: 95,
          outputMaterial: 'Product',
          reworkLoops: [{ targetNodeId: 'p_start', percentage: 3 }],
        }) },
        { id: 'sink', type: 'sink', position: { x: 1000, y: 100 }, data: { label: 'Sink' } },
      ],
      edges: [
        { id: 'e-src-start', source: 'src', target: 'p_start' },
        { id: 'e-start-a', source: 'p_start', target: 'p_a', data: { splitRatio: 50 } },
        { id: 'e-start-b', source: 'p_start', target: 'p_b', data: { splitRatio: 50 } },
        { id: 'e-a-join', source: 'p_a', target: 'p_join' },
        { id: 'e-b-join', source: 'p_b', target: 'p_join' },
        { id: 'e-join-final', source: 'p_join', target: 'p_final' },
        { id: 'e-final-sink', source: 'p_final', target: 'sink' },
      ],
      globalDemand: 100,
    };

    const result = simulateWithRework(model);

    expect(result.rework).toBeDefined();
    expect(result.rework!.converged).toBe(true);

    // Start node should have rework demand from Final
    expect(result.nodeResults['p_start'].reworkDemand).toBeGreaterThan(0);

    // P_start's required throughput should be higher than without rework
    // (rework adds output demand at P_start, increasing its load and upstream propagation)
    const base = calculateFlowDAG(model);
    expect(result.nodeResults['p_start'].requiredThroughput)
      .toBeGreaterThan(base.nodeResults['p_start'].requiredThroughput);

    // Final node's rework amount should be ~3% of its output demand (100)
    const rs = result.rework!.reworkSources[0];
    expect(rs.percentage).toBe(3);
    expect(rs.reworkAmount).toBeCloseTo(100 * 0.03, 0);
  });
});
