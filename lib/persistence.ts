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
  name: string;
  data: SerializedModel;
  created_at: string;
  updated_at: string;
}

export async function insertModel(
  name: string,
  model: SerializedModel
): Promise<string> {
  const { data, error } = await getSupabaseClient()
    .from('models')
    .insert({ name, data: model })
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
