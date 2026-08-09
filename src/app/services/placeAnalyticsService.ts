import { supabase } from "../lib/supabase";

export type PlaceAnalyticsEventType = "home_impression" | "details_view";

export interface PlaceAnalyticsEvent {
  placeId: string;
  eventType: PlaceAnalyticsEventType;
  createdAt: Date;
}

export async function trackPlaceAnalyticsEvents(placeIds: string[], eventType: PlaceAnalyticsEventType) {
  if (!supabase) return;

  const uniquePlaceIds = [...new Set(placeIds)].filter(Boolean);
  if (uniquePlaceIds.length === 0) return;

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) return;

  await supabase.from("place_analytics_events").insert(
    uniquePlaceIds.map((placeId) => ({
      place_id: placeId,
      user_id: userData.user.id,
      event_type: eventType,
    })),
  );
}

export async function trackPlaceAnalyticsEvent(placeId: string, eventType: PlaceAnalyticsEventType) {
  await trackPlaceAnalyticsEvents([placeId], eventType);
}

export async function listAdminPlaceAnalyticsEvents(since: Date): Promise<PlaceAnalyticsEvent[]> {
  if (!supabase) throw new Error("Faltan variables de Supabase en .env.");

  const { data, error } = await supabase
    .from("place_analytics_events")
    .select("place_id, event_type, created_at")
    .gte("created_at", since.toISOString());

  if (error) throw error;

  return (data ?? [])
    .filter((event) => event.event_type === "home_impression" || event.event_type === "details_view")
    .map((event) => ({
      placeId: String(event.place_id),
      eventType: event.event_type as PlaceAnalyticsEventType,
      createdAt: event.created_at ? new Date(event.created_at) : new Date(),
    }));
}
