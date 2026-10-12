import { createClient } from "https://esm.sh/@supabase/supabase-js@2.106.2";
import { allowedOrigins, consumeRateLimit, errorResponse, readJsonBody, securityHeaders, SecurityError } from "../_shared/security.ts";

interface BrevoPayload {
  sender?: {
    name: string;
    email: string;
  };
  to: Array<{
    email: string;
    name?: string;
  }>;
  templateId?: number;
  subject?: string;
  htmlContent?: string;
  params: Record<string, unknown>;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getDefaultHtmlContent(name: string, inviteUrl: string) {
  const safeName = escapeHtml(name);
  const safeUrl = escapeHtml(inviteUrl);

  return `
    <h2>Tu invitacion para ser delegado en Pinwi</h2>
    <p>Hola ${safeName},</p>
    <p>Te invitamos a administrar lugares en Pinwi. Para aceptar la invitacion, abre el siguiente enlace y configura tu contrasena.</p>
    <p>
      <a href="${safeUrl}" style="display:inline-block;padding:12px 18px;background:#4F46E5;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600;">
        Aceptar invitacion
      </a>
    </p>
    <p>Si el boton no funciona, copia y pega este enlace en tu navegador:</p>
    <p><a href="${safeUrl}">${safeUrl}</a></p>
    <p>Si no esperabas esta invitacion, puedes ignorar este correo.</p>
  `;
}


Deno.serve(async (req) => {
  let headers: HeadersInit = {};
  try {
    headers = securityHeaders(req);
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers });
    if (req.method !== "POST") throw new SecurityError("method_not_allowed", 405);
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const brevoApiKey = Deno.env.get("BREVO_API_KEY");
    if (!supabaseUrl || !anonKey || !serviceRoleKey || !brevoApiKey) throw new SecurityError("security_service_unavailable", 503);
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) throw new SecurityError("missing_authorization", 401);
    const callerClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false, autoRefreshToken: false } });
    const { data: callerData, error: callerError } = await callerClient.auth.getUser();
    if (callerError || !callerData.user) throw new SecurityError("invalid_authorization", 401);
    if (!callerData.user.email_confirmed_at) throw new SecurityError("forbidden", 403);
    const adminClient = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const { data: callerProfile, error: callerProfileError } = await adminClient.from("users").select("role, status").eq("id", callerData.user.id).maybeSingle();
    if (callerProfileError) throw new SecurityError("security_service_unavailable", 503);
    if (callerProfile?.role !== "admin" || !["active", "verified"].includes(callerProfile.status)) throw new SecurityError("forbidden", 403);
    const body = await readJsonBody(req);
    if (typeof body.invitationId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.invitationId)
      || typeof body.email !== "string" || body.email.length > 254 || typeof body.inviteUrl !== "string" || body.inviteUrl.length > 2048) throw new SecurityError("invalid_payload");
    const secret = Deno.env.get("AUTH_RATE_LIMIT_SECRET") ?? serviceRoleKey;
    await consumeRateLimit(adminClient, "invite_admin", callerData.user.id, secret);
    const { data: invitation, error: invitationError } = await adminClient.from("delegate_invitations")
      .select("id, email, name, token, status, expires_at").eq("id", body.invitationId).maybeSingle();
    if (invitationError) throw new SecurityError("security_service_unavailable", 503);
    const expiry = invitation ? new Date(invitation.expires_at).getTime() : NaN;
    if (!invitation || invitation.status !== "pending" || !Number.isFinite(expiry) || expiry <= Date.now()) throw new SecurityError("invalid_delegate_invitation");
    const email = String(invitation.email).trim().toLowerCase();
    if (email !== body.email.trim().toLowerCase()) throw new SecurityError("email_mismatch");
    let inviteUrl: URL;
    try { inviteUrl = new URL(body.inviteUrl); } catch { throw new SecurityError("invalid_invitation_url"); }
    if (!allowedOrigins().has(inviteUrl.origin) || inviteUrl.username || inviteUrl.password || inviteUrl.pathname !== "/delegate-invite"
      || inviteUrl.hash || inviteUrl.searchParams.get("token") !== String(invitation.token)
      || Array.from(inviteUrl.searchParams).length !== 1) throw new SecurityError("invalid_invitation_url");
    await consumeRateLimit(adminClient, "invite_recipient", email, secret);
    const name = String(invitation.name);
    const templateId = Number(Deno.env.get("BREVO_DELEGATE_TEMPLATE_ID"));
    const payload: BrevoPayload = {
      to: [{ email, name }],
      params: { name, email, invite_url: inviteUrl.href, invitation_id: invitation.id, expires_at: invitation.expires_at },
    };
    const senderEmail = Deno.env.get("BREVO_SENDER_EMAIL");
    if (senderEmail) payload.sender = { name: Deno.env.get("BREVO_SENDER_NAME") ?? "Pinwi", email: senderEmail };
    if (Number.isSafeInteger(templateId) && templateId > 0) payload.templateId = templateId;
    else { payload.subject = "Tu invitación para ser delegado en Pinwi"; payload.htmlContent = getDefaultHtmlContent(name, inviteUrl.href); }
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST", headers: { "api-key": brevoApiKey, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(payload), signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) {
      // Provider payloads can contain recipient identities or links; never return/log them.
      console.error("Invitation provider rejected request", { status: response.status });
      throw new SecurityError("brevo_email_failed", 502);
    }
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
  } catch (error) {
    if (!(error instanceof SecurityError)) console.error("Invitation internal failure");
    return errorResponse(error, headers);
  }
});
