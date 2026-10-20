// Cliente de Prisma para scripts de línea de comandos (seed, verificación).
// Carga .env con Node.js (sin dependencias) si existe y DATABASE_URL no está definida.
import { existsSync } from "node:fs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

export function createScriptClient(): PrismaClient {
  if (!process.env.DATABASE_URL && existsSync(".env")) {
    process.loadEnvFile(".env");
  }
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("Falta DATABASE_URL. Copia .env.example a .env y configúrala (ver README.md).");
    process.exit(1);
  }
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}

export const DEMO_EMAIL = "demo@nexoflow.local";
