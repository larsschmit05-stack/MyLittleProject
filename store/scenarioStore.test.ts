import { describe, it, expect, beforeEach, vi } from 'vitest';
import useFlowStore from './useFlowStore';
import type { FlowNode, SerializedModel } from '../types/flow';
import type { DbScenario } from '../types/scenario';

// ─── DB mocks ────────────────────────────────────────────────────────────────

const mockGetScenarios = vi.fn();
const mockCreateScenario = vi.fn();
const mockUpdateScenario = vi.fn();
const mockDeleteScenario = vi.fn();
const mockInsertModel = vi.fn();

vi.mock('../lib/db/scenarios', () => ({
  getScenarios: (...args: unknown[]) => mockGetScenarios(...args),
  createScenario: (...args: unknown[]) => mockCreateScenario(...args),
  updateScenario: (...args: unknown[]) => mockUpdateScenario(...args),
  deleteScenario: (...args: unknown[]) => mockDeleteScenario(...args),
}));

vi.mock('../lib/persistence', () => ({
  insertModel: (...args: unknown[]) => mockInsertModel(...args),
  updateModel: vi.fn(),
  fetchModel: vi.fn(),
  listModels: vi.fn(),
  renameModel: vi.fn(),
  deleteModel: vi.fn(),
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

const BASELINE_MODEL: SerializedModel = { nodes: [], edges: [], globalDemand: 0 };

const BASELINE_INITIAL = {
  nodes: [] as FlowNode[],
  edges: [],
  selectedElement: null,
  globalDemand: 0,
  derivedResults: null,
  validationResult: null,
  scenarios: [{ id: 'baseline', name: 'Baseline', model: BASELINE_MODEL }],
  activeScenarioId: 'baseline',
  savedModelId: null as string | null,
  savedModelName: '',
  isSaving: false,
  saveError: null as string | null,
  savedSnapshots: {} as Record<string, SerializedModel>,
  persistedScenarioIds: new Set<string>(),
  isSavingScenario: false,
  scenarioSaveError: null as string | null,
  isDeletingScenario: false,
  scenarioDeleteError: null as string | null,
  pendingSwitchTarget: null as string | null,
};

beforeEach(() => {
  vi.clearAllMocks();
  useFlowStore.setState(BASELINE_INITIAL);
});

// ─── loadScenariosFromDb ─────────────────────────────────────────────────────

describe('loadScenariosFromDb', () => {
  it('populates scenarios and savedSnapshots from DB response', async () => {
    const model: SerializedModel = { nodes: [], edges: [], globalDemand: 200 };
    const dbRows: DbScenario[] = [
      { id: 's1', model_id: 'm1', name: 'Baseline', data: model, results: null, created_at: 't1', updated_at: 't1' },
      { id: 's2', model_id: 'm1', name: 'What-If', data: model, results: null, created_at: 't2', updated_at: 't2' },
    ];
    mockGetScenarios.mockResolvedValue(dbRows);

    await useFlowStore.getState().loadScenariosFromDb('m1');

    const { scenarios, activeScenarioId, globalDemand, savedSnapshots } = useFlowStore.getState();
    expect(scenarios).toHaveLength(2);
    expect(scenarios[0].id).toBe('s1');
    expect(scenarios[1].id).toBe('s2');
    expect(activeScenarioId).toBe('s1');
    expect(globalDemand).toBe(200);
    expect(savedSnapshots['s1']).toBeDefined();
    expect(savedSnapshots['s2']).toBeDefined();
  });

  it('creates Baseline for legacy model when DB returns empty', async () => {
    mockGetScenarios.mockResolvedValue([]);
    mockCreateScenario.mockResolvedValue('new-baseline-id');

    useFlowStore.setState({ globalDemand: 42 });

    await useFlowStore.getState().loadScenariosFromDb('m1');

    expect(mockCreateScenario).toHaveBeenCalledWith(
      expect.objectContaining({ model_id: 'm1', name: 'Baseline' })
    );
    const { scenarios, activeScenarioId, savedSnapshots } = useFlowStore.getState();
    expect(scenarios).toHaveLength(1);
    expect(scenarios[0].id).toBe('new-baseline-id');
    expect(activeScenarioId).toBe('new-baseline-id');
    expect(savedSnapshots['new-baseline-id']).toBeDefined();
  });

  it('does not throw on DB error (non-fatal)', async () => {
    mockGetScenarios.mockRejectedValue(new Error('network error'));

    await useFlowStore.getState().loadScenariosFromDb('m1');

    expect(useFlowStore.getState().scenarios).toHaveLength(1);
  });
});

// ─── saveScenarioToDb ────────────────────────────────────────────────────────

describe('saveScenarioToDb', () => {
  it('calls updateScenario for persisted scenario, updates savedSnapshots', async () => {
    mockUpdateScenario.mockResolvedValue(undefined);
    useFlowStore.setState({
      savedModelId: 'm1',
      activeScenarioId: 's1',
      globalDemand: 100,
      savedSnapshots: { s1: { nodes: [], edges: [], globalDemand: 50 } },
      persistedScenarioIds: new Set(['s1']),
    });

    await useFlowStore.getState().saveScenarioToDb();

    expect(mockUpdateScenario).toHaveBeenCalledWith('s1', expect.objectContaining({ data: expect.any(Object) }));
    expect(mockCreateScenario).not.toHaveBeenCalled();
    const { isSavingScenario, scenarioSaveError, savedSnapshots } = useFlowStore.getState();
    expect(isSavingScenario).toBe(false);
    expect(scenarioSaveError).toBeNull();
    expect(savedSnapshots['s1'].globalDemand).toBe(100);
  });

  it('calls createScenario for new (unpersisted) scenario', async () => {
    mockCreateScenario.mockResolvedValue('db-new-id');
    useFlowStore.setState({
      savedModelId: 'm1',
      activeScenarioId: 'local-uuid',
      scenarios: [{ id: 'local-uuid', name: 'What-If', model: BASELINE_MODEL }],
      savedSnapshots: {}, // not in savedSnapshots → new scenario
    });

    await useFlowStore.getState().saveScenarioToDb();

    expect(mockCreateScenario).toHaveBeenCalled();
    expect(mockUpdateScenario).not.toHaveBeenCalled();
    const { activeScenarioId, savedSnapshots, scenarios } = useFlowStore.getState();
    expect(activeScenarioId).toBe('db-new-id');
    expect(savedSnapshots['db-new-id']).toBeDefined();
    expect(scenarios[0].id).toBe('db-new-id');
  });

  it('sets error on failure, keeps isSavingScenario false', async () => {
    mockUpdateScenario.mockRejectedValue(new Error('save failed'));
    useFlowStore.setState({
      savedModelId: 'm1',
      activeScenarioId: 's1',
      savedSnapshots: { s1: BASELINE_MODEL },
      persistedScenarioIds: new Set(['s1']),
    });

    await useFlowStore.getState().saveScenarioToDb();

    const { isSavingScenario, scenarioSaveError } = useFlowStore.getState();
    expect(isSavingScenario).toBe(false);
    expect(scenarioSaveError).toBe('save failed');
  });

  it('does nothing when savedModelId is null', async () => {
    await useFlowStore.getState().saveScenarioToDb();
    expect(mockUpdateScenario).not.toHaveBeenCalled();
    expect(mockCreateScenario).not.toHaveBeenCalled();
  });
});

// ─── saveAsNewModel ──────────────────────────────────────────────────────────

describe('saveAsNewModel', () => {
  it('creates a baseline scenario row for the new model', async () => {
    mockInsertModel.mockResolvedValue('new-model-id');
    mockCreateScenario.mockResolvedValue('new-scenario-id');

    useFlowStore.setState({ globalDemand: 100 });
    await useFlowStore.getState().saveAsNewModel('My Model');

    expect(mockCreateScenario).toHaveBeenCalledWith(
      expect.objectContaining({ model_id: 'new-model-id', name: 'Baseline' })
    );
    const { savedSnapshots, scenarios, activeScenarioId } = useFlowStore.getState();
    expect(scenarios).toHaveLength(1);
    expect(scenarios[0].id).toBe('new-scenario-id');
    expect(activeScenarioId).toBe('new-scenario-id');
    expect(savedSnapshots['new-scenario-id']).toBeDefined();
  });
});

// ─── resetToSaved ────────────────────────────────────────────────────────────

describe('resetToSaved', () => {
  it('restores canvas from saved snapshot for active scenario', () => {
    const snapshot: SerializedModel = { nodes: [], edges: [], globalDemand: 42 };
    useFlowStore.setState({
      activeScenarioId: 's1',
      savedSnapshots: { s1: snapshot },
      globalDemand: 999,
    });

    useFlowStore.getState().resetToSaved();

    expect(useFlowStore.getState().globalDemand).toBe(42);
  });

  it('does nothing when no snapshot exists for active scenario', () => {
    useFlowStore.setState({ globalDemand: 999, savedSnapshots: {} });

    useFlowStore.getState().resetToSaved();

    expect(useFlowStore.getState().globalDemand).toBe(999);
  });
});

// ─── hasUnsavedEdits ─────────────────────────────────────────────────────────

describe('hasUnsavedEdits', () => {
  it('returns true when no snapshot exists (never saved)', () => {
    useFlowStore.setState({ savedSnapshots: {} });
    expect(useFlowStore.getState().hasUnsavedEdits()).toBe(true);
  });

  it('returns false when model matches snapshot', () => {
    const model: SerializedModel = { nodes: [], edges: [], globalDemand: 100 };
    useFlowStore.setState({
      activeScenarioId: 's1',
      globalDemand: 100,
      savedSnapshots: { s1: model },
    });

    expect(useFlowStore.getState().hasUnsavedEdits()).toBe(false);
  });

  it('returns true after model change', () => {
    const model: SerializedModel = { nodes: [], edges: [], globalDemand: 100 };
    useFlowStore.setState({
      activeScenarioId: 's1',
      globalDemand: 100,
      savedSnapshots: { s1: model },
    });

    useFlowStore.getState().setGlobalDemand(200);

    expect(useFlowStore.getState().hasUnsavedEdits()).toBe(true);
  });

  it('dirty state survives scenario switching', () => {
    // Set up: baseline scenario with a saved snapshot
    const baselineModel: SerializedModel = { nodes: [], edges: [], globalDemand: 100 };
    useFlowStore.setState({
      activeScenarioId: 'baseline',
      globalDemand: 100,
      savedSnapshots: { baseline: baselineModel },
      scenarios: [
        { id: 'baseline', name: 'Baseline', model: baselineModel },
      ],
    });

    // Make an unsaved edit
    useFlowStore.getState().setGlobalDemand(200);
    expect(useFlowStore.getState().hasUnsavedEdits()).toBe(true);

    // Duplicate and switch to What-If
    useFlowStore.getState().duplicateActiveScenario('What-If');
    const whatIfId = useFlowStore.getState().scenarios[1].id;
    useFlowStore.getState().switchScenario(whatIfId);

    // Switch back to baseline — dirty state must still be detected
    useFlowStore.getState().switchScenario('baseline');
    expect(useFlowStore.getState().hasUnsavedEdits()).toBe(true);
    expect(useFlowStore.getState().globalDemand).toBe(200);
  });
});

// ─── Existing scenario actions still work ────────────────────────────────────

describe('existing scenario actions (no regressions)', () => {
  it('duplicateActiveScenario still appends scenario', () => {
    useFlowStore.getState().duplicateActiveScenario('What-If');
    expect(useFlowStore.getState().scenarios).toHaveLength(2);
  });

  it('duplicated scenario has a snapshot (duplication origin for reset)', () => {
    useFlowStore.getState().duplicateActiveScenario('What-If');
    const whatIfId = useFlowStore.getState().scenarios[1].id;
    expect(useFlowStore.getState().savedSnapshots[whatIfId]).toBeDefined();
  });

  it('deleteScenario cannot delete last remaining scenario', () => {
    useFlowStore.getState().deleteScenario('baseline');
    expect(useFlowStore.getState().scenarios).toHaveLength(1);
  });
});

// ─── renameScenarioInDb ─────────────────────────────────────────────────────

describe('renameScenarioInDb', () => {
  it('renames scenario in memory and calls DB update for persisted scenario', async () => {
    mockUpdateScenario.mockResolvedValue(undefined);
    useFlowStore.setState({
      scenarios: [{ id: 's1', name: 'Baseline', model: BASELINE_MODEL }],
      activeScenarioId: 's1',
      persistedScenarioIds: new Set(['s1']),
    });

    await useFlowStore.getState().renameScenarioInDb('s1', 'Renamed');

    expect(useFlowStore.getState().scenarios[0].name).toBe('Renamed');
    expect(mockUpdateScenario).toHaveBeenCalledWith('s1', { name: 'Renamed' });
  });

  it('renames in memory without DB call for non-persisted scenario', async () => {
    useFlowStore.setState({
      scenarios: [
        { id: 's1', name: 'Baseline', model: BASELINE_MODEL },
        { id: 'local', name: 'Draft', model: BASELINE_MODEL },
      ],
      activeScenarioId: 's1',
      persistedScenarioIds: new Set(['s1']),
    });

    await useFlowStore.getState().renameScenarioInDb('local', 'New Name');

    expect(useFlowStore.getState().scenarios[1].name).toBe('New Name');
    expect(mockUpdateScenario).not.toHaveBeenCalled();
  });

  it('rolls back name on DB failure', async () => {
    mockUpdateScenario.mockRejectedValue(new Error('DB error'));
    useFlowStore.setState({
      scenarios: [{ id: 's1', name: 'Original', model: BASELINE_MODEL }],
      activeScenarioId: 's1',
      persistedScenarioIds: new Set(['s1']),
    });

    await useFlowStore.getState().renameScenarioInDb('s1', 'Bad Name');

    expect(useFlowStore.getState().scenarios[0].name).toBe('Original');
  });

  it('does nothing for nonexistent scenario', async () => {
    useFlowStore.setState({
      scenarios: [{ id: 's1', name: 'Baseline', model: BASELINE_MODEL }],
      activeScenarioId: 's1',
    });

    await useFlowStore.getState().renameScenarioInDb('nonexistent', 'Name');

    expect(mockUpdateScenario).not.toHaveBeenCalled();
  });
});

// ─── deleteScenarioFromDb ───────────────────────────────────────────────────

describe('deleteScenarioFromDb', () => {
  it('removes scenario from array', async () => {
    useFlowStore.setState({
      scenarios: [
        { id: 's1', name: 'Baseline', model: BASELINE_MODEL },
        { id: 's2', name: 'What-If', model: BASELINE_MODEL },
      ],
      activeScenarioId: 's1',
      savedSnapshots: { s1: BASELINE_MODEL, s2: BASELINE_MODEL },
      persistedScenarioIds: new Set(['s1', 's2']),
    });
    mockDeleteScenario.mockResolvedValue(undefined);

    await useFlowStore.getState().deleteScenarioFromDb('s2');

    expect(useFlowStore.getState().scenarios).toHaveLength(1);
    expect(useFlowStore.getState().scenarios[0].id).toBe('s1');
  });

  it('removes entry from savedSnapshots', async () => {
    useFlowStore.setState({
      scenarios: [
        { id: 's1', name: 'Baseline', model: BASELINE_MODEL },
        { id: 's2', name: 'What-If', model: BASELINE_MODEL },
      ],
      activeScenarioId: 's1',
      savedSnapshots: { s1: BASELINE_MODEL, s2: BASELINE_MODEL },
      persistedScenarioIds: new Set(['s1', 's2']),
    });
    mockDeleteScenario.mockResolvedValue(undefined);

    await useFlowStore.getState().deleteScenarioFromDb('s2');

    expect(useFlowStore.getState().savedSnapshots['s2']).toBeUndefined();
    expect(useFlowStore.getState().savedSnapshots['s1']).toBeDefined();
  });

  it('switches to next scenario if active was deleted', async () => {
    useFlowStore.setState({
      scenarios: [
        { id: 's1', name: 'Baseline', model: BASELINE_MODEL },
        { id: 's2', name: 'What-If', model: BASELINE_MODEL },
      ],
      activeScenarioId: 's1',
      savedSnapshots: { s1: BASELINE_MODEL, s2: BASELINE_MODEL },
      persistedScenarioIds: new Set(['s1', 's2']),
    });
    mockDeleteScenario.mockResolvedValue(undefined);

    await useFlowStore.getState().deleteScenarioFromDb('s1');

    expect(useFlowStore.getState().activeScenarioId).toBe('s2');
    expect(useFlowStore.getState().scenarios).toHaveLength(1);
  });

  it('does nothing when only 1 scenario remains', async () => {
    useFlowStore.setState({
      scenarios: [{ id: 's1', name: 'Baseline', model: BASELINE_MODEL }],
      activeScenarioId: 's1',
      savedSnapshots: { s1: BASELINE_MODEL },
      persistedScenarioIds: new Set(['s1']),
    });

    await useFlowStore.getState().deleteScenarioFromDb('s1');

    expect(useFlowStore.getState().scenarios).toHaveLength(1);
    expect(mockDeleteScenario).not.toHaveBeenCalled();
  });

  it('does nothing when scenario ID not found', async () => {
    useFlowStore.setState({
      scenarios: [
        { id: 's1', name: 'Baseline', model: BASELINE_MODEL },
        { id: 's2', name: 'What-If', model: BASELINE_MODEL },
      ],
      activeScenarioId: 's1',
      savedSnapshots: { s1: BASELINE_MODEL, s2: BASELINE_MODEL },
      persistedScenarioIds: new Set(['s1', 's2']),
    });

    await useFlowStore.getState().deleteScenarioFromDb('nonexistent');

    expect(useFlowStore.getState().scenarios).toHaveLength(2);
    expect(mockDeleteScenario).not.toHaveBeenCalled();
  });

  it('calls DB delete for persisted scenarios', async () => {
    useFlowStore.setState({
      scenarios: [
        { id: 's1', name: 'Baseline', model: BASELINE_MODEL },
        { id: 's2', name: 'What-If', model: BASELINE_MODEL },
      ],
      activeScenarioId: 's1',
      savedSnapshots: { s1: BASELINE_MODEL, s2: BASELINE_MODEL },
      persistedScenarioIds: new Set(['s1', 's2']),
    });
    mockDeleteScenario.mockResolvedValue(undefined);

    await useFlowStore.getState().deleteScenarioFromDb('s2');

    expect(mockDeleteScenario).toHaveBeenCalledWith('s2');
  });

  it('skips DB call for in-memory-only scenarios (not in persistedScenarioIds)', async () => {
    // Simulates a duplicated scenario that has a savedSnapshot (duplication origin)
    // but was never saved to DB — persistedScenarioIds is the authoritative check.
    useFlowStore.setState({
      scenarios: [
        { id: 's1', name: 'Baseline', model: BASELINE_MODEL },
        { id: 'local-only', name: 'Draft', model: BASELINE_MODEL },
      ],
      activeScenarioId: 's1',
      savedSnapshots: { s1: BASELINE_MODEL, 'local-only': BASELINE_MODEL },
      persistedScenarioIds: new Set(['s1']), // local-only is NOT persisted
    });

    await useFlowStore.getState().deleteScenarioFromDb('local-only');

    expect(mockDeleteScenario).not.toHaveBeenCalled();
    expect(useFlowStore.getState().scenarios).toHaveLength(1);
  });

  it('skips DB call when deleting an unsaved duplicate (has snapshot but not persisted)', async () => {
    // This is the exact bug scenario: duplicateActiveScenario writes a snapshot,
    // but the scenario was never saved to DB.
    useFlowStore.setState({
      scenarios: [
        { id: 's1', name: 'Baseline', model: BASELINE_MODEL },
      ],
      activeScenarioId: 's1',
      savedSnapshots: { s1: BASELINE_MODEL },
      persistedScenarioIds: new Set(['s1']),
    });

    // Duplicate creates a local scenario with a snapshot but no DB row
    useFlowStore.getState().duplicateActiveScenario('Draft Copy');
    const draftId = useFlowStore.getState().scenarios[1].id;

    // Snapshot exists for draft (duplication origin), but it's not persisted
    expect(useFlowStore.getState().savedSnapshots[draftId]).toBeDefined();
    expect(useFlowStore.getState().persistedScenarioIds.has(draftId)).toBe(false);

    await useFlowStore.getState().deleteScenarioFromDb(draftId);

    expect(mockDeleteScenario).not.toHaveBeenCalled();
    expect(useFlowStore.getState().scenarios).toHaveLength(1);
  });

  it('rolls back on DB failure', async () => {
    useFlowStore.setState({
      scenarios: [
        { id: 's1', name: 'Baseline', model: BASELINE_MODEL },
        { id: 's2', name: 'What-If', model: BASELINE_MODEL },
      ],
      activeScenarioId: 's1',
      savedSnapshots: { s1: BASELINE_MODEL, s2: BASELINE_MODEL },
      persistedScenarioIds: new Set(['s1', 's2']),
    });
    mockDeleteScenario.mockRejectedValue(new Error('DB error'));

    await useFlowStore.getState().deleteScenarioFromDb('s2');

    // Scenario should be restored
    expect(useFlowStore.getState().scenarios).toHaveLength(2);
    expect(useFlowStore.getState().savedSnapshots['s2']).toBeDefined();
    expect(useFlowStore.getState().persistedScenarioIds.has('s2')).toBe(true);
  });

  it('sets scenarioDeleteError on DB failure', async () => {
    useFlowStore.setState({
      scenarios: [
        { id: 's1', name: 'Baseline', model: BASELINE_MODEL },
        { id: 's2', name: 'What-If', model: BASELINE_MODEL },
      ],
      activeScenarioId: 's1',
      savedSnapshots: { s1: BASELINE_MODEL, s2: BASELINE_MODEL },
      persistedScenarioIds: new Set(['s1', 's2']),
    });
    mockDeleteScenario.mockRejectedValue(new Error('DB error'));

    await useFlowStore.getState().deleteScenarioFromDb('s2');

    expect(useFlowStore.getState().scenarioDeleteError).toBe('DB error');
    expect(useFlowStore.getState().isDeletingScenario).toBe(false);
  });

  it('fully rolls back active scenario delete on DB failure (restores editor state)', async () => {
    const modelA: SerializedModel = { nodes: [], edges: [], globalDemand: 42 };
    const modelB: SerializedModel = { nodes: [], edges: [], globalDemand: 99 };
    useFlowStore.setState({
      scenarios: [
        { id: 's1', name: 'Baseline', model: modelA },
        { id: 's2', name: 'What-If', model: modelB },
      ],
      activeScenarioId: 's1',
      globalDemand: 42,
      savedSnapshots: { s1: modelA, s2: modelB },
      persistedScenarioIds: new Set(['s1', 's2']),
    });
    mockDeleteScenario.mockRejectedValue(new Error('DB error'));

    await useFlowStore.getState().deleteScenarioFromDb('s1');

    // Active scenario should be restored to s1 with its editor state
    expect(useFlowStore.getState().activeScenarioId).toBe('s1');
    expect(useFlowStore.getState().globalDemand).toBe(42);
    expect(useFlowStore.getState().scenarios).toHaveLength(2);
  });

  it('removes scenario from persistedScenarioIds on successful delete', async () => {
    useFlowStore.setState({
      scenarios: [
        { id: 's1', name: 'Baseline', model: BASELINE_MODEL },
        { id: 's2', name: 'What-If', model: BASELINE_MODEL },
      ],
      activeScenarioId: 's1',
      savedSnapshots: { s1: BASELINE_MODEL, s2: BASELINE_MODEL },
      persistedScenarioIds: new Set(['s1', 's2']),
    });
    mockDeleteScenario.mockResolvedValue(undefined);

    await useFlowStore.getState().deleteScenarioFromDb('s2');

    expect(useFlowStore.getState().persistedScenarioIds.has('s2')).toBe(false);
    expect(useFlowStore.getState().persistedScenarioIds.has('s1')).toBe(true);
  });
});
