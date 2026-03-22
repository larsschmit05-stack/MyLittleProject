import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '../../../../../lib/supabaseServer';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
): Promise<NextResponse> {
  try {
    const { token } = await params;
    const supabase = await createRouteHandlerClient();

    // Auth check
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Call database function to decline invite (bypasses RLS with SECURITY DEFINER)
    const { error } = await supabase.rpc('decline_invite_by_token', {
      p_token: token,
      p_user_id: user.id,
    });

    if (error) {
      const message = error.message || '';
      if (message.includes('not found')) {
        return NextResponse.json({ error: 'Invite not found' }, { status: 404 });
      }
      if (message.includes('already')) {
        return NextResponse.json({ error: message }, { status: 400 });
      }
      throw error;
    }

    return NextResponse.json({
      success: true,
    });
  } catch (err) {
    console.error('[POST /api/invites/[token]/decline]', (err as Error).message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
