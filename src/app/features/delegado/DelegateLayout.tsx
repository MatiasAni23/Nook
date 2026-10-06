import { BrandLogo } from "../../components/BrandLogo";
import { Outlet, useLocation, useNavigate } from "react-router";
import { motion } from "motion/react";
import { AlertTriangle, BarChart3, Calendar, ChevronRight, Home, LogOut, MapPin, MessageCircle, Settings } from "lucide-react";
import { Button } from "../../components/ui/button";

interface DelegateLayoutProps {
  onLogout: () => void;
}

const navItems = [
  {
    path: "/delegate",
    icon: Home,
    label: "Inicio",
    description: "Resumen de actividad",
  },
  {
    path: "/delegate/places",
    icon: MapPin,
    label: "Lugares",
    description: "Espacios asignados",
  },
  {
    path: "/delegate/reservations",
    icon: Calendar,
    label: "Reservas",
    description: "Solicitudes y calendario",
  },
  {
    path: "/delegate/reports",
    icon: AlertTriangle,
    label: "Reportes",
    description: "Tickets activos",
  },
  {
    path: "/delegate/chat",
    icon: MessageCircle,
    label: "Chats",
    description: "Conversaciones activas",
  },
  {
    path: "/delegate/stats",
    icon: BarChart3,
    label: "Estadísticas",
    description: "Premium bloqueado",
  },
  {
    path: "/delegate/settings",
    icon: Settings,
    label: "Perfil",
    description: "Cuenta y preferencias",
  },
];

