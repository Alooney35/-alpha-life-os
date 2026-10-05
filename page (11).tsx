import { requireUser } from "@/lib/supabase/server";
import { getProfile } from "@/lib/data/summary";
import { movingAverage, projectGoalDate, weeklyChange } from "@/lib/calc/weight";
import { Panel, Stat, Bar } from "@/components/ui/panel";
import { WeightChart } from "@/components/charts/weight-chart";
import { LogWeightForm } from "./log-form";
import { daysAgo } from "@/lib/utils";

export default async function WeightPage() {
  const { supabase, user } = await requireUser();
  const [profile, { data: rows }, { data: waist }] = await Promise.all([
    getProfile(supabase, user.id),
    supabase.from("weight_entries").select("logged_on, weight_lb, body_fat_pct").gte("logged_on", daysAgo(180)).order("logged_on"),
    supabase.from("body_measurements").select("measured_on, waist_in").order("measured_on", { ascending: false }).limit(1),
  ]);
  const points = (rows ?? []).map((r) => ({ date: r.logged_on, weightLb: Number(r.weight_lb) }));
  const smoothed = movingAverage(points);
  const goal = Number(profile?.goal_weight_lb ?? 190);
  const start = Number(profile?.starting_weight_lb ?? points[0]?.weightLb ?? 0);
  const current = smoothed.at(-1)?.avg ?? null;
  const lastBf = [...(rows ?? [])].reverse().find((r) => r.body_fat_pct != null)?.body_fat_pct;
  const projected = projectGoalDate(points, goal);
  const lost = current != null && start ? start - current : 0;
  const total = start - goal;

  return (
    <div className="space-y-4">
      <h1 className="font-display text-5xl font-bold">Body</h1>
      <Panel>
        <div className="grid grid-cols-3 gap-4">
          <Stat value={current ?? "—"} label="7-day avg lb" />
          <Stat value={weeklyChange(points) ?? "—"} label="Lb per week" tone="blue" />
          <Stat value={lastBf ? `${lastBf}%` : "—"} label="Body fat" />
        </div>
        <div className="mt-4"><WeightChart data={smoothed} goal={goal} /></div>
      </Panel>
      <Panel className="space-y-2">
        <div className="flex justify-between text-sm"><span>{start || "—"} lb start</span><span>{goal} lb goal</span></div>
        <Bar value={lost} max={total} tone="green" />
        <p className="text-sm text-muted">
          {projected ? `At this pace you reach ${goal} lb around ${new Date(projected + "T12:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}.` : "Log at least a week of weigh-ins to project your goal date."}
          {waist?.[0]?.waist_in ? ` Waist: ${waist[0].waist_in} in.` : ""}
        </p>
      </Panel>
      <Panel><h2 className="mb-3 font-display text-2xl font-semibold">Log weigh-in</h2><LogWeightForm /></Panel>
    </div>
  );
}
