"use client";

import { ArrowLeftRight, CalendarDays, FlaskConical, Gauge, HandCoins, LayoutDashboard, Settings, Tags, Target, Wallet } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export const NAV_ITEMS = [
  { href: "/panel", label: "Panel", icon: LayoutDashboard },
  { href: "/movimientos", label: "Movimientos", icon: ArrowLeftRight },
  { href: "/cuentas", label: "Cuentas", icon: Wallet },
  { href: "/presupuestos", label: "Presupuestos", icon: Gauge },
  { href: "/objetivos", label: "Objetivos", icon: Target },
  { href: "/calendario", label: "Calendario", icon: CalendarDays },
  { href: "/disponible", label: "Disponible", icon: HandCoins },
  { href: "/simulador", label: "Simulador", icon: FlaskConical },
  { href: "/categorias", label: "Categorías", icon: Tags },
  { href: "/ajustes", label: "Ajustes", icon: Settings },
] as const;

export function NavLinks({ orientation = "vertical" }: { orientation?: "vertical" | "horizontal" }) {
  const pathname = usePathname();
  return (
    <ul className={cn(orientation === "vertical" ? "space-y-1" : "flex gap-1 overflow-x-auto px-4 pb-2")}>
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <li key={href} className="shrink-0">
            <Link
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
              )}
            >
              <Icon className="h-4 w-4" aria-hidden />
              {label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
