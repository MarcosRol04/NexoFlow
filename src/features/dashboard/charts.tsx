"use client";

import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

// Los gráficos reciben los importes en euros como `number` SOLO para dibujar.
// Todos los cálculos se hacen antes, en el servidor, con céntimos exactos.

const eur = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const eur2 = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" });

export interface MonthlyDatum {
  label: string;
  ingresos: number;
  gastos: number;
}

export function MonthlyChart({ data, currency = "EUR" }: { data: MonthlyDatum[]; currency?: string }) {
  const fmt = currency === "EUR" ? eur : new Intl.NumberFormat("es-ES", { style: "currency", currency, maximumFractionDigits: 0 });
  return (
    <div className="h-72 w-full" role="img" aria-label="Gráfico de barras de ingresos y gastos de los últimos meses">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }} barGap={4}>
          <CartesianGrid vertical={false} stroke="#e2e8f0" />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#64748b" }} />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={72}
            tick={{ fontSize: 12, fill: "#64748b" }}
            tickFormatter={(v: number) => fmt.format(v)}
          />
          <Tooltip
            cursor={{ fill: "#f1f5f9" }}
            formatter={(value) => eur2.format(Number(value))}
            contentStyle={{ borderRadius: 8, borderColor: "#e2e8f0", fontSize: 12 }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" />
          <Bar dataKey="ingresos" name="Ingresos" fill="#059669" radius={[4, 4, 0, 0]} maxBarSize={28} />
          <Bar dataKey="gastos" name="Gastos" fill="#e11d48" radius={[4, 4, 0, 0]} maxBarSize={28} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export interface CategoryDatum {
  name: string;
  value: number;
  color: string;
}

export function CategoryDonut({ data }: { data: CategoryDatum[] }) {
  return (
    <div className="h-56 w-full" role="img" aria-label="Gráfico circular de gastos por categoría">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius="58%" outerRadius="90%" paddingAngle={2} stroke="none">
            {data.map((d) => (
              <Cell key={d.name} fill={d.color} />
            ))}
          </Pie>
          <Tooltip formatter={(value) => eur2.format(Number(value))} contentStyle={{ borderRadius: 8, borderColor: "#e2e8f0", fontSize: 12 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
