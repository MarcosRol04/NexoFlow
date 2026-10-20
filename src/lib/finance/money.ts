// Dinero exacto.
//
// Reglas (ver docs/calculos-financieros.md):
// - En el código, los importes son CÉNTIMOS enteros de tipo `bigint`.
//   Nunca se usa `number` para calcular con dinero.
// - En PostgreSQL se guardan como NUMERIC(14,2): como máximo 12 cifras enteras
//   y 2 decimales.
// - Los importes que introduce el usuario se validan con como máximo 2 decimales:
//   no se redondean en silencio.
// - Cuando un cálculo necesita redondear (porcentajes, repartos, medias), se usa
//   redondeo «mitad alejándose de cero» sobre enteros.

export type Cents = bigint;

/** Máximo absoluto admitido por NUMERIC(14,2): 999.999.999.999,99. */
export const MAX_ABS_CENTS: Cents = 99_999_999_999_999n;

export type ParseAmountResult =
  | { ok: true; cents: Cents }
  | { ok: false; error: string };

export interface ParseAmountOptions {
  /** Permite importes negativos (por ejemplo, en una columna con signo de un CSV). */
  allowNegative?: boolean;
  /** Permite el importe cero. */
  allowZero?: boolean;
}

const INVISIBLE_SPACES = /[\s  ]/g;

/**
 * Convierte el texto de un importe en céntimos.
 *
 * Acepta formato español ("1.234,56", "1234,56") y con punto decimal
 * ("1234.56", "1,234.56"). Reglas para separadores:
 * - Si aparecen coma y punto, el último que aparece es el separador decimal.
 * - Si solo hay comas: una sola coma es decimal; varias son separadores de miles.
 * - Si solo hay puntos: un único punto seguido de exactamente 3 cifras se
 *   interpreta como separador de miles ("1.234" = 1234); con 1 o 2 cifras es
 *   decimal ("12.5" = 12,50). Varios puntos son separadores de miles.
 */
export function parseAmount(input: string, options: ParseAmountOptions = {}): ParseAmountResult {
  let s = String(input ?? "").replace(INVISIBLE_SPACES, "").replace(/€|eur/gi, "");
  if (s.length === 0) return { ok: false, error: "Introduce un importe." };

  let negative = false;
  if (s.startsWith("-") || s.startsWith("−")) {
    negative = true;
    s = s.slice(1);
  } else if (s.startsWith("+")) {
    s = s.slice(1);
  } else if (s.endsWith("-")) {
    negative = true;
    s = s.slice(0, -1);
  }

  if (!/^[0-9.,]+$/.test(s) || !/[0-9]/.test(s)) {
    return { ok: false, error: "El importe solo puede contener cifras y un separador decimal." };
  }

  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");
  const commaCount = s.split(",").length - 1;
  const dotCount = s.split(".").length - 1;

  let decimalSep: "," | "." | null = null;
  let thousandsSep: "," | "." | null = null;

  if (commaCount > 0 && dotCount > 0) {
    decimalSep = lastComma > lastDot ? "," : ".";
    thousandsSep = decimalSep === "," ? "." : ",";
    if (s.split(decimalSep).length - 1 > 1) {
      return { ok: false, error: "El importe tiene más de un separador decimal." };
    }
  } else if (commaCount > 0) {
    if (commaCount === 1) decimalSep = ",";
    else thousandsSep = ",";
  } else if (dotCount > 0) {
    const after = s.length - lastDot - 1;
    if (dotCount === 1 && after !== 3) decimalSep = ".";
    else thousandsSep = ".";
  }

  let integerPart = s;
  let fractionPart = "";
  if (decimalSep) {
    const idx = s.lastIndexOf(decimalSep);
    integerPart = s.slice(0, idx);
    fractionPart = s.slice(idx + 1);
  }

  if (thousandsSep) {
    const groups = integerPart.split(thousandsSep);
    const [first, ...rest] = groups;
    if (!first || first.length > 3 || rest.some((g) => g.length !== 3)) {
      return { ok: false, error: "Los separadores de miles no son correctos." };
    }
    integerPart = groups.join("");
  }

  if (integerPart === "") integerPart = "0";
  if (!/^\d+$/.test(integerPart) || !/^\d*$/.test(fractionPart)) {
    return { ok: false, error: "Formato de importe no válido." };
  }
  if (fractionPart.length > 2) {
    return { ok: false, error: "El importe admite como máximo dos decimales." };
  }

  const cents = BigInt(integerPart) * 100n + BigInt(fractionPart.padEnd(2, "0") || "0");
  const signed = negative ? -cents : cents;

  if (cents > MAX_ABS_CENTS) {
    return { ok: false, error: "El importe es demasiado grande." };
  }
  if (signed < 0n && !options.allowNegative) {
    return { ok: false, error: "El importe debe ser positivo." };
  }
  if (signed === 0n && !options.allowZero) {
    return { ok: false, error: "El importe debe ser mayor que cero." };
  }
  return { ok: true, cents: signed };
}

