import { requireUser } from "@/lib/supabase/server";
import { streak } from "@/lib/calc/score";
import { Panel, Stat } from "@/components/ui/panel";
import { toggleHabit } from "./actions";
import { today, daysAgo, cn } from "@/lib/utils";

export default async function HabitsPage() {
  const { supabase } = await requireUser();
  const date = today();
  const [{ data: habits }, { data: logs }] = await Promise.all([
    supabase.from("habits").select("id, key, name").eq("active", true).order("created_at"),
    supabase.from("habit_logs").select("habit_id, logged_on").eq("done", true).gte("logged_on", daysAgo(83)),
  ]);
  const h = habits ?? [], l = logs ?? [];
  const pct = (days: number) => {
    const from = daysAgo(days - 1);
    return h.length ? Math.round((l.filter((x) => x.logged_on >= from).length / (h.length * days)) * 100) : 0;
  };
  const days = Array.from({ length: 84 }, (_, i) => daysAgo(83 - i));
  const perDay = new Map<string, number>();
  l.forEach((x) => perDay.set(x.logged_on, (perDay.get(x.logged_on) ?? 0) + 1));

  return (
    <div className="space-y-4">
      <h1 className="font-display text-5xl font-bold">Habits</h1>
      <Panel className="grid grid-cols-2 gap-4"><Stat value={`${pct(7)}%`} label="Last 7 days" tone="green" /><Stat value={`${pct(30)}%`} label="Last 30 days" /></Panel>

      <Panel>
        <h2 className="mb-2 font-display text-2xl font-semibold">Today</h2>
        <ul className="divide-y divide-line">
          {h.map((habit) => {
            const done = l.some((x) => x.habit_id === habit.id && x.logged_on === date);
            const s = streak(l.filter((x) => x.habit_id === habit.id).map((x) => x.logged_on));
            return (
              <li key={habit.id}>
                <form action={toggleHabit.bind(null, habit.id, date, !done)}>
                  <button className="flex w-full items-center justify-between gap-3 py-3 text-left" aria-pressed={done}>
                    <span className="flex items-center gap-3">
                      <span className={cn("grid size-6 place-items-center rounded-md border-2", done ? "border-go bg-go text-black" : "border-line")}>{done ? "✓" : ""}</span>
                      {habit.name}
                    </span>
                    <span className="text-sm tabular-nums text-muted">{s} day{s === 1 ? "" : "s"}</span>
                  </button>
                </form>
              </li>
            );
          })}
        </ul>
      </Panel>

      <Panel>
        <h2 className="mb-2 font-display text-2xl font-semibold">12 weeks</h2>
        <div className="grid grid-flow-col grid-rows-7 gap-1" role="img" aria-label="Habit completion heatmap for the last 12 weeks">
          {days.map((d) => {
            const r = h.length ? (perDay.get(d) ?? 0) / h.length : 0;
            return <div key={d} title={`${d}: ${perDay.get(d) ?? 0}/${h.length}`} className="aspect-square rounded-[3px]"
              style={{ background: r === 0 ? "var(--line)" : `color-mix(in srgb, var(--go) ${Math.round(25 + r * 75)}%, transparent)` }} />;
          })}
        </div>
      </Panel>
    </div>
  );
}
