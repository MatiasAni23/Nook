import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import {
  ArrowRight,
  BookOpen,
  BriefcaseBusiness,
  Building2,
  ChevronRight,
  Compass,
  GraduationCap,
  Heart,
  LockKeyhole,
  LogOut,
  MapPin,
  Pencil,
  ShieldCheck,
  Star,
  Wifi,
} from "lucide-react";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "../../components/ui/avatar";
import { CachedImage } from "../../components/ui/cached-image";
import { Skeleton } from "../../components/ui/skeleton";
import { useCurrentUser } from "../../context/CurrentUserContext";
import {
  currentUser as demoStudent,
  currentWorker as demoWorker,
} from "../../data/mockData";
import { isSupabaseConfigured } from "../../lib/supabase";
import { clearAppCaches } from "../../services/appCacheService";
import { signOut } from "../../services/authService";
import {
  type FavoritePlace,
  getCachedCurrentUserFavoritePlaces,
  getCurrentUserFavoritePlaces,
  getInitials,
} from "../../services/currentUserService";
import { getDetailNavigationState } from "../mapa/navigationState";
import { ProfileSkeleton } from "./ProfileSkeleton";
import "./profile.css";

const card =
  "rounded-3xl border border-[#E9EAF2] bg-white shadow-[0_4px_20px_rgba(30,27,75,0.025)]";

