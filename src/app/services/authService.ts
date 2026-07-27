import type { User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

export type UserRole = "student" | "worker" | "admin" | "delegate";

export interface RegisterInput {
  name: string;
  email: string;
  phone: string;
  password: string;
  role?: UserRole;
  emailRedirectTo?: string;
}

export interface ProfileSetupInput {
  role: "student" | "worker";
  profileData: Record<string, unknown>;
}

export interface AppUserRecord {
  name: string;
  role: UserRole;
  profile_completed: boolean;
}

export interface RegisterResult {
  email: string;
  needsEmailVerification: boolean;
}

const ACCOUNT_EXISTS_MESSAGE = "Este correo ya esta registrado. Intenta iniciar sesion.";

function requireSupabase() {
  if (!supabase) {
    throw new Error("Faltan VITE_SUPABASE_URL y VITE_SUPABASE_PUBLISHABLE_KEY en el archivo .env.");
  }

  return supabase;
}

export async function ensureAppUserRecord(user: User, role: UserRole = "student") {
  const client = requireSupabase();
  const { error } = await client
    .from("users")
    .upsert(
      {
        id: user.id,
        email: user.email,
        name: user.user_metadata.full_name ?? "",
        phone: user.user_metadata.phone ?? null,
        role,
        profile_completed: false,
        email_verified: Boolean(user.email_confirmed_at),
      },
      { onConflict: "id" },
    );

  if (error) {
    throw error;
  }
}

export async function signInWithEmail(email: string, password: string) {
  const client = requireSupabase();
  const { data, error } = await client.auth.signInWithPassword({ email, password });

  if (error) {
    throw error;
  }

  return data;
}

export async function emailAccountExists(email: string) {
  const client = requireSupabase();
  const normalizedEmail = email.trim().toLowerCase();
  const { data, error } = await client.rpc("email_account_exists", {
    lookup_email: normalizedEmail,
  });

  if (error) {
    throw error;
  }

  return Boolean(data);
}

export async function signUpWithEmail({ name, email, phone, password, role = "student", emailRedirectTo }: RegisterInput) {
  const client = requireSupabase();
  const normalizedEmail = email.trim().toLowerCase();

  if (await emailAccountExists(normalizedEmail)) {
    throw new Error(ACCOUNT_EXISTS_MESSAGE);
  }

  const { data, error } = await client.auth.signUp({
    email: normalizedEmail,
    password,
    options: {
      emailRedirectTo,
      data: {
        full_name: name,
        phone,
        role,
      },
    },
  });

  if (error) {
    throw error;
  }

  return data;
}

export async function sendPasswordRecoveryCode(email: string) {
  const client = requireSupabase();
  const { error } = await client.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/recover-password`,
  });

  if (error) {
    throw error;
  }
}

export async function resendSignupVerificationCode(email: string, emailRedirectTo?: string) {
  const client = requireSupabase();
  const { error } = await client.auth.resend({
    type: "signup",
    email,
    options: {
      emailRedirectTo: emailRedirectTo ?? `${window.location.origin}/verify-account`,
    },
  });

  if (error) {
    throw error;
  }
}

export async function verifySignupCode(email: string, code: string) {
  const client = requireSupabase();
  const { data, error } = await client.auth.verifyOtp({
    email,
    token: code,
    type: "signup",
  });

  if (error) {
    throw error;
  }

  return data;
}

export async function verifyPasswordRecoveryCode(email: string, code: string) {
  const client = requireSupabase();
  const { data, error } = await client.auth.verifyOtp({
    email,
    token: code,
    type: "recovery",
  });

  if (error) {
    throw error;
  }

  return data;
}

export async function updateRecoveredPassword(password: string) {
  const client = requireSupabase();
  const { data, error } = await client.auth.updateUser({ password });

  if (error) {
    throw error;
  }

  return data;
}

export async function signOut() {
  const client = requireSupabase();
  const { error } = await client.auth.signOut();

  if (error) {
    throw error;
  }
}

export async function getCurrentSession() {
  const client = requireSupabase();
  const { data, error } = await client.auth.getSession();

  if (error) {
    throw error;
  }

  return data.session;
}

export async function getAppUserRecord(userId: string): Promise<AppUserRecord | null> {
  const client = requireSupabase();
  const { data, error } = await client
    .from("users")
    .select("name, role, profile_completed")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as AppUserRecord | null;
}

export async function saveProfileSetup({ role, profileData }: ProfileSetupInput) {
  const client = requireSupabase();
  const { data: userData, error: userError } = await client.auth.getUser();

  if (userError) {
    throw userError;
  }

  if (!userData.user) {
    throw new Error("No hay un usuario autenticado para guardar el perfil.");
  }

  const { error: userErrorUpdate } = await client
    .from("users")
    .upsert(
      {
        id: userData.user.id,
        email: userData.user.email,
        name: userData.user.user_metadata.full_name,
        phone: userData.user.user_metadata.phone,
        role,
        profile_completed: true,
      },
      { onConflict: "id" },
    );

  if (userErrorUpdate) {
    throw userErrorUpdate;
  }

  const { error: userProfileError } = await client
    .from("user_profiles")
    .upsert(
      {
        user_id: userData.user.id,
        university: profileData.university ?? null,
        region_id: profileData.regionId ?? null,
        institution_id: profileData.institutionId ?? null,
        city_id: profileData.cityId ?? null,
        career: profileData.career ?? null,
        subjects: profileData.subjects ?? null,
        company: profileData.company ?? null,
        position: profileData.position ?? null,
        is_independent: profileData.isIndependent ?? false,
        industry: profileData.industry ?? null,
        bio: profileData.bio ?? null,
      },
      { onConflict: "user_id" },
    );

  if (userProfileError) {
    throw userProfileError;
  }
}
