import { createClient } from "https://esm.sh/@supabase/supabase-js@2.106.2";
import { getPasswordValidationMessage, RECOVERY_CODE_TTL_SECONDS } from "../_shared/passwordPolicy.ts";
import { consumeRateLimit, errorResponse, readJsonBody, securityHeaders, SecurityError, verifyCaptcha } from "../_shared/security.ts";

Deno.serve(async (req) => {
  let headers: HeadersInit = {};
  try {
    headers = securityHeaders(req);
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers });
    if (req.method !== "POST") throw new SecurityError("method_not_allowed", 405);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !anonKey || !serviceRoleKey) throw new SecurityError("security_service_unavailable", 503);

    const body = await readJsonBody(req);
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const code = typeof body.code === "string" ? body.code.replace(/\s/g, "") : "";
    const password = typeof body.password === "string" ? body.password : "";
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !/^\d{6,10}$/.test(code)) throw new SecurityError("invalid_payload");
    if (getPasswordValidationMessage(password)) throw new SecurityError("weak_password");
    await verifyCaptcha(body.captchaToken);

    const options = { auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false } };
    const adminClient = createClient(supabaseUrl, serviceRoleKey, options);
    const secret = Deno.env.get("AUTH_RATE_LIMIT_SECRET") ?? serviceRoleKey;
    await consumeRateLimit(adminClient, "recovery_global", "all", secret);
    await consumeRateLimit(adminClient, "recovery_account", email, secret);

    // Auth enforces expiry and single use; never trust browser timestamps.
    const recoveryClient = createClient(supabaseUrl, anonKey, options);
    const { data: verification, error: verificationError } = await recoveryClient.auth.verifyOtp({ email, token: code, type: "recovery" });
    if (verificationError || !verification.user || !verification.session) throw new SecurityError("invalid_or_expired_code");
    const sentAt = Date.parse(verification.user.recovery_sent_at ?? "");
    if (!Number.isFinite(sentAt) || sentAt > Date.now() + 60000 || Date.now() - sentAt >= RECOVERY_CODE_TTL_SECONDS * 1000) {
      await recoveryClient.auth.signOut({ scope: "local" });
      throw new SecurityError("invalid_or_expired_code");
    }

    const { error: updateError } = await adminClient.auth.admin.updateUserById(verification.user.id, { password });
    if (updateError) {
      await recoveryClient.auth.signOut({ scope: "global" });
      if (updateError.code === "weak_password") throw new SecurityError("weak_password");
      throw new SecurityError("password_update_failed", 500);
    }
    const { error: signOutError } = await recoveryClient.auth.signOut({ scope: "global" });
    if (signOutError) throw new SecurityError("session_revoke_failed", 500);
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
  } catch (error) {
    if (!(error instanceof SecurityError)) console.error("Password recovery internal failure");
    return errorResponse(error, headers);
  }
});
