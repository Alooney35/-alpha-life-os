export type Sex = "male" | "female";
export type ActivityLevel = "sedentary" | "light" | "moderate" | "active" | "very_active";
export type GoalType =
  | "aggressive_fat_loss" | "fat_loss" | "recomp" | "maintenance" | "lean_bulk" | "muscle_gain";

export interface MacroInput {
  weightLb: number;
  goalWeightLb: number;
  heightIn: number;
  age: number;
  sex: Sex;
  bodyFatPct?: number | null;
  activity: ActivityLevel;
  goal: GoalType;
}

export interface Macros { calories: number; proteinG: number; carbsG: number; fatG: number; }
export interface MacroResult extends Macros { bmr: number; tdee: number; method: "katch-mcardle" | "mifflin-st-jeor"; }

export const ACTIVITY_MULTIPLIER: Record<ActivityLevel, number> = {
  sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, very_active: 1.9,
};

/** Calorie adjustment applied to TDEE for each goal. */
export const GOAL_ADJUSTMENT: Record<GoalType, number> = {
  aggressive_fat_loss: -0.25, fat_loss: -0.18, recomp: -0.08,
  maintenance: 0, lean_bulk: 0.07, muscle_gain: 0.15,
};

/** Protein in grams per lb of goal bodyweight. */
const PROTEIN_PER_LB: Record<GoalType, number> = {
  aggressive_fat_loss: 1.15, fat_loss: 1.05, recomp: 1.0,
  maintenance: 0.9, lean_bulk: 0.9, muscle_gain: 0.9,
};

const LB_TO_KG = 0.45359237;
const IN_TO_CM = 2.54;

export function bmr(input: Pick<MacroInput, "weightLb" | "heightIn" | "age" | "sex" | "bodyFatPct">) {
  const kg = input.weightLb * LB_TO_KG;
  if (input.bodyFatPct != null && input.bodyFatPct > 0) {
    // Katch-McArdle is more accurate when body fat is known
    const leanKg = kg * (1 - input.bodyFatPct / 100);
    return { value: Math.round(370 + 21.6 * leanKg), method: "katch-mcardle" as const };
  }
  const cm = input.heightIn * IN_TO_CM;
  const base = 10 * kg + 6.25 * cm - 5 * input.age;
  return { value: Math.round(input.sex === "male" ? base + 5 : base - 161), method: "mifflin-st-jeor" as const };
}

/** Splits calories into protein/fat/carbs. Fat floor is 0.3 g per lb goal weight. */
export function splitMacros(calories: number, proteinG: number, fatG: number): Macros {
  const carbCals = Math.max(0, calories - proteinG * 4 - fatG * 9);
  return { calories: Math.round(calories), proteinG: Math.round(proteinG), fatG: Math.round(fatG), carbsG: Math.round(carbCals / 4) };
}

export function calculateMacros(input: MacroInput): MacroResult {
  const b = bmr(input);
  const tdee = Math.round(b.value * ACTIVITY_MULTIPLIER[input.activity]);
  // Never prescribe below BMR — the floor protects lean mass and adherence
  const calories = Math.max(b.value, Math.round(tdee * (1 + GOAL_ADJUSTMENT[input.goal])));
  const proteinG = input.goalWeightLb * PROTEIN_PER_LB[input.goal];
  const fatG = Math.max(input.goalWeightLb * 0.3, (calories * 0.25) / 9);
  return { ...splitMacros(calories, proteinG, fatG), bmr: b.value, tdee, method: b.method };
}

/** Alpha Macro Mode: calories = goal × 12, protein = goal × 1, fat = goal × 0.4, carbs = remainder. */
export function alphaMacros(goalWeightLb: number): Macros {
  return splitMacros(goalWeightLb * 12, goalWeightLb, goalWeightLb * 0.4);
}

export function perMeal(m: Macros, mealsPerDay: number): Macros {
  const n = Math.max(1, mealsPerDay);
  return { calories: Math.round(m.calories / n), proteinG: Math.round(m.proteinG / n), carbsG: Math.round(m.carbsG / n), fatG: Math.round(m.fatG / n) };
}

export function weekly(m: Macros): Macros {
  return { calories: m.calories * 7, proteinG: m.proteinG * 7, carbsG: m.carbsG * 7, fatG: m.fatG * 7 };
}
