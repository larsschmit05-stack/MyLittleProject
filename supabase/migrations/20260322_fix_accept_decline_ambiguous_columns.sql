-- Fix ambiguous column references in accept_invite_by_token and decline_invite_by_token
-- PL/pgSQL variables like v_model_id conflicted with table columns of the same name.
-- Solution: qualify all column references with table aliases.

CREATE OR REPLACE FUNCTION accept_invite_by_token(p_token UUID, p_user_id UUID)
RETURNS TABLE (model_id UUID, role TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_invite invite_tokens%ROWTYPE;
  v_model_id UUID;
  v_owner_id UUID;
  v_now TIMESTAMPTZ;
BEGIN
  v_now := NOW();

  SELECT * INTO v_invite FROM invite_tokens it WHERE it.token = p_token;
  IF v_invite IS NULL THEN
    RAISE EXCEPTION 'Invite not found';
  END IF;

  IF v_invite.status != 'pending' THEN
    RAISE EXCEPTION 'Invite already %', v_invite.status;
  END IF;

  IF v_invite.expires_at < v_now THEN
    RAISE EXCEPTION 'Invite has expired';
  END IF;

  v_model_id := v_invite.model_id;

  SELECT m.user_id INTO v_owner_id FROM models m WHERE m.id = v_model_id;

  DELETE FROM model_access ma WHERE ma.model_id = v_model_id AND ma.user_id = p_user_id;

  INSERT INTO model_access (model_id, user_id, role, status, invited_by, invited_at, accepted_at, owner_id)
  VALUES (v_model_id, p_user_id, v_invite.role, 'accepted', v_invite.invited_by, v_invite.created_at, v_now, v_owner_id);

  UPDATE invite_tokens it SET status = 'accepted' WHERE it.id = v_invite.id;

  RETURN QUERY SELECT v_model_id, v_invite.role::TEXT;
END;
$$;

CREATE OR REPLACE FUNCTION decline_invite_by_token(p_token UUID, p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_invite invite_tokens%ROWTYPE;
BEGIN
  SELECT * INTO v_invite FROM invite_tokens it WHERE it.token = p_token;
  IF v_invite IS NULL THEN
    RAISE EXCEPTION 'Invite not found';
  END IF;

  IF v_invite.status != 'pending' THEN
    RAISE EXCEPTION 'Invite already %', v_invite.status;
  END IF;

  UPDATE invite_tokens it SET status = 'declined' WHERE it.id = v_invite.id;

  UPDATE model_access ma
  SET status = 'declined', updated_at = NOW()
  WHERE ma.model_id = v_invite.model_id
    AND ma.user_id = p_user_id
    AND ma.status = 'pending';
END;
$$;
