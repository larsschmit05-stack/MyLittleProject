import { describe, it, expect } from 'vitest';
import { yieldToFraction, calculateFlow, topologicalSort, calculateFlowDAG } from './calculations';
import type { SerializedModel, SerializedNode, EdgeData } from '../types/flow';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeSource(id: string): SerializedNode {
  return { id, type: 'source', position: { x: 0, y: 0 }, data: { label: 'Source' } };
}

function makeSink(id: string): SerializedNode {
  return { id, type: 'sink', position: { x: 0, y: 0 }, data: { label: 'Sink' } };
}

function makeProcess(id: string, overrides: Partial<{
  name: string;
  throughputRate: number;
  availableTime: number;
  yield: number;
  numberOfResources: number;
  conversionRatio: number;
  bomRatios: Record<string, number>;
}> = {}): SerializedNode {
  const data = {
    name: overrides.name ?? 'Process',
    throughputRate: overrides.throughputRate ?? 1, // 1 unit/hour
    availableTime: overrides.availableTime ?? 8, // 8 hours
    yield: overrides.yield ?? 100,
    numberOfResources: overrides.numberOfResources ?? 1,
    conversionRatio: overrides.conversionRatio ?? 1,
    ...(overrides.bomRatios !== undefined ? { bomRatios: overrides.bomRatios } : {}),
  };
  return { id, type: 'process', position: { x: 0, y: 0 }, data };
}

// EdgeSpec allows optional edge data as a third tuple element (backward-compatible)
type EdgeSpec = [string, string, (EdgeData | undefined)?];

function makeModel(
  nodes: SerializedNode[],
  edgePairs: EdgeSpec[],
  globalDemand = 10
): SerializedModel {
  return {
    nodes,
    edges: edgePairs.map(([source, target, edgeData], i) => ({
      id: `e${i}`,
      source,
      target,
      ...(edgeData !== undefined ? { data: edgeData } : {}),
    })),
    globalDemand,
  };
}

// ─── Unit tests ───────────────────────────────────────────────────────────────

describe('yieldToFraction', () => {
  it('converts 100% to 1.0', () => {
    expect(yieldToFraction(100)).toBe(1.0);
  });
  it('converts 95% to 0.95', () => {
    expect(yieldToFraction(95)).toBeCloseTo(0.95);
  });
  it('converts 0% to 0', () => {
    expect(yieldToFraction(0)).toBe(0);
  });
});

describe('calculateFlow — 3-step chain, 100% yield, 1:1 conversion', () => {
  // Source → P1 → P2 → P3 → Sink, all defaults, demand = 10
  it('all nodes have requiredThroughput equal to globalDemand', () => {
    const model = makeModel(
      [makeSource('src'), makeProcess('p1'), makeProcess('p2'), makeProcess('p3'), makeSink('snk')],
      [['src', 'p1'], ['p1', 'p2'], ['p2', 'p3'], ['p3', 'snk']],
      10
    );
    const result = calculateFlow(model);
    expect(result.nodeResults['p1'].requiredThroughput).toBe(10);
    expect(result.nodeResults['p2'].requiredThroughput).toBe(10);
    expect(result.nodeResults['p3'].requiredThroughput).toBe(10);
  });

  it('systemThroughput equals effective capacity of a single node with defaults', () => {
    // EC = (8h / 1h) × 1 × 1.0 = 8
    const model = makeModel(
      [makeSource('src'), makeProcess('p1'), makeSink('snk')],
      [['src', 'p1'], ['p1', 'snk']],
      10
    );
    const result = calculateFlow(model);
    expect(result.systemThroughput).toBeCloseTo(8);
  });
});

describe('calculateFlow — yield loss', () => {
  // Source → P → Sink, yield=80%, demand=10
  it('requiredThroughput is equal to globalDemand for the last (only) process node', () => {
    const model = makeModel(
      [makeSource('src'), makeProcess('p', { yield: 80 }), makeSink('snk')],
      [['src', 'p'], ['p', 'snk']],
      10
    );
    const result = calculateFlow(model);
    expect(result.nodeResults['p'].requiredThroughput).toBe(10);
  });

  it('effective capacity is reduced proportionally by yield fraction', () => {
    // EC = (8h / 1h) × 1 × 0.8 = 6.4
    const model = makeModel(
      [makeSource('src'), makeProcess('p', { yield: 80 }), makeSink('snk')],
      [['src', 'p'], ['p', 'snk']],
      10
    );
    const result = calculateFlow(model);
    expect(result.nodeResults['p'].effectiveCapacity).toBeCloseTo(6.4);
  });
});

describe('calculateFlow — conversion ratio', () => {
  // Source → P_upstream → P_downstream → Sink
  // P_downstream has conversionRatio=4, demand=2
  it('upstream node requiredThroughput is demand × conversionRatio of downstream', () => {
    const model = makeModel(
      [
        makeSource('src'),
        makeProcess('p_up', { throughputRate: 1, availableTime: 8, yield: 100, conversionRatio: 1 }),
        makeProcess('p_down', { throughputRate: 1, availableTime: 8, yield: 100, conversionRatio: 4 }),
        makeSink('snk'),
      ],
      [['src', 'p_up'], ['p_up', 'p_down'], ['p_down', 'snk']],
      2
    );
    const result = calculateFlow(model);
    // p_down: requiredThroughput = 2 (globalDemand)
    // p_up: requiredThroughput = 2 / 1.0 × 4 = 8
    expect(result.nodeResults['p_down'].requiredThroughput).toBe(2);
    expect(result.nodeResults['p_up'].requiredThroughput).toBe(8);
  });
});

describe('calculateFlow — normalized system throughput', () => {
  it('normalizes multi-step capacities to sink output units with yield and conversion losses', () => {
    const model = makeModel(
      [
        makeSource('src'),
        makeProcess('p1', { throughputRate: 1, availableTime: 10, yield: 100, numberOfResources: 1, conversionRatio: 1 }), // EC = 10
        makeProcess('p2', { throughputRate: 1, availableTime: 10, yield: 80, numberOfResources: 1, conversionRatio: 2 }), // EC = 8
        makeProcess('p3', { throughputRate: 1, availableTime: 15, yield: 90, numberOfResources: 1, conversionRatio: 3 }), // EC = 13.5
        makeSink('snk'),
      ],
      [['src', 'p1'], ['p1', 'p2'], ['p2', 'p3'], ['p3', 'snk']],
      5
    );

    const result = calculateFlow(model);

    expect(result.nodeResults['p3'].requiredThroughput).toBeCloseTo(5);
    expect(result.nodeResults['p2'].requiredThroughput).toBeCloseTo((5 / 0.9) * 3);
    expect(result.nodeResults['p1'].requiredThroughput).toBeCloseTo((((5 / 0.9) * 3) / 0.8) * 2);
    expect(result.systemThroughput).toBeCloseTo(1.2);
    expect(result.bottleneckNodeId).toBe('p1');
  });
});

