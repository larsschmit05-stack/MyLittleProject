import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import MetricsPanel from '../MetricsPanel';
import type { FlowNode, FlowResult } from '../../../types/flow';
import type { ValidationResult } from '../../../lib/flow/validation';
import type { SelectedElement } from '../../../types/flow';

// Helper to build a process node
function processNode(id: string, name: string): FlowNode {
  return {
    id,
    type: 'process',
    position: { x: 0, y: 0 },
    data: {
      name,
      throughputRate: 10,
      availableTime: 40,
      yield: 100,
      numberOfResources: 1,
      conversionRatio: 1,
    },
  };
}

function sourceNode(id: string, label: string): FlowNode {
  return {
    id,
    type: 'source',
    position: { x: 0, y: 0 },
    data: { label },
  };
}

function sinkNode(id: string, label: string): FlowNode {
  return {
    id,
    type: 'sink',
    position: { x: 0, y: 0 },
    data: { label },
  };
}

function makeResults(nodeUtils: Record<string, number>, systemThroughput = 42): FlowResult {
  const nodeResults: FlowResult['nodeResults'] = {};
  for (const [id, utilization] of Object.entries(nodeUtils)) {
    nodeResults[id] = {
      requiredThroughput: 50,
      effectiveCapacity: 42,
      utilization,
    };
  }
  // Pick highest utilization node as bottleneck
  const entries = Object.entries(nodeUtils);
  const bottleneckEntry = entries.reduce((max, e) => (e[1] > max[1] ? e : max), entries[0]);
  return {
    systemThroughput,
    bottleneckNodeId: bottleneckEntry?.[0] ?? null,
    nodeResults,
  };
}

const noValidation: ValidationResult = {
  isValid: true,
  errors: [],
  categories: [],
  errorDetails: [],
};

const invalidValidation: ValidationResult = {
  isValid: false,
  errors: ['Something is wrong'],
  categories: ['orphaned_node'],
  errorDetails: [{ message: 'Something is wrong', category: 'orphaned_node', nodeIds: [] }],
};

