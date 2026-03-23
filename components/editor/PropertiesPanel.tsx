'use client';

import { useEffect, useState } from 'react';
import useFlowStore from '../../store/useFlowStore';
import type { ProcessNodeData, SourceNodeData, SinkNodeData } from '../../types/flow';
import { isProcessValueValid } from '../../lib/flow/validation';
import {
  panelLabelStyle,
  panelInputStyle,
  panelInvalidInputStyle,
  panelSectionHeadingStyle,
  panelFieldGroupStyle,
  panelDividerStyle,
} from './styles';
import MetricsPanel from './MetricsPanel';



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

type NumericField = 'throughputRate' | 'availableTime' | 'availabilityRate' | 'performanceEfficiency' | 'qualityRate' | 'numberOfResources' | 'conversionRatio';

const FIELD_HELP_TEXT: Record<NumericField, string> = {
  throughputRate: 'Throughput Rate must be greater than 0.',
  availableTime: 'Available Time must be 0 or greater.',
  availabilityRate: 'Availability Rate must be greater than 0 and at most 100.',
  performanceEfficiency: 'Performance Efficiency must be greater than 0 and at most 100.',
  qualityRate: 'Quality Rate must be greater than 0 and at most 100.',
  numberOfResources: 'Number of Resources must be at least 1.',
  conversionRatio: 'Conversion Ratio must be greater than 0.',
};

const NUMERIC_FIELDS: { key: NumericField; label: string }[] = [
  { key: 'throughputRate', label: 'Processing Rate (units/hr)' },
  { key: 'availableTime', label: 'Available Time (hours in the demand period)' },
  { key: 'availabilityRate', label: 'Availability Rate (%)' },
  { key: 'performanceEfficiency', label: 'Performance Efficiency (%)' },
  { key: 'qualityRate', label: 'Quality Rate (%)' },
  { key: 'numberOfResources', label: 'Number of Resources' },
  { key: 'conversionRatio', label: 'Conversion Ratio (input units per output unit)' },
];

// ─── BOM Section ──────────────────────────────────────────────────────────────