function FavoritePlaceCard({ place }: { place: FavoritePlace }) {
  const navigate = useNavigate();
  const path = place.category === "work" ? "workplace" : "place";
  const price = place.price_per_hour;

  return (
    <button
      type="button"
      onClick={() =>
        navigate(`/app/${path}/${place.id}`, {
          state: getDetailNavigationState("/app/profile"),
        })
      }
      className="profile-favorite group flex w-full min-w-0 items-center gap-3 rounded-2xl border border-[#E9EAF2] p-3 text-left transition hover:border-[#C7D2FE] hover:bg-[#FAFAFF]"
    >
      <div className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-xl bg-[#F0EFFB] text-[#8B83C8]">
        {place.images?.[0] ? (
          <CachedImage
            src={place.images[0]}
            alt=""
            className="size-full object-cover"
          />
        ) : (
          <Building2 className="size-7" strokeWidth={1.5} aria-hidden="true" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-[#25233B]">
          {place.name}
        </h3>
        <p className="mt-1 truncate text-xs text-gray-500">
          {place.zone || place.address || "Ver ubicación"}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          {place.rating > 0 && (
            <span className="inline-flex items-center gap-1 text-gray-600">
              <Star
                className="size-3 fill-amber-400 text-amber-400"
                aria-hidden="true"
              />
              {place.rating}
            </span>
          )}
          {place.wifi && (
            <span className="inline-flex items-center gap-1 text-gray-500">
              <Wifi className="size-3" aria-hidden="true" />
              WiFi
            </span>
          )}
          <span className="font-medium text-[#4F46E5]">
            {price != null && price > 0
              ? `${new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(price)}/h`
              : "Gratis"}
          </span>
        </div>
      </div>
      <ChevronRight
        className="size-4 shrink-0 text-gray-400 transition group-hover:text-[#4F46E5]"
        aria-hidden="true"
      />
    </button>
  );
}

export function ProfilePage({ mode }: { mode: "student" | "worker" }) {
  const { currentUser, isLoadingCurrentUser, clearCurrentUser } =
    useCurrentUser();
  const [favorites, setFavorites] = useState<FavoritePlace[]>([]);
  const [isLoadingFavorites, setIsLoadingFavorites] =
    useState(isSupabaseConfigured);
  const [favoritesError, setFavoritesError] = useState("");
  const [retry, setRetry] = useState(0);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  const isStudent = mode === "student";
  const category = isStudent ? "study" : "work";

  useEffect(() => {
    let cancelled = false;
    setFavorites([]);
    setFavoritesError("");
    if (!isSupabaseConfigured || !currentUser?.id) {
      setIsLoadingFavorites(false);
      return;
    }
    const cached = getCachedCurrentUserFavoritePlaces(currentUser.id, category);
    if (cached) {
      setFavorites(cached);
      setIsLoadingFavorites(false);
      return;
    }
    setIsLoadingFavorites(true);
    getCurrentUserFavoritePlaces(category)
      .then((places) => {
        if (!cancelled) setFavorites(places);
      })
      .catch(() => {
        if (!cancelled)
          setFavoritesError(
            "No pudimos cargar tus favoritos. Inténtalo de nuevo.",
          );
      })
      .finally(() => {
        if (!cancelled) setIsLoadingFavorites(false);
      });
    return () => {
      cancelled = true;
    };
  }, [currentUser?.id, category, retry]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    setLogoutError("");
    try {
      if (isSupabaseConfigured) await signOut();
      await clearAppCaches();
      clearCurrentUser();
      window.location.replace("/");
    } catch {
      setLogoutError("No pudimos cerrar tu sesión. Inténtalo de nuevo.");
      setIsLoggingOut(false);
    }
  };

  if (isLoadingCurrentUser && !currentUser) return <ProfileSkeleton />;

  // Demo identity is only used when the app has no Supabase connection.
  const demo = !isSupabaseConfigured
    ? isStudent
      ? demoStudent
      : demoWorker
    : null;
  const profile = currentUser?.profile;
  const name = currentUser?.name || demo?.name || "Tu perfil";
  const avatar = profile?.profile_image_url || demo?.avatar;
  const bio = profile?.bio || demo?.bio;
  const career =
    profile?.career ||
    (!isSupabaseConfigured && isStudent ? demoStudent.career : "");
  const institution =
    profile?.institutions?.name ||
    profile?.university ||
    (!isSupabaseConfigured && isStudent ? demoStudent.university : "");
  const subjects =
    profile?.subjects ??
    (!isSupabaseConfigured && isStudent ? demoStudent.subjects : []);
  const independent = Boolean(profile?.is_independent);
  const position =
    profile?.position ||
    (!isSupabaseConfigured && !isStudent ? demoWorker.position : "");
  const company =
    profile?.company ||
    (!isSupabaseConfigured && !isStudent ? demoWorker.company : "");
  const location = [profile?.cities?.name, profile?.regions?.name]
    .filter(Boolean)
    .join(", ");
  const visible = Boolean(profile?.study_profile_visible);
  const details = isStudent
    ? [
        { icon: GraduationCap, label: "Carrera", value: career },
        { icon: Building2, label: "Institución", value: institution },
        { icon: MapPin, label: "Ubicación · Solo tú", value: location },
      ]
    : [
        {
          icon: BriefcaseBusiness,
          label: "Ocupación",
          value: independent ? "Trabajo independiente" : position,
        },
        {
          icon: Building2,
          label: independent ? "Rubro" : "Empresa",
          value: independent ? profile?.industry : company,
        },
      ];

  return (
    <div className="profile-page size-full overflow-y-auto bg-[#F8F9FC] text-[#25233B]">
      <div className="mx-auto max-w-5xl px-4 pb-32 pt-7 sm:px-8 sm:pt-10">
        <header className="mb-6 flex items-center justify-between gap-3 sm:mb-8">
          <div>
            <p className="mb-1 text-xs font-semibold tracking-[0.16em] text-[#736F88] uppercase">
              Tu espacio en Pinwi
            </p>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Mi perfil
            </h1>
          </div>
          <span className="hidden items-center gap-1.5 rounded-full border border-[#E9EAF2] bg-white px-3 py-2 text-xs text-gray-500 sm:inline-flex">
            <LockKeyhole className="size-3.5" aria-hidden="true" />
            Tu cuenta
          </span>
        </header>

        <section
          className={`${card} overflow-hidden`}
          aria-labelledby="profile-name"
        >
          <div
            className="h-20 border-b border-[#EBE9FA] bg-[#EFEEFC] sm:h-24"
            aria-hidden="true"
          />
          <div className="px-5 pb-6 sm:px-8 sm:pb-8">
            <div className="-mt-10 mb-4 flex items-end justify-between gap-3 sm:-mt-12 sm:mb-5">
              <Avatar className="size-24 shrink-0 border-[5px] border-white bg-white shadow-sm sm:size-28">
                {avatar && (
                  <AvatarImage
                    src={avatar}
                    alt={name}
                    className="object-cover"
                  />
                )}
                <AvatarFallback className="bg-[#E3E0FA] text-3xl font-semibold text-[#4F46E5]">
                  {getInitials(name)}
                </AvatarFallback>
              </Avatar>
              <Link
                to="/app/profile/edit"
                className="profile-primary inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#4F46E5] px-4 text-sm font-semibold text-white transition hover:bg-[#4338CA] sm:px-5"
              >
                <Pencil className="size-4" aria-hidden="true" />
                Editar perfil
              </Link>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F2F1FC] px-2.5 py-1 text-xs font-medium text-[#655CC2]">
              {isStudent ? (
                <GraduationCap className="size-3.5" aria-hidden="true" />
              ) : (
                <BriefcaseBusiness className="size-3.5" aria-hidden="true" />
              )}
              {isStudent
                ? "Estudiante"
                : independent
                  ? "Independiente"
                  : "Profesional"}
            </span>
            <h2
              id="profile-name"
              className="mt-2 break-words text-2xl font-bold tracking-tight sm:text-3xl"
            >
              {name}
            </h2>
            {bio ? (
              <p className="mt-2 max-w-2xl whitespace-pre-line break-words text-sm leading-relaxed text-[#6F6C80]">
                {bio}
              </p>
            ) : (
              <Link
                to="/app/profile/edit#profile-bio"
                className="mt-2 inline-block text-sm text-[#736F88] hover:text-[#4F46E5]"
              >
                Agrega una bio y cuéntanos un poco de ti{" "}
                <ArrowRight
                  className="ml-1 inline size-3.5"
                  aria-hidden="true"
                />
              </Link>
            )}
            <dl
              className={`mt-6 grid gap-4 border-t border-[#F0F0F5] pt-5 ${isStudent ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}
            >
              {details.map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex min-w-0 items-start gap-2.5">
                  <Icon
                    className="mt-0.5 size-4 shrink-0 text-[#9188BD]"
                    strokeWidth={1.8}
                    aria-hidden="true"
                  />
                  <div className="min-w-0">
                    <dt className="text-xs text-[#736F88]">{label}</dt>
                    <dd className="mt-1 break-words text-sm font-medium">
                      {value || (
                        <Link
                          to="/app/profile/edit"
                          className="font-normal text-[#736F88] underline decoration-[#DCD9EB] underline-offset-4"
                        >
                          Agregar información
                        </Link>
                      )}
                    </dd>
                  </div>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <div className="mt-5 grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="min-w-0 space-y-5">
            {isStudent && (
              <section
                className={`${card} p-5 sm:p-6`}
                aria-labelledby="subjects-title"
              >
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h2
                    id="subjects-title"
                    className="flex items-center gap-2 text-base font-semibold"
                  >
                    <BookOpen
                      className="size-4 text-[#8176B9]"
                      aria-hidden="true"
                    />
                    Mis materias
                  </h2>
                  <Link
                    to="/app/profile/edit#profile-subjects"
                    className="profile-text-link text-xs font-medium text-[#4F46E5]"
                  >
                    Editar<span className="sr-only"> materias</span>
                  </Link>
                </div>
                {subjects.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {subjects.map((subject) => (
                      <span
                        key={subject}
                        className="max-w-full break-words rounded-lg border border-[#E7E3F7] bg-[#F7F5FD] px-3 py-1.5 text-sm text-[#6A609A]"
                      >
                        {subject}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm leading-relaxed text-[#736F88]">
                    Agrega tus materias para encontrar compañeros con intereses
                    en común.
                  </p>
                )}
              </section>
            )}

            <section
              className={`${card} p-5 sm:p-6`}
              aria-labelledby="favorites-title"
              aria-busy={isLoadingFavorites}
            >
              <div className="mb-1 flex items-center gap-2">
                <Heart className="size-4 text-[#8176B9]" aria-hidden="true" />
                <h2 id="favorites-title" className="text-base font-semibold">
                  Mis favoritos
                </h2>
                {!isLoadingFavorites && !favoritesError && (
                  <span className="ml-auto rounded-full bg-[#F2F1FC] px-2.5 py-0.5 text-xs font-medium text-[#655CC2]">
                    {favorites.length}
                  </span>
                )}
              </div>
              <p className="mb-5 text-xs leading-relaxed text-[#736F88]">
                Esos lugares a los que quieres volver.
              </p>
              {isLoadingFavorites ? (
                <div className="space-y-3" role="status">
                  <span className="sr-only">Cargando favoritos</span>
                  {[0, 1].map((i) => (
                    <Skeleton key={i} className="h-26 w-full rounded-2xl" />
                  ))}
                </div>
              ) : favoritesError ? (
                <div
                  role="alert"
                  className="rounded-2xl bg-gray-50 p-5 text-sm text-gray-600"
                >
                  <p>{favoritesError}</p>
                  <button
                    type="button"
                    onClick={() => setRetry((value) => value + 1)}
                    className="profile-text-link mt-3 font-medium text-[#4F46E5]"
                  >
                    Reintentar
                  </button>
                </div>
              ) : favorites.length > 0 ? (
                <div className="grid gap-3 xl:grid-cols-2">
                  {favorites.map((place) => (
                    <FavoritePlaceCard key={place.id} place={place} />
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-[#E5E1F1] bg-[#FCFBFE] px-5 py-8 text-center">
                  <span className="mx-auto grid size-12 place-items-center rounded-2xl border border-[#EBE7F6] bg-white text-[#8C80B8]">
                    <Heart
                      className="size-5"
                      strokeWidth={1.5}
                      aria-hidden="true"
                    />
                  </span>
                  <h3 className="mt-3 text-sm font-semibold">
                    Tu próximo favorito te espera
                  </h3>
                  <p className="mx-auto mt-1.5 max-w-64 text-xs leading-relaxed text-[#736F88]">
                    Guarda los espacios que te gusten tocando el corazón. Los
                    encontrarás aquí.
                  </p>
                  <Link
                    to="/app/discover"
                    className="profile-text-link mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#E4DFF4] bg-white px-4 text-sm font-medium text-[#4F46E5]"
                  >
                    <Compass className="size-4" aria-hidden="true" />
                    Descubrir espacios
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </Link>
                </div>
              )}
            </section>
          </div>

          <aside className="min-w-0 space-y-5">
            <section
              className={`${card} p-5 sm:p-6`}
              aria-labelledby="privacy-title"
            >
              <span className="mb-4 grid size-10 place-items-center rounded-xl bg-[#F2F1FC] text-[#8176B9]">
                <ShieldCheck
                  className="size-5"
                  strokeWidth={1.6}
                  aria-hidden="true"
                />
              </span>
              <h2 id="privacy-title" className="text-base font-semibold">
                Tu perfil, a tu manera
              </h2>
              <p className="mt-2 text-xs leading-relaxed text-[#736F88]">
                {isStudent
                  ? "Tú decides si apareces en la búsqueda de estudiantes de Pinwi."
                  : "Mantén tus datos al día y conoce cómo cuidamos tu información."}
              </p>
              {isStudent && (
                <p className="mt-4 flex items-center gap-2 text-xs font-medium text-[#655C84]">
                  <span
                    className={`size-1.5 shrink-0 rounded-full ${visible ? "bg-[#6B9E87]" : "bg-[#ADA7C2]"}`}
                    aria-hidden="true"
                  />
                  {visible
                    ? "Visible para otros estudiantes"
                    : "Fuera de la búsqueda de estudiantes"}
                </p>
              )}
              <Link
                to={
                  isStudent
                    ? "/app/profile/edit#profile-privacy"
                    : "/privacidad"
                }
                className="profile-text-link mt-5 inline-flex min-h-8 items-center gap-2 text-sm font-medium text-[#4F46E5]"
              >
                {isStudent ? "Gestionar visibilidad" : "Ver privacidad"}
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </section>
            <section
              className={`${card} overflow-hidden`}
              aria-labelledby="account-title"
            >
              <h2
                id="account-title"
                className="px-5 pb-2 pt-5 text-base font-semibold sm:px-6"
              >
                Mi cuenta
              </h2>
              <div className="px-2 pb-2 sm:px-3">
                <Link to="/terminos" className="profile-account-link">
                  Términos y condiciones
                  <ChevronRight
                    className="size-4 text-gray-400"
                    aria-hidden="true"
                  />
                </Link>
                <Link to="/privacidad" className="profile-account-link">
                  Política de privacidad
                  <ChevronRight
                    className="size-4 text-gray-400"
                    aria-hidden="true"
                  />
                </Link>
                <div className="mx-3 my-1 border-t border-[#F0F0F5]" />
                <button
                  type="button"
                  onClick={() => {
                    void handleLogout();
                  }}
                  disabled={isLoggingOut}
                  className="profile-account-link profile-logout w-full text-left disabled:opacity-50"
                >
                  <LogOut
                    className="size-4 text-[#B16C79]"
                    aria-hidden="true"
                  />
                  {isLoggingOut ? "Cerrando sesión…" : "Cerrar sesión"}
                </button>
              </div>
              {logoutError && (
                <p role="alert" className="px-5 pb-4 text-xs text-red-700">
                  {logoutError}
                </p>
              )}
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
