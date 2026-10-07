import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { ArrowLeft, Camera, Plus, Save, ShieldCheck, X } from "lucide-react";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "../../components/ui/avatar";
import { Badge } from "../../components/ui/badge";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { isSupabaseConfigured } from "../../lib/supabase";
import {
  type CityOption,
  getCitiesByRegion,
  getInstitutions,
  getRegions,
  type InstitutionOption,
  type RegionOption,
} from "../../services/catalogService";
import {
  getInitials,
  updateCurrentUserProfile,
  updateStudyProfileVisibility,
  uploadCurrentUserProfileImage,
} from "../../services/currentUserService";
import { useCurrentUser } from "../../context/CurrentUserContext";
import "./profile.css";

export function EditProfileView() {
  const navigate = useNavigate();
  const { hash } = useLocation();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const loadedProfileId = useRef<string | null>(null);
  const { currentUser, refreshCurrentUser } = useCurrentUser();
  const isStudent = currentUser?.role !== "worker";

  const [name, setName] = useState(currentUser?.name ?? "");
  const [avatarUrl, setAvatarUrl] = useState(
    currentUser?.profile?.profile_image_url ?? "",
  );
  const [bio, setBio] = useState(currentUser?.profile?.bio ?? "");
  const [career, setCareer] = useState(currentUser?.profile?.career ?? "");
  const [regionId, setRegionId] = useState(
    currentUser?.profile?.region_id ?? "",
  );
  const [cityId, setCityId] = useState(currentUser?.profile?.city_id ?? "");
  const [institutionId, setInstitutionId] = useState(
    currentUser?.profile?.institution_id ?? "",
  );
  const [subjects, setSubjects] = useState<string[]>(
    currentUser?.profile?.subjects ?? [],
  );
  const [newSubject, setNewSubject] = useState("");
  const [company, setCompany] = useState(currentUser?.profile?.company ?? "");
  const [position, setPosition] = useState(
    currentUser?.profile?.position ?? "",
  );
  const [industry, setIndustry] = useState(
    currentUser?.profile?.industry ?? "",
  );
  const [isIndependent, setIsIndependent] = useState(
    Boolean(currentUser?.profile?.is_independent),
  );
  const [regions, setRegions] = useState<RegionOption[]>([]);
  const [cities, setCities] = useState<CityOption[]>([]);
  const [institutions, setInstitutions] = useState<InstitutionOption[]>([]);
  const [isLoadingCatalogs, setIsLoadingCatalogs] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [studyProfileVisible, setStudyProfileVisible] = useState(false);
  const [isSavingVisibility, setIsSavingVisibility] = useState(false);

  const selectedInstitution = useMemo(
    () => institutions.find((institution) => institution.id === institutionId),
    [institutionId, institutions],
  );
  const hasSelectedRegion = regions.some((region) => region.id === regionId);
  const hasSelectedCity = cities.some((city) => city.id === cityId);
  const hasSelectedInstitution = institutions.some(
    (institution) => institution.id === institutionId,
  );
  const currentRegionName = currentUser?.profile?.regions?.name ?? "";
  const currentCityName = currentUser?.profile?.cities?.name ?? "";
  const currentInstitutionName = currentUser?.profile?.institutions?.name ?? "";
  const currentInstitutionType = currentUser?.profile?.institutions?.type ?? "";

  useEffect(() => {
    if (!hash) return;
    const target = document.getElementById(hash.slice(1));
    (target?.closest("section") ?? target)?.scrollIntoView({ block: "start" });
  }, [hash, isStudent]);

  useEffect(() => {
    if (!currentUser || loadedProfileId.current === currentUser.id) return;
    loadedProfileId.current = currentUser.id;

    setName(currentUser.name);
    setAvatarUrl(currentUser.profile?.profile_image_url ?? "");
    setBio(currentUser.profile?.bio ?? "");
    setStudyProfileVisible(currentUser.profile?.study_profile_visible ?? false);
    setCareer(currentUser.profile?.career ?? "");
    setRegionId(currentUser.profile?.region_id ?? "");
    setCityId(currentUser.profile?.city_id ?? "");
    setInstitutionId(currentUser.profile?.institution_id ?? "");
    setSubjects(currentUser.profile?.subjects ?? []);
    setCompany(currentUser.profile?.company ?? "");
    setPosition(currentUser.profile?.position ?? "");
    setIndustry(currentUser.profile?.industry ?? "");
    setIsIndependent(Boolean(currentUser.profile?.is_independent));
  }, [currentUser]);

  useEffect(() => {
    if (!isStudent || !isSupabaseConfigured) return;

    setIsLoadingCatalogs(true);
    setErrorMessage("");

    Promise.all([getRegions(), getInstitutions(cityId || undefined)])
      .then(([regionOptions, institutionOptions]) => {
        setRegions(regionOptions);
        setInstitutions(institutionOptions);
      })
      .catch((error) => {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "No se pudieron cargar los catalogos.",
        );
      })
      .finally(() => setIsLoadingCatalogs(false));
  }, [cityId, isStudent]);

  useEffect(() => {
    if (!isStudent || !regionId || !isSupabaseConfigured) {
      setCities([]);
      return;
    }

    getCitiesByRegion(regionId)
      .then(setCities)
      .catch((error) => {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "No se pudieron cargar las comunas.",
        );
      });
  }, [isStudent, regionId]);

  const addSubject = () => {
    const subject = newSubject.trim();

    if (!subject || subjects.includes(subject)) return;

    setSubjects([...subjects, subject]);
    setNewSubject("");
  };

  const removeSubject = (subject: string) => {
    setSubjects(subjects.filter((item) => item !== subject));
  };

  const handleAvatarChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setErrorMessage("Selecciona un archivo de imagen valido.");
      return;
    }

    setIsUploadingAvatar(true);
    setErrorMessage("");

    try {
      const imageUrl = await uploadCurrentUserProfileImage(file);
      setAvatarUrl(imageUrl);
      await refreshCurrentUser();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "No se pudo subir la foto de perfil.",
      );
    } finally {
      setIsUploadingAvatar(false);
      event.target.value = "";
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setErrorMessage("");

    try {
      if (!name.trim()) {
        throw new Error("Ingresa tu nombre.");
      }

      if (isStudent && (!career.trim() || !regionId || !institutionId)) {
        throw new Error("Completa nombre, carrera, región e institución.");
      }

      if (
        !isStudent &&
        !isIndependent &&
        (!position.trim() || !company.trim())
      ) {
        throw new Error("Completa tu cargo y empresa.");
      }

      await updateCurrentUserProfile({
        name: name.trim(),
        role: isStudent ? "student" : "worker",
        profileData: isStudent
          ? {
              career,
              regionId,
              cityId: cityId || null,
              institutionId,
              university: selectedInstitution?.name ?? currentInstitutionName,
              subjects,
              bio,
              profileImageUrl: avatarUrl,
              studyProfileVisible,
            }
          : {
              company: isIndependent ? null : company,
              position: isIndependent ? null : position,
              isIndependent,
              industry,
              bio,
              profileImageUrl: avatarUrl,
            },
      });

      await refreshCurrentUser();
      navigate("/app/profile");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "No se pudo guardar el perfil.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleVisibilityChange = async (visible: boolean) => {
    setIsSavingVisibility(true);
    setErrorMessage("");
    try {
      await updateStudyProfileVisibility(visible);
      setStudyProfileVisible(visible);
      await refreshCurrentUser();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "No se pudo cambiar la visibilidad.",
      );
    } finally {
      setIsSavingVisibility(false);
    }
  };

  return (
    <div className="profile-page profile-edit size-full overflow-y-auto bg-[#F8F9FC] text-[#25233B]">
      <div className="pb-32">
        <div className="sticky top-0 z-10 border-b border-[#E9EAF2] bg-white/95 backdrop-blur-md">
          <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 py-3 sm:px-8 sm:py-4">
            <button
              type="button"
              onClick={() => navigate("/app/profile")}
              className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-[#E9EAF2] text-[#736F88] transition hover:bg-[#F7F6FC]"
              aria-label="Volver al perfil"
            >
              <ArrowLeft className="size-5" />
            </button>
            <h1 className="text-base font-semibold sm:text-lg">
              Editar perfil
            </h1>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving || isUploadingAvatar || isSavingVisibility}
              className="flex min-h-11 items-center gap-2 rounded-xl bg-[#4F46E5] px-4 text-sm font-semibold text-white transition hover:bg-[#4338CA] disabled:opacity-60"
            >
              <Save className="size-4" />
              {isSaving ? "Guardando…" : "Guardar"}
            </button>
          </div>
        </div>

        <div className="mx-auto max-w-4xl space-y-5 px-4 py-6 sm:px-8 sm:py-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold tracking-tight">
              Un perfil que se sienta tuyo
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-[#736F88]">
              Actualiza tu información y elige qué quieres compartir.
            </p>
          </div>
          <section className="bg-white px-4 py-5 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Avatar className="size-20 border-4 border-white shadow-sm sm:size-24">
                  {avatarUrl && (
                    <AvatarImage
                      src={avatarUrl}
                      alt={name}
                      className="object-cover"
                    />
                  )}
                  <AvatarFallback className="bg-[#E3E0FA] text-2xl font-semibold text-[#4F46E5]">
                    {getInitials(name)}
                  </AvatarFallback>
                </Avatar>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingAvatar}
                  className="absolute bottom-0 right-0 flex size-9 items-center justify-center rounded-full bg-[#4F46E5] text-white shadow-md"
                  aria-label="Cambiar foto de perfil"
                >
                  <Camera className="size-4" />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-base font-semibold">Tu foto de perfil</h2>
                <p className="mt-1 text-xs leading-relaxed text-[#736F88]">
                  Dale una cara a tu perfil para que puedan reconocerte.
                </p>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingAvatar}
                  className="mt-2 min-h-9 text-sm font-medium text-[#4F46E5] disabled:opacity-60"
                >
                  {avatarUrl ? "Cambiar foto" : "Subir una foto"}
                </button>
                {isUploadingAvatar && (
                  <p className="mt-1 text-xs text-gray-500">Subiendo foto...</p>
                )}
              </div>
            </div>
          </section>

          {errorMessage && (
            <div
              role="alert"
              className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {errorMessage}
            </div>
          )}

          <section className="space-y-4 bg-white px-4 py-5 shadow-sm">
            <div>
              <h2 className="text-base font-semibold">Sobre ti</h2>
              <p className="mt-1 text-xs text-[#736F88]">
                Lo esencial para presentarte a la comunidad.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-name">Nombre completo</Label>
              <Input
                id="profile-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Tu nombre"
                className="h-11 bg-gray-50"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="profile-bio">Bio</Label>
              <Textarea
                id="profile-bio"
                value={bio}
                onChange={(event) => setBio(event.target.value)}
                placeholder="Cuéntanos qué estudias, en qué trabajas o qué te inspira…"
                className="min-h-24 bg-gray-50"
              />
            </div>
          </section>

          {isStudent ? (
            <section className="grid gap-5 bg-white sm:grid-cols-2">
              <div className="sm:col-span-2">
                <h2 className="text-base font-semibold">Tu vida académica</h2>
                <p className="mt-1 text-xs text-[#736F88]">
                  Tu carrera, institución y ubicación de estudio.
                </p>
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="career">Carrera</Label>
                <Input
                  id="career"
                  value={career}
                  onChange={(event) => setCareer(event.target.value)}
                  placeholder="Ej: Ingeniería Civil Informática"
                  className="h-11 bg-gray-50"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="region">Región</Label>
                <select
                  id="region"
                  value={regionId}
                  onChange={(event) => {
                    setRegionId(event.target.value);
                    setCityId("");
                    setInstitutionId("");
                  }}
                  disabled={isLoadingCatalogs}
                  className="h-11 w-full rounded-lg border bg-gray-50 px-3 text-sm disabled:opacity-60"
                >
                  <option value="">
                    {isLoadingCatalogs
                      ? "Cargando regiones…"
                      : "Selecciona una región"}
                  </option>
                  {regionId && !hasSelectedRegion && currentRegionName && (
                    <option value={regionId}>{currentRegionName}</option>
                  )}
                  {regions.map((region) => (
                    <option key={region.id} value={region.id}>
                      {region.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="city">Comuna</Label>
                <select
                  id="city"
                  value={cityId}
                  onChange={(event) => {
                    setCityId(event.target.value);
                    setInstitutionId("");
                  }}
                  disabled={!regionId || cities.length === 0}
                  className="h-11 w-full rounded-lg border bg-gray-50 px-3 text-sm disabled:opacity-60"
                >
                  <option value="">
                    {!regionId
                      ? "Selecciona primero una región"
                      : cities.length === 0
                        ? "Sin comunas cargadas"
                        : "Selecciona una comuna"}
                  </option>
                  {cityId && !hasSelectedCity && currentCityName && (
                    <option value={cityId}>{currentCityName}</option>
                  )}
                  {cities.map((city) => (
                    <option key={city.id} value={city.id}>
                      {city.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="institution">Institución</Label>
                <select
                  id="institution"
                  value={institutionId}
                  onChange={(event) => setInstitutionId(event.target.value)}
                  disabled={isLoadingCatalogs}
                  className="h-11 w-full rounded-lg border bg-gray-50 px-3 text-sm disabled:opacity-60"
                >
                  <option value="">
                    {isLoadingCatalogs
                      ? "Cargando instituciones…"
                      : "Selecciona una institución"}
                  </option>
                  {institutionId &&
                    !hasSelectedInstitution &&
                    currentInstitutionName && (
                      <option value={institutionId}>
                        {currentInstitutionName}
                        {currentInstitutionType
                          ? ` - ${currentInstitutionType}`
                          : ""}
                      </option>
                    )}
                  {institutions.map((institution) => (
                    <option key={institution.id} value={institution.id}>
                      {institution.name} - {institution.type}
                    </option>
                  ))}
                </select>
              </div>
            </section>
          ) : (
            <section className="space-y-4 bg-white px-4 py-5 shadow-sm">
              <div>
                <h2 className="text-base font-semibold">Tu vida profesional</h2>
                <p className="mt-1 text-xs text-[#736F88]">
                  Cuéntanos en qué estás trabajando.
                </p>
              </div>

              <label className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-3">
                <span className="text-sm font-medium">
                  Trabajo independiente
                </span>
                <input
                  type="checkbox"
                  checked={isIndependent}
                  onChange={(event) => setIsIndependent(event.target.checked)}
                  className="size-4"
                />
              </label>

              {!isIndependent && (
                <div className="space-y-2">
                  <Label htmlFor="position">Cargo</Label>
                  <Input
                    id="position"
                    value={position}
                    onChange={(event) => setPosition(event.target.value)}
                    placeholder="Ej: Product Manager"
                    className="h-11 bg-gray-50"
                  />
                </div>
              )}

              {!isIndependent && (
                <div className="space-y-2">
                  <Label htmlFor="company">Empresa</Label>
                  <Input
                    id="company"
                    value={company}
                    onChange={(event) => setCompany(event.target.value)}
                    placeholder="Ej: Pinwi"
                    className="h-11 bg-gray-50"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="industry">Rubro</Label>
                <Input
                  id="industry"
                  value={industry}
                  onChange={(event) => setIndustry(event.target.value)}
                  placeholder="Ej: Tecnología"
                  className="h-11 bg-gray-50"
                />
              </div>
            </section>
          )}

          {isStudent && (
            <section
              id="profile-privacy"
              className="space-y-4 bg-white px-4 py-5 shadow-sm"
              aria-labelledby="edit-privacy-title"
            >
              <h2
                id="edit-privacy-title"
                className="flex items-center gap-2 text-base font-semibold"
              >
                <ShieldCheck
                  className="size-4 text-[#8176B9]"
                  aria-hidden="true"
                />
                Visibilidad y privacidad
              </h2>
              <label className="flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border border-[#E8E4F5] bg-[#F8F6FD] px-4 py-3">
                <input
                  type="checkbox"
                  checked={studyProfileVisible}
                  onChange={(event) => {
                    void handleVisibilityChange(event.target.checked);
                  }}
                  disabled={isSavingVisibility || isSaving}
                  className="size-5 shrink-0"
                  aria-describedby="study-profile-sharing"
                />
                <span className="font-medium">
                  Aparecer en encontrar estudiantes
                </span>
              </label>
              <p role="status" className="text-xs font-medium text-[#655CC2]">
                {isSavingVisibility
                  ? "Actualizando visibilidad…"
                  : studyProfileVisible
                    ? "Tu perfil aparece en encontrar estudiantes."
                    : "Tu perfil está fuera de la búsqueda de estudiantes."}
              </p>
              <p id="study-profile-sharing" className="text-sm text-gray-600">
                Comparte tu nombre, foto, carrera, institución, materias y bio
                con otras personas que tengan una cuenta en Pinwi. Tu correo,
                teléfono y ubicación permanecen privados. Puedes desactivarlo
                cuando quieras; este cambio se guarda al instante. En tus
                conversaciones y reservas se seguirá mostrando tu nombre y foto.
              </p>
            </section>
          )}

          {isStudent && (
            <section
              id="profile-subjects"
              className="space-y-4 bg-white px-4 py-5 shadow-sm"
            >
              <div>
                <h2 className="text-base font-semibold">Mis materias</h2>
                <p className="mt-1 text-xs text-[#736F88]">
                  Encuentra puntos en común con otros estudiantes.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {subjects.map((subject) => (
                  <Badge
                    key={subject}
                    className="max-w-full border border-[#E7E3F7] bg-[#F7F5FD] px-3 py-1 text-[#6A609A]"
                  >
                    <span className="min-w-0 whitespace-normal break-words">
                      {subject}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeSubject(subject)}
                      className="ml-1 flex size-8 shrink-0 items-center justify-center rounded-lg hover:bg-[#EDE8FA]"
                      aria-label={`Quitar ${subject}`}
                    >
                      <X className="size-3" />
                    </button>
                  </Badge>
                ))}
                {subjects.length === 0 && (
                  <p className="text-sm text-gray-500">
                    Todavía no has agregado materias.
                  </p>
                )}
              </div>

              <div className="flex gap-2">
                <Input
                  aria-label="Nueva materia"
                  value={newSubject}
                  onChange={(event) => setNewSubject(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      addSubject();
                    }
                  }}
                  placeholder="Nueva materia"
                  className="h-11 bg-gray-50"
                />
                <button
                  type="button"
                  onClick={addSubject}
                  disabled={
                    !newSubject.trim() || subjects.includes(newSubject.trim())
                  }
                  className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#4F46E5] text-white disabled:opacity-40"
                  aria-label="Agregar materia"
                >
                  <Plus className="size-5" />
                </button>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