function BomSection({ nodeId, data }: { nodeId: string; data: ProcessNodeData }) {
  const edges = useFlowStore((s) => s.edges);
  const nodes = useFlowStore((s) => s.nodes);
  const updateNodeData = useFlowStore((s) => s.updateNodeData);
  const storeBomRatios = useFlowStore((s) => {
    const node = s.nodes.find((n) => n.id === nodeId);
    return (node?.data as ProcessNodeData)?.bomRatios;
  });

  const incomingReal = edges.filter((e) => e.target === nodeId && !e.data?.isScrap);
  const incomingEdgeIds = incomingReal.map((e) => e.id).sort().join(',');

  const [rawValues, setRawValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(incomingReal.map((e) => [e.id, String(data.bomRatios?.[e.id] ?? 1)]))
  );
  const [invalidEdges, setInvalidEdges] = useState<Set<string>>(new Set());

  // Auto-initialize missing BOM ratios to 1 when component mounts or edges change
  useEffect(() => {
    if (incomingReal.length < 2) return;

    const missingEdges = incomingReal.filter((e) => !storeBomRatios?.[e.id]);
    if (missingEdges.length > 0) {
      const initialized: Record<string, number> = { ...(storeBomRatios ?? {}) };
      missingEdges.forEach((e) => {
        initialized[e.id] = 1;
      });
      updateNodeData(nodeId, { bomRatios: initialized });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- incomingEdgeIds already captures the same signal as incomingReal (derived from it); adding incomingReal would cause infinite loops
  }, [nodeId, incomingEdgeIds, storeBomRatios, updateNodeData]);

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
      updateNodeData(nodeId, { bomRatios: { ...storeBomRatios, [edgeId]: n } });
    } else {
      setInvalidEdges((prev) => new Set(prev).add(edgeId));
    }
  }

  function handleBlur(edgeId: string) {
    if (invalidEdges.has(edgeId)) {
      setRawValues((prev) => ({ ...prev, [edgeId]: String(storeBomRatios?.[edgeId] ?? 1) }));
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
  const nodes = useFlowStore((s) => s.nodes);

  const [name, setName] = useState(data.name);
  const [rawValues, setRawValues] = useState<Record<NumericField, string>>({
    throughputRate: String(data.throughputRate),
    availableTime: String(data.availableTime),
    availabilityRate: String(data.availabilityRate ?? 100),
    performanceEfficiency: String(data.performanceEfficiency ?? 100),
    qualityRate: String(data.qualityRate ?? data.yield ?? 100),
    numberOfResources: String(data.numberOfResources),
    conversionRatio: String(data.conversionRatio),
  });
  const [invalidFields, setInvalidFields] = useState<Partial<Record<NumericField, string>>>({});
  const [outputMaterial, setOutputMaterial] = useState(data.outputMaterial ?? '');
  const [rawCapacityLimit, setRawCapacityLimit] = useState(data.capacityLimit != null ? String(data.capacityLimit) : '');
  const [capacityLimitInvalid, setCapacityLimitInvalid] = useState(false);

  // Sync local state when data prop changes (e.g., after updateNodeData recalculates results)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional sync-from-props pattern; data is the only signal that should trigger a reset
    setName(data.name);
    setRawValues({
      throughputRate: String(data.throughputRate),
      availableTime: String(data.availableTime),
      availabilityRate: String(data.availabilityRate ?? 100),
      performanceEfficiency: String(data.performanceEfficiency ?? 100),
      qualityRate: String(data.qualityRate ?? data.yield ?? 100),
      numberOfResources: String(data.numberOfResources),
      conversionRatio: String(data.conversionRatio),
    });
    setOutputMaterial(data.outputMaterial ?? '');
    setRawCapacityLimit(data.capacityLimit != null ? String(data.capacityLimit) : '');
    setCapacityLimitInvalid(false);
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
    updateNodeData(nodeId, { outputMaterial: value });
  }

  function handleCapacityLimitChange(e: React.ChangeEvent<HTMLInputElement>) {
    const str = e.target.value;
    setRawCapacityLimit(str);
    if (str === '') {
      setCapacityLimitInvalid(false);
      updateNodeData(nodeId, { capacityLimit: undefined });
      return;
    }
    const n = parseFloat(str);
    if (isFinite(n) && n > 0) {
      setCapacityLimitInvalid(false);
      updateNodeData(nodeId, { capacityLimit: n });
    } else {
      setCapacityLimitInvalid(true);
    }
  }

  function handleCapacityLimitBlur() {
    if (capacityLimitInvalid) {
      setRawCapacityLimit(data.capacityLimit != null ? String(data.capacityLimit) : '');
      setCapacityLimitInvalid(false);
    }
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

      {incomingReal.length >= 1 && (
        <div style={{ ...panelFieldGroupStyle, marginTop: '16px' }}>
          <label style={panelLabelStyle}>Input Material</label>
          {incomingReal.map((e) => {
            const srcNode = nodes.find((n) => n.id === e.source);
            const material = (srcNode?.data as { outputMaterial?: string })?.outputMaterial;
            const srcName =
              (srcNode?.data as { name?: string })?.name ??
              (srcNode?.data as { label?: string })?.label ??
              e.source;
            return (
              <p key={e.id} style={{ margin: '2px 0', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                {incomingReal.length > 1 ? `${srcName}: ` : ''}{material || '—'}
              </p>
            );
          })}
        </div>
      )}

      <div style={{ ...panelFieldGroupStyle, marginTop: '16px' }}>
        <label style={panelLabelStyle} htmlFor={`${nodeId}-outputMaterial`}>
          Output Material *
        </label>
        <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: 'var(--color-text-secondary)' }}>
          What does this node produce?
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

      <div style={{ ...panelFieldGroupStyle, marginTop: '16px' }}>
        <label style={panelLabelStyle} htmlFor={`${nodeId}-capacityLimit`}>
          Capacity Limit (units/period)
        </label>
        <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: 'var(--color-text-secondary)' }}>
          Optional. Limits how much demand this node can handle in capacity-aware merge allocation.
        </p>
        <input
          id={`${nodeId}-capacityLimit`}
          type="number"
          value={rawCapacityLimit}
          onChange={handleCapacityLimitChange}
          onBlur={handleCapacityLimitBlur}
          style={capacityLimitInvalid ? panelInvalidInputStyle : panelInputStyle}
          placeholder="No limit"
          onFocus={(e) => (e.target.style.outline = '2px solid var(--color-action)')}
          onBlurCapture={(e) => (e.target.style.outline = 'none')}
        />
        {capacityLimitInvalid && (
          <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--color-bottleneck)' }}>
            Capacity Limit must be greater than 0.
          </p>
        )}
      </div>
    </section>
  );
}

// ─── Source Form ──────────────────────────────────────────────────────────────

