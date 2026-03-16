'use client';

import { useEffect, useState } from 'react';
import useFlowStore from '../../store/useFlowStore';
import type { ProcessNodeData, SourceNodeData } from '../../types/flow';
import { isProcessValueValid } from '../../lib/flow/validation';
import {
  panelLabelStyle,
  panelInputStyle,
  panelInvalidInputStyle,
  panelSectionHeadingStyle,
  panelFieldGroupStyle,
  panelDividerStyle,
} from './styles';
import ScenarioManager from './ScenarioManager';

// ─── Global Demand ────────────────────────────────────────────────────────────

function GlobalDemandSection() {
  const globalDemand = useFlowStore((s) => s.globalDemand);
  const setGlobalDemand = useFlowStore((s) => s.setGlobalDemand);
  const [raw, setRaw] = useState(String(globalDemand));

  // Keep local string in sync if store value changes externally
  useEffect(() => {
    setRaw(String(globalDemand));
  }, [globalDemand]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const str = e.target.value;
    setRaw(str);
    const n = parseFloat(str);
    if (isFinite(n)) setGlobalDemand(n);
  }

  function handleBlur() {
    const n = parseFloat(raw);
    if (!isFinite(n)) setRaw(String(globalDemand));
  }

  return (
    <section>
      <h2 style={panelSectionHeadingStyle}>Global Demand</h2>
      <div style={panelFieldGroupStyle}>
        <label style={panelLabelStyle} htmlFor="global-demand">
          Units for the same period as Available Time
        </label>
        <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: 'var(--color-text-secondary)' }}>
          Example: if Available Time is weekly hours, demand is units per week.
        </p>
        <input
          id="global-demand"
          type="number"
          value={raw}
          onChange={handleChange}
          onBlur={handleBlur}
          style={panelInputStyle}
          onFocus={(e) => (e.target.style.outline = '2px solid var(--color-action)')}
          onBlurCapture={(e) => (e.target.style.outline = 'none')}
        />
      </div>
    </section>
  );
}

// ─── Process Form ─────────────────────────────────────────────────────────────

interface ProcessFormProps {
  nodeId: string;
  data: ProcessNodeData;
}

type NumericField = 'throughputRate' | 'availableTime' | 'yield' | 'numberOfResources' | 'conversionRatio';

const FIELD_HELP_TEXT: Record<NumericField, string> = {
  throughputRate: 'Throughput Rate must be greater than 0.',
  availableTime: 'Available Time must be 0 or greater.',
  yield: 'Yield must be greater than 0 and at most 100.',
  numberOfResources: 'Number of Resources must be at least 1.',
  conversionRatio: 'Conversion Ratio must be greater than 0.',
};

const NUMERIC_FIELDS: { key: NumericField; label: string }[] = [
  { key: 'throughputRate', label: 'Throughput Rate (units/hr)' },
  { key: 'availableTime', label: 'Available Time (hours in the demand period)' },
  { key: 'yield', label: 'Yield (%)' },
  { key: 'numberOfResources', label: 'Number of Resources' },
  { key: 'conversionRatio', label: 'Conversion Ratio (input units per output unit)' },
];

// ─── BOM Section ──────────────────────────────────────────────────────────────