describe('calculateFlow — effective capacity', () => {
  it('2 units/hour × 8 hours × 2 resources × 1.0 yield = 32', () => {
    const model = makeModel(
      [makeSource('src'), makeProcess('p', { availableTime: 8, throughputRate: 2, numberOfResources: 2, yield: 100 }), makeSink('snk')],
      [['src', 'p'], ['p', 'snk']],
      10
    );
    const result = calculateFlow(model);
    expect(result.nodeResults['p'].effectiveCapacity).toBeCloseTo(32);
  });

  it('60 units/hour and 40 available hours yields 2400 units per period', () => {
    const model = makeModel(
      [makeSource('src'), makeProcess('p', { availableTime: 40, throughputRate: 60, numberOfResources: 1, yield: 100 }), makeSink('snk')],
      [['src', 'p'], ['p', 'snk']],
      10
    );
    const result = calculateFlow(model);
    expect(result.nodeResults['p'].effectiveCapacity).toBeCloseTo(2400);
  });
});

describe('calculateFlow — bottleneck detection', () => {
  // P1: EC=8, requiredThroughput=10 → utilization=1.25 (bottleneck)
  // P2: EC=16, requiredThroughput=10 → utilization=0.625
  it('identifies node with highest utilization as bottleneck', () => {
    const model = makeModel(
      [
        makeSource('src'),
        makeProcess('p1', { throughputRate: 1, availableTime: 8, numberOfResources: 1, yield: 100, conversionRatio: 1 }), // EC=8
        makeProcess('p2', { throughputRate: 1, availableTime: 8, numberOfResources: 2, yield: 100, conversionRatio: 1 }), // EC=16
        makeSink('snk'),
      ],
      [['src', 'p1'], ['p1', 'p2'], ['p2', 'snk']],
      10
    );
    const result = calculateFlow(model);
    expect(result.bottleneckNodeId).toBe('p1');
    expect(result.nodeResults['p1'].utilization).toBeCloseTo(1.25);
    expect(result.nodeResults['p2'].utilization).toBeCloseTo(0.625);
  });
});

describe('calculateFlow — zero-value protection', () => {
  it('throughputRate=0 → effectiveCapacity=0', () => {
    const model = makeModel(
      [makeSource('src'), makeProcess('p', { throughputRate: 0 }), makeSink('snk')],
      [['src', 'p'], ['p', 'snk']],
      10
    );
    const result = calculateFlow(model);
    expect(result.nodeResults['p'].effectiveCapacity).toBe(0);
  });

  it('EC=0 with positive demand → utilization=Infinity', () => {
    const model = makeModel(
      [makeSource('src'), makeProcess('p', { throughputRate: 0 }), makeSink('snk')],
      [['src', 'p'], ['p', 'snk']],
      10
    );
    const result = calculateFlow(model);
    expect(result.nodeResults['p'].utilization).toBe(Infinity);
  });

  it('EC=0 with zero demand → utilization=0', () => {
    const model = makeModel(
      [makeSource('src'), makeProcess('p', { throughputRate: 0 }), makeSink('snk')],
      [['src', 'p'], ['p', 'snk']],
      0
    );
    const result = calculateFlow(model);
    expect(result.nodeResults['p'].utilization).toBe(0);
  });
});

describe('calculateFlow — edge cases', () => {
  it('empty model returns zeroed result', () => {
    const result = calculateFlow({ nodes: [], edges: [], globalDemand: 10 });
    expect(result.systemThroughput).toBe(0);
    expect(result.bottleneckNodeId).toBeNull();
    expect(result.nodeResults).toEqual({});
  });

  it('source-sink only (no process nodes) preserves global demand as throughput', () => {
    const model = makeModel(
      [makeSource('src'), makeSink('snk')],
      [['src', 'snk']],
      5
    );
    const result = calculateFlow(model);
    expect(result.systemThroughput).toBe(5);
    expect(result.bottleneckNodeId).toBeNull();
    expect(result.nodeResults).toEqual({});
  });

  it('disconnected extra process node invalidates the model', () => {
    const model = makeModel(
      [makeSource('src'), makeProcess('p1'), makeProcess('p_orphan'), makeSink('snk')],
      [['src', 'p1'], ['p1', 'snk']],
      5
    );

    const result = calculateFlow(model);
    expect(result.systemThroughput).toBe(0);
    expect(result.bottleneckNodeId).toBeNull();
    expect(result.nodeResults).toEqual({});
  });
});

// ─── topologicalSort ──────────────────────────────────────────────────────────

describe('topologicalSort', () => {
  it('returns all node IDs in topological order for a linear chain', () => {
    const nodes = [makeSource('src'), makeProcess('p1'), makeProcess('p2'), makeSink('snk')];
    const edges = [
      { id: 'e0', source: 'src', target: 'p1' },
      { id: 'e1', source: 'p1', target: 'p2' },
      { id: 'e2', source: 'p2', target: 'snk' },
    ];
    const result = topologicalSort(nodes, edges);
    expect(result).not.toBeNull();
    const order = result!;
    expect(order).toHaveLength(4);
    expect(order.indexOf('src')).toBeLessThan(order.indexOf('p1'));
    expect(order.indexOf('p2')).toBeLessThan(order.indexOf('snk'));
  });

  it('places both merge inputs before the merge node, merge before sink (diamond)', () => {
    const nodes = [makeSource('src1'), makeSource('src2'), makeProcess('pA'), makeProcess('pB'), makeProcess('merge'), makeSink('snk')];
    const edges = [
      { id: 'e0', source: 'src1', target: 'pA' },
      { id: 'e1', source: 'src2', target: 'pB' },
      { id: 'e2', source: 'pA', target: 'merge' },
      { id: 'e3', source: 'pB', target: 'merge' },
      { id: 'e4', source: 'merge', target: 'snk' },
    ];
    const result = topologicalSort(nodes, edges);
    expect(result).not.toBeNull();
    const order = result!;
    expect(order.indexOf('pA')).toBeLessThan(order.indexOf('merge'));
    expect(order.indexOf('pB')).toBeLessThan(order.indexOf('merge'));
    expect(order.indexOf('merge')).toBeLessThan(order.indexOf('snk'));
  });

  it('returns null when a cycle is present', () => {
    const nodes = [makeProcess('p1'), makeProcess('p2')];
    const edges = [
      { id: 'e0', source: 'p1', target: 'p2' },
      { id: 'e1', source: 'p2', target: 'p1' },
    ];
    expect(topologicalSort(nodes, edges)).toBeNull();
  });

  it('excludes scrap-edge-only nodes from the sorted result', () => {
    const nodes = [makeSource('src'), makeProcess('p1'), makeSink('snk'), makeSource('scrap_tgt')];
    const edges = [
      { id: 'e0', source: 'src', target: 'p1' },
      { id: 'e1', source: 'p1', target: 'snk' },
      { id: 'e2', source: 'p1', target: 'scrap_tgt', data: { isScrap: true } },
    ];
    const result = topologicalSort(nodes, edges);
    expect(result).not.toBeNull();
    const order = result!;
    expect(order).toContain('src');
    expect(order).toContain('p1');
    expect(order).toContain('snk');
    expect(order).not.toContain('scrap_tgt');
  });
});

