"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, Clock3, HardDrive, Loader2, RefreshCcw, RotateCcw, ServerCog } from "lucide-react";
import { toast } from "sonner";

import { getRAGJobs, getRAGMonitoringSummary, retryRAGJob } from "@/api/rag";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { getApiErrorMessage } from "@/lib/error";
import type { RAGMonitoringSummary, RAGProcessingJob } from "@/types/rag";

function formatBytes(value?: number | null) {
  if (!value) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
  const amount = value / 1024 ** index;
  return `${amount >= 10 || index === 0 ? amount.toFixed(0) : amount.toFixed(1)} ${units[index]}`;
}

function jobLabel(job: RAGProcessingJob) {
  const action = job.job_type === "ingest" ? "Yuklash va chunklash" : job.job_type === "embed" ? "Embedding" : "Qayta ishlash";
  return `${action} · Hujjat #${job.document_id}`;
}

function statusBadge(status: RAGProcessingJob["status"]) {
  if (status === "succeeded") return <Badge className="bg-emerald-600 hover:bg-emerald-600">Tayyor</Badge>;
  if (status === "failed") return <Badge variant="destructive">Xatolik</Badge>;
  if (status === "running") return <Badge variant="secondary">Bajarilmoqda</Badge>;
  if (status === "pending") return <Badge variant="outline">Navbatda</Badge>;
  return <Badge variant="outline">Bekor qilingan</Badge>;
}

