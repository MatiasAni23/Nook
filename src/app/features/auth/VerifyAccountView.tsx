import { BrandLogo } from "../../components/BrandLogo";
import { AuthBackground } from "./AuthBackground";
import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { motion } from "motion/react";
import { ArrowLeft, CheckCircle2, KeyRound, Mail, ShieldCheck } from "lucide-react";
import { Button } from "../../components/ui/button";
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
    <div className="relative min-h-screen w-full overflow-y-auto bg-[#4F46E5] px-4 py-8">
      <AuthBackground variant="page" />

      <div className="relative z-10 flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <div className="w-full max-w-md overflow-hidden rounded-[1.65rem] border border-[#E0E7FF] bg-white shadow-[0_24px_60px_rgba(79,70,229,0.14)]">
          <div className="relative px-5 pb-6 pt-6 sm:px-6">
            <button
              type="button"
              onClick={() => navigate("/")}
              className="mb-6 inline-flex w-fit items-center gap-2 rounded-xl px-2 py-1 text-sm font-black text-slate-400 transition hover:bg-[#EEF2FF] hover:text-[#4F46E5]"
            >
              <ArrowLeft className="size-4" />
              Volver
            </button>

            <div className="mb-6">
              <BrandLogo />
              <p className="mt-2 text-xs font-bold text-slate-400">Activación de cuenta</p>
            </div>

            <div className="mb-6">
              <div className="mb-3 flex items-center gap-3">
                <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[#EEF2FF] text-[#4F46E5]">
                  <ShieldCheck className="size-5" />
                </div>
                <h1 className="text-2xl font-black tracking-normal text-[#1E1B4B]">
                  Verifica tu cuenta
                </h1>
              </div>
              <p className="mt-2 max-w-sm text-sm font-medium leading-6 text-slate-500">
                Ingresa el codigo que enviamos a tu correo para activar tu cuenta.
              </p>
            </div>

            <div className="space-y-4">
              {errorMessage && (
              <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                  {errorMessage}
                </div>
              )}

              {successMessage && (
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
                  {successMessage}
                </div>
              )}

              {!isVerified ? (
                <>
                  <div className="space-y-2">
                  <Label
                    htmlFor="verify-email"
                    className="text-xs font-black uppercase text-[#4F46E5]"
                  >
                    Correo electronico
                  </Label>
                  <div className="group relative flex min-h-12 items-center rounded-2xl border border-[#E0E7FF] bg-white px-4 shadow-[0_6px_16px_rgba(79,70,229,0.04)] transition focus-within:border-[#4F46E5] focus-within:bg-[#F8FAFF] focus-within:shadow-[0_10px_22px_rgba(79,70,229,0.09)]">
                    <Mail className="mr-3 size-4 shrink-0 text-[#8B93F5] transition group-focus-within:text-[#4F46E5]" />
                    <Input
                      id="verify-email"
                      type="email"
                      placeholder="tu@email.cl"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      className="h-11 border-0 bg-transparent px-0 text-sm shadow-none outline-none placeholder:text-[#BFC4F8] focus-visible:border-0 focus-visible:ring-0"
                    />
                  </div>
                  </div>

                  <div className="space-y-2">
                  <Label
                    htmlFor="verify-code"
                    className="text-xs font-black uppercase text-[#4F46E5]"
                  >
                    Codigo de verificacion
                  </Label>
                  <div className="group relative flex min-h-12 items-center rounded-2xl border border-[#E0E7FF] bg-white px-4 shadow-[0_6px_16px_rgba(79,70,229,0.04)] transition focus-within:border-[#4F46E5] focus-within:bg-[#F8FAFF] focus-within:shadow-[0_10px_22px_rgba(79,70,229,0.09)]">
                    <KeyRound className="mr-3 size-4 shrink-0 text-[#8B93F5] transition group-focus-within:text-[#4F46E5]" />
                    <Input
                      id="verify-code"
                      inputMode="numeric"
                      placeholder="123456"
                      value={code}
                      maxLength={12}
                      onChange={(event) => setCode(event.target.value.replace(/[^\dA-Za-z]/g, ""))}
                      onKeyDown={(event) => event.key === "Enter" && verifyCode()}
                      className="h-11 border-0 bg-transparent px-0 text-sm shadow-none outline-none placeholder:text-[#BFC4F8] focus-visible:border-0 focus-visible:ring-0"
                    />
                  </div>
                  </div>

                  <Button
                    onClick={verifyCode}
                    disabled={isVerifying}
                  className="h-12 w-full rounded-2xl bg-[#4F46E5] font-black text-white shadow-[0_14px_24px_rgba(79,70,229,0.24)] transition-all hover:-translate-y-0.5 hover:bg-[#4338CA] hover:shadow-[0_18px_30px_rgba(79,70,229,0.28)] active:translate-y-0"
                  >
                    <ShieldCheck className="mr-2 size-4" />
                    {isVerifying ? "Verificando..." : "Verificar cuenta"}
                  </Button>

                  <button
                    type="button"
                    onClick={resendCode}
                    disabled={isResending}
                  className="w-full rounded-xl px-3 py-2 text-sm font-black text-[#4F46E5] transition hover:bg-[#EEF2FF] hover:text-[#4338CA] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Mail className="mr-2 inline size-4" />
                    {isResending ? "Reenviando..." : "Reenviar codigo"}
                  </button>
                </>
              ) : (
                <div className="space-y-4 text-center">
                <div className="mx-auto grid size-16 place-items-center rounded-full bg-emerald-100 text-emerald-600 shadow-[0_14px_28px_rgba(16,185,129,0.16)]">
                  <CheckCircle2 className="size-8" />
                  </div>
                  <div>
                  <h2 className="text-xl font-black text-[#1E1B4B]">Cuenta verificada</h2>
                  <p className="mt-1 text-sm font-medium text-slate-500">
                      Ahora completa tu perfil para comenzar a usar Pinwi.
                    </p>
                  </div>
                  <Button
                    onClick={() => navigate("/")}
                  className="h-12 w-full rounded-2xl bg-[#4F46E5] font-black text-white shadow-[0_14px_24px_rgba(79,70,229,0.24)] hover:bg-[#4338CA]"
                  >
                    Continuar
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