// ─── calculateFlowDAG — V1 regression ─────────────────────────────────────────

describe('calculateFlowDAG — V1 regression', () => {
  it('3-step chain, 100% yield — matches calculateFlow', () => {
    const model = makeModel(
      [makeSource('src'), makeProcess('p1'), makeProcess('p2'), makeProcess('p3'), makeSink('snk')],
      [['src', 'p1'], ['p1', 'p2'], ['p2', 'p3'], ['p3', 'snk']],
      10
    );
    expect(calculateFlowDAG(model)).toEqual(calculateFlow(model));
  });

  it('single process, yield=80% — matches calculateFlow', () => {
    const model = makeModel(
      [makeSource('src'), makeProcess('p', { yield: 80 }), makeSink('snk')],
      [['src', 'p'], ['p', 'snk']],
      10
    );
    expect(calculateFlowDAG(model)).toEqual(calculateFlow(model));
  });

  it('conversion ratio downstream=4, demand=2 — matches calculateFlow', () => {
    const model = makeModel(
      [
        makeSource('src'),
        makeProcess('p_up', { conversionRatio: 1 }),
        makeProcess('p_down', { conversionRatio: 4 }),
        makeSink('snk'),
      ],
      [['src', 'p_up'], ['p_up', 'p_down'], ['p_down', 'snk']],
      2
    );
    expect(calculateFlowDAG(model)).toEqual(calculateFlow(model));
  });

  it('normalized system throughput with yield + conversion — matches calculateFlow', () => {
    const model = makeModel(
      [
        makeSource('src'),
        makeProcess('p1', { throughputRate: 1, availableTime: 10, yield: 100, conversionRatio: 1 }),
        makeProcess('p2', { throughputRate: 1, availableTime: 10, yield: 80, conversionRatio: 2 }),
        makeProcess('p3', { throughputRate: 1, availableTime: 15, yield: 90, conversionRatio: 3 }),
        makeSink('snk'),
      ],
      [['src', 'p1'], ['p1', 'p2'], ['p2', 'p3'], ['p3', 'snk']],
      5
    );
    // systemThroughput is computed via different but equivalent formulas in the two engines,
    // leading to a sub-epsilon floating-point divergence — use field-level checks.
    const r = calculateFlowDAG(model);
    expect(r.systemThroughput).toBeCloseTo(1.2, 10);
    expect(r.bottleneckNodeId).toBe('p1');
    expect(r.nodeResults['p1'].requiredThroughput).toBeCloseTo(41.6667, 4);
    expect(r.nodeResults['p2'].requiredThroughput).toBeCloseTo(16.6667, 4);
    expect(r.nodeResults['p3'].requiredThroughput).toBeCloseTo(5, 4);
  });

  it('throughputRate=0 → effectiveCapacity=0, positive demand → utilization=Infinity — matches calculateFlow', () => {
    const model = makeModel(
      [makeSource('src'), makeProcess('p', { throughputRate: 0 }), makeSink('snk')],
      [['src', 'p'], ['p', 'snk']],
      10
    );
    expect(calculateFlowDAG(model)).toEqual(calculateFlow(model));
  });

  it('EC=0 with zero demand → utilization=0 — matches calculateFlow', () => {
    const model = makeModel(
      [makeSource('src'), makeProcess('p', { throughputRate: 0 }), makeSink('snk')],
      [['src', 'p'], ['p', 'snk']],
      0
    );
    expect(calculateFlowDAG(model)).toEqual(calculateFlow(model));
  });

  it('source-sink only (no process) → systemThroughput=globalDemand — matches calculateFlow', () => {
    const model = makeModel(
      [makeSource('src'), makeSink('snk')],
      [['src', 'snk']],
      5
    );
    expect(calculateFlowDAG(model)).toEqual(calculateFlow(model));
  });

  it('empty model → systemThroughput=0 — matches calculateFlow', () => {
    expect(calculateFlowDAG({ nodes: [], edges: [], globalDemand: 10 }))
      .toEqual(calculateFlow({ nodes: [], edges: [], globalDemand: 10 }));
  });

  it('disconnected process node — matches calculateFlow (both return EMPTY_RESULT)', () => {
    const model = makeModel(
      [makeSource('src'), makeProcess('p1'), makeProcess('p_orphan'), makeSink('snk')],
      [['src', 'p1'], ['p1', 'snk']],
      5
    );
    expect(calculateFlowDAG(model)).toEqual(calculateFlow(model));
  });
});

// ─── calculateFlowDAG — Merge / BOM ──────────────────────────────────────────

describe('calculateFlowDAG — 3-source assembly BOM 4:1:2, demand=100', () => {
  // Topology: srcA→pA→merge, srcB→pB→merge, srcC→pC→merge, merge→snk
  // merge.bomRatios: { eA: 4, eB: 1, eC: 2 } — 4 units pA + 1 unit pB + 2 units pC per output
  const model: SerializedModel = {
    nodes: [
      makeSource('srcA'), makeProcess('pA'),
      makeSource('srcB'), makeProcess('pB'),
      makeSource('srcC'), makeProcess('pC'),
      makeProcess('merge', { bomRatios: { eA: 4, eB: 1, eC: 2 } }),
      makeSink('snk'),
    ],
    edges: [
      { id: 'srcA-pA', source: 'srcA', target: 'pA' },
      { id: 'eA', source: 'pA', target: 'merge' },
      { id: 'srcB-pB', source: 'srcB', target: 'pB' },
      { id: 'eB', source: 'pB', target: 'merge' },
      { id: 'srcC-pC', source: 'srcC', target: 'pC' },
      { id: 'eC', source: 'pC', target: 'merge' },
      { id: 'merge-snk', source: 'merge', target: 'snk' },
    ],
    globalDemand: 100,
  };

  it('merge requiredThroughput equals demand', () => {
    const r = calculateFlowDAG(model);
    expect(r.nodeResults['merge'].requiredThroughput).toBeCloseTo(100, 4);
  });

  it('each feeder branch scales by its BOM ratio (4:1:2)', () => {
    const r = calculateFlowDAG(model);
    expect(r.nodeResults['pA'].requiredThroughput).toBeCloseTo(400, 4); // 100 × 4
    expect(r.nodeResults['pB'].requiredThroughput).toBeCloseTo(100, 4); // 100 × 1
    expect(r.nodeResults['pC'].requiredThroughput).toBeCloseTo(200, 4); // 100 × 2
  });
});

