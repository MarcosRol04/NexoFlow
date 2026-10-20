import { describe, expect, it } from "vitest";
import {
  centsToDecimalString,
  centsToInput,
  decimalToCents,
  divRound,
  formatBp,
  formatMoney,
  parseAmount,
  ratioBp,
} from "@/lib/finance/money";

function cents(input: string, opts?: Parameters<typeof parseAmount>[1]) {
  const r = parseAmount(input, opts);
  if (!r.ok) throw new Error(r.error);
  return r.cents;
}

describe("parseAmount", () => {
  it("acepta formato español", () => {
    expect(cents("1.234,56")).toBe(123456n);
    expect(cents("1234,56")).toBe(123456n);
    expect(cents("12,5")).toBe(1250n);
    expect(cents("0,01")).toBe(1n);
    expect(cents("1.234.567,89")).toBe(123456789n);
  });

  it("acepta punto decimal y formato inglés", () => {
    expect(cents("1234.56")).toBe(123456n);
    expect(cents("12.5")).toBe(1250n);
    expect(cents("1,234.56")).toBe(123456n);
  });

  it("interpreta un punto con tres cifras como separador de miles", () => {
    expect(cents("1.234")).toBe(123400n);
    expect(cents("2.000")).toBe(200000n);
  });

  it("ignora espacios y el símbolo del euro", () => {
    expect(cents(" 1 234,50 € ")).toBe(123450n);
    expect(cents("45 EUR")).toBe(4500n);
  });

  it("rechaza importes vacíos, con letras o con más de dos decimales", () => {
    expect(parseAmount("").ok).toBe(false);
    expect(parseAmount("abc").ok).toBe(false);
    expect(parseAmount("12,345").ok).toBe(false);
    expect(parseAmount("1,2,3").ok).toBe(false); // varias comas = miles mal agrupados
    expect(parseAmount("1,234,567").ok).toBe(true);
    expect(parseAmount("1e5").ok).toBe(false);
    expect(parseAmount("12..5").ok).toBe(false);
  });

  it("rechaza negativos y cero salvo que se permitan", () => {
    expect(parseAmount("-5").ok).toBe(false);
    expect(parseAmount("0").ok).toBe(false);
    expect(cents("-5,25", { allowNegative: true })).toBe(-525n);
    expect(cents("5,25-", { allowNegative: true })).toBe(-525n);
    expect(cents("0", { allowZero: true })).toBe(0n);
  });

  it("rechaza importes mayores que NUMERIC(14,2)", () => {
    expect(cents("999999999999,99")).toBe(99999999999999n);
    expect(parseAmount("1000000000000").ok).toBe(false);
  });

  it("no pierde precisión con importes que fallan en coma flotante", () => {
    // 0,1 + 0,2 en coma flotante es 0,30000000000000004
    expect(cents("0,1") + cents("0,2")).toBe(cents("0,3"));
    expect(parseAmount("1,005").ok).toBe(false);
  });
});

describe("conversión con la base de datos", () => {
  it("convierte decimales de PostgreSQL a céntimos y viceversa", () => {
    expect(decimalToCents("1234.5")).toBe(123450n);
    expect(decimalToCents("-0.05")).toBe(-5n);
    expect(decimalToCents("0")).toBe(0n);
    expect(decimalToCents({ toFixed: () => "99.99" })).toBe(9999n);
    expect(centsToDecimalString(-123450n)).toBe("-1234.50");
    expect(centsToDecimalString(5n)).toBe("0.05");
    expect(centsToInput(123450n)).toBe("1234,50");
  });

  it("rechaza texto que no es un decimal", () => {
    expect(() => decimalToCents("1,5")).toThrow();
    expect(() => decimalToCents("NaN")).toThrow();
  });
});

describe("formato para España", () => {
  it("formatea euros con coma decimal", () => {
    const text = formatMoney(123456n).replace(/\s/g, " ");
    expect(text).toBe("1234,56 €");
    expect(formatMoney(123456789n).replace(/\s/g, " ")).toBe("1.234.567,89 €");
    expect(formatMoney(-500n).replace(/\s/g, " ")).toBe("-5,00 €");
  });

  it("formatea porcentajes desde puntos básicos", () => {
    expect(formatBp(1250n).replace(/\s/g, " ")).toBe("12,5 %");
    expect(formatBp(null)).toBe("—");
  });
});

describe("redondeo", () => {
  it("redondea mitad alejándose de cero", () => {
    expect(divRound(5n, 2n)).toBe(3n);
    expect(divRound(-5n, 2n)).toBe(-3n);
    expect(divRound(4n, 3n)).toBe(1n);
    expect(() => divRound(1n, 0n)).toThrow();
  });

  it("calcula proporciones en puntos básicos y devuelve null sin total", () => {
    expect(ratioBp(1n, 3n)).toBe(3333n);
    expect(ratioBp(2n, 3n)).toBe(6667n);
    expect(ratioBp(5n, 0n)).toBeNull();
  });
});
