import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { type SessionData, readSession, renewSessionIfNeeded } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { decimalToCents } from "@/lib/finance/money";
import { type Permission, type WorkspaceRole, ForbiddenError, assertCan, can } from "@/lib/permissions";

// Contexto de la petición: quién es el usuario y en qué espacio trabaja.
// Se obtiene SIEMPRE en el servidor a partir de la cookie de sesión; nunca de
// identificadores enviados por el navegador.

export interface AppContext {
  userId: string;
  userName: string;
  email: string;
  workspaceId: string;
  workspaceName: string;
  currency: string;
  role: WorkspaceRole;
  timezone: string;
  minimumReserveCents: bigint;
  budgetAlertThreshold: number;
  session: SessionData;
}

export class UnauthenticatedError extends Error {
  constructor() {
    super("Tu sesión ha caducado. Vuelve a iniciar sesión.");
    this.name = "UnauthenticatedError";
  }
}

export const getContext = cache(async (): Promise<AppContext | null> => {
  const session = await readSession();
  if (!session) return null;

  const membership = await prisma.workspaceMember.findFirst({
    where: { userId: session.userId, workspace: { type: "PERSONAL" } },
    orderBy: { createdAt: "asc" },
    select: {
      role: true,
      workspace: { select: { id: true, name: true, currency: true } },
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          preference: { select: { timezone: true, minimumReserve: true, budgetAlertThreshold: true } },
        },
      },
    },
  });
  if (!membership) return null;

  const pref = membership.user.preference;
  return {
    userId: membership.user.id,
    userName: membership.user.name,
    email: membership.user.email,
    workspaceId: membership.workspace.id,
    workspaceName: membership.workspace.name,
    currency: membership.workspace.currency,
    role: membership.role,
    timezone: pref?.timezone ?? "Europe/Madrid",
    minimumReserveCents: pref ? decimalToCents(pref.minimumReserve) : 0n,
    budgetAlertThreshold: pref?.budgetAlertThreshold ?? 80,
    session,
  };
});

/** Para páginas: redirige al inicio de sesión si no hay sesión válida. */
export async function requireContext(permission: Permission = "finance:read"): Promise<AppContext> {
  const ctx = await getContext();
  if (!ctx) redirect("/iniciar-sesion");
  assertCan(ctx.role, permission);
  return ctx;
}

/** Para Server Actions: lanza un error si no hay sesión o permiso, y renueva la sesión. */
export async function requireActionContext(permission: Permission = "finance:write"): Promise<AppContext> {
  const ctx = await getContext();
  if (!ctx) throw new UnauthenticatedError();
  if (!can(ctx.role, permission)) throw new ForbiddenError();
  await renewSessionIfNeeded(ctx.session);
  return ctx;
}
