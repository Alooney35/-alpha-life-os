"use client";
import { Area, AreaChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function WeightChart({ data, goal }: { data: { date: string; weightLb: number; avg: number }[]; goal: number }) {
  if (data.length < 2) return <p className="py-10 text-center text-muted">Log two weigh-ins to see your trend.</p>;
  const min = Math.min(goal, ...data.map((d) => d.weightLb)) - 3;
  const max = Math.max(...data.map((d) => d.weightLb)) + 2;
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 8, right: 4, left: -18, bottom: 0 }}>
          <defs>
            <linearGradient id="wfill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.35} />
              <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="date" tickFormatter={(d) => d.slice(5)} tick={{ fill: "var(--muted)", fontSize: 11 }} axisLine={false} tickLine={false} minTickGap={24} />
          <YAxis domain={[Math.floor(min), Math.ceil(max)]} tick={{ fill: "var(--muted)", fontSize: 11 }} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={{ background: "var(--bg)", border: "1px solid var(--line)", borderRadius: 12 }} />
          <ReferenceLine y={goal} stroke="var(--go)" strokeDasharray="4 4" label={{ value: `Goal ${goal}`, fill: "var(--go)", fontSize: 11, position: "insideBottomRight" }} />
          <Area type="monotone" dataKey="avg" name="7-day avg" stroke="var(--accent)" strokeWidth={2.5} fill="url(#wfill)" />
          <Area type="monotone" dataKey="weightLb" name="Weigh-in" stroke="var(--muted)" strokeWidth={0} fill="none" dot={{ r: 2, fill: "var(--muted)" }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
