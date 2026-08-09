"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { getTeacherResults } from "@/api/results";
import { DrawingAiResultDiagnostics } from "@/components/drawing-ai/result-diagnostics";
import { PageHeader } from "@/components/shell/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ResultRead, SubmissionStatus, TaskMode } from "@/types/api";

type FilterStatus = "all" | SubmissionStatus;
type FilterMode = "all" | TaskMode;

type GroupedRow = {
  key: string;
  taskId: number;
  studentId: number;
  attempts: ResultRead[];
};

function modeLabel(mode: string) {
  return mode === "etalon" ? "Etalon" : "Ixtiyoriy";
}

function statusLabel(status: string) {
  if (status === "evaluated") return "Baholandi";
  if (status === "failed") return "Xatolik";
  return "Kutilmoqda";
}

function statusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  if (status === "evaluated") return "default";
  if (status === "failed") return "destructive";
  return "secondary";
}

function scoreText(score?: number | null) {
  return score === null || score === undefined ? "—" : `${Math.round(score * 10) / 10}`;
}

function formatDate(dateString?: string | null) {
  if (!dateString) return "—";

  try {
    return new Intl.DateTimeFormat("uz-UZ", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(dateString));
  } catch {
    return dateString;
  }
}

function getAttempt(group: GroupedRow, attemptNumber: number) {
  return group.attempts.find((item) => item.attempt_number === attemptNumber) || null;
}

function getLatestAttempt(group: GroupedRow) {
  return group.attempts[group.attempts.length - 1];
}

function getBestScore(group: GroupedRow) {
  const scores = group.attempts
    .map((attempt) => attempt.total_score)
    .filter((score): score is number => typeof score === "number");

  if (!scores.length) return null;
  return Math.max(...scores);
}

function getScoreDiff(a1: ResultRead | null, a2: ResultRead | null) {
  if (typeof a1?.total_score !== "number" || typeof a2?.total_score !== "number") {
    return null;
  }

  return Math.round((a2.total_score - a1.total_score) * 10) / 10;
}

function AttemptSummary({ label, attempt }: { label: string; attempt: ResultRead | null }) {
  return (
    <div className="rounded-xl border bg-muted/20 p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="font-medium">{label}</div>
        {attempt ? (
          <Badge variant={statusVariant(attempt.status)}>{statusLabel(attempt.status)}</Badge>
        ) : (
          <Badge variant="secondary">Topshirilmagan</Badge>
        )}
      </div>
      <div className="mt-2 text-2xl font-bold">{attempt ? scoreText(attempt.total_score) : "—"}<span className="text-sm font-normal text-muted-foreground">/100</span></div>
      <div className="mt-1 text-xs text-muted-foreground">{attempt ? formatDate(attempt.created_at) : "Hali mavjud emas"}</div>
    </div>
  );
}

function AttemptDetail({ attempt, attemptNumber }: { attempt: ResultRead; attemptNumber: number }) {
  return (
    <div className="mt-4 space-y-4">
      <div className="flex flex-wrap gap-2">
        <Badge variant="outline">{modeLabel(attempt.mode)}</Badge>
        <Badge variant="secondary">Urinish: {attemptNumber}/2</Badge>
        <Badge variant={statusVariant(attempt.status)}>{statusLabel(attempt.status)}</Badge>
        <Badge variant="outline">Ball: {scoreText(attempt.total_score)}/100</Badge>
        <Badge variant="outline">Sana: {formatDate(attempt.created_at)}</Badge>
      </div>

      <DrawingAiResultDiagnostics result={attempt} showReferencePreview={false} />
    </div>
  );
}

