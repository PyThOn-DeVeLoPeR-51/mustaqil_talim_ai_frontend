"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ClipboardList,
  Eye,
  FileText,
  Paperclip,
  Pencil,
  RefreshCw,
  Trash2,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { getTeacherResults } from "@/api/results";
import { getStudents } from "@/api/students";
import {
  assignStudentsToTask,
  createTask as createTaskApi,
  deleteTask as deleteTaskApi,
  getTeacherTasks,
  updateTask as updateTaskApi,
} from "@/api/tasks";
import { PageHeader } from "@/components/shell/page-header";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { getFileUrl } from "@/lib/api";
import { getApiErrorMessage } from "@/lib/error";
import type { AssessmentStage, ResultRead, Student, TaskMode, TaskRead } from "@/types/api";

type TaskFilter = "all" | "active" | "inactive" | "etalon" | "optional";

type TaskStats = {
  assignedCount: number;
  attempts: number;
  evaluated: number;
  failed: number;
  pending: number;
  submittedStudents: number;
  avgScore: number | null;
  bestScore: number | null;
  progress: number;
  latestDate: string | null;
};

function defaultAcademicPeriod() {
  const year = new Date().getFullYear();
  return `${year}-${year + 1}`;
}

function assessmentStageLabel(stage?: AssessmentStage | null) {
  if (stage === "pretest") return "Boshlang‘ich diagnostika";
  if (stage === "posttest") return "Yakuniy nazorat";
  return "Haftalik/oraliq topshiriq";
}

function modeLabel(mode: TaskMode | string) {
  return mode === "etalon" ? "Etalon" : "Ixtiyoriy";
}

