import { useEffect, useState, type ReactNode } from "react";
import { createBrowserRouter, Navigate } from "react-router";
import { AdminHome } from "./features/admin/AdminHome";
import { AdminLayout } from "./features/admin/AdminLayout";
import { AdminManagement } from "./features/admin/AdminManagement";
import { AdminManagePlaces } from "./features/admin/AdminManagePlaces";
import { AdminStats } from "./features/admin/AdminStats";
import { DelegateInviteView } from "./features/auth/DelegateInviteView";
import { LoginView } from "./features/auth/LoginView";
import { ProfileSetupView } from "./features/auth/ProfileSetupView";
import { RecoverPasswordView } from "./features/auth/RecoverPasswordView";
import { VerifyAccountView } from "./features/auth/VerifyAccountView";
import { ChatView } from "./features/chat/ChatView";
import { useCurrentUser } from "./context/CurrentUserContext";
import { DelegateHome } from "./features/delegado/DelegateHome";
import { DelegateLayout } from "./features/delegado/DelegateLayout";
import { DelegateMyPlaces } from "./features/delegado/DelegateMyPlaces";
import { DelegateReservations } from "./features/delegado/DelegateReservations";
import { DelegateReports } from "./features/delegado/DelegateReports";
import { DelegateSettings } from "./features/delegado/DelegateSettings";
import { DelegateStats } from "./features/delegado/DelegateStats";
import { DiscoverWrapper } from "./features/descubrir/DiscoverWrapper";
import { StudentsView } from "./features/encontrar-estudiantes/StudentsView";
import { CheckoutView } from "./features/mapa/CheckoutView";
import { MapView } from "./features/mapa/MapView";
import { PlaceDetails } from "./features/mapa/PlaceDetails";
import { EditProfileView } from "./features/perfil/EditProfileView";
import { ProfileWrapper } from "./features/perfil/ProfileWrapper";
import { Layout } from "./features/shared/Layout";
import { isSupabaseConfigured } from "./lib/supabase";
import { LegalDocumentPage } from "./features/auth/LegalDocumentPage";
import { clearAppCaches } from "./services/appCacheService";
import { getCurrentUserProfile } from "./services/currentUserService";
import {
  ensureAppUserRecord,
  getAppUserRecord,
  getCurrentSession,
  type RegisterResult,
  saveProfileSetup,
  signInWithEmail,
  signOut,
  signUpWithEmail,
} from "./services/authService";

type UserRole = "student" | "worker" | "admin" | "delegate";

let globalUserRole: UserRole = "student";

if (typeof window !== "undefined") {
  (window as any).__userRole = globalUserRole;
}

const setGlobalUserRole = (role: UserRole) => {
  globalUserRole = role;
  if (typeof window !== "undefined") {
    (window as any).__userRole = role;
  }
};

const logoutAndRedirect = async () => {
  try {
    if (isSupabaseConfigured) {
      await signOut();
    }
  } finally {
    await clearAppCaches();
    window.location.replace("/");
  }
};

