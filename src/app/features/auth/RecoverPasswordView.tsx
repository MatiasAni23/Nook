import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, CheckCircle2, Eye, EyeOff, KeyRound, Mail } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import {
  sendPasswordRecoveryCode,
  signOut,
  updateRecoveredPassword,
  verifyPasswordRecoveryCode,
} from "../../services/authService";

const emailPattern = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;

function getEmailValidationMessage(email: string) {
  const trimmedEmail = email.trim();

  if (!trimmedEmail) return "Ingresa tu correo.";
  if (!trimmedEmail.includes("@")) return "El correo debe contener @.";

  const [, domain = ""] = trimmedEmail.split("@");
  if (!domain.includes(".")) return "El dominio del correo debe contener un punto.";
  if (!emailPattern.test(trimmedEmail)) return "Ingresa un correo valido.";

  return "";
}

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

function getRecoveryErrorMessage(error: unknown) {
  if (!(error instanceof Error)) return "No se pudo completar la accion.";

  const message = error.message.toLowerCase();

  if (message.includes("otp") || message.includes("token")) {
    return "El codigo no es valido o ya expiro. Solicita uno nuevo e intenta otra vez.";
  }

  if (message.includes("rate limit")) {
    return "Espera un momento antes de solicitar otro codigo.";
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

export function RecoverPasswordView() {
  const navigate = useNavigate();
  const [step, setStep] = useState<"email" | "code" | "password" | "done">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const passwordScore = useMemo(() => getPasswordScore(password), [password]);
  const passwordStrength = getPasswordStrength(passwordScore);
  const passwordsMismatch = passwordConfirm.length > 0 && password !== passwordConfirm;

  const requestCode = async () => {
    const emailError = getEmailValidationMessage(email);

    if (emailError) {
      setErrorMessage(emailError);
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      await sendPasswordRecoveryCode(email.trim());
      setSuccessMessage("Te enviamos un codigo de recuperacion al correo.");
      setStep("code");
    } catch (error) {
      setErrorMessage(getRecoveryErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const verifyCode = async () => {
    const cleanCode = code.replace(/\s/g, "");

    if (cleanCode.length < 6) {
      setErrorMessage("Ingresa el codigo completo.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      await verifyPasswordRecoveryCode(email.trim(), cleanCode);
      setStep("password");
    } catch (error) {
      setErrorMessage(getRecoveryErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const updatePassword = async () => {
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
      await updateRecoveredPassword(password);
      await signOut();
      setStep("done");
    } catch (error) {
      setErrorMessage(getRecoveryErrorMessage(error));
    } finally {
      setIsSubmitting(false);
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
          <CardTitle className="text-2xl">Recuperar contrasena</CardTitle>
          <p className="text-sm text-gray-600">
            Sigue los pasos para crear una nueva contrasena para tu cuenta.
          </p>
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

          {step === "email" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="recover-email">Correo electronico</Label>
                <Input
                  id="recover-email"
                  type="email"
                  placeholder="tu@email.cl"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  onKeyDown={(event) => event.key === "Enter" && requestCode()}
                />
              </div>
              <Button
                onClick={requestCode}
                disabled={isSubmitting}
                className="w-full bg-[#4F46E5] hover:bg-[#4338CA]"
              >
                <Mail className="size-4 mr-2" />
                {isSubmitting ? "Enviando..." : "Enviar codigo"}
              </Button>
            </>
          )}

          {step === "code" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="recover-code">Codigo de recuperacion</Label>
                <Input
                  id="recover-code"
                  inputMode="numeric"
                  placeholder="123456"
                  value={code}
                  maxLength={12}
                  onChange={(event) => setCode(event.target.value.replace(/[^\dA-Za-z]/g, ""))}
                  onKeyDown={(event) => event.key === "Enter" && verifyCode()}
                />
                <p className="text-xs text-gray-500">Revisa el correo {email.trim()}.</p>
              </div>
              <Button
                onClick={verifyCode}
                disabled={isSubmitting}
                className="w-full bg-[#4F46E5] hover:bg-[#4338CA]"
              >
                <KeyRound className="size-4 mr-2" />
                {isSubmitting ? "Verificando..." : "Verificar codigo"}
              </Button>
              <button
                type="button"
                onClick={requestCode}
                disabled={isSubmitting}
                className="w-full rounded-lg px-3 py-2 text-sm font-medium text-[#4F46E5] transition-colors hover:bg-purple-50 hover:text-[#4338CA] disabled:cursor-not-allowed disabled:opacity-60"
              >
                Reenviar codigo
              </button>
            </>
          )}

          {step === "password" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="new-password">Nueva contrasena</Label>
                <div className="relative">
                  <Input
                    id="new-password"
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
                  <p className="text-xs text-gray-500">
                    Seguridad: {password ? passwordStrength.label : "Sin datos"}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-password-confirm">Confirmar contrasena</Label>
                <div className="relative">
                  <Input
                    id="new-password-confirm"
                    type={showPasswordConfirm ? "text" : "password"}
                    placeholder="********"
                    value={passwordConfirm}
                    className="pr-10"
                    onChange={(event) => setPasswordConfirm(event.target.value)}
                    onKeyDown={(event) => event.key === "Enter" && updatePassword()}
                  />
                  <PasswordVisibilityButton
                    isVisible={showPasswordConfirm}
                    onClick={() => setShowPasswordConfirm((value) => !value)}
                    label={showPasswordConfirm ? "Ocultar contrasena" : "Mostrar contrasena"}
                  />
                </div>
                {passwordsMismatch && (
                  <p className="text-xs text-red-600">Las contrasenas no coinciden.</p>
                )}
              </div>

              <Button
                onClick={updatePassword}
                disabled={isSubmitting}
                className="w-full bg-[#4F46E5] hover:bg-[#4338CA]"
              >
                {isSubmitting ? "Guardando..." : "Guardar nueva contrasena"}
              </Button>
            </>
          )}

          {step === "done" && (
            <div className="space-y-4 text-center">
              <div className="mx-auto grid size-14 place-items-center rounded-full bg-emerald-100 text-emerald-600">
                <CheckCircle2 className="size-7" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Contrasena actualizada</h2>
                <p className="mt-1 text-sm text-gray-600">
                  Ya puedes iniciar sesion con tu nueva contrasena.
                </p>
              </div>
              <Button
                onClick={() => navigate("/")}
                className="w-full bg-[#4F46E5] hover:bg-[#4338CA]"
              >
                Volver al login
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
