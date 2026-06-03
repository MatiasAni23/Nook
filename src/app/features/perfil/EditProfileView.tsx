import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, Camera, Plus, Save, X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "../../components/ui/avatar";
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
  uploadCurrentUserProfileImage,
} from "../../services/currentUserService";
import { useCurrentUser } from "../../context/CurrentUserContext";

export function EditProfileView() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { currentUser, refreshCurrentUser } = useCurrentUser();
  const isStudent = currentUser?.role !== "worker";

  const [name, setName] = useState(currentUser?.name ?? "");
  const [avatarUrl, setAvatarUrl] = useState(currentUser?.profile?.profile_image_url ?? "");
  const [bio, setBio] = useState(currentUser?.profile?.bio ?? "");
  const [career, setCareer] = useState(currentUser?.profile?.career ?? "");
  const [regionId, setRegionId] = useState(currentUser?.profile?.region_id ?? "");
  const [cityId, setCityId] = useState(currentUser?.profile?.city_id ?? "");
  const [institutionId, setInstitutionId] = useState(currentUser?.profile?.institution_id ?? "");
  const [subjects, setSubjects] = useState<string[]>(currentUser?.profile?.subjects ?? []);
  const [newSubject, setNewSubject] = useState("");
  const [company, setCompany] = useState(currentUser?.profile?.company ?? "");
  const [position, setPosition] = useState(currentUser?.profile?.position ?? "");
  const [industry, setIndustry] = useState(currentUser?.profile?.industry ?? "");
  const [isIndependent, setIsIndependent] = useState(Boolean(currentUser?.profile?.is_independent));
  const [regions, setRegions] = useState<RegionOption[]>([]);
  const [cities, setCities] = useState<CityOption[]>([]);
  const [institutions, setInstitutions] = useState<InstitutionOption[]>([]);
  const [isLoadingCatalogs, setIsLoadingCatalogs] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

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
    if (!currentUser) return;

    setName(currentUser.name);
    setAvatarUrl(currentUser.profile?.profile_image_url ?? "");
    setBio(currentUser.profile?.bio ?? "");
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
          error instanceof Error ? error.message : "No se pudieron cargar los catalogos.",
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
          error instanceof Error ? error.message : "No se pudieron cargar las comunas.",
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

  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
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
        error instanceof Error ? error.message : "No se pudo subir la foto de perfil.",
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
        throw new Error("Completa nombre, carrera, region e institucion.");
      }

      if (!isStudent && (!position.trim() || (!isIndependent && !company.trim()))) {
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
            }
          : {
              company: isIndependent ? null : company,
              position,
              isIndependent,
              industry,
              bio,
              profileImageUrl: avatarUrl,
            },
      });

      await refreshCurrentUser();
      navigate("/app/profile");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "No se pudo guardar el perfil.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="size-full flex flex-col bg-gray-50">
      <div className="flex-1 overflow-auto pb-24">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-4 py-4">
          <button
            onClick={() => navigate("/app/profile")}
            className="flex size-10 items-center justify-center rounded-full bg-gray-100 text-gray-700"
            aria-label="Volver"
          >
            <ArrowLeft className="size-5" />
          </button>
          <h1 className="text-lg" style={{ fontWeight: 700 }}>Editar perfil</h1>
          <button
            onClick={handleSave}
            disabled={isSaving || isUploadingAvatar}
            className="flex items-center gap-2 rounded-full bg-[#4F46E5] px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            <Save className="size-4" />
            {isSaving ? "Guardando" : "Guardar"}
          </button>
        </div>

        <div className="space-y-5 px-4 py-5">
          <section className="bg-white px-4 py-5 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Avatar className="size-24 border-4 border-white shadow-lg">
                  {avatarUrl && (
                    <AvatarImage src={avatarUrl} alt={name} className="object-cover" />
                  )}
                  <AvatarFallback className="bg-[#4F46E5] text-3xl text-white">
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
                <p className="text-sm text-gray-500">Foto de perfil</p>
                <p className="text-base font-semibold">{name || "Tu nombre"}</p>
                {isUploadingAvatar && (
                  <p className="mt-1 text-xs text-gray-500">Subiendo foto...</p>
                )}
              </div>
            </div>
          </section>

          {errorMessage && (
            <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
              {errorMessage}
            </div>
          )}

          <section className="space-y-4 bg-white px-4 py-5 shadow-sm">
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
                placeholder="Cuentanos sobre ti"
                className="min-h-24 bg-gray-50"
              />
            </div>
          </section>

          {isStudent ? (
            <section className="space-y-4 bg-white px-4 py-5 shadow-sm">
              <div>
                <h2 className="text-base" style={{ fontWeight: 700 }}>Datos academicos</h2>
                <p className="text-sm text-gray-500">Selecciona tu institucion y ubicacion.</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="career">Carrera</Label>
                <Input
                  id="career"
                  value={career}
                  onChange={(event) => setCareer(event.target.value)}
                  placeholder="Ej: Ingenieria Civil Informatica"
                  className="h-11 bg-gray-50"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="region">Region</Label>
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
                    {isLoadingCatalogs ? "Cargando regiones..." : "Selecciona una region"}
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
                      ? "Selecciona primero una region"
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

              <div className="space-y-2">
                <Label htmlFor="institution">Institucion</Label>
                <select
                  id="institution"
                  value={institutionId}
                  onChange={(event) => setInstitutionId(event.target.value)}
                  disabled={isLoadingCatalogs}
                  className="h-11 w-full rounded-lg border bg-gray-50 px-3 text-sm disabled:opacity-60"
                >
                  <option value="">
                    {isLoadingCatalogs ? "Cargando instituciones..." : "Selecciona una institucion"}
                  </option>
                  {institutionId && !hasSelectedInstitution && currentInstitutionName && (
                    <option value={institutionId}>
                      {currentInstitutionName}
                      {currentInstitutionType ? ` - ${currentInstitutionType}` : ""}
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
                <h2 className="text-base" style={{ fontWeight: 700 }}>Datos laborales</h2>
                <p className="text-sm text-gray-500">Mantén actualizada tu informacion de trabajo.</p>
              </div>

              <label className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-3">
                <span className="text-sm font-medium">Trabajo independiente</span>
                <input
                  type="checkbox"
                  checked={isIndependent}
                  onChange={(event) => setIsIndependent(event.target.checked)}
                  className="size-4"
                />
              </label>

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

              {!isIndependent && (
                <div className="space-y-2">
                  <Label htmlFor="company">Empresa</Label>
                  <Input
                    id="company"
                    value={company}
                    onChange={(event) => setCompany(event.target.value)}
                    placeholder="Ej: Nook"
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
                  placeholder="Ej: Tecnologia"
                  className="h-11 bg-gray-50"
                />
              </div>
            </section>
          )}

          {isStudent && (
            <section className="space-y-4 bg-white px-4 py-5 shadow-sm">
              <div>
                <h2 className="text-base" style={{ fontWeight: 700 }}>Materias</h2>
                <p className="text-sm text-gray-500">Agrega las materias que quieres compartir.</p>
              </div>

              <div className="flex flex-wrap gap-2">
                {subjects.map((subject) => (
                  <Badge key={subject} className="bg-[#4F46E5] px-3 py-1 text-white">
                    {subject}
                    <button
                      type="button"
                      onClick={() => removeSubject(subject)}
                      className="ml-2"
                      aria-label={`Quitar ${subject}`}
                    >
                      <X className="size-3" />
                    </button>
                  </Badge>
                ))}
                {subjects.length === 0 && (
                  <p className="text-sm text-gray-500">Todavia no hay materias agregadas.</p>
                )}
              </div>

              <div className="flex gap-2">
                <Input
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
                  className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-[#4F46E5] text-white"
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