function PrivateRoute({
  allowedRoles,
  children,
}: {
  allowedRoles?: UserRole[];
  children: ReactNode;
}) {
  const { clearCurrentUser, currentUser, isLoadingCurrentUser } = useCurrentUser();
  const [hasSession, setHasSession] = useState<boolean | null>(
    isSupabaseConfigured ? null : true,
  );

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setHasSession(true);
      return;
    }

    let isMounted = true;

    getCurrentSession()
      .then(async (session) => {
        if (!isMounted) return;

        if (!session?.user) {
          await clearAppCaches();
          clearCurrentUser();
          if (isMounted) setHasSession(false);
          return;
        }

        setHasSession(true);
      })
      .catch(async () => {
        await clearAppCaches();
        clearCurrentUser();
        if (isMounted) setHasSession(false);
      });

    return () => {
      isMounted = false;
    };
  }, [clearCurrentUser]);

  useEffect(() => {
    if (currentUser?.role) {
      setGlobalUserRole(currentUser.role);
    }
  }, [currentUser?.role]);

  if (!isSupabaseConfigured) return <>{children}</>;

  if (hasSession === false) {
    return <Navigate to="/" replace />;
  }

  if (hasSession === null || (isLoadingCurrentUser && !currentUser)) {
    return <div className="size-full grid place-items-center text-sm text-gray-600">Cargando sesion...</div>;
  }

  if (!currentUser) {
    return <Navigate to="/" replace />;
  }

  if ((currentUser.status && !["active", "verified"].includes(currentUser.status)) ||
      (currentUser.role === "delegate" && currentUser.delegateStatus !== "active")) {
    return <div className="min-h-dvh grid place-items-center p-6"><div className="max-w-md space-y-4 text-center">
      <h1 className="text-xl font-semibold">Acceso pendiente o suspendido</h1>
      <p>Tu cuenta no tiene acceso activo. Contacta al administrador para revisar su estado.</p>
      <button type="button" className="rounded-lg bg-indigo-600 px-5 py-3 text-white" onClick={() => void logoutAndRedirect()}>Cerrar sesion</button>
    </div></div>;
  }

  if (allowedRoles && !allowedRoles.includes(currentUser.role)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function AuthWrapper() {
  const { clearCurrentUser, refreshCurrentUser, setCurrentUser } = useCurrentUser();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<UserRole>("student");
  const [needsProfileSetup, setNeedsProfileSetup] = useState(false);
  const [userName, setUserName] = useState("");
  const [isInitializing, setIsInitializing] = useState(isSupabaseConfigured);

  const applyAuthenticatedUser = async (userId: string, fallbackName = "") => {
    const appUser = await getAppUserRecord(userId);
    const role = appUser?.role ?? "student";

    setIsAuthenticated(true);
    setUserRole(role);
    setGlobalUserRole(role);
    setUserName(appUser?.name ?? fallbackName);
    setNeedsProfileSetup(!appUser?.profile_completed && role !== "admin" && role !== "delegate");

    const profile = await getCurrentUserProfile({ forceRefresh: true });
    if (profile) {
      setCurrentUser(profile);
    }
  };

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    getCurrentSession()
      .then((session) => {
        if (!session?.user) {
          clearCurrentUser();
          return clearAppCaches();
        }
        return applyAuthenticatedUser(
          session.user.id,
          session.user.user_metadata.full_name ?? "",
        );
      })
      .catch((error) => {
        console.error("Error loading Supabase session:", error);
      })
      .finally(() => setIsInitializing(false));
  }, []);

  const handleDemoLogin = (email: string, password: string) => {
    if (email === "admin@pinwi.cl" && password === "admin123") {
      setIsAuthenticated(true);
      setUserRole("admin");
      setGlobalUserRole("admin");
      setNeedsProfileSetup(false);
    } else if (email === "delegado@demo.cl" && password === "delegado123") {
      setIsAuthenticated(true);
      setUserRole("delegate");
      setGlobalUserRole("delegate");
      setNeedsProfileSetup(false);
    } else if (email === "trabajador@demo.cl" && password === "trabajador123") {
      setIsAuthenticated(true);
      setUserRole("worker");
      setGlobalUserRole("worker");
      setNeedsProfileSetup(false);
    } else {
      setIsAuthenticated(true);
      setUserRole("student");
      setGlobalUserRole("student");
      setNeedsProfileSetup(false);
    }
  };

  const handleLogin = async (email: string, password: string) => {
    if (!isSupabaseConfigured) {
      handleDemoLogin(email, password);
      return;
    }

    const { user } = await signInWithEmail(email, password);

    if (!user) {
      throw new Error("No se pudo iniciar sesion.");
    }

    await clearAppCaches();

    if (!(await getAppUserRecord(user.id))) {
      await ensureAppUserRecord(user);
    }

    await applyAuthenticatedUser(user.id, user.user_metadata.full_name ?? "");
  };

  const handleRegister = async (
    name: string,
    email: string,
    phone: string,
    password: string,
  ): Promise<RegisterResult> => {
    if (!isSupabaseConfigured) {
      setIsAuthenticated(true);
      setUserName(name);
      setNeedsProfileSetup(true);
      return { email, needsEmailVerification: false };
    }

    const { user, session } = await signUpWithEmail({ name, email, phone, password });

    if (!user) {
      throw new Error("No se pudo crear la cuenta.");
    }

    if (!session) {
      return { email, needsEmailVerification: true };
    }

    await ensureAppUserRecord(user);

    await clearAppCaches();
    setIsAuthenticated(true);
    setUserName(name);
    setNeedsProfileSetup(true);
    await refreshCurrentUser();
    return { email, needsEmailVerification: false };
  };

  const handleProfileSetup = async (role: "student" | "worker", profileData: any) => {
    if (isSupabaseConfigured) {
      await saveProfileSetup({ role, profileData });
    }

    setUserRole(role);
    setGlobalUserRole(role);
    setNeedsProfileSetup(false);
    await refreshCurrentUser();
  };

  const handleLogout = async () => {
    try {
      if (isSupabaseConfigured) {
        await signOut();
      }
    } finally {
      await clearAppCaches();
      setIsAuthenticated(false);
      setUserRole("student");
      setGlobalUserRole("student");
      setNeedsProfileSetup(false);
      clearCurrentUser();
    }
  };

  if (isInitializing) {
    return <div className="size-full grid place-items-center text-sm text-gray-600">Cargando sesion...</div>;
  }

  if (!isAuthenticated) {
    return <LoginView onLogin={handleLogin} onRegister={handleRegister} />;
  }

  if (needsProfileSetup) {
    return <ProfileSetupView userName={userName} onComplete={handleProfileSetup} />;
  }

  if (userRole === "admin") {
    return <Navigate to="/admin" replace />;
  }

  if (userRole === "delegate") {
    return <Navigate to="/delegate" replace />;
  }

  return <Navigate to="/app/discover" replace />;
}

