"use client";

import { ReactNode, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { getTeacherMe } from "@/api/auth";
import { clearTeacherAuth, getTeacherToken } from "@/lib/api";
import type { Teacher } from "@/types/api";

type TeacherGuardProps = {
  children: ReactNode;
};

export function TeacherGuard({ children }: TeacherGuardProps) {
  const router = useRouter();

  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkTeacher() {
      try {
        const token = getTeacherToken();

        if (!token) {
          router.replace("/login");
          return;
        }

        const teacherData = await getTeacherMe(token);
        setTeacher(teacherData);
      } catch (error) {
        console.error("Teacher auth error:", error);
        clearTeacherAuth();
        router.replace("/login");
      } finally {
        setLoading(false);
      }
    }

    checkTeacher();
  }, [router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Tekshirilmoqda...</p>
      </div>
    );
  }

  if (!teacher) {
    return null;
  }

  return <>{children}</>;
}
