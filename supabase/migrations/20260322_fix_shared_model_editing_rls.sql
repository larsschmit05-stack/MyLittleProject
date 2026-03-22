-- Fix: Allow shared users with edit role to update models
-- Issue: The UPDATE policy on models requires checking model_access subquery,
-- which may fail if the lookup is inefficient or status is pending.
-- Solution: Optimize RLS and ensure status check is correct.

-- First, verify models RLS is correct (may be missing or have old policies)
DROP POLICY IF EXISTS "Users can update own or edit-shared models" ON models;

-- Recreate the UPDATE policy with explicit optimization
CREATE POLICY "Users can update own or edit-shared models"
  ON models FOR UPDATE
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM model_access ma
      WHERE ma.model_id = models.id
        AND ma.user_id = auth.uid()
        AND ma.status = 'accepted'
        AND ma.role = 'edit'
    )
  )
  WITH CHECK (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM model_access ma
      WHERE ma.model_id = models.id
        AND ma.user_id = auth.uid()
        AND ma.status = 'accepted'
        AND ma.role = 'edit'
    )
  );

-- Also verify scenarios RLS allows edit for shared users
DROP POLICY IF EXISTS "Users can update scenarios for editable models" ON scenarios;

CREATE POLICY "Users can update scenarios for editable models"
  ON scenarios FOR UPDATE
  USING (
    model_id IN (SELECT id FROM models WHERE user_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM model_access ma
      WHERE ma.model_id = scenarios.model_id
        AND ma.user_id = auth.uid()
        AND ma.status = 'accepted'
        AND ma.role = 'edit'
    )
  )
  WITH CHECK (
    model_id IN (SELECT id FROM models WHERE user_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM model_access ma
      WHERE ma.model_id = scenarios.model_id
        AND ma.user_id = auth.uid()
        AND ma.status = 'accepted'
        AND ma.role = 'edit'
    )
  );

-- Verify index exists for model_access lookups
CREATE INDEX IF NOT EXISTS idx_model_access_lookup
  ON model_access(model_id, user_id, status, role);
