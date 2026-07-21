"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Award,
  CheckCircle2,
  ClipboardCopy,
  Eye,
  FileText,
  GraduationCap,
  Lock,
  MoreHorizontal,
  Pencil,
  RefreshCw,
  Search,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { getTeacherResults } from "@/api/results";
import {
  createStudent,
  deleteStudent as deleteStudentApi,
  getStudents,
  updateStudent,
} from "@/api/students";
import { getTeacherTasks } from "@/api/tasks";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import type {
  ExperimentGroup,
  ResultRead,
  Student,
  TaskRead,
} from "@/types/api";

type StudentFilter =
  "all" | "active" | "inactive" | "submitted" | "not_submitted";

type StudentStats = {
  assignedTasks: number;
  attempts: number;
  submittedTasks: number;
  completedTasks: number;
  evaluated: number;
  pending: number;
  failed: number;
  avgScore: number | null;
  bestScore: number | null;
  progress: number;
  lastActivity: string | null;
};

type CreateForm = {
  full_name: string;
  university: string;
  direction: string;
  stage: string;
  group_name: string;
  experiment_group: "" | ExperimentGroup;
  cohort_year: string;
};

type EditForm = CreateForm & {
  is_active: boolean;
};

type CreatedCredentials = {
  student: Student;
  login: string;
  temporary_password: string;
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

function scoreText(score?: number | null) {
  return typeof score === "number" ? `${Math.round(score)}/100` : "—/100";
}

function statusLabel(status: string) {
  if (status === "evaluated") return "Baholandi";
  if (status === "failed") return "Xatolik";
  return "Kutilmoqda";
}

function modeLabel(mode: string) {
  return mode === "etalon" ? "Etalon" : "Ixtiyoriy";
}

function calcStudentStats(
  student: Student,
  tasks: TaskRead[],
  results: ResultRead[],
): StudentStats {
  const assignedTasks = tasks.filter((task) =>
    task.assigned_student_ids?.includes(student.id),
  );
  const rows = results.filter((item) => item.student_id === student.id);
  const evaluatedRows = rows.filter(
    (item) =>
      item.status === "evaluated" && typeof item.total_score === "number",
  );
  const scores = evaluatedRows.map((item) => Number(item.total_score));
  const submittedTaskIds = new Set(rows.map((item) => item.task_id));
  const completedTaskIds = new Set(evaluatedRows.map((item) => item.task_id));
  const lastActivity = rows.length
    ? rows.reduce((latest, item) => {
        const currentTime = new Date(item.created_at).getTime();
        const latestTime = latest ? new Date(latest).getTime() : 0;
        return currentTime > latestTime ? item.created_at : latest;
      }, rows[0].created_at)
    : null;

  return {
    assignedTasks: assignedTasks.length,
    attempts: rows.length,
    submittedTasks: submittedTaskIds.size,
    completedTasks: completedTaskIds.size,
    evaluated: evaluatedRows.length,
    pending: rows.filter((item) => item.status === "pending").length,
    failed: rows.filter((item) => item.status === "failed").length,
    avgScore: scores.length
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : null,
    bestScore: scores.length ? Math.round(Math.max(...scores)) : null,
    progress:
      assignedTasks.length > 0
        ? Math.round((submittedTaskIds.size / assignedTasks.length) * 100)
        : 0,
    lastActivity,
  };
}

function groupStudentResultsByTask(studentId: number, results: ResultRead[]) {
  const map = new Map<number, ResultRead[]>();
  for (const row of results.filter((item) => item.student_id === studentId)) {
    const current = map.get(row.task_id) || [];
    current.push(row);
    map.set(row.task_id, current);
  }

  return [...map.entries()].map(([taskId, rows]) => {
    const sorted = [...rows].sort(
      (a, b) => a.attempt_number - b.attempt_number,
    );
    const evaluated = sorted.filter(
      (item) =>
        item.status === "evaluated" && typeof item.total_score === "number",
    );
    const bestScore = evaluated.length
      ? Math.round(
          Math.max(...evaluated.map((item) => Number(item.total_score))),
        )
      : null;

    return {
      taskId,
      taskTitle: sorted[0]?.task_title || `Topshiriq #${taskId}`,
      rows: sorted,
      attempts: sorted.length,
      bestScore,
      latest: sorted[sorted.length - 1],
    };
  });
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
          <div className="mt-1 text-2xl font-semibold tracking-tight">
            {value}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
        </div>
        <div className="rounded-2xl border bg-muted/30 p-3 text-muted-foreground">
          {icon}
        </div>
      </CardContent>
    </Card>
  );
}

