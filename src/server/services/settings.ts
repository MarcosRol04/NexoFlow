import "server-only";
import { prisma } from "@/lib/db/prisma";
import { centsToDecimalString } from "@/lib/finance/money";
import type { PreferencesInput } from "@/lib/validation/finance";
import type { AppContext } from "../context";

/** Preferencias de cálculo del usuario (zona horaria, reserva mínima, umbral de avisos). */
export async function updatePreferences(ctx: AppContext, input: PreferencesInput): Promise<void> {
  const data = {
    timezone: input.timezone,
    minimumReserve: centsToDecimalString(input.minimumReserve),
    budgetAlertThreshold: input.budgetAlertThreshold,
  };
  await prisma.userPreference.upsert({
    where: { userId: ctx.userId },
    create: { userId: ctx.userId, ...data },
    update: data,
  });
}
