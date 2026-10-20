// Permisos por rol, centralizados.
// En esta versión cada usuario solo tiene su espacio personal con rol OWNER; la
// matriz está preparada para espacios compartidos (por ejemplo, de empresa).

export type WorkspaceRole = "OWNER" | "ADMIN" | "MEMBER" | "VIEWER";

export type Permission =
  | "finance:read" // ver cuentas, movimientos, informes
  | "finance:write" // crear, editar y borrar datos financieros
  | "workspace:manage" // ajustes del espacio (moneda, nombre)
  | "workspace:delete"; // eliminar el espacio y todos sus datos

const MATRIX: Record<WorkspaceRole, readonly Permission[]> = {
  OWNER: ["finance:read", "finance:write", "workspace:manage", "workspace:delete"],
  ADMIN: ["finance:read", "finance:write", "workspace:manage"],
  MEMBER: ["finance:read", "finance:write"],
  VIEWER: ["finance:read"],
};

export function can(role: WorkspaceRole, permission: Permission): boolean {
  return MATRIX[role].includes(permission);
}

export class ForbiddenError extends Error {
  constructor(message = "No tienes permiso para realizar esta acción.") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export function assertCan(role: WorkspaceRole, permission: Permission): void {
  if (!can(role, permission)) throw new ForbiddenError();
}
