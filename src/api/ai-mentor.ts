import { API_BASE_URL, api, getStudentToken, studentAuthHeaders } from "@/lib/api";
import type {
  AIMentorChatResponse,
  AIMentorChatStreamDone,
  AIMentorChatStreamFallback,
  AIMentorChatStreamStart,
  AIMentorChatSession,
  AIMentorChatSessionDetail,
  AIMentorDiagnosticAnswerInput,
  AIMentorDiagnosticQuestion,
  AIMentorDiagnosticSession,
  AIMentorDiagnosticSessionDetail,
  AIMentorPlanDetailResponse,
  AIMentorPlanItem,
  AIMentorPlanItemStatus,
  AIMentorLLMStatus,
} from "@/types/ai-mentor";

const config = () => ({ headers: studentAuthHeaders() });

export async function getAIMentorLLMStatus(): Promise<AIMentorLLMStatus> {
  const response = await api.get<AIMentorLLMStatus>(
    "/ai-mentor/llm/status",
    config(),
  );
  return response.data;
}

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

export async function createAIMentorGeneratedPlan(data: {
  diagnostic_session_id: number;
  start_date: string;
}): Promise<AIMentorPlanDetailResponse> {
  const response = await api.post<AIMentorPlanDetailResponse>(
    "/ai-mentor/plans/generate",
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


type AIMentorChatStreamHandlers = {
  onStart?: (payload: AIMentorChatStreamStart) => void;
  onDelta?: (delta: string) => void;
  onFallback?: (payload: AIMentorChatStreamFallback) => void;
  onDone?: (payload: AIMentorChatStreamDone) => void;
};

type AIMentorSSEPayload = Record<string, unknown>;

function getStreamingErrorMessage(payload: AIMentorSSEPayload) {
  const message = payload.message;
  return typeof message === "string" && message.trim()
    ? message
    : "AI Mentor streaming javobini yakunlay olmadi.";
}

export async function streamAIMentorChatMessage(
  sessionId: number,
  content: string,
  handlers: AIMentorChatStreamHandlers = {},
  signal?: AbortSignal,
): Promise<AIMentorChatStreamDone> {
  const token = getStudentToken();
  if (!token) {
    throw new Error("Talaba autentifikatsiya tokeni topilmadi.");
  }

  const response = await fetch(
    `${API_BASE_URL}/api/v1/ai-mentor/chat/sessions/${sessionId}/messages/stream`,
    {
      method: "POST",
      headers: {
        Accept: "text/event-stream",
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ content }),
      cache: "no-store",
      signal,
    },
  );

  if (!response.ok) {
    let message = `AI Mentor streaming so‘rovi bajarilmadi (${response.status}).`;
    try {
      const payload = (await response.json()) as { detail?: unknown };
      if (typeof payload.detail === "string" && payload.detail.trim()) {
        message = payload.detail;
      }
    } catch {
      // JSON bo‘lmagan xato javobida status matni yetarli.
    }
    throw new Error(message);
  }

  if (!response.body) {
    throw new Error("Browser streaming javob oqimini ocholmadi.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";
  let finalPayload: AIMentorChatStreamDone | null = null;

  const dispatchEventBlock = (block: string) => {
    if (!block.trim()) return;

    let eventName = "message";
    const dataLines: string[] = [];

    for (const line of block.split("\n")) {
      if (line.startsWith("event:")) {
        eventName = line.slice("event:".length).trim();
      } else if (line.startsWith("data:")) {
        dataLines.push(line.slice("data:".length).trimStart());
      }
    }

    if (dataLines.length === 0) return;

    let payload: AIMentorSSEPayload;
    try {
      payload = JSON.parse(dataLines.join("\n")) as AIMentorSSEPayload;
    } catch {
      throw new Error("AI Mentor streaming javobining formati noto‘g‘ri.");
    }

    if (eventName === "start") {
      handlers.onStart?.(payload as AIMentorChatStreamStart);
      return;
    }

    if (eventName === "delta") {
      const delta = payload.delta;
      if (typeof delta === "string" && delta) {
        handlers.onDelta?.(delta);
      }
      return;
    }

    if (eventName === "fallback") {
      handlers.onFallback?.(payload as AIMentorChatStreamFallback);
      return;
    }

    if (eventName === "done") {
      finalPayload = payload as AIMentorChatStreamDone;
      handlers.onDone?.(finalPayload);
      return;
    }

    if (eventName === "error") {
      throw new Error(getStreamingErrorMessage(payload));
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    buffer = buffer.replaceAll("\r\n", "\n");

    let separatorIndex = buffer.indexOf("\n\n");
    while (separatorIndex >= 0) {
      const block = buffer.slice(0, separatorIndex);
      buffer = buffer.slice(separatorIndex + 2);
      dispatchEventBlock(block);
      separatorIndex = buffer.indexOf("\n\n");
    }
  }

  buffer += decoder.decode();
  buffer = buffer.replaceAll("\r\n", "\n");
  if (buffer.trim()) {
    dispatchEventBlock(buffer);
  }

  if (!finalPayload) {
    throw new Error("AI Mentor streaming javobi yakunlanmasdan uzildi.");
  }

  return finalPayload;
}
