import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '../../../../../lib/supabaseServer';
import { getInviteByToken, resendInvite, getUserAccessLevel } from '../../../../../lib/db/modelAccess';
import { sendInviteEmail } from '../../../../../lib/email/sendInvite';

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
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    // Look up invite to get model_id
    const invite = await getInviteByToken(supabase, token);
    if (!invite) {
      return NextResponse.json({ success: false, error: 'Invite not found' }, { status: 404 });
    }

    // Only owner can resend
    const callerRole = await getUserAccessLevel(supabase, invite.model_id, user.id);
    if (callerRole !== 'owner') {
      return NextResponse.json(
        { success: false, error: 'Only the model owner can resend invites' },
        { status: 403 }
      );
    }

    // resendInvite validates that the invite is expired before proceeding
    const { newToken, invite: newInvite } = await resendInvite(supabase, token, user.id);

    // Get model name for email
    const { data: model } = await supabase
      .from('models')
      .select('name')
      .eq('id', invite.model_id)
      .single();

    // Send email
    const inviteLink = `${new URL(request.url).origin}/invites/${newToken}`;
    try {
      await sendInviteEmail({
        inviterName: user.email ?? 'A team member',
        inviteeEmail: newInvite.invited_email,
        modelName: model?.name ?? 'Untitled Model',
        role: newInvite.role as 'edit' | 'view',
        inviteLink,
      });
    } catch (emailErr) {
      console.warn('[POST /api/invites/[token]/resend] Email send failed, but invite was recreated:', emailErr);
    }

    return NextResponse.json({
      success: true,
      newToken,
      expiresAt: newInvite.expires_at,
    });
  } catch (err) {
    const message = (err as Error).message;
    if (message.includes('not found')) {
      return NextResponse.json({ success: false, error: message }, { status: 404 });
    }
    if (message.includes('Cannot resend') || message.includes('not expired')) {
      return NextResponse.json({ success: false, error: message }, { status: 400 });
    }
    console.error('[POST /api/invites/[token]/resend]', message);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
