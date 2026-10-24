import type { User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import { getPasswordValidationMessage } from "../lib/passwordPolicy";
import { normalizeAuthCode, normalizeAuthEmail, requireCaptcha } from "../lib/authSecurity";
import { withEmailCooldown } from "./authAttemptService";
import { getWebAppUrl } from "../mobile/appUrls";

export type UserRole = "student" | "worker" | "admin" | "delegate";

export interface RegisterInput {
  name: string;
  email: string;
  phone: string;
  password: string;
  role?: "student" | "worker";
  emailRedirectTo?: string;
  captchaToken?: string;
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

function validateNewPassword(password: string) {
  const message = getPasswordValidationMessage(password);
  if (message) throw new Error(message);
}

function requireSupabase() {
  if (!supabase) {
    throw new Error("Faltan VITE_SUPABASE_URL y VITE_SUPABASE_PUBLISHABLE_KEY en el archivo .env.");
  }

  return supabase;
}

export async function ensureAppUserRecord(user: User) {
  // Auth creates accounts. Browsers must not upsert identity or privilege fields.
  if (!(await getAppUserRecord(user.id))) throw new Error("No se encontro el perfil de la cuenta. Contacta al administrador.");
}

export async function signInWithEmail(email: string, password: string, captchaToken?: string) {
  const client = requireSupabase();
  requireCaptcha(captchaToken);
  const { data, error } = await client.auth.signInWithPassword({ email: normalizeAuthEmail(email), password, options: { captchaToken } });

  if (error) {
    throw error;
  }

  return data;
}

export async function signUpWithEmail({ name, email, phone, password, role = "student", emailRedirectTo, captchaToken }: RegisterInput) {
  const client = requireSupabase();
  const normalizedEmail = normalizeAuthEmail(email);
  validateNewPassword(password);
  requireCaptcha(captchaToken);

  const { data, error } = await withEmailCooldown(normalizedEmail, () => client.auth.signUp({
    email: normalizedEmail,
    password,
    options: {
      emailRedirectTo,
      captchaToken,
      data: {
        full_name: name,
        phone,
        role,
      },
    },
  }));

  if (error) {
    throw error;
  }

  return data;
}

export async function sendPasswordRecoveryCode(email: string, captchaToken?: string) {
  const client = requireSupabase();
  const normalizedEmail = normalizeAuthEmail(email);
  requireCaptcha(captchaToken);
  const { error } = await withEmailCooldown(normalizedEmail, () => client.auth.resetPasswordForEmail(normalizedEmail, {
    redirectTo: getWebAppUrl('/recover-password'),
    captchaToken,
  }));

  if (error) {
    throw error;
  }
}

export async function resendSignupVerificationCode(email: string, emailRedirectTo?: string, captchaToken?: string) {
  const client = requireSupabase();
  const normalizedEmail = normalizeAuthEmail(email);
  requireCaptcha(captchaToken);
  const { error } = await withEmailCooldown(normalizedEmail, () => client.auth.resend({
    type: "signup",
    email: normalizedEmail,
    options: {
      emailRedirectTo: emailRedirectTo ?? getWebAppUrl('/verify-account'),
      captchaToken,
    },
  }));

  if (error) {
    throw error;
  }
}

export async function verifySignupCode(email: string, code: string) {
  const client = requireSupabase();
  const { data, error } = await client.auth.verifyOtp({
    email: normalizeAuthEmail(email),
    token: normalizeAuthCode(code),
    type: "signup",
  });

  if (error) {
    throw error;
  }

  return data;
}

export async function completePasswordRecovery(email: string, code: string, password: string, captchaToken?: string) {
  const client = requireSupabase();
  validateNewPassword(password);
  requireCaptcha(captchaToken);
  const { data, error } = await client.functions.invoke("complete-password-recovery", {
    body: {
      email: normalizeAuthEmail(email),
      code: normalizeAuthCode(code),
      password,
      captchaToken,
    },
  });

  if (error) {
    const context = (error as { context?: unknown }).context;

    if (context instanceof Response) {
      let payload: { error?: string; retry_after?: number } | null = null;

      try {
        payload = await context.clone().json();
      } catch {
        // Fall through to the original Edge Function error below.
      }

      if (payload?.error === "invalid_or_expired_code") {
        throw new Error("El código no es válido o ya expiró. Solicita uno nuevo e intenta otra vez.");
      }
      if (payload?.error === "weak_password") {
        throw new Error("La contraseña no cumple los requisitos de seguridad.");
      }
      if (payload?.error === "rate_limit_exceeded") {
        throw new Error(`Demasiados intentos. Espera ${Math.max(1, Math.ceil(Number(payload.retry_after) || 60))} segundos antes de volver a intentar.`);
      }
      if (payload?.error === "captcha_required" || payload?.error === "captcha_invalid") {
        throw new Error("Completa nuevamente la verificación de seguridad.");
      }
      if (payload?.error === "security_service_unavailable") {
        throw new Error("La recuperación no está disponible temporalmente. Intenta más tarde.");
      }
    }

    throw error;
  }

  if (!data?.ok) {
    throw new Error("No se pudo actualizar la contraseña.");
  }

  return data;
}

export async function updateRecoveredPassword(password: string) {
  const client = requireSupabase();
  validateNewPassword(password);
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

  const { error: userErrorUpdate } = await client.from("users")
    .update({ role, profile_completed: true })
    .eq("id", userData.user.id).select("id").single();

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
