import { useEffect, useState } from "react";
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
import { clearStoredCurrentUser, useCurrentUser } from "./context/CurrentUserContext";
import { DelegateHome } from "./features/delegado/DelegateHome";
import { DelegateLayout } from "./features/delegado/DelegateLayout";
import { DelegateMyPlaces } from "./features/delegado/DelegateMyPlaces";
import { DelegateReservations } from "./features/delegado/DelegateReservations";
import { DelegateSettings } from "./features/delegado/DelegateSettings";
import { DiscoverWrapper } from "./features/descubrir/DiscoverWrapper";
import { StudentsView } from "./features/encontrar-estudiantes/StudentsView";
import { CheckoutView } from "./features/mapa/CheckoutView";
import { MapView } from "./features/mapa/MapView";
import { PlaceDetails } from "./features/mapa/PlaceDetails";
import { EditProfileView } from "./features/perfil/EditProfileView";
import { ProfileWrapper } from "./features/perfil/ProfileWrapper";
import { Layout } from "./features/shared/Layout";
import { isSupabaseConfigured } from "./lib/supabase";
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
  if (isSupabaseConfigured) {
    await signOut();
  }

  clearStoredCurrentUser();
  window.location.replace("/");
};

function AuthWrapper() {
  const { clearCurrentUser, currentUser, refreshCurrentUser, setCurrentUser } = useCurrentUser();
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

    if (currentUser?.id === userId) {
      return;
    }

    const profile = await getCurrentUserProfile();
    if (profile) {
      setCurrentUser(profile);
    }
  };

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    getCurrentSession()
      .then((session) => {
        if (!session?.user) return;
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
    if (email === "admin@nook.cl" && password === "admin123") {
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
    if (isSupabaseConfigured) {
      await signOut();
    }

    setIsAuthenticated(false);
    setUserRole("student");
    setGlobalUserRole("student");
    setNeedsProfileSetup(false);
    clearCurrentUser();
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
    element: <Layout />,
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
    element: <AdminLayout onLogout={logoutAndRedirect} />,
    children: [
      { index: true, Component: AdminHome },
      { path: "places", Component: AdminManagePlaces },
      { path: "stats", Component: AdminStats },
      { path: "management", Component: AdminManagement },
    ],
  },
  {
    path: "/delegate",
    element: <DelegateLayout onLogout={logoutAndRedirect} />,
    children: [
      { index: true, Component: DelegateHome },
      { path: "places", Component: DelegateMyPlaces },
      { path: "reservations", Component: DelegateReservations },
      { path: "settings", Component: DelegateSettings },
    ],
  },
]);
