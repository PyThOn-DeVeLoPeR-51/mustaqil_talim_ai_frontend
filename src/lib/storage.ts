export type Role = "teacher" | "student";

export type Student = {
  id: string;
  fio: string;
  otm: string;
  yonalish: string;
  bosqich: string;
  login: string;
  password: string;
  attemptsLeft: number; // 2..0
};

export type TaskMode = "etalon" | "ixtiyoriy";

export type FileAsset = {
  name: string;
  type: string;   // mime
  size: number;   // bytes
  dataUrl?: string; // base64 data url
};

export type Task = {
  id: string;
  title: string;
  description?: string;
  mode: TaskMode;
  createdAt: string;

  // NEW:
  assignmentFile?: FileAsset; // topshiriq fayli
  etalonFile?: FileAsset;     // faqat etalon rejimda
};

export type Submission = {
  id: string;
  taskId: string;
  studentLogin: string;
  attempt: 1 | 2;
  status: "pending" | "reviewed";
  createdAt: string;
  // demo result:
  totalScore?: number;

  studentSnapshot?: {
    fio: string;
    otm: string;
    yonalish: string;
    bosqich: string;
  };

  studentFile?: FileAsset; // talaba yuklagan fayl
  aiResultFile?: FileAsset; // keyin AI qaytargan annotatsiyali fayl (placeholder)
};

const KEYS = {
  students: "mt_students_v1",
  tasks: "mt_tasks_v1",
  submissions: "mt_submissions_v1",
};

function safeParse<T>(raw: string | null, fallback: T): T {
  try {
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function uid() {
  return crypto.randomUUID();
}

export const db = {
  // Students
  getStudents(): Student[] {
    return safeParse<Student[]>(localStorage.getItem(KEYS.students), []);
  },
  setStudents(rows: Student[]) {
    localStorage.setItem(KEYS.students, JSON.stringify(rows));
  },

  // Tasks
  getTasks(): Task[] {
    return safeParse<Task[]>(localStorage.getItem(KEYS.tasks), []);
  },
  setTasks(rows: Task[]) {
    localStorage.setItem(KEYS.tasks, JSON.stringify(rows));
  },

  // Submissions
  getSubmissions(): Submission[] {
    return safeParse<Submission[]>(localStorage.getItem(KEYS.submissions), []);
  },
  setSubmissions(rows: Submission[]) {
    localStorage.setItem(KEYS.submissions, JSON.stringify(rows));
  },
};
