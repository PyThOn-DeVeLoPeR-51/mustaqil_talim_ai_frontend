import { api, studentAuthHeaders, teacherAuthHeaders } from "@/lib/api";
import type { AssessmentStage, TaskMode, TaskRead } from "@/types/api";

export async function createTask(data: {
  title: string;
  mode: TaskMode;
  description?: string;
  topic?: string;
  week_number?: number;
  assessment_stage?: AssessmentStage;
  academic_period?: string;
  deadline?: string;
  assigned_student_ids?: number[];
  reference_file?: File | null;
  instruction_file?: File | null;
}): Promise<TaskRead> {
  const formData = new FormData();

  formData.append("title", data.title);
  formData.append("mode", data.mode);

  if (data.description) {
    formData.append("description", data.description);
  }

  if (data.topic) {
    formData.append("topic", data.topic);
  }

  if (typeof data.week_number === "number") {
    formData.append("week_number", String(data.week_number));
  }

  if (data.assessment_stage) {
    formData.append("assessment_stage", data.assessment_stage);
  }

  if (data.academic_period) {
    formData.append("academic_period", data.academic_period);
  }

  if (data.deadline) {
    formData.append("deadline", data.deadline);
  }

  if (data.assigned_student_ids?.length) {
    formData.append("assigned_student_ids", data.assigned_student_ids.join(","));
  }

  if (data.reference_file) {
    formData.append("reference_file", data.reference_file);
  }

  if (data.instruction_file) {
    formData.append("instruction_file", data.instruction_file);
  }

  const res = await api.post("/tasks", formData, {
    headers: {
      ...teacherAuthHeaders(),
      "Content-Type": "multipart/form-data",
    },
  });

  return res.data;
}

export async function getTeacherTasks(): Promise<TaskRead[]> {
  const res = await api.get("/tasks", {
    headers: teacherAuthHeaders(),
  });

  return res.data;
}

export async function getTeacherTaskById(taskId: number): Promise<TaskRead> {
  const res = await api.get(`/tasks/${taskId}`, {
    headers: teacherAuthHeaders(),
  });

  return res.data;
}

export async function updateTask(
  taskId: number,
  data: {
    title?: string;
    description?: string;
    topic?: string;
    week_number?: number | null;
    assessment_stage?: AssessmentStage | null;
    academic_period?: string | null;
    mode?: TaskMode;
    deadline?: string | null;
    is_active?: boolean;
  }
): Promise<TaskRead> {
  const res = await api.patch(`/tasks/${taskId}`, data, {
    headers: teacherAuthHeaders(),
  });

  return res.data;
}

export async function assignStudentsToTask(taskId: number, studentIds: number[]): Promise<TaskRead> {
  const res = await api.post(
    `/tasks/${taskId}/assign-students`,
    {
      student_ids: studentIds,
    },
    {
      headers: teacherAuthHeaders(),
    }
  );

  return res.data;
}

export async function deleteTask(taskId: number) {
  const res = await api.delete(`/tasks/${taskId}`, {
    headers: teacherAuthHeaders(),
  });

  return res.data;
}

export async function getStudentTasks(): Promise<TaskRead[]> {
  const res = await api.get("/tasks/student/my", {
    headers: studentAuthHeaders(),
  });

  return res.data;
}

export async function getStudentTaskById(taskId: number): Promise<TaskRead | null> {
  const tasks = await getStudentTasks();
  return tasks.find((task) => task.id === taskId) ?? null;
}
