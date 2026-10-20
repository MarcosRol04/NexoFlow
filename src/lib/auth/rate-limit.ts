import "server-only";

// Limitación de intentos por ventana fija, en memoria del proceso.
//
// LIMITACIÓN: el contador se pierde al reiniciar y no se comparte entre varias
// instancias. Para desplegar varias instancias, sustituye `store` por un almacén
// compartido (por ejemplo, una tabla de PostgreSQL o Redis) manteniendo la
// misma interfaz.

interface Bucket {
  count: number;
  resetAt: number;
}

const globalStore = globalThis as unknown as { __nexoflowRateLimit?: Map<string, Bucket> };
const store: Map<string, Bucket> = (globalStore.__nexoflowRateLimit ??= new Map());

export interface RateLimitResult {
  ok: boolean;
  retryAfterSeconds: number;
}

export const LIMITS = {
  loginByEmail: { limit: 8, windowMs: 15 * 60_000 },
  loginByIp: { limit: 30, windowMs: 15 * 60_000 },
  registerByIp: { limit: 10, windowMs: 60 * 60_000 },
  resetByEmail: { limit: 3, windowMs: 60 * 60_000 },
  resetByIp: { limit: 10, windowMs: 60 * 60_000 },
  sensitiveByUser: { limit: 10, windowMs: 15 * 60_000 },
} as const;

export function rateLimit(key: string, rule: { limit: number; windowMs: number }, now = Date.now()): RateLimitResult {
  if (store.size > 10_000) {
    for (const [k, b] of store) if (b.resetAt <= now) store.delete(k);
  }
  const bucket = store.get(key);
  if (!bucket || bucket.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + rule.windowMs });
    return { ok: true, retryAfterSeconds: 0 };
  }
  bucket.count += 1;
  if (bucket.count > rule.limit) {
    return { ok: false, retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000) };
  }
  return { ok: true, retryAfterSeconds: 0 };
}

/** Borra el contador (por ejemplo, tras un inicio de sesión correcto). */
export function resetRateLimit(key: string): void {
  store.delete(key);
}

export function rateLimitMessage(result: RateLimitResult): string {
  const minutes = Math.max(1, Math.ceil(result.retryAfterSeconds / 60));
  return `Demasiados intentos. Vuelve a intentarlo dentro de ${minutes} ${minutes === 1 ? "minuto" : "minutos"}.`;
}
