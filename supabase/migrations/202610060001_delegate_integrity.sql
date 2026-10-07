-- Incremental migration: preserves existing accounts, places and reservations.
-- Apply after the baseline schema. Never rerun the destructive baseline on a live database.
BEGIN;

ALTER TABLE public.delegates ADD COLUMN IF NOT EXISTS previous_role TEXT NOT NULL DEFAULT 'worker'
  CHECK (previous_role IN ('student', 'worker'));

CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin' AND status IN ('active', 'verified'));
$$;

CREATE OR REPLACE FUNCTION public.is_current_user_place_manager()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT is_current_user_admin() OR EXISTS (
    SELECT 1 FROM users u JOIN delegates d ON d.user_id = u.id
    WHERE u.id = auth.uid() AND u.role = 'delegate' AND u.status IN ('active', 'verified') AND d.status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_current_user_delegate_for_place(target_place_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM delegates d JOIN delegate_places dp ON dp.delegate_id = d.id JOIN users u ON u.id = d.user_id
    WHERE u.id = auth.uid() AND u.role = 'delegate' AND u.status IN ('active', 'verified')
      AND d.status = 'active' AND dp.place_id = target_place_id
  );
$$;

-- Some hosted projects have older policies that still call these helper names.
-- Keep them consistent so a suspended account cannot use a legacy read policy.
CREATE OR REPLACE FUNCTION public.is_current_user_active_delegate()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM users u JOIN delegates d ON d.user_id = u.id
    WHERE u.id = auth.uid() AND u.role = 'delegate'
      AND u.status IN ('active', 'verified') AND d.status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_current_user_assigned_to_place(target_place_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT is_current_user_delegate_for_place(target_place_id);
$$;

-- This optional hosted helper delivers private pending messages from a trigger.
-- Clients must not choose an arbitrary recipient by invoking it directly.
DO $$
BEGIN
  IF to_regprocedure('public.deliver_pending_place_contacts(uuid,uuid)') IS NOT NULL THEN
    REVOKE ALL ON FUNCTION public.deliver_pending_place_contacts(UUID, UUID)
      FROM PUBLIC, anon, authenticated;
  END IF;
END;
$$;

-- Auth, not editable signup metadata or public.users, owns identity and elevated roles.
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO users (id, email, name, phone, role, status, profile_completed, email_verified)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.raw_user_meta_data->>'phone',
    CASE WHEN NEW.raw_user_meta_data->>'role' = 'worker' THEN 'worker' ELSE 'student' END,
    'active', FALSE, NEW.email_confirmed_at IS NOT NULL)
  ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email,
    email_verified = EXCLUDED.email_verified, updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.guard_client_user_identity()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN
  IF current_user IN ('authenticated', 'anon') THEN
    IF NEW.id IS DISTINCT FROM OLD.id OR NEW.email IS DISTINCT FROM OLD.email
      OR NEW.email_verified IS DISTINCT FROM OLD.email_verified
      OR NEW.phone_verified IS DISTINCT FROM OLD.phone_verified THEN
      RAISE EXCEPTION 'identity_fields_managed_by_auth';
    END IF;
    IF NOT is_current_user_admin() AND (
      NEW.status IS DISTINCT FROM OLD.status OR
      (NEW.role IS DISTINCT FROM OLD.role AND NOT (OLD.role IN ('student', 'worker') AND NEW.role IN ('student', 'worker')))
    ) THEN RAISE EXCEPTION 'privileged_account_fields'; END IF;
    -- Delegate promotion/removal must synchronize both tables through the RPCs below.
    IF NEW.role IS DISTINCT FROM OLD.role AND (NEW.role = 'delegate' OR OLD.role = 'delegate') THEN
      RAISE EXCEPTION 'use_delegate_management_rpc';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS guard_client_user_identity ON public.users;
CREATE TRIGGER guard_client_user_identity BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.guard_client_user_identity();
REVOKE INSERT ON public.users FROM anon, authenticated;
DROP POLICY IF EXISTS users_select_admin ON public.users;
CREATE POLICY users_select_admin ON public.users FOR SELECT TO authenticated USING (is_current_user_admin());
DROP POLICY IF EXISTS users_update_admin ON public.users;
CREATE POLICY users_update_admin ON public.users FOR UPDATE TO authenticated
  USING (is_current_user_admin()) WITH CHECK (is_current_user_admin());

DROP POLICY IF EXISTS places_insert_admin ON public.places;
CREATE POLICY places_insert_admin ON public.places FOR INSERT TO authenticated
  WITH CHECK (is_current_user_admin() OR (is_current_user_place_manager() AND created_by = auth.uid()));
DROP POLICY IF EXISTS places_update_admin ON public.places;
CREATE POLICY places_update_admin ON public.places FOR UPDATE TO authenticated
  USING (is_current_user_admin() OR is_current_user_delegate_for_place(id))
  WITH CHECK (is_current_user_admin() OR is_current_user_delegate_for_place(id));
DROP POLICY IF EXISTS places_delete_admin ON public.places;
CREATE POLICY places_delete_admin ON public.places FOR DELETE TO authenticated
  USING (is_current_user_admin() OR is_current_user_delegate_for_place(id));
DROP POLICY IF EXISTS places_select_managed ON public.places;
CREATE POLICY places_select_managed ON public.places FOR SELECT TO authenticated
  USING (is_current_user_admin() OR is_current_user_delegate_for_place(id));

CREATE OR REPLACE FUNCTION public.assign_created_delegate_place()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.created_by = auth.uid() AND NOT is_current_user_admin() AND is_current_user_place_manager() THEN
    INSERT INTO delegate_places (delegate_id, place_id)
      SELECT id, NEW.id FROM delegates WHERE user_id = auth.uid() AND status = 'active'
      ON CONFLICT (delegate_id, place_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS assign_created_delegate_place ON public.places;
CREATE TRIGGER assign_created_delegate_place AFTER INSERT ON public.places
  FOR EACH ROW EXECUTE FUNCTION public.assign_created_delegate_place();

CREATE OR REPLACE FUNCTION public.guard_delegate_place_fields()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN
  IF current_user IN ('authenticated', 'anon') AND NOT is_current_user_admin() THEN
    IF TG_OP = 'INSERT' THEN
      IF NEW.plan_type <> 'basic' OR NEW.verified OR NEW.featured
        OR NEW.rating <> 0 OR NEW.reviews_count <> 0 OR NEW.visits_count <> 0 OR NEW.favorites_count <> 0 THEN
        RAISE EXCEPTION 'place_admin_fields';
      END IF;
    ELSIF ROW(NEW.id, NEW.created_by, NEW.plan_type, NEW.verified, NEW.featured,
      NEW.rating, NEW.reviews_count, NEW.visits_count, NEW.favorites_count)
      IS DISTINCT FROM ROW(OLD.id, OLD.created_by, OLD.plan_type, OLD.verified, OLD.featured,
      OLD.rating, OLD.reviews_count, OLD.visits_count, OLD.favorites_count) THEN
      RAISE EXCEPTION 'place_admin_fields';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS guard_delegate_place_fields ON public.places;
CREATE TRIGGER guard_delegate_place_fields BEFORE INSERT OR UPDATE ON public.places
  FOR EACH ROW EXECUTE FUNCTION public.guard_delegate_place_fields();

-- Existing aggregate triggers must keep updating their server-owned fields after
-- narrowing place writes. Only triggers can invoke these internal helpers.
ALTER FUNCTION public.refresh_place_rating(UUID) SECURITY DEFINER SET search_path = public;
ALTER FUNCTION public.update_place_rating() SECURITY DEFINER SET search_path = public;
ALTER FUNCTION public.refresh_place_favorites_count(UUID) SECURITY DEFINER SET search_path = public;
ALTER FUNCTION public.update_place_favorites_count() SECURITY DEFINER SET search_path = public;
REVOKE ALL ON FUNCTION public.refresh_place_rating(UUID), public.update_place_rating(),
  public.refresh_place_favorites_count(UUID), public.update_place_favorites_count()
  FROM PUBLIC, anon, authenticated;

-- Scope every write to the actual place, including its children and images.
DO $$
DECLARE t TEXT; p RECORD;
BEGIN
  FOREACH t IN ARRAY ARRAY['place_amenities', 'place_spaces'] LOOP
    FOR p IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = t AND cmd IN ('INSERT', 'UPDATE', 'DELETE') LOOP
      EXECUTE format('DROP POLICY %I ON public.%I', p.policyname, t);
    END LOOP;
    EXECUTE format('CREATE POLICY managed_insert ON public.%I FOR INSERT TO authenticated WITH CHECK (is_current_user_admin() OR is_current_user_delegate_for_place(place_id))', t);
    EXECUTE format('CREATE POLICY managed_update ON public.%I FOR UPDATE TO authenticated USING (is_current_user_admin() OR is_current_user_delegate_for_place(place_id)) WITH CHECK (is_current_user_admin() OR is_current_user_delegate_for_place(place_id))', t);
    EXECUTE format('CREATE POLICY managed_delete ON public.%I FOR DELETE TO authenticated USING (is_current_user_admin() OR is_current_user_delegate_for_place(place_id))', t);
    EXECUTE format('DROP POLICY IF EXISTS managed_select ON public.%I', t);
    EXECUTE format('CREATE POLICY managed_select ON public.%I FOR SELECT TO authenticated USING (is_current_user_admin() OR is_current_user_delegate_for_place(place_id))', t);
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.can_manage_place_image(object_name TEXT)
RETURNS BOOLEAN LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE place_uuid UUID;
BEGIN
  IF NOT is_current_user_place_manager() THEN RETURN FALSE; END IF;
  BEGIN place_uuid := split_part(object_name, '/', 1)::UUID;
  EXCEPTION WHEN invalid_text_representation THEN RETURN FALSE; END;
  RETURN is_current_user_admin() OR is_current_user_delegate_for_place(place_uuid)
    -- createPlace uploads to a new UUID before inserting and auto-assigning the place.
    OR NOT EXISTS (SELECT 1 FROM places WHERE id = place_uuid);
END;
$$;
DROP POLICY IF EXISTS place_images_insert_admin ON storage.objects;
DROP POLICY IF EXISTS place_images_update_admin ON storage.objects;
DROP POLICY IF EXISTS place_images_delete_admin ON storage.objects;
CREATE POLICY place_images_insert_admin ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'place-images' AND public.can_manage_place_image(name));
CREATE POLICY place_images_update_admin ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'place-images' AND public.can_manage_place_image(name))
  WITH CHECK (bucket_id = 'place-images' AND public.can_manage_place_image(name));
