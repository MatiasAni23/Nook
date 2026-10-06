import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface RequestBody {
  invitationId: string;
  email: string;
  name: string;
  phone?: string | null;
  inviteUrl: string;
}

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

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
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
    const brevoApiKey = Deno.env.get("BREVO_API_KEY");
    const brevoTemplateId = Deno.env.get("BREVO_DELEGATE_TEMPLATE_ID");
    const senderEmail = Deno.env.get("BREVO_SENDER_EMAIL");
    const senderName = Deno.env.get("BREVO_SENDER_NAME") ?? "Pinwi";

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      console.error("Missing Edge Function env vars", {
        hasSupabaseUrl: Boolean(supabaseUrl),
        hasAnonKey: Boolean(anonKey),
        hasServiceRoleKey: Boolean(serviceRoleKey),
      });
      return jsonResponse({ error: "missing_supabase_environment" }, 500);
    }

    if (!brevoApiKey) {
      console.error("Missing Brevo API key");
      return jsonResponse({ error: "missing_brevo_api_key" }, 500);
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("Missing Authorization header");
      return jsonResponse({ error: "missing_authorization" }, 401);
    }

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { data: callerData, error: callerError } = await callerClient.auth.getUser();
    if (callerError || !callerData.user) {
      console.error("Invalid caller authorization", callerError);
      return jsonResponse({ error: "invalid_authorization", message: callerError?.message }, 401);
    }

    const { data: callerProfile, error: callerProfileError } = await adminClient
      .from("users")
      .select("role")
      .eq("id", callerData.user.id)
      .maybeSingle();

    if (callerProfileError) {
      console.error("Could not load caller profile", callerProfileError);
      return jsonResponse({ error: "caller_profile_failed", message: callerProfileError.message }, 500);
    }
    if (callerProfile?.role !== "admin") {
      console.error("Caller is not admin", { userId: callerData.user.id, role: callerProfile?.role ?? null });
      return jsonResponse({ error: "forbidden" }, 403);
    }

    const body = (await req.json()) as RequestBody;
    if (!body.invitationId || !body.email || !body.name || !body.inviteUrl) {
      console.error("Invalid payload", body);
      return jsonResponse({ error: "invalid_payload" }, 400);
    }

    const { data: invitation, error: invitationError } = await adminClient
      .from("delegate_invitations")
      .select("id, email, status, expires_at")
      .eq("id", body.invitationId)
      .maybeSingle();

    if (invitationError) {
      console.error("Could not load delegate invitation", invitationError);
      return jsonResponse({ error: "invitation_lookup_failed", message: invitationError.message }, 500);
    }
    if (!invitation || invitation.status !== "pending" || new Date(invitation.expires_at).getTime() < Date.now()) {
      console.error("Invalid delegate invitation", {
        invitationId: body.invitationId,
        found: Boolean(invitation),
        status: invitation?.status ?? null,
        expiresAt: invitation?.expires_at ?? null,
      });
      return jsonResponse({ error: "invalid_delegate_invitation" }, 400);
    }

    if (String(invitation.email).toLowerCase() !== body.email.trim().toLowerCase()) {
      console.error("Invitation email mismatch", { invitationEmail: invitation.email, requestEmail: body.email });
      return jsonResponse({ error: "email_mismatch" }, 400);
    }

    const normalizedEmail = body.email.trim().toLowerCase();
    const templateId = brevoTemplateId ? Number(brevoTemplateId) : null;
    const brevoPayload: BrevoPayload = {
      to: [{ email: normalizedEmail, name: body.name }],
      params: {
        name: body.name,
        email: normalizedEmail,
        invite_url: body.inviteUrl,
        invitation_id: body.invitationId,
        expires_at: invitation.expires_at,
      },
    };

    if (senderEmail) {
      brevoPayload.sender = { name: senderName, email: senderEmail };
    }

    if (templateId && Number.isFinite(templateId)) {
      brevoPayload.templateId = templateId;
    } else {
      brevoPayload.subject = "Tu invitacion para ser delegado en Pinwi";
      brevoPayload.htmlContent = getDefaultHtmlContent(body.name, body.inviteUrl);
    }

    const brevoResponse = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": brevoApiKey,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(brevoPayload),
    });

    if (!brevoResponse.ok) {
      const responseText = await brevoResponse.text();
      console.error("Brevo invite email failed", {
        status: brevoResponse.status,
        responseText,
      });

      return jsonResponse(
        {
          error: "brevo_email_failed",
          message: responseText,
          status: brevoResponse.status,
        },
        brevoResponse.status >= 400 && brevoResponse.status < 500 ? brevoResponse.status : 500,
      );
    }

    return jsonResponse({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    console.error("Unhandled send-delegate-invitation error", error);

    return jsonResponse({ error: "unhandled_error", message }, 500);
  }
});
