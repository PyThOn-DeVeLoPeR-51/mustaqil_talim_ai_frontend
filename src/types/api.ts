export type Teacher = {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  position?: string | null;
  university?: string | null;
  created_at: string;
};

export type Student = {
  id: number;
  teacher_id: number;
  full_name: string;
  university?: string | null;
  direction?: string | null;
  stage?: string | null;
  login: string;
  is_active: boolean;
  created_at: string;
};

export type LoginTeacherResponse = {
  access_token: string;
  token_type: string;
  teacher: Teacher;
};

export type LoginStudentResponse = {
  access_token: string;
  token_type: string;
  student: Student;
};

export type UserRole = "teacher" | "student";

export type TaskMode = "etalon" | "optional";

export type TaskRead = {
  id: number;
  teacher_id: number;
  title: string;
  description?: string | null;
  mode: TaskMode;
  reference_file_path?: string | null;
  instruction_file_path?: string | null;
  deadline?: string | null;
  is_active: boolean;
  created_at: string;
  assigned_student_ids: number[];
};

export type SubmissionStatus = "pending" | "evaluated" | "failed";

export type ResultRead = {
  id: number;
  task_id: number;
  task_title?: string | null;
  student_id: number;
  student_full_name?: string | null;
  attempt_number: number;
  mode: TaskMode;
  uploaded_file_path: string;
  uploaded_file_url?: string | null;
  total_score?: number | null;
  ai_json_result?: Record<string, unknown> | null;
  overlay_path?: string | null;
  overlay_url?: string | null;
  table_json?: Array<Record<string, unknown>> | null;
  status: SubmissionStatus;
  created_at: string;
};
