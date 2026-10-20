import { existsSync } from "node:fs";
import { defineConfig, env } from "prisma/config";

// Prisma 7 no carga el fichero .env automáticamente. Node.js lo hace sin
// dependencias externas. Las variables ya presentes en el entorno (por ejemplo,
// las que fijan las pruebas de integración) tienen prioridad sobre el fichero.
if (existsSync(".env")) {
  process.loadEnvFile(".env");
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: env("DATABASE_URL"),
    // Opcional: solo se usa al crear migraciones nuevas con `prisma migrate dev`
    // si el usuario de la base de datos no tiene permiso CREATEDB.
    shadowDatabaseUrl: process.env.SHADOW_DATABASE_URL,
  },
});
