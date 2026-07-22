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
  Clock3,
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
  createAIMentorMockPlan,
  getAIMentorChatSession,
  getAIMentorChatSessions,
  getAIMentorDiagnosticQuestions,
  getAIMentorDiagnosticSession,
  getAIMentorDiagnosticSessions,
  getCurrentAIMentorPlan,
  sendAIMentorChatMessage,
  submitAIMentorDiagnosticAnswers,
  updateAIMentorChatSession,
  updateAIMentorPlanItemProgress,
} from "@/api/ai-mentor";
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
  AIMentorChoiceOption,
  AIMentorDiagnosticAnswerInput,
  AIMentorDiagnosticQuestion,
  AIMentorDiagnosticSessionDetail,
  AIMentorOptionValue,
  AIMentorPlanDetailResponse,
  AIMentorPlanItem,
  AIMentorPlanItemStatus,
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

export default function MentorPage() {
  const [questions, setQuestions] = useState<AIMentorDiagnosticQuestion[]>([]);
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
      const [questionRows, diagnosticSessions, currentPlan, chatSessions] =
        await Promise.all([
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
      const createdPlan = await createAIMentorMockPlan({
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

      toast.success("4 haftalik shaxsiy reja backendda yaratildi.");
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
    try {
      const activeChat = await getOrCreateActiveChat();
      const response = await sendAIMentorChatMessage(activeChat.id, content);

      setChatSession(response.session);
      setMessages((current) => [
        ...current,
        response.user_message,
        response.assistant_message,
      ]);
      setInput("");
    } catch (error) {
      console.error("AI Mentor chat error:", error);
      toast.error(getApiErrorMessage(error, "Xabarni yuborib bo‘lmadi."));
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
          <Badge variant="secondary">Backend mock AI</Badge>
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
                    <Badge variant="outline">
                      {planData.plan.generation_source === "mock"
                        ? "Mock AI"
                        : planData.plan.generation_source}
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
              Xabarlar backendda saqlanadi. Hozir javoblarni mock AI modeli
              yaratmoqda.
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={startingNewChat}
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
                    className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-6 sm:max-w-[75%] ${
                      isStudent
                        ? "rounded-br-md bg-primary text-primary-foreground"
                        : "rounded-bl-md border bg-background"
                    }`}
                  >
                    {message.content}
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
