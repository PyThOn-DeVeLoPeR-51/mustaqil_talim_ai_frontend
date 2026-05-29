"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertCircle, CheckCircle2, ClipboardList, RefreshCw, Send, Users } from "lucide-react";

import { getTeacherResults } from "@/api/results";
import { getStudents } from "@/api/students";
import { getTeacherTasks } from "@/api/tasks";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type StudentRow = {
  id: number;
  full_name?: string | null;
  fio?: string | null;
  login?: string | null;
  is_active?: boolean;
};

type TaskRow = {
  id: number;
  title: string;
  mode: "etalon" | "optional" | string;
  is_active?: boolean;
  assigned_student_ids?: number[];
  created_at?: string;
};

type ResultRow = {
  id: number;
  task_id: number;
  task_title?: string | null;
  student_id: number;
  student_full_name?: string | null;
  attempt_number: number;
  mode: "etalon" | "optional" | string;
  total_score?: number | null;
  status: "pending" | "evaluated" | "failed" | string;
  created_at: string;
};

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("uz-UZ", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function calcAverageScore(results: ResultRow[]) {
  const scores = results
    .filter((item) => item.status === "evaluated" && typeof item.total_score === "number")
    .map((item) => Number(item.total_score));

  if (!scores.length) return 0;

  return Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);
}

function groupBestByStudentTask(results: ResultRow[]) {
  const map = new Map<string, ResultRow[]>();

  for (const item of results) {
    const key = `${item.student_id}-${item.task_id}`;
    const rows = map.get(key) || [];
    rows.push(item);
    map.set(key, rows);
  }

  return [...map.values()].map((rows) => {
    const evaluated = rows.filter((row) => row.status === "evaluated" && typeof row.total_score === "number");
    const best = evaluated.length
      ? evaluated.reduce((a, b) => Number(a.total_score) >= Number(b.total_score) ? a : b)
      : rows[0];

    return {
      key: `${rows[0].student_id}-${rows[0].task_id}`,
      rows,
      best,
      attempts: rows.length,
      bestScore: typeof best.total_score === "number" ? best.total_score : null,
    };
  });
}

function StatCard({
  title,
  value,
  hint,
  icon,
  href,
}: {
  title: string;
  value: string | number;
  hint: string;
  icon: React.ReactNode;
  href: string;
}) {
  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className="text-muted-foreground">{icon}</div>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="text-3xl font-semibold tracking-tight">{value}</div>
        <div className="text-xs text-muted-foreground">{hint}</div>
        <Button asChild size="sm" variant="outline" className="mt-2">
          <Link href={href}>Ko‘rish</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "evaluated") return <Badge>Baholandi</Badge>;
  if (status === "failed") return <Badge variant="destructive">Xatolik</Badge>;
  return <Badge variant="secondary">Kutilmoqda</Badge>;
}

