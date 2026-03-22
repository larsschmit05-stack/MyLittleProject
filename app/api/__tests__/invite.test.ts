import { describe, it, expect, vi, beforeEach } from 'vitest';

// vi.mock factories are hoisted — cannot reference outer variables
const mockGetUser = vi.fn();
const mockFrom = vi.fn();

vi.mock('../../../lib/supabaseServer', () => {
  // Return the mock inside the factory
  return {
    createRouteHandlerClient: vi.fn(async () => ({
      auth: { getUser: () => mockGetUser() },
      from: (...args: unknown[]) => mockFrom(...args),
      rpc: vi.fn(),
    })),
  };
});

const mockGetUserAccessLevel = vi.fn();
const mockCreateInvite = vi.fn();
vi.mock('../../../lib/db/modelAccess', () => ({
  getUserAccessLevel: (...args: unknown[]) => mockGetUserAccessLevel(...args),
  createInvite: (...args: unknown[]) => mockCreateInvite(...args),
}));

const mockSendInviteEmail = vi.fn();
vi.mock('../../../lib/email/sendInvite', () => ({
  sendInviteEmail: (...args: unknown[]) => mockSendInviteEmail(...args),
}));

import { POST } from '../models/[modelId]/invite/route';
import { NextRequest } from 'next/server';

function makeRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost/api/models/m1/invite', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

const params = Promise.resolve({ modelId: 'm1' });
const ownerUser = { id: 'owner-1', email: 'owner@test.com' };

describe('POST /api/models/[modelId]/invite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: ownerUser }, error: null });
    mockGetUserAccessLevel.mockResolvedValue('owner');
    mockCreateInvite.mockResolvedValue({ token: 'tok-123', id: 'inv-1' });
    mockSendInviteEmail.mockResolvedValue({ success: true });
    const mockSingle = vi.fn().mockResolvedValue({ data: { name: 'My Model' }, error: null });
    const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
    mockFrom.mockReturnValue({ select: mockSelect });
  });

  it('returns 401 when not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

    const res = await POST(makeRequest({ email: 'a@b.com', role: 'edit' }), { params });
    expect(res.status).toBe(401);
  });

  it('returns 400 for invalid email', async () => {
    const res = await POST(makeRequest({ email: 'not-an-email', role: 'edit' }), { params });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('Invalid email');
  });

  it('returns 400 for invalid role', async () => {
    const res = await POST(makeRequest({ email: 'a@b.com', role: 'admin' }), { params });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('Role must be');
  });

  it('returns 403 when caller is not owner', async () => {
    mockGetUserAccessLevel.mockResolvedValue('edit');

    const res = await POST(makeRequest({ email: 'a@b.com', role: 'edit' }), { params });
    expect(res.status).toBe(403);
  });

  it('returns 400 when inviting self', async () => {
    const res = await POST(makeRequest({ email: 'owner@test.com', role: 'view' }), { params });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('Cannot invite yourself');
  });

  it('returns 400 for duplicate invite', async () => {
    mockCreateInvite.mockRejectedValue(new Error('User already has a pending invite'));

    const res = await POST(makeRequest({ email: 'dup@test.com', role: 'edit' }), { params });
    expect(res.status).toBe(400);
  });

  it('returns 200 on successful invite', async () => {
    const res = await POST(makeRequest({ email: 'newuser@test.com', role: 'edit' }), { params });
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.invite.token).toBe('tok-123');
    expect(body.invite.email).toBe('newuser@test.com');

    // Verify createInvite received a client as first argument (any object)
    expect(mockCreateInvite).toHaveBeenCalledWith(
      expect.any(Object),
      'm1',
      'newuser@test.com',
      'edit',
      'owner-1'
    );

    expect(mockSendInviteEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        inviteeEmail: 'newuser@test.com',
        role: 'edit',
        inviteLink: 'http://localhost/invites/tok-123',
      })
    );
  });
});
