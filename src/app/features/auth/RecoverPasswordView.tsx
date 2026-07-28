import { useMemo, useState, type ComponentProps, type ReactNode } from "react";
import { useNavigate } from "react-router";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  LockKeyhole,
  Mail,
  MapPin,
  ShieldCheck,
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import {
  completePasswordRecovery,
  sendPasswordRecoveryCode,
  signOut,
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
  if (score <= 1) return { label: "Muy débil", color: "bg-red-500", width: "20%" };
  if (score === 2) return { label: "Debil", color: "bg-orange-500", width: "40%" };
  if (score === 3) return { label: "Aceptable", color: "bg-yellow-500", width: "60%" };
  if (score === 4) return { label: "Buena", color: "bg-blue-500", width: "80%" };
  return { label: "Fuerte", color: "bg-green-500", width: "100%" };
}

function getRecoveryErrorMessage(error: unknown) {
  if (!(error instanceof Error)) return "No se pudo completar la acción.";

  const message = error.message.toLowerCase();

  if (message.includes("otp") || message.includes("token")) {
    return "El código no es válido o ya expiró. Solicita uno nuevo e intenta otra vez.";
  }

  if (message.includes("rate limit")) {
    return "Espera un momento antes de solicitar otro código.";
  }

  if (message.includes("new password should be different from the old password")) {
    return "La nueva contraseña debe ser diferente a la anterior.";
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
        </g>
        <g fill="white" opacity="0.42">
          <circle cx="235" cy="420" r="5" />
          <circle cx="390" cy="455" r="4" />
          <circle cx="995" cy="420" r="5" />
          <circle cx="1195" cy="455" r="4" />
          <circle cx="210" cy="610" r="4" />
          <circle cx="1005" cy="710" r="4" />
        </g>
      </svg>

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
          <circle cx="1040" cy="192" r="2.2" opacity="0.42" />
          <circle cx="1178" cy="618" r="1.7" opacity="0.36" />
          <circle cx="1324" cy="118" r="2" opacity="0.46" />
          <circle cx="262" cy="818" r="2.1" opacity="0.40" />
          <circle cx="720" cy="822" r="1.9" opacity="0.38" />
          <circle cx="150" cy="520" r="1.7" opacity="0.36" />
          <circle cx="365" cy="575" r="1.3" opacity="0.30" />
          <circle cx="1092" cy="410" r="1.6" opacity="0.34" />
        </g>
        <g fill="white" opacity="0.18">
          <circle cx="92" cy="86" r="5" />
          <circle cx="322" cy="118" r="6" />
          <circle cx="778" cy="82" r="5.5" />
          <circle cx="1040" cy="192" r="6" />
          <circle cx="1324" cy="118" r="5.5" />
          <circle cx="262" cy="818" r="5.5" />
          <circle cx="720" cy="822" r="5" />
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
    </div>
  );
}

function RecoveryField({
  id,
  label,
  icon: Icon,
  children,
}: {
  id: string;
  label: string;
  icon: typeof Mail;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label
        htmlFor={id}
        className="text-[0.68rem] font-black uppercase tracking-[0.18em] text-[#4F46E5]"
      >
        {label}
      </Label>
      <div className="group relative flex min-h-12 items-center rounded-2xl border border-[#E0E7FF] bg-white px-4 shadow-[0_6px_16px_rgba(79,70,229,0.04)] transition focus-within:border-[#4F46E5] focus-within:bg-[#F8FAFF] focus-within:shadow-[0_10px_22px_rgba(79,70,229,0.09)]">
        <Icon className="mr-3 size-4 shrink-0 text-[#8B93F5] transition group-focus-within:text-[#4F46E5]" />
        {children}
      </div>
    </div>
  );
}

function RecoveryInput(props: ComponentProps<typeof Input>) {
  return (
    <Input
      {...props}
      className={`h-11 border-0 bg-transparent px-0 text-sm shadow-none outline-none placeholder:text-[#BFC4F8] focus-visible:border-0 focus-visible:ring-0 ${props.className ?? ""}`}
    />
  );
}