function SourceForm({ nodeId, data }: { nodeId: string; data: SourceNodeData }) {
  const updateSourceNodeData = useFlowStore((s) => s.updateSourceNodeData);
  const [label, setLabel] = useState(data.label);
  const [outputMaterial, setOutputMaterial] = useState(data.outputMaterial ?? '');

  // Sync local state when data prop changes (e.g., after resetToSnapshot reverts the store)
  useEffect(() => {
    setLabel(data.label);
    setOutputMaterial(data.outputMaterial ?? '');
  }, [data]);

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
  const [rawRouteSplit, setRawRouteSplit] = useState(String(edge?.data?.routeSplitPercent ?? ''));

  if (!edge) return null;

  const sourceNode = nodes.find((n) => n.id === edge.source);
  const targetNode = nodes.find((n) => n.id === edge.target);

  function getNodeName(node: typeof sourceNode): string {
    if (!node) return '?';
    if (node.type === 'process') return (node.data as ProcessNodeData).name;
    if (node.type === 'source') return (node.data as SourceNodeData).label;
    if (node.type === 'sink') return (node.data as SinkNodeData).label;
    return node.type ?? '?';
  }

  const sourceName = getNodeName(sourceNode);
  const targetName = getNodeName(targetNode);

  // Split group: edges sharing the same source (non-scrap)
  const sourceOutgoing = edges.filter(
    (e) => e.source === edge.source && e.data?.isScrap !== true
  );
  const sourceOutgoingCount = edges.filter((e) => e.source === edge.source).length;
  const showSplitRatio = sourceOutgoingCount >= 2;
  const splitGroupTotal = sourceOutgoing.reduce(
    (sum, e) => sum + (e.data?.splitRatio ?? 0), 0
  );
  const splitGroupComplete = sourceOutgoing.every(
    (e) => e.data?.splitRatio != null && (e.data.splitRatio ?? 0) > 0
  );

  // Route split: edges sharing the same target (non-scrap)
  const targetIncoming = edges.filter(
    (e) => e.target === edge.target && e.data?.isScrap !== true
  );
  const showRouteSplit = targetIncoming.length >= 2 && !edge.data?.isScrap;
  const routeGroupTotal = targetIncoming.reduce(
    (sum, e) => sum + (e.data?.routeSplitPercent ?? 0), 0
  );
  const routeGroupComplete = targetIncoming.every(
    (e) => e.data?.routeSplitPercent != null && (e.data.routeSplitPercent ?? 0) > 0
  );

  const isScrap = edge.data?.isScrap === true;

  function handleScrapToggle() {
    const becomingScrap = !isScrap;
    if (becomingScrap) {
      updateEdgeData(edgeId, { isScrap: true, routeSplitPercent: undefined });
      setRawRouteSplit('');
    } else {
      updateEdgeData(edgeId, { isScrap: false });
    }
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

  function handleRouteSplitChange(e: React.ChangeEvent<HTMLInputElement>) {
    const str = e.target.value;
    setRawRouteSplit(str);
    if (str === '') {
      updateEdgeData(edgeId, { routeSplitPercent: undefined });
      return;
    }
    const n = parseFloat(str);
    if (isFinite(n) && n >= 0 && n <= 100) {
      updateEdgeData(edgeId, { routeSplitPercent: n });
    }
  }

  function handleRouteSplitBlur() {
    const str = rawRouteSplit;
    if (str === '') return;
    const n = parseFloat(str);
    if (!isFinite(n) || n < 0 || n > 100) {
      setRawRouteSplit(String(edge!.data?.routeSplitPercent ?? ''));
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

          {/* Split group context */}
          <div style={{ marginTop: '10px', fontSize: '12px' }}>
            <p style={{ margin: '0 0 6px 0', fontWeight: 500, color: 'var(--color-text-label)', textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '11px' }}>
              Split Group
            </p>
            {sourceOutgoing.map((e) => {
              const tgtNode = nodes.find((n) => n.id === e.target);
              const tgtName = getNodeName(tgtNode);
              const val = e.data?.splitRatio;
              const isCurrent = e.id === edgeId;
              return (
                <div key={e.id} style={{
                  display: 'flex', justifyContent: 'space-between', marginBottom: '2px',
                  padding: '2px 4px', borderRadius: '2px',
                  background: isCurrent ? 'var(--color-bg-hover, rgba(0,0,0,0.03))' : 'transparent',
                  fontWeight: isCurrent ? 500 : 400,
                  color: 'var(--color-text-secondary)',
                }}>
                  <span>{sourceName} → {tgtName}</span>
                  <span>{val != null ? `${val}%` : '—'}</span>
                </div>
              );
            })}
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              marginTop: '4px', paddingTop: '4px',
              borderTop: '1px solid var(--color-border)',
              fontWeight: 500,
              color: splitGroupComplete && splitGroupTotal >= 99 && splitGroupTotal <= 101
                ? 'var(--color-healthy)'
                : 'var(--color-warning)',
            }}>
              <span>Total</span>
              <span>{splitGroupTotal.toFixed(0)}%</span>
            </div>
          </div>
        </div>
      )}

      {showRouteSplit && (
        <div style={panelFieldGroupStyle}>
          <label style={panelLabelStyle} htmlFor={`${edgeId}-routeSplit`}>
            Route Split (%)
          </label>
          <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: 'var(--color-text-secondary)' }}>
            Fixed percentage of demand allocated to this route. All incoming routes to the same node must sum to 100%.
          </p>
          <input
            id={`${edgeId}-routeSplit`}
            type="number"
            value={rawRouteSplit}
            min={0}
            max={100}
            step={1}
            onChange={handleRouteSplitChange}
            onBlur={handleRouteSplitBlur}
            style={panelInputStyle}
            onFocus={(e) => (e.target.style.outline = '2px solid var(--color-action)')}
            onBlurCapture={(e) => (e.target.style.outline = 'none')}
          />

          {/* Route group context */}
          <div style={{ marginTop: '10px', fontSize: '12px' }}>
            <p style={{ margin: '0 0 6px 0', fontWeight: 500, color: 'var(--color-text-label)', textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '11px' }}>
              Route Group
            </p>
            {targetIncoming.map((e) => {
              const srcNode = nodes.find((n) => n.id === e.source);
              const srcName = srcNode
                ? srcNode.type === 'process' ? (srcNode.data as ProcessNodeData).name
                : (srcNode.data as SourceNodeData).label
                : '?';
              const val = e.data?.routeSplitPercent;
              const isCurrent = e.id === edgeId;
              return (
                <div key={e.id} style={{
                  display: 'flex', justifyContent: 'space-between', marginBottom: '2px',
                  padding: '2px 4px', borderRadius: '2px',
                  background: isCurrent ? 'var(--color-bg-hover, rgba(0,0,0,0.03))' : 'transparent',
                  fontWeight: isCurrent ? 500 : 400,
                  color: 'var(--color-text-secondary)',
                }}>
                  <span>{srcName} → {targetName}</span>
                  <span>{val != null ? `${val}%` : '—'}</span>
                </div>
              );
            })}
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              marginTop: '4px', paddingTop: '4px',
              borderTop: '1px solid var(--color-border)',
              fontWeight: 500,
              color: routeGroupComplete && routeGroupTotal >= 99 && routeGroupTotal <= 101
                ? 'var(--color-healthy)'
                : 'var(--color-warning)',
            }}>
              <span>Total</span>
              <span>{routeGroupTotal.toFixed(0)}%</span>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

