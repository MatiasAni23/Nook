import { Outlet, useLocation, useNavigate } from "react-router";
import { AlertTriangle, Calendar, Home, LogOut, MapPin, Settings } from "lucide-react";
import { Button } from "../../components/ui/button";

interface DelegateLayoutProps {
  onLogout: () => void;
}

export function DelegateLayout({ onLogout }: DelegateLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = [
    { path: "/delegate", icon: Home, label: "Inicio" },
    { path: "/delegate/places", icon: MapPin, label: "Mis Lugares" },
    { path: "/delegate/reservations", icon: Calendar, label: "Reservas" },
    { path: "/delegate/reports", icon: AlertTriangle, label: "Reportes" },
    { path: "/delegate/settings", icon: Settings, label: "Configuracion" },
  ];

  return (
    <div className="size-full relative bg-gray-50">
      <header className="bg-white border-b px-4 py-3 shadow-sm flex items-center justify-between">
        <div>
          <h1 className="text-lg text-[#4F46E5]" style={{ fontWeight: 800 }}>Panel de Delegado - Nook</h1>
        </div>
        <Button variant="ghost" size="sm" onClick={onLogout}>
          <LogOut className="size-4 mr-2" />
          Salir
        </Button>
      </header>

      <main className="size-full">
        <Outlet />
      </main>

      <div className="fixed bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white via-white/70 to-transparent pointer-events-none z-40" />

      <nav className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3">
        {navItems.map(({ path, icon: Icon, label }) => {
          const isActive = location.pathname === path ||
            (path !== "/delegate" && location.pathname.startsWith(path));

          return (
            <button
              key={path}
              className={`size-12 rounded-full flex items-center justify-center transition-all shadow-lg ${
                isActive
                  ? "bg-[#4F46E5] text-white scale-105"
                  : "bg-white text-gray-600 hover:bg-purple-50"
              }`}
              onClick={() => navigate(path)}
              aria-label={label}
            >
              <Icon className="size-5" />
            </button>
          );
        })}
      </nav>
    </div>
  );
}
