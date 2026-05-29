"use client";

import { useEffect, useState } from "react";

import { getTeacherMe } from "@/api/auth";
import { LogoutButton } from "@/components/LogoutButton";
import { BackendStatusBadge } from "@/components/system/backend-status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getTeacherToken } from "@/lib/api";
import type { Teacher } from "@/types/api";

export function Topbar() {
  const [teacher, setTeacher] = useState<Teacher | null>(null);

  useEffect(() => {
    async function loadTeacher() {
      const token = getTeacherToken();
      if (!token) return;
      const data = await getTeacherMe(token);
      setTeacher(data);
    }

    loadTeacher().catch(console.error);
  }, []);

  const teacherName = teacher
    ? `${teacher.first_name} ${teacher.last_name}`.trim()
    : "O‘qituvchi";

  return (
    <div className="flex flex-col gap-3 rounded-xl border bg-background px-4 py-3 shadow-sm lg:flex-row lg:items-center lg:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <div className="truncate text-base font-semibold">Xush kelibsiz, {teacherName}</div>
          <BackendStatusBadge />
        </div>

        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>Teacher panel • FastAPI backend</span>
          {teacher?.position ? <Badge variant="secondary">{teacher.position}</Badge> : null}
          {teacher?.university ? <Badge variant="outline">{teacher.university}</Badge> : null}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <Button variant="outline" onClick={() => window.location.reload()}>
          Yangilash
        </Button>
        <LogoutButton redirectTo="/login" role="teacher" />
      </div>
    </div>
  );
}
