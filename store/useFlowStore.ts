import { create } from 'zustand';
import {
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  Edge,
  Connection,
  NodeChange,
  EdgeChange,
} from 'reactflow';
import { isValidConnection as checkConnection, validateGraph, ValidationResult } from '../lib/flow/validation';
import { calculateFlowDAG } from '../utils/calculations';
import { insertModel, updateModel, fetchModel } from '../lib/persistence';
import { getScenarios as fetchScenariosFromDb, createScenario, updateScenario as updateScenarioInDb } from '../lib/db/scenarios';
import type { ScenarioResults } from '../types/scenario';
import { classifyBottlenecks } from '../components/editor/nodes/processNodeStatus';
import type {
  FlowNode,
  FlowNodeType,
  SelectedElement,
  DerivedResults,
  SerializedModel,
  ProcessNodeData,
  SourceNodeData,
  SerializedNode,
  Scenario,
  EdgeData,
} from '../types/flow';

interface FlowState {
  nodes: FlowNode[];
  edges: Edge<EdgeData>[];
  selectedElement: SelectedElement;
  globalDemand: number;
  derivedResults: DerivedResults;
  validationResult: ValidationResult | null;
  scenarios: Scenario[];
  activeScenarioId: string;
  savedModelId: string | null;
  savedModelName: string;
  isSaving: boolean;
  saveError: string | null;
  /** Per-scenario snapshots keyed by scenario ID. Present = persisted in DB. */
  savedSnapshots: Record<string, SerializedModel>;
  isSavingScenario: boolean;
  scenarioSaveError: string | null;
}

interface FlowActions {
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;
  addNode: (node: FlowNode) => void;
  updateNodeData: (nodeId: string, data: Partial<ProcessNodeData>) => void;
  updateSourceNodeData: (nodeId: string, data: Partial<SourceNodeData>) => void;
  updateEdgeData: (edgeId: string, data: Partial<EdgeData>) => void;
  setGlobalDemand: (demand: number) => void;
  selectElement: (element: SelectedElement) => void;
  clearSelection: () => void;
  getSerializedModel: () => SerializedModel;
  duplicateActiveScenario: (name: string) => void;
  switchScenario: (id: string) => void;
  deleteScenario: (id: string) => void;
  saveAsNewModel: (name: string) => Promise<void>;
  updateSavedModel: () => Promise<void>;
  loadModel: (id: string) => Promise<void>;
  resetStore: () => void;
  loadScenariosFromDb: (modelId: string) => Promise<void>;
  saveScenarioToDb: () => Promise<void>;
  resetToSaved: () => void;
  hasUnsavedEdits: () => boolean;
}

type FlowStore = FlowState & FlowActions;

function isFlowNodeType(value: string | undefined): value is FlowNodeType {
  return value === 'source' || value === 'process' || value === 'sink';
}

function reconcileSelection(
  selection: SelectedElement,
  nodes: FlowNode[],
  edges: Edge[]
): SelectedElement {
  if (!selection) {
    return null;
  }

  if (selection.kind === 'node') {
    const node = nodes.find((candidate) => candidate.id === selection.id);
    if (!node || !isFlowNodeType(node.type)) {
      return null;
    }

    return {
      kind: 'node',
      id: node.id,
      nodeType: node.type,
    };
  }

  return edges.some((edge) => edge.id === selection.id) ? selection : null;
}

function serializeNode(node: FlowNode): SerializedNode {
  if (node.type === 'source') {
    return {
      id: node.id,
      type: 'source',
      position: node.position,
      data: node.data,
    };
  }

  if (node.type === 'process') {
    return {
      id: node.id,
      type: 'process',
      position: node.position,
      data: node.data,
    };
  }

  if (node.type === 'sink') {
    return {
      id: node.id,
      type: 'sink',
      position: node.position,
      data: node.data,
    };
  }

  throw new Error(`Cannot serialize node with unsupported type: ${String(node.type)}`);
}

const BASELINE_ID = 'baseline';
const BASELINE_MODEL: SerializedModel = { nodes: [], edges: [], globalDemand: 0 };

