"use client";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const OPTIONS = ["dark", "light", "system"] as const;

export function ThemeToggle() {
  const [theme, setTheme] = useState<string>("dark");
  useEffect(() => { try { setTheme(localStorage.getItem("theme") ?? "dark"); } catch {} }, []);
  function choose(t: string) {
    setTheme(t);
    try { localStorage.setItem("theme", t); } catch {}
    const r = document.documentElement; r.classList.remove(...OPTIONS); r.classList.add(t);
  }
  return (
    <div role="radiogroup" aria-label="Theme" className="grid grid-cols-3 rounded-xl border border-line p-1">
      {OPTIONS.map((t) => (
        <button key={t} role="radio" aria-checked={theme === t} onClick={() => choose(t)}
          className={cn("h-9 rounded-lg text-sm capitalize", theme === t ? "bg-accent text-white" : "text-muted")}>{t}</button>
      ))}
    </div>
  );
}
