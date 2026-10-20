import { LogOut } from "lucide-react";
import { logoutAction } from "@/features/auth/actions";
import { Logo } from "./logo";
import { NavLinks } from "./nav-links";

export function AppShell({ userName, email, children }: { userName: string; email: string; children: React.ReactNode }) {
  const initials = userName
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const logout = (
    <form action={logoutAction}>
      <button
        type="submit"
        className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
      >
        <LogOut className="h-4 w-4" aria-hidden />
        Cerrar sesión
      </button>
    </form>
  );

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[15rem_1fr]">
      <a href="#contenido" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-2">
        Saltar al contenido
      </a>

      {/* Barra lateral (escritorio) */}
      <aside className="hidden border-r border-slate-200 bg-white lg:flex lg:flex-col">
        <div className="px-5 py-5">
          <Logo href="/panel" />
        </div>
        <nav aria-label="Navegación principal" className="flex-1 px-3">
          <NavLinks />
        </nav>
        <div className="border-t border-slate-200 p-3">
          <div className="mb-2 flex items-center gap-3 px-3 py-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700" aria-hidden>
              {initials || "?"}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-slate-900">{userName}</p>
              <p className="truncate text-xs text-slate-500">{email}</p>
            </div>
          </div>
          {logout}
        </div>
      </aside>

      {/* Cabecera (móvil y tableta) */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur lg:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <Logo href="/panel" />
          {logout}
        </div>
        <nav aria-label="Navegación principal">
          <NavLinks orientation="horizontal" />
        </nav>
      </header>

      <main id="contenido" className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        {children}
      </main>
    </div>
  );
}
