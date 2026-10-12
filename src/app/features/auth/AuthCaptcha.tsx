import { useEffect, useRef, useState } from "react";
import { isAuthCaptchaEnabled } from "../../lib/authSecurity";
export { isAuthCaptchaEnabled } from "../../lib/authSecurity";

interface Turnstile {
  render(container: HTMLElement, options: {
    sitekey: string;
    theme: "light";
    size: "flexible" | "compact";
    callback: (token: string) => void;
    "expired-callback": () => void;
    "error-callback": () => void;
  }): string;
  remove(id: string): void;
}
declare global { interface Window { turnstile?: Turnstile; } }
let scriptPromise: Promise<Turnstile> | null = null;

function loadTurnstile() {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise<Turnstile>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.defer = true;
    const timeout = window.setTimeout(() => fail(), 15000);
    const fail = () => {
      window.clearTimeout(timeout);
      script.remove();
      reject(new Error("captcha_unavailable"));
    };
    script.onerror = fail;
    script.onload = () => {
      window.clearTimeout(timeout);
      if (window.turnstile) resolve(window.turnstile); else fail();
    };
    document.head.append(script);
  }).catch((error: unknown) => { scriptPromise = null; throw error; });
  return scriptPromise;
}

export function AuthCaptcha({ onToken, resetKey = 0 }: { onToken: (token: string) => void; resetKey?: string | number }) {
  const container = useRef<HTMLDivElement>(null);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!isAuthCaptchaEnabled) return;
    let mounted = true;
    let widget: string | undefined;
    let api: Turnstile | undefined;
    onToken("");
    setError(false);
    void loadTurnstile().then((loaded) => {
      if (!mounted || !container.current) return;
      api = loaded;
      widget = loaded.render(container.current, {
        sitekey: import.meta.env.VITE_TURNSTILE_SITE_KEY,
        theme: "light", size: container.current.clientWidth < 300 ? "compact" : "flexible",
        callback: (token) => { if (mounted) { onToken(token); setError(false); } },
        "expired-callback": () => { if (mounted) onToken(""); },
        "error-callback": () => { if (mounted) { onToken(""); setError(true); } },
      });
    }).catch(() => { if (mounted) setError(true); });
    return () => { mounted = false; if (api && widget !== undefined) api.remove(widget); };
  }, [onToken, resetKey, retry]);
  if (!isAuthCaptchaEnabled) return null;
  return (
    <div className="min-w-0 space-y-2">
      <div ref={container} className="min-w-0" />
      {error && <p role="alert" className="text-sm text-red-700">No pudimos completar la verificación de seguridad. <button type="button" onClick={() => setRetry((value) => value + 1)} className="underline focus-visible:outline-2">Reintentar</button></p>}
    </div>
  );
}
