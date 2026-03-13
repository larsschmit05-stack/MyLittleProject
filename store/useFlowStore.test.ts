import { describe, it, expect, beforeEach, vi } from 'vitest';
import useFlowStore from './useFlowStore';
import type { FlowNode, SerializedModel } from '../types/flow';

// ─── Persistence mocks ────────────────────────────────────────────────────────

const mockFetchModel = vi.fn();
vi.mock('../lib/persistence', () => ({
  insertModel: vi.fn(),
  updateModel: vi.fn(),
  fetchModel: (...args: unknown[]) => mockFetchModel(...args),
  listModels: vi.fn(),
  renameModel: vi.fn(),
  deleteModel: vi.fn(),
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeSourceNode(id = 'src-1'): FlowNode {
  return {
    id,
    type: 'source',
    position: { x: 0, y: 0 },
    data: { label: 'Source' },
  };
}

const BASELINE_INITIAL = {
  nodes: [] as FlowNode[],
  edges: [],
  selectedElement: null,
  globalDemand: 0,
  derivedResults: null,
  scenarios: [
    { id: 'baseline', name: 'Baseline', model: { nodes: [], edges: [], globalDemand: 0 } },
  ],
  activeScenarioId: 'baseline',
  savedModelId: null as string | null,
  savedModelName: '',
  isSaving: false,
  saveError: null as string | null,
};

beforeEach(() => {
  useFlowStore.setState(BASELINE_INITIAL);
});

// ─── Scenario isolation ───────────────────────────────────────────────────────

describe('duplicateActiveScenario', () => {
  it('does not switch to the new scenario automatically', () => {
    useFlowStore.getState().duplicateActiveScenario('What-If A');
    expect(useFlowStore.getState().activeScenarioId).toBe('baseline');
  });

  it('appends the new scenario to the list', () => {
    useFlowStore.getState().duplicateActiveScenario('What-If A');
    const { scenarios } = useFlowStore.getState();
    expect(scenarios).toHaveLength(2);
    expect(scenarios[1].name).toBe('What-If A');
  });
});

describe('scenario isolation — mutating one scenario does not affect another', () => {
  it('modifying globalDemand in What-If does not change Baseline', () => {
    // Set up Baseline with demand 100
    useFlowStore.getState().setGlobalDemand(100);
    expect(useFlowStore.getState().globalDemand).toBe(100);

    // Duplicate → What-If A
    useFlowStore.getState().duplicateActiveScenario('What-If A');
    const { scenarios } = useFlowStore.getState();
    const whatIfId = scenarios[1].id;

    // Switch to What-If A and change demand
    useFlowStore.getState().switchScenario(whatIfId);
    useFlowStore.getState().setGlobalDemand(200);
    expect(useFlowStore.getState().globalDemand).toBe(200);

    // Switch back to Baseline
    useFlowStore.getState().switchScenario('baseline');
    expect(useFlowStore.getState().globalDemand).toBe(100);
  });

  it('modifying nodes in What-If does not change Baseline node count', () => {
    // Baseline has 0 nodes
    useFlowStore.getState().duplicateActiveScenario('What-If A');
    const whatIfId = useFlowStore.getState().scenarios[1].id;

    // Switch to What-If A and add a node
    useFlowStore.getState().switchScenario(whatIfId);
    useFlowStore.getState().addNode(makeSourceNode());
    expect(useFlowStore.getState().nodes).toHaveLength(1);

    // Switch back — Baseline should still have 0 nodes
    useFlowStore.getState().switchScenario('baseline');
    expect(useFlowStore.getState().nodes).toHaveLength(0);
  });
});

describe('position sync — node position is preserved across scenario switches', () => {
  it('restores node position after switching away and back', () => {
    // Add a node to Baseline
    useFlowStore.getState().addNode(makeSourceNode('src-1'));

    // Simulate a position change (as React Flow would emit)
    useFlowStore.getState().onNodesChange([
      { type: 'position', id: 'src-1', position: { x: 150, y: 250 }, dragging: false },
    ]);

    // Verify position was applied
    const posAfterDrag = useFlowStore.getState().nodes[0].position;
    expect(posAfterDrag).toEqual({ x: 150, y: 250 });

    // Duplicate and switch to What-If
    useFlowStore.getState().duplicateActiveScenario('What-If A');
    const whatIfId = useFlowStore.getState().scenarios[1].id;
    useFlowStore.getState().switchScenario(whatIfId);

    // Switch back to Baseline — position must be restored
    useFlowStore.getState().switchScenario('baseline');
    expect(useFlowStore.getState().nodes[0].position).toEqual({ x: 150, y: 250 });
  });
});

describe('deleteScenario', () => {
  it('cannot delete the last remaining scenario', () => {
    useFlowStore.getState().deleteScenario('baseline');
    expect(useFlowStore.getState().scenarios).toHaveLength(1);
    expect(useFlowStore.getState().activeScenarioId).toBe('baseline');
  });

  it('deleting a non-active scenario removes it without switching', () => {
    useFlowStore.getState().duplicateActiveScenario('What-If A');
    const whatIfId = useFlowStore.getState().scenarios[1].id;

    useFlowStore.getState().deleteScenario(whatIfId);

    const { scenarios, activeScenarioId } = useFlowStore.getState();
    expect(scenarios).toHaveLength(1);
    expect(activeScenarioId).toBe('baseline');
  });

  it('deleting the active scenario switches to the first remaining and removes it', () => {
    // Set demand on Baseline so we can verify the canvas is restored
    useFlowStore.getState().setGlobalDemand(42);
    useFlowStore.getState().duplicateActiveScenario('What-If A');
    const whatIfId = useFlowStore.getState().scenarios[1].id;

    // Switch to What-If A then delete it
    useFlowStore.getState().switchScenario(whatIfId);
    useFlowStore.getState().deleteScenario(whatIfId);

    const { scenarios, activeScenarioId, globalDemand } = useFlowStore.getState();
    expect(scenarios).toHaveLength(1);
    expect(activeScenarioId).toBe('baseline');
    // Canvas should reflect the Baseline model (demand = 42)
    expect(globalDemand).toBe(42);
  });
});

// ─── resetStore ───────────────────────────────────────────────────────────────

describe('resetStore', () => {
  it('clears canvas and persistence state back to initial', () => {
    // Dirty the store
    useFlowStore.getState().addNode({ id: 'n1', type: 'source', position: { x: 0, y: 0 }, data: { label: 'S' } });
    useFlowStore.setState({ savedModelId: 'some-id', savedModelName: 'My Model', globalDemand: 99 });

    useFlowStore.getState().resetStore();

    const s = useFlowStore.getState();
    expect(s.nodes).toHaveLength(0);
    expect(s.globalDemand).toBe(0);
    expect(s.savedModelId).toBeNull();
    expect(s.savedModelName).toBe('');
    expect(s.scenarios).toHaveLength(1);
    expect(s.scenarios[0].id).toBe('baseline');
  });
});

// ─── loadModel ────────────────────────────────────────────────────────────────

describe('loadModel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useFlowStore.setState(BASELINE_INITIAL);
    // Put a model on canvas so we can verify it gets cleared
    useFlowStore.setState({ nodes: [{ id: 'old', type: 'source', position: { x: 0, y: 0 }, data: { label: 'Old' } }] as FlowNode[], globalDemand: 50, savedModelId: 'old-id', savedModelName: 'Old Model' });
  });

  const loadedModel: SerializedModel = { nodes: [], edges: [], globalDemand: 200 };

  it('clears canvas state before the fetch resolves', async () => {
    // Arrange: fetch resolves after we can check intermediate state
    let resolveFetch!: (value: unknown) => void;
    mockFetchModel.mockReturnValue(new Promise((r) => { resolveFetch = r; }));

    const promise = useFlowStore.getState().loadModel('new-id');

    // State should already be cleared (blank canvas, isSaving=true)
    const mid = useFlowStore.getState();
    expect(mid.nodes).toHaveLength(0);
    expect(mid.savedModelId).toBeNull();
    expect(mid.isSaving).toBe(true);

    resolveFetch({ id: 'new-id', name: 'New', data: loadedModel });
    await promise;
  });

  it('hydrates canvas on successful fetch', async () => {
    mockFetchModel.mockResolvedValue({ id: 'new-id', name: 'New Model', data: loadedModel });

    await useFlowStore.getState().loadModel('new-id');

    const s = useFlowStore.getState();
    expect(s.savedModelId).toBe('new-id');
    expect(s.savedModelName).toBe('New Model');
    expect(s.globalDemand).toBe(200);
    expect(s.isSaving).toBe(false);
  });

  it('leaves canvas blank (not stale) when fetch fails', async () => {
    mockFetchModel.mockRejectedValue(new Error('network error'));

    await useFlowStore.getState().loadModel('bad-id');

    const s = useFlowStore.getState();
    // Canvas must be blank — old model must NOT be present
    expect(s.nodes).toHaveLength(0);
    expect(s.savedModelId).toBeNull();
    expect(s.isSaving).toBe(false);
    expect(s.saveError).toBe('network error');
  });

  it('loads a new model after a previous model was open (id change)', async () => {
    const model2: SerializedModel = { nodes: [], edges: [], globalDemand: 42 };
    mockFetchModel.mockResolvedValue({ id: 'id-2', name: 'Second', data: model2 });

    await useFlowStore.getState().loadModel('id-2');

    const s = useFlowStore.getState();
    expect(s.savedModelId).toBe('id-2');
    expect(s.globalDemand).toBe(42);
  });
});
