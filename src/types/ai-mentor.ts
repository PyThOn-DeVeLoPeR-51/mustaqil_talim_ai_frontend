
export type AIMentorLLMStatus = {
  provider: string;
  model?: string | null;
  configured: boolean;
  fallback_to_mock: boolean;
};

export type AIMentorDiagnosticAnswerType =
  | "single_choice"
  | "multiple_choice"
  | "short_text"
  | "long_text"
  | "number"
  | "boolean";

export type AIMentorDiagnosticSessionStatus =
  | "in_progress"
  | "completed"
  | "cancelled";

export type AIMentorPlanStatus = "draft" | "active" | "completed" | "archived";
export type AIMentorPlanItemStatus =
  | "pending"
  | "in_progress"
  | "completed"
  | "skipped";
export type AIMentorChatSessionStatus = "active" | "closed" | "archived";
export type AIMentorChatMessageRole = "system" | "user" | "assistant";

export type AIMentorOptionValue = string | number | boolean;

export type AIMentorChoiceOption = {
  value: AIMentorOptionValue;
  label: string;
};

export type AIMentorQuestionOptions =
  | AIMentorChoiceOption[]
  | {
      min?: number;
      max?: number;
      unit?: string;
      [key: string]: unknown;
    }
  | null;

export type AIMentorDiagnosticQuestion = {
  id: number;
  question_code: string;
  version: number;
  question_text: string;
  help_text?: string | null;
  category?: string | null;
  answer_type: AIMentorDiagnosticAnswerType;
  options_json: AIMentorQuestionOptions;
  sort_order: number;
  is_required: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type AIMentorDiagnosticAnswer = {
  id: number;
  session_id: number;
  question_id: number;
  answer_text?: string | null;
  answer_json?: unknown;
  created_at: string;
  updated_at: string;
  question?: AIMentorDiagnosticQuestion | null;
};

export type AIMentorDiagnosticAnswerInput = {
  question_id: number;
  answer_text?: string;
  answer_json?: unknown;
};

export type AIMentorDiagnosticSession = {
  id: number;
  student_id: number;
  version: number;
  status: AIMentorDiagnosticSessionStatus;
  analysis_summary?: string | null;
  analysis_json?: Record<string, unknown> | null;
  started_at: string;
  completed_at?: string | null;
  created_at: string;
  updated_at: string;
};

export type AIMentorDiagnosticSessionDetail = AIMentorDiagnosticSession & {
  answers: AIMentorDiagnosticAnswer[];
};

export type AIMentorPlanItem = {
  id: number;
  plan_week_id: number;
  item_order: number;
  day_number?: number | null;
  title: string;
  description?: string | null;
  activity_type?: string | null;
  estimated_minutes?: number | null;
  resources_json?: unknown[] | Record<string, unknown> | null;
  status: AIMentorPlanItemStatus;
  completed_at?: string | null;
  created_at: string;
  updated_at: string;
};

export type AIMentorPlanWeek = {
  id: number;
  plan_id: number;
  week_number: number;
  title: string;
  goal?: string | null;
  description?: string | null;
  expected_outcome?: string | null;
  created_at: string;
  updated_at: string;
  items: AIMentorPlanItem[];
};

export type AIMentorPlan = {
  id: number;
  student_id: number;
  diagnostic_session_id?: number | null;
  version: number;
  title: string;
  summary?: string | null;
  status: AIMentorPlanStatus;
  generation_source: "mock" | "llm" | "manual";
  generation_metadata?: Record<string, unknown> | null;
  start_date?: string | null;
  end_date?: string | null;
  created_at: string;
  updated_at: string;
};

export type AIMentorPlanDetail = AIMentorPlan & {
  weeks: AIMentorPlanWeek[];
};

export type AIMentorPlanProgress = {
  total_items: number;
  completed_items: number;
  in_progress_items: number;
  skipped_items: number;
  progress_percent: number;
};

export type AIMentorPlanDetailResponse = {
  plan: AIMentorPlanDetail;
  progress: AIMentorPlanProgress;
};

export type AIMentorRagSource = {
  source_id: number;
  document_id: number;
  document_title: string;
  chunk_id: number;
  chunk_index: number;
  score: number;
  excerpt: string;
  section_title?: string | null;
  page_number?: number | null;
  page_number_start?: number | null;
  page_number_end?: number | null;
};

export type AIMentorRagMetadata = {
  enabled: boolean;
  status: string;
  used_for_answer: boolean;
  source_count: number;
  embedding_model?: string | null;
  sources: AIMentorRagSource[];
};

export type AIMentorChatMessageMetadata = {
  provider?: string;
  model?: string;
  stream?: boolean;
  stream_pending?: boolean;
  fallback_from_provider?: string;
  fallback_reason?: string;
  rag?: AIMentorRagMetadata;
  [key: string]: unknown;
};

export type AIMentorChatMessage = {
  id: number;
  session_id: number;
  sequence_number: number;
  role: AIMentorChatMessageRole;
  content: string;
  model_name?: string | null;
  token_count?: number | null;
  metadata_json?: AIMentorChatMessageMetadata | null;
  created_at: string;
};

export type AIMentorChatSession = {
  id: number;
  student_id: number;
  plan_id?: number | null;
  title?: string | null;
  status: AIMentorChatSessionStatus;
  context_json?: Record<string, unknown> | null;
  last_message_at?: string | null;
  created_at: string;
  updated_at: string;
};

export type AIMentorChatSessionDetail = AIMentorChatSession & {
  messages: AIMentorChatMessage[];
};

export type AIMentorChatResponse = {
  session: AIMentorChatSession;
  user_message: AIMentorChatMessage;
  assistant_message: AIMentorChatMessage;
};


export type AIMentorChatStreamUserMessage = {
  id: number;
  session_id: number;
  sequence_number: number;
  role: "user";
  content: string;
  created_at: string;
};

export type AIMentorChatStreamStart = {
  session_id: number;
  user_message: AIMentorChatStreamUserMessage;
  provider: string;
  model?: string | null;
};

export type AIMentorChatStreamFallback = {
  from_provider: string;
  reason: string;
  replace: boolean;
};

export type AIMentorChatStreamDone = {
  session_id: number;
  assistant_message: AIMentorChatMessage;
};
