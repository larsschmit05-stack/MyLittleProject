import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '../../../../../lib/supabaseServer';
import { createInvite, getUserAccessLevel } from '../../../../../lib/db/modelAccess';
import { sendInviteEmail } from '../../../../../lib/email/sendInvite';
import type { InviteRequest } from '../../../../../types/modelAccess';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(
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

    // Parse and validate body
    const body = (await request.json()) as InviteRequest;
    const email = body.email?.trim().toLowerCase();
    const role = body.role;

    if (!email || !EMAIL_REGEX.test(email)) {
      return NextResponse.json({ success: false, error: 'Invalid email address' }, { status: 400 });
    }

    if (role !== 'edit' && role !== 'view') {
      return NextResponse.json({ success: false, error: 'Role must be "edit" or "view"' }, { status: 400 });
    }

    // Check caller is owner
    const accessLevel = await getUserAccessLevel(supabase, modelId, user.id);
    if (accessLevel !== 'owner') {
      return NextResponse.json({ success: false, error: 'Only the model owner can send invites' }, { status: 403 });
    }

    // Cannot invite yourself
    if (user.email?.toLowerCase() === email) {
      return NextResponse.json({ success: false, error: 'Cannot invite yourself' }, { status: 400 });
    }

    // Create invite (uses the authenticated server client for RLS)
    const { token } = await createInvite(supabase, modelId, email, role, user.id);

    // Get model name for email
    const { data: model } = await supabase
      .from('models')
      .select('name')
      .eq('id', modelId)
      .single();

    // Send email (non-blocking — invite record exists even if email fails)
    const inviteLink = `${new URL(request.url).origin}/invites/${token}`;
    try {
      await sendInviteEmail({
        inviterName: user.email ?? 'A team member',
        inviteeEmail: email,
        modelName: model?.name ?? 'Untitled Model',
        role,
        inviteLink,
      });
    } catch (emailErr) {
      console.warn('[POST /api/models/[modelId]/invite] Email send failed, but invite was created:', emailErr);
      // Don't fail the request if email fails — the invite record still exists
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    return NextResponse.json({
      success: true,
      invite: {
        token,
        email,
        role,
        status: 'pending',
        expiresAt: expiresAt.toISOString(),
      },
    });
  } catch (err) {
    const message = (err as Error).message;
    if (message.includes('already has')) {
      return NextResponse.json({ success: false, error: message }, { status: 400 });
    }
    console.error('[POST /api/models/[modelId]/invite]', message);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
