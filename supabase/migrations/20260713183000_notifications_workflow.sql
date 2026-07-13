BEGIN;

ALTER TABLE public.notifications
ADD COLUMN IF NOT EXISTS entity_type VARCHAR,
ADD COLUMN IF NOT EXISTS entity_id UUID,
ADD COLUMN IF NOT EXISTS actor_user_id UUID,
ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
ADD COLUMN IF NOT EXISTS action_path TEXT,
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Permite evitar duplicados cuando un trigger se reintenta para la misma entidad.
CREATE UNIQUE INDEX IF NOT EXISTS notifications_unique_active_entity_user_idx
ON public.notifications (user_id, type, entity_type, entity_id)
WHERE entity_id IS NOT NULL AND deleted_at IS NULL;

CREATE OR REPLACE FUNCTION public.create_user_notification(
  target_user_id UUID,
  notification_type VARCHAR,
  notification_title VARCHAR,
  notification_message TEXT,
  related_place_id UUID DEFAULT NULL,
  related_reservation_id UUID DEFAULT NULL,
  related_message_id UUID DEFAULT NULL,
  related_entity_type VARCHAR DEFAULT NULL,
  related_entity_id UUID DEFAULT NULL,
  actor_id UUID DEFAULT NULL,
  notification_metadata JSONB DEFAULT '{}'::JSONB,
  notification_action_path TEXT DEFAULT NULL,
  notification_expires_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_notification_id UUID;
BEGIN
  IF target_user_id IS NULL THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.notifications (
    user_id,
    type,
    title,
    message,
    place_id,
    reservation_id,
    message_id,
    entity_type,
    entity_id,
    actor_user_id,
    metadata,
    action_path,
    expires_at
  ) VALUES (
    target_user_id,
    notification_type,
    notification_title,
    notification_message,
    related_place_id,
    related_reservation_id,
    related_message_id,
    related_entity_type,
    related_entity_id,
    actor_id,
    COALESCE(notification_metadata, '{}'::JSONB),
    notification_action_path,
    notification_expires_at
  )
  ON CONFLICT (user_id, type, entity_type, entity_id)
  WHERE entity_id IS NOT NULL AND deleted_at IS NULL
  DO UPDATE SET
    title = EXCLUDED.title,
    message = EXCLUDED.message,
    metadata = EXCLUDED.metadata,
    action_path = EXCLUDED.action_path,
    read = FALSE,
    read_at = NULL,
    created_at = NOW(),
    deleted_at = NULL
  RETURNING id INTO next_notification_id;

  RETURN next_notification_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_favorite_place_report()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  place_name TEXT;
BEGIN
  SELECT name INTO place_name
  FROM public.places
  WHERE id = NEW.place_id;

  INSERT INTO public.notifications (
    user_id,
    type,
    title,
    message,
    place_id,
    entity_type,
    entity_id,
    actor_user_id,
    metadata,
    action_path
  )
  SELECT
    favorites.user_id,
    'favorite_issue',
    'Problema en lugar favorito',
    COALESCE(place_name, 'Un lugar favorito') || ' recibio un nuevo reporte.',
    NEW.place_id,
    'place_report',
    NEW.id,
    NEW.user_id,
    jsonb_build_object(
      'place_name', place_name,
      'report_type', NEW.type,
      'report_description', NEW.description
    ),
    '/app/place/' || NEW.place_id
  FROM public.favorites
  WHERE favorites.place_id = NEW.place_id
  AND favorites.user_id <> NEW.user_id
  ON CONFLICT (user_id, type, entity_type, entity_id)
  WHERE entity_id IS NOT NULL AND deleted_at IS NULL
  DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_favorite_place_report_on_insert ON public.place_reports;
CREATE TRIGGER notify_favorite_place_report_on_insert
AFTER INSERT ON public.place_reports
FOR EACH ROW
EXECUTE FUNCTION public.notify_favorite_place_report();

CREATE OR REPLACE FUNCTION public.notify_new_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sender_name TEXT;
BEGIN
  SELECT name INTO sender_name
  FROM public.users
  WHERE id = NEW.sender_id;

  PERFORM public.create_user_notification(
    NEW.receiver_id,
    'new_message',
    'Nuevo mensaje',
    COALESCE(sender_name, 'Un usuario') || ' te envio un mensaje.',
    NULL,
    NULL,
    NEW.id,
    'message',
    NEW.id,
    NEW.sender_id,
    jsonb_build_object('sender_name', sender_name),
    '/app/chat/' || NEW.sender_id,
    NULL
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_new_message_on_insert ON public.messages;
CREATE TRIGGER notify_new_message_on_insert
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.notify_new_message();

CREATE OR REPLACE FUNCTION public.notify_reservation_confirmed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  place_name TEXT;
BEGIN
  IF NEW.status <> 'confirmed' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  SELECT name INTO place_name
  FROM public.places
  WHERE id = NEW.place_id;

  PERFORM public.create_user_notification(
    NEW.user_id,
    'reservation_confirmed',
    'Reserva confirmada',
    'Tu reserva en ' || COALESCE(place_name, 'un lugar') || ' fue confirmada.',
    NEW.place_id,
    NEW.id,
    NULL,
    'reservation',
    NEW.id,
    NULL,
    jsonb_build_object('place_name', place_name),
    '/app/place/' || NEW.place_id,
    NULL
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_reservation_confirmed_on_change ON public.reservations;
CREATE TRIGGER notify_reservation_confirmed_on_change
AFTER INSERT OR UPDATE OF status ON public.reservations
FOR EACH ROW
EXECUTE FUNCTION public.notify_reservation_confirmed();

REVOKE ALL ON FUNCTION public.create_user_notification(
  UUID,
  VARCHAR,
  VARCHAR,
  TEXT,
  UUID,
  UUID,
  UUID,
  VARCHAR,
  UUID,
  UUID,
  JSONB,
  TEXT,
  TIMESTAMPTZ
) FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.notify_favorite_place_report() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_new_message() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_reservation_confirmed() FROM PUBLIC, anon, authenticated;

COMMIT;
