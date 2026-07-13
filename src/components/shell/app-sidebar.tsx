"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, ClipboardList, FileCheck2, LayoutDashboard, Users } from "lucide-react";

import { cn } from "@/lib/utils";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/students", label: "Talabalar", icon: Users },
  { href: "/tasks", label: "Topshiriqlar", icon: ClipboardList },
  { href: "/submissions", label: "Natijalar", icon: FileCheck2 },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <div className="sticky top-6 rounded-xl border bg-background p-4 shadow-sm">
      <div className="mb-4">
        <div className="text-sm text-muted-foreground">Mustaqil ta’lim</div>
        <div className="text-lg font-semibold">O‘qituvchi kabineti</div>
      </div>

      <div className="space-y-1">
        {nav.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-foreground hover:bg-muted"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>

      <div className="mt-6 rounded-lg bg-muted/50 p-3 text-xs leading-5 text-muted-foreground">
        Etalon va ixtiyoriy rejim, ikki urinish hamda tajriba-sinov monitoringi.
      </div>
    </div>
  );
}
