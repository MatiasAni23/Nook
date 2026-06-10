import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { ArrowLeft, CheckCircle2, Eye, EyeOff, Mail, ShieldCheck, UserPlus } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import {
  claimDelegateInvitation,
  getDelegateInvitationByToken,
  type DelegateInvitation,
} from "../../services/adminManagementService";
import {
  ensureAppUserRecord,
  resendSignupVerificationCode,
  signUpWithEmail,
  verifySignupCode,
} from "../../services/authService";

function getPasswordScore(password: string) {
  let score = 0;
  if (password.length >= 8) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[a-z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  return score;
}

function getPasswordStrength(score: number) {
  if (score <= 1) return { label: "Muy debil", color: "bg-red-500", width: "20%" };
  if (score === 2) return { label: "Debil", color: "bg-orange-500", width: "40%" };
  if (score === 3) return { label: "Aceptable", color: "bg-yellow-500", width: "60%" };
  if (score === 4) return { label: "Buena", color: "bg-blue-500", width: "80%" };
  return { label: "Fuerte", color: "bg-green-500", width: "100%" };
}

function getInviteErrorMessage(error: unknown) {
  if (!(error instanceof Error)) return "No se pudo completar la accion.";

  const message = error.message.toLowerCase();
  if (message.includes("already registered") || message.includes("user already registered")) {
    return "Este correo ya tiene cuenta. Pide al administrador que lo agregue como delegado existente.";
  }
  if (message.includes("otp") || message.includes("token")) {
    return "El codigo no es valido o ya expiro.";
  }
  if (message.includes("invalid_delegate_invitation")) {
    return "La invitacion no existe, ya fue usada o expiro.";
  }
  if (message.includes("delegate_invitation_email_mismatch")) {
    return "La sesion actual no corresponde al correo invitado.";
  }

  return error.message;
}

function PasswordVisibilityButton({
  isVisible,
  onClick,
  label,
}: {
  isVisible: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
      aria-label={label}
      title={label}
    >
      {isVisible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
    </button>
  );
}

export function DelegateInviteView() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [invitation, setInvitation] = useState<DelegateInvitation | null>(null);
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [code, setCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [step, setStep] = useState<"register" | "verify" | "done">("register");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const passwordScore = useMemo(() => getPasswordScore(password), [password]);
  const passwordStrength = getPasswordStrength(passwordScore);
  const isExpired = invitation ? invitation.expiresAt.getTime() < Date.now() : false;

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setErrorMessage("");

    if (!token) {
      setErrorMessage("Falta el token de invitacion.");
      setIsLoading(false);
      return;
    }

    getDelegateInvitationByToken(token)
      .then((loadedInvitation) => {
        if (!isMounted) return;
        setInvitation(loadedInvitation);
        if (!loadedInvitation) {
          setErrorMessage("La invitacion no existe o ya no esta disponible.");
        }
      })
      .catch((error) => {
        if (isMounted) setErrorMessage(getInviteErrorMessage(error));
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [token]);

  const handleRegister = async () => {
    if (!invitation) return;
    if (invitation.status !== "pending" || isExpired) {
      setErrorMessage("Esta invitacion ya no esta disponible.");
      return;
    }
    if (passwordScore < 3) {
      setErrorMessage("La contrasena debe tener al menos 8 caracteres y combinar letras con numeros.");
      return;
    }
    if (password !== passwordConfirm) {
      setErrorMessage("Las contrasenas no coinciden.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const { session, user } = await signUpWithEmail({
        name: invitation.name,
        email: invitation.email,
        phone: invitation.phone ?? "",
        password,
        role: "delegate",
        emailRedirectTo: `${window.location.origin}/delegate-invite?token=${encodeURIComponent(token)}`,
      });

      if (session && user) {
        await ensureAppUserRecord(user, "delegate");
        await claimDelegateInvitation(token);
        setStep("done");
        return;
      }

      setStep("verify");
      setSuccessMessage("Te enviamos un codigo de verificacion al correo invitado.");
    } catch (error) {
      setErrorMessage(getInviteErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerify = async () => {
    if (!invitation) return;
    const cleanCode = code.replace(/\s/g, "");

    if (cleanCode.length < 6) {
      setErrorMessage("Ingresa el codigo completo.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const { user } = await verifySignupCode(invitation.email, cleanCode);
      if (user) {
        await ensureAppUserRecord(user, "delegate");
      }
      await claimDelegateInvitation(token);
      setStep("done");
    } catch (error) {
      setErrorMessage(getInviteErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const resendCode = async () => {
    if (!invitation) return;
    setIsResending(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      await resendSignupVerificationCode(invitation.email);
      setSuccessMessage("Te enviamos un nuevo codigo de verificacion.");
    } catch (error) {
      setErrorMessage(getInviteErrorMessage(error));
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="size-full flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <button
            type="button"
            onClick={() => navigate("/")}
            className="mb-4 inline-flex w-fit items-center gap-2 rounded-lg px-2 py-1 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-800"
          >
            <ArrowLeft className="size-4" />
            Volver
          </button>
          <CardTitle className="text-2xl">Invitacion de delegado</CardTitle>
          <p className="text-sm text-gray-600">Configura tu acceso para administrar los lugares asignados.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {errorMessage && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {errorMessage}
            </div>
          )}

          {successMessage && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              {successMessage}
            </div>
          )}

          {isLoading && <div className="rounded-lg border bg-white px-3 py-3 text-sm text-gray-600">Cargando invitacion...</div>}

          {!isLoading && invitation && step === "register" && (
            <>
              <div className="space-y-2">
                <Label>Correo invitado</Label>
                <Input value={invitation.email} readOnly className="bg-gray-50" />
              </div>
              <div className="space-y-2">
                <Label>Nombre</Label>
                <Input value={invitation.name} readOnly className="bg-gray-50" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="delegate-password">Contrasena</Label>
                <div className="relative">
                  <Input
                    id="delegate-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="********"
                    value={password}
                    className="pr-10"
                    onChange={(event) => setPassword(event.target.value)}
                  />
                  <PasswordVisibilityButton
                    isVisible={showPassword}
                    onClick={() => setShowPassword((value) => !value)}
                    label={showPassword ? "Ocultar contrasena" : "Mostrar contrasena"}
                  />
                </div>
                <div className="space-y-1">
                  <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className={`h-full rounded-full transition-all ${passwordStrength.color}`}
                      style={{ width: password ? passwordStrength.width : "0%" }}
                    />
                  </div>
                  <p className="text-xs text-gray-500">Seguridad: {password ? passwordStrength.label : "Sin datos"}</p>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="delegate-password-confirm">Confirmar contrasena</Label>
                <div className="relative">
                  <Input
                    id="delegate-password-confirm"
                    type={showPasswordConfirm ? "text" : "password"}
                    placeholder="********"
                    value={passwordConfirm}
                    className="pr-10"
                    onChange={(event) => setPasswordConfirm(event.target.value)}
                    onKeyDown={(event) => event.key === "Enter" && handleRegister()}
                  />
                  <PasswordVisibilityButton
                    isVisible={showPasswordConfirm}
                    onClick={() => setShowPasswordConfirm((value) => !value)}
                    label={showPasswordConfirm ? "Ocultar contrasena" : "Mostrar contrasena"}
                  />
                </div>
              </div>
              <Button
                onClick={handleRegister}
                disabled={isSubmitting || invitation.status !== "pending" || isExpired}
                className="w-full bg-[#4F46E5] hover:bg-[#4338CA]"
              >
                <UserPlus className="size-4 mr-2" />
                {isSubmitting ? "Creando cuenta..." : "Crear cuenta de delegado"}
              </Button>
            </>
          )}

          {!isLoading && invitation && step === "verify" && (
            <>
              <div className="space-y-2">
                <Label>Correo invitado</Label>
                <Input value={invitation.email} readOnly className="bg-gray-50" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="delegate-code">Codigo de verificacion</Label>
                <Input
                  id="delegate-code"
                  inputMode="numeric"
                  placeholder="123456"
                  value={code}
                  maxLength={12}
                  onChange={(event) => setCode(event.target.value.replace(/[^\dA-Za-z]/g, ""))}
                  onKeyDown={(event) => event.key === "Enter" && handleVerify()}
                />
              </div>
              <Button
                onClick={handleVerify}
                disabled={isSubmitting}
                className="w-full bg-[#4F46E5] hover:bg-[#4338CA]"
              >
                <ShieldCheck className="size-4 mr-2" />
                {isSubmitting ? "Verificando..." : "Verificar y activar"}
              </Button>
              <button
                type="button"
                onClick={resendCode}
                disabled={isResending}
                className="w-full rounded-lg px-3 py-2 text-sm font-medium text-[#4F46E5] transition-colors hover:bg-purple-50 hover:text-[#4338CA] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Mail className="mr-2 inline size-4" />
                {isResending ? "Reenviando..." : "Reenviar codigo"}
              </button>
            </>
          )}

          {step === "done" && (
            <div className="space-y-4 text-center">
              <div className="mx-auto grid size-14 place-items-center rounded-full bg-emerald-100 text-emerald-600">
                <CheckCircle2 className="size-7" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Cuenta de delegado activa</h2>
                <p className="mt-1 text-sm text-gray-600">Ya puedes iniciar sesion y gestionar tus lugares asignados.</p>
              </div>
              <Button onClick={() => navigate("/")} className="w-full bg-[#4F46E5] hover:bg-[#4338CA]">
                Continuar
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
