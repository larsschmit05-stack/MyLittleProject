-- Fix permission denied error on auth.users table in get_model_access_list
-- Simplify function to avoid accessing auth.users due to RLS restrictions
-- Frontend can now fetch pending invites to show access list

DROP FUNCTION IF EXISTS get_model_access_list(UUID);

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
  IF NOT EXISTS (SELECT 1 FROM models m WHERE m.id = p_model_id AND m.user_id = auth.uid()) THEN
    RETURN; -- returns empty set
  END IF;

  -- Return without joining to auth.users - we'll fetch emails from client
  RETURN QUERY
  SELECT
    ma.id AS access_id,
    ma.user_id,
    ''::TEXT as email, -- empty string placeholder
    ma.role::TEXT,
    ma.status::TEXT,
    ma.invited_at,
    ma.accepted_at
  FROM model_access ma
  WHERE ma.model_id = p_model_id
  ORDER BY ma.invited_at DESC;
END;
$$;