// Re-export fmt/fmtPct from shared module for backward compatibility
export { fmt, fmtPct } from '../../lib/formatting';

// ─── Selection Content ────────────────────────────────────────────────────────

export function SelectionContent() {
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

interface PropertiesPanelProps {
  isFloating?: boolean;
  readOnly?: boolean;
}

export default function PropertiesPanel({ isFloating, readOnly = false }: PropertiesPanelProps) {
  const nodes = useFlowStore((s) => s.nodes);
  const derivedResults = useFlowStore((s) => s.derivedResults);
  const validationResult = useFlowStore((s) => s.validationResult);
  const selectedElement = useFlowStore((s) => s.selectedElement);
  const isEditableNode =
    selectedElement?.kind === 'node' &&
    (selectedElement.nodeType === 'process' || selectedElement.nodeType === 'source');

  return (
    <div style={{ padding: '16px', height: '100%', overflowY: 'auto', position: 'relative' }}>
      {readOnly && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 1,
            pointerEvents: 'all',
            cursor: 'not-allowed',
          }}
        />
      )}
      <GlobalDemandSection />
      <hr style={panelDividerStyle} />
      <MetricsPanel
        nodes={nodes}
        derivedResults={derivedResults}
        validationResult={validationResult}
        selectedElement={selectedElement}
      />
      <hr style={panelDividerStyle} />
      {(isFloating || isEditableNode) ? (
        <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', fontStyle: 'italic' }}>
          Editing in floating panel...
        </p>
      ) : (
        <SelectionContent />
      )}
    </div>
  );
}
