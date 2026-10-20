import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Pruebas de integración contra un PostgreSQL REAL (TEST_DATABASE_URL).
// tests/integration/global-setup.ts aplica las migraciones y se niega a
// ejecutarse si TEST_DATABASE_URL coincide con DATABASE_URL.
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "server-only": fileURLToPath(new URL("./tests/mocks/server-only.ts", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["tests/integration/**/*.test.ts"],
    globalSetup: ["tests/integration/global-setup.ts"],
    setupFiles: ["tests/integration/setup-env.ts"],
    // Las pruebas comparten una base de datos: se ejecutan en serie.
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
