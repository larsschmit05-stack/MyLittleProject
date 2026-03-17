import { describe, it, expect, vi, beforeEach } from 'vitest';
import { isSerializedModel, insertModel, updateModel, fetchModel, listModels, renameModel, deleteModel, duplicateModel } from './persistence';
import type { SerializedModel } from '../types/flow';

// Mock the supabase module
const mockFrom = vi.fn();
const mockGetUser = vi.fn();
vi.mock('./supabase', () => ({
  getSupabaseClient: () => ({ from: mockFrom, auth: { getUser: mockGetUser } }),
}));

const validModel: SerializedModel = {
  nodes: [],
  edges: [],
  globalDemand: 100,
};

// ─── isSerializedModel ────────────────────────────────────────────────────────

describe('isSerializedModel', () => {
  it('returns true for a valid shape', () => {
    expect(isSerializedModel(validModel)).toBe(true);
  });

  it('returns true when nodes and edges are non-empty arrays', () => {
    expect(isSerializedModel({ nodes: [{}], edges: [{}], globalDemand: 0 })).toBe(true);
  });

  it('returns false when nodes is missing', () => {
    expect(isSerializedModel({ edges: [], globalDemand: 0 })).toBe(false);
  });

  it('returns false when edges is missing', () => {
    expect(isSerializedModel({ nodes: [], globalDemand: 0 })).toBe(false);
  });

  it('returns false when globalDemand is not a number', () => {
    expect(isSerializedModel({ nodes: [], edges: [], globalDemand: '100' })).toBe(false);
  });

  it('returns false for null', () => {
    expect(isSerializedModel(null)).toBe(false);
  });

  it('returns false for a plain string', () => {
    expect(isSerializedModel('hello')).toBe(false);
  });

  it('returns false when nodes is not an array', () => {
    expect(isSerializedModel({ nodes: {}, edges: [], globalDemand: 0 })).toBe(false);
  });
});

// ─── insertModel ──────────────────────────────────────────────────────────────

describe('insertModel', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calls insert with name, data, and user_id, returns the id', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    const mockSingle = vi.fn().mockResolvedValue({ data: { id: 'abc-123' }, error: null });
    const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
    const mockInsert = vi.fn().mockReturnValue({ select: mockSelect });
    mockFrom.mockReturnValue({ insert: mockInsert });

    const id = await insertModel('My Model', validModel);

    expect(mockFrom).toHaveBeenCalledWith('models');
    expect(mockInsert).toHaveBeenCalledWith({ name: 'My Model', data: validModel, user_id: 'user-1' });
    expect(id).toBe('abc-123');
  });

  it('throws when supabase returns an error', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    const mockSingle = vi.fn().mockResolvedValue({ data: null, error: { message: 'insert failed' } });
    const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
    const mockInsert = vi.fn().mockReturnValue({ select: mockSelect });
    mockFrom.mockReturnValue({ insert: mockInsert });

    await expect(insertModel('My Model', validModel)).rejects.toThrow('insert failed');
  });

  it('throws Not authenticated when user is null', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

    await expect(insertModel('My Model', validModel)).rejects.toThrow('Not authenticated');
  });

  it('throws auth error message when getUser fails', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'Auth session expired' } });

    await expect(insertModel('My Model', validModel)).rejects.toThrow('Auth session expired');
  });
});

// ─── updateModel ──────────────────────────────────────────────────────────────

describe('updateModel', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calls update and eq with the correct id', async () => {
    const mockEq = vi.fn().mockResolvedValue({ error: null });
    const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });
    mockFrom.mockReturnValue({ update: mockUpdate });

    await updateModel('model-id', validModel);

    expect(mockFrom).toHaveBeenCalledWith('models');
    expect(mockUpdate).toHaveBeenCalledWith({ data: validModel });
    expect(mockEq).toHaveBeenCalledWith('id', 'model-id');
  });

  it('throws when supabase returns an error', async () => {
    const mockEq = vi.fn().mockResolvedValue({ error: { message: 'update failed' } });
    const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });
    mockFrom.mockReturnValue({ update: mockUpdate });

    await expect(updateModel('model-id', validModel)).rejects.toThrow('update failed');
  });
});

// ─── fetchModel ───────────────────────────────────────────────────────────────

describe('fetchModel', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns the hydrated row on happy path', async () => {
    const row = { id: 'row-id', name: 'Test', data: validModel, created_at: 'now', updated_at: 'now' };
    const mockSingle = vi.fn().mockResolvedValue({ data: row, error: null });
    const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
    mockFrom.mockReturnValue({ select: mockSelect });

    const result = await fetchModel('row-id');

    expect(mockFrom).toHaveBeenCalledWith('models');
    expect(mockEq).toHaveBeenCalledWith('id', 'row-id');
    expect(result).toEqual(row);
  });

  it('throws when supabase returns an error', async () => {
    const mockSingle = vi.fn().mockResolvedValue({ data: null, error: { message: 'not found' } });
    const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
    mockFrom.mockReturnValue({ select: mockSelect });

    await expect(fetchModel('bad-id')).rejects.toThrow('not found');
  });

  it('throws when the data field has an invalid SerializedModel shape', async () => {
    const badRow = { id: 'row-id', name: 'Bad', data: { wrong: true }, created_at: 'now', updated_at: 'now' };
    const mockSingle = vi.fn().mockResolvedValue({ data: badRow, error: null });
    const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
    mockFrom.mockReturnValue({ select: mockSelect });

    await expect(fetchModel('row-id')).rejects.toThrow('invalid SerializedModel shape');
  });
});

