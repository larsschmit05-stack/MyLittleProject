import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '../../../../../../lib/supabaseServer';
import { getUserAccessLevel, revokeAccess } from '../../../../../../lib/db/modelAccess';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ modelId: string; userId: string }> }
): Promise<NextResponse> {
  try {
    const { modelId, userId: targetUserId } = await params;
    const supabase = await createRouteHandlerClient();

    // Auth check
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const callerRole = await getUserAccessLevel(supabase, modelId, user.id);
    const isSelfLeave = targetUserId === user.id;

    if (isSelfLeave) {
      // Collaborators can leave (revoke their own access), but owners cannot
      if (callerRole === 'owner') {
        return NextResponse.json({ success: false, error: 'Cannot revoke owner access' }, { status: 400 });
      }
      if (!callerRole) {
        return NextResponse.json({ success: false, error: 'No access to revoke' }, { status: 400 });
      }
    } else {
      // Only owner can revoke someone else's access
      if (callerRole !== 'owner') {
        return NextResponse.json({ success: false, error: 'Only the model owner can revoke access' }, { status: 403 });
      }
    }

    await revokeAccess(supabase, modelId, targetUserId);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[DELETE /api/models/[modelId]/access/[userId]]', (err as Error).message);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
