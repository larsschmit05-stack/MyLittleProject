import { describe, it, expect } from 'vitest';
import { toHours, yieldToFraction, calculateFlow } from './calculations';
import type { SerializedModel, SerializedNode } from '../types/flow';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeSource(id: string): SerializedNode {
  return { id, type: 'source', position: { x: 0, y: 0 }, data: { label: 'Source' } };
}

function makeSink(id: string): SerializedNode {
  return { id, type: 'sink', position: { x: 0, y: 0 }, data: { label: 'Sink' } };
}

function makeProcess(id: string, overrides: Partial<{
  name: string;
  cycleTime: number;
  availableTime: number;
  yield: number;
  numberOfResources: number;
  conversionRatio: number;
}> = {}): SerializedNode {
  return {
    id,
    type: 'process',
    position: { x: 0, y: 0 },
    data: {
      name: overrides.name ?? 'Process',
      cycleTime: overrides.cycleTime ?? 60,       // 1 hour
      availableTime: overrides.availableTime ?? 480, // 8 hours
      yield: overrides.yield ?? 100,
      numberOfResources: overrides.numberOfResources ?? 1,
      conversionRatio: overrides.conversionRatio ?? 1,
    },
  };
}

function makeModel(
  nodes: SerializedNode[],
  edgePairs: [string, string][],
  globalDemand = 10
): SerializedModel {
  return {
    nodes,
    edges: edgePairs.map(([source, target], i) => ({ id: `e${i}`, source, target })),
    globalDemand,
  };
}

// ─── Unit tests ───────────────────────────────────────────────────────────────

describe('toHours', () => {
  it('converts 60 minutes to 1 hour', () => {
    expect(toHours(60)).toBe(1);
  });
  it('converts 120 minutes to 2 hours', () => {
    expect(toHours(120)).toBe(2);
  });
  it('converts 30 minutes to 0.5 hours', () => {
    expect(toHours(30)).toBe(0.5);
  });
});

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
    // EC = (480min / 60min) × 1 × 0.8 = 6.4
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
        makeProcess('p_up', { cycleTime: 60, availableTime: 480, yield: 100, conversionRatio: 1 }),
        makeProcess('p_down', { cycleTime: 60, availableTime: 480, yield: 100, conversionRatio: 4 }),
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
        makeProcess('p1', { cycleTime: 60, availableTime: 600, yield: 100, numberOfResources: 1, conversionRatio: 1 }), // EC = 10
        makeProcess('p2', { cycleTime: 60, availableTime: 600, yield: 80, numberOfResources: 1, conversionRatio: 2 }), // EC = 8
        makeProcess('p3', { cycleTime: 60, availableTime: 900, yield: 90, numberOfResources: 1, conversionRatio: 3 }), // EC = 13.5
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
  it('(480min / 60min) × 2 resources × 1.0 yield = 16', () => {
    const model = makeModel(
      [makeSource('src'), makeProcess('p', { availableTime: 480, cycleTime: 60, numberOfResources: 2, yield: 100 }), makeSink('snk')],
      [['src', 'p'], ['p', 'snk']],
      10
    );
    const result = calculateFlow(model);
    expect(result.nodeResults['p'].effectiveCapacity).toBeCloseTo(16);
  });
});

describe('calculateFlow — bottleneck detection', () => {
  // P1: EC=8, requiredThroughput=10 → utilization=1.25 (bottleneck)
  // P2: EC=16, requiredThroughput=10 → utilization=0.625
  it('identifies node with highest utilization as bottleneck', () => {
    const model = makeModel(
      [
        makeSource('src'),
        makeProcess('p1', { cycleTime: 60, availableTime: 480, numberOfResources: 1, yield: 100, conversionRatio: 1 }), // EC=8
        makeProcess('p2', { cycleTime: 60, availableTime: 480, numberOfResources: 2, yield: 100, conversionRatio: 1 }), // EC=16
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
  it('cycleTime=0 → effectiveCapacity=0', () => {
    const model = makeModel(
      [makeSource('src'), makeProcess('p', { cycleTime: 0 }), makeSink('snk')],
      [['src', 'p'], ['p', 'snk']],
      10
    );
    const result = calculateFlow(model);
    expect(result.nodeResults['p'].effectiveCapacity).toBe(0);
  });

  it('EC=0 with positive demand → utilization=Infinity', () => {
    const model = makeModel(
      [makeSource('src'), makeProcess('p', { cycleTime: 0 }), makeSink('snk')],
      [['src', 'p'], ['p', 'snk']],
      10
    );
    const result = calculateFlow(model);
    expect(result.nodeResults['p'].utilization).toBe(Infinity);
  });

  it('EC=0 with zero demand → utilization=0', () => {
    const model = makeModel(
      [makeSource('src'), makeProcess('p', { cycleTime: 0 }), makeSink('snk')],
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

  it('source-sink only (no process nodes) returns globalDemand as systemThroughput', () => {
    const model = makeModel(
      [makeSource('src'), makeSink('snk')],
      [['src', 'snk']],
      5
    );
    const result = calculateFlow(model);
    expect(result.systemThroughput).toBe(5);
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