function BomSection({ nodeId, data }: { nodeId: string; data: ProcessNodeData }) {
  const edges = useFlowStore((s) => s.edges);
  const nodes = useFlowStore((s) => s.nodes);
  const updateNodeData = useFlowStore((s) => s.updateNodeData);

  const incomingReal = edges.filter((e) => e.target === nodeId && !e.data?.isScrap);

  const [rawValues, setRawValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(incomingReal.map((e) => [e.id, String(data.bomRatios?.[e.id] ?? 1)]))
  );
  const [invalidEdges, setInvalidEdges] = useState<Set<string>>(new Set());

  if (incomingReal.length < 2) return null;

  function handleChange(edgeId: string, str: string) {
    setRawValues((prev) => ({ ...prev, [edgeId]: str }));
    const n = parseFloat(str);
    if (isFinite(n) && n > 0) {
      setInvalidEdges((prev) => {
        const next = new Set(prev);
        next.delete(edgeId);
        return next;
      });
      updateNodeData(nodeId, { bomRatios: { ...data.bomRatios, [edgeId]: n } });
    } else {
      setInvalidEdges((prev) => new Set(prev).add(edgeId));
    }
  }

  function handleBlur(edgeId: string) {
    if (invalidEdges.has(edgeId)) {
      setRawValues((prev) => ({ ...prev, [edgeId]: String(data.bomRatios?.[edgeId] ?? 1) }));
      setInvalidEdges((prev) => {
        const next = new Set(prev);
        next.delete(edgeId);
        return next;
      });
    }
  }

  return (
    <div>
      <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)', margin: '16px 0' }} />
      <h3
        style={{
          fontSize: '12px',
          fontWeight: 500,
          color: 'var(--color-text-label)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          margin: '0 0 4px 0',
        }}
      >
        Bill of Materials
      </h3>
      <p style={{ margin: '0 0 12px 0', fontSize: '12px', color: 'var(--color-text-secondary)' }}>
        Units of this input required per 1 unit of output
      </p>
      {incomingReal.map((edge) => {
        const sourceNode = nodes.find((n) => n.id === edge.source);
        const sourceName =
          sourceNode?.type === 'process'
            ? (sourceNode.data as ProcessNodeData).name
            : sourceNode?.type === 'source'
              ? (sourceNode.data as SourceNodeData).label
              : edge.source;
        const isInvalid = invalidEdges.has(edge.id);
        const currentRaw = rawValues[edge.id] ?? String(data.bomRatios?.[edge.id] ?? 1);

        return (
          <div key={edge.id} style={panelFieldGroupStyle}>
            <label style={panelLabelStyle}>From: {sourceName}</label>
            <input
              type="number"
              value={currentRaw}
              min={0.001}
              step={0.1}
              style={isInvalid ? panelInvalidInputStyle : panelInputStyle}
              onFocus={(e) => (e.target.style.outline = '2px solid var(--color-action)')}
              onBlurCapture={(e) => (e.target.style.outline = 'none')}
              onChange={(e) => handleChange(edge.id, e.target.value)}
              onBlur={() => handleBlur(edge.id)}
            />
            {isInvalid && (
              <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--color-bottleneck)' }}>
                Ratio must be greater than 0
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ProcessForm({ nodeId, data }: ProcessFormProps) {
  const updateNodeData = useFlowStore((s) => s.updateNodeData);
  const edges = useFlowStore((s) => s.edges);

  const [name, setName] = useState(data.name);
  const [rawValues, setRawValues] = useState<Record<NumericField, string>>({
    throughputRate: String(data.throughputRate),
    availableTime: String(data.availableTime),
    yield: String(data.yield),
    numberOfResources: String(data.numberOfResources),
    conversionRatio: String(data.conversionRatio),
  });
  const [invalidFields, setInvalidFields] = useState<Partial<Record<NumericField, string>>>({});
  const [outputMaterial, setOutputMaterial] = useState(data.outputMaterial ?? '');

  // Sync local state when data prop changes (e.g., after updateNodeData recalculates results)
  useEffect(() => {
    setName(data.name);
    setRawValues({
      throughputRate: String(data.throughputRate),
      availableTime: String(data.availableTime),
      yield: String(data.yield),
      numberOfResources: String(data.numberOfResources),
      conversionRatio: String(data.conversionRatio),
    });
    setOutputMaterial(data.outputMaterial ?? '');
  }, [data]);

  // Check if this is a merge node (2+ incoming real edges)
  const incomingReal = edges.filter((e) => e.target === nodeId && !e.data?.isScrap);
  const isMergeNode = incomingReal.length >= 2;

  // Hide conversionRatio for merge nodes since BOM ratios replace it
  const visibleNumericFields = NUMERIC_FIELDS.filter(
    ({ key }) => {
      // Show all fields for non-merge nodes; hide conversionRatio only for merge nodes
      if (isMergeNode && key === 'conversionRatio') return false;
      return true;
    }
  );

  function handleNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    setName(value);
    updateNodeData(nodeId, { name: value });
  }

  function handleNumericChange(field: NumericField, str: string) {
    setRawValues((prev) => ({ ...prev, [field]: str }));
    const n = parseFloat(str);

    if (!isFinite(n)) {
      setInvalidFields((prev) => ({ ...prev, [field]: FIELD_HELP_TEXT[field] }));
      return;
    }

    if (!isProcessValueValid(field, n)) {
      setInvalidFields((prev) => ({ ...prev, [field]: FIELD_HELP_TEXT[field] }));
      return;
    }

    setInvalidFields((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
    updateNodeData(nodeId, { [field]: n });
  }

  function handleNumericBlur(field: NumericField) {
    const n = parseFloat(rawValues[field]);
    if (!isFinite(n) || !isProcessValueValid(field, n)) {
      setRawValues((prev) => ({ ...prev, [field]: String(data[field]) }));
      setInvalidFields((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  }

  function handleOutputMaterialChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    setOutputMaterial(value);
    updateNodeData(nodeId, { outputMaterial: value || undefined });
  }

  return (
    <section>
      <h2 style={panelSectionHeadingStyle}>Process Node</h2>

      <div style={panelFieldGroupStyle}>
        <label style={panelLabelStyle} htmlFor={`${nodeId}-name`}>
          Name
        </label>
        <input
          id={`${nodeId}-name`}
          type="text"
          value={name}
          onChange={handleNameChange}
          style={panelInputStyle}
          onFocus={(e) => (e.target.style.outline = '2px solid var(--color-action)')}
          onBlur={(e) => (e.target.style.outline = 'none')}
        />
      </div>

      {visibleNumericFields.map(({ key, label }) => (
        <div key={key} style={panelFieldGroupStyle}>
          <label style={panelLabelStyle} htmlFor={`${nodeId}-${key}`}>
            {label}
          </label>
          <input
            id={`${nodeId}-${key}`}
            type="number"
            value={rawValues[key]}
            onChange={(e) => handleNumericChange(key, e.target.value)}
            onBlur={() => handleNumericBlur(key)}
            style={invalidFields[key] ? panelInvalidInputStyle : panelInputStyle}
            onFocus={(e) => (e.target.style.outline = '2px solid var(--color-action)')}
            onBlurCapture={(e) => (e.target.style.outline = 'none')}
          />
          {invalidFields[key] ? (
            <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--color-bottleneck)' }}>
              {invalidFields[key]}
            </p>
          ) : null}
        </div>
      ))}

      <BomSection nodeId={nodeId} data={data} />

      <div style={{ ...panelFieldGroupStyle, marginTop: '16px' }}>
        <label style={panelLabelStyle} htmlFor={`${nodeId}-outputMaterial`}>
          Output Material (optional)
        </label>
        <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: 'var(--color-text-secondary)' }}>
          What does this node produce? (e.g., &lsquo;Cut Steel&rsquo;, &lsquo;Assembled Unit&rsquo;)
        </p>
        <input
          id={`${nodeId}-outputMaterial`}
          type="text"
          value={outputMaterial}
          onChange={handleOutputMaterialChange}
          style={panelInputStyle}
          placeholder="e.g. Widget A"
          onFocus={(e) => (e.target.style.outline = '2px solid var(--color-action)')}
          onBlur={(e) => (e.target.style.outline = 'none')}
        />
      </div>
    </section>
  );
}

// ─── Source Form ──────────────────────────────────────────────────────────────

function SourceForm({ nodeId, data }: { nodeId: string; data: SourceNodeData }) {
  const updateSourceNodeData = useFlowStore((s) => s.updateSourceNodeData);
  const [label, setLabel] = useState(data.label);
  const [outputMaterial, setOutputMaterial] = useState(data.outputMaterial ?? '');

  function handleLabelChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    setLabel(value);
    updateSourceNodeData(nodeId, { label: value });
  }

  function handleOutputMaterialChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    setOutputMaterial(value);
    updateSourceNodeData(nodeId, { outputMaterial: value || undefined });
  }

  return (
    <section>
      <h2 style={panelSectionHeadingStyle}>Source Node</h2>

      <div style={panelFieldGroupStyle}>
        <label style={panelLabelStyle} htmlFor={`${nodeId}-label`}>
          Label
        </label>
        <input
          id={`${nodeId}-label`}
          type="text"
          value={label}
          onChange={handleLabelChange}
          style={panelInputStyle}
          onFocus={(e) => (e.target.style.outline = '2px solid var(--color-action)')}
          onBlur={(e) => (e.target.style.outline = 'none')}
        />
      </div>

      <div style={panelFieldGroupStyle}>
        <label style={panelLabelStyle} htmlFor={`${nodeId}-outputMaterial`}>
          Output Material (optional)
        </label>
        <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: 'var(--color-text-secondary)' }}>
          What raw material does this source provide? (e.g., &lsquo;Raw Steel&rsquo;)
        </p>
        <input
          id={`${nodeId}-outputMaterial`}
          type="text"
          value={outputMaterial}
          onChange={handleOutputMaterialChange}
          style={panelInputStyle}
          placeholder="e.g. Raw Material"
          onFocus={(e) => (e.target.style.outline = '2px solid var(--color-action)')}
          onBlur={(e) => (e.target.style.outline = 'none')}
        />
      </div>
    </section>
  );
}

// ─── Edge Form ────────────────────────────────────────────────────────────────

function EdgeForm({ edgeId }: { edgeId: string }) {
  const edges = useFlowStore((s) => s.edges);
  const nodes = useFlowStore((s) => s.nodes);
  const updateEdgeData = useFlowStore((s) => s.updateEdgeData);

  const edge = edges.find((e) => e.id === edgeId);

  // useState must be called unconditionally (rules of hooks)
  const [rawSplitRatio, setRawSplitRatio] = useState(String(edge?.data?.splitRatio ?? ''));

  if (!edge) return null;

  const sourceNode = nodes.find((n) => n.id === edge.source);
  const targetNode = nodes.find((n) => n.id === edge.target);

  function getNodeName(node: typeof sourceNode): string {
    if (!node) return '?';
    if (node.type === 'process') return (node.data as ProcessNodeData).name;
    if (node.type === 'source') return (node.data as SourceNodeData).label;
    return node.type ?? '?';
  }

  const sourceName = getNodeName(sourceNode);
  const targetName = getNodeName(targetNode);

  const sourceOutgoingCount = edges.filter((e) => e.source === edge.source).length;
  const showSplitRatio = sourceOutgoingCount >= 2;

  const isScrap = edge.data?.isScrap === true;

  function handleScrapToggle() {
    updateEdgeData(edgeId, { isScrap: !isScrap });
  }

  function handleSplitRatioChange(e: React.ChangeEvent<HTMLInputElement>) {
    const str = e.target.value;
    setRawSplitRatio(str);
    const n = parseFloat(str);
    if (isFinite(n) && n >= 0 && n <= 100) {
      updateEdgeData(edgeId, { splitRatio: n });
    }
  }

  function handleSplitRatioBlur() {
    const n = parseFloat(rawSplitRatio);
    if (!isFinite(n) || n < 0 || n > 100) {
      setRawSplitRatio(String(edge!.data?.splitRatio ?? ''));
    }
  }

  return (
    <section>
      <h2 style={panelSectionHeadingStyle}>Edge</h2>
      <p
        style={{
          fontSize: '13px',
          color: 'var(--color-text-secondary)',
          marginBottom: '16px',
        }}
      >
        {sourceName} → {targetName}
      </p>

      <div style={{ ...panelFieldGroupStyle, display: 'flex', alignItems: 'center', gap: '8px' }}>
        <input
          id={`${edgeId}-scrap`}
          type="checkbox"
          checked={isScrap}
          onChange={handleScrapToggle}
          style={{ width: '16px', height: '16px', cursor: 'pointer' }}
        />
        <label
          htmlFor={`${edgeId}-scrap`}
          style={{ ...panelLabelStyle, marginBottom: 0, cursor: 'pointer' }}
        >
          Scrap edge (excluded from demand propagation)
        </label>
      </div>

      {showSplitRatio && (
        <div style={panelFieldGroupStyle}>
          <label style={panelLabelStyle} htmlFor={`${edgeId}-splitRatio`}>
            Split Ratio (%)
          </label>
          <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: 'var(--color-text-secondary)' }}>
            Percentage of output routed along this edge. All real outputs from the same node should sum to 100%.
          </p>
          <input
            id={`${edgeId}-splitRatio`}
            type="number"
            value={rawSplitRatio}
            min={0}
            max={100}
            step={1}
            onChange={handleSplitRatioChange}
            onBlur={handleSplitRatioBlur}
            style={panelInputStyle}
            onFocus={(e) => (e.target.style.outline = '2px solid var(--color-action)')}
            onBlurCapture={(e) => (e.target.style.outline = 'none')}
          />
        </div>
      )}
    </section>
  );
}

