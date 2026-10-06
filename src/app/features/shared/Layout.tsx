import { BrandLogo } from "../../components/BrandLogo";
import { Outlet, useLocation, useNavigate } from "react-router";
import { motion } from "motion/react";
import { Map, User, Users, MessageCircle, Search } from "lucide-react";
import { MessageNotificationBanner } from "./MessageNotificationBanner";

// Get user role from routes.tsx global state
const getUserRole = (): 'student' | 'worker' | 'admin' => {
  // Access the global variable from routes.tsx
  return (window as any).__userRole || 'student';
};

export function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const userRole = getUserRole();

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

  return (
    <div className="size-full relative bg-gray-50">
      <main className="size-full">
        <Outlet />
      </main>
      <MessageNotificationBanner />

      {/* Gradient overlay for navigation */}
      <div className="fixed bottom-0 left-0 right-0 h-28 bg-gradient-to-t from-white via-white/80 to-transparent pointer-events-none z-40" />

      {/* Floating circular navigation */}
      <nav
        className="fixed bottom-3 left-1/2 z-50 flex max-w-[calc(100vw-1rem)] -translate-x-1/2 items-end gap-1 rounded-[2rem] border border-[#E8EAF7] bg-white px-2 py-2 sm:gap-1.5 sm:px-2.5"
        aria-label="Navegacion principal"
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
              className="group flex w-[3.75rem] flex-col items-center gap-1 outline-none"
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
                    ? 'border-[#4F46E5] bg-[#4F46E5] text-white shadow-[0_10px_18px_rgba(79,70,229,0.26)]'
                    : 'border-[#E8EAF7] bg-white text-[#6D5DD3] shadow-none group-hover:border-[#D7DBF5] group-hover:bg-white group-hover:text-[#4F46E5]'
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
                  isActive ? 'text-[#4F46E5]' : 'text-[#7C70C9] group-hover:text-[#4F46E5]'
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
