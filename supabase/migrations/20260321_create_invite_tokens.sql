-- V1.9: Create invite_tokens table for email invitation tracking
-- Holds invitation link data; model_access record is created when accepted

CREATE TYPE invite_status AS ENUM ('pending', 'accepted', 'declined', 'expired', 'revoked');

CREATE TABLE invite_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  model_id UUID NOT NULL REFERENCES models(id) ON DELETE CASCADE,
  invited_email TEXT NOT NULL,
  role model_role NOT NULL,
  status invite_status NOT NULL DEFAULT 'pending',
  invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_invite_tokens_token ON invite_tokens(token);
CREATE INDEX idx_invite_tokens_model ON invite_tokens(model_id);
CREATE INDEX idx_invite_tokens_email ON invite_tokens(invited_email);