CREATE POLICY place_images_delete_admin ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'place-images' AND public.can_manage_place_image(name));

CREATE OR REPLACE FUNCTION public.validate_delegate_places(place_ids UUID[])
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF place_ids IS NULL OR EXISTS (
    SELECT 1 FROM unnest(place_ids) ids(id) LEFT JOIN places p ON p.id = ids.id
    WHERE p.id IS NULL OR p.status = 'deleted'
  ) THEN RAISE EXCEPTION 'invalid_delegate_places'; END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.save_managed_delegate(
  target_delegate_id UUID, delegate_email TEXT, delegate_name TEXT, delegate_phone TEXT,
  delegate_status TEXT, delegate_subscription_active BOOLEAN, assigned_place_ids UUID[]
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE u users%ROWTYPE; d delegates%ROWTYPE; saved_id UUID;
BEGIN
  IF NOT is_current_user_admin() THEN RAISE EXCEPTION 'admin_required'; END IF;
  IF delegate_status IS NULL OR delegate_status NOT IN ('active', 'suspended', 'pending')
    OR NULLIF(trim(delegate_name), '') IS NULL OR delegate_subscription_active IS NULL THEN
    RAISE EXCEPTION 'invalid_delegate_input';
  END IF;
  PERFORM validate_delegate_places(assigned_place_ids);
  SELECT * INTO u FROM users WHERE lower(email) = lower(trim(delegate_email)) FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'delegate_account_not_found'; END IF;
  IF u.role NOT IN ('student', 'worker', 'delegate') OR u.status = 'blocked' THEN
    RAISE EXCEPTION 'delegate_account_not_eligible';
  END IF;
  SELECT * INTO d FROM delegates WHERE user_id = u.id FOR UPDATE;
  IF target_delegate_id IS NOT NULL AND (d.id IS NULL OR d.id <> target_delegate_id) THEN
    RAISE EXCEPTION 'delegate_identity_mismatch';
  END IF;
  INSERT INTO delegates (user_id, status, subscription_active, previous_role, last_active)
    VALUES (u.id, delegate_status, delegate_subscription_active,
      CASE WHEN u.role = 'student' THEN 'student' ELSE 'worker' END, NOW())
    ON CONFLICT (user_id) DO UPDATE SET status = EXCLUDED.status,
      subscription_active = EXCLUDED.subscription_active, last_active = NOW()
    RETURNING id INTO saved_id;
  UPDATE users SET role = 'delegate', status = delegate_status,
    name = trim(delegate_name), phone = NULLIF(trim(delegate_phone), '') WHERE id = u.id;
  DELETE FROM delegate_places WHERE delegate_id = saved_id;
  INSERT INTO delegate_places (delegate_id, place_id)
    SELECT saved_id, id FROM unnest(assigned_place_ids) ids(id) ON CONFLICT DO NOTHING;
  RETURN saved_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_managed_delegate_status(target_delegate_id UUID, next_status TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE target_user UUID;
BEGIN
  IF NOT is_current_user_admin() THEN RAISE EXCEPTION 'admin_required'; END IF;
  IF next_status IS NULL OR next_status NOT IN ('active', 'suspended', 'pending') THEN RAISE EXCEPTION 'invalid_delegate_status'; END IF;
  SELECT user_id INTO target_user FROM delegates WHERE id = target_delegate_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'delegate_not_found'; END IF;
  IF EXISTS (SELECT 1 FROM users WHERE id = target_user AND status = 'blocked') THEN RAISE EXCEPTION 'delegate_account_blocked'; END IF;
  UPDATE delegates SET status = next_status, last_active = NOW() WHERE id = target_delegate_id;
  UPDATE users SET status = next_status WHERE id = target_user;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_managed_delegate_subscription(target_delegate_id UUID, subscription_active BOOLEAN)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_current_user_admin() THEN RAISE EXCEPTION 'admin_required'; END IF;
  IF subscription_active IS NULL THEN RAISE EXCEPTION 'invalid_subscription'; END IF;
  UPDATE delegates d SET subscription_active = set_managed_delegate_subscription.subscription_active,
    last_active = NOW() WHERE id = target_delegate_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'delegate_not_found'; END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_managed_delegate(target_delegate_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE d delegates%ROWTYPE;
BEGIN
  IF NOT is_current_user_admin() THEN RAISE EXCEPTION 'admin_required'; END IF;
  SELECT * INTO d FROM delegates WHERE id = target_delegate_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'delegate_not_found'; END IF;
  DELETE FROM delegates WHERE id = d.id;
  UPDATE users SET role = d.previous_role,
    status = CASE WHEN status IN ('blocked', 'suspended') THEN status ELSE 'active' END
    WHERE id = d.user_id AND role = 'delegate';
END;
$$;

-- Older deployments may return UUID or TABLE instead of VOID. PostgreSQL cannot
-- change a return type with CREATE OR REPLACE. Replace only this RPC inside the
-- transaction; its authenticated-only execution grants are restored below.
-- No CASCADE: unexpected database dependencies must stop and roll back the migration.
DROP FUNCTION IF EXISTS public.claim_delegate_invitation(UUID);
CREATE FUNCTION public.claim_delegate_invitation(invitation_token UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE invitation delegate_invitations%ROWTYPE; u users%ROWTYPE; delegate_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  SELECT * INTO invitation FROM delegate_invitations WHERE token = invitation_token FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'invalid_delegate_invitation'; END IF;
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid()
    AND lower(email) = lower(invitation.email) AND email_confirmed_at IS NOT NULL) THEN
    RAISE EXCEPTION 'delegate_invitation_email_mismatch_or_unverified';
  END IF;
  IF invitation.status = 'accepted' AND invitation.accepted_by = auth.uid() THEN RETURN; END IF;
  IF invitation.status <> 'pending' OR invitation.expires_at <= NOW() THEN RAISE EXCEPTION 'invalid_delegate_invitation'; END IF;
  SELECT * INTO u FROM users WHERE id = auth.uid() FOR UPDATE;
  IF NOT FOUND OR u.role NOT IN ('student', 'worker', 'delegate') OR u.status NOT IN ('active', 'verified') THEN
    RAISE EXCEPTION 'delegate_account_not_eligible';
  END IF;
  IF EXISTS (SELECT 1 FROM delegates WHERE user_id = u.id AND status <> 'active') THEN
    RAISE EXCEPTION 'delegate_account_not_eligible';
  END IF;
  PERFORM validate_delegate_places(invitation.assigned_place_ids);
  INSERT INTO delegates (user_id, status, previous_role, last_active)
    VALUES (u.id, 'active', CASE WHEN u.role = 'student' THEN 'student' ELSE 'worker' END, NOW())
    ON CONFLICT (user_id) DO UPDATE SET last_active = NOW() RETURNING id INTO delegate_id;
  UPDATE users SET role = 'delegate', name = COALESCE(NULLIF(name, ''), invitation.name),
    phone = COALESCE(phone, invitation.phone) WHERE id = u.id;
  -- A further invitation adds assignments; it never silently erases earlier places.
  INSERT INTO delegate_places (delegate_id, place_id)
    SELECT delegate_id, id FROM unnest(invitation.assigned_place_ids) ids(id) ON CONFLICT DO NOTHING;
  UPDATE delegate_invitations SET status = 'accepted', accepted_by = u.id, accepted_at = NOW() WHERE id = invitation.id;
END;
$$;

-- Reservations cannot change owner, price or schedule via a status update.
CREATE OR REPLACE FUNCTION public.guard_reservation_transition()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN
  IF current_user IN ('authenticated', 'anon') THEN
    IF (to_jsonb(NEW) - ARRAY['status', 'updated_at']) IS DISTINCT FROM (to_jsonb(OLD) - ARRAY['status', 'updated_at']) THEN
      RAISE EXCEPTION 'reservation_status_only';
    END IF;
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      IF NOT (is_current_user_admin() OR is_current_user_delegate_for_place(OLD.place_id)) THEN
        IF auth.uid() <> OLD.user_id OR OLD.status <> 'pending' OR NEW.status <> 'cancelled' THEN
          RAISE EXCEPTION 'reservation_transition_forbidden';
        END IF;
      ELSIF NOT ((OLD.status = 'pending' AND NEW.status IN ('confirmed', 'rejected', 'cancelled'))
        OR (OLD.status = 'confirmed' AND NEW.status IN ('completed', 'cancelled'))) THEN
        RAISE EXCEPTION 'invalid_reservation_transition';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS guard_reservation_transition ON public.reservations;
CREATE TRIGGER guard_reservation_transition BEFORE UPDATE ON public.reservations
  FOR EACH ROW EXECUTE FUNCTION public.guard_reservation_transition();

CREATE OR REPLACE FUNCTION public.transition_delegate_reservation(target_reservation_id UUID, next_status TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE r reservations%ROWTYPE;
BEGIN
  SELECT * INTO r FROM reservations WHERE id = target_reservation_id FOR UPDATE;
  IF NOT FOUND OR NOT (is_current_user_admin() OR is_current_user_delegate_for_place(r.place_id)) THEN
    RAISE EXCEPTION 'reservation_not_found_or_forbidden';
  END IF;
  IF next_status IS NULL OR NOT ((r.status = 'pending' AND next_status IN ('confirmed', 'rejected', 'cancelled'))
    OR (r.status = 'confirmed' AND next_status IN ('completed', 'cancelled'))) THEN
    RAISE EXCEPTION 'invalid_reservation_transition';
  END IF;
  UPDATE reservations SET status = next_status WHERE id = r.id;
  IF NOT FOUND THEN RAISE EXCEPTION 'reservation_not_found_or_forbidden'; END IF;
END;
$$;

-- Delegate state changes have one transactional entry point, even for admins.
REVOKE INSERT, UPDATE, DELETE ON public.delegates, public.delegate_places FROM authenticated, anon;
REVOKE ALL ON FUNCTION public.validate_delegate_places(UUID[]) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.save_managed_delegate(UUID, TEXT, TEXT, TEXT, TEXT, BOOLEAN, UUID[]) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.set_managed_delegate_status(UUID, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.set_managed_delegate_subscription(UUID, BOOLEAN) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.delete_managed_delegate(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.claim_delegate_invitation(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.transition_delegate_reservation(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_managed_delegate(UUID, TEXT, TEXT, TEXT, TEXT, BOOLEAN, UUID[]),
  public.set_managed_delegate_status(UUID, TEXT), public.set_managed_delegate_subscription(UUID, BOOLEAN),
  public.delete_managed_delegate(UUID), public.claim_delegate_invitation(UUID),
  public.transition_delegate_reservation(UUID, TEXT) TO authenticated;

COMMIT;
