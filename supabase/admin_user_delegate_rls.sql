-- RLS para gestion administrativa de usuarios y delegados.
-- Ejecutar despues de supabase/nook_schema_supabase.sql.

BEGIN;

GRANT SELECT, UPDATE ON public.users, public.user_profiles TO authenticated;
GRANT SELECT ON public.reservations, public.place_reports TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.delegates, public.delegate_places TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.places TO authenticated;
GRANT SELECT ON public.users_with_stats, public.delegates_with_places, public.places_with_stats TO authenticated;

CREATE TABLE IF NOT EXISTS public.delegate_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    name TEXT NOT NULL,
    phone TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
    assigned_place_ids UUID[] NOT NULL DEFAULT ARRAY[]::UUID[],
    invited_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    accepted_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
    accepted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_delegate_invitations_token ON public.delegate_invitations(token);
CREATE INDEX IF NOT EXISTS idx_delegate_invitations_email ON public.delegate_invitations(LOWER(email));
CREATE INDEX IF NOT EXISTS idx_delegate_invitations_status ON public.delegate_invitations(status);

ALTER TABLE public.delegate_invitations ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON public.delegate_invitations TO authenticated;

CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM public.users
        WHERE users.id = auth.uid()
        AND users.role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.is_current_user_active_delegate()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM public.users
        JOIN public.delegates ON delegates.user_id = users.id
        WHERE users.id = auth.uid()
        AND users.role = 'delegate'
        AND users.status IN ('active', 'verified')
        AND delegates.status = 'active'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.is_current_user_assigned_to_place(target_place_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM public.delegates
        JOIN public.delegate_places ON delegate_places.delegate_id = delegates.id
        WHERE delegates.user_id = auth.uid()
        AND delegates.status = 'active'
        AND delegate_places.place_id = target_place_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP POLICY IF EXISTS users_select_admin ON public.users;
DROP POLICY IF EXISTS users_update_admin ON public.users;
CREATE POLICY users_select_admin ON public.users
    FOR SELECT USING (public.is_current_user_admin());
CREATE POLICY users_update_admin ON public.users
    FOR UPDATE USING (public.is_current_user_admin()) WITH CHECK (public.is_current_user_admin());

DROP POLICY IF EXISTS user_profiles_select_admin ON public.user_profiles;
CREATE POLICY user_profiles_select_admin ON public.user_profiles
    FOR SELECT USING (public.is_current_user_admin());

DROP POLICY IF EXISTS reservations_select_admin ON public.reservations;
CREATE POLICY reservations_select_admin ON public.reservations
    FOR SELECT USING (public.is_current_user_admin());

DROP POLICY IF EXISTS place_reports_select_admin ON public.place_reports;
CREATE POLICY place_reports_select_admin ON public.place_reports
    FOR SELECT USING (public.is_current_user_admin());

DROP POLICY IF EXISTS delegates_select_admin ON public.delegates;
DROP POLICY IF EXISTS delegates_insert_admin ON public.delegates;
DROP POLICY IF EXISTS delegates_update_admin ON public.delegates;
DROP POLICY IF EXISTS delegates_delete_admin ON public.delegates;
CREATE POLICY delegates_select_admin ON public.delegates
    FOR SELECT USING (public.is_current_user_admin());
CREATE POLICY delegates_insert_admin ON public.delegates
    FOR INSERT WITH CHECK (public.is_current_user_admin());
CREATE POLICY delegates_update_admin ON public.delegates
    FOR UPDATE USING (public.is_current_user_admin()) WITH CHECK (public.is_current_user_admin());
CREATE POLICY delegates_delete_admin ON public.delegates
    FOR DELETE USING (public.is_current_user_admin());

DROP POLICY IF EXISTS delegate_places_select_admin ON public.delegate_places;
DROP POLICY IF EXISTS delegate_places_insert_admin ON public.delegate_places;
DROP POLICY IF EXISTS delegate_places_update_admin ON public.delegate_places;
DROP POLICY IF EXISTS delegate_places_delete_admin ON public.delegate_places;
CREATE POLICY delegate_places_select_admin ON public.delegate_places
    FOR SELECT USING (public.is_current_user_admin());
CREATE POLICY delegate_places_insert_admin ON public.delegate_places
    FOR INSERT WITH CHECK (public.is_current_user_admin());
CREATE POLICY delegate_places_update_admin ON public.delegate_places
    FOR UPDATE USING (public.is_current_user_admin()) WITH CHECK (public.is_current_user_admin());
CREATE POLICY delegate_places_delete_admin ON public.delegate_places
    FOR DELETE USING (public.is_current_user_admin());

DROP POLICY IF EXISTS places_select_manager ON public.places;
CREATE POLICY places_select_manager ON public.places
    FOR SELECT USING (
        public.is_current_user_admin()
        OR public.is_current_user_assigned_to_place(id)
    );

DROP POLICY IF EXISTS places_insert_admin ON public.places;
DROP POLICY IF EXISTS places_update_admin ON public.places;
DROP POLICY IF EXISTS places_delete_admin ON public.places;
CREATE POLICY places_insert_admin ON public.places
    FOR INSERT WITH CHECK (
        public.is_current_user_admin()
        OR (public.is_current_user_active_delegate() AND created_by = auth.uid())
    );
CREATE POLICY places_update_admin ON public.places
    FOR UPDATE USING (
        public.is_current_user_admin()
        OR public.is_current_user_assigned_to_place(id)
    )
    WITH CHECK (
        public.is_current_user_admin()
        OR public.is_current_user_assigned_to_place(id)
    );
CREATE POLICY places_delete_admin ON public.places
    FOR DELETE USING (public.is_current_user_admin());

DROP POLICY IF EXISTS delegate_invitations_select_admin ON public.delegate_invitations;
DROP POLICY IF EXISTS delegate_invitations_insert_admin ON public.delegate_invitations;
DROP POLICY IF EXISTS delegate_invitations_update_admin ON public.delegate_invitations;

CREATE POLICY delegate_invitations_select_admin ON public.delegate_invitations
    FOR SELECT USING (public.is_current_user_admin());

CREATE POLICY delegate_invitations_insert_admin ON public.delegate_invitations
    FOR INSERT WITH CHECK (
        public.is_current_user_admin()
        AND invited_by = auth.uid()
    );

CREATE POLICY delegate_invitations_update_admin ON public.delegate_invitations
    FOR UPDATE USING (public.is_current_user_admin()) WITH CHECK (public.is_current_user_admin());

CREATE OR REPLACE FUNCTION public.get_delegate_invitation(invitation_token UUID)
RETURNS TABLE (
    id UUID,
    token UUID,
    email TEXT,
    name TEXT,
    phone TEXT,
    status TEXT,
    assigned_place_ids UUID[],
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        delegate_invitations.id,
        delegate_invitations.token,
        delegate_invitations.email,
        delegate_invitations.name,
        delegate_invitations.phone,
        delegate_invitations.status,
        delegate_invitations.assigned_place_ids,
        delegate_invitations.expires_at,
        delegate_invitations.created_at
    FROM public.delegate_invitations
    WHERE delegate_invitations.token = invitation_token
    AND delegate_invitations.status = 'pending'
    AND delegate_invitations.expires_at > NOW()
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.get_delegate_invitation(UUID) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.claim_delegate_invitation(invitation_token UUID)
RETURNS UUID AS $$
DECLARE
    invitation_record public.delegate_invitations%ROWTYPE;
    new_delegate_id UUID;
    current_email TEXT;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'not_authenticated';
    END IF;

    current_email := LOWER(auth.jwt() ->> 'email');

    SELECT *
    INTO invitation_record
    FROM public.delegate_invitations
    WHERE token = invitation_token
    AND status = 'pending'
    AND expires_at > NOW()
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'invalid_delegate_invitation';
    END IF;

    IF LOWER(invitation_record.email) <> current_email THEN
        RAISE EXCEPTION 'delegate_invitation_email_mismatch';
    END IF;

    INSERT INTO public.users (
        id,
        email,
        name,
        phone,
        role,
        status,
        profile_completed,
        email_verified
    )
    VALUES (
        auth.uid(),
        invitation_record.email,
        invitation_record.name,
        invitation_record.phone,
        'delegate',
        'active',
        TRUE,
        TRUE
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        name = EXCLUDED.name,
        phone = EXCLUDED.phone,
        role = 'delegate',
        status = 'active',
        profile_completed = TRUE,
        email_verified = TRUE,
        updated_at = NOW();

    INSERT INTO public.delegates (user_id, status, joined_date, last_active)
    VALUES (auth.uid(), 'active', NOW(), NOW())
    ON CONFLICT (user_id) DO UPDATE SET
        status = 'active',
        last_active = NOW()
    RETURNING id INTO new_delegate_id;

    DELETE FROM public.delegate_places
    WHERE delegate_id = new_delegate_id;

    INSERT INTO public.delegate_places (delegate_id, place_id)
    SELECT new_delegate_id, place_id
    FROM UNNEST(invitation_record.assigned_place_ids) AS place_id
    ON CONFLICT (delegate_id, place_id) DO NOTHING;

    UPDATE public.delegate_invitations
    SET
        status = 'accepted',
        accepted_by = auth.uid(),
        accepted_at = NOW(),
        updated_at = NOW()
    WHERE id = invitation_record.id;

    RETURN new_delegate_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.claim_delegate_invitation(UUID) TO authenticated;

COMMIT;
