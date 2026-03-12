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
import { isValidConnection as checkConnection } from '../components/editor/validation';
import type {
  FlowNode,
  FlowNodeType,
  SelectedElement,
  DerivedResults,
  SerializedModel,
  ProcessNodeData,
  SerializedNode,
} from '../types/flow';

interface FlowState {
  nodes: FlowNode[];
  edges: Edge[];
  selectedElement: SelectedElement;
  globalDemand: number;
  derivedResults: DerivedResults;
}

interface FlowActions {
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;
  addNode: (node: FlowNode) => void;
  updateNodeData: (nodeId: string, data: Partial<ProcessNodeData>) => void;
  setGlobalDemand: (demand: number) => void;
  selectElement: (element: SelectedElement) => void;
  clearSelection: () => void;
  getSerializedModel: () => SerializedModel;
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

const useFlowStore = create<FlowStore>((set, get) => ({
  nodes: [],
  edges: [],
  selectedElement: null,
  globalDemand: 0,
  derivedResults: null,

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
  },

  onEdgesChange: (changes) => {
    const currentState = get();
    const nextEdges = applyEdgeChanges(changes, currentState.edges);

    set({
      edges: nextEdges,
      selectedElement: reconcileSelection(
        currentState.selectedElement,
        currentState.nodes,
        nextEdges
      ),
    });
  },

  onConnect: (connection) => {
    const { nodes, edges } = get();
    if (!checkConnection(connection, nodes, edges)) return;
    set({ edges: addEdge(connection, edges) });
  },

  addNode: (node) => {
    set({ nodes: [...get().nodes, node] });
  },

  updateNodeData: (nodeId, data) => {
    set({
      nodes: get().nodes.map((node) =>
        node.id === nodeId && node.type === 'process'
          ? { ...node, data: { ...node.data, ...data } }
          : node
      ) as FlowNode[],
    });
  },

  setGlobalDemand: (demand) => {
    set({ globalDemand: demand });
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
      edges: edges.map(({ id, source, target }) => ({ id, source, target })),
      globalDemand,
    };
  },
}));

export default useFlowStore;
