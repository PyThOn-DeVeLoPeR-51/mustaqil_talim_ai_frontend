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
  group_name?: string | null;
  experiment_group?: "experimental" | "control" | null;
  cohort_year?: number | null;
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
  topic?: string | null;
  week_number?: number | null;
  assessment_stage?: "pretest" | "intermediate" | "posttest" | null;
  academic_period?: string | null;
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
  uploaded_preview_url?: string | null;
  total_score?: number | null;
  ai_json_result?: Record<string, unknown> | null;
  overlay_path?: string | null;
  overlay_url?: string | null;
  table_json?: Array<Record<string, unknown>> | null;
  status: SubmissionStatus;
  created_at: string;
};


export type ExperimentGroup = "experimental" | "control";

export type AssessmentStage =
  | "pretest"
  | "intermediate"
  | "posttest";

export type AnalyticsSummary = {
  student_count: number;
  evaluated_student_count: number;
  evaluated_submission_count: number;

  initial_average: number | null;
  final_average: number | null;
  growth: number | null;

  second_attempt_growth: number | null;
  success_rate: number | null;
};

export type AnalyticsProgress = {
  labels: string[];
  values: Array<number | null>;
};

export type AnalyticsGroupComparisonItem = {
  label: string;
  before: number | null;
  after: number | null;
  count: number;
};

export type AnalyticsDistributionItem = {
  key: "high" | "good" | "satisfactory" | "low";
  label: string;
  value: number;
};

export type AnalyticsCriteria = {
  labels: string[];
  values: Array<number | null>;
};

export type AnalyticsHeatmapRow = {
  student_id: number;
  name: string;
  group_name?: string | null;
  values: Array<number | null>;
};

export type AnalyticsStudentOption = {
  id: number;
  full_name: string;
  group_name?: string | null;
  experiment_group?: ExperimentGroup | null;
};

export type AnalyticsFilterOptions = {
  groups: string[];
  students: AnalyticsStudentOption[];
  experiment_groups: ExperimentGroup[];
  modes: TaskMode[];
  topics: string[];
  week_numbers: number[];
  assessment_stages: AssessmentStage[];
  academic_periods: string[];
};

export type TeacherAnalyticsRead = {
  summary: AnalyticsSummary;
  progress: AnalyticsProgress;
  group_comparison: AnalyticsGroupComparisonItem[];
  distribution: AnalyticsDistributionItem[];
  criteria: AnalyticsCriteria;
  heatmap: AnalyticsHeatmapRow[];
  filters: AnalyticsFilterOptions;
};

export type TeacherAnalyticsParams = {
  group_name?: string;
  student_id?: number;
  experiment_group?: ExperimentGroup;
  mode?: TaskMode;
  topic?: string;
  week_number?: number;
  assessment_stage?: AssessmentStage;
  academic_period?: string;
};
