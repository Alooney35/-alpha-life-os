import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/supabase/server";
import { getProfile } from "@/lib/data/summary";
import { signOut } from "@/app/auth/actions";
import { Panel } from "@/components/ui/panel";
import { Button, Input, Field } from "@/components/ui/button";
import { ThemeToggle } from "./theme-toggle";

export default async function SettingsPage() {
  const { supabase, user } = await requireUser();
  const p = await getProfile(supabase, user.id);

  async function save(form: FormData) {
    "use server";
    const { supabase, user } = await requireUser();
    const n = (k: string) => (form.get(k) ? Number(form.get(k)) : null);
    await supabase.from("profiles").update({
      display_name: form.get("name"), starting_weight_lb: n("start"), goal_weight_lb: n("goal"), height_in: n("height"),
      birth_date: form.get("birth") || null, updated_at: new Date().toISOString(),
    }).eq("id", user.id);
    revalidatePath("/", "layout");
  }

  return (
    <div className="space-y-4">
      <h1 className="font-display text-5xl font-bold">Settings</h1>
      <Panel>
        <form action={save} className="grid grid-cols-2 gap-3">
          <Field label="Name"><Input name="name" defaultValue={p?.display_name ?? ""} /></Field>
          <Field label="Birth date"><Input name="birth" type="date" defaultValue={p?.birth_date ?? ""} /></Field>
          <Field label="Starting weight (lb)"><Input name="start" type="number" step="0.1" defaultValue={p?.starting_weight_lb ?? ""} /></Field>
          <Field label="Goal weight (lb)"><Input name="goal" type="number" step="0.1" defaultValue={p?.goal_weight_lb ?? 190} /></Field>
          <Field label="Height (in)"><Input name="height" type="number" step="0.5" defaultValue={p?.height_in ?? ""} /></Field>
          <Button className="col-span-2">Save profile</Button>
        </form>
      </Panel>
      <Panel className="space-y-2"><h2 className="font-display text-2xl font-semibold">Appearance</h2><ThemeToggle /></Panel>
      <form action={signOut}><Button variant="ghost" className="w-full">Sign out</Button></form>
    </div>
  );
}
