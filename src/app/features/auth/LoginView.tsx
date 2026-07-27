import { useMemo, useState, type ComponentProps, type ReactNode } from "react";
import { useNavigate } from "react-router";
import { AnimatePresence, motion } from "motion/react";
import { Eye, EyeOff, Lock, LogIn, Mail, MapPin, Phone, User, UserPlus } from "lucide-react";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { Label } from "../../components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "../../components/ui/tabs";
import type { RegisterResult } from "../../services/authService";

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
      className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full p-1 text-[#7C83E8] transition hover:bg-[#EEF2FF] hover:text-[#4F46E5]"
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
      <div className="group relative flex min-h-12 items-center rounded-2xl border border-[#E0E7FF] bg-white px-4 shadow-[0_6px_16px_rgba(79,70,229,0.04)] transition focus-within:border-[#4F46E5] focus-within:bg-[#F8FAFF] focus-within:shadow-[0_10px_22px_rgba(79,70,229,0.09)]">
        <Icon className="mr-3 size-4 shrink-0 text-[#8B93F5] transition group-focus-within:text-[#4F46E5]" />
        {children}
      </div>
    </div>
  );
}

function AuthInput(props: ComponentProps<typeof Input>) {
  return (
    <Input
      {...props}
      className={`h-11 border-0 bg-transparent px-0 text-sm shadow-none outline-none placeholder:text-[#BFC4F8] focus-visible:border-0 focus-visible:ring-0 ${
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
      className={`h-12 w-full rounded-2xl bg-[#4F46E5] font-black text-white shadow-[0_14px_24px_rgba(79,70,229,0.24)] transition-all hover:-translate-y-0.5 hover:bg-[#4338CA] hover:shadow-[0_18px_30px_rgba(79,70,229,0.28)] active:translate-y-0 ${className}`}
    >
      {children}
    </Button>
  );
}

function HeroDecor() {
  return (
    <>
      <svg
        className="absolute inset-0 h-full w-full opacity-35 [mask-image:linear-gradient(90deg,black_0%,black_78%,transparent_100%)]"
        viewBox="0 0 720 900"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
        <g fill="none" stroke="white" strokeLinecap="round">
          <path d="M-90 170 C70 110 170 230 315 182 S520 45 810 155" strokeWidth="4" opacity="0.48" />
          <path d="M-80 470 C85 420 205 515 365 455 S605 295 820 390" strokeWidth="3" opacity="0.40" />
          <path d="M60 930 C165 700 120 520 240 360 S415 165 390 -90" strokeWidth="4" opacity="0.38" />
          <path d="M-110 665 L105 590 L250 660 L445 595 L750 670" strokeWidth="2" opacity="0.32" />
          <path d="M-70 320 L145 375 L300 305 L510 352 L800 300" strokeWidth="2" opacity="0.30" />
          <path d="M605 -70 C560 150 510 250 575 440 S700 705 640 980" strokeWidth="2" opacity="0.28" />
        </g>
        <g fill="white" opacity="0.36">
          <circle cx="145" cy="375" r="4" />
          <circle cx="240" cy="360" r="4" />
          <circle cx="365" cy="455" r="5" />
          <circle cx="445" cy="595" r="4" />
          <circle cx="575" cy="440" r="4" />
        </g>
      </svg>

      <svg
        className="absolute inset-0 h-full w-full opacity-65"
        viewBox="0 0 720 900"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
        <g fill="white">
          <circle cx="68" cy="96" r="1.7" opacity="0.40" />
          <circle cx="150" cy="245" r="1.4" opacity="0.34" />
          <circle cx="258" cy="112" r="2" opacity="0.30" />
          <circle cx="392" cy="720" r="1.6" opacity="0.36" />
          <circle cx="502" cy="152" r="1.5" opacity="0.34" />
          <circle cx="632" cy="94" r="2" opacity="0.36" />
          <circle cx="645" cy="780" r="1.5" opacity="0.32" />
          <circle cx="52" cy="724" r="1.5" opacity="0.32" />
          <circle cx="220" cy="812" r="2" opacity="0.38" />
          <circle cx="338" cy="338" r="1.5" opacity="0.30" />
          <circle cx="585" cy="545" r="1.8" opacity="0.36" />
          <circle cx="120" cy="520" r="1.6" opacity="0.34" />
        </g>
        <g fill="white" opacity="0.14">
          <circle cx="68" cy="96" r="5" />
          <circle cx="258" cy="112" r="5.5" />
          <circle cx="632" cy="94" r="5.5" />
          <circle cx="220" cy="812" r="5" />
          <circle cx="585" cy="545" r="5" />
        </g>
      </svg>

      <motion.div
        className="absolute right-6 top-8 grid size-9 place-items-center rounded-full border border-white/25 bg-white/10 text-white lg:right-[18%] lg:top-[30%]"
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 3.8, repeat: Infinity, ease: "easeInOut" }}
      >
        <MapPin className="size-4" />
      </motion.div>
      <motion.div
        className="absolute right-20 top-16 grid size-7 place-items-center rounded-full border border-white/15 bg-white/[0.07] text-white/70 lg:right-[42%] lg:top-[26%]"
        animate={{ y: [0, 5, 0] }}
        transition={{ duration: 4.3, repeat: Infinity, ease: "easeInOut", delay: 0.25 }}
      >
        <MapPin className="size-3" />
      </motion.div>
      <motion.div
        className="absolute left-8 top-11 size-2 rounded-full border border-white/20 lg:left-[12%] lg:top-[46%]"
        animate={{ opacity: [0.4, 0.9, 0.4], scale: [1, 1.25, 1] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
      />
      <div className="absolute right-0 top-0 hidden h-full w-12 bg-white/16 blur-2xl md:block lg:w-24 lg:bg-white/18 lg:blur-3xl" />
      <svg
        className="absolute right-[-1px] top-0 hidden h-full w-20 text-white md:block lg:w-32"
        viewBox="0 0 128 900"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path
          className="lg:hidden"
          d="M128 0 H92 C68 60 76 116 73 178 C69 270 105 344 106 432 C108 530 72 604 73 692 C74 770 102 822 86 900 H128 Z"
          fill="currentColor"
        />
        <path
          className="hidden lg:block"
          d="M128 0 H62 C28 42 42 104 38 160 C32 248 91 318 95 408 C100 510 35 590 34 688 C33 762 83 796 90 874 C92 892 70 900 52 900 H128 Z"
          fill="currentColor"
        />
      </svg>
    </>
  );
}

export function LoginView({ onLogin, onRegister }: LoginViewProps) {
  const navigate = useNavigate();
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
    <div className="min-h-screen w-full overflow-y-auto bg-white md:bg-[#F8FAFF]">
      <div className="relative mx-auto flex min-h-screen w-full max-w-[30rem] flex-col overflow-hidden bg-white shadow-[0_0_60px_rgba(15,23,42,0.10)] md:max-w-none md:flex-row md:shadow-none">
        <section className="relative min-h-[15.5rem] overflow-hidden bg-gradient-to-br from-[#4F46E5] to-[#4338CA] px-7 pb-14 pt-12 text-white md:flex md:min-h-screen md:w-[42%] md:items-center md:justify-center md:px-8 md:py-10 lg:w-[50%] lg:px-14 lg:py-16 xl:w-[45%]">
          <HeroDecor />
          <div className="relative z-10 md:max-w-[14.5rem] lg:max-w-[22rem] lg:text-center xl:max-w-md">
            <div className="mb-7 flex items-center gap-3 md:mb-12 lg:mb-24 lg:justify-center">
              <motion.div
                className="grid size-11 place-items-center rounded-2xl bg-white/14 shadow-[0_10px_20px_rgba(49,46,129,0.16)]"
                animate={{ y: [0, -3, 0] }}
                transition={{ duration: 3.6, repeat: Infinity, ease: "easeInOut" }}
              >
                <MapPin className="size-5" />
              </motion.div>
              <span className="text-xl font-black">Nook</span>
            </div>
            <div className="hidden lg:mb-16 lg:block">
              <motion.div
                className="relative mx-auto grid size-24 place-items-center rounded-full bg-white text-[#4F46E5] shadow-[0_18px_38px_rgba(49,46,129,0.20)]"
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 4.2, repeat: Infinity, ease: "easeInOut" }}
              >
                <MapPin className="size-12" />
                <span className="absolute -left-24 top-0 h-px w-24 rotate-45 border-t border-dashed border-white/20" />
                <span className="absolute -right-20 top-4 h-px w-24 -rotate-45 border-t border-dashed border-white/20" />
              </motion.div>
            </div>
            <h1 className="max-w-[18rem] text-3xl font-black leading-tight tracking-normal md:text-[1.85rem] lg:mx-auto lg:max-w-[21rem] lg:text-[1.9rem] xl:max-w-[24rem] xl:text-[2rem]">
              <span className="lg:hidden">Encuentra tu espacio perfecto</span>
              <span className="hidden lg:inline">Tu proximo lugar favorito esta a un clic</span>
            </h1>
            <p className="mt-2 max-w-[18rem] text-sm font-medium text-white/78 md:max-w-[13.5rem] lg:mx-auto lg:mt-4 lg:max-w-[17rem] xl:max-w-xs">
              Descubre cafes, bibliotecas y espacios de coworking en Chile
            </p>
          </div>
        </section>

        <section className="relative z-10 -mt-10 flex-1 rounded-t-[2rem] bg-white px-5 pb-8 pt-6 md:mt-0 md:flex md:min-h-screen md:w-[58%] md:items-start md:justify-center md:rounded-none md:px-7 md:py-8 lg:w-[50%] lg:px-10 lg:py-16 xl:w-[55%] xl:px-12">
          <motion.div
            className="mx-auto mb-6 h-1 w-9 rounded-full bg-[#E0E7FF] md:hidden"
            animate={{ opacity: [0.45, 1, 0.45] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
          />

          <motion.div
            className="rounded-[1.65rem] bg-white p-1 shadow-[0_18px_42px_rgba(79,70,229,0.12)] md:w-full md:max-w-[26rem] md:shadow-[0_18px_42px_rgba(79,70,229,0.08)] lg:max-w-md lg:shadow-none"
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            <div className="rounded-[1.5rem] bg-white px-4 pb-5 pt-1 sm:px-5">
              <div className="mb-5 lg:mb-8">
                <div className="mb-4 hidden items-center gap-3 lg:flex">
                  <div className="grid size-10 place-items-center rounded-xl bg-[#4F46E5] text-white shadow-[0_10px_20px_rgba(79,70,229,0.18)]">
                    <MapPin className="size-5" />
                  </div>
                  <span className="text-2xl font-black text-[#1E1B4B]">Nook</span>
                </div>
                <h2 className="text-2xl font-black tracking-normal text-[#1E1B4B] lg:text-3xl">
                  <span className="lg:hidden">Hola de nuevo!</span>
                  <span className="hidden lg:inline">Bienvenido de vuelta</span>
                </h2>
                <p className="mt-1 text-sm font-medium text-slate-400">
                  <span className="lg:hidden">Ingresa para continuar explorando</span>
                  <span className="hidden lg:inline">Ingresa tus datos para continuar</span>
                </p>
              </div>

              <Tabs value={activeTab} onValueChange={handleTabChange} className="gap-0">
                <TabsList className="relative mb-6 grid h-[3.25rem] w-full grid-cols-2 rounded-2xl bg-[#EEF2FF] p-1">
                  {["login", "register"].map((tab) => (
                    <TabsTrigger
                      key={tab}
                      value={tab}
                      className="relative z-10 rounded-[0.9rem] bg-transparent text-sm font-black text-[#7C83E8] transition data-[state=active]:text-white data-[state=active]:shadow-none"
                    >
                      {activeTab === tab && (
                        <motion.span
                          layoutId="auth-tab-pill"
                          className="absolute inset-0 -z-10 rounded-[0.9rem] bg-[#4F46E5] shadow-[0_10px_18px_rgba(79,70,229,0.22)]"
                          transition={{ type: "spring", stiffness: 430, damping: 34 }}
                        />
                      )}
                      {tab === "login" ? (
                        <>
                          <LogIn className="size-4" />
                          Iniciar sesion
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
                      className="mb-5 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
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
                      initial={{ opacity: 0, x: -18 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 18 }}
                      transition={{ duration: 0.22 }}
                    >
                      <AuthField id="login-email" label="Correo electronico" icon={Mail}>
                        <AuthInput
                          id="login-email"
                          type="email"
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
                        {isSubmitting ? "Ingresando..." : "Iniciar sesion"}
                      </PrimaryAuthButton>
                      <button
                        type="button"
                        onClick={() => navigate("/recover-password")}
                        className="w-full rounded-xl px-3 py-2 text-xs font-black text-slate-400 transition hover:bg-[#EEF2FF] hover:text-[#4F46E5]"
                      >
                        Olvide mi contraseña
                      </button>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="register"
                      className="space-y-4"
                      initial={{ opacity: 0, x: 18 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -18 }}
                      transition={{ duration: 0.22 }}
                    >
                      <AuthField id="register-name" label="Nombre completo" icon={User}>
                        <AuthInput
                          id="register-name"
                          placeholder="Tu nombre"
                          value={registerName}
                          onChange={(e) => setRegisterName(e.target.value)}
                        />
                      </AuthField>
                      <AuthField id="register-email" label="Correo electronico" icon={Mail}>
                        <AuthInput
                          id="register-email"
                          type="email"
                          placeholder="tu@email.cl"
                          value={registerEmail}
                          onChange={(e) => setRegisterEmail(e.target.value)}
                        />
                      </AuthField>
                      <AuthField id="register-phone" label="Telefono" icon={Phone}>
                        <div className="flex w-full items-center">
                          <span className="mr-2 whitespace-nowrap text-sm font-black text-[#7C83E8]">
                            +56 9
                          </span>
                          <AuthInput
                            id="register-phone"
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
                            transition={{ duration: 0.3 }}
                          />
                        </div>
                        <p className="text-xs font-medium text-slate-400">
                          Seguridad: {registerPassword ? passwordStrength.label : "Sin datos"}
                        </p>
                      </div>
                      <AuthField id="register-password-confirm" label="Confirmar contraseña" icon={Lock}>
                        <div className="relative w-full">
                          <AuthInput
                            id="register-password-confirm"
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
              <p className="mt-6 hidden text-center text-xs font-medium text-slate-300 lg:block">
                Al continuar aceptas los{" "}
                <span className="font-black text-[#4F46E5]">Terminos</span> y la{" "}
                <span className="font-black text-[#4F46E5]">Privacidad</span>
              </p>
            </div>
          </motion.div>
        </section>
      </div>
    </div>
  );
}
