import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '../../../../../lib/supabaseServer';
import { getUserAccessLevel, cancelInviteByEmail } from '../../../../../lib/db/modelAccess';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ modelId: string }> }
): Promise<NextResponse> {
  try {
    const { modelId } = await params;
    const supabase = await createRouteHandlerClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    // Only owner can cancel invites
    const callerRole = await getUserAccessLevel(supabase, modelId, user.id);
    if (callerRole !== 'owner') {
      return NextResponse.json({ success: false, error: 'Only the model owner can cancel invites' }, { status: 403 });
    }

    const body = await request.json();
    const email = body.email;
    if (!email || typeof email !== 'string') {
      return NextResponse.json({ success: false, error: 'Email is required' }, { status: 400 });
    }

    await cancelInviteByEmail(supabase, modelId, email);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[POST /api/models/[modelId]/cancel-invite]', (err as Error).message);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
