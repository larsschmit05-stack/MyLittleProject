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
import { isValidConnection as checkConnection } from '../lib/flow/validation';
import { calculateFlow } from '../utils/calculations';
import { insertModel, updateModel, fetchModel } from '../lib/persistence';
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
  scenarios: Scenario[];
  activeScenarioId: string;
  savedModelId: string | null;
  savedModelName: string;
  isSaving: boolean;
  saveError: string | null;
}

interface FlowActions {
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;
  addNode: (node: FlowNode) => void;
  updateNodeData: (nodeId: string, data: Partial<ProcessNodeData>) => void;
  updateSourceNodeData: (nodeId: string, data: Partial<SourceNodeData>) => void;
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
    scenarios: [{ id: BASELINE_ID, name: 'Baseline', model: BASELINE_MODEL }],
    activeScenarioId: BASELINE_ID,
    savedModelId: null,
    savedModelName: '',
    isSaving: false,
    saveError: null,

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
        set({ derivedResults: calculateFlow(get().getSerializedModel()) });
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
        set({ derivedResults: calculateFlow(get().getSerializedModel()) });
      }

      syncActiveScenario();
    },

    onConnect: (connection) => {
      const { nodes, edges } = get();
      if (!checkConnection(connection, nodes, edges)) return;
      set({ edges: addEdge(connection, edges) });
      set({ derivedResults: calculateFlow(get().getSerializedModel()) });
      syncActiveScenario();
    },

    addNode: (node) => {
      set({ nodes: [...get().nodes, node] });
      set({ derivedResults: calculateFlow(get().getSerializedModel()) });
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
      set({ derivedResults: calculateFlow(get().getSerializedModel()) });
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

    setGlobalDemand: (demand) => {
      set({ globalDemand: demand });
      set({ derivedResults: calculateFlow(get().getSerializedModel()) });
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
        derivedResults: calculateFlow(model),
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
        const id = await insertModel(name, model);
        set({ savedModelId: id, savedModelName: name, isSaving: false });
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
        scenarios: [{ id: BASELINE_ID, name: 'Baseline', model: BASELINE_MODEL }],
        activeScenarioId: BASELINE_ID,
        savedModelId: null,
        savedModelName: '',
        isSaving: false,
        saveError: null,
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
        savedModelId: null,
        savedModelName: '',
        scenarios: [{ id: BASELINE_ID, name: 'Baseline', model: BASELINE_MODEL }],
        activeScenarioId: BASELINE_ID,
        isSaving: true,
        saveError: null,
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
          derivedResults: calculateFlow(model),
          selectedElement: null,
          savedModelId: id,
          savedModelName: row.name,
          isSaving: false,
          scenarios: [{ id: BASELINE_ID, name: 'Baseline', model }],
          activeScenarioId: BASELINE_ID,
        });
      } catch (err) {
        set({ isSaving: false, saveError: (err as Error).message });
      }
    },
  };
});

export default useFlowStore;
