import { BrandLogo } from "../../components/BrandLogo";
import { AuthBackground } from "./AuthBackground";
import { useId, useMemo, useState, type ComponentProps, type ReactNode } from "react";
import { useNavigate } from "react-router";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Eye, EyeOff, Lock, LogIn, Mail, Phone, User, UserPlus } from "lucide-react";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { Label } from "../../components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "../../components/ui/tabs";
import type { RegisterResult } from "../../services/authService";
import { LegalDocumentsDialog, type LegalDocument } from "./LegalDocumentsDialog";

interface LoginViewProps {
  onLogin: (email: string, password: string) => Promise<void> | void;
  onRegister?: (
    name: string,
    email: string,
    phone: string,
    password: string,
  ) => Promise<RegisterResult> | RegisterResult;
}

const emailPattern = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;

function isValidEmail(email: string) {
  return emailPattern.test(email.trim());
}

function getEmailValidationMessage(email: string) {
  const trimmedEmail = email.trim();

  if (!trimmedEmail) return "Ingresa tu correo.";
  if (!trimmedEmail.includes("@")) return "El correo debe contener @.";

  const [, domain = ""] = trimmedEmail.split("@");
  if (!domain.includes(".")) return "El dominio del correo debe contener un punto.";
  if (!isValidEmail(trimmedEmail)) return "Ingresa un correo valido.";

  return "";
}

function getPhoneInputDigits(value: string) {
  return value.replace(/\D/g, "").slice(0, 8);
}

function isValidChileMobileDigits(digits: string) {
  return /^\d{8}$/.test(digits);
}

