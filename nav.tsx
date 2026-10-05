"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Gauge, Scale, Utensils, Dumbbell, Wallet, CheckSquare } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/dashboard", label: "Today", icon: Gauge },
  { href: "/weight", label: "Body", icon: Scale },
  { href: "/nutrition", label: "Fuel", icon: Utensils },
  { href: "/training", label: "Train", icon: Dumbbell },
  { href: "/money", label: "Money", icon: Wallet },
  { href: "/habits", label: "Habits", icon: CheckSquare },
];

export function Nav() {
  const path = usePathname();
  return (
    <nav aria-label="Main" className="glass fixed inset-x-0 bottom-0 z-20 border-t pb-[env(safe-area-inset-bottom)] md:inset-y-0 md:left-0 md:right-auto md:w-56 md:border-r md:border-t-0 md:pt-8">
      <div className="hidden px-5 pb-6 font-display text-2xl font-bold md:block">Alpha</div>
      <ul className="grid grid-cols-6 md:block md:space-y-1 md:px-3">
        {ITEMS.map(({ href, label, icon: Icon }) => {
          const active = path.startsWith(href);
          return (
            <li key={href}>
              <Link href={href} aria-current={active ? "page" : undefined}
                className={cn("flex flex-col items-center gap-1 py-2 text-[11px] md:flex-row md:gap-3 md:rounded-xl md:px-3 md:text-sm",
                  active ? "text-accent md:bg-accent/10" : "text-muted hover:text-fg")}>
                <Icon size={20} aria-hidden />{label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
