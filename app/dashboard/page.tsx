'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { listModels, renameModel, deleteModel, duplicateModel } from '../../lib/persistence';
import type { SavedModelRow } from '../../lib/persistence';
import useFlowStore from '../../store/useFlowStore';

type ModelListItem = Pick<SavedModelRow, 'id' | 'name' | 'created_at' | 'updated_at'>;

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { dateStyle: 'medium' });
}

const primaryBtn: React.CSSProperties = {
  padding: '8px 16px',
  fontSize: '14px',
  fontWeight: 600,
  borderRadius: '8px',
  border: 'none',
  background: 'var(--color-action)',
  color: '#fff',
  cursor: 'pointer',
};

const secondaryBtn: React.CSSProperties = {
  ...primaryBtn,
  background: 'transparent',
  border: '1px solid var(--color-border)',
  color: 'var(--color-text-primary)',
  padding: '8px 12px',
  fontSize: '13px',
};

const dangerBtn: React.CSSProperties = {
  ...secondaryBtn,
  color: 'var(--color-bottleneck)',
  border: '1px solid var(--color-bottleneck)',
};

export default function DashboardPage() {
  const router = useRouter();
  const resetStore = useFlowStore((s) => s.resetStore);

  const [models, setModels] = useState<ModelListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const rows = await listModels();
      setModels(rows);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function handleCreateNew() {
    resetStore();
    router.push('/editor');
  }

  function handleOpen(id: string) {
    router.push('/editor?id=' + id);
  }

  function startRename(model: ModelListItem) {
    setRenamingId(model.id);
    setRenameValue(model.name);
  }

  async function commitRename(id: string) {
    const name = renameValue.trim();
    if (name && name !== models.find((m) => m.id === id)?.name) {
      try {
        await renameModel(id, name);
        setModels((prev) => prev.map((m) => m.id === id ? { ...m, name } : m));
      } catch (err) {
        alert('Failed to rename: ' + (err as Error).message);
      }
    }
    setRenamingId(null);
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try {
      await deleteModel(id);
      setModels((prev) => prev.filter((m) => m.id !== id));
    } catch (err) {
      alert('Failed to delete: ' + (err as Error).message);
    }
  }

  async function handleDuplicate(id: string) {
    try {
      await duplicateModel(id);
      await load();
    } catch (err) {
      alert('Failed to duplicate: ' + (err as Error).message);
    }
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        backgroundColor: 'var(--color-bg-secondary)',
        padding: '40px',
      }}
    >
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 600, color: 'var(--color-text-primary)', margin: 0 }}>
            Your Models
          </h1>
          <button onClick={handleCreateNew} style={primaryBtn}>
            + Create New Model
          </button>
        </div>

        {/* States */}
        {loading && (
          <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>Loading…</p>
        )}

        {error && (
          <p style={{ fontSize: '14px', color: 'var(--color-bottleneck)' }}>
            Failed to load models: {error}
          </p>
        )}

        {!loading && !error && models.length === 0 && (
          <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>
            No saved models yet. Click &ldquo;Create New Model&rdquo; to get started.
          </p>
        )}

        {/* Model list */}
        {!loading && !error && models.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {models.map((model) => (
              <div
                key={model.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  background: 'var(--color-bg-primary)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '8px',
                  padding: '12px 16px',
                }}
              >
                {/* Name — click to rename */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  {renamingId === model.id ? (
                    <input
                      autoFocus
                      type="text"
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onBlur={() => commitRename(model.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') commitRename(model.id);
                        if (e.key === 'Escape') setRenamingId(null);
                      }}
                      style={{
                        fontSize: '14px',
                        fontWeight: 500,
                        color: 'var(--color-text-primary)',
                        border: '1px solid var(--color-action)',
                        borderRadius: '8px',
                        padding: '4px 8px',
                        outline: 'none',
                        width: '100%',
                        boxSizing: 'border-box',
                      }}
                    />
                  ) : (
                    <span
                      onClick={() => startRename(model)}
                      title="Click to rename"
                      style={{
                        fontSize: '14px',
                        fontWeight: 600,
                        color: 'var(--color-text-primary)',
                        cursor: 'text',
                        display: 'block',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {model.name}
                    </span>
                  )}
                  <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                    Updated {fmtDate(model.updated_at)}
                  </span>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                  <button onClick={() => handleOpen(model.id)} style={secondaryBtn}>
                    Open
                  </button>
                  <button onClick={() => handleDuplicate(model.id)} style={secondaryBtn}>
                    Duplicate
                  </button>
                  <button onClick={() => handleDelete(model.id, model.name)} style={dangerBtn}>
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
