import { NextResponse } from "next/server";
import type { FoodResult } from "../types";

export async function GET(req: Request) {
  const code = new URL(req.url).searchParams.get("code")?.replace(/\D/g, "");
  if (!code) return NextResponse.json({ error: "Missing barcode." }, { status: 400 });
  const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${code}.json`, {
    headers: { "User-Agent": "AlphaLifeOS/0.1 (personal app)" }, next: { revalidate: 604800 },
  });
  const json = await res.json().catch(() => null);
  if (!json || json.status !== 1) return NextResponse.json({ error: "No product found for that barcode. Add it as a custom food." }, { status: 404 });
  const p = json.product, n = p.nutriments ?? {};
  const size = Number(p.serving_quantity) || 100;
  const k = size / 100;
  const food: FoodResult = {
    source: "openfoodfacts", externalId: code, name: p.product_name || "Unnamed product", brand: p.brands,
    servingSize: size, servingUnit: "g",
    calories: Math.round((n["energy-kcal_100g"] ?? 0) * k), proteinG: +((n.proteins_100g ?? 0) * k).toFixed(1),
    carbsG: +((n.carbohydrates_100g ?? 0) * k).toFixed(1), fatG: +((n.fat_100g ?? 0) * k).toFixed(1),
    fiberG: +((n.fiber_100g ?? 0) * k).toFixed(1), sugarG: +((n.sugars_100g ?? 0) * k).toFixed(1),
    sodiumMg: Math.round((n.sodium_100g ?? 0) * 1000 * k),
  };
  return NextResponse.json({ food });
}
