"use client";

import {
  ChangeEvent,
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  BookOpen,
  Bot,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Clock3,
  FileText,
  Loader2,
  MessageSquarePlus,
  RotateCcw,
  Send,
  Sparkles,
  User,
} from "lucide-react";
import { toast } from "sonner";

import {
  createAIMentorChatSession,
  createAIMentorDiagnosticSession,
  createAIMentorGeneratedPlan,
  getAIMentorChatSession,
  getAIMentorChatSessions,
  getAIMentorDiagnosticQuestions,
  getAIMentorLLMStatus,
  getAIMentorDiagnosticSession,
  getAIMentorDiagnosticSessions,
  getCurrentAIMentorPlan,
  streamAIMentorChatMessage,
  submitAIMentorDiagnosticAnswers,
  updateAIMentorChatSession,
  updateAIMentorPlanItemProgress,
} from "@/api/ai-mentor";
import { MarkdownMessage } from "@/components/ai-mentor/markdown-message";
import { ErrorState, LoadingState } from "@/components/states/page-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { getApiErrorMessage } from "@/lib/error";
import type {
  AIMentorChatMessage,
  AIMentorChatSession,
  AIMentorChatStreamStart,
  AIMentorChoiceOption,
  AIMentorDiagnosticAnswerInput,
  AIMentorDiagnosticQuestion,
  AIMentorDiagnosticSessionDetail,
  AIMentorOptionValue,
  AIMentorLLMStatus,
  AIMentorPlanDetailResponse,
  AIMentorPlanItem,
  AIMentorPlanItemStatus,
  AIMentorRagMetadata,
  AIMentorRagSource,
} from "@/types/ai-mentor";

type DiagnosticFormValue =
  | string
  | number
  | boolean
  | AIMentorOptionValue[]
  | null;

type DiagnosticFormAnswers = Record<number, DiagnosticFormValue>;

const selectClass =
  "h-10 w-full rounded-md border bg-background px-3 text-sm outline-none transition focus:ring-2 focus:ring-ring";

const welcomeMessage: AIMentorChatMessage = {
  id: -1,
  session_id: -1,
  sequence_number: 0,
  role: "assistant",
  content:
    "Assalomu alaykum! Men AI Mentorman. Shaxsiy rejangiz, vaqtni boshqarish yoki qiyin mavzular bo‘yicha savolingizni yozing.",
  model_name: "frontend-welcome",
  token_count: null,
  metadata_json: null,
  created_at: "",
};

function isChoiceOption(value: unknown): value is AIMentorChoiceOption {
  if (typeof value !== "object" || value === null) return false;
  const option = value as Record<string, unknown>;
  return (
    "value" in option &&
    ["string", "number", "boolean"].includes(typeof option.value) &&
    typeof option.label === "string"
  );
}

function getChoiceOptions(
  question: AIMentorDiagnosticQuestion,
): AIMentorChoiceOption[] {
  if (!Array.isArray(question.options_json)) return [];
  return question.options_json.filter(isChoiceOption);
}

function getNumberLimits(question: AIMentorDiagnosticQuestion) {
  if (
    !question.options_json ||
    Array.isArray(question.options_json) ||
    typeof question.options_json !== "object"
  ) {
    return { min: undefined, max: undefined };
  }

  const minimum = question.options_json.min;
  const maximum = question.options_json.max;

  return {
    min: typeof minimum === "number" ? minimum : undefined,
    max: typeof maximum === "number" ? maximum : undefined,
  };
}

