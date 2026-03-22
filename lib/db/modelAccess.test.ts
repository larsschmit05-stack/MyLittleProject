import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getInviteByToken,
  getUserAccessLevel,
  getModelAccessList,
  checkAccess,
  resendInvite,
} from './modelAccess';
import type { SupabaseClient } from '@supabase/supabase-js';

// Helper to build a mock Supabase client with chainable query builder
function makeMockClient(overrides?: {
  from?: ReturnType<typeof vi.fn>;
  rpc?: ReturnType<typeof vi.fn>;
  auth?: { getUser: ReturnType<typeof vi.fn> };
}) {
  return {
    from: overrides?.from ?? vi.fn(),
    rpc: overrides?.rpc ?? vi.fn(),
    auth: overrides?.auth ?? { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
  } as unknown as SupabaseClient;
}

// ─── getInviteByToken ─────────────────────────────────────────────────────────

describe('getInviteByToken', () => {
  it('returns invite when found', async () => {
    const invite = {
      id: 'inv-1', token: 'tok-abc', model_id: 'm1',
      invited_email: 'user@test.com', role: 'edit', status: 'pending',
      invited_by: 'owner-1', expires_at: '2026-04-20T00:00:00Z', created_at: '2026-03-21T00:00:00Z',
    };
    const mockSingle = vi.fn().mockResolvedValue({ data: invite, error: null });
    const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
    const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });
    const client = makeMockClient({ from: mockFrom });

    const result = await getInviteByToken(client, 'tok-abc');

    expect(mockFrom).toHaveBeenCalledWith('invite_tokens');
    expect(mockSelect).toHaveBeenCalledWith('*');
    expect(mockEq).toHaveBeenCalledWith('token', 'tok-abc');
    expect(result).toEqual(invite);
  });

  it('returns null when not found (PGRST116)', async () => {
    const mockSingle = vi.fn().mockResolvedValue({
      data: null, error: { code: 'PGRST116', message: 'not found' },
    });
    const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
    const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });
    const client = makeMockClient({ from: mockFrom });

    const result = await getInviteByToken(client, 'bad-token');
    expect(result).toBeNull();
  });

  it('throws on other errors', async () => {
    const mockSingle = vi.fn().mockResolvedValue({
      data: null, error: { code: 'OTHER', message: 'db error' },
    });
    const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
    const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });
    const client = makeMockClient({ from: mockFrom });

    await expect(getInviteByToken(client, 'x')).rejects.toThrow('db error');
  });
});

// ─── getUserAccessLevel ───────────────────────────────────────────────────────

describe('getUserAccessLevel', () => {
  it('returns role from RPC', async () => {
    const mockRpc = vi.fn().mockResolvedValue({ data: 'owner', error: null });
    const client = makeMockClient({ rpc: mockRpc });

    const result = await getUserAccessLevel(client, 'm1', 'u1');

    expect(mockRpc).toHaveBeenCalledWith('get_user_access_level', {
      p_model_id: 'm1', p_user_id: 'u1',
    });
    expect(result).toBe('owner');
  });

  it('returns null when RPC returns null', async () => {
    const mockRpc = vi.fn().mockResolvedValue({ data: null, error: null });
    const client = makeMockClient({ rpc: mockRpc });

    const result = await getUserAccessLevel(client, 'm1', 'stranger');
    expect(result).toBeNull();
  });

  it('throws on RPC error', async () => {
    const mockRpc = vi.fn().mockResolvedValue({ data: null, error: { message: 'rpc failed' } });
    const client = makeMockClient({ rpc: mockRpc });

    await expect(getUserAccessLevel(client, 'm1', 'u1')).rejects.toThrow('rpc failed');
  });
});

// ─── getModelAccessList ───────────────────────────────────────────────────────

describe('getModelAccessList', () => {
  it('includes owner and merges model_access records with pending invite_tokens', async () => {
    const accessRecords = [
      {
        access_id: 'a1', user_id: 'u2', email: 'editor@test.com',
        role: 'edit', status: 'accepted',
        invited_at: '2026-03-20T00:00:00Z', accepted_at: '2026-03-20T12:00:00Z',
      },
    ];
    const pendingInvites = [
      {
        id: 'inv-2', invited_email: 'newuser@test.com', role: 'view',
        status: 'pending', created_at: '2026-03-21T00:00:00Z',
        expires_at: '2026-04-20T00:00:00Z',
      },
    ];

    const mockRpc = vi.fn()
      .mockResolvedValueOnce({ data: accessRecords, error: null }); // get_model_access_list

    // Mock for models.select (owner lookup)
    const mockModelSingle = vi.fn().mockResolvedValue({
      data: { user_id: 'owner-1' }, error: null,
    });
    const mockModelEq = vi.fn().mockReturnValue({ single: mockModelSingle });
    const mockModelSelect = vi.fn().mockReturnValue({ eq: mockModelEq });

    // Mock for invite_tokens query
    const mockOrder = vi.fn().mockResolvedValue({ data: pendingInvites, error: null });
    const mockIn = vi.fn().mockReturnValue({ order: mockOrder });
    const mockInviteEq = vi.fn().mockReturnValue({ in: mockIn });
    const mockInviteSelect = vi.fn().mockReturnValue({ eq: mockInviteEq });

    const mockFrom = vi.fn()
      .mockReturnValueOnce({ select: mockModelSelect }) // models
      .mockReturnValueOnce({ select: mockInviteSelect }); // invite_tokens

    const mockAuth = {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'owner-1', email: 'owner@test.com' } },
      }),
    };

    const client = makeMockClient({ from: mockFrom, rpc: mockRpc, auth: mockAuth });

    const result = await getModelAccessList(client, 'm1', 'owner-1');

    // Owner row should be first
    expect(result[0].email).toBe('owner@test.com');
    expect(result[0].role).toBe('owner');
    expect(result[0].canRemove).toBe(false);

    // Collaborator
    expect(result[1].email).toBe('editor@test.com');
    expect(result[1].status).toBe('accepted');

    // Pending invite for unregistered user
    expect(result[2].email).toBe('newuser@test.com');
    expect(result[2].userId).toBeNull();

    expect(result).toHaveLength(3);
  });
});

