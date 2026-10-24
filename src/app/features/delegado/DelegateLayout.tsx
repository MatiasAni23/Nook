import { useState } from "react";
import { Link, Outlet, useLocation } from "react-router";
import { AlertTriangle, BarChart3, CalendarDays, ChevronRight, Home, LogOut, MapPin, MessageCircle, MoreHorizontal, Settings } from "lucide-react";
import { BrandLogo } from "../../components/BrandLogo";
import { Button } from "../../components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "../../components/ui/sheet";

const navItems = [
  { path:"/delegate", icon:Home, label:"Inicio", description:"Resumen de tus espacios" },
  { path:"/delegate/places", icon:MapPin, label:"Lugares", description:"Fichas y disponibilidad" },
  { path:"/delegate/reservations", icon:CalendarDays, label:"Reservas", description:"Solicitudes y calendario" },
  { path:"/delegate/reports", icon:AlertTriangle, label:"Reportes", description:"Problemas por resolver" },
  { path:"/delegate/chat", icon:MessageCircle, label:"Chats", description:"Tus conversaciones" },
  { path:"/delegate/stats", icon:BarChart3, label:"Estadísticas", description:"Actividad de los lugares" },
  { path:"/delegate/settings", icon:Settings, label:"Perfil", description:"Datos de tu cuenta" },
];
const primaryPaths = ["/delegate","/delegate/places","/delegate/reservations","/delegate/chat"];

