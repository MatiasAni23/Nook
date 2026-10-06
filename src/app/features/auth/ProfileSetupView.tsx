import { BrandLogo } from "../../components/BrandLogo";
import { AuthBackground } from "./AuthBackground";
import {
  useEffect,
  useMemo,
  useState,
  type ComponentProps,
  type ReactNode,
} from "react";
import { motion } from "motion/react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Briefcase,
  Building2,
  GraduationCap,
  MapPin,
  Plus,
  Search,
  School,
  Sparkles,
  UserRound,
  X,
} from "lucide-react";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
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


function RoleChoiceCard({
  title,
  description,
  Icon,
  delay,
  onClick,
}: {
  title: string;
  description: string;
  Icon: typeof GraduationCap;
  delay: number;
  onClick: () => void;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      className="group relative w-full overflow-hidden rounded-2xl border border-[#E0E7FF] bg-white p-5 text-left shadow-[0_10px_26px_rgba(79,70,229,0.08)] transition-[border-color,box-shadow,background-color] duration-300 hover:border-[#B8C2FF] hover:shadow-[0_18px_36px_rgba(79,70,229,0.16)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4F46E5] focus-visible:ring-offset-2"
      initial={{ opacity: 0, y: 18, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      whileTap={{ scale: 0.995 }}
      transition={{ duration: 0.35, delay, ease: "easeOut" }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-[#EEF2FF] via-white to-white opacity-0 transition group-hover:opacity-100" />
      <div className="absolute -right-12 -top-12 size-28 rounded-full bg-[#4F46E5]/10 blur-2xl transition group-hover:bg-[#4F46E5]/20" />
      <div className="relative flex items-center gap-4">
        <motion.div
          className="grid size-14 shrink-0 place-items-center rounded-2xl bg-[#4F46E5] text-white shadow-[0_14px_24px_rgba(79,70,229,0.24)]"
          animate={{ y: [0, -4, 0] }}
          transition={{ duration: 3.4, repeat: Infinity, ease: "easeInOut", delay }}
        >
          <Icon className="size-7" />
        </motion.div>
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-black tracking-normal text-[#1E1B4B]">{title}</h3>
          <p className="mt-1 text-sm font-medium leading-5 text-slate-500">{description}</p>
        </div>
        <div className="grid size-9 shrink-0 place-items-center rounded-full bg-[#EEF2FF] text-[#4F46E5] transition group-hover:translate-x-1 group-hover:bg-[#4F46E5] group-hover:text-white">
          <ArrowRight className="size-4" />
        </div>
      </div>
    </motion.button>
  );
}

type SearchableOption = {
  id: string;
  label: string;
  meta?: string;
};

function normalizeSearchText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function getFilteredOptions(options: SearchableOption[], query: string) {
  const normalizedQuery = normalizeSearchText(query);

  if (!normalizedQuery) return options.slice(0, 6);

  return options
    .map((option) => {
      const normalizedLabel = normalizeSearchText(option.label);
      const normalizedMeta = normalizeSearchText(option.meta ?? "");
      const startsWith = normalizedLabel.startsWith(normalizedQuery) ? 0 : 1;
      const includes = normalizedLabel.includes(normalizedQuery) || normalizedMeta.includes(normalizedQuery) ? 0 : 1;
      const index = normalizedLabel.indexOf(normalizedQuery);

      return {
        option,
        score: includes * 100 + startsWith * 10 + (index >= 0 ? index : 50),
      };
    })
    .filter(({ score }) => score < 100)
    .sort((first, second) => first.score - second.score)
    .slice(0, 6)
    .map(({ option }) => option);
}

function SearchableSelect({
  id,
  label,
  Icon,
  options,
  value,
  query,
  placeholder,
  disabled,
  emptyMessage,
  onQueryChange,
  onSelect,
}: {
  id: string;
  label: string;
  Icon: typeof GraduationCap;
  options: SearchableOption[];
  value: string;
  query: string;
  placeholder: string;
  disabled?: boolean;
  emptyMessage: string;
  onQueryChange: (value: string) => void;
  onSelect: (option: SearchableOption) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const filteredOptions = useMemo(() => getFilteredOptions(options, query), [options, query]);

  return (
    <div className="relative space-y-2">
      <Label
        htmlFor={id}
        className="text-[0.68rem] font-black uppercase tracking-[0.18em] text-[#4F46E5]"
      >
        {label}
      </Label>
      <div className="group relative flex min-h-12 items-center rounded-2xl border border-[#E0E7FF] bg-white px-4 shadow-[0_6px_16px_rgba(79,70,229,0.04)] transition focus-within:border-[#4F46E5] focus-within:bg-[#F8FAFF] focus-within:shadow-[0_10px_22px_rgba(79,70,229,0.09)]">
        <Icon className="mr-3 size-4 shrink-0 text-[#8B93F5] transition group-focus-within:text-[#4F46E5]" />
        <Input
          id={id}
          value={query}
          disabled={disabled}
          placeholder={placeholder}
          autoComplete="off"
          onFocus={() => setIsOpen(true)}
          onBlur={() => window.setTimeout(() => setIsOpen(false), 120)}
          onChange={(event) => {
            onQueryChange(event.target.value);
            setIsOpen(true);
          }}
          className="h-11 border-0 bg-transparent px-0 pr-8 text-sm shadow-none outline-none placeholder:text-[#BFC4F8] focus-visible:border-0 focus-visible:ring-0"
        />
        <Search className="absolute right-4 size-4 text-[#8B93F5]" />
      </div>
      {isOpen && !disabled && (
        <div className="absolute z-30 mt-2 max-h-56 w-full overflow-y-auto rounded-2xl border border-[#E0E7FF] bg-white p-1 shadow-[0_18px_36px_rgba(79,70,229,0.16)]">
          {filteredOptions.length > 0 ? (
            filteredOptions.map((option) => (
              <button
                key={option.id}
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  onSelect(option);
                  setIsOpen(false);
                }}
                className={`w-full rounded-xl px-3 py-2 text-left transition hover:bg-[#EEF2FF] ${
                  value === option.id ? "bg-[#EEF2FF]" : ""
                }`}
              >
                <span className="block text-sm font-black text-[#1E1B4B]">{option.label}</span>
                {option.meta && (
                  <span className="mt-0.5 block text-xs font-medium text-slate-400">{option.meta}</span>
                )}
              </button>
            ))
          ) : (
            <div className="px-3 py-3 text-sm font-medium text-slate-400">{emptyMessage}</div>
          )}
        </div>
      )}
    </div>
  );
}

function SetupField({
  id,
  label,
  Icon,
  children,
  align = "center",
}: {
  id?: string;
  label: string;
  Icon: typeof GraduationCap;
  children: ReactNode;
  align?: "center" | "start";
}) {
  return (
    <div className="space-y-2">
      <Label
        htmlFor={id}
        className="text-[0.68rem] font-black uppercase tracking-[0.18em] text-[#4F46E5]"
      >
        {label}
      </Label>
      <div
        className={`group relative flex min-h-12 rounded-2xl border border-[#E0E7FF] bg-white px-4 shadow-[0_6px_16px_rgba(79,70,229,0.04)] transition focus-within:border-[#4F46E5] focus-within:bg-[#F8FAFF] focus-within:shadow-[0_10px_22px_rgba(79,70,229,0.09)] ${
          align === "start" ? "items-start" : "items-center"
        }`}
      >
        <Icon
          className={`mr-3 size-4 shrink-0 text-[#8B93F5] transition group-focus-within:text-[#4F46E5] ${
            align === "start" ? "mt-3.5" : ""
          }`}
        />
        {children}
      </div>
    </div>
  );
}

function SetupInput(props: ComponentProps<typeof Input>) {
  return (
    <Input
      {...props}
      className={`h-11 border-0 bg-transparent px-0 text-sm shadow-none outline-none placeholder:text-[#BFC4F8] focus-visible:border-0 focus-visible:ring-0 ${
        props.className ?? ""
      }`}
    />
  );
}

function SetupTextarea(props: ComponentProps<typeof Textarea>) {
  return (
    <Textarea
      {...props}
      className={`min-h-24 resize-none border-0 bg-transparent px-0 py-3 text-sm shadow-none outline-none placeholder:text-[#BFC4F8] focus-visible:border-0 focus-visible:ring-0 ${
        props.className ?? ""
      }`}
    />
  );
}

export function ProfileSetupView({ userName, onComplete }: ProfileSetupViewProps) {
  const [step, setStep] = useState<"role" | "details">("role");
  const [selectedRole, setSelectedRole] = useState<"student" | "worker" | null>(null);

  const [career, setCareer] = useState("");
  const [regionId, setRegionId] = useState("");
  const [regionQuery, setRegionQuery] = useState("");
  const [cityId, setCityId] = useState("");
  const [cityQuery, setCityQuery] = useState("");
  const [institutionId, setInstitutionId] = useState("");
  const [institutionQuery, setInstitutionQuery] = useState("");
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
  const regionOptions = useMemo(
    () => regions.map((region) => ({ id: region.id, label: region.name })),
    [regions],
  );
  const cityOptions = useMemo(
    () => cities.map((city) => ({ id: city.id, label: city.name })),
    [cities],
  );
  const institutionOptions = useMemo(
    () =>
      institutions.map((institution) => ({
        id: institution.id,
        label: institution.name,
        meta: institution.type,
      })),
    [institutions],
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
      setCityQuery("");
      setInstitutionId("");
      return;
    }

    setCatalogError("");
    getCitiesByRegion(regionId)
      .then((cityOptions) => {
        setCities(cityOptions);
        setCityId("");
        setCityQuery("");
      })
      .catch((error) => {
        setCatalogError(
          error instanceof Error ? error.message : "No se pudieron cargar las ciudades.",
        );
      });
  }, [regionId]);

  useEffect(() => {
    setInstitutionId("");
    setInstitutionQuery("");

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
      <div className="relative min-h-screen w-full overflow-y-auto bg-[#4F46E5] px-4 py-8">
        <AuthBackground variant="page" />

        <div className="relative z-10 flex min-h-[calc(100vh-4rem)] items-center justify-center">
          <motion.div
            className="w-full max-w-lg overflow-hidden rounded-[1.65rem] border border-[#E0E7FF] bg-white p-1 shadow-[0_24px_60px_rgba(49,46,129,0.20)]"
            initial={{ opacity: 0, y: 22, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
          >
            <div className="rounded-[1.5rem] bg-white px-5 pb-6 pt-6 sm:px-6">
              <div className="mb-6">
                <BrandLogo />
                <p className="mt-2 text-xs font-bold text-slate-400">Configuración inicial</p>
              </div>

              <div className="mb-6 text-center">
                <div className="mx-auto mb-3 grid size-12 place-items-center rounded-2xl bg-[#EEF2FF] text-[#4F46E5]">
                  <Sparkles className="size-6" />
                </div>
                <h1 className="text-2xl font-black tracking-normal text-[#1E1B4B]">
                  Bienvenido, {userName.split(" ")[0]}
                </h1>
                <p className="mt-2 text-sm font-medium text-slate-500">Como quieres usar Pinwi?</p>
              </div>

              <div className="space-y-4">
                <RoleChoiceCard
                  title="Soy estudiante"
                  description="Busco lugares para estudiar y conectar con companeros de estudio"
                  Icon={GraduationCap}
                  delay={0.08}
                  onClick={() => handleRoleSelect("student")}
                />
                <RoleChoiceCard
                  title="Soy trabajador"
                  description="Busco espacios de trabajo profesionales para reservar por horas"
                  Icon={Briefcase}
                  delay={0.16}
                  onClick={() => handleRoleSelect("worker")}
                />
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen w-full overflow-y-auto bg-[#4F46E5] px-4 py-8">
      <AuthBackground variant="page" />

      <div className="relative z-10 flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <motion.div
          className="my-6 w-full max-w-2xl overflow-hidden rounded-[1.65rem] border border-[#E0E7FF] bg-white p-1 shadow-[0_24px_60px_rgba(49,46,129,0.20)]"
          initial={{ opacity: 0, y: 22, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
        >
          <div className="rounded-[1.5rem] bg-white px-5 pb-6 pt-6 sm:px-6">
            <BrandLogo className="mb-5" />
            <div className="mb-6 flex items-center gap-3">
              <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[#4F46E5] text-white shadow-[0_10px_20px_rgba(79,70,229,0.18)]">
                {selectedRole === "student" ? (
                  <GraduationCap className="size-5" />
                ) : (
                  <Briefcase className="size-5" />
                )}
              </div>
              <div>
                <p className="text-xl font-black text-[#1E1B4B]">Completa tu perfil</p>
                <p className="text-xs font-bold text-slate-400">
                  {selectedRole === "student"
                    ? "Cuentanos sobre tus estudios"
                    : "Cuentanos sobre tu trabajo"}
                </p>
              </div>
            </div>

            {(errorMessage || catalogError) && (
              <div className="mb-5 space-y-3">
                {errorMessage && (
                  <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                    {errorMessage}
                  </div>
                )}
                {catalogError && (
                  <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                    {catalogError}
                  </div>
                )}
              </div>
            )}

            <div className="space-y-5">
              {selectedRole === "student" ? (
                <>
                  <SetupField id="career" label="Carrera *" Icon={GraduationCap}>
                    <SetupInput
                      id="career"
                      placeholder="Ej: Ingenieria Civil en Computacion"
                      value={career}
                      onChange={(event) => setCareer(event.target.value)}
                    />
                  </SetupField>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <SearchableSelect
                      id="region"
                      label="Region *"
                      Icon={MapPin}
                      options={regionOptions}
                      value={regionId}
                      query={regionQuery}
                      placeholder={isLoadingCatalogs ? "Cargando regiones..." : "Busca tu region"}
                      disabled={isLoadingCatalogs}
                      emptyMessage="No encontramos regiones parecidas."
                      onQueryChange={(value) => {
                        setRegionQuery(value);
                        setRegionId("");
                        setCityId("");
                        setCityQuery("");
                        setInstitutionId("");
                        setInstitutionQuery("");
                      }}
                      onSelect={(option) => {
                        setRegionId(option.id);
                        setRegionQuery(option.label);
                      }}
                    />

                    <SearchableSelect
                      id="city"
                      label="Ciudad"
                      Icon={MapPin}
                      options={cityOptions}
                      value={cityId}
                      query={cityQuery}
                      placeholder={
                        !regionId
                          ? "Selecciona primero una region"
                          : cities.length === 0
                            ? "Sin ciudades cargadas"
                            : "Busca tu ciudad"
                      }
                      disabled={!regionId || cities.length === 0}
                      emptyMessage="No encontramos ciudades parecidas."
                      onQueryChange={(value) => {
                        setCityQuery(value);
                        setCityId("");
                        setInstitutionId("");
                        setInstitutionQuery("");
                      }}
                      onSelect={(option) => {
                        setCityId(option.id);
                        setCityQuery(option.label);
                      }}
                    />
                  </div>

                  <SearchableSelect
                    id="institution"
                    label="Institucion *"
                    Icon={School}
                    options={institutionOptions}
                    value={institutionId}
                    query={institutionQuery}
                    placeholder={
                      isLoadingCatalogs ? "Cargando instituciones..." : "Busca tu institucion"
                    }
                    disabled={isLoadingCatalogs}
                    emptyMessage="No encontramos instituciones parecidas."
                    onQueryChange={(value) => {
                      setInstitutionQuery(value);
                      setInstitutionId("");
                    }}
                    onSelect={(option) => {
                      setInstitutionId(option.id);
                      setInstitutionQuery(option.label);
                    }}
                  />

                  <div className="space-y-3 rounded-2xl border border-[#E0E7FF] bg-[#F8FAFF] p-4">
                    <div className="flex items-center gap-2">
                      <BookOpen className="size-4 text-[#4F46E5]" />
                      <Label className="text-[0.68rem] font-black uppercase tracking-[0.18em] text-[#4F46E5]">
                        Materias o intereses
                      </Label>
                    </div>
                    {subjects.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {subjects.map((subject) => (
                          <Badge
                            key={subject}
                            className="rounded-full bg-[#4F46E5] px-3 py-1 text-white hover:bg-[#4338CA]"
                          >
                            {subject}
                            <button
                              className="ml-2 rounded-full text-white/80 transition hover:text-white"
                              onClick={() => removeSubject(subject)}
                              type="button"
                              aria-label={`Quitar ${subject}`}
                            >
                              <X className="size-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}
                    <div className="flex gap-2">
                      <div className="flex min-h-12 flex-1 items-center rounded-2xl border border-[#E0E7FF] bg-white px-4">
                        <SetupInput
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
                      </div>
                      <Button
                        onClick={addSubject}
                        type="button"
                        className="h-12 rounded-2xl bg-[#4F46E5] px-4 font-black text-white hover:bg-[#4338CA]"
                      >
                        <Plus className="size-4" />
                        Agregar
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-3">
                    <Label className="text-[0.68rem] font-black uppercase tracking-[0.18em] text-[#4F46E5]">
                      Eres independiente? *
                    </Label>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={() => setIsIndependent(true)}
                        className={`rounded-2xl border p-4 text-left transition ${
                          isIndependent === true
                            ? "border-[#4F46E5] bg-[#EEF2FF] shadow-[0_12px_24px_rgba(79,70,229,0.14)]"
                            : "border-[#E0E7FF] bg-white hover:border-[#B8C2FF] hover:bg-[#F8FAFF]"
                        }`}
                      >
                        <span className="font-black text-[#1E1B4B]">Si, trabajo por cuenta propia</span>
                        <span className="mt-1 block text-sm font-medium text-slate-500">
                          Freelance, independiente o emprendimiento.
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsIndependent(false)}
                        className={`rounded-2xl border p-4 text-left transition ${
                          isIndependent === false
                            ? "border-[#4F46E5] bg-[#EEF2FF] shadow-[0_12px_24px_rgba(79,70,229,0.14)]"
                            : "border-[#E0E7FF] bg-white hover:border-[#B8C2FF] hover:bg-[#F8FAFF]"
                        }`}
                      >
                        <span className="font-black text-[#1E1B4B]">No, trabajo en una empresa</span>
                        <span className="mt-1 block text-sm font-medium text-slate-500">
                          Reserva espacios para tu jornada laboral.
                        </span>
                      </button>
                    </div>
                  </div>

                  {isIndependent === true && (
                    <SetupField id="industry" label="Rubro *" Icon={Briefcase}>
                      <SetupInput
                        id="industry"
                        placeholder="Ej: Diseno grafico, Desarrollo de software..."
                        value={industry}
                        onChange={(event) => setIndustry(event.target.value)}
                      />
                    </SetupField>
                  )}

                  {isIndependent === false && (
                    <div className="grid gap-4 sm:grid-cols-2">
                      <SetupField id="company" label="Empresa *" Icon={Building2}>
                        <SetupInput
                          id="company"
                          placeholder="Ej: Tech Solutions SpA"
                          value={company}
                          onChange={(event) => setCompany(event.target.value)}
                        />
                      </SetupField>

                      <SetupField id="position" label="Cargo *" Icon={UserRound}>
                        <SetupInput
                          id="position"
                          placeholder="Ej: Desarrollador Senior"
                          value={position}
                          onChange={(event) => setPosition(event.target.value)}
                        />
                      </SetupField>
                    </div>
                  )}
                </>
              )}

              <SetupField id="bio" label="Descripcion" Icon={Sparkles} align="start">
                <SetupTextarea
                  id="bio"
                  placeholder="Cuentanos un poco sobre ti..."
                  value={bio}
                  onChange={(event) => setBio(event.target.value)}
                  rows={3}
                />
              </SetupField>

              <div className="grid gap-3 pt-2 sm:grid-cols-[0.75fr_1.25fr]">
                <Button
                  variant="outline"
                  onClick={() => setStep("role")}
                  className="h-12 rounded-2xl border-[#E0E7FF] font-black text-[#4F46E5] hover:bg-[#EEF2FF]"
                >
                  <ArrowLeft className="size-4" />
                  Volver
                </Button>
                <Button
                  onClick={handleComplete}
                  disabled={isSubmitting}
                  className="h-12 rounded-2xl bg-[#4F46E5] font-black text-white shadow-[0_14px_24px_rgba(79,70,229,0.24)] hover:bg-[#4338CA]"
                >
                  {isSubmitting ? "Guardando..." : "Completar perfil"}
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
