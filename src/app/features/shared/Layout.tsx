import { Outlet, useLocation, useNavigate } from "react-router";
import { Map, User, Users, MessageCircle, Search } from "lucide-react";

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

      {/* Gradient overlay for navigation */}
      <div className="fixed bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white via-white/70 to-transparent pointer-events-none z-40" />

      {/* Floating circular navigation */}
      <nav className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3">
        {navItems.map(({ path, icon: Icon, label }) => {
          const isActive =
            (location.pathname === path) ||
            (path === "/app/discover" && location.pathname === "/app/discover") ||
            (path === "/app/chat" && location.pathname.startsWith("/app/chat"));

          return (
            <button
              key={path}
              className={`size-12 rounded-full flex items-center justify-center transition-all shadow-lg ${
                isActive
                  ? 'bg-[#4F46E5] text-white scale-105'
                  : 'bg-white text-gray-600 hover:bg-purple-50'
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
