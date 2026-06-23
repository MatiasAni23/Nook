import type { IssueType } from "../data/mockData";
import { supabase } from "../lib/supabase";

export type ReportTicketStatus = "pending" | "reviewing" | "resolved" | "dismissed";

export interface ReportTicketDelegate {
  id: string;
  userId: string;
  name: string;
  email: string;
  phone: string | null;
}

export interface ReportTicket {
  id: string;
  placeId: string;
  placeName: string;
  placeAddress: string;
  type: IssueType;
  description: string;
  status: ReportTicketStatus;
  upvotes: number;
  createdAt: Date;
  updatedAt: Date;
  reporterName: string;
  reporterEmail: string;
  delegates: ReportTicketDelegate[];
}

const ACTIVE_TICKET_STATUSES: ReportTicketStatus[] = ["pending", "reviewing"];

function requireSupabase() {
  if (!supabase) {
    throw new Error("Faltan variables de Supabase en .env.");
  }

  return supabase;
}

function normalizeStatus(status: unknown): ReportTicketStatus {
  return ["pending", "reviewing", "resolved", "dismissed"].includes(String(status))
    ? (status as ReportTicketStatus)
    : "pending";
}

function normalizeReport(row: any): ReportTicket {
  const place = Array.isArray(row.places) ? row.places[0] : row.places;
  const reporter = Array.isArray(row.users) ? row.users[0] : row.users;
  const delegateAssignments = Array.isArray(place?.delegate_places) ? place.delegate_places : [];

  return {
    id: String(row.id),
    placeId: String(row.place_id),
    placeName: String(place?.name ?? "Lugar sin nombre"),
    placeAddress: String(place?.address ?? ""),
    type: row.type as IssueType,
    description: String(row.description ?? ""),
    status: normalizeStatus(row.status),
    upvotes: Number(row.upvotes_count ?? 0),
    createdAt: row.created_at ? new Date(row.created_at) : new Date(),
    updatedAt: row.updated_at ? new Date(row.updated_at) : new Date(),
    reporterName: String(reporter?.name ?? "Usuario"),
    reporterEmail: String(reporter?.email ?? ""),
    delegates: delegateAssignments
      .map((assignment: any) => {
        const delegate = Array.isArray(assignment.delegates) ? assignment.delegates[0] : assignment.delegates;
        if (!delegate) return null;
        const delegateUser = Array.isArray(delegate.users) ? delegate.users[0] : delegate.users;

        return {
          id: String(delegate.id),
          userId: String(delegate.user_id),
          name: String(delegateUser?.name ?? "Delegado"),
          email: String(delegateUser?.email ?? ""),
          phone: delegateUser?.phone ?? null,
        };
      })
      .filter(Boolean) as ReportTicketDelegate[],
  };
}

const REPORT_TICKET_SELECT = `
  id,
  user_id,
  place_id,
  type,
  description,
  status,
  upvotes_count,
  created_at,
  updated_at,
  users:user_id(name, email),
  places:place_id(
    id,
    name,
    address,
    delegate_places(
      delegates(
        id,
        user_id,
        users:user_id(
          name,
          email,
          phone
        )
      )
    )
  )
`;

export async function listAdminReportTickets(): Promise<ReportTicket[]> {
  const client = requireSupabase();
  const { data, error } = await client
    .from("place_reports")
    .select(REPORT_TICKET_SELECT)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data ?? []).map(normalizeReport);
}

export async function listDelegateReportTickets(): Promise<ReportTicket[]> {
  const client = requireSupabase();
  const { data: userData, error: userError } = await client.auth.getUser();

  if (userError) throw userError;
  if (!userData.user) throw new Error("No hay un usuario autenticado.");

  const { data: delegate, error: delegateError } = await client
    .from("delegates")
    .select("id")
    .eq("user_id", userData.user.id)
    .maybeSingle();

  if (delegateError) throw delegateError;
  if (!delegate) return [];

  const { data: assignments, error: assignmentsError } = await client
    .from("delegate_places")
    .select("place_id")
    .eq("delegate_id", delegate.id);

  if (assignmentsError) throw assignmentsError;

  const placeIds = (assignments ?? []).map((assignment) => String(assignment.place_id));
  if (placeIds.length === 0) return [];

  const { data, error } = await client
    .from("place_reports")
    .select(REPORT_TICKET_SELECT)
    .in("place_id", placeIds)
    .in("status", ACTIVE_TICKET_STATUSES)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data ?? []).map(normalizeReport);
}

export async function updateReportTicketStatus(reportId: string, status: ReportTicketStatus): Promise<ReportTicket> {
  const client = requireSupabase();
  const { data, error } = await client
    .from("place_reports")
    .update({ status })
    .eq("id", reportId)
    .select(REPORT_TICKET_SELECT)
    .single();

  if (error) throw error;

  return normalizeReport(data);
}
