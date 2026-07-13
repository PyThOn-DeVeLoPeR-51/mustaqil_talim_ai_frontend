"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { BookOpen, Bot, CalendarDays, CheckCircle2, RotateCcw, Send, Sparkles, User } from "lucide-react";
import { toast } from "sonner";

import { getStudentMe } from "@/api/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { getStudentToken } from "@/lib/api";

type DiagnosticAnswers = {
  level: string;
  weeklyHours: string;
  difficultTopic: string;
  goal: string;
  learningStyle: string;
};

type WeeklyPlan = {
  week: number;
  title: string;
  topics: string[];
  activities: string[];
  expectedResult: string;
};

type ChatMessage = {
  id: number;
  role: "student" | "mentor";
  content: string;
};

const LEGACY_STORAGE_KEYS = [
  "ai_mentor_monthly_plan_v1",
  "ai_mentor_diagnostic_answers_v1",
  "ai_mentor_chat_v1",
];

type MentorStorageKeys = {
  plan: string;
  answers: string;
  chat: string;
};

function getMentorStorageKeys(studentId: number): MentorStorageKeys {
  const prefix = `ai_mentor_student_${studentId}_v2`;
  return {
    plan: `${prefix}_monthly_plan`,
    answers: `${prefix}_diagnostic_answers`,
    chat: `${prefix}_chat`,
  };
}

const initialAnswers: DiagnosticAnswers = {
  level: "",
  weeklyHours: "",
  difficultTopic: "",
  goal: "",
  learningStyle: "",
};

const initialMessages: ChatMessage[] = [
  {
    id: 1,
    role: "mentor",
    content:
      "Assalomu alaykum! Men AI Mentorman. Hozir frontend demo rejimida ishlayapman. Chizmachilik, mustaqil ta’lim rejasi yoki topshiriqlar bo‘yicha savolingizni yozishingiz mumkin.",
  },
];

function readStoredJson<T>(key: string): T | null {
  const raw = window.localStorage.getItem(key);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as T;
  } catch (error) {
    console.error(`AI Mentor local data parse error (${key}):`, error);
    window.localStorage.removeItem(key);
    return null;
  }
}

function buildPlan(answers: DiagnosticAnswers): WeeklyPlan[] {
  const hours = Number(answers.weeklyHours) || 5;
  const workload = hours <= 3 ? "yengil" : hours <= 6 ? "o‘rtacha" : "intensiv";
  const difficultTopic = answers.difficultTopic.trim() || "Proyeksion chizmachilik";
  const goal = answers.goal.trim() || "Chizmachilik bo‘yicha bilimlarni mustahkamlash";

  return [
    {
      week: 1,
      title: "Diagnostika va nazariy poydevor",
      topics: ["Chizma standartlari va formatlar", "Chiziq turlari", difficultTopic],
      activities: [
        `${workload} tartibda ${Math.max(2, Math.round(hours * 0.45))} soat nazariy material o‘rganish`,
        "Ikki namunaviy chizmani tahlil qilish",
        "Asosiy tushunchalar bo‘yicha qisqa konspekt tuzish",
      ],
      expectedResult: "Asosiy standartlar, chiziqlar va tanlangan murakkab mavzu bo‘yicha tayanch tushunchalar shakllanadi.",
    },
    {
      week: 2,
      title: "Proyeksiyalar va amaliy mashqlar",
      topics: ["Uch asosiy proyeksiya", "Ko‘rinishlar o‘rtasidagi bog‘lanish", "Geometrik shakllarni tahlil qilish"],
      activities: [
        "Kamida uchta sodda detalning proyeksiyalarini bajarish",
        "Har bir chizmani etalon bilan solishtirish",
        answers.learningStyle === "video" ? "Mavzu bo‘yicha video darsni ko‘rib, qisqa qayd yozish" : "Bosqichma-bosqich amaliy mashq bajarish",
      ],
      expectedResult: "Talaba frontal, gorizontal va profil proyeksiyalarni o‘zaro mos holda joylashtira oladi.",
    },
    {
      week: 3,
      title: "O‘lchamlar va murakkab elementlar",
      topics: ["O‘lcham qo‘yish qoidalari", "Qirqim va kesim", "Shtrixovka", "Tipik xatolar"],
      activities: [
        "Ikki o‘rta murakkablikdagi chizmaga o‘lcham qo‘yish",
        "Qirqim yoki kesim qatnashgan bitta topshiriq bajarish",
        "Xatolar ro‘yxatini tuzib, ularni mustaqil tuzatish",
      ],
      expectedResult: "O‘lchamlar, qirqim va shtrixovka standart talablar asosida bajariladi.",
    },
    {
      week: 4,
      title: "Mustaqil loyiha va yakuniy nazorat",
      topics: ["Kompleks chizma", "O‘z-o‘zini baholash", "Rubrika asosida tekshiruv"],
      activities: [
        `“${goal}” maqsadiga mos yakuniy chizma bajarish`,
        "Chizmani rubrika bo‘yicha mustaqil tekshirish",
        "Kamchiliklarni tuzatib, yakuniy variantni topshirish",
      ],
      expectedResult: "Talaba kompleks chizmani mustaqil bajaradi, xatolarini aniqlaydi va tuzatadi.",
    },
  ];
}

