import { clearStoredCurrentUser } from "../context/CurrentUserContext";
import { clearCachedImages } from "../components/ui/cached-image";
import { clearChatServiceCaches } from "./chatService";
import { clearCurrentUserServiceCaches } from "./currentUserService";
import { clearPlacesCache } from "./placeService";

function clearNookSessionStorage() {
  if (typeof window === "undefined") return;

  Object.keys(window.sessionStorage)
    .filter((key) => key.startsWith("nook-"))
    .forEach((key) => window.sessionStorage.removeItem(key));
}

export async function clearAppCaches() {
  clearStoredCurrentUser();
  clearCurrentUserServiceCaches();
  clearChatServiceCaches();
  clearPlacesCache();
  clearNookSessionStorage();
  await clearCachedImages();
}
