// Fechas contables.
//
// - Las fechas de movimientos son días sin hora en formato ISO "AAAA-MM-DD".
// - Los meses se identifican como "AAAA-MM".
// - «Hoy» depende de la zona horaria del usuario (por defecto Europe/Madrid):
//   a las 00:30 del día 1 en Madrid ya es el mes nuevo, aunque en UTC no lo sea.
// - Los cálculos de calendario usan UTC internamente para evitar saltos por
//   el cambio de horario.

export type IsoDate = string; // AAAA-MM-DD
export type MonthKey = string; // AAAA-MM

export interface DateRange {
  /** Primer día incluido. */
  start: IsoDate;
  /** Primer día NO incluido. */
  endExclusive: IsoDate;
}

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const MONTH_KEY = /^(\d{4})-(\d{2})$/;

export function isIsoDate(value: string): boolean {
  const m = ISO_DATE.exec(value);
  if (!m) return false;
  const [, y, mo, d] = m;
  const date = new Date(Date.UTC(Number(y), Number(mo) - 1, Number(d)));
  return (
    date.getUTCFullYear() === Number(y) &&
    date.getUTCMonth() === Number(mo) - 1 &&
    date.getUTCDate() === Number(d) &&
    Number(y) >= 1900 &&
    Number(y) <= 2999
  );
}

export function isMonthKey(value: string): boolean {
  const m = MONTH_KEY.exec(value);
  return !!m && Number(m[2]) >= 1 && Number(m[2]) <= 12;
}

function toUtc(iso: IsoDate): Date {
  if (!isIsoDate(iso)) throw new RangeError(`Fecha no válida: ${iso}`);
  return new Date(`${iso}T00:00:00.000Z`);
}

function fromUtc(date: Date): IsoDate {
  return date.toISOString().slice(0, 10);
}

/** Día de hoy en la zona horaria indicada. */
export function todayIn(timeZone: string, now: Date = new Date()): IsoDate {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(now);
  } catch {
    return fromUtc(now);
  }
}

export function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

export function addDays(iso: IsoDate, days: number): IsoDate {
  const d = toUtc(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return fromUtc(d);
}

/** Días entre dos fechas (b − a). */
export function diffDays(a: IsoDate, b: IsoDate): number {
  return Math.round((toUtc(b).getTime() - toUtc(a).getTime()) / 86_400_000);
}

export function compareIso(a: IsoDate, b: IsoDate): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function monthKeyOf(iso: IsoDate): MonthKey {
  return iso.slice(0, 7);
}

export function monthStart(key: MonthKey): IsoDate {
  if (!isMonthKey(key)) throw new RangeError(`Mes no válido: ${key}`);
  return `${key}-01`;
}

export function addMonthsToKey(key: MonthKey, months: number): MonthKey {
  if (!isMonthKey(key)) throw new RangeError(`Mes no válido: ${key}`);
  const [y, m] = key.split("-").map(Number) as [number, number];
  const total = y * 12 + (m - 1) + months;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  return `${String(ny).padStart(4, "0")}-${String(nm).padStart(2, "0")}`;
}

export function daysInMonth(key: MonthKey): number {
  const [y, m] = key.split("-").map(Number) as [number, number];
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/** Mes natural completo. */
export function monthRange(key: MonthKey): DateRange {
  return { start: monthStart(key), endExclusive: monthStart(addMonthsToKey(key, 1)) };
}

/** Los `count` meses que terminan en `lastKey`, del más antiguo al más reciente. */
export function lastMonthKeys(lastKey: MonthKey, count: number): MonthKey[] {
  const keys: MonthKey[] = [];
  for (let i = count - 1; i >= 0; i -= 1) keys.push(addMonthsToKey(lastKey, -i));
  return keys;
}

/**
 * Añade meses a una fecha conservando el día cuando existe; si no existe
 * (31 de febrero), usa el último día del mes.
 */
export function addMonthsToDate(iso: IsoDate, months: number): IsoDate {
  const key = addMonthsToKey(monthKeyOf(iso), months);
  const day = Math.min(Number(iso.slice(8, 10)), daysInMonth(key));
  return `${key}-${String(day).padStart(2, "0")}`;
}

export function inRange(date: IsoDate, range: DateRange): boolean {
  return date >= range.start && date < range.endExclusive;
}

/**
 * Tramo del mes hasta hoy y el tramo equivalente del mes anterior
 * (mismos días transcurridos). Si el mes anterior es más corto, el tramo se
 * limita a su último día. Sirve para comparar sin engañar: el día 10 no se
 * compara con el mes anterior completo.
 */
export function monthToDateRanges(today: IsoDate): { current: DateRange; previous: DateRange; days: number } {
  const key = monthKeyOf(today);
  const days = Number(today.slice(8, 10));
  const prevKey = addMonthsToKey(key, -1);
  const prevDays = Math.min(days, daysInMonth(prevKey));
  return {
    current: { start: monthStart(key), endExclusive: addDays(today, 1) },
    previous: { start: monthStart(prevKey), endExclusive: addDays(monthStart(prevKey), prevDays) },
    days,
  };
}

// ───────── Conversión con la base de datos (@db.Date ↔ Date a medianoche UTC) ─────────

export function isoToDbDate(iso: IsoDate): Date {
  return toUtc(iso);
}

export function dbDateToIso(date: Date): IsoDate {
  return fromUtc(date);
}

// ───────── Formato para España ─────────

const dateFmt = new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const longDateFmt = new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
const monthFmt = new Intl.DateTimeFormat("es-ES", { month: "long", year: "numeric", timeZone: "UTC" });
const shortMonthFmt = new Intl.DateTimeFormat("es-ES", { month: "short", timeZone: "UTC" });

/** "16 oct 2026" */
export function formatDate(iso: IsoDate): string {
  return dateFmt.format(toUtc(iso));
}

/** "16 de octubre de 2026" */
export function formatLongDate(iso: IsoDate): string {
  return longDateFmt.format(toUtc(iso));
}

/** "octubre de 2026" */
export function formatMonth(key: MonthKey): string {
  return monthFmt.format(toUtc(monthStart(key)));
}

/** "oct" */
export function formatShortMonth(key: MonthKey): string {
  return shortMonthFmt.format(toUtc(monthStart(key))).replace(".", "");
}

/** Descripción legible de un periodo: "1 oct 2026 – 16 oct 2026". */
export function formatRange(range: DateRange): string {
  return `${formatDate(range.start)} – ${formatDate(addDays(range.endExclusive, -1))}`;
}
