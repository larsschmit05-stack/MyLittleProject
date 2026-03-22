-- V1.9: Helper stored procedures for model access checks

-- Returns the user's access level for a given model
-- Returns 'owner', 'edit', 'view', or NULL (no access)
-- SECURITY DEFINER: safe because it only returns a role string for the
-- specific (model_id, user_id) pair — no enumeration possible.
CREATE OR REPLACE FUNCTION get_user_access_level(p_model_id UUID, p_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if user is model owner
  IF EXISTS (SELECT 1 FROM models WHERE id = p_model_id AND user_id = p_user_id) THEN
    RETURN 'owner';
  END IF;

  -- Check model_access table for accepted access
  RETURN (
    SELECT role::TEXT FROM model_access
    WHERE model_id = p_model_id
      AND user_id = p_user_id
      AND status = 'accepted'
    LIMIT 1
  );
END;
$$;

-- Returns the full access list for a model (for owner's share modal)
-- Joins with auth.users to get email addresses.
-- SECURITY DEFINER with built-in ownership guard: only the model owner
-- can retrieve results. Returns empty set for non-owners.
CREATE OR REPLACE FUNCTION get_model_access_list(p_model_id UUID)
RETURNS TABLE (
  access_id UUID,
  user_id UUID,
  email TEXT,
  role TEXT,
  status TEXT,
  invited_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Guard: only the model owner can call this
  IF NOT EXISTS (SELECT 1 FROM models WHERE id = p_model_id AND user_id = auth.uid()) THEN
    RETURN; -- returns empty set
  END IF;

  RETURN QUERY
  SELECT
    ma.id AS access_id,
    ma.user_id,
    au.email::TEXT,
    ma.role::TEXT,
    ma.status::TEXT,
    ma.invited_at,
    ma.accepted_at
  FROM model_access ma
  JOIN auth.users au ON au.id = ma.user_id
  WHERE ma.model_id = p_model_id
  ORDER BY ma.invited_at DESC;
END;
$$;
