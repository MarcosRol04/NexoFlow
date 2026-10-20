import "server-only";
import { hashPassword, verifyAgainstDummy, verifyPassword } from "@/lib/auth/password";
import { prisma } from "@/lib/db/prisma";
import type { RegisterInput } from "@/lib/validation/auth";
import { DomainError } from "../errors";
import { DEFAULT_CATEGORIES } from "./default-categories";

/**
 * Registra un usuario con su espacio personal (rol OWNER), sus preferencias y
 * las categorías iniciales, todo en una única transacción de base de datos.
 */
export async function registerUser(input: RegisterInput): Promise<string> {
  const exists = await prisma.user.findUnique({ where: { email: input.email }, select: { id: true } });
  if (exists) {
    throw new DomainError("Ya existe una cuenta con ese correo. ¿Quieres iniciar sesión?", "email");
  }
  const passwordHash = await hashPassword(input.password);
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: { email: input.email, name: input.name, passwordHash, preference: { create: {} } },
      select: { id: true },
    });
    const workspace = await tx.workspace.create({
      data: { name: "Personal", type: "PERSONAL", currency: "EUR", members: { create: { userId: user.id, role: "OWNER" } } },
      select: { id: true },
    });
    await tx.category.createMany({
      data: DEFAULT_CATEGORIES.map((c) => ({ ...c, workspaceId: workspace.id })),
    });
    return user.id;
  });
}

/** Comprueba credenciales. Devuelve null sin revelar si el correo existe. */
export async function authenticate(email: string, password: string): Promise<{ id: string } | null> {
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true, passwordHash: true } });
  if (!user) {
    await verifyAgainstDummy(password);
    return null;
  }
  const result = await verifyPassword(password, user.passwordHash);
  if (!result.ok) return null;
  if (result.needsRehash) {
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(password) } });
  }
  return { id: user.id };
}
