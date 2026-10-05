export type BodyRegion = "upper" | "lower" | "core" | "cardio";

export interface LoggedSet { reps: number; targetReps: number; weightLb: number; rpe?: number | null; }
export interface OverloadSuggestion { nextWeightLb: number; action: "increase" | "repeat" | "deload"; reason: string; }

const roundTo5 = (n: number) => Math.round(n / 5) * 5;

/**
 * Auto progressive overload.
 * - All sets hit target reps at RPE <= 9 → add 5 lb (upper) or 10 lb (lower).
 * - Any set missed → repeat the weight.
 * - Missed reps in each of the last two sessions → deload 10%.
 */
export function suggestNextWeight(
  region: BodyRegion,
  lastSession: LoggedSet[],
  previousSession?: LoggedSet[],
): OverloadSuggestion {
  if (lastSession.length === 0) return { nextWeightLb: 0, action: "repeat", reason: "No sets logged yet." };
  const working = Math.max(...lastSession.map((s) => s.weightLb));
  const missed = (sets: LoggedSet[]) => sets.some((s) => s.reps < s.targetReps);

  if (missed(lastSession) && previousSession && missed(previousSession)) {
    return { nextWeightLb: roundTo5(working * 0.9), action: "deload", reason: "Missed target reps two sessions running. Drop 10% and rebuild." };
  }
  if (missed(lastSession)) {
    return { nextWeightLb: working, action: "repeat", reason: "Missed target reps. Repeat this weight." };
  }
  const tooHard = lastSession.some((s) => s.rpe != null && s.rpe > 9);
  if (tooHard) {
    return { nextWeightLb: working, action: "repeat", reason: "Reps hit but RPE was above 9. Own this weight first." };
  }
  const step = region === "lower" ? 10 : region === "upper" ? 5 : 0;
  if (step === 0) return { nextWeightLb: working, action: "repeat", reason: "Add reps or time instead of load." };
  return { nextWeightLb: working + step, action: "increase", reason: `All reps hit. Add ${step} lb.` };
}

/** Epley estimated 1RM. */
export function estimateOneRepMax(weightLb: number, reps: number): number {
  if (reps <= 1) return weightLb;
  return Math.round(weightLb * (1 + reps / 30));
}