function mentorReply(question: string) {
  const text = question.toLocaleLowerCase("uz-UZ");

  if (text.includes("proyeksiya") || text.includes("ko‘rinish") || text.includes("korinish")) {
    return "Proyeksiyalarni bajarishda avval frontal ko‘rinishni asosiy deb oling. Keyin gorizontal va profil ko‘rinishdagi har bir nuqtani proyeksion bog‘lanish chiziqlari orqali moslashtiring. Eng ko‘p uchraydigan xato — ko‘rinishlar orasidagi o‘lcham va elementlar mos kelmasligidir.";
  }
  if (text.includes("o‘lcham") || text.includes("olcham")) {
    return "O‘lcham qo‘yishda bir xil o‘lchamni takrorlamang, o‘lcham chiziqlarini kontur chiziqlari bilan ustma-ust tushirmang va detalni yasash uchun zarur barcha o‘lchamlarni bering. Avval umumiy o‘lchamlar, keyin elementlarning joylashuvi va shakl o‘lchamlarini tekshirish foydali.";
  }
  if (text.includes("qirqim") || text.includes("kesim")) {
    return "Qirqim buyumning ichki tuzilishini ko‘rsatadi, kesim esa kesuvchi tekislikda hosil bo‘lgan shaklning o‘zini ifodalaydi. Shtrixovka bir xil yo‘nalish va oraliqda bajarilishi, qo‘shni detallar esa boshqa yo‘nalishda ajratilishi kerak.";
  }
  if (text.includes("reja") || text.includes("hafta")) {
    return "Sizning bir oylik rejangiz yuqorida haftalarga ajratilgan. Har hafta yakunida bajarilgan mashqlarni belgilab, xatolar ro‘yxatini tuzing. Keyinchalik haqiqiy LLM va backend ulanganda reja natijalaringizga qarab avtomatik yangilanadi.";
  }
  if (text.includes("salom") || text.includes("assalom")) {
    return "Assalomu alaykum! Savolingizni yozing. Men mavzuni sodda tushuntirishga, mashq tartibini tuzishga va xatolarni topishga yo‘naltiraman.";
  }

  return "Savolingizni tushundim. Hozir bu sahifa frontend demo rejimida, shu sabab javoblar cheklangan qoidalar asosida shakllanmoqda. Haqiqiy LLM va bilimlar bazasi ulanganda men savolingiz kontekstini, shaxsiy rejangizni va o‘quv materiallarini hisobga olib batafsil javob beraman.";
}

const selectClass = "h-10 w-full rounded-md border bg-background px-3 text-sm outline-none transition focus:ring-2 focus:ring-ring";

