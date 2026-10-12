import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { isSupabaseConfigured, supabase } from "../lib/supabase";
import { setAdminCacheAccount } from "../services/adminDataCache";
import { clearAppCaches } from "../services/appCacheService";
import {
  type CurrentUserProfile,
  getCurrentUserProfile,
} from "../services/currentUserService";

let currentUserMemoryCache: CurrentUserProfile | null = null;

interface CurrentUserContextValue {
  currentUser: CurrentUserProfile | null;
  isLoadingCurrentUser: boolean;
  onlineUserIds: Set<string>;
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
  const refreshGeneration = useRef(0);
  const activeAccountId = useRef(currentUserMemoryCache?.id ?? null);
  const [currentUser, setCurrentUserState] = useState<CurrentUserProfile | null>(() =>
    readStoredCurrentUser(),
  );
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(() => new Set());
  const [isLoadingCurrentUser, setIsLoadingCurrentUser] = useState(
    isSupabaseConfigured && !readStoredCurrentUser(),
  );

  const setCurrentUser = useCallback((user: CurrentUserProfile | null) => {
    setAdminCacheAccount(user?.id ?? null);
    setCurrentUserState(user);
    writeStoredCurrentUser(user);
  }, []);

  const clearCurrentUser = useCallback(() => {
    refreshGeneration.current += 1;
    setCurrentUser(null);
  }, [setCurrentUser]);

  const refreshCurrentUser = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setIsLoadingCurrentUser(false);
      return null;
    }

    const generation = ++refreshGeneration.current;
    setIsLoadingCurrentUser(true);

    try {
      const freshUser = await getCurrentUserProfile({ forceRefresh: true });
      if (generation !== refreshGeneration.current) return null;
      setCurrentUser(freshUser);
      return freshUser;
    } finally {
      if (generation === refreshGeneration.current) setIsLoadingCurrentUser(false);
    }
  }, [setCurrentUser]);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setIsLoadingCurrentUser(false);
      return;
    }

    void refreshCurrentUser().catch(() => clearCurrentUser());

    if (!supabase) return;

    let refreshTimer: ReturnType<typeof setTimeout> | undefined;
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        activeAccountId.current = null;
        clearTimeout(refreshTimer);
        clearCurrentUser();
        setIsLoadingCurrentUser(false);
        void clearAppCaches();
        return;
      }

      if (event === "SIGNED_IN" || event === "INITIAL_SESSION" || event === "USER_UPDATED") {
        const accountId = session?.user.id ?? null;
        if (event !== "USER_UPDATED" && activeAccountId.current === accountId) return;
        if (activeAccountId.current !== accountId) void clearAppCaches();
        activeAccountId.current = accountId;
        // Defer calls to Auth until its synchronous event callback releases its lock.
        clearCurrentUser();
        clearTimeout(refreshTimer);
        refreshTimer = setTimeout(() => { void refreshCurrentUser().catch(() => clearCurrentUser()); }, 0);
      }
    });

    return () => {
      clearTimeout(refreshTimer);
      refreshGeneration.current += 1;
      data.subscription.unsubscribe();
    };
  }, [clearCurrentUser, refreshCurrentUser]);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase || !currentUser?.id) {
      setOnlineUserIds(new Set());
      return;
    }

    const client = supabase;
    const channel = client.channel("online-users", {
      config: {
        private: true,
        presence: {
          key: currentUser.id,
        },
      },
    });

    channel.on("presence", { event: "sync" }, () => {
      setOnlineUserIds(new Set(Object.keys(channel.presenceState())));
    });

    channel.subscribe(async (status) => {
      if (status !== "SUBSCRIBED") return;

      await channel.track({
        user_id: currentUser.id,
      });
    });

    return () => {
      client.removeChannel(channel);
      setOnlineUserIds(new Set());
    };
  }, [currentUser?.id]);

  const value = useMemo(
    () => ({
      currentUser,
      isLoadingCurrentUser,
      onlineUserIds,
      refreshCurrentUser,
      setCurrentUser,
      clearCurrentUser,
    }),
    [
      clearCurrentUser,
      currentUser,
      isLoadingCurrentUser,
      onlineUserIds,
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
