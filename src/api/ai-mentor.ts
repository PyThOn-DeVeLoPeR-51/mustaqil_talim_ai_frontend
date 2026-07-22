import { api, studentAuthHeaders } from "@/lib/api";
import type {
  AIMentorChatResponse,
  AIMentorChatSession,
  AIMentorChatSessionDetail,
  AIMentorDiagnosticAnswerInput,
  AIMentorDiagnosticQuestion,
  AIMentorDiagnosticSession,
  AIMentorDiagnosticSessionDetail,
  AIMentorPlanDetailResponse,
  AIMentorPlanItem,
  AIMentorPlanItemStatus,
} from "@/types/ai-mentor";

const config = () => ({ headers: studentAuthHeaders() });

export async function getAIMentorDiagnosticQuestions(): Promise<
  AIMentorDiagnosticQuestion[]
> {
  const response = await api.get<AIMentorDiagnosticQuestion[]>(
    "/ai-mentor/diagnostic/questions",
    config(),
  );
  return response.data;
}

export async function createAIMentorDiagnosticSession(): Promise<AIMentorDiagnosticSession> {
  const response = await api.post<AIMentorDiagnosticSession>(
    "/ai-mentor/diagnostic/sessions",
    {},
    config(),
  );
  return response.data;
}

export async function getAIMentorDiagnosticSessions(): Promise<
  AIMentorDiagnosticSession[]
> {
  const response = await api.get<AIMentorDiagnosticSession[]>(
    "/ai-mentor/diagnostic/sessions",
    config(),
  );
  return response.data;
}

export async function getAIMentorDiagnosticSession(
  sessionId: number,
): Promise<AIMentorDiagnosticSessionDetail> {
  const response = await api.get<AIMentorDiagnosticSessionDetail>(
    `/ai-mentor/diagnostic/sessions/${sessionId}`,
    config(),
  );
  return response.data;
}

export async function submitAIMentorDiagnosticAnswers(
  sessionId: number,
  answers: AIMentorDiagnosticAnswerInput[],
): Promise<AIMentorDiagnosticSessionDetail> {
  const response = await api.post<AIMentorDiagnosticSessionDetail>(
    `/ai-mentor/diagnostic/sessions/${sessionId}/answers`,
    { answers },
    config(),
  );
  return response.data;
}

export async function createAIMentorMockPlan(data: {
  diagnostic_session_id: number;
  start_date: string;
}): Promise<AIMentorPlanDetailResponse> {
  const response = await api.post<AIMentorPlanDetailResponse>(
    "/ai-mentor/plans/mock",
    data,
    config(),
  );
  return response.data;
}

export async function getCurrentAIMentorPlan(): Promise<AIMentorPlanDetailResponse | null> {
  const response = await api.get<AIMentorPlanDetailResponse | null>(
    "/ai-mentor/plans/current",
    config(),
  );
  return response.data;
}

export async function updateAIMentorPlanItemProgress(
  itemId: number,
  status: AIMentorPlanItemStatus,
): Promise<AIMentorPlanItem> {
  const response = await api.patch<AIMentorPlanItem>(
    `/ai-mentor/plan-items/${itemId}/progress`,
    { status },
    config(),
  );
  return response.data;
}

export async function createAIMentorChatSession(data: {
  plan_id?: number | null;
  title?: string;
  context_json?: Record<string, unknown>;
}): Promise<AIMentorChatSession> {
  const response = await api.post<AIMentorChatSession>(
    "/ai-mentor/chat/sessions",
    data,
    config(),
  );
  return response.data;
}

export async function getAIMentorChatSessions(): Promise<AIMentorChatSession[]> {
  const response = await api.get<AIMentorChatSession[]>(
    "/ai-mentor/chat/sessions",
    config(),
  );
  return response.data;
}

export async function getAIMentorChatSession(
  sessionId: number,
): Promise<AIMentorChatSessionDetail> {
  const response = await api.get<AIMentorChatSessionDetail>(
    `/ai-mentor/chat/sessions/${sessionId}`,
    config(),
  );
  return response.data;
}

export async function updateAIMentorChatSession(
  sessionId: number,
  data: {
    title?: string;
    status?: "active" | "closed" | "archived";
    context_json?: Record<string, unknown>;
  },
): Promise<AIMentorChatSession> {
  const response = await api.patch<AIMentorChatSession>(
    `/ai-mentor/chat/sessions/${sessionId}`,
    data,
    config(),
  );
  return response.data;
}

export async function sendAIMentorChatMessage(
  sessionId: number,
  content: string,
): Promise<AIMentorChatResponse> {
  const response = await api.post<AIMentorChatResponse>(
    `/ai-mentor/chat/sessions/${sessionId}/messages`,
    { content },
    config(),
  );
  return response.data;
}
