import { requireUser } from "@/lib/supabase/server";
import { allowanceState } from "@/lib/calc/allowance";
import { Panel, Stat, Bar } from "@/components/ui/panel";
import { Button, Input } from "@/components/ui/button";
import { money, cn } from "@/lib/utils";
import { PurchaseForm, CATEGORIES } from "./purchase-form";
import { ensureWeek, deletePurchase, setAllowance, addAccount, addGoal, contribute } from "./actions";

export default async function MoneyPage() {
  const { supabase } = await requireUser();
  const week = await ensureWeek();
  const [{ data: tx }, { data: weeks }, { data: accounts }, { data: goals }, { data: profile }] = await Promise.all([
    supabase.from("allowance_transactions").select("*").gte("spent_on", week.week_start).order("spent_on", { ascending: false }),
    supabase.from("allowance_weeks").select("week_start, allowance, carryover_in, spent, closed").eq("closed", true),
    supabase.from("bank_accounts").select("*").order("kind"),
    supabase.from("financial_goals").select("*").order("created_at"),
    supabase.from("profiles").select("weekly_allowance, allowance_rollover").single(),
  ]);
  const spent = (tx ?? []).reduce((a, t) => a + Number(t.amount), 0);
  const s = allowanceState(Number(week.allowance), Number(week.carryover_in), spent);
  const lifetimeSaved = (weeks ?? []).reduce((a, w) => a + Math.max(0, Number(w.allowance) - Number(w.spent)), 0);
  const byCat = CATEGORIES.map(([k, l]) => ({ l, v: (tx ?? []).filter((t) => t.category === k).reduce((a, t) => a + Number(t.amount), 0) })).filter((c) => c.v > 0);

  const sum = (kinds: string[]) => (accounts ?? []).filter((a) => kinds.includes(a.kind)).reduce((x, a) => x + Number(a.balance), 0);
  const netWorth = sum(["checking", "savings", "investment"]) - Math.abs(sum(["credit", "loan"]));

  return (
    <div className="space-y-4">
      <h1 className="font-display text-5xl font-bold">Money</h1>

      <Panel className="space-y-4">
        <div className="flex items-end justify-between">
          <Stat value={money(s.remaining)} label={`Left of ${money(s.available)} this week`} tone={s.exceeded ? "warn" : "green"} />
          <span className="text-sm text-muted">{s.daysRemaining} days left</span>
        </div>
        <Bar value={s.spent} max={s.available} tone={s.pctUsed >= 0.9 ? "warn" : s.pctUsed >= 0.75 ? "blue" : "green"} />
        <div className="grid grid-cols-3 gap-3">
          <Stat value={money(s.spent)} label="Spent" />
          <Stat value={money(s.projectedSpend)} label="On pace for" tone={s.projectedSpend > s.available ? "warn" : undefined} />
          <Stat value={money(s.carryover)} label="Carried in" />
        </div>
        {byCat.length > 0 && <p className="text-sm text-muted">{byCat.map((c) => `${c.l} ${money(c.v)}`).join(" · ")}</p>}
      </Panel>

      <Panel><h2 className="mb-3 font-display text-2xl font-semibold">Add purchase</h2><PurchaseForm /></Panel>

      {(tx?.length ?? 0) > 0 && (
        <Panel>
          <h2 className="mb-2 font-display text-2xl font-semibold">This week</h2>
          <ul className="divide-y divide-line">{tx!.map((t) => (
            <li key={t.id} className="flex items-center justify-between py-2 text-sm">
              <span><span className="capitalize">{t.category}</span>{t.merchant ? <span className="text-muted"> · {t.merchant}</span> : null}</span>
              <span className="flex items-center gap-2 tabular-nums">{money(Number(t.amount))}
                <form action={async () => { "use server"; await deletePurchase(t.id); }}><button aria-label="Remove purchase" className="px-1 text-warn">×</button></form>
              </span>
            </li>))}
          </ul>
        </Panel>
      )}

      <Panel className="space-y-3">
        <h2 className="font-display text-2xl font-semibold">Weekly allowance</h2>
        <form action={setAllowance} className="space-y-3">
          <div className="grid grid-cols-5 gap-2">
            {[50, 75, 100, 150].map((v) => (
              <button key={v} name="amount" value={v} className={cn("h-11 rounded-xl border text-sm font-semibold", Number(profile?.weekly_allowance) === v ? "border-accent bg-accent text-white" : "border-line")}>${v}</button>
            ))}
            <Input name="amount" type="number" placeholder="Custom" aria-label="Custom allowance" />
          </div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="rollover" defaultChecked={profile?.allowance_rollover ?? true} /> Roll unused money into next week</label>
          <Button variant="ghost" className="w-full">Save allowance</Button>
        </form>
        <p className="text-sm text-muted">Lifetime saved from allowance: {money(lifetimeSaved)}</p>
      </Panel>

      <Panel className="space-y-3">
        <div className="flex items-end justify-between"><h2 className="font-display text-2xl font-semibold">Net worth</h2><span className="font-display text-3xl font-semibold tabular-nums">{money(netWorth)}</span></div>
        <ul className="divide-y divide-line">{(accounts ?? []).map((a) => (
          <li key={a.id} className="flex justify-between py-2 text-sm"><span>{a.name} <span className="text-muted capitalize">· {a.kind}</span></span><span className="tabular-nums">{money(Number(a.balance))}</span></li>
        ))}</ul>
        <form action={addAccount} className="grid grid-cols-3 gap-2">
          <Input name="name" placeholder="Account" required aria-label="Account name" />
          <select name="kind" aria-label="Account type" className="h-11 rounded-xl border border-line bg-transparent px-2 text-sm">
            {["checking", "savings", "investment", "credit", "loan"].map((k) => <option key={k} value={k} className="capitalize">{k}</option>)}
          </select>
          <Input name="balance" type="number" step="0.01" placeholder="Balance" aria-label="Balance" />
          <Button variant="ghost" className="col-span-3">Add account</Button>
        </form>
        <p className="text-xs text-muted">Balances are entered by hand for now. Bank linking comes with the Plaid phase.</p>
      </Panel>

      <Panel className="space-y-3">
        <h2 className="font-display text-2xl font-semibold">Savings goals</h2>
        {(goals ?? []).map((g) => {
          const pct = Math.round((Number(g.current_amount) / Number(g.target_amount)) * 100);
          return (
            <div key={g.id} className="space-y-1">
              <div className="flex justify-between text-sm"><span>{g.name}</span><span className="tabular-nums text-muted">{money(Number(g.current_amount))} / {money(Number(g.target_amount))} · {pct}%</span></div>
              <Bar value={Number(g.current_amount)} max={Number(g.target_amount)} tone="green" />
              <form action={contribute.bind(null, g.id)} className="flex gap-2 pt-1"><Input name="amount" type="number" step="0.01" placeholder="Add $" aria-label={`Contribute to ${g.name}`} className="h-9" /><Button variant="ghost" className="h-9">Add</Button></form>
            </div>
          );
        })}
        <form action={addGoal} className="grid grid-cols-2 gap-2">
          <Input name="name" placeholder="Emergency fund" required aria-label="Goal name" className="col-span-2" />
          <Input name="target" type="number" placeholder="Target $" required aria-label="Target amount" />
          <Input name="monthly" type="number" placeholder="Monthly $" aria-label="Monthly contribution" />
          <Button variant="ghost" className="col-span-2">Add goal</Button>
        </form>
      </Panel>
    </div>
  );
}
