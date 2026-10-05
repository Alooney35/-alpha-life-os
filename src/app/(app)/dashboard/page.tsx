import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import { getDashboard } from "@/lib/data/summary";
import { movingAverage } from "@/lib/calc/weight";
import { Panel, Stat, Bar } from "@/components/ui/panel";
import { WeightChart } from "@/components/charts/weight-chart";
import { money } from "@/lib/utils";

export default async function Dashboard() {
  const { supabase, user } = await requireUser();
  const d = await getDashboard(supabase, user.id);
  const remaining = d.current != null ? Math.round((d.current - d.goal) * 10) / 10 : null;
  const pillars = [
    { label: "Body", v: d.score.weight }, { label: "Nutrition", v: d.score.nutrition },
    { label: "Training", v: d.score.training }, { label: "Money", v: d.score.finances },
  ];
  const macros = [
    { label: "Calories", got: d.eaten.calories, goal: d.targets.calories, unit: "" },
    { label: "Protein", got: d.eaten.protein_g, goal: d.targets.proteinG, unit: "g" },
    { label: "Carbs", got: d.eaten.carbs_g, goal: d.targets.carbsG, unit: "g" },
    { label: "Fat", got: d.eaten.fat_g, goal: d.targets.fatG, unit: "g" },
  ];

  return (
    <div className="space-y-4">
      <header className="flex items-end justify-between gap-4 pt-2">
        <div>
          <p className="text-muted">This week</p>
          <h1 className="font-display text-[5.5rem] font-bold leading-[0.8] tabular-nums">{d.score.total}</h1>
          <p className="mt-2 text-sm text-muted">Alpha Score</p>
        </div>
        <div className="text-right">
          <Link href="/settings" className="text-sm text-muted hover:text-fg">Settings</Link>
          <div className="mt-2 font-display text-7xl font-bold leading-none text-go">{d.score.grade}</div>
        </div>
      </header>

      <Panel className="grid grid-cols-4 gap-3">
        {pillars.map((p) => (
          <div key={p.label} className="space-y-1.5">
            <div className="font-display text-2xl font-semibold tabular-nums">{p.v}</div>
            <Bar value={p.v} max={100} tone={p.v >= 80 ? "green" : p.v >= 60 ? "blue" : "warn"} />
            <div className="text-xs text-muted">{p.label}</div>
          </div>
        ))}
      </Panel>

      <Panel>
        <div className="grid grid-cols-3 gap-4">
          <Stat value={d.current ?? "—"} label="Current lb" />
          <Stat value={remaining ?? "—"} label="To goal" tone="blue" />
          <Stat value={d.wkChange == null ? "—" : `${d.wkChange > 0 ? "+" : ""}${d.wkChange}`} label="Lb per week" tone={d.wkChange != null && d.wkChange < 0 ? "green" : undefined} />
        </div>
        <div className="mt-4"><WeightChart data={movingAverage(d.points)} goal={d.goal} /></div>
      </Panel>

      <Panel>
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-2xl font-semibold">Fuel today</h2>
          <Link href="/nutrition" className="text-sm text-accent">Log food</Link>
        </div>
        <div className="mt-3 space-y-3">
          {macros.map((m) => (
            <div key={m.label}>
              <div className="mb-1 flex justify-between text-sm"><span>{m.label}</span><span className="tabular-nums text-muted">{m.got}{m.unit} / {m.goal}{m.unit}</span></div>
              <Bar value={m.got} max={m.goal} tone={m.label === "Protein" ? "green" : "blue"} />
            </div>
          ))}
        </div>
      </Panel>

      <div className="grid grid-cols-2 gap-4">
        <Panel className="space-y-3">
          <Stat value={`${d.workoutPct}%`} label="Workouts done" tone="blue" />
          <Stat value={d.workoutStreakDays} label="Day streak" />
        </Panel>
        <Panel className="space-y-3">
          <Stat value={money(d.allowance.remaining)} label="Allowance left" tone={d.allowance.exceeded ? "warn" : "green"} />
          <Stat value={`${d.habitScore}%`} label="Habit score" />
        </Panel>
      </div>

      <Link href="/checkin" className="glass block rounded-2xl p-4 text-center font-semibold text-accent">Start Sunday check-in</Link>
    </div>
  );
}
