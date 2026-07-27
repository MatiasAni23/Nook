import { clearStoredCurrentUser } from "../context/CurrentUserContext";
import { clearCachedImages } from "../components/ui/cached-image";
import { clearAdminManagementCache } from "./adminManagementService";
import { clearChatServiceCaches } from "./chatService";
import { clearCurrentUserServiceCaches } from "./currentUserService";
import { clearDelegateServiceCache } from "./delegateService";
import { clearPlacesCache } from "./placeService";

function clearNookSessionStorage() {
  if (typeof window === "undefined") return;

  Object.keys(window.sessionStorage)
    .filter((key) => key.startsWith("nook-"))
    .forEach((key) => window.sessionStorage.removeItem(key));
}

export async function clearAppCaches() {
  clearStoredCurrentUser();
  clearAdminManagementCache();
  clearCurrentUserServiceCaches();
  clearChatServiceCaches();
  clearDelegateServiceCache();
  clearPlacesCache();
  clearNookSessionStorage();
  await clearCachedImages();
}
