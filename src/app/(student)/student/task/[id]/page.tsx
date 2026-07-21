"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";

import { getStudentTaskResults } from "@/api/results";
import { createSubmission } from "@/api/submissions";
import { getStudentTaskById } from "@/api/tasks";
import { PageHeader } from "@/components/shell/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
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
import { getFileUrl } from "@/lib/api";
import { getApiErrorMessage } from "@/lib/error";
import type { ResultRead, TaskRead } from "@/types/api";

function modeLabel(mode?: string) {
  return mode === "etalon" ? "Etalon" : "Ixtiyoriy";
}

function statusLabel(status?: string) {
  if (status === "evaluated") return "Baholandi";
  if (status === "failed") return "Xatolik";
  if (status === "pending") return "Kutilmoqda";
  return "—";
}

function scoreText(score?: number | null) {
  return typeof score === "number" ? `${Math.round(score)}/100` : "—/100";
}

function formatDate(value?: string | null) {
  if (!value) return "—";

  try {
    return new Date(value).toLocaleString("uz-UZ", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return value;
  }
}

function bestScore(results: ResultRead[]) {
  const scores = results
    .map((item) => item.total_score)
    .filter((score): score is number => typeof score === "number");

  if (!scores.length) return null;
  return Math.max(...scores);
}

function statusVariant(status?: string): "default" | "secondary" | "destructive" | "outline" {
  if (status === "evaluated") return "default";
  if (status === "failed") return "destructive";
  if (status === "pending") return "secondary";
  return "outline";
}

function PreviewBox({
  title,
  url,
  openUrl,
  hint,
}: {
  title: string;
  url?: string | null;
  openUrl?: string | null;
  hint: string;
}) {
  const finalUrl = getFileUrl(url);
  const finalOpenUrl = getFileUrl(openUrl ?? url);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm font-medium">{title}</div>

        <Badge variant="outline" className="text-xs">
          {finalUrl ? "Mavjud" : "Yo‘q"}
        </Badge>
      </div>

      {finalUrl ? (
        <div className="overflow-hidden rounded-xl border bg-muted/30">
          {finalUrl.toLowerCase().endsWith(".pdf") ? (
            <iframe
              src={finalUrl}
              className="h-[520px] w-full"
              title={title}
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={finalUrl}
              alt={title}
              className="max-h-[520px] w-full object-contain"
            />
          )}
        </div>
      ) : (
        <div className="flex aspect-video items-center justify-center rounded-xl border bg-muted/30 text-sm text-muted-foreground">
          {hint}
        </div>
      )}

      {finalOpenUrl ? (
        <a
          href={finalOpenUrl}
          target="_blank"
          rel="noreferrer"
          className="text-xs text-blue-600 hover:underline"
        >
          Asl faylni yangi oynada ochish
        </a>
      ) : null}
    </div>
  );
}

