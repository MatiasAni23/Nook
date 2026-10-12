export class SecurityError extends Error {
  constructor(public readonly code: string, public readonly status = 400, public readonly retryAfter = 0) { super(code); }
}

export function allowedOrigins() {
  return new Set((Deno.env.get("APP_ALLOWED_ORIGINS") ?? "https://pinwi.cl,https://www.pinwi.cl").split(",").map((value) => value.trim()).filter(Boolean));
}

export function securityHeaders(req: Request) {
  const origin = req.headers.get("Origin");
  if (origin && !allowedOrigins().has(origin)) throw new SecurityError("origin_not_allowed", 403);
  return {
    ...(origin ? { "Access-Control-Allow-Origin": origin } : {}),
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Expose-Headers": "Retry-After",
    "Vary": "Origin", "Cache-Control": "no-store", "Content-Type": "application/json",
  };
}

export function errorResponse(error: unknown, headers: HeadersInit = {}) {
  const known = error instanceof SecurityError;
  const responseHeaders = new Headers(headers);
  responseHeaders.set("Content-Type", "application/json");
  responseHeaders.set("Cache-Control", "no-store");
  if (known && error.retryAfter) responseHeaders.set("Retry-After", String(error.retryAfter));
  return new Response(JSON.stringify({ error: known ? error.code : "unexpected_failure", ...(known && error.retryAfter ? { retry_after: error.retryAfter } : {}) }), { status: known ? error.status : 500, headers: responseHeaders });
}

export async function readJsonBody(req: Request): Promise<Record<string, unknown>> {
  if (!req.headers.get("Content-Type")?.toLowerCase().startsWith("application/json")) throw new SecurityError("invalid_content_type", 415);
  if (!req.body) throw new SecurityError("invalid_payload");
  const reader = req.body.getReader();
  let size = 0;
  const chunks: Uint8Array[] = [];
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 16_384) { await reader.cancel(); throw new SecurityError("payload_too_large", 413); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  let value: unknown;
  try { value = JSON.parse(new TextDecoder().decode(bytes)); } catch { throw new SecurityError("invalid_payload"); }
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new SecurityError("invalid_payload");
  return value as Record<string, unknown>;
}

interface RateLimitClient {
  rpc(name: string, args: Record<string, unknown>): PromiseLike<{ data: unknown; error: unknown }>;
}

export async function consumeRateLimit(client: RateLimitClient, action: string, subject: string, secret: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${action}:${subject}`));
  const hash = Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, "0")).join("");
  const { data, error } = await client.rpc("consume_auth_rate_limit", { action_name: action, subject_hash: hash });
  const result = data as { allowed?: unknown; retry_after?: unknown } | null;
  // No in-memory fallback: every instance must share the same atomic counters.
  if (error || typeof result?.allowed !== "boolean") throw new SecurityError("security_service_unavailable", 503);
  if (!result.allowed) throw new SecurityError("rate_limit_exceeded", 429, Math.max(1, Number(result.retry_after) || 60));
}

export async function verifyCaptcha(token: unknown) {
  const secret = Deno.env.get("TURNSTILE_SECRET_KEY");
  if (!secret) return; // Activate with frontend keys and Supabase Auth, as documented.
  if (typeof token !== "string" || !token || token.length > 2048) throw new SecurityError("captcha_required");
  let response: Response;
  try {
    response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ secret, response: token }), signal: AbortSignal.timeout(5000) });
  } catch { throw new SecurityError("security_service_unavailable", 503); }
  if (!response.ok) throw new SecurityError("security_service_unavailable", 503);
  const result = await response.json() as { success?: boolean; hostname?: string };
  const hostnames = new Set(Array.from(allowedOrigins(), (origin) => new URL(origin).hostname));
  if (!result.success || !result.hostname || !hostnames.has(result.hostname)) throw new SecurityError("captcha_invalid");
}
