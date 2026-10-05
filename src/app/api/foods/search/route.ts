import { NextResponse } from "next/server";
import type { FoodResult } from "../types";

// USDA FoodData Central nutrient numbers
const N = { kcal: "208", protein: "203", fat: "204", carbs: "205", fiber: "291", sugar: "269", sodium: "307" };

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q")?.trim();
  if (!q || q.length < 2) return NextResponse.json({ foods: [] });
  const key = process.env.USDA_API_KEY ?? "DEMO_KEY";
  const res = await fetch(
    `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${key}&query=${encodeURIComponent(q)}&pageSize=15&dataType=Foundation,SR%20Legacy,Branded`,
    { next: { revalidate: 86400 } },
  );
  if (!res.ok) return NextResponse.json({ error: "Food search is unavailable right now. Try again or add a custom food." }, { status: 502 });
  const json = await res.json();

  const foods: FoodResult[] = (json.foods ?? []).map((f: any) => {
    const get = (num: string) => Number(f.foodNutrients?.find((n: any) => n.nutrientNumber === num)?.value ?? 0);
    // Search values are per 100 g; branded foods also report a label serving size
    const branded = f.dataType === "Branded" && f.servingSize && f.servingSizeUnit?.toLowerCase() === "g";
    const size = branded ? Number(f.servingSize) : 100;
    const k = size / 100;
    return {
      source: "usda", externalId: String(f.fdcId), name: f.description, brand: f.brandOwner ?? f.brandName,
      servingSize: size, servingUnit: "g",
      calories: Math.round(get(N.kcal) * k), proteinG: +(get(N.protein) * k).toFixed(1),
      carbsG: +(get(N.carbs) * k).toFixed(1), fatG: +(get(N.fat) * k).toFixed(1),
      fiberG: +(get(N.fiber) * k).toFixed(1), sugarG: +(get(N.sugar) * k).toFixed(1), sodiumMg: Math.round(get(N.sodium) * k),
    };
  });
  return NextResponse.json({ foods });
}
