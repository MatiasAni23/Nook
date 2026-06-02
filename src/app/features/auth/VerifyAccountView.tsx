import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { ArrowLeft, CheckCircle2, Mail, ShieldCheck } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import {
  ensureAppUserRecord,
  resendSignupVerificationCode,
  verifySignupCode,
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

function getVerificationErrorMessage(error: unknown) {
  if (!(error instanceof Error)) return "No se pudo completar la accion.";

  const message = error.message.toLowerCase();

  if (message.includes("otp") || message.includes("token")) {
    return "El codigo no es valido o ya expiro. Revisa el correo o solicita otro codigo.";
  }

  if (message.includes("rate limit")) {
    return "Espera un momento antes de solicitar otro codigo.";
  }

  return error.message;
}

export function VerifyAccountView() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState(searchParams.get("email") ?? "");
  const [code, setCode] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [isVerified, setIsVerified] = useState(false);

  const resendCode = async () => {
    const emailError = getEmailValidationMessage(email);

    if (emailError) {
      setErrorMessage(emailError);
      return;
    }

    setIsResending(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      await resendSignupVerificationCode(email.trim());
      setSuccessMessage("Te enviamos un nuevo codigo de verificacion.");
    } catch (error) {
      setErrorMessage(getVerificationErrorMessage(error));
    } finally {
      setIsResending(false);
    }
  };

  const verifyCode = async () => {
    const emailError = getEmailValidationMessage(email);
    const cleanCode = code.replace(/\s/g, "");

    if (emailError) {
      setErrorMessage(emailError);
      return;
    }

    if (cleanCode.length < 6) {
      setErrorMessage("Ingresa el codigo completo.");
      return;
    }

    setIsVerifying(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const { user } = await verifySignupCode(email.trim(), cleanCode);

      if (user) {
        await ensureAppUserRecord(user);
      }

      setIsVerified(true);
    } catch (error) {
      setErrorMessage(getVerificationErrorMessage(error));
    } finally {
      setIsVerifying(false);
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
          <CardTitle className="text-2xl">Verifica tu cuenta</CardTitle>
          <p className="text-sm text-gray-600">
            Ingresa el codigo que enviamos a tu correo para activar tu cuenta.
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

          {!isVerified ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="verify-email">Correo electronico</Label>
                <Input
                  id="verify-email"
                  type="email"
                  placeholder="tu@email.cl"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="verify-code">Codigo de verificacion</Label>
                <Input
                  id="verify-code"
                  inputMode="numeric"
                  placeholder="123456"
                  value={code}
                  maxLength={12}
                  onChange={(event) => setCode(event.target.value.replace(/[^\dA-Za-z]/g, ""))}
                  onKeyDown={(event) => event.key === "Enter" && verifyCode()}
                />
              </div>

              <Button
                onClick={verifyCode}
                disabled={isVerifying}
                className="w-full bg-[#4F46E5] hover:bg-[#4338CA]"
              >
                <ShieldCheck className="size-4 mr-2" />
                {isVerifying ? "Verificando..." : "Verificar cuenta"}
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
          ) : (
            <div className="space-y-4 text-center">
              <div className="mx-auto grid size-14 place-items-center rounded-full bg-emerald-100 text-emerald-600">
                <CheckCircle2 className="size-7" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Cuenta verificada</h2>
                <p className="mt-1 text-sm text-gray-600">
                  Ahora completa tu perfil para comenzar a usar Nook.
                </p>
              </div>
              <Button
                onClick={() => navigate("/")}
                className="w-full bg-[#4F46E5] hover:bg-[#4338CA]"
              >
                Continuar
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
