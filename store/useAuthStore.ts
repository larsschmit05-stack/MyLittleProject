import { create } from 'zustand';
import type { User } from '@supabase/supabase-js';
import * as authLib from '../lib/auth';

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  initAuth: () => Promise<void>;
  signup: (email: string, password: string) => Promise<{ error?: string }>;
  login: (email: string, password: string) => Promise<{ error?: string }>;
  logout: () => Promise<void>;
  clearError: () => void;
}

let authSubscription: { unsubscribe: () => void } | null = null;

const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,
  error: null,
  isAuthenticated: false,

  initAuth: async () => {
    // Unsubscribe previous listener to prevent duplicates on remount/HMR
    if (authSubscription) {
      authSubscription.unsubscribe();
      authSubscription = null;
    }

    const user = await authLib.getCurrentUser();
    set({ user, loading: false, isAuthenticated: !!user });

    const { data: { subscription } } = authLib.onAuthStateChange((user) => {
      set({ user, loading: false, isAuthenticated: !!user });
    });
    authSubscription = subscription;
  },

  signup: async (email, password) => {
    set({ error: null });
    const { error } = await authLib.signup(email, password);
    if (error) {
      set({ error });
      return { error };
    }
    return {};
  },

  login: async (email, password) => {
    set({ error: null });
    const { user, error } = await authLib.login(email, password);
    if (error) {
      set({ error });
      return { error };
    }
    set({ user, isAuthenticated: true });
    return {};
  },

  logout: async () => {
    set({ error: null });
    await authLib.logout();
    set({ user: null, isAuthenticated: false });
  },

  clearError: () => set({ error: null }),
}));

export default useAuthStore;
