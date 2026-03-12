'use client';

import { useState, useEffect } from 'react';
import useFlowStore from '../../store/useFlowStore';
import type { ProcessNodeData } from '../../types/flow';

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '12px',
  fontWeight: 500,
  color: 'var(--color-text-secondary)',
  marginBottom: '4px',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  fontSize: '14px',
  color: 'var(--color-text-primary)',
  background: 'var(--color-bg-primary)',
  border: '1px solid var(--color-border)',
  borderRadius: '4px',
  padding: '6px 8px',
  outline: 'none',
};

const sectionHeadingStyle: React.CSSProperties = {
  fontSize: '12px',
  fontWeight: 500,
  color: 'var(--color-text-label)',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  margin: '0 0 12px 0',
};

const fieldGroupStyle: React.CSSProperties = {
  marginBottom: '12px',
};

const dividerStyle: React.CSSProperties = {
  border: 'none',
  borderTop: '1px solid var(--color-border)',
  margin: '16px 0',
};

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
      <h2 style={sectionHeadingStyle}>Global Demand</h2>
      <div style={fieldGroupStyle}>
        <label style={labelStyle} htmlFor="global-demand">
          Units per period
        </label>
        <input
          id="global-demand"
          type="number"
          value={raw}
          onChange={handleChange}
          onBlur={handleBlur}
          style={inputStyle}
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

type NumericField = keyof Omit<ProcessNodeData, 'name'>;

const NUMERIC_FIELDS: { key: NumericField; label: string }[] = [
  { key: 'cycleTime', label: 'Cycle Time' },
  { key: 'availableTime', label: 'Available Time' },
  { key: 'yield', label: 'Yield (%)' },
  { key: 'numberOfResources', label: 'Number of Resources' },
  { key: 'conversionRatio', label: 'Conversion Ratio' },
];

function ProcessForm({ nodeId, data }: ProcessFormProps) {
  const updateNodeData = useFlowStore((s) => s.updateNodeData);

  const [name, setName] = useState(data.name);
  const [rawValues, setRawValues] = useState<Record<NumericField, string>>({
    cycleTime: String(data.cycleTime),
    availableTime: String(data.availableTime),
    yield: String(data.yield),
    numberOfResources: String(data.numberOfResources),
    conversionRatio: String(data.conversionRatio),
  });

  // Re-initialize when a different node is selected
  useEffect(() => {
    setName(data.name);
    setRawValues({
      cycleTime: String(data.cycleTime),
      availableTime: String(data.availableTime),
      yield: String(data.yield),
      numberOfResources: String(data.numberOfResources),
      conversionRatio: String(data.conversionRatio),
    });
  }, [nodeId]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    setName(value);
    updateNodeData(nodeId, { name: value });
  }

  function handleNumericChange(field: NumericField, str: string) {
    setRawValues((prev) => ({ ...prev, [field]: str }));
    const n = parseFloat(str);
    if (isFinite(n)) updateNodeData(nodeId, { [field]: n });
  }

  function handleNumericBlur(field: NumericField) {
    const n = parseFloat(rawValues[field]);
    if (!isFinite(n)) {
      setRawValues((prev) => ({ ...prev, [field]: String(data[field]) }));
    }
  }

  return (
    <section>
      <h2 style={sectionHeadingStyle}>Process Node</h2>

      <div style={fieldGroupStyle}>
        <label style={labelStyle} htmlFor={`${nodeId}-name`}>
          Name
        </label>
        <input
          id={`${nodeId}-name`}
          type="text"
          value={name}
          onChange={handleNameChange}
          style={inputStyle}
          onFocus={(e) => (e.target.style.outline = '2px solid var(--color-action)')}
          onBlur={(e) => (e.target.style.outline = 'none')}
        />
      </div>

      {NUMERIC_FIELDS.map(({ key, label }) => (
        <div key={key} style={fieldGroupStyle}>
          <label style={labelStyle} htmlFor={`${nodeId}-${key}`}>
            {label}
          </label>
          <input
            id={`${nodeId}-${key}`}
            type="number"
            value={rawValues[key]}
            onChange={(e) => handleNumericChange(key, e.target.value)}
            onBlur={() => handleNumericBlur(key)}
            style={inputStyle}
            onFocus={(e) => (e.target.style.outline = '2px solid var(--color-action)')}
            onBlurCapture={(e) => (e.target.style.outline = 'none')}
          />
        </div>
      ))}
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
    return (
      <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>
        Edges have no configurable parameters in V1.
      </p>
    );
  }

  if (selectedElement.nodeType !== 'process') {
    return (
      <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>
        Source and Sink nodes have no configurable parameters in V1.
      </p>
    );
  }

  const node = nodes.find((n) => n.id === selectedElement.id);
  if (!node || node.type !== 'process') return null;

  return <ProcessForm nodeId={node.id} data={node.data as ProcessNodeData} />;
}

// ─── Panel Root ───────────────────────────────────────────────────────────────

export default function PropertiesPanel() {
  return (
    <div style={{ padding: '16px' }}>
      <GlobalDemandSection />
      <hr style={dividerStyle} />
      <SelectionContent />
    </div>
  );
}
