import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  DbInviteToken,
  AccessRole,
  AccessListItem,
} from '../../types/modelAccess';

const INVITE_EXPIRY_DAYS = 30;

// ─── Invite Management ──────────────────────────────────────────

export async function createInvite(
  client: SupabaseClient,
  modelId: string,
  inviteeEmail: string,
  role: 'edit' | 'view',
  invitedByUserId: string
): Promise<{ token: string; id: string }> {
  const normalizedEmail = inviteeEmail.toLowerCase();

  // Check for existing pending invite for this email+model
  // Allow re-invite if previous was declined/revoked/expired
  const { data: existing } = await client
    .from('invite_tokens')
    .select('id, status')
    .eq('model_id', modelId)
    .eq('invited_email', normalizedEmail)
    .in('status', ['pending', 'accepted'])
    .limit(1);

  if (existing && existing.length > 0) {
    const status = existing[0].status;
    if (status === 'accepted') {
      throw new Error('User already has access to this model');
    }
    throw new Error('User already has a pending invite');
  }

  // Check model_access for an accepted record (covers case where invite was accepted)
  const { data: existingAccess } = await client
    .from('model_access')
    .select('id, status')
    .eq('model_id', modelId)
    .eq('user_id', invitedByUserId) // placeholder — we can't look up by email via RLS
    .limit(0); // just to validate the query works

  // Note: we can't look up the invitee's user_id here because we only have their email.
  // The model_access record will be created when they accept the invite.

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + INVITE_EXPIRY_DAYS);

  const { data, error } = await client
    .from('invite_tokens')
    .insert({
      model_id: modelId,
      invited_email: normalizedEmail,
      role,
      invited_by: invitedByUserId,
      expires_at: expiresAt.toISOString(),
    })
    .select('id, token')
    .single();

  if (error) throw new Error(error.message);

  return { token: data.token, id: data.id };
}

export async function getInviteByToken(
  client: SupabaseClient,
  token: string
): Promise<DbInviteToken | null> {
  const { data, error } = await client
    .from('invite_tokens')
    .select('*')
    .eq('token', token)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw new Error(error.message);
  }
  return data as DbInviteToken;
}

