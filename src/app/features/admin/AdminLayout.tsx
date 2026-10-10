import { NavLink, Outlet, useLocation } from "react-router";
import {
  BarChart3,
  Building2,
  Home,
  LogOut,
  MessageCircle,
  Settings,
} from "lucide-react";
import { BrandLogo } from "../../components/BrandLogo";
import { useCurrentUser } from "../../context/CurrentUserContext";
import "./admin.css";

const navigation = [
  { path: "/admin", icon: Home, label: "Inicio", end: true },
  { path: "/admin/places", icon: Building2, label: "Lugares" },
  { path: "/admin/stats", icon: BarChart3, label: "Estadísticas" },
  { path: "/admin/management", icon: Settings, label: "Gestión" },
  { path: "/admin/chat", icon: MessageCircle, label: "Chats" },
];

export function AdminLayout({ onLogout }: { onLogout: () => void }) {
  const { currentUser } = useCurrentUser();
  const { pathname } = useLocation();
  const active =
    navigation.find(
      (item) => item.path !== "/admin" && pathname.startsWith(item.path),
    ) ?? navigation[0];
  return (
    <div className="admin-page">
      <a href="#admin-content" className="admin-skip-link">
        Ir al contenido
      </a>
      <aside className="admin-sidebar">
        <NavLink
          to="/admin"
          className="admin-brand"
          aria-label="Pinwi, inicio de administración"
        >
          <BrandLogo className="[&_img:first-child]:h-9 [&_img:last-child]:h-6" />
          <span>Administración</span>
        </NavLink>
        <nav
          aria-label="Navegación de administración"
          className="admin-navigation"
        >
          {navigation.map(({ path, icon: Icon, label, end }) => (
            <NavLink
              key={path}
              to={path}
              end={end}
              className={({ isActive }) =>
                `admin-nav-link ${isActive ? "is-active" : ""}`
              }
            >
              <Icon size={19} strokeWidth={1.6} aria-hidden="true" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="admin-account">
          <span className="admin-avatar" aria-hidden="true">
            {(currentUser?.name || "Administrador").slice(0, 1).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">
              {currentUser?.name || "Administrador"}
            </p>
            <p className="text-xs text-gray-500">Cuenta de administración</p>
          </div>
          <button
            type="button"
            onClick={onLogout}
            className="admin-icon-button"
            aria-label="Cerrar sesión"
          >
            <LogOut size={17} />
          </button>
        </div>
      </aside>
      <div className="admin-workspace">
        <header className="admin-topbar">
          <span className="hidden text-sm text-gray-500 md:block">
            Administración <span className="mx-2 text-gray-300">/</span>{" "}
            <span className="text-[#25233b]">{active.label}</span>
          </span>
          <BrandLogo variant="mark" className="h-8 md:hidden" />
          <span className="text-xs text-gray-500">Panel de Pinwi</span>
          <button
            type="button"
            onClick={onLogout}
            className="admin-icon-button md:hidden"
            aria-label="Cerrar sesión"
          >
            <LogOut size={18} />
          </button>
        </header>
        <main id="admin-content" tabIndex={-1} className="admin-content">
          <Outlet key={currentUser?.id ?? "demo"} />
        </main>
      </div>
      <nav
        className="admin-mobile-nav"
        aria-label="Navegación de administración móvil"
      >
        {navigation.map(({ path, icon: Icon, label, end }) => (
          <NavLink
            key={path}
            to={path}
            end={end}
            className={({ isActive }) => (isActive ? "is-active" : "")}
          >
            <Icon size={20} strokeWidth={1.6} aria-hidden="true" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
