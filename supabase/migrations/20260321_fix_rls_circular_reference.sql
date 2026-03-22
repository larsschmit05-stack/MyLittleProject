-- Fix V1.9: Resolve circular RLS reference between models and model_access
-- Problem: model_access policies queried models, models policies queried model_access
-- Solution: Add owner_id to model_access, use trigger to populate it
-- This breaks the circular dependency while maintaining the same authorization logic

-- Step 1: Add owner_id column to model_access
ALTER TABLE model_access ADD COLUMN owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Step 2: Populate owner_id for existing records by joining with models
UPDATE model_access ma
SET owner_id = m.user_id
FROM models m
WHERE ma.model_id = m.id;

-- Step 3: Make owner_id NOT NULL
ALTER TABLE model_access ALTER COLUMN owner_id SET NOT NULL;

-- Step 4: Create index on owner_id for performance
CREATE INDEX idx_model_access_owner ON model_access(owner_id);

-- Step 5: Create trigger to automatically populate owner_id on insert
CREATE OR REPLACE FUNCTION set_model_access_owner_id()
RETURNS TRIGGER AS $$
BEGIN
  SELECT user_id INTO NEW.owner_id FROM models WHERE id = NEW.model_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_model_access_owner_id
BEFORE INSERT ON model_access
FOR EACH ROW
EXECUTE FUNCTION set_model_access_owner_id();

-- Step 6: Drop and recreate model_access policies WITHOUT referencing models table
DROP POLICY "Users can view access for their models" ON model_access;
DROP POLICY "Owners can insert model access" ON model_access;
DROP POLICY "Owners and invitees can update model access" ON model_access;
DROP POLICY "Owners can delete model access" ON model_access;

-- NEW POLICIES: Use owner_id directly, no recursion
CREATE POLICY "Users can view access for their models (no recursion)"
  ON model_access FOR SELECT
  USING (
    auth.uid() = owner_id
    OR auth.uid() = user_id
  );

CREATE POLICY "Owners can insert model access (no recursion)"
  ON model_access FOR INSERT
  WITH CHECK (
    auth.uid() = owner_id
  );

CREATE POLICY "Owners and invitees can update model access (no recursion)"
  ON model_access FOR UPDATE
  USING (
    auth.uid() = owner_id
    OR auth.uid() = user_id
  )
  WITH CHECK (
    auth.uid() = owner_id
    OR auth.uid() = user_id
  );

CREATE POLICY "Owners can delete model access (no recursion)"
  ON model_access FOR DELETE
  USING (
    auth.uid() = owner_id
  );

-- Step 7: Drop and recreate invite_tokens policies WITHOUT referencing models table
DROP POLICY "Owners or invitees can view invite tokens" ON invite_tokens;
DROP POLICY "Owners can create invite tokens" ON invite_tokens;
DROP POLICY "Owners or invitees can update invite tokens" ON invite_tokens;

-- Add owner_id to invite_tokens as well
ALTER TABLE invite_tokens ADD COLUMN owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Populate existing invite_tokens
UPDATE invite_tokens it
SET owner_id = m.user_id
FROM models m
WHERE it.model_id = m.id;

-- Make owner_id NOT NULL
ALTER TABLE invite_tokens ALTER COLUMN owner_id SET NOT NULL;

-- Create trigger for invite_tokens
CREATE OR REPLACE FUNCTION set_invite_tokens_owner_id()
RETURNS TRIGGER AS $$
BEGIN
  SELECT user_id INTO NEW.owner_id FROM models WHERE id = NEW.model_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_invite_tokens_owner_id
BEFORE INSERT ON invite_tokens
FOR EACH ROW
EXECUTE FUNCTION set_invite_tokens_owner_id();

-- NEW POLICIES: No recursion
CREATE POLICY "Owners or invitees can view invite tokens (no recursion)"
  ON invite_tokens FOR SELECT
  USING (
    auth.uid() = owner_id
    OR invited_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

CREATE POLICY "Owners can create invite tokens (no recursion)"
  ON invite_tokens FOR INSERT
  WITH CHECK (
    auth.uid() = owner_id
  );

CREATE POLICY "Owners or invitees can update invite tokens (no recursion)"
  ON invite_tokens FOR UPDATE
  USING (
    auth.uid() = owner_id
    OR invited_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  )
  WITH CHECK (
    auth.uid() = owner_id
    OR invited_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );
