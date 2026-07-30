"use client";

import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import {
  BookOpenCheck,
  BrainCircuit,
  CheckCircle2,
  Database,
  FileArchive,
  FileText,
  Loader2,
  Pencil,
  Plus,
  RefreshCcw,
  Search,
  Sparkles,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { toast } from "sonner";

import {
  deleteRAGDocument,
  embedRAGDocument,
  getRAGDocumentChunks,
  getRAGDocuments,
  getRAGEmbeddingStatus,
  reprocessRAGDocument,
  semanticSearchRAG,
  updateRAGDocument,
  uploadRAGDocument,
} from "@/api/rag";
import { getTeacherTasks } from "@/api/tasks";
import { PageHeader } from "@/components/shell/page-header";
import { EmptyState, ErrorState, LoadingState } from "@/components/states/page-state";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { getApiErrorMessage } from "@/lib/error";
import type { TaskRead } from "@/types/api";
import type {
  RAGChunk,
  RAGDocument,
  RAGDocumentStatus,
  RAGEmbeddingStatusRead,
  RAGSemanticSearchResponse,
} from "@/types/rag";

const MAX_FILE_SIZE = 25 * 1024 * 1024;

type BusyAction = "embed" | "reprocess" | "delete" | "edit" | null;

function formatBytes(value?: number | null) {
  if (!value) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
  const amount = value / 1024 ** index;
  return `${amount >= 10 || index === 0 ? amount.toFixed(0) : amount.toFixed(1)} ${units[index]}`;
}

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

function documentStatusLabel(status: RAGDocumentStatus) {
  if (status === "ready") return "Tayyor";
  if (status === "processing") return "Qayta ishlanmoqda";
  if (status === "failed") return "Xatolik";
  if (status === "archived") return "Arxiv";
  return "Yuklandi";
}

function DocumentStatusBadge({ status }: { status: RAGDocumentStatus }) {
  if (status === "ready") {
    return <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">Tayyor</Badge>;
  }
  if (status === "failed") return <Badge variant="destructive">Xatolik</Badge>;
  if (status === "processing") return <Badge variant="secondary">Qayta ishlanmoqda</Badge>;
  return <Badge variant="outline">{documentStatusLabel(status)}</Badge>;
}

function EmbeddingBadge({ document }: { document: RAGDocument }) {
  if (document.embedding_status === "ready") {
    return <Badge className="border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-50 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300">Embedding tayyor</Badge>;
  }
  if (document.embedding_status === "partial") {
    return <Badge variant="secondary">Embedding qisman</Badge>;
  }
  return <Badge variant="outline">Embedding yo‘q</Badge>;
}

function SummaryCard({
  title,
  value,
  hint,
  icon,
}: {
  title: string;
  value: number | string;
  hint: string;
  icon: React.ReactNode;
}) {
  return (
    <Card className="shadow-sm">
      <CardContent className="flex items-center justify-between gap-4 p-4">
        <div>
          <p className="text-xs text-muted-foreground">{title}</p>
          <p className="mt-1 text-2xl font-semibold tracking-tight">{value}</p>
          <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
        </div>
        <div className="rounded-2xl border bg-muted/30 p-3 text-muted-foreground">{icon}</div>
      </CardContent>
    </Card>
  );
}

export default function KnowledgeBasePage() {
  const [documents, setDocuments] = useState<RAGDocument[]>([]);
  const [tasks, setTasks] = useState<TaskRead[]>([]);
  const [embeddingStatus, setEmbeddingStatus] = useState<RAGEmbeddingStatusRead | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | RAGDocumentStatus>("all");
  const [taskFilter, setTaskFilter] = useState("all");

  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadTaskId, setUploadTaskId] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [autoEmbed, setAutoEmbed] = useState(true);
  const [uploading, setUploading] = useState(false);

  const [selectedDocument, setSelectedDocument] = useState<RAGDocument | null>(null);
  const [busyAction, setBusyAction] = useState<BusyAction>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editTaskId, setEditTaskId] = useState("");

  const [chunksOpen, setChunksOpen] = useState(false);
  const [chunks, setChunks] = useState<RAGChunk[]>([]);
  const [chunksLoading, setChunksLoading] = useState(false);
  const [chunkQuery, setChunkQuery] = useState("");

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [reprocessOpen, setReprocessOpen] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchDocumentId, setSearchDocumentId] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<RAGSemanticSearchResponse | null>(null);

  const taskMap = useMemo(() => new Map(tasks.map((task) => [task.id, task])), [tasks]);

  const summary = useMemo(() => {
    const ready = documents.filter((item) => item.status === "ready").length;
    const embedded = documents.filter((item) => item.embedding_status === "ready").length;
    const chunksTotal = documents.reduce((sum, item) => sum + item.chunk_count, 0);
    return { total: documents.length, ready, embedded, chunksTotal };
  }, [documents]);

  const filteredDocuments = useMemo(() => {
    const cleanQuery = query.trim().toLowerCase();
    return documents.filter((document) => {
      const taskTitle = document.task_id ? taskMap.get(document.task_id)?.title ?? "" : "";
      const matchesQuery =
        !cleanQuery ||
        [document.title, document.original_filename, document.file_type, taskTitle]
          .some((value) => value.toLowerCase().includes(cleanQuery));
      const matchesStatus = statusFilter === "all" || document.status === statusFilter;
      const matchesTask =
        taskFilter === "all" ||
        (taskFilter === "general" && document.task_id == null) ||
        document.task_id === Number(taskFilter);
      return matchesQuery && matchesStatus && matchesTask;
    });
  }, [documents, query, statusFilter, taskFilter, taskMap]);

  const filteredChunks = useMemo(() => {
    const clean = chunkQuery.trim().toLowerCase();
    if (!clean) return chunks;
    return chunks.filter((chunk) =>
      [chunk.content, chunk.section_title ?? "", String(chunk.chunk_index + 1)]
        .some((value) => value.toLowerCase().includes(clean))
    );
  }, [chunks, chunkQuery]);

  async function reload() {
    try {
      setLoading(true);
      setLoadError("");
      const [documentRows, taskRows, provider] = await Promise.all([
        getRAGDocuments(),
        getTeacherTasks(),
        getRAGEmbeddingStatus(),
      ]);
      setDocuments(documentRows ?? []);
      setTasks(taskRows ?? []);
      setEmbeddingStatus(provider);
    } catch (error) {
      console.error(error);
      setLoadError(getApiErrorMessage(error, "Bilimlar bazasini yuklab bo‘lmadi."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void reload();
  }, []);

  function resetUploadForm() {
    setUploadTitle("");
    setUploadTaskId("");
    setUploadFile(null);
    setAutoEmbed(true);
  }

  async function handleUpload() {
    if (!uploadFile || uploadTitle.trim().length < 3) return;
    if (!/\.(pdf|docx)$/i.test(uploadFile.name)) {
      toast.error("Faqat PDF yoki DOCX fayl yuklash mumkin.");
      return;
    }
    if (uploadFile.size > MAX_FILE_SIZE) {
      toast.error("Fayl hajmi 25 MB dan oshmasligi kerak.");
      return;
    }

    try {
      setUploading(true);
      const document = await uploadRAGDocument({
        title: uploadTitle,
        task_id: uploadTaskId ? Number(uploadTaskId) : null,
        file: uploadFile,
      });
      toast.success("Hujjat yuklandi va matn bo‘laklariga ajratildi.");

      if (autoEmbed && document.status === "ready") {
        try {
          await embedRAGDocument(document.id);
          toast.success("Embeddinglar ham tayyorlandi.");
        } catch (error) {
          toast.warning(getApiErrorMessage(error, "Hujjat saqlandi, ammo embedding yaratilmadi."));
        }
      }

      setUploadOpen(false);
      resetUploadForm();
      await reload();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Hujjatni yuklashda xatolik yuz berdi."));
    } finally {
      setUploading(false);
    }
  }

  async function handleEmbed(document: RAGDocument) {
    try {
      setSelectedDocument(document);
      setBusyAction("embed");
      await embedRAGDocument(document.id);
      toast.success("Embedding muvaffaqiyatli yaratildi.");
      await reload();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Embedding yaratilmadi."));
    } finally {
      setBusyAction(null);
    }
  }

  function openEdit(document: RAGDocument) {
    setSelectedDocument(document);
    setEditTitle(document.title);
    setEditTaskId(document.task_id ? String(document.task_id) : "");
    setEditOpen(true);
  }

  async function handleEdit() {
    if (!selectedDocument || editTitle.trim().length < 3) return;
    try {
      setBusyAction("edit");
      await updateRAGDocument(selectedDocument.id, {
        title: editTitle.trim(),
        task_id: editTaskId ? Number(editTaskId) : null,
      });
      toast.success("Hujjat ma’lumotlari yangilandi.");
      setEditOpen(false);
      await reload();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Hujjat yangilanmadi."));
    } finally {
      setBusyAction(null);
    }
  }

  async function openChunks(document: RAGDocument) {
    setSelectedDocument(document);
    setChunksOpen(true);
    setChunksLoading(true);
    setChunkQuery("");
    try {
      setChunks(await getRAGDocumentChunks(document.id));
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Matn bo‘laklari yuklanmadi."));
      setChunks([]);
    } finally {
      setChunksLoading(false);
    }
  }

  async function handleReprocess() {
    if (!selectedDocument) return;
    try {
      setBusyAction("reprocess");
      await reprocessRAGDocument(selectedDocument.id);
      toast.success("Hujjat qayta ishlanib, chunklar yangilandi.");
      setReprocessOpen(false);
      await reload();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Hujjatni qayta ishlashda xatolik yuz berdi."));
    } finally {
      setBusyAction(null);
    }
  }

  async function handleDelete() {
    if (!selectedDocument) return;
    try {
      setBusyAction("delete");
      await deleteRAGDocument(selectedDocument.id);
      toast.success("Hujjat bilimlar bazasidan o‘chirildi.");
      setDeleteOpen(false);
      await reload();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Hujjat o‘chirilmadi."));
    } finally {
      setBusyAction(null);
    }
  }

  async function handleSemanticSearch() {
    const clean = searchQuery.trim();
    if (clean.length < 2) return;
    try {
      setSearching(true);
      const result = await semanticSearchRAG({
        query: clean,
        top_k: 5,
        document_ids: searchDocumentId ? [Number(searchDocumentId)] : undefined,
      });
      setSearchResult(result);
      if (!result.hits.length) toast.info("Mos matn bo‘lagi topilmadi.");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Semantik qidiruv bajarilmadi."));
    } finally {
      setSearching(false);
    }
  }

  if (loading) return <LoadingState title="Bilimlar bazasi yuklanmoqda..." />;
  if (loadError) return <ErrorState description={loadError} onRetry={() => void reload()} />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bilimlar bazasi"
        subtitle="AI Mentor javoblari uchun PDF va DOCX o‘quv-metodik materiallarni boshqaring."
        right={
          <Button onClick={() => setUploadOpen(true)}>
            <Plus /> Material yuklash
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard title="Materiallar" value={summary.total} hint="Jami hujjatlar" icon={<FileArchive className="h-5 w-5" />} />
        <SummaryCard title="Qayta ishlangan" value={summary.ready} hint="RAG uchun tayyor" icon={<CheckCircle2 className="h-5 w-5" />} />
        <SummaryCard title="Embedding tayyor" value={summary.embedded} hint="Semantik qidiruvda qatnashadi" icon={<BrainCircuit className="h-5 w-5" />} />
        <SummaryCard title="Matn bo‘laklari" value={summary.chunksTotal} hint="Jami chunklar" icon={<Database className="h-5 w-5" />} />
      </div>

      <Card>
        <CardContent className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="rounded-xl border bg-muted/40 p-2.5"><Sparkles className="h-5 w-5" /></div>
            <div className="min-w-0">
              <p className="font-medium">Embedding modeli</p>
              <p className="truncate text-sm text-muted-foreground">
                {embeddingStatus?.model ?? "—"} · {embeddingStatus?.dimensions ?? 0} o‘lcham · {embeddingStatus?.provider ?? "—"}
              </p>
            </div>
          </div>
          <Badge variant={embeddingStatus?.loaded ? "default" : "secondary"}>
            {embeddingStatus?.loaded ? "Model xotirada" : "Birinchi so‘rovda yuklanadi"}
          </Badge>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="grid gap-3 p-4 md:grid-cols-[1fr_190px_220px_auto]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Nomi yoki fayl bo‘yicha qidirish..." className="pl-9" />
          </div>
          <select value={statusFilter} onChange={(event: ChangeEvent<HTMLSelectElement>) => setStatusFilter(event.target.value as "all" | RAGDocumentStatus)} className="h-9 rounded-md border bg-background px-3 text-sm">
            <option value="all">Barcha statuslar</option>
            <option value="ready">Tayyor</option>
            <option value="processing">Qayta ishlanmoqda</option>
            <option value="failed">Xatolik</option>
            <option value="uploaded">Yuklandi</option>
          </select>
          <select value={taskFilter} onChange={(event: ChangeEvent<HTMLSelectElement>) => setTaskFilter(event.target.value)} className="h-9 rounded-md border bg-background px-3 text-sm">
            <option value="all">Barcha materiallar</option>
            <option value="general">Umumiy materiallar</option>
            {tasks.map((task) => <option key={task.id} value={task.id}>{task.title}</option>)}
          </select>
          <Button variant="outline" onClick={() => void reload()}><RefreshCcw /> Yangilash</Button>
        </CardContent>
      </Card>

      {filteredDocuments.length === 0 ? (
        <EmptyState
          title={documents.length ? "Filtr bo‘yicha material topilmadi" : "Bilimlar bazasi bo‘sh"}
          description={documents.length ? "Qidiruv yoki filtrlarni o‘zgartiring." : "AI Mentor foydalanishi uchun birinchi PDF yoki DOCX materialni yuklang."}
          action={!documents.length ? <Button onClick={() => setUploadOpen(true)}><UploadCloud /> Material yuklash</Button> : undefined}
        />
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {filteredDocuments.map((document) => {
            const task = document.task_id ? taskMap.get(document.task_id) : null;
            const embeddingPercent = document.chunk_count > 0
              ? Math.round((document.embedded_chunk_count / document.chunk_count) * 100)
              : 0;
            const isBusy = selectedDocument?.id === document.id && busyAction !== null;

            return (
              <Card key={document.id} className="overflow-hidden shadow-sm">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="mb-2 flex flex-wrap gap-2">
                        <DocumentStatusBadge status={document.status} />
                        <EmbeddingBadge document={document} />
                        <Badge variant="outline">{document.file_type.toUpperCase()}</Badge>
                      </div>
                      <CardTitle className="line-clamp-2 text-lg">{document.title}</CardTitle>
                      <p className="mt-1 truncate text-sm text-muted-foreground">{document.original_filename}</p>
                    </div>
                    <FileText className="h-7 w-7 shrink-0 text-muted-foreground" />
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div><p className="text-xs text-muted-foreground">Bog‘langan topshiriq</p><p className="mt-1 line-clamp-1 font-medium">{task?.title ?? "Umumiy material"}</p></div>
                    <div><p className="text-xs text-muted-foreground">Hajmi</p><p className="mt-1 font-medium">{formatBytes(document.file_size_bytes)}</p></div>
                    <div><p className="text-xs text-muted-foreground">Chunklar</p><p className="mt-1 font-medium">{document.chunk_count} ta</p></div>
                    <div><p className="text-xs text-muted-foreground">Yangilangan</p><p className="mt-1 font-medium">{formatDate(document.updated_at)}</p></div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Embedding: {document.embedded_chunk_count}/{document.chunk_count}</span>
                      <span>{embeddingPercent}%</span>
                    </div>
                    <Progress value={embeddingPercent} />
                  </div>

                  {document.processing_error ? (
                    <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{document.processing_error}</div>
                  ) : null}

                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => void openChunks(document)}><BookOpenCheck /> Chunklar</Button>
                    <Button size="sm" variant="outline" onClick={() => openEdit(document)}><Pencil /> Tahrirlash</Button>
                    <Button size="sm" onClick={() => void handleEmbed(document)} disabled={isBusy || document.status !== "ready"}>
                      {isBusy && busyAction === "embed" ? <Loader2 className="animate-spin" /> : <BrainCircuit />}
                      {document.embedding_status === "ready" ? "Qayta embedding" : "Embedding"}
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => { setSelectedDocument(document); setReprocessOpen(true); }} disabled={isBusy}>
                      <RefreshCcw /> Reprocess
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => { setSelectedDocument(document); setDeleteOpen(true); }} disabled={isBusy}>
                      <Trash2 />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg"><Search className="h-5 w-5" /> Semantik qidiruv testi</CardTitle>
          <p className="text-sm text-muted-foreground">Materiallar AI Mentor savoliga qanchalik mos topilishini tekshiring.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 lg:grid-cols-[1fr_260px_auto]">
            <Textarea value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Masalan: Kredit-modul tizimida mustaqil ta’limning ahamiyati nimada?" className="min-h-20" />
            <select value={searchDocumentId} onChange={(event: ChangeEvent<HTMLSelectElement>) => setSearchDocumentId(event.target.value)} className="min-h-10 rounded-md border bg-background px-3 text-sm">
              <option value="">Barcha embedded materiallar</option>
              {documents.filter((item) => item.embedding_status === "ready").map((document) => <option key={document.id} value={document.id}>{document.title}</option>)}
            </select>
            <Button className="self-end" onClick={() => void handleSemanticSearch()} disabled={searching || searchQuery.trim().length < 2}>
              {searching ? <Loader2 className="animate-spin" /> : <Search />} Qidirish
            </Button>
          </div>

          {searchResult ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm"><span className="font-medium">Topilgan natijalar</span><span className="text-muted-foreground">{searchResult.hits.length} ta</span></div>
              {searchResult.hits.length ? searchResult.hits.map((hit, index) => (
                <div key={`${hit.chunk.id}-${index}`} className="rounded-xl border p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="font-medium">{index + 1}. {hit.document.title}</div>
                    <Badge variant="secondary">{Math.round(hit.score * 100)}% mos</Badge>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">Matn bo‘lagi {hit.chunk.chunk_index + 1}{hit.chunk.page_number_start ? ` · ${hit.chunk.page_number_start}-bet` : ""}</p>
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-6">{hit.chunk.content}</p>
                </div>
              )) : <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">Mos natija topilmadi.</p>}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Dialog open={uploadOpen} onOpenChange={(open) => { setUploadOpen(open); if (!open && !uploading) resetUploadForm(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Yangi material yuklash</DialogTitle>
            <DialogDescription>PDF yoki DOCX material matnga ajratiladi va AI Mentor bilimlar bazasiga qo‘shiladi.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label htmlFor="rag-title">Material nomi</Label><Input id="rag-title" value={uploadTitle} onChange={(event) => setUploadTitle(event.target.value)} placeholder="Muhandislik grafikasi — 1-ma’ruza" /></div>
            <div className="space-y-2"><Label htmlFor="rag-task">Topshiriqqa bog‘lash</Label><select id="rag-task" value={uploadTaskId} onChange={(event: ChangeEvent<HTMLSelectElement>) => setUploadTaskId(event.target.value)} className="h-9 w-full rounded-md border bg-background px-3 text-sm"><option value="">Umumiy material</option>{tasks.map((task) => <option key={task.id} value={task.id}>{task.title}</option>)}</select><p className="text-xs text-muted-foreground">Umumiy material shu o‘qituvchining barcha talabalariga RAG kontekstida ko‘rinadi.</p></div>
            <div className="space-y-2"><Label htmlFor="rag-file">Fayl</Label><Input id="rag-file" type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={(event) => setUploadFile(event.target.files?.[0] ?? null)} /><p className="text-xs text-muted-foreground">PDF yoki DOCX, maksimal 25 MB.</p></div>
            <label className="flex items-start gap-3 rounded-lg border p-3 text-sm"><input type="checkbox" checked={autoEmbed} onChange={(event: ChangeEvent<HTMLInputElement>) => setAutoEmbed(event.target.checked)} className="mt-1" /><span><span className="font-medium">Yuklangach embedding yaratish</span><span className="mt-1 block text-xs text-muted-foreground">Birinchi ishga tushishda lokal model yuklanishi sabab biroz vaqt olishi mumkin.</span></span></label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadOpen(false)} disabled={uploading}>Bekor qilish</Button>
            <Button onClick={() => void handleUpload()} disabled={uploading || !uploadFile || uploadTitle.trim().length < 3}>{uploading ? <Loader2 className="animate-spin" /> : <UploadCloud />} Yuklash</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Materialni tahrirlash</DialogTitle><DialogDescription>Material nomi va topshiriq bilan bog‘lanishini yangilang.</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label htmlFor="edit-rag-title">Material nomi</Label><Input id="edit-rag-title" value={editTitle} onChange={(event) => setEditTitle(event.target.value)} /></div>
            <div className="space-y-2"><Label htmlFor="edit-rag-task">Topshiriq</Label><select id="edit-rag-task" value={editTaskId} onChange={(event: ChangeEvent<HTMLSelectElement>) => setEditTaskId(event.target.value)} className="h-9 w-full rounded-md border bg-background px-3 text-sm"><option value="">Umumiy material</option>{tasks.map((task) => <option key={task.id} value={task.id}>{task.title}</option>)}</select></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setEditOpen(false)} disabled={busyAction === "edit"}>Bekor qilish</Button><Button onClick={() => void handleEdit()} disabled={busyAction === "edit" || editTitle.trim().length < 3}>{busyAction === "edit" ? <Loader2 className="animate-spin" /> : <Pencil />} Saqlash</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={chunksOpen} onOpenChange={setChunksOpen}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-hidden">
          <DialogHeader><DialogTitle>{selectedDocument?.title ?? "Matn bo‘laklari"}</DialogTitle><DialogDescription>Ajratilgan chunklar va embedding holatini ko‘ring.</DialogDescription></DialogHeader>
          <div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={chunkQuery} onChange={(event) => setChunkQuery(event.target.value)} placeholder="Chunk matnidan qidirish..." className="pl-9" /></div>
          <div className="max-h-[60vh] space-y-3 overflow-y-auto pr-1">
            {chunksLoading ? <div className="flex justify-center py-12"><Loader2 className="h-7 w-7 animate-spin" /></div> : filteredChunks.length ? filteredChunks.map((chunk) => (
              <div key={chunk.id} className="rounded-xl border p-4">
                <div className="flex flex-wrap items-center justify-between gap-2"><div className="font-medium">Matn bo‘lagi {chunk.chunk_index + 1}</div><div className="flex gap-2"><Badge variant="outline">{chunk.char_count ?? chunk.content.length} belgi</Badge><Badge variant={chunk.embedding_model ? "default" : "secondary"}>{chunk.embedding_model ? "Embedded" : "Embedding yo‘q"}</Badge></div></div>
                <p className="mt-1 text-xs text-muted-foreground">{chunk.section_title ?? "Bo‘lim nomi aniqlanmagan"}{chunk.page_number_start ? ` · ${chunk.page_number_start}-bet` : ""}</p>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-6">{chunk.content}</p>
              </div>
            )) : <p className="py-12 text-center text-sm text-muted-foreground">Chunk topilmadi.</p>}
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setChunksOpen(false)}>Yopish</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={reprocessOpen} onOpenChange={setReprocessOpen}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Hujjatni qayta ishlaysizmi?</AlertDialogTitle><AlertDialogDescription>Eski chunklar va embeddinglar o‘chadi. Hujjat yangidan chunklanadi, so‘ng embeddingni qayta yaratish kerak bo‘ladi.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel disabled={busyAction === "reprocess"}>Bekor qilish</AlertDialogCancel><AlertDialogAction onClick={(event) => { event.preventDefault(); void handleReprocess(); }} disabled={busyAction === "reprocess"}>{busyAction === "reprocess" ? "Qayta ishlanmoqda..." : "Reprocess qilish"}</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Materialni o‘chirasizmi?</AlertDialogTitle><AlertDialogDescription>“{selectedDocument?.title}” hujjati, uning chunklari va embeddinglari butunlay o‘chiriladi. Bu amalni ortga qaytarib bo‘lmaydi.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel disabled={busyAction === "delete"}>Bekor qilish</AlertDialogCancel><AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={(event) => { event.preventDefault(); void handleDelete(); }} disabled={busyAction === "delete"}>{busyAction === "delete" ? "O‘chirilmoqda..." : "O‘chirish"}</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