export function DelegateLayout({ onLogout }: { onLogout: () => void }) {
  const location = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);
  if (/^\/delegate\/chat\/[^/]+\/?$/.test(location.pathname)) return <main className="size-full overflow-hidden"><Outlet /></main>;
  const chat = location.pathname.startsWith("/delegate/chat");
  const active = (path: string) => location.pathname === path || (path !== "/delegate" && location.pathname.startsWith(path));
  const current = navItems.find((item) => active(item.path)) ?? navItems[0];
  const moreActive = !primaryPaths.includes(current.path);
  return <div className={"bg-[#F6F7FB] text-[#302A47] " + (chat ? "flex h-dvh flex-col overflow-hidden" : "min-h-dvh")}>
    <aside className="fixed inset-y-0 right-0 z-40 hidden w-20 flex-col border-l border-[#E6E8F2] bg-white md:flex lg:w-60">
      <Link to="/delegate" aria-label="Pinwi, inicio del delegado" className="flex h-20 items-center justify-center gap-3 border-b border-[#F0EEF6] lg:justify-start lg:px-6"><BrandLogo variant="mark" className="h-11" /><div className="hidden lg:block"><p className="text-lg font-bold text-[#302A47]">Pinwi</p><p className="text-[11px] font-medium text-[#938BA3]">Panel del delegado</p></div></Link>
      <nav aria-label="Navegación del delegado" className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 py-6">{navItems.map(({path,icon:Icon,label}) => <Link key={path} to={path} title={label} aria-label={label} aria-current={active(path) ? "page" : undefined} className={"flex min-h-12 items-center justify-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-indigo-600 lg:justify-start " + (active(path) ? "bg-[#EFEDFF] text-[#6257BD]" : "text-[#938BA3] hover:bg-[#F7F6FB] hover:text-[#6257BD]")}><Icon className="size-5 shrink-0" aria-hidden="true" /><span className="hidden lg:inline">{label}</span>{active(path) && <span className="ml-auto hidden size-1.5 rounded-full bg-indigo-400 lg:inline" />}</Link>)}</nav>
      <div className="border-t border-[#F0EEF6] p-3"><button type="button" onClick={onLogout} aria-label="Cerrar sesión" title="Cerrar sesión" className="flex min-h-12 w-full items-center justify-center gap-3 rounded-xl px-3 text-sm text-[#938BA3] hover:bg-rose-50 hover:text-rose-700 focus-visible:outline-2 focus-visible:outline-indigo-600 lg:justify-start"><LogOut className="size-5 shrink-0" aria-hidden="true" /><span className="hidden lg:inline">Cerrar sesión</span></button></div>
    </aside>
    <div className={"relative md:mr-20 lg:mr-60 " + (chat ? "flex min-h-0 flex-1 flex-col" : "")}>
      <header className="z-30 flex h-16 shrink-0 items-center justify-between gap-3 border-b border-[#E6E8F2] bg-white/95 px-4 backdrop-blur-sm md:sticky md:top-0 md:h-20 md:px-6">
        <div className="flex min-w-0 items-center gap-3"><BrandLogo variant="mark" className="h-9 md:hidden" /><span className="hidden text-xs text-[#ADA3BD] sm:inline">Panel del delegado</span><ChevronRight className="hidden size-3 text-[#B5ADC2] sm:inline" aria-hidden="true" /><span className="truncate text-sm font-semibold text-[#746685]">{current.label}</span></div>
        <span className="hidden rounded-full border border-indigo-100 bg-indigo-50/50 px-3 py-1 text-[11px] font-medium text-[#8372B8] md:inline">Gestión de espacios</span>
        <Button variant="ghost" size="sm" className="text-[#938BA3] md:hidden" onClick={onLogout}><LogOut className="mr-1.5 size-4" aria-hidden="true" />Salir</Button>
      </header>
      <main className={"relative mx-auto w-full max-w-7xl " + (chat ? "min-h-0 flex-1 overflow-hidden pb-24 md:pb-0" : "")}><Outlet /></main>
    </div>
    <nav aria-label="Navegación móvil del delegado" className="fixed inset-x-3 bottom-3 z-40 grid grid-cols-5 rounded-2xl border border-[#E6E8F2] bg-white/95 p-1.5 shadow-[0_6px_30px_rgba(51,40,83,0.12)] backdrop-blur-sm md:hidden">
      {primaryPaths.map((path) => { const item = navItems.find((n) => n.path === path)!; const Icon = item.icon; return <Link key={path} to={path} aria-current={active(path) ? "page" : undefined} className={"flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl text-[10px] font-medium focus-visible:outline-2 focus-visible:outline-indigo-600 " + (active(path) ? "bg-[#EFEDFF] text-[#6257BD]" : "text-[#A096B1]")}><Icon className="size-5" aria-hidden="true" />{item.label}</Link>; })}
      <Sheet open={moreOpen} onOpenChange={setMoreOpen}><SheetTrigger asChild><button type="button" aria-label="Más opciones del delegado" className={"flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl text-[10px] font-medium focus-visible:outline-2 focus-visible:outline-indigo-600 " + (moreActive ? "bg-[#EFEDFF] text-[#6257BD]" : "text-[#A096B1]")}><MoreHorizontal className="size-5" aria-hidden="true" />Más</button></SheetTrigger><SheetContent side="bottom" className="rounded-t-3xl p-5"><SheetHeader className="p-0 pb-4 text-left"><SheetTitle>Tu panel de gestión</SheetTitle><SheetDescription>Más herramientas para tus lugares.</SheetDescription></SheetHeader><nav aria-label="Más opciones del delegado" className="space-y-2">{navItems.filter((item) => !primaryPaths.includes(item.path)).map(({path,icon:Icon,label,description}) => <Link key={path} to={path} onClick={() => setMoreOpen(false)} className="flex items-center gap-3 rounded-xl bg-[#F7F5FD] p-4 focus-visible:outline-2 focus-visible:outline-indigo-600"><Icon className="size-5 text-indigo-400" aria-hidden="true" /><span><span className="block text-sm font-semibold text-[#746685]">{label}</span><span className="mt-1 block text-xs text-[#A096B1]">{description}</span></span><ChevronRight className="ml-auto size-4 text-[#B5ADC2]" aria-hidden="true" /></Link>)}</nav></SheetContent></Sheet>
    </nav>
  </div>;
}
