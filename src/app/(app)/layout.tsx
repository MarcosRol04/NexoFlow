import { AppShell } from "@/components/layout/app-shell";
import { requireContext } from "@/server/context";

// Todas las páginas privadas dependen de la sesión: nunca se generan de forma estática.
export const dynamic = "force-dynamic";

export default async function PrivateLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireContext();
  return (
    <AppShell userName={ctx.userName} email={ctx.email}>
      {children}
    </AppShell>
  );
}
