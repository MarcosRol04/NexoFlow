import "server-only";
import { headers } from "next/headers";

/**
 * IP del cliente para limitar intentos.
 *
 * `X-Forwarded-For` es una lista que cada proxy amplía por la derecha. La
 * primera entrada la puede inventar el cliente, así que se toma la que añadió el
 * último proxy de confianza: con TRUSTED_PROXY_HOPS=1 (por defecto), la última.
 * Con TRUSTED_PROXY_HOPS=0 se ignoran estas cabeceras (sin proxy delante).
 */
export async function getClientIp(): Promise<string> {
  const hops = Number.parseInt(process.env.TRUSTED_PROXY_HOPS ?? "1", 10);
  if (!Number.isFinite(hops) || hops <= 0) return "direct";
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) {
    const list = forwarded.split(",").map((s) => s.trim()).filter(Boolean);
    const candidate = list[list.length - hops] ?? list[0];
    if (candidate) return candidate.slice(0, 64);
  }
  return (h.get("x-real-ip") ?? "unknown").slice(0, 64);
}