export default function MentorPage() {
  const [answers, setAnswers] = useState<DiagnosticAnswers>(initialAnswers);
  const [plan, setPlan] = useState<WeeklyPlan[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState("");
  const [studentId, setStudentId] = useState<number | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadStudentMentorData() {
      const token = getStudentToken();
      if (!token) return;

      try {
        const student = await getStudentMe(token);
        if (cancelled) return;

        const keys = getMentorStorageKeys(student.id);
        const savedAnswers = readStoredJson<DiagnosticAnswers>(keys.answers);
        const savedPlan = readStoredJson<WeeklyPlan[]>(keys.plan);
        const savedChat = readStoredJson<ChatMessage[]>(keys.chat);

        setStudentId(student.id);
        setAnswers(savedAnswers ?? initialAnswers);
        setPlan(Array.isArray(savedPlan) ? savedPlan : []);
        setMessages(Array.isArray(savedChat) && savedChat.length > 0 ? savedChat : initialMessages);

        // Old shared keys caused one student's plan to appear for another student.
        // They are intentionally removed instead of migrated to an unknown account.
        LEGACY_STORAGE_KEYS.forEach((key) => window.localStorage.removeItem(key));
        setHydrated(true);
      } catch (error) {
        console.error("AI Mentor student data loading error:", error);
        if (!cancelled) {
          setAnswers(initialAnswers);
          setPlan([]);
          setMessages(initialMessages);
          setHydrated(true);
          toast.error("Talaba ma’lumotlarini yuklab bo‘lmadi. Sahifani yangilang.");
        }
      }
    }

    void loadStudentMentorData();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hydrated || studentId === null) return;
    const keys = getMentorStorageKeys(studentId);
    window.localStorage.setItem(keys.answers, JSON.stringify(answers));
  }, [answers, hydrated, studentId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  const completedProfile = useMemo(() => {
    const values = Object.values(answers);
    return Math.round((values.filter((value) => value.trim().length > 0).length / values.length) * 100);
  }, [answers]);

  function updateAnswer(field: keyof DiagnosticAnswers, value: string) {
    setAnswers((current) => ({ ...current, [field]: value }));
  }

  function generatePlan() {
    if (studentId === null) {
      toast.error("Talaba profili hali yuklanmadi. Birozdan so‘ng qayta urinib ko‘ring.");
      return;
    }

    const generated = buildPlan(answers);
    const keys = getMentorStorageKeys(studentId);
    setPlan(generated);
    window.localStorage.setItem(keys.plan, JSON.stringify(generated));
    toast.success("Bir oylik mustaqil tayyorlanish rejasi yaratildi.");
  }

  function clearPlan() {
    if (studentId === null) return;
    const keys = getMentorStorageKeys(studentId);
    setPlan([]);
    window.localStorage.removeItem(keys.plan);
    toast.success("Reja tozalandi.");
  }

  function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const question = input.trim();
    if (!question) return;

    const now = Date.now();
    const nextMessages: ChatMessage[] = [
      ...messages,
      { id: now, role: "student", content: question },
      { id: now + 1, role: "mentor", content: mentorReply(question) },
    ];
    setMessages(nextMessages);
    setInput("");
    if (studentId !== null) {
      const keys = getMentorStorageKeys(studentId);
      window.localStorage.setItem(keys.chat, JSON.stringify(nextMessages));
    }
  }

  function clearChat() {
    setMessages(initialMessages);
    if (studentId !== null) {
      const keys = getMentorStorageKeys(studentId);
      window.localStorage.removeItem(keys.chat);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">AI Mentor</h1>
          <Badge variant="secondary">Frontend demo</Badge>
          <Badge variant="outline">Bahoga ta’sir qilmaydi</Badge>
        </div>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
          Diagnostik savollarga javob bering, bir oylik shaxsiy reja oling va pastdagi chat orqali o‘quv savollaringizni bering.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
        <Card className="h-fit shadow-sm">
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Sparkles className="h-4 w-4" />
                  Diagnostik savollar
                </CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">Reja talabaning bilim darajasi va imkoniyatiga moslashadi.</p>
              </div>
              <Badge variant="outline">{completedProfile}%</Badge>
            </div>
            <Progress value={completedProfile} className="mt-3" />
          </CardHeader>
          <CardContent className="space-y-5">
            <label className="block space-y-2 text-sm font-medium">
              <span>Hozirgi bilim darajangiz</span>
              <select className={selectClass} value={answers.level} onChange={(event) => updateAnswer("level", event.target.value)}>
                <option value="" disabled>Darajani tanlang</option>
                <option value="beginner">Boshlang‘ich</option>
                <option value="intermediate">O‘rta</option>
                <option value="advanced">Yuqori</option>
              </select>
            </label>

            <label className="block space-y-2 text-sm font-medium">
              <span>Haftasiga ajratiladigan vaqt</span>
              <select className={selectClass} value={answers.weeklyHours} onChange={(event) => updateAnswer("weeklyHours", event.target.value)}>
                <option value="" disabled>Vaqtni tanlang</option>
                <option value="3">3 soatgacha</option>
                <option value="5">4–6 soat</option>
                <option value="8">7–9 soat</option>
                <option value="10">10 soat va undan ko‘p</option>
              </select>
            </label>

            <label className="block space-y-2 text-sm font-medium">
              <span>Eng qiyin mavzu</span>
              <Input value={answers.difficultTopic} onChange={(event) => updateAnswer("difficultTopic", event.target.value)} placeholder="Masalan: qirqim va kesim" />
            </label>

            <label className="block space-y-2 text-sm font-medium">
              <span>Bir oylik maqsad</span>
              <Textarea value={answers.goal} onChange={(event) => updateAnswer("goal", event.target.value)} placeholder="Nimaga erishmoqchisiz?" rows={4} />
            </label>

            <label className="block space-y-2 text-sm font-medium">
              <span>Qulay o‘rganish usuli</span>
              <select className={selectClass} value={answers.learningStyle} onChange={(event) => updateAnswer("learningStyle", event.target.value)}>
                <option value="" disabled>Usulni tanlang</option>
                <option value="practice">Amaliy mashqlar</option>
                <option value="video">Video va ko‘rgazmali material</option>
                <option value="reading">Matn va konspekt</option>
                <option value="mixed">Aralash usul</option>
              </select>
            </label>

            <Button type="button" className="w-full" onClick={generatePlan} disabled={!hydrated || studentId === null || completedProfile < 100}>
              <Sparkles className="mr-2 h-4 w-4" />
              Bir oylik reja yaratish
            </Button>
            {completedProfile < 100 ? (
              <p className="text-center text-xs text-muted-foreground">Reja yaratish uchun barcha savollarga javob bering.</p>
            ) : null}
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <CalendarDays className="h-4 w-4" />
                Shaxsiy tayyorlanish rejasi
              </CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">To‘rt haftalik maqsad, mavzu, faoliyat va kutiladigan natijalar.</p>
            </div>
            {plan.length ? (
              <Button type="button" size="sm" variant="outline" onClick={clearPlan}>
                <RotateCcw className="mr-2 h-4 w-4" />
                Qayta boshlash
              </Button>
            ) : null}
          </CardHeader>
          <CardContent>
            {plan.length === 0 ? (
              <div className="flex min-h-[420px] flex-col items-center justify-center rounded-xl border border-dashed bg-muted/20 p-8 text-center">
                <BookOpen className="h-10 w-10 text-muted-foreground" />
                <h2 className="mt-4 font-semibold">Hozircha reja yaratilmagan</h2>
                <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                  Chap tomondagi diagnostik savollarni to‘ldirib, “Bir oylik reja yaratish” tugmasini bosing.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 lg:grid-cols-2">
                {plan.map((item) => (
                  <div key={item.week} className="rounded-xl border bg-background p-5 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <Badge>{item.week}-hafta</Badge>
                        <h2 className="mt-3 font-semibold">{item.title}</h2>
                      </div>
                      <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    </div>

                    <div className="mt-5 space-y-4 text-sm">
                      <div>
                        <div className="font-medium">O‘rganiladigan mavzular</div>
                        <ul className="mt-2 space-y-1.5 text-muted-foreground">
                          {item.topics.map((topic) => <li key={topic}>• {topic}</li>)}
                        </ul>
                      </div>
                      <div>
                        <div className="font-medium">Bajariladigan ishlar</div>
                        <ul className="mt-2 space-y-1.5 text-muted-foreground">
                          {item.activities.map((activity) => <li key={activity}>• {activity}</li>)}
                        </ul>
                      </div>
                      <div className="rounded-lg bg-muted/50 p-3">
                        <div className="font-medium">Kutiladigan natija</div>
                        <p className="mt-1 text-muted-foreground">{item.expectedResult}</p>
                      </div>
                    </div>
                  </div>
                ))}
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
            <p className="mt-1 text-sm text-muted-foreground">Savol-javoblar bahoga ta’sir qilmaydi. Hozir javoblar frontend demo qoidalari asosida ishlaydi.</p>
          </div>
          <Button type="button" size="sm" variant="outline" onClick={clearChat}>Chatni tozalash</Button>
        </CardHeader>

        <CardContent className="p-0">
          <div className="max-h-[520px] min-h-[360px] space-y-4 overflow-y-auto p-4 sm:p-6">
            {messages.map((message) => (
              <div key={message.id} className={`flex gap-3 ${message.role === "student" ? "justify-end" : "justify-start"}`}>
                {message.role === "mentor" ? (
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Bot className="h-4 w-4" />
                  </div>
                ) : null}
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-6 sm:max-w-[75%] ${
                    message.role === "student"
                      ? "rounded-br-md bg-primary text-primary-foreground"
                      : "rounded-bl-md border bg-background"
                  }`}
                >
                  {message.content}
                </div>
                {message.role === "student" ? (
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted">
                    <User className="h-4 w-4" />
                  </div>
                ) : null}
              </div>
            ))}
            <div ref={chatEndRef} aria-hidden="true" />
          </div>

          <form onSubmit={sendMessage} className="flex gap-2 border-t bg-background p-4 sm:p-5">
            <Input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Masalan: Uchta proyeksiyani qanday to‘g‘ri joylashtiraman?"
              autoComplete="off"
            />
            <Button type="submit" disabled={!input.trim()}>
              <Send className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Yuborish</span>
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
