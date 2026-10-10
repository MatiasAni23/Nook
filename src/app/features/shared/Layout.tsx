import { BrandLogo } from "../../components/BrandLogo";
import { useEffect, useState } from "react";
import { matchPath, NavLink, Outlet, useLocation, useNavigate } from "react-router";
import { motion } from "motion/react";
import { Map, User, Users, MessageCircle, Search } from "lucide-react";
import { MessageNotificationBanner } from "./MessageNotificationBanner";
import { useCurrentUser } from "../../context/CurrentUserContext";
import { getInitials } from "../../services/currentUserService";
import "./user-layout.css";

// Get user role from routes.tsx global state
const getUserRole = (): 'student' | 'worker' | 'admin' => {
  // Access the global variable from routes.tsx
  return (window as any).__userRole || 'student';
};

export function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser } = useCurrentUser();
  const [isDesktop, setIsDesktop] = useState(() => window.matchMedia("(min-width: 900px)").matches);
  const userRole = currentUser?.role ?? getUserRole();
  const isPlaceDetail = Boolean(
    matchPath("/app/place/:placeId", location.pathname) ||
    matchPath("/app/workplace/:placeId", location.pathname),
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 900px)");
    const updateLayout = () => setIsDesktop(mediaQuery.matches);
    mediaQuery.addEventListener("change", updateLayout);
    updateLayout();
    return () => mediaQuery.removeEventListener("change", updateLayout);
  }, []);

  // Navigation items based on user role
  const getNavItems = () => {
    if (userRole === 'worker') {
      return [
        { path: "/app/chat", icon: MessageCircle, label: "Mensajes" },
        { path: "/app/discover", icon: Search, label: "Descubrir" },
        { path: "/app", icon: Map, label: "Mapa" },
        { path: "/app/profile", icon: User, label: "Perfil" },
      ];
    }

    // Student navigation (default)
    return [
      { path: "/app/students", icon: Users, label: "Estudiantes" },
      { path: "/app/chat", icon: MessageCircle, label: "Chat" },
      { path: "/app/discover", icon: Search, label: "Descubrir" },
      { path: "/app", icon: Map, label: "Mapa" },
      { path: "/app/profile", icon: User, label: "Perfil" },
    ];
  };

  const navItems = getNavItems();
  const desktopOrder = ["/app/discover", "/app", "/app/students", "/app/chat", "/app/profile"];
  const desktopNavItems = [...navItems].sort((left, right) => desktopOrder.indexOf(left.path) - desktopOrder.indexOf(right.path));
  const accountName = currentUser?.name || "Mi cuenta";

  return (
    <div className={"user-layout" + (isPlaceDetail ? " is-detail" : "")}>
      <a href="#user-content" className="user-skip-link">Ir al contenido</a>
      <main id="user-content" tabIndex={-1} className="user-layout-content">
        <Outlet />
      </main>
      <MessageNotificationBanner />

      {!isPlaceDetail && (isDesktop ? (
        <aside className="user-sidebar">
          <NavLink to="/app/discover" className="user-sidebar-brand" aria-label="Pinwi, ir a Descubrir">
            <BrandLogo className="[&_img:first-child]:h-10 [&_img:last-child]:h-7" />
            <span>Estudio y trabajo</span>
          </NavLink>
          <nav className="user-sidebar-navigation" aria-label="Navegación principal">
            {desktopNavItems.map(({ path, icon: Icon, label }) => (
              <NavLink key={path} to={path} end={path === "/app"} className={({ isActive }) => "user-sidebar-link" + (isActive ? " is-active" : "")}>
                <Icon size={20} strokeWidth={1.7} aria-hidden="true" />
                <span>{label}</span>
              </NavLink>
            ))}
          </nav>
          <div className="user-sidebar-account">
            <span className="user-sidebar-avatar" aria-hidden="true">{getInitials(accountName)}</span>
            <div><p>{accountName}</p><span>{userRole === "worker" ? "Trabajador" : "Estudiante"}</span></div>
          </div>
        </aside>
      ) : (
        <>
          {/* Gradient overlay for navigation */}
          <div className="fixed bottom-0 left-0 right-0 h-28 bg-gradient-to-t from-white via-white/80 to-transparent pointer-events-none z-40" />

          {/* Floating circular navigation */}
          <nav
            className="user-mobile-navigation fixed bottom-3 left-1/2 z-50 flex max-w-[calc(100vw-1rem)] -translate-x-1/2 items-end gap-1 px-2 py-2 sm:gap-1.5 sm:px-2.5"
            aria-label="Navegación principal"
          >
            {navItems.map(({ path, icon: Icon, label }) => {
              const isActive =
                (location.pathname === path) ||
                (path === "/app/discover" && location.pathname === "/app/discover") ||
                (path === "/app/chat" && location.pathname.startsWith("/app/chat"));

              return (
                <motion.button
                  key={path}
                  type="button"
                  className="group flex w-[3.75rem] flex-col items-center gap-1 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-[#9F87D0] focus-visible:ring-offset-2 focus-visible:ring-offset-white"
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
                        ? 'border-[#4F46E5] bg-[#4F46E5] text-white shadow-[0_5px_12px_rgba(79,70,229,0.20)]'
                        : 'border-[#DCCDF5] bg-white text-[#7961A3] shadow-none group-hover:border-[#B9A4EF] group-hover:bg-[#FCFAFF] group-hover:text-[#4F46E5]'
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
                      {path === "/app/discover" ? (
                        <BrandLogo variant="mark" className="relative z-10 h-8 w-6" />
                      ) : (
                        <Icon className="relative z-10 size-[1.125rem]" strokeWidth={isActive ? 2.6 : 2.2} />
                      )}
                    </motion.span>
                  </motion.span>
                  <span
                    className={`w-full truncate text-center text-[10px] font-semibold leading-none transition-colors duration-300 ${
                      isActive ? 'text-[#4F46E5]' : 'text-[#605769] group-hover:text-[#4F46E5]'
                    }`}
                  >
                    {label}
                  </span>
                </motion.button>
              );
            })}
          </nav>
        </>
      ))}
    </div>
  );
}
