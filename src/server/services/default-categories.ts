// Categorías iniciales que se crean al registrarse (editables y archivables).
export const DEFAULT_CATEGORIES: { name: string; kind: "INCOME" | "EXPENSE"; color: string }[] = [
  { name: "Nómina", kind: "INCOME", color: "#22c55e" },
  { name: "Trabajo por cuenta propia", kind: "INCOME", color: "#14b8a6" },
  { name: "Otros ingresos", kind: "INCOME", color: "#0ea5e9" },
  { name: "Vivienda", kind: "EXPENSE", color: "#6366f1" },
  { name: "Suministros", kind: "EXPENSE", color: "#8b5cf6" },
  { name: "Supermercado", kind: "EXPENSE", color: "#f97316" },
  { name: "Restaurantes", kind: "EXPENSE", color: "#ec4899" },
  { name: "Transporte", kind: "EXPENSE", color: "#0ea5e9" },
  { name: "Salud", kind: "EXPENSE", color: "#f43f5e" },
  { name: "Ocio", kind: "EXPENSE", color: "#eab308" },
  { name: "Suscripciones", kind: "EXPENSE", color: "#a855f7" },
  { name: "Ropa", kind: "EXPENSE", color: "#14b8a6" },
  { name: "Educación", kind: "EXPENSE", color: "#3b82f6" },
  { name: "Otros gastos", kind: "EXPENSE", color: "#64748b" },
];
