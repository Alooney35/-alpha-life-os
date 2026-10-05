"use client";
import { useRef, useState, useTransition } from "react";
import { ScanBarcode, Search } from "lucide-react";
import type { FoodResult } from "@/app/api/foods/types";
import { logFood } from "./actions";
import { Button, Input } from "@/components/ui/button";

type Meal = "breakfast" | "lunch" | "dinner" | "snack";

export function FoodLogger({ date }: { date: string }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<FoodResult[]>([]);
  const [picked, setPicked] = useState<FoodResult | null>(null);
  const [servings, setServings] = useState(1);
  const [meal, setMeal] = useState<Meal>("lunch");
  const [msg, setMsg] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [pending, start] = useTransition();
  const video = useRef<HTMLVideoElement>(null);

  async function search(e: React.FormEvent) {
    e.preventDefault(); setMsg(null);
    const r = await fetch(`/api/foods/search?q=${encodeURIComponent(q)}`).then((x) => x.json());
    if (r.error) setMsg(r.error); else setResults(r.foods);
  }

  async function lookupBarcode(code: string) {
    const r = await fetch(`/api/foods/barcode?code=${code}`).then((x) => x.json());
    if (r.error) setMsg(r.error); else { setPicked(r.food); setResults([]); }
  }

  async function scan() {
    setMsg(null);
    const Detector = (window as any).BarcodeDetector;
    if (!Detector) {
      const code = prompt("Barcode scanning isn't supported in this browser. Type the barcode number:");
      if (code) lookupBarcode(code);
      return;
    }
    setScanning(true);
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
    video.current!.srcObject = stream; await video.current!.play();
    const detector = new Detector({ formats: ["ean_13", "upc_a", "upc_e", "ean_8"] });
    const tick = async () => {
      const codes = await detector.detect(video.current!).catch(() => []);
      if (codes.length) { stream.getTracks().forEach((t) => t.stop()); setScanning(false); lookupBarcode(codes[0].rawValue); }
      else if (stream.active) requestAnimationFrame(tick);
    };
    tick();
  }

  function save() {
    if (!picked) return;
    start(async () => {
      const r = await logFood(picked, meal, servings, date);
      if (r?.error) setMsg(r.error); else { setPicked(null); setQ(""); setResults([]); setServings(1); setMsg("Logged."); }
    });
  }

  const x = (n: number) => Math.round(n * servings * 10) / 10;

  return (
    <div className="space-y-3">
      <form onSubmit={search} className="flex gap-2">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search foods, e.g. chicken breast" aria-label="Search foods" />
        <Button aria-label="Search"><Search size={18} /></Button>
        <Button type="button" variant="ghost" onClick={scan} aria-label="Scan barcode"><ScanBarcode size={18} /></Button>
      </form>
      {scanning && <video ref={video} className="aspect-video w-full rounded-xl bg-black object-cover" muted playsInline />}
      {!scanning && <video ref={video} hidden muted playsInline />}
      {msg && <p className="text-sm text-muted">{msg}</p>}

      {picked ? (
        <div className="space-y-3 rounded-xl border border-line p-3">
          <div><div className="font-semibold">{picked.name}</div><div className="text-sm text-muted">{picked.brand ?? ""} {picked.servingSize}{picked.servingUnit} per serving</div></div>
          <div className="grid grid-cols-4 text-center tabular-nums">
            {[["kcal", x(picked.calories)], ["P", x(picked.proteinG)], ["C", x(picked.carbsG)], ["F", x(picked.fatG)]].map(([l, v]) => (
              <div key={l as string}><div className="font-display text-2xl font-semibold">{v}</div><div className="text-xs text-muted">{l}</div></div>
            ))}
          </div>
          <p className="text-xs text-muted">Fiber {x(picked.fiberG)}g · Sugar {x(picked.sugarG)}g · Sodium {x(picked.sodiumMg)}mg</p>
          <div className="grid grid-cols-2 gap-2">
            <Input type="number" step="0.25" min="0.25" value={servings} onChange={(e) => setServings(Number(e.target.value))} aria-label="Servings" />
            <select value={meal} onChange={(e) => setMeal(e.target.value as Meal)} aria-label="Meal" className="h-11 rounded-xl border border-line bg-transparent px-3">
              <option value="breakfast">Breakfast</option><option value="lunch">Lunch</option><option value="dinner">Dinner</option><option value="snack">Snack</option>
            </select>
          </div>
          <div className="flex gap-2"><Button className="flex-1" onClick={save} disabled={pending}>{pending ? "Logging…" : "Log food"}</Button><Button variant="ghost" onClick={() => setPicked(null)}>Cancel</Button></div>
        </div>
      ) : (
        <ul className="divide-y divide-line">
          {results.map((f) => (
            <li key={f.externalId}>
              <button onClick={() => { setPicked(f); setServings(1); }} className="flex w-full justify-between gap-3 py-2 text-left">
                <span><span className="block">{f.name}</span><span className="text-xs text-muted">{f.brand ?? ""} {f.servingSize}{f.servingUnit}</span></span>
                <span className="shrink-0 text-sm tabular-nums text-muted">{f.calories} kcal · {f.proteinG}g P</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