export async function acceptInvite(
  client: SupabaseClient,
  token: string,
  userId: string
): Promise<{ modelId: string; role: string }> {
  const invite = await getInviteByToken(client, token);
  if (!invite) throw new Error('Invite not found');
  if (invite.status !== 'pending') throw new Error(`Invite already ${invite.status}`);
  if (new Date(invite.expires_at) < new Date()) throw new Error('Invite has expired');

  const now = new Date().toISOString();

  // Upsert model_access: create or update to accepted
  // Handles the case where a previous invite was revoked/declined
  const { data: existing } = await client
    .from('model_access')
    .select('id')
    .eq('model_id', invite.model_id)
    .eq('user_id', userId)
    .single();

  if (existing) {
    const { error } = await client
      .from('model_access')
      .update({
        role: invite.role,
        status: 'accepted',
        accepted_at: now,
        updated_at: now,
      })
      .eq('id', existing.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await client.from('model_access').insert({
      model_id: invite.model_id,
      user_id: userId,
      role: invite.role,
      status: 'accepted',
      invited_by: invite.invited_by,
      invited_at: invite.created_at,
      accepted_at: now,
    });
    if (error) throw new Error(error.message);
  }

  // Update invite token status
  const { error: updateError } = await client
    .from('invite_tokens')
    .update({ status: 'accepted' })
    .eq('id', invite.id);
  if (updateError) throw new Error(updateError.message);

  return { modelId: invite.model_id, role: invite.role };
}

export async function declineInvite(
  client: SupabaseClient,
  token: string,
  userId: string
): Promise<void> {
  const invite = await getInviteByToken(client, token);
  if (!invite) throw new Error('Invite not found');
  if (invite.status !== 'pending') throw new Error(`Invite already ${invite.status}`);

  // Update invite token
  const { error } = await client
    .from('invite_tokens')
    .update({ status: 'declined' })
    .eq('id', invite.id);
  if (error) throw new Error(error.message);

  // Update model_access if it exists (e.g. from a previous cycle)
  await client
    .from('model_access')
    .update({
      status: 'declined',
      updated_at: new Date().toISOString(),
    })
    .eq('model_id', invite.model_id)
    .eq('user_id', userId)
    .eq('status', 'pending');
}

export async function resendInvite(
  client: SupabaseClient,
  oldToken: string,
  invitedByUserId: string
): Promise<{ newToken: string; invite: DbInviteToken }> {
  const invite = await getInviteByToken(client, oldToken);
  if (!invite) throw new Error('Invite not found');

  // Only allow resend for expired or pending-but-expired invites
  const isExpired = new Date(invite.expires_at) < new Date();
  if (invite.status === 'accepted') {
    throw new Error('Cannot resend an already accepted invite');
  }
  if (invite.status === 'declined') {
    throw new Error('Cannot resend a declined invite. Create a new invite instead.');
  }
  if (invite.status !== 'pending' && invite.status !== 'expired') {
    throw new Error(`Cannot resend invite with status "${invite.status}"`);
  }
  if (invite.status === 'pending' && !isExpired) {
    throw new Error('Invite has not expired yet. It is still active.');
  }

  const newExpiresAt = new Date();
  newExpiresAt.setDate(newExpiresAt.getDate() + INVITE_EXPIRY_DAYS);

  // Mark old invite as expired
  await client
    .from('invite_tokens')
    .update({ status: 'expired' })
    .eq('id', invite.id);

  // Create a new invite token
  const { data, error } = await client
    .from('invite_tokens')
    .insert({
      model_id: invite.model_id,
      invited_email: invite.invited_email,
      role: invite.role,
      invited_by: invitedByUserId,
      expires_at: newExpiresAt.toISOString(),
    })
    .select('*')
    .single();

  if (error) throw new Error(error.message);
  return { newToken: data.token, invite: data as DbInviteToken };
}

// ─── Access Queries ─────────────────────────────────────────────

export async function getUserAccessLevel(
  client: SupabaseClient,
  modelId: string,
  userId: string
): Promise<AccessRole | null> {
  const { data, error } = await client.rpc('get_user_access_level', {
    p_model_id: modelId,
    p_user_id: userId,
  });

  if (error) throw new Error(error.message);
  return (data as AccessRole) ?? null;
}

export async function getModelAccessList(
  client: SupabaseClient,
  modelId: string,
  ownerUserId: string
): Promise<AccessListItem[]> {
  const items: AccessListItem[] = [];

  // First, add the owner to the list
  const { data: ownerModel } = await client
    .from('models')
    .select('user_id')
    .eq('id', modelId)
    .single();

  if (ownerModel) {
    // We need the owner's email — get it from auth
    const { data: { user: currentUser } } = await client.auth.getUser();
    if (currentUser && currentUser.id === ownerModel.user_id) {
      items.push({
        id: 'owner',
        email: currentUser.email ?? '',
        role: 'owner',
        status: 'accepted',
        invitedAt: null,
        acceptedAt: null,
        canRemove: false,
        userId: ownerModel.user_id,
      });
    }
  }

  // Get pending invite_tokens for users who haven't signed up yet
  // (This is the only data we can reliably get without auth.users access)
  const { data: pendingInvites } = await client
    .from('invite_tokens')
    .select('*')
    .eq('model_id', modelId)
    .in('status', ['pending', 'expired'])
    .order('created_at', { ascending: false });

  if (pendingInvites) {
    for (const inv of pendingInvites) {
      const isExpired = new Date(inv.expires_at) < new Date();
      items.push({
        id: inv.id,
        email: inv.invited_email,
        role: inv.role as AccessRole,
        status: isExpired ? 'expired' : 'pending',
        invitedAt: inv.created_at,
        acceptedAt: null,
        canRemove: true,
        userId: null,
        token: inv.token,
      });
    }
  }

  return items;
}

export async function revokeAccess(
  client: SupabaseClient,
  modelId: string,
  targetUserId: string
): Promise<void> {
  const now = new Date().toISOString();

  // Revoke model_access
  const { error } = await client
    .from('model_access')
    .update({ status: 'revoked', updated_at: now })
    .eq('model_id', modelId)
    .eq('user_id', targetUserId);
  if (error) throw new Error(error.message);

  // Also revoke any pending/accepted invite_tokens for this user's email
  const { data: accessRecords } = await client.rpc('get_model_access_list', {
    p_model_id: modelId,
  });

  const userRecord = accessRecords?.find(
    (r: { user_id: string }) => r.user_id === targetUserId
  );
  if (userRecord?.email) {
    await client
      .from('invite_tokens')
      .update({ status: 'revoked' })
      .eq('model_id', modelId)
      .eq('invited_email', userRecord.email.toLowerCase())
      .in('status', ['pending', 'accepted']);
  }
}

export async function cancelInviteByEmail(
  client: SupabaseClient,
  modelId: string,
  email: string
): Promise<void> {
  const { error } = await client
    .from('invite_tokens')
    .update({ status: 'revoked' })
    .eq('model_id', modelId)
    .eq('invited_email', email.toLowerCase())
    .in('status', ['pending', 'expired']);
  if (error) throw new Error(error.message);
}

export async function checkAccess(
  client: SupabaseClient,
  modelId: string,
  userId: string,
  requiredRole: 'view' | 'edit' | 'owner'
): Promise<boolean> {
  const role = await getUserAccessLevel(client, modelId, userId);
  if (!role) return false;

  const hierarchy: Record<string, number> = { owner: 3, edit: 2, view: 1 };
  return (hierarchy[role] ?? 0) >= (hierarchy[requiredRole] ?? 0);
}
