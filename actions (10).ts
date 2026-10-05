"use server";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/supabase/server";

export async function logWeight(_: unknown, form: FormData) {
  const { supabase, user } = await requireUser();
  const weight = Number(form.get("weight"));
  const bf = form.get("bodyfat") ? Number(form.get("bodyfat")) : null;
  const waist = form.get("waist") ? Number(form.get("waist")) : null;
  const date = String(form.get("date") || new Date().toISOString().slice(0, 10));
  if (!(weight > 50 && weight < 700)) return { error: "Enter a weight between 50 and 700 lb." };

  const { error } = await supabase.from("weight_entries")
    .upsert({ user_id: user.id, logged_on: date, weight_lb: weight, body_fat_pct: bf }, { onConflict: "user_id,logged_on" });
  if (error) return { error: error.message };
  if (waist) await supabase.from("body_measurements").insert({ user_id: user.id, measured_on: date, waist_in: waist });
  revalidatePath("/weight"); revalidatePath("/dashboard");
  return { ok: true };
}
