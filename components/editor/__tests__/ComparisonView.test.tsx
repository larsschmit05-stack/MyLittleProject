import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ComparisonView from '../ComparisonView';
import type { Scenario, SerializedModel } from '../../../types/flow';

// Mock window.matchMedia for useMediaQuery hook
beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: true,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
});

// Mock ReactFlow since it requires DOM measurements not available in jsdom
vi.mock('reactflow', async () => {
  const actual = await vi.importActual('reactflow') as Record<string, unknown>;
  return {
    ...actual,
    default: ({ children }: { children?: React.ReactNode }) => <div data-testid="reactflow">{children}</div>,
    ReactFlowProvider: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
    Background: () => null,
    Controls: () => null,
  };
});

const emptyModel: SerializedModel = { nodes: [], edges: [], globalDemand: 10 };

const modelWithProcess: SerializedModel = {
  nodes: [
    { id: 'src1', type: 'source' as const, position: { x: 0, y: 0 }, data: { label: 'Material' } },
    {
      id: 'p1',
      type: 'process' as const,
      position: { x: 200, y: 0 },
      data: {
        name: 'Assembly',
        throughputRate: 10,
        availableTime: 40,
        yield: 100,
        numberOfResources: 1,
        conversionRatio: 1,
      },
    },
    { id: 'sink1', type: 'sink' as const, position: { x: 400, y: 0 }, data: { label: 'Output' } },
  ],
  edges: [
    { id: 'e1', source: 'src1', target: 'p1' },
    { id: 'e2', source: 'p1', target: 'sink1' },
  ],
  globalDemand: 8,
};

const scenario1: Scenario = { id: 's1', name: 'Baseline', model: modelWithProcess };
const scenario2: Scenario = { id: 's2', name: 'High Demand', model: { ...modelWithProcess, globalDemand: 20 } };
const emptyScenario: Scenario = { id: 's3', name: 'Empty', model: emptyModel };

describe('ComparisonView', () => {
  it('renders header with both scenario names', () => {
    render(<ComparisonView scenario1={scenario1} scenario2={scenario2} onClose={vi.fn()} />);
    expect(screen.getByText('Baseline vs High Demand')).toBeDefined();
  });

  it('renders two MetricsPanel instances (two Results headings)', () => {
    render(<ComparisonView scenario1={scenario1} scenario2={scenario2} onClose={vi.fn()} />);
    const headings = screen.getAllByText('Results');
    expect(headings).toHaveLength(2);
  });

  it('shows system throughput for both scenarios', () => {
    render(<ComparisonView scenario1={scenario1} scenario2={scenario2} onClose={vi.fn()} />);
    const throughputLabels = screen.getAllByText('System Throughput');
    expect(throughputLabels).toHaveLength(2);
  });

  it('close button calls onClose', async () => {
    const onClose = vi.fn();
    render(<ComparisonView scenario1={scenario1} scenario2={scenario2} onClose={onClose} />);
    await userEvent.click(screen.getByLabelText('Close comparison'));
    expect(onClose).toHaveBeenCalled();
  });

  it('Escape key calls onClose', () => {
    const onClose = vi.fn();
    render(<ComparisonView scenario1={scenario1} scenario2={scenario2} onClose={onClose} />);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });

  it('empty model scenario shows placeholder text', () => {
    render(<ComparisonView scenario1={emptyScenario} scenario2={scenario1} onClose={vi.fn()} />);
    expect(screen.getByText('Run simulation to see metrics.')).toBeDefined();
  });

  it('shows different throughput values for each scenario (scenario-scoped data)', () => {
    // scenario1 has globalDemand=8, scenario2 has globalDemand=20
    // Both have same capacity (throughputRate=10, availableTime=40, yield=100, resources=1)
    // so effective capacity = 400. System throughput = min(demand, capacity).
    // scenario1 throughput = 8.00, scenario2 throughput = 20.00
    render(<ComparisonView scenario1={scenario1} scenario2={scenario2} onClose={vi.fn()} />);
    const throughputValues = screen.getAllByText('System Throughput');
    expect(throughputValues).toHaveLength(2);
    // Both throughput values should appear and be different
    expect(screen.getByText('8.00')).toBeDefined();
    expect(screen.getByText('20.00')).toBeDefined();
  });

  it('has dialog role and aria-modal for accessibility', () => {
    render(<ComparisonView scenario1={scenario1} scenario2={scenario2} onClose={vi.fn()} />);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeDefined();
    expect(dialog.getAttribute('aria-modal')).toBe('true');
  });
});
