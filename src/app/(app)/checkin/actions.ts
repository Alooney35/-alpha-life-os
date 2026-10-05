"use server";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/supabase/server";
import { gradeCheckIn } from "@/lib/calc/score";
import { weekStart } from "@/lib/calc/allowance";

export async function submitCheckIn(_: unknown, form: FormData) {
  const { supabase, user } = await requireUser();
  const answers = {
    proteinDays: Number(form.get("proteinDays")), mealsOut: Number(form.get("mealsOut")),
    workoutsCompleted: form.get("workouts") === "yes", withinAllowance: form.get("allowance") === "yes", mealPrepDone: form.get("mealPrep") === "yes",
  };
  const result = gradeCheckIn(answers);
  const { error } = await supabase.from("weekly_checkins").upsert({
    user_id: user.id, week_start: weekStart(), protein_days: answers.proteinDays, meals_out: answers.mealsOut,
    workouts_completed: answers.workoutsCompleted, within_allowance: answers.withinAllowance, meal_prep_done: answers.mealPrepDone,
    grade: result.grade, action_plan: result.actions.join("\n"),
  }, { onConflict: "user_id,week_start" });
  if (error) return { error: error.message };
  revalidatePath("/checkin");
  return result;
}
