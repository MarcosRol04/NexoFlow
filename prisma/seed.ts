// Datos de demostración COMPLETAMENTE FICTICIOS.
//
//   npm run db:seed
//
// - Crea (o recrea) el usuario demo@nexoflow.local con su espacio personal.
// - La contraseña se toma de DEMO_USER_PASSWORD o se genera al azar y se
//   muestra UNA sola vez. Nunca se usa una contraseña conocida.
// - Es reproducible: los importes salen de un generador pseudoaleatorio con
//   semilla fija; las fechas son relativas al día de hoy (últimos 6 meses).
// - Se niega a ejecutarse con NODE_ENV=production salvo ALLOW_DEMO_SEED=true.
// - Para borrarlos: npm run db:demo:clear

import { randomBytes } from "node:crypto";
import { hashPassword } from "../src/lib/auth/password-hash";
import { addDays, addMonthsToDate, addMonthsToKey, daysInMonth, isoToDbDate, monthKeyOf, todayIn } from "../src/lib/finance/dates";
import { centsToDecimalString, formatMoney } from "../src/lib/finance/money";
import { DEFAULT_CATEGORIES } from "../src/server/services/default-categories";
import { DEMO_EMAIL, createScriptClient } from "./script-client";

if (process.env.NODE_ENV === "production" && process.env.ALLOW_DEMO_SEED !== "true") {
  console.error("El seed de demostración no se ejecuta en producción. Usa ALLOW_DEMO_SEED=true solo si sabes lo que haces.");
  process.exit(1);
}

const prisma = createScriptClient();

// Generador pseudoaleatorio con semilla (mulberry32) → datos reproducibles.
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const random = rng(20261016);
/** Importe aleatorio en céntimos entre min y max euros (enteros, sin coma flotante en el resultado). */
const between = (minEuros: number, maxEuros: number): bigint =>
  BigInt(Math.round(minEuros * 100 + random() * (maxEuros - minEuros) * 100));

interface Tx {
  account: "main" | "savings" | "cash";
  type: "INCOME" | "EXPENSE";
  category: string;
  cents: bigint;
  date: string;
  description: string;
}
interface Tr {
  from: "main" | "savings" | "cash";
  to: "main" | "savings" | "cash";
  cents: bigint;
  date: string;
  description: string;
}

