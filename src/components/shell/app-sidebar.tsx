"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

const nav = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/students", label: "Talabalar" },
  { href: "/tasks", label: "Topshiriqlar" },
  { href: "/submissions", label: "Natijalar" },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <div className="rounded-xl border bg-background p-4 shadow-sm">
      <div className="mb-4">
        <div className="text-sm text-muted-foreground">Mustaqil ta’lim</div>
        <div className="text-lg font-semibold">O‘qituvchi kabineti</div>
      </div>

      <div className="space-y-1">
        {nav.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center justify-between rounded-lg px-3 py-2 text-sm transition",
                active
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted text-foreground"
              )}
            >
              <span>{item.label}</span>
              {item.href === "/submissions" && <Badge variant="secondary">2</Badge>}
            </Link>
          );
        })}
      </div>

      <div className="mt-6 rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
        Etalon/Ixtiyoriy rejim, 2 ta urinish limit.
      </div>
    </div>
  );
}
