import { supabase } from "../lib/supabase";

export interface SharedProfile {
  id: string;
  name: string;
  role: "student" | "worker" | "admin" | "delegate" | "support";
  profile: {
    career?: string | null;
    subjects?: string[] | null;
    university?: string | null;
    bio?: string | null;
    profile_image_url?: string | null;
    company?: string | null;
    position?: string | null;
    industry?: string | null;
    is_independent?: boolean | null;
  } | null;
}

interface SharedProfileRow {
  id: string;
  name: string;
  role: SharedProfile["role"];
  avatar_url: string | null;
  career: string | null;
  subjects: string[] | null;
  university: string | null;
  bio: string | null;
}

export async function getSharedProfiles(options: { ids?: string[]; studentDirectory?: boolean } = {}): Promise<SharedProfile[]> {
  if (!supabase || options.ids?.length === 0) return [];
  const ids = options.ids ? [...new Set(options.ids)] : null;
  const batches = ids ? Array.from({ length: Math.ceil(ids.length / 200) }, (_, i) => ids.slice(i * 200, (i + 1) * 200)) : [null];
  const rows = await Promise.all(batches.map(async (batch) => {
    const { data, error } = await supabase!.rpc("get_shared_profiles", {
      target_user_ids: batch,
      student_directory: options.studentDirectory ?? false,
    });
    if (error) throw error;
    return (data ?? []) as SharedProfileRow[];
  }));
  return rows.flat().map((row) => ({
    id: row.id,
    name: row.name,
    role: row.role,
    profile: {
      profile_image_url: row.avatar_url,
      career: row.career,
      subjects: row.subjects,
      university: row.university,
      bio: row.bio,
    },
  }));
}
