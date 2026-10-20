import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { cache } from "react";
import { prisma } from "@/lib/db/prisma";

// Sesiones propias guardadas en PostgreSQL.
// - El navegador recibe un token aleatorio de 256 bits en una cookie HttpOnly.
// - La base de datos guarda solo el hash SHA-256 del token.
// - Duración de 30 días; se renueva al usarse cuando quedan menos de 15.

export const SESSION_COOKIE = "nf_session";
const SESSION_DAYS = 30;
const RENEW_WHEN_DAYS_LEFT = 15;
const DAY_MS = 86_400_000;

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function generateToken(): string {
  return randomBytes(32).toString("base64url");
}

function cookieSecure(): boolean {
  if (process.env.COOKIE_SECURE === "true") return true;
  if (process.env.COOKIE_SECURE === "false") return false;
  return process.env.NODE_ENV === "production";
}

async function setSessionCookie(token: string, expiresAt: Date): Promise<void> {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: cookieSecure(),
    path: "/",
    expires: expiresAt,
  });
}

/** Crea una sesión y fija la cookie. Solo en Server Actions o Route Handlers. */
export async function createSession(userId: string): Promise<void> {
  const token = generateToken();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * DAY_MS);
  await prisma.session.create({ data: { userId, tokenHash: hashToken(token), expiresAt } });
  await setSessionCookie(token, expiresAt);
  // Limpieza ocasional de sesiones caducadas.
  if (Math.random() < 0.05) {
    await prisma.session.deleteMany({ where: { expiresAt: { lt: new Date() } } });
  }
}

export interface SessionData {
  sessionId: string;
  userId: string;
  expiresAt: Date;
  token: string;
}

/** Lee la sesión de la cookie. Se memoriza por petición. No modifica cookies. */
export const readSession = cache(async (): Promise<SessionData | null> => {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token || token.length > 100) return null;
  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    select: { id: true, userId: true, expiresAt: true },
  });
  if (!session) return null;
  if (session.expiresAt.getTime() <= Date.now()) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => undefined);
    return null;
  }
  return { sessionId: session.id, userId: session.userId, expiresAt: session.expiresAt, token };
});

/** Renueva la sesión si le quedan menos de 15 días. Solo en Server Actions. */
export async function renewSessionIfNeeded(session: SessionData): Promise<void> {
  const left = session.expiresAt.getTime() - Date.now();
  if (left > RENEW_WHEN_DAYS_LEFT * DAY_MS) return;
  const expiresAt = new Date(Date.now() + SESSION_DAYS * DAY_MS);
  await prisma.session.update({ where: { id: session.sessionId }, data: { expiresAt, lastUsedAt: new Date() } });
  await setSessionCookie(session.token, expiresAt);
}

/** Cierra la sesión actual en el servidor y borra la cookie. */
export async function destroyCurrentSession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    await prisma.session.deleteMany({ where: { tokenHash: hashToken(token) } });
  }
  jar.delete(SESSION_COOKIE);
}

/** Cierra todas las sesiones de un usuario salvo, opcionalmente, una. */
export async function destroyUserSessions(userId: string, exceptSessionId?: string): Promise<void> {
  await prisma.session.deleteMany({
    where: { userId, ...(exceptSessionId ? { id: { not: exceptSessionId } } : {}) },
  });
}
