import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '../../../../lib/supabaseServer';

export async function GET(): Promise<NextResponse> {
  try {
    const supabase = await createRouteHandlerClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get models where user has accepted access (not owner)
    const { data: accessRecords, error: accessError } = await supabase
      .from('model_access')
      .select('model_id, role')
      .eq('user_id', user.id)
      .eq('status', 'accepted');

    if (accessError) throw new Error(accessError.message);

    if (!accessRecords || accessRecords.length === 0) {
      return NextResponse.json({ models: [] });
    }

    // Fetch model details for each shared model
    const modelIds = accessRecords.map((r) => r.model_id);
    const { data: models, error: modelsError } = await supabase
      .from('models')
      .select('id, name, created_at, updated_at')
      .in('id', modelIds);

    if (modelsError) throw new Error(modelsError.message);

    // Merge role into model data
    const roleMap = new Map(accessRecords.map((r) => [r.model_id, r.role]));
    const result = (models ?? []).map((m) => ({
      ...m,
      role: roleMap.get(m.id) ?? 'view',
    }));

    return NextResponse.json({ models: result });
  } catch (err) {
    console.error('[GET /api/models/shared]', (err as Error).message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