const useFlowStore = create<FlowStore>((set, get) => {
  const syncActiveScenario = () => {
    const { activeScenarioId, scenarios } = get();
    const model = get().getSerializedModel();
    set({
      scenarios: scenarios.map((s) =>
        s.id === activeScenarioId ? { ...s, model } : s
      ),
    });
  };

  return {
    nodes: [],
    edges: [],
    selectedElement: null,
    globalDemand: 0,
    derivedResults: null,
    validationResult: null,
    scenarios: [{ id: BASELINE_ID, name: 'Baseline', model: BASELINE_MODEL }],
    activeScenarioId: BASELINE_ID,
    savedModelId: null,
    savedModelName: '',
    isSaving: false,
    saveError: null,
    savedSnapshots: {},
    isSavingScenario: false,
    scenarioSaveError: null,

    onNodesChange: (changes) => {
      const currentState = get();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const nextNodes = applyNodeChanges(changes, currentState.nodes as any) as FlowNode[];

      set({
        nodes: nextNodes,
        selectedElement: reconcileSelection(
          currentState.selectedElement,
          nextNodes,
          currentState.edges
        ),
      });

      if (changes.some((c) => c.type === 'remove')) {
        const { nodes: n, edges: e } = get();
        set({ derivedResults: calculateFlowDAG(get().getSerializedModel()), validationResult: validateGraph(n, e) });
      }

      syncActiveScenario();
    },

    onEdgesChange: (changes) => {
      const currentState = get();

      const removedEdgeIds = new Set(
        changes.filter(c => c.type === 'remove').map(c => c.id)
      );
      let nextNodes = currentState.nodes;
      if (removedEdgeIds.size > 0) {
        // Build a per-target map of which edge IDs were removed from that node
        const removedByTarget = new Map<string, Set<string>>();
        for (const e of currentState.edges) {
          if (removedEdgeIds.has(e.id)) {
            if (!removedByTarget.has(e.target)) removedByTarget.set(e.target, new Set());
            removedByTarget.get(e.target)!.add(e.id);
          }
        }
        nextNodes = currentState.nodes.map(n => {
          if (n.type !== 'process') return n;
          const edgesToRemove = removedByTarget.get(n.id);
          if (!edgesToRemove) return n;
          const { bomRatios } = n.data;
          if (!bomRatios) return n;
          const cleaned = { ...bomRatios };
          edgesToRemove.forEach(id => delete cleaned[id]);
          const next = Object.keys(cleaned).length > 0 ? cleaned : undefined;
          return { ...n, data: { ...n.data, bomRatios: next } } as FlowNode;
        });
      }

      const nextEdges = applyEdgeChanges(changes, currentState.edges) as Edge<EdgeData>[];

      set({
        nodes: nextNodes,
        edges: nextEdges,
        selectedElement: reconcileSelection(
          currentState.selectedElement,
          nextNodes,
          nextEdges
        ),
      });

      if (changes.some((c) => c.type === 'add' || c.type === 'remove')) {
        const { nodes: n, edges: e } = get();
        set({ derivedResults: calculateFlowDAG(get().getSerializedModel()), validationResult: validateGraph(n, e) });
      }

      syncActiveScenario();
    },

    onConnect: (connection) => {
      const { nodes, edges } = get();
      if (!checkConnection(connection, nodes, edges)) return;
      const newEdges = addEdge(connection, edges);
      set({ edges: newEdges });

      // Auto-initialize BOM ratios for merge nodes
      const targetNode = nodes.find((n) => n.id === connection.target);
      if (targetNode && targetNode.type === 'process') {
        const incomingRealEdges = newEdges.filter(
          (e) => e.target === connection.target && !e.data?.isScrap
        );
        if (incomingRealEdges.length >= 2) {
          const targetData = targetNode.data as ProcessNodeData;
          const missingEdgeIds = incomingRealEdges
            .filter((e) => !targetData.bomRatios?.[e.id])
            .map((e) => e.id);

          if (missingEdgeIds.length > 0) {
            const initialized = { ...(targetData.bomRatios ?? {}) };
            missingEdgeIds.forEach((edgeId) => {
              initialized[edgeId] = 1;
            });
            set({
              nodes: nodes.map((n) =>
                n.id === connection.target && n.type === 'process'
                  ? { ...n, data: { ...n.data, bomRatios: initialized } }
                  : n
              ) as FlowNode[],
            });
          }
        }
      }

      const { nodes: n, edges: e } = get();
      set({ derivedResults: calculateFlowDAG(get().getSerializedModel()), validationResult: validateGraph(n, e) });
      syncActiveScenario();
    },

    addNode: (node) => {
      set({ nodes: [...get().nodes, node] });
      const { nodes: n, edges: e } = get();
      set({ derivedResults: calculateFlowDAG(get().getSerializedModel()), validationResult: validateGraph(n, e) });
      syncActiveScenario();
    },

    updateNodeData: (nodeId, data) => {
      set({
        nodes: get().nodes.map((n) =>
          n.id === nodeId && n.type === 'process'
            ? { ...n, data: { ...n.data, ...data } }
            : n
        ) as FlowNode[],
      });
      const { nodes: n, edges: e } = get();
      set({ derivedResults: calculateFlowDAG(get().getSerializedModel()), validationResult: validateGraph(n, e) });
      syncActiveScenario();
    },

    updateSourceNodeData: (nodeId, data) => {
      set({
        nodes: get().nodes.map((n) =>
          n.id === nodeId && n.type === 'source'
            ? { ...n, data: { ...n.data, ...data } }
            : n
        ) as FlowNode[],
      });
      syncActiveScenario();
    },

    updateEdgeData: (edgeId, data) => {
      set({
        edges: get().edges.map((e) =>
          e.id === edgeId ? { ...e, data: { ...e.data, ...data } } : e
        ),
      });
      const { nodes: n, edges: e } = get();
      set({ derivedResults: calculateFlowDAG(get().getSerializedModel()), validationResult: validateGraph(n, e) });
      syncActiveScenario();
    },

    setGlobalDemand: (demand) => {
      set({ globalDemand: demand });
      const { nodes: n, edges: e } = get();
      set({ derivedResults: calculateFlowDAG(get().getSerializedModel()), validationResult: validateGraph(n, e) });
      syncActiveScenario();
    },

    selectElement: (element) => {
      set({ selectedElement: element });
    },

    clearSelection: () => {
      set({ selectedElement: null });
    },

    getSerializedModel: () => {
      const { nodes, edges, globalDemand } = get();
      return {
        nodes: nodes.map(serializeNode),
        edges: edges.map(({ id, source, target, data }) => ({ id, source, target, data })),
        globalDemand,
      };
    },

    duplicateActiveScenario: (name) => {
      const model = get().getSerializedModel();
      const newScenario: Scenario = { id: crypto.randomUUID(), name, model };
      set({ scenarios: [...get().scenarios, newScenario] });
    },

    switchScenario: (id) => {
      const target = get().scenarios.find((s) => s.id === id);
      if (!target) return;
      // Deep-clone via JSON round-trip to prevent nested-object reference sharing
      const model: SerializedModel = JSON.parse(JSON.stringify(target.model));
      const nextNodes = model.nodes.map((n) => ({ ...n })) as FlowNode[];
      const nextEdges = model.edges.map((e) => ({ ...e }));
      set({
        nodes: nextNodes,
        edges: nextEdges,
        globalDemand: model.globalDemand,
        activeScenarioId: id,
        selectedElement: null,
        derivedResults: calculateFlowDAG(model),
        validationResult: validateGraph(nextNodes, nextEdges),
      });
    },

    deleteScenario: (id) => {
      const { scenarios, activeScenarioId } = get();
      if (scenarios.length <= 1) return;
      const next = scenarios.filter((s) => s.id !== id);
      if (id === activeScenarioId) {
        get().switchScenario(next[0].id);
      }
      set({ scenarios: get().scenarios.filter((s) => s.id !== id) });
    },

    saveAsNewModel: async (name) => {
      set({ isSaving: true, saveError: null });
      try {
        const model = get().getSerializedModel();
        const modelId = await insertModel(name, model);
        // Create baseline scenario row for the new model
        const scenarioId = await createScenario({ model_id: modelId, name: 'Baseline', data: model });
        const snapshot = JSON.parse(JSON.stringify(model));
        set({
          savedModelId: modelId,
          savedModelName: name,
          isSaving: false,
          scenarios: [{ id: scenarioId, name: 'Baseline', model }],
          activeScenarioId: scenarioId,
          savedSnapshots: { [scenarioId]: snapshot },
        });
      } catch (err) {
        set({ isSaving: false, saveError: (err as Error).message });
      }
    },

    updateSavedModel: async () => {
      const { savedModelId } = get();
      if (!savedModelId) return;
      set({ isSaving: true, saveError: null });
      try {
        const model = get().getSerializedModel();
        await updateModel(savedModelId, model);
        set({ isSaving: false });
      } catch (err) {
        set({ isSaving: false, saveError: (err as Error).message });
      }
    },

    resetStore: () => {
      set({
        nodes: [],
        edges: [],
        selectedElement: null,
        globalDemand: 0,
        derivedResults: null,
        validationResult: null,
        scenarios: [{ id: BASELINE_ID, name: 'Baseline', model: BASELINE_MODEL }],
        activeScenarioId: BASELINE_ID,
        savedModelId: null,
        savedModelName: '',
        isSaving: false,
        saveError: null,
        savedSnapshots: {},
        isSavingScenario: false,
        scenarioSaveError: null,
      });
    },

    loadModel: async (id) => {
      // Clear canvas immediately so stale state is never visible if load fails
      set({
        nodes: [],
        edges: [],
        selectedElement: null,
        globalDemand: 0,
        derivedResults: null,
        validationResult: null,
        savedModelId: null,
        savedModelName: '',
        scenarios: [{ id: BASELINE_ID, name: 'Baseline', model: BASELINE_MODEL }],
        activeScenarioId: BASELINE_ID,
        isSaving: true,
        saveError: null,
        savedSnapshots: {},
        isSavingScenario: false,
        scenarioSaveError: null,
      });
      try {
        const row = await fetchModel(id);
        const model: SerializedModel = JSON.parse(JSON.stringify(row.data));
        const nextNodes = model.nodes.map((n) => ({ ...n })) as FlowNode[];
        const nextEdges = model.edges.map((e) => ({ ...e }));
        set({
          nodes: nextNodes,
          edges: nextEdges,
          globalDemand: model.globalDemand,
          derivedResults: calculateFlowDAG(model),
          validationResult: validateGraph(nextNodes, nextEdges),
          selectedElement: null,
          savedModelId: id,
          savedModelName: row.name,
          isSaving: false,
          scenarios: [{ id: BASELINE_ID, name: 'Baseline', model }],
          activeScenarioId: BASELINE_ID,
          savedSnapshots: { [BASELINE_ID]: JSON.parse(JSON.stringify(model)) },
        });
        await get().loadScenariosFromDb(id);
      } catch (err) {
        set({ isSaving: false, saveError: (err as Error).message });
      }
    },

    loadScenariosFromDb: async (modelId) => {
      try {
        const dbScenarios = await fetchScenariosFromDb(modelId);
        if (dbScenarios.length === 0) {
          // Legacy model with no saved scenarios — create Baseline from current state
          const model = get().getSerializedModel();
          const newId = await createScenario({ model_id: modelId, name: 'Baseline', data: model });
          set({
            scenarios: [{ id: newId, name: 'Baseline', model }],
            activeScenarioId: newId,
            savedSnapshots: { [newId]: JSON.parse(JSON.stringify(model)) },
          });
        } else {
          const scenarios: Scenario[] = dbScenarios.map((s) => ({
            id: s.id,
            name: s.name,
            model: s.data,
          }));
          // Build per-scenario saved snapshots from DB state
          const snapshots: Record<string, SerializedModel> = {};
          for (const s of dbScenarios) {
            snapshots[s.id] = JSON.parse(JSON.stringify(s.data));
          }
          const firstModel: SerializedModel = JSON.parse(JSON.stringify(scenarios[0].model));
          const nextNodes = firstModel.nodes.map((n) => ({ ...n })) as FlowNode[];
          const nextEdges = firstModel.edges.map((e) => ({ ...e }));
          // Results from DB are intentionally not loaded into derivedResults —
          // we recompute from data so the active simulation is always fresh.
          // Stored results will be used by the comparison view (Phase 8-10).
          set({
            scenarios,
            activeScenarioId: scenarios[0].id,
            nodes: nextNodes,
            edges: nextEdges,
            globalDemand: firstModel.globalDemand,
            derivedResults: calculateFlowDAG(firstModel),
            validationResult: validateGraph(nextNodes, nextEdges),
            savedSnapshots: snapshots,
          });
        }
      } catch {
        // Scenario loading is non-fatal — the model is already on canvas
      }
    },

    saveScenarioToDb: async () => {
      const { activeScenarioId, savedModelId, savedSnapshots, nodes } = get();
      if (!savedModelId) return;
      set({ isSavingScenario: true, scenarioSaveError: null });
      try {
        const model = get().getSerializedModel();
        const { derivedResults } = get();
        // Use classifyBottlenecks for correct multi-bottleneck detection
        const results: ScenarioResults | null = derivedResults
          ? {
              throughput: derivedResults.systemThroughput,
              bottleneck_node_ids: classifyBottlenecks(nodes, derivedResults.nodeResults).bottleneckNodeIds,
              utilization: Object.fromEntries(
                Object.entries(derivedResults.nodeResults).map(([id, r]) => [id, r.utilization])
              ),
            }
          : null;
        const isNewScenario = !(activeScenarioId in savedSnapshots);
        if (isNewScenario) {
          // Scenario has no DB row yet — INSERT
          const newId = await createScenario({ model_id: savedModelId, name: get().scenarios.find(s => s.id === activeScenarioId)?.name ?? 'Untitled', data: model, results });
          // Update the in-memory scenario to use the DB-generated ID
          const snapshot = JSON.parse(JSON.stringify(model));
          set({
            scenarios: get().scenarios.map(s => s.id === activeScenarioId ? { ...s, id: newId } : s),
            activeScenarioId: newId,
            savedSnapshots: { ...get().savedSnapshots, [newId]: snapshot },
            isSavingScenario: false,
          });
        } else {
          // Scenario exists in DB — UPDATE
          await updateScenarioInDb(activeScenarioId, { data: model, results });
          const snapshot = JSON.parse(JSON.stringify(model));
          set({
            isSavingScenario: false,
            savedSnapshots: { ...get().savedSnapshots, [activeScenarioId]: snapshot },
          });
        }
      } catch (err) {
        set({ isSavingScenario: false, scenarioSaveError: (err as Error).message });
      }
    },

    resetToSaved: () => {
      const { savedSnapshots, activeScenarioId } = get();
      const snapshot = savedSnapshots[activeScenarioId];
      if (!snapshot) return;
      const model: SerializedModel = JSON.parse(JSON.stringify(snapshot));
      const nextNodes = model.nodes.map((n) => ({ ...n })) as FlowNode[];
      const nextEdges = model.edges.map((e) => ({ ...e }));
      set({
        nodes: nextNodes,
        edges: nextEdges,
        globalDemand: model.globalDemand,
        selectedElement: null,
        derivedResults: calculateFlowDAG(model),
        validationResult: validateGraph(nextNodes, nextEdges),
      });
      syncActiveScenario();
    },

    hasUnsavedEdits: () => {
      const { savedSnapshots, activeScenarioId } = get();
      const snapshot = savedSnapshots[activeScenarioId];
      if (!snapshot) return true; // Never saved → always dirty
      return JSON.stringify(get().getSerializedModel()) !== JSON.stringify(snapshot);
    },
  };
});

export default useFlowStore;
