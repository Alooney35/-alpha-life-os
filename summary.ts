import type { SupabaseClient } from "@supabase/supabase-js";
import { alphaMacros, calculateMacros, type Macros } from "@/lib/calc/macros";
import { weeklyChange } from "@/lib/calc/weight";
import { allowanceState, weekStart } from "@/lib/calc/allowance";
import { alphaScore, streak } from "@/lib/calc/score";
import { today, daysAgo } from "@/lib/utils";
import { scheduledDays } from "@/lib/calc/split";

export async function getProfile(supabase: SupabaseClient, userId: string) {
  const { data } = await supabase.from("profiles").select("*").eq("id", userId).single();
  return data;
}

export function ageFrom(birth?: string | null) {
  if (!birth) return 35;
  const b = new Date(birth), n = new Date();
  return n.getFullYear() - b.getFullYear() - (n < new Date(n.getFullYear(), b.getMonth(), b.getDate()) ? 1 : 0);
}

/** Resolves the user's active macro targets from their profile settings. */
export function targetsFor(profile: any, currentWeight: number | null): Macros {
  const goal = Number(profile?.goal_weight_lb ?? 190);
  if (profile?.macro_mode !== "calculated" || !currentWeight || !profile?.height_in) return alphaMacros(goal);
  return calculateMacros({
    weightLb: currentWeight, goalWeightLb: goal, heightIn: Number(profile.height_in), age: ageFrom(profile.birth_date),
    sex: profile.sex ?? "male", activity: profile.activity_level, goal: profile.goal_type,
  });
}

export async function getDashboard(supabase: SupabaseClient, userId: string) {
  const ws = weekStart();
  const [profile, weights, todayFood, weekFood, sessions, allowanceTx, allowanceWeek, habitLogs] = await Promise.all([
    getProfile(supabase, userId),
    supabase.from("weight_entries").select("logged_on, weight_lb").gte("logged_on", daysAgo(60)).order("logged_on"),
    supabase.from("daily_nutrition").select("*").eq("logged_on", today()).maybeSingle(),
    supabase.from("daily_nutrition").select("*").gte("logged_on", ws),
    supabase.from("workout_sessions").select("scheduled_on, status, split_day").gte("scheduled_on", daysAgo(90)),
    supabase.from("allowance_transactions").select("amount").gte("spent_on", ws),
    supabase.from("allowance_weeks").select("carryover_in").eq("week_start", ws).maybeSingle(),
    supabase.from("habit_logs").select("logged_on, done").gte("logged_on", ws).eq("done", true),
  ]);

  const points = (weights.data ?? []).map((w) => ({ date: w.logged_on, weightLb: Number(w.weight_lb) }));
  const current = points.at(-1)?.weightLb ?? null;
  const goal = Number(profile?.goal_weight_lb ?? 190);
  const targets = targetsFor(profile, current);
  const wkChange = weeklyChange(points);

  const s = sessions.data ?? [];
  const scheduled = scheduledDays(ws, today());
  const doneDates = new Set(s.filter((x) => x.status === "completed").map((x) => x.scheduled_on));
  const completedWeek = scheduled.filter((d) => doneDates.has(d)).length;
  const thisWeek = { length: scheduled.length };
  const workoutStreakDays = streak(s.filter((x) => x.status === "completed").map((x) => x.scheduled_on));

  const spent = (allowanceTx.data ?? []).reduce((a, t) => a + Number(t.amount), 0);
  const allowance = allowanceState(Number(profile?.weekly_allowance ?? 100), Number(allowanceWeek.data?.carryover_in ?? 0), spent);

  const days = weekFood.data ?? [];
  const proteinDays = days.filter((d) => d.protein_g >= targets.proteinG * 0.95).length;
  const calorieDays = days.filter((d) => Math.abs(d.calories - targets.calories) <= targets.calories * 0.1).length;
  const habitScore = Math.round(((habitLogs.data?.length ?? 0) / (6 * allowance.daysElapsed)) * 100);

  const target = Number(profile?.goal_type === "maintenance" ? 0 : current && current > goal ? -1 : 0.5);
  const score = alphaScore({
    weeklyChangeLb: wkChange, targetWeeklyChangeLb: target, proteinDays, calorieDays,
    workoutsCompleted: completedWeek, workoutsScheduled: thisWeek.length,
    allowanceAvailable: allowance.available, allowanceSpent: allowance.spent,
  });

  return {
    profile, points, current, goal, targets, wkChange,
    eaten: todayFood.data ?? { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
    workoutPct: thisWeek.length ? Math.round((completedWeek / thisWeek.length) * 100) : 0,
    workoutStreakDays, allowance, habitScore: Math.min(100, habitScore), score,
  };
}