// ─── checkAccess ──────────────────────────────────────────────────────────────

describe('checkAccess', () => {
  it('owner has access to everything', async () => {
    const mockRpc = vi.fn().mockResolvedValue({ data: 'owner', error: null });
    const client = makeMockClient({ rpc: mockRpc });

    expect(await checkAccess(client, 'm1', 'u1', 'owner')).toBe(true);
    expect(await checkAccess(client, 'm1', 'u1', 'edit')).toBe(true);
    expect(await checkAccess(client, 'm1', 'u1', 'view')).toBe(true);
  });

  it('editor can view and edit but not own', async () => {
    const mockRpc = vi.fn().mockResolvedValue({ data: 'edit', error: null });
    const client = makeMockClient({ rpc: mockRpc });

    expect(await checkAccess(client, 'm1', 'u2', 'view')).toBe(true);
    expect(await checkAccess(client, 'm1', 'u2', 'edit')).toBe(true);
    expect(await checkAccess(client, 'm1', 'u2', 'owner')).toBe(false);
  });

  it('viewer can only view', async () => {
    const mockRpc = vi.fn().mockResolvedValue({ data: 'view', error: null });
    const client = makeMockClient({ rpc: mockRpc });

    expect(await checkAccess(client, 'm1', 'u3', 'view')).toBe(true);
    expect(await checkAccess(client, 'm1', 'u3', 'edit')).toBe(false);
    expect(await checkAccess(client, 'm1', 'u3', 'owner')).toBe(false);
  });

  it('no access returns false for all', async () => {
    const mockRpc = vi.fn().mockResolvedValue({ data: null, error: null });
    const client = makeMockClient({ rpc: mockRpc });

    expect(await checkAccess(client, 'm1', 'stranger', 'view')).toBe(false);
  });
});

// ─── resendInvite ─────────────────────────────────────────────────────────────

describe('resendInvite', () => {
  it('rejects resend of non-expired pending invite', async () => {
    const invite = {
      id: 'inv-1', token: 'tok-abc', model_id: 'm1',
      invited_email: 'user@test.com', role: 'edit', status: 'pending',
      invited_by: 'owner-1',
      expires_at: new Date(Date.now() + 86400000).toISOString(), // tomorrow
      created_at: '2026-03-21T00:00:00Z',
    };
    const mockSingle = vi.fn().mockResolvedValue({ data: invite, error: null });
    const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
    const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });
    const client = makeMockClient({ from: mockFrom });

    await expect(resendInvite(client, 'tok-abc', 'owner-1'))
      .rejects.toThrow('Invite has not expired yet');
  });

  it('rejects resend of accepted invite', async () => {
    const invite = {
      id: 'inv-1', token: 'tok-abc', model_id: 'm1',
      invited_email: 'user@test.com', role: 'edit', status: 'accepted',
      invited_by: 'owner-1',
      expires_at: '2026-01-01T00:00:00Z',
      created_at: '2026-03-21T00:00:00Z',
    };
    const mockSingle = vi.fn().mockResolvedValue({ data: invite, error: null });
    const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
    const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });
    const client = makeMockClient({ from: mockFrom });

    await expect(resendInvite(client, 'tok-abc', 'owner-1'))
      .rejects.toThrow('Cannot resend an already accepted invite');
  });

  it('rejects resend of declined invite', async () => {
    const invite = {
      id: 'inv-1', token: 'tok-abc', model_id: 'm1',
      invited_email: 'user@test.com', role: 'edit', status: 'declined',
      invited_by: 'owner-1',
      expires_at: '2026-01-01T00:00:00Z',
      created_at: '2026-03-21T00:00:00Z',
    };
    const mockSingle = vi.fn().mockResolvedValue({ data: invite, error: null });
    const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
    const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });
    const client = makeMockClient({ from: mockFrom });

    await expect(resendInvite(client, 'tok-abc', 'owner-1'))
      .rejects.toThrow('Cannot resend a declined invite');
  });
});
