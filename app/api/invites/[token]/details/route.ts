import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '../../../../../lib/supabaseServer';
import { getInviteByToken } from '../../../../../lib/db/modelAccess';
import type { InviteDetails, InviteStatus } from '../../../../../types/modelAccess';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
): Promise<NextResponse> {
  try {
    const { token } = await params;
    const supabase = await createRouteHandlerClient();

    const invite = await getInviteByToken(supabase, token);
    if (!invite) {
      return NextResponse.json({ error: 'Invite not found' }, { status: 404 });
    }

    // Check if expired (status may still be 'pending' in DB)
    const isExpired = new Date(invite.expires_at) < new Date();
    const effectiveStatus: InviteStatus =
      invite.status === 'pending' && isExpired ? 'expired' : invite.status as InviteStatus;

    // Get model name
    const { data: model } = await supabase
      .from('models')
      .select('name')
      .eq('id', invite.model_id)
      .single();

    // Get inviter email via SECURITY DEFINER function
    let inviterEmail = 'A team member';
    const { data: emailResult } = await supabase.rpc('get_user_email', {
      p_user_id: invite.invited_by,
    });
    if (emailResult) {
      inviterEmail = emailResult;
    }

    const details: InviteDetails = {
      modelName: model?.name ?? 'Untitled Model',
      modelId: invite.model_id,
      role: invite.role as InviteDetails['role'],
      inviterEmail,
      invitedEmail: invite.invited_email,
      status: effectiveStatus,
      expiresAt: invite.expires_at,
    };

    return NextResponse.json(details);
  } catch (err) {
    console.error('[GET /api/invites/[token]/details]', (err as Error).message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
