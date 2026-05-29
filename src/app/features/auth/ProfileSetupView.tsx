import { useEffect, useMemo, useState } from "react";
import { Briefcase, GraduationCap } from "lucide-react";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import {
  type CityOption,
  getCitiesByRegion,
  getInstitutions,
  getRegions,
  type InstitutionOption,
  type RegionOption,
} from "../../services/catalogService";

interface ProfileSetupViewProps {
  userName: string;
  onComplete: (role: "student" | "worker", profileData: any) => Promise<void> | void;
}

export function ProfileSetupView({ userName, onComplete }: ProfileSetupViewProps) {
  const [step, setStep] = useState<"role" | "details">("role");
  const [selectedRole, setSelectedRole] = useState<"student" | "worker" | null>(null);

  const [career, setCareer] = useState("");
  const [regionId, setRegionId] = useState("");
  const [cityId, setCityId] = useState("");
  const [institutionId, setInstitutionId] = useState("");
  const [regions, setRegions] = useState<RegionOption[]>([]);
  const [cities, setCities] = useState<CityOption[]>([]);
  const [institutions, setInstitutions] = useState<InstitutionOption[]>([]);
  const [isLoadingCatalogs, setIsLoadingCatalogs] = useState(false);
  const [catalogError, setCatalogError] = useState("");
  const [subjects, setSubjects] = useState<string[]>([]);
  const [newSubject, setNewSubject] = useState("");

  const [isIndependent, setIsIndependent] = useState<boolean | null>(null);
  const [company, setCompany] = useState("");
  const [position, setPosition] = useState("");
  const [industry, setIndustry] = useState("");

  const [bio, setBio] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedInstitution = useMemo(
    () => institutions.find((institution) => institution.id === institutionId),
    [institutionId, institutions],
  );

  useEffect(() => {
    if (selectedRole !== "student") return;

    setIsLoadingCatalogs(true);
    setCatalogError("");

    Promise.all([getRegions(), getInstitutions()])
      .then(([regionOptions, institutionOptions]) => {
        setRegions(regionOptions);
        setInstitutions(institutionOptions);
      })
      .catch((error) => {
        setCatalogError(
          error instanceof Error
            ? error.message
            : "No se pudieron cargar regiones e instituciones.",
        );
      })
      .finally(() => setIsLoadingCatalogs(false));
  }, [selectedRole]);

  useEffect(() => {
    if (!regionId) {
      setCities([]);
      setCityId("");
      return;
    }

    setCatalogError("");
    getCitiesByRegion(regionId)
      .then((cityOptions) => {
        setCities(cityOptions);
        setCityId("");
      })
      .catch((error) => {
        setCatalogError(
          error instanceof Error ? error.message : "No se pudieron cargar las ciudades.",
        );
      });
  }, [regionId]);

  useEffect(() => {
    setInstitutionId("");

    getInstitutions(cityId || undefined)
      .then(setInstitutions)
      .catch((error) => {
        setCatalogError(
          error instanceof Error
            ? error.message
            : "No se pudieron cargar las instituciones.",
        );
      });
  }, [cityId]);

  const handleRoleSelect = (role: "student" | "worker") => {
    setSelectedRole(role);
    setStep("details");
  };

  const addSubject = () => {
    const subject = newSubject.trim();

    if (subject && !subjects.includes(subject)) {
      setSubjects([...subjects, subject]);
      setNewSubject("");
    }
  };

  const removeSubject = (subject: string) => {
    setSubjects(subjects.filter((item) => item !== subject));
  };

  const handleComplete = async () => {
    if (!selectedRole) return;

    if (selectedRole === "student") {
      if (!career || !regionId || !institutionId) {
        alert("Por favor completa carrera, region e institucion");
        return;
      }

      if (cities.length > 0 && !cityId) {
        alert("Por favor selecciona tu ciudad");
        return;
      }
    }

    if (selectedRole === "worker") {
      if (isIndependent === null) {
        alert("Por favor indica si eres independiente");
        return;
      }

      if (isIndependent && !industry) {
        alert("Por favor indica tu rubro");
        return;
      }

      if (!isIndependent && (!company || !position)) {
        alert("Por favor completa todos los campos requeridos");
        return;
      }
    }

    const profileData =
      selectedRole === "student"
        ? {
            career,
            regionId,
            cityId: cityId || null,
            institutionId,
            university: selectedInstitution?.name ?? "",
            subjects,
            bio,
          }
        : isIndependent
          ? { isIndependent: true, industry, bio }
          : { isIndependent: false, company, position, bio };

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      await onComplete(selectedRole, profileData);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "No se pudo guardar el perfil.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (step === "role") {
    return (
      <div className="size-full flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl mb-2">Bienvenido, {userName.split(" ")[0]}</CardTitle>
            <p className="text-sm text-gray-600">Como quieres usar Nook?</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <button
              onClick={() => handleRoleSelect("student")}
              className="w-full p-6 rounded-xl border-2 border-gray-300 hover:border-[#4F46E5] hover:bg-purple-50 transition-all text-left"
            >
              <div className="flex items-start gap-4">
                <div className="size-12 rounded-full bg-[#4F46E5] flex items-center justify-center shrink-0">
                  <GraduationCap className="size-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg mb-1">Soy estudiante</h3>
                  <p className="text-sm text-gray-600">
                    Busco lugares para estudiar y conectar con companeros de estudio
                  </p>
                </div>
              </div>
            </button>

            <button
              onClick={() => handleRoleSelect("worker")}
              className="w-full p-6 rounded-xl border-2 border-gray-300 hover:border-[#4F46E5] hover:bg-purple-50 transition-all text-left"
            >
              <div className="flex items-start gap-4">
                <div className="size-12 rounded-full bg-[#4F46E5] flex items-center justify-center shrink-0">
                  <Briefcase className="size-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg mb-1">Soy trabajador</h3>
                  <p className="text-sm text-gray-600">
                    Busco espacios de trabajo profesionales para reservar por horas
                  </p>
                </div>
              </div>
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="size-full flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50 p-4 overflow-auto">
      <Card className="w-full max-w-md my-8">
        <CardHeader>
          <CardTitle className="text-2xl">Completa tu perfil</CardTitle>
          <p className="text-sm text-gray-600">
            {selectedRole === "student" ? "Cuentanos sobre tus estudios" : "Cuentanos sobre tu trabajo"}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {errorMessage && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {errorMessage}
            </div>
          )}

          {catalogError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {catalogError}
            </div>
          )}

          {selectedRole === "student" ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="career">Carrera *</Label>
                <Input
                  id="career"
                  placeholder="Ej: Ingenieria Civil en Computacion"
                  value={career}
                  onChange={(event) => setCareer(event.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="region">Region *</Label>
                <select
                  id="region"
                  value={regionId}
                  onChange={(event) => setRegionId(event.target.value)}
                  disabled={isLoadingCatalogs}
                  className="w-full px-3 py-2 border rounded-lg text-sm bg-input-background disabled:opacity-60"
                >
                  <option value="">
                    {isLoadingCatalogs ? "Cargando regiones..." : "Selecciona tu region"}
                  </option>
                  {regions.map((region) => (
                    <option key={region.id} value={region.id}>
                      {region.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="city">Ciudad</Label>
                <select
                  id="city"
                  value={cityId}
                  onChange={(event) => setCityId(event.target.value)}
                  disabled={!regionId || cities.length === 0}
                  className="w-full px-3 py-2 border rounded-lg text-sm bg-input-background disabled:opacity-60"
                >
                  <option value="">
                    {!regionId
                      ? "Selecciona primero una region"
                      : cities.length === 0
                        ? "Sin ciudades cargadas para esta region"
                        : "Selecciona tu ciudad"}
                  </option>
                  {cities.map((city) => (
                    <option key={city.id} value={city.id}>
                      {city.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="institution">Institucion *</Label>
                <select
                  id="institution"
                  value={institutionId}
                  onChange={(event) => setInstitutionId(event.target.value)}
                  disabled={isLoadingCatalogs}
                  className="w-full px-3 py-2 border rounded-lg text-sm bg-input-background disabled:opacity-60"
                >
                  <option value="">
                    {isLoadingCatalogs ? "Cargando instituciones..." : "Selecciona tu institucion"}
                  </option>
                  {institutions.map((institution) => (
                    <option key={institution.id} value={institution.id}>
                      {institution.name} - {institution.type}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label>Materias o intereses</Label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {subjects.map((subject) => (
                    <Badge key={subject} className="bg-[#4F46E5] text-white">
                      {subject}
                      <button
                        className="ml-2 hover:text-red-200"
                        onClick={() => removeSubject(subject)}
                        type="button"
                      >
                        x
                      </button>
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Ej: Algoritmos, Calculo..."
                    value={newSubject}
                    onChange={(event) => setNewSubject(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        addSubject();
                      }
                    }}
                  />
                  <Button onClick={addSubject} type="button">
                    Agregar
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-3">
                <Label>Eres independiente? *</Label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsIndependent(true)}
                    className={`flex-1 p-4 rounded-lg border-2 transition-all ${
                      isIndependent === true
                        ? "border-[#4F46E5] bg-purple-50"
                        : "border-gray-300 hover:border-[#4F46E5]"
                    }`}
                  >
                    <span className="font-semibold">Si</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsIndependent(false)}
                    className={`flex-1 p-4 rounded-lg border-2 transition-all ${
                      isIndependent === false
                        ? "border-[#4F46E5] bg-purple-50"
                        : "border-gray-300 hover:border-[#4F46E5]"
                    }`}
                  >
                    <span className="font-semibold">No</span>
                  </button>
                </div>
              </div>

              {isIndependent === true && (
                <div className="space-y-2">
                  <Label htmlFor="industry">Rubro *</Label>
                  <Input
                    id="industry"
                    placeholder="Ej: Diseno grafico, Desarrollo de software..."
                    value={industry}
                    onChange={(event) => setIndustry(event.target.value)}
                  />
                </div>
              )}

              {isIndependent === false && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="company">Empresa *</Label>
                    <Input
                      id="company"
                      placeholder="Ej: Tech Solutions SpA"
                      value={company}
                      onChange={(event) => setCompany(event.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="position">Cargo *</Label>
                    <Input
                      id="position"
                      placeholder="Ej: Desarrollador Senior"
                      value={position}
                      onChange={(event) => setPosition(event.target.value)}
                    />
                  </div>
                </>
              )}
            </>
          )}

          <div className="space-y-2">
            <Label htmlFor="bio">Descripcion</Label>
            <Textarea
              id="bio"
              placeholder="Cuentanos un poco sobre ti..."
              value={bio}
              onChange={(event) => setBio(event.target.value)}
              rows={3}
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={() => setStep("role")} className="flex-1">
              Volver
            </Button>
            <Button
              onClick={handleComplete}
              disabled={isSubmitting}
              className="flex-1 bg-[#4F46E5] hover:bg-[#4338CA]"
            >
              {isSubmitting ? "Guardando..." : "Completar perfil"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
