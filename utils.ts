import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }
export const today = () => new Date().toISOString().slice(0, 10);
export const money = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });
export function daysAgo(n: number) {
  const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10);
}
