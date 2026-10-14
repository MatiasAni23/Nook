import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { Bell, CalendarDays, Mail, MapPin, Phone, Save, ShieldCheck, UserRound } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { getCachedDelegateSettings, getCurrentDelegateSettings, updateCurrentDelegateProfile } from "../../services/delegateService";
import { useCurrentUser } from "../../context/CurrentUserContext";
import { useDelegateData } from "./useDelegateData";
import { DelegatePage, DelegateRefresh, DelegateNotice, DelegateSkeleton } from "./DelegatePage";

export function DelegateSettings() {
  const { refreshCurrentUser } = useCurrentUser();
  const read = useDelegateData(getCurrentDelegateSettings, getCachedDelegateSettings);
  const [form, setForm] = useState({ name: "", phone: "" });
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const busy = useRef(false);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => { if (read.data && !dirty) setForm({ name: read.data.profile.name, phone: read.data.profile.phone ?? "" }); }, [read.data, dirty]);
  async function save() {
    if (busy.current || !read.data) return;
    const values = { ...form };
    busy.current = true; setSaving(true); setError(""); setSuccess("");
    try {
      await updateCurrentDelegateProfile(values);
      if (mounted.current) {
        read.setData((current) => current ? { ...current, profile: { ...current.profile, name: values.name.trim(), phone: values.phone.trim() || null } } : current);
        setDirty(false); setSuccess("Tu perfil se guardó correctamente.");
      }
      await refreshCurrentUser().catch(() => undefined);
    } catch (cause) {
      if (mounted.current) setError(cause instanceof Error ? cause.message : "No pudimos guardar tu perfil.");
    } finally { busy.current = false; if (mounted.current) setSaving(false); }
  }
  return <DelegatePage eyebrow="Tu cuenta en Pinwi" title="Perfil del delegado" description="Actualiza tus datos de contacto y revisa los lugares que gestionas." actions={<DelegateRefresh updating={read.updating || saving || dirty} onClick={() => void read.refresh()} />}>
    {(read.error || error) && <DelegateNotice>{error || read.error}</DelegateNotice>}
    {success && <DelegateNotice success>{success}</DelegateNotice>}
    {read.loading ? <DelegateSkeleton cards={2} /> : read.data && <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <form onSubmit={(event) => { event.preventDefault(); void save(); }} className="overflow-hidden rounded-2xl border border-[#E6E8F2] bg-white">
        <div className="flex items-center gap-3 border-b border-[#EFEDF6] p-5"><div className="grid size-11 place-items-center rounded-xl bg-indigo-50 text-indigo-500"><UserRound className="size-5" aria-hidden="true" /></div><div><h2 className="font-semibold text-[#302A47]">Información personal</h2><p className="mt-1 text-xs text-[#938BA3]">Estos datos identifican tu cuenta.</p></div></div>
        <div className="space-y-5 p-5">
          <div className="space-y-2"><Label htmlFor="delegate-name">Nombre completo</Label><Input id="delegate-name" autoComplete="name" required maxLength={120} disabled={saving} value={form.name} onChange={(e) => { setForm((v) => ({ ...v, name: e.target.value })); setDirty(true); }} /></div>
          <div className="space-y-2"><Label htmlFor="delegate-email">Correo de acceso</Label><div className="relative"><Mail className="absolute left-3 top-2.5 size-4 text-[#A499B6]" aria-hidden="true" /><Input id="delegate-email" type="email" value={read.data.profile.email} readOnly className="bg-[#F7F6FB] pl-9 text-[#8B829D]" /></div><p className="text-xs leading-relaxed text-[#938BA3]">El correo de acceso se mantiene asociado a tu cuenta y no se modifica desde aquí.</p></div>
          <div className="space-y-2"><Label htmlFor="delegate-phone">Teléfono de contacto</Label><div className="relative"><Phone className="absolute left-3 top-2.5 size-4 text-[#A499B6]" aria-hidden="true" /><Input id="delegate-phone" type="tel" autoComplete="tel" maxLength={30} disabled={saving} value={form.phone} className="pl-9" placeholder="+56 9…" onChange={(e) => { setForm((v) => ({ ...v, phone: e.target.value })); setDirty(true); }} /></div></div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#EFEDF6] bg-[#FAFAFD] p-5"><span className="text-xs text-[#938BA3]">{dirty ? "Tienes cambios sin guardar" : "Tus datos están al día"}</span><Button type="submit" disabled={saving || !dirty || !form.name.trim()} className="bg-[#4F46E5] hover:bg-[#4338CA]"><Save className="mr-2 size-4" aria-hidden="true" />{saving ? "Guardando…" : "Guardar cambios"}</Button></div>
      </form>
      <aside className="space-y-4">
        <div className="rounded-2xl border border-[#E6E8F2] bg-white p-5"><div className="mb-3 flex items-center gap-2"><ShieldCheck className="size-5 text-indigo-400" aria-hidden="true" /><h2 className="font-semibold text-[#302A47]">Cuenta de delegado</h2></div><p className="text-xs leading-relaxed text-[#8B829D]">Puedes gestionar las fichas, horarios y reservas de tus lugares asignados.</p></div>
        <section className="rounded-2xl border border-[#E6E8F2] bg-white p-5"><h2 className="mb-3 flex items-center gap-2 font-semibold text-[#302A47]"><MapPin className="size-4 text-indigo-400" aria-hidden="true" />Lugares asignados</h2><div className="divide-y divide-[#EFEDF6]">{read.data.places.map((place) => <Link key={place.id} to="/delegate/places" className="block py-3 text-sm text-[#746685] hover:text-indigo-600">{place.name}</Link>)}{!read.data.places.length && <p className="text-xs text-[#938BA3]">Aún no tienes lugares asignados.</p>}</div></section>
        <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-5"><h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#6257BD]"><CalendarDays className="size-4" aria-hidden="true" />Organiza la disponibilidad</h2><p className="text-xs leading-relaxed text-[#8B829D]">Publica los horarios de cada espacio desde Mis lugares.</p><Button asChild variant="outline" className="mt-4 w-full border-indigo-200 bg-white text-indigo-600"><Link to="/delegate/places">Configurar horarios</Link></Button></div>
        <div className="rounded-2xl border border-[#E6E8F2] bg-white p-5"><h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#6257BD]"><Bell className="size-4" aria-hidden="true" />Avisos de reservas</h2><p className="text-xs leading-relaxed text-[#8B829D]">Las nuevas solicitudes y sus cambios de estado se reflejan en el apartado de Reservas.</p></div>
      </aside>
    </div>}
  </DelegatePage>;
}
