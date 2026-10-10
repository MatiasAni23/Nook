import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { isSupabaseConfigured } from "../../lib/supabase";
import { emptySiteSettings, getCachedSiteSettings, getSiteSettings, saveSiteSettings, socialChannels } from "../../services/siteSettingsService";

export function AdminSiteSettings() {
  const [settings, setSettings] = useState(() => getCachedSiteSettings() ?? emptySiteSettings());
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let mounted = true;
    setError("");
    setLoading(true);
    getSiteSettings().then(value => { if (mounted) { setSettings(value); setLoadFailed(false); } })
      .catch(cause => { if (mounted) { setLoadFailed(true); setError(cause instanceof Error ? cause.message : "No se pudo cargar el sitio."); } })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [attempt]);
  return <section className="admin-site-settings"><div className="management-section-heading"><div><h2>Sitio público</h2><p>Los enlaces guardados aquí aparecen en el footer de la landing. Deja vacío lo que todavía no quieras publicar.</p></div></div>{!isSupabaseConfigured && <p className="admin-notice mb-5">Modo de demostración: los cambios se mantienen durante esta sesión, solo en este navegador.</p>}
    {error && <p className="admin-notice mb-4" role="alert">{error}{loadFailed && <button type="button" className="ml-3 underline" onClick={() => setAttempt(value => value + 1)}>Reintentar</button>}</p>}{message && <p className="admin-notice mb-4" role="status">{message}</p>}
    <form onSubmit={async event => { event.preventDefault(); setSaving(true); setError(""); setMessage(""); try { setSettings(await saveSiteSettings(settings)); setMessage("Enlaces guardados. La landing ya usa la configuración actualizada."); } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudieron guardar los enlaces."); } finally { setSaving(false); } }}>
      <fieldset disabled={loading || saving || loadFailed} className="grid gap-5"><legend className="sr-only">Redes y contacto de Pinwi</legend><div className="grid gap-5 md:grid-cols-2">{socialChannels.map(({ key, label }) => <div key={key}><Label htmlFor={"site-" + key}>{label}</Label><Input id={"site-" + key} type="url" placeholder="https://…" value={settings.links[key]} maxLength={2048} onChange={event => { setMessage(""); setSettings(current => ({ ...current, links: { ...current.links, [key]: event.target.value } })); }} className="mt-2" /></div>)}</div><div><Label htmlFor="site-whatsapp">Número de WhatsApp</Label><Input id="site-whatsapp" type="tel" placeholder="+56 9 1234 5678" value={settings.whatsapp} maxLength={30} onChange={event => { setMessage(""); setSettings(current => ({ ...current, whatsapp: event.target.value })); }} className="mt-2 max-w-md" /><p className="mt-2 text-sm text-gray-600">Incluye el código de país. Se abrirá una conversación mediante wa.me.</p></div><div className="flex justify-end"><button type="submit" className="admin-primary-button"><Save size={17} aria-hidden="true" />{loading ? "Cargando…" : saving ? "Guardando…" : "Guardar enlaces"}</button></div></fieldset>
    </form>
  </section>;
}
