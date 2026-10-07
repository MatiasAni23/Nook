-- Historic/server-delivered messages must remain readable even if they exceed the new client input limit.
BEGIN;
CREATE OR REPLACE FUNCTION public.guard_client_message()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN
  IF current_user NOT IN ('authenticated', 'anon') THEN RETURN NEW; END IF;
  IF NOT is_current_account_active() THEN RAISE EXCEPTION 'active_account_required'; END IF;
  IF TG_OP = 'INSERT' THEN
    IF NEW.sender_id IS DISTINCT FROM auth.uid() OR NEW.read OR NEW.read_at IS NOT NULL
      OR NEW.deleted_by_sender OR NEW.deleted_by_receiver THEN
      RAISE EXCEPTION 'message_sender_fields';
    END IF;
    NEW.created_at := NOW();
  ELSE
    IF (to_jsonb(NEW) - ARRAY['read', 'read_at', 'deleted_by_sender', 'deleted_by_receiver'])
      IS DISTINCT FROM (to_jsonb(OLD) - ARRAY['read', 'read_at', 'deleted_by_sender', 'deleted_by_receiver']) THEN
      RAISE EXCEPTION 'message_content_immutable';
    END IF;
    IF NEW.deleted_by_sender IS DISTINCT FROM OLD.deleted_by_sender
      AND (auth.uid() IS DISTINCT FROM OLD.sender_id OR OLD.deleted_by_sender) THEN
      RAISE EXCEPTION 'message_hide_forbidden';
    END IF;
    IF NEW.deleted_by_receiver IS DISTINCT FROM OLD.deleted_by_receiver
      AND (auth.uid() IS DISTINCT FROM OLD.receiver_id OR OLD.deleted_by_receiver) THEN
      RAISE EXCEPTION 'message_hide_forbidden';
    END IF;
    IF NEW.read IS DISTINCT FROM OLD.read AND (auth.uid() IS DISTINCT FROM OLD.receiver_id OR OLD.read) THEN
      RAISE EXCEPTION 'message_read_forbidden';
    END IF;
    NEW.read_at := CASE WHEN NEW.read AND NOT OLD.read THEN NOW() ELSE OLD.read_at END;
  END IF;
  IF TG_OP = 'INSERT' AND (NULLIF(trim(NEW.message), '') IS NULL OR length(NEW.message) > 4000) THEN
    RAISE EXCEPTION 'invalid_message_length';
  END IF;
  RETURN NEW;
END;
$$;
COMMIT;
