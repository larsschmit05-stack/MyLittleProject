import { getSupabaseClient } from '../supabase';
import type { DbScenario, ScenarioInsert, ScenarioUpdate } from '../../types/scenario';

export async function getScenarios(modelId: string): Promise<DbScenario[]> {
  const { data, error } = await getSupabaseClient()
    .from('scenarios')
    .select('*')
    .eq('model_id', modelId)
    .order('created_at', { ascending: true });
  if (error) throw new Error(error.message);
  return data as DbScenario[];
}

export async function getScenario(id: string): Promise<DbScenario> {
  const { data, error } = await getSupabaseClient()
    .from('scenarios')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw new Error(error.message);
  return data as DbScenario;
}

export async function createScenario(payload: ScenarioInsert): Promise<string> {
  const { data, error } = await getSupabaseClient()
    .from('scenarios')
    .insert(payload)
    .select('id')
    .single();
  if (error) throw new Error(error.message);
  return data.id as string;
}

export async function updateScenario(id: string, updates: ScenarioUpdate): Promise<void> {
  const { error } = await getSupabaseClient()
    .from('scenarios')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw new Error(error.message);
}

export async function deleteScenario(id: string): Promise<void> {
  const { error } = await getSupabaseClient()
    .from('scenarios')
    .delete()
    .eq('id', id);
  if (error) throw new Error(error.message);
}
