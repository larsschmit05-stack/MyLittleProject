-- V1.9: RLS policies for model sharing
-- Updates existing models/scenarios policies to allow shared access
-- Adds policies for new model_access and invite_tokens tables

-- ═══════════════════════════════════════════
-- model_access RLS
-- ═══════════════════════════════════════════
ALTER TABLE model_access ENABLE ROW LEVEL SECURITY;

-- SELECT: Users can see access records for models they own OR their own records
CREATE POLICY "Users can view access for their models"
  ON model_access FOR SELECT
  USING (
    model_id IN (SELECT id FROM models WHERE user_id = auth.uid())
    OR user_id = auth.uid()
  );

-- INSERT: Only model owner can grant access
CREATE POLICY "Owners can insert model access"
  ON model_access FOR INSERT
  WITH CHECK (
    model_id IN (SELECT id FROM models WHERE user_id = auth.uid())
  );

-- UPDATE: Owner can update any record; invited user can update their own (accept/decline)
CREATE POLICY "Owners and invitees can update model access"
  ON model_access FOR UPDATE
  USING (
    model_id IN (SELECT id FROM models WHERE user_id = auth.uid())
    OR user_id = auth.uid()
  )
  WITH CHECK (
    model_id IN (SELECT id FROM models WHERE user_id = auth.uid())
    OR user_id = auth.uid()
  );

-- DELETE: Only model owner
CREATE POLICY "Owners can delete model access"
  ON model_access FOR DELETE
  USING (
    model_id IN (SELECT id FROM models WHERE user_id = auth.uid())
  );

-- ═══════════════════════════════════════════
-- invite_tokens RLS
-- ═══════════════════════════════════════════
ALTER TABLE invite_tokens ENABLE ROW LEVEL SECURITY;

-- SELECT: Model owner can list all invites; invited user can see their own invite by email match
CREATE POLICY "Owners or invitees can view invite tokens"
  ON invite_tokens FOR SELECT
  USING (
    model_id IN (SELECT id FROM models WHERE user_id = auth.uid())
    OR invited_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- INSERT: Only model owner can create invites
CREATE POLICY "Owners can create invite tokens"
  ON invite_tokens FOR INSERT
  WITH CHECK (
    model_id IN (SELECT id FROM models WHERE user_id = auth.uid())
  );

-- UPDATE: Model owner can update (resend/revoke); invited user can update their own (accept/decline)
CREATE POLICY "Owners or invitees can update invite tokens"
  ON invite_tokens FOR UPDATE
  USING (
    model_id IN (SELECT id FROM models WHERE user_id = auth.uid())
    OR invited_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  )
  WITH CHECK (
    model_id IN (SELECT id FROM models WHERE user_id = auth.uid())
    OR invited_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- ═══════════════════════════════════════════
-- Update models RLS for shared access
-- ═══════════════════════════════════════════

-- SELECT: Owner OR accepted shared user
DROP POLICY "Users can view their own models" ON models;
CREATE POLICY "Users can view own or shared models"
  ON models FOR SELECT
  USING (
    auth.uid() = user_id
    OR id IN (
      SELECT model_id FROM model_access
      WHERE user_id = auth.uid() AND status = 'accepted'
    )
  );

-- INSERT: Owner only (unchanged logic)
-- Policy "Users can insert their own models" remains as-is

-- UPDATE: Owner OR edit-role shared user
DROP POLICY "Users can update their own models" ON models;
CREATE POLICY "Users can update own or edit-shared models"
  ON models FOR UPDATE
  USING (
    auth.uid() = user_id
    OR id IN (
      SELECT model_id FROM model_access
      WHERE user_id = auth.uid() AND status = 'accepted' AND role = 'edit'
    )
  )
  WITH CHECK (
    auth.uid() = user_id
    OR id IN (
      SELECT model_id FROM model_access
      WHERE user_id = auth.uid() AND status = 'accepted' AND role = 'edit'
    )
  );

-- DELETE: Owner only (unchanged logic)
-- Policy "Users can delete their own models" remains as-is

-- ═══════════════════════════════════════════
-- Update scenarios RLS for shared access
-- ═══════════════════════════════════════════

-- Drop single ALL policy, replace with per-operation policies for sharing
DROP POLICY "Users can manage their model scenarios" ON scenarios;

CREATE POLICY "Users can view scenarios for accessible models"
  ON scenarios FOR SELECT
  USING (
    model_id IN (SELECT id FROM models WHERE user_id = auth.uid())
    OR model_id IN (
      SELECT model_id FROM model_access
      WHERE user_id = auth.uid() AND status = 'accepted'
    )
  );

CREATE POLICY "Users can insert scenarios for editable models"
  ON scenarios FOR INSERT
  WITH CHECK (
    model_id IN (SELECT id FROM models WHERE user_id = auth.uid())
    OR model_id IN (
      SELECT model_id FROM model_access
      WHERE user_id = auth.uid() AND status = 'accepted' AND role = 'edit'
    )
  );

CREATE POLICY "Users can update scenarios for editable models"
  ON scenarios FOR UPDATE
  USING (
    model_id IN (SELECT id FROM models WHERE user_id = auth.uid())
    OR model_id IN (
      SELECT model_id FROM model_access
      WHERE user_id = auth.uid() AND status = 'accepted' AND role = 'edit'
    )
  )
  WITH CHECK (
    model_id IN (SELECT id FROM models WHERE user_id = auth.uid())
    OR model_id IN (
      SELECT model_id FROM model_access
      WHERE user_id = auth.uid() AND status = 'accepted' AND role = 'edit'
    )
  );

CREATE POLICY "Users can delete scenarios for editable models"
  ON scenarios FOR DELETE
  USING (
    model_id IN (SELECT id FROM models WHERE user_id = auth.uid())
    OR model_id IN (
      SELECT model_id FROM model_access
      WHERE user_id = auth.uid() AND status = 'accepted' AND role = 'edit'
    )
  );
