-- V1.9: Helper function to get a user's email by ID
-- SECURITY DEFINER: returns only the email for a specific user ID.
-- Used by the invite details endpoint to show inviter identity.
CREATE OR REPLACE FUNCTION get_user_email(p_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN (SELECT email::TEXT FROM auth.users WHERE id = p_user_id);
END;
$$;
