import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '../../../../../lib/supabaseServer';
import { getUserAccessLevel, getModelAccessList } from '../../../../../lib/db/modelAccess';
import type { AccessListResponse } from '../../../../../types/modelAccess';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ modelId: string }> }
): Promise<NextResponse> {
  try {
    const { modelId } = await params;
    const supabase = await createRouteHandlerClient();

    // Auth check
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    // Get current user's access level
    const currentUserRole = await getUserAccessLevel(supabase, modelId, user.id);
    if (!currentUserRole) {
      return NextResponse.json({ success: false, error: 'No access to this model' }, { status: 403 });
    }

    // Owner gets full access list (including owner row); non-owners get only their role
    let accessList: AccessListResponse['accessList'] = [];
    if (currentUserRole === 'owner') {
      accessList = await getModelAccessList(supabase, modelId, user.id);
    }

    const response: AccessListResponse = {
      accessList,
      currentUserRole,
    };

    return NextResponse.json(response);
  } catch (err) {
    console.error('[GET /api/models/[modelId]/access]', (err as Error).message);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
