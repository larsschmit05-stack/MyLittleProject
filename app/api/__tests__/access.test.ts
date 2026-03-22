import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetUser = vi.fn();

vi.mock('../../../lib/supabaseServer', () => ({
  createRouteHandlerClient: vi.fn(async () => ({
    auth: { getUser: () => mockGetUser() },
  })),
}));

const mockGetUserAccessLevel = vi.fn();
const mockGetModelAccessList = vi.fn();
const mockRevokeAccess = vi.fn();
vi.mock('../../../lib/db/modelAccess', () => ({
  getUserAccessLevel: (...args: unknown[]) => mockGetUserAccessLevel(...args),
  getModelAccessList: (...args: unknown[]) => mockGetModelAccessList(...args),
  revokeAccess: (...args: unknown[]) => mockRevokeAccess(...args),
}));

import { GET } from '../models/[modelId]/access/route';
import { DELETE } from '../models/[modelId]/access/[userId]/route';
import { NextRequest } from 'next/server';

const ownerUser = { id: 'owner-1', email: 'owner@test.com' };
const editorUser = { id: 'editor-1', email: 'editor@test.com' };

const accessList = [
  {
    id: 'owner', email: 'owner@test.com', role: 'owner', status: 'accepted',
    invitedAt: null, acceptedAt: null, canRemove: false, userId: 'owner-1',
  },
  {
    id: 'a1', email: 'editor@test.com', role: 'edit', status: 'accepted',
    invitedAt: '2026-03-20T00:00:00Z', acceptedAt: '2026-03-20T12:00:00Z',
    canRemove: true, userId: 'editor-1',
  },
];

// ─── GET /api/models/[modelId]/access ─────────────────────────────────────────

describe('GET /api/models/[modelId]/access', () => {
  const params = Promise.resolve({ modelId: 'm1' });

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: ownerUser }, error: null });
    mockGetUserAccessLevel.mockResolvedValue('owner');
    mockGetModelAccessList.mockResolvedValue(accessList);
  });

  it('returns 401 when not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

    const req = new NextRequest('http://localhost/api/models/m1/access');
    const res = await GET(req, { params });
    expect(res.status).toBe(401);
  });

  it('returns 403 when user has no access', async () => {
    mockGetUserAccessLevel.mockResolvedValue(null);

    const req = new NextRequest('http://localhost/api/models/m1/access');
    const res = await GET(req, { params });
    expect(res.status).toBe(403);
  });

  it('returns full access list (including owner) for owner', async () => {
    const req = new NextRequest('http://localhost/api/models/m1/access');
    const res = await GET(req, { params });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.currentUserRole).toBe('owner');
    expect(body.accessList).toEqual(accessList);
    expect(body.accessList[0].role).toBe('owner');
    expect(body.accessList[0].canRemove).toBe(false);

    // Verify server client was passed as first arg
    expect(mockGetModelAccessList).toHaveBeenCalledWith(
      expect.any(Object), 'm1', 'owner-1'
    );
  });

  it('returns empty access list for non-owner', async () => {
    mockGetUser.mockResolvedValue({ data: { user: editorUser }, error: null });
    mockGetUserAccessLevel.mockResolvedValue('edit');

    const req = new NextRequest('http://localhost/api/models/m1/access');
    const res = await GET(req, { params });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.currentUserRole).toBe('edit');
    expect(body.accessList).toEqual([]);
  });
});

// ─── DELETE /api/models/[modelId]/access/[userId] ─────────────────────────────

describe('DELETE /api/models/[modelId]/access/[userId]', () => {
  const params = Promise.resolve({ modelId: 'm1', userId: 'editor-1' });

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: ownerUser }, error: null });
    mockGetUserAccessLevel.mockResolvedValue('owner');
    mockRevokeAccess.mockResolvedValue(undefined);
  });

  it('returns 401 when not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

    const req = new NextRequest('http://localhost/api/models/m1/access/editor-1', { method: 'DELETE' });
    const res = await DELETE(req, { params });
    expect(res.status).toBe(401);
  });

  it('returns 403 when non-owner tries to revoke someone else', async () => {
    mockGetUser.mockResolvedValue({ data: { user: editorUser }, error: null });
    mockGetUserAccessLevel.mockResolvedValue('edit');

    // Editor trying to revoke a different user (not themselves)
    const otherParams = Promise.resolve({ modelId: 'm1', userId: 'other-user-1' });
    const req = new NextRequest('http://localhost/api/models/m1/access/other-user-1', { method: 'DELETE' });
    const res = await DELETE(req, { params: otherParams });
    expect(res.status).toBe(403);
  });

  it('returns 200 when non-owner leaves (self-revoke)', async () => {
    mockGetUser.mockResolvedValue({ data: { user: editorUser }, error: null });
    mockGetUserAccessLevel.mockResolvedValue('edit');

    const req = new NextRequest('http://localhost/api/models/m1/access/editor-1', { method: 'DELETE' });
    const res = await DELETE(req, { params });
    expect(res.status).toBe(200);
  });

  it('returns 400 when trying to revoke owner', async () => {
    const selfParams = Promise.resolve({ modelId: 'm1', userId: 'owner-1' });

    const req = new NextRequest('http://localhost/api/models/m1/access/owner-1', { method: 'DELETE' });
    const res = await DELETE(req, { params: selfParams });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('Cannot revoke owner');
  });

  it('returns 200 on successful revoke', async () => {
    const req = new NextRequest('http://localhost/api/models/m1/access/editor-1', { method: 'DELETE' });
    const res = await DELETE(req, { params });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);

    // Verify server client was passed as first arg
    expect(mockRevokeAccess).toHaveBeenCalledWith(
      expect.any(Object), 'm1', 'editor-1'
    );
  });
});
