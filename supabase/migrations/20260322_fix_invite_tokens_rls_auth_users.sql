-- Fix: Remove auth.users subquery from invite_tokens policies
-- Problem: RLS policies cannot access auth.users table directly
-- Solution: Remove invited_email checks; these are validated at application layer

DROP POLICY "Owners or invitees can view invite tokens (no recursion)" ON invite_tokens;
DROP POLICY "Owners or invitees can update invite tokens (no recursion)" ON invite_tokens;

-- Simplified SELECT: only owners can view tokens
CREATE POLICY "Owners can view invite tokens"
  ON invite_tokens FOR SELECT
  USING (auth.uid() = owner_id);

-- Simplified UPDATE: only owners can update tokens
CREATE POLICY "Owners can update invite tokens"
  ON invite_tokens FOR UPDATE
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);