export const router = createBrowserRouter([
  {
    path: "/terminos",
    element: <LegalDocumentPage document="terms" />,
  },
  {
    path: "/privacidad",
    element: <LegalDocumentPage document="privacy" />,
  },
  {
    path: "/",
    Component: AuthWrapper,
  },
  {
    path: "/recover-password",
    Component: RecoverPasswordView,
  },
  {
    path: "/verify-account",
    Component: VerifyAccountView,
  },
  {
    path: "/delegate-invite",
    Component: DelegateInviteView,
  },
  {
    path: "/app",
    element: (
      <PrivateRoute allowedRoles={["student", "worker"]}>
        <Layout />
      </PrivateRoute>
    ),
    children: [
      { index: true, Component: MapView },
      { path: "profile", Component: ProfileWrapper },
      { path: "profile/edit", Component: EditProfileView },
      { path: "students", Component: StudentsView },
      { path: "discover", Component: DiscoverWrapper },
      { path: "chat/:userId?", Component: ChatView },
      { path: "place/:placeId", Component: PlaceDetails },
      { path: "workplace/:placeId", Component: PlaceDetails },
      { path: "checkout/:placeId", Component: CheckoutView },
    ],
  },
  {
    path: "/admin",
    element: (
      <PrivateRoute allowedRoles={["admin"]}>
        <AdminLayout onLogout={logoutAndRedirect} />
      </PrivateRoute>
    ),
    children: [
      { index: true, Component: AdminHome },
      { path: "places", Component: AdminManagePlaces },
      { path: "stats", Component: AdminStats },
      { path: "management", Component: AdminManagement },
      { path: "chat/:userId?", Component: ChatView },
    ],
  },
  {
    path: "/delegate",
    element: (
      <PrivateRoute allowedRoles={["delegate"]}>
        <DelegateLayout onLogout={logoutAndRedirect} />
      </PrivateRoute>
    ),
    children: [
      { index: true, Component: DelegateHome },
      { path: "places", Component: DelegateMyPlaces },
      { path: "reservations", Component: DelegateReservations },
      { path: "reports", Component: DelegateReports },
      { path: "chat/:userId?", Component: ChatView },
      { path: "stats", Component: DelegateStats },
      { path: "settings", Component: DelegateSettings },
    ],
  },
]);
