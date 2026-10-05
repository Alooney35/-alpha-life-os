/** Normalized food, nutrients per serving. */
export interface FoodResult {
  source: "usda" | "openfoodfacts" | "custom";
  externalId: string;
  name: string;
  brand?: string;
  servingSize: number;
  servingUnit: string;
  calories: number; proteinG: number; carbsG: number; fatG: number;
  fiberG: number; sugarG: number; sodiumMg: number;
}
