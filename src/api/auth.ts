import { api, setStudentToken, setTeacherToken } from "@/lib/api";
import type {
  LoginStudentResponse,
  LoginTeacherResponse,
  Student,
  Teacher,
} from "@/types/api";

function setCookie(name: string, value: string) {
  document.cookie = `${name}=${value}; path=/; max-age=86400; SameSite=Lax`;
}

export async function loginTeacher(data: {
  email: string;
  password: string;
}): Promise<LoginTeacherResponse> {
  const res = await api.post("/auth/teacher/login", data);

  // Student tokenni o‘chirmaymiz!
  setTeacherToken(res.data.access_token);
  setCookie("mt_teacher_auth", "1");

  return res.data;
}

export async function loginStudent(data: {
  login: string;
  password: string;
}): Promise<LoginStudentResponse> {
  const res = await api.post("/auth/student/login", data);

  // Teacher tokenni o‘chirmaymiz!
  setStudentToken(res.data.access_token);
  setCookie("mt_student_auth", "1");

  return res.data;
}

export async function getTeacherMe(token: string): Promise<Teacher> {
  const res = await api.get("/auth/teacher/me", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return res.data;
}

export async function getStudentMe(token: string): Promise<Student> {
  const res = await api.get("/auth/student/me", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return res.data;
}