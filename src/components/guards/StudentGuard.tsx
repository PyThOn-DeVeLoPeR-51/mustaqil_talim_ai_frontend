"use client";

import { ReactNode, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { getStudentMe } from "@/api/auth";
import { clearStudentAuth, getStudentToken } from "@/lib/api";
import type { Student } from "@/types/api";

type StudentGuardProps = {
  children: ReactNode;
};

export function StudentGuard({ children }: StudentGuardProps) {
  const router = useRouter();

  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkStudent() {
      try {
        const token = getStudentToken();

        if (!token) {
          router.replace("/login");
          return;
        }

        const studentData = await getStudentMe(token);
        setStudent(studentData);
      } catch (error) {
        console.error("Student auth error:", error);
        clearStudentAuth();
        router.replace("/login");
      } finally {
        setLoading(false);
      }
    }

    checkStudent();
  }, [router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Tekshirilmoqda...</p>
      </div>
    );
  }

  if (!student) {
    return null;
  }

  return <>{children}</>;
}
