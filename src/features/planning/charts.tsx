"use client";

import { CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

// Importes en euros como `number` SOLO para dibujar; los cálculos se hacen en
// el servidor con céntimos exactos.

const eur0 = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const eur2 = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" });

export function ForecastChart({ data, reserve }: { data: { label: string; saldo: number }[]; reserve: number }) {
  return (
    <div className="h-64 w-full" role="img" aria-label="Gráfico del saldo previsto día a día">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="#e2e8f0" />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#64748b" }} minTickGap={24} />
          <YAxis tickLine={false} axisLine={false} width={72} tick={{ fontSize: 11, fill: "#64748b" }} tickFormatter={(v: number) => eur0.format(v)} />
          <Tooltip formatter={(value) => eur2.format(Number(value))} contentStyle={{ borderRadius: 8, borderColor: "#e2e8f0", fontSize: 12 }} />
          {reserve > 0 && <ReferenceLine y={reserve} stroke="#d97706" strokeDasharray="4 4" label={{ value: "Reserva", fontSize: 11, fill: "#b45309", position: "insideTopLeft" }} />}
          <ReferenceLine y={0} stroke="#94a3b8" />
          <Line type="stepAfter" dataKey="saldo" name="Saldo previsto" stroke="#4f46e5" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function SimulationChart({ data }: { data: { label: string; base: number; escenario: number }[] }) {
  return (
    <div className="h-72 w-full" role="img" aria-label="Gráfico del saldo simulado mes a mes: escenario base frente a escenario modificado">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="#e2e8f0" />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#64748b" }} />
          <YAxis tickLine={false} axisLine={false} width={72} tick={{ fontSize: 11, fill: "#64748b" }} tickFormatter={(v: number) => eur0.format(v)} />
          <Tooltip formatter={(value) => eur2.format(Number(value))} contentStyle={{ borderRadius: 8, borderColor: "#e2e8f0", fontSize: 12 }} />
          <Legend wrapperStyle={{ fontSize: 12 }} iconType="plainline" />
          <ReferenceLine y={0} stroke="#94a3b8" />
          <Line type="monotone" dataKey="base" name="Base (sin cambios)" stroke="#94a3b8" strokeWidth={2} strokeDasharray="5 4" dot={false} />
          <Line type="monotone" dataKey="escenario" name="Escenario" stroke="#4f46e5" strokeWidth={2.5} dot={{ r: 2 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
