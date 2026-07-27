import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { motion } from "motion/react";
import { ArrowLeft, CheckCircle2, KeyRound, Mail, MapPin, ShieldCheck } from "lucide-react";
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

function MapBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden bg-gradient-to-br from-[#4F46E5] to-[#4338CA]">
      <svg
        className="absolute inset-0 h-full w-full opacity-40 [mask-image:radial-gradient(circle_at_50%_50%,transparent_0%,transparent_24%,rgba(0,0,0,0.25)_36%,black_56%)]"
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
        <g fill="none" stroke="white" strokeLinecap="round">
          <path d="M-80 190 C140 140 220 270 390 225 S690 95 860 185 1110 350 1520 235" strokeWidth="4" opacity="0.52" />
          <path d="M-60 520 C190 450 330 560 520 500 S820 325 1010 420 1210 640 1510 560" strokeWidth="3" opacity="0.42" />
          <path d="M110 940 C235 700 205 510 340 365 S520 190 520 -80" strokeWidth="4" opacity="0.42" />
          <path d="M1030 950 C955 730 1005 545 1120 370 S1290 145 1260 -70" strokeWidth="4" opacity="0.38" />
          <path d="M-120 720 L210 610 L470 700 L750 620 L1005 710 L1510 590" strokeWidth="2" opacity="0.35" />
          <path d="M-80 355 L210 420 L455 335 L700 392 L940 310 L1510 390" strokeWidth="2" opacity="0.34" />
          <path d="M190 -90 C265 145 250 260 390 455 S555 745 500 980" strokeWidth="2" opacity="0.28" />
          <path d="M1220 -70 C1175 150 1110 250 1195 455 S1350 735 1285 970" strokeWidth="2" opacity="0.30" />
        </g>
        <g fill="white" opacity="0.45">
          <circle cx="235" cy="420" r="5" />
          <circle cx="390" cy="455" r="4" />
          <circle cx="995" cy="420" r="5" />
          <circle cx="1195" cy="455" r="4" />
          <circle cx="210" cy="610" r="4" />
          <circle cx="1005" cy="710" r="4" />
        </g>
      </svg>

      <div className="absolute left-1/2 top-1/2 h-[42rem] w-[42rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/[0.10] blur-3xl" />
      <svg
        className="absolute inset-0 h-full w-full opacity-70"
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
        <g fill="white">
          <circle cx="92" cy="86" r="1.8" opacity="0.45" />
          <circle cx="188" cy="248" r="1.4" opacity="0.40" />
          <circle cx="322" cy="118" r="2.1" opacity="0.34" />
          <circle cx="485" cy="690" r="1.6" opacity="0.40" />
          <circle cx="620" cy="164" r="1.5" opacity="0.32" />
          <circle cx="778" cy="82" r="2" opacity="0.38" />
          <circle cx="905" cy="740" r="1.5" opacity="0.33" />
          <circle cx="1040" cy="192" r="2.2" opacity="0.42" />
          <circle cx="1178" cy="618" r="1.7" opacity="0.36" />
          <circle cx="1324" cy="118" r="2" opacity="0.46" />
          <circle cx="1370" cy="772" r="1.5" opacity="0.34" />
          <circle cx="72" cy="734" r="1.5" opacity="0.34" />
          <circle cx="262" cy="818" r="2.1" opacity="0.40" />
          <circle cx="426" cy="340" r="1.5" opacity="0.30" />
          <circle cx="720" cy="822" r="1.9" opacity="0.38" />
          <circle cx="1115" cy="830" r="2.1" opacity="0.32" />
          <circle cx="150" cy="520" r="1.7" opacity="0.36" />
          <circle cx="365" cy="575" r="1.3" opacity="0.30" />
          <circle cx="540" cy="82" r="1.6" opacity="0.34" />
          <circle cx="680" cy="302" r="1.2" opacity="0.26" />
          <circle cx="842" cy="264" r="1.7" opacity="0.32" />
          <circle cx="965" cy="92" r="1.4" opacity="0.30" />
          <circle cx="1092" cy="410" r="1.6" opacity="0.34" />
          <circle cx="1248" cy="326" r="1.4" opacity="0.35" />
          <circle cx="1288" cy="548" r="1.9" opacity="0.38" />
          <circle cx="1018" cy="620" r="1.3" opacity="0.28" />
          <circle cx="594" cy="792" r="1.4" opacity="0.30" />
          <circle cx="300" cy="388" r="1.7" opacity="0.34" />
        </g>
        <g fill="white" opacity="0.18">
          <circle cx="92" cy="86" r="5" />
          <circle cx="322" cy="118" r="6" />
          <circle cx="778" cy="82" r="5.5" />
          <circle cx="1040" cy="192" r="6" />
          <circle cx="1324" cy="118" r="5.5" />
          <circle cx="262" cy="818" r="5.5" />
          <circle cx="720" cy="822" r="5" />
          <circle cx="1288" cy="548" r="5" />
        </g>
      </svg>

      <motion.div
        className="absolute left-[14%] top-[22%] hidden size-12 place-items-center rounded-2xl border border-white/20 bg-white/10 text-white shadow-[0_14px_28px_rgba(49,46,129,0.18)] md:grid"
        animate={{ y: [0, -8, 0], rotate: [0, 4, 0] }}
        transition={{ duration: 4.2, repeat: Infinity, ease: "easeInOut" }}
      >
        <MapPin className="size-5" />
      </motion.div>
      <motion.div
        className="absolute bottom-[20%] left-[23%] hidden size-12 place-items-center rounded-2xl border border-white/20 bg-white/10 text-white shadow-[0_14px_28px_rgba(49,46,129,0.18)] md:grid"
        animate={{ y: [0, 9, 0], scale: [1, 1.04, 1] }}
        transition={{ duration: 4.8, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
      >
        <MapPin className="size-5" />
      </motion.div>
      <motion.div
        className="absolute right-[16%] top-[24%] hidden size-10 place-items-center rounded-full border border-white/20 bg-white/10 text-white lg:grid"
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 3.8, repeat: Infinity, ease: "easeInOut", delay: 0.35 }}
      >
        <MapPin className="size-4" />
      </motion.div>
      <motion.div
        className="absolute bottom-[24%] right-[19%] hidden size-8 place-items-center rounded-full border border-white/15 bg-white/[0.08] text-white/80 lg:grid"
        animate={{ y: [0, 7, 0] }}
        transition={{ duration: 4.4, repeat: Infinity, ease: "easeInOut", delay: 0.55 }}
      >
        <MapPin className="size-3.5" />
      </motion.div>
    </div>
  );
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
      <MapBackground />

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

            <div className="mb-6 flex items-center gap-3">
              <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[#4F46E5] text-white shadow-[0_10px_20px_rgba(79,70,229,0.18)]">
                <MapPin className="size-5" />
              </div>
              <div>
                <p className="text-xl font-black text-[#1E1B4B]">Nook</p>
                <p className="text-xs font-bold text-slate-400">Activacion de cuenta</p>
              </div>
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
                      Ahora completa tu perfil para comenzar a usar Nook.
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
