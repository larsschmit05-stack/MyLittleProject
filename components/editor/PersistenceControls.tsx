'use client';
import { useState, useEffect } from 'react';
import useFlowStore from '../../store/useFlowStore';
import { panelSectionHeadingStyle, panelInputStyle } from './styles';

const actionBtn: React.CSSProperties = {
  padding: '6px 12px', fontSize: '13px', borderRadius: '4px',
  border: 'none', background: 'var(--color-action)', color: '#fff',
  cursor: 'pointer', fontWeight: 500,
};

const secondaryBtn: React.CSSProperties = {
  ...actionBtn,
  background: 'transparent',
  border: '1px solid var(--color-border)',
  color: 'var(--color-text-primary)',
};

export default function PersistenceControls() {
  const savedModelId = useFlowStore((s) => s.savedModelId);
  const savedModelName = useFlowStore((s) => s.savedModelName);
  const isSaving = useFlowStore((s) => s.isSaving);
  const saveError = useFlowStore((s) => s.saveError);
  const saveAsNewModel = useFlowStore((s) => s.saveAsNewModel);
  const updateSavedModel = useFlowStore((s) => s.updateSavedModel);
  const loadModel = useFlowStore((s) => s.loadModel);

  const [newName, setNewName] = useState('');
  const [loadId, setLoadId] = useState('');
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    if (saveError) {
      setStatus(saveError);
      const t = setTimeout(() => setStatus(null), 4000);
      return () => clearTimeout(t);
    }
  }, [saveError]);

  async function handleSaveNew() {
    const name = newName.trim() || 'Untitled Model';
    await saveAsNewModel(name);
    if (!useFlowStore.getState().saveError) {
      setStatus('Saved');
      setNewName('');
      const t = setTimeout(() => setStatus(null), 3000);
      return () => clearTimeout(t);
    }
  }

  async function handleUpdate() {
    await updateSavedModel();
    if (!useFlowStore.getState().saveError) {
      setStatus('Updated');
      const t = setTimeout(() => setStatus(null), 3000);
      return () => clearTimeout(t);
    }
  }

  async function handleLoad() {
    const id = loadId.trim();
    if (!id) return;
    await loadModel(id);
    if (!useFlowStore.getState().saveError) {
      setStatus('Loaded');
      setLoadId('');
      const t = setTimeout(() => setStatus(null), 3000);
      return () => clearTimeout(t);
    }
  }

  return (
    <section>
      <h2 style={panelSectionHeadingStyle}>Save / Load</h2>

      {/* Save as New */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
        <input
          type="text"
          placeholder="Model name…"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSaveNew()}
          style={{ ...panelInputStyle, flex: 1 }}
        />
        <button onClick={handleSaveNew} disabled={isSaving} style={actionBtn}>
          {isSaving ? 'Saving…' : 'Save as New'}
        </button>
      </div>

      {/* Update Saved — only visible when a model is saved */}
      {savedModelId && (
        <div style={{ marginBottom: '8px' }}>
          <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', margin: '0 0 4px 0' }}>
            Saved: <strong>{savedModelName}</strong>
          </p>
          <p style={{ fontSize: '11px', color: 'var(--color-text-secondary)', margin: '0 0 6px 0', wordBreak: 'break-all' }}>
            ID: {savedModelId}
          </p>
          <button onClick={handleUpdate} disabled={isSaving} style={secondaryBtn}>
            {isSaving ? 'Saving…' : 'Update Saved'}
          </button>
        </div>
      )}

      {/* Load by ID */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
        <input
          type="text"
          placeholder="Model ID to load…"
          value={loadId}
          onChange={(e) => setLoadId(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleLoad()}
          style={{ ...panelInputStyle, flex: 1 }}
        />
        <button onClick={handleLoad} disabled={isSaving || !loadId.trim()} style={secondaryBtn}>
          Load
        </button>
      </div>

      {/* Status feedback */}
      {status && (
        <p style={{
          fontSize: '12px',
          color: status.toLowerCase().includes('fail') || status.toLowerCase().includes('error')
            ? 'var(--color-bottleneck)'
            : 'var(--color-healthy)',
          margin: '4px 0 0 0',
        }}>
          {status}
        </p>
      )}
    </section>
  );
}
