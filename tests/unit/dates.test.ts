import { describe, expect, it } from "vitest";
import {
  addMonthsToDate,
  addMonthsToKey,
  daysInMonth,
  diffDays,
  isIsoDate,
  lastMonthKeys,
  monthRange,
  monthToDateRanges,
  todayIn,
} from "@/lib/finance/dates";

describe("fechas", () => {
  it("valida fechas reales", () => {
    expect(isIsoDate("2026-02-28")).toBe(true);
    expect(isIsoDate("2026-02-29")).toBe(false);
    expect(isIsoDate("2028-02-29")).toBe(true);
    expect(isIsoDate("2026-13-01")).toBe(false);
    expect(isIsoDate("26-01-01")).toBe(false);
    expect(isIsoDate("2026-1-1")).toBe(false);
  });

  it("calcula límites de mes, incluidos cambios de año y bisiestos", () => {
    expect(monthRange("2026-12")).toEqual({ start: "2026-12-01", endExclusive: "2027-01-01" });
    expect(monthRange("2028-02")).toEqual({ start: "2028-02-01", endExclusive: "2028-03-01" });
    expect(daysInMonth("2028-02")).toBe(29);
    expect(daysInMonth("2026-02")).toBe(28);
    expect(addMonthsToKey("2026-01", -1)).toBe("2025-12");
    expect(addMonthsToKey("2026-11", 3)).toBe("2027-02");
    expect(lastMonthKeys("2026-02", 3)).toEqual(["2025-12", "2026-01", "2026-02"]);
  });

  it("ajusta al último día del mes al sumar meses", () => {
    expect(addMonthsToDate("2026-01-31", 1)).toBe("2026-02-28");
    expect(addMonthsToDate("2026-03-31", -1)).toBe("2026-02-28");
    expect(addMonthsToDate("2026-01-15", 12)).toBe("2027-01-15");
  });

  it("usa la zona horaria del usuario para decidir qué día es hoy", () => {
    // 31 de octubre a las 23:30 UTC = 1 de noviembre a las 00:30 en Madrid (CET)
    const now = new Date("2026-10-31T23:30:00Z");
    expect(todayIn("Europe/Madrid", now)).toBe("2026-11-01");
    expect(todayIn("UTC", now)).toBe("2026-10-31");
  });

  it("cuenta días sin verse afectado por el cambio de hora", () => {
    expect(diffDays("2026-03-28", "2026-03-30")).toBe(2);
    expect(diffDays("2026-10-24", "2026-10-26")).toBe(2);
  });

  it("compara el mes en curso con el mismo tramo del mes anterior", () => {
    const r = monthToDateRanges("2026-03-31");
    expect(r.current).toEqual({ start: "2026-03-01", endExclusive: "2026-04-01" });
    // Febrero tiene 28 días: el tramo se limita a su último día.
    expect(r.previous).toEqual({ start: "2026-02-01", endExclusive: "2026-03-01" });
    const r2 = monthToDateRanges("2026-03-10");
    expect(r2.previous).toEqual({ start: "2026-02-01", endExclusive: "2026-02-11" });
    expect(r2.days).toBe(10);
  });
});