function PrimaryRecoveryButton({ children, className = "", ...props }: ComponentProps<typeof Button>) {
  return (
    <Button
      {...props}
      className={`h-12 w-full rounded-2xl bg-[#4F46E5] font-black text-white shadow-[0_14px_24px_rgba(79,70,229,0.24)] transition-all hover:-translate-y-0.5 hover:bg-[#4338CA] hover:shadow-[0_18px_30px_rgba(79,70,229,0.28)] active:translate-y-0 ${className}`}
    >
      {children}
    </Button>
  );
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
      className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full p-1 text-[#7C83E8] transition hover:bg-[#EEF2FF] hover:text-[#4F46E5]"
      aria-label={label}
      title={label}
    >
      {isVisible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
    </button>
  );
}

const stepLabels = ["Correo", "Código", "Contraseña"];

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
  const [isSubmitting, setIsSubmitting] = useState(false);

  const passwordScore = useMemo(() => getPasswordScore(password), [password]);
  const passwordStrength = getPasswordStrength(passwordScore);
  const passwordsMismatch = passwordConfirm.length > 0 && password !== passwordConfirm;
  const currentStep = step === "email" ? 0 : step === "code" ? 1 : 2;

  const requestCode = async () => {
    const emailError = getEmailValidationMessage(email);

    if (emailError) {
      setErrorMessage(emailError);
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      await sendPasswordRecoveryCode(email.trim());
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
      setErrorMessage("Ingresa el código completo.");
      return;
    }

    setErrorMessage("");
    setCode(cleanCode);
    setStep("password");
  };

  const updatePassword = async () => {
    if (passwordScore < 3) {
      setErrorMessage("La contraseña debe tener al menos 8 caracteres y combinar letras con números.");
      return;
    }

    if (password !== passwordConfirm) {
      setErrorMessage("Las contraseñas no coinciden.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      await completePasswordRecovery(email, code, password);
      setStep("done");
    } catch (error) {
      setErrorMessage(getRecoveryErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const returnToLogin = async () => {
    setIsSubmitting(true);
    setErrorMessage("");

    try {
      // Verifying a recovery code creates a temporary Supabase session.
      await signOut();
      navigate("/", { replace: true });
    } catch (error) {
      setErrorMessage(getRecoveryErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const title =
    step === "email"
      ? "Recupera tu acceso"
      : step === "code"
        ? "Revisa tu correo"
        : step === "password"
          ? "Crea una contraseña nueva"
          : "Contraseña actualizada";
  const description =
    step === "email"
      ? "Ingresa tu correo y te enviaremos un código para recuperar tu cuenta."
      : step === "code"
        ? "Escribe el código de recuperación que enviamos a tu correo."
        : step === "password"
          ? "Elige una contraseña segura para volver a entrar a Nook."
          : "Tu cuenta ya tiene una nueva contraseña. Puedes iniciar sesión.";

  return (
    <div className="relative min-h-screen w-full overflow-y-auto bg-[#4F46E5] px-4 py-8">
      <MapBackground />

      <div className="relative z-10 flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <motion.div
          className="w-full max-w-md overflow-hidden rounded-[1.65rem] border border-[#E0E7FF] bg-white shadow-[0_24px_60px_rgba(79,70,229,0.18)]"
          initial={{ opacity: 0, y: 18, scale: 0.985 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.32, ease: "easeOut" }}
        >
          <div className="px-5 pb-6 pt-6 sm:px-6">
            <button
              type="button"
              onClick={() => void returnToLogin()}
              disabled={isSubmitting}
              className="mb-6 inline-flex w-fit items-center gap-2 rounded-xl px-2 py-1 text-sm font-black text-slate-400 transition hover:bg-[#EEF2FF] hover:text-[#4F46E5] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <ArrowLeft className="size-4" />
              Volver al inicio de sesión
            </button>

            <div className="mb-6">
              <div className="flex items-center gap-3">
                <div className={`grid size-11 shrink-0 place-items-center rounded-2xl ${step === "done" ? "bg-emerald-100 text-emerald-600" : "bg-[#EEF2FF] text-[#4F46E5]"}`}>
                  {step === "done" ? <CheckCircle2 className="size-5" /> : <ShieldCheck className="size-5" />}
                </div>
                <h1 className="text-2xl font-black tracking-normal text-[#1E1B4B]">{title}</h1>
              </div>
              {step !== "done" && (
                <div className="mt-4 grid grid-cols-3 gap-2">
                  {stepLabels.map((label, index) => {
                    const isComplete = index < currentStep;
                    const isCurrent = index === currentStep;

                    return (
                      <div key={label} className="space-y-1.5">
                        <div className="h-1.5 overflow-hidden rounded-full bg-[#EEF2FF]">
                          <motion.div
                            className="h-full rounded-full bg-[#86EFAC]"
                            animate={{ width: isComplete || isCurrent ? "100%" : "0%" }}
                            transition={{ duration: 0.3 }}
                          />
                        </div>
                        <p className={`text-[0.62rem] font-black uppercase tracking-[0.12em] ${isCurrent ? "text-[#4F46E5]" : "text-slate-300"}`}>
                          {label}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
              <p className="mt-4 max-w-sm text-sm font-medium leading-6 text-slate-500">{description}</p>
            </div>

            <AnimatePresence mode="wait">
              {errorMessage && (
                <motion.div
                  className="mb-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                >
                  {errorMessage}
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence mode="wait">
              {step === "email" && (
                <motion.div key="email" className="space-y-5" initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 14 }} transition={{ duration: 0.2 }}>
                  <RecoveryField id="recover-email" label="Correo electronico" icon={Mail}>
                    <RecoveryInput
                      id="recover-email"
                      type="email"
                      placeholder="tu@email.cl"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      onKeyDown={(event) => event.key === "Enter" && requestCode()}
                    />
                  </RecoveryField>
                  <PrimaryRecoveryButton onClick={requestCode} disabled={isSubmitting}>
                    <Mail className="mr-2 size-4" />
                    {isSubmitting ? "Enviando..." : "Enviar código"}
                  </PrimaryRecoveryButton>
                </motion.div>
              )}

              {step === "code" && (
                <motion.div key="code" className="space-y-5" initial={{ opacity: 0, x: 14 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -14 }} transition={{ duration: 0.2 }}>
                  <RecoveryField id="recover-code" label="Código de recuperación" icon={KeyRound}>
                    <RecoveryInput
                      id="recover-code"
                      inputMode="numeric"
                      placeholder="123456"
                      value={code}
                      maxLength={12}
                      onChange={(event) => setCode(event.target.value.replace(/[^\dA-Za-z]/g, ""))}
                      onKeyDown={(event) => event.key === "Enter" && verifyCode()}
                    />
                  </RecoveryField>
                  <p className="-mt-2 text-xs font-medium text-slate-400">Enviado a {email.trim()}.</p>
                  <PrimaryRecoveryButton onClick={verifyCode} disabled={isSubmitting}>
                    <KeyRound className="mr-2 size-4" />
                    {isSubmitting ? "Verificando..." : "Verificar código"}
                  </PrimaryRecoveryButton>
                  <button type="button" onClick={requestCode} disabled={isSubmitting} className="w-full rounded-xl px-3 py-2 text-sm font-black text-[#4F46E5] transition hover:bg-[#EEF2FF] hover:text-[#4338CA] disabled:cursor-not-allowed disabled:opacity-60">
                    <Mail className="mr-2 inline size-4" />
                    Reenviar código
                  </button>
                </motion.div>
              )}

              {step === "password" && (
                <motion.div key="password" className="space-y-5" initial={{ opacity: 0, x: 14 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -14 }} transition={{ duration: 0.2 }}>
                  <RecoveryField id="new-password" label="Nueva contraseña" icon={LockKeyhole}>
                    <div className="relative w-full">
                      <RecoveryInput id="new-password" type={showPassword ? "text" : "password"} placeholder="********" value={password} className="pr-10" onChange={(event) => setPassword(event.target.value)} />
                      <PasswordVisibilityButton isVisible={showPassword} onClick={() => setShowPassword((value) => !value)} label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"} />
                    </div>
                  </RecoveryField>
                  <div className="-mt-3 space-y-1.5">
                    <div className="h-2 overflow-hidden rounded-full bg-[#EEF2FF]">
                      <motion.div className={`h-full rounded-full ${passwordStrength.color}`} animate={{ width: password ? passwordStrength.width : "0%" }} transition={{ duration: 0.3 }} />
                    </div>
                    <p className="text-xs font-medium text-slate-400">Seguridad: {password ? passwordStrength.label : "Sin datos"}</p>
                  </div>
                  <RecoveryField id="new-password-confirm" label="Confirmar contraseña" icon={LockKeyhole}>
                    <div className="relative w-full">
                      <RecoveryInput id="new-password-confirm" type={showPasswordConfirm ? "text" : "password"} placeholder="********" value={passwordConfirm} className="pr-10" onChange={(event) => setPasswordConfirm(event.target.value)} onKeyDown={(event) => event.key === "Enter" && updatePassword()} />
                      <PasswordVisibilityButton isVisible={showPasswordConfirm} onClick={() => setShowPasswordConfirm((value) => !value)} label={showPasswordConfirm ? "Ocultar contraseña" : "Mostrar contraseña"} />
                    </div>
                  </RecoveryField>
                  {passwordsMismatch && <p className="-mt-3 text-xs font-medium text-red-600">Las contraseñas no coinciden.</p>}
                  <PrimaryRecoveryButton onClick={updatePassword} disabled={isSubmitting}>
                    <LockKeyhole className="mr-2 size-4" />
                    {isSubmitting ? "Guardando..." : "Guardar nueva contraseña"}
                  </PrimaryRecoveryButton>
                </motion.div>
              )}

              {step === "done" && (
                <motion.div key="done" className="space-y-5" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.22 }}>
                  <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">Ya puedes iniciar sesión con tu nueva contraseña.</div>
                  <PrimaryRecoveryButton onClick={returnToLogin} disabled={isSubmitting}>
                    Volver al inicio de sesión
                  </PrimaryRecoveryButton>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
