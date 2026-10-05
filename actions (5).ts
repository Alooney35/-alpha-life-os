"use server";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/supabase/server";
import { estimateOneRepMax } from "@/lib/calc/overload";

export interface SetInput { exerciseId: string; exerciseName: string; setNumber: number; targetReps: number; reps: number; weightLb: number; rpe: number | null; }

const PR_LIFTS: Record<string, "bench" | "squat" | "deadlift" | "ohp"> = {
  "Bench Press": "bench", "Back Squat": "squat", "Deadlift": "deadlift", "Seated Shoulder Press": "ohp",
};

export async function saveWorkout(input: { date: string; splitDay: string; sets: SetInput[]; notes?: string; cardio?: Record<string, number | string> | null }) {
  const { supabase, user } = await requireUser();
  const sets = input.sets.filter((s) => s.reps > 0);
  if (!sets.length && !input.cardio) return { error: "Log at least one set or a cardio session." };

  const { data: session, error } = await supabase.from("workout_sessions").insert({
    user_id: user.id, scheduled_on: input.date, split_day: input.splitDay, status: "completed",
    notes: input.notes, cardio: input.cardio ?? null, completed_at: new Date().toISOString(),
  }).select("id").single();
  if (error) return { error: error.message };

  if (sets.length) {
    const { error: e2 } = await supabase.from("workout_sets").insert(sets.map((s) => ({
      session_id: session.id, user_id: user.id, exercise_id: s.exerciseId, set_number: s.setNumber,
      target_reps: s.targetReps, reps: s.reps, weight_lb: s.weightLb, rpe: s.rpe,
    })));
    if (e2) return { error: e2.message };
  }

  // PR detection by estimated 1RM
  const newPRs: string[] = [];
  for (const s of sets) {
    const lift = PR_LIFTS[s.exerciseName];
    if (!lift) continue;
    const { data: best } = await supabase.from("personal_records").select("weight_lb, reps").eq("lift", lift);
    const bestE1rm = Math.max(0, ...(best ?? []).map((b) => estimateOneRepMax(Number(b.weight_lb), b.reps)));
    if (estimateOneRepMax(s.weightLb, s.reps) > bestE1rm) {
      await supabase.from("personal_records").insert({ user_id: user.id, lift, weight_lb: s.weightLb, reps: s.reps, achieved_on: input.date });
      newPRs.push(`${s.exerciseName} ${s.weightLb} × ${s.reps}`);
    }
  }
  const { data: habit } = await supabase.from("habits").select("id").eq("key", "workout").maybeSingle();
  if (habit) await supabase.from("habit_logs").upsert({ user_id: user.id, habit_id: habit.id, logged_on: input.date, done: true }, { onConflict: "habit_id,logged_on" });
  revalidatePath("/training"); revalidatePath("/dashboard");
  return { ok: true, newPRs };
}
