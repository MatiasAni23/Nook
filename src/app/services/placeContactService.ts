import { supabase } from "../lib/supabase";

export async function startPlaceContact(placeId: string, message: string) {
  if (!supabase) throw new Error("Faltan variables de Supabase en .env.");
  const { data, error } = await supabase.rpc("start_place_contact", {
    target_place_id: placeId,
    initial_message: message.trim(),
  });
  if (error) throw error;
  const result = Array.isArray(data) ? data[0] : data;
  if (!result) throw new Error("No se pudo iniciar el contacto.");
  return { status: result.status as "active" | "pending", delegateUserId: result.delegate_user_id as string | null };
}
