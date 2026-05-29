import { api, studentAuthHeaders, teacherAuthHeaders } from "@/lib/api";

export async function createSubmission(data: {
  task_id: number;
  drawing_file: File;
}) {
  const formData = new FormData();

  formData.append("task_id", String(data.task_id));
  formData.append("drawing_file", data.drawing_file);

  const res = await api.post("/submissions", formData, {
    headers: {
      ...studentAuthHeaders(),
      "Content-Type": "multipart/form-data",
    },
  });

  return res.data;
}

export async function getMySubmissions() {
  const res = await api.get("/submissions/my", {
    headers: studentAuthHeaders(),
  });

  return res.data;
}

export async function getMyTaskSubmissions(taskId: number) {
  const res = await api.get(`/submissions/my/task/${taskId}`, {
    headers: studentAuthHeaders(),
  });

  return res.data;
}

export async function getTeacherSubmissions() {
  const res = await api.get("/submissions/teacher", {
    headers: teacherAuthHeaders(),
  });

  return res.data;
}

export async function getTeacherTaskSubmissions(taskId: number) {
  const res = await api.get(`/submissions/teacher/task/${taskId}`, {
    headers: teacherAuthHeaders(),
  });

  return res.data;
}