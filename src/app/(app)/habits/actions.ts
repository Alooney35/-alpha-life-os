"use server";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/supabase/server";

export async function toggleHabit(habitId: string, date: string, done: boolean) {
  const { supabase, user } = await requireUser();
  if (done) await supabase.from("habit_logs").upsert({ user_id: user.id, habit_id: habitId, logged_on: date, done: true }, { onConflict: "habit_id,logged_on" });
  else await supabase.from("habit_logs").delete().eq("habit_id", habitId).eq("logged_on", date);
  revalidatePath("/habits"); revalidatePath("/dashboard");
}
