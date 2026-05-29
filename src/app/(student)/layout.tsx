"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { getStudentMe } from "@/api/auth";
import { StudentGuard } from "@/components/guards/StudentGuard";
import { LogoutButton } from "@/components/LogoutButton";
import { BackendStatusBadge } from "@/components/system/backend-status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getStudentToken } from "@/lib/api";
import type { Student } from "@/types/api";

export default function StudentLayout({ children }: { children: React.ReactNode }) {
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
          <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
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
              <Button asChild variant="outline">
                <Link href="/student/tasks">Topshiriqlar</Link>
              </Button>
              <LogoutButton redirectTo="/login" role="student" />
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
      </div>
    </StudentGuard>
  );
}
