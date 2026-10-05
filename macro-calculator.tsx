"use client";
import { useMemo, useState } from "react";
import { alphaMacros, calculateMacros, perMeal, weekly, type ActivityLevel, type GoalType, type Sex } from "@/lib/calc/macros";
import { saveMacroSettings } from "./actions";
import { Button, Field, Input } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const GOALS: [GoalType, string][] = [
  ["aggressive_fat_loss", "Aggressive fat loss"], ["fat_loss", "Fat loss"], ["recomp", "Recomp"],
  ["maintenance", "Maintenance"], ["lean_bulk", "Lean bulk"], ["muscle_gain", "Muscle gain"],
];
const ACTIVITY: [ActivityLevel, string][] = [
  ["sedentary", "Desk, little exercise"], ["light", "1–3 workouts/wk"], ["moderate", "3–5 workouts/wk"],
  ["active", "6–7 workouts/wk"], ["very_active", "Training + physical job"],
];

export function MacroCalculator({ profile, currentWeight }: { profile: any; currentWeight: number | null }) {
  const [mode, setMode] = useState<"alpha" | "calculated">(profile?.macro_mode ?? "alpha");
  const [s, set] = useState({
    weight: currentWeight ?? 215, goalWeight: Number(profile?.goal_weight_lb ?? 190), heightIn: Number(profile?.height_in ?? 71),
    age: 36, bodyFat: "" as string, sex: (profile?.sex ?? "male") as Sex,
    activity: (profile?.activity_level ?? "moderate") as ActivityLevel, goal: (profile?.goal_type ?? "fat_loss") as GoalType,
    meals: 4,
  });
  const upd = (k: keyof typeof s) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    set({ ...s, [k]: e.target.type === "number" ? Number(e.target.value) : e.target.value });

  const calc = useMemo(() => calculateMacros({
    weightLb: s.weight, goalWeightLb: s.goalWeight, heightIn: s.heightIn, age: s.age, sex: s.sex,
    bodyFatPct: s.bodyFat ? Number(s.bodyFat) : null, activity: s.activity, goal: s.goal,
  }), [s]);
  const m = mode === "alpha" ? alphaMacros(s.goalWeight) : calc;
  const meal = perMeal(m, s.meals), wk = weekly(m);

  return (
    <form action={saveMacroSettings} className="space-y-4">
      <div role="radiogroup" aria-label="Macro mode" className="grid grid-cols-2 rounded-xl border border-line p-1">
        {(["alpha", "calculated"] as const).map((v) => (
          <button type="button" key={v} role="radio" aria-checked={mode === v} onClick={() => setMode(v)}
            className={cn("h-9 rounded-lg text-sm font-semibold", mode === v ? "bg-accent text-white" : "text-muted")}>
            {v === "alpha" ? "Alpha mode" : "Calculated"}
          </button>
        ))}
      </div>
      <input type="hidden" name="mode" value={mode} />

      <div className="grid grid-cols-2 gap-3">
        <Field label="Goal weight (lb)"><Input name="goalWeight" type="number" value={s.goalWeight} onChange={upd("goalWeight")} /></Field>
        <Field label="Meals per day"><Input type="number" min={1} max={8} value={s.meals} onChange={upd("meals")} /></Field>
        {mode === "calculated" && <>
          <Field label="Current weight (lb)"><Input type="number" value={s.weight} onChange={upd("weight")} /></Field>
          <Field label="Height (in)"><Input name="heightIn" type="number" value={s.heightIn} onChange={upd("heightIn")} /></Field>
          <Field label="Age"><Input type="number" value={s.age} onChange={upd("age")} /></Field>
          <Field label="Body fat % (optional)"><Input type="number" value={s.bodyFat} onChange={upd("bodyFat")} /></Field>
          <Field label="Sex">
            <select name="sex" value={s.sex} onChange={upd("sex")} className="h-11 w-full rounded-xl border border-line bg-transparent px-3">
              <option value="male">Male</option><option value="female">Female</option>
            </select>
          </Field>
          <Field label="Activity">
            <select name="activity" value={s.activity} onChange={upd("activity")} className="h-11 w-full rounded-xl border border-line bg-transparent px-3">
              {ACTIVITY.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </Field>
          <Field label="Goal">
            <select name="goal" value={s.goal} onChange={upd("goal")} className="h-11 w-full rounded-xl border border-line bg-transparent px-3">
              {GOALS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </Field>
        </>}
      </div>

      {mode === "calculated" && <p className="text-sm text-muted">BMR {calc.bmr} · TDEE {calc.tdee} kcal ({calc.method === "katch-mcardle" ? "Katch-McArdle, uses body fat" : "Mifflin-St Jeor"})</p>}

      <div className="overflow-x-auto">
        <table className="w-full text-right tabular-nums">
          <thead className="text-sm text-muted"><tr><th className="text-left font-normal" /><th className="font-normal">Day</th><th className="font-normal">Per meal</th><th className="font-normal">Week</th></tr></thead>
          <tbody className="font-display text-xl">
            {([["Calories", "calories", ""], ["Protein", "proteinG", "g"], ["Carbs", "carbsG", "g"], ["Fat", "fatG", "g"]] as const).map(([label, k, u]) => (
              <tr key={k} className="border-t border-line"><td className="py-2 text-left font-sans text-base">{label}</td><td>{m[k]}{u}</td><td>{meal[k]}{u}</td><td>{wk[k].toLocaleString()}{u}</td></tr>
            ))}
          </tbody>
        </table>
      </div>

      <input type="hidden" name="calories" value={m.calories} /><input type="hidden" name="protein" value={m.proteinG} />
      <input type="hidden" name="carbs" value={m.carbsG} /><input type="hidden" name="fat" value={m.fatG} />
      <input type="hidden" name="bmr" value={calc.bmr} /><input type="hidden" name="tdee" value={calc.tdee} />
      {mode === "alpha" && <><input type="hidden" name="sex" value={s.sex} /><input type="hidden" name="activity" value={s.activity} /><input type="hidden" name="goal" value={s.goal} /><input type="hidden" name="heightIn" value={s.heightIn} /></>}
      <Button className="w-full">Use these targets</Button>
    </form>
  );
}