describe('calculateFlowDAG — 3-source assembly BOM 4:1:2, merge yield=90%, demand=100', () => {
  // grossInputDemand at merge = 100 / 0.90 ≈ 111.11
  const model: SerializedModel = {
    nodes: [
      makeSource('srcA'), makeProcess('pA'),
      makeSource('srcB'), makeProcess('pB'),
      makeSource('srcC'), makeProcess('pC'),
      makeProcess('merge', { yield: 90, bomRatios: { eA: 4, eB: 1, eC: 2 } }),
      makeSink('snk'),
    ],
    edges: [
      { id: 'srcA-pA', source: 'srcA', target: 'pA' },
      { id: 'eA', source: 'pA', target: 'merge' },
      { id: 'srcB-pB', source: 'srcB', target: 'pB' },
      { id: 'eB', source: 'pB', target: 'merge' },
      { id: 'srcC-pC', source: 'srcC', target: 'pC' },
      { id: 'eC', source: 'pC', target: 'merge' },
      { id: 'merge-snk', source: 'merge', target: 'snk' },
    ],
    globalDemand: 100,
  };

  it('scales feeder throughputs by grossInputDemand (demand / yield) × BOM ratio', () => {
    const r = calculateFlowDAG(model);
    const grossInput = 100 / 0.9; // ≈ 111.11
    expect(r.nodeResults['pA'].requiredThroughput).toBeCloseTo(grossInput * 4, 4); // ≈ 444.44
    expect(r.nodeResults['pB'].requiredThroughput).toBeCloseTo(grossInput * 1, 4); // ≈ 111.11
    expect(r.nodeResults['pC'].requiredThroughput).toBeCloseTo(grossInput * 2, 4); // ≈ 222.22
  });
});

describe('calculateFlowDAG — 2-level merge cascade', () => {
  // Topology:
  //   srcA → pA → merge1 → pMid → merge2 → snk
  //   srcB → pB ↗           srcC → pC ──────────↗
  // BOM at merge1: { eA: 2, eB: 1 }
  // BOM at merge2: { eMid: 1, eC: 3 }
  const model: SerializedModel = {
    nodes: [
      makeSource('srcA'), makeProcess('pA'),
      makeSource('srcB'), makeProcess('pB'),
      makeSource('srcC'), makeProcess('pC'),
      makeProcess('merge1', { bomRatios: { eA: 2, eB: 1 } }),
      makeProcess('pMid'),
      makeProcess('merge2', { bomRatios: { eMid: 1, eC: 3 } }),
      makeSink('snk'),
    ],
    edges: [
      { id: 'srcA-pA', source: 'srcA', target: 'pA' },
      { id: 'eA', source: 'pA', target: 'merge1' },
      { id: 'srcB-pB', source: 'srcB', target: 'pB' },
      { id: 'eB', source: 'pB', target: 'merge1' },
      { id: 'srcC-pC', source: 'srcC', target: 'pC' },
      { id: 'eC', source: 'pC', target: 'merge2' },
      { id: 'm1-pMid', source: 'merge1', target: 'pMid' },
      { id: 'eMid', source: 'pMid', target: 'merge2' },
      { id: 'm2-snk', source: 'merge2', target: 'snk' },
    ],
    globalDemand: 100,
  };

  it('propagates demand correctly through both merge levels', () => {
    const r = calculateFlowDAG(model);
    // Level 2 (merge2): rt=100; eMid:1 → pMid.rt=100; eC:3 → pC.rt=300
    expect(r.nodeResults['merge2'].requiredThroughput).toBeCloseTo(100, 4);
    expect(r.nodeResults['pMid'].requiredThroughput).toBeCloseTo(100, 4);
    expect(r.nodeResults['pC'].requiredThroughput).toBeCloseTo(300, 4);
    // Level 1 (merge1): rt=100; eA:2 → pA.rt=200; eB:1 → pB.rt=100
    expect(r.nodeResults['merge1'].requiredThroughput).toBeCloseTo(100, 4);
    expect(r.nodeResults['pA'].requiredThroughput).toBeCloseTo(200, 4);
    expect(r.nodeResults['pB'].requiredThroughput).toBeCloseTo(100, 4);
  });
});

// ─── calculateFlowDAG — Scrap edge / yield loss ───────────────────────────────

describe('calculateFlowDAG — scrap edge: yield=95% process with visual scrap edge', () => {
  // src → process(yield=95%) → snk  +  process → scrap_tgt (isScrap=true)
  const model: SerializedModel = {
    nodes: [makeSource('src'), makeProcess('process', { yield: 95 }), makeSink('snk'), makeSource('scrap_tgt')],
    edges: [
      { id: 'src-p', source: 'src', target: 'process' },
      { id: 'p-snk', source: 'process', target: 'snk' },
      { id: 'p-scrap', source: 'process', target: 'scrap_tgt', data: { isScrap: true } },
    ],
    globalDemand: 95,
  };

  it('process requiredThroughput equals globalDemand (single real output)', () => {
    const r = calculateFlowDAG(model);
    expect(r.nodeResults['process'].requiredThroughput).toBeCloseTo(95, 4);
  });

  it('process effectiveCapacity = rate × time × yield = 1×8×0.95 = 7.6', () => {
    const r = calculateFlowDAG(model);
    expect(r.nodeResults['process'].effectiveCapacity).toBeCloseTo(7.6, 4);
  });

  it('scrap_tgt does not appear in nodeResults', () => {
    const r = calculateFlowDAG(model);
    expect(Object.keys(r.nodeResults)).not.toContain('scrap_tgt');
  });
});

describe('calculateFlowDAG — scrap edge: yield=100% process, no amplification', () => {
  it('requiredThroughput equals globalDemand', () => {
    const model: SerializedModel = {
      nodes: [makeSource('src'), makeProcess('p', { yield: 100 }), makeSink('snk'), makeSource('scrap_tgt')],
      edges: [
        { id: 'src-p', source: 'src', target: 'p' },
        { id: 'p-snk', source: 'p', target: 'snk' },
        { id: 'p-scrap', source: 'p', target: 'scrap_tgt', data: { isScrap: true } },
      ],
      globalDemand: 10,
    };
    const r = calculateFlowDAG(model);
    expect(r.nodeResults['p'].requiredThroughput).toBe(10);
  });
});

