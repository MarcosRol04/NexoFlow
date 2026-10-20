// Comprueba la base de datos SIN modificar nada:
//   npm run db:verify
// 1. Conexión y versión de PostgreSQL.
// 2. Migraciones aplicadas y sin errores.
// 3. Tablas, restricciones CHECK y disparadores esperados.
// 4. Integridad de los datos (transferencias cuadradas, monedas, espacios).
import { createScriptClient } from "../prisma/script-client";

const prisma = createScriptClient();

const TABLES = [
  "users", "sessions", "password_reset_tokens", "user_preferences", "workspaces", "workspace_members",
  "accounts", "categories", "transfers", "transactions", "budgets", "savings_goals", "goal_movements",
  "scheduled_items", "import_batches", "import_rows",
];
const TRIGGERS = [
  "transactions_guard", "transfers_guard", "transactions_transfer_balanced", "transfers_balanced", "accounts_guard",
  "budgets_guard", "savings_goals_guard", "goal_movements_guard", "scheduled_items_guard", "import_batches_guard",
];

let failures = 0;
function report(ok: boolean, label: string, detail = "") {
  if (!ok) failures += 1;
  console.info(`${ok ? "✔" : "✘"} ${label}${detail ? ` — ${detail}` : ""}`);
}

async function main() {
  const [version] = await prisma.$queryRaw<{ v: string }[]>`SELECT current_setting('server_version') AS v`;
  report(true, "Conexión con PostgreSQL", `versión ${version?.v ?? "?"}`);
  const major = Number.parseInt(version?.v ?? "0", 10);
  report(major >= 14, "Versión de PostgreSQL 14 o superior");

  const migrations = await prisma.$queryRaw<{ name: string; finished: boolean; rolled_back: boolean }[]>`
    SELECT migration_name AS name, finished_at IS NOT NULL AS finished, rolled_back_at IS NOT NULL AS rolled_back
    FROM _prisma_migrations ORDER BY started_at`;
  const bad = migrations.filter((m) => !m.finished && !m.rolled_back);
  report(migrations.length > 0 && bad.length === 0, "Migraciones aplicadas", `${migrations.length} aplicada(s)${bad.length ? `, ${bad.length} con error` : ""}`);

  const tables = await prisma.$queryRaw<{ t: string }[]>`
    SELECT table_name AS t FROM information_schema.tables WHERE table_schema = current_schema()`;
  const missingTables = TABLES.filter((t) => !tables.some((r) => r.t === t));
  report(missingTables.length === 0, "Tablas", missingTables.length ? `faltan: ${missingTables.join(", ")}` : `${TABLES.length} presentes`);

  const triggers = await prisma.$queryRaw<{ t: string }[]>`
    SELECT DISTINCT tgname AS t FROM pg_trigger WHERE NOT tgisinternal`;
  const missingTriggers = TRIGGERS.filter((t) => !triggers.some((r) => r.t === t));
  report(missingTriggers.length === 0, "Disparadores de integridad", missingTriggers.length ? `faltan: ${missingTriggers.join(", ")}` : `${TRIGGERS.length} presentes`);

  const [checks] = await prisma.$queryRaw<{ n: bigint }[]>`
    SELECT count(*) AS n FROM pg_constraint c JOIN pg_namespace n ON n.oid = c.connamespace
    WHERE c.contype = 'c' AND n.nspname = current_schema() AND c.conname LIKE '%\\_chk' ESCAPE '\\'`;
  report((checks?.n ?? 0n) >= 20n, "Restricciones CHECK", `${checks?.n ?? 0n} presentes`);

  const [unbalanced] = await prisma.$queryRaw<{ n: bigint }[]>`
    SELECT count(*) AS n FROM transfers t
    WHERE (SELECT count(*) FROM transactions x WHERE x.transfer_id = t.id) <> 2
       OR NOT EXISTS (SELECT 1 FROM transactions x WHERE x.transfer_id = t.id AND x.transfer_leg = 'OUT' AND x.account_id = t.from_account_id AND x.amount = t.amount)
       OR NOT EXISTS (SELECT 1 FROM transactions x WHERE x.transfer_id = t.id AND x.transfer_leg = 'IN' AND x.account_id = t.to_account_id AND x.amount = t.amount)`;
  report((unbalanced?.n ?? 0n) === 0n, "Transferencias cuadradas", `${unbalanced?.n ?? 0n} descuadrada(s)`);

  const [crossWs] = await prisma.$queryRaw<{ n: bigint }[]>`
    SELECT count(*) AS n FROM transactions t JOIN accounts a ON a.id = t.account_id WHERE a.workspace_id <> t.workspace_id`;
  report((crossWs?.n ?? 0n) === 0n, "Movimientos en el espacio de su cuenta", `${crossWs?.n ?? 0n} incoherente(s)`);

  const [currency] = await prisma.$queryRaw<{ n: bigint }[]>`
    SELECT count(*) AS n FROM accounts a JOIN workspaces w ON w.id = a.workspace_id WHERE a.currency <> w.currency`;
  report((currency?.n ?? 0n) === 0n, "Moneda de las cuentas", `${currency?.n ?? 0n} con moneda distinta a la del espacio`);

  const [orphans] = await prisma.$queryRaw<{ n: bigint }[]>`
    SELECT count(*) AS n FROM workspaces w WHERE NOT EXISTS (SELECT 1 FROM workspace_members m WHERE m.workspace_id = w.id)`;
  report((orphans?.n ?? 0n) === 0n, "Espacios con propietario", `${orphans?.n ?? 0n} sin miembros`);

  console.info(failures === 0 ? "\nTodo correcto." : `\n${failures} comprobación(es) con problemas.`);
  if (failures > 0) process.exitCode = 1;
}

main()
  .catch((error: unknown) => {
    console.error("No se ha podido verificar la base de datos:", error instanceof Error ? error.message : error);
    console.error("Comprueba que PostgreSQL está en marcha, que DATABASE_URL es correcta y que has ejecutado npm run db:migrate.");
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
