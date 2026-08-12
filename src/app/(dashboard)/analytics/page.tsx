"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  CircleOff,
  Download,
  Loader2,
  RefreshCw,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";

import { getTeacherAnalytics } from "@/api/analytics";
import { ChartCard } from "@/components/analytics/chart-card";
import {
  DonutChart,
  GroupBarChart,
  HeatmapChart,
  LineProgressChart,
  ModeBarChart,
  RadarChart,
} from "@/components/analytics/charts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type {
  ExperimentGroup,
  TaskMode,
  TeacherAnalyticsParams,
  TeacherAnalyticsRead,
} from "@/types/api";

const DISTRIBUTION_COLORS = {
  high: "#16a34a",
  good: "#2563eb",
  satisfactory: "#d97706",
  low: "#dc2626",
} as const;

const selectClass =
  "h-10 w-full rounded-md border bg-background px-3 text-sm outline-none transition focus:ring-2 focus:ring-ring";

function formatScore(value: number | null, suffix = "") {
  return value === null ? "—" : `${value.toFixed(1)}${suffix}`;
}

function formatSignedScore(value: number | null) {
  if (value === null) return "—";
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}`;
}

function formatPercent(value: number | null) {
  if (value === null) return "—";
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
}

function formatPValue(value: number | null) {
  if (value === null) return "—";
  if (value < 0.001) return "<0.001";
  return value.toFixed(3);
}

function stageLabel(value: string) {
  if (value === "pretest") return "Boshlang‘ich";
  if (value === "intermediate") return "Oraliq";
  if (value === "posttest") return "Yakuniy";
  return value;
}

function experimentGroupLabel(value: ExperimentGroup | null | undefined) {
  if (value === "experimental") return "Tajriba";
  if (value === "control") return "Nazorat";
  return "—";
}

function csvCell(value: unknown) {
  if (value === null || value === undefined) return "";
  const text = String(value).replace(/"/g, '""');
  return `"${text}"`;
}

function exportRowsAsCsv(rows: TeacherAnalyticsRead["export_rows"]) {
  const headers = [
    "Talaba ID",
    "F.I.Sh.",
    "Guruh",
    "Tajriba turi",
    "Boshlang‘ich",
    "1-hafta",
    "2-hafta",
    "3-hafta",
    "4-hafta",
    "Yakuniy",
    "O‘rtacha",
    "O‘sish",
    "Muvaffaqiyat",
  ];

  const csv = [
    headers.map(csvCell).join(","),
    ...rows.map((row) =>
      [
        row.student_id,
        row.name,
        row.group_name ?? "",
        experimentGroupLabel(row.experiment_group),
        row.pretest,
        row.week_1,
        row.week_2,
        row.week_3,
        row.week_4,
        row.posttest,
        row.average,
        row.growth,
        row.success === null ? "" : row.success ? "Ha" : "Yo‘q",
      ]
        .map(csvCell)
        .join(","),
    ),
  ].join("\n");

  const blob = new Blob([`\uFEFF${csv}`], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "analytics-v2-scientific-export.csv";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function MetricCard({
  title,
  value,
  hint,
  icon,
  positive,
}: {
  title: string;
  value: string;
  hint: string;
  icon: ReactNode;
  positive?: boolean;
}) {
  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className="text-muted-foreground">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-semibold tracking-tight">{value}</div>
        <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
          {positive === true ? (
            <ArrowUpRight className="h-3.5 w-3.5 text-emerald-600" />
          ) : null}
          {positive === false ? (
            <ArrowDownRight className="h-3.5 w-3.5 text-red-600" />
          ) : null}
          {hint}
        </div>
      </CardContent>
    </Card>
  );
}

export default function AnalyticsPage() {
  const [group, setGroup] = useState("all");
  const [studentId, setStudentId] = useState("all");
  const [experimentType, setExperimentType] = useState<
    "all" | ExperimentGroup
  >("all");
  const [taskMode, setTaskMode] = useState<"all" | TaskMode>("all");
  const [topic, setTopic] = useState("all");
  const [weekNumber, setWeekNumber] = useState("all");
  const [assessmentStage, setAssessmentStage] = useState("all");
  const [academicPeriod, setAcademicPeriod] = useState("all");

  const [analytics, setAnalytics] = useState<TeacherAnalyticsRead | null>(null);
  const [baseline, setBaseline] = useState<TeacherAnalyticsRead | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const requestIdRef = useRef(0);

  const hasActiveFilters =
    group !== "all" ||
    studentId !== "all" ||
    experimentType !== "all" ||
    taskMode !== "all" ||
    topic !== "all" ||
    weekNumber !== "all" ||
    assessmentStage !== "all" ||
    academicPeriod !== "all";

  const requestParams = useMemo<TeacherAnalyticsParams>(() => {
    const params: TeacherAnalyticsParams = {};

    if (group !== "all") params.group_name = group;
    if (studentId !== "all") params.student_id = Number(studentId);
    if (experimentType !== "all") {
      params.experiment_group = experimentType;
    }
    if (taskMode !== "all") params.mode = taskMode;
    if (topic !== "all") params.topic = topic;
    if (weekNumber !== "all") params.week_number = Number(weekNumber);
    if (assessmentStage !== "all") {
      params.assessment_stage = assessmentStage as TeacherAnalyticsParams["assessment_stage"];
    }
    if (academicPeriod !== "all") params.academic_period = academicPeriod;

    return params;
  }, [
    academicPeriod,
    assessmentStage,
    experimentType,
    group,
    studentId,
    taskMode,
    topic,
    weekNumber,
  ]);

  const loadAnalytics = useCallback(async () => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    setLoading(true);
    setError(null);

    try {
      if (hasActiveFilters) {
        const [filteredResponse, baselineResponse] = await Promise.all([
          getTeacherAnalytics(requestParams),
          getTeacherAnalytics(),
        ]);

        if (requestId !== requestIdRef.current) return;

        setAnalytics(filteredResponse);
        setBaseline(baselineResponse);
      } else {
        const response = await getTeacherAnalytics();

        if (requestId !== requestIdRef.current) return;

        setAnalytics(response);
        setBaseline(response);
      }
    } catch (caughtError) {
      if (requestId !== requestIdRef.current) return;

      console.error(caughtError);
      setError(
        "Analytics ma’lumotlarini yuklab bo‘lmadi. Backend ishlayotganini va o‘qituvchi sessiyasini tekshiring.",
      );
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, [hasActiveFilters, requestParams]);

  useEffect(() => {
    void loadAnalytics();
  }, [loadAnalytics, reloadKey]);

  const allStudentOptions = useMemo(
    () => baseline?.filters.students ?? analytics?.filters.students ?? [],
    [analytics, baseline],
  );

  const studentOptions = useMemo(() => {
    return allStudentOptions.filter((student) => {
      if (group !== "all" && student.group_name !== group) return false;
      if (
        experimentType !== "all" &&
        student.experiment_group !== experimentType
      ) {
        return false;
      }
      return true;
    });
  }, [allStudentOptions, experimentType, group]);

  const scopeLabel = useMemo(() => {
    if (studentId !== "all") {
      return (
        studentOptions.find((student) => student.id === Number(studentId))
          ?.full_name ?? "Tanlangan talaba"
      );
    }

    if (group !== "all") return `${group} guruhi`;
    if (experimentType === "experimental") return "Tajriba guruhi";
    if (experimentType === "control") return "Nazorat guruhi";
    if (taskMode === "etalon") return "Etalon topshiriqlar";
    if (taskMode === "optional") return "Ixtiyoriy topshiriqlar";
    if (topic !== "all") return `${topic} mavzusi`;
    if (assessmentStage !== "all") return `${stageLabel(assessmentStage)} bosqichi`;
    if (academicPeriod !== "all") return `${academicPeriod} davri`;

    return "Barcha talabalar";
  }, [
    academicPeriod,
    assessmentStage,
    experimentType,
    group,
    studentId,
    studentOptions,
    taskMode,
    topic,
  ]);

  function updateGroup(nextGroup: string) {
    setGroup(nextGroup);

    if (studentId === "all") return;

    const selectedStudent = allStudentOptions.find(
      (student) => student.id === Number(studentId),
    );

    if (
      !selectedStudent ||
      (nextGroup !== "all" && selectedStudent.group_name !== nextGroup)
    ) {
      setStudentId("all");
    }
  }

  function updateExperimentType(
    nextExperimentType: "all" | ExperimentGroup,
  ) {
    setExperimentType(nextExperimentType);

    if (studentId === "all") return;

    const selectedStudent = allStudentOptions.find(
      (student) => student.id === Number(studentId),
    );

    if (
      !selectedStudent ||
      (nextExperimentType !== "all" &&
        selectedStudent.experiment_group !== nextExperimentType)
    ) {
      setStudentId("all");
    }
  }

  function resetFilters() {
    setGroup("all");
    setStudentId("all");
    setExperimentType("all");
    setTaskMode("all");
    setTopic("all");
    setWeekNumber("all");
    setAssessmentStage("all");
    setAcademicPeriod("all");
  }

  if (loading && !analytics) {
    return (
      <Card className="shadow-sm">
        <CardContent className="flex min-h-80 flex-col items-center justify-center gap-3 p-8 text-center">
          <Loader2 className="h-9 w-9 animate-spin text-primary" />
          <div>
            <h1 className="font-semibold">Analytics yuklanmoqda</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Talabalar natijalari va diagrammalar tayyorlanmoqda.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error && !analytics) {
    return (
      <Card className="border-red-200 shadow-sm">
        <CardContent className="flex min-h-80 flex-col items-center justify-center p-8 text-center">
          <AlertCircle className="h-10 w-10 text-red-600" />
          <h1 className="mt-4 text-lg font-semibold">Ma’lumot yuklanmadi</h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
            {error}
          </p>
          <Button
            type="button"
            variant="outline"
            className="mt-5"
            onClick={() => setReloadKey((value) => value + 1)}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Qayta urinish
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!analytics) return null;

  const { summary, progress, filters } = analytics;
  const hasMatchingStudents = summary.student_count > 0;
  const hasEvaluatedResults = summary.evaluated_student_count > 0;

  const distribution = analytics.distribution.map((item) => ({
    label: item.label,
    value: item.value,
    color: DISTRIBUTION_COLORS[item.key],
  }));

  const heatmapRows = analytics.heatmap.map((row) => ({
    name: row.name,
    values: row.values,
  }));

  const growthPositive =
    summary.growth === null ? undefined : summary.growth >= 0;
  const successPositive =
    summary.success_rate === null ? undefined : summary.success_rate >= 70;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
            <Badge variant="secondary">Real backend ma’lumotlari</Badge>
            {loading ? (
              <Badge variant="outline" className="gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                Yangilanmoqda
              </Badge>
            ) : null}
          </div>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
            O‘qituvchi faqat o‘zi biriktirgan talabalar natijalarini guruh,
            talaba, tajriba turi, topshiriq rejimi, mavzu, hafta, baholash
            bosqichi va akademik davr bo‘yicha tahlil qiladi.
          </p>
        </div>
        <Button type="button" variant="outline" onClick={resetFilters}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Filtrlarni tozalash
        </Button>
      </div>

      {error ? (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <span>{error}</span>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setReloadKey((value) => value + 1)}
          >
            Qayta urinish
          </Button>
        </div>
      ) : null}

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Tahlil filtrlari</CardTitle>
          <p className="text-sm text-muted-foreground">
            Filtrlar o‘zgarganda metrikalar va diagrammalar backenddan qayta
            hisoblanadi.
          </p>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <label className="space-y-2 text-sm font-medium">
            <span>Guruh</span>
            <select
              className={selectClass}
              value={group}
              onChange={(event) => updateGroup(event.target.value)}
            >
              <option value="all">Barcha guruhlar</option>
              {filters.groups.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2 text-sm font-medium">
            <span>Tajriba-sinov turi</span>
            <select
              className={selectClass}
              value={experimentType}
              onChange={(event) =>
                updateExperimentType(
                  event.target.value as "all" | ExperimentGroup,
                )
              }
            >
              <option value="all">Barchasi</option>
              <option value="experimental">Tajriba guruhi</option>
              <option value="control">Nazorat guruhi</option>
            </select>
          </label>

          <label className="space-y-2 text-sm font-medium">
            <span>Talaba</span>
            <select
              className={selectClass}
              value={studentId}
              onChange={(event) => setStudentId(event.target.value)}
            >
              <option value="all">Barcha talabalar</option>
              {studentOptions.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.full_name}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2 text-sm font-medium">
            <span>Topshiriq rejimi</span>
            <select
              className={selectClass}
              value={taskMode}
              onChange={(event) =>
                setTaskMode(event.target.value as "all" | TaskMode)
              }
            >
              <option value="all">Barcha rejimlar</option>
              <option value="etalon">Etalon</option>
              <option value="optional">Ixtiyoriy</option>
            </select>
          </label>

          <label className="space-y-2 text-sm font-medium">
            <span>Mavzu</span>
            <select
              className={selectClass}
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
            >
              <option value="all">Barcha mavzular</option>
              {filters.topics.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2 text-sm font-medium">
            <span>Hafta</span>
            <select
              className={selectClass}
              value={weekNumber}
              onChange={(event) => setWeekNumber(event.target.value)}
            >
              <option value="all">Barcha haftalar</option>
              {filters.week_numbers.map((item) => (
                <option key={item} value={String(item)}>
                  {item}-hafta
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2 text-sm font-medium">
            <span>Baholash bosqichi</span>
            <select
              className={selectClass}
              value={assessmentStage}
              onChange={(event) => setAssessmentStage(event.target.value)}
            >
              <option value="all">Barcha bosqichlar</option>
              {filters.assessment_stages.map((item) => (
                <option key={item} value={item}>
                  {stageLabel(item)}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2 text-sm font-medium">
            <span>Akademik davr</span>
            <select
              className={selectClass}
              value={academicPeriod}
              onChange={(event) => setAcademicPeriod(event.target.value)}
            >
              <option value="all">Barcha davrlar</option>
              {filters.academic_periods.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
        </CardContent>
      </Card>

      {!hasMatchingStudents ? (
        <Card className="border-dashed shadow-sm">
          <CardContent className="flex min-h-64 flex-col items-center justify-center p-8 text-center">
            <CircleOff className="h-10 w-10 text-muted-foreground" />
            <h2 className="mt-4 text-lg font-semibold">Mos talaba topilmadi</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
              Tanlangan filtrlar bir-biriga mos kelmadi. Boshqa guruh, talaba
              yoki tajriba turini tanlang.
            </p>
            <Button
              type="button"
              variant="outline"
              className="mt-5"
              onClick={resetFilters}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Filtrlarni tozalash
            </Button>
          </CardContent>
        </Card>
      ) : !hasEvaluatedResults ? (
        <Card className="border-dashed shadow-sm">
          <CardContent className="flex min-h-64 flex-col items-center justify-center p-8 text-center">
            <CircleOff className="h-10 w-10 text-muted-foreground" />
            <h2 className="mt-4 text-lg font-semibold">
              Baholangan natija hali mavjud emas
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
              {scopeLabel} bo‘yicha {summary.student_count} nafar talaba topildi,
              ammo tanlangan kesimda hali baholangan topshiriq yo‘q.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              title="Tanlangan talabalar"
              value={String(summary.student_count)}
              hint={`${summary.evaluated_student_count} nafarida natija mavjud`}
              icon={<Users className="h-4 w-4" />}
            />
            <MetricCard
              title="Yakuniy o‘rtacha"
              value={formatScore(summary.final_average, "/100")}
              hint={`Boshlang‘ich: ${formatScore(summary.initial_average)}`}
              icon={<Target className="h-4 w-4" />}
              positive={growthPositive}
            />
            <MetricCard
              title="Umumiy o‘sish"
              value={formatSignedScore(summary.growth)}
              hint="Boshlang‘ichdan yakuniygacha"
              icon={<TrendingUp className="h-4 w-4" />}
              positive={growthPositive}
            />
            <MetricCard
              title="Muvaffaqiyat"
              value={
                summary.success_rate === null
                  ? "—"
                  : `${summary.success_rate.toFixed(0)}%`
              }
              hint={`Baholangan ${summary.evaluated_student_count} talaba; 2-urinish: ${formatSignedScore(summary.second_attempt_growth)}`}
              icon={<BarChart3 className="h-4 w-4" />}
              positive={successPositive}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              title="Median"
              value={formatScore(analytics.descriptive_statistics.median, "/100")}
              hint={`N=${analytics.descriptive_statistics.count}; SD=${formatScore(analytics.descriptive_statistics.standard_deviation)}`}
              icon={<BarChart3 className="h-4 w-4" />}
            />
            <MetricCard
              title="Min / Max"
              value={`${formatScore(analytics.descriptive_statistics.minimum)} / ${formatScore(analytics.descriptive_statistics.maximum)}`}
              hint="Talabalar o‘rtacha natijasi oralig‘i"
              icon={<Target className="h-4 w-4" />}
            />
            <MetricCard
              title="Pretest-posttest"
              value={formatSignedScore(analytics.pre_post_statistics.mean_difference)}
              hint={`Juft talabalar: ${analytics.pre_post_statistics.paired_count}; o‘sish: ${formatPercent(analytics.pre_post_statistics.percent_growth)}`}
              icon={<TrendingUp className="h-4 w-4" />}
              positive={
                analytics.pre_post_statistics.mean_difference === null
                  ? undefined
                  : analytics.pre_post_statistics.mean_difference >= 0
              }
            />
            <MetricCard
              title="Cohen’s dz / p"
              value={`${formatScore(analytics.pre_post_statistics.cohen_dz)} / ${formatPValue(analytics.pre_post_statistics.p_value)}`}
              hint="Juftlangan t-test uchun ilmiy indikator"
              icon={<BarChart3 className="h-4 w-4" />}
            />
          </div>

          <div className="grid gap-6 2xl:grid-cols-2">
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">
                  Ilmiy-statistik jadval
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Pretest va posttest juft natijalari bo‘yicha mean, median,
                  SD, min/max, Cohen’s dz, 95% ishonch oralig‘i va p-value.
                </p>
              </CardHeader>
              <CardContent className="space-y-4 overflow-x-auto">
                <table className="w-full min-w-[620px] border-collapse text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="py-2 pr-4 font-medium">Ko‘rsatkich</th>
                      <th className="py-2 pr-4 font-medium">Boshlang‘ich</th>
                      <th className="py-2 pr-4 font-medium">Yakuniy</th>
                      <th className="py-2 pr-4 font-medium">Farq</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      [
                        "N",
                        analytics.pre_post_statistics.pretest.count,
                        analytics.pre_post_statistics.posttest.count,
                        analytics.pre_post_statistics.difference.count,
                      ],
                      [
                        "Mean",
                        formatScore(analytics.pre_post_statistics.pretest.mean),
                        formatScore(analytics.pre_post_statistics.posttest.mean),
                        formatSignedScore(analytics.pre_post_statistics.mean_difference),
                      ],
                      [
                        "Median",
                        formatScore(analytics.pre_post_statistics.pretest.median),
                        formatScore(analytics.pre_post_statistics.posttest.median),
                        formatScore(analytics.pre_post_statistics.difference.median),
                      ],
                      [
                        "SD",
                        formatScore(analytics.pre_post_statistics.pretest.standard_deviation),
                        formatScore(analytics.pre_post_statistics.posttest.standard_deviation),
                        formatScore(analytics.pre_post_statistics.difference.standard_deviation),
                      ],
                      [
                        "Min / Max",
                        `${formatScore(analytics.pre_post_statistics.pretest.minimum)} / ${formatScore(analytics.pre_post_statistics.pretest.maximum)}`,
                        `${formatScore(analytics.pre_post_statistics.posttest.minimum)} / ${formatScore(analytics.pre_post_statistics.posttest.maximum)}`,
                        `${formatScore(analytics.pre_post_statistics.difference.minimum)} / ${formatScore(analytics.pre_post_statistics.difference.maximum)}`,
                      ],
                    ].map((row) => (
                      <tr key={row[0]} className="border-b last:border-0">
                        <td className="py-2 pr-4 font-medium">{row[0]}</td>
                        <td className="py-2 pr-4">{row[1]}</td>
                        <td className="py-2 pr-4">{row[2]}</td>
                        <td className="py-2 pr-4">{row[3]}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="grid gap-3 rounded-xl border bg-muted/20 p-4 text-sm md:grid-cols-2">
                  <div>
                    <span className="text-muted-foreground">95% ishonch oralig‘i: </span>
                    <strong>
                      {formatScore(
                        analytics.pre_post_statistics.confidence_interval_95_low,
                      )}
                      {" — "}
                      {formatScore(
                        analytics.pre_post_statistics.confidence_interval_95_high,
                      )}
                    </strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground">t(df): </span>
                    <strong>
                      {formatScore(analytics.pre_post_statistics.t_value)}
                      {analytics.pre_post_statistics.degrees_of_freedom === null
                        ? ""
                        : ` (${analytics.pre_post_statistics.degrees_of_freedom})`}
                    </strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground">p-value: </span>
                    <strong>
                      {formatPValue(analytics.pre_post_statistics.p_value)}
                    </strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Cohen’s dz: </span>
                    <strong>
                      {formatScore(analytics.pre_post_statistics.cohen_dz)}
                    </strong>
                  </div>
                </div>
                <p className="text-xs leading-5 text-muted-foreground">
                  {analytics.pre_post_statistics.p_value_note}
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">
                  Tajriba va nazorat guruhi statistikasi
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Har bir guruh bo‘yicha pretest-posttest o‘sishi va guruhlar
                  o‘rtasidagi farq.
                </p>
              </CardHeader>
              <CardContent className="space-y-4 overflow-x-auto">
                <table className="w-full min-w-[640px] border-collapse text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="py-2 pr-4 font-medium">Guruh</th>
                      <th className="py-2 pr-4 font-medium">Talaba</th>
                      <th className="py-2 pr-4 font-medium">Juft N</th>
                      <th className="py-2 pr-4 font-medium">Boshlang‘ich</th>
                      <th className="py-2 pr-4 font-medium">Yakuniy</th>
                      <th className="py-2 pr-4 font-medium">O‘sish</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.group_statistics.map((item) => (
                      <tr key={item.group} className="border-b last:border-0">
                        <td className="py-2 pr-4 font-medium">{item.label}</td>
                        <td className="py-2 pr-4">{item.student_count}</td>
                        <td className="py-2 pr-4">{item.paired_count}</td>
                        <td className="py-2 pr-4">{formatScore(item.pretest.mean)}</td>
                        <td className="py-2 pr-4">{formatScore(item.posttest.mean)}</td>
                        <td className="py-2 pr-4">
                          {formatSignedScore(item.mean_growth)}
                          <span className="ml-1 text-xs text-muted-foreground">
                            ({formatPercent(item.percent_growth)})
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="grid gap-3 rounded-xl border bg-muted/20 p-4 text-sm md:grid-cols-2">
                  <div>
                    <span className="text-muted-foreground">O‘sish farqi: </span>
                    <strong>
                      {formatSignedScore(
                        analytics.between_group_statistics.growth_difference,
                      )}
                    </strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Cohen’s d: </span>
                    <strong>
                      {formatScore(analytics.between_group_statistics.cohen_d)}
                    </strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground">t(df): </span>
                    <strong>
                      {formatScore(analytics.between_group_statistics.t_value)}
                      {analytics.between_group_statistics.degrees_of_freedom ===
                      null
                        ? ""
                        : ` (${formatScore(analytics.between_group_statistics.degrees_of_freedom)})`}
                    </strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground">p-value: </span>
                    <strong>
                      {formatPValue(analytics.between_group_statistics.p_value)}
                    </strong>
                  </div>
                </div>
                <p className="text-xs leading-5 text-muted-foreground">
                  {analytics.between_group_statistics.p_value_note}
                </p>
              </CardContent>
            </Card>
          </div>

          <ChartCard
            title="Natijaning davrlar bo‘yicha o‘zgarishi"
            description="Boshlang‘ich diagnostikadan yakuniy nazoratgacha bo‘lgan dinamik o‘sish yoki pasayish. Chiziq uzilgan joylarda ma’lumot mavjud emas."
            chartId="progress-line-chart"
            filename="natijalar-dinamikasi"
          >
            <LineProgressChart
              id="progress-line-chart"
              labels={progress.labels}
              values={progress.values}
              comparisonValues={
                hasActiveFilters ? baseline?.progress.values : undefined
              }
              mainLabel={scopeLabel}
              comparisonLabel={hasActiveFilters ? "Umumiy o‘rtacha" : undefined}
            />
          </ChartCard>

          <ChartCard
            title="Etalon va ixtiyoriy rejimlar natijasi"
            description="Tanlangan talaba yoki guruhning har ikki baholash rejimidagi o‘rtacha ballari va baholangan natijalar soni."
            chartId="mode-comparison-chart"
            filename="etalon-ixtiyoriy-solishtiruvi"
          >
            <ModeBarChart
              id="mode-comparison-chart"
              data={analytics.mode_comparison}
            />
          </ChartCard>

          <div className="grid gap-6 2xl:grid-cols-2">
            <ChartCard
              title="Tajriba va nazorat guruhlari natijasi"
              description="Tajriba-sinov boshidagi va yakunidagi o‘rtacha ballar taqqoslanadi."
              chartId="group-bar-chart"
              filename="tajriba-nazorat-solishtiruvi"
            >
              <GroupBarChart
                id="group-bar-chart"
                data={analytics.group_comparison}
              />
            </ChartCard>

            <ChartCard
              title="Baholangan talabalar taqsimoti"
              description="Natijasi mavjud talabalar sifat darajalari bo‘yicha taqsimlanadi."
              chartId="score-donut-chart"
              filename="natijalar-taqsimoti"
            >
              <DonutChart id="score-donut-chart" values={distribution} />
            </ChartCard>
          </div>

          <div className="grid gap-6 2xl:grid-cols-2">
            <ChartCard
              title="Rubrika mezonlari tahlili"
              description="Proyeksiya, o‘lcham, chiziqlar, aniqlik va standartlarga rioya qilish kesimida."
              chartId="criteria-radar-chart"
              filename="rubrika-mezonlari"
            >
              <RadarChart
                id="criteria-radar-chart"
                labels={analytics.criteria.labels}
                values={analytics.criteria.values}
              />
            </ChartCard>

            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">
                  Ilmiy-metodik xulosa
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Tanlangan kesim bo‘yicha real natijalardan avtomatik
                  shakllangan qisqa tahlil.
                </p>
              </CardHeader>
              <CardContent className="space-y-4 text-sm leading-6">
                <div className="rounded-xl border bg-muted/20 p-4">
                  <strong>{scopeLabel}</strong> bo‘yicha jami{" "}
                  <strong>{summary.student_count}</strong> nafar talaba topildi.
                  Ulardan <strong>{summary.evaluated_student_count}</strong>
                  nafari kamida bitta baholangan natijaga ega.
                </div>

                <div className="rounded-xl border bg-muted/20 p-4">
                  Boshlang‘ich o‘rtacha natija{" "}
                  <strong>{formatScore(summary.initial_average)}</strong> ball,
                  yakuniy natija esa{" "}
                  <strong>{formatScore(summary.final_average)}</strong> ballni
                  tashkil etdi. Umumiy o‘zgarish{" "}
                  <strong>{formatSignedScore(summary.growth)}</strong> ball.
                </div>

                <div className="rounded-xl border bg-muted/20 p-4">
                  56 va undan yuqori o‘rtacha ballga ega talabalar ulushi{" "}
                  <strong>
                    {summary.success_rate === null
                      ? "—"
                      : `${summary.success_rate.toFixed(0)}%`}
                  </strong>
                  . Ikkinchi urinish mavjud topshiriqlarda o‘rtacha o‘zgarish{" "}
                  <strong>
                    {formatSignedScore(summary.second_attempt_growth)}
                  </strong>{" "}
                  ball.
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">
                Rejimlar bo‘yicha rubrika profili
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Etalon va ixtiyoriy rejimlar rubrikasi alohida ko‘rsatiladi.
                Qiymatlar har bir mezon bo‘yicha 100 foizlik shkalaga
                normalizatsiya qilingan o‘rtacha natijadir.
              </p>
            </CardHeader>
            <CardContent className="grid gap-4 lg:grid-cols-2">
              {analytics.rubric_profiles.map((profile) => (
                <div key={profile.mode} className="rounded-xl border p-4">
                  <h3 className="font-semibold">{profile.label}</h3>
                  {profile.labels.length ? (
                    <div className="mt-3 space-y-3">
                      {profile.labels.map((label, index) => {
                        const value = profile.values[index];

                        return (
                          <div key={label} className="space-y-1">
                            <div className="flex items-center justify-between gap-3 text-sm">
                              <span className="truncate">{label}</span>
                              <strong>{formatScore(value, "%")}</strong>
                            </div>
                            <div className="h-2 overflow-hidden rounded-full bg-muted">
                              <div
                                className="h-full rounded-full bg-primary"
                                style={{
                                  width: `${Math.max(0, Math.min(100, value ?? 0))}%`,
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="mt-3 text-sm text-muted-foreground">
                      Bu rejim bo‘yicha rubrika ma’lumoti hali mavjud emas.
                    </p>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          <ChartCard
            title="Talabalar kesimidagi natijalar xaritasi"
            description="Ma’lumot mavjud bo‘lmagan kataklar chiziqcha bilan ko‘rsatiladi; bu 0 ball degani emas."
            chartId="student-heatmap-chart"
            filename="talabalar-heatmap"
          >
            <HeatmapChart
              id="student-heatmap-chart"
              rows={heatmapRows}
              columns={progress.labels}
            />
          </ChartCard>

          <Card className="shadow-sm">
            <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <CardTitle className="text-base">
                  Maqola va komissiya uchun eksport jadvali
                </CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  Har bir talaba bo‘yicha pretest, haftalik natijalar, posttest,
                  o‘rtacha ball va o‘sish. CSV faylni Excel, Jamovi, SPSS yoki R
                  dasturlarida ochish mumkin.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => exportRowsAsCsv(analytics.export_rows)}
              >
                <Download className="mr-2 h-4 w-4" />
                CSV export
              </Button>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full min-w-[900px] border-collapse text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2 pr-4 font-medium">Talaba</th>
                    <th className="py-2 pr-4 font-medium">Guruh</th>
                    <th className="py-2 pr-4 font-medium">Tajriba turi</th>
                    <th className="py-2 pr-4 font-medium">Boshlang‘ich</th>
                    <th className="py-2 pr-4 font-medium">1-hafta</th>
                    <th className="py-2 pr-4 font-medium">2-hafta</th>
                    <th className="py-2 pr-4 font-medium">3-hafta</th>
                    <th className="py-2 pr-4 font-medium">4-hafta</th>
                    <th className="py-2 pr-4 font-medium">Yakuniy</th>
                    <th className="py-2 pr-4 font-medium">O‘rtacha</th>
                    <th className="py-2 pr-4 font-medium">O‘sish</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.export_rows.slice(0, 30).map((row) => (
                    <tr key={row.student_id} className="border-b last:border-0">
                      <td className="py-2 pr-4 font-medium">{row.name}</td>
                      <td className="py-2 pr-4">{row.group_name ?? "—"}</td>
                      <td className="py-2 pr-4">
                        {experimentGroupLabel(row.experiment_group)}
                      </td>
                      <td className="py-2 pr-4">{formatScore(row.pretest)}</td>
                      <td className="py-2 pr-4">{formatScore(row.week_1)}</td>
                      <td className="py-2 pr-4">{formatScore(row.week_2)}</td>
                      <td className="py-2 pr-4">{formatScore(row.week_3)}</td>
                      <td className="py-2 pr-4">{formatScore(row.week_4)}</td>
                      <td className="py-2 pr-4">{formatScore(row.posttest)}</td>
                      <td className="py-2 pr-4">{formatScore(row.average)}</td>
                      <td className="py-2 pr-4">{formatSignedScore(row.growth)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {analytics.export_rows.length > 30 ? (
                <p className="mt-3 text-xs text-muted-foreground">
                  Jadvalda dastlabki 30 ta qator ko‘rsatildi. To‘liq ma’lumot
                  CSV export faylida mavjud.
                </p>
              ) : null}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
