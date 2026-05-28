import { supabase } from "../lib/supabase";

export interface CurrentUserProfile {
  id: string;
  email: string;
  name: string;
  role: "student" | "worker" | "admin" | "delegate";
  phone?: string | null;
  profile: {
    university?: string | null;
    career?: string | null;
    subjects?: string[] | null;
    company?: string | null;
    position?: string | null;
    is_independent?: boolean | null;
    industry?: string | null;
    bio?: string | null;
    profile_image_url?: string | null;
  } | null;
}

export async function getCurrentUserProfile(): Promise<CurrentUserProfile | null> {
  if (!supabase) return null;

  const { data: authData, error: authError } = await supabase.auth.getUser();

  if (authError || !authData.user) {
    return null;
  }

  const { data: appUser } = await supabase
    .from("users")
    .select("name, role, phone")
    .eq("id", authData.user.id)
    .maybeSingle();

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("university, career, subjects, company, position, is_independent, industry, bio, profile_image_url")
    .eq("user_id", authData.user.id)
    .maybeSingle();

  return {
    id: authData.user.id,
    email: authData.user.email ?? "",
    name:
      appUser?.name ||
      authData.user.user_metadata.full_name ||
      authData.user.email?.split("@")[0] ||
      "Usuario",
    role: appUser?.role ?? "student",
    phone: appUser?.phone ?? authData.user.user_metadata.phone ?? null,
    profile: profile ?? null,
  };
}

export async function updateCurrentUserProfile(input: {
  name: string;
  role: "student" | "worker";
  profileData: Record<string, unknown>;
}) {
  if (!supabase) throw new Error("Supabase no esta configurado.");

  const { data: authData, error: authError } = await supabase.auth.getUser();

  if (authError) throw authError;
  if (!authData.user) throw new Error("No hay un usuario autenticado.");

  const { error: userError } = await supabase
    .from("users")
    .update({
      name: input.name,
      role: input.role,
      profile_completed: true,
    })
    .eq("id", authData.user.id);

  if (userError) throw userError;

  const { error: profileError } = await supabase
    .from("user_profiles")
    .upsert(
      {
        user_id: authData.user.id,
        university: input.profileData.university ?? null,
        career: input.profileData.career ?? null,
        subjects: input.profileData.subjects ?? null,
        company: input.profileData.company ?? null,
        position: input.profileData.position ?? null,
        is_independent: input.profileData.isIndependent ?? false,
        industry: input.profileData.industry ?? null,
        bio: input.profileData.bio ?? null,
      },
      { onConflict: "user_id" },
    );

  if (profileError) throw profileError;
}

export function getFirstName(name: string) {
  return name.trim().split(/\s+/)[0] || "Usuario";
}

export function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) return "U";

  return parts
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}
