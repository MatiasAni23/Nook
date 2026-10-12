import type { Issue, IssueType } from "../data/mockData";
import { supabase } from "../lib/supabase";

type PlaceReportRow = {
  id: string;
  user_id?: string;
  place_id: string;
  type: IssueType;
  description: string | null;
  upvotes_count: number | null;
  created_at: string;
};

function requireSupabase() {
  if (!supabase) {
    throw new Error("Faltan variables de Supabase en .env.");
  }

  return supabase;
}

async function getCurrentUserId() {
  const client = requireSupabase();
  const { data, error } = await client.auth.getUser();

  if (error) throw error;
  if (!data.user) throw new Error("Debes iniciar sesion para reportar o confirmar problemas.");

  return data.user.id;
}

function toIssue(row: PlaceReportRow, confirmedReportIds: Set<string>): Issue {
  return {
    id: row.id,
    placeId: row.place_id,
    type: row.type,
    description: row.description ?? "",
    reportedBy: "Usuario anonimo",
    timestamp: new Date(row.created_at),
    upvotes: row.upvotes_count ?? 0,
    hasConfirmed: confirmedReportIds.has(row.id),
  };
}

export async function listPlaceReports(placeId: string): Promise<Issue[]> {
  const client = requireSupabase();
  const { data, error } = await client.rpc("get_place_report_summaries", { target_place_id: placeId });
  if (error) throw error;
  const reports = (data ?? []) as (PlaceReportRow & { has_confirmed: boolean })[];
  const confirmed = new Set(reports.filter((report) => report.has_confirmed).map((report) => report.id));
  return reports.map((report) => toIssue(report, confirmed));
}

export async function createPlaceReport(placeId: string, type: IssueType, description: string): Promise<Issue> {
  const client = requireSupabase();
  if (description.length > 2000) throw new Error("La descripción no puede superar los 2000 caracteres.");
  const userId = await getCurrentUserId();

  const { data, error } = await client
    .from("place_reports")
    .insert({
      user_id: userId,
      place_id: placeId,
      type,
      description: description || null,
    })
    .select("id, user_id, place_id, type, description, upvotes_count, created_at")
    .single();

  if (error?.message.includes("rate_limit_exceeded")) throw new Error("Alcanzaste el límite de cinco reportes por hora. Intenta más tarde.");
  if (error) throw error;

  return toIssue(data as PlaceReportRow, new Set());
}

export async function confirmPlaceReport(reportId: string): Promise<number> {
  const client = requireSupabase();
  await getCurrentUserId();

  const { data, error } = await client.rpc("confirm_place_report", {
    target_report_id: reportId,
  });

  if (error?.message.includes("rate_limit_exceeded")) throw new Error("Has realizado muchas confirmaciones seguidas. Espera un minuto.");
  if (error) throw error;

  return Number(data ?? 0);
}
