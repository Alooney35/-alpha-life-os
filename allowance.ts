export const ALERT_THRESHOLDS = [0.5, 0.75, 0.9, 1] as const;

export interface AllowanceState {
  allowance: number;
  carryover: number;
  spent: number;
  available: number;
  remaining: number;
  pctUsed: number;
  daysElapsed: number;
  daysRemaining: number;
  projectedSpend: number;
  alertsCrossed: number[];
  exceeded: boolean;
}

/** Monday-based week start (ISO weeks) as YYYY-MM-DD in UTC. */
export function weekStart(date = new Date()): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dow = (d.getUTCDay() + 6) % 7; // Mon = 0
  d.setUTCDate(d.getUTCDate() - dow);
  return d.toISOString().slice(0, 10);
}

export function allowanceState(allowance: number, carryover: number, spent: number, today = new Date()): AllowanceState {
  const available = allowance + carryover;
  const dow = (today.getUTCDay() + 6) % 7;
  const daysElapsed = dow + 1;
  const pctUsed = available > 0 ? spent / available : spent > 0 ? Infinity : 0;
  return {
    allowance, carryover, spent, available,
    remaining: Math.round((available - spent) * 100) / 100,
    pctUsed,
    daysElapsed,
    daysRemaining: 7 - daysElapsed,
    projectedSpend: Math.round((spent / daysElapsed) * 7 * 100) / 100,
    alertsCrossed: ALERT_THRESHOLDS.filter((t) => pctUsed >= t),
    exceeded: spent > available,
  };
}

/** Thresholds newly crossed by a purchase — use to fire notifications exactly once. */
export function newAlerts(available: number, spentBefore: number, spentAfter: number): number[] {
  if (available <= 0) return [];
  return ALERT_THRESHOLDS.filter((t) => spentBefore / available < t && spentAfter / available >= t);
}

/** Unused money carried into next week. Overspend is carried as a negative. */
export function rollover(available: number, spent: number, enabled: boolean): number {
  if (!enabled) return Math.min(0, available - spent);
  return Math.round((available - spent) * 100) / 100;
}
