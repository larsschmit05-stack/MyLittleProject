'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { listModels, renameModel, deleteModel, duplicateModel } from '../../lib/persistence';
import type { SavedModelRow } from '../../lib/persistence';
import useFlowStore from '../../store/useFlowStore';
import useAuthStore from '../../store/useAuthStore';

type ModelListItem = Pick<SavedModelRow, 'id' | 'name' | 'created_at' | 'updated_at'> & {
  role: 'owner' | 'edit' | 'view';
};
type SortKey = 'name' | 'created_at' | 'updated_at' | 'role';

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
  padding: '6px 10px',
  fontSize: '12px',
};

const dangerBtn: React.CSSProperties = {
  ...secondaryBtn,
  color: 'var(--color-bottleneck)',
  border: '1px solid var(--color-bottleneck)',
};

const thStyle: React.CSSProperties = {
  textAlign: 'left',
  fontSize: '11px',
  fontWeight: 600,
  color: 'var(--color-text-label)',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  padding: '8px 12px',
  borderBottom: '1px solid var(--color-border)',
  cursor: 'pointer',
  userSelect: 'none',
  whiteSpace: 'nowrap',
};

const tdStyle: React.CSSProperties = {
  padding: '10px 12px',
  fontSize: '13px',
  color: 'var(--color-text-primary)',
  borderBottom: '1px solid var(--color-border)',
  verticalAlign: 'middle',
};

export default function DashboardPage() {
  const router = useRouter();
  const resetStore = useFlowStore((s) => s.resetStore);
  const logout = useAuthStore((s) => s.logout);
  const currentUser = useAuthStore((s) => s.user);

  async function handleLogout() {
    await logout();
    router.push('/login');
  }

  const [models, setModels] = useState<ModelListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('updated_at');
  const [sortAsc, setSortAsc] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      // Fetch owned and shared models in parallel
      const [ownedRows, sharedRes] = await Promise.all([
        listModels(),
        fetch('/api/models/shared').then((r) => r.json()).catch(() => ({ models: [] })),
      ]);
      // listModels() may return shared models via RLS, so dedupe by ID
      const sharedModels: ModelListItem[] = (sharedRes.models ?? []).map(
        (m: { id: string; name: string; created_at: string; updated_at: string; role: string }) => ({
          id: m.id,
          name: m.name,
          created_at: m.created_at,
          updated_at: m.updated_at,
          role: m.role as 'edit' | 'view',
        })
      );
      const sharedIds = new Set(sharedModels.map((m) => m.id));
      // Models from listModels that are NOT in the shared set are owned
      const owned: ModelListItem[] = ownedRows
        .filter((r) => !sharedIds.has(r.id))
        .map((r) => ({ ...r, role: 'owner' as const }));
      setModels([...owned, ...sharedModels]);
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

  async function handleLeave(modelId: string, modelName: string) {
    if (!currentUser?.id) return;
    if (!confirm(`Leave "${modelName}"? You will lose access to this model.`)) return;
    try {
      const res = await fetch(`/api/models/${modelId}/access/${currentUser.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? 'Failed to leave model');
      }
      setModels((prev) => prev.filter((m) => m.id !== modelId));
    } catch (err) {
      alert('Failed to leave: ' + (err as Error).message);
    }
  }

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(key === 'name');
    }
  }

  const sortedModels = [...models].sort((a, b) => {
    const aVal = a[sortKey];
    const bVal = b[sortKey];
    const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
    return sortAsc ? cmp : -cmp;
  });

  function sortIndicator(key: SortKey) {
    if (sortKey !== key) return '';
    return sortAsc ? ' \u25B2' : ' \u25BC';
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        backgroundColor: 'var(--color-bg-secondary)',
        padding: '40px',
      }}
    >
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 600, color: 'var(--color-text-primary)', margin: 0 }}>
            Your Models
          </h1>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button onClick={handleCreateNew} style={primaryBtn}>
              + Create New Model
            </button>
            <button onClick={handleLogout} style={secondaryBtn}>
              Logout
            </button>
          </div>
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

        {/* Model table */}
        {!loading && !error && models.length > 0 && (
          <div style={{
            background: 'var(--color-bg-primary)',
            border: '1px solid var(--color-border)',
            borderRadius: '8px',
            overflow: 'hidden',
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={thStyle} onClick={() => handleSort('name')}>
                    Name{sortIndicator('name')}
                  </th>
                  <th style={{ ...thStyle, width: '80px' }} onClick={() => handleSort('role')}>
                    Role{sortIndicator('role')}
                  </th>
                  <th style={{ ...thStyle, width: '120px' }} onClick={() => handleSort('created_at')}>
                    Created{sortIndicator('created_at')}
                  </th>
                  <th style={{ ...thStyle, width: '120px' }} onClick={() => handleSort('updated_at')}>
                    Updated{sortIndicator('updated_at')}
                  </th>
                  <th style={{ ...thStyle, width: '200px', cursor: 'default' }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedModels.map((model) => (
                  <tr key={model.id}>
                    {/* Name — click to open, double-click to rename */}
                    <td style={tdStyle}>
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
                            fontSize: '13px',
                            fontWeight: 500,
                            color: 'var(--color-text-primary)',
                            border: '1px solid var(--color-action)',
                            borderRadius: '6px',
                            padding: '4px 8px',
                            outline: 'none',
                            width: '100%',
                            boxSizing: 'border-box',
                          }}
                        />
                      ) : (
                        <span
                          onClick={() => handleOpen(model.id)}
                          title="Click to open"
                          style={{
                            fontWeight: 600,
                            color: 'var(--color-action)',
                            cursor: 'pointer',
                            display: 'block',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {model.name}
                        </span>
                      )}
                    </td>
                    <td style={tdStyle}>
                      <span style={{
                        display: 'inline-block',
                        fontSize: '11px',
                        fontWeight: 600,
                        padding: '2px 8px',
                        borderRadius: '10px',
                        textTransform: 'capitalize',
                        ...(model.role === 'owner'
                          ? { background: 'rgba(59, 130, 246, 0.1)', color: 'var(--color-action)' }
                          : model.role === 'edit'
                            ? { background: 'rgba(34, 197, 94, 0.1)', color: '#16a34a' }
                            : { background: 'rgba(128, 128, 128, 0.1)', color: 'var(--color-text-secondary)' }),
                      }}>
                        {model.role === 'owner' ? 'Owner' : model.role === 'edit' ? 'Edit' : 'View'}
                      </span>
                    </td>
                    <td style={{ ...tdStyle, fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                      {fmtDate(model.created_at)}
                    </td>
                    <td style={{ ...tdStyle, fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                      {fmtDate(model.updated_at)}
                    </td>
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        {model.role === 'owner' && (
                          <>
                            <button onClick={() => startRename(model)} style={secondaryBtn}>
                              Rename
                            </button>
                            <button onClick={() => handleDuplicate(model.id)} style={secondaryBtn}>
                              Duplicate
                            </button>
                            <button onClick={() => handleDelete(model.id, model.name)} style={dangerBtn}>
                              Delete
                            </button>
                          </>
                        )}
                        {model.role !== 'owner' && (
                          <>
                            <button onClick={() => handleDuplicate(model.id)} style={secondaryBtn}>
                              Duplicate
                            </button>
                            <button onClick={() => handleLeave(model.id, model.name)} style={dangerBtn}>
                              Leave
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
