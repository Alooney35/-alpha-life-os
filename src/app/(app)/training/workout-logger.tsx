"use client";
import { useState, useTransition } from "react";
import { saveWorkout, type SetInput } from "./actions";
import { Button, Input } from "@/components/ui/button";

export interface PlannedExercise { id: string; name: string; region: string; suggestion: { nextWeightLb: number; action: string; reason: string } | null; lastSummary: string | null; }

const TARGET_REPS = (name: string, region: string) => region === "core" ? 12 : /Squat|Bench|Deadlift|Rows|Press/.test(name) ? 5 : 10;

export function WorkoutLogger({ date, splitDay, exercises }: { date: string; splitDay: string; exercises: PlannedExercise[] }) {
  const [rows, setRows] = useState<SetInput[]>(() => exercises.flatMap((e) =>
    [1, 2, 3].map((n) => ({ exerciseId: e.id, exerciseName: e.name, setNumber: n, targetReps: TARGET_REPS(e.name, e.region), reps: 0, weightLb: e.suggestion?.nextWeightLb ?? 0, rpe: null })),
  ));
  const [cardio, setCardio] = useState({ type: "Incline walk", minutes: 0, distance_mi: 0, calories: 0, avg_hr: 0, steps: 0 });
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const isCardio = splitDay === "cardio_recovery";

  const edit = (i: number, k: keyof SetInput, v: string) =>
    setRows((r) => r.map((row, j) => (j === i ? { ...row, [k]: v === "" ? (k === "rpe" ? null : 0) : Number(v) } : row)));
  const addSet = (e: PlannedExercise) => setRows((r) => {
    const last = [...r].reverse().find((x) => x.exerciseId === e.id)!;
    const idx = r.lastIndexOf(last);
    return [...r.slice(0, idx + 1), { ...last, setNumber: last.setNumber + 1, reps: 0, rpe: null }, ...r.slice(idx + 1)];
  });

  function submit() {
    start(async () => {
      const res = await saveWorkout({ date, splitDay, sets: rows, cardio: isCardio && cardio.minutes > 0 ? cardio : null });
      if (res.error) setMsg(res.error);
      else setMsg(res.newPRs?.length ? `Workout saved. New PR: ${res.newPRs.join(", ")}.` : "Workout saved.");
    });
  }

  return (
    <div className="space-y-5">
      {isCardio && (
        <div className="grid grid-cols-2 gap-2">
          <select value={cardio.type} onChange={(e) => setCardio({ ...cardio, type: e.target.value })} aria-label="Cardio type" className="col-span-2 h-11 rounded-xl border border-line bg-transparent px-3">
            {["Walking", "Incline walk", "Cycling", "Stairmaster", "Rowing"].map((t) => <option key={t}>{t}</option>)}
          </select>
          {(["minutes", "distance_mi", "calories", "avg_hr", "steps"] as const).map((k) => (
            <label key={k} className="text-sm text-muted">{({ minutes: "Minutes", distance_mi: "Distance (mi)", calories: "Calories", avg_hr: "Avg heart rate", steps: "Steps" })[k]}
              <Input type="number" inputMode="decimal" value={cardio[k] || ""} onChange={(e) => setCardio({ ...cardio, [k]: Number(e.target.value) })} />
            </label>
          ))}
        </div>
      )}
      {exercises.map((e) => (
        <div key={e.id}>
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="font-semibold">{e.name}</h3>
            {e.suggestion && e.suggestion.nextWeightLb > 0 && <span className={e.suggestion.action === "deload" ? "text-sm text-warn" : "text-sm text-go"}>{e.suggestion.nextWeightLb} lb</span>}
          </div>
          <p className="mb-2 text-xs text-muted">{e.suggestion?.reason ?? "First time: pick a weight you can move for clean reps."}{e.lastSummary ? ` Last: ${e.lastSummary}.` : ""}</p>
          <div className="grid grid-cols-[2rem_1fr_1fr_1fr] gap-2 text-center text-xs text-muted"><span>Set</span><span>Lb</span><span>Reps / {rows.find((r) => r.exerciseId === e.id)?.targetReps}</span><span>RPE</span></div>
          {rows.map((r, i) => r.exerciseId === e.id && (
            <div key={i} className="mt-1 grid grid-cols-[2rem_1fr_1fr_1fr] items-center gap-2">
              <span className="text-center font-display text-lg">{r.setNumber}</span>
              <Input aria-label={`${e.name} set ${r.setNumber} weight`} type="number" inputMode="decimal" value={r.weightLb || ""} onChange={(ev) => edit(i, "weightLb", ev.target.value)} className="text-center" />
              <Input aria-label={`${e.name} set ${r.setNumber} reps`} type="number" inputMode="numeric" value={r.reps || ""} onChange={(ev) => edit(i, "reps", ev.target.value)} className="text-center" />
              <Input aria-label={`${e.name} set ${r.setNumber} RPE`} type="number" step="0.5" min="1" max="10" inputMode="decimal" value={r.rpe ?? ""} onChange={(ev) => edit(i, "rpe", ev.target.value)} className="text-center" />
            </div>
          ))}
          <button onClick={() => addSet(e)} className="mt-2 text-sm text-accent">Add set</button>
        </div>
      ))}
      <Button className="w-full" onClick={submit} disabled={pending}>{pending ? "Saving…" : "Finish workout"}</Button>
      {msg && <p className="text-sm text-go" role="status">{msg}</p>}
    </div>
  );
}