export default function DashboardPage() {
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [results, setResults] = useState<ResultRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadDashboard() {
    try {
      setLoading(true);
      setError("");

      const [studentsData, tasksData, resultsData] = await Promise.all([
        getStudents(),
        getTeacherTasks(),
        getTeacherResults(),
      ]);

      setStudents(studentsData || []);
      setTasks(tasksData || []);
      setResults(resultsData || []);
    } catch (err) {
      console.error("Dashboard load error:", err);
      setError("Dashboard ma’lumotlarini yuklashda xatolik yuz berdi.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  const stats = useMemo(() => {
    const evaluated = results.filter((item) => item.status === "evaluated");
    const failed = results.filter((item) => item.status === "failed");
    const pending = results.filter((item) => item.status === "pending");
    const avgScore = calcAverageScore(results);
    const grouped = groupBestByStudentTask(results);
    const completedTaskPairs = grouped.filter((item) => item.bestScore !== null).length;

    return {
      studentsCount: students.length,
      activeStudents: students.filter((item) => item.is_active !== false).length,
      tasksCount: tasks.length,
      etalonTasks: tasks.filter((item) => item.mode === "etalon").length,
      optionalTasks: tasks.filter((item) => item.mode === "optional").length,
      totalAttempts: results.length,
      evaluatedCount: evaluated.length,
      failedCount: failed.length,
      pendingCount: pending.length,
      avgScore,
      completedTaskPairs,
    };
  }, [students, tasks, results]);

  const latestResults = useMemo(() => {
    return [...results]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 8);
  }, [results]);

  const bestByStudentTask = useMemo(() => {
    return groupBestByStudentTask(results)
      .sort((a, b) => {
        const dateA = new Date(a.best.created_at).getTime();
        const dateB = new Date(b.best.created_at).getTime();
        return dateB - dateA;
      })
      .slice(0, 6);
  }, [results]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Dashboard</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Backend bilan ulangan real statistika: talabalar, topshiriqlar, urinishlar va AI natijalari.
          </p>
        </div>

        <Button onClick={loadDashboard} disabled={loading} variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" />
          {loading ? "Yuklanmoqda..." : "Yangilash"}
        </Button>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50 text-red-700">
          <CardContent className="flex items-center gap-2 p-4 text-sm">
            <AlertCircle className="h-4 w-4" />
            {error}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Jami talabalar"
          value={stats.studentsCount}
          hint={`Faol: ${stats.activeStudents}`}
          href="/students"
          icon={<Users className="h-4 w-4" />}
        />
        <StatCard
          title="Topshiriqlar"
          value={stats.tasksCount}
          hint={`Etalon: ${stats.etalonTasks} • Ixtiyoriy: ${stats.optionalTasks}`}
          href="/tasks"
          icon={<ClipboardList className="h-4 w-4" />}
        />
        <StatCard
          title="AI baholangan"
          value={stats.evaluatedCount}
          hint={`Kutilmoqda: ${stats.pendingCount} • Xatolik: ${stats.failedCount}`}
          href="/submissions"
          icon={<CheckCircle2 className="h-4 w-4" />}
        />
        <StatCard
          title="O‘rtacha ball"
          value={`${stats.avgScore}/100`}
          hint={`Jami urinishlar: ${stats.totalAttempts}`}
          href="/submissions"
          icon={<Send className="h-4 w-4" />}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="shadow-sm xl:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Oxirgi AI natijalar</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">Talabalar yuborgan eng oxirgi urinishlar.</p>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/submissions">Hammasi</Link>
            </Button>
          </CardHeader>

          <CardContent>
            {loading ? (
              <div className="rounded-xl border bg-muted/20 p-6 text-sm text-muted-foreground">Yuklanmoqda...</div>
            ) : latestResults.length === 0 ? (
              <div className="rounded-xl border bg-muted/20 p-6 text-sm text-muted-foreground">
                Hozircha natija yo‘q. Student chizma yuklagandan keyin bu yerda ko‘rinadi.
              </div>
            ) : (
              <div className="space-y-3">
                {latestResults.map((item) => (
                  <div key={item.id} className="flex flex-col gap-3 rounded-xl border bg-background p-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0">
                      <div className="truncate font-medium">
                        {item.student_full_name || `Student #${item.student_id}`} <span className="text-muted-foreground">—</span>{" "}
                        {item.task_title || `Task #${item.task_id}`}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        Urinish: {item.attempt_number}/2 • Sana: {formatDate(item.created_at)}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline">{item.mode === "etalon" ? "Etalon" : "Ixtiyoriy"}</Badge>
                      <StatusBadge status={item.status} />
                      <Badge variant="secondary">{typeof item.total_score === "number" ? `${Math.round(item.total_score)}/100` : "—/100"}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Tezkor amallar</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">Asosiy bo‘limlarga tez o‘tish.</p>
          </CardHeader>
          <CardContent className="grid gap-2">
            <Button asChild>
              <Link href="/students">Talaba qo‘shish</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/tasks">Topshiriq yaratish</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/submissions">Natijalarni ko‘rish</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Talaba + topshiriq kesimida eng yaxshi natijalar</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Har bir talabaning bir topshiriq bo‘yicha eng yaxshi urinish balli.
            </p>
          </div>
          <Badge variant="secondary">Tugallangan: {stats.completedTaskPairs}</Badge>
        </CardHeader>

        <CardContent>
          {bestByStudentTask.length === 0 ? (
            <div className="rounded-xl border bg-muted/20 p-6 text-sm text-muted-foreground">Hali baholangan natija yo‘q.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="px-3 py-3 font-medium">Talaba</th>
                    <th className="px-3 py-3 font-medium">Topshiriq</th>
                    <th className="px-3 py-3 font-medium">Rejim</th>
                    <th className="px-3 py-3 font-medium">Urinishlar</th>
                    <th className="px-3 py-3 font-medium">Eng yaxshi ball</th>
                    <th className="px-3 py-3 font-medium">Oxirgi sana</th>
                  </tr>
                </thead>
                <tbody>
                  {bestByStudentTask.map((item) => (
                    <tr key={item.key} className="border-b last:border-0">
                      <td className="px-3 py-3 font-medium">{item.best.student_full_name || `Student #${item.best.student_id}`}</td>
                      <td className="px-3 py-3">{item.best.task_title || `Task #${item.best.task_id}`}</td>
                      <td className="px-3 py-3">
                        <Badge variant="outline">{item.best.mode === "etalon" ? "Etalon" : "Ixtiyoriy"}</Badge>
                      </td>
                      <td className="px-3 py-3">{item.attempts}/2</td>
                      <td className="px-3 py-3 font-semibold">{item.bestScore !== null ? `${Math.round(item.bestScore)}/100` : "—/100"}</td>
                      <td className="px-3 py-3 text-muted-foreground">{formatDate(item.best.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
