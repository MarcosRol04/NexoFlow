import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from "node:crypto";

// Hash de contraseñas con scrypt (incluido en Node.js, sin dependencias).
// Este módulo no lleva "server-only" para poder usarlo desde scripts (seed);
// la aplicación lo importa a través de ./password.ts.
// Formato almacenado: scrypt$<log2N>$<r>$<p>$<sal base64url>$<hash base64url>
// Guardar los parámetros permite endurecerlos en el futuro y rehacer el hash
// de forma transparente al iniciar sesión.

export interface ScryptParams {
  log2N: number;
  r: number;
  p: number;
}

export const DEFAULT_SCRYPT_PARAMS: ScryptParams = { log2N: 17, r: 8, p: 1 };
const KEY_LENGTH = 64;
const SALT_LENGTH = 16;

export const PASSWORD_MIN_LENGTH = 10;
export const PASSWORD_MAX_LENGTH = 200;

function deriveKey(password: string, salt: Buffer, params: ScryptParams): Promise<Buffer> {
  const N = 2 ** params.log2N;
  const options: ScryptOptions = {
    N,
    r: params.r,
    p: params.p,
    // Memoria necesaria ≈ 128 · N · r bytes (128 MiB con los valores por defecto).
    maxmem: 128 * N * params.r * 2,
  };
  return new Promise((resolve, reject) => {
    scrypt(password.normalize("NFKC"), salt, KEY_LENGTH, options, (error, key) => {
      if (error) reject(error);
      else resolve(key);
    });
  });
}

export async function hashPassword(password: string, params: ScryptParams = DEFAULT_SCRYPT_PARAMS): Promise<string> {
  const salt = randomBytes(SALT_LENGTH);
  const key = await deriveKey(password, salt, params);
  return ["scrypt", params.log2N, params.r, params.p, salt.toString("base64url"), key.toString("base64url")].join("$");
}

function parseHash(stored: string): { params: ScryptParams; salt: Buffer; key: Buffer } | null {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return null;
  const [, log2N, r, p, salt, key] = parts;
  const params = { log2N: Number(log2N), r: Number(r), p: Number(p) };
  if (![params.log2N, params.r, params.p].every((n) => Number.isInteger(n) && n > 0) || params.log2N > 22) return null;
  return { params, salt: Buffer.from(salt ?? "", "base64url"), key: Buffer.from(key ?? "", "base64url") };
}

export interface VerifyResult {
  ok: boolean;
  /** true si el hash usa parámetros más débiles que los actuales. */
  needsRehash: boolean;
}

export async function verifyPassword(password: string, stored: string): Promise<VerifyResult> {
  const parsed = parseHash(stored);
  if (!parsed) return { ok: false, needsRehash: false };
  const key = await deriveKey(password, parsed.salt, parsed.params);
  const ok = key.length === parsed.key.length && timingSafeEqual(key, parsed.key);
  const d = DEFAULT_SCRYPT_PARAMS;
  const needsRehash = ok && (parsed.params.log2N < d.log2N || parsed.params.r < d.r || parsed.params.p < d.p);
  return { ok, needsRehash };
}

// Hash ficticio para igualar el tiempo de respuesta cuando el correo no existe.
let dummyHash: Promise<string> | null = null;

export async function verifyAgainstDummy(password: string): Promise<void> {
  dummyHash ??= hashPassword("contraseña-ficticia-para-igualar-tiempos");
  await verifyPassword(password, await dummyHash);
}