function ScoreBadge({ score }: { score?: number | null }) {
  if (typeof score !== "number")
    return <Badge variant="secondary">Baholanmagan</Badge>;
  if (score >= 86) return <Badge>{Math.round(score)}/100</Badge>;
  if (score >= 60)
    return <Badge variant="secondary">{Math.round(score)}/100</Badge>;
  return <Badge variant="destructive">{Math.round(score)}/100</Badge>;
}

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [tasks, setTasks] = useState<TaskRead[]>([]);
  const [results, setResults] = useState<ResultRead[]>([]);

  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<StudentFilter>("all");
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [createdCredentials, setCreatedCredentials] =
    useState<CreatedCredentials | null>(null);

  const [form, setForm] = useState<CreateForm>({
    full_name: "",
    university: "",
    direction: "",
    stage: "1-bosqich",
    group_name: "",
    experiment_group: "",
    cohort_year: String(new Date().getFullYear()),
  });

  const [editForm, setEditForm] = useState<EditForm>({
    full_name: "",
    university: "",
    direction: "",
    stage: "1-bosqich",
    group_name: "",
    experiment_group: "",
    cohort_year: String(new Date().getFullYear()),
    is_active: true,
  });

  async function loadAll() {
    try {
      setLoading(true);
      const [studentsData, tasksData, resultsData] = await Promise.all([
        getStudents(),
        getTeacherTasks(),
        getTeacherResults(),
      ]);

      setStudents(studentsData);
      setTasks(tasksData);
      setResults(resultsData);
    } catch (error) {
      console.error(error);
      toast.error("Talabalar ma’lumotlarini olishda xatolik yuz berdi.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  const statsByStudent = useMemo(() => {
    const map = new Map<number, StudentStats>();
    for (const student of students) {
      map.set(student.id, calcStudentStats(student, tasks, results));
    }
    return map;
  }, [students, tasks, results]);

  const filteredStudents = useMemo(() => {
    const search = q.trim().toLowerCase();

    return students.filter((student) => {
      const stats = statsByStudent.get(student.id);
      const matchesSearch =
        !search ||
        [
          student.full_name,
          student.university || "",
          student.direction || "",
          student.stage || "",
          student.group_name || "",
          student.experiment_group || "",
          student.cohort_year ? String(student.cohort_year) : "",
          student.login,
          String(student.id),
        ].some((value) => value.toLowerCase().includes(search));

      const matchesFilter =
        filter === "all" ||
        (filter === "active" && student.is_active) ||
        (filter === "inactive" && !student.is_active) ||
        (filter === "submitted" && (stats?.attempts || 0) > 0) ||
        (filter === "not_submitted" && (stats?.attempts || 0) === 0);

      return matchesSearch && matchesFilter;
    });
  }, [filter, q, statsByStudent, students]);

  const totalStats = useMemo(() => {
    const allStats = students
      .map((student) => statsByStudent.get(student.id))
      .filter(Boolean) as StudentStats[];
    const scores = allStats
      .map((item) => item.avgScore)
      .filter((item): item is number => typeof item === "number");

    return {
      students: students.length,
      active: students.filter((student) => student.is_active).length,
      inactive: students.filter((student) => !student.is_active).length,
      submitted: allStats.filter((item) => item.attempts > 0).length,
      avgScore: scores.length
        ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
        : null,
    };
  }, [statsByStudent, students]);

  const cohortYear = Number(form.cohort_year);
  const canCreate =
    form.full_name.trim().length >= 3 &&
    form.group_name.trim().length >= 1 &&
    form.experiment_group !== "" &&
    Number.isInteger(cohortYear) &&
    cohortYear >= 2000 &&
    cohortYear <= 2100;

  async function addStudent() {
    try {
      setCreating(true);
      setCreatedCredentials(null);

      const res = await createStudent({
        full_name: form.full_name.trim(),
        university: form.university.trim() || undefined,
        direction: form.direction.trim() || undefined,
        stage: form.stage.trim() || undefined,
        group_name: form.group_name.trim(),
        experiment_group: form.experiment_group || undefined,
        cohort_year: cohortYear,
      });

      setStudents((prev) => [res.student, ...prev]);
      setCreatedCredentials(res);
      setForm({
        full_name: "",
        university: "",
        direction: "",
        stage: "1-bosqich",
        group_name: "",
        experiment_group: "",
        cohort_year: String(new Date().getFullYear()),
      });
      setCreateOpen(false);
      toast.success(
        "Talaba qo‘shildi. Login/parolni nusxalab talabaga bering.",
      );
    } catch (error) {
      console.error(error);
      toast.error("Talaba qo‘shishda xatolik yuz berdi.");
    } finally {
      setCreating(false);
    }
  }

  function openDetail(student: Student) {
    setSelectedStudent(student);
    setDetailOpen(true);
  }

  function openEdit(student: Student) {
    setEditingStudent(student);
    setEditForm({
      full_name: student.full_name,
      university: student.university || "",
      direction: student.direction || "",
      stage: student.stage || "",
      group_name: student.group_name || "",
      experiment_group: student.experiment_group || "",
      cohort_year: student.cohort_year ? String(student.cohort_year) : "",
      is_active: student.is_active,
    });
    setEditOpen(true);
  }

  async function saveEdit() {
    if (!editingStudent) return;

    try {
      setSaving(true);
      const updated = await updateStudent(editingStudent.id, {
        full_name: editForm.full_name.trim(),
        university: editForm.university.trim() || undefined,
        direction: editForm.direction.trim() || undefined,
        stage: editForm.stage.trim() || undefined,
        group_name: editForm.group_name.trim() || undefined,
        experiment_group: editForm.experiment_group || null,
        cohort_year: editForm.cohort_year.trim()
          ? Number(editForm.cohort_year)
          : null,
        is_active: editForm.is_active,
      });

      setStudents((prev) =>
        prev.map((student) => (student.id === updated.id ? updated : student)),
      );
      setEditOpen(false);
      setEditingStudent(null);
      toast.success("Talaba ma’lumotlari yangilandi.");
    } catch (error) {
      console.error(error);
      toast.error("Talabani yangilashda xatolik yuz berdi.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(student: Student) {
    try {
      const updated = await updateStudent(student.id, {
        is_active: !student.is_active,
      });
      setStudents((prev) =>
        prev.map((item) => (item.id === updated.id ? updated : item)),
      );
      toast.success(
        updated.is_active ? "Talaba faollashtirildi." : "Talaba bloklandi.",
      );
    } catch (error) {
      console.error(error);
      toast.error("Holatni o‘zgartirishda xatolik yuz berdi.");
    }
  }

  async function removeStudent(id: number) {
    try {
      await deleteStudentApi(id);
      setStudents((prev) => prev.filter((student) => student.id !== id));
      toast.success("Talaba o‘chirildi.");
    } catch (error) {
      console.error(error);
      toast.error("Talabani o‘chirishda xatolik yuz berdi.");
    }
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Nusxalandi.");
    } catch {
      toast.error("Nusxalashda xatolik yuz berdi.");
    }
  }

  const selectedStats = selectedStudent
    ? statsByStudent.get(selectedStudent.id)
    : null;
  const selectedAssignedTasks = selectedStudent
    ? tasks.filter((task) =>
        task.assigned_student_ids?.includes(selectedStudent.id),
      )
    : [];
  const selectedTaskGroups = selectedStudent
    ? groupStudentResultsByTask(selectedStudent.id, results)
    : [];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Talabalar"
        subtitle="Talabalarni backend bazasiga biriktiring, login/parol bering va ularning progressini kuzating."
        right={
          <div className="flex gap-2">
            <Button variant="outline" onClick={loadAll} disabled={loading}>
              <RefreshCw
                className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`}
              />
              Yangilash
            </Button>
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Talaba +
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>Yangi talaba qo‘shish</DialogTitle>
                </DialogHeader>

                <div className="grid gap-4 py-2">
                  <div className="grid gap-2">
                    <Label>F.I.O</Label>
                    <Input
                      value={form.full_name}
                      onChange={(event) =>
                        setForm({ ...form, full_name: event.target.value })
                      }
                      placeholder="Familiya Ism Otasining ismi"
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label>OTM</Label>
                    <Input
                      value={form.university}
                      onChange={(event) =>
                        setForm({ ...form, university: event.target.value })
                      }
                      placeholder="Masalan: Namangan davlat texnika universiteti"
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label>Yo‘nalishi</Label>
                    <Input
                      value={form.direction}
                      onChange={(event) =>
                        setForm({ ...form, direction: event.target.value })
                      }
                      placeholder="Masalan: Muhandislik grafikasi"
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label>Bosqich</Label>
                    <Input
                      value={form.stage}
                      onChange={(event) =>
                        setForm({ ...form, stage: event.target.value })
                      }
                      placeholder="1-bosqich / 2-bosqich"
                    />
                  </div>

                  <div className="grid gap-2 md:grid-cols-2">
                    <div className="grid gap-2">
                      <Label>Guruh</Label>
                      <Input
                        value={form.group_name}
                        onChange={(event) =>
                          setForm({ ...form, group_name: event.target.value })
                        }
                        placeholder="Masalan: MG-101"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>Qabul yili</Label>
                      <Input
                        type="number"
                        min={2000}
                        max={2100}
                        value={form.cohort_year}
                        onChange={(event) =>
                          setForm({ ...form, cohort_year: event.target.value })
                        }
                        placeholder="2026"
                      />
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label>Tajriba-sinov turi</Label>
                    <select
                      className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                      value={form.experiment_group}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          experiment_group: event.target.value as
                            "" | ExperimentGroup,
                        })
                      }
                    >
                      <option value="">Turini tanlang</option>
                      <option value="experimental">Tajriba guruhi</option>
                      <option value="control">Nazorat guruhi</option>
                    </select>
                    <p className="text-xs text-muted-foreground">
                      Analytics guruh va tajriba turi bo‘yicha to‘g‘ri ishlashi
                      uchun ushbu maydonlar to‘ldiriladi.
                    </p>
                  </div>
                </div>

                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setCreateOpen(false)}
                  >
                    Bekor qilish
                  </Button>
                  <Button
                    onClick={addStudent}
                    disabled={!canCreate || creating}
                  >
                    {creating
                      ? "Saqlanmoqda..."
                      : "Saqlash va login/parol berish"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        }
      />

      {createdCredentials && (
        <Card className="border-emerald-200 bg-emerald-50/70">
          <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex items-center gap-2 font-semibold text-emerald-900">
                <UserCheck className="h-4 w-4" />
                Yangi talaba yaratildi: {createdCredentials.student.full_name}
              </div>
              <p className="mt-1 text-sm text-emerald-800">
                Parol faqat shu oynada ko‘rinadi. Nusxalab talabaga bering.
              </p>
            </div>
            <div className="flex flex-col gap-2 text-sm md:flex-row">
              <Button
                variant="outline"
                onClick={() => copy(createdCredentials.login)}
              >
                <ClipboardCopy className="mr-2 h-4 w-4" />
                Login: {createdCredentials.login}
              </Button>
              <Button
                variant="outline"
                onClick={() => copy(createdCredentials.temporary_password)}
              >
                <ClipboardCopy className="mr-2 h-4 w-4" />
                Parol: {createdCredentials.temporary_password}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="Jami talabalar"
          value={totalStats.students}
          hint={`${totalStats.active} faol, ${totalStats.inactive} bloklangan`}
          icon={<Users className="h-5 w-5" />}
        />
        <SummaryCard
          title="Topshiriq yuborganlar"
          value={totalStats.submitted}
          hint="Kamida bitta urinish yuborgan talabalar"
          icon={<FileText className="h-5 w-5" />}
        />
        <SummaryCard
          title="O‘rtacha ball"
          value={
            totalStats.avgScore !== null ? `${totalStats.avgScore}/100` : "—"
          }
          hint="Talabalar o‘rtacha natijasi"
          icon={<Award className="h-5 w-5" />}
        />
        <SummaryCard
          title="Faol holat"
          value={
            totalStats.students
              ? `${Math.round((totalStats.active / totalStats.students) * 100)}%`
              : "0%"
          }
          hint="Login qilishga ruxsat berilganlar ulushi"
          icon={<CheckCircle2 className="h-5 w-5" />}
        />
      </div>

      <Card>
        <CardContent className="space-y-4 p-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="relative w-full xl:max-w-xl">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={q}
                onChange={(event) => setQ(event.target.value)}
                placeholder="FIO, login, OTM, yo‘nalish yoki ID bo‘yicha qidirish..."
                className="pl-9"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {[
                ["all", "Barchasi"],
                ["active", "Faol"],
                ["inactive", "Bloklangan"],
                ["submitted", "Yuborgan"],
                ["not_submitted", "Yubormagan"],
              ].map(([key, label]) => (
                <Button
                  key={key}
                  size="sm"
                  variant={filter === key ? "default" : "outline"}
                  onClick={() => setFilter(key as StudentFilter)}
                >
                  {label}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Talabani tahrirlash</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>F.I.O</Label>
              <Input
                value={editForm.full_name}
                onChange={(event) =>
                  setEditForm({ ...editForm, full_name: event.target.value })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label>OTM</Label>
              <Input
                value={editForm.university}
                onChange={(event) =>
                  setEditForm({ ...editForm, university: event.target.value })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label>Yo‘nalishi</Label>
              <Input
                value={editForm.direction}
                onChange={(event) =>
                  setEditForm({ ...editForm, direction: event.target.value })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label>Bosqich</Label>
              <Input
                value={editForm.stage}
                onChange={(event) =>
                  setEditForm({ ...editForm, stage: event.target.value })
                }
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label>Guruh</Label>
                <Input
                  value={editForm.group_name}
                  onChange={(event) =>
                    setEditForm({ ...editForm, group_name: event.target.value })
                  }
                  placeholder="Masalan: MG-101"
                />
              </div>
              <div className="grid gap-2">
                <Label>Qabul yili</Label>
                <Input
                  type="number"
                  min={2000}
                  max={2100}
                  value={editForm.cohort_year}
                  onChange={(event) =>
                    setEditForm({
                      ...editForm,
                      cohort_year: event.target.value,
                    })
                  }
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Tajriba-sinov turi</Label>
              <select
                className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                value={editForm.experiment_group}
                onChange={(event) =>
                  setEditForm({
                    ...editForm,
                    experiment_group: event.target.value as
                      "" | ExperimentGroup,
                  })
                }
              >
                <option value="">Belgilanmagan</option>
                <option value="experimental">Tajriba guruhi</option>
                <option value="control">Nazorat guruhi</option>
              </select>
            </div>
            <label className="flex items-center gap-2 rounded-lg border p-3 text-sm">
              <input
                type="checkbox"
                checked={editForm.is_active}
                onChange={(event) =>
                  setEditForm({ ...editForm, is_active: event.target.checked })
                }
              />
              Talaba faol bo‘lsin
            </label>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Bekor
            </Button>
            <Button onClick={saveEdit} disabled={saving}>
              {saving ? "Saqlanmoqda..." : "Saqlash"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-h-[88vh] max-w-5xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedStudent?.full_name || "Talaba tafsilotlari"}
            </DialogTitle>
          </DialogHeader>

          {selectedStudent && (
            <div className="space-y-5">
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <SummaryCard
                  title="Biriktirilgan"
                  value={selectedStats?.assignedTasks || 0}
                  hint="Topshiriqlar soni"
                  icon={<FileText className="h-5 w-5" />}
                />
                <SummaryCard
                  title="Urinishlar"
                  value={selectedStats?.attempts || 0}
                  hint={`${selectedStats?.completedTasks || 0} task baholangan`}
                  icon={<ClipboardCopy className="h-5 w-5" />}
                />
                <SummaryCard
                  title="Eng yaxshi ball"
                  value={
                    selectedStats?.bestScore !== null
                      ? `${selectedStats?.bestScore}/100`
                      : "—"
                  }
                  hint="AI baholagan eng yuqori natija"
                  icon={<Award className="h-5 w-5" />}
                />
                <SummaryCard
                  title="Progress"
                  value={`${selectedStats?.progress || 0}%`}
                  hint="Yuborilgan tasklar ulushi"
                  icon={<CheckCircle2 className="h-5 w-5" />}
                />
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    Login ma’lumotlari
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-xl border p-3">
                    <p className="text-xs text-muted-foreground">Login</p>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <span className="font-mono text-sm">
                        {selectedStudent.login}
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copy(selectedStudent.login)}
                      >
                        Copy
                      </Button>
                    </div>
                  </div>
                  <div className="rounded-xl border p-3">
                    <p className="text-xs text-muted-foreground">Holat</p>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <Badge
                        variant={
                          selectedStudent.is_active ? "outline" : "destructive"
                        }
                      >
                        {selectedStudent.is_active ? "Faol" : "Bloklangan"}
                      </Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => toggleActive(selectedStudent)}
                      >
                        {selectedStudent.is_active
                          ? "Bloklash"
                          : "Faollashtirish"}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    Biriktirilgan topshiriqlar
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {selectedAssignedTasks.map((task) => {
                    const rows = results.filter(
                      (item) =>
                        item.student_id === selectedStudent.id &&
                        item.task_id === task.id,
                    );
                    const evaluated = rows.filter(
                      (item) =>
                        item.status === "evaluated" &&
                        typeof item.total_score === "number",
                    );
                    const best = evaluated.length
                      ? Math.max(
                          ...evaluated.map((item) => Number(item.total_score)),
                        )
                      : null;

                    return (
                      <div key={task.id} className="rounded-xl border p-3">
                        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-medium">{task.title}</p>
                              <Badge
                                variant={
                                  task.mode === "etalon"
                                    ? "default"
                                    : "secondary"
                                }
                              >
                                {modeLabel(task.mode)}
                              </Badge>
                              <Badge
                                variant={
                                  task.is_active ? "outline" : "destructive"
                                }
                              >
                                {task.is_active ? "Faol" : "Nofaol"}
                              </Badge>
                            </div>
                            <p className="mt-1 text-xs text-muted-foreground">
                              Task #{task.id} • {rows.length}/2 urinish •
                              Deadline: {formatDate(task.deadline)}
                            </p>
                          </div>
                          <ScoreBadge score={best} />
                        </div>
                        <Progress
                          className="mt-3"
                          value={Math.min(
                            100,
                            Math.round((rows.length / 2) * 100),
                          )}
                        />
                      </div>
                    );
                  })}

                  {selectedAssignedTasks.length === 0 && (
                    <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                      Bu talabaga hali topshiriq biriktirilmagan.
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Natijalar tarixi</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {selectedTaskGroups.map((group) => (
                    <div key={group.taskId} className="rounded-xl border p-3">
                      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                        <div>
                          <p className="font-medium">{group.taskTitle}</p>
                          <p className="text-xs text-muted-foreground">
                            Task #{group.taskId} • {group.attempts}/2 urinish •
                            Oxirgi: {formatDate(group.latest?.created_at)}
                          </p>
                        </div>
                        <ScoreBadge score={group.bestScore} />
                      </div>

                      <div className="mt-3 grid gap-2 md:grid-cols-2">
                        {group.rows.map((row) => (
                          <div
                            key={row.id}
                            className="rounded-lg bg-muted/30 p-3 text-sm"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span>{row.attempt_number}-urinish</span>
                              <Badge
                                variant={
                                  row.status === "failed"
                                    ? "destructive"
                                    : row.status === "evaluated"
                                      ? "outline"
                                      : "secondary"
                                }
                              >
                                {statusLabel(row.status)}
                              </Badge>
                            </div>
                            <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                              <span>{formatDate(row.created_at)}</span>
                              <span className="font-semibold text-foreground">
                                {scoreText(row.total_score)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}

                  {selectedTaskGroups.length === 0 && (
                    <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                      Bu talaba hali chizma yubormagan.
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Card>
        <CardContent className="pt-6">
          <div className="overflow-x-auto">
            <Table className="min-w-[1180px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Talaba</TableHead>
                  <TableHead>Login</TableHead>
                  <TableHead>Yo‘nalish</TableHead>
                  <TableHead>Topshiriqlar</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Natija</TableHead>
                  <TableHead>Oxirgi faollik</TableHead>
                  <TableHead className="text-right">Amallar</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {filteredStudents.map((student) => {
                  const stats = statsByStudent.get(student.id);

                  return (
                    <TableRow key={student.id}>
                      <TableCell>
                        <div className="flex items-start gap-3">
                          <div className="rounded-2xl border bg-muted/30 p-2 text-muted-foreground">
                            <GraduationCap className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="font-medium">
                              {student.full_name}
                            </div>
                            <div className="mt-1 text-xs text-muted-foreground">
                              ID #{student.id} •{" "}
                              {student.university || "OTM kiritilmagan"}
                            </div>
                            <div className="mt-2">
                              <Badge
                                variant={
                                  student.is_active ? "outline" : "destructive"
                                }
                              >
                                {student.is_active ? "Faol" : "Bloklangan"}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs">
                            {student.login}
                          </span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => copy(student.login)}
                          >
                            Copy
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {student.direction || "—"}
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {student.stage || "Bosqich kiritilmagan"}
                          {student.group_name ? ` • ${student.group_name}` : ""}
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {student.experiment_group === "experimental"
                            ? "Tajriba guruhi"
                            : student.experiment_group === "control"
                              ? "Nazorat guruhi"
                              : "Tajriba turi belgilanmagan"}
                          {student.cohort_year
                            ? ` • ${student.cohort_year}`
                            : ""}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm font-medium">
                          {stats?.submittedTasks || 0}/
                          {stats?.assignedTasks || 0} task
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {stats?.attempts || 0} urinish,{" "}
                          {stats?.evaluated || 0} baholangan
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="min-w-[150px]">
                          <div className="mb-1 flex items-center justify-between text-xs">
                            <span>{stats?.progress || 0}%</span>
                            <span className="text-muted-foreground">
                              {stats?.completedTasks || 0} tugallangan
                            </span>
                          </div>
                          <Progress value={stats?.progress || 0} />
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <ScoreBadge score={stats?.bestScore} />
                          <span className="text-xs text-muted-foreground">
                            O‘rtacha: {scoreText(stats?.avgScore)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {formatDate(stats?.lastActivity)}
                        </div>
                        {(stats?.failed || 0) > 0 && (
                          <div className="mt-1 flex items-center gap-1 text-xs text-destructive">
                            <AlertCircle className="h-3 w-3" />
                            {stats?.failed} xatolik
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="sm" variant="outline">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="end"
                            side="right"
                            sideOffset={8}
                          >
                            <DropdownMenuItem
                              onClick={() => openDetail(student)}
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              Batafsil
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openEdit(student)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Tahrirlash
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => toggleActive(student)}
                            >
                              <Lock className="mr-2 h-4 w-4" />
                              {student.is_active
                                ? "Bloklash"
                                : "Faollashtirish"}
                            </DropdownMenuItem>
                            <Separator className="my-1" />
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onSelect={(event) => event.preventDefault()}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  O‘chirish
                                </DropdownMenuItem>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>
                                    Talabani o‘chirmoqchimisiz?
                                  </AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Bu amal qaytarilmaydi. Talaba, uning task
                                    biriktirishlari va natijalari backend
                                    bazasidan o‘chiriladi.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Bekor</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => removeStudent(student.id)}
                                  >
                                    Ha, o‘chirish
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}

                {filteredStudents.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="py-10 text-center text-muted-foreground"
                    >
                      {loading ? "Yuklanmoqda..." : "Talabalar topilmadi."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
