/** Email-safe HTML shared by the delivered templates and invitation fallback. */
export interface EmailTemplate {
  key: string;
  label: string;
  subject: string;
  preheader: string;
  eyebrow: string;
  title: string;
  body: string;
  code?: string;
  codeLabel?: string;
  action?: { label: string; url: string };
  after?: string;
  notice: string;
  notification?: boolean;
}

export function escapeEmailHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

export function emailParagraph(content: string): string {
  return `<p style="margin:0 0 18px;color:#525268;font-size:15px;line-height:25px;">${content}</p>`;
}

// Public brand artwork exported from BrandLogo's existing vector assets.
export const emailBrand = {
  logoUrl: "https://igtoypxgsegeiikjlnau.supabase.co/storage/v1/object/public/place-images/brand/email/pinwi-logo-v1.png",
  website: "https://www.pinwi.cl",
  contactEmail: "info@pinwi.cl",
} as const;

export function renderEmail(template: EmailTemplate): string {
  const action = template.action ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 24px;"><tr><td bgcolor="#4F46E5" style="border-radius:10px;text-align:center;mso-padding-alt:16px 24px;"><a href="${template.action.url}" style="display:inline-block;padding:16px 24px;border:1px solid #4F46E5;border-radius:10px;color:#ffffff;font-size:15px;font-weight:700;line-height:20px;text-decoration:none;">${escapeEmailHtml(template.action.label)}</a></td></tr></table>` : "";
  const code = template.code ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:6px 0 24px;"><tr><td align="center" bgcolor="#F2F0FF" style="padding:24px 12px;border:1px solid #E3DFFF;border-radius:12px;"><p style="margin:0 0 12px;color:#686182;font-size:11px;font-weight:700;letter-spacing:1.5px;line-height:18px;text-transform:uppercase;">${escapeEmailHtml(template.codeLabel ?? "Tu código de verificación")}</p><p class="otp" style="margin:0;color:#4338CA;font-family:Consolas,'Courier New',monospace;font-size:30px;font-weight:700;letter-spacing:4px;line-height:40px;white-space:nowrap;">${template.code}</p></td></tr></table>` : "";
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <title>${escapeEmailHtml(template.subject)}</title>
  <style>@media only screen and (max-width:480px){.outer{padding:20px 12px!important}.content{padding:28px 22px!important}.brand{padding:24px 22px!important}.heading{font-size:25px!important;line-height:32px!important}.otp{font-size:25px!important;letter-spacing:2px!important}.footer{padding:26px 22px!important}.footer-grid,.footer-grid>tbody,.footer-row{display:block!important;width:100%!important}.footer-col{display:block!important;width:auto!important;padding:0!important}.footer-legal{display:block!important;width:auto!important}.footer-secondary{padding-top:22px!important}}</style>
</head>
<body style="margin:0;padding:0;background-color:#F5F5FA;color:#202039;font-family:Arial,Helvetica,sans-serif;-webkit-text-size-adjust:100%;">
  <div style="display:none!important;visibility:hidden;mso-hide:all;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${escapeEmailHtml(template.preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#F5F5FA">
    <tr><td class="outer" align="center" style="padding:40px 16px;">
      <!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;">
        <tr><td bgcolor="#FFFFFF" style="border:1px solid #E6E6F0;border-radius:18px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="table-layout:fixed;">
            <tr><td class="brand" style="padding:28px 36px;border-bottom:1px solid #EEEEF5;">
              <a href="${emailBrand.website}" aria-label="Visitar Pinwi" style="display:inline-block;color:#4F46E5;font-size:28px;font-weight:700;text-decoration:none;"><img src="${emailBrand.logoUrl}" width="184" height="60" alt="Pinwi" style="display:block;width:184px;max-width:100%;height:auto;border:0;color:#4F46E5;font-family:Arial,Helvetica,sans-serif;font-size:28px;font-weight:700;"></a>
              <p style="margin:10px 0 0;color:#71718A;font-size:12px;line-height:19px;">Tu próximo espacio empieza aquí.</p>
            </td></tr>
            <tr><td class="content" style="padding:34px 36px 36px;">
              <p style="margin:0 0 14px;color:#6D5BD0;font-size:11px;font-weight:700;letter-spacing:1.6px;line-height:18px;text-transform:uppercase;">${escapeEmailHtml(template.eyebrow)}</p>
              <h1 class="heading" style="margin:0 0 18px;color:#202039;font-size:28px;font-weight:700;letter-spacing:-0.6px;line-height:36px;">${escapeEmailHtml(template.title)}</h1>
              ${template.body}
              ${code}
              ${action}
              ${template.after ?? ""}
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:8px;"><tr><td bgcolor="#F7F7FB" style="padding:16px 18px;border:1px solid #EEEEF5;border-radius:10px;color:#616179;font-size:13px;line-height:21px;">${template.notice}</td></tr></table>
              <p style="margin:24px 0 0;color:#525268;font-size:14px;line-height:22px;">Nos vemos en Pinwi,<br><strong style="color:#303047;">El equipo de Pinwi</strong></p>
            </td></tr>
            <tr><td class="footer" bgcolor="#F9F9FE" style="padding:28px 36px;border-top:1px solid #E9E8F4;border-radius:0 0 18px 18px;">
              <table class="footer-grid" role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="table-layout:fixed;">
                <tr class="footer-row">
                  <td class="footer-col" width="50%" valign="top" style="padding-right:12px;">
                    <p style="margin:0 0 10px;color:#6D5BD0;font-size:10px;font-weight:700;letter-spacing:1.4px;line-height:16px;text-transform:uppercase;">Contacto</p>
                    <p style="margin:0 0 8px;color:#303047;font-size:16px;font-weight:700;line-height:23px;">¿Necesitas ayuda?</p>
                    <p style="margin:0 0 10px;color:#71718A;font-size:13px;line-height:21px;">Estamos para acompañarte.</p>
                    <a href="mailto:${emailBrand.contactEmail}" style="color:#4F46E5;font-size:14px;font-weight:700;line-height:22px;text-decoration:underline;">${emailBrand.contactEmail}</a>
                  </td>
                  <td class="footer-col footer-secondary" width="50%" valign="top" style="padding-left:12px;">
                    <p style="margin:0 0 10px;color:#6D5BD0;font-size:10px;font-weight:700;letter-spacing:1.4px;line-height:16px;text-transform:uppercase;">Explora Pinwi</p>
                    <p style="margin:0 0 10px;color:#71718A;font-size:13px;line-height:21px;">Encuentra espacios para estudiar,<br>trabajar y reunirte.</p>
                    <a href="${emailBrand.website}" style="color:#4F46E5;font-size:14px;font-weight:700;line-height:22px;text-decoration:underline;">Visita pinwi.cl &rarr;</a>
                  </td>
                </tr>
                <tr class="footer-row"><td class="footer-legal" colspan="2" style="padding-top:24px;">
                  <p style="margin:0;border-top:1px solid #E5E4F0;padding-top:18px;font-size:12px;line-height:22px;">
                    <a href="${emailBrand.website}/privacidad" style="display:inline-block;color:#65657C;text-decoration:underline;">Privacidad</a>
                    <span style="color:#B2ADC6;">&nbsp; &middot; &nbsp;</span>
                    <a href="${emailBrand.website}/terminos" style="display:inline-block;color:#65657C;text-decoration:underline;">Términos y condiciones</a>
                  </p>
                </td></tr>
              </table>
            </td></tr>
          </table>
        </td></tr>
        <tr><td align="center" style="padding:22px 16px 0;color:#77778D;font-size:12px;line-height:20px;">
          <p style="margin:0;color:#65657C;">&copy; ${new Date().getFullYear()} Pinwi</p>
          <p style="margin:6px 0 0;">Este es un correo automático relacionado con tu cuenta.<br>Para consultas, escríbenos a nuestro correo de contacto.</p>
        </td></tr>
      </table>
      <!--[if mso]></td></tr></table><![endif]-->
    </td></tr>
  </table>
</body>
</html>
`;
}

const limitedCode = emailParagraph("Este código es de un solo uso y tiene una vigencia limitada. Si vence, solicita uno nuevo desde Pinwi.");
const ignoreRequest = "Si no solicitaste este correo, puedes ignorarlo. No compartas tu código ni tus enlaces de acceso.";
const accountAction = { label: "Ir a mi cuenta", url: "https://www.pinwi.cl/iniciar-sesion" };
const securityNotice = "Si no reconoces este cambio, entra a Pinwi desde tu navegador y revisa la seguridad de tu cuenta. Si aún tienes acceso al correo de tu cuenta, puedes solicitar una nueva contraseña desde Iniciar sesión.";

export const authEmailTemplates: readonly EmailTemplate[] = [
  {
    key: "confirmation", label: "Confirmar registro", subject: "Confirma tu correo en Pinwi",
    preheader: "Ya casi estás dentro de Pinwi.", eyebrow: "Bienvenido a Pinwi", title: "Un código y estás dentro.",
    body: emailParagraph("Gracias por crear tu cuenta. Confirma tu correo para comenzar a descubrir espacios para estudiar, trabajar y reunirte.") + emailParagraph("Vuelve a la pantalla de verificación en Pinwi e ingresa el siguiente código:"),
    code: "{{ .Token }}", after: limitedCode, notice: ignoreRequest,
  },
  {
    key: "recovery", label: "Recuperar contraseña", subject: "Tu código para recuperar tu cuenta de Pinwi",
    preheader: "Recupera el acceso a tu cuenta.", eyebrow: "Recuperación de cuenta", title: "Volvamos a tu cuenta.",
    body: emailParagraph("Recibimos una solicitud para restablecer la contraseña de tu cuenta en Pinwi.") + emailParagraph("Vuelve a la pantalla de recuperación e ingresa este código para continuar y elegir una nueva contraseña:"),
    code: "{{ .Token }}", codeLabel: "Tu código de recuperación", after: limitedCode,
    notice: "Si no solicitaste este cambio, puedes ignorar este correo. Tu contraseña no cambia por recibirlo. No compartas este código con otras personas.",
  },
  {
    key: "magic_link", label: "Enlace de acceso", subject: "Tu enlace de acceso a Pinwi",
    preheader: "Continúa de forma segura.", eyebrow: "Acceso a tu cuenta", title: "Tu espacio te espera.",
    body: emailParagraph("Solicitaste un enlace para entrar a tu cuenta de Pinwi. Usa el botón para continuar:"),
    action: { label: "Entrar a Pinwi", url: "{{ .ConfirmationURL }}" },
    after: emailParagraph("El enlace es de un solo uso y tiene una vigencia limitada. Si vence, solicita uno nuevo."), notice: ignoreRequest,
  },
  {
    key: "invite", label: "Invitación de Supabase Auth", subject: "Te invitaron a unirte a Pinwi",
    preheader: "Tu invitación a Pinwi está lista.", eyebrow: "Invitación a Pinwi", title: "Un nuevo comienzo, en Pinwi.",
    body: emailParagraph("Recibiste una invitación para crear tu cuenta en Pinwi. Abre el enlace para continuar con tu acceso:"),
    action: { label: "Aceptar invitación", url: "{{ .ConfirmationURL }}" },
    after: emailParagraph("Esta invitación tiene una vigencia limitada. Si el enlace venció, pide a quien te invitó que envíe uno nuevo."), notice: "Si no esperabas esta invitación, puedes ignorar este correo. No compartas el enlace de acceso.",
  },
  {
    key: "email_change", label: "Confirmar cambio de correo", subject: "Confirma el cambio de correo en Pinwi",
    preheader: "Verifica tu nuevo correo.", eyebrow: "Cambio de correo", title: "Confirmemos tu nuevo correo.",
    body: emailParagraph("Recibimos una solicitud para usar <strong style=\"color:#303047;word-break:break-all;\">{{ .NewEmail }}</strong> como correo de tu cuenta en Pinwi.") + emailParagraph("Usa el botón para confirmar este paso. Si el cambio requiere confirmar ambos correos, revisa también la otra bandeja de entrada."),
    action: { label: "Confirmar cambio de correo", url: "{{ .ConfirmationURL }}" },
    notice: "Si no solicitaste este cambio, no lo confirmes. Entra a Pinwi desde tu navegador y revisa la seguridad de tu cuenta.",
  },
  {
    key: "reauthentication", label: "Verificar identidad", subject: "Verifica tu identidad en Pinwi",
    preheader: "Confirma que eres tú.", eyebrow: "Verificación de identidad", title: "Un paso más para continuar.",
    body: emailParagraph("Para continuar con una acción que requiere verificar tu identidad, ingresa este código en Pinwi:"),
    code: "{{ .Token }}", after: limitedCode, notice: ignoreRequest,
  },
  {
    key: "password_changed_notification", label: "Contraseña modificada", subject: "Tu contraseña de Pinwi fue modificada",
    preheader: "Hay un cambio en tu cuenta.", eyebrow: "Seguridad de tu cuenta", title: "Tu contraseña fue actualizada.",
    body: emailParagraph("La contraseña de tu cuenta en Pinwi se modificó recientemente.") + emailParagraph("Si realizaste este cambio, puedes seguir usando tu cuenta con la nueva contraseña."),
    action: accountAction, notice: securityNotice, notification: true,
  },
  {
    key: "email_changed_notification", label: "Correo modificado", subject: "El correo de tu cuenta de Pinwi cambió",
    preheader: "Revisa el cambio de correo.", eyebrow: "Seguridad de tu cuenta", title: "Tu correo fue actualizado.",
    body: emailParagraph("El correo de tu cuenta en Pinwi cambió de <strong style=\"word-break:break-all;\">{{ .OldEmail }}</strong> a <strong style=\"word-break:break-all;\">{{ .Email }}</strong>.") + emailParagraph("Si realizaste este cambio, usa tu nuevo correo para iniciar sesión."),
    action: accountAction, notice: securityNotice, notification: true,
  },
  {
    key: "phone_changed_notification", label: "Teléfono modificado", subject: "El teléfono de tu cuenta de Pinwi cambió",
    preheader: "Revisa el cambio de teléfono.", eyebrow: "Seguridad de tu cuenta", title: "Tu teléfono fue actualizado.",
    body: emailParagraph("El teléfono de tu cuenta cambió de <strong>{{ .OldPhone }}</strong> a <strong>{{ .Phone }}</strong>.") + emailParagraph("Si realizaste este cambio, no necesitas hacer nada más."),
    action: accountAction, notice: securityNotice, notification: true,
  },
  {
    key: "identity_linked_notification", label: "Método de acceso vinculado", subject: "Se vinculó un método de acceso a Pinwi",
    preheader: "Hay un nuevo método de acceso.", eyebrow: "Seguridad de tu cuenta", title: "Un nuevo método de acceso.",
    body: emailParagraph("Se vinculó <strong>{{ .Provider }}</strong> como método de acceso a tu cuenta de Pinwi.") + emailParagraph("Si realizaste este cambio, puedes usar ese método para iniciar sesión."),
    action: accountAction, notice: securityNotice, notification: true,
  },
  {
    key: "identity_unlinked_notification", label: "Método de acceso eliminado", subject: "Se desvinculó un método de acceso de Pinwi",
    preheader: "Revisa tus métodos de acceso.", eyebrow: "Seguridad de tu cuenta", title: "Un método de acceso se eliminó.",
    body: emailParagraph("Se desvinculó <strong>{{ .Provider }}</strong> de tu cuenta de Pinwi.") + emailParagraph("Si realizaste este cambio, usa uno de tus métodos de acceso restantes para iniciar sesión."),
    action: accountAction, notice: securityNotice, notification: true,
  },
  {
    key: "mfa_factor_enrolled_notification", label: "Verificación adicional agregada", subject: "Se agregó una verificación a tu cuenta de Pinwi",
    preheader: "Revisa la seguridad de tu cuenta.", eyebrow: "Seguridad de tu cuenta", title: "Una nueva verificación.",
    body: emailParagraph("Se agregó un método de verificación adicional (<strong>{{ .FactorType }}</strong>) a tu cuenta de Pinwi.") + emailParagraph("Si realizaste este cambio, ten ese método disponible cuando inicies sesión."),
    action: accountAction, notice: securityNotice, notification: true,
  },
  {
    key: "mfa_factor_unenrolled_notification", label: "Verificación adicional eliminada", subject: "Se eliminó una verificación de tu cuenta de Pinwi",
    preheader: "Revisa la seguridad de tu cuenta.", eyebrow: "Seguridad de tu cuenta", title: "Se eliminó una verificación.",
    body: emailParagraph("Se eliminó un método de verificación adicional (<strong>{{ .FactorType }}</strong>) de tu cuenta de Pinwi.") + emailParagraph("Si realizaste este cambio, revisa que conserves los métodos de acceso que necesitas."),
    action: accountAction, notice: securityNotice, notification: true,
  },
];

export const delegateEmailMetadata = {
  key: "delegates_invitation", label: "Invitación de delegado · Brevo",
  subject: "Te invitaron a gestionar espacios en Pinwi", preheader: "Activa tu acceso de delegado.",
};

function delegateEmail(name: string, inviteUrl: string, expiresAtLabel: string): EmailTemplate {
  return {
    ...delegateEmailMetadata, eyebrow: "Tu invitación de delegado", title: "Tus espacios, en buenas manos.",
    body: emailParagraph(`Hola ${name},`) + emailParagraph("Te invitamos a formar parte de Pinwi como delegado. Podrás gestionar los lugares que te asignen y mantener su información al día.") + emailParagraph("Desde tu panel también podrás habilitar reservas de prueba, publicar horarios y revisar las solicitudes de tus espacios.") + emailParagraph("Para aceptar, abre tu invitación e inicia sesión o crea tu cuenta:"),
    action: { label: "Aceptar mi invitación", url: inviteUrl },
    after: emailParagraph(`<strong style="color:#303047;">Disponible hasta ${expiresAtLabel}.</strong><br><span style="font-size:13px;">Horario de Chile continental (America/Santiago).</span>`) + emailParagraph(`Si el botón no funciona, copia este enlace en tu navegador:<br><a href="${inviteUrl}" style="color:#4F46E5;text-decoration:underline;word-break:break-all;overflow-wrap:anywhere;">${inviteUrl}</a>`),
    notice: "Esta invitación es personal. No compartas el enlace. Si no la esperabas, puedes ignorar este correo.",
  };
}

export function formatInvitationExpiry(value: string): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) throw new Error("invalid_invitation_expiry");
  return new Intl.DateTimeFormat("es-CL", { timeZone: "America/Santiago", dateStyle: "long", timeStyle: "short", hourCycle: "h23" }).format(date);
}

export function renderDelegateInvitation(name: string, inviteUrl: string, expiresAt: string): string {
  const url = new URL(inviteUrl);
  if (url.protocol !== "https:" || url.username || url.password) throw new Error("invalid_invitation_url");
  return renderEmail(delegateEmail(escapeEmailHtml(name), escapeEmailHtml(url.href), escapeEmailHtml(formatInvitationExpiry(expiresAt))));
}

export function renderBrevoDelegateTemplate(): string {
  return renderEmail(delegateEmail("{{ params.name }}", "{{ params.invite_url }}", "{{ params.expires_at_label }}"));
}
