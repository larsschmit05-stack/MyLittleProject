import { describe, expect, it } from 'vitest';
import type { Edge, Node } from 'reactflow';
import type { EdgeData, ProcessNodeData } from '../../types/flow';
import { validateGraph } from './validation';

// ─── helpers ──────────────────────────────────────────────────────────────────

function makeNode(
  id: string,
  type: 'source' | 'process' | 'sink',
  name?: string,
  outputMaterial?: string,
  reworkLoops?: any[],
  yield_pct?: number
): Node {
  const data =
    type === 'process'
      ? ({
          name: name ?? id,
          throughputRate: 10,
          availableTime: 480,
          yield: yield_pct ?? 100,
          numberOfResources: 1,
          conversionRatio: 1,
          outputMaterial: outputMaterial ?? 'Material',
          reworkLoops,
        } as ProcessNodeData)
      : { label: name ?? id };
  return { id, type, position: { x: 0, y: 0 }, data };
}

function makeEdge(id: string, source: string, target: string, isScrap?: boolean): Edge<EdgeData> {
  return { id, source, target, data: isScrap ? { isScrap: true } : undefined };
}

// ─── Rework Loop Validation Tests ────────────────────────────────────────────

describe('validateGraph — rework loops', () => {
  it('valid rework: Assembly (95% yield) → Cutting (upstream) passes', () => {
    const nodes = [
      makeNode('src', 'source'),
      makeNode('cutting', 'process', 'Cutting', 'Material', undefined, 100),
      makeNode('assembly', 'process', 'Assembly', 'assembled', [
        { targetNodeId: 'cutting', percentage: 5 },
      ], 95),
      makeNode('qc', 'process', 'QC', 'Material', undefined, 100),
      makeNode('sink', 'sink'),
    ];
    const edges = [
      makeEdge('e1', 'src', 'cutting'),
      makeEdge('e2', 'cutting', 'assembly'),
      makeEdge('e3', 'assembly', 'qc'),
      makeEdge('e4', 'qc', 'sink'),
    ];
    const result = validateGraph(nodes, edges);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('rework with yield accounting: Assembly (95% yield) + 5% rework ≤ 100% passes', () => {
    const nodes = [
      makeNode('src', 'source'),
      makeNode('wash', 'process', 'Wash', 'Material', undefined, 100),
      makeNode('assembly', 'process', 'Assembly', 'assembled', [
        { targetNodeId: 'wash', percentage: 5 },
      ], 95),
      makeNode('sink', 'sink'),
    ];
    const edges = [
      makeEdge('e1', 'src', 'wash'),
      makeEdge('e2', 'wash', 'assembly'),
      makeEdge('e3', 'assembly', 'sink'),
    ];
    const result = validateGraph(nodes, edges);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('rework with multiple loops from one node passes', () => {
    const nodes = [
      makeNode('src', 'source'),
      makeNode('wash', 'process', 'Wash', 'Material', undefined, 100),
      makeNode('dry', 'process', 'Dry', 'Material', undefined, 100),
      makeNode('assembly', 'process', 'Assembly', 'assembled', [
        { targetNodeId: 'wash', percentage: 3 },
        { targetNodeId: 'dry', percentage: 2 },
      ], 95),
      makeNode('sink', 'sink'),
    ];
    const edges = [
      makeEdge('e1', 'src', 'wash'),
      makeEdge('e2', 'wash', 'dry'),
      makeEdge('e3', 'dry', 'assembly'),
      makeEdge('e4', 'assembly', 'sink'),
    ];
    const result = validateGraph(nodes, edges);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('rework targeting non-existent node → invalid_rework_target', () => {
    const nodes = [
      makeNode('src', 'source'),
      makeNode('assembly', 'process', 'Assembly', 'assembled', [
        { targetNodeId: 'nonexistent', percentage: 5 },
      ]),
      makeNode('sink', 'sink'),
    ];
    const edges = [makeEdge('e1', 'src', 'assembly'), makeEdge('e2', 'assembly', 'sink')];
    const result = validateGraph(nodes, edges);
    expect(result.isValid).toBe(false);
    expect(result.categories).toContain('invalid_rework_target');
    expect(result.errors[0]).toContain('targets a non-existent node');
  });

  it('rework targeting self → invalid_rework_target', () => {
    const nodes = [
      makeNode('src', 'source'),
      makeNode('assembly', 'process', 'Assembly', 'assembled', [
        { targetNodeId: 'assembly', percentage: 5 },
      ]),
      makeNode('sink', 'sink'),
    ];
    const edges = [makeEdge('e1', 'src', 'assembly'), makeEdge('e2', 'assembly', 'sink')];
    const result = validateGraph(nodes, edges);
    expect(result.isValid).toBe(false);
    expect(result.categories).toContain('invalid_rework_target');
    expect(result.errors[0]).toContain('cannot target itself');
  });

  it('rework targeting Sink → invalid_rework_target', () => {
    const nodes = [
      makeNode('src', 'source'),
      makeNode('assembly', 'process', 'Assembly', 'assembled', [
        { targetNodeId: 'sink', percentage: 5 },
      ]),
      makeNode('sink', 'sink'),
    ];
    const edges = [makeEdge('e1', 'src', 'assembly'), makeEdge('e2', 'assembly', 'sink')];
    const result = validateGraph(nodes, edges);
    expect(result.isValid).toBe(false);
    expect(result.categories).toContain('invalid_rework_target');
    expect(result.errors[0]).toContain('cannot target the Sink');
  });

  it('rework targeting Source (process node) passes', () => {
    // Note: Source is not a process node, so this should fail
    const nodes = [
      makeNode('src', 'source'),
      makeNode('assembly', 'process', 'Assembly', 'assembled', [
        { targetNodeId: 'src', percentage: 5 },
      ]),
      makeNode('sink', 'sink'),
    ];
    const edges = [makeEdge('e1', 'src', 'assembly'), makeEdge('e2', 'assembly', 'sink')];
    const result = validateGraph(nodes, edges);
    // Source is not a process node, so this should fail
    expect(result.isValid).toBe(false);
    expect(result.categories).toContain('invalid_rework_target');
    expect(result.errors[0]).toContain('must target a Process node');
  });

  it('rework to non-process node (Source) → invalid_rework_target', () => {
    const sourceNode = makeNode('src', 'source', 'Source', undefined);
    const nodes = [
      sourceNode,
      makeNode('assembly', 'process', 'Assembly', 'assembled', [
        { targetNodeId: 'src', percentage: 5 },
      ]),
      makeNode('sink', 'sink'),
    ];
    const edges = [makeEdge('e1', 'src', 'assembly'), makeEdge('e2', 'assembly', 'sink')];
    const result = validateGraph(nodes, edges);
    expect(result.isValid).toBe(false);
    expect(result.categories).toContain('invalid_rework_target');
    expect(result.errors[0]).toContain('must target a Process node');
  });

  it('rework targeting downstream node (not upstream ancestor) → invalid_rework_target', () => {
    const nodes = [
      makeNode('src', 'source'),
      makeNode('assembly', 'process', 'Assembly', 'assembled', [
        { targetNodeId: 'qc', percentage: 5 },
      ]),
      makeNode('qc', 'process', 'QC'),
      makeNode('sink', 'sink'),
    ];
    const edges = [
      makeEdge('e1', 'src', 'assembly'),
      makeEdge('e2', 'assembly', 'qc'),
      makeEdge('e3', 'qc', 'sink'),
    ];
    const result = validateGraph(nodes, edges);
    expect(result.isValid).toBe(false);
    expect(result.categories).toContain('invalid_rework_target');
    expect(result.errors[0]).toContain('not an upstream ancestor');
  });

  it('rework percentage out of range (0%) → invalid_rework_percentage', () => {
    const nodes = [
      makeNode('src', 'source'),
      makeNode('assembly', 'process', 'Assembly', 'assembled', [
        { targetNodeId: 'src', percentage: 0 },
      ]),
      makeNode('sink', 'sink'),
    ];
    const edges = [makeEdge('e1', 'src', 'assembly'), makeEdge('e2', 'assembly', 'sink')];
    const result = validateGraph(nodes, edges);
    expect(result.isValid).toBe(false);
    expect(result.categories).toContain('invalid_rework_percentage');
    expect(result.errors[0]).toContain('invalid percentage');
  });

  it('rework percentage out of range (>100%) → invalid_rework_percentage', () => {
    const nodes = [
      makeNode('src', 'source'),
      makeNode('assembly', 'process', 'Assembly', 'assembled', [
        { targetNodeId: 'src', percentage: 101 },
      ]),
      makeNode('sink', 'sink'),
    ];
    const edges = [makeEdge('e1', 'src', 'assembly'), makeEdge('e2', 'assembly', 'sink')];
    const result = validateGraph(nodes, edges);
    expect(result.isValid).toBe(false);
    expect(result.categories).toContain('invalid_rework_percentage');
    expect(result.errors[0]).toContain('invalid percentage');
  });

  it('yield + rework percentages exceed 100% → invalid_rework_percentage', () => {
    const assemblyData: ProcessNodeData = {
      name: 'Assembly',
      throughputRate: 10,
      availableTime: 480,
      yield: 96, // 96% good output
      numberOfResources: 1,
      conversionRatio: 1,
      outputMaterial: 'assembled',
      reworkLoops: [
        { targetNodeId: 'cutting', percentage: 5 }, // 5% rework
      ],
      // 96 + 5 = 101 > 100, should fail
    };
    const nodes = [
      makeNode('src', 'source'),
      makeNode('cutting', 'process', 'Cutting'),
      { id: 'assembly', type: 'process', position: { x: 0, y: 0 }, data: assemblyData } as Node,
      makeNode('sink', 'sink'),
    ];
    const edges = [
      makeEdge('e1', 'src', 'cutting'),
      makeEdge('e2', 'cutting', 'assembly'),
      makeEdge('e3', 'assembly', 'sink'),
    ];
    const result = validateGraph(nodes, edges);
    expect(result.isValid).toBe(false);
    expect(result.categories).toContain('invalid_rework_percentage');
    expect(result.errors[0]).toContain('exceeds 100%');
  });

  it('cascading rework: A→B, B→A (chain) passes', () => {
    const nodes = [
      makeNode('src', 'source'),
      makeNode('cutting', 'process', 'Cutting', 'Material', undefined, 100),
      makeNode('assembly', 'process', 'Assembly', 'assembled', [
        { targetNodeId: 'cutting', percentage: 5 },
      ], 95),
      makeNode('qc', 'process', 'QC', 'final', [
        { targetNodeId: 'assembly', percentage: 3 },
      ], 97),
      makeNode('sink', 'sink'),
    ];
    const edges = [
      makeEdge('e1', 'src', 'cutting'),
      makeEdge('e2', 'cutting', 'assembly'),
      makeEdge('e3', 'assembly', 'qc'),
      makeEdge('e4', 'qc', 'sink'),
    ];
    const result = validateGraph(nodes, edges);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});
