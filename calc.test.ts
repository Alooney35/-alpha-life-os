import { describe, expect, it } from "vitest";
import { alphaMacros, calculateMacros, perMeal } from "./macros";
import { suggestNextWeight, estimateOneRepMax } from "./overload";
import { allowanceState, newAlerts, rollover, weekStart } from "./allowance";
import { alphaScore, gradeCheckIn, grade, streak } from "./score";
import { movingAverage, projectGoalDate, weeklyChange } from "./weight";

describe("macros", () => {
  it("Alpha Mode matches the spec for a 190 lb goal", () => {
    expect(alphaMacros(190)).toEqual({ calories: 2280, proteinG: 190, fatG: 76, carbsG: 209 });
  });
  it("macros add back up to calories", () => {
    const m = calculateMacros({ weightLb: 215, goalWeightLb: 190, heightIn: 71, age: 36, sex: "male", activity: "active", goal: "fat_loss" });
    expect(Math.abs(m.proteinG * 4 + m.carbsG * 4 + m.fatG * 9 - m.calories)).toBeLessThan(10);
    expect(m.calories).toBeLessThan(m.tdee);
    expect(m.method).toBe("mifflin-st-jeor");
  });
  it("uses Katch-McArdle when body fat is known", () => {
    const m = calculateMacros({ weightLb: 215, goalWeightLb: 190, heightIn: 71, age: 36, sex: "male", bodyFatPct: 22, activity: "moderate", goal: "recomp" });
    expect(m.method).toBe("katch-mcardle");
  });
  it("splits per meal", () => {
    expect(perMeal(alphaMacros(190), 4).proteinG).toBe(48);
  });
});

describe("progressive overload", () => {
  const hit = [{ reps: 5, targetReps: 5, weightLb: 225, rpe: 8 }];
  const miss = [{ reps: 3, targetReps: 5, weightLb: 225, rpe: 10 }];
  it("adds 5 upper / 10 lower", () => {
    expect(suggestNextWeight("upper", hit).nextWeightLb).toBe(230);
    expect(suggestNextWeight("lower", hit).nextWeightLb).toBe(235);
  });
  it("repeats on a miss and deloads on two misses", () => {
    expect(suggestNextWeight("upper", miss).action).toBe("repeat");
    expect(suggestNextWeight("upper", miss, miss)).toMatchObject({ action: "deload", nextWeightLb: 205 });
  });
  it("Epley 1RM", () => expect(estimateOneRepMax(275, 5)).toBe(321));
});

describe("allowance", () => {
  it("week starts Monday", () => expect(weekStart(new Date("2026-10-01T12:00:00Z"))).toBe("2026-09-28"));
  it("tracks remaining and alerts", () => {
    const s = allowanceState(100, 20, 95, new Date("2026-10-01T12:00:00Z"));
    expect(s.remaining).toBe(25);
    expect(s.alertsCrossed).toEqual([0.5, 0.75]);
    expect(s.daysRemaining).toBe(3);
  });
  it("fires each threshold once", () => expect(newAlerts(100, 40, 92)).toEqual([0.5, 0.75, 0.9]));
  it("rolls over leftovers and overspend", () => {
    expect(rollover(100, 70, true)).toBe(30);
    expect(rollover(100, 130, false)).toBe(-30);
    expect(rollover(100, 70, false)).toBe(0);
  });
});

describe("scores", () => {
  it("grades", () => { expect(grade(96)).toBe("A+"); expect(grade(85)).toBe("B"); expect(grade(40)).toBe("D"); });
  it("perfect week = A+", () => {
    const s = alphaScore({ weeklyChangeLb: -1, targetWeeklyChangeLb: -1, proteinDays: 7, calorieDays: 7, workoutsCompleted: 5, workoutsScheduled: 5, allowanceAvailable: 100, allowanceSpent: 80 });
    expect(s.total).toBe(100);
  });
  it("check-in produces actions", () => {
    const r = gradeCheckIn({ proteinDays: 3, mealsOut: 5, workoutsCompleted: true, withinAllowance: false, mealPrepDone: true });
    expect(r.actions.length).toBe(3);
    expect(r.grade).toBe("D");
  });
  it("streak counts back from today", () => {
    expect(streak(["2026-09-29", "2026-09-30", "2026-10-01"], new Date("2026-10-01T12:00:00Z"))).toBe(3);
    expect(streak(["2026-09-29", "2026-09-30"], new Date("2026-10-01T12:00:00Z"))).toBe(2);
  });
});

describe("weight", () => {
  const pts = Array.from({ length: 21 }, (_, i) => ({
    date: new Date(Date.UTC(2026, 8, 10 + i)).toISOString().slice(0, 10),
    weightLb: 215 - i * (1 / 7),
  }));
  it("weekly change ≈ -1 lb", () => expect(weeklyChange(pts, new Date("2026-09-30T12:00:00Z"))).toBeCloseTo(-1, 1));
  it("projects a goal date", () => expect(projectGoalDate(pts, 190, new Date("2026-09-30T12:00:00Z"))).toMatch(/^2027-/));
  it("moving average smooths", () => expect(movingAverage(pts).length).toBe(21));
});