export function DelegateLayout({ onLogout }: DelegateLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const isChatRoute = location.pathname.startsWith("/delegate/chat");

  const isActivePath = (path: string) =>
    location.pathname === path ||
    (path !== "/delegate" && location.pathname.startsWith(path));
  const activeItem = navItems.find((item) => isActivePath(item.path)) ?? navItems[0];

  return (
    <div className={`relative bg-[#F6F7FB] text-[#111827] ${isChatRoute ? "flex h-dvh flex-col overflow-hidden" : "min-h-screen"}`}>
      <div className="pointer-events-none fixed inset-x-0 top-0 hidden h-56 bg-gradient-to-b from-white to-transparent md:block" />

      <aside className="group/sidebar fixed bottom-0 right-0 top-0 z-40 hidden w-20 flex-col overflow-hidden rounded-l-[1.35rem] border-l border-[#E6E8F5] bg-white shadow-[0_24px_60px_rgba(15,23,42,0.10)] transition-[width] duration-300 hover:w-72 md:flex">
        <div className="relative h-[5.75rem] border-b border-[#EEF0F8]">
          <div className="absolute left-1/2 top-1/2 grid -translate-x-1/2 -translate-y-1/2 place-items-center transition-[left,transform] duration-300 group-hover/sidebar:left-4 group-hover/sidebar:translate-x-0">
            <div className="grid size-12 place-items-center rounded-2xl bg-[#EEF2FF]">
              <BrandLogo variant="mark" className="h-11" />
            </div>
          </div>
          <div className="absolute inset-y-0 left-20 right-4 flex min-w-0 items-center opacity-0 transition-opacity duration-200 group-hover/sidebar:opacity-100">
            <div className="min-w-0">
              <p className="text-lg font-black text-[#1E1B4B]">Pinwi Delegate</p>
              <p className="text-xs font-bold text-slate-400">Panel de gestion</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-2 py-4" aria-label="Navegacion delegado">
          {navItems.map(({ path, icon: Icon, label, description }) => {
            const isActive = isActivePath(path);

            return (
              <button
                key={path}
                type="button"
                className={`group relative h-16 w-full rounded-2xl border text-left transition ${
                  isActive
                    ? "border-transparent bg-transparent text-[#4F46E5]"
                    : "border-transparent text-slate-500 hover:border-[#E6E8F5] hover:bg-[#FAFBFF] hover:text-[#1E1B4B]"
                }`}
                onClick={() => navigate(path)}
                aria-current={isActive ? "page" : undefined}
              >
                <div className="absolute left-1/2 top-1/2 grid -translate-x-1/2 -translate-y-1/2 place-items-center transition-[left,transform] duration-300 group-hover/sidebar:left-4 group-hover/sidebar:translate-x-0">
                  <div
                    className={`grid size-10 place-items-center rounded-xl transition ${
                      isActive
                        ? "bg-[#4F46E5] text-white shadow-[0_10px_20px_rgba(79,70,229,0.24)]"
                        : "bg-[#F1F3FA] text-slate-500 group-hover:text-[#4F46E5]"
                    }`}
                  >
                    <Icon className="size-5" />
                  </div>
                </div>
                <div className="absolute inset-y-0 left-16 right-10 flex min-w-0 flex-col justify-center opacity-0 transition-opacity duration-200 group-hover/sidebar:opacity-100">
                  <p className="truncate text-sm font-black">{label}</p>
                  <p className="truncate text-xs font-medium text-slate-400">{description}</p>
                </div>
                <ChevronRight
                  className={`absolute right-4 top-1/2 size-4 -translate-y-1/2 transition ${
                    isActive ? "opacity-0 group-hover/sidebar:opacity-100" : "opacity-0 group-hover/sidebar:opacity-60"
                  }`}
                />
              </button>
            );
          })}
        </nav>

        <div className="border-t border-[#EEF0F8] py-4">
          <button
            type="button"
            className="relative h-12 w-full rounded-2xl border border-[#E1E5F4] font-bold text-slate-600 transition hover:bg-red-50 hover:text-red-600"
            onClick={onLogout}
            aria-label="Cerrar sesion"
          >
            <span className="absolute left-1/2 top-1/2 grid -translate-x-1/2 -translate-y-1/2 place-items-center transition-[left,transform] duration-300 group-hover/sidebar:left-4 group-hover/sidebar:translate-x-0">
              <LogOut className="size-5" />
            </span>
            <span className="absolute inset-y-0 left-16 right-4 flex items-center opacity-0 transition-opacity duration-200 group-hover/sidebar:opacity-100">
              Cerrar sesion
            </span>
          </button>
        </div>
      </aside>

      <div className={`relative md:pr-20 ${isChatRoute ? "flex min-h-0 flex-1 flex-col" : "min-h-screen"}`}>
        <header className="z-30 shrink-0 border-b border-[#E6E8F5]/80 bg-white/95 px-4 py-4 backdrop-blur md:sticky md:top-0 md:px-8">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <BrandLogo variant="mark" className="h-10 md:hidden" />
              <div className="min-w-0">
                <h1 className="truncate text-2xl font-black tracking-normal text-[#111827] md:text-3xl">
                  {activeItem.label}
                </h1>
                <p className="hidden text-sm font-medium text-slate-500 md:block">{activeItem.description}</p>
              </div>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={onLogout}
              className="rounded-xl font-bold text-slate-500 hover:bg-red-50 hover:text-red-600 md:hidden"
            >
              <LogOut className="mr-2 size-4" />
              Salir
            </Button>
          </div>
        </header>

        <main className={`mx-auto max-w-7xl px-0 md:px-8 ${isChatRoute ? "w-full min-h-0 flex-1 overflow-hidden pb-0 md:pb-0" : "min-h-[calc(100vh-5rem)] pb-28 md:pb-8"}`}>
          <Outlet />
        </main>
      </div>

      <div className="pointer-events-none fixed bottom-0 left-0 right-0 z-40 h-28 bg-gradient-to-t from-white via-white/80 to-transparent md:hidden" />

      <nav
        className="fixed bottom-3 left-1/2 z-50 flex max-w-[calc(100vw-1rem)] -translate-x-1/2 items-end gap-1 rounded-[2rem] border border-[#E8EAF7] bg-white px-2 py-2 shadow-[0_16px_34px_rgba(15,23,42,0.12)] sm:gap-1.5 sm:px-2.5 md:hidden"
        aria-label="Navegacion delegado movil"
      >
        {navItems.map(({ path, icon: Icon, label }) => {
          const isActive = isActivePath(path);

          return (
            <motion.button
              key={path}
              type="button"
              className="group flex w-[3.35rem] flex-col items-center gap-1 outline-none sm:w-[3.75rem]"
              onClick={() => navigate(path)}
              aria-label={label}
              aria-current={isActive ? "page" : undefined}
              whileTap={{ scale: 0.9, y: 3 }}
              whileHover={{ y: -2 }}
              transition={{ type: "spring", stiffness: 520, damping: 28 }}
            >
              <motion.span
                className={`relative grid size-[2.625rem] place-items-center rounded-full border transition-colors duration-300 ${
                  isActive
                    ? "border-[#4F46E5] bg-[#4F46E5] text-white shadow-[0_10px_18px_rgba(79,70,229,0.26)]"
                    : "border-[#E8EAF7] bg-white text-[#6D5DD3] shadow-none group-hover:border-[#D7DBF5] group-hover:bg-white group-hover:text-[#4F46E5]"
                }`}
                animate={{
                  scale: isActive ? 1.08 : 1,
                  y: isActive ? -3 : 0,
                }}
                transition={{ type: "spring", stiffness: 420, damping: 24 }}
              >
                <motion.span
                  animate={{ scale: isActive ? 1.08 : 1 }}
                  transition={{ type: "spring", stiffness: 460, damping: 26 }}
                >
                  <Icon className="relative z-10 size-[1.125rem]" strokeWidth={isActive ? 2.6 : 2.2} />
                </motion.span>
              </motion.span>
              <span
                className={`w-full truncate text-center text-[10px] font-semibold leading-none transition-colors duration-300 ${
                  isActive ? "text-[#4F46E5]" : "text-[#7C70C9] group-hover:text-[#4F46E5]"
                }`}
              >
                {label}
              </span>
            </motion.button>
          );
        })}
      </nav>
    </div>
  );
}