/** Valor decimal de la base de datos (Prisma.Decimal o texto) → céntimos. */
export function decimalToCents(value: string | { toFixed(digits: number): string }): Cents {
  const text = typeof value === "string" ? value.trim() : value.toFixed(2);
  const match = /^(-)?(\d+)(?:\.(\d+))?$/.exec(text);
  if (!match) throw new Error("Valor decimal no válido");
  const [, minus, intPart = "0", frac = ""] = match;
  let cents = BigInt(intPart) * 100n + BigInt((frac.slice(0, 2) || "0").padEnd(2, "0"));
  // Más de dos decimales (no debería ocurrir con NUMERIC(14,2)): redondeo mitad alejándose de cero.
  if (frac.length > 2 && Number(frac[2]) >= 5) cents += 1n;
  return minus ? -cents : cents;
}

/** Céntimos → texto decimal con punto, apto para Prisma/PostgreSQL ("-1234.50"). */
export function centsToDecimalString(cents: Cents): string {
  const negative = cents < 0n;
  const abs = negative ? -cents : cents;
  const intPart = abs / 100n;
  const frac = (abs % 100n).toString().padStart(2, "0");
  return `${negative ? "-" : ""}${intPart.toString()}.${frac}`;
}

/** Céntimos → texto para un campo de formulario en formato español ("1234,50"). */
export function centsToInput(cents: Cents): string {
  return centsToDecimalString(cents).replace(".", ",");
}

const formatterCache = new Map<string, Intl.NumberFormat>();

function moneyFormatter(currency: string, locale: string, signDisplay: "auto" | "always" | "exceptZero"): Intl.NumberFormat {
  const key = `${locale}|${currency}|${signDisplay}`;
  let nf = formatterCache.get(key);
  if (!nf) {
    nf = new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
      signDisplay,
    });
    formatterCache.set(key, nf);
  }
  return nf;
}

/**
 * Formatea céntimos como moneda para España: 1234,56 €.
 * Se pasa el valor a Intl como texto decimal exacto (sin pasar por coma flotante).
 */
export function formatMoney(
  cents: Cents,
  currency = "EUR",
  options: { locale?: string; signDisplay?: "auto" | "always" | "exceptZero" } = {},
): string {
  const nf = moneyFormatter(currency, options.locale ?? "es-ES", options.signDisplay ?? "auto");
  return nf.format(centsToDecimalString(cents) as `${number}`);
}

/**
 * Céntimos → number en euros, EXCLUSIVAMENTE para dibujar gráficos.
 * Nunca debe usarse el resultado para calcular.
 */
export function centsToChartNumber(cents: Cents): number {
  return Number(centsToDecimalString(cents));
}

export function sumCents(values: Iterable<Cents>): Cents {
  let total = 0n;
  for (const v of values) total += v;
  return total;
}

export function absCents(value: Cents): Cents {
  return value < 0n ? -value : value;
}

export function minCents(a: Cents, b: Cents): Cents {
  return a < b ? a : b;
}

export function maxCents(a: Cents, b: Cents): Cents {
  return a > b ? a : b;
}

/** División entera con redondeo «mitad alejándose de cero». */
export function divRound(numerator: bigint, denominator: bigint): bigint {
  if (denominator === 0n) throw new RangeError("División por cero");
  const negative = numerator < 0n !== denominator < 0n;
  const n = numerator < 0n ? -numerator : numerator;
  const d = denominator < 0n ? -denominator : denominator;
  const q = (n * 2n + d) / (2n * d);
  return negative ? -q : q;
}

/**
 * Proporción en puntos básicos (1 % = 100 pb). Devuelve null si el total es 0,
 * porque el porcentaje no está definido.
 */
export function ratioBp(part: bigint, whole: bigint): bigint | null {
  if (whole === 0n) return null;
  return divRound(part * 10_000n, whole);
}

/** Formatea puntos básicos como porcentaje español: 1250 → "12,5 %". Solo para mostrar. */
export function formatBp(bp: bigint | null, fractionDigits = 1): string {
  if (bp === null) return "—";
  const nf = new Intl.NumberFormat("es-ES", {
    style: "percent",
    minimumFractionDigits: 0,
    maximumFractionDigits: fractionDigits,
  });
  const negative = bp < 0n;
  const abs = negative ? -bp : bp;
  // Texto decimal exacto: pb / 10000.
  const intPart = abs / 10_000n;
  const frac = (abs % 10_000n).toString().padStart(4, "0");
  return nf.format(`${negative ? "-" : ""}${intPart}.${frac}` as `${number}`);
}
