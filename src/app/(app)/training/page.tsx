import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import { suggestNextWeight, estimateOneRepMax, type BodyRegion, type LoggedSet } from "@/lib/calc/overload";
import { splitFor, SPLIT_LABEL, calendar, type SplitDay } from "@/lib/calc/split";
import { Panel, Bar } from "@/components/ui/panel";
import { WorkoutLogger, type PlannedExercise } from "./workout-logger";
import { today, daysAgo, cn } from "@/lib/utils";

const DAYS: SplitDay[] = ["push", "pull", "legs", "upper_abs", "cardio_recovery"];

export default async function TrainingPage({ searchParams }: { searchParams: Promise<{ day?: string }> }) {
  const { supabase } = await requireUser();
  const date = today();
  const sp = await searchParams;
  const scheduled = splitFor(date);
  const day = (DAYS.includes(sp.day as SplitDay) ? sp.day : scheduled === "rest" ? "push" : scheduled) as SplitDay;

  const [{ data: exercises }, { data: sessions }, { data: prs }, { data: goals }] = await Promise.all([
    supabase.from("exercises").select("id, name, body_region").eq("split_day", day).order("is_compound", { ascending: false }),
    supabase.from("workout_sessions").select("scheduled_on, status").eq("status", "completed").gte("scheduled_on", daysAgo(35)),
    supabase.from("personal_records").select("lift, weight_lb, reps, achieved_on").order("achieved_on", { ascending: false }),
    supabase.from("goals").select("kind, name, target_value").in("kind", ["squat", "bench"]),
  ]);

  const ids = (exercises ?? []).map((e) => e.id);
  const { data: history } = ids.length
    ? await supabase.from("workout_sets").select("exercise_id, session_id, reps, target_reps, weight_lb, rpe, created_at").in("exercise_id", ids).order("created_at", { ascending: false }).limit(400)
    : { data: [] as any[] };

  const planned: PlannedExercise[] = (exercises ?? []).map((e) => {
    const mine = (history ?? []).filter((h) => h.exercise_id === e.id);
    const sessionIds = [...new Set(mine.map((h) => h.session_id))];
    const toSets = (sid?: string): LoggedSet[] => mine.filter((h) => h.session_id === sid)
      .map((h) => ({ reps: h.reps, targetReps: h.target_reps ?? h.reps, weightLb: Number(h.weight_lb), rpe: h.rpe }));
    const last = toSets(sessionIds[0]), prev = sessionIds[1] ? toSets(sessionIds[1]) : undefined;
    return {
      id: e.id, name: e.name, region: e.body_region,
      suggestion: last.length ? suggestNextWeight(e.body_region as BodyRegion, last, prev) : null,
      lastSummary: last.length ? `${last.map((s) => `${s.weightLb}×${s.reps}`).join(", ")}` : null,
    };
  });

  const best = (lift: string) => Math.max(0, ...(prs ?? []).filter((p) => p.lift === lift).map((p) => estimateOneRepMax(Number(p.weight_lb), p.reps)));
  const cal = calendar(daysAgo(27), date, new Set((sessions ?? []).map((s) => s.scheduled_on)), date);
  const trainingDays = cal.filter((c) => c.status === "completed" || c.status === "missed");
  const compliance = trainingDays.length ? Math.round((trainingDays.filter((c) => c.status === "completed").length / trainingDays.length) * 100) : 0;

  return (
    <div className="space-y-4">
      <h1 className="font-display text-5xl font-bold">Train</h1>

      <Panel className="space-y-3">
        {(goals ?? []).map((g) => {
          const current = best(g.kind);
          return (
            <div key={g.kind}>
              <div className="mb-1 flex justify-between text-sm"><span>{g.name}</span><span className="tabular-nums text-muted">{current || "—"} / {g.target_value} est. 1RM</span></div>
              <Bar value={current} max={Number(g.target_value)} tone="green" />
            </div>
          );
        })}
      </Panel>

      <Panel>
        <div className="mb-2 flex items-baseline justify-between"><h2 className="font-display text-2xl font-semibold">Last 4 weeks</h2><span className="text-sm text-muted">{compliance}% compliance</span></div>
        <div className="grid grid-cols-7 gap-1.5" role="list">
          {cal.map((c) => (
            <div key={c.date} role="listitem" title={`${c.date}: ${SPLIT_LABEL[c.split]}, ${c.status}`}
              className={cn("aspect-square rounded-md",
                c.status === "completed" && "bg-go", c.status === "missed" && "bg-warn/70",
                c.status === "rest" && "bg-line/50", c.status === "upcoming" && "border border-accent")} />
          ))}
        </div>
      </Panel>

      <nav aria-label="Workout day" className="flex gap-2 overflow-x-auto pb-1">
        {DAYS.map((d) => (
          <Link key={d} href={`/training?day=${d}`} className={cn("shrink-0 rounded-full border px-3 py-1.5 text-sm", d === day ? "border-accent bg-accent text-white" : "border-line text-muted")}>
            {SPLIT_LABEL[d]}{d === scheduled ? " · today" : ""}
          </Link>
        ))}
      </nav>

      <Panel>
        <h2 className="mb-3 font-display text-2xl font-semibold">{SPLIT_LABEL[day]}</h2>
        <WorkoutLogger key={day} date={date} splitDay={day} exercises={planned} />
      </Panel>

      {(prs?.length ?? 0) > 0 && (
        <Panel>
          <h2 className="mb-2 font-display text-2xl font-semibold">Personal records</h2>
          <ul className="divide-y divide-line">{prs!.slice(0, 8).map((p, i) => (
            <li key={i} className="flex justify-between py-2 text-sm"><span className="capitalize">{p.lift}</span><span className="tabular-nums">{Number(p.weight_lb)} × {p.reps} <span className="text-muted">{p.achieved_on}</span></span></li>
          ))}</ul>
        </Panel>
      )}
    </div>
  );
}
