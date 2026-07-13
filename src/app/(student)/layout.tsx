"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Bot, ClipboardList, Home } from "lucide-react";

import { getStudentMe } from "@/api/auth";
import { StudentGuard } from "@/components/guards/StudentGuard";
import { LogoutButton } from "@/components/LogoutButton";
import { BackendStatusBadge } from "@/components/system/backend-status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getStudentToken } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { Student } from "@/types/api";

const studentNav = [
  { href: "/student", label: "Bosh sahifa", icon: Home },
  { href: "/student/tasks", label: "Topshiriqlar", icon: ClipboardList },
  { href: "/student/mentor", label: "AI Mentor", icon: Bot },
];

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [me, setMe] = useState<Student | null>(null);

  useEffect(() => {
    async function loadMe() {
      const token = getStudentToken();
      if (!token) return;
      const data = await getStudentMe(token);
      setMe(data);
    }

    loadMe().catch(console.error);
  }, []);

  return (
    <StudentGuard>
      <div className="min-h-screen bg-muted/30">
        <header className="border-b bg-background">
          <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span>Mustaqil ta’lim • Talaba paneli</span>
                <BackendStatusBadge />
              </div>

              {me ? (
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <div className="truncate text-lg font-semibold">{me.full_name}</div>
                  {me.university && <Badge variant="outline">{me.university}</Badge>}
                  {me.stage && <Badge variant="secondary">{me.stage}</Badge>}
                </div>
              ) : (
                <div className="mt-1 truncate text-lg font-semibold">Talaba</div>
              )}

              <div className="mt-1 text-xs text-muted-foreground">
                Login: <span className="font-mono">{me?.login || "..."}</span>
                {me?.direction ? (
                  <>
                    {" • "}
                    Yo‘nalish: <span className="font-medium text-foreground">{me.direction}</span>
                  </>
                ) : null}
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {studentNav.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href || (item.href !== "/student" && pathname.startsWith(`${item.href}/`));
                return (
                  <Button key={item.href} asChild variant={active ? "default" : "outline"} size="sm">
                    <Link href={item.href}>
                      <Icon className="mr-2 h-4 w-4" />
                      {item.label}
                    </Link>
                  </Button>
                );
              })}
              <LogoutButton redirectTo="/login" role="student" />
            </div>
          </div>
        </header>

        <main className={cn("mx-auto max-w-7xl px-4 py-6", pathname === "/student/mentor" && "max-w-[1500px]")}>{children}</main>
      </div>
    </StudentGuard>
  );
}
