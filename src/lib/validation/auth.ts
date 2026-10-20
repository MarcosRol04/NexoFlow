import { z } from "zod";
import { PASSWORD_MAX_LENGTH_PUBLIC, PASSWORD_MIN_LENGTH_PUBLIC } from "./constants";

export const emailField = z
  .string({ error: "Introduce tu correo." })
  .trim()
  .toLowerCase()
  .max(254, { message: "El correo es demasiado largo." })
  .pipe(z.email({ error: "Introduce un correo válido." }));

export const newPasswordField = z
  .string({ error: "Introduce una contraseña." })
  .min(PASSWORD_MIN_LENGTH_PUBLIC, { message: `La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH_PUBLIC} caracteres.` })
  .max(PASSWORD_MAX_LENGTH_PUBLIC, { message: `La contraseña no puede superar ${PASSWORD_MAX_LENGTH_PUBLIC} caracteres.` });

export const registerSchema = z
  .object({
    name: z
      .string({ error: "Introduce tu nombre." })
      .trim()
      .min(1, { message: "Introduce tu nombre." })
      .max(100, { message: "Máximo 100 caracteres." }),
    email: emailField,
    password: newPasswordField,
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Las contraseñas no coinciden.",
    path: ["confirmPassword"],
  });

export const loginSchema = z.object({
  email: emailField,
  password: z
    .string({ error: "Introduce tu contraseña." })
    .min(1, { message: "Introduce tu contraseña." })
    .max(PASSWORD_MAX_LENGTH_PUBLIC, { message: "Contraseña no válida." }),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
