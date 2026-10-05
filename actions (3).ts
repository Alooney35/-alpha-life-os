"use server";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/supabase/server";
import { newAlerts, rollover, weekStart } from "@/lib/calc/allowance";

const refresh = () => { revalidatePath("/money"); revalidatePath("/dashboard"); };

/** Makes sure this week's allowance row exists, carrying last week's balance forward. */
export async function ensureWeek() {
  const { supabase, user } = await requireUser();
  const ws = weekStart();
  const { data: existing } = await supabase.from("allowance_weeks").select("*").eq("week_start", ws).maybeSingle();
  if (existing) return existing;

  const { data: profile } = await supabase.from("profiles").select("weekly_allowance, allowance_rollover").eq("id", user.id).single();
  const { data: prev } = await supabase.from("allowance_weeks").select("*").lt("week_start", ws).order("week_start", { ascending: false }).limit(1).maybeSingle();
  let carry = 0;
  if (prev) {
    const { data: tx } = await supabase.from("allowance_transactions").select("amount").gte("spent_on", prev.week_start).lt("spent_on", ws);
    const spent = (tx ?? []).reduce((a, t) => a + Number(t.amount), 0);
    carry = rollover(Number(prev.allowance) + Number(prev.carryover_in), spent, profile?.allowance_rollover ?? true);
    await supabase.from("allowance_weeks").update({ spent, closed: true }).eq("id", prev.id);
  }
  const { data } = await supabase.from("allowance_weeks")
    .insert({ user_id: user.id, week_start: ws, allowance: profile?.weekly_allowance ?? 100, carryover_in: carry }).select("*").single();
  return data;
}

export async function addPurchase(_: unknown, form: FormData) {
  const { supabase, user } = await requireUser();
  const amount = Number(form.get("amount"));
  if (!(amount > 0)) return { error: "Enter an amount above $0." };
  const week = await ensureWeek();
  const available = Number(week.allowance) + Number(week.carryover_in);
  const { data: tx } = await supabase.from("allowance_transactions").select("amount").gte("spent_on", week.week_start);
  const before = (tx ?? []).reduce((a, t) => a + Number(t.amount), 0);

  const { error } = await supabase.from("allowance_transactions").insert({
    user_id: user.id, amount, category: form.get("category"), merchant: form.get("merchant") || null,
    spent_on: form.get("date") || new Date().toISOString().slice(0, 10),
  });
  if (error) return { error: error.message };
  refresh();
  const alerts = newAlerts(available, before, before + amount);
  const top = alerts.at(-1);
  return { ok: true, alert: top == null ? null : top >= 1 ? (before + amount > available ? "You've gone over this week's allowance." : "You've used your whole allowance.") : `You've used ${top * 100}% of this week's allowance.` };
}

export async function deletePurchase(id: string) {
  const { supabase } = await requireUser();
  await supabase.from("allowance_transactions").delete().eq("id", id);
  refresh();
}

export async function setAllowance(form: FormData) {
  const { supabase, user } = await requireUser();
  const amount = Number(form.get("amount"));
  if (!(amount > 0)) return;
  await supabase.from("profiles").update({ weekly_allowance: amount, allowance_rollover: form.get("rollover") === "on" }).eq("id", user.id);
  await supabase.from("allowance_weeks").update({ allowance: amount }).eq("week_start", weekStart());
  refresh();
}

export async function addAccount(form: FormData) {
  const { supabase, user } = await requireUser();
  await supabase.from("bank_accounts").insert({ user_id: user.id, name: form.get("name"), kind: form.get("kind"), balance: Number(form.get("balance") || 0) });
  await snapshotNetWorth(); refresh();
}

export async function updateBalance(id: string, form: FormData) {
  const { supabase } = await requireUser();
  await supabase.from("bank_accounts").update({ balance: Number(form.get("balance")), updated_at: new Date().toISOString() }).eq("id", id);
  await snapshotNetWorth(); refresh();
}

async function snapshotNetWorth() {
  const { supabase, user } = await requireUser();
  const { data } = await supabase.from("bank_accounts").select("kind, balance");
  const assets = (data ?? []).filter((a) => ["checking", "savings", "investment"].includes(a.kind)).reduce((s, a) => s + Number(a.balance), 0);
  const liabilities = (data ?? []).filter((a) => ["credit", "loan"].includes(a.kind)).reduce((s, a) => s + Math.abs(Number(a.balance)), 0);
  await supabase.from("net_worth_snapshots").upsert({ user_id: user.id, snapshot_on: new Date().toISOString().slice(0, 10), assets, liabilities }, { onConflict: "user_id,snapshot_on" });
}

export async function addGoal(form: FormData) {
  const { supabase, user } = await requireUser();
  await supabase.from("financial_goals").insert({
    user_id: user.id, name: form.get("name"), target_amount: Number(form.get("target")),
    monthly_contribution: form.get("monthly") ? Number(form.get("monthly")) : null, target_date: form.get("date") || null,
  });
  refresh();
}

export async function contribute(id: string, form: FormData) {
  const { supabase } = await requireUser();
  const { data } = await supabase.from("financial_goals").select("current_amount").eq("id", id).single();
  await supabase.from("financial_goals").update({ current_amount: Number(data?.current_amount ?? 0) + Number(form.get("amount") || 0) }).eq("id", id);
  refresh();
}