// ─── listModels ───────────────────────────────────────────────────────────────

describe('listModels', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns rows ordered by updated_at descending', async () => {
    const rows = [
      { id: 'a', name: 'A', created_at: 't1', updated_at: 't2' },
      { id: 'b', name: 'B', created_at: 't0', updated_at: 't1' },
    ];
    const mockOrder = vi.fn().mockResolvedValue({ data: rows, error: null });
    const mockSelect = vi.fn().mockReturnValue({ order: mockOrder });
    mockFrom.mockReturnValue({ select: mockSelect });

    const result = await listModels();

    expect(mockFrom).toHaveBeenCalledWith('models');
    expect(mockSelect).toHaveBeenCalledWith('id, name, created_at, updated_at');
    expect(mockOrder).toHaveBeenCalledWith('updated_at', { ascending: false });
    expect(result).toEqual(rows);
  });

  it('throws when supabase returns an error', async () => {
    const mockOrder = vi.fn().mockResolvedValue({ data: null, error: { message: 'list failed' } });
    const mockSelect = vi.fn().mockReturnValue({ order: mockOrder });
    mockFrom.mockReturnValue({ select: mockSelect });

    await expect(listModels()).rejects.toThrow('list failed');
  });
});

// ─── renameModel ──────────────────────────────────────────────────────────────

describe('renameModel', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calls update with name and eq with correct id', async () => {
    const mockEq = vi.fn().mockResolvedValue({ error: null });
    const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });
    mockFrom.mockReturnValue({ update: mockUpdate });

    await renameModel('model-id', 'New Name');

    expect(mockFrom).toHaveBeenCalledWith('models');
    expect(mockUpdate).toHaveBeenCalledWith({ name: 'New Name' });
    expect(mockEq).toHaveBeenCalledWith('id', 'model-id');
  });

  it('throws when supabase returns an error', async () => {
    const mockEq = vi.fn().mockResolvedValue({ error: { message: 'rename failed' } });
    const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });
    mockFrom.mockReturnValue({ update: mockUpdate });

    await expect(renameModel('model-id', 'New Name')).rejects.toThrow('rename failed');
  });
});

// ─── deleteModel ──────────────────────────────────────────────────────────────

describe('deleteModel', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calls delete and eq with the correct id', async () => {
    const mockEq = vi.fn().mockResolvedValue({ error: null });
    const mockDelete = vi.fn().mockReturnValue({ eq: mockEq });
    mockFrom.mockReturnValue({ delete: mockDelete });

    await deleteModel('model-id');

    expect(mockFrom).toHaveBeenCalledWith('models');
    expect(mockEq).toHaveBeenCalledWith('id', 'model-id');
  });

  it('throws when supabase returns an error', async () => {
    const mockEq = vi.fn().mockResolvedValue({ error: { message: 'delete failed' } });
    const mockDelete = vi.fn().mockReturnValue({ eq: mockEq });
    mockFrom.mockReturnValue({ delete: mockDelete });

    await expect(deleteModel('model-id')).rejects.toThrow('delete failed');
  });
});

// ─── duplicateModel ───────────────────────────────────────────────────────────

describe('duplicateModel', () => {
  beforeEach(() => vi.clearAllMocks());

  it('fetches original and inserts a copy with new name and user_id', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    const original = { name: 'Original', data: validModel };
    const mockFetchSingle = vi.fn().mockResolvedValue({ data: original, error: null });

    const mockInsertSingle = vi.fn().mockResolvedValue({ data: { id: 'copy-id' }, error: null });
    const mockInsertSelect = vi.fn().mockReturnValue({ single: mockInsertSingle });
    const mockInsert = vi.fn().mockReturnValue({ select: mockInsertSelect });

    mockFrom.mockImplementation((table) => {
      if (table === 'models') {
        return {
          select: (fields: string) => {
            if (fields === 'name, data') {
              return { eq: vi.fn().mockReturnValue({ single: mockFetchSingle }) };
            }
            if (fields === 'id') {
              return { single: mockInsertSingle };
            }
            return {};
          },
          insert: mockInsert,
        };
      }
      return {};
    });

    const newId = await duplicateModel('orig-id');

    expect(mockInsert).toHaveBeenCalledWith({ name: 'Original (Copy)', data: validModel, user_id: 'user-1' });
    expect(newId).toBe('copy-id');
  });

  it('throws Not authenticated when user is null', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

    await expect(duplicateModel('orig-id')).rejects.toThrow('Not authenticated');
  });

  it('throws auth error message when getUser fails', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'Network error' } });

    await expect(duplicateModel('orig-id')).rejects.toThrow('Network error');
  });
});
