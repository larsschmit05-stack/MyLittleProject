'use client';
import { useState } from 'react';
import useFlowStore from '../../store/useFlowStore';
import { panelSectionHeadingStyle } from './styles';

const smallBtn: React.CSSProperties = {
  fontSize: '11px',
  padding: '2px 8px',
  borderRadius: '4px',
  border: '1px solid var(--color-border)',
  background: 'transparent',
  cursor: 'pointer',
  color: 'var(--color-text-primary)',
};

const dangerBtn: React.CSSProperties = {
  ...smallBtn,
  color: 'var(--color-bottleneck)',
  border: '1px solid color-mix(in srgb, var(--color-bottleneck) 30%, transparent)',
};

const dupBtn: React.CSSProperties = {
  padding: '6px 12px',
  fontSize: '13px',
  borderRadius: '4px',
  border: 'none',
  background: 'var(--color-action)',
  color: '#fff',
  cursor: 'pointer',
  fontWeight: 500,
};

export default function ScenarioManager() {
  const scenarios = useFlowStore((s) => s.scenarios);
  const activeScenarioId = useFlowStore((s) => s.activeScenarioId);
  const duplicateActiveScenario = useFlowStore((s) => s.duplicateActiveScenario);
  const switchScenario = useFlowStore((s) => s.switchScenario);
  const deleteScenario = useFlowStore((s) => s.deleteScenario);
  const [newName, setNewName] = useState('');

  function handleDuplicate() {
    const name = newName.trim() || `Scenario ${scenarios.length + 1}`;
    duplicateActiveScenario(name);
    setNewName('');
  }

  return (
    <section>
      <h2 style={panelSectionHeadingStyle}>Scenarios</h2>
      <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', margin: '0 0 10px 0' }}>
        Session only - scenarios are lost on page refresh.
      </p>
      <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 12px 0' }}>
        {scenarios.map((s) => (
          <li
            key={s.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '6px 8px',
              marginBottom: '4px',
              borderRadius: '4px',
              background:
                s.id === activeScenarioId
                  ? 'color-mix(in srgb, var(--color-action) 12%, transparent)'
                  : 'transparent',
              border:
                s.id === activeScenarioId
                  ? '1px solid color-mix(in srgb, var(--color-action) 40%, transparent)'
                  : '1px solid var(--color-border)',
            }}
          >
            <span
              style={{
                fontSize: '13px',
                fontWeight: s.id === activeScenarioId ? 600 : 400,
              }}
            >
              {s.name}
            </span>
            <div style={{ display: 'flex', gap: '6px' }}>
              {s.id !== activeScenarioId && (
                <button onClick={() => switchScenario(s.id)} style={smallBtn}>
                  Switch
                </button>
              )}
              {scenarios.length > 1 && (
                <button
                  aria-label={`Delete scenario ${s.name}`}
                  onClick={() => deleteScenario(s.id)}
                  style={dangerBtn}
                >
                  Delete
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
      <div style={{ display: 'flex', gap: '6px' }}>
        <input
          type="text"
          placeholder="New scenario name..."
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleDuplicate()}
          style={{
            flex: 1,
            padding: '6px 8px',
            fontSize: '13px',
            borderRadius: '4px',
            border: '1px solid var(--color-border)',
            background: 'var(--color-bg-primary)',
            color: 'var(--color-text-primary)',
          }}
        />
        <button onClick={handleDuplicate} style={dupBtn}>
          Duplicate
        </button>
      </div>
    </section>
  );
}