// ─── Results Summary ──────────────────────────────────────────────────────────

function fmt(n: number): string {
  return isFinite(n) ? n.toFixed(2) : 'N/A';
}

function fmtPct(n: number): string {
  return isFinite(n) ? (n * 100).toFixed(1) + '%' : 'N/A';
}

const resultRowStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  fontSize: '13px',
  marginBottom: '6px',
} as const;

const resultLabelStyle = {
  color: 'var(--color-text-secondary)',
} as const;

const resultValueStyle = {
  fontWeight: 500,
  color: 'var(--color-text-primary)',
} as const;

function ResultsSummary() {
  const derivedResults = useFlowStore((s) => s.derivedResults);
  const validationResult = useFlowStore((s) => s.validationResult);
  const selectedElement = useFlowStore((s) => s.selectedElement);
  const nodes = useFlowStore((s) => s.nodes);

  const isEmpty =
    !derivedResults ||
    (derivedResults.systemThroughput === 0 &&
      derivedResults.bottleneckNodeId === null &&
      Object.keys(derivedResults.nodeResults).length === 0);

  const bottleneckName = derivedResults?.bottleneckNodeId
    ? (nodes.find((n) => n.id === derivedResults.bottleneckNodeId)?.data as ProcessNodeData)?.name ??
      '—'
    : '—';

  const selectedNodeResult =
    selectedElement?.kind === 'node' && selectedElement.nodeType === 'process' && derivedResults
      ? derivedResults.nodeResults[selectedElement.id] ?? null
      : null;

  const isInvalid = validationResult && !validationResult.isValid;

  return (
    <section>
      <h2 style={panelSectionHeadingStyle}>Results</h2>
      {nodes.length === 0 ? (
        <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
          Build a complete model to see results.
        </p>
      ) : isInvalid ? (
        <p style={{ fontSize: '13px', color: 'var(--color-warning)' }}>
          Cannot calculate — {validationResult.errors[0]}
        </p>
      ) : isEmpty ? (
        <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
          Build a complete model to see results.
        </p>
      ) : (
        <>
          <div style={resultRowStyle}>
            <span style={resultLabelStyle}>System Throughput</span>
            <span style={resultValueStyle}>{fmt(derivedResults!.systemThroughput)}</span>
          </div>
          <div style={resultRowStyle}>
            <span style={resultLabelStyle}>Bottleneck</span>
            <span style={resultValueStyle}>{bottleneckName}</span>
          </div>
          {selectedNodeResult && (
            <>
              <p
                style={{
                  fontSize: '11px',
                  color: 'var(--color-text-label)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  margin: '10px 0 6px 0',
                }}
              >
                Selected Node
              </p>
              <div style={resultRowStyle}>
                <span style={resultLabelStyle}>Required Throughput</span>
                <span style={resultValueStyle}>{fmt(selectedNodeResult.requiredThroughput)}</span>
              </div>
              <div style={resultRowStyle}>
                <span style={resultLabelStyle}>Effective Capacity</span>
                <span style={resultValueStyle}>{fmt(selectedNodeResult.effectiveCapacity)}</span>
              </div>
              <div style={resultRowStyle}>
                <span style={resultLabelStyle}>Utilization</span>
                <span style={resultValueStyle}>{fmtPct(selectedNodeResult.utilization)}</span>
              </div>
            </>
          )}
        </>
      )}
    </section>
  );
}