export default function SubmissionsPage() {
  const [results, setResults] = useState<ResultRead[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("all");
  const [modeFilter, setModeFilter] = useState<FilterMode>("all");

  async function reload() {
    try {
      setLoading(true);
      const rows = await getTeacherResults();
      setResults(rows);
    } catch (error) {
      console.error(error);
      toast.error("Natijalarni yuklashda xatolik");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reload();
  }, []);

  const grouped: GroupedRow[] = useMemo(() => {
    const map = new Map<string, GroupedRow>();

    for (const result of results) {
      const key = `${result.task_id}__${result.student_id}`;
      const current = map.get(key);

      if (!current) {
        map.set(key, {
          key,
          taskId: result.task_id,
          studentId: result.student_id,
          attempts: [result],
        });
      } else {
        current.attempts.push(result);
      }
    }

    return Array.from(map.values())
      .map((row) => ({
        ...row,
        attempts: row.attempts.sort((a, b) => a.attempt_number - b.attempt_number),
      }))
      .sort((a, b) => {
        const lastA = getLatestAttempt(a)?.created_at || "";
        const lastB = getLatestAttempt(b)?.created_at || "";
        return lastB.localeCompare(lastA);
      });
  }, [results]);

  const filteredGroups = useMemo(() => {
    const needle = query.trim().toLowerCase();

    return grouped.filter((group) => {
      const first = group.attempts[0];
      const last = getLatestAttempt(group);

      const matchesQuery = !needle
        ? true
        : [
            first.student_full_name,
            first.task_title,
            String(first.student_id),
            String(first.task_id),
          ]
            .filter(Boolean)
            .some((item) => String(item).toLowerCase().includes(needle));

      const matchesStatus = statusFilter === "all" || group.attempts.some((item) => item.status === statusFilter);
      const matchesMode = modeFilter === "all" || last.mode === modeFilter;

      return matchesQuery && matchesStatus && matchesMode;
    });
  }, [grouped, modeFilter, query, statusFilter]);

  const stats = useMemo(() => {
    const evaluated = results.filter((item) => item.status === "evaluated");
    const failed = results.filter((item) => item.status === "failed");
    const pending = results.filter((item) => item.status === "pending");
    const scores = evaluated
      .map((item) => item.total_score)
      .filter((score): score is number => typeof score === "number");
    const avgScore = scores.length ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10 : null;

    return {
      total: results.length,
      grouped: grouped.length,
      evaluated: evaluated.length,
      failed: failed.length,
      pending: pending.length,
      avgScore,
    };
  }, [grouped.length, results]);

  function exportCSV() {
    const header = [
      "created_at",
      "task_id",
      "task_title",
      "student_id",
      "student_full_name",
      "attempt_number",
      "mode",
      "status",
      "total_score",
      "uploaded_file_url",
      "overlay_url",
    ];

    const lines = [
      header.join(","),
      ...results.map((result) => {
        const values = [
          result.created_at,
          result.task_id,
          result.task_title ?? "",
          result.student_id,
          result.student_full_name ?? "",
          result.attempt_number,
          result.mode,
          result.status,
          result.total_score ?? "",
          result.uploaded_file_url ?? "",
          result.overlay_url ?? "",
        ];

        return values.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(",");
      }),
    ];

    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "submissions_export.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Natijalar"
        subtitle="AI baholagan topshiriqlar, 1–2 urinish farqi, overlay va mezonlar jadvali."
        right={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={reload} disabled={loading}>
              Yangilash
            </Button>
            <Button variant="outline" onClick={exportCSV} disabled={results.length === 0}>
              Export CSV
            </Button>
          </div>
        }
      />

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Jami urinishlar</div>
            <div className="mt-1 text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Talaba + topshiriq</div>
            <div className="mt-1 text-2xl font-bold">{stats.grouped}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Baholandi</div>
            <div className="mt-1 text-2xl font-bold">{stats.evaluated}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Xatolik/kutilmoqda</div>
            <div className="mt-1 text-2xl font-bold">{stats.failed + stats.pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">O‘rtacha ball</div>
            <div className="mt-1 text-2xl font-bold">{stats.avgScore ?? "—"}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filtrlar</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Talaba, topshiriq yoki ID bo‘yicha qidirish..."
          />

          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant={statusFilter === "all" ? "default" : "outline"} onClick={() => setStatusFilter("all")}>
              Barchasi
            </Button>
            <Button size="sm" variant={statusFilter === "evaluated" ? "default" : "outline"} onClick={() => setStatusFilter("evaluated")}>
              Baholangan
            </Button>
            <Button size="sm" variant={statusFilter === "failed" ? "default" : "outline"} onClick={() => setStatusFilter("failed")}>
              Xatolik
            </Button>
            <Button size="sm" variant={statusFilter === "pending" ? "default" : "outline"} onClick={() => setStatusFilter("pending")}>
              Kutilmoqda
            </Button>
            <Separator orientation="vertical" className="mx-1 hidden h-8 md:block" />
            <Button size="sm" variant={modeFilter === "all" ? "default" : "outline"} onClick={() => setModeFilter("all")}>
              Har ikki rejim
            </Button>
            <Button size="sm" variant={modeFilter === "etalon" ? "default" : "outline"} onClick={() => setModeFilter("etalon")}>
              Etalon
            </Button>
            <Button size="sm" variant={modeFilter === "optional" ? "default" : "outline"} onClick={() => setModeFilter("optional")}>
              Ixtiyoriy
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Submissions</CardTitle>
        </CardHeader>
        <CardContent className="overflow-hidden">
          {loading ? (
            <div className="rounded-xl border bg-muted/20 p-6 text-sm text-muted-foreground">Yuklanmoqda...</div>
          ) : filteredGroups.length === 0 ? (
            <div className="rounded-xl border bg-muted/20 p-6 text-sm text-muted-foreground">
              Hozircha mos submission topilmadi.
            </div>
          ) : (
            <div className="w-full overflow-x-auto pb-2">
              <Table className="min-w-[1180px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[170px]">Talaba</TableHead>
                    <TableHead className="min-w-[230px]">Topshiriq</TableHead>
                    <TableHead className="min-w-[95px]">Rejim</TableHead>
                    <TableHead className="min-w-[110px]">Status</TableHead>
                    <TableHead className="min-w-[95px]">Urinishlar</TableHead>
                    <TableHead className="min-w-[150px]">Oxirgi sana</TableHead>
                    <TableHead className="min-w-[280px] text-right">Ballar</TableHead>
                    <TableHead className="min-w-[100px] text-right">Batafsil</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {filteredGroups.map((group) => {
                    const first = group.attempts[0];
                    const a1 = getAttempt(group, 1);
                    const a2 = getAttempt(group, 2);
                    const last = getLatestAttempt(group);
                    const bestScore = getBestScore(group);
                    const diff = getScoreDiff(a1, a2);

                    return (
                      <TableRow key={group.key}>
                        <TableCell className="min-w-[170px] align-top font-medium">
                          {first.student_full_name || `Talaba #${first.student_id}`}
                          <div className="text-xs text-muted-foreground">ID: {first.student_id}</div>
                        </TableCell>

                        <TableCell className="min-w-[230px] align-top">
                          {first.task_title || `Topshiriq #${first.task_id}`}
                          <div className="text-xs text-muted-foreground">Task ID: {first.task_id}</div>
                        </TableCell>

                        <TableCell className="align-top">
                          <Badge variant="outline">{modeLabel(last.mode)}</Badge>
                        </TableCell>

                        <TableCell className="align-top">
                          <Badge variant={statusVariant(last.status)}>{statusLabel(last.status)}</Badge>
                        </TableCell>

                        <TableCell className="align-top">
                          <Badge variant="secondary">{group.attempts.length}/2</Badge>
                        </TableCell>

                        <TableCell className="whitespace-nowrap align-top text-sm text-muted-foreground">{formatDate(last.created_at)}</TableCell>

                        <TableCell className="min-w-[280px] align-top text-right">
                          <div className="flex flex-col items-end gap-1">
                            <div className="grid grid-cols-2 gap-2">
                              <Badge variant="outline">1: {scoreText(a1?.total_score)}/100</Badge>
                              <Badge variant={a2 ? "default" : "secondary"}>2: {scoreText(a2?.total_score)}/100</Badge>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Eng yaxshi: {scoreText(bestScore)}/100
                              {diff !== null ? ` • Farq: ${diff > 0 ? "+" : ""}${diff}` : ""}
                            </div>
                          </div>
                        </TableCell>

                        <TableCell className="align-top text-right">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button size="sm" variant="outline">Ko‘rish</Button>
                            </DialogTrigger>

                            <DialogContent className="max-h-[88vh] max-w-6xl overflow-y-auto">
                              <DialogHeader>
                                <DialogTitle>Submission tafsilotlari</DialogTitle>
                              </DialogHeader>

                              <div className="space-y-4">
                                <div className="rounded-xl border bg-muted/20 p-4 text-sm">
                                  <div className="font-medium">{first.task_title || "Topshiriq"}</div>
                                  <div className="mt-1 text-muted-foreground">
                                    Talaba: <span className="font-medium text-foreground">{first.student_full_name || `#${first.student_id}`}</span>
                                  </div>
                                  <div className="mt-1 text-muted-foreground">
                                    Oxirgi status: <span className="font-medium text-foreground">{statusLabel(last.status)}</span>
                                    {" • "}Eng yaxshi ball: <span className="font-medium text-foreground">{scoreText(bestScore)}/100</span>
                                  </div>
                                </div>

                                <div className="grid gap-3 md:grid-cols-3">
                                  <AttemptSummary label="1-urinish" attempt={a1} />
                                  <AttemptSummary label="2-urinish" attempt={a2} />
                                  <div className="rounded-xl border bg-muted/20 p-3">
                                    <div className="font-medium">Farq</div>
                                    <div className="mt-2 text-2xl font-bold">
                                      {diff === null ? "—" : `${diff > 0 ? "+" : ""}${diff}`}
                                    </div>
                                    <div className="mt-1 text-xs text-muted-foreground">
                                      2-urinish balli − 1-urinish balli
                                    </div>
                                  </div>
                                </div>

                                <Tabs defaultValue={a2 ? "a2" : "a1"}>
                                  <TabsList>
                                    <TabsTrigger value="a1" disabled={!a1}>1-urinish</TabsTrigger>
                                    <TabsTrigger value="a2" disabled={!a2}>2-urinish</TabsTrigger>
                                  </TabsList>

                                  {[a1, a2].map((attempt, index) => {
                                    const value = index === 0 ? "a1" : "a2";
                                    const attemptNumber = index + 1;

                                    if (!attempt) {
                                      return (
                                        <TabsContent key={value} value={value} className="mt-4">
                                          <div className="rounded-xl border bg-muted/20 p-4 text-sm text-muted-foreground">
                                            {attemptNumber}-urinish mavjud emas.
                                          </div>
                                        </TabsContent>
                                      );
                                    }

                                    return (
                                      <TabsContent key={value} value={value}>
                                        <AttemptDetail attempt={attempt} attemptNumber={attemptNumber} />
                                      </TabsContent>
                                    );
                                  })}
                                </Tabs>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
