"use client";
import { useActionState } from "react";
import { submitCheckIn } from "./actions";
import { Panel } from "@/components/ui/panel";
import { Button, Input, Field } from "@/components/ui/button";

function YesNo({ name, label }: { name: string; label: string }) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm">{label}</legend>
      <div className="grid grid-cols-2 gap-2">
        {["yes", "no"].map((v) => (
          <label key={v} className="flex h-11 cursor-pointer items-center justify-center rounded-xl border border-line capitalize has-[:checked]:border-accent has-[:checked]:bg-accent has-[:checked]:text-white">
            <input type="radio" name={name} value={v} required className="sr-only" />{v}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export default function CheckInPage() {
  const [state, action, pending] = useActionState(submitCheckIn, null);
  if (state && "grade" in state) {
    return (
      <div className="space-y-4">
        <p className="pt-4 text-muted">Week graded</p>
        <div className="font-display text-[8rem] font-bold leading-[0.8] text-go">{state.grade}</div>
        <Panel>
          <h2 className="mb-2 font-display text-2xl font-semibold">Next week</h2>
          <ul className="list-disc space-y-2 pl-5">{state.actions.map((a) => <li key={a}>{a}</li>)}</ul>
        </Panel>
      </div>
    );
  }
  return (
    <div className="space-y-4">
      <h1 className="font-display text-5xl font-bold">Sunday check-in</h1>
      <Panel>
        <form action={action} className="space-y-5">
          <Field label="How many days did you hit your protein goal?"><Input name="proteinDays" type="number" min={0} max={7} required inputMode="numeric" /></Field>
          <Field label="How many times did you eat out?"><Input name="mealsOut" type="number" min={0} required inputMode="numeric" /></Field>
          <YesNo name="workouts" label="Did you complete your workouts?" />
          <YesNo name="allowance" label="Did you stay within your allowance?" />
          <YesNo name="mealPrep" label="Did you complete meal prep?" />
          <Button className="w-full" disabled={pending}>{pending ? "Grading…" : "Grade my week"}</Button>
          {state && "error" in state && <p className="text-sm text-warn">{state.error}</p>}
        </form>
      </Panel>
    </div>
  );
}
