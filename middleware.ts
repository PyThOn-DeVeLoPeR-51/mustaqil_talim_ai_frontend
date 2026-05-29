import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;

  const isTeacherArea =
    path.startsWith("/dashboard") ||
    path.startsWith("/students") ||
    path.startsWith("/tasks") ||
    path.startsWith("/submissions");

  const isStudentArea = path.startsWith("/student");

  const hasTeacherAuth = req.cookies.get("mt_teacher_auth")?.value === "1";
  const hasStudentAuth = req.cookies.get("mt_student_auth")?.value === "1";

  if (isTeacherArea && !hasTeacherAuth) {
    const url = req.nextUrl.clone();
    url.pathname = hasStudentAuth ? "/student/tasks" : "/login";
    return NextResponse.redirect(url);
  }

  if (isStudentArea && !hasStudentAuth) {
    const url = req.nextUrl.clone();
    url.pathname = hasTeacherAuth ? "/dashboard" : "/login";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/students/:path*",
    "/tasks/:path*",
    "/submissions/:path*",
    "/student/:path*",
  ],
};
