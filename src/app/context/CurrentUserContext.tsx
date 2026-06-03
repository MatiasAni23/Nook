import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { isSupabaseConfigured, supabase } from "../lib/supabase";
import {
  type CurrentUserProfile,
  getCurrentUserProfile,
} from "../services/currentUserService";

let currentUserMemoryCache: CurrentUserProfile | null = null;

interface CurrentUserContextValue {
  currentUser: CurrentUserProfile | null;
  isLoadingCurrentUser: boolean;
  refreshCurrentUser: () => Promise<CurrentUserProfile | null>;
  setCurrentUser: (user: CurrentUserProfile | null) => void;
  clearCurrentUser: () => void;
}

const CurrentUserContext = createContext<CurrentUserContextValue | null>(null);

function readStoredCurrentUser() {
  return currentUserMemoryCache;
}

function writeStoredCurrentUser(user: CurrentUserProfile | null) {
  currentUserMemoryCache = user;
}

export function clearStoredCurrentUser() {
  writeStoredCurrentUser(null);
}

export function CurrentUserProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUserState] = useState<CurrentUserProfile | null>(() =>
    readStoredCurrentUser(),
  );
  const [isLoadingCurrentUser, setIsLoadingCurrentUser] = useState(
    isSupabaseConfigured && !readStoredCurrentUser(),
  );

  const setCurrentUser = useCallback((user: CurrentUserProfile | null) => {
    setCurrentUserState(user);
    writeStoredCurrentUser(user);
  }, []);

  const clearCurrentUser = useCallback(() => {
    setCurrentUser(null);
  }, [setCurrentUser]);

  const refreshCurrentUser = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setIsLoadingCurrentUser(false);
      return null;
    }

    setIsLoadingCurrentUser(true);

    try {
      const freshUser = await getCurrentUserProfile();
      setCurrentUser(freshUser);
      return freshUser;
    } finally {
      setIsLoadingCurrentUser(false);
    }
  }, [setCurrentUser]);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setIsLoadingCurrentUser(false);
      return;
    }

    refreshCurrentUser();

    if (!supabase) return;

    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        clearCurrentUser();
        return;
      }

      if (event === "SIGNED_IN" || event === "USER_UPDATED") {
        refreshCurrentUser();
      }
    });

    return () => {
      data.subscription.unsubscribe();
    };
  }, [clearCurrentUser, refreshCurrentUser]);

  const value = useMemo(
    () => ({
      currentUser,
      isLoadingCurrentUser,
      refreshCurrentUser,
      setCurrentUser,
      clearCurrentUser,
    }),
    [
      clearCurrentUser,
      currentUser,
      isLoadingCurrentUser,
      refreshCurrentUser,
      setCurrentUser,
    ],
  );

  return <CurrentUserContext.Provider value={value}>{children}</CurrentUserContext.Provider>;
}

export function useCurrentUser() {
  const context = useContext(CurrentUserContext);

  if (!context) {
    throw new Error("useCurrentUser debe usarse dentro de CurrentUserProvider.");
  }

  return context;
}
