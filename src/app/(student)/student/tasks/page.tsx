"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { getStudentResults } from "@/api/results";
import { getStudentTasks } from "@/api/tasks";
import { PageHeader } from "@/components/shell/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import type { ResultRead, TaskRead } from "@/types/api";

function modeLabel(mode: string) {
  return mode === "etalon" ? "Etalon" : "Ixtiyoriy";
}

function statusLabel(status?: string) {
  if (status === "evaluated") return "Baholandi";
  if (status === "failed") return "Xatolik";
  if (status === "pending") return "Kutilmoqda";
  return "Boshlanmagan";
}

function scoreText(score?: number | null) {
  return typeof score === "number" ? `${Math.round(score)}/100` : "—/100";
}

function bestScore(results: ResultRead[]) {
  const scores = results
    .map((item) => item.total_score)
    .filter((score): score is number => typeof score === "number");

  if (!scores.length) return null;
  return Math.max(...scores);
}

function latestResult(results: ResultRead[]) {
  if (!results.length) return null;
  return [...results].sort((a, b) => b.attempt_number - a.attempt_number)[0];
}

function deadlineText(deadline?: string | null) {
  if (!deadline) return "Muddat belgilanmagan";

  try {
    return new Date(deadline).toLocaleString("uz-UZ", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return deadline;
  }
}

export default function StudentTasksPage() {
  const [tasks, setTasks] = useState<TaskRead[]>([]);
  const [results, setResults] = useState<ResultRead[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  async function loadData() {
    try {
      setLoading(true);
      const [taskRows, resultRows] = await Promise.all([
        getStudentTasks(),
        getStudentResults(),
      ]);
      setTasks(taskRows);
      setResults(resultRows);
    } catch (error) {
      console.error(error);
      toast.error("Topshiriqlarni yuklashda xatolik");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const resultsByTask = useMemo(() => {
    const grouped = new Map<number, ResultRead[]>();

    for (const result of results) {
      const current = grouped.get(result.task_id) ?? [];
      current.push(result);
      grouped.set(result.task_id, current);
    }

    return grouped;
  }, [results]);

  const filteredTasks = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return tasks;

    return tasks.filter((task) => {
      return (
        task.title.toLowerCase().includes(q) ||
        (task.description ?? "").toLowerCase().includes(q) ||
        String(task.id).includes(q)
      );
    });
  }, [tasks, query]);

  const evaluatedAttempts = results.filter((item) => item.status === "evaluated");
  const completedTasks = tasks.filter((task) => (resultsByTask.get(task.id)?.length ?? 0) >= 2).length;
  const allScores = evaluatedAttempts
    .map((item) => item.total_score)
    .filter((score): score is number => typeof score === "number");
  const avgScore = allScores.length
    ? Math.round(allScores.reduce((sum, score) => sum + score, 0) / allScores.length)
    : null;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Topshiriqlar"
        subtitle="Har bir topshiriq bo‘yicha maksimal 2 ta urinish. Chizma yuklangach AI avtomatik baholaydi."
        right={
          <Button variant="outline" onClick={loadData} disabled={loading}>
            Yangilash
          </Button>
        }
      />

      <div className="grid gap-3 md:grid-cols-4">
        <Card>
          <CardContent className="pt-5">
            <div className="text-xs text-muted-foreground">Biriktirilgan topshiriqlar</div>
            <div className="mt-1 text-2xl font-bold">{tasks.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="text-xs text-muted-foreground">Yuborilgan urinishlar</div>
            <div className="mt-1 text-2xl font-bold">{results.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="text-xs text-muted-foreground">Tugallangan topshiriqlar</div>
            <div className="mt-1 text-2xl font-bold">{completedTasks}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="text-xs text-muted-foreground">O‘rtacha ball</div>
            <div className="mt-1 text-2xl font-bold">{avgScore ?? "—"}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Topshiriq nomi, izoh yoki ID bo‘yicha qidirish..."
          />
        </CardContent>
      </Card>

      {loading ? (
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">Yuklanmoqda...</CardContent>
        </Card>
      ) : filteredTasks.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">
            Hozircha ustoz sizga topshiriq biriktirmagan yoki qidiruv bo‘yicha natija topilmadi.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredTasks.map((task) => {
            const taskResults = [...(resultsByTask.get(task.id) ?? [])].sort(
              (a, b) => a.attempt_number - b.attempt_number
            );
            const attemptsUsed = taskResults.length;
            const latest = latestResult(taskResults);
            const best = bestScore(taskResults);
            const progress = Math.min(100, attemptsUsed * 50);

            return (
              <Card key={task.id} className="flex flex-col">
                <CardHeader className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <CardTitle className="text-base leading-6">{task.title}</CardTitle>
                    <Badge variant="outline">#{task.id}</Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{modeLabel(task.mode)}</Badge>
                    <Badge variant={latest?.status === "evaluated" ? "default" : latest?.status === "failed" ? "destructive" : "secondary"}>
                      {statusLabel(latest?.status)}
                    </Badge>
                    <Badge variant="secondary">{attemptsUsed}/2 urinish</Badge>
                  </div>
                </CardHeader>

                <CardContent className="flex flex-1 flex-col gap-4">
                  <p className="line-clamp-2 text-sm text-muted-foreground">
                    {task.description || "Izoh yo‘q"}
                  </p>

                  <div className="space-y-2 rounded-xl border bg-muted/20 p-3 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">Eng yaxshi ball</span>
                      <span className="font-semibold">{scoreText(best)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">Oxirgi natija</span>
                      <span className="font-medium">{scoreText(latest?.total_score)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">Muddat</span>
                      <span className="text-right text-xs">{deadlineText(task.deadline)}</span>
                    </div>
                    <Progress value={progress} />
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {[1, 2].map((attempt) => {
                      const result = taskResults.find((item) => item.attempt_number === attempt);
                      return (
                        <div key={attempt} className="rounded-lg border p-2">
                          <div className="text-muted-foreground">{attempt}-urinish</div>
                          <div className="mt-1 font-semibold">{scoreText(result?.total_score)}</div>
                        </div>
                      );
                    })}
                  </div>

                  <Button asChild className="mt-auto w-full">
                    <Link href={`/student/task/${task.id}`}>
                      {attemptsUsed === 0 ? "Boshlash" : attemptsUsed >= 2 ? "Natijani ko‘rish" : "Davom etish"}
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
