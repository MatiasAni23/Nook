import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface RequestBody {
  email?: string;
  code?: string;
  password?: string;
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function hasStrongEnoughPassword(password: string) {
  let score = 0;
  if (password.length >= 8) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[a-z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  return score >= 3;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "method_not_allowed" }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      console.error("Missing Supabase environment variables for password recovery");
      return jsonResponse({ error: "missing_supabase_environment" }, 500);
    }

    const body = (await req.json()) as RequestBody;
    const email = body.email?.trim().toLowerCase() ?? "";
    const code = body.code?.replace(/\s/g, "") ?? "";
    const password = body.password ?? "";

    if (!email || !code || !password) {
      return jsonResponse({ error: "invalid_payload" }, 400);
    }

    if (!hasStrongEnoughPassword(password)) {
      return jsonResponse({ error: "weak_password" }, 400);
    }

    // The recovery session exists only for this request and is never sent to the browser.
    const recoveryClient = createClient(supabaseUrl, anonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    });
    const { data: verification, error: verificationError } = await recoveryClient.auth.verifyOtp({
      email,
      token: code,
      type: "recovery",
    });

    if (verificationError || !verification.user) {
      console.error("Password recovery OTP verification failed", verificationError?.message);
      return jsonResponse({ error: "invalid_or_expired_code" }, 400);
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
    const { error: updateError } = await adminClient.auth.admin.updateUserById(verification.user.id, {
      password,
    });

    if (updateError) {
      console.error("Password recovery update failed", updateError.message);
      return jsonResponse({ error: "password_update_failed" }, 500);
    }

    // A reset invalidates the temporary recovery session and every previous user session.
    const { error: signOutError } = await recoveryClient.auth.signOut({ scope: "global" });
    if (signOutError) {
      console.error("Could not revoke recovery session", signOutError.message);
      return jsonResponse({ error: "session_revoke_failed" }, 500);
    }

    return jsonResponse({ ok: true });
  } catch (error) {
    console.error("Unhandled complete-password-recovery error", error);
    return jsonResponse({ error: "unhandled_error" }, 500);
  }
});
