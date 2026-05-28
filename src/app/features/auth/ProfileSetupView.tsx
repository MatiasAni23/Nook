import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import { Label } from "../../components/ui/label";
import { Badge } from "../../components/ui/badge";
import { GraduationCap, Briefcase } from "lucide-react";

interface ProfileSetupViewProps {
  userName: string;
  onComplete: (role: 'student' | 'worker', profileData: any) => Promise<void> | void;
}

export function ProfileSetupView({ userName, onComplete }: ProfileSetupViewProps) {
  const [step, setStep] = useState<'role' | 'details'>('role');
  const [selectedRole, setSelectedRole] = useState<'student' | 'worker' | null>(null);

  // Student fields
  const [career, setCareer] = useState("");
  const [university, setUniversity] = useState("");
  const [subjects, setSubjects] = useState<string[]>([]);
  const [newSubject, setNewSubject] = useState("");

  // Worker fields
  const [isIndependent, setIsIndependent] = useState<boolean | null>(null);
  const [company, setCompany] = useState("");
  const [position, setPosition] = useState("");
  const [industry, setIndustry] = useState("");

  // Common fields
  const [bio, setBio] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRoleSelect = (role: 'student' | 'worker') => {
    setSelectedRole(role);
    setStep('details');
  };

  const addSubject = () => {
    if (newSubject.trim() && !subjects.includes(newSubject.trim())) {
      setSubjects([...subjects, newSubject.trim()]);
      setNewSubject("");
    }
  };

  const removeSubject = (subject: string) => {
    setSubjects(subjects.filter(s => s !== subject));
  };

  const handleComplete = async () => {
    if (!selectedRole) return;

    const profileData = selectedRole === 'student'
      ? { career, university, subjects, bio }
      : isIndependent
        ? { isIndependent: true, industry, bio }
        : { isIndependent: false, company, position, bio };

    // Validate required fields
    if (selectedRole === 'student' && (!career || !university)) {
      alert('Por favor completa todos los campos requeridos');
      return;
    }

    if (selectedRole === 'worker') {
      if (isIndependent === null) {
        alert('Por favor indica si eres independiente');
        return;
      }
      if (isIndependent && !industry) {
        alert('Por favor indica tu rubro');
        return;
      }
      if (!isIndependent && (!company || !position)) {
        alert('Por favor completa todos los campos requeridos');
        return;
      }
    }

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

  if (step === 'role') {
    return (
      <div className="size-full flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl mb-2">¡Bienvenido, {userName.split(' ')[0]}! 👋</CardTitle>
            <p className="text-sm text-gray-600">¿Cómo quieres usar Nook?</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <button
              onClick={() => handleRoleSelect('student')}
              className="w-full p-6 rounded-xl border-2 border-gray-300 hover:border-[#4F46E5] hover:bg-purple-50 transition-all text-left"
            >
              <div className="flex items-start gap-4">
                <div className="size-12 rounded-full bg-[#4F46E5] flex items-center justify-center shrink-0">
                  <GraduationCap className="size-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg mb-1">Soy estudiante</h3>
                  <p className="text-sm text-gray-600">
                    Busco lugares para estudiar y conectar con compañeros de estudio
                  </p>
                </div>
              </div>
            </button>

            <button
              onClick={() => handleRoleSelect('worker')}
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
            {selectedRole === 'student' ? 'Cuéntanos sobre tus estudios' : 'Cuéntanos sobre tu trabajo'}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {errorMessage && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {errorMessage}
            </div>
          )}

          {selectedRole === 'student' ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="career">Carrera *</Label>
                <Input
                  id="career"
                  placeholder="Ej: Ingeniería Civil en Computación"
                  value={career}
                  onChange={(e) => setCareer(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="university">Universidad *</Label>
                <select
                  id="university"
                  value={university}
                  onChange={(e) => setUniversity(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                >
                  <option value="">Selecciona tu universidad</option>
                  <option value="Universidad de Chile">Universidad de Chile</option>
                  <option value="Pontificia Universidad Católica de Chile">Pontificia Universidad Católica de Chile</option>
                  <option value="Universidad Técnica Federico Santa María">Universidad Técnica Federico Santa María</option>
                  <option value="Universidad de Santiago de Chile">Universidad de Santiago de Chile</option>
                  <option value="Universidad Adolfo Ibáñez">Universidad Adolfo Ibáñez</option>
                  <option value="Universidad Diego Portales">Universidad Diego Portales</option>
                  <option value="Universidad de Concepción">Universidad de Concepción</option>
                  <option value="Otra">Otra</option>
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
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Ej: Algoritmos, Cálculo..."
                    value={newSubject}
                    onChange={(e) => setNewSubject(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSubject())}
                  />
                  <Button onClick={addSubject} type="button">Agregar</Button>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-3">
                <Label>¿Eres independiente? *</Label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsIndependent(true)}
                    className={`flex-1 p-4 rounded-lg border-2 transition-all ${
                      isIndependent === true
                        ? 'border-[#4F46E5] bg-purple-50'
                        : 'border-gray-300 hover:border-[#4F46E5]'
                    }`}
                  >
                    <span className="font-semibold">Sí</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsIndependent(false)}
                    className={`flex-1 p-4 rounded-lg border-2 transition-all ${
                      isIndependent === false
                        ? 'border-[#4F46E5] bg-purple-50'
                        : 'border-gray-300 hover:border-[#4F46E5]'
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
                    placeholder="Ej: Diseño gráfico, Desarrollo de software..."
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
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
                      onChange={(e) => setCompany(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="position">Cargo *</Label>
                    <Input
                      id="position"
                      placeholder="Ej: Desarrollador Senior"
                      value={position}
                      onChange={(e) => setPosition(e.target.value)}
                    />
                  </div>
                </>
              )}
            </>
          )}

          <div className="space-y-2">
            <Label htmlFor="bio">Descripción</Label>
            <Textarea
              id="bio"
              placeholder="Cuéntanos un poco sobre ti..."
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => setStep('role')}
              className="flex-1"
            >
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
