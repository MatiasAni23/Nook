BEGIN;

CREATE OR REPLACE FUNCTION public.is_current_user_delegate_for_place(target_place_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.delegates
    JOIN public.delegate_places ON delegate_places.delegate_id = delegates.id
    WHERE delegates.user_id = auth.uid()
    AND delegates.status = 'active'
    AND delegate_places.place_id = target_place_id
  );
$$;

DROP POLICY IF EXISTS place_reports_select_own_or_public_pending ON public.place_reports;
DROP POLICY IF EXISTS place_reports_select_own_public_or_manager ON public.place_reports;
CREATE POLICY place_reports_select_own_public_or_manager
  ON public.place_reports
  FOR SELECT
  USING (
    auth.uid() = user_id
    OR status IN ('pending', 'reviewing')
    OR public.is_current_user_admin()
    OR public.is_current_user_delegate_for_place(place_id)
  );

DROP POLICY IF EXISTS place_reports_update_own_pending ON public.place_reports;
DROP POLICY IF EXISTS place_reports_update_manager ON public.place_reports;
CREATE POLICY place_reports_update_manager
  ON public.place_reports
  FOR UPDATE
  USING (
    public.is_current_user_admin()
    OR public.is_current_user_delegate_for_place(place_id)
    OR (auth.uid() = user_id AND status = 'pending')
  )
  WITH CHECK (
    public.is_current_user_admin()
    OR public.is_current_user_delegate_for_place(place_id)
    OR auth.uid() = user_id
  );

GRANT EXECUTE ON FUNCTION public.is_current_user_delegate_for_place(UUID) TO authenticated;

COMMIT;
