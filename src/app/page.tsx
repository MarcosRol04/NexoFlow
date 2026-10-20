import {
  Calculator,
  CalendarClock,
  Database,
  Eye,
  ChartLine,
  PiggyBank,
  ShieldCheck,
  Target,
  Wallet,
} from "lucide-react";
import { Logo } from "@/components/layout/logo";
import { ButtonLink } from "@/components/ui/button";
import { Badge } from "@/components/ui/feedback";
import { getContext } from "@/server/context";

export const dynamic = "force-dynamic";

const QUESTIONS = [
  "¿Cuánto dinero tengo realmente, sumando todas mis cuentas?",
  "¿Cuánto he gastado este mes y en qué?",
  "¿Cuánto puedo gastar antes de mi próximo ingreso?",
  "¿Puedo permitirme esta compra? ¿Qué pasa si suben mis gastos?",
  "¿Cuándo alcanzaré mi objetivo de ahorro?",
  "¿Qué pagos tengo en las próximas semanas?",
];

const AVAILABLE = [
  { icon: Wallet, title: "Cuentas y movimientos", text: "Corriente, ahorro, efectivo u otras. Ingresos, gastos y transferencias entre tus cuentas, que no cuentan como gasto ni alteran tu patrimonio." },
  { icon: ChartLine, title: "Panel con explicaciones", text: "Saldo, ingresos, gastos, tasa de ahorro y evolución de 6 meses. Cada cifra muestra cómo se ha calculado." },
  { icon: Target, title: "Presupuestos y objetivos", text: "Límites mensuales por categoría con avisos, y metas de ahorro con el ritmo mensual necesario para llegar a tiempo." },
  { icon: CalendarClock, title: "Calendario de compromisos", text: "Pagos y cobros previstos, separados siempre de los movimientos reales. Regístralos con un clic cuando ocurran." },
  { icon: Calculator, title: "Dinero disponible", text: "Cuánto podrías gastar hasta tu próximo ingreso sin bajar de tu reserva, con la fórmula y los datos a la vista." },
  { icon: Eye, title: "Simulador y avisos", text: "Prueba compras o cambios de ingresos sin tocar tus datos. Avisos deterministas (sin IA) que explican su regla." },
];

const COMING = [
  { icon: PiggyBank, title: "Análisis comparativo por categorías" },
  { icon: Database, title: "Importación y exportación CSV" },
  { icon: ShieldCheck, title: "Recuperación de contraseña y exportación de datos" },
];

export default async function LandingPage() {
  // La portada debe mostrarse aunque la base de datos no esté disponible.
  const ctx = await getContext().catch(() => null);
  return (
    <div className="min-h-dvh bg-white">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
        <Logo />
        <nav className="flex items-center gap-2" aria-label="Acceso">
          {ctx ? (
            <ButtonLink href="/panel">Ir a mi panel</ButtonLink>
          ) : (
            <>
              <ButtonLink href="/iniciar-sesion" variant="ghost">
                Iniciar sesión
              </ButtonLink>
              <ButtonLink href="/registro">Crear cuenta</ButtonLink>
            </>
          )}
        </nav>
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-4 pb-16 pt-10 sm:px-6 lg:pt-20">
          <div className="max-w-3xl">
            <Badge tone="brand">Finanzas personales · Funciona en tu ordenador</Badge>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
              Entiende tu dinero, no solo lo apuntes.
            </h1>
            <p className="mt-5 text-lg leading-relaxed text-slate-600">
              NexoFlow registra tus cuentas y movimientos y te explica cada cifra: qué datos usa, qué periodo
              considera y qué supone. Las estimaciones se distinguen siempre de los datos reales.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href={ctx ? "/panel" : "/registro"}>{ctx ? "Ir a mi panel" : "Empezar"}</ButtonLink>
              <ButtonLink href="#como-funciona" variant="secondary">
                Cómo funciona
              </ButtonLink>
            </div>
          </div>
        </section>

        <section className="border-y border-slate-200 bg-slate-50">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-2">
            <div>
              <h2 className="text-2xl font-semibold text-slate-900">Preguntas que te ayuda a responder</h2>
              <p className="mt-2 text-slate-600">Con tus propios datos y sin cifras inventadas.</p>
            </div>
            <ul className="space-y-3">
              {QUESTIONS.map((q) => (
                <li key={q} className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-slate-800 shadow-sm">
                  {q}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section id="como-funciona" className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <h2 className="text-2xl font-semibold text-slate-900">Lo que ya puedes hacer</h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-2">
            {AVAILABLE.map(({ icon: Icon, title, text }) => (
              <div key={title} className="flex gap-4">
                <div className="h-10 w-10 shrink-0 rounded-lg bg-brand-50 p-2.5 text-brand-700">
                  <Icon className="h-5 w-5" aria-hidden />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">{title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-slate-600">{text}</p>
                </div>
              </div>
            ))}
          </div>

          <h2 className="mt-16 text-lg font-semibold text-slate-900">En desarrollo</h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-3">
            {COMING.map(({ icon: Icon, title }) => (
              <li key={title} className="flex items-center gap-3 rounded-lg border border-dashed border-slate-300 px-4 py-3 text-sm text-slate-600">
                <Icon className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
                {title}
              </li>
            ))}
          </ul>
        </section>

        <section className="bg-brand-900 text-brand-50">
          <div className="mx-auto grid max-w-6xl gap-8 px-4 py-14 sm:px-6 md:grid-cols-3">
            <div className="flex gap-3">
              <Database className="h-5 w-5 shrink-0" aria-hidden />
              <p className="text-sm leading-relaxed">Tus datos viven en tu base de datos PostgreSQL. Sin servicios de pago ni conexiones bancarias.</p>
            </div>
            <div className="flex gap-3">
              <ShieldCheck className="h-5 w-5 shrink-0" aria-hidden />
              <p className="text-sm leading-relaxed">Contraseñas con scrypt, sesiones en el servidor y aislamiento de datos comprobado también en la base de datos.</p>
            </div>
            <div className="flex gap-3">
              <Calculator className="h-5 w-5 shrink-0" aria-hidden />
              <p className="text-sm leading-relaxed">Cálculos con importes exactos al céntimo. No es asesoramiento financiero ni recomienda inversiones.</p>
            </div>
          </div>
        </section>
      </main>

      <footer className="mx-auto max-w-6xl px-4 py-8 text-xs text-slate-500 sm:px-6">
        NexoFlow es una herramienta de organización personal. No ofrece asesoramiento financiero y no ha sido auditada ni certificada.
      </footer>
    </div>
  );
}
