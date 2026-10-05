export type Grade = "A+" | "A" | "B" | "C" | "D";

export function grade(score: number): Grade {
  if (score >= 95) return "A+";
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  return "D";
}

const clamp = (n: number) => Math.max(0, Math.min(100, n));

export interface AlphaScoreInput {
  /** Actual weekly change in lb (negative = losing). */
  weeklyChangeLb: number | null;
  /** Target weekly change in lb, e.g. -1. */
  targetWeeklyChangeLb: number;
  /** Days this week protein was hit (0–7). */
  proteinDays: number;
  /** Days this week calories landed within ±10% of target (0–7). */
  calorieDays: number;
  workoutsCompleted: number;
  workoutsScheduled: number;
  allowanceAvailable: number;
  allowanceSpent: number;
}

export interface AlphaScore { weight: number; nutrition: number; training: number; finances: number; total: number; grade: Grade; }

/** Each pillar is worth 25% of the 0–100 Alpha Score. */
export function alphaScore(i: AlphaScoreInput): AlphaScore {
  let weight = 50;
  if (i.weeklyChangeLb != null && i.targetWeeklyChangeLb !== 0) {
    const ratio = i.weeklyChangeLb / i.targetWeeklyChangeLb; // 1 = exactly on pace
    weight = ratio <= 0 ? 20 : ratio > 1.5 ? 80 /* too fast */ : clamp(100 - Math.abs(1 - ratio) * 100);
  } else if (i.weeklyChangeLb != null) {
    weight = clamp(100 - Math.abs(i.weeklyChangeLb) * 50); // maintenance
  }
  const nutrition = clamp(((i.proteinDays / 7) * 0.6 + (i.calorieDays / 7) * 0.4) * 100);
  const training = i.workoutsScheduled > 0 ? clamp((i.workoutsCompleted / i.workoutsScheduled) * 100) : 100;
  const finances = i.allowanceAvailable > 0
    ? i.allowanceSpent <= i.allowanceAvailable ? 100 : clamp(100 - ((i.allowanceSpent - i.allowanceAvailable) / i.allowanceAvailable) * 200)
    : 100;
  const total = Math.round((weight + nutrition + training + finances) / 4);
  return { weight: Math.round(weight), nutrition: Math.round(nutrition), training: Math.round(training), finances: Math.round(finances), total, grade: grade(total) };
}

export interface CheckInAnswers { proteinDays: number; mealsOut: number; workoutsCompleted: boolean; withinAllowance: boolean; mealPrepDone: boolean; }

/** Sunday executive check-in → grade plus a concrete action plan. */
export function gradeCheckIn(a: CheckInAnswers): { score: number; grade: Grade; actions: string[] } {
  const actions: string[] = [];
  let score = 0;
  score += a.proteinDays >= 5 ? 25 : (a.proteinDays / 5) * 25;
  if (a.proteinDays < 5) actions.push(`Protein hit ${a.proteinDays}/7 days. Pre-log tomorrow's protein before bed.`);
  score += a.mealsOut <= 2 ? 15 : Math.max(0, 15 - (a.mealsOut - 2) * 5);
  if (a.mealsOut > 2) actions.push(`Ate out ${a.mealsOut} times. Prep two extra lunches this week.`);
  if (a.workoutsCompleted) score += 25; else actions.push("Workouts missed. Book sessions on your calendar like meetings.");
  if (a.withinAllowance) score += 20; else actions.push("Allowance exceeded. Next week's starting balance absorbs the overspend.");
  if (a.mealPrepDone) score += 15; else actions.push("Meal prep skipped. Block 90 minutes Sunday afternoon.");
  if (actions.length === 0) actions.push("Clean week. Keep the same plan and raise one target by a small step.");
  const rounded = Math.round(score);
  return { score: rounded, grade: grade(rounded), actions };
}

/** Consecutive days ending today (or yesterday) with done = true. */
export function streak(doneDates: string[], today = new Date()): number {
  const set = new Set(doneDates);
  const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  if (!set.has(d.toISOString().slice(0, 10))) d.setUTCDate(d.getUTCDate() - 1);
  let n = 0;
  while (set.has(d.toISOString().slice(0, 10))) { n++; d.setUTCDate(d.getUTCDate() - 1); }
  return n;
}
