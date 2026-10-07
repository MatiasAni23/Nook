-- Separate private account data from the minimal profiles used by other people.
BEGIN;

ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS study_profile_visible BOOLEAN NOT NULL DEFAULT FALSE;

-- Replace every SELECT policy: permissive policies are combined with OR.
DO $$
DECLARE t TEXT; p RECORD;
BEGIN
  FOREACH t IN ARRAY ARRAY['users', 'user_profiles'] LOOP
    FOR p IN SELECT policyname FROM pg_policies
      WHERE schemaname = 'public' AND tablename = t AND cmd = 'SELECT' LOOP
      EXECUTE format('DROP POLICY %I ON public.%I', p.policyname, t);
    END LOOP;
  END LOOP;
END;
$$;
CREATE POLICY users_select_private ON public.users FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.is_current_user_admin());
CREATE POLICY profiles_select_private ON public.user_profiles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_current_user_admin());

CREATE OR REPLACE FUNCTION public.is_current_account_active()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND status IN ('active', 'verified'));
$$;

-- Explicit projection, never RETURNS SETOF users/user_profiles or SELECT *.
-- A known UUID alone does not authorize reading a private profile.
CREATE FUNCTION public.get_shared_profiles(target_user_ids UUID[] DEFAULT NULL, student_directory BOOLEAN DEFAULT FALSE)
RETURNS TABLE(id UUID, name TEXT, role TEXT, avatar_url TEXT,
  career TEXT, university TEXT, subjects TEXT[], bio TEXT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT u.id, COALESCE(NULLIF(u.name, ''), 'Usuario')::TEXT, u.role::TEXT,
    COALESCE(p.profile_image_url, u.avatar_url),
    CASE WHEN p.study_profile_visible AND u.role = 'student' AND u.status IN ('active','verified') THEN p.career::TEXT END,
    CASE WHEN p.study_profile_visible AND u.role = 'student' AND u.status IN ('active','verified') THEN p.university::TEXT END,
    CASE WHEN p.study_profile_visible AND u.role = 'student' AND u.status IN ('active','verified') THEN p.subjects END,
    CASE WHEN p.study_profile_visible AND u.role = 'student' AND u.status IN ('active','verified') THEN p.bio END
  FROM users u LEFT JOIN user_profiles p ON p.user_id = u.id
  WHERE is_current_account_active()
    AND (target_user_ids IS NULL OR u.id = ANY(target_user_ids))
    AND (NOT student_directory OR (u.role = 'student' AND p.study_profile_visible AND u.status IN ('active','verified')))
    AND (
      u.id = auth.uid() OR is_current_user_admin()
      OR (u.role = 'student' AND p.study_profile_visible AND u.status IN ('active','verified'))
      OR EXISTS (SELECT 1 FROM messages m
        WHERE (m.sender_id = auth.uid() AND m.receiver_id = u.id)
          OR (m.receiver_id = auth.uid() AND m.sender_id = u.id))
      OR EXISTS (SELECT 1 FROM reservations r WHERE r.user_id = u.id
        AND is_current_user_delegate_for_place(r.place_id))
    )
  ORDER BY u.name, u.id LIMIT 200;
$$;
REVOKE ALL ON FUNCTION public.get_shared_profiles(UUID[], BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_shared_profiles(UUID[], BOOLEAN) TO authenticated;

CREATE FUNCTION public.can_current_user_contact(target_user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT is_current_account_active() AND EXISTS (
    SELECT 1 FROM users u LEFT JOIN user_profiles p ON p.user_id = u.id
    WHERE u.id = target_user_id AND u.status IN ('active','verified') AND (
      is_current_user_admin()
      OR (u.role = 'student' AND p.study_profile_visible)
      OR EXISTS (SELECT 1 FROM messages m WHERE
        (m.sender_id = auth.uid() AND m.receiver_id = u.id)
        OR (m.receiver_id = auth.uid() AND m.sender_id = u.id))
      OR EXISTS (SELECT 1 FROM reservations r WHERE r.user_id = u.id
        AND is_current_user_delegate_for_place(r.place_id))
    )
  );
$$;

-- Quarantine historic delegate roles with no corresponding management record.
-- No assignments, no activation, no removal of the person's account or role.
INSERT INTO public.delegates (user_id, status, subscription_active, previous_role, notes)
  SELECT u.id, 'pending', FALSE, 'worker', 'Registro histórico incompleto: requiere revisión del administrador; rol anterior sin confirmar.'
  FROM public.users u LEFT JOIN public.delegates d ON d.user_id = u.id
  WHERE u.role = 'delegate' AND d.id IS NULL;

CREATE FUNCTION public.check_delegate_account_consistency()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE account_id UUID;
BEGIN
  IF TG_TABLE_NAME = 'users' THEN
    account_id := COALESCE(NEW.id, OLD.id);
  ELSE
    IF TG_OP = 'UPDATE' AND NEW.user_id IS DISTINCT FROM OLD.user_id THEN
      RAISE EXCEPTION 'delegate_identity_immutable';
    END IF;
    account_id := COALESCE(NEW.user_id, OLD.user_id);
  END IF;
  IF EXISTS (SELECT 1 FROM users u WHERE u.id = account_id AND u.role = 'delegate'
    AND NOT EXISTS (SELECT 1 FROM delegates d WHERE d.user_id = u.id))
    OR EXISTS (SELECT 1 FROM delegates d JOIN users u ON u.id = d.user_id
      WHERE u.id = account_id AND u.role <> 'delegate') THEN
    RAISE EXCEPTION 'delegate_account_inconsistent';
  END IF;
  RETURN NULL;
END;
$$;
CREATE CONSTRAINT TRIGGER check_delegate_user AFTER INSERT OR UPDATE ON public.users
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.check_delegate_account_consistency();
CREATE CONSTRAINT TRIGGER check_delegate_record AFTER INSERT OR UPDATE OR DELETE ON public.delegates
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.check_delegate_account_consistency();

CREATE FUNCTION public.guard_client_message()
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
  IF NULLIF(trim(NEW.message), '') IS NULL OR length(NEW.message) > 4000 THEN
    RAISE EXCEPTION 'invalid_message_length';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER guard_client_message BEFORE INSERT OR UPDATE ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.guard_client_message();

DO $$
DECLARE p RECORD;
BEGIN
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'messages' LOOP
    EXECUTE format('DROP POLICY %I ON public.messages', p.policyname);
  END LOOP;
END;
$$;
CREATE POLICY messages_select_participants ON public.messages FOR SELECT TO authenticated
  USING (is_current_account_active() AND (auth.uid() = sender_id OR auth.uid() = receiver_id));
CREATE POLICY messages_insert_sender ON public.messages FOR INSERT TO authenticated
  WITH CHECK (is_current_account_active() AND auth.uid() = sender_id AND can_current_user_contact(receiver_id));
CREATE POLICY messages_update_participant ON public.messages FOR UPDATE TO authenticated
  USING (is_current_account_active() AND (auth.uid() = sender_id OR auth.uid() = receiver_id))
  WITH CHECK (auth.uid() = sender_id OR auth.uid() = receiver_id);
REVOKE ALL ON public.messages FROM anon;
REVOKE DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.messages FROM authenticated;
GRANT SELECT, INSERT, UPDATE ON public.messages TO authenticated;

-- Notification recipients can acknowledge/hide a notification, never forge it.
CREATE FUNCTION public.guard_client_notification()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN
  IF current_user IN ('authenticated', 'anon') THEN
    IF (to_jsonb(NEW) - ARRAY['read', 'read_at', 'deleted_at'])
      IS DISTINCT FROM (to_jsonb(OLD) - ARRAY['read', 'read_at', 'deleted_at']) THEN
      RAISE EXCEPTION 'notification_content_immutable';
    END IF;
    IF OLD.read AND NOT NEW.read THEN RAISE EXCEPTION 'notification_already_read'; END IF;
    NEW.read_at := CASE WHEN NEW.read AND NOT OLD.read THEN NOW() ELSE OLD.read_at END;
    IF NEW.deleted_at IS DISTINCT FROM OLD.deleted_at THEN
      NEW.deleted_at := COALESCE(OLD.deleted_at, NOW());
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER guard_client_notification BEFORE UPDATE ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.guard_client_notification();
REVOKE ALL ON public.notifications FROM anon;
REVOKE INSERT, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.notifications FROM authenticated;
GRANT SELECT, UPDATE ON public.notifications TO authenticated;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime FOR TABLE public.messages, public.notifications;
  ELSIF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime' AND puballtables)
    AND NOT EXISTS (SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'notifications') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
END;
$$;

NOTIFY pgrst, 'reload schema';
COMMIT;
