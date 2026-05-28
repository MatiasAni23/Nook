import { useMemo, useState } from "react";
import { Eye, EyeOff, LogIn, UserPlus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { Label } from "../../components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";

interface LoginViewProps {
  onLogin: (email: string, password: string) => Promise<void> | void;
  onRegister?: (name: string, email: string, phone: string, password: string) => Promise<void> | void;
}

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidEmail(email: string) {
  return emailPattern.test(email.trim());
}

function getPhoneDigits(phone: string) {
  return phone.replace(/\D/g, "");
}

function isValidChilePhone(phone: string) {
  const digits = getPhoneDigits(phone);
  return /^569\d{8}$/.test(digits) || /^9\d{8}$/.test(digits);
}

function normalizeChilePhone(phone: string) {
  const digits = getPhoneDigits(phone);

  if (/^9\d{8}$/.test(digits)) {
    return `+56${digits}`;
  }

  if (/^569\d{8}$/.test(digits)) {
    return `+${digits}`;
  }

  return phone.trim();
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
    return "Correo o contrasena incorrectos. Verifica que el usuario exista en Supabase Auth.";
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

  const handleLogin = async () => {
    if (!loginEmail || !loginPassword) {
      setErrorMessage("Ingresa tu correo y contrasena.");
      return;
    }

    if (!isValidEmail(loginEmail)) {
      setErrorMessage("Ingresa un correo valido.");
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

    if (!isValidEmail(registerEmail)) {
      setErrorMessage("Ingresa un correo valido.");
      return;
    }

    if (!isValidChilePhone(registerPhone)) {
      setErrorMessage("Ingresa un telefono chileno valido. Ej: +56 9 1234 5678.");
      return;
    }

    if (passwordScore < 3) {
      setErrorMessage("La contrasena debe tener al menos 8 caracteres y combinar letras con numeros.");
      return;
    }

    if (registerPassword !== registerPasswordConfirm) {
      setErrorMessage("Las contrasenas no coinciden.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      if (onRegister) {
        await onRegister(
          registerName.trim(),
          registerEmail.trim(),
          normalizeChilePhone(registerPhone),
          registerPassword,
        );
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
          <Tabs defaultValue="login" onValueChange={() => setErrorMessage("")}>
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
                <Label htmlFor="login-password">Contrasena</Label>
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
                    label={showLoginPassword ? "Ocultar contrasena" : "Mostrar contrasena"}
                  />
                </div>
              </div>
              <Button
                className="w-full bg-purple-600 hover:bg-purple-700"
                onClick={handleLogin}
                disabled={isSubmitting}
              >
                <LogIn className="size-4 mr-2" />
                {isSubmitting ? "Ingresando..." : "Iniciar Sesion"}
              </Button>
              <div className="mt-4 p-3 bg-gray-50 rounded-lg text-xs text-gray-600">
                <p className="font-semibold mb-2">Nota:</p>
                <p>
                  Las cuentas deben existir en Supabase Authentication. Las credenciales demo solo
                  funcionan si las creaste ahi.
                </p>
              </div>
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
                <Input
                  id="register-phone"
                  type="tel"
                  placeholder="+56 9 1234 5678"
                  value={registerPhone}
                  onChange={(e) => setRegisterPhone(e.target.value)}
                />
                <p className="text-xs text-gray-500">Acepta +56 9 1234 5678 o 912345678.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="register-password">Contrasena</Label>
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
                    label={showRegisterPassword ? "Ocultar contrasena" : "Mostrar contrasena"}
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
                <Label htmlFor="register-password-confirm">Confirmar contrasena</Label>
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
                    label={showRegisterPasswordConfirm ? "Ocultar contrasena" : "Mostrar contrasena"}
                  />
                </div>
                {passwordsMatch && <p className="text-xs text-green-600">Las contrasenas coinciden.</p>}
                {passwordsMismatch && <p className="text-xs text-red-600">Las contrasenas no coinciden.</p>}
              </div>
              <Button
                className="w-full bg-purple-600 hover:bg-purple-700"
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
