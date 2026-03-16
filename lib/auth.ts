import { getSupabaseClient } from './supabase';
import type { User } from '@supabase/supabase-js';

export async function signup(email: string, password: string) {
  const { data, error } = await getSupabaseClient().auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${window.location.origin}/login`,
    },
  });
  if (error) return { user: null, error: error.message };
  return { user: data.user, error: null };
}

export async function login(email: string, password: string) {
  const { data, error } = await getSupabaseClient().auth.signInWithPassword({
    email,
    password,
  });
  if (error) return { session: null, user: null, error: error.message };
  return { session: data.session, user: data.user, error: null };
}

export async function logout() {
  const { error } = await getSupabaseClient().auth.signOut();
  return { error: error?.message ?? null };
}

export async function getCurrentUser(): Promise<User | null> {
  const { data } = await getSupabaseClient().auth.getUser();
  return data?.user ?? null;
}

export function onAuthStateChange(callback: (user: User | null) => void) {
  return getSupabaseClient().auth.onAuthStateChange((_event, session) => {
    callback(session?.user ?? null);
  });
}
