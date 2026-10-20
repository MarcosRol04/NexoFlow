"use server";

import { redirect } from "next/navigation";
import { getClientIp } from "@/lib/auth/client-ip";
import { LIMITS, rateLimit, rateLimitMessage, resetRateLimit } from "@/lib/auth/rate-limit";
import { createSession, destroyCurrentSession } from "@/lib/auth/session";
import { type FormState, errorState } from "@/lib/form-state";
import { formDataToObject } from "@/lib/validation/common";
import { loginSchema, registerSchema } from "@/lib/validation/auth";
import { parseOrState, runAction } from "@/server/action-utils";
import { authenticate, registerUser } from "@/server/services/auth";

export async function registerAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const raw = formDataToObject(formData);
  // Nunca devolvemos contraseñas al navegador.
  const safeValues = { name: raw.name ?? "", email: raw.email ?? "" };
  const limit = rateLimit(`register:ip:${await getClientIp()}`, LIMITS.registerByIp);
  if (!limit.ok) return errorState(rateLimitMessage(limit), safeValues);

  const parsed = parseOrState(registerSchema, raw);
  if (!parsed.ok) return { ...parsed.state, values: safeValues };

  const failure = await runAction("registro", safeValues, async () => {
    const userId = await registerUser(parsed.data);
    await createSession(userId);
  });
  if (failure) return failure;
  redirect("/panel");
}

export async function loginAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const raw = formDataToObject(formData);
  const safeValues = { email: raw.email ?? "" };
  const parsed = parseOrState(loginSchema, raw);
  if (!parsed.ok) return { ...parsed.state, values: safeValues };

  const emailKey = `login:email:${parsed.data.email}`;
  const byEmail = rateLimit(emailKey, LIMITS.loginByEmail);
  const byIp = rateLimit(`login:ip:${await getClientIp()}`, LIMITS.loginByIp);
  if (!byEmail.ok) return errorState(rateLimitMessage(byEmail), safeValues);
  if (!byIp.ok) return errorState(rateLimitMessage(byIp), safeValues);

  const outcome: { authenticated: boolean } = { authenticated: false };
  const failure = await runAction("inicio de sesión", safeValues, async () => {
    const user = await authenticate(parsed.data.email, parsed.data.password);
    if (user) {
      await createSession(user.id);
      outcome.authenticated = true;
    }
  });
  if (failure) return failure;
  // Mismo mensaje exista o no el correo.
  if (!outcome.authenticated) return errorState("Correo o contraseña incorrectos.", safeValues);
  resetRateLimit(emailKey);
  redirect("/panel");
}

export async function logoutAction(): Promise<void> {
  await destroyCurrentSession();
  redirect("/iniciar-sesion");
}
