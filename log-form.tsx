"use client";
import { useActionState } from "react";
import { logWeight } from "./actions";
import { Button, Input, Field } from "@/components/ui/button";

export function LogWeightForm() {
  const [state, action, pending] = useActionState(logWeight, null);
  return (
    <form action={action} className="grid grid-cols-2 gap-3">
      <Field label="Weight (lb)"><Input name="weight" type="number" step="0.1" inputMode="decimal" required /></Field>
      <Field label="Date"><Input name="date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} /></Field>
      <Field label="Body fat % (optional)"><Input name="bodyfat" type="number" step="0.1" inputMode="decimal" /></Field>
      <Field label="Waist in (optional)"><Input name="waist" type="number" step="0.25" inputMode="decimal" /></Field>
      <Button className="col-span-2" disabled={pending}>{pending ? "Saving…" : "Save weigh-in"}</Button>
      {state && "error" in state && <p className="col-span-2 text-sm text-warn">{state.error}</p>}
      {state && "ok" in state && <p className="col-span-2 text-sm text-go">Weigh-in saved.</p>}
    </form>
  );
}
