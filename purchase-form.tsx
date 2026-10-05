"use client";
import { useActionState } from "react";
import { addPurchase } from "./actions";
import { Button, Input } from "@/components/ui/button";

export const CATEGORIES = [["coffee", "Coffee"], ["restaurants", "Restaurants"], ["amazon", "Amazon"], ["entertainment", "Entertainment"], ["impulse", "Impulse"], ["personal", "Personal"], ["hobbies", "Hobbies"]] as const;

export function PurchaseForm() {
  const [state, action, pending] = useActionState(addPurchase, null);
  return (
    <form action={action} className="grid grid-cols-2 gap-2">
      <Input name="amount" type="number" step="0.01" min="0.01" inputMode="decimal" placeholder="$0.00" required aria-label="Amount" />
      <select name="category" aria-label="Category" className="h-11 rounded-xl border border-line bg-transparent px-3">
        {CATEGORIES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
      <Input name="merchant" placeholder="Where (optional)" aria-label="Merchant" className="col-span-2" />
      <Button className="col-span-2" disabled={pending}>{pending ? "Adding…" : "Add purchase"}</Button>
      {state && "error" in state && <p className="col-span-2 text-sm text-warn">{state.error}</p>}
      {state && "alert" in state && state.alert && <p role="alert" className="col-span-2 rounded-xl bg-warn/15 p-3 text-sm text-warn">{state.alert}</p>}
    </form>
  );
}