function ScoreTable({ result }: { result: ResultRead | null }) {
  if (!result) {
    return (
      <div className="rounded-xl border bg-muted/20 p-4 text-sm text-muted-foreground">
        Hali natija mavjud emas.
      </div>
    );
  }

  const rows = result.table_json ?? [];

  if (!rows.length) {
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Mezon</TableHead>
            <TableHead>Izoh</TableHead>
            <TableHead className="text-right">Ball</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>Jami</TableCell>
            <TableCell>AI umumiy natijasi</TableCell>
            <TableCell className="text-right font-medium">{scoreText(result.total_score)}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Mezon</TableHead>
          <TableHead>Izoh</TableHead>
          <TableHead className="text-right">Ball</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row, index) => {
          const criterion = row.criterion ?? row.name ?? row.title ?? `Mezon ${index + 1}`;
          const comment = row.comment ?? row.status ?? row.description ?? "—";
          const score = row.score ?? row.ball ?? "—";
          const maxScore = row.max_score ?? row.max ?? null;

          return (
            <TableRow key={index}>
              <TableCell className="font-medium">{String(criterion)}</TableCell>
              <TableCell className="text-muted-foreground">{String(comment)}</TableCell>
              <TableCell className="text-right font-medium">
                {String(score)}{maxScore ? `/${String(maxScore)}` : ""}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

function ErrorBox({ result }: { result: ResultRead | null }) {
  if (!result || result.status !== "failed") return null;

  return (
    <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4">
      <div className="text-sm font-semibold text-destructive">AI baholashda xatolik</div>
      <pre className="mt-3 max-h-72 overflow-auto rounded-lg bg-background p-3 text-xs">
        {JSON.stringify(result.ai_json_result ?? {}, null, 2)}
      </pre>
    </div>
  );
}

export default function StudentTaskDetailPage() {
  const params = useParams<{ id: string }>();
  const taskId = Number(params.id);

  const [task, setTask] = useState<TaskRead | null>(null);
  const [results, setResults] = useState<ResultRead[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [activeAttempt, setActiveAttempt] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const sortedResults = useMemo(
    () => [...results].sort((a, b) => a.attempt_number - b.attempt_number),
    [results]
  );

  const nextAttempt: 1 | 2 | null = useMemo(() => {
    const used = new Set(sortedResults.map((result) => result.attempt_number));
    if (!used.has(1)) return 1;
    if (!used.has(2)) return 2;
    return null;
  }, [sortedResults]);

  const lastResult = sortedResults.length ? sortedResults[sortedResults.length - 1] : null;
  const activeResult =
    sortedResults.find((result) => result.attempt_number === activeAttempt) ?? lastResult;
  const best = bestScore(sortedResults);
  const progress = Math.min(100, sortedResults.length * 50);
  const firstScore = sortedResults.find((item) => item.attempt_number === 1)?.total_score;
  const secondScore = sortedResults.find((item) => item.attempt_number === 2)?.total_score;
  const diff = typeof firstScore === "number" && typeof secondScore === "number" ? Math.round(secondScore - firstScore) : null;

  async function reload() {
    try {
      setLoading(true);
      const [taskData, resultRows] = await Promise.all([
        getStudentTaskById(taskId),
        getStudentTaskResults(taskId),
      ]);

      setTask(taskData);
      setResults(resultRows);

      if (resultRows.length) {
        const latest = [...resultRows].sort((a, b) => b.attempt_number - a.attempt_number)[0];
        setActiveAttempt(latest.attempt_number);
      }
    } catch (error) {
      console.error(error);
      toast.error("Topshiriq ma’lumotlarini yuklashda xatolik");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId]);

  async function doUpload() {
    if (!selectedFile || !nextAttempt) return;

    try {
      setUploading(true);
      const result = await createSubmission({
        task_id: taskId,
        drawing_file: selectedFile,
      });

      toast.success(`Chizma yuklandi. ${result.attempt_number}-urinish baholandi.`);
      setSelectedFile(null);
      setActiveAttempt(result.attempt_number);
      await reload();
    } catch (error: unknown) {
      console.error(error);
      toast.error(getApiErrorMessage(error, "Chizmani yuklashda xatolik"));
    } finally {
      setUploading(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-5">
        <PageHeader title="Topshiriq" subtitle="Yuklanmoqda..." />
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">Yuklanmoqda...</CardContent>
        </Card>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="space-y-5">
        <PageHeader title="Topshiriq topilmadi" subtitle="Bu topshiriq sizga biriktirilmagan bo‘lishi mumkin." />
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">Topshiriq topilmadi.</CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title={task.title}
        subtitle={task.description || "Izoh yo‘q"}
        right={
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{modeLabel(task.mode)}</Badge>
            <Badge variant="secondary">Urinish: {sortedResults.length}/2</Badge>
            <Button variant="outline" onClick={reload} disabled={loading || uploading}>
              Yangilash
            </Button>
          </div>
        }
      />

      <div className="grid gap-3 md:grid-cols-4">
        <Card>
          <CardContent className="pt-5">
            <div className="text-xs text-muted-foreground">Urinish holati</div>
            <div className="mt-1 text-2xl font-bold">{sortedResults.length}/2</div>
            <Progress value={progress} className="mt-3" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="text-xs text-muted-foreground">Eng yaxshi ball</div>
            <div className="mt-1 text-2xl font-bold">{scoreText(best)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="text-xs text-muted-foreground">Oxirgi status</div>
            <div className="mt-2">
              <Badge variant={statusVariant(lastResult?.status)}>{statusLabel(lastResult?.status)}</Badge>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="text-xs text-muted-foreground">2-urinish farqi</div>
            <div className="mt-1 text-2xl font-bold">
              {diff === null ? "—" : diff > 0 ? `+${diff}` : diff}
            </div>
          </CardContent>
        </Card>
      </div>

      {task.instruction_file_path ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Topshiriq izoh fayli</CardTitle>
          </CardHeader>
          <CardContent>
            <PreviewBox
              title="O‘qituvchi biriktirgan ko‘rsatma fayli"
              url={task.instruction_file_path}
              hint="Bu topshiriqqa qo‘shimcha ko‘rsatma fayli biriktirilmagan."
            />
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Chizma yuklash</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {nextAttempt ? (
            <>
              <div className="rounded-xl border bg-muted/20 p-4 text-sm text-muted-foreground">
                Sizda <span className="font-semibold text-foreground">{nextAttempt}-urinish</span> mavjud.
                {task.mode === "etalon" ? " AI etalon chizma bilan taqqoslaydi." : " AI ixtiyoriy rejim bo‘yicha baholaydi."}
              </div>

              <Input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={(event) => setSelectedFile(event.target.files?.[0] || null)}
              />

              {selectedFile ? (
                <div className="rounded-lg border bg-background p-3 text-sm">
                  <div className="font-medium">Tanlangan fayl</div>
                  <div className="text-muted-foreground">
                    {selectedFile.name} · {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </div>
                </div>
              ) : null}

              <div className="flex flex-wrap gap-2">
                <Button onClick={doUpload} disabled={!selectedFile || uploading}>
                  {uploading ? "AI baholayapti..." : "Yuklash va baholatish"}
                </Button>
                <Button variant="outline" onClick={() => setSelectedFile(null)} disabled={uploading}>
                  Bekor
                </Button>
              </div>
            </>
          ) : (
            <div className="rounded-xl border bg-muted/20 p-4 text-sm text-muted-foreground">
              Siz 2 ta urinishni yakunlagansiz. Limit tugagan.
            </div>
          )}
        </CardContent>
      </Card>

      {sortedResults.length > 0 ? (
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <CardTitle className="text-base">Natija tafsilotlari</CardTitle>
              <div className="flex flex-wrap gap-2">
                {sortedResults.map((result) => (
                  <Button
                    key={result.id}
                    variant={activeResult?.id === result.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => setActiveAttempt(result.attempt_number)}
                  >
                    {result.attempt_number}-urinish · {scoreText(result.total_score)}
                  </Button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex flex-wrap gap-2">
              <Badge variant={statusVariant(activeResult?.status)}>
                Status: {statusLabel(activeResult?.status)}
              </Badge>
              <Badge variant="secondary">Ball: {scoreText(activeResult?.total_score)}</Badge>
              <Badge variant="outline">Sana: {formatDate(activeResult?.created_at)}</Badge>
            </div>

            <Tabs defaultValue="preview">
              <TabsList className="flex flex-wrap">
                <TabsTrigger value="preview">Preview</TabsTrigger>
                <TabsTrigger value="table">Baholash jadvali</TabsTrigger>
                <TabsTrigger value="attempts">Urinishlar</TabsTrigger>
                <TabsTrigger value="json">AI JSON</TabsTrigger>
              </TabsList>

              <TabsContent value="preview" className="mt-4 space-y-4">
                <div className="grid gap-4 xl:grid-cols-2">
                  <PreviewBox
                    title="Talaba chizmasi"
                    url={
                      activeResult?.uploaded_preview_url ??
                      activeResult?.uploaded_file_url
                    }
                    openUrl={activeResult?.uploaded_file_url}
                    hint="Talaba yuklagan chizma shu yerda ko‘rinadi."
                  />
                  <PreviewBox
                    title="AI overlay natijasi"
                    url={activeResult?.overlay_url}
                    hint="AI overlay fayli bo‘lsa, shu yerda ko‘rinadi."
                  />
                </div>
                <ErrorBox result={activeResult} />
              </TabsContent>

              <TabsContent value="table" className="mt-4">
                <ScoreTable result={activeResult} />
              </TabsContent>

              <TabsContent value="attempts" className="mt-4 space-y-4">
                <div className="grid gap-3 md:grid-cols-2">
                  {sortedResults.map((result) => (
                    <div key={result.id} className="rounded-xl border p-4">
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-semibold">{result.attempt_number}-urinish</div>
                        <Badge variant={statusVariant(result.status)}>{statusLabel(result.status)}</Badge>
                      </div>
                      <div className="mt-3 text-3xl font-bold">{scoreText(result.total_score)}</div>
                      <div className="mt-2 text-xs text-muted-foreground">{formatDate(result.created_at)}</div>
                      <Button
                        className="mt-4 w-full"
                        variant={activeResult?.id === result.id ? "default" : "outline"}
                        onClick={() => setActiveAttempt(result.attempt_number)}
                      >
                        Shu urinishni ko‘rish
                      </Button>
                    </div>
                  ))}
                </div>

                {diff !== null ? (
                  <div className="rounded-xl border bg-muted/20 p-4 text-sm">
                    <span className="font-medium">1-urinishdan 2-urinishga o‘zgarish:</span>{" "}
                    <span className={diff >= 0 ? "font-bold text-green-700" : "font-bold text-destructive"}>
                      {diff > 0 ? `+${diff}` : diff} ball
                    </span>
                  </div>
                ) : null}
              </TabsContent>

              <TabsContent value="json" className="mt-4">
                <pre className="max-h-[520px] overflow-auto rounded-xl border bg-muted/20 p-4 text-xs">
                  {JSON.stringify(activeResult?.ai_json_result ?? {}, null, 2)}
                </pre>
              </TabsContent>
            </Tabs>

            <Separator />
            <div className="text-xs text-muted-foreground">
              Eslatma: AI bahosi yordamchi baholash vositasi hisoblanadi. Yakuniy qarorni ustoz tekshirishi mumkin.
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