function isAnswerFilled(value: DiagnosticFormValue | undefined) {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

function answerMapFromSession(
  session: AIMentorDiagnosticSessionDetail | null,
): DiagnosticFormAnswers {
  if (!session) return {};

  return session.answers.reduce<DiagnosticFormAnswers>((result, answer) => {
    if (answer.answer_json !== null && answer.answer_json !== undefined) {
      result[answer.question_id] = answer.answer_json as DiagnosticFormValue;
    } else if (answer.answer_text) {
      result[answer.question_id] = answer.answer_text;
    }
    return result;
  }, {});
}

function formatLocalDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function planItemStatusLabel(status: AIMentorPlanItemStatus) {
  const labels: Record<AIMentorPlanItemStatus, string> = {
    pending: "Kutilmoqda",
    in_progress: "Jarayonda",
    completed: "Bajarildi",
    skipped: "O‘tkazib yuborildi",
  };
  return labels[status];
}

function planStatusVariant(status: AIMentorPlanItemStatus) {
  if (status === "completed") return "secondary" as const;
  if (status === "skipped") return "destructive" as const;
  return "outline" as const;
}

function isRagSource(value: unknown): value is AIMentorRagSource {
  if (!value || typeof value !== "object") return false;
  const source = value as Record<string, unknown>;

  return (
    typeof source.source_id === "number" &&
    typeof source.document_id === "number" &&
    typeof source.document_title === "string" &&
    typeof source.chunk_id === "number" &&
    typeof source.chunk_index === "number" &&
    typeof source.score === "number" &&
    typeof source.excerpt === "string"
  );
}

function getRagMetadata(
  message: AIMentorChatMessage,
): AIMentorRagMetadata | null {
  const rawRag = message.metadata_json?.rag;
  if (!rawRag || typeof rawRag !== "object") return null;

  const rag = rawRag as Record<string, unknown>;
  if (
    rag.used_for_answer !== true ||
    !Array.isArray(rag.sources) ||
    rag.sources.length === 0
  ) {
    return null;
  }

  const sources = rag.sources.filter(isRagSource);
  if (sources.length === 0) return null;

  return {
    enabled: rag.enabled === true,
    status: typeof rag.status === "string" ? rag.status : "ready",
    used_for_answer: true,
    source_count:
      typeof rag.source_count === "number" ? rag.source_count : sources.length,
    embedding_model:
      typeof rag.embedding_model === "string" ? rag.embedding_model : null,
    sources,
  };
}

function sourceLocationLabel(source: AIMentorRagSource) {
  const labels: string[] = [];

  if (source.section_title?.trim()) {
    labels.push(source.section_title.trim());
  }

  const pageStart = source.page_number_start ?? source.page_number ?? null;
  const pageEnd = source.page_number_end ?? pageStart;
  if (pageStart !== null) {
    labels.push(
      pageEnd !== null && pageEnd !== pageStart
        ? `${pageStart}–${pageEnd}-betlar`
        : `${pageStart}-bet`,
    );
  }

  if (labels.length === 0) {
    labels.push(`Matn bo‘lagi ${source.chunk_index + 1}`);
  }

  return labels.join(" · ");
}

function sourceScoreLabel(score: number) {
  const normalizedScore = Math.max(0, Math.min(1, score));
  return `${Math.round(normalizedScore * 100)}% mos`;
}

function RagSources({ message }: { message: AIMentorChatMessage }) {
  const rag = getRagMetadata(message);
  if (!rag) return null;

  const sources = [...rag.sources].sort(
    (first, second) => first.source_id - second.source_id,
  );

  return (
    <div className="mt-4 border-t pt-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold">
          <BookOpen className="h-3.5 w-3.5" />
          Topilgan manbalar
        </span>
        <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
          {sources.length} ta
        </Badge>
        <span className="text-[11px] text-muted-foreground">
          O‘qituvchi yuklagan materiallar
        </span>
      </div>

      <div className="mt-2 space-y-2">
        {sources.map((source, index) => (
          <details
            key={`${source.document_id}-${source.chunk_id}`}
            className="group rounded-lg border bg-muted/30 open:bg-muted/50"
          >
            <summary className="flex cursor-pointer list-none items-start justify-between gap-3 px-3 py-2.5 [&::-webkit-details-marker]:hidden">
              <div className="flex min-w-0 items-start gap-2.5">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">
                  {source.source_id || index + 1}
                </span>
                <div className="min-w-0">
                  <div className="flex items-start gap-1.5 font-medium leading-5">
                    <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <span className="line-clamp-2">
                      {source.document_title}
                    </span>
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
                    <span>{sourceLocationLabel(source)}</span>
                    <span aria-hidden="true">•</span>
                    <span>{sourceScoreLabel(source.score)}</span>
                  </div>
                </div>
              </div>
              <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
            </summary>
            <div className="border-t px-3 py-3 text-xs leading-5 text-muted-foreground">
              <p className="whitespace-pre-wrap">{source.excerpt}</p>
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}

export default function MentorPage() {
  const [questions, setQuestions] = useState<AIMentorDiagnosticQuestion[]>([]);
  const [llmStatus, setLlmStatus] = useState<AIMentorLLMStatus | null>(null);
  const [answers, setAnswers] = useState<DiagnosticFormAnswers>({});
  const [diagnostic, setDiagnostic] =
    useState<AIMentorDiagnosticSessionDetail | null>(null);
  const [planData, setPlanData] = useState<AIMentorPlanDetailResponse | null>(null);
  const [chatSession, setChatSession] = useState<AIMentorChatSession | null>(null);
  const [messages, setMessages] = useState<AIMentorChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [creatingPlan, setCreatingPlan] = useState(false);
  const [updatingItemId, setUpdatingItemId] = useState<number | null>(null);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [startingNewChat, setStartingNewChat] = useState(false);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  const loadMentorData = useCallback(async () => {
    setLoading(true);
    setLoadError(null);

    try {
      const [
        llmProviderStatus,
        questionRows,
        diagnosticSessions,
        currentPlan,
        chatSessions,
      ] = await Promise.all([
        getAIMentorLLMStatus(),
        getAIMentorDiagnosticQuestions(),
        getAIMentorDiagnosticSessions(),
        getCurrentAIMentorPlan(),
        getAIMentorChatSessions(),
      ]);

      const latestSession = diagnosticSessions[0]
        ? await getAIMentorDiagnosticSession(diagnosticSessions[0].id)
        : null;

      const preferredChat = currentPlan
        ? chatSessions.find(
            (session) =>
              session.status === "active" &&
              session.plan_id === currentPlan.plan.id,
          )
        : chatSessions.find(
            (session) =>
              session.status === "active" && session.plan_id == null,
          );

      const chatDetail = preferredChat
        ? await getAIMentorChatSession(preferredChat.id)
        : null;

      setLlmStatus(llmProviderStatus);
      setQuestions(questionRows);
      setDiagnostic(latestSession);
      setAnswers(answerMapFromSession(latestSession));
      setPlanData(currentPlan);
      setChatSession(chatDetail);
      setMessages(chatDetail?.messages ?? []);
    } catch (error) {
      console.error("AI Mentor data loading error:", error);
      setLoadError(
        getApiErrorMessage(
          error,
          "AI Mentor ma’lumotlarini backenddan yuklab bo‘lmadi.",
        ),
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadMentorData();
  }, [loadMentorData]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  const completedProfile = useMemo(() => {
    const requiredQuestions = questions.filter((question) => question.is_required);
    if (requiredQuestions.length === 0) return 0;

    const completedCount = requiredQuestions.filter((question) =>
      isAnswerFilled(answers[question.id]),
    ).length;

    return Math.round((completedCount / requiredQuestions.length) * 100);
  }, [answers, questions]);

  const shownMessages = messages.length > 0 ? messages : [welcomeMessage];

  function updateAnswer(questionId: number, value: DiagnosticFormValue) {
    setAnswers((current) => ({ ...current, [questionId]: value }));
  }

  function toggleMultipleChoice(
    questionId: number,
    optionValue: AIMentorOptionValue,
  ) {
    setAnswers((current) => {
      const currentValues = Array.isArray(current[questionId])
        ? current[questionId]
        : [];
      const exists = currentValues.some(
        (value) => String(value) === String(optionValue),
      );

      return {
        ...current,
        [questionId]: exists
          ? currentValues.filter(
              (value) => String(value) !== String(optionValue),
            )
          : [...currentValues, optionValue],
      };
    });
  }

  function buildAnswerPayload(): AIMentorDiagnosticAnswerInput[] {
    const payload: AIMentorDiagnosticAnswerInput[] = [];

    for (const question of questions) {
      const value = answers[question.id];
      if (!isAnswerFilled(value)) continue;

      if (
        question.answer_type === "short_text" ||
        question.answer_type === "long_text"
      ) {
        payload.push({
          question_id: question.id,
          answer_text: String(value).trim(),
        });
      } else {
        payload.push({
          question_id: question.id,
          answer_json: value,
        });
      }
    }

    return payload;
  }

  async function generatePlan() {
    if (completedProfile < 100) {
      toast.error("Barcha majburiy diagnostik savollarga javob bering.");
      return;
    }

    setCreatingPlan(true);
    try {
      const session = await createAIMentorDiagnosticSession();
      const completedSession = await submitAIMentorDiagnosticAnswers(
        session.id,
        buildAnswerPayload(),
      );
      const createdPlan = await createAIMentorGeneratedPlan({
        diagnostic_session_id: completedSession.id,
        start_date: formatLocalDate(new Date()),
      });

      setDiagnostic(completedSession);
      setPlanData(createdPlan);

      if (
        chatSession?.status === "active" &&
        chatSession.plan_id !== createdPlan.plan.id
      ) {
        try {
          await updateAIMentorChatSession(chatSession.id, { status: "closed" });
          setChatSession(null);
          setMessages([]);
        } catch (chatError) {
          console.error("Old AI Mentor chat closing error:", chatError);
        }
      }

      if (createdPlan.plan.generation_source === "llm") {
        toast.success("AI siz uchun 4 haftalik shaxsiy reja yaratdi.");
      } else {
        toast.warning(
          "AI xizmati vaqtincha ishlamadi. Reja zaxira algoritm orqali yaratildi.",
        );
      }
    } catch (error) {
      console.error("AI Mentor plan creation error:", error);
      toast.error(
        getApiErrorMessage(error, "Shaxsiy rejani yaratib bo‘lmadi."),
      );
    } finally {
      setCreatingPlan(false);
    }
  }

  async function changeItemStatus(item: AIMentorPlanItem) {
    const nextStatus: AIMentorPlanItemStatus =
      item.status === "completed" ? "pending" : "completed";

    setUpdatingItemId(item.id);
    try {
      await updateAIMentorPlanItemProgress(item.id, nextStatus);
      const refreshedPlan = await getCurrentAIMentorPlan();
      setPlanData(refreshedPlan);
      toast.success(
        nextStatus === "completed"
          ? "Vazifa bajarildi deb belgilandi."
          : "Vazifa qayta ochildi.",
      );
    } catch (error) {
      console.error("AI Mentor progress update error:", error);
      toast.error(
        getApiErrorMessage(error, "Vazifa holatini yangilab bo‘lmadi."),
      );
    } finally {
      setUpdatingItemId(null);
    }
  }

  async function getOrCreateActiveChat() {
    const currentPlanId = planData?.plan.id ?? null;
    if (
      chatSession?.status === "active" &&
      chatSession.plan_id === currentPlanId
    ) {
      return chatSession;
    }

    const created = await createAIMentorChatSession({
      plan_id: currentPlanId,
      title: currentPlanId ? "Reja bo‘yicha yordam" : "AI Mentor bilan suhbat",
      context_json: {},
    });
    setChatSession(created);
    return created;
  }

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = input.trim();
    if (!content || sendingMessage) return;

    setSendingMessage(true);

    let activeChat: AIMentorChatSession | null = null;
    const temporaryBaseId = -Date.now();
    const temporaryUserId = temporaryBaseId;
    const temporaryAssistantId = temporaryBaseId - 1;

    try {
      activeChat = await getOrCreateActiveChat();

      const nextSequenceNumber =
        messages.reduce(
          (maximum, message) => Math.max(maximum, message.sequence_number),
          0,
        ) + 1;
      const now = new Date().toISOString();

      const optimisticUserMessage: AIMentorChatMessage = {
        id: temporaryUserId,
        session_id: activeChat.id,
        sequence_number: nextSequenceNumber,
        role: "user",
        content,
        model_name: null,
        token_count: null,
        metadata_json: { stream_pending: true },
        created_at: now,
      };

      const streamingAssistantMessage: AIMentorChatMessage = {
        id: temporaryAssistantId,
        session_id: activeChat.id,
        sequence_number: nextSequenceNumber + 1,
        role: "assistant",
        content: "",
        model_name: llmStatus?.model ?? null,
        token_count: null,
        metadata_json: { stream_pending: true },
        created_at: now,
      };

      setMessages((current) => [
        ...current,
        optimisticUserMessage,
        streamingAssistantMessage,
      ]);
      setInput("");

      await streamAIMentorChatMessage(activeChat.id, content, {
        onStart: (payload: AIMentorChatStreamStart) => {
          const persistedUserMessage: AIMentorChatMessage = {
            ...payload.user_message,
            model_name: null,
            token_count: null,
            metadata_json: { stream: true },
          };

          setMessages((current) =>
            current.map((message) =>
              message.id === temporaryUserId ? persistedUserMessage : message,
            ),
          );
        },
        onDelta: (delta) => {
          setMessages((current) =>
            current.map((message) =>
              message.id === temporaryAssistantId
                ? { ...message, content: `${message.content}${delta}` }
                : message,
            ),
          );
        },
        onFallback: (payload) => {
          if (payload.replace) {
            setMessages((current) =>
              current.map((message) =>
                message.id === temporaryAssistantId
                  ? { ...message, content: "" }
                  : message,
              ),
            );
          }

          toast.warning(
            "AI xizmatida vaqtinchalik uzilish bo‘ldi. Zaxira javob ko‘rsatilmoqda.",
          );
        },
        onDone: (payload) => {
          setMessages((current) =>
            current.map((message) =>
              message.id === temporaryAssistantId
                ? payload.assistant_message
                : message,
            ),
          );
        },
      });
    } catch (error) {
      console.error("AI Mentor streaming chat error:", error);
      toast.error(getApiErrorMessage(error, "Xabarni yuborib bo‘lmadi."));

      if (activeChat) {
        try {
          const refreshedChat = await getAIMentorChatSession(activeChat.id);
          setChatSession(refreshedChat);
          setMessages(refreshedChat.messages);
        } catch (refreshError) {
          console.error("AI Mentor chat recovery error:", refreshError);
          setMessages((current) =>
            current.filter(
              (message) =>
                message.id !== temporaryUserId &&
                message.id !== temporaryAssistantId,
            ),
          );
        }
      }
    } finally {
      setSendingMessage(false);
    }
  }

  async function startNewChat() {
    setStartingNewChat(true);
    try {
      if (chatSession?.status === "active") {
        await updateAIMentorChatSession(chatSession.id, { status: "closed" });
      }
      setChatSession(null);
      setMessages([]);
      toast.success("Yangi chat boshlandi. Eski tarix backendda saqlanib qoldi.");
    } catch (error) {
      console.error("AI Mentor new chat error:", error);
      toast.error(getApiErrorMessage(error, "Yangi chatni boshlab bo‘lmadi."));
    } finally {
      setStartingNewChat(false);
    }
  }

  if (loading) {
    return <LoadingState title="AI Mentor ma’lumotlari yuklanmoqda..." />;
  }

  if (loadError) {
    return (
      <ErrorState
        title="AI Mentor yuklanmadi"
        description={loadError}
        onRetry={() => void loadMentorData()}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">AI Mentor</h1>
          <Badge variant="secondary">
            {llmStatus?.provider === "mock"
              ? "Sinov AI"
              : llmStatus?.configured
                ? "Haqiqiy AI faol"
                : "AI sozlanmagan"}
          </Badge>
          <Badge variant="outline">Bahoga ta’sir qilmaydi</Badge>
        </div>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
          Diagnostik savollarga javob bering, backendda saqlanadigan 4 haftalik
          shaxsiy reja oling va AI Mentor bilan suhbatlashing.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[430px_minmax(0,1fr)]">
        <Card className="h-fit shadow-sm">
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Sparkles className="h-4 w-4" />
                  Diagnostik savollar
                </CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  Majburiy savollar reja mazmuni va yuklamasini belgilaydi.
                </p>
              </div>
              <Badge variant="outline">{completedProfile}%</Badge>
            </div>
            <Progress value={completedProfile} className="mt-3" />
          </CardHeader>

          <CardContent className="space-y-5">
            {questions.map((question) => {
              const value = answers[question.id];
              const options = getChoiceOptions(question);
              const limits = getNumberLimits(question);

              return (
                <div key={question.id} className="space-y-2">
                  <div className="flex items-start gap-2 text-sm font-medium">
                    <span>{question.question_text}</span>
                    {!question.is_required ? (
                      <Badge variant="outline" className="shrink-0 font-normal">
                        Ixtiyoriy
                      </Badge>
                    ) : null}
                  </div>

                  {question.help_text ? (
                    <p className="text-xs leading-5 text-muted-foreground">
                      {question.help_text}
                    </p>
                  ) : null}

                  {question.answer_type === "single_choice" ? (
                    <select
                      className={selectClass}
                      value={isAnswerFilled(value) ? String(value) : ""}
                      onChange={(event: ChangeEvent<HTMLSelectElement>) => {
                        const option = options.find(
                          (item) => String(item.value) === event.target.value,
                        );
                        updateAnswer(question.id, option?.value ?? event.target.value);
                      }}
                    >
                      <option value="" disabled>
                        Variantni tanlang
                      </option>
                      {options.map((option) => (
                        <option key={String(option.value)} value={String(option.value)}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  ) : null}

                  {question.answer_type === "multiple_choice" ? (
                    <div className="space-y-2 rounded-lg border p-3">
                      {options.map((option) => {
                        const checked =
                          Array.isArray(value) &&
                          value.some(
                            (selected) =>
                              String(selected) === String(option.value),
                          );

                        return (
                          <label
                            key={String(option.value)}
                            className="flex cursor-pointer items-start gap-3 text-sm"
                          >
                            <input
                              type="checkbox"
                              className="mt-0.5 h-4 w-4 rounded border-input"
                              checked={checked}
                              onChange={() =>
                                toggleMultipleChoice(question.id, option.value)
                              }
                            />
                            <span>{option.label}</span>
                          </label>
                        );
                      })}
                    </div>
                  ) : null}

                  {question.answer_type === "number" ? (
                    <Input
                      type="number"
                      min={limits.min}
                      max={limits.max}
                      value={typeof value === "number" ? value : ""}
                      onChange={(event: ChangeEvent<HTMLInputElement>) =>
                        updateAnswer(
                          question.id,
                          event.target.value === ""
                            ? null
                            : Number(event.target.value),
                        )
                      }
                    />
                  ) : null}

                  {question.answer_type === "short_text" ? (
                    <Input
                      value={typeof value === "string" ? value : ""}
                      onChange={(event: ChangeEvent<HTMLInputElement>) =>
                        updateAnswer(question.id, event.target.value)
                      }
                      placeholder="Javobingizni yozing"
                    />
                  ) : null}

                  {question.answer_type === "long_text" ? (
                    <Textarea
                      value={typeof value === "string" ? value : ""}
                      onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
                        updateAnswer(question.id, event.target.value)
                      }
                      placeholder="Batafsil javob yozishingiz mumkin"
                      rows={4}
                    />
                  ) : null}

                  {question.answer_type === "boolean" ? (
                    <select
                      className={selectClass}
                      value={typeof value === "boolean" ? String(value) : ""}
                      onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                        updateAnswer(question.id, event.target.value === "true")
                      }
                    >
                      <option value="" disabled>
                        Javobni tanlang
                      </option>
                      <option value="true">Ha</option>
                      <option value="false">Yo‘q</option>
                    </select>
                  ) : null}
                </div>
              );
            })}

            {diagnostic?.analysis_summary ? (
              <div className="rounded-lg border bg-muted/40 p-3 text-sm leading-6">
                <div className="font-medium">So‘nggi diagnostika xulosasi</div>
                <p className="mt-1 text-muted-foreground">
                  {diagnostic.analysis_summary}
                </p>
              </div>
            ) : null}

            <Button
              type="button"
              className="w-full"
              onClick={() => void generatePlan()}
              disabled={creatingPlan || completedProfile < 100}
            >
              {creatingPlan ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-2 h-4 w-4" />
              )}
              {planData ? "Rejani yangilash" : "4 haftalik reja yaratish"}
            </Button>
            {completedProfile < 100 ? (
              <p className="text-center text-xs text-muted-foreground">
                Reja yaratish uchun barcha majburiy savollarga javob bering.
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <CalendarDays className="h-4 w-4" />
                  Shaxsiy tayyorlanish rejasi
                </CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  Har bir vazifa holati backendda talaba bo‘yicha alohida saqlanadi.
                </p>
              </div>
              {planData ? (
                <Badge variant="secondary">
                  {planData.progress.completed_items}/{planData.progress.total_items}
                  {" "}bajarildi
                </Badge>
              ) : null}
            </div>

            {planData ? (
              <div className="mt-3 space-y-2">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Umumiy progress</span>
                  <span>{planData.progress.progress_percent}%</span>
                </div>
                <Progress value={planData.progress.progress_percent} />
              </div>
            ) : null}
          </CardHeader>

          <CardContent>
            {!planData ? (
              <div className="flex min-h-[420px] flex-col items-center justify-center rounded-xl border border-dashed bg-muted/20 p-8 text-center">
                <BookOpen className="h-10 w-10 text-muted-foreground" />
                <h2 className="mt-4 font-semibold">Hozircha reja yaratilmagan</h2>
                <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                  Chap tomondagi diagnostik savollarga javob berib, 4 haftalik
                  shaxsiy rejangizni yarating.
                </p>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="rounded-xl border bg-muted/30 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-semibold">{planData.plan.title}</h2>
                    <Badge variant="outline">v{planData.plan.version}</Badge>
                    <Badge
                      variant={
                        planData.plan.generation_source === "llm"
                          ? "secondary"
                          : "outline"
                      }
                    >
                      {planData.plan.generation_source === "llm"
                        ? "AI orqali yaratildi"
                        : planData.plan.generation_source === "mock"
                          ? "Zaxira reja"
                          : "Qo‘lda yaratilgan"}
                    </Badge>
                  </div>
                  {planData.plan.summary ? (
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {planData.plan.summary}
                    </p>
                  ) : null}
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  {planData.plan.weeks.map((week) => (
                    <div
                      key={week.id}
                      className="rounded-xl border bg-background p-5 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <Badge>{week.week_number}-hafta</Badge>
                          <h2 className="mt-3 font-semibold">{week.title}</h2>
                          {week.goal ? (
                            <p className="mt-1 text-sm text-muted-foreground">
                              {week.goal}
                            </p>
                          ) : null}
                        </div>
                        <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                      </div>

                      {week.description ? (
                        <p className="mt-4 text-sm leading-6 text-muted-foreground">
                          {week.description}
                        </p>
                      ) : null}

                      <div className="mt-5 space-y-3">
                        {week.items.map((item) => (
                          <div
                            key={item.id}
                            className="rounded-lg border bg-muted/20 p-3"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="font-medium">{item.title}</div>
                                {item.description ? (
                                  <p className="mt-1 text-sm leading-5 text-muted-foreground">
                                    {item.description}
                                  </p>
                                ) : null}
                              </div>
                              <Badge
                                variant={planStatusVariant(item.status)}
                                className="shrink-0"
                              >
                                {planItemStatusLabel(item.status)}
                              </Badge>
                            </div>

                            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                {item.estimated_minutes ? (
                                  <span className="flex items-center gap-1">
                                    <Clock3 className="h-3.5 w-3.5" />
                                    {item.estimated_minutes} daqiqa
                                  </span>
                                ) : null}
                                {item.activity_type ? (
                                  <Badge variant="outline" className="font-normal">
                                    {item.activity_type}
                                  </Badge>
                                ) : null}
                              </div>

                              <Button
                                type="button"
                                size="sm"
                                variant={
                                  item.status === "completed"
                                    ? "secondary"
                                    : "outline"
                                }
                                disabled={updatingItemId === item.id}
                                onClick={() => void changeItemStatus(item)}
                              >
                                {updatingItemId === item.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : item.status === "completed" ? (
                                  <RotateCcw className="h-4 w-4" />
                                ) : (
                                  <CheckCircle2 className="h-4 w-4" />
                                )}
                                {item.status === "completed"
                                  ? "Qayta ochish"
                                  : "Bajarildi"}
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>

                      {week.expected_outcome ? (
                        <div className="mt-4 rounded-lg bg-muted/50 p-3 text-sm">
                          <div className="font-medium">Kutiladigan natija</div>
                          <p className="mt-1 leading-5 text-muted-foreground">
                            {week.expected_outcome}
                          </p>
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="overflow-hidden shadow-sm">
        <CardHeader className="gap-3 border-b bg-muted/20 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Bot className="h-5 w-5" />
              AI Mentor bilan chat
            </CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Xabarlar backendda saqlanadi. AI javobi real vaqtda bosqichma-bosqich
              ko‘rsatiladi; xizmat vaqtincha ishlamasa zaxira javob qo‘llanadi.
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={startingNewChat || sendingMessage}
            onClick={() => void startNewChat()}
          >
            {startingNewChat ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <MessageSquarePlus className="h-4 w-4" />
            )}
            Yangi chat
          </Button>
        </CardHeader>

        <CardContent className="p-0">
          <div className="max-h-[520px] min-h-[360px] space-y-4 overflow-y-auto p-4 sm:p-6">
            {shownMessages.map((message) => {
              const isStudent = message.role === "user";
              return (
                <div
                  key={`${message.session_id}-${message.id}`}
                  className={`flex gap-3 ${
                    isStudent ? "justify-end" : "justify-start"
                  }`}
                >
                  {!isStudent ? (
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <Bot className="h-4 w-4" />
                    </div>
                  ) : null}
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-6 sm:max-w-[75%] ${
                      isStudent
                        ? "rounded-br-md bg-primary text-primary-foreground"
                        : "rounded-bl-md border bg-background"
                    }`}
                  >
                    {!isStudent &&
                    message.metadata_json?.stream_pending === true &&
                    !message.content ? (
                      <span className="inline-flex items-center gap-2 text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        AI javob yozmoqda...
                      </span>
                    ) : (
                      <>
                        {isStudent ? (
                          <div className="whitespace-pre-wrap">{message.content}</div>
                        ) : (
                          <div>
                            <MarkdownMessage content={message.content} />
                            {message.metadata_json?.stream_pending === true ? (
                              <span
                                className="mt-1 inline-block h-4 w-1 animate-pulse bg-current align-middle"
                                aria-hidden="true"
                              />
                            ) : null}
                          </div>
                        )}
                        {!isStudent ? <RagSources message={message} /> : null}
                      </>
                    )}
                  </div>
                  {isStudent ? (
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted">
                      <User className="h-4 w-4" />
                    </div>
                  ) : null}
                </div>
              );
            })}
            <div ref={chatEndRef} aria-hidden="true" />
          </div>

          <form
            onSubmit={(event: FormEvent<HTMLFormElement>) => void sendMessage(event)}
            className="flex gap-2 border-t bg-background p-4 sm:p-5"
          >
            <Input
              value={input}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                setInput(event.target.value)
              }
              placeholder="Masalan: Bugungi rejamdagi vazifani qanday boshlayman?"
              autoComplete="off"
              disabled={sendingMessage}
            />
            <Button type="submit" disabled={!input.trim() || sendingMessage}>
              {sendingMessage ? (
                <Loader2 className="h-4 w-4 animate-spin sm:mr-2" />
              ) : (
                <Send className="h-4 w-4 sm:mr-2" />
              )}
              <span className="hidden sm:inline">Yuborish</span>
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
