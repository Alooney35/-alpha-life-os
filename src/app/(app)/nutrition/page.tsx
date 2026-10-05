import { requireUser } from "@/lib/supabase/server";
import { getProfile, targetsFor } from "@/lib/data/summary";
import { Panel, Bar } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";
import { today } from "@/lib/utils";
import { MacroCalculator } from "./macro-calculator";
import { FoodLogger } from "./food-logger";
import { copyPreviousDay, deleteLog } from "./actions";

const MEALS = ["breakfast", "lunch", "dinner", "snack"] as const;

export default async function NutritionPage() {
  const { supabase, user } = await requireUser();
  const date = today();
  const [profile, { data: logs }, { data: lastW }] = await Promise.all([
    getProfile(supabase, user.id),
    supabase.from("food_logs").select("id, meal, servings, calories, protein_g, carbs_g, fat_g, foods(name)").eq("logged_on", date).order("created_at"),
    supabase.from("weight_entries").select("weight_lb").order("logged_on", { ascending: false }).limit(1),
  ]);
  const current = lastW?.[0] ? Number(lastW[0].weight_lb) : null;
  const t = targetsFor(profile, current);
  const sum = (k: "calories" | "protein_g" | "carbs_g" | "fat_g") => Math.round((logs ?? []).reduce((a, l) => a + Number(l[k]), 0));

  return (
    <div className="space-y-4">
      <h1 className="font-display text-5xl font-bold">Fuel</h1>
      <Panel className="space-y-3">
        {([["Calories", sum("calories"), t.calories], ["Protein", sum("protein_g"), t.proteinG], ["Carbs", sum("carbs_g"), t.carbsG], ["Fat", sum("fat_g"), t.fatG]] as const).map(([l, got, goal]) => (
          <div key={l}><div className="mb-1 flex justify-between text-sm"><span>{l}</span><span className="tabular-nums text-muted">{got} / {goal} · {Math.max(0, goal - got)} left</span></div><Bar value={got} max={goal} tone={l === "Protein" ? "green" : "blue"} /></div>
        ))}
      </Panel>

      <Panel><h2 className="mb-3 font-display text-2xl font-semibold">Log food</h2><FoodLogger date={date} /></Panel>

      <Panel className="space-y-4">
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-2xl font-semibold">Today</h2>
          <form action={async () => { "use server"; await copyPreviousDay(date); }}><Button variant="ghost" className="h-9 text-xs">Copy yesterday</Button></form>
        </div>
        {MEALS.map((m) => {
          const items = (logs ?? []).filter((l) => l.meal === m);
          return (
            <div key={m}>
              <h3 className="text-sm capitalize text-muted">{m}</h3>
              {items.length === 0 ? <p className="py-1 text-sm text-muted/70">Nothing logged</p> : (
                <ul>{items.map((l: any) => (
                  <li key={l.id} className="flex items-center justify-between gap-2 py-1.5">
                    <span>{l.foods?.name ?? "Recipe"} <span className="text-sm text-muted">× {Number(l.servings)}</span></span>
                    <span className="flex items-center gap-3 text-sm tabular-nums text-muted">{Math.round(l.calories)} kcal · {Math.round(l.protein_g)}g P
                      <form action={async () => { "use server"; await deleteLog(l.id); }}><button aria-label="Remove" className="px-1 text-warn">×</button></form>
                    </span>
                  </li>))}
                </ul>
              )}
            </div>
          );
        })}
      </Panel>

      <Panel><h2 className="mb-3 font-display text-2xl font-semibold">Macro targets</h2><MacroCalculator profile={profile} currentWeight={current} /></Panel>
    </div>
  );
}
