import { redirect } from "next/navigation";
import { Logo } from "@/components/layout/logo";
import { getContext } from "@/server/context";

export const dynamic = "force-dynamic";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  // Si ya hay sesión, no tiene sentido volver a iniciarla.
  if (await getContext()) redirect("/panel");
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-gradient-to-b from-brand-50 to-slate-50 px-4 py-12">
      <Logo className="mb-8 text-lg" />
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">{children}</div>
      <p className="mt-6 max-w-sm text-center text-xs text-slate-500">
        Tus datos se guardan en tu propia base de datos PostgreSQL. NexoFlow no los envía a terceros.
      </p>
    </div>
  );
}
