import { Calculator } from "lucide-react";
import type { Explanation } from "@/lib/finance/ledger";
import { Badge } from "./feedback";

/** Desplegable «¿Cómo se calcula?» con la fórmula, los datos y los supuestos. */
export function Explain({ explanation, label = "¿Cómo se calcula?" }: { explanation: Explanation; label?: string }) {
  return (
    <details className="group mt-3 text-sm">
      <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 text-xs font-medium text-brand-700 hover:underline">
        <Calculator className="h-3.5 w-3.5" aria-hidden />
        {label}
      </summary>
      <div className="mt-2 space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
        <div className="flex flex-wrap items-center gap-2">
          {explanation.isEstimate ? <Badge tone="estimate">Estimación</Badge> : <Badge tone="positive">Dato real</Badge>}
          {explanation.period && <span className="text-slate-500">Periodo: {explanation.period}</span>}
        </div>
        <p className="font-medium text-slate-800">{explanation.formula}</p>
        {explanation.inputs.length > 0 && (
          <dl className="divide-y divide-slate-200 rounded-md border border-slate-200 bg-white">
            {explanation.inputs.map((input) => (
              <div key={input.label} className="flex justify-between gap-3 px-2.5 py-1.5">
                <dt className="text-slate-600">{input.label}</dt>
                <dd className="tabular font-medium text-slate-900">{input.value}</dd>
              </div>
            ))}
          </dl>
        )}
        {explanation.assumptions.length > 0 && (
          <ul className="list-disc space-y-1 pl-4 text-slate-600">
            {explanation.assumptions.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
        )}
      </div>
    </details>
  );
}
