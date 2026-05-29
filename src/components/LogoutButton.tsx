"use client";

import { usePathname, useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { clearAuthTokens, clearStudentAuth, clearTeacherAuth } from "@/lib/api";

type LogoutButtonProps = {
  redirectTo?: string;
  role?: "teacher" | "student" | "all";
};

export function LogoutButton({ redirectTo = "/login", role }: LogoutButtonProps) {
  const router = useRouter();
  const pathname = usePathname();

  function handleLogout() {
    const resolvedRole = role ?? (pathname.startsWith("/student") ? "student" : "teacher");

    if (resolvedRole === "student") {
      clearStudentAuth();
    } else if (resolvedRole === "teacher") {
      clearTeacherAuth();
    } else {
      clearAuthTokens();
    }

    router.replace(redirectTo);
  }

  return (
    <Button onClick={handleLogout}>
      Chiqish
    </Button>
  );
}