describe('calculateFlowDAG — two-step chain with yield losses', () => {
  it('each step amplifies demand by 1/yield: p2.rt=10, p1.rt=10/0.8=12.5', () => {
    const model = makeModel(
      [makeSource('src'), makeProcess('p1', { yield: 80 }), makeProcess('p2', { yield: 80 }), makeSink('snk')],
      [['src', 'p1'], ['p1', 'p2'], ['p2', 'snk']],
      10
    );
    const r = calculateFlowDAG(model);
    expect(r.nodeResults['p2'].requiredThroughput).toBeCloseTo(10, 4);
    expect(r.nodeResults['p1'].requiredThroughput).toBeCloseTo(12.5, 4); // 10 / 0.8
  });
});

// ─── calculateFlowDAG — Multi-output real splits ──────────────────────────────

describe('calculateFlowDAG — split with two real outputs converging at a merge', () => {
  // src → split (splitRatio 80%/20%) → pA → merge(BOM:{eA:0.8,eB:0.2}) → snk
  //                                  ↘ pB ──────────────────────────────↗
  // demand=100
  const model: SerializedModel = {
    nodes: [
      makeSource('src'),
      makeProcess('split'),
      makeProcess('pA'),
      makeProcess('pB'),
      makeProcess('merge', { bomRatios: { 'eA': 0.8, 'eB': 0.2 } }),
      makeSink('snk'),
    ],
    edges: [
      { id: 'src-split', source: 'src', target: 'split' },
      { id: 'split-pA', source: 'split', target: 'pA', data: { splitRatio: 80 } },
      { id: 'split-pB', source: 'split', target: 'pB', data: { splitRatio: 20 } },
      { id: 'eA', source: 'pA', target: 'merge' },   // BOM key 'eA' matches this edge ID
      { id: 'eB', source: 'pB', target: 'merge' },   // BOM key 'eB' matches this edge ID
      { id: 'merge-snk', source: 'merge', target: 'snk' },
    ],
    globalDemand: 100,
  };

  it('split.rt = max(pA candidate, pB candidate) = 100; pA.rt=80, pB.rt=20', () => {
    const r = calculateFlowDAG(model);
    expect(r.nodeResults['split'].requiredThroughput).toBeCloseTo(100, 4);
    expect(r.nodeResults['pA'].requiredThroughput).toBeCloseTo(80, 4);
    expect(r.nodeResults['pB'].requiredThroughput).toBeCloseTo(20, 4);
  });
});

describe('calculateFlowDAG — process with real output + scrap edge (yield=80%)', () => {
  // src → process(yield=80%) → snk  +  process → dead-end (isScrap)
  // Only 1 real outgoing edge → single-output; rt = globalDemand
  it('requiredThroughput=80, effectiveCapacity=6.4, utilization≈12.5', () => {
    const model: SerializedModel = {
      nodes: [makeSource('src'), makeProcess('p', { yield: 80 }), makeSink('snk'), makeSource('dead_end')],
      edges: [
        { id: 'src-p', source: 'src', target: 'p' },
        { id: 'p-snk', source: 'p', target: 'snk' },
        { id: 'p-scrap', source: 'p', target: 'dead_end', data: { isScrap: true } },
      ],
      globalDemand: 80,
    };
    const r = calculateFlowDAG(model);
    expect(r.nodeResults['p'].requiredThroughput).toBeCloseTo(80, 4);
    expect(r.nodeResults['p'].effectiveCapacity).toBeCloseTo(6.4, 4); // 1×8×0.8
    expect(r.nodeResults['p'].utilization).toBeCloseTo(80 / 6.4, 4);
  });
});

// ─── calculateFlowDAG — Fork-join ────────────────────────────────────────────

describe('calculateFlowDAG — fork-join: 3-input assembly then testing with scrap', () => {
  // srcA→pA ──► assembly(BOM:{eA:4,eB:1,eC:1}) ──► testing(yield=95%) ──► snk
  // srcB→pB ──┘                                    + scrap edge to dead-end
  // srcC→pC ──┘
  // demand=95
  const model: SerializedModel = {
    nodes: [
      makeSource('srcA'), makeProcess('pA'),
      makeSource('srcB'), makeProcess('pB'),
      makeSource('srcC'), makeProcess('pC'),
      makeProcess('assembly', { bomRatios: { eA: 4, eB: 1, eC: 1 } }),
      makeProcess('testing', { yield: 95 }),
      makeSink('snk'),
      makeSource('scrap_out'),
    ],
    edges: [
      { id: 'sA-pA', source: 'srcA', target: 'pA' },
      { id: 'eA', source: 'pA', target: 'assembly' },
      { id: 'sB-pB', source: 'srcB', target: 'pB' },
      { id: 'eB', source: 'pB', target: 'assembly' },
      { id: 'sC-pC', source: 'srcC', target: 'pC' },
      { id: 'eC', source: 'pC', target: 'assembly' },
      { id: 'asm-test', source: 'assembly', target: 'testing' },
      { id: 'test-snk', source: 'testing', target: 'snk' },
      { id: 'test-scrap', source: 'testing', target: 'scrap_out', data: { isScrap: true } },
    ],
    globalDemand: 95,
  };

  it('testing.rt=95, assembly.rt=100 (95/0.95), pA.rt=400, pB.rt=100, pC.rt=100', () => {
    const r = calculateFlowDAG(model);
    expect(r.nodeResults['testing'].requiredThroughput).toBeCloseTo(95, 4);
    expect(r.nodeResults['assembly'].requiredThroughput).toBeCloseTo(100, 4); // 95 / 0.95
    expect(r.nodeResults['pA'].requiredThroughput).toBeCloseTo(400, 4); // 100 × 4
    expect(r.nodeResults['pB'].requiredThroughput).toBeCloseTo(100, 4); // 100 × 1
    expect(r.nodeResults['pC'].requiredThroughput).toBeCloseTo(100, 4); // 100 × 1
  });
});

