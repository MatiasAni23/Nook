import { clearStoredCurrentUser } from "../context/CurrentUserContext";
import { clearCachedImages } from "../components/ui/cached-image";
import { clearAdminManagementCache } from "./adminManagementService";
import { clearChatServiceCaches } from "./chatService";
import { clearCurrentUserServiceCaches } from "./currentUserService";
import { clearDelegateServiceCache } from "./delegateService";
import { clearPlacesCache } from "./placeService";
import { clearDemoSession } from "./demoSessionService";
import { clearAuthAttemptState } from "./authAttemptService";

function clearPinwiSessionStorage() {
  if (typeof window === "undefined") return;

  Object.keys(window.sessionStorage)
    .filter((key) => key.startsWith("pinwi-"))
    .forEach((key) => window.sessionStorage.removeItem(key));
}

export async function clearAppCaches() {
  clearAuthAttemptState();
  clearDemoSession();
  clearStoredCurrentUser();
  clearAdminManagementCache();
  clearCurrentUserServiceCaches();
  clearChatServiceCaches();
  clearDelegateServiceCache();
  clearPlacesCache();
  clearPinwiSessionStorage();
  await clearCachedImages();
}
