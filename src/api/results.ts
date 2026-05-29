import { api, studentAuthHeaders, teacherAuthHeaders } from "@/lib/api";

export async function getTeacherResults() {
  const res = await api.get("/results/teacher", {
    headers: teacherAuthHeaders(),
  });

  return res.data;
}

export async function getTeacherTaskResults(taskId: number) {
  const res = await api.get(`/results/teacher/task/${taskId}`, {
    headers: teacherAuthHeaders(),
  });

  return res.data;
}

export async function getTeacherStudentResults(studentId: number) {
  const res = await api.get(`/results/teacher/student/${studentId}`, {
    headers: teacherAuthHeaders(),
  });

  return res.data;
}

export async function getTeacherResultDetail(submissionId: number) {
  const res = await api.get(`/results/teacher/${submissionId}`, {
    headers: teacherAuthHeaders(),
  });

  return res.data;
}

export async function getStudentResults() {
  const res = await api.get("/results/student/my", {
    headers: studentAuthHeaders(),
  });

  return res.data;
}

export async function getStudentTaskResults(taskId: number) {
  const res = await api.get(`/results/student/task/${taskId}`, {
    headers: studentAuthHeaders(),
  });

  return res.data;
}

export async function getStudentResultDetail(submissionId: number) {
  const res = await api.get(`/results/student/${submissionId}`, {
    headers: studentAuthHeaders(),
  });

  return res.data;
}