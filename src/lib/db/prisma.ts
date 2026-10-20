import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

// Cliente de Prisma 7 con el adaptador oficial de PostgreSQL (node-postgres).
// Se crea de forma perezosa: así `next build` no necesita DATABASE_URL para
// analizar las páginas, y en desarrollo se reutiliza entre recargas.

const globalForPrisma = globalThis as unknown as { __nexoflowPrisma?: PrismaClient };

function createClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("Falta la variable DATABASE_URL. Copia .env.example a .env y configúrala (ver README.md).");
  }
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

export function getPrisma(): PrismaClient {
  if (!globalForPrisma.__nexoflowPrisma) {
    globalForPrisma.__nexoflowPrisma = createClient();
  }
  return globalForPrisma.__nexoflowPrisma;
}

/** Acceso cómodo: `prisma.account.findMany(...)`. Se conecta en el primer uso. */
export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, property) {
    const client = getPrisma();
    const value = Reflect.get(client, property, client) as unknown;
    return typeof value === "function" ? (value as (...args: unknown[]) => unknown).bind(client) : value;
  },
});

export type DbClient = PrismaClient;
