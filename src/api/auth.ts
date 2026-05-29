import { api, setCookie, setStudentToken, setTeacherToken } from "@/lib/api";
import type {
  LoginStudentResponse,
  LoginTeacherResponse,
  Student,
  Teacher,
} from "@/types/api";

export async function registerTeacher(data: {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  position?: string;
  university?: string;
}): Promise<Teacher> {
  const res = await api.post("/auth/teacher/register", data);
  return res.data;
}

export async function loginTeacher(data: {
  email: string;
  password: string;
}): Promise<LoginTeacherResponse> {
  const res = await api.post("/auth/teacher/login", data);

  // Muhim: student tokenni o‘chirmaymiz. Bir browserda teacher va student oynalari parallel ishlashi mumkin.
  setTeacherToken(res.data.access_token);
  setCookie("mt_teacher_auth", "1");
  setCookie("mt_teacher_login", res.data.teacher.email);

  return res.data;
}

export async function loginStudent(data: {
  login: string;
  password: string;
}): Promise<LoginStudentResponse> {
  const res = await api.post("/auth/student/login", data);

  // Muhim: teacher tokenni o‘chirmaymiz. Aks holda teacher oynasi refresh bo‘lganda auth yo‘qoladi.
  setStudentToken(res.data.access_token);
  setCookie("mt_student_auth", "1");
  setCookie("mt_student_login", res.data.student.login);

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