async function main() {
  const timezone = "Europe/Madrid";
  const today = todayIn(timezone);
  const currentMonth = monthKeyOf(today);
  const firstMonth = addMonthsToKey(currentMonth, -6);
  const openedOn = `${firstMonth}-01`;

  // Recrear desde cero para que el resultado sea siempre el mismo.
  const existing = await prisma.user.findUnique({ where: { email: DEMO_EMAIL }, include: { memberships: true } });
  if (existing) {
    await prisma.workspace.deleteMany({ where: { id: { in: existing.memberships.map((m) => m.workspaceId) }, type: "PERSONAL" } });
    await prisma.user.delete({ where: { id: existing.id } });
  }

  const password = process.env.DEMO_USER_PASSWORD || randomBytes(12).toString("base64url");
  const passwordHash = await hashPassword(password);

  const txs: Tx[] = [];
  const trs: Tr[] = [];
  const push = (t: Tx) => {
    if (t.date <= today && t.date >= openedOn) txs.push(t);
  };
  const pushTr = (t: Tr) => {
    if (t.date <= today && t.date >= openedOn) trs.push(t);
  };
  const day = (month: string, d: number) => `${month}-${String(Math.min(d, daysInMonth(month))).padStart(2, "0")}`;

  for (let m = 0; m <= 6; m += 1) {
    const month = addMonthsToKey(firstMonth, m);
    const isCurrent = month === currentMonth;

    push({ account: "main", type: "INCOME", category: "Nómina", cents: 215_000n, date: day(month, 28), description: "Nómina (empresa ficticia)" });
    if (m % 2 === 1) {
      push({ account: "main", type: "INCOME", category: "Trabajo por cuenta propia", cents: between(180, 420), date: day(month, 15), description: "Factura proyecto ficticio" });
    }
    push({ account: "main", type: "EXPENSE", category: "Vivienda", cents: 75_000n, date: day(month, 1), description: "Alquiler" });
    push({ account: "main", type: "EXPENSE", category: "Suministros", cents: between(48, 92), date: day(month, 6), description: "Luz" });
    push({ account: "main", type: "EXPENSE", category: "Suministros", cents: 3_490n, date: day(month, 9), description: "Internet y móvil" });
    push({ account: "main", type: "EXPENSE", category: "Suscripciones", cents: 1_299n, date: day(month, 12), description: "Plataforma de vídeo" });
    push({ account: "main", type: "EXPENSE", category: "Suscripciones", cents: 999n, date: day(month, 14), description: "Música" });
    for (const d of [3, 10, 17, 24]) {
      push({ account: "main", type: "EXPENSE", category: "Supermercado", cents: between(42, 96), date: day(month, d), description: "Compra semanal" });
    }
    const dinners = isCurrent ? 6 : 2 + Math.floor(random() * 3);
    for (let i = 0; i < dinners; i += 1) {
      const d = isCurrent ? 2 + i : 5 + Math.floor(random() * 22);
      push({ account: "main", type: "EXPENSE", category: "Restaurantes", cents: between(18, isCurrent ? 75 : 55), date: day(month, d), description: "Restaurante" });
    }
    push({ account: "main", type: "EXPENSE", category: "Transporte", cents: 2_000n, date: day(month, 2), description: "Abono transporte" });
    if (random() < 0.5) push({ account: "main", type: "EXPENSE", category: "Ocio", cents: between(15, 60), date: day(month, 20), description: "Cine y ocio" });
    if (m === 3) push({ account: "main", type: "EXPENSE", category: "Salud", cents: 6_500n, date: day(month, 18), description: "Dentista" });
    if (isCurrent) push({ account: "main", type: "EXPENSE", category: "Ropa", cents: 12_990n, date: day(month, 4), description: "Abrigo" });

    // Ahorro mensual y retirada de efectivo: transferencias entre cuentas propias.
    pushTr({ from: "main", to: "savings", cents: 30_000n, date: day(month, 2), description: "Ahorro del mes" });
    pushTr({ from: "main", to: "cash", cents: 10_000n, date: day(month, 5), description: "Retirada de efectivo" });
    for (const d of [7, 19]) {
      push({ account: "cash", type: "EXPENSE", category: "Otros gastos", cents: between(8, 35), date: day(month, d), description: "Gastos pequeños en efectivo" });
    }
  }
  // Intereses de la cuenta de ahorro (trimestral).
  for (const m of [2, 5]) {
    const month = addMonthsToKey(firstMonth, m);
    push({ account: "savings", type: "INCOME", category: "Otros ingresos", cents: between(4, 9), date: day(month, 30), description: "Intereses" });
  }

  await prisma.$transaction(
    async (tx) => {
      const user = await tx.user.create({
        data: {
          email: DEMO_EMAIL,
          name: "Usuario Demo",
          passwordHash,
          preference: { create: { timezone, minimumReserve: "500.00", budgetAlertThreshold: 80 } },
        },
      });
      const ws = await tx.workspace.create({
        data: { name: "Personal", type: "PERSONAL", currency: "EUR", members: { create: { userId: user.id, role: "OWNER" } } },
      });
      await tx.category.createMany({ data: DEFAULT_CATEGORIES.map((c) => ({ ...c, workspaceId: ws.id })) });
      const categories = await tx.category.findMany({ where: { workspaceId: ws.id } });
      const cat = (name: string, kind: "INCOME" | "EXPENSE") => {
        const c = categories.find((x) => x.name === name && x.kind === kind);
        if (!c) throw new Error(`Falta la categoría ${name}`);
        return c.id;
      };

      const accounts = {
        main: await tx.account.create({ data: { workspaceId: ws.id, name: "Cuenta corriente", type: "CHECKING", initialBalance: "1850.00", openedOn: isoToDbDate(openedOn) } }),
        savings: await tx.account.create({ data: { workspaceId: ws.id, name: "Cuenta de ahorro", type: "SAVINGS", initialBalance: "5000.00", openedOn: isoToDbDate(openedOn) } }),
        cash: await tx.account.create({ data: { workspaceId: ws.id, name: "Efectivo", type: "CASH", initialBalance: "120.00", openedOn: isoToDbDate(openedOn) } }),
      };

      // Previsiones del calendario (fase 3). Los movimientos pasados con la misma
      // descripción quedan enlazados como «registrados» desde su previsión.
      const scheduled = new Map<string, string>();
      const sched = async (
        description: string,
        type: "INCOME" | "EXPENSE",
        cents: bigint,
        frequency: "ONCE" | "WEEKLY" | "MONTHLY" | "QUARTERLY" | "YEARLY",
        startDate: string,
        category: string,
      ) => {
        const item = await tx.scheduledItem.create({
          data: {
            workspaceId: ws.id,
            accountId: accounts.main.id,
            categoryId: cat(category, type),
            type,
            amount: centsToDecimalString(cents),
            description,
            frequency,
            startDate: isoToDbDate(startDate),
          },
        });
        scheduled.set(description, item.id);
      };
      await sched("Nómina (empresa ficticia)", "INCOME", 215_000n, "MONTHLY", `${firstMonth}-28`, "Nómina");
      await sched("Alquiler", "EXPENSE", 75_000n, "MONTHLY", `${firstMonth}-01`, "Vivienda");
      await sched("Internet y móvil", "EXPENSE", 3_490n, "MONTHLY", `${firstMonth}-09`, "Suministros");
      await sched("Plataforma de vídeo", "EXPENSE", 1_299n, "MONTHLY", `${firstMonth}-12`, "Suscripciones");
      await sched("Música", "EXPENSE", 999n, "MONTHLY", `${firstMonth}-14`, "Suscripciones");
      await sched("Abono transporte", "EXPENSE", 2_000n, "MONTHLY", `${firstMonth}-02`, "Transporte");
      await sched("Seguro del hogar (anual)", "EXPENSE", 18_000n, "YEARLY", addDays(today, 20), "Vivienda");

      // Presupuestos del mes anterior y del actual (fase 2).
      const budgetLimits: [string, bigint][] = [
        ["Supermercado", 32_000n],
        ["Restaurantes", 12_000n],
        ["Ocio", 6_000n],
        ["Suscripciones", 2_500n],
        ["Transporte", 2_500n],
      ];
      for (const month of [addMonthsToKey(currentMonth, -1), currentMonth]) {
        await tx.budget.createMany({
          data: budgetLimits.map(([name, limit]) => ({
            workspaceId: ws.id,
            categoryId: cat(name, "EXPENSE"),
            month: isoToDbDate(`${month}-01`),
            limitAmount: centsToDecimalString(limit),
          })),
        });
      }

      // Objetivos de ahorro (fase 2): metas informativas, no suman saldo.
      const emergency = await tx.savingsGoal.create({
        data: {
          workspaceId: ws.id,
          name: "Fondo de emergencia",
          targetAmount: "6000.00",
          initialAmount: "2000.00",
          targetDate: isoToDbDate(addMonthsToDate(today, 14)),
          priority: "HIGH",
          linkedAccountId: accounts.savings.id,
        },
      });
      const holidays = await tx.savingsGoal.create({
        data: { workspaceId: ws.id, name: "Vacaciones", targetAmount: "1500.00", initialAmount: "0", priority: "MEDIUM" },
      });
      const goalMovements: { workspaceId: string; goalId: string; kind: "CONTRIBUTION"; amount: string; date: Date; note: string }[] = [];
      for (let m = 1; m <= 6; m += 1) {
        const date = day(addMonthsToKey(firstMonth, m), 2);
        if (date <= today) {
          goalMovements.push({ workspaceId: ws.id, goalId: emergency.id, kind: "CONTRIBUTION" as const, amount: "300.00", date: isoToDbDate(date), note: "Ahorro del mes" });
        }
      }
      for (const m of [4, 5]) {
        const date = day(addMonthsToKey(firstMonth, m), 3);
        if (date <= today) {
          goalMovements.push({ workspaceId: ws.id, goalId: holidays.id, kind: "CONTRIBUTION" as const, amount: "150.00", date: isoToDbDate(date), note: "" });
        }
      }
      await tx.goalMovement.createMany({ data: goalMovements });

      await tx.transaction.createMany({
        data: txs.map((t) => ({
          workspaceId: ws.id,
          accountId: accounts[t.account].id,
          categoryId: cat(t.category, t.type),
          type: t.type,
          amount: centsToDecimalString(t.cents),
          date: isoToDbDate(t.date),
          description: t.description,
          scheduledItemId: scheduled.get(t.description) ?? null,
        })),
      });

      for (const t of trs) {
        const amount = centsToDecimalString(t.cents);
        const date = isoToDbDate(t.date);
        const transfer = await tx.transfer.create({
          data: { workspaceId: ws.id, fromAccountId: accounts[t.from].id, toAccountId: accounts[t.to].id, amount, date, description: t.description },
        });
        await tx.transaction.createMany({
          data: [
            { workspaceId: ws.id, accountId: accounts[t.from].id, type: "TRANSFER", transferId: transfer.id, transferLeg: "OUT", amount, date, description: t.description },
            { workspaceId: ws.id, accountId: accounts[t.to].id, type: "TRANSFER", transferId: transfer.id, transferLeg: "IN", amount, date, description: t.description },
          ],
        });
      }
    },
    { timeout: 60_000 },
  );

  // Comprobación: el saldo calculado por PostgreSQL cuadra con los datos generados.
  const expected = { main: 185_000n, savings: 500_000n, cash: 12_000n };
  for (const t of txs) expected[t.account] += t.type === "INCOME" ? t.cents : -t.cents;
  for (const t of trs) {
    expected[t.from] -= t.cents;
    expected[t.to] += t.cents;
  }
  const rows = await prisma.$queryRaw<{ name: string; balance: string }[]>`
    SELECT a.name,
           (a.initial_balance + COALESCE(SUM(CASE
              WHEN t.type = 'INCOME' THEN t.amount
              WHEN t.type = 'EXPENSE' THEN -t.amount
              WHEN t.transfer_leg = 'IN' THEN t.amount
              ELSE -t.amount END), 0))::text AS balance
    FROM accounts a
    JOIN workspace_members wm ON wm.workspace_id = a.workspace_id
    JOIN users u ON u.id = wm.user_id AND u.email = ${DEMO_EMAIL}
    LEFT JOIN transactions t ON t.account_id = a.id
    GROUP BY a.id, a.name, a.initial_balance
    ORDER BY a.name`;
  const names = { main: "Cuenta corriente", savings: "Cuenta de ahorro", cash: "Efectivo" } as const;
  let ok = true;
  for (const key of Object.keys(expected) as (keyof typeof expected)[]) {
    const row = rows.find((r) => r.name === names[key]);
    const got = row ? BigInt(row.balance.replace(".", "")) : null;
    const match = got === expected[key];
    ok &&= match;
    console.info(`  ${names[key].padEnd(18)} ${formatMoney(expected[key]).padStart(14)}  ${match ? "✔ cuadra" : "✘ NO CUADRA"}`);
  }
  if (!ok) throw new Error("Los saldos no cuadran");

  console.info(
    `\nDatos de demostración cargados (hasta ${today}): ${txs.length} movimientos, ${trs.length} transferencias, ` +
      "7 previsiones, 10 presupuestos y 2 objetivos de ahorro.",
  );
  console.info(`\n  Usuario:    ${DEMO_EMAIL}`);
  if (process.env.DEMO_USER_PASSWORD) {
    console.info("  Contraseña: la definida en DEMO_USER_PASSWORD");
  } else {
    console.info(`  Contraseña: ${password}`);
    console.info("  (Se muestra solo ahora. Si la pierdes, vuelve a ejecutar npm run db:seed.)");
  }
}

main()
  .catch((error: unknown) => {
    console.error("Error al cargar los datos de demostración:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