// ─── Selection Content ────────────────────────────────────────────────────────

function SelectionContent() {
  const selectedElement = useFlowStore((s) => s.selectedElement);
  const nodes = useFlowStore((s) => s.nodes);

  if (!selectedElement) {
    return (
      <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>
        Select a node to configure it.
      </p>
    );
  }

  if (selectedElement.kind === 'edge') {
    return <EdgeForm key={selectedElement.id} edgeId={selectedElement.id} />;
  }

  if (selectedElement.nodeType === 'source') {
    const node = nodes.find((n) => n.id === selectedElement.id);
    if (!node || node.type !== 'source') return null;
    return <SourceForm key={node.id} nodeId={node.id} data={node.data as SourceNodeData} />;
  }

  if (selectedElement.nodeType === 'sink') {
    return (
      <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>
        Sink nodes have no configurable parameters.
      </p>
    );
  }

  const node = nodes.find((n) => n.id === selectedElement.id);
  if (!node || node.type !== 'process') return null;

  return <ProcessForm key={node.id} nodeId={node.id} data={node.data as ProcessNodeData} />;
}

// ─── Panel Root ───────────────────────────────────────────────────────────────

export default function PropertiesPanel() {
  return (
    <div style={{ padding: '16px', height: '100%', overflowY: 'auto' }}>
      <ScenarioManager />
      <hr style={panelDividerStyle} />
      <GlobalDemandSection />
      <hr style={panelDividerStyle} />
      <ResultsSummary />
      <hr style={panelDividerStyle} />
      <SelectionContent />
    </div>
  );
}
