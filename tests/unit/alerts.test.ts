import { describe, expect, it } from "vitest";
import { belowReserveAlert, negativeBalanceAlert, spendingIncreaseAlert } from "@/lib/finance/alerts";
import { compareSpendingMonthToDate } from "@/lib/finance/ledger";

const exp = (amountCents: bigint, date: string) => ({ type: "EXPENSE" as const, amountCents, date, accountId: "a" });

describe("avisos", () => {
  it("avisa de un aumento relevante del gasto", () => {
    const cmp = compareSpendingMonthToDate([exp(20000n, "2026-02-03"), exp(30000n, "2026-03-03")], "2026-03-10");
    const alert = spendingIncreaseAlert(cmp, "EUR");
    expect(alert?.id).toBe("spending-increase");
    expect(alert?.rule).toContain("20 %");
  });

  it("no avisa por aumentos pequeños en euros, sin datos previos o al principio de mes", () => {
    const small = compareSpendingMonthToDate([exp(1000n, "2026-02-03"), exp(3000n, "2026-03-03")], "2026-03-10");
    expect(spendingIncreaseAlert(small, "EUR")).toBeNull();
    const noPrev = compareSpendingMonthToDate([exp(30000n, "2026-03-03")], "2026-03-10");
    expect(spendingIncreaseAlert(noPrev, "EUR")).toBeNull();
    const early = compareSpendingMonthToDate([exp(1000n, "2026-02-02"), exp(90000n, "2026-03-02")], "2026-03-03");
    expect(spendingIncreaseAlert(early, "EUR")).toBeNull();
  });

  it("avisa de saldo negativo y de saldo bajo la reserva", () => {
    expect(negativeBalanceAlert(-1n, "EUR")?.severity).toBe("danger");
    expect(negativeBalanceAlert(0n, "EUR")).toBeNull();
    expect(belowReserveAlert(5000n, 10000n, "EUR")?.id).toBe("below-reserve");
    expect(belowReserveAlert(15000n, 10000n, "EUR")).toBeNull();
    expect(belowReserveAlert(5000n, 0n, "EUR")).toBeNull();
  });
});
