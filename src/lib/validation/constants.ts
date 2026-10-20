// Constantes compartidas entre cliente y servidor (sin dependencias de Node.js).
export const PASSWORD_MIN_LENGTH_PUBLIC = 10;
export const PASSWORD_MAX_LENGTH_PUBLIC = 200;

export const ACCOUNT_TYPES = ["CHECKING", "SAVINGS", "CASH", "OTHER"] as const;
export type AccountTypeValue = (typeof ACCOUNT_TYPES)[number];

export const ACCOUNT_TYPE_LABELS: Record<AccountTypeValue, string> = {
  CHECKING: "Cuenta corriente",
  SAVINGS: "Ahorro",
  CASH: "Efectivo",
  OTHER: "Otra",
};

export const CATEGORY_KINDS = ["INCOME", "EXPENSE"] as const;
export type CategoryKindValue = (typeof CATEGORY_KINDS)[number];

export const CATEGORY_KIND_LABELS: Record<CategoryKindValue, string> = {
  INCOME: "Ingreso",
  EXPENSE: "Gasto",
};

export const TRANSACTION_TYPE_LABELS = {
  INCOME: "Ingreso",
  EXPENSE: "Gasto",
  TRANSFER: "Transferencia",
} as const;

export const CATEGORY_COLORS = [
  "#0ea5e9",
  "#6366f1",
  "#8b5cf6",
  "#ec4899",
  "#f43f5e",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#14b8a6",
  "#64748b",
] as const;

export const GOAL_PRIORITY_LABELS = { LOW: "Baja", MEDIUM: "Media", HIGH: "Alta" } as const;
export const GOAL_STATUS_LABELS = { ACTIVE: "Activo", PAUSED: "En pausa", COMPLETED: "Completado", CANCELLED: "Cancelado" } as const;
