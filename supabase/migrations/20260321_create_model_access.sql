-- V1.9: Create model_access table for sharing permissions
-- Stores accepted/pending/revoked access records for invited users
-- Ownership is derived from models.user_id (not stored here)

CREATE TYPE model_role AS ENUM ('owner', 'edit', 'view');
CREATE TYPE access_status AS ENUM ('pending', 'accepted', 'declined', 'revoked');

CREATE TABLE model_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id UUID NOT NULL REFERENCES models(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role model_role NOT NULL,
  status access_status NOT NULL DEFAULT 'pending',
  invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT unique_model_user UNIQUE (model_id, user_id)
);

CREATE INDEX idx_model_access_model ON model_access(model_id);
CREATE INDEX idx_model_access_user ON model_access(user_id);
CREATE INDEX idx_model_access_model_status ON model_access(model_id, status);
