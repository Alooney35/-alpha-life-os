export interface WeightPoint { date: string; weightLb: number; }

const DAY = 86_400_000;
const toTime = (d: string) => new Date(d + "T00:00:00Z").getTime();

/** Trailing 7-day average for each entry; smooths daily water swings. */
export function movingAverage(points: WeightPoint[], days = 7): (WeightPoint & { avg: number })[] {
  const sorted = [...points].sort((a, b) => toTime(a.date) - toTime(b.date));
  return sorted.map((p) => {
    const t = toTime(p.date);
    const window = sorted.filter((q) => toTime(q.date) <= t && toTime(q.date) > t - days * DAY);
    const avg = window.reduce((s, q) => s + q.weightLb, 0) / window.length;
    return { ...p, avg: Math.round(avg * 10) / 10 };
  });
}

/** Least-squares slope in lb per day. */
export function trendPerDay(points: WeightPoint[]): number | null {
  if (points.length < 2) return null;
  const xs = points.map((p) => toTime(p.date) / DAY);
  const ys = points.map((p) => p.weightLb);
  const mx = xs.reduce((a, b) => a + b, 0) / xs.length;
  const my = ys.reduce((a, b) => a + b, 0) / ys.length;
  let num = 0, den = 0;
  xs.forEach((x, i) => { num += (x - mx) * (ys[i] - my); den += (x - mx) ** 2; });
  return den === 0 ? null : num / den;
}

/** Weekly change from the last 28 days of trend. Negative = losing. */
export function weeklyChange(points: WeightPoint[], asOf = new Date()): number | null {
  const cutoff = asOf.getTime() - 28 * DAY;
  const recent = points.filter((p) => toTime(p.date) >= cutoff);
  const slope = trendPerDay(recent);
  return slope == null ? null : Math.round(slope * 7 * 100) / 100;
}

/** Date the trend reaches the goal, or null if moving the wrong way. */
export function projectGoalDate(points: WeightPoint[], goalLb: number, asOf = new Date()): string | null {
  const recent = points.filter((p) => toTime(p.date) >= asOf.getTime() - 28 * DAY);
  const slope = trendPerDay(recent);
  if (slope == null || recent.length === 0) return null;
  const latest = movingAverage(recent).at(-1)!.avg;
  const gap = goalLb - latest;
  if (gap === 0) return asOf.toISOString().slice(0, 10);
  if (Math.sign(gap) !== Math.sign(slope) || Math.abs(slope) < 0.005) return null;
  const days = Math.ceil(gap / slope);
  return new Date(asOf.getTime() + days * DAY).toISOString().slice(0, 10);
}
