export function assertPublicEnvironment(values: Record<string, string | undefined>) {
  for (const [name, value] of Object.entries(values)) {
    if (!name.startsWith("VITE_") || !value) continue;
    let privileged = /SERVICE_ROLE|BREVO_API_KEY|SMTP_PASSWORD|ADMIN_TOKEN|SECRET_KEY/.test(name) || value.startsWith("sb_secret_");
    const parts = value.split(".");
    if (parts.length === 3) {
      try {
        const payload: unknown = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
        if (payload && typeof payload === "object" && (payload as Record<string, unknown>).role === "service_role") privileged = true;
      } catch { /* Other public configuration values are not Supabase JWTs. */ }
    }
    if (privileged) throw new Error("La configuración pública contiene una clave privada. Muévela a los secretos del servidor antes de iniciar o compilar Pinwi.");
  }
}
