import type { Metadata } from "next";
import { LoginForm } from "@/features/auth/auth-forms";

export const metadata: Metadata = { title: "Iniciar sesión" };

export default function LoginPage() {
  return (
    <>
      <h1 className="text-xl font-semibold text-slate-900">Inicia sesión</h1>
      <p className="mb-6 mt-1 text-sm text-slate-500">Accede a tus cuentas y movimientos.</p>
      <LoginForm />
    </>
  );
}