describe('MetricsPanel', () => {
  it('shows empty state when no nodes', () => {
    render(
      <MetricsPanel
        nodes={[]}
        derivedResults={null}
        validationResult={null}
        selectedElement={null}
      />
    );
    expect(screen.getByText('Run simulation to see metrics.')).toBeDefined();
  });

  it('shows empty state when nodes but null derivedResults', () => {
    render(
      <MetricsPanel
        nodes={[processNode('p1', 'Assembly')]}
        derivedResults={null}
        validationResult={null}
        selectedElement={null}
      />
    );
    expect(screen.getByText('Run simulation to see metrics.')).toBeDefined();
  });

  it('shows system throughput formatted', () => {
    const nodes = [processNode('p1', 'Assembly')];
    const results = makeResults({ p1: 0.5 }, 42);
    render(
      <MetricsPanel
        nodes={nodes}
        derivedResults={results}
        validationResult={noValidation}
        selectedElement={null}
      />
    );
    expect(screen.getByText('42.00')).toBeDefined();
  });

  it('shows single bottleneck name', () => {
    const nodes = [processNode('p1', 'Assembly'), processNode('p2', 'Cutting')];
    const results = makeResults({ p1: 1.0, p2: 0.5 }, 42);
    render(
      <MetricsPanel
        nodes={nodes}
        derivedResults={results}
        validationResult={noValidation}
        selectedElement={null}
      />
    );
    // "Assembly" appears both as bottleneck label and in the utilization table
    expect(screen.getAllByText('Assembly').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Bottleneck')).toBeDefined();
  });

  it('shows "System is balanced" for balanced status', () => {
    const nodes = [processNode('p1', 'Assembly'), processNode('p2', 'Cutting')];
    // Both at 50% — balanced
    const results = makeResults({ p1: 0.5, p2: 0.5 }, 42);
    render(
      <MetricsPanel
        nodes={nodes}
        derivedResults={results}
        validationResult={noValidation}
        selectedElement={null}
      />
    );
    expect(screen.getByText('System is balanced')).toBeDefined();
  });

  it('shows only the single worst bottleneck when multiple nodes exceed threshold', () => {
    const nodes = [processNode('p1', 'Assembly'), processNode('p2', 'QC')];
    // Both at 100% — only the first one (by store order) with highest util is shown
    const results = makeResults({ p1: 1.0, p2: 1.0 }, 42);
    render(
      <MetricsPanel
        nodes={nodes}
        derivedResults={results}
        validationResult={noValidation}
        selectedElement={null}
      />
    );
    // Should show a single bottleneck name, not "Multiple:"
    expect(screen.queryByText(/Multiple:/)).toBeNull();
    // The bottleneck row should show a single name (first in store order with highest util)
    const bottleneckRow = screen.getByText('Bottleneck').closest('div');
    expect(bottleneckRow?.textContent).toMatch(/Assembly|QC/);
  });

  it('shows elevated status message', () => {
    const nodes = [processNode('p1', 'Assembly'), processNode('p2', 'Cutting')];
    // One at 92%, other at 80% — elevated but no bottleneck
    const results = makeResults({ p1: 0.92, p2: 0.80 }, 42);
    render(
      <MetricsPanel
        nodes={nodes}
        derivedResults={results}
        validationResult={noValidation}
        selectedElement={null}
      />
    );
    expect(screen.getByText('No critical bottleneck (high utilization)')).toBeDefined();
  });

  it('renders utilization rows only for process nodes', () => {
    const nodes = [
      sourceNode('s1', 'Source'),
      processNode('p1', 'Assembly'),
      processNode('p2', 'Cutting'),
      sinkNode('sk1', 'Sink'),
    ];
    const results = makeResults({ p1: 0.5, p2: 0.7 }, 42);
    render(
      <MetricsPanel
        nodes={nodes}
        derivedResults={results}
        validationResult={noValidation}
        selectedElement={null}
      />
    );
    // Process nodes should appear
    expect(screen.getByText('Assembly')).toBeDefined();
    expect(screen.getByText('Cutting')).toBeDefined();
    // Source/sink should not appear in utilization table rows
    expect(screen.queryByTestId('utilization-row-s1')).toBeNull();
    expect(screen.queryByTestId('utilization-row-sk1')).toBeNull();
  });

  it('sorts utilization rows alphabetically by name', () => {
    const nodes = [
      processNode('p3', 'Zebra'),
      processNode('p1', 'Assembly'),
      processNode('p2', 'Cutting'),
    ];
    const results = makeResults({ p1: 0.5, p2: 0.7, p3: 0.3 }, 42);
    const { container } = render(
      <MetricsPanel
        nodes={nodes}
        derivedResults={results}
        validationResult={noValidation}
        selectedElement={null}
      />
    );
    const rows = container.querySelectorAll('[data-testid^="utilization-row-"]');
    const names = Array.from(rows).map((r) => r.textContent?.replace(/[\d.%]+$/, ''));
    expect(names[0]).toContain('Assembly');
    expect(names[1]).toContain('Cutting');
    expect(names[2]).toContain('Zebra');
  });

  // Metrics panel uses V1.8 PRD thresholds: green <80%, orange 80-95%, red >95%
  it('uses green color for 50% utilization (<80%)', () => {
    const nodes = [processNode('p1', 'Assembly')];
    const results = makeResults({ p1: 0.5 }, 42);
    const { container } = render(
      <MetricsPanel
        nodes={nodes}
        derivedResults={results}
        validationResult={noValidation}
        selectedElement={null}
      />
    );
    const dot = container.querySelector('[data-testid="status-dot-p1"]') as HTMLElement;
    expect(dot.style.background).toBe('var(--color-healthy)');
  });

  it('uses green color for 79% utilization (just below 80% threshold)', () => {
    const nodes = [processNode('p1', 'Assembly')];
    const results = makeResults({ p1: 0.79 }, 42);
    const { container } = render(
      <MetricsPanel
        nodes={nodes}
        derivedResults={results}
        validationResult={noValidation}
        selectedElement={null}
      />
    );
    const dot = container.querySelector('[data-testid="status-dot-p1"]') as HTMLElement;
    expect(dot.style.background).toBe('var(--color-healthy)');
  });

  it('uses orange color for exactly 80% utilization (>= 0.80 threshold)', () => {
    const nodes = [processNode('p1', 'Assembly')];
    const results = makeResults({ p1: 0.80 }, 42);
    const { container } = render(
      <MetricsPanel
        nodes={nodes}
        derivedResults={results}
        validationResult={noValidation}
        selectedElement={null}
      />
    );
    const dot = container.querySelector('[data-testid="status-dot-p1"]') as HTMLElement;
    expect(dot.style.background).toBe('var(--color-warning)');
  });

  it('uses orange color for 85% utilization (in 80-95% range)', () => {
    const nodes = [processNode('p1', 'Assembly')];
    const results = makeResults({ p1: 0.85 }, 42);
    const { container } = render(
      <MetricsPanel
        nodes={nodes}
        derivedResults={results}
        validationResult={noValidation}
        selectedElement={null}
      />
    );
    const dot = container.querySelector('[data-testid="status-dot-p1"]') as HTMLElement;
    expect(dot.style.background).toBe('var(--color-warning)');
  });

  it('uses orange (not red) for exactly 95% utilization', () => {
    const nodes = [processNode('p1', 'Assembly')];
    const results = makeResults({ p1: 0.95 }, 42);
    const { container } = render(
      <MetricsPanel
        nodes={nodes}
        derivedResults={results}
        validationResult={noValidation}
        selectedElement={null}
      />
    );
    const dot = container.querySelector('[data-testid="status-dot-p1"]') as HTMLElement;
    // Per PRD: >95% is red, so exactly 0.95 is still orange
    expect(dot.style.background).toBe('var(--color-warning)');
  });

  it('uses red color for 96% utilization (> 0.95 threshold)', () => {
    const nodes = [processNode('p1', 'Assembly')];
    const results = makeResults({ p1: 0.96 }, 42);
    const { container } = render(
      <MetricsPanel
        nodes={nodes}
        derivedResults={results}
        validationResult={noValidation}
        selectedElement={null}
      />
    );
    const dot = container.querySelector('[data-testid="status-dot-p1"]') as HTMLElement;
    expect(dot.style.background).toBe('var(--color-bottleneck)');
  });

  it('shows N/A with grey dot for process node missing from results', () => {
    const nodes = [processNode('p1', 'Assembly'), processNode('p2', 'Cutting')];
    // Only p1 has results; p2 is missing
    const results = makeResults({ p1: 0.5 }, 42);
    const { container } = render(
      <MetricsPanel
        nodes={nodes}
        derivedResults={results}
        validationResult={noValidation}
        selectedElement={null}
      />
    );
    const row = container.querySelector('[data-testid="utilization-row-p2"]') as HTMLElement;
    expect(row.textContent).toContain('N/A');
    const dot = container.querySelector('[data-testid="status-dot-p2"]') as HTMLElement;
    expect(dot.style.background).toBe('var(--color-text-secondary)');
  });

  it('shows selected node detail when process node is selected', () => {
    const nodes = [processNode('p1', 'Assembly')];
    const results = makeResults({ p1: 0.8 }, 42);
    const selected: SelectedElement = { kind: 'node', id: 'p1', nodeType: 'process' };
    render(
      <MetricsPanel
        nodes={nodes}
        derivedResults={results}
        validationResult={noValidation}
        selectedElement={selected}
      />
    );
    expect(screen.getByText('Selected Node')).toBeDefined();
    expect(screen.getByText('Required Throughput')).toBeDefined();
    expect(screen.getByText('Effective Capacity')).toBeDefined();
    // requiredThroughput = 50.00
    expect(screen.getByText('50.00')).toBeDefined();
    // effectiveCapacity = 42.00 appears twice (system throughput + selected node detail)
    expect(screen.getAllByText('42.00').length).toBe(2);
  });

  it('does not show selected node detail for non-process node', () => {
    const nodes = [sourceNode('s1', 'Source'), processNode('p1', 'Assembly')];
    const results = makeResults({ p1: 0.5 }, 42);
    const selected: SelectedElement = { kind: 'node', id: 's1', nodeType: 'source' };
    render(
      <MetricsPanel
        nodes={nodes}
        derivedResults={results}
        validationResult={noValidation}
        selectedElement={selected}
      />
    );
    expect(screen.queryByText('Selected Node')).toBeNull();
  });

  it('does not show selected node detail when nothing is selected', () => {
    const nodes = [processNode('p1', 'Assembly')];
    const results = makeResults({ p1: 0.5 }, 42);
    render(
      <MetricsPanel
        nodes={nodes}
        derivedResults={results}
        validationResult={noValidation}
        selectedElement={null}
      />
    );
    expect(screen.queryByText('Selected Node')).toBeNull();
  });

  it('shows validation warning when validation is invalid', () => {
    const nodes = [processNode('p1', 'Assembly')];
    const results = makeResults({ p1: 0.5 }, 42);
    render(
      <MetricsPanel
        nodes={nodes}
        derivedResults={results}
        validationResult={invalidValidation}
        selectedElement={null}
      />
    );
    expect(screen.getByText(/Invalid parameters/)).toBeDefined();
  });
});