export function RAGProductionPanel({ refreshKey, onCompleted }: { refreshKey?: number; onCompleted?: () => void }) {
  const [jobs, setJobs] = useState<RAGProcessingJob[]>([]);
  const [summary, setSummary] = useState<RAGMonitoringSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [retryingId, setRetryingId] = useState<number | null>(null);
  const onCompletedRef = useRef(onCompleted);
  const previousJobStatusesRef = useRef<Map<number, RAGProcessingJob["status"]>>(new Map());
  const hasLoadedJobsRef = useRef(false);
  const loadInFlightRef = useRef(false);

  useEffect(() => {
    onCompletedRef.current = onCompleted;
  }, [onCompleted]);

  const load = useCallback(async (quiet = false) => {
    if (loadInFlightRef.current) return;
    loadInFlightRef.current = true;

    try {
      if (!quiet) setLoading(true);
      const [jobRows, monitor] = await Promise.all([
        getRAGJobs({ limit: 20 }),
        getRAGMonitoringSummary(),
      ]);

      const previousStatuses = previousJobStatusesRef.current;
      const terminalStatuses = new Set<RAGProcessingJob["status"]>([
        "succeeded",
        "failed",
        "cancelled",
      ]);
      const hasNewlyCompletedJob = hasLoadedJobsRef.current && jobRows.some((job) => {
        if (!terminalStatuses.has(job.status)) return false;
        const previousStatus = previousStatuses.get(job.id);
        return previousStatus === undefined || !terminalStatuses.has(previousStatus);
      });

      previousJobStatusesRef.current = new Map(
        jobRows.map((job) => [job.id, job.status])
      );
      hasLoadedJobsRef.current = true;

      setJobs(jobRows);
      setSummary(monitor);

      if (hasNewlyCompletedJob) {
        onCompletedRef.current?.();
      }
    } catch (error) {
      if (!quiet) {
        toast.error(getApiErrorMessage(error, "RAG monitoring ma’lumotlari yuklanmadi."));
      }
    } finally {
      if (!quiet) setLoading(false);
      loadInFlightRef.current = false;
    }
  }, []);

  useEffect(() => { void load(); }, [load, refreshKey]);

  useEffect(() => {
    const hasActive = jobs.some((job) => job.status === "pending" || job.status === "running");
    if (!hasActive) return;
    const timer = window.setInterval(() => void load(true), 2000);
    return () => window.clearInterval(timer);
  }, [jobs, load]);

  async function retry(job: RAGProcessingJob) {
    try {
      setRetryingId(job.id);
      await retryRAGJob(job.id);
      toast.success("Job qayta navbatga qo‘yildi.");
      await load(true);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Jobni qayta boshlashning imkoni bo‘lmadi."));
    } finally {
      setRetryingId(null);
    }
  }

  const activeJobs = jobs.filter((job) => job.status === "pending" || job.status === "running");
  const recentJobs = jobs.slice(0, 8);
  const usage = summary?.storage.usage_percent ?? 0;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between"><p className="text-sm font-medium">Storage kvotasi</p><HardDrive className="h-4 w-4 text-muted-foreground" /></div>
            <p className="mt-2 text-2xl font-semibold">{formatBytes(summary?.storage.used_bytes)}</p>
            <p className="text-xs text-muted-foreground">{summary?.storage.limit_bytes ? `${formatBytes(summary.storage.limit_bytes)} limit` : "Limitsiz"}</p>
            <Progress className="mt-3" value={Math.min(usage, 100)} />
            <p className="mt-1 text-right text-xs text-muted-foreground">{usage.toFixed(2)}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between"><p className="text-sm font-medium">Background worker</p><ServerCog className="h-4 w-4 text-muted-foreground" /></div>
            <p className="mt-2 text-2xl font-semibold">{summary?.worker_enabled ? "Faol" : "O‘chiq"}</p>
            <p className="text-xs text-muted-foreground">Tekshiruv oralig‘i: {summary?.worker_poll_seconds ?? "—"} soniya</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between"><p className="text-sm font-medium">Joblar</p><Clock3 className="h-4 w-4 text-muted-foreground" /></div>
            <p className="mt-2 text-2xl font-semibold">{activeJobs.length} faol</p>
            <p className="text-xs text-muted-foreground">{summary?.jobs_by_status.succeeded ?? 0} muvaffaqiyatli · {summary?.jobs_by_status.failed ?? 0} xato</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <div><CardTitle className="text-base">Background jarayonlar</CardTitle><p className="mt-1 text-xs text-muted-foreground">Yuklash, chunklash va embedding holatini real vaqtda kuzating.</p></div>
          <Button size="sm" variant="outline" onClick={() => void load()} disabled={loading}>{loading ? <Loader2 className="animate-spin" /> : <RefreshCcw />} Yangilash</Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading && !jobs.length ? <div className="flex justify-center py-8"><Loader2 className="animate-spin" /></div> : recentJobs.length ? recentJobs.map((job) => (
            <div key={job.id} className="rounded-xl border p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {job.status === "succeeded" ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : job.status === "failed" ? <AlertCircle className="h-4 w-4 text-destructive" /> : <Loader2 className={`h-4 w-4 ${job.status === "running" ? "animate-spin" : ""}`} />}
                  <span className="text-sm font-medium">{jobLabel(job)}</span>
                </div>
                <div className="flex items-center gap-2">{statusBadge(job.status)}<span className="text-xs text-muted-foreground">Urinish {job.attempts}/{job.max_attempts}</span></div>
              </div>
              <div className="mt-3 flex items-center gap-3"><Progress value={job.progress_percent} /><span className="w-10 text-right text-xs text-muted-foreground">{job.progress_percent}%</span></div>
              {job.error_message ? <div className="mt-3 rounded-lg border border-destructive/30 bg-destructive/5 p-2 text-xs text-destructive">{job.error_message}</div> : null}
              {job.status === "failed" ? <div className="mt-3 flex justify-end"><Button size="sm" variant="outline" onClick={() => void retry(job)} disabled={retryingId === job.id}>{retryingId === job.id ? <Loader2 className="animate-spin" /> : <RotateCcw />} Qayta urinish</Button></div> : null}
            </div>
          )) : <p className="py-8 text-center text-sm text-muted-foreground">Hozircha background joblar yo‘q.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