function normalizeChilePhone(digits: string) {
  return `+569${digits}`;
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

function getAuthErrorMessage(error: unknown) {
  if (!(error instanceof Error)) {
    return "No se pudo completar la accion.";
  }

  const message = error.message.toLowerCase();

  if (message.includes("invalid login credentials")) {
    return "Correo o contraseña incorrectos. Verifica que el usuario exista en Supabase Auth.";
  }

  if (message.includes("email not confirmed")) {
    return "Debes confirmar tu correo antes de iniciar sesion.";
  }

  if (message.includes("user already registered") || message.includes("already registered")) {
    return "Este correo ya esta registrado. Intenta iniciar sesion.";
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
      className="absolute right-0 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-xl text-slate-500 transition hover:bg-[#EEF2FF] hover:text-[#4F46E5] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4F46E5]"
      aria-label={label}
      title={label}
    >
      {isVisible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
    </button>
  );
}

function AuthField({
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
      <div className="group relative flex min-h-12 items-center rounded-2xl border border-[#E0E7FF] bg-white px-4 shadow-[0_6px_16px_rgba(79,70,229,0.04)] transition focus-within:border-[#4F46E5] focus-within:bg-[#F8FAFF] focus-within:ring-3 focus-within:ring-[#4F46E5]/10">
        <Icon aria-hidden="true" className="mr-3 size-4 shrink-0 text-[#8B93F5] transition group-focus-within:text-[#4F46E5]" />
        {children}
      </div>
    </div>
  );
}

function AuthInput(props: ComponentProps<typeof Input>) {
  return (
    <Input
      {...props}
      className={`h-11 border-0 bg-transparent px-0 text-base text-slate-900 shadow-none outline-none placeholder:text-slate-400 focus-visible:border-0 focus-visible:ring-0 md:text-sm ${
        props.className ?? ""
      }`}
    />
  );
}

function PrimaryAuthButton({
  children,
  className = "",
  ...props
}: ComponentProps<typeof Button>) {
  return (
    <Button
      {...props}
      className={`h-12 w-full rounded-2xl bg-[#4F46E5] font-black text-white shadow-[0_14px_24px_rgba(79,70,229,0.24)] transition hover:bg-[#4338CA] focus-visible:ring-[#4F46E5]/40 ${className}`}
    >
      {children}
    </Button>
  );
}

function HeroDecor() {
  const id = useId();
  const edge = "M80 0 C48 120 48 200 80 320 C112 440 112 520 80 640 C48 760 48 820 80 900";
  const surface = `${edge} H128 V0 Z`;

  return (
      <svg
        className="pointer-events-none absolute right-[-1px] top-0 hidden h-full w-24 text-white md:block lg:w-32"
        viewBox="0 0 128 900"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <defs>
          <clipPath id={`${id}-surface`}><path d={surface} /></clipPath>
          <filter id={`${id}-shadow`} x="-100%" y="-10%" width="300%" height="120%">
            <feGaussianBlur stdDeviation="7" />
            <feOffset dx="10" dy="2" />
          </filter>
        </defs>
        <path d={surface} fill="currentColor" />
        <g clipPath={`url(#${id}-surface)`}>
          <path d={edge} fill="none" stroke="#1E1B4B" strokeOpacity=".22" strokeWidth="22" filter={`url(#${id}-shadow)`} />
        </g>
        <path d={edge} fill="none" stroke="white" strokeOpacity=".65" strokeWidth="1" />
      </svg>
  );
}

export function LoginView({ onLogin, onRegister }: LoginViewProps) {
  const navigate = useNavigate();
  const prefersReducedMotion = useReducedMotion();
  const [activeTab, setActiveTab] = useState("login");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [registerName, setRegisterName] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPhone, setRegisterPhone] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerPasswordConfirm, setRegisterPasswordConfirm] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showRegisterPasswordConfirm, setShowRegisterPasswordConfirm] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [legalDocument, setLegalDocument] = useState<LegalDocument | null>(null);

  const passwordScore = useMemo(() => getPasswordScore(registerPassword), [registerPassword]);
  const passwordStrength = getPasswordStrength(passwordScore);
  const passwordsMatch =
    registerPasswordConfirm.length > 0 && registerPassword === registerPasswordConfirm;
  const passwordsMismatch =
    registerPasswordConfirm.length > 0 && registerPassword !== registerPasswordConfirm;

  const clearLoginForm = () => {
    setLoginEmail("");
    setLoginPassword("");
    setShowLoginPassword(false);
  };

  const clearRegisterForm = () => {
    setRegisterName("");
    setRegisterEmail("");
    setRegisterPhone("");
    setRegisterPassword("");
    setRegisterPasswordConfirm("");
    setShowRegisterPassword(false);
    setShowRegisterPasswordConfirm(false);
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setErrorMessage("");
    setIsSubmitting(false);

    if (value === "login") {
      clearRegisterForm();
      return;
    }

    clearLoginForm();
  };

  const handleLogin = async () => {
    if (!loginEmail || !loginPassword) {
      setErrorMessage("Ingresa tu correo y contraseña.");
      return;
    }

    const loginEmailError = getEmailValidationMessage(loginEmail);
    if (loginEmailError) {
      setErrorMessage(loginEmailError);
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      await onLogin(loginEmail.trim(), loginPassword);
    } catch (error) {
      setErrorMessage(getAuthErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegister = async () => {
    if (!registerName.trim()) {
      setErrorMessage("Ingresa tu nombre completo.");
      return;
    }

    const registerEmailError = getEmailValidationMessage(registerEmail);
    if (registerEmailError) {
      setErrorMessage(registerEmailError);
      return;
    }

    if (!isValidChileMobileDigits(registerPhone)) {
      setErrorMessage("Ingresa los 8 digitos restantes de tu telefono. Ej: +56 9 1234 5678.");
      return;
    }

    if (passwordScore < 3) {
      setErrorMessage("La contraseña debe tener al menos 8 caracteres y combinar letras con numeros.");
      return;
    }

    if (registerPassword !== registerPasswordConfirm) {
      setErrorMessage("Las contraseñas no coinciden.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      if (onRegister) {
        const result = await onRegister(
          registerName.trim(),
          registerEmail.trim(),
          normalizeChilePhone(registerPhone),
          registerPassword,
        );

        if (result.needsEmailVerification) {
          navigate(`/verify-account?email=${encodeURIComponent(result.email)}`);
          return;
        }
      }

      setRegisterName("");
      setRegisterEmail("");
      setRegisterPhone("");
      setRegisterPassword("");
      setRegisterPasswordConfirm("");
    } catch (error) {
      setErrorMessage(getAuthErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="pinwi-auth min-h-screen w-full overflow-y-auto bg-white">
      <div className="relative mx-auto flex min-h-screen w-full flex-col overflow-hidden bg-white md:flex-row">
        <section className="relative overflow-hidden px-6 pb-12 pt-6 text-white sm:px-8 md:sticky md:top-0 md:flex md:min-h-screen md:w-[42%] md:self-start md:items-center md:justify-center md:px-8 md:py-20 lg:w-[45%] lg:px-12">
          <AuthBackground />
          <HeroDecor />
          <div className="relative z-10 md:max-w-[14.5rem] md:pr-6 lg:max-w-[25rem] lg:pr-8 lg:text-center">
            <div className="mb-10 hidden md:block lg:mb-12">
              <motion.div
                className="mx-auto grid w-44 place-items-center rounded-[2rem] bg-white px-4 py-5 shadow-[0_18px_44px_rgba(24,31,100,0.18)] lg:w-60 lg:rounded-[2.5rem] lg:px-5 lg:py-6"
                animate={prefersReducedMotion ? undefined : { y: [0, -3, 0] }}
                transition={{ duration: 4.2, repeat: Infinity, ease: "easeInOut" }}
              >
                <BrandLogo variant="full" className="w-36 lg:w-48" />
              </motion.div>
            </div>
            <h1 className="max-w-[20rem] text-[1.625rem] font-bold leading-[1.2] tracking-tight md:text-[1.85rem] lg:mx-auto lg:max-w-[23rem] lg:text-[2.25rem]">
              <span className="lg:hidden">Encuentra tu espacio favorito</span>
              <span className="hidden lg:inline">Tu próximo espacio favorito está a un clic</span>
            </h1>
            <p className="mt-2 max-w-[20rem] text-[0.8125rem] leading-relaxed text-white/90 md:text-sm lg:mx-auto lg:mt-4 lg:max-w-[20rem] lg:text-base">
              Descubre cafés, bibliotecas y espacios de coworking en Chile.
            </p>
          </div>
        </section>

        <section className="relative z-10 -mt-6 flex-1 rounded-t-[2rem] bg-white px-6 pb-8 pt-7 shadow-[0_-12px_32px_rgba(30,27,75,0.10)] sm:px-8 md:mt-0 md:flex md:min-h-screen md:w-[58%] md:items-center md:justify-center md:rounded-none md:px-8 md:py-10 md:shadow-none lg:w-[55%] lg:px-12">
          <motion.div
            className="mx-auto w-full max-w-md bg-white md:px-4 lg:px-5"
            initial={prefersReducedMotion ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.3, ease: "easeOut" }}
          >
            <div>
              <div className="mb-6 lg:mb-7">
                <div className="mb-5 md:hidden">
                  <BrandLogo />
                </div>
                <h2 className="text-2xl font-black tracking-normal text-[#1E1B4B] lg:text-3xl">
                  {activeTab === "login" ? "Bienvenido de vuelta" : "Crea tu cuenta"}
                </h2>
                <p className="mt-1 text-sm font-medium leading-relaxed text-slate-500">
                  {activeTab === "login" ? "Ingresa tus datos para seguir explorando." : "Encuentra un lugar para estudiar, trabajar y conectar."}
                </p>
              </div>

              <Tabs value={activeTab} onValueChange={handleTabChange} className="gap-0">
                <TabsList className="relative mb-6 grid h-[3.25rem] w-full grid-cols-2 rounded-2xl bg-[#EEF2FF] p-1">
                  {["login", "register"].map((tab) => (
                    <TabsTrigger
                      key={tab}
                      value={tab}
                      disabled={isSubmitting}
                      className="relative z-10 h-11 rounded-xl bg-transparent text-sm font-black text-[#6D64CC] transition data-[state=active]:text-white data-[state=active]:shadow-none"
                    >
                      {activeTab === tab && (
                        <motion.span
                          layoutId="auth-tab-pill"
                          className="absolute inset-0 -z-10 rounded-xl bg-[#4F46E5] shadow-[0_10px_18px_rgba(79,70,229,0.22)]"
                          transition={prefersReducedMotion ? { duration: 0 } : { type: "spring", stiffness: 430, damping: 34 }}
                        />
                      )}
                      {tab === "login" ? (
                        <>
                          <LogIn className="size-4" />
                          Iniciar sesión
                        </>
                      ) : (
                        <>
                          <UserPlus className="size-4" />
                          Registrarse
                        </>
                      )}
                    </TabsTrigger>
                  ))}
                </TabsList>

                <AnimatePresence mode="wait">
                  {errorMessage && (
                    <motion.div
                      role="alert"
                      className="mb-5 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
                      initial={prefersReducedMotion ? false : { opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
                    >
                      {errorMessage}
                    </motion.div>
                  )}
                </AnimatePresence>

                <AnimatePresence mode="wait">
                  {activeTab === "login" ? (
                    <motion.div
                      key="login"
                      className="space-y-5"
                      initial={prefersReducedMotion ? false : { opacity: 0, x: -18 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 18 }}
                      transition={{ duration: prefersReducedMotion ? 0 : 0.22 }}
                    >
                      <AuthField id="login-email" label="Correo electrónico" icon={Mail}>
                        <AuthInput
                          id="login-email"
                          type="email"
                          autoComplete="username"
                          inputMode="email"
                          autoCapitalize="none"
                          spellCheck={false}
                          name="email"
                          placeholder="tu@email.cl"
                          value={loginEmail}
                          onChange={(e) => setLoginEmail(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                        />
                      </AuthField>
                      <AuthField id="login-password" label="Contraseña" icon={Lock}>
                        <div className="relative w-full">
                          <AuthInput
                            id="login-password"
                            type={showLoginPassword ? "text" : "password"}
                            placeholder="********"
                            value={loginPassword}
                            autoComplete="current-password"
                            name="password"
                            className="pr-10"
                            onChange={(e) => setLoginPassword(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                          />
                          <PasswordVisibilityButton
                            isVisible={showLoginPassword}
                            onClick={() => setShowLoginPassword((value) => !value)}
                            label={showLoginPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                          />
                        </div>
                      </AuthField>
                      <PrimaryAuthButton
                        onClick={handleLogin}
                        disabled={isSubmitting}
                        className="mt-3"
                      >
                        <LogIn className="size-4" />
                        {isSubmitting ? "Ingresando..." : "Iniciar sesión"}
                      </PrimaryAuthButton>
                      <button
                        type="button"
                        onClick={() => navigate("/recover-password")}
                        className="min-h-11 w-full rounded-xl px-3 py-2 text-sm font-semibold text-[#4F46E5] transition hover:bg-[#EEF2FF] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4F46E5]"
                      >
                        Olvidé mi contraseña
                      </button>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="register"
                      className="space-y-4"
                      initial={prefersReducedMotion ? false : { opacity: 0, x: 18 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -18 }}
                      transition={{ duration: prefersReducedMotion ? 0 : 0.22 }}
                    >
                      <AuthField id="register-name" label="Nombre completo" icon={User}>
                        <AuthInput
                          id="register-name"
                          name="name"
                          autoComplete="name"
                          placeholder="Tu nombre"
                          value={registerName}
                          onChange={(e) => setRegisterName(e.target.value)}
                        />
                      </AuthField>
                      <AuthField id="register-email" label="Correo electrónico" icon={Mail}>
                        <AuthInput
                          id="register-email"
                          type="email"
                          name="email"
                          autoComplete="email"
                          autoCapitalize="none"
                          spellCheck={false}
                          inputMode="email"
                          placeholder="tu@email.cl"
                          value={registerEmail}
                          onChange={(e) => setRegisterEmail(e.target.value)}
                        />
                      </AuthField>
                      <AuthField id="register-phone" label="Teléfono" icon={Phone}>
                        <div className="flex w-full items-center">
                          <span className="mr-2 whitespace-nowrap text-sm font-semibold text-slate-600">
                            +56 9
                          </span>
                          <AuthInput
                            id="register-phone"
                            name="phone"
                            type="tel"
                            inputMode="numeric"
                            placeholder="1234 5678"
                            value={registerPhone}
                            maxLength={8}
                            onChange={(e) => setRegisterPhone(getPhoneInputDigits(e.target.value))}
                            onPaste={(e) => {
                              e.preventDefault();
                              setRegisterPhone(getPhoneInputDigits(e.clipboardData.getData("text")));
                            }}
                          />
                        </div>
                      </AuthField>
                      <AuthField id="register-password" label="Contraseña" icon={Lock}>
                        <div className="relative w-full">
                          <AuthInput
                            id="register-password"
                            name="new-password"
                            autoComplete="new-password"
                            type={showRegisterPassword ? "text" : "password"}
                            placeholder="********"
                            value={registerPassword}
                            className="pr-10"
                            onChange={(e) => setRegisterPassword(e.target.value)}
                          />
                          <PasswordVisibilityButton
                            isVisible={showRegisterPassword}
                            onClick={() => setShowRegisterPassword((value) => !value)}
                            label={
                              showRegisterPassword ? "Ocultar contraseña" : "Mostrar contraseña"
                            }
                          />
                        </div>
                      </AuthField>
                      <div className="space-y-1.5">
                        <div className="h-2 overflow-hidden rounded-full bg-[#EEF2FF]">
                          <motion.div
                            className={`h-full rounded-full ${passwordStrength.color}`}
                            animate={{ width: registerPassword ? passwordStrength.width : "0%" }}
                            transition={{ duration: prefersReducedMotion ? 0 : 0.3 }}
                          />
                        </div>
                        <p className="text-xs font-medium text-slate-600">
                          Seguridad: {registerPassword ? passwordStrength.label : "Sin datos"}
                        </p>
                      </div>
                      <AuthField id="register-password-confirm" label="Confirmar contraseña" icon={Lock}>
                        <div className="relative w-full">
                          <AuthInput
                            id="register-password-confirm"
                            name="password-confirmation"
                            autoComplete="new-password"
                            type={showRegisterPasswordConfirm ? "text" : "password"}
                            placeholder="********"
                            value={registerPasswordConfirm}
                            className="pr-10"
                            onChange={(e) => setRegisterPasswordConfirm(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleRegister()}
                          />
                          <PasswordVisibilityButton
                            isVisible={showRegisterPasswordConfirm}
                            onClick={() => setShowRegisterPasswordConfirm((value) => !value)}
                            label={
                              showRegisterPasswordConfirm
                                ? "Ocultar contraseña"
                                : "Mostrar contraseña"
                            }
                          />
                        </div>
                      </AuthField>
                      {passwordsMatch && (
                        <p className="text-xs font-medium text-green-600">
                          Las contraseñas coinciden.
                        </p>
                      )}
                      {passwordsMismatch && (
                        <p className="text-xs font-medium text-red-600">
                          Las contraseñas no coinciden.
                        </p>
                      )}
                      <PrimaryAuthButton onClick={handleRegister} disabled={isSubmitting}>
                        <UserPlus className="size-4" />
                        {isSubmitting ? "Creando..." : "Crear cuenta"}
                      </PrimaryAuthButton>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Tabs>
              <p className="mt-6 border-t border-slate-100 pt-4 text-center text-xs leading-6 text-slate-600">
                Consulta nuestros{" "}
                <button type="button" onClick={() => setLegalDocument("terms")} className="inline-block min-h-11 rounded-md px-1 text-xs font-semibold text-[#4F46E5] underline decoration-[#4F46E5]/30 underline-offset-4 focus-visible:outline-2 focus-visible:outline-[#4F46E5]">Términos</button>{" "}
                y la{" "}
                <button type="button" onClick={() => setLegalDocument("privacy")} className="inline-block min-h-11 rounded-md px-1 text-xs font-semibold text-[#4F46E5] underline decoration-[#4F46E5]/30 underline-offset-4 focus-visible:outline-2 focus-visible:outline-[#4F46E5]">Política de privacidad</button>
              </p>
            </div>
          </motion.div>
        </section>
      </div>
      <LegalDocumentsDialog document={legalDocument} onDocumentChange={setLegalDocument} />
    </div>
  );
}
