import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetUser = vi.fn();

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
  })),
}));

// Minimal NextRequest / NextResponse mocks
function makeRequest(pathname: string) {
  const url = `http://localhost:3000${pathname}`;
  return {
    nextUrl: { pathname },
    url,
    cookies: {
      getAll: () => [],
    },
  };
}

// We need to mock next/server before importing middleware
const mockRedirect = vi.fn((url: URL) => ({
  type: 'redirect' as const,
  url: url.toString(),
  cookies: { set: vi.fn() },
}));

const mockNext = vi.fn(() => ({
  type: 'next' as const,
  cookies: { set: vi.fn() },
}));

vi.mock('next/server', () => ({
  NextResponse: {
    next: () => mockNext(),
    redirect: (url: URL) => mockRedirect(url),
  },
}));

import { middleware } from './middleware';

describe('middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('redirects unauthenticated user from /dashboard to /login', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const result = await middleware(makeRequest('/dashboard') as never);

    expect(result.type).toBe('redirect');
    expect(result.url).toContain('/login');
  });

  it('redirects unauthenticated user from /editor to /login', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const result = await middleware(makeRequest('/editor') as never);

    expect(result.type).toBe('redirect');
    expect(result.url).toContain('/login');
  });

  it('allows unauthenticated user on /login', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const result = await middleware(makeRequest('/login') as never);

    expect(result.type).toBe('next');
  });

  it('allows unauthenticated user on /signup', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const result = await middleware(makeRequest('/signup') as never);

    expect(result.type).toBe('next');
  });

  it('allows unauthenticated user on /', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const result = await middleware(makeRequest('/') as never);

    expect(result.type).toBe('next');
  });

  it('redirects authenticated user from /login to /dashboard', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });

    const result = await middleware(makeRequest('/login') as never);

    expect(result.type).toBe('redirect');
    expect(result.url).toContain('/dashboard');
  });

  it('redirects authenticated user from /signup to /dashboard', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });

    const result = await middleware(makeRequest('/signup') as never);

    expect(result.type).toBe('redirect');
    expect(result.url).toContain('/dashboard');
  });

  it('allows authenticated user on /dashboard', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });

    const result = await middleware(makeRequest('/dashboard') as never);

    expect(result.type).toBe('next');
  });

  it('allows authenticated user on /editor', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });

    const result = await middleware(makeRequest('/editor') as never);

    expect(result.type).toBe('next');
  });
});
