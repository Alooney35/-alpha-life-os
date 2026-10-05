export type SplitDay = "push" | "pull" | "legs" | "upper_abs" | "cardio_recovery" | "rest";

/** Default Alpha split, Monday-first (index 0 = Monday). */
export const ALPHA_SPLIT: SplitDay[] = ["push", "pull", "legs", "rest", "upper_abs", "cardio_recovery", "rest"];

export const SPLIT_LABEL: Record<SplitDay, string> = {
  push: "Push", pull: "Pull", legs: "Legs", upper_abs: "Upper + Abs", cardio_recovery: "Cardio + Recovery", rest: "Rest",
};

export function splitFor(date: string): SplitDay {
  const dow = (new Date(date + "T12:00:00Z").getUTCDay() + 6) % 7;
  return ALPHA_SPLIT[dow];
}

/** Training days scheduled between two dates inclusive. */
export function scheduledDays(from: string, to: string): string[] {
  const out: string[] = [];
  const d = new Date(from + "T12:00:00Z"), end = new Date(to + "T12:00:00Z");
  while (d <= end) { const s = d.toISOString().slice(0, 10); if (splitFor(s) !== "rest") out.push(s); d.setUTCDate(d.getUTCDate() + 1); }
  return out;
}

export type DayStatus = "completed" | "missed" | "upcoming" | "rest";

export function calendar(from: string, to: string, completed: Set<string>, todayStr: string): { date: string; status: DayStatus; split: SplitDay }[] {
  const out: { date: string; status: DayStatus; split: SplitDay }[] = [];
  const d = new Date(from + "T12:00:00Z"), end = new Date(to + "T12:00:00Z");
  while (d <= end) {
    const s = d.toISOString().slice(0, 10), split = splitFor(s);
    const status: DayStatus = completed.has(s) ? "completed" : split === "rest" ? "rest" : s < todayStr ? "missed" : "upcoming";
    out.push({ date: s, status, split });
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return out;
}
