import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { SerializedModel, FlowResult } from '../../../types/flow';
import type { ValidationResult } from '../../flow/validation';

// ─── jsPDF mock ──────────────────────────────────────────────────────────────

const mockSave = vi.fn();
const mockText = vi.fn();
const mockSetFontSize = vi.fn();
const mockSetFont = vi.fn();
const mockSetTextColor = vi.fn();
const mockSetDrawColor = vi.fn();
const mockSetFillColor = vi.fn();
const mockSetLineWidth = vi.fn();
const mockLine = vi.fn();
const mockCircle = vi.fn();
const mockAutoTable = vi.fn();

const mockDoc = {
  save: mockSave,
  text: mockText,
  setFontSize: mockSetFontSize,
  setFont: mockSetFont,
  setTextColor: mockSetTextColor,
  setDrawColor: mockSetDrawColor,
  setFillColor: mockSetFillColor,
  setLineWidth: mockSetLineWidth,
  line: mockLine,
  circle: mockCircle,
  autoTable: mockAutoTable,
  internal: {
    pageSize: { getWidth: () => 841.89, getHeight: () => 595.28 },
  },
  lastAutoTable: { finalY: 300 },
};

vi.mock('jspdf', () => ({
  default: vi.fn(() => mockDoc),
}));

vi.mock('jspdf-autotable', () => ({
  default: mockAutoTable,
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeModel(overrides: Partial<SerializedModel> = {}): SerializedModel {
  return {
    nodes: [
      { id: 'src1', type: 'source', position: { x: 0, y: 0 }, data: { label: 'Raw' } },
      { id: 'p1', type: 'process', position: { x: 100, y: 0 }, data: { name: 'Cutting', throughputRate: 100, availableTime: 8, yield: 1, numberOfResources: 1, conversionRatio: 1 } },
      { id: 'p2', type: 'process', position: { x: 200, y: 0 }, data: { name: 'Assembly', throughputRate: 80, availableTime: 8, yield: 1, numberOfResources: 1, conversionRatio: 1 } },
      { id: 'snk1', type: 'sink', position: { x: 300, y: 0 }, data: { label: 'Output' } },
    ],
    edges: [
      { id: 'e1', source: 'src1', target: 'p1' },
      { id: 'e2', source: 'p1', target: 'p2' },
      { id: 'e3', source: 'p2', target: 'snk1' },
    ],
    globalDemand: 1000,
    ...overrides,
  };
}

function makeResults(overrides: Partial<FlowResult> = {}): FlowResult {
  return {
    systemThroughput: 850,
    bottleneckNodeId: 'p2',
    nodeResults: {
      p1: { requiredThroughput: 850, effectiveCapacity: 1200, utilization: 0.708 },
      p2: { requiredThroughput: 850, effectiveCapacity: 893, utilization: 0.952 },
    },
    ...overrides,
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('generateScenarioPdf', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  async function importAndGenerate(params: Parameters<typeof import('../pdf').generateScenarioPdf>[0]) {
    const { generateScenarioPdf } = await import('../pdf');
    await generateScenarioPdf(params);
  }

  it('generates PDF with correct filename format', async () => {
    await importAndGenerate({
      scenarioName: 'Baseline',
      model: makeModel(),
      derivedResults: makeResults(),
      validationResult: { isValid: true, errors: [], categories: [], errorDetails: [] },
    });

    expect(mockSave).toHaveBeenCalledTimes(1);
    const filename = mockSave.mock.calls[0][0] as string;
    expect(filename).toMatch(/^Scenario_Baseline_\d{4}-\d{2}-\d{2}\.pdf$/);
  });

  it('handles null derivedResults without crash', async () => {
    await importAndGenerate({
      scenarioName: 'Empty Run',
      model: makeModel(),
      derivedResults: null,
      validationResult: null,
    });

    expect(mockSave).toHaveBeenCalledTimes(1);
    // Verify "No simulation results" text appears
    const textCalls = mockText.mock.calls.map((c) => c[0] as string);
    expect(textCalls.some((t: string) => typeof t === 'string' && t.includes('No simulation results'))).toBe(true);
  });

  it('handles empty model (no nodes)', async () => {
    await importAndGenerate({
      scenarioName: 'Empty',
      model: { nodes: [], edges: [], globalDemand: 0 },
      derivedResults: null,
      validationResult: null,
    });

    expect(mockSave).toHaveBeenCalledTimes(1);
    // autoTable called with empty body
    expect(mockAutoTable).toHaveBeenCalledTimes(1);
    const tableOpts = mockAutoTable.mock.calls[0][1];
    expect(tableOpts.body).toEqual([]);
  });

  it('sanitizes special characters in filename', async () => {
    await importAndGenerate({
      scenarioName: '+1 Machine / Test',
      model: makeModel(),
      derivedResults: makeResults(),
      validationResult: { isValid: true, errors: [], categories: [], errorDetails: [] },
    });

    const filename = mockSave.mock.calls[0][0] as string;
    expect(filename).not.toMatch(/[+/\s]/);
    expect(filename).toMatch(/^Scenario_/);
    expect(filename).toMatch(/\.pdf$/);
  });

  it('shows single bottleneck text', async () => {
    await importAndGenerate({
      scenarioName: 'Test',
      model: makeModel(),
      derivedResults: makeResults(),
      validationResult: { isValid: true, errors: [], categories: [], errorDetails: [] },
    });

    const textCalls = mockText.mock.calls.map((c) => c[0] as string);
    expect(textCalls.some((t: string) => typeof t === 'string' && t.includes('Assembly') && t.includes('CRITICAL'))).toBe(true);
  });

  it('shows single worst bottleneck when multiple nodes exceed threshold', async () => {
    const results = makeResults({
      nodeResults: {
        p1: { requiredThroughput: 950, effectiveCapacity: 980, utilization: 0.969 },
        p2: { requiredThroughput: 950, effectiveCapacity: 960, utilization: 0.990 },
      },
    });

    await importAndGenerate({
      scenarioName: 'Multi',
      model: makeModel(),
      derivedResults: results,
      validationResult: { isValid: true, errors: [], categories: [], errorDetails: [] },
    });

    const textCalls = mockText.mock.calls.map((c) => c[0] as string);
    // Only the worst bottleneck (Assembly at 99%) should be shown, not "Multiple"
    expect(textCalls.some((t: string) => typeof t === 'string' && t.includes('Assembly') && t.includes('CRITICAL'))).toBe(true);
    expect(textCalls.some((t: string) => typeof t === 'string' && t.includes('Multiple'))).toBe(false);
  });

  it('shows balanced text when all utilization is low', async () => {
    const results = makeResults({
      nodeResults: {
        p1: { requiredThroughput: 500, effectiveCapacity: 1200, utilization: 0.417 },
        p2: { requiredThroughput: 500, effectiveCapacity: 893, utilization: 0.560 },
      },
    });

    await importAndGenerate({
      scenarioName: 'Balanced',
      model: makeModel(),
      derivedResults: results,
      validationResult: { isValid: true, errors: [], categories: [], errorDetails: [] },
    });

    const textCalls = mockText.mock.calls.map((c) => c[0] as string);
    expect(textCalls.some((t: string) => typeof t === 'string' && t.includes('All nodes operating efficiently'))).toBe(true);
  });

  it('applies correct utilization colors in table cells', async () => {
    await importAndGenerate({
      scenarioName: 'Colors',
      model: makeModel(),
      derivedResults: makeResults(),
      validationResult: { isValid: true, errors: [], categories: [], errorDetails: [] },
    });

    expect(mockAutoTable).toHaveBeenCalledTimes(1);
    const tableOpts = mockAutoTable.mock.calls[0][1];

    // Sorted alphabetically: Assembly (p2, 95.2%) at index 0, Cutting (p1, 70.8%) at index 1
    // Simulate didParseCell for red cell (Assembly at 95.2%)
    const redCell = { styles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'normal' } };
    tableOpts.didParseCell({ section: 'body', column: { index: 3 }, cell: redCell, row: { index: 0 } });
    expect(redCell.styles.fillColor).toEqual([239, 68, 68]);

    // Simulate didParseCell for green cell (Cutting at 70.8%)
    const greenCell = { styles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'normal' } };
    tableOpts.didParseCell({ section: 'body', column: { index: 3 }, cell: greenCell, row: { index: 1 } });
    expect(greenCell.styles.fillColor).toEqual([16, 185, 129]);
  });

  it('shows validation warning when model is invalid', async () => {
    await importAndGenerate({
      scenarioName: 'Invalid',
      model: makeModel(),
      derivedResults: makeResults(),
      validationResult: { isValid: false, errors: ['Cycle detected'], categories: ['cycle'], errorDetails: [] },
    });

    const textCalls = mockText.mock.calls.map((c) => c[0] as string);
    expect(textCalls.some((t: string) => typeof t === 'string' && t.includes('validation errors'))).toBe(true);
  });

  it('handles Infinity utilization as N/A with red color', async () => {
    const results = makeResults({
      nodeResults: {
        p1: { requiredThroughput: 850, effectiveCapacity: 0, utilization: Infinity },
        p2: { requiredThroughput: 850, effectiveCapacity: 893, utilization: 0.952 },
      },
    });

    await importAndGenerate({
      scenarioName: 'Inf',
      model: makeModel(),
      derivedResults: results,
      validationResult: { isValid: true, errors: [], categories: [], errorDetails: [] },
    });

    // Check table body has "N/A" for Infinity utilization
    const tableOpts = mockAutoTable.mock.calls[0][1];
    // Sorted alphabetically: Assembly (p2), Cutting (p1)
    const cuttingRow = tableOpts.body.find((row: string[]) => row[0] === 'Cutting');
    expect(cuttingRow[3]).toBe('N/A');
  });

  it('colors exactly 95.0% utilization as red (matches bottleneck threshold)', async () => {
    const results = makeResults({
      nodeResults: {
        p1: { requiredThroughput: 850, effectiveCapacity: 1200, utilization: 0.708 },
        p2: { requiredThroughput: 850, effectiveCapacity: 894.74, utilization: 0.95 },
      },
    });

    await importAndGenerate({
      scenarioName: 'Threshold',
      model: makeModel(),
      derivedResults: results,
      validationResult: { isValid: true, errors: [], categories: [], errorDetails: [] },
    });

    const tableOpts = mockAutoTable.mock.calls[0][1];
    // Assembly (p2) is at exactly 0.95 — should be red, not orange
    const redCell = { styles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'normal' } };
    tableOpts.didParseCell({ section: 'body', column: { index: 3 }, cell: redCell, row: { index: 0 } });
    expect(redCell.styles.fillColor).toEqual([239, 68, 68]); // red

    // Also verify bottleneck status text says CRITICAL
    const textCalls = mockText.mock.calls.map((c) => c[0] as string);
    expect(textCalls.some((t: string) => typeof t === 'string' && t.includes('CRITICAL'))).toBe(true);
  });

  it('shows dashes for missing node results', async () => {
    const results = makeResults({
      nodeResults: {
        // p1 has results but p2 does not
        p1: { requiredThroughput: 850, effectiveCapacity: 1200, utilization: 0.708 },
      },
    });

    await importAndGenerate({
      scenarioName: 'Missing',
      model: makeModel(),
      derivedResults: results,
      validationResult: { isValid: true, errors: [], categories: [], errorDetails: [] },
    });

    const tableOpts = mockAutoTable.mock.calls[0][1];
    const assemblyRow = tableOpts.body.find((row: string[]) => row[0] === 'Assembly');
    expect(assemblyRow[1]).toBe('\u2014');
    expect(assemblyRow[2]).toBe('\u2014');
    expect(assemblyRow[3]).toBe('\u2014');
  });
});
