import { cn } from "@/lib/utils";

export function Panel({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <section className={cn("glass rounded-2xl p-4", className)} {...props} />;
}

/** A scoreboard-style figure: big condensed number with a plain label underneath. */
export function Stat({ value, label, tone }: { value: React.ReactNode; label: string; tone?: "blue" | "green" | "warn" }) {
  return (
    <div>
      <div className={cn("font-display text-4xl leading-none font-semibold tabular-nums",
        tone === "blue" && "text-accent", tone === "green" && "text-go", tone === "warn" && "text-warn")}>{value}</div>
      <div className="mt-1 text-sm text-muted">{label}</div>
    </div>
  );
}

export function Bar({ value, max, tone = "blue" }: { value: number; max: number; tone?: "blue" | "green" | "warn" }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-line" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
      <div className={cn("h-full rounded-full", tone === "blue" ? "bg-accent" : tone === "green" ? "bg-go" : "bg-warn")} style={{ width: `${pct}%` }} />
    </div>
  );
}
