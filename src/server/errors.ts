import "server-only";
import { ForbiddenError } from "@/lib/permissions";
import { UnauthenticatedError } from "./context";

/** Error con un mensaje apto para mostrar al usuario. */
export class DomainError extends Error {
  constructor(
    message: string,
    public readonly field?: string,
  ) {
    super(message);
    this.name = "DomainError";
  }
}

export class NotFoundError extends DomainError {
  constructor(what = "El elemento") {
    super(`${what} no existe o no tienes acceso.`);
    this.name = "NotFoundError";
  }
}

function prismaCode(error: unknown): string | undefined {
  if (typeof error === "object" && error !== null && "code" in error) {
    const code = (error as { code: unknown }).code;
    return typeof code === "string" ? code : undefined;
  }
  return undefined;
}

/**
 * Traduce cualquier error a un mensaje para el usuario sin revelar detalles
 * internos. Los errores inesperados se registran sin datos personales.
 */
export function toUserMessage(error: unknown, context: string): string {
  if (error instanceof DomainError) return error.message;
  if (error instanceof ForbiddenError) return error.message;
  if (error instanceof UnauthenticatedError) return error.message;
  switch (prismaCode(error)) {
    case "P2002":
      return "Ya existe un elemento con esos datos.";
    case "P2003":
      return "No se puede completar porque hay datos relacionados.";
    case "P2025":
      return "El elemento ya no existe.";
  }
  console.error(`[nexoflow] Error inesperado en ${context}:`, error instanceof Error ? error.name : "desconocido", prismaCode(error) ?? "");
  return "No se ha podido completar la operación. Inténtalo de nuevo.";
}
