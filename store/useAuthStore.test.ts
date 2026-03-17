import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { User } from '@supabase/supabase-js';

vi.mock('../lib/auth', () => ({
  signup: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
  getCurrentUser: vi.fn(),
  onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
}));

import useAuthStore from './useAuthStore';
import * as authLib from '../lib/auth';

const mockUser: User = {
  id: 'user-123',
  email: 'test@example.com',
  aud: 'authenticated',
  app_metadata: {},
  user_metadata: {},
  created_at: '2024-01-01T00:00:00Z',
} as User;

function resetStore() {
  useAuthStore.setState({
    user: null,
    loading: true,
    error: null,
    isAuthenticated: false,
  });
}

describe('useAuthStore', () => {
  beforeEach(() => {
    resetStore();
    vi.clearAllMocks();
  });

  it('initAuth sets user from getCurrentUser', async () => {
    vi.mocked(authLib.getCurrentUser).mockResolvedValue(mockUser);

    await useAuthStore.getState().initAuth();

    const state = useAuthStore.getState();
    expect(state.user).toEqual(mockUser);
    expect(state.isAuthenticated).toBe(true);
    expect(state.loading).toBe(false);
  });

  it('initAuth sets null user when not logged in', async () => {
    vi.mocked(authLib.getCurrentUser).mockResolvedValue(null);

    await useAuthStore.getState().initAuth();

    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.isAuthenticated).toBe(false);
    expect(state.loading).toBe(false);
  });

  it('login sets user and isAuthenticated on success', async () => {
    vi.mocked(authLib.login).mockResolvedValue({
      user: mockUser,
      session: {} as never,
      error: null,
    });

    const result = await useAuthStore.getState().login('test@example.com', 'Password1');

    expect(result.error).toBeUndefined();
    const state = useAuthStore.getState();
    expect(state.user).toEqual(mockUser);
    expect(state.isAuthenticated).toBe(true);
  });

  it('login sets error on failure', async () => {
    vi.mocked(authLib.login).mockResolvedValue({
      user: null,
      session: null,
      error: 'Invalid email or password',
    });

    const result = await useAuthStore.getState().login('test@example.com', 'wrong');

    expect(result.error).toBe('Invalid email or password');
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.isAuthenticated).toBe(false);
    expect(state.error).toBe('Invalid email or password');
  });

  it('logout clears user and isAuthenticated', async () => {
    // Start with authenticated state
    useAuthStore.setState({ user: mockUser, isAuthenticated: true });
    vi.mocked(authLib.logout).mockResolvedValue({ error: null });

    await useAuthStore.getState().logout();

    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.isAuthenticated).toBe(false);
  });

  it('signup returns error on duplicate email', async () => {
    vi.mocked(authLib.signup).mockResolvedValue({
      user: null,
      error: 'User already registered',
    });

    const result = await useAuthStore.getState().signup('existing@example.com', 'Password1');

    expect(result.error).toBe('User already registered');
    expect(useAuthStore.getState().error).toBe('User already registered');
  });

  it('signup returns no error on success', async () => {
    vi.mocked(authLib.signup).mockResolvedValue({
      user: mockUser,
      error: null,
    });

    const result = await useAuthStore.getState().signup('new@example.com', 'Password1');

    expect(result.error).toBeUndefined();
  });

  it('clearError resets error to null', () => {
    useAuthStore.setState({ error: 'some error' });

    useAuthStore.getState().clearError();

    expect(useAuthStore.getState().error).toBeNull();
  });

  it('initAuth unsubscribes previous listener on re-init', async () => {
    const unsubscribe1 = vi.fn();
    const unsubscribe2 = vi.fn();
    vi.mocked(authLib.getCurrentUser).mockResolvedValue(null);
    vi.mocked(authLib.onAuthStateChange)
      .mockReturnValueOnce({ data: { subscription: { unsubscribe: unsubscribe1 } } } as never)
      .mockReturnValueOnce({ data: { subscription: { unsubscribe: unsubscribe2 } } } as never);

    await useAuthStore.getState().initAuth();
    expect(unsubscribe1).not.toHaveBeenCalled();

    await useAuthStore.getState().initAuth();
    expect(unsubscribe1).toHaveBeenCalledOnce();
    expect(unsubscribe2).not.toHaveBeenCalled();
  });
});