describe('calculateFlowDAG — fork-join: merge→process→split→merge→sink', () => {
  // srcA→pA ──► merge1(BOM:{eA:1,eB:1}) ──► pMid ──► split(70%/30%) ──► pX ──► merge2(BOM:{eX:0.7,eY:0.3}) ──► snk
  // srcB→pB ──┘                                                          pY ──┘
  // demand=100
  const model: SerializedModel = {
    nodes: [
      makeSource('srcA'), makeProcess('pA'),
      makeSource('srcB'), makeProcess('pB'),
      makeProcess('merge1', { bomRatios: { 'e-pA-m1': 1, 'e-pB-m1': 1 } }),
      makeProcess('pMid'),
      makeProcess('split'),
      makeProcess('pX'),
      makeProcess('pY'),
      makeProcess('merge2', { bomRatios: { 'e-pX-m2': 0.7, 'e-pY-m2': 0.3 } }),
      makeSink('snk'),
    ],
    edges: [
      { id: 'sA-pA', source: 'srcA', target: 'pA' },
      { id: 'e-pA-m1', source: 'pA', target: 'merge1' },
      { id: 'sB-pB', source: 'srcB', target: 'pB' },
      { id: 'e-pB-m1', source: 'pB', target: 'merge1' },
      { id: 'm1-pMid', source: 'merge1', target: 'pMid' },
      { id: 'pMid-split', source: 'pMid', target: 'split' },
      { id: 'split-pX', source: 'split', target: 'pX', data: { splitRatio: 70 } },
      { id: 'split-pY', source: 'split', target: 'pY', data: { splitRatio: 30 } },
      { id: 'e-pX-m2', source: 'pX', target: 'merge2' },
      { id: 'e-pY-m2', source: 'pY', target: 'merge2' },
      { id: 'm2-snk', source: 'merge2', target: 'snk' },
    ],
    globalDemand: 100,
  };

  it('demand propagates correctly through all merge and split nodes', () => {
    const r = calculateFlowDAG(model);
    // merge2: rt=100; BOM 0.7/0.3 → pX.rt=70, pY.rt=30
    expect(r.nodeResults['merge2'].requiredThroughput).toBeCloseTo(100, 4);
    expect(r.nodeResults['pX'].requiredThroughput).toBeCloseTo(70, 4);
    expect(r.nodeResults['pY'].requiredThroughput).toBeCloseTo(30, 4);
    // split: max(70/0.7, 30/0.3) = max(100,100) = 100
    expect(r.nodeResults['split'].requiredThroughput).toBeCloseTo(100, 4);
    // pMid: 100; merge1: 100; BOM 1:1 → pA=100, pB=100
    expect(r.nodeResults['pMid'].requiredThroughput).toBeCloseTo(100, 4);
    expect(r.nodeResults['merge1'].requiredThroughput).toBeCloseTo(100, 4);
    expect(r.nodeResults['pA'].requiredThroughput).toBeCloseTo(100, 4);
    expect(r.nodeResults['pB'].requiredThroughput).toBeCloseTo(100, 4);
  });
});

// ─── calculateFlowDAG — Bottleneck detection ─────────────────────────────────

describe('calculateFlowDAG — bottleneck in a merge branch', () => {
  // srcA→pA(EC=4)→merge, srcB→pB(EC=100)→merge, merge→snk, demand=10
  // pA.util = 10/4 = 2.5 (bottleneck); pB.util = 10/100 = 0.1; merge.util = 10/8 = 1.25
  const model: SerializedModel = {
    nodes: [
      makeSource('srcA'),
      makeProcess('pA', { throughputRate: 0.5, availableTime: 8 }), // EC = 0.5×8 = 4
      makeSource('srcB'),
      makeProcess('pB', { throughputRate: 12.5, availableTime: 8 }), // EC = 12.5×8 = 100
      makeProcess('merge'),
      makeSink('snk'),
    ],
    edges: [
      { id: 'sA-pA', source: 'srcA', target: 'pA' },
      { id: 'pA-m', source: 'pA', target: 'merge' },
      { id: 'sB-pB', source: 'srcB', target: 'pB' },
      { id: 'pB-m', source: 'pB', target: 'merge' },
      { id: 'm-snk', source: 'merge', target: 'snk' },
    ],
    globalDemand: 10,
  };

  it('identifies pA as bottleneck with utilization=2.5', () => {
    const r = calculateFlowDAG(model);
    expect(r.bottleneckNodeId).toBe('pA');
    expect(r.nodeResults['pA'].utilization).toBeCloseTo(2.5, 4);
  });
});

describe('calculateFlowDAG — bottleneck is the split node itself', () => {
  // src → split(EC=4) → pA → merge(BOM:{eA:0.5,eB:0.5}) → snk
  //                  ↘ pB ──────────────────────────────↗
  // split.util = 10/4 = 2.5 (bottleneck); pA.util = 5/8 ≈ 0.625; merge.util = 10/8 = 1.25
  const model: SerializedModel = {
    nodes: [
      makeSource('src'),
      makeProcess('split', { throughputRate: 0.5, availableTime: 8 }), // EC = 4
      makeProcess('pA'),
      makeProcess('pB'),
      makeProcess('merge', { bomRatios: { 'pA-merge': 0.5, 'pB-merge': 0.5 } }),
      makeSink('snk'),
    ],
    edges: [
      { id: 'src-split', source: 'src', target: 'split' },
      { id: 'split-pA', source: 'split', target: 'pA', data: { splitRatio: 50 } },
      { id: 'split-pB', source: 'split', target: 'pB', data: { splitRatio: 50 } },
      { id: 'pA-merge', source: 'pA', target: 'merge' },   // BOM key 'pA-merge' matches this edge
      { id: 'pB-merge', source: 'pB', target: 'merge' },   // BOM key 'pB-merge' matches this edge
      { id: 'merge-snk', source: 'merge', target: 'snk' },
    ],
    globalDemand: 10,
  };

  it('identifies split as bottleneck with utilization=2.5', () => {
    const r = calculateFlowDAG(model);
    expect(r.bottleneckNodeId).toBe('split');
    expect(r.nodeResults['split'].utilization).toBeCloseTo(2.5, 4);
  });
});

// ─── calculateFlowDAG — split outputs converging directly at Sink ─────────────

describe('calculateFlowDAG — split outputs converging directly at Sink (95%/5%, demand=50)', () => {
  // src → split(95%→p2, 5%→p3) → p2 → snk
  //                             → p3 ↗
  // P2 handles 47.5, P3 handles 2.5; sum = 50
  const model: SerializedModel = {
    nodes: [
      makeSource('src'),
      makeProcess('split'),
      makeProcess('p2'),
      makeProcess('p3'),
      makeSink('snk'),
    ],
    edges: [
      { id: 'src-split', source: 'src', target: 'split' },
      { id: 'split-p2', source: 'split', target: 'p2', data: { splitRatio: 95 } },
      { id: 'split-p3', source: 'split', target: 'p3', data: { splitRatio: 5 } },
      { id: 'p2-snk', source: 'p2', target: 'snk' },
      { id: 'p3-snk', source: 'p3', target: 'snk' },
    ],
    globalDemand: 50,
  };

  it('split.rt=50, p2.rt=47.5, p3.rt=2.5', () => {
    const r = calculateFlowDAG(model);
    expect(r.nodeResults['split'].requiredThroughput).toBeCloseTo(50, 4);
    expect(r.nodeResults['p2'].requiredThroughput).toBeCloseTo(47.5, 4);
    expect(r.nodeResults['p3'].requiredThroughput).toBeCloseTo(2.5, 4);
  });

  it('systemThroughput=50 when all nodes have sufficient capacity', () => {
    // Use high-capacity nodes (EC=800) so demand is not constrained
    const highCapModel: SerializedModel = {
      nodes: [
        makeSource('src'),
        makeProcess('split', { throughputRate: 100, availableTime: 8 }),
        makeProcess('p2', { throughputRate: 100, availableTime: 8 }),
        makeProcess('p3', { throughputRate: 100, availableTime: 8 }),
        makeSink('snk'),
      ],
      edges: [
        { id: 'src-split', source: 'src', target: 'split' },
        { id: 'split-p2', source: 'split', target: 'p2', data: { splitRatio: 95 } },
        { id: 'split-p3', source: 'split', target: 'p3', data: { splitRatio: 5 } },
        { id: 'p2-snk', source: 'p2', target: 'snk' },
        { id: 'p3-snk', source: 'p3', target: 'snk' },
      ],
      globalDemand: 50,
    };
    const r = calculateFlowDAG(highCapModel);
    expect(r.systemThroughput).toBeCloseTo(50, 4);
  });
});

