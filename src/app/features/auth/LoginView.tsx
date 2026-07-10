import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { Eye, EyeOff, LogIn, UserPlus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { Label } from "../../components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
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
      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
      aria-label={label}
      title={label}
    >
      {isVisible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
    </button>
  );
}

export function LoginView({ onLogin, onRegister }: LoginViewProps) {
  const navigate = useNavigate();
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
    <div className="size-full flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl mb-2">Nook</CardTitle>
          <p className="text-sm text-gray-600">Plataforma de gestion de espacios de estudio</p>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" onValueChange={handleTabChange}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Iniciar Sesion</TabsTrigger>
              <TabsTrigger value="register">Registrarse</TabsTrigger>
            </TabsList>

            {errorMessage && (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {errorMessage}
              </div>
            )}

            <TabsContent value="login" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="login-email">Email</Label>
                <Input
                  id="login-email"
                  type="email"
                  placeholder="tu@email.cl"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="login-password">Contraseña</Label>
                <div className="relative">
                  <Input
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
              </div>
              <Button
                className="w-full bg-[#4F46E5] hover:bg-[#4338CA]"
                onClick={handleLogin}
                disabled={isSubmitting}
              >
                <LogIn className="size-4 mr-2" />
                {isSubmitting ? "Ingresando..." : "Iniciar Sesion"}
              </Button>
              <button
                type="button"
                onClick={() => navigate("/recover-password")}
                className="w-full rounded-lg px-3 py-2 text-sm font-medium text-[#4F46E5] transition-colors hover:bg-purple-50 hover:text-[#4338CA] disabled:cursor-not-allowed disabled:opacity-60"
              >
                Olvide mi contraseña
              </button>
            </TabsContent>

            <TabsContent value="register" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="register-name">Nombre completo</Label>
                <Input
                  id="register-name"
                  placeholder="Tu nombre"
                  value={registerName}
                  onChange={(e) => setRegisterName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="register-email">Email</Label>
                <Input
                  id="register-email"
                  type="email"
                  placeholder="tu@email.cl"
                  value={registerEmail}
                  onChange={(e) => setRegisterEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="register-phone">Telefono</Label>
                <div className="flex min-h-10 overflow-hidden rounded-md border border-gray-200 bg-white focus-within:ring-2 focus-within:ring-purple-200">
                  <div className="flex w-20 shrink-0 items-center justify-center whitespace-nowrap border-r border-gray-200 bg-gray-50 px-3 text-sm text-gray-600">
                    +56 9
                  </div>
                  <Input
                    id="register-phone"
                    type="tel"
                    inputMode="numeric"
                    placeholder="1234 5678"
                    value={registerPhone}
                    maxLength={8}
                    className="border-0 shadow-none focus-visible:ring-0"
                    onChange={(e) => setRegisterPhone(getPhoneInputDigits(e.target.value))}
                    onPaste={(e) => {
                      e.preventDefault();
                      setRegisterPhone(getPhoneInputDigits(e.clipboardData.getData("text")));
                    }}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="register-password">Contraseña</Label>
                <div className="relative">
                  <Input
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
                    label={showRegisterPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  />
                </div>
                <div className="space-y-1">
                  <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className={`h-full rounded-full transition-all ${passwordStrength.color}`}
                      style={{ width: registerPassword ? passwordStrength.width : "0%" }}
                    />
                  </div>
                  <p className="text-xs text-gray-500">Seguridad: {registerPassword ? passwordStrength.label : "Sin datos"}</p>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="register-password-confirm">Confirmar contraseña</Label>
                <div className="relative">
                  <Input
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
                    label={showRegisterPasswordConfirm ? "Ocultar contraseña" : "Mostrar contraseña"}
                  />
                </div>
                {passwordsMatch && <p className="text-xs text-green-600">Las contraseñas coinciden.</p>}
                {passwordsMismatch && <p className="text-xs text-red-600">Las contraseñas no coinciden.</p>}
              </div>
              <Button
                className="w-full bg-[#4F46E5] hover:bg-[#4338CA]"
                onClick={handleRegister}
                disabled={isSubmitting}
              >
                <UserPlus className="size-4 mr-2" />
                {isSubmitting ? "Creando..." : "Crear Cuenta"}
              </Button>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