function modeBadgeVariant(mode: TaskMode | string) {
  return mode === "etalon" ? "default" : "secondary";
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

function formatDeadline(value?: string | null) {
  if (!value) return { label: "Muddat yo‘q", overdue: false };
  const date = new Date(value);
  const overdue = !Number.isNaN(date.getTime()) && date.getTime() < Date.now();
  return { label: formatDate(value), overdue };
}

function isImageUrl(url?: string | null) {
  if (!url) return false;
  const cleanUrl = url.replaceAll("\\", "/").split("?")[0] || "";
  return /\.(png|jpg|jpeg|webp|gif)$/i.test(cleanUrl);
}

function isPdfUrl(url?: string | null) {
  if (!url) return false;
  const cleanUrl = url.replaceAll("\\", "/").split("?")[0] || "";
  return /\.pdf$/i.test(cleanUrl);
}

function scoreText(score?: number | null) {
  return typeof score === "number" ? `${Math.round(score)}/100` : "—/100";
}

function calcTaskStats(task: TaskRead, results: ResultRead[]): TaskStats {
  const rows = results.filter((item) => item.task_id === task.id);
  const evaluatedRows = rows.filter((item) => item.status === "evaluated" && typeof item.total_score === "number");
  const scores = evaluatedRows.map((item) => Number(item.total_score));
  const submittedStudents = new Set(rows.map((item) => item.student_id)).size;
  const assignedCount = task.assigned_student_ids?.length ?? 0;
  const latestDate = rows.length
    ? rows.reduce((latest, item) => {
        const currentTime = new Date(item.created_at).getTime();
        const latestTime = latest ? new Date(latest).getTime() : 0;
        return currentTime > latestTime ? item.created_at : latest;
      }, rows[0].created_at)
    : null;

  return {
    assignedCount,
    attempts: rows.length,
    evaluated: evaluatedRows.length,
    failed: rows.filter((item) => item.status === "failed").length,
    pending: rows.filter((item) => item.status === "pending").length,
    submittedStudents,
    avgScore: scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null,
    bestScore: scores.length ? Math.round(Math.max(...scores)) : null,
    progress: assignedCount > 0 ? Math.round((submittedStudents / assignedCount) * 100) : 0,
    latestDate,
  };
}

function groupResultsByStudent(results: ResultRead[]) {
  const map = new Map<number, ResultRead[]>();
  for (const row of results) {
    const current = map.get(row.student_id) || [];
    current.push(row);
    map.set(row.student_id, current);
  }

  return [...map.entries()].map(([studentId, rows]) => {
    const sorted = [...rows].sort((a, b) => a.attempt_number - b.attempt_number);
    const evaluated = sorted.filter((row) => row.status === "evaluated" && typeof row.total_score === "number");
    const best = evaluated.length
      ? evaluated.reduce((a, b) => (Number(a.total_score) >= Number(b.total_score) ? a : b))
      : sorted[0];

    return {
      studentId,
      rows: sorted,
      attempts: sorted.length,
      bestScore: typeof best.total_score === "number" ? Math.round(best.total_score) : null,
      status: best.status,
      latest: sorted[sorted.length - 1],
    };
  });
}

function StatusBadge({ status }: { status: string }) {
  if (status === "evaluated") return <Badge>Baholandi</Badge>;
  if (status === "failed") return <Badge variant="destructive">Xatolik</Badge>;
  return <Badge variant="secondary">Kutilmoqda</Badge>;
}

function SummaryCard({
  title,
  value,
  hint,
  icon,
}: {
  title: string;
  value: string | number;
  hint: string;
  icon: React.ReactNode;
}) {
  return (
    <Card className="shadow-sm">
      <CardContent className="flex items-center justify-between gap-4 p-4">
        <div>
          <p className="text-xs text-muted-foreground">{title}</p>
          <div className="mt-1 text-2xl font-semibold tracking-tight">{value}</div>
          <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
        </div>
        <div className="rounded-2xl border bg-muted/30 p-3 text-muted-foreground">{icon}</div>
      </CardContent>
    </Card>
  );
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<TaskRead[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [results, setResults] = useState<ResultRead[]>([]);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<TaskFilter>("all");
  const [loading, setLoading] = useState(true);

  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<TaskMode>("etalon");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [topic, setTopic] = useState("");
  const [weekNumber, setWeekNumber] = useState("1");
  const [assessmentStage, setAssessmentStage] =
    useState<AssessmentStage>("intermediate");
  const [academicPeriod, setAcademicPeriod] = useState(defaultAcademicPeriod);
  const [deadline, setDeadline] = useState("");
  const [referenceFile, setReferenceFile] = useState<File | null>(null);
  const [instructionFile, setInstructionFile] = useState<File | null>(null);
  const [selectedStudentIds, setSelectedStudentIds] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<TaskRead | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editTopic, setEditTopic] = useState("");
  const [editWeekNumber, setEditWeekNumber] = useState("");
  const [editAssessmentStage, setEditAssessmentStage] =
    useState<AssessmentStage>("intermediate");
  const [editAcademicPeriod, setEditAcademicPeriod] = useState("");
  const [editActive, setEditActive] = useState(true);
  const [editAssignedIds, setEditAssignedIds] = useState<number[]>([]);
  const [savingEdit, setSavingEdit] = useState(false);

  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskRead | null>(null);

  const studentMap = useMemo(() => {
    return new Map(students.map((student) => [student.id, student]));
  }, [students]);

  const statsByTask = useMemo(() => {
    return new Map(tasks.map((task) => [task.id, calcTaskStats(task, results)]));
  }, [tasks, results]);

  const filteredTasks = useMemo(() => {
    const s = q.trim().toLowerCase();

    return tasks.filter((task) => {
      const assignedNames = (task.assigned_student_ids || [])
        .map((id) => studentMap.get(id)?.full_name || "")
        .join(" ")
        .toLowerCase();

      const matchesSearch = !s || [
        task.title,
        task.description,
        task.mode,
        task.id,
        assignedNames,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(s));

      const matchesFilter =
        filter === "all" ||
        (filter === "active" && task.is_active) ||
        (filter === "inactive" && !task.is_active) ||
        (filter === "etalon" && task.mode === "etalon") ||
        (filter === "optional" && task.mode === "optional");

      return matchesSearch && matchesFilter;
    });
  }, [tasks, q, filter, studentMap]);

  const summary = useMemo(() => {
    const evaluated = results.filter((item) => item.status === "evaluated" && typeof item.total_score === "number");
    const avg = evaluated.length
      ? Math.round(evaluated.reduce((sum, item) => sum + Number(item.total_score), 0) / evaluated.length)
      : 0;
    const active = tasks.filter((task) => task.is_active).length;
    const assignedSlots = tasks.reduce((sum, task) => sum + (task.assigned_student_ids?.length || 0), 0);

    return {
      total: tasks.length,
      active,
      inactive: tasks.length - active,
      etalon: tasks.filter((task) => task.mode === "etalon").length,
      optional: tasks.filter((task) => task.mode === "optional").length,
      assignedSlots,
      attempts: results.length,
      evaluated: evaluated.length,
      avg,
    };
  }, [tasks, results]);

  const parsedWeekNumber = Number(weekNumber);
  const hasValidWeek =
    assessmentStage !== "intermediate" ||
    (Number.isInteger(parsedWeekNumber) &&
      parsedWeekNumber >= 1 &&
      parsedWeekNumber <= 52);
  const canSave =
    title.trim().length >= 3 &&
    topic.trim().length >= 2 &&
    academicPeriod.trim().length >= 4 &&
    hasValidWeek &&
    (mode === "optional" || !!referenceFile);

  async function reload() {
    try {
      setLoading(true);
      const [taskRows, studentRows, resultRows] = await Promise.all([
        getTeacherTasks(),
        getStudents(),
        getTeacherResults(),
      ]);
      setTasks(taskRows || []);
      setStudents(studentRows || []);
      setResults(resultRows || []);
    } catch (error) {
      console.error(error);
      toast.error("Topshiriqlarni yuklashda xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reload();
  }, []);

  function toggleCreateStudent(studentId: number) {
    setSelectedStudentIds((prev) =>
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId]
    );
  }

  function toggleEditStudent(studentId: number) {
    setEditAssignedIds((prev) =>
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId]
    );
  }

  function resetCreateForm() {
    setTitle("");
    setDescription("");
    setTopic("");
    setWeekNumber("1");
    setAssessmentStage("intermediate");
    setAcademicPeriod(defaultAcademicPeriod());
    setDeadline("");
    setMode("etalon");
    setReferenceFile(null);
    setInstructionFile(null);
    setSelectedStudentIds([]);
  }

  async function createTask() {
    if (!canSave) return;

    try {
      setSaving(true);
      await createTaskApi({
        title: title.trim(),
        description: description.trim() || undefined,
        topic: topic.trim(),
        week_number:
          assessmentStage === "intermediate" ? parsedWeekNumber : undefined,
        assessment_stage: assessmentStage,
        academic_period: academicPeriod.trim(),
        mode,
        deadline: deadline ? new Date(deadline).toISOString() : undefined,
        assigned_student_ids: selectedStudentIds,
        reference_file: mode === "etalon" ? referenceFile : null,
        instruction_file: instructionFile,
      });

      toast.success("Topshiriq yaratildi");
      setOpen(false);
      resetCreateForm();
      await reload();
    } catch (error: unknown) {
      console.error(error);
      toast.error(getApiErrorMessage(error, "Topshiriq yaratishda xatolik bor"));
    } finally {
      setSaving(false);
    }
  }

  function openEdit(task: TaskRead) {
    setEditing(task);
    setEditTitle(task.title);
    setEditDescription(task.description || "");
    setEditTopic(task.topic || task.title);
    setEditWeekNumber(task.week_number ? String(task.week_number) : "");
    setEditAssessmentStage(task.assessment_stage || "intermediate");
    setEditAcademicPeriod(task.academic_period || defaultAcademicPeriod());
    setEditActive(task.is_active);
    setEditAssignedIds(task.assigned_student_ids || []);
    setEditOpen(true);
  }

  async function saveEdit() {
    if (!editing || editTitle.trim().length < 3) return;

    try {
      setSavingEdit(true);
      await updateTaskApi(editing.id, {
        title: editTitle.trim(),
        description: editDescription.trim() || undefined,
        topic: editTopic.trim() || undefined,
        week_number:
          editAssessmentStage === "intermediate" && editWeekNumber.trim()
            ? Number(editWeekNumber)
            : null,
        assessment_stage: editAssessmentStage,
        academic_period: editAcademicPeriod.trim() || null,
        is_active: editActive,
      });
      await assignStudentsToTask(editing.id, editAssignedIds);
      toast.success("Topshiriq yangilandi");
      setEditOpen(false);
      setEditing(null);
      await reload();
    } catch (error: unknown) {
      console.error(error);
      toast.error(getApiErrorMessage(error, "Topshiriqni yangilashda xatolik"));
    } finally {
      setSavingEdit(false);
    }
  }

  async function deleteTask(id: number) {
    try {
      await deleteTaskApi(id);
      toast.success("Topshiriq o‘chirildi");
      if (selectedTask?.id === id) {
        setDetailOpen(false);
        setSelectedTask(null);
      }
      await reload();
    } catch (error: unknown) {
      console.error(error);
      toast.error(getApiErrorMessage(error, "Topshiriqni o‘chirishda xatolik"));
    }
  }

  function openDetail(task: TaskRead) {
    setSelectedTask(task);
    setDetailOpen(true);
  }

  const selectedTaskResults = selectedTask
    ? results.filter((item) => item.task_id === selectedTask.id)
    : [];
  const selectedTaskStats = selectedTask
    ? statsByTask.get(selectedTask.id) || calcTaskStats(selectedTask, results)
    : null;
  const selectedTaskStudentGroups = groupResultsByStudent(selectedTaskResults);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Topshiriqlar"
        subtitle="Topshiriqlar, biriktirilgan talabalar, AI urinishlar va natijalar bitta joyda."
        right={
          <div className="flex gap-2">
            <Button variant="outline" onClick={reload} disabled={loading}>
              <RefreshCw className="mr-2 h-4 w-4" />
              {loading ? "Yuklanmoqda..." : "Yangilash"}
            </Button>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button>Topshiriq yaratish</Button>
              </DialogTrigger>
              <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Yangi topshiriq</DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                  <div className="grid gap-2">
                    <Label>Topshiriq nomi</Label>
                    <Input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Masalan: Detal chizmasi"
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="grid gap-2 md:col-span-2">
                      <Label>Mavzu</Label>
                      <Input
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        placeholder="Masalan: To‘g‘ri burchakli proyeksiyalar"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>Baholash bosqichi</Label>
                      <select
                        className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                        value={assessmentStage}
                        onChange={(e) =>
                          setAssessmentStage(e.target.value as AssessmentStage)
                        }
                      >
                        <option value="pretest">Boshlang‘ich diagnostika</option>
                        <option value="intermediate">Haftalik/oraliq</option>
                        <option value="posttest">Yakuniy nazorat</option>
                      </select>
                    </div>
                    <div className="grid gap-2">
                      <Label>Hafta raqami</Label>
                      <Input
                        type="number"
                        min={1}
                        max={52}
                        value={weekNumber}
                        disabled={assessmentStage !== "intermediate"}
                        onChange={(e) => setWeekNumber(e.target.value)}
                        placeholder="1"
                      />
                    </div>
                    <div className="grid gap-2 md:col-span-2">
                      <Label>Akademik davr</Label>
                      <Input
                        value={academicPeriod}
                        onChange={(e) => setAcademicPeriod(e.target.value)}
                        placeholder="2026-2027"
                      />
                      <p className="text-xs text-muted-foreground">
                        Ushbu ma’lumotlar Analytics chartlarida davr va hafta
                        bo‘yicha dinamikani to‘g‘ri chiqaradi.
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <div className="flex items-center justify-between gap-2">
                      <Label>Izoh</Label>
                      <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium hover:bg-muted/50">
                        <Paperclip className="h-4 w-4" />
                        Fayl biriktirish
                        <input
                          type="file"
                          accept=".pdf,.png,.jpg,.jpeg"
                          className="hidden"
                          onChange={(e) => setInstructionFile(e.target.files?.[0] || null)}
                        />
                      </label>
                    </div>
                    <Textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Masalan: Shu detal qismlariga qarab detalning to‘liq chizmasini bajaring..."
                    />
                    {instructionFile ? (
                      <div className="flex items-center justify-between gap-2 rounded-lg border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
                        <span className="truncate">Biriktirilgan fayl: {instructionFile.name}</span>
                        <Button type="button" size="sm" variant="ghost" onClick={() => setInstructionFile(null)}>
                          Olib tashlash
                        </Button>
                      </div>
                    ) : (
                      <div className="text-xs text-muted-foreground">
                        Ixtiyoriy: detal qismi, texnik topshiriq yoki ko‘rsatmani PDF/rasm ko‘rinishida biriktirishingiz mumkin.
                      </div>
                    )}
                  </div>

                  <div className="grid gap-2">
                    <Label>Muddat</Label>
                    <Input type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
                  </div>

                  <Tabs value={mode} onValueChange={(value) => setMode(value as TaskMode)}>
                    <TabsList>
                      <TabsTrigger value="etalon">Etalon</TabsTrigger>
                      <TabsTrigger value="optional">Ixtiyoriy</TabsTrigger>
                    </TabsList>

                    <TabsContent value="etalon" className="mt-3 space-y-3">
                      <div className="rounded-xl border bg-muted/20 p-4 text-sm text-muted-foreground">
                        Etalon rejimda backend talaba chizmasini shu reference file bilan taqqoslaydi.
                      </div>
                      <div className="grid gap-2">
                        <Label>Etalon/reference chizma</Label>
                        <Input type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={(e) => setReferenceFile(e.target.files?.[0] || null)} />
                        {referenceFile ? (
                          <div className="text-xs text-muted-foreground">Tanlandi: {referenceFile.name}</div>
                        ) : (
                          <div className="text-xs text-destructive">Etalon rejimda reference file majburiy.</div>
                        )}
                      </div>
                    </TabsContent>

                    <TabsContent value="optional" className="mt-3">
                      <div className="rounded-xl border bg-muted/20 p-4 text-sm text-muted-foreground">
                        Ixtiyoriy rejimda reference file kerak emas. AI chizmani umumiy qoidalar bo‘yicha baholaydi.
                      </div>
                    </TabsContent>
                  </Tabs>

                  <div className="grid gap-2">
                    <div className="flex items-center justify-between">
                      <Label>Talabalarga biriktirish</Label>
                      {students.length > 0 ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => setSelectedStudentIds(students.map((student) => student.id))}
                        >
                          Barchasini tanlash
                        </Button>
                      ) : null}
                    </div>
                    {students.length === 0 ? (
                      <div className="rounded-xl border bg-muted/20 p-4 text-sm text-muted-foreground">
                        Avval “Talabalar” bo‘limidan student yarating.
                      </div>
                    ) : (
                      <div className="max-h-52 space-y-2 overflow-y-auto rounded-xl border p-3">
                        {students.map((student) => (
                          <label key={student.id} className="flex cursor-pointer items-center gap-2 rounded-lg p-2 hover:bg-muted/40">
                            <input
                              type="checkbox"
                              checked={selectedStudentIds.includes(student.id)}
                              onChange={() => toggleCreateStudent(student.id)}
                            />
                            <span className="text-sm">
                              {student.full_name}
                              <span className="ml-2 text-xs text-muted-foreground">{student.login}</span>
                            </span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setOpen(false)}>
                    Bekor qilish
                  </Button>
                  <Button disabled={!canSave || saving} onClick={createTask}>
                    {saving ? "Saqlanmoqda..." : "Saqlash"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="Topshiriqlar"
          value={summary.total}
          hint={`Faol: ${summary.active} • Nofaol: ${summary.inactive}`}
          icon={<ClipboardList className="h-5 w-5" />}
        />
        <SummaryCard
          title="Rejimlar"
          value={`${summary.etalon}/${summary.optional}`}
          hint="Etalon / Ixtiyoriy"
          icon={<FileText className="h-5 w-5" />}
        />
        <SummaryCard
          title="Biriktirishlar"
          value={summary.assignedSlots}
          hint={`${students.length} ta talaba bazada bor`}
          icon={<Users className="h-5 w-5" />}
        />
        <SummaryCard
          title="AI natijalar"
          value={summary.evaluated}
          hint={`Urinishlar: ${summary.attempts} • O‘rtacha: ${summary.avg}/100`}
          icon={<CheckCircle2 className="h-5 w-5" />}
        />
      </div>

      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <div className="text-sm font-medium">Filtr va qidiruv</div>
              <div className="text-xs text-muted-foreground">Topshiriq, talaba ismi, ID yoki rejim bo‘yicha qidiring.</div>
            </div>
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Masalan: etalon, detal, Aliyev, Task ID..."
              className="xl:max-w-lg"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {([
              ["all", "Barchasi"],
              ["active", "Faol"],
              ["inactive", "Nofaol"],
              ["etalon", "Etalon"],
              ["optional", "Ixtiyoriy"],
            ] as [TaskFilter, string][]).map(([key, label]) => (
              <Button
                key={key}
                size="sm"
                variant={filter === key ? "default" : "outline"}
                onClick={() => setFilter(key)}
              >
                {label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Topshiriqni tahrirlash</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>Topshiriq nomi</Label>
              <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
            </div>

            <div className="grid gap-2">
              <Label>Izoh</Label>
              <Textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2 md:col-span-2">
                <Label>Mavzu</Label>
                <Input
                  value={editTopic}
                  onChange={(e) => setEditTopic(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label>Baholash bosqichi</Label>
                <select
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                  value={editAssessmentStage}
                  onChange={(e) =>
                    setEditAssessmentStage(e.target.value as AssessmentStage)
                  }
                >
                  <option value="pretest">Boshlang‘ich diagnostika</option>
                  <option value="intermediate">Haftalik/oraliq</option>
                  <option value="posttest">Yakuniy nazorat</option>
                </select>
              </div>
              <div className="grid gap-2">
                <Label>Hafta raqami</Label>
                <Input
                  type="number"
                  min={1}
                  max={52}
                  value={editWeekNumber}
                  disabled={editAssessmentStage !== "intermediate"}
                  onChange={(e) => setEditWeekNumber(e.target.value)}
                />
              </div>
              <div className="grid gap-2 md:col-span-2">
                <Label>Akademik davr</Label>
                <Input
                  value={editAcademicPeriod}
                  onChange={(e) => setEditAcademicPeriod(e.target.value)}
                />
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={editActive} onChange={(e) => setEditActive(e.target.checked)} />
              Topshiriq faol
            </label>

            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label>Biriktirilgan talabalar</Label>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setEditAssignedIds(students.map((student) => student.id))}
                >
                  Barchasini tanlash
                </Button>
              </div>
              <div className="max-h-52 space-y-2 overflow-y-auto rounded-xl border p-3">
                {students.map((student) => (
                  <label key={student.id} className="flex cursor-pointer items-center gap-2 rounded-lg p-2 hover:bg-muted/40">
                    <input
                      type="checkbox"
                      checked={editAssignedIds.includes(student.id)}
                      onChange={() => toggleEditStudent(student.id)}
                    />
                    <span className="text-sm">
                      {student.full_name}
                      <span className="ml-2 text-xs text-muted-foreground">{student.login}</span>
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditOpen(false)}>Bekor</Button>
            <Button onClick={saveEdit} disabled={editTitle.trim().length < 3 || savingEdit}>
              {savingEdit ? "Saqlanmoqda..." : "Saqlash"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-6xl">
          <DialogHeader>
            <DialogTitle>{selectedTask?.title || "Topshiriq tafsiloti"}</DialogTitle>
          </DialogHeader>

          {selectedTask && selectedTaskStats ? (
            <div className="space-y-5">
              <div className="grid gap-4 lg:grid-cols-3">
                <Card className="lg:col-span-2">
                  <CardContent className="space-y-3 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={modeBadgeVariant(selectedTask.mode)}>{modeLabel(selectedTask.mode)}</Badge>
                      <Badge variant={selectedTask.is_active ? "outline" : "destructive"}>
                        {selectedTask.is_active ? "Faol" : "Nofaol"}
                      </Badge>
                      <Badge variant="secondary">Task ID: {selectedTask.id}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {selectedTask.description || "Izoh kiritilmagan."}
                    </p>
                    {selectedTask.instruction_file_path ? (
                      <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-muted/20 p-3 text-sm">
                        <Paperclip className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Izohga biriktirilgan fayl:</span>
                        <Button asChild size="sm" variant="outline">
                          <a href={getFileUrl(selectedTask.instruction_file_path) || "#"} target="_blank" rel="noreferrer">
                            Faylni ochish
                          </a>
                        </Button>
                      </div>
                    ) : null}
                    <div className="grid gap-2 text-sm md:grid-cols-2">
                      <div>
                        <span className="text-muted-foreground">Yaratildi: </span>
                        {formatDate(selectedTask.created_at)}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Muddat: </span>
                        <span className={formatDeadline(selectedTask.deadline).overdue ? "text-destructive" : ""}>
                          {formatDeadline(selectedTask.deadline).label}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="space-y-3 p-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Yuborgan talabalar</span>
                      <span className="font-medium">{selectedTaskStats.submittedStudents}/{selectedTaskStats.assignedCount}</span>
                    </div>
                    <Progress value={Math.min(selectedTaskStats.progress, 100)} />
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="rounded-lg border p-2">
                        <div className="text-xs text-muted-foreground">Eng yaxshi</div>
                        <div className="font-semibold">{scoreText(selectedTaskStats.bestScore)}</div>
                      </div>
                      <div className="rounded-lg border p-2">
                        <div className="text-xs text-muted-foreground">O‘rtacha</div>
                        <div className="font-semibold">{scoreText(selectedTaskStats.avgScore)}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Tabs defaultValue="students">
                <TabsList className="flex flex-wrap">
                  <TabsTrigger value="students">Talabalar</TabsTrigger>
                  <TabsTrigger value="results">Natijalar</TabsTrigger>
                  <TabsTrigger value="reference">Reference</TabsTrigger>
                  <TabsTrigger value="instruction">Izoh fayli</TabsTrigger>
                </TabsList>

                <TabsContent value="students" className="mt-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Biriktirilgan talabalar</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {(selectedTask.assigned_student_ids || []).length === 0 ? (
                        <div className="rounded-xl border bg-muted/20 p-6 text-sm text-muted-foreground">
                          Bu topshiriqqa hali talaba biriktirilmagan.
                        </div>
                      ) : (
                        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                          {(selectedTask.assigned_student_ids || []).map((studentId) => {
                            const student = studentMap.get(studentId);
                            const group = selectedTaskStudentGroups.find((item) => item.studentId === studentId);
                            return (
                              <div key={studentId} className="rounded-xl border p-4">
                                <div className="font-medium">{student?.full_name || `Student #${studentId}`}</div>
                                <div className="mt-1 text-xs text-muted-foreground">{student?.login || "login topilmadi"}</div>
                                <div className="mt-3 flex flex-wrap gap-2">
                                  <Badge variant="secondary">{group?.attempts || 0}/2 urinish</Badge>
                                  <Badge variant="outline">Eng yaxshi: {scoreText(group?.bestScore ?? null)}</Badge>
                                  {group?.status ? <StatusBadge status={group.status} /> : <Badge variant="secondary">Yuborilmagan</Badge>}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="results" className="mt-4">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <CardTitle className="text-base">AI natijalar</CardTitle>
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/submissions?task=${selectedTask.id}`}>Natijalar sahifasiga o‘tish</Link>
                      </Button>
                    </CardHeader>
                    <CardContent>
                      {selectedTaskResults.length === 0 ? (
                        <div className="rounded-xl border bg-muted/20 p-6 text-sm text-muted-foreground">
                          Hali hech kim ushbu topshiriq bo‘yicha chizma yubormagan.
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full min-w-[850px] text-sm">
                            <thead className="border-b text-left text-muted-foreground">
                              <tr>
                                <th className="py-3 pr-4">Talaba</th>
                                <th className="py-3 pr-4">Urinish</th>
                                <th className="py-3 pr-4">Status</th>
                                <th className="py-3 pr-4">Ball</th>
                                <th className="py-3 pr-4">Sana</th>
                              </tr>
                            </thead>
                            <tbody>
                              {selectedTaskResults
                                .slice()
                                .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                                .map((row) => (
                                  <tr key={row.id} className="border-b last:border-0">
                                    <td className="py-3 pr-4">
                                      <div className="font-medium">{row.student_full_name || studentMap.get(row.student_id)?.full_name || `Student #${row.student_id}`}</div>
                                      <div className="text-xs text-muted-foreground">ID: {row.student_id}</div>
                                    </td>
                                    <td className="py-3 pr-4">{row.attempt_number}/2</td>
                                    <td className="py-3 pr-4"><StatusBadge status={row.status} /></td>
                                    <td className="py-3 pr-4 font-medium">{scoreText(row.total_score)}</td>
                                    <td className="py-3 pr-4">{formatDate(row.created_at)}</td>
                                  </tr>
                                ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="instruction" className="mt-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Izohga biriktirilgan fayl</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {selectedTask.instruction_file_path ? (() => {
                        const instructionUrl = getFileUrl(selectedTask.instruction_file_path);
                        const isPdf = instructionUrl?.toLowerCase().split("?")[0]?.endsWith(".pdf");

                        return (
                          <div className="space-y-4">
                            <Button asChild variant="outline">
                              <a href={instructionUrl || "#"} target="_blank" rel="noreferrer">
                                Izoh faylini ochish
                              </a>
                            </Button>
                            {isPdf ? (
                              <iframe src={instructionUrl || ""} className="h-[520px] w-full rounded-xl border" />
                            ) : isImageUrl(instructionUrl) ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={instructionUrl || ""}
                                alt="Izoh fayli"
                                className="max-h-[520px] w-full rounded-xl border object-contain"
                              />
                            ) : (
                              <div className="rounded-xl border bg-muted/20 p-6 text-sm text-muted-foreground">
                                Fayl preview uchun qo‘llab-quvvatlanmadi. “Izoh faylini ochish” tugmasi orqali ko‘ring.
                              </div>
                            )}
                          </div>
                        );
                      })() : (
                        <div className="rounded-xl border bg-muted/20 p-6 text-sm text-muted-foreground">
                          Bu topshiriqda izohga biriktirilgan qo‘shimcha fayl yo‘q.
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="reference" className="mt-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Reference fayl</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {selectedTask.reference_file_path ? (
                        (() => {
                          const referenceUrl = getFileUrl(selectedTask.reference_file_path);

                          return (
                            <div className="space-y-4">
                              <div className="flex flex-wrap items-center gap-2">
                                <Button asChild variant="outline">
                                  <a href={referenceUrl || "#"} target="_blank" rel="noreferrer">
                                    Reference faylni ochish
                                  </a>
                                </Button>
                                <span className="break-all text-xs text-muted-foreground">
                                  {selectedTask.reference_file_path}
                                </span>
                              </div>

                              {referenceUrl && isImageUrl(referenceUrl) ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={referenceUrl}
                                  alt="Reference"
                                  className="max-h-[620px] w-full rounded-xl border bg-white object-contain"
                                />
                              ) : referenceUrl && isPdfUrl(referenceUrl) ? (
                                <iframe
                                  src={referenceUrl}
                                  title="Reference PDF"
                                  className="h-[620px] w-full rounded-xl border bg-white"
                                />
                              ) : (
                                <div className="rounded-xl border bg-muted/20 p-6 text-sm text-muted-foreground">
                                  Reference fayl preview qilib bo‘lmadi. Yuqoridagi “Reference faylni ochish” tugmasi orqali ko‘ring.
                                </div>
                              )}
                            </div>
                          );
                        })()
                      ) : (
                        <div className="rounded-xl border bg-muted/20 p-6 text-sm text-muted-foreground">
                          Bu topshiriqda reference fayl yo‘q. Ixtiyoriy rejim uchun bu normal holat.
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Topshiriqlar ro‘yxati</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <div className="rounded-xl border bg-muted/20 p-6 text-sm text-muted-foreground">Yuklanmoqda...</div>
          ) : filteredTasks.length === 0 ? (
            <div className="rounded-xl border bg-muted/20 p-6 text-sm text-muted-foreground">
              Hozircha topshiriq yo‘q yoki filtr bo‘yicha topilmadi.
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredTasks.map((task) => {
                const fileUrl = getFileUrl(task.reference_file_path || null);
                const assignedCount = task.assigned_student_ids?.length ?? 0;
                const stats = statsByTask.get(task.id) || calcTaskStats(task, results);
                const deadlineInfo = formatDeadline(task.deadline);

                return (
                  <div key={task.id} className="rounded-2xl border bg-background p-4 shadow-sm">
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="truncate text-lg font-semibold">{task.title}</h3>
                          <Badge variant={modeBadgeVariant(task.mode)}>{modeLabel(task.mode)}</Badge>
                          <Badge variant={task.is_active ? "outline" : "destructive"}>{task.is_active ? "Faol" : "Nofaol"}</Badge>
                          <Badge variant="secondary">Task ID: {task.id}</Badge>
                        </div>

                        <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                          {task.description || "Izoh yo‘q"}
                        </p>

                        <div className="mt-3 grid gap-2 text-sm md:grid-cols-3">
                          <div className="rounded-xl border bg-muted/10 p-3">
                            <div className="text-xs text-muted-foreground">Talabalar</div>
                            <div className="font-semibold">{assignedCount} ta biriktirilgan</div>
                          </div>
                          <div className="rounded-xl border bg-muted/10 p-3">
                            <div className="text-xs text-muted-foreground">Urinishlar</div>
                            <div className="font-semibold">{stats.evaluated}/{stats.attempts} baholangan</div>
                          </div>
                          <div className="rounded-xl border bg-muted/10 p-3">
                            <div className="text-xs text-muted-foreground">Eng yaxshi ball</div>
                            <div className="font-semibold">{scoreText(stats.bestScore)}</div>
                          </div>
                        </div>

                        <div className="mt-3 space-y-2">
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>Yuborgan talabalar progressi</span>
                            <span>{stats.submittedStudents}/{assignedCount}</span>
                          </div>
                          <Progress value={Math.min(stats.progress, 100)} />
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                          <span>Yaratildi: {formatDate(task.created_at)}</span>
                          <span>Mavzu: {task.topic || "—"}</span>
                          <span>Davr: {task.academic_period || "—"}</span>
                          <span>
                            {assessmentStageLabel(task.assessment_stage)}
                            {task.week_number ? ` • ${task.week_number}-hafta` : ""}
                          </span>
                          <span>•</span>
                          <span className={deadlineInfo.overdue ? "font-medium text-destructive" : ""}>Muddat: {deadlineInfo.label}</span>
                          {stats.latestDate ? (
                            <>
                              <span>•</span>
                              <span>Oxirgi submission: {formatDate(stats.latestDate)}</span>
                            </>
                          ) : null}
                          {fileUrl ? (
                            <>
                              <span>•</span>
                              <a className="font-medium text-blue-600 hover:underline" href={fileUrl} target="_blank" rel="noreferrer">
                                Reference file
                              </a>
                            </>
                          ) : null}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 xl:justify-end">
                        <Button size="sm" variant="outline" onClick={() => openDetail(task)}>
                          <Eye className="mr-2 h-4 w-4" />
                          Batafsil
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => openEdit(task)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Tahrirlash
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="destructive">
                              <Trash2 className="mr-2 h-4 w-4" />
                              O‘chirish
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Topshiriqni o‘chirmoqchimisiz?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Bu amal qaytarilmaydi. Shu topshiriqqa tegishli submission va natijalar ham o‘chiriladi.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Bekor</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteTask(task.id)}>Ha, o‘chirish</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>

                    {(stats.failed > 0 || stats.pending > 0) ? (
                      <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                        <AlertCircle className="mt-0.5 h-4 w-4" />
                        <div>
                          Ushbu topshiriqda {stats.pending} ta kutilayotgan va {stats.failed} ta xatolik holati bor.
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