describe('calculateFlowDAG — split outputs converging directly at Sink (80%/20%, demand=100)', () => {
  // src → split(80%→pA, 20%→pB) → pA → snk
  //                              → pB ↗
  const model: SerializedModel = {
    nodes: [
      makeSource('src'),
      makeProcess('split'),
      makeProcess('pA'),
      makeProcess('pB'),
      makeSink('snk'),
    ],
    edges: [
      { id: 'src-split', source: 'src', target: 'split' },
      { id: 'split-pA', source: 'split', target: 'pA', data: { splitRatio: 80 } },
      { id: 'split-pB', source: 'split', target: 'pB', data: { splitRatio: 20 } },
      { id: 'pA-snk', source: 'pA', target: 'snk' },
      { id: 'pB-snk', source: 'pB', target: 'snk' },
    ],
    globalDemand: 100,
  };

  it('split.rt=100, pA.rt=80, pB.rt=20', () => {
    const r = calculateFlowDAG(model);
    expect(r.nodeResults['split'].requiredThroughput).toBeCloseTo(100, 4);
    expect(r.nodeResults['pA'].requiredThroughput).toBeCloseTo(80, 4);
    expect(r.nodeResults['pB'].requiredThroughput).toBeCloseTo(20, 4);
  });
});

describe('calculateFlowDAG — all nodes at equal utilization', () => {
  it('bottleneckNodeId is the process node id (not null)', () => {
    // EC = demand = 10 → utilization = 1.0 for all nodes
    const model = makeModel(
      [
        makeSource('src'),
        makeProcess('p', { throughputRate: 1, availableTime: 10 }), // EC = 1×10 = 10
        makeSink('snk'),
      ],
      [['src', 'p'], ['p', 'snk']],
      10
    );
    const r = calculateFlowDAG(model);
    expect(r.nodeResults['p'].utilization).toBeCloseTo(1.0, 4);
    expect(r.bottleneckNodeId).toBe('p');
  });
});

// ─── Route Split ─────────────────────────────────────────────────────────────

