import { api, teacherAuthHeaders } from "@/lib/api";

export async function createStudent(data: {
  full_name: string;
  university?: string;
  direction?: string;
  stage?: string;
  login?: string;
  password?: string;
}) {
  const res = await api.post("/students", data, {
    headers: teacherAuthHeaders(),
  });

  return res.data;
}

export async function getStudents() {
  const res = await api.get("/students", {
    headers: teacherAuthHeaders(),
  });

  return res.data;
}

export async function getStudentById(studentId: number) {
  const res = await api.get(`/students/${studentId}`, {
    headers: teacherAuthHeaders(),
  });

  return res.data;
}

export async function updateStudent(
  studentId: number,
  data: {
    full_name?: string;
    university?: string;
    direction?: string;
    stage?: string;
    is_active?: boolean;
  }
) {
  const res = await api.patch(`/students/${studentId}`, data, {
    headers: teacherAuthHeaders(),
  });

  return res.data;
}

export async function deleteStudent(studentId: number) {
  const res = await api.delete(`/students/${studentId}`, {
    headers: teacherAuthHeaders(),
  });

  return res.data;
}