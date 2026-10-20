import type { Metadata } from "next";
import { RegisterForm } from "@/features/auth/auth-forms";

export const metadata: Metadata = { title: "Crear cuenta" };

export default function RegisterPage() {
  return (
    <>
      <h1 className="text-xl font-semibold text-slate-900">Crea tu cuenta</h1>
      <p className="mb-6 mt-1 text-sm text-slate-500">
        Empezarás con un espacio personal y unas categorías básicas que podrás cambiar.
      </p>
      <RegisterForm />
    </>
  );
}