describe('calculateFlowDAG — route split', () => {
  it('distributes demand at sink by routeSplitPercent (50/30/20)', () => {
    const model: SerializedModel = {
      nodes: [
        makeSource('srcA'), makeSource('srcB'), makeSource('srcC'),
        makeProcess('pA', { throughputRate: 100, availableTime: 10 }),
        makeProcess('pB', { throughputRate: 100, availableTime: 10 }),
        makeProcess('pC', { throughputRate: 100, availableTime: 10 }),
        makeSink('snk'),
      ],
      edges: [
        { id: 'e0', source: 'srcA', target: 'pA' },
        { id: 'e1', source: 'srcB', target: 'pB' },
        { id: 'e2', source: 'srcC', target: 'pC' },
        { id: 'e3', source: 'pA', target: 'snk', data: { routeSplitPercent: 50 } },
        { id: 'e4', source: 'pB', target: 'snk', data: { routeSplitPercent: 30 } },
        { id: 'e5', source: 'pC', target: 'snk', data: { routeSplitPercent: 20 } },
      ],
      globalDemand: 100000,
    };
    const r = calculateFlowDAG(model);
    expect(r.nodeResults['pA'].requiredThroughput).toBeCloseTo(50000, 1);
    expect(r.nodeResults['pB'].requiredThroughput).toBeCloseTo(30000, 1);
    expect(r.nodeResults['pC'].requiredThroughput).toBeCloseTo(20000, 1);
  });

  it('distributes demand at merge node by routeSplitPercent (60/40) with yield', () => {
    const model: SerializedModel = {
      nodes: [
        makeSource('srcA'), makeSource('srcB'),
        makeProcess('pA', { throughputRate: 100, availableTime: 10 }),
        makeProcess('pB', { throughputRate: 100, availableTime: 10 }),
        makeProcess('merge', { throughputRate: 100, availableTime: 10, yield: 90 }),
        makeSink('snk'),
      ],
      edges: [
        { id: 'e0', source: 'srcA', target: 'pA' },
        { id: 'e1', source: 'srcB', target: 'pB' },
        { id: 'e2', source: 'pA', target: 'merge', data: { routeSplitPercent: 60 } },
        { id: 'e3', source: 'pB', target: 'merge', data: { routeSplitPercent: 40 } },
        { id: 'e4', source: 'merge', target: 'snk' },
      ],
      globalDemand: 100,
    };
    const r = calculateFlowDAG(model);
    // merge RT = 100, grossInputDemand = 100/0.9 ≈ 111.11
    const grossInput = 100 / 0.9;
    expect(r.nodeResults['pA'].requiredThroughput).toBeCloseTo(grossInput * 0.6, 2);
    expect(r.nodeResults['pB'].requiredThroughput).toBeCloseTo(grossInput * 0.4, 2);
  });

  it('without routeSplitPercent, falls back to flow-share distribution at sink', () => {
    // Two parallel paths into sink, no routeSplitPercent → equal flow share
    const model: SerializedModel = {
      nodes: [
        makeSource('srcA'), makeSource('srcB'),
        makeProcess('pA', { throughputRate: 100, availableTime: 10 }),
        makeProcess('pB', { throughputRate: 100, availableTime: 10 }),
        makeSink('snk'),
      ],
      edges: [
        { id: 'e0', source: 'srcA', target: 'pA' },
        { id: 'e1', source: 'srcB', target: 'pB' },
        { id: 'e2', source: 'pA', target: 'snk' },
        { id: 'e3', source: 'pB', target: 'snk' },
      ],
      globalDemand: 100,
    };
    const r = calculateFlowDAG(model);
    // Both sources have flowShare=1.0, sink flowShare=2.0 → each gets 50%
    expect(r.nodeResults['pA'].requiredThroughput).toBeCloseTo(50, 1);
    expect(r.nodeResults['pB'].requiredThroughput).toBeCloseTo(50, 1);
  });

  it('route split overrides flow-share at sink', () => {
    // Same topology as above but with 70/30 route split
    const model: SerializedModel = {
      nodes: [
        makeSource('srcA'), makeSource('srcB'),
        makeProcess('pA', { throughputRate: 100, availableTime: 10 }),
        makeProcess('pB', { throughputRate: 100, availableTime: 10 }),
        makeSink('snk'),
      ],
      edges: [
        { id: 'e0', source: 'srcA', target: 'pA' },
        { id: 'e1', source: 'srcB', target: 'pB' },
        { id: 'e2', source: 'pA', target: 'snk', data: { routeSplitPercent: 70 } },
        { id: 'e3', source: 'pB', target: 'snk', data: { routeSplitPercent: 30 } },
      ],
      globalDemand: 100,
    };
    const r = calculateFlowDAG(model);
    expect(r.nodeResults['pA'].requiredThroughput).toBeCloseTo(70, 1);
    expect(r.nodeResults['pB'].requiredThroughput).toBeCloseTo(30, 1);
  });

  it('zero demand with route split gives zero to all routes', () => {
    const model: SerializedModel = {
      nodes: [
        makeSource('srcA'), makeSource('srcB'),
        makeProcess('pA', { throughputRate: 100, availableTime: 10 }),
        makeProcess('pB', { throughputRate: 100, availableTime: 10 }),
        makeSink('snk'),
      ],
      edges: [
        { id: 'e0', source: 'srcA', target: 'pA' },
        { id: 'e1', source: 'srcB', target: 'pB' },
        { id: 'e2', source: 'pA', target: 'snk', data: { routeSplitPercent: 60 } },
        { id: 'e3', source: 'pB', target: 'snk', data: { routeSplitPercent: 40 } },
      ],
      globalDemand: 0,
    };
    const r = calculateFlowDAG(model);
    expect(r.nodeResults['pA'].requiredThroughput).toBe(0);
    expect(r.nodeResults['pB'].requiredThroughput).toBe(0);
  });

  it('route split correctly identifies bottleneck on constrained route', () => {
    // pA has low capacity → high utilization on the 70% route
    const model: SerializedModel = {
      nodes: [
        makeSource('srcA'), makeSource('srcB'),
        makeProcess('pA', { throughputRate: 5, availableTime: 10 }), // EC=50
        makeProcess('pB', { throughputRate: 100, availableTime: 10 }), // EC=1000
        makeSink('snk'),
      ],
      edges: [
        { id: 'e0', source: 'srcA', target: 'pA' },
        { id: 'e1', source: 'srcB', target: 'pB' },
        { id: 'e2', source: 'pA', target: 'snk', data: { routeSplitPercent: 70 } },
        { id: 'e3', source: 'pB', target: 'snk', data: { routeSplitPercent: 30 } },
      ],
      globalDemand: 100,
    };
    const r = calculateFlowDAG(model);
    // pA.rt=70, pA.EC=50 → utilization=1.4 (bottleneck)
    // pB.rt=30, pB.EC=1000 → utilization=0.03
    expect(r.nodeResults['pA'].utilization).toBeCloseTo(1.4, 2);
    expect(r.bottleneckNodeId).toBe('pA');
    expect(r.systemThroughput).toBeLessThan(100);
  });

  it('mixed BOM + route split at merge node', () => {
    // Merge has 3 inputs: pA+pB via route split (60/40), pC via BOM ratio (2)
    // grossInputDemand = 100 (merge yield=100%)
    // pC gets grossInput * bomRatio(2) = 200
    // pA+pB group uses bomRatio from first edge (1): groupDemand = 100
    // pA gets 100 * 0.6 = 60, pB gets 100 * 0.4 = 40
    const model: SerializedModel = {
      nodes: [
        makeSource('srcA'), makeSource('srcB'), makeSource('srcC'),
        makeProcess('pA', { throughputRate: 100, availableTime: 10 }),
        makeProcess('pB', { throughputRate: 100, availableTime: 10 }),
        makeProcess('pC', { throughputRate: 100, availableTime: 10 }),
        makeProcess('merge', {
          throughputRate: 100, availableTime: 10,
          bomRatios: { eA: 1, eB: 1, eC: 2 },
        }),
        makeSink('snk'),
      ],
      edges: [
        { id: 'e0', source: 'srcA', target: 'pA' },
        { id: 'e1', source: 'srcB', target: 'pB' },
        { id: 'e2', source: 'srcC', target: 'pC' },
        { id: 'eA', source: 'pA', target: 'merge', data: { routeSplitPercent: 60 } },
        { id: 'eB', source: 'pB', target: 'merge', data: { routeSplitPercent: 40 } },
        { id: 'eC', source: 'pC', target: 'merge' }, // BOM edge, no route split
        { id: 'e6', source: 'merge', target: 'snk' },
      ],
      globalDemand: 100,
    };
    const r = calculateFlowDAG(model);
    // pC: BOM ratio 2 → pC.rt = 100 * 2 = 200
    expect(r.nodeResults['pC'].requiredThroughput).toBeCloseTo(200, 1);
    // Route split group: BOM ratio from first edge (eA) = 1, groupDemand = 100
    // pA: 100 * 0.6 = 60, pB: 100 * 0.4 = 40
    expect(r.nodeResults['pA'].requiredThroughput).toBeCloseTo(60, 1);
    expect(r.nodeResults['pB'].requiredThroughput).toBeCloseTo(40, 1);
  });

  it('incomplete route split group falls back to BOM ratios', () => {
    // Only one edge has routeSplitPercent — group is incomplete, fall back to BOM
    const model: SerializedModel = {
      nodes: [
        makeSource('srcA'), makeSource('srcB'),
        makeProcess('pA', { throughputRate: 100, availableTime: 10 }),
        makeProcess('pB', { throughputRate: 100, availableTime: 10 }),
        makeProcess('merge', {
          throughputRate: 100, availableTime: 10,
          bomRatios: { eA: 3, eB: 1 },
        }),
        makeSink('snk'),
      ],
      edges: [
        { id: 'e0', source: 'srcA', target: 'pA' },
        { id: 'e1', source: 'srcB', target: 'pB' },
        { id: 'eA', source: 'pA', target: 'merge', data: { routeSplitPercent: 70 } },
        { id: 'eB', source: 'pB', target: 'merge' }, // no routeSplitPercent
        { id: 'e4', source: 'merge', target: 'snk' },
      ],
      globalDemand: 100,
    };
    const r = calculateFlowDAG(model);
    // Not all edges have routeSplitPercent → falls back to BOM ratios
    // pA.rt = 100 * 3 = 300, pB.rt = 100 * 1 = 100
    expect(r.nodeResults['pA'].requiredThroughput).toBeCloseTo(300, 1);
    expect(r.nodeResults['pB'].requiredThroughput).toBeCloseTo(100, 1);
  });
});
