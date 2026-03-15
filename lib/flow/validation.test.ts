import { describe, expect, it } from 'vitest';
import type { Edge, Node } from 'reactflow';
import type { EdgeData, ProcessNodeData } from '../../types/flow';
import { isProcessValueValid, isValidConnection, validateGraph } from './validation';

// ─── helpers ──────────────────────────────────────────────────────────────────

function makeNode(id: string, type: 'source' | 'process' | 'sink', name?: string): Node {
  const data =
    type === 'process'
      ? ({ name: name ?? id, throughputRate: 10, availableTime: 480, yield: 100, numberOfResources: 1, conversionRatio: 1 } as ProcessNodeData)
      : { label: name ?? id };
  return { id, type, position: { x: 0, y: 0 }, data };
}

function makeEdge(id: string, source: string, target: string, isScrap?: boolean): Edge<EdgeData> {
  return { id, source, target, data: isScrap ? { isScrap: true } : undefined };
}

// ─── isProcessValueValid ──────────────────────────────────────────────────────

describe('isProcessValueValid', () => {
  it('accepts valid process values', () => {
    expect(isProcessValueValid('throughputRate', 1)).toBe(true);
    expect(isProcessValueValid('availableTime', 0)).toBe(true);
    expect(isProcessValueValid('yield', 100)).toBe(true);
    expect(isProcessValueValid('numberOfResources', 1)).toBe(true);
    expect(isProcessValueValid('conversionRatio', 0.5)).toBe(true);
  });

  it('rejects invalid process values', () => {
    expect(isProcessValueValid('throughputRate', 0)).toBe(false);
    expect(isProcessValueValid('availableTime', -1)).toBe(false);
    expect(isProcessValueValid('yield', 0)).toBe(false);
    expect(isProcessValueValid('yield', 150)).toBe(false);
    expect(isProcessValueValid('numberOfResources', 0)).toBe(false);
    expect(isProcessValueValid('conversionRatio', 0)).toBe(false);
  });
});

// ─── isValidConnection — DAG rules ───────────────────────────────────────────

describe('isValidConnection — DAG rules', () => {
  const src = makeNode('src', 'source');
  const p1 = makeNode('p1', 'process');
  const p2 = makeNode('p2', 'process');
  const snk = makeNode('snk', 'sink');
  const nodes = [src, p1, p2, snk];

  it('allows branching (source with existing outgoing edge)', () => {
    const existing: Edge<EdgeData>[] = [makeEdge('e1', 'src', 'p1')];
    // src → p2 should now be allowed (branching ok)
    expect(isValidConnection({ source: 'src', target: 'p2', sourceHandle: null, targetHandle: null }, nodes, existing)).toBe(true);
  });

  it('allows merging (target with existing incoming edge)', () => {
    const existing: Edge<EdgeData>[] = [makeEdge('e1', 'src', 'p1')];
    // p2 → p1 should be allowed if no cycle (p2 has no path to p2 via p1 yet)
    expect(isValidConnection({ source: 'p2', target: 'p1', sourceHandle: null, targetHandle: null }, nodes, existing)).toBe(true);
  });

  it('rejects self-loop', () => {
    expect(isValidConnection({ source: 'p1', target: 'p1', sourceHandle: null, targetHandle: null }, nodes, [])).toBe(false);
  });

  it('rejects cycle via real edges', () => {
    // p1 → p2 already exists; trying p2 → p1 would create a cycle
    const existing: Edge<EdgeData>[] = [makeEdge('e1', 'p1', 'p2')];
    expect(isValidConnection({ source: 'p2', target: 'p1', sourceHandle: null, targetHandle: null }, nodes, existing)).toBe(false);
  });

  it('scrap edges are excluded from cycle check', () => {
    // scrap edge p2 → scrapDead; adding src → p2 should not be blocked by scrap
    const scrapDead = makeNode('sd', 'process');
    const allNodes = [...nodes, scrapDead];
    const existing: Edge<EdgeData>[] = [makeEdge('es', 'p2', 'sd', true)];
    // src → p2 is fine even though p2 has a scrap outgoing
    expect(isValidConnection({ source: 'src', target: 'p2', sourceHandle: null, targetHandle: null }, allNodes, existing)).toBe(true);
  });

  it('rejects duplicate edge between same pair', () => {
    const existing: Edge<EdgeData>[] = [makeEdge('e1', 'src', 'p1')];
    expect(isValidConnection({ source: 'src', target: 'p1', sourceHandle: null, targetHandle: null }, nodes, existing)).toBe(false);
  });

  it('rejects connection into Source', () => {
    expect(isValidConnection({ source: 'p1', target: 'src', sourceHandle: null, targetHandle: null }, nodes, [])).toBe(false);
  });

  it('rejects connection out of Sink', () => {
    expect(isValidConnection({ source: 'snk', target: 'p1', sourceHandle: null, targetHandle: null }, nodes, [])).toBe(false);
  });
});

