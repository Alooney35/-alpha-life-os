"use server";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/supabase/server";
import type { FoodResult } from "@/app/api/foods/types";

type Meal = "breakfast" | "lunch" | "dinner" | "snack";

export async function logFood(food: FoodResult, meal: Meal, servings: number, date: string) {
  if (!(servings > 0 && servings < 50)) return { error: "Servings must be between 0 and 50." };
  const { supabase, user } = await requireUser();

  // Save into the user's library so it shows up as a saved/recent food next time
  let { data: existing } = await supabase.from("foods").select("id")
    .eq("user_id", user.id).eq("source", food.source).eq("external_id", food.externalId).maybeSingle();
  if (!existing) {
    const { data, error } = await supabase.from("foods").insert({
      user_id: user.id, name: food.name, brand: food.brand, source: food.source, external_id: food.externalId,
      barcode: food.source === "openfoodfacts" ? food.externalId : null,
      serving_size: food.servingSize, serving_unit: food.servingUnit, calories: food.calories,
      protein_g: food.proteinG, carbs_g: food.carbsG, fat_g: food.fatG, fiber_g: food.fiberG, sugar_g: food.sugarG, sodium_mg: food.sodiumMg,
    }).select("id").single();
    if (error) return { error: error.message };
    existing = data;
  }

  const { error } = await supabase.from("food_logs").insert({
    user_id: user.id, logged_on: date, meal, food_id: existing!.id, servings,
    calories: food.calories * servings, protein_g: food.proteinG * servings, carbs_g: food.carbsG * servings,
    fat_g: food.fatG * servings, fiber_g: food.fiberG * servings,
  });
  if (error) return { error: error.message };
  revalidatePath("/nutrition"); revalidatePath("/dashboard");
  return { ok: true };
}

export async function deleteLog(id: string) {
  const { supabase } = await requireUser();
  await supabase.from("food_logs").delete().eq("id", id);
  revalidatePath("/nutrition"); revalidatePath("/dashboard");
}

export async function copyPreviousDay(date: string) {
  const { supabase, user } = await requireUser();
  const prev = new Date(date + "T12:00:00Z"); prev.setUTCDate(prev.getUTCDate() - 1);
  const { data } = await supabase.from("food_logs")
    .select("meal, food_id, recipe_id, servings, calories, protein_g, carbs_g, fat_g, fiber_g")
    .eq("logged_on", prev.toISOString().slice(0, 10));
  if (!data?.length) return { error: "Nothing logged yesterday to copy." };
  await supabase.from("food_logs").insert(data.map((r) => ({ ...r, user_id: user.id, logged_on: date })));
  revalidatePath("/nutrition"); revalidatePath("/dashboard");
  return { ok: true };
}

export async function saveMacroSettings(form: FormData) {
  const { supabase, user } = await requireUser();
  const mode = form.get("mode") === "calculated" ? "calculated" : "alpha";
  const num = (k: string) => (form.get(k) ? Number(form.get(k)) : null);
  await supabase.from("profiles").update({
    macro_mode: mode, goal_weight_lb: num("goalWeight"), height_in: num("heightIn"),
    sex: form.get("sex"), activity_level: form.get("activity"), goal_type: form.get("goal"),
    birth_date: form.get("birthDate") || null, updated_at: new Date().toISOString(),
  }).eq("id", user.id);
  await supabase.from("macro_targets").insert({
    user_id: user.id, mode, calories: num("calories"), protein_g: num("protein"), carbs_g: num("carbs"), fat_g: num("fat"),
    bmr: num("bmr"), tdee: num("tdee"),
  });
  revalidatePath("/nutrition"); revalidatePath("/dashboard");
}
