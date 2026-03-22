import { getSupabaseClient } from './supabase';
import type { SerializedModel } from '../types/flow';

export function isSerializedModel(value: unknown): value is SerializedModel {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    Array.isArray(v.nodes) &&
    Array.isArray(v.edges) &&
    typeof v.globalDemand === 'number'
  );
}

export interface SavedModelRow {
  id: string;
  user_id: string;
  name: string;
  data: SerializedModel;
  created_at: string;
  updated_at: string;
}

export async function insertModel(
  name: string,
  model: SerializedModel
): Promise<string> {
  const client = getSupabaseClient();
  const { data: authData, error: authError } = await client.auth.getUser();
  if (authError) throw new Error(authError.message);
  if (!authData.user) throw new Error('Not authenticated');

  const { data, error } = await client
    .from('models')
    .insert({ name, data: model, user_id: authData.user.id })
    .select('id')
    .single();
  if (error) throw new Error(error.message);
  return data.id as string;
}

export async function updateModel(
  id: string,
  model: SerializedModel
): Promise<void> {
  const { error } = await getSupabaseClient()
    .from('models')
    .update({ data: model })
    .eq('id', id);
  if (error) throw new Error(error.message);
}

export async function fetchModel(id: string): Promise<SavedModelRow> {
  const { data, error } = await getSupabaseClient()
    .from('models')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw new Error(error.message);
  if (!isSerializedModel(data.data)) {
    throw new Error('Fetched row has an invalid SerializedModel shape');
  }
  return data as SavedModelRow;
}

export async function listModels(): Promise<Pick<SavedModelRow, 'id' | 'name' | 'created_at' | 'updated_at' | 'user_id'>[]> {
  const { data, error } = await getSupabaseClient()
    .from('models')
    .select('id, name, created_at, updated_at, user_id')
    .order('updated_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data as Pick<SavedModelRow, 'id' | 'name' | 'created_at' | 'updated_at' | 'user_id'>[];
}

export async function renameModel(id: string, name: string): Promise<void> {
  const { error } = await getSupabaseClient()
    .from('models')
    .update({ name })
    .eq('id', id);
  if (error) throw new Error(error.message);
}

export async function deleteModel(id: string): Promise<void> {
  const { error } = await getSupabaseClient()
    .from('models')
    .delete()
    .eq('id', id);
  if (error) throw new Error(error.message);
}

export async function duplicateModel(id: string): Promise<string> {
  const client = getSupabaseClient();
  const { data: authData, error: authError } = await client.auth.getUser();
  if (authError) throw new Error(authError.message);
  if (!authData.user) throw new Error('Not authenticated');

  const { data: original, error: fetchError } = await client
    .from('models')
    .select('name, data')
    .eq('id', id)
    .single();
  if (fetchError) throw new Error(fetchError.message);

  const newName = `${original.name} (Copy)`;
  const { data: created, error: insertError } = await client
    .from('models')
    .insert({ name: newName, data: original.data, user_id: authData.user.id })
    .select('id')
    .single();
  if (insertError) throw new Error(insertError.message);

  return created.id as string;
}