// ─── validateGraph — valid graphs ────────────────────────────────────────────

describe('validateGraph — valid graphs', () => {
  it('linear Source → Process → Sink passes', () => {
    const nodes = [makeNode('s', 'source'), makeNode('p', 'process'), makeNode('k', 'sink')];
    const edges = [makeEdge('e1', 's', 'p'), makeEdge('e2', 'p', 'k')];
    const result = validateGraph(nodes, edges);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.categories).toHaveLength(0);
  });

  it('merge: two sources → two processes → merge process → Sink with valid BOM passes', () => {
    const mergeData: ProcessNodeData = {
      name: 'Merge',
      throughputRate: 10, availableTime: 480, yield: 100, numberOfResources: 1, conversionRatio: 1,
      bomRatios: { 'e3': 2, 'e4': 1 },
    };
    const mergeNode: Node = { id: 'm', type: 'process', position: { x: 0, y: 0 }, data: mergeData };
    const nodes = [
      makeNode('s1', 'source'), makeNode('s2', 'source'),
      makeNode('p1', 'process'), makeNode('p2', 'process'),
      mergeNode,
      makeNode('k', 'sink'),
    ];
    const edges = [
      makeEdge('e1', 's1', 'p1'), makeEdge('e2', 's2', 'p2'),
      makeEdge('e3', 'p1', 'm'), makeEdge('e4', 'p2', 'm'),
      makeEdge('e5', 'm', 'k'),
    ];
    const result = validateGraph(nodes, edges);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('fork-join: multi-input process → multi-output process → Sink passes', () => {
    const forkJoinData: ProcessNodeData = {
      name: 'FJ',
      throughputRate: 10, availableTime: 480, yield: 100, numberOfResources: 1, conversionRatio: 1,
      bomRatios: { 'e2': 1, 'e3': 1 },
    };
    const fjNode: Node = { id: 'fj', type: 'process', position: { x: 0, y: 0 }, data: forkJoinData };
    const nodes = [
      makeNode('s1', 'source'), makeNode('s2', 'source'),
      fjNode,
      makeNode('p1', 'process'), makeNode('p2', 'process'),
      makeNode('k', 'sink'),
    ];
    const edges = [
      makeEdge('e2', 's1', 'fj'), makeEdge('e3', 's2', 'fj'),
      makeEdge('e4', 'fj', 'p1'), makeEdge('e5', 'fj', 'p2'),
      makeEdge('e6', 'p1', 'k'), makeEdge('e7', 'p2', 'k'),
    ];
    const result = validateGraph(nodes, edges);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('scrap edge to dead-end node (no outgoing real) passes', () => {
    const nodes = [
      makeNode('s', 'source'), makeNode('p', 'process'),
      makeNode('sd', 'process', 'ScrapBin'),
      makeNode('k', 'sink'),
    ];
    const edges = [
      makeEdge('e1', 's', 'p'),
      makeEdge('e2', 'p', 'k'),
      makeEdge('es', 'p', 'sd', true),
    ];
    const result = validateGraph(nodes, edges);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});

// ─── validateGraph — invalid graphs ──────────────────────────────────────────

describe('validateGraph — invalid graphs', () => {
  it('two sinks → invalid_sink_count', () => {
    const nodes = [makeNode('s', 'source'), makeNode('p', 'process'), makeNode('k1', 'sink'), makeNode('k2', 'sink')];
    const edges = [makeEdge('e1', 's', 'p'), makeEdge('e2', 'p', 'k1')];
    const result = validateGraph(nodes, edges);
    expect(result.isValid).toBe(false);
    expect(result.categories).toContain('invalid_sink_count');
  });

  it('cycle in real edges → cycle', () => {
    const nodes = [makeNode('s', 'source'), makeNode('p1', 'process'), makeNode('p2', 'process'), makeNode('k', 'sink')];
    const edges = [
      makeEdge('e1', 's', 'p1'),
      makeEdge('e2', 'p1', 'p2'),
      makeEdge('e3', 'p2', 'p1'), // cycle
      makeEdge('e4', 'p2', 'k'),
    ];
    const result = validateGraph(nodes, edges);
    expect(result.isValid).toBe(false);
    expect(result.categories).toContain('cycle');
  });

  it('orphaned process node → orphaned_node', () => {
    const nodes = [makeNode('s', 'source'), makeNode('p1', 'process'), makeNode('p2', 'process'), makeNode('k', 'sink')];
    const edges = [
      makeEdge('e1', 's', 'p1'),
      makeEdge('e2', 'p1', 'k'),
      // p2 is disconnected
    ];
    const result = validateGraph(nodes, edges);
    expect(result.isValid).toBe(false);
    expect(result.categories).toContain('orphaned_node');
  });

  it('merge node with missing bomRatios → missing_bom', () => {
    // mergeNode has no bomRatios set
    const mergeNode: Node = {
      id: 'm', type: 'process', position: { x: 0, y: 0 },
      data: { name: 'Merge', throughputRate: 10, availableTime: 480, yield: 100, numberOfResources: 1, conversionRatio: 1 },
    };
    const nodes = [makeNode('s1', 'source'), makeNode('s2', 'source'), mergeNode, makeNode('k', 'sink')];
    const edges = [
      makeEdge('e1', 's1', 'm'),
      makeEdge('e2', 's2', 'm'),
      makeEdge('e3', 'm', 'k'),
    ];
    const result = validateGraph(nodes, edges);
    expect(result.isValid).toBe(false);
    expect(result.categories).toContain('missing_bom');
  });

  it('merge node with BOM ratio of 0 → missing_bom', () => {
    const mergeData: ProcessNodeData = {
      name: 'Merge',
      throughputRate: 10, availableTime: 480, yield: 100, numberOfResources: 1, conversionRatio: 1,
      bomRatios: { 'e1': 2, 'e2': 0 }, // 0 is invalid
    };
    const mergeNode: Node = { id: 'm', type: 'process', position: { x: 0, y: 0 }, data: mergeData };
    const nodes = [makeNode('s1', 'source'), makeNode('s2', 'source'), mergeNode, makeNode('k', 'sink')];
    const edges = [
      makeEdge('e1', 's1', 'm'),
      makeEdge('e2', 's2', 'm'),
      makeEdge('e3', 'm', 'k'),
    ];
    const result = validateGraph(nodes, edges);
    expect(result.isValid).toBe(false);
    expect(result.categories).toContain('missing_bom');
  });

  it('scrap edge targeting the Sink → invalid_scrap_target', () => {
    const nodes = [makeNode('s', 'source'), makeNode('p', 'process'), makeNode('k', 'sink')];
    const edges = [
      makeEdge('e1', 's', 'p'),
      makeEdge('e2', 'p', 'k'),
      makeEdge('es', 'p', 'k', true), // scrap to sink
    ];
    const result = validateGraph(nodes, edges);
    expect(result.isValid).toBe(false);
    expect(result.categories).toContain('invalid_scrap_target');
  });

  it('scrap edge to node with further outgoing real edges → invalid_scrap_target', () => {
    const nodes = [
      makeNode('s', 'source'), makeNode('p1', 'process'),
      makeNode('p2', 'process'), makeNode('k', 'sink'),
    ];
    const edges = [
      makeEdge('e1', 's', 'p1'),
      makeEdge('e2', 'p1', 'k'),
      makeEdge('es', 'p1', 'p2', true), // scrap to p2
      makeEdge('e3', 'p2', 'k'),        // p2 has outgoing real edge
    ];
    const result = validateGraph(nodes, edges);
    expect(result.isValid).toBe(false);
    expect(result.categories).toContain('invalid_scrap_target');
  });
});
