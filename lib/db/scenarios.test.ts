import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getScenarios, getScenario, createScenario, updateScenario, deleteScenario } from './scenarios';
import type { SerializedModel } from '../../types/flow';

const mockFrom = vi.fn();
vi.mock('../supabase', () => ({
  getSupabaseClient: () => ({ from: mockFrom }),
}));

const validModel: SerializedModel = { nodes: [], edges: [], globalDemand: 100 };

// ─── getScenarios ────────────────────────────────────────────────────────────

describe('getScenarios', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns scenarios ordered by created_at ascending', async () => {
    const rows = [
      { id: 's1', model_id: 'm1', name: 'Baseline', data: validModel, results: null, created_at: 't1', updated_at: 't1' },
      { id: 's2', model_id: 'm1', name: 'What-If', data: validModel, results: null, created_at: 't2', updated_at: 't2' },
    ];
    const mockOrder = vi.fn().mockResolvedValue({ data: rows, error: null });
    const mockEq = vi.fn().mockReturnValue({ order: mockOrder });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
    mockFrom.mockReturnValue({ select: mockSelect });

    const result = await getScenarios('m1');

    expect(mockFrom).toHaveBeenCalledWith('scenarios');
    expect(mockSelect).toHaveBeenCalledWith('*');
    expect(mockEq).toHaveBeenCalledWith('model_id', 'm1');
    expect(mockOrder).toHaveBeenCalledWith('created_at', { ascending: true });
    expect(result).toEqual(rows);
  });

  it('throws when supabase returns an error', async () => {
    const mockOrder = vi.fn().mockResolvedValue({ data: null, error: { message: 'fetch failed' } });
    const mockEq = vi.fn().mockReturnValue({ order: mockOrder });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
    mockFrom.mockReturnValue({ select: mockSelect });

    await expect(getScenarios('m1')).rejects.toThrow('fetch failed');
  });
});

// ─── getScenario ─────────────────────────────────────────────────────────────

describe('getScenario', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns a single scenario by id', async () => {
    const row = { id: 's1', model_id: 'm1', name: 'Baseline', data: validModel, results: null, created_at: 't1', updated_at: 't1' };
    const mockSingle = vi.fn().mockResolvedValue({ data: row, error: null });
    const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
    mockFrom.mockReturnValue({ select: mockSelect });

    const result = await getScenario('s1');

    expect(mockFrom).toHaveBeenCalledWith('scenarios');
    expect(mockEq).toHaveBeenCalledWith('id', 's1');
    expect(result).toEqual(row);
  });

  it('throws when supabase returns an error', async () => {
    const mockSingle = vi.fn().mockResolvedValue({ data: null, error: { message: 'not found' } });
    const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
    mockFrom.mockReturnValue({ select: mockSelect });

    await expect(getScenario('bad-id')).rejects.toThrow('not found');
  });
});

// ─── createScenario ──────────────────────────────────────────────────────────

describe('createScenario', () => {
  beforeEach(() => vi.clearAllMocks());

  it('inserts and returns the generated id', async () => {
    const mockSingle = vi.fn().mockResolvedValue({ data: { id: 'new-id' }, error: null });
    const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
    const mockInsert = vi.fn().mockReturnValue({ select: mockSelect });
    mockFrom.mockReturnValue({ insert: mockInsert });

    const payload = { model_id: 'm1', name: 'Baseline', data: validModel };
    const id = await createScenario(payload);

    expect(mockFrom).toHaveBeenCalledWith('scenarios');
    expect(mockInsert).toHaveBeenCalledWith(payload);
    expect(mockSelect).toHaveBeenCalledWith('id');
    expect(id).toBe('new-id');
  });

  it('throws when supabase returns an error', async () => {
    const mockSingle = vi.fn().mockResolvedValue({ data: null, error: { message: 'insert failed' } });
    const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
    const mockInsert = vi.fn().mockReturnValue({ select: mockSelect });
    mockFrom.mockReturnValue({ insert: mockInsert });

    await expect(createScenario({ model_id: 'm1', name: 'X', data: validModel })).rejects.toThrow('insert failed');
  });
});

// ─── updateScenario ──────────────────────────────────────────────────────────

describe('updateScenario', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calls update with fields and updated_at, filtered by id', async () => {
    const mockEq = vi.fn().mockResolvedValue({ error: null });
    const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });
    mockFrom.mockReturnValue({ update: mockUpdate });

    await updateScenario('s1', { name: 'Renamed' });

    expect(mockFrom).toHaveBeenCalledWith('scenarios');
    const updateArg = mockUpdate.mock.calls[0][0];
    expect(updateArg.name).toBe('Renamed');
    expect(updateArg.updated_at).toBeDefined();
    expect(mockEq).toHaveBeenCalledWith('id', 's1');
  });

  it('throws when supabase returns an error', async () => {
    const mockEq = vi.fn().mockResolvedValue({ error: { message: 'update failed' } });
    const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });
    mockFrom.mockReturnValue({ update: mockUpdate });

    await expect(updateScenario('s1', { name: 'X' })).rejects.toThrow('update failed');
  });
});

// ─── deleteScenario ──────────────────────────────────────────────────────────

describe('deleteScenario', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calls delete filtered by id', async () => {
    const mockEq = vi.fn().mockResolvedValue({ error: null });
    const mockDelete = vi.fn().mockReturnValue({ eq: mockEq });
    mockFrom.mockReturnValue({ delete: mockDelete });

    await deleteScenario('s1');

    expect(mockFrom).toHaveBeenCalledWith('scenarios');
    expect(mockEq).toHaveBeenCalledWith('id', 's1');
  });

  it('throws when supabase returns an error', async () => {
    const mockEq = vi.fn().mockResolvedValue({ error: { message: 'delete failed' } });
    const mockDelete = vi.fn().mockReturnValue({ eq: mockEq });
    mockFrom.mockReturnValue({ delete: mockDelete });

    await expect(deleteScenario('s1')).rejects.toThrow('delete failed');
  });
});
