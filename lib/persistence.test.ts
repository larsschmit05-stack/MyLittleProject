import { describe, it, expect, vi, beforeEach } from 'vitest';
import { isSerializedModel, insertModel, updateModel, fetchModel } from './persistence';
import type { SerializedModel } from '../types/flow';

// Mock the supabase module
const mockFrom = vi.fn();
vi.mock('./supabase', () => ({
  getSupabaseClient: () => ({ from: mockFrom }),
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

  it('calls insert with name and data, returns the id', async () => {
    const mockSingle = vi.fn().mockResolvedValue({ data: { id: 'abc-123' }, error: null });
    const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
    const mockInsert = vi.fn().mockReturnValue({ select: mockSelect });
    mockFrom.mockReturnValue({ insert: mockInsert });

    const id = await insertModel('My Model', validModel);

    expect(mockFrom).toHaveBeenCalledWith('models');
    expect(mockInsert).toHaveBeenCalledWith({ name: 'My Model', data: validModel });
    expect(id).toBe('abc-123');
  });

  it('throws when supabase returns an error', async () => {
    const mockSingle = vi.fn().mockResolvedValue({ data: null, error: { message: 'insert failed' } });
    const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
    const mockInsert = vi.fn().mockReturnValue({ select: mockSelect });
    mockFrom.mockReturnValue({ insert: mockInsert });

    await expect(insertModel('My Model', validModel)).rejects.toThrow('insert failed');
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
