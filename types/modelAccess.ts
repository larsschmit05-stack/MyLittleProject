// V1.9 Model Sharing & Permissions types

export type AccessRole = 'owner' | 'edit' | 'view';
export type AccessStatus = 'pending' | 'accepted' | 'declined' | 'revoked';
export type InviteStatus = 'pending' | 'accepted' | 'declined' | 'expired' | 'revoked';

/** Matches the DB model_access table row shape */
export interface DbModelAccess {
  id: string;
  model_id: string;
  user_id: string;
  role: AccessRole;
  status: AccessStatus;
  invited_by: string | null;
  invited_at: string | null;
  accepted_at: string | null;
  created_at: string;
  updated_at: string;
}

/** Matches the DB invite_tokens table row shape */
export interface DbInviteToken {
  id: string;
  token: string;
  model_id: string;
  invited_email: string;
  role: AccessRole;
  status: InviteStatus;
  invited_by: string;
  expires_at: string;
  created_at: string;
}

/** Unified access list item for the share modal (owner view) */
export interface AccessListItem {
  id: string;
  email: string;
  role: AccessRole;
  status: AccessStatus | InviteStatus;
  invitedAt: string | null;
  acceptedAt: string | null;
  canRemove: boolean;
  userId: string | null;
  token?: string;
}

/** API response for GET /api/models/[modelId]/access */
export interface AccessListResponse {
  accessList: AccessListItem[];
  currentUserRole: AccessRole;
}

/** API request body for POST /api/models/[modelId]/invite */
export interface InviteRequest {
  email: string;
  role: 'edit' | 'view';
}

/** API response for POST /api/models/[modelId]/invite */
export interface InviteResponse {
  success: boolean;
  error?: string;
  invite?: {
    token: string;
    email: string;
    role: string;
    status: string;
    expiresAt: string;
  };
}

/** Invite acceptance page data */
export interface InviteDetails {
  modelName: string;
  modelId: string;
  role: AccessRole;
  inviterEmail: string;
  invitedEmail: string;
  status: InviteStatus;
  expiresAt: string;
}
